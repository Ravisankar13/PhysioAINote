import { z } from 'zod';
import { openai } from '../../openai';
import { searchPubMed } from './pubmedAdapter';
import { searchOpenAlex } from './openAlexAdapter';
import { searchEuropePmc } from './europePmcAdapter';
import { searchPedro } from './pedroAdapter';
import { searchSemanticScholar } from './semanticScholarAdapter';
import { searchCrossRef } from './crossrefAdapter';
import { searchClinicalTrials } from './clinicalTrialsAdapter';
import {
  normalizeDoi, normalizeTitle,
  serializeForBag, serializeForPubMed, serializeForEuropePmc, serializeForTrials,
  type AdapterResult, type NormalizedPaper, type Source, type StructuredQuery, type TrialMetadata,
} from './types';
import { researchTreatmentPlanSchema, searchablePhenotypeSchema, type SearchablePhenotype, type CaseResearchContext } from '@shared/schema';

// ---- Public types -------------------------------------------------

export interface InferredVariable {
  label: string;
  value: string;
  importance: number;             // 1-10, higher = more central; tie-breaker for drop order
  /** Explicit "drop me first" signal. The planner drops every variable
   *  flagged true BEFORE it touches importance-only candidates, so the
   *  AI can mark obviously soft modifiers (e.g. lifestyle aside) as
   *  the first to relax. */
  dropFirstIfNeeded: boolean;
  queryTerms: string[];           // canonical search terms for this variable (incl. synonyms)
  rationale: string;
}

export interface QueryTierRecord {
  tier: number;
  label: string;
  query: string;
  droppedVariables: string[];
  sources: Record<string, { count: number; ok: boolean; error?: string; query?: string }>;
  paperCount: number;
  /** The seed phrase actually used for this tier — useful for the
   *  "How we searched" UI when the seed was broadened. */
  seedUsed: string;
  /** Coarse classification so the UI can colour broaden-seed tiers
   *  differently from drop-modifier tiers. */
  kind: 'full' | 'drop-soft' | 'broaden-seed' | 'drop-hard' | 'condition-only';
}

export interface RankedPaper {
  citationNumber: number;
  source: Source;
  externalId: string;
  title: string;
  authors: string[];
  year: number | null;
  journal: string | null;
  abstract: string;
  doi: string | null;
  url: string;
  openAccess: boolean;
  matchedVariables: string[];
  /** Union of every source that contributed this paper (PubMed +
   *  Semantic Scholar + CrossRef-filled, etc). Always contains at
   *  least the primary `source`. */
  mergedFromSources: Source[];
  /** PEDro Score (0-10) when this paper came from PEDro. */
  pedroScore?: number | null;
  /** Citation count when populated by Semantic Scholar. */
  citationCount?: number | null;
}

export interface RankedTrial {
  source: 'clinicaltrials';
  nct: string;
  title: string;
  abstract: string;
  status: string;
  phase: string | null;
  intervention: string | null;
  primaryOutcome: string | null;
  url: string;
  sponsor: string | null;
}

export type ConfidenceBucket = 'High' | 'Moderate' | 'Low' | 'Extrapolated';

export interface SeedBroadening {
  tier: number;
  from: string;
  to: string;
}

export interface CaseResearchOutcome {
  phenotype: SearchablePhenotype;
  inferredVariables: InferredVariable[];
  queriesRan: QueryTierRecord[];
  retrievedPapers: RankedPaper[];
  /** ClinicalTrials.gov v2 records — split out of the citation
   *  pipeline because they're trials, not abstracts. Up to 5 are
   *  surfaced in a dedicated "Active & recent trials" sub-section. */
  retrievedTrials: RankedTrial[];
  synthesizedAnswer: string;
  confidence: ConfidenceBucket;
  confidenceReason: string;
  droppedVariables: string[];
  seedBroadenings: SeedBroadening[];
  /** Task #305 — structured, evidence-cited treatment plan derived
   *  from the same retrieved papers. Null if plan synthesis failed
   *  (the prose answer is still returned). */
  researchTreatmentPlan: ResearchTreatmentPlan | null;
}

export type ResearchTreatmentPlan = {
  generatedAt: string;
  hasEvidence: boolean;
  noEvidenceReason?: string;
  phases: Array<{
    name: string;
    goal: string;
    duration: string;
    interventions: Array<{
      category: 'exercise' | 'manual_therapy' | 'electrophysical' | 'education_lifestyle';
      label: string;
      dose: string;
      citations: number[];
      extrapolated: boolean;
      rationale?: string;
    }>;
    progressionCriteria: Array<{ criterion: string; citations: number[] }>;
  }>;
  outcomeMeasures: Array<{ name: string; purpose: string; citations: number[] }>;
  redFlags: string[];
  followUpCadence: string;
  confidence: ConfidenceBucket;
  confidenceReason: string;
};

// ---- Phenotype translation ---------------------------------------

/** Words/phrases that almost never appear in literature in the form
 *  the clinician uses. These are auto-treated as soft (and stripped
 *  from queryTerms) regardless of how the model ranks them. */
const SOFT_LABEL_PATTERNS: RegExp[] = [
  /\blateralit/i,
  /\bhandedness\b/i,
  /\b(left|right)\s*(side|sided|sidedness)\b/i,
  /\bdominant\s*(arm|leg|hand|side)\b/i,
];

/** Phrases that should never end up as literal AND'd tokens in a
 *  search query (PubMed/OpenAlex/Europe PMC have ~0 papers using
 *  them). The phenotype-translation step is the primary defence;
 *  this is the last-line scrub. */
const FORBIDDEN_QUERY_TOKEN_RE = /\b(right[\s-]?sided?|left[\s-]?sided?|right[\s-]?hand(ed)?|left[\s-]?hand(ed)?|hinging|flares?[\s-]?up|flares?[\s-]?with|bilateral(ly)?)\b/i;

function scrubForbiddenTokens(terms: string[]): string[] {
  return terms
    .map(t => t.trim())
    .filter(t => t.length > 0 && !FORBIDDEN_QUERY_TOKEN_RE.test(t));
}

const phenotypeAiSchema = z.object({
  canonicalCondition: z.object({
    primary: z.string().min(1).max(160),
    synonyms: z.array(z.string().min(1).max(160)).max(8).default([]),
  }),
  region: z.string().min(0).max(80).nullable().optional(),
  laterality: z.enum(['left', 'right', 'bilateral', 'unspecified']).nullable().optional(),
  mechanism: z.object({
    phrases: z.array(z.string().min(1).max(120)).max(8).default([]),
    soft: z.boolean().default(false),
  }).default({ phrases: [], soft: false }),
  aggravatingFactors: z.object({
    phrases: z.array(z.string().min(1).max(120)).max(8).default([]),
    soft: z.boolean().default(true),
  }).default({ phrases: [], soft: true }),
  painType: z.string().min(0).max(80).nullable().optional(),
});

/** Bare-bones, deterministic fallback when the AI translation step
 *  fails — keeps the pipeline running with a sensible phenotype
 *  derived from the raw condition text. */
