import { 
  users, type User, type InsertUser,
  clinicalNotes, type ClinicalNote, type InsertClinicalNote, type UpdateNoteVisibility,
  comments, type Comment, type InsertComment,
  researchArticles, type ResearchArticle, type InsertResearchArticle,
  subscriptionPlans, type SubscriptionPlan, 
  paymentRecords, type PaymentRecord, type InsertPaymentRecord,
  exercises, type Exercise, type InsertExercise,
  bodyPartEnum, difficultyEnum,
  patientSessions, type PatientSession, type InsertPatientSession,
  audioRecordings, type AudioRecording, type InsertAudioRecording,
  manualTherapyTechniques, type ManualTherapyTechnique, type InsertManualTherapyTechnique,
  sessionStatusEnum
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, isNull, sql } from "drizzle-orm";
import { calculateAgeRange, deIdentifyNote, extractCondition } from "./utilities/deIdentify";
import { patientSessionStorage } from "./patientSessionStorage";

export interface IStorage {
  // User Operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserMembership(userId: number, membershipTier: string, expiryDate: Date): Promise<User>;
  updateStripeCustomerId(userId: number, customerId: string): Promise<User>;
  updateStripeSubscriptionId(userId: number, subscriptionId: string): Promise<User>;
  updateUserStripeInfo(userId: number, data: { customerId: string, subscriptionId: string }): Promise<User>;
  
  // Clinical Notes Operations
  getClinicalNote(id: number, currentUserId?: number): Promise<ClinicalNote | undefined>;
  getClinicalNotes(currentUserId?: number): Promise<ClinicalNote[]>;
  getUserNotes(userId: number): Promise<ClinicalNote[]>;
  createClinicalNote(note: InsertClinicalNote): Promise<ClinicalNote>;
  updateNoteVisibility(noteId: number, updateData: UpdateNoteVisibility): Promise<ClinicalNote>;
  
  // Comments Operations
  createComment(comment: InsertComment): Promise<Comment>;
  getNoteComments(noteId: number): Promise<Comment[]>;
  getCommentReplies(commentId: number): Promise<Comment[]>;
  
  // Research Article Operations
  getResearchArticle(id: number): Promise<ResearchArticle | undefined>;
  getResearchArticles(
    bodyPart?: string,
    page?: number,
    pageSize?: number
  ): Promise<{
    articles: ResearchArticle[],
    total: number
  }>;
  createResearchArticle(article: InsertResearchArticle): Promise<ResearchArticle>;
  
  // Exercise Operations
  getExercise(id: number): Promise<Exercise | undefined>;
  getExercises(bodyPart?: string, difficulty?: string): Promise<Exercise[]>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  
  // Manual Therapy Technique Operations
  getManualTherapyTechnique(id: number): Promise<ManualTherapyTechnique | undefined>;
  getManualTherapyTechniques(bodyPart?: string): Promise<ManualTherapyTechnique[]>;
  createManualTherapyTechnique(technique: InsertManualTherapyTechnique): Promise<ManualTherapyTechnique>;
  
  // Subscription Operations
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  getSubscriptionPlanByTier(tier: string): Promise<SubscriptionPlan | undefined>;
  
  // Payment Operations
  createPaymentRecord(payment: InsertPaymentRecord): Promise<PaymentRecord>;
  getUserPayments(userId: number): Promise<PaymentRecord[]>;
  
  // Patient Session Operations
  getPatientSession(id: number): Promise<PatientSession | undefined>;
  getUserPatientSessions(userId: number): Promise<PatientSession[]>;
  createPatientSession(session: InsertPatientSession): Promise<PatientSession>;
  updatePatientSession(id: number, data: Partial<InsertPatientSession>): Promise<PatientSession>;
  updatePatientSessionStatus(id: number, status: string): Promise<PatientSession>;
  updatePatientSessionTranscript(id: number, transcriptUrl: string, transcriptS3Uri: string): Promise<PatientSession>;
  updatePatientSessionSoapNote(id: number, soapNote: any): Promise<PatientSession>;
  
