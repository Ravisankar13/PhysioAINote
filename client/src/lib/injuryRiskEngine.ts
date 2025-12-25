/**
 * Injury Risk Scoring Engine
 * 
 * Calculates injury risk scores for various musculoskeletal conditions
 * based on biomechanical data, posture analysis, and clinical thresholds.
 */

import type { 
  BiomechanicsResult, 
  JointForces, 
  MuscleActivation, 
  AsymmetryAnalysis,
  MovementQuality,
  PostureSnapshot 
} from './biomechanicsEngine';

export type RiskLevel = 'minimal' | 'low' | 'moderate' | 'high' | 'critical';

export interface RiskScore {
  risk: number; // 0-100
  level: RiskLevel;
  factors: string[];
}

export interface BilateralRisk {
  left: { risk: number; level: RiskLevel };
  right: { risk: number; level: RiskLevel };
  factors: string[];
}

export interface JointRisks {
  lumbarSpine: {
    discHerniation: RiskScore;
    facetJointDysfunction: RiskScore;
    spondylolisthesis: RiskScore;
    muscleStrain: RiskScore;
  };
  hip: {
    labralTear: BilateralRisk;
    femoralAcetabularImpingement: BilateralRisk;
    hipFlexorStrain: BilateralRisk;
    greaterTrochanterBursitis: BilateralRisk;
  };
  knee: {
    aclInjury: BilateralRisk;
    patellofemoralSyndrome: BilateralRisk;
    meniscusTear: BilateralRisk;
    itBandSyndrome: BilateralRisk;
    patellarTendinopathy: BilateralRisk;
  };
  ankle: {
    lateralAnkleSprain: BilateralRisk;
    achillesTendinopathy: BilateralRisk;
    plantarFasciitis: BilateralRisk;
    tibialStressFracture: BilateralRisk;
  };
  shoulder: {
    rotatorCuffTear: BilateralRisk;
    impingementSyndrome: BilateralRisk;
    instability: BilateralRisk;
    bicepsTendinopathy: BilateralRisk;
  };
}

export interface ThresholdWarning {
  joint: string;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: RiskLevel;
  recommendation: string;
}

export interface MuscleWarning {
  muscle: string;
  issue: string;
  severity: RiskLevel;
  recommendation: string;
}

export interface PostureWarning {
  deviation: string;
  severity: RiskLevel;
  relatedRisks: string[];
}

export interface InjuryRiskResult {
  overallRiskLevel: RiskLevel;
  overallRiskScore: number;
  jointRisks: JointRisks;
  thresholdWarnings: {
    jointWarnings: ThresholdWarning[];
    muscleWarnings: MuscleWarning[];
    postureWarnings: PostureWarning[];
  };
  riskFactors: {
    biomechanical: string[];
    postural: string[];
    muscular: string[];
    historical: string[];
  };
}

// Force thresholds based on clinical research
const FORCE_THRESHOLDS = {
  lumbarCompression: {
    safe: 3400, // NIOSH Action Limit
    warning: 4400, // NIOSH Maximum Permissible Limit
    critical: 6400, // Disc failure threshold
  },
  lumbarShear: {
    safe: 500,
    warning: 700,
    critical: 1000,
  },
  kneePatellofemoral: {
    safe: 1500,
    warning: 2500,
    critical: 4000,
  },
};

// Asymmetry thresholds
const ASYMMETRY_THRESHOLDS = {
  minimal: 10,
  low: 15,
  moderate: 20,
  high: 30,
};

function getRiskLevel(score: number): RiskLevel {
  if (score < 20) return 'minimal';
  if (score < 40) return 'low';
  if (score < 60) return 'moderate';
  if (score < 80) return 'high';
  return 'critical';
}

