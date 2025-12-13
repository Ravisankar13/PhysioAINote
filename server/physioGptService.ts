import OpenAI from "openai";
import { physioGptStorage } from "./physioGptStorage";
import { patientSessionStorage } from "./patientSessionStorage";
import { storage } from "./storage";
import { evidenceService, EvidenceSummary, ResearchPaper } from "./evidenceIntegration";
import { visualContentService, type VisualContentResult } from "./visualContentService";

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
  clinicalContext?: {
    bodyRegion?: string;
    conditionType?: 'acute' | 'chronic' | 'post-surgical' | 'sports';
    patientAge?: 'pediatric' | 'adult' | 'geriatric';
    activityLevel?: 'sedentary' | 'recreational' | 'competitive' | 'elite';
    clinicalTags?: string[];
    professionalMode?: boolean;
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
  visualContent?: VisualContentResult[];
  clinicalSections?: {
    assessment?: string;
    clinicalReasoning?: string;
    treatmentPlan?: string;
    precautions?: string;
    redFlags?: string[];
    differentialDiagnosis?: string[];
    outcomeMeasures?: string[];
  };
  contraindications?: string[];
  icdCodes?: string[];
  cptCodes?: string[];
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

  private buildSystemPrompt(evidenceSummary?: EvidenceSummary, virtualPatient?: PhysioGptRequest['virtualPatient'], clinicalContext?: PhysioGptRequest['clinicalContext']): string {
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
- Document safety screening in all assessments

OUTCOME MEASURES INTEGRATION:
- Suggest validated outcome measures specific to condition
- Include MCID (Minimal Clinically Important Difference) values
- Recommend reassessment timeframes
- Track functional and patient-reported outcomes

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
- Regression: Bilateral heel drops if unable to complete unilateral

Loading Progressions: Isometric → Isotonic → Eccentric → Plyometric → Sport-specific
`;

    const specialTestsReference = `
SPECIAL TESTS GUIDANCE:
- Include sensitivity and specificity values when known
- Cluster tests for improved diagnostic accuracy
- Consider likelihood ratios and clinical utility
- Note test limitations and false positive/negative rates
`;

    const treatmentHierarchy = `
TREATMENT SELECTION HIERARCHY:
1. Education and advice (strongest evidence for most conditions)
2. Active interventions (exercise, movement retraining)
3. Manual therapy (when indicated, as adjunct to active care)
4. Modalities (limited use, specific indications only)
5. Always emphasize self-management strategies
`;

    return `You are PhysioGPT, a specialized clinical decision support system for physiotherapists. You provide evidence-based, physiotherapy-specific guidance that goes beyond general medical knowledge.

${contextPrompt}

${professionalMode ? 'PROFESSIONAL MODE ACTIVE: Use technical terminology, include ICD-10/CPT codes, provide detailed clinical reasoning, and cite specific research.' : 'CLINICAL MODE: Balance technical accuracy with clear explanations suitable for clinical documentation and patient communication.'}

${clinicalReasoningFramework}

${specialTestsReference}

${treatmentHierarchy}

PHYSIOTHERAPY-SPECIFIC FOCUS:
- Movement analysis and biomechanical assessment
- Functional diagnosis beyond structural pathology
- Load management and tissue adaptation principles
- Motor control and movement pattern retraining
- Biopsychosocial factors affecting recovery
- Return to function/sport criteria
- Prevention and risk factor modification

CLINICAL DOCUMENTATION STANDARDS:
- Structure responses with clear sections when applicable
- Include objective markers and measurable goals
- Document clinical reasoning and evidence base
- Note precautions and contraindications
- Suggest appropriate referrals when indicated

SAFETY FIRST PRINCIPLE:
- Always screen for red flags before proceeding
- Document safety considerations
- Err on side of caution with unclear presentations
- Recommend medical consultation when appropriate

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

  private generateSuggestions(response: string, clinicalContext?: PhysioGptRequest['clinicalContext']): string[] {
    // Generate context-specific clinical suggestions
    const baseSuggestions = [];
    
    // Check response content for specific topics
    const responseLower = response.toLowerCase();
    
    if (responseLower.includes('assess') || responseLower.includes('test')) {
      baseSuggestions.push(
        "What's the sensitivity and specificity of these tests?",
        "Should I cluster these tests for better accuracy?",
        "What functional assessments would complement these?"
      );
    }
    
    if (responseLower.includes('exercise') || responseLower.includes('strengthen')) {
      baseSuggestions.push(
        "What's the optimal dosage and progression?",
        "Any contraindications I should consider?",
        "How do I modify for different fitness levels?"
      );
    }
    
    if (responseLower.includes('pain') || responseLower.includes('symptom')) {
      baseSuggestions.push(
        "What are the pain mechanisms involved?",
        "Any red flags I should screen for?",
        "What's the prognosis for recovery?"
      );
    }
    
    if (responseLower.includes('treatment') || responseLower.includes('intervention')) {
      baseSuggestions.push(
        "What's the evidence level for this approach?",
        "What outcome measures should I track?",
        "When should I reassess and modify?"
      );
    }
    
    // Add body region specific suggestions
    if (clinicalContext?.bodyRegion) {
      const region = clinicalContext.bodyRegion.toLowerCase();
      if (region.includes('spine') || region.includes('back')) {
        baseSuggestions.push(
          "Should I use a clinical prediction rule?",
          "What movement patterns should I assess?",
          "Any neurological screening needed?"
        );
      } else if (region.includes('shoulder')) {
        baseSuggestions.push(
          "How do I assess scapular dyskinesis?",
          "What's the role of the kinetic chain?",
          "Should I test for instability?"
        );
      } else if (region.includes('knee') || region.includes('hip')) {
        baseSuggestions.push(
          "What functional tests are most relevant?",
          "How do I assess movement quality?",
          "What's the criteria for return to sport?"
        );
      }
    }
    
    // Always include these clinical essentials if not enough suggestions
    const clinicalEssentials = [
      "What red flags should I screen for?",
      "What's the expected recovery timeline?",
      "What outcome measures are most appropriate?",
      "When should I refer to another provider?",
      "What patient education is important?"
    ];
    
    // Combine and deduplicate
    const allSuggestions = [...new Set([...baseSuggestions, ...clinicalEssentials])];
    
    // Return 4 suggestions (increased from 3 for more clinical options)
    return allSuggestions.slice(0, 4);
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
      
      // Prepare messages for OpenAI with evidence context, virtual patient, and clinical context
      const systemPrompt = this.buildSystemPrompt(evidenceSummary, request.virtualPatient, request.clinicalContext);
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
          max_tokens: 2500,
          temperature: 0.7,
        });
        
        aiResponse = completion.choices[0]?.message?.content || 
          "I apologize, but I'm unable to provide a response at the moment. Please try again.";
          
        console.log("OpenAI response received successfully");
        console.log("Response length:", aiResponse.length);
        console.log("Finish reason:", completion.choices[0]?.finish_reason);
        console.log("Token usage:", completion.usage);
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
      let visualContent: VisualContentResult[] = [];
      const lowerResponse = aiResponse.toLowerCase();
      
      // Check if user is asking for images/visual content
      const isVisualRequest = visualContentService.detectImageRequest(request.message);
      
      if (isVisualRequest) {
        console.log("Visual content requested - generating multi-modal content");
        
        // Extract exercise names or topics from the message
        const extractedExercises = visualContentService.extractExerciseNames(request.message);
        
        // If no specific exercises found, try to get them from the AI response
        if (extractedExercises.length === 0 && aiResponse) {
          extractedExercises.push(...visualContentService.extractExerciseNames(aiResponse));
        }
        
        // Generate visual content for each exercise/topic
        for (const exercise of extractedExercises) {
          try {
            const content = await visualContentService.getVisualContent(exercise, {
              includeAI: true,
              includeExternal: true,
              includeVideos: true,
              maxResults: 3
            });
            visualContent.push(...content);
          } catch (error) {
            console.error(`Error getting visual content for ${exercise}:`, error);
          }
        }
        
        // If no exercises found, try a general query based on the message
        if (visualContent.length === 0) {
          try {
            const generalQuery = request.message.replace(/show|image|picture|video|demonstrate/gi, '').trim();
            const content = await visualContentService.getVisualContent(generalQuery, {
              includeAI: true,
              includeExternal: true,
              includeVideos: true,
              maxResults: 5
            });
            visualContent.push(...content);
          } catch (error) {
            console.error("Error getting general visual content:", error);
          }
        }
        
        console.log(`Generated ${visualContent.length} visual content items`);
      }
      
      // Also check for exercise recommendations in the response
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
        suggestions: this.generateSuggestions(aiResponse, request.clinicalContext),
        evidenceSummary,
        researchPapers,
        evidenceGrade: evidenceSummary?.evidenceGrade,
        confidenceLevel: evidenceSummary?.confidenceLevel,
        exerciseImages: exerciseImages.length > 0 ? exerciseImages : undefined,
        visualContent: visualContent.length > 0 ? visualContent : undefined
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