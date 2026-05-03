import type { MovementSequence } from './movementSequences';
import type { SlingResult, SlingId, SlingAnalysisResult } from './slingEngine';
import type { SlingFailureScenario } from '@shared/schema';

export type { SlingFailureScenario } from '@shared/schema';

export interface TriggerMovementSpec {
  id: string;
  slingId: SlingId;
  label: string;
  reason: string;
  /** Normalized failure frame 0..1 (peak loading of the sling). */
  failureFrame: number;
  /** Parametric MovementSequence the player can interpolate. */
  sequence: MovementSequence;
}

const kf = (time: number, value: number) => ({ time, value });

/* ----------------------------------------------------------------------
 * Curated trigger-movement library — one canonical movement per sling.
 * Each is a plain MovementSequence so the existing MovementPlayer can
 * register & play it via registerDynamicMovement().
 * -------------------------------------------------------------------- */
export const TRIGGER_MOVEMENT_LIBRARY: TriggerMovementSpec[] = [
  {
    id: 'sfv_single_leg_calf_raise',
    slingId: 'deep_longitudinal',
    label: 'Single-leg calf raise',
    reason: 'Loads the deep longitudinal sling at peak plantarflexion — peroneus → biceps femoris → erector chain must transmit ground reaction force from the foot up the spine.',
    failureFrame: 0.6,
    sequence: {
      id: 'sfv_single_leg_calf_raise',
      name: 'Single-leg calf raise',
      description: 'Stance leg drives into plantarflexion; pelvis rises through the posterior chain.',
      duration: 2400,
      loop: true,
      joints: [
        { joint: 'leftAnkle', property: 'plantarflexion', keyframes: [kf(0, 0), kf(0.55, 35), kf(1, 0)] },
        { joint: 'leftKnee', property: 'flexion', keyframes: [kf(0, 8), kf(0.55, 4), kf(1, 8)] },
        { joint: 'leftHip', property: 'flexion', keyframes: [kf(0, 5), kf(0.55, 0), kf(1, 5)] },
        { joint: 'rightHip', property: 'flexion', keyframes: [kf(0, 35), kf(0.55, 35), kf(1, 35)] },
        { joint: 'rightKnee', property: 'flexion', keyframes: [kf(0, 70), kf(0.55, 70), kf(1, 70)] },
        { joint: 'spine', property: 'flexion', keyframes: [kf(0, 0), kf(0.55, 4), kf(1, 0)] },
      ],
    },
  },
  {
    id: 'sfv_single_leg_stance',
    slingId: 'lateral',
    label: 'Single-leg stance (Trendelenburg test)',
    reason: 'Single-leg stance challenges the lateral sling — gluteus medius/minimus + TFL + contralateral QL must hold the pelvis level over the stance hip.',
    failureFrame: 0.5,
    sequence: {
      id: 'sfv_single_leg_stance',
      name: 'Single-leg stance',
      description: 'Lift one leg; the lateral sling holds the pelvis level over the stance leg.',
      duration: 3000,
      loop: true,
      joints: [
        { joint: 'rightHip', property: 'flexion', keyframes: [kf(0, 0), kf(0.5, 30), kf(1, 0)] },
        { joint: 'rightKnee', property: 'flexion', keyframes: [kf(0, 5), kf(0.5, 60), kf(1, 5)] },
        { joint: 'leftHip', property: 'abduction', keyframes: [kf(0, 0), kf(0.5, -2), kf(1, 0)] },
      ],
    },
  },
  {
    id: 'sfv_overhead_reach',
    slingId: 'scapular_shoulder',
    label: 'Overhead reach',
    reason: 'Full overhead reach demands serratus anterior + lower trap to upwardly rotate the scapula and centre the humeral head.',
    failureFrame: 0.7,
    sequence: {
      id: 'sfv_overhead_reach',
      name: 'Overhead reach',
      description: 'Arm rises through scaption to full overhead position.',
      duration: 2500,
      loop: true,
      joints: [
        { joint: 'leftShoulder', property: 'flexion', keyframes: [kf(0, 0), kf(0.7, 165), kf(1, 0)] },
        { joint: 'leftShoulder', property: 'abduction', keyframes: [kf(0, 0), kf(0.7, 30), kf(1, 0)] },
        { joint: 'leftScapula', property: 'upwardRotation', keyframes: [kf(0, 0), kf(0.7, 45), kf(1, 0)] },
      ],
    },
  },
  {
    id: 'sfv_forward_lunge',
    slingId: 'anterior_oblique',
    label: 'Forward lunge with rotation',
    reason: 'Lunging into rotation loads the anterior oblique sling — external oblique → linea alba → contralateral adductor must brace and rotate.',
    failureFrame: 0.55,
    sequence: {
      id: 'sfv_forward_lunge',
      name: 'Forward lunge with rotation',
      description: 'Step forward into a lunge while rotating the trunk over the front leg.',
      duration: 2800,
      loop: true,
      joints: [
        { joint: 'rightHip', property: 'flexion', keyframes: [kf(0, 0), kf(0.55, 75), kf(1, 0)] },
        { joint: 'rightKnee', property: 'flexion', keyframes: [kf(0, 5), kf(0.55, 90), kf(1, 5)] },
        { joint: 'leftHip', property: 'extension', keyframes: [kf(0, 0), kf(0.55, 20), kf(1, 0)] },
        { joint: 'spine', property: 'thoracicRotation', keyframes: [kf(0, 0), kf(0.55, 25), kf(1, 0)] },
      ],
    },
  },
  {
    id: 'sfv_gait_stance_push_off',
    slingId: 'posterior_oblique',
    label: 'Gait stance push-off',
    reason: 'Push-off in gait loads the posterior oblique sling — latissimus → thoracolumbar fascia → contralateral glute max delivers diagonal force across the SI joint.',
    failureFrame: 0.65,
    sequence: {
      id: 'sfv_gait_stance_push_off',
      name: 'Gait stance push-off',
      description: 'Single-leg push-off with contralateral arm swing — diagonal posterior chain loading.',
      duration: 2200,
      loop: true,
      joints: [
        { joint: 'leftHip', property: 'extension', keyframes: [kf(0, 0), kf(0.65, 18), kf(1, 0)] },
        { joint: 'leftAnkle', property: 'plantarflexion', keyframes: [kf(0, 0), kf(0.65, 25), kf(1, 0)] },
        { joint: 'rightShoulder', property: 'flexion', keyframes: [kf(0, -10), kf(0.65, 35), kf(1, -10)] },
        { joint: 'spine', property: 'thoracicRotation', keyframes: [kf(0, 0), kf(0.65, -12), kf(1, 0)] },
      ],
    },
  },
];

