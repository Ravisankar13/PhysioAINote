import OpenAI from "openai";
import { physioGptStorage } from "./physioGptStorage";
import { storage } from "./storage";
import { evidenceService, EvidenceSummary, ResearchPaper } from "./evidenceIntegration";
import { visualContentService, type VisualContentResult } from "./visualContentService";
import { Response } from "express";

// Use Replit AI Integrations OpenAI if available, otherwise fall back to standard OPENAI_API_KEY
const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined;

if (!apiKey) {
  console.warn("Warning: No OpenAI API key configured for PhysioGPT. AI features may not work.");
}

const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: baseURL,
});

interface StreamRequest {
  message: string;
  conversationId?: number;
  patientContext?: any;
  virtualPatient?: any;
  clinicalContext?: any;
  isVoiceSession?: boolean;
  isInterimAnalysis?: boolean;
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
CLINICAL REASONING FRAMEWORK (Always explain your reasoning):
1. Pattern Recognition: Identify common clinical patterns and presentations
2. Hypothesis Generation: Form differential diagnoses based on subjective and objective findings
3. Hypothesis Testing: Suggest specific tests to confirm/refute hypotheses
4. Clinical Decision Making: Apply evidence-based reasoning to treatment selection
5. Reassessment Criteria: Define clear markers for progress and modification needs

CLINICAL REASONING TRANSPARENCY (ALWAYS INCLUDE):
When making recommendations, ALWAYS explain the "WHY" using these frameworks:
- Tissue Healing Timelines: Reference approximate healing phases (inflammation 0-7 days, proliferation 7-21 days, remodeling 21+ days) and how this guides intervention
- Load vs Capacity Model: Explain how the intervention addresses the balance between tissue load and tissue capacity
- Biopsychosocial Factors: Consider and mention relevant psychological (fear-avoidance, catastrophizing, self-efficacy) and social factors (work demands, support system, goals)
- Mechanism of Action: Explain HOW the intervention works (e.g., "eccentric loading promotes collagen remodeling" not just "do eccentric exercises")

RED FLAG SCREENING PROTOCOL:
- Always screen for serious pathology indicators
- Include cauda equina, fracture, infection, malignancy, vascular compromise
- Recommend immediate medical referral when red flags present
- Document safety screening in all assessments`;

    const exerciseDosageFormat = `
EXERCISE PRESCRIPTION FORMAT (ALWAYS USE THIS STRUCTURE):
When prescribing exercises, ALWAYS include:

1. Exercise Name + Starting Position
2. Dosage: Sets × Reps @ Tempo (e.g., 3×10 @ 3-1-2 where 3=eccentric, 1=pause, 2=concentric)
3. Load Guidance: RPE (Rate of Perceived Exertion 1-10) or % 1RM where appropriate
4. Frequency: Sessions per week
5. Rest: Between sets and between sessions
6. Progression Criteria: Specific, measurable criteria for advancing (e.g., "Progress when 3×10 achieved at RPE 6 or less for 2 consecutive sessions")
7. Regression Options: What to do if too difficult

Example format:
**Eccentric Heel Drops (Alfredson Protocol)**
- Position: Standing on edge of step, affected leg only
- Dosage: 3×15 @ 3-0-1 tempo (3 sec lowering)
- Load: Bodyweight initially, progress with weighted vest/backpack
- RPE: Should be 5-7/10 discomfort during exercise (acceptable)
- Frequency: 2×/day, 7 days/week
- Rest: 60-90 seconds between sets
- Progression: Add 5kg when pain <3/10 during exercise for 1 week
- Regression: Bilateral heel drops if unable to complete unilateral`;

    const voiceSessionInstructions = `
VOICE CLINICAL SESSION ANALYSIS:
When you receive a message tagged as [CLINICAL SESSION RECORDING], you are acting as a senior physiotherapy diagnostician analyzing a recorded clinical session. You MUST provide a comprehensive, structured clinical report using these exact section headers (use markdown ## headers):

## Session Summary
Summarize the key points, chief complaint, history of present illness, and relevant patient demographics.

## Clinical Findings
Extract and organize all subjective and objective findings mentioned. Note what was reported vs what was observed/tested.

## Differential Diagnosis
Provide a ranked list of differential diagnoses with:
- Most likely diagnosis first with percentage likelihood
- Clinical reasoning for each (why it fits or doesn't)
- Key distinguishing features between differentials

## Assessment
Your clinical impression integrating all findings. Include:
- Primary working diagnosis with confidence level
- Stage/severity classification if applicable
- Irritability and nature of the condition
- Contributing factors identified

## Treatment Plan
Evidence-based treatment plan with:
- Short-term goals (2-4 weeks) and long-term goals (8-12 weeks)
- Specific interventions with dosage (sets, reps, frequency, intensity)
- Manual therapy techniques if indicated
- Patient education points
- Home exercise program
- Progression criteria

## Prognosis
Expected recovery timeline, prognostic factors (positive and negative), and expected functional outcomes.

## Missing Information
Clearly list what additional information is needed:
- Specific special tests that should be performed
- Imaging or investigations recommended
- Subjective history gaps
- Objective assessment components not yet done
- Outcome measures to establish baselines

## Red Flags
Any red flags or yellow flags identified, and recommended actions if present. If none identified, state "No red flags identified in this session."

IMPORTANT: Be thorough and specific. Reference evidence where possible (e.g., "Based on the Ottawa Ankle Rules..." or "Per CPG guidelines..."). If the recording lacks sufficient detail for a confident diagnosis, explicitly state this and prioritize the Missing Information section.`;

    return `You are PhysioGPT, a specialized clinical decision support system for physiotherapists. You provide evidence-based, physiotherapy-specific guidance that goes beyond general medical knowledge.

${contextPrompt}

${professionalMode ? 'PROFESSIONAL MODE ACTIVE: Use technical terminology, include ICD-10/CPT codes, provide detailed clinical reasoning, and cite specific research.' : 'CLINICAL MODE: Balance technical accuracy with clear explanations suitable for clinical documentation and patient communication.'}

${clinicalReasoningFramework}

${exerciseDosageFormat}

${voiceSessionInstructions}

PHYSIOTHERAPY-SPECIFIC FOCUS:
- Movement analysis and biomechanical assessment
- Functional diagnosis beyond structural pathology
- Load management and tissue adaptation principles
- Motor control and movement pattern retraining
- Biopsychosocial factors affecting recovery
- Return to function/sport criteria
- Loading progressions: Isometric → Isotonic → Eccentric → Plyometric → Sport-specific

RESPONSE QUALITY REQUIREMENTS:
1. Always explain WHY you're recommending something, not just WHAT to do
2. Reference tissue healing timelines when relevant
3. Use proper exercise dosage format for all exercise prescriptions
4. Consider load vs capacity balance in all recommendations
5. Acknowledge biopsychosocial factors where relevant

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
      
      const isVoiceSession = request.isVoiceSession || request.message.includes('[CLINICAL SESSION RECORDING');
      const isInterim = request.isInterimAnalysis;
      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: openaiMessages as any,
        max_tokens: isInterim ? 1500 : (isVoiceSession ? 4096 : 2500),
        temperature: isVoiceSession ? 0.4 : 0.7,
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
      
      // Check if visual content is requested
      const isVisualRequest = visualContentService.detectImageRequest(request.message);
      if (isVisualRequest) {
        console.log("Visual content requested - generating multi-modal content");
        
        enhancementsPromises.push(
          this.fetchVisualContentAsync(request.message, fullResponse)
            .then(visualContent => {
              if (visualContent && visualContent.length > 0) {
                res.write(`data: ${JSON.stringify({ 
                  type: 'visualContent', 
                  data: visualContent 
                })}\n\n`);
              }
            })
            .catch(err => console.error("Visual content fetch error:", err))
        );
      }
      
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
  
  private async fetchVisualContentAsync(userMessage: string, aiResponse: string): Promise<VisualContentResult[]> {
    // Visual content fetching disabled - using only RMP exercise images for speed
    // This eliminates slow DALL-E and external API calls
    return [];
  }
  
  private async fetchExerciseImagesAsync(response: string): Promise<any[]> {
    const exerciseImages: any[] = [];
    
    try {
      // Enhanced pattern to find exercise names
      const exercisePatterns = [
        /\b([A-Za-z\s]+(?:stretch|exercise|raise|tilt|bridge|dog|cat|cow|wall sit|clamshell|plank|curl|press|pull|push|squat|lunge|rotation))\b/gi,
        /\b(shoulder|hip|knee|ankle|elbow|wrist|neck|back|core)\s+([A-Za-z\s]+(?:strength|stretch|mobility|stability))\b/gi
      ];
      
      const foundExercises = new Set<string>();
      
      for (const pattern of exercisePatterns) {
        const matches = response.matchAll(pattern);
        for (const match of matches) {
          const exerciseName = match[0].trim();
          if (exerciseName.length > 5 && exerciseName.length < 60) {
            foundExercises.add(exerciseName);
          }
        }
      }
      
      // Limit to first 5 exercises
      const exercisesToFetch = Array.from(foundExercises).slice(0, 5);
      
      if (exercisesToFetch.length === 0) {
        return [];
      }
      
      console.log("Fetching images for exercises:", exercisesToFetch);
      
      // Try Rehab My Patient API first
      const RMP_API_KEY = process.env.RMP_API_KEY;
      const RMP_API_BASE = 'https://www.rehabmypatient.com/apiV2';
      
      // Use only Rehab My Patient API for speed (no Google fallback)
      if (!RMP_API_KEY) {
        console.log("RMP_API_KEY not configured, skipping exercise image fetch");
        return [];
      }
      
      const fetchPromises = exercisesToFetch.map(async (exerciseName) => {
        try {
          const params = new URLSearchParams({ search: exerciseName });
          const rmpResponse = await fetch(`${RMP_API_BASE}/exercises?${params.toString()}`, {
            headers: {
              'RMP-API-KEY': RMP_API_KEY,
              'Accept': 'application/json',
              'User-Agent': 'PhysioGPT (support@physiogpt.com)'
            }
          });
          
          if (rmpResponse.ok) {
            const rmpData = await rmpResponse.json();
            const exercises = rmpData.exercises || rmpData.data || [];
            
            if (exercises.length > 0) {
              const exercise = exercises[0];
              const imageUrl = exercise.image_url || exercise.imageUrl || exercise.thumbnail || exercise.image;
              
              if (imageUrl) {
                console.log(`Found RMP exercise for "${exerciseName}":`, exercise.name || exercise.title);
                return {
                  exerciseName: exerciseName,
                  primaryImageUrl: imageUrl,
                  thumbnailUrl: imageUrl,
                  instructions: exercise.instructions ? 
                    (Array.isArray(exercise.instructions) ? exercise.instructions : [exercise.instructions]) :
                    [`Perform ${exerciseName} with proper form and control`],
                  tips: exercise.tips || ['Focus on quality over quantity', 'Maintain proper breathing'],
                  category: exercise.category || 'Rehab My Patient',
                  source: 'Rehab My Patient',
                  videoUrl: exercise.video_url || exercise.videoUrl
                };
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching RMP image for ${exerciseName}:`, error);
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