  // Audio Recording Operations
  createAudioRecording(recording: InsertAudioRecording): Promise<AudioRecording>;
  getSessionAudioRecordings(sessionId: number): Promise<AudioRecording[]>;
}

export class DatabaseStorage implements IStorage {
  // Patient Session methods, using patientSessionStorage
  async getPatientSession(id: number): Promise<PatientSession | undefined> {
    return await patientSessionStorage.getPatientSession(id);
  }

  async getUserPatientSessions(userId: number): Promise<PatientSession[]> {
    return await patientSessionStorage.getUserPatientSessions(userId);
  }

  async createPatientSession(session: InsertPatientSession): Promise<PatientSession> {
    return await patientSessionStorage.createPatientSession(session);
  }

  async updatePatientSession(id: number, data: Partial<InsertPatientSession>): Promise<PatientSession> {
    return await patientSessionStorage.updatePatientSession(id, data);
  }

  async updatePatientSessionStatus(id: number, status: string): Promise<PatientSession> {
    return await patientSessionStorage.updatePatientSessionStatus(id, status);
  }

  async updatePatientSessionTranscript(id: number, transcriptUrl: string, transcriptS3Uri: string): Promise<PatientSession> {
    return await patientSessionStorage.updatePatientSessionTranscript(id, transcriptUrl, transcriptS3Uri);
  }

  async updatePatientSessionSoapNote(id: number, soapNote: any): Promise<PatientSession> {
    return await patientSessionStorage.updatePatientSessionSoapNote(id, soapNote);
  }
  
  // Audio Recording methods, using patientSessionStorage
  async createAudioRecording(recording: InsertAudioRecording): Promise<AudioRecording> {
    return await patientSessionStorage.createAudioRecording(recording);
  }

