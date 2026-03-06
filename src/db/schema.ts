import {
  pgTable,
  uuid,
  text,
  jsonb,
  boolean,
  timestamp,
  integer
} from "drizzle-orm/pg-core";

export const meetingTypes = pgTable("meeting_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  goals: jsonb("goals").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

export const meetings = pgTable("meetings", {
  id: uuid("id").primaryKey().defaultRandom(),
  meetingTypeId: uuid("meeting_type_id")
    .references(() => meetingTypes.id)
    .notNull(),
  title: text("title").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("pending"),
  summary: text("summary").notNull().default(""),
  minutes: text("minutes").notNull().default(""),
  customGoals: jsonb("custom_goals").$type<string[]>().notNull().default([]),
  customStrategies: jsonb("custom_strategies")
    .$type<
      Array<{
        id: string;
        title: string;
        scenario: string;
        response: string;
        category: string;
        source: "library" | "manual" | "ai_parsed";
      }>
    >()
    .notNull()
    .default([]),
  discussionPoints: jsonb("discussion_points")
    .$type<
      Array<{
        id: string;
        content: string;
        status: "pending" | "mentioned";
        mentionedAt?: number;
        transcriptIds?: string[];
        summary?: string;
      }>
    >()
    .notNull()
    .default([]),
  aiSuggestions: jsonb("ai_suggestions")
    .$type<
      Array<{
        id: string;
        type: "response" | "question" | "keypoint";
        content: string;
        timestampMs: number;
        relatedTranscriptId?: string;
      }>
    >()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

export const strategies = pgTable("strategies", {
  id: uuid("id").primaryKey().defaultRandom(),
  meetingTypeId: uuid("meeting_type_id").references(() => meetingTypes.id),
  title: text("title").notNull(),
  scenario: text("scenario").notNull(),
  response: text("response").notNull(),
  category: text("category").notNull(),
  source: text("source").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

export const voiceProfiles = pgTable("voice_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  isUser: boolean("is_user").notNull().default(false),
  voiceSampleKey: text("voice_sample_key").notNull(),
  voiceSampleUrl: text("voice_sample_url").notNull(),
  voiceFeatures: jsonb("voice_features").$type<number[]>().notNull().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

export const meetingTranscripts = pgTable("meeting_transcripts", {
  id: uuid("id").primaryKey().defaultRandom(),
  meetingId: uuid("meeting_id")
    .references(() => meetings.id)
    .notNull(),
  voiceProfileId: uuid("voice_profile_id").references(() => voiceProfiles.id),
  speakerName: text("speaker_name").notNull(),
  content: text("content").notNull(),
  timestampMs: integer("timestamp_ms").notNull(),
  isUser: boolean("is_user").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const meetingAudios = pgTable("meeting_audios", {
  id: uuid("id").primaryKey().defaultRandom(),
  meetingId: uuid("meeting_id")
    .references(() => meetings.id)
    .notNull(),
  audioKey: text("audio_key").notNull(),
  audioUrl: text("audio_url").notNull(),
  durationMs: integer("duration_ms").notNull(),
  segments: jsonb("segments")
    .$type<
      Array<{
        startTime: number;
        endTime: number;
        transcriptId?: string;
      }>
    >()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