const TRIGGER_BY_SLING = new Map<SlingId, TriggerMovementSpec>(
  TRIGGER_MOVEMENT_LIBRARY.map(t => [t.slingId, t]),
);

export function getTriggerMovement(slingId: SlingId): TriggerMovementSpec | null {
  return TRIGGER_BY_SLING.get(slingId) ?? null;
}

export function getTriggerMovementById(id: string): TriggerMovementSpec | null {
  return TRIGGER_MOVEMENT_LIBRARY.find(t => t.id === id) ?? null;
}

/* ----------------------------------------------------------------------
 * Joint-delta templates per sling. Used by the local fallback to deviate
 * the actual ghost from the intended one in a clinically meaningful way.
 * Numbers are conservative degrees of compensation seen in typical cases.
 * -------------------------------------------------------------------- */
type DeltaTemplate = { joint: string; axis: string; deg: number; description: string };

const DELTA_TEMPLATES: Record<SlingId, DeltaTemplate[]> = {
  deep_longitudinal: [
    { joint: 'spine', axis: 'flexion', deg: 6, description: 'Trunk hinges forward to compensate for failed posterior chain force transfer' },
    { joint: 'leftKnee', axis: 'flexion', deg: 8, description: 'Knee softens because hamstring drive cannot complete plantarflexion' },
    { joint: 'leftAnkle', axis: 'plantarflexion', deg: -10, description: 'Reduced peak plantarflexion height' },
  ],
  lateral: [
    { joint: 'rightHip', axis: 'abduction', deg: -8, description: 'Contralateral pelvic drop — Trendelenburg sign' },
    { joint: 'spine', axis: 'lateralFlexion', deg: 6, description: 'Lateral trunk lean over the stance leg' },
    { joint: 'leftKnee', axis: 'varus', deg: 6, description: 'Knee drifts into dynamic valgus during stance' },
  ],
  scapular_shoulder: [
    { joint: 'leftScapula', axis: 'upwardRotation', deg: -15, description: 'Scapular dyskinesis — insufficient upward rotation' },
    { joint: 'leftShoulder', axis: 'flexion', deg: -25, description: 'Loss of overhead reach as scapulothoracic rhythm fails' },
    { joint: 'spine', axis: 'extension', deg: 5, description: 'Lumbar extension compensates for missing shoulder range' },
  ],
  anterior_oblique: [
    { joint: 'spine', axis: 'thoracicRotation', deg: -8, description: 'Trunk rotation falls short — adductor / oblique chain cannot drive' },
    { joint: 'rightHip', axis: 'flexion', deg: 10, description: 'Hip flexes deeper to compensate for missing rotational power' },
    { joint: 'rightKnee', axis: 'varus', deg: 5, description: 'Knee drops medially as adductor sling collapses' },
  ],
  posterior_oblique: [
    { joint: 'spine', axis: 'thoracicRotation', deg: 6, description: 'Compensatory trunk rotation hunting for posterior chain power' },
    { joint: 'leftHip', axis: 'extension', deg: -7, description: 'Reduced hip extension at push-off — glute max underdrives' },
    { joint: 'rightShoulder', axis: 'flexion', deg: -10, description: 'Contralateral arm swing dampens — lat/glute couple disconnected' },
  ],
};

