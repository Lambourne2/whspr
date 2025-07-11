import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertTrackSchema } from "@shared/schema";
import { generateMoodTags, generateAffirmations, generateAudioDescription, generateMusicPrompt } from "./openai";
import { streamingService } from "./streamingService";
import { promises as fs } from 'fs';
import path from 'path';

// Use mock services in development, real services in production
const isDevelopment = process.env.NODE_ENV === 'development';

async function getServices() {
  if (isDevelopment) {
    const { mockMusicGenerationService } = await import('./mockMusicGeneration');
    const { mockVoiceSynthesisService } = await import('./mockVoiceSynthesis');
    return {
      musicGenerationService: mockMusicGenerationService,
      voiceSynthesisService: mockVoiceSynthesisService
    };
  } else {
    const { musicGenerationService: realMusicService } = await import('./musicGeneration');
    const { voiceSynthesisService: realVoiceService } = await import('./voiceSynthesis');
    return {
      musicGenerationService: realMusicService,
      voiceSynthesisService: realVoiceService
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Generate mood tags from journal text
  app.post('/api/generateTags', isAuthenticated, async (req: any, res) => {
    try {
      const { journal } = req.body;
      
      if (!journal || typeof journal !== 'string') {
        return res.status(400).json({ message: "Journal text is required" });
      }

      const tags = await generateMoodTags(journal);
      res.json({ tags });
    } catch (error) {
      console.error("Error generating tags:", error);
      res.status(500).json({ message: "Failed to generate mood tags" });
    }
  });

  // Generate complete track with affirmations
  app.post('/api/generateTrack', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trackData = insertTrackSchema.parse(req.body);

      // Generate mood tags if not provided
      let moodTags: string[] = [];
      if (trackData.journalPrompt) {
        moodTags = await generateMoodTags(trackData.journalPrompt);
      }

      // Generate affirmations
      const affirmations = await generateAffirmations(
        trackData.title,
        trackData.description || "",
        trackData.journalPrompt || "",
        moodTags,
        trackData.trackType as 'meditation' | 'sleep'
      );

      // Generate audio URL (placeholder for now)
      const audioUrl = await generateAudioDescription(
        trackData.title,
        trackData.description || "",
        trackData.duration,
        trackData.trackType as 'meditation' | 'sleep'
      );

      // Create track in database
      const track = await storage.createTrack({
        ...trackData,
        userId,
        moodTags,
        affirmations,
        audioUrl,
        isGenerated: true,
      } as any);

      res.json(track);
    } catch (error) {
      console.error("Error generating track:", error);
      res.status(500).json({ message: "Failed to generate track" });
    }
  });

  // Get user tracks
  app.get('/api/tracks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tracks = await storage.getUserTracks(userId);
      res.json(tracks);
    } catch (error) {
      console.error("Error fetching tracks:", error);
      res.status(500).json({ message: "Failed to fetch tracks" });
    }
  });

  // Get specific track
  app.get('/api/tracks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const trackId = parseInt(req.params.id);
      const track = await storage.getTrack(trackId);
      
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }

      // Check if user owns the track
      if (track.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(track);
    } catch (error) {
      console.error("Error fetching track:", error);
      res.status(500).json({ message: "Failed to fetch track" });
    }
  });

  // Save/update track
  app.put('/api/tracks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const trackId = parseInt(req.params.id);
      const updates = req.body;
      
      // Verify track ownership
      const existingTrack = await storage.getTrack(trackId);
      if (!existingTrack || existingTrack.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedTrack = await storage.updateTrack(trackId, updates);
      res.json(updatedTrack);
    } catch (error) {
      console.error("Error updating track:", error);
      res.status(500).json({ message: "Failed to update track" });
    }
  });

  // Delete track
  app.delete('/api/tracks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const trackId = parseInt(req.params.id);
      
      // Verify track ownership
      const existingTrack = await storage.getTrack(trackId);
      if (!existingTrack || existingTrack.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteTrack(trackId);
      res.json({ message: "Track deleted successfully" });
    } catch (error) {
      console.error("Error deleting track:", error);
      res.status(500).json({ message: "Failed to delete track" });
    }
  });

  // Start streaming session
  app.post('/api/stream/start', isAuthenticated, async (req: any, res) => {
    try {
      const { trackId, affirmationInterval, bufferSize, segmentDuration } = req.body;
      const userId = req.user.claims.sub;

      if (!trackId) {
        return res.status(400).json({ message: "Track ID is required" });
      }

      // Get track data
      const track = await storage.getTrack(trackId);
      if (!track || track.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Create streaming session
      const session = await streamingService.createStreamingSession({
        trackId,
        userId,
        affirmationInterval,
        bufferSize,
        segmentDuration
      }, track);

      res.json({
        sessionId: session.id,
        affirmationInterval: session.affirmationInterval,
        totalDuration: session.totalDuration
      });
    } catch (error) {
      console.error("Error starting streaming session:", error);
      res.status(500).json({ message: "Failed to start streaming session" });
    }
  });

  // Update streaming position
  app.post('/api/stream/:sessionId/position', isAuthenticated, async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const { position } = req.body;
      const userId = req.user.claims.sub;

      const session = streamingService.getSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await streamingService.updateSessionPosition(sessionId, position);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating streaming position:", error);
      res.status(500).json({ message: "Failed to update position" });
    }
  });

  // Get streaming segment
  app.get('/api/stream/:sessionId/segment/:index', isAuthenticated, async (req: any, res) => {
    try {
      const { sessionId, index } = req.params;
      const userId = req.user.claims.sub;

      const session = streamingService.getSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const segmentIndex = parseInt(index);
      const audioPath = await streamingService.getStreamingUrl(sessionId, segmentIndex);
      
      // Stream the audio file
      const stat = await fs.stat(audioPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = await fs.open(audioPath, 'r');
        const stream = file.createReadStream({ start, end });
        
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'audio/wav',
        });
        
        stream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'audio/wav',
        });
        
        const file = await fs.open(audioPath, 'r');
        const stream = file.createReadStream();
        stream.pipe(res);
      }
    } catch (error) {
      console.error("Error streaming segment:", error);
      res.status(500).json({ message: "Failed to stream segment" });
    }
  });

  // Get affirmation audio
  app.get('/api/stream/:sessionId/affirmation/:affirmationId', isAuthenticated, async (req: any, res) => {
    try {
      const { sessionId, affirmationId } = req.params;
      const userId = req.user.claims.sub;

      const session = streamingService.getSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const audioPath = await streamingService.getAffirmationUrl(sessionId, affirmationId);
      
      // Stream the affirmation audio file
      const stat = await fs.stat(audioPath);
      const fileSize = stat.size;
      
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/wav',
      });
      
      const file = await fs.open(audioPath, 'r');
      const stream = file.createReadStream();
      stream.pipe(res);
    } catch (error) {
      console.error("Error streaming affirmation:", error);
      res.status(500).json({ message: "Failed to stream affirmation" });
    }
  });

  // Stop streaming session
  app.post('/api/stream/:sessionId/stop', isAuthenticated, async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user.claims.sub;

      const session = streamingService.getSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await streamingService.stopSession(sessionId);
      res.json({ message: "Streaming session stopped" });
    } catch (error) {
      console.error("Error stopping streaming session:", error);
      res.status(500).json({ message: "Failed to stop streaming session" });
    }
  });

  // Get user's active streaming sessions
  app.get('/api/stream/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessions = streamingService.getUserSessions(userId);
      
      res.json(sessions.map(session => ({
        id: session.id,
        trackId: session.trackId,
        startTime: session.startTime,
        currentPosition: session.currentPosition,
        totalDuration: session.totalDuration,
        isActive: session.isActive
      })));
    } catch (error) {
      console.error("Error fetching streaming sessions:", error);
      res.status(500).json({ message: "Failed to fetch streaming sessions" });
    }
  });

  // Generate custom affirmation
  app.post('/api/affirmations/generate', isAuthenticated, async (req: any, res) => {
    try {
      const { text, voicePrompt } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Affirmation text is required" });
      }

      const synthesizedAudio = await voiceSynthesisService.synthesizeAffirmation(text, {
        voicePrompt
      });

      res.json({
        id: synthesizedAudio.id,
        text: synthesizedAudio.text,
        duration: synthesizedAudio.duration,
        audioUrl: `/api/affirmations/${synthesizedAudio.id}/audio`
      });
    } catch (error) {
      console.error("Error generating custom affirmation:", error);
      res.status(500).json({ message: "Failed to generate affirmation" });
    }
  });

  // Upload custom voice prompt
  app.post('/api/voice/upload', isAuthenticated, async (req: any, res) => {
    try {
      // This would typically use multer or similar for file upload
      // For now, we'll assume the audio data is in the request body
      const { audioData } = req.body;
      
      if (!audioData) {
        return res.status(400).json({ message: "Audio data is required" });
      }

      const audioBuffer = Buffer.from(audioData, 'base64');
      const voicePromptPath = await voiceSynthesisService.createCustomVoicePrompt(audioBuffer);

      res.json({
        voicePromptPath,
        message: "Voice prompt uploaded successfully"
      });
    } catch (error) {
      console.error("Error uploading voice prompt:", error);
      res.status(500).json({ message: "Failed to upload voice prompt" });
    }
  });

  // Initialize services
  const { musicGenerationService, voiceSynthesisService } = await getServices();
  
  try {
    await musicGenerationService.initialize();
    await voiceSynthesisService.initialize();
    console.log(`${isDevelopment ? 'Mock' : 'Real'} AI services initialized successfully`);
  } catch (error) {
    console.error('Failed to initialize AI services:', error);
    console.warn('Streaming functionality may be limited');
  }

  const httpServer = createServer(app);
  return httpServer;
}
