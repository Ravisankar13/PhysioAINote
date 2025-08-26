/**
 * Clinical Movement Analysis Frameworks
 * Evidence-based assessment protocols without individual attribution
 */

export interface ClinicalPattern {
  id: string;
  name: string;
  indicators: string[];
  severity: 'mild' | 'moderate' | 'severe';
  confidence: number;
}

export interface AssessmentProtocol {
  id: string;
  name: string;
  description: string;
  bodyRegion: string;
  movements: string[];
  normalRanges: Record<string, { min: number; max: number }>;
  redFlags: string[];
}

export interface TreatmentPathway {
  id: string;
  condition: string;
  phase: number;
  exercises: string[];
  progressionCriteria: string[];
  regressionIndicators: string[];
}

export interface ClinicalFramework {
  id: string;
  name: string;
  type: 'shoulder' | 'hip' | 'spine' | 'knee' | 'ankle' | 'elbow' | 'tendinopathy' | 'sports' | 'comprehensive';
  description: string;
  evidenceLevel: 'systematic-review' | 'RCT' | 'expert-consensus' | 'clinical-guidelines';
  assessmentProtocols: AssessmentProtocol[];
  clinicalPatterns: ClinicalPattern[];
  treatmentPathways: TreatmentPathway[];
  references: string[];
}

// Advanced Shoulder Framework based on current evidence
export const shoulderFramework: ClinicalFramework = {
  id: 'SHOULDER_ADV_001',
  name: 'Advanced Shoulder Assessment Protocol',
  type: 'shoulder',
  description: 'Comprehensive shoulder evaluation based on systematic reviews and clinical practice guidelines',
  evidenceLevel: 'systematic-review',
  assessmentProtocols: [
    {
      id: 'scap_assess',
      name: 'Scapular Movement Analysis',
      description: 'Assessment of scapular kinematics and dyskinesis patterns',
      bodyRegion: 'shoulder',
      movements: ['arm_elevation', 'horizontal_abduction', 'external_rotation'],
      normalRanges: {
        'scapular_upward_rotation': { min: 45, max: 60 },
        'scapular_posterior_tilt': { min: 20, max: 30 },
        'glenohumeral_elevation': { min: 160, max: 180 }
      },
      redFlags: ['winging', 'excessive_elevation', 'dysrhythmia']
    },
    {
      id: 'rc_function',
      name: 'Rotator Cuff Function Test',
      description: 'Systematic assessment of rotator cuff integrity and function',
      bodyRegion: 'shoulder',
      movements: ['empty_can_position', 'external_rotation_resistance', 'internal_rotation_resistance'],
      normalRanges: {
        'external_rotation_strength': { min: 80, max: 100 },
        'internal_rotation_strength': { min: 80, max: 100 },
        'abduction_strength': { min: 80, max: 100 }
      },
      redFlags: ['pain_with_resistance', 'weakness', 'drop_arm_sign']
    }
  ],
  clinicalPatterns: [
    {
      id: 'pattern_impingement',
      name: 'Subacromial Pain Pattern',
      indicators: ['painful_arc', 'night_pain', 'overhead_limitation'],
      severity: 'moderate',
      confidence: 0
    },
    {
      id: 'pattern_instability',
      name: 'Glenohumeral Instability Pattern',
      indicators: ['apprehension', 'subluxation_feeling', 'dead_arm'],
      severity: 'moderate',
      confidence: 0
    }
  ],
  treatmentPathways: [
    {
      id: 'shoulder_rehab_phase1',
      condition: 'subacromial_pain',
      phase: 1,
      exercises: ['scapular_setting', 'isometric_rotation', 'pendulum_exercises'],
      progressionCriteria: ['pain_reduction', 'improved_scapular_control'],
      regressionIndicators: ['increased_pain', 'loss_of_control']
    }
  ],
  references: [
    'Current evidence-based shoulder rehabilitation guidelines 2020-2024',
    'Systematic review of scapular assessment techniques',
    'Clinical practice guidelines for rotator cuff management'
  ]
};

