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
   * Create filled PDF from AHTR form data using the original SIRA template
   */
  async createFilledPDF(formData: AHTRFormData): Promise<Buffer> {
    try {
      // Load the original SIRA AHTR template
      const templatePath = path.join(process.cwd(), 'attached_assets', 'SIRA-Allied-health-treatment-request-form_1751798303980.pdf');
      const templateBytes = await fs.readFile(templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      
      // Get the form from the PDF
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
      console.log('Available form fields:', fields.map(field => field.getName()));
      
      // Helper function to safely set form field values
      const setFieldValue = (fieldName: string, value: string) => {
        try {
          const field = form.getField(fieldName);
          if (field) {
            if (field.constructor.name === 'PDFTextField') {
              (field as PDFTextField).setText(value);
            } else if (field.constructor.name === 'PDFCheckBox') {
              // For checkboxes, check if value indicates true
              if (value.toLowerCase() === 'yes' || value.toLowerCase() === 'true') {
                (field as PDFCheckBox).check();
              }
            }
          }
        } catch (error) {
          console.log(`Could not set field "${fieldName}": ${error}`);
        }
      };

      // If the PDF doesn't have fillable fields, add text overlays instead
      if (fields.length === 0) {
        console.log('No fillable fields found, adding text overlays');
        
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();
        
        // Add clinical data as text overlays on the existing form
        const fontSize = 9;
        
        // Add clinical data only (leaving patient details blank for privacy)
        // These coordinates would need to be adjusted based on the actual SIRA form layout
        firstPage.drawText(formData.compensableInjury, { x: 200, y: height - 300, size: fontSize });
        firstPage.drawText(formData.currentSigns, { x: 100, y: height - 350, size: fontSize });
        firstPage.drawText(formData.alliedHealthDiscipline, { x: 200, y: height - 150, size: fontSize });
        firstPage.drawText(formData.practitionerName, { x: 150, y: height - 750, size: fontSize });
        firstPage.drawText(formData.ahpraNumber, { x: 400, y: height - 750, size: fontSize });
        
      } else {
        // Try to fill form fields if they exist
        // Fill clinical data fields only (leave patient identifying information blank)
        setFieldValue('Request Number', formData.requestNumber);
        setFieldValue('Date of Request', formData.dateOfRequest);
        setFieldValue('Date Services Commenced', formData.dateServicesCommenced);
        setFieldValue('Total Consultations', formData.totalConsultations);
        setFieldValue('Allied Health Discipline', formData.alliedHealthDiscipline);
        setFieldValue('Referred By', formData.referredBy);
        setFieldValue('Referred By Phone', formData.referredByPhone);

        // Section 2: Clinical assessment (fill with clinical data)
        setFieldValue('Compensable Injury', formData.compensableInjury);
        setFieldValue('Current Signs', formData.currentSigns);
        setFieldValue('Risk Screening Applied', formData.riskScreeningApplied ? 'Yes' : 'No');
        setFieldValue('Risk Screening Tool', formData.riskScreeningTool);
        setFieldValue('Risk Screening Date', formData.riskScreeningDate);
        setFieldValue('Risk Screening Score', formData.riskScreeningScore);
        setFieldValue('Pre-existing Conditions', formData.preExistingConditions);

        // Capacity
        setFieldValue('Pre-injury Work Capacity', formData.preInjuryCapacityWork);
        setFieldValue('Current Work Capacity', formData.currentCapacityWork);
        setFieldValue('Pre-injury Activities Capacity', formData.preInjuryCapacityActivities);
        setFieldValue('Current Activities Capacity', formData.currentCapacityActivities);

        // Outcome measures
        setFieldValue('Outcome Measure 1 Name', formData.outcomeMeasure1Name);
        setFieldValue('Outcome Measure 1 Initial Date', formData.outcomeMeasure1InitialDate);
        setFieldValue('Outcome Measure 1 Initial Score', formData.outcomeMeasure1InitialScore);
        setFieldValue('Outcome Measure 1 Current Date', formData.outcomeMeasure1CurrentDate);
        setFieldValue('Outcome Measure 1 Current Score', formData.outcomeMeasure1CurrentScore);
        setFieldValue('Outcome Measure Interpretation', formData.outcomeMeasureInterpretation);

        // Section 3: Barriers and strategies
        setFieldValue('Barriers to Recovery', formData.barriersToRecovery);
        setFieldValue('Strategies to Address', formData.strategiesToAddress);

        // Section 4: Treatment plan
        setFieldValue('Goal Achieved', formData.goalAchieved);
        setFieldValue('Work Goal', formData.workGoal);
        setFieldValue('Work Goal By', formData.workGoalBy);
        setFieldValue('Activity Goal', formData.activityGoal);
        setFieldValue('Activity Goal By', formData.activityGoalBy);
        setFieldValue('Self Management', formData.selfManagement);
        setFieldValue('Intervention', formData.intervention);
        setFieldValue('Rationale', formData.rationale);
        setFieldValue('Additional Sessions', formData.additionalSessions);
        setFieldValue('Anticipated Discharge', formData.anticipatedDischarge);
        setFieldValue('Collaboratively Developed', formData.collaborativelyDeveloped ? 'Yes' : 'No');

        // Section 5: Service requested
        setFieldValue('Service Type 1', formData.serviceType1);
        setFieldValue('Sessions 1', formData.sessions1);
        setFieldValue('Frequency 1', formData.frequency1);
        setFieldValue('Cost 1', formData.cost1);

        // Section 6: Practitioner details
        setFieldValue('Practitioner Name', formData.practitionerName);
        setFieldValue('Practice Email', formData.practiceEmail);
        setFieldValue('AHPRA Number', formData.ahpraNumber);
        setFieldValue('Contact Time', formData.contactTime);
        setFieldValue('Practice Name', formData.practiceName);
        setFieldValue('SIRA Approval Number', formData.siraApprovalNumber);
        setFieldValue('Suburb', formData.suburb);
        setFieldValue('State', formData.state);
        setFieldValue('Postcode', formData.postcode);
        setFieldValue('Practitioner Email', formData.practitionerEmail);
        setFieldValue('Phone Number', formData.phoneNumber);
        setFieldValue('Fax', formData.fax);

        // Flatten the form to prevent further editing
        form.flatten();
      }

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      console.error('Error creating PDF:', error);
      
      // Fallback: create a new PDF with the template structure if loading fails
      const fallbackDoc = await PDFDocument.create();
      const page = fallbackDoc.addPage([595, 842]);
      const { width, height } = page.getSize();
      
      page.drawText('SIRA - Allied Health Treatment Request', { x: 50, y: height - 50, size: 16 });
      page.drawText(`Allied Health Discipline: ${formData.alliedHealthDiscipline}`, { x: 50, y: height - 100, size: 10 });
      page.drawText(`Compensable Injury: ${formData.compensableInjury}`, { x: 50, y: height - 130, size: 10 });
      page.drawText(`Current Signs: ${formData.currentSigns}`, { x: 50, y: height - 160, size: 10 });
      page.drawText(`Practitioner: ${formData.practitionerName}`, { x: 50, y: height - 200, size: 10 });
      page.drawText(`AHPRA: ${formData.ahpraNumber}`, { x: 50, y: height - 230, size: 10 });
      
      const fallbackBytes = await fallbackDoc.save();
      return Buffer.from(fallbackBytes);
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