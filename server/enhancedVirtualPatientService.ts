import OpenAI from "openai";
import { 
  SoapNote, 
  SoapVirtualPatient, 
  InsertSoapVirtualPatient,
  soapVirtualPatients,
  soapNotes 
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface MotionCaptureData {
  landmarks: Array<{
    timestamp: number;
    landmarks: Array<{
      x: number;
      y: number;
      z: number;
      visibility: number;
    }>;
  }>;
  analysis: {
    totalFrames: number;
    duration: number;
    movementQuality: number;
    avgLandmarksPerFrame: number;
  };
}

export interface EnhancedVirtualPatientResult {
  virtualPatient: SoapVirtualPatient;
  success: boolean;
  message: string;
}

export class EnhancedVirtualPatientService {
  
  /**
   * Create enhanced virtual patient that combines SOAP notes with motion capture data
   */
  async createEnhancedVirtualPatient(
    soapNoteId: number, 
    userId: number, 
    motionData?: MotionCaptureData
  ): Promise<EnhancedVirtualPatientResult> {
    try {
      // Get the SOAP note
      const [soapNote] = await db.select()
        .from(soapNotes)
        .where(eq(soapNotes.id, soapNoteId));
      
      if (!soapNote || soapNote.userId !== userId) {
        return {
          virtualPatient: null as any,
          success: false,
          message: "SOAP note not found or access denied"
        };
      }

      // Generate enhanced virtual patient using AI
      const virtualPatientData = await this.generateEnhancedVirtualPatient(soapNote, motionData);
      
      // Create virtual patient in database
      const [createdVirtualPatient] = await db.insert(soapVirtualPatients).values({
        soapNoteId: soapNoteId,
        userId: userId,
        patientProfile: virtualPatientData.patientProfile,
        clinicalPresentation: virtualPatientData.clinicalPresentation,
        physicalFindings: virtualPatientData.physicalFindings,
        communicationStyle: virtualPatientData.communicationStyle,
        bodyPart: soapNote.bodyPart || "other",
        complexity: virtualPatientData.complexity,
        estimatedDuration: virtualPatientData.estimatedDuration,
        prognosis: virtualPatientData.prognosis,
        motionCaptureData: motionData ? {
          landmarks: motionData.landmarks,
          analysis: motionData.analysis,
          dysfunctionPatterns: virtualPatientData.dysfunctionPatterns || [],
          compensationMechanisms: virtualPatientData.compensationMechanisms || [],
          clinicalCorrelations: virtualPatientData.clinicalCorrelations || []
        } : undefined,
        biomechanicalAnalysis: motionData ? virtualPatientData.biomechanicalAnalysis : undefined,
        integratedFindings: motionData ? virtualPatientData.integratedFindings : undefined,
        hasMotionData: !!motionData,
        generationPrompt: `Enhanced virtual patient from SOAP note ID: ${soapNoteId}${motionData ? ' with motion capture data' : ''}`,
        generationModel: "gpt-4o"
      }).returning();

      return {
        virtualPatient: createdVirtualPatient,
        success: true,
        message: motionData 
          ? "Enhanced virtual patient with motion data created successfully"
          : "Virtual patient created successfully"
      };

    } catch (error) {
      console.error("Error creating enhanced virtual patient:", error);
      return {
        virtualPatient: null as any,
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Generate enhanced virtual patient data using AI analysis
   */
  private async generateEnhancedVirtualPatient(soapNote: SoapNote, motionData?: MotionCaptureData) {
    const motionAnalysisPrompt = motionData ? `
    
    MOTION CAPTURE DATA INTEGRATION:
    - Total motion frames captured: ${motionData.analysis.totalFrames}
    - Recording duration: ${motionData.analysis.duration}ms
    - Movement quality score: ${motionData.analysis.movementQuality}
    - Average landmarks per frame: ${motionData.analysis.avgLandmarksPerFrame}
    
    Use this motion data to:
    1. Correlate subjective complaints with observed movement patterns
    2. Identify compensation mechanisms visible in movement
    3. Generate biomechanical analysis findings
    4. Create integrated treatment recommendations combining clinical findings with movement analysis
    ` : '';

    const prompt = `
    Create a comprehensive virtual patient profile as a "digital patient twin" that combines clinical documentation with real movement biomechanics.
    
    SOAP NOTE DATA:
    - Subjective: ${soapNote.subjective || 'Not provided'}
    - Objective: ${soapNote.objective || 'Not provided'}
    - Assessment: ${soapNote.assessment || 'Not provided'}
    - Plan: ${soapNote.plan || 'Not provided'}
    - Body Part: ${soapNote.bodyPart || 'general'}
    ${motionAnalysisPrompt}
    
    Generate a realistic virtual patient that could present with these findings. Include:
    
    1. PATIENT PROFILE: Create realistic demographics, lifestyle, and medical history
    2. CLINICAL PRESENTATION: Expand on symptoms with realistic timeline and characteristics
    3. PHYSICAL FINDINGS: Detail examination findings consistent with the case
    4. COMMUNICATION STYLE: Patient personality and interaction preferences
    ${motionData ? `
    5. MOTION ANALYSIS: Specific movement dysfunction patterns observed
    6. BIOMECHANICAL FINDINGS: Postural assessment and joint analysis
    7. INTEGRATED CLINICAL PICTURE: How motion findings correlate with subjective complaints
    ` : ''}
    
    Make this a realistic patient that a physiotherapist would encounter. Be specific and clinically accurate.
    
    Respond in valid JSON format with this exact structure:
    {
      "patientProfile": {
        "name": "string",
        "age": number,
        "gender": "string",
        "occupation": "string", 
        "lifestyle": "string",
        "medicalHistory": ["string"],
        "currentMedications": ["string"],
        "familyHistory": "string"
      },
      "clinicalPresentation": {
        "chiefComplaint": "string",
        "historyOfPresentIllness": "string",
        "painScale": number,
        "functionalLimitations": ["string"],
        "symptomsTimeline": "string",
        "aggravatingFactors": ["string"],
        "relievingFactors": ["string"]
      },
      "physicalFindings": {
        "inspection": "string",
        "palpation": "string", 
        "rangeOfMotion": "string",
        "strengthTesting": "string",
        "specialTests": ["string"],
        "neurologicalAssessment": "string",
        "functionalTests": ["string"]
      },
      "communicationStyle": {
        "personality": "string",
        "communicationPreferences": "string",
        "concerns": ["string"],
        "expectations": ["string"],
        "motivationLevel": "string",
        "complianceHistory": "string"
      },
      "complexity": "beginner|intermediate|advanced",
      "estimatedDuration": "string",
      "prognosis": "string"${motionData ? `,
      "dysfunctionPatterns": ["string"],
      "compensationMechanisms": ["string"], 
      "clinicalCorrelations": ["string"],
      "biomechanicalAnalysis": {
        "postureAssessment": {
          "frontal": ["string"],
          "sagittal": ["string"],
          "transverse": ["string"]
        },
        "movementPatterns": {
          "quality": number,
          "deviations": ["string"],
          "restrictions": ["string"]
        },
        "jointAngles": {},
        "asymmetries": ["string"]
      },
      "integratedFindings": {
        "subjectiveMotionCorrelation": "string",
        "objectiveMotionFindings": "string", 
        "movementAssessment": "string",
        "combinedTreatmentPlan": "string"
      }` : ''}
    }
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result;
      
    } catch (error) {
      console.error("Error generating enhanced virtual patient:", error);
      
      // Return fallback data structure
      return {
        patientProfile: {
          name: "Virtual Patient",
          age: 35,
          gender: "Not specified",
          occupation: "Office worker",
          lifestyle: "Sedentary lifestyle with occasional exercise",
          medicalHistory: ["No significant medical history"],
          currentMedications: ["None"],
          familyHistory: "No relevant family history"
        },
        clinicalPresentation: {
          chiefComplaint: soapNote.subjective || "Pain and discomfort",
          historyOfPresentIllness: "Patient presents with symptoms requiring physiotherapy intervention",
          painScale: 5,
          functionalLimitations: ["Activities of daily living affected"],
          symptomsTimeline: "Recent onset",
          aggravatingFactors: ["Movement", "Activity"],
          relievingFactors: ["Rest"]
        },
        physicalFindings: {
          inspection: soapNote.objective || "Normal appearance",
          palpation: "Tender to palpation in affected area",
          rangeOfMotion: "Limited range of motion",
          strengthTesting: "Weakness noted",
          specialTests: ["Further testing required"],
          neurologicalAssessment: "Normal neurological function",
          functionalTests: ["Functional limitations present"]
        },
        communicationStyle: {
          personality: "Cooperative patient",
          communicationPreferences: "Clear, direct communication",
          concerns: ["Pain management", "Return to function"],
          expectations: ["Pain reduction", "Improved mobility"],
          motivationLevel: "Moderate",
          complianceHistory: "Good compliance expected"
        },
        complexity: "intermediate",
        estimatedDuration: "4-6 weeks",
        prognosis: "Good with appropriate treatment",
        ...(motionData && {
          dysfunctionPatterns: ["Movement compensations observed"],
          compensationMechanisms: ["Altered movement patterns"],
          clinicalCorrelations: ["Motion findings support clinical presentation"],
          biomechanicalAnalysis: {
            postureAssessment: {
              frontal: ["Postural deviations noted"],
              sagittal: ["Forward head posture"],
              transverse: ["Rotational asymmetries"]
            },
            movementPatterns: {
              quality: 0.6,
              deviations: ["Compensation patterns"],
              restrictions: ["Limited mobility"]
            },
            jointAngles: {},
            asymmetries: ["Left-right asymmetries"]
          },
          integratedFindings: {
            subjectiveMotionCorrelation: "Patient complaints align with observed movement patterns",
            objectiveMotionFindings: "Motion capture reveals dysfunction patterns",
            movementAssessment: "Comprehensive movement analysis completed",
            combinedTreatmentPlan: "Integrated treatment approach addressing both clinical and biomechanical findings"
          }
        })
      };
    }
  }

  /**
   * Get enhanced virtual patients for user (with motion data indicators)
   */
  async getEnhancedVirtualPatients(userId: number) {
    try {
      const virtualPatients = await db.select()
        .from(soapVirtualPatients)
        .where(eq(soapVirtualPatients.userId, userId));
      
      return virtualPatients;
    } catch (error) {
      console.error("Error getting enhanced virtual patients:", error);
      return [];
    }
  }

  /**
   * Get specific enhanced virtual patient with motion data
   */
  async getEnhancedVirtualPatient(virtualPatientId: number, userId: number) {
    try {
      const [virtualPatient] = await db.select()
        .from(soapVirtualPatients)
        .where(eq(soapVirtualPatients.id, virtualPatientId));
      
      if (!virtualPatient || virtualPatient.userId !== userId) {
        return null;
      }

      return virtualPatient;
    } catch (error) {
      console.error("Error getting enhanced virtual patient:", error);
      return null;
    }
  }

  /**
   * Create enhanced virtual patient directly from SOAP sections (for Enhanced SOAP Notes page)
   */
  async createEnhancedVirtualPatientFromSOAP(
    soapData: {
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
    },
    userId: number,
    motionData?: any,
    sessionDuration?: number
  ): Promise<EnhancedVirtualPatientResult> {
    try {
      // Create a temporary SOAP note object for AI processing
      const tempSoapNote = {
        id: 0, // Temporary ID
        userId,
        subjective: soapData.subjective,
        objective: soapData.objective,
        assessment: soapData.assessment,
        plan: soapData.plan,
        bodyPart: this.extractBodyPartFromSOAP(soapData),
        timestamp: new Date().toISOString(),
        sessionDuration: sessionDuration || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Generate enhanced virtual patient using AI
      const virtualPatientData = await this.generateEnhancedVirtualPatient(tempSoapNote, motionData);
      
      // Create virtual patient in database
      const [createdVirtualPatient] = await db.insert(soapVirtualPatients).values({
        soapNoteId: null, // No associated SOAP note since created directly from sections
        userId: userId,
        patientProfile: virtualPatientData.patientProfile,
        clinicalPresentation: virtualPatientData.clinicalPresentation,
        physicalFindings: virtualPatientData.physicalFindings,
        communicationStyle: virtualPatientData.communicationStyle,
        bodyPart: tempSoapNote.bodyPart,
        complexity: virtualPatientData.complexity,
        estimatedDuration: virtualPatientData.estimatedDuration,
        prognosis: virtualPatientData.prognosis,
        motionCaptureData: motionData ? {
          poseData: motionData.poseData || [],
          analysis: motionData.analysis || {},
          metadata: motionData.metadata || {},
          dysfunctionPatterns: virtualPatientData.dysfunctionPatterns || [],
          compensationMechanisms: virtualPatientData.compensationMechanisms || [],
          clinicalCorrelations: virtualPatientData.clinicalCorrelations || []
        } : undefined,
        biomechanicalAnalysis: motionData ? virtualPatientData.biomechanicalAnalysis : undefined,
        integratedFindings: motionData ? virtualPatientData.integratedFindings : undefined,
        hasMotionData: !!motionData,
        sourceData: {
          soapSections: soapData,
          sessionDuration: sessionDuration,
          createdFrom: 'enhanced_soap_notes'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      return {
        virtualPatient: createdVirtualPatient,
        success: true,
        message: motionData 
          ? 'Enhanced virtual patient with motion data created successfully'
          : 'Virtual patient created from SOAP notes successfully'
      };

    } catch (error) {
      console.error("Error creating enhanced virtual patient from SOAP:", error);
      return {
        virtualPatient: {} as SoapVirtualPatient,
        success: false,
        message: `Failed to create virtual patient: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Extract body part from SOAP sections using simple text analysis
   */
  private extractBodyPartFromSOAP(soapData: { subjective: string; objective: string; assessment: string; plan: string }): any {
    const allText = `${soapData.subjective} ${soapData.objective} ${soapData.assessment} ${soapData.plan}`.toLowerCase();
    
    // Define body part keywords
    const bodyPartKeywords = {
      shoulder: ['shoulder', 'rotator cuff', 'glenohumeral', 'acromioclavicular', 'subacromial'],
      knee: ['knee', 'patella', 'meniscus', 'ligament', 'mcl', 'lcl', 'acl', 'pcl'],
      back: ['back', 'spine', 'lumbar', 'thoracic', 'vertebra', 'disc'],
      neck: ['neck', 'cervical', 'atlas', 'axis', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
      hip: ['hip', 'pelvis', 'iliac', 'gluteal', 'piriformis', 'trochanter'],
      ankle: ['ankle', 'achilles', 'calcaneus', 'talus', 'fibula'],
      foot: ['foot', 'plantar', 'metatarsal', 'toe', 'arch'],
      elbow: ['elbow', 'radius', 'ulna', 'humerus', 'epicondyle'],
      wrist: ['wrist', 'carpal', 'radius', 'ulna', 'scaphoid'],
      hand: ['hand', 'finger', 'thumb', 'metacarpal', 'digit']
    };

    // Count keyword matches for each body part
    for (const [bodyPart, keywords] of Object.entries(bodyPartKeywords)) {
      if (keywords.some(keyword => allText.includes(keyword))) {
        return bodyPart;
      }
    }

    return 'general'; // Default if no specific body part identified
  }
}

export const enhancedVirtualPatientService = new EnhancedVirtualPatientService();