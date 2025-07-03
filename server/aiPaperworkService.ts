import OpenAI from "openai";
import type { SoapNote } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface PaperworkGenerationResult {
  treatmentSummary: string;
  progressNotes: string;
  dischargeInstructions?: string;
  referralLetter?: string;
  insuranceDocumentation: string;
  billingCodes: string[];
  followUpRecommendations: string;
  homeExerciseProgram?: string;
  workCapacityAssessment?: string;
  functionalOutcomes: string;
  confidence: number;
}

export interface ReferralRequest {
  specialtyType: string;
  reason: string;
  urgency: 'routine' | 'urgent' | 'stat';
  clinicalFindings: string;
}

export interface InsuranceClaimData {
  primaryDiagnosis: string;
  secondaryDiagnoses: string[];
  treatmentCodes: string[];
  sessionCount: number;
  functionalImprovements: string[];
  medicalNecessity: string;
}

export class AIPaperworkService {
  /**
   * Generates comprehensive clinical paperwork from SOAP note
   */
  async generateAutomaticPaperwork(soapNote: SoapNote): Promise<PaperworkGenerationResult> {
    try {
      const prompt = `
You are an expert physiotherapy documentation specialist. Generate comprehensive clinical paperwork based on this SOAP note:

PATIENT: ${soapNote.patientName || 'Unknown'}
DATE: ${soapNote.dateOfVisit}
DURATION: ${soapNote.recordingDuration ? Math.round(soapNote.recordingDuration / 60) : 0} minutes

SUBJECTIVE: ${soapNote.subjective || 'None recorded'}
OBJECTIVE: ${soapNote.objective || 'None recorded'}
ASSESSMENT: ${soapNote.assessment || 'None recorded'}
PLAN: ${soapNote.plan || 'None recorded'}

Generate the following clinical documentation in JSON format:

{
  "treatmentSummary": "Comprehensive summary of treatment provided including techniques, modalities, and patient response",
  "progressNotes": "Detailed progress notes documenting functional improvements, pain levels, range of motion changes",
  "dischargeInstructions": "Patient education and discharge instructions (if applicable)",
  "referralLetter": "Referral letter to other healthcare providers (if needed)",
  "insuranceDocumentation": "Documentation justifying medical necessity for insurance purposes",
  "billingCodes": ["List of appropriate CPT codes for billing"],
  "followUpRecommendations": "Specific follow-up care recommendations and timelines",
  "homeExerciseProgram": "Detailed home exercise program with instructions",
  "workCapacityAssessment": "Assessment of work capacity and restrictions (if applicable)",
  "functionalOutcomes": "Objective functional outcome measures and improvements",
  "confidence": 85
}

Requirements:
- Use professional medical terminology
- Include specific measurements and objective data where available
- Ensure all documentation supports medical necessity
- Follow clinical best practices for documentation
- Include appropriate billing codes (CPT codes)
- Make recommendations evidence-based
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert physiotherapy documentation specialist. Generate comprehensive, professional clinical paperwork that meets healthcare standards and insurance requirements."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        treatmentSummary: result.treatmentSummary || "Treatment summary not available",
        progressNotes: result.progressNotes || "Progress notes not available",
        dischargeInstructions: result.dischargeInstructions,
        referralLetter: result.referralLetter,
        insuranceDocumentation: result.insuranceDocumentation || "Insurance documentation not available",
        billingCodes: result.billingCodes || [],
        followUpRecommendations: result.followUpRecommendations || "Follow-up recommendations not available",
        homeExerciseProgram: result.homeExerciseProgram,
        workCapacityAssessment: result.workCapacityAssessment,
        functionalOutcomes: result.functionalOutcomes || "Functional outcomes not available",
        confidence: result.confidence || 75
      };

    } catch (error) {
      console.error("Error generating automatic paperwork:", error);
      throw new Error("Failed to generate automatic paperwork");
    }
  }

  /**
   * Generates specialized referral letter
   */
  async generateReferralLetter(
    soapNote: SoapNote, 
    referralRequest: ReferralRequest
  ): Promise<string> {
    try {
      const prompt = `
Generate a professional referral letter based on this clinical information:

PATIENT: ${soapNote.patientName || 'Unknown'}
DATE: ${soapNote.dateOfVisit}

CLINICAL FINDINGS:
${referralRequest.clinicalFindings}

SOAP NOTE:
Subjective: ${soapNote.subjective || 'None'}
Objective: ${soapNote.objective || 'None'}
Assessment: ${soapNote.assessment || 'None'}
Plan: ${soapNote.plan || 'None'}

REFERRAL DETAILS:
- Specialty: ${referralRequest.specialtyType}
- Reason: ${referralRequest.reason}
- Urgency: ${referralRequest.urgency}

Generate a professional referral letter that includes:
1. Patient demographics and relevant history
2. Current clinical findings and assessment
3. Reason for referral and specific questions
4. Urgency level and timeline
5. Treatment provided to date
6. Professional contact information placeholder

Format as a formal medical referral letter.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a physiotherapist writing a professional referral letter to another healthcare provider. Use formal medical language and standard referral letter format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
      });

