import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  Loader2, FlaskConical, RefreshCcw, AlertTriangle, ChevronDown, ChevronUp,
  ExternalLink, BookOpen, ListFilter, Search, Info, ShieldCheck, GripHorizontal,
  Pencil, X, Plus, Microscope, Sparkles, Activity, Award, Quote,
} from "lucide-react";
import type { CaseResearchContext, CaseResearchSynthesis, SearchablePhenotype } from "@shared/schema";

/** Imperative handle exposed to parent orchestrators (Task #313).
 *  The Voice Autopilot uses this to programmatically (re-)trigger the
 *  case-research engine after the reasoning chain finalises a top
 *  hypothesis, without requiring the clinician to click the button. */
export interface CaseResearchPanelHandle {
  /** Fire a fresh search using the current props. `refresh=true` bypasses the cache. */
  trigger: (refresh?: boolean) => void;
  /** True while a request is currently in flight. */
  isRunning: () => boolean;
}

/** localStorage key for the user's preferred body height (px). */
const BODY_HEIGHT_STORAGE_KEY = "caseResearchPanel.bodyHeightPx";
const BODY_MIN_HEIGHT_PX = 180;
const BODY_DEFAULT_VH = 0.68;
/** Reserve some viewport for header/chrome so the body can't grow off-screen. */
const BODY_MAX_HEIGHT_RESERVE_PX = 160;

function clampBodyHeight(px: number, viewportH: number): number {
  const max = Math.max(BODY_MIN_HEIGHT_PX, viewportH - BODY_MAX_HEIGHT_RESERVE_PX);
  return Math.min(max, Math.max(BODY_MIN_HEIGHT_PX, Math.round(px)));
}

function readInitialBodyHeight(): number {
  if (typeof window === "undefined") return 480;
  const stored = window.localStorage.getItem(BODY_HEIGHT_STORAGE_KEY);
  const parsed = stored ? Number(stored) : NaN;
  const fallback = Math.round(window.innerHeight * BODY_DEFAULT_VH);
  const initial = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  return clampBodyHeight(initial, window.innerHeight);
}

/** Inputs for the panel — the caller is responsible for keeping
 *  these stable (memoized) so we don't auto-trigger spurious refetches.
 *  The contentHash is what drives "stale" detection: the panel knows
 *  the cached synthesis is for a different case version when the
 *  hash differs from `contentHash`. */
export interface CaseResearchPanelProps {
  /** Stable identifier for this case (e.g. user-scoped slug). */
  caseId: string | null;
  /** Free-text condition / diagnosis label. */
  condition: string | null;
  /** Canonical case summary the engine reasons over. */
  caseSummary: string;
  /** Deterministic content hash (FNV-style or similar) of the inputs. */
  contentHash: string | null;
  /** Optional structured case picture (Task #313). When supplied the
   *  engine prefers the top hypothesis label as its search seed and
   *  uses the structured fields to seed variable inference. */
  caseContext?: CaseResearchContext;
  /** Hide entirely until the parent has a usable case to search for. */
  visible?: boolean;
  className?: string;
}

const CONFIDENCE_TONE: Record<string, string> = {
  High:         "border-emerald-400/50 bg-emerald-500/15 text-emerald-200",
  Moderate:     "border-amber-400/50 bg-amber-500/15 text-amber-200",
  Low:          "border-orange-400/50 bg-orange-500/15 text-orange-200",
  Extrapolated: "border-rose-400/50 bg-rose-500/15 text-rose-200",
};

const SOURCE_LABEL: Record<string, string> = {
  pubmed: "PubMed",
  openalex: "OpenAlex",
  europepmc: "Europe PMC",
  pedro: "PEDro",
  semanticscholar: "Semantic Scholar",
  crossref: "CrossRef",
  clinicaltrials: "ClinicalTrials.gov",
};

/** Build a sensible default phenotype for cached rows that pre-date
 *  Task #286 (and therefore lack the phenotype field). The value is
 *  good enough to display + edit; on the next re-run the engine will
 *  replace it with a real translated phenotype. */
