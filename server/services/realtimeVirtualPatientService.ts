import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ClinicalParameter {
  jointAngles: Record<string, number>;
  movementRestrictions: Record<string, { min: number; max: number }>;
  pathologyIndicators: {
    shoulder?: {
      impingement?: boolean;
      frozenShoulder?: boolean;
      rotatorCuffTear?: boolean;
    };
    spine?: {
      kyphosis?: number;
      lordosis?: number;
      scoliosis?: number;
      flexionLimitation?: number;
    };
    lowerLimb?: {
      kneeFlexionContracture?: number;
      hipFlexionContracture?: number;
      ankleDorsiflexionLimit?: number;
      trendelenburg?: boolean;
    };
  };
  gaitPattern?: string;
  posturalDeviations?: string[];
  painLocations?: string[];
  limbScaling?: {
    leftArm?: number;
    rightArm?: number;
    leftLeg?: number;
    rightLeg?: number;
  };
}

export class RealtimeVirtualPatientService {
  private static instance: RealtimeVirtualPatientService;
  private currentParameters: ClinicalParameter = {
    jointAngles: {},
    movementRestrictions: {},
    pathologyIndicators: {},
    limbScaling: {
      leftArm: 1.0,
      rightArm: 1.0,
      leftLeg: 1.0,
      rightLeg: 1.0
    }
  };

  static getInstance(): RealtimeVirtualPatientService {
    if (!RealtimeVirtualPatientService.instance) {
      RealtimeVirtualPatientService.instance = new RealtimeVirtualPatientService();
    }
    return RealtimeVirtualPatientService.instance;
  }

