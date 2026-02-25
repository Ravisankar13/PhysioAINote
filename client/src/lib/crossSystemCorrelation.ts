import { KINETIC_CHAINS } from './kineticChainExplorer';
import { findChainsForBone, type MyofascialChain, type PropagatedMuscleState, type ChainEffect } from './myofascialChains';
import { getScarImpact, type ScarMarker, type AdhesionBand, type ScarType, type ScarImpact } from './scarTissueMapping';

type ClinicalStatus = 'normal' | 'shortened' | 'lengthened' | 'overactive' | 'inhibited' | 'spasm' | 'weak';

interface PainMarker {
  id: string;
  position: { x: number; y: number; z: number };
  label: string;
  type: 'point' | 'area' | 'referred' | 'line' | 'paint';
  severity?: number;
  description?: string;
}

interface JointSurfaceForce {
  id: string;
  label: string;
  category: string;
  compression: number;
  tension: number;
  shear: number;
  totalForce: number;
  status: 'low' | 'moderate' | 'high' | 'very_high';
  clinical: string;
}

interface IndividualMuscle {
  id: string;
  label: string;
  lengthPercent: number;
  activationPercent: number;
  tightnessPercent: number;
  inhibitionPercent: number;
  clinicalStatus: ClinicalStatus;
  clinicalNote: string;
  state: 'shortened' | 'neutral' | 'lengthened';
}

interface MuscleGroupAnalysis {
  id: string;
  label: string;
  muscles: IndividualMuscle[];
  avgActivation: number;
  avgTightness: number;
  avgInhibition: number;
  dominantStatus: ClinicalStatus;
}

interface CrossSyndromePattern {
  id: string;
  label: string;
  detected: boolean;
  severity: number;
  tightMuscles: string[];
  weakMuscles: string[];
  description: string;
}

interface ChainLink {
  jointId: string;
  label: string;
  region: string;
  role: 'primary' | 'secondary';
  muscles: string[];
  forceContribution: string;
}

interface KineticChainDefinition {
  id: string;
  label: string;
  category: 'myofascial' | 'biomechanical' | 'functional';
  color: string;
  description: string;
  clinicalRelevance: string;
  links: ChainLink[];
  commonDysfunctions: string[];
  assessmentTests: string[];
}

export interface CorrelationInput {
  painMarkers: PainMarker[];
  forces: JointSurfaceForce[];
  muscles: IndividualMuscle[];
  muscleGroups: MuscleGroupAnalysis[];
  syndromes: CrossSyndromePattern[];
  kineticChains: KineticChainDefinition[];
  bodyWeightKg: number;
  fascialChainData?: {
    chains: MyofascialChain[];
    tensions: Record<string, number>;
    propagatedEffects?: Record<string, PropagatedMuscleState>;
    chainEffects?: ChainEffect[];
  };
  scarData?: {
    scars: ScarMarker[];
    adhesions: AdhesionBand[];
  };
}

export interface PainCorrelation {
  markerId: string;
  markerLabel: string;
  severity: number;
  region: string;
  relatedChains: {
    chainId: string;
    chainLabel: string;
    chainColor: string;
    relevantLinks: { linkLabel: string; muscles: string[]; forceContribution: string }[];
    relevanceScore: number;
    relevanceReason: string;
  }[];
  relatedForces: {
    jointId: string;
    jointLabel: string;
    status: string;
    totalForce: number;
    compression: number;
    tension: number;
    shear: number;
    clinical: string;
    contributionToPin: string;
  }[];
  relatedMuscles: {
    muscleId: string;
    muscleLabel: string;
    clinicalStatus: string;
    tightness: number;
    activation: number;
    inhibition: number;
    contributionType: 'direct' | 'referred' | 'compensatory';
    explanation: string;
  }[];
  compensationPatterns: {
    pattern: string;
    description: string;
    severity: 'mild' | 'moderate' | 'severe';
    involvedStructures: string[];
  }[];
  relatedFascialChains: {
    chainId: string;
    chainName: string;
    avgTension: number;
    propagationDelta: number;
    relevance: string;
  }[];
  relatedScars: {
    scarId: string;
    type: ScarType;
    impact: ScarImpact;
    proximity: string;
  }[];
  rootCauseChain: {
    step: number;
    structure: string;
    finding: string;
    mechanism: string;
    arrow: string;
  }[];
}

export interface CompensationPattern {
  id: string;
  label: string;
  description: string;
  severity: 'mild' | 'moderate' | 'severe';
  primaryDysfunction: string;
  compensatingStructures: string[];
  affectedChains: string[];
  clinicalSignificance: string;
}

export interface CrossSystemCorrelationResult {
  painCorrelations: PainCorrelation[];
  globalCompensations: CompensationPattern[];
  overallRiskScore: number;
  clinicalPriorities: { priority: number; area: string; finding: string; action: string }[];
  summaryFindings: string[];
}

