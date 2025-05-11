import { 
  users, type User, type InsertUser,
  clinicalNotes, type ClinicalNote, type InsertClinicalNote
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Clinical Notes Operations
  getClinicalNote(id: number): Promise<ClinicalNote | undefined>;
  getClinicalNotes(): Promise<ClinicalNote[]>;
  createClinicalNote(note: InsertClinicalNote): Promise<ClinicalNote>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clinicalNotes: Map<number, ClinicalNote>;
  userCurrentId: number;
  noteCurrentId: number;

  constructor() {
    this.users = new Map();
    this.clinicalNotes = new Map();
    this.userCurrentId = 1;
    this.noteCurrentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Clinical Notes Methods
  async getClinicalNote(id: number): Promise<ClinicalNote | undefined> {
    return this.clinicalNotes.get(id);
  }

  async getClinicalNotes(): Promise<ClinicalNote[]> {
    return Array.from(this.clinicalNotes.values()).sort((a, b) => {
      // Sort by creation date descending (newest first)
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }

  async createClinicalNote(note: InsertClinicalNote): Promise<ClinicalNote> {
    const id = this.noteCurrentId++;
    const createdAt = new Date().toISOString();
    const clinicalNote: ClinicalNote = { ...note, id, createdAt };
    this.clinicalNotes.set(id, clinicalNote);
    return clinicalNote;
  }
}

export const storage = new MemStorage();
