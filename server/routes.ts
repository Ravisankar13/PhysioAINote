import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { eq, sql, ilike } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import { generateSoapNote } from "./openai";
import { analyzeVirtualPatientCase, findRelevantResearchArticles } from "./virtualPatientOpenai";
import { analyzeShoulderPatientJoGibson, isShoulderPatient } from "./virtualPatientJoGibson";
import { generateAICaseStudy, generateDiagnosticFeedback } from "./aiCaseStudyGenerator";
import { soapNoteInputSchema, insertClinicalNoteSchema, insertCommentSchema, updateNoteVisibilitySchema, insertResearchArticleSchema, insertPaymentRecordSchema, insertExerciseSchema, insertManualTherapyTechniqueSchema, type ResearchArticle, insertVirtualPatientSchema, bodyPartEnum, sharedCases, caseTagsMapping, caseUpvotes, caseDiscussions, discussionUpvotes, exercises } from "@shared/schema";
import { ZodError, z } from "zod";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import { transcribeAudio, analyzeTranscription } from "./transcription";
import { uploadToS3, getFileType } from "./s3Uploader";
import { setupAuth } from "./auth";
import { calculateAgeRange, deIdentifyNote, extractCondition } from "./utilities/deIdentify";
import { sampleNotes } from "./routes/sampleNotes";
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";
import Stripe from "stripe";
import OpenAI from "openai";
import { generateExercises, generateFallbackExercises, ExerciseGenerationRequest } from "./exerciseGenerator";
import sessionRoutes from "./routes/sessionRoutes";
import { config } from 'dotenv';
config();

// Helper functions for research article relevance scoring and note processing

// Generate SOAP note sections from clinical insights text
function generateSoapSectionsFromInsights(transcript: string, insights: string): {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
} {
  try {
    const lines = insights.trim().split('\n');
    let currentSection = '';
    const sections: Record<string, string[]> = {
      'subjective': [],
      'objective': [],
      'assessment': [],
      'plan': []
    };

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.toLowerCase().startsWith('subjective:')) {
        currentSection = 'subjective';
        sections[currentSection].push(trimmedLine.substring('subjective:'.length).trim());
      } else if (trimmedLine.toLowerCase().startsWith('objective:')) {
        currentSection = 'objective';
        sections[currentSection].push(trimmedLine.substring('objective:'.length).trim());
      } else if (trimmedLine.toLowerCase().startsWith('assessment:')) {
        currentSection = 'assessment';
        sections[currentSection].push(trimmedLine.substring('assessment:'.length).trim());
      } else if (trimmedLine.toLowerCase().startsWith('plan:')) {
        currentSection = 'plan';
        sections[currentSection].push(trimmedLine.substring('plan:'.length).trim());
      } else if (currentSection && trimmedLine) {
        sections[currentSection].push(trimmedLine);
      }
    }

    const soapNote = {
      subjective: sections['subjective'].join('\n').trim(),
      objective: sections['objective'].join('\n').trim(),
      assessment: sections['assessment'].join('\n').trim(),
      plan: sections['plan'].join('\n').trim()
    };

    // If we couldn't parse the insights properly, try to extract content from the transcript
    if (!soapNote.subjective && !soapNote.objective && !soapNote.assessment && !soapNote.plan) {
      const transcriptLower = transcript.toLowerCase();
      
      // Simple fallback extraction
      if (transcriptLower.includes('complain') || transcriptLower.includes('report') || transcriptLower.includes('history')) {
        soapNote.subjective = 'Patient reports symptoms based on transcript. Detailed subjective information needs review.';
      }
      
      if (transcriptLower.includes('exam') || transcriptLower.includes('test') || transcriptLower.includes('observation')) {
        soapNote.objective = 'Physical examination performed. Detailed objective findings need review.';
      }
      
      if (transcriptLower.includes('diagnos') || transcriptLower.includes('impression') || transcriptLower.includes('condition')) {
        soapNote.assessment = 'Clinical assessment based on available information. Detailed assessment needs review.';
      }
      
      if (transcriptLower.includes('treat') || transcriptLower.includes('recommend') || transcriptLower.includes('exercise')) {
        soapNote.plan = 'Treatment plan discussed. Detailed plan needs review.';
      }
    }
  
    return soapNote;
  } catch (error) {
    console.error('Error parsing SOAP note from insights:', error);
    return {
      subjective: 'Error extracting subjective information.',
      objective: 'Error extracting objective information.',
      assessment: 'Error extracting assessment information.',
      plan: 'Error extracting plan information.'
    };
  }
}

// Extract medical terminology from clinical note text
function extractMedicalTerms(text: string): string[] {
  // Common medical and physiotherapy terminology to look for
  const medicalPrefixes = [
    "hyper", "hypo", "osteo", "arthro", "myelo", "neuro", "tendin", "fasci", 
    "myo", "chondro", "spondylo", "radicu", "syndrome", "pathology", "dysfunction"
  ];
  
  // Common medical suffixes
  const medicalSuffixes = [
    "itis", "algia", "opathy", "osis", "sclerosis", "stenosis", "pathy", 
    "lysis", "graphy", "ectomy", "plasty"
  ];
  
  // Look for terms matching medical patterns
  const words = text.toLowerCase().split(/\s+/);
  const medicalTerms = new Set<string>();
  
  // Extract terms with medical prefixes/suffixes
  words.forEach(word => {
    // Clean the word of punctuation
    const cleanWord = word.replace(/[.,;:!?()]/g, '');
    if (cleanWord.length < 4) return;
    
    // Check for medical prefixes
    for (const prefix of medicalPrefixes) {
      if (cleanWord.startsWith(prefix)) {
        medicalTerms.add(cleanWord);
        break;
      }
    }
    
    // Check for medical suffixes
    for (const suffix of medicalSuffixes) {
      if (cleanWord.endsWith(suffix)) {
        medicalTerms.add(cleanWord);
        break;
      }
    }
  });
  
  // Add common condition and diagnostic terms that might appear in notes
  const diagnosticPhrases = text?.toLowerCase()?.match(/(?:diagnosis|impression|assessment)[^a-z]+([\w\s,-]+)/g);
  if (diagnosticPhrases) {
    diagnosticPhrases.forEach(phrase => {
      const diagnosis = phrase?.replace(/^(diagnosis|impression|assessment)[^a-z]+/i, '').trim();
      if (diagnosis.length > 3) {
        medicalTerms.add(diagnosis);
      }
    });
  }
  
  return Array.from(medicalTerms);
}

