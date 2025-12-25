/**
 * Region Clinical Profiles
 * 
 * Defines detailed anatomical structures, biomechanical influence mappings,
 * and clinical condition definitions for each anatomical region.
 */

import type { AnatomicalRegion } from '@/components/skeleton/PureThreeGLBViewer';

export interface AnatomyStructure {
  id: string;
  name: string;
  type: 'bone' | 'joint' | 'disc' | 'ligament' | 'nerve' | 'muscle' | 'other';
  description: string;
  clinicalRelevance: string;
}

export interface SliderInfluence {
  slider: string;
  coefficient: number;
  direction: 'increase' | 'decrease' | 'bidirectional';
}

export interface StructureForce {
  structureId: string;
  compression: number;
  shear: number;
  tension: number;
  torsion: number;
  status: 'safe' | 'caution' | 'warning' | 'critical';
}

export interface ClinicalCondition {
  id: string;
  name: string;
  description: string;
  icd10Code: string;
  riskFactors: string[];
  symptoms: string[];
  mechanismOfInjury: string;
  thresholds: {
    metric: string;
    safeMax: number;
    warningThreshold: number;
    criticalThreshold: number;
  }[];
}

export interface RegionClinicalProfile {
  regionId: AnatomicalRegion;
  displayName: string;
  anatomyStructures: AnatomyStructure[];
  sliderInfluences: Record<string, SliderInfluence[]>;
  conditions: ClinicalCondition[];
  physiologicalParameters: {
    normalROM: { min: number; max: number };
    loadTolerance: { safe: number; warning: number; critical: number };
    muscleGroups: string[];
  };
}