const REROUTE_BY_SLING: Record<SlingId, { muscle: string; bones: string[] }> = {
  deep_longitudinal:  { muscle: 'lateral_gastrocnemius / IT band',         bones: ['Knee_L', 'HipPart1_L'] },
  lateral:            { muscle: 'quadratus_lumborum',                       bones: ['Spine1_M', 'RootPart1_M'] },
  scapular_shoulder:  { muscle: 'upper_trapezius',                          bones: ['Neck_M', 'Shoulder_L'] },
  anterior_oblique:   { muscle: 'rectus_abdominis / hip flexors',           bones: ['Chest_M', 'Hip_R'] },
  posterior_oblique:  { muscle: 'lumbar_erector_spinae',                    bones: ['Spine1_M', 'RootPart2_M'] },
};

/* ----------------------------------------------------------------------
 * Local deterministic generator — guarantees a fully playable scenario
 * even when the AI endpoint is unavailable.
 * -------------------------------------------------------------------- */
export function generateSlingFailureScenarioLocal(
  sling: SlingResult,
  opts?: { condition?: string | null },
): SlingFailureScenario {
  const trigger = getTriggerMovement(sling.slingId)
    ?? TRIGGER_MOVEMENT_LIBRARY[0]; // fallback shouldn't fire — every sling has one

  const weakLink = sling.weakLinks[0];
  const weakMuscle = weakLink?.muscle ?? sling.muscleScores?.find(m => m.activation < 50)?.muscle ?? sling.muscleScores?.[0]?.muscle ?? 'sling weak link';
  const pathway = sling.bonePathway ?? [];
  let weakBones: string[] = [];
  if (weakLink && weakLink.boneSegmentIndices.length > 0) {
    weakBones = weakLink.boneSegmentIndices
      .map(i => pathway[i])
      .filter((b): b is string => typeof b === 'string');
  } else if (pathway.length > 0) {
    const mid = Math.floor(pathway.length / 2);
    weakBones = pathway.slice(Math.max(0, mid - 1), mid + 2);
  }

  const reroute = REROUTE_BY_SLING[sling.slingId];
  const deltaTemplates = DELTA_TEMPLATES[sling.slingId] ?? [];

  // Scale deltas by activation score — more dysfunction → bigger deviation.
  const severity = Math.max(0.4, Math.min(1.4, (100 - Math.min(sling.activationScore, 100)) / 50));

  const jointDeltas = deltaTemplates.map(t => ({
    joint: t.joint,
    axis: t.axis,
    intendedDeg: 0,
    actualDeg: Math.round(t.deg * severity * 10) / 10,
    description: t.description,
  }));

  const conditionSuffix = opts?.condition ? ` In a patient with ${opts.condition}, this is the loaded test that exposes the failure.` : '';
  const narration =
    `${trigger.label}: ${trigger.reason} ` +
    `In this case the chain stalls at ${prettifyMuscle(weakMuscle)} ` +
    `(${weakLink ? `${weakLink.activationPct}% activation` : 'reduced activation'}). ` +
    `Force reroutes into ${reroute.muscle} — visible as ${describeDeltas(jointDeltas)}.` +
    conditionSuffix;

  return {
    slingId: sling.slingId,
    slingLabel: sling.label,
    triggerMovementId: trigger.id,
    triggerMovementLabel: trigger.label,
    triggerReason: trigger.reason,
    failureFrame: trigger.failureFrame,
    weakSegmentMuscle: weakMuscle,
    weakSegmentBones: weakBones,
    rerouteTargetMuscle: reroute.muscle,
    rerouteTargetBones: reroute.bones,
    jointDeltas,
    narration,
    confidence: Math.max(0.4, Math.min(0.85, sling.confidence / 100 || 0.6)),
    source: 'local',
  };
}

