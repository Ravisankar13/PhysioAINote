import OpenAI from "openai";
import { db } from "./db";
import { 
  continuousRecordingSessions, 
  soapNotes, 
  type InsertContinuousRecordingSession,
  type ContinuousRecordingSession,
  type InsertSoapNote 
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY must be set");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface PatientSegment {
  patientNumber: number;
  startTime: number; // seconds from start
  endTime: number; // seconds from start
  transcript: string;
  confidence: number; // 0-100
  detectionReason: string;
  soapNoteId?: number;
}

export interface PatientDetectionResult {
  isNewPatient: boolean;
  confidence: number;
  reason: string;
  suggestedPatientNumber: number;
  detectedTransitions: {
    greeting: boolean;
    contextSwitch: boolean;
    silenceGap: boolean;
    introductionPattern: boolean;
  };
}

export class ContinuousRecordingService {
  private activeAnalysisIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start a new continuous recording session
   */
  async startContinuousRecording(userId: number, sessionName?: string): Promise<ContinuousRecordingSession> {
    const sessionId = nanoid(16);
    const defaultSessionName = sessionName || `Clinic Day - ${new Date().toLocaleDateString()}`;

    const [newSession] = await db.insert(continuousRecordingSessions).values({
      userId,
      sessionId,
      sessionName: defaultSessionName,
      isActive: true,
      status: "recording",
      totalPatients: 0,
    }).returning();

    // Start real-time patient detection for this session
    this.startPatientDetectionMonitoring(sessionId, userId);

    return newSession;
  }

  /**
   * End a continuous recording session
   */
  async endContinuousRecording(sessionId: string, userId: number): Promise<ContinuousRecordingSession | null> {
    try {
      // Stop monitoring
      this.stopPatientDetectionMonitoring(sessionId);

      // Update session status
      const [updatedSession] = await db.update(continuousRecordingSessions)
        .set({ 
          isActive: false, 
          status: "processing",
          endTime: new Date(),
        })
        .where(and(
          eq(continuousRecordingSessions.sessionId, sessionId),
          eq(continuousRecordingSessions.userId, userId)
        ))
        .returning();

      if (updatedSession) {
        // Final processing of any remaining transcript
        await this.finalizeSessionProcessing(updatedSession);
      }

      return updatedSession || null;
    } catch (error) {
      console.error("Error ending continuous recording session:", error);
      return null;
    }
  }

  /**
   * Process incoming transcript chunk and detect patient transitions
   */
  async processTranscriptChunk(
    sessionId: string, 
    userId: number, 
    newTranscript: string, 
    totalDuration: number
  ): Promise<PatientDetectionResult> {
    try {
      // Get current session
      const [session] = await db.select().from(continuousRecordingSessions)
        .where(and(
          eq(continuousRecordingSessions.sessionId, sessionId),
          eq(continuousRecordingSessions.userId, userId),
          eq(continuousRecordingSessions.isActive, true)
        ));

      if (!session) {
        throw new Error("Active continuous recording session not found");
      }

      // Update session with new transcript
      const fullTranscript = (session.fullTranscript || "") + " " + newTranscript;
      await db.update(continuousRecordingSessions)
        .set({ 
          fullTranscript,
          totalDuration,
          updatedAt: new Date()
        })
        .where(eq(continuousRecordingSessions.id, session.id));

      // Analyze for patient transitions
      const detectionResult = await this.detectPatientTransition(
        newTranscript, 
        fullTranscript, 
        session.totalPatients || 0
      );

      // If new patient detected, create SOAP note segment
      if (detectionResult.isNewPatient) {
        await this.createPatientSegment(session, detectionResult, newTranscript, totalDuration);
      }

      return detectionResult;
    } catch (error) {
      console.error("Error processing transcript chunk:", error);
      return {
        isNewPatient: false,
        confidence: 0,
        reason: "Error in processing",
        suggestedPatientNumber: 1,
        detectedTransitions: {
          greeting: false,
          contextSwitch: false,
          silenceGap: false,
          introductionPattern: false,
        }
      };
    }
  }

