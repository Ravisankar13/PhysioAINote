import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SoapData {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export interface FormGenerationRequest {
  formType: 'doctor_report' | 'ahtr' | 'imaging_referral';
  soapData: SoapData;
  patientName: string;
  date: string;
}

export class DocumentGenerationService {
  /**
   * Generates a doctor report PDF from SOAP data
   */
  async generateDoctorReport(request: FormGenerationRequest): Promise<string> {
    const { soapData, patientName, date } = request;
    
    const prompt = `Generate a comprehensive doctor's report based on the following clinical information:

Patient: ${patientName}
Date: ${new Date(date).toLocaleDateString()}

SOAP Notes:
Subjective: ${soapData.subjective || 'Not recorded'}
Objective: ${soapData.objective || 'Not recorded'}
Assessment: ${soapData.assessment || 'Not recorded'}
Plan: ${soapData.plan || 'Not recorded'}

Please create a professional medical report that includes:
1. Patient Demographics (use placeholder data)
2. Chief Complaint and History
3. Physical Examination Findings
4. Clinical Assessment and Diagnosis
5. Treatment Plan and Recommendations
6. Follow-up Instructions
7. Provider Information (use placeholder data)

Format the report as a formal medical document suitable for referral or insurance purposes.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a medical documentation assistant that creates professional clinical reports. Format the output as a comprehensive medical report."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
      });

      return response.choices[0].message.content || "Unable to generate report";
    } catch (error) {
      console.error("Error generating doctor report:", error);
      throw new Error("Failed to generate doctor report");
    }
  }

  /**
   * Generates an AHTR (Allied Health Treatment Record) submission
   */
  async generateAHTR(request: FormGenerationRequest): Promise<string> {
    const { soapData, patientName, date } = request;
    
    const prompt = `Generate an Allied Health Treatment Record (AHTR) submission based on the following clinical information:

Patient: ${patientName}
Date: ${new Date(date).toLocaleDateString()}

SOAP Notes:
Subjective: ${soapData.subjective || 'Not recorded'}
Objective: ${soapData.objective || 'Not recorded'}
Assessment: ${soapData.assessment || 'Not recorded'}
Plan: ${soapData.plan || 'Not recorded'}

Please create a professional AHTR submission that includes:
1. Patient Information and Demographics
2. Referring Doctor Details
3. Clinical History and Presenting Problem
4. Assessment Findings and Diagnosis
5. Treatment Goals and Objectives
6. Proposed Treatment Plan
7. Expected Outcomes and Timeframes
8. Physiotherapist Details and Qualifications

Format as a formal AHTR submission suitable for funding approval.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a medical documentation assistant that creates professional AHTR submissions for physiotherapy treatment funding."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
      });

      return response.choices[0].message.content || "Unable to generate AHTR";
    } catch (error) {
      console.error("Error generating AHTR:", error);
      throw new Error("Failed to generate AHTR");
    }
  }

  /**
   * Generates an imaging referral form
   */
  async generateImagingReferral(request: FormGenerationRequest): Promise<string> {
    const { soapData, patientName, date } = request;
    
    const prompt = `Generate an imaging referral form based on the following clinical information:

Patient: ${patientName}
Date: ${new Date(date).toLocaleDateString()}

SOAP Notes:
Subjective: ${soapData.subjective || 'Not recorded'}
Objective: ${soapData.objective || 'Not recorded'}
Assessment: ${soapData.assessment || 'Not recorded'}
Plan: ${soapData.plan || 'Not recorded'}

Please create a professional imaging referral that includes:
1. Patient Demographics and Contact Information
2. Referring Clinician Details
3. Clinical History and Mechanism of Injury
4. Physical Examination Findings
5. Provisional Diagnosis
6. Specific Imaging Request (X-ray, MRI, Ultrasound, etc.)
7. Clinical Question to be Answered
8. Urgency Level and Timeframe
9. Relevant Safety Information

Based on the clinical presentation, recommend the most appropriate imaging modality and provide clear clinical justification.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a medical documentation assistant that creates professional imaging referral forms. Recommend appropriate imaging based on clinical findings."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
      });

      return response.choices[0].message.content || "Unable to generate imaging referral";
    } catch (error) {
      console.error("Error generating imaging referral:", error);
      throw new Error("Failed to generate imaging referral");
    }
  }

  /**
   * Converts text content to PDF-like format
   */
  async textToPDF(content: string, title: string): Promise<Buffer> {
    // For now, we'll return the content as a formatted text file
    // In a production environment, you would use a PDF generation library like PDFKit or Puppeteer
    const formattedContent = `${title}\n${'='.repeat(title.length)}\n\n${content}`;
    return Buffer.from(formattedContent, 'utf-8');
  }
}

export const documentGenerationService = new DocumentGenerationService();