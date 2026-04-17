import type { CompromisedTissue } from '@/components/skeleton/ClinicalTextInput';
import type { SlingTissueRisk } from '@/lib/slingTissuePressure';
import {
  TENDON_DATA,
  JOINT_SURFACE_DATA,
  NERVE_PATHWAY_DATA,
  FASCIAL_LAYER_DATA,
  type TendonEntry,
  type JointSurfaceEntry,
  type NervePathwayEntry,
  type FascialLayerEntry,
} from '@/lib/tissueViewData';

export type TissueType = 'tendon' | 'nerve' | 'joint' | 'fascia';

export type LoadTolerance = 'high' | 'reduced' | 'failed';
export type Irritability = 'low' | 'moderate' | 'high';
export type HealingStage = 'acute' | 'subacute' | 'chronic' | 'degenerative' | 'baseline';
export type Sensitisation = 'none' | 'peripheral' | 'central';
export type ForceRole = 'prime_mover' | 'stabiliser' | 'force_transmitter' | 'shock_absorber';
export type PainType = 'nociceptive' | 'neuropathic' | 'referred' | 'central';
export type StructuralFunctional = 'structural' | 'functional' | 'mixed';

export type EvidenceSource =
  | 'ai_parse'
  | 'biomechanics'
  | 'sling'
  | 'fascial_chain'
  | 'posture'
  | 'muscle_pathology'
  | 'scar_tissue'
  | 'pain_marker'
  | 'neural_inhibition';

export interface TissueEvidence {
  source: EvidenceSource;
  weight: number;
  contribution: number;
  note: string;
}

export interface CompensationLink {
  tissueId?: string;
  region: string;
  description: string;
}

export interface TissueState {
  loadTolerance: LoadTolerance;
  irritability: Irritability;
  healingStage: HealingStage;
  sensitisation: Sensitisation;
}

export interface MechanicalProfile {
  stiffness: number;
  compliance: number;
  failureThreshold: number;
  currentLoadPct: number;
}

export interface PainGenerator {
  probability: number;
  type: PainType;
}

export interface CompensationChain {
  upstream: CompensationLink[];
  downstream: CompensationLink[];
}

export interface InterventionResponse {
  respondsTo: string[];
  poorlyRespondsTo: string[];
  adaptationWeeks: number;
}

export interface CapacityDemand {
  capacity: number;
  demand: number;
  overloadRatio: number;
}

export interface NeuralStatus {
  drive: number;
  inhibition: number;
  reflexGuarding: boolean;
}

export interface TissueIntelligence {
  tissueId: string;
  tissueType: TissueType;
  label: string;
  bones: string[];
  region: string;
  severity: number;
  confidence: 'low' | 'moderate' | 'high';
  rationale: string;
  state: TissueState;
  mechanical: MechanicalProfile;
  forceRole: ForceRole;
  painGenerator: PainGenerator;
  compensation: CompensationChain;
  intervention: InterventionResponse;
  capacityDemand: CapacityDemand;
  structuralFunctional: StructuralFunctional;
  neural: NeuralStatus;
  evidence: TissueEvidence[];
}

interface TissueDefault {
  forceRole: ForceRole;
  baseStiffness: number;
  baseCompliance: number;
  failureThreshold: number;
  baseCapacity: number;
  intervention: InterventionResponse;
  defaultPainType: PainType;
}

const TENDON_DEFAULT: TissueDefault = {
  forceRole: 'force_transmitter',
  baseStiffness: 70,
  baseCompliance: 30,
  failureThreshold: 100,
  baseCapacity: 80,
  intervention: {
    respondsTo: ['Heavy slow resistance', 'Isometric loading', 'Eccentric loading', 'Load management'],
    poorlyRespondsTo: ['Complete rest', 'Passive stretching alone'],
    adaptationWeeks: 12,
  },
  defaultPainType: 'nociceptive',
};

