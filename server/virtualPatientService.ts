import OpenAI from "openai";
import { db } from "./db";
import { soapVirtualPatients, soapNotes, type InsertSoapVirtualPatient, type SoapNote } from "@shared/schema";
import { eq } from "drizzle-orm";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY must be set");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface VirtualPatientCreationResult {
  virtualPatient: any;
  success: boolean;
  message: string;
}

export class VirtualPatientService {
  /**
   * Create a virtual patient from a completed SOAP note
   */
  async createVirtualPatientFromSoapNote(soapNoteId: number, userId: number): Promise<VirtualPatientCreationResult> {
    try {
      // Get the SOAP note
      const [soapNote] = await db.select().from(soapNotes).where(eq(soapNotes.id, soapNoteId));
      
      if (!soapNote || soapNote.userId !== userId) {
        return {
          virtualPatient: null,
          success: false,
          message: "SOAP note not found or access denied"
        };
      }

      if (soapNote.sessionStatus !== "completed") {
        return {
          virtualPatient: null,
          success: false,
          message: "SOAP note must be completed before creating virtual patient"
        };
      }

      // Generate virtual patient profile using AI
      const virtualPatientData = await this.generateVirtualPatientProfile(soapNote);
      
      // Create virtual patient in database
      const [createdVirtualPatient] = await db.insert(soapVirtualPatients).values({
        soapNoteId: soapNoteId,
        userId: userId,
        patientProfile: virtualPatientData.patientProfile,
        clinicalPresentation: virtualPatientData.clinicalPresentation,
        physicalFindings: virtualPatientData.physicalFindings,
        communicationStyle: virtualPatientData.communicationStyle,
        bodyPart: soapNote.bodyPart,
        complexity: virtualPatientData.complexity,
        estimatedDuration: virtualPatientData.estimatedDuration,
        prognosis: virtualPatientData.prognosis,
        generationPrompt: `Generated from SOAP note ID: ${soapNoteId}`,
        generationModel: "gpt-4o"
      }).returning();

      // Update SOAP note to mark virtual patient as generated
      await db.update(soapNotes)
        .set({
          virtualPatientGenerated: true,
          virtualPatientGeneratedAt: new Date()
        })
        .where(eq(soapNotes.id, soapNoteId));

      return {
        virtualPatient: createdVirtualPatient,
        success: true,
        message: "Virtual patient created successfully"
      };

    } catch (error) {
      console.error("Error creating virtual patient:", error);
      return {
        virtualPatient: null,
        success: false,
        message: "Failed to create virtual patient: " + (error as Error).message
      };
    }
  }

