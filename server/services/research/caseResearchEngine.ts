import { z } from 'zod';
import { openai } from '../../openai';
import { searchPubMed } from './pubmedAdapter';
import { searchOpenAlex } from './openAlexAdapter';
import { searchEuropePmc } from './europePmcAdapter';
import { normalizeDoi, normalizeTitle, type AdapterResult, type NormalizedPaper } from './types';

// ---- Public types -------------------------------------------------

export interface InferredVariable {
  label: string;
  value: string;
  importance: number;     // 1 = most important, drops last
  queryTerms: string[];   // canonical search terms for this variable
  rationale: string;
}

export interface QueryTierRecord {
  tier: number;
  label: string;
  query: string;
  droppedVariables: string[];
  sources: Record<string, { count: number; ok: boolean; error?: string }>;
  paperCount: number;
}

export interface RankedPaper {
  citationNumber: number;
  source: 'pubmed' | 'openalex' | 'europepmc';
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
}

export type ConfidenceBucket = 'High' | 'Moderate' | 'Low' | 'Extrapolated';

export interface CaseResearchOutcome {
  inferredVariables: InferredVariable[];
  queriesRan: QueryTierRecord[];
  retrievedPapers: RankedPaper[];
  synthesizedAnswer: string;
  confidence: ConfidenceBucket;
  confidenceReason: string;
  droppedVariables: string[];
}

// ---- Variable inference ------------------------------------------

const inferenceSchema = z.object({
  variables: z.array(z.object({
    label: z.string().min(1).max(60),
    value: z.string().min(1).max(200),
    importance: z.number().int().min(1).max(10),
    queryTerms: z.array(z.string().min(1).max(80)).min(1).max(5),
    rationale: z.string().min(1).max(280),
  })).min(1).max(8),
});

/** Ask the model to extract the patient-discriminating variables that
 *  should drive an evidence search. We ask it to ignore the diagnosis
 *  itself (that becomes the broadest fallback tier) and focus on the
 *  modifiers that change which evidence is actually applicable. */
export async function inferVariables(condition: string, caseSummary: string): Promise<InferredVariable[]> {
  const sys = `You are a senior physiotherapist preparing an evidence search for a SPECIFIC patient.

The clinician already knows the working diagnosis. Your job is to extract the 3-7 PATIENT-DISCRIMINATING variables from the case that would meaningfully change which evidence is applicable (e.g. "diabetic" for frozen shoulder, "post-fluoroquinolone" for Achilles, "sub-acute (8 weeks)" for low back pain, "elite runner" for ITBS).

Rules:
- Do NOT include the diagnosis itself as a variable.
- Each variable must be something a literature search could be FILTERED by — i.e. there should be a plausible MeSH/keyword expression.
- For each variable provide 1-5 short canonical "queryTerms" (the phrases a search engine should AND in to find papers that cover this modifier). Use real biomedical phrasing (e.g. "diabetes mellitus" not "sugar problem"; "subacute" not "8 weeks ago").
- "importance" is 1-10; higher = more central to the case (will be kept longest as the tiers relax).
- "rationale" is one short sentence explaining why this variable changes the evidence.

Return ONLY this JSON:
{ "variables": [ { "label": "...", "value": "...", "importance": 8, "queryTerms": ["..."], "rationale": "..." } ] }`;

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

  // Sort by importance descending so the planner can drop the lowest first.
  return parsed.variables
    .map(v => ({ ...v, queryTerms: v.queryTerms.map(t => t.trim()).filter(Boolean) }))
    .filter(v => v.queryTerms.length > 0)
    .sort((a, b) => b.importance - a.importance);
}

// ---- Query ladder ------------------------------------------------

export interface QueryTier {
  tier: number;
  label: string;
  variables: InferredVariable[];   // currently active
  dropped: InferredVariable[];     // dropped to reach this tier
  query: string;
}

function quoteIfMultiword(term: string): string {
  const t = term.trim();
  if (!t) return '';
  return /\s/.test(t) ? `"${t.replace(/"/g, '')}"` : t;
}

/** OR together the candidate phrasings for one variable, AND the
 *  variables together at the top level. Empty list -> empty string. */
