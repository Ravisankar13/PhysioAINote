import type {
  InjuryMechanismResult,
  CausalChainStep,
  CompensationCard,
  LoadRedistribution,
  KineticChainDysfunction,
} from './injuryMechanismEngine';
import {
  TECHNIQUE_DB,
  STATUS_TO_ACTION,
  type TreatmentTechnique,
} from './treatmentPriorityEngine';
import type { ClinicalStatus } from './muscleBiomechanicsEngine';

export type EvidenceGrade = 'A' | 'B' | 'C' | 'Expert';

export interface MechTreatmentTechnique {
  name: string;
  type: 'manual' | 'exercise' | 'modality';
  dosage: string;
  rationale: string;
  evidenceGrade: EvidenceGrade;
}

export type MechTargetCategory = 'root_cause' | 'intermediate' | 'symptom' | 'compensation' | 'overload' | 'chain';
export type MechTargetSource = 'causal_chain' | 'compensation' | 'overloaded_joint' | 'kinetic_chain';

export interface MechTreatmentTarget {
  id: string;
  structure: string;
  source: MechTargetSource;
  category: MechTargetCategory;
  severity: 'mild' | 'moderate' | 'severe';
  priority: number;
  finding: string;
  mechanism: string;
  action: string;
  techniques: MechTreatmentTechnique[];
  roles: MechTargetCategory[];
}

export interface MechTreatmentSummary {
  totalTargets: number;
  rootCauses: number;
  compensations: number;
  overloadedJoints: number;
  chainDysfunctions: number;
  approachSequence: string[];
  overallPlan: string;
}

export interface MechTreatmentResult {
  targets: MechTreatmentTarget[];
  fullTargetCount: number;
  summary: MechTreatmentSummary;
}

function toMechTechnique(t: TreatmentTechnique): MechTreatmentTechnique {
  return {
    name: t.name,
    type: t.type,
    dosage: t.dosage,
    rationale: t.rationale,
    evidenceGrade: t.evidenceGrade as EvidenceGrade,
  };
}

function pickTechniquesForStatus(status: ClinicalStatus, limit = 3): MechTreatmentTechnique[] {
  const techniques = TECHNIQUE_DB[status] || [];
  return techniques.slice(0, limit).map(toMechTechnique);
}

function inferClinicalStatus(step: CausalChainStep): ClinicalStatus {
  const lower = (step.finding + ' ' + step.mechanism).toLowerCase();
  if (lower.includes('spasm') || lower.includes('guarding')) return 'spasm';
  if (lower.includes('overactive') || lower.includes('hypertonic') || lower.includes('tight') || lower.includes('hyperactiv')) return 'overactive';
  if (lower.includes('shortened') || lower.includes('adaptive shorten') || lower.includes('contracture')) return 'shortened';
  if (lower.includes('inhibit') || lower.includes('underactive') || lower.includes('delayed activation')) return 'inhibited';
  if (lower.includes('weak') || lower.includes('atrophy') || lower.includes('deficit')) return 'weak';
  if (lower.includes('lengthen') || lower.includes('elongat') || lower.includes('overstretched')) return 'lengthened';

  if (step.category === 'root_cause') return 'overactive';
  if (step.category === 'intermediate') return 'shortened';
  return 'spasm';
}

function getActionLabel(status: ClinicalStatus): string {
  return STATUS_TO_ACTION[status]?.label || 'Treat';
}

