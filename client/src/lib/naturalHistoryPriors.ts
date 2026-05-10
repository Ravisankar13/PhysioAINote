/**
 * Task #255 — Natural-history prior dataset.
 *
 * Curated typed catalog of "do nothing" recovery curves keyed by
 * condition + chronicity stage + severity. Each entry encodes the
 * literature-derived expected trajectory the patient would follow
 * regardless of treatment, used by `naturalProgressionEngine.ts` to
 * anchor the simulator's baseline curve.
 *
 * All numbers come from systematic-review / cohort-study consensus
 * estimates; citations live in code comments next to each prior so
 * future updates carry their evidence trail.
 *
 * Schema (per prior):
 *   - medianRecoveryWeeks: median weeks to "meaningful recovery"
 *     (≥ 50% improvement on patient-reported outcome).
 *   - milestoneFractions: % recovered (0–1) at key time-points; the
 *     simulator interpolates between these to draw the baseline.
 *   - residualDeficitCeiling: % of full pre-injury function the
 *     median patient never recovers (0 = full recovery, 0.20 = 20%
 *     residual deficit). Drives the asymptote ceiling.
 *   - chronificationProbability: p(stuck > 6 months at <50%
 *     recovery). Feeds the scenario-C branch likelihood.
 *   - plateauProbability: p(plateau visible by 8 weeks).
 *   - earlyImprovementWeeks: weeks at which the natural curve gives
 *     a first noticeable improvement (used to "shape" the curve so
 *     it's not linear).
 */

export type ChronicityStage = "acute" | "subacute" | "chronic" | "unknown";

export interface MilestoneFractions {
  /** % recovered at week 4. */
  w4: number;
  /** % recovered at week 12. */
  w12: number;
  /** % recovered at week 26. */
  w26: number;
  /** % recovered at week 52. */
  w52: number;
}

export interface NaturalHistoryPrior {
  conditionId: string;
  conditionLabel: string;
  stage: ChronicityStage;
  /** Severity bucket. Each prior is keyed by family-specific bucket
   *  ("mild" / "moderate" / "severe" / "any"). */
  severityBucket: "mild" | "moderate" | "severe" | "any";
  medianRecoveryWeeks: number;
  milestoneFractions: MilestoneFractions;
  residualDeficitCeiling: number;
  chronificationProbability: number;
  plateauProbability: number;
  /** Weeks at which the natural curve produces its first meaningful
   *  uptick (used to shape the early portion of the curve). */
  earlyImprovementWeeks: number;
  /** Citation summary for the prior — short reference. */
  citation: string;
}

// ─────────────────────────────────────────────────────────────────────
// Frozen shoulder (adhesive capsulitis)
//
// Wong et al. 2017 systematic review: median natural recovery 18–36
// months from onset; ~60% of patients have residual deficit at 1y;
// "thawing" stage shows the most spontaneous improvement. Source:
// Wong CK, Strudwick KJ, et al. Br J Sports Med 2017.
// ─────────────────────────────────────────────────────────────────────
const FROZEN_SHOULDER_PRIORS: NaturalHistoryPrior[] = [
  {
    conditionId: "frozen_shoulder",
    conditionLabel: "Frozen shoulder (freezing)",
    stage: "acute",
    severityBucket: "any",
    medianRecoveryWeeks: 78,
    milestoneFractions: { w4: 0.02, w12: 0.08, w26: 0.18, w52: 0.40 },
    residualDeficitCeiling: 0.30,
    chronificationProbability: 0.45,
    plateauProbability: 0.55,
    earlyImprovementWeeks: 16,
    citation: "Wong 2017; Hand 2008",
  },
  {
    conditionId: "frozen_shoulder",
    conditionLabel: "Frozen shoulder (frozen)",
    stage: "subacute",
    severityBucket: "any",
    medianRecoveryWeeks: 60,
    milestoneFractions: { w4: 0.05, w12: 0.15, w26: 0.30, w52: 0.55 },
    residualDeficitCeiling: 0.25,
    chronificationProbability: 0.35,
    plateauProbability: 0.50,
    earlyImprovementWeeks: 12,
    citation: "Wong 2017; Hand 2008",
  },
  {
    conditionId: "frozen_shoulder",
    conditionLabel: "Frozen shoulder (thawing)",
    stage: "chronic",
    severityBucket: "any",
    medianRecoveryWeeks: 36,
    milestoneFractions: { w4: 0.10, w12: 0.30, w26: 0.55, w52: 0.78 },
    residualDeficitCeiling: 0.18,
    chronificationProbability: 0.20,
    plateauProbability: 0.30,
    earlyImprovementWeeks: 6,
    citation: "Wong 2017",
  },
];

