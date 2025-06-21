import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  json,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Visibility enum for notes
export const visibilityEnum = pgEnum("visibility", [
  "private",
  "public",
  "shared",
]);

// Body part category enum
export const bodyPartEnum = pgEnum("body_part", [
  "shoulder",
  "neck",
  "back",
  "elbow",
  "wrist",
  "hand",
  "hip",
  "knee",
  "ankle",
  "foot",
  "general",
  "other",
]);

// Membership tier enum
export const membershipTierEnum = pgEnum("membership_tier", [
  "none",
  "basic",
  "standard",
  "premium",
]);

// Session status enum for tracking recording and processing states
export const sessionStatusEnum = pgEnum("session_status", [
  "draft",
  "recorded",
  "transcribed",
  "processing",
  "completed",
]);

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  fullName: text("full_name"),
  profileImage: text("profile_image"),
  bio: text("bio"),
  membershipTier: membershipTierEnum("membership_tier")
    .default("none")
    .notNull(),
  membershipExpiry: timestamp("membership_expiry"),
  trialStartDate: timestamp("trial_start_date"),
  trialEndDate: timestamp("trial_end_date"),
  hasUsedTrial: boolean("has_used_trial").default(false).notNull(),
  paypalSubscriptionId: text("paypal_subscription_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  // isAdmin will be added in the future via migration
  // isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Clinical Note Schema
export const clinicalNotes = pgTable("clinical_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  patientName: text("patient_name").notNull(),
  patientId: text("patient_id").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  dateOfVisit: text("date_of_visit").notNull(),
  subjective: text("subjective").notNull(),
  objective: text("objective").notNull(),
  assessment: text("assessment").notNull(),
  plan: text("plan").notNull(),
  fullNote: json("full_note").notNull(),
  // For shared/public notes, we'll use these de-identified fields
  condition: text("condition"), // Short description of the condition (no PII)
  ageRange: text("age_range"), // Age range instead of specific DOB
  deIdentifiedNote: json("de_identified_note"), // Version of the note with PII removed
  bodyPart: bodyPartEnum("body_part").default("other"), // Body part category
  visibility: visibilityEnum("visibility").default("private").notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClinicalNoteSchema = createInsertSchema(clinicalNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isArchived: true,
});

// Schema for updating note visibility and de-identification
export const updateNoteVisibilitySchema = z.object({
  visibility: z.enum(["private", "public", "shared"]),
  bodyPart: z
    .enum([
      "shoulder",
      "neck",
      "back",
      "elbow",
      "wrist",
      "hand",
      "hip",
      "knee",
      "ankle",
      "foot",
      "general",
      "other",
    ])
    .default("other"),
  condition: z.string().optional(),
  ageRange: z.string().optional(),
  deIdentifiedNote: z.record(z.any()).optional(),
});

export type InsertClinicalNote = z.infer<typeof insertClinicalNoteSchema>;
export type UpdateNoteVisibility = z.infer<typeof updateNoteVisibilitySchema>;
export type ClinicalNote = typeof clinicalNotes.$inferSelect;

// Comments on clinical notes
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id")
    .notNull()
    .references(() => clinicalNotes.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

// Tags for organizing clinical notes
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Junction table for many-to-many relationship between notes and tags
export const noteTags = pgTable("note_tags", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id")
    .notNull()
    .references(() => clinicalNotes.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
});

// Define relations after all tables are defined
export const userRelations = relations(users, ({ many }) => ({
  clinicalNotes: many(clinicalNotes),
  comments: many(comments),
}));

export const clinicalNoteRelations = relations(
  clinicalNotes,
  ({ one, many }) => ({
    user: one(users, {
      fields: [clinicalNotes.userId],
      references: [users.id],
    }),
    comments: many(comments),
    tags: many(noteTags),
  })
);

export const commentRelations = relations(comments, ({ one, many }) => ({
  note: one(clinicalNotes, {
    fields: [comments.noteId],
    references: [clinicalNotes.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
  }),
  replies: many(comments, { relationName: "replies" }),
}));

export const tagRelations = relations(tags, ({ many }) => ({
  notes: many(noteTags),
}));

export const noteTagsRelations = relations(noteTags, ({ one }) => ({
  note: one(clinicalNotes, {
    fields: [noteTags.noteId],
    references: [clinicalNotes.id],
  }),
  tag: one(tags, {
    fields: [noteTags.tagId],
    references: [tags.id],
  }),
}));

// Research Articles Schema
export const researchArticles = pgTable("research_articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  authors: text("authors").notNull(),
  journal: text("journal").notNull(),
  publicationDate: timestamp("publication_date").notNull(),
  doi: text("doi").notNull().unique(), // Digital Object Identifier (unique identifier for academic articles)
  abstract: text("abstract").notNull(),
  url: text("url").notNull(), // Link to the full article
  bodyPart: bodyPartEnum("body_part").default("general").notNull(), // Body part category
  keyFindings: text("key_findings"), // Summary of key findings
  clinicalRelevance: text("clinical_relevance"), // How this relates to clinical practice
  methodology: text("methodology"), // Study design and methodology
  // AI Gap Analysis fields
  aiAnalysisStatus: text("ai_analysis_status").default("pending"), // pending, analyzing, completed, failed
  qualityScore: integer("quality_score"), // 0-100 overall quality score
  identifiedGaps: json("identified_gaps").$type<{
    methodology: string[];
    statistical: string[];
    clinical: string[];
    bias: string[];
  }>(),
  generatedQuestions: json("generated_questions").$type<{
    critical: string[];
    moderate: string[];
    minor: string[];
  }>(),
  biasAssessment: json("bias_assessment").$type<{
    selectionBias: { score: number; notes: string };
    performanceBias: { score: number; notes: string };
    detectionBias: { score: number; notes: string };
    attritionBias: { score: number; notes: string };
    reportingBias: { score: number; notes: string };
  }>(),
  methodologyAssessment: json("methodology_assessment").$type<{
    sampleSizeAdequacy: { score: number; notes: string };
    studyDesign: { score: number; notes: string };
    outcomeValidation: { score: number; notes: string };
    followUpDuration: { score: number; notes: string };
    statisticalMethods: { score: number; notes: string };
  }>(),
  followUpQuestions: json("follow_up_questions").$type<{
    methodological: Array<{ question: string; priority: number; feasibilityScore: number; rationale: string }>;
    population: Array<{ question: string; priority: number; feasibilityScore: number; rationale: string }>;
    intervention: Array<{ question: string; priority: number; feasibilityScore: number; rationale: string }>;
    outcomes: Array<{ question: string; priority: number; feasibilityScore: number; rationale: string }>;
    mechanisms: Array<{ question: string; priority: number; feasibilityScore: number; rationale: string }>;
  }>(),
  aiAnalyzedAt: timestamp("ai_analyzed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertResearchArticleSchema = createInsertSchema(
  researchArticles
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertResearchArticle = z.infer<typeof insertResearchArticleSchema>;
export type ResearchArticle = typeof researchArticles.$inferSelect;

// Research Discussions Schema
export const researchDiscussions: any = pgTable("research_discussions", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id")
    .notNull()
    .references(() => researchArticles.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parentId: integer("parent_id").references(() => researchDiscussions.id, { onDelete: "cascade" }), // For threaded discussions
  content: text("content").notNull(),
  questionType: text("question_type"), // critical, moderate, minor, general
  isExpertVerified: boolean("is_expert_verified").default(false),
  upvotes: integer("upvotes").default(0),
  downvotes: integer("downvotes").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertResearchDiscussionSchema = createInsertSchema(researchDiscussions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  upvotes: true,
  downvotes: true,
});

export type InsertResearchDiscussion = z.infer<typeof insertResearchDiscussionSchema>;
export type ResearchDiscussion = typeof researchDiscussions.$inferSelect;

// Research Discussion Votes Schema
export const researchDiscussionVotes = pgTable("research_discussion_votes", {
  id: serial("id").primaryKey(),
  discussionId: integer("discussion_id")
    .notNull()
    .references(() => researchDiscussions.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  voteType: text("vote_type").notNull(), // 'up' or 'down'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ResearchDiscussionVote = typeof researchDiscussionVotes.$inferSelect;

// User Research Bookmarks Schema
export const userResearchBookmarks = pgTable("user_research_bookmarks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  articleId: integer("article_id")
    .notNull()
    .references(() => researchArticles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserResearchBookmark = typeof userResearchBookmarks.$inferSelect;

// Define research article relations
export const researchArticleRelations = relations(
  researchArticles,
  ({ many }) => ({
    tags: many(tags),
    discussions: many(researchDiscussions),
    bookmarks: many(userResearchBookmarks),
  })
);

export const researchDiscussionRelations = relations(
  researchDiscussions,
  ({ one, many }) => ({
    article: one(researchArticles, {
      fields: [researchDiscussions.articleId],
      references: [researchArticles.id],
    }),
    user: one(users, {
      fields: [researchDiscussions.userId],
      references: [users.id],
    }),
    parent: one(researchDiscussions, {
      fields: [researchDiscussions.parentId],
      references: [researchDiscussions.id],
    }),
    replies: many(researchDiscussions),
    votes: many(researchDiscussionVotes),
  })
);

// Subscription Plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  tier: membershipTierEnum("tier").notNull(),
  price: text("price").notNull(),
  interval: text("interval").notNull(),
  features: text("features").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(
  subscriptionPlans
).omit({
  id: true,
  createdAt: true,
});

export type InsertSubscriptionPlan = z.infer<
  typeof insertSubscriptionPlanSchema
>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

// Payment Records
export const paymentRecords = pgTable("payment_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planId: integer("plan_id")
    .notNull()
    .references(() => subscriptionPlans.id),
  amount: text("amount").notNull(),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  paymentMethod: text("payment_method").notNull(),
  transactionId: text("transaction_id").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentRecordSchema = createInsertSchema(
  paymentRecords
).omit({
  id: true,
  createdAt: true,
});

export type InsertPaymentRecord = z.infer<typeof insertPaymentRecordSchema>;
export type PaymentRecord = typeof paymentRecords.$inferSelect;

// Define payment relations
export const paymentRecordRelations = relations(paymentRecords, ({ one }) => ({
  user: one(users, {
    fields: [paymentRecords.userId],
    references: [users.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [paymentRecords.planId],
    references: [subscriptionPlans.id],
  }),
}));

// SOAP Note Input Schema
export const soapNoteInputSchema = z.object({
  patientName: z.string().min(1, { message: "Patient name is required" }),
  patientId: z.string().min(1, { message: "Patient ID is required" }),
  dateOfBirth: z.string().min(1, { message: "Date of birth is required" }),
  dateOfVisit: z.string().min(1, { message: "Date of visit is required" }),
  subjective: z
    .string()
    .min(1, { message: "Subjective information is required" }),
  objective: z
    .string()
    .min(1, { message: "Objective information is required" }),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  visibility: z.enum(["private", "public", "shared"]).default("private"),
});

export type SoapNoteInput = z.infer<typeof soapNoteInputSchema>;

// Exercise difficulty enum
export const difficultyEnum = pgEnum("difficulty", [
  "beginner",
  "intermediate",
  "advanced",
]);

// Exercise Library Schema
export const exerciseTypeEnum = pgEnum("exercise_type", [
  "strength", 
  "mobility", 
  "motor control", 
  "functional", 
  "isometric", 
  "eccentric", 
  "neural",
  "sensorimotor",
  "power",
  "endurance",
  "stretching",
  "other"
]);

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  bodyPart: bodyPartEnum("body_part").default("general").notNull(),
  targetMuscles: text("target_muscles").notNull(),
  difficulty: difficultyEnum("difficulty").default("beginner").notNull(),
  exerciseType: exerciseTypeEnum("exercise_type").default("other"),
  instructions: text("instructions").notNull(),
  equipment: text("equipment").array(),
  precautions: text("precautions"),
  repetitions: text("repetitions"),
  sets: text("sets"),
  duration: text("duration"),
  restPeriod: text("rest_period"),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  aiGenerated: boolean("ai_generated").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertExerciseSchema = createInsertSchema(exercises).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Exercise = typeof exercises.$inferSelect;

// Patient Session Schema
export const patientSessions = pgTable("patient_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionName: text("session_name").notNull(),
  firstName: text("first_name"),
  middleName: text("middle_name"),
  lastName: text("last_name"),
  gender: text("gender"),
  dob: text("dob"),
  weight: text("weight"),
  heightFeet: text("height_feet"),
  heightInch: text("height_inch"),
  pastMedicalHistory: text("past_medical_history"),
  pastSurgicalHistory: text("past_surgical_history"),
  status: sessionStatusEnum("status").default("draft").notNull(),
  transcriptUrl: text("transcript_url"),
  transcriptS3Uri: text("transcript_s3_uri"),
  soapNote: json("soap_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPatientSessionSchema = createInsertSchema(
  patientSessions
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  transcriptUrl: true,
  transcriptS3Uri: true,
  soapNote: true,
});

export type InsertPatientSession = z.infer<typeof insertPatientSessionSchema>;
export type PatientSession = typeof patientSessions.$inferSelect;

// Define session relations
export const patientSessionRelations = relations(
  patientSessions,
  ({ one }) => ({
    user: one(users, {
      fields: [patientSessions.userId],
      references: [users.id],
    }),
  })
);

// Audio Recording Schema
export const audioRecordings = pgTable("audio_recordings", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => patientSessions.id, { onDelete: "cascade" }),
  audioUrl: text("audio_url").notNull(),
  audioS3Uri: text("audio_s3_uri").notNull(),
  duration: integer("duration").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAudioRecordingSchema = createInsertSchema(
  audioRecordings
).omit({
  id: true,
  createdAt: true,
});

export type InsertAudioRecording = z.infer<typeof insertAudioRecordingSchema>;
export type AudioRecording = typeof audioRecordings.$inferSelect;

// Define audio recording relations
export const audioRecordingRelations = relations(
  audioRecordings,
  ({ one }) => ({
    session: one(patientSessions, {
      fields: [audioRecordings.sessionId],
      references: [patientSessions.id],
    }),
  })
);

// Manual Therapy Technique Schema
export const manualTherapyTechniques = pgTable("manual_therapy_techniques", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  bodyPart: bodyPartEnum("body_part").default("general").notNull(),
  targetStructures: text("target_structures").notNull(),
  instructions: text("instructions").notNull(),
  precautions: text("precautions"),
  indications: text("indications"),
  contraindications: text("contraindications"),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  aiGenerated: boolean("ai_generated").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertManualTherapyTechniqueSchema = createInsertSchema(
  manualTherapyTechniques
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertManualTherapyTechnique = z.infer<
  typeof insertManualTherapyTechniqueSchema
>;
export type ManualTherapyTechnique =
  typeof manualTherapyTechniques.$inferSelect;

// Virtual Patient Schema
export const virtualPatients = pgTable("virtual_patients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  patient_name: text("patient_name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  chief_complaint: text("chief_complaint").notNull(),
  past_medical_history: text("past_medical_history"),
  // Removed painLevel field since it doesn't exist in the database
  body_part: bodyPartEnum("body_part").default("general").notNull(),
  symptoms_description: text("symptoms_description").notNull(),
  // Removed assessment field since it doesn't match our database
  diagnosis: text("diagnosis"),
  differentialDiagnosis: json("differential_diagnosis"),
  treatmentOptions: json("treatment_options"),
  relatedArticleIds: json("related_article_ids"),
  hasBeenEdited: boolean("has_been_edited").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertVirtualPatientSchema = createInsertSchema(
  virtualPatients
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  diagnosis: true,
  differentialDiagnosis: true,
  treatmentOptions: true,
  relatedArticleIds: true,
});

export type InsertVirtualPatient = z.infer<typeof insertVirtualPatientSchema>;
export type VirtualPatient = typeof virtualPatients.$inferSelect;

// Define virtual patient relations
export const virtualPatientRelations = relations(
  virtualPatients,
  ({ one }) => ({
    user: one(users, {
      fields: [virtualPatients.userId],
      references: [users.id],
    }),
  })
);

// Expertise level enum for shared cases
export const expertiseLevelEnum = pgEnum("expertise_level", [
  "student",
  "entry",
  "intermediate",
  "advanced",
  "expert",
]);

// Complexity level enum for shared cases
export const complexityLevelEnum = pgEnum("complexity_level", [
  "basic",
  "moderate",
  "complex",
  "challenging",
]);

// Shared Cases Schema (Peer Knowledge Exchange)
export const sharedCases = pgTable("shared_cases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  patientAgeRange: text("patient_age_range"),
  patientGender: text("patient_gender"),
  condition: text("condition").notNull(),
  bodyPart: bodyPartEnum("body_part").default("other").notNull(),
  presentingComplaints: text("presenting_complaints").notNull(),
  clinicalHistory: text("clinical_history"),
  examinationFindings: text("examination_findings").notNull(),
  investigationResults: text("investigation_results"),
  initialDiagnosis: text("initial_diagnosis").notNull(),
  treatmentApproach: text("treatment_approach").notNull(),
  outcome: text("outcome"),
  expertiseLevel: expertiseLevelEnum("expertise_level")
    .default("intermediate")
    .notNull(),
  complexityLevel: complexityLevelEnum("complexity_level")
    .default("moderate")
    .notNull(),
  learningPoints: text("learning_points"),
  attachmentUrls: json("attachment_urls"),
  upvotes: integer("upvotes").default(0).notNull(),
  views: integer("views").default(0).notNull(),
  isApproved: boolean("is_approved").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSharedCaseSchema = createInsertSchema(sharedCases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  upvotes: true,
  views: true,
  isApproved: true,
});

export type InsertSharedCase = z.infer<typeof insertSharedCaseSchema>;
export type SharedCase = typeof sharedCases.$inferSelect;

// Case Discussions Schema
export const caseDiscussions = pgTable("case_discussions", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id")
    .notNull()
    .references(() => sharedCases.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentId: integer("parent_id"),
  upvotes: integer("upvotes").default(0).notNull(),
  isEdited: boolean("is_edited").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCaseDiscussionSchema = createInsertSchema(
  caseDiscussions
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  upvotes: true,
  isEdited: true,
});

export type InsertCaseDiscussion = z.infer<typeof insertCaseDiscussionSchema>;
export type CaseDiscussion = typeof caseDiscussions.$inferSelect;

// Case Tags Schema
export const caseTags = pgTable("case_tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  color: text("color").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Case Tags Mapping (Junction table)
export const caseTagsMapping = pgTable("case_tags_mapping", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id")
    .notNull()
    .references(() => sharedCases.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => caseTags.id, { onDelete: "cascade" }),
});

// Case Upvotes Schema
export const caseUpvotes = pgTable("case_upvotes", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id")
    .notNull()
    .references(() => sharedCases.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Discussion Upvotes Schema
export const discussionUpvotes = pgTable("discussion_upvotes", {
  id: serial("id").primaryKey(),
  discussionId: integer("discussion_id")
    .notNull()
    .references(() => caseDiscussions.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define relations for case-related tables
export const sharedCaseRelations = relations(sharedCases, ({ one, many }) => ({
  user: one(users, {
    fields: [sharedCases.userId],
    references: [users.id],
  }),
  discussions: many(caseDiscussions),
  tagMappings: many(caseTagsMapping),
  upvotes: many(caseUpvotes),
}));

export const caseDiscussionRelations = relations(
  caseDiscussions,
  ({ one, many }) => ({
    case: one(sharedCases, {
      fields: [caseDiscussions.caseId],
      references: [sharedCases.id],
    }),
    user: one(users, {
      fields: [caseDiscussions.userId],
      references: [users.id],
    }),
    parent: one(caseDiscussions, {
      fields: [caseDiscussions.parentId],
      references: [caseDiscussions.id],
    }),
    replies: many(caseDiscussions, { relationName: "replies" }),
    upvotes: many(discussionUpvotes),
  })
);

export const caseTagsMappingRelations = relations(
  caseTagsMapping,
  ({ one }) => ({
    case: one(sharedCases, {
      fields: [caseTagsMapping.caseId],
      references: [sharedCases.id],
    }),
    tag: one(caseTags, {
      fields: [caseTagsMapping.tagId],
      references: [caseTags.id],
    }),
  })
);

export const caseUpvoteRelations = relations(caseUpvotes, ({ one }) => ({
  case: one(sharedCases, {
    fields: [caseUpvotes.caseId],
    references: [sharedCases.id],
  }),
  user: one(users, {
    fields: [caseUpvotes.userId],
    references: [users.id],
  }),
}));

export const discussionUpvoteRelations = relations(
  discussionUpvotes,
  ({ one }) => ({
    discussion: one(caseDiscussions, {
      fields: [discussionUpvotes.discussionId],
      references: [caseDiscussions.id],
    }),
    user: one(users, {
      fields: [discussionUpvotes.userId],
      references: [users.id],
    }),
  })
);

// AI Case Study (research-based physiotherapy cases)
export const aiCaseStudies = pgTable("ai_case_studies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  patientDescription: text("patient_description").notNull(),
  history: text("history").notNull(),
  presentingSymptoms: text("presenting_symptoms").notNull(),
  vitalSigns: text("vital_signs"),
  bodyPart: bodyPartEnum("body_part").notNull(),
  complexity: text("complexity").notNull(),
  hiddenFindings: json("hidden_findings").notNull().$type<{
    rangeOfMotion?: string;
    strength?: string;
    specialTests?: string;
    palpation?: string;
    additionalObservations?: string;
  }>(),
  correctDiagnosis: text("correct_diagnosis").notNull(),
  differentialDiagnoses: json("differential_diagnoses")
    .notNull()
    .$type<string[]>(),
  correctAssessmentApproach: json("correct_assessment_approach")
    .notNull()
    .$type<string[]>(),
  correctTreatmentApproach: text("correct_treatment_approach").notNull(),
  researchBasis: json("research_basis").$type<string[]>(),
  expertSources: json("expert_sources").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAICaseStudySchema = createInsertSchema(aiCaseStudies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAICaseStudy = z.infer<typeof insertAICaseStudySchema>;
export type AICaseStudy = typeof aiCaseStudies.$inferSelect;

// User Case Study Attempts
export const caseStudyAttempts = pgTable("case_study_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  caseStudyId: integer("case_study_id")
    .notNull()
    .references(() => aiCaseStudies.id),
  userDiagnosis: text("user_diagnosis").notNull(),
  userReasoning: text("user_reasoning").notNull(),
  assessmentTests: json("assessment_tests").notNull().$type<string[]>(),
  proposedTreatment: text("proposed_treatment").notNull(),
  overallAccuracy: integer("overall_accuracy"),
  feedback: json("feedback").$type<{
    diagnosisFeedback?: string;
    assessmentFeedback?: string;
    treatmentFeedback?: string;
    keyLearningPoints?: string[];
    suggestedResources?: string[];
  }>(),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCaseStudyAttemptSchema = createInsertSchema(
  caseStudyAttempts
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCaseStudyAttempt = z.infer<
  typeof insertCaseStudyAttemptSchema
>;
export type CaseStudyAttempt = typeof caseStudyAttempts.$inferSelect;

// Relations
export const aiCaseStudyRelations = relations(
  aiCaseStudies,
  ({ one, many }) => ({
    user: one(users, {
      fields: [aiCaseStudies.userId],
      references: [users.id],
    }),
    attempts: many(caseStudyAttempts),
  })
);

export const caseStudyAttemptRelations = relations(
  caseStudyAttempts,
  ({ one }) => ({
    user: one(users, {
      fields: [caseStudyAttempts.userId],
      references: [users.id],
    }),
    caseStudy: one(aiCaseStudies, {
      fields: [caseStudyAttempts.caseStudyId],
      references: [aiCaseStudies.id],
    }),
  })
);

// PhysioGPT Chat Conversations Schema
export const physioGptConversations = pgTable("physiogpt_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPhysioGptConversationSchema = createInsertSchema(physioGptConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPhysioGptConversation = z.infer<typeof insertPhysioGptConversationSchema>;
export type PhysioGptConversation = typeof physioGptConversations.$inferSelect;

// PhysioGPT Chat Messages Schema
export const physioGptMessages = pgTable("physiogpt_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => physioGptConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  patientContext: json("patient_context").$type<{
    patientId?: number;
    sessionId?: number;
    caseStudyId?: number;
    relevantData?: any;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPhysioGptMessageSchema = createInsertSchema(physioGptMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertPhysioGptMessage = z.infer<typeof insertPhysioGptMessageSchema>;
export type PhysioGptMessage = typeof physioGptMessages.$inferSelect;

// Relations for PhysioGPT
export const physioGptConversationRelations = relations(
  physioGptConversations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [physioGptConversations.userId],
      references: [users.id],
    }),
    messages: many(physioGptMessages),
  })
);

export const physioGptMessageRelations = relations(
  physioGptMessages,
  ({ one }) => ({
    conversation: one(physioGptConversations, {
      fields: [physioGptMessages.conversationId],
      references: [physioGptConversations.id],
    }),
  })
);