const ANTAGONIST_PAIRS: Record<string, string> = {
  'upper trapezius': 'Lower Trapezius',
  'upper trap': 'Lower Trapezius',
  'levator scapulae': 'Lower Trapezius',
  'pec major': 'Rhomboids / Middle Trapezius',
  'pec minor': 'Lower Trapezius / Serratus Anterior',
  'pectoralis major': 'Rhomboids / Middle Trapezius',
  'pectoralis minor': 'Lower Trapezius / Serratus Anterior',
  'rectus femoris': 'Gluteus Maximus / Hamstrings',
  'iliopsoas': 'Gluteus Maximus',
  'psoas': 'Gluteus Maximus',
  'hip flexor': 'Gluteus Maximus',
  'hip flexors': 'Gluteus Maximus',
  'erector spinae': 'Transversus Abdominis / Rectus Abdominis',
  'gastrocnemius': 'Tibialis Anterior',
  'gastroc': 'Tibialis Anterior',
  'soleus': 'Tibialis Anterior',
  'tfl': 'Gluteus Medius (posterior fibers)',
  'tensor fasciae latae': 'Gluteus Medius (posterior fibers)',
  'sternocleidomastoid': 'Deep Cervical Flexors',
  'scm': 'Deep Cervical Flexors',
  'scalene': 'Deep Cervical Flexors',
  'subscapularis': 'Infraspinatus / Teres Minor',
  'infraspinatus': 'Subscapularis / Pectoralis Major',
  'biceps': 'Triceps',
  'triceps': 'Biceps',
  'quadriceps': 'Hamstrings',
  'hamstrings': 'Quadriceps',
  'adductors': 'Gluteus Medius',
  'adductor': 'Gluteus Medius',
  'piriformis': 'Gluteus Medius (internal rotation component)',
  'vastus lateralis': 'Vastus Medialis (VMO)',
  'it band': 'Gluteus Medius',
  'anterior deltoid': 'Posterior Deltoid',
  'posterior deltoid': 'Anterior Deltoid',
  'latissimus dorsi': 'Anterior Deltoid / Pectoralis Major',
  'gluteus maximus': 'Iliopsoas / Rectus Femoris',
  'gluteus medius': 'Adductors',
  'tibialis anterior': 'Gastrocnemius / Soleus',
  'tibialis posterior': 'Peroneals (Fibularis)',
  'peroneals': 'Tibialis Posterior',
};

function resolveAntagonist(muscleName: string): string {
  const lower = muscleName.toLowerCase().replace(/^[lr] /, '');
  for (const [key, value] of Object.entries(ANTAGONIST_PAIRS)) {
    if (lower.includes(key) || key.includes(lower)) return value;
  }
  return '';
}

function extractWeakMusclesFromPattern(card: CompensationCard): string[] {
  const weakKeywords: Record<string, string[]> = {
    upper_cross_syndrome: ['Deep Neck Flexors', 'Lower Trapezius'],
    lower_cross_syndrome: ['Gluteus Maximus', 'Abdominals', 'Transversus Abdominis'],
    pronation_distortion: ['Gluteus Medius', 'Tibialis Posterior'],
    posterior_chain_weakness: ['Gluteus Maximus', 'Hamstrings'],
    anterior_dominance: ['Rhomboids', 'Lower Trapezius', 'Infraspinatus', 'Gluteus Maximus'],
  };
  const lower = card.title.toLowerCase();
  for (const [key, muscles] of Object.entries(weakKeywords)) {
    const normalizedKey = key.replace(/_/g, ' ');
    if (lower.includes(normalizedKey) || lower.includes(key.replace(/_/g, ''))) return muscles;
  }
  const primaryLower = card.primaryDysfunction.toLowerCase();
  if (primaryLower.includes('inhibit') || primaryLower.includes('weak')) {
    const match = card.primaryDysfunction.match(/(?:inhibited?|weak)\s+(.+?)(?:\s*[—–-]|$)/i);
    if (match) return [match[1].trim()];
  }
  return [];
}

