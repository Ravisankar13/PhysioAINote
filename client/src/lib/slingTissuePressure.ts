import type { SlingAnalysisResult, SlingResult, SlingId, WeakLink, ForceReroute, SlingCompensation } from './slingEngine';
import type { CompromisedTissue } from '@/components/skeleton/ClinicalTextInput';

export interface SlingTissueRisk extends CompromisedTissue {
  slingSource: SlingId;
  slingLabel: string;
  riskPercent: number;
  mechanism: 'weak_link' | 'force_reroute' | 'cross_compensation' | 'reduced_transfer';
}

interface MuscleTissueMapping {
  tendons: string[];
  joints: string[];
  nerves: string[];
  fascia: string[];
}

const MUSCLE_TISSUE_MAP: Record<string, MuscleTissueMapping> = {
  latissimus_dorsi: {
    tendons: ['biceps_long_head_l', 'biceps_long_head_r'],
    joints: ['glenohumeral_l', 'glenohumeral_r'],
    nerves: [],
    fascia: ['superficial_back_line', 'back_functional_line'],
  },
  thoracolumbar_fascia: {
    tendons: [],
    joints: ['facet_lumbar', 'si_l', 'si_r'],
    nerves: [],
    fascia: ['superficial_back_line', 'deep_front_line'],
  },
  gluteus_maximus: {
    tendons: ['gluteus_medius_l', 'gluteus_medius_r'],
    joints: ['hip_l', 'hip_r', 'si_l', 'si_r'],
    nerves: ['sciatic_l', 'sciatic_r'],
    fascia: ['superficial_back_line', 'back_functional_line'],
  },
  contralateral_gluteus_maximus: {
    tendons: ['gluteus_medius_r', 'gluteus_medius_l'],
    joints: ['hip_r', 'hip_l', 'si_r', 'si_l'],
    nerves: ['sciatic_r', 'sciatic_l'],
    fascia: ['superficial_back_line'],
  },
  external_oblique: {
    tendons: [],
    joints: ['facet_lumbar'],
    nerves: [],
    fascia: ['lateral_line', 'spiral_line'],
  },
  anterior_abdominal_fascia: {
    tendons: [],
    joints: ['facet_lumbar'],
    nerves: ['femoral_l', 'femoral_r'],
    fascia: ['superficial_front_line', 'deep_front_line'],
  },
  internal_oblique: {
    tendons: [],
    joints: ['facet_lumbar', 'si_l', 'si_r'],
    nerves: [],
    fascia: ['lateral_line'],
  },
  adductors: {
    tendons: ['gluteus_medius_l', 'gluteus_medius_r'],
    joints: ['hip_l', 'hip_r'],
    nerves: ['femoral_l', 'femoral_r'],
    fascia: ['deep_front_line'],
  },
  gluteus_medius: {
    tendons: ['gluteus_medius_l', 'gluteus_medius_r'],
    joints: ['hip_l', 'hip_r', 'tibiofemoral_l', 'tibiofemoral_r'],
    nerves: [],
    fascia: ['lateral_line'],
  },
  gluteus_minimus: {
    tendons: ['gluteus_medius_l', 'gluteus_medius_r'],
    joints: ['hip_l', 'hip_r'],
    nerves: [],
    fascia: ['lateral_line'],
  },
  tensor_fasciae_latae: {
    tendons: ['patellar_l', 'patellar_r'],
    joints: ['hip_l', 'hip_r', 'tibiofemoral_l', 'tibiofemoral_r'],
    nerves: [],
    fascia: ['lateral_line'],
  },
  quadratus_lumborum: {
    tendons: [],
    joints: ['facet_lumbar', 'si_l', 'si_r'],
    nerves: [],
    fascia: ['lateral_line', 'deep_front_line'],
  },
  peroneus_longus: {
    tendons: ['achilles_l', 'achilles_r', 'plantar_fascia_l', 'plantar_fascia_r'],
    joints: ['talocrural_l', 'talocrural_r'],
    nerves: ['peroneal_l', 'peroneal_r'],
    fascia: ['lateral_line'],
  },
  biceps_femoris: {
    tendons: ['patellar_l', 'patellar_r'],
    joints: ['tibiofemoral_l', 'tibiofemoral_r', 'hip_l', 'hip_r'],
    nerves: ['sciatic_l', 'sciatic_r'],
    fascia: ['superficial_back_line'],
  },
  sacrotuberous_ligament: {
    tendons: [],
    joints: ['si_l', 'si_r'],
    nerves: ['sciatic_l', 'sciatic_r'],
    fascia: ['superficial_back_line', 'deep_front_line'],
  },
  erector_spinae: {
    tendons: [],
    joints: ['facet_lumbar', 'facet_cervical'],
    nerves: [],
    fascia: ['superficial_back_line'],
  },
  serratus_anterior: {
    tendons: ['supraspinatus_l', 'supraspinatus_r'],
    joints: ['glenohumeral_l', 'glenohumeral_r'],
    nerves: [],
    fascia: ['arm_lines'],
  },
  lower_trapezius: {
    tendons: ['supraspinatus_l', 'supraspinatus_r'],
    joints: ['glenohumeral_l', 'glenohumeral_r'],
    nerves: [],
    fascia: ['superficial_back_line', 'back_functional_line'],
  },
  rhomboids: {
    tendons: [],
    joints: ['glenohumeral_l', 'glenohumeral_r'],
    nerves: [],
    fascia: ['superficial_back_line'],
  },
  rotator_cuff: {
    tendons: ['supraspinatus_l', 'supraspinatus_r', 'biceps_long_head_l', 'biceps_long_head_r'],
    joints: ['glenohumeral_l', 'glenohumeral_r'],
    nerves: [],
    fascia: ['arm_lines'],
  },
};

