export interface PredictedPainSpot {
  id: string;
  boneName: string;
  label: string;
  confidence: number;
  severity: number;
  rationale: string;
  category: 'postural' | 'muscular' | 'neural';
  position: { x: number; y: number; z: number };
}

interface PostureConfig {
  spine?: {
    thoracicKyphosis?: number;
    lumbarLordosis?: number;
    cervicalLordosis?: number;
    forwardHead?: number;
    scoliosis?: number;
    lateralShift?: number;
    flexion?: number;
    thoracicRotation?: number;
    lumbarRotation?: number;
  };
  neck?: {
    flexion?: number;
    forwardHead?: number;
    lateralFlexion?: number;
  };
  pelvis?: {
    tilt?: number;
    obliquity?: number;
    rotation?: number;
  };
  leftScapula?: { protraction?: number; elevation?: number; anteriorTilt?: number; winging?: number };
  rightScapula?: { protraction?: number; elevation?: number; anteriorTilt?: number; winging?: number };
  leftHip?: { flexion?: number; internalRotation?: number };
  rightHip?: { flexion?: number; internalRotation?: number };
  leftKnee?: { varus?: number; flexion?: number };
  rightKnee?: { varus?: number; flexion?: number };
  [key: string]: any;
}

interface PainRule {
  id: string;
  label: string;
  boneName: string;
  category: 'postural' | 'muscular' | 'neural';
  position: { x: number; y: number; z: number };
  compute: (config: PostureConfig) => { confidence: number; severity: number; rationale: string } | null;
}

