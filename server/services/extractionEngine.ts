import OpenAI from "openai";
import type {
  UnifiedIntakeData,
  ClinicalExtractionResult,
  ExtractedBodyRegion,
  ExtractedSymptom,
  ExtractedRedFlag,
  ExtractedAggravatingFactor,
  ExtractedEasingFactor,
  ExtractedFunctionalLimitation,
  MissingField,
  InputSourceLabel,
  PainSide,
  DurationCategory,
  OnsetType,
  IrritabilityLevel,
  SymptomBehaviour,
} from "../../shared/clinicalIntakeTypes";

const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined;
const openai = new OpenAI({ apiKey, baseURL });

const REGION_ALIASES: Record<string, string> = {
  cervical: "neck", neck: "neck",
  thoracic: "thoracic_spine", upper_back: "thoracic_spine",
  lumbar: "lumbar_spine", lower_back: "lumbar_spine", low_back: "lumbar_spine",
  shoulder: "shoulder", rotator_cuff: "shoulder",
  elbow: "elbow", tennis_elbow: "elbow", golfers_elbow: "elbow",
  wrist_hand: "wrist_hand", wrist: "wrist_hand", hand: "wrist_hand", carpal: "wrist_hand",
  hip: "hip", groin: "hip",
  knee: "knee", patella: "knee", patellofemoral: "knee",
  ankle_foot: "ankle_foot", ankle: "ankle_foot", foot: "ankle_foot", plantar: "ankle_foot",
  pelvis: "pelvis", si_joint: "pelvis", sacroiliac: "pelvis",
};

const RED_FLAG_DESCRIPTIONS: Record<string, string> = {
  night_pain: "Night pain that wakes from sleep",
  weight_loss: "Unexplained weight loss",
  fever: "Fever / feeling unwell",
  bladder_bowel: "Bladder / bowel dysfunction",
  saddle_numbness: "Saddle area numbness",
  progressive_weakness: "Progressive neurological weakness",
  trauma: "Recent significant trauma",
  cancer_history: "History of cancer",
  steroid_use: "Long-term steroid use",
  age_under_20: "Age under 20 with back pain",
  age_over_55: "Age over 55 with new onset pain",
};

const URGENT_RED_FLAGS = new Set(["bladder_bowel", "saddle_numbness", "progressive_weakness"]);

function normalizeRegion(raw: string): string {
  const key = raw.toLowerCase().replace(/[\s/-]+/g, "_").trim();
  return REGION_ALIASES[key] ?? key;
}

function inferSide(text: string): PainSide {
  const lower = text.toLowerCase();
  if (/\bbilateral\b|\bboth\b/.test(lower)) return "bilateral";
  if (/\bleft\b/.test(lower) && /\bright\b/.test(lower)) return "bilateral";
  if (/\bleft\b/.test(lower)) return "left";
  if (/\bright\b/.test(lower)) return "right";
  if (/\bcentral\b|\bmidline\b/.test(lower)) return "central";
  return "bilateral";
}

function extractFromManualForm(intake: UnifiedIntakeData): {
  regions: ExtractedBodyRegion[];
  symptoms: ExtractedSymptom[];
  aggravating: ExtractedAggravatingFactor[];
  easing: ExtractedEasingFactor[];
  redFlags: ExtractedRedFlag[];
  functional: ExtractedFunctionalLimitation[];
  duration: DurationCategory | null;
  onset: OnsetType | null;
} {
  const src: InputSourceLabel = "manual_form";
  const form = intake.manualForm;
  if (!form) return { regions: [], symptoms: [], aggravating: [], easing: [], redFlags: [], functional: [], duration: null, onset: null };

  const regions: ExtractedBodyRegion[] = [];
  if (form.painLocation) {
    regions.push({
      region: normalizeRegion(form.painLocation),
      side: form.painSide,
      confidence: 1.0,
      sourceLabel: src,
    });
  }

  const symptoms: ExtractedSymptom[] = [];
  if (form.painNature || form.painSeverity > 0) {
    symptoms.push({
      description: form.painNature ? `${form.painNature} pain` : "Pain reported",
      nature: form.painNature || "dull",
      severity: form.painSeverity,
      bodyRegion: normalizeRegion(form.painLocation || "general"),
      sourceLabel: src,
    });
  }

  const aggravating: ExtractedAggravatingFactor[] = form.aggravatingFactors.map(f => ({
    factor: f, context: "", sourceLabel: src,
  }));

  const easing: ExtractedEasingFactor[] = form.easingFactors.map(f => ({
    factor: f, context: "", sourceLabel: src,
  }));

  const redFlags: ExtractedRedFlag[] = form.redFlags.map(f => ({
    flag: f,
    description: RED_FLAG_DESCRIPTIONS[f] ?? f,
    urgency: URGENT_RED_FLAGS.has(f) ? "immediate" as const : "monitor" as const,
    sourceLabel: src,
  }));

  const functional: ExtractedFunctionalLimitation[] = [];
  if (form.functionalLimitations) {
    functional.push({
      limitation: form.functionalLimitations,
      severity: "moderate",
      sourceLabel: src,
    });
  }

  const validDurations: DurationCategory[] = ["acute", "subacute", "chronic", "recurrent"];
  const duration = validDurations.includes(form.duration as DurationCategory)
    ? (form.duration as DurationCategory)
    : null;

  const validOnsets: OnsetType[] = ["sudden", "gradual", "unknown"];
  const onset = validOnsets.includes(form.onset as OnsetType)
    ? (form.onset as OnsetType)
    : null;

  return { regions, symptoms, aggravating, easing, redFlags, functional, duration, onset };
}

