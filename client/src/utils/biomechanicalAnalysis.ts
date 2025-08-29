// Biomechanical Analysis Module
// Core detection algorithms for movement dysfunctions

import { NormalizedLandmark } from '@mediapipe/pose';

export interface BiomechanicalMetrics {
  kneeValgus: {
    left: number;  // Angle in degrees
    right: number; // Angle in degrees
    severity: 'normal' | 'mild' | 'moderate' | 'severe';
    contributingFactors: string[];
  };
  hipDrop: {
    angle: number;
    side: 'left' | 'right' | 'bilateral' | 'none';
  };
  trunkLean: {
    angle: number;
    direction: 'forward' | 'backward' | 'neutral';
  };
  movementQuality: {
    score: number; // 0-100
    issues: string[];
  };
}

export interface TreatmentPlan {
  severity: string;
  primaryFocus: string;
  exercises: Exercise[];
  educationPoints: string[];
  progressionCriteria: string[];
  estimatedDuration: string;
}

export interface Exercise {
  name: string;
  category: 'strengthening' | 'mobility' | 'neuromuscular' | 'balance';
  targetMuscles: string[];
  sets: number;
  reps: string;
  frequency: string;
  instructions: string[];
  progressions: string[];
  videoUrl?: string;
}

export class BiomechanicalAnalyzer {
  private readonly VALGUS_THRESHOLD_MILD = 165; // degrees
  private readonly VALGUS_THRESHOLD_MODERATE = 160;
  private readonly VALGUS_THRESHOLD_SEVERE = 155;
  private readonly HIP_DROP_THRESHOLD = 5; // degrees
  private readonly TRUNK_LEAN_THRESHOLD = 10; // degrees

  // Main analysis function
  analyzePose(landmarks: NormalizedLandmark[]): BiomechanicalMetrics {
    const kneeValgus = this.detectKneeValgus(landmarks);
    const hipDrop = this.detectHipDrop(landmarks);
    const trunkLean = this.detectTrunkLean(landmarks);
    const movementQuality = this.calculateMovementQuality(kneeValgus, hipDrop, trunkLean);

    return {
      kneeValgus,
      hipDrop,
      trunkLean,
      movementQuality
    };
  }

  // Detect knee valgus (knee cave-in)
  private detectKneeValgus(landmarks: NormalizedLandmark[]): BiomechanicalMetrics['kneeValgus'] {
    // MediaPipe landmark indices
    const LEFT_HIP = 23;
    const RIGHT_HIP = 24;
    const LEFT_KNEE = 25;
    const RIGHT_KNEE = 26;
    const LEFT_ANKLE = 27;
    const RIGHT_ANKLE = 28;

    // Calculate left knee valgus angle
    const leftAngle = this.calculateFrontalPlaneAngle(
      landmarks[LEFT_HIP],
      landmarks[LEFT_KNEE],
      landmarks[LEFT_ANKLE]
    );

    // Calculate right knee valgus angle
    const rightAngle = this.calculateFrontalPlaneAngle(
      landmarks[RIGHT_HIP],
      landmarks[RIGHT_KNEE],
      landmarks[RIGHT_ANKLE]
    );

    // Determine severity
    const severity = this.classifyValgusSevertiy(Math.min(leftAngle, rightAngle));

    // Identify contributing factors
    const contributingFactors = this.identifyContributingFactors(landmarks, leftAngle, rightAngle);

    return {
      left: 180 - leftAngle, // Convert to valgus angle (deviation from straight)
      right: 180 - rightAngle,
      severity,
      contributingFactors
    };
  }

  // Calculate frontal plane projection angle (FPPA)
  private calculateFrontalPlaneAngle(
    hip: NormalizedLandmark,
    knee: NormalizedLandmark,
    ankle: NormalizedLandmark
  ): number {
    // Calculate vectors
    const hipToKnee = {
      x: knee.x - hip.x,
      y: knee.y - hip.y
    };

    const kneeToAnkle = {
      x: ankle.x - knee.x,
      y: ankle.y - knee.y
    };

    // Calculate angle between vectors
    const dotProduct = hipToKnee.x * kneeToAnkle.x + hipToKnee.y * kneeToAnkle.y;
    const magnitude1 = Math.sqrt(hipToKnee.x ** 2 + hipToKnee.y ** 2);
    const magnitude2 = Math.sqrt(kneeToAnkle.x ** 2 + kneeToAnkle.y ** 2);

    const cosAngle = dotProduct / (magnitude1 * magnitude2);
    const angleRadians = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    const angleDegrees = (angleRadians * 180) / Math.PI;

    return angleDegrees;
  }

