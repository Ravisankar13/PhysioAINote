import { z } from "zod";

export const INPUT_SOURCE_LABELS = [
  "manual_form",
  "free_text",
  "voice_transcription",
  "pain_markers",
  "soap_note",
  "clinical_conversation",
] as const;

export type InputSourceLabel = (typeof INPUT_SOURCE_LABELS)[number];

export const painSideSchema = z.enum(["left", "right", "bilateral", "central"]);
export type PainSide = z.infer<typeof painSideSchema>;

export const durationCategorySchema = z.enum(["acute", "subacute", "chronic", "recurrent", "unknown"]);
export type DurationCategory = z.infer<typeof durationCategorySchema>;

export const onsetTypeSchema = z.enum(["sudden", "gradual", "unknown"]);
export type OnsetType = z.infer<typeof onsetTypeSchema>;

export const painNatureSchema = z.enum([
  "sharp", "dull", "burning", "throbbing", "radiating", "stiffness", "weakness", "numbness",
]);
export type PainNature = z.infer<typeof painNatureSchema>;

export const irritabilityLevelSchema = z.enum(["low", "moderate", "high"]);
export type IrritabilityLevel = z.infer<typeof irritabilityLevelSchema>;

export interface PainMarkerSummary {
  id: string;
  region: string;
  side: PainSide;
  type: string;
  severity: number;
  description?: string;
  subjectiveHistory?: string;
}

export interface ManualFormInput {
  painLocation: string;
  painSide: PainSide;
  duration: string;
  onset: string;
  aggravatingFactors: string[];
  easingFactors: string[];
  painNature: string;
  painSeverity: number;
  functionalLimitations: string;
  redFlags: string[];
  additionalNotes: string;
}

export interface UnifiedIntakeData {
  sources: InputSourceLabel[];
  manualForm: ManualFormInput | null;
  freeText: string;
  voiceTranscription: string;
  painMarkers: PainMarkerSummary[];
  mechanismOfInjury: string;
  patientAge: number | null;
  patientSex: string;
  relevantHistory: string;
}

export const unifiedIntakeSchema = z.object({
  sources: z.array(z.enum(INPUT_SOURCE_LABELS as unknown as [string, ...string[]])),
  manualForm: z.object({
    painLocation: z.string(),
    painSide: painSideSchema,
    duration: z.string(),
    onset: z.string(),
    aggravatingFactors: z.array(z.string()),
    easingFactors: z.array(z.string()),
    painNature: z.string(),
    painSeverity: z.number().min(0).max(10),
    functionalLimitations: z.string(),
    redFlags: z.array(z.string()),
    additionalNotes: z.string(),
  }).nullable(),
  freeText: z.string(),
  voiceTranscription: z.string(),
  painMarkers: z.array(z.object({
    id: z.string(),
    region: z.string(),
    side: painSideSchema,
    type: z.string(),
    severity: z.number().min(0).max(10),
    description: z.string().optional(),
    subjectiveHistory: z.string().optional(),
  })),
  mechanismOfInjury: z.string(),
  patientAge: z.number().nullable(),
  patientSex: z.string(),
  relevantHistory: z.string(),
});

export interface ExtractedBodyRegion {
  region: string;
  side: PainSide;
  confidence: number;
  sourceLabel: InputSourceLabel;
}

export interface ExtractedSymptom {
  description: string;
  nature: PainNature | string;
  severity: number;
  bodyRegion: string;
  sourceLabel: InputSourceLabel;
}

export interface ExtractedRedFlag {
  flag: string;
  description: string;
  urgency: "immediate" | "soon" | "monitor";
  sourceLabel: InputSourceLabel;
}

export interface ExtractedAggravatingFactor {
  factor: string;
  context: string;
  sourceLabel: InputSourceLabel;
}

export interface ExtractedEasingFactor {
  factor: string;
  context: string;
  sourceLabel: InputSourceLabel;
}

export interface ExtractedFunctionalLimitation {
  limitation: string;
  severity: "mild" | "moderate" | "severe";
  sourceLabel: InputSourceLabel;
}

export interface MissingField {
  fieldName: string;
  importance: "critical" | "important" | "optional";
  promptQuestion: string;
}

export interface ClinicalExtractionResult {
  bodyRegions: ExtractedBodyRegion[];
  symptoms: ExtractedSymptom[];
  duration: DurationCategory;
  onset: OnsetType;
  mechanism: string;
  aggravatingFactors: ExtractedAggravatingFactor[];
  easingFactors: ExtractedEasingFactor[];
  functionalLimitations: ExtractedFunctionalLimitation[];
  redFlags: ExtractedRedFlag[];
  irritability: IrritabilityLevel;
  patientAge: number | null;
  patientSex: string;
  relevantHistory: string[];
  missingFields: MissingField[];
  overallConfidence: number;
  sourceBreakdown: Record<InputSourceLabel, number>;
  rawSummary: string;
}

export const extractionResultSchema = z.object({
  bodyRegions: z.array(z.object({
    region: z.string(),
    side: painSideSchema,
    confidence: z.number(),
    sourceLabel: z.string(),
  })),
  symptoms: z.array(z.object({
    description: z.string(),
    nature: z.string(),
    severity: z.number(),
    bodyRegion: z.string(),
    sourceLabel: z.string(),
  })),
  duration: durationCategorySchema,
  onset: onsetTypeSchema,
  mechanism: z.string(),
  aggravatingFactors: z.array(z.object({
    factor: z.string(),
    context: z.string(),
    sourceLabel: z.string(),
  })),
  easingFactors: z.array(z.object({
    factor: z.string(),
    context: z.string(),
    sourceLabel: z.string(),
  })),
  functionalLimitations: z.array(z.object({
    limitation: z.string(),
    severity: z.enum(["mild", "moderate", "severe"]),
    sourceLabel: z.string(),
  })),
  redFlags: z.array(z.object({
    flag: z.string(),
    description: z.string(),
    urgency: z.enum(["immediate", "soon", "monitor"]),
    sourceLabel: z.string(),
  })),
  irritability: irritabilityLevelSchema,
  patientAge: z.number().nullable(),
  patientSex: z.string(),
  relevantHistory: z.array(z.string()),
  missingFields: z.array(z.object({
    fieldName: z.string(),
    importance: z.enum(["critical", "important", "optional"]),
    promptQuestion: z.string(),
  })),
  overallConfidence: z.number(),
  sourceBreakdown: z.record(z.number()),
  rawSummary: z.string(),
});
