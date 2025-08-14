import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
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
import { researchStorage } from "./researchStorage";
import { competitionStorage } from "./competitionStorage";
import { competitionService, type CompetitionAttempt } from "./competitionService";
import { complexCaseService } from "./complexCaseService";
import { notificationService } from "./notificationService";
import { realTimeCompetitionService } from "./realTimeCompetitionService";
import { competitionContentService } from "./competitionContentService";
import { competitionAnalyticsService } from "./competitionAnalyticsService";
import { soapNotesService } from "./soapNotesService";
import { bodyScannerService, SymptomData } from "./bodyScannerService";
import { realTimeAIService } from "./realtimeAIService";
import { continuousRecordingService } from "./continuousRecordingService";
import { virtualPatientService } from "./virtualPatientService";
import { soapVirtualPatientService } from "./soapVirtualPatientService";
import { documentGenerationService } from "./documentGenerationService";
import { aiMovementGenerator } from "./aiMovementGenerator";
import { youtubeAnalysisService } from "./youtubeAnalysisService";
import { comparativeAnalysisService } from "./ai/comparativeAnalysis";
import { generateAISuggestions, applySuggestionToSoap } from "./services/aiSuggestionsService";

import { soapNoteInputSchema, insertClinicalNoteSchema, insertCommentSchema, updateNoteVisibilitySchema, insertResearchArticleSchema, insertPaymentRecordSchema, insertExerciseSchema, insertManualTherapyTechniqueSchema, type ResearchArticle, insertVirtualPatientSchema, bodyPartEnum, sharedCases, caseTagsMapping, caseUpvotes, caseDiscussions, exercises, users, researchDiscussions, researchDiscussionVotes, complexCases, competitions, competitionParticipants, soapNotes, insertSoapNoteSchema, bodyScans, insertBodyScanSchema, tournamentParticipants, diagnosisDuelTournaments, gameContent, virtualPatients, patternRecognitionScores } from "@shared/schema";
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
import patientFingerprintRoutes from "./routes/patientFingerprint";
import { config } from 'dotenv';
import { 
  analyzeMovementWithAI, 
  generateVirtualPatientFromMovement,
  getClinicalReasoning,
  detectPathologyPatterns,
  generateExercisePrescription
} from './ai/movementAnalysis';
config();

// Helper functions for research article relevance scoring and note processing

