/**
 * Sling Driver Analysis (Task #235)
 *
 * Reverse-reasoning layer that takes the auto-placed pain markers + the
 * existing forward sling analysis output and produces:
 *   - Ranked culpable-sling hypotheses with rationale, supporting markers,
 *     differentiation tests, intended vs actual force-flow descriptions and
 *     a severity score.
 *   - A node/edge graph for the SVG Load Flow Map (one graph per top
 *     hypothesis, plus an "intended" baseline graph keyed by the same nodes).
 *   - A list of `slingDrivenRecommendation[]` that downstream engine tabs
 *     (Exercise / Manual / EPA / Lifestyle) consume to decorate / reorder
 *     their cards and to power a "Plan from this analysis" cart drop.
 *
 * Pure deterministic logic. No React, no AI, no DB. Safe to call inside
 * a useMemo on every render.
 */

import type { SlingAnalysisResult, SlingResult, SlingId } from './slingEngine';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type DriverRole = 'address-driver' | 'restore' | 'calm-compensatory';

export type DriverModality =
  | 'exercise'
  | 'manual_therapy'
  | 'electrophysical'
  | 'lifestyle';

export interface DriverAnalysisPainMarker {
  id: string;
  nearestBone: string;
  anatomicalLabel: string;
  severity?: number; // 0..10 expected; missing → 5
  type?: string;
}

export interface SlingHypothesis {
  slingId: SlingId;
  slingLabel: string;
  color: string;
  /** Total weighted evidence score (markers + forward dysfunction). */
  score: number;
  /** Confidence band derived from score and supporting markers. */
  confidence: 'high' | 'moderate' | 'low';
  /** One-liner explaining why this sling is implicated. */
  rationale: string;
  /** Pain markers (ids + labels) that pinned this sling. */
  supportingMarkers: Array<{ id: string; label: string; bone: string }>;
  /** Joints/regions in the sling pathway that are loaded or symptomatic. */
  loadedRegions: string[];
  /** "What this sling is supposed to do" pulled from forward output. */
  intendedRole: string;
  /** "What is happening now" derived from forward sling status. */
  actualPattern: string;
  /** Quick-pick differentiation tests so the clinician can confirm. */
  differentiationTests: string[];
  /** Forward sling status carried through for color coding. */
  status: SlingResult['status'];
  /** Forward activation score carried through. */
  activationScore: number;
}

export type FlowEdgeQuality = 'intended' | 'overloaded' | 'rerouted';

export interface FlowNode {
  id: string;
  label: string;
  /** True when this node has an auto-placed pain marker on it. */
  pinned: boolean;
  /** Forward-engine flag: this bone showed up in overloadedBoneIndices. */
  overloaded: boolean;
  /** Forward-engine flag: this bone showed up in compensatingBoneIndices. */
  compensating: boolean;
  x: number;
  y: number;
}

export interface FlowEdge {
  from: string;
  to: string;
  quality: FlowEdgeQuality;
  /** Optional short caption on the edge ("force reroute", "overload"). */
  caption?: string;
}

export interface FlowGraph {
  slingId: SlingId;
  slingLabel: string;
  color: string;
  nodes: FlowNode[];
  intendedEdges: FlowEdge[];
  actualEdges: FlowEdge[];
}

export interface SlingDrivenRecommendation {
  /** Stable id so the cart and chip-rendering both key off the same string. */
  id: string;
  modality: DriverModality;
  role: DriverRole;
  slingId: SlingId;
  slingLabel: string;
  slingColor: string;
  /** Human-friendly title used in the Plan-from-analysis list. */
  name: string;
  /** Body / muscle / region this rec acts on. */
  target: string;
  /** Short clinical "why". */
  rationale: string;
  /** Lower-case substrings the engine tabs use to match their items. */
  matchKeywords: string[];
  /** Optional intervention verb for downstream styling. */
  intervention?: 'strengthen' | 'release' | 'activate' | 'stabilize' | 'modulate' | 'educate';
  /** Optional default dosage suggestion for the cart row. */
  dosage?: string;
}

export interface DriverAnalysisResult {
  hasMarkers: boolean;
  markerCount: number;
  /** Ordered most → least likely. Empty when there is nothing to reason about. */
  hypotheses: SlingHypothesis[];
  /** Top hypothesis convenience accessor. */
  topHypothesis: SlingHypothesis | null;
  /** Flow graph for the top hypothesis (null when no hypothesis). */
  topFlowGraph: FlowGraph | null;
  /** Recommendations grouped per modality, used by engine tabs and cart. */
  recommendations: SlingDrivenRecommendation[];
  /** All-text fallback shown when we cannot map any marker to a sling. */
  fallbackNote: string | null;
}

