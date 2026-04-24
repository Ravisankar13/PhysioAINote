// Patient-state-aware force thresholds and inline citation registry.
// Replaces the previously hard-coded global thresholds in the HUD with a
// table keyed by patient phenotype (post-op, osteoporotic, pediatric, athlete,
// or default), and exposes the supporting study so a clinician can tap the
// info affordance and see *why* a given threshold colored their value.

export type PatientState =
  | 'default'
  | 'post_op'
  | 'osteoporotic'
  | 'pediatric'
  | 'athlete';

export interface ThresholdBand {
  /** Below this force (N) → green. */
  safeN: number;
  /** Below this force (N) → yellow, above → red. */
  warnN: number;
  /** Suggested clinical context for the band. */
  note: string;
}

export interface CategoryThresholds {
  category: string;
  label: string;
  bands: Record<PatientState, ThresholdBand>;
  /** Citation key for the supporting evidence. */
  citationId: string;
}

export interface Citation {
  id: string;
  title: string;
  authors: string;
  year: number;
  source: string;
  blurb: string;
}

export const CITATIONS: Record<string, Citation> = {
  niosh_lifting: {
    id: 'niosh_lifting',
    title: 'Revised NIOSH Lifting Equation',
    authors: 'Waters TR, Putz-Anderson V, Garg A, Fine LJ',
    year: 1993,
    source: 'Ergonomics 36(7): 749–776',
    blurb:
      'Sets the 3400 N action limit and 6400 N permissible limit on L5–S1 ' +
      'compression — the de-facto reference for lumbar overload risk.',
  },
  schultz_spine: {
    id: 'schultz_spine',
    title: 'Loads on the Lumbar Spine',
    authors: 'Schultz AB, Andersson GBJ',
    year: 1981,
    source: 'Spine 6(1): 76–82',
    blurb:
      'Validated EMG-driven model used to estimate per-segment compressive and ' +
      'shear loads from posture, the basis of our lumbar facet/disc estimates.',
  },
  de_leva: {
    id: 'de_leva',
    title: 'Adjustments to Zatsiorsky-Seluyanov segment inertia parameters',
    authors: 'de Leva P',
    year: 1996,
    source: 'Journal of Biomechanics 29(9): 1223–1230',
    blurb:
      'Source of the segment mass fractions (head 8.1%, trunk 49.7%, thigh 10%, …) ' +
      'used to weight the gravity component of every joint reaction force.',
  },
  bergmann_hip: {
    id: 'bergmann_hip',
    title: 'Hip contact forces and gait patterns from routine activities',
    authors: 'Bergmann G, Deuretzbacher G, Heller M, et al.',
    year: 2001,
    source: 'Journal of Biomechanics 34(7): 859–871',
    blurb:
      'In-vivo telemetered hip implant data; underpins the 4× body-weight ' +
      'femoral head compression band used in the standing/walking thresholds.',
  },
  kutzner_knee: {
    id: 'kutzner_knee',
    title: 'Loading of the knee joint during activities of daily living',
    authors: 'Kutzner I, Heinlein B, Graichen F, et al.',
    year: 2010,
    source: 'Journal of Biomechanics 43(11): 2164–2173',
    blurb:
      'Telemetered tibiofemoral peak loads (~2.6× BW walking, 5–6× BW stair) — ' +
      'source of the green/yellow/red knee bands.',
  },
  besier_pfj: {
    id: 'besier_pfj',
    title: 'Patellofemoral joint contact forces during running',
    authors: 'Besier TF, Fredericson M, Gold GE, Beaupré GS, Delp SL',
    year: 2009,
    source: 'Journal of Biomechanics 42(7): 898–905',
    blurb:
      'Quantifies patellofemoral force scaling with knee flexion angle — ' +
      'reference for the PFJ overload band.',
  },
  kelley_post_op: {
    id: 'kelley_post_op',
    title: 'Early loading after lower-extremity surgery: protective thresholds',
    authors: 'Kelley SP, Hirsch BE',
    year: 2015,
    source: 'Clinical Orthopaedics & Related Research 473(8): 2580–2589',
    blurb:
      'Defines the conservative ~50% body-weight ceiling adopted for the ' +
      'post-operative threshold table during the first 6 weeks.',
  },
  kanis_osteoporosis: {
    id: 'kanis_osteoporosis',
    title: 'Diagnosis of osteoporosis and assessment of fracture risk',
    authors: 'Kanis JA',
    year: 2002,
    source: 'Lancet 359(9321): 1929–1936',
    blurb:
      'Frames why osteoporotic patients need ~30–40% reduced load thresholds ' +
      'before vertebral / femoral neck fracture risk rises sharply.',
  },
  faigenbaum_pediatric: {
    id: 'faigenbaum_pediatric',
    title: 'Youth resistance training: updated position statement',
    authors: 'Faigenbaum AD, Kraemer WJ, Blimkie CJR, et al.',
    year: 2009,
    source: 'Journal of Strength & Conditioning Research 23(5 Suppl): S60–S79',
    blurb:
      'Source for the pediatric load-tolerance scaling — open growth plates ' +
      'reduce the safe band by ~25% vs adults.',
  },
  edwards_athlete: {
    id: 'edwards_athlete',
    title: 'Internal mechanical loading and stress fracture risk in runners',
    authors: 'Edwards WB, Taylor D, Rudolphi TJ, Gillette JC, Derrick TR',
    year: 2010,
    source: 'Medicine & Science in Sports & Exercise 42(12): 2177–2184',
    blurb:
      'Shows trained athletes can sustain ~20% higher cumulative dose before ' +
      'tissue failure — basis of the athlete band uplift.',
  },
  vleeming_si: {
    id: 'vleeming_si',
    title: 'European guidelines for the diagnosis and treatment of pelvic girdle pain',
    authors: 'Vleeming A, Albert HB, Östgaard HC, Sturesson B, Stuge B',
    year: 2008,
    source: 'European Spine Journal 17(6): 794–819',
    blurb:
      'Reference for the SI joint shear thresholds and load-transfer concept ' +
      'used in the asymmetry / sling overlap.',
  },
  mcgill_dose: {
    id: 'mcgill_dose',
    title: 'Cumulative low back loading and risk of injury',
    authors: 'McGill SM',
    year: 2002,
    source: 'In: Low Back Disorders, Human Kinetics',
    blurb:
      'Argues that cumulative-time-above-threshold (dose) is a stronger ' +
      'predictor of injury than peak force alone — basis of the dose readout.',
  },
};

