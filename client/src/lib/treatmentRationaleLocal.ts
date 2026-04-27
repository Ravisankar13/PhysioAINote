import type { PlanCartItem } from "@/lib/planCart";
import type { OrchestratedSessionStep } from "@/components/skeleton/MyPlanRenderBlocks";
import type {
  RationaleClinicalContextInput,
  TreatmentRationaleDriver,
  TreatmentRationaleItem,
  TreatmentRationaleResult,
} from "@/lib/treatmentRationaleContext";

const MODALITY_PHASE_RANK: Record<string, number> = {
  electrophysical: 1,
  manual_therapy: 2,
  manual_therapy_custom: 2,
  exercise: 3,
  exercise_custom: 3,
  adjunct: 4,
  lifestyle: 5,
};

const MODALITY_LABEL: Record<string, string> = {
  exercise: "exercise",
  exercise_custom: "exercise",
  manual_therapy: "manual therapy",
  manual_therapy_custom: "manual therapy",
  electrophysical: "electrophysical agent",
  adjunct: "adjunct rx",
  lifestyle: "lifestyle/adjunct rx",
};

function searchableText(item: PlanCartItem): string {
  return [
    item.name,
    item.targetStructure,
    item.targetFinding,
    item.rationale,
    item.category,
    item.slingTag,
    item.targetTissue,
    item.desiredEffect,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[._/\\-]/g, " ")
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length >= 4);
}

function findItemsMatching(items: PlanCartItem[], needles: string[]): string[] {
  if (needles.length === 0) return [];
  const tokens = Array.from(new Set(needles.flatMap(n => tokenize(n))));
  if (tokens.length === 0) return [];
  const out: string[] = [];
  for (const it of items) {
    const haystack = searchableText(it);
    if (tokens.some(t => haystack.includes(t))) out.push(it.id);
  }
  return out;
}

function findSlingItems(items: PlanCartItem[], slingNeedle: string): string[] {
  const needle = slingNeedle.toLowerCase();
  const out: string[] = [];
  for (const it of items) {
    const tag = (it.slingTag || "").toLowerCase();
    if (tag && (tag === needle || needle.includes(tag) || tag.includes(needle))) {
      out.push(it.id);
      continue;
    }
    if (searchableText(it).includes(needle)) out.push(it.id);
  }
  return Array.from(new Set(out));
}