const REGION_AUGMENTATION: Record<string, MechTreatmentTechnique[]> = {
  lumbar: [
    { name: 'McGill Big 3 stabilization', type: 'exercise', dosage: 'Curl-up, side bridge, bird-dog — 3 × 8-10s holds', rationale: 'Build endurance in stabilizers without excessive spinal load', evidenceGrade: 'A' },
  ],
  cervical: [
    { name: 'Deep cervical flexor activation (craniocervical flexion)', type: 'exercise', dosage: '10 × 10s holds at progressive pressure levels', rationale: 'Address deep flexor inhibition — root cause of many cervical presentations', evidenceGrade: 'A' },
  ],
  shoulder: [
    { name: 'Scapular setting and serratus anterior activation', type: 'exercise', dosage: 'Wall slides / push-up plus — 3 × 10 reps', rationale: 'Restore scapulohumeral rhythm and reduce impingement risk', evidenceGrade: 'A' },
  ],
  hip: [
    { name: 'Glute activation program (bridging → side-lying → standing)', type: 'exercise', dosage: '3 × 12-15 reps progressive difficulty', rationale: 'Address gluteal inhibition — major contributor to hip, knee, and lumbar dysfunction', evidenceGrade: 'A' },
  ],
  knee: [
    { name: 'VMO activation (terminal knee extension)', type: 'exercise', dosage: '3 × 15 reps, last 30° ROM', rationale: 'Restore VMO timing and strength for patellofemoral tracking', evidenceGrade: 'A' },
  ],
  ankle: [
    { name: 'Proprioceptive balance training', type: 'exercise', dosage: '3 × 30-60s single-leg stance, progressive surfaces', rationale: 'Retrain ankle proprioception and dynamic stability', evidenceGrade: 'A' },
  ],
};

const CHAIN_TREATMENTS: Record<string, MechTreatmentTechnique[]> = {
  posterior: [
    { name: 'Posterior chain integration (Romanian deadlift pattern)', type: 'exercise', dosage: '3 × 10 reps, hip-hinge focus', rationale: 'Restore force transmission through posterior oblique sling', evidenceGrade: 'B' },
    { name: 'Hamstring eccentric loading (Nordic curls)', type: 'exercise', dosage: '3 × 5-8 reps, controlled descent', rationale: 'Build eccentric capacity in posterior chain for deceleration control', evidenceGrade: 'A' },
  ],
  anterior: [
    { name: 'Anterior chain lengthening (hip flexor complex)', type: 'exercise', dosage: '3 × 30s holds, half-kneeling', rationale: 'Address anterior chain dominance by restoring hip extension', evidenceGrade: 'B' },
    { name: 'Anti-extension core training (dead bug, plank)', type: 'exercise', dosage: '3 × 10 reps, maintain neutral spine', rationale: 'Train anterior core to resist extension forces without hip flexor dominance', evidenceGrade: 'B' },
  ],
  lateral: [
    { name: 'Lateral stability training (single-leg stance, lateral band walks)', type: 'exercise', dosage: '3 × 12-15 reps per side', rationale: 'Restore frontal plane stability to reduce lateral shift compensations', evidenceGrade: 'A' },
    { name: 'Gluteus medius/minimus strengthening', type: 'exercise', dosage: '3 × 12 reps, side-lying → standing progression', rationale: 'Address hip abductor weakness — primary contributor to lateral chain dysfunction', evidenceGrade: 'A' },
  ],
};

function normalizeStructureKey(structure: string): string {
  return structure.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function consolidateTargets(targets: MechTreatmentTarget[]): MechTreatmentTarget[] {
  const groups = new Map<string, MechTreatmentTarget[]>();
  for (const t of targets) {
    const key = normalizeStructureKey(t.structure);
    const existing = groups.get(key);
    if (existing) {
      existing.push(t);
    } else {
      groups.set(key, [t]);
    }
  }

  const consolidated: MechTreatmentTarget[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      group[0].roles = [group[0].category];
      consolidated.push(group[0]);
      continue;
    }
    group.sort((a, b) => b.priority - a.priority);
    const best = { ...group[0] };
    const allRoles = new Set<MechTargetCategory>();
    for (const t of group) {
      allRoles.add(t.category);
    }
    best.roles = Array.from(allRoles);
    const seenTechniques = new Set(best.techniques.map(t => t.name));
    for (let i = 1; i < group.length; i++) {
      for (const tech of group[i].techniques) {
        if (!seenTechniques.has(tech.name) && best.techniques.length < 5) {
          best.techniques.push(tech);
          seenTechniques.add(tech.name);
        }
      }
      if (group[i].finding && !best.finding.includes(group[i].finding)) {
        best.finding = `${best.finding}; ${group[i].finding}`;
      }
    }
    consolidated.push(best);
  }

  consolidated.sort((a, b) => b.priority - a.priority);
  return consolidated;
}

