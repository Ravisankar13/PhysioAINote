import type { ClinicalExtractionResult, DurationCategory, IrritabilityLevel } from "@shared/clinicalIntakeTypes";
import type { StructuredReasoningResult } from "@/components/skeleton/StructuredReasoningTab";

export type DiabetesStatus = "none" | "type1" | "type2" | "prediabetic";
export type ThyroidStatus = "normal" | "hypothyroid" | "hyperthyroid";
export type SmokingStatus = "never" | "former" | "current";
export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";
export type PsychologicalRisk = "low" | "moderate" | "high";
export type SleepQuality = "good" | "fair" | "poor";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "athletic";
export type SideAffected = "dominant" | "non_dominant" | "bilateral" | "axial";

export interface PatientFactors {
  age: number | null;
  bmi: BmiCategory;
  diabetes: DiabetesStatus;
  thyroid: ThyroidStatus;
  smoking: SmokingStatus;
  steroidInjectionHistory: boolean;
  steroidInjectionCount: number;
  previousEpisodes: number;
  chronicity: DurationCategory;
  irritability: IrritabilityLevel;
  compliance: number;
  psychologicalRisk: PsychologicalRisk;
  sleepQuality: SleepQuality;
  activityLevel: ActivityLevel;
  sideAffected: SideAffected;
  medicationUse: string[];
  comorbiditiesNotes: string;
}

export const DEFAULT_PATIENT_FACTORS: PatientFactors = {
  age: null,
  bmi: "normal",
  diabetes: "none",
  thyroid: "normal",
  smoking: "never",
  steroidInjectionHistory: false,
  steroidInjectionCount: 0,
  previousEpisodes: 0,
  chronicity: "unknown",
  irritability: "moderate",
  compliance: 80,
  psychologicalRisk: "low",
  sleepQuality: "good",
  activityLevel: "moderate",
  sideAffected: "dominant",
  medicationUse: [],
  comorbiditiesNotes: "",
};

export interface RecoveryPhase {
  name: string;
  durationWeeksMin: number;
  durationWeeksMax: number;
  treatmentResponsiveness: Record<string, number>;
  romCeilingPercent: number;
  functionalMilestoneThreshold: number;
  description: string;
}

export interface ConditionRecoveryProfile {
  conditionId: string;
  conditionName: string;
  category: string;
  phases: RecoveryPhase[];
  totalRecoveryWeeksMin: number;
  totalRecoveryWeeksMax: number;
  expectedRomRecoveryPercent: number;
  recurrenceRiskPercent: number;
  keyPrognosticFactors: string[];
  contraindicatedInterventions: string[];
}

export interface PatientModifierProfile {
  healingRateMultiplier: number;
  painSensitivityMultiplier: number;
  complianceMultiplier: number;
  recurrenceRiskMultiplier: number;
  tissueQualityMultiplier: number;
  psychosocialMultiplier: number;
  overallRecoveryMultiplier: number;
  riskFlags: string[];
  positiveFactors: string[];
  modifierBreakdown: { factor: string; effect: string; multiplier: number }[];
}

function ageHealingMultiplier(age: number | null): number {
  if (age === null) return 1.0;
  if (age < 25) return 1.15;
  if (age < 35) return 1.05;
  if (age < 45) return 1.0;
  if (age < 55) return 0.9;
  if (age < 65) return 0.8;
  if (age < 75) return 0.7;
  return 0.6;
}

function agePainMultiplier(age: number | null): number {
  if (age === null) return 1.0;
  if (age < 30) return 0.9;
  if (age < 50) return 1.0;
  if (age < 65) return 1.1;
  return 1.2;
}

