import { Document, Packer, Paragraph, HeadingLevel, AlignmentType } from 'docx';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';

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
    const documentId = randomUUID();
    const document: GeneratedDocument = {
      id: documentId,
      type: request.type,
      filename: `${request.type}_${Date.now()}`,
      generatedAt: new Date(),
      status: 'generating'
    };

    // Add to queue
    if (!this.documentQueue.has(request.sessionId)) {
      this.documentQueue.set(request.sessionId, []);
    }
    this.documentQueue.get(request.sessionId)!.push(document);

    // Prevent duplicate generations
    const generationKey = `${request.sessionId}_${request.type}`;
    if (this.activeGenerations.has(generationKey)) {
      document.status = 'error';
      document.error = 'Already generating this document type';
      return document;
    }

    this.activeGenerations.add(generationKey);

    try {
      // Generate content using OpenAI
      const content = await this.generateDocumentContent(request);
      
      // Create Word document
      const wordPath = await this.createWordDocument(request.type, content, documentId);
      document.wordPath = wordPath;
      
      // Update status
      document.status = 'ready';
    } catch (error) {
      console.error('Document generation error:', error);
      document.status = 'error';
      document.error = error.message;
    } finally {
      this.activeGenerations.delete(generationKey);
    }

    return document;
  }

  // Generate document content using OpenAI
  private async generateDocumentContent(request: DocumentGenerationRequest): Promise<any> {
    const prompts = {
      'doctor_report': `Generate a comprehensive doctor's report based on the following SOAP note. Include all relevant clinical findings, diagnosis, treatment plan, and recommendations. Format as a professional medical report.

SOAP Note:
Subjective: ${request.soapData.subjective}
Objective: ${request.soapData.objective}
Assessment: ${request.soapData.assessment}
Plan: ${request.soapData.plan}

Generate a structured report with sections for: Patient Presentation, Clinical Examination, Diagnosis, Treatment Plan, Prognosis, and Recommendations.`,

      'ahtr': `Generate an Allied Health Treatment Request (AHTR) form based on the following clinical information. Include all necessary sections for insurance/funding approval.

Clinical Information:
${JSON.stringify(request.soapData, null, 2)}

Include: Patient details, Diagnosis codes, Clinical justification, Treatment goals, Proposed treatment plan, Expected outcomes, and Duration of treatment.`,

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
    return this.documentQueue.get(sessionId) || [];
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