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
  }> {
    const prompt = `You are an expert physiotherapist analyzing clinical documentation to predict realistic movement patterns and limitations.

Clinical Text:
${clinicalText}

Based on this clinical information, generate a comprehensive movement analysis in JSON format:

{
  "patterns": {
    "restrictions": [
      {
        "bodyPart": "specific joint/region (e.g., right_shoulder, left_knee, spine)",
        "limitationType": "type of restriction (e.g., flexion_limited, rotation_restricted, weight_bearing_limited)",
        "severity": "number 0-10 (10 = complete restriction)",
        "description": "clinical description of the limitation"
      }
    ],
    "compensations": [
      {
        "primaryRestriction": "what movement is restricted",
        "compensatoryMovement": "how the body compensates",
        "bodyPartsInvolved": ["list of body parts showing compensation"]
      }
    ],
    "painResponses": [
      {
        "trigger": "movement or position that triggers pain",
        "response": "how the body responds (guarding, avoidance, etc.)",
        "affectedRegions": ["body regions showing pain response"]
      }
    ]
  },
  "correlation": {
    "soapFindings": ["key findings from the SOAP note"],
    "movementHypotheses": ["predicted movement patterns based on findings"],
    "expectedLimitations": ["specific movement limitations to demonstrate"]
  },
  "movementDescription": "detailed description of how the patient would move, including specific limitations, compensations, and pain behaviors"
}

Focus on realistic, clinically accurate movement patterns that would be visible in a 3D skeleton animation.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    return {
      patterns: analysis.patterns || { restrictions: [], compensations: [], painResponses: [] },
      correlation: analysis.correlation || { soapFindings: [], movementHypotheses: [], expectedLimitations: [] },
      movementDescription: analysis.movementDescription || ''
    };
  }

  /**
   * Generate pose sequence frames based on movement analysis
   */
  private generatePoseSequence(analysis: any): GeneratedMovementData['frames'] {
    const frames: GeneratedMovementData['frames'] = [];
    const frameCount = 120; // 12 seconds at 10 FPS
    const duration = 12000; // 12 seconds in milliseconds

    for (let i = 0; i < frameCount; i++) {
      const timestamp = (i / frameCount) * duration;
      
      // Create movement progression showing restrictions
      const progress = i / frameCount;
      let movementPhase: 'rest' | 'attempt' | 'restricted' | 'compensation' = 'rest';
      
      if (progress < 0.2) {
        movementPhase = 'rest';
      } else if (progress < 0.5) {
        movementPhase = 'attempt'; // Person tries to move
      } else if (progress < 0.8) {
        movementPhase = 'restricted'; // Shows limitation
      } else {
        movementPhase = 'compensation'; // Shows compensatory movement
      }
      
      const landmarks = this.generateLandmarksForFrame(i, frameCount, analysis, movementPhase);
      
      frames.push({
        timestamp,
        landmarks
      });
    }

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
          movementPhase
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
    movementPhase: 'rest' | 'attempt' | 'restricted' | 'compensation' = 'rest'
  ): [number, number, number] {
    let [x, y, z] = landmark.defaultPosition;
    
    // Create different movement patterns based on phase and clinical restrictions
    const progress = frameIndex / totalFrames;
    
    // Apply movement based on phase
    switch (movementPhase) {
      case 'rest':
        // Neutral position with subtle breathing
        const breathingCycle = Math.sin(progress * Math.PI * 8) * 0.01;
        if (landmark.name.includes('shoulder') || landmark.name === 'nose') {
          y += breathingCycle;
        }
        break;
        
      case 'attempt':
        // Person attempts normal movement
        if (patterns?.restrictions) {
          for (const restriction of patterns.restrictions) {
            if (this.landmarkMatchesBodyPart(landmark.name, restriction.bodyPart)) {
              // Show attempted movement - starts normal then gets restricted
              const attemptProgress = Math.sin(progress * Math.PI * 2);
              
              if (restriction.bodyPart.includes('shoulder')) {
                // Attempt shoulder elevation/flexion
                y += attemptProgress * 0.3;
                if (restriction.bodyPart.includes('right')) {
                  x += attemptProgress * 0.1;
                } else if (restriction.bodyPart.includes('left')) {
                  x -= attemptProgress * 0.1;
                }
              }
              
              if (restriction.bodyPart.includes('spine')) {
                // Attempt forward bending
                z += attemptProgress * 0.2;
                y -= attemptProgress * 0.1;
              }
            }
          }
        }
        break;
        
      case 'restricted':
        // Shows the limitation - movement stops at restriction point
        if (patterns?.restrictions) {
          for (const restriction of patterns.restrictions) {
            if (this.landmarkMatchesBodyPart(landmark.name, restriction.bodyPart)) {
              const restrictionFactor = restriction.severity / 10;
              const limitedProgress = Math.min(progress, 0.3); // Can only achieve 30% of normal range
              
              if (restriction.bodyPart.includes('shoulder')) {
                // Limited shoulder movement
                y += limitedProgress * 0.2 * (1 - restrictionFactor);
                if (restriction.bodyPart.includes('right')) {
                  x += limitedProgress * 0.05 * (1 - restrictionFactor);
                } else if (restriction.bodyPart.includes('left')) {
                  x -= limitedProgress * 0.05 * (1 - restrictionFactor);
                }
              }
              
              if (restriction.bodyPart.includes('spine')) {
                // Limited forward bending
                z += limitedProgress * 0.1 * (1 - restrictionFactor);
                y -= limitedProgress * 0.05 * (1 - restrictionFactor);
              }
            }
          }
        }
        break;
        
      case 'compensation':
        // Shows compensatory movement patterns
        if (patterns?.compensations) {
          for (const compensation of patterns.compensations) {
            for (const bodyPart of compensation.bodyPartsInvolved) {
              if (this.landmarkMatchesBodyPart(landmark.name, bodyPart)) {
                const compensationCycle = Math.sin(progress * Math.PI * 3);
                
                // Exaggerated compensatory movements
                if (bodyPart.includes('left') && compensation.primaryRestriction.includes('right')) {
                  // Left side compensates for right side restriction
                  y += compensationCycle * 0.15;
                  x -= compensationCycle * 0.1;
                }
                
                if (bodyPart.includes('trunk') || bodyPart.includes('spine')) {
                  // Trunk compensation
                  x += compensationCycle * 0.08;
                  z += compensationCycle * 0.05;
                }
              }
            }
          }
        }
        break;
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