export function computePatientModifiers(factors: PatientFactors): PatientModifierProfile {
  const breakdown: PatientModifierProfile["modifierBreakdown"] = [];
  const riskFlags: string[] = [];
  const positiveFactors: string[] = [];

  let healingRate = 1.0;
  let painSensitivity = 1.0;
  let complianceMult = factors.compliance / 100;
  let recurrenceRisk = 1.0;
  let tissueQuality = 1.0;
  let psychosocial = 1.0;

  const ageHeal = ageHealingMultiplier(factors.age);
  healingRate *= ageHeal;
  breakdown.push({ factor: "Age", effect: factors.age !== null ? `${factors.age}y` : "Unknown", multiplier: ageHeal });
  if (factors.age !== null && factors.age >= 55) riskFlags.push("Age >55 — slower tissue healing");
  if (factors.age !== null && factors.age < 30) positiveFactors.push("Young age — faster healing capacity");

  const agePain = agePainMultiplier(factors.age);
  painSensitivity *= agePain;

  if (factors.diabetes === "type1") {
    healingRate *= 0.7;
    tissueQuality *= 0.75;
    riskFlags.push("Type 1 diabetes — impaired healing, microangiopathy risk");
    breakdown.push({ factor: "Diabetes T1", effect: "Impaired healing", multiplier: 0.7 });
  } else if (factors.diabetes === "type2") {
    healingRate *= 0.8;
    tissueQuality *= 0.85;
    riskFlags.push("Type 2 diabetes — delayed healing, neuropathy screening needed");
    breakdown.push({ factor: "Diabetes T2", effect: "Delayed healing", multiplier: 0.8 });
  } else if (factors.diabetes === "prediabetic") {
    healingRate *= 0.9;
    breakdown.push({ factor: "Prediabetic", effect: "Mildly delayed healing", multiplier: 0.9 });
  }

  if (factors.thyroid === "hypothyroid") {
    healingRate *= 0.85;
    breakdown.push({ factor: "Hypothyroid", effect: "Slower metabolism/healing", multiplier: 0.85 });
    riskFlags.push("Hypothyroidism — slower metabolic recovery");
  } else if (factors.thyroid === "hyperthyroid") {
    tissueQuality *= 0.9;
    breakdown.push({ factor: "Hyperthyroid", effect: "Tissue quality concern", multiplier: 0.9 });
  }

  if (factors.smoking === "current") {
    healingRate *= 0.7;
    tissueQuality *= 0.75;
    riskFlags.push("Active smoker — significant healing impairment, vasoconstriction");
    breakdown.push({ factor: "Smoking (current)", effect: "Major healing impairment", multiplier: 0.7 });
  } else if (factors.smoking === "former") {
    healingRate *= 0.9;
    breakdown.push({ factor: "Smoking (former)", effect: "Minor residual effect", multiplier: 0.9 });
  } else {
    positiveFactors.push("Non-smoker");
  }

  if (factors.bmi === "obese") {
    healingRate *= 0.85;
    recurrenceRisk *= 1.3;
    riskFlags.push("Obesity — increased joint loading, slower recovery");
    breakdown.push({ factor: "BMI (Obese)", effect: "Increased load, slower recovery", multiplier: 0.85 });
  } else if (factors.bmi === "overweight") {
    recurrenceRisk *= 1.1;
    breakdown.push({ factor: "BMI (Overweight)", effect: "Mild load increase", multiplier: 0.95 });
    healingRate *= 0.95;
  } else if (factors.bmi === "underweight") {
    tissueQuality *= 0.9;
    breakdown.push({ factor: "BMI (Underweight)", effect: "Reduced tissue reserves", multiplier: 0.9 });
  }

  if (factors.steroidInjectionHistory) {
    const injCount = factors.steroidInjectionCount;
    if (injCount >= 3) {
      tissueQuality *= 0.7;
      riskFlags.push(`${injCount} steroid injections — significant tissue weakening risk`);
      breakdown.push({ factor: "Steroid injections", effect: `${injCount}x — tissue degradation`, multiplier: 0.7 });
    } else if (injCount >= 1) {
      tissueQuality *= 0.85;
      breakdown.push({ factor: "Steroid injections", effect: `${injCount}x — mild tissue effect`, multiplier: 0.85 });
    }
  }

  if (factors.previousEpisodes >= 3) {
    recurrenceRisk *= 1.5;
    riskFlags.push(`${factors.previousEpisodes} previous episodes — high recurrence risk`);
    breakdown.push({ factor: "Previous episodes", effect: `${factors.previousEpisodes}x — high recurrence`, multiplier: 1.5 });
  } else if (factors.previousEpisodes >= 1) {
    recurrenceRisk *= 1.2;
    breakdown.push({ factor: "Previous episodes", effect: `${factors.previousEpisodes}x — moderate recurrence`, multiplier: 1.2 });
  }

  if (factors.chronicity === "chronic") {
    healingRate *= 0.75;
    recurrenceRisk *= 1.3;
    riskFlags.push("Chronic condition — central sensitization risk, longer recovery expected");
    breakdown.push({ factor: "Chronicity", effect: "Chronic — prolonged recovery", multiplier: 0.75 });
  } else if (factors.chronicity === "recurrent") {
    recurrenceRisk *= 1.4;
    breakdown.push({ factor: "Chronicity", effect: "Recurrent — high re-injury risk", multiplier: 0.85 });
    healingRate *= 0.85;
  } else if (factors.chronicity === "acute") {
    positiveFactors.push("Acute presentation — better prognosis");
    breakdown.push({ factor: "Chronicity", effect: "Acute — good prognosis", multiplier: 1.05 });
    healingRate *= 1.05;
  }

  if (factors.irritability === "high") {
    painSensitivity *= 1.3;
    breakdown.push({ factor: "Irritability", effect: "High — careful dosing needed", multiplier: 0.85 });
    healingRate *= 0.85;
    riskFlags.push("High irritability — risk of flare-up with aggressive treatment");
  } else if (factors.irritability === "low") {
    positiveFactors.push("Low irritability — tolerates treatment well");
    breakdown.push({ factor: "Irritability", effect: "Low — good tolerance", multiplier: 1.05 });
    healingRate *= 1.05;
  }

  if (factors.psychologicalRisk === "high") {
    psychosocial = 0.7;
    riskFlags.push("High psychosocial risk — fear-avoidance, catastrophizing possible");
    breakdown.push({ factor: "Psychological risk", effect: "High — fear-avoidance likely", multiplier: 0.7 });
  } else if (factors.psychologicalRisk === "moderate") {
    psychosocial = 0.85;
    breakdown.push({ factor: "Psychological risk", effect: "Moderate — monitor coping", multiplier: 0.85 });
  } else {
    positiveFactors.push("Low psychological risk — positive coping");
  }

  if (factors.sleepQuality === "poor") {
    healingRate *= 0.8;
    painSensitivity *= 1.2;
    riskFlags.push("Poor sleep — impaired recovery, heightened pain sensitivity");
    breakdown.push({ factor: "Sleep quality", effect: "Poor — impaired recovery", multiplier: 0.8 });
  } else if (factors.sleepQuality === "fair") {
    healingRate *= 0.9;
    breakdown.push({ factor: "Sleep quality", effect: "Fair — suboptimal recovery", multiplier: 0.9 });
  }

  if (factors.activityLevel === "sedentary") {
    healingRate *= 0.85;
    recurrenceRisk *= 1.2;
    riskFlags.push("Sedentary lifestyle — deconditioning risk");
    breakdown.push({ factor: "Activity level", effect: "Sedentary — deconditioning", multiplier: 0.85 });
  } else if (factors.activityLevel === "athletic") {
    healingRate *= 1.1;
    positiveFactors.push("Athletic — higher baseline fitness");
    breakdown.push({ factor: "Activity level", effect: "Athletic — faster recovery", multiplier: 1.1 });
  }

  if (factors.compliance < 50) {
    riskFlags.push("Low compliance expected — treatment adherence strategies needed");
  } else if (factors.compliance >= 90) {
    positiveFactors.push("High expected compliance");
  }

  const overallRecovery = Math.max(0.3, Math.min(1.5,
    healingRate * 0.35 +
    (1 / Math.max(0.5, painSensitivity)) * 0.15 +
    complianceMult * 0.2 +
    tissueQuality * 0.15 +
    psychosocial * 0.15
  ));

  return {
    healingRateMultiplier: Math.round(healingRate * 100) / 100,
    painSensitivityMultiplier: Math.round(painSensitivity * 100) / 100,
    complianceMultiplier: Math.round(complianceMult * 100) / 100,
    recurrenceRiskMultiplier: Math.round(recurrenceRisk * 100) / 100,
    tissueQualityMultiplier: Math.round(tissueQuality * 100) / 100,
    psychosocialMultiplier: Math.round(psychosocial * 100) / 100,
    overallRecoveryMultiplier: Math.round(overallRecovery * 100) / 100,
    riskFlags,
    positiveFactors,
    modifierBreakdown: breakdown,
  };
}