export const LUMBAR_SPINE_PROFILE: RegionClinicalProfile = {
  regionId: 'lumbar_spine',
  displayName: 'Lumbar Spine (L1-L5)',
  anatomyStructures: [
    { id: 'l1_vertebra', name: 'L1 Vertebral Body', type: 'bone', description: 'First lumbar vertebra, transitional from thoracic', clinicalRelevance: 'Conus medullaris terminates at L1-L2' },
    { id: 'l2_vertebra', name: 'L2 Vertebral Body', type: 'bone', description: 'Second lumbar vertebra', clinicalRelevance: 'Common level for spinal cord termination' },
    { id: 'l3_vertebra', name: 'L3 Vertebral Body', type: 'bone', description: 'Third lumbar vertebra', clinicalRelevance: 'Apex of lumbar lordosis' },
    { id: 'l4_vertebra', name: 'L4 Vertebral Body', type: 'bone', description: 'Fourth lumbar vertebra', clinicalRelevance: 'Common site of degenerative changes' },
    { id: 'l5_vertebra', name: 'L5 Vertebral Body', type: 'bone', description: 'Fifth lumbar vertebra, largest', clinicalRelevance: 'Most mobile lumbar segment' },
    { id: 'l1_l2_disc', name: 'L1-L2 Disc', type: 'disc', description: 'Intervertebral disc between L1-L2', clinicalRelevance: 'Less commonly affected by herniation' },
    { id: 'l2_l3_disc', name: 'L2-L3 Disc', type: 'disc', description: 'Intervertebral disc between L2-L3', clinicalRelevance: 'Uncommon site for herniation' },
    { id: 'l3_l4_disc', name: 'L3-L4 Disc', type: 'disc', description: 'Intervertebral disc between L3-L4', clinicalRelevance: 'Femoral nerve involvement if affected' },
    { id: 'l4_l5_disc', name: 'L4-L5 Disc', type: 'disc', description: 'Intervertebral disc between L4-L5', clinicalRelevance: 'Most common site of disc herniation (45-50%)' },
    { id: 'l5_s1_disc', name: 'L5-S1 Disc', type: 'disc', description: 'Lumbosacral disc', clinicalRelevance: 'Second most common herniation site (40-45%)' },
    { id: 'facet_l4_l5_l', name: 'L4-L5 Facet Joint (Left)', type: 'joint', description: 'Zygapophyseal joint left side', clinicalRelevance: 'Major source of extension-related back pain' },
    { id: 'facet_l4_l5_r', name: 'L4-L5 Facet Joint (Right)', type: 'joint', description: 'Zygapophyseal joint right side', clinicalRelevance: 'Major source of extension-related back pain' },
    { id: 'facet_l5_s1_l', name: 'L5-S1 Facet Joint (Left)', type: 'joint', description: 'Lumbosacral facet left', clinicalRelevance: 'Common site of facet arthrosis' },
    { id: 'facet_l5_s1_r', name: 'L5-S1 Facet Joint (Right)', type: 'joint', description: 'Lumbosacral facet right', clinicalRelevance: 'Common site of facet arthrosis' },
    { id: 'pars_l5_l', name: 'L5 Pars Interarticularis (Left)', type: 'bone', description: 'Isthmus between superior and inferior articular processes', clinicalRelevance: 'Site of spondylolysis fracture' },
    { id: 'pars_l5_r', name: 'L5 Pars Interarticularis (Right)', type: 'bone', description: 'Isthmus between superior and inferior articular processes', clinicalRelevance: 'Site of spondylolysis fracture' },
    { id: 'spinous_process_l4', name: 'L4 Spinous Process', type: 'bone', description: 'Posterior bony projection of L4', clinicalRelevance: 'Baastrup\'s disease (kissing spine) site' },
    { id: 'spinous_process_l5', name: 'L5 Spinous Process', type: 'bone', description: 'Posterior bony projection of L5', clinicalRelevance: 'Baastrup\'s disease (kissing spine) site' },
    { id: 'ligamentum_flavum', name: 'Ligamentum Flavum', type: 'ligament', description: 'Yellow ligament connecting laminae', clinicalRelevance: 'Hypertrophy causes spinal stenosis' },
    { id: 'posterior_longitudinal', name: 'Posterior Longitudinal Ligament', type: 'ligament', description: 'Runs along posterior vertebral bodies', clinicalRelevance: 'Limits disc herniation, weakest laterally' },
    { id: 'anterior_longitudinal', name: 'Anterior Longitudinal Ligament', type: 'ligament', description: 'Runs along anterior vertebral bodies', clinicalRelevance: 'Limits extension, strongest spinal ligament' },
    { id: 'l4_nerve_root', name: 'L4 Nerve Root', type: 'nerve', description: 'Exits below L4 pedicle', clinicalRelevance: 'Affected by L3-L4 disc, knee jerk reflex' },
    { id: 'l5_nerve_root', name: 'L5 Nerve Root', type: 'nerve', description: 'Exits below L5 pedicle', clinicalRelevance: 'Most commonly compressed nerve root' },
    { id: 's1_nerve_root', name: 'S1 Nerve Root', type: 'nerve', description: 'Exits through sacral foramen', clinicalRelevance: 'Affected by L5-S1 disc, ankle jerk' },
    { id: 'cauda_equina', name: 'Cauda Equina', type: 'nerve', description: 'Nerve bundle below L1-L2', clinicalRelevance: 'Red flag if compromised (emergency)' },
    { id: 'multifidus', name: 'Multifidus Muscles', type: 'muscle', description: 'Deep segmental stabilizers', clinicalRelevance: 'Atrophy associated with chronic LBP' },
    { id: 'erector_spinae', name: 'Erector Spinae', type: 'muscle', description: 'Longissimus, iliocostalis, spinalis', clinicalRelevance: 'Global extensors, fatigue in prolonged positions' },
  ],
  sliderInfluences: {
    spineFlexion: [
      { slider: 'l4_l5_disc', coefficient: 1.5, direction: 'increase' },
      { slider: 'l5_s1_disc', coefficient: 1.3, direction: 'increase' },
      { slider: 'facet_l4_l5', coefficient: -0.5, direction: 'decrease' },
      { slider: 'posterior_longitudinal', coefficient: 1.2, direction: 'increase' },
    ],
    spineExtension: [
      { slider: 'facet_l4_l5', coefficient: 2.0, direction: 'increase' },
      { slider: 'facet_l5_s1', coefficient: 1.8, direction: 'increase' },
      { slider: 'spinous_process_l4', coefficient: 1.5, direction: 'increase' },
      { slider: 'spinous_process_l5', coefficient: 1.5, direction: 'increase' },
      { slider: 'pars_l5', coefficient: 1.3, direction: 'increase' },
    ],
    spineRotation: [
      { slider: 'l4_l5_disc', coefficient: 1.2, direction: 'increase' },
      { slider: 'facet_l4_l5', coefficient: 1.0, direction: 'increase' },
    ],
    spineLateralFlexion: [
      { slider: 'facet_l4_l5', coefficient: 0.8, direction: 'increase' },
      { slider: 'l4_l5_disc', coefficient: 0.6, direction: 'increase' },
    ],
  },
  conditions: [
    {
      id: 'disc_bulge',
      name: 'Disc Bulge/Protrusion',
      description: 'Nucleus pulposus pushes against annulus fibrosus without rupture',
      icd10Code: 'M51.16',
      riskFactors: ['Prolonged flexion', 'High disc compression', 'Repetitive loading', 'Poor posture'],
      symptoms: ['Central or unilateral back pain', 'Possible radicular symptoms', 'Worse with flexion'],
      mechanismOfInjury: 'Cumulative micro-trauma from flexion loading or acute flexion/rotation',
      thresholds: [
        { metric: 'discCompression_L4L5', safeMax: 2000, warningThreshold: 3500, criticalThreshold: 5000 },
        { metric: 'spineFlexion', safeMax: 30, warningThreshold: 45, criticalThreshold: 60 },
      ],
    },
    {
      id: 'disc_herniation',
      name: 'Disc Herniation',
      description: 'Nucleus pulposus extrudes through annulus fibrosus',
      icd10Code: 'M51.16',
      riskFactors: ['Combined flexion + rotation', 'High compression', 'Previous disc injury', 'Repetitive heavy lifting'],
      symptoms: ['Radicular leg pain', 'Numbness/tingling in dermatomal pattern', 'Muscle weakness'],
      mechanismOfInjury: 'Flexion + rotation under compressive load causes annular rupture',
      thresholds: [
        { metric: 'discCompression_L4L5', safeMax: 2500, warningThreshold: 4000, criticalThreshold: 6000 },
        { metric: 'discShear_L4L5', safeMax: 400, warningThreshold: 600, criticalThreshold: 800 },
        { metric: 'combinedFlexionRotation', safeMax: 35, warningThreshold: 50, criticalThreshold: 70 },
      ],
    },
    {
      id: 'spondylolisthesis',
      name: 'Spondylolisthesis',
      description: 'Forward slippage of one vertebra over another',
      icd10Code: 'M43.16',
      riskFactors: ['Pars defect', 'Excessive lordosis', 'High shear forces', 'Hyperextension activities'],
      symptoms: ['Low back pain worse with extension', 'Palpable step-off', 'Hamstring tightness'],
      mechanismOfInjury: 'Repetitive hyperextension causes pars stress fracture allowing slippage',
      thresholds: [
        { metric: 'lumbarShear', safeMax: 400, warningThreshold: 600, criticalThreshold: 900 },
        { metric: 'spineExtension', safeMax: 15, warningThreshold: 25, criticalThreshold: 40 },
        { metric: 'anteriorPelvicTilt', safeMax: 12, warningThreshold: 18, criticalThreshold: 25 },
      ],
    },
    {
      id: 'spondylolysis',
      name: 'Spondylolysis (Pars Defect)',
      description: 'Stress fracture of the pars interarticularis',
      icd10Code: 'M43.00',
      riskFactors: ['Repetitive extension', 'Young athletes', 'Gymnastics/cricket/tennis', 'Hyperlordosis'],
      symptoms: ['Extension-related back pain', 'Pain with single-leg hyperextension', 'Unilateral back pain'],
      mechanismOfInjury: 'Repetitive hyperextension and rotation stress the pars',
      thresholds: [
        { metric: 'parsStress_L5', safeMax: 500, warningThreshold: 800, criticalThreshold: 1200 },
        { metric: 'spineExtension', safeMax: 20, warningThreshold: 30, criticalThreshold: 45 },
      ],
    },
    {
      id: 'facet_syndrome',
      name: 'Facet Joint Syndrome',
      description: 'Dysfunction or degeneration of zygapophyseal joints',
      icd10Code: 'M47.817',
      riskFactors: ['Excessive extension', 'Rotation loading', 'Disc height loss', 'Poor posture'],
      symptoms: ['Localized back pain', 'Pain with extension and rotation', 'Morning stiffness'],
      mechanismOfInjury: 'Compression of facet joints during extension and rotation',
      thresholds: [
        { metric: 'facetLoading_L4L5', safeMax: 600, warningThreshold: 1000, criticalThreshold: 1500 },
        { metric: 'spineExtension', safeMax: 15, warningThreshold: 25, criticalThreshold: 35 },
        { metric: 'spineRotation', safeMax: 8, warningThreshold: 12, criticalThreshold: 18 },
      ],
    },
    {
      id: 'kissing_spine',
      name: 'Kissing Spine Syndrome (Baastrup\'s Disease)',
      description: 'Contact between adjacent spinous processes during extension',
      icd10Code: 'M48.20',
      riskFactors: ['Excessive lordosis', 'Hypermobility into extension', 'Degenerative changes'],
      symptoms: ['Midline back pain', 'Pain with extension', 'Relief with flexion'],
      mechanismOfInjury: 'Spinous processes contact during hyperextension causing bursitis',
      thresholds: [
        { metric: 'spinousProcessGap_L4L5', safeMax: 8, warningThreshold: 4, criticalThreshold: 1 },
        { metric: 'spineExtension', safeMax: 20, warningThreshold: 30, criticalThreshold: 40 },
      ],
    },
    {
      id: 'spinal_stenosis',
      name: 'Spinal Stenosis',
      description: 'Narrowing of the spinal canal',
      icd10Code: 'M48.06',
      riskFactors: ['Extension postures', 'Ligamentum flavum hypertrophy', 'Disc bulge', 'Facet hypertrophy'],
      symptoms: ['Neurogenic claudication', 'Relief with flexion', 'Bilateral leg symptoms'],
      mechanismOfInjury: 'Extension narrows canal, combined with degenerative thickening',
      thresholds: [
        { metric: 'canalNarrowing_estimate', safeMax: 15, warningThreshold: 30, criticalThreshold: 50 },
        { metric: 'spineExtension', safeMax: 10, warningThreshold: 20, criticalThreshold: 30 },
      ],
    },
  ],
  physiologicalParameters: {
    normalROM: { min: -30, max: 60 },
    loadTolerance: { safe: 3400, warning: 4400, critical: 6400 },
    muscleGroups: ['Erector Spinae', 'Multifidus', 'Quadratus Lumborum', 'Transverse Abdominis', 'Internal Obliques'],
  },
};