// Extract physiotherapy assessment terminology
function extractPhysiotherapyAssessmentTerms(text: string): string[] {
  const assessmentTerms = new Set<string>();
  
  // Common assessment tests and measures in physiotherapy
  const assessmentPatterns = [
    "rom", "range of motion", "strength", "manual muscle test", "mmt", "special test",
    "palpation", "tender", "muscle length", "flexibility", "proprioception", "balance",
    "gait", "functional test", "neurodynamic", "mobility", "stability", "motor control",
    "straight leg raise", "slr", "vascular", "sensory", "reflexes", "joint play",
    "accessory motion", "posture", "alignment", "symmetry", "asymmetry", "recruitment",
    "movement pattern", "compensation", "capsular pattern", "non-capsular", "centralization",
    "peripheralization", "directional preference", "joint position", "passive intervertebral",
    "paivm", "ppivms", "positive", "negative", "degrees", "impingement", "apprehension"
  ];
  
  // Look for assessment terms in the text
  const lowerText = text.toLowerCase();
  
  assessmentPatterns.forEach(term => {
    if (lowerText.includes(term)) {
      assessmentTerms.add(term);
    }
  });
  
  // Find measurement patterns (e.g., "5/5 strength", "ROM 0-120 degrees")
  const measurementPatterns = lowerText.match(/\d+\/\d+|\d+\s*-\s*\d+\s*degrees|\d+\s*degrees/g);
  if (measurementPatterns) {
    measurementPatterns.forEach(match => {
      assessmentTerms.add(match);
    });
  }
  
  return Array.from(assessmentTerms);
}

// Extract treatment and intervention terms
function extractTreatmentTerms(text: string): string[] {
  const treatmentTerms = new Set<string>();
  
  // Common physiotherapy treatments and interventions
  const treatmentPatterns = [
    "exercise", "strengthening", "stretching", "mobilization", "manipulation", 
    "massage", "soft tissue", "manual therapy", "modalities", "ultrasound", 
    "electrical stimulation", "tens", "heat", "cold", "ice", "taping", 
    "bracing", "education", "advice", "neuromuscular", "proprioceptive", 
    "balance training", "gait training", "functional training", "progressive", 
    "loading", "graded exposure", "motor control", "coordination", "eccentric", 
    "concentric", "isometric", "isotonic", "rehabilitation", "therapeutic exercise",
    "mckenzie", "mulligan", "maitland", "kaltenborn", "exercise prescription",
    "home exercise program", "hep", "cognitive functional therapy", "cft",
    "pain neuroscience education", "pne", "specific exercise", "general exercise"
  ];
  
  // Look for treatment terms in the text
  const lowerText = text.toLowerCase();
  
  treatmentPatterns.forEach(term => {
    if (lowerText.includes(term)) {
      treatmentTerms.add(term);
    }
  });
  
  return Array.from(treatmentTerms);
}