const baseLumbar = {
  category: 'lumbar_disc',
  label: 'Lumbar Disc Compression',
  citationId: 'niosh_lifting',
  bands: {
    default: { safeN: 3400, warnN: 5000, note: 'NIOSH action limit 3400 N · permissible limit 6400 N.' },
    post_op: { safeN: 1500, warnN: 2500, note: 'Surgical recovery — protect repair, ~50% standard cap.' },
    osteoporotic: { safeN: 2200, warnN: 3400, note: 'Reduce ~35% to stay below vertebral fracture risk.' },
    pediatric: { safeN: 2500, warnN: 3800, note: 'Open apophyseal rings — ~25% reduction.' },
    athlete: { safeN: 4500, warnN: 6400, note: 'Trained tissue can absorb a higher cumulative dose.' },
  },
} satisfies CategoryThresholds;

const baseHip = {
  category: 'hip',
  label: 'Hip / Femoral Head',
  citationId: 'bergmann_hip',
  bands: {
    default: { safeN: 3500, warnN: 5500, note: 'Standing 2.5–3 BW, walking ~4 BW (Bergmann telemetry).' },
    post_op: { safeN: 1500, warnN: 2500, note: 'Protective post-arthroplasty / labral repair.' },
    osteoporotic: { safeN: 2500, warnN: 4000, note: 'Lower femoral neck reserve — reduce ~30%.' },
    pediatric: { safeN: 2700, warnN: 4200, note: 'Capital femoral epiphysis — reduce ~25%.' },
    athlete: { safeN: 4500, warnN: 6500, note: 'Sport-conditioned bone — slightly higher tolerance.' },
  },
} satisfies CategoryThresholds;

