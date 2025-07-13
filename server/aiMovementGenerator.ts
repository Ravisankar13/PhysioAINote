/**
 * AI Movement Generator Service
 * 
 * Generates realistic InteractiveSkeleton animation sequences from Enhanced SOAP note text.
 * Creates synthetic pose data that visually demonstrates clinical findings and movement patterns.
 */

import OpenAI from "openai";
import { SoapNote } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface GeneratedMovementData {
  frames: Array<{
    timestamp: number;
    landmarks: Array<{
      x: number;
      y: number;
      z: number;
      visibility: number;
    }>;
  }>;
  movementPatterns: {
    restrictions: Array<{
      bodyPart: string;
      limitationType: string;
      severity: number;
      description: string;
    }>;
    compensations: Array<{
      primaryRestriction: string;
      compensatoryMovement: string;
      bodyPartsInvolved: string[];
    }>;
    painResponses: Array<{
      trigger: string;
      response: string;
      affectedRegions: string[];
    }>;
  };
  clinicalCorrelation: {
    soapFindings: string[];
    movementHypotheses: string[];
    expectedLimitations: string[];
  };
}

export interface SkeletonLandmark {
  name: string;
  index: number;
  parentIndex?: number;
  defaultPosition: [number, number, number];
}

// MediaPipe pose landmark mapping to InteractiveSkeleton regions
export const SKELETON_LANDMARKS: SkeletonLandmark[] = [
  // Head and neck
  { name: 'nose', index: 0, defaultPosition: [0, 1.6, 0] },
  { name: 'left_eye', index: 1, defaultPosition: [-0.05, 1.65, 0.05] },
  { name: 'right_eye', index: 2, defaultPosition: [0.05, 1.65, 0.05] },
  { name: 'left_ear', index: 3, defaultPosition: [-0.08, 1.6, 0] },
  { name: 'right_ear', index: 4, defaultPosition: [0.08, 1.6, 0] },
  
  // Upper body
  { name: 'left_shoulder', index: 11, parentIndex: 0, defaultPosition: [-0.3, 1.4, 0] },
  { name: 'right_shoulder', index: 12, parentIndex: 0, defaultPosition: [0.3, 1.4, 0] },
  { name: 'left_elbow', index: 13, parentIndex: 11, defaultPosition: [-0.4, 1.0, 0] },
  { name: 'right_elbow', index: 14, parentIndex: 12, defaultPosition: [0.4, 1.0, 0] },
  { name: 'left_wrist', index: 15, parentIndex: 13, defaultPosition: [-0.5, 0.7, 0] },
  { name: 'right_wrist', index: 16, parentIndex: 14, defaultPosition: [0.5, 0.7, 0] },
  
  // Torso and hips
  { name: 'left_hip', index: 23, defaultPosition: [-0.15, 0.4, 0] },
  { name: 'right_hip', index: 24, defaultPosition: [0.15, 0.4, 0] },
  
  // Lower body
  { name: 'left_knee', index: 25, parentIndex: 23, defaultPosition: [-0.15, -0.2, 0] },
  { name: 'right_knee', index: 26, parentIndex: 24, defaultPosition: [0.15, -0.2, 0] },
  { name: 'left_ankle', index: 27, parentIndex: 25, defaultPosition: [-0.15, -0.8, 0] },
  { name: 'right_ankle', index: 28, parentIndex: 26, defaultPosition: [0.15, -0.8, 0] },
];

export class AIMovementGenerator {
  /**
   * Generate movement animation from SOAP note text
   */
  async generateMovementFromSOAP(soapNote: SoapNote): Promise<GeneratedMovementData> {
    try {
      console.log('Generating AI movement from SOAP note:', soapNote.id);
      
      const clinicalText = this.extractClinicalText(soapNote);
      const movementAnalysis = await this.analyzeMovementPatterns(clinicalText);
      const poseSequence = this.generatePoseSequence(movementAnalysis);
      
      return {
        frames: poseSequence,
        movementPatterns: movementAnalysis.patterns,
        clinicalCorrelation: movementAnalysis.correlation
      };
    } catch (error) {
      console.error('Error generating AI movement:', error);
      return this.getFallbackMovement();
    }
  }

