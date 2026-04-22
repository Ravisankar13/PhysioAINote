import { useMemo, useState } from 'react';
import {
  Activity,
  Bed,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Construction,
  GraduationCap,
  Lightbulb,
  Pill,
  Shield,
} from 'lucide-react';
import { AddToPlanButton, makeCartId, type PlanCartItem } from '@/lib/planCart';
import type { InjuryMechanismResult } from '@/lib/injuryMechanismEngine';

interface PainMarkerInput {
  label: string;
  severity?: number;
  type?: string;
}

interface LifestyleAdjunctEngineTabProps {
  mechanismAnalysis: InjuryMechanismResult | null;
  painMarkers: PainMarkerInput[];
  diagnosis?: string;
  recoveryPhase?: string;
  irritability?: string;
}

/**
 * Lifestyle & Adjunct Rx items map onto TREATMENT_LIBRARY profiles via a
 * shared `mapsToTreatmentId` field — the Recovery Simulator reads this when
 * dropping a cart item onto the timeline so the curve actually bends.
 */
export interface LifestyleItem {
  id: string;
  name: string;
  description: string;
  dosage: string;
  rationale: string;
  contraindications?: string;
  evidenceGrade?: 'A' | 'B' | 'C';
  mapsToTreatmentId: string;
}

export interface LifestyleSection {
  id: string;
  title: string;
  icon: typeof Activity;
  color: { bg: string; border: string; text: string; chip: string };
  blurb: string;
  items: LifestyleItem[];
}

/** Sub-section catalog. Each item carries the dosage + mapping needed for
 *  both the My Plan cart and the Treatment Timeline conversion. */
