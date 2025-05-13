import { 
  users, type User, type InsertUser,
  clinicalNotes, type ClinicalNote, type InsertClinicalNote, type UpdateNoteVisibility,
  comments, type Comment, type InsertComment,
  researchArticles, type ResearchArticle, type InsertResearchArticle,
  subscriptionPlans, type SubscriptionPlan, 
  paymentRecords, type PaymentRecord, type InsertPaymentRecord,
  exercises, type Exercise, type InsertExercise,
  bodyPartEnum, difficultyEnum
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, isNull, sql } from "drizzle-orm";
import { calculateAgeRange, deIdentifyNote, extractCondition } from "./utilities/deIdentify";

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
  getResearchArticles(bodyPart?: string): Promise<ResearchArticle[]>;
  createResearchArticle(article: InsertResearchArticle): Promise<ResearchArticle>;
  
  // Exercise Operations
  getExercise(id: number): Promise<Exercise | undefined>;
  getExercises(bodyPart?: string, difficulty?: string): Promise<Exercise[]>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  
  // Subscription Operations
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  getSubscriptionPlanByTier(tier: string): Promise<SubscriptionPlan | undefined>;
  
  // Payment Operations
  createPaymentRecord(payment: InsertPaymentRecord): Promise<PaymentRecord>;
  getUserPayments(userId: number): Promise<PaymentRecord[]>;
}

export class DatabaseStorage implements IStorage {
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
  
  async getResearchArticles(bodyPart?: string): Promise<ResearchArticle[]> {
    // If bodyPart is provided, filter by it
    if (bodyPart && Object.values(researchArticles.bodyPart.enumValues).includes(bodyPart)) {
      return db.select()
        .from(researchArticles)
        .where(eq(researchArticles.bodyPart, bodyPart as any))
        .orderBy(desc(researchArticles.publicationDate));
    }
    
    // Otherwise, return all articles
    return db.select()
      .from(researchArticles)
      .orderBy(desc(researchArticles.publicationDate));
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
  
  async getExercises(bodyPart?: string, difficulty?: string): Promise<Exercise[]> {
    // Start with the base query
    let query = db.select().from(exercises);
    
    // If bodyPart is provided and valid, filter by it
    if (bodyPart && bodyPartEnum.enumValues.includes(bodyPart as any)) {
      query = query.where(eq(exercises.bodyPart, bodyPart as typeof bodyPartEnum.enumValues[number]));
    }
    
    // If difficulty is provided and valid, filter by it
    if (difficulty && difficultyEnum.enumValues.includes(difficulty as any)) {
      query = query.where(eq(exercises.difficulty, difficulty as typeof difficultyEnum.enumValues[number]));
    }
    
    // Execute the query with any applied filters
    return await query.orderBy(exercises.title);
  }
  
  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const result = await db.insert(exercises).values(exercise).returning();
    return result[0];
  }
}

// Use the database storage implementation
export const storage = new DatabaseStorage();