// Hip & Pelvis Framework based on lateral hip pain research
export const hipFramework: ClinicalFramework = {
  id: 'HIP_PELVIS_001',
  name: 'Hip Load Management System',
  type: 'hip',
  description: 'Evidence-based hip assessment focusing on load management and gluteal function',
  evidenceLevel: 'systematic-review',
  assessmentProtocols: [
    {
      id: 'single_leg_stance',
      name: 'Single Leg Stance Analysis',
      description: 'Assessment of hip stability and load tolerance',
      bodyRegion: 'hip',
      movements: ['single_leg_stand', 'single_leg_squat', 'step_down'],
      normalRanges: {
        'pelvic_drop': { min: -5, max: 5 },
        'hip_adduction': { min: -5, max: 10 },
        'trunk_lean': { min: -5, max: 5 }
      },
      redFlags: ['excessive_pelvic_drop', 'trendelenburg_sign', 'pain_reproduction']
    },
    {
      id: 'gluteal_function',
      name: 'Gluteal Function Assessment',
      description: 'Evaluation of gluteal strength and endurance',
      bodyRegion: 'hip',
      movements: ['side_lying_abduction', 'clamshell', 'bridge'],
      normalRanges: {
        'abduction_strength': { min: 80, max: 100 },
        'extension_strength': { min: 80, max: 100 },
        'endurance_time': { min: 30, max: 60 }
      },
      redFlags: ['early_fatigue', 'compensatory_patterns', 'pain_with_loading']
    }
  ],
  clinicalPatterns: [
    {
      id: 'lateral_hip_pain',
      name: 'Lateral Hip Pain Pattern',
      indicators: ['pain_with_side_lying', 'morning_stiffness', 'pain_with_stairs'],
      severity: 'moderate',
      confidence: 0
    },
    {
      id: 'gluteal_tendinopathy',
      name: 'Gluteal Tendinopathy Pattern',
      indicators: ['insertional_pain', 'load_related_pain', 'stretch_pain'],
      severity: 'moderate',
      confidence: 0
    }
  ],
  treatmentPathways: [
    {
      id: 'hip_load_phase1',
      condition: 'lateral_hip_pain',
      phase: 1,
      exercises: ['isometric_abduction', 'bridge_holds', 'standing_balance'],
      progressionCriteria: ['pain_free_isometric', 'improved_control'],
      regressionIndicators: ['night_pain_increase', 'loss_of_function']
    }
  ],
  references: [
    'International consensus on lateral hip pain management',
    'Systematic review of gluteal tendinopathy interventions',
    'Evidence-based hip rehabilitation protocols 2020-2024'
  ]
};

// Tendinopathy Framework based on current loading principles
export const tendinopathyFramework: ClinicalFramework = {
  id: 'TENDON_LOAD_001',
  name: 'Tendon Rehabilitation Framework',
  type: 'tendinopathy',
  description: 'Progressive loading protocols based on tendon mechanobiology research',
  evidenceLevel: 'systematic-review',
  assessmentProtocols: [
    {
      id: 'tendon_capacity',
      name: 'Tendon Load Capacity Test',
      description: 'Assessment of tendon tolerance to progressive loading',
      bodyRegion: 'multiple',
      movements: ['isometric_hold', 'eccentric_control', 'plyometric_test'],
      normalRanges: {
        'isometric_hold_time': { min: 45, max: 60 },
        'eccentric_control': { min: 80, max: 100 },
        'stretch_shortening_cycle': { min: 80, max: 100 }
      },
      redFlags: ['pain_during_loading', 'morning_stiffness_over_30min', 'progressive_weakness']
    },
    {
      id: 'pain_monitoring',
      name: 'Pain Response Assessment',
      description: 'Monitoring pain response to loading',
      bodyRegion: 'multiple',
      movements: ['pain_provocation_test', '24hr_pain_response', 'morning_stiffness'],
      normalRanges: {
        'pain_during_activity': { min: 0, max: 3 },
        'pain_after_activity': { min: 0, max: 3 },
        'morning_stiffness_minutes': { min: 0, max: 10 }
      },
      redFlags: ['pain_above_5', 'increasing_morning_stiffness', 'night_pain']
    }
  ],
  clinicalPatterns: [
    {
      id: 'reactive_tendinopathy',
      name: 'Reactive Tendinopathy',
      indicators: ['acute_onset', 'load_spike', 'diffuse_swelling'],
      severity: 'mild',
      confidence: 0
    },
    {
      id: 'degenerative_tendinopathy',
      name: 'Degenerative Tendinopathy',
      indicators: ['chronic_symptoms', 'thickening', 'focal_pain'],
      severity: 'moderate',
      confidence: 0
    }
  ],
  treatmentPathways: [
    {
      id: 'tendon_isometric',
      condition: 'reactive_tendinopathy',
      phase: 1,
      exercises: ['isometric_holds_5x45s', 'pain_free_range', 'load_modification'],
      progressionCriteria: ['pain_reduction', 'improved_morning_stiffness'],
      regressionIndicators: ['increased_irritability', 'night_pain']
    },
    {
      id: 'tendon_eccentric',
      condition: 'degenerative_tendinopathy',
      phase: 2,
      exercises: ['slow_eccentric_3x15', 'progressive_loading', 'heavy_slow_resistance'],
      progressionCriteria: ['pain_stable', 'strength_improvement'],
      regressionIndicators: ['reactive_response', 'loss_of_function']
    }
  ],
  references: [
    'International consensus on tendinopathy management',
    'Systematic review of tendon loading protocols',
    'Current concepts in tendon rehabilitation 2020-2024'
  ]
};

