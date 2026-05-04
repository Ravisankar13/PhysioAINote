export interface ExternalLoadConfig {
  leftHandKg?: number;
  rightHandKg?: number;
}

interface JointAngles {
  spine?: { cervicalLordosis?: number; thoracicKyphosis?: number; lumbarLordosis?: number; scoliosis?: number; forwardHead?: number; lateralShift?: number; cervicalRotation?: number; cervicalLateralFlexion?: number; thoracicRotation?: number; lumbarRotation?: number; flexion?: number; lateralFlexion?: number; lumbarScoliosis?: number; thoracicScoliosis?: number; cervicalScoliosis?: number };
  neck?: { flexion?: number; extension?: number; rotation?: number; lateralFlexion?: number; forwardHead?: number };
  pelvis?: { tilt?: number; obliquity?: number; rotation?: number; drop?: number; leftInnominateRotation?: number; rightInnominateRotation?: number };
  sacrum?: { nutation?: number; counternutation?: number; torsion?: number; lateralFlexion?: number };
  leftHip?: { flexion?: number; extension?: number; abduction?: number; adduction?: number; internalRotation?: number; externalRotation?: number; anteversion?: number; neckShaftAngle?: number };
  rightHip?: { flexion?: number; extension?: number; abduction?: number; adduction?: number; internalRotation?: number; externalRotation?: number; anteversion?: number; neckShaftAngle?: number };
  leftKnee?: { flexion?: number; varus?: number; tibialTorsion?: number; recurvatum?: number; tibialSlope?: number };
  rightKnee?: { flexion?: number; varus?: number; tibialTorsion?: number; recurvatum?: number; tibialSlope?: number };
  leftAnkle?: { dorsiflexion?: number; plantarflexion?: number; inversion?: number; eversion?: number; forefootVarus?: number; toeExtension?: number };
  rightAnkle?: { dorsiflexion?: number; plantarflexion?: number; inversion?: number; eversion?: number; forefootVarus?: number; toeExtension?: number };
  leftShoulder?: { flexion?: number; extension?: number; abduction?: number; internalRotation?: number; externalRotation?: number; horizontalAdduction?: number };
  rightShoulder?: { flexion?: number; extension?: number; abduction?: number; internalRotation?: number; externalRotation?: number; horizontalAdduction?: number };
  leftScapula?: { protraction?: number; elevation?: number; upwardRotation?: number; anteriorTilt?: number; winging?: number };
  rightScapula?: { protraction?: number; elevation?: number; upwardRotation?: number; anteriorTilt?: number; winging?: number };
  leftElbow?: { flexion?: number; pronation?: number; supination?: number; valgus?: number };
  rightElbow?: { flexion?: number; pronation?: number; supination?: number; valgus?: number };
  leftWrist?: { flexion?: number; extension?: number; radialDeviation?: number; ulnarDeviation?: number; pronation?: number };
  rightWrist?: { flexion?: number; extension?: number; radialDeviation?: number; ulnarDeviation?: number; pronation?: number };
  externalLoads?: ExternalLoadConfig;
  bodyWeightKg?: number;
  [key: string]: any;
}

const SEGMENT_MASS_PCT: Record<string, number> = {
  head: 0.081,
  trunk: 0.497,
  upperTrunk: 0.216,
  lowerTrunk: 0.281,
  upperArm: 0.028,
  forearm: 0.016,
  hand: 0.006,
  thigh: 0.100,
  shank: 0.047,
  foot: 0.015,
};

const deg2rad = (d: number) => (d * Math.PI) / 180;
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

// Gravitational moment about a proximal joint from a chain of distal
// segments + optional hand-held load. Segment masses: de Leva (1996).
// A fully-extended horizontal chain returns leverArmFrac = 1.0.

export interface ChainSegment {
  /** Mass of this segment as fraction of body weight (de Leva 1996). */
  massBwFrac: number;
  /** Length of this segment normalized within the chain. */
  normLen: number;
  /** Global angle of segment from vertical down (gravity), in degrees. */
  angleDeg: number;
}

export interface ChainMomentInput {
  segments: ChainSegment[];
  /** Optional hand-held load in kilograms applied at the distal end. */
  externalLoadKg?: number;
  /** Body weight in kilograms (used to convert externalLoadKg → BW frac). */
  bodyWeightKg?: number;
}

export interface ChainMomentResult {
  /** Total chain weight (segments + external load) in BW fractions. */
  totalWeightBwFrac: number;
  /**
   * Effective lever-arm fraction (0..1). 1.0 corresponds to a chain held
   * straight horizontal (every segment at 90° from gravity), which preserves
   * the magnitude of the previous `sin(jointAngle)` approximation so the
   * existing `(1 + leverArm × gain)` calibrations carry over without
   * re-tuning the gain constants.
   */
  leverArmFrac: number;
}

export function computeChainMoment(input: ChainMomentInput): ChainMomentResult {
  const externalKg = Math.max(0, input.externalLoadKg ?? 0);
  const bodyWeightKg = Math.max(1, input.bodyWeightKg ?? 70);
  const externalBwFrac = externalKg / bodyWeightKg;

  let cumulativeProximalX = 0;     // signed cumulative distal-end position
  let cumulativeProximalXMax = 0;  // cumulative position with all segments at 90°
  let momentNum = 0;               // signed Σ mᵢ × xᵢ_COM
  let momentDenom = 0;             // Σ mᵢ × xᵢ_COMmax (positive, normalizer)
  let totalWeight = 0;

  for (const seg of input.segments) {
    const sinA = Math.sin(deg2rad(seg.angleDeg));
    const distalX = cumulativeProximalX + seg.normLen * sinA;
    const comX = cumulativeProximalX + (seg.normLen * 0.5) * sinA;
    const comXMax = cumulativeProximalXMax + seg.normLen * 0.5;

    momentNum += seg.massBwFrac * comX;
    momentDenom += seg.massBwFrac * comXMax;
    totalWeight += seg.massBwFrac;

    cumulativeProximalX = distalX;
    cumulativeProximalXMax += seg.normLen;
  }

  if (externalBwFrac > 0) {
    momentNum += externalBwFrac * cumulativeProximalX;
    momentDenom += externalBwFrac * cumulativeProximalXMax;
    totalWeight += externalBwFrac;
  }

  const leverArmFrac = momentDenom > 0
    ? clamp(Math.abs(momentNum) / momentDenom, 0, 1)
    : 0;

  return { totalWeightBwFrac: totalWeight, leverArmFrac };
}

function loadForSide(config: JointAngles, side: 'left' | 'right'): number {
  const ext = config.externalLoads;
  if (!ext) return 0;
  const v = side === 'left' ? ext.leftHandKg : ext.rightHandKg;
  return Math.max(0, v ?? 0);
}

function bodyWeightOf(config: JointAngles): number {
  const bw = config.bodyWeightKg;
  return bw && bw > 0 ? bw : 70;
}

const MAX_FORCE_BW = 12.0;
const MIN_FORCE_BW = 0;
function clampForce(v: number): number { return clamp(Math.abs(v), MIN_FORCE_BW, MAX_FORCE_BW); }

export type ForceType = 'compression' | 'tension' | 'shear';

export interface JointSurfaceForce {
  id: string;
  label: string;
  category: string;
  boneName: string;
  compression: number;
  tension: number;
  shear: number;
  totalForce: number;
  status: 'low' | 'moderate' | 'high' | 'very_high';
  clinical: string;
  enabled: boolean;
}

export interface ForceCategory {
  id: string;
  label: string;
  joints: JointSurfaceForce[];
  collapsed: boolean;
}

export interface ForceAnalysisResult {
  categories: ForceCategory[];
  joints: JointSurfaceForce[];
  totalBodyCOM: { x: number; y: number };
  baseSupportShift: number;
}

function getStatus(bw: number): 'low' | 'moderate' | 'high' | 'very_high' {
  if (bw < 0.8) return 'low';
  if (bw < 1.5) return 'moderate';
  if (bw < 3.0) return 'high';
  return 'very_high';
}

function getClinicalNote(bw: number, jointType: string): string {
  const notes: Record<string, Record<string, string>> = {
    facet: {
      low: 'Minimal facet loading — normal unloaded position',
      moderate: 'Normal standing facet load — within physiological range',
      high: 'Elevated facet compression — potential for facet irritation and referral pain',
      very_high: 'High facet loading — risk of facet arthrosis, may reproduce concordant pain',
    },
    disc: {
      low: 'Minimal disc pressure — favorable intradiscal environment',
      moderate: 'Normal disc loading — hydrostatic pressure within disc tolerance',
      high: 'Elevated intradiscal pressure — increased annular stress, monitor for discogenic symptoms',
      very_high: 'High disc compression — risk of annular disruption, nuclear migration if pre-existing pathology',
    },
    hip: {
      low: 'Minimal hip joint reaction force',
      moderate: 'Normal standing hip load — within cartilage tolerance',
      high: 'Elevated hip loading — potential labral/cartilage stress',
      very_high: 'High hip force — risk of labral damage, FAI symptoms, cartilage degeneration',
    },
    patellofemoral: {
      low: 'Minimal PFJ contact force',
      moderate: 'Normal PFJ loading — physiological contact stress',
      high: 'Elevated PFJ force — potential anterior knee pain, chondromalacia risk',
      very_high: 'Very high PFJ stress — significant risk of patellofemoral pain syndrome',
    },
    tibiofemoral: {
      low: 'Minimal tibiofemoral load',
      moderate: 'Normal TFJ compression — within meniscal tolerance',
      high: 'Elevated TFJ load — increased meniscal and cartilage stress',
      very_high: 'High TFJ force — risk of meniscal damage, OA progression',
    },
    ankle: {
      low: 'Minimal talocrural loading',
      moderate: 'Normal ankle joint reaction force',
      high: 'Elevated ankle load — monitor for osteochondral stress',
      very_high: 'High talocrural force — risk of cartilage damage, impingement',
    },
    shoulder: {
      low: 'Minimal GH joint load — favorable rotator cuff environment',
      moderate: 'Normal GH loading — rotator cuff working within capacity',
      high: 'Elevated GH force — consider elbow flexion or loaded-carry adjustment to shorten the lever',
      very_high: 'High GH loading — reduce external load and bend the elbow to off-load the rotator cuff',
    },
    generic: {
      low: 'Minimal loading',
      moderate: 'Normal functional loading',
      high: 'Elevated load — monitor for symptom reproduction',
      very_high: 'High load — potential tissue stress risk',
    },
  };
  const status = getStatus(bw);
  return (notes[jointType] || notes.generic)[status];
}

