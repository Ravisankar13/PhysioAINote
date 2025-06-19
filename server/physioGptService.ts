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
    return `You are PhysioGPT, an expert AI assistant specialized in physiotherapy and rehabilitation medicine. You provide evidence-based guidance to licensed physiotherapists about their patients and clinical practice.

EXPERTISE AREAS:
- Musculoskeletal assessment and treatment
- Movement analysis and biomechanics
- Exercise prescription and progression
- Manual therapy techniques
- Pain science and management
- Clinical reasoning and differential diagnosis
- Evidence-based practice guidelines

RESPONSE GUIDELINES:
- Provide specific, actionable clinical advice
- Reference current evidence and best practices
- Consider patient safety and contraindications
- Suggest appropriate assessment techniques
- Recommend treatment progressions
- Include relevant anatomy and physiology
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

    let contextData = "\n\nPATIENT CONTEXT:\n";

    // Get patient session data
    if (patientContext.sessionId) {
      try {
        const session = await patientSessionStorage.getPatientSession(patientContext.sessionId);
        if (session) {
          contextData += `Patient: ${session.firstName} ${session.lastName}\n`;
          contextData += `Age: ${session.dob ? this.calculateAge(session.dob) : 'Not specified'}\n`;
          contextData += `Gender: ${session.gender || 'Not specified'}\n`;
          contextData += `Height: ${session.heightFeet}'${session.heightInch}" Weight: ${session.weight}\n`;
          
          if (session.pastMedicalHistory) {
            contextData += `Medical History: ${session.pastMedicalHistory}\n`;
          }
          
          if (session.pastSurgicalHistory) {
            contextData += `Surgical History: ${session.pastSurgicalHistory}\n`;
          }

          if (session.soapNote) {
            contextData += `\nRecent SOAP Note:\n${JSON.stringify(session.soapNote, null, 2)}\n`;
          }
        }
      } catch (error) {
        console.error("Error fetching patient session:", error);
      }
    }

    // Get case study data
    if (patientContext.caseStudyId) {
      try {
        const caseStudy = await storage.getAICaseStudy(patientContext.caseStudyId);
        if (caseStudy) {
          contextData += `\nCase Study Context:\n`;
          contextData += `Title: ${caseStudy.title}\n`;
          contextData += `Body Part: ${caseStudy.bodyPart}\n`;
          contextData += `Complexity: ${caseStudy.complexity}\n`;
          contextData += `Patient Description: ${caseStudy.patientDescription}\n`;
          contextData += `Presenting Symptoms: ${caseStudy.presentingSymptoms}\n`;
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
      let conversationId = request.conversationId;
      let messages: any[] = [];

      // Get conversation history if continuing existing chat
      if (conversationId) {
        const conversationData = await physioGptStorage.getConversationWithMessages(
          conversationId, 
          request.userId
        );
        
        if (conversationData) {
          messages = conversationData.messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }));
        }
      } else {
        // Create new conversation
        const title = this.generateConversationTitle(request.message);
        const conversation = await physioGptStorage.createConversation({
          userId: request.userId,
          title
        });
        conversationId = conversation.id;
      }

      // Add patient context to the user message
      const patientContextData = await this.getPatientContextData(request.patientContext);
      const enhancedMessage = request.message + patientContextData;

      // Add user message to conversation
      await physioGptStorage.addMessage({
        conversationId,
        role: 'user',
        content: enhancedMessage,
        patientContext: request.patientContext
      });

      // Prepare messages for OpenAI
      const openaiMessages = [
        { role: 'system', content: this.buildSystemPrompt() },
        ...messages,
        { role: 'user', content: enhancedMessage }
      ];

      // Get AI response
      console.log("Sending request to OpenAI with", openaiMessages.length, "messages");
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Using latest OpenAI model
        messages: openaiMessages as any,
        max_tokens: 1000,
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0]?.message?.content || 
        "I apologize, but I'm unable to provide a response at the moment. Please try again.";
      
      console.log("OpenAI response received:", aiResponse.substring(0, 100) + "...");

      // Save AI response to conversation
      await physioGptStorage.addMessage({
        conversationId,
        role: 'assistant',
        content: aiResponse
      });

      return {
        response: aiResponse,
        conversationId,
        suggestions: this.generateSuggestions(aiResponse)
      };

    } catch (error) {
      console.error("PhysioGPT processing error:", error);
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