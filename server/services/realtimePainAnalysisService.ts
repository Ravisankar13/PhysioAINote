import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface PainLocation {
  bodyPart: string;
  severity: number;
  type: string;
  coordinates: {
    x: number;
    y: number;
    z: number;
  };
  color: string;
}

export interface VirtualPatientParameters {
  painLocations: PainLocation[];
  posture: string;
  movement: string;
  gait: string;
  timestamp: string;
}

// Body part to 3D coordinates mapping for the skeleton model
const BODY_PART_COORDINATES: Record<string, { x: number; y: number; z: number }> = {
  // Head and Neck
  'head': { x: 0, y: 1.7, z: 0 },
  'neck': { x: 0, y: 1.5, z: 0 },
  'cervical_spine': { x: 0, y: 1.4, z: -0.05 },
  
  // Shoulders
  'left_shoulder': { x: -0.25, y: 1.4, z: 0 },
  'right_shoulder': { x: 0.25, y: 1.4, z: 0 },
  
  // Arms
  'left_upper_arm': { x: -0.3, y: 1.2, z: 0 },
  'right_upper_arm': { x: 0.3, y: 1.2, z: 0 },
  'left_elbow': { x: -0.35, y: 1.0, z: 0 },
  'right_elbow': { x: 0.35, y: 1.0, z: 0 },
  'left_forearm': { x: -0.35, y: 0.8, z: 0 },
  'right_forearm': { x: 0.35, y: 0.8, z: 0 },
  'left_wrist': { x: -0.35, y: 0.65, z: 0 },
  'right_wrist': { x: 0.35, y: 0.65, z: 0 },
  'left_hand': { x: -0.35, y: 0.55, z: 0 },
  'right_hand': { x: 0.35, y: 0.55, z: 0 },
  
  // Spine
  'upper_back': { x: 0, y: 1.3, z: -0.05 },
  'mid_back': { x: 0, y: 1.1, z: -0.05 },
  'lower_back': { x: 0, y: 0.9, z: -0.05 },
  'lumbar_spine': { x: 0, y: 0.85, z: -0.05 },
  'sacrum': { x: 0, y: 0.7, z: -0.05 },
  
  // Chest and Abdomen
  'chest': { x: 0, y: 1.2, z: 0.1 },
  'ribs': { x: 0, y: 1.15, z: 0.05 },
  'abdomen': { x: 0, y: 0.95, z: 0.05 },
  
  // Hips and Pelvis
  'left_hip': { x: -0.15, y: 0.8, z: 0 },
  'right_hip': { x: 0.15, y: 0.8, z: 0 },
  'pelvis': { x: 0, y: 0.75, z: 0 },
  
  // Legs
  'left_thigh': { x: -0.15, y: 0.55, z: 0 },
  'right_thigh': { x: 0.15, y: 0.55, z: 0 },
  'left_knee': { x: -0.15, y: 0.35, z: 0.05 },
  'right_knee': { x: 0.15, y: 0.35, z: 0.05 },
  'left_shin': { x: -0.15, y: 0.2, z: 0 },
  'right_shin': { x: 0.15, y: 0.2, z: 0 },
  'left_calf': { x: -0.15, y: 0.15, z: -0.05 },
  'right_calf': { x: 0.15, y: 0.15, z: -0.05 },
  'left_ankle': { x: -0.15, y: 0.05, z: 0 },
  'right_ankle': { x: 0.15, y: 0.05, z: 0 },
  'left_foot': { x: -0.15, y: 0, z: 0.05 },
  'right_foot': { x: 0.15, y: 0, z: 0.05 },
};

class RealtimePainAnalysisService {
  private static instance: RealtimePainAnalysisService;

  private constructor() {}

  public static getInstance(): RealtimePainAnalysisService {
    if (!RealtimePainAnalysisService.instance) {
      RealtimePainAnalysisService.instance = new RealtimePainAnalysisService();
    }
    return RealtimePainAnalysisService.instance;
  }