export const LIFESTYLE_SECTIONS: LifestyleSection[] = [
  {
    id: 'pacing',
    title: 'Pacing & Activity Modification',
    icon: Activity,
    color: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300', chip: 'bg-amber-500/20 text-amber-200' },
    blurb: 'Match daily load to current capacity to avoid boom-bust cycles and recurrence.',
    items: [
      {
        id: 'pacing_quota',
        name: 'Quota-based pacing',
        description: 'Set a baseline of activity well under flare threshold; increase by 10% per week.',
        dosage: 'Daily · adjust weekly',
        rationale: 'Reduces flare frequency, builds capacity without provoking the tissue.',
        evidenceGrade: 'B',
        mapsToTreatmentId: 'graded_load',
      },
      {
        id: 'activity_substitution',
        name: 'Activity substitution',
        description: 'Swap aggravating tasks (e.g., long sitting, heavy lifting) for tolerated equivalents.',
        dosage: 'Continuous · review at 2 weeks',
        rationale: 'Removes mechanical drivers while protecting overall fitness and adherence.',
        evidenceGrade: 'B',
        mapsToTreatmentId: 'graded_load',
      },
      {
        id: 'micro_breaks',
        name: 'Micro-break schedule',
        description: '2-minute movement break every 30–45 minutes of static load.',
        dosage: 'Throughout work day',
        rationale: 'Reduces sustained loading on sensitised tissue; lowers irritability.',
        evidenceGrade: 'C',
        mapsToTreatmentId: 'rest_offload',
      },
    ],
  },
  {
    id: 'bracing',
    title: 'Bracing, Taping & Off-load Aids',
    icon: Shield,
    color: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-300', chip: 'bg-cyan-500/20 text-cyan-200' },
    blurb: 'Short-term mechanical off-loading to reduce pain and protect healing tissue.',
    items: [
      {
        id: 'brace_supportive',
        name: 'Supportive brace / sleeve',
        description: 'Soft brace or sleeve worn during aggravating activity (e.g., hinge knee, lumbar support).',
        dosage: 'During provocation tasks · wean by week 4',
        rationale: 'Off-loads, improves proprioception and confidence; remove as capacity returns.',
        contraindications: 'Skin breakdown, neurovascular compromise',
        evidenceGrade: 'B',
        mapsToTreatmentId: 'taping_bracing',
      },
      {
        id: 'taping_kt',
        name: 'Therapeutic taping (e.g., KT / rigid)',
        description: 'Applied over symptomatic joint or muscle for proprioceptive cueing and offload.',
        dosage: '2–3 days per application · up to 3 weeks',
        rationale: 'Modest pain relief and movement quality cue; supports active rehab.',
        contraindications: 'Skin allergy / fragile skin',
        evidenceGrade: 'C',
        mapsToTreatmentId: 'taping_bracing',
      },
      {
        id: 'walking_aid',
        name: 'Walking aid / heel lift / orthotic trial',
        description: 'Cane, crutch, heel raise, or off-the-shelf orthotic during acute period.',
        dosage: 'Acute phase · review weekly',
        rationale: 'Reduces ground reaction load, allows early ambulation.',
        evidenceGrade: 'C',
        mapsToTreatmentId: 'taping_bracing',
      },
    ],
  },
  {
    id: 'nsaid',
    title: 'NSAID / Pharmacology Referral',
    icon: Pill,
    color: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-300', chip: 'bg-rose-500/20 text-rose-200' },
    blurb: 'Refer to GP / prescriber when symptom modulation is rate-limiting rehab — not a physiotherapist prescription.',
    items: [
      {
        id: 'nsaid_short_course',
        name: 'Short-course oral NSAID (refer to GP)',
        description: 'Refer for short trial (e.g., ibuprofen / naproxen) to reduce acute inflammation if appropriate.',
        dosage: 'Per prescriber · typically 5–10 days',
        rationale: 'Modulates inflammatory pain to enable active rehab; not for chronic non-inflammatory pain.',
        contraindications: 'GI ulceration, anticoagulation, renal/cardiac disease, pregnancy 3rd trimester',
        evidenceGrade: 'A',
        mapsToTreatmentId: 'rest_offload',
      },
      {
        id: 'topical_nsaid',
        name: 'Topical NSAID referral',
        description: 'Suggest GP review for topical diclofenac for localised joint / soft-tissue pain.',
        dosage: 'Per prescriber · 2–4 weeks',
        rationale: 'Lower systemic exposure than oral; useful in OA and superficial tendinopathy.',
        evidenceGrade: 'A',
        mapsToTreatmentId: 'rest_offload',
      },
      {
        id: 'analgesia_simple',
        name: 'Simple analgesia review',
        description: 'Refer for paracetamol / acetaminophen review where pain blocks engagement with rehab.',
        dosage: 'Per prescriber',
        rationale: 'Supports adherence by reducing pain-driven avoidance; modest effect size alone.',
        evidenceGrade: 'B',
        mapsToTreatmentId: 'rest_offload',
      },
    ],
  },
  {
    id: 'education',
    title: 'Education & Pain Neuroscience',
    icon: GraduationCap,
    color: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-300', chip: 'bg-violet-500/20 text-violet-200' },
    blurb: 'Recalibrate beliefs about pain, healing, and movement — long carryover.',
    items: [
      {
        id: 'pne_session',
        name: 'Pain Neuroscience Education (PNE) session',
        description: 'Explain pain biology, sensitisation, and the difference between hurt and harm.',
        dosage: '30 min · 1–2 sessions',
        rationale: 'Reduces fear-avoidance and chronicity risk; carryover often months.',
        evidenceGrade: 'A',
        mapsToTreatmentId: 'education',
      },
      {
        id: 'condition_explainer',
        name: 'Condition-specific explainer',
        description: 'Plain-language summary of diagnosis, expected course, and active ingredients of treatment.',
        dosage: 'Initial visit · revisit weekly',
        rationale: 'Aligns expectations, improves adherence and self-efficacy.',
        evidenceGrade: 'B',
        mapsToTreatmentId: 'education',
      },
      {
        id: 'flare_plan',
        name: 'Flare-up management plan',
        description: 'Written plan: what to do in next 24–48h if symptoms spike (modify, not stop).',
        dosage: 'One-off · revise as needed',
        rationale: 'Prevents catastrophising and full deconditioning during natural flares.',
        evidenceGrade: 'B',
        mapsToTreatmentId: 'education',
      },
    ],
  },
  {
    id: 'sleep',
    title: 'Sleep Hygiene',
    icon: Bed,
    color: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-300', chip: 'bg-indigo-500/20 text-indigo-200' },
    blurb: 'Sleep is a primary modulator of pain sensitivity and tissue repair.',
    items: [
      {
        id: 'sleep_position',
        name: 'Sleep position coaching',
        description: 'Pillow placement and posture coaching to off-load symptomatic region overnight.',
        dosage: 'Nightly',
        rationale: 'Reduces overnight provocation; improves morning symptoms.',
        evidenceGrade: 'C',
        mapsToTreatmentId: 'education',
      },
      {
        id: 'sleep_routine',
        name: 'Sleep routine hygiene',
        description: 'Consistent bedtime, screen wind-down, caffeine cut-off, dark/cool room.',
        dosage: 'Daily · 4-week trial',
        rationale: 'Improves sleep quality, lowers central sensitisation and pain.',
        evidenceGrade: 'A',
        mapsToTreatmentId: 'education',
      },
      {
        id: 'sleep_referral',
        name: 'Sleep medicine referral if persistent insomnia',
        description: 'Refer for CBT-I or sleep study if insomnia/OSA suspected.',
        dosage: 'One-off referral',
        rationale: 'Persistent sleep deprivation amplifies pain and stalls recovery.',
        evidenceGrade: 'A',
        mapsToTreatmentId: 'education',
      },
    ],
  },
  {
    id: 'ergonomics',
    title: 'Ergonomics',
    icon: Construction,
    color: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', chip: 'bg-emerald-500/20 text-emerald-200' },
    blurb: 'Workstation, lifting and tool-use modifications that reduce daily provocation.',
    items: [
      {
        id: 'workstation_setup',
        name: 'Workstation setup review',
        description: 'Monitor height, chair, keyboard, sit-stand schedule for desk-based patients.',
        dosage: 'One review · re-check at 4 weeks',
        rationale: 'Reduces sustained postural load on neck/lumbar/upper-limb structures.',
        evidenceGrade: 'B',
        mapsToTreatmentId: 'education',
      },
      {
        id: 'lifting_technique',
        name: 'Lifting technique coaching',
        description: 'Hip-hinge cueing, load-close-to-body, breath strategies for manual handling.',
        dosage: '1–2 sessions · video review',
        rationale: 'Distributes load away from sensitised tissue, reduces re-injury risk.',
        evidenceGrade: 'B',
        mapsToTreatmentId: 'education',
      },
      {
        id: 'tool_modification',
        name: 'Tool / equipment modification',
        description: 'Padded grips, vibration-damping, ergonomic mouse, anti-fatigue mats etc.',
        dosage: 'As required',
        rationale: 'Reduces repetitive micro-load that drives chronic upper-limb conditions.',
        evidenceGrade: 'C',
        mapsToTreatmentId: 'education',
      },
    ],
  },
  {
    id: 'self_management',
    title: 'Self-Management Strategies',
    icon: Lightbulb,
    color: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-300', chip: 'bg-yellow-500/20 text-yellow-200' },
    blurb: 'Tools that put the patient in the driver’s seat between sessions.',
    items: [
      {
        id: 'symptom_diary',
        name: 'Symptom & activity diary',
        description: 'Track pain (0–10), aggravators, easers, and weekly capacity milestones.',
        dosage: 'Daily · 2-minute entry',
        rationale: 'Identifies provocative patterns and visible progress; supports shared decision-making.',
        evidenceGrade: 'C',
        mapsToTreatmentId: 'education',
      },
      {
        id: 'self_release',
        name: 'Home self-release (foam roll / ball)',
        description: 'Self-myofascial release of identified trigger points or tight myofascial chains.',
        dosage: '5–10 min · daily',
        rationale: 'Modest short-term ROM and pain effect; builds patient agency.',
        evidenceGrade: 'C',
        mapsToTreatmentId: 'manual_therapy',
      },
      {
        id: 'heat_cold',
        name: 'Heat / cold application',
        description: 'Heat for muscle stiffness/chronic pain; cold for acute flare/swelling.',
        dosage: '15–20 min · 2–3×/day as needed',
        rationale: 'Symptomatic relief that supports adherence; cheap and safe.',
        evidenceGrade: 'C',
        mapsToTreatmentId: 'electrophysical',
      },
    ],
  },
];