function computeSpineForces(config: JointAngles): JointSurfaceForce[] {
  const joints: JointSurfaceForce[] = [];
  const headMass = SEGMENT_MASS_PCT.head;
  const armMass = (SEGMENT_MASS_PCT.upperArm + SEGMENT_MASS_PCT.forearm + SEGMENT_MASS_PCT.hand) * 2;
  const upperTrunkMass = SEGMENT_MASS_PCT.upperTrunk;
  const lowerTrunkMass = SEGMENT_MASS_PCT.lowerTrunk;

  const neckFlex = Math.abs(config.neck?.flexion ?? 0);
  const neckExt = Math.abs(config.neck?.extension ?? 0);
  const neckRot = Math.abs(config.neck?.rotation ?? 0);
  const neckLat = Math.abs(config.neck?.lateralFlexion ?? 0);
  const forwardHead = Math.abs(config.spine?.forwardHead ?? config.neck?.forwardHead ?? 0);
  const cervLord = Math.abs(config.spine?.cervicalLordosis ?? 0);
  const thorKyph = Math.abs(config.spine?.thoracicKyphosis ?? 0);
  const lumLord = Math.abs(config.spine?.lumbarLordosis ?? 0);
  const scoliosis = Math.abs(config.spine?.scoliosis ?? 0);
  const lumbarScol = Math.abs(config.spine?.lumbarScoliosis ?? 0);
  const thorScol = Math.abs(config.spine?.thoracicScoliosis ?? 0);
  const cervScol = Math.abs(config.spine?.cervicalScoliosis ?? 0);
  const latShift = Math.abs(config.spine?.lateralShift ?? 0);
  const spineFlexion = Math.abs(config.spine?.flexion ?? 0);
  const spineLat = Math.abs(config.spine?.lateralFlexion ?? 0);
  const thorRot = Math.abs(config.spine?.thoracicRotation ?? 0);
  const lumRot = Math.abs(config.spine?.lumbarRotation ?? 0);
  const cervRot = Math.abs(config.spine?.cervicalRotation ?? 0);
  const pelvisTilt = config.pelvis?.tilt ?? 0;
  const sacrumNut = Math.abs(config.sacrum?.nutation ?? 0);

  const cervFlexAngle = neckFlex + cervLord * 0.3 + forwardHead * 0.8;
  const cervLeverArm = Math.sin(deg2rad(clamp(cervFlexAngle, 0, 60)));
  const cervMomentMult = 1 + cervLeverArm * 4.0;

  const c01Comp = headMass * cervMomentMult * (1 + 0.02 * cervScol);
  const c01Shear = headMass * cervLeverArm * 0.5;
  const c01Tension = headMass * 0.3 * (1 + 0.01 * neckExt + 0.01 * forwardHead);
  joints.push({ id: 'c0c1_facet', label: 'C0-C1 (Atlanto-occipital)', category: 'cervical_spine', boneName: 'Neck_M', compression: c01Comp, tension: c01Tension, shear: c01Shear, totalForce: c01Comp + c01Shear, status: getStatus(c01Comp), clinical: getClinicalNote(c01Comp, 'facet'), enabled: true });

  const c12Comp = headMass * cervMomentMult * 1.05 * (1 + 0.03 * neckRot + 0.02 * cervRot);
  const c12Shear = headMass * cervLeverArm * 0.55 + headMass * 0.02 * neckRot;
  const c12Tension = headMass * 0.35 * (1 + 0.015 * neckRot);
  joints.push({ id: 'c1c2_facet', label: 'C1-C2 (Atlanto-axial)', category: 'cervical_spine', boneName: 'Neck_M', compression: c12Comp, tension: c12Tension, shear: c12Shear, totalForce: c12Comp + c12Shear, status: getStatus(c12Comp), clinical: getClinicalNote(c12Comp, 'facet'), enabled: true });

  const midCervComp = headMass * cervMomentMult * 1.15 * (1 + 0.01 * neckLat + 0.02 * cervScol);
  const midCervShear = headMass * cervLeverArm * 0.6;
  const midCervTension = headMass * 0.25 * (1 + 0.02 * forwardHead);
  joints.push({ id: 'c3c5_facet', label: 'C3-C5 Mid-Cervical Facets', category: 'cervical_spine', boneName: 'Neck_M', compression: midCervComp, tension: midCervTension, shear: midCervShear, totalForce: midCervComp + midCervShear, status: getStatus(midCervComp), clinical: getClinicalNote(midCervComp, 'facet'), enabled: true });

  const midCervDiscComp = headMass * cervMomentMult * 1.2;
  const midCervDiscShear = headMass * cervLeverArm * 0.45;
  const midCervDiscTension = headMass * 0.15 * (1 + 0.01 * neckExt);
  joints.push({ id: 'c3c5_disc', label: 'C3-C5 Intervertebral Discs', category: 'cervical_spine', boneName: 'Neck_M', compression: midCervDiscComp, tension: midCervDiscTension, shear: midCervDiscShear, totalForce: midCervDiscComp + midCervDiscShear, status: getStatus(midCervDiscComp), clinical: getClinicalNote(midCervDiscComp, 'disc'), enabled: true });

  const lowCervAbove = headMass + upperTrunkMass * 0.1;
  const lowCervComp = lowCervAbove * cervMomentMult * 1.25 * (1 + 0.015 * cervScol + 0.01 * thorKyph * 0.3);
  const lowCervShear = lowCervAbove * cervLeverArm * 0.65;
  const lowCervTension = lowCervAbove * 0.2 * (1 + 0.02 * forwardHead + 0.01 * cervLord);
  joints.push({ id: 'c5c7_facet', label: 'C5-C7 Lower Cervical Facets', category: 'cervical_spine', boneName: 'Neck_M', compression: lowCervComp, tension: lowCervTension, shear: lowCervShear, totalForce: lowCervComp + lowCervShear, status: getStatus(lowCervComp), clinical: getClinicalNote(lowCervComp, 'facet'), enabled: true });

  const lowCervDiscComp = lowCervAbove * cervMomentMult * 1.3;
  const lowCervDiscShear = lowCervAbove * cervLeverArm * 0.5;
  joints.push({ id: 'c5c7_disc', label: 'C5-C7 Intervertebral Discs', category: 'cervical_spine', boneName: 'Neck_M', compression: lowCervDiscComp, tension: lowCervAbove * 0.15, shear: lowCervDiscShear, totalForce: lowCervDiscComp + lowCervDiscShear, status: getStatus(lowCervDiscComp), clinical: getClinicalNote(lowCervDiscComp, 'disc'), enabled: true });

  const thorAbove = headMass + upperTrunkMass * 0.3 + armMass * 0.5;
  const thorFlexAngle = thorKyph + spineFlexion * 0.4;
  const thorLeverArm = Math.sin(deg2rad(clamp(thorFlexAngle, 0, 80)));
  const thorMomentMult = 1 + thorLeverArm * 3.0;

  const ctjComp = thorAbove * thorMomentMult * 1.15 * (1 + 0.01 * thorScol);
  const ctjShear = thorAbove * thorLeverArm * 0.5;
  joints.push({ id: 'ctj_facet', label: 'Cervicothoracic Junction (C7-T1)', category: 'thoracic_spine', boneName: 'Chest_M', compression: ctjComp, tension: thorAbove * 0.2, shear: ctjShear, totalForce: ctjComp + ctjShear, status: getStatus(ctjComp), clinical: getClinicalNote(ctjComp, 'facet'), enabled: true });

  const upperThorAbove = headMass + upperTrunkMass * 0.5 + armMass;
  const upperThorComp = upperThorAbove * thorMomentMult * 1.1 * (1 + 0.015 * thorScol + 0.01 * thorRot);
  const upperThorShear = upperThorAbove * thorLeverArm * 0.45;
  joints.push({ id: 't1t4_facet', label: 'T1-T4 Upper Thoracic Facets', category: 'thoracic_spine', boneName: 'Chest_M', compression: upperThorComp, tension: upperThorAbove * 0.15, shear: upperThorShear, totalForce: upperThorComp + upperThorShear, status: getStatus(upperThorComp), clinical: getClinicalNote(upperThorComp, 'facet'), enabled: true });

  const costotransComp = upperThorAbove * 0.15 * (1 + 0.02 * thorRot + 0.02 * thorKyph);
  const costotransShear = upperThorAbove * 0.05 * (1 + 0.03 * thorRot);
  joints.push({ id: 'costotrans', label: 'Costovertebral/Costotransverse', category: 'thoracic_spine', boneName: 'Spine1Part2_M', compression: costotransComp, tension: upperThorAbove * 0.08, shear: costotransShear, totalForce: costotransComp + costotransShear, status: getStatus(costotransComp), clinical: getClinicalNote(costotransComp, 'generic'), enabled: true });

  const midThorAbove = headMass + upperTrunkMass + armMass;
  const midThorComp = midThorAbove * thorMomentMult * 1.15 * (1 + 0.02 * thorScol);
  const midThorShear = midThorAbove * thorLeverArm * 0.5;
  const midThorDiscComp = midThorAbove * thorMomentMult * 1.2;
  joints.push({ id: 't5t8_facet', label: 'T5-T8 Mid-Thoracic Facets', category: 'thoracic_spine', boneName: 'Spine1Part2_M', compression: midThorComp, tension: midThorAbove * 0.12, shear: midThorShear, totalForce: midThorComp + midThorShear, status: getStatus(midThorComp), clinical: getClinicalNote(midThorComp, 'facet'), enabled: true });
  joints.push({ id: 't5t8_disc', label: 'T5-T8 Intervertebral Discs', category: 'thoracic_spine', boneName: 'Spine1Part2_M', compression: midThorDiscComp, tension: midThorAbove * 0.1, shear: midThorShear * 0.8, totalForce: midThorDiscComp + midThorShear * 0.8, status: getStatus(midThorDiscComp), clinical: getClinicalNote(midThorDiscComp, 'disc'), enabled: true });

  const lowThorAbove = headMass + SEGMENT_MASS_PCT.trunk * 0.7 + armMass;
  const lowThorComp = lowThorAbove * thorMomentMult * 1.2 * (1 + 0.02 * thorScol + 0.01 * lumbarScol * 0.5);
  const lowThorShear = lowThorAbove * thorLeverArm * 0.55;
  joints.push({ id: 't9t12_facet', label: 'T9-T12 Lower Thoracic Facets', category: 'thoracic_spine', boneName: 'Spine1Part2_M', compression: lowThorComp, tension: lowThorAbove * 0.1, shear: lowThorShear, totalForce: lowThorComp + lowThorShear, status: getStatus(lowThorComp), clinical: getClinicalNote(lowThorComp, 'facet'), enabled: true });

  const tljAbove = headMass + SEGMENT_MASS_PCT.trunk * 0.75 + armMass;
  const tljComp = tljAbove * thorMomentMult * 1.25;
  const tljShear = tljAbove * thorLeverArm * 0.6;
  joints.push({ id: 'tlj_facet', label: 'Thoracolumbar Junction (T12-L1)', category: 'thoracic_spine', boneName: 'Spine1Part2_M', compression: tljComp, tension: tljAbove * 0.12, shear: tljShear, totalForce: tljComp + tljShear, status: getStatus(tljComp), clinical: getClinicalNote(tljComp, 'facet'), enabled: true });

  const lumAbove = headMass + SEGMENT_MASS_PCT.trunk * 0.6 + armMass;
  const lumFlexAngle = lumLord + spineFlexion * 0.6 + Math.abs(pelvisTilt) * 0.5;
  const lumLeverArm = Math.sin(deg2rad(clamp(lumFlexAngle, 0, 90)));
  const lumMomentMult = 1 + lumLeverArm * 3.5;
  const lumLatFactor = 1 + 0.02 * latShift + 0.015 * scoliosis + 0.02 * lumbarScol + 0.01 * spineLat;

  // Hand-held load × horizontal distance amplifier (Marras 1995; NIOSH 1993).
  const lKg = loadForSide(config, 'left');
  const rKg = loadForSide(config, 'right');
  const totalExternalKg = lKg + rKg;
  const externalBwFrac = totalExternalKg / bodyWeightOf(config);
  let externalLumbarBoost = 0;
  if (externalBwFrac > 0) {
    const trunkFwd = Math.sin(deg2rad(clamp(lumFlexAngle, 0, 90))) * 0.3;
    const lShoulder = Math.max(Math.abs(config.leftShoulder?.flexion ?? 0),
                               Math.abs(config.leftShoulder?.abduction ?? 0));
    const rShoulder = Math.max(Math.abs(config.rightShoulder?.flexion ?? 0),
                               Math.abs(config.rightShoulder?.abduction ?? 0));
    const lForearm = lShoulder + Math.min(Math.abs(config.leftElbow?.flexion ?? 0), 150);
    const rForearm = rShoulder + Math.min(Math.abs(config.rightElbow?.flexion ?? 0), 150);
    const lHandX = 0.215 * Math.abs(Math.sin(deg2rad(lShoulder)))
                 + 0.17  * Math.abs(Math.sin(deg2rad(lForearm)))
                 + 0.115 * Math.abs(Math.sin(deg2rad(lForearm)));
    const rHandX = 0.215 * Math.abs(Math.sin(deg2rad(rShoulder)))
                 + 0.17  * Math.abs(Math.sin(deg2rad(rForearm)))
                 + 0.115 * Math.abs(Math.sin(deg2rad(rForearm)));
    // Per-hand load-weighted reach so unilateral carries use the loaded side.
    const handFwdLoadWeighted = totalExternalKg > 0
      ? (lKg * lHandX + rKg * rHandX) / totalExternalKg
      : (lHandX + rHandX) * 0.5;
    const handXFromSpine = trunkFwd + handFwdLoadWeighted;
    externalLumbarBoost = externalBwFrac * Math.min(handXFromSpine, 1.2) * 8.0;
  }

  const l1l2Comp = lumAbove * lumMomentMult * 0.9 * lumLatFactor;
  const l1l2Shear = lumAbove * lumLeverArm * 0.5;
  const l1l2Tension = lumAbove * 0.15 * (1 + 0.01 * lumLord);
  // Discs absorb full load moment, facets ~60% (Schultz & Andersson 1981).
  const l1l2FacetComp = l1l2Comp + externalLumbarBoost * 0.65 * 0.6;
  const l1l2DiscComp  = l1l2Comp * 1.1 + externalLumbarBoost * 0.65 * 1.0;
  joints.push({ id: 'l1l2_facet', label: 'L1-L2 Facet Joint', category: 'lumbar_spine', boneName: 'Spine1Part1_M', compression: l1l2FacetComp, tension: l1l2Tension, shear: l1l2Shear, totalForce: l1l2FacetComp + l1l2Shear, status: getStatus(l1l2FacetComp), clinical: getClinicalNote(l1l2FacetComp, 'facet'), enabled: true });
  joints.push({ id: 'l1l2_disc', label: 'L1-L2 Intervertebral Disc', category: 'lumbar_spine', boneName: 'Spine1Part1_M', compression: l1l2DiscComp, tension: l1l2Tension * 0.8, shear: l1l2Shear * 0.9, totalForce: l1l2DiscComp + l1l2Shear * 0.9, status: getStatus(l1l2DiscComp), clinical: getClinicalNote(l1l2DiscComp, 'disc'), enabled: true });

  const l3l4Above = headMass + SEGMENT_MASS_PCT.trunk * 0.55 + armMass;
  const l3l4Comp = l3l4Above * lumMomentMult * 1.05 * lumLatFactor * (1 + 0.01 * lumRot);
  const l3l4Shear = l3l4Above * lumLeverArm * 0.55;
  const l3l4FacetComp = l3l4Comp + externalLumbarBoost * 0.85 * 0.6;
  const l3l4DiscComp  = l3l4Comp * 1.15 + externalLumbarBoost * 0.85 * 1.0;
  joints.push({ id: 'l3l4_facet', label: 'L3-L4 Facet Joint', category: 'lumbar_spine', boneName: 'Spine1_M', compression: l3l4FacetComp, tension: l3l4Above * 0.12, shear: l3l4Shear, totalForce: l3l4FacetComp + l3l4Shear, status: getStatus(l3l4FacetComp), clinical: getClinicalNote(l3l4FacetComp, 'facet'), enabled: true });
  joints.push({ id: 'l3l4_disc', label: 'L3-L4 Intervertebral Disc', category: 'lumbar_spine', boneName: 'Spine1_M', compression: l3l4DiscComp, tension: l3l4Above * 0.1, shear: l3l4Shear * 0.85, totalForce: l3l4DiscComp + l3l4Shear * 0.85, status: getStatus(l3l4DiscComp), clinical: getClinicalNote(l3l4DiscComp, 'disc'), enabled: true });

  const l45Above = headMass + SEGMENT_MASS_PCT.trunk * 0.5 + armMass;
  const l45Comp = l45Above * lumMomentMult * 1.2 * lumLatFactor * (1 + 0.015 * lumRot + 0.01 * sacrumNut);
  const l45Shear = l45Above * lumLeverArm * 0.6 + l45Above * Math.abs(pelvisTilt) * 0.012;
  const l45Tension = l45Above * 0.18 * (1 + 0.015 * lumLord);
  const l45FacetComp = l45Comp + externalLumbarBoost * 1.0 * 0.6;
  const l45DiscComp  = l45Comp * 1.2 + externalLumbarBoost * 1.0 * 1.0;
  joints.push({ id: 'l4l5_facet', label: 'L4-L5 Facet Joint', category: 'lumbar_spine', boneName: 'RootPart2_M', compression: l45FacetComp, tension: l45Tension, shear: l45Shear, totalForce: l45FacetComp + l45Shear, status: getStatus(l45FacetComp), clinical: getClinicalNote(l45FacetComp, 'facet'), enabled: true });
  joints.push({ id: 'l4l5_disc', label: 'L4-L5 Intervertebral Disc', category: 'lumbar_spine', boneName: 'RootPart2_M', compression: l45DiscComp, tension: l45Tension * 0.8, shear: l45Shear * 0.9, totalForce: l45DiscComp + l45Shear * 0.9, status: getStatus(l45DiscComp), clinical: getClinicalNote(l45DiscComp, 'disc'), enabled: true });

  const l5s1Above = headMass + SEGMENT_MASS_PCT.trunk * 0.45 + armMass;
  const sacralAngle = Math.abs(pelvisTilt) + lumLord * 0.4 + sacrumNut;
  const l5s1SacralShearFactor = Math.sin(deg2rad(clamp(sacralAngle, 0, 60)));
  const l5s1Comp = l5s1Above * lumMomentMult * 1.35 * lumLatFactor * (1 + 0.02 * sacrumNut);
  const l5s1Shear = l5s1Above * (lumLeverArm * 0.65 + l5s1SacralShearFactor * 0.4) + l5s1Above * Math.abs(pelvisTilt) * 0.015;
  const l5s1Tension = l5s1Above * 0.22 * (1 + 0.02 * lumLord + 0.015 * sacrumNut);
  // L5-S1 takes the largest external-load amplification (Marras 1995).
  const l5s1FacetComp = l5s1Comp + externalLumbarBoost * 1.1 * 0.6;
  const l5s1DiscComp  = l5s1Comp * 1.25 + externalLumbarBoost * 1.1 * 1.0;
  joints.push({ id: 'l5s1_facet', label: 'L5-S1 Facet Joint', category: 'lumbar_spine', boneName: 'RootPart1_M', compression: l5s1FacetComp, tension: l5s1Tension, shear: l5s1Shear, totalForce: l5s1FacetComp + l5s1Shear, status: getStatus(l5s1FacetComp), clinical: getClinicalNote(l5s1FacetComp, 'facet'), enabled: true });
  joints.push({ id: 'l5s1_disc', label: 'L5-S1 Intervertebral Disc', category: 'lumbar_spine', boneName: 'RootPart1_M', compression: l5s1DiscComp, tension: l5s1Tension * 0.75, shear: l5s1Shear * 1.1, totalForce: l5s1DiscComp + l5s1Shear * 1.1, status: getStatus(l5s1DiscComp), clinical: getClinicalNote(l5s1DiscComp, 'disc'), enabled: true });

  const siAbove = headMass + SEGMENT_MASS_PCT.trunk + armMass;
  const siTorsion = Math.abs(config.sacrum?.torsion ?? 0);
  const siLat = Math.abs(config.sacrum?.lateralFlexion ?? 0);
  const pelvisObliquity = Math.abs(config.pelvis?.obliquity ?? 0);
  const siComp = siAbove * 0.5 * (1 + 0.02 * sacrumNut + 0.015 * Math.abs(pelvisTilt) + 0.01 * pelvisObliquity);
  const siShear = siAbove * 0.15 * (1 + 0.03 * siTorsion + 0.02 * siLat + 0.015 * pelvisObliquity);
  const siTension = siAbove * 0.1 * (1 + 0.02 * sacrumNut + 0.01 * siTorsion);
  joints.push({ id: 'si_left', label: 'Left Sacroiliac Joint', category: 'pelvis_sacrum', boneName: 'Hip_L', compression: siComp * (1 + 0.01 * pelvisObliquity), tension: siTension, shear: siShear, totalForce: siComp + siShear, status: getStatus(siComp), clinical: getClinicalNote(siComp, 'generic'), enabled: true });
  joints.push({ id: 'si_right', label: 'Right Sacroiliac Joint', category: 'pelvis_sacrum', boneName: 'Hip_R', compression: siComp * (1 + 0.01 * pelvisObliquity), tension: siTension, shear: siShear, totalForce: siComp + siShear, status: getStatus(siComp), clinical: getClinicalNote(siComp, 'generic'), enabled: true });

  const pubSymComp = siAbove * 0.08 * (1 + 0.02 * pelvisObliquity + 0.01 * siTorsion);
  const pubSymShear = siAbove * 0.04 * (1 + 0.03 * pelvisObliquity);
  joints.push({ id: 'pubic_symphysis', label: 'Pubic Symphysis', category: 'pelvis_sacrum', boneName: 'Root_M', compression: pubSymComp, tension: pubSymComp * 0.5, shear: pubSymShear, totalForce: pubSymComp + pubSymShear, status: getStatus(pubSymComp), clinical: getClinicalNote(pubSymComp, 'generic'), enabled: true });

  return joints;
}