const PAIN_RULES: PainRule[] = [
  {
    id: 'mid_thoracic_pain',
    label: 'Mid-Thoracic Pain',
    boneName: 'Spine2_M',
    category: 'postural',
    position: { x: 0, y: 1.2, z: -0.1 },
    compute: (c) => {
      const kyph = Math.abs(c.spine?.thoracicKyphosis ?? 0);
      if (kyph < 15) return null;
      const conf = Math.min(0.95, 0.3 + kyph * 0.03);
      const sev = Math.min(8, Math.floor(2 + kyph * 0.15));
      return { confidence: conf, severity: sev, rationale: `Increased thoracic kyphosis (${kyph.toFixed(0)}°) increases posterior element loading and paraspinal strain at T5-T8` };
    },
  },
  {
    id: 'suboccipital_headache',
    label: 'Suboccipital Headache',
    boneName: 'Neck_M',
    category: 'neural',
    position: { x: 0, y: 2.2, z: -0.15 },
    compute: (c) => {
      const fwd = Math.abs(c.spine?.forwardHead ?? c.neck?.forwardHead ?? 0);
      const kyph = Math.abs(c.spine?.thoracicKyphosis ?? 0);
      const combined = fwd * 0.7 + kyph * 0.3;
      if (combined < 12) return null;
      const conf = Math.min(0.9, 0.25 + combined * 0.025);
      const sev = Math.min(7, Math.floor(2 + combined * 0.12));
      return { confidence: conf, severity: sev, rationale: `Forward head posture (${fwd.toFixed(0)}°) causes suboccipital muscle hypertonicity and C0-C2 facet compression — common cervicogenic headache pattern` };
    },
  },
  {
    id: 'cervical_pain',
    label: 'Cervical Pain',
    boneName: 'Neck_M',
    category: 'postural',
    position: { x: 0.05, y: 1.95, z: -0.08 },
    compute: (c) => {
      const fwd = Math.abs(c.spine?.forwardHead ?? c.neck?.forwardHead ?? 0);
      const neckFlex = Math.abs(c.neck?.flexion ?? 0);
      const combined = fwd * 0.6 + neckFlex * 0.4;
      if (combined < 15) return null;
      const conf = Math.min(0.9, 0.3 + combined * 0.02);
      const sev = Math.min(7, Math.floor(2 + combined * 0.1));
      return { confidence: conf, severity: sev, rationale: `Forward head (${fwd.toFixed(0)}°) and cervical flexion (${neckFlex.toFixed(0)}°) increase C5-C7 disc pressure and posterior cervical muscle strain` };
    },
  },
  {
    id: 'lower_lumbar_pain',
    label: 'Lower Lumbar Pain',
    boneName: 'RootPart2_M',
    category: 'postural',
    position: { x: 0, y: 0.65, z: -0.1 },
    compute: (c) => {
      const tilt = c.pelvis?.tilt ?? 0;
      const lord = Math.abs(c.spine?.lumbarLordosis ?? 0);
      const combined = Math.abs(tilt) * 0.5 + lord * 0.5;
      if (combined < 12) return null;
      const direction = tilt > 0 ? 'Anterior pelvic tilt' : 'Posterior pelvic tilt';
      const conf = Math.min(0.92, 0.3 + combined * 0.025);
      const sev = Math.min(8, Math.floor(2 + combined * 0.15));
      return { confidence: conf, severity: sev, rationale: `${direction} (${Math.abs(tilt).toFixed(0)}°) with lumbar lordosis (${lord.toFixed(0)}°) increases L4-L5/L5-S1 facet loading and posterior annular stress` };
    },
  },
  {
    id: 'interscapular_pain',
    label: 'Interscapular Pain',
    boneName: 'Spine2Part2_M',
    category: 'muscular',
    position: { x: 0, y: 1.55, z: -0.12 },
    compute: (c) => {
      const lProt = Math.abs(c.leftScapula?.protraction ?? 0);
      const rProt = Math.abs(c.rightScapula?.protraction ?? 0);
      const kyph = Math.abs(c.spine?.thoracicKyphosis ?? 0);
      const avgProt = (lProt + rProt) / 2;
      const combined = avgProt * 0.6 + kyph * 0.4;
      if (combined < 12) return null;
      const conf = Math.min(0.88, 0.25 + combined * 0.025);
      const sev = Math.min(7, Math.floor(2 + combined * 0.12));
      return { confidence: conf, severity: sev, rationale: `Scapular protraction (avg ${avgProt.toFixed(0)}°) stretches rhomboids/middle trapezius — classic interscapular burning pain pattern` };
    },
  },
  {
    id: 'tension_headache',
    label: 'Tension Headache',
    boneName: 'Neck_M',
    category: 'muscular',
    position: { x: 0.1, y: 2.3, z: 0.05 },
    compute: (c) => {
      const lElev = Math.abs(c.leftScapula?.elevation ?? 0);
      const rElev = Math.abs(c.rightScapula?.elevation ?? 0);
      const fwd = Math.abs(c.spine?.forwardHead ?? c.neck?.forwardHead ?? 0);
      const avgElev = (lElev + rElev) / 2;
      const combined = avgElev * 0.5 + fwd * 0.5;
      if (combined < 10) return null;
      const conf = Math.min(0.85, 0.2 + combined * 0.03);
      const sev = Math.min(6, Math.floor(1 + combined * 0.1));
      return { confidence: conf, severity: sev, rationale: `Scapular elevation (avg ${avgElev.toFixed(0)}°) and forward head (${fwd.toFixed(0)}°) create upper trapezius/levator scapulae hypertonicity — tension-type headache referral pattern` };
    },
  },
  {
    id: 'si_joint_pain',
    label: 'Sacroiliac Pain',
    boneName: 'Hip_L',
    category: 'postural',
    position: { x: -0.1, y: 0.5, z: -0.1 },
    compute: (c) => {
      const obliq = Math.abs(c.pelvis?.obliquity ?? 0);
      const tilt = Math.abs(c.pelvis?.tilt ?? 0);
      const rotation = Math.abs(c.pelvis?.rotation ?? 0);
      const combined = obliq * 0.4 + tilt * 0.3 + rotation * 0.3;
      if (combined < 10) return null;
      const conf = Math.min(0.85, 0.2 + combined * 0.025);
      const sev = Math.min(7, Math.floor(2 + combined * 0.12));
      return { confidence: conf, severity: sev, rationale: `Pelvic asymmetry (obliquity ${obliq.toFixed(0)}°, rotation ${rotation.toFixed(0)}°) creates uneven SI joint loading and ligamentous stress` };
    },
  },
  {
    id: 'anterior_hip_pain_l',
    label: 'L Anterior Hip Pain',
    boneName: 'Hip_L',
    category: 'muscular',
    position: { x: -0.15, y: 0.45, z: 0.1 },
    compute: (c) => {
      const tilt = c.pelvis?.tilt ?? 0;
      const hipFlex = Math.abs(c.leftHip?.flexion ?? 0);
      if (tilt < 10 && hipFlex < 20) return null;
      const combined = Math.max(0, tilt) * 0.6 + hipFlex * 0.4;
      if (combined < 12) return null;
      const conf = Math.min(0.82, 0.2 + combined * 0.02);
      const sev = Math.min(6, Math.floor(1 + combined * 0.1));
      return { confidence: conf, severity: sev, rationale: `Anterior pelvic tilt (${tilt.toFixed(0)}°) and hip flexion (${hipFlex.toFixed(0)}°) compress anterior hip capsule and shorten iliopsoas — FAI/labral irritation pattern` };
    },
  },
  {
    id: 'anterior_hip_pain_r',
    label: 'R Anterior Hip Pain',
    boneName: 'Hip_R',
    category: 'muscular',
    position: { x: 0.15, y: 0.45, z: 0.1 },
    compute: (c) => {
      const tilt = c.pelvis?.tilt ?? 0;
      const hipFlex = Math.abs(c.rightHip?.flexion ?? 0);
      if (tilt < 10 && hipFlex < 20) return null;
      const combined = Math.max(0, tilt) * 0.6 + hipFlex * 0.4;
      if (combined < 12) return null;
      const conf = Math.min(0.82, 0.2 + combined * 0.02);
      const sev = Math.min(6, Math.floor(1 + combined * 0.1));
      return { confidence: conf, severity: sev, rationale: `Anterior pelvic tilt (${tilt.toFixed(0)}°) and hip flexion (${hipFlex.toFixed(0)}°) compress anterior hip capsule and shorten iliopsoas — FAI/labral irritation pattern` };
    },
  },
  {
    id: 'anterior_knee_pain_l',
    label: 'L Anterior Knee Pain',
    boneName: 'Knee_L',
    category: 'postural',
    position: { x: -0.12, y: -0.05, z: 0.1 },
    compute: (c) => {
      const varus = c.leftKnee?.varus ?? 0;
      const kneeFlex = Math.abs(c.leftKnee?.flexion ?? 0);
      const combined = Math.abs(varus) * 0.5 + kneeFlex * 0.3;
      if (combined < 10) return null;
      const alignment = varus > 0 ? 'varus' : 'valgus';
      const conf = Math.min(0.8, 0.2 + combined * 0.02);
      const sev = Math.min(6, Math.floor(1 + combined * 0.1));
      return { confidence: conf, severity: sev, rationale: `Knee ${alignment} (${Math.abs(varus).toFixed(0)}°) with flexion (${kneeFlex.toFixed(0)}°) alters patellofemoral contact mechanics and increases lateral/medial compartment stress` };
    },
  },
  {
    id: 'anterior_knee_pain_r',
    label: 'R Anterior Knee Pain',
    boneName: 'Knee_R',
    category: 'postural',
    position: { x: 0.12, y: -0.05, z: 0.1 },
    compute: (c) => {
      const varus = c.rightKnee?.varus ?? 0;
      const kneeFlex = Math.abs(c.rightKnee?.flexion ?? 0);
      const combined = Math.abs(varus) * 0.5 + kneeFlex * 0.3;
      if (combined < 10) return null;
      const alignment = varus > 0 ? 'varus' : 'valgus';
      const conf = Math.min(0.8, 0.2 + combined * 0.02);
      const sev = Math.min(6, Math.floor(1 + combined * 0.1));
      return { confidence: conf, severity: sev, rationale: `Knee ${alignment} (${Math.abs(varus).toFixed(0)}°) with flexion (${kneeFlex.toFixed(0)}°) alters patellofemoral contact mechanics and increases lateral/medial compartment stress` };
    },
  },
  {
    id: 'thoracolumbar_pain',
    label: 'Thoracolumbar Junction Pain',
    boneName: 'Spine1Part2_M',
    category: 'postural',
    position: { x: 0, y: 0.95, z: -0.1 },
    compute: (c) => {
      const kyph = Math.abs(c.spine?.thoracicKyphosis ?? 0);
      const lord = Math.abs(c.spine?.lumbarLordosis ?? 0);
      const transition = kyph * 0.4 + lord * 0.4;
      if (transition < 15) return null;
      const conf = Math.min(0.85, 0.25 + transition * 0.02);
      const sev = Math.min(7, Math.floor(2 + transition * 0.1));
      return { confidence: conf, severity: sev, rationale: `Kyphosis-lordosis transition stress at T12-L1: kyphosis ${kyph.toFixed(0)}° + lordosis ${lord.toFixed(0)}° creates shear forces at the thoracolumbar junction` };
    },
  },
  {
    id: 'lateral_hip_pain_l',
    label: 'L Lateral Hip Pain',
    boneName: 'Hip_L',
    category: 'muscular',
    position: { x: -0.25, y: 0.5, z: 0 },
    compute: (c) => {
      const obliq = c.pelvis?.obliquity ?? 0;
      const factor = obliq > 0 ? obliq : 0;
      if (factor < 5) return null;
      const conf = Math.min(0.8, 0.2 + factor * 0.04);
      const sev = Math.min(6, Math.floor(1 + factor * 0.2));
      return { confidence: conf, severity: sev, rationale: `Pelvic obliquity (${obliq.toFixed(0)}°) increases gluteus medius/IT band tension on the elevated side — greater trochanteric pain syndrome pattern` };
    },
  },
  {
    id: 'lateral_hip_pain_r',
    label: 'R Lateral Hip Pain',
    boneName: 'Hip_R',
    category: 'muscular',
    position: { x: 0.25, y: 0.5, z: 0 },
    compute: (c) => {
      const obliq = c.pelvis?.obliquity ?? 0;
      const factor = obliq < 0 ? -obliq : 0;
      if (factor < 5) return null;
      const conf = Math.min(0.8, 0.2 + factor * 0.04);
      const sev = Math.min(6, Math.floor(1 + factor * 0.2));
      return { confidence: conf, severity: sev, rationale: `Pelvic obliquity (${Math.abs(obliq).toFixed(0)}°) increases gluteus medius/IT band tension on the elevated side — greater trochanteric pain syndrome pattern` };
    },
  },
  {
    id: 'upper_lumbar_pain',
    label: 'Upper Lumbar Pain',
    boneName: 'Spine1Part1_M',
    category: 'postural',
    position: { x: 0, y: 0.85, z: -0.1 },
    compute: (c) => {
      const lord = Math.abs(c.spine?.lumbarLordosis ?? 0);
      const rotation = Math.abs(c.spine?.lumbarRotation ?? 0);
      const combined = lord * 0.5 + rotation * 0.5;
      if (combined < 15) return null;
      const conf = Math.min(0.82, 0.2 + combined * 0.02);
      const sev = Math.min(6, Math.floor(1 + combined * 0.1));
      return { confidence: conf, severity: sev, rationale: `Lumbar lordosis (${lord.toFixed(0)}°) with rotation (${rotation.toFixed(0)}°) increases L1-L3 facet loading and paraspinal strain` };
    },
  },
];

export function computePredictedPain(modelConfig: PostureConfig): PredictedPainSpot[] {
  const spots: PredictedPainSpot[] = [];
  for (const rule of PAIN_RULES) {
    const result = rule.compute(modelConfig);
    if (result && result.confidence >= 0.3) {
      spots.push({
        id: `predicted_${rule.id}`,
        boneName: rule.boneName,
        label: rule.label,
        confidence: result.confidence,
        severity: result.severity,
        rationale: result.rationale,
        category: rule.category,
        position: rule.position,
      });
    }
  }
  return spots.sort((a, b) => b.confidence - a.confidence);
}

export function predictedPainToMarkers(spots: PredictedPainSpot[]): Array<{
  id: string;
  position: { x: number; y: number; z: number };
  label: string;
  severity: number;
  isPredicted: boolean;
}> {
  return spots.map(s => ({
    id: s.id,
    position: s.position,
    label: s.label,
    severity: Math.max(1, Math.round(s.severity * 0.6)),
    isPredicted: true,
  }));
}

export function getPredictedPainBoneNames(spots: PredictedPainSpot[]): string[] {
  return [...new Set(spots.map(s => s.boneName))];
}