// Initialize Stripe with secret key
const stripe = new Stripe('sk_test_51RP2StQgGBJQM85ZPrDkbY7AHdR6P5wrPjnA6pduuVnGjWX6kzSTQoQBp13lzq2ICGsKWay6NmVsym7whYJqWqqX009jZOQTgI', {
  apiVersion: '2023-10-16',
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configure multer for file uploads
const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'test-uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage_config,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB file size limit
  },
  fileFilter: function (req, file, cb) {
    // Accept audio files only
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Use auth setup from auth.ts
  setupAuth(app);
  
  // Register session routes
  app.use(sessionRoutes);

  app.get('/api/openai-validate', async (req: Request, res: Response) => {
    try {
      const completion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: 'Say "OpenAI API is working!" if you can read this.' }],
        model: 'gpt-4o',
        max_tokens: 20,
      });

      res.send({ message: completion.choices[0].message.content });
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      res.status(500).send({ error: error.message });
    }
  });

  const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      console.log(`Request authenticated. User: ${req.user?.username}, ID: ${req.user?.id}`);
      return next();
    }
    console.log('Request not authenticated. Session ID:', req.sessionID);
    res.status(401).json({ message: 'Unauthorized - Please log in' });
  };

  // PayPal Setup
  app.get("/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/paypal/order", async (req, res) => {
    await createPaypalOrder(req, res);
  });

  app.post("/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  app.post('/api/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file uploaded' });
      }

      console.log('Processing audio file for transcription:', req.file.path);
      const transcription = await transcribeAudio(req.file.path);
      
      // Analyze the transcription for clinical insights
      const insights = await analyzeTranscription(transcription);
      
      // Parse the insights into SOAP note structure
      const soapNote = generateSoapSectionsFromInsights(transcription, insights);

      res.json({
        transcription,
        insights,
        soapNote
      });
    } catch (error: any) {
      console.error('Error in transcription:', error);
      res.status(500).json({ error: error.message || 'Failed to transcribe audio' });
    }
  });
  
  // Session-specific transcription endpoint
  app.post('/api/sessions/:id/transcribe', ensureAuthenticated, upload.single('audio'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file uploaded' });
      }
      
      const sessionId = parseInt(req.params.id);
      console.log(`Processing session-specific audio for session ID ${sessionId}`);
      
      // Verify session exists and belongs to user
      const session = await storage.getPatientSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      if (session.userId !== req.user!.id) {
        return res.status(403).json({ error: 'Not authorized to access this session' });
      }
      
      // 1. Save the audio file
      const audioS3Uri = `s3://mock-bucket/${req.file.filename}`;
      const audioUrl = `/api/audio/${req.file.filename}`;
      
      // Create audio recording record
      await storage.createAudioRecording({
        sessionId,
        audioUrl,
        audioS3Uri,
        duration: parseInt(req.body.duration || '0') 
      });
      
      // 2. Transcribe the audio
      console.log('Transcribing audio file:', req.file.path);
      const transcription = await transcribeAudio(req.file.path);
      
      // 3. Save the transcript
      const transcriptS3Uri = `s3://mock-bucket/transcript-${sessionId}.csv`;
      const transcriptUrl = `/api/transcript/${sessionId}`;
      
      // Write transcript to file for demo purposes
      const transcriptFilePath = path.join(process.cwd(), 'test-uploads', `transcript-${sessionId}.csv`);
      await fs.promises.writeFile(transcriptFilePath, "Timestamp,Transcript\n0,\"" + transcription + "\"");
      
      // Update session with transcript
      await storage.updatePatientSessionTranscript(
        sessionId, 
        transcriptUrl, 
        transcriptS3Uri
      );
      
      // 4. Generate insights and SOAP note
      const insights = await analyzeTranscription(transcription);
      const soapNote = generateSoapSectionsFromInsights(transcription, insights);
      
      // 5. Save SOAP note to session
      await storage.updatePatientSessionSoapNote(sessionId, soapNote);
      
      // 6. Return all data
      res.json({
        sessionId,
        transcription,
        insights,
        soapNote,
        audioUrl,
        transcriptUrl
      });
      
    } catch (error: any) {
      console.error('Error in session transcription:', error);
      res.status(500).json({ error: error.message || 'Failed to process audio for session' });
    }
  });

  app.post("/api/notes/generate", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const input = soapNoteInputSchema.parse(req.body);
      const soapNote = await generateSoapNote(input);
      res.json(soapNote);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.post("/api/notes", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const data = insertClinicalNoteSchema.parse({ ...req.body, userId });
      
      // Create a de-identified version of the clinical note
      const deIdentifiedData = deIdentifyNote(data);
      
      // Use the de-identified data for the note creation
      const note = await storage.createClinicalNote(deIdentifiedData);
      
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.get("/api/notes", async (req: Request, res: Response) => {
    try {
      const currentUserId = req.user?.id;
      const notes = await storage.getClinicalNotes(currentUserId);
      res.json(notes);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.get("/api/my-notes", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const notes = await storage.getUserNotes(userId);
      res.json(notes);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.get("/api/notes/:id", async (req: Request, res: Response) => {
    try {
      const noteId = parseInt(req.params.id);
      if (isNaN(noteId)) {
        return res.status(400).json({ error: 'Invalid note ID' });
      }
      
      const currentUserId = req.user?.id;
      const note = await storage.getClinicalNote(noteId, currentUserId);
      
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }
      
      res.json(note);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.patch("/api/notes/:id/visibility", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const noteId = parseInt(req.params.id);
      if (isNaN(noteId)) {
        return res.status(400).json({ error: 'Invalid note ID' });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const data = updateNoteVisibilitySchema.parse(req.body);
      
      // Ensure the user is the owner of the note
      const note = await storage.getClinicalNote(noteId);
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }
      
      if (note.userId !== userId) {
        return res.status(403).json({ error: 'You do not have permission to update this note' });
      }
      
      const updatedNote = await storage.updateNoteVisibility(noteId, {
        visibility: data.visibility,
        userId
      });
      
      res.json(updatedNote);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.post("/api/notes/:id/comments", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const noteId = parseInt(req.params.id);
      if (isNaN(noteId)) {
        return res.status(400).json({ error: 'Invalid note ID' });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Ensure the note exists and is either public or belongs to the user
      const note = await storage.getClinicalNote(noteId, userId);
      if (!note) {
        return res.status(404).json({ error: 'Note not found or you do not have permission to comment on it' });
      }

      const data = insertCommentSchema.parse({
        ...req.body,
        noteId,
        userId
      });
      
      const comment = await storage.createComment(data);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.get("/api/notes/:id/comments", async (req: Request, res: Response) => {
    try {
      const noteId = parseInt(req.params.id);
      if (isNaN(noteId)) {
        return res.status(400).json({ error: 'Invalid note ID' });
      }
      
      const currentUserId = req.user?.id;
      
      // Ensure the note exists and is either public or belongs to the user
      const note = await storage.getClinicalNote(noteId, currentUserId);
      if (!note) {
        return res.status(404).json({ error: 'Note not found or you do not have permission to view it' });
      }
      
      const comments = await storage.getNoteComments(noteId);
      res.json(comments);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.get("/api/notes/:id/related-research", async (req: Request, res: Response) => {
    try {
      const noteId = parseInt(req.params.id);
      if (isNaN(noteId)) {
        return res.status(400).json({ error: 'Invalid note ID' });
      }
      
      const currentUserId = req.user?.id;
      
      // Retrieve the note
      const note = await storage.getClinicalNote(noteId, currentUserId);
      if (!note) {
        return res.status(404).json({ error: 'Note not found or you do not have permission to view it' });
      }
      
      // Extract condition and body part from the note
      const condition = extractCondition(note);
      const bodyPart = note.bodyPart;
      
      // Get all articles, potentially filtered by body part
      const { articles: allArticles } = await storage.getResearchArticles(bodyPart);
      
      // If no condition was extracted, return all articles for the body part
      if (!condition) {
        return res.json(allArticles.slice(0, 10)); // Limit to 10 articles
      }
      
      // Score articles based on relevance to the note
      const noteText = `${note.subjective} ${note.objective} ${note.assessment} ${note.plan}`;
      
      // Extract important terms from the note
      const medicalTerms = extractMedicalTerms(noteText);
      const assessmentTerms = extractPhysiotherapyAssessmentTerms(noteText);
      const treatmentTerms = extractTreatmentTerms(noteText);
      
      let scoredArticles = allArticles.map((article: ResearchArticle) => {
        // Base score starts at 0
        let score = 0;
        
        // Check if condition appears in title or abstract
        if (article.title.toLowerCase().includes(condition.toLowerCase())) {
          score += 5;
        }
        
        if (article.abstract.toLowerCase().includes(condition.toLowerCase())) {
          score += 3;
        }
        
        // Score based on medical terminology matches
        for (const term of medicalTerms) {
          if (article.title.toLowerCase().includes(term.toLowerCase()) || 
              article.abstract.toLowerCase().includes(term.toLowerCase())) {
            score += 2;
          }
        }
        
        // Score based on assessment terminology matches
        for (const term of assessmentTerms) {
          if (article.title.toLowerCase().includes(term.toLowerCase()) || 
              article.abstract.toLowerCase().includes(term.toLowerCase())) {
            score += 1.5;
          }
        }
        
        // Score based on treatment terminology matches
        for (const term of treatmentTerms) {
          if (article.title.toLowerCase().includes(term.toLowerCase()) || 
              article.abstract.toLowerCase().includes(term.toLowerCase())) {
            score += 1.5;
          }
        }
        
        // Add bonus for newer articles (published within last 5 years)
        const publicationYear = new Date(article.publicationDate).getFullYear();
        const currentYear = new Date().getFullYear();
        if (currentYear - publicationYear <= 5) {
          score += 1;
        }
        
        // Add bonus for methodology - RCTs and systematic reviews
        if (article.methodology && 
            (article.methodology.toLowerCase().includes('randomized') || 
             article.methodology.toLowerCase().includes('systematic review'))) {
          score += 2;
        }
        
        return {
          article,
          score
        };
      })
      .sort((a, b) => b.score - a.score) // Sort by score in descending order
      .slice(0, 10) // Take top 10 articles
      .map((item: { article: ResearchArticle }) => item.article);
      
      res.json(scoredArticles);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.get("/api/sample-notes", (req: Request, res: Response) => {
    res.json(sampleNotes);
  });

  app.get("/api/sample-notes/:bodyPart", (req: Request, res: Response) => {
    const bodyPart = req.params.bodyPart;
    const filteredNotes = sampleNotes.filter(note => 
      note.bodyPart.toLowerCase() === bodyPart.toLowerCase()
    );
    res.json(filteredNotes);
  });

  app.get("/api/research", async (req: Request, res: Response) => {
    try {
      const bodyPart = req.query.bodyPart as string | undefined;
      const page = parseInt(req.query.page as string || '1');
      const pageSize = parseInt(req.query.pageSize as string || '10');
      const all = req.query.all === 'true';
      
      const result = await storage.getResearchArticles(bodyPart, page, pageSize, all);
      
      // Format the response to match what the frontend expects
      const response = {
        data: result.articles,
        pagination: {
          page: page,
          pageSize: pageSize,
          totalItems: result.total,
          totalPages: Math.ceil(result.total / pageSize)
        }
      };
      
      res.json(response);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.get("/api/research/:id", async (req: Request, res: Response) => {
    try {
      const articleId = parseInt(req.params.id);
      if (isNaN(articleId)) {
        return res.status(400).json({ error: 'Invalid article ID' });
      }
      
      const article = await storage.getResearchArticle(articleId);
      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }
      
      res.json(article);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.post("/api/research", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const data = insertResearchArticleSchema.parse({
        ...req.body,
        submittedBy: userId
      });
      
      const article = await storage.createResearchArticle(data);
      res.status(201).json(article);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.get("/api/subscriptions", async (req: Request, res: Response) => {
    try {
      const subscriptionPlans = await storage.getSubscriptionPlans();
      res.json(subscriptionPlans);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.get("/api/user/subscription", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Retrieve subscription details from the user object
      const subscriptionInfo = {
        tier: user.membershipTier,
        expiryDate: user.membershipExpiry,
        subscriptionId: user.stripeSubscriptionId || null
      };
      
      res.json(subscriptionInfo);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.post("/api/user/subscription/cancel", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Check if user has an active membership
      if (user.membershipTier === 'none') {
        return res.status(400).json({ error: 'No active subscription to cancel' });
      }
      
      // If user has a Stripe subscription, cancel it
      if (user.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId);
        } catch (stripeError) {
          console.error("Error cancelling Stripe subscription:", stripeError);
          // Continue with membership cancellation even if Stripe API fails
        }
      }
      
      // Update the user's membership tier to 'none'
      await storage.updateUserMembership(userId, 'none', new Date());
      
      res.json({ message: 'Subscription successfully cancelled' });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.get("/api/user/payments", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const payments = await storage.getUserPayments(userId);
      res.json(payments);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.post("/api/user/payments", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const data = insertPaymentRecordSchema.parse({
        ...req.body,
        userId
      });
      
      const payment = await storage.createPaymentRecord(data);
      
      // If the payment is completed, update the user's membership status based on the plan
      if (data.status === 'completed') {
        // Get the subscription plan from the planId in the payment data
        const subscriptionPlan = await storage.getSubscriptionPlan(data.planId);
        
        if (!subscriptionPlan) {
          throw new Error(`Subscription plan with ID ${data.planId} not found`);
        }
        
        // Calculate membership expiry date - default to 30 days if not specified
        const expiryDate = new Date();
        // Calculate based on interval (weekly, monthly, yearly)
        if (subscriptionPlan.interval === 'weekly') {
          expiryDate.setDate(expiryDate.getDate() + 7);
        } else if (subscriptionPlan.interval === 'monthly') {
          expiryDate.setMonth(expiryDate.getMonth() + 1);
        } else if (subscriptionPlan.interval === 'yearly') {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        } else {
          // Default to 30 days
          expiryDate.setDate(expiryDate.getDate() + 30);
        }
        
        // Update user membership with the tier from the subscription plan
        await storage.updateUserMembership(userId, subscriptionPlan.tier, expiryDate);
      }
      
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.post("/api/create-payment-intent", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { amount, planId } = req.body;
      
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }
      
      if (!planId) {
        return res.status(400).json({ error: 'Plan ID is required' });
      }
      
      // Validate that the subscription plan exists
      const subscriptionPlan = await storage.getSubscriptionPlan(planId);
      if (!subscriptionPlan) {
        return res.status(400).json({ error: `Invalid subscription plan ID: ${planId}` });
      }
      
      // Create a payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(amount) * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          userId: userId.toString(),
          planId: planId.toString(),
          planTier: subscriptionPlan.tier,
          integrationCheck: 'physiotherapy_platform'
        }
      });
      
      res.json({
        clientSecret: paymentIntent.client_secret
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  // Helper function to add Reformer Pilates exercises
  const ensureReformerExercisesAdded = async () => {
    // Get Reformer Pilates exercises by querying the database directly
    try {
      // Use the storage interface to search for reformer exercises
      const searchResults = await storage.getExercisesBySearchTerm("Reformer");
      
      if (searchResults.length < 5) {
        console.log("Adding Reformer Pilates exercises to the database...");
        const { addReformerPilatesExercises } = await import('./routes/addReformerPilatesExercises');
        await addReformerPilatesExercises();
      }
    } catch (error) {
      console.error("Error checking for Reformer exercises:", error);
    }
  };

  app.get("/api/exercises", async (req: Request, res: Response) => {
    try {
      // Ensure Reformer Pilates exercises are added
      await ensureReformerExercisesAdded();
      
      const bodyPart = req.query.bodyPart as string | undefined;
      const difficulty = req.query.difficulty as string | undefined;
      const searchTerm = req.query.search as string | undefined;
      const getAll = req.query.all === 'true';
      
      // If search term is provided, use it for filtering exercises
      if (searchTerm && searchTerm.trim() !== '') {
        const searchResults = await storage.getExercisesBySearchTerm(searchTerm);
        
        // Further filter by body part and difficulty if needed
        let filteredResults = searchResults;
        
        if (bodyPart && bodyPartEnum.enumValues.includes(bodyPart as any)) {
          filteredResults = filteredResults.filter(ex => ex.bodyPart === bodyPart);
        }
        
        if (difficulty && difficultyEnum.enumValues.includes(difficulty as any)) {
          filteredResults = filteredResults.filter(ex => ex.difficulty === difficulty);
        }
        
        return res.json(filteredResults);
      }
      
      // If "all" parameter is true, retrieve all exercises
      if (getAll) {
        const allExercises = await storage.getExercises(undefined, undefined, true);
        return res.json(allExercises);
      }
      
      // Use the normal storage method if no search term
      const exerciseResults = await storage.getExercises(bodyPart, difficulty);
      res.json(exerciseResults);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.get("/api/exercises/:id", async (req: Request, res: Response) => {
    try {
      const exerciseId = parseInt(req.params.id);
      if (isNaN(exerciseId)) {
        return res.status(400).json({ error: 'Invalid exercise ID' });
      }
      
      const exercise = await storage.getExercise(exerciseId);
      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }
      
      res.json(exercise);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.post("/api/exercises/generate", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { bodyPart, difficulty, count } = req.body;
      
      if (!bodyPart || !difficulty || !count) {
        return res.status(400).json({ error: 'Body part, difficulty, and count are required' });
      }
      
      const generationRequest: ExerciseGenerationRequest = {
        bodyPart,
        difficulty,
        count: parseInt(count)
      };
      
      try {
        const exercises = await generateExercises(generationRequest);
        res.json(exercises);
      } catch (error) {
        console.error('Error generating exercises with AI:', error);
        
        // Fall back to predefined exercises if AI generation fails
        const fallbackExercises = generateFallbackExercises(generationRequest);
        res.json({ 
          exercises: fallbackExercises,
          warning: 'Used fallback exercises due to AI generation failure'
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.post("/api/exercises", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const data = insertExerciseSchema.parse({
        ...req.body,
        createdBy: userId
      });
      
      const exercise = await storage.createExercise(data);
      res.status(201).json(exercise);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.get("/api/manual-therapy", async (req: Request, res: Response) => {
    try {
      const bodyPart = req.query.bodyPart as string | undefined;
      
      const techniques = await storage.getManualTherapyTechniques(bodyPart);
      res.json(techniques);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.get("/api/manual-therapy/:id", async (req: Request, res: Response) => {
    try {
      const techniqueId = parseInt(req.params.id);
      if (isNaN(techniqueId)) {
        return res.status(400).json({ error: 'Invalid technique ID' });
      }
      
      const technique = await storage.getManualTherapyTechnique(techniqueId);
      if (!technique) {
        return res.status(404).json({ error: 'Technique not found' });
      }
      
      res.json(technique);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.post("/api/manual-therapy", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const data = insertManualTherapyTechniqueSchema.parse({
        ...req.body,
        createdBy: userId
      });
      
      const technique = await storage.createManualTherapyTechnique(data);
      res.status(201).json(technique);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.get("/api/manual-therapy/counts", async (req: Request, res: Response) => {
    try {
      // Get techniques for all body parts to count them
      const allTechniques = await storage.getManualTherapyTechniques();
      
      // Count techniques by body part
      const counts: Record<string, number> = {};
      
      bodyPartEnum.options.forEach(bodyPart => {
        counts[bodyPart] = allTechniques.filter(
          technique => technique.bodyPart === bodyPart
        ).length;
      });
      
      res.json(counts);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.get("/api/virtual-patients", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const virtualPatients = await storage.getUserVirtualPatients(userId);
      res.json(virtualPatients);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.get("/api/virtual-patients/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.id);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: 'Invalid patient ID' });
      }
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const virtualPatient = await storage.getVirtualPatient(patientId);
      if (!virtualPatient) {
        return res.status(404).json({ error: 'Virtual patient not found' });
      }
      
      // Ensure the virtual patient belongs to the authenticated user
      if (virtualPatient.userId !== userId) {
        return res.status(403).json({ error: 'You do not have permission to access this virtual patient' });
      }
      
      // Fetch related research articles if there are any related article IDs
      let relatedResearch: any[] = [];
      
      // For debugging - log the field value
      console.log("Patient related_article_ids:", virtualPatient.related_article_ids);
      console.log("Patient relatedArticleIds:", virtualPatient.relatedArticleIds);
      
      // Try both possible field names for backward compatibility
      const articleIdsField = virtualPatient.related_article_ids || virtualPatient.relatedArticleIds;
      
      if (articleIdsField && (Array.isArray(articleIdsField) || typeof articleIdsField === 'string')) {
        try {
          // Try to parse the IDs if they're in string format
          let articleIds;
          if (typeof articleIdsField === 'string') {
            try {
              articleIds = JSON.parse(articleIdsField);
            } catch {
              // If it fails to parse as JSON, split by commas (older format)
              articleIds = articleIdsField.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            }
          } else {
            articleIds = articleIdsField;
          }
            
          if (Array.isArray(articleIds) && articleIds.length > 0) {
            console.log("Fetching research articles with IDs:", articleIds);
            
            // If no articles found through IDs, get some default ones for this body part
            relatedResearch = await storage.getResearchArticlesByIds(articleIds);
            console.log(`Found ${relatedResearch.length} related research articles`);
            
            // If no related articles found by IDs, get some default ones
            if (relatedResearch.length === 0) {
              console.log("No articles found by IDs, getting default articles for body part:", virtualPatient.body_part);
              const { articles } = await storage.getResearchArticles(virtualPatient.body_part, 1, 5);
              relatedResearch = articles;
              console.log(`Using ${relatedResearch.length} default articles for this body part`);
            }
          } else {
            // If no article IDs found, get some default ones for this body part
            console.log("No article IDs found, getting default articles for body part:", virtualPatient.body_part);
            const { articles } = await storage.getResearchArticles(virtualPatient.body_part, 1, 5);
            relatedResearch = articles;
            console.log(`Using ${relatedResearch.length} default articles for this body part`);
          }
        } catch (err) {
          console.error('Error fetching related research articles:', err, articleIdsField);
          // Fallback to default articles for this body part
          try {
            const { articles } = await storage.getResearchArticles(virtualPatient.bodyPart, 1, 5);
            relatedResearch = articles;
            console.log(`Using ${relatedResearch.length} fallback articles for this body part`);
          } catch (fallbackErr) {
            console.error('Error fetching fallback articles:', fallbackErr);
          }
        }
      } else {
        // If no article IDs field found, get some default ones for this body part
        try {
          console.log("No article IDs field found, getting default articles for body part:", virtualPatient.bodyPart);
          const { articles } = await storage.getResearchArticles(virtualPatient.bodyPart, 1, 5);
          relatedResearch = articles;
          console.log(`Using ${relatedResearch.length} default articles for this body part`);
        } catch (err) {
          console.error('Error fetching default articles:', err);
        }
      }
      
      // Return the virtual patient with related research articles included
      res.json({
        ...virtualPatient,
        relatedResearch
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.post("/api/virtual-patients", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const data = insertVirtualPatientSchema.parse({
        ...req.body,
        userId,
        status: 'pending', // Initial status
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      const virtualPatient = await storage.createVirtualPatient(data);
      res.status(201).json(virtualPatient);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.patch("/api/virtual-patients/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.id);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: 'Invalid patient ID' });
      }
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const virtualPatient = await storage.getVirtualPatient(patientId);
      if (!virtualPatient) {
        return res.status(404).json({ error: 'Virtual patient not found' });
      }
      
      // Ensure the virtual patient belongs to the authenticated user
      if (virtualPatient.userId !== userId) {
        return res.status(403).json({ error: 'You do not have permission to update this virtual patient' });
      }
      
      const updateData = {
        ...req.body,
        updatedAt: new Date()
      };
      
      const updatedPatient = await storage.updateVirtualPatient(patientId, updateData);
      res.json(updatedPatient);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.post("/api/virtual-patients/:id/analyze", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.id);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: 'Invalid patient ID' });
      }
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const virtualPatient = await storage.getVirtualPatient(patientId);
      if (!virtualPatient) {
        return res.status(404).json({ error: 'Virtual patient not found' });
      }
      
      // Ensure the virtual patient belongs to the authenticated user
      if (virtualPatient.userId !== userId) {
        return res.status(403).json({ error: 'You do not have permission to analyze this virtual patient' });
      }
      
      // Set hasBeenEdited to false since we're now analyzing/reanalyzing
      await storage.updateVirtualPatient(patientId, {
        hasBeenEdited: false
      });
      
      // Special case for username "fateofjustice" - should get premium features for free
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      let hasPremiumAccess = user.username === 'fateofjustice';
      
      // If not special user, check if they have appropriate membership
      if (!hasPremiumAccess) {
        if (!user.membershipTier || user.membershipTier === 'free') {
          return res.status(403).json({ 
            error: 'Virtual patient analysis requires a paid membership',
            code: 'membership_required'
          });
        }
        
        // Check if membership has expired
        if (user.membershipExpiry && new Date(user.membershipExpiry) < new Date()) {
          return res.status(403).json({ 
            error: 'Your membership has expired',
            code: 'membership_expired'
          });
        }
      }
      
      // If we get here, user has appropriate access
      
      // Update status to 'analyzing'
      await storage.updateVirtualPatient(patientId, {
        status: 'analyzing',
        updatedAt: new Date()
      });
      
      // Determine if this is a shoulder-related case that should use Jo Gibson's approach
      let analysisResult;
      try {
        // Import the specialized shoulder analysis module
        const { analyzeShoulderPatientJoGibson, isShoulderPatient } = require('./virtualPatientJoGibson');
        
        // Check if the patient has shoulder-related issues using the specialized function
        const isShoulderRelated = isShoulderPatient(virtualPatient);
          
        if (isShoulderRelated) {
          // Try to use the Jo Gibson approach for shoulder cases
          console.log("Using Jo Gibson shoulder approach for patient analysis");
          
          const joGibsonResult = await analyzeShoulderPatientJoGibson(virtualPatient);
          
          // Convert the Jo Gibson specialized format to our standard format
          analysisResult = {
            primaryDiagnosis: { name: joGibsonResult.diagnosis, description: "Based on Jo Gibson's shoulder approach" },
            differentialDiagnoses: joGibsonResult.differentialDiagnosis.map(d => ({ 
              name: d.condition, 
              description: d.rationale,
              likelihood: d.likelihood
            })),
            treatmentOptions: joGibsonResult.treatmentOptions,
            assessmentTests: joGibsonResult.assessmentTests,
            recommendedKeywords: ["Jo Gibson", "shoulder rehabilitation", "evidence-based physiotherapy"],
            joGibsonSpecificApproach: true,
            relatedArticleIds: joGibsonResult.relatedArticleIds || []
          };
        } else {
          // Use standard analysis for non-shoulder cases
          analysisResult = await analyzeVirtualPatientCase(virtualPatient);
        }
      } catch (error) {
        console.error("Error in Jo Gibson shoulder analysis, falling back to standard analysis:", error);
        analysisResult = await analyzeVirtualPatientCase(virtualPatient);
      }
      
      // Get empty arrays if properties are missing to prevent "cannot read properties of undefined" errors
      const differentialDiagnoses = analysisResult.differentialDiagnoses?.map(d => d.name) || [];
      const keywords = analysisResult.recommendedKeywords || [];
      
      // Find relevant research articles based on the diagnosis and related article IDs
      
      // Determine if this is a shoulder case that could benefit from Jo Gibson's approach
      // Use the specialized detection function for accurate identification
      const isShoulderCase = isShoulderPatient(virtualPatient);
      
      // Get specialized analysis for shoulder cases using Jo Gibson's approach
      let joGibsonSpecificArticles = [];
      if (isShoulderCase) {
        try {
          const joGibsonAnalysis = await analyzeShoulderPatientJoGibson(virtualPatient);
          
          // Extract the relatedArticleIds from Jo Gibson's specialized analysis
          if (joGibsonAnalysis && joGibsonAnalysis.relatedArticleIds) {
            joGibsonSpecificArticles = joGibsonAnalysis.relatedArticleIds;
          }
        } catch (error) {
          console.error("Error getting Jo Gibson shoulder analysis:", error);
        }
      }
      
      const searchResults = await findRelevantResearchArticles(
        analysisResult.primaryDiagnosis?.name || "undefined diagnosis",
        differentialDiagnoses,
        virtualPatient.body_part,
        keywords,
        joGibsonSpecificArticles
      );
      
      // Get relevant article IDs from the search terms
      const relevantArticleIds = searchResults?.searchTerms || [];
      
      // Include Jo Gibson's specialized shoulder articles if available
      const joGibsonArticles = isShoulderCase && searchResults?.joGibsonSpecificArticles ? 
        searchResults.joGibsonSpecificArticles : [];
      
      // Include assessment tests in the patient data
      // First, modify the virtual patient schema to include assessment tests
      const updatedData = {
        diagnosis: analysisResult.primaryDiagnosis?.name || "Unknown diagnosis",
        differentialDiagnosis: analysisResult.differentialDiagnoses || [],
        treatmentOptions: analysisResult.treatmentOptions || [],
        relatedArticleIds: [...relevantArticleIds, ...joGibsonArticles],
        // Store assessment tests directly in the differential diagnosis object for now
        // since we don't have a dedicated field in the database
        assessmentTests: analysisResult.assessmentTests || []
      };
      
      // Update the virtual patient with the analysis results
      const updatedPatient = await storage.updateVirtualPatient(
        patientId,
        updatedData
      );
      
      // Add a note about Jo Gibson's specialized approach when applicable
      if (isShoulderCase) {
        res.json({
          ...updatedPatient,
          joGibsonApproach: true,
          joGibsonNote: "This analysis incorporates Jo Gibson's specialized shoulder rehabilitation approach."
        });
      } else {
        res.json(updatedPatient);
      }
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  // Peer Knowledge Exchange - Shared Cases Operations
  app.get("/api/shared-cases", async (req: Request, res: Response) => {
    try {
      const bodyPart = req.query.bodyPart as string | undefined;
      const expertiseLevel = req.query.expertiseLevel as string | undefined;
      const complexityLevel = req.query.complexityLevel as string | undefined;
      const searchTerm = req.query.search as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 10;
      
      const result = await storage.getSharedCases(
        bodyPart,
        expertiseLevel,
        complexityLevel,
        searchTerm,
        page,
        pageSize
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching shared cases:", error);
      res.status(500).json({ error: "Failed to fetch shared cases" });
    }
  });
  
  app.get("/api/shared-cases/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid case ID" });
      }
      
      const sharedCase = await storage.getSharedCase(id);
      
      if (!sharedCase) {
        return res.status(404).json({ error: "Case not found" });
      }
      
      // Increment the view count
      await storage.incrementCaseViews(id);
      
      res.json(sharedCase);
    } catch (error) {
      console.error("Error fetching shared case:", error);
      res.status(500).json({ error: "Failed to fetch shared case" });
    }
  });
  
  app.get("/api/users/:userId/shared-cases", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      const cases = await storage.getUserSharedCases(userId);
      res.json(cases);
    } catch (error) {
      console.error("Error fetching user's shared cases:", error);
      res.status(500).json({ error: "Failed to fetch user's shared cases" });
    }
  });
  
  app.get("/api/my-shared-cases", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const cases = await storage.getUserSharedCases(req.user!.id);
      res.json(cases);
    } catch (error) {
      console.error("Error fetching user's shared cases:", error);
      res.status(500).json({ error: "Failed to fetch your shared cases" });
    }
  });
  
  app.post("/api/shared-cases", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      // Set the user ID from the authenticated user
      const sharedCase = {
        ...req.body,
        userId: req.user!.id,
        isApproved: req.user!.membershipTier !== "none" // Auto-approve for paid users
      };
      
      const newCase = await storage.createSharedCase(sharedCase);
      
      // Add tags if provided
      if (req.body.tagIds && Array.isArray(req.body.tagIds)) {
        for (const tagId of req.body.tagIds) {
          await storage.addCaseTag(newCase.id, tagId);
        }
      }
      
      res.status(201).json(newCase);
    } catch (error) {
      console.error("Error creating shared case:", error);
      res.status(500).json({ error: "Failed to create shared case" });
    }
  });
  
  app.put("/api/shared-cases/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid case ID" });
      }
      
      // Get the case to check ownership
      const existingCase = await storage.getSharedCase(id);
      
      if (!existingCase) {
        return res.status(404).json({ error: "Case not found" });
      }
      
      // Check if the user owns the case
      if (existingCase.userId !== req.user!.id) {
        return res.status(403).json({ error: "You do not have permission to update this case" });
      }
      
      const updatedCase = await storage.updateSharedCase(id, req.body);
      
      // Update tags if provided
      if (req.body.tagIds && Array.isArray(req.body.tagIds)) {
        // Get existing tag mappings
        const existingTagMappings = await db.select()
          .from(caseTagsMapping)
          .where(eq(caseTagsMapping.caseId, id));
          
        // Remove tags that are no longer in the list
        for (const mapping of existingTagMappings) {
          if (!req.body.tagIds.includes(mapping.tagId)) {
            await storage.removeCaseTag(id, mapping.tagId);
          }
        }
        
        // Add new tags
        for (const tagId of req.body.tagIds) {
          const exists = existingTagMappings.some(m => m.tagId === tagId);
          if (!exists) {
            await storage.addCaseTag(id, tagId);
          }
        }
      }
      
      res.json(updatedCase);
    } catch (error) {
      console.error("Error updating shared case:", error);
      res.status(500).json({ error: "Failed to update shared case" });
    }
  });
  
  app.delete("/api/shared-cases/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid case ID" });
      }
      
      // Get the case to check ownership
      const existingCase = await storage.getSharedCase(id);
      
      if (!existingCase) {
        return res.status(404).json({ error: "Case not found" });
      }
      
      // Check if the user owns the case or is an admin
      if (existingCase.userId !== req.user!.id && req.user!.membershipTier !== "premium") {
        return res.status(403).json({ error: "You do not have permission to delete this case" });
      }
      
      // Delete the case (this will cascade to delete related data)
      await db.delete(sharedCases).where(eq(sharedCases.id, id));
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting shared case:", error);
      res.status(500).json({ error: "Failed to delete shared case" });
    }
  });
  
  app.post("/api/shared-cases/:id/upvote", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const caseId = parseInt(req.params.id);
      
      if (isNaN(caseId)) {
        return res.status(400).json({ error: "Invalid case ID" });
      }
      
      const result = await storage.upvoteCase(caseId, req.user!.id);
      res.json(result);
    } catch (error) {
      console.error("Error upvoting case:", error);
      res.status(500).json({ error: "Failed to upvote case" });
    }
  });
  
  app.delete("/api/shared-cases/:id/upvote", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const caseId = parseInt(req.params.id);
      
      if (isNaN(caseId)) {
        return res.status(400).json({ error: "Invalid case ID" });
      }
      
      const result = await storage.removeUpvoteCase(caseId, req.user!.id);
      res.json(result);
    } catch (error) {
      console.error("Error removing case upvote:", error);
      res.status(500).json({ error: "Failed to remove case upvote" });
    }
  });
  
  // Peer Knowledge Exchange - Case Discussions Operations
  app.get("/api/shared-cases/:caseId/discussions", async (req: Request, res: Response) => {
    try {
      const caseId = parseInt(req.params.caseId);
      
      if (isNaN(caseId)) {
        return res.status(400).json({ error: "Invalid case ID" });
      }
      
      const discussions = await storage.getCaseDiscussions(caseId);
      res.json(discussions);
    } catch (error) {
      console.error("Error fetching case discussions:", error);
      res.status(500).json({ error: "Failed to fetch case discussions" });
    }
  });
  
  app.get("/api/case-discussions/:discussionId/replies", async (req: Request, res: Response) => {
    try {
      const discussionId = parseInt(req.params.discussionId);
      
      if (isNaN(discussionId)) {
        return res.status(400).json({ error: "Invalid discussion ID" });
      }
      
      const replies = await storage.getDiscussionReplies(discussionId);
      res.json(replies);
    } catch (error) {
      console.error("Error fetching discussion replies:", error);
      res.status(500).json({ error: "Failed to fetch discussion replies" });
    }
  });
  
  app.post("/api/shared-cases/:caseId/discussions", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const caseId = parseInt(req.params.caseId);
      
      if (isNaN(caseId)) {
        return res.status(400).json({ error: "Invalid case ID" });
      }
      
      // Make sure the case exists
      const sharedCase = await storage.getSharedCase(caseId);
      
      if (!sharedCase) {
        return res.status(404).json({ error: "Case not found" });
      }
      
      // Create the discussion
      const discussion = {
        ...req.body,
        caseId,
        userId: req.user!.id
      };
      
      const newDiscussion = await storage.createCaseDiscussion(discussion);
      res.status(201).json(newDiscussion);
    } catch (error) {
      console.error("Error creating case discussion:", error);
      res.status(500).json({ error: "Failed to create case discussion" });
    }
  });
  
  app.put("/api/case-discussions/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid discussion ID" });
      }
      
      // Get the discussion to check ownership
      const existingDiscussion = await storage.getCaseDiscussion(id);
      
      if (!existingDiscussion) {
        return res.status(404).json({ error: "Discussion not found" });
      }
      
      // Check if the user owns the discussion
      if (existingDiscussion.userId !== req.user!.id) {
        return res.status(403).json({ error: "You do not have permission to update this discussion" });
      }
      
      const updatedDiscussion = await storage.updateCaseDiscussion(id, req.body.content);
      res.json(updatedDiscussion);
    } catch (error) {
      console.error("Error updating case discussion:", error);
      res.status(500).json({ error: "Failed to update case discussion" });
    }
  });
  
  app.post("/api/case-discussions/:id/upvote", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const discussionId = parseInt(req.params.id);
      
      if (isNaN(discussionId)) {
        return res.status(400).json({ error: "Invalid discussion ID" });
      }
      
      const result = await storage.upvoteDiscussion(discussionId, req.user!.id);
      res.json(result);
    } catch (error) {
      console.error("Error upvoting discussion:", error);
      res.status(500).json({ error: "Failed to upvote discussion" });
    }
  });
  
  app.delete("/api/case-discussions/:id/upvote", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const discussionId = parseInt(req.params.id);
      
      if (isNaN(discussionId)) {
        return res.status(400).json({ error: "Invalid discussion ID" });
      }
      
      const result = await storage.removeUpvoteDiscussion(discussionId, req.user!.id);
      res.json(result);
    } catch (error) {
      console.error("Error removing discussion upvote:", error);
      res.status(500).json({ error: "Failed to remove discussion upvote" });
    }
  });
  
  // Peer Knowledge Exchange - Tags Operations
  app.get("/api/case-tags", async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string | undefined;
      
      let tags;
      if (category) {
        tags = await storage.getCaseTagsByCategory(category);
      } else {
        tags = await storage.getCaseTags();
      }
      
      res.json(tags);
    } catch (error) {
      console.error("Error fetching case tags:", error);
      res.status(500).json({ error: "Failed to fetch case tags" });
    }
  });
  
  // File Upload API for Peer Knowledge Exchange attachments
  app.post("/api/peer-exchange/upload", ensureAuthenticated, uploadToS3.array("files", 5), async (req: Request, res: Response) => {
    try {
      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        return res.status(400).json({ error: "No files were uploaded" });
      }

      const files = Array.isArray(req.files) ? req.files : [req.files];
      const fileDetails = files.map(file => ({
        url: (file as any).location,
        name: file.originalname,
        type: getFileType(file.mimetype),
        size: file.size
      }));
      
      res.status(200).json(fileDetails);
    } catch (error) {
      console.error("File upload error:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred during file upload' });
      }
    }
  });
  
  app.post("/api/case-tags", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      // Check if the user has permission to create tags (premium members only)
      if (req.user!.membershipTier !== "premium") {
        return res.status(403).json({ error: "Only premium members can create new tags" });
      }
      
      const { name, category, color } = req.body;
      
      if (!name || !category || !color) {
        return res.status(400).json({ error: "Name, category, and color are required" });
      }
      
      const newTag = await storage.createCaseTag(name, category, color);
      res.status(201).json(newTag);
    } catch (error) {
      console.error("Error creating case tag:", error);
      res.status(500).json({ error: "Failed to create case tag" });
    }
  });

  // Admin API Routes
  app.get("/api/admin/users", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      // Check if user is admin (case insensitive check for better compatibility)
      if (!req.user || !['fateofjustice', 'Fateofjustice'].includes(req.user.username)) {
        return res.status(403).json({ error: "Unauthorized access" });
      }
      
      // Get all users
      const users = await storage.getAllUsers();
      const totalUsers = await storage.getUserCount();
      
      // Count membership tiers
      const byMembership = {
        basic: 0,
        standard: 0,
        premium: 0,
        none: 0
      };
      
      users.forEach(user => {
        const tier = user.membershipTier || 'none';
        byMembership[tier] += 1;
      });
      
      res.json({
        totalUsers,
        users: users.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          membershipTier: user.membershipTier || 'none',
          membershipExpiry: user.membershipExpiry ? user.membershipExpiry.toISOString() : null,
          createdAt: user.createdAt ? user.createdAt.toISOString() : 'N/A'
        })),
        byMembership
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin statistics" });
    }
  });

  // AI Case Studies API Routes
  app.get("/api/case-studies", async (req: Request, res: Response) => {
    try {
      const { bodyPart, complexity } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      
      // Get existing case studies
      const result = await storage.getAICaseStudies(
        bodyPart as string, 
        complexity as string,
        page,
        pageSize
      );
      
      // Check if we need to load sample case studies (if none exist)
      if (result.total === 0 || result.caseStudies.length === 0) {
        console.log("No case studies found, loading sample case studies...");
        try {
          // Import and add sample case studies
          const { addSampleCaseStudies } = await import('./sampleCaseStudies');
          await addSampleCaseStudies(storage);
          
          // Add additional case studies (5 per body part)
          const { addAdditionalCaseStudies } = await import('./additionalCaseStudies');
          await addAdditionalCaseStudies(storage);
          
          // Try to fetch again after adding samples
          const updatedResult = await storage.getAICaseStudies(
            bodyPart as string,
            complexity as string,
            page,
            pageSize
          );
          
          return res.json(updatedResult);
        } catch (sampleError) {
          console.error("Error loading sample case studies:", sampleError);
          // Continue with original empty result if sample loading fails
        }
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching case studies:", error);
      res.status(500).json({ error: "Error fetching case studies" });
    }
  });

  app.get("/api/case-studies/:id", async (req: Request, res: Response) => {
    try {
      const caseId = parseInt(req.params.id);
      const caseStudy = await storage.getAICaseStudy(caseId);
      
      if (!caseStudy) {
        return res.status(404).json({ error: "Case study not found" });
      }
      
      res.json(caseStudy);
    } catch (error) {
      console.error("Error fetching case study:", error);
      res.status(500).json({ error: "Error fetching case study" });
    }
  });

  app.post("/api/case-studies", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      // Check if user has required membership for AI case studies
      if (req.user.username !== "Fateofjustice" && 
          (req.user.membershipTier === "none" || !req.user.membershipTier)) {
        return res.status(403).json({ 
          error: "Paid membership required", 
          code: "membership_required" 
        });
      }
      
      const { bodyPart, complexity, includeResearch } = req.body;
      
      // Validate input
      if (!bodyPart || !complexity) {
        return res.status(400).json({ error: "Body part and complexity are required" });
      }
      
      // Generate the AI case study
      const caseStudy = await generateAICaseStudy(
        { bodyPart, complexity, includeResearch: includeResearch ?? true },
        req.user.id
      );
      
      // Save to database
      const savedCaseStudy = await storage.createAICaseStudy(caseStudy);
      
      res.status(201).json(savedCaseStudy);
    } catch (error) {
      console.error("Error creating case study:", error);
      res.status(500).json({ error: "Error creating case study" });
    }
  });

  app.get("/api/case-studies/:id/attempts", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const caseId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const attempts = await storage.getUserAttemptsForCase(userId, caseId);
      
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching case study attempts:", error);
      res.status(500).json({ error: "Error fetching case study attempts" });
    }
  });

  app.post("/api/case-studies/:id/attempt", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const caseId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Get the case study
      const caseStudy = await storage.getAICaseStudy(caseId);
      if (!caseStudy) {
        return res.status(404).json({ error: "Case study not found" });
      }
      
      // Create the attempt record
      const attemptData = {
        caseStudyId: caseId,
        userId,
        userDiagnosis: req.body.userDiagnosis,
        userReasoning: req.body.userReasoning,
        assessmentTests: req.body.assessmentTests,
        proposedTreatment: req.body.proposedTreatment,
        completed: false
      };
      
      const attempt = await storage.createCaseStudyAttempt(attemptData);
      
      // Generate feedback
      const feedback = await generateDiagnosticFeedback({
        caseStudyId: caseId,
        userDiagnosis: req.body.userDiagnosis,
        userReasoning: req.body.userReasoning,
        assessmentTests: req.body.assessmentTests,
        proposedTreatment: req.body.proposedTreatment
      }, caseStudy);
      
      // Update the attempt with feedback
      const updatedAttempt = await storage.updateCaseStudyAttemptFeedback(
        attempt.id,
        feedback,
        feedback.overallAccuracy
      );
      
      res.status(201).json(updatedAttempt);
    } catch (error) {
      console.error("Error submitting case study attempt:", error);
      res.status(500).json({ error: "Error submitting case study attempt" });
    }
  });

  app.get("/api/user/case-studies", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const caseStudies = await storage.getUserAICaseStudies(userId);
      
      res.json(caseStudies);
    } catch (error) {
      console.error("Error fetching user case studies:", error);
      res.status(500).json({ error: "Error fetching user case studies" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}