/** Look up the engine treatment id a Lifestyle item maps onto. Used by the
 *  Recovery Simulator's cart→intervention bridge. */
export function lifestyleTreatmentIdFor(itemId: string): string | undefined {
  for (const sec of LIFESTYLE_SECTIONS) {
    for (const it of sec.items) {
      if (makeCartId('lifestyle', it.id) === itemId) return it.mapsToTreatmentId;
      if (it.id === itemId) return it.mapsToTreatmentId;
    }
  }
  return undefined;
}

function LifestyleItemRow({ item, sectionId, suggested = false }: { item: LifestyleItem; sectionId: string; suggested?: boolean }) {
  const cartItem: PlanCartItem = {
    id: makeCartId('lifestyle', item.id),
    modality: 'lifestyle',
    name: item.name,
    targetStructure: '',
    targetFinding: '',
    dosage: item.dosage,
    rationale: item.rationale,
    contraindications: item.contraindications,
    evidenceGrade: item.evidenceGrade,
    category: sectionId,
  };
  return (
    <div className="border border-gray-700/40 bg-gray-800/30 rounded p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-gray-100">{item.name}</span>
            {suggested && (
              <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-amber-500/30 text-amber-100" title="Suggested for this case">★ Suggested</span>
            )}
            {item.evidenceGrade && (
              <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-amber-500/20 text-amber-200">
                Grade {item.evidenceGrade}
              </span>
            )}
            <span className="text-[8px] text-gray-500">{item.dosage}</span>
          </div>
          <div className="text-[9px] text-gray-300 mt-0.5 leading-snug">{item.description}</div>
          <div className="text-[9px] text-gray-400 italic mt-0.5">{item.rationale}</div>
          {item.contraindications && (
            <div className="text-[8px] text-red-300/80 mt-0.5">⚠ {item.contraindications}</div>
          )}
        </div>
        <div className="shrink-0">
          <AddToPlanButton size="xs" item={cartItem} />
        </div>
      </div>
    </div>
  );
}