  // Classify valgus severity
  private classifyValgusSevertiy(angle: number): 'normal' | 'mild' | 'moderate' | 'severe' {
    if (angle >= this.VALGUS_THRESHOLD_MILD) {
      return 'normal';
    } else if (angle >= this.VALGUS_THRESHOLD_MODERATE) {
      return 'mild';
    } else if (angle >= this.VALGUS_THRESHOLD_SEVERE) {
      return 'moderate';
    } else {
      return 'severe';
    }
  }

  // Identify contributing factors to knee valgus
  private identifyContributingFactors(
    landmarks: NormalizedLandmark[],
    leftAngle: number,
    rightAngle: number
  ): string[] {
    const factors: string[] = [];

    // Check for hip weakness (Trendelenburg sign)
    const hipDrop = this.detectHipDrop(landmarks);
    if (hipDrop.angle > this.HIP_DROP_THRESHOLD) {
      factors.push('Hip abductor weakness');
    }

    // Check for asymmetry
    const asymmetry = Math.abs(leftAngle - rightAngle);
    if (asymmetry > 5) {
      factors.push('Bilateral asymmetry');
    }

    // Check for ankle mobility issues (simplified check)
    const LEFT_ANKLE = 27;
    const RIGHT_ANKLE = 28;
    const LEFT_FOOT = 31;
    const RIGHT_FOOT = 32;

    const leftAnkleFlexion = this.calculateAnkleFlexion(
      landmarks[LEFT_ANKLE],
      landmarks[LEFT_FOOT]
    );
    const rightAnkleFlexion = this.calculateAnkleFlexion(
      landmarks[RIGHT_ANKLE],
      landmarks[RIGHT_FOOT]
    );

    if (leftAnkleFlexion < 10 || rightAnkleFlexion < 10) {
      factors.push('Limited ankle mobility');
    }

    // Check for core instability
    const trunkLean = this.detectTrunkLean(landmarks);
    if (Math.abs(trunkLean.angle) > this.TRUNK_LEAN_THRESHOLD) {
      factors.push('Core instability');
    }

    // Check for foot pronation (simplified)
    if (this.detectFootPronation(landmarks)) {
      factors.push('Excessive foot pronation');
    }

    return factors;
  }

  // Detect hip drop (Trendelenburg sign)
  private detectHipDrop(landmarks: NormalizedLandmark[]): BiomechanicalMetrics['hipDrop'] {
    const LEFT_HIP = 23;
    const RIGHT_HIP = 24;
    const LEFT_SHOULDER = 11;
    const RIGHT_SHOULDER = 12;

    // Calculate hip level difference
    const hipDifference = Math.abs(landmarks[LEFT_HIP].y - landmarks[RIGHT_HIP].y);
    const shoulderDifference = Math.abs(landmarks[LEFT_SHOULDER].y - landmarks[RIGHT_SHOULDER].y);

    // Compensate for shoulder tilt
    const adjustedHipDrop = hipDifference - shoulderDifference;
    const angle = Math.atan(adjustedHipDrop) * (180 / Math.PI);

    let side: 'left' | 'right' | 'bilateral' | 'none' = 'none';
    if (angle > this.HIP_DROP_THRESHOLD) {
      if (landmarks[LEFT_HIP].y > landmarks[RIGHT_HIP].y) {
        side = 'left';
      } else {
        side = 'right';
      }
    }

    return { angle, side };
  }

