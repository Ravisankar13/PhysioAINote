import jsPDF from 'jspdf';

interface PDFContent {
  title: string;
  content: string;
  type?: 'exercise' | 'soap' | 'assessment' | 'general';
  patientName?: string;
  date?: string;
  therapistName?: string;
  clinicName?: string;
  additionalInfo?: Record<string, any>;
}

export class PDFGenerator {
  private doc: jsPDF;
  private pageHeight: number;
  private pageWidth: number;
  private margin: number;
  private currentY: number;
  private lineHeight: number;

  constructor() {
    this.doc = new jsPDF();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.margin = 20;
    this.currentY = this.margin;
    this.lineHeight = 7;
  }

  private addHeader(content: PDFContent) {
    // Clinic/Brand Header
    this.doc.setFontSize(18);
    this.doc.setTextColor(0, 128, 128); // Teal color
    this.doc.text(content.clinicName || 'PhysioGPT Clinical Report', this.margin, this.currentY);
    this.currentY += 10;

    // Date and Type
    this.doc.setFontSize(10);
    this.doc.setTextColor(100, 100, 100);
    const date = content.date || new Date().toLocaleDateString();
    this.doc.text(`Date: ${date}`, this.margin, this.currentY);
    
    const typeLabel = this.getTypeLabel(content.type);
    this.doc.text(typeLabel, this.pageWidth - this.margin - 40, this.currentY);
    this.currentY += 8;

    // Separator line
    this.doc.setDrawColor(0, 128, 128);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 10;

    // Patient Information
    if (content.patientName) {
      this.doc.setFontSize(12);
      this.doc.setTextColor(0, 0, 0);
      this.doc.text(`Patient: ${content.patientName}`, this.margin, this.currentY);
      this.currentY += 8;
    }

    // Title
    this.doc.setFontSize(14);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(content.title, this.margin, this.currentY);
    this.currentY += 12;
  }

  private getTypeLabel(type?: string): string {
    switch (type) {
      case 'exercise': return 'Exercise Program';
      case 'soap': return 'SOAP Note';
      case 'assessment': return 'Clinical Assessment';
      default: return 'Clinical Documentation';
    }
  }