export function autoPopulateFromPipeline(
  extraction: ClinicalExtractionResult | null,
  reasoning: StructuredReasoningResult | null,
  currentFactors: PatientFactors,
): PatientFactors {
  const updated = { ...currentFactors };

  if (extraction) {
    if (extraction.patientAge !== null && extraction.patientAge > 0) {
      updated.age = extraction.patientAge;
    }
    if (extraction.irritability) {
      updated.irritability = extraction.irritability;
    }
    if (extraction.duration && extraction.duration !== "unknown") {
      updated.chronicity = extraction.duration;
    }
    if (extraction.relevantHistory && extraction.relevantHistory.length > 0) {
      const historyText = extraction.relevantHistory.join(" ").toLowerCase();
      if (historyText.includes("diabetes") || historyText.includes("diabetic")) {
        if (historyText.includes("type 1") || historyText.includes("type i")) {
          updated.diabetes = "type1";
        } else if (historyText.includes("type 2") || historyText.includes("type ii")) {
          updated.diabetes = "type2";
        } else {
          updated.diabetes = "type2";
        }
      }
      if (historyText.includes("hypothyroid") || historyText.includes("hashimoto")) {
        updated.thyroid = "hypothyroid";
      } else if (historyText.includes("hyperthyroid") || historyText.includes("graves")) {
        updated.thyroid = "hyperthyroid";
      }
      if (historyText.includes("smok")) {
        if (historyText.includes("ex-smok") || historyText.includes("former smok") || historyText.includes("quit smok")) {
          updated.smoking = "former";
        } else {
          updated.smoking = "current";
        }
      }
      if (historyText.includes("steroid injection") || historyText.includes("cortisone")) {
        updated.steroidInjectionHistory = true;
        const countMatch = historyText.match(/(\d+)\s*(?:steroid|cortisone)\s*injection/);
        if (countMatch) {
          updated.steroidInjectionCount = parseInt(countMatch[1], 10);
        } else {
          updated.steroidInjectionCount = 1;
        }
      }
      const episodeMatch = historyText.match(/(\d+)\s*(?:previous|prior|past)\s*(?:episode|occurrence|bout)/);
      if (episodeMatch) {
        updated.previousEpisodes = parseInt(episodeMatch[1], 10);
      } else if (historyText.includes("recurrent") || historyText.includes("recurring")) {
        updated.previousEpisodes = Math.max(updated.previousEpisodes, 2);
      }
      updated.comorbiditiesNotes = extraction.relevantHistory.join("; ");
    }
    if (extraction.recurrence && extraction.recurrence.toLowerCase() !== "none" && extraction.recurrence.trim() !== "") {
      updated.previousEpisodes = Math.max(updated.previousEpisodes, 1);
    }
  }

  if (reasoning) {
    if (reasoning.irritability) {
      updated.irritability = reasoning.irritability.level;
    }
    if (reasoning.stage) {
      const stageLabel = reasoning.stage.stage.toLowerCase();
      if (stageLabel.includes("chronic") || stageLabel.includes("late")) {
        updated.chronicity = "chronic";
      } else if (stageLabel.includes("subacute") || stageLabel.includes("mid")) {
        updated.chronicity = "subacute";
      } else if (stageLabel.includes("acute") || stageLabel.includes("early")) {
        updated.chronicity = "acute";
      }
    }
    if (reasoning.modifiers) {
      for (const bucket of reasoning.modifiers) {
        const allMods = bucket.modifiers.join(" ").toLowerCase();
        if (bucket.category === "behavioural") {
          if (allMods.includes("fear") || allMods.includes("catastroph") || allMods.includes("anxiety") || allMods.includes("depression")) {
            updated.psychologicalRisk = allMods.includes("high") || allMods.includes("significant") ? "high" : "moderate";
          }
        }
        if (allMods.includes("poor sleep") || allMods.includes("insomnia")) {
          updated.sleepQuality = "poor";
        } else if (allMods.includes("disrupted sleep")) {
          updated.sleepQuality = "fair";
        }
        if (allMods.includes("sedentary")) {
          updated.activityLevel = "sedentary";
        } else if (allMods.includes("athlet") || allMods.includes("high-level sport")) {
          updated.activityLevel = "athletic";
        }
      }
    }
  }

  return updated;
}

const ROTATOR_CUFF_TENDINOPATHY: ConditionRecoveryProfile = {
  conditionId: "rotator_cuff_tendinopathy",
  conditionName: "Rotator Cuff Tendinopathy",
  category: "shoulder",
  phases: [
    {
      name: "Pain-Dominant / Load Management",
      durationWeeksMin: 2,
      durationWeeksMax: 4,
      treatmentResponsiveness: { isometric_exercise: 1.2, manual_therapy: 1.1, education: 1.3, heavy_load: 0.3, stretching: 0.7 },
      romCeilingPercent: 70,
      functionalMilestoneThreshold: 30,
      description: "Focus on pain education, isometric loading below pain threshold, activity modification.",
    },
    {
      name: "Load Introduction",
      durationWeeksMin: 4,
      durationWeeksMax: 8,
      treatmentResponsiveness: { isotonic_exercise: 1.3, eccentric_exercise: 1.2, manual_therapy: 1.0, isometric_exercise: 0.8 },
      romCeilingPercent: 85,
      functionalMilestoneThreshold: 55,
      description: "Progressive loading with isotonic and eccentric exercises, gradual ROM increase.",
    },
    {
      name: "Functional Loading",
      durationWeeksMin: 4,
      durationWeeksMax: 8,
      treatmentResponsiveness: { functional_exercise: 1.3, sport_specific: 1.2, eccentric_exercise: 1.0, manual_therapy: 0.6 },
      romCeilingPercent: 95,
      functionalMilestoneThreshold: 80,
      description: "Return to functional activities, sport-specific loading, energy storage exercises.",
    },
  ],
  totalRecoveryWeeksMin: 10,
  totalRecoveryWeeksMax: 20,
  expectedRomRecoveryPercent: 95,
  recurrenceRiskPercent: 25,
  keyPrognosticFactors: ["Load management adherence", "Age", "Tendon quality", "Overhead demands"],
  contraindicatedInterventions: ["Aggressive passive stretching in pain-dominant phase", "High-velocity manipulation of glenohumeral joint"],
};

