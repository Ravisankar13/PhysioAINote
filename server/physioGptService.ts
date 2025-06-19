import OpenAI from "openai";
import { physioGptStorage } from "./physioGptStorage";
import { patientSessionStorage } from "./patientSessionStorage";
import { storage } from "./storage";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required for PhysioGPT");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface PhysioGptRequest {
  message: string;
  conversationId?: number;
  patientContext?: {
    patientId?: number;
    sessionId?: number;
    caseStudyId?: number;
  };
  userId: number;
}

export interface PhysioGptResponse {
  response: string;
  conversationId: number;
  suggestions?: string[];
}

export class PhysioGptService {
  private buildSystemPrompt(): string {
    return `You are PhysioGPT, an expert physiotherapy AI assistant. Provide evidence-based guidance to physiotherapists.

FOCUS AREAS:
- Assessment and treatment advice
- Exercise prescription
- Clinical reasoning
- Patient safety

RESPONSE STYLE:
- Concise, actionable advice
- Evidence-based recommendations
- Safety considerations
- Treatment progressions
- Maintain professional clinical terminology
- Always emphasize the importance of clinical judgment

LIMITATIONS:
- You assist licensed professionals, not replace clinical assessment
- Recommend referral when appropriate
- Emphasize hands-on examination importance
- Note when imaging or specialist consultation needed

Keep responses concise, practical, and directly applicable to clinical practice.`;
  }

  private async getPatientContextData(patientContext?: PhysioGptRequest['patientContext']): Promise<string> {
    if (!patientContext) return "";

    // Simplified context to reduce token count
    let contextData = "";

    // Get minimal patient session data
    if (patientContext.sessionId) {
      try {
        const session = await patientSessionStorage.getPatientSession(patientContext.sessionId);
        if (session) {
          contextData += `\nPatient: ${session.firstName} ${session.lastName}, Age: ${session.dob ? this.calculateAge(session.dob) : 'N/A'}`;
        }
      } catch (error) {
        console.error("Error fetching patient session:", error);
      }
    }

    // Get minimal case study data
    if (patientContext.caseStudyId) {
      try {
        const caseStudy = await storage.getAICaseStudy(patientContext.caseStudyId);
        if (caseStudy) {
          contextData += `\nCase: ${caseStudy.bodyPart} condition`;
        }
      } catch (error) {
        console.error("Error fetching case study:", error);
      }
    }

    return contextData;
  }

  private calculateAge(dob: string): string {
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return `${age - 1} years`;
      }
      return `${age} years`;
    } catch {
      return 'Age calculation error';
    }
  }

  private generateConversationTitle(message: string): string {
    // Extract key terms for title generation
    const words = message.toLowerCase().split(' ');
    const clinicalTerms = [
      'shoulder', 'knee', 'back', 'neck', 'hip', 'ankle', 'elbow', 'wrist',
      'pain', 'injury', 'assessment', 'treatment', 'exercise', 'therapy',
      'rehab', 'mobility', 'strength', 'range', 'motion'
    ];
    
    const relevantTerms = words.filter(word => 
      clinicalTerms.includes(word) || word.length > 6
    ).slice(0, 3);
    
    if (relevantTerms.length > 0) {
      return relevantTerms.map(term => 
        term.charAt(0).toUpperCase() + term.slice(1)
      ).join(' ') + ' Consultation';
    }
    
    return 'PhysioGPT Consultation';
  }

  private generateSuggestions(response: string): string[] {
    const suggestions = [
      "What assessment tests should I perform?",
      "Can you suggest an exercise progression?",
      "What are the red flags to watch for?",
      "How should I modify treatment?",
      "What's the expected recovery timeline?"
    ];
    
    // Return 3 random suggestions
    return suggestions.sort(() => 0.5 - Math.random()).slice(0, 3);
  }

  async processMessage(request: PhysioGptRequest): Promise<PhysioGptResponse> {
    try {
      console.log("PhysioGPT processing message:", request.message);
      console.log("Request details:", JSON.stringify(request, null, 2));
      
      let conversationId = request.conversationId;
      let messages: any[] = [];

      // Handle conversation creation/retrieval
      if (!conversationId) {
        console.log("Creating new conversation");
        const title = this.generateConversationTitle(request.message);
        try {
          const conversation = await physioGptStorage.createConversation({
            userId: request.userId,
            title
          });
          conversationId = conversation.id;
          console.log("New conversation created with ID:", conversationId);
        } catch (error) {
          console.error("Error creating conversation:", error);
          throw error;
        }
      } else {
        console.log("Using existing conversation:", conversationId);
        try {
          const conversationData = await physioGptStorage.getConversationWithMessages(
            conversationId, 
            request.userId
          );
          
          if (conversationData) {
            messages = conversationData.messages.map(msg => ({
              role: msg.role,
              content: msg.content
            }));
            console.log("Loaded", messages.length, "previous messages");
          }
        } catch (error) {
          console.error("Error loading conversation history:", error);
        }
      }

      // Add patient context to the user message
      console.log("Getting patient context data...");
      const patientContextData = await this.getPatientContextData(request.patientContext);
      const enhancedMessage = request.message + patientContextData;
      console.log("Enhanced message length:", enhancedMessage.length);

      // Add user message to conversation
      console.log("Adding user message to conversation...");
      try {
        await physioGptStorage.addMessage({
          conversationId,
          role: 'user',
          content: enhancedMessage,
          patientContext: request.patientContext
        });
        console.log("User message added successfully");
      } catch (error) {
        console.error("Error adding user message:", error);
        throw error;
      }

      // Prepare messages for OpenAI
      const openaiMessages = [
        { role: 'system', content: this.buildSystemPrompt() },
        ...messages,
        { role: 'user', content: enhancedMessage }
      ];

      // Get AI response
      console.log("Sending request to OpenAI with", openaiMessages.length, "messages");
      console.log("OpenAI API Key exists:", !!process.env.OPENAI_API_KEY);
      
      let completion;
      try {
        completion = await openai.chat.completions.create({
          model: "gpt-4o", // Using latest OpenAI model
          messages: openaiMessages as any,
          max_tokens: 500,
          temperature: 0.7,
        });
        console.log("OpenAI API call successful");
      } catch (apiError) {
        console.error("OpenAI API error:", apiError);
        throw apiError;
      }

      const aiResponse = completion?.choices[0]?.message?.content || 
        "I apologize, but I'm unable to provide a response at the moment. Please try again.";
      
      console.log("OpenAI response received:", aiResponse.substring(0, 100) + "...");

      // Save AI response to conversation
      console.log("Saving AI response to conversation...");
      try {
        await physioGptStorage.addMessage({
          conversationId,
          role: 'assistant',
          content: aiResponse
        });
        console.log("AI response saved successfully");
      } catch (error) {
        console.error("Error saving AI response:", error);
        throw error;
      }

      return {
        response: aiResponse,
        conversationId,
        suggestions: this.generateSuggestions(aiResponse)
      };

    } catch (error: any) {
      console.error("PhysioGPT processing error:", error);
      console.error("Error details:", error?.message);
      console.error("Error stack:", error?.stack);
      throw new Error("Unable to process your request. Please try again later.");
    }
  }

  async getConversationHistory(conversationId: number, userId: number) {
    return await physioGptStorage.getConversationWithMessages(conversationId, userId);
  }

  async getUserConversations(userId: number) {
    return await physioGptStorage.getUserConversations(userId);
  }

  async deleteConversation(conversationId: number, userId: number) {
    await physioGptStorage.deleteConversation(conversationId, userId);
  }
}

export const physioGptService = new PhysioGptService();