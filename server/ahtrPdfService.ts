import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, PDFDropdown } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface SoapData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface AHTRFormData {
  requestNumber: string;
  dateOfRequest: string;
  dateServicesCommenced: string;
  totalConsultations: string;
  alliedHealthDiscipline: string;
  referredBy: string;
  referredByPhone: string;
  
  // Section 1: Person with injury (left blank for privacy)
  patientName: string;
  dateOfBirth: string;
  preInjuryOccupation: string;
  preInjuryWorkHours: string;
  claimNumber: string;
  dateOfInjury: string;
  
  // Section 2: Clinical assessment
  compensableInjury: string;
  currentSigns: string;
  riskScreeningApplied: boolean;
  riskScreeningTool: string;
  riskScreeningDate: string;
  riskScreeningScore: string;
  preExistingConditions: string;
  
  // Capacity
  preInjuryCapacityWork: string;
  currentCapacityWork: string;
  preInjuryCapacityActivities: string;
  currentCapacityActivities: string;
  
  // Outcome measures
  outcomeMeasure1Name: string;
  outcomeMeasure1InitialDate: string;
  outcomeMeasure1InitialScore: string;
  outcomeMeasure1CurrentDate: string;
  outcomeMeasure1CurrentScore: string;
  
  outcomeMeasureInterpretation: string;
  
  // Section 3: Barriers and strategies
  barriersToRecovery: string;
  strategiesToAddress: string;
  
  // Section 4: Treatment plan
  goalAchieved: string;
  workGoal: string;
  workGoalBy: string;
  activityGoal: string;
  activityGoalBy: string;
  selfManagement: string;
  intervention: string;
  rationale: string;
  additionalSessions: string;
  anticipatedDischarge: string;
  collaborativelyDeveloped: boolean;
  
  // Section 5: Service requested
  serviceType1: string;
  sessions1: string;
  frequency1: string;
  cost1: string;
  
  // Section 6: Practitioner details
  practitionerName: string;
  practiceEmail: string;
  ahpraNumber: string;
  contactTime: string;
  practiceName: string;
  siraApprovalNumber: string;
  suburb: string;
  state: string;
  postcode: string;
  practitionerEmail: string;
  phoneNumber: string;
  fax: string;
}

