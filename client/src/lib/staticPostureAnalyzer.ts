import type { JointConstraint, JointType, MovementType } from './jointConstraints';
import { NORMAL_ROM } from './jointConstraints';
import type { 
  MovementPattern, 
  ROMAnalysis, 
  AsymmetryAnalysis, 
  CompensationPattern, 
  MovementAnalysisResult 
} from './movementPatternRecognition';

export interface ModelConfig {
  spine: {
    lordosis: number;
    kyphosis: number;
    scoliosis: number;
    cervicalFlexion: number;
    cervicalLateralFlexion: number;
  };
  pelvis: {
    tilt: number;
    obliquity: number;
    rotation: number;
  };
  leftHip: {
    flexion: number;
    abduction: number;
    internalRotation: number;
    anteversion: number;
    neckShaftAngle: number;
  };
  rightHip: {
    flexion: number;
    abduction: number;
    internalRotation: number;
    anteversion: number;
    neckShaftAngle: number;
  };
  leftKnee: {
    valgus: number;
    recurvatum: number;
    tibialTorsion: number;
    tibialSlope: number;
  };
  rightKnee: {
    valgus: number;
    recurvatum: number;
    tibialTorsion: number;
    tibialSlope: number;
  };
  leftAnkle: {
    dorsiflexion: number;
    plantarflexion: number;
    eversion: number;
    archHeight: number;
  };
  rightAnkle: {
    dorsiflexion: number;
    plantarflexion: number;
    eversion: number;
    archHeight: number;
  };
  leftShoulder?: {
    flexion?: number;
    abduction?: number;
    externalRotation?: number;
  };
  rightShoulder?: {
    flexion?: number;
    abduction?: number;
    externalRotation?: number;
  };
}

export interface StaticPostureInput {
  modelConfig: Partial<ModelConfig>;
  jointConstraints: JointConstraint[];
}

const SCOLIOSIS_THRESHOLDS = {
  mild: 10,
  moderate: 25,
  severe: 40,
};

const PELVIC_TILT_THRESHOLDS = {
  mild: 5,
  moderate: 10,
  severe: 15,
};

const ANTEVERSION_THRESHOLDS = {
  mild: 5,
  moderate: 10,
  severe: 20,
};

export class StaticPostureAnalyzer {
  analyze(input: StaticPostureInput): MovementAnalysisResult {
    const { modelConfig, jointConstraints } = input;
    
    const patterns: MovementPattern[] = [];
    const romAnalysis: ROMAnalysis[] = [];
    const asymmetries: AsymmetryAnalysis[] = [];
    const compensations: CompensationPattern[] = [];
    const primaryImpairments: string[] = [];
    const clinicalHypotheses: string[] = [];
    const recommendedFocus: string[] = [];

    this.analyzeSpinePosture(modelConfig, patterns, primaryImpairments, clinicalHypotheses, recommendedFocus);
    this.analyzePelvisPosture(modelConfig, patterns, primaryImpairments, clinicalHypotheses, compensations);
    this.analyzeHipPosture(modelConfig, patterns, asymmetries, primaryImpairments, clinicalHypotheses, recommendedFocus);
    this.analyzeKneePosture(modelConfig, patterns, asymmetries, primaryImpairments, clinicalHypotheses);
    this.analyzeAnklePosture(modelConfig, patterns, asymmetries, primaryImpairments);
    this.analyzeJointConstraints(jointConstraints, romAnalysis, patterns, primaryImpairments, clinicalHypotheses, recommendedFocus);
    this.detectCompensationPatterns(modelConfig, jointConstraints, compensations);

    const qualityScore = this.calculateQualityScore(patterns, romAnalysis, asymmetries, compensations);

    if (primaryImpairments.length === 0) {
      primaryImpairments.push('No significant postural deviations detected');
    }

    if (clinicalHypotheses.length === 0) {
      clinicalHypotheses.push('Static posture within normal limits');
    }

    if (recommendedFocus.length === 0) {
      recommendedFocus.push('General postural awareness and maintenance');
    }

    return {
      patterns,
      romAnalysis,
      asymmetries,
      compensations,
      overallMovementQuality: qualityScore,
      primaryImpairments,
      clinicalHypotheses,
      recommendedFocus,
    };
  }