  /**
   * AI-powered patient transition detection
   */
  private async detectPatientTransition(
    recentTranscript: string, 
    fullTranscript: string, 
    currentPatientCount: number
  ): Promise<PatientDetectionResult> {
    try {
      const prompt = `You are an AI assistant helping to detect when a healthcare provider switches between different patients during a continuous recording session.

Analyze this recent transcript segment and determine if it indicates the start of a NEW patient encounter.

Recent transcript: "${recentTranscript}"

Context: This is patient #${currentPatientCount + 1} in today's clinic session.

Look for these indicators of a NEW patient:
1. Greeting patterns: "Hi, how are you?", "What brings you in today?", "Nice to meet you"
2. Introduction patterns: Provider introducing themselves again
3. Context switches: Major topic/body part changes from previous discussion
4. Administrative starts: "Let's start with your information", "Can you tell me your name?"
5. Fresh symptom discussions: Starting completely new symptom descriptions

IMPORTANT: Be conservative. Only detect NEW patients when there's strong evidence. 
Don't trigger on:
- Same patient discussing multiple symptoms
- Follow-up questions about the same condition
- Provider talking to colleagues/staff
- Brief interruptions or clarifications

Respond with JSON:
{
  "isNewPatient": boolean,
  "confidence": number (0-100),
  "reason": "Detailed explanation of decision",
  "suggestedPatientNumber": number,
  "detectedTransitions": {
    "greeting": boolean,
    "contextSwitch": boolean,
    "silenceGap": boolean,
    "introductionPattern": boolean
  }
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: "You are a clinical AI assistant specialized in detecting patient transitions during continuous healthcare recordings. Be precise and conservative in your analysis." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 300,
      });

      const analysis = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        isNewPatient: analysis.isNewPatient || false,
        confidence: Math.min(Math.max(analysis.confidence || 0, 0), 100),
        reason: analysis.reason || "AI analysis completed",
        suggestedPatientNumber: analysis.suggestedPatientNumber || currentPatientCount + 1,
        detectedTransitions: analysis.detectedTransitions || {
          greeting: false,
          contextSwitch: false,
          silenceGap: false,
          introductionPattern: false,
        }
      };
    } catch (error) {
      console.error("Error in AI patient detection:", error);
      return {
        isNewPatient: false,
        confidence: 0,
        reason: "AI analysis failed",
        suggestedPatientNumber: currentPatientCount + 1,
        detectedTransitions: {
          greeting: false,
          contextSwitch: false,
          silenceGap: false,
          introductionPattern: false,
        }
      };
    }
  }

  /**
   * Create a new patient segment and SOAP note
   */
  private async createPatientSegment(
    session: ContinuousRecordingSession,
    detection: PatientDetectionResult,
    transcript: string,
    currentTime: number
  ): Promise<void> {
    try {
      const patientNumber = detection.suggestedPatientNumber;
      const sessionId = nanoid(12);

      // Create new SOAP note for this patient
      const [newSoapNote] = await db.insert(soapNotes).values({
        userId: session.userId,
        sessionId,
        continuousRecordingSessionId: session.id,
        patientSequenceNumber: patientNumber,
        patientName: `Patient ${patientNumber}`,
        dateOfVisit: new Date().toISOString().split('T')[0],
        fullTranscription: transcript,
        sessionStatus: "auto_segmented",
        isAutoGenerated: true,
        patientSwitchDetected: true,
        confidence: detection.confidence,
        recordingDuration: Math.floor(currentTime),
      }).returning();

      // Update continuous recording session
      await db.update(continuousRecordingSessions)
        .set({ 
          totalPatients: patientNumber,
          patientSegments: await this.updatePatientSegments(session, {
            patientNumber,
            startTime: Math.max(0, currentTime - 30), // Assume patient started 30s ago
            endTime: currentTime,
            transcript,
            confidence: detection.confidence,
            detectionReason: detection.reason,
            soapNoteId: newSoapNote.id,
          }),
        })
        .where(eq(continuousRecordingSessions.id, session.id));

      console.log(`🎯 New patient detected: Patient ${patientNumber} (Confidence: ${detection.confidence}%)`);
    } catch (error) {
      console.error("Error creating patient segment:", error);
    }
  }

  /**
   * Update patient segments array
   */
  private async updatePatientSegments(
    session: ContinuousRecordingSession, 
    newSegment: PatientSegment
  ): Promise<PatientSegment[]> {
    const existingSegments = (session.patientSegments as PatientSegment[]) || [];
    return [...existingSegments, newSegment];
  }

  /**
   * Start monitoring for patient detection (placeholder for real-time implementation)
   */
  private startPatientDetectionMonitoring(sessionId: string, userId: number): void {
    // This would integrate with real-time speech recognition
    // For now, it's handled by the transcript chunk processing
    console.log(`🎙️ Started patient detection monitoring for session: ${sessionId}`);
  }

  /**
   * Stop monitoring for patient detection
   */
  private stopPatientDetectionMonitoring(sessionId: string): void {
    const interval = this.activeAnalysisIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.activeAnalysisIntervals.delete(sessionId);
    }
    console.log(`🛑 Stopped patient detection monitoring for session: ${sessionId}`);
  }

  /**
   * Finalize session processing and generate SOAP notes
   */
  private async finalizeSessionProcessing(session: ContinuousRecordingSession): Promise<void> {
    try {
      // Get all SOAP notes for this session
      const sessionSoapNotes = await db.select().from(soapNotes)
        .where(eq(soapNotes.continuousRecordingSessionId, session.id));

      // Generate SOAP sections for each auto-segmented note
      for (const soapNote of sessionSoapNotes) {
        if (soapNote.sessionStatus === "auto_segmented" && soapNote.fullTranscription) {
          await this.generateSoapSectionsFromTranscript(soapNote.id, soapNote.fullTranscription);
        }
      }

      // Mark session as completed
      await db.update(continuousRecordingSessions)
        .set({ status: "completed" })
        .where(eq(continuousRecordingSessions.id, session.id));

      console.log(`✅ Finalized continuous recording session: ${session.sessionName}`);
    } catch (error) {
      console.error("Error finalizing session processing:", error);
    }
  }

  /**
   * Generate SOAP sections from transcript using AI
   */
  private async generateSoapSectionsFromTranscript(soapNoteId: number, transcript: string): Promise<void> {
    try {
      const prompt = `As a clinical AI assistant, analyze this patient encounter transcript and generate structured SOAP note sections.

Transcript: "${transcript}"

Generate professional SOAP note sections:

Respond with JSON:
{
  "subjective": "Patient's reported symptoms, history, and concerns",
  "objective": "Observable findings, measurements, tests performed",
  "assessment": "Clinical diagnosis and professional assessment", 
  "plan": "Treatment plan, recommendations, and follow-up"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: "You are a clinical documentation AI specialized in generating professional SOAP notes from patient encounter transcripts." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 1000,
      });

      const soapSections = JSON.parse(response.choices[0].message.content || "{}");

      // Update SOAP note with generated sections
      await db.update(soapNotes)
        .set({
          subjective: soapSections.subjective || "",
          objective: soapSections.objective || "",
          assessment: soapSections.assessment || "",
          plan: soapSections.plan || "",
          sessionStatus: "completed",
          completedAt: new Date(),
        })
        .where(eq(soapNotes.id, soapNoteId));

    } catch (error) {
      console.error("Error generating SOAP sections:", error);
    }
  }

  /**
   * Get active continuous recording session for user
   */
  async getActiveContinuousSession(userId: number): Promise<ContinuousRecordingSession | null> {
    try {
      const [session] = await db.select().from(continuousRecordingSessions)
        .where(and(
          eq(continuousRecordingSessions.userId, userId),
          eq(continuousRecordingSessions.isActive, true)
        ));

      return session || null;
    } catch (error) {
      console.error("Error getting active continuous session:", error);
      return null;
    }
  }

  /**
   * Get all continuous recording sessions for user
   */
  async getUserContinuousSessions(userId: number): Promise<ContinuousRecordingSession[]> {
    try {
      return await db.select().from(continuousRecordingSessions)
        .where(eq(continuousRecordingSessions.userId, userId));
    } catch (error) {
      console.error("Error getting user continuous sessions:", error);
      return [];
    }
  }

  /**
   * Get SOAP notes for a continuous recording session
   */
  async getSessionSoapNotes(sessionId: number, userId: number) {
    try {
      return await db.select().from(soapNotes)
        .where(and(
          eq(soapNotes.continuousRecordingSessionId, sessionId),
          eq(soapNotes.userId, userId)
        ));
    } catch (error) {
      console.error("Error getting session SOAP notes:", error);
      return [];
    }
  }
}

export const continuousRecordingService = new ContinuousRecordingService();