  private normalizeBodyPart(bodyPart: string): string {
    // Normalize body part names to match our coordinate system
    const normalized = bodyPart.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/^(left|right)\s+/, '$1_')
      .replace(/shoulder\s+blade/i, 'shoulder')
      .replace(/scapula/i, 'shoulder')
      .replace(/patella/i, 'knee')
      .replace(/achilles/i, 'ankle')
      .replace(/quad(riceps)?/i, 'thigh')
      .replace(/hamstring/i, 'thigh')
      .replace(/glute(us)?/i, 'hip')
      .replace(/bicep/i, 'upper_arm')
      .replace(/tricep/i, 'upper_arm')
      .replace(/spine/i, 'back')
      .replace(/vertebra[el]?/i, 'back')
      .replace(/l[1-5]/i, 'lumbar_spine')
      .replace(/t[1-12]/i, 'mid_back')
      .replace(/c[1-7]/i, 'cervical_spine');

    // Check if we have coordinates for this body part
    if (BODY_PART_COORDINATES[normalized]) {
      return normalized;
    }

    // Try to find a close match
    for (const part of Object.keys(BODY_PART_COORDINATES)) {
      if (normalized.includes(part) || part.includes(normalized)) {
        return part;
      }
    }

    // Default to generic locations based on keywords
    if (normalized.includes('back')) return 'lower_back';
    if (normalized.includes('neck')) return 'neck';
    if (normalized.includes('head')) return 'head';
    if (normalized.includes('shoulder')) return 'right_shoulder';
    if (normalized.includes('knee')) return 'right_knee';
    if (normalized.includes('hip')) return 'right_hip';
    if (normalized.includes('ankle')) return 'right_ankle';
    if (normalized.includes('elbow')) return 'right_elbow';
    if (normalized.includes('wrist')) return 'right_wrist';
    
    return 'lower_back'; // Default fallback
  }

  private getSeverityColor(severity: number): string {
    if (severity >= 8) return '#ff0000'; // Bright red for severe
    if (severity >= 6) return '#ff4500'; // Orange-red for moderate-severe
    if (severity >= 4) return '#ffa500'; // Orange for moderate
    if (severity >= 2) return '#ffff00'; // Yellow for mild
    return '#90ee90'; // Light green for minimal
  }

  public async analyzeTranscript(transcript: string): Promise<VirtualPatientParameters> {
    try {
      if (!transcript || transcript.length < 10) {
        return {
          painLocations: [],
          posture: 'normal',
          movement: 'normal',
          gait: 'normal',
          timestamp: new Date().toISOString()
        };
      }

      const systemPrompt = `You are a medical AI analyzing patient consultations for a 3D virtual patient visualization system.
Extract pain locations, severity, and movement patterns from the transcript.

Return a JSON object with this exact structure:
{
  "painLocations": [
    {
      "bodyPart": "exact body part name (e.g., 'right_knee', 'left_shoulder', 'lower_back')",
      "severity": number from 1-10,
      "type": "pain type (sharp, dull, aching, burning, stabbing, throbbing)"
    }
  ],
  "posture": "description of posture issues if mentioned",
  "movement": "description of movement restrictions if mentioned",
  "gait": "description of gait abnormalities if mentioned"
}

Body part names should be specific and include left/right when mentioned.
Common body parts: head, neck, left_shoulder, right_shoulder, left_upper_arm, right_upper_arm, 
left_elbow, right_elbow, left_wrist, right_wrist, left_hand, right_hand, chest, upper_back, 
mid_back, lower_back, left_hip, right_hip, left_thigh, right_thigh, left_knee, right_knee, 
left_shin, right_shin, left_ankle, right_ankle, left_foot, right_foot`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this patient consultation transcript and extract pain locations and movement patterns:\n\n${transcript}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 500
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      // Process pain locations with coordinates
      const painLocations: PainLocation[] = (analysis.painLocations || []).map((location: any) => {
        const normalizedBodyPart = this.normalizeBodyPart(location.bodyPart);
        const coordinates = BODY_PART_COORDINATES[normalizedBodyPart] || { x: 0, y: 0.9, z: 0 };
        
        return {
          bodyPart: location.bodyPart,
          severity: Math.min(10, Math.max(1, location.severity || 5)),
          type: location.type || 'aching',
          coordinates,
          color: this.getSeverityColor(location.severity || 5)
        };
      });

      console.log('[PainAnalysis] Extracted pain locations:', painLocations);

      return {
        painLocations,
        posture: analysis.posture || 'normal',
        movement: analysis.movement || 'normal',
        gait: analysis.gait || 'normal',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[PainAnalysis] Error analyzing transcript:', error);
      return {
        painLocations: [],
        posture: 'normal',
        movement: 'normal',
        gait: 'normal',
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const realtimePainAnalysisService = RealtimePainAnalysisService.getInstance();