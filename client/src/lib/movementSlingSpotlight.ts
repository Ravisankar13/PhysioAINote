import {
  getSlingBonePathway,
  type SlingAnalysisResult,
  type SlingResult,
  type SlingId,
} from './slingEngine';
import type { PathologyType } from './muscleBiomechanicsEngine';

export type SpotlightReason =
  | 'pinned'
  | 'overloaded'
  | 'underperforming'
  | 'compensating'
  | 'movement-task'
  | 'dragged-bone'
  | 'marker-bias'
  | 'hysteresis'
  | 'baseline-best';

export interface SpotlightPick {
  slingId: SlingId;
  reason: SpotlightReason;
  reasonText: string;
  /** 0..1 — how confident the selector is in this pick. Below 0.35 the
   *  caller should treat the spotlight as a soft suggestion. */
  confidence: number;
}

export interface SpotlightInputMarker {
  id: string;
  nearestBone?: string;
  anatomicalLabel?: string;
  severity?: number;
}

export interface SpotlightSelectorContext {
  pinnedSlingId: SlingId | null;
  /** Active provocation/movement task id (e.g. 'lunge', 'sts',
   *  'gait_stance'). When set, slings whose movementRole or id matches the
   *  task get a recruitment bonus. */
  movementTaskId?: string | null;
  /** Last bone the clinician dragged in pose mode. Slings whose pathway
   *  contains this bone get a small focus bonus. */
  lastInteractedBone?: string | null;
  /** Previous pick id — used for hysteresis so the spotlight doesn't
   *  flicker between two near-equal slings. */
  previousSpotlightId?: SlingId | null;
  /** Most prominent pain region label (anatomicalLabel or nearestBone of
   *  highest-severity marker). Used in reason text only. */
  primaryPainRegion?: string | null;
}

const STATUS_WEIGHT: Record<SlingResult['status'], number> = {
  overloaded: 4,
  underperforming: 3,
  compensating: 2,
  normal: 0,
};

const STATUS_REASON: Record<SlingResult['status'], SpotlightReason> = {
  overloaded: 'overloaded',
  underperforming: 'underperforming',
  compensating: 'compensating',
  normal: 'baseline-best',
};

// Movement task → sling id affinity. Conservative — leaves room for the
// engine status to dominate when there is real dysfunction.
const MOVEMENT_TASK_AFFINITY: Record<string, SlingId[]> = {
  // Gait / propulsion
  gait: ['posterior_oblique', 'deep_longitudinal', 'lateral'],
  gait_stance: ['lateral', 'deep_longitudinal'],
  gait_swing: ['posterior_oblique'],
  walking: ['posterior_oblique', 'deep_longitudinal', 'lateral'],
  running: ['posterior_oblique', 'deep_longitudinal', 'lateral'],
  // Single-leg stance / balance
  single_leg_stance: ['lateral'],
  step_down: ['lateral', 'deep_longitudinal'],
  // Squat / sit-to-stand
  squat: ['deep_longitudinal', 'posterior_oblique'],
  sts: ['deep_longitudinal'],
  sit_to_stand: ['deep_longitudinal'],
  // Lunge / split stance
  lunge: ['anterior_oblique', 'lateral'],
  split_squat: ['anterior_oblique', 'lateral'],
  // Rotational / kicking / throwing
  rotation: ['posterior_oblique', 'anterior_oblique'],
  trunk_rotation: ['posterior_oblique', 'anterior_oblique'],
  kicking: ['anterior_oblique'],
  throwing: ['anterior_oblique', 'scapular_shoulder'],
  // Scapulo-thoracic / overhead
  overhead_reach: ['scapular_shoulder'],
  scaption: ['scapular_shoulder'],
  arm_elevation: ['scapular_shoulder'],
  shoulder_elevation: ['scapular_shoulder'],
  scapular_elevation: ['scapular_shoulder'],
  shoulder_abduction: ['scapular_shoulder'],
  shoulder_flexion: ['scapular_shoulder'],
  reach: ['scapular_shoulder'],
  reaching: ['scapular_shoulder'],
};