  private analyzeSpinePosture(
    modelConfig: Partial<ModelConfig>,
    patterns: MovementPattern[],
    primaryImpairments: string[],
    clinicalHypotheses: string[],
    recommendedFocus: string[]
  ): void {
    const spine = modelConfig.spine;
    if (!spine) return;

    if (Math.abs(spine.scoliosis) >= SCOLIOSIS_THRESHOLDS.mild) {
      const severity = Math.abs(spine.scoliosis) >= SCOLIOSIS_THRESHOLDS.severe ? 'severe' 
        : Math.abs(spine.scoliosis) >= SCOLIOSIS_THRESHOLDS.moderate ? 'moderate' : 'mild';
      const direction = spine.scoliosis > 0 ? 'right' : 'left';
      
      patterns.push({
        id: 'scoliosis',
        name: `${severity.charAt(0).toUpperCase() + severity.slice(1)} Scoliosis`,
        description: `Lateral spinal curvature of ${Math.abs(spine.scoliosis).toFixed(1)}° convex to the ${direction}`,
        severity,
        clinicalImplication: 'May cause asymmetric loading, muscle imbalances, and functional limitations',
        relatedConditions: ['Idiopathic scoliosis', 'Functional scoliosis', 'Degenerative scoliosis', 'Muscle imbalance'],
        affectedRegion: 'spine',
      });
      primaryImpairments.push(`Scoliotic curve ${Math.abs(spine.scoliosis).toFixed(0)}° ${direction}`);
      clinicalHypotheses.push('Spinal asymmetry requiring postural correction strategies');
      recommendedFocus.push('Core stabilization and spinal mobility exercises');
    }

    if (spine.kyphosis > 45) {
      const severity = spine.kyphosis > 60 ? 'severe' : spine.kyphosis > 50 ? 'moderate' : 'mild';
      patterns.push({
        id: 'hyperkyphosis',
        name: 'Thoracic Hyperkyphosis',
        description: `Increased thoracic kyphosis of ${spine.kyphosis.toFixed(1)}° (normal 20-45°)`,
        severity,
        clinicalImplication: 'Associated with forward head posture, shoulder dysfunction, and respiratory limitations',
        relatedConditions: ['Scheuermann\'s disease', 'Osteoporosis', 'Postural kyphosis', 'Upper crossed syndrome'],
        affectedRegion: 'thoracic',
      });
      primaryImpairments.push('Thoracic hyperkyphosis');
      clinicalHypotheses.push('Consider thoracic mobility and extension exercises');
    }

    if (spine.lordosis > 50 || spine.lordosis < 30) {
      const isHyper = spine.lordosis > 50;
      const severity = isHyper ? (spine.lordosis > 60 ? 'severe' : 'moderate') : (spine.lordosis < 20 ? 'severe' : 'moderate');
      patterns.push({
        id: isHyper ? 'hyperlordosis' : 'hypolordosis',
        name: isHyper ? 'Lumbar Hyperlordosis' : 'Lumbar Hypolordosis',
        description: `${isHyper ? 'Increased' : 'Decreased'} lumbar lordosis of ${spine.lordosis.toFixed(1)}° (normal 30-50°)`,
        severity,
        clinicalImplication: isHyper 
          ? 'May cause facet joint loading, stenosis, and hip flexor tightness'
          : 'May indicate disc pathology, hip flexor weakness, or protective posturing',
        relatedConditions: isHyper 
          ? ['Hip flexor tightness', 'Weak abdominals', 'Spondylolisthesis', 'Facet syndrome']
          : ['Disc pathology', 'Flexion intolerance', 'Posterior pelvic tilt'],
        affectedRegion: 'lumbar',
      });
      primaryImpairments.push(isHyper ? 'Lumbar hyperlordosis' : 'Lumbar hypolordosis');
    }

    if (spine.cervicalFlexion > 20) {
      patterns.push({
        id: 'forward_head',
        name: 'Forward Head Posture',
        description: `Cervical forward flexion of ${spine.cervicalFlexion.toFixed(1)}°`,
        severity: spine.cervicalFlexion > 30 ? 'severe' : spine.cervicalFlexion > 25 ? 'moderate' : 'mild',
        clinicalImplication: 'Associated with neck pain, headaches, and cervicogenic symptoms',
        relatedConditions: ['Cervical strain', 'Tension headaches', 'Upper crossed syndrome', 'TMJ dysfunction'],
        affectedRegion: 'cervical',
      });
      primaryImpairments.push('Forward head posture');
      recommendedFocus.push('Cervical posture correction and deep neck flexor activation');
    }
  }