function computeHipForces(config: JointAngles, side: 'left' | 'right'): JointSurfaceForce[] {
  const joints: JointSurfaceForce[] = [];
  const prefix = side === 'left' ? 'leftHip' : 'rightHip';
  const hip = config[prefix] || {};
  const boneNameHip = side === 'left' ? 'Hip_L' : 'Hip_R';
  const boneNameKnee = side === 'left' ? 'Knee_L' : 'Knee_R';
  const sideLabel = side === 'left' ? 'Left' : 'Right';

  const aboveHip = SEGMENT_MASS_PCT.head + SEGMENT_MASS_PCT.trunk + (SEGMENT_MASS_PCT.upperArm + SEGMENT_MASS_PCT.forearm + SEGMENT_MASS_PCT.hand) * 2;
  const thighMass = SEGMENT_MASS_PCT.thigh;

  const flex = Math.abs(hip.flexion ?? 0);
  const ext = Math.abs(hip.extension ?? 0);
  const abd = Math.abs(hip.abduction ?? 0);
  const add = Math.abs(hip.adduction ?? 0);
  const intRot = Math.abs(hip.internalRotation ?? 0);
  const extRot = Math.abs(hip.externalRotation ?? 0);
  const antev = Math.abs(hip.anteversion ?? 0);
  const neckShaft = Math.abs(hip.neckShaftAngle ?? 0);

  const pelvisTilt = Math.abs(config.pelvis?.tilt ?? 0);
  const pelvisObl = Math.abs(config.pelvis?.obliquity ?? 0);
  const sacrumNut = Math.abs(config.sacrum?.nutation ?? 0);

  const hipFlexAngle = flex + ext + pelvisTilt * 0.3 + sacrumNut * 0.2;
  const sinFlex = Math.sin(deg2rad(clamp(hipFlexAngle, 0, 120)));
  const abdFactor = 1 + 0.02 * abd + 0.02 * add;
  const rotFactor = 1 + 0.01 * intRot + 0.01 * extRot + 0.015 * antev;

  // Leg-chain moment about the hip (knee flexion folds shank → reduces SLR demand).
  const kneeKey = side === 'left' ? 'leftKnee' : 'rightKnee';
  const kneeFlexHere = Math.abs((config[kneeKey] as JointAngles['leftKnee'])?.flexion ?? 0);
  const thighGlobal = hipFlexAngle;
  const shankGlobal = thighGlobal - Math.min(kneeFlexHere, 140);
  const legChain = computeChainMoment({
    segments: [
      { massBwFrac: SEGMENT_MASS_PCT.thigh, normLen: 0.55, angleDeg: thighGlobal },
      { massBwFrac: SEGMENT_MASS_PCT.shank, normLen: 0.40, angleDeg: shankGlobal },
      { massBwFrac: SEGMENT_MASS_PCT.foot,  normLen: 0.05, angleDeg: shankGlobal },
    ],
  });
  const legChainGravityComp = legChain.totalWeightBwFrac * legChain.leverArmFrac * 3.0;

  const fhComp = aboveHip * 0.5 * (1 + sinFlex * 2.5) * abdFactor * rotFactor
               + thighMass * 0.5
               + legChainGravityComp;
  const fhShear = aboveHip * 0.5 * sinFlex * 0.3 * rotFactor;
  const fhTension = aboveHip * 0.1 * (1 + 0.01 * abd + 0.015 * antev);
  joints.push({ id: `${side}_femoral_head`, label: `${sideLabel} Femoral Head`, category: `${side}_hip`, boneName: boneNameHip, compression: fhComp, tension: fhTension, shear: fhShear, totalForce: fhComp + fhShear, status: getStatus(fhComp), clinical: getClinicalNote(fhComp, 'hip'), enabled: true });

  const labralComp = fhComp * 0.2 * (1 + 0.03 * antev + 0.02 * intRot);
  const labralShear = fhComp * 0.15 * (1 + 0.04 * antev + 0.03 * flex * 0.01);
  const labralTension = fhComp * 0.08 * (1 + 0.02 * abd + 0.02 * extRot);
  joints.push({ id: `${side}_labrum`, label: `${sideLabel} Acetabular Labrum`, category: `${side}_hip`, boneName: boneNameHip, compression: labralComp, tension: labralTension, shear: labralShear, totalForce: labralComp + labralShear, status: getStatus(labralShear > labralComp ? labralShear : labralComp), clinical: getClinicalNote(labralShear, 'hip'), enabled: true });

  const capsComp = fhComp * 0.1;
  const capsTension = fhComp * 0.15 * (1 + 0.02 * ext + 0.015 * extRot + 0.01 * abd);
  joints.push({ id: `${side}_hip_capsule`, label: `${sideLabel} Hip Capsule/Ligaments`, category: `${side}_hip`, boneName: boneNameHip, compression: capsComp, tension: capsTension, shear: fhShear * 0.3, totalForce: capsComp + capsTension, status: getStatus(capsTension), clinical: getClinicalNote(capsTension, 'generic'), enabled: true });

  const neckShaftFactor = 1 + 0.02 * neckShaft;
  const femoralNeckComp = fhComp * 0.8 * neckShaftFactor;
  const femoralNeckShear = fhComp * 0.2 * neckShaftFactor;
  const femoralNeckTension = fhComp * 0.1 * neckShaftFactor;
  joints.push({ id: `${side}_femoral_neck`, label: `${sideLabel} Femoral Neck`, category: `${side}_hip`, boneName: boneNameHip, compression: femoralNeckComp, tension: femoralNeckTension, shear: femoralNeckShear, totalForce: femoralNeckComp + femoralNeckShear, status: getStatus(femoralNeckComp), clinical: getClinicalNote(femoralNeckComp, 'hip'), enabled: true });

  return joints;
}