// ---------------------------------------------------------------------------
// Region heuristics — keyword ↔ sling mapping. Each marker contributes weight
// to every sling it matches (markers are often relevant to multiple slings).
// ---------------------------------------------------------------------------

interface RegionRule {
  patterns: RegExp[];
  weights: Partial<Record<SlingId, number>>;
  regionLabel: string;
}

const REGION_RULES: RegionRule[] = [
  {
    patterns: [/shoulder/i, /scapula/i, /deltoid/i, /rotator/i, /acromio/i, /glenohumeral/i, /supraspinatus/i, /infraspinatus/i, /subscapular/i],
    weights: { scapular_shoulder: 3, posterior_oblique: 1 },
    regionLabel: 'shoulder',
  },
  {
    patterns: [/lumbar/i, /low(er)? back/i, /\bL[1-5]\b/i, /thoracolumbar/i, /erector/i, /multifidus/i],
    weights: { posterior_oblique: 2, deep_longitudinal: 2 },
    regionLabel: 'lumbar',
  },
  {
    patterns: [/sacroil/i, /\bSI joint\b/i, /\bSIJ\b/i, /sacrum/i, /sacrotuber/i],
    weights: { posterior_oblique: 3, deep_longitudinal: 2 },
    regionLabel: 'sacroiliac',
  },
  {
    patterns: [/lateral hip/i, /\bITB\b/i, /iliotibial/i, /trochan/i, /tensor fasc/i, /tfl/i],
    weights: { lateral: 3 },
    regionLabel: 'lateral hip',
  },
  {
    patterns: [/\bhip\b/i, /buttock/i, /glute/i, /piriform/i, /gluteus/i],
    weights: { posterior_oblique: 2, lateral: 2, anterior_oblique: 1 },
    regionLabel: 'hip',
  },
  {
    patterns: [/groin/i, /adductor/i, /pubic/i, /symphysis/i],
    weights: { anterior_oblique: 3 },
    regionLabel: 'groin',
  },
  {
    patterns: [/\bknee\b/i, /patell/i, /\bMCL\b/i, /\bLCL\b/i, /meniscus/i],
    weights: { lateral: 2, deep_longitudinal: 2 },
    regionLabel: 'knee',
  },
  {
    patterns: [/ankle/i, /achilles/i, /calf/i, /gastroc/i, /soleus/i, /\bfoot\b/i, /plantar/i, /peroneus/i, /fibular/i],
    weights: { deep_longitudinal: 3 },
    regionLabel: 'ankle/foot',
  },
  {
    patterns: [/abdomen/i, /\bcore\b/i, /oblique/i, /rectus abdom/i, /linea alba/i, /anterior trunk/i],
    weights: { anterior_oblique: 3 },
    regionLabel: 'anterior trunk',
  },
  {
    patterns: [/thoracic/i, /\bT[1-9]\b/i, /\bT1[0-2]\b/i, /mid-?back/i, /upper back/i],
    weights: { posterior_oblique: 2, scapular_shoulder: 1 },
    regionLabel: 'thoracic',
  },
  {
    patterns: [/neck/i, /cervical/i, /\bC[1-7]\b/i],
    weights: { scapular_shoulder: 2 },
    regionLabel: 'cervical',
  },
  {
    patterns: [/elbow/i, /forearm/i, /wrist/i, /hand/i],
    weights: { scapular_shoulder: 2 },
    regionLabel: 'upper limb',
  },
  {
    patterns: [/hamstring/i, /biceps femoris/i, /semitend/i, /semimembran/i],
    weights: { deep_longitudinal: 2, posterior_oblique: 1 },
    regionLabel: 'posterior thigh',
  },
];

const SYMPTOM_TYPE_WEIGHTS: Record<string, number> = {
  point: 1,
  area: 1.2,
  paint: 1.4,
  referred: 1.1,
  line: 1.1,
};

function severityWeight(severity?: number): number {
  if (typeof severity !== 'number' || Number.isNaN(severity)) return 1;
  // 0..10 → 0.4..1.6 (avoid zero contribution for noted markers).
  const clamped = Math.max(0, Math.min(10, severity));
  return 0.4 + (clamped / 10) * 1.2;
}

// ---------------------------------------------------------------------------
// Forward-engine descriptors → text for "intended" and "actual" force-flow.
// ---------------------------------------------------------------------------