  // Detect trunk lean
  private detectTrunkLean(landmarks: NormalizedLandmark[]): BiomechanicalMetrics['trunkLean'] {
    const NOSE = 0;
    const LEFT_SHOULDER = 11;
    const RIGHT_SHOULDER = 12;
    const LEFT_HIP = 23;
    const RIGHT_HIP = 24;

    // Calculate midpoints
    const shoulderMidpoint = {
      x: (landmarks[LEFT_SHOULDER].x + landmarks[RIGHT_SHOULDER].x) / 2,
      y: (landmarks[LEFT_SHOULDER].y + landmarks[RIGHT_SHOULDER].y) / 2
    };

    const hipMidpoint = {
      x: (landmarks[LEFT_HIP].x + landmarks[RIGHT_HIP].x) / 2,
      y: (landmarks[LEFT_HIP].y + landmarks[RIGHT_HIP].y) / 2
    };

    // Calculate trunk angle
    const dx = shoulderMidpoint.x - hipMidpoint.x;
    const dy = shoulderMidpoint.y - hipMidpoint.y;
    const angle = Math.atan2(dx, dy) * (180 / Math.PI);

    let direction: 'forward' | 'backward' | 'neutral' = 'neutral';
    if (Math.abs(angle) > this.TRUNK_LEAN_THRESHOLD) {
      direction = angle > 0 ? 'forward' : 'backward';
    }

    return { angle: Math.abs(angle), direction };
  }

  // Calculate ankle flexion angle
  private calculateAnkleFlexion(ankle: NormalizedLandmark, foot: NormalizedLandmark): number {
    const dy = foot.y - ankle.y;
    const dx = foot.x - ankle.x;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return Math.abs(90 - Math.abs(angle));
  }

  // Detect foot pronation (simplified)
  private detectFootPronation(landmarks: NormalizedLandmark[]): boolean {
    const LEFT_HEEL = 29;
    const RIGHT_HEEL = 30;
    const LEFT_FOOT = 31;
    const RIGHT_FOOT = 32;

    // Check if foot landmarks are rotated inward
    const leftFootRotation = landmarks[LEFT_FOOT].x - landmarks[LEFT_HEEL].x;
    const rightFootRotation = landmarks[RIGHT_FOOT].x - landmarks[RIGHT_HEEL].x;

    return Math.abs(leftFootRotation) > 0.02 || Math.abs(rightFootRotation) > 0.02;
  }

  // Calculate overall movement quality score
  private calculateMovementQuality(
    kneeValgus: BiomechanicalMetrics['kneeValgus'],
    hipDrop: BiomechanicalMetrics['hipDrop'],
    trunkLean: BiomechanicalMetrics['trunkLean']
  ): BiomechanicalMetrics['movementQuality'] {
    let score = 100;
    const issues: string[] = [];

    // Deduct points for knee valgus
    switch (kneeValgus.severity) {
      case 'mild':
        score -= 15;
        issues.push('Mild knee valgus detected');
        break;
      case 'moderate':
        score -= 30;
        issues.push('Moderate knee valgus requires attention');
        break;
      case 'severe':
        score -= 45;
        issues.push('Severe knee valgus - high injury risk');
        break;
    }

    // Deduct points for hip drop
    if (hipDrop.angle > this.HIP_DROP_THRESHOLD) {
      score -= 15;
      issues.push(`Hip drop on ${hipDrop.side} side`);
    }

    // Deduct points for trunk lean
    if (Math.abs(trunkLean.angle) > this.TRUNK_LEAN_THRESHOLD) {
      score -= 10;
      issues.push(`Excessive trunk lean ${trunkLean.direction}`);
    }

    // Add contributing factors as issues
    if (kneeValgus.contributingFactors.length > 0) {
      score -= kneeValgus.contributingFactors.length * 5;
    }

    return {
      score: Math.max(0, score),
      issues
    };
  }