function computeKneeForces(config: JointAngles, side: 'left' | 'right'): JointSurfaceForce[] {
  const joints: JointSurfaceForce[] = [];
  const kneeKey = side === 'left' ? 'leftKnee' : 'rightKnee';
  const hipKey = side === 'left' ? 'leftHip' : 'rightHip';
  const ankleKey = side === 'left' ? 'leftAnkle' : 'rightAnkle';
  const knee = config[kneeKey] || {};
  const hip = config[hipKey] || {};
  const ankle = config[ankleKey] || {};
  const boneName = side === 'left' ? 'Knee_L' : 'Knee_R';
  const ankleBone = side === 'left' ? 'Ankle_L' : 'Ankle_R';
  const sideLabel = side === 'left' ? 'Left' : 'Right';

  const aboveKnee = (SEGMENT_MASS_PCT.head + SEGMENT_MASS_PCT.trunk + (SEGMENT_MASS_PCT.upperArm + SEGMENT_MASS_PCT.forearm + SEGMENT_MASS_PCT.hand) * 2) * 0.5 + SEGMENT_MASS_PCT.thigh;
  const hipFlex = Math.abs(hip.flexion ?? 0);
  const hipAntev = Math.abs(hip.anteversion ?? 0);
  const hipIntRot = Math.abs(hip.internalRotation ?? 0);

  const kneeFlex = Math.abs(knee.flexion ?? 0);
  const kneeVarus = Math.abs(knee.varus ?? 0);
  const tibTorsion = Math.abs(knee.tibialTorsion ?? 0);
  const recurvatum = Math.abs(knee.recurvatum ?? 0);
  const tibSlope = Math.abs(knee.tibialSlope ?? 0);
  const ankleDF = Math.abs(ankle.dorsiflexion ?? 0);

  const kneeFlexRad = deg2rad(clamp(kneeFlex, 0, 140));
  const hipFlexContrib = 1 + Math.sin(deg2rad(clamp(hipFlex, 0, 120))) * 0.5;
  const valgusFromHip = hipAntev * 0.3 + hipIntRot * 0.2;
  const totalVarusValgus = kneeVarus + valgusFromHip;

  // Shank-orientation chain: vertical shank reduces PFJ load vs anterior translation.
  const thighGlobal = hipFlex;
  const shankGlobal = thighGlobal - Math.min(kneeFlex, 140);
  const lowerLegChain = computeChainMoment({
    segments: [
      { massBwFrac: SEGMENT_MASS_PCT.shank, normLen: 0.85, angleDeg: shankGlobal },
      { massBwFrac: SEGMENT_MASS_PCT.foot,  normLen: 0.15, angleDeg: shankGlobal },
    ],
  });
  const shankLeverFactor = 0.7 + lowerLegChain.leverArmFrac * 0.6;

  const pfMultiplier = 1 + Math.sin(kneeFlexRad) * 4.0 * shankLeverFactor;
  const pfComp = aboveKnee * pfMultiplier * hipFlexContrib * 0.5;
  const pfShear = pfComp * Math.sin(kneeFlexRad) * 0.12;
  const pfTension = aboveKnee * 0.3 * (1 + Math.sin(kneeFlexRad) * 2.0);
  joints.push({ id: `${side}_patellofemoral`, label: `${sideLabel} Patellofemoral Joint`, category: `${side}_knee`, boneName, compression: pfComp, tension: pfTension, shear: pfShear, totalForce: pfComp + pfShear, status: getStatus(pfComp), clinical: getClinicalNote(pfComp, 'patellofemoral'), enabled: true });

  const tfComp = aboveKnee * (1 + Math.sin(kneeFlexRad) * 2.0) * hipFlexContrib * 0.5;
  const tfShear = tfComp * Math.sin(kneeFlexRad) * 0.15 + aboveKnee * tibSlope * 0.005;
  const tfTension = aboveKnee * 0.08 * (1 + 0.01 * recurvatum);
  const varusFactor = 1 + 0.03 * totalVarusValgus;
  const medComp = tfComp * varusFactor * (kneeVarus > 0 ? 1.15 : 0.85);
  const latComp = tfComp * varusFactor * (kneeVarus > 0 ? 0.85 : 1.15);
  joints.push({ id: `${side}_tf_medial`, label: `${sideLabel} Medial Tibiofemoral`, category: `${side}_knee`, boneName, compression: medComp, tension: tfTension, shear: tfShear, totalForce: medComp + tfShear, status: getStatus(medComp), clinical: getClinicalNote(medComp, 'tibiofemoral'), enabled: true });
  joints.push({ id: `${side}_tf_lateral`, label: `${sideLabel} Lateral Tibiofemoral`, category: `${side}_knee`, boneName, compression: latComp, tension: tfTension * 0.9, shear: tfShear * 0.9, totalForce: latComp + tfShear * 0.9, status: getStatus(latComp), clinical: getClinicalNote(latComp, 'tibiofemoral'), enabled: true });

  const medMeniscus = medComp * 0.5;
  const latMeniscus = latComp * 0.45;
  joints.push({ id: `${side}_medial_meniscus`, label: `${sideLabel} Medial Meniscus`, category: `${side}_knee`, boneName, compression: medMeniscus, tension: medMeniscus * 0.3, shear: medMeniscus * 0.15, totalForce: medMeniscus, status: getStatus(medMeniscus), clinical: getClinicalNote(medMeniscus, 'tibiofemoral'), enabled: true });
  joints.push({ id: `${side}_lateral_meniscus`, label: `${sideLabel} Lateral Meniscus`, category: `${side}_knee`, boneName, compression: latMeniscus, tension: latMeniscus * 0.25, shear: latMeniscus * 0.12, totalForce: latMeniscus, status: getStatus(latMeniscus), clinical: getClinicalNote(latMeniscus, 'tibiofemoral'), enabled: true });

  const aclTension = aboveKnee * 0.15 * (1 + 0.02 * tibSlope) * (kneeFlex < 30 ? 1.5 : 1.0) * (1 + 0.01 * recurvatum);
  const pclTension = aboveKnee * 0.1 * (1 + Math.sin(kneeFlexRad) * 1.5) * (kneeFlex > 60 ? 1.3 : 1.0);
  joints.push({ id: `${side}_acl`, label: `${sideLabel} ACL`, category: `${side}_knee`, boneName, compression: 0, tension: aclTension, shear: 0, totalForce: aclTension, status: getStatus(aclTension), clinical: getClinicalNote(aclTension, 'generic'), enabled: true });
  joints.push({ id: `${side}_pcl`, label: `${sideLabel} PCL`, category: `${side}_knee`, boneName, compression: 0, tension: pclTension, shear: 0, totalForce: pclTension, status: getStatus(pclTension), clinical: getClinicalNote(pclTension, 'generic'), enabled: true });

  const tibFibComp = tfComp * 0.08 * (1 + 0.02 * tibTorsion + 0.01 * ankleDF);
  const tibFibShear = tibFibComp * 0.4 * (1 + 0.03 * tibTorsion);
  joints.push({ id: `${side}_prox_tibfib`, label: `${sideLabel} Proximal Tibiofibular`, category: `${side}_knee`, boneName, compression: tibFibComp, tension: tibFibComp * 0.2, shear: tibFibShear, totalForce: tibFibComp + tibFibShear, status: getStatus(tibFibComp), clinical: getClinicalNote(tibFibComp, 'generic'), enabled: true });

  return joints;
}

