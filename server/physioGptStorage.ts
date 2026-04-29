import { db } from "./db";
import { 
  physioGptConversations, 
  physioGptMessages,
  type PhysioGptConversation,
  type PhysioGptMessage,
  type InsertPhysioGptConversation,
  type InsertPhysioGptMessage,
  type PhysioGptCaseSnapshot
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export class PhysioGptStorage {
  // Conversation management
  async createConversation(data: InsertPhysioGptConversation): Promise<PhysioGptConversation> {
    const [conversation] = await db
      .insert(physioGptConversations)
      .values(data)
      .returning();
    return conversation;
  }

  async getUserConversations(userId: number): Promise<PhysioGptConversation[]> {
    return await db
      .select()
      .from(physioGptConversations)
      .where(eq(physioGptConversations.userId, userId))
      .orderBy(desc(physioGptConversations.updatedAt));
  }

  async getConversation(id: number, userId: number): Promise<PhysioGptConversation | undefined> {
    const [conversation] = await db
      .select()
      .from(physioGptConversations)
      .where(
        and(
          eq(physioGptConversations.id, id),
          eq(physioGptConversations.userId, userId)
        )
      );
    return conversation;
  }

  async updateConversationTitle(id: number, userId: number, title: string): Promise<PhysioGptConversation> {
    const [conversation] = await db
      .update(physioGptConversations)
      .set({ 
        title,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(physioGptConversations.id, id),
          eq(physioGptConversations.userId, userId)
        )
      )
      .returning();
    return conversation;
  }

  async updateCaseSnapshot(
    id: number,
    userId: number,
    caseSnapshot: PhysioGptCaseSnapshot
  ): Promise<PhysioGptConversation | undefined> {
    const [conversation] = await db
      .update(physioGptConversations)
      .set({
        caseSnapshot,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(physioGptConversations.id, id),
          eq(physioGptConversations.userId, userId)
        )
      )
      .returning();
    return conversation;
  }

  async deleteConversation(id: number, userId: number): Promise<void> {
    await db
      .delete(physioGptConversations)
      .where(
        and(
          eq(physioGptConversations.id, id),
          eq(physioGptConversations.userId, userId)
        )
      );
  }

  // Message management
  async addMessage(data: InsertPhysioGptMessage): Promise<PhysioGptMessage> {
    const [message] = await db
      .insert(physioGptMessages)
      .values(data as any)
      .returning();

    // Update conversation timestamp
    await db
      .update(physioGptConversations)
      .set({ updatedAt: new Date() })
      .where(eq(physioGptConversations.id, data.conversationId));

    return message;
  }

  async getConversationMessages(conversationId: number): Promise<PhysioGptMessage[]> {
    return await db
      .select()
      .from(physioGptMessages)
      .where(eq(physioGptMessages.conversationId, conversationId))
      .orderBy(physioGptMessages.createdAt);
  }

  async getConversationWithMessages(id: number, userId: number): Promise<{
    conversation: PhysioGptConversation;
    messages: PhysioGptMessage[];
  } | null> {
    const conversation = await this.getConversation(id, userId);
    if (!conversation) return null;

    const messages = await this.getConversationMessages(id);
    return { conversation, messages };
  }
}

export const physioGptStorage = new PhysioGptStorage();