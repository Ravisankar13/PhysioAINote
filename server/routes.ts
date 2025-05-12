import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateSoapNote } from "./openai";
import { soapNoteInputSchema, insertClinicalNoteSchema, insertCommentSchema, updateNoteVisibilitySchema, insertResearchArticleSchema, insertPaymentRecordSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import { transcribeAudio, analyzeTranscription } from "./transcription";
import { setupAuth } from "./auth";
import { calculateAgeRange, deIdentifyNote, extractCondition } from "./utilities/deIdentify";
import { sampleNotes } from "./routes/sampleNotes";
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Middleware to ensure user is authenticated for protected routes
  const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized - Please log in" });
  };
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
      const mimeTypes = [
        'audio/wav', 
        'audio/mpeg', 
        'audio/mp4', 
        'audio/webm', 
        'audio/ogg',
        'audio/x-wav',
        'audio/webm; codecs=opus',
        'audio/webm;codecs=opus',
        'audio/*'  // Accept any audio type as fallback
      ];
      
      console.log('Received file mimetype:', file.mimetype);
      
      // Check if the mimetype starts with audio/ or is in our list
      if (file.mimetype.startsWith('audio/') || mimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Only audio files are allowed.`) as any, false);
      }
    }
  });

  // API route to handle audio transcription
  app.post('/api/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
    try {
      // Check if we have a file
      if (!req.file) {
        console.error('Transcription error: No audio file provided');
        return res.status(400).json({ message: 'No audio file provided' });
      }
      
      // Log file details for debugging
      console.log('Received audio file:', {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });
      
      // Check file size
      if (req.file.size === 0) {
        console.error('Transcription error: Empty audio file');
        return res.status(400).json({ message: 'Audio file is empty' });
      }
      
      // Validate file type - ensure it's an audio file
      if (!req.file.mimetype.startsWith('audio/')) {
        console.error(`Transcription error: Invalid file type ${req.file.mimetype}`);
        return res.status(400).json({ message: 'Invalid file type. Only audio files are allowed.' });
      }
      
      // Verify OPENAI_API_KEY is set and valid
      if (!process.env.OPENAI_API_KEY) {
        console.error('Transcription error: OpenAI API key not found');
        return res.status(500).json({ 
          message: 'OpenAI API key not found in environment variables. Please configure your API key.'
        });
      }
      
      // Get the path to the uploaded file
      const filePath = req.file.path;
      
      try {
        // Transcribe the audio
        console.log('Starting audio transcription...');
        const transcript = await transcribeAudio(filePath);
        console.log('Transcription successful, analyzing content...');
        
        if (!transcript || transcript.trim() === '') {
          console.error('Transcription returned empty result');
          return res.status(422).json({ message: 'No speech detected in the audio' });
        }
        
        // Generate clinical insights from the transcript
        const analysisResult = await analyzeTranscription(transcript);
        console.log('Clinical analysis complete');
        
        // Return the transcript and analysis
        return res.json({
          transcript: transcript,
          transcription: transcript,
          clinicalInsights: analysisResult.clinicalInsights,
          // Include legacy SOAP fields to maintain compatibility
          subjective: analysisResult.clinicalInsights,
          objective: "",
          assessment: "",
          plan: ""
        });
      } catch (transcriptionError: any) {
        console.error('Error in OpenAI transcription:', transcriptionError);
        
        // More specific error handling
        if (transcriptionError.message.includes('API key')) {
          return res.status(500).json({ 
            message: 'OpenAI API key error. Please check your API key configuration.',
            error: transcriptionError.message 
          });
        } else if (transcriptionError.message.includes('format')) {
          return res.status(400).json({
            message: 'Audio format not supported. Please use a different audio format.',
            error: transcriptionError.message
          });
        } else if (transcriptionError.message.includes('rate limit')) {
          return res.status(429).json({
            message: 'OpenAI API rate limit exceeded. Please try again later.',
            error: transcriptionError.message
          });
        }
        
        throw transcriptionError; // rethrow to be caught by outer catch
      }
    } catch (error: any) {
      console.error('Error in transcription endpoint:', error);
      return res.status(500).json({ 
        message: 'Error transcribing audio. Please try again.',
        error: error.message 
      });
    }
  });
  // API route to generate a SOAP note (protected)
  app.post("/api/notes/generate", ensureAuthenticated, async (req: Request, res: Response) => {
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

  // API route to save a clinical note (protected)
  app.post("/api/notes", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      // Validate input data
      const validatedData = insertClinicalNoteSchema.parse({
        ...req.body,
        userId: req.user!.id, // Add the user ID from the authenticated user
      });
      
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

  // API route to get all clinical notes (filtered by visibility and user)
  app.get("/api/notes", async (req: Request, res: Response) => {
    try {
      // If user is authenticated, get their notes + public notes
      // If not authenticated, only get public notes
      const userId = req.isAuthenticated() ? req.user!.id : undefined;
      const notes = await storage.getClinicalNotes(userId);
      return res.json(notes);
    } catch (error) {
      console.error("Error fetching clinical notes:", error);
      return res.status(500).json({ 
        message: "Failed to fetch clinical notes" 
      });
    }
  });

  // API route to get the current user's notes
  app.get("/api/my-notes", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const notes = await storage.getUserNotes(req.user!.id);
      return res.json(notes);
    } catch (error) {
      console.error("Error fetching user notes:", error);
      return res.status(500).json({ 
        message: "Failed to fetch your notes" 
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
      
      // Pass the current user ID if authenticated
      const currentUserId = req.isAuthenticated() ? req.user!.id : undefined;
      const note = await storage.getClinicalNote(id, currentUserId);
      
      if (!note) {
        return res.status(404).json({ message: "Clinical note not found" });
      }

      // If note is private, check if user is authenticated and is the owner
      if (note.visibility === "private") {
        if (!req.isAuthenticated() || note.userId !== req.user!.id) {
          return res.status(403).json({ message: "You don't have permission to view this note" });
        }
      }
      
      // For shared notes, check if user is authenticated
      if (note.visibility === "shared" && !req.isAuthenticated()) {
        return res.status(403).json({ message: "You must be logged in to view shared notes" });
      }
      
      return res.json(note);
    } catch (error) {
      console.error("Error fetching clinical note:", error);
      return res.status(500).json({ 
        message: "Failed to fetch clinical note" 
      });
    }
  });
  
  // API route to update note visibility
  app.patch("/api/notes/:id/visibility", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid note ID" });
      }
      
      const note = await storage.getClinicalNote(id);
      
      if (!note) {
        return res.status(404).json({ message: "Clinical note not found" });
      }
      
      // Ensure the user is the owner of the note
      if (note.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to modify this note" });
      }
      
      try {
        // Validate the input data
        const updateData = updateNoteVisibilitySchema.parse(req.body);
        
        // Update the note with visibility and de-identification if needed
        const updatedNote = await storage.updateNoteVisibility(id, updateData);
        
        return res.json(updatedNote);
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({ 
            message: "Invalid update data", 
            errors: fromZodError(error).message 
          });
        }
        throw error;
      }
    } catch (error) {
      console.error("Error updating note visibility:", error);
      return res.status(500).json({ message: "Failed to update note visibility" });
    }
  });
  
  // API route to add a comment to a note
  app.post("/api/notes/:id/comments", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const noteId = parseInt(req.params.id);
      
      if (isNaN(noteId)) {
        return res.status(400).json({ message: "Invalid note ID" });
      }
      
      const note = await storage.getClinicalNote(noteId);
      
      if (!note) {
        return res.status(404).json({ message: "Clinical note not found" });
      }
      
      // Ensure the note is not private or if it is, it belongs to the current user
      if (note.visibility === "private" && note.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to comment on this note" });
      }
      
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        noteId,
        userId: req.user!.id
      });
      
      const comment = await storage.createComment(validatedData);
      return res.status(201).json(comment);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details 
        });
      }
      
      console.error("Error adding comment:", error);
      return res.status(500).json({ message: "Failed to add comment" });
    }
  });
  
  // API route to get comments for a note
  app.get("/api/notes/:id/comments", async (req: Request, res: Response) => {
    try {
      const noteId = parseInt(req.params.id);
      
      if (isNaN(noteId)) {
        return res.status(400).json({ message: "Invalid note ID" });
      }
      
      const note = await storage.getClinicalNote(noteId);
      
      if (!note) {
        return res.status(404).json({ message: "Clinical note not found" });
      }
      
      // Ensure the note is not private or if it is, it belongs to the current user
      if (note.visibility === "private") {
        if (!req.isAuthenticated() || note.userId !== req.user!.id) {
          return res.status(403).json({ message: "You don't have permission to view comments on this note" });
        }
      }
      
      const comments = await storage.getNoteComments(noteId);
      return res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      return res.status(500).json({ message: "Failed to fetch comments" });
    }
  });
  
  // API route to get sample notes by body part category
  app.get("/api/sample-notes", (req: Request, res: Response) => {
    try {
      const bodyPart = req.query.bodyPart as string;
      
      if (bodyPart) {
        // Filter by body part if provided
        const filteredNotes = sampleNotes.filter(note => note.bodyPart === bodyPart);
        return res.json(filteredNotes);
      }
      
      // Return all sample notes
      return res.json(sampleNotes);
    } catch (error) {
      console.error("Error fetching sample notes:", error);
      return res.status(500).json({ message: "Failed to fetch sample notes" });
    }
  });

  app.get("/api/sample-notes/:bodyPart", (req: Request, res: Response) => {
    try {
      const bodyPart = req.params.bodyPart;
      
      // Find sample note for the requested body part
      const note = sampleNotes.find(note => note.bodyPart === bodyPart);
      
      if (!note) {
        return res.status(404).json({ message: "Sample note not found for this body part" });
      }
      
      return res.json(note);
    } catch (error) {
      console.error("Error fetching sample note:", error);
      return res.status(500).json({ message: "Failed to fetch sample note" });
    }
  });

  // API route to get all research articles
  app.get("/api/research", async (req: Request, res: Response) => {
    try {
      const bodyPart = req.query.bodyPart as string;
      const articles = await storage.getResearchArticles(bodyPart);
      return res.json(articles);
    } catch (error) {
      console.error("Error fetching research articles:", error);
      return res.status(500).json({ message: "Failed to fetch research articles" });
    }
  });

  // API route to get a specific research article by ID
  app.get("/api/research/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid article ID" });
      }
      
      const article = await storage.getResearchArticle(id);
      
      if (!article) {
        return res.status(404).json({ message: "Research article not found" });
      }
      
      return res.json(article);
    } catch (error) {
      console.error("Error fetching research article:", error);
      return res.status(500).json({ message: "Failed to fetch research article" });
    }
  });
  
  // API route to create a new research article (admin only)
  app.post("/api/research", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      // TODO: Add admin role check here
      
      // Validate request body
      const articleData = insertResearchArticleSchema.parse(req.body);
      
      // Create the article
      const newArticle = await storage.createResearchArticle(articleData);
      return res.status(201).json(newArticle);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details 
        });
      }
      
      console.error("Error creating research article:", error);
      return res.status(500).json({ message: "Failed to create research article" });
    }
  });

  // ===== SUBSCRIPTION AND PAYMENT ROUTES =====

  // Get all subscription plans
  app.get("/api/subscriptions", async (req: Request, res: Response) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      return res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      return res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Get user's subscription status
  app.get("/api/user/subscription", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.json({
        tier: user.membershipTier,
        expiry: user.membershipExpiry,
        subscriptionId: user.paypalSubscriptionId,
      });
    } catch (error) {
      console.error("Error fetching user subscription:", error);
      return res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // Get user's payment history
  app.get("/api/user/payments", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const payments = await storage.getUserPayments(req.user!.id);
      return res.json(payments);
    } catch (error) {
      console.error("Error fetching payment history:", error);
      return res.status(500).json({ message: "Failed to fetch payment history" });
    }
  });

  // Record a payment after successful PayPal transaction
  app.post("/api/user/payments", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const paymentData = insertPaymentRecordSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });
      
      const payment = await storage.createPaymentRecord(paymentData);
      
      // Update user's membership based on the plan
      const plan = await storage.getSubscriptionPlan(paymentData.planId);
      if (plan) {
        // Calculate expiry date (1 week from now for weekly subscription)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        
        // Update user's membership
        await storage.updateUserMembership(req.user!.id, plan.tier, expiryDate);
      }
      
      return res.status(201).json(payment);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details 
        });
      }
      
      console.error("Error creating payment record:", error);
      return res.status(500).json({ message: "Failed to create payment record" });
    }
  });

  // ===== PAYPAL INTEGRATION ROUTES =====
  
  // Setup PayPal session
  app.get("/api/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  // Create PayPal order
  app.post("/api/paypal/order", async (req, res) => {
    await createPaypalOrder(req, res);
  });

  // Capture PayPal order
  app.post("/api/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  const httpServer = createServer(app);
  return httpServer;
}