const JOINT_DEFAULT: TissueDefault = {
  forceRole: 'shock_absorber',
  baseStiffness: 55,
  baseCompliance: 45,
  failureThreshold: 100,
  baseCapacity: 75,
  intervention: {
    respondsTo: ['Joint mobilisation', 'Progressive loading', 'Quadriceps strengthening', 'Aerobic conditioning'],
    poorlyRespondsTo: ['Prolonged immobilisation', 'High-impact loading early'],
    adaptationWeeks: 8,
  },
  defaultPainType: 'nociceptive',
};

const NERVE_DEFAULT: TissueDefault = {
  forceRole: 'force_transmitter',
  baseStiffness: 30,
  baseCompliance: 70,
  failureThreshold: 100,
  baseCapacity: 70,
  intervention: {
    respondsTo: ['Neural mobilisation', 'Postural correction', 'Decompression', 'Nerve gliding'],
    poorlyRespondsTo: ['Aggressive stretching', 'Sustained compression'],
    adaptationWeeks: 6,
  },
  defaultPainType: 'neuropathic',
};

const FASCIA_DEFAULT: TissueDefault = {
  forceRole: 'force_transmitter',
  baseStiffness: 50,
  baseCompliance: 50,
  failureThreshold: 100,
  baseCapacity: 70,
  intervention: {
    respondsTo: ['Myofascial release', 'Slow sustained stretch', 'Foam rolling', 'Movement integration'],
    poorlyRespondsTo: ['Single-plane stretching', 'Brief dynamic stretching alone'],
    adaptationWeeks: 4,
  },
  defaultPainType: 'referred',
};

const TISSUE_DEFAULTS: Record<TissueType, TissueDefault> = {
  tendon: TENDON_DEFAULT,
  joint: JOINT_DEFAULT,
  nerve: NERVE_DEFAULT,
  fascia: FASCIA_DEFAULT,
};

const TISSUE_TYPE_OVERRIDES: Record<string, Partial<TissueDefault>> = {
  achilles_l: { forceRole: 'force_transmitter', baseStiffness: 80 },
  achilles_r: { forceRole: 'force_transmitter', baseStiffness: 80 },
  patellar_l: { forceRole: 'force_transmitter', baseStiffness: 78 },
  patellar_r: { forceRole: 'force_transmitter', baseStiffness: 78 },
  supraspinatus_l: { forceRole: 'stabiliser', baseCapacity: 65 },
  supraspinatus_r: { forceRole: 'stabiliser', baseCapacity: 65 },
  gluteus_medius_l: { forceRole: 'stabiliser', baseCapacity: 70 },
  gluteus_medius_r: { forceRole: 'stabiliser', baseCapacity: 70 },
  hip_l: { forceRole: 'shock_absorber', baseCapacity: 85 },
  hip_r: { forceRole: 'shock_absorber', baseCapacity: 85 },
  tibiofemoral_l: { forceRole: 'shock_absorber', baseCapacity: 80 },
  tibiofemoral_r: { forceRole: 'shock_absorber', baseCapacity: 80 },
  facet_lumbar: { forceRole: 'stabiliser', baseCapacity: 65 },
  facet_cervical: { forceRole: 'stabiliser', baseCapacity: 60 },
  si_l: { forceRole: 'stabiliser', baseCapacity: 70 },
  si_r: { forceRole: 'stabiliser', baseCapacity: 70 },
};

function getDefault(tissueType: TissueType, tissueId: string): TissueDefault {
  const base = TISSUE_DEFAULTS[tissueType];
  const override = TISSUE_TYPE_OVERRIDES[tissueId];
  return override ? { ...base, ...override } : base;
}

interface TissueMeta {
  label: string;
  bones: string[];
  region: string;
}

function findTissueMeta(tissueType: TissueType, tissueId: string): TissueMeta | null {
  const lookup: Record<TissueType, Array<TendonEntry | JointSurfaceEntry | NervePathwayEntry | FascialLayerEntry>> = {
    tendon: TENDON_DATA,
    joint: JOINT_SURFACE_DATA,
    nerve: NERVE_PATHWAY_DATA,
    fascia: FASCIAL_LAYER_DATA,
  };
  const entry = lookup[tissueType].find(e => e.id === tissueId);
  if (!entry) return null;
  return { label: entry.label, bones: entry.bones, region: entry.region };
}