function buildDrivers(
  items: PlanCartItem[],
  ctx: RationaleClinicalContextInput,
): TreatmentRationaleDriver[] {
  const drivers: TreatmentRationaleDriver[] = [];

  // Top hypothesis as anchor driver.
  if (ctx.topHypothesis) {
    drivers.push({
      label: "Working diagnosis",
      detail: ctx.topHypothesis,
      kind: "other",
      addressedItemIds: items.map(i => i.id),
    });
  }

  // Pain markers.
  const pm = ctx.painMarkers;
  if (pm && (pm.count || pm.structures?.length || pm.severitySummary)) {
    const detailBits: string[] = [];
    if (pm.count) detailBits.push(`${pm.count} marker${pm.count === 1 ? "" : "s"}`);
    if (pm.structures?.length) detailBits.push(`on ${pm.structures.slice(0, 4).join(", ")}`);
    if (pm.mechanisms?.length) detailBits.push(`(${pm.mechanisms.join(", ")})`);
    if (pm.severitySummary) detailBits.push(pm.severitySummary);
    drivers.push({
      label: "Pain & symptoms",
      detail: detailBits.join(" · ") || "Pain markers present.",
      kind: "pain",
      addressedItemIds: findItemsMatching(items, [
        ...(pm.structures || []),
        ...(pm.mechanisms || []),
        "pain", "analges", "tens", "ifc", "ice", "heat", "modulat",
      ]),
    });
  }

  // Sling drivers.
  for (const sd of ctx.slingDrivers || []) {
    drivers.push({
      label: `Sling driver — ${sd.sling}${sd.role ? ` (${sd.role})` : ""}`,
      detail: sd.drivingFinding || `${sd.sling} sling identified as a driver.`,
      kind: "sling",
      addressedItemIds: findSlingItems(items, sd.sling),
    });
  }

  // Fascial chain tensions.
  const ft = ctx.fascialTensions;
  if (ft && (ft.drivingChains?.length || ft.activeChains?.length)) {
    const chains = [...(ft.drivingChains || []), ...(ft.activeChains || [])];
    drivers.push({
      label: "Fascial chain tension",
      detail: ft.drivingChains?.length
        ? `Driving chains: ${ft.drivingChains.slice(0, 4).join(", ")}`
        : `Active chains: ${(ft.activeChains || []).slice(0, 4).join(", ")}`,
      kind: "fascial",
      addressedItemIds: findItemsMatching(items, chains.concat(["fascia", "myofasc", "release", "stretch"])),
    });
  }

  // Kinetic-chain integrity (low-score chains).
  for (const ch of (ctx.chainIntegrity || []).slice(0, 3)) {
    drivers.push({
      label: `Chain integrity — ${ch.chain}`,
      detail: `Score ${Math.round(ch.score)}/100${ch.issues?.length ? ` · ${ch.issues.slice(0, 2).join(", ")}` : ""}`,
      kind: "chain",
      addressedItemIds: findItemsMatching(items, [ch.chain, ...(ch.issues || [])]),
    });
  }

  // Compromised tissues.
  if ((ctx.compromisedTissues || []).length > 0) {
    const ts = ctx.compromisedTissues!.slice(0, 4);
    drivers.push({
      label: "Compromised tissues",
      detail: ts.map(t => `${t.name}${t.status ? ` (${t.status})` : ""}`).join("; "),
      kind: "tissue",
      addressedItemIds: findItemsMatching(
        items,
        ts.flatMap(t => [t.name, t.region || ""].filter(Boolean) as string[]),
      ),
    });
  }

  // Scar / adhesion load.
  const sl = ctx.scarLoad;
  if (sl && ((sl.scarCount ?? 0) + (sl.adhesionCount ?? 0) > 0)) {
    drivers.push({
      label: "Scar / adhesion load",
      detail: [
        sl.scarCount ? `${sl.scarCount} scar${sl.scarCount === 1 ? "" : "s"}` : "",
        sl.adhesionCount ? `${sl.adhesionCount} adhesion band${sl.adhesionCount === 1 ? "" : "s"}` : "",
        sl.regions?.length ? `regions: ${sl.regions.join(", ")}` : "",
      ].filter(Boolean).join(" · "),
      kind: "scar",
      addressedItemIds: findItemsMatching(items, [
        ...(sl.regions || []),
        "scar", "adhesion", "myofasc", "release", "soft tissue", "ifc", "ultrasound",
      ]),
    });
  }

  // Force hotspots.
  if ((ctx.forceHotspots || []).length > 0) {
    const fh = ctx.forceHotspots!.slice(0, 3);
    drivers.push({
      label: "Force hotspots",
      detail: fh.map(f => `${f.joint}${typeof f.peakForceN === "number" ? ` peak ${Math.round(f.peakForceN)}N` : ""}${typeof f.asymmetryIndex === "number" ? ` asym ${Math.round(f.asymmetryIndex * 100)}%` : ""}`).join("; "),
      kind: "force",
      addressedItemIds: findItemsMatching(items, fh.map(f => f.joint).concat(["offload", "brace", "control", "stabil"])),
    });
  }

  // Postural deviations.
  if (ctx.posturalDeviations?.summary) {
    drivers.push({
      label: "Postural deviation",
      detail: `${ctx.posturalDeviations.summary}${ctx.posturalDeviations.severity ? ` (${ctx.posturalDeviations.severity})` : ""}`,
      kind: "postural",
      addressedItemIds: findItemsMatching(items, [
        ctx.posturalDeviations.summary,
        "postur", "alignment", "ergonom", "scapular", "thoracic",
      ]),
    });
  }

  // Thoracic stiffness.
  if (ctx.thoracicStiffness) {
    drivers.push({
      label: "Thoracic stiffness",
      detail: ctx.thoracicStiffness,
      kind: "thoracic",
      addressedItemIds: findItemsMatching(items, [
        "thoracic", "t-spine", "t spine", "rotation", "extension", "mobiliz", "mobilis",
      ]),
    });
  }

  // Tendon inflammation.
  if ((ctx.tendonInflammation || []).length > 0) {
    drivers.push({
      label: "Tendon inflammation",
      detail: ctx.tendonInflammation!.join(", "),
      kind: "tendon",
      addressedItemIds: findItemsMatching(items, ctx.tendonInflammation!.concat([
        "tendon", "isometric", "eccentric", "iso ", "load manage", "bursa",
      ])),
    });
  }

  // Natural progression risk.
  const np = ctx.naturalProgression;
  if (np && ((np.chronicityRiskPercent ?? 0) >= 30 || (np.recurrenceRiskPercent ?? 0) >= 30)) {
    const bits: string[] = [];
    if (np.window) bits.push(`expected window ${np.window}`);
    if (typeof np.chronicityRiskPercent === "number") bits.push(`chronicity ${Math.round(np.chronicityRiskPercent)}%`);
    if (typeof np.recurrenceRiskPercent === "number") bits.push(`recurrence ${Math.round(np.recurrenceRiskPercent)}%`);
    drivers.push({
      label: "Natural-progression risk",
      detail: bits.join(" · "),
      kind: "risk",
      addressedItemIds: findItemsMatching(items, [
        "education", "self-manage", "load manage", "recurrence", "return to", "progression",
      ]),
    });
  }

  return drivers;
}