function compileQuery(condition: string, vars: InferredVariable[]): string {
  const parts: string[] = [];
  if (condition.trim()) parts.push(`(${quoteIfMultiword(condition.trim())})`);
  for (const v of vars) {
    const ors = v.queryTerms.map(quoteIfMultiword).filter(Boolean);
    if (ors.length > 0) parts.push(`(${ors.join(' OR ')})`);
  }
  return parts.join(' AND ');
}

/** Build the tiered query ladder from most-specific (all variables) to
 *  broadest (condition only). Variables with the LOWEST importance are
 *  dropped first. */
export function buildQueryLadder(condition: string, vars: InferredVariable[]): QueryTier[] {
  const tiers: QueryTier[] = [];
  // Active list starts as all vars, sorted ascending by importance so
  // we can pop() the lowest-importance one each tier.
  const active = [...vars].sort((a, b) => a.importance - b.importance);
  const dropped: InferredVariable[] = [];

  // Tier 0 = full set
  tiers.push({
    tier: 0,
    label: vars.length > 0 ? `Full case (${vars.length} variable${vars.length === 1 ? '' : 's'})` : 'Condition only',
    variables: [...active].sort((a, b) => b.importance - a.importance),
    dropped: [],
    query: compileQuery(condition, active),
  });

  // Each subsequent tier drops one more variable (lowest importance first)
  while (active.length > 0) {
    const removed = active.shift()!; // lowest importance
    dropped.push(removed);
    tiers.push({
      tier: tiers.length,
      label: active.length > 0
        ? `Dropped "${dropped.map(d => d.label).join(', ')}" (${active.length} variable${active.length === 1 ? '' : 's'} left)`
        : 'Condition only',
      variables: [...active].sort((a, b) => b.importance - a.importance),
      dropped: [...dropped],
      query: compileQuery(condition, active),
    });
  }

  // Edge case: no variables at all — we still produced tier 0 above.
  return tiers;
}

// ---- Retrieval + dedupe + ranking --------------------------------

const SOURCE_PRIORITY: Record<NormalizedPaper['source'], number> = {
  // PubMed first (best metadata + abstract), Europe PMC second (often
  // includes preprints + open access), OpenAlex third (broadest but
  // metadata-only abstracts via inverted index).
  pubmed: 3,
  europepmc: 2,
  openalex: 1,
};

interface MergedPaper extends NormalizedPaper {
  matchedVariables: string[];
  rankScore: number;
}

function dedupeAndMerge(results: AdapterResult[], variables: InferredVariable[]): MergedPaper[] {
  const byKey = new Map<string, MergedPaper>();
  const currentYear = new Date().getFullYear();

  for (const r of results) {
    if (!r.ok) continue;
    for (const p of r.papers) {
      const doi = normalizeDoi(p.doi);
      const titleKey = normalizeTitle(p.title);
      const key = doi ? `doi:${doi}` : `t:${titleKey}`;
      if (!key || (key === 't:' && !doi)) continue;

      // Score: variable coverage (most important), abstract present,
      // recency, source quality.
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
      const score = coverageScore + abstractScore + recencyScore + sourceScore + oaScore;

      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { ...p, matchedVariables: matched, rankScore: score });
      } else {
        // Prefer the higher-priority source's metadata, but merge
        // matched-variable sets and bump the score.
        const better = SOURCE_PRIORITY[p.source] > SOURCE_PRIORITY[existing.source] ? p : existing;
        const mergedMatched = Array.from(new Set([...existing.matchedVariables, ...matched]));
        byKey.set(key, {
          ...better,
          // Prefer the longer abstract regardless of source.
          abstract: (p.abstract.length > existing.abstract.length ? p.abstract : existing.abstract),
          matchedVariables: mergedMatched,
          rankScore: Math.max(existing.rankScore, score) + 1, // small bonus for cross-source confirmation
        });
      }
    }
  }

  return Array.from(byKey.values()).sort((a, b) => b.rankScore - a.rankScore);
}

// ---- Tier runner -------------------------------------------------

const PER_SOURCE_LIMIT = 8;
const TARGET_USABLE = 6;          // stop once we have this many decent abstracts
const MAX_FINAL_PAPERS = 10;      // hard cap on what we hand to the synthesizer

