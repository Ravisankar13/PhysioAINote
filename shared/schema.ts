import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  date,
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

// Evidence level enum for research papers
export const evidenceLevelEnum = pgEnum("evidence_level", [
  "level_1", // Systematic reviews and meta-analyses
  "level_2", // Randomized controlled trials
  "level_3", // Controlled trials without randomization
  "level_4", // Case-control or cohort studies
  "level_5", // Case series, case reports
]);

// Study design enum
export const studyDesignEnum = pgEnum("study_design", [
  "systematic_review",
  "meta_analysis",
  "randomized_controlled_trial",
  "controlled_trial",
  "cohort_study",
  "case_control_study",
  "cross_sectional_study",
  "case_series",
  "case_report",
  "expert_opinion",
]);

// Competition type enum
export const competitionTypeEnum = pgEnum("competition_type", [
  "daily_challenge",
  "speed_challenge", 
  "accuracy_contest",
  "differential_race",
  "treatment_planning",
  "tournament",
  "specialty_league",
  "complete_clinician",
  "diagnostic_detective",
  "treatment_strategist",
  "clinical_educator",
]);

// Competition status enum
export const competitionStatusEnum = pgEnum("competition_status", [
  "scheduled",
  "registration_open",
  "registration_closed", 
  "upcoming",
  "active", 
  "completed",
  "archived",
  "cancelled",
]);