const TISSUE_TYPE_MAP: Record<string, CompromisedTissue['tissue_type']> = {};
function initTissueTypeMap() {
  if (Object.keys(TISSUE_TYPE_MAP).length > 0) return;
  for (const mapping of Object.values(MUSCLE_TISSUE_MAP)) {
    for (const id of mapping.tendons) TISSUE_TYPE_MAP[id] = 'tendon';
    for (const id of mapping.joints) TISSUE_TYPE_MAP[id] = 'joint';
    for (const id of mapping.nerves) TISSUE_TYPE_MAP[id] = 'nerve';
    for (const id of mapping.fascia) TISSUE_TYPE_MAP[id] = 'fascia';
  }
}

function getTissuesForMuscle(muscle: string): Array<{ tissueId: string; tissueType: CompromisedTissue['tissue_type'] }> {
  const mapping = MUSCLE_TISSUE_MAP[muscle];
  if (!mapping) return [];
  const results: Array<{ tissueId: string; tissueType: CompromisedTissue['tissue_type'] }> = [];
  for (const id of mapping.tendons) results.push({ tissueId: id, tissueType: 'tendon' });
  for (const id of mapping.joints) results.push({ tissueId: id, tissueType: 'joint' });
  for (const id of mapping.nerves) results.push({ tissueId: id, tissueType: 'nerve' });
  for (const id of mapping.fascia) results.push({ tissueId: id, tissueType: 'fascia' });
  return results;
}

function computeWeakLinkRisks(sling: SlingResult): SlingTissueRisk[] {
  const risks: SlingTissueRisk[] = [];
  for (const wl of sling.weakLinks) {
    const tissues = getTissuesForMuscle(wl.muscle);
    const deficit = Math.max(0, 50 - wl.activationPct);
    const riskPercent = Math.min(95, Math.round(deficit * 1.5));
    if (riskPercent < 10) continue;
    const severity = riskPercent / 100;
    for (const t of tissues) {
      risks.push({
        tissue_type: t.tissueType,
        tissue_id: t.tissueId,
        severity,
        rationale: `Increased pressure due to ${wl.muscle.replace(/_/g, ' ')} weakness (${wl.activationPct}% activation) in ${sling.label} — ${wl.impactOnSling}`,
        confidence: 'predicted',
        slingSource: sling.slingId,
        slingLabel: sling.label,
        riskPercent,
        mechanism: 'weak_link',
      });
    }
  }
  return risks;
}

function computeForceRerouteRisks(sling: SlingResult): SlingTissueRisk[] {
  const risks: SlingTissueRisk[] = [];
  for (const reroute of sling.forceReroutes) {
    const tissues = getTissuesForMuscle(reroute.toMuscle);
    const riskPercent = Math.min(90, Math.round(reroute.reroutePct * 1.2));
    if (riskPercent < 10) continue;
    const severity = riskPercent / 100;
    for (const t of tissues) {
      risks.push({
        tissue_type: t.tissueType,
        tissue_id: t.tissueId,
        severity,
        rationale: `${reroute.toMuscle.replace(/_/g, ' ')} absorbing +${reroute.reroutePct}% rerouted force from ${reroute.fromMuscle.replace(/_/g, ' ')} — tissues at ${t.tissueId.replace(/_/g, ' ')} under increased mechanical load`,
        confidence: 'predicted',
        slingSource: sling.slingId,
        slingLabel: sling.label,
        riskPercent,
        mechanism: 'force_reroute',
      });
    }
  }
  return risks;
}