const REGION_KEYWORDS: Record<string, string[]> = {
  shoulder: ['shoulder', 'rotator cuff', 'deltoid', 'supraspinatus', 'infraspinatus', 'subscapularis', 'teres', 'acromion', 'glenohumeral', 'subacromial', 'ac joint', 'acromioclavicular'],
  lumbar: ['lower back', 'lumbar', 'l1', 'l2', 'l3', 'l4', 'l5', 'lumbosacral', 'disc', 'facet', 'erector spinae', 'multifidus', 'low back'],
  knee: ['knee', 'patella', 'meniscus', 'patellar', 'patellofemoral', 'tibial', 'pcl', 'acl', 'mcl', 'lcl', 'tibiofemoral'],
  hip: ['hip', 'groin', 'trochanter', 'labrum', 'labral', 'acetabul', 'femoral head', 'piriformis', 'greater trochanter', 'lesser trochanter'],
  cervical: ['neck', 'cervical', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'suboccipital', 'occiput', 'sternocleidomastoid', 'scm', 'scalene'],
  thoracic: ['thoracic', 'mid back', 'rib', 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10', 't11', 't12', 'costovertebral', 'scapula', 'rhomboid', 'upper back'],
  ankle_foot: ['ankle', 'foot', 'achilles', 'calf', 'plantar', 'calcaneus', 'heel', 'metatarsal', 'navicular', 'malleolus', 'talocrural', 'subtalar', 'gastrocnemius', 'soleus'],
  upper_extremity: ['elbow', 'wrist', 'forearm', 'epicondyle', 'olecranon', 'radial', 'ulnar', 'carpal', 'hand', 'biceps', 'triceps'],
  pelvic: ['pelvis', 'si joint', 'sacrum', 'sacroiliac', 'iliac', 'asis', 'psis', 'coccyx', 'pubic', 'ischial', 'pelvic floor', 'innominate'],
};

const ADJACENT_REGIONS: Record<string, string[]> = {
  cervical: ['thoracic', 'shoulder'],
  thoracic: ['cervical', 'lumbar', 'shoulder'],
  lumbar: ['thoracic', 'pelvic', 'hip'],
  pelvic: ['lumbar', 'hip'],
  hip: ['pelvic', 'lumbar', 'knee'],
  knee: ['hip', 'ankle_foot'],
  ankle_foot: ['knee'],
  shoulder: ['cervical', 'thoracic', 'upper_extremity'],
  upper_extremity: ['shoulder'],
};

const REGION_TO_FORCE_CATEGORIES: Record<string, string[]> = {
  cervical: ['cervical_spine'],
  thoracic: ['thoracic_spine'],
  lumbar: ['lumbar_spine'],
  pelvic: ['pelvis_sacrum'],
  hip: ['left_hip', 'right_hip'],
  knee: ['left_knee', 'right_knee'],
  ankle_foot: ['left_ankle', 'right_ankle'],
  shoulder: ['left_shoulder', 'right_shoulder'],
  upper_extremity: ['left_elbow', 'right_elbow', 'left_wrist', 'right_wrist'],
};

const REGION_TO_CHAIN_REGIONS: Record<string, string[]> = {
  cervical: ['cervical', 'posterior_neck', 'deep_neck', 'neck'],
  thoracic: ['spine', 'scapular', 'lateral_thorax', 'thorax', 'posterior_trunk', 'trunk'],
  lumbar: ['spine', 'lumbar', 'deep_spine', 'lateral_lumbar'],
  pelvic: ['pelvis', 'pelvis_lumbar', 'deep_core', 'deep_abdomen'],
  hip: ['hip', 'lateral_hip', 'medial_hip', 'medial_thigh', 'thigh', 'posterior_thigh', 'lateral_thigh'],
  knee: ['knee', 'posterior_knee'],
  ankle_foot: ['foot', 'ankle', 'lateral_ankle', 'calf', 'deep_calf', 'shin', 'anterior_shin', 'lateral_shin'],
  shoulder: ['shoulder', 'scapular', 'lateral_thorax'],
  upper_extremity: ['elbow', 'wrist', 'forearm'],
};

const MUSCLE_REGION_MAP: Record<string, string[]> = {
  cervical: ['upper_trap', 'scm', 'scalene', 'deep_neck', 'longus', 'splenius', 'suboccipital', 'levator'],
  thoracic: ['rhomboid', 'mid_trap', 'lower_trap', 'serratus', 'erector', 'latissimus', 'lat_dorsi'],
  lumbar: ['erector', 'multifidus', 'quadratus', 'psoas', 'transversus'],
  pelvic: ['pelvic_floor', 'psoas', 'iliacus', 'piriformis', 'obturator'],
  hip: ['glut', 'piriformis', 'hip_flex', 'iliopsoas', 'rect_fem', 'adduct', 'tfl', 'it_band'],
  knee: ['quad', 'hamstring', 'vast', 'rect_fem', 'popliteus', 'gastroc'],
  ankle_foot: ['gastroc', 'soleus', 'tib_ant', 'tib_post', 'peroneal', 'plantar'],
  shoulder: ['deltoid', 'supraspinatus', 'infraspinatus', 'subscap', 'teres', 'pec', 'rotator'],
  upper_extremity: ['bicep', 'tricep', 'wrist', 'pronator', 'supinator', 'forearm'],
};

function mapPainToRegion(label: string): string {
  const lower = label.toLowerCase();
  for (const [region, keywords] of Object.entries(REGION_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return region;
    }
  }
  if (lower.includes('left') || lower.includes('right')) {
    for (const [region, keywords] of Object.entries(REGION_KEYWORDS)) {
      for (const kw of keywords) {
        if (lower.includes(kw)) return region;
      }
    }
  }
  return 'unknown';
}

function detectSide(label: string): 'left' | 'right' | 'both' {
  const lower = label.toLowerCase();
  if (lower.includes('left') || lower.includes(' l ') || lower.startsWith('l ')) return 'left';
  if (lower.includes('right') || lower.includes(' r ') || lower.startsWith('r ')) return 'right';
  return 'both';
}

function muscleMatchesRegion(muscle: IndividualMuscle, region: string): boolean {
  const muscleId = muscle.id.toLowerCase();
  const muscleLabel = muscle.label.toLowerCase();
  const regionKeys = MUSCLE_REGION_MAP[region] || [];
  return regionKeys.some(k => muscleId.includes(k) || muscleLabel.includes(k));
}

function isAbnormal(status: ClinicalStatus): boolean {
  return status !== 'normal';
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function findRelatedChains(
  region: string,
  painLabel: string,
  chains: KineticChainDefinition[]
): PainCorrelation['relatedChains'] {
  const results: PainCorrelation['relatedChains'] = [];
  const chainRegions = REGION_TO_CHAIN_REGIONS[region] || [];
  const adjacentRegions = (ADJACENT_REGIONS[region] || []).flatMap(r => REGION_TO_CHAIN_REGIONS[r] || []);
  const lowerLabel = painLabel.toLowerCase();

  for (const chain of chains) {
    let score = 0;
    let reason = '';
    const relevantLinks: { linkLabel: string; muscles: string[]; forceContribution: string }[] = [];

    for (const link of chain.links) {
      const linkRegionLower = link.region.toLowerCase();
      const directMatch = chainRegions.some(cr => linkRegionLower.includes(cr) || cr.includes(linkRegionLower));
      const adjacentMatch = adjacentRegions.some(cr => linkRegionLower.includes(cr) || cr.includes(linkRegionLower));
      const muscleMatch = link.muscles.some(m => lowerLabel.includes(m.toLowerCase()));

      if (directMatch || muscleMatch) {
        relevantLinks.push({ linkLabel: link.label, muscles: link.muscles, forceContribution: link.forceContribution });
        score += directMatch ? 30 : 0;
        score += muscleMatch ? 20 : 0;
        if (!reason) reason = directMatch ? `Chain passes directly through ${region} region` : `Muscle name match in pain label`;
      } else if (adjacentMatch) {
        relevantLinks.push({ linkLabel: link.label, muscles: link.muscles, forceContribution: link.forceContribution });
        score += 10;
        if (!reason) reason = `Chain passes through adjacent region`;
      }
    }

    if (relevantLinks.length > 0) {
      score = clamp(score, 0, 100);
      results.push({
        chainId: chain.id,
        chainLabel: chain.label,
        chainColor: chain.color,
        relevantLinks,
        relevanceScore: score,
        relevanceReason: reason || `Related via kinetic chain linkage`,
      });
    }
  }

  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function findRelatedForces(
  region: string,
  painLabel: string,
  forces: JointSurfaceForce[]
): PainCorrelation['relatedForces'] {
  const categories = REGION_TO_FORCE_CATEGORIES[region] || [];
  const side = detectSide(painLabel);

  const filteredCategories = categories.filter(cat => {
    if (side === 'both') return true;
    if (side === 'left') return !cat.includes('right');
    return !cat.includes('left');
  });

  const matchingForces = forces.filter(f => filteredCategories.some(cat => f.category === cat));

  const sorted = matchingForces.sort((a, b) => {
    const statusOrder: Record<string, number> = { very_high: 0, high: 1, moderate: 2, low: 3 };
    return (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
  });

  return sorted.map(f => ({
    jointId: f.id,
    jointLabel: f.label,
    status: f.status,
    totalForce: f.totalForce,
    compression: f.compression,
    tension: f.tension,
    shear: f.shear,
    clinical: f.clinical,
    contributionToPin: generateForceContribution(f, region),
  }));
}

function generateForceContribution(force: JointSurfaceForce, region: string): string {
  if (force.status === 'very_high') {
    return `Very high ${force.compression > force.shear ? 'compressive' : 'shear'} loading at ${force.label} directly contributes to ${region} pain through tissue overload`;
  }
  if (force.status === 'high') {
    return `Elevated force at ${force.label} increases tissue stress in the ${region} region, potentially contributing to symptom generation`;
  }
  if (force.status === 'moderate') {
    return `Moderate loading at ${force.label} within physiological range but may contribute to symptoms with sustained postures`;
  }
  return `Low loading at ${force.label} — unlikely to be a primary contributor`;
}

function findRelatedMuscles(
  region: string,
  painLabel: string,
  muscles: IndividualMuscle[],
  chains: PainCorrelation['relatedChains']
): PainCorrelation['relatedMuscles'] {
  const results: PainCorrelation['relatedMuscles'] = [];
  const seen = new Set<string>();
  const adjacentRegionList = ADJACENT_REGIONS[region] || [];

  const chainMuscleNames = new Set<string>();
  for (const chain of chains) {
    for (const link of chain.relevantLinks) {
      for (const m of link.muscles) {
        chainMuscleNames.add(m.toLowerCase());
      }
    }
  }

  for (const muscle of muscles) {
    if (seen.has(muscle.id)) continue;
    const inRegion = muscleMatchesRegion(muscle, region);
    const inAdjacent = adjacentRegionList.some(adjR => muscleMatchesRegion(muscle, adjR));
    const inChain = chainMuscleNames.has(muscle.label.toLowerCase()) ||
      Array.from(chainMuscleNames).some(cn => muscle.label.toLowerCase().includes(cn) || cn.includes(muscle.label.toLowerCase()));

    let contributionType: 'direct' | 'referred' | 'compensatory' = 'direct';
    let shouldInclude = false;
    let explanation = '';

    if (inRegion && isAbnormal(muscle.clinicalStatus)) {
      shouldInclude = true;
      contributionType = 'direct';
      explanation = `${muscle.label} is ${muscle.clinicalStatus} in the pain region — directly contributing to ${region} symptoms`;
    } else if (inAdjacent && (muscle.tightnessPercent > 40 || muscle.inhibitionPercent > 30)) {
      shouldInclude = true;
      contributionType = 'compensatory';
      explanation = `${muscle.label} shows ${muscle.tightnessPercent > 40 ? 'elevated tightness' : 'inhibition'} in adjacent region — compensatory pattern affecting ${region}`;
    } else if (inChain && isAbnormal(muscle.clinicalStatus)) {
      shouldInclude = true;
      contributionType = 'referred';
      explanation = `${muscle.label} is ${muscle.clinicalStatus} and connected via kinetic chain — may refer dysfunction to ${region}`;
    } else if (inRegion && (muscle.tightnessPercent > 40 || muscle.inhibitionPercent > 30)) {
      shouldInclude = true;
      contributionType = 'direct';
      explanation = `${muscle.label} has subclinical dysfunction in the pain region (tightness: ${muscle.tightnessPercent}%, inhibition: ${muscle.inhibitionPercent}%)`;
    }

    if (shouldInclude) {
      seen.add(muscle.id);
      results.push({
        muscleId: muscle.id,
        muscleLabel: muscle.label,
        clinicalStatus: muscle.clinicalStatus,
        tightness: muscle.tightnessPercent,
        activation: muscle.activationPercent,
        inhibition: muscle.inhibitionPercent,
        contributionType,
        explanation,
      });
    }
  }

  return results.sort((a, b) => {
    const typeOrder: Record<string, number> = { direct: 0, referred: 1, compensatory: 2 };
    return (typeOrder[a.contributionType] ?? 3) - (typeOrder[b.contributionType] ?? 3);
  });
}

function detectCompensationPatterns(
  muscles: IndividualMuscle[],
  syndromes: CrossSyndromePattern[],
  chains: KineticChainDefinition[]
): CompensationPattern[] {
  const patterns: CompensationPattern[] = [];

  const findMuscle = (keywords: string[]): IndividualMuscle | undefined => {
    return muscles.find(m => {
      const id = m.id.toLowerCase();
      const label = m.label.toLowerCase();
      return keywords.some(k => id.includes(k) || label.includes(k));
    });
  };

  const findMuscles = (keywords: string[]): IndividualMuscle[] => {
    return muscles.filter(m => {
      const id = m.id.toLowerCase();
      const label = m.label.toLowerCase();
      return keywords.some(k => id.includes(k) || label.includes(k));
    });
  };

  const isTightOrOveractive = (m: IndividualMuscle | undefined): boolean =>
    !!m && (m.clinicalStatus === 'shortened' || m.clinicalStatus === 'overactive' || m.clinicalStatus === 'spasm' || m.tightnessPercent > 40);

  const isWeakOrInhibited = (m: IndividualMuscle | undefined): boolean =>
    !!m && (m.clinicalStatus === 'inhibited' || m.clinicalStatus === 'weak' || m.inhibitionPercent > 30);

  const upperTraps = findMuscles(['upper_trap']);
  const pecs = findMuscles(['pec_major', 'pec_minor', 'pectoralis']);
  const deepNeckFlexors = findMuscles(['deep_neck', 'longus']);
  const lowerTraps = findMuscles(['lower_trap']);

  const upperCrossTight = upperTraps.some(isTightOrOveractive) || pecs.some(isTightOrOveractive);
  const upperCrossWeak = deepNeckFlexors.some(isWeakOrInhibited) || lowerTraps.some(isWeakOrInhibited);

  if (upperCrossTight && upperCrossWeak) {
    const involvedCount = [
      upperTraps.filter(isTightOrOveractive).length,
      pecs.filter(isTightOrOveractive).length,
      deepNeckFlexors.filter(isWeakOrInhibited).length,
      lowerTraps.filter(isWeakOrInhibited).length,
    ].reduce((a, b) => a + b, 0);
    const severity: 'mild' | 'moderate' | 'severe' = involvedCount >= 4 ? 'severe' : involvedCount >= 2 ? 'moderate' : 'mild';

    patterns.push({
      id: 'upper_cross_syndrome',
      label: 'Upper Cross Syndrome',
      description: 'Pattern of tight upper trapezius and pectorals with weak deep neck flexors and lower trapezius, leading to forward head posture and rounded shoulders',
      severity,
      primaryDysfunction: 'Muscle imbalance between anterior/posterior cervicoscapular muscles',
      compensatingStructures: [
        ...upperTraps.filter(isTightOrOveractive).map(m => m.label),
        ...pecs.filter(isTightOrOveractive).map(m => m.label),
      ],
      affectedChains: ['anterior_chain', 'posterior_chain', 'upper_extremity_chain'],
      clinicalSignificance: 'Predisposes to cervicogenic headache, rotator cuff impingement, thoracic outlet syndrome, and temporomandibular dysfunction',
    });
  }

  const hipFlexors = findMuscles(['rect_fem', 'iliopsoas', 'psoas', 'iliacus', 'hip_flex']);
  const erectors = findMuscles(['erector', 'iliocostalis', 'longissimus', 'spinalis']);
  const glutes = findMuscles(['glut_max', 'glut_med']);
  const abdominals = findMuscles(['rect_abd', 'rectus_abd', 'transvers', 'oblique', 'abdominal']);

  const lowerCrossTight = hipFlexors.some(isTightOrOveractive) || erectors.some(isTightOrOveractive);
  const lowerCrossWeak = glutes.some(isWeakOrInhibited) || abdominals.some(isWeakOrInhibited);

  if (lowerCrossTight && lowerCrossWeak) {
    const involvedCount = [
      hipFlexors.filter(isTightOrOveractive).length,
      erectors.filter(isTightOrOveractive).length,
      glutes.filter(isWeakOrInhibited).length,
      abdominals.filter(isWeakOrInhibited).length,
    ].reduce((a, b) => a + b, 0);
    const severity: 'mild' | 'moderate' | 'severe' = involvedCount >= 4 ? 'severe' : involvedCount >= 2 ? 'moderate' : 'mild';

    patterns.push({
      id: 'lower_cross_syndrome',
      label: 'Lower Cross Syndrome',
      description: 'Pattern of tight hip flexors and lumbar erectors with weak gluteals and abdominals, leading to anterior pelvic tilt and increased lumbar lordosis',
      severity,
      primaryDysfunction: 'Muscle imbalance between anterior/posterior lumbopelvic muscles',
      compensatingStructures: [
        ...hipFlexors.filter(isTightOrOveractive).map(m => m.label),
        ...erectors.filter(isTightOrOveractive).map(m => m.label),
      ],
      affectedChains: ['anterior_chain', 'posterior_chain', 'deep_longitudinal', 'lower_extremity_chain'],
      clinicalSignificance: 'Predisposes to lumbar facet syndrome, disc herniation, hip impingement, and sacroiliac dysfunction',
    });
  }

  const calves = findMuscles(['gastroc', 'soleus']);
  const itBand = findMuscles(['tfl', 'it_band', 'tensor']);
  const glutMed = findMuscles(['glut_med', 'glut_min']);
  const tibPost = findMuscles(['tib_post']);

  const pronationTight = calves.some(isTightOrOveractive) || itBand.some(isTightOrOveractive);
  const pronationWeak = glutMed.some(isWeakOrInhibited) || tibPost.some(isWeakOrInhibited);

  if (pronationTight && pronationWeak) {
    const involvedCount = [
      calves.filter(isTightOrOveractive).length,
      itBand.filter(isTightOrOveractive).length,
      glutMed.filter(isWeakOrInhibited).length,
      tibPost.filter(isWeakOrInhibited).length,
    ].reduce((a, b) => a + b, 0);
    const severity: 'mild' | 'moderate' | 'severe' = involvedCount >= 4 ? 'severe' : involvedCount >= 2 ? 'moderate' : 'mild';

    patterns.push({
      id: 'pronation_distortion',
      label: 'Pronation Distortion Syndrome',
      description: 'Pattern of tight calves and IT band with weak gluteus medius and tibialis posterior, leading to excessive foot pronation and knee valgus',
      severity,
      primaryDysfunction: 'Lower extremity muscle imbalance with excessive pronation',
      compensatingStructures: [
        ...calves.filter(isTightOrOveractive).map(m => m.label),
        ...itBand.filter(isTightOrOveractive).map(m => m.label),
      ],
      affectedChains: ['lateral_chain', 'lateral_subsystem', 'lower_extremity_chain'],
      clinicalSignificance: 'Predisposes to plantar fasciitis, Achilles tendinopathy, patellofemoral pain, and ACL injury risk',
    });
  }

  const leftMuscles = muscles.filter(m => m.id.startsWith('l_') || m.label.startsWith('L '));
  const rightMuscles = muscles.filter(m => m.id.startsWith('r_') || m.label.startsWith('R '));
  let lateralImbalanceCount = 0;
  const imbalancedPairs: string[] = [];

  for (const lm of leftMuscles) {
    const baseName = lm.id.replace(/^l_/, '');
    const rm = rightMuscles.find(r => r.id.replace(/^r_/, '') === baseName);
    if (rm) {
      const tightDiff = Math.abs(lm.tightnessPercent - rm.tightnessPercent);
      const actDiff = Math.abs(lm.activationPercent - rm.activationPercent);
      const inhibDiff = Math.abs(lm.inhibitionPercent - rm.inhibitionPercent);
      if (tightDiff > 20 || actDiff > 25 || inhibDiff > 20) {
        lateralImbalanceCount++;
        imbalancedPairs.push(`${lm.label} vs ${rm.label}`);
      }
    }
  }

  if (lateralImbalanceCount >= 3) {
    const severity: 'mild' | 'moderate' | 'severe' = lateralImbalanceCount >= 6 ? 'severe' : lateralImbalanceCount >= 4 ? 'moderate' : 'mild';
    patterns.push({
      id: 'lateral_imbalance',
      label: 'Lateral Muscle Imbalance',
      description: `Asymmetric muscle function detected between left and right sides across ${lateralImbalanceCount} muscle pairs`,
      severity,
      primaryDysfunction: 'Bilateral asymmetry in muscle activation, tightness, or inhibition',
      compensatingStructures: imbalancedPairs.slice(0, 5),
      affectedChains: ['lateral_chain', 'lateral_subsystem', 'spiral_chain'],
      clinicalSignificance: 'Contributes to asymmetric loading, pelvic obliquity, functional leg length discrepancy, and scoliotic compensation',
    });
  }

  const anteriorMuscles = findMuscles(['pec', 'rect_abd', 'rect_fem', 'hip_flex', 'iliopsoas', 'tib_ant', 'scm', 'ant_deltoid']);
  const posteriorMuscles = findMuscles(['glut_max', 'hamstring', 'erector', 'lower_trap', 'rhomboid', 'infraspinatus', 'post_deltoid', 'multifidus']);

  const anteriorTight = anteriorMuscles.filter(isTightOrOveractive).length;
  const posteriorWeak = posteriorMuscles.filter(isWeakOrInhibited).length;

  if (anteriorTight >= 2 && posteriorWeak >= 2) {
    const severity: 'mild' | 'moderate' | 'severe' = (anteriorTight + posteriorWeak) >= 6 ? 'severe' : (anteriorTight + posteriorWeak) >= 4 ? 'moderate' : 'mild';
    patterns.push({
      id: 'anterior_dominance',
      label: 'Anterior Chain Dominance',
      description: 'Pattern of tight/overactive anterior muscles with weak/inhibited posterior muscles',
      severity,
      primaryDysfunction: 'Anterior-posterior muscle imbalance favoring flexor dominance',
      compensatingStructures: anteriorMuscles.filter(isTightOrOveractive).map(m => m.label).slice(0, 5),
      affectedChains: ['anterior_chain', 'posterior_chain'],
      clinicalSignificance: 'Contributes to flexion-dominant posture, increased disc loading, and reduced spinal extension capacity',
    });
  }

  const gluteAll = findMuscles(['glut_max', 'glut_med']);
  const hamstrings = findMuscles(['hamstring']);
  const hipFlexAll = findMuscles(['rect_fem', 'iliopsoas', 'hip_flex', 'psoas']);

  const posteriorChainInhibited = gluteAll.filter(isWeakOrInhibited).length + hamstrings.filter(isWeakOrInhibited).length;
  const hipFlexOveractive = hipFlexAll.filter(isTightOrOveractive).length;

  if (posteriorChainInhibited >= 2 && hipFlexOveractive >= 1) {
    const severity: 'mild' | 'moderate' | 'severe' = posteriorChainInhibited >= 4 ? 'severe' : posteriorChainInhibited >= 2 ? 'moderate' : 'mild';
    patterns.push({
      id: 'posterior_chain_weakness',
      label: 'Posterior Chain Weakness',
      description: 'Inhibited gluteals and hamstrings with overactive hip flexors — common sedentary pattern',
      severity,
      primaryDysfunction: 'Posterior chain inhibition with hip flexor dominance',
      compensatingStructures: hipFlexAll.filter(isTightOrOveractive).map(m => m.label),
      affectedChains: ['posterior_chain', 'posterior_oblique_sling', 'lower_extremity_chain'],
      clinicalSignificance: 'Reduces hip extension capacity, increases lumbar spine loading during activities, and impairs gait propulsion',
    });
  }

  for (const syndrome of syndromes) {
    if (syndrome.detected && !patterns.some(p => p.label.toLowerCase().includes(syndrome.label.toLowerCase().split(' ')[0]))) {
      const severity: 'mild' | 'moderate' | 'severe' = syndrome.severity >= 70 ? 'severe' : syndrome.severity >= 40 ? 'moderate' : 'mild';
      patterns.push({
        id: `syndrome_${syndrome.id}`,
        label: syndrome.label,
        description: syndrome.description,
        severity,
        primaryDysfunction: `Detected ${syndrome.label} pattern`,
        compensatingStructures: [...syndrome.tightMuscles, ...syndrome.weakMuscles],
        affectedChains: [],
        clinicalSignificance: syndrome.description,
      });
    }
  }

  return patterns;
}

function buildRootCauseChain(
  region: string,
  relatedForces: PainCorrelation['relatedForces'],
  relatedMuscles: PainCorrelation['relatedMuscles'],
  chains: PainCorrelation['relatedChains'],
  relatedFascialChains?: PainCorrelation['relatedFascialChains'],
  relatedScars?: PainCorrelation['relatedScars']
): PainCorrelation['rootCauseChain'] {
  const rootCause: PainCorrelation['rootCauseChain'] = [];
  let step = 1;

  const highForce = relatedForces.find(f => f.status === 'very_high' || f.status === 'high');
  if (highForce) {
    rootCause.push({
      step: step++,
      structure: highForce.jointLabel,
      finding: `${highForce.status === 'very_high' ? 'Very high' : 'Elevated'} ${highForce.compression > highForce.shear ? 'compressive' : 'shear'} loading`,
      mechanism: `Increased tissue stress at ${highForce.jointLabel}`,
      arrow: '→',
    });
  }

  const directMuscles = relatedMuscles.filter(m => m.contributionType === 'direct' && m.clinicalStatus !== 'normal');
  if (directMuscles.length > 0) {
    const worst = directMuscles.sort((a, b) => {
      const score = (m: typeof a) => (m.tightness + m.inhibition + (m.clinicalStatus === 'spasm' ? 50 : 0));
      return score(b) - score(a);
    })[0];

    rootCause.push({
      step: step++,
      structure: worst.muscleLabel,
      finding: `${worst.clinicalStatus} (tightness: ${worst.tightness}%, inhibition: ${worst.inhibition}%)`,
      mechanism: worst.clinicalStatus === 'overactive' || worst.clinicalStatus === 'spasm'
        ? `Excessive muscle tension increasing local joint loading`
        : worst.clinicalStatus === 'inhibited' || worst.clinicalStatus === 'weak'
          ? `Reduced muscular support causing compensatory overload`
          : `Altered muscle length-tension relationship`,
      arrow: '→',
    });
  }

  if (relatedFascialChains && relatedFascialChains.length > 0) {
    const highTensionChain = relatedFascialChains.find(fc => fc.avgTension > 60);
    if (highTensionChain) {
      rootCause.push({
        step: step++,
        structure: highTensionChain.chainName,
        finding: `Fascial chain tension elevated (${Math.round(highTensionChain.avgTension)}%), propagation delta ${highTensionChain.propagationDelta > 0 ? '+' : ''}${Math.round(highTensionChain.propagationDelta)}%`,
        mechanism: `Tension propagating through ${highTensionChain.chainName} increasing load at ${region}`,
        arrow: '→',
      });
    }
  }

  if (relatedScars && relatedScars.length > 0) {
    const impactfulScar = relatedScars.find(s => s.impact.restrictedMovements.length > 0 || s.impact.affectedChains.length > 0);
    if (impactfulScar) {
      const restrictions = impactfulScar.impact.restrictedMovements.length > 0
        ? impactfulScar.impact.restrictedMovements.join(', ')
        : 'tissue mobility';
      rootCause.push({
        step: step++,
        structure: `Scar tissue (${impactfulScar.type.replace(/_/g, ' ')})`,
        finding: `Scar restricting ${restrictions}, disrupting ${impactfulScar.impact.affectedChains.length} fascial chain(s)`,
        mechanism: `Scar-induced restriction at ${region} altering force distribution and tissue mobility`,
        arrow: '→',
      });
    }
  }

  const referredMuscles = relatedMuscles.filter(m => m.contributionType === 'referred' && m.clinicalStatus !== 'normal');
  if (referredMuscles.length > 0) {
    const worst = referredMuscles[0];
    rootCause.push({
      step: step++,
      structure: worst.muscleLabel,
      finding: `${worst.clinicalStatus} in connected kinetic chain`,
      mechanism: `Dysfunction propagating through kinetic chain to ${region}`,
      arrow: '→',
    });
  }

  const compMuscles = relatedMuscles.filter(m => m.contributionType === 'compensatory');
  if (compMuscles.length > 0) {
    const worst = compMuscles[0];
    rootCause.push({
      step: step++,
      structure: worst.muscleLabel,
      finding: `Compensatory ${worst.clinicalStatus} pattern`,
      mechanism: `Adjacent region compensation driving dysfunction toward ${region}`,
      arrow: '→',
    });
  }

  if (chains.length > 0) {
    const topChain = chains[0];
    rootCause.push({
      step: step++,
      structure: topChain.chainLabel,
      finding: `Chain integrity compromised`,
      mechanism: `Force transmission altered through ${topChain.chainLabel}, redistributing load to ${region}`,
      arrow: '→',
    });
  }

  if (rootCause.length > 0) {
    rootCause.push({
      step: step++,
      structure: 'Postural adaptation',
      finding: 'Sustained posture or movement pattern',
      mechanism: 'Adaptive tissue changes from habitual positioning or repetitive loading',
      arrow: '(root cause)',
    });
  }

  return rootCause;
}

function findLocalCompensationPatterns(
  region: string,
  relatedMuscles: PainCorrelation['relatedMuscles'],
  compensationPatterns: CompensationPattern[]
): PainCorrelation['compensationPatterns'] {
  const localPatterns: PainCorrelation['compensationPatterns'] = [];

  for (const pattern of compensationPatterns) {
    const regionRelated = pattern.affectedChains.some(chainId => {
      const regionChainMapping: Record<string, string[]> = {
        cervical: ['anterior_chain', 'posterior_chain', 'upper_extremity_chain'],
        thoracic: ['anterior_chain', 'posterior_chain', 'spiral_chain', 'upper_extremity_chain'],
        lumbar: ['anterior_chain', 'posterior_chain', 'deep_longitudinal', 'posterior_oblique_sling'],
        pelvic: ['deep_longitudinal', 'anterior_oblique_sling', 'posterior_oblique_sling'],
        hip: ['lower_extremity_chain', 'lateral_subsystem', 'posterior_oblique_sling', 'anterior_oblique_sling'],
        knee: ['lower_extremity_chain', 'lateral_chain', 'lateral_subsystem'],
        ankle_foot: ['lower_extremity_chain', 'lateral_chain', 'posterior_chain'],
        shoulder: ['upper_extremity_chain', 'anterior_chain', 'spiral_chain'],
        upper_extremity: ['upper_extremity_chain'],
      };
      return (regionChainMapping[region] || []).includes(chainId);
    });

    if (regionRelated || pattern.compensatingStructures.some(s => relatedMuscles.some(m => m.muscleLabel.includes(s) || s.includes(m.muscleLabel)))) {
      localPatterns.push({
        pattern: pattern.label,
        description: pattern.description,
        severity: pattern.severity,
        involvedStructures: pattern.compensatingStructures,
      });
    }
  }

  return localPatterns;
}

function calculateRiskScore(
  painMarkers: PainMarker[],
  forces: JointSurfaceForce[],
  muscles: IndividualMuscle[],
  compensations: CompensationPattern[]
): number {
  let score = 0;

  const painScore = painMarkers.reduce((sum, pm) => sum + (pm.severity ?? 5) * 2, 0);
  score += Math.min(painScore, 30);

  const highForces = forces.filter(f => f.status === 'high' || f.status === 'very_high').length;
  score += Math.min(highForces * 3, 25);

  const abnormalMuscles = muscles.filter(m => isAbnormal(m.clinicalStatus)).length;
  score += Math.min(abnormalMuscles * 1.5, 25);

  const compScore = compensations.reduce((sum, c) => {
    return sum + (c.severity === 'severe' ? 5 : c.severity === 'moderate' ? 3 : 1);
  }, 0);
  score += Math.min(compScore, 20);

  return clamp(Math.round(score), 0, 100);
}

function buildClinicalPriorities(
  painCorrelations: PainCorrelation[],
  syndromes: CrossSyndromePattern[],
  muscles: IndividualMuscle[],
  compensations: CompensationPattern[]
): CrossSystemCorrelationResult['clinicalPriorities'] {
  const priorities: CrossSystemCorrelationResult['clinicalPriorities'] = [];
  let pri = 1;

  for (const pc of painCorrelations) {
    const veryHighForces = pc.relatedForces.filter(f => f.status === 'very_high');
    if (veryHighForces.length > 0) {
      priorities.push({
        priority: pri++,
        area: pc.region,
        finding: `Pain at ${pc.markerLabel} with very high force loading at ${veryHighForces.map(f => f.jointLabel).join(', ')}`,
        action: 'Immediate load reduction strategies, posture modification, and targeted decompression techniques',
      });
    }
  }

  for (const s of syndromes.filter(s => s.detected)) {
    priorities.push({
      priority: pri++,
      area: s.label,
      finding: `${s.label} detected (severity: ${s.severity}%)`,
      action: `Address tight muscles (${s.tightMuscles.join(', ')}) and strengthen weak muscles (${s.weakMuscles.join(', ')})`,
    });
  }

  const spasmMuscles = muscles.filter(m => m.clinicalStatus === 'spasm' || m.tightnessPercent > 70);
  for (const m of spasmMuscles.slice(0, 3)) {
    priorities.push({
      priority: pri++,
      area: m.label,
      finding: `${m.label} in ${m.clinicalStatus} (tightness: ${m.tightnessPercent}%)`,
      action: 'Manual therapy, soft tissue release, and neuromuscular re-education',
    });
  }

  const criticalStabilizers = muscles.filter(m => {
    const id = m.id.toLowerCase();
    const isStabilizer = id.includes('glut_med') || id.includes('deep_neck') || id.includes('multifidus') || id.includes('transvers') || id.includes('longus');
    return isStabilizer && (m.clinicalStatus === 'inhibited' || m.clinicalStatus === 'weak');
  });

  for (const m of criticalStabilizers.slice(0, 3)) {
    priorities.push({
      priority: pri++,
      area: m.label,
      finding: `Primary stabilizer ${m.label} is ${m.clinicalStatus} (inhibition: ${m.inhibitionPercent}%)`,
      action: 'Isolated activation drills, motor control retraining, and progressive loading',
    });
  }

  for (const comp of compensations.filter(c => c.severity === 'severe').slice(0, 2)) {
    priorities.push({
      priority: pri++,
      area: comp.label,
      finding: comp.description,
      action: `Address primary dysfunction: ${comp.primaryDysfunction}. Retrain movement patterns.`,
    });
  }

  return priorities;
}

function buildSummaryFindings(
  painCorrelations: PainCorrelation[],
  compensations: CompensationPattern[],
  riskScore: number,
  muscles: IndividualMuscle[],
  forces: JointSurfaceForce[]
): string[] {
  const findings: string[] = [];

  if (painCorrelations.length > 0) {
    findings.push(`${painCorrelations.length} pain region${painCorrelations.length > 1 ? 's' : ''} identified with cross-system correlations`);
  }

  const highForceCount = forces.filter(f => f.status === 'high' || f.status === 'very_high').length;
  if (highForceCount > 0) {
    findings.push(`${highForceCount} joint${highForceCount > 1 ? 's' : ''} with elevated or very high loading detected`);
  }

  const abnormalCount = muscles.filter(m => isAbnormal(m.clinicalStatus)).length;
  if (abnormalCount > 0) {
    findings.push(`${abnormalCount} muscle${abnormalCount > 1 ? 's' : ''} with abnormal clinical status identified`);
  }

  if (compensations.length > 0) {
    findings.push(`${compensations.length} compensation pattern${compensations.length > 1 ? 's' : ''} detected: ${compensations.map(c => c.label).join(', ')}`);
  }

  const spasmCount = muscles.filter(m => m.clinicalStatus === 'spasm').length;
  if (spasmCount > 0) {
    findings.push(`${spasmCount} muscle${spasmCount > 1 ? 's' : ''} in spasm requiring immediate attention`);
  }

  const riskCategory = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'moderate' : 'low';
  findings.push(`Overall clinical risk score: ${riskScore}/100 (${riskCategory} risk)`);

  for (const pc of painCorrelations) {
    if (pc.rootCauseChain.length >= 3) {
      const chain = pc.rootCauseChain.map(r => r.structure).join(' → ');
      findings.push(`Root cause chain for ${pc.markerLabel}: ${chain}`);
    }
  }

  return findings;
}

function findRelatedFascialChainsForMarker(
  markerLabel: string,
  region: string,
  fascialChainData?: CorrelationInput['fascialChainData']
): PainCorrelation['relatedFascialChains'] {
  if (!fascialChainData) return [];

  const { chains, tensions, propagatedEffects } = fascialChainData;
  const results: PainCorrelation['relatedFascialChains'] = [];

  const boneMatches = new Set<string>();
  const regionBoneMap: Record<string, string[]> = {
    lumbar: ['Spine1_M', 'RootPart1_M'],
    thoracic: ['Spine1_M', 'Chest_M'],
    cervical: ['Neck_M'],
    hip: ['Hip_L', 'Hip_R', 'HipPart2_L', 'HipPart2_R'],
    knee: ['Knee_L', 'Knee_R'],
    ankle_foot: ['Ankle_L', 'Ankle_R', 'Toes_L', 'Toes_R'],
    shoulder: ['Shoulder_L', 'Shoulder_R', 'Scapula_L', 'Scapula_R'],
    pelvic: ['RootPart1_M', 'Hip_L', 'Hip_R'],
    upper_extremity: ['Elbow_L', 'Elbow_R'],
  };

  const regionBones = regionBoneMap[region] || [];
  for (const bone of regionBones) {
    const chainHits = findChainsForBone(bone);
    for (const hit of chainHits) {
      boneMatches.add(hit.chainId);
    }
  }

  for (const chain of chains) {
    const chainMuscleIds = chain.links.map(l => l.muscleId);
    const chainTensions = chainMuscleIds.map(mid => tensions[mid] ?? 50);
    const avgTension = chainTensions.length > 0
      ? chainTensions.reduce((a, b) => a + b, 0) / chainTensions.length
      : 50;

    let totalPropDelta = 0;
    if (propagatedEffects) {
      for (const mid of chainMuscleIds) {
        const pe = propagatedEffects[mid];
        if (pe) {
          totalPropDelta += pe.totalChainTension;
        }
      }
    }
    const avgPropDelta = chainMuscleIds.length > 0 ? totalPropDelta / chainMuscleIds.length : 0;

    const passesThrough = boneMatches.has(chain.id) || chainMuscleIds.some(mid => {
      const muscleRegionKeys = MUSCLE_REGION_MAP[region] || [];
      return muscleRegionKeys.some(k => mid.includes(k));
    });

    if (!passesThrough && Math.abs(avgTension - 50) < 10) continue;

    let relevance: string;
    if (passesThrough && avgTension > 60) {
      relevance = `Chain passes through ${region} with elevated tension (${Math.round(avgTension)}%)`;
    } else if (passesThrough) {
      relevance = `Chain passes through ${region} region`;
    } else if (avgTension > 65) {
      relevance = `High tension chain (${Math.round(avgTension)}%) may contribute to regional loading`;
    } else {
      continue;
    }

    results.push({
      chainId: chain.id,
      chainName: chain.name,
      avgTension: Math.round(avgTension * 10) / 10,
      propagationDelta: Math.round(avgPropDelta * 10) / 10,
      relevance,
    });
  }

  return results.sort((a, b) => b.avgTension - a.avgTension);
}

function findRelatedScarsForMarker(
  markerLabel: string,
  region: string,
  scarData?: CorrelationInput['scarData']
): PainCorrelation['relatedScars'] {
  if (!scarData) return [];

  const results: PainCorrelation['relatedScars'] = [];
  const regionBoneMap: Record<string, string[]> = {
    lumbar: ['Spine1_M', 'RootPart1_M'],
    thoracic: ['Spine1_M', 'Chest_M'],
    cervical: ['Neck_M'],
    hip: ['Hip_L', 'Hip_R', 'HipPart2_L', 'HipPart2_R'],
    knee: ['Knee_L', 'Knee_R'],
    ankle_foot: ['Ankle_L', 'Ankle_R', 'Toes_L', 'Toes_R'],
    shoulder: ['Shoulder_L', 'Shoulder_R', 'Scapula_L', 'Scapula_R'],
    pelvic: ['RootPart1_M', 'Hip_L', 'Hip_R'],
    upper_extremity: ['Elbow_L', 'Elbow_R'],
  };

  const regionBones = new Set(regionBoneMap[region] || []);
  const adjacentRegions = ADJACENT_REGIONS[region] || [];
  const adjacentBones = new Set<string>();
  for (const adjRegion of adjacentRegions) {
    for (const bone of (regionBoneMap[adjRegion] || [])) {
      adjacentBones.add(bone);
    }
  }

  for (const scar of scarData.scars) {
    const scarBone = scar.nearestBone;
    const parentBone = scarBone.replace(/Part[12]_[LR]$/, '').replace(/_[LR]$/, '');

    const isInRegion = regionBones.has(scarBone) || Array.from(regionBones).some(rb => rb.includes(parentBone) || parentBone.includes(rb.replace(/_[LRM]$/, '')));
    const isAdjacent = adjacentBones.has(scarBone) || Array.from(adjacentBones).some(ab => ab.includes(parentBone) || parentBone.includes(ab.replace(/_[LRM]$/, '')));

    if (!isInRegion && !isAdjacent) continue;

    const impact = getScarImpact(scar);
    const proximity = isInRegion ? 'direct' : 'adjacent';

    results.push({
      scarId: scar.id,
      type: scar.type,
      impact,
      proximity,
    });
  }

  return results;
}

export function computeCrossSystemCorrelation(input: CorrelationInput): CrossSystemCorrelationResult {
  const { painMarkers, forces, muscles, muscleGroups, syndromes, kineticChains, bodyWeightKg, fascialChainData, scarData } = input;

  const allChains = kineticChains.length > 0 ? kineticChains : KINETIC_CHAINS;

  const globalCompensations = detectCompensationPatterns(muscles, syndromes, allChains);

  const painCorrelations: PainCorrelation[] = painMarkers.map(marker => {
    const region = mapPainToRegion(marker.label);
    const severity = marker.severity ?? 5;

    const relatedChains = findRelatedChains(region, marker.label, allChains);
    const relatedForces = findRelatedForces(region, marker.label, forces);
    const relatedMuscles = findRelatedMuscles(region, marker.label, muscles, relatedChains);
    const compensationPatterns = findLocalCompensationPatterns(region, relatedMuscles, globalCompensations);

    const relatedFascialChains = findRelatedFascialChainsForMarker(marker.label, region, fascialChainData);
    const relatedScars = findRelatedScarsForMarker(marker.label, region, scarData);

    const rootCauseChain = buildRootCauseChain(region, relatedForces, relatedMuscles, relatedChains, relatedFascialChains, relatedScars);

    return {
      markerId: marker.id,
      markerLabel: marker.label,
      severity,
      region,
      relatedChains,
      relatedForces,
      relatedMuscles,
      compensationPatterns,
      relatedFascialChains,
      relatedScars,
      rootCauseChain,
    };
  });

  const overallRiskScore = calculateRiskScore(painMarkers, forces, muscles, globalCompensations);
  const clinicalPriorities = buildClinicalPriorities(painCorrelations, syndromes, muscles, globalCompensations);
  const summaryFindings = buildSummaryFindings(painCorrelations, globalCompensations, overallRiskScore, muscles, forces);

  return {
    painCorrelations,
    globalCompensations,
    overallRiskScore,
    clinicalPriorities,
    summaryFindings,
  };
}
