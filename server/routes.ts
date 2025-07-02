import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertTrackSchema } from "@shared/schema";
import { generateMoodTags, generateAffirmations, generateAudioDescription } from "./openai";

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

  const httpServer = createServer(app);
  return httpServer;
}