function resolveRegion(structure: string): string | null {
  const lower = structure.toLowerCase();
  if (lower.includes('lumbar') || lower.includes('lower back') || lower.includes('erector') || lower.includes('multifidus')) return 'lumbar';
  if (lower.includes('cervical') || lower.includes('neck') || lower.includes('sternocleidomastoid')) return 'cervical';
  if (lower.includes('thoracic') || lower.includes('mid back') || lower.includes('rhomboid')) return 'thoracic';
  if (lower.includes('hip') || lower.includes('glute') || lower.includes('gluteus') || lower.includes('piriformis')) return 'hip';
  if (lower.includes('knee') || lower.includes('quad') || lower.includes('patell') || lower.includes('hamstring')) return 'knee';
  if (lower.includes('ankle') || lower.includes('calf') || lower.includes('gastrocnemius') || lower.includes('soleus') || lower.includes('tibial')) return 'ankle';
  if (lower.includes('shoulder') || lower.includes('deltoid') || lower.includes('rotator') || lower.includes('scapula') || lower.includes('supraspinatus')) return 'shoulder';
  if (lower.includes('pelvis') || lower.includes('sacrum') || lower.includes('sacroiliac') || lower.includes('core')) return 'pelvis';
  return null;
}

function getTreatmentsForStep(step: CausalChainStep): { action: string; techniques: MechTreatmentTechnique[] } {
  const status = inferClinicalStatus(step);
  const action = getActionLabel(status);
  const baseTechniques = pickTechniquesForStatus(status, 3);
  const structureName = step.structure;
  const antagonist = resolveAntagonist(structureName);

  const techniques: MechTreatmentTechnique[] = baseTechniques.map(t => {
    const isReciprocal = t.name.toLowerCase().includes('reciprocal inhibition');
    if (isReciprocal && antagonist) {
      return {
        ...t,
        name: `${t.name} — activate ${antagonist} to inhibit ${structureName}`,
        rationale: `${action} ${structureName}: activate ${antagonist} via reciprocal inhibition to reflexively inhibit overactive ${structureName}`,
      };
    }
    const actionVerb = status === 'overactive' || status === 'shortened' || status === 'spasm' ? 'release' : status === 'inhibited' || status === 'weak' ? 'activate' : 'treat';
    return {
      ...t,
      name: `${t.name} — ${actionVerb} ${structureName}`,
      rationale: `${action} ${structureName}: ${t.rationale}`,
    };
  });

  const region = resolveRegion(step.structure);
  if (region && REGION_AUGMENTATION[region]) {
    const existing = new Set(techniques.map(t => t.name));
    for (const aug of REGION_AUGMENTATION[region]) {
      if (!existing.has(aug.name) && techniques.length < 4) {
        techniques.push(aug);
      }
    }
  }

  return { action, techniques };
}

function categoryTier(cat: string): number {
  if (cat === 'root_cause') return 6;
  if (cat === 'compensation') return 5;
  if (cat === 'overload') return 4;
  if (cat === 'intermediate') return 3;
  if (cat === 'chain') return 2;
  return 1;
}

function severityScore(sev: string): number {
  if (sev === 'severe') return 3;
  if (sev === 'moderate') return 2;
  return 1;
}

function computePriority(cat: string, sev: string): number {
  return categoryTier(cat) * 1000 + severityScore(sev);
}

function resolveChainType(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes('posterior')) return 'posterior';
  if (lower.includes('anterior')) return 'anterior';
  if (lower.includes('lateral')) return 'lateral';
  return 'posterior';
}

