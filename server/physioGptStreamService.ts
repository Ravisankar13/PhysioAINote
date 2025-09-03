import OpenAI from "openai";
import { physioGptStorage } from "./physioGptStorage";
import { storage } from "./storage";
import { evidenceService, EvidenceSummary, ResearchPaper } from "./evidenceIntegration";
import { Response } from "express";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required for PhysioGPT");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface StreamRequest {
  message: string;
  conversationId?: number;
  patientContext?: any;
  virtualPatient?: any;
  clinicalContext?: any;
  userId: number;
}

export class PhysioGptStreamService {
  
  private buildSystemPrompt(clinicalContext?: any, virtualPatient?: any): string {
    const professionalMode = clinicalContext?.professionalMode;
    const bodyRegion = clinicalContext?.bodyRegion;
    const conditionType = clinicalContext?.conditionType;
    
    let contextPrompt = '';
    if (bodyRegion) {
      contextPrompt += `\nFOCUS AREA: ${bodyRegion} assessment and treatment\n`;
    }
    if (conditionType) {
      contextPrompt += `CONDITION TYPE: ${conditionType} management\n`;
    }
    if (clinicalContext?.patientAge) {
      contextPrompt += `PATIENT POPULATION: ${clinicalContext.patientAge}\n`;
    }
    if (clinicalContext?.activityLevel) {
      contextPrompt += `ACTIVITY LEVEL: ${clinicalContext.activityLevel} athlete/individual\n`;
    }

    const clinicalReasoningFramework = `
CLINICAL REASONING FRAMEWORK:
1. Pattern Recognition: Identify common clinical patterns and presentations
2. Hypothesis Generation: Form differential diagnoses based on subjective and objective findings
3. Hypothesis Testing: Suggest specific tests to confirm/refute hypotheses
4. Clinical Decision Making: Apply evidence-based reasoning to treatment selection
5. Reassessment Criteria: Define clear markers for progress and modification needs

RED FLAG SCREENING PROTOCOL:
- Always screen for serious pathology indicators
- Include cauda equina, fracture, infection, malignancy, vascular compromise
- Recommend immediate medical referral when red flags present
- Document safety screening in all assessments`;

    return `You are PhysioGPT, a specialized clinical decision support system for physiotherapists. You provide evidence-based, physiotherapy-specific guidance that goes beyond general medical knowledge.

${contextPrompt}

${professionalMode ? 'PROFESSIONAL MODE ACTIVE: Use technical terminology, include ICD-10/CPT codes, provide detailed clinical reasoning, and cite specific research.' : 'CLINICAL MODE: Balance technical accuracy with clear explanations suitable for clinical documentation and patient communication.'}

${clinicalReasoningFramework}

PHYSIOTHERAPY-SPECIFIC FOCUS:
- Movement analysis and biomechanical assessment
- Functional diagnosis beyond structural pathology
- Load management and tissue adaptation principles
- Motor control and movement pattern retraining
- Biopsychosocial factors affecting recovery
- Return to function/sport criteria

Keep responses concise, practical, and directly applicable to clinical practice.`;
  }

