import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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

export interface GeneratedSegment {
  id: string;
  audioPath: string;
  duration: number;
  prompt: string;
  generatedAt: Date;
}

export interface SynthesizedAudio {
  id: string;
  audioPath: string;
  text: string;
  duration: number;
  synthesizedAt: Date;
}

export interface StreamingSession {
  id: string;
  userId: string;
  trackId: number;
  isActive: boolean;
  startTime: Date;
  currentPosition: number; // in seconds
  totalDuration: number;
  affirmationInterval: number; // in seconds
  lastAffirmationTime: number;
  musicSegments: GeneratedSegment[];
  affirmations: SynthesizedAudio[];
  currentSegmentIndex: number;
  bufferSize: number; // number of segments to keep in buffer
}

export interface StreamingOptions {
  trackId: number;
  userId: string;
  affirmationInterval?: number; // default 30 seconds
  bufferSize?: number; // default 3 segments
  segmentDuration?: number; // default 60 seconds per segment
}

export class StreamingService extends EventEmitter {
  private sessions: Map<string, StreamingSession> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    super();
    
    // Clean up inactive sessions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }

  async createStreamingSession(
    options: StreamingOptions,
    trackData: any
  ): Promise<StreamingSession> {
    const sessionId = uuidv4();
    
    const session: StreamingSession = {
      id: sessionId,
      userId: options.userId,
      trackId: options.trackId,
      isActive: true,
      startTime: new Date(),
      currentPosition: 0,
      totalDuration: trackData.duration * 60, // convert minutes to seconds
      affirmationInterval: options.affirmationInterval || 30,
      lastAffirmationTime: 0,
      musicSegments: [],
      affirmations: [],
      currentSegmentIndex: 0,
      bufferSize: options.bufferSize || 3
    };

    this.sessions.set(sessionId, session);

    // Start generating initial music segments
    this.generateInitialSegments(session, trackData, options.segmentDuration || 60);

    // Pre-generate affirmations
    this.generateAffirmationsForSession(session, trackData.affirmations);

    console.log(`Created streaming session ${sessionId} for user ${options.userId}`);
    return session;
  }

  private async generateInitialSegments(
    session: StreamingSession, 
    trackData: any, 
    segmentDuration: number
  ): Promise<void> {
    try {
      const { musicGenerationService } = await getServices();
      
      const musicOptions = {
        prompt: '', // Will be generated based on mood tags
        duration: segmentDuration,
        trackType: trackData.trackType as 'meditation' | 'sleep',
        moodTags: trackData.moodTags || ['peaceful', 'calm']
      };

      // Generate initial buffer of segments
      const segments = await musicGenerationService.generateStreamingSegments(
        musicOptions, 
        session.bufferSize
      );

      session.musicSegments = segments;
      this.emit('segmentsReady', session.id, segments);
      
      console.log(`Generated ${segments.length} initial segments for session ${session.id}`);
    } catch (error) {
      console.error(`Failed to generate initial segments for session ${session.id}:`, error);
      this.emit('error', session.id, error);
    }
  }

  private async generateAffirmationsForSession(
    session: StreamingSession, 
    affirmationTexts: string[]
  ): Promise<void> {
    try {
      const { voiceSynthesisService } = await getServices();
      
      const synthesizedAffirmations = await voiceSynthesisService.synthesizeAffirmationSequence(
        affirmationTexts
      );

      session.affirmations = synthesizedAffirmations;
      this.emit('affirmationsReady', session.id, synthesizedAffirmations);
      
      console.log(`Generated ${synthesizedAffirmations.length} affirmations for session ${session.id}`);
    } catch (error) {
      console.error(`Failed to generate affirmations for session ${session.id}:`, error);
      this.emit('error', session.id, error);
    }
  }

  async updateSessionPosition(sessionId: string, position: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      throw new Error('Session not found or inactive');
    }

    session.currentPosition = position;

    // Check if we need to play an affirmation
    if (position - session.lastAffirmationTime >= session.affirmationInterval) {
      await this.triggerAffirmation(session);
    }

    // Check if we need to generate more music segments
    const currentSegmentDuration = session.musicSegments[session.currentSegmentIndex]?.duration || 60;
    const segmentEndTime = session.currentSegmentIndex * currentSegmentDuration + currentSegmentDuration;
    