  private analyzePelvisPosture(
    modelConfig: Partial<ModelConfig>,
    patterns: MovementPattern[],
    primaryImpairments: string[],
    clinicalHypotheses: string[],
    compensations: CompensationPattern[]
  ): void {
    const pelvis = modelConfig.pelvis;
    if (!pelvis) return;

    if (Math.abs(pelvis.tilt) >= PELVIC_TILT_THRESHOLDS.mild) {
      const isAnterior = pelvis.tilt > 0;
      const severity = Math.abs(pelvis.tilt) >= PELVIC_TILT_THRESHOLDS.severe ? 'severe' 
        : Math.abs(pelvis.tilt) >= PELVIC_TILT_THRESHOLDS.moderate ? 'moderate' : 'mild';
      
      patterns.push({
        id: isAnterior ? 'anterior_pelvic_tilt' : 'posterior_pelvic_tilt',
        name: `${isAnterior ? 'Anterior' : 'Posterior'} Pelvic Tilt`,
        description: `Pelvis tilted ${Math.abs(pelvis.tilt).toFixed(1)}° ${isAnterior ? 'anteriorly' : 'posteriorly'}`,
        severity,
        clinicalImplication: isAnterior 
          ? 'Often associated with hip flexor tightness and weak glutes/abdominals'
          : 'May indicate hamstring tightness or lumbar spine protection',
        relatedConditions: isAnterior 
          ? ['Hip flexor tightness', 'Lower crossed syndrome', 'Lumbar facet syndrome']
          : ['Hamstring tightness', 'Disc pathology', 'Flexion intolerance'],
        affectedRegion: 'pelvis',
      });
      primaryImpairments.push(`${isAnterior ? 'Anterior' : 'Posterior'} pelvic tilt`);
      clinicalHypotheses.push(isAnterior 
        ? 'Lower crossed syndrome pattern - assess hip flexors and core strength'
        : 'Possible protective posturing or hamstring dominance');
    }

    if (Math.abs(pelvis.obliquity) >= 3) {
      const highSide = pelvis.obliquity > 0 ? 'left' : 'right';
      const severity = Math.abs(pelvis.obliquity) >= 8 ? 'severe' : Math.abs(pelvis.obliquity) >= 5 ? 'moderate' : 'mild';
      
      patterns.push({
        id: 'pelvic_obliquity',
        name: 'Pelvic Obliquity',
        description: `Pelvis elevated ${Math.abs(pelvis.obliquity).toFixed(1)}° on ${highSide} side`,
        severity,
        clinicalImplication: 'May indicate leg length discrepancy, hip pathology, or habitual posturing',
        relatedConditions: ['Leg length discrepancy', 'Hip OA', 'Scoliosis', 'SI joint dysfunction'],
        affectedRegion: 'pelvis',
      });
      primaryImpairments.push(`Pelvic obliquity (${highSide} high)`);
      
      compensations.push({
        name: 'Pelvic-Lumbar Compensation',
        description: 'Lumbar spine compensating for pelvic obliquity',
        primaryJoint: 'Pelvis',
        compensatingJoint: 'Lumbar spine',
        indicators: ['Lateral trunk shift', 'Asymmetric loading', 'Functional scoliosis'],
      });
    }

    if (Math.abs(pelvis.rotation) >= 5) {
      const rotationSide = pelvis.rotation > 0 ? 'right' : 'left';
      patterns.push({
        id: 'pelvic_rotation',
        name: 'Pelvic Rotation',
        description: `Pelvis rotated ${Math.abs(pelvis.rotation).toFixed(1)}° to the ${rotationSide}`,
        severity: Math.abs(pelvis.rotation) >= 10 ? 'moderate' : 'mild',
        clinicalImplication: 'May affect gait mechanics and hip joint loading',
        relatedConditions: ['SI joint dysfunction', 'Hip mobility restriction', 'Habitual posturing'],
        affectedRegion: 'pelvis',
      });
    }
  }

