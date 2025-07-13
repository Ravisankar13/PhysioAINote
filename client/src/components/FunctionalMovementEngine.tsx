import * as THREE from 'three';

export interface MovementPhase {
  name: string;
  duration: number; // in frames
  positions: {
    [bodyPart: string]: {
      position?: [number, number, number];
      rotation?: [number, number, number];
    };
  };
}

export interface FunctionalMovement {
  name: string;
  phases: MovementPhase[];
  totalFrames: number;
  description: string;
}

export interface ConditionModification {
  bodyPart: string;
  limitationType: 'range' | 'compensation' | 'pain_response';
  severity: number; // 0-1
  description: string;
  modifications: {
    [phaseName: string]: {
      positionAdjustment?: [number, number, number];
      rotationAdjustment?: [number, number, number];
      compensatoryMovement?: string;
    };
  };
}

// Pre-defined functional movement templates
export const FUNCTIONAL_MOVEMENT_TEMPLATES: { [key: string]: FunctionalMovement } = {
  squat: {
    name: "Squat",
    description: "Full body squat with proper kinematic chain",
    totalFrames: 80,
    phases: [
      {
        name: "standing",
        duration: 10,
        positions: {
          hip: { position: [0, 0.78, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.1, 0.3, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.1, 0.3, 0], rotation: [0, 0, 0] },
          chest: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          head: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftUpperArm: { position: [-0.25, 1.05, 0], rotation: [0, 0, 0] },
          rightUpperArm: { position: [0.25, 1.05, 0], rotation: [0, 0, 0] }
        }
      },
      {
        name: "descent",
        duration: 25,
        positions: {
          hip: { position: [0, 0.6, -0.1], rotation: [0.5, 0, 0] },
          leftKnee: { position: [-0.1, 0.2, 0.1], rotation: [1.2, 0, 0] },
          rightKnee: { position: [0.1, 0.2, 0.1], rotation: [1.2, 0, 0] },
          chest: { position: [0, 1.0, -0.05], rotation: [0.2, 0, 0] },
          head: { position: [0, 1.45, -0.05], rotation: [0.1, 0, 0] },
          leftUpperArm: { position: [-0.2, 0.9, 0.2], rotation: [0, 0, 0.3] },
          rightUpperArm: { position: [0.2, 0.9, 0.2], rotation: [0, 0, -0.3] }
        }
      },
      {
        name: "bottom",
        duration: 10,
        positions: {
          hip: { position: [0, 0.45, -0.15], rotation: [0.8, 0, 0] },
          leftKnee: { position: [-0.1, 0.15, 0.15], rotation: [1.6, 0, 0] },
          rightKnee: { position: [0.1, 0.15, 0.15], rotation: [1.6, 0, 0] },
          chest: { position: [0, 0.85, -0.1], rotation: [0.3, 0, 0] },
          head: { position: [0, 1.3, -0.1], rotation: [0.2, 0, 0] },
          leftUpperArm: { position: [-0.15, 0.8, 0.3], rotation: [0, 0, 0.5] },
          rightUpperArm: { position: [0.15, 0.8, 0.3], rotation: [0, 0, -0.5] }
        }
      },
      {
        name: "ascent",
        duration: 25,
        positions: {
          hip: { position: [0, 0.6, -0.1], rotation: [0.5, 0, 0] },
          leftKnee: { position: [-0.1, 0.2, 0.1], rotation: [1.2, 0, 0] },
          rightKnee: { position: [0.1, 0.2, 0.1], rotation: [1.2, 0, 0] },
          chest: { position: [0, 1.0, -0.05], rotation: [0.2, 0, 0] },
          head: { position: [0, 1.45, -0.05], rotation: [0.1, 0, 0] },
          leftUpperArm: { position: [-0.2, 0.9, 0.2], rotation: [0, 0, 0.3] },
          rightUpperArm: { position: [0.2, 0.9, 0.2], rotation: [0, 0, -0.3] }
        }
      },
      {
        name: "standing_end",
        duration: 10,
        positions: {
          hip: { position: [0, 0.78, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.1, 0.3, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.1, 0.3, 0], rotation: [0, 0, 0] },
          chest: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          head: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftUpperArm: { position: [-0.25, 1.05, 0], rotation: [0, 0, 0] },
          rightUpperArm: { position: [0.25, 1.05, 0], rotation: [0, 0, 0] }
        }
      }
    ]
  },

  lunge: {
    name: "Forward Lunge",
    description: "Step forward into lunge position and return",
    totalFrames: 80,
    phases: [
      {
        name: "standing",
        duration: 10,
        positions: {
          hip: { position: [0, 0.78, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.1, 0.3, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.1, 0.3, 0], rotation: [0, 0, 0] },
          chest: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.1, 0.55, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.1, 0.55, 0], rotation: [0, 0, 0] }
        }
      },
      {
        name: "step_forward",
        duration: 20,
        positions: {
          hip: { position: [0, 0.78, 0.1], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.1, 0.3, 0.3], rotation: [0, 0, 0] },
          rightKnee: { position: [0.1, 0.3, -0.1], rotation: [0, 0, 0] },
          chest: { position: [0, 1.2, 0.05], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.1, 0.55, 0.2], rotation: [-0.3, 0, 0] },
          rightThigh: { position: [0.1, 0.55, -0.05], rotation: [0.1, 0, 0] }
        }
      },
      {
        name: "lunge_down",
        duration: 15,
        positions: {
          hip: { position: [0, 0.6, 0.1], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.1, 0.15, 0.3], rotation: [1.4, 0, 0] },
          rightKnee: { position: [0.1, 0.15, -0.1], rotation: [1.6, 0, 0] },
          chest: { position: [0, 1.0, 0.05], rotation: [0.1, 0, 0] },
          leftThigh: { position: [-0.1, 0.4, 0.2], rotation: [-0.6, 0, 0] },
          rightThigh: { position: [0.1, 0.4, -0.05], rotation: [0.8, 0, 0] }
        }
      },
      {
        name: "push_back",
        duration: 20,
        positions: {
          hip: { position: [0, 0.78, 0.05], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.1, 0.25, 0.1], rotation: [0.3, 0, 0] },
          rightKnee: { position: [0.1, 0.25, -0.05], rotation: [0.3, 0, 0] },
          chest: { position: [0, 1.15, 0.02], rotation: [0.05, 0, 0] },
          leftThigh: { position: [-0.1, 0.5, 0.05], rotation: [-0.15, 0, 0] },
          rightThigh: { position: [0.1, 0.5, -0.02], rotation: [0.15, 0, 0] }
        }
      },
      {
        name: "standing_end",
        duration: 15,
        positions: {
          hip: { position: [0, 0.78, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.1, 0.3, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.1, 0.3, 0], rotation: [0, 0, 0] },
          chest: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.1, 0.55, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.1, 0.55, 0], rotation: [0, 0, 0] }
        }
      }
    ]
  },

  overhead_reach: {
    name: "Overhead Reach",
    description: "Reaching overhead with shoulder elevation",
    totalFrames: 60,
    phases: [
      {
        name: "neutral",
        duration: 10,
        positions: {
          leftUpperArm: { position: [-0.25, 1.05, 0], rotation: [0, 0, 0] },
          rightUpperArm: { position: [0.25, 1.05, 0], rotation: [0, 0, 0] },
          leftForearm: { position: [-0.25, 0.75, 0], rotation: [0, 0, 0] },
          rightForearm: { position: [0.25, 0.75, 0], rotation: [0, 0, 0] },
          chest: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          head: { position: [0, 1.65, 0], rotation: [0, 0, 0] }
        }
      },
      {
        name: "reaching_up",
        duration: 25,
        positions: {
          leftUpperArm: { position: [-0.25, 1.3, 0], rotation: [0, 0, 2.8] },
          rightUpperArm: { position: [0.25, 1.3, 0], rotation: [0, 0, -2.8] },
          leftForearm: { position: [-0.25, 1.55, 0], rotation: [0, 0, 0] },
          rightForearm: { position: [0.25, 1.55, 0], rotation: [0, 0, 0] },
          chest: { position: [0, 1.25, 0], rotation: [-0.1, 0, 0] },
          head: { position: [0, 1.7, 0], rotation: [-0.1, 0, 0] }
        }
      },
      {
        name: "hold",
        duration: 10,
        positions: {
          leftUpperArm: { position: [-0.25, 1.3, 0], rotation: [0, 0, 2.8] },
          rightUpperArm: { position: [0.25, 1.3, 0], rotation: [0, 0, -2.8] },
          leftForearm: { position: [-0.25, 1.55, 0], rotation: [0, 0, 0] },
          rightForearm: { position: [0.25, 1.55, 0], rotation: [0, 0, 0] },
          chest: { position: [0, 1.25, 0], rotation: [-0.1, 0, 0] },
          head: { position: [0, 1.7, 0], rotation: [-0.1, 0, 0] }
        }
      },
      {
        name: "lowering",
        duration: 15,
        positions: {
          leftUpperArm: { position: [-0.25, 1.05, 0], rotation: [0, 0, 0] },
          rightUpperArm: { position: [0.25, 1.05, 0], rotation: [0, 0, 0] },
          leftForearm: { position: [-0.25, 0.75, 0], rotation: [0, 0, 0] },
          rightForearm: { position: [0.25, 0.75, 0], rotation: [0, 0, 0] },
          chest: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          head: { position: [0, 1.65, 0], rotation: [0, 0, 0] }
        }
      }
    ]
  },

  walking_gait: {
    name: "Walking Gait",
    description: "Natural walking pattern with alternating steps",
    totalFrames: 100,
    phases: [
      {
        name: "left_heel_strike",
        duration: 12,
        positions: {
          leftThigh: { position: [-0.1, 0.55, 0.1], rotation: [-0.2, 0, 0] },
          rightThigh: { position: [0.1, 0.55, -0.1], rotation: [0.2, 0, 0] },
          leftKnee: { position: [-0.1, 0.3, 0.1], rotation: [0.1, 0, 0] },
          rightKnee: { position: [0.1, 0.3, -0.1], rotation: [0.3, 0, 0] },
          hip: { position: [0, 0.78, 0], rotation: [0, 0.1, 0] },
          chest: { position: [0, 1.2, 0], rotation: [0, -0.05, 0] },
          leftUpperArm: { position: [-0.25, 1.05, 0], rotation: [0.3, 0, 0] },
          rightUpperArm: { position: [0.25, 1.05, 0], rotation: [-0.3, 0, 0] }
        }
      },
      {
        name: "left_stance",
        duration: 25,
        positions: {
          leftThigh: { position: [-0.1, 0.55, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.1, 0.55, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.1, 0.3, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.1, 0.3, 0], rotation: [0, 0, 0] },
          hip: { position: [0, 0.78, 0], rotation: [0, 0, 0] },
          chest: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          leftUpperArm: { position: [-0.25, 1.05, 0], rotation: [0, 0, 0] },
          rightUpperArm: { position: [0.25, 1.05, 0], rotation: [0, 0, 0] }
        }
      },
      {
        name: "right_heel_strike",
        duration: 12,
        positions: {
          leftThigh: { position: [-0.1, 0.55, -0.1], rotation: [0.2, 0, 0] },
          rightThigh: { position: [0.1, 0.55, 0.1], rotation: [-0.2, 0, 0] },
          leftKnee: { position: [-0.1, 0.3, -0.1], rotation: [0.3, 0, 0] },
          rightKnee: { position: [0.1, 0.3, 0.1], rotation: [0.1, 0, 0] },
          hip: { position: [0, 0.78, 0], rotation: [0, -0.1, 0] },
          chest: { position: [0, 1.2, 0], rotation: [0, 0.05, 0] },
          leftUpperArm: { position: [-0.25, 1.05, 0], rotation: [-0.3, 0, 0] },
          rightUpperArm: { position: [0.25, 1.05, 0], rotation: [0.3, 0, 0] }
        }
      },
      {
        name: "right_stance",
        duration: 25,
        positions: {
          leftThigh: { position: [-0.1, 0.55, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.1, 0.55, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.1, 0.3, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.1, 0.3, 0], rotation: [0, 0, 0] },
          hip: { position: [0, 0.78, 0], rotation: [0, 0, 0] },
          chest: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          leftUpperArm: { position: [-0.25, 1.05, 0], rotation: [0, 0, 0] },
          rightUpperArm: { position: [0.25, 1.05, 0], rotation: [0, 0, 0] }
        }
      },
      {
        name: "cycle_repeat",
        duration: 26,
        positions: {
          leftThigh: { position: [-0.1, 0.55, 0.1], rotation: [-0.2, 0, 0] },
          rightThigh: { position: [0.1, 0.55, -0.1], rotation: [0.2, 0, 0] },
          leftKnee: { position: [-0.1, 0.3, 0.1], rotation: [0.1, 0, 0] },
          rightKnee: { position: [0.1, 0.3, -0.1], rotation: [0.3, 0, 0] },
          hip: { position: [0, 0.78, 0], rotation: [0, 0.1, 0] },
          chest: { position: [0, 1.2, 0], rotation: [0, -0.05, 0] },
          leftUpperArm: { position: [-0.25, 1.05, 0], rotation: [0.3, 0, 0] },
          rightUpperArm: { position: [0.25, 1.05, 0], rotation: [-0.3, 0, 0] }
        }
      }
    ]
  }
};