// ─────────────────────────────────────────────────────────────────────
// Lateral epicondylitis (tennis elbow)
//
// Bisset et al. 2006 BMJ: ~80% recovered at 12 months with wait-and-
// see; high early flare. Smidt 2002 JAMA: similar long-term outcome
// across treatment arms.
// ─────────────────────────────────────────────────────────────────────
const LATERAL_EPI_PRIORS: NaturalHistoryPrior[] = [
  {
    conditionId: "lateral_epicondylalgia",
    conditionLabel: "Lateral epicondylalgia (acute)",
    stage: "acute",
    severityBucket: "any",
    medianRecoveryWeeks: 26,
    milestoneFractions: { w4: 0.15, w12: 0.45, w26: 0.65, w52: 0.80 },
    residualDeficitCeiling: 0.10,
    chronificationProbability: 0.20,
    plateauProbability: 0.30,
    earlyImprovementWeeks: 3,
    citation: "Bisset 2006 BMJ",
  },
  {
    conditionId: "lateral_epicondylalgia",
    conditionLabel: "Lateral epicondylalgia (chronic)",
    stage: "chronic",
    severityBucket: "any",
    medianRecoveryWeeks: 52,
    milestoneFractions: { w4: 0.05, w12: 0.18, w26: 0.40, w52: 0.65 },
    residualDeficitCeiling: 0.20,
    chronificationProbability: 0.40,
    plateauProbability: 0.55,
    earlyImprovementWeeks: 8,
    citation: "Bisset 2006 BMJ; Coombes 2013",
  },
];

// ─────────────────────────────────────────────────────────────────────
// Rotator cuff tendinopathy / partial tear
//
// Kuhn 2013 MOON cohort: ~75% improved at 2y with non-op care;
// full-thickness tears progress in ~50% over 5y if untreated.
// ─────────────────────────────────────────────────────────────────────
const ROTATOR_CUFF_PRIORS: NaturalHistoryPrior[] = [
  {
    conditionId: "rotator_cuff_tendinopathy",
    conditionLabel: "Rotator cuff tendinopathy (mild)",
    stage: "subacute",
    severityBucket: "mild",
    medianRecoveryWeeks: 16,
    milestoneFractions: { w4: 0.20, w12: 0.55, w26: 0.75, w52: 0.85 },
    residualDeficitCeiling: 0.10,
    chronificationProbability: 0.18,
    plateauProbability: 0.30,
    earlyImprovementWeeks: 3,
    citation: "Kuhn 2013 MOON",
  },
  {
    conditionId: "rotator_cuff_tendinopathy",
    conditionLabel: "Rotator cuff tendinopathy (moderate)",
    stage: "chronic",
    severityBucket: "moderate",
    medianRecoveryWeeks: 32,
    milestoneFractions: { w4: 0.08, w12: 0.30, w26: 0.55, w52: 0.72 },
    residualDeficitCeiling: 0.18,
    chronificationProbability: 0.32,
    plateauProbability: 0.45,
    earlyImprovementWeeks: 6,
    citation: "Kuhn 2013; Beard 2018",
  },
  {
    conditionId: "rotator_cuff_tear",
    conditionLabel: "Rotator cuff partial-thickness tear",
    stage: "chronic",
    severityBucket: "moderate",
    medianRecoveryWeeks: 40,
    milestoneFractions: { w4: 0.05, w12: 0.22, w26: 0.45, w52: 0.62 },
    residualDeficitCeiling: 0.25,
    chronificationProbability: 0.40,
    plateauProbability: 0.50,
    earlyImprovementWeeks: 8,
    citation: "Kuhn 2013 MOON; Yamamoto 2010",
  },
  {
    conditionId: "rotator_cuff_tear",
    conditionLabel: "Rotator cuff full-thickness tear",
    stage: "chronic",
    severityBucket: "severe",
    medianRecoveryWeeks: 52,
    milestoneFractions: { w4: 0.03, w12: 0.15, w26: 0.32, w52: 0.50 },
    residualDeficitCeiling: 0.40,
    chronificationProbability: 0.55,
    plateauProbability: 0.65,
    earlyImprovementWeeks: 10,
    citation: "Beard 2018; Kukkonen 2015",
  },
];