  private analyzeHipPosture(
    modelConfig: Partial<ModelConfig>,
    patterns: MovementPattern[],
    asymmetries: AsymmetryAnalysis[],
    primaryImpairments: string[],
    clinicalHypotheses: string[],
    recommendedFocus: string[]
  ): void {
    const leftHip = modelConfig.leftHip;
    const rightHip = modelConfig.rightHip;
    if (!leftHip || !rightHip) return;

    if (Math.abs(leftHip.anteversion - rightHip.anteversion) >= 5) {
      asymmetries.push({
        joint: 'Hip',
        movement: 'Anteversion',
        leftValue: leftHip.anteversion,
        rightValue: rightHip.anteversion,
        difference: Math.abs(leftHip.anteversion - rightHip.anteversion),
        percentDifference: Math.abs((leftHip.anteversion - rightHip.anteversion) / Math.max(leftHip.anteversion, rightHip.anteversion, 1)) * 100,
        clinicallySignificant: true,
      });
    }

    [{ side: 'left' as const, hip: leftHip }, { side: 'right' as const, hip: rightHip }].forEach(({ side, hip }) => {
      if (Math.abs(hip.anteversion) >= ANTEVERSION_THRESHOLDS.mild) {
        const isExcessive = hip.anteversion > 15;
        const isDeficient = hip.anteversion < 8;
        
        if (isExcessive || isDeficient) {
          const severity = Math.abs(hip.anteversion - 12) > ANTEVERSION_THRESHOLDS.severe ? 'severe'
            : Math.abs(hip.anteversion - 12) > ANTEVERSION_THRESHOLDS.moderate ? 'moderate' : 'mild';
          
          patterns.push({
            id: `${side}_hip_version`,
            name: `${side.charAt(0).toUpperCase() + side.slice(1)} Hip ${isExcessive ? 'Excessive' : 'Reduced'} Anteversion`,
            description: `${side.charAt(0).toUpperCase() + side.slice(1)} hip femoral anteversion of ${hip.anteversion.toFixed(1)}° (normal 8-15°)`,
            severity,
            clinicalImplication: isExcessive 
              ? 'May present with in-toeing gait and increased internal rotation ROM'
              : 'May present with out-toeing gait and limited internal rotation',
            relatedConditions: isExcessive 
              ? ['In-toeing gait', 'Femoral anteversion syndrome', 'Hip impingement']
              : ['Out-toeing gait', 'Hip retroversion', 'External rotation contracture'],
            affectedRegion: 'hip',
          });
          primaryImpairments.push(`${side.charAt(0).toUpperCase() + side.slice(1)} hip ${isExcessive ? 'excessive' : 'reduced'} anteversion`);
        }
      }

      if (hip.flexion > 15) {
        patterns.push({
          id: `${side}_hip_flexion_contracture`,
          name: `${side.charAt(0).toUpperCase() + side.slice(1)} Hip Flexion Contracture`,
          description: `${side.charAt(0).toUpperCase() + side.slice(1)} hip held in ${hip.flexion.toFixed(1)}° flexion`,
          severity: hip.flexion > 30 ? 'severe' : hip.flexion > 20 ? 'moderate' : 'mild',
          clinicalImplication: 'Hip flexor tightness affecting standing posture and gait',
          relatedConditions: ['Hip flexor contracture', 'Iliopsoas tightness', 'Hip OA'],
          affectedRegion: 'hip',
        });
        primaryImpairments.push(`${side.charAt(0).toUpperCase() + side.slice(1)} hip flexion contracture`);
        recommendedFocus.push('Hip flexor stretching and mobilization');
      }
    });

    if (Math.abs(leftHip.neckShaftAngle - rightHip.neckShaftAngle) > 5) {
      clinicalHypotheses.push('Asymmetric femoral neck-shaft angle may affect hip mechanics');
    }
  }

