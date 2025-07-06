import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SoapData {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export interface FormGenerationRequest {
  formType: 'doctor_report' | 'ahtr' | 'imaging_referral' | 'discharge_summary' | 'progress_report' | 'specialist_referral' | 'return_to_work' | 'time_off_work' | 'insurance_documentation';
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
   * Generates a discharge summary
   */
  async generateDischargeSummary(request: FormGenerationRequest): Promise<string> {
    const { soapData, patientName, date } = request;
    
    const prompt = `Generate a comprehensive discharge summary based on the following clinical information:

Patient: ${patientName}
Date: ${new Date(date).toLocaleDateString()}

SOAP Notes:
Subjective: ${soapData.subjective || 'Not recorded'}
Objective: ${soapData.objective || 'Not recorded'}
Assessment: ${soapData.assessment || 'Not recorded'}
Plan: ${soapData.plan || 'Not recorded'}

Please create a professional discharge summary that includes:
1. Admission Date and Reason for Treatment
2. Hospital Course and Treatments Provided
3. Discharge Diagnosis and Condition
4. Medications and Treatment Plan
5. Follow-up Instructions and Appointments
6. Activity Restrictions and Precautions
7. Provider Recommendations

Format as a formal medical discharge summary suitable for continuity of care.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a medical documentation assistant that creates professional discharge summaries for physiotherapy patients."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
      });

      return response.choices[0].message.content || "Unable to generate discharge summary";
    } catch (error) {
      console.error("Error generating discharge summary:", error);
      throw new Error("Failed to generate discharge summary");
    }
  }

  /**
   * Generates a progress report
   */
  async generateProgressReport(request: FormGenerationRequest): Promise<string> {
    const { soapData, patientName, date } = request;
    
    const prompt = `Generate a comprehensive progress report based on the following clinical information:

Patient: ${patientName}
Date: ${new Date(date).toLocaleDateString()}

SOAP Notes:
Subjective: ${soapData.subjective || 'Not recorded'}
Objective: ${soapData.objective || 'Not recorded'}
Assessment: ${soapData.assessment || 'Not recorded'}
Plan: ${soapData.plan || 'Not recorded'}

Please create a professional progress report that includes:
1. Initial Presentation and Baseline Status
2. Treatment Goals and Objectives
3. Interventions Provided and Frequency
4. Patient Response to Treatment
5. Functional Improvements and Outcomes
6. Current Status and Remaining Deficits
7. Revised Treatment Plan and Goals
8. Prognosis and Expected Outcomes

Format as a formal medical progress report suitable for insurance or referral purposes.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a medical documentation assistant that creates professional progress reports for physiotherapy patients."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
      });

      return response.choices[0].message.content || "Unable to generate progress report";
    } catch (error) {
      console.error("Error generating progress report:", error);
      throw new Error("Failed to generate progress report");
    }
  }

  /**
   * Generates a specialist referral
   */
  async generateSpecialistReferral(request: FormGenerationRequest): Promise<string> {
    const { soapData, patientName, date } = request;
    
    const prompt = `Generate a comprehensive specialist referral based on the following clinical information:

Patient: ${patientName}
Date: ${new Date(date).toLocaleDateString()}

SOAP Notes:
Subjective: ${soapData.subjective || 'Not recorded'}
Objective: ${soapData.objective || 'Not recorded'}
Assessment: ${soapData.assessment || 'Not recorded'}
Plan: ${soapData.plan || 'Not recorded'}

Please create a professional specialist referral that includes:
1. Patient Demographics and Contact Information
2. Referring Provider Details
3. Reason for Referral and Clinical Question
4. Relevant Medical History
5. Current Symptoms and Functional Status
6. Physical Examination Findings
7. Diagnostic Test Results (if any)
8. Treatment Attempted and Response
9. Urgency Level and Preferred Timeframe
10. Specific Recommendations or Questions for Specialist

Format as a formal medical referral suitable for specialist consultation.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a medical documentation assistant that creates professional specialist referrals for physiotherapy patients."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
      });

      return response.choices[0].message.content || "Unable to generate specialist referral";
    } catch (error) {
      console.error("Error generating specialist referral:", error);
      throw new Error("Failed to generate specialist referral");
    }
  }

  /**
   * Generates a return to work certificate
   */
  async generateReturnToWorkCertificate(request: FormGenerationRequest): Promise<string> {
    const { soapData, patientName, date } = request;
    
    const prompt = `Generate a return to work certificate based on the following clinical information:

Patient: ${patientName}
Date: ${new Date(date).toLocaleDateString()}

SOAP Notes:
Subjective: ${soapData.subjective || 'Not recorded'}
Objective: ${soapData.objective || 'Not recorded'}
Assessment: ${soapData.assessment || 'Not recorded'}
Plan: ${soapData.plan || 'Not recorded'}

Please create a professional return to work certificate that includes:
1. Patient identification and medical clearance
2. Work capacity and functional abilities
3. Activity restrictions and modifications
4. Recommended work schedule and duties
5. Follow-up requirements
6. Duration of certificate validity
7. Provider credentials and contact information

Format as an official medical certificate suitable for employer verification.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a medical documentation assistant that creates professional return to work certificates for physiotherapy patients."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
      });

      return response.choices[0].message.content || "Unable to generate return to work certificate";
    } catch (error) {
      console.error("Error generating return to work certificate:", error);
      throw new Error("Failed to generate return to work certificate");
    }
  }

  /**
   * Generates a time off work certificate
   */
  async generateTimeOffWorkCertificate(request: FormGenerationRequest): Promise<string> {
    const { soapData, patientName, date } = request;
    
    const prompt = `Generate a time off work certificate based on the following clinical information:

Patient: ${patientName}
Date: ${new Date(date).toLocaleDateString()}

SOAP Notes:
Subjective: ${soapData.subjective || 'Not recorded'}
Objective: ${soapData.objective || 'Not recorded'}
Assessment: ${soapData.assessment || 'Not recorded'}
Plan: ${soapData.plan || 'Not recorded'}

Please create a professional time off work certificate that includes:
1. Patient identification and medical condition
2. Work incapacity period and restrictions
3. Medical justification for time off
4. Treatment plan and expected recovery time
5. Follow-up requirements and review dates
6. Provider credentials and contact information

Format as an official medical certificate suitable for employer and insurance verification.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a medical documentation assistant that creates professional time off work certificates for physiotherapy patients."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
      });

      return response.choices[0].message.content || "Unable to generate time off work certificate";
    } catch (error) {
      console.error("Error generating time off work certificate:", error);
      throw new Error("Failed to generate time off work certificate");
    }
  }

  /**
   * Generates insurance documentation
   */
  async generateInsuranceDocumentation(request: FormGenerationRequest): Promise<string> {
    const { soapData, patientName, date } = request;
    
    const prompt = `Generate comprehensive insurance documentation based on the following clinical information:

Patient: ${patientName}
Date: ${new Date(date).toLocaleDateString()}

SOAP Notes:
Subjective: ${soapData.subjective || 'Not recorded'}
Objective: ${soapData.objective || 'Not recorded'}
Assessment: ${soapData.assessment || 'Not recorded'}
Plan: ${soapData.plan || 'Not recorded'}

Please create professional insurance documentation that includes:
1. Primary and secondary diagnoses with ICD-10 codes
2. Medical necessity justification
3. Treatment history and interventions provided
4. Functional status and impairment levels
5. Treatment goals and expected outcomes
6. Progress measurements and objective findings
7. CPT codes for treatments provided
8. Provider qualifications and treatment rationale
9. Prognosis and anticipated treatment duration

Format as comprehensive insurance documentation suitable for claim processing and approval.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a medical documentation assistant that creates professional insurance documentation for physiotherapy patients."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
      });

      return response.choices[0].message.content || "Unable to generate insurance documentation";
    } catch (error) {
      console.error("Error generating insurance documentation:", error);
      throw new Error("Failed to generate insurance documentation");
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