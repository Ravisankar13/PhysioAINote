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
        processingQueue: Promise.resolve()
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

      // Parse into SOAP sections if enough content
      let soapSections = null;
      if (session.fullTranscript.length > 100) {
        soapSections = await this.parseIntoSOAP(session.fullTranscript);
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

  private async parseIntoSOAP(transcript: string): Promise<any> {
    try {
      const prompt = `Parse this medical consultation transcript into SOAP format. 
      Identify which parts belong to Subjective, Objective, Assessment, and Plan.
      
      Transcript: ${transcript}
      
      Return as JSON with keys: subjective, objective, assessment, plan`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a medical documentation assistant. Parse transcripts into SOAP format.'
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

  // Force process remaining buffer
  async flushSession(sessionId: string): Promise<{ fullTranscript: string; soapSections: any }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { fullTranscript: '', soapSections: null };
    }

    // Process any remaining audio
    const result = await this.transcribeBuffer(session);
    
    // Parse final SOAP
    const finalSoap = await this.parseIntoSOAP(session.fullTranscript);

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

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.lastChunkTime.getTime() > maxAge) {
        this.sessions.delete(sessionId);
        console.log(`Cleaned up stale session: ${sessionId}`);
      }
    }
  }
}

// Global variable declaration
let forceProcess = false;

export const streamingTranscriptionService = new StreamingTranscriptionService();

// Cleanup old sessions every hour
setInterval(() => {
  streamingTranscriptionService.cleanupSessions();
}, 60 * 60 * 1000);