const FROZEN_SHOULDER: ConditionRecoveryProfile = {
  conditionId: "frozen_shoulder",
  conditionName: "Adhesive Capsulitis (Frozen Shoulder)",
  category: "shoulder",
  phases: [
    {
      name: "Freezing / Painful Phase",
      durationWeeksMin: 6,
      durationWeeksMax: 36,
      treatmentResponsiveness: { education: 1.3, gentle_rom: 0.8, manual_therapy: 0.7, aggressive_stretching: 0.2, corticosteroid: 1.4 },
      romCeilingPercent: 40,
      functionalMilestoneThreshold: 20,
      description: "Pain management, gentle pendulum exercises, education about natural history.",
    },
    {
      name: "Frozen / Stiff Phase",
      durationWeeksMin: 4,
      durationWeeksMax: 24,
      treatmentResponsiveness: { stretching: 1.2, manual_therapy: 1.3, exercise: 1.1, hydrodilatation: 1.3 },
      romCeilingPercent: 65,
      functionalMilestoneThreshold: 45,
      description: "Progressive stretching, joint mobilization, functional exercises.",
    },
    {
      name: "Thawing / Recovery Phase",
      durationWeeksMin: 6,
      durationWeeksMax: 24,
      treatmentResponsiveness: { exercise: 1.3, stretching: 1.1, functional_training: 1.2, manual_therapy: 0.8 },
      romCeilingPercent: 90,
      functionalMilestoneThreshold: 75,
      description: "Active ROM restoration, strengthening, functional return.",
    },
  ],
  totalRecoveryWeeksMin: 16,
  totalRecoveryWeeksMax: 84,
  expectedRomRecoveryPercent: 90,
  recurrenceRiskPercent: 15,
  keyPrognosticFactors: ["Diabetes status", "Thyroid function", "Duration of symptoms", "Bilateral risk"],
  contraindicatedInterventions: ["Forceful manipulation under anaesthesia in freezing phase", "Aggressive stretching in acute pain phase"],
};

const ACL_RECONSTRUCTION: ConditionRecoveryProfile = {
  conditionId: "acl_reconstruction",
  conditionName: "ACL Reconstruction Rehabilitation",
  category: "knee",
  phases: [
    {
      name: "Acute / Protection Phase",
      durationWeeksMin: 1,
      durationWeeksMax: 2,
      treatmentResponsiveness: { cryotherapy: 1.3, gentle_rom: 1.2, quad_activation: 1.4, weight_bearing: 0.5 },
      romCeilingPercent: 30,
      functionalMilestoneThreshold: 10,
      description: "Protect graft, reduce effusion, restore quad activation, early weight bearing as tolerated.",
    },
    {
      name: "Early Rehabilitation",
      durationWeeksMin: 2,
      durationWeeksMax: 6,
      treatmentResponsiveness: { rom_exercise: 1.3, closed_chain_exercise: 1.2, manual_therapy: 1.0, open_chain_extension: 0.3 },
      romCeilingPercent: 75,
      functionalMilestoneThreshold: 30,
      description: "Restore full extension, progressive flexion, closed-chain strengthening.",
    },
    {
      name: "Strengthening Phase",
      durationWeeksMin: 6,
      durationWeeksMax: 12,
      treatmentResponsiveness: { progressive_resistance: 1.3, neuromuscular_training: 1.4, proprioception: 1.3, running: 0.4 },
      romCeilingPercent: 95,
      functionalMilestoneThreshold: 60,
      description: "Progressive strength, neuromuscular control, proprioception training.",
    },
    {
      name: "Return to Sport",
      durationWeeksMin: 12,
      durationWeeksMax: 24,
      treatmentResponsiveness: { plyometrics: 1.3, agility: 1.3, sport_specific: 1.4, cutting: 1.2 },
      romCeilingPercent: 100,
      functionalMilestoneThreshold: 90,
      description: "Sport-specific drills, plyometrics, psychological readiness, RTS testing.",
    },
  ],
  totalRecoveryWeeksMin: 21,
  totalRecoveryWeeksMax: 44,
  expectedRomRecoveryPercent: 100,
  recurrenceRiskPercent: 20,
  keyPrognosticFactors: ["Graft type", "Quad strength symmetry", "Psychological readiness", "Age", "Sport demands"],
  contraindicatedInterventions: ["Open-chain knee extension 0-45° early phase", "Pivoting/cutting before 6 months"],
};

const LUMBAR_DISC_HERNIATION: ConditionRecoveryProfile = {
  conditionId: "lumbar_disc_herniation",
  conditionName: "Lumbar Disc Herniation",
  category: "spine",
  phases: [
    {
      name: "Acute / Neural Protection",
      durationWeeksMin: 1,
      durationWeeksMax: 4,
      treatmentResponsiveness: { directional_preference: 1.4, neural_mobilization: 1.1, manual_therapy: 0.9, flexion_exercise: 0.3, education: 1.3 },
      romCeilingPercent: 50,
      functionalMilestoneThreshold: 20,
      description: "Pain centralization, directional preference exercises, neural tension management.",
    },
    {
      name: "Motor Control / Stabilization",
      durationWeeksMin: 4,
      durationWeeksMax: 8,
      treatmentResponsiveness: { motor_control: 1.4, core_stability: 1.3, manual_therapy: 1.0, neural_mobilization: 1.1 },
      romCeilingPercent: 75,
      functionalMilestoneThreshold: 50,
      description: "Deep stabilizer retraining, progressive loading, movement control.",
    },
    {
      name: "Functional Integration",
      durationWeeksMin: 4,
      durationWeeksMax: 12,
      treatmentResponsiveness: { functional_exercise: 1.3, progressive_loading: 1.2, sport_specific: 1.1, manual_therapy: 0.7 },
      romCeilingPercent: 90,
      functionalMilestoneThreshold: 80,
      description: "Return to activities, ergonomic training, progressive functional loading.",
    },
  ],
  totalRecoveryWeeksMin: 9,
  totalRecoveryWeeksMax: 24,
  expectedRomRecoveryPercent: 90,
  recurrenceRiskPercent: 35,
  keyPrognosticFactors: ["Centralization response", "Neurological deficit", "Duration of radiculopathy", "Psychosocial factors"],
  contraindicatedInterventions: ["Sustained flexion in acute phase", "Heavy deadlifts early phase", "High-velocity spinal manipulation with progressive neurological deficit"],
};

