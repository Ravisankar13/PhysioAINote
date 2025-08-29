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
  virtualPatient?: {
    id: number;
    patientName: string;
    age: number;
    gender: string;
    bodyPart: string;
    condition: string;
    chiefComplaint: string;
    presentingSymptoms: string;
    medicalHistory: string;
    expertFramework: string;
    complexity: string;
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
  exerciseImages?: Array<{
    exerciseName: string;
    primaryImageUrl: string;
    instructions?: string[];
    tips?: string[];
    category?: string;
  }>;
}

function getExpertFrameworkGuidance(framework: string): string {
  const frameworkGuidance: Record<string, string> = {
    'jo-gibson': `
- Focus on movement system approach to shoulder dysfunction
- Assess scapular kinematics and motor control
- Consider sensorimotor training and movement retraining
- Evaluate movement patterns and compensatory strategies
- Apply evidence-based exercise prescription for shoulder rehabilitation`,
    
    'grimaldi': `
- Apply Alison Grimaldi's hip and pelvic pain approach
- Focus on load management and capacity building
- Consider biomechanical factors and movement patterns
- Assess hip strength, endurance, and motor control
- Implement graduated loading and exercise progression`,
    
    'bisset': `
- Apply Leanne Bisset's evidence-based approach to elbow tendinopathy
- Focus on tendon loading principles and capacity
- Consider education about tendon healing and load management
- Implement progressive loading exercises
- Assess and address contributing factors`,
    
    'clinical-edge': `
- Apply Clinical Edge's evidence-based practice approach
- Use latest research evidence to guide assessment and treatment
- Consider systematic reviews and clinical guidelines
- Apply clinical prediction rules where appropriate
- Focus on outcome measurement and evidence-based decision making`,
    
    'physio-network': `
- Apply comprehensive biopsychosocial assessment
- Focus on pain education and mechanisms
- Consider movement confidence and fear avoidance
- Address psychological factors affecting recovery
- Implement graded exposure and movement-based interventions`,
    
    'sports-map': `
- Apply sport-specific movement analysis
- Focus on return-to-sport criteria and progressions
- Consider injury prevention strategies
- Assess movement quality and performance demands
- Implement sport-specific rehabilitation protocols`
  };
  
  return frameworkGuidance[framework] || `
- Apply evidence-based assessment and treatment approaches
- Consider individual patient factors and preferences
- Focus on functional outcomes and goal achievement
- Implement progressive rehabilitation strategies`;
}

export class PhysioGptService {
  private async enhanceExerciseProgram(response: string): Promise<{ enhancedResponse: string; exerciseImages: any[] }> {
    const exerciseImages: any[] = [];
    let enhancedResponse = response;
    
    console.log("=== Enhancing Exercise Program ===");
    console.log("Response to analyze:", response);
    
    // More comprehensive patterns to find exercise names
    const exercisePatterns = [
      /(?:exercise|perform|do|try)\s*[:]\s*([^\.]+)/gi,
      /\d+\.\s*\*?\*?([^:*]+)\*?\*?(?:\s*[-–—:])/gi,
      /(?:•|[-*])\s*\*?\*?([^:*]+)\*?\*?(?:\s*[-–—:])/gi,
      /\*?\*?([A-Za-z\s]+(?:stretch|exercise|raise|tilt|bridge|dog|cat|cow|wall sit|clamshell|plank))\*?\*?/gi
    ];
    
    const foundExercises = new Set<string>();
    
    for (const pattern of exercisePatterns) {
      const matches = response.matchAll(pattern);
      for (const match of matches) {
        const exerciseName = match[1].trim().toLowerCase();
        // Clean up the exercise name
        const cleanName = exerciseName
          .replace(/\b\d+\s*(sets?|reps?|seconds?|minutes?|times?|x)\b/gi, '')
          .replace(/\b(the|a|an|perform|do|try)\b/gi, '')
          .replace(/[:\-–—]/g, '')
          .trim();
        
        if (cleanName.length > 2 && cleanName.length < 50) {
          foundExercises.add(cleanName);
          console.log("Found exercise:", cleanName);
        }
      }
    }
    
    // Also look for common exercise keywords that might be in our database
    const commonExercises = [
      'cat-cow', 'bird dog', 'pelvic tilt', 'bridge', 'hip bridge',
      'wall sit', 'clamshell', 'straight leg raise', 'chin tuck'
    ];
    
    for (const exercise of commonExercises) {
      if (response.toLowerCase().includes(exercise)) {
        foundExercises.add(exercise);
        console.log("Found common exercise:", exercise);
      }
    }
    
    console.log("Total exercises found:", foundExercises.size);
    
    // Search for matching exercise images in database
    for (const exerciseName of foundExercises) {
      try {
        console.log(`Searching for exercise: ${exerciseName}`);
        
        // Try multiple search strategies
        let exerciseImage = null;
        
        // Strategy 1: Exact match
        exerciseImage = await storage.getExerciseImageByName(exerciseName);
        
        // Strategy 2: Search with variations
        if (!exerciseImage) {
          const variations = [
            exerciseName,
            exerciseName.replace(/-/g, ' '),
            exerciseName.replace(/ /g, '-'),
            exerciseName + ' stretch',
            exerciseName + ' exercise'
          ];
          
          for (const variation of variations) {
            const searchResults = await storage.searchExerciseImages(variation);
            if (searchResults.length > 0) {
              exerciseImage = searchResults[0];
              console.log(`Found match with variation: ${variation}`);
              break;
            }
          }
        }
        
        if (exerciseImage) {
          console.log(`Adding exercise image: ${exerciseImage.exerciseName}`);
          exerciseImages.push({
            exerciseName: exerciseImage.exerciseName,
            primaryImageUrl: exerciseImage.primaryImageUrl,
            instructions: exerciseImage.instructions,
            tips: exerciseImage.tips,
            category: exerciseImage.category
          });
        } else {
          console.log(`No image found for: ${exerciseName}`);
        }
      } catch (error) {
        console.error(`Error fetching exercise image for ${exerciseName}:`, error);
      }
    }
    
    console.log(`Total exercise images found: ${exerciseImages.length}`);
    console.log("=== Enhancement Complete ===");
    
    return { enhancedResponse, exerciseImages };
  }