function computeAnkleForces(config: JointAngles, side: 'left' | 'right'): JointSurfaceForce[] {
  const joints: JointSurfaceForce[] = [];
  const ankleKey = side === 'left' ? 'leftAnkle' : 'rightAnkle';
  const kneeKey = side === 'left' ? 'leftKnee' : 'rightKnee';
  const hipKey = side === 'left' ? 'leftHip' : 'rightHip';
  const ankle = config[ankleKey] || {};
  const knee = config[kneeKey] || {};
  const hip = config[hipKey] || {};
  const boneName = side === 'left' ? 'Ankle_L' : 'Ankle_R';
  const toeBone = side === 'left' ? 'Toes_L' : 'Toes_R';
  const sideLabel = side === 'left' ? 'Left' : 'Right';

  const aboveAnkle = (SEGMENT_MASS_PCT.head + SEGMENT_MASS_PCT.trunk + (SEGMENT_MASS_PCT.upperArm + SEGMENT_MASS_PCT.forearm + SEGMENT_MASS_PCT.hand) * 2) * 0.5 + SEGMENT_MASS_PCT.thigh + SEGMENT_MASS_PCT.shank;

  const df = Math.abs(ankle.dorsiflexion ?? 0);
  const pf = Math.abs(ankle.plantarflexion ?? 0);
  const inv = Math.abs(ankle.inversion ?? 0);
  const ev = Math.abs(ankle.eversion ?? 0);
  const ffVarus = Math.abs(ankle.forefootVarus ?? 0);
  const toeExt = Math.abs(ankle.toeExtension ?? 0);
  const kneeFlex = Math.abs(knee.flexion ?? 0);
  const kneeVarus = Math.abs(knee.varus ?? 0);
  const tibTorsion = Math.abs(knee.tibialTorsion ?? 0);
  const hipIntRot = Math.abs(hip.internalRotation ?? 0);

  const ankleAngle = Math.max(df, pf);
  const ankleMoment = Math.sin(deg2rad(clamp(ankleAngle, 0, 50)));

  const chainFromAbove = 1 + 0.005 * tibTorsion + 0.003 * kneeVarus + 0.002 * hipIntRot;

  const tcComp = aboveAnkle * (1 + ankleMoment * 1.5) * 0.5 * chainFromAbove;
  const tcShear = aboveAnkle * ankleMoment * 0.2 * chainFromAbove;
  const tcTension = aboveAnkle * 0.08 * (1 + 0.01 * df);
  joints.push({ id: `${side}_talocrural`, label: `${sideLabel} Talocrural (Ankle Mortise)`, category: `${side}_ankle`, boneName, compression: tcComp, tension: tcTension, shear: tcShear, totalForce: tcComp + tcShear, status: getStatus(tcComp), clinical: getClinicalNote(tcComp, 'ankle'), enabled: true });

  const invEvFactor = 1 + 0.03 * inv + 0.02 * ev + 0.02 * ffVarus;
  const stComp = aboveAnkle * 0.35 * invEvFactor * chainFromAbove;
  const stShear = aboveAnkle * 0.12 * invEvFactor;
  const stTension = aboveAnkle * 0.05 * (1 + 0.02 * inv);
  joints.push({ id: `${side}_subtalar`, label: `${sideLabel} Subtalar Joint`, category: `${side}_ankle`, boneName, compression: stComp, tension: stTension, shear: stShear, totalForce: stComp + stShear, status: getStatus(stComp), clinical: getClinicalNote(stComp, 'ankle'), enabled: true });

  const distTfComp = aboveAnkle * 0.06 * (1 + 0.02 * df + 0.01 * ev);
  const distTfShear = distTfComp * 0.5;
  joints.push({ id: `${side}_dist_tibfib`, label: `${sideLabel} Distal Tibiofibular (Syndesmosis)`, category: `${side}_ankle`, boneName, compression: distTfComp, tension: distTfComp * 0.3, shear: distTfShear, totalForce: distTfComp + distTfShear, status: getStatus(distTfComp), clinical: getClinicalNote(distTfComp, 'generic'), enabled: true });

  const mtComp = aboveAnkle * 0.2 * (1 + 0.03 * ffVarus + 0.02 * inv + 0.01 * ev) * chainFromAbove;
  const mtShear = mtComp * 0.25;
  joints.push({ id: `${side}_midtarsal`, label: `${sideLabel} Midtarsal (Chopart's)`, category: `${side}_ankle`, boneName, compression: mtComp, tension: mtComp * 0.15, shear: mtShear, totalForce: mtComp + mtShear, status: getStatus(mtComp), clinical: getClinicalNote(mtComp, 'generic'), enabled: true });

  const tmtComp = aboveAnkle * 0.12 * (1 + 0.04 * ffVarus + 0.02 * toeExt * 0.5);
  joints.push({ id: `${side}_tmt`, label: `${sideLabel} Tarsometatarsal (Lisfranc)`, category: `${side}_ankle`, boneName, compression: tmtComp, tension: tmtComp * 0.2, shear: tmtComp * 0.15, totalForce: tmtComp, status: getStatus(tmtComp), clinical: getClinicalNote(tmtComp, 'generic'), enabled: true });

  const pfTension = aboveAnkle * 0.08 * (1 + 0.03 * toeExt + 0.02 * df + 0.02 * ffVarus);
  joints.push({ id: `${side}_plantar_fascia`, label: `${sideLabel} Plantar Fascia`, category: `${side}_ankle`, boneName: toeBone, compression: 0, tension: pfTension, shear: 0, totalForce: pfTension, status: getStatus(pfTension), clinical: getClinicalNote(pfTension, 'generic'), enabled: true });

  const mtpComp = aboveAnkle * 0.08 * (1 + 0.04 * toeExt + 0.02 * ffVarus);
  joints.push({ id: `${side}_1st_mtp`, label: `${sideLabel} 1st MTP Joint`, category: `${side}_ankle`, boneName: toeBone, compression: mtpComp, tension: mtpComp * 0.15, shear: mtpComp * 0.1, totalForce: mtpComp, status: getStatus(mtpComp), clinical: getClinicalNote(mtpComp, 'generic'), enabled: true });

  return joints;
}

function computeShoulderForces(config: JointAngles, side: 'left' | 'right'): JointSurfaceForce[] {
  const joints: JointSurfaceForce[] = [];
  const shoulderKey = side === 'left' ? 'leftShoulder' : 'rightShoulder';
  const scapKey = side === 'left' ? 'leftScapula' : 'rightScapula';
  const elbowKey = side === 'left' ? 'leftElbow' : 'rightElbow';
  const shoulder = config[shoulderKey] || {};
  const scap = config[scapKey] || {};
  const elbow = config[elbowKey] || {};
  const boneName = side === 'left' ? 'Shoulder_L' : 'Shoulder_R';
  const scapBone = side === 'left' ? 'Scapula_L' : 'Scapula_R';
  const sideLabel = side === 'left' ? 'Left' : 'Right';

  const flex = Math.abs(shoulder.flexion ?? 0);
  const ext = Math.abs(shoulder.extension ?? 0);
  const abd = Math.abs(shoulder.abduction ?? 0);
  const intRot = Math.abs(shoulder.internalRotation ?? 0);
  const extRot = Math.abs(shoulder.externalRotation ?? 0);
  const horizAdd = Math.abs(shoulder.horizontalAdduction ?? 0);
  const elbFlex = Math.abs(elbow.flexion ?? 0);
  const scapProt = Math.abs(scap.protraction ?? 0);
  const scapElev = Math.abs(scap.elevation ?? 0);
  const scapUpRot = Math.abs(scap.upwardRotation ?? 0);
  const scapAntTilt = Math.abs(scap.anteriorTilt ?? 0);
  const scapWing = Math.abs(scap.winging ?? 0);

  const thorKyph = Math.abs(config.spine?.thoracicKyphosis ?? 0);

  // Chain about GH (Veeger & van der Helm 2007; de Leva 1996).
  const leverAngle = Math.max(flex, abd);
  const upperArmGlobalDeg = leverAngle;
  const forearmGlobalDeg = upperArmGlobalDeg + Math.min(elbFlex, 150);
  const externalLoadKg = loadForSide(config, side);
  const armChain = computeChainMoment({
    segments: [
      { massBwFrac: SEGMENT_MASS_PCT.upperArm, normLen: 0.43, angleDeg: upperArmGlobalDeg },
      { massBwFrac: SEGMENT_MASS_PCT.forearm,  normLen: 0.34, angleDeg: forearmGlobalDeg },
      { massBwFrac: SEGMENT_MASS_PCT.hand,     normLen: 0.23, angleDeg: forearmGlobalDeg },
    ],
    externalLoadKg,
    bodyWeightKg: bodyWeightOf(config),
  });
  const leverArm = armChain.leverArmFrac;
  const armChainWeight = armChain.totalWeightBwFrac;
  const ghComp = armChainWeight * (1 + leverArm * 5.0);
  const ghShear = ghComp * 0.15 * (1 + 0.02 * intRot + 0.02 * extRot + 0.01 * horizAdd);
  const ghTension = armChainWeight * 0.5 * leverArm * (1 + 0.01 * ext);

  const kyphFactor = 1 + 0.01 * thorKyph;
  const scapDyskFactor = 1 + 0.02 * scapWing + 0.015 * scapAntTilt + 0.01 * scapProt;

  joints.push({ id: `${side}_gh`, label: `${sideLabel} Glenohumeral (GH)`, category: `${side}_shoulder`, boneName, compression: ghComp * kyphFactor * scapDyskFactor, tension: ghTension * scapDyskFactor, shear: ghShear * kyphFactor * scapDyskFactor, totalForce: ghComp * kyphFactor + ghShear, status: getStatus(ghComp * kyphFactor * scapDyskFactor), clinical: getClinicalNote(ghComp * kyphFactor * scapDyskFactor, 'shoulder'), enabled: true });

  const rcTension = ghComp * 0.6 * scapDyskFactor * (1 + 0.015 * intRot + 0.015 * extRot);
  const rcComp = ghComp * 0.1;
  joints.push({ id: `${side}_rotator_cuff`, label: `${sideLabel} Rotator Cuff Complex`, category: `${side}_shoulder`, boneName, compression: rcComp, tension: rcTension, shear: rcTension * 0.15, totalForce: rcTension, status: getStatus(rcTension), clinical: getClinicalNote(rcTension, 'shoulder'), enabled: true });

  const subacromialComp = armChainWeight * leverArm * 2.0 * scapDyskFactor * kyphFactor;
  const isImpingementZone = leverAngle > 60 && leverAngle < 120;
  const impingementFactor = isImpingementZone ? 1.5 : 1.0;
  joints.push({ id: `${side}_subacromial`, label: `${sideLabel} Subacromial Space`, category: `${side}_shoulder`, boneName, compression: subacromialComp * impingementFactor, tension: 0, shear: subacromialComp * 0.2 * impingementFactor, totalForce: subacromialComp * impingementFactor, status: getStatus(subacromialComp * impingementFactor), clinical: getClinicalNote(subacromialComp * impingementFactor, 'shoulder'), enabled: true });

  const acComp = armChainWeight * 0.3 * (1 + leverArm * 1.5 + 0.02 * horizAdd + 0.02 * scapProt);
  const acShear = acComp * 0.3;
  joints.push({ id: `${side}_ac`, label: `${sideLabel} Acromioclavicular (AC)`, category: `${side}_shoulder`, boneName: scapBone, compression: acComp, tension: acComp * 0.2, shear: acShear, totalForce: acComp + acShear, status: getStatus(acComp), clinical: getClinicalNote(acComp, 'generic'), enabled: true });

  const scComp = armChainWeight * 0.2 * (1 + leverArm * 1.0 + 0.02 * scapElev + 0.01 * scapProt);
  const scShear = scComp * 0.25;
  joints.push({ id: `${side}_sc`, label: `${sideLabel} Sternoclavicular (SC)`, category: `${side}_shoulder`, boneName: scapBone, compression: scComp, tension: scComp * 0.15, shear: scShear, totalForce: scComp + scShear, status: getStatus(scComp), clinical: getClinicalNote(scComp, 'generic'), enabled: true });

  const stComp = armChainWeight * 0.15 * (1 + 0.02 * scapWing + 0.02 * scapAntTilt + 0.01 * scapUpRot);
  joints.push({ id: `${side}_scapthor`, label: `${sideLabel} Scapulothoracic`, category: `${side}_shoulder`, boneName: scapBone, compression: stComp, tension: stComp * 0.5, shear: stComp * 0.2, totalForce: stComp, status: getStatus(stComp), clinical: getClinicalNote(stComp, 'generic'), enabled: true });

  return joints;
}