// Anatomical-label aliases that should bias a sling even though the
// underlying skeleton mesh exposes the bone under a different name
// (e.g. scapular pain markers anchor on shoulder/clavicle bones).
const MARKER_LABEL_TO_SLING: Array<{ match: RegExp; sling: SlingId }> = [
  { match: /scapul|rhomboid|trapezius|infraspinat|supraspinat|subscapular/i, sling: 'scapular_shoulder' },
  { match: /shoulder|deltoid|rotator|gleno/i, sling: 'scapular_shoulder' },
  { match: /lat\s*dor|latissimus|thoracolumbar|gluteus\s*max/i, sling: 'posterior_oblique' },
  { match: /linea\s*alba|adductor|external\s*oblique/i, sling: 'anterior_oblique' },
  { match: /it\s*band|gluteus\s*med|quadratus\s*lumb|tensor\s*fasciae/i, sling: 'lateral' },
  { match: /sacrotuberous|biceps\s*femoris|erector\s*spinae|deep\s*posterior/i, sling: 'deep_longitudinal' },
];

function affinityForTask(taskId: string | null | undefined): Set<SlingId> {
  if (!taskId) return new Set();
  const key = taskId.toLowerCase();
  if (MOVEMENT_TASK_AFFINITY[key]) return new Set(MOVEMENT_TASK_AFFINITY[key]);
  // Heuristic substring match
  for (const [k, v] of Object.entries(MOVEMENT_TASK_AFFINITY)) {
    if (key.includes(k)) return new Set(v);
  }
  return new Set();
}

