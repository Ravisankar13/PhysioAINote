import crypto from 'crypto';
import type {
  LoadingFactorContribution,
  LoadingPatientFactors,
  LoadingPlanDiff,
  LoadingPlanDiffEntry,
  LoadingProgressionRule,
  LoadingTempo,
  OptimalLoadPrescription,
  TendinopathyLoadingPlan,
  TendinopathyLoadingRequest,
  TendinopathyLoadingResponse,
  TendinopathySite,
  TendinopathySwapRequest,
} from '@shared/schema';

// ----------------------------------------------------------------------------
// Site detection
// ----------------------------------------------------------------------------

const SITE_KEYWORDS: Array<{ site: TendinopathySite; label: string; keywords: RegExp[] }> = [
  { site: 'achilles',           label: 'Achilles tendinopathy',         keywords: [/achill/i] },
  { site: 'patellar',           label: 'Patellar tendinopathy',         keywords: [/patell?ar\s+tend/i, /jumper'?s\s+knee/i] },
  { site: 'gluteal',            label: 'Gluteal tendinopathy / GTPS',   keywords: [/glute?al\s+tend/i, /gtps/i, /greater\s+trochanter/i] },
  { site: 'proximal_hamstring', label: 'Proximal hamstring tendinopathy', keywords: [/prox\w*\s+hamstring/i, /high\s+hamstring/i, /hamstring\s+tend/i] },
  { site: 'rotator_cuff',       label: 'Rotator cuff tendinopathy',     keywords: [/rotator\s+cuff\s+tend/i, /supraspin\w*\s+tend/i, /cuff\s+tendinopath/i] },
  { site: 'lateral_elbow',      label: 'Lateral elbow tendinopathy',    keywords: [/lateral\s+epicond/i, /tennis\s+elbow/i, /lateral\s+elbow\s+tend/i, /common\s+extensor\s+tend/i] },
  { site: 'medial_elbow',       label: 'Medial elbow tendinopathy',     keywords: [/medial\s+epicond/i, /golfer'?s\s+elbow/i, /medial\s+elbow\s+tend/i, /common\s+flexor\s+tend/i] },
];

const NON_TENDINOPATHY_HINTS: Array<{ rx: RegExp; suggestion: string }> = [
  { rx: /(spinal|lumbar|cervical)\s+stenosis/i, suggestion: 'directional preference + walking dosage' },
  { rx: /osteoarthrit|knee\s+oa|hip\s+oa/i, suggestion: 'pain-monitored progressive strengthening + activity pacing' },
  { rx: /frozen\s+shoulder|adhesive\s+capsulit/i, suggestion: 'graded ROM mobilisation by phase' },
  { rx: /acl\s+(recon|reconstruction|repair)/i, suggestion: 'criterion-based post-op loading milestones' },
  { rx: /rotator\s+cuff\s+(repair|tear)/i, suggestion: 'post-op timeline with healing-stage caps' },
  { rx: /disc(ogenic)?|herniation|sciatic/i, suggestion: 'directional preference + neural management' },
  { rx: /bone\s+stress|stress\s+fract/i, suggestion: 'offload + bone consolidation timeline' },
  { rx: /muscle\s+strain|hamstring\s+strain|calf\s+strain/i, suggestion: 'time-gated tissue healing protocol' },
  { rx: /post[-\s]?op|surgical|surgery/i, suggestion: 'surgeon protocol + healing-stage caps' },
];

export function detectTendinopathySite(condition: string | undefined | null): TendinopathySite | null {
  if (!condition) return null;
  for (const entry of SITE_KEYWORDS) {
    if (entry.keywords.some(k => k.test(condition))) return entry.site;
  }
  return null;
}

function siteLabelFor(site: TendinopathySite): string {
  return SITE_KEYWORDS.find(s => s.site === site)?.label ?? site;
}

function suggestPrimaryFocusFor(condition: string): string {
  for (const h of NON_TENDINOPATHY_HINTS) {
    if (h.rx.test(condition)) return h.suggestion;
  }
  return 'condition-specific intervention from the AI Prescription engine';
}

// ----------------------------------------------------------------------------
// Medication / metabolic flagging
// ----------------------------------------------------------------------------

const STATIN_RX = /(statin|atorvastat|simvastat|rosuvastat|pravastat|fluvastat|lovastat|pitavastat)/i;
const FQ_RX = /(fluoroquin|ciprofloxac|levofloxac|moxifloxac|ofloxac|norfloxac)/i;
const STEROID_RX = /(prednis|cortison|dexamethason|methylpred|hydrocortison|triamcinolon|corticosteroid|steroid)/i;
const AROMATASE_RX = /(anastrozol|letrozol|exemestan|aromatase)/i;

function flagMedications(history: TendinopathyLoadingRequest['patientFactors']['history']): {
  statins: boolean; fluoroquinolones: boolean; corticosteroids: boolean; aromataseInhibitors: boolean;
} {
  const explicit = history.medicationFlags ?? {};
  const meds = (history.medications ?? []).join(' ');
  return {
    statins:           explicit.statins           ?? STATIN_RX.test(meds),
    fluoroquinolones:  explicit.fluoroquinolones  ?? FQ_RX.test(meds),
    corticosteroids:   explicit.corticosteroids   ?? STEROID_RX.test(meds),
    aromataseInhibitors: explicit.aromataseInhibitors ?? AROMATASE_RX.test(meds),
  };
}

// ----------------------------------------------------------------------------
// Site × phase base protocol matrix
// ----------------------------------------------------------------------------

type Phase = NonNullable<LoadingPatientFactors['recoveryPhase']>;

interface BaseProtocol {
  intensityValue: number | string;
  intensityUnit: OptimalLoadPrescription['intensity']['unit'];
  intensityLabel: string;
  sets: number;
  reps: string;
  tempo: LoadingTempo;
  daysPerWeek: number;
  frequencyPerDay?: number;
  painCeilingNrs: number;
  category: TendinopathySwapRequest['preferredCategory'];
  bodyParts: string[];
  evidenceTier: OptimalLoadPrescription['evidenceTier'];
  confidence: OptimalLoadPrescription['confidence'];
  rationale: string;
  progression: LoadingProgressionRule;
}

const SITE_BODY_PARTS: Record<TendinopathySite, string[]> = {
  achilles:           ['ankle', 'calf', 'achilles'],
  patellar:           ['knee', 'quadriceps', 'patellar'],
  gluteal:            ['hip', 'gluteal'],
  proximal_hamstring: ['hip', 'hamstring'],
  rotator_cuff:       ['shoulder', 'rotator cuff'],
  lateral_elbow:      ['elbow', 'wrist extensor'],
  medial_elbow:       ['elbow', 'wrist flexor'],
};

function baseProtocol(site: TendinopathySite, phase: Phase): BaseProtocol {
  // Reactive phase — isometric analgesia (Rio 2015, Cook & Purdam 2012)
  if (phase === 'reactive') {
    return {
      intensityValue: 70, intensityUnit: '%MVC', intensityLabel: '70% MVC isometric (or hardest pain-free hold)',
      sets: 5, reps: '45s hold',
      tempo: { eccentricSec: 0, isometricSec: 45, concentricSec: 0 },
      daysPerWeek: 7, frequencyPerDay: 1,
      painCeilingNrs: 3,
      category: 'isometric',
      bodyParts: SITE_BODY_PARTS[site],
      evidenceTier: 'A',
      confidence: 'rct_supported',
      rationale: 'Heavy isometric holds give 45-min analgesia & maintain capacity in reactive tendons (Rio et al. 2015).',
      progression: {
        trigger: 'Pain ≤3/10 during loading and morning stiffness <10 min for 3 consecutive sessions',
        nextStep: 'Progress to slow isotonic/HSR (disrepair phase protocol)',
        reviewAfterSessions: 6,
      },
    };
  }

  // Disrepair — slow isotonic / Heavy Slow Resistance
  if (phase === 'disrepair') {
    return {
      intensityValue: 70, intensityUnit: '%1RM', intensityLabel: '70% 1RM (RPE 7-8)',
      sets: 4, reps: '8-12',
      tempo: { eccentricSec: 3, isometricSec: 1, concentricSec: 3 }, // HSR style
      daysPerWeek: 3,
      painCeilingNrs: 5,
      category: 'isotonic',
      bodyParts: SITE_BODY_PARTS[site],
      evidenceTier: 'A',
      confidence: 'rct_supported',
      rationale: 'Heavy Slow Resistance 3×/wk produces tendon adaptation equal to eccentrics with better adherence (Beyer 2015, Kongsgaard 2009).',
      progression: {
        trigger: '24-h pain returns to baseline + load tolerated for 2 consecutive weeks',
        nextStep: 'Add load (5-10%) or progress reps; once 4×6 @ 85% 1RM tolerated → remodelling',
        reviewAfterSessions: 6,
      },
    };
  }

  // Remodelling — heavy loading + Alfredson eccentrics where indicated
  if (phase === 'remodelling') {
    if (site === 'achilles') {
      return {
        intensityValue: 'Bodyweight ± backpack', intensityUnit: 'bodyweight', intensityLabel: 'Alfredson 3×15 eccentric heel drops (knee straight + bent)',
        sets: 6, reps: '15 (3 straight + 3 bent)',
        tempo: { eccentricSec: 3, isometricSec: 0, concentricSec: 0 },
        daysPerWeek: 7, frequencyPerDay: 2,
        painCeilingNrs: 5,
        category: 'eccentric',
        bodyParts: SITE_BODY_PARTS.achilles,
        evidenceTier: 'A',
        confidence: 'rct_supported',
        rationale: 'Alfredson 3×15 BID eccentric heel drops drives tendon remodelling in mid-portion Achilles tendinopathy (Alfredson 1998).',
        progression: {
          trigger: 'Pain ≤3/10 during full programme + morning stiffness <5 min',
          nextStep: 'Add weight (5 kg increments) or progress to energy-storage / hop protocol',
          reviewAfterSessions: 14,
        },
      };
    }
    return {
      intensityValue: 80, intensityUnit: '%1RM', intensityLabel: '80% 1RM (RPE 8)',
      sets: 4, reps: '6-8',
      tempo: { eccentricSec: 3, isometricSec: 1, concentricSec: 3 },
      daysPerWeek: 3,
      painCeilingNrs: 4,
      category: 'isotonic',
      bodyParts: SITE_BODY_PARTS[site],
      evidenceTier: 'A',
      confidence: 'rct_supported',
      rationale: 'Heavy slow resistance to drive collagen remodelling; pain-monitored within Silbernagel rules.',
      progression: {
        trigger: 'Tolerates 4×6 @ 85% 1RM with 24-h pain returning to baseline',
        nextStep: 'Begin energy-storage / sport drills (return-to-sport phase)',
        reviewAfterSessions: 9,
      },
    };
  }

  // Return to sport — energy storage / plyometrics
  return {
    intensityValue: 'Sub-max plyo', intensityUnit: 'pain_monitored', intensityLabel: 'Energy-storage / plyometric loading (Silbernagel pain-monitored)',
    sets: 4, reps: '6-10 reactive contacts',
    tempo: { eccentricSec: 1, isometricSec: 0, concentricSec: 0 },
    daysPerWeek: 2,
    painCeilingNrs: 5,
    category: 'energy_storage',
    bodyParts: SITE_BODY_PARTS[site],
    evidenceTier: 'B',
    confidence: 'protocol_supported',
    rationale: 'Energy-storage loading restores sport-specific capacity; Silbernagel pain-monitored model permits ≤5/10 if 24-h returns to baseline.',
    progression: {
      trigger: 'Sport-specific drills tolerated at full intensity for 2 consecutive sessions',
      nextStep: 'Graded return to full sport / activity exposure',
      reviewAfterSessions: 6,
    },
  };
}

// ----------------------------------------------------------------------------
// Patient-factor modifiers
// ----------------------------------------------------------------------------

interface Modifiers {
  setsMul: number;
  loadMul: number;          // multiplier on intensity (where numeric)
  freqDelta: number;        // additive change in days/wk
  painCeilingDelta: number; // additive change in pain ceiling
  progressionCapDescription?: string;
  contributions: LoadingFactorContribution[];
  /** Returned plan-level confidence after factors (worst-case). */
  planConfidence?: OptimalLoadPrescription['confidence'];
  /** Triggers a swap if true — exercise cannot be safely dosed. */
  unsafe?: { reason: string };
}

function applyFactors(
  factors: LoadingPatientFactors,
  base: BaseProtocol,
  phase: Phase,
  site: TendinopathySite,
): Modifiers {
  const m: Modifiers = {
    setsMul: 1, loadMul: 1, freqDelta: 0, painCeilingDelta: 0, contributions: [],
  };
  const flags = flagMedications(factors.history);
  const irr = factors.irritability ?? 'moderate';
  const age = factors.age ?? 0;
  const hormonal = factors.history.hormonalStatus ?? {};
  const metab = factors.history.metabolicConditions ?? {};
  const training = factors.history.trainingHistory ?? {};
  const priorSame = !!factors.history.priorInjurySameSite;

  // Irritability
  if (irr === 'high') {
    m.setsMul *= 0.6; m.loadMul *= 0.7; m.painCeilingDelta -= 1; m.freqDelta -= 1;
    m.contributions.push({
      factor: `Irritability: high`,
      effect: 'Reduce volume ~40%, intensity ~30%, lower pain ceiling',
      rationale: 'High irritability indicates a reactive system; under-dosing protects against flare-up.',
    });
    if (phase !== 'reactive') {
      m.contributions.push({
        factor: 'High irritability outside reactive phase',
        effect: 'Recommend stage rollback to isometric loading',
        rationale: 'A high-irritability tendon needs analgesic loading regardless of nominal phase (Cook & Purdam 2012).',
      });
    }
  } else if (irr === 'low') {
    m.setsMul *= 1.1; m.loadMul *= 1.05;
    m.contributions.push({
      factor: 'Irritability: low',
      effect: 'Slight volume bump (10%) — system tolerates progression',
      rationale: 'Low irritability indicates capacity for additional load.',
    });
  }

  // Age
  if (age >= 60) {
    m.loadMul *= 0.9; m.painCeilingDelta -= 0.5;
    m.contributions.push({
      factor: `Age ${age}`,
      effect: 'Lower starting intensity by ~10%, slower progression cap',
      rationale: 'Tendon turnover is slower in older adults; conservative progression reduces re-aggravation risk.',
    });
    m.progressionCapDescription = 'Progression capped at +5% load per fortnight (age >60).';
  } else if (age >= 50) {
    m.loadMul *= 0.95;
    m.contributions.push({ factor: `Age ${age}`, effect: 'Modest 5% intensity reduction', rationale: 'Tendon turnover slows after 50.' });
  }

  // Sex / menopause
  if (hormonal.menopauseStatus === 'postmenopausal' && !hormonal.onHrt) {
    m.setsMul *= 0.85; m.loadMul *= 0.9;
    m.contributions.push({
      factor: 'Post-menopausal (no HRT)',
      effect: 'Start ~15% lower volume, ~10% lower load',
      rationale: 'Oestrogen withdrawal reduces tendon collagen synthesis and increases stiffness — gentler entry indicated (Hansen 2018).',
    });
  } else if (hormonal.menopauseStatus === 'perimenopausal') {
    m.setsMul *= 0.92;
    m.contributions.push({
      factor: 'Perimenopausal',
      effect: 'Start ~8% lower volume; expect more variable response',
      rationale: 'Hormonal flux affects connective-tissue load tolerance week to week.',
    });
  }

  // Medications — fluoroquinolones is a hard contraindication for heavy/eccentric loading
  if (flags.fluoroquinolones) {
    m.loadMul *= 0.5; m.setsMul *= 0.7; m.painCeilingDelta -= 1.5;
    m.contributions.push({
      factor: 'Recent fluoroquinolone exposure',
      effect: 'Cap at low-moderate isometric loading; AVOID heavy eccentric / plyometric loading',
      rationale: 'Fluoroquinolones markedly increase tendon-rupture risk (Khaliq & Zhanel 2003). Heavy/eccentric loading is contraindicated for ≥6 weeks post-exposure.',
    });
    m.planConfidence = 'expert_consensus';
    if (base.category === 'eccentric' || base.category === 'energy_storage') {
      m.unsafe = { reason: 'Fluoroquinolone exposure — heavy eccentric / energy-storage loading contraindicated. Substitute with isometric / low-load isotonic.' };
    }
  }
  if (flags.corticosteroids) {
    m.loadMul *= 0.7; m.setsMul *= 0.8; m.painCeilingDelta -= 1;
    m.contributions.push({
      factor: 'Recent corticosteroid (systemic or local)',
      effect: 'Reduce intensity ~30%, volume ~20%',
      rationale: 'Local steroid weakens tendon collagen for ~6 weeks — lower load until tendon recovers.',
    });
    m.planConfidence = m.planConfidence ?? 'protocol_supported';
    if (base.category === 'eccentric' || base.category === 'energy_storage') {
      m.unsafe = m.unsafe ?? { reason: 'Recent corticosteroid — defer eccentric / energy-storage loading 6 weeks. Substitute with isometric.' };
    }
  }
  if (flags.statins) {
    m.loadMul *= 0.9; m.painCeilingDelta -= 0.5;
    m.contributions.push({
      factor: 'On statins',
      effect: 'Reduce starting intensity ~10%; cap weekly progression at +5%',
      rationale: 'Statin-associated myalgia / tendinopathy reported; conservative progression protects healing.',
    });
    m.progressionCapDescription = (m.progressionCapDescription ?? '') + ' Statin: cap weekly progression at +5%.';
  }
  if (flags.aromataseInhibitors) {
    m.loadMul *= 0.9; m.setsMul *= 0.9;
    m.contributions.push({
      factor: 'On aromatase inhibitor',
      effect: 'Lower starting load and volume by ~10%',
      rationale: 'Aromatase inhibitors increase musculoskeletal pain and tendinopathy risk; gentler dosing improves adherence.',
    });
  }

  // Metabolic
  if (metab.diabetes) {
    m.loadMul *= 0.9; m.setsMul *= 0.9; m.painCeilingDelta -= 0.5;
    m.contributions.push({
      factor: 'Diabetes',
      effect: 'Lower starting dose ~10%, slower progression cap',
      rationale: 'Diabetic tendinopathy heals slower with higher recurrence (Ranger 2016) — conservative dosing.',
    });
    m.planConfidence = m.planConfidence ?? 'protocol_supported';
  }
  if (metab.thyroid) {
    m.loadMul *= 0.95;
    m.contributions.push({
      factor: 'Thyroid disease',
      effect: 'Modest 5% reduction in starting intensity',
      rationale: 'Thyroid dysfunction alters tendon metabolism; expect more variable response.',
    });
  }

  // Prior injury same site
  if (priorSame) {
    m.setsMul *= 0.9; m.loadMul *= 0.9;
    m.contributions.push({
      factor: 'Prior injury at same site',
      effect: 'Reduce starting load ~10%, extra fortnight before each progression bump',
      rationale: 'Recurrent tendinopathy carries elevated re-injury risk; conservative ramp recommended.',
    });
  }

  // Training history
  if (training.deconditioned) {
    m.setsMul *= 0.85; m.loadMul *= 0.85;
    m.contributions.push({
      factor: 'Deconditioned',
      effect: 'Start ~15% lower; build a base before HSR loads',
      rationale: 'Deconditioned tendons need foundational work before they tolerate HSR / eccentrics.',
    });
  }
  if ((training.recentLoadSpikePct ?? 0) >= 30) {
    m.setsMul *= 0.85; m.painCeilingDelta -= 0.5;
    m.contributions.push({
      factor: `Recent load spike +${training.recentLoadSpikePct}%`,
      effect: 'Reduce volume ~15% to flatten the spike',
      rationale: 'Acute:chronic workload ratio >1.3 is a strong reinjury predictor (Gabbett 2016).',
    });
  }

  return m;
}

// ----------------------------------------------------------------------------
// Project a prescription forward over weeks
// ----------------------------------------------------------------------------

function projectWeek(
  base: BaseProtocol,
  m: Modifiers,
  weekIndex: number,
  /** progression cap = max %load increase per week */
  progressionCapPct: number,
): { intensityValue: number | string; intensityLabel: string; sets: number; reps: string; painCeilingNrs: number } {
  const numericLoad = typeof base.intensityValue === 'number';
  const baseLoad = numericLoad ? (base.intensityValue as number) * m.loadMul : null;

  const stepPct = Math.min(progressionCapPct, 5); // gentle default
  const projectedLoad = baseLoad === null ? base.intensityValue : Math.round(baseLoad * (1 + (stepPct / 100) * weekIndex));

  // Cap progression at sensible ceilings per phase
  const cappedLoad = typeof projectedLoad === 'number'
    ? Math.min(projectedLoad, base.intensityUnit === '%1RM' ? 90 : base.intensityUnit === '%MVC' ? 90 : projectedLoad)
    : projectedLoad;

  const intensityLabel = typeof cappedLoad === 'number'
    ? `${cappedLoad}${base.intensityUnit === '%1RM' ? '% 1RM' : base.intensityUnit === '%MVC' ? '% MVC' : ''}`
    : base.intensityLabel;

  const sets = Math.max(2, Math.round(base.sets * m.setsMul + (weekIndex >= 2 ? 1 : 0)));

  // Reps progression: bump lower bound by weekIndex/2 if reps look like "6-8"
  let reps = base.reps;
  const repMatch = base.reps.match(/^(\d+)\s*-\s*(\d+)/);
  if (repMatch && weekIndex > 0) {
    const lo = Math.min(parseInt(repMatch[2], 10), parseInt(repMatch[1], 10) + Math.floor(weekIndex / 2));
    const hi = Math.min(15, parseInt(repMatch[2], 10) + Math.floor(weekIndex / 3));
    reps = `${lo}-${hi}`;
  }

  const painCeilingNrs = Math.max(1, Math.round((base.painCeilingNrs + m.painCeilingDelta) * 10) / 10);
  return { intensityValue: cappedLoad, intensityLabel, sets, reps, painCeilingNrs };
}

// ----------------------------------------------------------------------------
// Hashing & diff
// ----------------------------------------------------------------------------

function hashInputs(req: TendinopathyLoadingRequest): string {
  const minimal = {
    condition: req.conditionName,
    site: req.site,
    f: req.patientFactors,
    ex: req.proposedExercises.map(e => ({ id: e.exerciseId, name: e.exerciseName, cat: e.category })),
    overrides: (req.overrides ?? []).map(o => ({ exId: o.exerciseId, w: o.weekIndex, sets: o.sets, reps: o.reps, intensity: o.intensity?.value })),
  };
  return crypto.createHash('sha1').update(JSON.stringify(minimal)).digest('hex').slice(0, 16);
}

function planLineToString(p: OptimalLoadPrescription, field: LoadingPlanDiffEntry['field']): string {
  switch (field) {
    case 'intensity':     return `${p.intensity.label}`;
    case 'sets':          return String(p.sets);
    case 'reps':          return p.reps;
    case 'tempo':         return `${p.tempo.eccentricSec}/${p.tempo.isometricSec}/${p.tempo.concentricSec}`;
    case 'frequency':     return `${p.daysPerWeek}×/wk${p.frequencyPerDay && p.frequencyPerDay > 1 ? ` × ${p.frequencyPerDay}/day` : ''}`;
    case 'pain_ceiling':  return `${p.painCeilingNrs}/10 NRS`;
    case 'progression':   return p.progression.trigger;
  }
}

export function diffPlans(prev: TendinopathyLoadingPlan | null, next: TendinopathyLoadingPlan, triggerReason: string): LoadingPlanDiff {
  const changes: LoadingPlanDiffEntry[] = [];
  if (!prev || prev.applicability !== 'tendinopathy' || next.applicability !== 'tendinopathy') {
    return { changes, triggerReason, beforeHash: prev?.inputsHash ?? '', afterHash: next.inputsHash, computedAt: new Date().toISOString() };
  }
  const prevByKey = new Map<string, OptimalLoadPrescription>();
  for (const p of [...prev.committed, ...prev.projected]) prevByKey.set(`${p.exerciseId}::w${p.weekIndex}`, p);

  for (const n of [...next.committed, ...next.projected]) {
    const key = `${n.exerciseId}::w${n.weekIndex}`;
    const p = prevByKey.get(key);
    if (!p) continue;
    const fields: LoadingPlanDiffEntry['field'][] = ['intensity', 'sets', 'reps', 'tempo', 'frequency', 'pain_ceiling', 'progression'];
    for (const f of fields) {
      const before = planLineToString(p, f);
      const after = planLineToString(n, f);
      if (before !== after) {
        changes.push({
          exerciseId: n.exerciseId,
          exerciseName: n.exerciseName,
          weekIndex: n.weekIndex,
          field: f,
          before,
          after,
          reason: n.factorContributions[0]?.rationale ?? n.rationale,
        });
      }
    }
  }
  return { changes, triggerReason, beforeHash: prev.inputsHash, afterHash: next.inputsHash, computedAt: new Date().toISOString() };
}

// ----------------------------------------------------------------------------
// Build a single optimal-load prescription for one exercise
// ----------------------------------------------------------------------------

function buildPrescriptionForExercise(args: {
  exerciseId: string; exerciseName: string;
  site: TendinopathySite; phase: Phase;
  factors: LoadingPatientFactors;
  weekIndex: number;
  isCommitted: boolean;
  override?: Partial<OptimalLoadPrescription>;
}): OptimalLoadPrescription | { swap: TendinopathySwapRequest } {
  const base = baseProtocol(args.site, args.phase);
  const mods = applyFactors(args.factors, base, args.phase, args.site);

  if (mods.unsafe && args.weekIndex === 0) {
    return {
      swap: {
        proposedExerciseIndex: -1,
        proposedExerciseId: args.exerciseId,
        proposedExerciseName: args.exerciseName,
        reason: mods.unsafe.reason,
        preferredCategory: 'isometric',
        preferredBodyParts: SITE_BODY_PARTS[args.site],
      },
    };
  }

  const progressionCapPct = mods.progressionCapDescription?.includes('+5%') ? 5 : 7;
  const projected = projectWeek(base, mods, args.weekIndex, progressionCapPct);

  const confidence: OptimalLoadPrescription['confidence'] = mods.planConfidence
    ?? (args.weekIndex <= 1 ? base.confidence : 'protocol_supported');

  const factorContributions: LoadingFactorContribution[] = [
    {
      factor: `Recovery phase: ${args.phase}`,
      effect: `Apply ${base.category} loading template`,
      rationale: base.rationale,
    },
    ...mods.contributions,
  ];

  if (mods.progressionCapDescription) {
    factorContributions.push({
      factor: 'Progression cap',
      effect: mods.progressionCapDescription,
      rationale: 'Caps reduce flare-up risk during ramp-up.',
    });
  }

  const baseId = `load_${args.exerciseId}_w${args.weekIndex}`;
  let prescription: OptimalLoadPrescription = {
    id: baseId,
    exerciseId: args.exerciseId,
    exerciseName: args.exerciseName,
    weekIndex: args.weekIndex,
    daysPerWeek: Math.max(1, Math.min(7, base.daysPerWeek + mods.freqDelta)),
    intensity: {
      value: projected.intensityValue,
      unit: base.intensityUnit,
      label: projected.intensityLabel,
    },
    sets: projected.sets,
    reps: projected.reps,
    tempo: base.tempo,
    frequencyPerDay: base.frequencyPerDay,
    painCeilingNrs: projected.painCeilingNrs,
    progression: base.progression,
    confidence,
    evidenceTier: base.evidenceTier,
    factorContributions,
    rationale: `${siteLabelFor(args.site)} · ${args.phase} phase · week ${args.weekIndex + 1}`,
    isOverride: false,
    isCommitted: args.isCommitted,
  };

  // Apply clinician override (sticks across recomputes)
  if (args.override) {
    prescription = {
      ...prescription,
      sets: args.override.sets ?? prescription.sets,
      reps: args.override.reps ?? prescription.reps,
      intensity: args.override.intensity ?? prescription.intensity,
      tempo: args.override.tempo ?? prescription.tempo,
      daysPerWeek: args.override.daysPerWeek ?? prescription.daysPerWeek,
      frequencyPerDay: args.override.frequencyPerDay ?? prescription.frequencyPerDay,
      painCeilingNrs: args.override.painCeilingNrs ?? prescription.painCeilingNrs,
      progression: args.override.progression ?? prescription.progression,
      isOverride: true,
      overrideAuthorId: args.override.overrideAuthorId,
      overrideAt: args.override.overrideAt ?? new Date().toISOString(),
    };
  }

  return prescription;
}

// ----------------------------------------------------------------------------
// Main entry
// ----------------------------------------------------------------------------

const RECOMPUTE_TRIGGERS = [
  'Irritability shifts a level (low/moderate/high)',
  'Recovery phase progresses (e.g. reactive → disrepair)',
  'Loading-relevant medication added or removed',
  'Biomechanics reassessment saved',
  'Manual "Recalculate now"',
];

export function buildTendinopathyLoadingPlan(req: TendinopathyLoadingRequest): TendinopathyLoadingResponse {
  const generatedAt = new Date().toISOString();
  const inputsHash = hashInputs(req);

  // 1. Applicability
  const site = req.site ?? detectTendinopathySite(req.conditionName);
  if (!site) {
    const plan: TendinopathyLoadingPlan = {
      applicability: 'not_applicable',
      notApplicableMessage: "Load modulation isn't the primary lever for this condition — see the AI Prescription engine for the recommended primary intervention.",
      notApplicableSuggestedFocus: suggestPrimaryFocusFor(req.conditionName),
      committed: [],
      projected: [],
      commitWindowWeeks: req.commitWindowWeeks ?? 1,
      horizonWeeks: req.horizonWeeks ?? 10,
      swapRequests: [],
      planRationale: 'Optimal Loading Engine v1 only doses tendinopathies; for other conditions the prescription engine handles dosing directly.',
      explainabilitySummary: 'Loading engine declined: condition is not in the tendinopathy set.',
      recomputeTriggers: [],
      generatedAt,
      inputsHash,
    };
    return { plan };
  }

  const phase: Phase = req.patientFactors.recoveryPhase ?? inferPhaseFromIrritability(req.patientFactors.irritability);
  const commitWeeks = req.commitWindowWeeks ?? 1;
  const horizon = Math.max(commitWeeks + 1, req.horizonWeeks ?? 10);
  const overrideMap = new Map<string, Partial<OptimalLoadPrescription>>();
  for (const o of req.overrides ?? []) {
    overrideMap.set(`${o.exerciseId}::w${o.weekIndex}`, o);
  }

  const committed: OptimalLoadPrescription[] = [];
  const projected: OptimalLoadPrescription[] = [];
  const swaps: TendinopathySwapRequest[] = [];

  for (let i = 0; i < req.proposedExercises.length; i++) {
    const ex = req.proposedExercises[i];
    for (let week = 0; week < horizon; week++) {
      const isCommitted = week < commitWeeks;
      const override = overrideMap.get(`${ex.exerciseId}::w${week}`);
      const result = buildPrescriptionForExercise({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        site,
        phase,
        factors: req.patientFactors,
        weekIndex: week,
        isCommitted,
        override,
      });
      if ('swap' in result) {
        if (week === 0) {
          swaps.push({ ...result.swap, proposedExerciseIndex: i });
        }
        // do not emit a numeric prescription this week if unsafe
        continue;
      }
      if (isCommitted) committed.push(result);
      else projected.push(result);
    }
  }

  const planRationale = buildPlanRationale(site, phase, req.patientFactors);
  const explainability = buildExplainability(committed, swaps);

  const plan: TendinopathyLoadingPlan = {
    applicability: 'tendinopathy',
    site,
    siteLabel: siteLabelFor(site),
    recoveryPhase: phase,
    recoveryPhaseLabel: phaseLabel(phase),
    irritability: req.patientFactors.irritability,
    committed,
    projected,
    commitWindowWeeks: commitWeeks,
    horizonWeeks: horizon,
    swapRequests: swaps,
    planRationale,
    explainabilitySummary: explainability,
    recomputeTriggers: RECOMPUTE_TRIGGERS,
    generatedAt,
    inputsHash,
  };

  return { plan };
}

function inferPhaseFromIrritability(irr?: 'low' | 'moderate' | 'high'): Phase {
  if (irr === 'high') return 'reactive';
  if (irr === 'moderate') return 'disrepair';
  return 'remodelling';
}

function phaseLabel(p: Phase): string {
  switch (p) {
    case 'reactive':         return 'Reactive (analgesic loading)';
    case 'disrepair':        return 'Disrepair (HSR / slow isotonic)';
    case 'remodelling':      return 'Remodelling (heavy loading / eccentrics)';
    case 'return_to_sport':  return 'Return to sport (energy storage)';
  }
}

function buildPlanRationale(site: TendinopathySite, phase: Phase, f: LoadingPatientFactors): string {
  const flags = flagMedications(f.history);
  const bits: string[] = [];
  bits.push(`${siteLabelFor(site)} in ${phaseLabel(phase)}.`);
  if (f.irritability) bits.push(`Irritability ${f.irritability}.`);
  if (f.age) bits.push(`Age ${f.age}.`);
  if (f.history.hormonalStatus?.menopauseStatus === 'postmenopausal') bits.push('Post-menopausal — gentler entry, slower progression.');
  if (flags.fluoroquinolones) bits.push('Fluoroquinolone exposure — heavy loading deferred.');
  if (flags.corticosteroids) bits.push('Corticosteroid use — eccentric/HSR loading capped.');
  if (flags.statins) bits.push('On statins — progression capped at +5%/wk.');
  if (f.history.metabolicConditions?.diabetes) bits.push('Diabetes — slower healing, conservative dose.');
  if (f.history.priorInjurySameSite) bits.push('Prior injury same site — extra fortnight per progression.');
  return bits.join(' ');
}

function buildExplainability(committed: OptimalLoadPrescription[], swaps: TendinopathySwapRequest[]): string {
  const parts: string[] = [];
  if (committed.length > 0) {
    const c = committed[0];
    parts.push(`${committed.length} exercise${committed.length === 1 ? '' : 's'} dosed; first commit: ${c.exerciseName} at ${c.intensity.label}, ${c.sets}×${c.reps}, ${c.daysPerWeek}×/wk, pain ceiling ${c.painCeilingNrs}/10.`);
  }
  if (swaps.length > 0) {
    parts.push(`${swaps.length} swap request${swaps.length === 1 ? '' : 's'} sent back to prescription engine.`);
  }
  return parts.join(' ');
}

// ----------------------------------------------------------------------------
// Negotiation handshake — used by the AI Prescription pipeline
// ----------------------------------------------------------------------------

/**
 * Two-way handshake. Caller passes a candidate exercise list and an
 * `alternativeFinder` callback that, given a swap request, returns an
 * alternative exercise (or null if none). The handshake re-doses each swap
 * up to `maxRounds` times before giving up.
 */
export async function negotiateLoadingPlan(
  initialReq: TendinopathyLoadingRequest,
  alternativeFinder: (swap: TendinopathySwapRequest) => Promise<{ exerciseId: string; exerciseName: string; category?: string; bodyParts?: string[] } | null>,
  maxRounds = 3,
): Promise<TendinopathyLoadingResponse & {
  /** Final exercise list after all swaps were resolved — same length & order as the original proposed list. */
  finalExercises: TendinopathyLoadingRequest['proposedExercises'];
  /** Per-original-index swap log so callers can surface "X replaced with Y because …". */
  swapLog: Array<{ index: number; from: { exerciseId: string; exerciseName: string }; to: { exerciseId: string; exerciseName: string }; reason: string }>;
}> {
  let req = { ...initialReq };
  let response = buildTendinopathyLoadingPlan(req);
  const swapLog: Array<{ index: number; from: { exerciseId: string; exerciseName: string }; to: { exerciseId: string; exerciseName: string }; reason: string }> = [];
  if (response.plan.applicability !== 'tendinopathy') {
    return { ...response, finalExercises: req.proposedExercises, swapLog };
  }

  for (let round = 0; round < maxRounds; round++) {
    if (response.plan.swapRequests.length === 0) break;

    const newExercises = [...req.proposedExercises];
    let anyChanged = false;

    for (const swap of response.plan.swapRequests) {
      const alt = await alternativeFinder(swap);
      const original = newExercises[swap.proposedExerciseIndex];
      if (alt && original && alt.exerciseId !== original.exerciseId) {
        // Suffix the slot index so two slots that swap to the same canonical
        // fallback (e.g. two patellar lines both → patellar isometric) keep
        // distinct exerciseIds. Downstream Map keys (committed/projected by
        // exerciseId, UI grouping) rely on per-slot uniqueness.
        const uniqueId = `${alt.exerciseId}__slot${swap.proposedExerciseIndex}`;
        newExercises[swap.proposedExerciseIndex] = {
          exerciseId: uniqueId,
          exerciseName: alt.exerciseName,
          category: alt.category,
          bodyParts: alt.bodyParts,
        };
        swapLog.push({
          index: swap.proposedExerciseIndex,
          from: { exerciseId: original.exerciseId, exerciseName: original.exerciseName },
          to: { exerciseId: uniqueId, exerciseName: alt.exerciseName },
          reason: swap.reason,
        });
        anyChanged = true;
      }
    }

    if (!anyChanged) break;
    req = { ...req, proposedExercises: newExercises };
    response = buildTendinopathyLoadingPlan(req);
  }
  return { ...response, finalExercises: req.proposedExercises, swapLog };
}

/** Site- and category-keyed catalogue of protocol-safe fallback exercises (Alfredson, Silbernagel, Beyer HSR, Mellor GLoBE, Coombes, Cook & Purdam). */
const FALLBACK_CATALOGUE: Record<TendinopathySite, Partial<Record<TendinopathySwapRequest['preferredCategory'], { exerciseId: string; exerciseName: string; bodyParts: string[] }>>> = {
  achilles: {
    isometric:       { exerciseId: 'fallback_achilles_iso',  exerciseName: 'Isometric calf hold (mid-range, on flat ground)', bodyParts: ['gastrocnemius', 'soleus'] },
    isotonic:        { exerciseId: 'fallback_achilles_hsr',  exerciseName: 'Heavy slow calf raise (bilateral, 3s up / 3s down)', bodyParts: ['gastrocnemius', 'soleus'] },
    eccentric:       { exerciseId: 'fallback_achilles_ecc',  exerciseName: 'Alfredson eccentric heel drop (off step)', bodyParts: ['gastrocnemius', 'soleus'] },
    energy_storage:  { exerciseId: 'fallback_achilles_es',   exerciseName: 'Bilateral pogo hop (controlled height)', bodyParts: ['gastrocnemius', 'soleus'] },
    mobility:        { exerciseId: 'fallback_achilles_mob',  exerciseName: 'Standing gastroc–soleus stretch (pain-free range)', bodyParts: ['gastrocnemius', 'soleus'] },
  },
  patellar: {
    isometric:       { exerciseId: 'fallback_patellar_iso',  exerciseName: 'Spanish squat isometric hold (60° knee flexion)', bodyParts: ['quadriceps', 'patellar tendon'] },
    isotonic:        { exerciseId: 'fallback_patellar_hsr',  exerciseName: 'Heavy slow leg press (3s up / 3s down)', bodyParts: ['quadriceps'] },
    eccentric:       { exerciseId: 'fallback_patellar_ecc',  exerciseName: 'Decline single-leg squat (eccentric only, 25° board)', bodyParts: ['quadriceps'] },
    energy_storage:  { exerciseId: 'fallback_patellar_es',   exerciseName: 'Tempo countermovement jump (controlled landing)', bodyParts: ['quadriceps'] },
    mobility:        { exerciseId: 'fallback_patellar_mob',  exerciseName: 'Quadriceps mobility (prone heel-to-buttock, pain-free)', bodyParts: ['quadriceps'] },
  },
  gluteal: {
    isometric:       { exerciseId: 'fallback_gluteal_iso',   exerciseName: 'Side-lying isometric hip abduction (neutral, no compression)', bodyParts: ['gluteus medius', 'gluteus minimus'] },
    isotonic:        { exerciseId: 'fallback_gluteal_hsr',   exerciseName: 'Heavy slow standing hip abduction (band/cable, 3s/3s)', bodyParts: ['gluteus medius'] },
    eccentric:       { exerciseId: 'fallback_gluteal_ecc',   exerciseName: 'Eccentric step-down (lateral, controlled)', bodyParts: ['gluteus medius'] },
    energy_storage:  { exerciseId: 'fallback_gluteal_es',    exerciseName: 'Lateral bound (low amplitude, controlled landing)', bodyParts: ['gluteus medius'] },
    mobility:        { exerciseId: 'fallback_gluteal_mob',   exerciseName: 'Hip ER mobility in 90/90 (avoid end-range adduction)', bodyParts: ['hip rotators'] },
  },
  proximal_hamstring: {
    isometric:       { exerciseId: 'fallback_phamstring_iso', exerciseName: 'Long-lever bridge isometric hold (hip extension)', bodyParts: ['hamstrings'] },
    isotonic:        { exerciseId: 'fallback_phamstring_hsr', exerciseName: 'Heavy slow hip extension (cable, 3s/3s)', bodyParts: ['hamstrings'] },
    eccentric:       { exerciseId: 'fallback_phamstring_ecc', exerciseName: 'Single-leg Romanian deadlift (eccentric emphasis)', bodyParts: ['hamstrings'] },
    energy_storage:  { exerciseId: 'fallback_phamstring_es',  exerciseName: 'A-skip drill (low cadence, controlled)', bodyParts: ['hamstrings'] },
    mobility:        { exerciseId: 'fallback_phamstring_mob', exerciseName: 'Sciatic nerve glide (pain-free range)', bodyParts: ['sciatic nerve'] },
  },
  rotator_cuff: {
    isometric:       { exerciseId: 'fallback_cuff_iso',      exerciseName: 'Isometric shoulder ER at neutral (towel push)', bodyParts: ['infraspinatus', 'teres minor'] },
    isotonic:        { exerciseId: 'fallback_cuff_hsr',      exerciseName: 'Heavy slow side-lying ER (3s/3s, neutral arm)', bodyParts: ['infraspinatus'] },
    eccentric:       { exerciseId: 'fallback_cuff_ecc',      exerciseName: 'Eccentric ER lower (band, controlled)', bodyParts: ['infraspinatus'] },
    energy_storage:  { exerciseId: 'fallback_cuff_es',       exerciseName: 'Plyometric ball rebound (chest height, controlled)', bodyParts: ['rotator cuff'] },
    mobility:        { exerciseId: 'fallback_cuff_mob',      exerciseName: 'Sleeper stretch / cross-body (pain-free range)', bodyParts: ['posterior capsule'] },
  },
  lateral_elbow: {
    isometric:       { exerciseId: 'fallback_lat_elbow_iso', exerciseName: 'Wrist extensor isometric grip hold (45s)', bodyParts: ['common extensor tendon'] },
    isotonic:        { exerciseId: 'fallback_lat_elbow_hsr', exerciseName: 'Heavy slow wrist extension (3s up / 3s down)', bodyParts: ['common extensor tendon'] },
    eccentric:       { exerciseId: 'fallback_lat_elbow_ecc', exerciseName: 'Tyler twist eccentric (FlexBar, lateral)', bodyParts: ['common extensor tendon'] },
    energy_storage:  { exerciseId: 'fallback_lat_elbow_es',  exerciseName: 'Light tempo overhead throw (controlled)', bodyParts: ['common extensor tendon'] },
    mobility:        { exerciseId: 'fallback_lat_elbow_mob', exerciseName: 'Radial nerve glide (pain-free)', bodyParts: ['radial nerve'] },
  },
  medial_elbow: {
    isometric:       { exerciseId: 'fallback_med_elbow_iso', exerciseName: 'Wrist flexor isometric hold (45s)', bodyParts: ['common flexor tendon'] },
    isotonic:        { exerciseId: 'fallback_med_elbow_hsr', exerciseName: 'Heavy slow wrist flexion (3s up / 3s down)', bodyParts: ['common flexor tendon'] },
    eccentric:       { exerciseId: 'fallback_med_elbow_ecc', exerciseName: 'Tyler twist eccentric (FlexBar, medial)', bodyParts: ['common flexor tendon'] },
    energy_storage:  { exerciseId: 'fallback_med_elbow_es',  exerciseName: 'Light tempo medicine-ball toss (controlled)', bodyParts: ['common flexor tendon'] },
    mobility:        { exerciseId: 'fallback_med_elbow_mob', exerciseName: 'Median nerve glide (pain-free)', bodyParts: ['median nerve'] },
  },
};

/**
 * Default safe-fallback alternative finder for the negotiation handshake.
 * Returns a protocol-supported exercise from the catalogue keyed by the
 * detected site and the swap's `preferredCategory`. Returns null only if
 * the site has no entry for the requested category (extremely rare —
 * isometric/isotonic/eccentric are populated for every supported site).
 */
export function pickFallbackAlternative(
  site: TendinopathySite,
  swap: TendinopathySwapRequest,
): { exerciseId: string; exerciseName: string; category?: string; bodyParts?: string[] } | null {
  const entry = FALLBACK_CATALOGUE[site]?.[swap.preferredCategory];
  if (!entry) {
    // Last-resort cross-category fallback so the loop converges even for
    // exotic categories: prefer isometric, then isotonic.
    const iso = FALLBACK_CATALOGUE[site]?.isometric ?? FALLBACK_CATALOGUE[site]?.isotonic;
    if (!iso) return null;
    return { exerciseId: iso.exerciseId, exerciseName: iso.exerciseName, category: 'isometric', bodyParts: iso.bodyParts };
  }
  return {
    exerciseId: entry.exerciseId,
    exerciseName: entry.exerciseName,
    category: swap.preferredCategory,
    bodyParts: entry.bodyParts,
  };
}