export const REGION_PROFILES: Partial<Record<AnatomicalRegion, RegionClinicalProfile>> = {
  lumbar_spine: LUMBAR_SPINE_PROFILE,
};

export interface StructureLoadAnalysis {
  structureId: string;
  structureName: string;
  loadType: 'compression' | 'shear' | 'tension' | 'torsion';
  currentLoad: number;
  safeThreshold: number;
  warningThreshold: number;
  criticalThreshold: number;
  percentOfCritical: number;
  status: 'safe' | 'caution' | 'warning' | 'critical';
}

export interface ConditionProbability {
  conditionId: string;
  conditionName: string;
  probability: number;
  riskLevel: 'minimal' | 'low' | 'moderate' | 'high' | 'critical';
  contributingFactors: string[];
  protectiveFactors: string[];
}

export interface RegionAnalysisResult {
  regionId: AnatomicalRegion;
  timestamp: number;
  structureLoads: StructureLoadAnalysis[];
  conditionProbabilities: ConditionProbability[];
  overallRiskScore: number;
  clinicalSummary: string;
}

export function calculateLumbarStructureLoads(
  spineFlexion: number,
  spineRotation: number,
  spineLateralFlexion: number,
  pelvisTilt: number,
  bodyWeightKg: number = 70
): StructureLoadAnalysis[] {
  const baseCompression = bodyWeightKg * 9.81 * 0.55;
  const flexionRad = (spineFlexion * Math.PI) / 180;
  const rotationRad = (spineRotation * Math.PI) / 180;
  
  const isExtension = spineFlexion < 0;
  const extensionMagnitude = isExtension ? Math.abs(spineFlexion) : 0;
  const flexionMagnitude = !isExtension ? spineFlexion : 0;
  
  const discCompressionMultiplier = 1 + Math.sin(flexionRad) * 2.5;
  const shearMultiplier = Math.sin(flexionRad);
  const facetLoadMultiplier = isExtension ? 1 + (extensionMagnitude / 15) * 1.5 : 0.3;
  const rotationStress = Math.abs(rotationRad) * 0.5;
  
  const l4l5DiscCompression = baseCompression * discCompressionMultiplier * 1.1;
  const l5s1DiscCompression = baseCompression * discCompressionMultiplier * 1.0;
  const l3l4DiscCompression = baseCompression * discCompressionMultiplier * 0.9;
  
  const l4l5Shear = baseCompression * shearMultiplier * 0.4;
  const parsStress = baseCompression * (extensionMagnitude / 30) * 0.6 + Math.abs(rotationRad) * 200;
  
  const facetL4L5Load = baseCompression * facetLoadMultiplier * 0.25;
  const facetL5S1Load = baseCompression * facetLoadMultiplier * 0.28;
  
  const spinousGap = Math.max(2, 12 - extensionMagnitude * 0.3);
  
  const getStatus = (value: number, safe: number, warning: number, critical: number): 'safe' | 'caution' | 'warning' | 'critical' => {
    if (value < safe) return 'safe';
    if (value < warning) return 'caution';
    if (value < critical) return 'warning';
    return 'critical';
  };
  
  return [
    {
      structureId: 'l4_l5_disc',
      structureName: 'L4-L5 Disc',
      loadType: 'compression',
      currentLoad: Math.round(l4l5DiscCompression),
      safeThreshold: 2000,
      warningThreshold: 3500,
      criticalThreshold: 5000,
      percentOfCritical: Math.round((l4l5DiscCompression / 5000) * 100),
      status: getStatus(l4l5DiscCompression, 2000, 3500, 5000),
    },
    {
      structureId: 'l5_s1_disc',
      structureName: 'L5-S1 Disc',
      loadType: 'compression',
      currentLoad: Math.round(l5s1DiscCompression),
      safeThreshold: 2200,
      warningThreshold: 3800,
      criticalThreshold: 5500,
      percentOfCritical: Math.round((l5s1DiscCompression / 5500) * 100),
      status: getStatus(l5s1DiscCompression, 2200, 3800, 5500),
    },
    {
      structureId: 'l3_l4_disc',
      structureName: 'L3-L4 Disc',
      loadType: 'compression',
      currentLoad: Math.round(l3l4DiscCompression),
      safeThreshold: 1800,
      warningThreshold: 3200,
      criticalThreshold: 4500,
      percentOfCritical: Math.round((l3l4DiscCompression / 4500) * 100),
      status: getStatus(l3l4DiscCompression, 1800, 3200, 4500),
    },
    {
      structureId: 'l4_l5_disc_shear',
      structureName: 'L4-L5 Disc (Shear)',
      loadType: 'shear',
      currentLoad: Math.round(l4l5Shear),
      safeThreshold: 400,
      warningThreshold: 600,
      criticalThreshold: 800,
      percentOfCritical: Math.round((l4l5Shear / 800) * 100),
      status: getStatus(l4l5Shear, 400, 600, 800),
    },
    {
      structureId: 'facet_l4_l5',
      structureName: 'L4-L5 Facet Joints',
      loadType: 'compression',
      currentLoad: Math.round(facetL4L5Load),
      safeThreshold: 600,
      warningThreshold: 1000,
      criticalThreshold: 1500,
      percentOfCritical: Math.round((facetL4L5Load / 1500) * 100),
      status: getStatus(facetL4L5Load, 600, 1000, 1500),
    },
    {
      structureId: 'facet_l5_s1',
      structureName: 'L5-S1 Facet Joints',
      loadType: 'compression',
      currentLoad: Math.round(facetL5S1Load),
      safeThreshold: 650,
      warningThreshold: 1100,
      criticalThreshold: 1600,
      percentOfCritical: Math.round((facetL5S1Load / 1600) * 100),
      status: getStatus(facetL5S1Load, 650, 1100, 1600),
    },
    {
      structureId: 'pars_l5',
      structureName: 'L5 Pars Interarticularis',
      loadType: 'shear',
      currentLoad: Math.round(parsStress),
      safeThreshold: 500,
      warningThreshold: 800,
      criticalThreshold: 1200,
      percentOfCritical: Math.round((parsStress / 1200) * 100),
      status: getStatus(parsStress, 500, 800, 1200),
    },
    {
      structureId: 'spinous_gap',
      structureName: 'Spinous Process Gap (L4-L5)',
      loadType: 'compression',
      currentLoad: Math.round(spinousGap * 10) / 10,
      safeThreshold: 8,
      warningThreshold: 4,
      criticalThreshold: 1,
      percentOfCritical: Math.round(((12 - spinousGap) / 11) * 100),
      status: spinousGap > 8 ? 'safe' : spinousGap > 4 ? 'caution' : spinousGap > 1 ? 'warning' : 'critical',
    },
  ];
}