export function pickSpotlightSling(
  analysis: SlingAnalysisResult | null,
  markers: SpotlightInputMarker[],
  ctx: SpotlightSelectorContext,
): SpotlightPick | null {
  if (!analysis || analysis.slings.length === 0) return null;

  const {
    pinnedSlingId,
    movementTaskId,
    lastInteractedBone,
    previousSpotlightId,
    primaryPainRegion,
  } = ctx;

  if (pinnedSlingId) {
    const pinned = analysis.slings.find(s => s.slingId === pinnedSlingId);
    if (pinned) {
      return {
        slingId: pinned.slingId,
        reason: 'pinned',
        reasonText: `Pinned by clinician — ${pinned.label} held in spotlight.`,
        confidence: 1,
      };
    }
  }

  const markerBoneSet = new Set<string>();
  const markerLabelSlingSet = new Set<SlingId>();
  for (const m of markers) {
    if (m.nearestBone) markerBoneSet.add(m.nearestBone);
    if (m.anatomicalLabel) {
      for (const { match, sling } of MARKER_LABEL_TO_SLING) {
        if (match.test(m.anatomicalLabel)) markerLabelSlingSet.add(sling);
      }
    }
  }

  const taskAffinity = affinityForTask(movementTaskId);

  // Score each sling. Engine status dominates; movement / drag / marker
  // are biases capped so they cannot overturn a genuinely dysfunctional
  // sling vs. a normal one.
  type Scored = {
    sling: SlingResult;
    statusScore: number;   // engine-derived, dominant
    biasScore: number;     // movement + drag + marker + hysteresis
    total: number;
    reasonHint: SpotlightReason;
  };

  const scored: Scored[] = analysis.slings.map(s => {
    const baseStatus = STATUS_WEIGHT[s.status] * 30;
    const activationDelta = Math.abs(100 - s.activationScore);
    const ftqPenalty = s.forceTransferQuality === 'poor' ? 20 : s.forceTransferQuality === 'reduced' ? 10 : 0;
    const downstream = s.downstreamRisk === 'severe' ? 20 : s.downstreamRisk === 'moderate' ? 10 : s.downstreamRisk === 'mild' ? 4 : 0;
    const statusScore = baseStatus + activationDelta + ftqPenalty + downstream;

    const pathway = getSlingBonePathway(s.slingId);

    // Marker bias — capped at +20 so it can flag *which* dysfunctional
    // sling matters (when several are abnormal) but cannot promote a
    // normal sling above an abnormal one.
    let markerBias = 0;
    if (markerBoneSet.size > 0) {
      for (const b of pathway) if (markerBoneSet.has(b)) markerBias += 6;
    }
    if (markerLabelSlingSet.has(s.slingId)) markerBias += 12;
    markerBias = Math.min(20, markerBias);

    // Movement task affinity — also capped (+18). Helps tie-break
    // between similarly dysfunctional slings.
    const movementBias = taskAffinity.has(s.slingId) ? 18 : 0;

    // Last-dragged bone — small focus bonus (+12) when the clinician
    // just interacted with a bone in this sling's pathway.
    const dragBias = lastInteractedBone && pathway.includes(lastInteractedBone) ? 12 : 0;

    // Hysteresis — small bonus to the previously spotlighted sling so
    // the spotlight doesn't bounce between two near-equal slings frame
    // to frame.
    const hysteresisBias = previousSpotlightId === s.slingId ? 8 : 0;

    const biasScore = markerBias + movementBias + dragBias + hysteresisBias;
    const total = statusScore + biasScore;

    let reasonHint: SpotlightReason = STATUS_REASON[s.status];
    if (s.status === 'normal') {
      // Bias-only candidates label themselves accordingly so the
      // reason text reflects *why* a normal sling came to the top.
      if (movementBias > 0) reasonHint = 'movement-task';
      else if (dragBias > 0) reasonHint = 'dragged-bone';
      else if (markerBias > 0) reasonHint = 'marker-bias';
      else reasonHint = 'baseline-best';
    } else if (markerBias > 0 && (movementBias > 0 || dragBias > 0)) {
      // When several signals agree, prefer the most actionable label
      reasonHint = 'marker-bias';
    } else if (movementBias > 0 && dragBias > 0) {
      reasonHint = 'movement-task';
    }

    return { sling: s, statusScore, biasScore, total, reasonHint };
  });

  scored.sort((a, b) => b.total - a.total);
  const top = scored[0];
  if (!top) return null;

  // Confidence: status-driven slings are higher confidence; bias-only
  // picks (no engine dysfunction) are lower.
  const next = scored[1];
  const margin = next ? top.total - next.total : top.total;
  const statusConfidence = Math.min(1, top.statusScore / 120);
  const marginConfidence = Math.min(1, margin / 30);
  const confidence = top.sling.status === 'normal'
    ? Math.max(0.2, marginConfidence * 0.6)
    : Math.min(1, 0.4 + statusConfidence * 0.4 + marginConfidence * 0.2);

  const sling = top.sling;
  const wl = sling.weakLinks[0];

  const movementSuffix = movementTaskId
    ? ` during the ${humaniseTask(movementTaskId)} task`
    : '';
  const painSuffix = primaryPainRegion
    ? ` · pain reported at ${primaryPainRegion}`
    : '';

  let reasonText: string;
  switch (top.reasonHint) {
    case 'overloaded':
      reasonText = `Overloaded${movementSuffix} — activation ${Math.round(sling.activationScore)}% with downstream risk to ${sling.downstreamRiskArea}.${painSuffix}`;
      break;
    case 'underperforming':
      reasonText = wl
        ? `Underperforming${movementSuffix} — engine-detected weak link at ${wl.muscle} (${Math.round(wl.activationPct)}%).${painSuffix}`
        : `Underperforming at ${Math.round(sling.activationScore)}% activation${movementSuffix}.${painSuffix}`;
      break;
    case 'compensating':
      reasonText = `Compensating for an adjacent sling${movementSuffix} — ${sling.forceTransferQuality} force transfer.${painSuffix}`;
      break;
    case 'movement-task':
      reasonText = `Recruited by the ${humaniseTask(movementTaskId ?? '')} task — surfaced for review.${painSuffix}`;
      break;
    case 'dragged-bone':
      reasonText = `Pathway includes the bone you just adjusted${painSuffix ? '' : ' — surfaced for review.'}${painSuffix}`;
      break;
    case 'marker-bias':
      reasonText = wl
        ? `Marker overlap with the ${sling.label} pathway — engine still locks the weak link at ${wl.muscle}.${painSuffix}`
        : `Marker overlap with the ${sling.label} pathway.${painSuffix}`;
      break;
    case 'hysteresis':
    case 'baseline-best':
    default:
      reasonText = `Closest to dysfunction (${Math.round(sling.activationScore)}% activation)${movementSuffix}.${painSuffix}`;
  }

  return { slingId: sling.slingId, reason: top.reasonHint, reasonText, confidence };
}

