import { type ProcessingJob, type InsertProcessingJob } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getJob(id: string): Promise<ProcessingJob | undefined>;
  createJob(job: InsertProcessingJob): Promise<ProcessingJob>;
  updateJob(id: string, updates: Partial<ProcessingJob>): Promise<ProcessingJob | undefined>;
  deleteJob(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private jobs: Map<string, ProcessingJob>;

  constructor() {
    this.jobs = new Map();
  }

  async getJob(id: string): Promise<ProcessingJob | undefined> {
    return this.jobs.get(id);
  }

  async createJob(insertJob: InsertProcessingJob): Promise<ProcessingJob> {
    const id = randomUUID();
    const job: ProcessingJob = {
      ...insertJob,
      id,
      created_at: new Date().toISOString(),
    };
    this.jobs.set(id, job);
    return job;
  }

  async updateJob(id: string, updates: Partial<ProcessingJob>): Promise<ProcessingJob | undefined> {
    const existingJob = this.jobs.get(id);
    if (!existingJob) {
      return undefined;
    }

    const updatedJob: ProcessingJob = {
      ...existingJob,
      ...updates,
    };

    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async deleteJob(id: string): Promise<boolean> {
    return this.jobs.delete(id);
  }
}

export const storage = new MemStorage();
