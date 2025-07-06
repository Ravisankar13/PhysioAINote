import OpenAI from "openai";
import { db } from "./db";
import { aiSuggestions, type InsertAiSuggestion } from "@shared/schema";
import { eq } from "drizzle-orm";
import { WebSocket } from "ws";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY must be set");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface RealTimeContext {
  transcript: string;
  currentSection: string; // 'subjective', 'objective', 'assessment', 'plan'
  patientSymptoms: string[];
  bodyPart?: string;
  sessionDuration: number; // in minutes
}

export interface AISuggestionResponse {
  questions: string[];
  treatments: string[];
  diagnoses: string[];
  tests: string[];
  redFlags: string[];
}

export class RealTimeAIService {
  private static instance: RealTimeAIService;
  private connectedClients: Map<string, { ws: WebSocket; userId: number; sessionId: string }> = new Map();

  static getInstance(): RealTimeAIService {
    if (!RealTimeAIService.instance) {
      RealTimeAIService.instance = new RealTimeAIService();
    }
    return RealTimeAIService.instance;
  }

  /**
   * Add a WebSocket client for real-time suggestions
   */
  addClient(clientId: string, ws: WebSocket, userId: number, sessionId: string) {
    this.connectedClients.set(clientId, { ws, userId, sessionId });
    
    ws.on('close', () => {
      this.connectedClients.delete(clientId);
    });

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connected',
      message: 'Real-time AI assistance connected'
    });
  }

  /**
   * Remove a WebSocket client
   */
  removeClient(clientId: string) {
    this.connectedClients.delete(clientId);
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, data: any) {
    const client = this.connectedClients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Broadcast to all clients in a session
   */
  private broadcastToSession(sessionId: string, data: any) {
    for (const [clientId, client] of this.connectedClients) {
      if (client.sessionId === sessionId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(data));
      }
    }
  }

  /**
   * Generate real-time AI suggestions based on current conversation context
   */
  async generateSuggestions(context: RealTimeContext, userId: number, sessionId: string): Promise<AISuggestionResponse> {
    try {
      const prompt = this.buildSuggestionPrompt(context);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert physiotherapist AI assistant providing real-time suggestions during patient consultations. Provide concise, actionable suggestions in JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const suggestions = JSON.parse(response.choices[0].message.content || '{}');
      
      // Store suggestions in database
      await this.storeSuggestions(suggestions, context, userId, sessionId);
      
      // Broadcast to connected clients
      this.broadcastToSession(sessionId, {
        type: 'suggestions',
        data: suggestions,
        context: context.currentSection
      });

      return suggestions;
    } catch (error) {
      console.error("Error generating AI suggestions:", error);
      return {
        questions: ["Consider asking about pain location and triggers"],
        treatments: ["Consider conservative management approaches"],
        diagnoses: ["Review differential diagnoses based on symptoms"],
        tests: ["Consider relevant assessment tests"],
        redFlags: []
      };
    }
  }

  /**
   * Build the AI prompt based on current context
   */
  private buildSuggestionPrompt(context: RealTimeContext): string {
    const { transcript, currentSection, patientSymptoms, bodyPart, sessionDuration } = context;
    
    let sectionSpecificPrompt = "";
    
    switch (currentSection) {
      case 'subjective':
        sectionSpecificPrompt = `
The clinician is currently gathering subjective information. Suggest:
- Follow-up questions to explore symptoms more deeply
- Questions about pain characteristics, triggers, and relieving factors
- Questions about functional limitations and impact on daily activities
- Questions about medical history and previous treatments
        `;
        break;
        
      case 'objective':
        sectionSpecificPrompt = `
The clinician is conducting objective assessment. Suggest:
- Specific physical tests and assessments based on symptoms
- Observation points for posture and movement
- Palpation techniques for suspected areas
- Range of motion and strength testing protocols
        `;
        break;
        
      case 'assessment':
        sectionSpecificPrompt = `
The clinician is forming their assessment. Suggest:
- Possible differential diagnoses based on findings
- Clinical reasoning patterns to consider
- Red flags to rule out
- Prognosis factors to discuss
        `;
        break;
        
      case 'plan':
        sectionSpecificPrompt = `
The clinician is developing the treatment plan. Suggest:
- Evidence-based treatment approaches
- Exercise prescriptions and modifications
- Patient education topics
- Follow-up recommendations and timelines
        `;
        break;
    }

    return `
Based on the following clinical consultation context, provide real-time suggestions for the physiotherapist:

**Current Section:** ${currentSection}
**Body Part:** ${bodyPart || 'Not specified'}
**Session Duration:** ${sessionDuration} minutes
**Patient Symptoms:** ${patientSymptoms.join(', ') || 'Not specified'}

**Current Transcript:**
${transcript.slice(-1000)} // Last 1000 characters

${sectionSpecificPrompt}

Provide response in JSON format with these fields:
{
  "questions": ["most important question 1", "most important question 2"],
  "treatments": ["key treatment option 1", "key treatment option 2"],
  "diagnoses": ["most likely diagnosis 1", "most likely diagnosis 2"],
  "tests": ["essential assessment 1", "essential assessment 2"],
  "redFlags": ["red flag 1"] // Only if relevant warning signs are present
}

Keep suggestions:
- Specific and actionable
- Evidence-based
- Highly relevant to current context
- Maximum 2 items per category (prioritize quality over quantity)
- Concise (under 50 characters per suggestion)
- Only suggest the MOST important/relevant items
    `;
  }

  /**
   * Store AI suggestions in database
   */
  private async storeSuggestions(suggestions: AISuggestionResponse, context: RealTimeContext, userId: number, sessionId: string) {
    try {
      const suggestionInserts: InsertAiSuggestion[] = [];
      
      // Store questions
      suggestions.questions?.forEach(text => {
        suggestionInserts.push({
          sessionId,
          userId,
          suggestionType: 'question',
          suggestionText: text,
          context: `${context.currentSection} - ${context.transcript.slice(-100)}`,
          confidence: 85,
          relevantBodyPart: context.bodyPart as any
        });
      });

      // Store treatments
      suggestions.treatments?.forEach(text => {
        suggestionInserts.push({
          sessionId,
          userId,
          suggestionType: 'treatment',
          suggestionText: text,
          context: `${context.currentSection} - ${context.transcript.slice(-100)}`,
          confidence: 85,
          relevantBodyPart: context.bodyPart as any
        });
      });

      // Store diagnoses
      suggestions.diagnoses?.forEach(text => {
        suggestionInserts.push({
          sessionId,
          userId,
          suggestionType: 'diagnosis',
          suggestionText: text,
          context: `${context.currentSection} - ${context.transcript.slice(-100)}`,
          confidence: 85,
          relevantBodyPart: context.bodyPart as any
        });
      });

      // Store tests
      suggestions.tests?.forEach(text => {
        suggestionInserts.push({
          sessionId,
          userId,
          suggestionType: 'test',
          suggestionText: text,
          context: `${context.currentSection} - ${context.transcript.slice(-100)}`,
          confidence: 85,
          relevantBodyPart: context.bodyPart as any
        });
      });

      if (suggestionInserts.length > 0) {
        await db.insert(aiSuggestions).values(suggestionInserts);
      }
    } catch (error) {
      console.error("Error storing AI suggestions:", error);
    }
  }

  /**
   * Handle PhysioGPT chat questions within SOAP interface
   */
  async handlePhysioGPTQuery(query: string, context: RealTimeContext, userId: number, sessionId: string): Promise<string> {
    try {
      const contextualPrompt = `
You are PhysioGPT, an expert physiotherapy AI assistant. The user is currently in a clinical consultation and has asked you a question.

**Current Clinical Context:**
- Session Section: ${context.currentSection}
- Body Part: ${context.bodyPart || 'Not specified'}
- Patient Symptoms: ${context.patientSymptoms.join(', ') || 'Not specified'}
- Current Transcript Context: ${context.transcript.slice(-500)}

**User Question:** ${query}

Provide a concise, evidence-based response that helps with the current clinical situation. Keep the response under 200 words and focus on actionable clinical advice.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are PhysioGPT, an expert physiotherapy AI assistant providing real-time clinical support during patient consultations."
          },
          {
            role: "user",
            content: contextualPrompt
          }
        ],
        temperature: 0.3,
      });

      const answer = response.choices[0].message.content || "I apologize, but I'm unable to provide a response at this time. Please try rephrasing your question.";
      
      // Broadcast the Q&A to connected clients
      this.broadcastToSession(sessionId, {
        type: 'physioGPT_response',
        data: {
          question: query,
          answer: answer,
          timestamp: new Date().toISOString()
        }
      });

      return answer;
    } catch (error) {
      console.error("Error handling PhysioGPT query:", error);
      return "I'm experiencing technical difficulties. Please try again or consult clinical resources directly.";
    }
  }

  /**
   * Mark suggestion as accepted by clinician
   */
  async acceptSuggestion(suggestionId: number, userId: number) {
    try {
      await db.update(aiSuggestions)
        .set({ 
          accepted: true, 
          acceptedAt: new Date() 
        })
        .where(eq(aiSuggestions.id, suggestionId));
    } catch (error) {
      console.error("Error accepting suggestion:", error);
    }
  }

  /**
   * Generate automated administrative tasks detection
   */
  async detectAdministrativeTasks(transcript: string, userId: number, sessionId: string): Promise<string[]> {
    try {
      const prompt = `
Analyze the following clinical conversation transcript and identify any administrative commitments or paperwork the clinician has mentioned they will complete:

**Transcript:** ${transcript}

Look for mentions of:
- Writing reports to doctors/GPs
- Submitting insurance claims (AHTR)
- Providing work certificates
- Creating referral letters
- Writing progress reports
- Any other administrative tasks

Return a JSON array of administrative tasks that were mentioned, in this format:
["task1", "task2", "task3"]

If no administrative tasks are mentioned, return an empty array: []
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an AI assistant that identifies administrative commitments made during clinical consultations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"tasks": []}');
      const tasks = result.tasks || [];
      
      // Broadcast detected tasks to clients
      if (tasks.length > 0) {
        this.broadcastToSession(sessionId, {
          type: 'administrative_tasks_detected',
          data: {
            tasks: tasks,
            timestamp: new Date().toISOString()
          }
        });
      }

      return tasks;
    } catch (error) {
      console.error("Error detecting administrative tasks:", error);
      return [];
    }
  }

  /**
   * Generate SOAP sections from transcript using AI
   */
  async generateSoapSections(transcript: string): Promise<{
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  }> {
    try {
      const prompt = `
Analyze the following clinical transcript and generate structured SOAP note sections. Extract and organize the information appropriately for each section:

**Transcript:**
${transcript}

Generate SOAP sections based on this transcript. Follow these guidelines:

**SUBJECTIVE:** Include patient's reported symptoms, history, pain descriptions, functional limitations, and onset details. Use the patient's own words when possible.

**OBJECTIVE:** Include any physical examination findings, observable signs, test results, measurements, and clinical observations mentioned.

**ASSESSMENT:** Provide clinical reasoning, possible diagnoses, problem identification, and interpretation of findings.

**PLAN:** Include proposed treatments, interventions, patient education, follow-up recommendations, and goals.

If information for a section is not available in the transcript, provide a professional template prompt for that section.

Respond in JSON format:
{
  "subjective": "Patient reports...",
  "objective": "On examination...",
  "assessment": "Clinical impression...",
  "plan": "Treatment plan includes..."
}
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert physiotherapist AI assistant specialized in creating structured SOAP notes from clinical conversations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      const soapSections = JSON.parse(content);
      
      return {
        subjective: soapSections.subjective || "Patient reports [information to be documented]...",
        objective: soapSections.objective || "On examination [findings to be documented]...",
        assessment: soapSections.assessment || "Clinical impression [analysis to be completed]...",
        plan: soapSections.plan || "Treatment plan includes [interventions to be planned]..."
      };

    } catch (error) {
      console.error("Error generating SOAP sections:", error);
      
      // Fallback to basic template
      return {
        subjective: `Patient reports: ${transcript.slice(0, 200)}...`,
        objective: "Physical examination findings to be documented during assessment.",
        assessment: "Clinical assessment and reasoning to be completed based on subjective and objective findings.",
        plan: "Treatment plan and interventions to be developed based on assessment."
      };
    }
  }
}

export const realTimeAIService = RealTimeAIService.getInstance();