// ─────────────────────────────────────────────────────────────────────
// Acute / subacute / chronic low back pain
//
// Pengel 2003 BMJ: ~90% recovered by 6 wks (acute, non-radicular).
// da C Menezes Costa 2012: chronic LBP 12-mo recovery ~35%.
// ─────────────────────────────────────────────────────────────────────
const LBP_PRIORS: NaturalHistoryPrior[] = [
  {
    conditionId: "acute_lbp",
    conditionLabel: "Acute LBP",
    stage: "acute",
    severityBucket: "any",
    medianRecoveryWeeks: 4,
    milestoneFractions: { w4: 0.65, w12: 0.85, w26: 0.92, w52: 0.95 },
    residualDeficitCeiling: 0.05,
    chronificationProbability: 0.10,
    plateauProbability: 0.15,
    earlyImprovementWeeks: 1,
    citation: "Pengel 2003 BMJ",
  },
  {
    conditionId: "subacute_lbp",
    conditionLabel: "Subacute LBP",
    stage: "subacute",
    severityBucket: "any",
    medianRecoveryWeeks: 12,
    milestoneFractions: { w4: 0.30, w12: 0.55, w26: 0.75, w52: 0.85 },
    residualDeficitCeiling: 0.10,
    chronificationProbability: 0.20,
    plateauProbability: 0.30,
    earlyImprovementWeeks: 3,
    citation: "Pengel 2003; Itz 2013",
  },
  {
    conditionId: "chronic_lbp",
    conditionLabel: "Chronic LBP",
    stage: "chronic",
    severityBucket: "any",
    medianRecoveryWeeks: 52,
    milestoneFractions: { w4: 0.05, w12: 0.15, w26: 0.25, w52: 0.35 },
    residualDeficitCeiling: 0.30,
    chronificationProbability: 0.55,
    plateauProbability: 0.60,
    earlyImprovementWeeks: 12,
    citation: "da C Menezes Costa 2012; Itz 2013",
  },
];

// ─────────────────────────────────────────────────────────────────────
// Knee osteoarthritis by KL grade
//
// Bastick 2015 systematic review: pain trajectories stratified by
// KL grade. Kellgren-Lawrence III–IV worsens; I–II often stable.
// ─────────────────────────────────────────────────────────────────────
const KNEE_OA_PRIORS: NaturalHistoryPrior[] = [
  {
    conditionId: "osteoarthritis",
    conditionLabel: "Knee OA (KL 1)",
    stage: "chronic",
    severityBucket: "mild",
    medianRecoveryWeeks: 0,
    milestoneFractions: { w4: 0.10, w12: 0.20, w26: 0.30, w52: 0.35 },
    residualDeficitCeiling: 0.20,
    chronificationProbability: 0.50,
    plateauProbability: 0.70,
    earlyImprovementWeeks: 4,
    citation: "Bastick 2015",
  },
  {
    conditionId: "osteoarthritis",
    conditionLabel: "Knee OA (KL 2)",
    stage: "chronic",
    severityBucket: "moderate",
    medianRecoveryWeeks: 0,
    milestoneFractions: { w4: 0.05, w12: 0.12, w26: 0.18, w52: 0.22 },
    residualDeficitCeiling: 0.30,
    chronificationProbability: 0.65,
    plateauProbability: 0.78,
    earlyImprovementWeeks: 6,
    citation: "Bastick 2015",
  },
  {
    conditionId: "osteoarthritis",
    conditionLabel: "Knee OA (KL 3–4)",
    stage: "chronic",
    severityBucket: "severe",
    medianRecoveryWeeks: 0,
    milestoneFractions: { w4: 0.03, w12: 0.07, w26: 0.10, w52: 0.12 },
    residualDeficitCeiling: 0.45,
    chronificationProbability: 0.85,
    plateauProbability: 0.90,
    earlyImprovementWeeks: 8,
    citation: "Bastick 2015; Felson 2013",
  },
];