  async getSessionAudioRecordings(sessionId: number): Promise<AudioRecording[]> {
    return await patientSessionStorage.getSessionAudioRecordings(sessionId);
  }
  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.username, username));
    return results.length > 0 ? results[0] : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Clinical Notes Methods
  async getClinicalNote(id: number, currentUserId?: number): Promise<ClinicalNote | undefined> {
    const results = await db.select().from(clinicalNotes).where(eq(clinicalNotes.id, id));
    
    if (results.length === 0) {
      return undefined;
    }
    
    const note = results[0];
    
    // If the user is viewing their own note, return the full note
    if (currentUserId && note.userId === currentUserId) {
      return note;
    }
    
    // For public or shared notes viewed by other users, ensure we're returning a de-identified version
    if (note.visibility === 'public' || note.visibility === 'shared') {
      // If the de-identified fields aren't populated yet, let's create them
      if (!note.deIdentifiedNote || !note.ageRange || !note.condition) {
        // Generate the de-identification data
        const deIdentifiedFields = {
          deIdentifiedNote: deIdentifyNote(note),
          ageRange: calculateAgeRange(note.dateOfBirth),
          condition: extractCondition(note)
        };
        
        // Update the note in the database with the de-identified data
        await db.update(clinicalNotes)
          .set(deIdentifiedFields)
          .where(eq(clinicalNotes.id, id));
          
        // Add the fields to the return value
        return {
          ...note,
          ...deIdentifiedFields
        };
      }
      
      return note;
    }
    
    // If the note is private and the user is not the owner, this function should not be called
    // But for safety, return undefined in this case
    return undefined;
  }

  async getClinicalNotes(currentUserId?: number): Promise<ClinicalNote[]> {
    // If no user ID is provided (not authenticated), only return public notes
    if (!currentUserId) {
      return db.select()
        .from(clinicalNotes)
        .where(eq(clinicalNotes.visibility, "public"))
        .orderBy(desc(clinicalNotes.createdAt));
    }
    
    // If user ID is provided, return:
    // 1. public notes (accessible to everyone)
    // 2. shared notes (accessible to all authenticated users)
    // 3. user's own notes (regardless of visibility)
    return db.select()
      .from(clinicalNotes)
      .where(
        or(
          eq(clinicalNotes.visibility, "public"),
          eq(clinicalNotes.visibility, "shared"),
          eq(clinicalNotes.userId, currentUserId)
        )
      )
      .orderBy(desc(clinicalNotes.createdAt));
  }
  
  async getUserNotes(userId: number): Promise<ClinicalNote[]> {
    return db.select()
      .from(clinicalNotes)
      .where(eq(clinicalNotes.userId, userId))
      .orderBy(desc(clinicalNotes.createdAt));
  }

  async createClinicalNote(note: InsertClinicalNote): Promise<ClinicalNote> {
    const result = await db.insert(clinicalNotes).values(note).returning();
    return result[0];
  }
  
  async updateNoteVisibility(noteId: number, updateData: UpdateNoteVisibility): Promise<ClinicalNote> {
    // First get the current note
    const note = await this.getClinicalNote(noteId);
    if (!note) {
      throw new Error("Note not found");
    }
    
    // Create de-identified data when sharing or making public
    let updateValues: any = { 
      visibility: updateData.visibility,
      updatedAt: new Date()
    };
    
    // Only create de-identified versions when note is being made public or shared
    if (updateData.visibility === "public" || updateData.visibility === "shared") {
      // If de-identified data not provided, generate it
      if (!updateData.condition) {
        updateValues.condition = extractCondition(note);
      } else {
        updateValues.condition = updateData.condition;
      }
      
      if (!updateData.ageRange) {
        updateValues.ageRange = calculateAgeRange(note.dateOfBirth);
      } else {
        updateValues.ageRange = updateData.ageRange;
      }
      
      if (!updateData.deIdentifiedNote) {
        updateValues.deIdentifiedNote = deIdentifyNote(note);
      } else {
        updateValues.deIdentifiedNote = updateData.deIdentifiedNote;
      }
    }
    
    const result = await db.update(clinicalNotes)
      .set(updateValues)
      .where(eq(clinicalNotes.id, noteId))
      .returning();
    
    return result[0];
  }
  
  // Comments Methods
  async createComment(comment: InsertComment): Promise<Comment> {
    const result = await db.insert(comments).values(comment).returning();
    return result[0];
  }
  
  async getNoteComments(noteId: number): Promise<Comment[]> {
    // Get top-level comments for a note (comments without a parent)
    return db.select()
      .from(comments)
      .where(
        and(
          eq(comments.noteId, noteId),
          isNull(comments.parentId)
        )
      )
      .orderBy(desc(comments.createdAt));
  }
  
  async getCommentReplies(commentId: number): Promise<Comment[]> {
    // Get replies to a specific comment
    return db.select()
      .from(comments)
      .where(eq(comments.parentId, commentId))
      .orderBy(comments.createdAt);
  }
  
  // Research Article Methods
  async getResearchArticle(id: number): Promise<ResearchArticle | undefined> {
    const results = await db.select().from(researchArticles).where(eq(researchArticles.id, id));
    return results.length > 0 ? results[0] : undefined;
  }
  
  async getResearchArticles(
    bodyPart?: string,
    page: number = 1,
    pageSize: number = 10,
    getAll: boolean = false
  ): Promise<{ articles: ResearchArticle[], total: number }> {
    // Build base query
    let query = db.select().from(researchArticles);
    
    // If bodyPart is provided and valid, filter by it
    if (bodyPart && Object.values(researchArticles.bodyPart.enumValues).includes(bodyPart)) {
      query = query.where(eq(researchArticles.bodyPart, bodyPart as any));
    }
    
    // First get total count for pagination metadata
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(researchArticles)
      .where(bodyPart ? eq(researchArticles.bodyPart, bodyPart as any) : undefined);
      
    const total = countResult[0]?.count || 0;
    
    // If getAll is true, return all articles without pagination
    if (getAll) {
      const articles = await query.orderBy(desc(researchArticles.publicationDate));
      return { articles, total };
    }
    
    // Otherwise calculate offset based on page and pageSize
    const offset = (page - 1) * pageSize;
    
    // Then get the paginated results
    const articles = await query
      .orderBy(desc(researchArticles.publicationDate))
      .limit(pageSize)
      .offset(offset);
    
    return { articles, total };
  }
  
  async createResearchArticle(article: InsertResearchArticle): Promise<ResearchArticle> {
    const result = await db.insert(researchArticles).values(article).returning();
    return result[0];
  }

  // User Membership Methods
  async updateUserMembership(userId: number, membershipTier: string, expiryDate: Date): Promise<User> {
    const result = await db.update(users)
      .set({
        membershipTier: membershipTier as any, // Cast to any due to enum type issues
        membershipExpiry: expiryDate
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }
  
  async updateStripeCustomerId(userId: number, customerId: string): Promise<User> {
    const result = await db.update(users)
      .set({
        stripeCustomerId: customerId
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }
  
  async updateStripeSubscriptionId(userId: number, subscriptionId: string): Promise<User> {
    const result = await db.update(users)
      .set({
        stripeSubscriptionId: subscriptionId
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }
  
  async updateUserStripeInfo(userId: number, data: { customerId: string, subscriptionId: string }): Promise<User> {
    const result = await db.update(users)
      .set({
        stripeCustomerId: data.customerId,
        stripeSubscriptionId: data.subscriptionId
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  // Subscription Plan Methods
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return db.select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.active, true))
      .orderBy(subscriptionPlans.id);
  }

  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    const results = await db.select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getSubscriptionPlanByTier(tier: string): Promise<SubscriptionPlan | undefined> {
    const results = await db.select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.tier, tier as any)); // Cast to any due to enum type issues
    return results.length > 0 ? results[0] : undefined;
  }

  // Payment Record Methods
  async createPaymentRecord(payment: InsertPaymentRecord): Promise<PaymentRecord> {
    const result = await db.insert(paymentRecords).values(payment).returning();
    return result[0];
  }

  async getUserPayments(userId: number): Promise<PaymentRecord[]> {
    return db.select()
      .from(paymentRecords)
      .where(eq(paymentRecords.userId, userId))
      .orderBy(desc(paymentRecords.paymentDate));
  }

  // Exercise Methods
  async getExercise(id: number): Promise<Exercise | undefined> {
    const result = await db.select().from(exercises).where(eq(exercises.id, id));
    return result[0];
  }
  
  async getExercises(bodyPart?: string, difficulty?: string, getAll: boolean = false): Promise<Exercise[]> {
    // Start with the base query
    let query = db.select().from(exercises);
    
    // Only apply filters if getAll is false
    if (!getAll) {
      // If bodyPart is provided and valid, filter by it
      if (bodyPart && bodyPartEnum.enumValues.includes(bodyPart as any)) {
        query = query.where(eq(exercises.bodyPart, bodyPart as typeof bodyPartEnum.enumValues[number]));
      }
      
      // If difficulty is provided and valid, filter by it
      if (difficulty && difficultyEnum.enumValues.includes(difficulty as any)) {
        query = query.where(eq(exercises.difficulty, difficulty as typeof difficultyEnum.enumValues[number]));
      }
    }
    
    // Execute the query with any applied filters
    return await query.orderBy(exercises.title);
  }
  
  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const result = await db.insert(exercises).values(exercise).returning();
    return result[0];
  }
  
  // Manual Therapy Technique methods
  async getManualTherapyTechnique(id: number): Promise<ManualTherapyTechnique | undefined> {
    const techniques = await db.select().from(manualTherapyTechniques).where(eq(manualTherapyTechniques.id, id)).limit(1);
    return techniques[0];
  }
  
  async getManualTherapyTechniques(bodyPart?: string): Promise<ManualTherapyTechnique[]> {
    if (bodyPart && bodyPart !== 'all') {
      const bodyPartValue = bodyPart as typeof bodyPartEnum.enumValues[number];
      return await db.select().from(manualTherapyTechniques).where(eq(manualTherapyTechniques.bodyPart, bodyPartValue)).orderBy(desc(manualTherapyTechniques.id));
    }
    
    return await db.select().from(manualTherapyTechniques).orderBy(desc(manualTherapyTechniques.id));
  }
  
  async createManualTherapyTechnique(technique: InsertManualTherapyTechnique): Promise<ManualTherapyTechnique> {
    const result = await db.insert(manualTherapyTechniques).values(technique).returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