function clampRisk(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Calculate lumbar spine injury risks
 */
function calculateLumbarRisks(
  jointForces: JointForces,
  posture: PostureSnapshot,
  muscleActivation: MuscleActivation
): JointRisks['lumbarSpine'] {
  const compression = jointForces.lumbarSpine.compression;
  const shear = jointForces.lumbarSpine.shear;
  const flexion = Math.abs(posture.spineFlexion);
  const lateralFlexion = Math.abs(posture.spineLateralFlexion);
  const rotation = Math.abs(posture.spineRotation);
  
  // Disc herniation risk factors
  const discFactors: string[] = [];
  let discRisk = 0;
  
  if (flexion > 30) {
    discRisk += 20;
    discFactors.push('Excessive lumbar flexion');
  }
  if (compression > FORCE_THRESHOLDS.lumbarCompression.safe) {
    discRisk += 25;
    discFactors.push('High spinal compression forces');
  }
  if (rotation > 10 && flexion > 20) {
    discRisk += 20;
    discFactors.push('Combined flexion and rotation loading');
  }
  if (muscleActivation.erectorSpinae > 70) {
    discRisk += 10;
    discFactors.push('High erector spinae activation');
  }
  
  // Facet joint dysfunction
  const facetFactors: string[] = [];
  let facetRisk = 0;
  
  if (posture.spineFlexion < -10) { // Extension
    facetRisk += 25;
    facetFactors.push('Excessive lumbar extension');
  }
  if (lateralFlexion > 15) {
    facetRisk += 20;
    facetFactors.push('Excessive lateral flexion');
  }
  if (rotation > 15) {
    facetRisk += 20;
    facetFactors.push('Excessive rotation');
  }
  
  // Spondylolisthesis risk
  const spondyFactors: string[] = [];
  let spondyRisk = 0;
  
  if (posture.pelvisTilt > 20) {
    spondyRisk += 20;
    spondyFactors.push('Excessive anterior pelvic tilt');
  }
  if (posture.spineFlexion < -15) {
    spondyRisk += 25;
    spondyFactors.push('Excessive lumbar lordosis');
  }
  if (shear > FORCE_THRESHOLDS.lumbarShear.safe) {
    spondyRisk += 20;
    spondyFactors.push('High shear forces');
  }
  
  // Muscle strain risk
  const strainFactors: string[] = [];
  let strainRisk = 0;
  
  if (muscleActivation.erectorSpinae > 60) {
    strainRisk += 15;
    strainFactors.push('High paraspinal muscle demand');
  }
  if (muscleActivation.quadratusLumborum.left > 50 || muscleActivation.quadratusLumborum.right > 50) {
    strainRisk += 15;
    strainFactors.push('High quadratus lumborum activation');
  }
  if (flexion > 40) {
    strainRisk += 20;
    strainFactors.push('Extreme flexion position');
  }
  
  return {
    discHerniation: { risk: clampRisk(discRisk), level: getRiskLevel(discRisk), factors: discFactors },
    facetJointDysfunction: { risk: clampRisk(facetRisk), level: getRiskLevel(facetRisk), factors: facetFactors },
    spondylolisthesis: { risk: clampRisk(spondyRisk), level: getRiskLevel(spondyRisk), factors: spondyFactors },
    muscleStrain: { risk: clampRisk(strainRisk), level: getRiskLevel(strainRisk), factors: strainFactors },
  };
}

/**
 * Calculate hip injury risks
 */
function calculateHipRisks(
  jointForces: JointForces,
  posture: PostureSnapshot,
  muscleActivation: MuscleActivation,
  asymmetry: AsymmetryAnalysis
): JointRisks['hip'] {
  const calcSideRisk = (side: 'left' | 'right', baseRisk: number): { risk: number; level: RiskLevel } => {
    const risk = clampRisk(baseRisk);
    return { risk, level: getRiskLevel(risk) };
  };
  
  const hip = { left: posture.leftHip, right: posture.rightHip };
  
  // Labral tear risks
  const labralFactors: string[] = [];
  const labralL = (hip.left.flexion > 90 ? 20 : 0) + 
                  (Math.abs(hip.left.rotation) > 30 ? 15 : 0) +
                  (hip.left.abduction < 0 ? 15 : 0);
  const labralR = (hip.right.flexion > 90 ? 20 : 0) + 
                  (Math.abs(hip.right.rotation) > 30 ? 15 : 0) +
                  (hip.right.abduction < 0 ? 15 : 0);
  
  if (hip.left.flexion > 90 || hip.right.flexion > 90) {
    labralFactors.push('Deep hip flexion position');
  }
  if (Math.abs(hip.left.rotation) > 30 || Math.abs(hip.right.rotation) > 30) {
    labralFactors.push('Excessive hip rotation');
  }
  
  // FAI risks
  const faiFactors: string[] = [];
  const faiL = (hip.left.flexion > 90 && hip.left.rotation > 20 ? 30 : 0) +
               (hip.left.flexion > 100 ? 20 : 0);
  const faiR = (hip.right.flexion > 90 && hip.right.rotation > 20 ? 30 : 0) +
               (hip.right.flexion > 100 ? 20 : 0);
  
  if ((hip.left.flexion > 90 && hip.left.rotation > 20) || (hip.right.flexion > 90 && hip.right.rotation > 20)) {
    faiFactors.push('Combined flexion and internal rotation');
  }
  
  // Hip flexor strain
  const flexorFactors: string[] = [];
  const flexorL = (muscleActivation.iliopsoas.left > 60 ? 25 : 0) +
                  (hip.left.flexion > 80 ? 15 : 0);
  const flexorR = (muscleActivation.iliopsoas.right > 60 ? 25 : 0) +
                  (hip.right.flexion > 80 ? 15 : 0);
  
  if (muscleActivation.iliopsoas.left > 60 || muscleActivation.iliopsoas.right > 60) {
    flexorFactors.push('High hip flexor demand');
  }
  
  // Greater trochanter bursitis
  const gtbFactors: string[] = [];
  const gtbBase = asymmetry.hipLoadAsymmetry > 20 ? 25 : 0;
  const gtbL = gtbBase + (muscleActivation.gluteusMedius.left > 70 ? 20 : 0) +
               (muscleActivation.tensorFasciaeLatae.left > 50 ? 15 : 0);
  const gtbR = gtbBase + (muscleActivation.gluteusMedius.right > 70 ? 20 : 0) +
               (muscleActivation.tensorFasciaeLatae.right > 50 ? 15 : 0);
  
  if (asymmetry.hipLoadAsymmetry > 20) {
    gtbFactors.push('Hip load asymmetry');
  }
  if (muscleActivation.gluteusMedius.left > 70 || muscleActivation.gluteusMedius.right > 70) {
    gtbFactors.push('High gluteus medius activation');
  }
  
  return {
    labralTear: { left: calcSideRisk('left', labralL), right: calcSideRisk('right', labralR), factors: labralFactors },
    femoralAcetabularImpingement: { left: calcSideRisk('left', faiL), right: calcSideRisk('right', faiR), factors: faiFactors },
    hipFlexorStrain: { left: calcSideRisk('left', flexorL), right: calcSideRisk('right', flexorR), factors: flexorFactors },
    greaterTrochanterBursitis: { left: calcSideRisk('left', gtbL), right: calcSideRisk('right', gtbR), factors: gtbFactors },
  };
}

/**
 * Calculate knee injury risks
 */
function calculateKneeRisks(
  jointForces: JointForces,
  posture: PostureSnapshot,
  muscleActivation: MuscleActivation,
  asymmetry: AsymmetryAnalysis
): JointRisks['knee'] {
  const calcSideRisk = (side: 'left' | 'right', baseRisk: number): { risk: number; level: RiskLevel } => {
    const risk = clampRisk(baseRisk);
    return { risk, level: getRiskLevel(risk) };
  };
  
  const knee = { left: posture.leftKnee, right: posture.rightKnee };
  const forces = { left: jointForces.leftKnee, right: jointForces.rightKnee };
  
  // ACL injury risk - dynamic valgus, rotation, anterior shear
  const aclFactors: string[] = [];
  const aclL = (knee.left.varus < -10 ? 30 : 0) + // Valgus
               (forces.left.shear > 500 ? 20 : 0) +
               (muscleActivation.quadriceps.left > 80 && muscleActivation.hamstrings.left < 40 ? 20 : 0);
  const aclR = (knee.right.varus < -10 ? 30 : 0) +
               (forces.right.shear > 500 ? 20 : 0) +
               (muscleActivation.quadriceps.right > 80 && muscleActivation.hamstrings.right < 40 ? 20 : 0);
  
  if (knee.left.varus < -10 || knee.right.varus < -10) {
    aclFactors.push('Dynamic knee valgus');
  }
  if ((muscleActivation.quadriceps.left > 80 && muscleActivation.hamstrings.left < 40) ||
      (muscleActivation.quadriceps.right > 80 && muscleActivation.hamstrings.right < 40)) {
    aclFactors.push('Quad-dominant muscle activation pattern');
  }
  
  // Patellofemoral syndrome
  const pfFactors: string[] = [];
  const pfL = (forces.left.patellofemoral > FORCE_THRESHOLDS.kneePatellofemoral.safe ? 25 : 0) +
              (knee.left.varus < -5 ? 20 : 0) +
              (muscleActivation.quadriceps.left > 70 ? 15 : 0);
  const pfR = (forces.right.patellofemoral > FORCE_THRESHOLDS.kneePatellofemoral.safe ? 25 : 0) +
              (knee.right.varus < -5 ? 20 : 0) +
              (muscleActivation.quadriceps.right > 70 ? 15 : 0);
  
  if (forces.left.patellofemoral > FORCE_THRESHOLDS.kneePatellofemoral.safe ||
      forces.right.patellofemoral > FORCE_THRESHOLDS.kneePatellofemoral.safe) {
    pfFactors.push('High patellofemoral joint stress');
  }
  if (knee.left.varus < -5 || knee.right.varus < -5) {
    pfFactors.push('Lateral patellar tracking tendency');
  }
  
  // Meniscus tear
  const meniscusFactors: string[] = [];
  const meniscusL = (knee.left.flexion > 90 ? 20 : 0) +
                    (Math.abs(posture.leftHip.rotation) > 20 && knee.left.flexion > 60 ? 25 : 0) +
                    (forces.left.compression > 3000 ? 15 : 0);
  const meniscusR = (knee.right.flexion > 90 ? 20 : 0) +
                    (Math.abs(posture.rightHip.rotation) > 20 && knee.right.flexion > 60 ? 25 : 0) +
                    (forces.right.compression > 3000 ? 15 : 0);
  
  if (knee.left.flexion > 90 || knee.right.flexion > 90) {
    meniscusFactors.push('Deep knee flexion with loading');
  }
  if ((Math.abs(posture.leftHip.rotation) > 20 && knee.left.flexion > 60) ||
      (Math.abs(posture.rightHip.rotation) > 20 && knee.right.flexion > 60)) {
    meniscusFactors.push('Rotation with flexion loading');
  }
  
  // IT band syndrome
  const itbFactors: string[] = [];
  const itbL = (muscleActivation.tensorFasciaeLatae.left > 60 ? 25 : 0) +
               (muscleActivation.gluteusMedius.left < 30 ? 20 : 0) +
               (knee.left.varus > 5 ? 15 : 0);
  const itbR = (muscleActivation.tensorFasciaeLatae.right > 60 ? 25 : 0) +
               (muscleActivation.gluteusMedius.right < 30 ? 20 : 0) +
               (knee.right.varus > 5 ? 15 : 0);
  
  if (muscleActivation.tensorFasciaeLatae.left > 60 || muscleActivation.tensorFasciaeLatae.right > 60) {
    itbFactors.push('Overactive TFL');
  }
  if (muscleActivation.gluteusMedius.left < 30 || muscleActivation.gluteusMedius.right < 30) {
    itbFactors.push('Underactive gluteus medius');
  }
  
  // Patellar tendinopathy
  const ptFactors: string[] = [];
  const ptL = (muscleActivation.quadriceps.left > 75 ? 25 : 0) +
              (knee.left.flexion > 60 ? 15 : 0) +
              (forces.left.patellofemoral > 2000 ? 20 : 0);
  const ptR = (muscleActivation.quadriceps.right > 75 ? 25 : 0) +
              (knee.right.flexion > 60 ? 15 : 0) +
              (forces.right.patellofemoral > 2000 ? 20 : 0);
  
  if (muscleActivation.quadriceps.left > 75 || muscleActivation.quadriceps.right > 75) {
    ptFactors.push('High quadriceps loading');
  }
  
  return {
    aclInjury: { left: calcSideRisk('left', aclL), right: calcSideRisk('right', aclR), factors: aclFactors },
    patellofemoralSyndrome: { left: calcSideRisk('left', pfL), right: calcSideRisk('right', pfR), factors: pfFactors },
    meniscusTear: { left: calcSideRisk('left', meniscusL), right: calcSideRisk('right', meniscusR), factors: meniscusFactors },
    itBandSyndrome: { left: calcSideRisk('left', itbL), right: calcSideRisk('right', itbR), factors: itbFactors },
    patellarTendinopathy: { left: calcSideRisk('left', ptL), right: calcSideRisk('right', ptR), factors: ptFactors },
  };
}

/**
 * Calculate ankle injury risks
 */
function calculateAnkleRisks(
  jointForces: JointForces,
  posture: PostureSnapshot,
  muscleActivation: MuscleActivation,
  grf: { weightDistribution: { left: number; right: number } }
): JointRisks['ankle'] {
  const calcSideRisk = (side: 'left' | 'right', baseRisk: number): { risk: number; level: RiskLevel } => {
    const risk = clampRisk(baseRisk);
    return { risk, level: getRiskLevel(risk) };
  };
  
  const ankle = { left: posture.leftAnkle, right: posture.rightAnkle };
  
  // Lateral ankle sprain
  const sprainFactors: string[] = [];
  const sprainL = (ankle.left.inversion > 15 ? 30 : 0) +
                  (muscleActivation.peroneals.left < 30 ? 20 : 0);
  const sprainR = (ankle.right.inversion > 15 ? 30 : 0) +
                  (muscleActivation.peroneals.right < 30 ? 20 : 0);
  
  if (ankle.left.inversion > 15 || ankle.right.inversion > 15) {
    sprainFactors.push('Excessive inversion position');
  }
  if (muscleActivation.peroneals.left < 30 || muscleActivation.peroneals.right < 30) {
    sprainFactors.push('Weak peroneal activation');
  }
  
  // Achilles tendinopathy
  const achillesFactors: string[] = [];
  const achillesL = (muscleActivation.gastrocnemius.left > 70 ? 25 : 0) +
                    (muscleActivation.soleus.left > 70 ? 20 : 0) +
                    (ankle.left.dorsiflexion < 5 ? 15 : 0);
  const achillesR = (muscleActivation.gastrocnemius.right > 70 ? 25 : 0) +
                    (muscleActivation.soleus.right > 70 ? 20 : 0) +
                    (ankle.right.dorsiflexion < 5 ? 15 : 0);
  
  if (muscleActivation.gastrocnemius.left > 70 || muscleActivation.gastrocnemius.right > 70) {
    achillesFactors.push('High calf muscle activation');
  }
  if (ankle.left.dorsiflexion < 5 || ankle.right.dorsiflexion < 5) {
    achillesFactors.push('Limited dorsiflexion mobility');
  }
  
  // Plantar fasciitis
  const pfFactors: string[] = [];
  const pfL = (Math.abs(grf.weightDistribution.left - 50) > 15 ? 20 : 0) +
              (ankle.left.dorsiflexion < 10 ? 20 : 0) +
              (muscleActivation.tibialisPosterior.left > 60 ? 15 : 0);
  const pfR = (Math.abs(grf.weightDistribution.right - 50) > 15 ? 20 : 0) +
              (ankle.right.dorsiflexion < 10 ? 20 : 0) +
              (muscleActivation.tibialisPosterior.right > 60 ? 15 : 0);
  
  if (ankle.left.dorsiflexion < 10 || ankle.right.dorsiflexion < 10) {
    pfFactors.push('Restricted ankle mobility');
  }
  
  // Tibial stress fracture
  const stressFactors: string[] = [];
  const stressL = (jointForces.leftAnkle.compression > 4000 ? 25 : 0) +
                  (muscleActivation.tibialisAnterior.left > 60 ? 15 : 0);
  const stressR = (jointForces.rightAnkle.compression > 4000 ? 25 : 0) +
                  (muscleActivation.tibialisAnterior.right > 60 ? 15 : 0);
  
  if (jointForces.leftAnkle.compression > 4000 || jointForces.rightAnkle.compression > 4000) {
    stressFactors.push('High lower leg loading');
  }
  
  return {
    lateralAnkleSprain: { left: calcSideRisk('left', sprainL), right: calcSideRisk('right', sprainR), factors: sprainFactors },
    achillesTendinopathy: { left: calcSideRisk('left', achillesL), right: calcSideRisk('right', achillesR), factors: achillesFactors },
    plantarFasciitis: { left: calcSideRisk('left', pfL), right: calcSideRisk('right', pfR), factors: pfFactors },
    tibialStressFracture: { left: calcSideRisk('left', stressL), right: calcSideRisk('right', stressR), factors: stressFactors },
  };
}

/**
 * Calculate shoulder injury risks
 */
function calculateShoulderRisks(
  jointForces: JointForces,
  posture: PostureSnapshot,
  muscleActivation: MuscleActivation
): JointRisks['shoulder'] {
  const calcSideRisk = (side: 'left' | 'right', baseRisk: number): { risk: number; level: RiskLevel } => {
    const risk = clampRisk(baseRisk);
    return { risk, level: getRiskLevel(risk) };
  };
  
  const shoulder = { left: posture.leftShoulder, right: posture.rightShoulder };
  
  // Rotator cuff tear
  const rcFactors: string[] = [];
  const rcL = (shoulder.left.abduction > 90 ? 25 : 0) +
              (muscleActivation.rotatorcuff.left > 70 ? 20 : 0) +
              (jointForces.leftShoulder.compression > 500 ? 15 : 0);
  const rcR = (shoulder.right.abduction > 90 ? 25 : 0) +
              (muscleActivation.rotatorcuff.right > 70 ? 20 : 0) +
              (jointForces.rightShoulder.compression > 500 ? 15 : 0);
  
  if (shoulder.left.abduction > 90 || shoulder.right.abduction > 90) {
    rcFactors.push('Elevated arm position');
  }
  if (muscleActivation.rotatorcuff.left > 70 || muscleActivation.rotatorcuff.right > 70) {
    rcFactors.push('High rotator cuff demand');
  }
  
  // Impingement syndrome
  const impingeFactors: string[] = [];
  const impingeL = (shoulder.left.abduction > 60 && shoulder.left.abduction < 120 ? 25 : 0) +
                   (shoulder.left.rotation > 30 ? 20 : 0) +
                   (muscleActivation.trapezius.upper > 60 ? 15 : 0);
  const impingeR = (shoulder.right.abduction > 60 && shoulder.right.abduction < 120 ? 25 : 0) +
                   (shoulder.right.rotation > 30 ? 20 : 0) +
                   (muscleActivation.trapezius.upper > 60 ? 15 : 0);
  
  if ((shoulder.left.abduction > 60 && shoulder.left.abduction < 120) ||
      (shoulder.right.abduction > 60 && shoulder.right.abduction < 120)) {
    impingeFactors.push('Arc of impingement range');
  }
  if (muscleActivation.trapezius.upper > 60) {
    impingeFactors.push('Upper trapezius overactivity');
  }
  
  // Instability
  const instabilityFactors: string[] = [];
  const instabilityL = (Math.abs(shoulder.left.rotation) > 60 ? 30 : 0) +
                       (shoulder.left.abduction > 90 && Math.abs(shoulder.left.rotation) > 45 ? 25 : 0);
  const instabilityR = (Math.abs(shoulder.right.rotation) > 60 ? 30 : 0) +
                       (shoulder.right.abduction > 90 && Math.abs(shoulder.right.rotation) > 45 ? 25 : 0);
  
  if (Math.abs(shoulder.left.rotation) > 60 || Math.abs(shoulder.right.rotation) > 60) {
    instabilityFactors.push('Extreme rotation range');
  }
  
  // Biceps tendinopathy
  const bicepsFactors: string[] = [];
  const bicepsL = (shoulder.left.flexion > 90 ? 20 : 0) +
                  (Math.abs(shoulder.left.rotation) > 40 ? 20 : 0);
  const bicepsR = (shoulder.right.flexion > 90 ? 20 : 0) +
                  (Math.abs(shoulder.right.rotation) > 40 ? 20 : 0);
  
  if (shoulder.left.flexion > 90 || shoulder.right.flexion > 90) {
    bicepsFactors.push('Overhead positioning');
  }
  
  return {
    rotatorCuffTear: { left: calcSideRisk('left', rcL), right: calcSideRisk('right', rcR), factors: rcFactors },
    impingementSyndrome: { left: calcSideRisk('left', impingeL), right: calcSideRisk('right', impingeR), factors: impingeFactors },
    instability: { left: calcSideRisk('left', instabilityL), right: calcSideRisk('right', instabilityR), factors: instabilityFactors },
    bicepsTendinopathy: { left: calcSideRisk('left', bicepsL), right: calcSideRisk('right', bicepsR), factors: bicepsFactors },
  };
}

/**
 * Generate threshold warnings
 */
function generateWarnings(
  biomechanics: BiomechanicsResult,
  jointRisks: JointRisks
): InjuryRiskResult['thresholdWarnings'] {
  const jointWarnings: ThresholdWarning[] = [];
  const muscleWarnings: MuscleWarning[] = [];
  const postureWarnings: PostureWarning[] = [];
  
  // Check force thresholds
  if (biomechanics.jointForces.lumbarSpine.compression > FORCE_THRESHOLDS.lumbarCompression.safe) {
    jointWarnings.push({
      joint: 'Lumbar Spine',
      metric: 'Compression Force',
      currentValue: biomechanics.jointForces.lumbarSpine.compression,
      threshold: FORCE_THRESHOLDS.lumbarCompression.safe,
      severity: biomechanics.jointForces.lumbarSpine.compression > FORCE_THRESHOLDS.lumbarCompression.warning ? 'high' : 'moderate',
      recommendation: 'Reduce forward bending angle or external load',
    });
  }
  
  if (biomechanics.jointForces.leftKnee.patellofemoral > FORCE_THRESHOLDS.kneePatellofemoral.safe) {
    jointWarnings.push({
      joint: 'Left Knee',
      metric: 'Patellofemoral Force',
      currentValue: biomechanics.jointForces.leftKnee.patellofemoral,
      threshold: FORCE_THRESHOLDS.kneePatellofemoral.safe,
      severity: biomechanics.jointForces.leftKnee.patellofemoral > FORCE_THRESHOLDS.kneePatellofemoral.warning ? 'high' : 'moderate',
      recommendation: 'Reduce knee flexion depth or improve hip/ankle mobility',
    });
  }
  
  if (biomechanics.jointForces.rightKnee.patellofemoral > FORCE_THRESHOLDS.kneePatellofemoral.safe) {
    jointWarnings.push({
      joint: 'Right Knee',
      metric: 'Patellofemoral Force',
      currentValue: biomechanics.jointForces.rightKnee.patellofemoral,
      threshold: FORCE_THRESHOLDS.kneePatellofemoral.safe,
      severity: biomechanics.jointForces.rightKnee.patellofemoral > FORCE_THRESHOLDS.kneePatellofemoral.warning ? 'high' : 'moderate',
      recommendation: 'Reduce knee flexion depth or improve hip/ankle mobility',
    });
  }
  
  // Check muscle imbalances
  const quadHamRatioL = biomechanics.muscleActivation.quadriceps.left / 
    (biomechanics.muscleActivation.hamstrings.left || 1);
  const quadHamRatioR = biomechanics.muscleActivation.quadriceps.right / 
    (biomechanics.muscleActivation.hamstrings.right || 1);
  
  if (quadHamRatioL > 2.5) {
    muscleWarnings.push({
      muscle: 'Left Lower Extremity',
      issue: 'Quad-dominant activation pattern',
      severity: 'moderate',
      recommendation: 'Strengthen hamstrings, practice hip hinge movements',
    });
  }
  
  if (quadHamRatioR > 2.5) {
    muscleWarnings.push({
      muscle: 'Right Lower Extremity',
      issue: 'Quad-dominant activation pattern',
      severity: 'moderate',
      recommendation: 'Strengthen hamstrings, practice hip hinge movements',
    });
  }
  
  // Check posture deviations
  if (Math.abs(biomechanics.postureSnapshot.pelvisTilt) > 15) {
    postureWarnings.push({
      deviation: biomechanics.postureSnapshot.pelvisTilt > 0 
        ? 'Excessive anterior pelvic tilt' 
        : 'Excessive posterior pelvic tilt',
      severity: Math.abs(biomechanics.postureSnapshot.pelvisTilt) > 25 ? 'high' : 'moderate',
      relatedRisks: ['Lumbar strain', 'Hip flexor tightness', 'Poor core stability'],
    });
  }
  
  if (Math.abs(biomechanics.postureSnapshot.pelvisObliquity) > 5) {
    postureWarnings.push({
      deviation: `Pelvic obliquity (${biomechanics.postureSnapshot.pelvisObliquity > 0 ? 'left' : 'right'} elevated)`,
      severity: Math.abs(biomechanics.postureSnapshot.pelvisObliquity) > 10 ? 'high' : 'moderate',
      relatedRisks: ['Hip bursitis', 'SI joint dysfunction', 'Leg length discrepancy compensation'],
    });
  }
  
  if (biomechanics.asymmetryAnalysis.weightDistributionAsymmetry > 15) {
    postureWarnings.push({
      deviation: 'Significant weight shift asymmetry',
      severity: biomechanics.asymmetryAnalysis.weightDistributionAsymmetry > 25 ? 'high' : 'moderate',
      relatedRisks: ['Unilateral overload', 'Joint degeneration', 'Muscle imbalance'],
    });
  }
  
  return { jointWarnings, muscleWarnings, postureWarnings };
}

/**
 * Extract all risk factors from analysis
 */
function extractRiskFactors(
  jointRisks: JointRisks,
  warnings: InjuryRiskResult['thresholdWarnings'],
  movementQuality: MovementQuality
): InjuryRiskResult['riskFactors'] {
  const biomechanical: string[] = [];
  const postural: string[] = [];
  const muscular: string[] = [];
  
  // Collect unique factors from joint risks
  const allFactors = new Set<string>();
  
  Object.values(jointRisks.lumbarSpine).forEach(r => r.factors.forEach(f => allFactors.add(f)));
  Object.values(jointRisks.hip).forEach(r => r.factors.forEach(f => allFactors.add(f)));
  Object.values(jointRisks.knee).forEach(r => r.factors.forEach(f => allFactors.add(f)));
  Object.values(jointRisks.ankle).forEach(r => r.factors.forEach(f => allFactors.add(f)));
  Object.values(jointRisks.shoulder).forEach(r => r.factors.forEach(f => allFactors.add(f)));
  
  allFactors.forEach(f => {
    if (f.toLowerCase().includes('force') || f.toLowerCase().includes('load') || f.toLowerCase().includes('compression')) {
      biomechanical.push(f);
    } else if (f.toLowerCase().includes('position') || f.toLowerCase().includes('flexion') || f.toLowerCase().includes('extension') || f.toLowerCase().includes('rotation')) {
      postural.push(f);
    } else if (f.toLowerCase().includes('muscle') || f.toLowerCase().includes('activation') || f.toLowerCase().includes('weakness') || f.toLowerCase().includes('tightness')) {
      muscular.push(f);
    } else {
      biomechanical.push(f);
    }
  });
  
  // Add from warnings
  warnings.postureWarnings.forEach(w => postural.push(w.deviation));
  warnings.muscleWarnings.forEach(w => muscular.push(w.issue));
  
  // Add movement faults and compensations
  movementQuality.compensationPatterns.forEach(c => postural.push(c));
  movementQuality.movementFaults.forEach(f => biomechanical.push(f));
  
  return {
    biomechanical: Array.from(new Set(biomechanical)),
    postural: Array.from(new Set(postural)),
    muscular: Array.from(new Set(muscular)),
    historical: [], // Would come from patient history
  };
}

/**
 * Calculate overall risk score
 */
function calculateOverallRisk(jointRisks: JointRisks): { score: number; level: RiskLevel } {
  const allRisks: number[] = [];
  
  // Collect all risk scores
  Object.values(jointRisks.lumbarSpine).forEach(r => allRisks.push(r.risk));
  Object.values(jointRisks.hip).forEach(r => {
    allRisks.push(r.left.risk, r.right.risk);
  });
  Object.values(jointRisks.knee).forEach(r => {
    allRisks.push(r.left.risk, r.right.risk);
  });
  Object.values(jointRisks.ankle).forEach(r => {
    allRisks.push(r.left.risk, r.right.risk);
  });
  Object.values(jointRisks.shoulder).forEach(r => {
    allRisks.push(r.left.risk, r.right.risk);
  });
  
  // Weight by highest risks (top 5 most concerning)
  const sortedRisks = allRisks.sort((a, b) => b - a);
  const topRisks = sortedRisks.slice(0, 5);
  
  // Weighted average emphasizing highest risks
  const weights = [0.35, 0.25, 0.2, 0.12, 0.08];
  let weightedSum = 0;
  for (let i = 0; i < Math.min(topRisks.length, weights.length); i++) {
    weightedSum += topRisks[i] * weights[i];
  }
  
  const score = clampRisk(weightedSum);
  return { score, level: getRiskLevel(score) };
}

/**
 * Main function to calculate all injury risks from biomechanics data
 */
export function calculateInjuryRisks(biomechanics: BiomechanicsResult): InjuryRiskResult {
  const jointRisks: JointRisks = {
    lumbarSpine: calculateLumbarRisks(
      biomechanics.jointForces,
      biomechanics.postureSnapshot,
      biomechanics.muscleActivation
    ),
    hip: calculateHipRisks(
      biomechanics.jointForces,
      biomechanics.postureSnapshot,
      biomechanics.muscleActivation,
      biomechanics.asymmetryAnalysis
    ),
    knee: calculateKneeRisks(
      biomechanics.jointForces,
      biomechanics.postureSnapshot,
      biomechanics.muscleActivation,
      biomechanics.asymmetryAnalysis
    ),
    ankle: calculateAnkleRisks(
      biomechanics.jointForces,
      biomechanics.postureSnapshot,
      biomechanics.muscleActivation,
      biomechanics.groundReactionForces
    ),
    shoulder: calculateShoulderRisks(
      biomechanics.jointForces,
      biomechanics.postureSnapshot,
      biomechanics.muscleActivation
    ),
  };
  
  const thresholdWarnings = generateWarnings(biomechanics, jointRisks);
  const riskFactors = extractRiskFactors(jointRisks, thresholdWarnings, biomechanics.movementQuality);
  const { score: overallRiskScore, level: overallRiskLevel } = calculateOverallRisk(jointRisks);
  
  return {
    overallRiskLevel,
    overallRiskScore,
    jointRisks,
    thresholdWarnings,
    riskFactors,
  };
}