// ─────────────────────────────────────────────────────────────────────
// Hip osteoarthritis
// Wright 2019: progressive course, infrequent symptomatic remission.
// ─────────────────────────────────────────────────────────────────────
const HIP_OA_PRIORS: NaturalHistoryPrior[] = [
  {
    conditionId: "hip_oa",
    conditionLabel: "Hip OA (mild–moderate)",
    stage: "chronic",
    severityBucket: "moderate",
    medianRecoveryWeeks: 0,
    milestoneFractions: { w4: 0.04, w12: 0.10, w26: 0.16, w52: 0.20 },
    residualDeficitCeiling: 0.32,
    chronificationProbability: 0.70,
    plateauProbability: 0.80,
    earlyImprovementWeeks: 6,
    citation: "Wright 2019",
  },
  {
    conditionId: "hip_oa",
    conditionLabel: "Hip OA (severe)",
    stage: "chronic",
    severityBucket: "severe",
    medianRecoveryWeeks: 0,
    milestoneFractions: { w4: 0.02, w12: 0.05, w26: 0.08, w52: 0.10 },
    residualDeficitCeiling: 0.50,
    chronificationProbability: 0.88,
    plateauProbability: 0.92,
    earlyImprovementWeeks: 10,
    citation: "Wright 2019",
  },
];

// ─────────────────────────────────────────────────────────────────────
// Plantar fasciopathy
// Wolgin 1994: ~80% resolved at 12 months conservative.
// ─────────────────────────────────────────────────────────────────────
const PLANTAR_FASCIITIS_PRIORS: NaturalHistoryPrior[] = [
  {
    conditionId: "plantar_fasciitis",
    conditionLabel: "Plantar fasciopathy (acute)",
    stage: "acute",
    severityBucket: "any",
    medianRecoveryWeeks: 24,
    milestoneFractions: { w4: 0.18, w12: 0.45, w26: 0.65, w52: 0.80 },
    residualDeficitCeiling: 0.10,
    chronificationProbability: 0.18,
    plateauProbability: 0.30,
    earlyImprovementWeeks: 4,
    citation: "Wolgin 1994",
  },
  {
    conditionId: "plantar_fasciitis",
    conditionLabel: "Plantar fasciopathy (chronic)",
    stage: "chronic",
    severityBucket: "any",
    medianRecoveryWeeks: 40,
    milestoneFractions: { w4: 0.05, w12: 0.20, w26: 0.40, w52: 0.62 },
    residualDeficitCeiling: 0.18,
    chronificationProbability: 0.32,
    plateauProbability: 0.45,
    earlyImprovementWeeks: 8,
    citation: "Wolgin 1994; Riddle 2003",
  },
];