const LATERAL_EPICONDYLALGIA: ConditionRecoveryProfile = {
  conditionId: "lateral_epicondylalgia",
  conditionName: "Lateral Epicondylalgia (Tennis Elbow)",
  category: "elbow",
  phases: [
    {
      name: "Pain Management & Load Modification",
      durationWeeksMin: 2,
      durationWeeksMax: 4,
      treatmentResponsiveness: { isometric_exercise: 1.3, education: 1.2, manual_therapy: 1.1, grip_strengthening: 0.5, counterforce_brace: 1.1 },
      romCeilingPercent: 80,
      functionalMilestoneThreshold: 25,
      description: "Isometric wrist extension, load modification, ergonomic advice.",
    },
    {
      name: "Progressive Loading",
      durationWeeksMin: 4,
      durationWeeksMax: 8,
      treatmentResponsiveness: { eccentric_exercise: 1.4, isotonic_exercise: 1.2, manual_therapy: 0.9, heavy_slow_resistance: 1.3 },
      romCeilingPercent: 90,
      functionalMilestoneThreshold: 55,
      description: "Eccentric and heavy slow resistance training, grip strengthening.",
    },
    {
      name: "Functional Return",
      durationWeeksMin: 4,
      durationWeeksMax: 8,
      treatmentResponsiveness: { functional_exercise: 1.3, sport_specific: 1.2, grip_endurance: 1.2 },
      romCeilingPercent: 100,
      functionalMilestoneThreshold: 85,
      description: "Return to full grip activities, sport/work-specific loading.",
    },
  ],
  totalRecoveryWeeksMin: 10,
  totalRecoveryWeeksMax: 20,
  expectedRomRecoveryPercent: 100,
  recurrenceRiskPercent: 30,
  keyPrognosticFactors: ["Duration", "Grip strength deficit", "Occupational demands", "Prior steroid injections"],
  contraindicatedInterventions: ["Repeated steroid injections (>2)", "Aggressive stretching in reactive phase"],
};

const PATELLOFEMORAL_PAIN: ConditionRecoveryProfile = {
  conditionId: "patellofemoral_pain",
  conditionName: "Patellofemoral Pain Syndrome",
  category: "knee",
  phases: [
    {
      name: "Load Management & Education",
      durationWeeksMin: 2,
      durationWeeksMax: 4,
      treatmentResponsiveness: { education: 1.3, taping: 1.1, isometric_quad: 1.2, hip_strengthening: 1.3, deep_squat: 0.3 },
      romCeilingPercent: 80,
      functionalMilestoneThreshold: 25,
      description: "Activity modification, hip and quad isometrics, patellar taping if beneficial.",
    },
    {
      name: "Progressive Strengthening",
      durationWeeksMin: 4,
      durationWeeksMax: 8,
      treatmentResponsiveness: { hip_strengthening: 1.4, quad_strengthening: 1.3, functional_exercise: 1.2, running: 0.7 },
      romCeilingPercent: 90,
      functionalMilestoneThreshold: 55,
      description: "Hip abductor/external rotator strengthening, progressive quad loading.",
    },
    {
      name: "Return to Activity",
      durationWeeksMin: 4,
      durationWeeksMax: 8,
      treatmentResponsiveness: { running_program: 1.3, plyometrics: 1.1, sport_specific: 1.2, manual_therapy: 0.6 },
      romCeilingPercent: 100,
      functionalMilestoneThreshold: 85,
      description: "Graduated return to running, sport-specific activities.",
    },
  ],
  totalRecoveryWeeksMin: 10,
  totalRecoveryWeeksMax: 20,
  expectedRomRecoveryPercent: 100,
  recurrenceRiskPercent: 40,
  keyPrognosticFactors: ["Hip strength", "VMO timing", "Kinetic chain control", "Training load management"],
  contraindicatedInterventions: ["Deep squats/lunges in pain-dominant phase", "Excessive stair/hill running early"],
};

const ACHILLES_TENDINOPATHY: ConditionRecoveryProfile = {
  conditionId: "achilles_tendinopathy",
  conditionName: "Achilles Tendinopathy",
  category: "ankle",
  phases: [
    {
      name: "Pain Management & Isometric Loading",
      durationWeeksMin: 2,
      durationWeeksMax: 4,
      treatmentResponsiveness: { isometric_exercise: 1.3, education: 1.2, heel_raise_modification: 1.1, running: 0.2, stretching: 0.5 },
      romCeilingPercent: 80,
      functionalMilestoneThreshold: 25,
      description: "Isometric calf raises, load management, avoid compressive loads on insertion.",
    },
    {
      name: "Heavy Slow Resistance",
      durationWeeksMin: 6,
      durationWeeksMax: 12,
      treatmentResponsiveness: { heavy_slow_resistance: 1.4, eccentric_exercise: 1.3, isotonic_exercise: 1.1, plyometrics: 0.4 },
      romCeilingPercent: 90,
      functionalMilestoneThreshold: 55,
      description: "Progressive heavy slow resistance, eccentric loading, graduated calf strengthening.",
    },
    {
      name: "Energy Storage & Return to Sport",
      durationWeeksMin: 4,
      durationWeeksMax: 8,
      treatmentResponsiveness: { plyometrics: 1.3, running_program: 1.3, sport_specific: 1.2, heavy_slow_resistance: 0.9 },
      romCeilingPercent: 100,
      functionalMilestoneThreshold: 85,
      description: "Energy storage exercises, plyometrics, graduated running return.",
    },
  ],
  totalRecoveryWeeksMin: 12,
  totalRecoveryWeeksMax: 24,
  expectedRomRecoveryPercent: 100,
  recurrenceRiskPercent: 30,
  keyPrognosticFactors: ["Tendon quality", "Load management", "Calf endurance", "Biomechanical factors"],
  contraindicatedInterventions: ["Passive stretching of insertional tendinopathy", "Fluoroquinolone antibiotics", "Steroid injection into tendon"],
};

const ANKLE_SPRAIN_LATERAL: ConditionRecoveryProfile = {
  conditionId: "ankle_sprain_lateral",
  conditionName: "Lateral Ankle Sprain",
  category: "ankle",
  phases: [
    {
      name: "Acute / Protection (POLICE)",
      durationWeeksMin: 1,
      durationWeeksMax: 2,
      treatmentResponsiveness: { cryotherapy: 1.2, compression: 1.2, early_weight_bearing: 1.3, immobilization: 0.6, manual_therapy: 0.8 },
      romCeilingPercent: 50,
      functionalMilestoneThreshold: 15,
      description: "Protection, optimal loading, ice, compression, elevation. Early weight bearing.",
    },
    {
      name: "Subacute / Restoration",
      durationWeeksMin: 2,
      durationWeeksMax: 4,
      treatmentResponsiveness: { balance_training: 1.4, strengthening: 1.3, manual_therapy: 1.1, rom_exercise: 1.2 },
      romCeilingPercent: 85,
      functionalMilestoneThreshold: 50,
      description: "Progressive balance, ankle strengthening, ROM restoration.",
    },
    {
      name: "Return to Activity",
      durationWeeksMin: 2,
      durationWeeksMax: 6,
      treatmentResponsiveness: { proprioception: 1.4, agility: 1.3, sport_specific: 1.2, taping: 1.0 },
      romCeilingPercent: 100,
      functionalMilestoneThreshold: 85,
      description: "Sport-specific agility, proprioceptive training, external support if needed.",
    },
  ],
  totalRecoveryWeeksMin: 5,
  totalRecoveryWeeksMax: 12,
  expectedRomRecoveryPercent: 100,
  recurrenceRiskPercent: 40,
  keyPrognosticFactors: ["Grade of sprain", "Previous sprains", "Proprioceptive deficit", "Return to sport demands"],
  contraindicatedInterventions: ["Forced inversion testing acutely", "Running on uneven ground in acute phase"],
};