export function fallbackPhenotype(condition: string): SearchablePhenotype {
  const cleaned = condition
    .replace(/[",.()\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
  return {
    canonicalCondition: { primary: cleaned || 'condition', synonyms: [] },
    region: null,
    regionSoft: false,
    laterality: 'unspecified',
    mechanism: { phrases: [], soft: false },
    aggravatingFactors: { phrases: [], soft: true },
    painType: null,
    painTypeSoft: true,
  };
}

/** Task #313 — render a structured caseContext block into a small,
 *  biomedical-flavoured prose preamble that we prepend to the case
 *  summary going into the inferPhenotype/inferVariables prompts. We
 *  keep it short and labelled so the model can lift the values
 *  verbatim into queryTerms instead of having to re-infer them from
 *  free prose. */
export function formatCaseContextForPrompt(ctx: CaseResearchContext): string {
  const lines: string[] = [];
  if (ctx.topHypothesis?.label) {
    const conf = ctx.topHypothesis.confidence != null
      ? ` (confidence ${(ctx.topHypothesis.confidence * 100).toFixed(0)}%)` : '';
    lines.push(`Working hypothesis: ${ctx.topHypothesis.label}${conf}`);
  }
  if (ctx.mainComplaint) lines.push(`Main complaint: ${ctx.mainComplaint}`);
  if (ctx.region) {
    const lat = ctx.laterality && ctx.laterality !== 'unspecified' ? ` (${ctx.laterality})` : '';
    lines.push(`Region: ${ctx.region}${lat}`);
  } else if (ctx.laterality && ctx.laterality !== 'unspecified') {
    lines.push(`Laterality: ${ctx.laterality}`);
  }
  if (ctx.chronicity) lines.push(`Chronicity: ${ctx.chronicity}`);
  if (ctx.irritability) lines.push(`Irritability: ${ctx.irritability}`);
  if (ctx.mechanism) lines.push(`Mechanism: ${ctx.mechanism}`);
  if (ctx.painRegions && ctx.painRegions.length) {
    lines.push(`Pain regions on skeleton: ${ctx.painRegions.slice(0, 8).join(', ')}`);
  }
  if (ctx.patientFactors && ctx.patientFactors.length) {
    lines.push(`Patient factors: ${ctx.patientFactors.slice(0, 8).join(', ')}`);
  }
  if (lines.length === 0) return '';
  return `STRUCTURED CASE CONTEXT (already extracted by the page — prefer these over re-inferring from prose):\n${lines.map(l => `- ${l}`).join('\n')}`;
}

/** Translate the clinician's free-text condition + summary into a
 *  STRUCTURED, biomedically-canonical search phenotype. This is the
 *  single most important step for retrieval quality — it prevents
 *  the engine from AND'ing colloquial words ("right-sided", "hinging")
 *  into queries no source has papers for. */
export async function inferPhenotype(condition: string, caseSummary: string): Promise<SearchablePhenotype> {
  const sys = `You are a clinical-research librarian translating a clinician's free-text case description into a STRUCTURED search phenotype that PubMed / OpenAlex / Europe PMC / PEDro / Semantic Scholar / CrossRef / ClinicalTrials.gov will actually return papers for.

Your only job: rephrase the case in the WORDS BIOMEDICAL LITERATURE USES.

Output a single JSON object with these fields:
- canonicalCondition.primary: the most likely biomedical name for this presentation (e.g. "non-specific low back pain", "subacromial pain syndrome", "patellofemoral pain"). NEVER include laterality words ("right-sided", "left-sided") here.
- canonicalCondition.synonyms: 1-5 SHORT alternative biomedical phrasings ordered from MOST SPECIFIC to BROADEST (e.g. ["mechanical low back pain", "non-specific low back pain", "low back pain"]). These are used to "broaden the seed" if the most specific phrase returns no evidence. NEVER include laterality words here.
- region: anatomical region in literature wording (e.g. "lumbar spine", "shoulder", "knee"). Null if unclear.
- laterality: "left" | "right" | "bilateral" | "unspecified". This is ALWAYS treated as a soft modifier — it never enters the boolean search; it's just metadata.
- mechanism.phrases: 1-4 SHORT canonical mechanism descriptors as they appear in literature (e.g. "flexion-related", "discogenic", "instability", "tendinopathy"). NEVER include lay verbs like "hinging", "twisting", "flares up" — translate them ("hinging" -> "lumbar flexion", "flares up with" -> aggravating factor). Empty array if unclear.
- mechanism.soft: false if the mechanism is clinically central (e.g. for a tendinopathy diagnosis), true if it's just descriptive flavour.
- aggravatingFactors.phrases: 0-4 SHORT canonical biomechanical aggravators (e.g. "lumbar flexion", "stair climbing", "prolonged sitting", "overhead activity"). Translate lay words.
- aggravatingFactors.soft: default true (aggravating factors are hard to find as AND'd terms in literature).
- painType: e.g. "mechanical", "neuropathic", "inflammatory", or null.

Hard rules:
- DO NOT echo the clinician's raw words. Translate every word into biomedical phrasing.
- DO NOT include laterality words ("right-sided", "left-sided", "ipsilateral", "contralateral") in canonicalCondition or synonyms.
- DO NOT include verbs that are not search terms ("flares", "hinges", "shoots", "comes and goes").
- All phrases must be SHORT (≤6 words) and noun-phrasey so they work as ANDs in a boolean query.

Return ONLY this JSON. No prose.`;

  const usr = `Clinician's free-text condition / diagnosis:
"""${condition.slice(0, 600)}"""

Case summary (clinical text + patient context):
"""${caseSummary.slice(0, 6000)}"""

Translate into a structured phenotype now.`;

  try {
    const r = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });
    const raw = r.choices?.[0]?.message?.content || '{}';
    const parsedRaw = phenotypeAiSchema.parse(JSON.parse(raw));

    // Scrub forbidden tokens out of canonical condition + synonyms
    // defensively — the prompt already forbids them but models slip.
    const primary = parsedRaw.canonicalCondition.primary
      .replace(FORBIDDEN_QUERY_TOKEN_RE, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const synonyms = (parsedRaw.canonicalCondition.synonyms || [])
      .map(s => s.replace(FORBIDDEN_QUERY_TOKEN_RE, ' ').replace(/\s+/g, ' ').trim())
      .filter(s => s.length > 0 && s.toLowerCase() !== primary.toLowerCase());
    const dedupedSyn = Array.from(new Set(synonyms));

    const validated: SearchablePhenotype = searchablePhenotypeSchema.parse({
      canonicalCondition: { primary: primary || fallbackPhenotype(condition).canonicalCondition.primary, synonyms: dedupedSyn },
      region: parsedRaw.region ?? null,
      laterality: parsedRaw.laterality ?? 'unspecified',
      mechanism: {
        phrases: scrubForbiddenTokens(parsedRaw.mechanism?.phrases ?? []),
        soft: parsedRaw.mechanism?.soft ?? false,
      },
      aggravatingFactors: {
        phrases: scrubForbiddenTokens(parsedRaw.aggravatingFactors?.phrases ?? []),
        soft: parsedRaw.aggravatingFactors?.soft ?? true,
      },
      painType: parsedRaw.painType ?? null,
    });
    return validated;
  } catch (e) {
    console.warn('[caseResearch] phenotype translation failed; using fallback:', e);
    return fallbackPhenotype(condition);
  }
}

// ---- Variable inference ------------------------------------------

const inferenceSchema = z.object({
  variables: z.array(z.object({
    label: z.string().min(1).max(60),
    value: z.string().min(1).max(200),
    importance: z.number().int().min(1).max(10),
    dropFirstIfNeeded: z.boolean().optional().default(false),
    queryTerms: z.array(z.string().min(1).max(80)).min(1).max(8),
    rationale: z.string().min(1).max(280),
  })).min(0).max(8),
});

/** Ask the model to extract the patient-discriminating variables that
 *  should drive an evidence search. We ask it to ignore the diagnosis
 *  itself (that becomes the broadest fallback tier) and focus on the
 *  modifiers that change which evidence is actually applicable.
 *  Each variable's queryTerms now MUST include canonical synonyms so
 *  the search ANDs an OR-group of biomedical phrasings. */
export async function inferVariables(condition: string, caseSummary: string): Promise<InferredVariable[]> {
  const sys = `You are a senior physiotherapist preparing an evidence search for a SPECIFIC patient.

The clinician already knows the working diagnosis. Your job is to extract the 3-7 PATIENT-DISCRIMINATING variables from the case that would meaningfully change which evidence is applicable (e.g. "diabetic" for frozen shoulder, "post-fluoroquinolone" for Achilles, "sub-acute (8 weeks)" for low back pain, "elite runner" for ITBS).

Rules:
- Do NOT include the diagnosis itself as a variable.
- Each variable must be something a literature search could be FILTERED by — i.e. there should be a plausible MeSH/keyword expression.
- For each variable provide 2-6 short canonical "queryTerms" — the CANONICAL biomedical phrase PLUS its common synonyms (the OR-set a boolean query should expand into). Example: for "subacute" → ["subacute", "8-12 weeks duration", "non-acute", "non-chronic"]. For "diabetes" → ["diabetes mellitus", "type 2 diabetes", "diabetic"]. Use real biomedical phrasing — never lay words.
- NEVER include laterality words ("right-sided", "left-sided"), lay verbs ("hinging", "flares"), or other words that don't appear in titles/abstracts.
- "importance" is 1-10; higher = more central to the case (will be kept longest as the tiers relax).
- "dropFirstIfNeeded" (boolean): set true for soft modifiers (lifestyle aside, occupational details, secondary comorbidities) that should be relaxed FIRST when literature is thin. Leave false for clinically central modifiers (acuity, stage, primary comorbidity, surgical status).
- "rationale" is one short sentence explaining why this variable changes the evidence.
- Return an empty variables array if the case is so generic there are no useful discriminators.

Return ONLY this JSON:
{ "variables": [ { "label": "...", "value": "...", "importance": 8, "dropFirstIfNeeded": false, "queryTerms": ["canonical", "synonym1", "synonym2"], "rationale": "..." } ] }`;

  const usr = `Diagnosis / condition:
"""${condition.slice(0, 500)}"""

Case summary (clinical text + patient context):
"""${caseSummary.slice(0, 6000)}"""

Extract the discriminating variables now.`;

  let parsed: z.infer<typeof inferenceSchema>;
  try {
    const r = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });
    const raw = r.choices?.[0]?.message?.content || '{}';
    parsed = inferenceSchema.parse(JSON.parse(raw));
  } catch (e) {
    console.warn('[caseResearch] variable inference failed; falling back to empty list:', e);
    return [];
  }

  // Apply deterministic soft-flag overrides + scrub forbidden tokens.
  const cleaned: InferredVariable[] = parsed.variables
    .map(v => {
      const isSoftLabel = SOFT_LABEL_PATTERNS.some(re => re.test(v.label) || re.test(v.value));
      const queryTerms = scrubForbiddenTokens(v.queryTerms.map(t => t.trim()));
      return {
        ...v,
        // Force laterality / handedness / similar low-yield modifiers
        // to be soft regardless of what the model said. These almost
        // never appear in literature as searchable terms.
        dropFirstIfNeeded: v.dropFirstIfNeeded || isSoftLabel,
        queryTerms,
      };
    })
    // After scrubbing, a variable with no usable terms is useless.
    .filter(v => v.queryTerms.length > 0);

  // Sort by importance descending so the planner can drop the lowest first.
  return cleaned.sort((a, b) => b.importance - a.importance);
}