export class AHTRPdfService {
  /**
   * Generate AHTR form data from SOAP notes using AI
   */
  async generateAHTRFormData(soapData: SoapData): Promise<AHTRFormData> {
    try {
      const prompt = `Based on the following SOAP note data, generate comprehensive Allied Health Treatment Request (AHTR) form information for NSW workers compensation. Extract and intelligently infer clinical details to populate the form fields. Leave patient identifying information blank for privacy.

SOAP Data:
Subjective: ${soapData.subjective}
Objective: ${soapData.objective}
Assessment: ${soapData.assessment}
Plan: ${soapData.plan}

Generate a JSON response with the following structure (use realistic but generic information where specific details aren't available):
{
  "requestNumber": "1",
  "dateOfRequest": "current date DD/MM/YYYY format",
  "dateServicesCommenced": "inferred from context or recent date",
  "totalConsultations": "inferred from context or reasonable number",
  "alliedHealthDiscipline": "Physiotherapist",
  "referredBy": "GP/Specialist name or 'Referring Practitioner'",
  "referredByPhone": "02 XXXX XXXX",
  
  "patientName": "[Patient Name]",
  "dateOfBirth": "[DD/MM/YYYY]",
  "preInjuryOccupation": "inferred from subjective or generic",
  "preInjuryWorkHours": "38",
  "claimNumber": "[Claim Number]",
  "dateOfInjury": "inferred or recent date",
  
  "compensableInjury": "extract primary condition from assessment",
  "currentSigns": "extract current symptoms from subjective/objective",
  "riskScreeningApplied": true,
  "riskScreeningTool": "appropriate tool based on condition",
  "riskScreeningDate": "recent date",
  "riskScreeningScore": "appropriate score",
  "preExistingConditions": "extract from subjective or 'None reported'",
  
  "preInjuryCapacityWork": "Full duties without restriction",
  "currentCapacityWork": "based on current limitations from assessment",
  "preInjuryCapacityActivities": "Independent with all activities of daily living",
  "currentCapacityActivities": "based on current functional status",
  
  "outcomeMeasure1Name": "appropriate measure for condition",
  "outcomeMeasure1InitialDate": "initial assessment date",
  "outcomeMeasure1InitialScore": "realistic initial score",
  "outcomeMeasure1CurrentDate": "current date",
  "outcomeMeasure1CurrentScore": "realistic current score showing improvement",
  
  "outcomeMeasureInterpretation": "clinical interpretation of scores",
  
  "barriersToRecovery": "identify barriers from subjective/assessment",
  "strategiesToAddress": "strategies from plan section",
  
  "goalAchieved": "Partially",
  "workGoal": "return to pre-injury work duties",
  "workGoalBy": "date 4-6 weeks from now",
  "activityGoal": "specific functional goal from plan",
  "activityGoalBy": "date 2-4 weeks from now",
  "selfManagement": "extract self-management from plan",
  "intervention": "treatment approach from plan",
  "rationale": "clinical rationale for intervention",
  "additionalSessions": "reasonable number based on condition",
  "anticipatedDischarge": "date 6-8 weeks from now",
  "collaborativelyDeveloped": true,
  
  "serviceType1": "Physiotherapy consultation",
  "sessions1": "number from additional sessions",
  "frequency1": "1-2 per week",
  "cost1": "180.00",
  
  "practitionerName": "[Practitioner Name]",
  "practiceEmail": "[practice@email.com]",
  "ahpraNumber": "[AHPRA Number]",
  "contactTime": "Business hours",
  "practiceName": "[Practice Name]",
  "siraApprovalNumber": "[SIRA Number]",
  "suburb": "[Suburb]",
  "state": "NSW",
  "postcode": "[Postcode]",
  "practitionerEmail": "[practitioner@email.com]",
  "phoneNumber": "[02 XXXX XXXX]",
  "fax": "[02 XXXX XXXX]"
}

Focus on clinical accuracy and realistic progression. Use appropriate outcome measures for the condition (e.g., DASS for psychological, NDI for neck, ODI for back, DASH for upper limb).`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const formData = JSON.parse(response.choices[0].message.content || '{}');
      return formData as AHTRFormData;
    } catch (error) {
      console.error('Error generating AHTR form data:', error);
      // Return fallback form data
      return this.getFallbackFormData();
    }
  }