function computeReducedTransferRisks(sling: SlingResult): SlingTissueRisk[] {
  if (sling.forceTransferQuality === 'good') return [];
  const risks: SlingTissueRisk[] = [];
  const qualityDeficit = sling.forceTransferQuality === 'poor' ? 40 : 20;
  const activationDeficit = Math.max(0, 60 - sling.activationScore);
  const baseRisk = Math.round((qualityDeficit + activationDeficit) * 0.5);
  if (baseRisk < 15) return risks;

  const allTissueIds = new Set<string>();
  for (const muscle of getMusclesForSling(sling.slingId)) {
    const tissues = getTissuesForMuscle(muscle);
    for (const t of tissues) {
      const key = `${t.tissueType}:${t.tissueId}`;
      if (allTissueIds.has(key)) continue;
      allTissueIds.add(key);
      const riskPercent = Math.min(85, baseRisk);
      risks.push({
        tissue_type: t.tissueType,
        tissue_id: t.tissueId,
        severity: riskPercent / 100,
        rationale: `${sling.label} has ${sling.forceTransferQuality} force transfer (activation ${sling.activationScore}%) — downstream tissues bear redistributed mechanical load`,
        confidence: 'predicted',
        slingSource: sling.slingId,
        slingLabel: sling.label,
        riskPercent,
        mechanism: 'reduced_transfer',
      });
    }
  }
  return risks;
}

function computeCrossCompensationRisks(compensations: SlingCompensation[], slings: SlingResult[]): SlingTissueRisk[] {
  const risks: SlingTissueRisk[] = [];
  for (const comp of compensations) {
    const compensatingSling = slings.find(s => s.slingId === comp.compensatingSling);
    if (!compensatingSling) continue;

    const muscles = getMusclesForSling(comp.compensatingSling);
    const riskPercent = Math.min(90, Math.round(comp.additionalLoadPct * 1.3));
    if (riskPercent < 10) continue;
    const severity = riskPercent / 100;

    const allTissueIds = new Set<string>();
    for (const muscle of muscles) {
      const tissues = getTissuesForMuscle(muscle);
      for (const t of tissues) {
        const key = `${t.tissueType}:${t.tissueId}`;
        if (allTissueIds.has(key)) continue;
        allTissueIds.add(key);
        risks.push({
          tissue_type: t.tissueType,
          tissue_id: t.tissueId,
          severity,
          rationale: `${comp.compensatingSlingLabel} compensating for ${comp.compensatedSlingLabel} dysfunction — +${comp.additionalLoadPct}% additional load increases tissue injury risk`,
          confidence: 'predicted',
          slingSource: comp.compensatingSling,
          slingLabel: comp.compensatingSlingLabel,
          riskPercent,
          mechanism: 'cross_compensation',
        });
      }
    }
  }
  return risks;
}

const SLING_MUSCLES: Record<SlingId, string[]> = {
  posterior_oblique: ['latissimus_dorsi', 'thoracolumbar_fascia', 'gluteus_maximus', 'contralateral_gluteus_maximus'],
  anterior_oblique: ['external_oblique', 'anterior_abdominal_fascia', 'internal_oblique', 'adductors'],
  lateral: ['gluteus_medius', 'gluteus_minimus', 'tensor_fasciae_latae', 'adductors', 'quadratus_lumborum'],
  deep_longitudinal: ['peroneus_longus', 'biceps_femoris', 'sacrotuberous_ligament', 'erector_spinae', 'thoracolumbar_fascia'],
  scapular_shoulder: ['serratus_anterior', 'lower_trapezius', 'rhomboids', 'rotator_cuff'],
};

function getMusclesForSling(slingId: SlingId): string[] {
  return SLING_MUSCLES[slingId] ?? [];
}

export function computeSlingTissueRisks(analysis: SlingAnalysisResult | null): SlingTissueRisk[] {
  if (!analysis) return [];
  initTissueTypeMap();

  const allRisks: SlingTissueRisk[] = [];

  for (const sling of analysis.slings) {
    if (sling.status === 'normal' && sling.forceTransferQuality === 'good') continue;
    allRisks.push(...computeWeakLinkRisks(sling));
    allRisks.push(...computeForceRerouteRisks(sling));
    allRisks.push(...computeReducedTransferRisks(sling));
  }

  allRisks.push(...computeCrossCompensationRisks(analysis.crossSlingCompensations, analysis.slings));

  const merged = new Map<string, SlingTissueRisk>();
  for (const risk of allRisks) {
    const key = `${risk.tissue_type}:${risk.tissue_id}`;
    const existing = merged.get(key);
    if (!existing || risk.severity > existing.severity) {
      merged.set(key, risk);
    }
  }

  const result = Array.from(merged.values());
  result.sort((a, b) => b.severity - a.severity);
  return result;
}

export function getSlingRisksForTissue(
  tissueId: string,
  allRisks: SlingTissueRisk[]
): SlingTissueRisk[] {
  return allRisks.filter(r => r.tissue_id === tissueId);
}
