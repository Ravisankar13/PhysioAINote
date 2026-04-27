import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Loader2, FlaskConical, RefreshCcw, AlertTriangle, ChevronDown, ChevronUp,
  ExternalLink, BookOpen, ListFilter, Search, Info, ShieldCheck,
} from "lucide-react";
import type { CaseResearchSynthesis } from "@shared/schema";

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

export function CaseResearchPanel({
  caseId, condition, caseSummary, contentHash,
  visible = true, className,
}: CaseResearchPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showHowSearched, setShowHowSearched] = useState(false);
  const [highlightedCitation, setHighlightedCitation] = useState<number | null>(null);
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
    mutationFn: async (opts: { refresh: boolean }) => {
      if (!caseId || !condition || !contentHash) throw new Error("Case is not ready for search");
      return await apiRequest(`/api/case-research/${encodeURIComponent(caseId)}`, 'POST', {
        caseSummary,
        condition,
        contentHash,
        refresh: opts.refresh,
      }) as CaseResearchSynthesis & { cached?: boolean };
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKey, data);
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
        <div className="px-3 py-3 space-y-3 max-h-[68vh] overflow-y-auto">
          {!enabled && (
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Submit a clinical prediction above and PhysioGPT will synthesize patient-specific research from PubMed, OpenAlex, and Europe PMC for this exact case.
            </p>
          )}

          {enabled && !hasResult && !isRunning && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Find evidence tailored to <span className="text-slate-200 font-medium">{condition || 'this case'}</span> — the AI infers which variables make this patient different (comorbidities, mechanism, timing) and runs tiered queries that drop modifiers only when needed.
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
              Inferring discriminating variables, querying PubMed / OpenAlex / Europe PMC, synthesizing…
            </div>
          )}

          {hasResult && cached && (
            <div className="space-y-3">
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
                      return (
                        <li
                          key={i}
                          className={cn(
                            "rounded border px-2 py-1.5 text-[10.5px] leading-snug",
                            isWinning ? "border-emerald-500/40 bg-emerald-950/20" : "border-slate-700/50 bg-slate-950/40",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-200 font-semibold">
                              Tier {t.tier} — {t.label}
                            </span>
                            <span className="text-[10px] text-slate-500 shrink-0">{t.paperCount} hits</span>
                          </div>
                          <code className="block text-[10px] text-violet-200 break-all my-1">{t.query}</code>
                          <div className="flex flex-wrap gap-1 text-[10px] text-slate-400">
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
                          </div>
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
                        <span className="text-[9.5px] px-1 rounded border border-slate-600/60 bg-slate-800/60 text-slate-300">
                          {SOURCE_LABEL[p.source] ?? p.source}
                        </span>
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
      )}
    </Card>
  );
}