// ---- Phenotype → variables (for the "Re-run with my edits" path) -

/** Derive an InferredVariable[] DIRECTLY from the supplied phenotype.
 *  Used when the clinician submitted a `phenotypeOverride` — we then
 *  bypass the AI variable-inference step and construct query groups
 *  from the phenotype's mechanism / aggravators / region / pain type
 *  fields, honouring the soft/hard flags the clinician set in the UI.
 *  This makes the edited phenotype AUTHORITATIVE for retrieval, not
 *  just a display string. */
export function variablesFromPhenotype(phenotype: SearchablePhenotype): InferredVariable[] {
  const out: InferredVariable[] = [];

  // Region — clinically central by default but the clinician can
  // mark it soft via the editor (`regionSoft`).
  if (phenotype.region && phenotype.region.trim().length > 0) {
    const terms = scrubForbiddenTokens([phenotype.region.trim()]);
    if (terms.length > 0) {
      const soft = phenotype.regionSoft === true;
      out.push({
        label: 'Region',
        value: phenotype.region.trim(),
        importance: soft ? 6 : 9,
        dropFirstIfNeeded: soft,
        queryTerms: terms,
        rationale: soft
          ? 'Region from edited phenotype (marked soft — drop first).'
          : 'Anatomical region from edited phenotype (kept).',
      });
    }
  }

  // Mechanism — soft/hard honoured from phenotype.mechanism.soft.
  if (phenotype.mechanism.phrases.length > 0) {
    const terms = scrubForbiddenTokens(phenotype.mechanism.phrases);
    if (terms.length > 0) {
      out.push({
        label: 'Mechanism',
        value: phenotype.mechanism.phrases.join(', '),
        importance: phenotype.mechanism.soft ? 5 : 7,
        dropFirstIfNeeded: phenotype.mechanism.soft,
        queryTerms: terms,
        rationale: phenotype.mechanism.soft
          ? 'Mechanism phrases from edited phenotype (marked soft — drop first).'
          : 'Mechanism phrases from edited phenotype (marked hard — keep).',
      });
    }
  }

  // Aggravating factors — soft by default; honour override.
  if (phenotype.aggravatingFactors.phrases.length > 0) {
    const terms = scrubForbiddenTokens(phenotype.aggravatingFactors.phrases);
    if (terms.length > 0) {
      out.push({
        label: 'Aggravating factors',
        value: phenotype.aggravatingFactors.phrases.join(', '),
        importance: phenotype.aggravatingFactors.soft ? 4 : 6,
        dropFirstIfNeeded: phenotype.aggravatingFactors.soft,
        queryTerms: terms,
        rationale: phenotype.aggravatingFactors.soft
          ? 'Aggravators from edited phenotype (marked soft — drop first).'
          : 'Aggravators from edited phenotype (marked hard — keep).',
      });
    }
  }

  // Pain type — soft by default; clinician can flip to hard via the
  // editor (`painTypeSoft = false`).
  if (phenotype.painType && phenotype.painType.trim().length > 0) {
    const terms = scrubForbiddenTokens([phenotype.painType.trim()]);
    if (terms.length > 0) {
      const soft = phenotype.painTypeSoft !== false; // default true
      out.push({
        label: 'Pain type',
        value: phenotype.painType.trim(),
        importance: soft ? 4 : 6,
        dropFirstIfNeeded: soft,
        queryTerms: terms,
        rationale: soft
          ? 'Pain type from edited phenotype (treated as soft).'
          : 'Pain type from edited phenotype (marked hard — keep).',
      });
    }
  }

  return out.sort((a, b) => b.importance - a.importance);
}

// ---- Query ladder ------------------------------------------------

export interface QueryTier {
  tier: number;
  label: string;
  variables: InferredVariable[];   // currently active
  dropped: InferredVariable[];     // dropped to reach this tier
  seed: string;                    // seed phrase used for this tier
  structured: StructuredQuery;
  kind: QueryTierRecord['kind'];
}

function buildStructuredQuery(seed: string, vars: InferredVariable[]): StructuredQuery {
  return {
    seedPhrases: seed ? [seed] : [],
    groups: vars
      .filter(v => v.queryTerms.length > 0)
      .map(v => ({ label: v.label, phrases: v.queryTerms })),
  };
}

/** Build the tiered query ladder. Order:
 *   1. Tier 0: primary seed + ALL variables.
 *   2. Drop dropFirstIfNeeded variables one at a time (lowest importance first).
 *   3. Broaden the seed: for each canonical synonym in the phenotype,
 *      emit a tier that swaps the seed but keeps the remaining
 *      (high-importance) variables. This is the "search like a
 *      researcher" step — try a broader phrasing BEFORE nuking
 *      modifiers that actually matter.
 *   4. Drop high-importance variables one at a time, using the
 *      broadest seed already proven to be available (so we don't
 *      regress on seed phrasing).
 *   5. Final "Condition only" tier: broadest seed, no variables. */
export function buildQueryLadder(phenotype: SearchablePhenotype, vars: InferredVariable[]): QueryTier[] {
  const tiers: QueryTier[] = [];
  const primary = phenotype.canonicalCondition.primary;
  const synonyms = phenotype.canonicalCondition.synonyms.filter(s => s && s.toLowerCase() !== primary.toLowerCase());
  const broadestSeed = synonyms[synonyms.length - 1] || primary;

  const sorted = [...vars].sort((a, b) => {
    if (a.dropFirstIfNeeded !== b.dropFirstIfNeeded) {
      return a.dropFirstIfNeeded ? -1 : 1;
    }
    return a.importance - b.importance;
  });

  const softVars = sorted.filter(v => v.dropFirstIfNeeded);
  const hardVars = sorted.filter(v => !v.dropFirstIfNeeded);

  let active: InferredVariable[] = [...sorted];
  const dropped: InferredVariable[] = [];

  const pushTier = (
    seed: string,
    activeNow: InferredVariable[],
    droppedNow: InferredVariable[],
    label: string,
    kind: QueryTierRecord['kind'],
  ) => {
    const structured = buildStructuredQuery(seed, activeNow);
    if (structured.seedPhrases.length === 0 && structured.groups.length === 0) return;
    tiers.push({
      tier: tiers.length,
      label,
      variables: [...activeNow].sort((a, b) => b.importance - a.importance),
      dropped: [...droppedNow],
      seed,
      structured,
      kind,
    });
  };

  // Tier 0 — full case
  pushTier(
    primary,
    active,
    [],
    vars.length > 0 ? `Full case (${vars.length} variable${vars.length === 1 ? '' : 's'})` : 'Condition only',
    vars.length > 0 ? 'full' : 'condition-only',
  );

  // Phase 2: drop soft (dropFirstIfNeeded) variables one by one.
  let softLeft = [...softVars].sort((a, b) => a.importance - b.importance);
  while (softLeft.length > 0) {
    const removed = softLeft.shift()!;
    active = active.filter(v => v !== removed);
    dropped.push(removed);
    pushTier(
      primary,
      active,
      dropped,
      `Dropped soft modifier "${removed.label}" (${active.length} variable${active.length === 1 ? '' : 's'} left)`,
      'drop-soft',
    );
  }

  // Phase 3: broaden the seed — only worth doing while we still have
  // hard (high-importance) variables active; otherwise it's just the
  // condition-only tier.
  if (hardVars.length > 0) {
    let prevSeed = primary;
    for (const syn of synonyms) {
      pushTier(
        syn,
        active,
        dropped,
        `Broadened seed from "${prevSeed}" → "${syn}"`,
        'broaden-seed',
      );
      prevSeed = syn;
    }
  }

  // Phase 4: drop hard variables one by one, keeping the broadest
  // seed (we've already proven the narrower seeds didn't help if we
  // got this far in the ladder).
  let hardLeft = [...hardVars].sort((a, b) => a.importance - b.importance);
  while (hardLeft.length > 0) {
    const removed = hardLeft.shift()!;
    active = active.filter(v => v !== removed);
    dropped.push(removed);
    pushTier(
      broadestSeed,
      active,
      dropped,
      active.length > 0
        ? `Dropped "${removed.label}" (${active.length} variable${active.length === 1 ? '' : 's'} left)`
        : `Condition only ("${broadestSeed}")`,
      active.length > 0 ? 'drop-hard' : 'condition-only',
    );
  }

  // Edge case: if no variables ever existed and we never broadened,
  // we still have tier 0 above. If hardVars was empty but synonyms
  // exist, also try condition-only with broader synonyms so the
  // ladder isn't stuck on the most-specific phrasing.
  if (hardVars.length === 0 && synonyms.length > 0) {
    let prevSeed = primary;
    for (const syn of synonyms) {
      pushTier(syn, [], [...dropped], `Condition only ("${syn}")`, 'condition-only');
      prevSeed = syn;
    }
  }

  return tiers;
}

// ---- Retrieval + dedupe + ranking --------------------------------