function deriveHealingStage(tissueType: TissueType, tissueId: string, severity: number): HealingStage {
  if (tissueType === 'tendon') {
    const t = TENDON_DATA.find(x => x.id === tissueId);
    if (t?.cookStage === 3 || severity >= 0.85) return 'degenerative';
    if (t?.cookStage === 2 || severity >= 0.6) return 'chronic';
    if (severity >= 0.35) return 'subacute';
    return 'acute';
  }
  if (tissueType === 'joint') {
    const j = JOINT_SURFACE_DATA.find(x => x.id === tissueId);
    if ((j?.kellgrenLawrence ?? 0) >= 3 || severity >= 0.8) return 'degenerative';
    if ((j?.kellgrenLawrence ?? 0) === 2 || severity >= 0.55) return 'chronic';
    if (severity >= 0.3) return 'subacute';
    return 'baseline';
  }
  if (severity >= 0.7) return 'chronic';
  if (severity >= 0.4) return 'subacute';
  return 'acute';
}

function deriveLoadTolerance(severity: number): LoadTolerance {
  if (severity >= 0.8) return 'failed';
  if (severity >= 0.4) return 'reduced';
  return 'high';
}

function deriveIrritability(severity: number, painProb: number): Irritability {
  const score = severity * 0.6 + painProb * 0.004;
  if (score >= 0.6) return 'high';
  if (score >= 0.3) return 'moderate';
  return 'low';
}