// Achievement type enum
export const achievementTypeEnum = pgEnum("achievement_type", [
  "speed_demon",
  "accuracy_master",
  "streak_keeper",
  "differential_expert",
  "treatment_guru",
  "case_crusher",
  "specialty_champion",
  "quick_thinker",
  "research_master",
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

// Research Platform Schema

// Research Gap Analysis
export const researchGaps = pgTable("research_gaps", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  bodyPart: bodyPartEnum("body_part").default("general").notNull(),
  gapType: text("gap_type").notNull(), // "demographic", "treatment", "outcome", "methodology"
  priority: text("priority").notNull(), // "low", "medium", "high", "critical"
  evidenceLevel: text("evidence_level"), // Current evidence quality
  potentialImpact: text("potential_impact").notNull(),
  suggestedMethodology: text("suggested_methodology"),
  aiGenerated: boolean("ai_generated").default(true).notNull(),
  verifiedByExpert: boolean("verified_by_expert").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertResearchGapSchema = createInsertSchema(researchGaps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertResearchGap = z.infer<typeof insertResearchGapSchema>;
export type ResearchGap = typeof researchGaps.$inferSelect;

// Research Projects
export const researchProjects = pgTable("research_projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  principalInvestigatorId: integer("principal_investigator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  researchGapId: integer("research_gap_id")
    .references(() => researchGaps.id, { onDelete: "set null" }),
  hypothesis: text("hypothesis").notNull(),
  methodology: text("methodology").notNull(),
  status: text("status").notNull(), // "proposal", "approved", "active", "completed", "published"
  ethicsApprovalStatus: text("ethics_approval_status").default("pending").notNull(),
  ethicsApprovalDate: timestamp("ethics_approval_date"),
  startDate: timestamp("start_date"),
  expectedEndDate: timestamp("expected_end_date"),
  actualEndDate: timestamp("actual_end_date"),
  participantCount: integer("participant_count").default(0),
  targetParticipantCount: integer("target_participant_count"),
  virtualPatientCohortCriteria: json("virtual_patient_cohort_criteria"),
  preliminaryResults: text("preliminary_results"),
  publications: json("publications"),
  collaboratingInstitutions: json("collaborating_institutions"),
  fundingSource: text("funding_source"),
  isPublic: boolean("is_public").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertResearchProjectSchema = createInsertSchema(researchProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertResearchProject = z.infer<typeof insertResearchProjectSchema>;
export type ResearchProject = typeof researchProjects.$inferSelect;

// Research Project Collaborators
export const researchCollaborators = pgTable("research_collaborators", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => researchProjects.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "investigator", "analyst", "advisor", "reviewer"
  permissions: json("permissions"), // Data access permissions
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const insertResearchCollaboratorSchema = createInsertSchema(researchCollaborators).omit({
  id: true,
  addedAt: true,
});

export type InsertResearchCollaborator = z.infer<typeof insertResearchCollaboratorSchema>;
export type ResearchCollaborator = typeof researchCollaborators.$inferSelect;

// Virtual Patient Research Consent
export const virtualPatientResearchConsent = pgTable("virtual_patient_research_consent", {
  id: serial("id").primaryKey(),
  virtualPatientId: integer("virtual_patient_id")
    .notNull()
    .references(() => virtualPatients.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  consentedForResearch: boolean("consented_for_research").default(false).notNull(),
  consentDate: timestamp("consent_date").defaultNow().notNull(),
  consentVersion: text("consent_version").default("1.0").notNull(),
  dataUsageTerms: json("data_usage_terms"),
  withdrawnAt: timestamp("withdrawn_at"),
});

export const insertVirtualPatientResearchConsentSchema = createInsertSchema(virtualPatientResearchConsent).omit({
  id: true,
  consentDate: true,
});

export type InsertVirtualPatientResearchConsent = z.infer<typeof insertVirtualPatientResearchConsentSchema>;
export type VirtualPatientResearchConsent = typeof virtualPatientResearchConsent.$inferSelect;

// Research Data Requests
export const researchDataRequests = pgTable("research_data_requests", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => researchProjects.id, { onDelete: "cascade" }),
  requestedById: integer("requested_by_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  datasetCriteria: json("dataset_criteria").notNull(),
  justification: text("justification").notNull(),
  approvalStatus: text("approval_status").default("pending").notNull(), // "pending", "approved", "denied"
  approvedById: integer("approved_by_id")
    .references(() => users.id, { onDelete: "set null" }),
  approvalDate: timestamp("approval_date"),
  dataAccessExpiryDate: timestamp("data_access_expiry_date"),
  usageRestrictions: json("usage_restrictions"),
  downloadCount: integer("download_count").default(0),
  lastAccessedAt: timestamp("last_accessed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertResearchDataRequestSchema = createInsertSchema(researchDataRequests).omit({
  id: true,
  createdAt: true,
});

export type InsertResearchDataRequest = z.infer<typeof insertResearchDataRequestSchema>;
export type ResearchDataRequest = typeof researchDataRequests.$inferSelect;

// Research Relations
export const researchGapRelations = relations(researchGaps, ({ many }) => ({
  projects: many(researchProjects),
}));

export const researchProjectRelations = relations(researchProjects, ({ one, many }) => ({
  principalInvestigator: one(users, {
    fields: [researchProjects.principalInvestigatorId],
    references: [users.id],
  }),
  researchGap: one(researchGaps, {
    fields: [researchProjects.researchGapId],
    references: [researchGaps.id],
  }),
  collaborators: many(researchCollaborators),
  dataRequests: many(researchDataRequests),
}));

export const researchCollaboratorRelations = relations(researchCollaborators, ({ one }) => ({
  project: one(researchProjects, {
    fields: [researchCollaborators.projectId],
    references: [researchProjects.id],
  }),
  user: one(users, {
    fields: [researchCollaborators.userId],
    references: [users.id],
  }),
}));

export const virtualPatientResearchConsentRelations = relations(virtualPatientResearchConsent, ({ one }) => ({
  virtualPatient: one(virtualPatients, {
    fields: [virtualPatientResearchConsent.virtualPatientId],
    references: [virtualPatients.id],
  }),
  user: one(users, {
    fields: [virtualPatientResearchConsent.userId],
    references: [users.id],
  }),
}));

export const researchDataRequestRelations = relations(researchDataRequests, ({ one }) => ({
  project: one(researchProjects, {
    fields: [researchDataRequests.projectId],
    references: [researchProjects.id],
  }),
  requestedBy: one(users, {
    fields: [researchDataRequests.requestedById],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [researchDataRequests.approvedById],
    references: [users.id],
  }),
}));

// Research Papers with AI Analysis
export const researchPapers = pgTable("research_papers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  authors: text("authors").notNull(),
  journal: text("journal").notNull(),
  year: integer("year").notNull(),
  doi: text("doi"),
  pubmedId: text("pubmed_id"),
  bodyPart: bodyPartEnum("body_part").notNull(),
  studyDesign: studyDesignEnum("study_design").notNull(),
  evidenceLevel: evidenceLevelEnum("evidence_level").notNull(),
  sampleSize: integer("sample_size"),
  abstract: text("abstract").notNull(),
  
  // AI Analysis Fields
  aiSummary: text("ai_summary").notNull(),
  clinicalRelevance: text("clinical_relevance").notNull(),
  keyFindings: json("key_findings").$type<string[]>().notNull(),
  limitations: json("limitations").$type<string[]>().notNull(),
  practicalApplications: json("practical_applications").$type<string[]>().notNull(),
  strengthOfEvidence: integer("strength_of_evidence").notNull(), // 1-10 scale
  
  // Clinical Application Analysis
  treatmentProtocols: json("treatment_protocols").$type<{
    intervention: string;
    dosage: string;
    frequency: string;
    duration: string;
    outcome: string;
  }[]>().notNull(),
  
  contraindications: json("contraindications").$type<string[]>().notNull(),
  patientPopulation: text("patient_population").notNull(),
  outcomesMeasured: json("outcomes_measured").$type<string[]>().notNull(),
  
  // Evidence Quality Metrics
  riskOfBias: text("risk_of_bias").notNull(),
  confidenceInterval: text("confidence_interval"),
  statisticalSignificance: text("statistical_significance"),
  clinicalSignificance: text("clinical_significance"),
  
  // Research Context
  researchGaps: json("research_gaps").$type<string[]>().notNull(),
  futureResearchDirections: json("future_research_directions").$type<string[]>().notNull(),
  relatedStudies: json("related_studies").$type<string[]>().notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertResearchPaperSchema = createInsertSchema(researchPapers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertResearchPaper = z.infer<typeof insertResearchPaperSchema>;
export type ResearchPaper = typeof researchPapers.$inferSelect;

export const researchPaperRelations = relations(researchPapers, ({ many }) => ({
  discussions: many(researchDiscussions),
}));

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

// Complex Case Study System for Multi-Stage Competitions

// Complex cases with detailed patient presentations and multiple stages
export const complexCases = pgTable("complex_cases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  patientDescription: text("patient_description").notNull(), // detailed patient background
  occupationalHistory: text("occupational_history"),
  socialHistory: text("social_history"),
  medicalHistory: text("medical_history").notNull(),
  currentMedications: text("current_medications"),
  mechanismOfInjury: text("mechanism_of_injury"),
  bodyPart: bodyPartEnum("body_part").notNull(),
  complexity: text("complexity").notNull(), // beginner, intermediate, advanced
  estimatedTime: integer("estimated_time_minutes").default(45), // expected completion time
  
  // Progressive Information Release
  initialPresentation: json("initial_presentation").notNull().$type<{
    chiefComplaint: string;
    painScale: number;
    functionalLimitations: string[];
    patientGoals: string[];
  }>(),
  
  // Detailed case content
  detailedHistory: json("detailed_history").notNull().$type<{
    onsetDetails: string;
    progressionPattern: string;
    aggravatingFactors: string[];
    easingFactors: string[];
    previousTreatments: string[];
    redFlagScreening: string[];
  }>(),
  
  physicalFindings: json("physical_findings").notNull().$type<{
    observation: string;
    palpation: string;
    rangeOfMotion: string;
    strength: string;
    neurological: string;
    specialTests: string;
    functional: string;
  }>(),
  
  // Correct answers for scoring
  correctDifferentials: json("correct_differentials").notNull().$type<{
    primary: string;
    secondary: string[];
    ruled_out: string[];
  }>(),
  
  correctAssessments: json("correct_assessments").notNull().$type<string[]>(),
  correctTreatmentPlan: json("correct_treatment_plan").notNull().$type<{
    shortTerm: string[];
    longTerm: string[];
    patientEducation: string[];
    expectedOutcome: string;
    reassessmentPlan: string;
  }>(),
  
  expertRationale: text("expert_rationale").notNull(),
  researchEvidence: json("research_evidence").$type<string[]>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Stages within each complex case (sequential questions)
export const caseStages = pgTable("case_stages", {
  id: serial("id").primaryKey(),
  complexCaseId: integer("complex_case_id").notNull().references(() => complexCases.id, { onDelete: "cascade" }),
  stageNumber: integer("stage_number").notNull(), // 1, 2, 3, etc.
  title: text("title").notNull(), // "Initial Assessment", "Physical Examination Planning"
  description: text("description").notNull(),
  stageType: text("stage_type"), // "assessment", "examination", "diagnosis", "treatment"
  
  // Information provided at this stage
  informationRevealed: json("information_revealed").$type<{
    patientResponse?: string;
    testResults?: string;
    additionalHistory?: string;
    observationFindings?: string;
  }>(),
  
  // Time allocation for this stage
  expectedTimeMinutes: integer("expected_time_minutes").default(8),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Questions within each stage
export const stageQuestions = pgTable("stage_questions", {
  id: serial("id").primaryKey(),
  stageId: integer("stage_id").notNull().references(() => caseStages.id, { onDelete: "cascade" }),
  questionNumber: integer("question_number").notNull(),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").notNull(), // "multiple_choice", "short_answer", "list", "essay"
  
  // Feedback and learning
  correctAnswer: text("correct_answer").notNull(),
  answerExplanation: text("answer_explanation").notNull(),
  scoringCriteria: json("scoring_criteria").notNull().$type<{
    maxPoints: number;
    partialCredit: boolean;
    keywordPoints: Array<{ keyword: string; points: number }>;
  }>(),
  pointsAvailable: integer("points_available").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User attempts at complex cases
export const complexCaseAttempts = pgTable("complex_case_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  complexCaseId: integer("complex_case_id").notNull().references(() => complexCases.id),
  competitionId: integer("competition_id").references(() => competitions.id), // if part of competition
  
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  totalTimeSpent: integer("total_time_spent_seconds").default(0),
  
  // Overall scoring
  totalScore: integer("total_score").default(0),
  maxPossibleScore: integer("max_possible_score").default(100),
  clinicalReasoningScore: integer("clinical_reasoning_score").default(0),
  assessmentSkillsScore: integer("assessment_skills_score").default(0),
  treatmentPlanningScore: integer("treatment_planning_score").default(0),
  communicationScore: integer("communication_score").default(0),
  timeEfficiencyScore: integer("time_efficiency_score").default(0),
  
  // Detailed attempt data
  stageResponses: json("stage_responses").notNull().$type<Array<{
    stageId: number;
    startTime: string;
    endTime: string;
    responses: Array<{
      questionId: number;
      answer: string;
      timeSpent: number;
      score: number;
      feedback: string;
    }>;
  }>>(),
  
  // Overall feedback
  overallFeedback: json("overall_feedback").$type<{
    strengths: string[];
    improvementAreas: string[];
    recommendedResources: string[];
    nextSteps: string[];
  }>(),
});

export const insertComplexCaseSchema = createInsertSchema(complexCases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCaseStageSchema = createInsertSchema(caseStages).omit({
  id: true,
  createdAt: true,
});

export const insertStageQuestionSchema = createInsertSchema(stageQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertComplexCaseAttemptSchema = createInsertSchema(complexCaseAttempts).omit({
  id: true,
});

export type InsertComplexCase = z.infer<typeof insertComplexCaseSchema>;
export type InsertCaseStage = z.infer<typeof insertCaseStageSchema>;
export type InsertStageQuestion = z.infer<typeof insertStageQuestionSchema>;
export type InsertComplexCaseAttempt = z.infer<typeof insertComplexCaseAttemptSchema>;

export type ComplexCase = typeof complexCases.$inferSelect;
export type CaseStage = typeof caseStages.$inferSelect;
export type StageQuestion = typeof stageQuestions.$inferSelect;
export type ComplexCaseAttempt = typeof complexCaseAttempts.$inferSelect;

// Relations for complex cases
export const complexCaseRelations = relations(complexCases, ({ one, many }) => ({
  user: one(users, {
    fields: [complexCases.userId],
    references: [users.id],
  }),
  stages: many(caseStages),
  attempts: many(complexCaseAttempts),
}));

export const caseStageRelations = relations(caseStages, ({ one, many }) => ({
  complexCase: one(complexCases, {
    fields: [caseStages.complexCaseId],
    references: [complexCases.id],
  }),
  questions: many(stageQuestions),
}));

export const stageQuestionRelations = relations(stageQuestions, ({ one }) => ({
  stage: one(caseStages, {
    fields: [stageQuestions.stageId],
    references: [caseStages.id],
  }),
}));

export const complexCaseAttemptRelations = relations(complexCaseAttempts, ({ one }) => ({
  user: one(users, {
    fields: [complexCaseAttempts.userId],
    references: [users.id],
  }),
  complexCase: one(complexCases, {
    fields: [complexCaseAttempts.complexCaseId],
    references: [complexCases.id],
  }),
  competition: one(competitions, {
    fields: [complexCaseAttempts.competitionId],
    references: [competitions.id],
  }),
}));

// Competition System Tables

// Competitions table
export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: competitionTypeEnum("type").notNull(),
  status: competitionStatusEnum("status").default("upcoming").notNull(),
  bodyPart: bodyPartEnum("body_part"), // null for general competitions
  difficulty: text("difficulty"), // beginner, intermediate, advanced
  timeLimit: integer("time_limit_minutes"), // in minutes
  maxParticipants: integer("max_participants").default(20), // Default 20 participants
  currentParticipants: integer("current_participants").default(0), // Track current count
  entryFee: integer("entry_fee_points").default(0), // using points system
  prizePool: integer("prize_pool_points").default(0),
  registrationOpensAt: timestamp("registration_opens_at"), // When registration opens
  registrationDeadline: timestamp("registration_deadline"), // When registration closes
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  caseStudyIds: integer("case_study_ids").array().notNull(), // array of case study IDs
  complexCaseIds: integer("complex_case_ids").array(), // array of complex case IDs
  caseType: text("case_type").default("simple").notNull(), // "simple" or "complex"
  isAutoGenerated: boolean("is_auto_generated").default(false), // Flag for auto-scheduled competitions
  nextScheduledTime: timestamp("next_scheduled_time"), // For recurring competitions
  rules: json("rules").$type<{
    scoringWeights: {
      accuracy: number;
      speed: number;
      reasoning: number;
      differential: number;
      treatment: number;
    };
    allowedAttempts: number;
    showLeaderboard: boolean;
    revealAnswers: boolean;
    stageTimeLimit: number; // Time limit per stage in minutes
    enableAntiCheat: boolean; // Enable anti-cheating measures
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Competition participants
export const competitionParticipants = pgTable("competition_participants", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  totalScore: integer("total_score").default(0),
  rank: integer("rank"),
  timeSpent: integer("time_spent_seconds").default(0),
  caseAttempts: json("case_attempts").notNull().$type<{
    caseStudyId: number;
    userDiagnosis: string;
    userReasoning: string;
    assessmentTests: string[];
    proposedTreatment: string;
    timeSpent: number;
    scores: {
      accuracy: number;
      speed: number;
      reasoning: number;
      differential: number;
      treatment: number;
      total: number;
    };
    feedback?: string;
  }[]>(),
});

// Daily challenges (special type of competition)
export const dailyChallenges = pgTable("daily_challenges", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  caseStudyId: integer("case_study_id").notNull().references(() => aiCaseStudies.id),
  difficulty: text("difficulty"),
  bodyPart: bodyPartEnum("body_part"),
  date: date("date").notNull().unique(),
  participantCount: integer("participant_count").default(0),
  averageScore: integer("average_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// User achievements
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  achievementType: achievementTypeEnum("achievement_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon"), // lucide icon name
  progress: integer("progress").default(0),
  target: integer("target").notNull(),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

// Leaderboards (aggregate rankings)
export const leaderboards = pgTable("leaderboards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  category: text("category").notNull(), // "overall", "speed", "accuracy", etc.
  bodyPart: bodyPartEnum("body_part"), // null for overall rankings
  timeframe: text("timeframe").notNull(), // "daily", "weekly", "monthly", "all_time"
  score: integer("score").notNull(),
  rank: integer("rank").notNull(),
  gamesPlayed: integer("games_played").default(0),
  averageScore: integer("average_score").default(0),
  winStreak: integer("win_streak").default(0),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// Tournament brackets (for tournament-style competitions)
export const tournamentBrackets = pgTable("tournament_brackets", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  round: integer("round").notNull(),
  matchNumber: integer("match_number").notNull(),
  participant1Id: integer("participant1_id").references(() => users.id),
  participant2Id: integer("participant2_id").references(() => users.id),
  winnerId: integer("winner_id").references(() => users.id),
  participant1Score: integer("participant1_score").default(0),
  participant2Score: integer("participant2_score").default(0),
  caseStudyId: integer("case_study_id").references(() => aiCaseStudies.id),
  completedAt: timestamp("completed_at"),
});

// Create insert schemas
export const insertCompetitionSchema = createInsertSchema(competitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompetitionParticipantSchema = createInsertSchema(competitionParticipants).omit({
  id: true,
});

export const insertDailyChallengeSchema = createInsertSchema(dailyChallenges).omit({
  id: true,
  createdAt: true,
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  earnedAt: true,
});

export const insertLeaderboardSchema = createInsertSchema(leaderboards).omit({
  id: true,
  lastUpdated: true,
});

export const insertTournamentBracketSchema = createInsertSchema(tournamentBrackets).omit({
  id: true,
});

// Define types
export type Competition = typeof competitions.$inferSelect;
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;
export type CompetitionParticipant = typeof competitionParticipants.$inferSelect;
export type InsertCompetitionParticipant = z.infer<typeof insertCompetitionParticipantSchema>;
export type DailyChallenge = typeof dailyChallenges.$inferSelect;
export type InsertDailyChallenge = z.infer<typeof insertDailyChallengeSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type Leaderboard = typeof leaderboards.$inferSelect;
export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;
export type TournamentBracket = typeof tournamentBrackets.$inferSelect;
export type InsertTournamentBracket = z.infer<typeof insertTournamentBracketSchema>;

// Define relations
export const competitionRelations = relations(competitions, ({ many, one }) => ({
  participants: many(competitionParticipants),
  creator: one(users, {
    fields: [competitions.createdBy],
    references: [users.id],
  }),
  brackets: many(tournamentBrackets),
}));

export const competitionParticipantRelations = relations(competitionParticipants, ({ one }) => ({
  competition: one(competitions, {
    fields: [competitionParticipants.competitionId],
    references: [competitions.id],
  }),
  user: one(users, {
    fields: [competitionParticipants.userId],
    references: [users.id],
  }),
}));

export const dailyChallengeRelations = relations(dailyChallenges, ({ one }) => ({
  caseStudy: one(aiCaseStudies, {
    fields: [dailyChallenges.caseStudyId],
    references: [aiCaseStudies.id],
  }),
}));

export const userAchievementRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
}));

export const leaderboardRelations = relations(leaderboards, ({ one }) => ({
  user: one(users, {
    fields: [leaderboards.userId],
    references: [users.id],
  }),
}));

export const tournamentBracketRelations = relations(tournamentBrackets, ({ one }) => ({
  competition: one(competitions, {
    fields: [tournamentBrackets.competitionId],
    references: [competitions.id],
  }),
  participant1: one(users, {
    fields: [tournamentBrackets.participant1Id],
    references: [users.id],
  }),
  participant2: one(users, {
    fields: [tournamentBrackets.participant2Id],
    references: [users.id],
  }),
  winner: one(users, {
    fields: [tournamentBrackets.winnerId],
    references: [users.id],
  }),
  caseStudy: one(aiCaseStudies, {
    fields: [tournamentBrackets.caseStudyId],
    references: [aiCaseStudies.id],
  }),
}));

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