export function generateScenariosLocal(
  analysis: SlingAnalysisResult,
  opts?: { condition?: string | null },
): SlingFailureScenario[] {
  return analysis.slings
    .filter(s => s.status !== 'normal')
    .map(s => generateSlingFailureScenarioLocal(s, opts));
}

function prettifyMuscle(m: string): string {
  return m.replace(/_/g, ' ');
}

function describeDeltas(deltas: Array<{ joint: string; axis: string; actualDeg: number }>): string {
  if (deltas.length === 0) return 'compensatory joint deviations';
  return deltas
    .slice(0, 2)
    .map(d => {
      const dir = d.actualDeg >= 0 ? 'more' : 'less';
      return `${prettifyJoint(d.joint)} ${d.axis} ${Math.abs(d.actualDeg)}° ${dir}`;
    })
    .join(', ');
}

function prettifyJoint(j: string): string {
  return j.replace(/([A-Z])/g, ' $1').replace(/^\s/, '').toLowerCase();
}

/* Cache key helper — case + marker fingerprint + sling status fingerprint.
 * Keep stable across renders so identical context returns the same key. */
export function buildScenarioFingerprint(input: {
  caseId: string;
  condition?: string | null;
  markers: Array<{ nearestBone?: string; severity?: number }>;
  analysis: SlingAnalysisResult | null;
}): string {
  const markerSig = (input.markers ?? [])
    .map(m => `${m.nearestBone ?? ''}:${Math.round((m.severity ?? 0) * 10) / 10}`)
    .sort()
    .join('|');
  const slingSig = (input.analysis?.slings ?? [])
    .map(s => `${s.slingId}:${s.status}:${Math.round(s.activationScore)}`)
    .sort()
    .join('|');
  return `${input.caseId}::${input.condition ?? ''}::${markerSig}::${slingSig}`;
}