function buildClinicalPicture(
  items: PlanCartItem[],
  ctx: RationaleClinicalContextInput,
  drivers: TreatmentRationaleDriver[],
): string {
  const parts: string[] = [];
  if (ctx.topHypothesis) {
    parts.push(`Working hypothesis: ${ctx.topHypothesis}${ctx.primaryRegion ? ` (${ctx.primaryRegion})` : ""}.`);
  } else if (ctx.primaryRegion) {
    parts.push(`Region of interest: ${ctx.primaryRegion}.`);
  }

  const stageBits: string[] = [];
  if (ctx.stage) stageBits.push(`stage ${ctx.stage}`);
  if (ctx.irritability) stageBits.push(`irritability ${ctx.irritability}`);
  if (ctx.recoveryPhase) stageBits.push(`phase ${ctx.recoveryPhase}`);
  if (stageBits.length) parts.push(`Presenting ${stageBits.join(", ")}.`);

  // Tie 2-3 most important drivers into a story.
  const story = drivers
    .filter(d => d.kind && d.kind !== "other")
    .slice(0, 3)
    .map(d => `${d.label.toLowerCase()} (${d.detail.slice(0, 90)})`);
  if (story.length) {
    parts.push(`Key drivers: ${story.join("; ")}.`);
  }

  parts.push(`Plan currently contains ${items.length} item${items.length === 1 ? "" : "s"} across ${new Set(items.map(i => i.modality)).size} modalit${new Set(items.map(i => i.modality)).size === 1 ? "y" : "ies"}.`);

  return parts.join(" ");
}

function buildOrderingRationale(
  items: PlanCartItem[],
  ctx: RationaleClinicalContextInput,
  sessionOrder?: OrchestratedSessionStep[],
): string {
  if (sessionOrder && sessionOrder.length > 0) {
    const seq = sessionOrder
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(s => `${s.order}) ${s.itemName}`)
      .join(" → ");
    return `Ordered ${seq}. The sequence follows standard physio principles: pain/inflammation modulation first, manual therapy that opens range next, then activation and motor control, then loading, with cool-down and self-management last.`;
  }

  const modalitiesPresent = Array.from(new Set(items.map(i => i.modality)));
  modalitiesPresent.sort((a, b) => (MODALITY_PHASE_RANK[a] || 9) - (MODALITY_PHASE_RANK[b] || 9));

  const ladder = modalitiesPresent.map(m => MODALITY_LABEL[m] || m).join(" → ");
  const irritabilityNote = ctx.irritability && /high|severe/i.test(ctx.irritability)
    ? " Higher irritability biases the early session toward passive symptom modulation and gentler dosage."
    : "";
  return `Suggested intra-session order: ${ladder || "items as listed"}. Pain/inflammation modulation precedes range work; range work precedes activation; activation precedes loading; adjuncts and self-management close the session.${irritabilityNote}`;
}

function buildPerItemRationale(
  items: PlanCartItem[],
  drivers: TreatmentRationaleDriver[],
): TreatmentRationaleItem[] {
  // Build reverse index: itemId → driver labels it addresses.
  const itemDrivers = new Map<string, string[]>();
  for (const d of drivers) {
    for (const id of d.addressedItemIds || []) {
      const arr = itemDrivers.get(id) || [];
      arr.push(d.label);
      itemDrivers.set(id, arr);
    }
  }

  return items.map(it => {
    const addresses: string[] = [];
    if (it.targetStructure) addresses.push(it.targetStructure);
    if (it.targetFinding && it.targetFinding !== it.targetStructure) addresses.push(it.targetFinding);
    const why = it.rationale
      || `Addresses ${(itemDrivers.get(it.id) || []).slice(0, 2).join(" and ").toLowerCase() || it.targetStructure || it.targetFinding || "this presentation"}.`;
    return {
      itemId: it.id,
      itemName: it.name,
      modality: it.modality,
      why,
      addresses,
    };
  });
}

/**
 * Synthesise a deterministic "Why this plan?" rationale locally, with no
 * AI call. Used as the immediate first-paint rationale and as the fallback
 * whenever the AI endpoint is unavailable or errors.
 */
export function synthesizeRationaleLocally(
  items: PlanCartItem[],
  clinicalContext: RationaleClinicalContextInput,
  sessionOrder?: OrchestratedSessionStep[],
): TreatmentRationaleResult {
  const drivers = buildDrivers(items, clinicalContext);
  const clinicalPicture = buildClinicalPicture(items, clinicalContext, drivers);
  const orderingRationale = buildOrderingRationale(items, clinicalContext, sessionOrder);
  const treatmentRationale = buildPerItemRationale(items, drivers);
  return {
    clinicalPicture,
    drivers,
    treatmentRationale,
    orderingRationale,
    generatedAt: new Date().toISOString(),
  };
}