    if (position >= segmentEndTime - 30) { // Start generating 30 seconds before segment ends
      await this.generateNextSegment(session);
    }
  }

  private async triggerAffirmation(session: StreamingSession): Promise<void> {
    if (session.affirmations.length === 0) {
      console.warn(`No affirmations available for session ${session.id}`);
      return;
    }

    // Select a random affirmation
    const randomIndex = Math.floor(Math.random() * session.affirmations.length);
    const selectedAffirmation = session.affirmations[randomIndex];

    session.lastAffirmationTime = session.currentPosition;
    
    this.emit('playAffirmation', session.id, selectedAffirmation);
    console.log(`Triggered affirmation for session ${session.id}: "${selectedAffirmation.text}"`);
  }

  private async generateNextSegment(session: StreamingSession): Promise<void> {
    try {
      const { musicGenerationService } = await getServices();
      
      // Generate one more segment to maintain buffer
      const musicOptions = {
        prompt: '',
        duration: 60, // Default segment duration
        trackType: 'sleep' as const, // Default to sleep for now
        moodTags: ['peaceful', 'calm'] // Default mood tags
      };

      const newSegment = await musicGenerationService.generateMusicSegment(musicOptions);
      session.musicSegments.push(newSegment);

      // Remove old segments to prevent memory buildup
      if (session.musicSegments.length > session.bufferSize + 2) {
        const oldSegment = session.musicSegments.shift();
        if (oldSegment) {
          // Clean up old audio file
          try {
            await fs.unlink(oldSegment.audioPath);
          } catch (error) {
            console.warn(`Failed to clean up old segment: ${error}`);
          }
        }
      }

      this.emit('newSegmentReady', session.id, newSegment);
      console.log(`Generated new segment for session ${session.id}`);
    } catch (error) {
      console.error(`Failed to generate next segment for session ${session.id}:`, error);
      this.emit('error', session.id, error);
    }
  }

  getSession(sessionId: string): StreamingSession | undefined {
    return this.sessions.get(sessionId);
  }

  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.isActive = false;
    this.emit('sessionStopped', sessionId);

    // Clean up session resources
    await this.cleanupSession(session);
    this.sessions.delete(sessionId);

    console.log(`Stopped streaming session ${sessionId}`);
  }

  private async cleanupSession(session: StreamingSession): Promise<void> {
    try {
      // Clean up music segment files
      for (const segment of session.musicSegments) {
        try {
          await fs.unlink(segment.audioPath);
        } catch (error) {
          console.warn(`Failed to clean up segment file: ${error}`);
        }
      }

      // Clean up affirmation files
      for (const affirmation of session.affirmations) {
        try {
          await fs.unlink(affirmation.audioPath);
        } catch (error) {
          console.warn(`Failed to clean up affirmation file: ${error}`);
        }
      }
    } catch (error) {
      console.error(`Error during session cleanup: ${error}`);
    }
  }

  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

    const sessionsToCleanup: string[] = [];
    
    this.sessions.forEach((session, sessionId) => {
      if (!session.isActive || (now - session.startTime.getTime()) > maxInactiveTime) {
        sessionsToCleanup.push(sessionId);
      }
    });

    for (const sessionId of sessionsToCleanup) {
      console.log(`Cleaning up inactive session ${sessionId}`);
      this.stopSession(sessionId).catch(error => {
        console.error(`Error cleaning up session ${sessionId}:`, error);
      });
    }
  }

  getUserSessions(userId: string): StreamingSession[] {
    return Array.from(this.sessions.values()).filter(session => 
      session.userId === userId && session.isActive
    );
  }

  async getStreamingUrl(sessionId: string, segmentIndex: number): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      throw new Error('Session not found or inactive');
    }

    const segment = session.musicSegments[segmentIndex];
    if (!segment) {
      throw new Error('Segment not found');
    }

    // Return the file path - in a real implementation, this would be a URL
    // served by a static file server or CDN
    return segment.audioPath;
  }

  async getAffirmationUrl(sessionId: string, affirmationId: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      throw new Error('Session not found or inactive');
    }

    const affirmation = session.affirmations.find(a => a.id === affirmationId);
    if (!affirmation) {
      throw new Error('Affirmation not found');
    }

    return affirmation.audioPath;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Stop all active sessions
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      this.stopSession(sessionId).catch(error => {
        console.error(`Error stopping session during destroy: ${error}`);
      });
    }
  }
}

// Export singleton instance
export const streamingService = new StreamingService();