const CERVICAL_RADICULOPATHY: ConditionRecoveryProfile = {
  conditionId: "cervical_radiculopathy",
  conditionName: "Cervical Radiculopathy",
  category: "spine",
  phases: [
    {
      name: "Acute / Symptom Management",
      durationWeeksMin: 2,
      durationWeeksMax: 6,
      treatmentResponsiveness: { cervical_retraction: 1.3, neural_mobilization: 1.2, manual_therapy: 1.1, traction: 1.2, heavy_lifting: 0.2 },
      romCeilingPercent: 60,
      functionalMilestoneThreshold: 20,
      description: "Positional relief, gentle neural mobilization, cervical retraction exercises.",
    },
    {
      name: "Motor Control & Strengthening",
      durationWeeksMin: 4,
      durationWeeksMax: 8,
      treatmentResponsiveness: { deep_neck_flexor: 1.4, scapular_stability: 1.3, neural_mobilization: 1.0, manual_therapy: 0.9 },
      romCeilingPercent: 80,
      functionalMilestoneThreshold: 55,
      description: "Deep neck flexor retraining, scapular stabilization, progressive loading.",
    },
    {
      name: "Functional Integration",
      durationWeeksMin: 4,
      durationWeeksMax: 8,
      treatmentResponsiveness: { functional_exercise: 1.3, progressive_loading: 1.2, ergonomic_training: 1.2 },
      romCeilingPercent: 95,
      functionalMilestoneThreshold: 80,
      description: "Return to activities, workplace ergonomics, sustained posture tolerance.",
    },
  ],
  totalRecoveryWeeksMin: 10,
  totalRecoveryWeeksMax: 22,
  expectedRomRecoveryPercent: 95,
  recurrenceRiskPercent: 30,
  keyPrognosticFactors: ["Nerve root level", "Duration of radiculopathy", "Neurological deficit severity", "Centralization"],
  contraindicatedInterventions: ["High-velocity rotation manipulation with radiculopathy", "Sustained cervical extension if increases symptoms"],
};

const PLANTAR_FASCIITIS: ConditionRecoveryProfile = {
  conditionId: "plantar_fasciitis",
  conditionName: "Plantar Fasciopathy",
  category: "foot",
  phases: [
    {
      name: "Load Management & Pain Relief",
      durationWeeksMin: 2,
      durationWeeksMax: 4,
      treatmentResponsiveness: { taping: 1.2, orthotics: 1.1, isometric_exercise: 1.2, education: 1.2, steroid_injection: 1.3, running: 0.3 },
      romCeilingPercent: 75,
      functionalMilestoneThreshold: 25,
      description: "Taping, temporary orthotic support, calf isometrics, load modification.",
    },
    {
      name: "Progressive Loading",
      durationWeeksMin: 4,
      durationWeeksMax: 8,
      treatmentResponsiveness: { heavy_slow_resistance: 1.4, calf_strengthening: 1.3, stretching: 1.0, manual_therapy: 0.9 },
      romCeilingPercent: 90,
      functionalMilestoneThreshold: 55,
      description: "High-load strength training, progressive calf raises, intrinsic foot strengthening.",
    },
    {
      name: "Return to Running/Activity",
      durationWeeksMin: 4,
      durationWeeksMax: 8,
      treatmentResponsiveness: { running_program: 1.3, plyometrics: 1.1, sport_specific: 1.2 },
      romCeilingPercent: 100,
      functionalMilestoneThreshold: 85,
      description: "Graduated return to running, energy storage exercises.",
    },
  ],
  totalRecoveryWeeksMin: 10,
  totalRecoveryWeeksMax: 20,
  expectedRomRecoveryPercent: 100,
  recurrenceRiskPercent: 25,
  keyPrognosticFactors: ["BMI", "Duration of symptoms", "Calf endurance", "Training load"],
  contraindicatedInterventions: ["Repeated steroid injections (>2)", "Barefoot running in reactive phase"],
};

const SUBACROMIAL_IMPINGEMENT: ConditionRecoveryProfile = {
  conditionId: "subacromial_impingement",
  conditionName: "Subacromial Pain Syndrome",
  category: "shoulder",
  phases: [
    {
      name: "Pain Reduction & Scapular Control",
      durationWeeksMin: 2,
      durationWeeksMax: 4,
      treatmentResponsiveness: { scapular_exercise: 1.3, isometric_rc: 1.2, manual_therapy: 1.1, overhead_activity: 0.4, education: 1.2 },
      romCeilingPercent: 75,
      functionalMilestoneThreshold: 30,
      description: "Scapular setting, isometric rotator cuff, activity modification.",
    },
    {
      name: "Progressive Strengthening",
      durationWeeksMin: 4,
      durationWeeksMax: 8,
      treatmentResponsiveness: { rotator_cuff_exercise: 1.4, scapular_stability: 1.3, functional_exercise: 1.1, manual_therapy: 0.8 },
      romCeilingPercent: 90,
      functionalMilestoneThreshold: 60,
      description: "Progressive RC strengthening, dynamic scapular stability, kinetic chain integration.",
    },
    {
      name: "Functional Return",
      durationWeeksMin: 4,
      durationWeeksMax: 8,
      treatmentResponsiveness: { sport_specific: 1.3, overhead_loading: 1.2, plyometric_shoulder: 1.1 },
      romCeilingPercent: 100,
      functionalMilestoneThreshold: 85,
      description: "Return to overhead activities, sport-specific drills.",
    },
  ],
  totalRecoveryWeeksMin: 10,
  totalRecoveryWeeksMax: 20,
  expectedRomRecoveryPercent: 100,
  recurrenceRiskPercent: 25,
  keyPrognosticFactors: ["Scapular dyskinesis", "RC strength", "Overhead demands", "Posture"],
  contraindicatedInterventions: ["Upright row exercise", "Behind-neck press"],
};

