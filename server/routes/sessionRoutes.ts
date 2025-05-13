import { Router, Request, Response, NextFunction } from 'express';
import { patientSessionStorage } from '../patientSessionStorage';
import { z } from 'zod';
import { insertPatientSessionSchema } from '@shared/schema';
import multer from 'multer';
import { transcribeAudio } from '../transcription';
import { generateSoapNote } from '../openai';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

// Configure multer for audio uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure test-uploads directory exists
    const dir = path.join(process.cwd(), 'test-uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Ensure user is authenticated middleware
const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
};

const router = Router();

// Get all sessions for the current user
router.get('/sessions', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const sessions = await patientSessionStorage.getUserPatientSessions(req.user!.id);
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific session
router.get('/sessions/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const session = await patientSessionStorage.getPatientSession(parseInt(req.params.id));
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if user owns this session
    if (session.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to access this session' });
    }
    
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new session
router.post('/sessions', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // Validate request data
    const validationSchema = insertPatientSessionSchema.extend({
      // Add any extra validation if needed
    });
    
    const sessionData = validationSchema.parse({
      ...req.body,
      userId: req.user!.id
    });
    
    const newSession = await patientSessionStorage.createPatientSession(sessionData);
    res.status(201).json(newSession);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update a session
router.patch('/sessions/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.id);
    const session = await patientSessionStorage.getPatientSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if user owns this session
    if (session.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to update this session' });
    }
    
    // Update session
    const updatedSession = await patientSessionStorage.updatePatientSession(sessionId, req.body);
    res.json(updatedSession);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Handle audio recording upload
router.post('/sessions/:id/audio', ensureAuthenticated, upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    const sessionId = parseInt(req.params.id);
    const session = await patientSessionStorage.getPatientSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if user owns this session
    if (session.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to update this session' });
    }

    // Get the uploaded file
    const audioFilePath = req.file.path;
    
    // Here we would normally upload to S3, but for now we'll use local file
    // In a real implementation, this would be:
    // const audioS3Uri = await uploadToS3(audioFilePath, sessionId);
    // const audioUrl = getPresignedUrl(audioS3Uri);
    
    // Mock S3 paths for development
    const audioS3Uri = `s3://mock-bucket/${req.file.filename}`;
    const audioUrl = `/api/audio/${req.file.filename}`;
    
    // Create audio recording record
    const audioRecording = await patientSessionStorage.createAudioRecording({
      sessionId,
      audioUrl,
      audioS3Uri,
      duration: parseInt(req.body.duration || '0') 
    });
    
    // Update session status
    await patientSessionStorage.updatePatientSessionStatus(sessionId, 'recorded');
    
    res.status(201).json({
      message: 'Audio uploaded successfully',
      recording: audioRecording
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Transcribe audio for a session
router.post('/sessions/:id/transcribe', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.id);
    const session = await patientSessionStorage.getPatientSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if user owns this session
    if (session.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to access this session' });
    }
    
    // Get the audio recordings for this session
    const recordings = await patientSessionStorage.getSessionAudioRecordings(sessionId);
    
    if (recordings.length === 0) {
      return res.status(400).json({ error: 'No audio recordings found for this session' });
    }
    
    // For now, we'll use the most recent recording
    const latestRecording = recordings[0];
    
    // In a real implementation, this would fetch from S3:
    // const audioContent = await fetchFromS3(latestRecording.audioS3Uri);
    
    // For development, we'll use the local file
    const filename = path.basename(latestRecording.audioUrl);
    const filePath = path.join(process.cwd(), 'test-uploads', filename);
    
    // Transcribe the audio
    let transcript;
    try {
      transcript = await transcribeAudio(filePath);
    } catch (error) {
      console.error('Transcription error:', error);
      // Mock transcript for development
      transcript = "This is a sample transcript for testing. Patient reports shoulder pain for 2 weeks.";
    }
    
    // Save the transcript to a CSV file for demo purposes
    const transcriptFilePath = path.join(process.cwd(), 'test-uploads', `transcript-${sessionId}.csv`);
    await writeFileAsync(transcriptFilePath, "Timestamp,Transcript\n0,\"" + transcript + "\"");
    
    // In a real implementation, this would upload to S3:
    // const transcriptS3Uri = await uploadToS3(transcriptFile, sessionId);
    // const transcriptUrl = getPresignedUrl(transcriptS3Uri);
    
    // Mock S3 paths for development
    const transcriptS3Uri = `s3://mock-bucket/transcript-${sessionId}.csv`;
    const transcriptUrl = `/api/transcript/${sessionId}`;
    
    // Update session with transcript
    const updatedSession = await patientSessionStorage.updatePatientSessionTranscript(
      sessionId, 
      transcriptUrl, 
      transcriptS3Uri
    );
    
    res.json({
      message: 'Audio transcribed successfully',
      session: updatedSession,
      transcript
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate SOAP note from transcript
router.post('/sessions/:id/generate-soap-note', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.id);
    const session = await patientSessionStorage.getPatientSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if user owns this session
    if (session.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to access this session' });
    }
    
    // Check if transcript exists
    if (!session.transcriptUrl) {
      return res.status(400).json({ error: 'No transcript available for this session' });
    }

    // In a real implementation, this would fetch from S3:
    // const transcriptContent = await fetchFromS3(session.transcriptS3Uri);
    
    // For development, we'll use the local file
    const transcriptFilePath = path.join(process.cwd(), 'test-uploads', `transcript-${sessionId}.csv`);
    let transcript;
    try {
      const transcriptContent = await fs.promises.readFile(transcriptFilePath, 'utf8');
      const transcriptLines = transcriptContent.split('\n').slice(1); // Skip header
      transcript = transcriptLines.map(line => {
        const parts = line.split(',');
        return parts.length > 1 ? parts[1].replace(/^"|"$/g, '') : '';
      }).join(' ');
    } catch (error) {
      console.error('Transcript read error:', error);
      // Mock transcript for development
      transcript = "Patient reports shoulder pain for 2 weeks after lifting heavy objects. Pain worsens with overhead activities.";
    }
    
    // Prepare input for SOAP note generation
    const patientName = session.firstName && session.lastName 
      ? `${session.firstName} ${session.lastName}`
      : "Anonymous Patient";
    
    const patientInfo = {
      patientName,
      age: session.dob ? calculateAge(session.dob) : "Unknown",
      gender: session.gender || "Unknown",
      pastMedicalHistory: session.pastMedicalHistory || "",
      pastSurgicalHistory: session.pastSurgicalHistory || "",
    };
    
    // Update session status to processing
    await patientSessionStorage.updatePatientSessionStatus(sessionId, 'processing');
    
    // Generate SOAP note (this would typically be an async process)
    const soapNote = await generateSoapNote({
      transcript,
      patientInfo
    });
    
    // Update session with SOAP note
    const updatedSession = await patientSessionStorage.updatePatientSessionSoapNote(sessionId, soapNote);
    
    res.json({
      message: 'SOAP note generated successfully',
      session: updatedSession,
      soapNote
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to calculate age from DOB
function calculateAge(dob: string): string {
  try {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age.toString();
  } catch (e) {
    return "Unknown";
  }
}

// Serve transcript files (for development only)
router.get('/transcript/:sessionId', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const session = await patientSessionStorage.getPatientSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if user owns this session
    if (session.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to access this transcript' });
    }
    
    const transcriptFilePath = path.join(process.cwd(), 'test-uploads', `transcript-${sessionId}.csv`);
    res.sendFile(transcriptFilePath);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Serve audio files (for development only)
router.get('/audio/:filename', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const filePath = path.join(process.cwd(), 'test-uploads', req.params.filename);
    res.sendFile(filePath);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;