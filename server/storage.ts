import { type ProcessingJob, type InsertProcessingJob, jobs, type Job } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getJob(id: string): Promise<ProcessingJob | undefined>;
  createJob(job: InsertProcessingJob): Promise<ProcessingJob>;
  updateJob(id: string, updates: Partial<ProcessingJob>): Promise<ProcessingJob | undefined>;
  deleteJob(id: string): Promise<boolean>;
  getCompletedJobs(): Promise<ProcessingJob[]>;
}

export class DatabaseStorage implements IStorage {
  async getJob(id: string): Promise<ProcessingJob | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.uuid, id));
    if (!job) return undefined;
    
    return {
      id: job.uuid,
      filename: job.filename,
      status: job.status as any,
      progress: job.progress,
      error_message: job.error_message || undefined,
      created_at: job.created_at.toISOString(),
      completed_at: job.completed_at?.toISOString(),
      output_files: job.output_files || undefined,
    };
  }

  async createJob(insertJob: InsertProcessingJob): Promise<ProcessingJob> {
    const uuid = randomUUID();
    const [job] = await db
      .insert(jobs)
      .values({
        uuid,
        filename: insertJob.filename,
        status: insertJob.status,
        progress: insertJob.progress || 0,
        error_message: insertJob.error_message,
        completed_at: insertJob.completed_at ? new Date(insertJob.completed_at) : undefined,
        output_files: insertJob.output_files,
      })
      .returning();

    return {
      id: job.uuid,
      filename: job.filename,
      status: job.status as any,
      progress: job.progress,
      error_message: job.error_message || undefined,
      created_at: job.created_at.toISOString(),
      completed_at: job.completed_at?.toISOString(),
      output_files: job.output_files || undefined,
    };
  }

  async updateJob(id: string, updates: Partial<ProcessingJob>): Promise<ProcessingJob | undefined> {
    const updateData: any = {};
    
    if (updates.filename !== undefined) updateData.filename = updates.filename;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.progress !== undefined) updateData.progress = updates.progress;
    if (updates.error_message !== undefined) updateData.error_message = updates.error_message;
    if (updates.completed_at !== undefined) updateData.completed_at = new Date(updates.completed_at);
    if (updates.output_files !== undefined) updateData.output_files = updates.output_files;

    const [job] = await db
      .update(jobs)
      .set(updateData)
      .where(eq(jobs.uuid, id))
      .returning();

    if (!job) return undefined;

    return {
      id: job.uuid,
      filename: job.filename,
      status: job.status as any,
      progress: job.progress,
      error_message: job.error_message || undefined,
      created_at: job.created_at.toISOString(),
      completed_at: job.completed_at?.toISOString(),
      output_files: job.output_files || undefined,
    };
  }

  async deleteJob(id: string): Promise<boolean> {
    const result = await db.delete(jobs).where(eq(jobs.uuid, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getCompletedJobs(): Promise<ProcessingJob[]> {
    const completedJobs = await db
      .select()
      .from(jobs)
      .where(eq(jobs.status, 'completed'))
      .orderBy(desc(jobs.completed_at))
      .limit(10); // Get last 10 completed jobs

    return completedJobs.map(job => ({
      id: job.uuid,
      filename: job.filename,
      status: job.status as any,
      progress: job.progress,
      error_message: job.error_message || undefined,
      created_at: job.created_at.toISOString(),
      completed_at: job.completed_at?.toISOString(),
      output_files: job.output_files || undefined,
    }));
  }
}

export const storage = new DatabaseStorage();