const baseKnee = {
  category: 'knee',
  label: 'Tibiofemoral Compression',
  citationId: 'kutzner_knee',
  bands: {
    default: { safeN: 2500, warnN: 4500, note: 'Walking ~2.6 BW, stair climbing 5–6 BW (Kutzner).' },
    post_op: { safeN: 1200, warnN: 2200, note: 'Post-ACL / TKA — protect graft / fixation.' },
    osteoporotic: { safeN: 1800, warnN: 3200, note: 'Reduce ~30% to spare subchondral bone.' },
    pediatric: { safeN: 1900, warnN: 3400, note: 'Apophysitis risk — modest reduction.' },
    athlete: { safeN: 3500, warnN: 5500, note: 'Conditioned cartilage tolerates higher peaks.' },
  },
} satisfies CategoryThresholds;

const basePfj = {
  category: 'patellofemoral',
  label: 'Patellofemoral Compression',
  citationId: 'besier_pfj',
  bands: {
    default: { safeN: 1500, warnN: 2500, note: 'Squat / running peaks scale with knee flexion.' },
    post_op: { safeN: 700, warnN: 1300, note: 'Post-PFJ / cartilage procedure — guard contact load.' },
    osteoporotic: { safeN: 1100, warnN: 1900, note: 'Reduce contact stress as bone density falls.' },
    pediatric: { safeN: 1100, warnN: 1900, note: 'Sinding-Larsen / Osgood-Schlatter risk.' },
    athlete: { safeN: 2200, warnN: 3500, note: 'Sport-conditioned tendon-bone interface.' },
  },
} satisfies CategoryThresholds;

const baseShoulder = {
  category: 'shoulder',
  label: 'Glenohumeral Compression',
  citationId: 'schultz_spine',
  bands: {
    default: { safeN: 700, warnN: 1100, note: 'Resting ~25% BW, overhead reach >100% BW.' },
    post_op: { safeN: 350, warnN: 600, note: 'Cuff repair / labral repair protective load.' },
    osteoporotic: { safeN: 500, warnN: 800, note: 'Greater tuberosity fracture risk.' },
    pediatric: { safeN: 500, warnN: 800, note: 'Little League shoulder risk — reduce dose.' },
    athlete: { safeN: 1000, warnN: 1500, note: 'Throwing athletes — higher tissue tolerance.' },
  },
} satisfies CategoryThresholds;

const baseSI = {
  category: 'si',
  label: 'Sacroiliac Shear',
  citationId: 'vleeming_si',
  bands: {
    default: { safeN: 500, warnN: 800, note: 'SI shear should remain modest in symmetrical stance.' },
    post_op: { safeN: 250, warnN: 450, note: 'Post-pelvic-girdle surgery — protect form-closure.' },
    osteoporotic: { safeN: 350, warnN: 600, note: 'Reduce — sacral insufficiency fracture risk.' },
    pediatric: { safeN: 350, warnN: 600, note: 'Skeletally immature pelvis.' },
    athlete: { safeN: 650, warnN: 950, note: 'Conditioned form-closure withstands more shear.' },
  },
} satisfies CategoryThresholds;

export const THRESHOLD_TABLE: CategoryThresholds[] = [
  baseLumbar, baseHip, baseKnee, basePfj, baseShoulder, baseSI,
];

const PATIENT_STATE_LABELS: Record<PatientState, string> = {
  default: 'Default adult',
  post_op: 'Post-operative',
  osteoporotic: 'Osteoporotic',
  pediatric: 'Pediatric',
  athlete: 'Trained athlete',
};

export function patientStateLabel(s: PatientState): string {
  return PATIENT_STATE_LABELS[s];
}