      return response.choices[0].message.content || "Referral letter generation failed";

    } catch (error) {
      console.error("Error generating referral letter:", error);
      throw new Error("Failed to generate referral letter");
    }
  }

  /**
   * Generates insurance claim documentation
   */
  async generateInsuranceDocumentation(
    soapNote: SoapNote, 
    sessionCount: number = 1
  ): Promise<InsuranceClaimData> {
    try {
      const prompt = `
Generate insurance claim documentation based on this physiotherapy session:

PATIENT: ${soapNote.patientName || 'Unknown'}
SESSION NUMBER: ${sessionCount}
DATE: ${soapNote.dateOfVisit}
DURATION: ${soapNote.recordingDuration ? Math.round(soapNote.recordingDuration / 60) : 0} minutes

CLINICAL DATA:
Subjective: ${soapNote.subjective || 'None'}
Objective: ${soapNote.objective || 'None'}
Assessment: ${soapNote.assessment || 'None'}
Plan: ${soapNote.plan || 'None'}

Generate insurance documentation in JSON format:

{
  "primaryDiagnosis": "Primary ICD-10 diagnosis code and description",
  "secondaryDiagnoses": ["List of secondary diagnosis codes"],
  "treatmentCodes": ["Appropriate CPT codes for treatments provided"],
  "sessionCount": ${sessionCount},
  "functionalImprovements": ["Specific functional improvements documented"],
  "medicalNecessity": "Detailed justification of medical necessity for continued treatment"
}

Requirements:
- Use appropriate ICD-10 diagnosis codes
- Include relevant CPT treatment codes
- Document objective functional improvements
- Justify medical necessity with specific clinical findings
- Support continued care with measurable outcomes
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert in physiotherapy billing and insurance documentation. Generate accurate, compliant documentation that supports medical necessity."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        primaryDiagnosis: result.primaryDiagnosis || "Primary diagnosis not determined",
        secondaryDiagnoses: result.secondaryDiagnoses || [],
        treatmentCodes: result.treatmentCodes || [],
        sessionCount: sessionCount,
        functionalImprovements: result.functionalImprovements || [],
        medicalNecessity: result.medicalNecessity || "Medical necessity documentation not available"
      };

    } catch (error) {
      console.error("Error generating insurance documentation:", error);
      throw new Error("Failed to generate insurance documentation");
    }
  }

  /**
   * Generates comprehensive discharge summary
   */
  async generateDischargeSummary(soapNotes: SoapNote[]): Promise<string> {
    try {
      if (soapNotes.length === 0) {
        throw new Error("No SOAP notes provided for discharge summary");
      }

      const firstSession = soapNotes[0];
      const lastSession = soapNotes[soapNotes.length - 1];
      const totalSessions = soapNotes.length;
      const totalDuration = soapNotes.reduce((sum, note) => sum + (note.recordingDuration || 0), 0);

      const prompt = `
Generate a comprehensive discharge summary for this physiotherapy patient:

PATIENT: ${firstSession.patientName || 'Unknown'}
TOTAL SESSIONS: ${totalSessions}
TREATMENT PERIOD: ${firstSession.dateOfVisit} to ${lastSession.dateOfVisit}
TOTAL TREATMENT TIME: ${Math.round(totalDuration / 60)} minutes

INITIAL ASSESSMENT (${firstSession.dateOfVisit}):
Subjective: ${firstSession.subjective || 'None'}
Objective: ${firstSession.objective || 'None'}
Assessment: ${firstSession.assessment || 'None'}
Plan: ${firstSession.plan || 'None'}

FINAL ASSESSMENT (${lastSession.dateOfVisit}):
Subjective: ${lastSession.subjective || 'None'}
Objective: ${lastSession.objective || 'None'}
Assessment: ${lastSession.assessment || 'None'}
Plan: ${lastSession.plan || 'None'}

Generate a comprehensive discharge summary including:
1. Patient demographics and initial presentation
2. Treatment interventions provided throughout care
3. Functional improvements and objective outcomes
4. Goals achieved and remaining limitations
5. Home exercise program and self-management strategies
6. Follow-up recommendations and return-to-activity guidelines
7. Prognosis and long-term management recommendations

Format as a professional discharge summary suitable for medical records.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a physiotherapist writing a comprehensive discharge summary. Include objective measurements, functional outcomes, and evidence-based recommendations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
      });

      return response.choices[0].message.content || "Discharge summary generation failed";

    } catch (error) {
      console.error("Error generating discharge summary:", error);
      throw new Error("Failed to generate discharge summary");
    }
  }

  /**
   * Generates treatment progress report
   */
  async generateProgressReport(
    soapNotes: SoapNote[], 
    reportingPeriod: { start: string; end: string }
  ): Promise<string> {
    try {
      const relevantNotes = soapNotes.filter(note => 
        note.dateOfVisit >= reportingPeriod.start && 
        note.dateOfVisit <= reportingPeriod.end
      );

      if (relevantNotes.length === 0) {
        throw new Error("No SOAP notes found for the specified reporting period");
      }

      const prompt = `
Generate a comprehensive progress report for this physiotherapy patient:

REPORTING PERIOD: ${reportingPeriod.start} to ${reportingPeriod.end}
SESSIONS IN PERIOD: ${relevantNotes.length}
PATIENT: ${relevantNotes[0].patientName || 'Unknown'}

SESSION SUMMARIES:
${relevantNotes.map((note, index) => `
Session ${index + 1} (${note.dateOfVisit}):
- Subjective: ${note.subjective || 'None'}
- Objective: ${note.objective || 'None'}
- Assessment: ${note.assessment || 'None'}
- Plan: ${note.plan || 'None'}
`).join('\n')}

Generate a professional progress report including:
1. Executive summary of progress during reporting period
2. Attendance and compliance summary
3. Functional improvements with objective measurements
4. Response to treatment interventions
5. Barriers to progress and adaptations made
6. Current status and functional level
7. Recommendations for continued care
8. Updated goals and treatment plan

Format as a formal progress report suitable for insurance reviews or medical records.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a physiotherapist writing a detailed progress report. Focus on objective outcomes, functional improvements, and evidence-based treatment modifications."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
      });

      return response.choices[0].message.content || "Progress report generation failed";

    } catch (error) {
      console.error("Error generating progress report:", error);
      throw new Error("Failed to generate progress report");
    }
  }
}

export const aiPaperworkService = new AIPaperworkService();