// ─────────────────────────────────────────────────────────────────────
// Cervical / lumbar radiculopathy
// Vroomen 2002 / Saal 1996: ~75% improvement at 12 weeks for cervical;
// Lumbar radiculopathy ~50% at 6 weeks, 80% at 12 weeks (mild–mod).
// ─────────────────────────────────────────────────────────────────────
const RADICULOPATHY_PRIORS: NaturalHistoryPrior[] = [
  {
    conditionId: "cervical_radiculopathy",
    conditionLabel: "Cervical radiculopathy (acute)",
    stage: "acute",
    severityBucket: "any",
    medianRecoveryWeeks: 12,
    milestoneFractions: { w4: 0.30, w12: 0.65, w26: 0.78, w52: 0.85 },
    residualDeficitCeiling: 0.12,
    chronificationProbability: 0.18,
    plateauProbability: 0.28,
    earlyImprovementWeeks: 2,
    citation: "Saal 1996; Vroomen 2002",
  },
  {
    conditionId: "radiculopathy",
    conditionLabel: "Lumbar radiculopathy (acute)",
    stage: "acute",
    severityBucket: "any",
    medianRecoveryWeeks: 8,
    milestoneFractions: { w4: 0.40, w12: 0.72, w26: 0.85, w52: 0.90 },
    residualDeficitCeiling: 0.10,
    chronificationProbability: 0.15,
    plateauProbability: 0.25,
    earlyImprovementWeeks: 2,
    citation: "Vroomen 2002",
  },
  {
    conditionId: "radiculopathy",
    conditionLabel: "Lumbar radiculopathy (chronic)",
    stage: "chronic",
    severityBucket: "any",
    medianRecoveryWeeks: 36,
    milestoneFractions: { w4: 0.08, w12: 0.22, w26: 0.42, w52: 0.60 },
    residualDeficitCeiling: 0.22,
    chronificationProbability: 0.40,
    plateauProbability: 0.55,
    earlyImprovementWeeks: 8,
    citation: "Konstantinou 2018",
  },
];

// ─────────────────────────────────────────────────────────────────────
// Achilles / patellar tendinopathy
// Silbernagel 2007 / Cook 2009: chronic load-capacity model.
// ─────────────────────────────────────────────────────────────────────
const TENDINOPATHY_PRIORS: NaturalHistoryPrior[] = [
  {
    conditionId: "achilles_tendinopathy",
    conditionLabel: "Achilles tendinopathy",
    stage: "chronic",
    severityBucket: "moderate",
    medianRecoveryWeeks: 36,
    milestoneFractions: { w4: 0.08, w12: 0.25, w26: 0.50, w52: 0.65 },
    residualDeficitCeiling: 0.20,
    chronificationProbability: 0.35,
    plateauProbability: 0.50,
    earlyImprovementWeeks: 6,
    citation: "Silbernagel 2007; Cook 2009",
  },
  {
    conditionId: "patellar_tendinopathy",
    conditionLabel: "Patellar tendinopathy",
    stage: "chronic",
    severityBucket: "moderate",
    medianRecoveryWeeks: 32,
    milestoneFractions: { w4: 0.10, w12: 0.28, w26: 0.50, w52: 0.68 },
    residualDeficitCeiling: 0.18,
    chronificationProbability: 0.32,
    plateauProbability: 0.48,
    earlyImprovementWeeks: 6,
    citation: "Cook 2009; Kongsgaard 2009",
  },
  {
    conditionId: "gluteal_tendinopathy",
    conditionLabel: "Gluteal tendinopathy",
    stage: "chronic",
    severityBucket: "moderate",
    medianRecoveryWeeks: 32,
    milestoneFractions: { w4: 0.10, w12: 0.30, w26: 0.55, w52: 0.72 },
    residualDeficitCeiling: 0.16,
    chronificationProbability: 0.30,
    plateauProbability: 0.42,
    earlyImprovementWeeks: 6,
    citation: "Mellor 2018 LEAP",
  },
];