function humaniseTask(taskId: string): string {
  return taskId.replace(/_/g, ' ').toLowerCase();
}

// ---------------------------------------------------------------------------
// Per-part graph: muscles, connective links, attachments.
// ---------------------------------------------------------------------------

export type SpotlightPartKind = 'muscle' | 'link' | 'attachment';

export interface SpotlightPart {
  id: string;
  kind: SpotlightPartKind;
  label: string;
  /** For muscles: canonical alias used by slingEngine MUSCLE_ALIASES.
   *  For links: pair of adjacent bone names. For attachments: bone name. */
  ref: string;
  /** Bone (or bone pair) the part anchors to in 3D. Used for screen-space
   *  hotspot positioning over the 3D viewer. */
  anchorBones: string[];
  /** Severity hint (0..1) used to colour the chip — derived from the
   *  containing sling's weakLinks / overloaded indices. */
  intensity: number;
  /** True when a pain/scar/adhesion marker biases this part. */
  markerBiased: boolean;
}

export interface PartIntervention {
  id: string;
  label: string;
  modality: 'exercise' | 'manual_therapy' | 'electrophysical' | 'lifestyle';
  intervention: 'strengthen' | 'release' | 'activate' | 'stabilize' | 'modulate';
  rationale: string;
  dosage: string;
  /** Delta to apply to the parent sling's activation override (0..200). */
  slingActivationDelta: number;
  /** Optional muscle override patch when the part is a muscle — composed
   *  into the engine's `muscleOverrides` for proper re-simulation. */
  muscleOverridePatch?: { tensionOffset?: number; activationOffset?: number; inhibition?: number; pathology?: PathologyType };
}

const LINK_LABELS: Record<string, string> = {
  posterior_oblique: 'Thoracolumbar fascia link',
  anterior_oblique: 'Linea alba link',
  lateral: 'Iliotibial / lateral fascia link',
  deep_longitudinal: 'Sacrotuberous / deep posterior link',
  scapular_shoulder: 'Scapulothoracic interface link',
};

