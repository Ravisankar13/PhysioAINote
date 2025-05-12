import { pgTable, text, serial, integer, timestamp, json, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Visibility enum for notes
export const visibilityEnum = pgEnum("visibility", ["private", "public", "shared"]);

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
  "other"
]);

// Membership tier enum
export const membershipTierEnum = pgEnum("membership_tier", ["none", "basic", "standard", "premium"]);

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  fullName: text("full_name"),
  profileImage: text("profile_image"),
  bio: text("bio"),
  membershipTier: membershipTierEnum("membership_tier").default("none").notNull(),
  membershipExpiry: timestamp("membership_expiry"),
  paypalSubscriptionId: text("paypal_subscription_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
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
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  bodyPart: z.enum([
    "shoulder", "neck", "back", "elbow", "wrist", "hand", 
    "hip", "knee", "ankle", "foot", "general", "other"
  ]).default("other"),
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
  noteId: integer("note_id").notNull().references(() => clinicalNotes.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  parentId: integer("parent_id").references(() => comments.id),
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
  noteId: integer("note_id").notNull().references(() => clinicalNotes.id, { onDelete: 'cascade' }),
  tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: 'cascade' }),
});

// Define relations after all tables are defined
export const userRelations = relations(users, ({ many }) => ({
  clinicalNotes: many(clinicalNotes),
  comments: many(comments)
}));

export const clinicalNoteRelations = relations(clinicalNotes, ({ one, many }) => ({
  user: one(users, {
    fields: [clinicalNotes.userId],
    references: [users.id],
  }),
  comments: many(comments),
  tags: many(noteTags)
}));

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
  replies: many(comments, { relationName: "replies" })
}));

export const tagRelations = relations(tags, ({ many }) => ({
  notes: many(noteTags)
}));

export const noteTagsRelations = relations(noteTags, ({ one }) => ({
  note: one(clinicalNotes, {
    fields: [noteTags.noteId],
    references: [clinicalNotes.id],
  }),
  tag: one(tags, {
    fields: [noteTags.tagId],
    references: [tags.id],
  })
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertResearchArticleSchema = createInsertSchema(researchArticles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertResearchArticle = z.infer<typeof insertResearchArticleSchema>;
export type ResearchArticle = typeof researchArticles.$inferSelect;

// Define research article relations
export const researchArticleRelations = relations(researchArticles, ({ many }) => ({
  tags: many(tags),
}));

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

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
});

export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

// Payment Records
export const paymentRecords = pgTable("payment_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  amount: text("amount").notNull(),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  paymentMethod: text("payment_method").notNull(),
  transactionId: text("transaction_id").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentRecordSchema = createInsertSchema(paymentRecords).omit({
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
  subjective: z.string().min(1, { message: "Subjective information is required" }),
  objective: z.string().min(1, { message: "Objective information is required" }),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  visibility: z.enum(["private", "public", "shared"]).default("private"),
});

export type SoapNoteInput = z.infer<typeof soapNoteInputSchema>;