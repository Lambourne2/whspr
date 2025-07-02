import {
  users,
  tracks,
  type User,
  type UpsertUser,
  type Track,
  type InsertTrack,
  type UpdateTrack,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser & { id: string }): Promise<User>;
  
  // Track operations
  createTrack(track: InsertTrack & { 
    userId: string; 
    moodTags?: string[]; 
    affirmations?: string[]; 
    audioUrl?: string; 
    isGenerated?: boolean; 
  }): Promise<Track>;
  updateTrack(id: number, updates: UpdateTrack): Promise<Track>;
  getTrack(id: number): Promise<Track | undefined>;
  getUserTracks(userId: string): Promise<Track[]>;
  deleteTrack(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser & { id: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Track operations
  async createTrack(trackData: InsertTrack & { 
    userId: string; 
    moodTags?: string[]; 
    affirmations?: string[]; 
    audioUrl?: string; 
    isGenerated?: boolean; 
  }): Promise<Track> {
    const [track] = await db
      .insert(tracks)
      .values(trackData)
      .returning();
    return track;
  }

  async updateTrack(id: number, updates: UpdateTrack): Promise<Track> {
    const [track] = await db
      .update(tracks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tracks.id, id))
      .returning();
    return track;
  }

  async getTrack(id: number): Promise<Track | undefined> {
    const [track] = await db.select().from(tracks).where(eq(tracks.id, id));
    return track;
  }

  async getUserTracks(userId: string): Promise<Track[]> {
    return await db
      .select()
      .from(tracks)
      .where(eq(tracks.userId, userId))
      .orderBy(desc(tracks.createdAt));
  }

  async deleteTrack(id: number): Promise<void> {
    await db.delete(tracks).where(eq(tracks.id, id));
  }
}

export const storage = new DatabaseStorage();