  private analyzeKneePosture(
    modelConfig: Partial<ModelConfig>,
    patterns: MovementPattern[],
    asymmetries: AsymmetryAnalysis[],
    primaryImpairments: string[],
    clinicalHypotheses: string[]
  ): void {
    const leftKnee = modelConfig.leftKnee;
    const rightKnee = modelConfig.rightKnee;
    if (!leftKnee || !rightKnee) return;

    [{ side: 'left' as const, knee: leftKnee }, { side: 'right' as const, knee: rightKnee }].forEach(({ side, knee }) => {
      if (Math.abs(knee.valgus) >= 5) {
        const isValgus = knee.valgus > 0;
        const severity = Math.abs(knee.valgus) >= 15 ? 'severe' : Math.abs(knee.valgus) >= 10 ? 'moderate' : 'mild';
        
        patterns.push({
          id: `${side}_knee_${isValgus ? 'valgus' : 'varus'}`,
          name: `${side.charAt(0).toUpperCase() + side.slice(1)} Knee ${isValgus ? 'Valgus' : 'Varus'}`,
          description: `${side.charAt(0).toUpperCase() + side.slice(1)} knee ${isValgus ? 'valgus' : 'varus'} of ${Math.abs(knee.valgus).toFixed(1)}°`,
          severity,
          clinicalImplication: isValgus 
            ? 'Increased medial compartment unloading, lateral compartment loading'
            : 'Increased medial compartment loading',
          relatedConditions: isValgus 
            ? ['Patellofemoral pain', 'ACL injury risk', 'ITB syndrome']
            : ['Medial OA', 'MCL stress', 'Medial meniscus loading'],
          affectedRegion: 'knee',
        });
        primaryImpairments.push(`${side.charAt(0).toUpperCase() + side.slice(1)} knee ${isValgus ? 'valgus' : 'varus'}`);
      }

      if (knee.recurvatum > 5) {
        patterns.push({
          id: `${side}_genu_recurvatum`,
          name: `${side.charAt(0).toUpperCase() + side.slice(1)} Genu Recurvatum`,
          description: `${side.charAt(0).toUpperCase() + side.slice(1)} knee hyperextension of ${knee.recurvatum.toFixed(1)}°`,
          severity: knee.recurvatum > 15 ? 'severe' : knee.recurvatum > 10 ? 'moderate' : 'mild',
          clinicalImplication: 'Posterior capsule stress and potential ligamentous laxity',
          relatedConditions: ['Ligamentous laxity', 'Quadriceps weakness', 'PCL injury'],
          affectedRegion: 'knee',
        });
        primaryImpairments.push(`${side.charAt(0).toUpperCase() + side.slice(1)} genu recurvatum`);
      }
    });

    if (Math.abs(leftKnee.valgus - rightKnee.valgus) > 5) {
      asymmetries.push({
        joint: 'Knee',
        movement: 'Valgus/Varus',
        leftValue: leftKnee.valgus,
        rightValue: rightKnee.valgus,
        difference: Math.abs(leftKnee.valgus - rightKnee.valgus),
        percentDifference: 100,
        clinicallySignificant: true,
      });
      clinicalHypotheses.push('Asymmetric knee alignment may affect loading patterns');
    }
  }