export function getSlingParts(
  sling: SlingResult,
  markerBones: Set<string>,
): SpotlightPart[] {
  const parts: SpotlightPart[] = [];
  const pathway = getSlingBonePathway(sling.slingId);

  // ---- Muscles (clickable, severity from weakLinks / scores)
  const weakMap = new Map<string, number>();
  for (const wl of sling.weakLinks) weakMap.set(wl.muscle, wl.activationPct);
  const scoreMap = new Map<string, number>();
  for (const ms of sling.muscleScores ?? []) scoreMap.set(ms.muscle, ms.activation);

  const slingMuscles = sling.muscleScores ?? [];
  const muscleNames: string[] = slingMuscles.length > 0
    ? slingMuscles.map(m => m.muscle)
    : sling.weakLinks.map(w => w.muscle);

  // Naive muscle→bone mapping: spread muscles across the pathway by index.
  const muscleAnchor = (idx: number): string[] => {
    if (pathway.length === 0) return [];
    const total = Math.max(1, muscleNames.length);
    const i = Math.min(pathway.length - 1, Math.round((idx / total) * pathway.length));
    return [pathway[i]];
  };

  muscleNames.forEach((m, idx) => {
    const weakAct = weakMap.get(m);
    const score = scoreMap.get(m) ?? 50;
    const intensity = weakAct !== undefined
      ? Math.max(0.5, Math.min(1, (60 - weakAct) / 60 + 0.4))
      : Math.max(0.15, Math.min(1, Math.abs(50 - score) / 50));
    const anchor = muscleAnchor(idx);
    parts.push({
      id: `muscle::${sling.slingId}::${m}`,
      kind: 'muscle',
      label: prettifyMuscle(m),
      ref: m,
      anchorBones: anchor,
      intensity,
      markerBiased: anchor.some(b => markerBones.has(b)),
    });
  });

  // ---- Connective links (between consecutive bones in pathway)
  const linkLabel = LINK_LABELS[sling.slingId] ?? 'Connective link';
  if (pathway.length >= 3) {
    const midIdx = Math.floor(pathway.length / 2);
    const a = pathway[midIdx - 1];
    const b = pathway[midIdx];
    parts.push({
      id: `link::${sling.slingId}::${a}__${b}`,
      kind: 'link',
      label: linkLabel,
      ref: `${a}__${b}`,
      anchorBones: [a, b],
      intensity: sling.forceTransferQuality === 'poor' ? 0.85 : sling.forceTransferQuality === 'reduced' ? 0.6 : 0.3,
      markerBiased: markerBones.has(a) || markerBones.has(b),
    });
  }

  // ---- Attachments (proximal & distal bones)
  if (pathway.length >= 2) {
    const proximal = pathway[0];
    const distal = pathway[pathway.length - 1];
    for (const [bone, role] of [[proximal, 'proximal'], [distal, 'distal']] as const) {
      parts.push({
        id: `attach::${sling.slingId}::${role}::${bone}`,
        kind: 'attachment',
        label: `${role === 'proximal' ? 'Proximal' : 'Distal'} attachment · ${humaniseBone(bone)}`,
        ref: bone,
        anchorBones: [bone],
        intensity: markerBones.has(bone) ? 0.8 : 0.45,
        markerBiased: markerBones.has(bone),
      });
    }
  }

  return parts;
}

function prettifyMuscle(m: string): string {
  return m.split('_').map(s => s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s).join(' ');
}