/** Higher = preferred when the same paper is returned by multiple
 *  sources. PubMed wins because its abstracts are the most reliably
 *  complete; PEDro and Semantic Scholar tie just below because each is
 *  domain-leading in its own niche (physio gold-standard / AI relevance).
 *  ClinicalTrials.gov is 0 — trials don't compete on the paper ranking
 *  (they're split out into their own sub-section). */
const SOURCE_PRIORITY: Record<Source, number> = {
  pubmed: 4,
  europepmc: 3,
  semanticscholar: 3,
  pedro: 3,
  openalex: 2,
  crossref: 1,
  clinicaltrials: 0,
};

interface MergedPaper extends NormalizedPaper {
  matchedVariables: string[];
  rankScore: number;
  mergedFromSources: Source[];
}

function dedupeAndMerge(results: AdapterResult[], variables: InferredVariable[]): { papers: MergedPaper[]; trials: NormalizedPaper[] } {
  const byKey = new Map<string, MergedPaper>();
  const trials: NormalizedPaper[] = [];
  const currentYear = new Date().getFullYear();

  for (const r of results) {
    if (!r.ok) continue;
    for (const p of r.papers) {
      // Trials are a sibling channel — keep them out of the paper
      // dedupe pool. They're surfaced in their own sub-section.
      if (p.source === 'clinicaltrials') {
        trials.push(p);
        continue;
      }
      const doi = normalizeDoi(p.doi);
      const titleKey = normalizeTitle(p.title);
      const key = doi ? `doi:${doi}` : `t:${titleKey}`;
      if (!key || (key === 't:' && !doi)) continue;

      const matched: string[] = [];
      const haystack = `${p.title}\n${p.abstract}`.toLowerCase();
      for (const v of variables) {
        const hit = v.queryTerms.some(t => {
          const tt = t.toLowerCase().trim();
          return tt.length >= 3 && haystack.includes(tt);
        });
        if (hit) matched.push(v.label);
      }
      const coverageScore = matched.length * 6;
      const abstractScore = p.abstract && p.abstract.length > 80 ? 4 : 0;
      const recencyScore = p.year ? Math.max(0, 5 - Math.min(5, currentYear - p.year)) : 0;
      const sourceScore = SOURCE_PRIORITY[p.source];
      const oaScore = p.openAccess ? 1 : 0;
      // PEDro Score (0-10) is a methodological-quality boost — half-weight
      // the score so a 10/10 RCT lifts the paper by ~5 points without
      // dominating coverage.
      const pedroScore = typeof p.pedroScore === 'number' ? p.pedroScore * 0.5 : 0;
      // Mild log-bump for highly-cited papers from S2.
      const citationBoost = typeof p.citationCount === 'number' && p.citationCount > 0
        ? Math.min(3, Math.log10(p.citationCount + 1))
        : 0;
      const score = coverageScore + abstractScore + recencyScore + sourceScore + oaScore + pedroScore + citationBoost;

      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, {
          ...p,
          matchedVariables: matched,
          rankScore: score,
          mergedFromSources: [p.source],
        });
      } else {
        const better = SOURCE_PRIORITY[p.source] > SOURCE_PRIORITY[existing.source] ? p : existing;
        const mergedMatched = Array.from(new Set([...existing.matchedVariables, ...matched]));
        const mergedSources = Array.from(new Set([...existing.mergedFromSources, p.source])) as Source[];
        // CrossRef opportunistic field-fill: when the existing record
        // is missing journal/year and the same DOI/title comes back
        // from CrossRef with those populated, fill them in. CrossRef
        // metadata is usually clean even when its abstract is empty.
        const fillJournal = !existing.journal && p.source === 'crossref' && p.journal ? p.journal : null;
        const fillYear = existing.year == null && p.source === 'crossref' && typeof p.year === 'number' ? p.year : null;
        // Also let any incoming source fill missing journal/year if
        // the existing record happens to be CrossRef-only.
        const reverseFillJournal = !existing.journal && existing.source === 'crossref' && p.journal ? p.journal : null;
        const reverseFillYear = existing.year == null && existing.source === 'crossref' && typeof p.year === 'number' ? p.year : null;

        byKey.set(key, {
          ...better,
          abstract: (p.abstract.length > existing.abstract.length ? p.abstract : existing.abstract),
          journal: better.journal ?? fillJournal ?? reverseFillJournal ?? existing.journal ?? p.journal,
          year: better.year ?? fillYear ?? reverseFillYear ?? existing.year ?? p.year,
          // Preserve any source-specific extras that may live on either side.
          pedroScore: existing.pedroScore ?? p.pedroScore ?? null,
          citationCount: typeof existing.citationCount === 'number'
            ? Math.max(existing.citationCount, p.citationCount ?? 0)
            : (p.citationCount ?? null),
          openAccess: existing.openAccess || p.openAccess,
          matchedVariables: mergedMatched,
          rankScore: Math.max(existing.rankScore, score) + 1,
          mergedFromSources: mergedSources,
        });
      }
    }
  }

  return {
    papers: Array.from(byKey.values()).sort((a, b) => b.rankScore - a.rankScore),
    trials,
  };
}

// ---- Tier runner -------------------------------------------------

const PER_SOURCE_LIMIT = 8;
const TARGET_USABLE = 6;
const MAX_FINAL_PAPERS = 10;

interface RunOutput {
  queriesRan: QueryTierRecord[];
  papers: MergedPaper[];
  trials: NormalizedPaper[];
  droppedVariables: string[];
  winningTier: number;
  seedBroadenings: SeedBroadening[];
}

async function runTier(tier: QueryTier, variables: InferredVariable[]): Promise<{ record: QueryTierRecord; merged: MergedPaper[]; trials: NormalizedPaper[] }> {
  // Per-source serialization — PubMed gets boolean+[tiab], the others
  // get a relevance-friendly bag of phrases. PEDro / Semantic Scholar /
  // CrossRef all behave best with the bag form. ClinicalTrials.gov v2
  // uses a plain-text condition query.
  const pubmedQ = serializeForPubMed(tier.structured);
  const bagQ = serializeForBag(tier.structured);
  const epmcQ = serializeForEuropePmc(tier.structured);
  const trialsQ = serializeForTrials(tier.structured);

  const [pm, oa, ep, pedro, s2, cr, ct] = await Promise.all([
    searchPubMed(pubmedQ, { limit: PER_SOURCE_LIMIT }),
    searchOpenAlex(bagQ, { limit: PER_SOURCE_LIMIT }),
    searchEuropePmc(epmcQ, { limit: PER_SOURCE_LIMIT }),
    searchPedro(bagQ, { limit: PER_SOURCE_LIMIT }),
    searchSemanticScholar(bagQ, { limit: PER_SOURCE_LIMIT }),
    searchCrossRef(bagQ, { limit: PER_SOURCE_LIMIT }),
    searchClinicalTrials(trialsQ, { limit: PER_SOURCE_LIMIT }),
  ]);
  const { papers: merged, trials } = dedupeAndMerge([pm, oa, ep, pedro, s2, cr, ct], variables);
  // Display query is the bag-of-phrases (most readable to clinicians).
  const record: QueryTierRecord = {
    tier: tier.tier,
    label: tier.label,
    query: bagQ,
    droppedVariables: tier.dropped.map(d => d.label),
    sources: {
      pubmed: { count: pm.papers.length, ok: pm.ok, query: pubmedQ, ...(pm.error ? { error: pm.error } : {}) },
      openalex: { count: oa.papers.length, ok: oa.ok, query: bagQ, ...(oa.error ? { error: oa.error } : {}) },
      europepmc: { count: ep.papers.length, ok: ep.ok, query: epmcQ, ...(ep.error ? { error: ep.error } : {}) },
      pedro: { count: pedro.papers.length, ok: pedro.ok, query: bagQ, ...(pedro.error ? { error: pedro.error } : {}) },
      semanticscholar: { count: s2.papers.length, ok: s2.ok, query: bagQ, ...(s2.error ? { error: s2.error } : {}) },
      crossref: { count: cr.papers.length, ok: cr.ok, query: bagQ, ...(cr.error ? { error: cr.error } : {}) },
      clinicaltrials: { count: ct.papers.length, ok: ct.ok, query: trialsQ, ...(ct.error ? { error: ct.error } : {}) },
    },
    paperCount: merged.length,
    seedUsed: tier.seed,
    kind: tier.kind,
  };
  return { record, merged, trials };
}

