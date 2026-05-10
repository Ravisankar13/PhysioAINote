export type TestOutcome = "positive" | "negative" | "skip";

export interface BayesTestEntry {
  testId: string;
  name: string;
  outcome: TestOutcome;
  lrPositive: number;
  lrNegative: number;
}

export interface BayesStep {
  testId: string;
  name: string;
  outcome: TestOutcome;
  lrApplied: number;
  priorPct: number;
  posteriorPct: number;
  delta: number;
}

export interface BayesResult {
  startPct: number;
  posteriorPct: number;
  steps: BayesStep[];
  rationale: string;
}

const clampPct = (p: number) => Math.max(1, Math.min(99, p));

export function pctToOdds(pct: number): number {
  const p = clampPct(pct) / 100;
  return p / (1 - p);
}

export function oddsToPct(odds: number): number {
  if (!isFinite(odds) || odds <= 0) return 1;
  const p = odds / (1 + odds);
  return Math.max(1, Math.min(99, p * 100));
}

function lrLabel(lr: number): string {
  if (lr >= 10) return "strong support";
  if (lr >= 5) return "moderate support";
  if (lr >= 2) return "mild support";
  if (lr > 1) return "weak support";
  if (lr === 1) return "no change";
  if (lr >= 0.5) return "weak against";
  if (lr >= 0.2) return "mild against";
  if (lr >= 0.1) return "moderate against";
  return "strong against";
}

export function updatePosterior(
  startPct: number,
  results: BayesTestEntry[],
): BayesResult {
  const start = clampPct(startPct);
  let runningPct = start;
  const steps: BayesStep[] = [];

  for (const r of results) {
    if (r.outcome === "skip") continue;
    const lr = r.outcome === "positive" ? r.lrPositive : r.lrNegative;
    if (!isFinite(lr) || lr <= 0) continue;

    const priorOdds = pctToOdds(runningPct);
    const postOdds = priorOdds * lr;
    const newPct = oddsToPct(postOdds);
    steps.push({
      testId: r.testId,
      name: r.name,
      outcome: r.outcome,
      lrApplied: lr,
      priorPct: runningPct,
      posteriorPct: newPct,
      delta: newPct - runningPct,
    });
    runningPct = newPct;
  }

  const posterior = Math.round(runningPct);
  const totalDelta = Math.round(posterior - start);

  let rationale = "";
  if (steps.length === 0) {
    rationale = `No tests applied — confidence remains at ${Math.round(start)}%.`;
  } else {
    const moves = steps.map((s) => {
      const sign = s.delta >= 0 ? "+" : "";
      return `${s.name} (${s.outcome}, LR ${s.lrApplied.toFixed(1)}, ${lrLabel(s.lrApplied)}) ${sign}${s.delta.toFixed(0)}%`;
    });
    const direction = totalDelta > 0 ? "raises" : totalDelta < 0 ? "lowers" : "leaves";
    rationale = `${steps.length} test${steps.length === 1 ? "" : "s"} ${direction} confidence from ${Math.round(start)}% → ${posterior}% (${totalDelta >= 0 ? "+" : ""}${totalDelta}%). Bayesian chain: ${moves.join("; ")}.`;
  }

  return { startPct: start, posteriorPct: posterior, steps, rationale };
}
