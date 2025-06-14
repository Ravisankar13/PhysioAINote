import {
  users,
  type User,
  type InsertUser,
  clinicalNotes,
  type ClinicalNote,
  type InsertClinicalNote,
  type UpdateNoteVisibility,
  comments,
  type Comment,
  type InsertComment,
  researchArticles,
  type ResearchArticle,
  type InsertResearchArticle,
  subscriptionPlans,
  type SubscriptionPlan,
  paymentRecords,
  type PaymentRecord,
  type InsertPaymentRecord,
  exercises,
  type Exercise,
  type InsertExercise,
  bodyPartEnum,
  difficultyEnum,
  patientSessions,
  type PatientSession,
  type InsertPatientSession,
  audioRecordings,
  type AudioRecording,
  type InsertAudioRecording,
  manualTherapyTechniques,
  type ManualTherapyTechnique,
  type InsertManualTherapyTechnique,
  virtualPatients,
  type VirtualPatient,
  type InsertVirtualPatient,
  sessionStatusEnum,
  sharedCases,
  type InsertSharedCase,
  type SharedCase,
  caseDiscussions,
  type InsertCaseDiscussion,
  type CaseDiscussion,
  caseTags,
  caseTagsMapping,
  caseUpvotes,
  discussionUpvotes,
  aiCaseStudies,
  type AICaseStudy,
  type InsertAICaseStudy,
  caseStudyAttempts,
  type CaseStudyAttempt,
  type InsertCaseStudyAttempt,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, isNull, sql } from "drizzle-orm";
import {
  calculateAgeRange,
  deIdentifyNote,
  extractCondition,
} from "./utilities/deIdentify";
import { patientSessionStorage } from "./patientSessionStorage";

export interface IStorage {
  // User Operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserCount(): Promise<number>;
  createUser(user: InsertUser): Promise<User>;
  updateUserMembership(
    userId: number,
    membershipTier: string,
    expiryDate: Date
  ): Promise<User>;
  updateStripeCustomerId(userId: number, customerId: string): Promise<User>;
  updateStripeSubscriptionId(
    userId: number,
    subscriptionId: string
  ): Promise<User>;
  updateUserStripeInfo(
    userId: number,
    data: { customerId: string; subscriptionId: string }
  ): Promise<User>;