// Sports Performance Framework
export const sportsFramework: ClinicalFramework = {
  id: 'SPORTS_PERF_001',
  name: 'Sports Performance Analysis',
  type: 'sports',
  description: 'Athletic movement assessment and return-to-sport criteria',
  evidenceLevel: 'expert-consensus',
  assessmentProtocols: [
    {
      id: 'athletic_screen',
      name: 'Athletic Movement Screen',
      description: 'Comprehensive assessment of sport-specific movements',
      bodyRegion: 'whole_body',
      movements: ['jump_landing', 'cutting', 'acceleration', 'deceleration'],
      normalRanges: {
        'knee_valgus_angle': { min: -5, max: 5 },
        'landing_symmetry': { min: 90, max: 110 },
        'reactive_strength_index': { min: 1.5, max: 2.5 }
      },
      redFlags: ['dynamic_valgus', 'asymmetry_over_15%', 'poor_landing_control']
    },
    {
      id: 'rts_criteria',
      name: 'Return to Sport Assessment',
      description: 'Objective criteria for safe return to sport',
      bodyRegion: 'whole_body',
      movements: ['hop_tests', 'strength_testing', 'sport_specific_drills'],
      normalRanges: {
        'limb_symmetry_index': { min: 90, max: 110 },
        'psychological_readiness': { min: 80, max: 100 },
        'functional_performance': { min: 90, max: 100 }
      },
      redFlags: ['lsi_below_85%', 'fear_avoidance', 'compensatory_patterns']
    }
  ],
  clinicalPatterns: [
    {
      id: 'acl_risk_pattern',
      name: 'ACL Injury Risk Pattern',
      indicators: ['knee_valgus', 'hip_internal_rotation', 'poor_trunk_control'],
      severity: 'severe',
      confidence: 0
    },
    {
      id: 'overuse_risk',
      name: 'Overuse Injury Risk',
      indicators: ['training_load_spike', 'fatigue_patterns', 'technique_breakdown'],
      severity: 'moderate',
      confidence: 0
    }
  ],
  treatmentPathways: [
    {
      id: 'sports_injury_prevention',
      condition: 'injury_risk',
      phase: 1,
      exercises: ['neuromuscular_training', 'plyometric_progression', 'sport_specific_drills'],
      progressionCriteria: ['movement_quality', 'load_tolerance', 'confidence'],
      regressionIndicators: ['pain', 'fear', 'technique_breakdown']
    }
  ],
  references: [
    'International Olympic Committee consensus on injury prevention',
    'Systematic review of return-to-sport criteria',
    'Evidence-based sports injury prevention programs'
  ]
};

// Framework registry
export const clinicalFrameworks: ClinicalFramework[] = [
  shoulderFramework,
  hipFramework,
  tendinopathyFramework,
  sportsFramework
];

// Helper functions
export function getFrameworkById(id: string): ClinicalFramework | undefined {
  return clinicalFrameworks.find(f => f.id === id);
}

export function getFrameworksByType(type: ClinicalFramework['type']): ClinicalFramework[] {
  return clinicalFrameworks.filter(f => f.type === type);
}

export function getFrameworksByBodyRegion(region: string): ClinicalFramework[] {
  return clinicalFrameworks.filter(f => 
    f.assessmentProtocols.some(p => p.bodyRegion === region || p.bodyRegion === 'multiple' || p.bodyRegion === 'whole_body')
  );
}

// Pattern matching functions
export function analyzeMovementPatterns(
  landmarks: any[],
  framework: ClinicalFramework
): ClinicalPattern[] {
  const detectedPatterns: ClinicalPattern[] = [];
  
  // This would contain the actual pattern matching logic
  // For now, returning empty array as placeholder
  
  return detectedPatterns;
}

export function calculateConfidenceScore(
  pattern: ClinicalPattern,
  landmarks: any[]
): number {
  // Calculate confidence based on how many indicators are present
  // This would be more sophisticated in production
  return 0.85; // Placeholder
}

export function generateTreatmentRecommendations(
  patterns: ClinicalPattern[],
  framework: ClinicalFramework
): TreatmentPathway[] {
  const recommendations: TreatmentPathway[] = [];
  
  patterns.forEach(pattern => {
    const relevantPathways = framework.treatmentPathways.filter(
      pathway => pathway.condition === pattern.id || 
                 pathway.condition === pattern.name.toLowerCase().replace(/\s+/g, '_')
    );
    recommendations.push(...relevantPathways);
  });
  
  return recommendations;
}