const INTENDED_ROLES: Record<SlingId, string> = {
  posterior_oblique:
    'Lat → thoracolumbar fascia → contralateral glute max delivers diagonal posterior force across the SI joint.',
  anterior_oblique:
    'External oblique → linea alba → contralateral adductor delivers rotational power across the pubic symphysis.',
  lateral:
    'Glute med + min and TFL co-contract with QL to keep the pelvis level over the stance hip.',
  deep_longitudinal:
    'Peroneus → biceps femoris → sacrotuberous → erector spinae transmit ground reaction force from foot to spine.',
  scapular_shoulder:
    'Serratus anterior, lower trap and rotator cuff combine to upwardly rotate and centre the scapula and humeral head.',
};

function actualPatternFor(sling: SlingResult): string {
  const score = sling.activationScore;
  const status = sling.status;
  if (status === 'overloaded') {
    return `Overloaded (activation ${score}%). Force is being absorbed locally instead of transferred — pain markers cluster here.`;
  }
  if (status === 'underperforming') {
    return `Underperforming (activation ${score}%). The intended chain has dropped out and load is leaking into compensators.`;
  }
  if (status === 'compensating') {
    return `Compensating for an adjacent sling — accepting load it was not designed to carry.`;
  }
  return `Operating near baseline (activation ${score}%) but the marker pattern still implicates this chain.`;
}

// ---------------------------------------------------------------------------
// Recommendations per sling. Deterministic, evidence-grounded.
// ---------------------------------------------------------------------------

interface RecommendationTemplate {
  modality: DriverModality;
  role: DriverRole;
  name: string;
  target: string;
  rationale: string;
  matchKeywords: string[];
  intervention?: SlingDrivenRecommendation['intervention'];
  dosage?: string;
}