export async function retrieveTiered(phenotype: SearchablePhenotype, variables: InferredVariable[]): Promise<RunOutput> {
  const ladder = buildQueryLadder(phenotype, variables);
  const queriesRan: QueryTierRecord[] = [];
  const seedBroadenings: SeedBroadening[] = [];
  let bestMerged: MergedPaper[] = [];
  let bestTrials: NormalizedPaper[] = [];
  let bestTier = 0;
  let bestDropped: string[] = [];

  let prevSeedSeen = phenotype.canonicalCondition.primary;

  for (const tier of ladder) {
    if (tier.structured.seedPhrases.length === 0 && tier.structured.groups.length === 0) continue;
    const { record, merged, trials } = await runTier(tier, variables);
    queriesRan.push(record);

    if (record.kind === 'broaden-seed' && tier.seed !== prevSeedSeen) {
      seedBroadenings.push({ tier: record.tier, from: prevSeedSeen, to: tier.seed });
    }
    prevSeedSeen = tier.seed;

    const usable = merged.filter(p => p.abstract && p.abstract.length >= 120);
    if (usable.length >= TARGET_USABLE || tier.variables.length === 0) {
      bestMerged = merged;
      bestTier = tier.tier;
      bestDropped = tier.dropped.map(d => d.label);
      // Same preservation rule as the merged-improves branch below: only
      // overwrite trials when the winning tier actually returned any,
      // so we don't drop earlier ClinicalTrials.gov hits when the
      // paper tier finally hits TARGET_USABLE.
      if (trials.length > 0) {
        bestTrials = trials;
      }
      break;
    }
    if (merged.length > bestMerged.length) {
      bestMerged = merged;
      bestTier = tier.tier;
      bestDropped = tier.dropped.map(d => d.label);
      // Only overwrite trials when the winning tier actually returned
      // some — otherwise we'd silently discard useful ClinicalTrials.gov
      // hits from an earlier tier just because a later tier improved
      // the paper pool. Trials live in their own sub-section, so we
      // can keep the best non-empty set we've seen so far.
      if (trials.length > 0) {
        bestTrials = trials;
      }
    } else if (bestTrials.length === 0 && trials.length > 0) {
      // Same idea, in reverse: even if the paper pool didn't grow,
      // grab trial signal the first time we see it.
      bestTrials = trials;
    }
  }

  return {
    queriesRan,
    papers: bestMerged.slice(0, MAX_FINAL_PAPERS),
    trials: bestTrials,
    droppedVariables: bestDropped,
    winningTier: bestTier,
    seedBroadenings,
  };
}

// ---- Synthesis ----------------------------------------------------

const synthesisSchema = z.object({
  answer: z.string().min(1).max(8000),
  citation_map: z.array(z.number().int().positive()).max(50),
  confidence: z.enum(['High', 'Moderate', 'Low', 'Extrapolated']),
  confidence_reason: z.string().max(400),
});

export async function synthesizeCaseAnswer(
  condition: string,
  caseSummary: string,
  papers: RankedPaper[],
  droppedVariables: string[],
  phenotype: SearchablePhenotype,
  seedBroadenings: SeedBroadening[],
  trialCount: number = 0,
): Promise<{ answer: string; confidence: ConfidenceBucket; confidenceReason: string }> {
  if (papers.length === 0) {
    const broadenedNote = seedBroadenings.length > 0
      ? ` Searches were broadened from "${seedBroadenings[0].from}" through ${seedBroadenings.map(b => `"${b.to}"`).join(' → ')}.`
      : '';
    // If trials matched even though no papers did, point the clinician
    // at the trials sub-section rather than declaring the case a dead end.
    const trialNote = trialCount > 0
      ? ` However, ${trialCount} relevant ClinicalTrials.gov record${trialCount === 1 ? '' : 's'} matched — see the "Active & recent trials" section below for ongoing or recently-completed studies that may inform care.`
      : '';
    return {
      answer: `No directly applicable published evidence was retrieved for **${condition}** with the current case modifiers. ` +
        `Searches across PubMed, OpenAlex, Europe PMC, PEDro, Semantic Scholar, CrossRef, and ClinicalTrials.gov did not return citable abstracts.${broadenedNote}${trialNote} ` +
        `Try editing the interpreted case (above) — adjusting the canonical condition or adding broader synonyms often unblocks the search.`,
      confidence: 'Extrapolated',
      confidenceReason: seedBroadenings.length > 0
        ? `No papers retrieved even after broadening the seed${droppedVariables.length > 0 ? ` and dropping ${droppedVariables.length} modifier(s)` : ''}${trialCount > 0 ? `; ${trialCount} trial(s) available as supplementary signal` : ''}.`
        : `No papers were retrieved from any source${trialCount > 0 ? `; ${trialCount} trial(s) available as supplementary signal` : ''}.`,
    };
  }

  const refsBlock = papers.map(p => {
    const auth = p.authors.length > 0
      ? (p.authors.length > 4 ? `${p.authors.slice(0, 3).join(', ')} et al.` : p.authors.join(', '))
      : 'Unknown';
    const yr = p.year ?? 'n.d.';
    const j = p.journal ? `, ${p.journal}` : '';
    const matched = p.matchedVariables.length > 0 ? ` [matches: ${p.matchedVariables.join(', ')}]` : '';
    return `[${p.citationNumber}] ${auth} (${yr}) ${p.title}${j}.${matched}\nAbstract: ${(p.abstract || '(no abstract)').slice(0, 1500)}`;
  }).join('\n\n');

  const phenotypeBlock = `Interpreted phenotype:
- canonical condition: ${phenotype.canonicalCondition.primary}${phenotype.canonicalCondition.synonyms.length > 0 ? ` (alt: ${phenotype.canonicalCondition.synonyms.join(', ')})` : ''}
- region: ${phenotype.region ?? 'unspecified'}
- laterality (soft): ${phenotype.laterality ?? 'unspecified'}
- mechanism: ${phenotype.mechanism.phrases.length > 0 ? phenotype.mechanism.phrases.join(', ') : 'unspecified'}
- aggravating factors: ${phenotype.aggravatingFactors.phrases.length > 0 ? phenotype.aggravatingFactors.phrases.join(', ') : 'unspecified'}
- pain type: ${phenotype.painType ?? 'unspecified'}`;

  const sys = `You are a senior physiotherapist writing a CASE-AWARE evidence synthesis for ONE specific patient.

Your output is a single, focused answer the clinician can act on TODAY for this patient. Use the supplied papers ONLY — never invent citations.

Hard rules:
1. Inline cite using [N] markers that match the numbered reference list below. Every clinical claim that comes from a paper MUST carry at least one [N]. Multiple sources for the same point: [1][3].
2. If the evidence does NOT directly cover this patient's modifiers, say so explicitly and label the inference as extrapolation. Do not pretend the evidence is stronger than it is.
3. Structure: a brief direct answer for THIS case (3-6 sentences), then a "What changes for this patient" paragraph (2-4 sentences) tying the evidence to the case modifiers, then "Caveats" (1-3 bullets) on what the search did NOT cover, where dropped modifiers reduce certainty, OR where the seed itself had to be broadened.
4. Use markdown. Keep total length under ~500 words. Do not list the references at the end — the UI handles that.
5. Provide a single-bucket confidence: High / Moderate / Low / Extrapolated.
   - High: ≥3 papers directly cover the patient's main modifiers and converge.
   - Moderate: ≥2 papers, partial modifier coverage, mostly consistent.
   - Low: 1-2 papers OR conflicting findings OR seed had to be broadened to find anything.
   - Extrapolated: only condition-level evidence (most/all modifiers dropped + broadest seed) OR very thin abstracts.
6. Provide a 1-2 sentence confidence_reason. If the SEED itself was broadened (not just modifiers dropped), explicitly say so — e.g. "evidence found only after broadening from 'mechanical low back pain' to 'low back pain'".
7. Return a "citation_map": the de-duplicated list of EVERY [N] number you used in the answer. Only use numbers from the supplied references — DO NOT invent numbers. The system will scrub any [N] in your answer that is not in this map.

Return ONLY this JSON:
{ "answer": "<markdown with [N] inline citations>", "citation_map": [1, 3, 4], "confidence": "High|Moderate|Low|Extrapolated", "confidence_reason": "..." }`;

  const seedNote = seedBroadenings.length > 0
    ? `IMPORTANT: To find evidence the seed was BROADENED in this order: ${[seedBroadenings[0].from, ...seedBroadenings.map(b => b.to)].map(s => `"${s}"`).join(' → ')}. Mention this in confidence_reason and Caveats.`
    : `The original canonical seed ("${phenotype.canonicalCondition.primary}") was not broadened — evidence was found at the case-specific phrasing.`;

  const usr = `Patient case condition (clinician's words): ${condition}

${phenotypeBlock}

Case summary the answer must apply to:
"""${caseSummary.slice(0, 4000)}"""

${droppedVariables.length > 0
  ? `IMPORTANT: The following case modifiers had to be dropped from the search to find evidence: ${droppedVariables.join(', ')}. Explicitly flag in the answer how this weakens applicability.`
  : `All case modifiers were retained in the search.`}

${seedNote}

Numbered references (use [N] to cite):
${refsBlock}

Write the synthesis now.`;

  try {
    const r = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });
    const raw = r.choices?.[0]?.message?.content || '{}';
    const parsed = synthesisSchema.parse(JSON.parse(raw));

    const validNumbers = new Set(papers.map(p => p.citationNumber));
    const declaredValid = new Set(parsed.citation_map.filter(n => validNumbers.has(n)));

    const seenInText = new Set<number>();
    const scrubbed = parsed.answer.replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (full, group: string) => {
      const nums = group.split(/\s*,\s*/).map((s: string) => parseInt(s, 10)).filter(Number.isFinite);
      const kept = nums.filter(n => validNumbers.has(n));
      kept.forEach(n => seenInText.add(n));
      if (kept.length === 0) return '';
      return `[${kept.join(',')}]`;
    });

    const droppedFromText = parsed.answer
      .match(/\[(\d+(?:\s*,\s*\d+)*)\]/g)
      ?.flatMap(m => m.slice(1, -1).split(/\s*,\s*/).map(s => parseInt(s, 10)))
      .filter(n => Number.isFinite(n) && !validNumbers.has(n)) ?? [];
    if (droppedFromText.length > 0) {
      console.warn(`[caseResearch] scrubbed ${droppedFromText.length} hallucinated citation marker(s): [${Array.from(new Set(droppedFromText)).join(', ')}]`);
    }
    const declaredButMissingFromText = Array.from(declaredValid).filter(n => !seenInText.has(n));
    if (declaredButMissingFromText.length > 0) {
      console.warn(`[caseResearch] citation_map declared [${declaredButMissingFromText.join(', ')}] but not used inline.`);
    }

    return {
      answer: scrubbed.trim(),
      confidence: parsed.confidence,
      confidenceReason: parsed.confidence_reason,
    };
  } catch (e) {
    console.warn('[caseResearch] synthesis failed, returning fallback:', e);
    const fallback = papers.map(p => `- ${p.title} [${p.citationNumber}]`).join('\n');
    return {
      answer: `Synthesis failed; here are the top retrieved papers for **${condition}**:\n\n${fallback}`,
      confidence: 'Low',
      confidenceReason: 'Synthesis model call failed; raw retrieval list shown instead.',
    };
  }
}