function extractFromPainMarkers(intake: UnifiedIntakeData): {
  regions: ExtractedBodyRegion[];
  symptoms: ExtractedSymptom[];
} {
  const src: InputSourceLabel = "pain_markers";
  const regions: ExtractedBodyRegion[] = [];
  const symptoms: ExtractedSymptom[] = [];

  for (const pm of intake.painMarkers) {
    regions.push({
      region: normalizeRegion(pm.region),
      side: pm.side,
      confidence: 0.9,
      sourceLabel: src,
    });

    symptoms.push({
      description: pm.description || `${pm.type} at ${pm.region}`,
      nature: pm.type || "dull",
      severity: pm.severity,
      bodyRegion: normalizeRegion(pm.region),
      sourceLabel: src,
    });
  }

  return { regions, symptoms };
}

function computeIrritability(
  symptoms: ExtractedSymptom[],
  aggravating: ExtractedAggravatingFactor[],
  easing: ExtractedEasingFactor[],
  redFlags: ExtractedRedFlag[],
): IrritabilityLevel {
  let score = 0;
  const maxSeverity = Math.max(0, ...symptoms.map(s => s.severity));
  if (maxSeverity >= 8) score += 3;
  else if (maxSeverity >= 5) score += 2;
  else score += 1;

  if (aggravating.length > easing.length + 2) score += 2;
  else if (aggravating.length > easing.length) score += 1;

  if (redFlags.length > 0) score += 2;

  const hasNightPain = redFlags.some(r => r.flag === "night_pain");
  if (hasNightPain) score += 1;

  if (score >= 6) return "high";
  if (score >= 3) return "moderate";
  return "low";
}

function computeMissingFields(result: Partial<ClinicalExtractionResult>): MissingField[] {
  const missing: MissingField[] = [];

  if (!result.bodyRegions || result.bodyRegions.length === 0) {
    missing.push({
      fieldName: "bodyRegions",
      importance: "critical",
      promptQuestion: "Where is the primary area of concern?",
    });
  }

  if (!result.duration || result.duration === "unknown") {
    missing.push({
      fieldName: "duration",
      importance: "critical",
      promptQuestion: "How long have you had this problem?",
    });
  }

  if (!result.onset || result.onset === "unknown") {
    missing.push({
      fieldName: "onset",
      importance: "important",
      promptQuestion: "How did the problem start? Was there a specific event?",
    });
  }

  if (!result.aggravatingFactors || result.aggravatingFactors.length === 0) {
    missing.push({
      fieldName: "aggravatingFactors",
      importance: "important",
      promptQuestion: "What activities or movements make it worse?",
    });
  }

  if (!result.easingFactors || result.easingFactors.length === 0) {
    missing.push({
      fieldName: "easingFactors",
      importance: "optional",
      promptQuestion: "What helps ease or reduce the symptoms?",
    });
  }

  if (!result.functionalLimitations || result.functionalLimitations.length === 0) {
    missing.push({
      fieldName: "functionalLimitations",
      importance: "important",
      promptQuestion: "What daily activities are affected by this problem?",
    });
  }

  if (result.patientAge === null || result.patientAge === undefined) {
    missing.push({
      fieldName: "patientAge",
      importance: "optional",
      promptQuestion: "What is the patient's age?",
    });
  }

  if (!result.mainComplaint) {
    missing.push({
      fieldName: "mainComplaint",
      importance: "critical",
      promptQuestion: "What is the main reason for seeking treatment?",
    });
  }

  if (!result.goals) {
    missing.push({
      fieldName: "goals",
      importance: "important",
      promptQuestion: "What are the patient's treatment goals?",
    });
  }

  if (!result.priorTreatment) {
    missing.push({
      fieldName: "priorTreatment",
      importance: "optional",
      promptQuestion: "Has the patient had any previous treatment for this issue?",
    });
  }

  if (!result.recurrence) {
    missing.push({
      fieldName: "recurrence",
      importance: "optional",
      promptQuestion: "Is this a recurring problem? If so, how often?",
    });
  }

  return missing;
}