  // Generate treatment plan based on analysis
  generateTreatmentPlan(metrics: BiomechanicalMetrics): TreatmentPlan {
    const exercises: Exercise[] = [];
    const educationPoints: string[] = [];
    const progressionCriteria: string[] = [];

    // Determine primary focus based on severity
    let primaryFocus = 'Movement quality maintenance';
    let estimatedDuration = '2-4 weeks';

    if (metrics.kneeValgus.severity !== 'normal') {
      primaryFocus = 'Knee valgus correction';
      
      // Add exercises based on severity and contributing factors
      if (metrics.kneeValgus.severity === 'severe') {
        estimatedDuration = '8-12 weeks';
        exercises.push(...this.getSevereValgusExercises());
      } else if (metrics.kneeValgus.severity === 'moderate') {
        estimatedDuration = '6-8 weeks';
        exercises.push(...this.getModerateValgusExercises());
      } else {
        estimatedDuration = '4-6 weeks';
        exercises.push(...this.getMildValgusExercises());
      }

      // Add specific exercises for contributing factors
      if (metrics.kneeValgus.contributingFactors.includes('Hip abductor weakness')) {
        exercises.push(...this.getHipStrengtheningExercises());
      }
      if (metrics.kneeValgus.contributingFactors.includes('Limited ankle mobility')) {
        exercises.push(...this.getAnkleMobilityExercises());
      }
      if (metrics.kneeValgus.contributingFactors.includes('Core instability')) {
        exercises.push(...this.getCoreStabilityExercises());
      }

      // Add education points
      educationPoints.push(
        'Knee valgus increases risk of ACL injury by 2.5x',
        'Focus on pushing knees out during squats and lunges',
        'Strengthen glutes to improve knee control',
        'Maintain proper foot alignment during exercises'
      );

      // Add progression criteria
      progressionCriteria.push(
        'Reduce valgus angle by 5 degrees',
        'Complete single-leg squat without knee cave-in',
        'Maintain alignment during 10 jump landings',
        'Pass functional movement screen'
      );
    }

    return {
      severity: metrics.kneeValgus.severity,
      primaryFocus,
      exercises,
      educationPoints,
      progressionCriteria,
      estimatedDuration
    };
  }

  // Exercise database for different severity levels
  private getMildValgusExercises(): Exercise[] {
    return [
      {
        name: 'Clamshells',
        category: 'strengthening',
        targetMuscles: ['Gluteus medius', 'Hip external rotators'],
        sets: 3,
        reps: '15-20',
        frequency: 'Daily',
        instructions: [
          'Lie on your side with knees bent at 90 degrees',
          'Keep feet together',
          'Open top knee like a clamshell',
          'Hold for 2 seconds',
          'Slowly return to start'
        ],
        progressions: ['Add resistance band', 'Increase hold time', 'Progress to side-lying hip abduction']
      },
      {
        name: 'Mini-band Walks',
        category: 'neuromuscular',
        targetMuscles: ['Gluteus medius', 'Gluteus maximus'],
        sets: 3,
        reps: '10 steps each direction',
        frequency: 'Daily',
        instructions: [
          'Place band around ankles',
          'Maintain quarter squat position',
          'Step sideways maintaining tension',
          'Keep knees aligned over toes',
          'Avoid letting knees cave inward'
        ],
        progressions: ['Increase band resistance', 'Add forward/backward walks', 'Progress to monster walks']
      }
    ];
  }

  private getModerateValgusExercises(): Exercise[] {
    return [
      {
        name: 'Single-leg Glute Bridge',
        category: 'strengthening',
        targetMuscles: ['Gluteus maximus', 'Hamstrings', 'Core'],
        sets: 3,
        reps: '12-15 each leg',
        frequency: '3-4x per week',
        instructions: [
          'Lie on back with one knee bent',
          'Extend other leg straight',
          'Drive through heel to lift hips',
          'Keep hips level throughout',
          'Hold for 2 seconds at top'
        ],
        progressions: ['Add weight on hips', 'Elevate shoulders', 'Progress to single-leg hip thrust']
      },
      {
        name: 'Wall Sits with Ball Squeeze',
        category: 'strengthening',
        targetMuscles: ['Quadriceps', 'Adductors', 'Gluteus medius'],
        sets: 3,
        reps: '30-45 seconds',
        frequency: '3-4x per week',
        instructions: [
          'Back against wall in squat position',
          'Place ball between knees',
          'Squeeze ball while maintaining position',
          'Keep knees aligned over toes',
          'Breathe normally throughout'
        ],
        progressions: ['Increase hold time', 'Lower squat position', 'Add heel raises']
      },
      {
        name: 'Step-ups with Knee Control',
        category: 'neuromuscular',
        targetMuscles: ['Quadriceps', 'Gluteus maximus', 'Hip stabilizers'],
        sets: 3,
        reps: '10-12 each leg',
        frequency: '3x per week',
        instructions: [
          'Step onto 6-8 inch platform',
          'Focus on keeping knee over 2nd toe',
          'Drive through heel to stand',
          'Control descent slowly',
          'Avoid letting knee drift inward'
        ],
        progressions: ['Increase step height', 'Add weight', 'Progress to lateral step-ups']
      }
    ];
  }