const SLING_REC_TEMPLATES: Record<SlingId, RecommendationTemplate[]> = {
  posterior_oblique: [
    {
      modality: 'exercise',
      role: 'restore',
      name: 'Contralateral glute max activation (e.g., bird dog, single-leg hip extension)',
      target: 'gluteus maximus',
      rationale: 'Re-engage the diagonal lat–TLF–glute force couple to off-load the SI joint.',
      matchKeywords: ['bird dog', 'glute', 'hip extension', 'bridge', 'deadlift', 'romanian'],
      intervention: 'activate',
      dosage: '3 × 10/side · daily',
    },
    {
      modality: 'exercise',
      role: 'restore',
      name: 'Lat pulldown / row patterning to rebuild the lat–TLF link',
      target: 'latissimus dorsi',
      rationale: 'Reconnect lat tension to the contralateral glute via the thoracolumbar fascia.',
      matchKeywords: ['lat', 'pulldown', 'row', 'pull up', 'pull-up'],
      intervention: 'strengthen',
      dosage: '3 × 8 · 2×/week',
    },
    {
      modality: 'manual_therapy',
      role: 'calm-compensatory',
      name: 'Soft-tissue release to over-tight QL / lumbar erectors',
      target: 'quadratus lumborum, erector spinae',
      rationale: 'Quiet the local back-extensor compensation taking over for the failing diagonal sling.',
      matchKeywords: ['ql', 'quadratus', 'erector', 'lumbar', 'paraspinal', 'thoracolumbar'],
      intervention: 'release',
    },
    {
      modality: 'electrophysical',
      role: 'calm-compensatory',
      name: 'TENS / IFC over the SI joint for pain modulation',
      target: 'sacroiliac joint',
      rationale: 'Down-regulate pain so the patient can re-train the diagonal sling.',
      matchKeywords: ['tens', 'ifc', 'interferential', 'electrical stim'],
      intervention: 'modulate',
    },
    {
      modality: 'lifestyle',
      role: 'address-driver',
      name: 'Lifting technique re-education with diagonal load awareness',
      target: 'lifting / loaded rotation',
      rationale: 'Preserve diagonal force transfer in everyday loaded tasks.',
      matchKeywords: ['lifting', 'workstation', 'pne', 'pacing'],
      intervention: 'educate',
    },
  ],
  anterior_oblique: [
    {
      modality: 'exercise',
      role: 'restore',
      name: 'Anti-rotation press / Pallof press',
      target: 'external oblique, internal oblique',
      rationale: 'Re-train the rotational force-couple across the pubic symphysis.',
      matchKeywords: ['pallof', 'anti-rotation', 'oblique', 'wood chop', 'cable rotation'],
      intervention: 'activate',
      dosage: '3 × 8/side · daily',
    },
    {
      modality: 'exercise',
      role: 'restore',
      name: 'Adductor squeeze / Copenhagen plank progression',
      target: 'adductors',
      rationale: 'Rebuild the contralateral adductor link of the anterior oblique sling.',
      matchKeywords: ['adductor', 'copenhagen', 'squeeze', 'side plank'],
      intervention: 'strengthen',
    },
    {
      modality: 'manual_therapy',
      role: 'calm-compensatory',
      name: 'Soft-tissue release to over-tight rectus abdominis / hip flexors',
      target: 'rectus abdominis, iliopsoas',
      rationale: 'Quiet anterior bracing dominance that is suppressing the oblique sling.',
      matchKeywords: ['rectus', 'iliopsoas', 'hip flexor', 'abdominal'],
      intervention: 'release',
    },
    {
      modality: 'electrophysical',
      role: 'calm-compensatory',
      name: 'Local pain-modulation modality at the groin / pubic symphysis',
      target: 'pubic symphysis',
      rationale: 'Down-regulate pain to allow rotational re-training.',
      matchKeywords: ['tens', 'ifc', 'ultrasound'],
      intervention: 'modulate',
    },
    {
      modality: 'lifestyle',
      role: 'address-driver',
      name: 'Pacing of cutting / change-of-direction sport exposure',
      target: 'rotational sport demand',
      rationale: 'Reduce rotational load until the sling can carry it.',
      matchKeywords: ['pacing', 'activity', 'flare'],
      intervention: 'educate',
    },
  ],
  lateral: [
    {
      modality: 'exercise',
      role: 'restore',
      name: 'Side plank with hip abduction / clamshells / single-leg stance',
      target: 'gluteus medius, gluteus minimus',
      rationale: 'Rebuild frontal-plane pelvic control to stop the Trendelenburg/valgus pattern.',
      matchKeywords: ['side plank', 'clamshell', 'hip abduction', 'single-leg', 'single leg', 'glute med', 'gluteus medius'],
      intervention: 'strengthen',
      dosage: '3 × 30 s/side · daily',
    },
    {
      modality: 'manual_therapy',
      role: 'calm-compensatory',
      name: 'TFL / ITB release & QL inhibition',
      target: 'tensor fasciae latae, ITB, quadratus lumborum',
      rationale: 'Quiet TFL/QL substitution that masks weak gluteus medius.',
      matchKeywords: ['tfl', 'tensor fasciae', 'itb', 'iliotibial', 'ql', 'quadratus'],
      intervention: 'release',
    },
    {
      modality: 'electrophysical',
      role: 'calm-compensatory',
      name: 'NMES to gluteus medius for activation re-education',
      target: 'gluteus medius',
      rationale: 'Re-wake an inhibited glute med while the patient retrains the lateral sling.',
      matchKeywords: ['nmes', 'russian', 'electrical stim'],
      intervention: 'activate',
    },
    {
      modality: 'lifestyle',
      role: 'address-driver',
      name: 'Walking-aid use + activity substitution for painful single-leg load',
      target: 'gait / stance load',
      rationale: 'Off-load the failing lateral sling while it is being trained.',
      matchKeywords: ['walking aid', 'pacing', 'activity', 'taping'],
      intervention: 'educate',
    },
  ],
  deep_longitudinal: [
    {
      modality: 'exercise',
      role: 'restore',
      name: 'Calf raise → single-leg RDL → posterior chain loading',
      target: 'gastroc/soleus, biceps femoris, erector spinae',
      rationale: 'Re-train ground-reaction force transmission from foot to spine.',
      matchKeywords: ['calf raise', 'rdl', 'romanian', 'deadlift', 'hamstring', 'good morning'],
      intervention: 'strengthen',
      dosage: '3 × 12 · 3×/week',
    },
    {
      modality: 'manual_therapy',
      role: 'calm-compensatory',
      name: 'Erector spinae / sacrotuberous release',
      target: 'erector spinae, sacrotuberous ligament',
      rationale: 'Reduce the chronic tensile load that builds when shock absorption fails.',
      matchKeywords: ['erector', 'paraspinal', 'sacrotuberous', 'thoracolumbar'],
      intervention: 'release',
    },
    {
      modality: 'electrophysical',
      role: 'calm-compensatory',
      name: 'Ultrasound / TENS over symptomatic SI / low back',
      target: 'lumbar / SI region',
      rationale: 'Modulate pain so loading progression is tolerable.',
      matchKeywords: ['ultrasound', 'tens', 'ifc', 'shockwave'],
      intervention: 'modulate',
    },
    {
      modality: 'lifestyle',
      role: 'address-driver',
      name: 'Footwear / orthotic review and impact pacing',
      target: 'foot strike load',
      rationale: 'Address the upstream foot driver of the longitudinal sling failure.',
      matchKeywords: ['pacing', 'activity substitution', 'workstation'],
      intervention: 'educate',
    },
  ],
  scapular_shoulder: [
    {
      modality: 'exercise',
      role: 'restore',
      name: 'Serratus push-up plus / wall slide / lower-trap "Y"',
      target: 'serratus anterior, lower trapezius',
      rationale: 'Rebuild scapulothoracic upward rotation and scapular control.',
      matchKeywords: ['serratus', 'wall slide', 'wall-slide', 'lower trap', 'y raise', 'scapular', 'push-up plus'],
      intervention: 'activate',
      dosage: '3 × 10 · daily',
    },
    {
      modality: 'exercise',
      role: 'restore',
      name: 'Rotator cuff external rotation strengthening',
      target: 'infraspinatus, teres minor',
      rationale: 'Re-centre the humeral head and restore the glenohumeral force couple.',
      matchKeywords: ['rotator cuff', 'external rotation', 'er at side', 'infraspinatus'],
      intervention: 'strengthen',
    },
    {
      modality: 'manual_therapy',
      role: 'calm-compensatory',
      name: 'Upper trapezius / levator scapulae release',
      target: 'upper trapezius, levator scapulae',
      rationale: 'Quiet upper-trap dominance that drives shrugging and impingement.',
      matchKeywords: ['upper trap', 'levator', 'pec minor', 'sub-occipital'],
      intervention: 'release',
    },
    {
      modality: 'electrophysical',
      role: 'calm-compensatory',
      name: 'Subacromial pain-modulation modality',
      target: 'subacromial space',
      rationale: 'Down-regulate pain to allow scapular re-training.',
      matchKeywords: ['tens', 'ifc', 'ultrasound', 'laser'],
      intervention: 'modulate',
    },
    {
      modality: 'lifestyle',
      role: 'address-driver',
      name: 'Workstation set-up + sleep position to off-load the shoulder',
      target: 'desk / overhead exposure',
      rationale: 'Remove the daily mechanical driver of scapular dyskinesis.',
      matchKeywords: ['workstation', 'sleep', 'pacing', 'taping'],
      intervention: 'educate',
    },
  ],
};