function LifestyleSectionCard({ section, suggestedIds }: { section: LifestyleSection; suggestedIds: Set<string> }) {
  const suggestedCount = section.items.filter(it => suggestedIds.has(it.id)).length;
  const [open, setOpen] = useState(suggestedCount > 0);
  const Icon = section.icon;
  return (
    <div className={`border ${section.color.border} ${section.color.bg} rounded-lg overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 p-2 text-left hover:brightness-110 transition-all"
        data-testid={`lifestyle-section-${section.id}`}
      >
        <Icon className={`h-3.5 w-3.5 ${section.color.text} shrink-0`} />
        <span className={`text-[11px] font-semibold ${section.color.text} flex-1`}>{section.title}</span>
        {suggestedCount > 0 && (
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-100 border border-amber-400/40" title="Items suggested for this case">
            ★ {suggestedCount}
          </span>
        )}
        <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${section.color.chip}`}>
          {section.items.length} items
        </span>
        {open ? <ChevronUp className="h-3 w-3 text-gray-500" /> : <ChevronDown className="h-3 w-3 text-gray-500" />}
      </button>
      {open && (
        <div className="px-2 pb-2 space-y-1.5 border-t border-gray-700/30 pt-1.5">
          <div className="text-[9px] text-gray-400 italic">{section.blurb}</div>
          {section.items
            .slice()
            .sort((a, b) => Number(suggestedIds.has(b.id)) - Number(suggestedIds.has(a.id)))
            .map(it => (
              <div key={it.id} className={suggestedIds.has(it.id) ? 'ring-1 ring-amber-400/40 rounded' : ''}>
                <LifestyleItemRow item={it} sectionId={section.id} suggested={suggestedIds.has(it.id)} />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

/** Lightweight condition-aware filter: returns the set of lifestyle item IDs
 *  that should be highlighted for the current case based on diagnosis,
 *  recovery phase and irritability. Mirrors the suggestion filtering used
 *  elsewhere in the engine tabs. */
function suggestedItemIdsFor(
  diagnosis?: string,
  recoveryPhase?: string,
  irritability?: string,
): Set<string> {
  const out = new Set<string>();
  const dx = (diagnosis ?? '').toLowerCase();
  const phase = (recoveryPhase ?? '').toLowerCase();
  const irr = (irritability ?? '').toLowerCase();

  // Acute / high irritability → off-load, NSAID, sleep, flare plan
  if (phase.includes('acute') || phase.includes('protect') || irr.includes('high')) {
    out.add('micro_breaks');
    out.add('walking_aid');
    out.add('brace_supportive');
    out.add('taping_kt');
    out.add('nsaid_short_course');
    out.add('topical_nsaid');
    out.add('analgesia_simple');
    out.add('flare_plan');
    out.add('sleep_position');
    out.add('heat_cold');
  }

  // Sub-acute / progressing → pacing, education, ergonomics
  if (phase.includes('sub') || phase.includes('progress') || phase.includes('repair')) {
    out.add('pacing_quota');
    out.add('activity_substitution');
    out.add('pne_session');
    out.add('condition_explainer');
    out.add('workstation_setup');
    out.add('lifting_technique');
  }

  // Chronic / remodel → self-management, sleep routine, return-to-task ergonomics
  if (phase.includes('chronic') || phase.includes('remodel') || phase.includes('return')) {
    out.add('symptom_diary');
    out.add('self_release');
    out.add('sleep_routine');
    out.add('sleep_referral');
    out.add('tool_modification');
    out.add('pne_session');
  }

  // Diagnosis-keyed picks (small, evidence-aligned overrides)
  const dxRules: Array<[RegExp, string[]]> = [
    [/(low back|lumbar|spine|disc|stenosis)/, ['lifting_technique', 'workstation_setup', 'pne_session', 'pacing_quota']],
    [/(neck|cervical|whiplash)/, ['workstation_setup', 'sleep_position', 'pne_session']],
    [/(tendinop|tendin|achilles|patell|rotator)/, ['pacing_quota', 'topical_nsaid', 'activity_substitution']],
    [/(osteoarthrit|oa|knee oa|hip oa)/, ['walking_aid', 'topical_nsaid', 'pacing_quota', 'lifting_technique']],
    [/(post-?op|surger|reconstruct|replacement|arthroplast)/, ['brace_supportive', 'walking_aid', 'sleep_position', 'analgesia_simple']],
    [/(headache|migraine|tmj)/, ['sleep_routine', 'workstation_setup']],
    [/(shoulder|impinge|frozen)/, ['taping_kt', 'sleep_position', 'pne_session']],
  ];
  for (const [rx, ids] of dxRules) {
    if (rx.test(dx)) for (const id of ids) out.add(id);
  }

  return out;
}

export default function LifestyleAdjunctEngineTab({
  mechanismAnalysis: _mech,
  painMarkers: _pm,
  diagnosis,
  recoveryPhase,
  irritability,
}: LifestyleAdjunctEngineTabProps) {
  const ctxParts = useMemo(() => {
    const parts: string[] = [];
    if (diagnosis) parts.push(diagnosis);
    if (recoveryPhase) parts.push(`phase: ${recoveryPhase}`);
    if (irritability) parts.push(`irritability: ${irritability}`);
    return parts;
  }, [diagnosis, recoveryPhase, irritability]);

  const suggestedIds = useMemo(
    () => suggestedItemIdsFor(diagnosis, recoveryPhase, irritability),
    [diagnosis, recoveryPhase, irritability],
  );

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
        <div className="flex items-center gap-1.5 mb-1">
          <ClipboardList className="h-3.5 w-3.5 text-amber-300" />
          <span className="text-[11px] font-semibold text-amber-200">Lifestyle & Adjunct Rx</span>
          {suggestedIds.size > 0 && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-100 border border-amber-400/40">
              ★ {suggestedIds.size} suggested
            </span>
          )}
        </div>
        <div className="text-[9px] text-gray-300 leading-snug">
          Bundled non-prescription levers that move the recovery curve: pacing, bracing, NSAID referral,
          education, sleep, ergonomics and self-management. Add items to the plan to drop them on the
          treatment timeline.
        </div>
        {ctxParts.length > 0 && (
          <div className="text-[9px] text-gray-500 mt-1">Context · {ctxParts.join(' · ')}</div>
        )}
      </div>
      {LIFESTYLE_SECTIONS.map(sec => (
        <LifestyleSectionCard key={sec.id} section={sec} suggestedIds={suggestedIds} />
      ))}
    </div>
  );
}
