import {
  users,
  type User,
  type InsertUser,
  clinicalNotes,
  type ClinicalNote,
  type InsertClinicalNote,
  type UpdateNoteVisibility,
  soapNotes,
  type SoapNote,
  type InsertSoapNote,
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
  researchPapers,
  type ResearchPaper,
  type InsertResearchPaper,
  caseStudyAttempts,
  type CaseStudyAttempt,
  type InsertCaseStudyAttempt,
  soapVirtualPatients,
  type SoapVirtualPatient,
  type InsertSoapVirtualPatient,
  continuousRecordingSessions,
  type ContinuousRecordingSession,
  type InsertContinuousRecordingSession,
  virtualPatientConfigs,
  type VirtualPatientConfig,
  type InsertVirtualPatientConfig,
  pathologyTemplates,
  type PathologyTemplate,
  type InsertPathologyTemplate,
  historicalCases,
  type HistoricalCase,
  type InsertHistoricalCase,
  caseSimilarities,
  type CaseSimilarity,
  type InsertCaseSimilarity,
  soapPatterns,
  type SoapPattern,
  type InsertSoapPattern,
  comparativeAnalyses,
  type ComparativeAnalysis,
  type InsertComparativeAnalysis,
  treatmentOutcomes,
  type TreatmentOutcome,
  generatedDocuments,
  type GeneratedDocument,
  type InsertGeneratedDocument,
  type InsertTreatmentOutcome,
  forumPosts,
  type ForumPost,
  type InsertForumPost,
  forumReplies,
  type ForumReply,
  type InsertForumReply,
  forumHelpfulVotes,
  type ForumHelpfulVote,
  type InsertForumHelpfulVote,
  forumSanitizationLogs,
  type ForumSanitizationLog,
  type InsertForumSanitizationLog,
  patientFingerprints,
  type PatientFingerprint,
  type InsertPatientFingerprint,
  continuousSessionNotes,
  type ContinuousSessionNote,
  type InsertContinuousSessionNote,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, isNull, sql, ilike, not } from "drizzle-orm";
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

  // Trial Management Operations
  startFreeTrial(userId: number): Promise<User>;
  getUserTrialStatus(userId: number): Promise<{
    hasUsedTrial: boolean;
    isOnTrial: boolean;
    trialDaysRemaining: number;
    trialEndDate: Date | null;
  }>;

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

  // SOAP Notes Operations
  getSoapNote(id: number): Promise<SoapNote | undefined>;
  getSoapNoteBySessionId(sessionId: string): Promise<SoapNote | undefined>;
  getSoapNotes(userId: number): Promise<SoapNote[]>;
  createSoapNote(note: InsertSoapNote): Promise<SoapNote>;
  updateSoapNote(id: number, note: Partial<InsertSoapNote>): Promise<SoapNote>;
  getActiveSoapSession(userId: number): Promise<SoapNote | undefined>;
  markPatientSwitch(sessionId: string): Promise<SoapNote>;

  // Comments Operations
  createComment(comment: InsertComment): Promise<Comment>;
  getNoteComments(noteId: number): Promise<Comment[]>;
  getCommentReplies(commentId: number): Promise<Comment[]>;

  // Research Article Operations
  getResearchArticle(id: number): Promise<ResearchArticle | undefined>;
  getResearchArticles(
    bodyPart?: string,
    page?: number,
    pageSize?: number,
    all?: boolean,
    search?: string,
    qualityFilter?: string
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
  updateResearchArticleAnalysis(
    id: number,
    analysisData: any
  ): Promise<ResearchArticle>;

  // Research Papers with AI Analysis Operations
  getResearchPaper(id: number): Promise<ResearchPaper | undefined>;
  getResearchPapers(
    bodyPart?: string,
    studyDesign?: string,
    evidenceLevel?: string,
    page?: number,
    pageSize?: number,
    search?: string
  ): Promise<{
    papers: ResearchPaper[];
    total: number;
  }>;
  getResearchPapersByBodyPart(
    bodyPart: string,
    page?: number,
    pageSize?: number
  ): Promise<{
    papers: ResearchPaper[];
    total: number;
  }>;
  createResearchPaper(paper: InsertResearchPaper): Promise<ResearchPaper>;
  bulkCreateResearchPapers(papers: InsertResearchPaper[]): Promise<ResearchPaper[]>;
  updateResearchPaper(id: number, updateData: Partial<InsertResearchPaper>): Promise<ResearchPaper>;
  deleteResearchPaper(id: number): Promise<void>;
  searchResearchPapers(query: string, filters?: {
    bodyPart?: string;
    evidenceLevel?: string;
    year?: number;
  }): Promise<ResearchPaper[]>;

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

  // Trial Management Operations
  startFreeTrial(userId: number): Promise<User>;
  getUserTrialStatus(userId: number): Promise<{
    hasUsedTrial: boolean;
    isOnTrial: boolean;
    trialDaysRemaining: number;
    trialEndDate: Date | null;
  }>;

  // SOAP Virtual Patient Operations
  getSoapVirtualPatient(id: number): Promise<SoapVirtualPatient | undefined>;
  getSoapVirtualPatientBySoapNote(soapNoteId: number): Promise<SoapVirtualPatient | undefined>;
  getUserSoapVirtualPatients(userId: number): Promise<SoapVirtualPatient[]>;
  createSoapVirtualPatient(virtualPatient: InsertSoapVirtualPatient): Promise<SoapVirtualPatient>;
  updateSoapVirtualPatient(id: number, data: Partial<InsertSoapVirtualPatient>): Promise<SoapVirtualPatient>;
  
  // Virtual Patient Config Operations
  getVirtualPatientConfig(id: number): Promise<VirtualPatientConfig | undefined>;
  getUserVirtualPatientConfigs(userId: number): Promise<VirtualPatientConfig[]>;
  getVirtualPatientConfigBySoapId(soapVirtualPatientId: number): Promise<VirtualPatientConfig | undefined>;
  createVirtualPatientConfig(config: InsertVirtualPatientConfig): Promise<VirtualPatientConfig>;
  updateVirtualPatientConfig(id: number, data: Partial<InsertVirtualPatientConfig>): Promise<VirtualPatientConfig>;
  deleteVirtualPatientConfig(id: number): Promise<void>;
  
  // Pathology Template Operations
  getPathologyTemplates(category?: string): Promise<PathologyTemplate[]>;
  getPathologyTemplate(id: number): Promise<PathologyTemplate | undefined>;
  createPathologyTemplate(template: InsertPathologyTemplate): Promise<PathologyTemplate>;
  updatePathologyTemplate(id: number, data: Partial<InsertPathologyTemplate>): Promise<PathologyTemplate>;
  deletePathologyTemplate(id: number): Promise<void>;
  
  // Comparative Case Analysis Operations
  createHistoricalCase(histCase: InsertHistoricalCase): Promise<HistoricalCase>;
  getHistoricalCase(id: number): Promise<HistoricalCase | undefined>;
  getSimilarCases(embedding: number[], threshold: number): Promise<HistoricalCase[]>;
  updateHistoricalCaseOutcomes(id: number, outcomes: any): Promise<HistoricalCase>;
  
  // Case Similarity Operations
  createCaseSimilarity(similarity: InsertCaseSimilarity): Promise<CaseSimilarity>;
  getCaseSimilarities(caseId: number): Promise<CaseSimilarity[]>;
  
  // SOAP Pattern Operations
  getSoapPatterns(conditionType: string, sectionType?: string): Promise<SoapPattern[]>;
  createSoapPattern(pattern: InsertSoapPattern): Promise<SoapPattern>;
  updateSoapPattern(id: number, data: Partial<InsertSoapPattern>): Promise<SoapPattern>;
  
  // Comparative Analysis Operations
  createComparativeAnalysis(analysis: InsertComparativeAnalysis): Promise<ComparativeAnalysis>;
  getComparativeAnalysis(soapNoteId?: number, conversationId?: number): Promise<ComparativeAnalysis | undefined>;
  getRecentAnalyses(userId: number, limit?: number): Promise<ComparativeAnalysis[]>;
  
  // Treatment Outcome Operations  
  createTreatmentOutcome(outcome: InsertTreatmentOutcome): Promise<TreatmentOutcome>;
  getTreatmentOutcomes(caseId?: number, soapNoteId?: number): Promise<TreatmentOutcome[]>;
  updateTreatmentOutcome(id: number, data: Partial<InsertTreatmentOutcome>): Promise<TreatmentOutcome>;
  
  // Forum Operations
  createForumPost(post: InsertForumPost): Promise<ForumPost>;
  getForumPost(id: number): Promise<ForumPost | undefined>;
  getForumPosts(params: {
    category?: string;
    bodyPart?: string;
    status?: string;
    authorId?: number;
    page: number;
    limit: number;
  }): Promise<{ posts: ForumPost[]; total: number }>;
  getUserForumPosts(userId: number): Promise<ForumPost[]>;
  updateForumPost(id: number, data: Partial<InsertForumPost>): Promise<ForumPost>;
  deleteForumPost(id: number): Promise<void>;
  incrementForumPostViewCount(id: number): Promise<void>;
  incrementForumPostHelpfulCount(id: number): Promise<void>;
  searchForumPosts(params: {
    query: string;
    category?: string;
    bodyPart?: string;
    hasRedFlags?: boolean;
  }): Promise<ForumPost[]>;
  
  // Forum Reply Operations
  createForumReply(reply: InsertForumReply): Promise<ForumReply>;
  getForumReplies(postId: number): Promise<ForumReply[]>;
  incrementForumReplyHelpfulCount(id: number): Promise<void>;
  
  // Forum Helpful Vote Operations
  createForumHelpfulVote(vote: InsertForumHelpfulVote): Promise<ForumHelpfulVote>;
  getForumHelpfulVote(userId: number, postId?: number, replyId?: number): Promise<ForumHelpfulVote | undefined>;
  
  // Forum Sanitization Log Operations
  createForumSanitizationLog(log: InsertForumSanitizationLog): Promise<ForumSanitizationLog>;

  // Patient Fingerprint Operations (Anonymous Follow-up Recognition)
  getPatientFingerprint(patientHash: string): Promise<PatientFingerprint | undefined>;
  createPatientFingerprint(fingerprint: InsertPatientFingerprint): Promise<PatientFingerprint>;
  updatePatientFingerprint(
    patientHash: string,
    visitCount: number,
    progressionMarker?: number
  ): Promise<PatientFingerprint>;
  findSimilarPatientFingerprints(patientHash: string): Promise<PatientFingerprint[]>;

  // Continuous Recording Session Operations
  createContinuousRecordingSession(data: InsertContinuousRecordingSession): Promise<ContinuousRecordingSession>;
  getContinuousRecordingSession(id: number): Promise<ContinuousRecordingSession | undefined>;
  getContinuousRecordingSessionBySessionId(sessionId: string): Promise<ContinuousRecordingSession | undefined>;
  updateContinuousRecordingSession(id: number, data: Partial<ContinuousRecordingSession>): Promise<ContinuousRecordingSession>;
  getActiveContinuousRecordingSession(userId: number): Promise<ContinuousRecordingSession | undefined>;

  // Continuous Session Notes Operations (Temporary Storage)
  createContinuousSessionNote(note: InsertContinuousSessionNote): Promise<ContinuousSessionNote>;
  getContinuousSessionNote(id: number): Promise<ContinuousSessionNote | undefined>;
  getContinuousSessionNotesBySession(sessionId: string): Promise<ContinuousSessionNote[]>;
  getContinuousSessionNoteBySequence(sessionId: string, patientSequence: number): Promise<ContinuousSessionNote | undefined>;
  updateContinuousSessionNote(id: number, data: Partial<InsertContinuousSessionNote>): Promise<ContinuousSessionNote>;
  deleteContinuousSessionNote(id: number): Promise<void>;
  deleteExpiredContinuousSessionNotes(): Promise<number>;
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
    getAll: boolean = false,
    search?: string,
    qualityFilter?: string
  ): Promise<{ articles: ResearchArticle[]; total: number }> {
    // Build base query
    let query = db.select().from(researchArticles);
    let conditions = [];

    // If bodyPart is provided and valid, filter by it
    if (bodyPart && bodyPart !== 'all') {
      conditions.push(eq(researchArticles.bodyPart, bodyPart as any));
    }

    // Add search filter
    if (search && search.trim()) {
      conditions.push(
        or(
          ilike(researchArticles.title, `%${search.trim()}%`),
          ilike(researchArticles.abstract, `%${search.trim()}%`),
          ilike(researchArticles.authors, `%${search.trim()}%`),
          ilike(researchArticles.journal, `%${search.trim()}%`)
        )
      );
    }

    // Add quality filter based on AI analysis scores
    if (qualityFilter && qualityFilter !== 'all') {
      if (qualityFilter === 'high') {
        conditions.push(sql`quality_score >= 80`);
      } else if (qualityFilter === 'moderate') {
        conditions.push(sql`quality_score >= 60 AND quality_score < 80`);
      } else if (qualityFilter === 'low') {
        conditions.push(sql`quality_score < 60`);
      }
    }

    // Apply conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // First get total count for pagination metadata
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(researchArticles);
    
    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }

    const countResult = await countQuery;
    const total = countResult[0]?.count || 0;

    // If getAll is true, return all articles without pagination
    if (getAll) {
      const articles = await query.orderBy(
        sql`CASE WHEN ai_analysis_status = 'completed' THEN 0 ELSE 1 END`,
        desc(researchArticles.aiAnalyzedAt),
        desc(researchArticles.publicationDate)
      );
      return { articles, total };
    }

    // Otherwise calculate offset based on page and pageSize
    const offset = (page - 1) * pageSize;

    // Then get the paginated results - prioritize completed AI analyses
    const articles = await query
      .orderBy(
        sql`CASE WHEN ai_analysis_status = 'completed' THEN 0 ELSE 1 END`,
        desc(researchArticles.aiAnalyzedAt),
        desc(researchArticles.publicationDate)
      )
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

  async updateResearchArticleAnalysis(
    id: number,
    analysisData: any
  ): Promise<ResearchArticle> {
    const result = await db
      .update(researchArticles)
      .set({
        aiAnalysisStatus: analysisData.aiAnalysisStatus || 'completed',
        qualityScore: analysisData.qualityScore,
        identifiedGaps: analysisData.identifiedGaps,
        generatedQuestions: analysisData.generatedQuestions,
        biasAssessment: analysisData.biasAssessment,
        methodologyAssessment: analysisData.methodologyAssessment,
        aiAnalyzedAt: new Date()
      })
      .where(eq(researchArticles.id, id))
      .returning();
    return result[0];
  }

  // Generated Documents Methods
  async createGeneratedDocument(document: InsertGeneratedDocument): Promise<GeneratedDocument> {
    const result = await db
      .insert(generatedDocuments)
      .values(document)
      .returning();
    return result[0];
  }

  async getGeneratedDocument(documentId: string): Promise<GeneratedDocument | undefined> {
    const results = await db
      .select()
      .from(generatedDocuments)
      .where(eq(generatedDocuments.id, documentId));
    return results.length > 0 ? results[0] : undefined;
  }

  async getGeneratedDocumentsBySession(sessionId: string, userId: number): Promise<GeneratedDocument[]> {
    return await db
      .select()
      .from(generatedDocuments)
      .where(
        and(
          eq(generatedDocuments.sessionId, sessionId),
          eq(generatedDocuments.userId, userId)
        )
      )
      .orderBy(desc(generatedDocuments.generatedAt));
  }

  async updateGeneratedDocument(documentId: string, updates: Partial<GeneratedDocument>): Promise<GeneratedDocument | undefined> {
    const result = await db
      .update(generatedDocuments)
      .set(updates)
      .where(eq(generatedDocuments.id, documentId))
      .returning();
    return result.length > 0 ? result[0] : undefined;
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

  // Trial Management Methods
  async startFreeTrial(userId: number): Promise<User> {
    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialStartDate.getDate() + 14); // 14 days from now

    const result = await db
      .update(users)
      .set({
        trialStartDate,
        trialEndDate,
        hasUsedTrial: true,
        membershipTier: "premium", // Grant premium access during trial
        membershipExpiry: trialEndDate,
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async getUserTrialStatus(userId: number): Promise<{
    hasUsedTrial: boolean;
    isOnTrial: boolean;
    trialDaysRemaining: number;
    trialEndDate: Date | null;
  }> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const now = new Date();
    const hasUsedTrial = user.hasUsedTrial || false;
    const trialEndDate = user.trialEndDate;
    
    let isOnTrial = false;
    let trialDaysRemaining = 0;

    if (trialEndDate && hasUsedTrial) {
      isOnTrial = now < trialEndDate;
      if (isOnTrial) {
        const timeDiff = trialEndDate.getTime() - now.getTime();
        trialDaysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
      }
    }

    return {
      hasUsedTrial,
      isOnTrial,
      trialDaysRemaining,
      trialEndDate,
    };
  }

  // Research Papers with AI Analysis Methods
  async getResearchPaper(id: number): Promise<ResearchPaper | undefined> {
    const results = await db
      .select()
      .from(researchPapers)
      .where(eq(researchPapers.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getResearchPapers(
    bodyPart?: string,
    studyDesign?: string,
    evidenceLevel?: string,
    page: number = 1,
    pageSize: number = 20,
    search?: string
  ): Promise<{ papers: ResearchPaper[]; total: number }> {
    let query = db.select().from(researchPapers);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(researchPapers);

    const conditions = [];

    if (bodyPart) {
      conditions.push(eq(researchPapers.bodyPart, bodyPart as any));
    }
    if (studyDesign) {
      conditions.push(eq(researchPapers.studyDesign, studyDesign as any));
    }
    if (evidenceLevel) {
      conditions.push(eq(researchPapers.evidenceLevel, evidenceLevel as any));
    }
    if (search) {
      conditions.push(
        or(
          ilike(researchPapers.title, `%${search}%`),
          ilike(researchPapers.authors, `%${search}%`),
          ilike(researchPapers.abstract, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }

    const offset = (page - 1) * pageSize;
    query = query
      .orderBy(desc(researchPapers.year), desc(researchPapers.strengthOfEvidence))
      .limit(pageSize)
      .offset(offset);

    const [papers, totalResult] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      papers,
      total: totalResult[0].count
    };
  }

  async getResearchPapersByBodyPart(
    bodyPart: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ papers: ResearchPaper[]; total: number }> {
    return this.getResearchPapers(bodyPart, undefined, undefined, page, pageSize);
  }

  async createResearchPaper(paper: InsertResearchPaper): Promise<ResearchPaper> {
    const result = await db
      .insert(researchPapers)
      .values(paper)
      .returning();
    return result[0];
  }

  async bulkCreateResearchPapers(papers: InsertResearchPaper[]): Promise<ResearchPaper[]> {
    if (papers.length === 0) return [];
    
    const result = await db
      .insert(researchPapers)
      .values(papers)
      .returning();
    return result;
  }

  async updateResearchPaper(id: number, updateData: Partial<InsertResearchPaper>): Promise<ResearchPaper> {
    const result = await db
      .update(researchPapers)
      .set(updateData)
      .where(eq(researchPapers.id, id))
      .returning();
    return result[0];
  }

  async deleteResearchPaper(id: number): Promise<void> {
    await db
      .delete(researchPapers)
      .where(eq(researchPapers.id, id));
  }

  async searchResearchPapers(query: string, filters?: {
    bodyPart?: string;
    evidenceLevel?: string;
    year?: number;
  }): Promise<ResearchPaper[]> {
    let searchQuery = db
      .select()
      .from(researchPapers)
      .where(
        or(
          ilike(researchPapers.title, `%${query}%`),
          ilike(researchPapers.authors, `%${query}%`),
          ilike(researchPapers.abstract, `%${query}%`),
          ilike(researchPapers.aiSummary, `%${query}%`)
        )
      );

    if (filters?.bodyPart) {
      searchQuery = searchQuery.where(eq(researchPapers.bodyPart, filters.bodyPart as any));
    }
    if (filters?.evidenceLevel) {
      searchQuery = searchQuery.where(eq(researchPapers.evidenceLevel, filters.evidenceLevel as any));
    }
    if (filters?.year) {
      searchQuery = searchQuery.where(eq(researchPapers.year, filters.year));
    }

    return searchQuery
      .orderBy(desc(researchPapers.strengthOfEvidence), desc(researchPapers.year))
      .limit(50);
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

  // SOAP Notes Operations
  async getSoapNote(id: number): Promise<SoapNote | undefined> {
    try {
      const result = await db
        .select()
        .from(soapNotes)
        .where(eq(soapNotes.id, id))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("Error getting SOAP note:", error);
      throw error;
    }
  }

  async getSoapNoteBySessionId(sessionId: string): Promise<SoapNote | undefined> {
    try {
      const result = await db
        .select()
        .from(soapNotes)
        .where(eq(soapNotes.sessionId, sessionId))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("Error getting SOAP note by session ID:", error);
      throw error;
    }
  }

  async getSoapNotes(userId: number): Promise<SoapNote[]> {
    try {
      const result = await db
        .select()
        .from(soapNotes)
        .where(eq(soapNotes.userId, userId))
        .orderBy(desc(soapNotes.createdAt));
      
      return result;
    } catch (error) {
      console.error("Error getting SOAP notes:", error);
      throw error;
    }
  }

  async createSoapNote(note: InsertSoapNote): Promise<SoapNote> {
    try {
      const result = await db
        .insert(soapNotes)
        .values(note)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating SOAP note:", error);
      throw error;
    }
  }

  async updateSoapNote(id: number, note: Partial<InsertSoapNote>): Promise<SoapNote> {
    try {
      const result = await db
        .update(soapNotes)
        .set({
          ...note,
          updatedAt: new Date(),
        })
        .where(eq(soapNotes.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error updating SOAP note:", error);
      throw error;
    }
  }

  async getActiveSoapSession(userId: number): Promise<SoapNote | undefined> {
    try {
      const result = await db
        .select()
        .from(soapNotes)
        .where(
          and(
            eq(soapNotes.userId, userId),
            not(eq(soapNotes.sessionStatus, "completed"))
          )
        )
        .orderBy(desc(soapNotes.createdAt))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("Error getting active SOAP session:", error);
      throw error;
    }
  }

  async markPatientSwitch(sessionId: string): Promise<SoapNote> {
    try {
      const result = await db
        .update(soapNotes)
        .set({
          patientSwitchDetected: true,
          updatedAt: new Date(),
        })
        .where(eq(soapNotes.sessionId, sessionId))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error marking patient switch:", error);
      throw error;
    }
  }

  async deleteAllCompletedSoapNotes(userId: number): Promise<void> {
    try {
      await db
        .delete(soapNotes)
        .where(
          and(
            eq(soapNotes.userId, userId),
            eq(soapNotes.sessionStatus, "completed"),
            eq(soapNotes.isAutoGenerated, true)
          )
        );
      
      console.log(`Deleted all completed SOAP notes for user ${userId}`);
    } catch (error) {
      console.error("Error deleting completed SOAP notes:", error);
      throw error;
    }
  }

  // SOAP Virtual Patient Methods
  async getSoapVirtualPatient(id: number): Promise<SoapVirtualPatient | undefined> {
    try {
      const result = await db
        .select()
        .from(soapVirtualPatients)
        .where(eq(soapVirtualPatients.id, id))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("Error getting SOAP virtual patient:", error);
      throw error;
    }
  }

  // Continuous Recording Session Methods
  async createContinuousRecordingSession(data: InsertContinuousRecordingSession): Promise<ContinuousRecordingSession> {
    try {
      const [session] = await db
        .insert(continuousRecordingSessions)
        .values(data)
        .returning();
      
      return session;
    } catch (error) {
      console.error("Error creating continuous recording session:", error);
      throw error;
    }
  }

  async getContinuousRecordingSession(id: number): Promise<ContinuousRecordingSession | undefined> {
    try {
      const [session] = await db
        .select()
        .from(continuousRecordingSessions)
        .where(eq(continuousRecordingSessions.id, id))
        .limit(1);
      
      return session;
    } catch (error) {
      console.error("Error getting continuous recording session:", error);
      throw error;
    }
  }

  async getContinuousRecordingSessionBySessionId(sessionId: string): Promise<ContinuousRecordingSession | undefined> {
    try {
      const [session] = await db
        .select()
        .from(continuousRecordingSessions)
        .where(eq(continuousRecordingSessions.sessionId, sessionId))
        .limit(1);
      
      return session;
    } catch (error) {
      console.error("Error getting continuous recording session by session ID:", error);
      throw error;
    }
  }

  async updateContinuousRecordingSession(id: number, data: Partial<ContinuousRecordingSession>): Promise<ContinuousRecordingSession> {
    try {
      const [session] = await db
        .update(continuousRecordingSessions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(continuousRecordingSessions.id, id))
        .returning();
      
      return session;
    } catch (error) {
      console.error("Error updating continuous recording session:", error);
      throw error;
    }
  }

  async getActiveContinuousRecordingSession(userId: number): Promise<ContinuousRecordingSession | undefined> {
    try {
      const [session] = await db
        .select()
        .from(continuousRecordingSessions)
        .where(and(
          eq(continuousRecordingSessions.userId, userId),
          eq(continuousRecordingSessions.isActive, true)
        ))
        .limit(1);
      
      return session;
    } catch (error) {
      console.error("Error getting active continuous recording session:", error);
      throw error;
    }
  }

  // Continuous Session Notes Methods (Temporary Storage with 24-hour retention)
  async createContinuousSessionNote(note: InsertContinuousSessionNote): Promise<ContinuousSessionNote> {
    try {
      // Set expiry to 24 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      const [createdNote] = await db
        .insert(continuousSessionNotes)
        .values({
          ...note,
          expiresAt
        })
        .returning();
      
      return createdNote;
    } catch (error) {
      console.error("Error creating continuous session note:", error);
      throw error;
    }
  }

  async getContinuousSessionNote(id: number): Promise<ContinuousSessionNote | undefined> {
    try {
      const [note] = await db
        .select()
        .from(continuousSessionNotes)
        .where(eq(continuousSessionNotes.id, id))
        .limit(1);
      
      return note;
    } catch (error) {
      console.error("Error getting continuous session note:", error);
      throw error;
    }
  }

  async getContinuousSessionNotesBySession(sessionId: string): Promise<ContinuousSessionNote[]> {
    try {
      const notes = await db
        .select()
        .from(continuousSessionNotes)
        .where(eq(continuousSessionNotes.sessionId, sessionId))
        .orderBy(continuousSessionNotes.patientSequence);
      
      return notes;
    } catch (error) {
      console.error("Error getting continuous session notes by session:", error);
      throw error;
    }
  }

  async getContinuousSessionNoteBySequence(sessionId: string, patientSequence: number): Promise<ContinuousSessionNote | undefined> {
    try {
      const [note] = await db
        .select()
        .from(continuousSessionNotes)
        .where(and(
          eq(continuousSessionNotes.sessionId, sessionId),
          eq(continuousSessionNotes.patientSequence, patientSequence)
        ))
        .limit(1);
      
      return note;
    } catch (error) {
      console.error("Error getting continuous session note by sequence:", error);
      throw error;
    }
  }

  async updateContinuousSessionNote(id: number, data: Partial<InsertContinuousSessionNote>): Promise<ContinuousSessionNote> {
    try {
      const [updatedNote] = await db
        .update(continuousSessionNotes)
        .set(data)
        .where(eq(continuousSessionNotes.id, id))
        .returning();
      
      return updatedNote;
    } catch (error) {
      console.error("Error updating continuous session note:", error);
      throw error;
    }
  }

  async deleteContinuousSessionNote(id: number): Promise<void> {
    try {
      await db
        .delete(continuousSessionNotes)
        .where(eq(continuousSessionNotes.id, id));
    } catch (error) {
      console.error("Error deleting continuous session note:", error);
      throw error;
    }
  }

  async deleteExpiredContinuousSessionNotes(): Promise<number> {
    try {
      const now = new Date();
      const result = await db
        .delete(continuousSessionNotes)
        .where(sql`${continuousSessionNotes.expiresAt} < ${now}`)
        .returning({ id: continuousSessionNotes.id });
      
      return result.length;
    } catch (error) {
      console.error("Error deleting expired continuous session notes:", error);
      throw error;
    }
  }

  async getSoapNotesBySessionId(sessionId: string): Promise<SoapNote[]> {
    try {
      const notes = await db
        .select()
        .from(soapNotes)
        .where(eq(soapNotes.sessionId, sessionId))
        .orderBy(desc(soapNotes.createdAt));
      
      return notes;
    } catch (error) {
      console.error("Error getting SOAP notes by session ID:", error);
      throw error;
    }
  }

  async getSoapNotesByContinuousSessionId(continuousSessionId: number): Promise<SoapNote[]> {
    try {
      const notes = await db
        .select()
        .from(soapNotes)
        .where(eq(soapNotes.continuousRecordingSessionId, continuousSessionId))
        .orderBy(soapNotes.patientSequenceNumber);
      
      return notes;
    } catch (error) {
      console.error("Error getting SOAP notes by continuous session ID:", error);
      throw error;
    }
  }

  async getSoapVirtualPatientBySoapNote(soapNoteId: number): Promise<SoapVirtualPatient | undefined> {
    try {
      const result = await db
        .select()
        .from(soapVirtualPatients)
        .where(eq(soapVirtualPatients.soapNoteId, soapNoteId))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("Error getting SOAP virtual patient by soap note:", error);
      throw error;
    }
  }

  async getUserSoapVirtualPatients(userId: number): Promise<SoapVirtualPatient[]> {
    try {
      const result = await db
        .select()
        .from(soapVirtualPatients)
        .where(eq(soapVirtualPatients.userId, userId))
        .orderBy(desc(soapVirtualPatients.createdAt));
      
      return result;
    } catch (error) {
      console.error("Error getting user SOAP virtual patients:", error);
      throw error;
    }
  }

  async createSoapVirtualPatient(virtualPatient: InsertSoapVirtualPatient): Promise<SoapVirtualPatient> {
    try {
      const result = await db
        .insert(soapVirtualPatients)
        .values(virtualPatient)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating SOAP virtual patient:", error);
      throw error;
    }
  }

  async updateSoapVirtualPatient(id: number, data: Partial<InsertSoapVirtualPatient>): Promise<SoapVirtualPatient> {
    try {
      const result = await db
        .update(soapVirtualPatients)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(soapVirtualPatients.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error updating SOAP virtual patient:", error);
      throw error;
    }
  }

  async getSoapVirtualPatient(id: number): Promise<SoapVirtualPatient | undefined> {
    try {
      const result = await db
        .select()
        .from(soapVirtualPatients)
        .where(eq(soapVirtualPatients.id, id))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("Error getting SOAP virtual patient:", error);
      throw error;
    }
  }

  // Virtual Patient Config Operations
  async getVirtualPatientConfig(id: number): Promise<VirtualPatientConfig | undefined> {
    try {
      const result = await db
        .select()
        .from(virtualPatientConfigs)
        .where(eq(virtualPatientConfigs.id, id))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("Error getting virtual patient config:", error);
      throw error;
    }
  }

  async getUserVirtualPatientConfigs(userId: number): Promise<VirtualPatientConfig[]> {
    try {
      const result = await db
        .select()
        .from(virtualPatientConfigs)
        .where(eq(virtualPatientConfigs.userId, userId))
        .orderBy(desc(virtualPatientConfigs.lastModified));
      
      return result;
    } catch (error) {
      console.error("Error getting user virtual patient configs:", error);
      throw error;
    }
  }

  async getVirtualPatientConfigBySoapId(soapVirtualPatientId: number): Promise<VirtualPatientConfig | undefined> {
    try {
      const result = await db
        .select()
        .from(virtualPatientConfigs)
        .where(eq(virtualPatientConfigs.soapVirtualPatientId, soapVirtualPatientId))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("Error getting virtual patient config by soap ID:", error);
      throw error;
    }
  }

  async createVirtualPatientConfig(config: InsertVirtualPatientConfig): Promise<VirtualPatientConfig> {
    try {
      console.log("Creating virtual patient config with data:", JSON.stringify(config, null, 2));
      
      const result = await db
        .insert(virtualPatientConfigs)
        .values(config)
        .returning();
      
      console.log("Successfully created virtual patient config:", result[0]);
      return result[0];
    } catch (error) {
      console.error("Error creating virtual patient config:", error);
      console.error("Error details:", error instanceof Error ? error.message : "Unknown error");
      throw error;
    }
  }

  async updateVirtualPatientConfig(id: number, data: Partial<InsertVirtualPatientConfig>): Promise<VirtualPatientConfig> {
    try {
      const result = await db
        .update(virtualPatientConfigs)
        .set({
          ...data,
          updatedAt: new Date(),
          lastModified: new Date(),
        })
        .where(eq(virtualPatientConfigs.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error updating virtual patient config:", error);
      throw error;
    }
  }

  async deleteVirtualPatientConfig(id: number): Promise<void> {
    try {
      await db
        .delete(virtualPatientConfigs)
        .where(eq(virtualPatientConfigs.id, id));
    } catch (error) {
      console.error("Error deleting virtual patient config:", error);
      throw error;
    }
  }

  // Pathology Template Operations
  async getPathologyTemplates(category?: string): Promise<PathologyTemplate[]> {
    try {
      const query = db.select().from(pathologyTemplates);
      
      if (category) {
        return await query.where(eq(pathologyTemplates.category, category));
      }
      
      return await query;
    } catch (error) {
      console.error("Error fetching pathology templates:", error);
      throw error;
    }
  }

  async getPathologyTemplate(id: number): Promise<PathologyTemplate | undefined> {
    try {
      const result = await db
        .select()
        .from(pathologyTemplates)
        .where(eq(pathologyTemplates.id, id))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("Error fetching pathology template:", error);
      throw error;
    }
  }

  async createPathologyTemplate(template: InsertPathologyTemplate): Promise<PathologyTemplate> {
    try {
      const result = await db
        .insert(pathologyTemplates)
        .values(template)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating pathology template:", error);
      throw error;
    }
  }

  async updatePathologyTemplate(id: number, data: Partial<InsertPathologyTemplate>): Promise<PathologyTemplate> {
    try {
      const result = await db
        .update(pathologyTemplates)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(pathologyTemplates.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error updating pathology template:", error);
      throw error;
    }
  }

  async deletePathologyTemplate(id: number): Promise<void> {
    try {
      await db
        .delete(pathologyTemplates)
        .where(eq(pathologyTemplates.id, id));
    } catch (error) {
      console.error("Error deleting pathology template:", error);
      throw error;
    }
  }

  // Comparative Case Analysis Operations
  async createHistoricalCase(histCase: InsertHistoricalCase): Promise<HistoricalCase> {
    try {
      const result = await db
        .insert(historicalCases)
        .values(histCase)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating historical case:", error);
      throw error;
    }
  }

  async getHistoricalCase(id: number): Promise<HistoricalCase | undefined> {
    try {
      const result = await db
        .select()
        .from(historicalCases)
        .where(eq(historicalCases.id, id))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("Error fetching historical case:", error);
      throw error;
    }
  }

  async getSimilarCases(embedding: number[], threshold: number): Promise<HistoricalCase[]> {
    try {
      // For now, return all cases and filter in application layer
      // In production, this would use pgvector for similarity search
      const allCases = await db.select().from(historicalCases);
      
      // Calculate cosine similarity in application layer
      const casesWithSimilarity = allCases.map(caseItem => {
        const caseEmbedding = caseItem.presentationEmbedding as number[];
        const similarity = this.cosineSimilarity(embedding, caseEmbedding);
        return { ...caseItem, similarity };
      });
      
      // Filter by threshold and sort by similarity
      return casesWithSimilarity
        .filter(c => c.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 20); // Limit to top 20 matches
    } catch (error) {
      console.error("Error finding similar cases:", error);
      throw error;
    }
  }

  // Helper function for cosine similarity
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async updateHistoricalCaseOutcomes(id: number, outcomes: any): Promise<HistoricalCase> {
    try {
      const result = await db
        .update(historicalCases)
        .set({
          outcomes,
          updatedAt: new Date(),
        })
        .where(eq(historicalCases.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error updating historical case outcomes:", error);
      throw error;
    }
  }

  // Case Similarity Operations
  async createCaseSimilarity(similarity: InsertCaseSimilarity): Promise<CaseSimilarity> {
    try {
      const result = await db
        .insert(caseSimilarities)
        .values(similarity)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating case similarity:", error);
      throw error;
    }
  }

  async getCaseSimilarities(caseId: number): Promise<CaseSimilarity[]> {
    try {
      const result = await db
        .select()
        .from(caseSimilarities)
        .where(or(
          eq(caseSimilarities.case1Id, caseId),
          eq(caseSimilarities.case2Id, caseId)
        ))
        .orderBy(desc(caseSimilarities.similarityScore));
      
      return result;
    } catch (error) {
      console.error("Error fetching case similarities:", error);
      throw error;
    }
  }

  // SOAP Pattern Operations
  async getSoapPatterns(conditionType: string, sectionType?: string): Promise<SoapPattern[]> {
    try {
      let query = db
        .select()
        .from(soapPatterns)
        .where(eq(soapPatterns.conditionType, conditionType));
      
      if (sectionType) {
        query = query.where(eq(soapPatterns.sectionType, sectionType));
      }
      
      return await query;
    } catch (error) {
      console.error("Error fetching SOAP patterns:", error);
      throw error;
    }
  }

  async createSoapPattern(pattern: InsertSoapPattern): Promise<SoapPattern> {
    try {
      const result = await db
        .insert(soapPatterns)
        .values(pattern)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating SOAP pattern:", error);
      throw error;
    }
  }

  async updateSoapPattern(id: number, data: Partial<InsertSoapPattern>): Promise<SoapPattern> {
    try {
      const result = await db
        .update(soapPatterns)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(soapPatterns.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error updating SOAP pattern:", error);
      throw error;
    }
  }

  // Comparative Analysis Operations
  async createComparativeAnalysis(analysis: InsertComparativeAnalysis): Promise<ComparativeAnalysis> {
    try {
      const result = await db
        .insert(comparativeAnalyses)
        .values(analysis)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating comparative analysis:", error);
      throw error;
    }
  }

  async getComparativeAnalysis(soapNoteId?: number, conversationId?: number): Promise<ComparativeAnalysis | undefined> {
    try {
      let query = db.select().from(comparativeAnalyses);
      
      if (soapNoteId) {
        query = query.where(eq(comparativeAnalyses.soapNoteId, soapNoteId));
      } else if (conversationId) {
        query = query.where(eq(comparativeAnalyses.conversationId, conversationId));
      } else {
        return undefined;
      }
      
      const result = await query.limit(1);
      return result[0];
    } catch (error) {
      console.error("Error fetching comparative analysis:", error);
      throw error;
    }
  }

  async getRecentAnalyses(userId: number, limit: number = 10): Promise<ComparativeAnalysis[]> {
    try {
      // Join with soap notes or conversations to filter by user
      const result = await db
        .select()
        .from(comparativeAnalyses)
        .leftJoin(soapNotes, eq(comparativeAnalyses.soapNoteId, soapNotes.id))
        .where(eq(soapNotes.userId, userId))
        .orderBy(desc(comparativeAnalyses.createdAt))
        .limit(limit);
      
      return result.map(r => r.comparative_analyses);
    } catch (error) {
      console.error("Error fetching recent analyses:", error);
      throw error;
    }
  }

  // Treatment Outcome Operations
  async createTreatmentOutcome(outcome: InsertTreatmentOutcome): Promise<TreatmentOutcome> {
    try {
      const result = await db
        .insert(treatmentOutcomes)
        .values(outcome)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating treatment outcome:", error);
      throw error;
    }
  }

  async getTreatmentOutcomes(caseId?: number, soapNoteId?: number): Promise<TreatmentOutcome[]> {
    try {
      let query = db.select().from(treatmentOutcomes);
      
      if (caseId) {
        query = query.where(eq(treatmentOutcomes.historicalCaseId, caseId));
      } else if (soapNoteId) {
        query = query.where(eq(treatmentOutcomes.soapNoteId, soapNoteId));
      }
      
      return await query.orderBy(treatmentOutcomes.weekNumber);
    } catch (error) {
      console.error("Error fetching treatment outcomes:", error);
      throw error;
    }
  }

  async updateTreatmentOutcome(id: number, data: Partial<InsertTreatmentOutcome>): Promise<TreatmentOutcome> {
    try {
      const result = await db
        .update(treatmentOutcomes)
        .set(data)
        .where(eq(treatmentOutcomes.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error updating treatment outcome:", error);
      throw error;
    }
  }

  // Forum Operations
  async createForumPost(post: InsertForumPost): Promise<ForumPost> {
    try {
      const result = await db
        .insert(forumPosts)
        .values(post)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating forum post:", error);
      throw error;
    }
  }

  async getForumPost(id: number): Promise<ForumPost | undefined> {
    try {
      const result = await db
        .select()
        .from(forumPosts)
        .where(eq(forumPosts.id, id));
      
      return result[0];
    } catch (error) {
      console.error("Error fetching forum post:", error);
      throw error;
    }
  }

  async getForumPosts(params: {
    category?: string;
    bodyPart?: string;
    status?: string;
    authorId?: number;
    page: number;
    limit: number;
  }): Promise<{ posts: ForumPost[]; total: number }> {
    try {
      let conditions = [];
      
      if (params.category) {
        conditions.push(eq(forumPosts.category, params.category as any));
      }
      
      if (params.bodyPart) {
        conditions.push(sql`${params.bodyPart} = ANY(${forumPosts.bodyParts})`);
      }
      
      if (params.status) {
        conditions.push(eq(forumPosts.status, params.status as any));
      }
      
      if (params.authorId) {
        conditions.push(eq(forumPosts.authorId, params.authorId));
      }
      
      // Get total count
      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(forumPosts);
      
      if (conditions.length > 0) {
        countQuery.where(and(...conditions));
      }
      
      const countResult = await countQuery;
      const total = countResult[0]?.count || 0;
      
      // Get paginated posts
      let query = db.select().from(forumPosts);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const posts = await query
        .orderBy(desc(forumPosts.createdAt))
        .limit(params.limit)
        .offset((params.page - 1) * params.limit);
      
      return { posts, total };
    } catch (error) {
      console.error("Error fetching forum posts:", error);
      throw error;
    }
  }

  async getUserForumPosts(userId: number): Promise<ForumPost[]> {
    try {
      return await db
        .select()
        .from(forumPosts)
        .where(eq(forumPosts.authorId, userId))
        .orderBy(desc(forumPosts.createdAt));
    } catch (error) {
      console.error("Error fetching user forum posts:", error);
      throw error;
    }
  }

  async updateForumPost(id: number, data: Partial<InsertForumPost>): Promise<ForumPost> {
    try {
      const result = await db
        .update(forumPosts)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(forumPosts.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error updating forum post:", error);
      throw error;
    }
  }

  async deleteForumPost(id: number): Promise<void> {
    try {
      await db
        .delete(forumPosts)
        .where(eq(forumPosts.id, id));
    } catch (error) {
      console.error("Error deleting forum post:", error);
      throw error;
    }
  }

  async incrementForumPostViewCount(id: number): Promise<void> {
    try {
      await db
        .update(forumPosts)
        .set({
          viewCount: sql`${forumPosts.viewCount} + 1`
        })
        .where(eq(forumPosts.id, id));
    } catch (error) {
      console.error("Error incrementing forum post view count:", error);
      throw error;
    }
  }

  async incrementForumPostHelpfulCount(id: number): Promise<void> {
    try {
      await db
        .update(forumPosts)
        .set({
          helpfulCount: sql`${forumPosts.helpfulCount} + 1`
        })
        .where(eq(forumPosts.id, id));
    } catch (error) {
      console.error("Error incrementing forum post helpful count:", error);
      throw error;
    }
  }

  async searchForumPosts(params: {
    query: string;
    category?: string;
    bodyPart?: string;
    hasRedFlags?: boolean;
  }): Promise<ForumPost[]> {
    try {
      let conditions = [];
      
      // Add text search condition
      conditions.push(
        or(
          ilike(forumPosts.title, `%${params.query}%`),
          sql`${forumPosts.questionsForCommunity}::text ILIKE '%${params.query}%'`
        )
      );
      
      if (params.category) {
        conditions.push(eq(forumPosts.category, params.category as any));
      }
      
      if (params.bodyPart) {
        conditions.push(sql`${params.bodyPart} = ANY(${forumPosts.bodyParts})`);
      }
      
      if (params.hasRedFlags) {
        conditions.push(sql`jsonb_array_length((${forumPosts.assessmentConsiderations}->'redFlags')::jsonb) > 0`);
      }
      
      // Only show published posts in search
      conditions.push(eq(forumPosts.status, 'published'));
      
      return await db
        .select()
        .from(forumPosts)
        .where(and(...conditions))
        .orderBy(desc(forumPosts.helpfulCount), desc(forumPosts.createdAt))
        .limit(50);
    } catch (error) {
      console.error("Error searching forum posts:", error);
      throw error;
    }
  }

  // Forum Reply Operations
  async createForumReply(reply: InsertForumReply): Promise<ForumReply> {
    try {
      const result = await db
        .insert(forumReplies)
        .values(reply)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating forum reply:", error);
      throw error;
    }
  }

  async getForumReplies(postId: number): Promise<ForumReply[]> {
    try {
      return await db
        .select()
        .from(forumReplies)
        .where(eq(forumReplies.postId, postId))
        .orderBy(forumReplies.createdAt);
    } catch (error) {
      console.error("Error fetching forum replies:", error);
      throw error;
    }
  }

  async incrementForumReplyHelpfulCount(id: number): Promise<void> {
    try {
      await db
        .update(forumReplies)
        .set({
          helpfulCount: sql`${forumReplies.helpfulCount} + 1`
        })
        .where(eq(forumReplies.id, id));
    } catch (error) {
      console.error("Error incrementing forum reply helpful count:", error);
      throw error;
    }
  }

  // Forum Helpful Vote Operations
  async createForumHelpfulVote(vote: InsertForumHelpfulVote): Promise<ForumHelpfulVote> {
    try {
      const result = await db
        .insert(forumHelpfulVotes)
        .values(vote)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating forum helpful vote:", error);
      throw error;
    }
  }

  async getForumHelpfulVote(userId: number, postId?: number, replyId?: number): Promise<ForumHelpfulVote | undefined> {
    try {
      let conditions = [eq(forumHelpfulVotes.userId, userId)];
      
      if (postId) {
        conditions.push(eq(forumHelpfulVotes.postId, postId));
      }
      
      if (replyId) {
        conditions.push(eq(forumHelpfulVotes.replyId, replyId));
      }
      
      const result = await db
        .select()
        .from(forumHelpfulVotes)
        .where(and(...conditions));
      
      return result[0];
    } catch (error) {
      console.error("Error fetching forum helpful vote:", error);
      throw error;
    }
  }

  // Forum Sanitization Log Operations
  async createForumSanitizationLog(log: InsertForumSanitizationLog): Promise<ForumSanitizationLog> {
    try {
      const result = await db
        .insert(forumSanitizationLogs)
        .values(log)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating forum sanitization log:", error);
      throw error;
    }
  }

  // Patient Fingerprint Operations
  async getPatientFingerprint(patientHash: string): Promise<PatientFingerprint | undefined> {
    try {
      const result = await db
        .select()
        .from(patientFingerprints)
        .where(eq(patientFingerprints.patientHash, patientHash));
      
      return result[0];
    } catch (error) {
      console.error("Error fetching patient fingerprint:", error);
      throw error;
    }
  }

  async createPatientFingerprint(fingerprint: InsertPatientFingerprint): Promise<PatientFingerprint> {
    try {
      const result = await db
        .insert(patientFingerprints)
        .values(fingerprint)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating patient fingerprint:", error);
      throw error;
    }
  }

  async updatePatientFingerprint(
    patientHash: string,
    visitCount: number,
    progressionMarker?: number
  ): Promise<PatientFingerprint> {
    try {
      const existing = await this.getPatientFingerprint(patientHash);
      if (!existing) {
        throw new Error("Patient fingerprint not found");
      }

      const markers = existing.clinicalProgressionMarkers || [];
      if (progressionMarker !== undefined) {
        markers.push(progressionMarker);
        // Keep only last 10 progression markers
        if (markers.length > 10) {
          markers.shift();
        }
      }

      const result = await db
        .update(patientFingerprints)
        .set({
          visitCount,
          lastVisitDate: new Date(),
          clinicalProgressionMarkers: markers,
          updatedAt: new Date(),
        })
        .where(eq(patientFingerprints.patientHash, patientHash))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error updating patient fingerprint:", error);
      throw error;
    }
  }

  async findSimilarPatientFingerprints(patientHash: string): Promise<PatientFingerprint[]> {
    try {
      // Get all fingerprints
      const allFingerprints = await db
        .select()
        .from(patientFingerprints)
        .orderBy(desc(patientFingerprints.lastVisitDate))
        .limit(100);
      
      // Find similar hashes using prefix matching (fuzzy match)
      const prefix = patientHash.substring(0, 16);
      const similar = allFingerprints.filter(fp => 
        fp.patientHash.substring(0, 16) === prefix && 
        fp.patientHash !== patientHash
      );
      
      return similar.slice(0, 5); // Return top 5 similar fingerprints
    } catch (error) {
      console.error("Error finding similar patient fingerprints:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
