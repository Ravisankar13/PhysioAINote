import {
  users,
  passwordResetTokens,
  type User,
  type InsertUser,
  type PasswordResetToken,
  type InsertPasswordResetToken,
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
  bodyPartEnum,
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
  temporarySoapNotes,
  type TemporarySoapNote,
  type InsertTemporarySoapNote,
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
  exercisePrograms,
  type ExerciseProgram,
  type InsertExerciseProgram,
  programExercises,
  type ProgramExercise,
  type InsertProgramExercise,
  exerciseTemplates,
  type ExerciseTemplate,
  type InsertExerciseTemplate,
  exerciseAssignments,
  type ExerciseAssignment,
  type InsertExerciseAssignment,
  exerciseProgress,
  type ExerciseProgress,
  type InsertExerciseProgress,
  exerciseImages,
  type ExerciseImage,
  type InsertExerciseImage,
  cachedExercises,
  courses,
  type Course,
  type InsertCourse,
  courseModules,
  type CourseModule,
  type InsertCourseModule,
  userEnrollments,
  type UserEnrollment,
  type InsertUserEnrollment,
  moduleProgress,
  type ModuleProgress,
  type InsertModuleProgress,
  assessments,
  type Assessment,
  type InsertAssessment,
  assessmentAttempts,
  type AssessmentAttempt,
  type InsertAssessmentAttempt,
  certificates,
  type Certificate,
  type InsertCertificate,
  type CachedExercise,
  type InsertCachedExercise,
  courseSectionNotes,
  type CourseSectionNote,
  type InsertCourseSectionNote,
  courseSectionDiscussions,
  type CourseSectionDiscussion,
  type InsertCourseSectionDiscussion,
  courseFlashcards,
  type CourseFlashcard,
  type InsertCourseFlashcard,
  quizAttempts,
  type QuizAttempt,
  type InsertQuizAttempt,
  discussionUpvoteTracking,
  type DiscussionUpvote,
  type InsertDiscussionUpvote,
  patientClones,
  type PatientClone,
  type InsertPatientClone,
  electroConditionPresets,
  type ElectroConditionPreset,
  type InsertElectroConditionPreset,
  recoveryWeeklyCheckIns,
  type RecoveryWeeklyCheckIn,
  type InsertRecoveryWeeklyCheckIn,
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
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<User>;
  
  // Password Reset Token Operations
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(tokenId: number): Promise<void>;
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
    data: { 
      customerId?: string; 
      subscriptionId?: string;
      priceId?: string;
      tier?: "basic" | "standard" | "premium";
      status?: string;
    }
  ): Promise<User>;
  updateUser(userId: number, data: Partial<User>): Promise<User>;
  updateUserSubscription(userId: number, data: {
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
    membershipTier?: string;
    subscriptionStatus?: string;
    isOnTrial?: boolean;
    trialStartDate?: Date;
    trialEndDate?: Date;
    hasUsedTrial?: boolean;
    onboardingRequired?: boolean;
  }): Promise<User>;

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
  
  // Generated Documents Operations
  createGeneratedDocument(document: InsertGeneratedDocument): Promise<GeneratedDocument>;
  getGeneratedDocument(documentId: string): Promise<GeneratedDocument | undefined>;
  getGeneratedDocumentsBySession(sessionId: string, userId?: number): Promise<GeneratedDocument[]>;
  updateGeneratedDocument(documentId: string, updates: Partial<GeneratedDocument>): Promise<GeneratedDocument | undefined>;

  // Exercise Program Operations
  createExerciseProgram(program: InsertExerciseProgram): Promise<ExerciseProgram>;
  getExerciseProgram(id: number): Promise<ExerciseProgram | undefined>;
  getUserExercisePrograms(userId: number): Promise<ExerciseProgram[]>;
  getPublicExercisePrograms(): Promise<ExerciseProgram[]>;
  updateExerciseProgram(id: number, data: Partial<InsertExerciseProgram>): Promise<ExerciseProgram>;
  deleteExerciseProgram(id: number): Promise<void>;

  // Program Exercise Operations
  addProgramExercise(exercise: InsertProgramExercise): Promise<ProgramExercise>;
  getProgramExercises(programId: number): Promise<ProgramExercise[]>;
  updateProgramExercise(id: number, data: Partial<InsertProgramExercise>): Promise<ProgramExercise>;
  removeProgramExercise(id: number): Promise<void>;
  reorderProgramExercises(programId: number, exerciseIds: number[]): Promise<void>;

  // Exercise Template Operations
  createExerciseTemplate(template: InsertExerciseTemplate): Promise<ExerciseTemplate>;
  getExerciseTemplate(id: number): Promise<ExerciseTemplate | undefined>;
  getExerciseTemplates(filters?: { bodyPart?: string; category?: string; condition?: string }): Promise<ExerciseTemplate[]>;
  updateExerciseTemplate(id: number, data: Partial<InsertExerciseTemplate>): Promise<ExerciseTemplate>;
  incrementTemplatePopularity(id: number): Promise<void>;

  // Exercise Assignment Operations
  createExerciseAssignment(assignment: InsertExerciseAssignment): Promise<ExerciseAssignment>;
  getExerciseAssignment(id: number): Promise<ExerciseAssignment | undefined>;
  getPatientAssignments(patientId: number): Promise<ExerciseAssignment[]>;
  getPractitionerAssignments(practitionerId: number): Promise<ExerciseAssignment[]>;
  updateExerciseAssignment(id: number, data: Partial<InsertExerciseAssignment>): Promise<ExerciseAssignment>;

  // Exercise Progress Operations
  recordExerciseProgress(progress: InsertExerciseProgress): Promise<ExerciseProgress>;
  getExerciseProgress(assignmentId: number, exerciseId?: number): Promise<ExerciseProgress[]>;
  getProgressByDate(assignmentId: number, date: string): Promise<ExerciseProgress[]>;
  updateExerciseProgress(id: number, data: Partial<InsertExerciseProgress>): Promise<ExerciseProgress>;

  // Exercise Image Operations
  createExerciseImage(image: InsertExerciseImage): Promise<ExerciseImage>;
  getExerciseImage(id: number): Promise<ExerciseImage | undefined>;
  getExerciseImageByName(exerciseName: string): Promise<ExerciseImage | undefined>;
  getExerciseImagesByBodyPart(bodyPart: string): Promise<ExerciseImage[]>;
  getExerciseImagesByCategory(category: string): Promise<ExerciseImage[]>;
  searchExerciseImages(searchTerm: string): Promise<ExerciseImage[]>;
  bulkCreateExerciseImages(images: InsertExerciseImage[]): Promise<ExerciseImage[]>;
  updateExerciseImage(id: number, data: Partial<InsertExerciseImage>): Promise<ExerciseImage>;
  
  // Cached Exercise Operations (from ExerciseDB API)
  createCachedExercise(exercise: InsertCachedExercise): Promise<CachedExercise>;
  getCachedExercise(id: number): Promise<CachedExercise | undefined>;
  getCachedExerciseByExternalId(externalId: string): Promise<CachedExercise | undefined>;
  getCachedExercisesByBodyPart(bodyPart: string): Promise<CachedExercise[]>;
  getCachedExercisesByEquipment(equipment: string): Promise<CachedExercise[]>;
  getCachedExercisesByTarget(target: string): Promise<CachedExercise[]>;
  searchCachedExercises(searchTerm: string): Promise<CachedExercise[]>;
  getAllCachedExercises(limit?: number): Promise<CachedExercise[]>;
  bulkCreateCachedExercises(exercises: InsertCachedExercise[]): Promise<CachedExercise[]>;
  updateCachedExercise(id: number, data: Partial<InsertCachedExercise>): Promise<CachedExercise>;

  // Temporary SOAP Notes Operations (24-hour expiry)
  createTemporarySoapNote(note: InsertTemporarySoapNote): Promise<TemporarySoapNote>;
  getTemporarySoapNote(id: number): Promise<TemporarySoapNote | undefined>;
  getTemporarySoapNoteBySession(sessionId: string, userId: number): Promise<TemporarySoapNote[]>;
  getUserTemporarySoapNotes(userId: number): Promise<TemporarySoapNote[]>;
  updateTemporarySoapNote(id: number, data: Partial<InsertTemporarySoapNote>): Promise<TemporarySoapNote>;
  deleteExpiredTemporarySoapNotes(): Promise<void>;
  deleteTemporarySoapNote(id: number): Promise<void>;
  navigateTemporarySoapNote(currentId: number, direction: 'previous' | 'next'): Promise<TemporarySoapNote | undefined>;
  getLatestTemporarySoapNote(userId: number, sessionId: string): Promise<TemporarySoapNote | undefined>;

  // Education Hub Operations
  // Course Operations
  createCourse(course: InsertCourse): Promise<Course>;
  getCourse(id: number): Promise<Course | undefined>;
  getCourses(filters?: { difficulty?: string; bodyPart?: string; status?: string }): Promise<Course[]>;
  getUserCreatedCourses(userId: number): Promise<Course[]>;
  updateCourse(id: number, data: Partial<InsertCourse>): Promise<Course>;
  deleteCourse(id: number): Promise<void>;
  
  // Course Module Operations
  createCourseModule(module: InsertCourseModule): Promise<CourseModule>;
  getCourseModule(id: number): Promise<CourseModule | undefined>;
  getCourseModules(courseId: number): Promise<CourseModule[]>;
  updateCourseModule(id: number, data: Partial<InsertCourseModule>): Promise<CourseModule>;
  deleteCourseModule(id: number): Promise<void>;
  reorderCourseModules(courseId: number, moduleIds: number[]): Promise<void>;
  
  // User Enrollment Operations
  enrollUserInCourse(enrollment: InsertUserEnrollment): Promise<UserEnrollment>;
  getUserEnrollment(userId: number, courseId: number): Promise<UserEnrollment | undefined>;
  getUserEnrollments(userId: number): Promise<UserEnrollment[]>;
  getCourseEnrollments(courseId: number): Promise<UserEnrollment[]>;
  updateUserEnrollment(id: number, data: Partial<InsertUserEnrollment>): Promise<UserEnrollment>;
  dropUserFromCourse(userId: number, courseId: number): Promise<void>;
  
  // Module Progress Operations
  createModuleProgress(progress: InsertModuleProgress): Promise<ModuleProgress>;
  getModuleProgress(userId: number, moduleId: number): Promise<ModuleProgress | undefined>;
  getUserModuleProgress(userId: number, courseId: number): Promise<ModuleProgress[]>;
  updateModuleProgress(id: number, data: Partial<InsertModuleProgress>): Promise<ModuleProgress>;
  markModuleCompleted(userId: number, moduleId: number): Promise<ModuleProgress>;
  
  // Assessment Operations
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  getAssessment(id: number): Promise<Assessment | undefined>;
  getModuleAssessments(moduleId: number): Promise<Assessment[]>;
  updateAssessment(id: number, data: Partial<InsertAssessment>): Promise<Assessment>;
  deleteAssessment(id: number): Promise<void>;
  
  // Assessment Attempt Operations
  createAssessmentAttempt(attempt: InsertAssessmentAttempt): Promise<AssessmentAttempt>;
  getAssessmentAttempt(id: number): Promise<AssessmentAttempt | undefined>;
  getUserAssessmentAttempts(userId: number, assessmentId: number): Promise<AssessmentAttempt[]>;
  updateAssessmentAttempt(id: number, data: Partial<InsertAssessmentAttempt>): Promise<AssessmentAttempt>;
  
  // Certificate Operations
  createCertificate(certificate: InsertCertificate): Promise<Certificate>;
  getCertificate(id: number): Promise<Certificate | undefined>;
  getUserCertificates(userId: number): Promise<Certificate[]>;
  getCourseCertificates(courseId: number): Promise<Certificate[]>;
  verifyCertificate(certificateNumber: string): Promise<Certificate | undefined>;

  // Interactive Education Features
  // Notes Operations
  createCourseSectionNote(note: InsertCourseSectionNote): Promise<CourseSectionNote>;
  getCourseSectionNote(userId: number, courseId: number, moduleId: number, sectionIndex: number): Promise<CourseSectionNote | undefined>;
  updateCourseSectionNote(id: number, data: Partial<InsertCourseSectionNote>): Promise<CourseSectionNote>;
  getUserCourseSectionNotes(userId: number, courseId: number): Promise<CourseSectionNote[]>;
  
  // Discussion Operations
  createCourseSectionDiscussion(discussion: InsertCourseSectionDiscussion): Promise<CourseSectionDiscussion>;
  getCourseSectionDiscussions(courseId: number, moduleId: number, sectionIndex: number): Promise<CourseSectionDiscussion[]>;
  updateCourseSectionDiscussion(id: number, data: Partial<InsertCourseSectionDiscussion>): Promise<CourseSectionDiscussion>;
  deleteCourseSectionDiscussion(id: number): Promise<void>;
  upvoteDiscussion(discussionId: number, userId: number): Promise<CourseSectionDiscussion>;
  removeUpvoteDiscussion(discussionId: number, userId: number): Promise<CourseSectionDiscussion>;
  getUserDiscussionUpvotes(userId: number, discussionIds: number[]): Promise<number[]>;
  
  // Flashcard Operations
  createCourseFlashcard(flashcard: InsertCourseFlashcard): Promise<CourseFlashcard>;
  getCourseFlashcard(id: number): Promise<CourseFlashcard | undefined>;
  getUserCourseFlashcards(userId: number, courseId: number): Promise<CourseFlashcard[]>;
  updateCourseFlashcard(id: number, data: Partial<InsertCourseFlashcard>): Promise<CourseFlashcard>;
  deleteCourseFlashcard(id: number): Promise<void>;
  getDueFlashcards(userId: number, courseId: number): Promise<CourseFlashcard[]>;
  
  // Quiz Attempt Operations
  createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  getQuizAttempts(userId: number, courseId: number, moduleId: number, sectionIndex: number): Promise<QuizAttempt[]>;
  getQuestionAttempts(userId: number, courseId: number, moduleId: number, sectionIndex: number, questionId: string): Promise<QuizAttempt[]>;
  
  // Patient Clone Operations
  createPatientClone(clone: InsertPatientClone): Promise<PatientClone>;
  getPatientClone(id: number): Promise<PatientClone | undefined>;
  getUserPatientClones(userId: number): Promise<PatientClone[]>;
  updatePatientClone(id: number, data: Partial<InsertPatientClone>): Promise<PatientClone>;
  deletePatientClone(id: number): Promise<void>;

  // Electrophysical Engine condition presets
  listElectroConditionPresets(userId: number, patientId: number | null): Promise<ElectroConditionPreset[]>;
  getElectroConditionPreset(id: number): Promise<ElectroConditionPreset | undefined>;
  upsertElectroConditionPreset(preset: InsertElectroConditionPreset): Promise<ElectroConditionPreset>;
  renameElectroConditionPreset(id: number, name: string): Promise<ElectroConditionPreset>;
  touchElectroConditionPreset(id: number): Promise<void>;
  deleteElectroConditionPreset(id: number): Promise<void>;

  // Recovery Simulator weekly check-ins (Task #241)
  listRecoveryWeeklyCheckIns(userId: number, caseId: string): Promise<RecoveryWeeklyCheckIn[]>;
  upsertRecoveryWeeklyCheckIn(userId: number, checkIn: InsertRecoveryWeeklyCheckIn): Promise<RecoveryWeeklyCheckIn>;
  deleteRecoveryWeeklyCheckIn(userId: number, caseId: string, week: number): Promise<void>;
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return results.length > 0 ? results[0] : undefined;
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<User> {
    const result = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const result = await db
      .insert(passwordResetTokens)
      .values(token)
      .returning();
    return result[0];
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const results = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return results.length > 0 ? results[0] : undefined;
  }

  async markPasswordResetTokenUsed(tokenId: number): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, tokenId));
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

  async getGeneratedDocumentsBySession(sessionId: string, userId?: number): Promise<GeneratedDocument[]> {
    const conditions = [eq(generatedDocuments.sessionId, sessionId)];
    if (userId !== undefined) {
      conditions.push(eq(generatedDocuments.userId, userId));
    }
    
    return await db
      .select()
      .from(generatedDocuments)
      .where(
        conditions.length > 1 ? and(...conditions) : conditions[0]
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
    data: { 
      customerId?: string; 
      subscriptionId?: string;
      priceId?: string;
      tier?: "basic" | "standard" | "premium";
      status?: string;
    }
  ): Promise<User> {
    const updateData: any = {};
    if (data.customerId !== undefined) updateData.stripeCustomerId = data.customerId;
    if (data.subscriptionId !== undefined) updateData.stripeSubscriptionId = data.subscriptionId;
    if (data.priceId !== undefined) updateData.stripePriceId = data.priceId;
    if (data.tier !== undefined) updateData.membershipTier = data.tier;
    if (data.status !== undefined) updateData.subscriptionStatus = data.status;

    const result = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async updateUser(userId: number, data: Partial<User>): Promise<User> {
    const result = await db
      .update(users)
      .set(data as any)
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async updateUserSubscription(userId: number, data: {
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
    membershipTier?: string;
    subscriptionStatus?: string;
    isOnTrial?: boolean;
    trialStartDate?: Date;
    trialEndDate?: Date;
    hasUsedTrial?: boolean;
    onboardingRequired?: boolean;
  }): Promise<User> {
    const updateData: any = {};
    if (data.stripeSubscriptionId !== undefined) updateData.stripeSubscriptionId = data.stripeSubscriptionId;
    if (data.stripeCustomerId !== undefined) updateData.stripeCustomerId = data.stripeCustomerId;
    if (data.membershipTier !== undefined) updateData.membershipTier = data.membershipTier;
    if (data.subscriptionStatus !== undefined) updateData.subscriptionStatus = data.subscriptionStatus;
    if (data.isOnTrial !== undefined) updateData.isOnTrial = data.isOnTrial;
    if (data.trialStartDate !== undefined) updateData.trialStartDate = data.trialStartDate;
    if (data.trialEndDate !== undefined) updateData.trialEndDate = data.trialEndDate;
    if (data.hasUsedTrial !== undefined) updateData.hasUsedTrial = data.hasUsedTrial;
    if (data.onboardingRequired !== undefined) updateData.onboardingRequired = data.onboardingRequired;

    const result = await db
      .update(users)
      .set(updateData)
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

  // ============================================
  // Exercise Program Methods
  // ============================================

  async createExerciseProgram(program: InsertExerciseProgram): Promise<ExerciseProgram> {
    const result = await db.insert(exercisePrograms).values(program).returning();
    return result[0];
  }

  async getExerciseProgram(id: number): Promise<ExerciseProgram | undefined> {
    const result = await db.select().from(exercisePrograms).where(eq(exercisePrograms.id, id));
    return result[0];
  }

  async getUserExercisePrograms(userId: number): Promise<ExerciseProgram[]> {
    return await db
      .select()
      .from(exercisePrograms)
      .where(eq(exercisePrograms.createdBy, userId))
      .orderBy(desc(exercisePrograms.createdAt));
  }

  async getPublicExercisePrograms(): Promise<ExerciseProgram[]> {
    return await db
      .select()
      .from(exercisePrograms)
      .where(eq(exercisePrograms.isPublic, true))
      .orderBy(desc(exercisePrograms.createdAt));
  }

  async updateExerciseProgram(id: number, data: Partial<InsertExerciseProgram>): Promise<ExerciseProgram> {
    const result = await db
      .update(exercisePrograms)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(exercisePrograms.id, id))
      .returning();
    return result[0];
  }

  async deleteExerciseProgram(id: number): Promise<void> {
    await db.delete(exercisePrograms).where(eq(exercisePrograms.id, id));
  }

  // Program Exercise Methods
  async addProgramExercise(exercise: InsertProgramExercise): Promise<ProgramExercise> {
    const result = await db.insert(programExercises).values(exercise).returning();
    return result[0];
  }

  async getProgramExercises(programId: number): Promise<ProgramExercise[]> {
    return await db
      .select()
      .from(programExercises)
      .where(eq(programExercises.programId, programId))
      .orderBy(programExercises.orderIndex);
  }

  async updateProgramExercise(id: number, data: Partial<InsertProgramExercise>): Promise<ProgramExercise> {
    const result = await db
      .update(programExercises)
      .set(data)
      .where(eq(programExercises.id, id))
      .returning();
    return result[0];
  }

  async removeProgramExercise(id: number): Promise<void> {
    await db.delete(programExercises).where(eq(programExercises.id, id));
  }

  async reorderProgramExercises(programId: number, exerciseIds: number[]): Promise<void> {
    // Update order index for each exercise
    for (let i = 0; i < exerciseIds.length; i++) {
      await db
        .update(programExercises)
        .set({ orderIndex: i })
        .where(and(
          eq(programExercises.id, exerciseIds[i]),
          eq(programExercises.programId, programId)
        ));
    }
  }

  // Exercise Template Methods
  async createExerciseTemplate(template: InsertExerciseTemplate): Promise<ExerciseTemplate> {
    const result = await db.insert(exerciseTemplates).values(template).returning();
    return result[0];
  }

  async getExerciseTemplate(id: number): Promise<ExerciseTemplate | undefined> {
    const result = await db.select().from(exerciseTemplates).where(eq(exerciseTemplates.id, id));
    return result[0];
  }

  async getExerciseTemplates(filters?: { bodyPart?: string; category?: string; condition?: string }): Promise<ExerciseTemplate[]> {
    let query = db.select().from(exerciseTemplates).where(eq(exerciseTemplates.isPublic, true));
    
    // Apply filters if provided
    const conditions = [];
    if (filters?.bodyPart) {
      conditions.push(eq(exerciseTemplates.bodyPart, filters.bodyPart as any));
    }
    if (filters?.category) {
      conditions.push(eq(exerciseTemplates.category, filters.category));
    }
    if (filters?.condition) {
      conditions.push(eq(exerciseTemplates.condition, filters.condition));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(exerciseTemplates.popularity));
  }

  async updateExerciseTemplate(id: number, data: Partial<InsertExerciseTemplate>): Promise<ExerciseTemplate> {
    const result = await db
      .update(exerciseTemplates)
      .set(data)
      .where(eq(exerciseTemplates.id, id))
      .returning();
    return result[0];
  }

  async incrementTemplatePopularity(id: number): Promise<void> {
    await db
      .update(exerciseTemplates)
      .set({ popularity: sql`${exerciseTemplates.popularity} + 1` })
      .where(eq(exerciseTemplates.id, id));
  }

  // Exercise Assignment Methods
  async createExerciseAssignment(assignment: InsertExerciseAssignment): Promise<ExerciseAssignment> {
    const result = await db.insert(exerciseAssignments).values(assignment).returning();
    return result[0];
  }

  async getExerciseAssignment(id: number): Promise<ExerciseAssignment | undefined> {
    const result = await db.select().from(exerciseAssignments).where(eq(exerciseAssignments.id, id));
    return result[0];
  }

  async getPatientAssignments(patientId: number): Promise<ExerciseAssignment[]> {
    return await db
      .select()
      .from(exerciseAssignments)
      .where(eq(exerciseAssignments.patientId, patientId))
      .orderBy(desc(exerciseAssignments.createdAt));
  }

  async getPractitionerAssignments(practitionerId: number): Promise<ExerciseAssignment[]> {
    return await db
      .select()
      .from(exerciseAssignments)
      .where(eq(exerciseAssignments.assignedBy, practitionerId))
      .orderBy(desc(exerciseAssignments.createdAt));
  }

  async updateExerciseAssignment(id: number, data: Partial<InsertExerciseAssignment>): Promise<ExerciseAssignment> {
    const result = await db
      .update(exerciseAssignments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(exerciseAssignments.id, id))
      .returning();
    return result[0];
  }

  // Exercise Progress Methods
  async recordExerciseProgress(progress: InsertExerciseProgress): Promise<ExerciseProgress> {
    const result = await db.insert(exerciseProgress).values(progress).returning();
    return result[0];
  }

  async getExerciseProgress(assignmentId: number, exerciseId?: number): Promise<ExerciseProgress[]> {
    let query = db.select().from(exerciseProgress).where(eq(exerciseProgress.assignmentId, assignmentId));
    
    if (exerciseId) {
      query = query.where(eq(exerciseProgress.exerciseId, exerciseId));
    }
    
    return await query.orderBy(desc(exerciseProgress.date));
  }

  async getProgressByDate(assignmentId: number, date: string): Promise<ExerciseProgress[]> {
    return await db
      .select()
      .from(exerciseProgress)
      .where(and(
        eq(exerciseProgress.assignmentId, assignmentId),
        eq(exerciseProgress.date, date)
      ))
      .orderBy(exerciseProgress.exerciseId);
  }

  async updateExerciseProgress(id: number, data: Partial<InsertExerciseProgress>): Promise<ExerciseProgress> {
    const result = await db
      .update(exerciseProgress)
      .set(data)
      .where(eq(exerciseProgress.id, id))
      .returning();
    return result[0];
  }

  // Exercise Image Methods
  async createExerciseImage(image: InsertExerciseImage): Promise<ExerciseImage> {
    const result = await db.insert(exerciseImages).values(image).returning();
    return result[0];
  }

  async getExerciseImage(id: number): Promise<ExerciseImage | undefined> {
    const result = await db
      .select()
      .from(exerciseImages)
      .where(eq(exerciseImages.id, id))
      .limit(1);
    return result[0];
  }

  async getExerciseImageByName(exerciseName: string): Promise<ExerciseImage | undefined> {
    const result = await db
      .select()
      .from(exerciseImages)
      .where(eq(exerciseImages.exerciseName, exerciseName))
      .limit(1);
    return result[0];
  }

  async getExerciseImagesByBodyPart(bodyPart: string): Promise<ExerciseImage[]> {
    return await db
      .select()
      .from(exerciseImages)
      .where(and(
        eq(exerciseImages.bodyPart as any, bodyPart),
        eq(exerciseImages.isActive, true)
      ))
      .orderBy(exerciseImages.exerciseName);
  }

  async getExerciseImagesByCategory(category: string): Promise<ExerciseImage[]> {
    return await db
      .select()
      .from(exerciseImages)
      .where(and(
        eq(exerciseImages.category, category),
        eq(exerciseImages.isActive, true)
      ))
      .orderBy(exerciseImages.exerciseName);
  }

  async searchExerciseImages(searchTerm: string): Promise<ExerciseImage[]> {
    const searchPattern = `%${searchTerm.toLowerCase()}%`;
    return await db
      .select()
      .from(exerciseImages)
      .where(and(
        or(
          ilike(exerciseImages.exerciseName, searchPattern),
          sql`${exerciseImages.alternativeNames}::text ILIKE ${searchPattern}`,
          sql`${exerciseImages.tags}::text ILIKE ${searchPattern}`,
          ilike(exerciseImages.equipment || '', searchPattern)
        ),
        eq(exerciseImages.isActive, true)
      ))
      .orderBy(exerciseImages.exerciseName);
  }

  async bulkCreateExerciseImages(images: InsertExerciseImage[]): Promise<ExerciseImage[]> {
    const result = await db.insert(exerciseImages).values(images).returning();
    return result;
  }

  async updateExerciseImage(id: number, data: Partial<InsertExerciseImage>): Promise<ExerciseImage> {
    const result = await db
      .update(exerciseImages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(exerciseImages.id, id))
      .returning();
    return result[0];
  }

  // Temporary SOAP Notes Methods (24-hour expiry)
  async createTemporarySoapNote(note: InsertTemporarySoapNote): Promise<TemporarySoapNote> {
    try {
      // Set expiry to 24 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const result = await db
        .insert(temporarySoapNotes)
        .values({
          ...note,
          expiresAt,
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error("Error creating temporary SOAP note:", error);
      throw error;
    }
  }

  async getTemporarySoapNote(id: number): Promise<TemporarySoapNote | undefined> {
    try {
      const result = await db
        .select()
        .from(temporarySoapNotes)
        .where(and(
          eq(temporarySoapNotes.id, id),
          sql`${temporarySoapNotes.expiresAt} > NOW()`
        ))
        .limit(1);

      // Update last accessed time if found
      if (result[0]) {
        await db
          .update(temporarySoapNotes)
          .set({ lastAccessedAt: new Date() })
          .where(eq(temporarySoapNotes.id, id));
      }

      return result[0];
    } catch (error) {
      console.error("Error fetching temporary SOAP note:", error);
      throw error;
    }
  }

  async getTemporarySoapNoteBySession(sessionId: string, userId: number): Promise<TemporarySoapNote[]> {
    try {
      const result = await db
        .select()
        .from(temporarySoapNotes)
        .where(and(
          eq(temporarySoapNotes.sessionId, sessionId),
          eq(temporarySoapNotes.userId, userId),
          sql`${temporarySoapNotes.expiresAt} > NOW()`
        ))
        .orderBy(temporarySoapNotes.noteOrder);

      return result;
    } catch (error) {
      console.error("Error fetching temporary SOAP notes by session:", error);
      throw error;
    }
  }

  async getUserTemporarySoapNotes(userId: number): Promise<TemporarySoapNote[]> {
    try {
      const result = await db
        .select()
        .from(temporarySoapNotes)
        .where(and(
          eq(temporarySoapNotes.userId, userId),
          sql`${temporarySoapNotes.expiresAt} > NOW()`
        ))
        .orderBy(desc(temporarySoapNotes.createdAt));

      return result;
    } catch (error) {
      console.error("Error fetching user temporary SOAP notes:", error);
      throw error;
    }
  }

  async updateTemporarySoapNote(id: number, data: Partial<InsertTemporarySoapNote>): Promise<TemporarySoapNote> {
    try {
      const result = await db
        .update(temporarySoapNotes)
        .set({
          ...data,
          updatedAt: new Date(),
          lastAccessedAt: new Date(),
        })
        .where(and(
          eq(temporarySoapNotes.id, id),
          sql`${temporarySoapNotes.expiresAt} > NOW()`
        ))
        .returning();

      if (!result[0]) {
        throw new Error("Temporary SOAP note not found or expired");
      }

      return result[0];
    } catch (error) {
      console.error("Error updating temporary SOAP note:", error);
      throw error;
    }
  }

  async deleteExpiredTemporarySoapNotes(): Promise<void> {
    try {
      await db
        .delete(temporarySoapNotes)
        .where(sql`${temporarySoapNotes.expiresAt} <= NOW()`);
    } catch (error) {
      console.error("Error deleting expired temporary SOAP notes:", error);
      throw error;
    }
  }

  async deleteTemporarySoapNote(id: number): Promise<void> {
    try {
      await db
        .delete(temporarySoapNotes)
        .where(eq(temporarySoapNotes.id, id));
    } catch (error) {
      console.error("Error deleting temporary SOAP note:", error);
      throw error;
    }
  }

  async navigateTemporarySoapNote(currentId: number, direction: 'previous' | 'next'): Promise<TemporarySoapNote | undefined> {
    try {
      // Get the current note to find its session and order
      const currentNote = await this.getTemporarySoapNote(currentId);
      if (!currentNote) return undefined;

      // Get the next or previous note in the same session
      const operator = direction === 'next' ? '>' : '<';
      const orderDirection = direction === 'next' ? 'asc' : 'desc';

      const result = await db
        .select()
        .from(temporarySoapNotes)
        .where(and(
          eq(temporarySoapNotes.sessionId, currentNote.sessionId),
          eq(temporarySoapNotes.userId, currentNote.userId),
          sql`${temporarySoapNotes.noteOrder} ${sql.raw(operator)} ${currentNote.noteOrder}`,
          sql`${temporarySoapNotes.expiresAt} > NOW()`
        ))
        .orderBy(
          direction === 'next' 
            ? temporarySoapNotes.noteOrder 
            : desc(temporarySoapNotes.noteOrder)
        )
        .limit(1);

      return result[0];
    } catch (error) {
      console.error(`Error navigating to ${direction} temporary SOAP note:`, error);
      throw error;
    }
  }

  async getLatestTemporarySoapNote(userId: number, sessionId: string): Promise<TemporarySoapNote | undefined> {
    try {
      const result = await db
        .select()
        .from(temporarySoapNotes)
        .where(and(
          eq(temporarySoapNotes.userId, userId),
          eq(temporarySoapNotes.sessionId, sessionId),
          sql`${temporarySoapNotes.expiresAt} > NOW()`
        ))
        .orderBy(desc(temporarySoapNotes.noteOrder))
        .limit(1);

      return result[0];
    } catch (error) {
      console.error("Error fetching latest temporary SOAP note:", error);
      throw error;
    }
  }
  
  // Cached Exercise Methods (ExerciseDB API)
  async createCachedExercise(exercise: InsertCachedExercise): Promise<CachedExercise> {
    const result = await db.insert(cachedExercises).values(exercise).returning();
    return result[0];
  }

  async getCachedExercise(id: number): Promise<CachedExercise | undefined> {
    const result = await db
      .select()
      .from(cachedExercises)
      .where(eq(cachedExercises.id, id))
      .limit(1);
    return result[0];
  }

  async getCachedExerciseByExternalId(externalId: string): Promise<CachedExercise | undefined> {
    const result = await db
      .select()
      .from(cachedExercises)
      .where(eq(cachedExercises.externalId, externalId))
      .limit(1);
    return result[0];
  }

  async getCachedExercisesByBodyPart(bodyPart: string): Promise<CachedExercise[]> {
    return await db
      .select()
      .from(cachedExercises)
      .where(and(
        eq(cachedExercises.bodyPart, bodyPart),
        eq(cachedExercises.isActive, true)
      ))
      .orderBy(cachedExercises.name);
  }

  async getCachedExercisesByEquipment(equipment: string): Promise<CachedExercise[]> {
    return await db
      .select()
      .from(cachedExercises)
      .where(and(
        eq(cachedExercises.equipment, equipment),
        eq(cachedExercises.isActive, true)
      ))
      .orderBy(cachedExercises.name);
  }

  async getCachedExercisesByTarget(target: string): Promise<CachedExercise[]> {
    return await db
      .select()
      .from(cachedExercises)
      .where(and(
        eq(cachedExercises.target, target),
        eq(cachedExercises.isActive, true)
      ))
      .orderBy(cachedExercises.name);
  }

  async searchCachedExercises(searchTerm: string): Promise<CachedExercise[]> {
    const searchPattern = `%${searchTerm}%`;
    
    return await db
      .select()
      .from(cachedExercises)
      .where(and(
        or(
          ilike(cachedExercises.name, searchPattern),
          ilike(cachedExercises.bodyPart, searchPattern),
          ilike(cachedExercises.target, searchPattern),
          ilike(cachedExercises.equipment, searchPattern),
          ilike(cachedExercises.category || '', searchPattern)
        ),
        eq(cachedExercises.isActive, true)
      ))
      .orderBy(cachedExercises.name);
  }

  async getAllCachedExercises(limit: number = 100): Promise<CachedExercise[]> {
    return await db
      .select()
      .from(cachedExercises)
      .where(eq(cachedExercises.isActive, true))
      .orderBy(cachedExercises.name)
      .limit(limit);
  }

  async bulkCreateCachedExercises(exercises: InsertCachedExercise[]): Promise<CachedExercise[]> {
    if (exercises.length === 0) return [];
    const result = await db.insert(cachedExercises).values(exercises).returning();
    return result;
  }

  async updateCachedExercise(id: number, data: Partial<InsertCachedExercise>): Promise<CachedExercise> {
    const result = await db
      .update(cachedExercises)
      .set(data)
      .where(eq(cachedExercises.id, id))
      .returning();
    return result[0];
  }

  // Education Hub Implementation
  // Course Operations
  async createCourse(course: InsertCourse): Promise<Course> {
    const result = await db.insert(courses).values(course).returning();
    return result[0];
  }

  async getCourse(id: number): Promise<Course | undefined> {
    const result = await db
      .select()
      .from(courses)
      .where(eq(courses.id, id))
      .limit(1);
    return result[0];
  }

  async getCourses(filters?: { difficulty?: string; bodyPart?: string; status?: string }): Promise<Course[]> {
    let query = db.select().from(courses);
    
    if (filters) {
      const conditions = [];
      if (filters.difficulty) conditions.push(eq(courses.difficulty, filters.difficulty as any));
      if (filters.bodyPart) conditions.push(eq(courses.bodyPart, filters.bodyPart as any));
      if (filters.status) conditions.push(eq(courses.status, filters.status as any));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return await query.orderBy(courses.createdAt);
  }

  async getUserCreatedCourses(userId: number): Promise<Course[]> {
    return await db
      .select()
      .from(courses)
      .where(eq(courses.createdBy, userId))
      .orderBy(courses.createdAt);
  }

  async updateCourse(id: number, data: Partial<InsertCourse>): Promise<Course> {
    const result = await db
      .update(courses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    return result[0];
  }

  async deleteCourse(id: number): Promise<void> {
    await db.delete(courses).where(eq(courses.id, id));
  }
  
  // User Enrollment Operations (basic implementation)
  async enrollUserInCourse(enrollment: InsertUserEnrollment): Promise<UserEnrollment> {
    const result = await db.insert(userEnrollments).values(enrollment).returning();
    return result[0];
  }

  async getUserEnrollment(userId: number, courseId: number): Promise<UserEnrollment | undefined> {
    const result = await db
      .select()
      .from(userEnrollments)
      .where(and(eq(userEnrollments.userId, userId), eq(userEnrollments.courseId, courseId)))
      .limit(1);
    return result[0];
  }

  async getUserEnrollments(userId: number): Promise<UserEnrollment[]> {
    return await db
      .select()
      .from(userEnrollments)
      .where(eq(userEnrollments.userId, userId))
      .orderBy(userEnrollments.enrolledAt);
  }

  async getCourseEnrollments(courseId: number): Promise<UserEnrollment[]> {
    return await db
      .select()
      .from(userEnrollments)
      .where(eq(userEnrollments.courseId, courseId))
      .orderBy(userEnrollments.enrolledAt);
  }

  async updateUserEnrollment(id: number, data: Partial<InsertUserEnrollment>): Promise<UserEnrollment> {
    const result = await db
      .update(userEnrollments)
      .set(data)
      .where(eq(userEnrollments.id, id))
      .returning();
    return result[0];
  }

  async dropUserFromCourse(userId: number, courseId: number): Promise<void> {
    await db
      .update(userEnrollments)
      .set({ status: "dropped" })
      .where(and(eq(userEnrollments.userId, userId), eq(userEnrollments.courseId, courseId)));
  }

  // Course Module Operations
  async createCourseModule(module: InsertCourseModule): Promise<CourseModule> {
    const result = await db.insert(courseModules).values(module).returning();
    return result[0];
  }

  async getCourseModule(id: number): Promise<CourseModule | undefined> {
    const result = await db
      .select()
      .from(courseModules)
      .where(eq(courseModules.id, id))
      .limit(1);
    return result[0];
  }

  async getCourseModules(courseId: number): Promise<CourseModule[]> {
    return await db
      .select()
      .from(courseModules)
      .where(eq(courseModules.courseId, courseId))
      .orderBy(courseModules.orderIndex);
  }

  async updateCourseModule(id: number, data: Partial<InsertCourseModule>): Promise<CourseModule> {
    const result = await db
      .update(courseModules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(courseModules.id, id))
      .returning();
    return result[0];
  }

  async deleteCourseModule(id: number): Promise<void> {
    await db.delete(courseModules).where(eq(courseModules.id, id));
  }

  async reorderCourseModules(courseId: number, moduleIds: number[]): Promise<void> {
    for (let i = 0; i < moduleIds.length; i++) {
      await db
        .update(courseModules)
        .set({ orderIndex: i + 1 })
        .where(eq(courseModules.id, moduleIds[i]));
    }
  }

  // Module Progress Operations
  async createModuleProgress(progress: InsertModuleProgress): Promise<ModuleProgress> {
    const result = await db.insert(moduleProgress).values(progress).returning();
    return result[0];
  }

  async getModuleProgress(userId: number, moduleId: number): Promise<ModuleProgress | undefined> {
    const result = await db
      .select()
      .from(moduleProgress)
      .where(and(eq(moduleProgress.userId, userId), eq(moduleProgress.moduleId, moduleId)))
      .limit(1);
    return result[0];
  }

  async getUserModuleProgress(userId: number, courseId: number): Promise<ModuleProgress[]> {
    return await db
      .select()
      .from(moduleProgress)
      .innerJoin(courseModules, eq(moduleProgress.moduleId, courseModules.id))
      .where(and(eq(moduleProgress.userId, userId), eq(courseModules.courseId, courseId)))
      .orderBy(courseModules.orderIndex);
  }

  async updateModuleProgress(id: number, data: Partial<InsertModuleProgress>): Promise<ModuleProgress> {
    const result = await db
      .update(moduleProgress)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(moduleProgress.id, id))
      .returning();
    return result[0];
  }

  async markModuleCompleted(userId: number, moduleId: number): Promise<ModuleProgress> {
    const existing = await this.getModuleProgress(userId, moduleId);
    if (existing) {
      return await this.updateModuleProgress(existing.id, {
        isCompleted: true,
        completedAt: new Date(),
        progress: 100
      });
    } else {
      return await this.createModuleProgress({
        userId,
        moduleId,
        isCompleted: true,
        completedAt: new Date(),
        progress: 100
      });
    }
  }

  // Assessment Operations
  async createAssessment(assessment: InsertAssessment): Promise<Assessment> {
    const result = await db.insert(assessments).values(assessment).returning();
    return result[0];
  }

  async getAssessment(id: number): Promise<Assessment | undefined> {
    const result = await db
      .select()
      .from(assessments)
      .where(eq(assessments.id, id))
      .limit(1);
    return result[0];
  }

  async getModuleAssessments(moduleId: number): Promise<Assessment[]> {
    return await db
      .select()
      .from(assessments)
      .where(eq(assessments.moduleId, moduleId))
      .orderBy(assessments.createdAt);
  }

  async updateAssessment(id: number, data: Partial<InsertAssessment>): Promise<Assessment> {
    const result = await db
      .update(assessments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(assessments.id, id))
      .returning();
    return result[0];
  }

  async deleteAssessment(id: number): Promise<void> {
    await db.delete(assessments).where(eq(assessments.id, id));
  }
  // Assessment Attempt Operations
  async createAssessmentAttempt(attempt: InsertAssessmentAttempt): Promise<AssessmentAttempt> {
    const result = await db.insert(assessmentAttempts).values(attempt).returning();
    return result[0];
  }

  async getAssessmentAttempt(id: number): Promise<AssessmentAttempt | undefined> {
    const result = await db
      .select()
      .from(assessmentAttempts)
      .where(eq(assessmentAttempts.id, id))
      .limit(1);
    return result[0];
  }

  async getUserAssessmentAttempts(userId: number, assessmentId: number): Promise<AssessmentAttempt[]> {
    return await db
      .select()
      .from(assessmentAttempts)
      .where(and(eq(assessmentAttempts.userId, userId), eq(assessmentAttempts.assessmentId, assessmentId)))
      .orderBy(assessmentAttempts.attemptedAt);
  }

  async updateAssessmentAttempt(id: number, data: Partial<InsertAssessmentAttempt>): Promise<AssessmentAttempt> {
    const result = await db
      .update(assessmentAttempts)
      .set(data)
      .where(eq(assessmentAttempts.id, id))
      .returning();
    return result[0];
  }

  // Certificate Operations
  async createCertificate(certificate: InsertCertificate): Promise<Certificate> {
    const result = await db.insert(certificates).values(certificate).returning();
    return result[0];
  }

  async getCertificate(id: number): Promise<Certificate | undefined> {
    const result = await db
      .select()
      .from(certificates)
      .where(eq(certificates.id, id))
      .limit(1);
    return result[0];
  }

  async getUserCertificates(userId: number): Promise<Certificate[]> {
    return await db
      .select()
      .from(certificates)
      .where(eq(certificates.userId, userId))
      .orderBy(certificates.issuedAt);
  }

  async getCourseCertificates(courseId: number): Promise<Certificate[]> {
    return await db
      .select()
      .from(certificates)
      .where(eq(certificates.courseId, courseId))
      .orderBy(certificates.issuedAt);
  }

  async verifyCertificate(certificateNumber: string): Promise<Certificate | undefined> {
    const result = await db
      .select()
      .from(certificates)
      .where(eq(certificates.certificateNumber, certificateNumber))
      .limit(1);
    return result[0];
  }

  // Interactive Education Features Implementation
  
  // Notes Operations
  async createCourseSectionNote(note: InsertCourseSectionNote): Promise<CourseSectionNote> {
    const result = await db.insert(courseSectionNotes).values(note).returning();
    return result[0];
  }

  async getCourseSectionNote(userId: number, courseId: number, moduleId: number, sectionIndex: number): Promise<CourseSectionNote | undefined> {
    const result = await db
      .select()
      .from(courseSectionNotes)
      .where(and(
        eq(courseSectionNotes.userId, userId),
        eq(courseSectionNotes.courseId, courseId),
        eq(courseSectionNotes.moduleId, moduleId),
        eq(courseSectionNotes.sectionIndex, sectionIndex)
      ))
      .limit(1);
    return result[0];
  }

  async updateCourseSectionNote(id: number, data: Partial<InsertCourseSectionNote>): Promise<CourseSectionNote> {
    const result = await db
      .update(courseSectionNotes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(courseSectionNotes.id, id))
      .returning();
    return result[0];
  }

  async getUserCourseSectionNotes(userId: number, courseId: number): Promise<CourseSectionNote[]> {
    return await db
      .select()
      .from(courseSectionNotes)
      .where(and(eq(courseSectionNotes.userId, userId), eq(courseSectionNotes.courseId, courseId)))
      .orderBy(desc(courseSectionNotes.updatedAt));
  }

  // Discussion Operations
  async createCourseSectionDiscussion(discussion: InsertCourseSectionDiscussion): Promise<CourseSectionDiscussion> {
    const result = await db.insert(courseSectionDiscussions).values(discussion).returning();
    return result[0];
  }

  async getCourseSectionDiscussions(courseId: number, moduleId: number, sectionIndex: number): Promise<CourseSectionDiscussion[]> {
    return await db
      .select()
      .from(courseSectionDiscussions)
      .where(and(
        eq(courseSectionDiscussions.courseId, courseId),
        eq(courseSectionDiscussions.moduleId, moduleId),
        eq(courseSectionDiscussions.sectionIndex, sectionIndex),
        isNull(courseSectionDiscussions.parentId)
      ))
      .orderBy(desc(courseSectionDiscussions.upvotes), desc(courseSectionDiscussions.createdAt));
  }

  async updateCourseSectionDiscussion(id: number, data: Partial<InsertCourseSectionDiscussion>): Promise<CourseSectionDiscussion> {
    const result = await db
      .update(courseSectionDiscussions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(courseSectionDiscussions.id, id))
      .returning();
    return result[0];
  }

  async deleteCourseSectionDiscussion(id: number): Promise<void> {
    await db.delete(courseSectionDiscussions).where(eq(courseSectionDiscussions.id, id));
  }

  async upvoteDiscussion(discussionId: number, userId: number): Promise<CourseSectionDiscussion> {
    // First, check if already upvoted
    const existingUpvote = await db
      .select()
      .from(discussionUpvoteTracking)
      .where(and(
        eq(discussionUpvoteTracking.discussionId, discussionId),
        eq(discussionUpvoteTracking.userId, userId)
      ))
      .limit(1);

    if (existingUpvote.length === 0) {
      // Add upvote tracking
      await db.insert(discussionUpvoteTracking).values({ discussionId, userId });
      
      // Increment upvote count
      const result = await db
        .update(courseSectionDiscussions)
        .set({ 
          upvotes: sql`${courseSectionDiscussions.upvotes} + 1`,
          updatedAt: new Date()
        })
        .where(eq(courseSectionDiscussions.id, discussionId))
        .returning();
      return result[0];
    }

    // Return unchanged if already upvoted
    const result = await db
      .select()
      .from(courseSectionDiscussions)
      .where(eq(courseSectionDiscussions.id, discussionId))
      .limit(1);
    return result[0];
  }

  async removeUpvoteDiscussion(discussionId: number, userId: number): Promise<CourseSectionDiscussion> {
    // Remove upvote tracking
    await db
      .delete(discussionUpvoteTracking)
      .where(and(
        eq(discussionUpvoteTracking.discussionId, discussionId),
        eq(discussionUpvoteTracking.userId, userId)
      ));

    // Decrement upvote count
    const result = await db
      .update(courseSectionDiscussions)
      .set({ 
        upvotes: sql`GREATEST(0, ${courseSectionDiscussions.upvotes} - 1)`,
        updatedAt: new Date()
      })
      .where(eq(courseSectionDiscussions.id, discussionId))
      .returning();
    return result[0];
  }

  async getUserDiscussionUpvotes(userId: number, discussionIds: number[]): Promise<number[]> {
    if (discussionIds.length === 0) return [];
    
    const upvotes = await db
      .select({ discussionId: discussionUpvoteTracking.discussionId })
      .from(discussionUpvoteTracking)
      .where(and(
        eq(discussionUpvoteTracking.userId, userId),
        sql`${discussionUpvoteTracking.discussionId} = ANY(${discussionIds})`
      ));
    
    return upvotes.map(u => u.discussionId);
  }

  // Flashcard Operations
  async createCourseFlashcard(flashcard: InsertCourseFlashcard): Promise<CourseFlashcard> {
    const result = await db.insert(courseFlashcards).values(flashcard).returning();
    return result[0];
  }

  async getCourseFlashcard(id: number): Promise<CourseFlashcard | undefined> {
    const result = await db
      .select()
      .from(courseFlashcards)
      .where(eq(courseFlashcards.id, id))
      .limit(1);
    return result[0];
  }

  async getUserCourseFlashcards(userId: number, courseId: number): Promise<CourseFlashcard[]> {
    return await db
      .select()
      .from(courseFlashcards)
      .where(and(eq(courseFlashcards.userId, userId), eq(courseFlashcards.courseId, courseId)))
      .orderBy(courseFlashcards.createdAt);
  }

  async updateCourseFlashcard(id: number, data: Partial<InsertCourseFlashcard>): Promise<CourseFlashcard> {
    const result = await db
      .update(courseFlashcards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(courseFlashcards.id, id))
      .returning();
    return result[0];
  }

  async deleteCourseFlashcard(id: number): Promise<void> {
    await db.delete(courseFlashcards).where(eq(courseFlashcards.id, id));
  }

  async getDueFlashcards(userId: number, courseId: number): Promise<CourseFlashcard[]> {
    const now = new Date().toISOString();
    return await db
      .select()
      .from(courseFlashcards)
      .where(and(
        eq(courseFlashcards.userId, userId),
        eq(courseFlashcards.courseId, courseId),
        sql`(${courseFlashcards.srsData}->>'dueAt')::timestamp <= ${now}::timestamp`
      ))
      .orderBy(sql`(${courseFlashcards.srsData}->>'dueAt')::timestamp`);
  }

  // Quiz Attempt Operations
  async createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const result = await db.insert(quizAttempts).values(attempt).returning();
    return result[0];
  }

  async getQuizAttempts(userId: number, courseId: number, moduleId: number, sectionIndex: number): Promise<QuizAttempt[]> {
    return await db
      .select()
      .from(quizAttempts)
      .where(and(
        eq(quizAttempts.userId, userId),
        eq(quizAttempts.courseId, courseId),
        eq(quizAttempts.moduleId, moduleId),
        eq(quizAttempts.sectionIndex, sectionIndex)
      ))
      .orderBy(quizAttempts.createdAt);
  }

  async getQuestionAttempts(userId: number, courseId: number, moduleId: number, sectionIndex: number, questionId: string): Promise<QuizAttempt[]> {
    return await db
      .select()
      .from(quizAttempts)
      .where(and(
        eq(quizAttempts.userId, userId),
        eq(quizAttempts.courseId, courseId),
        eq(quizAttempts.moduleId, moduleId),
        eq(quizAttempts.sectionIndex, sectionIndex),
        eq(quizAttempts.questionId, questionId)
      ))
      .orderBy(quizAttempts.createdAt);
  }

  // Patient Clone Operations
  async createPatientClone(clone: InsertPatientClone): Promise<PatientClone> {
    const result = await db.insert(patientClones).values(clone).returning();
    return result[0];
  }

  async getPatientClone(id: number): Promise<PatientClone | undefined> {
    const result = await db
      .select()
      .from(patientClones)
      .where(eq(patientClones.id, id))
      .limit(1);
    return result[0];
  }

  async getUserPatientClones(userId: number): Promise<PatientClone[]> {
    return await db
      .select()
      .from(patientClones)
      .where(eq(patientClones.userId, userId))
      .orderBy(desc(patientClones.createdAt));
  }

  async updatePatientClone(id: number, data: Partial<InsertPatientClone>): Promise<PatientClone> {
    const result = await db
      .update(patientClones)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(patientClones.id, id))
      .returning();
    return result[0];
  }

  async deletePatientClone(id: number): Promise<void> {
    await db.delete(patientClones).where(eq(patientClones.id, id));
  }

  // Electrophysical Engine condition presets
  async listElectroConditionPresets(userId: number, patientId: number | null): Promise<ElectroConditionPreset[]> {
    return await db
      .select()
      .from(electroConditionPresets)
      .where(
        and(
          eq(electroConditionPresets.userId, userId),
          patientId == null
            ? isNull(electroConditionPresets.patientId)
            : eq(electroConditionPresets.patientId, patientId),
        ),
      )
      .orderBy(desc(electroConditionPresets.lastUsedAt));
  }

  async getElectroConditionPreset(id: number): Promise<ElectroConditionPreset | undefined> {
    const result = await db
      .select()
      .from(electroConditionPresets)
      .where(eq(electroConditionPresets.id, id))
      .limit(1);
    return result[0];
  }

  async upsertElectroConditionPreset(preset: InsertElectroConditionPreset): Promise<ElectroConditionPreset> {
    const existing = await db
      .select()
      .from(electroConditionPresets)
      .where(
        and(
          eq(electroConditionPresets.userId, preset.userId),
          preset.patientId == null
            ? isNull(electroConditionPresets.patientId)
            : eq(electroConditionPresets.patientId, preset.patientId),
          eq(electroConditionPresets.name, preset.name),
        ),
      )
      .limit(1);

    if (existing[0]) {
      const result = await db
        .update(electroConditionPresets)
        .set({
          condition: preset.condition ?? "",
          stage: preset.stage ?? "",
          irritability: preset.irritability ?? "",
          tissueType: preset.tissueType ?? "",
          primaryGoal: preset.primaryGoal ?? "",
          contraindicationFlags: preset.contraindicationFlags ?? [],
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(electroConditionPresets.id, existing[0].id))
        .returning();
      return result[0];
    }

    const result = await db
      .insert(electroConditionPresets)
      .values({ ...preset, lastUsedAt: new Date() })
      .returning();
    return result[0];
  }

  async renameElectroConditionPreset(id: number, name: string): Promise<ElectroConditionPreset> {
    // Enforce (userId, patientId, name) uniqueness explicitly so a rename
    // can't silently collide with another preset in the same scope. The DB
    // also has a UNIQUE NULLS NOT DISTINCT index as a final safety net.
    const current = await this.getElectroConditionPreset(id);
    if (!current) {
      throw new Error('Preset not found');
    }
    if (current.name === name) return current;
    const collision = await db
      .select({ id: electroConditionPresets.id })
      .from(electroConditionPresets)
      .where(
        and(
          eq(electroConditionPresets.userId, current.userId),
          current.patientId == null
            ? isNull(electroConditionPresets.patientId)
            : eq(electroConditionPresets.patientId, current.patientId),
          eq(electroConditionPresets.name, name),
        ),
      )
      .limit(1);
    if (collision[0] && collision[0].id !== id) {
      const err: Error & { code?: string } = new Error(`A preset named "${name}" already exists in this scope`);
      err.code = 'PRESET_NAME_CONFLICT';
      throw err;
    }
    const result = await db
      .update(electroConditionPresets)
      .set({ name, updatedAt: new Date() })
      .where(eq(electroConditionPresets.id, id))
      .returning();
    return result[0];
  }

  async touchElectroConditionPreset(id: number): Promise<void> {
    await db
      .update(electroConditionPresets)
      .set({ lastUsedAt: new Date() })
      .where(eq(electroConditionPresets.id, id));
  }

  async deleteElectroConditionPreset(id: number): Promise<void> {
    await db.delete(electroConditionPresets).where(eq(electroConditionPresets.id, id));
  }

  // ─── Recovery weekly check-ins (Task #241) ──────────────────────
  // All operations are scoped by userId so one clinician's check-ins
  // can never be read or modified by another (IDOR-safe even with
  // guessable case slugs).
  async listRecoveryWeeklyCheckIns(userId: number, caseId: string): Promise<RecoveryWeeklyCheckIn[]> {
    return await db
      .select()
      .from(recoveryWeeklyCheckIns)
      .where(and(
        eq(recoveryWeeklyCheckIns.userId, userId),
        eq(recoveryWeeklyCheckIns.caseId, caseId),
      ))
      .orderBy(recoveryWeeklyCheckIns.week);
  }

  async upsertRecoveryWeeklyCheckIn(userId: number, checkIn: InsertRecoveryWeeklyCheckIn): Promise<RecoveryWeeklyCheckIn> {
    const sleepHoursValue =
      checkIn.sleepHours === null || checkIn.sleepHours === undefined
        ? null
        : typeof checkIn.sleepHours === "number"
        ? String(checkIn.sleepHours)
        : checkIn.sleepHours;
    const values = {
      userId,
      caseId: checkIn.caseId,
      week: checkIn.week,
      pain: checkIn.pain,
      flareSeverity: checkIn.flareSeverity ?? null,
      sessionsCompleted: checkIn.sessionsCompleted,
      sessionsPrescribed: checkIn.sessionsPrescribed,
      sleepHours: sleepHoursValue,
      notes: checkIn.notes ?? null,
    };
    const [row] = await db
      .insert(recoveryWeeklyCheckIns)
      .values(values)
      .onConflictDoUpdate({
        target: [recoveryWeeklyCheckIns.userId, recoveryWeeklyCheckIns.caseId, recoveryWeeklyCheckIns.week],
        set: {
          pain: values.pain,
          flareSeverity: values.flareSeverity,
          sessionsCompleted: values.sessionsCompleted,
          sessionsPrescribed: values.sessionsPrescribed,
          sleepHours: values.sleepHours,
          notes: values.notes,
        },
      })
      .returning();
    return row;
  }

  async deleteRecoveryWeeklyCheckIn(userId: number, caseId: string, week: number): Promise<void> {
    await db
      .delete(recoveryWeeklyCheckIns)
      .where(and(
        eq(recoveryWeeklyCheckIns.userId, userId),
        eq(recoveryWeeklyCheckIns.caseId, caseId),
        eq(recoveryWeeklyCheckIns.week, week),
      ));
  }
}

export const storage = new DatabaseStorage();