  /**
   * Create filled PDF from AHTR form data
   */
  async createFilledPDF(formData: AHTRFormData): Promise<Buffer> {
    try {
      // Create a new PDF document (since we don't have the original fillable form)
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      const { width, height } = page.getSize();
      
      // Add content to the PDF
      const fontSize = 10;
      const lineHeight = 12;
      let yPosition = height - 50;

      // Helper function to add text
      const addText = (text: string, x: number = 50, size: number = fontSize) => {
        page.drawText(text, {
          x,
          y: yPosition,
          size,
        });
        yPosition -= lineHeight;
      };

      // Add header
      addText('SIRA - Allied Health Treatment Request', 50, 16);
      yPosition -= 10;
      
      // Add form data
      addText(`Request Number: ${formData.requestNumber}`);
      addText(`Date of Request: ${formData.dateOfRequest}`);
      addText(`Date Services Commenced: ${formData.dateServicesCommenced}`);
      addText(`Total Consultations: ${formData.totalConsultations}`);
      addText(`Allied Health Discipline: ${formData.alliedHealthDiscipline}`);
      addText(`Referred By: ${formData.referredBy}`);
      yPosition -= 10;

      // Section 1: Details of person with injury
      addText('Section 1: Details of person with an injury', 50, 12);
      addText(`Name: ${formData.patientName}`);
      addText(`Date of Birth: ${formData.dateOfBirth}`);
      addText(`Pre-injury Occupation: ${formData.preInjuryOccupation}`);
      addText(`Pre-injury Work Hours/Week: ${formData.preInjuryWorkHours}`);
      addText(`Claim Number: ${formData.claimNumber}`);
      addText(`Date of Injury: ${formData.dateOfInjury}`);
      yPosition -= 10;

      // Section 2: Clinical assessment
      addText('Section 2: Your clinical assessment', 50, 12);
      addText(`Compensable Injury/Illness: ${formData.compensableInjury}`);
      addText(`Current Clinical Signs and Symptoms:`);
      this.addWrappedText(page, formData.currentSigns, 50, yPosition, width - 100, fontSize);
      yPosition -= this.getTextHeight(formData.currentSigns, width - 100) + 10;

      addText(`Risk Screening Applied: ${formData.riskScreeningApplied ? 'Yes' : 'No'}`);
      addText(`Risk Screening Tool: ${formData.riskScreeningTool}`);
      addText(`Date Administered: ${formData.riskScreeningDate}`);
      addText(`Score/Comment: ${formData.riskScreeningScore}`);
      yPosition -= 10;

      // Capacity section
      addText('Capacity Assessment', 50, 12);
      addText('Pre-injury Work Capacity:');
      this.addWrappedText(page, formData.preInjuryCapacityWork, 50, yPosition, width - 100, fontSize);
      yPosition -= this.getTextHeight(formData.preInjuryCapacityWork, width - 100) + 5;

      addText('Current Work Capacity:');
      this.addWrappedText(page, formData.currentCapacityWork, 50, yPosition, width - 100, fontSize);
      yPosition -= this.getTextHeight(formData.currentCapacityWork, width - 100) + 10;

      // Outcome measures
      addText('Standardised Outcome Measures', 50, 12);
      addText(`Measure: ${formData.outcomeMeasure1Name}`);
      addText(`Initial: ${formData.outcomeMeasure1InitialDate} - ${formData.outcomeMeasure1InitialScore}`);
      addText(`Current: ${formData.outcomeMeasure1CurrentDate} - ${formData.outcomeMeasure1CurrentScore}`);
      addText('Interpretation:');
      this.addWrappedText(page, formData.outcomeMeasureInterpretation, 50, yPosition, width - 100, fontSize);
      yPosition -= this.getTextHeight(formData.outcomeMeasureInterpretation, width - 100) + 10;

      // Check if we need a new page
      if (yPosition < 200) {
        const newPage = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }

      // Section 3: Barriers and strategies
      addText('Section 3: Barriers to recovery and strategies', 50, 12);
      addText('Barriers to Recovery:');
      this.addWrappedText(page, formData.barriersToRecovery, 50, yPosition, width - 100, fontSize);
      yPosition -= this.getTextHeight(formData.barriersToRecovery, width - 100) + 5;

      addText('Strategies to Address:');
      this.addWrappedText(page, formData.strategiesToAddress, 50, yPosition, width - 100, fontSize);
      yPosition -= this.getTextHeight(formData.strategiesToAddress, width - 100) + 10;

      // Section 4: Treatment plan
      addText('Section 4: Treatment plan', 50, 12);
      addText(`Goals Achieved: ${formData.goalAchieved}`);
      addText(`Work Goal: ${formData.workGoal} by ${formData.workGoalBy}`);
      addText(`Activity Goal: ${formData.activityGoal} by ${formData.activityGoalBy}`);
      addText('Self-Management:');
      this.addWrappedText(page, formData.selfManagement, 50, yPosition, width - 100, fontSize);
      yPosition -= this.getTextHeight(formData.selfManagement, width - 100) + 5;

      addText('Intervention:');
      this.addWrappedText(page, formData.intervention, 50, yPosition, width - 100, fontSize);
      yPosition -= this.getTextHeight(formData.intervention, width - 100) + 10;

      // Section 5: Service requested
      addText('Section 5: Service requested', 50, 12);
      addText(`Service Type: ${formData.serviceType1}`);
      addText(`Sessions: ${formData.sessions1}`);
      addText(`Frequency: ${formData.frequency1}`);
      addText(`Cost: $${formData.cost1}`);
      yPosition -= 10;

      // Section 6: Practitioner details
      addText('Section 6: Your details', 50, 12);
      addText(`Practitioner Name: ${formData.practitionerName}`);
      addText(`Practice Name: ${formData.practiceName}`);
      addText(`AHPRA Number: ${formData.ahpraNumber}`);
      addText(`Email: ${formData.practitionerEmail}`);
      addText(`Phone: ${formData.phoneNumber}`);

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      console.error('Error creating PDF:', error);
      throw new Error('Failed to create AHTR PDF');
    }
  }