function computeElbowForces(config: JointAngles, side: 'left' | 'right'): JointSurfaceForce[] {
  const joints: JointSurfaceForce[] = [];
  const elbowKey = side === 'left' ? 'leftElbow' : 'rightElbow';
  const shoulderKey = side === 'left' ? 'leftShoulder' : 'rightShoulder';
  const elbow = config[elbowKey] || {};
  const shoulder = config[shoulderKey] || {};
  const boneName = side === 'left' ? 'Elbow_L' : 'Elbow_R';
  const sideLabel = side === 'left' ? 'Left' : 'Right';

  const flex = Math.abs(elbow.flexion ?? 0);
  const pro = Math.abs(elbow.pronation ?? 0);
  const sup = Math.abs(elbow.supination ?? 0);
  const valgus = Math.abs(elbow.valgus ?? 0);
  const shoulderFlex = Math.abs(shoulder.flexion ?? 0);
  const shoulderAbd = Math.abs(shoulder.abduction ?? 0);

  // Chain about elbow = forearm + hand + load. sin(flex) kept as small
  // biceps internal-force term (mid-range mechanical disadvantage).
  const flexRad = deg2rad(clamp(flex, 0, 150));
  const bicepsCoFactor = Math.sin(flexRad) * 0.5;
  const upperArmGlobalDeg = Math.max(shoulderFlex, shoulderAbd);
  const forearmGlobalDeg = upperArmGlobalDeg + Math.min(flex, 150);
  const externalLoadKg = loadForSide(config, side);
  const elbowChain = computeChainMoment({
    segments: [
      { massBwFrac: SEGMENT_MASS_PCT.forearm, normLen: 0.6, angleDeg: forearmGlobalDeg },
      { massBwFrac: SEGMENT_MASS_PCT.hand,    normLen: 0.4, angleDeg: forearmGlobalDeg },
    ],
    externalLoadKg,
    bodyWeightKg: bodyWeightOf(config),
  });
  const elbowChainWeight = elbowChain.totalWeightBwFrac;
  const elbowLever = elbowChain.leverArmFrac;

  const huComp = elbowChainWeight * (1 + elbowLever * 3.5 + bicepsCoFactor);
  const huShear = huComp * 0.12 * (1 + 0.02 * valgus);
  const huTension = elbowChainWeight * 0.2 * (1 + elbowLever * 1.5);
  joints.push({ id: `${side}_humeroulnar`, label: `${sideLabel} Humeroulnar`, category: `${side}_elbow`, boneName, compression: huComp, tension: huTension, shear: huShear, totalForce: huComp + huShear, status: getStatus(huComp), clinical: getClinicalNote(huComp, 'generic'), enabled: true });

  const hrComp = elbowChainWeight * (1 + elbowLever * 2.0 + bicepsCoFactor * 0.6) * (1 + 0.02 * pro + 0.02 * sup);
  const hrShear = hrComp * 0.1;
  joints.push({ id: `${side}_humeroradial`, label: `${sideLabel} Humeroradial`, category: `${side}_elbow`, boneName, compression: hrComp, tension: hrComp * 0.15, shear: hrShear, totalForce: hrComp + hrShear, status: getStatus(hrComp), clinical: getClinicalNote(hrComp, 'generic'), enabled: true });

  const pruComp = elbowChainWeight * 0.3 * (1 + 0.03 * pro + 0.03 * sup);
  const pruShear = pruComp * 0.35 * (1 + 0.02 * pro + 0.02 * sup);
  joints.push({ id: `${side}_prox_radioulnar`, label: `${sideLabel} Proximal Radioulnar`, category: `${side}_elbow`, boneName, compression: pruComp, tension: pruComp * 0.2, shear: pruShear, totalForce: pruComp + pruShear, status: getStatus(pruComp), clinical: getClinicalNote(pruComp, 'generic'), enabled: true });

  const uclTension = elbowChainWeight * 0.1 * (1 + 0.04 * valgus + elbowLever * 0.5);
  joints.push({ id: `${side}_ucl`, label: `${sideLabel} UCL (Medial Collateral)`, category: `${side}_elbow`, boneName, compression: 0, tension: uclTension, shear: 0, totalForce: uclTension, status: getStatus(uclTension), clinical: getClinicalNote(uclTension, 'generic'), enabled: true });

  const cepTension = elbowChainWeight * 0.15 * (1 + elbowLever * 1.0 + bicepsCoFactor * 0.5 + 0.02 * pro);
  joints.push({ id: `${side}_common_extensor`, label: `${sideLabel} Common Extensor (Lateral Epicondyle)`, category: `${side}_elbow`, boneName, compression: 0, tension: cepTension, shear: 0, totalForce: cepTension, status: getStatus(cepTension), clinical: getClinicalNote(cepTension, 'generic'), enabled: true });

  const cfpTension = elbowChainWeight * 0.12 * (1 + elbowLever * 1.2 + bicepsCoFactor * 0.5 + 0.02 * sup);
  joints.push({ id: `${side}_common_flexor`, label: `${sideLabel} Common Flexor (Medial Epicondyle)`, category: `${side}_elbow`, boneName, compression: 0, tension: cfpTension, shear: 0, totalForce: cfpTension, status: getStatus(cfpTension), clinical: getClinicalNote(cfpTension, 'generic'), enabled: true });

  return joints;
}

function computeWristForces(config: JointAngles, side: 'left' | 'right'): JointSurfaceForce[] {
  const joints: JointSurfaceForce[] = [];
  const wristKey = side === 'left' ? 'leftWrist' : 'rightWrist';
  const elbowKey = side === 'left' ? 'leftElbow' : 'rightElbow';
  const wrist = config[wristKey] || {};
  const elbow = config[elbowKey] || {};
  const boneName = side === 'left' ? 'Wrist_L' : 'Wrist_R';
  const sideLabel = side === 'left' ? 'Left' : 'Right';

  const wFlex = Math.abs(wrist.flexion ?? 0);
  const wExt = Math.abs(wrist.extension ?? 0);
  const radDev = Math.abs(wrist.radialDeviation ?? 0);
  const ulnDev = Math.abs(wrist.ulnarDeviation ?? 0);
  const wPro = Math.abs(wrist.pronation ?? 0);

  // Chain at wrist = hand + load. Hand global angle = shoulder+elbow+wrist tilt.
  const shoulderKey = side === 'left' ? 'leftShoulder' : 'rightShoulder';
  const shoulder = config[shoulderKey] || {};
  const shoulderTilt = Math.max(Math.abs(shoulder.flexion ?? 0), Math.abs(shoulder.abduction ?? 0));
  const elbowFlexHere = Math.min(Math.abs(elbow.flexion ?? 0), 150);
  const wristTilt = clamp(Math.max(wFlex, wExt), 0, 80);
  const handGlobalDeg = shoulderTilt + elbowFlexHere + wristTilt;

  const externalLoadKg = loadForSide(config, side);
  const wristChain = computeChainMoment({
    segments: [
      { massBwFrac: SEGMENT_MASS_PCT.hand, normLen: 1.0, angleDeg: handGlobalDeg },
    ],
    externalLoadKg,
    bodyWeightKg: bodyWeightOf(config),
  });
  const wristChainWeight = wristChain.totalWeightBwFrac;
  const wristLever = wristChain.leverArmFrac;
  // Local wrist tilt amplifies tendon-bowstring forces over the carpal
  // tunnel, separate from the gravity moment captured by the chain helper.
  const wristMoment = Math.sin(deg2rad(wristTilt));

  const rcComp = wristChainWeight * (1 + wristLever * 2.5 + wristMoment * 1.0);
  const rcShear = rcComp * 0.15 * (1 + 0.02 * radDev + 0.02 * ulnDev);
  joints.push({ id: `${side}_radiocarpal`, label: `${sideLabel} Radiocarpal`, category: `${side}_wrist`, boneName, compression: rcComp, tension: rcComp * 0.2, shear: rcShear, totalForce: rcComp + rcShear, status: getStatus(rcComp), clinical: getClinicalNote(rcComp, 'generic'), enabled: true });

  const mcComp = wristChainWeight * (1 + wristLever * 1.6 + wristMoment * 0.7);
  const mcShear = mcComp * 0.12;
  joints.push({ id: `${side}_midcarpal`, label: `${sideLabel} Midcarpal`, category: `${side}_wrist`, boneName, compression: mcComp, tension: mcComp * 0.15, shear: mcShear, totalForce: mcComp + mcShear, status: getStatus(mcComp), clinical: getClinicalNote(mcComp, 'generic'), enabled: true });

  const drujComp = wristChainWeight * 0.4 * (1 + 0.03 * wPro + 0.02 * ulnDev);
  const drujShear = drujComp * 0.4 * (1 + 0.03 * wPro);
  joints.push({ id: `${side}_druj`, label: `${sideLabel} DRUJ (Distal Radioulnar)`, category: `${side}_wrist`, boneName, compression: drujComp, tension: drujComp * 0.2, shear: drujShear, totalForce: drujComp + drujShear, status: getStatus(drujComp), clinical: getClinicalNote(drujComp, 'generic'), enabled: true });

  const tfccComp = wristChainWeight * 0.15 * (1 + 0.04 * ulnDev + 0.02 * wPro);
  const tfccTension = wristChainWeight * 0.1 * (1 + 0.03 * ulnDev + 0.02 * wPro);
  joints.push({ id: `${side}_tfcc`, label: `${sideLabel} TFCC`, category: `${side}_wrist`, boneName, compression: tfccComp, tension: tfccTension, shear: tfccComp * 0.2, totalForce: tfccComp + tfccTension, status: getStatus(Math.max(tfccComp, tfccTension)), clinical: getClinicalNote(Math.max(tfccComp, tfccTension), 'generic'), enabled: true });

  return joints;
}

export interface FascialModifiers {
  chainTensions: Record<string, number>;
  scarRestrictions?: { bone: string; mobilityFactor: number }[];
}

const BONE_ADJACENCY: Record<string, string[]> = {
  'Neck_M': ['Chest_M'],
  'Chest_M': ['Neck_M', 'Spine1Part2_M', 'Scapula_L', 'Scapula_R', 'Shoulder_L', 'Shoulder_R'],
  'Spine1Part2_M': ['Chest_M', 'Spine1Part1_M'],
  'Spine1Part1_M': ['Spine1Part2_M', 'Spine1_M'],
  'Spine1_M': ['Spine1Part1_M', 'RootPart2_M'],
  'RootPart2_M': ['Spine1_M', 'RootPart1_M'],
  'RootPart1_M': ['RootPart2_M', 'Root_M', 'Hip_L', 'Hip_R'],
  'Root_M': ['RootPart1_M', 'Hip_L', 'Hip_R'],
  'Hip_L': ['RootPart1_M', 'Root_M', 'HipPart2_L', 'Knee_L'],
  'Hip_R': ['RootPart1_M', 'Root_M', 'HipPart2_R', 'Knee_R'],
  'HipPart2_L': ['Hip_L', 'Knee_L'],
  'HipPart2_R': ['Hip_R', 'Knee_R'],
  'Knee_L': ['HipPart2_L', 'Hip_L', 'Ankle_L'],
  'Knee_R': ['HipPart2_R', 'Hip_R', 'Ankle_R'],
  'Ankle_L': ['Knee_L', 'Toes_L'],
  'Ankle_R': ['Knee_R', 'Toes_R'],
  'Toes_L': ['Ankle_L'],
  'Toes_R': ['Ankle_R'],
  'Shoulder_L': ['Scapula_L', 'Chest_M', 'Elbow_L'],
  'Shoulder_R': ['Scapula_R', 'Chest_M', 'Elbow_R'],
  'Scapula_L': ['Shoulder_L', 'Chest_M'],
  'Scapula_R': ['Shoulder_R', 'Chest_M'],
  'Elbow_L': ['Shoulder_L', 'Wrist_L'],
  'Elbow_R': ['Shoulder_R', 'Wrist_R'],
  'Wrist_L': ['Elbow_L'],
  'Wrist_R': ['Elbow_R'],
};