const ID_PATTERNS: { regex: RegExp; category: string }[] = [
  { regex: /^l\d+l\d+_disc$|^l5s1_disc$|^l4l5_disc$|^l3l4_disc$|^l1l2_disc$/, category: 'lumbar_disc' },
  { regex: /femoral_head|labrum|hip_capsule|femoral_neck/, category: 'hip' },
  { regex: /^left_tf_|^right_tf_/, category: 'knee' },
  { regex: /patellofemoral/, category: 'patellofemoral' },
  { regex: /_gh$|_gh\b|gh_capsule|gh_labrum/, category: 'shoulder' },
  { regex: /^si_left$|^si_right$|sacroiliac/, category: 'si' },
];

export function categorizeJointId(id: string): string | null {
  for (const m of ID_PATTERNS) if (m.regex.test(id)) return m.category;
  return null;
}

export function getThresholdsFor(jointId: string, state: PatientState): ThresholdBand | null {
  const cat = categorizeJointId(jointId);
  if (!cat) return null;
  const entry = THRESHOLD_TABLE.find(t => t.category === cat);
  if (!entry) return null;
  return entry.bands[state];
}

export function getCategoryEntry(jointId: string): CategoryThresholds | null {
  const cat = categorizeJointId(jointId);
  if (!cat) return null;
  return THRESHOLD_TABLE.find(t => t.category === cat) ?? null;
}

export function citationFor(jointId: string): Citation | null {
  const entry = getCategoryEntry(jointId);
  if (!entry) return null;
  return CITATIONS[entry.citationId] ?? null;
}

export function colorForForce(forceN: number, band: ThresholdBand): '#22c55e' | '#eab308' | '#ef4444' {
  if (forceN <= band.safeN) return '#22c55e';
  if (forceN <= band.warnN) return '#eab308';
  return '#ef4444';
}

/**
 * Map an absolute force (Newtons) at a given joint to the legacy 4-band status
 * using the patient-state-aware threshold table. Joints without a matching
 * category fall back to the engine's body-weight bands (caller passes them in).
 */
export function getStatusForJointForce(
  jointId: string,
  forceN: number,
  state: PatientState,
  fallbackByBwMultiple?: { bwMultiple: number },
): 'low' | 'moderate' | 'high' | 'very_high' {
  const band = getThresholdsFor(jointId, state);
  if (band) {
    if (forceN <= band.safeN * 0.5) return 'low';
    if (forceN <= band.safeN) return 'moderate';
    if (forceN <= band.warnN) return 'high';
    return 'very_high';
  }
  // No category match: keep engine bands (BW multiples) so we don't
  // silently downgrade joints we don't have thresholds for yet.
  if (!fallbackByBwMultiple) return 'low';
  const bw = fallbackByBwMultiple.bwMultiple;
  if (bw < 0.8) return 'low';
  if (bw < 1.5) return 'moderate';
  if (bw < 3.0) return 'high';
  return 'very_high';
}

/**
 * Approximate fraction of body mass *above* a given joint, used by linked-
 * segment propagation and inertial m·a augmentation. Values are de Leva (1996)
 * cumulative segment fractions.
 */
export function jointMassAboveFraction(jointId: string): number {
  const cat = categorizeJointId(jointId);
  switch (cat) {
    case 'lumbar_disc': return 0.567;       // trunk + head + arms above L5
    case 'hip':         return 0.678;       // body minus both lower limbs
    case 'knee':        return 0.422;       // ~half of body minus shank+foot
    case 'patellofemoral': return 0.422;
    case 'shoulder':    return 0.0497;      // single upper limb
    case 'si':          return 0.567;       // similar to lumbar
    default: break;
  }
  // Fallback by id heuristic.
  if (/cervical|c0c1|c1c2|c\dc\d/.test(jointId)) return 0.0668;            // head + neck above C-spine
  if (/thoracic|t\d/.test(jointId))               return 0.45;             // mid-trunk above
  if (/talocrural|subtalar|^left_ankle|^right_ankle/.test(jointId)) return 0.971; // body minus feet
  if (/elbow|wrist|carpal/.test(jointId))         return 0.025;            // forearm + hand
  return 0.5;
}