function buildCompensationTechniques(card: CompensationCard): MechTreatmentTechnique[] {
  const releaseTechniques = pickTechniquesForStatus('overactive', 2);
  const strengthenTechniques = pickTechniquesForStatus('inhibited', 2);

  const specificCompensators = card.compensatingStructures.length > 0
    ? card.compensatingStructures.slice(0, 4)
    : [card.title || 'compensating muscles'];
  const compensatorLabel = specificCompensators.join(', ');

  const weakMuscles = extractWeakMusclesFromPattern(card);
  const activateLabel = weakMuscles.length > 0
    ? weakMuscles.slice(0, 3).join(', ')
    : card.primaryDysfunction || 'primary movers';

  const tagged: MechTreatmentTechnique[] = [
    ...releaseTechniques.map(t => {
      const isReciprocal = t.name.toLowerCase().includes('reciprocal inhibition');
      if (isReciprocal) {
        const firstComp = specificCompensators[0];
        const antagonist = resolveAntagonist(firstComp);
        if (antagonist) {
          return {
            ...t,
            name: `${t.name} — activate ${antagonist} to inhibit ${compensatorLabel}`,
            rationale: `Inhibit overactive ${compensatorLabel}: activate ${antagonist} via reciprocal inhibition to reflexively reduce tone in ${compensatorLabel}`,
          };
        }
      }
      return {
        ...t,
        name: `${t.name} — release ${compensatorLabel}`,
        rationale: `Release/inhibit compensatory overactivity in ${compensatorLabel}: ${t.rationale}`,
      };
    }),
    ...strengthenTechniques.map(t => ({
      ...t,
      name: `${t.name} — activate ${activateLabel}`,
      rationale: `Strengthen/activate inhibited ${activateLabel}: ${t.rationale}`,
    })),
    {
      name: `Movement pattern retraining — ${compensatorLabel} → ${activateLabel}`,
      type: 'exercise',
      dosage: '10-15 reps with external cueing and mirror feedback',
      rationale: `Retrain motor control: reduce reliance on ${compensatorLabel} and restore activation of ${activateLabel}`,
      evidenceGrade: 'B',
    },
  ];

  return tagged;
}

const JOINT_MOBILIZATION_BY_REGION: Record<string, MechTreatmentTechnique> = {
  lumbar: {
    name: 'Lumbar segmental mobilization (PA)',
    type: 'manual',
    dosage: '3-5 × 30s grade III-IV oscillations per level',
    rationale: 'Restore segmental mobility and reduce protective muscle guarding',
    evidenceGrade: 'A',
  },
  cervical: {
    name: 'Upper cervical SNAG/NAGS (Mulligan)',
    type: 'manual',
    dosage: '3-6 reps with overpressure at symptomatic level',
    rationale: 'Restore cervical mobility with pain-free joint glide',
    evidenceGrade: 'B',
  },
  thoracic: {
    name: 'Thoracic manipulation (supine or seated)',
    type: 'manual',
    dosage: '1-3 HVLA thrusts at hypomobile segments',
    rationale: 'Rapid restoration of segmental mobility with immediate neurophysiological pain reduction',
    evidenceGrade: 'A',
  },
  hip: {
    name: 'Hip joint mobilization (long-axis distraction / AP glide)',
    type: 'manual',
    dosage: '3-5 × 30s grade III-IV mobilizations',
    rationale: 'Restore capsular mobility and reduce intra-articular compression',
    evidenceGrade: 'A',
  },
  knee: {
    name: 'Patellar and tibiofemoral mobilization',
    type: 'manual',
    dosage: '2-3 min multidirectional glides, grade III-IV',
    rationale: 'Restore patellar tracking and tibiofemoral joint play',
    evidenceGrade: 'B',
  },
  ankle: {
    name: 'Ankle dorsiflexion mobilization with movement (MWM)',
    type: 'manual',
    dosage: '3 × 10 reps with belt/manual AP talar glide',
    rationale: 'Restore talocrural dorsiflexion — prerequisite for squat/gait mechanics',
    evidenceGrade: 'A',
  },
  shoulder: {
    name: 'Glenohumeral mobilization (inferior/posterior glide)',
    type: 'manual',
    dosage: '3-5 × 30s oscillations in restricted direction',
    rationale: 'Restore capsular mobility for pain-free overhead function',
    evidenceGrade: 'A',
  },
  pelvis: {
    name: 'SIJ mobilization / muscle energy technique',
    type: 'manual',
    dosage: '3-5 reps: 5s isometric → reposition',
    rationale: 'Correct pelvic asymmetry and restore SIJ arthrokinematics',
    evidenceGrade: 'B',
  },
};