  /**
   * Extract relevant clinical text from SOAP note
   */
  private extractClinicalText(soapNote: SoapNote): string {
    const sections = [
      soapNote.subjective || '',
      soapNote.objective || '',
      soapNote.assessment || '',
      soapNote.plan || '',
      soapNote.fullTranscription || ''
    ];
    
    return sections.filter(section => section.trim()).join('\n\n');
  }

  /**
   * Analyze movement patterns using OpenAI
   */
  private async analyzeMovementPatterns(clinicalText: string): Promise<{
    patterns: GeneratedMovementData['movementPatterns'];
    correlation: GeneratedMovementData['clinicalCorrelation'];
    movementDescription: string;
    conditionType: string;
    primaryBodyPart: string;
  }> {
    // Add unique timestamp to ensure different responses for different inputs
    const timestamp = Date.now();
    const textHash = clinicalText.slice(0, 100); // Use first 100 chars as uniqueness identifier
    
    const prompt = `TIMESTAMP: ${timestamp}
CLINICAL TEXT HASH: ${textHash}

You are an expert movement analysis physiotherapist. Analyze this SPECIFIC clinical text and create UNIQUE movement patterns that directly reflect the described condition. Each input should produce distinctly different animations.

Clinical Text:
"${clinicalText}"

CRITICAL: Analyze the SPECIFIC body part and condition mentioned. Create movement patterns that are UNIQUE to this particular case:

- If KNEE mentioned: focus on knee-specific restrictions (flexion, weight-bearing, stair climbing)
- If SHOULDER mentioned: focus on arm elevation, reaching, rotation limitations  
- If BACK mentioned: focus on spinal flexion, extension, rotation restrictions
- If HIP mentioned: focus on hip flexion, abduction, walking patterns
- If ANKLE mentioned: focus on dorsiflexion, plantar flexion, weight-bearing

Generate CONDITION-SPECIFIC movement analysis in JSON:

{
  "conditionType": "specific condition (e.g., knee_osteoarthritis, shoulder_impingement, lumbar_strain)",
  "primaryBodyPart": "main affected area (knee/shoulder/back/hip/ankle/wrist)",
  "patterns": {
    "restrictions": [
      {
        "bodyPart": "exact joint affected (right_knee, left_shoulder, lumbar_spine)",
        "limitationType": "specific restriction type matching the condition",
        "severity": "severity 1-10 based on clinical description",
        "description": "detailed clinical limitation description",
        "movementPattern": "specific movement that shows this restriction"
      }
    ],
    "compensations": [
      {
        "primaryRestriction": "what specific movement is restricted", 
        "compensatoryMovement": "how body adapts to this specific restriction",
        "bodyPartsInvolved": ["specific parts showing compensation"],
        "visualPattern": "how this compensation appears in animation"
      }
    ],
    "painResponses": [
      {
        "trigger": "specific movement that triggers pain",
        "response": "exact pain behavior (guarding, limping, etc.)",
        "affectedRegions": ["specific regions affected"],
        "intensityPattern": "how pain intensity varies during movement"
      }
    ]
  },
  "correlation": {
    "soapFindings": ["specific findings from THIS clinical text"],
    "movementHypotheses": ["unique movement predictions for THIS condition"],
    "expectedLimitations": ["specific limitations visible in animation"],
    "diagnosticMovements": ["movements that would reveal this condition"]
  },
  "movementDescription": "detailed, specific description of how THIS patient would move differently from others, including exact joint restrictions, timing of limitations, and visible compensations"
}

ENSURE the analysis is SPECIFICALLY tailored to the clinical text provided. Different conditions must produce noticeably different movement patterns.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7, // Increased temperature for more varied responses
      max_tokens: 1500,
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    
    console.log(`Movement analysis generated for condition: ${analysis.conditionType || 'unknown'}, Primary body part: ${analysis.primaryBodyPart || 'unknown'}`);
    
    return {
      patterns: analysis.patterns || { restrictions: [], compensations: [], painResponses: [] },
      correlation: analysis.correlation || { soapFindings: [], movementHypotheses: [], expectedLimitations: [] },
      movementDescription: analysis.movementDescription || '',
      conditionType: analysis.conditionType || 'general_condition',
      primaryBodyPart: analysis.primaryBodyPart || 'general'
    };
  }

  /**
   * Generate pose sequence frames based on movement analysis
   */
  private generatePoseSequence(analysis: any): GeneratedMovementData['frames'] {
    const frames: GeneratedMovementData['frames'] = [];
    const frameCount = 120; // 12 seconds at 10 FPS
    const duration = 12000; // 12 seconds in milliseconds
    
    console.log(`Generating ${frameCount} frames for condition: ${analysis.conditionType}, body part: ${analysis.primaryBodyPart}`);

    for (let i = 0; i < frameCount; i++) {
      const timestamp = (i / frameCount) * duration;
      
      // Create condition-specific movement progression
      const progress = i / frameCount;
      let movementPhase: 'rest' | 'attempt' | 'restricted' | 'compensation' = 'rest';
      
      // Adjust phase timing based on condition severity
      const severity = analysis.patterns?.restrictions?.[0]?.severity || 5;
      const restrictionRatio = severity / 10;
      
      if (progress < 0.15) {
        movementPhase = 'rest';
      } else if (progress < 0.4) {
        movementPhase = 'attempt'; // Person tries to move
      } else if (progress < (0.6 + restrictionRatio * 0.2)) {
        movementPhase = 'restricted'; // Shows limitation (longer for severe conditions)
      } else {
        movementPhase = 'compensation'; // Shows compensatory movement
      }
      
      const landmarks = this.generateLandmarksForFrame(i, frameCount, analysis, movementPhase);
      
      frames.push({
        timestamp,
        landmarks
      });
    }

    console.log(`Generated ${frames.length} unique animation frames for ${analysis.conditionType}`);
    return frames;
  }

  /**
   * Generate landmarks for a specific frame
   */
  private generateLandmarksForFrame(
    frameIndex: number, 
    totalFrames: number, 
    analysis: any,
    movementPhase: 'rest' | 'attempt' | 'restricted' | 'compensation' = 'rest'
  ): Array<{ x: number; y: number; z: number; visibility: number }> {
    const landmarks: Array<{ x: number; y: number; z: number; visibility: number }> = [];
    
    // Create full MediaPipe-compatible landmark array (33 landmarks)
    for (let i = 0; i < 33; i++) {
      const skeletonLandmark = SKELETON_LANDMARKS.find(l => l.index === i);
      
      if (skeletonLandmark) {
        // Apply movement restrictions and compensations
        const position = this.applyMovementRestrictions(
          skeletonLandmark,
          frameIndex,
          totalFrames,
          analysis.patterns,
          movementPhase,
          analysis.conditionType,
          analysis.primaryBodyPart
        );
        
        landmarks.push({
          x: position[0],
          y: position[1],
          z: position[2],
          visibility: 0.9
        });
      } else {
        // Fill gaps with interpolated positions
        landmarks.push({
          x: 0,
          y: 0,
          z: 0,
          visibility: 0.1
        });
      }
    }

    return landmarks;
  }

  /**
   * Apply movement restrictions to landmark positions
   */
  private applyMovementRestrictions(
    landmark: SkeletonLandmark,
    frameIndex: number,
    totalFrames: number,
    patterns: any,
    movementPhase: 'rest' | 'attempt' | 'restricted' | 'compensation' = 'rest',
    conditionType: string = '',
    primaryBodyPart: string = ''
  ): [number, number, number] {
    let [x, y, z] = landmark.defaultPosition;
    
    // Create unique movement patterns based on condition type and body part
    const timeProgress = frameIndex / totalFrames;
    const phaseIntensity = movementPhase === 'restricted' ? 1 : 
                          movementPhase === 'attempt' ? 0.6 : 
                          movementPhase === 'compensation' ? 0.8 : 0.1;
    
    // Condition-specific movement modifications
    if (conditionType.includes('knee') || primaryBodyPart === 'knee') {
      if (landmark.name.includes('knee') || landmark.name.includes('ankle') || landmark.name.includes('hip')) {
        // Knee-specific limitations
        const kneeRestriction = Math.sin(timeProgress * Math.PI * 2) * phaseIntensity * 0.15;
        y += kneeRestriction * 0.8; // Limited knee flexion
        if (movementPhase === 'compensation') {
          // Hip hiking compensation for knee problems
          if (landmark.name.includes('hip')) {
            y += Math.abs(kneeRestriction) * 0.5;
            x += kneeRestriction * 0.3; // Hip circumduction
          }
        }
        if (movementPhase === 'restricted') {
          // Show knee giving way or stiffness
          z += kneeRestriction * 0.1; // Forward knee position
        }
      }
    }
    
    if (conditionType.includes('shoulder') || primaryBodyPart === 'shoulder') {
      if (landmark.name.includes('shoulder') || landmark.name.includes('elbow') || landmark.name.includes('wrist')) {
        // Shoulder-specific limitations
        const shoulderRestriction = Math.sin(timeProgress * Math.PI * 1.5) * phaseIntensity;
        y += shoulderRestriction * 0.12; // Limited elevation
        z += shoulderRestriction * 0.08; // Limited forward reach
        if (movementPhase === 'compensation') {
          // Trunk lean compensation for shoulder restriction
          if (landmark.name.includes('shoulder')) {
            x += shoulderRestriction * 0.06; // Side bending
          }
          // Scapular winging
          if (landmark.name.includes('shoulder')) {
            z += Math.abs(shoulderRestriction) * 0.04;
          }
        }
        if (movementPhase === 'restricted') {
          // Painful arc or impingement pattern
          const restrictedRange = Math.min(Math.abs(shoulderRestriction), 0.05);
          y += restrictedRange;
        }
      }
    }
    
    if (conditionType.includes('back') || conditionType.includes('spine') || primaryBodyPart === 'back') {
      // Spine-specific limitations
      const spineRestriction = Math.sin(timeProgress * Math.PI * 3) * phaseIntensity;
      if (landmark.name.includes('shoulder') || landmark.name.includes('hip')) {
        z += spineRestriction * 0.05; // Limited spinal flexion
        if (movementPhase === 'restricted') {
          // Rigid movement pattern - no spinal segmentation
          y += Math.abs(spineRestriction) * 0.03;
          x += spineRestriction * 0.02; // Antalgic posture
        }
        if (movementPhase === 'compensation') {
          // Hip substitution for spinal movement
          if (landmark.name.includes('hip')) {
            y += spineRestriction * 0.08;
            z += Math.abs(spineRestriction) * 0.06;
          }
        }
      }
    }
    
    if (conditionType.includes('ankle') || primaryBodyPart === 'ankle') {
      if (landmark.name.includes('ankle') || landmark.name.includes('foot') || landmark.name.includes('knee')) {
        // Ankle-specific limitations
        const ankleRestriction = Math.sin(timeProgress * Math.PI * 4) * phaseIntensity;
        z += ankleRestriction * 0.08; // Limited dorsiflexion
        if (movementPhase === 'compensation') {
          // Circumduction pattern to clear foot
          x += ankleRestriction * 0.04;
          y += Math.abs(ankleRestriction) * 0.02; // Hip hiking
        }
        if (movementPhase === 'restricted') {
          // Drop foot or stiff ankle
          z -= Math.abs(ankleRestriction) * 0.03; // Plantar flexed position
        }
      }
    }
    
    if (conditionType.includes('hip') || primaryBodyPart === 'hip') {
      if (landmark.name.includes('hip') || landmark.name.includes('knee') || landmark.name.includes('ankle')) {
        // Hip-specific limitations
        const hipRestriction = Math.sin(timeProgress * Math.PI * 2.5) * phaseIntensity;
        if (movementPhase === 'restricted') {
          // Limited hip flexion/extension
          z += hipRestriction * 0.06;
          y += hipRestriction * 0.04;
        }
        if (movementPhase === 'compensation') {
          // Trendelenburg pattern or pelvic drop
          if (landmark.name.includes('hip')) {
            x += hipRestriction * 0.08; // Pelvic shift
            y += hipRestriction * 0.05; // Pelvic hike
          }
          // Knee valgus compensation
          if (landmark.name.includes('knee')) {
            x += hipRestriction * 0.04;
          }
        }
      }
    }
    
    // Apply general restrictions from analysis patterns
    if (patterns?.restrictions) {
      for (const restriction of patterns.restrictions) {
        if (this.landmarkMatchesBodyPart(landmark.name, restriction.bodyPart)) {
          const restrictionFactor = restriction.severity / 10;
          const uniquePattern = Math.sin(timeProgress * Math.PI * (2 + restrictionFactor)) * phaseIntensity * restrictionFactor;
          
          // Apply unique restriction pattern based on severity
          y += uniquePattern * 0.1 * restrictionFactor;
          x += uniquePattern * 0.05 * restrictionFactor;
          z += uniquePattern * 0.03 * restrictionFactor;
        }
      }
    }
    
    // Apply compensations from analysis
    if (patterns?.compensations && movementPhase === 'compensation') {
      for (const compensation of patterns.compensations) {
        for (const bodyPart of compensation.bodyPartsInvolved) {
          if (this.landmarkMatchesBodyPart(landmark.name, bodyPart)) {
            const compensationCycle = Math.sin(timeProgress * Math.PI * 3) * phaseIntensity;
            
            // Specific compensation patterns
            y += compensationCycle * 0.1;
            x += compensationCycle * 0.06;
            z += compensationCycle * 0.04;
          }
        }
      }
    }

    return [x, y, z];
  }

  /**
   * Check if landmark matches body part description
   */
  private landmarkMatchesBodyPart(landmarkName: string, bodyPart: string): boolean {
    const normalizedLandmark = landmarkName.toLowerCase().replace('_', ' ');
    const normalizedBodyPart = bodyPart.toLowerCase().replace('_', ' ');
    
    return normalizedLandmark.includes(normalizedBodyPart) || 
           normalizedBodyPart.includes(normalizedLandmark.split(' ')[1] || '');
  }

  /**
   * Generate fallback movement for error cases
   */
  private getFallbackMovement(): GeneratedMovementData {
    return {
      frames: this.generatePoseSequence({
        patterns: {
          restrictions: [],
          compensations: [],
          painResponses: []
        }
      }),
      movementPatterns: {
        restrictions: [],
        compensations: [],
        painResponses: []
      },
      clinicalCorrelation: {
        soapFindings: ['Unable to analyze clinical text'],
        movementHypotheses: ['Normal movement pattern'],
        expectedLimitations: ['No specific limitations identified']
      }
    };
  }

  /**
   * Update existing movement data when SOAP text changes
   */
  async updateMovementFromSOAP(
    existingData: GeneratedMovementData,
    soapNote: SoapNote
  ): Promise<GeneratedMovementData> {
    try {
      // Generate new movement data
      const newData = await this.generateMovementFromSOAP(soapNote);
      
      // Blend with existing data if beneficial
      return {
        ...newData,
        // Preserve any manual adjustments or refinements
        movementPatterns: {
          ...newData.movementPatterns,
          // Could add logic to preserve user modifications here
        }
      };
    } catch (error) {
      console.error('Error updating movement from SOAP:', error);
      return existingData;
    }
  }
}

export const aiMovementGenerator = new AIMovementGenerator();