// ─────────────────────────────────────────────────────────────────────
// Other entries (lighter coverage — generic fallbacks per family)
// ─────────────────────────────────────────────────────────────────────
const MISC_PRIORS: NaturalHistoryPrior[] = [
  {
    conditionId: "ankle_sprain_lateral",
    conditionLabel: "Lateral ankle sprain",
    stage: "acute",
    severityBucket: "any",
    medianRecoveryWeeks: 6,
    milestoneFractions: { w4: 0.55, w12: 0.85, w26: 0.92, w52: 0.95 },
    residualDeficitCeiling: 0.08,
    chronificationProbability: 0.20,
    plateauProbability: 0.20,
    earlyImprovementWeeks: 1,
    citation: "Doherty 2017",
  },
  {
    conditionId: "whiplash",
    conditionLabel: "Whiplash (WAD I–II)",
    stage: "acute",
    severityBucket: "any",
    medianRecoveryWeeks: 12,
    milestoneFractions: { w4: 0.40, w12: 0.65, w26: 0.78, w52: 0.85 },
    residualDeficitCeiling: 0.12,
    chronificationProbability: 0.30,
    plateauProbability: 0.35,
    earlyImprovementWeeks: 2,
    citation: "Carroll 2008",
  },
  {
    conditionId: "patellofemoral_pain",
    conditionLabel: "Patellofemoral pain",
    stage: "subacute",
    severityBucket: "any",
    medianRecoveryWeeks: 16,
    milestoneFractions: { w4: 0.18, w12: 0.45, w26: 0.65, w52: 0.78 },
    residualDeficitCeiling: 0.15,
    chronificationProbability: 0.25,
    plateauProbability: 0.35,
    earlyImprovementWeeks: 4,
    citation: "Collins 2010",
  },
  {
    conditionId: "subacromial_impingement",
    conditionLabel: "Subacromial pain syndrome",
    stage: "subacute",
    severityBucket: "any",
    medianRecoveryWeeks: 16,
    milestoneFractions: { w4: 0.20, w12: 0.50, w26: 0.70, w52: 0.82 },
    residualDeficitCeiling: 0.12,
    chronificationProbability: 0.22,
    plateauProbability: 0.32,
    earlyImprovementWeeks: 3,
    citation: "Beard 2018; Diercks 2014",
  },
  {
    conditionId: "lumbar_disc_herniation",
    conditionLabel: "Lumbar disc herniation",
    stage: "subacute",
    severityBucket: "any",
    medianRecoveryWeeks: 16,
    milestoneFractions: { w4: 0.25, w12: 0.55, w26: 0.72, w52: 0.82 },
    residualDeficitCeiling: 0.15,
    chronificationProbability: 0.25,
    plateauProbability: 0.35,
    earlyImprovementWeeks: 3,
    citation: "Weber 1983; Lurie 2014",
  },
  {
    conditionId: "meniscal_injury",
    conditionLabel: "Degenerative meniscal lesion (conservative)",
    stage: "subacute",
    severityBucket: "any",
    medianRecoveryWeeks: 16,
    milestoneFractions: { w4: 0.25, w12: 0.55, w26: 0.72, w52: 0.82 },
    residualDeficitCeiling: 0.15,
    chronificationProbability: 0.25,
    plateauProbability: 0.35,
    earlyImprovementWeeks: 3,
    citation: "Sihvonen 2013 NEJM",
  },
];

/** Master list of all priors. */
export const NATURAL_HISTORY_PRIORS: NaturalHistoryPrior[] = [
  ...FROZEN_SHOULDER_PRIORS,
  ...LATERAL_EPI_PRIORS,
  ...ROTATOR_CUFF_PRIORS,
  ...LBP_PRIORS,
  ...KNEE_OA_PRIORS,
  ...HIP_OA_PRIORS,
  ...PLANTAR_FASCIITIS_PRIORS,
  ...RADICULOPATHY_PRIORS,
  ...TENDINOPATHY_PRIORS,
  ...MISC_PRIORS,
];

/** Generic fallback prior when the condition is unknown / not in the
 *  catalog. Uses a moderate-recovery curve that keeps the simulator
 *  from being mis-anchored when no prior is found. */
export const GENERIC_FALLBACK_PRIOR: NaturalHistoryPrior = {
  conditionId: "generic",
  conditionLabel: "Generic musculoskeletal",
  stage: "subacute",
  severityBucket: "any",
  medianRecoveryWeeks: 16,
  milestoneFractions: { w4: 0.20, w12: 0.50, w26: 0.70, w52: 0.82 },
  residualDeficitCeiling: 0.12,
  chronificationProbability: 0.20,
  plateauProbability: 0.30,
  earlyImprovementWeeks: 3,
  citation: "Heuristic fallback; not literature-derived",
};