  async analyzeTranscriptForParameters(transcript: string): Promise<ClinicalParameter> {
    try {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a clinical movement analysis expert. Extract clinical parameters from the transcript to update a 3D virtual patient model in real-time.
            
            Focus on identifying:
            1. Joint angles and range of motion (e.g., "shoulder flexion limited to 90 degrees")
            2. Movement restrictions and contractures
            3. Postural deviations (forward head, kyphosis, etc.)
            4. Gait patterns (antalgic, Trendelenburg, etc.)
            5. Pain locations and patterns
            6. Asymmetries requiring limb scaling
            
            Return ONLY the changes/updates from the current transcript segment, not a complete model.
            Be conservative - only extract clearly stated clinical findings.
            
            Respond with JSON in this exact format:
            {
              "jointAngles": {
                "shoulderFlexionRight": 90,
                "kneeFlexionLeft": 30
              },
              "movementRestrictions": {
                "shoulderAbductionRight": {"min": 0, "max": 60},
                "hipRotationLeft": {"min": -10, "max": 20}
              },
              "pathologyIndicators": {
                "shoulder": {
                  "impingement": true,
                  "frozenShoulder": false
                },
                "spine": {
                  "kyphosis": 45,
                  "flexionLimitation": 30
                },
                "lowerLimb": {
                  "kneeFlexionContracture": 15,
                  "trendelenburg": true
                }
              },
              "gaitPattern": "antalgic favoring right",
              "posturalDeviations": ["forward head posture", "rounded shoulders"],
              "painLocations": ["anterior knee", "lower back L4-L5"],
              "limbScaling": {
                "leftLeg": 0.95
              },
              "confidence": 0.85,
              "extractedFindings": ["list of clinical findings found in transcript"]
            }`
          },
          {
            role: "user",
            content: `Extract clinical parameters from this transcript segment: "${transcript}"`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1000
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Merge with existing parameters (incremental updates)
      this.mergeParameters(result);
      
      return this.currentParameters;
    } catch (error) {
      console.error('Error analyzing transcript for virtual patient:', error);
      return this.currentParameters;
    }
  }

  private mergeParameters(updates: any): void {
    // Merge joint angles
    if (updates.jointAngles) {
      this.currentParameters.jointAngles = {
        ...this.currentParameters.jointAngles,
        ...updates.jointAngles
      };
    }

    // Merge movement restrictions
    if (updates.movementRestrictions) {
      this.currentParameters.movementRestrictions = {
        ...this.currentParameters.movementRestrictions,
        ...updates.movementRestrictions
      };
    }

    // Merge pathology indicators
    if (updates.pathologyIndicators) {
      if (updates.pathologyIndicators.shoulder) {
        this.currentParameters.pathologyIndicators.shoulder = {
          ...this.currentParameters.pathologyIndicators.shoulder,
          ...updates.pathologyIndicators.shoulder
        };
      }
      if (updates.pathologyIndicators.spine) {
        this.currentParameters.pathologyIndicators.spine = {
          ...this.currentParameters.pathologyIndicators.spine,
          ...updates.pathologyIndicators.spine
        };
      }
      if (updates.pathologyIndicators.lowerLimb) {
        this.currentParameters.pathologyIndicators.lowerLimb = {
          ...this.currentParameters.pathologyIndicators.lowerLimb,
          ...updates.pathologyIndicators.lowerLimb
        };
      }
    }

    // Update other fields
    if (updates.gaitPattern) {
      this.currentParameters.gaitPattern = updates.gaitPattern;
    }
    if (updates.posturalDeviations) {
      this.currentParameters.posturalDeviations = [
        ...(this.currentParameters.posturalDeviations || []),
        ...updates.posturalDeviations
      ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
    }
    if (updates.painLocations) {
      this.currentParameters.painLocations = [
        ...(this.currentParameters.painLocations || []),
        ...updates.painLocations
      ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
    }
    if (updates.limbScaling) {
      this.currentParameters.limbScaling = {
        ...this.currentParameters.limbScaling,
        ...updates.limbScaling
      };
    }
  }

  resetParameters(): void {
    this.currentParameters = {
      jointAngles: {},
      movementRestrictions: {},
      pathologyIndicators: {},
      limbScaling: {
        leftArm: 1.0,
        rightArm: 1.0,
        leftLeg: 1.0,
        rightLeg: 1.0
      }
    };
  }

  // Quick analysis for immediate visual feedback (no AI, just keyword extraction)
  quickAnalyzeTranscript(transcript: string): any {
    const lowerText = transcript.toLowerCase();
    const quickParams: any = {};
    
    // Pain keywords and locations - expanded list
    const painKeywords = ['pain', 'hurt', 'ache', 'sore', 'tender', 'sharp', 'dull', 'burning', 'throbbing', 'stiff', 'tight', 'discomfort'];
    const bodyParts = [
      'shoulder', 'neck', 'back', 'knee', 'hip', 'ankle', 'elbow', 'spine', 
      'lumbar', 'cervical', 'thoracic', 'wrist', 'hand', 'foot', 'heel',
      'calf', 'thigh', 'hamstring', 'quadriceps', 'glute', 'buttock', 'leg', 'arm'
    ];
    
    const painLocations: string[] = [];
    
    // More aggressive detection - check each body part
    bodyParts.forEach(part => {
      if (lowerText.includes(part)) {
        // Check if any pain keyword is in the transcript
        let hasPain = false;
        painKeywords.forEach(pain => {
          if (lowerText.includes(pain)) {
            const partIndex = lowerText.indexOf(part);
            const painIndex = lowerText.indexOf(pain);
            // Increase distance threshold to 100 characters
            if (Math.abs(partIndex - painIndex) < 100) {
              hasPain = true;
            }
          }
        });
        
        // Also check for common pain phrases
        if (hasPain || 
            lowerText.includes(`${part} pain`) ||
            lowerText.includes(`${part} hurts`) ||
            lowerText.includes(`painful ${part}`) ||
            lowerText.includes(`my ${part}`) ||
            lowerText.includes(`the ${part}`) ||
            lowerText.includes(`right ${part}`) ||
            lowerText.includes(`left ${part}`) ||
            lowerText.includes(`severe ${part}`) ||
            lowerText.includes(`patient has ${part}`) ||
            lowerText.includes(`patient presents with ${part}`)) {
          painLocations.push(part);
        }
      }
    });
    
    // Check for side-specific pain
    ['right', 'left'].forEach(side => {
      bodyParts.forEach(part => {
        if (lowerText.includes(`${side} ${part}`)) {
          painLocations.push(`${side} ${part}`);
        }
      });
    });
    
    // Remove duplicates and set painLocations
    if (painLocations.length > 0) {
      quickParams.painLocations = [...new Set(painLocations)];
      console.log('[RealtimeVirtualPatientService] Quick analysis detected pain locations:', quickParams.painLocations);
    }
    
    // Movement restrictions
    if (lowerText.includes('limited') || lowerText.includes('restricted') || lowerText.includes('reduced')) {
      quickParams.movementRestrictions = { detected: true };
    }
    
    // Posture issues
    if (lowerText.includes('slouch') || lowerText.includes('forward head') || lowerText.includes('kyphosis') || lowerText.includes('rounded')) {
      quickParams.posturalDeviations = ['forward posture detected'];
    }
    
    // Pathology detection
    quickParams.shoulderPathology = {};
    quickParams.spinalPathology = {};
    quickParams.lowerLimbPathology = {};
    
    if (lowerText.includes('impingement')) {
      quickParams.shoulderPathology.impingement = true;
    }
    if (lowerText.includes('frozen shoulder')) {
      quickParams.shoulderPathology.frozenShoulder = true;
    }
    if (lowerText.includes('rotator cuff')) {
      quickParams.shoulderPathology.rotatorCuffTear = true;
    }
    if (lowerText.includes('kyphosis')) {
      quickParams.spinalPathology.kyphosis = 45;
    }
    if (lowerText.includes('lordosis')) {
      quickParams.spinalPathology.lordosis = 40;
    }
    if (lowerText.includes('trendelenburg')) {
      quickParams.lowerLimbPathology.trendelenburg = true;
    }
    
    console.log('[RealtimeVirtualPatientService] Quick analysis result:', JSON.stringify(quickParams, null, 2));
    return quickParams;
  }

  getCurrentParameters(): ClinicalParameter {
    return this.currentParameters;
  }

  // Convert parameters to virtual patient model config format
  toModelConfig(): any {
    return {
      limbScales: this.currentParameters.limbScaling || {
        leftArm: 1.0,
        rightArm: 1.0,
        leftLeg: 1.0,
        rightLeg: 1.0
      },
      shoulderPathology: this.currentParameters.pathologyIndicators.shoulder || {},
      spinalPathology: this.currentParameters.pathologyIndicators.spine || {},
      lowerLimbPathology: this.currentParameters.pathologyIndicators.lowerLimb || {},
      jointAngles: this.currentParameters.jointAngles,
      movementRestrictions: this.currentParameters.movementRestrictions,
      gaitPattern: this.currentParameters.gaitPattern,
      posturalDeviations: this.currentParameters.posturalDeviations,
      painLocations: this.currentParameters.painLocations
    };
  }
}