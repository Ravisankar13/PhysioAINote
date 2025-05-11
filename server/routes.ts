import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateSoapNote } from "./openai";
import { soapNoteInputSchema, insertClinicalNoteSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
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