export interface PriorLookupArgs {
  conditionId: string | null | undefined;
  stage?: ChronicityStage | null;
  severityBucket?: "mild" | "moderate" | "severe" | "any" | null;
}

/** Look up the closest matching prior. The lookup is permissive:
 *  - If `conditionId` matches multiple stage/severity entries, the
 *    one whose stage matches wins; ties broken by severityBucket
 *    match; otherwise the first prior for that condition is used.
 *  - If `conditionId` doesn't match any prior, returns
 *    `GENERIC_FALLBACK_PRIOR` (graceful fallback). */
export function lookupNaturalHistoryPrior(args: PriorLookupArgs): NaturalHistoryPrior {
  const id = (args.conditionId ?? "").trim();
  if (!id) return GENERIC_FALLBACK_PRIOR;

  const candidates = NATURAL_HISTORY_PRIORS.filter(p => p.conditionId === id);
  if (candidates.length === 0) return GENERIC_FALLBACK_PRIOR;

  const stage = args.stage ?? "unknown";
  const severity = args.severityBucket ?? "any";

  // Score candidates: stage match worth 2, severity match worth 1.
  let best: NaturalHistoryPrior = candidates[0];
  let bestScore = -1;
  for (const c of candidates) {
    let s = 0;
    if (stage !== "unknown" && c.stage === stage) s += 2;
    if (c.severityBucket === severity) s += 1;
    // Treat "any" candidates as compatible with any severity request.
    if (severity !== "any" && c.severityBucket === "any") s += 0.5;
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best;
}

/** Interpolate the milestone fractions into a per-week recovery
 *  fraction curve (0–1 scale) over `totalWeeks`. The curve is shaped
 *  so the asymptote sits at `1 - residualDeficitCeiling`. */
export function priorRecoveryCurve(
  prior: NaturalHistoryPrior,
  totalWeeks: number,
): number[] {
  const out: number[] = [];
  const total = Math.max(1, totalWeeks);
  // Anchor points (week, fraction).
  const anchors: Array<[number, number]> = [
    [0, 0],
    [Math.max(1, prior.earlyImprovementWeeks), prior.milestoneFractions.w4 * 0.6],
    [4, prior.milestoneFractions.w4],
    [12, prior.milestoneFractions.w12],
    [26, prior.milestoneFractions.w26],
    [52, prior.milestoneFractions.w52],
  ];
  // Sort by week, then enforce monotonic non-decreasing fractions
  // so a slow-recovery condition (where earlyImprovementWeeks lands
  // after the w12 milestone) can't create a dip in the curve.
  anchors.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < anchors.length; i++) {
    if (anchors[i][1] < anchors[i - 1][1]) {
      anchors[i] = [anchors[i][0], anchors[i - 1][1]];
    }
  }

  const ceiling = 1 - Math.max(0, Math.min(0.9, prior.residualDeficitCeiling));

  for (let w = 0; w <= total; w++) {
    let frac = 0;
    if (w <= anchors[0][0]) {
      frac = anchors[0][1];
    } else if (w >= anchors[anchors.length - 1][0]) {
      // Beyond final anchor: asymptotic crawl toward ceiling.
      const last = anchors[anchors.length - 1];
      const remaining = ceiling - last[1];
      const extraWeeks = w - last[0];
      // Approach asymptote with a soft exponential.
      const approach = 1 - Math.exp(-extraWeeks / 26);
      frac = last[1] + remaining * approach;
    } else {
      // Linear interp between bracketing anchors.
      for (let i = 0; i < anchors.length - 1; i++) {
        const [w0, f0] = anchors[i];
        const [w1, f1] = anchors[i + 1];
        if (w >= w0 && w <= w1) {
          const t = w1 === w0 ? 0 : (w - w0) / (w1 - w0);
          frac = f0 + (f1 - f0) * t;
          break;
        }
      }
    }
    // Cap at ceiling so plateau sits below 100% when there's residual.
    out.push(Math.max(0, Math.min(ceiling, frac)));
  }
  return out;
}