const DEFAULT_JOINT_MOBILIZATION: MechTreatmentTechnique = {
  name: 'Graded joint mobilization (Maitland Gr III-IV)',
  type: 'manual',
  dosage: '3-5 × 30s oscillations at restricted segment',
  rationale: 'Restore joint play, reduce mechanoreceptor sensitization, and improve arthrokinematics',
  evidenceGrade: 'A',
};

function buildOverloadTechniques(joint: LoadRedistribution): MechTreatmentTechnique[] {
  const spasmRelief = pickTechniquesForStatus('spasm', 1);
  const strengthening = pickTechniquesForStatus('weak', 1);
  const jointName = joint.joint;

  const region = resolveRegion(jointName);
  const mobilization = (region && JOINT_MOBILIZATION_BY_REGION[region])
    ? JOINT_MOBILIZATION_BY_REGION[region]
    : DEFAULT_JOINT_MOBILIZATION;

  return [
    {
      ...mobilization,
      name: `${mobilization.name} — ${jointName}`,
      rationale: `Mobilize overloaded ${jointName}: ${mobilization.rationale}`,
    },
    ...spasmRelief.map(t => ({
      ...t,
      name: `${t.name} — ${jointName} periarticular muscles`,
      rationale: `Reduce protective guarding around overloaded ${jointName}: ${t.rationale}`,
    })),
    ...strengthening.map(t => ({
      ...t,
      name: `${t.name} — ${jointName} stabilizers`,
      rationale: `Build load tolerance at ${jointName}: ${t.rationale}`,
    })),
    {
      name: `Load management — ${jointName}`,
      type: 'exercise' as const,
      dosage: 'Reduce aggravating loads by 30-50% for 2-4 weeks',
      rationale: `Allow tissue recovery at ${jointName} by reducing demand below injury threshold`,
      evidenceGrade: 'A' as EvidenceGrade,
    },
  ];
}