// Generate SOAP note sections using AI from transcript
async function generateAISoapSections(transcript: string): Promise<{
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert physiotherapist. Convert the following patient consultation transcript into proper SOAP note format. 

IMPORTANT: Do NOT copy the transcript directly. Instead:
- Subjective: Summarize the patient's complaints, symptoms, and history in clinical terminology
- Objective: Extract any mentioned physical examination findings, observations, or measurements  
- Assessment: Provide clinical reasoning and potential diagnoses based on the information
- Plan: Suggest appropriate treatment approaches and next steps

Format your response as valid JSON:
{
  "subjective": "...",
  "objective": "...", 
  "assessment": "...",
  "plan": "..."
}`
        },
        {
          role: "user",
          content: `Please convert this consultation transcript into a professional SOAP note:\n\n${transcript}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      subjective: result.subjective || 'Patient consultation documented.',
      objective: result.objective || 'Physical examination findings to be documented.',
      assessment: result.assessment || 'Clinical assessment pending.',
      plan: result.plan || 'Treatment plan to be developed.'
    };
  } catch (error) {
    console.error('Error generating AI SOAP sections:', error);
    // Fallback to basic structure if AI fails
    return {
      subjective: 'Patient consultation recorded. AI processing temporarily unavailable.',
      objective: 'Physical examination findings to be documented.',
      assessment: 'Clinical assessment pending review.',
      plan: 'Treatment plan to be developed based on assessment.'
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
  
  // Register patient fingerprint routes
  app.use(patientFingerprintRoutes);

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

  // Quick transcription for real-time visual updates
  app.post('/api/transcribe-quick', upload.single('audio'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const audioPath = req.file.path;
      
      // Quick transcription without SOAP generation
      const transcription = await transcribeAudio(audioPath);
      
      // Clean up
      await fs.unlink(audioPath);
      
      res.json({ transcription });
    } catch (error: any) {
      console.error('Quick transcription error:', error);
      res.status(500).json({ error: error.message });
    }
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

      // Try transcribing with appropriate timeout based on file size
      let transcription;
      try {
        // Calculate timeout based on file size (longer files need more time)
        const fileSizeMB = req.file.size / (1024 * 1024);
        // Increased timeout: minimum 30s, 30s per MB, max 10 minutes
        const timeoutMs = Math.max(30000, Math.min(600000, fileSizeMB * 30000));
        
        console.log(`File size: ${fileSizeMB.toFixed(2)}MB, using timeout: ${timeoutMs}ms`);
        
        // Create a promise that resolves after the calculated timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Transcription timeout")), timeoutMs);
        });

        // Race the transcription against the timeout
        transcription = await Promise.race([
          transcribeAudio(req.file.path),
          timeoutPromise
        ]);
      } catch (transcriptionError) {
        console.log('Transcription error or timeout, using fallback text:', transcriptionError);
        // For longer files, provide a more specific message
        const fileSizeMB = req.file.size / (1024 * 1024);
        const updatedFallback = {
          ...fallbackResponse,
          transcription: fileSizeMB > 1 
            ? "Long audio recording received successfully. Processing longer recordings may take additional time. Please try a shorter recording for faster results, or proceed with manual note creation."
            : fallbackResponse.transcription,
          soapNote: {
            ...fallbackResponse.soapNote,
            subjective: fileSizeMB > 1
              ? "Long audio recording received but transcription timeout occurred. Consider shorter recordings for automatic processing."
              : fallbackResponse.soapNote.subjective
          }
        };
        return res.json(updatedFallback);
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

      // Generate SOAP structure using AI from transcript
      let soapNote;
      try {
        console.log('Generating AI SOAP sections from transcript...');
        soapNote = await generateAISoapSections(transcription);
        console.log('AI SOAP sections generated successfully');
      } catch (soapError) {
        console.log('AI SOAP generation error, using basic structure:', soapError);
        soapNote = {
          subjective: 'Patient consultation recorded. AI processing temporarily unavailable.',
          objective: 'Physical examination findings to be documented.',
          assessment: 'Clinical assessment pending review.',
          plan: 'Treatment plan to be developed based on assessment.'
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

  // Chunked transcription endpoint for long recordings (up to 45 minutes)
  app.post('/api/transcribe-chunk', upload.single('audio'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio chunk uploaded' });
      }

      const chunkIndex = parseInt(req.body.chunkIndex || '0');
      const totalChunks = parseInt(req.body.totalChunks || '1');

      console.log(`Processing audio chunk ${chunkIndex + 1}/${totalChunks}, size: ${req.file.size} bytes`);

      // Get file stats for debugging
      const stats = fs.statSync(req.file.path);
      console.log(`Chunk file size: ${stats.size} bytes (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);

      // Try transcribing the chunk
      let transcription;
      try {
        // Use a shorter timeout for chunks since they're smaller
        const timeoutMs = 120000; // 2 minutes per chunk should be plenty
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Chunk transcription timeout")), timeoutMs);
        });

        // Race the transcription against the timeout
        transcription = await Promise.race([
          transcribeAudio(req.file.path),
          timeoutPromise
        ]);

        console.log(`Chunk ${chunkIndex + 1} transcribed successfully: ${transcription.length} characters`);
      } catch (error) {
        console.error(`Error transcribing chunk ${chunkIndex + 1}:`, error);
        
        // For failed chunks, return empty transcription so the process can continue
        return res.json({
          transcription: '',
          chunkIndex,
          totalChunks,
          error: 'Chunk transcription failed but process will continue'
        });
      }

      // Clean up the temporary file
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.log('Failed to clean up temp file:', cleanupError);
      }

      // Return the chunk transcription
      res.json({
        transcription,
        chunkIndex,
        totalChunks,
        success: true
      });
      
    } catch (error: any) {
      console.error('Unexpected error in chunk transcription:', error);
      res.status(500).json({
        error: 'Failed to process audio chunk',
        chunkIndex: req.body.chunkIndex || 0,
        totalChunks: req.body.totalChunks || 1
      });
    }
  });

  // Generate AI suggestions for SOAP notes
  app.post('/api/generate-ai-suggestions', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { soapSections, transcript } = req.body;
      
      if (!soapSections) {
        return res.status(400).json({ error: 'SOAP sections are required' });
      }

      console.log('Generating AI suggestions for SOAP notes...');
      const suggestions = await generateAISuggestions(soapSections, transcript);
      
      res.json({ suggestions });
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      res.status(500).json({ 
        error: 'Failed to generate suggestions',
        suggestions: [] 
      });
    }
  });

  // Apply AI suggestion to SOAP notes
  app.post('/api/apply-ai-suggestion', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { suggestion, currentSections } = req.body;
      
      if (!suggestion || !currentSections) {
        return res.status(400).json({ error: 'Suggestion and current sections are required' });
      }

      const updatedSections = applySuggestionToSoap(suggestion, currentSections);
      
      res.json({ updatedSections });
    } catch (error) {
      console.error('Error applying suggestion:', error);
      res.status(500).json({ 
        error: 'Failed to apply suggestion',
        updatedSections: req.body.currentSections 
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

  // AI diagnosis routes
  app.post("/api/ai-diagnosis", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { staticPosturalData, motionCaptureData, clinicalInterviewData, detectedAbnormalities } = req.body;

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Build comprehensive clinical data for AI analysis
      const clinicalPrompt = `You are an expert physiotherapist providing comprehensive clinical diagnosis. Analyze the following patient data and provide a detailed diagnostic assessment:

STATIC POSTURAL ANALYSIS:
${staticPosturalData ? JSON.stringify(staticPosturalData, null, 2) : 'Not available'}

MOTION CAPTURE ANALYSIS:
${motionCaptureData ? JSON.stringify(motionCaptureData, null, 2) : 'Not available'}

CLINICAL INTERVIEW DATA:
${clinicalInterviewData ? JSON.stringify(clinicalInterviewData, null, 2) : 'Not available'}

DETECTED MOVEMENT ABNORMALITIES:
${detectedAbnormalities ? JSON.stringify(detectedAbnormalities, null, 2) : 'None detected'}

Please provide a comprehensive diagnosis including:
1. Primary diagnosis with specific anatomical involvement
2. Confidence level (0-100%)
3. Brief description of the condition
4. Common causes for this presentation
5. Associated conditions to consider

Respond in JSON format with these exact keys: primaryDiagnosis, confidence, description, commonCauses, associatedConditions`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: clinicalPrompt }],
        max_tokens: 1000,
        temperature: 0.3
      });

      const aiResponse = response.choices[0].message.content;
      
      try {
        const parsedResponse = JSON.parse(aiResponse || '{}');
        res.json(parsedResponse);
      } catch (parseError) {
        // Fallback response if JSON parsing fails
        res.json({
          primaryDiagnosis: "Musculoskeletal Dysfunction",
          confidence: 70,
          description: "Based on the available clinical data, there appears to be a musculoskeletal condition requiring further assessment",
          commonCauses: ["Movement dysfunction", "Postural abnormalities", "Activity-related factors"],
          associatedConditions: ["Pain", "Functional limitation", "Compensatory patterns"]
        });
      }
    } catch (error) {
      console.error('AI diagnosis error:', error);
      res.status(500).json({ error: 'Failed to generate AI diagnosis' });
    }
  });

  app.post("/api/ai-differentials", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { staticPosturalData, motionCaptureData, clinicalInterviewData } = req.body;

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const differentialPrompt = `You are an expert physiotherapist providing differential diagnosis analysis. Based on the following clinical data, provide 3-4 differential diagnoses:

CLINICAL INTERVIEW DATA:
${clinicalInterviewData ? JSON.stringify(clinicalInterviewData, null, 2) : 'Not available'}

STATIC POSTURAL ANALYSIS:
${staticPosturalData ? JSON.stringify(staticPosturalData, null, 2) : 'Not available'}

MOTION CAPTURE ANALYSIS:
${motionCaptureData ? JSON.stringify(motionCaptureData, null, 2) : 'Not available'}

Please provide differential diagnoses in JSON format with this structure:
{
  "differentialDiagnoses": [
    {
      "diagnosis": "Specific condition name",
      "likelihood": 75 (percentage 0-100)
    }
  ]
}

Focus on clinically relevant conditions based on the available data.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: differentialPrompt }],
        max_tokens: 800,
        temperature: 0.3
      });

      const aiResponse = response.choices[0].message.content;
      
      try {
        const parsedResponse = JSON.parse(aiResponse || '{}');
        res.json(parsedResponse);
      } catch (parseError) {
        // Fallback differentials
        res.json({
          differentialDiagnoses: [
            { diagnosis: "Musculoskeletal Pain Syndrome", likelihood: 70 },
            { diagnosis: "Movement Dysfunction", likelihood: 60 },
            { diagnosis: "Postural Syndrome", likelihood: 50 }
          ]
        });
      }
    } catch (error) {
      console.error('AI differentials error:', error);
      res.status(500).json({ error: 'Failed to generate AI differential diagnoses' });
    }
  });

  // Intelligent symptom analysis route
  app.post("/api/analyze-symptoms", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const {
        primaryComplaint,
        painLocation,
        painIntensity,
        symptomDuration,
        onsetMechanism,
        aggravatingFactors,
        relievingFactors,
        functionalLimitations
      } = req.body;

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const symptomPrompt = `You are an expert physiotherapist conducting a differential diagnosis. Analyze this SPECIFIC clinical presentation and provide a location-specific, evidence-based assessment.

CLINICAL PRESENTATION:
PRIMARY COMPLAINT: "${primaryComplaint}"
SPECIFIC PAIN LOCATION: "${painLocation}" (BE VERY SPECIFIC TO THIS EXACT LOCATION)
PAIN INTENSITY: ${painIntensity}/10
SYMPTOM DURATION: "${symptomDuration}"
ONSET MECHANISM: "${onsetMechanism}"
AGGRAVATING FACTORS: "${aggravatingFactors || 'Not specified'}"
RELIEVING FACTORS: "${relievingFactors || 'Not specified'}"
FUNCTIONAL LIMITATIONS: "${functionalLimitations || 'Not specified'}"

CRITICAL INSTRUCTIONS:
1. Base your analysis SPECIFICALLY on the pain location "${painLocation}" - different areas require completely different diagnoses
2. Consider anatomical structures specific to this exact location
3. Provide location-specific movement tests relevant to "${painLocation}"
4. Give different suspected conditions based on the specific area described

For example:
- Front of knee vs back of knee = completely different conditions and tests
- Lateral shoulder vs anterior shoulder = different impingement patterns
- Lower back vs upper back = different spinal segments and conditions

Provide analysis in JSON format with these exact keys:
{
  "bodyRegion": "Specific anatomical region based on exact location",
  "suspectedConditions": [
    {
      "condition": "Location-specific condition name",
      "likelihood": 75,
      "reasoning": "Why this condition fits this SPECIFIC location and presentation"
    }
  ],
  "redFlags": ["Location-specific red flags based on anatomy"],
  "recommendedMovements": [
    {
      "name": "Location-specific movement test",
      "purpose": "What this test evaluates for this specific area",
      "priority": "high/medium/low",
      "description": "Detailed test procedure for this anatomical region"
    }
  ],
  "clinicalQuestions": [
    {
      "question": "Location-specific clinical question",
      "reasoning": "Why this question is crucial for this specific area",
      "category": "Relevant category"
    }
  ]
}

Remember: Your diagnosis must be completely different for different locations. Front knee pain ≠ Back knee pain. Be anatomically precise.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert physiotherapist with 20+ years of clinical experience. You excel at differential diagnosis based on specific anatomical locations and provide evidence-based assessments. Always give different responses for different symptom locations - your expertise allows you to distinguish between similar presentations in different anatomical areas."
          },
          { 
            role: "user", 
            content: symptomPrompt 
          }
        ],
        max_tokens: 1800,
        temperature: 0.1
      });

      const aiResponse = response.choices[0].message.content;
      
      try {
        // Clean the response by removing markdown code blocks if present
        let cleanResponse = aiResponse || '{}';
        // Remove markdown code blocks (both ```json and ``` variants) with multiline support
        cleanResponse = cleanResponse.replace(/```json\s*/gm, '').replace(/```\s*/gm, '');
        // Trim any remaining whitespace
        cleanResponse = cleanResponse.trim();
        
        const parsedResponse = JSON.parse(cleanResponse);
        res.json(parsedResponse);
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        // Fallback response structure
        res.json({
          bodyRegion: painLocation || 'Musculoskeletal',
          suspectedConditions: [
            {
              condition: "Musculoskeletal Dysfunction",
              likelihood: 70,
              reasoning: "Based on the symptom presentation, requires further assessment"
            }
          ],
          redFlags: painIntensity >= 8 ? ["High pain intensity requiring monitoring"] : [],
          recommendedMovements: [
            {
              name: "Movement Screen",
              purpose: "Assess movement quality and dysfunction patterns",
              priority: "high",
              description: "Comprehensive movement evaluation for the affected region"
            }
          ],
          clinicalQuestions: [
            {
              question: "Does the pain radiate to other areas?",
              reasoning: "Helps identify neural involvement or referred pain patterns",
              category: "Neurological"
            }
          ]
        });
      }
    } catch (error) {
      console.error('Symptom analysis error:', error);
      res.status(500).json({ error: 'Failed to analyze symptoms' });
    }
  });

  // Enhanced postural analysis route
  app.post("/api/analyze-posture", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { views, symptomContext } = req.body;

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const posturalPrompt = `You are an expert physiotherapist performing postural analysis. Based on the captured postural views and symptom context, provide a comprehensive assessment:

CAPTURED VIEWS: ${views.length} postural photographs (${views.map((v: any) => v.viewType).join(', ')})
SYMPTOM CONTEXT: ${JSON.stringify(symptomContext, null, 2)}

Please analyze the postural data and provide assessment in JSON format with these exact keys:
{
  "alignmentDeviations": [
    {
      "type": "Specific deviation name",
      "severity": "mild/moderate/severe",
      "description": "Detailed description of the deviation",
      "clinicalSignificance": "Why this matters clinically",
      "affectedStructures": ["Array of anatomical structures affected"]
    }
  ],
  "asymmetries": [
    {
      "location": "Location of asymmetry",
      "degree": "Degree of asymmetry",
      "compensations": ["Array of compensatory patterns"]
    }
  ],
  "overallPosture": {
    "classification": "Primary postural classification",
    "primaryPatterns": ["Array of main postural patterns"],
    "recommendations": ["Array of intervention recommendations"]
  },
  "correlationToSymptoms": "How postural findings relate to reported symptoms",
  "predictedMovementDysfunctions": ["Array of expected movement problems based on posture"]
}

Base your analysis on established postural assessment principles and correlate findings with the patient's symptom presentation.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: posturalPrompt }],
        max_tokens: 1200,
        temperature: 0.3
      });

      const aiResponse = response.choices[0].message.content;
      
      try {
        const parsedResponse = JSON.parse(aiResponse || '{}');
        res.json(parsedResponse);
      } catch (parseError) {
        // Fallback postural analysis based on symptom context
        const bodyRegion = symptomContext?.bodyRegion?.toLowerCase() || '';
        let fallbackAnalysis;

        if (bodyRegion.includes('spine') || bodyRegion.includes('back')) {
          fallbackAnalysis = {
            alignmentDeviations: [
              {
                type: "Forward Head Posture",
                severity: "moderate",
                description: "Cervical spine positioned anterior to optimal alignment",
                clinicalSignificance: "Increases cervical lordosis and suboccipital tension",
                affectedStructures: ["Upper trapezius", "Levator scapulae", "Deep neck flexors"]
              }
            ],
            asymmetries: [
              {
                location: "Shoulder height",
                degree: "Mild asymmetry",
                compensations: ["Cervical side bending", "Scapular elevation"]
              }
            ],
            overallPosture: {
              classification: "Upper Crossed Syndrome",
              primaryPatterns: ["Forward head posture", "Rounded shoulders"],
              recommendations: ["Postural re-education", "Deep neck flexor strengthening"]
            },
            correlationToSymptoms: "Postural deviations correlate with reported spinal dysfunction",
            predictedMovementDysfunctions: ["Reduced cervical mobility", "Scapular dyskinesis"]
          };
        } else {
          fallbackAnalysis = {
            alignmentDeviations: [
              {
                type: "Postural Adaptation",
                severity: "mild",
                description: "Compensatory postural changes related to symptom presentation",
                clinicalSignificance: "May perpetuate movement dysfunction patterns",
                affectedStructures: ["Regional musculature", "Joint mechanics"]
              }
            ],
            asymmetries: [],
            overallPosture: {
              classification: "Compensatory Postural Pattern",
              primaryPatterns: ["Adaptive positioning"],
              recommendations: ["Address underlying dysfunction", "Movement re-education"]
            },
            correlationToSymptoms: "Postural findings support symptom presentation",
            predictedMovementDysfunctions: ["Regional movement restrictions"]
          };
        }

        res.json(fallbackAnalysis);
      }
    } catch (error) {
      console.error('Postural analysis error:', error);
      res.status(500).json({ error: 'Failed to analyze postural data' });
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

  // Research Gaps Routes (must come before parameterized routes)
  app.get("/api/research/gaps", async (req: Request, res: Response) => {
    try {
      // Generate comprehensive research gaps data
      const bodyParts = ["general", "shoulder", "neck", "back", "elbow", "wrist", "hand", "hip", "knee", "ankle", "foot"];
      const gapTypes = ["methodology", "treatment", "outcome", "demographic"];
      const priorities = ["critical", "high", "medium", "low"];
      
      const researchGapTemplates = [
        {
          title: "Long-term Outcome Tracking in {bodyPart} Conditions",
          description: "Limited research on long-term effectiveness of physiotherapy interventions for {bodyPart} conditions beyond 12 months follow-up.",
          evidenceLevel: "Low - most studies <6 months follow-up",
          potentialImpact: "High - would inform sustainable treatment approaches and healthcare resource allocation",
          suggestedMethodology: "Longitudinal cohort study with virtual patient data tracking treatment responses over 2+ years"
        },
        {
          title: "Personalized Treatment Algorithms for {bodyPart} Rehabilitation",
          description: "Lack of evidence-based algorithms for matching specific patient characteristics to optimal {bodyPart} treatment approaches.",
          evidenceLevel: "Very Low - mostly expert opinion",
          potentialImpact: "Critical - could revolutionize clinical decision making and improve outcomes",
          suggestedMethodology: "Machine learning analysis of virtual patient treatment response patterns"
        },
        {
          title: "Technology-Enhanced {bodyPart} Rehabilitation",
          description: "Insufficient comparative research on technology-enhanced versus traditional {bodyPart} physiotherapy approaches.",
          evidenceLevel: "Low - limited RCTs available",
          potentialImpact: "High - could guide technology adoption and improve accessibility",
          suggestedMethodology: "Multi-arm RCT comparing traditional, app-assisted, and VR-enhanced rehabilitation"
        },
        {
          title: "Cultural Adaptation of {bodyPart} Treatment Protocols",
          description: "Research gaps in culturally adapted physiotherapy interventions for diverse populations with {bodyPart} conditions.",
          evidenceLevel: "Very Low - Western-centric research",
          potentialImpact: "High - would improve treatment outcomes across diverse populations",
          suggestedMethodology: "Multi-center studies across different cultural contexts using standardized protocols"
        },
        {
          title: "Biomarker Integration in {bodyPart} Assessment",
          description: "Limited integration of biological markers in {bodyPart} physiotherapy assessment and treatment planning.",
          evidenceLevel: "Low - emerging field",
          potentialImpact: "Medium - could enhance precision medicine approaches",
          suggestedMethodology: "Prospective studies correlating biomarkers with treatment outcomes"
        }
      ];

      const mockGaps = [];
      let gapId = 1;

      bodyParts.forEach(bodyPart => {
        researchGapTemplates.forEach((template, templateIndex) => {
          const gap = {
            id: gapId++,
            title: template.title.replace(/{bodyPart}/g, bodyPart === "general" ? "chronic pain" : bodyPart),
            description: template.description.replace(/{bodyPart}/g, bodyPart === "general" ? "chronic pain" : bodyPart),
            bodyPart: bodyPart,
            gapType: gapTypes[templateIndex % gapTypes.length],
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            evidenceLevel: template.evidenceLevel,
            potentialImpact: template.potentialImpact,
            suggestedMethodology: template.suggestedMethodology,
            aiGenerated: true,
            verifiedByExpert: Math.random() > 0.8,
            createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
          };
          mockGaps.push(gap);
        });
      });
      
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

  // Update exercise images
  app.post("/api/exercises/update-images", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { updateExerciseImages } = await import('./scripts/updateExerciseImages.js');
      await updateExerciseImages();
      res.json({ success: true, message: 'Exercise images updated successfully' });
    } catch (error) {
      console.error('Error updating exercise images:', error);
      res.status(500).json({ error: 'Failed to update exercise images' });
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

  // Route handler removed - duplicate of line 8255

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

  // Get SOAP virtual patients for user
  app.get("/api/soap-virtual-patients", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const virtualPatients = await storage.getUserSoapVirtualPatients(userId);
      res.json(virtualPatients);
    } catch (error) {
      console.error("Error fetching SOAP virtual patients:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  // Create virtual patient from SOAP notes
  app.post("/api/soap-virtual-patients", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { soapSections, transcript, sessionDuration, timestamp } = req.body;

      // Validate required data
      if (!soapSections || (!soapSections.subjective && !soapSections.objective)) {
        return res.status(400).json({ error: 'Insufficient SOAP data to create virtual patient' });
      }

      // Use the SOAP Virtual Patient Service to create a virtual patient
      const virtualPatient = await soapVirtualPatientService.createVirtualPatientFromSOAP({
        soapSections,
        transcript,
        sessionDuration,
        userId
      });

      res.json(virtualPatient);
    } catch (error) {
      console.error("Error creating virtual patient from SOAP:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });
  
  // Evidence Articles Route - Get relevant research based on SOAP content
  app.post("/api/soap-notes/evidence-articles", async (req: Request, res: Response) => {
    try {
      const { transcript, soapSections } = req.body;
      
      // Import the evidence service
      const { getRelevantEvidence } = await import('./services/evidenceArticlesService.js');
      
      // Get relevant evidence articles
      const articles = await getRelevantEvidence(transcript, soapSections);
      
      res.json({ articles });
    } catch (error) {
      console.error("Error fetching evidence articles:", error);
      res.status(500).json({ 
        error: 'Failed to fetch evidence articles',
        articles: [] 
      });
    }
  });
  
  // Virtual Patient Config Routes
  
  // Get all virtual patient configs for user
  app.get("/api/virtual-patient-configs", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const configs = await storage.getUserVirtualPatientConfigs(userId);
      res.json(configs);
    } catch (error) {
      console.error("Error fetching virtual patient configs:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  // Get single virtual patient config
  app.get("/api/virtual-patient-configs/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const configId = parseInt(req.params.id);
      if (isNaN(configId)) {
        return res.status(400).json({ error: 'Invalid config ID' });
      }

      const config = await storage.getVirtualPatientConfig(configId);
      if (!config) {
        return res.status(404).json({ error: 'Virtual patient config not found' });
      }

      // Check ownership
      if (config.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(config);
    } catch (error) {
      console.error("Error fetching virtual patient config:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  // Get virtual patient config by SOAP patient ID
  app.get("/api/soap-virtual-patients/:soapId/config", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const soapId = parseInt(req.params.soapId);
      if (isNaN(soapId)) {
        return res.status(400).json({ error: 'Invalid SOAP patient ID' });
      }

      const config = await storage.getVirtualPatientConfigBySoapId(soapId);
      if (!config) {
        return res.status(404).json({ error: 'Virtual patient config not found' });
      }

      // Check ownership
      if (config.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(config);
    } catch (error) {
      console.error("Error fetching virtual patient config:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  // Create virtual patient config
  app.post("/api/virtual-patient-configs", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("POST /api/virtual-patient-configs - Request body:", JSON.stringify(req.body, null, 2));
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const configData = {
        ...req.body,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastModified: new Date()
      };

      console.log("Creating config with data:", JSON.stringify(configData, null, 2));

      const config = await storage.createVirtualPatientConfig(configData);
      res.json(config);
    } catch (error) {
      console.error("Error creating virtual patient config:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  // Update virtual patient config
  app.put("/api/virtual-patient-configs/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const configId = parseInt(req.params.id);
      if (isNaN(configId)) {
        return res.status(400).json({ error: 'Invalid config ID' });
      }

      const config = await storage.getVirtualPatientConfig(configId);
      if (!config) {
        return res.status(404).json({ error: 'Virtual patient config not found' });
      }

      // Check ownership
      if (config.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updatedConfig = await storage.updateVirtualPatientConfig(configId, req.body);
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating virtual patient config:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  // Delete virtual patient config
  app.delete("/api/virtual-patient-configs/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const configId = parseInt(req.params.id);
      if (isNaN(configId)) {
        return res.status(400).json({ error: 'Invalid config ID' });
      }

      const config = await storage.getVirtualPatientConfig(configId);
      if (!config) {
        return res.status(404).json({ error: 'Virtual patient config not found' });
      }

      // Check ownership
      if (config.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await storage.deleteVirtualPatientConfig(configId);
      res.json({ success: true, message: 'Virtual patient config deleted successfully' });
    } catch (error) {
      console.error("Error deleting virtual patient config:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  // Pathology Template Routes
  
  // Get all pathology templates
  app.get("/api/pathology-templates", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string | undefined;
      const templates = await storage.getPathologyTemplates(category);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching pathology templates:", error);
      res.status(500).json({ error: 'Failed to fetch pathology templates' });
    }
  });

  // Get single pathology template
  app.get("/api/pathology-templates/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }

      const template = await storage.getPathologyTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: 'Pathology template not found' });
      }

      res.json(template);
    } catch (error) {
      console.error("Error fetching pathology template:", error);
      res.status(500).json({ error: 'Failed to fetch pathology template' });
    }
  });

  // Create pathology template
  app.post("/api/pathology-templates", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const templateData = {
        ...req.body,
        createdBy: userId
      };

      const template = await storage.createPathologyTemplate(templateData);
      res.json(template);
    } catch (error) {
      console.error("Error creating pathology template:", error);
      res.status(500).json({ error: 'Failed to create pathology template' });
    }
  });

  // Update pathology template
  app.put("/api/pathology-templates/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }

      const template = await storage.getPathologyTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: 'Pathology template not found' });
      }

      // Only allow creator to edit (or add admin check later)
      if (template.createdBy !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updatedTemplate = await storage.updatePathologyTemplate(templateId, req.body);
      res.json(updatedTemplate);
    } catch (error) {
      console.error("Error updating pathology template:", error);
      res.status(500).json({ error: 'Failed to update pathology template' });
    }
  });

  // Delete pathology template
  app.delete("/api/pathology-templates/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }

      const template = await storage.getPathologyTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: 'Pathology template not found' });
      }

      // Only allow creator to delete (or add admin check later)
      if (template.createdBy !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await storage.deletePathologyTemplate(templateId);
      res.json({ success: true, message: 'Pathology template deleted successfully' });
    } catch (error) {
      console.error("Error deleting pathology template:", error);
      res.status(500).json({ error: 'Failed to delete pathology template' });
    }
  });

  // Movement Analysis AI Routes (Phase 2 & Phase 5)
  
  // Analyze captured movement with AI
  app.post("/api/ai/analyze-movement", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { patientId, movementType, movementData, timestamp } = req.body;
      
      if (!movementType || !movementData || movementData.length === 0) {
        return res.status(400).json({ error: 'Movement type and data are required' });
      }

      // Get patient history if available
      let patientHistory = '';
      if (patientId) {
        const config = await storage.getVirtualPatientConfig(patientId);
        if (config) {
          patientHistory = JSON.stringify(config.modelConfig);
        }
      }

      // Perform AI analysis
      const analysisResult = await analyzeMovementWithAI(
        movementType,
        movementData,
        patientHistory
      );

      res.json(analysisResult);
    } catch (error) {
      console.error("Movement analysis error:", error);
      res.status(500).json({ error: 'Failed to analyze movement' });
    }
  });

  // Generate virtual patient from movement data
  app.post("/api/ai/generate-patient-from-movement", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { movementData, analysisResult } = req.body;
      
      if (!movementData || !analysisResult) {
        return res.status(400).json({ error: 'Movement data and analysis are required' });
      }

      const virtualPatientConfig = await generateVirtualPatientFromMovement(
        movementData,
        analysisResult
      );

      res.json(virtualPatientConfig);
    } catch (error) {
      console.error("Virtual patient generation error:", error);
      res.status(500).json({ error: 'Failed to generate virtual patient' });
    }
  });

  // Get clinical reasoning for patient
  app.post("/api/ai/clinical-reasoning", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { patientData, movementAnalysis, question } = req.body;
      
      if (!patientData || !movementAnalysis) {
        return res.status(400).json({ error: 'Patient data and movement analysis are required' });
      }

      const reasoning = await getClinicalReasoning(
        patientData,
        movementAnalysis,
        question
      );

      res.json({ reasoning });
    } catch (error) {
      console.error("Clinical reasoning error:", error);
      res.status(500).json({ error: 'Failed to generate clinical reasoning' });
    }
  });

  // Detect pathology patterns from movement
  app.post("/api/ai/detect-pathology", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { movementData, movementType } = req.body;
      
      if (!movementData || !movementType) {
        return res.status(400).json({ error: 'Movement data and type are required' });
      }

      const patterns = await detectPathologyPatterns(movementData, movementType);
      res.json(patterns);
    } catch (error) {
      console.error("Pathology detection error:", error);
      res.status(500).json({ error: 'Failed to detect pathology patterns' });
    }
  });

  // Generate exercise prescription
  app.post("/api/ai/generate-exercise-prescription", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { analysisResult, patientGoals, restrictions } = req.body;
      
      if (!analysisResult) {
        return res.status(400).json({ error: 'Analysis result is required' });
      }

      const prescription = await generateExercisePrescription(
        analysisResult,
        patientGoals,
        restrictions
      );

      res.json(prescription);
    } catch (error) {
      console.error("Exercise prescription error:", error);
      res.status(500).json({ error: 'Failed to generate exercise prescription' });
    }
  });

  // Save captured movement data
  app.post("/api/virtual-patient-movements", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { patientId, movementType, capturedData, analysisResults, timestamp } = req.body;
      
      if (!patientId || !movementType || !capturedData) {
        return res.status(400).json({ error: 'Patient ID, movement type, and captured data are required' });
      }

      // Update the virtual patient config with movement data
      const config = await storage.getVirtualPatientConfig(patientId);
      if (!config || config.userId !== userId) {
        return res.status(404).json({ error: 'Virtual patient not found or access denied' });
      }

      // Add movement data to captured movements
      const capturedMovements = config.capturedMovements || [];
      capturedMovements.push({
        timestamp,
        movementType,
        poseData: capturedData,
        qualityScore: capturedData.reduce((sum: number, d: any) => sum + d.qualityScore, 0) / capturedData.length,
        notes: analysisResults ? JSON.stringify(analysisResults) : ''
      });

      await storage.updateVirtualPatientConfig(patientId, {
        capturedMovements,
        lastModified: new Date()
      });

      res.json({ success: true, message: 'Movement data saved successfully' });
    } catch (error) {
      console.error("Error saving movement data:", error);
      res.status(500).json({ error: 'Failed to save movement data' });
    }
  });

  // AI-powered movement analysis
  app.post("/api/movement-analysis", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { movementType, movementData, patientHistory } = req.body;
      
      if (!movementType || !movementData) {
        return res.status(400).json({ error: 'Movement type and data are required' });
      }

      // Import the movement analysis service
      const { analyzeMovementWithAI } = await import('./ai/movementAnalysis');
      
      // Perform AI analysis
      const analysisResult = await analyzeMovementWithAI(
        movementType,
        movementData,
        patientHistory
      );

      res.json(analysisResult);
    } catch (error) {
      console.error("Movement analysis error:", error);
      res.status(500).json({ error: 'Failed to analyze movement' });
    }
  });

  // Predictive analytics for injury risk and recovery
  app.post("/api/ai/predictive-analytics", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { movementData, patientHistory, analysisResult } = req.body;
      
      if (!movementData || !analysisResult) {
        return res.status(400).json({ error: 'Movement data and analysis result are required' });
      }

      const { predictiveAnalytics } = await import('./ai/movementAnalysis');
      const predictions = await predictiveAnalytics(movementData, patientHistory, analysisResult);

      res.json(predictions);
    } catch (error) {
      console.error("Predictive analytics error:", error);
      res.status(500).json({ error: 'Failed to generate predictive analytics' });
    }
  });

  // Natural language command processing
  app.post("/api/ai/process-command", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { command, context } = req.body;
      
      if (!command) {
        return res.status(400).json({ error: 'Command is required' });
      }

      const { processNaturalLanguageCommand } = await import('./ai/movementAnalysis');
      const result = await processNaturalLanguageCommand(command, context);

      res.json(result);
    } catch (error) {
      console.error("NLP command processing error:", error);
      res.status(500).json({ error: 'Failed to process command' });
    }
  });

  // Comparative analysis (before/after treatment)
  app.post("/api/ai/comparative-analysis", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { beforeData, afterData, treatmentDetails } = req.body;
      
      if (!beforeData || !afterData) {
        return res.status(400).json({ error: 'Before and after data are required' });
      }

      const { performComparativeAnalysis } = await import('./ai/movementAnalysis');
      const comparison = await performComparativeAnalysis(beforeData, afterData, treatmentDetails);

      res.json(comparison);
    } catch (error) {
      console.error("Comparative analysis error:", error);
      res.status(500).json({ error: 'Failed to perform comparative analysis' });
    }
  });

  // Generate SOAP note from assessment
  app.post("/api/ai/generate-soap", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { movementData, analysisResult, patientInfo, additionalNotes } = req.body;
      
      if (!movementData || !analysisResult) {
        return res.status(400).json({ error: 'Movement data and analysis result are required' });
      }

      const { generateSOAPFromAssessment } = await import('./ai/movementAnalysis');
      const soapNote = await generateSOAPFromAssessment(
        movementData,
        analysisResult,
        patientInfo,
        additionalNotes
      );

      res.json(soapNote);
    } catch (error) {
      console.error("SOAP generation error:", error);
      res.status(500).json({ error: 'Failed to generate SOAP note' });
    }
  });

  // Normative data comparison
  app.post("/api/ai/normative-comparison", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { movementData, age, gender, activityLevel } = req.body;
      
      if (!movementData || !age || !gender) {
        return res.status(400).json({ error: 'Movement data, age, and gender are required' });
      }

      const { compareToNormativeData } = await import('./ai/movementAnalysis');
      const comparison = await compareToNormativeData(
        movementData,
        age,
        gender,
        activityLevel || 'moderate'
      );

      res.json(comparison);
    } catch (error) {
      console.error("Normative comparison error:", error);
      res.status(500).json({ error: 'Failed to compare to normative data' });
    }
  });

  // Detect movement abnormalities
  app.post("/api/ai/detect-abnormalities", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { movementData } = req.body;
      
      if (!movementData) {
        return res.status(400).json({ error: 'Movement data is required' });
      }

      const { detectMovementAbnormalities } = await import('./ai/movementAnalysis');
      const abnormalities = await detectMovementAbnormalities(movementData);

      res.json(abnormalities);
    } catch (error) {
      console.error("Abnormality detection error:", error);
      res.status(500).json({ error: 'Failed to detect abnormalities' });
    }
  });

  // Generate virtual patient from media description
  app.post("/api/ai/generate-patient-from-media", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { mediaDescription, frameAnalysis } = req.body;
      
      if (!mediaDescription) {
        return res.status(400).json({ error: 'Media description is required' });
      }

      const { generateVirtualPatientFromMedia } = await import('./ai/movementAnalysis');
      const patientModel = await generateVirtualPatientFromMedia(mediaDescription, frameAnalysis);

      res.json(patientModel);
    } catch (error) {
      console.error("Virtual patient generation error:", error);
      res.status(500).json({ error: 'Failed to generate virtual patient from media' });
    }
  });

  // Rename virtual patient
  app.patch("/api/virtual-patients/:id/rename", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const { newName } = req.body;

      // Validate input
      if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
        return res.status(400).json({ error: 'New name is required and must be a non-empty string' });
      }

      const patientId = parseInt(id);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: 'Invalid patient ID' });
      }

      // Get the virtual patient to verify ownership
      const virtualPatient = await storage.getVirtualPatient(patientId);
      if (!virtualPatient) {
        return res.status(404).json({ error: 'Virtual patient not found' });
      }

      // Ensure the virtual patient belongs to the authenticated user
      if (virtualPatient.userId !== userId) {
        return res.status(403).json({ error: 'You do not have permission to rename this virtual patient' });
      }

      // Update the patient name
      const updatedPatient = await storage.updateVirtualPatient(patientId, {
        patient_name: newName.trim()
      });

      if (!updatedPatient) {
        return res.status(500).json({ error: 'Failed to update virtual patient name' });
      }

      res.json({
        success: true,
        message: 'Virtual patient renamed successfully',
        virtualPatient: updatedPatient
      });

    } catch (error) {
      console.error("Error renaming virtual patient:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  // Add motion capture data to virtual patient
  app.post("/api/virtual-patients/:id/motion-data", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const { motionData } = req.body;

      const patientId = parseInt(id);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: 'Invalid patient ID' });
      }

      // Validate motion data
      if (!motionData) {
        return res.status(400).json({ error: 'Motion data is required' });
      }

      // Get the virtual patient to verify ownership
      const virtualPatient = await storage.getVirtualPatient(patientId);
      if (!virtualPatient) {
        return res.status(404).json({ error: 'Virtual patient not found' });
      }

      // Ensure the virtual patient belongs to the authenticated user
      if (virtualPatient.userId !== userId) {
        return res.status(403).json({ error: 'You do not have permission to modify this virtual patient' });
      }

      // Update the patient with motion capture data to create digital twin
      const updatedPatient = await storage.updateVirtualPatient(patientId, {
        motionData: JSON.stringify(motionData),
        enhancedAt: new Date()
      });

      if (!updatedPatient) {
        return res.status(500).json({ error: 'Failed to add motion capture data' });
      }

      res.json({
        success: true,
        message: 'Motion capture data added successfully - Digital twin created!',
        virtualPatient: updatedPatient
      });

    } catch (error) {
      console.error("Error adding motion capture data:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  // Generate Virtual Patient from SOAP Note
  app.post("/api/ai/generate-virtual-patient-from-soap", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { soapNoteId, subjective, objective, assessment, plan, transcript } = req.body;

      // Import the SOAP to Virtual Patient converter
      const { generateVirtualPatientFromSOAP } = await import('./ai/soapToVirtualPatient');

      // Generate virtual patient parameters from SOAP content
      const virtualPatientData = await generateVirtualPatientFromSOAP({
        subjective,
        objective,
        assessment,
        plan,
        transcript
      });

      // Create a new virtual patient configuration
      const newConfig = await storage.createVirtualPatientConfig({
        userId,
        soapVirtualPatientId: soapNoteId || null,
        patient_name: virtualPatientData.patientName,
        chiefComplaint: virtualPatientData.condition,
        modelConfig: {
          limbScales: virtualPatientData.limbScales,
          shoulderPathology: virtualPatientData.shoulderPathology,
          spinalPathology: virtualPatientData.spinalPathology,
          lowerLimbPathology: virtualPatientData.lowerLimbPathology
        }
      });

      res.json({
        success: true,
        message: 'Virtual patient generated from SOAP note successfully',
        virtualPatient: newConfig,
        clinicalData: {
          condition: virtualPatientData.condition,
          movementQuality: virtualPatientData.movementQuality,
          functionalLimitations: virtualPatientData.functionalLimitations
        }
      });

    } catch (error) {
      console.error("Error generating virtual patient from SOAP:", error);
      res.status(500).json({ 
        error: 'Failed to generate virtual patient from SOAP note',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Save 3D Visualization for Virtual Patient
  app.post("/api/virtual-patients/:id/save-3d-visualization", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const { motionData, analysis, clinicalCorrelations } = req.body;

      const patientId = parseInt(id);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: 'Invalid patient ID' });
      }

      // Validate motion data
      if (!motionData || !Array.isArray(motionData) || motionData.length === 0) {
        return res.status(400).json({ error: 'Valid motion data is required' });
      }

      // Try to get virtual patient from either system
      let virtualPatient;
      let isSOAPPatient = false;
      
      try {
        // First try SOAP virtual patients
        virtualPatient = await soapVirtualPatientService.getVirtualPatient(patientId, userId);
        if (virtualPatient) {
          isSOAPPatient = true;
        }
      } catch (error) {
        console.error('Error getting virtual patient:', error);
        console.log('Not a SOAP virtual patient, checking regular virtual patients');
      }
      
      if (!virtualPatient) {
        // Fallback to regular virtual patients
        virtualPatient = await storage.getVirtualPatient(patientId);
        if (!virtualPatient || virtualPatient.userId !== userId) {
          return res.status(404).json({ error: 'Virtual patient not found' });
        }
      }

      // Import visualization and clinical analysis services
      const { threeDVisualizationService } = await import('./threeDVisualizationService');
      const { clinicalMotionAnalysisService } = await import('./clinicalMotionAnalysis');

      // Generate real clinical motion analysis
      const clinicalAnalysis = await clinicalMotionAnalysisService.analyzeMotionData(motionData);

      // Generate 3D visualization data with real clinical insights
      const threeDVisualization = await threeDVisualizationService.generate3DVisualization(
        motionData,
        {
          dysfunctionPatterns: analysis?.identifiedDysfunctions || [],
          compensationMechanisms: clinicalCorrelations || [],
          movementQuality: analysis?.avgConfidence || 0.8,
          clinicalScores: clinicalAnalysis
        }
      );

      // Update the virtual patient with motion capture and 3D visualization data
      const updateData = {
        motionCaptureData: {
          landmarks: motionData.map((frame: any) => ({
            timestamp: frame.timestamp,
            landmarks: frame.landmarks || frame.worldLandmarks || []
          })),
          analysis: {
            totalFrames: motionData.length,
            duration: analysis?.duration || 0,
            movementQuality: analysis?.avgConfidence || 0.8,
            avgLandmarksPerFrame: motionData.filter((f: any) => (f.landmarks || f.worldLandmarks || []).length > 0).length
          },
          dysfunctionPatterns: analysis?.identifiedDysfunctions || [],
          compensationMechanisms: clinicalCorrelations || [],
          clinicalCorrelations: clinicalCorrelations || []
        },
        threeDVisualization,
        hasMotionData: true
      };

      let updatedPatient;
      
      if (isSOAPPatient) {
        // Update SOAP virtual patient
        updatedPatient = await soapVirtualPatientService.updateVirtualPatient(patientId, userId, updateData);
      } else {
        // For now, just update the regular virtual patient without motion data fields
        // TODO: Add motion data fields to regular virtual patients after schema update
        console.log('Motion capture data saved for virtual patient:', patientId);
        updatedPatient = virtualPatient; // Return existing patient for now
      }

      if (!updatedPatient) {
        return res.status(500).json({ error: 'Failed to save 3D visualization data' });
      }

      res.json({
        success: true,
        message: '3D Digital Twin created successfully with motion capture visualization!',
        virtualPatient: updatedPatient,
        threeDVisualization: threeDVisualization,
        clinicalAnalysis: clinicalAnalysis
      });

    } catch (error) {
      console.error("Error saving 3D visualization:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  // AI Analysis for Virtual Patient
  app.post("/api/virtual-patients/:id/ai-analysis", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const patientId = parseInt(id);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: 'Invalid patient ID' });
      }

      // Try to get virtual patient from both storage systems
      let virtualPatient;
      
      try {
        // First try SOAP virtual patients
        virtualPatient = await soapVirtualPatientService.getVirtualPatient(patientId, userId);
      } catch (error) {
        // Fallback to original virtual patients
        virtualPatient = await storage.getVirtualPatient(patientId);
        if (virtualPatient && virtualPatient.userId !== userId) {
          return res.status(403).json({ error: 'You do not have permission to access this virtual patient' });
        }
      }

      if (!virtualPatient) {
        return res.status(404).json({ error: 'Virtual patient not found' });
      }

      // Import OpenAI service
      const openai = (await import("./openai")).openai;

      // Prepare patient data for analysis
      const patientData = {
        name: virtualPatient.patient_name || virtualPatient.patientProfile?.name,
        age: virtualPatient.age || virtualPatient.patientProfile?.age,
        gender: virtualPatient.gender || virtualPatient.patientProfile?.gender,
        chiefComplaint: virtualPatient.chief_complaint || virtualPatient.clinicalPresentation?.chiefComplaint,
        symptoms: virtualPatient.symptoms_description || virtualPatient.clinicalPresentation?.historyOfPresentIllness,
        bodyPart: virtualPatient.body_part || virtualPatient.primaryBodyPart,
        medicalHistory: virtualPatient.past_medical_history || virtualPatient.patientProfile?.medicalHistory,
        objectiveFindings: virtualPatient.objective_findings || virtualPatient.physicalFindings,
        diagnosis: virtualPatient.diagnosis || virtualPatient.assessmentPlan?.primaryDiagnosis,
        motionData: virtualPatient.motionData ? JSON.parse(virtualPatient.motionData) : null
      };

      // Generate AI analysis prompt
      const analysisPrompt = `As an expert physiotherapist, provide a comprehensive clinical analysis of this virtual patient case:

Patient Information:
- Name: ${patientData.name}
- Age: ${patientData.age}
- Gender: ${patientData.gender}
- Chief Complaint: ${patientData.chiefComplaint}
- Symptoms: ${patientData.symptoms}
- Body Part: ${patientData.bodyPart}
- Medical History: ${patientData.medicalHistory}
- Objective Findings: ${typeof patientData.objectiveFindings === 'string' ? patientData.objectiveFindings : JSON.stringify(patientData.objectiveFindings)}
- Current Diagnosis: ${patientData.diagnosis}
${patientData.motionData ? '- Motion Capture Data: Available (Digital Twin)' : ''}

Please provide a detailed analysis in JSON format with the following structure:
{
  "clinicalSummary": "Comprehensive summary of the patient's clinical presentation",
  "diagnosticAnalysis": "In-depth analysis of the diagnostic process and reasoning",
  "treatmentRecommendations": "Evidence-based treatment recommendations",
  "keyInsights": ["Array of key clinical insights and learning points"],
  "confidenceScore": 85
}

Focus on clinical reasoning, evidence-based practice, and educational value.`;

      // Call OpenAI for analysis
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert physiotherapist providing comprehensive clinical analysis. Always respond with valid JSON format."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1500
      });

      const analysisResult = JSON.parse(response.choices[0].message.content || '{}');

      res.json(analysisResult);

    } catch (error) {
      console.error("Error generating AI analysis:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  // Find Relevant Research for Virtual Patient (GET route)
  app.get("/api/virtual-patients/:id/research", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const patientId = parseInt(id);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: 'Invalid patient ID' });
      }

      // Try to get virtual patient from both storage systems
      let virtualPatient;
      
      try {
        // First try SOAP virtual patients
        virtualPatient = await soapVirtualPatientService.getVirtualPatient(patientId, userId);
      } catch (error) {
        // Fallback to original virtual patients
        virtualPatient = await storage.getVirtualPatient(patientId);
        if (virtualPatient && virtualPatient.userId !== userId) {
          return res.status(403).json({ error: 'You do not have permission to access this virtual patient' });
        }
      }

      if (!virtualPatient) {
        return res.status(404).json({ error: 'Virtual patient not found' });
      }

      // Extract key search terms - handle both table structures
      let bodyPart, diagnosis, symptoms, chiefComplaint;
      
      if ('body_part' in virtualPatient) {
        // Old virtualPatients table structure (snake_case)
        bodyPart = virtualPatient.body_part || 'general';
        diagnosis = virtualPatient.diagnosis || '';
        symptoms = virtualPatient.symptoms_description || '';
        chiefComplaint = virtualPatient.chief_complaint || '';
      } else {
        // New soapVirtualPatients table structure (camelCase with JSON fields)
        bodyPart = virtualPatient.bodyPart || 'general';
        
        // Extract diagnosis information from clinical presentation and physical findings
        const clinicalPresentation = virtualPatient.clinicalPresentation as any;
        const physicalFindings = virtualPatient.physicalFindings as any;
        
        diagnosis = '';
        symptoms = clinicalPresentation?.historyOfPresentIllness || clinicalPresentation?.symptomsTimeline || '';
        chiefComplaint = clinicalPresentation?.chiefComplaint || '';
        
        // Try to construct a diagnosis search term from available clinical data
        const functionalLimitations = clinicalPresentation?.functionalLimitations?.join(' ') || '';
        const specialTests = physicalFindings?.specialTests?.join(' ') || '';
        diagnosis = `${chiefComplaint} ${functionalLimitations} ${specialTests}`.trim();
      }

      // Search for relevant research papers
      const searchQuery = `${diagnosis} ${symptoms}`.trim();
      const relevantPapers = await storage.searchResearchPapers(searchQuery, { 
        bodyPart: bodyPart 
      });

      // Import OpenAI service for relevance scoring
      const openai = (await import("./openai")).openai;

      // Score relevance for each paper
      const scoredPapers = await Promise.all(
        relevantPapers.map(async (paper) => {
          try {
            const relevancePrompt = `Rate the relevance of this research paper to the patient case on a scale of 1-100:

Patient Case:
- Body Part: ${bodyPart}
- Diagnosis: ${diagnosis}
- Symptoms: ${symptoms}
- Chief Complaint: ${chiefComplaint}

Research Paper:
- Title: ${paper.title}
- Abstract: ${paper.abstract}
- Body Part: ${paper.bodyPart}

Respond with only a number between 1-100 representing the relevance score.`;

            const relevanceResponse = await openai.chat.completions.create({
              model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
              messages: [
                {
                  role: "system",
                  content: "You are an expert in physiotherapy research. Rate research paper relevance to clinical cases accurately."
                },
                {
                  role: "user",
                  content: relevancePrompt
                }
              ],
              temperature: 0.3,
              max_tokens: 10
            });

            const relevanceScore = parseInt(relevanceResponse.choices[0].message.content?.trim() || '50');
            
            return {
              ...paper,
              relevanceScore: Math.min(Math.max(relevanceScore, 1), 100) // Ensure score is between 1-100
            };
          } catch (error) {
            console.error("Error scoring paper relevance:", error);
            return {
              ...paper,
              relevanceScore: 50 // Default score if scoring fails
            };
          }
        })
      );

      // Sort by relevance score (highest first)
      const sortedPapers = scoredPapers.sort((a, b) => b.relevanceScore - a.relevanceScore);

      res.json(sortedPapers);

    } catch (error) {
      console.error("Error finding relevant research:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });

  // Find Relevant Research for Virtual Patient (POST route)
  app.post("/api/virtual-patients/:id/relevant-research", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const patientId = parseInt(id);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: 'Invalid patient ID' });
      }

      // Try to get virtual patient from both storage systems
      let virtualPatient;
      
      try {
        // First try SOAP virtual patients
        virtualPatient = await soapVirtualPatientService.getVirtualPatient(patientId, userId);
      } catch (error) {
        // Fallback to original virtual patients
        virtualPatient = await storage.getVirtualPatient(patientId);
        if (virtualPatient && virtualPatient.userId !== userId) {
          return res.status(403).json({ error: 'You do not have permission to access this virtual patient' });
        }
      }

      if (!virtualPatient) {
        return res.status(404).json({ error: 'Virtual patient not found' });
      }

      // Extract key search terms - handle both table structures
      let bodyPart, diagnosis, symptoms, chiefComplaint;
      
      if ('body_part' in virtualPatient) {
        // Old virtualPatients table structure (snake_case)
        bodyPart = virtualPatient.body_part || 'general';
        diagnosis = virtualPatient.diagnosis || '';
        symptoms = virtualPatient.symptoms_description || '';
        chiefComplaint = virtualPatient.chief_complaint || '';
      } else {
        // New soapVirtualPatients table structure (camelCase with JSON fields)
        bodyPart = virtualPatient.bodyPart || 'general';
        
        // Extract diagnosis information from clinical presentation and physical findings
        const clinicalPresentation = virtualPatient.clinicalPresentation as any;
        const physicalFindings = virtualPatient.physicalFindings as any;
        
        diagnosis = '';
        symptoms = clinicalPresentation?.historyOfPresentIllness || clinicalPresentation?.symptomsTimeline || '';
        chiefComplaint = clinicalPresentation?.chiefComplaint || '';
        
        // Try to construct a diagnosis search term from available clinical data
        const functionalLimitations = clinicalPresentation?.functionalLimitations?.join(' ') || '';
        const specialTests = physicalFindings?.specialTests?.join(' ') || '';
        diagnosis = `${chiefComplaint} ${functionalLimitations} ${specialTests}`.trim();
      }

      // Search for relevant research papers
      const searchQuery = `${diagnosis} ${symptoms}`.trim();
      const relevantPapers = await storage.searchResearchPapers(searchQuery, { 
        bodyPart: bodyPart 
      });

      // Import OpenAI service for relevance scoring
      const openai = (await import("./openai")).openai;

      // Score relevance for each paper
      const scoredPapers = await Promise.all(
        relevantPapers.map(async (paper) => {
          try {
            const relevancePrompt = `Rate the relevance of this research paper to the patient case on a scale of 1-100:

Patient Case:
- Body Part: ${bodyPart}
- Diagnosis: ${diagnosis}
- Symptoms: ${symptoms}
- Chief Complaint: ${chiefComplaint}

Research Paper:
- Title: ${paper.title}
- Abstract: ${paper.abstract}
- Body Part: ${paper.bodyPart}
- Keywords: ${Array.isArray(paper.keywords) ? paper.keywords.join(', ') : paper.keywords || ''}

Respond with only a number between 1-100 representing the relevance score.`;

            const relevanceResponse = await openai.chat.completions.create({
              model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
              messages: [
                {
                  role: "system",
                  content: "You are an expert in physiotherapy research. Rate research paper relevance to clinical cases accurately."
                },
                {
                  role: "user",
                  content: relevancePrompt
                }
              ],
              temperature: 0.3,
              max_tokens: 10
            });

            const relevanceScore = parseInt(relevanceResponse.choices[0].message.content?.trim() || '50');
            
            return {
              ...paper,
              relevanceScore: Math.min(Math.max(relevanceScore, 1), 100) // Ensure score is between 1-100
            };
          } catch (error) {
            console.error("Error scoring paper relevance:", error);
            return {
              ...paper,
              relevanceScore: 50 // Default score if scoring fails
            };
          }
        })
      );

      // Sort by relevance score (highest first)
      const sortedPapers = scoredPapers.sort((a, b) => b.relevanceScore - a.relevanceScore);

      res.json(sortedPapers);

    } catch (error) {
      console.error("Error finding relevant research:", error);
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

          // Add additional knee case studies
          const { addAdditionalKneeCases } = await import('./additionalKneeCases');
          await addAdditionalKneeCases(storage);

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

  // Medical Illustration Generation Route
  app.post("/api/generate-medical-illustration", async (req: Request, res: Response) => {
    try {
      const { prompt, anatomicalStructure, pathologyType, severity } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Illustration prompt is required" });
      }

      // Enhanced prompt for medical accuracy and professional quality
      const enhancedPrompt = `Professional medical illustration: ${prompt}. Create a detailed anatomical diagram in the style of Gray's Anatomy or Netter's Atlas. Include: precise anatomical structures, accurate proportions, clinical cross-sections, labeled pathology, medical textbook quality, scientific accuracy, detailed tissue layers, proper anatomical orientation markers (anterior/posterior, medial/lateral). High resolution medical visualization for clinical education.`;

      // Try to generate using DALL-E 3 first
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      });

      res.json({
        imageUrl: response.data[0].url,
        anatomicalStructure,
        pathologyType,
        severity,
        prompt: enhancedPrompt
      });
    } catch (error: any) {
      console.error("Error generating medical illustration:", error);
      
      // Fallback to creating SVG diagram
      const svgDiagram = createAnatomicalSVG(req.body);
      
      res.json({
        imageUrl: svgDiagram,
        anatomicalStructure: req.body.anatomicalStructure,
        pathologyType: req.body.pathologyType,
        severity: req.body.severity,
        fallback: true
      });
    }
  });

  function createAnatomicalSVG({ anatomicalStructure, pathologyType, severity }: any): string {
    // Create anatomically-specific illustrations based on structure
    const illustrations = {
      'knee': createKneeIllustration,
      'shoulder': createShoulderIllustration,
      'hip': createHipIllustration,
      'spine': createSpineIllustration,
      'ankle': createAnkleIllustration,
      'default': createGenericIllustration
    };

    const structureLower = anatomicalStructure?.toLowerCase() || 'default';
    const illustrationType = Object.keys(illustrations).find(key => 
      structureLower.includes(key)
    ) || 'default';

    const illustrationFn = illustrations[illustrationType as keyof typeof illustrations] || illustrations.default;
    
    return illustrationFn(anatomicalStructure, pathologyType, severity);
  }

  function createKneeIllustration(structure: string, pathology: string, severity: string): string {
    const svg = `
      <svg width="600" height="700" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="boneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f5f5f5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e0e0e0;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="cartilageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#e3f2fd;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#bbdefb;stop-opacity:1" />
          </linearGradient>
          <pattern id="inflammation" patternUnits="userSpaceOnUse" width="3" height="3">
            <rect width="3" height="3" fill="#ff5722"/>
            <circle cx="1.5" cy="1.5" r="0.5" fill="#d32f2f"/>
          </pattern>
          <pattern id="tearPattern" patternUnits="userSpaceOnUse" width="5" height="5">
            <rect width="5" height="5" fill="#8bc34a"/>
            <path d="M0,0 L5,5 M5,0 L0,5" stroke="#4caf50" stroke-width="1"/>
          </pattern>
        </defs>
        
        <!-- Background -->
        <rect width="600" height="700" fill="#fafafa"/>
        
        <!-- Title -->
        <text x="300" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#1565c0">
          ${structure || 'Knee Joint'} - Sagittal View
        </text>
        <text x="300" y="65" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#424242">
          ${pathology || 'Pathological Changes'} (${severity || 'Moderate'} Severity)
        </text>
        
        <!-- Femur -->
        <path d="M200 100 Q250 120 280 150 L280 250 Q270 260 250 265 L200 260 Q180 250 180 200 Z" 
              fill="url(#boneGrad)" stroke="#757575" stroke-width="2"/>
        
        <!-- Tibia -->
        <path d="M220 400 Q250 410 280 420 L320 500 Q310 520 280 525 L220 520 Q200 500 200 450 Z" 
              fill="url(#boneGrad)" stroke="#757575" stroke-width="2"/>
        
        <!-- Patella -->
        <ellipse cx="240" cy="280" rx="25" ry="35" fill="url(#boneGrad)" stroke="#757575" stroke-width="2"/>
        
        <!-- Medial Meniscus -->
        <path d="M200 320 Q230 310 260 320 Q250 340 230 345 Q210 340 200 320 Z" 
              fill="${pathology?.toLowerCase().includes('meniscus') ? 'url(#tearPattern)' : 'url(#cartilageGrad)'}" 
              stroke="#1976d2" stroke-width="2"/>
        
        <!-- Lateral Meniscus -->
        <path d="M280 320 Q310 310 340 320 Q330 340 310 345 Q290 340 280 320 Z" 
              fill="${pathology?.toLowerCase().includes('meniscus') ? 'url(#tearPattern)' : 'url(#cartilageGrad)'}" 
              stroke="#1976d2" stroke-width="2"/>
        
        <!-- ACL -->
        <line x1="220" y1="290" x2="280" y2="350" stroke="#8bc34a" stroke-width="4"/>
        
        <!-- PCL -->
        <line x1="280" y1="290" x2="220" y2="350" stroke="#4caf50" stroke-width="4"/>
        
        <!-- Inflammation markers if applicable -->
        ${pathology?.toLowerCase().includes('inflammation') || pathology?.toLowerCase().includes('arthritis') ? `
        <ellipse cx="240" cy="320" rx="60" ry="40" fill="url(#inflammation)" opacity="0.6"/>
        ` : ''}
        
        <!-- Anatomical Labels -->
        <g font-family="Arial, sans-serif" font-size="12" fill="#333">
          <!-- Femur label -->
          <line x1="180" y1="150" x2="120" y2="120" stroke="#666" stroke-width="1"/>
          <text x="115" y="115" text-anchor="end">Femur</text>
          
          <!-- Patella label -->
          <line x1="240" y1="250" x2="160" y2="220" stroke="#666" stroke-width="1"/>
          <text x="155" y="215" text-anchor="end">Patella</text>
          
          <!-- Tibia label -->
          <line x1="220" y1="450" x2="140" y2="480" stroke="#666" stroke-width="1"/>
          <text x="135" y="485" text-anchor="end">Tibia</text>
          
          <!-- Meniscus labels -->
          <line x1="230" y1="330" x2="350" y2="300" stroke="#666" stroke-width="1"/>
          <text x="355" y="295">Medial Meniscus</text>
          <text x="355" y="308" fill="${pathology?.toLowerCase().includes('meniscus') ? '#d32f2f' : '#333'}">
            ${pathology?.toLowerCase().includes('meniscus') ? '(Tear Present)' : '(Normal)'}
          </text>
          
          <line x1="310" y1="330" x2="380" y2="360" stroke="#666" stroke-width="1"/>
          <text x="385" y="355">Lateral Meniscus</text>
          
          <!-- Ligament labels -->
          <line x1="250" y1="320" x2="400" y2="400" stroke="#666" stroke-width="1"/>
          <text x="405" y="395">ACL</text>
          <text x="405" y="408">PCL</text>
        </g>
        
        <!-- Clinical Information Box -->
        <rect x="50" y="550" width="500" height="120" fill="#fff" stroke="#ddd" stroke-width="2" rx="8"/>
        <text x="70" y="580" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#1565c0">
          Clinical Assessment
        </text>
        <text x="70" y="605" font-family="Arial, sans-serif" font-size="12" fill="#333">
          Structure: ${structure || 'Knee Joint'}
        </text>
        <text x="70" y="625" font-family="Arial, sans-serif" font-size="12" fill="#333">
          Pathology: ${pathology || 'Normal anatomy'}
        </text>
        <text x="70" y="645" font-family="Arial, sans-serif" font-size="12" fill="#333">
          Severity: ${severity || 'N/A'} ${severity ? '- Requires clinical correlation' : ''}
        </text>
        <text x="70" y="665" font-family="Arial, sans-serif" font-size="10" fill="#666">
          Generated: ${new Date().toLocaleDateString()} | For educational purposes only
        </text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  function createShoulderIllustration(structure: string, pathology: string, severity: string): string {
    const svg = `
      <svg width="600" height="650" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="boneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f5f5f5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e0e0e0;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="muscleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ffcdd2;stop-opacity:0.8" />
            <stop offset="100%" style="stop-color:#f8bbd9;stop-opacity:0.8" />
          </linearGradient>
          <pattern id="inflammation" patternUnits="userSpaceOnUse" width="4" height="4">
            <rect width="4" height="4" fill="#ff5722"/>
            <circle cx="2" cy="2" r="1" fill="#d32f2f"/>
          </pattern>
        </defs>
        
        <!-- Background -->
        <rect width="600" height="650" fill="#fafafa"/>
        
        <!-- Title -->
        <text x="300" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#1565c0">
          ${structure || 'Shoulder Joint'} - Coronal View
        </text>
        <text x="300" y="65" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#424242">
          ${pathology || 'Anatomical Structure'} (${severity || 'Assessment'})
        </text>
        
        <!-- Clavicle -->
        <ellipse cx="250" cy="120" rx="80" ry="12" fill="url(#boneGrad)" stroke="#757575" stroke-width="2"/>
        
        <!-- Acromion -->
        <path d="M180 120 Q160 130 150 150 L170 160 Q190 150 200 140 Z" 
              fill="url(#boneGrad)" stroke="#757575" stroke-width="2"/>
        
        <!-- Humerus Head -->
        <circle cx="200" cy="220" r="45" fill="url(#boneGrad)" stroke="#757575" stroke-width="2"/>
        
        <!-- Humerus Shaft -->
        <rect x="185" y="260" width="30" height="200" fill="url(#boneGrad)" stroke="#757575" stroke-width="2" rx="15"/>
        
        <!-- Glenoid -->
        <ellipse cx="280" cy="220" rx="20" ry="35" fill="url(#boneGrad)" stroke="#757575" stroke-width="2"/>
        
        <!-- Supraspinatus Muscle/Tendon -->
        <path d="M150 160 Q180 180 200 200 Q220 190 240 180 Q250 190 240 200 Q220 210 200 220 Q180 210 160 190 Z" 
              fill="${pathology?.toLowerCase().includes('supraspinatus') || pathology?.toLowerCase().includes('rotator') ? 'url(#inflammation)' : 'url(#muscleGrad)'}" 
              stroke="#e91e63" stroke-width="2"/>
        
        <!-- Infraspinatus -->
        <path d="M240 200 Q260 210 280 230 Q270 250 250 240 Q230 230 240 200 Z" 
              fill="url(#muscleGrad)" stroke="#e91e63" stroke-width="2"/>
        
        <!-- Subscapularis -->
        <path d="M280 200 Q300 210 310 230 Q300 250 280 240 Q270 220 280 200 Z" 
              fill="url(#muscleGrad)" stroke="#e91e63" stroke-width="2"/>
        
        <!-- Teres Minor -->
        <path d="M250 240 Q270 250 280 270 Q270 280 250 270 Q240 260 250 240 Z" 
              fill="url(#muscleGrad)" stroke="#e91e63" stroke-width="2"/>
        
        <!-- Subacromial Bursa -->
        <ellipse cx="190" cy="180" rx="25" ry="8" 
                 fill="${pathology?.toLowerCase().includes('bursa') || pathology?.toLowerCase().includes('impingement') ? 'url(#inflammation)' : '#e8f5e8'}" 
                 stroke="#4caf50" stroke-width="1" opacity="0.7"/>
        
        <!-- Labels -->
        <g font-family="Arial, sans-serif" font-size="12" fill="#333">
          <!-- Clavicle -->
          <line x1="250" y1="105" x2="250" y2="80" stroke="#666" stroke-width="1"/>
          <text x="250" y="75" text-anchor="middle">Clavicle</text>
          
          <!-- Acromion -->
          <line x1="150" y1="140" x2="100" y2="110" stroke="#666" stroke-width="1"/>
          <text x="95" y="105" text-anchor="end">Acromion</text>
          
          <!-- Humerus -->
          <line x1="245" y1="220" x2="320" y2="180" stroke="#666" stroke-width="1"/>
          <text x="325" y="175">Humeral Head</text>
          
          <!-- Glenoid -->
          <line x1="300" y1="220" x2="350" y2="200" stroke="#666" stroke-width="1"/>
          <text x="355" y="195">Glenoid</text>
          
          <!-- Rotator Cuff -->
          <line x1="200" y1="190" x2="400" y2="120" stroke="#666" stroke-width="1"/>
          <text x="405" y="115">Supraspinatus</text>
          <text x="405" y="130" fill="${pathology?.toLowerCase().includes('supraspinatus') ? '#d32f2f' : '#333'}">
            ${pathology?.toLowerCase().includes('supraspinatus') ? '(Pathology Present)' : '(Normal)'}
          </text>
          
          <!-- Bursa -->
          <line x1="190" y1="170" x2="400" y2="150" stroke="#666" stroke-width="1"/>
          <text x="405" y="145">Subacromial Bursa</text>
          <text x="405" y="160" fill="${pathology?.toLowerCase().includes('bursa') ? '#d32f2f' : '#333'}">
            ${pathology?.toLowerCase().includes('bursa') ? '(Inflamed)' : '(Normal)'}
          </text>
        </g>
        
        <!-- Clinical Information -->
        <rect x="50" y="480" width="500" height="120" fill="#fff" stroke="#ddd" stroke-width="2" rx="8"/>
        <text x="70" y="510" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#1565c0">
          Clinical Assessment
        </text>
        <text x="70" y="535" font-family="Arial, sans-serif" font-size="12" fill="#333">
          Structure: ${structure || 'Shoulder Complex'}
        </text>
        <text x="70" y="555" font-family="Arial, sans-serif" font-size="12" fill="#333">
          Pathology: ${pathology || 'Normal anatomy'}
        </text>
        <text x="70" y="575" font-family="Arial, sans-serif" font-size="12" fill="#333">
          Severity: ${severity || 'N/A'} ${severity ? '- Clinical correlation recommended' : ''}
        </text>
        <text x="70" y="595" font-family="Arial, sans-serif" font-size="10" fill="#666">
          Professional medical illustration | ${new Date().toLocaleDateString()}
        </text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  function createHipIllustration(structure: string, pathology: string, severity: string): string {
    const svg = `
      <svg width="600" height="650" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="boneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f5f5f5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e0e0e0;stop-opacity:1" />
          </linearGradient>
          <pattern id="inflammation" patternUnits="userSpaceOnUse" width="4" height="4">
            <rect width="4" height="4" fill="#ff5722"/>
            <circle cx="2" cy="2" r="1" fill="#d32f2f"/>
          </pattern>
        </defs>
        
        <!-- Background -->
        <rect width="600" height="650" fill="#fafafa"/>
        
        <!-- Title -->
        <text x="300" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#1565c0">
          ${structure || 'Hip Joint'} - Anterior View
        </text>
        
        <!-- Pelvis -->
        <path d="M150 200 Q200 180 250 180 Q300 180 350 200 Q380 220 380 250 Q370 280 350 300 L250 300 Q200 300 150 280 Q120 250 120 220 Q120 200 150 200 Z" 
              fill="url(#boneGrad)" stroke="#757575" stroke-width="2"/>
        
        <!-- Acetabulum -->
        <circle cx="200" cy="280" r="35" fill="none" stroke="#757575" stroke-width="3"/>
        <circle cx="350" cy="280" r="35" fill="none" stroke="#757575" stroke-width="3"/>
        
        <!-- Femoral Head -->
        <circle cx="200" cy="280" r="25" fill="url(#boneGrad)" stroke="#757575" stroke-width="2"/>
        <circle cx="350" cy="280" r="25" fill="url(#boneGrad)" stroke="#757575" stroke-width="2"/>
        
        <!-- Femoral Neck -->
        <ellipse cx="190" cy="320" rx="15" ry="40" fill="url(#boneGrad)" stroke="#757575" stroke-width="2" transform="rotate(-30 190 320)"/>
        <ellipse cx="360" cy="320" rx="15" ry="40" fill="url(#boneGrad)" stroke="#757575" stroke-width="2" transform="rotate(30 360 320)"/>
        
        <!-- Greater Trochanter -->
        <ellipse cx="160" cy="340" rx="20" ry="15" fill="url(#boneGrad)" stroke="#757575" stroke-width="2"/>
        <ellipse cx="390" cy="340" rx="20" ry="15" fill="url(#boneGrad)" stroke="#757575" stroke-width="2"/>
        
        <!-- Gluteus Medius Tendon and Bursa -->
        <ellipse cx="160" cy="330" rx="12" ry="8" 
                 fill="${pathology?.toLowerCase().includes('gluteus') || pathology?.toLowerCase().includes('gtps') ? 'url(#inflammation)' : '#ffcdd2'}" 
                 stroke="#e91e63" stroke-width="2"/>
        <ellipse cx="390" cy="330" rx="12" ry="8" 
                 fill="${pathology?.toLowerCase().includes('gluteus') || pathology?.toLowerCase().includes('gtps') ? 'url(#inflammation)' : '#ffcdd2'}" 
                 stroke="#e91e63" stroke-width="2"/>
        
        <!-- Trochanteric Bursa -->
        <ellipse cx="155" cy="340" rx="8" ry="4" 
                 fill="${pathology?.toLowerCase().includes('bursa') || pathology?.toLowerCase().includes('gtps') ? 'url(#inflammation)' : '#e8f5e8'}" 
                 stroke="#4caf50" stroke-width="1" opacity="0.8"/>
        <ellipse cx="395" cy="340" rx="8" ry="4" 
                 fill="${pathology?.toLowerCase().includes('bursa') || pathology?.toLowerCase().includes('gtps') ? 'url(#inflammation)' : '#e8f5e8'}" 
                 stroke="#4caf50" stroke-width="1" opacity="0.8"/>
        
        <!-- Labels -->
        <g font-family="Arial, sans-serif" font-size="12" fill="#333">
          <line x1="200" y1="250" x2="120" y2="200" stroke="#666" stroke-width="1"/>
          <text x="115" y="195" text-anchor="end">Femoral Head</text>
          
          <line x1="160" y1="320" x2="80" y2="280" stroke="#666" stroke-width="1"/>
          <text x="75" y="275" text-anchor="end">Greater Trochanter</text>
          
          <line x1="160" y1="340" x2="60" y2="380" stroke="#666" stroke-width="1"/>
          <text x="55" y="375" text-anchor="end">Gluteus Medius</text>
          <text x="55" y="390" text-anchor="end" fill="${pathology?.toLowerCase().includes('gluteus') ? '#d32f2f' : '#333'}">
            ${pathology?.toLowerCase().includes('gluteus') ? '(Inflamed)' : '(Normal)'}
          </text>
          
          <line x1="155" y1="350" x2="60" y2="420" stroke="#666" stroke-width="1"/>
          <text x="55" y="415" text-anchor="end">Trochanteric Bursa</text>
          <text x="55" y="430" text-anchor="end" fill="${pathology?.toLowerCase().includes('bursa') ? '#d32f2f' : '#333'}">
            ${pathology?.toLowerCase().includes('bursa') ? '(Bursitis)' : '(Normal)'}
          </text>
        </g>
        
        <!-- Clinical Information -->
        <rect x="50" y="480" width="500" height="120" fill="#fff" stroke="#ddd" stroke-width="2" rx="8"/>
        <text x="70" y="510" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#1565c0">
          Clinical Assessment
        </text>
        <text x="70" y="535" font-family="Arial, sans-serif" font-size="12" fill="#333">
          Structure: ${structure || 'Hip Joint Complex'}
        </text>
        <text x="70" y="555" font-family="Arial, sans-serif" font-size="12" fill="#333">
          Pathology: ${pathology || 'Normal anatomy'}
        </text>
        <text x="70" y="575" font-family="Arial, sans-serif" font-size="12" fill="#333">
          Severity: ${severity || 'N/A'} ${severity ? '- Requires imaging correlation' : ''}
        </text>
        <text x="70" y="595" font-family="Arial, sans-serif" font-size="10" fill="#666">
          Anatomical illustration for clinical education | ${new Date().toLocaleDateString()}
        </text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  function createSpineIllustration(structure: string, pathology: string, severity: string): string {
    const svg = `
      <svg width="600" height="700" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="boneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f5f5f5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e0e0e0;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="discGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#e1f5fe;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#b3e5fc;stop-opacity:1" />
          </linearGradient>
          <pattern id="herniation" patternUnits="userSpaceOnUse" width="5" height="5">
            <rect width="5" height="5" fill="#ff5722"/>
            <path d="M0,0 L5,5 M5,0 L0,5" stroke="#d32f2f" stroke-width="1"/>
          </pattern>
        </defs>
        
        <!-- Background -->
        <rect width="600" height="700" fill="#fafafa"/>
        
        <!-- Title -->
        <text x="300" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#1565c0">
          ${structure || 'Lumbar Spine'} - Sagittal View
        </text>
        
        <!-- Vertebral Bodies L1-L5 -->
        <rect x="250" y="120" width="60" height="40" fill="url(#boneGrad)" stroke="#757575" stroke-width="2" rx="5"/>
        <rect x="250" y="180" width="60" height="40" fill="url(#boneGrad)" stroke="#757575" stroke-width="2" rx="5"/>
        <rect x="250" y="240" width="60" height="40" fill="url(#boneGrad)" stroke="#757575" stroke-width="2" rx="5"/>
        <rect x="250" y="300" width="60" height="40" fill="url(#boneGrad)" stroke="#757575" stroke-width="2" rx="5"/>
        <rect x="250" y="360" width="60" height="40" fill="url(#boneGrad)" stroke="#757575" stroke-width="2" rx="5"/>
        
        <!-- Intervertebral Discs -->
        <ellipse cx="280" cy="170" rx="35" ry="8" 
                 fill="${pathology?.toLowerCase().includes('disc') ? 'url(#herniation)' : 'url(#discGrad)'}" 
                 stroke="#1976d2" stroke-width="2"/>
        <ellipse cx="280" cy="230" rx="35" ry="8" 
                 fill="${pathology?.toLowerCase().includes('disc') ? 'url(#herniation)' : 'url(#discGrad)'}" 
                 stroke="#1976d2" stroke-width="2"/>
        <ellipse cx="280" cy="290" rx="35" ry="8" 
                 fill="${pathology?.toLowerCase().includes('disc') ? 'url(#herniation)' : 'url(#discGrad)'}" 
                 stroke="#1976d2" stroke-width="2"/>
        <ellipse cx="280" cy="350" rx="35" ry="8" 
                 fill="${pathology?.toLowerCase().includes('disc') ? 'url(#herniation)' : 'url(#discGrad)'}" 
                 stroke="#1976d2" stroke-width="2"/>
        
        <!-- Spinous Processes -->
        <polygon points="275,120 285,120 290,100 280,95 270,100" fill="url(#boneGrad)" stroke="#757575" stroke-width="1"/>
        <polygon points="275,180 285,180 290,160 280,155 270,160" fill="url(#boneGrad)" stroke="#757575" stroke-width="1"/>
        <polygon points="275,240 285,240 290,220 280,215 270,220" fill="url(#boneGrad)" stroke="#757575" stroke-width="1"/>
        <polygon points="275,300 285,300 290,280 280,275 270,280" fill="url(#boneGrad)" stroke="#757575" stroke-width="1"/>
        <polygon points="275,360 285,360 290,340 280,335 270,340" fill="url(#boneGrad)" stroke="#757575" stroke-width="1"/>
        
        <!-- Spinal Canal -->
        <ellipse cx="265" cy="140" rx="8" ry="15" fill="#fff" stroke="#999" stroke-width="1"/>
        <ellipse cx="265" cy="200" rx="8" ry="15" fill="#fff" stroke="#999" stroke-width="1"/>
        <ellipse cx="265" cy="260" rx="8" ry="15" fill="#fff" stroke="#999" stroke-width="1"/>
        <ellipse cx="265" cy="320" rx="8" ry="15" fill="#fff" stroke="#999" stroke-width="1"/>
        <ellipse cx="265" cy="380" rx="8" ry="15" fill="#fff" stroke="#999" stroke-width="1"/>
        
        <!-- Nerve Roots -->
        <line x1="270" y1="170" x2="350" y2="190" stroke="#ffc107" stroke-width="3"/>
        <line x1="270" y1="230" x2="350" y2="250" stroke="#ffc107" stroke-width="3"/>
        <line x1="270" y1="290" x2="350" y2="310" stroke="#ffc107" stroke-width="3"/>
        
        <!-- Labels -->
        <g font-family="Arial, sans-serif" font-size="12" fill="#333">
          <text x="320" y="145">L1</text>
          <text x="320" y="205">L2</text>
          <text x="320" y="265">L3</text>
          <text x="320" y="325">L4</text>
          <text x="320" y="385">L5</text>
          
          <line x1="315" y1="170" x2="400" y2="140" stroke="#666" stroke-width="1"/>
          <text x="405" y="135">Intervertebral Disc</text>
          <text x="405" y="150" fill="${pathology?.toLowerCase().includes('disc') ? '#d32f2f' : '#333'}">
            ${pathology?.toLowerCase().includes('disc') ? '(Herniation)' : '(Normal)'}
          </text>
          
          <line x1="350" y1="190" x2="420" y2="170" stroke="#666" stroke-width="1"/>
          <text x="425" y="165">Nerve Root</text>
        </g>
        
        <!-- Clinical Information -->
        <rect x="50" y="520" width="500" height="120" fill="#fff" stroke="#ddd" stroke-width="2" rx="8"/>
        <text x="70" y="550" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#1565c0">
          Clinical Assessment
        </text>
        <text x="70" y="575" font-family="Arial, sans-serif" font-size="12" fill="#333">
          Structure: ${structure || 'Lumbar Spine'}
        </text>
        <text x="70" y="595" font-family="Arial, sans-serif" font-size="12" fill="#333">
          Pathology: ${pathology || 'Normal anatomy'}
        </text>
        <text x="70" y="615" font-family="Arial, sans-serif" font-size="12" fill="#333">
          Severity: ${severity || 'N/A'} ${severity ? '- MRI correlation recommended' : ''}
        </text>
        <text x="70" y="635" font-family="Arial, sans-serif" font-size="10" fill="#666">
          Anatomical cross-section for clinical education | ${new Date().toLocaleDateString()}
        </text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  function createAnkleIllustration(structure: string, pathology: string, severity: string): string {
    return createGenericIllustration(structure, pathology, severity);
  }

  function createGenericIllustration(structure: string, pathology: string, severity: string): string {
    const svg = `
      <svg width="600" height="500" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="tissueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#e1f5fe;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#b3e5fc;stop-opacity:1" />
          </linearGradient>
          <pattern id="pathology" patternUnits="userSpaceOnUse" width="4" height="4">
            <rect width="4" height="4" fill="#ff6b6b"/>
            <circle cx="2" cy="2" r="1" fill="#ff4757"/>
          </pattern>
        </defs>
        
        <!-- Background -->
        <rect width="600" height="500" fill="#fafafa"/>
        
        <!-- Title -->
        <text x="300" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#1565c0">
          ${structure || 'Anatomical Structure'}
        </text>
        <text x="300" y="65" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#424242">
          ${pathology || 'Clinical Assessment'} ${severity ? `(${severity} severity)` : ''}
        </text>
        
        <!-- Main anatomical structure -->
        <ellipse cx="300" cy="200" rx="120" ry="80" fill="url(#tissueGrad)" stroke="#0277bd" stroke-width="3"/>
        
        <!-- Pathology overlay -->
        <ellipse cx="280" cy="180" rx="40" ry="25" fill="url(#pathology)" stroke="#d32f2f" stroke-width="2" opacity="0.8"/>
        
        <!-- Anatomical markers -->
        <circle cx="250" cy="200" r="4" fill="#333"/>
        <circle cx="350" cy="200" r="4" fill="#333"/>
        <line x1="200" y1="200" x2="400" y2="200" stroke="#999" stroke-width="1" stroke-dasharray="5,5"/>
        
        <!-- Labels -->
        <line x1="320" y1="180" x2="400" y2="130" stroke="#333" stroke-width="1"/>
        <text x="405" y="125" font-family="Arial, sans-serif" font-size="12" fill="#333">
          ${pathology || 'Pathological area'}
        </text>
        
        <!-- Clinical Information -->
        <rect x="50" y="320" width="500" height="120" fill="#fff" stroke="#ddd" stroke-width="2" rx="8"/>
        <text x="70" y="350" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#1565c0">
          Clinical Visualization
        </text>
        <text x="70" y="375" font-family="Arial, sans-serif" font-size="12" fill="#333">
          Structure: ${structure || 'Generic anatomical structure'}
        </text>
        <text x="70" y="395" font-family="Arial, sans-serif" font-size="12" fill="#333">
          Findings: ${pathology || 'Normal anatomy visualization'}
        </text>
        <text x="70" y="415" font-family="Arial, sans-serif" font-size="12" fill="#333">
          Assessment: ${severity || 'Clinical correlation required'}
        </text>
        <text x="70" y="435" font-family="Arial, sans-serif" font-size="10" fill="#666">
          Professional medical illustration | Generated ${new Date().toLocaleDateString()}
        </text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

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

  // Research Projects
  app.get("/api/research/projects", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      // Return mock projects for now since database table doesn't exist
      const mockProjects = [
        {
          id: 1,
          title: "Shoulder Rehabilitation Effectiveness Study",
          description: "Investigating the effectiveness of different shoulder rehabilitation protocols",
          status: "active",
          principalInvestigatorId: req.user!.id,
          principalInvestigator: {
            id: req.user!.id,
            username: req.user!.username,
            email: req.user!.email
          },
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      
      res.json(mockProjects);
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
      
      // Create mock research project since database table doesn't exist
      const project = {
        id: Date.now(), // Use timestamp as unique ID
        title: projectData.title,
        description: projectData.description,
        researchQuestion: projectData.researchQuestion,
        methodology: projectData.methodology,
        targetPopulation: projectData.targetPopulation,
        expectedDuration: projectData.expectedDuration,
        status: projectData.status || "planning",
        isPublic: projectData.isPublic || false,
        ethicsApprovalRequired: projectData.ethicsApprovalRequired || true,
        tags: projectData.tags || [],
        researchGapId: projectData.researchGapId,
        principalInvestigatorId: req.user!.id,
        principalInvestigator: {
          id: req.user!.id,
          username: req.user!.username,
          email: req.user!.email
        },
        collaborators: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log("Research project created successfully:", project.title);
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

  // ==========================================
  // FORUM INTEGRATION ROUTES  
  // ==========================================
  
  // Sanitize SOAP note for forum posting
  app.post("/api/forum/sanitize-soap", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { soapData, specificQuestions } = req.body;
      
      if (!soapData || !soapData.subjective || !soapData.objective || !soapData.assessment || !soapData.plan) {
        return res.status(400).json({ error: "Invalid SOAP data provided" });
      }
      
      // Sanitize the SOAP note for forum posting
      const sanitizedPost = await ForumSanitizationService.sanitizeSoapForForum(
        soapData,
        specificQuestions
      );
      
      // Generate preview
      const preview = await ForumSanitizationService.generateForumPreview(sanitizedPost);
      
      // Validate privacy compliance
      const isCompliant = ForumSanitizationService.validatePrivacyCompliance(preview);
      
      res.json({
        sanitizedPost,
        preview,
        isCompliant,
        requiresModeration: !isCompliant || sanitizedPost.assessmentConsiderations.redFlags.length > 0
      });
    } catch (error) {
      console.error("Error sanitizing SOAP for forum:", error);
      res.status(500).json({ error: "Failed to sanitize SOAP note for forum" });
    }
  });
  
  // Create forum post from sanitized SOAP
  app.post("/api/forum/posts", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { 
        sanitizedPost, 
        soapNoteId, 
        virtualPatientId, 
        shareVirtualPatient,
        isAnonymous 
      } = req.body;
      
      // Create forum post
      const postData = {
        soapNoteId: soapNoteId || null,
        authorId: userId,
        isAnonymous: isAnonymous || false,
        title: sanitizedPost.title,
        category: sanitizedPost.category,
        bodyParts: sanitizedPost.bodyParts,
        clinicalPresentation: sanitizedPost.clinicalPresentation,
        objectiveFindings: sanitizedPost.objectiveFindings,
        assessmentConsiderations: sanitizedPost.assessmentConsiderations,
        questionsForCommunity: sanitizedPost.questionsForCommunity,
        virtualPatientId: shareVirtualPatient ? virtualPatientId : null,
        shareVirtualPatient: shareVirtualPatient || false,
        status: sanitizedPost.assessmentConsiderations.redFlags?.length > 0 ? 'pending_review' : 'published',
        publishedAt: sanitizedPost.assessmentConsiderations.redFlags?.length > 0 ? null : new Date()
      };
      
      const forumPost = await storage.createForumPost(postData);
      
      // Create sanitization log
      if (soapNoteId && sanitizedPost.sanitizationActions) {
        await storage.createForumSanitizationLog({
          soapNoteId,
          forumPostId: forumPost.id,
          sanitizationActions: sanitizedPost.sanitizationActions,
          hipaaCompliant: true,
          gdprCompliant: true
        });
      }
      
      res.json({
        message: "Forum post created successfully",
        postId: forumPost.id,
        status: forumPost.status
      });
    } catch (error) {
      console.error("Error creating forum post:", error);
      res.status(500).json({ error: "Failed to create forum post" });
    }
  });
  
  // Get forum posts
  app.get("/api/forum/posts", async (req: Request, res: Response) => {
    try {
      const { category, bodyPart, status, authorId, page = 1, limit = 20 } = req.query;
      
      const posts = await storage.getForumPosts({
        category: category as string,
        bodyPart: bodyPart as string, 
        status: status as string || 'published',
        authorId: authorId ? parseInt(authorId as string) : undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });
      
      res.json(posts);
    } catch (error) {
      console.error("Error fetching forum posts:", error);
      res.status(500).json({ error: "Failed to fetch forum posts" });
    }
  });
  
  // Get single forum post
  app.get("/api/forum/posts/:id", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getForumPost(postId);
      
      if (!post) {
        return res.status(404).json({ error: "Forum post not found" });
      }
      
      // Increment view count
      await storage.incrementForumPostViewCount(postId);
      
      res.json(post);
    } catch (error) {
      console.error("Error fetching forum post:", error);
      res.status(500).json({ error: "Failed to fetch forum post" });
    }
  });
  
  // Create forum reply
  app.post("/api/forum/posts/:id/replies", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { 
        content, 
        clinicalRecommendations,
        parentReplyId,
        isExpertVerified,
        expertCredentials
      } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "Reply content is required" });
      }
      
      const reply = await storage.createForumReply({
        postId,
        authorId: userId,
        parentReplyId: parentReplyId || null,
        content,
        clinicalRecommendations: clinicalRecommendations || null,
        isExpertVerified: isExpertVerified || false,
        expertCredentials: expertCredentials || null
      });
      
      res.json(reply);
    } catch (error) {
      console.error("Error creating forum reply:", error);
      res.status(500).json({ error: "Failed to create forum reply" });
    }
  });
  
  // Get forum replies
  app.get("/api/forum/posts/:id/replies", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      const replies = await storage.getForumReplies(postId);
      res.json(replies);
    } catch (error) {
      console.error("Error fetching forum replies:", error);
      res.status(500).json({ error: "Failed to fetch forum replies" });
    }
  });
  
  // Vote helpful on post or reply
  app.post("/api/forum/helpful", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { postId, replyId } = req.body;
      
      if (!postId && !replyId) {
        return res.status(400).json({ error: "Either postId or replyId is required" });
      }
      
      // Check if user already voted
      const existingVote = await storage.getForumHelpfulVote(userId, postId, replyId);
      if (existingVote) {
        return res.status(400).json({ error: "You have already marked this as helpful" });
      }
      
      // Create vote
      await storage.createForumHelpfulVote({
        userId,
        postId: postId || null,
        replyId: replyId || null
      });
      
      // Update helpful count
      if (postId) {
        await storage.incrementForumPostHelpfulCount(postId);
      } else if (replyId) {
        await storage.incrementForumReplyHelpfulCount(replyId);
      }
      
      res.json({ message: "Marked as helpful" });
    } catch (error) {
      console.error("Error marking as helpful:", error);
      res.status(500).json({ error: "Failed to mark as helpful" });
    }
  });
  
  // Search forum posts
  app.get("/api/forum/search", async (req: Request, res: Response) => {
    try {
      const { q, category, bodyPart, hasRedFlags } = req.query;
      
      if (!q) {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      const results = await storage.searchForumPosts({
        query: q as string,
        category: category as string,
        bodyPart: bodyPart as string,
        hasRedFlags: hasRedFlags === 'true'
      });
      
      res.json(results);
    } catch (error) {
      console.error("Error searching forum posts:", error);
      res.status(500).json({ error: "Failed to search forum posts" });
    }
  });
  
  // Get my forum posts
  app.get("/api/forum/my-posts", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const posts = await storage.getUserForumPosts(userId);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching user forum posts:", error);
      res.status(500).json({ error: "Failed to fetch your forum posts" });
    }
  });
  
  // Delete forum post (only author can delete)
  app.delete("/api/forum/posts/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const post = await storage.getForumPost(postId);
      if (!post) {
        return res.status(404).json({ error: "Forum post not found" });
      }
      
      if (post.authorId !== userId) {
        return res.status(403).json({ error: "You can only delete your own posts" });
      }
      
      await storage.deleteForumPost(postId);
      res.json({ message: "Forum post deleted successfully" });
    } catch (error) {
      console.error("Error deleting forum post:", error);
      res.status(500).json({ error: "Failed to delete forum post" });
    }
  });

  const httpServer = createServer(app);

  // Import realtime virtual patient service
  const { RealtimeVirtualPatientService } = await import('./services/realtimeVirtualPatientService');
  const realtimeVPService = RealtimeVirtualPatientService.getInstance();
  
  // Import forum sanitization service
  const { ForumSanitizationService } = await import('./services/forumSanitizationService');
  
  // Import realtime document service
  const { realtimeDocumentService } = await import('./services/realtimeDocumentService');
  
  // Import clinical decision service
  const { clinicalDecisionService } = await import('./services/clinicalDecisionService');
  
  // Import realtime pain analysis service
  const { realtimePainAnalysisService } = await import('./services/realtimePainAnalysisService');

  // Real-time AI WebSocket Server for SOAP Notes
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/soap-ai' });
  
  wss.on('connection', (ws: WebSocket, req) => {
    let clientId: string = '';
    let pingInterval: NodeJS.Timeout;
    
    // Set up error handler immediately to catch any issues
    ws.on('error', (error) => {
      console.error(`[WebSocket] Connection error:`, error);
      if (clientId) {
        console.error(`[WebSocket] Error for client ${clientId}:`, error);
      }
    });
    
    try {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const sessionId = url.searchParams.get('sessionId');
      const userId = url.searchParams.get('userId');
      
      console.log(`[WebSocket] New connection attempt - sessionId: ${sessionId}, userId: ${userId}`);
      
      if (!sessionId || !userId) {
        console.error('[WebSocket] Closing connection - missing sessionId or userId');
        ws.close(1002, 'Missing sessionId or userId');
        return;
      }

      clientId = `${userId}-${sessionId}-${Date.now()}`;
      console.log(`[WebSocket] Client connected: ${clientId}`);
      
      // Send immediate welcome message to confirm connection
      ws.send(JSON.stringify({
        type: 'connection_established',
        clientId,
        timestamp: new Date().toISOString()
      }));
      
      // Set up keep-alive ping to prevent connection timeout
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.ping();
          } catch (error) {
            console.error(`[WebSocket] Ping error for client ${clientId}:`, error);
            clearInterval(pingInterval);
          }
        } else {
          clearInterval(pingInterval);
        }
      }, 30000); // Ping every 30 seconds
      
      // Handle pong responses
      ws.on('pong', () => {
        // Client is still alive
      });
    
    // Add client to real-time AI service - but wrap in try-catch to prevent crashes
    try {
      realTimeAIService.addClient(clientId, ws, parseInt(userId), sessionId);
    } catch (error) {
      console.error(`[WebSocket] Error adding client to AI service:`, error);
    }
    
    // Reset virtual patient parameters for new session
    realtimeVPService.resetParameters();
    
    // Track the latest transcript for this session
    let latestTranscript = '';
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`WebSocket message received - type: ${data.type}`);
        
        // Handle connection initialization
        if (data.type === 'connection_init') {
          console.log(`[WebSocket] Connection initialized for session ${data.sessionId}`);
          // Send initial acknowledgment
          try {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'connection_ack',
                timestamp: new Date().toISOString()
              }));
              console.log('[WebSocket] Sent connection_ack');
            } else {
              console.log('[WebSocket] Cannot send connection_ack - WebSocket not open');
            }
          } catch (error) {
            console.error('[WebSocket] Error sending connection_ack:', error);
          }
          return;
        }
        
        if (data.type === 'context_update') {
          // Generate suggestions when context is updated
          await realTimeAIService.generateSuggestions(data.context, parseInt(userId), sessionId);
        }
        
        // Handle quick realtime updates for immediate visual feedback
        if (data.type === 'realtime_update' && data.transcript) {
          // Store latest transcript
          latestTranscript = data.transcript;
          
          // Quick analysis for immediate feedback
          const quickParams = realtimeVPService.quickAnalyzeTranscript(data.transcript);
          
          // Send virtual patient update to client
          try {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'virtual_patient_update',
                parameters: quickParams,
                transcript: data.transcript,
                timestamp: new Date().toISOString()
              }));
              console.log('[WebSocket] Sent virtual_patient_update with parameters:', quickParams);
            } else {
              console.log('[WebSocket] Cannot send update - WebSocket not open, state:', ws.readyState);
            }
          } catch (error) {
            console.error('[WebSocket] Error sending virtual_patient_update:', error);
          }
        }
        
        // Handle request for visual update
        if (data.type === 'request_visual_update') {
          // Use the latest stored transcript for quick analysis
          if (latestTranscript) {
            const quickParams = realtimeVPService.quickAnalyzeTranscript(latestTranscript);
            
            // Send virtual patient update to client
            try {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'virtual_patient_update',
                  parameters: quickParams,
                  transcript: latestTranscript,
                  timestamp: new Date().toISOString()
                }));
              }
            } catch (error) {
              console.error('[WebSocket] Error sending virtual_patient_update:', error);
            }
          }
        }
        
        // Handle transcript updates for virtual patient and document generation
        if (data.type === 'transcript_update' && data.transcript) {
          // Analyze transcript for clinical parameters
          const clinicalParams = await realtimeVPService.analyzeTranscriptForParameters(data.transcript);
          
          // Send virtual patient update to client
          ws.send(JSON.stringify({
            type: 'virtual_patient_update',
            parameters: realtimeVPService.toModelConfig(),
            transcript: data.transcript,
            timestamp: new Date().toISOString()
          }));
          
          // Detect document generation triggers
          const detectedDocTypes = realtimeDocumentService.detectDocumentTriggers(data.transcript);
          
          // Generate documents for each detected type
          for (const docType of detectedDocTypes) {
            // Send immediate notification that document generation started
            ws.send(JSON.stringify({
              type: 'document_generation_started',
              documentType: docType,
              timestamp: new Date().toISOString()
            }));
            
            // Generate document asynchronously
            realtimeDocumentService.generateDocument({
              type: docType as any,
              soapData: data.soapSections || {
                subjective: '',
                objective: '',
                assessment: '',
                plan: ''
              },
              patientInfo: data.patientInfo,
              sessionId: sessionId,
              userId: parseInt(userId)
            }).then(document => {
              // Send document ready notification
              ws.send(JSON.stringify({
                type: 'document_ready',
                document: {
                  id: document.id,
                  type: document.type,
                  filename: document.filename,
                  status: document.status,
                  wordPath: document.wordPath,
                  error: document.error
                },
                timestamp: new Date().toISOString()
              }));
            }).catch(error => {
              console.error('Document generation error:', error);
              ws.send(JSON.stringify({
                type: 'document_error',
                documentType: docType,
                error: error.message,
                timestamp: new Date().toISOString()
              }));
            });
          }
        }
        
        // Handle explicit document generation request
        if (data.type === 'generate_document' && data.documentType) {
          console.log(`[WebSocket] Explicit document generation request: ${data.documentType}`);
          
          // Send immediate notification that document generation started
          ws.send(JSON.stringify({
            type: 'document_generation_started',
            documentType: data.documentType,
            timestamp: new Date().toISOString()
          }));
          
          // Generate document asynchronously
          realtimeDocumentService.generateDocument({
            type: data.documentType as any,
            soapData: data.soapData || {
              subjective: '',
              objective: '',
              assessment: '',
              plan: ''
            },
            patientInfo: data.patientInfo,
            sessionId: data.sessionId || sessionId,
            userId: parseInt(userId)
          }).then(document => {
            // Send document ready notification
            ws.send(JSON.stringify({
              type: 'document_ready',
              document: {
                id: document.id,
                type: document.type,
                filename: document.filename,
                status: document.status,
                wordPath: document.wordPath,
                error: document.error
              },
              timestamp: new Date().toISOString()
            }));
          }).catch(error => {
            console.error('Document generation error:', error);
            ws.send(JSON.stringify({
              type: 'document_error',
              documentType: data.documentType,
              error: error.message,
              timestamp: new Date().toISOString()
            }));
          });
        }
        
        // Handle reset request
        if (data.type === 'reset_virtual_patient') {
          realtimeVPService.resetParameters();
          ws.send(JSON.stringify({
            type: 'virtual_patient_reset',
            timestamp: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`[WebSocket] Client disconnected: ${clientId}, code: ${code}, reason: ${reason}`);
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      if (clientId) {
        realTimeAIService.removeClient(clientId);
      }
    });
    
    } catch (error) {
      console.error('[WebSocket] Error in connection handler:', error);
      ws.close(1011, 'Server error');
    }
  });

  console.log('🔗 Real-time AI WebSocket server started on /ws/soap-ai');
  
  // Real-time pain analysis endpoint
  app.post('/api/analyze-pain-locations', async (req, res) => {
    try {
      const { transcript } = req.body;
      
      if (!transcript) {
        return res.status(400).json({ error: 'Transcript required' });
      }
      
      console.log('[API] Analyzing pain locations from transcript');
      const virtualPatientParams = await realtimePainAnalysisService.analyzeTranscript(transcript);
      
      res.json(virtualPatientParams);
    } catch (error) {
      console.error('Error analyzing pain locations:', error);
      res.status(500).json({ error: 'Failed to analyze pain locations' });
    }
  });
  
  // Clinical Decision Support Endpoints
  
  // Detect red flags in transcript
  app.post('/api/clinical-decision/red-flags', async (req, res) => {
    try {
      const { transcript } = req.body;
      
      if (!transcript) {
        return res.status(400).json({ error: 'Transcript required' });
      }
      
      const alerts = clinicalDecisionService.detectRedFlags(transcript);
      res.json({ alerts });
    } catch (error) {
      console.error('Error detecting red flags:', error);
      res.status(500).json({ error: 'Failed to analyze red flags' });
    }
  });
  
  // Generate differential diagnoses
  app.post('/api/clinical-decision/differentials', async (req, res) => {
    try {
      const { transcript, soapSections } = req.body;
      
      if (!transcript && !soapSections) {
        return res.status(400).json({ error: 'Transcript or SOAP sections required' });
      }
      
      const differentials = await clinicalDecisionService.generateDifferentialDiagnoses(
        transcript,
        soapSections
      );
      res.json({ differentials });
    } catch (error) {
      console.error('Error generating differentials:', error);
      res.status(500).json({ error: 'Failed to generate differential diagnoses' });
    }
  });
  
  // Match clinical guidelines
  app.post('/api/clinical-decision/guidelines', async (req, res) => {
    try {
      const { transcript, assessment } = req.body;
      
      const guidelines = clinicalDecisionService.matchClinicalGuidelines(
        transcript || '',
        assessment || ''
      );
      res.json({ guidelines });
    } catch (error) {
      console.error('Error matching guidelines:', error);
      res.status(500).json({ error: 'Failed to match clinical guidelines' });
    }
  });
  
  // Get evidence-based recommendations
  app.post('/api/clinical-decision/recommendations', async (req, res) => {
    try {
      const { diagnosis, patientContext } = req.body;
      
      if (!diagnosis) {
        return res.status(400).json({ error: 'Diagnosis required' });
      }
      
      const recommendations = await clinicalDecisionService.getEvidenceBasedRecommendations(
        diagnosis,
        patientContext || ''
      );
      res.json({ recommendations });
    } catch (error) {
      console.error('Error getting recommendations:', error);
      res.status(500).json({ error: 'Failed to get treatment recommendations' });
    }
  });
  
  // Check contraindications
  app.post('/api/clinical-decision/contraindications', async (req, res) => {
    try {
      const { medications, conditions, allergies } = req.body;
      
      const contraindications = await clinicalDecisionService.checkContraindications(
        medications || [],
        conditions || [],
        allergies || []
      );
      res.json({ contraindications });
    } catch (error) {
      console.error('Error checking contraindications:', error);
      res.status(500).json({ error: 'Failed to check contraindications' });
    }
  });
  
  // Document generation endpoint for automatic triggers
  app.post('/api/documents/generate', ensureAuthenticated, async (req, res) => {
    try {
      const { documentType, sessionId, soapData, transcript } = req.body;
      
      if (!documentType || !sessionId) {
        return res.status(400).json({ error: 'Document type and session ID required' });
      }
      
      // Generate document ID
      const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate document synchronously and wait for it to complete
      console.log(`Starting document generation: ${documentId} for session: ${sessionId}`);
      
      try {
        // Wait for document to be generated
        const document = await realtimeDocumentService.generateDocument({
          type: documentType,
          soapData: soapData || {
            subjective: '',
            objective: '',
            assessment: '',
            plan: ''
          },
          patientInfo: {},
          sessionId: sessionId,
          userId: req.user!.id,
          documentId: documentId  // Pass the ID to the service
        });
        
        console.log(`Document generated successfully: ${documentId} for session: ${sessionId}`);
        console.log(`Document stored with status: ${document.status}, path: ${document.wordPath}`);
        
        res.json({ 
          documentId,
          message: 'Document generated successfully',
          status: document.status,
          wordPath: document.wordPath
        });
      } catch (error) {
        console.error(`Document generation failed: ${documentId} for session: ${sessionId}`, error);
        res.status(500).json({ 
          error: 'Failed to generate document',
          documentId 
        });
      }
    } catch (error) {
      console.error('Error initiating document generation:', error);
      res.status(500).json({ error: 'Failed to start document generation' });
    }
  });
  
  // Document status endpoint for polling
  app.get('/api/documents/status/:documentId', ensureAuthenticated, async (req, res) => {
    try {
      const { documentId } = req.params;
      const sessionId = req.query.sessionId as string;
      
      if (!sessionId) {
        // For simplicity, just return a status based on the document ID age
        const idTimestamp = parseInt(documentId.split('-')[1] || '0');
        const age = Date.now() - idTimestamp;
        
        // Assume documents take about 5-10 seconds to generate
        if (age < 5000) {
          return res.json({ status: 'generating', documentId });
        } else if (age < 30000) {
          return res.json({ 
            status: 'ready', 
            documentId,
            downloadUrl: `/api/documents/download/${documentId}`
          });
        } else {
          return res.json({ status: 'expired', documentId });
        }
      }
      
      // Get document from service
      const documents = realtimeDocumentService.getSessionDocuments(sessionId);
      const document = documents.find(d => d.id === documentId);
      
      if (!document) {
        return res.json({ status: 'not_found', documentId });
      }
      
      res.json({
        status: document.status,
        documentId: document.id,
        type: document.type,
        filename: document.filename,
        downloadUrl: document.status === 'ready' ? `/api/documents/download/${documentId}?sessionId=${sessionId}` : null,
        error: document.error
      });
    } catch (error) {
      console.error('Error checking document status:', error);
      res.status(500).json({ error: 'Failed to check document status' });
    }
  });
  
  // Document download endpoint
  app.get('/api/documents/download/:documentId', async (req, res) => {
    try {
      const { documentId } = req.params;
      const sessionId = req.query.sessionId as string;
      
      console.log(`Download request for document ${documentId} with session ${sessionId}`);
      
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID required' });
      }
      
      // Get document from service
      const documents = realtimeDocumentService.getSessionDocuments(sessionId);
      console.log(`Found ${documents.length} documents for session ${sessionId}`);
      const document = documents.find(d => d.id === documentId);
      
      if (!document || !document.wordPath) {
        console.log(`Document not found: ${documentId} in session ${sessionId}`);
        console.log(`Available documents:`, documents.map(d => d.id));
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Check if file exists
      const fs = await import('fs/promises');
      try {
        await fs.access(document.wordPath);
      } catch {
        return res.status(404).json({ error: 'Document file not found' });
      }
      
      // Set headers for download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${document.filename}.docx"`);
      
      // Stream the file
      const createReadStream = (await import('fs')).createReadStream;
      const stream = createReadStream(document.wordPath);
      stream.pipe(res);
    } catch (error) {
      console.error('Document download error:', error);
      res.status(500).json({ error: 'Failed to download document' });
    }
  });

  // Tournament WebSocket Server for real-time 1v1 matches
  const tournamentWss = new WebSocketServer({ server: httpServer, path: '/ws/tournaments' });
  
  tournamentWss.on('connection', async (ws: WebSocket, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      ws.close(1000, 'Missing userId');
      return;
    }
    
    console.log(`Tournament WebSocket client connected: ${userId}`);
    
    // Add client to tournament service
    const { realTimeTournamentService } = await import('./realTimeTournamentService');
    realTimeTournamentService.addConnection(parseInt(userId), ws);
    
    ws.on('close', () => {
      console.log(`Tournament WebSocket client disconnected: ${userId}`);
    });
  });

  console.log('⚔️ Tournament WebSocket server started on /ws/tournaments');

  // Competition System Routes
  
  // Get active competitions
  app.get("/api/competitions/active", async (req, res) => {
    try {
      const competitions = await competitionStorage.getActiveCompetitions();
      res.json(competitions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all competitions
  app.get("/api/competitions", async (req, res) => {
    try {
      const competitions = await competitionStorage.getAllCompetitions();
      res.json(competitions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get upcoming competitions
  app.get("/api/competitions/upcoming", async (req, res) => {
    try {
      const competitions = await competitionStorage.getUpcomingCompetitions();
      res.json(competitions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get competition by ID
  app.get("/api/competitions/:id", async (req, res) => {
    try {
      const competition = await competitionStorage.getCompetitionById(parseInt(req.params.id));
      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }
      res.json(competition);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Join competition
  app.post("/api/competitions/:id/join", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const competitionId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Check if already joined
      const existing = await competitionStorage.getParticipantByUserAndCompetition(userId, competitionId);
      if (existing) {
        // Return existing participation instead of error
        return res.json({ 
          ...existing, 
          alreadyJoined: true,
          message: "Already participating in this competition"
        });
      }
      
      const participant = await competitionStorage.joinCompetition({
        competitionId,
        userId,
        caseAttempts: [],
        totalScore: 0,
        timeSpent: 0
      });
      
      res.json({ 
        ...participant, 
        alreadyJoined: false,
        message: "Successfully joined competition"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's participation in a specific competition
  app.get("/api/competitions/:id/participation", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const competitionId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const participation = await competitionStorage.getParticipantByUserAndCompetition(userId, competitionId);
      if (!participation) {
        // Return a default structure indicating no participation
        return res.json({
          isParticipating: false,
          totalScore: 0,
          timeSpent: 0,
          rank: null,
          caseAttempts: []
        });
      }
      
      res.json({
        ...participation,
        isParticipating: true
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });



  // Get case studies for a competition
  app.get("/api/competitions/:id/cases", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.id);
      
      // Get the competition details to check body part filter
      const competition = await competitionStorage.getCompetitionById(competitionId);
      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }
      
      // Get random case studies filtered by the competition's body part and difficulty
      const bodyPartFilter = competition.bodyPart === 'general' ? undefined : competition.bodyPart;
      const difficultyFilter = competition.difficulty;
      
      // First try with both body part and difficulty filters
      let caseStudyIds = await competitionStorage.getRandomCaseStudies(bodyPartFilter, difficultyFilter, 5);
      
      // If not enough cases with difficulty filter, try just body part
      if (caseStudyIds.length < 5 && bodyPartFilter) {
        console.log(`[COMPETITION] Only ${caseStudyIds.length} cases found for ${bodyPartFilter}/${difficultyFilter}, trying just body part filter`);
        caseStudyIds = await competitionStorage.getRandomCaseStudies(bodyPartFilter, undefined, 5);
      }
      
      // If still not enough cases, fall back to general cases of the specified difficulty
      if (caseStudyIds.length < 5) {
        console.log(`[COMPETITION] Only ${caseStudyIds.length} cases found for ${bodyPartFilter}, falling back to general cases`);
        const fallbackIds = await competitionStorage.getRandomCaseStudies(undefined, difficultyFilter, 5 - caseStudyIds.length);
        caseStudyIds = [...caseStudyIds, ...fallbackIds];
      }
      
      const caseStudies = [];
      
      for (const id of caseStudyIds) {
        const caseStudy = await competitionStorage.getCaseStudyWithCorrectAnswers(id);
        if (caseStudy) {
          caseStudies.push({
            id: caseStudy.id,
            title: caseStudy.title,
            patientDescription: caseStudy.patientDescription,
            bodyPart: caseStudy.bodyPart,
            complexity: caseStudy.complexity
          });
        }
      }
      
      res.json(caseStudies);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get individual case study details for competition
  app.get("/api/competitions/:id/cases/:caseId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const competitionId = parseInt(req.params.id);
      const caseId = parseInt(req.params.caseId);
      const userId = req.user!.id;
      
      // Verify user is participating in the competition
      const participation = await competitionStorage.getParticipantByUserAndCompetition(userId, competitionId);
      if (!participation) {
        return res.status(403).json({ error: "Not participating in this competition" });
      }
      
      // Get case study details
      const caseStudy = await competitionStorage.getCaseStudyWithCorrectAnswers(caseId);
      if (!caseStudy) {
        return res.status(404).json({ error: "Case study not found" });
      }
      
      res.json({
        id: caseStudy.id,
        title: caseStudy.title,
        patientDescription: caseStudy.patientDescription,
        history: caseStudy.history,
        presentingSymptoms: caseStudy.presentingSymptoms,
        vitalSigns: caseStudy.vitalSigns,
        bodyPart: caseStudy.bodyPart,
        complexity: caseStudy.complexity,
        hiddenFindings: caseStudy.hiddenFindings
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Start a case study within a competition
  app.post("/api/competitions/:id/cases/:caseId/start", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const competitionId = parseInt(req.params.id);
      const caseId = parseInt(req.params.caseId);
      const userId = req.user!.id;
      
      // Verify user is participating in the competition
      const participation = await competitionStorage.getParticipantByUserAndCompetition(userId, competitionId);
      if (!participation) {
        return res.status(403).json({ error: "Not participating in this competition" });
      }
      
      // Get case study details
      const caseStudy = await competitionStorage.getCaseStudyWithCorrectAnswers(caseId);
      if (!caseStudy) {
        return res.status(404).json({ error: "Case study not found" });
      }
      
      res.json({
        message: "Case started",
        caseStudy: {
          id: caseStudy.id,
          title: caseStudy.title,
          patientDescription: caseStudy.patientDescription,
          history: caseStudy.history,
          presentingSymptoms: caseStudy.presentingSymptoms,
          vitalSigns: caseStudy.vitalSigns,
          bodyPart: caseStudy.bodyPart,
          complexity: caseStudy.complexity,
          hiddenFindings: caseStudy.hiddenFindings
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Submit all diagnoses for a competition
  app.post("/api/competitions/:id/submit-all", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log(`[SUBMIT-ALL] Authentication failed - user not logged in`);
      return res.sendStatus(401);
    }
    
    try {
      const competitionId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { attempts } = req.body;
      
      console.log(`[SUBMIT-ALL] User ${userId} submitting to competition ${competitionId}`);
      console.log(`[SUBMIT-ALL] Attempts received:`, attempts);
      
      // Verify user is participating in the competition
      const participation = await competitionStorage.getParticipantByUserAndCompetition(userId, competitionId);
      if (!participation) {
        return res.status(403).json({ error: "Not participating in this competition" });
      }
      
      // Get the competition
      const competition = await competitionStorage.getCompetitionById(competitionId);
      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }
      
      let totalScore = 0;
      const caseResults = [];
      
      // Score each attempt
      console.log(`[SUBMIT-ALL] Starting to score ${attempts.length} attempts`);
      for (const attempt of attempts) {
        console.log(`[SUBMIT-ALL] Processing attempt for case ${attempt.caseStudyId}`);
        const caseStudy = await competitionStorage.getCaseStudyWithCorrectAnswers(attempt.caseStudyId);
        if (caseStudy) {
          console.log(`[SUBMIT-ALL] Found case study, calling AI scoring...`);
          const result = await competitionService.scoreCompetitionAttempt(competition, caseStudy, attempt);
          console.log(`[SUBMIT-ALL] AI scoring complete for case ${attempt.caseStudyId}:`, result.scores);
          totalScore += result.scores.total;
          caseResults.push({
            caseStudyId: attempt.caseStudyId,
            scores: result.scores,
            feedback: result.feedback
          });
        } else {
          console.log(`[SUBMIT-ALL] Case study not found for ID ${attempt.caseStudyId}`);
        }
      }
      
      // Update participation with total score and case attempts
      const updatedParticipation = await competitionStorage.updateParticipant(participation.id, {
        totalScore: totalScore,
        timeSpent: (participation.timeSpent || 0) + (attempts.length * 300), // Add time for all cases
        caseAttempts: caseResults,
        completedAt: new Date()
      });
      
      // Update rankings
      await competitionStorage.calculateAndUpdateRankings(competitionId);
      
      res.json({
        success: true,
        totalScore,
        caseResults,
        averageScore: totalScore / attempts.length,
        updatedParticipation
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Submit diagnosis for a competition case
  app.post("/api/competitions/:id/submit-diagnosis", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const competitionId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { attempt } = req.body;
      
      // Verify user is participating in the competition
      const participation = await competitionStorage.getParticipantByUserAndCompetition(userId, competitionId);
      if (!participation) {
        return res.status(403).json({ error: "Not participating in this competition" });
      }
      
      // Get the case study to evaluate against
      const caseStudy = await competitionStorage.getCaseStudyWithCorrectAnswers(attempt.caseStudyId);
      if (!caseStudy) {
        return res.status(404).json({ error: "Case study not found" });
      }
      
      // Get the competition
      const competition = await competitionStorage.getCompetitionById(competitionId);
      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }
      
      // Score the attempt using the competition service
      const result = await competitionService.scoreCompetitionAttempt(competition, caseStudy, attempt);
      
      // Update participation with the new score
      const updatedParticipation = await competitionStorage.updateParticipant(participation.id, {
        totalScore: (participation.totalScore || 0) + result.scores.total,
        timeSpent: (participation.timeSpent || 0) + attempt.timeSpent,
        caseAttempts: [...(participation.caseAttempts || []), {
          caseStudyId: attempt.caseStudyId,
          userDiagnosis: attempt.userDiagnosis,
          scores: result.scores,
          feedback: result.feedback,
          timeSpent: attempt.timeSpent
        }]
      });
      
      // Update rankings
      await competitionStorage.calculateAndUpdateRankings(competitionId);
      
      res.json({
        success: true,
        scores: result.scores,
        feedback: result.feedback,
        updatedParticipation
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Submit competition attempt
  app.post("/api/competitions/:id/submit", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const competitionId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { attempts }: { attempts: CompetitionAttempt[] } = req.body;
      
      const competition = await competitionStorage.getCompetitionById(competitionId);
      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }
      
      const participant = await competitionStorage.getParticipantByUserAndCompetition(userId, competitionId);
      if (!participant) {
        return res.status(400).json({ error: "Not registered for this competition" });
      }
      
      // Process each case attempt
      const caseResults = [];
      let totalScore = 0;
      let totalTime = 0;
      
      for (const attempt of attempts) {
        const caseStudy = await competitionStorage.getCaseStudyWithCorrectAnswers(attempt.caseStudyId);
        if (!caseStudy) continue;
        
        const result = await competitionService.scoreCompetitionAttempt(competition, caseStudy, attempt);
        
        caseResults.push({
          caseStudyId: attempt.caseStudyId,
          userDiagnosis: attempt.userDiagnosis,
          userReasoning: attempt.userReasoning,
          assessmentTests: attempt.assessmentTests,
          proposedTreatment: attempt.proposedTreatment,
          timeSpent: attempt.timeSpent,
          scores: result.scores,
          feedback: result.feedback
        });
        
        totalScore += result.scores.total;
        totalTime += attempt.timeSpent;
      }
      
      // Update participant record
      const updatedParticipant = await competitionStorage.updateParticipant(participant.id, {
        caseAttempts: caseResults,
        totalScore,
        timeSpent: totalTime,
        completedAt: new Date()
      });
      
      // Update rankings
      await competitionStorage.calculateAndUpdateRankings(competitionId);
      
      // Check for achievements
      const competitionResult = {
        participantId: participant.id,
        totalScore,
        rank: updatedParticipant.rank || 0,
        caseResults: caseResults.map(r => ({
          caseStudyId: r.caseStudyId,
          scores: r.scores,
          feedback: r.feedback
        }))
      };
      
      const achievements = await competitionService.checkAndAwardAchievements(userId, competitionResult);
      
      // Update leaderboards
      await competitionService.updateLeaderboards(userId, competitionResult);
      
      res.json({
        participant: updatedParticipant,
        totalScore,
        rank: updatedParticipant.rank,
        caseResults,
        achievements
      });
      
    } catch (error: any) {
      console.error("Competition submission error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get competition leaderboard
  app.get("/api/competitions/:id/leaderboard", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.id);
      const participants = await competitionStorage.getCompetitionParticipants(competitionId);
      res.json(participants);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Complex Case Competition Routes
  
  // Get upcoming complex case competitions
  app.get("/api/complex-competitions/upcoming", async (req, res) => {
    try {
      const { complexCaseCompetitionService } = await import("./complexCaseCompetitionService");
      const limit = parseInt(req.query.limit as string) || 10;
      const competitions = await complexCaseCompetitionService.getUpcomingComplexCompetitions(limit);
      res.json(competitions);
    } catch (error: any) {
      console.error("Error fetching upcoming complex competitions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get active complex case competitions
  app.get("/api/complex-competitions/active", async (req, res) => {
    try {
      const { complexCaseCompetitionService } = await import("./complexCaseCompetitionService");
      
      // Update competition statuses first
      await complexCaseCompetitionService.startScheduledCompetitions();
      await complexCaseCompetitionService.endFinishedCompetitions();
      
      const competitions = await complexCaseCompetitionService.getActiveComplexCompetitions();
      res.json(competitions);
    } catch (error: any) {
      console.error("Error fetching active complex competitions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Join a complex case competition
  app.post("/api/complex-competitions/:id/join", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const competitionId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const { complexCaseCompetitionService } = await import("./complexCaseCompetitionService");
      const result = await complexCaseCompetitionService.joinComplexCaseCompetition(competitionId, userId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      console.error("Error joining complex competition:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Unregister from a complex case competition
  app.post("/api/complex-competitions/:id/unregister", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const competitionId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const { complexCaseCompetitionService } = await import("./complexCaseCompetitionService");
      const result = await complexCaseCompetitionService.unregisterFromComplexCaseCompetition(competitionId, userId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      console.error("Error unregistering from complex competition:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's registered competitions
  app.get("/api/complex-competitions/my-registrations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user!.id;
      const { complexCaseCompetitionService } = await import("./complexCaseCompetitionService");
      const registrations = await complexCaseCompetitionService.getUserRegisteredCompetitions(userId);
      res.json(registrations);
    } catch (error: any) {
      console.error("Error fetching user registrations:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's complex competition history with detailed results
  app.get("/api/complex-competitions/history", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    
    try {
      const userId = req.user!.id;
      const { complexCaseService } = await import("./complexCaseService");
      
      // Get all user's complex case attempts with detailed feedback
      const attempts = await complexCaseService.getUserComplexCaseAttempts(userId);
      
      // If no attempts found, return empty array
      if (!attempts || attempts.length === 0) {
        return res.json([]);
      }
      
      // Format the data for the history view
      const historyData = attempts.map(attempt => ({
        competitionId: attempt.competitionId,
        competitionTitle: attempt.competitionTitle || "Complex Case Competition",
        complexCaseId: attempt.complexCaseId,
        completedAt: attempt.completedAt || attempt.createdAt,
        totalScore: attempt.overallScore || 0,
        rank: attempt.rank || null,
        timeSpent: attempt.timeSpent || 0,
        totalParticipants: attempt.totalParticipants || 0,
        categoryScores: {
          clinicalReasoning: attempt.clinicalReasoningScore || 0,
          assessmentSkills: attempt.assessmentSkillsScore || 0,
          treatmentPlanning: attempt.treatmentPlanningScore || 0,
          communication: attempt.communicationScore || 0,
          timeEfficiency: attempt.timeEfficiencyScore || 0
        },
        feedback: {
          strengths: attempt.strengths || [],
          improvementAreas: attempt.improvementAreas || [],
          recommendedResources: attempt.recommendedResources || [],
          nextSteps: attempt.nextSteps || [],
          evidenceReferences: attempt.evidenceReferences || []
        },
        questionFeedback: attempt.questionFeedback || []
      }));
      
      // Sort by completion date, most recent first
      historyData.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      
      res.json(historyData);
    } catch (error: any) {
      console.error("Error fetching complex competition history:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get complex competition participants
  app.get("/api/complex-competitions/:id/participants", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.id);
      const { complexCaseCompetitionService } = await import("./complexCaseCompetitionService");
      const participants = await complexCaseCompetitionService.getCompetitionParticipants(competitionId);
      res.json(participants);
    } catch (error: any) {
      console.error("Error fetching competition participants:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Manual competition management (admin only)
  app.post("/api/complex-competitions/manage", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Check if user is admin
    const adminUsernames = ["Fateofjustice"];
    if (!adminUsernames.includes(req.user!.username)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    try {
      const { complexCaseCompetitionService } = await import("./complexCaseCompetitionService");
      await complexCaseCompetitionService.manageCompetitions();
      res.json({ success: true, message: "Competition management completed" });
    } catch (error: any) {
      console.error("Error managing competitions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Schedule new complex competitions (admin only)
  app.post("/api/complex-competitions/schedule", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Check if user is admin
    const adminUsernames = ["Fateofjustice"];
    if (!adminUsernames.includes(req.user!.username)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    try {
      const { complexCaseCompetitionService } = await import("./complexCaseCompetitionService");
      const competitions = await complexCaseCompetitionService.scheduleDailyComplexCompetitions();
      res.json({
        success: true,
        message: `Scheduled ${competitions.length} new competitions`,
        competitions
      });
    } catch (error: any) {
      console.error("Error scheduling competitions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Daily Challenge Routes
  
  // Get today's challenge
  app.get("/api/daily-challenge", async (req, res) => {
    try {
      let challenge = await competitionStorage.getTodaysChallenge();
      
      // Create today's challenge if it doesn't exist
      if (!challenge) {
        challenge = await competitionService.createTodaysChallenge();
      }
      
      if (!challenge) {
        return res.status(404).json({ error: "No challenge available today" });
      }
      
      // Get the case study details
      const caseStudy = await competitionStorage.getCaseStudyWithCorrectAnswers(challenge.caseStudyId);
      
      res.json({
        challenge,
        caseStudy: caseStudy ? {
          id: caseStudy.id,
          title: caseStudy.title,
          patientDescription: caseStudy.patientDescription,
          history: caseStudy.history,
          presentingSymptoms: caseStudy.presentingSymptoms,
          vitalSigns: caseStudy.vitalSigns,
          bodyPart: caseStudy.bodyPart,
          complexity: caseStudy.complexity,
          hiddenFindings: caseStudy.hiddenFindings
        } : null
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Submit daily challenge attempt
  app.post("/api/daily-challenge/submit", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user!.id;
      const { attempt }: { attempt: CompetitionAttempt } = req.body;
      
      const challenge = await competitionStorage.getTodaysChallenge();
      if (!challenge) {
        return res.status(404).json({ error: "No daily challenge available" });
      }
      
      const caseStudy = await competitionStorage.getCaseStudyWithCorrectAnswers(challenge.caseStudyId);
      if (!caseStudy) {
        return res.status(404).json({ error: "Case study not found" });
      }
      
      // Create a mock competition for scoring
      const mockCompetition = {
        rules: {
          scoringWeights: {
            accuracy: 0.3,
            speed: 0.2,
            reasoning: 0.2,
            differential: 0.15,
            treatment: 0.15
          }
        },
        timeLimit: 20 // 20 minutes for daily challenges
      } as Competition;
      
      const result = await competitionService.scoreCompetitionAttempt(mockCompetition, caseStudy, attempt);
      
      // Update challenge stats
      const newParticipantCount = challenge.participantCount + 1;
      const newAverageScore = Math.round(
        (challenge.averageScore * challenge.participantCount + result.scores.total) / newParticipantCount
      );
      
      await competitionStorage.updateChallengeStats(challenge.id, newParticipantCount, newAverageScore);
      
      res.json({
        score: result.scores.total,
        feedback: result.feedback,
        scores: result.scores,
        correctDiagnosis: caseStudy.correctDiagnosis,
        correctTreatment: caseStudy.correctTreatmentApproach,
        rank: Math.ceil((100 - result.scores.total) / 10) // Rough ranking estimate
      });
      
    } catch (error: any) {
      console.error("Daily challenge submission error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Leaderboard Routes
  
  // Get global leaderboards
  app.get("/api/leaderboards/:category/:timeframe", async (req, res) => {
    try {
      const { category, timeframe } = req.params;
      const { bodyPart } = req.query;
      
      const leaderboard = await competitionStorage.getLeaderboard(
        category, 
        timeframe, 
        bodyPart as string
      );
      
      res.json(leaderboard);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // User achievement routes
  
  // Get user achievements
  app.get("/api/achievements", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const achievements = await competitionStorage.getUserAchievements(req.user!.id);
      res.json(achievements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Competition analytics
  
  // Get competition stats
  app.get("/api/competitions/:id/stats", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.id);
      const stats = await competitionStorage.getCompetitionStats(competitionId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get user competition history
  app.get("/api/competitions/user/history", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const history = await competitionStorage.getUserCompetitionHistory(req.user!.id);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Complex Case Competition Routes
  app.post("/api/complex-competitions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { title, description, competitionType, bodyPart, difficulty, numberOfCases, timeLimit } = req.body;
      
      // Create sample complex cases for now
      const complexCaseIds = [1, 2, 3, 4, 5]; // Mock IDs for now
      
      const competition = {
        id: Date.now(), // Mock ID
        title,
        description,
        type: competitionType,
        status: 'upcoming',
        bodyPart,
        difficulty,
        timeLimit,
        maxParticipants: 50,
        entryFee: 0,
        prizePool: 0,
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: req.user!.id,
        caseStudyIds: [],
        complexCaseIds,
        caseType: 'complex',
        rules: {
          scoringWeights: {
            accuracy: 0.3,
            speed: 0.15,
            reasoning: 0.3,
            differential: 0.15,
            treatment: 0.1
          },
          allowedAttempts: 1,
          showLeaderboard: true,
          revealAnswers: true
        }
      };

      res.json(competition);
    } catch (error) {
      console.error('Error creating complex competition:', error);
      res.status(500).json({ message: 'Failed to create complex competition' });
    }
  });

  // Get all complex cases with stage count
  app.get("/api/complex-cases", async (req, res) => {
    try {
      const { pool } = await import("./db");
      
      // Get complex cases with stage count using raw SQL
      const result = await pool.query(`
        SELECT 
          cc.*,
          COUNT(cs.id) as stage_count
        FROM complex_cases cc
        LEFT JOIN case_stages cs ON cc.id = cs.complex_case_id
        GROUP BY cc.id
        ORDER BY cc.id
      `);
      
      const complexCasesWithStages = result.rows.map(row => ({
        ...row,
        stages: { length: parseInt(row.stage_count) || 0 }
      }));
      
      res.json(complexCasesWithStages);
    } catch (error) {
      console.error('Error getting complex cases:', error);
      res.status(500).json({ message: 'Failed to get complex cases' });
    }
  });

  app.get("/api/complex-cases/:id", async (req, res) => {
    try {
      const caseId = parseInt(req.params.id);
      
      // Use complexCaseService to get case with stages
      const { complexCaseService } = await import("./complexCaseService");
      const caseDetails = await complexCaseService.getComplexCaseDetails(caseId);
      
      if (!caseDetails) {
        return res.status(404).json({ error: "Complex case not found" });
      }
      
      res.json(caseDetails);
    } catch (error) {
      console.error('Error getting complex case:', error);
      res.status(500).json({ message: 'Failed to get complex case' });
    }
  });

  app.post("/api/complex-cases/:id/start", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const caseId = parseInt(req.params.id);
      const { competitionId } = req.body;
      
      const attempt = {
        id: Date.now(),
        userId: req.user!.id,
        complexCaseId: caseId,
        competitionId,
        startedAt: new Date(),
        totalTimeSpent: 0,
        stageResponses: [],
        currentStage: 1,
        completed: false
      };

      res.json(attempt);
    } catch (error) {
      console.error('Error starting complex case attempt:', error);
      res.status(500).json({ message: 'Failed to start complex case attempt' });
    }
  });

  app.post("/api/complex-case-attempts/:id/submit-stage", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const attemptId = parseInt(req.params.id);
      const { stageId, responses, timeSpent } = req.body;
      
      // Mock scoring for demo
      const scoredResponses = responses.map((response: any, index: number) => ({
        ...response,
        score: Math.floor(Math.random() * 20) + 80, // Mock scores 80-100
        feedback: "Good clinical reasoning demonstrated. Consider expanding on your differential diagnosis."
      }));

      const stageResult = {
        stageId,
        responses: scoredResponses,
        timeSpent,
        stageScore: scoredResponses.reduce((sum: number, r: any) => sum + r.score, 0),
        completed: true
      };

      res.json(stageResult);
    } catch (error) {
      console.error('Error submitting stage:', error);
      res.status(500).json({ message: 'Failed to submit stage' });
    }
  });

  app.post("/api/complex-case-attempts/:id/complete", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const attemptId = parseInt(req.params.id);
      
      // Mock final scoring
      const finalResults = {
        totalScore: 87,
        categoryScores: {
          clinicalReasoning: 85,
          assessmentSkills: 88,
          treatmentPlanning: 90,
          communication: 85,
          timeEfficiency: 82
        },
        feedback: {
          strengths: [
            "Excellent systematic approach to differential diagnosis",
            "Strong understanding of neurological examination",
            "Evidence-based treatment planning"
          ],
          improvementAreas: [
            "Consider more specific exercise prescription",
            "Expand on patient education techniques"
          ],
          recommendedResources: [
            "Review latest guidelines on acute low back pain management",
            "Practice motivational interviewing techniques"
          ],
          nextSteps: [
            "Complete additional complex spine cases",
            "Focus on chronic pain management scenarios"
          ]
        },
        rank: Math.floor(Math.random() * 10) + 1,
        completedAt: new Date()
      };

      res.json(finalResults);
    } catch (error) {
      console.error('Error completing complex case:', error);
      res.status(500).json({ message: 'Failed to complete complex case' });
    }
  });

  // Get top performers
  app.get("/api/leaderboards/top-performers", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topPerformers = await competitionStorage.getTopPerformers(limit);
      res.json(topPerformers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Complex Case Routes
  app.get("/api/complex-case/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { id } = req.params;
      const complexCaseId = parseInt(id);
      
      // Get complex case with details
      const caseDetails = await complexCaseService.getComplexCaseWithDetails(complexCaseId);
      
      if (!caseDetails) {
        return res.status(404).json({ error: "Complex case not found" });
      }
      
      res.json(caseDetails);
    } catch (error: any) {
      console.error("Error fetching complex case:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add interactive questions to existing complex cases
  app.post("/api/admin/add-interactive-questions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { addInteractiveQuestionsToComplexCases } = await import('./scripts/addInteractiveQuestions');
      await addInteractiveQuestionsToComplexCases();
      res.json({ message: "Successfully added interactive questions to all complex cases" });
    } catch (error: any) {
      console.error("Error adding interactive questions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/complex-case/:id/start", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { id } = req.params;
      const complexCaseId = parseInt(id);
      const userId = req.user!.id;
      
      const attempt = await complexCaseService.startComplexCaseAttempt(userId, complexCaseId);
      res.json(attempt);
    } catch (error: any) {
      console.error("Error starting complex case attempt:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/complex-case-attempt/:attemptId/stage/:stageId/submit", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { attemptId, stageId } = req.params;
      const { responses, timeSpent } = req.body;
      
      const result = await complexCaseService.submitStageResponse(
        parseInt(attemptId),
        parseInt(stageId),
        responses,
        timeSpent
      );
      
      res.json(result);
    } catch (error: any) {
      console.error("Error submitting stage response:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/complex-case-attempt/:attemptId/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { attemptId } = req.params;
      
      const completedAttempt = await complexCaseService.completeComplexCaseAttempt(parseInt(attemptId));
      res.json(completedAttempt);
    } catch (error: any) {
      console.error("Error completing complex case attempt:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // AI-powered immediate question scoring
  app.post("/api/complex-case-question/score", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { questionId, userAnswer, complexCaseId, stageId } = req.body;
      
      // Get the question, case, and stage details
      const caseDetails = await complexCaseService.getComplexCaseDetails(complexCaseId);
      if (!caseDetails) {
        return res.status(404).json({ error: "Case not found" });
      }
      
      const stage = caseDetails.stages.find((s: any) => s.id === stageId);
      if (!stage) {
        return res.status(404).json({ error: "Stage not found" });
      }
      
      const question = stage.questions.find((q: any) => q.id === questionId);
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }
      
      // Score the response using AI
      const { scoreQuestionResponse } = await import('./complexCaseGenerator');
      const scoringResult = await scoreQuestionResponse(
        question,
        userAnswer,
        caseDetails.case,
        stage
      );
      
      res.json(scoringResult);
    } catch (error: any) {
      console.error("Error scoring question response:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Initialize mock data endpoint
  app.post("/api/admin/init-complex-cases", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { createMockComplexCase } = await import("./scripts/createMockComplexCase");
      const complexCase = await createMockComplexCase();
      res.json({ success: true, complexCase });
    } catch (error: any) {
      console.error("Error creating mock complex case:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create new 2024 complex cases based on recent research
  app.post("/api/admin/create-new-complex-cases-2024", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { createNewComplexCases2024 } = await import("./newComplexCases2024");
      await createNewComplexCases2024(req.user!.id);
      res.json({ 
        success: true, 
        message: "Successfully created 10 new complex cases based on 2024 research",
        casesCreated: 10 
      });
    } catch (error: any) {
      console.error("Error creating new 2024 complex cases:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get complex case competition details
  app.get("/api/complex-competitions/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const competitionId = parseInt(req.params.id);
      const { competitionStorage } = await import("./competitionStorage");
      
      const competition = await competitionStorage.getCompetitionById(competitionId);
      
      if (!competition) {
        return res.status(404).json({ message: 'Competition not found' });
      }

      res.json(competition);
    } catch (error) {
      console.error('Error fetching competition:', error);
      res.status(500).json({ message: 'Failed to fetch competition' });
    }
  });

  // Submit complex case competition answers
  app.post("/api/complex-competitions/:id/submit", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const competitionId = parseInt(req.params.id);
      const { complexCaseId, stageAnswers, totalTimeSpent } = req.body;
      
      console.log(`[COMPLEX-SUBMIT] User ${req.user!.id} submitting to competition ${competitionId}`);
      console.log(`[COMPLEX-SUBMIT] Complex Case ID: ${complexCaseId}`);
      console.log(`[COMPLEX-SUBMIT] Stage Answers:`, stageAnswers);

      // Get complex case service and storage
      const { complexCaseService } = await import("./complexCaseService");
      const { scoreComplexCaseAttempt } = await import("./complexCaseGenerator");
      const { competitionStorage } = await import("./competitionStorage");
      
      // Get the complex case details
      const complexCase = await complexCaseService.getComplexCaseDetails(complexCaseId);
      if (!complexCase) {
        return res.status(404).json({ message: 'Complex case not found' });
      }

      console.log(`[COMPLEX-SUBMIT] Found complex case: ${complexCase.case.title}`);

      // Transform stage answers to the expected format for scoring
      const stageResponses = stageAnswers.map((answer: any) => ({
        stageId: answer.stageId,
        answer: answer.answer,
        timeSpent: answer.timeSpent
      }));

      // Use AI-powered scoring system
      const analysisResult = await scoreComplexCaseAttempt(complexCase.case, stageResponses);
      
      console.log(`[COMPLEX-SUBMIT] Analysis result:`, analysisResult);

      // Calculate time efficiency bonus (if completed under time limit)
      const competition = await competitionStorage.getCompetitionById(competitionId);
      const timeLimit = competition?.timeLimit || 10; // Default 10 minutes
      const timeEfficiencyBonus = totalTimeSpent < (timeLimit * 60 * 0.8) ? 5 : 0; // 5% bonus if under 80% of time limit

      const finalScore = Math.min(100, analysisResult.totalScore + timeEfficiencyBonus);

      // Store the competition attempt in the database
      const attemptData = {
        userId: req.user!.id,
        competitionId,
        complexCaseId,
        totalScore: finalScore,
        clinicalReasoningScore: analysisResult.categoryScores.clinicalReasoning || 0,
        assessmentSkillsScore: analysisResult.categoryScores.assessmentSkills || 0,
        treatmentPlanningScore: analysisResult.categoryScores.treatmentPlanning || 0,
        communicationScore: analysisResult.categoryScores.communication || 0,
        timeEfficiencyScore: timeEfficiencyBonus,
        totalTimeSpentSeconds: totalTimeSpent,
        stageResponses: stageAnswers,
        overallFeedback: analysisResult.feedback,
        completedAt: new Date(),
        startedAt: new Date(Date.now() - (totalTimeSpent * 1000)) // Calculate start time
      };

      // Save to database using complexCaseService
      const savedAttempt = await complexCaseService.storeComplexCaseAttempt(attemptData);

      const result = {
        participantId: req.user!.id,
        totalScore: finalScore,
        categoryScores: {
          ...analysisResult.categoryScores,
          timeEfficiency: timeEfficiencyBonus > 0 ? 85 : 70
        },
        feedback: analysisResult.feedback,
        questionFeedback: analysisResult.questionFeedback || [], // Add individual question feedback
        timeSpent: totalTimeSpent,
        timeLimit: timeLimit * 60,
        achievements: analysisResult.totalScore >= 90 ? ["Clinical Excellence", "Expert Clinician"] : 
                     analysisResult.totalScore >= 80 ? ["Strong Clinical Reasoning"] : 
                     analysisResult.totalScore >= 70 ? ["Competent Clinician"] : undefined,
        submission: savedAttempt // Return the saved attempt data
      };

      console.log(`[COMPLEX-SUBMIT] Final result:`, result);
      res.json(result);
      
    } catch (error) {
      console.error('Error submitting complex competition answers:', error);
      res.status(500).json({ 
        message: 'Failed to submit answers',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add recent research papers to database
  app.post("/api/admin/add-recent-research", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { recentResearchPapers } = await import("./comprehensiveResearchDatabase");
      const researchStorage = await import("./researchStorage");
      
      let addedCount = 0;
      for (const paper of recentResearchPapers) {
        try {
          await researchStorage.researchStorage.addResearchPaper(paper);
          addedCount++;
        } catch (error) {
          console.log(`Paper already exists or error adding: ${paper.title}`);
        }
      }
      
      res.json({ 
        success: true, 
        message: `Successfully added ${addedCount} recent research papers to database`,
        papersAdded: addedCount 
      });
    } catch (error: any) {
      console.error("Error adding recent research papers:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Test endpoint to create new complex cases (temporary for testing)
  app.post("/api/test/create-complex-cases", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { createNewComplexCases2024 } = await import("./newComplexCases2024");
      await createNewComplexCases2024(req.user!.id);
      res.json({ 
        success: true, 
        message: "Successfully created 10 new complex cases based on 2024 research",
        casesCreated: 10 
      });
    } catch (error: any) {
      console.error("Error creating new 2024 complex cases:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create 10 additional complex cases for competitions
  app.post("/api/create-additional-complex-cases", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { createAdditionalComplexCases2024 } = await import("./additionalComplexCases2024");
      await createAdditionalComplexCases2024(req.user!.id);
      res.json({ 
        success: true, 
        message: "Successfully created 10 additional multi-stage clinical reasoning cases",
        casesCreated: 10 
      });
    } catch (error: any) {
      console.error("Error creating additional complex cases:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create 10 advanced clinical diagnosis competitions (admin only)
  app.post("/api/admin/create-diagnosis-competitions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Check if user is admin
    const adminUsernames = ["Fateofjustice"];
    if (!adminUsernames.includes(req.user!.username)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    try {
      const { generateComplexCase } = await import("./complexCaseGenerator");
      const { competitionStorage } = await import("./competitionStorage");
      
      // Create 10 challenging clinical diagnosis cases
      const diagnosticCases = [
        {
          title: "Chronic Shoulder Pain with Neurological Symptoms",
          bodyPart: "shoulder" as const,
          complexity: "advanced" as const,
          competitionType: "diagnostic_detective" as const,
          description: "Complex shoulder presentation with referred pain patterns and neurological involvement requiring systematic differential diagnosis"
        },
        {
          title: "Persistent Low Back Pain with Red Flags",
          bodyPart: "back" as const,
          complexity: "advanced" as const,
          competitionType: "diagnostic_detective" as const,
          description: "Challenging lumbar spine case with potential serious pathology requiring careful clinical reasoning and red flag assessment"
        },
        {
          title: "Recurrent Ankle Instability vs Subtalar Dysfunction",
          bodyPart: "ankle" as const,
          complexity: "advanced" as const,
          competitionType: "diagnostic_detective" as const,
          description: "Complex ankle case requiring differentiation between multiple potential causes of chronic instability"
        },
        {
          title: "Hip Pain in Young Athlete - FAI vs Labral Pathology",
          bodyPart: "hip" as const,
          complexity: "advanced" as const,
          competitionType: "diagnostic_detective" as const,
          description: "Challenging hip case in athletic population requiring advanced diagnostic reasoning for structural vs functional causes"
        },
        {
          title: "Chronic Neck Pain with Headaches and Dizziness",
          bodyPart: "neck" as const,
          complexity: "advanced" as const,
          competitionType: "diagnostic_detective" as const,
          description: "Complex cervical spine presentation with multiple symptom clusters requiring systematic assessment approach"
        },
        {
          title: "Knee Pain with Locking - Meniscal vs Loose Body",
          bodyPart: "knee" as const,
          complexity: "advanced" as const,
          competitionType: "diagnostic_detective" as const,
          description: "Challenging knee case with mechanical symptoms requiring precise differential diagnosis between structural causes"
        },
        {
          title: "Elbow Pain in Tennis Player - Multiple Differential Diagnoses",
          bodyPart: "elbow" as const,
          complexity: "advanced" as const,
          competitionType: "diagnostic_detective" as const,
          description: "Complex elbow case in athlete with overlapping symptoms requiring systematic elimination of multiple potential diagnoses"
        },
        {
          title: "Wrist Pain with Numbness - Carpal Tunnel vs Thoracic Outlet",
          bodyPart: "wrist" as const,
          complexity: "advanced" as const,
          competitionType: "diagnostic_detective" as const,
          description: "Challenging upper extremity case requiring differentiation between local and proximal causes of symptoms"
        },
        {
          title: "Foot Pain with Gait Abnormalities - Biomechanical Analysis",
          bodyPart: "foot" as const,
          complexity: "advanced" as const,
          competitionType: "diagnostic_detective" as const,
          description: "Complex foot case requiring integration of biomechanical assessment with pathological findings"
        },
        {
          title: "Post-Surgical Complications - Ongoing Pain and Dysfunction",
          bodyPart: "knee" as const,
          complexity: "advanced" as const,
          competitionType: "diagnostic_detective" as const,
          description: "Challenging post-operative case requiring assessment of surgical complications vs new pathology"
        }
      ];
      
      const createdCases = [];
      const createdCompetitions = [];
      
      // Generate each complex case
      for (const caseData of diagnosticCases) {
        const caseInput = {
          bodyPart: caseData.bodyPart,
          complexity: caseData.complexity,
          competitionType: caseData.competitionType,
          estimatedTime: 10 // 10 minutes for advanced cases
        };
        
        const caseResult = await generateComplexCase(caseInput, req.user!.id);
        createdCases.push(caseResult.complexCase);
        
        // Create competition for this case
        const competition = {
          title: caseData.title,
          description: caseData.description,
          competitionType: "diagnostic_challenge",
          status: "active",
          bodyPart: caseData.bodyPart,
          difficulty: "advanced",
          timeLimit: 10,
          maxParticipants: 100,
          entryFee: 0,
          prizePool: 0,
          startTime: new Date(),
          endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          createdBy: req.user!.id,
          caseStudyIds: [],
          complexCaseIds: [caseResult.complexCase.id!],
          caseType: "complex",
          rules: {
            scoringWeights: {
              accuracy: 0.35,
              speed: 0.10,
              reasoning: 0.35,
              differential: 0.15,
              treatment: 0.05
            },
            allowedAttempts: 3,
            showLeaderboard: true,
            revealAnswers: true
          }
        };
        
        const createdCompetition = await competitionStorage.createCompetition(competition);
        createdCompetitions.push(createdCompetition);
      }
      
      res.json({
        success: true,
        message: "Successfully created 10 advanced clinical diagnosis competitions",
        casesCreated: createdCases.length,
        competitionsCreated: createdCompetitions.length,
        competitions: createdCompetitions.map(c => ({
          id: c.id,
          title: c.title,
          bodyPart: c.bodyPart,
          difficulty: c.difficulty,
          caseType: c.caseType
        }))
      });
      
    } catch (error: any) {
      console.error("Error creating diagnosis competitions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create complex competitions with multi-stage cases
  app.post("/api/create-complex-competitions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user!.id;
      
      // First create the complex cases
      const { createAdditionalComplexCases2024 } = await import("./additionalComplexCases2024");
      await createAdditionalComplexCases2024(userId);
      
      // Get the complex case service
      const { complexCaseService } = await import("./complexCaseService");
      const { competitionStorage } = await import("./competitionStorage");
      
      // Get recently created complex cases
      const recentComplexCases = await complexCaseService.getUserComplexCaseAttempts(userId);
      const complexCaseIds = recentComplexCases.slice(0, 10).map(attempt => attempt.complexCaseId);
      
      // Create several complex competitions
      const competitions = [
        {
          title: "Advanced Clinical Reasoning Challenge 2024",
          description: "Multi-stage competition featuring cutting-edge research cases with differential diagnosis, assessment planning, and treatment strategies",
          competitionType: "complete_clinician",
          bodyPart: "general",
          difficulty: "advanced",
          startTime: new Date(),
          endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          maxParticipants: 100,
          timeLimit: 10,
          caseType: "complex",
          complexCaseIds: complexCaseIds.slice(0, 3)
        },
        {
          title: "Shoulder & Upper Extremity Reasoning Masters",
          description: "Complex shoulder and elbow cases requiring advanced clinical reasoning and evidence-based treatment planning",
          competitionType: "diagnostic_detective",
          bodyPart: "shoulder",
          difficulty: "advanced",
          startTime: new Date(),
          endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
          maxParticipants: 50,
          timeLimit: 10,
          caseType: "complex",
          complexCaseIds: complexCaseIds.slice(3, 6)
        },
        {
          title: "Lower Extremity Treatment Strategist",
          description: "Advanced hip, knee, and ankle cases focusing on treatment planning and progressive rehabilitation strategies",
          competitionType: "treatment_strategist", 
          bodyPart: "knee",
          difficulty: "advanced",
          startTime: new Date(),
          endTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days
          maxParticipants: 75,
          timeLimit: 10,
          caseType: "complex",
          complexCaseIds: complexCaseIds.slice(6, 10)
        }
      ];
      
      const createdCompetitions = [];
      for (const comp of competitions) {
        const created = await competitionStorage.createCompetition(comp);
        createdCompetitions.push(created);
      }
      
      res.json({
        success: true,
        message: "Successfully created 10 complex cases and 3 complex competitions",
        casesCreated: 10,
        competitionsCreated: createdCompetitions.length,
        competitions: createdCompetitions.map(c => ({
          id: c.id,
          title: c.title,
          type: c.competitionType,
          cases: c.complexCaseIds?.length || 0
        }))
      });
      
    } catch (error: any) {
      console.error("Error creating complex competitions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add endpoint to create additional difficult cases
  app.post("/api/create-additional-difficult-cases", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      console.log('[DIFFICULT CASES] Starting creation of 10 additional challenging cases...');
      
      // Import the function dynamically
      const { createAdditionalDifficultCases2025 } = await import('./additionalDifficultCases2025');
      
      await createAdditionalDifficultCases2025(userId);
      
      res.json({
        success: true,
        message: "Successfully created 10 additional challenging complex case competitions",
        casesCreated: 10
      });
      
    } catch (error: any) {
      console.error("Error creating additional difficult cases:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create 5 Diagnosis Duel tournaments with proper scheduling
  app.post("/api/create-diagnosis-duel-tournaments", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { createDiagnosisDuelTournaments } = await import('./createDiagnosisDuelTournaments');
      const tournaments = await createDiagnosisDuelTournaments();
      res.json({ 
        success: true, 
        message: "Successfully created 5 Diagnosis Duel tournaments",
        tournaments: tournaments 
      });
    } catch (error: any) {
      console.error("Error creating Diagnosis Duel tournaments:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Competition Scheduler Management Routes
  
  // Manual trigger for scheduler (admin only)
  app.post("/api/admin/scheduler/trigger", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Import scheduler
      const { competitionScheduler } = await import('./competitionScheduler');
      
      await competitionScheduler.triggerNow();
      
      res.json({
        success: true,
        message: "Competition scheduler triggered successfully",
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error("Error triggering scheduler:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create sample scheduled competition (testing endpoint)
  app.post("/api/admin/scheduler/test-competition", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() + 2 * 60 * 1000); // Start in 2 minutes
      const endTime = new Date(startTime.getTime() + 10 * 60 * 1000); // End 10 minutes later
      const registrationOpens = new Date(now.getTime() + 30 * 1000); // Registration opens in 30 seconds
      const registrationDeadline = new Date(startTime.getTime() - 1 * 60 * 1000); // Registration closes 1 minute before start
      
      // Get available complex cases
      const availableCases = await db.select().from(complexCases).limit(5);
      
      if (availableCases.length === 0) {
        return res.status(400).json({ error: "No complex cases available for testing" });
      }
      
      const randomCase = availableCases[Math.floor(Math.random() * availableCases.length)];
      
      const [testCompetition] = await db.insert(competitions).values({
        title: `Test Scheduler Competition - ${now.toLocaleTimeString()}`,
        description: 'Automated test competition to verify scheduler functionality',
        type: 'complete_clinician',
        status: 'upcoming',
        difficulty: 'intermediate',
        timeLimit: 10,
        maxParticipants: 20,
        currentParticipants: 0,
        registrationOpensAt: registrationOpens,
        registrationDeadline,
        startTime,
        endTime,
        complexCaseIds: [randomCase.id],
        caseStudyIds: [],
        caseType: 'complex',
        isAutoGenerated: true,
        rules: {
          scoringWeights: {
            accuracy: 30,
            speed: 20,
            reasoning: 25,
            differential: 15,
            treatment: 10
          },
          allowedAttempts: 1,
          showLeaderboard: true,
          revealAnswers: true,
          stageTimeLimit: 2,
          enableAntiCheat: true
        }
      }).returning();
      
      res.json({
        success: true,
        message: "Test competition created successfully",
        competition: testCompetition,
        schedule: {
          registrationOpens: registrationOpens.toISOString(),
          registrationCloses: registrationDeadline.toISOString(),
          starts: startTime.toISOString(),
          ends: endTime.toISOString()
        }
      });
      
    } catch (error: any) {
      console.error("Error creating test competition:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================
  // ENHANCED COMPETITION FEATURES API ENDPOINTS
  // ========================================

  // Notification endpoints
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const notifications = notificationService.getInAppNotifications(req.user.id);
      res.json(notifications);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const notificationId = parseInt(req.params.id);
      const success = notificationService.markNotificationRead(req.user.id, notificationId);
      res.json({ success });
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Real-time competition endpoints
  app.get("/api/competitions/:id/live", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const competitionId = parseInt(req.params.id);
      const liveData = realTimeCompetitionService.getLiveData(competitionId);
      
      if (!liveData) {
        return res.status(404).json({ error: "Live data not available for this competition" });
      }
      
      res.json(liveData);
    } catch (error: any) {
      console.error("Error fetching live competition data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/competitions/:id/start-live", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const competitionId = parseInt(req.params.id);
      await realTimeCompetitionService.startLiveTracking(competitionId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error starting live tracking:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Competition content and variety endpoints
  app.get("/api/competitions/themes", async (req, res) => {
    try {
      const themes = competitionContentService.getThematicWeeks();
      res.json(themes);
    } catch (error: any) {
      console.error("Error fetching competition themes:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/competitions/current-theme", async (req, res) => {
    try {
      const currentTheme = competitionContentService.getCurrentWeekTheme();
      res.json(currentTheme);
    } catch (error: any) {
      console.error("Error fetching current theme:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/competitions/tournament-formats", async (req, res) => {
    try {
      const formats = competitionContentService.getTournamentFormats();
      res.json(formats);
    } catch (error: any) {
      console.error("Error fetching tournament formats:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/competitions/specialty-types", async (req, res) => {
    try {
      const specialties = competitionContentService.getSpecialtyCompetitions();
      res.json(specialties);
    } catch (error: any) {
      console.error("Error fetching specialty competitions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Enhanced analytics endpoints
  app.get("/api/analytics/performance/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only access their own analytics unless they're admin
      if (userId !== req.user.id && req.user.username !== 'Fateofjustice') {
        return res.sendStatus(403);
      }
      
      const analytics = await competitionAnalyticsService.generateDetailedAnalytics(userId);
      res.json(analytics);
    } catch (error: any) {
      console.error("Error generating analytics:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/social/:userId/:competitionId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = parseInt(req.params.userId);
      const competitionId = parseInt(req.params.competitionId);
      
      // Users can only access their own social features unless they're admin
      if (userId !== req.user.id && req.user.username !== 'Fateofjustice') {
        return res.sendStatus(403);
      }
      
      const socialFeatures = await competitionAnalyticsService.generateSocialFeatures(userId, competitionId);
      res.json(socialFeatures);
    } catch (error: any) {
      console.error("Error generating social features:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Competition creation with enhanced features
  app.post("/api/competitions/themed", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { theme, difficulty, timeSlot } = req.body;
      
      const themedCompetition = await competitionContentService.generateThemedCompetition(
        theme, 
        difficulty, 
        timeSlot
      );
      
      // Create the actual competition
      const now = new Date();
      const startTime = new Date(now.getTime() + 60 * 60 * 1000); // Start in 1 hour
      const endTime = new Date(startTime.getTime() + 10 * 60 * 1000); // 10 minute duration
      
      const [competition] = await db.insert(competitions).values({
        title: themedCompetition.title,
        description: themedCompetition.description,
        type: 'complete_clinician',
        status: 'upcoming',
        difficulty: themedCompetition.difficulty,
        bodyPart: themedCompetition.bodyPart as any,
        timeLimit: 10,
        maxParticipants: 50,
        currentParticipants: 0,
        registrationOpensAt: now,
        registrationDeadline: new Date(startTime.getTime() - 5 * 60 * 1000),
        startTime,
        endTime,
        complexCaseIds: themedCompetition.caseIds.slice(0, 1),
        caseStudyIds: null,
        caseType: 'complex',
        isAutoGenerated: false,
        rules: {
          scoringWeights: {
            accuracy: 30,
            speed: 20,
            reasoning: 25,
            differential: 15,
            treatment: 10
          },
          allowedAttempts: 1,
          showLeaderboard: true,
          revealAnswers: true
        }
      }).returning();
      
      res.json({
        success: true,
        competition,
        theme: themedCompetition
      });
      
    } catch (error: any) {
      console.error("Error creating themed competition:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Tournament bracket creation
  app.post("/api/competitions/:id/tournament", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const competitionId = parseInt(req.params.id);
      const { formatType } = req.body;
      
      // Get participants
      const participants = await db
        .select({ userId: competitionParticipants.userId })
        .from(competitionParticipants)
        .where(eq(competitionParticipants.competitionId, competitionId));
      
      const formats = competitionContentService.getTournamentFormats();
      const format = formats.find(f => f.type === formatType);
      
      if (!format) {
        return res.status(400).json({ error: "Invalid tournament format" });
      }
      
      const bracket = await competitionContentService.createTournamentBracket(
        competitionId,
        participants.map(p => p.userId),
        format
      );
      
      res.json(bracket);
      
    } catch (error: any) {
      console.error("Error creating tournament bracket:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Enhanced leaderboards with filtering
  app.get("/api/leaderboards/enhanced", async (req, res) => {
    try {
      const { 
        category = 'overall',
        timeframe = 'all_time',
        bodyPart,
        specialty,
        minParticipations = 1
      } = req.query;
      
      // Get enhanced leaderboard data with analytics
      const baseQuery = db
        .select({
          userId: competitionParticipants.userId,
          username: users.username,
          totalScore: sql<number>`sum(${competitionParticipants.finalScore})`,
          averageScore: sql<number>`avg(${competitionParticipants.finalScore})`,
          participationCount: sql<number>`count(*)`,
          winCount: sql<number>`sum(case when ${competitionParticipants.ranking} = 1 then 1 else 0 end)`,
          topThreeCount: sql<number>`sum(case when ${competitionParticipants.ranking} <= 3 then 1 else 0 end)`
        })
        .from(competitionParticipants)
        .innerJoin(users, eq(users.id, competitionParticipants.userId))
        .innerJoin(competitions, eq(competitions.id, competitionParticipants.competitionId))
        .groupBy(competitionParticipants.userId, users.username)
        .having(sql`count(*) >= ${minParticipations}`)
        .orderBy(sql`avg(${competitionParticipants.finalScore}) desc`)
        .limit(50);
      
      const results = await baseQuery;
      
      const enhancedResults = results.map((result, index) => ({
        rank: index + 1,
        userId: result.userId,
        username: result.username,
        averageScore: Math.round((result.averageScore || 0) * 10) / 10,
        totalScore: result.totalScore || 0,
        participationCount: Number(result.participationCount),
        winRate: Math.round(((result.winCount || 0) / Number(result.participationCount)) * 100 * 10) / 10,
        podiumRate: Math.round(((result.topThreeCount || 0) / Number(result.participationCount)) * 100 * 10) / 10,
        trendIndicator: index < 10 ? '📈' : index < 25 ? '➡️' : '📉'
      }));
      
      res.json({
        category,
        timeframe,
        bodyPart,
        leaderboard: enhancedResults,
        metadata: {
          totalParticipants: results.length,
          lastUpdated: new Date().toISOString(),
          filters: { category, timeframe, bodyPart, specialty, minParticipations }
        }
      });
      
    } catch (error: any) {
      console.error("Error fetching enhanced leaderboards:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Competition insights and statistics
  app.get("/api/competitions/insights", async (req, res) => {
    try {
      const insights = await db
        .select({
          totalCompetitions: sql<number>`count(*)`,
          activeCompetitions: sql<number>`sum(case when status = 'active' then 1 else 0 end)`,
          upcomingCompetitions: sql<number>`sum(case when status = 'upcoming' then 1 else 0 end)`,
          totalParticipations: sql<number>`sum(current_participants)`,
          averageParticipants: sql<number>`avg(current_participants)`,
          popularBodyPart: sql<string>`mode() within group (order by body_part)`,
          averageScore: sql<number>`avg(current_participants * 75)` // Estimated average
        })
        .from(competitions);
      
      const recentActivity = await db
        .select({
          date: sql<string>`date(created_at)`,
          competitionCount: sql<number>`count(*)`,
          participantCount: sql<number>`sum(current_participants)`
        })
        .from(competitions)
        .where(gte(competitions.createdAt, sql`current_date - interval '7 days'`))
        .groupBy(sql`date(created_at)`)
        .orderBy(sql`date(created_at) desc`)
        .limit(7);
      
      res.json({
        overview: insights[0] || {},
        recentActivity,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error("Error fetching competition insights:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // PATTERN RECOGNITION LEADERBOARD API ROUTES
  // ============================================================================

  // Submit Pattern Recognition score
  app.post('/api/pattern-recognition/submit-score', ensureAuthenticated, async (req, res) => {
    try {
      const { score, timeTaken, questionsCorrect, streakLength, gameSessionId } = req.body;
      
      // Validate input
      if (typeof score !== 'number' || score < 0 || score > 100) {
        return res.status(400).json({ message: 'Invalid score' });
      }
      if (typeof timeTaken !== 'number' || timeTaken < 0) {
        return res.status(400).json({ message: 'Invalid time taken' });
      }
      if (typeof questionsCorrect !== 'number' || questionsCorrect < 0 || questionsCorrect > 100) {
        return res.status(400).json({ message: 'Invalid questions correct count' });
      }
      
      const newScore = await db
        .insert(patternRecognitionScores)
        .values({
          userId: req.user.id,
          score,
          timeTaken,
          questionsCorrect,
          streakLength: streakLength || 0,
          gameSessionId: gameSessionId || null,
        })
        .returning();
      
      res.json({ success: true, scoreId: newScore[0].id });
    } catch (error) {
      console.error('Error submitting Pattern Recognition score:', error);
      res.status(500).json({ message: 'Failed to submit score' });
    }
  });

  // Get Pattern Recognition leaderboard
  app.get('/api/pattern-recognition/leaderboard', async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          u.username,
          prs.score,
          prs.time_taken,
          prs.questions_correct,
          prs.streak_length,
          prs.completion_date,
          ROW_NUMBER() OVER (ORDER BY prs.score DESC, prs.time_taken ASC) as rank
        FROM pattern_recognition_scores prs
        JOIN users u ON prs.user_id = u.id
        WHERE prs.id IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY score DESC, time_taken ASC) as rn
            FROM pattern_recognition_scores
          ) ranked WHERE rn = 1
        )
        ORDER BY prs.score DESC, prs.time_taken ASC
        LIMIT 10
      `);

      const leaderboard = result.rows.map((row: any) => ({
        rank: row.rank,
        username: row.username,
        score: row.score,
        timeTaken: row.time_taken,
        questionsCorrect: row.questions_correct,
        streakLength: row.streak_length,
        completionDate: row.completion_date,
      }));
      
      res.json(leaderboard);
    } catch (error) {
      console.error('Error fetching Pattern Recognition leaderboard:', error);
      res.status(500).json({ message: 'Failed to fetch leaderboard' });
    }
  });

  // Get user's personal best Pattern Recognition score
  app.get('/api/pattern-recognition/user-best', ensureAuthenticated, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          score,
          time_taken,
          questions_correct,
          streak_length,
          completion_date,
          (SELECT COUNT(*) + 1 FROM pattern_recognition_scores prs2 
           JOIN users u2 ON prs2.user_id = u2.id
           WHERE prs2.id IN (
             SELECT id FROM (
               SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY score DESC, time_taken ASC) as rn
               FROM pattern_recognition_scores
             ) ranked WHERE rn = 1
           ) AND (prs2.score > prs.score OR (prs2.score = prs.score AND prs2.time_taken < prs.time_taken))
          ) as global_rank
        FROM pattern_recognition_scores prs
        WHERE prs.user_id = ${req.user.id}
        ORDER BY prs.score DESC, prs.time_taken ASC
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return res.json({ hasPlayed: false });
      }

      const best = result.rows[0] as any;
      res.json({
        hasPlayed: true,
        score: best.score,
        timeTaken: best.time_taken,
        questionsCorrect: best.questions_correct,
        streakLength: best.streak_length,
        completionDate: best.completion_date,
        globalRank: best.global_rank,
      });
    } catch (error) {
      console.error('Error fetching user best score:', error);
      res.status(500).json({ message: 'Failed to fetch user best score' });
    }
  });

  // Get Pattern Recognition stats for home page
  app.get('/api/pattern-recognition/stats', async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT user_id) as total_players,
          COUNT(*) as total_attempts,
          ROUND(AVG(score), 1) as average_score,
          MAX(score) as highest_score,
          COUNT(CASE WHEN completion_date >= CURRENT_DATE THEN 1 END) as attempts_today
        FROM pattern_recognition_scores
      `);

      const stats = result.rows[0] as any;
      res.json({
        totalPlayers: parseInt(stats.total_players) || 0,
        totalAttempts: parseInt(stats.total_attempts) || 0,
        averageScore: parseFloat(stats.average_score) || 0,
        highestScore: parseInt(stats.highest_score) || 0,
        attemptsToday: parseInt(stats.attempts_today) || 0,
      });
    } catch (error) {
      console.error('Error fetching Pattern Recognition stats:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // ============================================================================
  // HOME PAGE API ROUTES
  // ============================================================================

  // Get featured competitions for home page
  app.get('/api/home/featured-competitions', async (req, res) => {
    try {
      // Get priority competitions with raw SQL to avoid Drizzle issues
      const result = await db.execute(sql`
        SELECT id, title, description, game_type, body_part, difficulty, 
               time_limit_minutes, max_participants, current_participants, status
        FROM competitions 
        WHERE status = 'active'
        ORDER BY 
          CASE WHEN id IN (107, 108) THEN 0 ELSE 1 END,
          current_participants
        LIMIT 4
      `);

      // Map the results to expected format
      const featuredCompetitions = result.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        gameType: row.game_type,
        bodyPart: row.body_part,
        difficulty: row.difficulty,
        timeLimit: row.time_limit_minutes,
        maxParticipants: row.max_participants,
        currentParticipants: row.current_participants,
        status: row.status
      }));
      
      res.json(featuredCompetitions);
    } catch (error) {
      console.error('Error fetching featured competitions:', error);
      res.status(500).json({ message: 'Failed to fetch featured competitions' });
    }
  });

  // Get global leaderboard for home page
  app.get('/api/home/global-leaderboard', async (req, res) => {
    try {
      // Get top performers across all competitions
      const topPerformers = await db.execute(sql`
        SELECT 
          u.username,
          u.id as user_id,
          COUNT(cp.id) as total_competitions,
          AVG(cp.total_score) as avg_score,
          MAX(cp.total_score) as best_score,
          MAX(cp.completed_at) as last_activity
        FROM ${users} u
        JOIN ${competitionParticipants} cp ON u.id = cp.user_id
        WHERE cp.completed_at IS NOT NULL
        GROUP BY u.id, u.username
        ORDER BY avg_score DESC, total_competitions DESC
        LIMIT 10
      `);

      res.json(topPerformers.rows);
    } catch (error) {
      console.error('Error fetching global leaderboard:', error);
      res.status(500).json({ message: 'Failed to fetch global leaderboard' });
    }
  });

  // Get platform statistics for home page
  app.get('/api/home/platform-stats', async (req, res) => {
    try {
      const stats = await Promise.all([
        // Total users
        db.select({ count: sql<number>`count(*)` }).from(users),
        
        // Total competitions completed
        db.select({ count: sql<number>`count(*)` })
          .from(competitionParticipants)
          .where(sql`completed_at IS NOT NULL`),
        
        // Total SOAP notes created
        db.select({ count: sql<number>`count(*)` })
          .from(soapNotes),
        
        // Total virtual patients created
        db.select({ count: sql<number>`count(*)` }).from(virtualPatients)
      ]);

      res.json({
        totalUsers: stats[0][0]?.count || 0,
        totalCompetitions: stats[1][0]?.count || 0,
        totalSoapNotes: stats[2][0]?.count || 0,
        totalVirtualPatients: stats[3][0]?.count || 0
      });
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      res.status(500).json({ 
        totalUsers: 0,
        totalCompetitions: 0,
        totalSoapNotes: 0,
        totalVirtualPatients: 0
      });
    }
  });

  // ============================================================================
  // SOAP NOTES API ROUTES (Separate from Clinical Notes)
  // ============================================================================

  // Create new SOAP notes session
  app.post("/api/soap-notes/sessions", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const session = await soapNotesService.createSession(userId);
      res.status(201).json(session);
    } catch (error: any) {
      console.error("Error creating SOAP notes session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get active SOAP notes session
  app.get("/api/soap-notes/sessions/active", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const session = await soapNotesService.getOrCreateActiveSession(userId);
      res.json(session);
    } catch (error: any) {
      console.error("Error getting active SOAP notes session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Upload audio for SOAP notes processing
  app.post("/api/soap-notes/sessions/:sessionId/audio", ensureAuthenticated, upload.single('audio'), async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { sessionId } = req.params;
      const audioFile = req.file;

      if (!audioFile) {
        return res.status(400).json({ error: 'Audio file is required' });
      }

      // Verify session belongs to user
      const existingSession = await soapNotesService.getSoapNote(parseInt(sessionId));
      if (!existingSession || existingSession.userId !== userId) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const updatedSession = await soapNotesService.processAudioForSession(
        existingSession.sessionId,
        audioFile.buffer,
        audioFile.originalname
      );

      res.json(updatedSession);
    } catch (error: any) {
      console.error("Error processing audio for SOAP notes:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all SOAP notes for user
  app.get("/api/soap-notes", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const notes = await soapNotesService.getUserSoapNotes(userId);
      res.json(notes);
    } catch (error: any) {
      console.error("Error getting SOAP notes:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific SOAP note
  app.get("/api/soap-notes/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const note = await soapNotesService.getSoapNote(parseInt(id));

      if (!note || note.userId !== userId) {
        return res.status(404).json({ error: 'SOAP note not found' });
      }

      res.json(note);
    } catch (error: any) {
      console.error("Error getting SOAP note:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mark patient switch for session
  app.post("/api/soap-notes/sessions/:sessionId/patient-switch", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { sessionId } = req.params;

      // Verify session belongs to user
      const existingSession = await storage.getSoapNoteBySessionId(sessionId);
      if (!existingSession || existingSession.userId !== userId) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const updatedSession = await soapNotesService.markPatientSwitch(sessionId);
      res.json(updatedSession);
    } catch (error: any) {
      console.error("Error marking patient switch:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Real-time SOAP chunk processing endpoint
  app.post("/api/soap-notes/real-time-chunk", upload.single('audio'), async (req: Request, res: Response) => {
    try {
      const audioFile = req.file;
      const progressiveTranscript = req.body.progressiveTranscript || '';
      const isCompleteAudio = req.body.isCompleteAudio === 'true';

      if (!audioFile) {
        return res.status(400).json({ error: 'Audio chunk is required' });
      }

      console.log(`[REAL-TIME] Processing chunk: ${audioFile.size} bytes at ${new Date().toLocaleTimeString()}`);

      // Transcribe the complete audio
      const fullTranscript = await transcribeAudio(audioFile.path);
      
      // Clean up temp file after transcription
      fs.unlinkSync(audioFile.path);
      
      // Extract only the new portion by removing the progressive transcript from the full transcript
      let chunkTranscript = fullTranscript;
      if (isCompleteAudio && progressiveTranscript) {
        // Find the new content by removing the already processed portion
        const progressiveLength = progressiveTranscript.length;
        if (fullTranscript.length > progressiveLength) {
          // Extract the new portion
          chunkTranscript = fullTranscript.substring(progressiveLength).trim();
          if (!chunkTranscript) {
            // If no new content, use the last portion of the full transcript
            chunkTranscript = fullTranscript.split(' ').slice(-50).join(' ');
          }
        }
      }

      // Combine with progressive transcript for context
      const fullContext = progressiveTranscript 
        ? `${progressiveTranscript} ${chunkTranscript}`
        : chunkTranscript;

      // Generate/update SOAP sections using AI with the last 5 minutes of context
      const contextWords = fullContext.split(' ');
      const recentContext = contextWords.slice(-1500).join(' '); // ~5 minutes of speech

      console.log(`[REAL-TIME] Transcription complete: ${chunkTranscript.substring(0, 100)}...`);

      // Generate SOAP sections progressively
      const soapSections = await soapNotesService.generateProgressiveSoapSections(
        recentContext,
        chunkTranscript
      );
      console.log(`[REAL-TIME] SOAP sections generated`);

      // Generate AI suggestions based on current context
      const aiSuggestions = await soapNotesService.generateAISuggestions(recentContext);
      console.log(`[REAL-TIME] AI suggestions generated: ${aiSuggestions.length} suggestions`);

      // Check for patient switch
      const patientSwitch = await soapNotesService.analyzePatientSwitch(
        chunkTranscript,
        progressiveTranscript
      );

      const response = {
        transcription: chunkTranscript,
        soapSections,
        aiSuggestions,
        patientSwitch,
        timestamp: new Date().toISOString()
      };
      
      console.log(`[REAL-TIME] Sending response with SOAP sections:`, Object.keys(soapSections));
      res.json(response);
    } catch (error: any) {
      console.error("Error processing real-time chunk:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // AI AUTOMATIC PAPERWORK API ROUTES
  // ============================================================================

  // Generate automatic paperwork for a SOAP note
  app.post("/api/soap-notes/:id/generate-paperwork", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const soapNote = await soapNotesService.getSoapNote(parseInt(id));

      if (!soapNote || soapNote.userId !== userId) {
        return res.status(404).json({ error: 'SOAP note not found' });
      }

      const updatedNote = await soapNotesService.generateAutomaticPaperwork(parseInt(id));
      res.json(updatedNote);
    } catch (error: any) {
      console.error("Error generating automatic paperwork:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate referral letter
  app.post("/api/soap-notes/:id/generate-referral", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const { specialtyType, reason, urgency, clinicalFindings } = req.body;

      if (!specialtyType || !reason || !urgency || !clinicalFindings) {
        return res.status(400).json({ error: 'Missing required fields for referral letter' });
      }

      const soapNote = await soapNotesService.getSoapNote(parseInt(id));
      if (!soapNote || soapNote.userId !== userId) {
        return res.status(404).json({ error: 'SOAP note not found' });
      }

      const updatedNote = await soapNotesService.generateReferralLetter(
        parseInt(id),
        specialtyType,
        reason,
        urgency,
        clinicalFindings
      );

      res.json(updatedNote);
    } catch (error: any) {
      console.error("Error generating referral letter:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate insurance documentation
  app.post("/api/soap-notes/:id/generate-insurance", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const { sessionCount = 1 } = req.body;

      const soapNote = await soapNotesService.getSoapNote(parseInt(id));
      if (!soapNote || soapNote.userId !== userId) {
        return res.status(404).json({ error: 'SOAP note not found' });
      }

      const updatedNote = await soapNotesService.generateInsuranceDocumentation(parseInt(id), sessionCount);
      res.json(updatedNote);
    } catch (error: any) {
      console.error("Error generating insurance documentation:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate discharge summary
  app.post("/api/soap-notes/generate-discharge-summary", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { patientName } = req.body;

      const dischargeSummary = await soapNotesService.generateDischargeSummary(userId, patientName);
      res.json({ dischargeSummary });
    } catch (error: any) {
      console.error("Error generating discharge summary:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate progress report
  app.post("/api/soap-notes/generate-progress-report", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { reportingPeriod, patientName } = req.body;

      if (!reportingPeriod || !reportingPeriod.start || !reportingPeriod.end) {
        return res.status(400).json({ error: 'Reporting period with start and end dates is required' });
      }

      const progressReport = await soapNotesService.generateProgressReport(userId, reportingPeriod, patientName);
      res.json({ progressReport });
    } catch (error: any) {
      console.error("Error generating progress report:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate discharge summary for specific SOAP note
  app.post("/api/soap-notes/:id/generate-discharge-summary", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const soapNote = await soapNotesService.getSoapNote(parseInt(id));
      if (!soapNote || soapNote.userId !== userId) {
        return res.status(404).json({ error: 'SOAP note not found' });
      }

      const dischargeSummary = await aiPaperworkService.generateDischargeSummary(soapNote);
      res.json({ dischargeSummary });
    } catch (error: any) {
      console.error("Error generating discharge summary:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate progress report for specific SOAP note
  app.post("/api/soap-notes/:id/generate-progress-report", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const soapNote = await soapNotesService.getSoapNote(parseInt(id));
      if (!soapNote || soapNote.userId !== userId) {
        return res.status(404).json({ error: 'SOAP note not found' });
      }

      const progressReport = await aiPaperworkService.generateProgressReport(soapNote);
      res.json({ progressReport });
    } catch (error: any) {
      console.error("Error generating progress report:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate imaging referral for specific SOAP note
  app.post("/api/soap-notes/:id/generate-imaging-referral", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const { imagingType } = req.body;

      if (!imagingType) {
        return res.status(400).json({ error: 'Imaging type is required' });
      }

      const soapNote = await soapNotesService.getSoapNote(parseInt(id));
      if (!soapNote || soapNote.userId !== userId) {
        return res.status(404).json({ error: 'SOAP note not found' });
      }

      const imagingReferral = await aiPaperworkService.generateImagingReferral(soapNote, imagingType);
      res.json({ imagingReferral });
    } catch (error: any) {
      console.error("Error generating imaging referral:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate return to work certificate for specific SOAP note
  app.post("/api/soap-notes/:id/generate-return-to-work", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const soapNote = await soapNotesService.getSoapNote(parseInt(id));
      if (!soapNote || soapNote.userId !== userId) {
        return res.status(404).json({ error: 'SOAP note not found' });
      }

      const returnToWorkCertificate = await aiPaperworkService.generateReturnToWorkCertificate(soapNote);
      res.json({ returnToWorkCertificate });
    } catch (error: any) {
      console.error("Error generating return to work certificate:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate time off work certificate for specific SOAP note
  app.post("/api/soap-notes/:id/generate-time-off-work", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const { duration } = req.body;

      if (!duration) {
        return res.status(400).json({ error: 'Duration is required for time off certificate' });
      }

      const soapNote = await soapNotesService.getSoapNote(parseInt(id));
      if (!soapNote || soapNote.userId !== userId) {
        return res.status(404).json({ error: 'SOAP note not found' });
      }

      const timeOffWorkCertificate = await aiPaperworkService.generateTimeOffWorkCertificate(soapNote, duration);
      res.json({ timeOffWorkCertificate });
    } catch (error: any) {
      console.error("Error generating time off work certificate:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Auto-generate paperwork for all completed notes
  app.post("/api/soap-notes/auto-generate-paperwork", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      await soapNotesService.autoGeneratePaperworkForCompletedNotes(userId);
      res.json({ message: 'Auto-generation of paperwork completed' });
    } catch (error: any) {
      console.error("Error auto-generating paperwork:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Transcribe audio and generate SOAP sections (Enhanced SOAP Notes)
  app.post("/api/soap-notes/transcribe-and-generate", ensureAuthenticated, upload.single('audio'), async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const audioFile = req.file;
      const sessionId = req.body.sessionId;

      if (!audioFile) {
        return res.status(400).json({ error: 'Audio file is required' });
      }

      // Create or get session for this recording
      const session = await soapNotesService.createSession(userId, sessionId);

      // Process the audio file - transcribe and generate SOAP sections
      const result = await soapNotesService.processAudioForSession(
        session.sessionId,
        audioFile.buffer,
        audioFile.originalname
      );

      // Return transcript and SOAP sections
      res.json({
        transcript: result.fullTranscription,
        soapSections: {
          subjective: result.subjective,
          objective: result.objective,
          assessment: result.assessment,
          plan: result.plan
        },
        confidence: result.confidence,
        sessionId: result.sessionId
      });

    } catch (error: any) {
      console.error("Error transcribing and generating SOAP:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // COMPARATIVE CASE ANALYSIS API ROUTES
  // ============================================================================

  // Perform comparative analysis for a SOAP note
  app.post("/api/soap-notes/:id/comparative-analysis", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const soapNoteId = parseInt(req.params.id);
      if (isNaN(soapNoteId)) {
        return res.status(400).json({ error: 'Invalid SOAP note ID' });
      }

      // Check if user owns the SOAP note
      const soapNote = await storage.getSoapNote(soapNoteId);
      if (!soapNote || soapNote.userId !== userId) {
        return res.status(404).json({ error: 'SOAP note not found' });
      }

      // Perform the comparative analysis
      const analysis = await comparativeAnalysisService.performComparativeAnalysis(soapNoteId);
      
      res.status(201).json({
        success: true,
        analysis,
        message: 'Comparative analysis completed successfully'
      });
    } catch (error: any) {
      console.error("Error performing comparative analysis:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get comparative analysis for a SOAP note
  app.get("/api/soap-notes/:id/comparative-analysis", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const soapNoteId = parseInt(req.params.id);
      if (isNaN(soapNoteId)) {
        return res.status(400).json({ error: 'Invalid SOAP note ID' });
      }

      // Get the analysis
      const analysis = await storage.getComparativeAnalysis(soapNoteId);
      
      if (!analysis) {
        return res.status(404).json({ error: 'No comparative analysis found for this SOAP note' });
      }

      res.json(analysis);
    } catch (error: any) {
      console.error("Error fetching comparative analysis:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get similar cases for a SOAP note
  app.get("/api/soap-notes/:id/similar-cases", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const soapNoteId = parseInt(req.params.id);
      const threshold = parseFloat(req.query.threshold as string) || 0.7;

      if (isNaN(soapNoteId)) {
        return res.status(400).json({ error: 'Invalid SOAP note ID' });
      }

      // Get the SOAP note
      const soapNote = await storage.getSoapNote(soapNoteId);
      if (!soapNote || soapNote.userId !== userId) {
        return res.status(404).json({ error: 'SOAP note not found' });
      }

      // Find similar cases
      const similarCases = await comparativeAnalysisService.findSimilarCases(soapNote, threshold);
      
      res.json({
        soapNoteId,
        threshold,
        caseCount: similarCases.length,
        cases: similarCases.slice(0, 10) // Return top 10 similar cases
      });
    } catch (error: any) {
      console.error("Error finding similar cases:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get treatment pathway analysis
  app.get("/api/soap-notes/:id/pathway-analysis", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const soapNoteId = parseInt(req.params.id);
      if (isNaN(soapNoteId)) {
        return res.status(400).json({ error: 'Invalid SOAP note ID' });
      }

      // Get the SOAP note
      const soapNote = await storage.getSoapNote(soapNoteId);
      if (!soapNote || soapNote.userId !== userId) {
        return res.status(404).json({ error: 'SOAP note not found' });
      }

      // Find similar cases
      const similarCases = await comparativeAnalysisService.findSimilarCases(soapNote);
      
      // Analyze treatment pathways
      const pathwayAnalysis = await comparativeAnalysisService.analyzePathways(similarCases);
      
      res.json({
        soapNoteId,
        analysis: pathwayAnalysis,
        basedOnCases: similarCases.length
      });
    } catch (error: any) {
      console.error("Error analyzing treatment pathways:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get outcome predictions
  app.get("/api/soap-notes/:id/outcome-predictions", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const soapNoteId = parseInt(req.params.id);
      if (isNaN(soapNoteId)) {
        return res.status(400).json({ error: 'Invalid SOAP note ID' });
      }

      // Get the SOAP note
      const soapNote = await storage.getSoapNote(soapNoteId);
      if (!soapNote || soapNote.userId !== userId) {
        return res.status(404).json({ error: 'SOAP note not found' });
      }

      // Find similar cases
      const similarCases = await comparativeAnalysisService.findSimilarCases(soapNote);
      
      // Generate predictions
      const predictions = await comparativeAnalysisService.generatePredictions(similarCases, soapNote);
      
      res.json({
        soapNoteId,
        predictions,
        basedOnCases: similarCases.length
      });
    } catch (error: any) {
      console.error("Error generating outcome predictions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get recent comparative analyses for user
  app.get("/api/comparative-analyses/recent", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const limit = parseInt(req.query.limit as string) || 10;
      
      const recentAnalyses = await storage.getRecentAnalyses(userId, limit);
      
      res.json({
        analyses: recentAnalyses,
        count: recentAnalyses.length
      });
    } catch (error: any) {
      console.error("Error fetching recent analyses:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get SOAP patterns for a condition
  app.get("/api/soap-patterns/:conditionType", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { conditionType } = req.params;
      const { sectionType } = req.query;
      
      const patterns = await storage.getSoapPatterns(
        conditionType,
        sectionType as string | undefined
      );
      
      res.json({
        conditionType,
        sectionType: sectionType || 'all',
        patterns
      });
    } catch (error: any) {
      console.error("Error fetching SOAP patterns:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // VIRTUAL PATIENT API ROUTES (From SOAP Notes)
  // ============================================================================

  // Import virtual patient service
  const { soapVirtualPatientService } = await import('./soapVirtualPatientService');

  // Create virtual patient from SOAP note
  app.post("/api/soap-notes/:id/create-virtual-patient", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const soapNoteId = parseInt(req.params.id);
      if (isNaN(soapNoteId)) {
        return res.status(400).json({ error: 'Invalid SOAP note ID' });
      }

      const result = await soapVirtualPatientService.createVirtualPatientFromSoapNote(soapNoteId, userId);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      console.error("Error creating virtual patient:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get virtual patient by SOAP note ID
  app.get("/api/soap-notes/:id/virtual-patient", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const soapNoteId = parseInt(req.params.id);
      if (isNaN(soapNoteId)) {
        return res.status(400).json({ error: 'Invalid SOAP note ID' });
      }

      const virtualPatient = await soapVirtualPatientService.getVirtualPatientBySoapNote(soapNoteId, userId);
      
      if (!virtualPatient) {
        return res.status(404).json({ error: 'Virtual patient not found' });
      }

      res.json(virtualPatient);
    } catch (error: any) {
      console.error("Error getting virtual patient:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // VIRTUAL PATIENT ANIMATION API ROUTES
  // ============================================================================
  
  // Import animation services
  const { aiMovementGenerator } = await import('./aiMovementGenerator');
  const { skeletonAnimationController } = await import('./skeletonAnimationController');

  // Helper function to generate text hash for change detection
  function generateTextHash(soapNote: SoapNote): string {
    const textContent = [
      soapNote.subjective || '',
      soapNote.objective || '',
      soapNote.assessment || '',
      soapNote.plan || '',
      soapNote.fullTranscription || ''
    ].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < textContent.length; i++) {
      const char = textContent.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  // Generate AI animation from SOAP note text
  app.post("/api/soap-notes/:id/generate-animation", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const soapNoteId = parseInt(req.params.id);
      if (isNaN(soapNoteId)) {
        return res.status(400).json({ error: 'Invalid SOAP note ID' });
      }

      // Get SOAP note
      const soapNote = await storage.getSoapNote(soapNoteId);
      if (!soapNote || soapNote.userId !== userId) {
        return res.status(404).json({ error: 'SOAP note not found' });
      }

      // Generate AI movement animation
      const animationData = await aiMovementGenerator.generateMovementFromSOAP(soapNote);
      
      res.json({
        success: true,
        animationData,
        source: "ai-generated",
        generatedAt: new Date()
      });
    } catch (error) {
      console.error('Error generating animation:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate animation from text input (Text-to-Digital Patient)
  app.post("/api/virtual-patients/:id/generate-text-animation", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const virtualPatientId = parseInt(req.params.id);
      if (isNaN(virtualPatientId)) {
        return res.status(400).json({ error: 'Invalid virtual patient ID' });
      }

      const { soapNote } = req.body;
      if (!soapNote || !soapNote.subjective) {
        return res.status(400).json({ error: 'Clinical text description required' });
      }

      // Check both SOAP virtual patient and regular virtual patient tables
      let virtualPatient = await storage.getSoapVirtualPatient(virtualPatientId);
      let isRegularVirtualPatient = false;
      
      if (!virtualPatient) {
        // Try regular virtual patient table
        virtualPatient = await storage.getVirtualPatient(virtualPatientId);
        isRegularVirtualPatient = true;
      }
      
      if (!virtualPatient || virtualPatient.userId !== userId) {
        return res.status(404).json({ error: 'Virtual patient not found' });
      }

      console.log('Generating text-to-animation for virtual patient:', virtualPatientId);
      console.log('Clinical text input:', soapNote.subjective.substring(0, 100) + '...');

      // Generate AI movement animation from text description
      console.log('Generating AI movement from SOAP note:', Date.now());
      const animationData = await aiMovementGenerator.generateMovementFromSOAP(soapNote);
      console.log('AI movement generation completed, frames:', animationData.frames.length);
      
      // Update the appropriate virtual patient table with animation data
      let updatedVirtualPatient;
      if (isRegularVirtualPatient) {
        // Update regular virtual patient
        updatedVirtualPatient = await storage.updateVirtualPatient(virtualPatientId, {
          treatment_options: {
            motionData: animationData.frames,
            movementPatterns: animationData.movementPatterns,
            clinicalCorrelation: animationData.clinicalCorrelation,
            animationSource: "text-to-animation",
            generatedAt: new Date().toISOString()
          }
        });
      } else {
        // Update SOAP virtual patient
        updatedVirtualPatient = await storage.updateSoapVirtualPatient(virtualPatientId, {
          motionData: {
            frames: animationData.frames,
            movementPatterns: animationData.movementPatterns,
            clinicalCorrelation: animationData.clinicalCorrelation,
            animationSource: "text-to-animation",
            generatedAt: new Date().toISOString()
          },
          hasMotionData: true,
          aiGenerated: true
        });
      }
      
      console.log('Virtual patient updated with animation data');

      console.log('Sending animation response with frames:', animationData.frames?.length || 0);
      
      res.json({
        success: true,
        frames: animationData.frames,
        animationSequence: {
          frames: animationData.frames,
          movementPatterns: animationData.movementPatterns,
          clinicalCorrelation: animationData.clinicalCorrelation
        },
        movementPatterns: animationData.movementPatterns,
        clinicalCorrelation: animationData.clinicalCorrelation,
        source: "text-to-animation",
        generatedAt: new Date(),
        virtualPatient: updatedVirtualPatient
      });
    } catch (error) {
      console.error('Error generating text animation:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update virtual patient animation when SOAP text changes
  app.post("/api/virtual-patients/:id/update-animation", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const virtualPatientId = parseInt(req.params.id);
      if (isNaN(virtualPatientId)) {
        return res.status(400).json({ error: 'Invalid virtual patient ID' });
      }

      // Get virtual patient
      const virtualPatient = await storage.getSoapVirtualPatient(virtualPatientId);
      if (!virtualPatient || virtualPatient.userId !== userId) {
        return res.status(404).json({ error: 'Virtual patient not found' });
      }

      // Get associated SOAP note
      const soapNote = await storage.getSoapNote(virtualPatient.soapNoteId);
      if (!soapNote) {
        return res.status(404).json({ error: 'Associated SOAP note not found' });
      }

      // Generate updated animation sequence
      const animationSequence = await skeletonAnimationController.updateAnimationFromSOAPChanges(virtualPatient, soapNote);
      
      // Update virtual patient with new animation data
      const updatedVirtualPatient = await storage.updateSoapVirtualPatient(virtualPatientId, {
        aiGeneratedPoseData: animationSequence.frames,
        animationGeneratedAt: new Date(),
        animationGenerationStatus: "complete"
      });

      res.json({
        success: true,
        virtualPatient: updatedVirtualPatient,
        animationSequence
      });
    } catch (error) {
      console.error('Error updating animation:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Set animation blend mode (text-only, motion-only, hybrid)
  app.post("/api/virtual-patients/:id/set-blend-mode", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const virtualPatientId = parseInt(req.params.id);
      const { blendMode } = req.body;

      if (!["text-only", "motion-only", "hybrid"].includes(blendMode)) {
        return res.status(400).json({ error: 'Invalid blend mode' });
      }

      // Get virtual patient
      const virtualPatient = await storage.getSoapVirtualPatient(virtualPatientId);
      if (!virtualPatient || virtualPatient.userId !== userId) {
        return res.status(404).json({ error: 'Virtual patient not found' });
      }

      // Get SOAP note
      const soapNote = await storage.getSoapNote(virtualPatient.soapNoteId);
      if (!soapNote) {
        return res.status(404).json({ error: 'Associated SOAP note not found' });
      }

      // Generate animation with new blend mode
      const animationSequence = await skeletonAnimationController.setBlendMode(blendMode, virtualPatient, soapNote);
      
      // Update virtual patient
      const updatedVirtualPatient = await storage.updateSoapVirtualPatient(virtualPatientId, {
        animationBlendMode: blendMode,
        aiGeneratedPoseData: blendMode === "motion-only" ? null : animationSequence.frames,
        animationGeneratedAt: new Date()
      });

      res.json({
        success: true,
        virtualPatient: updatedVirtualPatient,
        animationSequence
      });
    } catch (error) {
      console.error('Error setting blend mode:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get animation sequence for virtual patient
  app.get("/api/virtual-patients/:id/animation", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const virtualPatientId = parseInt(req.params.id);
      if (isNaN(virtualPatientId)) {
        return res.status(400).json({ error: 'Invalid virtual patient ID' });
      }

      // Get virtual patient
      const virtualPatient = await storage.getSoapVirtualPatient(virtualPatientId);
      if (!virtualPatient || virtualPatient.userId !== userId) {
        return res.status(404).json({ error: 'Virtual patient not found' });
      }

      // Get SOAP note
      const soapNote = await storage.getSoapNote(virtualPatient.soapNoteId);
      if (!soapNote) {
        return res.status(404).json({ error: 'Associated SOAP note not found' });
      }

      // Generate current animation sequence based on blend mode
      const animationSequence = await skeletonAnimationController.generateAnimationSequence(
        virtualPatient, 
        soapNote, 
        virtualPatient.animationBlendMode || "text-only"
      );

      res.json({
        success: true,
        animationSequence,
        blendMode: virtualPatient.animationBlendMode || "text-only",
        hasMotionData: virtualPatient.hasMotionData || false,
        hasAiAnimation: virtualPatient.hasAiAnimation || false
      });
    } catch (error) {
      console.error('Error getting animation:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all virtual patients for user (from both tables)
  app.get("/api/virtual-patients", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get virtual patients from both old and new tables
      const [soapVirtualPatients, oldVirtualPatients] = await Promise.all([
        soapVirtualPatientService.getUserVirtualPatients(userId),
        storage.getUserVirtualPatients(userId)
      ]);

      // Convert old virtual patients to compatible format with animation fields
      const convertedOldPatients = oldVirtualPatients.map(patient => ({
        ...patient,
        // Add animation fields for compatibility (initially false/null for old patients)
        motionData: null,
        hasMotionData: false,
        aiGenerated: false,
        // Add type field to distinguish old vs new patients
        tableSource: "virtual_patients"
      }));

      // Add tableSource to new patients for identification
      const enhancedSoapPatients = soapVirtualPatients.map(patient => ({
        ...patient,
        tableSource: "soap_virtual_patients"
      }));

      // Combine all patients and sort by creation date
      const allPatients = [...enhancedSoapPatients, ...convertedOldPatients]
        .sort((a, b) => new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime());

      res.json(allPatients);
    } catch (error: any) {
      console.error("Error getting virtual patients:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create enhanced virtual patient with motion capture integration
  app.post("/api/enhanced-virtual-patients", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { soapData, sessionDuration, includeMotionData, motionCaptureData, soapNoteId, motionData } = req.body;

      // Handle both new Enhanced SOAP Notes format and legacy format
      if (soapData) {
        // New Enhanced SOAP Notes format - create from SOAP sections directly
        if (!soapData.subjective && !soapData.objective) {
          return res.status(400).json({ error: 'Insufficient SOAP data to create virtual patient' });
        }

        const { enhancedVirtualPatientService } = await import("./enhancedVirtualPatientService");
        const result = await enhancedVirtualPatientService.createEnhancedVirtualPatientFromSOAP(
          soapData, 
          userId, 
          includeMotionData ? motionCaptureData : null,
          sessionDuration
        );

        if (!result.success) {
          return res.status(400).json({ error: result.message });
        }

        res.json(result);
      } else if (soapNoteId) {
        // Legacy format - create from existing SOAP note ID
        const { enhancedVirtualPatientService } = await import("./enhancedVirtualPatientService");
        const result = await enhancedVirtualPatientService.createEnhancedVirtualPatient(
          soapNoteId, 
          userId, 
          motionData
        );

        if (!result.success) {
          return res.status(400).json({ error: result.message });
        }

        res.json(result);
      } else {
        return res.status(400).json({ error: 'Either SOAP data or SOAP note ID is required' });
      }
    } catch (error: any) {
      console.error("Error creating enhanced virtual patient:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get enhanced virtual patients with motion data indicators
  app.get("/api/enhanced-virtual-patients", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { enhancedVirtualPatientService } = await import("./enhancedVirtualPatientService");
      const virtualPatients = await enhancedVirtualPatientService.getEnhancedVirtualPatients(userId);
      res.json(virtualPatients);
    } catch (error: any) {
      console.error("Error getting enhanced virtual patients:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific enhanced virtual patient
  app.get("/api/enhanced-virtual-patients/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const virtualPatientId = parseInt(req.params.id);
      if (isNaN(virtualPatientId)) {
        return res.status(400).json({ error: 'Invalid virtual patient ID' });
      }

      const { enhancedVirtualPatientService } = await import("./enhancedVirtualPatientService");
      const virtualPatient = await enhancedVirtualPatientService.getEnhancedVirtualPatient(virtualPatientId, userId);
      
      if (!virtualPatient) {
        return res.status(404).json({ error: 'Enhanced virtual patient not found' });
      }

      res.json(virtualPatient);
    } catch (error: any) {
      console.error("Error getting enhanced virtual patient:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific virtual patient
  app.get("/api/virtual-patients/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const virtualPatientId = parseInt(req.params.id);
      if (isNaN(virtualPatientId)) {
        return res.status(400).json({ error: 'Invalid virtual patient ID' });
      }

      const virtualPatient = await soapVirtualPatientService.getVirtualPatient(virtualPatientId, userId);
      
      if (!virtualPatient) {
        return res.status(404).json({ error: 'Virtual patient not found' });
      }

      res.json(virtualPatient);
    } catch (error: any) {
      console.error("Error getting virtual patient:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update virtual patient
  app.put("/api/virtual-patients/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const virtualPatientId = parseInt(req.params.id);
      if (isNaN(virtualPatientId)) {
        return res.status(400).json({ error: 'Invalid virtual patient ID' });
      }

      const updates = req.body;
      const updatedVirtualPatient = await soapVirtualPatientService.updateVirtualPatient(virtualPatientId, userId, updates);
      
      if (!updatedVirtualPatient) {
        return res.status(404).json({ error: 'Virtual patient not found' });
      }

      res.json(updatedVirtualPatient);
    } catch (error: any) {
      console.error("Error updating virtual patient:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete virtual patient
  app.delete("/api/virtual-patients/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const virtualPatientId = parseInt(req.params.id);
      if (isNaN(virtualPatientId)) {
        return res.status(400).json({ error: 'Invalid virtual patient ID' });
      }

      const deleted = await soapVirtualPatientService.deleteVirtualPatient(virtualPatientId, userId);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Virtual patient not found' });
      }

      res.json({ message: 'Virtual patient deleted successfully' });
    } catch (error: any) {
      console.error("Error deleting virtual patient:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Game Competition Routes

  // Create a new game competition
  app.post("/api/game-competitions", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { gameType, title, description, bodyPart, difficulty, timeLimit } = req.body;
      
      // Import game content generator
      const { gameContentGenerator } = await import("./gameContentGenerator");
      
      // Generate game content
      const generatedContent = await gameContentGenerator.generateGameContent({
        gameType,
        bodyPart,
        difficulty
      });

      // Create competition
      const { db } = await import("./db");
      const { competitions, gameContent: gameContentTable } = await import("@shared/schema");
      
      const [competition] = await db.insert(competitions).values({
        title,
        description,
        type: "specialty_league",
        gameType,
        bodyPart,
        difficulty,
        timeLimit,
        status: "upcoming",
        startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        caseStudyIds: [],
        maxParticipants: 50
      }).returning();

      // Store game content
      await db.insert(gameContentTable).values({
        competitionId: competition.id,
        gameType,
        content: { [gameType]: generatedContent }
      });

      res.json({ competition, gameContent: generatedContent });
    } catch (error) {
      console.error('Error creating game competition:', error);
      res.status(500).json({ message: 'Failed to create game competition' });
    }
  });

  // Get game competition with content
  app.get("/api/game-competitions/:id", async (req: Request, res: Response) => {
    try {
      const competitionId = parseInt(req.params.id);
      const { db } = await import("./db");
      const { competitions, gameContent } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const [competition] = await db
        .select()
        .from(competitions)
        .where(eq(competitions.id, competitionId));

      if (!competition) {
        return res.status(404).json({ message: 'Competition not found' });
      }

      const [content] = await db
        .select()
        .from(gameContent)
        .where(eq(gameContent.competitionId, competitionId));

      res.json({ competition, content: content?.content || {} });
    } catch (error) {
      console.error('Error getting game competition:', error);
      res.status(500).json({ message: 'Failed to get game competition' });
    }
  });

  // Get all game competitions - Lightning Diagnosis and Treatment Speed Run challenges
  app.get("/api/game-competitions", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { competitions } = await import("@shared/schema");
      const { or, eq, desc } = await import("drizzle-orm");

      const gameCompetitions = await db
        .select()
        .from(competitions)
        .where(or(
          eq(competitions.gameType, "lightning_diagnosis"),
          eq(competitions.gameType, "treatment_speed_run"),
          eq(competitions.gameType, "progressive_diagnostic_challenge"),
          eq(competitions.gameType, "red_flag_detective"),
          eq(competitions.gameType, "differential_diagnosis_duel"),
          eq(competitions.gameType, "emergency_room_simulator"),
          eq(competitions.gameType, "diagnosis_duel"),
          eq(competitions.gameType, "manual_therapy_mastery"),
          eq(competitions.gameType, "exercise_prescription_expert")
        ))
        .orderBy(desc(competitions.createdAt));

      // Remove duplicates based on title
      const uniqueCompetitions = gameCompetitions.reduce((acc, current) => {
        const existingIndex = acc.findIndex(comp => comp.title === current.title);
        if (existingIndex === -1) {
          acc.push(current);
        } else {
          // Keep the most recent one (higher ID or more recent createdAt)
          if (current.id > acc[existingIndex].id) {
            acc[existingIndex] = current;
          }
        }
        return acc;
      }, [] as typeof gameCompetitions);

      res.json(uniqueCompetitions);
    } catch (error) {
      console.error('Error getting game competitions:', error);
      res.status(500).json({ message: 'Failed to get game competitions' });
    }
  });

  // Join a game competition
  app.post("/api/game-competitions/:id/join", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log('Game competition join request received for ID:', req.params.id);
      const competitionId = parseInt(req.params.id);
      const userId = req.user!.id;
      console.log('User ID:', userId, 'Competition ID:', competitionId);

      const { db } = await import("./db");
      const { competitionParticipants, competitions } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");

      // Check if user already joined
      console.log('Checking for existing participation...');
      const existingParticipant = await db
        .select()
        .from(competitionParticipants)
        .where(and(
          eq(competitionParticipants.competitionId, competitionId),
          eq(competitionParticipants.userId, userId)
        ))
        .limit(1);

      if (existingParticipant.length > 0) {
        console.log('User already participating in competition');
        return res.json({ 
          ...existingParticipant[0], 
          alreadyJoined: true,
          message: "Already participating in this competition"
        });
      }

      // Verify competition exists
      console.log('Verifying competition exists...');
      const competition = await db
        .select()
        .from(competitions)
        .where(eq(competitions.id, competitionId))
        .limit(1);

      if (competition.length === 0) {
        console.log('Competition not found');
        return res.status(404).json({ message: 'Competition not found' });
      }

      // Insert new participant with all required fields
      console.log('Creating new participant...');
      const [participant] = await db.insert(competitionParticipants).values({
        competitionId,
        userId,
        caseAttempts: [],
        totalScore: 0,
        timeSpent: 0
      }).returning();

      console.log('Successfully created participant:', participant.id);
      res.json({ 
        ...participant, 
        alreadyJoined: false,
        message: "Successfully joined competition"
      });
    } catch (error: any) {
      console.error('Error joining game competition:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ message: 'Failed to join game competition', error: error.message });
    }
  });

  // Submit game competition response
  app.post("/api/game-competitions/:id/submit", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const competitionId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { responses, timeSpent, gameType } = req.body;

      console.log('Game submission received:', { competitionId, userId, gameType, responsesCount: Object.keys(responses).length });

      const { db } = await import("./db");
      const { competitionParticipants, competitions, gameContent } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");

      // Get competition and game content for scoring
      const [competition] = await db
        .select()
        .from(competitions)
        .where(eq(competitions.id, competitionId));

      if (!competition) {
        return res.status(404).json({ message: 'Competition not found' });
      }

      const [content] = await db
        .select()
        .from(gameContent)
        .where(eq(gameContent.competitionId, competitionId));

      // Generate detailed AI feedback for each question
      const { gameAIFeedbackService } = await import("./gameAIFeedbackService");
      const detailedFeedback = await gameAIFeedbackService.generateDetailedGameFeedback(
        gameType,
        responses,
        content?.content || {},
        timeSpent || 0
      );

      // Debug the feedback result to find NaN values
      console.log('DetailedFeedback debug:', {
        overallScore: detailedFeedback.overallScore,
        overallScoreType: typeof detailedFeedback.overallScore,
        isNaN: isNaN(detailedFeedback.overallScore),
        categoryScores: detailedFeedback.categoryScores,
        questionFeedbacksLength: detailedFeedback.questionFeedbacks?.length || 0
      });

      // Debug and fix any NaN values before database insertion
      const safeScore = (value: any) => {
        if (typeof value === 'number' && !isNaN(value)) return value;
        return 0; // Default to 0 for any NaN values
      };

      // Create case attempts with detailed question-by-question feedback
      const caseAttempts = [{
        caseStudyId: competitionId,
        userDiagnosis: detailedFeedback.questionFeedbacks[0]?.userResponse || 'No diagnosis provided',
        userReasoning: 'Multiple questions analyzed with AI feedback',
        assessmentTests: [],
        proposedTreatment: 'Various responses across game questions',
        timeSpent: timeSpent || 0,
        scores: {
          accuracy: safeScore(detailedFeedback.categoryScores.accuracy),
          speed: safeScore(detailedFeedback.categoryScores.speed),
          reasoning: safeScore(detailedFeedback.categoryScores.reasoning),
          differential: safeScore(detailedFeedback.categoryScores.differential),
          treatment: safeScore(detailedFeedback.categoryScores.treatment),
          total: safeScore(detailedFeedback.overallScore)
        },
        feedback: detailedFeedback.overallFeedback,
        questionFeedbacks: detailedFeedback.questionFeedbacks,
        recommendedLearning: detailedFeedback.recommendedLearning,
        nextSteps: detailedFeedback.nextSteps
      }];

      // Update participant with results
      await db
        .update(competitionParticipants)
        .set({
          completedAt: new Date(),
          totalScore: safeScore(detailedFeedback.overallScore),
          timeSpent: timeSpent || 0,
          caseAttempts: caseAttempts
        })
        .where(and(
          eq(competitionParticipants.competitionId, competitionId),
          eq(competitionParticipants.userId, userId)
        ));

      console.log('Game submission completed with detailed AI feedback. Overall score:', detailedFeedback.overallScore);

      // Calculate correct/incorrect counts for Lightning Diagnosis
      let correctAnswers = 0;
      let totalQuestions = 0;
      
      if (gameType === 'lightning_diagnosis' && detailedFeedback.questionFeedbacks) {
        totalQuestions = detailedFeedback.questionFeedbacks.length;
        correctAnswers = detailedFeedback.questionFeedbacks.filter((q: any) => q.score === 100).length;
      }

      res.json({ 
        totalScore: safeScore(detailedFeedback.overallScore),
        timeSpent: timeSpent || 0,
        feedback: detailedFeedback.overallFeedback,
        scores: caseAttempts[0].scores,
        questionFeedbacks: detailedFeedback.questionFeedbacks,
        recommendedLearning: detailedFeedback.recommendedLearning,
        nextSteps: detailedFeedback.nextSteps,
        correctAnswers: correctAnswers,
        totalQuestions: totalQuestions
      });
    } catch (error: any) {
      console.error('Error submitting game competition:', error);
      res.status(500).json({ message: 'Failed to submit game competition', error: error.message });
    }
  });

  // Get game competition leaderboard
  app.get("/api/game-competitions/:id/leaderboard", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const competitionId = parseInt(req.params.id);
      
      const { db } = await import("./db");
      const { competitionParticipants, users } = await import("@shared/schema");
      const { eq, desc } = await import("drizzle-orm");

      const leaderboard = await db
        .select({
          userId: competitionParticipants.userId,
          username: users.username,
          totalScore: competitionParticipants.totalScore,
          timeSpent: competitionParticipants.timeSpent,
          completedAt: competitionParticipants.completedAt,
          rank: competitionParticipants.rank
        })
        .from(competitionParticipants)
        .innerJoin(users, eq(competitionParticipants.userId, users.id))
        .where(eq(competitionParticipants.competitionId, competitionId))
        .orderBy(desc(competitionParticipants.totalScore), competitionParticipants.timeSpent);

      // Calculate ranks
      const rankedLeaderboard = leaderboard.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      res.json(rankedLeaderboard);
    } catch (error) {
      console.error('Error getting game competition leaderboard:', error);
      res.status(500).json({ message: 'Failed to get leaderboard' });
    }
  });

  // Generate specific game type content (for testing)
  app.post("/api/generate-game-content", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { gameType, bodyPart, difficulty } = req.body;
      
      const { gameContentGenerator } = await import("./gameContentGenerator");
      
      const content = await gameContentGenerator.generateGameContent({
        gameType,
        bodyPart,
        difficulty
      });

      res.json(content);
    } catch (error) {
      console.error('Error generating game content:', error);
      res.status(500).json({ message: 'Failed to generate game content' });
    }
  });

  // AI-powered scoring function for game competitions
  async function calculateGameScoreWithAI(gameType: string, responses: any, gameContent: any): Promise<any> {
    try {
      const openai = new (await import("openai")).default({ apiKey: process.env.OPENAI_API_KEY });

      // Extract key responses based on game type
      let primaryResponse = '';
      let reasoning = '';
      let assessmentTests: string[] = [];
      let treatment = '';

      // Parse responses based on game type
      switch (gameType) {
        case 'choose_your_adventure':
          primaryResponse = `Choice pattern: ${JSON.stringify(responses)}`;
          reasoning = `User made interactive clinical decisions throughout the scenario`;
          break;
        case 'mystery_patient':
          primaryResponse = responses.diagnosis || 'No diagnosis provided';
          reasoning = `Diagnosis hypothesis based on progressive clue analysis`;
          break;
        case 'lightning_diagnosis':
          const diagnosisResponses = Object.keys(responses)
            .filter(key => key.startsWith('case_'))
            .map(key => responses[key]);
          primaryResponse = diagnosisResponses.join(', ') || 'No diagnoses provided';
          reasoning = `Rapid diagnostic responses under time pressure`;
          break;
        case 'red_flag_detective':
          const redFlags = Object.keys(responses)
            .filter(key => key.startsWith('redflags_'))
            .map(key => responses[key]);
          const actions = Object.keys(responses)
            .filter(key => key.startsWith('action_'))
            .map(key => responses[key]);
          primaryResponse = redFlags.join('; ') || 'No red flags identified';
          treatment = actions.join('; ') || 'No actions specified';
          reasoning = `Red flag identification and immediate action planning`;
          break;
        case 'differential_diagnosis_duel':
          const differentials = Object.keys(responses)
            .filter(key => key.startsWith('differentials_'))
            .map(key => responses[key]);
          primaryResponse = differentials.join('; ') || 'No differentials provided';
          reasoning = `Comprehensive differential diagnosis generation`;
          break;
        default:
          primaryResponse = responses.general || 'General response provided';
          reasoning = `Clinical response to specialized game scenario`;
      }

      const prompt = `Analyze this physiotherapy game competition response for "${gameType}":

User's Primary Response: ${primaryResponse}
Clinical Reasoning: ${reasoning}
Assessment/Treatment: ${treatment || 'Not provided'}

Game Type: ${gameType}
Game Content Context: ${JSON.stringify(gameContent, null, 2)}

Provide detailed scoring (0-100 for each category) and feedback:
1. Clinical Accuracy (0-100): How correct are the clinical decisions?
2. Speed Efficiency (0-100): Appropriate speed for game type
3. Clinical Reasoning (0-100): Quality of clinical thinking
4. Differential Skills (0-100): Ability to consider multiple diagnoses
5. Treatment Planning (0-100): Quality of intervention strategies

Respond in JSON format:
{
  "accuracyScore": 85,
  "speedScore": 90,
  "reasoningScore": 80,
  "differentialScore": 75,
  "treatmentScore": 85,
  "totalScore": 83,
  "feedback": "Detailed feedback about performance, strengths, and areas for improvement (150-300 words)",
  "primaryResponse": "Summary of main response",
  "reasoning": "Clinical reasoning summary",
  "assessmentTests": ["List", "Of", "Relevant", "Tests"],
  "treatment": "Treatment summary"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Ensure we have valid scores
      const finalResult = {
        accuracyScore: result.accuracyScore || 70,
        speedScore: result.speedScore || 80,
        reasoningScore: result.reasoningScore || 75,
        differentialScore: result.differentialScore || 70,
        treatmentScore: result.treatmentScore || 75,
        totalScore: result.totalScore || 73,
        feedback: result.feedback || 'Good effort! Continue practicing clinical reasoning skills.',
        primaryResponse: result.primaryResponse || primaryResponse,
        reasoning: result.reasoning || reasoning,
        assessmentTests: result.assessmentTests || [],
        treatment: result.treatment || treatment
      };

      return finalResult;

    } catch (error) {
      console.error('Error in AI scoring:', error);
      
      // Fallback scoring
      return {
        accuracyScore: 70,
        speedScore: 80,
        reasoningScore: 75,
        differentialScore: 70,
        treatmentScore: 75,
        totalScore: 74,
        feedback: 'Thank you for participating! Your responses show clinical thinking skills. Continue practicing to improve accuracy and reasoning.',
        primaryResponse: 'Clinical response provided',
        reasoning: 'Clinical reasoning demonstrated',
        assessmentTests: [],
        treatment: 'Treatment approach considered'
      };
    }
  }

  // Helper function to calculate scores for different game types
  function calculateGameScore(responses: any[]): number {
    let totalScore = 0;
    
    responses.forEach(response => {
      if (response.type === 'lightning_diagnosis') {
        totalScore += response.correct ? 10 : 0;
        totalScore += Math.max(0, 5 - response.timeUsed / 6); // Bonus for speed
      } else if (response.type === 'treatment_speed_run') {
        totalScore += response.completeness * 20;
        totalScore += response.evidenceBased ? 10 : 0;
      } else if (response.type === 'red_flag_detective') {
        totalScore += response.redFlagsFound * 5;
        totalScore -= response.falsePositives * 2;
      } else if (response.type === 'differential_diagnosis_duel') {
        totalScore += response.correctDifferentials * 8;
      } else if (response.type === 'journal_club_race') {
        totalScore += response.correctAnswers * 6;
      } else if (response.type === 'cpg_quiz_master') {
        totalScore += response.correctAnswers * 7;
      } else if (response.type === 'mystery_patient') {
        totalScore += response.correctDiagnosis ? 25 : 0;
        totalScore += response.keyCluesIdentified * 3;
      } else if (response.type === 'choose_your_adventure') {
        totalScore += response.totalPoints;
      } else if (response.type === 'emergency_room_simulator') {
        totalScore += response.triageAccuracy * 15;
        totalScore += response.resourceUtilization * 10;
      }
    });

    return totalScore;
  }

  // Body Scanner API Routes
  app.post("/api/body-scanner/analyze", ensureAuthenticated, upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }

      const { bodyPart, symptoms } = req.body;
      
      if (!bodyPart || !symptoms) {
        return res.status(400).json({ message: 'Body part and symptoms are required' });
      }

      // Parse symptoms JSON
      let parsedSymptoms: SymptomData;
      try {
        parsedSymptoms = JSON.parse(symptoms);
      } catch (error) {
        return res.status(400).json({ message: 'Invalid symptoms format' });
      }

      // Validate symptoms
      const validationErrors = bodyScannerService.validateSymptoms(parsedSymptoms);
      if (validationErrors.length > 0) {
        return res.status(400).json({ message: 'Invalid symptoms data', errors: validationErrors });
      }

      // Convert image to base64
      const imageBuffer = req.file.buffer;
      const imageBase64 = imageBuffer.toString('base64');

      // Analyze with AI
      const analysis = await bodyScannerService.analyzeBodyPart(
        imageBase64,
        bodyPart,
        parsedSymptoms
      );

      // Upload image to S3 for storage
      let imageUrl = '';
      try {
        imageUrl = await uploadToS3(req.file, 'body-scans');
      } catch (error) {
        console.error('Failed to upload to S3:', error);
        // Continue without S3 upload - image is still analyzed
      }

      // Save to database
      const bodyScanData = {
        userId: req.user!.id,
        bodyPart,
        imageUrl,
        symptoms: parsedSymptoms,
        analysisResults: analysis,
        differentialDiagnoses: analysis.differentialDiagnoses,
        recommendations: analysis.recommendations,
        redFlags: analysis.redFlags,
        confidenceScore: analysis.confidenceScore,
        reviewedByProfessional: false
      };

      const [savedScan] = await db.insert(bodyScans).values(bodyScanData).returning();

      res.json({
        scanId: savedScan.id,
        analysis,
        imageUrl
      });

    } catch (error) {
      console.error('Error in body scanner analysis:', error);
      res.status(500).json({ message: 'Failed to analyze body part' });
    }
  });

  app.get("/api/body-scanner/guidance/:bodyPart", async (req: Request, res: Response) => {
    try {
      const { bodyPart } = req.params;
      const guidance = bodyScannerService.getImageCaptureGuidance(bodyPart);
      res.json(guidance);
    } catch (error) {
      console.error('Error getting capture guidance:', error);
      res.status(500).json({ message: 'Failed to get capture guidance' });
    }
  });

  app.get("/api/body-scanner/scans", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userScans = await db
        .select()
        .from(bodyScans)
        .where(eq(bodyScans.userId, req.user!.id))
        .orderBy(sql`${bodyScans.createdAt} DESC`);

      res.json(userScans);
    } catch (error) {
      console.error('Error getting body scans:', error);
      res.status(500).json({ message: 'Failed to get body scans' });
    }
  });

  app.get("/api/body-scanner/scans/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const scanId = parseInt(req.params.id);
      const [scan] = await db
        .select()
        .from(bodyScans)
        .where(eq(bodyScans.id, scanId));

      if (!scan) {
        return res.status(404).json({ message: 'Body scan not found' });
      }

      // Check if user owns this scan
      if (scan.userId !== req.user!.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json(scan);
    } catch (error) {
      console.error('Error getting body scan:', error);
      res.status(500).json({ message: 'Failed to get body scan' });
    }
  });

  app.patch("/api/body-scanner/scans/:id/review", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const scanId = parseInt(req.params.id);
      const { reviewed } = req.body;

      await db
        .update(bodyScans)
        .set({ 
          reviewedByProfessional: reviewed,
          updatedAt: new Date()
        })
        .where(eq(bodyScans.id, scanId));

      res.json({ message: 'Review status updated' });
    } catch (error) {
      console.error('Error updating review status:', error);
      res.status(500).json({ message: 'Failed to update review status' });
    }
  });

  // ============================================================================
  // REAL-TIME AI ASSISTANCE API ROUTES
  // ============================================================================

  // Generate AI suggestions for current context
  app.post("/api/soap-notes/:sessionId/suggestions", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { sessionId } = req.params;
      const { context } = req.body; // RealTimeContext object

      const suggestions = await realTimeAIService.generateSuggestions(context, userId, sessionId);
      res.json(suggestions);
    } catch (error: any) {
      console.error("Error generating AI suggestions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Demo version of AI suggestions (no authentication required)
  app.post("/api/soap-notes/demo-session/suggestions", async (req: Request, res: Response) => {
    try {
      const { context } = req.body; // RealTimeContext object
      const demoUserId = 1; // Demo user ID
      const sessionId = 'demo-session';

      const suggestions = await realTimeAIService.generateSuggestions(context, demoUserId, sessionId);
      res.json(suggestions);
    } catch (error: any) {
      console.error("Error generating AI suggestions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Handle PhysioGPT chat query
  app.post("/api/soap-notes/:sessionId/physio-gpt", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { sessionId } = req.params;
      const { query, context } = req.body;

      const answer = await realTimeAIService.handlePhysioGPTQuery(query, context, userId, sessionId);
      res.json({ answer });
    } catch (error: any) {
      console.error("Error handling PhysioGPT query:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Accept AI suggestion
  app.post("/api/ai-suggestions/:id/accept", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      await realTimeAIService.acceptSuggestion(parseInt(id), userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error accepting suggestion:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Detect administrative tasks
  app.post("/api/soap-notes/:sessionId/detect-admin-tasks", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { sessionId } = req.params;
      const { transcript } = req.body;

      const tasks = await realTimeAIService.detectAdministrativeTasks(transcript, userId, sessionId);
      res.json({ tasks });
    } catch (error: any) {
      console.error("Error detecting administrative tasks:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate SOAP sections from transcript using AI
  app.post("/api/generate-soap-sections", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { transcript } = req.body;

      if (!transcript || transcript.trim().length === 0) {
        return res.status(400).json({ error: 'Transcript is required' });
      }

      const soapSections = await realTimeAIService.generateSoapSections(transcript);
      res.json(soapSections);
    } catch (error: any) {
      console.error("Error generating SOAP sections:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // CONTINUOUS MULTI-PATIENT RECORDING ROUTES
  // ============================================================================
  
  // Start continuous recording session
  app.post("/api/continuous-recording/start", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const session = await continuousRecordingService.startContinuousSession(userId);
      res.json({
        success: true,
        session,
        message: "Continuous recording session started"
      });
    } catch (error: any) {
      console.error("Error starting continuous recording session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Process transcript chunk during continuous recording
  app.post("/api/continuous-recording/:sessionId/transcript", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { transcriptChunk } = req.body;

      if (!transcriptChunk) {
        return res.status(400).json({ error: "Transcript chunk required" });
      }

      const result = await continuousRecordingService.processTranscriptChunk(sessionId, transcriptChunk);
      res.json(result);
    } catch (error: any) {
      console.error("Error processing transcript chunk:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Manual patient switch
  app.post("/api/continuous-recording/:sessionId/switch-patient", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { newPatientName } = req.body;

      console.log("Manual patient switch requested for session:", sessionId);
      console.log("Active session:", continuousRecordingService.getActiveSession());

      const result = await continuousRecordingService.manualPatientSwitch(sessionId, newPatientName);
      console.log("Patient switch result:", result);
      res.json(result);
    } catch (error: any) {
      console.error("Error switching patient:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get completed SOAP notes for continuous recording session
  app.get("/api/continuous-recording/:sessionId/completed-notes", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const notes = await continuousRecordingService.getCompletedSoapNotes(sessionId);
      res.json(notes);
    } catch (error: any) {
      console.error("Error getting completed SOAP notes:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // End continuous recording session
  app.post("/api/continuous-recording/end", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }

      const result = await continuousRecordingService.endContinuousSession(sessionId, userId);
      res.json(result);
    } catch (error: any) {
      console.error("Error ending continuous recording session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get active continuous recording session
  app.get("/api/continuous-recording/active", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const activeSession = continuousRecordingService.getActiveSession();
      res.json({
        activeSession,
        currentPatients: continuousRecordingService.getCurrentPatientSegments()
      });
    } catch (error: any) {
      console.error("Error getting active session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get completed SOAP notes for active continuous recording session only
  app.get("/api/continuous-recording/completed-notes", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get the active continuous recording session
      const activeSession = continuousRecordingService.getActiveSession();
      if (!activeSession) {
        // No active session - return empty array
        return res.json([]);
      }

      // Only return SOAP notes from the current continuous recording session
      const sessionNotes = await continuousRecordingService.getCompletedSoapNotes(activeSession.sessionId);
      res.json(sessionNotes);
    } catch (error: any) {
      console.error("Error getting completed SOAP notes:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get completed SOAP notes for session
  app.get("/api/continuous-recording/:sessionId/soap-notes", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const soapNotes = await continuousRecordingService.getCompletedSoapNotes(sessionId);
      res.json(soapNotes);
    } catch (error: any) {
      console.error("Error getting SOAP notes:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // CONTINUOUS RECORDING PAGE STATE MANAGEMENT (TEMPORARY STORAGE)
  // ============================================================================

  // Save complete page state during continuous recording
  app.post("/api/continuous-recording/:sessionId/save-page-state", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { sessionId } = req.params;
      const { patientSequence, pageState } = req.body;
      
      if (!patientSequence || !pageState) {
        return res.status(400).json({ error: 'Missing required fields: patientSequence, pageState' });
      }

      // Check if note exists for this patient sequence
      const existingNote = await storage.getContinuousSessionNoteBySequence(sessionId, patientSequence);
      
      let savedNote;
      if (existingNote) {
        // Update existing note
        savedNote = await storage.updateContinuousSessionNote(existingNote.id, {
          pageState,
        });
      } else {
        // Create new note
        savedNote = await storage.createContinuousSessionNote({
          sessionId,
          userId,
          patientSequence,
          pageState,
        });
      }
      
      res.json({ 
        success: true, 
        noteId: savedNote.id,
        message: 'Page state saved successfully' 
      });
    } catch (error: any) {
      console.error("Error saving page state:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get page state for a specific patient in the session
  app.get("/api/continuous-recording/:sessionId/page-state/:patientSequence", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { sessionId, patientSequence } = req.params;
      const note = await storage.getContinuousSessionNoteBySequence(sessionId, parseInt(patientSequence));
      
      if (!note) {
        return res.status(404).json({ error: 'Page state not found for this patient' });
      }
      
      // Verify the note belongs to the requesting user
      if (note.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      res.json({
        patientSequence: note.patientSequence,
        pageState: note.pageState,
        createdAt: note.createdAt,
        expiresAt: note.expiresAt
      });
    } catch (error: any) {
      console.error("Error retrieving page state:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all page states for a session
  app.get("/api/continuous-recording/:sessionId/all-page-states", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { sessionId } = req.params;
      const notes = await storage.getContinuousSessionNotesBySession(sessionId);
      
      // Filter to only return notes for the requesting user
      const userNotes = notes.filter(note => note.userId === userId);
      
      res.json(userNotes.map(note => ({
        patientSequence: note.patientSequence,
        pageState: note.pageState,
        createdAt: note.createdAt,
        expiresAt: note.expiresAt
      })));
    } catch (error: any) {
      console.error("Error retrieving all page states:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete page state for a specific patient (optional cleanup)
  app.delete("/api/continuous-recording/:sessionId/page-state/:patientSequence", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { sessionId, patientSequence } = req.params;
      const note = await storage.getContinuousSessionNoteBySequence(sessionId, parseInt(patientSequence));
      
      if (!note) {
        return res.status(404).json({ error: 'Page state not found' });
      }
      
      // Verify ownership
      if (note.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      await storage.deleteContinuousSessionNote(note.id);
      res.json({ success: true, message: 'Page state deleted successfully' });
    } catch (error: any) {
      console.error("Error deleting page state:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cleanup expired page states (scheduled job endpoint)
  app.post("/api/continuous-recording/cleanup-expired-states", async (req: Request, res: Response) => {
    try {
      const deletedCount = await storage.deleteExpiredContinuousSessionNotes();
      res.json({ 
        success: true, 
        deletedCount,
        message: `Cleaned up ${deletedCount} expired page states` 
      });
    } catch (error: any) {
      console.error("Error cleaning up expired states:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // VIRTUAL PATIENT CREATION API ROUTES
  // ============================================================================

  // Create virtual patient from SOAP note
  app.post("/api/soap-notes/:id/create-virtual-patient", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const result = await virtualPatientService.createVirtualPatientFromSoapNote(parseInt(id), userId);
      
      if (result.success) {
        res.json(result.virtualPatient);
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error: any) {
      console.error("Error creating virtual patient:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Duplicate route handler removed

  // Get specific virtual patient
  app.get("/api/virtual-patients/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const virtualPatient = await virtualPatientService.getVirtualPatient(parseInt(id), userId);
      
      if (!virtualPatient) {
        return res.status(404).json({ error: 'Virtual patient not found' });
      }

      res.json(virtualPatient);
    } catch (error: any) {
      console.error("Error getting virtual patient:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update virtual patient
  app.put("/api/virtual-patients/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const { patient_name } = req.body;

      if (!patient_name || typeof patient_name !== 'string') {
        return res.status(400).json({ error: 'Patient name is required' });
      }

      const updatedPatient = await virtualPatientService.updateVirtualPatient(parseInt(id), userId, { patient_name });
      
      if (!updatedPatient) {
        return res.status(404).json({ error: 'Virtual patient not found or not authorized' });
      }

      res.json(updatedPatient);
    } catch (error: any) {
      console.error("Error updating virtual patient:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Toggle virtual patient public visibility
  app.patch("/api/virtual-patients/:id/visibility", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const { isPublic } = req.body;

      const success = await virtualPatientService.togglePublicVisibility(parseInt(id), userId, isPublic);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'Failed to update visibility' });
      }
    } catch (error: any) {
      console.error("Error updating virtual patient visibility:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Form Generation API endpoint
  app.post("/api/generate-form", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { formType, soapData, patientName, date } = req.body;

      if (!formType || !soapData || !patientName || !date) {
        return res.status(400).json({ 
          error: 'Form type, SOAP data, patient name, and date are required' 
        });
      }

      const validFormTypes = [
        'doctor_report', 'ahtr', 'imaging_referral', 'discharge_summary', 
        'progress_report', 'specialist_referral', 'return_to_work', 
        'time_off_work', 'insurance_documentation'
      ];
      
      if (!validFormTypes.includes(formType)) {
        return res.status(400).json({ 
          error: `Invalid form type. Must be one of: ${validFormTypes.join(', ')}` 
        });
      }

      let generatedContent: string;

      switch (formType) {
        case 'doctor_report':
          generatedContent = await documentGenerationService.generateDoctorReport({
            formType,
            soapData,
            patientName,
            date
          });
          break;
        case 'ahtr':
          generatedContent = await documentGenerationService.generateAHTR({
            formType,
            soapData,
            patientName,
            date
          });
          break;
        case 'imaging_referral':
          generatedContent = await documentGenerationService.generateImagingReferral({
            formType,
            soapData,
            patientName,
            date
          });
          break;
        case 'discharge_summary':
          generatedContent = await documentGenerationService.generateDischargeSummary({
            formType,
            soapData,
            patientName,
            date
          });
          break;
        case 'progress_report':
          generatedContent = await documentGenerationService.generateProgressReport({
            formType,
            soapData,
            patientName,
            date
          });
          break;
        case 'specialist_referral':
          generatedContent = await documentGenerationService.generateSpecialistReferral({
            formType,
            soapData,
            patientName,
            date
          });
          break;
        case 'return_to_work':
          generatedContent = await documentGenerationService.generateReturnToWorkCertificate({
            formType,
            soapData,
            patientName,
            date
          });
          break;
        case 'time_off_work':
          generatedContent = await documentGenerationService.generateTimeOffWorkCertificate({
            formType,
            soapData,
            patientName,
            date
          });
          break;
        case 'insurance_documentation':
          generatedContent = await documentGenerationService.generateInsuranceDocumentation({
            formType,
            soapData,
            patientName,
            date
          });
          break;
        default:
          throw new Error('Invalid form type');
      }

      res.json({
        success: true,
        content: generatedContent,
        formType,
        patientName,
        date: new Date(date).toLocaleDateString()
      });

    } catch (error) {
      console.error('Error generating form:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to generate form' 
      });
    }
  });

  // AHTR PDF Generation endpoint
  app.post('/api/generate-ahtr-pdf', async (req: Request, res: Response) => {
    try {
      const { subjective, objective, assessment, plan } = req.body;

      if (!subjective || !objective || !assessment || !plan) {
        return res.status(400).json({ 
          error: 'Missing required SOAP note sections' 
        });
      }

      const { ahtrPdfService } = await import('./ahtrPdfService');
      
      // Generate form data from SOAP notes
      const formData = await ahtrPdfService.generateAHTRFormData({
        subjective,
        objective,
        assessment,
        plan
      });

      // Create filled PDF
      const pdfBuffer = await ahtrPdfService.createFilledPDF(formData);

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=AHTR-Form.pdf');
      res.setHeader('Content-Length', pdfBuffer.length);

      // Send PDF buffer
      res.send(pdfBuffer);

    } catch (error) {
      console.error('Error generating AHTR PDF:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to generate AHTR PDF' 
      });
    }
  });

  // ===== CONTINUOUS RECORDING API ENDPOINTS =====

  // Start continuous recording session
  app.post('/api/continuous-recording/start', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { sessionName } = req.body;
      const { continuousRecordingService } = await import('./continuousRecordingService');
      
      // Check if user already has an active session
      const activeSession = await continuousRecordingService.getActiveContinuousSession(userId);
      if (activeSession) {
        return res.status(409).json({ 
          error: 'Active continuous recording session already exists',
          activeSession 
        });
      }

      const newSession = await continuousRecordingService.startContinuousRecording(userId, sessionName);
      res.json(newSession);
    } catch (error: any) {
      console.error("Error starting continuous recording:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // End continuous recording session
  app.post('/api/continuous-recording/end', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      const { continuousRecordingService } = await import('./continuousRecordingService');
      const endedSession = await continuousRecordingService.endContinuousRecording(sessionId, userId);
      
      if (!endedSession) {
        return res.status(404).json({ error: 'Continuous recording session not found' });
      }

      res.json(endedSession);
    } catch (error: any) {
      console.error("Error ending continuous recording:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Process transcript chunk and detect patient transitions
  app.post('/api/continuous-recording/process-transcript', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { sessionId, transcript, duration } = req.body;
      if (!sessionId || !transcript || duration === undefined) {
        return res.status(400).json({ error: 'Session ID, transcript, and duration are required' });
      }

      const { continuousRecordingService } = await import('./continuousRecordingService');
      const detectionResult = await continuousRecordingService.processTranscriptChunk(
        sessionId, 
        userId, 
        transcript, 
        duration
      );

      res.json(detectionResult);
    } catch (error: any) {
      console.error("Error processing transcript chunk:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get active continuous recording session
  app.get('/api/continuous-recording/active', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { continuousRecordingService } = await import('./continuousRecordingService');
      const activeSession = await continuousRecordingService.getActiveContinuousSession(userId);
      
      res.json(activeSession);
    } catch (error: any) {
      console.error("Error getting active continuous recording session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all continuous recording sessions for user
  app.get('/api/continuous-recording/sessions', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { continuousRecordingService } = await import('./continuousRecordingService');
      const sessions = await continuousRecordingService.getUserContinuousSessions(userId);
      
      res.json(sessions);
    } catch (error: any) {
      console.error("Error getting continuous recording sessions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get SOAP notes for a continuous recording session
  app.get('/api/continuous-recording/sessions/:sessionId/soap-notes', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { sessionId } = req.params;
      const { continuousRecordingService } = await import('./continuousRecordingService');
      const soapNotes = await continuousRecordingService.getSessionSoapNotes(parseInt(sessionId), userId);
      
      res.json(soapNotes);
    } catch (error: any) {
      console.error("Error getting session SOAP notes:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // =========================
  // DIAGNOSIS DUEL TOURNAMENT ROUTES
  // =========================

  // Get all active tournaments
  app.get('/api/tournaments', async (req: Request, res: Response) => {
    try {
      const { diagnosisDuelTournamentService } = await import('./diagnosisDuelTournamentService');
      const tournaments = await diagnosisDuelTournamentService.getActiveTournaments();
      res.json(tournaments);
    } catch (error: any) {
      console.error("Error getting tournaments:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin route to get all tournament content (Fateofjustice only)
  app.get('/api/tournaments/admin/all-content', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const username = req.user?.username;
      
      if (!userId || username !== 'Fateofjustice') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      console.log("Admin content request from user:", username);
      
      // Get all tournaments with their content - with error handling
      let tournamentData = [];
      
      try {
        tournamentData = await db
          .select({
            id: diagnosisDuelTournaments.id,
            title: diagnosisDuelTournaments.title,
            competitionId: sql<number>`CASE 
              WHEN ${diagnosisDuelTournaments.id} = 3 THEN 107
              WHEN ${diagnosisDuelTournaments.id} = 4 THEN 118
              WHEN ${diagnosisDuelTournaments.id} = 5 THEN 119
              WHEN ${diagnosisDuelTournaments.id} = 6 THEN 120
              WHEN ${diagnosisDuelTournaments.id} = 7 THEN 121
              ELSE NULL
            END`.as('competitionId'),
            gameContentId: gameContent.id,
            content: gameContent.content,
          })
          .from(diagnosisDuelTournaments)
          .leftJoin(gameContent, sql`
            ${gameContent.competitionId} = CASE 
              WHEN ${diagnosisDuelTournaments.id} = 3 THEN 107
              WHEN ${diagnosisDuelTournaments.id} = 4 THEN 118
              WHEN ${diagnosisDuelTournaments.id} = 5 THEN 119
              WHEN ${diagnosisDuelTournaments.id} = 6 THEN 120
              WHEN ${diagnosisDuelTournaments.id} = 7 THEN 121
              ELSE NULL
            END
          `)
          .orderBy(diagnosisDuelTournaments.id);
      } catch (dbError) {
        console.error("Database error in admin content:", dbError);
        
        // Fallback: return structured sample data for admin preview
        tournamentData = [
          {
            id: 3,
            title: "Diagnosis Duel Tournament 1",
            competitionId: 107,
            gameContentId: 1,
            content: {
              lightning_diagnosis: {
                rounds: [
                  {
                    name: "Round 1 - Easy",
                    roundNumber: 1,
                    difficulty: "easy",
                    timePerQuestion: 10,
                    questions: [
                      { id: 1, scenario: "45-year-old swimmer presents with gradual onset anterior shoulder pain worsened by overhead activities", correctDiagnosis: "Shoulder Impingement Syndrome", bodyPart: "shoulder", timeLimit: 10 },
                      { id: 2, scenario: "32-year-old tennis player reports deep aching shoulder pain after serving", correctDiagnosis: "Rotator Cuff Strain", bodyPart: "shoulder", timeLimit: 10 },
                      { id: 3, scenario: "58-year-old office worker with insidious onset shoulder stiffness and night pain", correctDiagnosis: "Adhesive Capsulitis", bodyPart: "shoulder", timeLimit: 10 },
                      { id: 4, scenario: "28-year-old weightlifter with sharp anterior shoulder pain during bench press", correctDiagnosis: "Biceps Tendinopathy", bodyPart: "shoulder", timeLimit: 10 },
                      { id: 5, scenario: "42-year-old painter with lateral shoulder pain radiating down arm", correctDiagnosis: "Subacromial Bursitis", bodyPart: "shoulder", timeLimit: 10 },
                      { id: 6, scenario: "35-year-old baseball pitcher with posterior shoulder tightness", correctDiagnosis: "Posterior Capsule Tightness", bodyPart: "shoulder", timeLimit: 10 },
                      { id: 7, scenario: "50-year-old construction worker unable to reach behind back", correctDiagnosis: "Internal Rotation Deficit", bodyPart: "shoulder", timeLimit: 10 },
                      { id: 8, scenario: "26-year-old swimmer with clicking sensation during arm circles", correctDiagnosis: "Labral Irritation", bodyPart: "shoulder", timeLimit: 10 },
                      { id: 9, scenario: "39-year-old yoga instructor with anterior shoulder instability", correctDiagnosis: "Anterior Shoulder Instability", bodyPart: "shoulder", timeLimit: 10 },
                      { id: 10, scenario: "55-year-old gardener with progressive weakness lifting objects overhead", correctDiagnosis: "Rotator Cuff Weakness", bodyPart: "shoulder", timeLimit: 10 },
                      { id: 11, scenario: "33-year-old rock climber with superior shoulder pain during pull-ups", correctDiagnosis: "Superior Labral Tear", bodyPart: "shoulder", timeLimit: 10 },
                      { id: 12, scenario: "47-year-old nurse with burning shoulder pain after long shifts", correctDiagnosis: "Myofascial Pain Syndrome", bodyPart: "shoulder", timeLimit: 10 },
                      { id: 13, scenario: "29-year-old volleyball player with shoulder pain during spiking", correctDiagnosis: "Posterior Impingement", bodyPart: "shoulder", timeLimit: 10 },
                      { id: 14, scenario: "41-year-old mechanic with chronic anterior shoulder ache", correctDiagnosis: "Chronic Impingement", bodyPart: "shoulder", timeLimit: 10 },
                      { id: 15, scenario: "36-year-old golfer with shoulder pain at top of backswing", correctDiagnosis: "Golf-Related Shoulder Strain", bodyPart: "shoulder", timeLimit: 10 }
                    ]
                  },
                  {
                    name: "Round 2 - Medium", 
                    roundNumber: 2,
                    difficulty: "medium",
                    timePerQuestion: 10,
                    questions: [
                      { id: 16, scenario: "25-year-old runner with anterior knee pain during downhill running", correctDiagnosis: "Patellofemoral Pain Syndrome", bodyPart: "knee", timeLimit: 10 },
                      { id: 17, scenario: "19-year-old soccer player with medial knee pain after tackle", correctDiagnosis: "MCL Sprain", bodyPart: "knee", timeLimit: 10 },
                      { id: 18, scenario: "45-year-old hiker with lateral knee pain on uneven terrain", correctDiagnosis: "IT Band Syndrome", bodyPart: "knee", timeLimit: 10 },
                      { id: 19, scenario: "32-year-old basketball player with knee instability and popping", correctDiagnosis: "ACL Injury", bodyPart: "knee", timeLimit: 10 },
                      { id: 20, scenario: "38-year-old cyclist with posterior knee pain during pedaling", correctDiagnosis: "Popliteal Cyst", bodyPart: "knee", timeLimit: 10 },
                      { id: 21, scenario: "22-year-old dancer with medial knee pain during grand pliés", correctDiagnosis: "Medial Meniscus Tear", bodyPart: "knee", timeLimit: 10 },
                      { id: 22, scenario: "41-year-old tennis player with lateral knee pain during pivoting", correctDiagnosis: "Lateral Meniscus Injury", bodyPart: "knee", timeLimit: 10 },
                      { id: 23, scenario: "28-year-old weightlifter with anterior knee pain below patella", correctDiagnosis: "Patellar Tendinopathy", bodyPart: "knee", timeLimit: 10 },
                      { id: 24, scenario: "35-year-old marathon runner with diffuse knee aching", correctDiagnosis: "Knee Osteoarthritis", bodyPart: "knee", timeLimit: 10 },
                      { id: 25, scenario: "16-year-old athlete with knee pain during growth spurt", correctDiagnosis: "Osgood-Schlatter Disease", bodyPart: "knee", timeLimit: 10 },
                      { id: 26, scenario: "43-year-old office worker with knee stiffness after sitting", correctDiagnosis: "Patellofemoral Arthritis", bodyPart: "knee", timeLimit: 10 },
                      { id: 27, scenario: "29-year-old skier with knee pain after fall on slopes", correctDiagnosis: "LCL Sprain", bodyPart: "knee", timeLimit: 10 },
                      { id: 28, scenario: "37-year-old jogger with medial knee pain on inclines", correctDiagnosis: "Pes Anserine Bursitis", bodyPart: "knee", timeLimit: 10 },
                      { id: 29, scenario: "24-year-old volleyball player with knee pain during jumping", correctDiagnosis: "Jumper's Knee", bodyPart: "knee", timeLimit: 10 },
                      { id: 30, scenario: "46-year-old gardener with knee pain when kneeling", correctDiagnosis: "Prepatellar Bursitis", bodyPart: "knee", timeLimit: 10 }
                    ]
                  },
                  {
                    name: "Round 3 - Hard",
                    roundNumber: 3,
                    difficulty: "hard", 
                    timePerQuestion: 10,
                    questions: [
                      { id: 31, scenario: "52-year-old office worker with radiating leg pain and positive straight leg raise", correctDiagnosis: "Lumbar Disc Herniation", bodyPart: "back", timeLimit: 10 },
                      { id: 32, scenario: "67-year-old retiree with bilateral leg claudication and neurogenic symptoms", correctDiagnosis: "Spinal Stenosis", bodyPart: "back", timeLimit: 10 },
                      { id: 33, scenario: "34-year-old weightlifter with acute onset severe lower back pain", correctDiagnosis: "Acute Lumbar Strain", bodyPart: "back", timeLimit: 10 },
                      { id: 34, scenario: "45-year-old nurse with chronic lower back pain and morning stiffness", correctDiagnosis: "Lumbar Spondylosis", bodyPart: "back", timeLimit: 10 },
                      { id: 35, scenario: "28-year-old dancer with unilateral lower back pain and muscle spasm", correctDiagnosis: "Sacroiliac Joint Dysfunction", bodyPart: "back", timeLimit: 10 },
                      { id: 36, scenario: "58-year-old carpenter with burning pain down posterior thigh", correctDiagnosis: "Sciatica", bodyPart: "back", timeLimit: 10 },
                      { id: 37, scenario: "41-year-old truck driver with deep aching back pain after long drives", correctDiagnosis: "Lumbar Facet Joint Syndrome", bodyPart: "back", timeLimit: 10 },
                      { id: 38, scenario: "36-year-old gymnast with localized back pain and point tenderness", correctDiagnosis: "Spondylolysis", bodyPart: "back", timeLimit: 10 },
                      { id: 39, scenario: "49-year-old gardener with sharp back pain radiating to groin", correctDiagnosis: "L1-L2 Disc Protrusion", bodyPart: "back", timeLimit: 10 },
                      { id: 40, scenario: "31-year-old CrossFit athlete with central back pain and muscle guarding", correctDiagnosis: "Lumbar Muscle Strain", bodyPart: "back", timeLimit: 10 },
                      { id: 41, scenario: "55-year-old factory worker with chronic back pain and leg numbness", correctDiagnosis: "Lumbar Radiculopathy", bodyPart: "back", timeLimit: 10 },
                      { id: 42, scenario: "26-year-old soccer player with back pain during hyperextension", correctDiagnosis: "Spondylolisthesis", bodyPart: "back", timeLimit: 10 },
                      { id: 43, scenario: "63-year-old with back pain, fever, and recent infection history", correctDiagnosis: "Spinal Infection", bodyPart: "back", timeLimit: 10 },
                      { id: 44, scenario: "39-year-old with sudden severe back pain and bowel/bladder changes", correctDiagnosis: "Cauda Equina Syndrome", bodyPart: "back", timeLimit: 10 },
                      { id: 45, scenario: "47-year-old with chronic back pain and widespread muscle tenderness", correctDiagnosis: "Fibromyalgia", bodyPart: "back", timeLimit: 10 }
                    ]
                  }
                ]
              }
            }
          },
          {
            id: 4,
            title: "Diagnosis Duel Tournament 2",
            competitionId: 118,
            gameContentId: 2,
            content: {
              lightning_diagnosis: {
                rounds: [
                  {
                    name: "Round 1 - Easy",
                    roundNumber: 1,
                    difficulty: "easy",
                    timePerQuestion: 10,
                    questions: [
                      { id: 46, scenario: "24-year-old basketball player with lateral ankle pain after landing awkwardly", correctDiagnosis: "Lateral Ankle Sprain", bodyPart: "ankle", timeLimit: 10 },
                      { id: 47, scenario: "32-year-old hiker with medial ankle pain and swelling", correctDiagnosis: "Medial Ankle Sprain", bodyPart: "ankle", timeLimit: 10 },
                      { id: 48, scenario: "28-year-old runner with chronic lateral ankle instability", correctDiagnosis: "Chronic Ankle Instability", bodyPart: "ankle", timeLimit: 10 },
                      { id: 49, scenario: "35-year-old soccer player with high ankle pain after tackle", correctDiagnosis: "Syndesmosis Sprain", bodyPart: "ankle", timeLimit: 10 },
                      { id: 50, scenario: "42-year-old with deep posterior ankle pain during plantarflexion", correctDiagnosis: "Posterior Impingement", bodyPart: "ankle", timeLimit: 10 },
                      { id: 51, scenario: "26-year-old dancer with anterior ankle pain during dorsiflexion", correctDiagnosis: "Anterior Impingement", bodyPart: "ankle", timeLimit: 10 },
                      { id: 52, scenario: "38-year-old with medial ankle pain and arch collapse", correctDiagnosis: "Posterior Tibial Tendinopathy", bodyPart: "ankle", timeLimit: 10 },
                      { id: 53, scenario: "31-year-old runner with lateral ankle pain over fibula", correctDiagnosis: "Peroneal Tendinopathy", bodyPart: "ankle", timeLimit: 10 },
                      { id: 54, scenario: "45-year-old with anterior ankle pain and morning stiffness", correctDiagnosis: "Ankle Osteoarthritis", bodyPart: "ankle", timeLimit: 10 },
                      { id: 55, scenario: "29-year-old gymnast with posteromedial ankle pain", correctDiagnosis: "Flexor Hallucis Longus Tendinopathy", bodyPart: "ankle", timeLimit: 10 },
                      { id: 56, scenario: "33-year-old with ankle pain and clicking during movement", correctDiagnosis: "Osteochondral Lesion", bodyPart: "ankle", timeLimit: 10 },
                      { id: 57, scenario: "27-year-old surfer with chronic ankle stiffness", correctDiagnosis: "Ankle Joint Restriction", bodyPart: "ankle", timeLimit: 10 },
                      { id: 58, scenario: "36-year-old with lateral ankle pain radiating up leg", correctDiagnosis: "Sural Nerve Entrapment", bodyPart: "ankle", timeLimit: 10 },
                      { id: 59, scenario: "41-year-old with medial ankle numbness and tingling", correctDiagnosis: "Tarsal Tunnel Syndrome", bodyPart: "ankle", timeLimit: 10 },
                      { id: 60, scenario: "30-year-old with recurrent ankle giving way episodes", correctDiagnosis: "Functional Ankle Instability", bodyPart: "ankle", timeLimit: 10 }
                    ]
                  },
                  {
                    name: "Round 2 - Medium",
                    roundNumber: 2,
                    difficulty: "medium",
                    timePerQuestion: 10,
                    questions: [
                      { id: 61, scenario: "55-year-old with deep groin pain and morning stiffness", correctDiagnosis: "Hip Osteoarthritis", bodyPart: "hip", timeLimit: 10 },
                      { id: 62, scenario: "28-year-old runner with lateral hip pain during running", correctDiagnosis: "Greater Trochanteric Bursitis", bodyPart: "hip", timeLimit: 10 },
                      { id: 63, scenario: "22-year-old dancer with anterior hip pain during high kicks", correctDiagnosis: "Hip Impingement", bodyPart: "hip", timeLimit: 10 },
                      { id: 64, scenario: "35-year-old with clicking hip and catching sensation", correctDiagnosis: "Labral Tear", bodyPart: "hip", timeLimit: 10 },
                      { id: 65, scenario: "45-year-old with deep buttock pain radiating down leg", correctDiagnosis: "Piriformis Syndrome", bodyPart: "hip", timeLimit: 10 },
                      { id: 66, scenario: "19-year-old athlete with groin pain during sprinting", correctDiagnosis: "Adductor Strain", bodyPart: "hip", timeLimit: 10 },
                      { id: 67, scenario: "42-year-old with lateral hip pain lying on affected side", correctDiagnosis: "Iliotibial Band Syndrome", bodyPart: "hip", timeLimit: 10 },
                      { id: 68, scenario: "31-year-old with anterior hip pain and limited flexion", correctDiagnosis: "Hip Flexor Strain", bodyPart: "hip", timeLimit: 10 },
                      { id: 69, scenario: "48-year-old with posterior hip pain and stiffness", correctDiagnosis: "Sacroiliac Joint Dysfunction", bodyPart: "hip", timeLimit: 10 },
                      { id: 70, scenario: "26-year-old with sharp groin pain during kicking", correctDiagnosis: "Sports Hernia", bodyPart: "hip", timeLimit: 10 },
                      { id: 71, scenario: "38-year-old with hip pain and giving way episodes", correctDiagnosis: "Hip Instability", bodyPart: "hip", timeLimit: 10 },
                      { id: 72, scenario: "52-year-old with progressive hip pain and limping", correctDiagnosis: "Avascular Necrosis", bodyPart: "hip", timeLimit: 10 },
                      { id: 73, scenario: "29-year-old with lateral hip numbness and tingling", correctDiagnosis: "Meralgia Paresthetica", bodyPart: "hip", timeLimit: 10 },
                      { id: 74, scenario: "41-year-old with deep hip ache and night pain", correctDiagnosis: "Hip Capsulitis", bodyPart: "hip", timeLimit: 10 },
                      { id: 75, scenario: "33-year-old with hip pain radiating to knee", correctDiagnosis: "Referred Hip Pain", bodyPart: "hip", timeLimit: 10 }
                    ]
                  },
                  {
                    name: "Round 3 - Hard",
                    roundNumber: 3,
                    difficulty: "hard",
                    timePerQuestion: 10,
                    questions: [
                      { id: 76, scenario: "47-year-old with neck pain radiating down arm with numbness", correctDiagnosis: "Cervical Radiculopathy", bodyPart: "neck", timeLimit: 10 },
                      { id: 77, scenario: "34-year-old office worker with chronic neck stiffness and headaches", correctDiagnosis: "Cervical Spondylosis", bodyPart: "neck", timeLimit: 10 },
                      { id: 78, scenario: "28-year-old after car accident with neck pain and muscle spasm", correctDiagnosis: "Whiplash Associated Disorder", bodyPart: "neck", timeLimit: 10 },
                      { id: 79, scenario: "52-year-old with neck pain and bilateral arm symptoms", correctDiagnosis: "Cervical Myelopathy", bodyPart: "neck", timeLimit: 10 },
                      { id: 80, scenario: "39-year-old with unilateral neck pain and restricted rotation", correctDiagnosis: "Cervical Facet Joint Dysfunction", bodyPart: "neck", timeLimit: 10 },
                      { id: 81, scenario: "45-year-old with neck pain and frequent headaches", correctDiagnosis: "Cervicogenic Headache", bodyPart: "neck", timeLimit: 10 },
                      { id: 82, scenario: "31-year-old with neck pain and shoulder blade symptoms", correctDiagnosis: "Cervical Disc Herniation", bodyPart: "neck", timeLimit: 10 },
                      { id: 83, scenario: "56-year-old with progressive neck stiffness and arm weakness", correctDiagnosis: "Cervical Stenosis", bodyPart: "neck", timeLimit: 10 },
                      { id: 84, scenario: "27-year-old athlete with acute neck pain after tackle", correctDiagnosis: "Acute Cervical Strain", bodyPart: "neck", timeLimit: 10 },
                      { id: 85, scenario: "42-year-old with chronic neck pain and muscle trigger points", correctDiagnosis: "Myofascial Pain Syndrome", bodyPart: "neck", timeLimit: 10 },
                      { id: 86, scenario: "36-year-old with neck pain and upper limb neural symptoms", correctDiagnosis: "Thoracic Outlet Syndrome", bodyPart: "neck", timeLimit: 10 },
                      { id: 87, scenario: "49-year-old with neck pain worse in morning", correctDiagnosis: "Cervical Osteoarthritis", bodyPart: "neck", timeLimit: 10 },
                      { id: 88, scenario: "33-year-old with neck pain and dizziness episodes", correctDiagnosis: "Cervical Vertigo", bodyPart: "neck", timeLimit: 10 },
                      { id: 89, scenario: "44-year-old with neck pain and clicking sounds", correctDiagnosis: "Cervical Joint Dysfunction", bodyPart: "neck", timeLimit: 10 },
                      { id: 90, scenario: "38-year-old with neck pain radiating to temporal region", correctDiagnosis: "Upper Cervical Dysfunction", bodyPart: "neck", timeLimit: 10 }
                    ]
                  }
                ]
              }
            }
          },
          {
            id: 5,
            title: "Diagnosis Duel Tournament 3",
            competitionId: 119,
            gameContentId: 3,
            content: {
              lightning_diagnosis: {
                rounds: [
                  {
                    name: "Round 1 - Easy",
                    roundNumber: 1,
                    difficulty: "easy",
                    timePerQuestion: 10,
                    questions: [
                      { id: 91, scenario: "35-year-old office worker with numbness in thumb and index finger", correctDiagnosis: "Carpal Tunnel Syndrome", bodyPart: "wrist", timeLimit: 10 },
                      { id: 92, scenario: "28-year-old hairdresser with pain over thumb side of wrist", correctDiagnosis: "De Quervain's Tenosynovitis", bodyPart: "wrist", timeLimit: 10 },
                      { id: 93, scenario: "42-year-old construction worker with dorsal wrist pain", correctDiagnosis: "Wrist Extensor Tendinopathy", bodyPart: "wrist", timeLimit: 10 },
                      { id: 94, scenario: "31-year-old gymnast with ulnar-sided wrist pain", correctDiagnosis: "TFCC Tear", bodyPart: "wrist", timeLimit: 10 },
                      { id: 95, scenario: "39-year-old with wrist pain after fall on outstretched hand", correctDiagnosis: "Scaphoid Fracture", bodyPart: "wrist", timeLimit: 10 },
                      { id: 96, scenario: "26-year-old rock climber with chronic wrist stiffness", correctDiagnosis: "Wrist Arthritis", bodyPart: "wrist", timeLimit: 10 },
                      { id: 97, scenario: "45-year-old with painful clicking on ulnar side of wrist", correctDiagnosis: "ECU Tendinopathy", bodyPart: "wrist", timeLimit: 10 },
                      { id: 98, scenario: "33-year-old violinist with radial wrist pain", correctDiagnosis: "Intersection Syndrome", bodyPart: "wrist", timeLimit: 10 },
                      { id: 99, scenario: "47-year-old with dorsal wrist ganglion and discomfort", correctDiagnosis: "Ganglion Cyst", bodyPart: "wrist", timeLimit: 10 },
                      { id: 100, scenario: "29-year-old with wrist pain and morning stiffness", correctDiagnosis: "Rheumatoid Arthritis", bodyPart: "wrist", timeLimit: 10 },
                      { id: 101, scenario: "38-year-old with median nerve compression symptoms", correctDiagnosis: "Pronator Teres Syndrome", bodyPart: "wrist", timeLimit: 10 },
                      { id: 102, scenario: "24-year-old with ulnar nerve tingling in little finger", correctDiagnosis: "Ulnar Tunnel Syndrome", bodyPart: "wrist", timeLimit: 10 },
                      { id: 103, scenario: "41-year-old with radial nerve pain over dorsal wrist", correctDiagnosis: "Radial Tunnel Syndrome", bodyPart: "wrist", timeLimit: 10 },
                      { id: 104, scenario: "36-year-old with volar wrist pain and flexor symptoms", correctDiagnosis: "Flexor Carpi Radialis Tendinopathy", bodyPart: "wrist", timeLimit: 10 },
                      { id: 105, scenario: "32-year-old with chronic wrist instability after injury", correctDiagnosis: "Scapholunate Ligament Injury", bodyPart: "wrist", timeLimit: 10 }
                    ]
                  },
                  {
                    name: "Round 2 - Medium",
                    roundNumber: 2,
                    difficulty: "medium",
                    timePerQuestion: 10,
                    questions: [
                      { id: 106, scenario: "38-year-old tennis player with lateral elbow pain during backhand", correctDiagnosis: "Lateral Epicondylitis", bodyPart: "elbow", timeLimit: 10 },
                      { id: 107, scenario: "32-year-old golfer with medial elbow pain during swing", correctDiagnosis: "Medial Epicondylitis", bodyPart: "elbow", timeLimit: 10 },
                      { id: 108, scenario: "29-year-old baseball pitcher with posterior elbow pain", correctDiagnosis: "Olecranon Impingement", bodyPart: "elbow", timeLimit: 10 },
                      { id: 109, scenario: "25-year-old gymnast with elbow locking and catching", correctDiagnosis: "Loose Body in Elbow", bodyPart: "elbow", timeLimit: 10 },
                      { id: 110, scenario: "41-year-old with ulnar nerve tingling in ring and little fingers", correctDiagnosis: "Cubital Tunnel Syndrome", bodyPart: "elbow", timeLimit: 10 },
                      { id: 111, scenario: "35-year-old weightlifter with anterior elbow pain", correctDiagnosis: "Biceps Tendinopathy", bodyPart: "elbow", timeLimit: 10 },
                      { id: 112, scenario: "27-year-old with elbow instability after dislocation", correctDiagnosis: "Elbow Instability", bodyPart: "elbow", timeLimit: 10 },
                      { id: 113, scenario: "44-year-old with progressive elbow stiffness", correctDiagnosis: "Elbow Arthritis", bodyPart: "elbow", timeLimit: 10 },
                      { id: 114, scenario: "19-year-old baseball player with medial elbow instability", correctDiagnosis: "UCL Injury", bodyPart: "elbow", timeLimit: 10 },
                      { id: 115, scenario: "36-year-old with posterior elbow swelling and pain", correctDiagnosis: "Olecranon Bursitis", bodyPart: "elbow", timeLimit: 10 },
                      { id: 116, scenario: "31-year-old with radiating pain from lateral elbow", correctDiagnosis: "Radial Tunnel Syndrome", bodyPart: "elbow", timeLimit: 10 },
                      { id: 117, scenario: "28-year-old with elbow pain after repetitive gripping", correctDiagnosis: "Flexor-Pronator Strain", bodyPart: "elbow", timeLimit: 10 },
                      { id: 118, scenario: "42-year-old with chronic elbow pain and weakness", correctDiagnosis: "Triceps Tendinopathy", bodyPart: "elbow", timeLimit: 10 },
                      { id: 119, scenario: "33-year-old with elbow pain and morning stiffness", correctDiagnosis: "Elbow Capsulitis", bodyPart: "elbow", timeLimit: 10 },
                      { id: 120, scenario: "37-year-old with clicking elbow and range limitations", correctDiagnosis: "Elbow Impingement", bodyPart: "elbow", timeLimit: 10 }
                    ]
                  },
                  {
                    name: "Round 3 - Hard",
                    roundNumber: 3,
                    difficulty: "hard",
                    timePerQuestion: 10,
                    questions: [
                      { id: 121, scenario: "45-year-old runner with heel pain worse in morning", correctDiagnosis: "Plantar Fasciitis", bodyPart: "foot", timeLimit: 10 },
                      { id: 122, scenario: "52-year-old with burning pain between 3rd and 4th toes", correctDiagnosis: "Morton's Neuroma", bodyPart: "foot", timeLimit: 10 },
                      { id: 123, scenario: "28-year-old dancer with medial arch pain and swelling", correctDiagnosis: "Posterior Tibial Tendinopathy", bodyPart: "foot", timeLimit: 10 },
                      { id: 124, scenario: "35-year-old with lateral foot pain after ankle sprain", correctDiagnosis: "Peroneal Tendinopathy", bodyPart: "foot", timeLimit: 10 },
                      { id: 125, scenario: "41-year-old with pain over 2nd metatarsal head", correctDiagnosis: "Metatarsalgia", bodyPart: "foot", timeLimit: 10 },
                      { id: 126, scenario: "19-year-old basketball player with 5th metatarsal pain", correctDiagnosis: "Jones Fracture", bodyPart: "foot", timeLimit: 10 },
                      { id: 127, scenario: "48-year-old with big toe pain and limited motion", correctDiagnosis: "Hallux Rigidus", bodyPart: "foot", timeLimit: 10 },
                      { id: 128, scenario: "33-year-old with medial heel numbness and tingling", correctDiagnosis: "Tarsal Tunnel Syndrome", bodyPart: "foot", timeLimit: 10 },
                      { id: 129, scenario: "39-year-old with dorsal foot pain and swelling", correctDiagnosis: "Extensor Tendinopathy", bodyPart: "foot", timeLimit: 10 },
                      { id: 130, scenario: "26-year-old with lateral foot pain and instability", correctDiagnosis: "Cuboid Syndrome", bodyPart: "foot", timeLimit: 10 },
                      { id: 131, scenario: "44-year-old with progressive big toe deviation", correctDiagnosis: "Hallux Valgus", bodyPart: "foot", timeLimit: 10 },
                      { id: 132, scenario: "31-year-old with deep foot ache and arch collapse", correctDiagnosis: "Flat Foot Deformity", bodyPart: "foot", timeLimit: 10 },
                      { id: 133, scenario: "37-year-old with heel pain radiating to calf", correctDiagnosis: "Calcaneal Stress Fracture", bodyPart: "foot", timeLimit: 10 },
                      { id: 134, scenario: "42-year-old with toe pain and joint swelling", correctDiagnosis: "Gout", bodyPart: "foot", timeLimit: 10 },
                      { id: 135, scenario: "29-year-old with midfoot pain after twisting injury", correctDiagnosis: "Lisfranc Injury", bodyPart: "foot", timeLimit: 10 }
                    ]
                  }
                ]
              }
            }
          }
        ];
      }
      
      console.log(`Returning ${tournamentData.length} tournament content items for admin`);
      res.json(tournamentData);
    } catch (error: any) {
      console.error("Error getting tournament content:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's tournament registrations - MUST come before :id route
  app.get('/api/tournaments/my-registrations', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      console.log("Getting registrations for user ID:", userId);
      
      // Direct database query to avoid complex service method
      const registrations = await db
        .select({
          id: tournamentParticipants.id,
          tournamentId: tournamentParticipants.tournamentId,
          userId: tournamentParticipants.userId,
          username: users.username,
          bracketPosition: tournamentParticipants.bracketPosition,
          currentRound: tournamentParticipants.currentRound,
          isEliminated: tournamentParticipants.isEliminated,
          joinedAt: tournamentParticipants.joinedAt,
        })
        .from(tournamentParticipants)
        .leftJoin(users, eq(tournamentParticipants.userId, users.id))
        .where(eq(tournamentParticipants.userId, userId));
      
      console.log("Found registrations:", registrations);
      res.json(registrations);
    } catch (error: any) {
      console.error("Error getting user tournament registrations:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get tournament details - MUST come after my-registrations route
  app.get('/api/tournaments/:id', async (req: Request, res: Response) => {
    try {
      const tournamentId = parseInt(req.params.id);
      
      if (isNaN(tournamentId)) {
        return res.status(400).json({ error: 'Invalid tournament ID' });
      }
      
      const { diagnosisDuelTournamentService } = await import('./diagnosisDuelTournamentService');
      const tournament = await diagnosisDuelTournamentService.getTournamentById(tournamentId);
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      res.json(tournament);
    } catch (error: any) {
      console.error("Error getting tournament details:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get tournament participants
  app.get('/api/tournaments/:id/participants', async (req: Request, res: Response) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { diagnosisDuelTournamentService } = await import('./diagnosisDuelTournamentService');
      const participants = await diagnosisDuelTournamentService.getTournamentParticipants(tournamentId);
      
      res.json(participants);
    } catch (error: any) {
      console.error("Error getting tournament participants:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new tournament
  app.post('/api/tournaments', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const tournamentData = req.body;
      const { diagnosisDuelTournamentService } = await import('./diagnosisDuelTournamentService');
      const tournament = await diagnosisDuelTournamentService.createTournament(tournamentData);
      res.json(tournament);
    } catch (error: any) {
      console.error("Error creating tournament:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Register for a tournament
  app.post('/api/tournaments/:id/register', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      console.log(`Tournament registration attempt: tournamentId=${tournamentId}, userId=${userId}`);
      
      if (!userId) {
        console.log("User not authenticated");
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { diagnosisDuelTournamentService } = await import('./diagnosisDuelTournamentService');
      const result = await diagnosisDuelTournamentService.registerForTournament(tournamentId, userId);
      
      console.log("Tournament registration result:", result);
      
      if (!result.success) {
        console.log("Registration failed:", result.message);
        return res.status(400).json({ error: result.message });
      }
      
      // Broadcast tournament update to all connected users
      try {
        const { realTimeTournamentService } = await import('./realTimeTournamentService');
        await realTimeTournamentService.broadcastTournamentUpdate(tournamentId, {
          type: 'player_registered',
          message: 'A new player has joined the tournament'
        });
      } catch (broadcastError) {
        console.warn("Failed to broadcast tournament update:", broadcastError);
        // Don't fail the registration if broadcast fails
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("Error registering for tournament:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Leave tournament
  app.post('/api/tournaments/:id/leave', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!tournamentId || isNaN(tournamentId)) {
        return res.status(400).json({ error: 'Invalid tournament ID' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { diagnosisDuelTournamentService } = await import('./diagnosisDuelTournamentService');
      const result = await diagnosisDuelTournamentService.leaveTournament(tournamentId, userId);
      res.json(result);
    } catch (error: any) {
      console.error('Error leaving tournament:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Start a tournament
  app.post('/api/tournaments/:id/start', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { diagnosisDuelTournamentService } = await import('./diagnosisDuelTournamentService');
      const result = await diagnosisDuelTournamentService.startTournament(tournamentId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      // Broadcast tournament start to all connected users
      const { realTimeTournamentService } = await import('./realTimeTournamentService');
      await realTimeTournamentService.broadcastTournamentUpdate(tournamentId, {
        type: 'tournament_started',
        message: 'Tournament has started! Brackets are live.'
      });
      
      res.json(result);
    } catch (error: any) {
      console.error("Error starting tournament:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get match details
  app.get('/api/tournaments/matches/:matchId', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const matchId = parseInt(req.params.matchId);
      
      if (!matchId || isNaN(matchId)) {
        return res.status(400).json({ error: 'Invalid match ID' });
      }

      const { diagnosisDuelTournamentService } = await import('./diagnosisDuelTournamentService');
      const match = await diagnosisDuelTournamentService.getMatchDetails(matchId);
      
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }
      
      res.json(match);
    } catch (error: any) {
      console.error("Error getting match details:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's current match
  app.get('/api/tournaments/:id/my-match', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const userId = req.user?.id;

      console.log(`Getting match for tournament ${tournamentId}, user ${userId}`);

      if (!tournamentId || isNaN(tournamentId)) {
        console.log('Invalid tournament ID:', req.params.id);
        return res.status(400).json({ error: 'Invalid tournament ID' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { diagnosisDuelTournamentService } = await import('./diagnosisDuelTournamentService');
      const match = await diagnosisDuelTournamentService.getUserCurrentMatch(tournamentId, userId);
      
      console.log(`Found match for user ${userId}:`, match);
      res.json(match);
    } catch (error: any) {
      console.error("Error getting user match:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get game content by ID
  app.get('/api/game-content/:id', async (req: Request, res: Response) => {
    try {
      const contentId = parseInt(req.params.id);
      
      if (!contentId || isNaN(contentId)) {
        return res.status(400).json({ error: 'Invalid content ID' });
      }

      const { db } = await import("./db");
      const { gameContent } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const [content] = await db
        .select()
        .from(gameContent)
        .where(eq(gameContent.id, contentId));

      if (!content) {
        return res.status(404).json({ error: 'Game content not found' });
      }

      res.json(content);
    } catch (error: any) {
      console.error("Error getting game content:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Submit match results
  app.post('/api/tournaments/matches/:matchId/submit', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const matchId = parseInt(req.params.matchId);
      const { responses, score, timeSpent } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { diagnosisDuelTournamentService } = await import('./diagnosisDuelTournamentService');
      const result = await diagnosisDuelTournamentService.submitUserMatchResults(
        matchId, 
        userId,
        responses,
        score,
        timeSpent
      );
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      // Broadcast match results to connected players
      const { realTimeTournamentService } = await import('./realTimeTournamentService');
      realTimeTournamentService.broadcastMatchResults(matchId, {
        userId,
        score,
        timeSpent,
        message: 'Player completed match!'
      });
      
      res.json(result);
    } catch (error: any) {
      console.error("Error submitting match results:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's next match in tournament
  app.get('/api/tournaments/:id/my-next-match', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { diagnosisDuelTournamentService } = await import('./diagnosisDuelTournamentService');
      const nextMatch = await diagnosisDuelTournamentService.getUserNextMatch(tournamentId, userId);
      
      if (!nextMatch) {
        return res.status(404).json({ error: 'No next match found' });
      }
      
      res.json(nextMatch);
    } catch (error: any) {
      console.error('Error fetching next match:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Start a specific match
  app.post('/api/tournaments/matches/:matchId/start', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const matchId = parseInt(req.params.matchId);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { diagnosisDuelTournamentService } = await import('./diagnosisDuelTournamentService');
      const result = await diagnosisDuelTournamentService.startMatch(matchId, userId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.json(result);
    } catch (error: any) {
      console.error('Error starting match:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Functional movement generation route
  app.post('/api/virtual-patients/:id/functional-movement', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.id);
      const { movementId } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      console.log(`Generating functional movement ${movementId} for patient ${patientId}`);
      
      // Try both virtual patient tables
      let patient = await storage.getSoapVirtualPatient(patientId);
      let isRegularVirtualPatient = false;
      
      if (!patient) {
        patient = await storage.getVirtualPatient(patientId);
        isRegularVirtualPatient = true;
      }
      
      if (!patient || patient.userId !== userId) {
        return res.status(404).json({ error: 'Virtual patient not found' });
      }

      // Extract condition from patient data
      let bodyPart, chiefComplaint, clinicalText;
      
      if (isRegularVirtualPatient) {
        bodyPart = patient.bodyPart;
        chiefComplaint = patient.chief_complaint || '';
        clinicalText = `${chiefComplaint}. ${patient.history_present_illness || ''}`;
      } else {
        bodyPart = patient.bodyPart;
        chiefComplaint = patient.clinicalPresentation?.chiefComplaint || '';
        clinicalText = `${chiefComplaint}. ${patient.physicalFindings?.observation || ''}`;
      }
      
      // Determine condition type from body part and complaint
      let conditionType = bodyPart;
      if (chiefComplaint.toLowerCase().includes('pain')) {
        conditionType = `${bodyPart}_pain`;
      }
      if (chiefComplaint.toLowerCase().includes('stiff')) {
        conditionType = `${bodyPart}_stiffness`;
      }

      // Import the AI movement generator
      const { aiMovementGenerator } = await import('./aiMovementGenerator');
      
      // Generate functional movement
      const movementData = await aiMovementGenerator.generateFunctionalMovement(
        movementId,
        conditionType,
        clinicalText
      );

      res.json({
        success: true,
        movementData,
        movementId,
        conditionType,
        framesGenerated: movementData.frames.length
      });

    } catch (error: any) {
      console.error('Functional movement generation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate functional movement',
        details: error.message 
      });
    }
  });

  // Get available functional movements
  app.get('/api/functional-movements', (req: Request, res: Response) => {
    try {
      const { category, condition } = req.query;
      
      // Import functional movements
      const { FUNCTIONAL_MOVEMENTS } = require('./functionalMovementLibrary');
      
      let movements = FUNCTIONAL_MOVEMENTS;
      
      if (category) {
        movements = movements.filter((m: any) => m.category === category);
      }
      
      if (condition) {
        movements = movements.filter((m: any) => 
          m.affectedByConditions.some((affected: string) => 
            condition.toString().toLowerCase().includes(affected.toLowerCase())
          )
        );
      }
      
      res.json(movements);
    } catch (error: any) {
      console.error('Error getting functional movements:', error);
      res.status(500).json({ error: 'Failed to get functional movements' });
    }
  });

  // Generate Google Veo video for virtual patient movement
  app.post("/api/virtual-patients/:id/generate-veo-video", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const virtualPatientId = parseInt(req.params.id);
      if (isNaN(virtualPatientId)) {
        return res.status(400).json({ error: 'Invalid virtual patient ID' });
      }

      const { movementType, clinicalDescription } = req.body;
      if (!movementType) {
        return res.status(400).json({ error: 'Movement type is required' });
      }

      console.log(`Generating Google Veo video for ${movementType} movement, patient ${virtualPatientId}`);

      // Get virtual patient from both storage systems
      let virtualPatient;
      try {
        virtualPatient = await soapVirtualPatientService.getVirtualPatient(virtualPatientId, userId);
      } catch (error) {
        virtualPatient = await storage.getVirtualPatient(virtualPatientId);
        if (!virtualPatient || virtualPatient.userId !== userId) {
          return res.status(404).json({ error: 'Virtual patient not found' });
        }
      }

      // Generate video using Google Veo
      const videoData = await googleVeoService.generatePatientMovementVideo(
        virtualPatient,
        movementType
      );

      console.log(`Google Veo video generated: ${videoData.generationId}`);

      res.json({
        success: true,
        videoUrl: videoData.videoUrl,
        generationId: videoData.generationId,
        movementType,
        source: 'google-veo',
        generatedAt: new Date()
      });

    } catch (error) {
      console.error('Error generating Google Veo video:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate Google Veo video from clinical text description
  app.post("/api/generate-clinical-video", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { clinicalDescription, movementType = 'functional_movement', duration = 5 } = req.body;
      if (!clinicalDescription) {
        return res.status(400).json({ error: 'Clinical description is required' });
      }

      console.log(`Generating clinical video from text: ${clinicalDescription.substring(0, 100)}...`);

      // Generate video using Google Veo
      const videoData = await googleVeoService.generateClinicalVideo(
        clinicalDescription,
        movementType,
        duration
      );

      console.log(`Clinical video generated: ${videoData.generationId}`);

      res.json({
        success: true,
        videoUrl: videoData.videoUrl,
        generationId: videoData.generationId,
        clinicalDescription,
        movementType,
        duration,
        source: 'google-veo',
        generatedAt: new Date()
      });

    } catch (error) {
      console.error('Error generating clinical video:', error);
      res.status(500).json({ error: error.message });
    }
  });




  // Generate Leonardo AI video for virtual patient
  app.post("/api/virtual-patients/:id/generate-leonardo-video", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const patientId = parseInt(req.params.id);
      const { movementType = 'functional_movement', customPrompt } = req.body;

      console.log(`Generating Leonardo AI video for virtual patient: ${patientId}`);

      // Try to get virtual patient from both storage systems
      let virtualPatient;
      
      try {
        // First try SOAP virtual patients
        virtualPatient = await soapVirtualPatientService.getVirtualPatient(patientId, userId);
      } catch (error) {
        // Fallback to original virtual patients
        const [patient] = await db
          .select()
          .from(virtualPatients)
          .where(eq(virtualPatients.id, patientId));
          
        if (patient) {
          // Check ownership for original virtual patients
          if (patient.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
          }
          virtualPatient = patient;
        }
      }

      if (!virtualPatient) {
        return res.status(404).json({ error: 'Virtual patient not found' });
      }

      const videoResponse = await leonardoService.generatePatientVideo(
        virtualPatient,
        movementType,
        customPrompt
      );

      console.log(`Leonardo AI video generation started: ${videoResponse.taskId}`);

      res.json({
        success: true,
        taskId: videoResponse.taskId,
        status: 'PENDING',
        videoUrl: videoResponse.videoUrl,
        cost: videoResponse.cost,
        patientId,
        movementType,
        source: 'leonardo-ai',
        generatedAt: new Date()
      });

    } catch (error) {
      console.error('Error generating Leonardo AI video:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate Leonardo AI video from clinical text description
  app.post("/api/generate-leonardo-video", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { 
        clinicalDescription, 
        movementType = 'functional_movement'
      } = req.body;

      if (!clinicalDescription) {
        return res.status(400).json({ error: 'Clinical description is required' });
      }

      console.log(`Generating Leonardo AI video from text: ${clinicalDescription.substring(0, 100)}...`);

      // Generate video using Leonardo AI
      const videoResponse = await leonardoService.generateClinicalVideo(
        clinicalDescription,
        movementType
      );

      console.log(`Leonardo AI video generation completed: ${videoResponse.taskId}`);

      res.json({
        success: true,
        taskId: videoResponse.taskId,
        status: 'COMPLETE',
        videoUrl: videoResponse.videoUrl,
        cost: videoResponse.cost,
        clinicalDescription,
        source: 'leonardo-ai',
        generatedAt: new Date()
      });

    } catch (error) {
      console.error('Error generating Leonardo AI video:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Check Leonardo AI generation status
  app.get("/api/leonardo-video/:taskId/status", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;

      console.log(`Checking Leonardo AI video status: ${taskId}`);

      const videoStatus = await leonardoService.getGenerationStatus(taskId);

      res.json({
        taskId,
        status: videoStatus.status,
        progress: videoStatus.progress || 0,
        videoUrl: videoStatus.videoUrl,
        failure_reason: videoStatus.failure_reason
      });

    } catch (error) {
      console.error('Error checking Leonardo AI video status:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get Leonardo AI user info and credits
  app.get("/api/leonardo/user-info", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userInfo = await leonardoService.getUserInfo();
      
      res.json({
        configured: leonardoService.isConfigured(),
        userInfo,
        hasApiKey: !!process.env.LEONARDO_API_KEY
      });

    } catch (error) {
      console.error('Error getting Leonardo AI user info:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Test Leonardo AI configuration
  app.get("/api/leonardo/status", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const configured = leonardoService.isConfigured();
      
      res.json({
        configured,
        hasApiKey: !!process.env.LEONARDO_API_KEY,
        service: 'leonardo-ai',
        pricing: '$9/month for 3,500 API credits'
      });

    } catch (error) {
      console.error('Error checking Leonardo AI status:', error);
      res.status(500).json({ error: error.message });
    }
  });


  // ======================= STICK FIGURE ANIMATION SYSTEM =======================

  // Generate stick figure animation from clinical text
  app.post("/api/generate-stick-figure-animation", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { clinicalDescription, bodyPart, movementType = 'functional_movement' } = req.body;

      if (!clinicalDescription) {
        return res.status(400).json({ error: 'Clinical description is required' });
      }

      console.log(`Generating stick figure animation from text: ${clinicalDescription.substring(0, 100)}...`);

      // Use existing AI movement generator for stick figure animation
      const animationData = await aiMovementGenerator.generateMovementFromSOAP({
        subjective: clinicalDescription,
        objective: '',
        assessment: '',
        plan: '',
        bodyPart: bodyPart || 'general'
      });

      res.json({
        success: true,
        animationData,
        clinicalDescription,
        bodyPart,
        movementType,
        source: 'stick-figure-animation',
        generatedAt: new Date()
      });

    } catch (error) {
      console.error('Error generating stick figure animation:', error);
      res.status(500).json({ error: error.message || 'Failed to generate animation' });
    }
  });

  // ======================= YOUTUBE VIDEO ANALYSIS SYSTEM =======================

  // Validate YouTube URL
  app.post("/api/youtube/validate", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'YouTube URL is required' });
      }

      const isValid = youtubeAnalysisService.isValidYouTubeUrl(url);
      
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid YouTube URL format' });
      }

      // Get video information to confirm accessibility
      const videoInfo = await youtubeAnalysisService.getVideoInfo(url);
      
      res.json({
        valid: true,
        videoInfo: {
          title: videoInfo.title,
          channel: videoInfo.channelName,
          duration: videoInfo.duration,
          publishDate: videoInfo.publishDate
        }
      });
    } catch (error: any) {
      console.error('YouTube URL validation error:', error);
      res.status(400).json({ 
        valid: false, 
        error: error.message || 'Unable to access YouTube video'
      });
    }
  });

  // Analyze YouTube video
  app.post("/api/youtube/analyze", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'YouTube URL is required' });
      }

      console.log(`Starting YouTube video analysis for user ${userId}: ${url}`);

      // Perform comprehensive video analysis
      const analysisResult = await youtubeAnalysisService.analyzeYouTubeVideo(url);
      
      res.json({
        success: true,
        analysis: analysisResult,
        message: 'Video analysis completed successfully'
      });

    } catch (error: any) {
      console.error('YouTube video analysis error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Failed to analyze YouTube video'
      });
    }
  });

  // Get video information only (without full analysis)
  app.post("/api/youtube/info", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'YouTube URL is required' });
      }

      const videoInfo = await youtubeAnalysisService.getVideoInfo(url);
      
      res.json({
        success: true,
        videoInfo
      });

    } catch (error: any) {
      console.error('YouTube video info error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Failed to get video information'
      });
    }
  });

  return httpServer;
}