function computeSourceBreakdown(intake: UnifiedIntakeData): Record<InputSourceLabel, number> {
  const breakdown: Record<InputSourceLabel, number> = {
    manual_form: 0,
    free_text: 0,
    voice_transcription: 0,
    pain_markers: 0,
    soap_note: 0,
    clinical_conversation: 0,
  };

  if (intake.manualForm) {
    const f = intake.manualForm;
    let filled = 0;
    if (f.painLocation) filled++;
    if (f.duration) filled++;
    if (f.onset) filled++;
    if (f.painNature) filled++;
    if (f.aggravatingFactors.length > 0) filled++;
    if (f.easingFactors.length > 0) filled++;
    if (f.redFlags.length > 0) filled++;
    if (f.functionalLimitations) filled++;
    breakdown.manual_form = Math.min(1, filled / 5);
  }

  if (intake.freeText.length > 20) breakdown.free_text = Math.min(1, intake.freeText.length / 200);
  if (intake.voiceTranscription.length > 20) breakdown.voice_transcription = Math.min(1, intake.voiceTranscription.length / 200);
  if (intake.painMarkers.length > 0) breakdown.pain_markers = Math.min(1, intake.painMarkers.length / 3);

  return breakdown;
}

async function extractFromFreeTextWithAI(
  freeText: string,
  voiceText: string,
  mechanism: string,
  history: string,
): Promise<{
  regions: ExtractedBodyRegion[];
  symptoms: ExtractedSymptom[];
  aggravating: ExtractedAggravatingFactor[];
  easing: ExtractedEasingFactor[];
  redFlags: ExtractedRedFlag[];
  functional: ExtractedFunctionalLimitation[];
  duration: DurationCategory | null;
  onset: OnsetType | null;
  mechanism: string;
  recurrence: string;
  priorTreatment: string;
  goals: string;
  mainComplaint: string;
  symptomBehaviour: SymptomBehaviour;
  historyItems: string[];
}> {
  const combinedText = [freeText, voiceText, mechanism, history].filter(Boolean).join("\n\n");

  const defaultBehaviour: SymptomBehaviour = { pattern: "unknown", nightSymptoms: false, morningStiffness: false, restPain: false };

  if (combinedText.trim().length < 10) {
    return { regions: [], symptoms: [], aggravating: [], easing: [], redFlags: [], functional: [], duration: null, onset: null, mechanism: "", recurrence: "", priorTreatment: "", goals: "", mainComplaint: "", symptomBehaviour: defaultBehaviour, historyItems: [] };
  }

  const prompt = `Extract structured clinical data from this physiotherapy patient input. Only extract what is explicitly stated — do not infer or diagnose.

Patient input:
"""
${combinedText}
"""

Respond with JSON:
{
  "mainComplaint": "primary presenting complaint in one sentence",
  "bodyRegions": [{"region": "string", "side": "left|right|bilateral|central", "confidence": 0.0-1.0}],
  "symptoms": [{"description": "string", "nature": "sharp|dull|burning|throbbing|radiating|stiffness|weakness|numbness", "severity": 0-10, "bodyRegion": "string"}],
  "symptomBehaviour": {"pattern": "constant|intermittent|progressive|episodic|unknown", "nightSymptoms": false, "morningStiffness": false, "restPain": false},
  "aggravatingFactors": [{"factor": "string", "context": "string"}],
  "easingFactors": [{"factor": "string", "context": "string"}],
  "redFlags": [{"flag": "string", "description": "string", "urgency": "immediate|soon|monitor"}],
  "functionalLimitations": [{"limitation": "string", "severity": "mild|moderate|severe"}],
  "duration": "acute|subacute|chronic|recurrent|null",
  "onset": "sudden|gradual|unknown|null",
  "mechanism": "string or empty",
  "recurrence": "string describing recurrence pattern or empty",
  "priorTreatment": "string describing previous treatments or empty",
  "goals": "string describing patient goals or empty",
  "historyItems": ["string"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a clinical data extraction assistant. Extract only what is explicitly stated. Do not diagnose. Output valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Empty AI response");

    const parsed = JSON.parse(content);

    const srcFreeText: InputSourceLabel = freeText.length >= voiceText.length ? "free_text" : "voice_transcription";

    return {
      regions: (parsed.bodyRegions ?? []).map((r: Record<string, unknown>) => ({
        region: normalizeRegion(String(r.region ?? "")),
        side: (r.side as PainSide) ?? "bilateral",
        confidence: typeof r.confidence === "number" ? r.confidence : 0.7,
        sourceLabel: srcFreeText,
      })),
      symptoms: (parsed.symptoms ?? []).map((s: Record<string, unknown>) => ({
        description: String(s.description ?? ""),
        nature: String(s.nature ?? "dull"),
        severity: typeof s.severity === "number" ? s.severity : 5,
        bodyRegion: normalizeRegion(String(s.bodyRegion ?? "general")),
        sourceLabel: srcFreeText,
      })),
      aggravating: (parsed.aggravatingFactors ?? []).map((a: Record<string, unknown>) => ({
        factor: String(a.factor ?? ""),
        context: String(a.context ?? ""),
        sourceLabel: srcFreeText,
      })),
      easing: (parsed.easingFactors ?? []).map((e: Record<string, unknown>) => ({
        factor: String(e.factor ?? ""),
        context: String(e.context ?? ""),
        sourceLabel: srcFreeText,
      })),
      redFlags: (parsed.redFlags ?? []).map((r: Record<string, unknown>) => ({
        flag: String(r.flag ?? ""),
        description: String(r.description ?? ""),
        urgency: (r.urgency as "immediate" | "soon" | "monitor") ?? "monitor",
        sourceLabel: srcFreeText,
      })),
      functional: (parsed.functionalLimitations ?? []).map((f: Record<string, unknown>) => ({
        limitation: String(f.limitation ?? ""),
        severity: (f.severity as "mild" | "moderate" | "severe") ?? "moderate",
        sourceLabel: srcFreeText,
      })),
      duration: parsed.duration && parsed.duration !== "null" ? parsed.duration as DurationCategory : null,
      onset: parsed.onset && parsed.onset !== "null" ? parsed.onset as OnsetType : null,
      mechanism: parsed.mechanism ?? "",
      recurrence: String(parsed.recurrence ?? ""),
      priorTreatment: String(parsed.priorTreatment ?? ""),
      goals: String(parsed.goals ?? ""),
      mainComplaint: String(parsed.mainComplaint ?? ""),
      symptomBehaviour: {
        pattern: (parsed.symptomBehaviour?.pattern as SymptomBehaviour["pattern"]) ?? "unknown",
        nightSymptoms: Boolean(parsed.symptomBehaviour?.nightSymptoms),
        morningStiffness: Boolean(parsed.symptomBehaviour?.morningStiffness),
        restPain: Boolean(parsed.symptomBehaviour?.restPain),
      },
      historyItems: Array.isArray(parsed.historyItems) ? parsed.historyItems.map(String) : [],
    };
  } catch (error) {
    console.error("[ExtractionEngine] AI extraction failed:", error);
    return { regions: [], symptoms: [], aggravating: [], easing: [], redFlags: [], functional: [], duration: null, onset: null, mechanism: "", recurrence: "", priorTreatment: "", goals: "", mainComplaint: "", symptomBehaviour: defaultBehaviour, historyItems: [] };
  }
}

function deduplicateRegions(regions: ExtractedBodyRegion[]): ExtractedBodyRegion[] {
  const seen = new Map<string, ExtractedBodyRegion>();
  for (const r of regions) {
    const key = `${r.region}::${r.side}`;
    const existing = seen.get(key);
    if (!existing || r.confidence > existing.confidence) {
      seen.set(key, r);
    }
  }
  return Array.from(seen.values());
}

function buildRawSummary(result: ClinicalExtractionResult): string {
  const parts: string[] = [];

  if (result.bodyRegions.length > 0) {
    const regionList = result.bodyRegions.map(r => `${r.region} (${r.side})`).join(", ");
    parts.push(`Regions: ${regionList}`);
  }

  if (result.symptoms.length > 0) {
    const maxSev = Math.max(...result.symptoms.map(s => s.severity));
    parts.push(`${result.symptoms.length} symptom(s), max severity ${maxSev}/10`);
  }

  parts.push(`Duration: ${result.duration}, Onset: ${result.onset}`);

  if (result.redFlags.length > 0) {
    parts.push(`RED FLAGS: ${result.redFlags.map(r => r.description).join("; ")}`);
  }

  parts.push(`Irritability: ${result.irritability}`);
  parts.push(`Confidence: ${Math.round(result.overallConfidence * 100)}%`);

  if (result.missingFields.length > 0) {
    const critical = result.missingFields.filter(m => m.importance === "critical");
    if (critical.length > 0) {
      parts.push(`Missing critical: ${critical.map(m => m.fieldName).join(", ")}`);
    }
  }

  return parts.join(" | ");
}

export async function runExtraction(intake: UnifiedIntakeData): Promise<ClinicalExtractionResult> {
  const formData = extractFromManualForm(intake);
  const markerData = extractFromPainMarkers(intake);

  const aiData = await extractFromFreeTextWithAI(
    intake.freeText,
    intake.voiceTranscription,
    intake.mechanismOfInjury,
    intake.relevantHistory,
  );

  const allRegions = deduplicateRegions([
    ...formData.regions,
    ...markerData.regions,
    ...aiData.regions,
  ]);

  const allSymptoms = [
    ...formData.symptoms,
    ...markerData.symptoms,
    ...aiData.symptoms,
  ];

  const allAggravating = [...formData.aggravating, ...aiData.aggravating];
  const allEasing = [...formData.easing, ...aiData.easing];
  const allRedFlags = [...formData.redFlags, ...aiData.redFlags];
  const allFunctional = [...formData.functional, ...aiData.functional];

  const duration: DurationCategory = formData.duration ?? aiData.duration ?? "unknown";
  const onset: OnsetType = formData.onset ?? aiData.onset ?? "unknown";
  const mechanism = intake.mechanismOfInjury || aiData.mechanism || "";

  const irritability = computeIrritability(allSymptoms, allAggravating, allEasing, allRedFlags);

  const historyItems: string[] = [];
  if (intake.relevantHistory) historyItems.push(intake.relevantHistory);
  historyItems.push(...aiData.historyItems);
  const uniqueHistory = [...new Set(historyItems.filter(Boolean))];

  const sourceBreakdown = computeSourceBreakdown(intake);
  const activeSources = Object.values(sourceBreakdown).filter(v => v > 0).length;
  const totalData = allRegions.length + allSymptoms.length + allAggravating.length + allEasing.length + allFunctional.length;
  const baseConfidence = Math.min(1, totalData / 10);
  const sourceBonus = Math.min(0.2, activeSources * 0.05);
  const overallConfidence = Math.min(1, baseConfidence + sourceBonus);

  const mainComplaint = intake.manualForm?.mainComplaint || aiData.mainComplaint || "";
  const recurrence = intake.manualForm?.recurrence || aiData.recurrence || "";
  const priorTreatment = intake.manualForm?.priorTreatment || aiData.priorTreatment || "";
  const goals = intake.manualForm?.goals || aiData.goals || "";

  const symptomBehaviour: SymptomBehaviour = {
    pattern: aiData.symptomBehaviour.pattern !== "unknown" ? aiData.symptomBehaviour.pattern : "unknown",
    nightSymptoms: aiData.symptomBehaviour.nightSymptoms || allRedFlags.some(r => r.flag === "night_pain"),
    morningStiffness: aiData.symptomBehaviour.morningStiffness || allAggravating.some(a => a.factor.toLowerCase().includes("morning")),
    restPain: aiData.symptomBehaviour.restPain,
  };

  const partialResult: ClinicalExtractionResult = {
    mainComplaint,
    bodyRegions: allRegions,
    symptoms: allSymptoms,
    symptomBehaviour,
    duration,
    onset,
    mechanism,
    recurrence,
    aggravatingFactors: allAggravating,
    easingFactors: allEasing,
    functionalLimitations: allFunctional,
    redFlags: allRedFlags,
    irritability,
    priorTreatment,
    goals,
    patientAge: intake.patientAge,
    patientSex: intake.patientSex || "",
    relevantHistory: uniqueHistory,
    missingFields: [],
    overallConfidence,
    sourceBreakdown,
    rawSummary: "",
  };

  partialResult.missingFields = computeMissingFields(partialResult);
  partialResult.rawSummary = buildRawSummary(partialResult);

  return partialResult;
}