  private getSevereValgusExercises(): Exercise[] {
    return [
      {
        name: 'Assisted Squats with Band',
        category: 'neuromuscular',
        targetMuscles: ['Quadriceps', 'Gluteus maximus', 'Hip abductors'],
        sets: 4,
        reps: '8-10',
        frequency: '2-3x per week',
        instructions: [
          'Place band around knees',
          'Hold onto stable support',
          'Squat slowly pushing knees against band',
          'Focus on proper alignment',
          'Use mirror for visual feedback'
        ],
        progressions: ['Reduce assistance', 'Increase depth', 'Progress to free squats']
      },
      {
        name: 'Single-leg Stand with Perturbations',
        category: 'balance',
        targetMuscles: ['Hip stabilizers', 'Core', 'Ankle stabilizers'],
        sets: 3,
        reps: '30-60 seconds each leg',
        frequency: 'Daily',
        instructions: [
          'Stand on one leg',
          'Partner provides gentle pushes',
          'Maintain balance and knee alignment',
          'Keep knee slightly bent',
          'Focus on hip and core control'
        ],
        progressions: ['Close eyes', 'Stand on unstable surface', 'Add arm movements']
      },
      {
        name: 'Eccentric Single-leg Squats',
        category: 'strengthening',
        targetMuscles: ['Quadriceps', 'Gluteus maximus', 'Hip stabilizers'],
        sets: 3,
        reps: '6-8 each leg',
        frequency: '2x per week',
        instructions: [
          'Stand on one leg on platform',
          'Slowly lower into squat (5 seconds)',
          'Use both legs to return to start',
          'Focus on knee control during descent',
          'Stop if knee caves inward'
        ],
        progressions: ['Increase descent time', 'Add weight', 'Progress to full single-leg squat']
      }
    ];
  }

  private getHipStrengtheningExercises(): Exercise[] {
    return [
      {
        name: 'Side-lying Hip Abduction',
        category: 'strengthening',
        targetMuscles: ['Gluteus medius', 'Tensor fasciae latae'],
        sets: 3,
        reps: '15-20 each side',
        frequency: 'Daily',
        instructions: [
          'Lie on side with bottom knee bent',
          'Keep top leg straight',
          'Lift top leg up and slightly back',
          'Hold for 2 seconds',
          'Lower with control'
        ],
        progressions: ['Add ankle weight', 'Increase hold time', 'Progress to standing hip abduction']
      }
    ];
  }

  private getAnkleMobilityExercises(): Exercise[] {
    return [
      {
        name: 'Wall Ankle Mobilization',
        category: 'mobility',
        targetMuscles: ['Gastrocnemius', 'Soleus', 'Ankle joint'],
        sets: 3,
        reps: '15-20 each ankle',
        frequency: 'Daily',
        instructions: [
          'Face wall in lunge position',
          'Keep heel down',
          'Drive knee toward wall',
          'Hold end range for 2 seconds',
          'Return to start'
        ],
        progressions: ['Move foot further from wall', 'Add rotation', 'Progress to loaded mobilization']
      }
    ];
  }

  private getCoreStabilityExercises(): Exercise[] {
    return [
      {
        name: 'Dead Bug',
        category: 'strengthening',
        targetMuscles: ['Transverse abdominis', 'Rectus abdominis', 'Hip flexors'],
        sets: 3,
        reps: '10-12 each side',
        frequency: '3-4x per week',
        instructions: [
          'Lie on back with arms up',
          'Knees bent at 90 degrees',
          'Lower opposite arm and leg',
          'Keep lower back pressed to floor',
          'Return to start with control'
        ],
        progressions: ['Slow down movement', 'Add resistance band', 'Progress to bird dog']
      }
    ];
  }
}

export const biomechanicalAnalyzer = new BiomechanicalAnalyzer();