  // Clinical Notes Operations
  getClinicalNote(
    id: number,
    currentUserId?: number
  ): Promise<ClinicalNote | undefined>;
  getClinicalNotes(currentUserId?: number): Promise<ClinicalNote[]>;
  getUserNotes(userId: number): Promise<ClinicalNote[]>;
  createClinicalNote(note: InsertClinicalNote): Promise<ClinicalNote>;
  updateNoteVisibility(
    noteId: number,
    updateData: UpdateNoteVisibility
  ): Promise<ClinicalNote>;

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
    articles: ResearchArticle[];
    total: number;
  }>;
  getResearchArticlesByBodyPart(
    bodyPart: string,
    page?: number,
    pageSize?: number
  ): Promise<{
    articles: ResearchArticle[];
    total: number;
  }>;
  createResearchArticle(
    article: InsertResearchArticle
  ): Promise<ResearchArticle>;

  // AI Case Study Operations
  getAICaseStudy(id: number): Promise<AICaseStudy | undefined>;
  getUserAICaseStudies(userId: number): Promise<AICaseStudy[]>;
  getAICaseStudies(
    bodyPart?: string,
    complexity?: string,
    page?: number,
    pageSize?: number
  ): Promise<{
    caseStudies: AICaseStudy[];
    total: number;
  }>;
  createAICaseStudy(caseStudy: InsertAICaseStudy): Promise<AICaseStudy>;

  // Case Study Attempt Operations
  getCaseStudyAttempt(id: number): Promise<CaseStudyAttempt | undefined>;
  getUserAttemptsForCase(
    userId: number,
    caseStudyId: number
  ): Promise<CaseStudyAttempt[]>;
  createCaseStudyAttempt(
    attempt: InsertCaseStudyAttempt
  ): Promise<CaseStudyAttempt>;
  updateCaseStudyAttemptFeedback(
    id: number,
    feedback: any,
    accuracy: number
  ): Promise<CaseStudyAttempt>;

  // Exercise Operations
  getExercise(id: number): Promise<Exercise | undefined>;
  getExercises(bodyPart?: string, difficulty?: string): Promise<Exercise[]>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;

  // Manual Therapy Technique Operations
  getManualTherapyTechnique(
    id: number
  ): Promise<ManualTherapyTechnique | undefined>;
  getManualTherapyTechniques(
    bodyPart?: string
  ): Promise<ManualTherapyTechnique[]>;
  createManualTherapyTechnique(
    technique: InsertManualTherapyTechnique
  ): Promise<ManualTherapyTechnique>;

  // Subscription Operations
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  getSubscriptionPlanByTier(
    tier: string
  ): Promise<SubscriptionPlan | undefined>;

  // Payment Operations
  createPaymentRecord(payment: InsertPaymentRecord): Promise<PaymentRecord>;
  getUserPayments(userId: number): Promise<PaymentRecord[]>;

  // Patient Session Operations
  getPatientSession(id: number): Promise<PatientSession | undefined>;
  getUserPatientSessions(userId: number): Promise<PatientSession[]>;
  createPatientSession(session: InsertPatientSession): Promise<PatientSession>;
  updatePatientSession(
    id: number,
    data: Partial<InsertPatientSession>
  ): Promise<PatientSession>;
  updatePatientSessionStatus(
    id: number,
    status: string
  ): Promise<PatientSession>;
  updatePatientSessionTranscript(
    id: number,
    transcriptUrl: string,
    transcriptS3Uri: string
  ): Promise<PatientSession>;
  updatePatientSessionSoapNote(
    id: number,
    soapNote: any
  ): Promise<PatientSession>;

  // Audio Recording Operations
  createAudioRecording(
    recording: InsertAudioRecording
  ): Promise<AudioRecording>;
  getSessionAudioRecordings(sessionId: number): Promise<AudioRecording[]>;

  // Virtual Patient Operations
  getVirtualPatient(id: number): Promise<VirtualPatient | undefined>;
  getUserVirtualPatients(userId: number): Promise<VirtualPatient[]>;
  createVirtualPatient(
    virtualPatient: InsertVirtualPatient
  ): Promise<VirtualPatient>;
  updateVirtualPatient(
    id: number,
    data: Partial<VirtualPatient>
  ): Promise<VirtualPatient>;
  updateVirtualPatientDiagnosis(
    id: number,
    diagnosis: string,
    differentialDiagnosis: any,
    treatmentOptions: any,
    relatedArticleIds: any
  ): Promise<VirtualPatient>;

  // Peer Knowledge Exchange - Shared Cases Operations
  getSharedCase(id: number): Promise<SharedCase | undefined>;
  getSharedCases(
    bodyPart?: string,
    expertiseLevel?: string,
    complexityLevel?: string,
    searchTerm?: string,
    page?: number,
    pageSize?: number
  ): Promise<{
    cases: SharedCase[];
    total: number;
  }>;
  getUserSharedCases(userId: number): Promise<SharedCase[]>;
  createSharedCase(sharedCase: InsertSharedCase): Promise<SharedCase>;
  updateSharedCase(id: number, data: Partial<SharedCase>): Promise<SharedCase>;
  incrementCaseViews(id: number): Promise<void>;
  upvoteCase(
    caseId: number,
    userId: number
  ): Promise<{ success: boolean; upvotes: number }>;
  removeUpvoteCase(
    caseId: number,
    userId: number
  ): Promise<{ success: boolean; upvotes: number }>;

  // Peer Knowledge Exchange - Case Discussions Operations
  getCaseDiscussion(id: number): Promise<CaseDiscussion | undefined>;
  getCaseDiscussions(caseId: number): Promise<CaseDiscussion[]>;
  getDiscussionReplies(discussionId: number): Promise<CaseDiscussion[]>;
  createCaseDiscussion(
    discussion: InsertCaseDiscussion
  ): Promise<CaseDiscussion>;
  updateCaseDiscussion(id: number, content: string): Promise<CaseDiscussion>;
  upvoteDiscussion(
    discussionId: number,
    userId: number
  ): Promise<{ success: boolean; upvotes: number }>;
  removeUpvoteDiscussion(
    discussionId: number,
    userId: number
  ): Promise<{ success: boolean; upvotes: number }>;

  // Peer Knowledge Exchange - Tags Operations
  getCaseTag(id: number): Promise<typeof caseTags.$inferSelect | undefined>;
  getCaseTags(): Promise<(typeof caseTags.$inferSelect)[]>;
  createCaseTag(
    name: string,
    category: string,
    color: string
  ): Promise<typeof caseTags.$inferSelect>;
  addCaseTag(caseId: number, tagId: number): Promise<void>;
  removeCaseTag(caseId: number, tagId: number): Promise<void>;
  getCaseTagsByCategory(
    category: string
  ): Promise<(typeof caseTags.$inferSelect)[]>;
}

export class DatabaseStorage implements IStorage {
  // Patient Session methods, using patientSessionStorage
  async getPatientSession(id: number): Promise<PatientSession | undefined> {
    return await patientSessionStorage.getPatientSession(id);
  }

  async getUserPatientSessions(userId: number): Promise<PatientSession[]> {
    return await patientSessionStorage.getUserPatientSessions(userId);
  }

  async createPatientSession(
    session: InsertPatientSession
  ): Promise<PatientSession> {
    return await patientSessionStorage.createPatientSession(session);
  }

  async updatePatientSession(
    id: number,
    data: Partial<InsertPatientSession>
  ): Promise<PatientSession> {
    return await patientSessionStorage.updatePatientSession(id, data);
  }

  async updatePatientSessionStatus(
    id: number,
    status: string
  ): Promise<PatientSession> {
    return await patientSessionStorage.updatePatientSessionStatus(id, status);
  }