  private analyzeAnklePosture(
    modelConfig: Partial<ModelConfig>,
    patterns: MovementPattern[],
    asymmetries: AsymmetryAnalysis[],
    primaryImpairments: string[]
  ): void {
    const leftAnkle = modelConfig.leftAnkle;
    const rightAnkle = modelConfig.rightAnkle;
    if (!leftAnkle || !rightAnkle) return;

    [{ side: 'left' as const, ankle: leftAnkle }, { side: 'right' as const, ankle: rightAnkle }].forEach(({ side, ankle }) => {
      if (ankle.dorsiflexion < 10) {
        patterns.push({
          id: `${side}_ankle_df_restriction`,
          name: `${side.charAt(0).toUpperCase() + side.slice(1)} Ankle Dorsiflexion Restriction`,
          description: `${side.charAt(0).toUpperCase() + side.slice(1)} ankle dorsiflexion limited to ${ankle.dorsiflexion.toFixed(1)}° (normal >10°)`,
          severity: ankle.dorsiflexion < 5 ? 'severe' : 'moderate',
          clinicalImplication: 'May cause compensatory movements during gait and squatting',
          relatedConditions: ['Gastrocnemius/soleus tightness', 'Anterior ankle impingement', 'Talocrural joint restriction'],
          affectedRegion: 'ankle',
        });
        primaryImpairments.push(`${side.charAt(0).toUpperCase() + side.slice(1)} ankle dorsiflexion restriction`);
      }

      if (Math.abs(ankle.eversion) > 10) {
        const isPronated = ankle.eversion > 0;
        patterns.push({
          id: `${side}_foot_${isPronated ? 'pronation' : 'supination'}`,
          name: `${side.charAt(0).toUpperCase() + side.slice(1)} Foot ${isPronated ? 'Over-pronation' : 'Over-supination'}`,
          description: `${side.charAt(0).toUpperCase() + side.slice(1)} foot ${isPronated ? 'pronation' : 'supination'} of ${Math.abs(ankle.eversion).toFixed(1)}°`,
          severity: Math.abs(ankle.eversion) > 15 ? 'severe' : 'moderate',
          clinicalImplication: isPronated 
            ? 'May contribute to tibial internal rotation and knee valgus'
            : 'May increase lateral ankle instability risk',
          relatedConditions: isPronated 
            ? ['Posterior tibial tendon dysfunction', 'Plantar fasciitis', 'Knee valgus']
            : ['Lateral ankle sprains', 'Peroneal tendinopathy', 'Fifth metatarsal stress'],
          affectedRegion: 'ankle',
        });
      }
    });

    if (Math.abs(leftAnkle.dorsiflexion - rightAnkle.dorsiflexion) > 5) {
      asymmetries.push({
        joint: 'Ankle',
        movement: 'Dorsiflexion',
        leftValue: leftAnkle.dorsiflexion,
        rightValue: rightAnkle.dorsiflexion,
        difference: Math.abs(leftAnkle.dorsiflexion - rightAnkle.dorsiflexion),
        percentDifference: Math.abs((leftAnkle.dorsiflexion - rightAnkle.dorsiflexion) / Math.max(leftAnkle.dorsiflexion, rightAnkle.dorsiflexion, 1)) * 100,
        clinicallySignificant: true,
      });
    }
  }

  private analyzeJointConstraints(
    constraints: JointConstraint[],
    romAnalysis: ROMAnalysis[],
    patterns: MovementPattern[],
    primaryImpairments: string[],
    clinicalHypotheses: string[],
    recommendedFocus: string[]
  ): void {
    constraints.filter(c => c.isActive).forEach(constraint => {
      const normalROM = NORMAL_ROM[constraint.joint]?.[constraint.movement] || constraint.normalROM;
      const deficit = normalROM - constraint.maxROM;
      const percentOfNormal = (constraint.maxROM / normalROM) * 100;
      
      let classification: 'normal' | 'mild_restriction' | 'moderate_restriction' | 'severe_restriction' = 'normal';
      if (percentOfNormal < 50) classification = 'severe_restriction';
      else if (percentOfNormal < 75) classification = 'moderate_restriction';
      else if (percentOfNormal < 90) classification = 'mild_restriction';

      const jointSide = constraint.joint.startsWith('left_') ? 'left' 
        : constraint.joint.startsWith('right_') ? 'right' : 'bilateral';
      const jointName = constraint.joint.replace('left_', '').replace('right_', '').replace('_', ' ');

      romAnalysis.push({
        joint: `${jointName} ${constraint.movement}`,
        side: jointSide,
        measured: constraint.maxROM,
        normal: normalROM,
        deficit,
        percentOfNormal,
        classification,
      });

      if (classification !== 'normal') {
        const severity = classification === 'severe_restriction' ? 'severe' 
          : classification === 'moderate_restriction' ? 'moderate' : 'mild';
        
        patterns.push({
          id: `constraint_${constraint.id}`,
          name: `${jointSide !== 'bilateral' ? jointSide.charAt(0).toUpperCase() + jointSide.slice(1) + ' ' : ''}${jointName.charAt(0).toUpperCase() + jointName.slice(1)} ${constraint.movement} Restriction`,
          description: `${constraint.movement} limited to ${constraint.maxROM}° (${percentOfNormal.toFixed(0)}% of normal) due to ${constraint.reason}`,
          severity,
          clinicalImplication: this.getConstraintImplication(constraint),
          relatedConditions: this.getRelatedConditions(constraint),
          affectedRegion: jointName,
        });

        primaryImpairments.push(`${jointSide !== 'bilateral' ? jointSide.charAt(0).toUpperCase() + jointSide.slice(1) + ' ' : ''}${jointName} ${constraint.movement} ${classification.replace('_', ' ')}`);
        
        if (constraint.painLevel && constraint.painLevel >= 5) {
          clinicalHypotheses.push(`Pain-limited ${jointName} ${constraint.movement} (${constraint.painLevel}/10) - rule out active pathology`);
        }
      }
    });

    if (constraints.filter(c => c.isActive).length > 0) {
      recommendedFocus.push('Address active joint restrictions with appropriate manual therapy and exercises');
    }
  }