  private buildSystemPrompt(evidenceSummary?: EvidenceSummary, virtualPatient?: PhysioGptRequest['virtualPatient']): string {
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

    let virtualPatientContext = "";
    if (virtualPatient) {
      const frameworkGuidance = getExpertFrameworkGuidance(virtualPatient.expertFramework);
      virtualPatientContext = `
VIRTUAL PATIENT CASE ANALYSIS:
Patient: ${virtualPatient.patientName}
Age: ${virtualPatient.age} years, Gender: ${virtualPatient.gender}
Body Part: ${virtualPatient.bodyPart}
Condition: ${virtualPatient.condition}
Chief Complaint: ${virtualPatient.chiefComplaint}
Presenting Symptoms: ${virtualPatient.presentingSymptoms}
Medical History: ${virtualPatient.medicalHistory}
Case Complexity: ${virtualPatient.complexity}

EXPERT FRAMEWORK: ${virtualPatient.expertFramework}
${frameworkGuidance}

ANALYSIS FOCUS:
- Apply ${virtualPatient.expertFramework} methodology and principles
- Consider the specific expertise and approach of this framework
- Provide assessment and treatment recommendations consistent with this expert's approach
- Reference evidence and reasoning specific to this methodology
`;
    }

    return `You are PhysioGPT, an expert physiotherapy AI assistant with real-time access to current research evidence. Provide evidence-based guidance to physiotherapists.

${evidenceContext}

${virtualPatientContext}

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
      
      // Prepare messages for OpenAI with evidence context and virtual patient
      const systemPrompt = this.buildSystemPrompt(evidenceSummary, request.virtualPatient);
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
      
      // Check if response contains exercise recommendations and enhance with images
      let exerciseImages: any[] = [];
      const lowerResponse = aiResponse.toLowerCase();
      if (lowerResponse.includes('exercise') || lowerResponse.includes('stretch') || 
          lowerResponse.includes('strengthen') || lowerResponse.includes('mobility') ||
          lowerResponse.includes('program') || lowerResponse.includes('perform')) {
        try {
          const enhancement = await this.enhanceExerciseProgram(aiResponse);
          exerciseImages = enhancement.exerciseImages;
          console.log(`Found ${exerciseImages.length} exercise images to include`);
        } catch (error) {
          console.error("Error enhancing exercise program:", error);
        }
      }
      
      console.log("=== PhysioGPT Processing Complete ===");
      console.log("Final aiResponse:", aiResponse);
      console.log("Final conversationId:", conversationId);
      console.log("Exercise images found:", exerciseImages.length);
      
      const result: PhysioGptResponse = {
        response: aiResponse,
        conversationId,
        suggestions: this.generateSuggestions(aiResponse),
        evidenceSummary,
        researchPapers,
        evidenceGrade: evidenceSummary?.evidenceGrade,
        confidenceLevel: evidenceSummary?.confidenceLevel,
        exerciseImages: exerciseImages.length > 0 ? exerciseImages : undefined
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