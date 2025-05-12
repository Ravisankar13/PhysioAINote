import OpenAI from "openai";
import { SoapNoteInput } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    const result = JSON.parse(response.choices[0].message.content);
    
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
  } catch (error) {
    console.error("Error generating SOAP note:", error);
    throw new Error(`Failed to generate SOAP note: ${error.message}`);
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