export function calculateConditionProbabilities(
  structureLoads: StructureLoadAnalysis[],
  spineFlexion: number,
  spineRotation: number,
  pelvisTilt: number
): ConditionProbability[] {
  const getLoadByStructure = (id: string) => structureLoads.find(s => s.structureId === id);
  
  const isExtension = spineFlexion < 0;
  const extensionMagnitude = isExtension ? Math.abs(spineFlexion) : 0;
  const flexionMagnitude = !isExtension ? spineFlexion : 0;
  
  const l4l5Disc = getLoadByStructure('l4_l5_disc');
  const l4l5Shear = getLoadByStructure('l4_l5_disc_shear');
  const facetL4L5 = getLoadByStructure('facet_l4_l5');
  const parsL5 = getLoadByStructure('pars_l5');
  const spinousGap = getLoadByStructure('spinous_gap');
  
  const getRiskLevel = (prob: number): 'minimal' | 'low' | 'moderate' | 'high' | 'critical' => {
    if (prob < 15) return 'minimal';
    if (prob < 30) return 'low';
    if (prob < 50) return 'moderate';
    if (prob < 75) return 'high';
    return 'critical';
  };
  
  let discBulgeProbability = 5;
  const discBulgeFactors: string[] = [];
  const discBulgeProtective: string[] = [];
  
  if (l4l5Disc && l4l5Disc.percentOfCritical > 40) {
    discBulgeProbability += l4l5Disc.percentOfCritical * 0.4;
    discBulgeFactors.push(`High L4-L5 disc compression (${l4l5Disc.currentLoad}N)`);
  }
  if (flexionMagnitude > 30) {
    discBulgeProbability += (flexionMagnitude - 30) * 1.5;
    discBulgeFactors.push(`Excessive flexion (${Math.round(flexionMagnitude)}°)`);
  }
  if (Math.abs(spineRotation) > 10 && flexionMagnitude > 20) {
    discBulgeProbability += 15;
    discBulgeFactors.push('Combined flexion + rotation loading');
  }
  if (flexionMagnitude < 20 && isExtension === false) {
    discBulgeProtective.push('Neutral spine position');
  }
  
  let spondyProbability = 5;
  const spondyFactors: string[] = [];
  const spondyProtective: string[] = [];
  
  if (l4l5Shear && l4l5Shear.percentOfCritical > 40) {
    spondyProbability += l4l5Shear.percentOfCritical * 0.5;
    spondyFactors.push(`High shear forces (${l4l5Shear.currentLoad}N)`);
  }
  if (extensionMagnitude > 20) {
    spondyProbability += (extensionMagnitude - 20) * 1.2;
    spondyFactors.push(`Hyperextension (${Math.round(extensionMagnitude)}°)`);
  }
  if (pelvisTilt > 15) {
    spondyProbability += (pelvisTilt - 15) * 0.8;
    spondyFactors.push(`Excessive anterior pelvic tilt (${Math.round(pelvisTilt)}°)`);
  }
  if (extensionMagnitude < 15 && pelvisTilt < 12) {
    spondyProtective.push('Neutral pelvic alignment');
  }
  
  let spondylolysisProbability = 3;
  const spondylolysisFactors: string[] = [];
  const spondylolysisProtective: string[] = [];
  
  if (parsL5 && parsL5.percentOfCritical > 50) {
    spondylolysisProbability += parsL5.percentOfCritical * 0.6;
    spondylolysisFactors.push(`High pars stress (${parsL5.currentLoad}N)`);
  }
  if (extensionMagnitude > 25 && Math.abs(spineRotation) > 8) {
    spondylolysisProbability += 20;
    spondylolysisFactors.push('Combined extension + rotation');
  }
  if (extensionMagnitude < 20) {
    spondylolysisProtective.push('Limited extension stress');
  }
  
  let facetProbability = 5;
  const facetFactors: string[] = [];
  const facetProtective: string[] = [];
  
  if (facetL4L5 && facetL4L5.percentOfCritical > 40) {
    facetProbability += facetL4L5.percentOfCritical * 0.5;
    facetFactors.push(`High facet loading (${facetL4L5.currentLoad}N)`);
  }
  if (extensionMagnitude > 15) {
    facetProbability += (extensionMagnitude - 15) * 1.5;
    facetFactors.push(`Extension loading (${Math.round(extensionMagnitude)}°)`);
  }
  if (Math.abs(spineRotation) > 10) {
    facetProbability += Math.abs(spineRotation) * 0.8;
    facetFactors.push(`Rotational loading (${Math.round(Math.abs(spineRotation))}°)`);
  }
  if (extensionMagnitude < 10 && Math.abs(spineRotation) < 8) {
    facetProtective.push('Neutral posture');
  }
  
  let kissingProbability = 2;
  const kissingFactors: string[] = [];
  const kissingProtective: string[] = [];
  
  if (spinousGap && spinousGap.currentLoad < 6) {
    kissingProbability += (6 - spinousGap.currentLoad) * 10;
    kissingFactors.push(`Reduced spinous process gap (${spinousGap.currentLoad}mm)`);
  }
  if (extensionMagnitude > 25) {
    kissingProbability += (extensionMagnitude - 25) * 1.5;
    kissingFactors.push(`Hyperextension (${Math.round(extensionMagnitude)}°)`);
  }
  if (spinousGap && spinousGap.currentLoad > 8) {
    kissingProtective.push('Normal spinous process spacing');
  }
  
  let stenosisProbability = 3;
  const stenosisFactors: string[] = [];
  const stenosisProtective: string[] = [];
  
  if (extensionMagnitude > 20) {
    stenosisProbability += extensionMagnitude * 0.8;
    stenosisFactors.push(`Extension narrows canal (${Math.round(extensionMagnitude)}°)`);
  }
  if (facetL4L5 && facetL4L5.percentOfCritical > 60) {
    stenosisProbability += 10;
    stenosisFactors.push('Facet hypertrophy contribution');
  }
  if (flexionMagnitude > 20) {
    stenosisProbability = Math.max(3, stenosisProbability - 10);
    stenosisProtective.push('Flexion opens canal');
  }
  
  return [
    {
      conditionId: 'disc_bulge',
      conditionName: 'Disc Bulge/Herniation',
      probability: Math.min(95, Math.round(discBulgeProbability)),
      riskLevel: getRiskLevel(discBulgeProbability),
      contributingFactors: discBulgeFactors,
      protectiveFactors: discBulgeProtective,
    },
    {
      conditionId: 'spondylolisthesis',
      conditionName: 'Spondylolisthesis',
      probability: Math.min(95, Math.round(spondyProbability)),
      riskLevel: getRiskLevel(spondyProbability),
      contributingFactors: spondyFactors,
      protectiveFactors: spondyProtective,
    },
    {
      conditionId: 'spondylolysis',
      conditionName: 'Spondylolysis (Pars Defect)',
      probability: Math.min(95, Math.round(spondylolysisProbability)),
      riskLevel: getRiskLevel(spondylolysisProbability),
      contributingFactors: spondylolysisFactors,
      protectiveFactors: spondylolysisProtective,
    },
    {
      conditionId: 'facet_syndrome',
      conditionName: 'Facet Joint Syndrome',
      probability: Math.min(95, Math.round(facetProbability)),
      riskLevel: getRiskLevel(facetProbability),
      contributingFactors: facetFactors,
      protectiveFactors: facetProtective,
    },
    {
      conditionId: 'kissing_spine',
      conditionName: 'Kissing Spine (Baastrup\'s)',
      probability: Math.min(95, Math.round(kissingProbability)),
      riskLevel: getRiskLevel(kissingProbability),
      contributingFactors: kissingFactors,
      protectiveFactors: kissingProtective,
    },
    {
      conditionId: 'spinal_stenosis',
      conditionName: 'Spinal Stenosis Risk',
      probability: Math.min(95, Math.round(stenosisProbability)),
      riskLevel: getRiskLevel(stenosisProbability),
      contributingFactors: stenosisFactors,
      protectiveFactors: stenosisProtective,
    },
  ];
}

