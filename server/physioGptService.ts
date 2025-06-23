import OpenAI from "openai";
import { physioGptStorage } from "./physioGptStorage";
import { patientSessionStorage } from "./patientSessionStorage";
import { storage } from "./storage";
import { evidenceService, EvidenceSummary, ResearchPaper } from "./evidenceIntegration";

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
  evidenceSummary?: EvidenceSummary;
  researchPapers?: ResearchPaper[];
  evidenceGrade?: 'A' | 'B' | 'C' | 'D';
  confidenceLevel?: 'High' | 'Moderate' | 'Low' | 'Very Low';
}

export class PhysioGptService {
  private buildSystemPrompt(evidenceSummary?: EvidenceSummary): string {
    let evidenceContext = "";
    
    if (evidenceSummary) {
      evidenceContext = `
CURRENT EVIDENCE SUMMARY:
- Topic: ${evidenceSummary.topic}
- Evidence Grade: ${evidenceSummary.evidenceGrade} (${evidenceSummary.confidenceLevel} confidence)
- Primary Recommendation: ${evidenceSummary.primaryRecommendation}
- Supporting Studies: ${evidenceSummary.supportingStudies.length} papers
- Last Updated: ${evidenceSummary.lastUpdated.toISOString().split('T')[0]}

CLINICAL CONSIDERATIONS:
${evidenceSummary.clinicalConsiderations.map(c => `- ${c}`).join('\n')}
`;
    }

    return `You are PhysioGPT, an expert physiotherapy AI assistant with real-time access to current research evidence. Provide evidence-based guidance to physiotherapists.

${evidenceContext}

FOCUS AREAS:
- Assessment and treatment advice backed by current research
- Exercise prescription with evidence grading
- Clinical reasoning incorporating latest evidence
- Patient safety with research-supported recommendations

RESPONSE STYLE:
- Start with evidence-based recommendations when available
- Include evidence grades (A, B, C, D) for treatment suggestions
- Reference specific studies when making recommendations
- Cite confidence levels (High, Moderate, Low, Very Low)
- Provide actionable, research-backed advice
- Note when evidence is limited or conflicting
- Always emphasize clinical judgment alongside evidence

EVIDENCE INTEGRATION:
- When evidence is available, structure responses as:
  1. Evidence-based recommendation (Grade X, Y confidence)
  2. Supporting research summary
  3. Clinical application guidance
  4. Individual patient considerations

LIMITATIONS:
- You assist licensed professionals with evidence synthesis, not replace clinical assessment
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

  private async identifyResearchQuery(message: string): Promise<string | null> {
    // Check if the message is asking for evidence-based information
    const researchTriggers = [
      'evidence', 'research', 'studies', 'effective', 'best practice',
      'treatment for', 'exercise for', 'therapy for', 'rehabilitation',
      'what works', 'outcomes', 'proven', 'clinical guidelines'
    ];
    
    const lowerMessage = message.toLowerCase();
    if (researchTriggers.some(trigger => lowerMessage.includes(trigger))) {
      return message; // Use the full message as research query
    }
    
    return null;
  }

  async processMessage(request: PhysioGptRequest): Promise<PhysioGptResponse> {
    try {
      console.log("=== PhysioGPT Processing Start ===");
      console.log("Message:", request.message);
      console.log("User ID:", request.userId);
      
      let conversationId = request.conversationId;
      let previousMessages: any[] = [];
      let evidenceSummary: EvidenceSummary | undefined;
      let researchPapers: ResearchPaper[] = [];
      
      // Check if this message requires evidence integration
      const researchQuery = await this.identifyResearchQuery(request.message);
      if (researchQuery) {
        console.log("Generating evidence summary for:", researchQuery);
        try {
          evidenceSummary = await evidenceService.generateEvidenceSummary(researchQuery);
          researchPapers = evidenceSummary.supportingStudies;
          console.log(`Found ${researchPapers.length} supporting studies with evidence grade ${evidenceSummary.evidenceGrade}`);
        } catch (error) {
          console.error("Error generating evidence summary:", error);
        }
      }
      
      // Create conversation if needed
      if (!conversationId) {
        console.log("Creating new conversation");
        const conversation = await physioGptStorage.createConversation({
          userId: request.userId,
          title: this.generateConversationTitle(request.message)
        });
        conversationId = conversation.id;
        console.log("Created conversation:", conversationId);
      } else {
        // Load previous messages for context (limit to last 5 to control token count)
        try {
          const conversationData = await physioGptStorage.getConversationWithMessages(
            conversationId, 
            request.userId
          );
          
          if (conversationData && conversationData.messages) {
            previousMessages = conversationData.messages
              .slice(-5) // Only last 5 messages to control tokens
              .map(msg => ({
                role: msg.role,
                content: msg.content
              }));
            console.log("Loaded", previousMessages.length, "previous messages");
          }
        } catch (error) {
          console.error("Error loading conversation history:", error);
        }
      }
      
      // Save user message
      await physioGptStorage.addMessage({
        conversationId,
        role: 'user',
        content: request.message
      });
      
      // Prepare messages for OpenAI with evidence context
      const systemPrompt = this.buildSystemPrompt(evidenceSummary);
      const openaiMessages = [
        { role: 'system', content: systemPrompt },
        ...previousMessages,
        { role: 'user', content: request.message }
      ];
      
      console.log("Sending to OpenAI:", openaiMessages.length, "messages");
      console.log("System prompt length:", systemPrompt.length);
      console.log("User message length:", request.message.length);
      
      let aiResponse: string;

      // Call OpenAI API 
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: openaiMessages as any,
          max_tokens: 500,
          temperature: 0.7,
        });
        
        aiResponse = completion.choices[0]?.message?.content || 
          "I apologize, but I'm unable to provide a response at the moment. Please try again.";
          
        console.log("OpenAI response received successfully");
      } catch (apiError: any) {
        console.error("OpenAI API error:", apiError);
        
        // Provide specific error handling
        if (apiError?.status === 429) {
          aiResponse = "I'm currently experiencing high demand. Please try again in a moment.";
        } else if (apiError?.status === 401) {
          aiResponse = "There's an authentication issue. Please contact support.";
        } else {
          aiResponse = `As PhysioGPT, I can help with your question about "${request.message}". For immediate assistance, please consider: assessment techniques, treatment protocols, exercise progressions, and evidence-based recommendations specific to your clinical needs.`;
        }
      }
      
      // Save AI response
      await physioGptStorage.addMessage({
        conversationId,
        role: 'assistant', 
        content: aiResponse
      });
      
      console.log("=== PhysioGPT Processing Complete ===");
      console.log("Final aiResponse:", aiResponse);
      console.log("Final conversationId:", conversationId);
      
      const result: PhysioGptResponse = {
        response: aiResponse,
        conversationId,
        suggestions: this.generateSuggestions(aiResponse),
        evidenceSummary,
        researchPapers,
        evidenceGrade: evidenceSummary?.evidenceGrade,
        confidenceLevel: evidenceSummary?.confidenceLevel
      };
      
      console.log("Returning result:", JSON.stringify(result));
      return result;

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