function getChainTensionFactor(chainTensions: Record<string, number>, chainPrefix: string): number {
  let maxTension = 0;
  for (const [chainId, tension] of Object.entries(chainTensions)) {
    if (chainId.startsWith(chainPrefix) && tension > 50) {
      maxTension = Math.max(maxTension, tension);
    }
  }
  if (maxTension <= 50) return 1.0;
  return 1 + (maxTension - 50) / 200;
}

function applyFascialModifiers(joints: JointSurfaceForce[], modifiers: FascialModifiers): void {
  const { chainTensions, scarRestrictions } = modifiers;

  const sblFactor = getChainTensionFactor(chainTensions, 'superficial_back');
  const sflFactor = getChainTensionFactor(chainTensions, 'superficial_front');
  const llFactor = getChainTensionFactor(chainTensions, 'lateral_line');
  const dflFactor = getChainTensionFactor(chainTensions, 'deep_front');

  for (const j of joints) {
    if (j.category === 'lumbar_spine' && j.id.includes('disc')) {
      j.compression *= sblFactor;
      j.totalForce = j.compression + j.shear;
    }

    if ((j.category === 'lumbar_spine' || j.category === 'left_hip' || j.category === 'right_hip') && llFactor > 1.0) {
      j.shear *= llFactor;
      j.totalForce = j.compression + j.shear;
    }

    if ((j.category === 'cervical_spine' || j.category === 'thoracic_spine') && sflFactor > 1.0) {
      j.tension *= sflFactor;
      j.compression *= (1 + (sflFactor - 1) * 0.5);
      j.totalForce = j.compression + j.shear;
    }

    if ((j.category === 'left_hip' || j.category === 'right_hip') && j.id.includes('femoral_head') && dflFactor > 1.0) {
      j.compression *= dflFactor;
      j.totalForce = j.compression + j.shear;
    }
  }

  if (scarRestrictions && scarRestrictions.length > 0) {
    for (const scar of scarRestrictions) {
      const adjacentBones = BONE_ADJACENCY[scar.bone] || [];
      const severityIncrease = 1 + (1 - scar.mobilityFactor) * 0.1;

      for (const j of joints) {
        if (adjacentBones.includes(j.boneName)) {
          j.compression *= severityIncrease;
          j.shear *= severityIncrease;
          j.tension *= severityIncrease;
          j.totalForce = j.compression + j.shear;
        }
      }
    }
  }
}

export function calculatePosturalForces(config: JointAngles, fascialModifiers?: FascialModifiers): ForceAnalysisResult {
  const allJoints: JointSurfaceForce[] = [
    ...computeSpineForces(config),
    ...computeHipForces(config, 'left'),
    ...computeHipForces(config, 'right'),
    ...computeKneeForces(config, 'left'),
    ...computeKneeForces(config, 'right'),
    ...computeAnkleForces(config, 'left'),
    ...computeAnkleForces(config, 'right'),
    ...computeShoulderForces(config, 'left'),
    ...computeShoulderForces(config, 'right'),
    ...computeElbowForces(config, 'left'),
    ...computeElbowForces(config, 'right'),
    ...computeWristForces(config, 'left'),
    ...computeWristForces(config, 'right'),
  ];

  if (fascialModifiers) {
    applyFascialModifiers(allJoints, fascialModifiers);
  }

  const categoryMap: Record<string, { label: string; order: number }> = {
    cervical_spine: { label: 'Cervical Spine', order: 0 },
    thoracic_spine: { label: 'Thoracic Spine', order: 1 },
    lumbar_spine: { label: 'Lumbar Spine', order: 2 },
    pelvis_sacrum: { label: 'Pelvis & Sacrum', order: 3 },
    left_hip: { label: 'Left Hip', order: 4 },
    right_hip: { label: 'Right Hip', order: 5 },
    left_knee: { label: 'Left Knee', order: 6 },
    right_knee: { label: 'Right Knee', order: 7 },
    left_ankle: { label: 'Left Ankle & Foot', order: 8 },
    right_ankle: { label: 'Right Ankle & Foot', order: 9 },
    left_shoulder: { label: 'Left Shoulder', order: 10 },
    right_shoulder: { label: 'Right Shoulder', order: 11 },
    left_elbow: { label: 'Left Elbow', order: 12 },
    right_elbow: { label: 'Right Elbow', order: 13 },
    left_wrist: { label: 'Left Wrist & Hand', order: 14 },
    right_wrist: { label: 'Right Wrist & Hand', order: 15 },
  };

  for (const j of allJoints) {
    j.compression = clampForce(j.compression);
    j.tension = clampForce(j.tension);
    j.shear = clampForce(j.shear);
    j.totalForce = clampForce(j.compression + j.shear);
    j.status = getStatus(Math.max(j.compression, j.tension));
  }

  const grouped: Record<string, JointSurfaceForce[]> = {};
  for (const j of allJoints) {
    if (!grouped[j.category]) grouped[j.category] = [];
    grouped[j.category].push(j);
  }

  const categories: ForceCategory[] = Object.entries(grouped)
    .sort((a, b) => (categoryMap[a[0]]?.order ?? 99) - (categoryMap[b[0]]?.order ?? 99))
    .map(([catId, catJoints]) => ({
      id: catId,
      label: categoryMap[catId]?.label ?? catId,
      joints: catJoints,
      collapsed: true,
    }));

  const spineFlexion = Math.abs(config.spine?.thoracicKyphosis ?? 0) + Math.abs(config.spine?.lumbarLordosis ?? 0);
  const forwardHead = Math.abs(config.spine?.forwardHead ?? 0);
  const lateralShift = Math.abs(config.spine?.lateralShift ?? 0);
  const scoliosis = Math.abs(config.spine?.scoliosis ?? 0);
  const pelvisObliquity = Math.abs(config.pelvis?.obliquity ?? 0);
  const lHipFlex = Math.abs(config.leftHip?.flexion ?? 0);
  const rHipFlex = Math.abs(config.rightHip?.flexion ?? 0);

  const comX = lateralShift * 0.01 + scoliosis * 0.005 + pelvisObliquity * 0.005;
  const comY = spineFlexion * 0.005 + forwardHead * 0.003 + Math.max(lHipFlex, rHipFlex) * 0.002;

  return {
    categories,
    joints: allJoints,
    totalBodyCOM: { x: comX, y: comY },
    baseSupportShift: Math.sqrt(comX * comX + comY * comY),
  };
}

export function forceToNewtons(bw: number, bodyWeightKg: number): number {
  return Math.round(bw * bodyWeightKg * 9.81);
}

export function getStatusColor(status: 'low' | 'moderate' | 'high' | 'very_high'): string {
  switch (status) {
    case 'low': return '#22c55e';
    case 'moderate': return '#eab308';
    case 'high': return '#f97316';
    case 'very_high': return '#ef4444';
  }
}

export function getStatusHex(status: 'low' | 'moderate' | 'high' | 'very_high'): number {
  switch (status) {
    case 'low': return 0x22c55e;
    case 'moderate': return 0xeab308;
    case 'high': return 0xf97316;
    case 'very_high': return 0xef4444;
  }
}

export interface ClinicalThreshold {
  jointPattern: string;
  label: string;
  thresholdBW: number;
  injuryType: string;
  reference: string;
}

export const CLINICAL_THRESHOLDS: ClinicalThreshold[] = [
  { jointPattern: 'l4l5_disc|l5s1_disc', label: 'L4-L5 / L5-S1 Disc Compression', thresholdBW: 3.4, injuryType: 'Disc herniation / annular disruption', reference: 'NIOSH Action Limit ~3400N (Waters et al. 1993)' },
  { jointPattern: 'l3l4_disc', label: 'L3-L4 Disc Compression', thresholdBW: 3.0, injuryType: 'Disc degeneration / protrusion', reference: 'Nachemson & Morris 1964; McGill 1997' },
  { jointPattern: 'l1l2_disc', label: 'L1-L2 Disc Compression', thresholdBW: 2.8, injuryType: 'Upper lumbar disc injury', reference: 'Adams & Hutton 1985' },
  { jointPattern: 'l\\d+.*_facet|l4l5_facet|l5s1_facet|l3l4_facet|l1l2_facet', label: 'Lumbar Facet Compression', thresholdBW: 2.0, injuryType: 'Facet arthrosis / hypertrophy', reference: 'Dunlop et al. 1984; Cavanaugh et al. 1996' },
  { jointPattern: 'c\\d+.*_disc|c3c5_disc|c5c7_disc', label: 'Cervical Disc Compression', thresholdBW: 1.5, injuryType: 'Cervical disc degeneration / radiculopathy', reference: 'Moroney et al. 1988; Nightingale et al. 1997' },
  { jointPattern: 'c\\d+.*_facet|c0c1_facet|c1c2_facet|c3c5_facet|c5c7_facet', label: 'Cervical Facet Compression', thresholdBW: 1.2, injuryType: 'Cervical facet arthropathy / referral pain', reference: 'Winkelstein et al. 2000; Bogduk & Marsland 1988' },
  { jointPattern: 't\\d+.*_disc|t5t8_disc', label: 'Thoracic Disc Compression', thresholdBW: 2.5, injuryType: 'Thoracic disc degeneration', reference: 'Wilke et al. 1999' },
  { jointPattern: 'patellofemoral', label: 'Patellofemoral Compression', thresholdBW: 3.5, injuryType: 'Chondromalacia / PFPS', reference: 'Besier et al. 2005; Powers 2003' },
  { jointPattern: 'tf_medial|tf_lateral', label: 'Tibiofemoral Compression', thresholdBW: 4.0, injuryType: 'Meniscal / articular cartilage damage', reference: 'Kutzner et al. 2010; D\'Lima et al. 2006' },
  { jointPattern: 'femoral_head|labrum', label: 'Hip Joint Compression', thresholdBW: 4.5, injuryType: 'Labral tear / cartilage degeneration', reference: 'Bergmann et al. 2001; Tackson et al. 2011' },
  { jointPattern: 'talocrural', label: 'Talocrural Compression', thresholdBW: 5.0, injuryType: 'Osteochondral lesion / ankle OA', reference: 'Stauffer et al. 1977; Valderrabano et al. 2009' },
  { jointPattern: '_gh$|_gh\\b', label: 'Glenohumeral Compression', thresholdBW: 1.5, injuryType: 'Rotator cuff overload / impingement', reference: 'Poppen & Walker 1978; Veeger & van der Helm 2007' },
  { jointPattern: '_ac$|_ac\\b', label: 'AC Joint Compression', thresholdBW: 1.0, injuryType: 'AC joint degeneration / osteolysis', reference: 'Cahill 1992; Buttaci et al. 2004' },
  { jointPattern: 'si_left|si_right', label: 'Sacroiliac Shear', thresholdBW: 1.0, injuryType: 'SI joint dysfunction / inflammation', reference: 'Vleeming et al. 2012; Laslett 2008' },
  { jointPattern: 'pubic_symphysis', label: 'Pubic Symphysis Shear', thresholdBW: 0.5, injuryType: 'Pubic symphysis instability / osteitis pubis', reference: 'Meyers et al. 2000; Robinson et al. 2007' },
  { jointPattern: 'l5s1_facet|l5s1_disc', label: 'Sacral Base Compression', thresholdBW: 2.0, injuryType: 'Sacral stress / spondylolisthesis risk', reference: 'Meyerding 1932; Kalichman et al. 2009' },
];