interface RunOutput {
  queriesRan: QueryTierRecord[];
  papers: MergedPaper[];
  droppedVariables: string[];
  winningTier: number;
}

async function runTier(tier: QueryTier, variables: InferredVariable[]): Promise<{ record: QueryTierRecord; merged: MergedPaper[]; results: AdapterResult[] }> {
  const [pm, oa, ep] = await Promise.all([
    searchPubMed(tier.query, { limit: PER_SOURCE_LIMIT }),
    searchOpenAlex(tier.query, { limit: PER_SOURCE_LIMIT }),
    searchEuropePmc(tier.query, { limit: PER_SOURCE_LIMIT }),
  ]);
  const merged = dedupeAndMerge([pm, oa, ep], variables);
  const record: QueryTierRecord = {
    tier: tier.tier,
    label: tier.label,
    query: tier.query,
    droppedVariables: tier.dropped.map(d => d.label),
    sources: {
      pubmed: { count: pm.papers.length, ok: pm.ok, ...(pm.error ? { error: pm.error } : {}) },
      openalex: { count: oa.papers.length, ok: oa.ok, ...(oa.error ? { error: oa.error } : {}) },
      europepmc: { count: ep.papers.length, ok: ep.ok, ...(ep.error ? { error: ep.error } : {}) },
    },
    paperCount: merged.length,
  };
  return { record, merged, results: [pm, oa, ep] };
}

export async function retrieveTiered(condition: string, variables: InferredVariable[]): Promise<RunOutput> {
  const ladder = buildQueryLadder(condition, variables);
  const queriesRan: QueryTierRecord[] = [];
  let bestMerged: MergedPaper[] = [];
  let bestTier = 0;
  let bestDropped: string[] = [];

  for (const tier of ladder) {
    if (!tier.query) continue;
    const { record, merged } = await runTier(tier, variables);
    queriesRan.push(record);

    // Count "usable" = has an abstract long enough for a model to reason over.
    const usable = merged.filter(p => p.abstract && p.abstract.length >= 120);
    if (usable.length >= TARGET_USABLE || tier.variables.length === 0) {
      bestMerged = merged;
      bestTier = tier.tier;
      bestDropped = tier.dropped.map(d => d.label);
      break;
    }
    // Keep the latest as a fallback in case we exhaust the ladder.
    if (merged.length > bestMerged.length) {
      bestMerged = merged;
      bestTier = tier.tier;
      bestDropped = tier.dropped.map(d => d.label);
    }
  }

  return {
    queriesRan,
    papers: bestMerged.slice(0, MAX_FINAL_PAPERS),
    droppedVariables: bestDropped,
    winningTier: bestTier,
  };
}

// ---- Synthesis ----------------------------------------------------

const synthesisSchema = z.object({
  answer: z.string().min(1).max(8000),
  confidence: z.enum(['High', 'Moderate', 'Low', 'Extrapolated']),
  confidence_reason: z.string().max(400),
});

