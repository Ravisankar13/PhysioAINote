import OpenAI from "openai";
import { 
  SoapNote, 
  SoapVirtualPatient, 
  InsertSoapVirtualPatient,
  soapVirtualPatients,
  soapNotes 
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface VirtualPatientGenerationResult {
  virtualPatient: SoapVirtualPatient;
  success: boolean;
  message: string;
}

export class SoapVirtualPatientService {
  /**
   * Create a virtual patient from SOAP sections
   */
  async createVirtualPatientFromSOAP(params: {
    soapSections: {
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
    };
    transcript?: string;
    sessionDuration?: number;
    userId: number;
  }): Promise<VirtualPatientGenerationResult> {
    try {
      const { soapSections, transcript, sessionDuration, userId } = params;

      // Generate virtual patient using AI with SOAP sections
      const virtualPatientData = await this.generateVirtualPatientFromSections(soapSections, transcript);

      // Extract clinical summary
      const clinicalSummary = virtualPatientData.clinicalSummary || null;

      // Determine body part from SOAP sections
      const bodyPart = this.extractBodyPartFromSOAP(soapSections);

      // Create virtual patient in the main virtual patients table for compatibility
      const virtualPatientResult = await this.createCompatibleVirtualPatient({
        userId,
        virtualPatientData,
        bodyPart,
        soapSections,
        clinicalSummary
      });

      return {
        virtualPatient: virtualPatientResult,
        success: true,
        message: "Virtual patient created successfully from SOAP notes"
      };

    } catch (error) {
      console.error("Error creating virtual patient from SOAP:", error);
      throw new Error(`Failed to create virtual patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a virtual patient from a SOAP note
   */
  async createVirtualPatientFromSoapNote(
    soapNoteId: number,
    userId: number
  ): Promise<VirtualPatientGenerationResult> {
    try {
      // Get the SOAP note
      const soapNote = await db
        .select()
        .from(soapNotes)
        .where(eq(soapNotes.id, soapNoteId))
        .limit(1);

      if (!soapNote[0] || soapNote[0].userId !== userId) {
        throw new Error("SOAP note not found or access denied");
      }

      const note = soapNote[0];

      // Check if virtual patient already exists for this SOAP note
      const existingVirtualPatient = await db
        .select()
        .from(soapVirtualPatients)
        .where(eq(soapVirtualPatients.soapNoteId, soapNoteId))
        .limit(1);

      if (existingVirtualPatient.length > 0) {
        return {
          virtualPatient: existingVirtualPatient[0],
          success: true,
          message: "Virtual patient already exists for this SOAP note"
        };
      }

      // Generate PRIVACY-PRESERVING virtual patient using AI
      const clinicalData = await this.generateVirtualPatientWithAI(note);
      
      // Extract only de-identified clinical patterns
      const clinicalSummary = clinicalData.clinicalSummary || null;
      const clinicalPattern = clinicalData.clinicalPattern || {};
      const movementRestrictions = clinicalData.movementRestrictions || {};
      const anatomicalFindings = clinicalData.anatomicalFindings || {};
      const modelConfiguration = clinicalData.modelConfiguration || {};

      // Create timestamp-based name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const vpName = `VP-${timestamp}`;
      
      // Create PRIVACY-PRESERVING virtual patient record with only clinical data
      const insertData: InsertSoapVirtualPatient = {
        userId,
        soapNoteId: null, // PRIVACY: Do not link to original SOAP note
        title: vpName,
        clinicalSummary, // Add the clinical summary here
        // Store only de-identified clinical patterns
        patientProfile: {
          condition: clinicalPattern.primaryCondition || "Clinical condition",
          stage: clinicalPattern.stage || "chronic",
          severity: clinicalPattern.severity || "moderate",
          laterality: clinicalPattern.laterality || "unilateral"
        },
        clinicalPresentation: {
          primaryPattern: clinicalPattern.primaryCondition,
          movementLimitations: movementRestrictions.limitedMovements || [],
          functionalRestrictions: clinicalData.functionalLimitations?.primaryLimitations || [],
          complexity: clinicalData.complexity || "intermediate"
        },
        physicalFindings: {
          rangeOfMotion: movementRestrictions.rangeOfMotionDeficits || {},
          posturalDeviations: anatomicalFindings.posturalDeviations || [],
          compensatoryPatterns: movementRestrictions.compensatoryPatterns || [],
          jointRestrictions: anatomicalFindings.jointRestrictions || []
        },
        assessmentPlan: {
          treatmentFocus: clinicalData.treatmentFocus || [],
          bodyRegion: modelConfiguration.bodyRegion || note.bodyPart
        },
        bodyPart: (modelConfiguration.bodyRegion || note.bodyPart || "other") as any,
        // Store 3D model configuration
        movementQuality: {
          rangeOfMotion: modelConfiguration.requiredJointAngles || {},
          movementSpeed: modelConfiguration.movementQualityScore ? 
            (modelConfiguration.movementQualityScore > 70 ? 'normal' : 'slow') : 'slow',
          compensatoryPatterns: movementRestrictions.compensatoryPatterns || []
        },
        aiGenerated: true
      };

      const newVirtualPatient = await db
        .insert(soapVirtualPatients)
        .values(insertData)
        .returning();

      // Update SOAP note to mark virtual patient as generated
      await db
        .update(soapNotes)
        .set({
          virtualPatientGenerated: true,
          virtualPatientGeneratedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(soapNotes.id, soapNoteId));

      return {
        virtualPatient: newVirtualPatient[0],
        success: true,
        message: "Virtual patient created successfully"
      };

    } catch (error) {
      console.error("Error creating virtual patient:", error);
      throw new Error(`Failed to create virtual patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate PRIVACY-PRESERVING virtual patient data using OpenAI
   */
  private async generateVirtualPatientWithAI(soapNote: SoapNote): Promise<any> {
    try {
      // Extract only clinical sections, no patient identifiers
      const soapSections = {
        subjective: soapNote.subjective || '',
        objective: soapNote.objective || '',
        assessment: soapNote.assessment || '',
        plan: soapNote.plan || ''
      };
      
      const prompt = this.constructPrivacyPreservingPrompt(soapSections);

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert physiotherapist extracting ONLY de-identified clinical patterns and movement restrictions for 3D model generation. DO NOT include any patient-specific information, names, dates, locations, or identifiable details."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000
      });

      const responseContent = response.choices[0].message.content;
      if (!responseContent) {
        throw new Error("Empty response from OpenAI");
      }

      const clinicalData = JSON.parse(responseContent);
      // Do not store the prompt as it may contain patient information
      
      return clinicalData;

    } catch (error) {
      console.error("Error generating virtual patient with AI:", error);
      throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Construct the prompt for AI virtual patient generation
   */
  private constructVirtualPatientPrompt(soapNote: SoapNote): string {
    return `
Create a comprehensive virtual patient profile based on the following SOAP note. The virtual patient should be realistic, detailed, and suitable for training purposes while maintaining complete anonymization.

SOAP NOTE DATA:
Patient Name: ${soapNote.patientName || 'Patient'}
Date of Birth: ${soapNote.dateOfBirth || 'Not specified'}
Date of Visit: ${soapNote.dateOfVisit}
Body Part: ${soapNote.bodyPart}

Subjective: ${soapNote.subjective || 'Not provided'}
Objective: ${soapNote.objective || 'Not provided'}
Assessment: ${soapNote.assessment || 'Not provided'}
Plan: ${soapNote.plan || 'Not provided'}

Full Transcription: ${soapNote.fullTranscription || 'Not available'}

INSTRUCTIONS:
1. Create a realistic patient profile that could have presented with the symptoms and findings described
2. Anonymize completely - use fictional names and details
3. Expand on the clinical information to create a comprehensive case
4. Include realistic patient personality and communication style
5. Ensure consistency between all sections
6. Make the case appropriate for physiotherapy training

Return the virtual patient in JSON format with this exact structure:
{
  "patientProfile": {
    "name": "realistic fictional name",
    "age": number (appropriate for condition),
    "gender": "male/female/other",
    "occupation": "relevant occupation",
    "lifestyle": "lifestyle description including activity level",
    "medicalHistory": ["relevant past medical conditions"],
    "currentMedications": ["current medications if any"],
    "familyHistory": "relevant family medical history"
  },
  "clinicalPresentation": {
    "chiefComplaint": "main reason for seeking treatment",
    "historyOfPresentIllness": "detailed history of current problem",
    "painScale": number (0-10),
    "functionalLimitations": ["specific functional restrictions"],
    "symptomsTimeline": "when symptoms started and progression",
    "aggravatingFactors": ["things that make symptoms worse"],
    "relievingFactors": ["things that help symptoms"]
  },
  "physicalFindings": {
    "inspection": "visual assessment findings",
    "palpation": "palpation findings",
    "rangeOfMotion": "ROM findings with measurements",
    "strengthTesting": "strength testing results",
    "specialTests": ["specific orthopedic tests performed"],
    "neurologicalAssessment": "neurological findings",
    "functionalTests": ["functional movement assessments"]
  },
  "communicationStyle": {
    "personality": "patient personality traits",
    "communicationPreferences": "how patient prefers to communicate",
    "concerns": ["patient's main concerns and fears"],
    "expectations": ["what patient hopes to achieve"],
    "motivationLevel": "high/moderate/low with explanation",
    "complianceHistory": "likelihood to follow treatment recommendations"
  },
  "complexity": "beginner/intermediate/advanced",
  "estimatedDuration": "estimated treatment duration (e.g., 4-6 weeks)",
  "prognosis": "expected outcome and recovery potential"
}
    `;
  }

  /**
   * Get virtual patient by ID
   */
  async getVirtualPatient(id: number, userId: number): Promise<SoapVirtualPatient | null> {
    try {
      const virtualPatient = await db
        .select()
        .from(soapVirtualPatients)
        .where(and(
          eq(soapVirtualPatients.id, id),
          eq(soapVirtualPatients.userId, userId)
        ))
        .limit(1);

      return virtualPatient[0] || null;
    } catch (error) {
      console.error("Error getting virtual patient:", error);
      return null;
    }
  }

  /**
   * Get virtual patient by SOAP note ID
   */
  async getVirtualPatientBySoapNote(soapNoteId: number, userId: number): Promise<SoapVirtualPatient | null> {
    try {
      const virtualPatient = await db
        .select()
        .from(soapVirtualPatients)
        .where(eq(soapVirtualPatients.soapNoteId, soapNoteId))
        .limit(1);

      if (!virtualPatient[0] || virtualPatient[0].userId !== userId) {
        return null;
      }

      return virtualPatient[0];
    } catch (error) {
      console.error("Error getting virtual patient by SOAP note:", error);
      return null;
    }
  }

  /**
   * Get all virtual patients for a user
   */
  async getUserVirtualPatients(userId: number): Promise<SoapVirtualPatient[]> {
    try {
      const virtualPatients = await db
        .select()
        .from(soapVirtualPatients)
        .where(eq(soapVirtualPatients.userId, userId))
        .orderBy(soapVirtualPatients.createdAt);

      return virtualPatients;
    } catch (error) {
      console.error("Error getting user virtual patients:", error);
      return [];
    }
  }

  /**
   * Update virtual patient
   */
  async updateVirtualPatient(
    id: number,
    userId: number,
    updates: Partial<InsertSoapVirtualPatient>
  ): Promise<SoapVirtualPatient | null> {
    try {
      // Verify ownership
      const existing = await this.getVirtualPatient(id, userId);
      if (!existing) {
        return null;
      }

      const updatedVirtualPatient = await db
        .update(soapVirtualPatients)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(soapVirtualPatients.id, id))
        .returning();

      return updatedVirtualPatient[0];
    } catch (error) {
      console.error("Error updating virtual patient:", error);
      return null;
    }
  }

  /**
   * Delete virtual patient
   */
  async deleteVirtualPatient(id: number, userId: number): Promise<boolean> {
    try {
      // Verify ownership
      const existing = await this.getVirtualPatient(id, userId);
      if (!existing) {
        return false;
      }

      // Remove reference from SOAP note
      await db
        .update(soapNotes)
        .set({
          virtualPatientId: null,
          virtualPatientGenerated: false,
          virtualPatientGeneratedAt: null,
          updatedAt: new Date()
        })
        .where(eq(soapNotes.id, existing.soapNoteId));

      // Delete virtual patient
      await db
        .delete(soapVirtualPatients)
        .where(eq(soapVirtualPatients.id, id));

      return true;
    } catch (error) {
      console.error("Error deleting virtual patient:", error);
      return false;
    }
  }

  /**
   * Generate virtual patient data from SOAP sections
   * PRIVACY-PRESERVING: Only extracts clinical patterns needed for 3D model, no patient data
   */
  private async generateVirtualPatientFromSections(
    soapSections: {
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
    },
    transcript?: string
  ): Promise<any> {
    try {
      const prompt = this.constructPrivacyPreservingPrompt(soapSections);

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert physiotherapist extracting ONLY de-identified clinical patterns and movement restrictions for 3D model generation. DO NOT include any patient-specific information, names, dates, locations, or identifiable details."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000
      });

      const responseContent = response.choices[0].message.content;
      if (!responseContent) {
        throw new Error("Empty response from OpenAI");
      }

      const clinicalData = JSON.parse(responseContent);
      // Do not store the prompt as it may contain patient information
      
      return clinicalData;

    } catch (error) {
      console.error("Error generating virtual patient with AI:", error);
      throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Construct PRIVACY-PRESERVING prompt for extracting clinical patterns only
   */
  private constructPrivacyPreservingPrompt(
    soapSections: {
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
    }
  ): string {
    return `
Extract ONLY the clinical patterns, movement restrictions, and anatomical data needed for 3D model generation from the following SOAP notes. 
DO NOT include any patient names, dates, ages, locations, or personally identifiable information.

SOAP NOTE SECTIONS:
Subjective: ${soapSections.subjective || 'Not provided'}
Objective: ${soapSections.objective || 'Not provided'}
Assessment: ${soapSections.assessment || 'Not provided'}
Plan: ${soapSections.plan || 'Not provided'}

CRITICAL PRIVACY REQUIREMENTS:
- Extract ONLY clinical patterns and movement data
- NO patient names, ages, dates, or locations
- NO personal history or identifiable details
- Focus ONLY on anatomical/biomechanical findings

Return ONLY the de-identified clinical data in this JSON format:
{
  "clinicalSummary": "A concise summary of key clinical features in 3-5 bullet points. Each point should highlight specific movement triggers, pain locations, and functional limitations. Example: '• Anterior knee pain with squatting movements • Pain onset at 90° knee flexion • Limited terminal knee extension • Aggravated by weight-bearing activities'",
  "clinicalPattern": {
    "primaryCondition": "general condition type (e.g., 'shoulder impingement', 'lumbar disc')",
    "stage": "acute/subacute/chronic",
    "severity": "mild/moderate/severe",
    "laterality": "left/right/bilateral"
  },
  "movementRestrictions": {
    "limitedMovements": ["list of restricted movements"],
    "rangeOfMotionDeficits": {
      "joint": "degrees or percentage of normal"
    },
    "painfulArcs": ["description of painful ranges"],
    "compensatoryPatterns": ["observed compensations"]
  },
  "anatomicalFindings": {
    "posturalDeviations": ["observed postural issues"],
    "muscleImbalances": ["tight/weak muscle groups"],
    "jointRestrictions": ["specific joint limitations"],
    "tissueQuality": "normal/guarded/hypersensitive"
  },
  "functionalLimitations": {
    "primaryLimitations": ["main functional restrictions"],
    "mobilityLevel": "independent/assisted/dependent",
    "weightBearingStatus": "full/partial/non-weight-bearing",
    "gaitPattern": "normal/antalgic/trendelenburg/other"
  },
  "modelConfiguration": {
    "bodyRegion": "shoulder/spine/hip/knee/ankle/multiple",
    "requiredJointAngles": {
      "joint": "angle in degrees"
    },
    "pathologyIndicators": ["visual indicators needed for 3D model"],
    "movementQualityScore": 0-100
  },
  "complexity": "beginner/intermediate/advanced",
  "treatmentFocus": ["primary treatment areas without specific interventions"]
}
    `;
  }

  /**
   * Legacy prompt method - kept for backward compatibility but redirects to privacy-preserving version
   */
  private constructVirtualPatientPromptFromSections(
    soapSections: any,
    transcript?: string
  ): string {
    // Redirect to privacy-preserving prompt
    return this.constructPrivacyPreservingPrompt(soapSections);
  }

  /**
   * Extract body part from SOAP sections using AI analysis
   */
  private extractBodyPartFromSOAP(soapSections: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  }): string {
    const allContent = `${soapSections.subjective} ${soapSections.objective} ${soapSections.assessment} ${soapSections.plan}`.toLowerCase();
    
    // Simple keyword matching for body parts
    const bodyPartMap = {
      shoulder: ['shoulder', 'glenohumeral', 'rotator cuff', 'subacromial'],
      knee: ['knee', 'patella', 'patellofemoral', 'meniscus', 'acl', 'pcl', 'mcl', 'lcl'],
      back: ['back', 'spine', 'lumbar', 'thoracic', 'vertebral', 'disc'],
      neck: ['neck', 'cervical', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
      hip: ['hip', 'femoral', 'acetabular', 'trochanter', 'groin'],
      ankle: ['ankle', 'achilles', 'calcaneus', 'tibial', 'fibular'],
      foot: ['foot', 'plantar', 'metatarsal', 'tarsal', 'toe'],
      elbow: ['elbow', 'radial', 'ulnar', 'humerus', 'epicondyle'],
      wrist: ['wrist', 'carpal', 'scaphoid', 'radius', 'ulna'],
      hand: ['hand', 'finger', 'thumb', 'metacarpal', 'phalanx']
    };

    for (const [bodyPart, keywords] of Object.entries(bodyPartMap)) {
      if (keywords.some(keyword => allContent.includes(keyword))) {
        return bodyPart;
      }
    }

    return 'other';
  }

  /**
   * Create PRIVACY-PRESERVING virtual patient storing only clinical patterns for 3D model
   */
  private async createCompatibleVirtualPatient(params: {
    userId: number;
    virtualPatientData: any;
    bodyPart: string;
    soapSections: any;
    clinicalSummary?: string;
  }): Promise<any> {
    try {
      // Create timestamp-based name for SOAP virtual patients
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
      const dateStr = timestamp[0];
      const timeStr = timestamp[1].split('.')[0];
      const timestampName = `VP-${dateStr}-${timeStr}-${Math.floor(Math.random() * 1000)}`;

      // Extract only de-identified clinical data for 3D model
      const clinicalPattern = params.virtualPatientData.clinicalPattern || {};
      const movementRestrictions = params.virtualPatientData.movementRestrictions || {};
      const anatomicalFindings = params.virtualPatientData.anatomicalFindings || {};
      const modelConfiguration = params.virtualPatientData.modelConfiguration || {};
      
      // Create privacy-preserving patient profile (no personal data)
      const deidentifiedProfile = {
        condition: clinicalPattern.primaryCondition || "Clinical condition",
        stage: clinicalPattern.stage || "chronic",
        severity: clinicalPattern.severity || "moderate",
        laterality: clinicalPattern.laterality || "unilateral"
      };

      // Store only clinical presentation needed for 3D model
      const clinicalPresentation = {
        primaryPattern: clinicalPattern.primaryCondition,
        movementLimitations: movementRestrictions.limitedMovements || [],
        functionalRestrictions: params.virtualPatientData.functionalLimitations?.primaryLimitations || [],
        complexity: params.virtualPatientData.complexity || "intermediate"
      };

      // Store only physical findings relevant to 3D model
      const physicalFindings = {
        rangeOfMotion: movementRestrictions.rangeOfMotionDeficits || {},
        posturalDeviations: anatomicalFindings.posturalDeviations || [],
        compensatoryPatterns: movementRestrictions.compensatoryPatterns || [],
        jointRestrictions: anatomicalFindings.jointRestrictions || []
      };

      // Create virtual patient with ONLY de-identified clinical data
      const [createdPatient] = await db.insert(soapVirtualPatients).values({
        userId: params.userId,
        soapNoteId: null, // No link to original SOAP note for privacy
        title: timestampName,
        clinicalSummary: params.clinicalSummary || null, // Add clinical summary
        patientProfile: deidentifiedProfile, // Only clinical pattern, no personal data
        clinicalPresentation: clinicalPresentation,
        physicalFindings: physicalFindings,
        assessmentPlan: {
          treatmentFocus: params.virtualPatientData.treatmentFocus || [],
          bodyRegion: modelConfiguration.bodyRegion || params.bodyPart
        },
        bodyPart: (modelConfiguration.bodyRegion || params.bodyPart) as any,
        
        // Store 3D model configuration data
        movementQuality: {
          rangeOfMotion: modelConfiguration.requiredJointAngles || {},
          movementSpeed: modelConfiguration.movementQualityScore ? 
            (modelConfiguration.movementQualityScore > 70 ? 'normal' : 'slow') : 'slow',
          compensatoryPatterns: movementRestrictions.compensatoryPatterns || []
        },
        
        // Initialize animation fields
        motionData: null,
        hasMotionData: false,
        aiGenerated: true, // Mark as AI-generated from SOAP
      }).returning();

      // Return format for frontend with de-identified data only
      return {
        id: createdPatient.id,
        userId: createdPatient.userId,
        patient_name: timestampName,
        // Use generic demographic data - no patient specifics
        age: 45, // Generic middle age
        gender: "unspecified",
        chief_complaint: clinicalPattern.primaryCondition || "Movement restriction",
        symptoms_description: `${clinicalPattern.stage || 'Chronic'} ${clinicalPattern.severity || 'moderate'} condition affecting ${modelConfiguration.bodyRegion || params.bodyPart}`,
        body_part: createdPatient.bodyPart,
        past_medical_history: "", // No personal history stored
        type: "ai_generated",
        hasBeenEdited: false,
        createdAt: createdPatient.createdAt,
        updatedAt: createdPatient.updatedAt,
        
        // Include animation fields
        motionData: createdPatient.motionData,
        hasMotionData: createdPatient.hasMotionData,
        aiGenerated: true,
        
        // Model configuration for 3D rendering
        modelConfig: {
          jointAngles: modelConfiguration.requiredJointAngles || {},
          pathologyIndicators: modelConfiguration.pathologyIndicators || [],
          movementQuality: modelConfiguration.movementQualityScore || 50
        }
      };

    } catch (error) {
      console.error("Error creating privacy-preserving virtual patient:", error);
      throw new Error(`Failed to create virtual patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const soapVirtualPatientService = new SoapVirtualPatientService();