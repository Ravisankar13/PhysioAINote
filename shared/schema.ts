import { pgTable, text, serial, integer, timestamp, json, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Visibility enum for notes
export const visibilityEnum = pgEnum("visibility", ["private", "public", "shared"]);

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  fullName: text("full_name"),
  profileImage: text("profile_image"),
  bio: text("bio"),
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

export type InsertClinicalNote = z.infer<typeof insertClinicalNoteSchema>;
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