export async function synthesizeCaseAnswer(
  condition: string,
  caseSummary: string,
  papers: RankedPaper[],
  droppedVariables: string[],
): Promise<{ answer: string; confidence: ConfidenceBucket; confidenceReason: string }> {
  if (papers.length === 0) {
    return {
      answer: `No directly applicable evidence was retrieved for **${condition}** with the current case modifiers. ` +
        `Searches across PubMed, OpenAlex, and Europe PMC did not return citable abstracts. ` +
        `Consider broadening the diagnosis label or re-running once more case context (mechanism, severity, comorbidities) is added.`,
      confidence: 'Extrapolated',
      confidenceReason: 'No papers were retrieved from any source.',
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

  const sys = `You are a senior physiotherapist writing a CASE-AWARE evidence synthesis for ONE specific patient.

Your output is a single, focused answer the clinician can act on TODAY for this patient. Use the supplied papers ONLY — never invent citations.

Hard rules:
1. Inline cite using [N] markers that match the numbered reference list below. Every clinical claim that comes from a paper MUST carry at least one [N]. Multiple sources for the same point: [1][3].
2. If the evidence does NOT directly cover this patient's modifiers, say so explicitly and label the inference as extrapolation. Do not pretend the evidence is stronger than it is.
3. Structure: a brief direct answer for THIS case (3-6 sentences), then a "What changes for this patient" paragraph (2-4 sentences) tying the evidence to the case modifiers, then "Caveats" (1-3 bullets) on what the search did NOT cover or where dropped modifiers reduce certainty.
4. Use markdown. Keep total length under ~500 words. Do not list the references at the end — the UI handles that.
5. Provide a single-bucket confidence: High / Moderate / Low / Extrapolated.
   - High: ≥3 papers directly cover the patient's main modifiers and converge.
   - Moderate: ≥2 papers, partial modifier coverage, mostly consistent.
   - Low: 1-2 papers OR conflicting findings.
   - Extrapolated: only condition-level evidence (most/all modifiers dropped) OR very thin abstracts.
6. Provide a 1-2 sentence confidence_reason explaining the bucket.

Return ONLY this JSON:
{ "answer": "<markdown with [N] inline citations>", "confidence": "High|Moderate|Low|Extrapolated", "confidence_reason": "..." }`;

  const usr = `Patient case condition: ${condition}

Case summary the answer must apply to:
"""${caseSummary.slice(0, 4000)}"""

${droppedVariables.length > 0
  ? `IMPORTANT: The following case modifiers had to be dropped from the search to find evidence: ${droppedVariables.join(', ')}. Explicitly flag in the answer how this weakens applicability.`
  : `All case modifiers were retained in the search.`}

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
    return {
      answer: parsed.answer.trim(),
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

// ---- Confidence helper (also used for sanity-checking AI bucket) --

export function computeBaselineConfidence(
  winningTier: number,
  totalTiers: number,
  papers: RankedPaper[],
): { bucket: ConfidenceBucket; reason: string } {
  const usable = papers.filter(p => p.abstract && p.abstract.length >= 120).length;
  const goodSources = papers.filter(p => p.source === 'pubmed' || p.source === 'europepmc').length;
  if (winningTier === 0 && usable >= 3 && goodSources >= 2) {
    return { bucket: 'High', reason: 'Full case query returned ≥3 abstracts from PubMed/Europe PMC.' };
  }
  if (winningTier <= 1 && usable >= 2) {
    return { bucket: 'Moderate', reason: `Tier ${winningTier} retrieval; partial modifier coverage.` };
  }
  if (winningTier < totalTiers - 1 && usable >= 1) {
    return { bucket: 'Low', reason: `Had to drop ${winningTier} modifier(s) before any abstracts came back.` };
  }
  return { bucket: 'Extrapolated', reason: 'Only condition-level evidence available; case modifiers were dropped.' };
}

// ---- Top-level orchestration -------------------------------------

export async function runCaseResearch(condition: string, caseSummary: string): Promise<CaseResearchOutcome> {
  const variables = await inferVariables(condition, caseSummary);
  const ladder = buildQueryLadder(condition, variables);
  const totalTiers = ladder.length;

  const { queriesRan, papers, droppedVariables, winningTier } = await retrieveTiered(condition, variables);

  // Number papers in the order they'll be cited so [N] markers match.
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
  }));

  const synth = await synthesizeCaseAnswer(condition, caseSummary, ranked, droppedVariables);
  const baseline = computeBaselineConfidence(winningTier, totalTiers, ranked);

  // Reconcile AI vs heuristic confidence: take the LOWER of the two so
  // we never over-promise (the AI tends to be optimistic on thin
  // evidence). Reason combines both rationales.
  const order: ConfidenceBucket[] = ['Extrapolated', 'Low', 'Moderate', 'High'];
  const finalBucket = order.indexOf(synth.confidence) <= order.indexOf(baseline.bucket)
    ? synth.confidence
    : baseline.bucket;
  const finalReason = finalBucket === synth.confidence
    ? synth.confidenceReason
    : `${baseline.reason} (AI suggested ${synth.confidence}: ${synth.confidenceReason})`;

  return {
    inferredVariables: variables,
    queriesRan,
    retrievedPapers: ranked,
    synthesizedAnswer: synth.answer,
    confidence: finalBucket,
    confidenceReason: finalReason,
    droppedVariables,
  };
}
