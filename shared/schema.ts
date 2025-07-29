import { z } from "zod";
import { pgTable, text, timestamp, integer, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Processing jobs table
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  uuid: text("uuid").notNull().unique(),
  filename: text("filename").notNull(),
  status: text("status", { enum: ['uploading', 'extracting', 'generating_transcript', 'refining_transcript', 'synthesizing_audio', 'embedding_audio', 'converting_pdf', 'rendering_video', 'completed', 'error'] }).notNull(),
  progress: integer("progress").default(0).notNull(),
  error_message: text("error_message"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  completed_at: timestamp("completed_at"),
  output_files: jsonb("output_files").$type<{
    narrated_pptx?: string;
    video_mp4?: string;
    pdf?: string;
    transcripts_json?: string;
    audio_zip?: string;
  }>(),
  config: jsonb("config").$type<{
    tts_provider: string;
    voice_settings?: any;
  }>(),
});

// Processing job schema for validation
export const processingJobSchema = z.object({
  id: z.string(),
  filename: z.string(),
  status: z.enum(['uploading', 'extracting', 'generating_transcript', 'refining_transcript', 'synthesizing_audio', 'embedding_audio', 'converting_pdf', 'rendering_video', 'completed', 'error']),
  progress: z.number().min(0).max(100),
  error_message: z.string().optional(),
  created_at: z.string(),
  completed_at: z.string().optional(),
  output_files: z.object({
    narrated_pptx: z.string().optional(),
    video_mp4: z.string().optional(),
    pdf: z.string().optional(),
    transcripts_json: z.string().optional(),
    audio_zip: z.string().optional(),
  }).optional(),
});

// Upload request schema
export const uploadRequestSchema = z.object({
  openai_api_key: z.string().min(1, "OpenAI API key is required"),
  google_tts_api_key: z.string().optional(),
  elevenlabs_api_key: z.string().optional(),
  tts_provider: z.enum(['openai', 'google', 'elevenlabs']),
  voice_settings: z.object({
    voice_id: z.string().optional(),
    stability: z.number().min(0).max(1).optional(),
    similarity_boost: z.number().min(0).max(1).optional(),
  }).optional(),
});

// API key validation schema
export const apiKeyValidationSchema = z.object({
  provider: z.enum(['openai', 'google', 'elevenlabs']),
  api_key: z.string().min(1),
});

// Types
export type Job = typeof jobs.$inferSelect;
export type ProcessingJob = z.infer<typeof processingJobSchema>;
export type UploadRequest = z.infer<typeof uploadRequestSchema>;
export type ApiKeyValidation = z.infer<typeof apiKeyValidationSchema>;

// Insert schemas
export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  created_at: true,
});

export const insertProcessingJobSchema = processingJobSchema.omit({
  id: true,
  created_at: true,
});

export type InsertJob = z.infer<typeof insertJobSchema>;
export type InsertProcessingJob = z.infer<typeof insertProcessingJobSchema>;