export function analyzeRegion(
  regionId: AnatomicalRegion,
  spineFlexion: number,
  spineRotation: number,
  spineLateralFlexion: number,
  pelvisTilt: number,
  bodyWeightKg: number = 70
): RegionAnalysisResult | null {
  if (regionId !== 'lumbar_spine') {
    return null;
  }
  
  const structureLoads = calculateLumbarStructureLoads(
    spineFlexion,
    spineRotation,
    spineLateralFlexion,
    pelvisTilt,
    bodyWeightKg
  );
  
  const conditionProbabilities = calculateConditionProbabilities(
    structureLoads,
    spineFlexion,
    spineRotation,
    pelvisTilt
  );
  
  const maxProbability = Math.max(...conditionProbabilities.map(c => c.probability));
  const avgLoadPercent = structureLoads.reduce((sum, l) => sum + l.percentOfCritical, 0) / structureLoads.length;
  const overallRiskScore = Math.round((maxProbability * 0.6) + (avgLoadPercent * 0.4));
  
  const highestRiskCondition = conditionProbabilities.reduce((a, b) => a.probability > b.probability ? a : b);
  const criticalStructures = structureLoads.filter(s => s.status === 'warning' || s.status === 'critical');
  
  let clinicalSummary = '';
  if (overallRiskScore < 20) {
    clinicalSummary = 'Low overall risk. Lumbar spine in relatively neutral, well-supported position.';
  } else if (overallRiskScore < 40) {
    clinicalSummary = `Mild risk factors present. Primary concern: ${highestRiskCondition.conditionName} (${highestRiskCondition.probability}%).`;
  } else if (overallRiskScore < 60) {
    clinicalSummary = `Moderate risk level. ${criticalStructures.length} structures under elevated stress. Monitor ${highestRiskCondition.conditionName}.`;
  } else {
    clinicalSummary = `Elevated risk detected. ${highestRiskCondition.conditionName} probability ${highestRiskCondition.probability}%. Consider position modification.`;
  }
  
  return {
    regionId,
    timestamp: Date.now(),
    structureLoads,
    conditionProbabilities,
    overallRiskScore,
    clinicalSummary,
  };
}