  async updatePatientSessionTranscript(
    id: number,
    transcriptUrl: string,
    transcriptS3Uri: string
  ): Promise<PatientSession> {
    return await patientSessionStorage.updatePatientSessionTranscript(
      id,
      transcriptUrl,
      transcriptS3Uri
    );
  }

  async updatePatientSessionSoapNote(
    id: number,
    soapNote: any
  ): Promise<PatientSession> {
    return await patientSessionStorage.updatePatientSessionSoapNote(
      id,
      soapNote
    );
  }

  // Audio Recording methods, using patientSessionStorage
  async createAudioRecording(
    recording: InsertAudioRecording
  ): Promise<AudioRecording> {
    return await patientSessionStorage.createAudioRecording(recording);
  }

  async getSessionAudioRecordings(
    sessionId: number
  ): Promise<AudioRecording[]> {
    return await patientSessionStorage.getSessionAudioRecordings(sessionId);
  }
  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return results.length > 0 ? results[0] : undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.id);
  }

  async getUserCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    return result[0]?.count || 0;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Clinical Notes Methods
  async getClinicalNote(
    id: number,
    currentUserId?: number
  ): Promise<ClinicalNote | undefined> {
    const results = await db
      .select()
      .from(clinicalNotes)
      .where(eq(clinicalNotes.id, id));

    if (results.length === 0) {
      return undefined;
    }

    const note = results[0];

    // If the user is viewing their own note, return the full note
    if (currentUserId && note.userId === currentUserId) {
      return note;
    }

    // For public or shared notes viewed by other users, ensure we're returning a de-identified version
    if (note.visibility === "public" || note.visibility === "shared") {
      // If the de-identified fields aren't populated yet, let's create them
      if (!note.deIdentifiedNote || !note.ageRange || !note.condition) {
        // Generate the de-identification data
        const deIdentifiedFields = {
          deIdentifiedNote: deIdentifyNote(note),
          ageRange: calculateAgeRange(note.dateOfBirth),
          condition: extractCondition(note),
        };

        // Update the note in the database with the de-identified data
        await db
          .update(clinicalNotes)
          .set(deIdentifiedFields)
          .where(eq(clinicalNotes.id, id));

        // Add the fields to the return value
        return {
          ...note,
          ...deIdentifiedFields,
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
      return db
        .select()
        .from(clinicalNotes)
        .where(eq(clinicalNotes.visibility, "public"))
        .orderBy(desc(clinicalNotes.createdAt));
    }

    // If user ID is provided, return:
    // 1. public notes (accessible to everyone)
    // 2. shared notes (accessible to all authenticated users)
    // 3. user's own notes (regardless of visibility)
    return db
      .select()
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
    return db
      .select()
      .from(clinicalNotes)
      .where(eq(clinicalNotes.userId, userId))
      .orderBy(desc(clinicalNotes.createdAt));
  }

  async createClinicalNote(note: InsertClinicalNote): Promise<ClinicalNote> {
    const result = await db.insert(clinicalNotes).values(note).returning();
    return result[0];
  }

  async updateNoteVisibility(
    noteId: number,
    updateData: UpdateNoteVisibility
  ): Promise<ClinicalNote> {
    // First get the current note
    const note = await this.getClinicalNote(noteId);
    if (!note) {
      throw new Error("Note not found");
    }

    // Create de-identified data when sharing or making public
    let updateValues: any = {
      visibility: updateData.visibility,
      updatedAt: new Date(),
    };

    // Only create de-identified versions when note is being made public or shared
    if (
      updateData.visibility === "public" ||
      updateData.visibility === "shared"
    ) {
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

    const result = await db
      .update(clinicalNotes)
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
    return db
      .select()
      .from(comments)
      .where(and(eq(comments.noteId, noteId), isNull(comments.parentId)))
      .orderBy(desc(comments.createdAt));
  }

  async getCommentReplies(commentId: number): Promise<Comment[]> {
    // Get replies to a specific comment
    return db
      .select()
      .from(comments)
      .where(eq(comments.parentId, commentId))
      .orderBy(comments.createdAt);
  }

  // Research Article Methods
  async getResearchArticle(id: number): Promise<ResearchArticle | undefined> {
    const results = await db
      .select()
      .from(researchArticles)
      .where(eq(researchArticles.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  // Get multiple research articles by their IDs
  async getResearchArticlesByIds(ids: number[]): Promise<ResearchArticle[]> {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return [];
    }

    // Filter out any non-numeric values to prevent SQL errors
    const validIds = ids.filter((id) => typeof id === "number" && !isNaN(id));

    if (validIds.length === 0) {
      return [];
    }

    // Create a SQL IN condition for the IDs
    const results = await db
      .select()
      .from(researchArticles)
      .where(sql`${researchArticles.id} IN (${validIds.join(",")})`)
      .orderBy(desc(researchArticles.publicationDate));

    return results;
  }

  async getResearchArticles(
    bodyPart?: string,
    page: number = 1,
    pageSize: number = 10,
    getAll: boolean = false
  ): Promise<{ articles: ResearchArticle[]; total: number }> {
    // Build base query
    let query = db.select().from(researchArticles);

    // If bodyPart is provided and valid, filter by it
    if (
      bodyPart &&
      Object.values(researchArticles.bodyPart.enumValues).includes(
        bodyPart as any
      )
    ) {
      query = query.where(eq(researchArticles.bodyPart, bodyPart as any));
    }

    // First get total count for pagination metadata
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(researchArticles)
      .where(
        bodyPart ? eq(researchArticles.bodyPart, bodyPart as any) : undefined
      );

    const total = countResult[0]?.count || 0;

    // If getAll is true, return all articles without pagination
    if (getAll) {
      const articles = await query.orderBy(
        desc(researchArticles.publicationDate)
      );
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

  async getResearchArticlesByBodyPart(
    bodyPart: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ articles: ResearchArticle[]; total: number }> {
    // This is essentially the same as getResearchArticles but with bodyPart required
    return this.getResearchArticles(bodyPart, page, pageSize);
  }

  async createResearchArticle(
    article: InsertResearchArticle
  ): Promise<ResearchArticle> {
    const result = await db
      .insert(researchArticles)
      .values(article)
      .returning();
    return result[0];
  }

  // User Membership Methods
  async updateUserMembership(
    userId: number,
    membershipTier: string,
    expiryDate: Date
  ): Promise<User> {
    const result = await db
      .update(users)
      .set({
        membershipTier: membershipTier as any, // Cast to any due to enum type issues
        membershipExpiry: expiryDate,
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async updateStripeCustomerId(
    userId: number,
    customerId: string
  ): Promise<User> {
    const result = await db
      .update(users)
      .set({
        stripeCustomerId: customerId,
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async updateStripeSubscriptionId(
    userId: number,
    subscriptionId: string
  ): Promise<User> {
    const result = await db
      .update(users)
      .set({
        stripeSubscriptionId: subscriptionId,
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async updateUserStripeInfo(
    userId: number,
    data: { customerId: string; subscriptionId: string }
  ): Promise<User> {
    const result = await db
      .update(users)
      .set({
        stripeCustomerId: data.customerId,
        stripeSubscriptionId: data.subscriptionId,
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  // Subscription Plan Methods
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.active, true))
      .orderBy(subscriptionPlans.id);
  }

  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    const results = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getSubscriptionPlanByTier(
    tier: string
  ): Promise<SubscriptionPlan | undefined> {
    const results = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.tier, tier as any)); // Cast to any due to enum type issues
    return results.length > 0 ? results[0] : undefined;
  }

  // Payment Record Methods
  async createPaymentRecord(
    payment: InsertPaymentRecord
  ): Promise<PaymentRecord> {
    const result = await db.insert(paymentRecords).values(payment).returning();
    return result[0];
  }

  async getUserPayments(userId: number): Promise<PaymentRecord[]> {
    return db
      .select()
      .from(paymentRecords)
      .where(eq(paymentRecords.userId, userId))
      .orderBy(desc(paymentRecords.paymentDate));
  }

  // Exercise Methods
  async getExercise(id: number): Promise<Exercise | undefined> {
    const result = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, id));
    return result[0];
  }

  async getExercises(
    bodyPart?: string,
    difficulty?: string,
    getAll: boolean = false
  ): Promise<Exercise[]> {
    // Start with the base query
    let query = db.select().from(exercises);

    // Only apply filters if getAll is false
    if (!getAll) {
      // If bodyPart is provided and valid, filter by it
      if (bodyPart && bodyPartEnum.enumValues.includes(bodyPart as any)) {
        query = query.where(
          eq(
            exercises.bodyPart,
            bodyPart as (typeof bodyPartEnum.enumValues)[number]
          )
        );
      }

      // If difficulty is provided and valid, filter by it
      if (difficulty && difficultyEnum.enumValues.includes(difficulty as any)) {
        query = query.where(
          eq(
            exercises.difficulty,
            difficulty as (typeof difficultyEnum.enumValues)[number]
          )
        );
      }
    }

    // Execute the query with any applied filters
    return await query.orderBy(exercises.title);
  }

  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const result = await db.insert(exercises).values(exercise).returning();
    return result[0];
  }

  async getExercisesBySearchTerm(searchTerm: string): Promise<Exercise[]> {
    if (!searchTerm || searchTerm.trim() === "") {
      return [];
    }

    const query = `%${searchTerm.toLowerCase()}%`;

    return await db
      .select()
      .from(exercises)
      .where(
        sql`LOWER(${exercises.title}) LIKE ${query} OR 
            LOWER(${exercises.description}) LIKE ${query} OR
            LOWER(${exercises.targetMuscles}) LIKE ${query}`
      )
      .orderBy(exercises.title);
  }

  // Manual Therapy Technique methods
  async getManualTherapyTechnique(
    id: number
  ): Promise<ManualTherapyTechnique | undefined> {
    const techniques = await db
      .select()
      .from(manualTherapyTechniques)
      .where(eq(manualTherapyTechniques.id, id))
      .limit(1);
    return techniques[0];
  }

  async getManualTherapyTechniques(
    bodyPart?: string
  ): Promise<ManualTherapyTechnique[]> {
    if (bodyPart && bodyPart !== "all") {
      const bodyPartValue =
        bodyPart as (typeof bodyPartEnum.enumValues)[number];
      return await db
        .select()
        .from(manualTherapyTechniques)
        .where(eq(manualTherapyTechniques.bodyPart, bodyPartValue))
        .orderBy(desc(manualTherapyTechniques.id));
    }

    return await db
      .select()
      .from(manualTherapyTechniques)
      .orderBy(desc(manualTherapyTechniques.id));
  }

  async createManualTherapyTechnique(
    technique: InsertManualTherapyTechnique
  ): Promise<ManualTherapyTechnique> {
    const result = await db
      .insert(manualTherapyTechniques)
      .values(technique)
      .returning();
    return result[0];
  }

  // AI Case Study Methods
  async getAICaseStudy(id: number): Promise<AICaseStudy | undefined> {
    try {
      const results = await db
        .select()
        .from(aiCaseStudies)
        .where(eq(aiCaseStudies.id, id));
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error("Error fetching AI case study:", error);
      return undefined;
    }
  }

  async getUserAICaseStudies(userId: number): Promise<AICaseStudy[]> {
    try {
      return await db
        .select()
        .from(aiCaseStudies)
        .where(eq(aiCaseStudies.userId, userId))
        .orderBy(desc(aiCaseStudies.createdAt));
    } catch (error) {
      console.error("Error fetching user AI case studies:", error);
      return [];
    }
  }

  async getAICaseStudies(
    bodyPart?: string,
    complexity?: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{
    caseStudies: AICaseStudy[];
    total: number;
  }> {
    try {
      // Initialize the query
      let query = db.select().from(aiCaseStudies);
      let countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(aiCaseStudies);

      // Apply filters if provided
      if (bodyPart) {
        query = query.where(eq(aiCaseStudies.bodyPart, bodyPart));
        countQuery = countQuery.where(eq(aiCaseStudies.bodyPart, bodyPart));
      }

      if (complexity) {
        query = query.where(eq(aiCaseStudies.complexity, complexity));
        countQuery = countQuery.where(eq(aiCaseStudies.complexity, complexity));
      }

      // Execute both queries
      const offset = (page - 1) * pageSize;
      const [caseStudies, countResult] = await Promise.all([
        query
          .orderBy(desc(aiCaseStudies.createdAt))
          .limit(pageSize)
          .offset(offset),
        countQuery,
      ]);

      return {
        caseStudies,
        total: Number(countResult[0]?.count || 0),
      };
    } catch (error) {
      console.error("Error fetching AI case studies:", error);
      return { caseStudies: [], total: 0 };
    }
  }

  async createAICaseStudy(caseStudy: InsertAICaseStudy): Promise<AICaseStudy> {
    try {
      const result = await db
        .insert(aiCaseStudies)
        .values(caseStudy)
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error creating AI case study:", error);
      throw error;
    }
  }

  // Case Study Attempt Methods
  async getCaseStudyAttempt(id: number): Promise<CaseStudyAttempt | undefined> {
    try {
      const results = await db
        .select()
        .from(caseStudyAttempts)
        .where(eq(caseStudyAttempts.id, id));
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error("Error fetching case study attempt:", error);
      return undefined;
    }
  }

  async getUserAttemptsForCase(
    userId: number,
    caseStudyId: number
  ): Promise<CaseStudyAttempt[]> {
    try {
      return await db
        .select()
        .from(caseStudyAttempts)
        .where(
          and(
            eq(caseStudyAttempts.userId, userId),
            eq(caseStudyAttempts.caseStudyId, caseStudyId)
          )
        )
        .orderBy(desc(caseStudyAttempts.createdAt));
    } catch (error) {
      console.error("Error fetching user attempts for case:", error);
      return [];
    }
  }

  async createCaseStudyAttempt(
    attempt: InsertCaseStudyAttempt
  ): Promise<CaseStudyAttempt> {
    try {
      const result = await db
        .insert(caseStudyAttempts)
        .values(attempt)
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error creating case study attempt:", error);
      throw error;
    }
  }

  async updateCaseStudyAttemptFeedback(
    id: number,
    feedback: any,
    accuracy: number
  ): Promise<CaseStudyAttempt> {
    try {
      const result = await db
        .update(caseStudyAttempts)
        .set({
          feedback,
          overallAccuracy: accuracy,
          completed: true,
          updatedAt: new Date(),
        })
        .where(eq(caseStudyAttempts.id, id))
        .returning();

      return result[0];
    } catch (error) {
      console.error("Error updating case study attempt feedback:", error);
      throw error;
    }
  }

  // Virtual Patient Methods
  async getVirtualPatient(id: number): Promise<VirtualPatient | undefined> {
    try {
      const result = await db
        .select()
        .from(virtualPatients)
        .where(eq(virtualPatients.id, id));
      return result[0];
    } catch (error) {
      console.error("Error fetching virtual patient:", error);
      throw error;
    }
  }

  async getUserVirtualPatients(userId: number): Promise<VirtualPatient[]> {
    try {
      const result = await db
        .select()
        .from(virtualPatients)
        .where(eq(virtualPatients.userId, userId))
        .orderBy(desc(virtualPatients.createdAt));
      return result;
    } catch (error) {
      console.error("Error fetching user virtual patients:", error);
      throw error;
    }
  }

  async createVirtualPatient(
    virtualPatient: InsertVirtualPatient
  ): Promise<VirtualPatient> {
    try {
      const result = await db
        .insert(virtualPatients)
        .values(virtualPatient)
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error creating virtual patient:", error);
      throw error;
    }
  }

  async updateVirtualPatient(
    id: number,
    data: Partial<VirtualPatient>
  ): Promise<VirtualPatient> {
    try {
      const result = await db
        .update(virtualPatients)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(virtualPatients.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error updating virtual patient:", error);
      throw error;
    }
  }

  async updateVirtualPatientDiagnosis(
    id: number,
    diagnosis: string,
    differentialDiagnosis: any,
    treatmentOptions: any,
    relatedArticleIds: any,
    hasBeenEdited: boolean = false
  ): Promise<VirtualPatient> {
    try {
      const result = await db
        .update(virtualPatients)
        .set({
          diagnosis,
          differentialDiagnosis,
          treatmentOptions,
          relatedArticleIds,
          hasBeenEdited,
          updatedAt: new Date(),
        })
        .where(eq(virtualPatients.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error updating virtual patient diagnosis:", error);
      throw error;
    }
  }

  // Peer Knowledge Exchange - Shared Cases Operations
  async getSharedCase(id: number): Promise<SharedCase | undefined> {
    try {
      const result = await db
        .select()
        .from(sharedCases)
        .where(eq(sharedCases.id, id));

      return result[0];
    } catch (error) {
      console.error("Error getting shared case:", error);
      throw error;
    }
  }

  async getSharedCases(
    bodyPart?: string,
    expertiseLevel?: string,
    complexityLevel?: string,
    searchTerm?: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{
    cases: SharedCase[];
    total: number;
  }> {
    try {
      const offset = (page - 1) * pageSize;

      let query = db
        .select()
        .from(sharedCases)
        .where(eq(sharedCases.isApproved, true))
        .orderBy(desc(sharedCases.createdAt));

      if (bodyPart && bodyPart !== "all") {
        query = query.where(eq(sharedCases.bodyPart, bodyPart));
      }

      if (expertiseLevel) {
        query = query.where(eq(sharedCases.expertiseLevel, expertiseLevel));
      }

      if (complexityLevel) {
        query = query.where(eq(sharedCases.complexityLevel, complexityLevel));
      }

      if (searchTerm) {
        query = query.where(
          or(
            sql`${sharedCases.title} ILIKE ${"%" + searchTerm + "%"}`,
            sql`${sharedCases.description} ILIKE ${"%" + searchTerm + "%"}`,
            sql`${sharedCases.condition} ILIKE ${"%" + searchTerm + "%"}`,
            sql`${sharedCases.presentingComplaints} ILIKE ${
              "%" + searchTerm + "%"
            }`
          )
        );
      }

      const result = await query.limit(pageSize).offset(offset);

      // Count total for pagination
      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(sharedCases)
        .where(eq(sharedCases.isApproved, true));

      if (bodyPart && bodyPart !== "all") {
        countQuery.where(eq(sharedCases.bodyPart, bodyPart));
      }

      if (expertiseLevel) {
        countQuery.where(eq(sharedCases.expertiseLevel, expertiseLevel));
      }

      if (complexityLevel) {
        countQuery.where(eq(sharedCases.complexityLevel, complexityLevel));
      }

      if (searchTerm) {
        countQuery.where(
          or(
            sql`${sharedCases.title} ILIKE ${"%" + searchTerm + "%"}`,
            sql`${sharedCases.description} ILIKE ${"%" + searchTerm + "%"}`,
            sql`${sharedCases.condition} ILIKE ${"%" + searchTerm + "%"}`,
            sql`${sharedCases.presentingComplaints} ILIKE ${
              "%" + searchTerm + "%"
            }`
          )
        );
      }

      const totalResult = await countQuery;
      const total = totalResult[0]?.count || 0;

      return {
        cases: result,
        total,
      };
    } catch (error) {
      console.error("Error getting shared cases:", error);
      throw error;
    }
  }

  async getUserSharedCases(userId: number): Promise<SharedCase[]> {
    try {
      const result = await db
        .select()
        .from(sharedCases)
        .where(eq(sharedCases.userId, userId))
        .orderBy(desc(sharedCases.createdAt));

      return result;
    } catch (error) {
      console.error("Error getting user shared cases:", error);
      throw error;
    }
  }

  async createSharedCase(sharedCase: InsertSharedCase): Promise<SharedCase> {
    try {
      const result = await db
        .insert(sharedCases)
        .values(sharedCase)
        .returning();

      return result[0];
    } catch (error) {
      console.error("Error creating shared case:", error);
      throw error;
    }
  }

  async updateSharedCase(
    id: number,
    data: Partial<SharedCase>
  ): Promise<SharedCase> {
    try {
      const result = await db
        .update(sharedCases)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(sharedCases.id, id))
        .returning();

      return result[0];
    } catch (error) {
      console.error("Error updating shared case:", error);
      throw error;
    }
  }

  async incrementCaseViews(id: number): Promise<void> {
    try {
      await db
        .update(sharedCases)
        .set({
          views: sql`${sharedCases.views} + 1`,
        })
        .where(eq(sharedCases.id, id));
    } catch (error) {
      console.error("Error incrementing case views:", error);
      throw error;
    }
  }

  async upvoteCase(
    caseId: number,
    userId: number
  ): Promise<{ success: boolean; upvotes: number }> {
    try {
      // Check if user has already upvoted
      const existingUpvote = await db
        .select()
        .from(caseUpvotes)
        .where(
          and(eq(caseUpvotes.caseId, caseId), eq(caseUpvotes.userId, userId))
        );

      if (existingUpvote.length > 0) {
        return { success: false, upvotes: 0 };
      }

      // Add the upvote
      await db.insert(caseUpvotes).values({
        caseId,
        userId,
      });

      // Increment the upvote count
      await db
        .update(sharedCases)
        .set({
          upvotes: sql`${sharedCases.upvotes} + 1`,
        })
        .where(eq(sharedCases.id, caseId));

      // Get the new upvote count
      const updatedCase = await this.getSharedCase(caseId);
      return { success: true, upvotes: updatedCase?.upvotes || 0 };
    } catch (error) {
      console.error("Error upvoting case:", error);
      throw error;
    }
  }

  async getCaseTagsByCategory(
    category: string
  ): Promise<(typeof caseTags.$inferSelect)[]> {
    try {
      const result = await db
        .select()
        .from(caseTags)
        .where(eq(caseTags.category, category))
        .orderBy(caseTags.name);

      return result;
    } catch (error) {
      console.error("Error getting case tags by category:", error);
      return [];
    }
  }

  async removeUpvoteCase(
    caseId: number,
    userId: number
  ): Promise<{ success: boolean; upvotes: number }> {
    try {
      // Check if the upvote exists
      const existing = await db
        .select()
        .from(caseUpvotes)
        .where(
          and(eq(caseUpvotes.caseId, caseId), eq(caseUpvotes.userId, userId))
        )
        .limit(1);

      if (existing.length > 0) {
        // Remove the upvote
        await db
          .delete(caseUpvotes)
          .where(
            and(eq(caseUpvotes.caseId, caseId), eq(caseUpvotes.userId, userId))
          );

        // Decrement the upvote count on the case
        await db
          .update(sharedCases)
          .set({
            upvotes: sql`${sharedCases.upvotes} - 1`,
          })
          .where(eq(sharedCases.id, caseId));
      }

      // Get the updated upvote count
      const [updatedCase] = await db
        .select({
          upvotes: sharedCases.upvotes,
        })
        .from(sharedCases)
        .where(eq(sharedCases.id, caseId));

      return {
        success: true,
        upvotes: updatedCase.upvotes,
      };
    } catch (error) {
      console.error("Error removing case upvote:", error);
      return { success: false, upvotes: 0 };
    }
  }

  // Peer Knowledge Exchange - Case Discussions Operations
  async getCaseDiscussion(id: number): Promise<CaseDiscussion | undefined> {
    try {
      const result = await db
        .select()
        .from(caseDiscussions)
        .where(eq(caseDiscussions.id, id))
        .limit(1);

      return result[0];
    } catch (error) {
      console.error("Error getting case discussion:", error);
      return undefined;
    }
  }

  async getCaseDiscussions(caseId: number): Promise<CaseDiscussion[]> {
    try {
      const result = await db
        .select()
        .from(caseDiscussions)
        .where(
          and(
            eq(caseDiscussions.caseId, caseId),
            isNull(caseDiscussions.parentId)
          )
        )
        .orderBy(desc(caseDiscussions.createdAt));

      return result;
    } catch (error) {
      console.error("Error getting case discussions:", error);
      return [];
    }
  }

  async getDiscussionReplies(discussionId: number): Promise<CaseDiscussion[]> {
    try {
      const result = await db
        .select()
        .from(caseDiscussions)
        .where(eq(caseDiscussions.parentId, discussionId))
        .orderBy(caseDiscussions.createdAt);

      return result;
    } catch (error) {
      console.error("Error getting discussion replies:", error);
      return [];
    }
  }

  async createCaseDiscussion(
    discussion: InsertCaseDiscussion
  ): Promise<CaseDiscussion> {
    try {
      const [result] = await db
        .insert(caseDiscussions)
        .values(discussion)
        .returning();

      return result;
    } catch (error) {
      console.error("Error creating case discussion:", error);
      throw error;
    }
  }

  async updateCaseDiscussion(
    id: number,
    content: string
  ): Promise<CaseDiscussion> {
    try {
      const [result] = await db
        .update(caseDiscussions)
        .set({
          content,
          updatedAt: new Date(),
          isEdited: true,
        })
        .where(eq(caseDiscussions.id, id))
        .returning();

      return result;
    } catch (error) {
      console.error("Error updating case discussion:", error);
      throw error;
    }
  }

  async upvoteDiscussion(
    discussionId: number,
    userId: number
  ): Promise<{ success: boolean; upvotes: number }> {
    try {
      // Check if the user has already upvoted this discussion
      const existing = await db
        .select()
        .from(discussionUpvotes)
        .where(
          and(
            eq(discussionUpvotes.discussionId, discussionId),
            eq(discussionUpvotes.userId, userId)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        // Add the upvote
        await db.insert(discussionUpvotes).values({
          discussionId,
          userId,
          createdAt: new Date(),
        });

        // Increment the upvote count on the discussion
        await db
          .update(caseDiscussions)
          .set({
            upvotes: sql`${caseDiscussions.upvotes} + 1`,
          })
          .where(eq(caseDiscussions.id, discussionId));
      }

      // Get the updated upvote count
      const [updatedDiscussion] = await db
        .select({
          upvotes: caseDiscussions.upvotes,
        })
        .from(caseDiscussions)
        .where(eq(caseDiscussions.id, discussionId));

      return {
        success: true,
        upvotes: updatedDiscussion.upvotes,
      };
    } catch (error) {
      console.error("Error upvoting discussion:", error);
      return { success: false, upvotes: 0 };
    }
  }

  async removeUpvoteDiscussion(
    discussionId: number,
    userId: number
  ): Promise<{ success: boolean; upvotes: number }> {
    try {
      // Check if the upvote exists
      const existing = await db
        .select()
        .from(discussionUpvotes)
        .where(
          and(
            eq(discussionUpvotes.discussionId, discussionId),
            eq(discussionUpvotes.userId, userId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Remove the upvote
        await db
          .delete(discussionUpvotes)
          .where(
            and(
              eq(discussionUpvotes.discussionId, discussionId),
              eq(discussionUpvotes.userId, userId)
            )
          );

        // Decrement the upvote count on the discussion
        await db
          .update(caseDiscussions)
          .set({
            upvotes: sql`${caseDiscussions.upvotes} - 1`,
          })
          .where(eq(caseDiscussions.id, discussionId));
      }

      // Get the updated upvote count
      const [updatedDiscussion] = await db
        .select({
          upvotes: caseDiscussions.upvotes,
        })
        .from(caseDiscussions)
        .where(eq(caseDiscussions.id, discussionId));

      return {
        success: true,
        upvotes: updatedDiscussion.upvotes,
      };
    } catch (error) {
      console.error("Error removing discussion upvote:", error);
      return { success: false, upvotes: 0 };
    }
  }

  // Peer Knowledge Exchange - Tags Operations
  async getCaseTag(
    id: number
  ): Promise<typeof caseTags.$inferSelect | undefined> {
    try {
      const result = await db
        .select()
        .from(caseTags)
        .where(eq(caseTags.id, id))
        .limit(1);

      return result[0];
    } catch (error) {
      console.error("Error getting case tag:", error);
      return undefined;
    }
  }

  async getCaseTags(): Promise<(typeof caseTags.$inferSelect)[]> {
    try {
      const result = await db
        .select()
        .from(caseTags)
        .orderBy(caseTags.category, caseTags.name);

      return result;
    } catch (error) {
      console.error("Error getting case tags:", error);
      return [];
    }
  }

  async createCaseTag(
    name: string,
    category: string,
    color: string
  ): Promise<typeof caseTags.$inferSelect> {
    try {
      const [result] = await db
        .insert(caseTags)
        .values({
          name,
          category,
          color,
          createdAt: new Date(),
        })
        .returning();

      return result;
    } catch (error) {
      console.error("Error creating case tag:", error);
      throw error;
    }
  }

  async addCaseTag(caseId: number, tagId: number): Promise<void> {
    try {
      // Check if the mapping already exists
      const existing = await db
        .select()
        .from(caseTagsMapping)
        .where(
          and(
            eq(caseTagsMapping.caseId, caseId),
            eq(caseTagsMapping.tagId, tagId)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(caseTagsMapping).values({
          caseId,
          tagId,
        });
      }
    } catch (error) {
      console.error("Error adding case tag:", error);
    }
  }

  async removeCaseTag(caseId: number, tagId: number): Promise<void> {
    try {
      await db
        .delete(caseTagsMapping)
        .where(
          and(
            eq(caseTagsMapping.caseId, caseId),
            eq(caseTagsMapping.tagId, tagId)
          )
        );
    } catch (error) {
      console.error("Error removing case tag:", error);
    }
  }
}

export const storage = new DatabaseStorage();
