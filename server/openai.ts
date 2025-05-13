import OpenAI from "openai";
import { SoapNoteInput } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Interface for patient information from transcript
export interface PatientInfoFromTranscript {
  patientInfo: {
    patientName: string;
    age?: string;
    gender?: string;
    pastMedicalHistory?: string;
    pastSurgicalHistory?: string;
  };
  transcript: string;
}

export async function generateSoapNote(noteInput: SoapNoteInput) {
  try {
    const prompt = constructSoapPrompt(noteInput);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert physiotherapist with experience in writing detailed SOAP notes. Create a professional, comprehensive clinical note in SOAP format based on the information provided. Use professional medical terminology and provide a thorough assessment and treatment plan."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("OpenAI returned empty response");
    }
    
    const result = JSON.parse(content);
    
    // Combine the original input with AI-enhanced sections
    return {
      patientName: noteInput.patientName,
      patientId: noteInput.patientId,
      dateOfBirth: noteInput.dateOfBirth,
      dateOfVisit: noteInput.dateOfVisit,
      subjective: result.subjective || noteInput.subjective,
      objective: result.objective || noteInput.objective,
      assessment: result.assessment || noteInput.assessment || "",
      plan: result.plan || noteInput.plan || "",
      fullNote: result
    };
  } catch (error: any) {
    console.error("Error generating SOAP note:", error);
    throw new Error(`Failed to generate SOAP note: ${error.message || "Unknown error"}`);
  }
}

function constructSoapPrompt(input: SoapNoteInput): string {
  return `
Create a detailed physiotherapy SOAP note for the following patient:

Patient Name: ${input.patientName}
Patient ID: ${input.patientId}
Date of Birth: ${input.dateOfBirth}
Date of Visit: ${input.dateOfVisit}

Please expand on the information provided below and create a professional, comprehensive clinical note in SOAP format.

Subjective Information:
${input.subjective}

Objective Information:
${input.objective}

${input.assessment ? `Assessment Information:\n${input.assessment}` : ''}

${input.plan ? `Plan Information:\n${input.plan}` : ''}

Return the note in JSON format with the following structure:
{
  "subjective": "expanded and professionally formatted subjective section",
  "objective": "expanded and professionally formatted objective section with appropriate subsections like ROM, strength, special tests, etc.",
  "assessment": "detailed clinical assessment based on the subjective and objective findings",
  "plan": "comprehensive treatment plan including specific interventions, frequency, duration, and goals"
}
`;
}

/**
 * Generates a SOAP note directly from an audio transcript and patient info
 * @param input The transcript and patient info
 * @returns SOAP note object
 */
export async function generateSoapNoteFromTranscript(input: PatientInfoFromTranscript) {
  try {
    const transcriptPrompt = constructTranscriptPrompt(input);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert physiotherapist with extensive experience in writing detailed SOAP notes from patient interactions. Create a professional, comprehensive clinical note in SOAP format based on the transcript of a patient session and other information provided. Use professional medical terminology and provide a thorough assessment and treatment plan."
        },
        {
          role: "user",
          content: transcriptPrompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("OpenAI returned empty response");
    }
    
    const result = JSON.parse(content);
    
    // Return the complete SOAP note
    return {
      subjective: result.subjective || "",
      objective: result.objective || "",
      assessment: result.assessment || "",
      plan: result.plan || "",
      status: "completed"
    };
  } catch (error: any) {
    console.error("Error generating SOAP note from transcript:", error);
    throw new Error(`Failed to generate SOAP note from transcript: ${error.message || "Unknown error"}`);
  }
}

/**
 * Constructs a prompt for generating a SOAP note from a transcript
 * @param input The transcript and patient info
 * @returns Formatted prompt string
 */
function constructTranscriptPrompt(input: PatientInfoFromTranscript): string {
  const { patientInfo, transcript } = input;
  
  return `
Generate a comprehensive physiotherapy SOAP note based on the following transcript of a patient session.

Patient Information:
- Name: ${patientInfo.patientName || "Patient"}
- Age: ${patientInfo.age || "Not provided"}
- Gender: ${patientInfo.gender || "Not provided"}
${patientInfo.pastMedicalHistory ? `- Past Medical History: ${patientInfo.pastMedicalHistory}` : ''}
${patientInfo.pastSurgicalHistory ? `- Past Surgical History: ${patientInfo.pastSurgicalHistory}` : ''}

Transcript of Session:
"""
${transcript}
"""

Based on this transcript, create a detailed physiotherapy SOAP note with the following sections:

1. Subjective: Patient's reported symptoms, history of present illness, and relevant background information.
2. Objective: Physical examination findings, measurements, and test results.
3. Assessment: Clinical impression, diagnosis, and clinical reasoning.
4. Plan: Treatment plan, interventions, home exercises, goals, and follow-up recommendations.

Return the note in JSON format with the following structure:
{
  "subjective": "detailed subjective section",
  "objective": "detailed objective section with appropriate subsections",
  "assessment": "detailed assessment section",
  "plan": "detailed plan section"
}
`;
}