function humaniseBone(bone: string): string {
  return bone
    .replace(/_M$/, '')
    .replace(/_L$/, ' (L)')
    .replace(/_R$/, ' (R)')
    .replace(/Part\d+/g, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
}

// ---------------------------------------------------------------------------
// Per-part intervention generators (2..4 each).
// ---------------------------------------------------------------------------

export function getPartInterventions(
  part: SpotlightPart,
  sling: SlingResult,
): PartIntervention[] {
  const status = sling.status;
  const isUnderactive = sling.activationScore < 80 || status === 'underperforming';
  const isOverloaded = status === 'overloaded' || sling.activationScore > 120;

  if (part.kind === 'muscle') {
    if (isOverloaded) {
      return [
        intv(`${part.id}::release`, 'Soft-tissue release', 'manual_therapy', 'release',
          `Down-tone ${part.label} to relieve over-recruitment of the ${sling.label}.`,
          '1–2 min sustained pressure, 2 sets', -8, { tensionOffset: -10 }),
        intv(`${part.id}::ift`, 'Inhibitory IFT', 'electrophysical', 'modulate',
          `Sensory-level interferential to dial down hypertonic ${part.label}.`,
          '4 kHz carrier, beat 100 Hz, 12 min', -5),
        intv(`${part.id}::down-train`, 'Down-train motor pattern', 'exercise', 'modulate',
          `Low-load eccentric work to retrain ${part.label} without over-bracing.`,
          '3×8 slow eccentrics, RPE 4', -6, { activationOffset: -8 }),
      ];
    }
    if (isUnderactive) {
      return [
        intv(`${part.id}::activate`, 'Low-load activation', 'exercise', 'activate',
          `Wake up ${part.label} so the ${sling.label} can re-engage during the task.`,
          '3×10 isometric holds, RPE 3', 12, { activationOffset: 12, inhibition: -10 }),
        intv(`${part.id}::strengthen`, 'Progressive strengthening', 'exercise', 'strengthen',
          `Build force capacity in ${part.label} to restore force-transfer in the sling.`,
          '3×8 @ 70% 1RM, 2×/week', 18, { tensionOffset: 6, activationOffset: 10 }),
        intv(`${part.id}::nmes`, 'NMES facilitation', 'electrophysical', 'activate',
          `Neuromuscular electrical stimulation to recruit ${part.label} fibres.`,
          'Russian 50 Hz, 10 s on / 50 s off, 10 reps', 8),
        intv(`${part.id}::manual-cue`, 'Manual facilitation', 'manual_therapy', 'activate',
          `Tactile cueing on ${part.label} during the failing task to drive recruitment.`,
          '2×6 task-specific reps with cue', 6),
      ];
    }
    return [
      intv(`${part.id}::balance`, 'Balanced activation', 'exercise', 'stabilize',
        `Maintain the ${part.label}'s contribution while balancing the ${sling.label}.`,
        '2×10 controlled reps', 4),
      intv(`${part.id}::release-mild`, 'Release if tender', 'manual_therapy', 'release',
        `Light release on ${part.label} only if palpation reveals tenderness.`,
        '60 s sustained, 1 set', -2, { tensionOffset: -4 }),
    ];
  }

  if (part.kind === 'link') {
    const baseReason = `Improve force-transmission across the ${sling.label} link.`;
    return [
      intv(`${part.id}::iastm`, 'IASTM / cross-friction', 'manual_therapy', 'release',
        `${baseReason} Reduce fascial drag at the link.`,
        '3 min sweeping strokes, 1 set', isOverloaded ? -5 : 6),
      intv(`${part.id}::myofascial`, 'Myofascial release', 'manual_therapy', 'release',
        `${baseReason} Slow sustained release of the connective interface.`,
        '90 s sustained, 2 sets', isOverloaded ? -4 : 5),
      intv(`${part.id}::motor-control`, 'Link-spanning motor-control drill', 'exercise', 'stabilize',
        `${baseReason} Drill that loads both endpoints simultaneously.`,
        '3×6 controlled reps', 8),
    ];
  }

  // attachment
  const bone = humaniseBone(part.ref);
  return [
    intv(`${part.id}::mob`, `Joint mobilisation (${bone})`, 'manual_therapy', 'release',
      `Mobilise the attachment to free the ${sling.label} terminus at ${bone}.`,
      'Grade III–IV oscillations, 2×30 s', isOverloaded ? -3 : 5),
    intv(`${part.id}::iso`, 'Modified-load isometric', 'exercise', 'stabilize',
      `Low-strain isometric at ${bone} to rebuild attachment tolerance.`,
      '5×10 s holds @ 50% MVIC', 6, { tensionOffset: 3 }),
    intv(`${part.id}::stab`, 'Closed-chain stability drill', 'exercise', 'stabilize',
      `Stability work that loads the ${sling.label} through its ${bone} terminus.`,
      '3×8 reps with 3 s hold', 10, { activationOffset: 6 }),
  ];
}

function intv(
  id: string,
  label: string,
  modality: PartIntervention['modality'],
  intervention: PartIntervention['intervention'],
  rationale: string,
  dosage: string,
  slingActivationDelta: number,
  muscleOverridePatch?: PartIntervention['muscleOverridePatch'],
): PartIntervention {
  return { id, label, modality, intervention, rationale, dosage, slingActivationDelta, muscleOverridePatch };
}