// ---------------------------------------------------------------------------
// Core scoring
// ---------------------------------------------------------------------------

interface MarkerScoreContribution {
  markerId: string;
  bone: string;
  label: string;
  weight: number;
  region: string;
}

function scoreMarkersBySling(
  markers: DriverAnalysisPainMarker[],
  forwardSlings: SlingResult[],
): {
  perSling: Map<SlingId, { score: number; contributions: MarkerScoreContribution[]; regions: Set<string> }>;
  unmappedMarkers: DriverAnalysisPainMarker[];
} {
  const perSling = new Map<SlingId, { score: number; contributions: MarkerScoreContribution[]; regions: Set<string> }>();
  const unmapped: DriverAnalysisPainMarker[] = [];

  // Build a quick lookup of bone → slings (for nearestBone match).
  const boneToSlings = new Map<string, SlingId[]>();
  for (const fs of forwardSlings) {
    // SlingResult does not directly expose bonePathway, so pull it from the
    // same SLING_SPECS that build the forward output. Forward output keeps
    // overloadedBoneIndices / compensatingBoneIndices but we want labels so
    // we reuse the muscleScores list as a coarse joint hint.
    void fs;
  }

  for (const marker of markers) {
    const haystack = `${marker.anatomicalLabel || ''} ${marker.nearestBone || ''}`;
    const symptomMul = SYMPTOM_TYPE_WEIGHTS[(marker.type || 'point').toLowerCase()] ?? 1;
    const sevMul = severityWeight(marker.severity);
    let matched = false;

    for (const rule of REGION_RULES) {
      if (!rule.patterns.some(rx => rx.test(haystack))) continue;
      matched = true;
      for (const [slingId, weight] of Object.entries(rule.weights) as Array<[SlingId, number]>) {
        const w = (weight ?? 0) * symptomMul * sevMul;
        if (!perSling.has(slingId)) {
          perSling.set(slingId, { score: 0, contributions: [], regions: new Set() });
        }
        const entry = perSling.get(slingId)!;
        entry.score += w;
        entry.contributions.push({
          markerId: marker.id,
          bone: marker.nearestBone,
          label: marker.anatomicalLabel || marker.nearestBone,
          weight: w,
          region: rule.regionLabel,
        });
        entry.regions.add(rule.regionLabel);
      }
    }

    // Bone-pathway match (used for ambiguous labels). We still consult the
    // forward output: any sling whose overloadedBoneIndices includes a bone
    // matching this marker's nearestBone gets a small boost.
    for (const fs of forwardSlings) {
      const boneHit = fs.muscleScores.some(ms =>
        marker.nearestBone &&
        (ms.muscle.toLowerCase().includes(marker.nearestBone.toLowerCase()) ||
          marker.nearestBone.toLowerCase().includes(ms.muscle.toLowerCase())),
      );
      if (boneHit) {
        matched = true;
        if (!perSling.has(fs.slingId)) {
          perSling.set(fs.slingId, { score: 0, contributions: [], regions: new Set() });
        }
        perSling.get(fs.slingId)!.score += 0.5 * symptomMul * sevMul;
      }
    }

    if (!matched) unmapped.push(marker);
  }

  // Forward-status boost — a sling already flagged dysfunctional gets weight
  // even if no marker maps directly (so empty maps still rank).
  for (const fs of forwardSlings) {
    if (fs.status === 'normal') continue;
    if (!perSling.has(fs.slingId)) continue; // only boost if a marker already hit it
    const boost =
      fs.status === 'overloaded' ? 1.5 :
      fs.status === 'underperforming' ? 1.5 :
      0.75;
    perSling.get(fs.slingId)!.score += boost;
  }

  return { perSling, unmappedMarkers: unmapped };
}

