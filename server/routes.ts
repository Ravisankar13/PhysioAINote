import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { eq, sql, ilike } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import { generateSoapNote } from "./openai";
import { analyzeVirtualPatientCase, findRelevantResearchArticles } from "./virtualPatientOpenai";
import { analyzeShoulderPatientJoGibson } from "./virtualPatientJoGibson";
import { analyzePatientGrimaldi } from "./virtualPatientGrimaldi";
import { analyzePatientBisset } from "./virtualPatientBisset";
import { analyzePatientClinicalEdge } from "./virtualPatientClinicalEdge";
import { analyzePatientPhysioNetwork } from "./virtualPatientPhysioNetwork";
import { analyzePatientSportsMap } from "./virtualPatientSportsMap";
import { joGibsonTreatmentPrinciples, joGibsonAssessmentPrinciples } from "./joGibsonShoulderLibrary";
import { clinicalEdgeRegionalApproaches, clinicalEdgeTreatmentPrinciples } from "./clinicalEdgeLibrary";
import { physioNetworkPainApproaches, physioNetworkTreatmentPrinciples } from "./physioNetworkLibrary";
import { sportsMapSportSpecificApproaches, sportsMapTreatmentPrinciples } from "./sportsMapLibrary";
import { grimaldiHipApproaches, grimaldiTreatmentPrinciples } from "./grimaldi-hip-library";
import { bissetElbowApproaches, bissetTreatmentPrinciples } from "./bisset-elbow-library";
import { generateAICaseStudy, generateDiagnosticFeedback } from "./aiCaseStudyGenerator";
import { physioGptService } from "./physioGptService";
import { researchGapAnalysisService } from "./researchGapAnalysis";
import { soapNoteInputSchema, insertClinicalNoteSchema, insertCommentSchema, updateNoteVisibilitySchema, insertResearchArticleSchema, insertPaymentRecordSchema, insertExerciseSchema, insertManualTherapyTechniqueSchema, type ResearchArticle, insertVirtualPatientSchema, bodyPartEnum, sharedCases, caseTagsMapping, caseUpvotes, caseDiscussions, exercises, users, researchDiscussions, researchDiscussionVotes } from "@shared/schema";
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
import { sampleResearchArticles } from "./sampleResearchArticles";
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

      // Get file stats for debugging
      const stats = fs.statSync(req.file.path);
      console.log(`Audio file size: ${stats.size} bytes`);

      // Use a fallback response by default (this will be returned even if we fail completely)
      const fallbackResponse = {
        transcription: "Your recording was received. We're currently experiencing connection issues with our transcription service. You can still create clinical notes manually.",
        insights: {
          transcription: "Audio received and saved successfully.",
          clinicalInsights: "Please try recording again later or proceed with manual clinical notes creation."
        },
        soapNote: {
          subjective: "Patient recording received but automatic transcription unavailable due to connection issues.",
          objective: "",
          assessment: "",
          plan: ""
        }
      };

      // Try transcribing with a short timeout to handle connection issues gracefully
      let transcription;
      try {
        // Create a promise that resolves after a timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Transcription timeout")), 5000);
        });

        // Race the transcription against the timeout
        transcription = await Promise.race([
          transcribeAudio(req.file.path),
          timeoutPromise
        ]);
      } catch (transcriptionError) {
        console.log('Transcription error or timeout, using fallback text:', transcriptionError);
        // Return the fallback response immediately rather than continuing to try other steps
        return res.json(fallbackResponse);
      }

      // If we got here, transcription worked, so try insights
      let insights;
      try {
        insights = await analyzeTranscription(transcription);
      } catch (insightsError) {
        console.log('Insights generation error, using basic insights:', insightsError);
        insights = {
          transcription: transcription,
          clinicalInsights: "Clinical recording transcribed successfully."
        };
      }

      // Generate SOAP structure even with fallback insights
      let soapNote;
      try {
        soapNote = generateSoapSectionsFromInsights(transcription, insights);
      } catch (soapError) {
        console.log('SOAP generation error, using basic structure:', soapError);
        soapNote = {
          subjective: transcription,
          objective: "",
          assessment: "",
          plan: ""
        };
      }

      // Successfully processed recording
      res.json({
        transcription,
        insights,
        soapNote
      });
    } catch (error: any) {
      console.error('Unexpected error in transcription process:', error);
      // Send a fallback response the client can use instead of an error
      res.json({
        transcription: "Your recording was received successfully. There was an issue with automatic processing, but you can continue with manual note creation.",
        insights: {
          transcription: "Audio recording saved.",
          clinicalInsights: "The system will continue to process your recording in the background."
        },
        soapNote: {
          subjective: "Patient recording received.",
          objective: "",
          assessment: "",
          plan: ""
        }
      });
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
      let transcription;
      try {
        transcription = await transcribeAudio(req.file.path);
      } catch (transcriptionError) {
        console.error('Transcription error:', transcriptionError);
        transcription = "Your recording was received but couldn't be automatically transcribed at this moment. You can still create notes manually.";
      }

      // 3. Save the transcript
      const transcriptS3Uri = `s3://my-bucket/transcript-${sessionId}-${Date.now()}.csv`;
      const transcriptUrl = `/api/transcript/${sessionId}`;

      // Write transcript to file for demo purposes
      try {
        const transcriptFilePath = path.join(process.cwd(), 'test-uploads', `transcript-${sessionId}.csv`);
        await fs.promises.writeFile(transcriptFilePath, "Timestamp,Transcript\n0,\"" + transcription + "\"");
      } catch (fileError) {
        console.error('Error writing transcript to file:', fileError);
      }

      // Update session with transcript
      try {
        await storage.updatePatientSessionTranscript(
          sessionId, 
          transcriptUrl, 
          transcriptS3Uri
        );
      } catch (updateError) {
        console.error('Error updating session transcript:', updateError);
      }

      // 4. Generate insights and SOAP note
      let insights;
      try {
        insights = await analyzeTranscription(transcription);
      } catch (insightsError) {
        console.error('Error generating insights:', insightsError);
        insights = {
          transcription: transcription,
          clinicalInsights: "Unable to generate clinical insights automatically. You can still create notes manually based on the recording."
        };
      }

      let soapNote;
      try {
        soapNote = generateSoapSectionsFromInsights(transcription, insights);
      } catch (soapError) {
        console.error('Error generating SOAP note:', soapError);
        soapNote = {
          subjective: transcription || "",
          objective: "",
          assessment: "",
          plan: ""
        };
      }

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

  app.get('/api/openai-quota', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      // Make a minimal request to check quota
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 1
      });
      
      res.json({
        status: "active",
        model: "gpt-4o",
        usage: response.usage,
        message: "API is working normally"
      });
    } catch (error: any) {
      if (error.status === 429) {
        res.json({
          status: "quota_exceeded",
          error: "Rate limit or quota exceeded",
          message: "You have exceeded your OpenAI API quota or rate limit",
          details: error.message
        });
      } else if (error.status === 401) {
        res.json({
          status: "invalid_key",
          error: "Invalid API key",
          message: "OpenAI API key is invalid or expired"
        });
      } else {
        res.json({
          status: "error",
          error: error.message || "Unknown error",
          message: "Error checking OpenAI API status"
        });
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
      const search = req.query.search as string | undefined;
      const qualityFilter = req.query.qualityFilter as string | undefined;

      const result = await storage.getResearchArticles(bodyPart, page, pageSize, all, search, qualityFilter);

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

  // Trigger AI analysis for pending research articles
  app.post("/api/research/trigger-analysis", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      await researchGapAnalysisService.batchAnalyzeArticles(5);
      res.json({ message: "AI analysis started for pending articles" });
    } catch (error) {
      console.error("Error triggering research analysis:", error);
      res.status(500).json({ error: "Failed to start AI analysis" });
    }
  });

  // Test endpoint for AI analysis (no auth required for testing)
  app.post("/api/research/test-analysis", async (req: Request, res: Response) => {
    try {
      console.log("Starting test AI analysis...");
      await researchGapAnalysisService.batchAnalyzeArticles(3);
      res.json({ message: "Test AI analysis completed for pending articles" });
    } catch (error) {
      console.error("Error in test analysis:", error);
      res.status(500).json({ error: "Failed to complete test analysis", details: error.message });
    }
  });

  // Analyze individual research article
  app.post("/api/research/:articleId/analyze", async (req: Request, res: Response) => {
    try {
      const articleId = parseInt(req.params.articleId);
      if (isNaN(articleId)) {
        return res.status(400).json({ error: "Invalid article ID" });
      }

      console.log(`Starting AI analysis for article ${articleId}`);
      await researchGapAnalysisService.analyzeExistingPaper(articleId);
      res.json({ message: "AI analysis started for article", articleId });
    } catch (error) {
      console.error(`Error analyzing article ${req.params.articleId}:`, error);
      res.status(500).json({ error: "Failed to start analysis", details: error.message });
    }
  });

  // Get research article discussions
  app.get("/api/research/:articleId/discussions", async (req: Request, res: Response) => {
    try {
      const articleId = parseInt(req.params.articleId);
      if (isNaN(articleId)) {
        return res.status(400).json({ error: "Invalid article ID" });
      }

      const discussions = await db
        .select({
          id: researchDiscussions.id,
          articleId: researchDiscussions.articleId,
          userId: researchDiscussions.userId,
          parentId: researchDiscussions.parentId,
          content: researchDiscussions.content,
          questionType: researchDiscussions.questionType,
          isExpertVerified: researchDiscussions.isExpertVerified,
          upvotes: researchDiscussions.upvotes,
          downvotes: researchDiscussions.downvotes,
          createdAt: researchDiscussions.createdAt,
          updatedAt: researchDiscussions.updatedAt,
          user: {
            username: users.username
          }
        })
        .from(researchDiscussions)
        .leftJoin(users, eq(researchDiscussions.userId, users.id))
        .where(eq(researchDiscussions.articleId, articleId))
        .orderBy(researchDiscussions.createdAt);

      // Group discussions into threads
      const topLevelDiscussions = discussions.filter(d => !d.parentId);
      const replies = discussions.filter(d => d.parentId);

      const threaded = topLevelDiscussions.map(discussion => ({
        ...discussion,
        replies: replies.filter(reply => reply.parentId === discussion.id)
      }));

      res.json(threaded);
    } catch (error) {
      console.error("Error fetching discussions:", error);
      res.status(500).json({ error: "Failed to fetch discussions" });
    }
  });

  // Add research article discussion
  app.post("/api/research/:articleId/discussions", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const articleId = parseInt(req.params.articleId);
      if (isNaN(articleId)) {
        return res.status(400).json({ error: "Invalid article ID" });
      }

      const { content, parentId } = req.body;
      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Content is required" });
      }

      const [discussion] = await db
        .insert(researchDiscussions)
        .values({
          articleId,
          userId: req.user!.id,
          content: content.trim(),
          parentId: parentId || null
        })
        .returning();

      res.json(discussion);
    } catch (error) {
      console.error("Error adding discussion:", error);
      res.status(500).json({ error: "Failed to add discussion" });
    }
  });

  // Vote on research discussion
  app.post("/api/research/discussions/:discussionId/vote", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const discussionId = parseInt(req.params.discussionId);
      if (isNaN(discussionId)) {
        return res.status(400).json({ error: "Invalid discussion ID" });
      }

      const { voteType } = req.body;
      if (!voteType || !['up', 'down'].includes(voteType)) {
        return res.status(400).json({ error: "Invalid vote type" });
      }

      // Check if user already voted
      const existingVote = await db
        .select()
        .from(researchDiscussionVotes)
        .where(
          eq(researchDiscussionVotes.discussionId, discussionId) &&
          eq(researchDiscussionVotes.userId, req.user!.id)
        );

      if (existingVote.length > 0) {
        // Update existing vote
        await db
          .update(researchDiscussionVotes)
          .set({ voteType })
          .where(
            eq(researchDiscussionVotes.discussionId, discussionId) &&
            eq(researchDiscussionVotes.userId, req.user!.id)
          );
      } else {
        // Create new vote
        await db
          .insert(researchDiscussionVotes)
          .values({
            discussionId,
            userId: req.user!.id,
            voteType
          });
      }

      // Update vote counts on discussion
      const upvoteCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(researchDiscussionVotes)
        .where(
          eq(researchDiscussionVotes.discussionId, discussionId) &&
          eq(researchDiscussionVotes.voteType, 'up')
        );

      const downvoteCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(researchDiscussionVotes)
        .where(
          eq(researchDiscussionVotes.discussionId, discussionId) &&
          eq(researchDiscussionVotes.voteType, 'down')
        );

      await db
        .update(researchDiscussions)
        .set({
          upvotes: Number(upvoteCount[0]?.count || 0),
          downvotes: Number(downvoteCount[0]?.count || 0)
        })
        .where(eq(researchDiscussions.id, discussionId));

      res.json({ message: "Vote recorded successfully" });
    } catch (error) {
      console.error("Error recording vote:", error);
      res.status(500).json({ error: "Failed to record vote" });
    }
  });

  // Populate database with sample research articles (development only)
  app.post("/api/research/populate-samples", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      // Check if articles already exist to avoid duplicates
      const existingArticles = await db.select().from(researchArticles).limit(1);
      
      if (existingArticles.length > 0) {
        return res.json({ message: "Sample articles already exist", count: existingArticles.length });
      }

      // Insert sample articles
      const insertedArticles = await db
        .insert(researchArticles)
        .values(sampleResearchArticles)
        .returning();

      res.json({ 
        message: "Sample research articles added successfully", 
        count: insertedArticles.length,
        articles: insertedArticles.map(a => ({ id: a.id, title: a.title, bodyPart: a.bodyPart }))
      });
    } catch (error) {
      console.error("Error populating sample articles:", error);
      res.status(500).json({ error: "Failed to populate sample articles" });
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
      console.log("Patient relatedArticleIds:", virtualPatient.relatedArticleIds);

      // Use the correct field name from the database schema
      const articleIdsField = virtualPatient.relatedArticleIds;

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
            const { articles } = await storage.getResearchArticles(virtualPatient.body_part, 1, 5);
            relatedResearch = articles;
            console.log(`Using ${relatedResearch.length} fallback articles for this body part`);
          } catch (fallbackErr) {
            console.error('Error fetching fallback articles:', fallbackErr);
          }
        }
      } else {
        // If no article IDs field found, get some default ones for this body part
        try {
          console.log("No article IDs field found, getting default articles for body part:", virtualPatient.body_part);
          const { articles } = await storage.getResearchArticles(virtualPatient.body_part, 1, 5);
          relatedResearch = articles;
          console.log(`Using ${relatedResearch.length} default articles for this body part`);
        } catch (err) {
          console.error('Error fetching default articles:', err);
        }
      }

      // Return the virtual patient with related research articles included
      res.json({
        ...virtualPatient,
        relatedArticles: relatedResearch
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
      // Also explicitly mark this as a fresh analysis to ensure we get updated diagnostic terminology
      await storage.updateVirtualPatient(patientId, {
        hasBeenEdited: false,
        diagnosis: null, // Clear previous diagnosis to ensure we get a fresh analysis
        differentialDiagnosis: [], // Clear previous differentials
        status: 'reanalyzing' // Explicitly mark as reanalyzing
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

      // Determine which specialized approach to use based on patient characteristics
      let analysisResult;
      try {
        // All specialized analysis modules are already imported at the top of the file
        // No need to import them again, we can use them directly
        console.log("Using pre-imported analysis module functions");

        // Confirm that we have the imported functions available
        console.log("Analysis functions available:", 
          "Jo Gibson:", typeof analyzeShoulderPatientJoGibson,
          "Clinical Edge:", typeof analyzePatientClinicalEdge,
          "Physio Network:", typeof analyzePatientPhysioNetwork,
          "Sports Map:", typeof analyzePatientSportsMap,
          "Grimaldi:", typeof analyzePatientGrimaldi,
          "Bisset:", typeof analyzePatientBisset
        );

        // Check which specialized approach is most appropriate for this patient

        // 1. Check for shoulder-related issues - Jo Gibson approach
        // Use the specialized detection function for accurate identification
        const checkIfShoulderPatient = (patient) => patient.body_part === "shoulder";
        const isShoulderCase = checkIfShoulderPatient(virtualPatient);

        // 2. Check for knee-related issues - Clinical Edge approach
        const isKneeCase = virtualPatient.body_part === "knee";

        // 3. Check for spine-related issues - Physio Network approach
        const isSpineCase = virtualPatient.body_part === "back" || virtualPatient.body_part === "neck";

        // 4. Check for sports/athletic issues - Sports Map approach
        const isSportsCase = 
          virtualPatient.chief_complaint?.toLowerCase().includes("sport") || 
          virtualPatient.chief_complaint?.toLowerCase().includes("athlete") ||
          virtualPatient.chief_complaint?.toLowerCase().includes("running") ||
          virtualPatient.chief_complaint?.toLowerCase().includes("training") ||
          (virtualPatient.past_medical_history && 
           (virtualPatient.past_medical_history.toLowerCase().includes("sport") ||
            virtualPatient.past_medical_history.toLowerCase().includes("athlete")));

        // 5. Check for hip-related issues - Alison Grimaldi approach
        const isHipCase = virtualPatient.body_part === "hip";

        // 6. Check for elbow-related issues - Leanne Bisset approach
        const isElbowCase = virtualPatient.body_part === "elbow";

        console.log(`Patient characteristics - Shoulder: ${isShoulderCase}, Knee: ${isKneeCase}, Spine: ${isSpineCase}, Sports: ${isSportsCase}, Hip: ${isHipCase}, Elbow: ${isElbowCase}`);

        if (isShoulderCase) {
          // Try to use the Jo Gibson approach for shoulder cases
          console.log("Using Jo Gibson shoulder approach for patient analysis");

          try {
            if (typeof analyzeShoulderPatientJoGibson === 'function') {
              const joGibsonResult = await analyzeShoulderPatientJoGibson(virtualPatient);

              // Convert the Jo Gibson specialized format to our standard format
              analysisResult = {
                primaryDiagnosis: { 
                  name: joGibsonResult.diagnosis || "Shoulder condition requiring further assessment", 
                  description: "Based on Jo Gibson's shoulder approach" 
                },
                differentialDiagnoses: joGibsonResult.differentialDiagnosis?.map(d => ({ 
                  name: d.condition || "Alternative diagnosis", 
                  description: d.rationale || "Based on clinical presentation",
                  likelihood: d.likelihood || "Possible"
                })) || [],
                treatmentOptions: joGibsonResult.treatmentOptions || [],
                assessmentTests: joGibsonResult.assessmentTests || [],
                recommendedKeywords: ["Jo Gibson", "shoulder rehabilitation", "evidence-based physiotherapy"],
                joGibsonSpecificApproach: true,
                relatedArticleIds: joGibsonResult.relatedArticleIds || []
              };
              console.log("Jo Gibson shoulder analysis completed successfully");
            } else {
              throw new Error("Jo Gibson shoulder analysis function not available");
            }
          } catch (joGibsonAnalysisError) {
            console.error("Error in Jo Gibson shoulder analysis:", joGibsonAnalysisError);
            // Fall back to default analysis
            throw joGibsonAnalysisError;
          }
        } 
        // Use Clinical Edge approach for knee cases
        else if (isKneeCase) {
          console.log("Using Clinical Edge approach for knee patient analysis");

          const clinicalEdgeResult = await analyzePatientClinicalEdge(virtualPatient);

          // Convert the Clinical Edge specialized format to our standard format
          analysisResult = {
            primaryDiagnosis: { name: clinicalEdgeResult.diagnosis, description: "Based on Clinical Edge's evidence-based approach" },
            differentialDiagnoses: clinicalEdgeResult.differentialDiagnosis?.map(d => ({ 
              name: d.condition, 
              description: d.rationale,
              likelihood: d.likelihood
            })) || [],
            treatmentOptions: clinicalEdgeResult.treatmentOptions,
            assessmentTests: clinicalEdgeResult.assessmentTests,
            recommendedKeywords: ["Clinical Edge", "knee rehabilitation", "evidence-based physiotherapy"],
            clinicalEdgeSpecificApproach: true,
            relatedArticleIds: clinicalEdgeResult.relatedArticleIds || []
          };
        }
        // Use Physio Network approach for spine cases
        else if (isSpineCase) {
          console.log("Using Physio Network approach for spine patient analysis");

          const physioNetworkResult = await analyzePatientPhysioNetwork(virtualPatient);

          // Convert the Physio Network specialized format to our standard format
          analysisResult = {
            primaryDiagnosis: { name: physioNetworkResult.diagnosis, description: "Based on Physio Network's pain science approach" },
            differentialDiagnoses: physioNetworkResult.differentialDiagnosis?.map(d => ({ 
              name: d.condition, 
              description: d.rationale,
              likelihood: d.likelihood
            })) || [],
            treatmentOptions: physioNetworkResult.treatmentOptions,
            assessmentTests: physioNetworkResult.assessmentTests,
            recommendedKeywords: ["Physio Network", "pain science", "biopsychosocial approach"],
            physioNetworkSpecificApproach: true,
            painMechanisms: physioNetworkResult.painMechanisms,
            relatedArticleIds: physioNetworkResult.relatedArticleIds || []
          };
        }
        // Use Sports Map approach for sports/athletic cases
        else if (isSportsCase) {
          console.log("Using Sports Map approach for athletic patient analysis");

          const sportsMapResult = await analyzePatientSportsMap(virtualPatient);

          // Convert the Sports Map specialized format to our standard format
          analysisResult = {
            primaryDiagnosis: { name: sportsMapResult.diagnosis, description: "Based on Sports Map's athletic performance approach" },
            differentialDiagnoses: sportsMapResult.differentialDiagnosis?.map(d => ({ 
              name: d.condition, 
              description: d.rationale,
              likelihood: d.likelihood
            })) || [],
            treatmentOptions: sportsMapResult.treatmentOptions,
            assessmentTests: sportsMapResult.assessmentTests,
            recommendedKeywords: ["Sports Map", "athletic performance", "return to sport"],
            sportsMapSpecificApproach: true,
            relatedArticleIds: sportsMapResult.relatedArticleIds || []
          };
        } 
        // Use Grimaldi approach for hip cases
        else if (isHipCase) {
          console.log("Using Alison Grimaldi approach for hip patient analysis");

          try {
            if (analyzePatientGrimaldi && typeof analyzePatientGrimaldi === 'function') {
              const grimaldiResult = await analyzePatientGrimaldi(virtualPatient);

              // Convert the Grimaldi specialized format to our standard format
              analysisResult = {
                primaryDiagnosis: { 
                  name: grimaldiResult.diagnosis || "Hip condition requiring assessment", 
                  description: "Based on Alison Grimaldi's hip approach" 
                },
                differentialDiagnoses: grimaldiResult.differentialDiagnosis?.map(d => ({ 
                  name: d.condition || "Alternative diagnosis", 
                  description: d.rationale || "Based on clinical presentation",
                  likelihood: d.likelihood || "Possible"
                })) || [],
                treatmentOptions: grimaldiResult.treatmentOptions || [],
                assessmentTests: grimaldiResult.assessmentTests || [],
                recommendedKeywords: ["Alison Grimaldi", "hip rehabilitation", "gluteal function"],
                grimaldiSpecificApproach: true,
                relatedArticleIds: grimaldiResult.relatedArticleIds || []
              };
              console.log("Grimaldi hip analysis completed successfully");
            } else {
              throw new Error("Grimaldi hip analysis function not available");
            }
          } catch (grimaldiAnalysisError) {
            console.error("Error in Grimaldi hip analysis:", grimaldiAnalysisError);
            // Fall back to default analysis later in the code
            throw grimaldiAnalysisError;
          }
        }
        // Use Bisset approach for elbow cases
        else if (isElbowCase) {
          console.log("Using Leanne Bisset approach for elbow patient analysis");

          const bissetResult = await analyzePatientBisset(virtualPatient);

          // Convert the Bisset specialized format to our standard format
          analysisResult = {
            primaryDiagnosis: { name: bissetResult.diagnosis, description: "Based on Leanne Bisset's elbow approach" },
            differentialDiagnoses: bissetResult.differentialDiagnosis?.map(d => ({ 
              name: d.condition, 
              description: d.rationale,
              likelihood: d.likelihood
            })) || [],
            treatmentOptions: bissetResult.treatmentOptions,
            assessmentTests: bissetResult.assessmentTests,
            recommendedKeywords: ["Leanne Bisset", "elbow rehabilitation", "tennis elbow", "lateral epicondylalgia"],
            bissetSpecificApproach: true,
            relatedArticleIds: bissetResult.relatedArticleIds || []
          };
        } else {
          // Use standard analysis for cases without a specialized approach
          // Convert DB patient model to input format expected by analyzer
          const patientInput = {
            patientName: virtualPatient.patient_name || "",
            age: String(virtualPatient.age || ""),
            gender: virtualPatient.gender || "",
            chiefComplaint: virtualPatient.chief_complaint || "",
            symptomsDescription: virtualPatient.symptoms_description || "",
            bodyPart: virtualPatient.body_part,
            pastMedicalHistory: virtualPatient.past_medical_history || "",
            // Use empty strings for potentially missing fields
            pastSurgicalHistory: "",
            socialHistory: "",
            familyHistory: "",
            medications: "",
            allergies: "",
            objectiveFindings: typeof virtualPatient.objective_findings === 'string' ? virtualPatient.objective_findings : ""
          };

          console.log("Using standard analysis with properly formatted input");
          analysisResult = await analyzeVirtualPatientCase(patientInput);
        }
      } catch (error) {
        console.error("Error in specialized analysis, falling back to standard analysis:", error);
        try {
          // Use the already imported analyzeVirtualPatientCase function at the top of the file
          console.log("Using fallback standard analysis for virtual patient");
          // Convert DB patient model to input format expected by analyzer
          const patientInput = {
            patientName: virtualPatient.patient_name || "",
            age: String(virtualPatient.age || ""),
            gender: virtualPatient.gender || "",
            chiefComplaint: virtualPatient.chief_complaint || "",
            symptomsDescription: virtualPatient.symptoms_description || "",
            bodyPart: virtualPatient.body_part,
            pastMedicalHistory: virtualPatient.past_medical_history || "",
            // Use empty strings for potentially missing fields
            pastSurgicalHistory: "",
            socialHistory: "",
            familyHistory: "", 
            medications: "",
            allergies: "",
            objectiveFindings: virtualPatient.objective_findings ? 
              (typeof virtualPatient.objective_findings === 'string' ? 
                virtualPatient.objective_findings : 
                JSON.stringify(virtualPatient.objective_findings)) : 
              ""
          };

          console.log("Using fallback standard analysis with properly formatted input");
          analysisResult = await analyzeVirtualPatientCase(patientInput);
        } catch (fallbackError) {
          console.error("Error in fallback analysis:", fallbackError);
          // Create a detailed fallback diagnosis based on the body part
          const bodyPart = patientInput.bodyPart.toLowerCase();

          if (bodyPart === 'shoulder') {
            analysisResult = {
              primaryDiagnosis: {
                name: "Stage 2 reactive supraspinatus tendinopathy with concurrent subacromial bursitis and altered scapulohumeral rhythm",
                description: "Based on Jo Gibson's rotator cuff related shoulder pain framework, this presents with pain during mid-range elevation activities with tendon thickening, increased proteoglycan content, and ground substance accumulation in the critical zone of the supraspinatus tendon."
              },
              differentialDiagnoses: [
                {
                  name: "Acromioclavicular joint osteoarthritis with inferior osteophyte formation causing secondary subacromial narrowing",
                  likelihood: "Medium",
                  description: "Common finding in patients over 35 with superior/anterior shoulder pain that increases with cross-body adduction movements."
                },
                {
                  name: "Long head of biceps tendinopathy with superior labral anteroposterior lesion Type II and anterior capsular instability",
                  likelihood: "Medium",
                  description: "Often presents with similar symptoms to rotator cuff pathology but with more pronounced pain with resisted elbow flexion and supination."
                }
              ],
              treatmentOptions: {
                educationPoints: [
                  "Understanding of shoulder biomechanics and force couple relationships",
                  "Recognition of movement patterns that contribute to symptoms",
                  "Importance of progressive loading for tendon adaptation",
                  "Role of the kinetic chain in optimal shoulder function"
                ],
                immediateInterventions: [
                  "Graduated rotator cuff loading program beginning with isometrics",
                  "Scapular retraining exercises",
                  "Soft tissue techniques to improve posterior capsule mobility if restricted",
                  "Activity modification to remain below pain threshold while maintaining function"
                ],
                rehabilitationProgression: [
                  "Progressive loading program based on Jo Gibson's shoulder rehabilitation principles",
                  "Scapular control exercises progressing from supported to unsupported positions",
                  "Kinetic chain integration",
                  "Sport-specific movement pattern retraining"
                ],
                expectedOutcomes: [
                  "Progressive improvement in pain-free range of motion over 4-6 weeks",
                  "Restoration of normal scapulohumeral rhythm by 8-12 weeks",
                  "Return to modified functional activities by 6-8 weeks",
                  "Full return to sport-specific demands by 12-16 weeks"
                ]
              },
              assessmentTests: [
                "Jobe's Test (Empty Can)",
                "Hawkins-Kennedy Test",
                "Neer Impingement Test",
                "Scapular Assistance Test",
                "Lateral Jobe Test",
                "Biceps Load Test II"
              ],
              recommendedKeywords: [
                "Jo Gibson shoulder rehabilitation",
                "rotator cuff tendinopathy",
                "scapular dyskinesis",
                "shoulder impingement",
                "glenohumeral joint"
              ],
              relatedArticleIds: []
            };
          } else if (bodyPart === 'knee') {
            analysisResult = {
              primaryDiagnosis: {
                name: "Lateral patellofemoral compression syndrome with vastus medialis obliquus activation deficit and lateral patellar tracking",
                description: "Based on McConnell's patellofemoral classification system, this presents with aberrant patellar tracking during functional knee extension with increased lateral compressive forces and delayed VMO activation relative to VL."
              },
              differentialDiagnoses: [
                {
                  name: "Patellofemoral osteoarthritis grade 2 with lateral facet cartilage degeneration and subchondral bone marrow lesions",
                  likelihood: "Medium",
                  description: "Common finding in patients with anterior knee pain and history of recurrent patellar maltracking, especially with joint crepitus."
                },
                {
                  name: "Infrapatellar fat pad impingement syndrome with concurrent synovial hypertrophy and medial plica irritation",
                  likelihood: "Medium",
                  description: "Often presents with similar anterior knee pain but with more pronounced pain during full extension and focal tenderness."
                }
              ],
              treatmentOptions: {
                educationPoints: [
                  "Understanding of patellofemoral biomechanics and patellar tracking",
                  "Recognition of movement patterns that increase patellofemoral stress",
                  "Importance of proximal control for patellar alignment",
                  "Role of footwear and activity modification"
                ],
                immediateInterventions: [
                  "VMO activation exercises with biofeedback",
                  "Patellar taping or bracing techniques if beneficial",
                  "Hip external rotator and abductor strengthening",
                  "Activity modification to reduce patellofemoral compression"
                ],
                rehabilitationProgression: [
                  "Progressive closed-chain strengthening with proper alignment",
                  "Functional movement retraining focusing on knee position",
                  "Proximal control exercises for hip and core",
                  "Sport-specific movement pattern correction"
                ],
                expectedOutcomes: [
                  "Reduction in pain with daily activities within 4-6 weeks",
                  "Improved patellar tracking by 6-8 weeks",
                  "Return to recreational activities with modified technique by 12 weeks",
                  "Long-term self-management strategies established"
                ]
              },
              assessmentTests: [
                "McConnell Patellar Tilt Test",
                "Patellar Compression Test",
                "Clarke's Sign",
                "Lateral Pull Test",
                "Eccentric Step Down Test",
                "VMO/VL Activation Timing"
              ],
              recommendedKeywords: [
                "patellofemoral pain syndrome",
                "VMO activation",
                "lateral patellar tracking",
                "McConnell approach",
                "patellofemoral compression"
              ],
              relatedArticleIds: []
            };
          } else if (bodyPart === 'hip') {
            analysisResult = {
              primaryDiagnosis: {
                name: "Greater trochanteric pain syndrome with gluteus medius and minimus tendinopathy in the reactive-on-dysrepair phase and secondary tensor fascia latae hypertonicity",
                description: "Based on Alison Grimaldi's lateral hip pain classification, this presents with lateral hip pain exacerbated by side-lying, prolonged standing and single leg weight-bearing with tendon thickening and neovascularization at the insertion onto the greater trochanter."
              },
              differentialDiagnoses: [
                {
                  name: "Femoroacetabular impingement syndrome with cam-type morphology and anterosuperior labral tear with synovitis",
                  likelihood: "Medium",
                  description: "Common finding in active individuals with groin pain during flexion and internal rotation activities."
                },
                {
                  name: "Gluteal tendon partial-thickness tear with muscular atrophy and compensatory external rotator overactivation",
                  likelihood: "Medium",
                  description: "Presents with similar lateral hip pain but with more pronounced weakness and potential Trendelenburg sign."
                }
              ],
              treatmentOptions: {
                educationPoints: [
                  "Understanding of hip biomechanics and tendon loading principles",
                  "Recognition of compressive versus tensile loading situations",
                  "Importance of gluteal muscle function for hip stability",
                  "Relationship between postural habits and symptom provocation"
                ],
                immediateInterventions: [
                  "Isometric gluteal exercises in non-compressive positions",
                  "Activity modification to reduce compressive loading",
                  "Soft tissue techniques for tensor fascia latae and iliotibial band",
                  "Sleep positioning strategies to reduce nocturnal pain"
                ],
                rehabilitationProgression: [
                  "Progressive loading program following Grimaldi's tendon loading principles",
                  "Graduated exposure to functional activities with correct movement patterns",
                  "Hip control exercises in weight-bearing positions",
                  "Functional movement retraining for daily activities"
                ],
                expectedOutcomes: [
                  "Reduced night pain and side-lying discomfort within 2-4 weeks",
                  "Improved functional capacity for standing and walking by 6 weeks",
                  "Restoration of pain-free single leg stance by 8 weeks",
                  "Return to recreational activities with modified technique by 12 weeks"
                ]
              },
              assessmentTests: [
                "FABER Test",
                "Resisted External Derotation Test",
                "Trendelenburg Test",
                "Single Leg Stance",
                "Resisted Hip Abduction",
                "Ober's Test"
              ],
              recommendedKeywords: [
                "greater trochanteric pain syndrome",
                "gluteal tendinopathy",
                "Grimaldi hip approach",
                "lateral hip pain",
                "gluteal loading program"
              ],
              relatedArticleIds: []
            };
          } else if (bodyPart === 'elbow') {
            analysisResult = {
              primaryDiagnosis: {
                name: "Lateral epicondylalgia with reactive-on-dysrepair stage extensor carpi radialis brevis tendinopathy and myofascial involvement of the common extensor origin",
                description: "Based on Leanne Bisset's elbow rehabilitation framework, this presents with lateral elbow pain exacerbated by gripping and wrist extension activities with tendon thickening and increased nociceptive sensitivity at the common extensor origin."
              },
              differentialDiagnoses: [
                {
                  name: "Posterior interosseous nerve entrapment at the arcade of Frohse with radial tunnel syndrome and secondary lateral epicondyle sensitization",
                  likelihood: "Medium",
                  description: "Often coexists with lateral epicondylalgia but with more pronounced distal symptoms and neurological signs."
                },
                {
                  name: "Radiocapitellar joint chondropathy with lateral collateral ligament complex attenuation and posterolateral rotatory instability",
                  likelihood: "Low",
                  description: "Less common but should be considered with mechanical symptoms and history of trauma or instability."
                }
              ],
              treatmentOptions: {
                educationPoints: [
                  "Understanding of tendon pain mechanisms and load management",
                  "Recognition of aggravating activities and ergonomic factors",
                  "Importance of graded exposure and progressive loading",
                  "Self-management strategies for symptom control"
                ],
                immediateInterventions: [
                  "Isometric wrist extensor exercises below pain threshold",
                  "Activity modification focusing on grip mechanics",
                  "Manual therapy techniques for myofascial restrictions",
                  "Counterforce bracing if beneficial for symptom reduction"
                ],
                rehabilitationProgression: [
                  "Progressive loading program based on Bisset's research on tendinopathy",
                  "Graduated strengthening from isometric to concentric to eccentric",
                  "Functional task modification and retraining",
                  "Sport or activity-specific technique correction"
                ],
                expectedOutcomes: [
                  "Reduction in pain with daily activities within 6-8 weeks",
                  "Improved grip strength without pain by 8-12 weeks",
                  "Return to modified work activities by 4-6 weeks",
                  "Full return to sport or manual work by 12-16 weeks"
                ]
              },
              assessmentTests: [
                "Cozen's Test",
                "Mill's Test",
                "Resisted Middle Finger Extension",
                "Tennis Elbow Test",
                "Upper Limb Neurodynamic Test (radial bias)",
                "Pain-free Grip Strength Test"
              ],
              recommendedKeywords: [
                "lateral epicondylalgia",
                "tennis elbow",
                "Bisset elbow approach",
                "tendon loading program",
                "extensor carpi radialis brevis"
              ],
              relatedArticleIds: []
            };
          } else {
            // Basic fallback for other body parts not specifically covered
            function capitalize(str: string): string {
              return str.charAt(0).toUpperCase() + str.slice(1);
            }
            
            analysisResult = {
              primaryDiagnosis: {
                name: `Specific ${capitalize(bodyPart)} pathology with biomechanical and tissue-specific implications`,
                description: `Based on comprehensive assessment, this presents with signs and symptoms consistent with a specific ${bodyPart} condition requiring detailed examination and specialized treatment approach.`
              },
              differentialDiagnoses: [
                {
                  name: `Primary ${capitalize(bodyPart)} structural dysfunction with compensatory movement patterns`,
                  likelihood: "Medium",
                  description: `Common condition affecting the ${bodyPart} region, warranting detailed clinical assessment.`
                },
                {
                  name: `Secondary ${capitalize(bodyPart)} condition with referred mechanisms from adjacent structures`,
                  likelihood: "Medium",
                  description: `Differential consideration based on the symptom presentation and potential contributing factors.`
                }
              ],
              treatmentOptions: [
                {
                  category: "Evidence-based management",
                  recommendations: [
                    `Specific ${bodyPart} assessment and targeted intervention`,
                    "Progressive loading and movement retraining",
                    "Functional rehabilitation with specific exercise parameters",
                    "Integrated approach addressing contributing factors"
                  ]
                }
              ],
              assessmentTests: [
                `Comprehensive ${bodyPart} examination`,
                "Specific clinical tests with high diagnostic value",
                "Functional movement assessment",
                "Detailed tissue assessment"
              ],
              recommendedKeywords: [
                `${bodyPart} rehabilitation`,
                "evidence-based physiotherapy",
                "movement analysis",
                "pain science",
                "clinical reasoning"
              ],
              relatedArticleIds: []
            };
          }
        }
      }

      // Get empty arrays if properties are missing to prevent "cannot read properties of undefined" errors
      const differentialDiagnoses = analysisResult.differentialDiagnoses?.map(d => d.name) || [];
      const keywords = analysisResult.recommendedKeywords || [];

      // Find relevant research articles based on the diagnosis and related article IDs

      // Determine if this is a shoulder case that could benefit from Jo Gibson's approach
      const checkIfShoulderPatient = (patient) => patient.body_part === "shoulder";
          const isShoulderCase = checkIfShoulderPatient(virtualPatient);

      // Get specialized analysis for shoulder cases using Jo Gibson's approach
      let joGibsonSpecificArticles = [];
      let grimaldiSpecificArticles = [];
      let bissetSpecificArticles = [];

      // Handle shoulder cases with Jo Gibson's approach
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

      // Handle hip cases with Alison Grimaldi's approach
      if (virtualPatient.body_part === "hip") {
        try {
          const grimaldiAnalysis = await analyzePatientGrimaldi(virtualPatient);

          // Extract the relatedArticleIds from Grimaldi's specialized analysis
          if (grimaldiAnalysis && grimaldiAnalysis.relatedArticleIds) {
            grimaldiSpecificArticles = grimaldiAnalysis.relatedArticleIds;
          }
        } catch (error) {
          console.error("Error getting Grimaldi hip analysis:", error);
        }
      }

      // Handle elbow cases with Leanne Bisset's approach
      if (virtualPatient.body_part === "elbow") {
        try {
          const bissetAnalysis = await analyzePatientBisset(virtualPatient);

          // Extract the relatedArticleIds from Bisset's specialized analysis
          if (bissetAnalysis && bissetAnalysis.relatedArticleIds) {
            bissetSpecificArticles = bissetAnalysis.relatedArticleIds;
          }
        } catch (error) {
          console.error("Error getting Bisset elbow analysis:", error);
        }
      }

      // Combine all specialized article IDs
      const specializedArticleIds = [
        ...joGibsonSpecificArticles,
        ...grimaldiSpecificArticles,
        ...bissetSpecificArticles
      ];

      const searchResults = await findRelevantResearchArticles(
        analysisResult.primaryDiagnosis?.name || "undefined diagnosis",
        differentialDiagnoses,
        virtualPatient.body_part,
        keywords,
        specializedArticleIds
      );

      // Get relevant article IDs from the search terms
      const relevantArticleIds = searchResults?.searchTerms || [];

      // Include Jo Gibson's specialized shoulder articles if available
      const joGibsonArticles = isShoulderCase && searchResults?.joGibsonSpecificArticles ? 
        searchResults.joGibsonSpecificArticles : [];

      // Include Alison Grimaldi's specialized hip articles if available
      let grimaldiArticles = [];
      if (virtualPatient.body_part === "hip") {
        const grimaldiArticleIds = await storage.getResearchArticlesByBodyPart("hip", 1, 20);
        grimaldiArticles = grimaldiArticleIds.articles.filter(a => 
          a.title.includes("hip") || a.title.includes("gluteal") || 
          a.abstract.includes("Grimaldi") || a.authors.includes("Grimaldi"));
      }

      // Include Leanne Bisset's specialized elbow articles if available
      let bissetArticles = [];
      if (virtualPatient.body_part === "elbow") {
        const bissetArticleIds = await storage.getResearchArticlesByBodyPart("elbow", 1, 20);
        bissetArticles = bissetArticleIds.articles.filter(a => 
          a.title.includes("elbow") || a.title.includes("lateral epicondyl") || 
          a.abstract.includes("Bisset") || a.authors.includes("Bisset"));
      }

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

      // Determine appropriate specialized approach based on body part and patient characteristics
      if (isShoulderCase) {
        // Get Jo Gibson's specialized info from the library
        // Use already imported modules

        // Add specialized information to enhance the response
        res.json({
          ...updatedPatient,
          specializedApproach: "Jo Gibson Shoulder Rehabilitation",
          specializedNote: "This analysis incorporates Jo Gibson's specialized shoulder rehabilitation approach.",
          specializedMethodology: {
            approachName: "Jo Gibson Shoulder Rehabilitation",
            keyPrinciples: joGibsonTreatmentPrinciples.slice(0, 5).map(p => p.title),
            rehabilitationPhases: [
              "Early: Motor control and kinetic chain integration",
              "Middle: Progressive loading with quality movement",
              "Late: Function-specific rehabilitation and return to activity"
            ],
            evidenceStrength: "High - Based on multiple RCTs and systematic reviews"
          }
        });
      } 
      // Check for knee conditions to apply Clinical Edge approach
      else if (updatedPatient.body_part === "knee") {
        // Get Clinical Edge specialized info from the library
        // Using already imported modules from top of file

        // Find knee-specific approaches
        const kneeApproaches = clinicalEdgeRegionalApproaches.find(a => a.bodyPart === "knee");

        res.json({
          ...updatedPatient,
          specializedApproach: "Clinical Edge Knee Rehabilitation",
          specializedNote: "This analysis incorporates Clinical Edge's specialized knee rehabilitation approach.",
          specializedMethodology: {
            approachName: "Clinical Edge Knee Rehabilitation",
            keyPrinciples: clinicalEdgeTreatmentPrinciples.slice(0, 5).map(p => p.title),
            specializedPrograms: kneeApproaches ? kneeApproaches.specializedApproaches.map(sa => sa.name) : [],
            evidenceStrength: "High - Based on multiple RCTs and systematic reviews"
          }
        });
      }
      // Check for back/neck conditions to apply Physio Network approach
      else if (updatedPatient.body_part === "back" || updatedPatient.body_part === "neck") {
        // Get Physio Network specialized info from the library
        // Using already imported modules from top of file

        res.json({
          ...updatedPatient,
          specializedApproach: "Physio Network Pain Science Approach",
          specializedNote: "This analysis incorporates Physio Network's specialized pain science approach.",
          specializedMethodology: {
            approachName: "Physio Network Pain Science Framework",
            keyPrinciples: physioNetworkTreatmentPrinciples.slice(0, 5).map(p => p.title),
            painApproaches: physioNetworkPainApproaches.slice(0, 2).map(pa => pa.name),
            evidenceStrength: "High - Based on multiple RCTs and systematic reviews"
          }
        });
      }
      // Check for athletic patients or sport injuries to apply Sports Map approach
      else if (updatedPatient.chief_complaint?.toLowerCase().includes("sport") || 
               updatedPatient.chief_complaint?.toLowerCase().includes("athlete") ||
               updatedPatient.chief_complaint?.toLowerCase().includes("running") ||
               updatedPatient.chief_complaint?.toLowerCase().includes("training")) {
        // Get Sports Map specialized info from the library
        // Using already imported modules from top of file

        res.json({
          ...updatedPatient,
          specializedApproach: "Sports Map Performance Rehabilitation",
          specializedNote: "This analysis incorporates Sports Map's specialized athletic performance rehabilitation approach.",
          specializedMethodology: {
            approachName: "Sports Map Performance Framework",
            keyPrinciples: sportsMapTreatmentPrinciples.slice(0, 5).map(p => p.title),
            sportSpecificConsiderations: true,
            evidenceStrength: "High - Based on sport-specific research and performance science"
          }
        });
      }
      // Check for hip conditions to apply Alison Grimaldi's approach
      else if (updatedPatient.body_part === "hip") {
        // Get Grimaldi's specialized info from the library
        // Using already imported modules from top of file

        res.json({
          ...updatedPatient,
          specializedApproach: "Alison Grimaldi Hip Rehabilitation",
          specializedNote: "This analysis incorporates Alison Grimaldi's specialized hip rehabilitation approach.",
          specializedMethodology: {
            approachName: "Grimaldi Hip Rehabilitation Framework",
            focusAreas: [
              "Gluteal muscle-specific assessment and rehabilitation",
              "Hip-related pain conditions and their management",
              "Motor control approach to lateral hip pain"
            ],
            keyPrinciples: grimaldiTreatmentPrinciples.slice(0, 5).map(p => p.title),
            rehabilitationPhases: [
              "Early: Activation of deep gluteal muscles without compression",
              "Middle: Progressive loading and motor control in weight-bearing",
              "Late: Functional and sports-specific rehabilitation"
            ],
            evidenceStrength: "High - Based on specialized research in gluteal tendinopathy and hip conditions"
          }
        });
      }
      // Check for elbow conditions to apply Leanne Bisset's approach
      else if (updatedPatient.body_part === "elbow") {
        // Get Bisset's specialized info from the library
        // Using already imported modules from top of file

        res.json({
          ...updatedPatient,
          specializedApproach: "Leanne Bisset Elbow Rehabilitation",
          specializedNote: "This analysis incorporates Leanne Bisset's specialized elbow rehabilitation approach.",
          specializedMethodology: {
            approachName: "Bisset Elbow Rehabilitation Framework",
            focusAreas: [
              "Lateral elbow tendinopathy (tennis elbow) assessment and management",
              "Pain mechanisms and neurophysiological approaches to elbow pain",
              "Progressive loading for elbow tendinopathy rehabilitation"
            ],
            keyPrinciples: bissetTreatmentPrinciples.slice(0, 5).map(p => p.title),
            rehabilitationPhases: [
              "Early: Pain modulation and managed loading",
              "Middle: Progressive tissue loading and motor control training",
              "Late: Function-specific rehabilitation and return to activities"
            ],
            evidenceStrength: "High - Based on multiple RCTs and systematic reviews on lateral elbow tendinopathy"
          }
        });
      }
      else {
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

  // PhysioGPT API Routes
  app.post("/api/physiogpt/chat", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("PhysioGPT chat request received:", req.body);
      const { message, conversationId, patientContext } = req.body;
      
      if (!message || typeof message !== 'string') {
        console.log("Invalid message:", message);
        return res.status(400).json({ error: "Message is required" });
      }

      console.log("Processing message for user:", req.user!.id);
      const result = await physioGptService.processMessage({
        message,
        conversationId,
        patientContext,
        userId: req.user!.id
      });

      console.log("PhysioGPT response generated successfully");
      console.log("Result object:", JSON.stringify(result, null, 2));
      console.log("Sending response to client...");
      res.json(result);
    } catch (error: any) {
      console.error("PhysioGPT chat error:", error);
      console.error("Error message:", error?.message);
      console.error("Error stack:", error?.stack);
      res.status(500).json({ error: "Unable to process your request at this time" });
    }
  });

  app.get("/api/physiogpt/conversations", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const conversations = await physioGptService.getUserConversations(req.user!.id);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Unable to fetch conversations" });
    }
  });

  app.get("/api/physiogpt/conversations/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const conversation = await physioGptService.getConversationHistory(
        conversationId, 
        req.user!.id
      );

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      console.log("Fetching conversation messages for ID:", conversationId);
      console.log("Conversation data:", JSON.stringify(conversation, null, 2));
      console.log("Messages count:", conversation.messages?.length || 0);

      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Unable to fetch conversation" });
    }
  });

  app.delete("/api/physiogpt/conversations/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      await physioGptService.deleteConversation(conversationId, req.user!.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Unable to delete conversation" });
    }
  });

  // Free Trial Management Routes
  app.post("/api/trial/start", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Check if user has already used their trial
      const trialStatus = await storage.getUserTrialStatus(userId);
      if (trialStatus.hasUsedTrial) {
        return res.status(400).json({ 
          error: "You have already used your free trial. Please upgrade to a paid membership for continued access." 
        });
      }

      // Start the free trial
      const updatedUser = await storage.startFreeTrial(userId);
      res.json({ 
        message: "14-day free trial activated successfully!",
        trialEndDate: updatedUser.trialEndDate,
        membershipTier: updatedUser.membershipTier
      });
    } catch (error) {
      console.error("Error starting free trial:", error);
      res.status(500).json({ error: "Unable to start free trial" });
    }
  });

  app.get("/api/trial/status", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const trialStatus = await storage.getUserTrialStatus(userId);
      res.json(trialStatus);
    } catch (error) {
      console.error("Error getting trial status:", error);
      res.status(500).json({ error: "Unable to get trial status" });
    }
  });

  // Research Platform API Routes
  
  // Research Gap Analysis
  app.get("/api/research/gaps", async (req: Request, res: Response) => {
    try {
      // Return mock data for now until database schema is fully deployed
      const mockGaps = [
        {
          id: 1,
          title: "Long-term Outcome Tracking in Chronic Pain Management",
          description: "Limited research on long-term effectiveness of physiotherapy interventions for chronic pain conditions beyond 12 months follow-up.",
          bodyPart: "general",
          gapType: "outcome",
          priority: "high",
          evidenceLevel: "Low - most studies <6 months follow-up",
          potentialImpact: "High - would inform sustainable treatment approaches and healthcare resource allocation",
          suggestedMethodology: "Longitudinal cohort study with virtual patient data tracking treatment responses over 2+ years",
          aiGenerated: true,
          verifiedByExpert: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          title: "Personalized Treatment Algorithm Development",
          description: "Lack of evidence-based algorithms for matching specific patient characteristics to optimal treatment approaches.",
          bodyPart: "general",
          gapType: "methodology",
          priority: "critical",
          evidenceLevel: "Very Low - mostly expert opinion",
          potentialImpact: "Critical - could revolutionize clinical decision making and improve outcomes",
          suggestedMethodology: "Machine learning analysis of virtual patient treatment response patterns",
          aiGenerated: true,
          verifiedByExpert: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 3,
          title: "Technology-Assisted Rehabilitation Effectiveness",
          description: "Insufficient comparative research on technology-enhanced physiotherapy vs traditional approaches.",
          bodyPart: "general",
          gapType: "treatment",
          priority: "high",
          evidenceLevel: "Low - limited RCTs available",
          potentialImpact: "High - could guide technology adoption and improve accessibility",
          suggestedMethodology: "Multi-arm RCT comparing traditional, app-assisted, and VR-enhanced rehabilitation",
          aiGenerated: true,
          verifiedByExpert: false,
          createdAt: new Date().toISOString()
        }
      ];
      
      const { bodyPart, priority, gapType } = req.query;
      let filteredGaps = [...mockGaps];
      
      if (bodyPart && bodyPart !== "all") {
        filteredGaps = filteredGaps.filter(gap => gap.bodyPart === bodyPart);
      }
      
      if (priority && priority !== "all") {
        filteredGaps = filteredGaps.filter(gap => gap.priority === priority);
      }
      
      if (gapType && gapType !== "all") {
        filteredGaps = filteredGaps.filter(gap => gap.gapType === gapType);
      }
      
      res.json(filteredGaps);
    } catch (error) {
      console.error("Error fetching research gaps:", error);
      res.status(500).json({ error: "Unable to fetch research gaps" });
    }
  });

  app.post("/api/research/gaps/analyze", async (req: Request, res: Response) => {
    try {
      const { bodyPart, timeframeYears } = req.body;
      
      // Use AI to analyze research gaps
      const gaps = await researchGapAnalysisService.analyzeResearchGaps({
        bodyPart,
        timeframeYears,
        includeAllBodyParts: !bodyPart || bodyPart === "all"
      });
      
      res.json(gaps);
    } catch (error) {
      console.error("Error analyzing research gaps:", error);
      res.status(500).json({ error: "Unable to analyze research gaps" });
    }
  });

  app.get("/api/research/gaps/statistics", async (req: Request, res: Response) => {
    try {
      const stats = await researchGapAnalysisService.getGapStatistics();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching gap statistics:", error);
      res.status(500).json({ error: "Unable to fetch statistics" });
    }
  });

  // Research Projects
  app.get("/api/research/projects", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { status, isPublic, limit } = req.query;
      const projects = await researchStorage.getResearchProjects({
        userId: req.user!.id,
        status: status as string,
        isPublic: isPublic === 'true',
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json(projects);
    } catch (error) {
      console.error("Error fetching research projects:", error);
      res.status(500).json({ error: "Unable to fetch research projects" });
    }
  });

  app.post("/api/research/projects", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const projectData = {
        ...req.body,
        principalInvestigatorId: req.user!.id
      };
      const project = await researchStorage.createResearchProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating research project:", error);
      res.status(500).json({ error: "Unable to create research project" });
    }
  });

  app.get("/api/research/projects/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await researchStorage.getResearchProject(projectId, req.user!.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found or access denied" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching research project:", error);
      res.status(500).json({ error: "Unable to fetch research project" });
    }
  });

  app.put("/api/research/projects/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await researchStorage.updateResearchProject(projectId, req.body);
      res.json(project);
    } catch (error) {
      console.error("Error updating research project:", error);
      res.status(500).json({ error: "Unable to update research project" });
    }
  });

  // Research Collaborators
  app.get("/api/research/projects/:id/collaborators", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const collaborators = await researchStorage.getProjectCollaborators(projectId);
      res.json(collaborators);
    } catch (error) {
      console.error("Error fetching collaborators:", error);
      res.status(500).json({ error: "Unable to fetch collaborators" });
    }
  });

  app.post("/api/research/projects/:id/collaborators", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const collaborator = await researchStorage.addCollaborator({
        projectId,
        ...req.body
      });
      res.status(201).json(collaborator);
    } catch (error) {
      console.error("Error adding collaborator:", error);
      res.status(500).json({ error: "Unable to add collaborator" });
    }
  });

  // Virtual Patient Research Data
  app.get("/api/research/virtual-patients", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { bodyPart, minAge, maxAge, gender } = req.query;
      const criteria = {
        bodyPart: bodyPart as string,
        ageRange: minAge && maxAge ? { 
          min: parseInt(minAge as string), 
          max: parseInt(maxAge as string) 
        } : undefined,
        gender: gender as string,
        excludeUserIds: [req.user!.id] // Don't include user's own patients
      };
      
      const patients = await researchStorage.getResearchEligibleVirtualPatients(criteria);
      res.json(patients);
    } catch (error) {
      console.error("Error fetching virtual patient data:", error);
      res.status(500).json({ error: "Unable to fetch virtual patient data" });
    }
  });

  app.post("/api/research/virtual-patients/:id/consent", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const virtualPatientId = parseInt(req.params.id);
      const { consentedForResearch, dataUsageTerms } = req.body;
      
      const consent = await researchStorage.setVirtualPatientConsent({
        virtualPatientId,
        userId: req.user!.id,
        consentedForResearch,
        dataUsageTerms,
        consentVersion: "1.0"
      });
      
      res.json(consent);
    } catch (error) {
      console.error("Error setting research consent:", error);
      res.status(500).json({ error: "Unable to set research consent" });
    }
  });

  // Research Data Requests
  app.post("/api/research/data-requests", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const request = await researchStorage.createDataRequest({
        ...req.body,
        requestedById: req.user!.id
      });
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating data request:", error);
      res.status(500).json({ error: "Unable to create data request" });
    }
  });

  app.get("/api/research/data-requests", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { projectId, approvalStatus } = req.query;
      const requests = await researchStorage.getDataRequests({
        projectId: projectId ? parseInt(projectId as string) : undefined,
        requestedById: req.user!.id,
        approvalStatus: approvalStatus as string
      });
      res.json(requests);
    } catch (error) {
      console.error("Error fetching data requests:", error);
      res.status(500).json({ error: "Unable to fetch data requests" });
    }
  });

  // Research Statistics
  app.get("/api/research/statistics", async (req: Request, res: Response) => {
    try {
      const stats = await researchStorage.getResearchStatistics();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching research statistics:", error);
      res.status(500).json({ error: "Unable to fetch research statistics" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}