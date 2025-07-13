import { OpenAI } from "openai";
import { storage } from "./storage";
import { nanoid } from "nanoid";
import type { 
  ContinuousRecordingSession, 
  InsertContinuousRecordingSession,
  SoapNote,
  InsertSoapNote 
} from "../shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface PatientDetectionResult {
  patientSwitchDetected: boolean;
  newPatientName?: string;
  currentPatientNumber: number;
  confidence: number;
  triggerPhrase?: string;
}

interface PatientSegment {
  patientNumber: number;
  patientName?: string;
  startTime: number;
  endTime?: number;
  transcript: string;
  confidence: number;
  isCompleted: boolean;
}

interface SoapGenerationResult {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  confidence: number;
}

export class ContinuousRecordingService {
  private activeSession: ContinuousRecordingSession | null = null;
  private currentPatientSegments: PatientSegment[] = [];
  private currentTranscript = "";

  /**
   * Start a new continuous recording session
   */
  async startContinuousSession(userId: number): Promise<ContinuousRecordingSession> {
    const sessionId = nanoid();
    const today = new Date();
    
    const sessionData: InsertContinuousRecordingSession = {
      userId,
      sessionId,
      sessionName: `Clinic Day - ${today.toLocaleDateString()}`,
      startTime: today,
      isActive: true,
      totalPatients: 0,
      status: "recording",
      patientSegments: [],
      aiAnalysisLog: []
    };

    this.activeSession = await storage.createContinuousRecordingSession(sessionData);
    this.currentPatientSegments = [];
    this.currentTranscript = "";

    // Initialize first patient segment
    this.currentPatientSegments.push({
      patientNumber: 1,
      startTime: Date.now(),
      transcript: "",
      confidence: 1.0,
      isCompleted: false
    });

    return this.activeSession;
  }

  /**
   * Process incoming audio transcript chunk during recording
   */
  async processTranscriptChunk(
    sessionId: string, 
    transcriptChunk: string
  ): Promise<{
    patientSwitch: PatientDetectionResult;
    currentPatient: PatientSegment;
    completedSoapNotes?: SoapNote[];
  }> {
    if (!this.activeSession || this.activeSession.sessionId !== sessionId) {
      throw new Error("No active session found");
    }

    // Add to current transcript
    this.currentTranscript += " " + transcriptChunk;

    // Get current patient segment
    const currentPatient = this.currentPatientSegments[this.currentPatientSegments.length - 1];
    currentPatient.transcript += " " + transcriptChunk;

    // Detect patient switch
    const patientDetection = await this.detectPatientSwitch(transcriptChunk, this.currentTranscript);

    let completedSoapNotes: SoapNote[] = [];

    if (patientDetection.patientSwitchDetected) {
      // Complete current patient
      currentPatient.endTime = Date.now();
      currentPatient.isCompleted = true;

      // Generate SOAP note for completed patient in background
      const soapNote = await this.generateSoapNoteForPatient(currentPatient);
      completedSoapNotes.push(soapNote);

      // Start new patient segment
      const newPatient: PatientSegment = {
        patientNumber: patientDetection.currentPatientNumber,
        patientName: patientDetection.newPatientName,
        startTime: Date.now(),
        transcript: "",
        confidence: patientDetection.confidence,
        isCompleted: false
      };

      this.currentPatientSegments.push(newPatient);

      // Update session
      await this.updateSessionData();
    }

    return {
      patientSwitch: patientDetection,
      currentPatient: this.currentPatientSegments[this.currentPatientSegments.length - 1],
      completedSoapNotes
    };
  }