function deriveSensitisation(painProb: number, painType: PainType): Sensitisation {
  if (painType === 'central') return 'central';
  if (painProb >= 60) return 'peripheral';
  return 'none';
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function mapMyofascialChainToFasciaIds(chainId: string): string[] {
  const c = chainId.toLowerCase();
  if (c.startsWith('superficial_back')) return ['sbl'];
  if (c.startsWith('superficial_front')) return ['sfl'];
  if (c.startsWith('deep_front')) return ['dfl'];
  if (c.startsWith('lateral_line_l')) return ['lateral_l'];
  if (c.startsWith('lateral_line_r')) return ['lateral_r'];
  if (c.startsWith('lateral_line') || c.startsWith('lateral_sling')) return ['lateral_l', 'lateral_r'];
  if (c.startsWith('spiral')) return ['spiral'];
  if (c.startsWith('arm_line_l')) return ['front_arm_l'];
  if (c.startsWith('arm_line_r')) return ['front_arm_r'];
  if (c.startsWith('arm_line')) return ['front_arm_l', 'front_arm_r'];
  if (c.includes('anterior_oblique')) return ['sfl', 'dfl'];
  if (c.includes('posterior_oblique')) return ['sbl'];
  return [];
}

interface JointForceData {
  boneName: string;
  totalForce: number;
  status: string;
  label: string;
}

interface MuscleOverrideMinimal {
  pathology?: string;
  inhibition?: number;
  tensionOffset?: number;
  isManual?: boolean;
}

interface PainMarkerMinimal {
  label: string;
  severity?: number;
  type?: string;
  description?: string;
}

interface ChainIntegrityMinimal {
  chainId: string;
  score: number;
  issues: string[];
}

export interface AggregatorInput {
  aiCompromisedTissues?: CompromisedTissue[];
  slingTissueRisks?: SlingTissueRisk[];
  jointForceData?: JointForceData[];
  muscleOverrides?: Record<string, MuscleOverrideMinimal>;
  painMarkers?: PainMarkerMinimal[];
  chainIntegrityScores?: ChainIntegrityMinimal[];
  scarTissueIds?: string[];
  postureDeviations?: Record<string, number>;
}

interface AccumulatedTissue {
  evidence: TissueEvidence[];
  rationales: string[];
  severityContributions: number[];
  painProbContributions: number[];
  inhibitionContributions: number[];
  guarding: boolean;
  overrideStructural: boolean;
}

function getOrCreate(
  acc: Map<string, AccumulatedTissue>,
  key: string
): AccumulatedTissue {
  let entry = acc.get(key);
  if (!entry) {
    entry = {
      evidence: [],
      rationales: [],
      severityContributions: [],
      painProbContributions: [],
      inhibitionContributions: [],
      guarding: false,
      overrideStructural: false,
    };
    acc.set(key, entry);
  }
  return entry;
}

function keyOf(type: TissueType, id: string): string {
  return `${type}:${id}`;
}

function tissueRegionMatchesBoneArea(region: string, boneName: string): boolean {
  const r = region.toLowerCase();
  const b = boneName.toLowerCase();
  if (r.includes('knee') && b.includes('knee')) return true;
  if (r.includes('hip') && b.includes('hip')) return true;
  if (r.includes('ankle') && b.includes('ankle')) return true;
  if (r.includes('shoulder') && b.includes('shoulder')) return true;
  if (r.includes('elbow') && b.includes('elbow')) return true;
  if (r.includes('spine') && (b.includes('spine') || b.includes('root'))) return true;
  if (r.includes('foot') && (b.includes('toes') || b.includes('ankle'))) return true;
  return false;
}

function regionToTissueIds(type: TissueType, region: string): string[] {
  const lookup: Record<TissueType, Array<{ id: string; region: string }>> = {
    tendon: TENDON_DATA,
    joint: JOINT_SURFACE_DATA,
    nerve: NERVE_PATHWAY_DATA,
    fascia: FASCIAL_LAYER_DATA,
  };
  const r = region.toLowerCase();
  return lookup[type]
    .filter(e => e.region.toLowerCase().includes(r) || r.includes(e.region.toLowerCase()))
    .map(e => e.id);
}

const COMPENSATION_PATTERNS: Record<string, CompensationLink[]> = {
  hip_l: [{ region: 'lumbar spine', description: 'Lumbar extensors compensate, increased L4-L5 facet load' }],
  hip_r: [{ region: 'lumbar spine', description: 'Lumbar extensors compensate, increased L4-L5 facet load' }],
  tibiofemoral_l: [{ region: 'ankle', description: 'Ankle dorsiflexion restriction worsens, hip drives substitution' }],
  tibiofemoral_r: [{ region: 'ankle', description: 'Ankle dorsiflexion restriction worsens, hip drives substitution' }],
  patellar_l: [{ region: 'quadriceps', description: 'Eccentric quad control reduces, knee valgus appears' }],
  patellar_r: [{ region: 'quadriceps', description: 'Eccentric quad control reduces, knee valgus appears' }],
  achilles_l: [{ region: 'plantar fascia', description: 'Plantar fascia overload as calf push-off shifts forefoot' }],
  achilles_r: [{ region: 'plantar fascia', description: 'Plantar fascia overload as calf push-off shifts forefoot' }],
  supraspinatus_l: [{ region: 'scapular stabilisers', description: 'Upper trap dominance, scapular dyskinesis' }],
  supraspinatus_r: [{ region: 'scapular stabilisers', description: 'Upper trap dominance, scapular dyskinesis' }],
  gluteus_medius_l: [{ region: 'TFL/IT band', description: 'Tensor fasciae latae dominance, lateral knee load shift' }],
  gluteus_medius_r: [{ region: 'TFL/IT band', description: 'Tensor fasciae latae dominance, lateral knee load shift' }],
  facet_lumbar: [{ region: 'thoracolumbar fascia', description: 'Multifidus inhibition, erector spinae bracing' }],
  si_l: [{ region: 'contralateral hip', description: 'Cross-body force redistribution via posterior oblique sling' }],
  si_r: [{ region: 'contralateral hip', description: 'Cross-body force redistribution via posterior oblique sling' }],
};

const UPSTREAM_DRIVERS: Record<string, CompensationLink[]> = {
  hip_l: [{ region: 'core/glute med', description: 'Insufficient pelvic stability drives hip overload' }],
  hip_r: [{ region: 'core/glute med', description: 'Insufficient pelvic stability drives hip overload' }],
  tibiofemoral_l: [{ region: 'hip/ankle', description: 'Hip abductor weakness or ankle stiffness drive valgus loading' }],
  tibiofemoral_r: [{ region: 'hip/ankle', description: 'Hip abductor weakness or ankle stiffness drive valgus loading' }],
  patellar_l: [{ region: 'eccentric loading capacity', description: 'Sudden volume increase in jumping/landing exceeds tendon capacity' }],
  patellar_r: [{ region: 'eccentric loading capacity', description: 'Sudden volume increase in jumping/landing exceeds tendon capacity' }],
  supraspinatus_l: [{ region: 'thoracic posture', description: 'Forward head + thoracic kyphosis narrows subacromial space' }],
  supraspinatus_r: [{ region: 'thoracic posture', description: 'Forward head + thoracic kyphosis narrows subacromial space' }],
  facet_lumbar: [{ region: 'hip mobility', description: 'Hip extension restriction shifts motion to lumbar facets' }],
};

function buildCompensation(tissueType: TissueType, tissueId: string): CompensationChain {
  return {
    upstream: UPSTREAM_DRIVERS[tissueId] ?? [],
    downstream: COMPENSATION_PATTERNS[tissueId] ?? [],
  };
}

function deriveStructuralFunctional(
  healingStage: HealingStage,
  inhibition: number,
  hasMusclePath: boolean
): StructuralFunctional {
  if (healingStage === 'degenerative') return 'structural';
  if (healingStage === 'chronic') return inhibition > 30 ? 'mixed' : 'structural';
  if (inhibition > 40 || hasMusclePath) return 'functional';
  return 'mixed';
}

function applyHealingCapacityModifier(capacity: number, stage: HealingStage): number {
  const mod: Record<HealingStage, number> = {
    baseline: 1.0,
    acute: 0.55,
    subacute: 0.7,
    chronic: 0.6,
    degenerative: 0.45,
  };
  return Math.round(capacity * mod[stage]);
}

export function aggregateTissueIntelligence(input: AggregatorInput): TissueIntelligence[] {
  const acc = new Map<string, AccumulatedTissue>();
  const typeOf = new Map<string, TissueType>();

  if (input.aiCompromisedTissues) {
    for (const ct of input.aiCompromisedTissues) {
      const k = keyOf(ct.tissue_type, ct.tissue_id);
      typeOf.set(k, ct.tissue_type);
      const e = getOrCreate(acc, k);
      const weight = ct.confidence === 'confirmed' ? 1.0 : 0.7;
      const sev = clamp(ct.severity, 0, 1);
      e.severityContributions.push(sev);
      e.painProbContributions.push(sev * 60);
      e.rationales.push(ct.rationale);
      e.evidence.push({
        source: 'ai_parse',
        weight,
        contribution: sev,
        note: ct.rationale,
      });
    }
  }

  if (input.slingTissueRisks) {
    for (const sr of input.slingTissueRisks) {
      const k = keyOf(sr.tissue_type, sr.tissue_id);
      typeOf.set(k, sr.tissue_type);
      const e = getOrCreate(acc, k);
      const sev = clamp(sr.severity, 0, 1);
      e.severityContributions.push(sev);
      e.painProbContributions.push(sr.riskPercent * 0.6);
      e.evidence.push({
        source: 'sling',
        weight: 0.8,
        contribution: sev,
        note: `${sr.slingLabel} (${sr.mechanism.replace('_', ' ')}) — ${sr.riskPercent}% risk`,
      });
    }
  }

  if (input.jointForceData) {
    for (const jf of input.jointForceData) {
      if (jf.totalForce < 1.5) continue;
      const candidates = JOINT_SURFACE_DATA.filter(j =>
        j.bones.includes(jf.boneName) || tissueRegionMatchesBoneArea(j.region, jf.boneName)
      );
      for (const j of candidates) {
        const k = keyOf('joint', j.id);
        typeOf.set(k, 'joint');
        const e = getOrCreate(acc, k);
        const overload = clamp((jf.totalForce - 1.5) / 2.5, 0, 1);
        if (overload < 0.1) continue;
        e.severityContributions.push(overload * 0.6);
        e.painProbContributions.push(overload * 50);
        e.evidence.push({
          source: 'biomechanics',
          weight: 0.85,
          contribution: overload,
          note: `${jf.label} loaded at ${jf.totalForce.toFixed(1)}× BW (${jf.status})`,
        });
      }
    }
  }

  if (input.muscleOverrides) {
    for (const [muscleId, ov] of Object.entries(input.muscleOverrides)) {
      if (!ov || !ov.isManual) continue;
      const pathology = ov.pathology && ov.pathology !== 'none' ? ov.pathology : null;
      const inhibition = ov.inhibition ?? 0;
      if (!pathology && inhibition < 25) continue;

      const sev = pathology ? 0.5 : clamp(inhibition / 100, 0, 0.8);

      let tendonCandidates: TendonEntry[] = [];
      const m = muscleId.toLowerCase();
      if (m.includes('quad') || m.includes('rect_fem')) {
        tendonCandidates = TENDON_DATA.filter(t => t.id.startsWith('patellar_'));
      } else if (m.includes('gastroc') || m.includes('soleus') || m.includes('calf')) {
        tendonCandidates = TENDON_DATA.filter(t => t.id.startsWith('achilles_'));
      } else if (m.includes('supraspinatus') || m.includes('infraspinatus') || m.includes('rotator')) {
        tendonCandidates = TENDON_DATA.filter(t => t.id.startsWith('supraspinatus_'));
      } else if (m.includes('glut_med') || m.includes('glut_min')) {
        tendonCandidates = TENDON_DATA.filter(t => t.id.startsWith('gluteus_medius_'));
      }
      for (const t of tendonCandidates) {
        const side = t.id.endsWith('_l') ? 'l' : t.id.endsWith('_r') ? 'r' : null;
        if (side) {
          const mid = muscleId.toLowerCase();
          const sideTokens = side === 'l'
            ? [/(^|_)l(_|$)/, /(^|_)left(_|$)/]
            : [/(^|_)r(_|$)/, /(^|_)right(_|$)/];
          if (!sideTokens.some(rx => rx.test(mid))) continue;
        }
        const k = keyOf('tendon', t.id);
        typeOf.set(k, 'tendon');
        const e = getOrCreate(acc, k);
        e.severityContributions.push(sev);
        if (inhibition > 0) e.inhibitionContributions.push(inhibition);
        if (pathology) {
          e.evidence.push({
            source: 'muscle_pathology',
            weight: 0.7,
            contribution: sev,
            note: `Driving muscle has ${pathology.replace(/_/g, ' ')}`,
          });
        }
        if (inhibition >= 25) {
          const neuralWeight = clamp(0.55 + (inhibition - 25) / 200, 0.55, 0.85);
          e.evidence.push({
            source: 'neural_inhibition',
            weight: neuralWeight,
            contribution: clamp(inhibition / 100, 0, 0.85),
            note: `Driving muscle neurally inhibited ${inhibition}% — reduced motor drive, capacity drop`,
          });
        }
      }
    }
  }

  if (input.painMarkers) {
    for (const pm of input.painMarkers) {
      const sev = (pm.severity ?? 5) / 10;
      if (sev < 0.4) continue;
      const isNeuro = pm.type === 'neuropathic' || /numb|tingl|burn|shoot/i.test(pm.description ?? '');
      if (isNeuro) {
        const lowerLabel = pm.label.toLowerCase();
        const nerveCandidates = NERVE_PATHWAY_DATA.filter(n =>
          n.bones.some(b => lowerLabel.includes(b.toLowerCase().replace(/_[lr]$/, ''))) ||
          n.region.includes(lowerLabel.split(' ')[0])
        );
        for (const n of nerveCandidates.slice(0, 2)) {
          const k = keyOf('nerve', n.id);
          typeOf.set(k, 'nerve');
          const e = getOrCreate(acc, k);
          e.severityContributions.push(sev * 0.7);
          e.painProbContributions.push(sev * 80);
          e.evidence.push({
            source: 'pain_marker',
            weight: 0.8,
            contribution: sev,
            note: `Neuropathic pattern in ${pm.label}`,
          });
        }
      }
      const region = pm.label.toLowerCase();
      const jointIds = regionToTissueIds('joint', region);
      for (const id of jointIds.slice(0, 2)) {
        const k = keyOf('joint', id);
        typeOf.set(k, 'joint');
        const e = getOrCreate(acc, k);
        e.severityContributions.push(sev * 0.5);
        e.painProbContributions.push(sev * 60);
        e.evidence.push({
          source: 'pain_marker',
          weight: 0.65,
          contribution: sev * 0.5,
          note: `Pain reported at ${pm.label} (${pm.severity ?? 5}/10)`,
        });
      }
    }
  }

  if (input.chainIntegrityScores) {
    for (const ch of input.chainIntegrityScores) {
      if (ch.score >= 55) continue;
      const failure = (55 - ch.score) / 55;
      const fasciaIds = mapMyofascialChainToFasciaIds(ch.chainId);
      for (const id of fasciaIds) {
        const k = keyOf('fascia', id);
        typeOf.set(k, 'fascia');
        const e = getOrCreate(acc, k);
        e.severityContributions.push(failure * 0.6);
        e.evidence.push({
          source: 'fascial_chain',
          weight: 0.75,
          contribution: failure,
          note: `Chain integrity ${ch.score}% — ${ch.issues[0] ?? 'integrity loss'}`,
        });
      }
    }
  }

  if (input.scarTissueIds) {
    for (const id of input.scarTissueIds) {
      const k = keyOf('fascia', id);
      typeOf.set(k, 'fascia');
      const e = getOrCreate(acc, k);
      e.severityContributions.push(0.5);
      e.overrideStructural = true;
      e.evidence.push({
        source: 'scar_tissue',
        weight: 0.85,
        contribution: 0.5,
        note: 'Scar/adhesion present — restricts glide and propagates tension',
      });
    }
  }

  if (input.postureDeviations) {
    for (const [param, value] of Object.entries(input.postureDeviations)) {
      const abs = Math.abs(value);
      if (abs < 15) continue;
      const sev = clamp((abs - 15) / 40, 0, 0.8);
      if (param.toLowerCase().includes('forwardhead') || param.toLowerCase().includes('kyphosis')) {
        for (const id of ['supraspinatus_l', 'supraspinatus_r', 'facet_cervical']) {
          const type: TissueType = id.startsWith('facet') ? 'joint' : 'tendon';
          const k = keyOf(type, id);
          typeOf.set(k, type);
          const e = getOrCreate(acc, k);
          e.severityContributions.push(sev * 0.4);
          e.evidence.push({
            source: 'posture',
            weight: 0.6,
            contribution: sev,
            note: `${param} deviation ${value.toFixed(0)}°`,
          });
        }
      }
      if (param.toLowerCase().includes('lordosis') || param.toLowerCase().includes('tilt')) {
        for (const id of ['facet_lumbar', 'si_l', 'si_r']) {
          const k = keyOf('joint', id);
          typeOf.set(k, 'joint');
          const e = getOrCreate(acc, k);
          e.severityContributions.push(sev * 0.4);
          e.evidence.push({
            source: 'posture',
            weight: 0.6,
            contribution: sev,
            note: `${param} deviation ${value.toFixed(0)}°`,
          });
        }
      }
    }
  }

  const results: TissueIntelligence[] = [];
  for (const [key, data] of Array.from(acc.entries())) {
    const tissueType = typeOf.get(key);
    if (!tissueType) continue;
    const tissueId = key.split(':')[1];
    const meta = findTissueMeta(tissueType, tissueId);
    if (!meta) continue;

    const def = getDefault(tissueType, tissueId);

    const sumWeights = data.evidence.reduce((s, e) => s + e.weight, 0) || 1;
    const weightedSeverity = data.evidence.reduce((s, e, i) => {
      const c = data.severityContributions[i] ?? e.contribution;
      return s + c * e.weight;
    }, 0) / sumWeights;
    const sources = new Set(data.evidence.map(e => e.source));
    const convergenceBoost = Math.min(0.2, (sources.size - 1) * 0.06);
    const severity = clamp(weightedSeverity + convergenceBoost, 0, 1);

    const painProb = clamp(
      data.painProbContributions.length > 0
        ? data.painProbContributions.reduce((s, p) => s + p, 0) / data.painProbContributions.length
        : severity * 50,
      0,
      100
    );

    const inhibition = data.inhibitionContributions.length > 0
      ? Math.max(...data.inhibitionContributions)
      : (severity > 0.5 ? 25 : 0);

    const healingStage = deriveHealingStage(tissueType, tissueId, severity);
    const loadTolerance = deriveLoadTolerance(severity);
    const painType = def.defaultPainType;
    const irritability = deriveIrritability(severity, painProb);
    const sensitisation = deriveSensitisation(painProb, painType);

    const capacity = applyHealingCapacityModifier(def.baseCapacity, healingStage);
    const demand = clamp(severity * def.failureThreshold + inhibition * 0.2, 0, def.failureThreshold * 1.5);
    const overloadRatio = capacity > 0 ? demand / capacity : 1;

    const stiffnessShift = healingStage === 'degenerative' ? 10 : healingStage === 'chronic' ? 5 : 0;
    const mechanical: MechanicalProfile = {
      stiffness: clamp(def.baseStiffness + stiffnessShift, 0, 100),
      compliance: clamp(def.baseCompliance - stiffnessShift, 0, 100),
      failureThreshold: def.failureThreshold,
      currentLoadPct: clamp(Math.round(overloadRatio * 100), 0, 200),
    };

    const compensation = buildCompensation(tissueType, tissueId);
    const structuralFunctional = data.overrideStructural
      ? 'structural'
      : deriveStructuralFunctional(
          healingStage,
          inhibition,
          data.evidence.some(e => e.source === 'muscle_pathology')
        );

    const neural: NeuralStatus = {
      drive: clamp(50 - inhibition * 0.5 - (irritability === 'high' ? 15 : irritability === 'moderate' ? 5 : 0), 0, 100),
      inhibition: Math.round(inhibition),
      reflexGuarding: irritability === 'high' || painProb >= 70,
    };

    const confidence: TissueIntelligence['confidence'] =
      sources.size >= 3 ? 'high' : sources.size === 2 ? 'moderate' : 'low';

    const rationale = data.rationales[0]
      ?? data.evidence[0]?.note
      ?? 'Evidence-driven tissue compromise detected';

    results.push({
      tissueId,
      tissueType,
      label: meta.label,
      bones: meta.bones,
      region: meta.region,
      severity,
      confidence,
      rationale,
      state: { loadTolerance, irritability, healingStage, sensitisation },
      mechanical,
      forceRole: def.forceRole,
      painGenerator: { probability: Math.round(painProb), type: painType },
      compensation,
      intervention: def.intervention,
      capacityDemand: { capacity, demand: Math.round(demand), overloadRatio: Math.round(overloadRatio * 100) / 100 },
      structuralFunctional,
      neural,
      evidence: data.evidence,
    });
  }

  results.sort((a, b) => b.severity - a.severity);
  return results;
}

export function getOverloadColor(overloadRatio: number): string {
  if (overloadRatio >= 1.2) return '#ef4444';
  if (overloadRatio >= 1.0) return '#f97316';
  if (overloadRatio >= 0.75) return '#eab308';
  if (overloadRatio >= 0.5) return '#22c55e';
  return '#3b82f6';
}

export const EVIDENCE_SOURCE_LABELS: Record<EvidenceSource, string> = {
  ai_parse: 'Clinical AI',
  biomechanics: 'Biomechanics',
  sling: 'Sling Engine',
  fascial_chain: 'Fascial Chain',
  posture: 'Posture',
  muscle_pathology: 'Muscle Pathology',
  scar_tissue: 'Scar Tissue',
  pain_marker: 'Pain Marker',
  neural_inhibition: 'Neural Inhibition',
};