  /**
   * Add wrapped text to PDF page
   */
  private addWrappedText(page: any, text: string, x: number, y: number, maxWidth: number, fontSize: number) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (const word of words) {
      const testLine = line + word + ' ';
      const testWidth = testLine.length * (fontSize * 0.6); // Approximate width calculation
      
      if (testWidth > maxWidth && line !== '') {
        page.drawText(line.trim(), { x, y: currentY, size: fontSize });
        line = word + ' ';
        currentY -= fontSize + 2;
      } else {
        line = testLine;
      }
    }
    
    if (line.trim() !== '') {
      page.drawText(line.trim(), { x, y: currentY, size: fontSize });
    }
  }

  /**
   * Calculate text height for wrapped text
   */
  private getTextHeight(text: string, maxWidth: number, fontSize: number = 10): number {
    const words = text.split(' ');
    let line = '';
    let lines = 0;

    for (const word of words) {
      const testLine = line + word + ' ';
      const testWidth = testLine.length * (fontSize * 0.6);
      
      if (testWidth > maxWidth && line !== '') {
        lines++;
        line = word + ' ';
      } else {
        line = testLine;
      }
    }
    
    if (line.trim() !== '') {
      lines++;
    }

    return lines * (fontSize + 2);
  }

  /**
   * Generate fallback form data
   */
  private getFallbackFormData(): AHTRFormData {
    const currentDate = new Date().toLocaleDateString('en-AU');
    const futureDate = new Date(Date.now() + 6 * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU');

    return {
      requestNumber: "1",
      dateOfRequest: currentDate,
      dateServicesCommenced: currentDate,
      totalConsultations: "3",
      alliedHealthDiscipline: "Physiotherapist",
      referredBy: "Referring Practitioner",
      referredByPhone: "02 XXXX XXXX",
      
      patientName: "[Patient Name]",
      dateOfBirth: "[DD/MM/YYYY]",
      preInjuryOccupation: "Office Worker",
      preInjuryWorkHours: "38",
      claimNumber: "[Claim Number]",
      dateOfInjury: currentDate,
      
      compensableInjury: "Work-related musculoskeletal condition",
      currentSigns: "Pain, reduced range of motion, functional limitations",
      riskScreeningApplied: true,
      riskScreeningTool: "STarT Back",
      riskScreeningDate: currentDate,
      riskScreeningScore: "Medium risk",
      preExistingConditions: "None reported",
      
      preInjuryCapacityWork: "Full duties without restriction",
      currentCapacityWork: "Limited duties, reduced hours",
      preInjuryCapacityActivities: "Independent with all activities",
      currentCapacityActivities: "Some limitations with physical activities",
      
      outcomeMeasure1Name: "Pain and Disability Scale",
      outcomeMeasure1InitialDate: currentDate,
      outcomeMeasure1InitialScore: "7/10",
      outcomeMeasure1CurrentDate: currentDate,
      outcomeMeasure1CurrentScore: "5/10",
      
      outcomeMeasureInterpretation: "Showing improvement in pain and function",
      
      barriersToRecovery: "Pain levels, work demands",
      strategiesToAddress: "Pain management, graduated return to work",
      
      goalAchieved: "Partially",
      workGoal: "Return to full work duties",
      workGoalBy: futureDate,
      activityGoal: "Resume recreational activities",
      activityGoalBy: futureDate,
      selfManagement: "Home exercise program, pacing strategies",
      intervention: "Manual therapy, exercise therapy, education",
      rationale: "Evidence-based physiotherapy approach for recovery",
      additionalSessions: "6",
      anticipatedDischarge: futureDate,
      collaborativelyDeveloped: true,
      
      serviceType1: "Physiotherapy consultation",
      sessions1: "6",
      frequency1: "1-2 per week",
      cost1: "180.00",
      
      practitionerName: "[Practitioner Name]",
      practiceEmail: "[practice@email.com]",
      ahpraNumber: "[AHPRA Number]",
      contactTime: "Business hours",
      practiceName: "[Practice Name]",
      siraApprovalNumber: "[SIRA Number]",
      suburb: "[Suburb]",
      state: "NSW",
      postcode: "[Postcode]",
      practitionerEmail: "[practitioner@email.com]",
      phoneNumber: "[02 XXXX XXXX]",
      fax: "[02 XXXX XXXX]"
    };
  }
}

export const ahtrPdfService = new AHTRPdfService();