// ---- Research-derived treatment plan (Task #305) ------------------

const planInterventionAISchema = z.object({
  category: z.enum(['exercise', 'manual_therapy', 'electrophysical', 'education_lifestyle']),
  label: z.string().min(1).max(160),
  dose: z.string().min(1).max(240),
  citations: z.array(z.number().int().positive()).max(20),
  extrapolated: z.boolean(),
  rationale: z.string().max(400).optional(),
});
const planAISchema = z.object({
  phases: z.array(z.object({
    name: z.string().min(1).max(80),
    goal: z.string().min(1).max(240),
    duration: z.string().min(1).max(80),
    interventions: z.array(planInterventionAISchema).max(20),
    progression_criteria: z.array(z.object({
      criterion: z.string().min(1).max(240),
      citations: z.array(z.number().int().positive()).max(20),
    })).max(10),
  })).min(1).max(6),
  outcome_measures: z.array(z.object({
    name: z.string().min(1).max(120),
    purpose: z.string().min(1).max(240),
    citations: z.array(z.number().int().positive()).max(20),
  })).max(10),
  red_flags: z.array(z.string().min(1).max(240)).max(15),
  follow_up_cadence: z.string().min(1).max(160),
  confidence: z.enum(['High', 'Moderate', 'Low', 'Extrapolated']),
  confidence_reason: z.string().max(400),
});