const HIP_OA: ConditionRecoveryProfile = {
  conditionId: "hip_oa",
  conditionName: "Hip Osteoarthritis",
  category: "hip",
  phases: [
    {
      name: "Symptom Management & Education",
      durationWeeksMin: 2,
      durationWeeksMax: 4,
      treatmentResponsiveness: { education: 1.4, aquatic_exercise: 1.3, walking_program: 1.2, manual_therapy: 1.1, high_impact: 0.3 },
      romCeilingPercent: 70,
      functionalMilestoneThreshold: 25,
      description: "Education about OA management, low-impact exercise, weight management.",
    },
    {
      name: "Progressive Exercise",
      durationWeeksMin: 6,
      durationWeeksMax: 12,
      treatmentResponsiveness: { hip_strengthening: 1.4, functional_exercise: 1.3, flexibility: 1.0, manual_therapy: 0.9 },
      romCeilingPercent: 80,
      functionalMilestoneThreshold: 55,
      description: "Progressive hip strengthening, functional task training, gait optimization.",
    },
    {
      name: "Maintenance & Self-Management",
      durationWeeksMin: 8,
      durationWeeksMax: 24,
      treatmentResponsiveness: { home_exercise: 1.3, activity_pacing: 1.2, flare_management: 1.1 },
      romCeilingPercent: 85,
      functionalMilestoneThreshold: 75,
      description: "Long-term exercise adherence, flare management, activity pacing.",
    },
  ],
  totalRecoveryWeeksMin: 16,
  totalRecoveryWeeksMax: 40,
  expectedRomRecoveryPercent: 80,
  recurrenceRiskPercent: 60,
  keyPrognosticFactors: ["BMI", "Radiographic severity", "Quadriceps strength", "Psychosocial factors"],
  contraindicatedInterventions: ["High-impact loading with severe joint changes", "Deep squats with significant ROM loss"],
};

const GLUTEAL_TENDINOPATHY: ConditionRecoveryProfile = {
  conditionId: "gluteal_tendinopathy",
  conditionName: "Gluteal Tendinopathy / Greater Trochanteric Pain",
  category: "hip",
  phases: [
    {
      name: "Load Management & Education",
      durationWeeksMin: 2,
      durationWeeksMax: 4,
      treatmentResponsiveness: { education: 1.4, isometric_exercise: 1.3, posture_modification: 1.2, stretching: 0.4, side_lying: 0.5 },
      romCeilingPercent: 75,
      functionalMilestoneThreshold: 25,
      description: "Avoid compressive positions, isometric hip abduction, education on load management.",
    },
    {
      name: "Progressive Loading",
      durationWeeksMin: 4,
      durationWeeksMax: 8,
      treatmentResponsiveness: { hip_abduction_strengthening: 1.4, isotonic_exercise: 1.2, functional_exercise: 1.1, stretching: 0.7 },
      romCeilingPercent: 90,
      functionalMilestoneThreshold: 55,
      description: "Progressive hip abductor strengthening, graduated functional loading.",
    },
    {
      name: "Functional Return",
      durationWeeksMin: 4,
      durationWeeksMax: 8,
      treatmentResponsiveness: { walking_program: 1.3, stair_training: 1.2, sport_specific: 1.1 },
      romCeilingPercent: 100,
      functionalMilestoneThreshold: 85,
      description: "Return to walking distance, stairs, sport-specific loading.",
    },
  ],
  totalRecoveryWeeksMin: 10,
  totalRecoveryWeeksMax: 20,
  expectedRomRecoveryPercent: 100,
  recurrenceRiskPercent: 30,
  keyPrognosticFactors: ["Sleep position", "BMI", "Hip adduction control", "Compressive load avoidance"],
  contraindicatedInterventions: ["IT band stretching over trochanter", "Side-lying on affected side", "Cross-body adduction stretches"],
};

const MENISCAL_INJURY: ConditionRecoveryProfile = {
  conditionId: "meniscal_injury",
  conditionName: "Meniscal Injury (Conservative)",
  category: "knee",
  phases: [
    {
      name: "Acute / Effusion Management",
      durationWeeksMin: 1,
      durationWeeksMax: 3,
      treatmentResponsiveness: { cryotherapy: 1.2, quad_activation: 1.3, gentle_rom: 1.2, deep_squat: 0.2, twisting: 0.2 },
      romCeilingPercent: 60,
      functionalMilestoneThreshold: 15,
      description: "Effusion management, quad activation, gentle ROM within pain-free range.",
    },
    {
      name: "Progressive Rehabilitation",
      durationWeeksMin: 4,
      durationWeeksMax: 8,
      treatmentResponsiveness: { strengthening: 1.3, closed_chain_exercise: 1.2, balance_training: 1.2, manual_therapy: 1.0 },
      romCeilingPercent: 90,
      functionalMilestoneThreshold: 55,
      description: "Progressive strengthening, balance training, functional exercises.",
    },
    {
      name: "Return to Activity",
      durationWeeksMin: 4,
      durationWeeksMax: 8,
      treatmentResponsiveness: { sport_specific: 1.3, agility: 1.2, plyometrics: 1.1 },
      romCeilingPercent: 100,
      functionalMilestoneThreshold: 85,
      description: "Sport-specific training, agility drills, confidence-building activities.",
    },
  ],
  totalRecoveryWeeksMin: 9,
  totalRecoveryWeeksMax: 19,
  expectedRomRecoveryPercent: 100,
  recurrenceRiskPercent: 25,
  keyPrognosticFactors: ["Tear type and location", "Mechanical symptoms", "Age", "Activity demands"],
  contraindicatedInterventions: ["Deep squatting with locking symptoms", "Pivoting sports before adequate strength"],
};