  private parseAndFormatContent(content: string) {
    // Split content into sections and format accordingly
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Check if we need a new page
      if (this.currentY > this.pageHeight - this.margin - 20) {
        this.addPageNumber();
        this.doc.addPage();
        this.currentY = this.margin;
      }

      // Handle different formatting
      if (line.startsWith('**') && line.endsWith('**')) {
        // Bold headers
        this.doc.setFontSize(12);
        this.doc.setFont(undefined, 'bold');
        const headerText = line.replace(/\*\*/g, '');
        this.addWrappedText(headerText, true);
        this.doc.setFont(undefined, 'normal');
      } else if (line.startsWith('## ')) {
        // Section headers
        this.doc.setFontSize(13);
        this.doc.setTextColor(0, 100, 100);
        this.addWrappedText(line.replace('## ', ''), true);
        this.doc.setTextColor(0, 0, 0);
      } else if (line.startsWith('### ')) {
        // Subsection headers
        this.doc.setFontSize(11);
        this.doc.setFont(undefined, 'bold');
        this.addWrappedText(line.replace('### ', ''), true);
        this.doc.setFont(undefined, 'normal');
      } else if (line.trim().startsWith('- ') || line.trim().match(/^\d+\./)) {
        // Bullet points or numbered lists
        this.doc.setFontSize(10);
        const indent = this.margin + 5;
        const bulletText = line.trim();
        this.addWrappedText(bulletText, false, indent);
      } else if (line.includes(':') && line.indexOf(':') < 50) {
        // Key-value pairs (like "Sets: 3 x 10")
        this.doc.setFontSize(10);
        const parts = line.split(':');
        if (parts.length === 2) {
          this.doc.setFont(undefined, 'bold');
          this.doc.text(parts[0] + ':', this.margin, this.currentY);
          const keyWidth = this.doc.getTextWidth(parts[0] + ':');
          this.doc.setFont(undefined, 'normal');
          this.doc.text(parts[1].trim(), this.margin + keyWidth + 2, this.currentY);
          this.currentY += this.lineHeight;
        } else {
          this.addWrappedText(line, false);
        }
      } else if (line.trim()) {
        // Regular text
        this.doc.setFontSize(10);
        this.addWrappedText(line, false);
      } else {
        // Empty line for spacing
        this.currentY += 4;
      }
    }
  }

  private addWrappedText(text: string, isHeader: boolean = false, indent: number = this.margin) {
    const maxWidth = this.pageWidth - indent - this.margin;
    const lines = this.doc.splitTextToSize(text, maxWidth);
    
    for (const line of lines) {
      if (this.currentY > this.pageHeight - this.margin - 10) {
        this.addPageNumber();
        this.doc.addPage();
        this.currentY = this.margin;
      }
      this.doc.text(line, indent, this.currentY);
      this.currentY += this.lineHeight;
    }
    
    if (isHeader) {
      this.currentY += 3; // Extra spacing after headers
    }
  }

  private formatExerciseProgram(content: string) {
    // Special formatting for exercise programs
    const phases = content.split(/Phase \d+/i);
    
    phases.forEach((phase, index) => {
      if (!phase.trim()) return;
      
      if (index > 0) {
        // Add phase header
        this.doc.setFontSize(12);
        this.doc.setFont(undefined, 'bold');
        this.doc.setTextColor(0, 100, 100);
        this.addWrappedText(`Phase ${index}`, true);
        this.doc.setFont(undefined, 'normal');
        this.doc.setTextColor(0, 0, 0);
      }
      
      // Parse exercises
      const exercises = phase.split(/\d+\.\s+/);
      exercises.forEach((exercise) => {
        if (!exercise.trim()) return;
        
        const lines = exercise.split('\n');
        const exerciseName = lines[0];
        
        if (exerciseName) {
          // Exercise name
          this.doc.setFontSize(11);
          this.doc.setFont(undefined, 'bold');
          this.addWrappedText(exerciseName, false, this.margin + 5);
          this.doc.setFont(undefined, 'normal');
          
          // Exercise details
          lines.slice(1).forEach(line => {
            if (line.trim()) {
              this.doc.setFontSize(9);
              this.addWrappedText(line.trim(), false, this.margin + 10);
            }
          });
          
          this.currentY += 3; // Space between exercises
        }
      });
      
      this.currentY += 5; // Space between phases
    });
  }

  private addFooter() {
    const footerY = this.pageHeight - 15;
    
    // Separator line
    this.doc.setDrawColor(200, 200, 200);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.margin, footerY - 5, this.pageWidth - this.margin, footerY - 5);
    
    // Disclaimer
    this.doc.setFontSize(8);
    this.doc.setTextColor(100, 100, 100);
    const disclaimer = 'This document is for clinical use only. Please consult with your healthcare provider.';
    this.doc.text(disclaimer, this.margin, footerY);
    
    // Generated by
    this.doc.setFontSize(8);
    const generatedText = 'Generated by PhysioGPT';
    const textWidth = this.doc.getTextWidth(generatedText);
    this.doc.text(generatedText, this.pageWidth - this.margin - textWidth, footerY);
  }

  private addPageNumber() {
    const pageNumber = this.doc.getCurrentPageInfo().pageNumber;
    this.doc.setFontSize(8);
    this.doc.setTextColor(150, 150, 150);
    this.doc.text(`Page ${pageNumber}`, this.pageWidth / 2 - 10, this.pageHeight - 10);
  }

  public generatePDF(content: PDFContent): jsPDF {
    this.doc = new jsPDF();
    this.currentY = this.margin;
    
    // Add header
    this.addHeader(content);
    
    // Format content based on type
    if (content.type === 'exercise') {
      this.formatExerciseProgram(content.content);
    } else {
      this.parseAndFormatContent(content.content);
    }
    
    // Add clinical notes if present
    if (content.additionalInfo?.clinicalNotes) {
      this.currentY += 10;
      this.doc.setFontSize(11);
      this.doc.setFont(undefined, 'bold');
      this.addWrappedText('Clinical Notes:', true);
      this.doc.setFont(undefined, 'normal');
      this.doc.setFontSize(10);
      this.addWrappedText(content.additionalInfo.clinicalNotes);
    }
    
    // Add therapist signature if provided
    if (content.therapistName) {
      this.currentY += 15;
      this.doc.setFontSize(10);
      this.doc.text('Prescribed by:', this.margin, this.currentY);
      this.currentY += this.lineHeight;
      this.doc.setFont(undefined, 'bold');
      this.doc.text(content.therapistName, this.margin, this.currentY);
      this.doc.setFont(undefined, 'normal');
    }
    
    // Add footer to all pages
    const totalPages = this.doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      this.addFooter();
      this.addPageNumber();
    }
    
    return this.doc;
  }

  public downloadPDF(content: PDFContent) {
    const pdf = this.generatePDF(content);
    const filename = this.generateFilename(content);
    pdf.save(filename);
  }

  private generateFilename(content: PDFContent): string {
    const date = new Date().toISOString().split('T')[0];
    const type = content.type || 'document';
    const patient = content.patientName ? `_${content.patientName.replace(/\s+/g, '_')}` : '';
    return `physioGPT_${type}${patient}_${date}.pdf`;
  }
}

export const pdfGenerator = new PDFGenerator();