export async function synthesizeResearchTreatmentPlan(
  condition: string,
  caseSummary: string,
  papers: RankedPaper[],
  droppedVariables: string[],
  phenotype: SearchablePhenotype,
  seedBroadenings: SeedBroadening[],
  trialCount: number,
  synthesizedAnswer: string,
): Promise<ResearchTreatmentPlan> {
  const generatedAt = new Date().toISOString();

  if (papers.length === 0) {
    const broadenedNote = seedBroadenings.length > 0
      ? ' even after broadening the seed'
      : '';
    const noEvidencePlan: ResearchTreatmentPlan = {
      generatedAt,
      hasEvidence: false,
      noEvidenceReason: `No literature was retrieved for this case${broadenedNote}${trialCount > 0 ? `; ${trialCount} ClinicalTrials.gov record(s) matched but trials are listed separately` : ''}, so a research-derived treatment plan cannot be produced. Edit the interpreted case (broaden the canonical condition or add synonyms) and re-run.`,
      phases: [],
      outcomeMeasures: [],
      redFlags: [],
      followUpCadence: 'Defer until evidence is available.',
      confidence: 'Extrapolated',
      confidenceReason: 'No retrieved literature; plan cannot be evidence-based.',
    };
    // Validate against shared schema before persisting so the server
    // and client never disagree on plan shape.
    return researchTreatmentPlanSchema.parse(noEvidencePlan) as ResearchTreatmentPlan;
  }

  const refsBlock = papers.map(p => {
    const auth = p.authors.length > 0
      ? (p.authors.length > 4 ? `${p.authors.slice(0, 3).join(', ')} et al.` : p.authors.join(', '))
      : 'Unknown';
    const yr = p.year ?? 'n.d.';
    const j = p.journal ? `, ${p.journal}` : '';
    return `[${p.citationNumber}] ${auth} (${yr}) ${p.title}${j}.\nAbstract: ${(p.abstract || '(no abstract)').slice(0, 1500)}`;
  }).join('\n\n');

  const phenotypeBlock = `Interpreted phenotype:
- canonical condition: ${phenotype.canonicalCondition.primary}${phenotype.canonicalCondition.synonyms.length > 0 ? ` (alt: ${phenotype.canonicalCondition.synonyms.join(', ')})` : ''}
- region: ${phenotype.region ?? 'unspecified'}
- mechanism: ${phenotype.mechanism.phrases.length > 0 ? phenotype.mechanism.phrases.join(', ') : 'unspecified'}
- aggravating factors: ${phenotype.aggravatingFactors.phrases.length > 0 ? phenotype.aggravatingFactors.phrases.join(', ') : 'unspecified'}
- pain type: ${phenotype.painType ?? 'unspecified'}`;

  const sys = `You are a senior physiotherapist building a STRUCTURED, EVIDENCE-CITED treatment plan for ONE specific patient. The plan is derived strictly from the supplied numbered references — never invent citations or claims unsupported by them.

The plan must be CONCRETE and DEMONSTRABLE. Generic category labels are forbidden — every intervention must name a specific exercise, manual technique, modality with parameters, or education topic that the clinician can deliver as written, without further translation.

Hard rules:
1. Output 2-4 phases (e.g. acute / subacute / return-to-function / maintenance). Each phase has a short goal sentence and a typical duration drawn from or extrapolated from the evidence.
2. Each phase has interventions grouped across the four categories: "exercise", "manual_therapy", "electrophysical", "education_lifestyle". Provide the categories that the evidence actually supports — do NOT pad empty categories with extrapolated filler.
3. Every intervention has: category, label (≤160 chars), dose, and a "citations" array of [N] numbers from the supplied references. If you cannot cite for a given intervention but it is clinically standard for this presentation, set "extrapolated": true and citations: []. Otherwise extrapolated: false and citations MUST be non-empty.

SPECIFICITY RUBRIC — every "label" MUST name a specific demonstrable exercise/technique/modality with a brief inline cue (positioning, key constraint, key parameter). Generic category nouns are FORBIDDEN as standalone labels. Bad → good rewrites:
  exercise:
    BAD: "Movement control exercises"          GOOD: "Sitting pelvic tilt anterior/posterior — neutral seated, hands on iliac crests"
    BAD: "Core stability training"             GOOD: "Bird-dog — contralateral arm/leg lift, hold 5s, neutral spine"
    BAD: "Strengthening exercises"             GOOD: "Wall squat — back flat against wall, knees over 2nd toe, 90° knee, hold"
    BAD: "Stretching"                          GOOD: "Supine hamstring stretch with strap — knee straight, ankle dorsiflexed, hold 30s"
  manual_therapy:
    BAD: "Joint mobilization for lumbar spine" GOOD: "Lumbar PA mobilization — central, grade III, L4 spinous process"
    BAD: "Soft tissue work"                    GOOD: "Sustained myofascial release — thoracolumbar fascia, prone, 90s/zone"
    BAD: "Manual therapy"                      GOOD: "Mulligan SNAG — C5/6 with active cervical rotation, 6×3 sets"
  electrophysical:
    BAD: "Electrotherapy"                      GOOD: "TENS — 100 Hz, 200 µs pulse, sensory level, 30 min over painful area"
    BAD: "Modalities as needed"                GOOD: "Therapeutic ultrasound — 1 MHz, 1.0 W/cm², continuous, 5 min/zone"
  education_lifestyle:
    BAD: "Education"                           GOOD: "Pain neuroscience education — 1×30 min interactive session covering nociception vs nociplastic pain"
    BAD: "Advice on activity"                  GOOD: "Graded activity plan — 10% weekly increase in walking volume, no symptom flare >2 h"
    BAD: "Postural advice"                     GOOD: "Sit-stand cycling — 30 min sit / 5 min stand, hourly, with chin tuck reminders"

EXPANSION RULE for cited multi-component protocols/programs — when a cited paper describes a NAMED protocol or program (e.g. DMA Clinical Pilates, McKenzie MDT, Mulligan SNAGs, Otago exercise program, Alfredson eccentric heel-drop protocol, GLA:D, SAID-principle running progression, Cuff Link rotator-cuff program), DO NOT collapse it into one umbrella row. Emit each component exercise/technique as its OWN intervention row, all sharing the parent paper's [N] citation, with the parent program named in the "rationale" field. Worked example for cited paper [3] = "DMA Clinical Pilates for chronic LBP":
  { "category": "exercise", "label": "The Hundred — supine, head/shoulders lifted, arms pumping, neutral spine", "dose": "1×100 beats (10 breaths × 10), 3×/week", "citations": [3], "extrapolated": false, "rationale": "Component of DMA Clinical Pilates protocol per [3]" }
  { "category": "exercise", "label": "Single-leg stretch — supine, alternate knee-to-chest with neutral spine", "dose": "2×10/side, 3×/week", "citations": [3], "extrapolated": false, "rationale": "Component of DMA Clinical Pilates protocol per [3]" }
  { "category": "exercise", "label": "Swimming — prone, alternate contralateral arm/leg lift, neutral spine", "dose": "2×20 alternations, 3×/week", "citations": [3], "extrapolated": false, "rationale": "Component of DMA Clinical Pilates protocol per [3]" }

FALLBACK RULE for vaguely-described evidence — when a cited paper genuinely only specifies a CLASS of intervention without listing the actual exercises (e.g. "motor control exercises improved disability"), operationalize it with 2-4 evidence-standard concrete exercises that ARE the canonical implementation of that class. Cite the parent paper [N] on each (extrapolated: false) and note in "rationale" that these are the standard implementation of the cited class. Worked example for cited paper [2] = "motor control exercises in chronic LBP":
  { "category": "exercise", "label": "Sitting pelvic tilt anterior/posterior — neutral seated, hands on iliac crests", "dose": "3×10, 1-2×/day", "citations": [2], "extrapolated": false, "rationale": "Standard motor-control exercise per [2]" }
  { "category": "exercise", "label": "Quadruped rocking — neutral spine, hips back to heels", "dose": "3×10, 1×/day", "citations": [2], "extrapolated": false, "rationale": "Standard motor-control exercise per [2]" }
  { "category": "exercise", "label": "Standing hip hinge with dowel — dowel touching head/T-spine/sacrum throughout", "dose": "3×10, 1-2×/day", "citations": [2], "extrapolated": false, "rationale": "Standard motor-control exercise per [2]" }

DOSE CONTRACT — every "dose" must be concrete and prescribable as written:
  - exercise: sets × reps × hold (or duration) × frequency × intensity (e.g. "3×12 reps × 5s hold, 4-5×/week, 60% 1RM")
  - manual_therapy: technique grade + region/segment + sets/reps + session frequency (e.g. "Grade III × 3×30s, 1-2×/week")
  - electrophysical: modality parameters (frequency / intensity / pulse / duration) + session length + cadence (e.g. "100 Hz, 200 µs, sensory level, 30 min, 1×/day")
  - education_lifestyle: format + duration + cadence (e.g. "1×30 min interactive session + handout, repeated at week 4")
  Vague phrases like "as tolerated" or "as needed" are forbidden unless paired with concrete frequency/cadence.

4. Each phase has 1-4 progression_criteria — measurable thresholds gating the move to the next phase (e.g. "pain ≤3/10 on aggravating movement", "ROM within 10° of contralateral side", "single-leg hop symmetry ≥90%"). Cite [N] where the evidence supports the criterion.
5. Provide 2-6 outcome_measures (recommended PROMs / objective tests) appropriate to the condition; cite where literature supports the choice.
6. Provide 2-6 red_flags — short safety items to escalate (e.g. progressive neurological deficit, unexplained weight loss, night pain unrelieved by rest).
7. Provide a follow_up_cadence string (e.g. "Review at 2 weeks then every 4 weeks").
8. Provide a single-bucket plan-level confidence (High/Moderate/Low/Extrapolated) and a 1-2 sentence confidence_reason. Mirror the same banding logic the prose synthesis uses (papers count + modifier coverage + seed broadening).
9. Citation numbers MUST be drawn ONLY from the supplied references — any other number will be discarded by the system.
10. Be concise and clinically actionable. The clinician will read this in under a minute.

Return ONLY this JSON object:
{
  "phases": [
    {
      "name": "Acute (0-2 weeks)",
      "goal": "...",
      "duration": "0-2 weeks",
      "interventions": [
        { "category": "exercise", "label": "Bird-dog — contralateral arm/leg lift, hold 5s, neutral spine", "dose": "3×10/side × 5s hold, 1×/day", "citations": [1,3], "extrapolated": false, "rationale": "Component of motor-control program per [1]" },
        { "category": "education_lifestyle", "label": "Pain neuroscience education — 1×30 min covering nociception vs nociplastic pain", "dose": "1×30 min in-clinic + handout, week 1", "citations": [], "extrapolated": true, "rationale": "Standard care for persistent musculoskeletal pain" }
      ],
      "progression_criteria": [{ "criterion": "Pain ≤3/10 on aggravating movement for ≥3 consecutive days", "citations": [2] }]
    }
  ],
  "outcome_measures": [{ "name": "Oswestry Disability Index", "purpose": "Track functional disability across phases", "citations": [1] }],
  "red_flags": ["Progressive lower-limb weakness", "Saddle anaesthesia or new bladder/bowel dysfunction"],
  "follow_up_cadence": "Review at 2 weeks then every 4 weeks",
  "confidence": "High|Moderate|Low|Extrapolated",
  "confidence_reason": "..."
}`;

  const usr = `Patient case condition (clinician's words): ${condition}

${phenotypeBlock}

Case summary the plan must apply to:
"""${caseSummary.slice(0, 4000)}"""

${droppedVariables.length > 0
    ? `IMPORTANT: The following case modifiers had to be dropped from the search to find evidence: ${droppedVariables.join(', ')}. Reflect this in your confidence and rationale.`
    : `All case modifiers were retained in the search.`}

The prose synthesis above already describes the case-level reasoning. Use it as additional context but produce the structured plan independently:
"""${synthesizedAnswer.slice(0, 3500)}"""

Numbered references (use [N] to cite — these are the SAME numbers used by the prose synthesis):
${refsBlock}

Build the structured plan now.`;

  try {
    const r = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });
    const raw = r.choices?.[0]?.message?.content || '{}';
    const parsed = planAISchema.parse(JSON.parse(raw));

    const validNumbers = new Set(papers.map(p => p.citationNumber));
    const scrubCitations = (cs: number[]): number[] =>
      Array.from(new Set(cs.filter(n => validNumbers.has(n))));

    // Generic-label blocklist (Task #308). The prompt forbids these,
    // but the model occasionally still emits them — drop the offending
    // rows so the panel never renders vague text the clinician would
    // have to mentally translate. A label is treated as SPECIFIC (and
    // therefore allowed) if it carries any of:
    //   - a colon / em-dash / en-dash followed by ≥8 chars of cue text
    //   - a parenthesized parameter ≥4 chars
    //   - a manual-therapy grade (I-V or 1-5)
    //   - a numeric parameter (Hz, µs, MHz, W/cm², min, sec, reps,
    //     sets, %, °)
    //   - a positioning cue (supine, prone, seated, standing, etc.)
    const GENERIC_LABEL_PATTERNS: RegExp[] = [
      /\b(?:motor|movement)\s+control\s+exercises?\b/i,
      /\bcore\s+stab(?:ility|ilisation|ilization)(?:\s+(?:exercises?|training))?\b/i,
      /\bstab(?:ility|ilisation|ilization)\s+exercises?\b/i,
      /\b(?:general\s+)?strengthening\s+exercises?\b/i,
      /\b(?:general\s+)?stretching(?:\s+exercises?)?\b/i,
      /\baerobic\s+(?:exercises?|conditioning)\b/i,
      /\bjoint\s+mobili[sz]ation\b/i,
      /\bsoft[\s-]tissue\s+(?:work|massage|therapy)\b/i,
      /\bmanual\s+therapy\b/i,
      /\belectrotherapy\b/i,
      /\bmodalit(?:ies|y)(?:\s+as\s+needed)?\b/i,
      /\b(?:patient\s+)?education\b/i,
      /\b(?:lifestyle|postural)\s+(?:advice|education|modification|correction)s?\b/i,
      /\badvice\s+on\s+activit(?:y|ies)\b/i,
    ];
    // STRONG signals indicate the label contains a real technique cue
    // or named parameter — enough to override the generic blocklist.
    // Positioning alone is intentionally NOT a strong signal, because
    // "movement control exercises in standing" is still vague.
    const STRONG_LABEL_SIGNALS: RegExp[] = [
      /[:–—].{8,}/,
      /\([^)]{4,}\)/,
      /\bgrade\s+(?:I{1,4}V?|V|[1-5])\b/i,
      /\b\d+(?:\.\d+)?\s*(?:Hz|kHz|MHz|µs|us|ms|W\/?cm|J\/?cm|mA|min|sec|reps?|sets?|%|°)\b/i,
    ];
    const isGenericLabel = (label: string): boolean => {
      const t = label.trim();
      if (STRONG_LABEL_SIGNALS.some(re => re.test(t))) return false;
      return GENERIC_LABEL_PATTERNS.some(re => re.test(t));
    };

    const phases = parsed.phases.map(ph => {
      const interventions = ph.interventions
        .filter(iv => {
          if (isGenericLabel(iv.label)) {
            console.warn('[caseResearch] dropping vague intervention label:', iv.label);
            return false;
          }
          return true;
        })
        .map(iv => {
        const citations = scrubCitations(iv.citations);
        const extrapolated = iv.extrapolated || citations.length === 0;
        return {
          category: iv.category,
          label: iv.label.trim(),
          dose: iv.dose.trim(),
          citations,
          extrapolated,
          rationale: iv.rationale?.trim() || undefined,
        };
      });
      // Progression criteria don't have an "extrapolated" flag in the
      // shared schema — they're meant to be cited. Drop any that lose
      // all their citations after scrubbing so the panel never shows
      // an uncited "progress when..." claim alongside cited ones.
      const progressionCriteria = ph.progression_criteria
        .map(pc => ({
          criterion: pc.criterion.trim(),
          citations: scrubCitations(pc.citations),
        }))
        .filter(pc => pc.citations.length > 0);
      return {
        name: ph.name.trim(),
        goal: ph.goal.trim(),
        duration: ph.duration.trim(),
        interventions,
        progressionCriteria,
      };
    });

    // Same rule for outcome measures — drop uncited rows so every
    // displayed measure is backed by a real reference.
    const outcomeMeasures = parsed.outcome_measures
      .map(om => ({
        name: om.name.trim(),
        purpose: om.purpose.trim(),
        citations: scrubCitations(om.citations),
      }))
      .filter(om => om.citations.length > 0);

    const finalPlan: ResearchTreatmentPlan = {
      generatedAt,
      hasEvidence: true,
      phases,
      outcomeMeasures,
      redFlags: parsed.red_flags.map(f => f.trim()).filter(Boolean),
      followUpCadence: parsed.follow_up_cadence.trim(),
      confidence: parsed.confidence,
      confidenceReason: parsed.confidence_reason.trim(),
    };
    // Validate against shared schema before returning so the persisted
    // plan stays in lock-step with the type the client renders.
    return researchTreatmentPlanSchema.parse(finalPlan) as ResearchTreatmentPlan;
  } catch (e) {
    console.warn('[caseResearch] research-treatment-plan synthesis failed:', e);
    throw e;
  }
}