  private getConstraintImplication(constraint: JointConstraint): string {
    const implications: Record<string, string> = {
      pain: 'Movement limited by pain - may indicate active inflammation or tissue irritation',
      stiffness: 'Movement limited by stiffness - may benefit from mobilization and stretching',
      weakness: 'Movement limited by weakness - strengthening program indicated',
      instability: 'Movement limited by instability - stabilization exercises recommended',
      neural: 'Movement limited by neural tension - neural mobilization may be indicated',
      structural: 'Movement limited by structural factors - may require imaging or specialist referral',
    };
    return implications[constraint.reason] || 'Movement restriction present';
  }

  private getRelatedConditions(constraint: JointConstraint): string[] {
    const joint = constraint.joint;
    const movement = constraint.movement;
    
    if (joint.includes('shoulder')) {
      if (movement === 'abduction' || movement === 'flexion') {
        return ['Rotator cuff pathology', 'Subacromial impingement', 'Adhesive capsulitis'];
      }
      if (movement.includes('rotation')) {
        return ['Capsular restriction', 'Posterior capsule tightness', 'GIRD'];
      }
    }
    
    if (joint.includes('hip')) {
      if (movement === 'flexion') return ['Hip OA', 'Iliopsoas pathology', 'FAI'];
      if (movement === 'internal_rotation') return ['FAI', 'Hip OA', 'Posterior capsule tightness'];
      if (movement === 'extension') return ['Hip flexor tightness', 'Anterior hip impingement'];
    }
    
    if (joint.includes('knee')) {
      if (movement === 'flexion') return ['Knee OA', 'Patellofemoral pain', 'Post-surgical stiffness'];
      if (movement === 'extension') return ['Extension lag', 'Quad weakness', 'Effusion'];
    }
    
    if (joint.includes('spine')) {
      return ['Disc pathology', 'Facet joint restriction', 'Muscle guarding'];
    }
    
    return ['Joint restriction', 'Soft tissue limitation'];
  }

  private detectCompensationPatterns(
    modelConfig: Partial<ModelConfig>,
    constraints: JointConstraint[],
    compensations: CompensationPattern[]
  ): void {
    const spine = modelConfig.spine;
    const pelvis = modelConfig.pelvis;
    const leftHip = modelConfig.leftHip;
    const rightHip = modelConfig.rightHip;

    const hipFlexionConstraints = constraints.filter(c => 
      c.isActive && (c.joint === 'left_hip' || c.joint === 'right_hip') && c.movement === 'flexion'
    );

    if (hipFlexionConstraints.length > 0 && spine && spine.lordosis > 50) {
      compensations.push({
        name: 'Hip-Lumbar Compensation',
        description: 'Increased lumbar lordosis compensating for hip flexion restriction',
        primaryJoint: 'Hip',
        compensatingJoint: 'Lumbar spine',
        indicators: ['Increased lordosis', 'Anterior pelvic tilt', 'Hip flexor overactivity'],
      });
    }

    const ankleConstraints = constraints.filter(c => 
      c.isActive && c.joint.includes('ankle') && c.movement === 'dorsiflexion'
    );

    if (ankleConstraints.length > 0 && (leftHip?.flexion || 0) > 10 || (rightHip?.flexion || 0) > 10) {
      compensations.push({
        name: 'Ankle-Hip Compensation',
        description: 'Hip flexion compensating for ankle dorsiflexion restriction',
        primaryJoint: 'Ankle',
        compensatingJoint: 'Hip',
        indicators: ['Forward trunk lean', 'Hip flexion during squat', 'Heel rise'],
      });
    }

    const shoulderConstraints = constraints.filter(c => 
      c.isActive && c.joint.includes('shoulder') && (c.movement === 'flexion' || c.movement === 'abduction')
    );

    if (shoulderConstraints.length > 0 && spine && Math.abs(spine.scoliosis) > 5) {
      compensations.push({
        name: 'Shoulder-Trunk Compensation',
        description: 'Trunk lateral flexion compensating for shoulder mobility restriction',
        primaryJoint: 'Shoulder',
        compensatingJoint: 'Trunk',
        indicators: ['Lateral trunk lean', 'Scapular hiking', 'Asymmetric arm elevation'],
      });
    }
  }