function classifyConfidence(score: number, supportingMarkers: number): SlingHypothesis['confidence'] {
  if (score >= 6 && supportingMarkers >= 2) return 'high';
  if (score >= 3) return 'moderate';
  return 'low';
}

// ---------------------------------------------------------------------------
// Flow graph layout — a deterministic horizontal chain. Pain pins highlighted.
// ---------------------------------------------------------------------------

const SLING_FLOW_NODES: Record<SlingId, Array<{ id: string; label: string }>> = {
  posterior_oblique: [
    { id: 'lat', label: 'Latissimus' },
    { id: 'tlf', label: 'TL fascia' },
    { id: 'sij', label: 'SI joint' },
    { id: 'glute_max_c', label: 'Contra. glute max' },
    { id: 'hip_c', label: 'Contra. hip' },
  ],
  anterior_oblique: [
    { id: 'eo', label: 'External oblique' },
    { id: 'la', label: 'Linea alba' },
    { id: 'pubic', label: 'Pubic symphysis' },
    { id: 'add_c', label: 'Contra. adductor' },
    { id: 'hip_c', label: 'Contra. hip' },
  ],
  lateral: [
    { id: 'ql', label: 'QL' },
    { id: 'pelvis', label: 'Pelvis' },
    { id: 'glute_med', label: 'Glute med' },
    { id: 'tfl', label: 'TFL / ITB' },
    { id: 'knee', label: 'Knee' },
  ],
  deep_longitudinal: [
    { id: 'foot', label: 'Foot / peroneus' },
    { id: 'bf', label: 'Biceps femoris' },
    { id: 'sl', label: 'Sacrotuberous lig.' },
    { id: 'es', label: 'Erector spinae' },
    { id: 'spine', label: 'Lumbar spine' },
  ],
  scapular_shoulder: [
    { id: 'sa', label: 'Serratus' },
    { id: 'lt', label: 'Lower trap' },
    { id: 'scap', label: 'Scapula' },
    { id: 'rc', label: 'Rotator cuff' },
    { id: 'gh', label: 'Glenohumeral' },
  ],
};

/** Keywords used to decide which graph node a marker pins to. */
const NODE_PIN_KEYWORDS: Record<string, RegExp[]> = {
  lat: [/lat\b/i, /latissimus/i],
  tlf: [/thoracolumbar/i, /lumbar fascia/i, /\bTLF\b/i],
  sij: [/sacroil/i, /\bSIJ\b/i, /\bSI joint\b/i, /sacrum/i],
  glute_max_c: [/glute max/i, /gluteus maximus/i, /buttock/i],
  hip_c: [/\bhip\b/i],
  eo: [/external oblique/i, /\boblique\b/i],
  la: [/linea alba/i, /\bcore\b/i, /rectus abdom/i],
  pubic: [/pubic/i, /symphysis/i, /groin/i],
  add_c: [/adductor/i, /groin/i],
  ql: [/\bQL\b/i, /quadratus/i, /lateral lumbar/i],
  pelvis: [/pelvi/i, /sacroil/i],
  glute_med: [/glute med/i, /gluteus medius/i, /lateral hip/i, /trochan/i],
  tfl: [/\bTFL\b/i, /tensor fasc/i, /\bITB\b/i, /iliotibial/i],
  knee: [/\bknee\b/i, /patell/i],
  foot: [/foot/i, /peroneus/i, /fibular/i, /plantar/i, /ankle/i],
  bf: [/biceps femoris/i, /hamstring/i],
  sl: [/sacrotuber/i],
  es: [/erector/i, /paraspinal/i, /multifidus/i],
  spine: [/lumbar/i, /\bL[1-5]\b/i, /low(er)? back/i],
  sa: [/serratus/i],
  lt: [/lower trap/i, /trapezius/i],
  scap: [/scapula/i, /scapular/i],
  rc: [/rotator cuff/i, /infraspinatus/i, /supraspinatus/i, /subscapular/i, /teres minor/i],
  gh: [/glenohumeral/i, /shoulder/i, /deltoid/i, /acromio/i, /subacrom/i],
};