// ---- Confidence helper (also used for sanity-checking AI bucket) --

export function computeBaselineConfidence(
  winningTier: number,
  totalTiers: number,
  papers: RankedPaper[],
  seedBroadenings: SeedBroadening[],
): { bucket: ConfidenceBucket; reason: string } {
  const usable = papers.filter(p => p.abstract && p.abstract.length >= 120).length;
  // PEDro and Semantic Scholar both qualify as high-quality sources for
  // this physiotherapy decision-support tool — PEDro because it's
  // domain gold-standard, S2 because its citation count signal aligns
  // with research consensus. CrossRef is excluded because its records
  // are usually metadata-only.
  const goodSources = papers.filter(p =>
    p.source === 'pubmed'
    || p.source === 'europepmc'
    || p.source === 'pedro'
    || p.source === 'semanticscholar'
  ).length;
  if (winningTier === 0 && usable >= 3 && goodSources >= 2) {
    return { bucket: 'High', reason: 'Full case query returned ≥3 abstracts from high-quality sources (PubMed / Europe PMC / PEDro / Semantic Scholar).' };
  }
  if (winningTier <= 1 && usable >= 2 && seedBroadenings.length === 0) {
    return { bucket: 'Moderate', reason: `Tier ${winningTier} retrieval; partial modifier coverage.` };
  }
  if (seedBroadenings.length > 0 && usable >= 1) {
    const last = seedBroadenings[seedBroadenings.length - 1];
    return {
      bucket: 'Low',
      reason: `Evidence found only after broadening seed from "${seedBroadenings[0].from}" to "${last.to}".`,
    };
  }
  if (winningTier < totalTiers - 1 && usable >= 1) {
    return { bucket: 'Low', reason: `Had to drop ${winningTier} modifier(s) before any abstracts came back.` };
  }
  return { bucket: 'Extrapolated', reason: 'Only condition-level evidence available; case modifiers were dropped.' };
}

// ---- Top-level orchestration -------------------------------------

export interface RunCaseResearchOptions {
  /** When supplied, the engine SKIPS the AI phenotype-translation
   *  step and uses this phenotype directly. Used for "Re-run with my
   *  edits". */
  phenotypeOverride?: SearchablePhenotype;
  /** Task #313 — structured case picture from the orchestrator
   *  (top hypothesis, mechanism, region/laterality, chronicity,
   *  irritability, patient factors). When supplied, the engine
   *  prefers the top hypothesis label as the search seed and
   *  prepends the structured fields onto the variable-inference
   *  prompt so retrieval tightens around what the page already
   *  knows. */
  caseContext?: CaseResearchContext;
}

export async function runCaseResearch(
  condition: string,
  caseSummary: string,
  options: RunCaseResearchOptions = {},
): Promise<CaseResearchOutcome> {
  // Task #313: when the orchestrator supplies a top working
  // hypothesis we use its label as the phenotype seed (it's the
  // single most discriminating phrase the page has produced for this
  // case). We still pass the full caseSummary so the AI can pick up
  // modifiers, but the seed phrase is what canonicalCondition will
  // canonicalise from.
  const seedCondition = options.caseContext?.topHypothesis?.label?.trim() || condition;
  const seededSummary = options.caseContext
    ? `${formatCaseContextForPrompt(options.caseContext)}\n\n${caseSummary}`
    : caseSummary;

  // When the clinician supplied an edited phenotype we treat it as
  // AUTHORITATIVE: bypass both AI calls and derive variables directly
  // from the phenotype's own mechanism / aggravator / region / pain
  // type fields. This is what makes "Re-run with my edits" actually
  // re-run the search with the user's edits, not just re-display them.
  const phenotype: SearchablePhenotype = options.phenotypeOverride
    ?? await inferPhenotype(seedCondition, seededSummary);
  const variables: InferredVariable[] = options.phenotypeOverride
    ? variablesFromPhenotype(options.phenotypeOverride)
    : await inferVariables(seedCondition, seededSummary);

  const ladder = buildQueryLadder(phenotype, variables);
  const totalTiers = ladder.length;

  const { queriesRan, papers, trials, droppedVariables, winningTier, seedBroadenings } =
    await retrieveTiered(phenotype, variables);

  const ranked: RankedPaper[] = papers.map((p, i) => ({
    citationNumber: i + 1,
    source: p.source,
    externalId: p.externalId,
    title: p.title,
    authors: p.authors,
    year: p.year,
    journal: p.journal,
    abstract: p.abstract,
    doi: p.doi,
    url: p.url,
    openAccess: p.openAccess,
    matchedVariables: p.matchedVariables,
    mergedFromSources: p.mergedFromSources,
    pedroScore: p.pedroScore ?? null,
    citationCount: p.citationCount ?? null,
  }));

  // Dedupe trials by NCT, keep up to 5 (UI cap), preserve API order so
  // the most relevant ClinicalTrials.gov hits stay first.
  const seenNct = new Set<string>();
  const rankedTrials: RankedTrial[] = [];
  for (const t of trials) {
    const meta: TrialMetadata | null = t.trialMetadata ?? null;
    const nct = (meta?.nct || t.externalId || '').trim();
    if (!nct || seenNct.has(nct)) continue;
    seenNct.add(nct);
    rankedTrials.push({
      source: 'clinicaltrials',
      nct,
      title: t.title,
      abstract: t.abstract,
      status: meta?.status ?? 'UNKNOWN',
      phase: meta?.phase ?? null,
      intervention: meta?.intervention ?? null,
      primaryOutcome: meta?.primaryOutcome ?? null,
      url: t.url,
      sponsor: t.authors[0] ?? null,
    });
    if (rankedTrials.length >= 5) break;
  }

  const synth = await synthesizeCaseAnswer(
    condition, caseSummary, ranked, droppedVariables, phenotype, seedBroadenings, rankedTrials.length,
  );
  const baseline = computeBaselineConfidence(winningTier, totalTiers, ranked, seedBroadenings);

  const order: ConfidenceBucket[] = ['Extrapolated', 'Low', 'Moderate', 'High'];
  const finalBucket = order.indexOf(synth.confidence) <= order.indexOf(baseline.bucket)
    ? synth.confidence
    : baseline.bucket;
  const finalReason = finalBucket === synth.confidence
    ? synth.confidenceReason
    : `${baseline.reason} (AI suggested ${synth.confidence}: ${synth.confidenceReason})`;

  let researchTreatmentPlan: ResearchTreatmentPlan | null = null;
  try {
    researchTreatmentPlan = await synthesizeResearchTreatmentPlan(
      condition, caseSummary, ranked, droppedVariables, phenotype, seedBroadenings, rankedTrials.length, synth.answer,
    );
  } catch (e) {
    console.warn('[caseResearch] research-treatment-plan generation failed, persisting null plan:', e);
    researchTreatmentPlan = null;
  }

  return {
    phenotype,
    inferredVariables: variables,
    queriesRan,
    retrievedPapers: ranked,
    retrievedTrials: rankedTrials,
    synthesizedAnswer: synth.answer,
    confidence: finalBucket,
    confidenceReason: finalReason,
    droppedVariables,
    seedBroadenings,
    researchTreatmentPlan,
  };
}
