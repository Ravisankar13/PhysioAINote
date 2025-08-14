import { Document, Packer, Paragraph, HeadingLevel, AlignmentType } from 'docx';
import { PDFDocument, PDFForm, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import { storage } from '../storage';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface DocumentGenerationRequest {
  type: 'doctor_report' | 'ahtr' | 'discharge_summary' | 'imaging_referral' | 'insurance' | 'progress_report' | 'specialist_referral' | 'return_to_work' | 'time_off_work';
  soapData: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  patientInfo?: {
    name?: string;
    age?: number;
    condition?: string;
  };
  sessionId: string;
  userId?: number;
  documentId?: string;  // Optional document ID to use instead of generating one
}

interface GeneratedDocument {
  id: string;
  type: string;
  filename: string;
  wordPath?: string;
  pdfPath?: string;
  generatedAt: Date;
  status: 'generating' | 'ready' | 'error';
  error?: string;
}

// Document trigger phrases mapping
const DOCUMENT_TRIGGERS = {
  'doctor_report': [
    'generate doctor report',
    'create doctor report',
    'doctor report please',
    'need a doctor report',
    'prepare doctor report'
  ],
  'ahtr': [
    'generate ahtr',
    'create ahtr',
    'ahtr form',
    'need ahtr',
    'prepare ahtr',
    'allied health treatment request'
  ],
  'discharge_summary': [
    'discharge summary',
    'create discharge',
    'discharge report',
    'patient discharge'
  ],
  'imaging_referral': [
    'imaging referral',
    'x-ray referral',
    'mri referral',
    'ct scan referral',
    'ultrasound referral'
  ],
  'insurance': [
    'insurance documentation',
    'insurance form',
    'insurance report',
    'insurance claim'
  ],
  'progress_report': [
    'progress report',
    'progress note',
    'treatment progress'
  ],
  'specialist_referral': [
    'specialist referral',
    'refer to specialist',
    'specialist letter'
  ],
  'return_to_work': [
    'return to work',
    'work clearance',
    'fit for work',
    'back to work'
  ],
  'time_off_work': [
    'time off work',
    'medical certificate',
    'sick leave',
    'work absence'
  ]
};

export class RealtimeDocumentService {
  private documentQueue: Map<string, GeneratedDocument[]> = new Map();
  private activeGenerations: Set<string> = new Set();

  constructor() {
    // Ensure temp directories exist
    this.ensureTempDirectories();
  }

  private async ensureTempDirectories() {
    const dirs = ['temp/documents/word', 'temp/documents/pdf'];
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.error(`Error creating directory ${dir}:`, error);
      }
    }
  }

  // Detect document generation triggers in transcription
  public detectDocumentTriggers(transcript: string): string[] {
    const lowercaseTranscript = transcript.toLowerCase();
    const detectedTypes: string[] = [];

    for (const [docType, triggers] of Object.entries(DOCUMENT_TRIGGERS)) {
      for (const trigger of triggers) {
        if (lowercaseTranscript.includes(trigger)) {
          if (!detectedTypes.includes(docType)) {
            detectedTypes.push(docType);
          }
        }
      }
    }

    return detectedTypes;
  }

  // Generate document based on type
  public async generateDocument(request: DocumentGenerationRequest): Promise<GeneratedDocument> {
    const documentId = request.documentId || randomUUID();
    
    // Create initial document record in database
    const dbDocument = await storage.createGeneratedDocument({
      id: documentId,
      userId: request.userId || 1, // Default to 1 if not provided
      sessionId: request.sessionId,
      type: request.type,
      filename: `${request.type}_${Date.now()}`,
      status: 'generating',
      wordPath: null,
      pdfPath: null,
      error: null,
      metadata: null
    });
    
    console.log(`Document ${documentId} created in database for session ${request.sessionId}`);

    // Prevent duplicate generations
    const generationKey = `${request.sessionId}_${request.type}`;
    if (this.activeGenerations.has(generationKey)) {
      await storage.updateGeneratedDocument(documentId, {
        status: 'error',
        error: 'Already generating this document type'
      });
      return {
        ...dbDocument,
        status: 'error',
        error: 'Already generating this document type'
      };
    }

    this.activeGenerations.add(generationKey);

    try {
      // Generate content using OpenAI
      const content = await this.generateDocumentContent(request);
      
      let documentPath: string;
      let pathField: 'wordPath' | 'pdfPath';
      
      // Handle AHTR as PDF form filling, others as Word documents
      if (request.type === 'ahtr') {
        documentPath = await this.fillAHTRPdfForm(content, documentId);
        pathField = 'pdfPath';
      } else {
        documentPath = await this.createWordDocument(request.type, content, documentId);
        pathField = 'wordPath';
      }
      
      // Update document in database
      const updatedDocument = await storage.updateGeneratedDocument(documentId, {
        status: 'ready',
        [pathField]: documentPath
      });
      
      console.log(`Document ${documentId} updated in database with status: ready, path: ${documentPath}`);
      
      return {
        id: documentId,
        type: request.type,
        filename: dbDocument.filename,
        [pathField]: documentPath,
        status: 'ready',
        generatedAt: dbDocument.generatedAt
      };
    } catch (error) {
      console.error('Document generation error:', error);
      await storage.updateGeneratedDocument(documentId, {
        status: 'error',
        error: error.message
      });
      return {
        id: documentId,
        type: request.type,
        filename: dbDocument.filename,
        status: 'error',
        error: error.message,
        generatedAt: dbDocument.generatedAt
      };
    } finally {
      this.activeGenerations.delete(generationKey);
    }
  }

  // Generate document content using OpenAI
  private async generateDocumentContent(request: DocumentGenerationRequest): Promise<any> {
    // Check if SOAP data has actual content or just placeholders
    const hasValidSoapData = 
      request.soapData.subjective && 
      request.soapData.subjective.length > 20 &&
      !request.soapData.subjective.includes('to be documented');
    
    // If SOAP data is empty or contains placeholders, generate from transcript
    const transcript = (request as any).transcript;
    const shouldUseTranscript = !hasValidSoapData && transcript && transcript.length > 50;
    
    const prompts = {
      'doctor_report': shouldUseTranscript 
        ? `Generate a comprehensive doctor's report based on the following patient consultation transcript. Extract relevant clinical information, identify the chief complaint, assessment, and create a treatment plan. Format as a professional medical report.

Patient Consultation Transcript:
${transcript}

Generate a structured report with sections for: Patient Presentation, Clinical Findings, Assessment/Diagnosis, Treatment Plan, and Recommendations. Be specific based on the information provided in the transcript.`
        : `Generate a comprehensive doctor's report based on the following SOAP note. Include all relevant clinical findings, diagnosis, treatment plan, and recommendations. Format as a professional medical report.

SOAP Note:
Subjective: ${request.soapData.subjective}
Objective: ${request.soapData.objective}
Assessment: ${request.soapData.assessment}
Plan: ${request.soapData.plan}

Generate a structured report with sections for: Patient Presentation, Clinical Examination, Diagnosis, Treatment Plan, Prognosis, and Recommendations.`,

      'ahtr': shouldUseTranscript 
        ? `Generate a comprehensive Allied Health Treatment Request based on the following patient consultation transcript. Extract clinical information, identify treatment goals, barriers to recovery, and create an intervention plan.

Patient Consultation Transcript:
${transcript}

Generate the following sections with specific details from the transcript:
1. Compensable injury/illness
2. Current clinical signs and symptoms
3. Pre-injury capacity vs Current capacity
4. Barriers to recovery
5. Treatment goals (SMART format)
6. Intervention plan
7. Number of sessions needed`
        : `Generate a comprehensive Allied Health Treatment Request based on the following SOAP note.

SOAP Note:
Subjective: ${request.soapData.subjective}
Objective: ${request.soapData.objective}
Assessment: ${request.soapData.assessment}
Plan: ${request.soapData.plan}

Generate the following sections:
1. Compensable injury/illness
2. Current clinical signs and symptoms
3. Pre-injury capacity vs Current capacity
4. Barriers to recovery
5. Treatment goals (SMART format)
6. Intervention plan
7. Number of sessions needed`,

      'discharge_summary': `Generate a comprehensive discharge summary including: Admission reason, Clinical course, Treatments provided, Current status, Discharge instructions, Follow-up recommendations.

Clinical Data:
${JSON.stringify(request.soapData, null, 2)}`,

      'imaging_referral': `Generate an imaging referral letter including: Clinical history, Current symptoms, Physical examination findings, Suspected diagnosis, Specific imaging requested, Clinical justification.

Clinical Data:
${JSON.stringify(request.soapData, null, 2)}`,

      'insurance': `Generate insurance documentation including: Patient information, Diagnosis, Treatment provided, Medical necessity justification, Prognosis, Recommended ongoing care.

Clinical Data:
${JSON.stringify(request.soapData, null, 2)}`,

      'progress_report': `Generate a treatment progress report including: Initial presentation, Treatment provided to date, Current status, Progress achieved, Ongoing concerns, Updated treatment plan.

Clinical Data:
${JSON.stringify(request.soapData, null, 2)}`,

      'specialist_referral': `Generate a specialist referral letter including: Reason for referral, Clinical history, Examination findings, Investigations performed, Current management, Specific questions for specialist.

Clinical Data:
${JSON.stringify(request.soapData, null, 2)}`,

      'return_to_work': `Generate a return to work certificate including: Patient capacity, Work restrictions if any, Graduated return plan, Review date.

Clinical Data:
${JSON.stringify(request.soapData, null, 2)}`,

      'time_off_work': `Generate a medical certificate for time off work including: Diagnosis, Period of absence required, Expected return date, Any restrictions on return.

Clinical Data:
${JSON.stringify(request.soapData, null, 2)}`
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a medical documentation specialist. Generate professional, accurate medical documents based on clinical information provided. Use appropriate medical terminology and ensure all documents are comprehensive and suitable for their intended purpose."
        },
        {
          role: "user",
          content: prompts[request.type] || prompts['doctor_report']
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const generatedText = response.choices[0].message.content || '';
    
    // Parse the generated text into structured sections
    const sections = this.parseDocumentSections(generatedText);
    return sections;
  }

  // Parse generated text into document sections
  private parseDocumentSections(text: string): any {
    const sections: any = {};
    const lines = text.split('\n');
    let currentSection = 'content';
    let currentContent: string[] = [];

    for (const line of lines) {
      // Check if line is a section header (ends with : or is in uppercase)
      if (line.endsWith(':') || (line.length > 0 && line === line.toUpperCase())) {
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = line.replace(':', '').toLowerCase().replace(/\s+/g, '_');
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    // Add the last section
    if (currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    // If no sections were parsed, treat entire text as content
    if (Object.keys(sections).length === 0) {
      sections.content = text;
    }

    return sections;
  }

  // Fill AHTR PDF form with generated content
  private async fillAHTRPdfForm(content: any, documentId: string): Promise<string> {
    try {
      // Load the template PDF
      const templatePath = path.join(process.cwd(), 'server', 'templates', 'ahtr-template.pdf');
      const existingPdfBytes = await fs.readFile(templatePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      
      // Parse AI-generated content to extract structured data
      const ahtrData = typeof content === 'string' ? this.parseAHTRContent(content) : content;
      
      // Get the first page
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      
      // Embed font
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 10;
      
      // Add content to specific positions on the PDF
      // Request number and date
      firstPage.drawText(documentId.substring(0, 8), {
        x: 150,
        y: height - 95,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      
      firstPage.drawText(new Date().toLocaleDateString('en-AU'), {
        x: 450,
        y: height - 95,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      
      // Compensable injury/illness
      if (ahtrData.injury) {
        const injuryText = this.wrapText(ahtrData.injury, 80);
        let yPos = height - 220;
        injuryText.forEach(line => {
          firstPage.drawText(line, {
            x: 50,
            y: yPos,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          yPos -= 12;
        });
      }
      
      // Current clinical signs and symptoms
      if (ahtrData.symptoms) {
        const symptomsText = this.wrapText(ahtrData.symptoms, 80);
        let yPos = height - 280;
        symptomsText.forEach(line => {
          firstPage.drawText(line, {
            x: 50,
            y: yPos,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          yPos -= 12;
        });
      }
      
      // Save the filled PDF
      const pdfBytes = await pdfDoc.save();
      
      // Create documents directory if it doesn't exist
      const documentsDir = path.join(process.cwd(), 'documents');
      await fs.mkdir(documentsDir, { recursive: true });
      
      // Save the PDF file
      const filename = `ahtr_${documentId}.pdf`;
      const filePath = path.join(documentsDir, filename);
      await fs.writeFile(filePath, pdfBytes);
      
      console.log(`AHTR PDF created: ${filePath}`);
      return filePath;
      
    } catch (error) {
      console.error('Error filling AHTR PDF form:', error);
      throw error;
    }
  }
  
  // Helper function to wrap text
  private wrapText(text: string, maxCharsPerLine: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + ' ' + word).length > maxCharsPerLine) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines;
  }
  
  // Parse AHTR content from AI response
  private parseAHTRContent(content: string): any {
    const ahtrData: any = {
      injury: '',
      symptoms: '',
      barriers: '',
      goals: { work: {}, activity: {} },
      intervention: '',
      sessions: ''
    };
    
    // Extract sections using regex patterns
    const injuryMatch = content.match(/(?:compensable injury|injury\/illness)[:\s]*([^]*?)(?:\n\d+\.|Current clinical|$)/i);
    if (injuryMatch) ahtrData.injury = injuryMatch[1].trim();
    
    const symptomsMatch = content.match(/(?:clinical signs|symptoms)[:\s]*([^]*?)(?:\n\d+\.|Pre-injury|$)/i);
    if (symptomsMatch) ahtrData.symptoms = symptomsMatch[1].trim();
    
    const barriersMatch = content.match(/(?:barriers to recovery)[:\s]*([^]*?)(?:\n\d+\.|Treatment goals|$)/i);
    if (barriersMatch) ahtrData.barriers = barriersMatch[1].trim();
    
    return ahtrData;
  }

  // Create Word document
  private async createWordDocument(docType: string, content: any, documentId: string): Promise<string> {
    const doc = new Document({
      sections: [{
        properties: {},
        children: this.buildDocumentContent(docType, content)
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `${docType}_${documentId}.docx`;
    const filepath = path.join('temp/documents/word', filename);
    
    await fs.writeFile(filepath, buffer);
    
    return filepath;
  }

  // Build document content for Word
  private buildDocumentContent(docType: string, content: any): any[] {
    const children: any[] = [];
    
    // Add title
    const titles = {
      'doctor_report': "MEDICAL REPORT",
      'ahtr': "ALLIED HEALTH TREATMENT REQUEST",
      'discharge_summary': "DISCHARGE SUMMARY",
      'imaging_referral': "IMAGING REFERRAL",
      'insurance': "INSURANCE DOCUMENTATION",
      'progress_report': "PROGRESS REPORT",
      'specialist_referral': "SPECIALIST REFERRAL",
      'return_to_work': "RETURN TO WORK CERTIFICATE",
      'time_off_work': "MEDICAL CERTIFICATE"
    };

    children.push(
      new Paragraph({
        text: titles[docType] || "MEDICAL DOCUMENT",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // Add date
    children.push(
      new Paragraph({
        text: `Date: ${new Date().toLocaleDateString()}`,
        spacing: { after: 200 }
      })
    );

    // Add content sections
    for (const [section, text] of Object.entries(content)) {
      if (typeof text === 'string' && text.trim()) {
        // Section heading
        const sectionTitle = section.replace(/_/g, ' ').toUpperCase();
        if (section !== 'content') {
          children.push(
            new Paragraph({
              text: sectionTitle,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 }
            })
          );
        }

        // Section content - split by paragraphs
        const paragraphs = text.split('\n\n');
        for (const para of paragraphs) {
          if (para.trim()) {
            children.push(
              new Paragraph({
                text: para.trim(),
                spacing: { after: 100 }
              })
            );
          }
        }
      }
    }

    // Add signature section
    children.push(
      new Paragraph({
        text: "",
        spacing: { before: 600 }
      }),
      new Paragraph({
        text: "_____________________________",
        spacing: { after: 50 }
      }),
      new Paragraph({
        text: "Practitioner Signature",
        spacing: { after: 100 }
      }),
      new Paragraph({
        text: "_____________________________",
        spacing: { after: 50 }
      }),
      new Paragraph({
        text: "Date",
        spacing: { after: 100 }
      })
    );

    return children;
  }

  // Get documents for a session
  public getSessionDocuments(sessionId: string): GeneratedDocument[] {
    const documents = this.documentQueue.get(sessionId) || [];
    console.log(`Getting documents for session ${sessionId}: found ${documents.length} documents`);
    if (documents.length > 0) {
      console.log(`Document IDs:`, documents.map(d => d.id));
    }
    return documents;
  }

  // Clear session documents
  public clearSessionDocuments(sessionId: string): void {
    this.documentQueue.delete(sessionId);
  }

  // Clean up old documents
  public async cleanupOldDocuments(): Promise<void> {
    try {
      const wordDir = 'temp/documents/word';
      const pdfDir = 'temp/documents/pdf';
      
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      // Clean Word documents
      const wordFiles = await fs.readdir(wordDir);
      for (const file of wordFiles) {
        const filepath = path.join(wordDir, file);
        const stats = await fs.stat(filepath);
        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filepath);
        }
      }

      // Clean PDF documents
      const pdfFiles = await fs.readdir(pdfDir);
      for (const file of pdfFiles) {
        const filepath = path.join(pdfDir, file);
        const stats = await fs.stat(filepath);
        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filepath);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old documents:', error);
    }
  }
}

// Export singleton instance
export const realtimeDocumentService = new RealtimeDocumentService();