function deriveFallbackPhenotype(condition: string | null | undefined): SearchablePhenotype {
  const cleaned = (condition || "")
    .replace(/[",.()\[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return {
    canonicalCondition: { primary: cleaned || "this case", synonyms: [] },
    region: null,
    regionSoft: false,
    laterality: "unspecified",
    mechanism: { phrases: [], soft: false },
    aggravatingFactors: { phrases: [], soft: true },
    painType: null,
    painTypeSoft: true,
  };
}

const LATERALITY_LABEL: Record<string, string> = {
  left: "Left",
  right: "Right",
  bilateral: "Bilateral",
  unspecified: "Unspecified",
};

/** Tiny chip-list editor — used for synonyms, mechanism phrases, and
 *  aggravating factors in the phenotype editor. Stays inline (no
 *  modal) and keeps state in the parent. */
function ChipListEditor({
  values, onChange, placeholder, dataTestid, max = 8,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  dataTestid: string;
  max?: number;
}) {
  const [draft, setDraft] = useState("");
  const commit = useCallback(() => {
    const v = draft.trim();
    if (!v || values.length >= max) { setDraft(""); return; }
    if (values.some(x => x.toLowerCase() === v.toLowerCase())) { setDraft(""); return; }
    onChange([...values, v]);
    setDraft("");
  }, [draft, values, onChange, max]);
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1" data-testid={`${dataTestid}-chips`}>
        {values.length === 0 && (
          <span className="text-[10.5px] text-slate-500 italic">none</span>
        )}
        {values.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className="inline-flex items-center gap-1 rounded border border-violet-500/40 bg-violet-500/10 text-violet-100 px-1.5 py-[1px] text-[10.5px]"
            data-testid={`${dataTestid}-chip-${i}`}
          >
            <span>{v}</span>
            <button
              type="button"
              className="text-violet-300 hover:text-rose-200"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              aria-label={`Remove ${v}`}
              data-testid={`${dataTestid}-remove-${i}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
      </div>
      {values.length < max && (
        <div className="flex items-center gap-1">
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); commit(); }
            }}
            placeholder={placeholder}
            className="h-6 text-[11px] bg-slate-950/60 border-slate-700/60 text-slate-100"
            data-testid={`${dataTestid}-input`}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-violet-200 hover:text-violet-100"
            onClick={commit}
            disabled={!draft.trim()}
            aria-label="Add"
            data-testid={`${dataTestid}-add`}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

/** "Interpreted your case as…" block + inline phenotype editor.
 *  Read-only mode shows a compact summary + an Edit button. Edit
 *  mode swaps in chip lists and a primary-condition input, plus
 *  Cancel / "Re-run with my edits" actions. */
function PhenotypeBlock({
  phenotype, editing, onStartEdit, onCancelEdit, onChange, onApply, isRunning,
}: {
  phenotype: SearchablePhenotype;
  editing: SearchablePhenotype | null;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onChange: (next: SearchablePhenotype) => void;
  onApply: (edits: SearchablePhenotype) => void;
  isRunning: boolean;
}) {
  const isEditing = editing !== null;
  const draft = editing ?? phenotype;
  const canApply =
    isEditing &&
    !!editing &&
    editing.canonicalCondition.primary.trim().length > 0 &&
    !isRunning;

  const synonymsView = phenotype.canonicalCondition.synonyms;

  return (
    <div className="rounded-md border border-violet-500/30 bg-violet-950/20 px-2.5 py-2" data-testid="phenotype-block">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-100">
          <Microscope className="h-3 w-3 text-violet-300" />
          Interpreted your case as…
        </div>
        {!isEditing ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px] text-violet-200 hover:text-violet-50"
            onClick={onStartEdit}
            data-testid="button-phenotype-edit"
          >
            <Pencil className="h-3 w-3 mr-1" />
            Edit interpretation
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px] text-slate-300 hover:text-slate-100"
              onClick={onCancelEdit}
              disabled={isRunning}
              data-testid="button-phenotype-cancel"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-6 px-2 text-[11px] bg-violet-600 hover:bg-violet-500 text-white"
              onClick={() => editing && onApply(editing)}
              disabled={!canApply}
              data-testid="button-phenotype-apply"
            >
              {isRunning ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Re-running…</>
              ) : (
                <><RefreshCcw className="h-3 w-3 mr-1" />Re-run with my edits</>
              )}
            </Button>
          </div>
        )}
      </div>

      {!isEditing ? (
        <dl className="text-[11px] grid grid-cols-[110px_1fr] gap-x-2 gap-y-0.5 text-slate-200">
          <dt className="text-slate-400">Canonical</dt>
          <dd className="font-semibold text-slate-50" data-testid="phenotype-canonical">
            {phenotype.canonicalCondition.primary}
          </dd>
          {synonymsView.length > 0 && (
            <>
              <dt className="text-slate-400">Synonyms</dt>
              <dd className="text-slate-200" data-testid="phenotype-synonyms">{synonymsView.join(' · ')}</dd>
            </>
          )}
          {phenotype.region && (
            <>
              <dt className="text-slate-400">Region</dt>
              <dd className="text-slate-200">{phenotype.region}</dd>
            </>
          )}
          <dt className="text-slate-400">Laterality</dt>
          <dd className="text-slate-300" data-testid="phenotype-laterality">
            {LATERALITY_LABEL[phenotype.laterality ?? 'unspecified']}{' '}
            <span className="text-[10px] text-slate-500">(soft — never AND'd into queries)</span>
          </dd>
          {phenotype.mechanism.phrases.length > 0 && (
            <>
              <dt className="text-slate-400">Mechanism</dt>
              <dd className="text-slate-200" data-testid="phenotype-mechanism">
                {phenotype.mechanism.phrases.join(' · ')}
                {phenotype.mechanism.soft && <span className="ml-1 text-[10px] text-slate-500">(soft)</span>}
              </dd>
            </>
          )}
          {phenotype.aggravatingFactors.phrases.length > 0 && (
            <>
              <dt className="text-slate-400">Aggravators</dt>
              <dd className="text-slate-200" data-testid="phenotype-aggravators">
                {phenotype.aggravatingFactors.phrases.join(' · ')}
                {phenotype.aggravatingFactors.soft && <span className="ml-1 text-[10px] text-slate-500">(soft)</span>}
              </dd>
            </>
          )}
          {phenotype.painType && (
            <>
              <dt className="text-slate-400">Pain type</dt>
              <dd className="text-slate-200">{phenotype.painType}</dd>
            </>
          )}
        </dl>
      ) : (
        <div className="space-y-2" data-testid="phenotype-editor">
          <div className="space-y-1">
            <label className="text-[10.5px] uppercase tracking-wide text-slate-400">Canonical condition</label>
            <Input
              value={draft.canonicalCondition.primary}
              onChange={e => onChange({
                ...draft,
                canonicalCondition: { ...draft.canonicalCondition, primary: e.target.value },
              })}
              placeholder="e.g. non-specific low back pain"
              className="h-7 text-[11px] bg-slate-950/60 border-slate-700/60 text-slate-100"
              data-testid="input-phenotype-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10.5px] uppercase tracking-wide text-slate-400">Synonyms (broader → broadest)</label>
            <ChipListEditor
              values={draft.canonicalCondition.synonyms}
              onChange={next => onChange({
                ...draft,
                canonicalCondition: { ...draft.canonicalCondition, synonyms: next },
              })}
              placeholder="e.g. mechanical low back pain"
              dataTestid="chips-phenotype-synonyms"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10.5px] uppercase tracking-wide text-slate-400">Region</label>
                <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.regionSoft === true}
                    onChange={e => onChange({ ...draft, regionSoft: e.target.checked })}
                    className="h-3 w-3 accent-violet-500"
                    data-testid="checkbox-phenotype-region-soft"
                  />
                  Soft
                </label>
              </div>
              <Input
                value={draft.region ?? ""}
                onChange={e => onChange({ ...draft, region: e.target.value || null })}
                placeholder="e.g. lumbar spine"
                className="h-7 text-[11px] bg-slate-950/60 border-slate-700/60 text-slate-100"
                data-testid="input-phenotype-region"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10.5px] uppercase tracking-wide text-slate-400">Laterality (soft)</label>
              <select
                value={draft.laterality ?? "unspecified"}
                onChange={e => onChange({ ...draft, laterality: e.target.value as SearchablePhenotype['laterality'] })}
                className="h-7 w-full text-[11px] bg-slate-950/60 border border-slate-700/60 text-slate-100 rounded px-1"
                data-testid="select-phenotype-laterality"
              >
                <option value="unspecified">Unspecified</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="bilateral">Bilateral</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10.5px] uppercase tracking-wide text-slate-400">Mechanism phrases</label>
              <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.mechanism.soft}
                  onChange={e => onChange({ ...draft, mechanism: { ...draft.mechanism, soft: e.target.checked } })}
                  className="h-3 w-3 accent-violet-500"
                  data-testid="checkbox-phenotype-mechanism-soft"
                />
                Soft (drop first)
              </label>
            </div>
            <ChipListEditor
              values={draft.mechanism.phrases}
              onChange={next => onChange({ ...draft, mechanism: { ...draft.mechanism, phrases: next } })}
              placeholder="e.g. lumbar flexion"
              dataTestid="chips-phenotype-mechanism"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10.5px] uppercase tracking-wide text-slate-400">Aggravating factors</label>
              <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.aggravatingFactors.soft}
                  onChange={e => onChange({ ...draft, aggravatingFactors: { ...draft.aggravatingFactors, soft: e.target.checked } })}
                  className="h-3 w-3 accent-violet-500"
                  data-testid="checkbox-phenotype-aggravators-soft"
                />
                Soft (drop first)
              </label>
            </div>
            <ChipListEditor
              values={draft.aggravatingFactors.phrases}
              onChange={next => onChange({ ...draft, aggravatingFactors: { ...draft.aggravatingFactors, phrases: next } })}
              placeholder="e.g. stair climbing"
              dataTestid="chips-phenotype-aggravators"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10.5px] uppercase tracking-wide text-slate-400">Pain type</label>
              <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.painTypeSoft !== false}
                  onChange={e => onChange({ ...draft, painTypeSoft: e.target.checked })}
                  className="h-3 w-3 accent-violet-500"
                  data-testid="checkbox-phenotype-paintype-soft"
                />
                Soft (drop first)
              </label>
            </div>
            <Input
              value={draft.painType ?? ""}
              onChange={e => onChange({ ...draft, painType: e.target.value || null })}
              placeholder="e.g. mechanical, neuropathic"
              className="h-7 text-[11px] bg-slate-950/60 border-slate-700/60 text-slate-100"
              data-testid="input-phenotype-paintype"
            />
          </div>
          <p className="text-[10px] text-slate-500 leading-snug">
            "Re-run with my edits" submits this exact phenotype to the search engine — the AI translation step is bypassed and your wording is used directly.
          </p>
        </div>
      )}
    </div>
  );
}

/** Render an array of citation numbers as clickable chips alongside
 *  the structured plan rows. Mirrors the [N] linkifier inside
 *  `renderAnswer` but works from a number[] (not inline markdown).
 *  Used by the Research-derived treatment plan section. */
function renderCitationChips(
  nums: number[],
  papers: CaseResearchSynthesis['retrievedPapers'],
  onCiteClick: (n: number, openExternal: boolean, paperUrl: string | null) => void,
): JSX.Element | null {
  if (!nums || nums.length === 0) return null;
  const byNumber = new Map<number, typeof papers[number]>();
  for (const p of papers) byNumber.set(p.citationNumber, p);
  return (
    <span className="inline-flex items-baseline gap-0.5 ml-1 align-baseline">
      {nums.map((n, i) => {
        const paper = byNumber.get(n);
        return (
          <button
            key={`plan-cite-${n}-${i}`}
            type="button"
            className={cn(
              "inline-flex items-center justify-center text-[10px] font-semibold rounded px-1 mx-px h-4 min-w-[16px] transition-colors align-baseline",
              paper
                ? "bg-violet-500/25 text-violet-100 border border-violet-400/40 hover:bg-violet-500/40 cursor-pointer"
                : "bg-slate-700/60 text-slate-300 border border-slate-600/60 cursor-default",
            )}
            title={paper
              ? `${paper.title}${paper.year ? ` (${paper.year})` : ''} — click to jump to citation, ⌘/Ctrl-click to open source`
              : `Reference ${n} not found`}
            data-testid={`plan-citation-link-${n}`}
            onClick={(e) => {
              if (!paper) return;
              const openExternal = e.metaKey || e.ctrlKey || e.shiftKey;
              onCiteClick(n, openExternal, paper.url ?? null);
            }}
          >
            {n}
          </button>
        );
      })}
    </span>
  );
}

const PLAN_CATEGORY_LABELS: Record<string, string> = {
  exercise: 'Exercise',
  manual_therapy: 'Manual therapy',
  electrophysical: 'Electrophysical',
  education_lifestyle: 'Education & lifestyle',
};

const PLAN_CATEGORY_TONES: Record<string, string> = {
  exercise: 'border-emerald-500/40 bg-emerald-950/30 text-emerald-100',
  manual_therapy: 'border-sky-500/40 bg-sky-950/30 text-sky-100',
  electrophysical: 'border-amber-500/40 bg-amber-950/30 text-amber-100',
  education_lifestyle: 'border-violet-500/40 bg-violet-950/30 text-violet-100',
};

/** Render the synthesized markdown answer with clickable [N] citation
 *  chips. We do a minimal markdown pass — bold, italic, headers,
 *  bullets, paragraphs — to avoid pulling in a heavy markdown lib.
 *  Chips scroll to the citation list (with a brief flash) by default;
 *  modifier-click (Cmd/Ctrl/Shift) opens the source in a new tab. */
function renderAnswer(
  answer: string,
  papers: CaseResearchSynthesis['retrievedPapers'],
  onCiteClick: (n: number, openExternal: boolean, paperUrl: string | null) => void,
) {
  const byNumber = new Map<number, typeof papers[number]>();
  for (const p of papers) byNumber.set(p.citationNumber, p);

  // Linkify [1], [2], [1,3], [1][2]
  const linkifyCitations = (s: string): (string | JSX.Element)[] => {
    const out: (string | JSX.Element)[] = [];
    const re = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let key = 0;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) out.push(s.slice(last, m.index));
      const nums = m[1].split(/\s*,\s*/).map(n => parseInt(n, 10)).filter(n => Number.isFinite(n));
      out.push(
        <span key={`cite-${key++}-${m.index}`} className="inline-flex items-baseline gap-0.5">
          {nums.map((n, i) => {
            const paper = byNumber.get(n);
            return (
              <button
                key={`${n}-${i}`}
                type="button"
                className={cn(
                  "inline-flex items-center justify-center text-[10px] font-semibold rounded px-1 mx-px h-4 min-w-[16px] transition-colors align-baseline",
                  paper
                    ? "bg-violet-500/25 text-violet-100 border border-violet-400/40 hover:bg-violet-500/40 cursor-pointer"
                    : "bg-slate-700/60 text-slate-300 border border-slate-600/60 cursor-default",
                )}
                title={paper
                  ? `${paper.title}${paper.year ? ` (${paper.year})` : ''} — click to jump to citation, ⌘/Ctrl-click to open source`
                  : `Reference ${n} not found`}
                data-testid={`citation-link-${n}`}
                onClick={(e) => {
                  if (!paper) return;
                  const openExternal = e.metaKey || e.ctrlKey || e.shiftKey;
                  onCiteClick(n, openExternal, paper.url ?? null);
                }}
              >
                {n}
              </button>
            );
          })}
        </span>
      );
      last = m.index + m[0].length;
    }
    if (last < s.length) out.push(s.slice(last));
    return out;
  };

  const inline = (s: string): (string | JSX.Element)[] => {
    // Bold then italic — naive but covers our synthesis style.
    let parts: (string | JSX.Element)[] = linkifyCitations(s);
    const boldify = (xs: (string | JSX.Element)[]) => {
      const out: (string | JSX.Element)[] = [];
      let key = 0;
      for (const node of xs) {
        if (typeof node !== 'string') { out.push(node); continue; }
        const re = /\*\*(.+?)\*\*/g;
        let last = 0; let m: RegExpExecArray | null;
        while ((m = re.exec(node)) !== null) {
          if (m.index > last) out.push(node.slice(last, m.index));
          out.push(<strong key={`b-${key++}-${m.index}`} className="font-semibold text-slate-50">{m[1]}</strong>);
          last = m.index + m[0].length;
        }
        if (last < node.length) out.push(node.slice(last));
      }
      return out;
    };
    parts = boldify(parts);
    return parts;
  };

  const lines = answer.split(/\r?\n/);
  const blocks: JSX.Element[] = [];
  let bulletBuf: string[] = [];
  const flushBullets = () => {
    if (bulletBuf.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc pl-4 space-y-0.5 text-[12px] text-slate-200">
        {bulletBuf.map((b, i) => <li key={i}>{inline(b)}</li>)}
      </ul>
    );
    bulletBuf = [];
  };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flushBullets(); continue; }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      bulletBuf.push(line.replace(/^[-*]\s+/, ''));
      continue;
    }
    flushBullets();
    if (line.startsWith('### ')) {
      blocks.push(<h4 key={`h-${blocks.length}`} className="text-[12px] font-semibold uppercase tracking-wide text-violet-200 mt-2">{inline(line.slice(4))}</h4>);
    } else if (line.startsWith('## ')) {
      blocks.push(<h3 key={`h-${blocks.length}`} className="text-[13px] font-semibold text-slate-50 mt-2">{inline(line.slice(3))}</h3>);
    } else {
      blocks.push(<p key={`p-${blocks.length}`} className="text-[12px] leading-relaxed text-slate-200">{inline(line)}</p>);
    }
  }
  flushBullets();
  return blocks;
}

export const CaseResearchPanel = forwardRef<CaseResearchPanelHandle, CaseResearchPanelProps>(function CaseResearchPanel({
  caseId, condition, caseSummary, contentHash, caseContext,
  visible = true, className,
}, ref) {
  const [collapsed, setCollapsed] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showHowSearched, setShowHowSearched] = useState(false);
  const { user } = useAuth();
  // Persist collapse state of the research-derived plan section per
  // (clinician × case). Mirrors the convention used by ActiveCapacities
  // (`activeMovement:<userId>:panel:<caseId>:open`).
  const planCollapseStorageKey = `caseResearchPlan:${user?.id ?? 'anon'}:panel:${caseId ?? 'none'}:open`;
  const [showResearchPlan, setShowResearchPlan] = useState<boolean>(true);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(planCollapseStorageKey);
      if (raw === null) {
        setShowResearchPlan(true);
      } else {
        const parsed = JSON.parse(raw);
        setShowResearchPlan(typeof parsed === 'boolean' ? parsed : true);
      }
    } catch {
      setShowResearchPlan(true);
    }
  }, [planCollapseStorageKey]);
  const toggleResearchPlan = useCallback(() => {
    setShowResearchPlan(prev => {
      const next = !prev;
      try { window.localStorage.setItem(planCollapseStorageKey, JSON.stringify(next)); } catch { /* localStorage may be unavailable */ }
      return next;
    });
  }, [planCollapseStorageKey]);
  // Tracks which tier row in "How we searched" has its per-source
  // queries panel expanded. Only one open at a time keeps the panel
  // compact.
  const [expandedTier, setExpandedTier] = useState<number | null>(null);
  const [highlightedCitation, setHighlightedCitation] = useState<number | null>(null);
  // Phenotype editor (inline, no modal). `editingPhenotype` is the
  // working copy being mutated by the chip editors; null means "not
  // editing". Re-runs use this draft, then close on success.
  const [editingPhenotype, setEditingPhenotype] = useState<SearchablePhenotype | null>(null);
  // User-controlled body height (px). Hydrated from localStorage on first
  // render so the chosen size persists across reloads. The browser's
  // native CSS `resize-y` handle on the body element does the actual
  // dragging; a ResizeObserver mirrors the post-drag size back into
  // state and persists it (debounced) so we don't thrash localStorage.
  const [bodyHeightPx, setBodyHeightPx] = useState<number>(readInitialBodyHeight);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || typeof window === "undefined" || typeof ResizeObserver === "undefined") return;
    let lastH = el.getBoundingClientRect().height;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      const h = el.getBoundingClientRect().height;
      if (Math.abs(h - lastH) < 1) return;
      lastH = h;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const clamped = clampBodyHeight(h, window.innerHeight);
        setBodyHeightPx(prev => (prev === clamped ? prev : clamped));
        try { window.localStorage.setItem(BODY_HEIGHT_STORAGE_KEY, String(clamped)); } catch { /* ignore quota */ }
      }, 200);
    });
    ro.observe(el);
    return () => { if (timer) clearTimeout(timer); ro.disconnect(); };
  }, [collapsed]);
  const citationRefs = useRef<Map<number, HTMLLIElement>>(new Map());
  const setCitationRef = useCallback((n: number) => (el: HTMLLIElement | null) => {
    if (el) citationRefs.current.set(n, el);
    else citationRefs.current.delete(n);
  }, []);
  const handleCitationClick = useCallback((n: number, openExternal: boolean, paperUrl: string | null) => {
    if (openExternal && paperUrl) {
      window.open(paperUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const el = citationRefs.current.get(n);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedCitation(n);
      window.setTimeout(() => setHighlightedCitation(curr => (curr === n ? null : curr)), 1600);
    }
  }, []);
  const { toast } = useToast();
  const qc = useQueryClient();

  const enabled = !!caseId;
  const queryKey = useMemo(() => ['/api/case-research', caseId] as const, [caseId]);

  // Cache read — 404 turns into null so the UI can show the empty state.
  const { data: cached, isFetching: isLoadingCache } = useQuery<CaseResearchSynthesis | null>({
    queryKey,
    queryFn: async () => {
      try {
        return await apiRequest(`/api/case-research/${encodeURIComponent(caseId!)}`, 'GET');
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg.startsWith('404') || msg.toLowerCase().includes('no synthesis cached')) return null;
        throw e;
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const runMutation = useMutation({
    mutationFn: async (opts: { refresh: boolean; phenotypeOverride?: SearchablePhenotype }) => {
      if (!caseId || !condition || !contentHash) throw new Error("Case is not ready for search");
      return await apiRequest(`/api/case-research/${encodeURIComponent(caseId)}`, 'POST', {
        caseSummary,
        condition,
        contentHash,
        refresh: opts.refresh,
        phenotypeOverride: opts.phenotypeOverride,
        // Task #313 — fold the structured case picture so the engine
        // can prefer the top hypothesis as its search seed.
        caseContext,
      }) as CaseResearchSynthesis & { cached?: boolean };
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKey, data);
      // Re-run with edits succeeded — close the editor.
      setEditingPhenotype(null);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Search failed';
      toast({ title: 'Case research failed', description: msg, variant: 'destructive' });
    },
  });

  const isStale = useMemo(() => {
    if (!cached || !contentHash) return false;
    return cached.contentHash !== contentHash;
  }, [cached, contentHash]);

  const trigger = useCallback((refresh: boolean) => {
    runMutation.mutate({ refresh });
  }, [runMutation]);

  // Task #313 — orchestrator-facing imperative API. Lets the Voice
  // Autopilot fire the engine programmatically once reasoning has
  // produced a stable top hypothesis (folded into `caseContext`).
  useImperativeHandle(ref, () => ({
    trigger: (refresh = false) => {
      if (!caseId || !condition || !contentHash) return;
      if (runMutation.isPending) return;
      runMutation.mutate({ refresh });
    },
    isRunning: () => runMutation.isPending,
  }), [caseId, condition, contentHash, runMutation]);

  const triggerWithEdits = useCallback((edits: SearchablePhenotype) => {
    runMutation.mutate({ refresh: true, phenotypeOverride: edits });
  }, [runMutation]);

  // Display phenotype = either the cached one (preferred) or a derived
  // fallback for old rows. Null when there's no cached row at all.
  const displayPhenotype: SearchablePhenotype | null = useMemo(() => {
    if (!cached) return null;
    return (cached.phenotype as SearchablePhenotype | null) ?? deriveFallbackPhenotype(cached.condition || condition);
  }, [cached, condition]);

  const startEditing = useCallback(() => {
    if (!displayPhenotype) return;
    setEditingPhenotype(JSON.parse(JSON.stringify(displayPhenotype)) as SearchablePhenotype);
  }, [displayPhenotype]);
  const cancelEditing = useCallback(() => setEditingPhenotype(null), []);

  // When the cache is fresh-for-this-case and we have data, do nothing.
  // We never auto-fire the engine — the clinician explicitly clicks to
  // avoid surprise external API hits + AI cost.
  useEffect(() => {
    if (!enabled) return;
    // refetch the cache when caseId changes
    void qc.invalidateQueries({ queryKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  if (!visible) return null;

  const hasResult = !!cached;
  const isRunning = runMutation.isPending;
  const showCacheHit = hasResult && !isStale;

  return (
    <Card
      className={cn(
        "w-[420px] max-w-[calc(100vw-32px)] bg-slate-950/85 border-slate-700/70 backdrop-blur shadow-xl text-slate-100",
        className,
      )}
      data-testid="card-case-research"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <FlaskConical className="h-3.5 w-3.5 text-violet-300 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-200 truncate">
            Case-Aware Research
          </span>
          {showCacheHit && cached && (
            <Badge
              variant="outline"
              className={cn("h-5 text-[10px] capitalize", CONFIDENCE_TONE[cached.confidence] ?? CONFIDENCE_TONE.Low)}
              data-testid="badge-case-research-confidence"
            >
              {cached.confidence}
            </Badge>
          )}
          {isStale && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="h-5 text-[10px] gap-1 border-amber-400/50 text-amber-200 bg-amber-500/15" data-testid="badge-case-research-stale">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Stale
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                  The case has changed since this evidence was synthesized. Click "Re-run" to fetch fresh, case-aware research.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-slate-400 hover:text-slate-100"
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? "Expand case research" : "Collapse case research"}
          data-testid="button-case-research-toggle"
        >
          {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {!collapsed && (
        <div className="relative group/case-research-body">
          <div
            ref={bodyRef}
            className="px-3 py-3 space-y-3 overflow-y-auto resize-y"
            style={{
              height: `${bodyHeightPx}px`,
              minHeight: `${BODY_MIN_HEIGHT_PX}px`,
              maxHeight: `calc(100vh - ${BODY_MAX_HEIGHT_RESERVE_PX}px)`,
            }}
            data-testid="case-research-body"
          >
          {!enabled && (
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Submit a clinical prediction above and PhysioGPT will synthesize patient-specific research from PubMed, OpenAlex, Europe PMC, PEDro, Semantic Scholar, CrossRef, and ClinicalTrials.gov for this exact case.
            </p>
          )}

          {enabled && !hasResult && !isRunning && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Find evidence tailored to <span className="text-slate-200 font-medium">{condition || 'this case'}</span> — the AI translates the case into canonical biomedical phrasing, expands each modifier with synonyms, and broadens the seed (e.g. "mechanical low back pain" → "low back pain") before dropping modifiers that actually matter.
              </p>
              <Button
                type="button"
                size="sm"
                className="h-7 text-[11px] bg-violet-600 hover:bg-violet-500 text-white"
                disabled={!condition || !contentHash || isLoadingCache}
                onClick={() => trigger(false)}
                data-testid="button-case-research-find"
              >
                <Search className="h-3 w-3 mr-1" />
                Find research for this case
              </Button>
            </div>
          )}

          {isRunning && (
            <div className="flex items-center gap-2 text-[11px] text-slate-300" data-testid="status-case-research-loading">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-300" />
              Inferring discriminating variables, querying PubMed / OpenAlex / Europe PMC / PEDro / Semantic Scholar / CrossRef / ClinicalTrials.gov, synthesizing…
            </div>
          )}

          {hasResult && cached && (
            <div className="space-y-3">
              {/* "Interpreted your case as…" — appears at the very top
                  so the clinician can sanity-check the search before
                  reading the answer. */}
              {displayPhenotype && (
                <PhenotypeBlock
                  phenotype={displayPhenotype}
                  editing={editingPhenotype}
                  onStartEdit={startEditing}
                  onCancelEdit={cancelEditing}
                  onChange={setEditingPhenotype}
                  onApply={triggerWithEdits}
                  isRunning={isRunning}
                />
              )}

              {/* Seed broadenings audit chip — the engine will set
                  this when it had to swap "mechanical low back pain"
                  → "low back pain" etc. to find evidence. */}
              {(cached.seedBroadenings ?? []).length > 0 && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-100 px-2 py-1.5 text-[11px] leading-snug flex items-start gap-1.5" data-testid="banner-case-research-seed-broadenings">
                  <Sparkles className="h-3 w-3 mt-[1px] shrink-0" />
                  <span>
                    Seed broadened to find evidence:{' '}
                    {(cached.seedBroadenings ?? []).map((b, i) => (
                      <span key={i} className="font-semibold">
                        {i === 0 ? `"${b.from}"` : ''} → "{b.to}"
                      </span>
                    ))}
                    .
                  </span>
                </div>
              )}

              {/* Dedicated no-evidence empty state — only fire when
                  *both* literature and trials channels came back empty.
                  Trial-only hits should still feel like a useful result,
                  not a "no evidence" failure. */}
              {cached.retrievedPapers.length === 0 && (cached.retrievedTrials ?? []).length === 0 && (
                <div
                  className="rounded-md border border-rose-500/40 bg-rose-950/30 text-rose-100 px-2.5 py-2 text-[11px] leading-snug flex items-start gap-2"
                  data-testid="banner-case-research-no-evidence"
                >
                  <Info className="h-3.5 w-3.5 mt-[1px] shrink-0" />
                  <span>
                    <span className="font-semibold">No evidence found.</span>{' '}
                    All {cached.queriesRan.length} query tier{cached.queriesRan.length === 1 ? '' : 's'} returned zero usable papers or trials across PubMed, OpenAlex, Europe PMC, PEDro, Semantic Scholar, CrossRef, and ClinicalTrials.gov
                    {(cached.seedBroadenings ?? []).length > 0
                      ? ', even after broadening the seed'
                      : ''}
                    {cached.droppedVariables.length > 0
                      ? ` and dropping ${cached.droppedVariables.length} modifier${cached.droppedVariables.length === 1 ? '' : 's'}`
                      : ''}
                    . Try <button type="button" className="underline text-rose-200 hover:text-rose-100" onClick={startEditing}>editing the interpreted case</button> above (broaden the canonical condition or add synonyms), then re-run.
                  </span>
                </div>
              )}
              {/* Trial-only hit (no papers, but trials present): friendlier
                  copy that surfaces the trials section as the result. */}
              {cached.retrievedPapers.length === 0 && (cached.retrievedTrials ?? []).length > 0 && (
                <div
                  className="rounded-md border border-cyan-500/40 bg-cyan-950/30 text-cyan-100 px-2.5 py-2 text-[11px] leading-snug flex items-start gap-2"
                  data-testid="banner-case-research-trials-only"
                >
                  <Info className="h-3.5 w-3.5 mt-[1px] shrink-0" />
                  <span>
                    <span className="font-semibold">No published abstracts, but trials matched.</span>{' '}
                    See the Active &amp; recent trials section below for {(cached.retrievedTrials ?? []).length} relevant ClinicalTrials.gov record{(cached.retrievedTrials ?? []).length === 1 ? '' : 's'}.
                  </span>
                </div>
              )}

              {/* Synthesized answer */}
              <div className="space-y-2" data-testid="text-case-research-answer">
                {renderAnswer(cached.synthesizedAnswer, cached.retrievedPapers, handleCitationClick)}
              </div>

              {/* Confidence reason */}
              {cached.confidenceReason && (
                <div className={cn(
                  "rounded-md border px-2 py-1.5 text-[11px] leading-snug flex items-start gap-1.5",
                  CONFIDENCE_TONE[cached.confidence] ?? CONFIDENCE_TONE.Low,
                )}>
                  <ShieldCheck className="h-3 w-3 mt-[1px] shrink-0" />
                  <span><span className="font-semibold">{cached.confidence} confidence:</span> {cached.confidenceReason}</span>
                </div>
              )}

              {/* Dropped variables banner */}
              {cached.droppedVariables.length > 0 && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-100 px-2 py-1.5 text-[11px] leading-snug flex items-start gap-1.5" data-testid="banner-case-research-dropped">
                  <Info className="h-3 w-3 mt-[1px] shrink-0" />
                  <span>
                    To find evidence we had to drop these case modifiers from the search:{' '}
                    <span className="font-semibold">{cached.droppedVariables.join(', ')}</span>. Inferences for those aspects are extrapolated.
                  </span>
                </div>
              )}

              {/* Research-derived treatment plan (Task #305).
                  Independent of the Treatment Plan box / Plan Cart /
                  AI Treatment Orchestrator — this plan is read-only,
                  evidence-cited, and regenerated on every re-run.
                  When `researchTreatmentPlan` is null (plan generation
                  failed, or the row pre-dates this feature) we hide
                  the section entirely; the no-literature stub instead
                  comes through as a non-null plan with hasEvidence:false. */}
              {cached.researchTreatmentPlan && (
                <div
                  className="rounded-md border border-violet-700/50 bg-violet-950/30"
                  data-testid="section-research-treatment-plan"
                >
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-2.5 py-2 text-[12px] font-semibold text-violet-100 hover:text-white"
                    onClick={toggleResearchPlan}
                    data-testid="button-toggle-research-plan"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-violet-300" />
                      Research-derived treatment plan
                      <span
                        className={cn(
                          "ml-2 inline-flex items-center gap-1 text-[10px] font-medium rounded px-1.5 py-0.5 border",
                          CONFIDENCE_TONE[cached.researchTreatmentPlan.confidence] ?? CONFIDENCE_TONE.Low,
                        )}
                        title={cached.researchTreatmentPlan.confidenceReason}
                      >
                        {cached.researchTreatmentPlan.confidence}
                      </span>
                    </span>
                    {showResearchPlan ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {showResearchPlan && (
                    <div className="px-2.5 pb-2.5 space-y-2.5">
                      <div className="text-[10.5px] text-violet-200/80 italic leading-snug">
                        Read-only, derived from this case's retrieved literature. Regenerated each time you re-run the search. Separate from the Treatment Plan box and Plan Cart.
                      </div>

                      {/* No-evidence state */}
                      {!cached.researchTreatmentPlan.hasEvidence && (
                        <div
                          className="rounded-md border border-rose-500/40 bg-rose-950/30 text-rose-100 px-2 py-1.5 text-[11px] leading-snug flex items-start gap-1.5"
                          data-testid="banner-research-plan-no-evidence"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 mt-[1px] shrink-0" />
                          <span>{cached.researchTreatmentPlan.noEvidenceReason || 'No literature retrieved — no evidence-based plan generated.'}</span>
                        </div>
                      )}

                      {/* Structured plan body — only when we actually
                          have evidence-based content. In the no-evidence
                          state above we render a short notice instead. */}
                      {cached.researchTreatmentPlan.hasEvidence && (
                        <>
                      {/* Phases */}
                      {cached.researchTreatmentPlan.phases.length > 0 && (
                        <div className="space-y-2" data-testid="list-research-plan-phases">
                          {cached.researchTreatmentPlan.phases.map((phase, pi) => (
                            <div
                              key={`phase-${pi}`}
                              className="rounded-md border border-slate-700/60 bg-slate-950/50"
                              data-testid={`research-plan-phase-${pi}`}
                            >
                              <div className="px-2 py-1.5 border-b border-slate-700/50 flex flex-wrap items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-100">
                                  <span className="text-violet-300">Phase {pi + 1}</span>
                                  <span className="text-slate-300">·</span>
                                  <span>{phase.name}</span>
                                </div>
                                <span className="text-[10.5px] text-slate-400">{phase.duration}</span>
                              </div>
                              <div className="px-2 py-1.5 space-y-1.5">
                                <div className="text-[11px] text-slate-200 leading-snug">
                                  <span className="text-slate-400 font-medium">Goal: </span>{phase.goal}
                                </div>

                                {/* Interventions */}
                                {phase.interventions.length > 0 && (
                                  <ul className="space-y-1" data-testid={`research-plan-phase-${pi}-interventions`}>
                                    {phase.interventions.map((iv, ii) => (
                                      <li
                                        key={`iv-${ii}`}
                                        className={cn(
                                          "rounded border px-2 py-1 text-[11px] leading-snug",
                                          PLAN_CATEGORY_TONES[iv.category] ?? "border-slate-700/50 bg-slate-950/40 text-slate-200",
                                        )}
                                      >
                                        <div className="flex flex-wrap items-baseline gap-1.5">
                                          <span className="text-[9.5px] uppercase tracking-wide font-semibold opacity-80">
                                            {PLAN_CATEGORY_LABELS[iv.category] ?? iv.category}
                                          </span>
                                          <span className="font-semibold">{iv.label}</span>
                                          {renderCitationChips(iv.citations, cached.retrievedPapers, handleCitationClick)}
                                          {iv.extrapolated && (
                                            <span
                                              className="text-[9.5px] uppercase tracking-wide font-semibold rounded px-1 py-0.5 border border-rose-400/50 bg-rose-500/15 text-rose-200"
                                              title="No direct citation — included as standard care for this presentation."
                                            >
                                              Extrapolated
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10.5px] mt-0.5 opacity-90">
                                          <span className="opacity-75 font-medium">Dose: </span>{iv.dose}
                                        </div>
                                        {iv.rationale && (
                                          <div className="text-[10.5px] mt-0.5 opacity-75 italic">
                                            {iv.rationale}
                                          </div>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                )}

                                {/* Progression criteria */}
                                {phase.progressionCriteria.length > 0 && (
                                  <div className="pt-1 border-t border-slate-800/60">
                                    <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-0.5">
                                      Progress to next phase when
                                    </div>
                                    <ul className="space-y-0.5" data-testid={`research-plan-phase-${pi}-progression`}>
                                      {phase.progressionCriteria.map((pc, ci) => (
                                        <li key={`pc-${ci}`} className="text-[11px] text-slate-200 leading-snug flex items-baseline gap-1">
                                          <span className="text-violet-400 mt-0.5">▸</span>
                                          <span>
                                            {pc.criterion}
                                            {renderCitationChips(pc.citations, cached.retrievedPapers, handleCitationClick)}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Outcome measures */}
                      {cached.researchTreatmentPlan.outcomeMeasures.length > 0 && (
                        <div className="rounded-md border border-slate-700/60 bg-slate-950/50 px-2 py-1.5" data-testid="list-research-plan-outcome-measures">
                          <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-1 flex items-center gap-1">
                            <Activity className="h-3 w-3 text-violet-300" /> Recommended outcome measures
                          </div>
                          <ul className="space-y-0.5">
                            {cached.researchTreatmentPlan.outcomeMeasures.map((om, oi) => (
                              <li key={`om-${oi}`} className="text-[11px] text-slate-200 leading-snug">
                                <span className="font-semibold">{om.name}</span>
                                <span className="text-slate-400"> — {om.purpose}</span>
                                {renderCitationChips(om.citations, cached.retrievedPapers, handleCitationClick)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Red flags */}
                      {cached.researchTreatmentPlan.redFlags.length > 0 && (
                        <div className="rounded-md border border-rose-700/50 bg-rose-950/30 px-2 py-1.5" data-testid="list-research-plan-red-flags">
                          <div className="text-[10px] uppercase tracking-wide font-semibold text-rose-200 mb-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Red flags — escalate / refer
                          </div>
                          <ul className="space-y-0.5">
                            {cached.researchTreatmentPlan.redFlags.map((rf, ri) => (
                              <li key={`rf-${ri}`} className="text-[11px] text-rose-100 leading-snug flex items-baseline gap-1">
                                <span className="text-rose-300 mt-0.5">•</span>
                                <span>{rf}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Follow-up cadence + plan confidence reason */}
                      <div className="flex flex-wrap items-stretch gap-1.5">
                        <div
                          className="flex-1 min-w-[180px] rounded-md border border-slate-700/60 bg-slate-950/50 px-2 py-1.5 text-[11px] text-slate-200"
                          data-testid="text-research-plan-follow-up"
                        >
                          <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-0.5">
                            Follow-up cadence
                          </div>
                          {cached.researchTreatmentPlan.followUpCadence}
                        </div>
                        <div
                          className={cn(
                            "flex-1 min-w-[180px] rounded-md border px-2 py-1.5 text-[11px] leading-snug",
                            CONFIDENCE_TONE[cached.researchTreatmentPlan.confidence] ?? CONFIDENCE_TONE.Low,
                          )}
                          data-testid="text-research-plan-confidence"
                        >
                          <div className="text-[10px] uppercase tracking-wide font-semibold opacity-80 mb-0.5 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Plan confidence
                          </div>
                          <span className="font-semibold">{cached.researchTreatmentPlan.confidence}: </span>
                          {cached.researchTreatmentPlan.confidenceReason}
                        </div>
                      </div>

                      <div className="text-[9.5px] text-slate-500 text-right">
                        Generated {new Date(cached.researchTreatmentPlan.generatedAt).toLocaleString()}
                      </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Why we searched this way — single-line case-context summary so the
                  clinician can see at a glance which seed (top hypothesis + region/
                  laterality + chronicity + key patient factors) drove this search. */}
              {caseContext && (caseContext.topHypothesis || caseContext.region || caseContext.chronicity) && (
                <div
                  className="rounded-md border border-violet-700/40 bg-violet-950/30 px-2 py-1.5 text-[10.5px] leading-snug text-violet-100"
                  data-testid="case-research-why-summary"
                >
                  <span className="font-semibold text-violet-200">Why we searched this way: </span>
                  {[
                    caseContext.topHypothesis && `seed "${caseContext.topHypothesis}"`,
                    caseContext.region && `region ${caseContext.region}${caseContext.laterality ? ` (${caseContext.laterality})` : ''}`,
                    caseContext.chronicity && `chronicity ${caseContext.chronicity}`,
                    caseContext.patientFactors && [
                      caseContext.patientFactors.age != null ? `age ${caseContext.patientFactors.age}` : null,
                      caseContext.patientFactors.activityLevel ? caseContext.patientFactors.activityLevel : null,
                    ].filter(Boolean).join(', '),
                  ].filter(Boolean).join(' · ')}
                </div>
              )}

              {/* Variables used */}
              <div className="rounded-md border border-slate-700/60 bg-slate-900/60">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-medium text-slate-200 hover:text-violet-100"
                  onClick={() => setShowVariables(v => !v)}
                  data-testid="button-toggle-variables"
                >
                  <span className="flex items-center gap-1.5">
                    <ListFilter className="h-3 w-3 text-violet-300" />
                    Variables used ({cached.inferredVariables.length})
                  </span>
                  {showVariables ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showVariables && (
                  <ul className="px-2 pb-2 space-y-1" data-testid="list-case-research-variables">
                    {cached.inferredVariables.map((v, i) => {
                      const dropped = cached.droppedVariables.includes(v.label);
                      return (
                        <li key={i} className={cn(
                          "rounded border px-2 py-1.5 text-[11px] leading-snug",
                          dropped ? "border-rose-700/40 bg-rose-950/30 text-rose-200" : "border-slate-700/50 bg-slate-950/40 text-slate-200",
                        )}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">
                              {v.label}: <span className="font-normal text-slate-300">{v.value}</span>
                            </span>
                            <span className="text-[10px] text-slate-500 shrink-0">w {v.importance}</span>
                          </div>
                          <div className="text-[10.5px] text-slate-400 italic">{v.rationale}</div>
                          {dropped && (
                            <div className="text-[10px] text-rose-300 mt-0.5">Dropped to find evidence</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* How we searched */}
              <div className="rounded-md border border-slate-700/60 bg-slate-900/60">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-medium text-slate-200 hover:text-violet-100"
                  onClick={() => setShowHowSearched(v => !v)}
                  data-testid="button-toggle-how-searched"
                >
                  <span className="flex items-center gap-1.5">
                    <Search className="h-3 w-3 text-violet-300" />
                    How we searched ({cached.queriesRan.length} tier{cached.queriesRan.length === 1 ? '' : 's'})
                  </span>
                  {showHowSearched ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showHowSearched && (
                  <ol className="px-2 pb-2 space-y-1.5" data-testid="list-case-research-tiers">
                    {cached.queriesRan.map((t, i) => {
                      const isWinning = i === cached.queriesRan.length - 1;
                      const isBroaden = t.kind === 'broaden-seed';
                      const isExpanded = expandedTier === i;
                      // Per-source queries — only show distinct ones
                      // (PubMed often differs from OpenAlex via [tiab]).
                      const sourceQueries: Array<[string, string | undefined]> = Object.entries(t.sources)
                        .map(([s, info]) => [s, info.query] as [string, string | undefined]);
                      const distinctSourceQueries = sourceQueries.filter(([, q]) => q && q !== t.query);
                      return (
                        <li
                          key={i}
                          className={cn(
                            "rounded border px-2 py-1.5 text-[10.5px] leading-snug",
                            isWinning
                              ? "border-emerald-500/40 bg-emerald-950/20"
                              : isBroaden
                                ? "border-amber-500/40 bg-amber-950/20"
                                : "border-slate-700/50 bg-slate-950/40",
                          )}
                          data-testid={`tier-row-${i}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-200 font-semibold">
                              Tier {t.tier} — {t.label}
                            </span>
                            <span className="text-[10px] text-slate-500 shrink-0">{t.paperCount} hits</span>
                          </div>
                          <code className="block text-[10px] text-violet-200 break-all my-1">{t.query}</code>
                          <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-400">
                            {Object.entries(t.sources).map(([s, info]) => (
                              <span
                                key={s}
                                className={cn(
                                  "px-1 rounded border",
                                  info.ok ? "border-slate-600/60 bg-slate-800/60 text-slate-300" : "border-rose-600/40 bg-rose-950/30 text-rose-200",
                                )}
                                title={info.error || `${info.count} from ${SOURCE_LABEL[s] ?? s}`}
                              >
                                {SOURCE_LABEL[s] ?? s}: {info.ok ? info.count : 'fail'}
                              </span>
                            ))}
                            {/* Toggle: show per-source query strings.
                                Only render the toggle when there's
                                actually something to reveal (i.e. at
                                least one source serializes the query
                                differently from the default bag). */}
                            {distinctSourceQueries.length > 0 && (
                              <button
                                type="button"
                                className="ml-auto text-[10px] text-violet-300 hover:text-violet-100 underline-offset-2 hover:underline"
                                onClick={() => setExpandedTier(isExpanded ? null : i)}
                                data-testid={`button-tier-expand-${i}`}
                              >
                                {isExpanded ? 'Hide per-source queries' : 'Show per-source queries'}
                              </button>
                            )}
                          </div>
                          {isExpanded && (
                            <div className="mt-1.5 space-y-1 border-t border-slate-700/40 pt-1.5" data-testid={`tier-source-queries-${i}`}>
                              {Object.entries(t.sources).map(([s, info]) => (
                                <div key={s} className="text-[10px]">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-slate-300 font-semibold">{SOURCE_LABEL[s] ?? s}</span>
                                    <span className={cn(
                                      "text-[9.5px]",
                                      info.ok ? "text-slate-500" : "text-rose-300",
                                    )}>
                                      {info.ok ? `${info.count} result${info.count === 1 ? '' : 's'}` : `error: ${info.error || 'failed'}`}
                                    </span>
                                  </div>
                                  <code className="block text-[10px] text-violet-200 break-all bg-slate-950/60 rounded px-1 py-0.5 mt-0.5" data-testid={`tier-source-query-${i}-${s}`}>
                                    {info.query || '(none — source skipped)'}
                                  </code>
                                </div>
                              ))}
                            </div>
                          )}
                          {isWinning && (
                            <div className="text-[10px] text-emerald-300 mt-0.5">Winning tier (used for synthesis)</div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>

              {/* Citation list */}
              <div className="rounded-md border border-slate-700/60 bg-slate-900/60">
                <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-medium text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-3 w-3 text-violet-300" />
                    Citations ({cached.retrievedPapers.length})
                  </span>
                </div>
                <ul className="px-2 pb-2 space-y-1.5" data-testid="list-case-research-citations">
                  {cached.retrievedPapers.map(p => (
                    <li
                      key={p.citationNumber}
                      ref={setCitationRef(p.citationNumber)}
                      className={cn(
                        "rounded border px-2 py-1.5 text-[11px] leading-snug transition-colors",
                        highlightedCitation === p.citationNumber
                          ? "border-violet-400/70 bg-violet-500/15 ring-1 ring-violet-400/40"
                          : "border-slate-700/50 bg-slate-950/40",
                      )}
                      data-testid={`item-case-research-citation-${p.citationNumber}`}
                    >
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-violet-200 font-semibold shrink-0">[{p.citationNumber}]</span>
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-100 hover:text-violet-200 underline-offset-2 hover:underline"
                        >
                          {p.title}
                        </a>
                        <ExternalLink className="h-2.5 w-2.5 text-slate-500 shrink-0" />
                      </div>
                      <div className="text-[10px] text-slate-400 ml-5">
                        {p.authors.length > 0 ? (p.authors.length > 4 ? `${p.authors.slice(0, 3).join(', ')} et al.` : p.authors.join(', ')) : 'Unknown'}
                        {p.year ? ` · ${p.year}` : ''}
                        {p.journal ? ` · ${p.journal}` : ''}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 ml-5 mt-0.5">
                        {(() => {
                          // Render every contributing source as its own
                          // chip — falls back to the primary `source`
                          // for older rows that don't have the union
                          // field populated.
                          const sources = (p.mergedFromSources && p.mergedFromSources.length > 0)
                            ? p.mergedFromSources
                            : [p.source];
                          return sources.map(s => (
                            <span
                              key={s}
                              className="text-[9.5px] px-1 rounded border border-slate-600/60 bg-slate-800/60 text-slate-300"
                              data-testid={`citation-source-chip-${p.citationNumber}-${s}`}
                            >
                              {SOURCE_LABEL[s] ?? s}
                            </span>
                          ));
                        })()}
                        {typeof p.pedroScore === 'number' && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[9.5px] px-1 rounded border border-amber-500/50 bg-amber-500/10 text-amber-200"
                            title={`PEDro Score ${p.pedroScore}/10 — physiotherapy methodological quality rating`}
                            data-testid={`citation-pedro-score-${p.citationNumber}`}
                          >
                            <Award className="h-2.5 w-2.5" />
                            PEDro {p.pedroScore}/10
                          </span>
                        )}
                        {typeof p.citationCount === 'number' && p.citationCount > 0 && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[9.5px] px-1 rounded border border-violet-500/40 bg-violet-500/10 text-violet-200"
                            title={`${p.citationCount.toLocaleString()} citations on Semantic Scholar`}
                            data-testid={`citation-citation-count-${p.citationNumber}`}
                          >
                            <Quote className="h-2.5 w-2.5" />
                            {p.citationCount.toLocaleString()}
                          </span>
                        )}
                        {p.openAccess && (
                          <span className="text-[9.5px] px-1 rounded border border-emerald-600/40 bg-emerald-950/40 text-emerald-200">OA</span>
                        )}
                        {p.matchedVariables.length > 0 && (
                          <span className="text-[9.5px] text-slate-400">matches: {p.matchedVariables.join(', ')}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Active & recent trials — sibling section to Citations,
                  rendered only when ClinicalTrials.gov returned hits.
                  Hidden entirely when empty so the panel stays compact
                  on cases where no trials matched. The `retrievedTrials`
                  column is nullable for rows persisted before Task #287. */}
              {(cached.retrievedTrials ?? []).length > 0 && (
                <div className="space-y-1.5" data-testid="case-research-trials-section">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-300">
                    <Activity className="h-3 w-3" /> Active & recent trials
                    <span className="text-[10px] text-slate-500 normal-case tracking-normal">
                      from ClinicalTrials.gov
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-[11px]">
                    {(cached.retrievedTrials ?? []).map(t => (
                      <li
                        key={t.nct}
                        className="rounded border border-cyan-500/30 bg-cyan-950/20 p-2 text-slate-200"
                        data-testid={`trial-card-${t.nct}`}
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <a
                            href={t.url || `https://clinicaltrials.gov/study/${t.nct}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border border-cyan-400/50 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25 font-mono"
                            data-testid={`trial-nct-link-${t.nct}`}
                          >
                            {t.nct}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                          <span className="text-[9.5px] px-1 rounded border border-slate-600/60 bg-slate-800/60 text-slate-300">
                            {t.status}
                          </span>
                          {t.phase && (
                            <span className="text-[9.5px] px-1 rounded border border-slate-600/60 bg-slate-800/60 text-slate-300">
                              {t.phase}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 leading-snug">{t.title}</div>
                        {t.intervention && (
                          <div className="mt-0.5 text-[10px] text-slate-400">
                            <span className="text-slate-500">Intervention:</span> {t.intervention}
                          </div>
                        )}
                        {t.primaryOutcome && (
                          <div className="mt-0.5 text-[10px] text-slate-400">
                            <span className="text-slate-500">Primary outcome:</span> {t.primaryOutcome}
                          </div>
                        )}
                        {t.sponsor && (
                          <div className="mt-0.5 text-[10px] text-slate-500">Sponsor: {t.sponsor}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[10px] text-slate-500">
                  Synthesized {new Date(cached.updatedAt as unknown as string).toLocaleString()}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className={cn(
                    "h-7 text-[11px]",
                    isStale
                      ? "bg-amber-500 hover:bg-amber-400 text-slate-900"
                      : "bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/40 text-violet-100",
                  )}
                  disabled={isRunning || !condition || !contentHash}
                  onClick={() => trigger(true)}
                  data-testid="button-case-research-rerun"
                >
                  <RefreshCcw className="h-3 w-3 mr-1" />
                  {isStale ? "Re-run for current case" : "Re-run search"}
                </Button>
              </div>
            </div>
          )}
          </div>
          {/* Visible drag affordance — the actual resize is the
              browser's native CSS handle on the body above. We don't
              capture pointer events here so the handle stays usable. */}
          <div
            className="pointer-events-none absolute bottom-0.5 right-0.5 flex h-3 w-3 items-center justify-center text-slate-500 opacity-50 transition-opacity group-hover/case-research-body:opacity-90"
            aria-hidden="true"
          >
            <GripHorizontal className="h-3 w-3" />
          </div>
        </div>
      )}
    </Card>
  );
});
