import { 
  users, type User, type InsertUser,
  clinicalNotes, type ClinicalNote, type InsertClinicalNote
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Clinical Notes Operations
  getClinicalNote(id: number): Promise<ClinicalNote | undefined>;
  getClinicalNotes(): Promise<ClinicalNote[]>;
  createClinicalNote(note: InsertClinicalNote): Promise<ClinicalNote>;
}

export class DatabaseStorage implements IStorage {
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
  async getClinicalNote(id: number): Promise<ClinicalNote | undefined> {
    const results = await db.select().from(clinicalNotes).where(eq(clinicalNotes.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getClinicalNotes(): Promise<ClinicalNote[]> {
    // Sort by creation date descending (newest first)
    return db.select().from(clinicalNotes).orderBy(desc(clinicalNotes.createdAt));
  }

  async createClinicalNote(note: InsertClinicalNote): Promise<ClinicalNote> {
    const result = await db.insert(clinicalNotes).values(note).returning();
    return result[0];
  }
}

// Use the database storage implementation
export const storage = new DatabaseStorage();