  /**
   * Generate virtual patient profile using AI
   */
  private async generateVirtualPatientProfile(soapNote: SoapNote): Promise<any> {
    try {
      const prompt = `
Based on the following completed SOAP note, create a comprehensive virtual patient profile for educational purposes. 
De-identify all personal information and create a realistic educational case study.

**SOAP Note Data:**
- Patient Name: ${soapNote.patientName || 'Anonymous'}
- Date of Visit: ${soapNote.dateOfVisit}
- Body Part: ${soapNote.bodyPart}
- Subjective: ${soapNote.subjective || 'Not provided'}
- Objective: ${soapNote.objective || 'Not provided'}
- Assessment: ${soapNote.assessment || 'Not provided'}
- Plan: ${soapNote.plan || 'Not provided'}
- Goals: ${soapNote.goals || 'Not provided'}
- Treatment: ${soapNote.treatment || 'Not provided'}
- Full Transcription: ${soapNote.fullTranscription?.slice(0, 1000) || 'Not available'}

Create a comprehensive virtual patient profile in JSON format with the following structure:

{
  "patientProfile": {
    "name": "De-identified name (e.g., 'Sarah M.' or 'John D.')",
    "age": realistic_age_number,
    "gender": "Male/Female/Other",
    "occupation": "realistic occupation",
    "lifestyle": "description of lifestyle factors",
    "medicalHistory": ["relevant medical history items"],
    "currentMedications": ["current medications if mentioned"],
    "familyHistory": "relevant family history"
  },
  "clinicalPresentation": {
    "chiefComplaint": "primary complaint in patient's words",
    "historyOfPresentIllness": "detailed history of current condition",
    "painScale": pain_scale_0_to_10,
    "functionalLimitations": ["specific functional limitations"],
    "symptomsTimeline": "timeline of symptom development",
    "aggravatingFactors": ["factors that worsen symptoms"],
    "relievingFactors": ["factors that improve symptoms"]
  },
  "physicalFindings": {
    "inspection": "visual assessment findings",
    "palpation": "palpation findings",
    "rangeOfMotion": "ROM assessment results",
    "strengthTesting": "strength testing results",
    "specialTests": ["performed special tests"],
    "neurologicalAssessment": "neurological findings",
    "functionalTests": ["functional assessment results"]
  },
  "communicationStyle": {
    "personality": "patient personality traits",
    "communicationPreferences": "how patient prefers to communicate",
    "concerns": ["patient's main concerns"],
    "expectations": ["patient's treatment expectations"],
    "motivationLevel": "High/Medium/Low",
    "complianceHistory": "history of following treatment plans"
  },
  "complexity": "beginner/intermediate/advanced",
  "estimatedDuration": "estimated treatment duration",
  "prognosis": "expected treatment outcome"
}

Focus on creating an educational case that:
- Protects patient privacy by de-identifying all personal information
- Maintains clinical accuracy and realism
- Provides comprehensive learning opportunities
- Includes realistic patient communication patterns
- Offers appropriate complexity for physiotherapy education
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert physiotherapy educator creating realistic, de-identified virtual patient cases for educational purposes."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const virtualPatientData = JSON.parse(response.choices[0].message.content || '{}');
      
      return virtualPatientData;

    } catch (error) {
      console.error("Error generating virtual patient profile:", error);
      // Return a basic template if AI generation fails
      return {
        patientProfile: {
          name: "Anonymous Patient",
          age: 35,
          gender: "Not specified",
          occupation: "Not specified",
          lifestyle: "Not specified",
          medicalHistory: [],
          currentMedications: [],
          familyHistory: "Not specified"
        },
        clinicalPresentation: {
          chiefComplaint: soapNote.subjective?.slice(0, 100) || "Patient presents with concerns",
          historyOfPresentIllness: soapNote.subjective || "History not available",
          painScale: 5,
          functionalLimitations: ["To be assessed"],
          symptomsTimeline: "Recent onset",
          aggravatingFactors: ["To be determined"],
          relievingFactors: ["To be determined"]
        },
        physicalFindings: {
          inspection: soapNote.objective || "Assessment findings not available",
          palpation: "To be assessed",
          rangeOfMotion: "To be assessed",
          strengthTesting: "To be assessed",
          specialTests: ["To be performed"],
          neurologicalAssessment: "To be assessed",
          functionalTests: ["To be performed"]
        },
        communicationStyle: {
          personality: "Cooperative",
          communicationPreferences: "Clear, direct communication",
          concerns: ["Pain relief", "Return to function"],
          expectations: ["Improve symptoms", "Return to activities"],
          motivationLevel: "Medium",
          complianceHistory: "Good"
        },
        complexity: "intermediate",
        estimatedDuration: "4-6 weeks",
        prognosis: "Good with appropriate treatment"
      };
    }
  }

  /**
   * Get virtual patients created by user
   */
  async getUserVirtualPatients(userId: number) {
    try {
      const virtualPatients = await db.select().from(soapVirtualPatients).where(eq(soapVirtualPatients.userId, userId));
      return virtualPatients;
    } catch (error) {
      console.error("Error getting user virtual patients:", error);
      return [];
    }
  }

  /**
   * Get specific virtual patient
   */
  async getVirtualPatient(virtualPatientId: number, userId: number) {
    try {
      const [virtualPatient] = await db.select()
        .from(soapVirtualPatients)
        .where(eq(soapVirtualPatients.id, virtualPatientId));
      
      if (!virtualPatient || virtualPatient.userId !== userId) {
        return null;
      }

      return virtualPatient;
    } catch (error) {
      console.error("Error getting virtual patient:", error);
      return null;
    }
  }

  /**
   * Toggle virtual patient public visibility
   */
  async togglePublicVisibility(virtualPatientId: number, userId: number, isPublic: boolean) {
    try {
      await db.update(soapVirtualPatients)
        .set({ isPublic })
        .where(eq(soapVirtualPatients.id, virtualPatientId));
        
      return true;
    } catch (error) {
      console.error("Error toggling virtual patient visibility:", error);
      return false;
    }
  }
}

export const virtualPatientService = new VirtualPatientService();