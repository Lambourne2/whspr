import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tracks table for storing generated meditation/sleep tracks
export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  journalPrompt: text("journal_prompt"),
  duration: integer("duration").notNull(), // in minutes
  trackType: varchar("track_type").notNull(), // 'meditation' | 'sleep'
  audioUrl: text("audio_url"),
  moodTags: text("mood_tags").array(),
  affirmations: text("affirmations").array(),
  isGenerated: boolean("is_generated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertTrackSchema = createInsertSchema(tracks).omit({
  id: true,
  userId: true,
  audioUrl: true,
  moodTags: true,
  affirmations: true,
  isGenerated: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTrackSchema = createInsertSchema(tracks).partial();

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTrack = z.infer<typeof insertTrackSchema>;
export type Track = typeof tracks.$inferSelect;
export type UpdateTrack = z.infer<typeof updateTrackSchema>;