  async streamResponse(request: StreamRequest, res: Response) {
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
    
    try {
      console.log("=== PhysioGPT Stream Processing Start ===");
      
      let conversationId = request.conversationId;
      let previousMessages: any[] = [];
      
      // Create or fetch conversation
      if (!conversationId) {
        const conversation = await physioGptStorage.createConversation({
          userId: request.userId,
          title: this.generateConversationTitle(request.message)
        });
        conversationId = conversation.id;
        
        // Send conversation ID immediately
        res.write(`data: ${JSON.stringify({ type: 'conversationId', data: conversationId })}\n\n`);
      } else {
        // Load previous messages for context (limit to last 5)
        try {
          const conversationData = await physioGptStorage.getConversationWithMessages(
            conversationId, 
            request.userId
          );
          
          if (conversationData && conversationData.messages) {
            previousMessages = conversationData.messages
              .slice(-5)
              .map(msg => ({
                role: msg.role,
                content: msg.content
              }));
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
      
      // Build messages for OpenAI
      const systemPrompt = this.buildSystemPrompt(request.clinicalContext, request.virtualPatient);
      const openaiMessages = [
        { role: 'system', content: systemPrompt },
        ...previousMessages,
        { role: 'user', content: request.message }
      ];
      
      // Start streaming from OpenAI
      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: openaiMessages as any,
        max_tokens: 500,
        temperature: 0.7,
        stream: true,
      });
      
      let fullResponse = '';
      
      // Stream the response chunks
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          // Send chunk to client
          res.write(`data: ${JSON.stringify({ type: 'chunk', data: content })}\n\n`);
        }
      }
      
      // Save the complete assistant message
      await physioGptStorage.addMessage({
        conversationId,
        role: 'assistant', 
        content: fullResponse
      });
      
      // Start parallel processing for enhancements
      const enhancementsPromises = [];
      
      // Check if evidence search is needed (run in parallel)
      const needsEvidence = this.checkNeedsEvidence(request.message);
      if (needsEvidence) {
        enhancementsPromises.push(
          this.fetchEvidenceAsync(request.message)
            .then(evidence => {
              if (evidence) {
                res.write(`data: ${JSON.stringify({ 
                  type: 'evidence', 
                  data: evidence 
                })}\n\n`);
              }
            })
            .catch(err => console.error("Evidence fetch error:", err))
        );
      }
      
      // Check if exercise images are needed (run in parallel)
      const needsExercises = this.checkNeedsExercises(fullResponse);
      if (needsExercises) {
        enhancementsPromises.push(
          this.fetchExerciseImagesAsync(fullResponse)
            .then(exercises => {
              if (exercises && exercises.length > 0) {
                res.write(`data: ${JSON.stringify({ 
                  type: 'exercises', 
                  data: exercises 
                })}\n\n`);
              }
            })
            .catch(err => console.error("Exercise fetch error:", err))
        );
      }
      
      // Generate suggestions (run in parallel)
      enhancementsPromises.push(
        Promise.resolve(this.generateSuggestions(fullResponse, request.clinicalContext))
          .then(suggestions => {
            res.write(`data: ${JSON.stringify({ 
              type: 'suggestions', 
              data: suggestions 
            })}\n\n`);
          })
      );
      
      // Parse clinical sections if in professional mode (run in parallel)
      if (request.clinicalContext?.professionalMode) {
        enhancementsPromises.push(
          Promise.resolve(this.parseClinicalSections(fullResponse))
            .then(sections => {
              res.write(`data: ${JSON.stringify({ 
                type: 'clinicalSections', 
                data: sections 
              })}\n\n`);
            })
        );
      }
      
      // Wait for all enhancements to complete
      await Promise.allSettled(enhancementsPromises);
      
      // Send completion signal
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      
      console.log("=== PhysioGPT Stream Processing Complete ===");
      
    } catch (error: any) {
      console.error("PhysioGPT streaming error:", error);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        data: 'An error occurred while processing your request.' 
      })}\n\n`);
    } finally {
      res.end();
    }
  }
  
  private checkNeedsEvidence(message: string): boolean {
    const researchTriggers = [
      'evidence', 'research', 'studies', 'effective', 'best practice',
      'treatment for', 'exercise for', 'therapy for', 'rehabilitation',
      'what works', 'outcomes', 'proven', 'clinical guidelines'
    ];
    
    const lowerMessage = message.toLowerCase();
    return researchTriggers.some(trigger => lowerMessage.includes(trigger));
  }
  
  private checkNeedsExercises(response: string): boolean {
    const lowerResponse = response.toLowerCase();
    return lowerResponse.includes('exercise') || 
           lowerResponse.includes('stretch') || 
           lowerResponse.includes('strengthen') || 
           lowerResponse.includes('mobility') ||
           lowerResponse.includes('program') || 
           lowerResponse.includes('perform');
  }
  
  private async fetchEvidenceAsync(query: string): Promise<EvidenceSummary | null> {
    try {
      console.log("Fetching evidence for:", query);
      const evidenceSummary = await evidenceService.generateEvidenceSummary(query);
      return evidenceSummary;
    } catch (error) {
      console.error("Error fetching evidence:", error);
      return null;
    }
  }
  
  private async fetchExerciseImagesAsync(response: string): Promise<any[]> {
    const exerciseImages: any[] = [];
    
    try {
      // Simple pattern to find exercise names
      const exercisePatterns = [
        /\b([A-Za-z\s]+(?:stretch|exercise|raise|tilt|bridge|dog|cat|cow|wall sit|clamshell|plank))\b/gi
      ];
      
      const foundExercises = new Set<string>();
      
      for (const pattern of exercisePatterns) {
        const matches = response.matchAll(pattern);
        for (const match of matches) {
          const exerciseName = match[1].trim().toLowerCase();
          if (exerciseName.length > 2 && exerciseName.length < 50) {
            foundExercises.add(exerciseName);
          }
        }
      }
      
      // Limit to first 3 exercises to speed up
      const exercisesToFetch = Array.from(foundExercises).slice(0, 3);
      
      // Fetch in parallel
      const fetchPromises = exercisesToFetch.map(async (exerciseName) => {
        try {
          const exerciseImage = await storage.getExerciseImageByName(exerciseName);
          if (exerciseImage) {
            return {
              exerciseName: exerciseImage.exerciseName,
              primaryImageUrl: exerciseImage.primaryImageUrl,
              instructions: exerciseImage.instructions,
              tips: exerciseImage.tips,
              category: exerciseImage.category
            };
          }
        } catch (error) {
          console.error(`Error fetching exercise ${exerciseName}:`, error);
        }
        return null;
      });
      
      const results = await Promise.all(fetchPromises);
      return results.filter(r => r !== null);
      
    } catch (error) {
      console.error("Error fetching exercise images:", error);
      return [];
    }
  }
  
  private generateSuggestions(response: string, clinicalContext?: any): string[] {
    const baseSuggestions = [];
    const responseLower = response.toLowerCase();
    
    if (responseLower.includes('assess') || responseLower.includes('test')) {
      baseSuggestions.push(
        "What's the sensitivity and specificity of these tests?",
        "Should I cluster these tests for better accuracy?"
      );
    }
    
    if (responseLower.includes('exercise') || responseLower.includes('strengthen')) {
      baseSuggestions.push(
        "What's the optimal dosage and progression?",
        "Any contraindications I should consider?"
      );
    }
    
    if (responseLower.includes('pain') || responseLower.includes('symptom')) {
      baseSuggestions.push(
        "What are the pain mechanisms involved?",
        "What's the prognosis for recovery?"
      );
    }
    
    // Always include some clinical essentials
    baseSuggestions.push(
      "What red flags should I screen for?",
      "What outcome measures are most appropriate?"
    );
    
    return baseSuggestions.slice(0, 4);
  }
  
  private parseClinicalSections(content: string): any {
    const sections: any = {};
    
    // Simple parsing for demonstration - could be enhanced
    const assessmentMatch = content.match(/(?:Assessment|ASSESSMENT):?\s*([\s\S]*?)(?=\n(?:Clinical Reasoning|Treatment|$))/i);
    if (assessmentMatch) sections.assessment = assessmentMatch[1].trim();
    
    const treatmentMatch = content.match(/(?:Treatment Plan|TREATMENT):?\s*([\s\S]*?)(?=\n(?:Assessment|Clinical Reasoning|$))/i);
    if (treatmentMatch) sections.treatmentPlan = treatmentMatch[1].trim();
    
    return sections;
  }
  
  private generateConversationTitle(message: string): string {
    const words = message.toLowerCase().split(' ');
    const clinicalTerms = [
      'shoulder', 'knee', 'back', 'neck', 'hip', 'ankle', 'elbow', 'wrist',
      'pain', 'injury', 'assessment', 'treatment', 'exercise', 'therapy'
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
}

export const physioGptStreamService = new PhysioGptStreamService();