import { WebSocket } from 'ws';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import os from 'os';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface StreamingSession {
  id: string;
  userId: number;
  startTime: Date;
  fullTranscript: string;
  lastChunkTime: Date;
  audioBuffer: Buffer[];
  processingQueue: Promise<void>;
  processedTranscriptLength: number; // Track what's been processed
  currentSOAPSections: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
}

class StreamingTranscriptionService {
  private sessions: Map<string, StreamingSession> = new Map();
  private ws: WebSocket | null = null;

  // Process audio chunk and return transcription
  async processAudioChunk(
    sessionId: string, 
    audioData: Buffer, 
    userId: number
  ): Promise<{ transcript: string; soapSections?: any }> {
    let session = this.sessions.get(sessionId);
    
    if (!session) {
      session = {
        id: sessionId,
        userId,
        startTime: new Date(),
        fullTranscript: '',
        lastChunkTime: new Date(),
        audioBuffer: [],
        processingQueue: Promise.resolve(),
        processedTranscriptLength: 0,
        currentSOAPSections: {
          subjective: '',
          objective: '',
          assessment: '',
          plan: ''
        }
      };
      this.sessions.set(sessionId, session);
    }

    // Add to buffer
    session.audioBuffer.push(audioData);
    session.lastChunkTime = new Date();

    // Process if buffer is large enough (every ~10 seconds of audio)
    const bufferSize = session.audioBuffer.reduce((acc, buf) => acc + buf.length, 0);
    
    // Approximately 16KB per second for standard audio
    if (bufferSize >= 160000 || forceProcess) { 
      return this.transcribeBuffer(session);
    }

    return { transcript: '' };
  }

  private async transcribeBuffer(session: StreamingSession): Promise<{ transcript: string; soapSections?: any }> {
    if (session.audioBuffer.length === 0) {
      return { transcript: '' };
    }

    // Combine audio chunks
    const combinedBuffer = Buffer.concat(session.audioBuffer);
    session.audioBuffer = []; // Clear buffer

    try {
      // Create a temporary file path
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `audio_${session.id}_${Date.now()}.webm`);
      
      // Write buffer to temporary file
      fs.writeFileSync(tempFilePath, combinedBuffer);
      
      // Create a file stream for OpenAI
      const fileStream = fs.createReadStream(tempFilePath);
      
      // Transcribe using Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: fileStream as any,
        model: 'whisper-1',
        language: 'en',
        prompt: session.fullTranscript.slice(-500) // Use last 500 chars as context
      });
      
      // Clean up temp file
      fs.unlinkSync(tempFilePath);

      // Append to full transcript
      const newText = transcription.text;
      session.fullTranscript += ' ' + newText;

      // Parse only new content into SOAP sections
      let soapSections = null;
      if (session.fullTranscript.length > 100) {
        // Only process the unprocessed portion
        const unprocessedText = session.fullTranscript.substring(session.processedTranscriptLength);
        if (unprocessedText.trim().length > 50) { // Only process if meaningful new content
          const newSections = await this.parseIntoSOAP(unprocessedText, session.currentSOAPSections);
          if (newSections) {
            // Merge new content with existing sections
            session.currentSOAPSections = this.mergeSOAPSections(session.currentSOAPSections, newSections);
            session.processedTranscriptLength = session.fullTranscript.length;
            soapSections = session.currentSOAPSections;
          }
        }
      }

      return {
        transcript: newText,
        soapSections
      };
    } catch (error) {
      console.error('Transcription error:', error);
      return { transcript: '' };
    }
  }

  private async parseIntoSOAP(
    transcript: string, 
    existingSections?: { subjective: string; objective: string; assessment: string; plan: string }
  ): Promise<any> {
    try {
      const prompt = `You are parsing a NEW PORTION of an ongoing medical consultation transcript.
      This is NOT the complete transcript - just a recent segment.
      
      ${existingSections ? `Current SOAP sections already contain:
      - Subjective: ${existingSections.subjective.length > 100 ? existingSections.subjective.substring(0, 100) + '...' : existingSections.subjective}
      - Objective: ${existingSections.objective.length > 100 ? existingSections.objective.substring(0, 100) + '...' : existingSections.objective}
      - Assessment: ${existingSections.assessment.length > 100 ? existingSections.assessment.substring(0, 100) + '...' : existingSections.assessment}
      - Plan: ${existingSections.plan.length > 100 ? existingSections.plan.substring(0, 100) + '...' : existingSections.plan}
      ` : ''}
      
      New transcript segment to parse:
      "${transcript}"
      
      IMPORTANT: Only extract NEW information from this segment that should be ADDED to the appropriate sections.
      Do not repeat information already present in existing sections.
      If the new segment doesn't contain relevant information for a section, return empty string for that section.
      
      Return as JSON with keys: subjective, objective, assessment, plan
      Each value should contain ONLY the new content to be appended, not the complete section.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a medical documentation assistant. Extract ONLY new information from transcript segments to append to existing SOAP sections. Never duplicate existing content.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('SOAP parsing error:', error);
      return null;
    }
  }

  private mergeSOAPSections(
    existing: { subjective: string; objective: string; assessment: string; plan: string },
    newContent: { subjective: string; objective: string; assessment: string; plan: string }
  ): { subjective: string; objective: string; assessment: string; plan: string } {
    return {
      subjective: this.mergeSection(existing.subjective, newContent.subjective),
      objective: this.mergeSection(existing.objective, newContent.objective),
      assessment: this.mergeSection(existing.assessment, newContent.assessment),
      plan: this.mergeSection(existing.plan, newContent.plan)
    };
  }

  private mergeSection(existing: string, newContent: string): string {
    if (!newContent || newContent.trim() === '') {
      return existing;
    }
    
    if (!existing || existing.trim() === '') {
      return newContent;
    }

    // Add a separator if both have content
    return existing.trim() + '\n' + newContent.trim();
  }

  // Force process remaining buffer
  async flushSession(sessionId: string): Promise<{ fullTranscript: string; soapSections: any }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { fullTranscript: '', soapSections: null };
    }

    // Process any remaining audio
    const result = await this.transcribeBuffer(session);
    
    // Parse any remaining unprocessed transcript
    const unprocessedText = session.fullTranscript.substring(session.processedTranscriptLength);
    if (unprocessedText.trim().length > 0) {
      const finalNewSections = await this.parseIntoSOAP(unprocessedText, session.currentSOAPSections);
      if (finalNewSections) {
        session.currentSOAPSections = this.mergeSOAPSections(session.currentSOAPSections, finalNewSections);
      }
    }

    const finalSoap = session.currentSOAPSections;

    // Clean up session
    this.sessions.delete(sessionId);

    return {
      fullTranscript: session.fullTranscript,
      soapSections: finalSoap
    };
  }

  // Get current session transcript
  getSessionTranscript(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    return session ? session.fullTranscript : '';
  }

  // Clean up old sessions (call periodically)
  cleanupSessions() {
    const now = new Date();
    const maxAge = 2 * 60 * 60 * 1000; // 2 hours

    Array.from(this.sessions.entries()).forEach(([sessionId, session]) => {
      if (now.getTime() - session.lastChunkTime.getTime() > maxAge) {
        this.sessions.delete(sessionId);
        console.log(`Cleaned up stale session: ${sessionId}`);
      }
    });
  }
}

// Global variable declaration
let forceProcess = false;

export const streamingTranscriptionService = new StreamingTranscriptionService();

// Cleanup old sessions every hour
setInterval(() => {
  streamingTranscriptionService.cleanupSessions();
}, 60 * 60 * 1000);