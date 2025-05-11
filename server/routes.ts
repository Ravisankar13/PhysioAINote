import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateSoapNote } from "./openai";
import { soapNoteInputSchema, insertClinicalNoteSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import { transcribeAudio, analyzeTranscription } from "./transcription";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up multer for file uploads
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        const tempDir = path.join(os.tmpdir(), 'physioai-uploads');
        // Create the temp directory if it doesn't exist
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
      },
      filename: (_req, file, cb) => {
        // Generate a unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
    },
    fileFilter: (_req, file, cb) => {
      // Accept only audio files
      const mimeTypes = ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg'];
      if (mimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only audio files are allowed.') as any, false);
      }
    }
  });

  // API route to handle audio transcription
  app.post('/api/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
    try {
      // Check if we have a file
      if (!req.file) {
        return res.status(400).json({ message: 'No audio file provided' });
      }
      
      // Get the path to the uploaded file
      const filePath = req.file.path;
      
      // Transcribe the audio
      const transcript = await transcribeAudio(filePath);
      
      // Analyze the transcript to extract SOAP elements
      const soapElements = await analyzeTranscription(transcript);
      
      // Return the transcript and SOAP elements
      return res.json({
        transcript,
        ...soapElements
      });
    } catch (error: any) {
      console.error('Error in transcription endpoint:', error);
      return res.status(500).json({ 
        message: 'Failed to process audio',
        error: error.message 
      });
    }
  });
  // API route to generate a SOAP note
  app.post("/api/notes/generate", async (req: Request, res: Response) => {
    try {
      // Validate input data
      const validatedData = soapNoteInputSchema.parse(req.body);
      
      // Generate the SOAP note using OpenAI
      const generatedNote = await generateSoapNote(validatedData);
      
      // Return the generated note
      return res.json(generatedNote);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details 
        });
      }
      
      console.error("Error generating SOAP note:", error);
      return res.status(500).json({ 
        message: "Failed to generate SOAP note" 
      });
    }
  });

  // API route to save a clinical note
  app.post("/api/notes", async (req: Request, res: Response) => {
    try {
      // Validate input data
      const validatedData = insertClinicalNoteSchema.parse(req.body);
      
      // Save the note
      const savedNote = await storage.createClinicalNote(validatedData);
      
      // Return the saved note
      return res.json(savedNote);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details 
        });
      }
      
      console.error("Error saving clinical note:", error);
      return res.status(500).json({ 
        message: "Failed to save clinical note" 
      });
    }
  });

  // API route to get all clinical notes
  app.get("/api/notes", async (_req: Request, res: Response) => {
    try {
      const notes = await storage.getClinicalNotes();
      return res.json(notes);
    } catch (error) {
      console.error("Error fetching clinical notes:", error);
      return res.status(500).json({ 
        message: "Failed to fetch clinical notes" 
      });
    }
  });

  // API route to get a specific clinical note
  app.get("/api/notes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid note ID" });
      }
      
      const note = await storage.getClinicalNote(id);
      
      if (!note) {
        return res.status(404).json({ message: "Clinical note not found" });
      }
      
      return res.json(note);
    } catch (error) {
      console.error("Error fetching clinical note:", error);
      return res.status(500).json({ 
        message: "Failed to fetch clinical note" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