export function getThresholdWarnings(joint: JointSurfaceForce): { exceeded: boolean; warnings: { label: string; threshold: number; actual: number; injuryType: string; reference: string; forceType: 'compression' | 'tension' | 'shear' }[] } {
  const warnings: { label: string; threshold: number; actual: number; injuryType: string; reference: string; forceType: 'compression' | 'tension' | 'shear' }[] = [];

  for (const threshold of CLINICAL_THRESHOLDS) {
    const regex = new RegExp(threshold.jointPattern);
    if (!regex.test(joint.id)) continue;

    const isShearThreshold = threshold.label.toLowerCase().includes('shear');

    if (isShearThreshold) {
      if (joint.shear >= threshold.thresholdBW) {
        warnings.push({
          label: threshold.label,
          threshold: threshold.thresholdBW,
          actual: joint.shear,
          injuryType: threshold.injuryType,
          reference: threshold.reference,
          forceType: 'shear',
        });
      }
    } else {
      if (joint.compression >= threshold.thresholdBW) {
        warnings.push({
          label: threshold.label,
          threshold: threshold.thresholdBW,
          actual: joint.compression,
          injuryType: threshold.injuryType,
          reference: threshold.reference,
          forceType: 'compression',
        });
      }
    }
  }

  return { exceeded: warnings.length > 0, warnings };
}

export interface WeightDistribution {
  leftPercent: number;
  rightPercent: number;
  asymmetryPercent: number;
  dominantSide: 'left' | 'right' | 'balanced';
  clinical: string;
}

export function computeWeightDistribution(config: any, bodyWeightKg: number): WeightDistribution {
  const leftHipForces = computeHipForces(config, 'left');
  const rightHipForces = computeHipForces(config, 'right');
  const leftKneeForces = computeKneeForces(config, 'left');
  const rightKneeForces = computeKneeForces(config, 'right');
  const leftAnkleForces = computeAnkleForces(config, 'left');
  const rightAnkleForces = computeAnkleForces(config, 'right');

  const sumForces = (joints: JointSurfaceForce[]) =>
    joints.reduce((sum, j) => sum + j.compression + j.shear, 0);

  let leftTotal = sumForces(leftHipForces) + sumForces(leftKneeForces) + sumForces(leftAnkleForces);
  let rightTotal = sumForces(rightHipForces) + sumForces(rightKneeForces) + sumForces(rightAnkleForces);

  const pelvisObliquity = Math.abs(config.pelvis?.obliquity ?? 0);
  const lateralShift = Math.abs(config.spine?.lateralShift ?? 0);
  const scoliosis = Math.abs(config.spine?.scoliosis ?? 0);

  const pelvisOblDir = (config.pelvis?.obliquity ?? 0);
  const latShiftDir = (config.spine?.lateralShift ?? 0);
  const scolDir = (config.spine?.scoliosis ?? 0);

  const asymmetryBias = pelvisOblDir * 0.3 + latShiftDir * 0.2 + scolDir * 0.1;
  if (asymmetryBias > 0) {
    rightTotal *= (1 + Math.abs(asymmetryBias) * 0.01);
  } else if (asymmetryBias < 0) {
    leftTotal *= (1 + Math.abs(asymmetryBias) * 0.01);
  }

  const total = leftTotal + rightTotal;
  if (total === 0) {
    return {
      leftPercent: 50,
      rightPercent: 50,
      asymmetryPercent: 0,
      dominantSide: 'balanced',
      clinical: 'No lower extremity loading detected — unable to assess weight distribution.',
    };
  }

  const leftPercent = (leftTotal / total) * 100;
  const rightPercent = (rightTotal / total) * 100;
  const asymmetryPercent = Math.abs(leftPercent - rightPercent);

  let dominantSide: 'left' | 'right' | 'balanced';
  if (asymmetryPercent <= 5) {
    dominantSide = 'balanced';
  } else {
    dominantSide = leftPercent > rightPercent ? 'left' : 'right';
  }

  let clinical: string;
  const factors: string[] = [];
  if (pelvisObliquity > 3) factors.push(`pelvis obliquity ${pelvisObliquity.toFixed(1)}°`);
  if (lateralShift > 5) factors.push(`lateral trunk shift ${lateralShift.toFixed(1)}mm`);
  if (scoliosis > 5) factors.push(`scoliosis ${scoliosis.toFixed(1)}°`);
  const factorStr = factors.length > 0 ? ` Contributing factors: ${factors.join(', ')}.` : '';

  if (asymmetryPercent <= 5) {
    clinical = `Balanced weight distribution (${leftPercent.toFixed(1)}% L / ${rightPercent.toFixed(1)}% R). Within normal symmetry limits.${factorStr}`;
  } else if (asymmetryPercent <= 10) {
    clinical = `Mild asymmetry detected (${leftPercent.toFixed(1)}% L / ${rightPercent.toFixed(1)}% R) — ${dominantSide} side dominant. Monitor for compensatory patterns.${factorStr}`;
  } else if (asymmetryPercent <= 15) {
    clinical = `Moderate asymmetry (${leftPercent.toFixed(1)}% L / ${rightPercent.toFixed(1)}% R) — ${dominantSide} side dominant. Likely compensatory loading; assess for pain avoidance or structural cause.${factorStr}`;
  } else {
    clinical = `Significant asymmetry (${leftPercent.toFixed(1)}% L / ${rightPercent.toFixed(1)}% R) — ${dominantSide} side dominant. High risk of overload injury on dominant side. Investigate underlying pathology.${factorStr}`;
  }

  return {
    leftPercent: Math.round(leftPercent * 10) / 10,
    rightPercent: Math.round(rightPercent * 10) / 10,
    asymmetryPercent: Math.round(asymmetryPercent * 10) / 10,
    dominantSide,
    clinical,
  };
}

// ---------------------------------------------------------------------------
// Joint load vectors (Task #239)
// ---------------------------------------------------------------------------
// Compact, downstream-friendly summary of which joints are taking the brunt
// of the current posture/movement, what KIND of load dominates (compression /
// shear / tension), and which tissue most likely absorbs that load. The
// recovery sim and natural-driver bias model consume these so two skeletons
// with the same overload count but different vector directions yield
// different recovery curves.
// ---------------------------------------------------------------------------

export type LoadComponent = 'compression' | 'shear' | 'tension';
export type LoadTissue =
  | 'disc' | 'facet' | 'cartilage' | 'meniscus' | 'labrum'
  | 'tendon' | 'ligament' | 'capsule' | 'bone' | 'generic';

export interface JointLoadVector {
  /** Source joint id (matches JointSurfaceForce.id). */
  jointId: string;
  /** Human-readable label. */
  label: string;
  /** Joint category (spine, knee, hip, …) for grouping. */
  category: string;
  /** Total joint reaction force in body weights. */
  magnitudeBW: number;
  /** Which load component dominates the joint reaction. */
  dominantComponent: LoadComponent;
  /** Per-component breakdown (BW units). */
  components: { compression: number; shear: number; tension: number };
  /** Tissue most likely absorbing the dominant load at this joint. */
  dominantTissue: LoadTissue;
  /** Engine status band ('high' / 'very_high' = clinically loaded). */
  status: JointSurfaceForce['status'];
}

const TISSUE_BY_CATEGORY: Record<string, LoadTissue> = {
  disc: 'disc',
  facet: 'facet',
  spine: 'disc',
  hip: 'cartilage',
  patellofemoral: 'cartilage',
  tibiofemoral: 'meniscus',
  knee: 'meniscus',
  ankle: 'cartilage',
  shoulder: 'labrum',
  glenohumeral: 'labrum',
  elbow: 'cartilage',
  wrist: 'cartilage',
  si: 'ligament',
  sij: 'ligament',
};

function inferDominantTissue(joint: JointSurfaceForce, dominant: LoadComponent): LoadTissue {
  const id = (joint.id ?? '').toLowerCase();
  const cat = (joint.category ?? '').toLowerCase();
  // ID patterns first — they're more specific than category buckets.
  if (id.includes('disc')) return 'disc';
  if (id.includes('facet')) return 'facet';
  if (id.includes('labrum') || id.includes('labral')) return 'labrum';
  if (id.includes('meniscus') || id.includes('menisc')) return 'meniscus';
  if (id.includes('tendon') || id.includes('tendin')) return 'tendon';
  if (id.includes('ligament') || id.includes('acl') || id.includes('mcl') ||
      id.includes('lcl') || id.includes('pcl')) return 'ligament';
  if (id.includes('capsule')) return 'capsule';
  // Category fallback.
  for (const key of Object.keys(TISSUE_BY_CATEGORY)) {
    if (cat.includes(key) || id.includes(key)) return TISSUE_BY_CATEGORY[key];
  }
  // Final hint from the dominant component itself.
  if (dominant === 'shear') return 'ligament';
  if (dominant === 'tension') return 'tendon';
  return 'generic';
}

function pickDominantComponent(j: JointSurfaceForce): LoadComponent {
  const c = j.compression ?? 0;
  const s = j.shear ?? 0;
  const t = j.tension ?? 0;
  if (s >= c && s >= t) return 'shear';
  if (t > c) return 'tension';
  return 'compression';
}

export interface ExtractJointLoadVectorsOptions {
  /** Cap on the number of vectors returned (sorted by magnitude desc). */
  topN?: number;
  /** Minimum status band to include — defaults to 'high'. */
  minStatus?: JointSurfaceForce['status'];
}

const STATUS_RANK: Record<JointSurfaceForce['status'], number> = {
  low: 0, moderate: 1, high: 2, very_high: 3,
};

/** Project a ForceAnalysisResult down to a compact, ranked list of joint
 *  load vectors. Used by ConditionContext + the natural-driver bias model. */
export function extractJointLoadVectors(
  forceAnalysis: ForceAnalysisResult | null | undefined,
  opts: ExtractJointLoadVectorsOptions = {},
): JointLoadVector[] {
  if (!forceAnalysis || !Array.isArray(forceAnalysis.joints)) return [];
  const minStatus = opts.minStatus ?? 'high';
  const topN = opts.topN ?? 6;
  const minRank = STATUS_RANK[minStatus];
  const filtered = forceAnalysis.joints
    .filter(j => j && j.enabled !== false && STATUS_RANK[j.status] >= minRank)
    .slice()
    .sort((a, b) => (b.totalForce ?? 0) - (a.totalForce ?? 0))
    .slice(0, Math.max(0, topN));
  return filtered.map((j): JointLoadVector => {
    const dominant = pickDominantComponent(j);
    return {
      jointId: j.id,
      label: j.label ?? j.id,
      category: j.category ?? 'generic',
      magnitudeBW: Math.max(0, j.totalForce ?? 0),
      dominantComponent: dominant,
      components: {
        compression: Math.max(0, j.compression ?? 0),
        shear: Math.max(0, j.shear ?? 0),
        tension: Math.max(0, j.tension ?? 0),
      },
      dominantTissue: inferDominantTissue(j, dominant),
      status: j.status,
    };
  });
}
