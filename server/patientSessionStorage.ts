import { 
  patientSessions, type PatientSession, type InsertPatientSession,
  audioRecordings, type AudioRecording, type InsertAudioRecording,
  sessionStatusEnum
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

/**
 * Storage methods for Patient Sessions and Audio Recordings
 */
export class PatientSessionStorage {
  // Patient Session Methods
  async getPatientSession(id: number): Promise<PatientSession | undefined> {
    const sessions = await db.select().from(patientSessions).where(eq(patientSessions.id, id)).limit(1);
    return sessions[0];
  }

  async getUserPatientSessions(userId: number): Promise<PatientSession[]> {
    return await db.select().from(patientSessions)
      .where(eq(patientSessions.userId, userId))
      .orderBy(desc(patientSessions.createdAt));
  }

  async createPatientSession(session: InsertPatientSession): Promise<PatientSession> {
    const result = await db.insert(patientSessions).values(session).returning();
    return result[0];
  }

  async updatePatientSession(id: number, data: Partial<InsertPatientSession>): Promise<PatientSession> {
    const result = await db.update(patientSessions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(patientSessions.id, id))
      .returning();
    return result[0];
  }

  async updatePatientSessionStatus(id: number, status: string): Promise<PatientSession> {
    const result = await db.update(patientSessions)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(patientSessions.id, id))
      .returning();
    return result[0];
  }

  async updatePatientSessionTranscript(id: number, transcriptUrl: string, transcriptS3Uri: string): Promise<PatientSession> {
    const result = await db.update(patientSessions)
      .set({ 
        transcriptUrl, 
        transcriptS3Uri, 
        status: "transcribed" as any,
        updatedAt: new Date() 
      })
      .where(eq(patientSessions.id, id))
      .returning();
    return result[0];
  }

  async updatePatientSessionSoapNote(id: number, soapNote: any): Promise<PatientSession> {
    const result = await db.update(patientSessions)
      .set({ 
        soapNote, 
        status: "completed" as any,
        updatedAt: new Date() 
      })
      .where(eq(patientSessions.id, id))
      .returning();
    return result[0];
  }

  // Audio Recording Methods
  async createAudioRecording(recording: InsertAudioRecording): Promise<AudioRecording> {
    const result = await db.insert(audioRecordings).values(recording).returning();
    return result[0];
  }

  async getSessionAudioRecordings(sessionId: number): Promise<AudioRecording[]> {
    return await db.select().from(audioRecordings)
      .where(eq(audioRecordings.sessionId, sessionId))
      .orderBy(desc(audioRecordings.createdAt));
  }
}

export const patientSessionStorage = new PatientSessionStorage();