const WHIPLASH: ConditionRecoveryProfile = {
  conditionId: "whiplash",
  conditionName: "Whiplash-Associated Disorder (WAD I-II)",
  category: "spine",
  phases: [
    {
      name: "Acute / Reassurance",
      durationWeeksMin: 1,
      durationWeeksMax: 3,
      treatmentResponsiveness: { education: 1.4, active_rom: 1.2, reassurance: 1.3, collar: 0.3, manual_therapy: 0.8 },
      romCeilingPercent: 60,
      functionalMilestoneThreshold: 20,
      description: "Education, reassurance, early active movement, avoid prolonged collar use.",
    },
    {
      name: "Active Rehabilitation",
      durationWeeksMin: 3,
      durationWeeksMax: 8,
      treatmentResponsiveness: { deep_neck_flexor: 1.4, scapular_exercise: 1.2, graded_activity: 1.3, manual_therapy: 1.1 },
      romCeilingPercent: 85,
      functionalMilestoneThreshold: 55,
      description: "Deep cervical flexor retraining, graded return to activity, cervicothoracic strengthening.",
    },
    {
      name: "Functional Return",
      durationWeeksMin: 4,
      durationWeeksMax: 12,
      treatmentResponsiveness: { functional_exercise: 1.3, work_conditioning: 1.2, sport_specific: 1.1 },
      romCeilingPercent: 95,
      functionalMilestoneThreshold: 80,
      description: "Return to work/sport, sustained posture tolerance, self-management.",
    },
  ],
  totalRecoveryWeeksMin: 8,
  totalRecoveryWeeksMax: 23,
  expectedRomRecoveryPercent: 95,
  recurrenceRiskPercent: 30,
  keyPrognosticFactors: ["Initial pain intensity", "WAD grade", "Psychosocial factors", "Cold hyperalgesia", "Dizziness"],
  contraindicatedInterventions: ["Prolonged cervical collar use", "Passive modalities as sole treatment"],
};

export const CONDITION_RECOVERY_PROFILES: ConditionRecoveryProfile[] = [
  ROTATOR_CUFF_TENDINOPATHY,
  FROZEN_SHOULDER,
  ACL_RECONSTRUCTION,
  LUMBAR_DISC_HERNIATION,
  LATERAL_EPICONDYLALGIA,
  PATELLOFEMORAL_PAIN,
  ACHILLES_TENDINOPATHY,
  ANKLE_SPRAIN_LATERAL,
  CERVICAL_RADICULOPATHY,
  PLANTAR_FASCIITIS,
  SUBACROMIAL_IMPINGEMENT,
  HIP_OA,
  GLUTEAL_TENDINOPATHY,
  MENISCAL_INJURY,
  WHIPLASH,
];

export function findConditionProfile(conditionName: string): ConditionRecoveryProfile | null {
  if (!conditionName) return null;
  const lower = conditionName.toLowerCase();

  const direct = CONDITION_RECOVERY_PROFILES.find(p =>
    p.conditionName.toLowerCase() === lower || p.conditionId === lower
  );
  if (direct) return direct;

  const keywordMap: Record<string, string> = {
    "rotator cuff": "rotator_cuff_tendinopathy",
    "supraspinatus": "rotator_cuff_tendinopathy",
    "infraspinatus": "rotator_cuff_tendinopathy",
    "frozen shoulder": "frozen_shoulder",
    "adhesive capsulitis": "frozen_shoulder",
    "acl": "acl_reconstruction",
    "anterior cruciate": "acl_reconstruction",
    "disc herniation": "lumbar_disc_herniation",
    "disc prolapse": "lumbar_disc_herniation",
    "sciatica": "lumbar_disc_herniation",
    "radiculopathy": lower.includes("cerv") ? "cervical_radiculopathy" : "lumbar_disc_herniation",
    "tennis elbow": "lateral_epicondylalgia",
    "lateral epicondyl": "lateral_epicondylalgia",
    "patellofemoral": "patellofemoral_pain",
    "anterior knee": "patellofemoral_pain",
    "runner's knee": "patellofemoral_pain",
    "achilles": "achilles_tendinopathy",
    "ankle sprain": "ankle_sprain_lateral",
    "lateral ankle": "ankle_sprain_lateral",
    "inversion sprain": "ankle_sprain_lateral",
    "plantar fasci": "plantar_fasciitis",
    "heel pain": "plantar_fasciitis",
    "impingement": "subacromial_impingement",
    "subacromial": "subacromial_impingement",
    "hip osteoarthritis": "hip_oa",
    "hip oa": "hip_oa",
    "hip arthritis": "hip_oa",
    "gluteal tendin": "gluteal_tendinopathy",
    "trochanteric": "gluteal_tendinopathy",
    "greater trochant": "gluteal_tendinopathy",
    "meniscus": "meniscal_injury",
    "meniscal": "meniscal_injury",
    "whiplash": "whiplash",
    "wad": "whiplash",
    "cervical strain": "whiplash",
  };

  for (const [keyword, profileId] of Object.entries(keywordMap)) {
    if (lower.includes(keyword)) {
      return CONDITION_RECOVERY_PROFILES.find(p => p.conditionId === profileId) ?? null;
    }
  }

  let bestMatch: ConditionRecoveryProfile | null = null;
  let bestScore = 0;
  for (const profile of CONDITION_RECOVERY_PROFILES) {
    const words = profile.conditionName.toLowerCase().split(/\s+/);
    let score = 0;
    for (const word of words) {
      if (word.length > 3 && lower.includes(word)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = profile;
    }
  }

  return bestScore >= 2 ? bestMatch : null;
}

export function autoDetectCondition(
  reasoning: StructuredReasoningResult | null,
): ConditionRecoveryProfile | null {
  if (!reasoning || reasoning.hypotheses.length === 0) return null;
  const topCondition = reasoning.hypotheses[0].condition;
  return findConditionProfile(topCondition);
}

export function adjustProfileForPatient(
  profile: ConditionRecoveryProfile,
  modifiers: PatientModifierProfile,
): ConditionRecoveryProfile {
  const healingMult = modifiers.healingRateMultiplier;
  const durationScale = healingMult > 0 ? 1 / healingMult : 2;

  return {
    ...profile,
    phases: profile.phases.map(phase => ({
      ...phase,
      durationWeeksMin: Math.round(phase.durationWeeksMin * durationScale),
      durationWeeksMax: Math.round(phase.durationWeeksMax * durationScale),
      romCeilingPercent: Math.round(phase.romCeilingPercent * modifiers.tissueQualityMultiplier),
      functionalMilestoneThreshold: Math.round(
        phase.functionalMilestoneThreshold * modifiers.complianceMultiplier * modifiers.psychosocialMultiplier
      ),
    })),
    totalRecoveryWeeksMin: Math.round(profile.totalRecoveryWeeksMin * durationScale),
    totalRecoveryWeeksMax: Math.round(profile.totalRecoveryWeeksMax * durationScale),
    expectedRomRecoveryPercent: Math.min(100, Math.round(profile.expectedRomRecoveryPercent * modifiers.tissueQualityMultiplier)),
    recurrenceRiskPercent: Math.min(100, Math.round(profile.recurrenceRiskPercent * modifiers.recurrenceRiskMultiplier)),
  };
}