  /**
   * Detect patient switch using AI analysis
   */
  private async detectPatientSwitch(
    recentTranscript: string, 
    fullTranscript: string
  ): Promise<PatientDetectionResult> {
    try {
      // Check for obvious trigger phrases first
      const triggerPhrases = [
        "next patient",
        "thank you",
        "that's all for today",
        "see you later",
        "goodbye",
        "take care",
        "patient number",
        "hi, i'm",
        "my name is",
        "hello, i'm"
      ];

      const lowerTranscript = recentTranscript.toLowerCase();
      const triggerFound = triggerPhrases.find(phrase => lowerTranscript.includes(phrase));

      if (triggerFound) {
        // Extract patient name if introduction detected
        let newPatientName;
        if (lowerTranscript.includes("my name is") || lowerTranscript.includes("i'm")) {
          const nameMatch = recentTranscript.match(/(?:my name is|i'm)\s+([a-zA-Z]+)/i);
          newPatientName = nameMatch ? nameMatch[1] : undefined;
        }

        return {
          patientSwitchDetected: true,
          newPatientName,
          currentPatientNumber: this.currentPatientSegments.length + 1,
          confidence: 0.9,
          triggerPhrase: triggerFound
        };
      }

      // Use AI for more sophisticated detection
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are analyzing a continuous clinical recording to detect patient transitions. 
            
            Look for signs that one patient consultation has ended and a new one is beginning:
            - Farewell phrases or session endings
            - New introductions or greetings
            - Significant topic changes
            - Long pauses (indicated by transcript gaps)
            - Context shifts from one clinical case to another
            
            Respond with JSON:
            {
              "patientSwitchDetected": boolean,
              "newPatientName": string or null,
              "confidence": number (0-1),
              "reasoning": string
            }`
          },
          {
            role: "user",
            content: `Recent transcript (last 30 seconds): "${recentTranscript}"\n\nAnalyze if this indicates a patient transition.`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 200
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");

      return {
        patientSwitchDetected: result.patientSwitchDetected || false,
        newPatientName: result.newPatientName,
        currentPatientNumber: this.currentPatientSegments.length + 1,
        confidence: result.confidence || 0.5
      };

    } catch (error) {
      console.error("Error in patient detection:", error);
      return {
        patientSwitchDetected: false,
        currentPatientNumber: this.currentPatientSegments.length,
        confidence: 0
      };
    }
  }

  /**
   * Generate SOAP note for completed patient segment
   */
  private async generateSoapNoteForPatient(patientSegment: PatientSegment): Promise<SoapNote> {
    try {
      const soapResult = await this.generateSoapFromTranscript(patientSegment.transcript);
      
      const soapNoteData: InsertSoapNote = {
        userId: this.activeSession!.userId,
        continuousRecordingSessionId: this.activeSession!.id,
        patientSequenceNumber: patientSegment.patientNumber,
        sessionId: this.activeSession!.sessionId, // Use main session ID so notes can be found by the API
        patientId: `patient-${this.activeSession!.sessionId}-${patientSegment.patientNumber}`,
        patientName: patientSegment.patientName || `Patient ${patientSegment.patientNumber}`,
        dateOfVisit: new Date().toISOString().split('T')[0],
        fullTranscription: patientSegment.transcript,
        subjective: soapResult.subjective,
        objective: soapResult.objective,
        assessment: soapResult.assessment,
        plan: soapResult.plan,
        sessionStatus: "completed",
        isAutoGenerated: true,
        patientSwitchDetected: true,
        recordingDuration: Math.floor(patientSegment.endTime - patientSegment.startTime)
      };

      return await storage.createSoapNote(soapNoteData);
    } catch (error) {
      console.error("Error generating SOAP note:", error);
      throw error;
    }
  }

  /**
   * Generate SOAP sections from transcript using AI
   */
  private async generateSoapFromTranscript(transcript: string): Promise<SoapGenerationResult> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert physiotherapist. Convert this patient consultation transcript into proper SOAP note format.

IMPORTANT: Do NOT copy the transcript directly. Instead:
- Subjective: Summarize patient's complaints, symptoms, and history in clinical terminology
- Objective: Extract any physical examination findings, observations, or measurements
- Assessment: Provide clinical reasoning and potential diagnoses based on the information
- Plan: Suggest appropriate treatment approaches and next steps

Format as JSON:
{
  "subjective": "...",
  "objective": "...",
  "assessment": "...",
  "plan": "...",
  "confidence": number (0-1)
}`
          },
          {
            role: "user",
            content: `Convert this consultation transcript into a professional SOAP note:\n\n${transcript}`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        subjective: result.subjective || "Patient consultation documented.",
        objective: result.objective || "Physical examination findings to be documented.",
        assessment: result.assessment || "Clinical assessment pending.",
        plan: result.plan || "Treatment plan to be developed.",
        confidence: result.confidence || 0.8
      };
    } catch (error) {
      console.error("Error generating SOAP from transcript:", error);
      return {
        subjective: "AI processing temporarily unavailable. Manual review required.",
        objective: "Physical examination findings to be documented.",
        assessment: "Clinical assessment pending review.",
        plan: "Treatment plan to be developed based on assessment.",
        confidence: 0.1
      };
    }
  }

  /**
   * End continuous recording session
   */
  async endContinuousSession(sessionId: string, userId?: number): Promise<{
    completedSession: ContinuousRecordingSession;
    finalSoapNotes: SoapNote[];
    deletedNotesCount?: number;
  }> {
    if (!this.activeSession || this.activeSession.sessionId !== sessionId) {
      throw new Error("No active session found");
    }

    // Complete final patient if still recording
    const finalSoapNotes: SoapNote[] = [];
    const currentPatient = this.currentPatientSegments[this.currentPatientSegments.length - 1];
    
    if (!currentPatient.isCompleted && currentPatient.transcript.trim()) {
      currentPatient.endTime = Date.now();
      currentPatient.isCompleted = true;
      const finalSoap = await this.generateSoapNoteForPatient(currentPatient);
      finalSoapNotes.push(finalSoap);
    }

    // Delete all completed SOAP notes for this user when ending clinic day session
    let deletedNotesCount = 0;
    if (userId) {
      try {
        await storage.deleteAllCompletedSoapNotes(userId);
        console.log(`🗑️ Deleted all completed SOAP notes for user ${userId} on clinic day session end`);
        deletedNotesCount = 1; // Indicate notes were deleted
      } catch (error) {
        console.error("Error deleting completed notes on session end:", error);
      }
    }

    // Update session
    const endTime = new Date();
    const totalDuration = Math.round((endTime.getTime() - this.activeSession.startTime.getTime()) / 1000);
    
    const updatedSession = await storage.updateContinuousRecordingSession(this.activeSession.id, {
      endTime,
      totalDuration,
      isActive: false,
      status: "completed",
      totalPatients: this.currentPatientSegments.length,
      fullTranscript: this.currentTranscript,
      patientSegments: this.currentPatientSegments
    });

    this.activeSession = null;
    this.currentPatientSegments = [];
    this.currentTranscript = "";

    return {
      completedSession: updatedSession,
      finalSoapNotes,
      deletedNotesCount
    };
  }

  /**
   * Get active session info
   */
  getActiveSession(): ContinuousRecordingSession | null {
    return this.activeSession;
  }

  /**
   * Get current patient segments
   */
  getCurrentPatientSegments(): PatientSegment[] {
    return this.currentPatientSegments;
  }

  /**
   * Get completed SOAP notes for session
   */
  async getCompletedSoapNotes(sessionId: string): Promise<SoapNote[]> {
    return await storage.getSoapNotesBySessionId(sessionId);
  }

  /**
   * Update session data in database
   */
  private async updateSessionData(): Promise<void> {
    if (!this.activeSession) return;

    await storage.updateContinuousRecordingSession(this.activeSession.id, {
      totalPatients: this.currentPatientSegments.length,
      fullTranscript: this.currentTranscript,
      patientSegments: this.currentPatientSegments,
      updatedAt: new Date()
    });
  }

  /**
   * Manual patient switch trigger
   */
  async manualPatientSwitch(sessionId: string, newPatientName?: string): Promise<PatientDetectionResult> {
    console.log("manualPatientSwitch called with sessionId:", sessionId);
    console.log("Active session:", this.activeSession);
    
    if (!this.activeSession) {
      throw new Error("No active session found");
    }

    // Check session ID - handle both string and number IDs
    const activeSessionId = this.activeSession.sessionId || this.activeSession.id?.toString();
    if (activeSessionId !== sessionId) {
      console.log("Session ID mismatch. Expected:", sessionId, "Got:", activeSessionId);
      throw new Error(`Session ID mismatch. Active: ${activeSessionId}, Requested: ${sessionId}`);
    }

    // Complete current patient
    const currentPatient = this.currentPatientSegments[this.currentPatientSegments.length - 1];
    currentPatient.endTime = Date.now();
    currentPatient.isCompleted = true;

    // Generate SOAP note for completed patient (but don't let it fail the switch)
    try {
      await this.generateSoapNoteForPatient(currentPatient);
      console.log("✓ SOAP note generated successfully for patient", currentPatient.patientNumber);
    } catch (error) {
      console.error("Warning: SOAP note generation failed, but continuing with patient switch:", error);
    }

    // Start new patient
    const newPatient: PatientSegment = {
      patientNumber: this.currentPatientSegments.length + 1,
      patientName: newPatientName,
      startTime: Date.now(),
      transcript: "",
      confidence: 1.0,
      isCompleted: false
    };

    this.currentPatientSegments.push(newPatient);
    await this.updateSessionData();

    return {
      patientSwitchDetected: true,
      newPatientName,
      currentPatientNumber: newPatient.patientNumber,
      confidence: 1.0,
      triggerPhrase: "manual_switch"
    };
  }
}

export const continuousRecordingService = new ContinuousRecordingService();