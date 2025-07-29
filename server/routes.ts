import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import { uploadRequestSchema } from "@shared/schema";
import { spawn } from "child_process";
import fs from "fs";

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      cb(null, true);
    } else {
      cb(new Error('Only .pptx files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Upload endpoint
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Validate request data
      const validationResult = uploadRequestSchema.safeParse({
        openai_api_key: req.body.openai_api_key,
        google_tts_api_key: req.body.google_tts_api_key,
        elevenlabs_api_key: req.body.elevenlabs_api_key,
        tts_provider: req.body.tts_provider,
        voice_settings: req.body.voice_settings ? JSON.parse(req.body.voice_settings) : undefined,
      });

      if (!validationResult.success) {
        // Clean up uploaded file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: validationResult.error.issues 
        });
      }

      const uploadData = validationResult.data;

      // Create processing job
      const job = await storage.createJob({
        filename: req.file.originalname,
        status: 'extracting',
        progress: 0,
      });

      // Start Python processing script
      const pythonScript = path.join(process.cwd(), 'server', 'services', 'powerpoint_processor.py');
      const pythonProcess = spawn('python3', [
        pythonScript,
        req.file.path,
        job.id,
        JSON.stringify(uploadData)
      ], {
        detached: true,
        stdio: 'pipe'
      });

      pythonProcess.unref();

      res.json({ job_id: job.id });
    } catch (error) {
      console.error('Upload error:', error);
      
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Upload failed" 
      });
    }
  });

  // Get job status
  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error('Get job error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to get job status" 
      });
    }
  });

  // Update job status (PATCH endpoint for Python service)
  app.patch("/api/jobs/:id", async (req, res) => {
    try {
      const { status, progress, error_message, output_files } = req.body;
      
      const updates: any = {};
      if (status !== undefined) updates.status = status;
      if (progress !== undefined) updates.progress = progress;
      if (error_message !== undefined) updates.error_message = error_message;
      if (output_files !== undefined) updates.output_files = output_files;
      if (status === 'completed') updates.completed_at = new Date().toISOString();

      const updatedJob = await storage.updateJob(req.params.id, updates);
      
      if (!updatedJob) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      res.json(updatedJob);
    } catch (error) {
      console.error('Update job error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to update job status" 
      });
    }
  });

  // Download file endpoint
  app.get("/api/download/:jobId/:fileType", async (req, res) => {
    try {
      const { jobId, fileType } = req.params;
      const job = await storage.getJob(jobId);
      
      if (!job || !job.output_files) {
        return res.status(404).json({ error: "File not found" });
      }

      let filePath: string | undefined;
      let contentType: string;
      let filename: string;

      switch (fileType) {
        case 'narrated_pptx':
          filePath = job.output_files.narrated_pptx;
          contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          filename = 'narrated_presentation.pptx';
          break;
        case 'video_mp4':
          filePath = job.output_files.video_mp4;
          contentType = 'video/mp4';
          filename = 'learning_module.mp4';
          break;
        case 'pdf':
          filePath = job.output_files.pdf;
          contentType = 'application/pdf';
          filename = 'original_presentation.pdf';
          break;
        case 'transcripts_json':
          filePath = job.output_files.transcripts_json;
          contentType = 'application/json';
          filename = 'transcripts.json';
          break;
        default:
          return res.status(400).json({ error: "Invalid file type" });
      }

      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Download failed" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