export function generateMechanismTreatments(analysis: InjuryMechanismResult): MechTreatmentResult {
  const targets: MechTreatmentTarget[] = [];
  const seen = new Set<string>();
  let idCounter = 0;

  for (const chain of analysis.causalChains) {
    for (const step of chain) {
      const key = `${step.structure}_${step.category}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const treatment = getTreatmentsForStep(step);
      targets.push({
        id: `mech_${++idCounter}`,
        structure: step.structure,
        source: 'causal_chain',
        category: step.category,
        severity: step.severity,
        priority: computePriority(step.category, step.severity),
        finding: step.finding,
        mechanism: step.mechanism,
        action: treatment.action,
        techniques: treatment.techniques,
        roles: [step.category],
      });
    }
  }

  for (const card of analysis.compensationCards) {
    const key = `comp_${card.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const techniques = buildCompensationTechniques(card);

    targets.push({
      id: `mech_${++idCounter}`,
      structure: card.title,
      source: 'compensation',
      category: 'compensation',
      severity: card.severity,
      priority: computePriority('compensation', card.severity),
      finding: card.primaryDysfunction,
      mechanism: card.clinicalSignificance,
      action: `${STATUS_TO_ACTION['overactive'].label} compensators → ${STATUS_TO_ACTION['inhibited'].label} primaries`,
      techniques,
      roles: ['compensation'],
    });
  }

  for (const joint of analysis.loadRedistribution) {
    if (joint.status !== 'overloaded') continue;
    const key = `overload_${joint.joint}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const techniques = buildOverloadTechniques(joint);

    targets.push({
      id: `mech_${++idCounter}`,
      structure: joint.joint,
      source: 'overloaded_joint',
      category: 'overload',
      severity: joint.changePct > 80 ? 'severe' : 'moderate',
      priority: computePriority('overload', joint.changePct > 80 ? 'severe' : 'moderate'),
      finding: `Joint loading +${joint.changePct}% above baseline (${joint.currentForce}N vs ${joint.baselineForce}N)`,
      mechanism: 'Excessive compressive/shear forces due to postural compensation or muscle imbalance',
      action: 'Offload & Decompress',
      techniques,
      roles: ['overload'],
    });
  }

  for (const kcd of analysis.kineticChainDysfunctions) {
    if (!kcd.detected) continue;
    const key = `chain_${kcd.chainLabel}_${kcd.dysfunction}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const chainType = resolveChainType(kcd.chainLabel);
    const baseChainTx = CHAIN_TREATMENTS[chainType] || CHAIN_TREATMENTS.posterior;
    const chainTx = baseChainTx.map(t => ({
      ...t,
      name: `${t.name} — ${kcd.chainLabel} chain`,
      rationale: `${kcd.chainLabel} chain dysfunction (${kcd.dysfunction}): ${t.rationale}`,
    }));

    targets.push({
      id: `mech_${++idCounter}`,
      structure: `${kcd.chainLabel} Chain`,
      source: 'kinetic_chain',
      category: 'chain',
      severity: 'moderate',
      priority: computePriority('chain', 'moderate'),
      finding: kcd.dysfunction,
      mechanism: kcd.relevance,
      action: 'Chain Integration & Corrective Training',
      techniques: chainTx,
      roles: ['chain'],
    });
  }

  targets.sort((a, b) => b.priority - a.priority);

  const merged = consolidateTargets(targets);

  const rootCauses = merged.filter(t => (t.roles ?? [t.category]).includes('root_cause')).length;
  const compensations = merged.filter(t => (t.roles ?? [t.category]).includes('compensation')).length;
  const overloadedJoints = merged.filter(t => (t.roles ?? [t.category]).includes('overload')).length;
  const chainDysfunctions = merged.filter(t => (t.roles ?? [t.category]).includes('chain')).length;

  const sequence: string[] = [];
  if (rootCauses > 0) sequence.push('Address root causes first');
  if (compensations > 0) sequence.push('Release compensatory patterns');
  if (overloadedJoints > 0) sequence.push('Offload overloaded joints');
  if (chainDysfunctions > 0) sequence.push('Integrate kinetic chain corrections');
  sequence.push('Progress to functional retraining');

  const fullCount = targets.length;
  const capped = merged.slice(0, 8);

  let overallPlan = 'No significant findings requiring treatment.';
  if (capped.length > 0) {
    const topStructures = capped.slice(0, 3).map(t => t.structure);
    overallPlan = `${capped.length} priority target${capped.length > 1 ? 's' : ''}${fullCount > 8 ? ` (consolidated from ${fullCount})` : ''} identified. Priority: ${topStructures.join(', ')}. ${
      rootCauses > 0 ? `${rootCauses} root cause${rootCauses > 1 ? 's' : ''} to address first. ` : ''
    }${compensations > 0 ? `${compensations} compensation pattern${compensations > 1 ? 's' : ''} to resolve. ` : ''}`.trim();
  }

  return {
    targets: capped,
    fullTargetCount: fullCount,
    summary: {
      totalTargets: targets.length,
      rootCauses,
      compensations,
      overloadedJoints,
      chainDysfunctions,
      approachSequence: sequence,
      overallPlan,
    },
  };
}