// Condition-specific modifications
export const CONDITION_MODIFICATIONS: { [condition: string]: ConditionModification[] } = {
  shoulder_pain: [
    {
      bodyPart: "shoulder",
      limitationType: "range",
      severity: 0.7,
      description: "Limited shoulder elevation and restricted overhead reach",
      modifications: {
        reaching_up: {
          rotationAdjustment: [0, 0, -0.8], // Reduce elevation by 80%
          compensatoryMovement: "trunk_side_bend"
        },
        hold: {
          rotationAdjustment: [0, 0, -0.8],
          positionAdjustment: [0, -0.1, 0]
        }
      }
    }
  ],
  knee_pain: [
    {
      bodyPart: "knee",
      limitationType: "range",
      severity: 0.6,
      description: "Reduced knee flexion and altered weight bearing",
      modifications: {
        descent: {
          rotationAdjustment: [0, 0, 0], // Reduce knee bend
          positionAdjustment: [0, 0.1, 0] // Higher squat position
        },
        bottom: {
          rotationAdjustment: [0, 0, 0],
          positionAdjustment: [0, 0.15, 0]
        }
      }
    }
  ],
  back_pain: [
    {
      bodyPart: "spine",
      limitationType: "range",
      severity: 0.5,
      description: "Limited spinal flexion and altered hip hinge pattern",
      modifications: {
        descent: {
          rotationAdjustment: [-0.2, 0, 0], // Reduce forward lean
          compensatoryMovement: "increased_knee_bend"
        },
        bottom: {
          rotationAdjustment: [-0.2, 0, 0],
          positionAdjustment: [0, 0.1, 0]
        }
      }
    }
  ]
};

