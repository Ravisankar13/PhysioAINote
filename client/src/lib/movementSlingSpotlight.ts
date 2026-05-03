import type { SlingAnalysisResult, SlingResult, SlingId } from './slingEngine';
import type { PathologyType } from './muscleBiomechanicsEngine';

export type SpotlightReason =
  | 'pinned'
  | 'overloaded'
  | 'underperforming'
  | 'compensating'
  | 'marker-bias'
  | 'baseline-best';

export interface SpotlightPick {
  slingId: SlingId;
  reason: SpotlightReason;
  reasonText: string;
}

export interface SpotlightInputMarker {
  id: string;
  nearestBone?: string;
  anatomicalLabel?: string;
  severity?: number;
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

export function pickSpotlightSling(
  analysis: SlingAnalysisResult | null,
  markers: SpotlightInputMarker[],
  pinnedSlingId: SlingId | null,
): SpotlightPick | null {
  if (!analysis || analysis.slings.length === 0) return null;

  if (pinnedSlingId) {
    const pinned = analysis.slings.find(s => s.slingId === pinnedSlingId);
    if (pinned) {
      return {
        slingId: pinned.slingId,
        reason: 'pinned',
        reasonText: `Pinned by clinician — ${pinned.label} held in spotlight.`,
      };
    }
  }

  const markerBoneSet = new Set<string>();
  for (const m of markers) {
    if (m.nearestBone) markerBoneSet.add(m.nearestBone);
  }

  let best: { sling: SlingResult; score: number } | null = null;
  for (const s of analysis.slings) {
    const baseStatus = STATUS_WEIGHT[s.status] * 30;
    const activationDelta = Math.abs(100 - s.activationScore);
    const ftqPenalty = s.forceTransferQuality === 'poor' ? 20 : s.forceTransferQuality === 'reduced' ? 10 : 0;
    const downstream = s.downstreamRisk === 'severe' ? 20 : s.downstreamRisk === 'moderate' ? 10 : s.downstreamRisk === 'mild' ? 4 : 0;

    let markerBonus = 0;
    if (markerBoneSet.size > 0) {
      const pathway = (s as unknown as { bonePathway?: string[] }).bonePathway;
      const bones = Array.isArray(pathway) ? pathway : [];
      for (const b of bones) {
        if (markerBoneSet.has(b)) markerBonus += 8;
      }
    }

    const score = baseStatus + activationDelta + ftqPenalty + downstream + markerBonus;
    if (!best || score > best.score) best = { sling: s, score };
  }

  if (!best) return null;
  const sling = best.sling;
  if (sling.status === 'normal' && best.score < 25) {
    return {
      slingId: sling.slingId,
      reason: 'baseline-best',
      reasonText: 'All slings within normal force-transfer range — spotlight defaults to highest-deviation sling.',
    };
  }

  const reason = markerBoneSet.size > 0 && sling.status !== 'normal' ? 'marker-bias' : STATUS_REASON[sling.status];
  const wl = sling.weakLinks[0];
  const reasonText = (() => {
    if (sling.status === 'overloaded') return `Overloaded — activation ${Math.round(sling.activationScore)}%, downstream risk to ${sling.downstreamRiskArea}.`;
    if (sling.status === 'underperforming') return wl ? `Underperforming — weak link at ${wl.muscle} (${wl.activationPct}%).` : `Underperforming at ${Math.round(sling.activationScore)}% activation.`;
    if (sling.status === 'compensating') return `Compensating for an adjacent sling — ${sling.forceTransferQuality} force transfer.`;
    return `Closest to dysfunction (${Math.round(sling.activationScore)}% activation).`;
  })();

  return { slingId: sling.slingId, reason, reasonText };
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
  /** Optional muscle override patch when the part is a muscle. */
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

  // ---- Muscles (clickable, severity from weakLinks / scores)
  const weakMap = new Map<string, number>();
  for (const wl of sling.weakLinks) weakMap.set(wl.muscle, wl.activationPct);
  const scoreMap = new Map<string, number>();
  for (const ms of sling.muscleScores ?? []) scoreMap.set(ms.muscle, ms.activation);

  const slingMuscles = (sling as unknown as { muscleScores?: { muscle: string }[] }).muscleScores ?? [];
  const muscleNames = slingMuscles.length > 0
    ? slingMuscles.map(m => m.muscle)
    : sling.weakLinks.map(w => w.muscle);

  for (const m of muscleNames) {
    const weakAct = weakMap.get(m);
    const score = scoreMap.get(m) ?? 50;
    const intensity = weakAct !== undefined
      ? Math.max(0.5, Math.min(1, (60 - weakAct) / 60 + 0.4))
      : Math.max(0.15, Math.min(1, Math.abs(50 - score) / 50));
    parts.push({
      id: `muscle::${sling.slingId}::${m}`,
      kind: 'muscle',
      label: prettifyMuscle(m),
      ref: m,
      intensity,
      markerBiased: false,
    });
  }

  // ---- Connective links (between consecutive bones in pathway)
  const pathway = (sling as unknown as { bonePathway?: string[] }).bonePathway ?? [];
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
  const slingId = sling.slingId;
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