  private calculateQualityScore(
    patterns: MovementPattern[],
    romAnalysis: ROMAnalysis[],
    asymmetries: AsymmetryAnalysis[],
    compensations: CompensationPattern[]
  ): number {
    let score = 100;

    patterns.forEach(p => {
      if (p.severity === 'severe') score -= 15;
      else if (p.severity === 'moderate') score -= 10;
      else score -= 5;
    });

    romAnalysis.forEach(r => {
      if (r.classification === 'severe_restriction') score -= 12;
      else if (r.classification === 'moderate_restriction') score -= 8;
      else if (r.classification === 'mild_restriction') score -= 4;
    });

    asymmetries.forEach(a => {
      if (a.clinicallySignificant) score -= 6;
    });

    score -= compensations.length * 8;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  getPeakAnglesFromConfig(modelConfig: Partial<ModelConfig>): Record<string, number> {
    const peakAngles: Record<string, number> = {};
    
    if (modelConfig.spine) {
      peakAngles['spine_lateral'] = Math.abs(modelConfig.spine.scoliosis);
      peakAngles['spine_flexion'] = Math.abs(modelConfig.spine.cervicalFlexion);
      peakAngles['thoracic_kyphosis'] = modelConfig.spine.kyphosis;
      peakAngles['lumbar_lordosis'] = modelConfig.spine.lordosis;
    }
    
    if (modelConfig.pelvis) {
      peakAngles['pelvic_tilt'] = Math.abs(modelConfig.pelvis.tilt);
      peakAngles['pelvic_obliquity'] = Math.abs(modelConfig.pelvis.obliquity);
    }
    
    if (modelConfig.leftHip) {
      peakAngles['leftHip_flexion'] = modelConfig.leftHip.flexion;
      peakAngles['leftHip_abduction'] = modelConfig.leftHip.abduction;
      peakAngles['leftHip_anteversion'] = modelConfig.leftHip.anteversion;
    }
    
    if (modelConfig.rightHip) {
      peakAngles['rightHip_flexion'] = modelConfig.rightHip.flexion;
      peakAngles['rightHip_abduction'] = modelConfig.rightHip.abduction;
      peakAngles['rightHip_anteversion'] = modelConfig.rightHip.anteversion;
    }
    
    if (modelConfig.leftKnee) {
      peakAngles['leftKnee_valgus'] = modelConfig.leftKnee.valgus;
      peakAngles['leftKnee_recurvatum'] = modelConfig.leftKnee.recurvatum;
    }
    
    if (modelConfig.rightKnee) {
      peakAngles['rightKnee_valgus'] = modelConfig.rightKnee.valgus;
      peakAngles['rightKnee_recurvatum'] = modelConfig.rightKnee.recurvatum;
    }
    
    if (modelConfig.leftAnkle) {
      peakAngles['leftAnkle_dorsiflexion'] = modelConfig.leftAnkle.dorsiflexion;
    }
    
    if (modelConfig.rightAnkle) {
      peakAngles['rightAnkle_dorsiflexion'] = modelConfig.rightAnkle.dorsiflexion;
    }
    
    return peakAngles;
  }
}