function buildFlowGraph(
  hypothesis: SlingHypothesis,
  markers: DriverAnalysisPainMarker[],
  forwardSling: SlingResult | undefined,
): FlowGraph {
  const nodeDefs = SLING_FLOW_NODES[hypothesis.slingId];
  const W = 320;
  const H = 110;
  const padX = 20;
  const padY = 40;
  const step = nodeDefs.length > 1 ? (W - padX * 2) / (nodeDefs.length - 1) : 0;

  const nodes: FlowNode[] = nodeDefs.map((nd, i) => {
    const haystackList = markers.map(m => `${m.anatomicalLabel || ''} ${m.nearestBone || ''}`);
    const pinned = (NODE_PIN_KEYWORDS[nd.id] || []).some(rx =>
      haystackList.some(h => rx.test(h)),
    );
    // Light wave so the chain reads as a path rather than a flat line.
    const yOffset = (i % 2 === 0 ? -1 : 1) * 8;
    return {
      id: nd.id,
      label: nd.label,
      pinned,
      overloaded: hypothesis.status === 'overloaded' && pinned,
      compensating: hypothesis.status === 'compensating',
      x: padX + step * i,
      y: padY + yOffset,
    };
  });

  // Intended chain: green sequential edges.
  const intendedEdges: FlowEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    intendedEdges.push({ from: nodes[i].id, to: nodes[i + 1].id, quality: 'intended' });
  }

  // Actual chain: same edges but recolored at the loaded segment, plus a
  // reroute edge if the forward output reports any.
  const actualEdges: FlowEdge[] = intendedEdges.map(e => {
    const fromN = nodes.find(n => n.id === e.from)!;
    const toN = nodes.find(n => n.id === e.to)!;
    if (fromN.pinned || toN.pinned) {
      const isOverload = hypothesis.status === 'overloaded' || hypothesis.status === 'underperforming';
      return { ...e, quality: isOverload ? 'overloaded' : 'rerouted', caption: isOverload ? 'overload' : 'reroute' };
    }
    return e;
  });

  // Top reroute caption from forward output, if any.
  const topReroute = forwardSling?.forceReroutes?.[0];
  if (topReroute && nodes.length >= 2) {
    actualEdges.push({
      from: nodes[0].id,
      to: nodes[nodes.length - 1].id,
      quality: 'rerouted',
      caption: `${topReroute.fromMuscle} → ${topReroute.toMuscle} (+${topReroute.reroutePct}%)`,
    });
  }

  return {
    slingId: hypothesis.slingId,
    slingLabel: hypothesis.slingLabel,
    color: hypothesis.color,
    nodes,
    intendedEdges,
    actualEdges,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function runDriverAnalysis(
  rawMarkers: DriverAnalysisPainMarker[] | null | undefined,
  forwardOutput: SlingAnalysisResult | null,
): DriverAnalysisResult {
  const markers = (rawMarkers ?? []).filter(m => !!m && !!m.nearestBone);
  if (!forwardOutput || markers.length === 0) {
    return {
      hasMarkers: markers.length > 0,
      markerCount: markers.length,
      hypotheses: [],
      topHypothesis: null,
      topFlowGraph: null,
      recommendations: [],
      fallbackNote: markers.length === 0
        ? 'Place pain markers on the 3D skeleton to surface culpable-sling hypotheses.'
        : 'Sling forward analysis not yet ready — adjust the skeleton to populate biomechanical data.',
    };
  }

  const { perSling, unmappedMarkers } = scoreMarkersBySling(markers, forwardOutput.slings);

  if (perSling.size === 0) {
    return {
      hasMarkers: true,
      markerCount: markers.length,
      hypotheses: [],
      topHypothesis: null,
      topFlowGraph: null,
      recommendations: [],
      fallbackNote:
        'None of the placed markers map cleanly to a known sling region. Try placing markers nearer the muscle/joint of interest.',
    };
  }

  const slingById = new Map<SlingId, SlingResult>();
  for (const fs of forwardOutput.slings) slingById.set(fs.slingId, fs);

  const hypotheses: SlingHypothesis[] = [];
  for (const [slingId, entry] of perSling) {
    const fs = slingById.get(slingId);
    if (!fs) continue;
    const supportingMap = new Map<string, { id: string; label: string; bone: string }>();
    for (const c of entry.contributions) {
      if (!supportingMap.has(c.markerId)) {
        supportingMap.set(c.markerId, { id: c.markerId, label: c.label, bone: c.bone });
      }
    }
    const supporting = Array.from(supportingMap.values());
    const rationaleBits: string[] = [];
    if (entry.regions.size > 0) rationaleBits.push(`Markers across ${Array.from(entry.regions).join(', ')}`);
    if (fs.status !== 'normal') rationaleBits.push(`forward engine reports ${fs.status}`);
    if (fs.weakLinks.length > 0) rationaleBits.push(`${fs.weakLinks.length} weak link${fs.weakLinks.length === 1 ? '' : 's'}`);
    const rationale = rationaleBits.length > 0
      ? rationaleBits.join(' · ')
      : 'Marker pattern overlaps with this sling.';

    hypotheses.push({
      slingId,
      slingLabel: fs.label,
      color: fs.color,
      score: Math.round(entry.score * 10) / 10,
      confidence: classifyConfidence(entry.score, supporting.length),
      rationale,
      supportingMarkers: supporting,
      loadedRegions: Array.from(entry.regions),
      intendedRole: INTENDED_ROLES[slingId],
      actualPattern: actualPatternFor(fs),
      differentiationTests: (fs.assessmentTests && fs.assessmentTests.length > 0
        ? fs.assessmentTests
        : fs.commonDysfunctions || []
      ).slice(0, 4),
      status: fs.status,
      activationScore: fs.activationScore,
    });
  }

  hypotheses.sort((a, b) => b.score - a.score);

  const top = hypotheses[0];
  const topFlowGraph = top
    ? buildFlowGraph(top, markers, slingById.get(top.slingId))
    : null;

  // Build recommendations from the top 1–2 hypotheses so we don't drown the
  // engine tabs in noise. If the top two hypotheses have similar scores
  // (within 25%), include both.
  const cutoffSling: SlingId[] = [top.slingId];
  if (hypotheses[1] && hypotheses[1].score >= top.score * 0.75) cutoffSling.push(hypotheses[1].slingId);

  const recommendations: SlingDrivenRecommendation[] = [];
  for (const sid of cutoffSling) {
    const slingLabel = slingById.get(sid)?.label ?? sid;
    const slingColor = slingById.get(sid)?.color ?? '#06b6d4';
    for (const tpl of SLING_REC_TEMPLATES[sid]) {
      recommendations.push({
        id: `sling-rec::${sid}::${tpl.modality}::${tpl.name.replace(/\s+/g, '_').toLowerCase()}`,
        modality: tpl.modality,
        role: tpl.role,
        slingId: sid,
        slingLabel,
        slingColor,
        name: tpl.name,
        target: tpl.target,
        rationale: tpl.rationale,
        matchKeywords: tpl.matchKeywords.map(k => k.toLowerCase()),
        intervention: tpl.intervention,
        dosage: tpl.dosage,
      });
    }
  }

  return {
    hasMarkers: true,
    markerCount: markers.length,
    hypotheses,
    topHypothesis: top,
    topFlowGraph,
    recommendations,
    fallbackNote: unmappedMarkers.length > 0 && hypotheses.length === 0
      ? `${unmappedMarkers.length} marker${unmappedMarkers.length === 1 ? '' : 's'} could not be mapped to a sling region.`
      : null,
  };
}

// ---------------------------------------------------------------------------
// Engine-tab helper: find the recommendations that match a given item name.
// Used by Exercise / Manual / EPA / Lifestyle tabs to render chips and
// reorder lists. Pure, deterministic, called from useMemo.
// ---------------------------------------------------------------------------

export function matchRecommendationsForItem(
  itemName: string | undefined | null,
  modality: DriverModality,
  recommendations: SlingDrivenRecommendation[] | undefined | null,
): SlingDrivenRecommendation[] {
  if (!itemName || !recommendations || recommendations.length === 0) return [];
  const hay = itemName.toLowerCase();
  return recommendations.filter(rec =>
    rec.modality === modality &&
    rec.matchKeywords.some(kw => kw && hay.includes(kw)),
  );
}

/** Sort comparator: items with restore role first, then address-driver, then
 *  calm-compensatory, then untagged. Stable for items in the same band. */
export function sortByDriverRole<T>(
  items: T[],
  getRecs: (item: T) => SlingDrivenRecommendation[],
): T[] {
  const bandOf = (item: T): number => {
    const recs = getRecs(item);
    if (recs.some(r => r.role === 'restore')) return 0;
    if (recs.some(r => r.role === 'address-driver')) return 1;
    if (recs.some(r => r.role === 'calm-compensatory')) return 2;
    return 3;
  };
  return items
    .map((item, idx) => ({ item, idx, band: bandOf(item) }))
    .sort((a, b) => a.band - b.band || a.idx - b.idx)
    .map(x => x.item);
}
