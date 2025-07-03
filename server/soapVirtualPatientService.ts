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

export interface VirtualPatientGenerationResult {
  virtualPatient: SoapVirtualPatient;
  success: boolean;
  message: string;
}

export class SoapVirtualPatientService {
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

      // Generate virtual patient using AI
      const virtualPatientData = await this.generateVirtualPatientWithAI(note);

      // Create the virtual patient record
      const insertData: InsertSoapVirtualPatient = {
        userId,
        soapNoteId,
        patientProfile: virtualPatientData.patientProfile,
        clinicalPresentation: virtualPatientData.clinicalPresentation,
        physicalFindings: virtualPatientData.physicalFindings,
        communicationStyle: virtualPatientData.communicationStyle,
        bodyPart: note.bodyPart || "other",
        complexity: virtualPatientData.complexity,
        estimatedDuration: virtualPatientData.estimatedDuration,
        prognosis: virtualPatientData.prognosis,
        generationPrompt: virtualPatientData.generationPrompt,
        generationModel: "gpt-4o"
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
   * Generate virtual patient data using OpenAI
   */
  private async generateVirtualPatientWithAI(soapNote: SoapNote): Promise<any> {
    try {
      const prompt = this.constructVirtualPatientPrompt(soapNote);

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert physiotherapist creating realistic virtual patient profiles from clinical notes. Generate comprehensive, anonymized patient profiles that maintain clinical accuracy while protecting privacy."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 3000
      });

      const responseContent = response.choices[0].message.content;
      if (!responseContent) {
        throw new Error("Empty response from OpenAI");
      }

      const virtualPatientData = JSON.parse(responseContent);
      virtualPatientData.generationPrompt = prompt;

      return virtualPatientData;

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
        .where(eq(soapVirtualPatients.id, id))
        .limit(1);

      if (!virtualPatient[0] || virtualPatient[0].userId !== userId) {
        return null;
      }

      return virtualPatient[0];
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
}

export const soapVirtualPatientService = new SoapVirtualPatientService();