export class FunctionalMovementEngine {
  static generateMovementFrames(
    movementType: string, 
    condition?: string
  ): Array<{ timestamp: number; landmarks: Array<{ x: number; y: number; z: number; visibility: number }> }> {
    const template = FUNCTIONAL_MOVEMENT_TEMPLATES[movementType];
    if (!template) {
      console.error(`Movement template not found: ${movementType}`);
      return [];
    }

    const frames: Array<{ timestamp: number; landmarks: Array<{ x: number; y: number; z: number; visibility: number }> }> = [];
    const modifications = condition ? CONDITION_MODIFICATIONS[condition] || [] : [];

    let currentFrame = 0;
    
    template.phases.forEach((phase, phaseIndex) => {
      for (let frameInPhase = 0; frameInPhase < phase.duration; frameInPhase++) {
        const progress = frameInPhase / phase.duration;
        const nextPhase = template.phases[phaseIndex + 1] || template.phases[0];
        
        // Create 33 landmarks (MediaPipe pose standard)
        const landmarks = new Array(33).fill(null).map((_, i) => ({
          x: 0,
          y: 0,
          z: 0,
          visibility: 1
        }));

        // Apply movement positions with smooth interpolation
        Object.entries(phase.positions).forEach(([bodyPart, transform]) => {
          const landmarkIndex = this.getBodyPartLandmarkIndex(bodyPart);
          if (landmarkIndex >= 0 && landmarkIndex < landmarks.length) {
            let position = transform.position || [0, 0, 0];
            let rotation = transform.rotation || [0, 0, 0];

            // Apply condition modifications
            modifications.forEach(mod => {
              if (mod.modifications[phase.name]) {
                const modData = mod.modifications[phase.name];
                if (modData.positionAdjustment) {
                  position = position.map((val, idx) => 
                    val + (modData.positionAdjustment![idx] * mod.severity)
                  ) as [number, number, number];
                }
                if (modData.rotationAdjustment) {
                  rotation = rotation.map((val, idx) => 
                    val + (modData.rotationAdjustment![idx] * mod.severity)
                  ) as [number, number, number];
                }
              }
            });

            // Smooth interpolation to next phase
            if (frameInPhase > phase.duration * 0.7 && nextPhase.positions[bodyPart]) {
              const nextPosition = nextPhase.positions[bodyPart].position || [0, 0, 0];
              const nextRotation = nextPhase.positions[bodyPart].rotation || [0, 0, 0];
              const blendFactor = (frameInPhase - phase.duration * 0.7) / (phase.duration * 0.3);
              
              position = position.map((val, idx) => 
                val + (nextPosition[idx] - val) * blendFactor
              ) as [number, number, number];
              
              rotation = rotation.map((val, idx) => 
                val + (nextRotation[idx] - val) * blendFactor
              ) as [number, number, number];
            }

            landmarks[landmarkIndex] = {
              x: position[0],
              y: position[1], 
              z: position[2],
              visibility: 1
            };
          }
        });

        frames.push({
          timestamp: currentFrame * 33, // ~30 FPS timing
          landmarks
        });

        currentFrame++;
      }
    });

    console.log(`Generated ${frames.length} frames for ${movementType} movement`);
    return frames;
  }

  private static getBodyPartLandmarkIndex(bodyPart: string): number {
    const landmarkMap: { [key: string]: number } = {
      'head': 0,
      'leftShoulder': 11,
      'rightShoulder': 12,
      'leftUpperArm': 11,
      'rightUpperArm': 12,
      'leftForearm': 13,
      'rightForearm': 14,
      'chest': 11, // Use shoulder midpoint
      'hip': 23, // Use left hip as center
      'leftHip': 23,
      'rightHip': 24,
      'leftThigh': 23,
      'rightThigh': 24,
      'leftKnee': 25,
      'rightKnee': 26,
      'leftShin': 25,
      'rightShin': 26,
      'leftAnkle': 27,
      'rightAnkle': 28
    };

    return landmarkMap[bodyPart] || -1;
  }
}