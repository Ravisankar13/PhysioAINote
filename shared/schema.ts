import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  date,
  json,
  jsonb,
  boolean,
  pgEnum,
  numeric,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Visibility enum for notes
export const visibilityEnum = pgEnum("visibility", [
  "private",
  "public",
  "shared",
]);

// Body part category enum
export const bodyPartEnum = pgEnum("body_part", [
  "shoulder",
  "neck",
  "back",
  "elbow",
  "wrist",
  "hand",
  "hip",
  "knee",
  "ankle",
  "foot",
  "general",
  "other",
]);

// Membership tier enum
export const membershipTierEnum = pgEnum("membership_tier", [
  "none",
  "basic",
  "standard",
  "premium",
]);

// Evidence level enum for research papers
export const evidenceLevelEnum = pgEnum("evidence_level", [
  "level_1", // Systematic reviews and meta-analyses
  "level_2", // Randomized controlled trials
  "level_3", // Controlled trials without randomization
  "level_4", // Case-control or cohort studies
  "level_5", // Case series, case reports
]);

// Study design enum
export const studyDesignEnum = pgEnum("study_design", [
  "systematic_review",
  "meta_analysis",
  "randomized_controlled_trial",
  "controlled_trial",
  "cohort_study",
  "case_control_study",
  "cross_sectional_study",
  "case_series",
  "case_report",
  "expert_opinion",
]);

// Competition type enum
export const competitionTypeEnum = pgEnum("competition_type", [
  "daily_challenge",
  "speed_challenge", 
  "accuracy_contest",
  "differential_race",
  "treatment_planning",
  "tournament",
  "specialty_league",
  "complete_clinician",
  "diagnostic_detective",
  "treatment_strategist",
  "clinical_educator",
]);

// Game type enum for new competition formats
export const gameTypeEnum = pgEnum("game_type", [
  "standard_case",
  "lightning_diagnosis",
  "treatment_speed_run",
  "progressive_diagnostic_challenge",
  "choose_your_adventure",
  "emergency_room_simulator",
  "red_flag_detective",
  "differential_diagnosis_duel",
  "journal_club_race",
  "cpg_quiz_master",
  "mystery_patient",
  "diagnosis_duel",
  "manual_therapy_mastery",
  "exercise_prescription_expert",
]);

// Competition status enum
export const competitionStatusEnum = pgEnum("competition_status", [
  "scheduled",
  "registration_open",
  "registration_closed", 
  "upcoming",
  "active", 
  "completed",
  "archived",
  "cancelled",
]);

// Achievement type enum
export const achievementTypeEnum = pgEnum("achievement_type", [
  "speed_demon",
  "accuracy_master",
  "streak_keeper",
  "differential_expert",
  "treatment_guru",
  "case_crusher",
  "specialty_champion",
  "quick_thinker",
  "research_master",
]);

// Tournament status enum
export const tournamentStatusEnum = pgEnum("tournament_status", [
  "registration",
  "waiting_for_players",
  "round_1",
  "round_2", 
  "round_3",
  "round_4",
  "finals",
  "completed",
  "cancelled",
]);

// Match status enum
export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

// Session status enum for tracking recording and processing states
export const sessionStatusEnum = pgEnum("session_status", [
  "draft",
  "recorded",
  "transcribed",
  "processing",
  "completed",
  "continuous_recording", // New status for ongoing continuous recording
  "auto_segmented", // New status for auto-detected patient segments
]);

// Continuous recording session table for managing clinic day recordings
export const continuousRecordingSessions = pgTable("continuous_recording_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull().unique(), // Unique identifier for the clinic day session
  sessionName: text("session_name").notNull(), // e.g. "Clinic Day - January 6, 2025"
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  totalDuration: integer("total_duration"), // Duration in seconds
  isActive: boolean("is_active").default(true).notNull(),
  totalPatients: integer("total_patients").default(0).notNull(),
  fullTranscript: text("full_transcript"), // Complete recording transcript
  audioFileUrl: text("audio_file_url"), // URL to complete audio file
  patientSegments: json("patient_segments"), // Array of detected patient segments
  aiAnalysisLog: json("ai_analysis_log"), // Log of AI decisions and confidence scores
  status: text("status").default("recording").notNull(), // recording, processing, completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Temporary storage for complete patient consultation snapshots (24-hour retention)
export const continuousSessionNotes = pgTable("continuous_session_notes", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => continuousRecordingSessions.sessionId, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  patientSequence: integer("patient_sequence").notNull(), // Patient 1, 2, 3 etc
  patientName: text("patient_name"), // Optional patient name if captured
  
  // SOAP Note Content
  soapNote: json("soap_note").$type<{
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    transcription: string;
    recordingDuration: number;
    timestamp: string;
  }>().notNull(),
  
  // Virtual Patient Data
  virtualPatient: json("virtual_patient").$type<{
    painLocations: Array<{
      bodyPart: string;
      severity: number;
      type: string;
      coordinates: { x: number; y: number; z: number };
      color: string;
    }>;
    posture: string;
    movement: string;
    gait: string;
    skeletonConfig?: any;
  }>(),
  
  // Clinical Decision Support
  clinicalDecision: json("clinical_decision").$type<{
    differentials: Array<{
      diagnosis: string;
      probability: number;
      supportingSymptoms: string[];
      additionalTestsNeeded: string[];
      icd10Code?: string;
    }>;
    redFlags: Array<{
      level: string;
      condition: string;
      matchedText: string;
      recommendations: string[];
    }>;
    guidelines: Array<{
      condition: string;
      source: string;
      year: number;
      recommendations: string[];
      redFlags?: string[];
      specialTests?: string[];
      imaging?: string[];
    }>;
  }>(),
  
  // AI Suggestions
  aiSuggestions: json("ai_suggestions").$type<Array<{
    id: string;
    category: string;
    suggestion: string;
    timestamp: string;
    applied?: boolean;
  }>>(),
  
  // PhysioGPT Chat History
  physioGptChat: json("physio_gpt_chat").$type<Array<{
    role: string;
    content: string;
    timestamp: string;
  }>>(),
  
  // Evidence Articles
  evidenceArticles: json("evidence_articles").$type<Array<{
    id: string;
    title: string;
    authors: string[];
    year: number;
    keyFindings: string[];
    clinicalApplication: string;
    relevanceScore: number;
    source?: string;
  }>>(),
  
  // Patient Fingerprint
  patientFingerprint: json("patient_fingerprint").$type<{
    isReturningPatient: boolean;
    visitNumber: number;
    daysSinceLastVisit?: number;
    progressionTrend?: string;
  }>(),
  
  // Timestamps
  consultationStart: timestamp("consultation_start").notNull(),
  consultationEnd: timestamp("consultation_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Set to 24 hours from creation
});

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  fullName: text("full_name"),
  profileImage: text("profile_image"),
  bio: text("bio"),
  membershipTier: membershipTierEnum("membership_tier")
    .default("none")
    .notNull(),
  membershipExpiry: timestamp("membership_expiry"),
  trialStartDate: timestamp("trial_start_date"),
  trialEndDate: timestamp("trial_end_date"),
  hasUsedTrial: boolean("has_used_trial").default(false).notNull(),
  isOnTrial: boolean("is_on_trial").default(false).notNull(),
  paypalSubscriptionId: text("paypal_subscription_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  stripePriceId: text("stripe_price_id"), // Store the current price ID for easy upgrades/downgrades
  subscriptionStatus: text("subscription_status"), // active, trialing, canceled, past_due, etc.
  onboardingRequired: boolean("onboarding_required").default(false).notNull(), // Track if user needs to complete payment setup
  // isAdmin will be added in the future via migration
  // isAdmin: boolean("is_admin").default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Password Reset Tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Clinical Note Schema
export const clinicalNotes = pgTable("clinical_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  patientName: text("patient_name").notNull(),
  patientId: text("patient_id").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  dateOfVisit: text("date_of_visit").notNull(),
  subjective: text("subjective").notNull(),
  objective: text("objective").notNull(),
  assessment: text("assessment").notNull(),
  plan: text("plan").notNull(),
  fullNote: json("full_note").notNull(),
  // For shared/public notes, we'll use these de-identified fields
  condition: text("condition"), // Short description of the condition (no PII)
  ageRange: text("age_range"), // Age range instead of specific DOB
  deIdentifiedNote: json("de_identified_note"), // Version of the note with PII removed
  bodyPart: bodyPartEnum("body_part").default("other"), // Body part category
  visibility: visibilityEnum("visibility").default("private").notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClinicalNoteSchema = createInsertSchema(clinicalNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isArchived: true,
});

// Schema for updating note visibility and de-identification
export const updateNoteVisibilitySchema = z.object({
  visibility: z.enum(["private", "public", "shared"]),
  bodyPart: z
    .enum([
      "shoulder",
      "neck",
      "back",
      "elbow",
      "wrist",
      "hand",
      "hip",
      "knee",
      "ankle",
      "foot",
      "general",
      "other",
    ])
    .default("other"),
  condition: z.string().optional(),
  ageRange: z.string().optional(),
  deIdentifiedNote: z.record(z.any()).optional(),
});

export type InsertClinicalNote = z.infer<typeof insertClinicalNoteSchema>;
export type UpdateNoteVisibility = z.infer<typeof updateNoteVisibilitySchema>;
export type ClinicalNote = typeof clinicalNotes.$inferSelect;

// SOAP Notes - Separate from Clinical Notes for automatic recording/transcription
export const soapNotes = pgTable("soap_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull().unique(), // For tracking continuous recording sessions
  continuousRecordingSessionId: integer("continuous_recording_session_id")
    .references(() => continuousRecordingSessions.id, { onDelete: "set null" }), // Link to continuous recording session
  patientSequenceNumber: integer("patient_sequence_number"), // Order in the continuous recording (Patient 1, 2, 3...)
  patientName: text("patient_name"),
  patientId: text("patient_id"),
  dateOfBirth: text("date_of_birth"),
  dateOfVisit: text("date_of_visit").notNull(),
  subjective: text("subjective"),
  objective: text("objective"),
  assessment: text("assessment"),
  plan: text("plan"),
  goals: text("goals"),
  treatment: text("treatment"),
  fullTranscription: text("full_transcription"), // Raw audio transcription
  audioFileUrl: text("audio_file_url"), // URL to stored audio file
  bodyPart: bodyPartEnum("body_part").default("other"),
  sessionStatus: sessionStatusEnum("session_status").default("draft").notNull(),
  isAutoGenerated: boolean("is_auto_generated").default(true).notNull(), // AI generated vs manual
  patientSwitchDetected: boolean("patient_switch_detected").default(false).notNull(),
  recordingDuration: integer("recording_duration"), // Duration in seconds
  confidence: integer("confidence"), // AI confidence in transcription/generation (0-100)
  
  // Real-time AI suggestions data
  suggestedQuestions: text("suggested_questions"), // JSON array of AI-suggested questions
  suggestedTreatments: text("suggested_treatments"), // JSON array of AI-suggested treatments
  suggestedDiagnoses: text("suggested_diagnoses"), // JSON array of AI-suggested diagnoses
  
  // AI Automatic Paperwork Fields
  treatmentSummary: text("treatment_summary"),
  progressNotes: text("progress_notes"),
  dischargeSummary: text("discharge_summary"),
  progressReport: text("progress_report"),
  imagingReferral: text("imaging_referral"),
  specialistReferral: text("specialist_referral"),
  returnToWorkCertificate: text("return_to_work_certificate"),
  timeOffWorkCertificate: text("time_off_work_certificate"),
  insuranceDocumentation: text("insurance_documentation"),
  homeExerciseProgram: text("home_exercise_program"),
  workCapacityAssessment: text("work_capacity_assessment"),
  functionalOutcomes: text("functional_outcomes"),
  paperworkGenerated: boolean("paperwork_generated").default(false).notNull(),
  paperworkGeneratedAt: timestamp("paperwork_generated_at"),
  
  // Virtual Patient Creation
  virtualPatientGenerated: boolean("virtual_patient_generated").default(false).notNull(),
  virtualPatientGeneratedAt: timestamp("virtual_patient_generated_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertSoapNoteSchema = createInsertSchema(soapNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSoapNote = z.infer<typeof insertSoapNoteSchema>;
export type SoapNote = typeof soapNotes.$inferSelect;

// Continuous Recording Session schema types
export const insertContinuousRecordingSessionSchema = createInsertSchema(continuousRecordingSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContinuousRecordingSession = z.infer<typeof insertContinuousRecordingSessionSchema>;
export type ContinuousRecordingSession = typeof continuousRecordingSessions.$inferSelect;

// Continuous Session Notes schema types
export const insertContinuousSessionNoteSchema = createInsertSchema(continuousSessionNotes).omit({
  id: true,
  createdAt: true,
});

export type InsertContinuousSessionNote = z.infer<typeof insertContinuousSessionNoteSchema>;
export type ContinuousSessionNote = typeof continuousSessionNotes.$inferSelect;

// Temporary SOAP Notes with 24-hour expiry
export const temporarySoapNotes = pgTable("temporary_soap_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(), // Unique session identifier
  
  // Recording mode
  recordingMode: text("recording_mode").notNull().default("standard"), // 'standard' or 'continuous'
  
  // SOAP Content
  subjective: text("subjective"),
  objective: text("objective"),
  assessment: text("assessment"),
  plan: text("plan"),
  
  // Patient Information
  patientName: text("patient_name"),
  patientId: text("patient_id"),
  dateOfBirth: text("date_of_birth"),
  chiefComplaint: text("chief_complaint"),
  
  // Transcription Data
  transcriptionText: text("transcription_text"),
  audioUrl: text("audio_url"),
  recordingDuration: integer("recording_duration"), // in seconds
  
  // AI Generated Content
  aiSuggestions: json("ai_suggestions").$type<{
    subjective?: string[];
    objective?: string[];
    assessment?: string[];
    plan?: string[];
    questions?: string[];
    treatments?: string[];
    diagnoses?: string[];
  }>(),
  
  // Additional Data
  additionalData: json("additional_data").$type<{
    bodyPart?: string;
    painScale?: number;
    functionalLimitations?: string[];
    redFlags?: string[];
    yellowFlags?: string[];
    specialTests?: string[];
    outcomeScores?: Record<string, number>;
    exercisePrescription?: any[];
    documentGeneration?: any;
    virtualPatientConfig?: any;
  }>(),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // 24 hours from creation
  lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
  
  // Navigation
  previousNoteId: integer("previous_note_id"),
  nextNoteId: integer("next_note_id"),
  noteOrder: integer("note_order").notNull().default(1), // Order within session
});

export const insertTemporarySoapNoteSchema = createInsertSchema(temporarySoapNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastAccessedAt: true,
});

export type InsertTemporarySoapNote = z.infer<typeof insertTemporarySoapNoteSchema>;
export type TemporarySoapNote = typeof temporarySoapNotes.$inferSelect;

// Pathology Templates for common pain patterns
export const pathologyTemplates = pgTable("pathology_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(), // knee, shoulder, spine, hip, etc.
  subcategory: text("subcategory"), // anterior, lateral, medial, etc.
  description: text("description"),
  
  // The complete model configuration for this pathology
  modelConfig: json("model_config").$type<{
    limbScales: {
      overall: number;
      upperArm: number;
      forearm: number;
      thigh: number;
      shin: number;
    };
    shoulderPathology: {
      scapularWinging: number;
      acSeparation: number;
      ghSubluxation: number;
    };
    spinalPathology: {
      scoliosis: number;
      kyphosis: number;
      lordosis: number;
    };
    lowerLimbPathology: {
      genuVarum: number;
      genuValgum: number;
      patellaHeight: number;
      qAngle: number; // Added Q-angle for knee pathologies
      tibialTorsion: number; // Added tibial torsion
    };
    hipPathology: {
      anteversion: number; // Femoral anteversion
      retroversion: number; // Femoral retroversion
      coxa_vara: number; // Hip angle variations
      coxa_valga: number;
    };
    muscleImbalances: {
      gluteMedWeakness: number; // 0-100% weakness
      vmoWeakness: number; // VMO weakness for knee issues
      itbTightness: number; // IT band tightness
      hipFlexorTightness: number;
      hamstringTightness: number;
    };
  }>().notNull(),
  
  // Common clinical findings associated with this pattern
  clinicalFindings: json("clinical_findings").$type<string[]>(),
  
  // Typical movement patterns
  movementPatterns: json("movement_patterns").$type<{
    gaitDeviations: string[];
    compensatoryPatterns: string[];
    functionalLimitations: string[];
  }>(),
  
  // Whether this is a system default template or user-created
  isSystemDefault: boolean("is_system_default").default(false).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Individual Virtual Patient 3D Model Configurations
export const virtualPatientConfigs = pgTable("virtual_patient_configs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  soapVirtualPatientId: integer("soap_virtual_patient_id"),
  
  // Patient Info
  patient_name: text("patient_name").notNull(),
  age: integer("age"),
  gender: text("gender"),
  chiefComplaint: text("chief_complaint"),
  
  // 3D Model Configuration
  modelConfig: json("model_config").$type<{
    // Limb Scaling
    limbScales: {
      overall: number;
      upperArm: number;
      forearm: number;
      thigh: number;
      shin: number;
    };
    
    // Shoulder Pathologies
    shoulderPathology: {
      scapularWinging: number; // 0-20 degrees
      acSeparation: number; // 0-3 grades
      ghSubluxation: number; // 0-50%
    };
    
    // Spinal Pathologies
    spinalPathology: {
      scoliosis: number; // 0-50 degrees
      kyphosis: number; // 20-70 degrees
      lordosis: number; // 20-70 degrees
    };
    
    // Lower Limb Pathologies
    lowerLimbPathology: {
      genuVarum: number; // -30 to 30 degrees
      genuValgum: number; // -30 to 30 degrees
      patellaHeight: number; // 0.8-1.2 ratio
    };
    
    // Range of Motion Limitations
    romLimitations: {
      // Hip ROM
      hipFlexion: { left: number; right: number; }; // Normal: 120°
      hipExtension: { left: number; right: number; }; // Normal: 30°
      hipAbduction: { left: number; right: number; }; // Normal: 45°
      hipAdduction: { left: number; right: number; }; // Normal: 30°
      hipInternalRotation: { left: number; right: number; }; // Normal: 40°
      hipExternalRotation: { left: number; right: number; }; // Normal: 45°
      
      // Knee ROM
      kneeFlexion: { left: number; right: number; }; // Normal: 135°
      kneeExtension: { left: number; right: number; }; // Normal: 0° (or -5° hyperextension)
      
      // Ankle ROM
      ankleDorsiflexion: { left: number; right: number; }; // Normal: 20°
      anklePlantarflexion: { left: number; right: number; }; // Normal: 45°
      ankleInversion: { left: number; right: number; }; // Normal: 30°
      ankleEversion: { left: number; right: number; }; // Normal: 20°
      
      // Shoulder ROM
      shoulderFlexion: { left: number; right: number; }; // Normal: 180°
      shoulderExtension: { left: number; right: number; }; // Normal: 60°
      shoulderAbduction: { left: number; right: number; }; // Normal: 180°
      shoulderInternalRotation: { left: number; right: number; }; // Normal: 70°
      shoulderExternalRotation: { left: number; right: number; }; // Normal: 90°
      
      // Spine ROM
      cervicalFlexion: number; // Normal: 50°
      cervicalExtension: number; // Normal: 60°
      cervicalRotation: { left: number; right: number; }; // Normal: 80°
      thoracolumbarFlexion: number; // Normal: 80°
      thoracolumbarExtension: number; // Normal: 30°
      thoracolumbarRotation: { left: number; right: number; }; // Normal: 45°
    };
    
    // Gait Patterns
    gaitPattern: {
      // Basic gait deviations
      antalgia: 'none' | 'mild' | 'moderate' | 'severe';
      trendelenburg: { left: boolean; right: boolean; };
      duchenne: { left: boolean; right: boolean; };
      circumduction: { left: boolean; right: boolean; };
      hipHike: { left: boolean; right: boolean; };
      steppage: { left: boolean; right: boolean; };
      scissoring: boolean;
      
      // Gait phases
      stancePhaseDeviation: {
        heelStrike: 'normal' | 'absent' | 'excessive';
        footFlat: 'normal' | 'prolonged' | 'reduced';
        midstance: 'normal' | 'unstable' | 'shortened';
        heelOff: 'normal' | 'early' | 'delayed';
        toeOff: 'normal' | 'absent' | 'prolonged';
      };
      
      // Gait parameters
      stepLength: { left: number; right: number; }; // cm
      strideLength: number; // cm
      cadence: number; // steps/min
      velocity: number; // m/s
      baseOfSupport: number; // cm
      toeAngle: { left: number; right: number; }; // degrees
    };
    
    // Pain Mapping
    painMapping: {
      // Pain locations with intensity (0-10)
      regions: Array<{
        bodyPart: string; // e.g., "anterior_knee", "lateral_hip", "lower_back"
        side: 'left' | 'right' | 'bilateral';
        intensity: number; // 0-10 VAS scale
        quality: 'sharp' | 'dull' | 'burning' | 'aching' | 'throbbing' | 'stabbing';
        behavior: 'constant' | 'intermittent' | 'activity_related' | 'rest_pain';
        aggravatingFactors: string[];
        relievingFactors: string[];
      }>;
      
      // Movement-related pain
      movementPain: {
        flexion: boolean;
        extension: boolean;
        rotation: boolean;
        weightBearing: boolean;
        nonWeightBearing: boolean;
        startUp: boolean; // Pain on initial movement
        endRange: boolean; // Pain at end of ROM
      };
    };
    
    // Force Calculations (Phase 3)
    forceCalculations?: {
      bodyMass: number; // kg
      groundReactionForce: {
        vertical: number; // × body weight
        anteroposterior: number; // × body weight
        mediolateral: number; // × body weight
      };
      jointMoments: {
        hip: { flexion: number; abduction: number; rotation: number; }; // Nm/kg
        knee: { flexion: number; varus: number; rotation: number; }; // Nm/kg
        ankle: { dorsiflexion: number; inversion: number; }; // Nm/kg
      };
      muscleForces: {
        quadriceps: number; // % of normal
        hamstrings: number;
        gluteusMaximus: number;
        gluteusMedius: number;
        gastrocnemius: number;
        tibialis: number;
      };
      centerOfPressure: {
        x: number; // medial-lateral displacement (cm)
        y: number; // anterior-posterior displacement (cm)
      };
      loadDistribution: {
        left: number; // percentage
        right: number; // percentage
      };
    };
    
    // Muscle & Soft Tissue (Phase 4)
    muscleVisualization?: {
      showMuscles: boolean;
      muscleOpacity: number;
      muscleLayer: 'superficial' | 'deep' | 'all';
    };
    
    muscleBulk?: {
      quadriceps: { left: number; right: number };
      hamstrings: { left: number; right: number };
      gastrocnemius: { left: number; right: number };
      gluteusMaximus: { left: number; right: number };
      gluteusMedius: { left: number; right: number };
      tibialis: { left: number; right: number };
      deltoid: { left: number; right: number };
      biceps: { left: number; right: number };
      triceps: { left: number; right: number };
    };
    
    muscleTone?: {
      upperLimb: { left: 'normal' | 'hypotonic' | 'hypertonic' | 'spastic'; right: 'normal' | 'hypotonic' | 'hypertonic' | 'spastic' };
      lowerLimb: { left: 'normal' | 'hypotonic' | 'hypertonic' | 'spastic'; right: 'normal' | 'hypotonic' | 'hypertonic' | 'spastic' };
      trunk: 'normal' | 'hypotonic' | 'hypertonic';
    };
    
    triggerPoints?: Array<{
      muscle: string;
      location: { x: number; y: number; z: number };
      severity: 'mild' | 'moderate' | 'severe';
      referralPattern: string;
    }>;
    
    softTissue?: {
      swelling: {
        knee: { left: number; right: number };
        ankle: { left: number; right: number };
        shoulder: { left: number; right: number };
        elbow: { left: number; right: number };
      };
      scarTissue: Array<{
        location: string;
        type: 'surgical' | 'traumatic';
        maturity: 'acute' | 'subacute' | 'chronic';
        adhesions: boolean;
      }>;
      fascialRestrictions: {
        itBand: { left: boolean; right: boolean };
        plantarFascia: { left: boolean; right: boolean };
        thoracolumbar: boolean;
      };
    };
    
    tendonPathology?: {
      achilles: { left: 'normal' | 'tendinopathy' | 'partial_tear' | 'complete_tear'; right: 'normal' | 'tendinopathy' | 'partial_tear' | 'complete_tear' };
      patellar: { left: 'normal' | 'tendinopathy' | 'partial_tear'; right: 'normal' | 'tendinopathy' | 'partial_tear' };
      rotatorCuff: { left: 'normal' | 'tendinopathy' | 'partial_tear' | 'complete_tear'; right: 'normal' | 'tendinopathy' | 'partial_tear' | 'complete_tear' };
    };
    
    ligamentInjuries?: {
      acl: { left: 'intact' | 'grade1' | 'grade2' | 'grade3'; right: 'intact' | 'grade1' | 'grade2' | 'grade3' };
      pcl: { left: 'intact' | 'grade1' | 'grade2' | 'grade3'; right: 'intact' | 'grade1' | 'grade2' | 'grade3' };
      mcl: { left: 'intact' | 'grade1' | 'grade2' | 'grade3'; right: 'intact' | 'grade1' | 'grade2' | 'grade3' };
      lcl: { left: 'intact' | 'grade1' | 'grade2' | 'grade3'; right: 'intact' | 'grade1' | 'grade2' | 'grade3' };
      atfl: { left: 'intact' | 'grade1' | 'grade2' | 'grade3'; right: 'intact' | 'grade1' | 'grade2' | 'grade3' };
    };
  }>().notNull().default({
    limbScales: {
      overall: 1,
      upperArm: 1,
      forearm: 1,
      thigh: 1,
      shin: 1
    },
    shoulderPathology: {
      scapularWinging: 0,
      acSeparation: 0,
      ghSubluxation: 0
    },
    spinalPathology: {
      scoliosis: 0,
      kyphosis: 45,
      lordosis: 45
    },
    lowerLimbPathology: {
      genuVarum: 0,
      genuValgum: 0,
      patellaHeight: 1
    },
    romLimitations: {
      hipFlexion: { left: 120, right: 120 },
      hipExtension: { left: 30, right: 30 },
      hipAbduction: { left: 45, right: 45 },
      hipAdduction: { left: 30, right: 30 },
      hipInternalRotation: { left: 40, right: 40 },
      hipExternalRotation: { left: 45, right: 45 },
      kneeFlexion: { left: 135, right: 135 },
      kneeExtension: { left: 0, right: 0 },
      ankleDorsiflexion: { left: 20, right: 20 },
      anklePlantarflexion: { left: 45, right: 45 },
      ankleInversion: { left: 30, right: 30 },
      ankleEversion: { left: 20, right: 20 },
      shoulderFlexion: { left: 180, right: 180 },
      shoulderExtension: { left: 60, right: 60 },
      shoulderAbduction: { left: 180, right: 180 },
      shoulderInternalRotation: { left: 70, right: 70 },
      shoulderExternalRotation: { left: 90, right: 90 },
      cervicalFlexion: 50,
      cervicalExtension: 60,
      cervicalRotation: { left: 80, right: 80 },
      thoracolumbarFlexion: 80,
      thoracolumbarExtension: 30,
      thoracolumbarRotation: { left: 45, right: 45 }
    },
    gaitPattern: {
      antalgia: 'none',
      trendelenburg: { left: false, right: false },
      duchenne: { left: false, right: false },
      circumduction: { left: false, right: false },
      hipHike: { left: false, right: false },
      steppage: { left: false, right: false },
      scissoring: false,
      stancePhaseDeviation: {
        heelStrike: 'normal',
        footFlat: 'normal',
        midstance: 'normal',
        heelOff: 'normal',
        toeOff: 'normal'
      },
      stepLength: { left: 65, right: 65 },
      strideLength: 130,
      cadence: 110,
      velocity: 1.2,
      baseOfSupport: 10,
      toeAngle: { left: 7, right: 7 }
    },
    painMapping: {
      regions: [],
      movementPain: {
        flexion: false,
        extension: false,
        rotation: false,
        weightBearing: false,
        nonWeightBearing: false,
        startUp: false,
        endRange: false
      }
    },
    forceCalculations: {
      bodyMass: 70,
      groundReactionForce: {
        vertical: 1.0,
        anteroposterior: 0.1,
        mediolateral: 0.05
      },
      jointMoments: {
        hip: { flexion: 0, abduction: 0, rotation: 0 },
        knee: { flexion: 0, varus: 0, rotation: 0 },
        ankle: { dorsiflexion: 0, inversion: 0 }
      },
      muscleForces: {
        quadriceps: 100,
        hamstrings: 100,
        gluteusMaximus: 100,
        gluteusMedius: 100,
        gastrocnemius: 100,
        tibialis: 100
      },
      centerOfPressure: {
        x: 0,
        y: 0
      },
      loadDistribution: {
        left: 50,
        right: 50
      }
    },
    // Phase 4 Muscle & Soft Tissue defaults
    muscleVisualization: {
      showMuscles: false,
      muscleOpacity: 0.7,
      muscleLayer: 'superficial' as const
    },
    muscleBulk: {
      quadriceps: { left: 100, right: 100 },
      hamstrings: { left: 100, right: 100 },
      gastrocnemius: { left: 100, right: 100 },
      gluteusMaximus: { left: 100, right: 100 },
      gluteusMedius: { left: 100, right: 100 },
      tibialis: { left: 100, right: 100 },
      deltoid: { left: 100, right: 100 },
      biceps: { left: 100, right: 100 },
      triceps: { left: 100, right: 100 }
    },
    muscleTone: {
      upperLimb: { left: 'normal' as const, right: 'normal' as const },
      lowerLimb: { left: 'normal' as const, right: 'normal' as const },
      trunk: 'normal' as const
    },
    triggerPoints: [],
    softTissue: {
      swelling: {
        knee: { left: 0, right: 0 },
        ankle: { left: 0, right: 0 },
        shoulder: { left: 0, right: 0 },
        elbow: { left: 0, right: 0 }
      },
      scarTissue: [],
      fascialRestrictions: {
        itBand: { left: false, right: false },
        plantarFascia: { left: false, right: false },
        thoracolumbar: false
      }
    },
    tendonPathology: {
      achilles: { left: 'normal' as const, right: 'normal' as const },
      patellar: { left: 'normal' as const, right: 'normal' as const },
      rotatorCuff: { left: 'normal' as const, right: 'normal' as const }
    },
    ligamentInjuries: {
      acl: { left: 'intact' as const, right: 'intact' as const },
      pcl: { left: 'intact' as const, right: 'intact' as const },
      mcl: { left: 'intact' as const, right: 'intact' as const },
      lcl: { left: 'intact' as const, right: 'intact' as const },
      atfl: { left: 'intact' as const, right: 'intact' as const }
    }
  }),
  
  // Movement Data
  capturedMovements: json("captured_movements").$type<Array<{
    timestamp: string;
    movementType: string;
    poseData: any;
    qualityScore: number;
    notes: string;
  }>>().default([]),
  
  // Clinical Notes
  clinicalObservations: text("clinical_observations"),
  treatmentPlan: text("treatment_plan"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastModified: timestamp("last_modified").defaultNow().notNull(),
});

export const insertPathologyTemplateSchema = createInsertSchema(pathologyTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPathologyTemplate = z.infer<typeof insertPathologyTemplateSchema>;
export type PathologyTemplate = typeof pathologyTemplates.$inferSelect;

export const insertVirtualPatientConfigSchema = createInsertSchema(virtualPatientConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastModified: true,
});

export type InsertVirtualPatientConfig = z.infer<typeof insertVirtualPatientConfigSchema>;
export type VirtualPatientConfig = typeof virtualPatientConfigs.$inferSelect;

// Virtual Patients from SOAP Notes Schema
export const soapVirtualPatients = pgTable("soap_virtual_patients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  soapNoteId: integer("soap_note_id")
    .references(() => soapNotes.id, { onDelete: "cascade" }),
  
  // Basic Patient Information (matching actual database structure)
  title: text("title"),
  patientProfile: json("patient_profile"),
  clinicalPresentation: json("clinical_presentation"),
  physicalFindings: json("physical_findings"),
  assessmentPlan: json("assessment_plan"),
  clinicalSummary: text("clinical_summary"), // Key clinical features summary
  bodyPart: bodyPartEnum("body_part").notNull(),
  
  // Motion Capture Data
  motionData: json("motion_data"),
  hasMotionData: boolean("has_motion_data").default(false).notNull(),
  aiGenerated: boolean("ai_generated").default(false).notNull(),
  
  // 1. Anthropometric Measurements
  anthropometrics: json("anthropometrics").$type<{
    height?: number; // in cm
    weight?: number; // in kg
    bmi?: number;
    bodyType?: 'ectomorph' | 'mesomorph' | 'endomorph';
    segmentProportions?: {
      trunkLength?: number; // relative to height (0.3-0.4)
      neckLength?: number; // relative to height (0.08-0.12)
      footSize?: number; // relative to height (0.14-0.17)
    };
  }>(),
  
  // 2. Postural Deviations
  posturalDeviations: json("posturaldeviations").$type<{
    spinalCurves?: {
      cervicalLordosis?: number; // degrees (-30 to -60 normal)
      thoracicKyphosis?: number; // degrees (20 to 45 normal)
      lumbarLordosis?: number; // degrees (-40 to -60 normal)
      scoliosis?: { angle: number; direction: 'left' | 'right'; level: string; };
    };
    headPosition?: {
      forwardHeadPosture?: number; // cm forward from plumb line
      lateralTilt?: number; // degrees
      rotation?: number; // degrees
    };
    shoulderAlignment?: {
      leftHeight?: number; // cm relative to right
      protraction?: number; // cm forward from ideal
      elevation?: number; // degrees
    };
    pelvicAlignment?: {
      anteriorTilt?: number; // degrees (5-12 normal)
      posteriorTilt?: number; // degrees
      lateralTilt?: number; // degrees
      rotation?: number; // degrees
    };
    footPosture?: {
      leftPronation?: number; // degrees
      rightPronation?: number; // degrees
      leftArchHeight?: 'high' | 'normal' | 'low' | 'flat';
      rightArchHeight?: 'high' | 'normal' | 'low' | 'flat';
    };
  }>(),
  
  // 3. Movement Quality Parameters
  movementQuality: json("movementquality").$type<{
    rangeOfMotion?: {
      [joint: string]: {
        flexion?: number;
        extension?: number;
        abduction?: number;
        adduction?: number;
        internalRotation?: number;
        externalRotation?: number;
        lateralFlexion?: number;
      };
    };
    movementSpeed?: {
      overall?: 'very_slow' | 'slow' | 'normal' | 'fast';
      guardedMovements?: string[]; // list of guarded movements
    };
    compensatoryPatterns?: {
      hipHike?: { side: 'left' | 'right'; severity: 'mild' | 'moderate' | 'severe'; };
      trunkLean?: { direction: 'forward' | 'backward' | 'left' | 'right'; angle: number; };
      circumduction?: { limb: string; severity: 'mild' | 'moderate' | 'severe'; };
      trendenlenburg?: { side: 'left' | 'right'; severity: 'mild' | 'moderate' | 'severe'; };
    };
    stability?: {
      staticBalance?: 'poor' | 'fair' | 'good' | 'excellent';
      dynamicBalance?: 'poor' | 'fair' | 'good' | 'excellent';
      swayPatterns?: string[]; // descriptions of sway patterns
      protectiveStrategies?: string[]; // ankle, hip, stepping strategies
    };
    coordination?: {
      quality?: 'smooth' | 'mildly_jerky' | 'moderately_jerky' | 'severely_jerky';
      timing?: 'normal' | 'delayed' | 'premature';
      interlimbCoordination?: 'normal' | 'impaired';
      eyeHandCoordination?: 'normal' | 'impaired';
    };
  }>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSoapVirtualPatientSchema = createInsertSchema(soapVirtualPatients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSoapVirtualPatient = z.infer<typeof insertSoapVirtualPatientSchema>;
export type SoapVirtualPatient = typeof soapVirtualPatients.$inferSelect;

// Add relation to SOAP notes
export const soapVirtualPatientRelations = relations(soapVirtualPatients, ({ one }) => ({
  user: one(users, {
    fields: [soapVirtualPatients.userId],
    references: [users.id],
  }),
  soapNote: one(soapNotes, {
    fields: [soapVirtualPatients.soapNoteId],
    references: [soapNotes.id],
  }),
}));

// AI Suggestions for real-time assistance during SOAP note recording
export const aiSuggestions = pgTable("ai_suggestions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(), // Links to SOAP note session
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  suggestionType: text("suggestion_type").notNull(), // 'question', 'treatment', 'diagnosis', 'test'
  suggestionText: text("suggestion_text").notNull(),
  context: text("context"), // What triggered this suggestion
  confidence: integer("confidence"), // AI confidence 0-100
  accepted: boolean("accepted").default(false),
  acceptedAt: timestamp("accepted_at"),
  relevantBodyPart: bodyPartEnum("relevant_body_part"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAiSuggestionSchema = createInsertSchema(aiSuggestions).omit({
  id: true,
  createdAt: true,
});

export type InsertAiSuggestion = z.infer<typeof insertAiSuggestionSchema>;
export type AiSuggestion = typeof aiSuggestions.$inferSelect;

// Comments on clinical notes
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id")
    .notNull()
    .references(() => clinicalNotes.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

// Tags for organizing clinical notes
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Junction table for many-to-many relationship between notes and tags
export const noteTags = pgTable("note_tags", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id")
    .notNull()
    .references(() => clinicalNotes.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
});

// Define relations after all tables are defined
export const userRelations = relations(users, ({ many }) => ({
  clinicalNotes: many(clinicalNotes),
  comments: many(comments),
}));

export const clinicalNoteRelations = relations(
  clinicalNotes,
  ({ one, many }) => ({
    user: one(users, {
      fields: [clinicalNotes.userId],
      references: [users.id],
    }),
    comments: many(comments),
    tags: many(noteTags),
  })
);

export const commentRelations = relations(comments, ({ one, many }) => ({
  note: one(clinicalNotes, {
    fields: [comments.noteId],
    references: [clinicalNotes.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
  }),
  replies: many(comments, { relationName: "replies" }),
}));

export const tagRelations = relations(tags, ({ many }) => ({
  notes: many(noteTags),
}));

export const noteTagsRelations = relations(noteTags, ({ one }) => ({
  note: one(clinicalNotes, {
    fields: [noteTags.noteId],
    references: [clinicalNotes.id],
  }),
  tag: one(tags, {
    fields: [noteTags.tagId],
    references: [tags.id],
  }),
}));

// Research Articles Schema
export const researchArticles = pgTable("research_articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  authors: text("authors").notNull(),
  journal: text("journal").notNull(),
  publicationDate: timestamp("publication_date").notNull(),
  doi: text("doi").notNull().unique(), // Digital Object Identifier (unique identifier for academic articles)
  abstract: text("abstract").notNull(),
  url: text("url").notNull(), // Link to the full article
  bodyPart: bodyPartEnum("body_part").default("general").notNull(), // Body part category
  keyFindings: text("key_findings"), // Summary of key findings
  clinicalRelevance: text("clinical_relevance"), // How this relates to clinical practice
  methodology: text("methodology"), // Study design and methodology
  // AI Gap Analysis fields
  aiAnalysisStatus: text("ai_analysis_status").default("pending"), // pending, analyzing, completed, failed
  qualityScore: integer("quality_score"), // 0-100 overall quality score
  identifiedGaps: json("identified_gaps").$type<{
    methodology: string[];
    statistical: string[];
    clinical: string[];
    bias: string[];
  }>(),
  generatedQuestions: json("generated_questions").$type<{
    critical: string[];
    moderate: string[];
    minor: string[];
  }>(),
  biasAssessment: json("bias_assessment").$type<{
    selectionBias: { score: number; notes: string };
    performanceBias: { score: number; notes: string };
    detectionBias: { score: number; notes: string };
    attritionBias: { score: number; notes: string };
    reportingBias: { score: number; notes: string };
  }>(),
  methodologyAssessment: json("methodology_assessment").$type<{
    sampleSizeAdequacy: { score: number; notes: string };
    studyDesign: { score: number; notes: string };
    outcomeValidation: { score: number; notes: string };
    followUpDuration: { score: number; notes: string };
    statisticalMethods: { score: number; notes: string };
  }>(),
  followUpQuestions: json("follow_up_questions").$type<{
    methodological: Array<{ question: string; priority: number; feasibilityScore: number; rationale: string }>;
    population: Array<{ question: string; priority: number; feasibilityScore: number; rationale: string }>;
    intervention: Array<{ question: string; priority: number; feasibilityScore: number; rationale: string }>;
    outcomes: Array<{ question: string; priority: number; feasibilityScore: number; rationale: string }>;
    mechanisms: Array<{ question: string; priority: number; feasibilityScore: number; rationale: string }>;
  }>(),
  aiAnalyzedAt: timestamp("ai_analyzed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertResearchArticleSchema = createInsertSchema(
  researchArticles
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertResearchArticle = z.infer<typeof insertResearchArticleSchema>;
export type ResearchArticle = typeof researchArticles.$inferSelect;

// Research Discussions Schema
export const researchDiscussions: any = pgTable("research_discussions", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id")
    .notNull()
    .references(() => researchArticles.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parentId: integer("parent_id").references(() => researchDiscussions.id, { onDelete: "cascade" }), // For threaded discussions
  content: text("content").notNull(),
  questionType: text("question_type"), // critical, moderate, minor, general
  isExpertVerified: boolean("is_expert_verified").default(false),
  upvotes: integer("upvotes").default(0),
  downvotes: integer("downvotes").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertResearchDiscussionSchema = createInsertSchema(researchDiscussions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  upvotes: true,
  downvotes: true,
});

export type InsertResearchDiscussion = z.infer<typeof insertResearchDiscussionSchema>;
export type ResearchDiscussion = typeof researchDiscussions.$inferSelect;

// Research Discussion Votes Schema
export const researchDiscussionVotes = pgTable("research_discussion_votes", {
  id: serial("id").primaryKey(),
  discussionId: integer("discussion_id")
    .notNull()
    .references(() => researchDiscussions.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  voteType: text("vote_type").notNull(), // 'up' or 'down'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ResearchDiscussionVote = typeof researchDiscussionVotes.$inferSelect;

// User Research Bookmarks Schema
export const userResearchBookmarks = pgTable("user_research_bookmarks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  articleId: integer("article_id")
    .notNull()
    .references(() => researchArticles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserResearchBookmark = typeof userResearchBookmarks.$inferSelect;

// Define research article relations
export const researchArticleRelations = relations(
  researchArticles,
  ({ many }) => ({
    tags: many(tags),
    discussions: many(researchDiscussions),
    bookmarks: many(userResearchBookmarks),
  })
);

export const researchDiscussionRelations = relations(
  researchDiscussions,
  ({ one, many }) => ({
    article: one(researchArticles, {
      fields: [researchDiscussions.articleId],
      references: [researchArticles.id],
    }),
    user: one(users, {
      fields: [researchDiscussions.userId],
      references: [users.id],
    }),
    parent: one(researchDiscussions, {
      fields: [researchDiscussions.parentId],
      references: [researchDiscussions.id],
    }),
    replies: many(researchDiscussions),
    votes: many(researchDiscussionVotes),
  })
);

// Subscription Plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  tier: membershipTierEnum("tier").notNull(),
  price: text("price").notNull(),
  interval: text("interval").notNull(),
  features: text("features").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(
  subscriptionPlans
).omit({
  id: true,
  createdAt: true,
});

export type InsertSubscriptionPlan = z.infer<
  typeof insertSubscriptionPlanSchema
>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

// Payment Records
export const paymentRecords = pgTable("payment_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planId: integer("plan_id")
    .notNull()
    .references(() => subscriptionPlans.id),
  amount: text("amount").notNull(),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  paymentMethod: text("payment_method").notNull(),
  transactionId: text("transaction_id").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentRecordSchema = createInsertSchema(
  paymentRecords
).omit({
  id: true,
  createdAt: true,
});

export type InsertPaymentRecord = z.infer<typeof insertPaymentRecordSchema>;
export type PaymentRecord = typeof paymentRecords.$inferSelect;

// Define payment relations
export const paymentRecordRelations = relations(paymentRecords, ({ one }) => ({
  user: one(users, {
    fields: [paymentRecords.userId],
    references: [users.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [paymentRecords.planId],
    references: [subscriptionPlans.id],
  }),
}));

// SOAP Note Input Schema
export const soapNoteInputSchema = z.object({
  patientName: z.string().min(1, { message: "Patient name is required" }),
  patientId: z.string().min(1, { message: "Patient ID is required" }),
  dateOfBirth: z.string().min(1, { message: "Date of birth is required" }),
  dateOfVisit: z.string().min(1, { message: "Date of visit is required" }),
  subjective: z
    .string()
    .min(1, { message: "Subjective information is required" }),
  objective: z
    .string()
    .min(1, { message: "Objective information is required" }),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  visibility: z.enum(["private", "public", "shared"]).default("private"),
});

export type SoapNoteInput = z.infer<typeof soapNoteInputSchema>;

// Research Platform Schema

// Research Gap Analysis
export const researchGaps = pgTable("research_gaps", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  bodyPart: bodyPartEnum("body_part").default("general").notNull(),
  gapType: text("gap_type").notNull(), // "demographic", "treatment", "outcome", "methodology"
  priority: text("priority").notNull(), // "low", "medium", "high", "critical"
  evidenceLevel: text("evidence_level"), // Current evidence quality
  potentialImpact: text("potential_impact").notNull(),
  suggestedMethodology: text("suggested_methodology"),
  aiGenerated: boolean("ai_generated").default(true).notNull(),
  verifiedByExpert: boolean("verified_by_expert").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertResearchGapSchema = createInsertSchema(researchGaps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertResearchGap = z.infer<typeof insertResearchGapSchema>;
export type ResearchGap = typeof researchGaps.$inferSelect;

// Research Projects
export const researchProjects = pgTable("research_projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  principalInvestigatorId: integer("principal_investigator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  researchGapId: integer("research_gap_id")
    .references(() => researchGaps.id, { onDelete: "set null" }),
  hypothesis: text("hypothesis").notNull(),
  methodology: text("methodology").notNull(),
  status: text("status").notNull(), // "proposal", "approved", "active", "completed", "published"
  ethicsApprovalStatus: text("ethics_approval_status").default("pending").notNull(),
  ethicsApprovalDate: timestamp("ethics_approval_date"),
  startDate: timestamp("start_date"),
  expectedEndDate: timestamp("expected_end_date"),
  actualEndDate: timestamp("actual_end_date"),
  participantCount: integer("participant_count").default(0),
  targetParticipantCount: integer("target_participant_count"),
  virtualPatientCohortCriteria: json("virtual_patient_cohort_criteria"),
  preliminaryResults: text("preliminary_results"),
  publications: json("publications"),
  collaboratingInstitutions: json("collaborating_institutions"),
  fundingSource: text("funding_source"),
  isPublic: boolean("is_public").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertResearchProjectSchema = createInsertSchema(researchProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertResearchProject = z.infer<typeof insertResearchProjectSchema>;
export type ResearchProject = typeof researchProjects.$inferSelect;

// Pattern Recognition Scores Table
export const patternRecognitionScores = pgTable("pattern_recognition_scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  score: integer("score").notNull(), // 0-100
  timeTaken: integer("time_taken").notNull(), // seconds
  questionsCorrect: integer("questions_correct").notNull(), // 0-100
  streakLength: integer("streak_length").notNull(), // consecutive correct before first mistake
  totalQuestions: integer("total_questions").default(100).notNull(),
  completionDate: timestamp("completion_date").defaultNow().notNull(),
  gameSessionId: text("game_session_id"), // for tracking individual sessions
});

export const insertPatternRecognitionScoreSchema = createInsertSchema(patternRecognitionScores).omit({
  id: true,
  completionDate: true,
});

export type InsertPatternRecognitionScore = z.infer<typeof insertPatternRecognitionScoreSchema>;
export type PatternRecognitionScore = typeof patternRecognitionScores.$inferSelect;

// Pattern Recognition Score Relations
export const patternRecognitionScoreRelations = relations(patternRecognitionScores, ({ one }) => ({
  user: one(users, {
    fields: [patternRecognitionScores.userId],
    references: [users.id],
  }),
}));

// Research Project Collaborators
export const researchCollaborators = pgTable("research_collaborators", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => researchProjects.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "investigator", "analyst", "advisor", "reviewer"
  permissions: json("permissions"), // Data access permissions
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const insertResearchCollaboratorSchema = createInsertSchema(researchCollaborators).omit({
  id: true,
  addedAt: true,
});

export type InsertResearchCollaborator = z.infer<typeof insertResearchCollaboratorSchema>;
export type ResearchCollaborator = typeof researchCollaborators.$inferSelect;

// Virtual Patient Research Consent
export const virtualPatientResearchConsent = pgTable("virtual_patient_research_consent", {
  id: serial("id").primaryKey(),
  virtualPatientId: integer("virtual_patient_id")
    .notNull()
    .references(() => virtualPatients.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  consentedForResearch: boolean("consented_for_research").default(false).notNull(),
  consentDate: timestamp("consent_date").defaultNow().notNull(),
  consentVersion: text("consent_version").default("1.0").notNull(),
  dataUsageTerms: json("data_usage_terms"),
  withdrawnAt: timestamp("withdrawn_at"),
});

export const insertVirtualPatientResearchConsentSchema = createInsertSchema(virtualPatientResearchConsent).omit({
  id: true,
  consentDate: true,
});

export type InsertVirtualPatientResearchConsent = z.infer<typeof insertVirtualPatientResearchConsentSchema>;
export type VirtualPatientResearchConsent = typeof virtualPatientResearchConsent.$inferSelect;

// Anonymous Patient Fingerprints Table
// Stores only hashed identifiers and progression markers - NO medical data
export const patientFingerprints = pgTable("patient_fingerprints", {
  id: serial("id").primaryKey(),
  patientHash: text("patient_hash").notNull().unique(), // SHA-256 hash of voice + clinical patterns
  visitCount: integer("visit_count").default(1).notNull(),
  lastVisitDate: timestamp("last_visit_date").defaultNow().notNull(),
  clinicalProgressionMarkers: json("clinical_progression_markers").$type<number[]>().default([]).notNull(), // Array of 0-1 scores
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPatientFingerprintSchema = createInsertSchema(patientFingerprints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastVisitDate: true,
});

export type InsertPatientFingerprint = z.infer<typeof insertPatientFingerprintSchema>;
export type PatientFingerprint = typeof patientFingerprints.$inferSelect;

// Research Data Requests
export const researchDataRequests = pgTable("research_data_requests", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => researchProjects.id, { onDelete: "cascade" }),
  requestedById: integer("requested_by_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  datasetCriteria: json("dataset_criteria").notNull(),
  justification: text("justification").notNull(),
  approvalStatus: text("approval_status").default("pending").notNull(), // "pending", "approved", "denied"
  approvedById: integer("approved_by_id")
    .references(() => users.id, { onDelete: "set null" }),
  approvalDate: timestamp("approval_date"),
  dataAccessExpiryDate: timestamp("data_access_expiry_date"),
  usageRestrictions: json("usage_restrictions"),
  downloadCount: integer("download_count").default(0),
  lastAccessedAt: timestamp("last_accessed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertResearchDataRequestSchema = createInsertSchema(researchDataRequests).omit({
  id: true,
  createdAt: true,
});

export type InsertResearchDataRequest = z.infer<typeof insertResearchDataRequestSchema>;
export type ResearchDataRequest = typeof researchDataRequests.$inferSelect;

// Research Relations
export const researchGapRelations = relations(researchGaps, ({ many }) => ({
  projects: many(researchProjects),
}));

export const researchProjectRelations = relations(researchProjects, ({ one, many }) => ({
  principalInvestigator: one(users, {
    fields: [researchProjects.principalInvestigatorId],
    references: [users.id],
  }),
  researchGap: one(researchGaps, {
    fields: [researchProjects.researchGapId],
    references: [researchGaps.id],
  }),
  collaborators: many(researchCollaborators),
  dataRequests: many(researchDataRequests),
}));

export const researchCollaboratorRelations = relations(researchCollaborators, ({ one }) => ({
  project: one(researchProjects, {
    fields: [researchCollaborators.projectId],
    references: [researchProjects.id],
  }),
  user: one(users, {
    fields: [researchCollaborators.userId],
    references: [users.id],
  }),
}));

export const virtualPatientResearchConsentRelations = relations(virtualPatientResearchConsent, ({ one }) => ({
  virtualPatient: one(virtualPatients, {
    fields: [virtualPatientResearchConsent.virtualPatientId],
    references: [virtualPatients.id],
  }),
  user: one(users, {
    fields: [virtualPatientResearchConsent.userId],
    references: [users.id],
  }),
}));

export const researchDataRequestRelations = relations(researchDataRequests, ({ one }) => ({
  project: one(researchProjects, {
    fields: [researchDataRequests.projectId],
    references: [researchProjects.id],
  }),
  requestedBy: one(users, {
    fields: [researchDataRequests.requestedById],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [researchDataRequests.approvedById],
    references: [users.id],
  }),
}));

// Research Papers with AI Analysis
export const researchPapers = pgTable("research_papers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  authors: text("authors").notNull(),
  journal: text("journal").notNull(),
  year: integer("year").notNull(),
  doi: text("doi"),
  pubmedId: text("pubmed_id"),
  bodyPart: bodyPartEnum("body_part").notNull(),
  studyDesign: studyDesignEnum("study_design").notNull(),
  evidenceLevel: evidenceLevelEnum("evidence_level").notNull(),
  sampleSize: integer("sample_size"),
  abstract: text("abstract").notNull(),
  
  // AI Analysis Fields
  aiSummary: text("ai_summary").notNull(),
  clinicalRelevance: text("clinical_relevance").notNull(),
  keyFindings: json("key_findings").$type<string[]>().notNull(),
  limitations: json("limitations").$type<string[]>().notNull(),
  practicalApplications: json("practical_applications").$type<string[]>().notNull(),
  strengthOfEvidence: integer("strength_of_evidence").notNull(), // 1-10 scale
  
  // Clinical Application Analysis
  treatmentProtocols: json("treatment_protocols").$type<{
    intervention: string;
    dosage: string;
    frequency: string;
    duration: string;
    outcome: string;
  }[]>().notNull(),
  
  contraindications: json("contraindications").$type<string[]>().notNull(),
  patientPopulation: text("patient_population").notNull(),
  outcomesMeasured: json("outcomes_measured").$type<string[]>().notNull(),
  
  // Evidence Quality Metrics
  riskOfBias: text("risk_of_bias").notNull(),
  confidenceInterval: text("confidence_interval"),
  statisticalSignificance: text("statistical_significance"),
  clinicalSignificance: text("clinical_significance"),
  
  // Research Context
  researchGaps: json("research_gaps").$type<string[]>().notNull(),
  futureResearchDirections: json("future_research_directions").$type<string[]>().notNull(),
  relatedStudies: json("related_studies").$type<string[]>().notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertResearchPaperSchema = createInsertSchema(researchPapers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertResearchPaper = z.infer<typeof insertResearchPaperSchema>;
export type ResearchPaper = typeof researchPapers.$inferSelect;

export const researchPaperRelations = relations(researchPapers, ({ many }) => ({
  discussions: many(researchDiscussions),
}));



// Generated Documents Schema
export const generatedDocuments = pgTable("generated_documents", {
  id: text("id").primaryKey(), // Using document ID as primary key
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  type: text("type").notNull(), // doctor_report, ahtr, discharge_summary, etc.
  filename: text("filename").notNull(),
  status: text("status").notNull(), // generating, ready, error
  wordPath: text("word_path"), // Path to Word document
  pdfPath: text("pdf_path"), // Path to PDF document
  error: text("error"), // Error message if generation failed
  metadata: json("metadata").$type<any>(), // Additional metadata
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export const insertGeneratedDocumentSchema = createInsertSchema(generatedDocuments).omit({
  generatedAt: true,
});

export type InsertGeneratedDocument = z.infer<typeof insertGeneratedDocumentSchema>;
export type GeneratedDocument = typeof generatedDocuments.$inferSelect;

// Patient Session Schema
export const patientSessions = pgTable("patient_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionName: text("session_name").notNull(),
  firstName: text("first_name"),
  middleName: text("middle_name"),
  lastName: text("last_name"),
  gender: text("gender"),
  dob: text("dob"),
  weight: text("weight"),
  heightFeet: text("height_feet"),
  heightInch: text("height_inch"),
  pastMedicalHistory: text("past_medical_history"),
  pastSurgicalHistory: text("past_surgical_history"),
  status: sessionStatusEnum("status").default("draft").notNull(),
  transcriptUrl: text("transcript_url"),
  transcriptS3Uri: text("transcript_s3_uri"),
  soapNote: json("soap_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPatientSessionSchema = createInsertSchema(
  patientSessions
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  transcriptUrl: true,
  transcriptS3Uri: true,
  soapNote: true,
});

export type InsertPatientSession = z.infer<typeof insertPatientSessionSchema>;
export type PatientSession = typeof patientSessions.$inferSelect;

// Define session relations
export const patientSessionRelations = relations(
  patientSessions,
  ({ one }) => ({
    user: one(users, {
      fields: [patientSessions.userId],
      references: [users.id],
    }),
  })
);

// Audio Recording Schema
export const audioRecordings = pgTable("audio_recordings", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => patientSessions.id, { onDelete: "cascade" }),
  audioUrl: text("audio_url").notNull(),
  audioS3Uri: text("audio_s3_uri").notNull(),
  duration: integer("duration").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAudioRecordingSchema = createInsertSchema(
  audioRecordings
).omit({
  id: true,
  createdAt: true,
});

export type InsertAudioRecording = z.infer<typeof insertAudioRecordingSchema>;
export type AudioRecording = typeof audioRecordings.$inferSelect;

// Define audio recording relations
export const audioRecordingRelations = relations(
  audioRecordings,
  ({ one }) => ({
    session: one(patientSessions, {
      fields: [audioRecordings.sessionId],
      references: [patientSessions.id],
    }),
  })
);

// Manual Therapy Technique Schema
export const manualTherapyTechniques = pgTable("manual_therapy_techniques", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  bodyPart: bodyPartEnum("body_part").default("general").notNull(),
  targetStructures: text("target_structures").notNull(),
  instructions: text("instructions").notNull(),
  precautions: text("precautions"),
  indications: text("indications"),
  contraindications: text("contraindications"),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  aiGenerated: boolean("ai_generated").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertManualTherapyTechniqueSchema = createInsertSchema(
  manualTherapyTechniques
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertManualTherapyTechnique = z.infer<
  typeof insertManualTherapyTechniqueSchema
>;
export type ManualTherapyTechnique =
  typeof manualTherapyTechniques.$inferSelect;

// Virtual Patient Schema
export const virtualPatients = pgTable("virtual_patients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  patient_name: text("patient_name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  chief_complaint: text("chief_complaint").notNull(),
  past_medical_history: text("past_medical_history"),
  // Removed painLevel field since it doesn't exist in the database
  body_part: bodyPartEnum("body_part").default("general").notNull(),
  symptoms_description: text("symptoms_description").notNull(),
  // Removed assessment field since it doesn't match our database
  diagnosis: text("diagnosis"),
  differentialDiagnosis: json("differential_diagnosis"),
  treatmentOptions: json("treatment_options"),
  relatedArticleIds: json("related_article_ids"),
  hasBeenEdited: boolean("has_been_edited").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertVirtualPatientSchema = createInsertSchema(
  virtualPatients
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  diagnosis: true,
  differentialDiagnosis: true,
  treatmentOptions: true,
  relatedArticleIds: true,
});

export type InsertVirtualPatient = z.infer<typeof insertVirtualPatientSchema>;
export type VirtualPatient = typeof virtualPatients.$inferSelect;

// Define virtual patient relations
export const virtualPatientRelations = relations(
  virtualPatients,
  ({ one }) => ({
    user: one(users, {
      fields: [virtualPatients.userId],
      references: [users.id],
    }),
  })
);

// Expertise level enum for shared cases
export const expertiseLevelEnum = pgEnum("expertise_level", [
  "student",
  "entry",
  "intermediate",
  "advanced",
  "expert",
]);

// Complexity level enum for shared cases
export const complexityLevelEnum = pgEnum("complexity_level", [
  "basic",
  "moderate",
  "complex",
  "challenging",
]);

// Shared Cases Schema (Peer Knowledge Exchange)
export const sharedCases = pgTable("shared_cases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  patientAgeRange: text("patient_age_range"),
  patientGender: text("patient_gender"),
  condition: text("condition").notNull(),
  bodyPart: bodyPartEnum("body_part").default("other").notNull(),
  presentingComplaints: text("presenting_complaints").notNull(),
  clinicalHistory: text("clinical_history"),
  examinationFindings: text("examination_findings").notNull(),
  investigationResults: text("investigation_results"),
  initialDiagnosis: text("initial_diagnosis").notNull(),
  treatmentApproach: text("treatment_approach").notNull(),
  outcome: text("outcome"),
  expertiseLevel: expertiseLevelEnum("expertise_level")
    .default("intermediate")
    .notNull(),
  complexityLevel: complexityLevelEnum("complexity_level")
    .default("moderate")
    .notNull(),
  learningPoints: text("learning_points"),
  attachmentUrls: json("attachment_urls"),
  upvotes: integer("upvotes").default(0).notNull(),
  views: integer("views").default(0).notNull(),
  isApproved: boolean("is_approved").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSharedCaseSchema = createInsertSchema(sharedCases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  upvotes: true,
  views: true,
  isApproved: true,
});

export type InsertSharedCase = z.infer<typeof insertSharedCaseSchema>;
export type SharedCase = typeof sharedCases.$inferSelect;

// Case Discussions Schema
export const caseDiscussions = pgTable("case_discussions", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id")
    .notNull()
    .references(() => sharedCases.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentId: integer("parent_id"),
  upvotes: integer("upvotes").default(0).notNull(),
  isEdited: boolean("is_edited").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCaseDiscussionSchema = createInsertSchema(
  caseDiscussions
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  upvotes: true,
  isEdited: true,
});

export type InsertCaseDiscussion = z.infer<typeof insertCaseDiscussionSchema>;
export type CaseDiscussion = typeof caseDiscussions.$inferSelect;

// Case Tags Schema
export const caseTags = pgTable("case_tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  color: text("color").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Case Tags Mapping (Junction table)
export const caseTagsMapping = pgTable("case_tags_mapping", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id")
    .notNull()
    .references(() => sharedCases.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => caseTags.id, { onDelete: "cascade" }),
});

// Case Upvotes Schema
export const caseUpvotes = pgTable("case_upvotes", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id")
    .notNull()
    .references(() => sharedCases.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Discussion Upvotes Schema
export const discussionUpvotes = pgTable("discussion_upvotes", {
  id: serial("id").primaryKey(),
  discussionId: integer("discussion_id")
    .notNull()
    .references(() => caseDiscussions.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define relations for case-related tables
export const sharedCaseRelations = relations(sharedCases, ({ one, many }) => ({
  user: one(users, {
    fields: [sharedCases.userId],
    references: [users.id],
  }),
  discussions: many(caseDiscussions),
  tagMappings: many(caseTagsMapping),
  upvotes: many(caseUpvotes),
}));

export const caseDiscussionRelations = relations(
  caseDiscussions,
  ({ one, many }) => ({
    case: one(sharedCases, {
      fields: [caseDiscussions.caseId],
      references: [sharedCases.id],
    }),
    user: one(users, {
      fields: [caseDiscussions.userId],
      references: [users.id],
    }),
    parent: one(caseDiscussions, {
      fields: [caseDiscussions.parentId],
      references: [caseDiscussions.id],
    }),
    replies: many(caseDiscussions, { relationName: "replies" }),
    upvotes: many(discussionUpvotes),
  })
);

export const caseTagsMappingRelations = relations(
  caseTagsMapping,
  ({ one }) => ({
    case: one(sharedCases, {
      fields: [caseTagsMapping.caseId],
      references: [sharedCases.id],
    }),
    tag: one(caseTags, {
      fields: [caseTagsMapping.tagId],
      references: [caseTags.id],
    }),
  })
);

export const caseUpvoteRelations = relations(caseUpvotes, ({ one }) => ({
  case: one(sharedCases, {
    fields: [caseUpvotes.caseId],
    references: [sharedCases.id],
  }),
  user: one(users, {
    fields: [caseUpvotes.userId],
    references: [users.id],
  }),
}));

export const discussionUpvoteRelations = relations(
  discussionUpvotes,
  ({ one }) => ({
    discussion: one(caseDiscussions, {
      fields: [discussionUpvotes.discussionId],
      references: [caseDiscussions.id],
    }),
    user: one(users, {
      fields: [discussionUpvotes.userId],
      references: [users.id],
    }),
  })
);

// AI Case Study (research-based physiotherapy cases)
export const aiCaseStudies = pgTable("ai_case_studies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  patientDescription: text("patient_description").notNull(),
  history: text("history").notNull(),
  presentingSymptoms: text("presenting_symptoms").notNull(),
  vitalSigns: text("vital_signs"),
  bodyPart: bodyPartEnum("body_part").notNull(),
  complexity: text("complexity").notNull(),
  hiddenFindings: json("hidden_findings").notNull().$type<{
    rangeOfMotion?: string;
    strength?: string;
    specialTests?: string;
    palpation?: string;
    additionalObservations?: string;
  }>(),
  correctDiagnosis: text("correct_diagnosis").notNull(),
  differentialDiagnoses: json("differential_diagnoses")
    .notNull()
    .$type<string[]>(),
  correctAssessmentApproach: json("correct_assessment_approach")
    .notNull()
    .$type<string[]>(),
  correctTreatmentApproach: text("correct_treatment_approach").notNull(),
  researchBasis: json("research_basis").$type<string[]>(),
  expertSources: json("expert_sources").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAICaseStudySchema = createInsertSchema(aiCaseStudies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAICaseStudy = z.infer<typeof insertAICaseStudySchema>;
export type AICaseStudy = typeof aiCaseStudies.$inferSelect;

// User Case Study Attempts
export const caseStudyAttempts = pgTable("case_study_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  caseStudyId: integer("case_study_id")
    .notNull()
    .references(() => aiCaseStudies.id),
  userDiagnosis: text("user_diagnosis").notNull(),
  userReasoning: text("user_reasoning").notNull(),
  assessmentTests: json("assessment_tests").notNull().$type<string[]>(),
  proposedTreatment: text("proposed_treatment").notNull(),
  overallAccuracy: integer("overall_accuracy"),
  feedback: json("feedback").$type<{
    diagnosisFeedback?: string;
    assessmentFeedback?: string;
    treatmentFeedback?: string;
    keyLearningPoints?: string[];
    suggestedResources?: string[];
  }>(),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCaseStudyAttemptSchema = createInsertSchema(
  caseStudyAttempts
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCaseStudyAttempt = z.infer<
  typeof insertCaseStudyAttemptSchema
>;
export type CaseStudyAttempt = typeof caseStudyAttempts.$inferSelect;

// Relations
export const aiCaseStudyRelations = relations(
  aiCaseStudies,
  ({ one, many }) => ({
    user: one(users, {
      fields: [aiCaseStudies.userId],
      references: [users.id],
    }),
    attempts: many(caseStudyAttempts),
  })
);

export const caseStudyAttemptRelations = relations(
  caseStudyAttempts,
  ({ one }) => ({
    user: one(users, {
      fields: [caseStudyAttempts.userId],
      references: [users.id],
    }),
    caseStudy: one(aiCaseStudies, {
      fields: [caseStudyAttempts.caseStudyId],
      references: [aiCaseStudies.id],
    }),
  })
);

// Complex Case Study System for Multi-Stage Competitions

// Complex cases with detailed patient presentations and multiple stages
export const complexCases = pgTable("complex_cases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  patientDescription: text("patient_description").notNull(), // detailed patient background
  occupationalHistory: text("occupational_history"),
  socialHistory: text("social_history"),
  medicalHistory: text("medical_history").notNull(),
  currentMedications: text("current_medications"),
  mechanismOfInjury: text("mechanism_of_injury"),
  bodyPart: bodyPartEnum("body_part").notNull(),
  complexity: text("complexity").notNull(), // beginner, intermediate, advanced
  estimatedTime: integer("estimated_time_minutes").default(45), // expected completion time
  
  // Progressive Information Release
  initialPresentation: json("initial_presentation").notNull().$type<{
    chiefComplaint: string;
    painScale: number;
    functionalLimitations: string[];
    patientGoals: string[];
  }>(),
  
  // Detailed case content
  detailedHistory: json("detailed_history").notNull().$type<{
    onsetDetails: string;
    progressionPattern: string;
    aggravatingFactors: string[];
    easingFactors: string[];
    previousTreatments: string[];
    redFlagScreening: string[];
  }>(),
  
  physicalFindings: json("physical_findings").notNull().$type<{
    observation: string;
    palpation: string;
    rangeOfMotion: string;
    strength: string;
    neurological: string;
    specialTests: string;
    functional: string;
  }>(),
  
  // Correct answers for scoring
  correctDifferentials: json("correct_differentials").notNull().$type<{
    primary: string;
    secondary: string[];
    ruled_out: string[];
  }>(),
  
  correctAssessments: json("correct_assessments").notNull().$type<string[]>(),
  correctTreatmentPlan: json("correct_treatment_plan").notNull().$type<{
    shortTerm: string[];
    longTerm: string[];
    patientEducation: string[];
    expectedOutcome: string;
    reassessmentPlan: string;
  }>(),
  
  expertRationale: text("expert_rationale").notNull(),
  researchEvidence: json("research_evidence").$type<string[]>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Stages within each complex case (sequential questions)
export const caseStages = pgTable("case_stages", {
  id: serial("id").primaryKey(),
  complexCaseId: integer("complex_case_id").notNull().references(() => complexCases.id, { onDelete: "cascade" }),
  stageNumber: integer("stage_number").notNull(), // 1, 2, 3, etc.
  title: text("title").notNull(), // "Initial Assessment", "Physical Examination Planning"
  description: text("description").notNull(),
  stageType: text("stage_type"), // "assessment", "examination", "diagnosis", "treatment"
  
  // Information provided at this stage
  informationRevealed: json("information_revealed").$type<{
    patientResponse?: string;
    testResults?: string;
    additionalHistory?: string;
    observationFindings?: string;
  }>(),
  
  // Time allocation for this stage
  expectedTimeMinutes: integer("expected_time_minutes").default(8),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Questions within each stage
export const stageQuestions = pgTable("stage_questions", {
  id: serial("id").primaryKey(),
  stageId: integer("stage_id").notNull().references(() => caseStages.id, { onDelete: "cascade" }),
  questionNumber: integer("question_number").notNull(),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").notNull(), // "multiple_choice", "short_answer", "list", "essay"
  
  // Feedback and learning
  correctAnswer: text("correct_answer").notNull(),
  answerExplanation: text("answer_explanation").notNull(),
  scoringCriteria: json("scoring_criteria").notNull().$type<{
    maxPoints: number;
    partialCredit: boolean;
    keywordPoints: Array<{ keyword: string; points: number }>;
  }>(),
  pointsAvailable: integer("points_available").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User attempts at complex cases
export const complexCaseAttempts = pgTable("complex_case_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  complexCaseId: integer("complex_case_id").notNull().references(() => complexCases.id),
  competitionId: integer("competition_id").references(() => competitions.id), // if part of competition
  
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  totalTimeSpent: integer("total_time_spent_seconds").default(0),
  
  // Overall scoring
  totalScore: integer("total_score").default(0),
  maxPossibleScore: integer("max_possible_score").default(100),
  clinicalReasoningScore: integer("clinical_reasoning_score").default(0),
  assessmentSkillsScore: integer("assessment_skills_score").default(0),
  treatmentPlanningScore: integer("treatment_planning_score").default(0),
  communicationScore: integer("communication_score").default(0),
  timeEfficiencyScore: integer("time_efficiency_score").default(0),
  
  // Detailed attempt data
  stageResponses: json("stage_responses").notNull().$type<Array<{
    stageId: number;
    startTime: string;
    endTime: string;
    responses: Array<{
      questionId: number;
      answer: string;
      timeSpent: number;
      score: number;
      feedback: string;
    }>;
  }>>(),
  
  // Overall feedback
  overallFeedback: json("overall_feedback").$type<{
    strengths: string[];
    improvementAreas: string[];
    recommendedResources: string[];
    nextSteps: string[];
  }>(),
});

export const insertComplexCaseSchema = createInsertSchema(complexCases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCaseStageSchema = createInsertSchema(caseStages).omit({
  id: true,
  createdAt: true,
});

export const insertStageQuestionSchema = createInsertSchema(stageQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertComplexCaseAttemptSchema = createInsertSchema(complexCaseAttempts).omit({
  id: true,
});

export type InsertComplexCase = z.infer<typeof insertComplexCaseSchema>;
export type InsertCaseStage = z.infer<typeof insertCaseStageSchema>;
export type InsertStageQuestion = z.infer<typeof insertStageQuestionSchema>;
export type InsertComplexCaseAttempt = z.infer<typeof insertComplexCaseAttemptSchema>;

export type ComplexCase = typeof complexCases.$inferSelect;
export type CaseStage = typeof caseStages.$inferSelect;
export type StageQuestion = typeof stageQuestions.$inferSelect;
export type ComplexCaseAttempt = typeof complexCaseAttempts.$inferSelect;

// Relations for complex cases
export const complexCaseRelations = relations(complexCases, ({ one, many }) => ({
  user: one(users, {
    fields: [complexCases.userId],
    references: [users.id],
  }),
  stages: many(caseStages),
  attempts: many(complexCaseAttempts),
}));

export const caseStageRelations = relations(caseStages, ({ one, many }) => ({
  complexCase: one(complexCases, {
    fields: [caseStages.complexCaseId],
    references: [complexCases.id],
  }),
  questions: many(stageQuestions),
}));

export const stageQuestionRelations = relations(stageQuestions, ({ one }) => ({
  stage: one(caseStages, {
    fields: [stageQuestions.stageId],
    references: [caseStages.id],
  }),
}));

export const complexCaseAttemptRelations = relations(complexCaseAttempts, ({ one }) => ({
  user: one(users, {
    fields: [complexCaseAttempts.userId],
    references: [users.id],
  }),
  complexCase: one(complexCases, {
    fields: [complexCaseAttempts.complexCaseId],
    references: [complexCases.id],
  }),
  competition: one(competitions, {
    fields: [complexCaseAttempts.competitionId],
    references: [competitions.id],
  }),
}));

// Competition System Tables

// Competitions table
export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: competitionTypeEnum("type").notNull(),
  gameType: gameTypeEnum("game_type").default("standard_case").notNull(),
  status: competitionStatusEnum("status").default("upcoming").notNull(),
  bodyPart: bodyPartEnum("body_part"), // null for general competitions
  difficulty: text("difficulty"), // beginner, intermediate, advanced
  timeLimit: integer("time_limit_minutes"), // in minutes
  maxParticipants: integer("max_participants").default(20), // Default 20 participants
  currentParticipants: integer("current_participants").default(0), // Track current count
  entryFee: integer("entry_fee_points").default(0), // using points system
  prizePool: integer("prize_pool_points").default(0),
  registrationOpensAt: timestamp("registration_opens_at"), // When registration opens
  registrationDeadline: timestamp("registration_deadline"), // When registration closes
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  caseStudyIds: integer("case_study_ids").array().notNull(), // array of case study IDs
  complexCaseIds: integer("complex_case_ids").array(), // array of complex case IDs
  caseType: text("case_type").default("simple").notNull(), // "simple" or "complex"
  isAutoGenerated: boolean("is_auto_generated").default(false), // Flag for auto-scheduled competitions
  nextScheduledTime: timestamp("next_scheduled_time"), // For recurring competitions
  rules: json("rules").$type<{
    scoringWeights: {
      accuracy: number;
      speed: number;
      reasoning: number;
      differential: number;
      treatment: number;
    };
    allowedAttempts: number;
    showLeaderboard: boolean;
    revealAnswers: boolean;
    stageTimeLimit: number; // Time limit per stage in minutes
    enableAntiCheat: boolean; // Enable anti-cheating measures
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Game content for different competition types
export const gameContent = pgTable("game_content", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  gameType: gameTypeEnum("game_type").notNull(),
  content: json("content").$type<{
    // Lightning Diagnosis
    lightningDiagnosis?: {
      cases: Array<{
        id: string;
        presentation: string;
        timeLimit: number; // seconds
        correctDiagnosis: string;
        redHerrings: string[];
      }>;
    };
    // Treatment Speed Run  
    treatmentSpeedRun?: {
      cases: Array<{
        id: string;
        diagnosis: string;
        patientProfile: string;
        timeLimit: number;
        requiredComponents: string[];
        scoringCriteria: string[];
      }>;
    };
    // Progressive Diagnostic Challenge
    progressiveDiagnosticChallenge?: {
      cases: Array<{
        id: string;
        initialPresentation: string;
        patientAge: number;
        patientGender: string;
        availableQuestions: Array<{
          id: string;
          question: string;
          cost: number;
          category: 'history' | 'symptoms' | 'behavior' | 'lifestyle' | 'family_history';
          answer: string;
          revealsRedFlag?: boolean;
        }>;
        availableTests: Array<{
          id: string;
          testName: string;
          cost: number;
          timeRequired: number; // minutes
          category: 'orthopedic' | 'neurological' | 'imaging' | 'lab' | 'special';
          result: string;
          accuracy: number; // 0-100%
          contraindications?: string[];
        }>;
        correctDiagnosis: string;
        differentialDiagnoses: string[];
        redFlags: string[];
        timeEvolution?: Array<{
          timePoint: number; // minutes
          newSymptoms?: string[];
          changingVitals?: Record<string, string>;
          complications?: string[];
        }>;
        scoringWeights: {
          efficiency: number; // % weight for using minimal resources
          thoroughness: number; // % weight for ruling out differentials  
          safety: number; // % weight for identifying red flags
          accuracy: number; // % weight for correct diagnosis
        };
        maxQuestionCredits: number;
        maxTestCredits: number;
        timeLimit: number; // minutes for entire case
      }>;
    };
    // Choose Your Adventure
    chooseYourAdventure?: {
      storyline: Array<{
        id: string;
        scene: string;
        choices: Array<{
          text: string;
          nextScene: string;
          consequences: string;
          points: number;
        }>;
        isEnding: boolean;
      }>;
    };
    // Emergency Room Simulator
    emergencyRoomSimulator?: {
      patients: Array<{
        id: string;
        name: string;
        urgency: 'critical' | 'urgent' | 'semi-urgent' | 'non-urgent';
        presentation: string;
        vitalSigns: Record<string, string>;
        arrivalTime: number;
        expectedTreatmentTime: number;
      }>;
      resources: {
        beds: number;
        staff: number;
        equipment: string[];
      };
    };
    // Red Flag Detective
    redFlagDetective?: {
      cases: Array<{
        id: string;
        patientStory: string;
        hiddenRedFlags: string[];
        distractors: string[];
        severity: 'low' | 'medium' | 'high' | 'critical';
        timeToIdentify: number;
      }>;
    };
    // Differential Diagnosis Duel
    differentialDiagnosisDuel?: {
      rounds: Array<{
        casePresentation: string;
        correctDifferentials: string[];
        commonMistakes: string[];
        pointsPerCorrect: number;
        timeLimit: number;
      }>;
    };
    // Journal Club Race
    journalClubRace?: {
      papers: Array<{
        id: string;
        title: string;
        abstract: string;
        methodology: string;
        results: string;
        questions: Array<{
          question: string;
          options: string[];
          correctAnswer: number;
          explanation: string;
        }>;
      }>;
    };
    // CPG Quiz Master
    cpgQuizMaster?: {
      guidelines: Array<{
        organization: string;
        topic: string;
        questions: Array<{
          question: string;
          options: string[];
          correctAnswer: number;
          evidenceLevel: string;
          guidanceStrength: string;
        }>;
      }>;
    };
    // Mystery Patient
    mysteryPatient?: {
      clues: Array<{
        stage: number;
        clueType: 'history' | 'examination' | 'investigation' | 'observation';
        content: string;
        significance: 'low' | 'medium' | 'high';
      }>;
      solution: {
        diagnosis: string;
        explanation: string;
        keyClues: string[];
      };
    };
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Competition participants
export const competitionParticipants = pgTable("competition_participants", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  totalScore: integer("total_score").default(0),
  rank: integer("rank"),
  timeSpent: integer("time_spent_seconds").default(0),
  caseAttempts: json("case_attempts").notNull().$type<{
    caseStudyId: number;
    userDiagnosis: string;
    userReasoning: string;
    assessmentTests: string[];
    proposedTreatment: string;
    timeSpent: number;
    scores: {
      accuracy: number;
      speed: number;
      reasoning: number;
      differential: number;
      treatment: number;
      total: number;
    };
    feedback?: string;
    questionFeedbacks?: {
      questionId: string;
      questionText: string;
      userResponse: string;
      correctAnswer?: string;
      aiAnalysis: string;
      score: number;
      strengths: string[];
      improvements: string[];
      clinicalReasoning: string;
      timeSpent?: number;
    }[];
    recommendedLearning?: string[];
    nextSteps?: string[];
  }[]>(),
});

// Daily challenges (special type of competition)
export const dailyChallenges = pgTable("daily_challenges", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  caseStudyId: integer("case_study_id").notNull().references(() => aiCaseStudies.id),
  difficulty: text("difficulty"),
  bodyPart: bodyPartEnum("body_part"),
  date: date("date").notNull().unique(),
  participantCount: integer("participant_count").default(0),
  averageScore: integer("average_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// User achievements
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  achievementType: achievementTypeEnum("achievement_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon"), // lucide icon name
  progress: integer("progress").default(0),
  target: integer("target").notNull(),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

// Leaderboards (aggregate rankings)
export const leaderboards = pgTable("leaderboards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  category: text("category").notNull(), // "overall", "speed", "accuracy", etc.
  bodyPart: bodyPartEnum("body_part"), // null for overall rankings
  timeframe: text("timeframe").notNull(), // "daily", "weekly", "monthly", "all_time"
  score: integer("score").notNull(),
  rank: integer("rank").notNull(),
  gamesPlayed: integer("games_played").default(0),
  averageScore: integer("average_score").default(0),
  winStreak: integer("win_streak").default(0),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// Tournament brackets (for tournament-style competitions)
export const tournamentBrackets = pgTable("tournament_brackets", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  round: integer("round").notNull(),
  matchNumber: integer("match_number").notNull(),
  participant1Id: integer("participant1_id").references(() => users.id),
  participant2Id: integer("participant2_id").references(() => users.id),
  winnerId: integer("winner_id").references(() => users.id),
  participant1Score: integer("participant1_score").default(0),
  participant2Score: integer("participant2_score").default(0),
  caseStudyId: integer("case_study_id").references(() => aiCaseStudies.id),
  completedAt: timestamp("completed_at"),
});

// Diagnosis Duel Tournaments (Real-time 1v1 tournaments)
export const diagnosisDuelTournaments = pgTable("diagnosis_duel_tournaments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  bodyPart: bodyPartEnum("body_part").default("general").notNull(),
  difficulty: text("difficulty").default("intermediate").notNull(),
  status: tournamentStatusEnum("status").default("registration").notNull(),
  maxParticipants: integer("max_participants").default(32).notNull(),
  currentParticipants: integer("current_participants").default(0).notNull(),
  currentRound: integer("current_round").default(1).notNull(),
  registrationStartTime: timestamp("registration_start_time").defaultNow().notNull(),
  registrationEndTime: timestamp("registration_end_time").notNull(),
  tournamentStartTime: timestamp("tournament_start_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tournament participants (for diagnosis duel tournaments)
export const tournamentParticipants = pgTable("tournament_participants", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => diagnosisDuelTournaments.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  username: text("username").notNull(), // Username for display purposes
  bracketPosition: integer("bracket_position"), // Position in the bracket (1-32)
  currentRound: integer("current_round").default(1).notNull(),
  isEliminated: boolean("is_eliminated").default(false).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Tournament matches (1v1 matches within tournaments)
export const tournamentMatches = pgTable("tournament_matches", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => diagnosisDuelTournaments.id, { onDelete: "cascade" }),
  round: integer("round").notNull(),
  matchNumber: integer("match_number").notNull(),
  player1Id: integer("player1_id").notNull().references(() => users.id),
  player2Id: integer("player2_id").notNull().references(() => users.id),
  player1Username: text("player1_username").notNull(),
  player2Username: text("player2_username").notNull(),
  player1Score: integer("player1_score").default(0),
  player2Score: integer("player2_score").default(0),
  player1TimeSpent: integer("player1_time_spent").default(0),
  player2TimeSpent: integer("player2_time_spent").default(0),
  winnerId: integer("winner_id").references(() => users.id),
  status: matchStatusEnum("status").default("scheduled").notNull(),
  gameContentId: integer("game_content_id").references(() => gameContent.id),
  scheduledStartTime: timestamp("scheduled_start_time"),
  actualStartTime: timestamp("actual_start_time"),
  completedAt: timestamp("completed_at"),
  player1Responses: json("player1_responses").$type<Record<string, string>>(),
  player2Responses: json("player2_responses").$type<Record<string, string>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Create insert schemas
export const insertCompetitionSchema = createInsertSchema(competitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompetitionParticipantSchema = createInsertSchema(competitionParticipants).omit({
  id: true,
});

export const insertDailyChallengeSchema = createInsertSchema(dailyChallenges).omit({
  id: true,
  createdAt: true,
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  earnedAt: true,
});

export const insertLeaderboardSchema = createInsertSchema(leaderboards).omit({
  id: true,
  lastUpdated: true,
});

export const insertTournamentBracketSchema = createInsertSchema(tournamentBrackets).omit({
  id: true,
});

// Tournament insert schemas
export const insertDiagnosisDuelTournamentSchema = createInsertSchema(diagnosisDuelTournaments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTournamentParticipantSchema = createInsertSchema(tournamentParticipants).omit({
  id: true,
  joinedAt: true,
});

export const insertTournamentMatchSchema = createInsertSchema(tournamentMatches).omit({
  id: true,
  createdAt: true,
});

// Define types
export type Competition = typeof competitions.$inferSelect;
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;
export type CompetitionParticipant = typeof competitionParticipants.$inferSelect;
export type InsertCompetitionParticipant = z.infer<typeof insertCompetitionParticipantSchema>;
export type DailyChallenge = typeof dailyChallenges.$inferSelect;
export type InsertDailyChallenge = z.infer<typeof insertDailyChallengeSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type Leaderboard = typeof leaderboards.$inferSelect;
export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;
export type TournamentBracket = typeof tournamentBrackets.$inferSelect;
export type InsertTournamentBracket = z.infer<typeof insertTournamentBracketSchema>;

// Tournament types
export type DiagnosisDuelTournament = typeof diagnosisDuelTournaments.$inferSelect;
export type InsertDiagnosisDuelTournament = z.infer<typeof insertDiagnosisDuelTournamentSchema>;
export type TournamentParticipant = typeof tournamentParticipants.$inferSelect;
export type InsertTournamentParticipant = z.infer<typeof insertTournamentParticipantSchema>;
export type TournamentMatch = typeof tournamentMatches.$inferSelect;
export type InsertTournamentMatch = z.infer<typeof insertTournamentMatchSchema>;

// Define relations
export const competitionRelations = relations(competitions, ({ many, one }) => ({
  participants: many(competitionParticipants),
  creator: one(users, {
    fields: [competitions.createdBy],
    references: [users.id],
  }),
  brackets: many(tournamentBrackets),
}));

export const competitionParticipantRelations = relations(competitionParticipants, ({ one }) => ({
  competition: one(competitions, {
    fields: [competitionParticipants.competitionId],
    references: [competitions.id],
  }),
  user: one(users, {
    fields: [competitionParticipants.userId],
    references: [users.id],
  }),
}));

export const dailyChallengeRelations = relations(dailyChallenges, ({ one }) => ({
  caseStudy: one(aiCaseStudies, {
    fields: [dailyChallenges.caseStudyId],
    references: [aiCaseStudies.id],
  }),
}));

export const userAchievementRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
}));

export const leaderboardRelations = relations(leaderboards, ({ one }) => ({
  user: one(users, {
    fields: [leaderboards.userId],
    references: [users.id],
  }),
}));

export const tournamentBracketRelations = relations(tournamentBrackets, ({ one }) => ({
  competition: one(competitions, {
    fields: [tournamentBrackets.competitionId],
    references: [competitions.id],
  }),
  participant1: one(users, {
    fields: [tournamentBrackets.participant1Id],
    references: [users.id],
  }),
  participant2: one(users, {
    fields: [tournamentBrackets.participant2Id],
    references: [users.id],
  }),
  winner: one(users, {
    fields: [tournamentBrackets.winnerId],
    references: [users.id],
  }),
  caseStudy: one(aiCaseStudies, {
    fields: [tournamentBrackets.caseStudyId],
    references: [aiCaseStudies.id],
  }),
}));

// Tournament relations
export const diagnosisDuelTournamentRelations = relations(diagnosisDuelTournaments, ({ many }) => ({
  participants: many(tournamentParticipants),
  matches: many(tournamentMatches),
}));



export const tournamentParticipantRelations = relations(tournamentParticipants, ({ one }) => ({
  tournament: one(diagnosisDuelTournaments, {
    fields: [tournamentParticipants.tournamentId],
    references: [diagnosisDuelTournaments.id],
  }),
  user: one(users, {
    fields: [tournamentParticipants.userId],
    references: [users.id],
  }),
}));

export const tournamentMatchRelations = relations(tournamentMatches, ({ one }) => ({
  tournament: one(diagnosisDuelTournaments, {
    fields: [tournamentMatches.tournamentId],
    references: [diagnosisDuelTournaments.id],
  }),
  player1: one(users, {
    fields: [tournamentMatches.player1Id],
    references: [users.id],
  }),
  player2: one(users, {
    fields: [tournamentMatches.player2Id],
    references: [users.id],
  }),
  winner: one(users, {
    fields: [tournamentMatches.winnerId],
    references: [users.id],
  }),
  gameContent: one(gameContent, {
    fields: [tournamentMatches.gameContentId],
    references: [gameContent.id],
  }),
}));

// PhysioGPT Case Snapshot — full workspace state captured per conversation.
// Shape is intentionally loose (all fields optional, unknown payloads) so new
// panels can be added without schema churn. Validation at the API layer just
// confirms the value is an object.
export interface PhysioGptCaseSnapshot {
  version?: number;
  modelConfig?: unknown;
  painMarkers?: unknown;
  compromisedTissues?: unknown;
  scarMarkers?: unknown;
  adhesionBands?: unknown;
  romMeasurements?: unknown;
  muscleOverrides?: unknown;
  slingActivationOverrides?: unknown;
  bodyWeightKg?: number;
  clinicalHighlights?: unknown;
  subjectiveHistoryInput?: string;
  patientContextState?: unknown;
  patientFactorOverrides?: unknown;
  movementFindings?: unknown;
  selectedRegion?: string | null;
  planCartItems?: unknown;
  // Reserved for forward compatibility — additional panels add fields here.
  [key: string]: unknown;
}

export const physioGptCaseSnapshotSchema = z
  .record(z.unknown())
  .refine((v) => v !== null && typeof v === "object" && !Array.isArray(v), {
    message: "caseSnapshot must be a JSON object",
  });

// PhysioGPT Chat Conversations Schema
export const physioGptConversations = pgTable("physiogpt_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  caseSnapshot: jsonb("case_snapshot").$type<PhysioGptCaseSnapshot>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPhysioGptConversationSchema = createInsertSchema(physioGptConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPhysioGptConversation = z.infer<typeof insertPhysioGptConversationSchema>;
export type PhysioGptConversation = typeof physioGptConversations.$inferSelect;

// PhysioGPT Chat Messages Schema
export const physioGptMessages = pgTable("physiogpt_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => physioGptConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  patientContext: json("patient_context").$type<{
    patientId?: number;
    sessionId?: number;
    caseStudyId?: number;
    relevantData?: any;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPhysioGptMessageSchema = createInsertSchema(physioGptMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertPhysioGptMessage = z.infer<typeof insertPhysioGptMessageSchema>;
export type PhysioGptMessage = typeof physioGptMessages.$inferSelect;

// Game Content Types
export const insertGameContentSchema = createInsertSchema(gameContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGameContent = z.infer<typeof insertGameContentSchema>;
export type GameContent = typeof gameContent.$inferSelect;

// Relations for PhysioGPT
export const physioGptConversationRelations = relations(
  physioGptConversations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [physioGptConversations.userId],
      references: [users.id],
    }),
    messages: many(physioGptMessages),
  })
);

export const physioGptMessageRelations = relations(
  physioGptMessages,
  ({ one }) => ({
    conversation: one(physioGptConversations, {
      fields: [physioGptMessages.conversationId],
      references: [physioGptConversations.id],
    }),
  })
);

// Body Scanner table for diagnostic imaging analysis
export const bodyScans = pgTable("body_scans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bodyPart: bodyPartEnum("body_part").notNull(),
  imageUrl: text("image_url").notNull(),
  symptoms: json("symptoms").notNull(), // Patient symptoms and pain details
  analysisResults: json("analysis_results"), // AI diagnostic analysis
  differentialDiagnoses: json("differential_diagnoses"), // Potential diagnoses with confidence scores
  recommendations: json("recommendations"), // Treatment and next steps
  redFlags: json("red_flags"), // Warning signs requiring immediate attention
  confidenceScore: integer("confidence_score"), // AI confidence 1-100
  reviewedByProfessional: boolean("reviewed_by_professional").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBodyScanSchema = createInsertSchema(bodyScans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBodyScan = z.infer<typeof insertBodyScanSchema>;
export type BodyScan = typeof bodyScans.$inferSelect;

// Body Scanner Relations
export const bodyScanRelations = relations(bodyScans, ({ one }) => ({
  user: one(users, {
    fields: [bodyScans.userId],
    references: [users.id],
  }),
}));

// ============================================
// Comparative Case Analysis Tables
// ============================================

// Historical cases repository for comparative analysis
export const historicalCases = pgTable("historical_cases", {
  id: serial("id").primaryKey(),
  
  // Anonymized patient identifier (hashed for privacy)
  anonymizedPatientHash: text("anonymized_patient_hash").notNull(),
  clinicId: integer("clinic_id"), // For data segregation by clinic
  
  // Demographics (encoded for privacy)
  demographicsVector: json("demographics_vector").notNull().$type<{
    ageRange: string; // "20-30", "30-40", etc.
    gender: string;
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'high' | 'athlete';
    occupation: string; // General category, not specific job
  }>(),
  
  // Clinical presentation embedding (vector for similarity search)
  presentationEmbedding: json("presentation_embedding").notNull().$type<number[]>(),
  
  // Structured clinical data
  clinicalData: json("clinical_data").notNull().$type<{
    chiefComplaint: string;
    bodyPart: string;
    duration: string; // "acute", "subacute", "chronic"
    onset: string; // "gradual", "sudden", "traumatic"
    severity: number; // 1-10 scale
    symptoms: string[];
    aggravatingFactors: string[];
    easingFactors: string[];
    previousTreatments: string[];
    comorbidities: string[];
  }>(),
  
  // Objective findings
  objectiveFindings: json("objective_findings").notNull().$type<{
    posture: string[];
    rangeOfMotion: { [key: string]: number };
    strength: { [key: string]: number };
    specialTests: { test: string; result: string }[];
    palpation: string[];
    functionalTests: string[];
  }>(),
  
  // Assessment and diagnosis
  assessment: json("assessment").notNull().$type<{
    primaryDiagnosis: string;
    secondaryDiagnoses: string[];
    differentialDiagnoses: string[];
    clinicalReasoning: string;
    prognosticFactors: string[];
  }>(),
  
  // Treatment pathway
  treatmentPathway: json("treatment_pathway").notNull().$type<{
    initialApproach: string[];
    progressions: Array<{
      week: number;
      interventions: string[];
      modifications: string[];
    }>;
    educationProvided: string[];
    homeProgram: string[];
  }>(),
  
  // Outcomes
  outcomes: json("outcomes").notNull().$type<{
    painReduction: number; // Percentage
    functionImprovement: number; // Percentage  
    patientSatisfaction: number; // 1-10
    returnToActivity: boolean;
    timeToRecovery: number; // Days
    complications: string[];
    adherence: number; // Percentage
  }>(),
  
  // Success metrics
  successScore: integer("success_score").notNull(), // 0-100
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Case similarity cache for performance optimization
export const caseSimilarities = pgTable("case_similarities", {
  id: serial("id").primaryKey(),
  case1Id: integer("case1_id").notNull().references(() => historicalCases.id, { onDelete: "cascade" }),
  case2Id: integer("case2_id").notNull().references(() => historicalCases.id, { onDelete: "cascade" }),
  similarityScore: integer("similarity_score").notNull(), // 0-100
  
  // Matching dimensions breakdown
  matchingDimensions: json("matching_dimensions").notNull().$type<{
    demographics: number;
    presentation: number;
    objective: number;
    diagnosis: number;
    overall: number;
  }>(),
  
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

// SOAP pattern analysis for smart suggestions
export const soapPatterns = pgTable("soap_patterns", {
  id: serial("id").primaryKey(),
  conditionType: text("condition_type").notNull(),
  sectionType: text("section_type").notNull(), // "subjective", "objective", "assessment", "plan"
  
  // Common findings and their frequency
  commonFindings: json("common_findings").notNull().$type<Array<{
    finding: string;
    frequency: number; // Percentage
    correlationWithOutcome: number; // -1 to 1
  }>>(),
  
  // Successful patterns
  successPatterns: json("success_patterns").$type<{
    keyIndicators: string[];
    criticalTests: string[];
    effectiveInterventions: string[];
  }>(),
  
  // Failure patterns to avoid
  failurePatterns: json("failure_patterns").$type<{
    missedRedFlags: string[];
    ineffectiveApproaches: string[];
    commonMistakes: string[];
  }>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Comparative analysis results linked to SOAP notes
export const comparativeAnalyses = pgTable("comparative_analyses", {
  id: serial("id").primaryKey(),
  soapNoteId: integer("soap_note_id").references(() => soapNotes.id, { onDelete: "cascade" }),
  conversationId: integer("conversation_id").references(() => physioGptConversations.id),
  
  // Similar cases found
  similarCaseIds: json("similar_case_ids").notNull().$type<number[]>(),
  
  // Analysis results
  analysisResults: json("analysis_results").notNull().$type<{
    topSimilarCases: Array<{
      caseId: number;
      similarity: number;
      keyMatchingFactors: string[];
    }>;
    treatmentRecommendations: Array<{
      approach: string;
      successRate: number;
      averageRecoveryTime: number;
      considerations: string[];
    }>;
    prognosticFactors: {
      positive: string[];
      negative: string[];
      modifiable: string[];
    };
    expectedOutcomes: {
      painReduction: { min: number; max: number; average: number };
      functionImprovement: { min: number; max: number; average: number };
      timeToRecovery: { min: number; max: number; average: number };
    };
  }>(),
  
  // Confidence metrics
  confidenceScore: integer("confidence_score").notNull(), // 0-100
  sampleSize: integer("sample_size").notNull(), // Number of similar cases found
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Treatment outcome tracking for continuous learning
export const treatmentOutcomes = pgTable("treatment_outcomes", {
  id: serial("id").primaryKey(),
  historicalCaseId: integer("historical_case_id").references(() => historicalCases.id),
  soapNoteId: integer("soap_note_id").references(() => soapNotes.id),
  
  weekNumber: integer("week_number").notNull(),
  
  // Outcome measures
  painLevel: integer("pain_level"), // 0-10
  functionScore: integer("function_score"), // 0-100
  patientGoalsMet: boolean("patient_goals_met"),
  
  // Complications or setbacks
  complications: json("complications").$type<string[]>(),
  
  // Adherence tracking
  adherenceRate: integer("adherence_rate"), // 0-100 percentage
  
  // Modifications made
  treatmentModifications: json("treatment_modifications").$type<string[]>(),
  
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

// Insert schemas for comparative analysis tables
export const insertHistoricalCaseSchema = createInsertSchema(historicalCases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCaseSimilaritySchema = createInsertSchema(caseSimilarities).omit({
  id: true,
  calculatedAt: true,
});

export const insertSoapPatternSchema = createInsertSchema(soapPatterns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertComparativeAnalysisSchema = createInsertSchema(comparativeAnalyses).omit({
  id: true,
  createdAt: true,
});

export const insertTreatmentOutcomeSchema = createInsertSchema(treatmentOutcomes).omit({
  id: true,
  recordedAt: true,
});

// Types for comparative analysis tables
export type HistoricalCase = typeof historicalCases.$inferSelect;
export type InsertHistoricalCase = z.infer<typeof insertHistoricalCaseSchema>;

export type CaseSimilarity = typeof caseSimilarities.$inferSelect;
export type InsertCaseSimilarity = z.infer<typeof insertCaseSimilaritySchema>;

export type SoapPattern = typeof soapPatterns.$inferSelect;
export type InsertSoapPattern = z.infer<typeof insertSoapPatternSchema>;

export type ComparativeAnalysis = typeof comparativeAnalyses.$inferSelect;
export type InsertComparativeAnalysis = z.infer<typeof insertComparativeAnalysisSchema>;

export type TreatmentOutcome = typeof treatmentOutcomes.$inferSelect;
export type InsertTreatmentOutcome = z.infer<typeof insertTreatmentOutcomeSchema>;

// Relations for comparative analysis tables
export const historicalCaseRelations = relations(historicalCases, ({ many }) => ({
  similarities1: many(caseSimilarities),
  similarities2: many(caseSimilarities),
  outcomes: many(treatmentOutcomes),
}));

export const caseSimilarityRelations = relations(caseSimilarities, ({ one }) => ({
  case1: one(historicalCases, {
    fields: [caseSimilarities.case1Id],
    references: [historicalCases.id],
  }),
  case2: one(historicalCases, {
    fields: [caseSimilarities.case2Id],
    references: [historicalCases.id],
  }),
}));

export const comparativeAnalysisRelations = relations(comparativeAnalyses, ({ one }) => ({
  soapNote: one(soapNotes, {
    fields: [comparativeAnalyses.soapNoteId],
    references: [soapNotes.id],
  }),
  conversation: one(physioGptConversations, {
    fields: [comparativeAnalyses.conversationId],
    references: [physioGptConversations.id],
  }),
}));

export const treatmentOutcomeRelations = relations(treatmentOutcomes, ({ one }) => ({
  historicalCase: one(historicalCases, {
    fields: [treatmentOutcomes.historicalCaseId],
    references: [historicalCases.id],
  }),
  soapNote: one(soapNotes, {
    fields: [treatmentOutcomes.soapNoteId],
    references: [soapNotes.id],
  }),
}));

// ============================================
// FORUM INTEGRATION TABLES
// ============================================

// Forum post status enum
export const forumPostStatusEnum = pgEnum("forum_post_status", [
  "draft",
  "pending_review",
  "published",
  "archived",
  "deleted"
]);

// Forum categories specific to clinical cases
export const forumCategoryEnum = pgEnum("forum_category", [
  "assessment_help",
  "treatment_advice",
  "differential_diagnosis",
  "case_study",
  "evidence_request",
  "technique_question",
  "red_flags",
  "outcome_discussion"
]);

// Forum posts created from SOAP notes
export const forumPosts = pgTable("forum_posts", {
  id: serial("id").primaryKey(),
  
  // Link to original SOAP note (optional - can be null if deleted for privacy)
  soapNoteId: integer("soap_note_id").references(() => soapNotes.id, { onDelete: "set null" }),
  
  // Author information
  authorId: integer("author_id").notNull().references(() => users.id),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  
  // Post content - de-identified and sanitized
  title: text("title").notNull(),
  category: forumCategoryEnum("category").notNull(),
  bodyParts: text("body_parts").array().default([]), // Multiple body parts can be involved
  
  // Clinical presentation (de-identified)
  clinicalPresentation: json("clinical_presentation").$type<{
    chiefComplaint: string;
    symptoms: string[];
    duration: string; // e.g., "3 weeks" not specific dates
    mechanism: string; // How injury occurred
    aggravatingFactors: string[];
    easingFactors: string[];
  }>().notNull(),
  
  // Objective findings (de-identified)
  objectiveFindings: json("objective_findings").$type<{
    movementTests: Array<{
      test: string;
      result: string;
      side?: 'left' | 'right' | 'bilateral';
    }>;
    specialTests: Array<{
      test: string;
      result: string;
      significance: string;
    }>;
    palpation: string[];
    otherFindings: string[];
  }>(),
  
  // Assessment considerations
  assessmentConsiderations: json("assessment_considerations").$type<{
    differentialDiagnosis: string[];
    workingDiagnosis: string;
    clinicalReasoning: string;
    redFlags: string[];
  }>(),
  
  // Questions for the community
  questionsForCommunity: text("questions_for_community").array().notNull().default([]),
  
  // Virtual patient link (if shared)
  virtualPatientId: integer("virtual_patient_id").references(() => virtualPatients.id, { onDelete: "set null" }),
  shareVirtualPatient: boolean("share_virtual_patient").notNull().default(false),
  
  // Moderation and status
  status: forumPostStatusEnum("status").notNull().default("pending_review"),
  moderatorNotes: text("moderator_notes"),
  moderatedBy: integer("moderated_by").references(() => users.id),
  moderatedAt: timestamp("moderated_at"),
  
  // Engagement metrics
  viewCount: integer("view_count").notNull().default(0),
  helpfulCount: integer("helpful_count").notNull().default(0),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  publishedAt: timestamp("published_at"),
});

// Forum replies/comments
export const forumReplies = pgTable("forum_replies", {
  id: serial("id").primaryKey(),
  
  postId: integer("post_id").notNull().references(() => forumPosts.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => users.id),
  parentReplyId: integer("parent_reply_id").references(() => forumReplies.id), // For nested replies
  
  // Reply content
  content: text("content").notNull(),
  
  // Clinical recommendations (if provided)
  clinicalRecommendations: json("clinical_recommendations").$type<{
    treatmentSuggestions: string[];
    exerciseSuggestions: string[];
    assessmentSuggestions: string[];
    evidenceLinks: Array<{
      title: string;
      url: string;
      summary: string;
    }>;
  }>(),
  
  // Expert verification
  isExpertVerified: boolean("is_expert_verified").notNull().default(false),
  expertCredentials: text("expert_credentials"), // e.g., "MSc Physiotherapy, 15 years experience"
  
  // Engagement
  helpfulCount: integer("helpful_count").notNull().default(0),
  
  // Moderation
  isModerated: boolean("is_moderated").notNull().default(false),
  moderatedBy: integer("moderated_by").references(() => users.id),
  moderatedAt: timestamp("moderated_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Track which users found posts/replies helpful
export const forumHelpfulVotes = pgTable("forum_helpful_votes", {
  id: serial("id").primaryKey(),
  
  userId: integer("user_id").notNull().references(() => users.id),
  postId: integer("post_id").references(() => forumPosts.id, { onDelete: "cascade" }),
  replyId: integer("reply_id").references(() => forumReplies.id, { onDelete: "cascade" }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Forum post sanitization audit log
export const forumSanitizationLogs = pgTable("forum_sanitization_logs", {
  id: serial("id").primaryKey(),
  
  soapNoteId: integer("soap_note_id").references(() => soapNotes.id, { onDelete: "set null" }),
  forumPostId: integer("forum_post_id").references(() => forumPosts.id, { onDelete: "cascade" }),
  
  // What was removed/changed
  sanitizationActions: json("sanitization_actions").$type<Array<{
    field: string;
    action: 'removed' | 'replaced' | 'generalized';
    originalSnippet?: string; // Small snippet for audit
    replacedWith?: string;
  }>>().notNull(),
  
  // Compliance check
  hipaaCompliant: boolean("hipaa_compliant").notNull().default(true),
  gdprCompliant: boolean("gdpr_compliant").notNull().default(true),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas for forum tables
export const insertForumPostSchema = createInsertSchema(forumPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
  helpfulCount: true,
});

export const insertForumReplySchema = createInsertSchema(forumReplies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  helpfulCount: true,
});

export const insertForumHelpfulVoteSchema = createInsertSchema(forumHelpfulVotes).omit({
  id: true,
  createdAt: true,
});

export const insertForumSanitizationLogSchema = createInsertSchema(forumSanitizationLogs).omit({
  id: true,
  createdAt: true,
});

// Types for forum tables
export type ForumPost = typeof forumPosts.$inferSelect;
export type InsertForumPost = z.infer<typeof insertForumPostSchema>;

export type ForumReply = typeof forumReplies.$inferSelect;
export type InsertForumReply = z.infer<typeof insertForumReplySchema>;

export type ForumHelpfulVote = typeof forumHelpfulVotes.$inferSelect;
export type InsertForumHelpfulVote = z.infer<typeof insertForumHelpfulVoteSchema>;

export type ForumSanitizationLog = typeof forumSanitizationLogs.$inferSelect;
export type InsertForumSanitizationLog = z.infer<typeof insertForumSanitizationLogSchema>;

// Relations for forum tables
export const forumPostRelations = relations(forumPosts, ({ one, many }) => ({
  soapNote: one(soapNotes, {
    fields: [forumPosts.soapNoteId],
    references: [soapNotes.id],
  }),
  author: one(users, {
    fields: [forumPosts.authorId],
    references: [users.id],
  }),
  virtualPatient: one(virtualPatients, {
    fields: [forumPosts.virtualPatientId],
    references: [virtualPatients.id],
  }),
  replies: many(forumReplies),
  helpfulVotes: many(forumHelpfulVotes),
  sanitizationLogs: many(forumSanitizationLogs),
}));

export const forumReplyRelations = relations(forumReplies, ({ one, many }) => ({
  post: one(forumPosts, {
    fields: [forumReplies.postId],
    references: [forumPosts.id],
  }),
  author: one(users, {
    fields: [forumReplies.authorId],
    references: [users.id],
  }),
  parentReply: one(forumReplies, {
    fields: [forumReplies.parentReplyId],
    references: [forumReplies.id],
  }),
  childReplies: many(forumReplies),
  helpfulVotes: many(forumHelpfulVotes),
}));

export const forumHelpfulVoteRelations = relations(forumHelpfulVotes, ({ one }) => ({
  user: one(users, {
    fields: [forumHelpfulVotes.userId],
    references: [users.id],
  }),
  post: one(forumPosts, {
    fields: [forumHelpfulVotes.postId],
    references: [forumPosts.id],
  }),
  reply: one(forumReplies, {
    fields: [forumHelpfulVotes.replyId],
    references: [forumReplies.id],
  }),
}));

export const forumSanitizationLogRelations = relations(forumSanitizationLogs, ({ one }) => ({
  soapNote: one(soapNotes, {
    fields: [forumSanitizationLogs.soapNoteId],
    references: [soapNotes.id],
  }),
  forumPost: one(forumPosts, {
    fields: [forumSanitizationLogs.forumPostId],
    references: [forumPosts.id],
  }),
}));

// ============================================
// Exercise Program Builder Tables
// ============================================

// Exercise programs created by physiotherapists
export const exercisePrograms = pgTable("exercise_programs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: integer("created_by").references(() => users.id),
  patientId: integer("patient_id"), // Optional - can be assigned to specific patient
  templateId: integer("template_id"), // Reference to template if created from one
  bodyPart: bodyPartEnum("body_part"),
  difficulty: text("difficulty"), // beginner, intermediate, advanced
  duration: integer("duration"), // in minutes
  frequency: text("frequency"), // e.g., "3x per week"
  goals: json("goals").$type<string[]>(),
  tags: json("tags").$type<string[]>(),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertExerciseProgramSchema = createInsertSchema(exercisePrograms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertExerciseProgram = z.infer<typeof insertExerciseProgramSchema>;
export type ExerciseProgram = typeof exercisePrograms.$inferSelect;

// Individual exercises within a program (references external API)
export const programExercises = pgTable("program_exercises", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => exercisePrograms.id).notNull(),
  externalId: text("external_id").notNull(), // ID from external API (ExerciseDB/Wger)
  apiSource: text("api_source").notNull(), // "exercisedb" or "wger"
  name: text("name").notNull(),
  equipment: text("equipment"),
  bodyPart: text("body_part"),
  target: text("target"),
  gifUrl: text("gif_url"),
  instructions: json("instructions").$type<string[]>(),
  sets: integer("sets"),
  reps: text("reps"), // Can be range like "8-12"
  duration: text("duration"), // For timed exercises
  restTime: integer("rest_time"), // in seconds
  day: integer("day").default(1), // Day of the program (1, 2, 3, etc.)
  orderIndex: integer("order_index").notNull(), // Order in program
  notes: text("notes"),
  progressionNotes: text("progression_notes"),
});

export const insertProgramExerciseSchema = createInsertSchema(programExercises).omit({
  id: true,
});
export type InsertProgramExercise = z.infer<typeof insertProgramExerciseSchema>;
export type ProgramExercise = typeof programExercises.$inferSelect;

// Program templates that can be reused
export const exerciseTemplates = pgTable("exercise_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"), // e.g., "Post-surgery", "Sports injury", "Chronic pain"
  bodyPart: bodyPartEnum("body_part"),
  condition: text("condition"), // e.g., "Rotator cuff tear", "ACL reconstruction"
  difficulty: text("difficulty"),
  duration: integer("duration"),
  frequency: text("frequency"),
  phases: json("phases").$type<{
    name: string;
    weeks: number;
    focus: string;
    exercises: any[];
  }[]>(),
  createdBy: integer("created_by").references(() => users.id),
  isPublic: boolean("is_public").default(true),
  popularity: integer("popularity").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertExerciseTemplateSchema = createInsertSchema(exerciseTemplates).omit({
  id: true,
  popularity: true,
  createdAt: true,
});
export type InsertExerciseTemplate = z.infer<typeof insertExerciseTemplateSchema>;
export type ExerciseTemplate = typeof exerciseTemplates.$inferSelect;

// Patient assignments and progress tracking
export const exerciseAssignments = pgTable("exercise_assignments", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => exercisePrograms.id).notNull(),
  patientId: integer("patient_id").notNull(), // Reference to patient (could be userId or separate patient table)
  assignedBy: integer("assigned_by").references(() => users.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: text("status").default("active"), // active, paused, completed
  adherenceRate: integer("adherence_rate"), // percentage
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertExerciseAssignmentSchema = createInsertSchema(exerciseAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertExerciseAssignment = z.infer<typeof insertExerciseAssignmentSchema>;
export type ExerciseAssignment = typeof exerciseAssignments.$inferSelect;

// Progress tracking for individual exercises
export const exerciseProgress = pgTable("exercise_progress", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").references(() => exerciseAssignments.id).notNull(),
  exerciseId: integer("exercise_id").references(() => programExercises.id).notNull(),
  date: date("date").notNull(),
  setsCompleted: integer("sets_completed"),
  repsCompleted: text("reps_completed"),
  weight: text("weight"), // Can include unit
  difficulty: integer("difficulty"), // 1-10 scale
  painLevel: integer("pain_level"), // 0-10 scale
  notes: text("notes"),
  videoUrl: text("video_url"), // For form checks
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertExerciseProgressSchema = createInsertSchema(exerciseProgress).omit({
  id: true,
  createdAt: true,
});
export type InsertExerciseProgress = z.infer<typeof insertExerciseProgressSchema>;
export type ExerciseProgress = typeof exerciseProgress.$inferSelect;

// Exercise Images Library for PhysioGPT
export const exerciseImages = pgTable("exercise_images", {
  id: serial("id").primaryKey(),
  exerciseName: text("exercise_name").notNull().unique(), // Standardized exercise name
  category: text("category").notNull(), // e.g., "stretching", "strengthening", "mobility"
  bodyPart: bodyPartEnum("body_part").notNull(),
  primaryImageUrl: text("primary_image_url").notNull(), // Main exercise image
  startPositionUrl: text("start_position_url"), // Starting position image
  endPositionUrl: text("end_position_url"), // End position image
  sideViewUrl: text("side_view_url"), // Side view image
  commonMistakesUrl: text("common_mistakes_url"), // Common mistakes image
  videoUrl: text("video_url"), // Exercise demonstration video
  thumbnailUrl: text("thumbnail_url"), // Small thumbnail for lists
  instructions: json("instructions").$type<string[]>(), // Step-by-step instructions
  tips: json("tips").$type<string[]>(), // Exercise tips
  contraindications: json("contraindications").$type<string[]>(), // When not to do
  musclesWorked: json("muscles_worked").$type<string[]>(), // Primary and secondary muscles
  equipment: text("equipment"), // Required equipment
  difficulty: text("difficulty"), // beginner, intermediate, advanced
  alternativeNames: json("alternative_names").$type<string[]>(), // Alternative exercise names
  tags: json("tags").$type<string[]>(), // Searchable tags
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertExerciseImageSchema = createInsertSchema(exerciseImages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertExerciseImage = z.infer<typeof insertExerciseImageSchema>;
export type ExerciseImage = typeof exerciseImages.$inferSelect;

// Cached exercises from ExerciseDB API
export const cachedExercises = pgTable("cached_exercises", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull().unique(), // ID from ExerciseDB
  apiSource: text("api_source").notNull().default("exercisedb"), // Source API
  name: text("name").notNull(),
  bodyPart: text("body_part").notNull(),
  equipment: text("equipment").notNull(),
  gifUrl: text("gif_url"), // Animated GIF demonstration
  target: text("target").notNull(), // Primary muscle
  secondaryMuscles: json("secondary_muscles").$type<string[]>().default([]),
  instructions: json("instructions").$type<string[]>().default([]),
  difficulty: text("difficulty"), // beginner, intermediate, advanced
  category: text("category"), // Shoulder, Back, Legs, etc.
  isActive: boolean("is_active").default(true).notNull(),
  lastSynced: timestamp("last_synced").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCachedExerciseSchema = createInsertSchema(cachedExercises).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSynced: true,
});
export type InsertCachedExercise = z.infer<typeof insertCachedExerciseSchema>;
export type CachedExercise = typeof cachedExercises.$inferSelect;

// Relations for exercise program tables
export const exerciseProgramRelations = relations(exercisePrograms, ({ one, many }) => ({
  creator: one(users, {
    fields: [exercisePrograms.createdBy],
    references: [users.id],
  }),
  exercises: many(programExercises),
  assignments: many(exerciseAssignments),
}));

export const programExerciseRelations = relations(programExercises, ({ one, many }) => ({
  program: one(exercisePrograms, {
    fields: [programExercises.programId],
    references: [exercisePrograms.id],
  }),
  progress: many(exerciseProgress),
}));

export const exerciseTemplateRelations = relations(exerciseTemplates, ({ one }) => ({
  creator: one(users, {
    fields: [exerciseTemplates.createdBy],
    references: [users.id],
  }),
}));

export const exerciseAssignmentRelations = relations(exerciseAssignments, ({ one, many }) => ({
  program: one(exercisePrograms, {
    fields: [exerciseAssignments.programId],
    references: [exercisePrograms.id],
  }),
  assignedByUser: one(users, {
    fields: [exerciseAssignments.assignedBy],
    references: [users.id],
  }),
  progress: many(exerciseProgress),
}));

export const exerciseProgressRelations = relations(exerciseProgress, ({ one }) => ({
  assignment: one(exerciseAssignments, {
    fields: [exerciseProgress.assignmentId],
    references: [exerciseAssignments.id],
  }),
  exercise: one(programExercises, {
    fields: [exerciseProgress.exerciseId],
    references: [programExercises.id],
  }),
}));

// Education Hub Enums
export const courseDifficultyEnum = pgEnum("course_difficulty", [
  "beginner",
  "intermediate", 
  "advanced",
  "expert",
]);

export const courseStatusEnum = pgEnum("course_status", [
  "draft",
  "published",
  "archived",
]);

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "enrolled",
  "completed",
  "dropped",
  "expired",
]);

export const moduleTypeEnum = pgEnum("module_type", [
  "video",
  "text", 
  "assessment",
  "interactive",
  "case_study",
]);

export const assessmentTypeEnum = pgEnum("assessment_type", [
  "quiz",
  "case_analysis",
  "practical_demo",
  "written_response",
]);

// Education Hub Tables
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  shortDescription: text("short_description"),
  thumbnailUrl: text("thumbnail_url"),
  difficulty: courseDifficultyEnum("difficulty").default("beginner").notNull(),
  estimatedHours: integer("estimated_hours").default(0).notNull(),
  status: courseStatusEnum("status").default("draft").notNull(),
  bodyPart: bodyPartEnum("body_part").default("general"),
  tags: text("tags").array().default([]),
  learningObjectives: text("learning_objectives").array().default([]),
  prerequisites: text("prerequisites").array().default([]),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  isPublic: boolean("is_public").default(true).notNull(),
  price: integer("price").default(0).notNull(), // Price in cents
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Module content structure types
export type ModuleContentSection = {
  type: "text" | "video" | "interactive" | "quiz" | "3d_scanner" | "biodigital_3d" | "clinical_images" | "anatomy_images";
  title?: string;
  content?: string; // Markdown or HTML text
  videoUrl?: string;
  videoDescription?: string;
  quizQuestions?: Array<{
    question: string;
    options?: string[];
    correctAnswer?: string;
    explanation?: string;
  }>;
  interactiveType?: "decision_tree" | "case_study" | "image_analysis" | "3d_model";
  interactiveData?: any;
  // New multimedia fields
  biodigitalModelId?: string; // BioDigital model identifier
  biodigitalConfig?: {
    modelId: string;
    viewAngle?: string;
    highlightStructures?: string[];
    labels?: boolean;
  };
  clinicalImages?: Array<{
    source: "nih_openi" | "manual_upload";
    imageUrl: string;
    thumbnail?: string;
    title: string;
    description?: string;
    imageType?: "xray" | "mri" | "ct" | "ultrasound" | "clinical_photo";
    attribution?: string;
    pmid?: string; // PubMed ID if from NIH
  }>;
  anatomyImages?: Array<{
    source: "z_anatomy" | "manual_upload";
    imageUrl: string;
    thumbnail?: string;
    structure: string; // e.g., "biceps tendon", "rotator cuff"
    viewType?: "anterior" | "posterior" | "lateral" | "medial" | "superior" | "inferior";
    labels?: string[]; // anatomical labels
    description?: string;
  }>;
  researchSummary?: {
    articleIds: number[]; // Reference to research_articles table
    keyPoints: string[]; // AI-generated bullet points
    clinicalRelevance: string;
    lastUpdated?: Date;
  };
};

export type ModuleContent = {
  sections: ModuleContentSection[];
  resources?: Array<{
    title: string;
    url?: string;
    type: "pdf" | "link" | "download";
  }>;
};

export const courseModules = pgTable("course_modules", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  content: json("content").$type<ModuleContent>(),
  orderIndex: integer("order_index").notNull(),
  estimatedDuration: integer("estimated_duration").default(0), // Duration in minutes
  prerequisites: text("prerequisites").array().default([]),
  learningObjectives: text("learning_objectives").array().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userEnrollments = pgTable("user_enrollments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  status: enrollmentStatusEnum("status").default("enrolled").notNull(),
  progress: integer("progress").default(0).notNull(), // Percentage 0-100
  completedModules: json("completed_modules").$type<number[]>().default([]),
  totalTimeSpent: integer("total_time_spent").default(0).notNull(), // Minutes
  lastAccessedAt: timestamp("last_accessed_at"),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const moduleProgress = pgTable("module_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  moduleId: integer("module_id")
    .notNull()
    .references(() => courseModules.id, { onDelete: "cascade" }),
  isCompleted: boolean("is_completed").default(false).notNull(),
  timeSpent: integer("time_spent").default(0).notNull(), // Minutes
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
});

export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id")
    .notNull()
    .references(() => courseModules.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: assessmentTypeEnum("type").default("quiz").notNull(),
  questions: json("questions").$type<Array<{
    id: string;
    question: string;
    type: "multiple_choice" | "true_false" | "short_answer" | "essay";
    options?: string[];
    correctAnswer?: string | string[];
    points: number;
  }>>().default([]),
  passingScore: integer("passing_score").default(70).notNull(),
  timeLimit: integer("time_limit"), // Minutes
  maxAttempts: integer("max_attempts").default(3).notNull(),
  isRequired: boolean("is_required").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const assessmentAttempts = pgTable("assessment_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  assessmentId: integer("assessment_id")
    .notNull()
    .references(() => assessments.id, { onDelete: "cascade" }),
  answers: json("answers").$type<Record<string, any>>().default({}),
  score: integer("score").default(0).notNull(),
  passed: boolean("passed").default(false).notNull(),
  timeSpent: integer("time_spent").default(0).notNull(), // Minutes
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const certificates = pgTable("certificates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  certificateNumber: text("certificate_number").notNull().unique(),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  verificationUrl: text("verification_url"),
  metadata: json("metadata").$type<{
    finalScore?: number;
    completionTime?: number; // Days
    achievements?: string[];
  }>().default({}),
});

// Insert Schemas for Education Tables
export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseModuleSchema = createInsertSchema(courseModules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserEnrollmentSchema = createInsertSchema(userEnrollments).omit({
  id: true,
  enrolledAt: true,
});

export const insertModuleProgressSchema = createInsertSchema(moduleProgress).omit({
  id: true,
  lastAccessedAt: true,
});

export const insertAssessmentSchema = createInsertSchema(assessments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssessmentAttemptSchema = createInsertSchema(assessmentAttempts).omit({
  id: true,
  startedAt: true,
});

export const insertCertificateSchema = createInsertSchema(certificates).omit({
  id: true,
  issuedAt: true,
});

// Types
export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type CourseModule = typeof courseModules.$inferSelect;
export type InsertCourseModule = z.infer<typeof insertCourseModuleSchema>;
export type UserEnrollment = typeof userEnrollments.$inferSelect;
export type InsertUserEnrollment = z.infer<typeof insertUserEnrollmentSchema>;
export type ModuleProgress = typeof moduleProgress.$inferSelect;
export type InsertModuleProgress = z.infer<typeof insertModuleProgressSchema>;
export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type AssessmentAttempt = typeof assessmentAttempts.$inferSelect;
export type InsertAssessmentAttempt = z.infer<typeof insertAssessmentAttemptSchema>;
export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;

// Education Relations
export const courseRelations = relations(courses, ({ one, many }) => ({
  creator: one(users, {
    fields: [courses.createdBy],
    references: [users.id],
  }),
  modules: many(courseModules),
  enrollments: many(userEnrollments),
  certificates: many(certificates),
}));

export const courseModuleRelations = relations(courseModules, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseModules.courseId],
    references: [courses.id],
  }),
  progress: many(moduleProgress),
  assessments: many(assessments),
}));

export const userEnrollmentRelations = relations(userEnrollments, ({ one }) => ({
  user: one(users, {
    fields: [userEnrollments.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [userEnrollments.courseId],
    references: [courses.id],
  }),
}));

export const moduleProgressRelations = relations(moduleProgress, ({ one }) => ({
  user: one(users, {
    fields: [moduleProgress.userId],
    references: [users.id],
  }),
  module: one(courseModules, {
    fields: [moduleProgress.moduleId],
    references: [courseModules.id],
  }),
}));

export const assessmentRelations = relations(assessments, ({ one, many }) => ({
  module: one(courseModules, {
    fields: [assessments.moduleId],
    references: [courseModules.id],
  }),
  attempts: many(assessmentAttempts),
}));

export const assessmentAttemptRelations = relations(assessmentAttempts, ({ one }) => ({
  user: one(users, {
    fields: [assessmentAttempts.userId],
    references: [users.id],
  }),
  assessment: one(assessments, {
    fields: [assessmentAttempts.assessmentId],
    references: [assessments.id],
  }),
}));

export const certificateRelations = relations(certificates, ({ one }) => ({
  user: one(users, {
    fields: [certificates.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [certificates.courseId],
    references: [courses.id],
  }),
}));

// Interactive Education Feature Tables

// Course section notes and highlights
export const courseSectionNotes = pgTable("course_section_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  moduleId: integer("module_id")
    .notNull()
    .references(() => courseModules.id, { onDelete: "cascade" }),
  sectionIndex: integer("section_index").notNull(),
  content: text("content").notNull(),
  highlights: json("highlights").$type<Array<{
    id: string;
    text: string;
    color: string;
    startOffset: number;
    endOffset: number;
  }>>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Course section discussions
export const courseSectionDiscussions = pgTable("course_section_discussions", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  moduleId: integer("module_id")
    .notNull()
    .references(() => courseModules.id, { onDelete: "cascade" }),
  sectionIndex: integer("section_index").notNull(),
  parentId: integer("parent_id"), // For threaded replies
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  upvotes: integer("upvotes").default(0).notNull(),
  isFlagged: boolean("is_flagged").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Course flashcards with spaced repetition
export const courseFlashcards = pgTable("course_flashcards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  moduleId: integer("module_id")
    .notNull()
    .references(() => courseModules.id, { onDelete: "cascade" }),
  sectionIndex: integer("section_index"),
  front: text("front").notNull(),
  back: text("back").notNull(),
  srsData: json("srs_data").$type<{
    dueAt: string; // ISO date
    interval: number; // Days
    easiness: number; // SM-2 factor
    repetitions: number;
    lastReviewedAt: string | null; // ISO date
  }>().default({
    dueAt: new Date().toISOString(),
    interval: 0,
    easiness: 2.5,
    repetitions: 0,
    lastReviewedAt: null,
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Quiz attempts for analytics
export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  moduleId: integer("module_id")
    .notNull()
    .references(() => courseModules.id, { onDelete: "cascade" }),
  sectionIndex: integer("section_index").notNull(),
  questionId: text("question_id").notNull(),
  selectedAnswer: text("selected_answer").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  durationMs: integer("duration_ms").notNull(), // Time to answer in milliseconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Discussion upvotes tracking
export const discussionUpvoteTracking = pgTable("discussion_upvote_tracking", {
  id: serial("id").primaryKey(),
  discussionId: integer("discussion_id")
    .notNull()
    .references(() => courseSectionDiscussions.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert Schemas for Interactive Features
export const insertCourseSectionNoteSchema = createInsertSchema(courseSectionNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseSectionDiscussionSchema = createInsertSchema(courseSectionDiscussions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseFlashcardSchema = createInsertSchema(courseFlashcards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({
  id: true,
  createdAt: true,
});

export const insertDiscussionUpvoteSchema = createInsertSchema(discussionUpvoteTracking).omit({
  id: true,
  createdAt: true,
});

// Types
export type CourseSectionNote = typeof courseSectionNotes.$inferSelect;
export type InsertCourseSectionNote = z.infer<typeof insertCourseSectionNoteSchema>;
export type CourseSectionDiscussion = typeof courseSectionDiscussions.$inferSelect;
export type InsertCourseSectionDiscussion = z.infer<typeof insertCourseSectionDiscussionSchema>;
export type CourseFlashcard = typeof courseFlashcards.$inferSelect;
export type InsertCourseFlashcard = z.infer<typeof insertCourseFlashcardSchema>;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type DiscussionUpvote = typeof discussionUpvoteTracking.$inferSelect;
export type InsertDiscussionUpvote = z.infer<typeof insertDiscussionUpvoteSchema>;

// Adaptive Joint Assessment Sessions
// Main assessment session table
export const assessmentSessions = pgTable("assessment_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  jointType: text("joint_type").notNull(),
  isComplete: boolean("is_complete").default(false).notNull(),
  completionReason: text("completion_reason"),
  finalDiagnosis: json("final_diagnosis").$type<{
    primary: string;
    secondary?: string[];
    differential?: string[];
    reasoning: string;
    treatment: string[];
    prognosis: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Individual movement tests within a session
export const sessionTests = pgTable("session_tests", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => assessmentSessions.id, { onDelete: "cascade" }),
  testNumber: integer("test_number").notNull(),
  movementType: text("movement_type").notNull(),
  instruction: text("instruction").notNull(),
  frameCount: integer("frame_count").notNull(),
  angleMin: numeric("angle_min").notNull(),
  angleMax: numeric("angle_max").notNull(),
  angleRange: numeric("angle_range").notNull(),
  smoothness: numeric("smoothness").notNull(),
  compensations: json("compensations").$type<string[]>().default([]).notNull(),
  symmetry: numeric("symmetry"),
  findings: text("findings").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Working hypotheses formed during assessment
export const sessionHypotheses = pgTable("session_hypotheses", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => assessmentSessions.id, { onDelete: "cascade" }),
  testNumber: integer("test_number").notNull(),
  diagnosis: text("diagnosis").notNull(),
  likelihood: text("likelihood").notNull(),
  supportingEvidence: json("supporting_evidence").$type<string[]>().default([]).notNull(),
  testsNeeded: json("tests_needed").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI recommendations for next test
export const sessionRecommendations = pgTable("session_recommendations", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => assessmentSessions.id, { onDelete: "cascade" }),
  afterTestNumber: integer("after_test_number").notNull(),
  movementType: text("movement_type").notNull(),
  instruction: text("instruction").notNull(),
  rationale: text("rationale").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert Schemas for Assessment Sessions
export const insertAssessmentSessionSchema = createInsertSchema(assessmentSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionTestSchema = createInsertSchema(sessionTests).omit({
  id: true,
  createdAt: true,
});

export const insertSessionHypothesisSchema = createInsertSchema(sessionHypotheses).omit({
  id: true,
  createdAt: true,
});

export const insertSessionRecommendationSchema = createInsertSchema(sessionRecommendations).omit({
  id: true,
  createdAt: true,
});

// Types for Assessment Sessions
export type AssessmentSession = typeof assessmentSessions.$inferSelect;
export type InsertAssessmentSession = z.infer<typeof insertAssessmentSessionSchema>;
export type SessionTest = typeof sessionTests.$inferSelect;
export type InsertSessionTest = z.infer<typeof insertSessionTestSchema>;
export type SessionHypothesis = typeof sessionHypotheses.$inferSelect;
export type InsertSessionHypothesis = z.infer<typeof insertSessionHypothesisSchema>;
export type SessionRecommendation = typeof sessionRecommendations.$inferSelect;
export type InsertSessionRecommendation = z.infer<typeof insertSessionRecommendationSchema>;

// Export all movement analysis schema tables
export * from './movementAnalysisSchema';

// ============================================
// BIOMECHANICAL ASSESSMENT & CLINICAL ANALYSIS
// ============================================

// Risk level enum for injury assessments
export const riskLevelEnum = pgEnum("risk_level", [
  "minimal",
  "low", 
  "moderate",
  "high",
  "critical",
]);

// Biomechanical Assessments - stores force/load calculations for each patient assessment
export const biomechanicalAssessments = pgTable("biomechanical_assessments", {
  id: serial("id").primaryKey(),
  virtualPatientConfigId: integer("virtual_patient_config_id")
    .references(() => virtualPatientConfigs.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Patient anthropometrics for calculations
  anthropometrics: json("anthropometrics").$type<{
    heightCm: number;
    weightKg: number;
    segmentMasses: {
      head: number;
      trunk: number;
      upperArmL: number;
      upperArmR: number;
      forearmL: number;
      forearmR: number;
      handL: number;
      handR: number;
      thighL: number;
      thighR: number;
      shankL: number;
      shankR: number;
      footL: number;
      footR: number;
    };
    segmentLengths: {
      trunk: number;
      upperArm: number;
      forearm: number;
      thigh: number;
      shank: number;
    };
  }>(),
  
  // Posture configuration at time of assessment
  postureSnapshot: json("posture_snapshot").$type<{
    pelvisTilt: number;
    pelvisObliquity: number;
    pelvisRotation: number;
    spineFlexion: number;
    spineLateralFlexion: number;
    spineRotation: number;
    leftHip: { flexion: number; abduction: number; rotation: number };
    rightHip: { flexion: number; abduction: number; rotation: number };
    leftKnee: { flexion: number; varus: number };
    rightKnee: { flexion: number; varus: number };
    leftAnkle: { dorsiflexion: number; inversion: number };
    rightAnkle: { dorsiflexion: number; inversion: number };
    leftShoulder: { flexion: number; abduction: number; rotation: number };
    rightShoulder: { flexion: number; abduction: number; rotation: number };
    leftElbow: { flexion: number; pronation: number };
    rightElbow: { flexion: number; pronation: number };
  }>(),
  
  // Calculated joint forces (Newtons)
  jointForces: json("joint_forces").$type<{
    lumbarSpine: { compression: number; shear: number; moment: number };
    thoracicSpine: { compression: number; shear: number; moment: number };
    cervicalSpine: { compression: number; shear: number; moment: number };
    leftHip: { compression: number; shear: number; moment: number };
    rightHip: { compression: number; shear: number; moment: number };
    leftKnee: { compression: number; shear: number; moment: number; patellofemoral: number };
    rightKnee: { compression: number; shear: number; moment: number; patellofemoral: number };
    leftAnkle: { compression: number; shear: number; moment: number };
    rightAnkle: { compression: number; shear: number; moment: number };
    leftShoulder: { compression: number; shear: number; moment: number };
    rightShoulder: { compression: number; shear: number; moment: number };
  }>(),
  
  // Ground reaction forces
  groundReactionForces: json("ground_reaction_forces").$type<{
    leftFoot: { vertical: number; anteriorPosterior: number; medialLateral: number };
    rightFoot: { vertical: number; anteriorPosterior: number; medialLateral: number };
    centerOfPressure: { x: number; y: number };
    weightDistribution: { left: number; right: number };
  }>(),
  
  // Muscle force estimates (0-100% of max voluntary contraction)
  muscleActivation: json("muscle_activation").$type<{
    // Core muscles
    rectusAbdominis: number;
    obliques: number;
    transverseAbdominis: number;
    erectorSpinae: number;
    multifidus: number;
    quadratusLumborum: { left: number; right: number };
    
    // Hip muscles
    gluteusMaximus: { left: number; right: number };
    gluteusMedius: { left: number; right: number };
    iliopsoas: { left: number; right: number };
    hipAdductors: { left: number; right: number };
    tensorFasciaeLatae: { left: number; right: number };
    piriformis: { left: number; right: number };
    
    // Knee muscles
    quadriceps: { left: number; right: number };
    hamstrings: { left: number; right: number };
    gastrocnemius: { left: number; right: number };
    popliteus: { left: number; right: number };
    
    // Ankle muscles
    tibialisAnterior: { left: number; right: number };
    soleus: { left: number; right: number };
    peroneals: { left: number; right: number };
    tibialisPosterior: { left: number; right: number };
    
    // Shoulder muscles
    rotatorcuff: { left: number; right: number };
    deltoid: { left: number; right: number };
    trapezius: { upper: number; middle: number; lower: number };
    serratusAnterior: { left: number; right: number };
    pectoralisMajor: { left: number; right: number };
    latissimusDorsi: { left: number; right: number };
  }>(),
  
  // Load asymmetry analysis
  asymmetryAnalysis: json("asymmetry_analysis").$type<{
    hipLoadAsymmetry: number; // percentage difference
    kneeLoadAsymmetry: number;
    ankleLoadAsymmetry: number;
    shoulderLoadAsymmetry: number;
    muscleActivationAsymmetry: {
      gluteMax: number;
      gluteMed: number;
      quadriceps: number;
      hamstrings: number;
    };
    weightDistributionAsymmetry: number;
  }>(),
  
  // Movement quality metrics
  movementQuality: json("movement_quality").$type<{
    overallScore: number; // 0-100
    stabilityScore: number;
    mobilityScore: number;
    controlScore: number;
    compensationPatterns: string[];
    movementFaults: string[];
  }>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Injury Risk Scores - calculated risk for specific injuries based on biomechanics
export const injuryRiskScores = pgTable("injury_risk_scores", {
  id: serial("id").primaryKey(),
  biomechanicalAssessmentId: integer("biomechanical_assessment_id")
    .notNull()
    .references(() => biomechanicalAssessments.id, { onDelete: "cascade" }),
  
  // Overall risk summary
  overallRiskLevel: riskLevelEnum("overall_risk_level").notNull(),
  overallRiskScore: integer("overall_risk_score").notNull(), // 0-100
  
  // Joint-specific injury risks
  jointRisks: json("joint_risks").$type<{
    lumbarSpine: {
      discHerniation: { risk: number; level: string; factors: string[] };
      facetJointDysfunction: { risk: number; level: string; factors: string[] };
      spondylolisthesis: { risk: number; level: string; factors: string[] };
      muscleStrain: { risk: number; level: string; factors: string[] };
    };
    hip: {
      labralTear: { left: { risk: number; level: string }; right: { risk: number; level: string }; factors: string[] };
      femoralAcetabularImpingement: { left: { risk: number; level: string }; right: { risk: number; level: string }; factors: string[] };
      hipFlexorStrain: { left: { risk: number; level: string }; right: { risk: number; level: string }; factors: string[] };
      greaterTrochanterBursitis: { left: { risk: number; level: string }; right: { risk: number; level: string }; factors: string[] };
    };
    knee: {
      aclInjury: { left: { risk: number; level: string }; right: { risk: number; level: string }; factors: string[] };
      patellofemoralSyndrome: { left: { risk: number; level: string }; right: { risk: number; level: string }; factors: string[] };
      meniscusTear: { left: { risk: number; level: string }; right: { risk: number; level: string }; factors: string[] };
      itBandSyndrome: { left: { risk: number; level: string }; right: { risk: number; level: string }; factors: string[] };
      patellarTendinopathy: { left: { risk: number; level: string }; right: { risk: number; level: string }; factors: string[] };
    };
    ankle: {
      lateralAnkleSprain: { left: { risk: number; level: string }; right: { risk: number; level: string }; factors: string[] };
      achillesTendinopathy: { left: { risk: number; level: string }; right: { risk: number; level: string }; factors: string[] };
      plantarFasciitis: { left: { risk: number; level: string }; right: { risk: number; level: string }; factors: string[] };
      tibialStressFracture: { left: { risk: number; level: string }; right: { risk: number; level: string }; factors: string[] };
    };
    shoulder: {
      rotatorCuffTear: { left: { risk: number; level: string }; right: { risk: number; level: string }; factors: string[] };
      impingementSyndrome: { left: { risk: number; level: string }; right: { risk: number; level: string }; factors: string[] };
      instability: { left: { risk: number; level: string }; right: { risk: number; level: string }; factors: string[] };
      bicepsTendinopathy: { left: { risk: number; level: string }; right: { risk: number; level: string }; factors: string[] };
    };
  }>(),
  
  // Threshold warnings (exceeds safe limits)
  thresholdWarnings: json("threshold_warnings").$type<{
    jointWarnings: Array<{
      joint: string;
      metric: string;
      currentValue: number;
      threshold: number;
      severity: string;
      recommendation: string;
    }>;
    muscleWarnings: Array<{
      muscle: string;
      issue: string;
      severity: string;
      recommendation: string;
    }>;
    postureWarnings: Array<{
      deviation: string;
      severity: string;
      relatedRisks: string[];
    }>;
  }>(),
  
  // Contributing factors identified
  riskFactors: json("risk_factors").$type<{
    biomechanical: string[];
    postural: string[];
    muscular: string[];
    historical: string[];
  }>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Treatment Strategies - AI-generated treatment plans
export const treatmentStrategies = pgTable("treatment_strategies", {
  id: serial("id").primaryKey(),
  injuryRiskScoreId: integer("injury_risk_score_id")
    .references(() => injuryRiskScores.id, { onDelete: "cascade" }),
  virtualPatientConfigId: integer("virtual_patient_config_id")
    .references(() => virtualPatientConfigs.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Assessment summary from AI
  clinicalSummary: text("clinical_summary"),
  primaryProblems: json("primary_problems").$type<Array<{
    problem: string;
    severity: string;
    priority: number;
    relatedFindings: string[];
  }>>(),
  
  // Treatment goals
  treatmentGoals: json("treatment_goals").$type<{
    shortTerm: Array<{ goal: string; timeframe: string; metrics: string[] }>;
    longTerm: Array<{ goal: string; timeframe: string; metrics: string[] }>;
  }>(),
  
  // Recommended interventions
  interventions: json("interventions").$type<{
    manualTherapy: Array<{
      technique: string;
      target: string;
      frequency: string;
      rationale: string;
    }>;
    therapeuticExercises: Array<{
      exercise: string;
      sets: number;
      reps: number;
      frequency: string;
      progression: string;
      rationale: string;
      contraindications: string[];
    }>;
    neuromuscularReeducation: Array<{
      activity: string;
      focus: string;
      progression: string;
    }>;
    patientEducation: Array<{
      topic: string;
      keyPoints: string[];
    }>;
    modalitiesIfNeeded: Array<{
      modality: string;
      parameters: string;
      rationale: string;
    }>;
  }>(),
  
  // Load management recommendations
  loadManagement: json("load_management").$type<{
    currentLoadCapacity: string;
    recommendedLoadReduction: number; // percentage
    activityModifications: string[];
    returnToActivityCriteria: string[];
    progressionTimeline: Array<{
      phase: string;
      duration: string;
      activities: string[];
      restrictions: string[];
    }>;
  }>(),
  
  // Precautions and contraindications
  precautions: json("precautions").$type<{
    redFlags: string[];
    contraindications: string[];
    watchFor: string[];
  }>(),
  
  // Expected outcomes
  prognosis: json("prognosis").$type<{
    expectedRecoveryTime: string;
    prognosticFactors: { positive: string[]; negative: string[] };
    expectedOutcome: string;
  }>(),
  
  // AI reasoning/evidence
  aiReasoning: text("ai_reasoning"),
  evidenceBase: json("evidence_base").$type<Array<{
    claim: string;
    evidence: string;
    strength: string;
  }>>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas for biomechanical assessments
export const insertBiomechanicalAssessmentSchema = createInsertSchema(biomechanicalAssessments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInjuryRiskScoreSchema = createInsertSchema(injuryRiskScores).omit({
  id: true,
  createdAt: true,
});

export const insertTreatmentStrategySchema = createInsertSchema(treatmentStrategies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for biomechanical assessments
export type BiomechanicalAssessment = typeof biomechanicalAssessments.$inferSelect;
export type InsertBiomechanicalAssessment = z.infer<typeof insertBiomechanicalAssessmentSchema>;
export type InjuryRiskScore = typeof injuryRiskScores.$inferSelect;
export type InsertInjuryRiskScore = z.infer<typeof insertInjuryRiskScoreSchema>;
export type TreatmentStrategy = typeof treatmentStrategies.$inferSelect;
export type InsertTreatmentStrategy = z.infer<typeof insertTreatmentStrategySchema>;

// Relations for biomechanical assessments
export const biomechanicalAssessmentRelations = relations(biomechanicalAssessments, ({ one, many }) => ({
  virtualPatientConfig: one(virtualPatientConfigs, {
    fields: [biomechanicalAssessments.virtualPatientConfigId],
    references: [virtualPatientConfigs.id],
  }),
  user: one(users, {
    fields: [biomechanicalAssessments.userId],
    references: [users.id],
  }),
  injuryRiskScores: many(injuryRiskScores),
}));

export const injuryRiskScoreRelations = relations(injuryRiskScores, ({ one, many }) => ({
  biomechanicalAssessment: one(biomechanicalAssessments, {
    fields: [injuryRiskScores.biomechanicalAssessmentId],
    references: [biomechanicalAssessments.id],
  }),
  treatmentStrategies: many(treatmentStrategies),
}));

export const treatmentStrategyRelations = relations(treatmentStrategies, ({ one }) => ({
  injuryRiskScore: one(injuryRiskScores, {
    fields: [treatmentStrategies.injuryRiskScoreId],
    references: [injuryRiskScores.id],
  }),
  virtualPatientConfig: one(virtualPatientConfigs, {
    fields: [treatmentStrategies.virtualPatientConfigId],
    references: [virtualPatientConfigs.id],
  }),
  user: one(users, {
    fields: [treatmentStrategies.userId],
    references: [users.id],
  }),
}));

// Patient Clone - Real patient virtualization from SOAP notes or movement capture
export const patientClones = pgTable("patient_clones", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Clone identification (privacy-preserving)
  cloneName: text("clone_name").notNull(),
  description: text("description"),
  
  // Source of clone data
  sourceType: text("source_type").notNull(), // 'soap_note', 'movement_capture', 'manual', 'hybrid'
  soapNoteId: integer("soap_note_id"),
  
  // 3D Model Configuration (same structure as virtualPatientConfigs.modelConfig)
  modelConfig: json("model_config").$type<{
    limbScales: { upperArm: number; forearm: number; thigh: number; shin: number; overall: number };
    spine: { cervicalLordosis: number; thoracicKyphosis: number; lumbarLordosis: number; scoliosis: number; forwardHead: number; lateralShift: number; cervicalRotation: number; cervicalLateralFlexion: number; thoracicRotation: number; lumbarRotation: number };
    neck: { flexion: number; extension: number; rotation: number; lateralFlexion: number; forwardHead: number };
    pelvis: { tilt: number; obliquity: number; rotation: number; drop: number };
    leftHip: { flexion: number; extension: number; abduction: number; internalRotation: number; anteversion: number; neckShaftAngle: number };
    rightHip: { flexion: number; extension: number; abduction: number; internalRotation: number; anteversion: number; neckShaftAngle: number };
    leftKnee: { flexion: number; varus: number; tibialTorsion: number; recurvatum: number; tibialSlope: number; patellaAlta: number };
    rightKnee: { flexion: number; varus: number; tibialTorsion: number; recurvatum: number; tibialSlope: number; patellaAlta: number };
    leftAnkle: { dorsiflexion: number; plantarflexion: number; inversion: number; eversion: number; archHeight: number };
    rightAnkle: { dorsiflexion: number; plantarflexion: number; inversion: number; eversion: number; archHeight: number };
    leftShoulder: { flexion: number; abduction: number; internalRotation: number; externalRotation: number; retroversion: number; elevation: number; protraction: number; winging: number; clavicleLength: number };
    rightShoulder: { flexion: number; abduction: number; internalRotation: number; externalRotation: number; retroversion: number; elevation: number; protraction: number; winging: number; clavicleLength: number };
    leftElbow: { flexion: number; carryingAngle: number; pronation: number };
    rightElbow: { flexion: number; carryingAngle: number; pronation: number };
    leftWrist: { deviation: number; flexion: number };
    rightWrist: { deviation: number; flexion: number };
  }>(),
  
  // Clinical modifiers extracted from SOAP (de-identified)
  clinicalModifiers: json("clinical_modifiers").$type<{
    primaryCondition: string;
    bodyRegion: string;
    severity: 'mild' | 'moderate' | 'severe';
    chronicity: 'acute' | 'subacute' | 'chronic';
    movementLimitations: string[];
    compensatoryPatterns: string[];
    painBehavior: 'constant' | 'intermittent' | 'activity_related';
  }>(),
  
  // Captured movement data (from webcam/video analysis)
  capturedMovementData: json("captured_movement_data").$type<{
    captureTimestamp: string;
    capturedAngles: {
      hipFlexion: { left: number; right: number };
      hipAbduction: { left: number; right: number };
      kneeFlexion: { left: number; right: number };
      shoulderFlexion: { left: number; right: number };
      shoulderAbduction: { left: number; right: number };
      elbowFlexion: { left: number; right: number };
      trunkFlexion: number;
      trunkLateralFlexion: number;
    };
    posturalDeviations: string[];
    gaitMetrics: {
      cadence: number;
      stepLength: { left: number; right: number };
      asymmetryScore: number;
    };
    movementQualityScore: number;
  }>(),
  
  // Biomechanics data for force visualization
  biomechanicsData: json("biomechanics_data").$type<{
    jointForces: {
      lumbarCompression: number;
      lumbarShear: number;
      leftHipCompression: number;
      rightHipCompression: number;
      leftKneeCompression: number;
      rightKneeCompression: number;
    };
    muscleActivations: {
      erectorSpinae: number;
      gluteMaximus: { left: number; right: number };
      quadriceps: { left: number; right: number };
      hamstrings: { left: number; right: number };
    };
    riskFactors: string[];
  }>(),
  
  // Animation frames for playback
  animationFrames: json("animation_frames").$type<Array<{
    timestamp: number;
    jointAngles: Record<string, Record<string, number>>;
  }>>(),
  
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPatientCloneSchema = createInsertSchema(patientClones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPatientClone = z.infer<typeof insertPatientCloneSchema>;
export type PatientClone = typeof patientClones.$inferSelect;

export const patientCloneRelations = relations(patientClones, ({ one }) => ({
  user: one(users, {
    fields: [patientClones.userId],
    references: [users.id],
  }),
}));

// Electrophysical Engine condition presets — per-clinician (and optionally
// per-patient) saved Condition + context bundles for the Electro Rx tab so
// clinicians don't have to re-type the diagnosis / contraindications every
// session for the same patient.
export const electroConditionPresets = pgTable("electro_condition_presets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Optional patient scope. When null, the preset is user-global ("any
  // patient"); when set, it's scoped to that patient/conversation id.
  patientId: integer("patient_id"),
  name: text("name").notNull(),
  condition: text("condition").notNull().default(""),
  stage: text("stage").notNull().default(""),
  irritability: text("irritability").notNull().default(""),
  tissueType: text("tissue_type").notNull().default(""),
  primaryGoal: text("primary_goal").notNull().default(""),
  contraindicationFlags: jsonb("contraindication_flags").$type<string[]>().notNull().default([]),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Persistence is keyed by (userId, patientId, name). The matching DB
  // index is created with `NULLS NOT DISTINCT` (Postgres 15+) so user-global
  // presets (patientId IS NULL) also enforce name uniqueness per user — the
  // installed Drizzle build doesn't expose `.nullsNotDistinct()` on
  // uniqueIndex, so the NULLS NOT DISTINCT clause is applied at the SQL
  // level (see migration / db setup) and this declaration documents the
  // intended uniqueness contract.
  userPatientNameUnique: uniqueIndex('electro_condition_presets_user_patient_name_unique')
    .on(table.userId, table.patientId, table.name),
}));

export const insertElectroConditionPresetSchema = createInsertSchema(electroConditionPresets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsedAt: true,
});

export type InsertElectroConditionPreset = z.infer<typeof insertElectroConditionPresetSchema>;
export type ElectroConditionPreset = typeof electroConditionPresets.$inferSelect;

export const electroConditionPresetRelations = relations(electroConditionPresets, ({ one }) => ({
  user: one(users, {
    fields: [electroConditionPresets.userId],
    references: [users.id],
  }),
}));

// Patient Presentation - Links SOAP notes to skeleton visualization with extracted movement restrictions
export const patientPresentations = pgTable("patient_presentations", {
  id: serial("id").primaryKey(),
  soapNoteId: integer("soap_note_id")
    .references(() => soapNotes.id, { onDelete: "cascade" }),
  temporarySoapNoteId: integer("temporary_soap_note_id")
    .references(() => temporarySoapNotes.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // De-identified clinical summary (no PHI)
  clinicalSummary: text("clinical_summary"),
  
  // Extracted joint constraints for skeleton visualization
  jointConstraints: json("joint_constraints").$type<Array<{
    joint: string;
    movement: string;
    maxROM: number;
    normalROM: number;
    reason: string;
    painLevel: number;
    isActive: boolean;
  }>>(),
  
  // Affected body regions for visual highlighting
  affectedRegions: json("affected_regions").$type<Array<{
    region: string;
    severity: 'mild' | 'moderate' | 'severe';
    description: string;
  }>>(),
  
  // Compensation patterns detected from clinical findings
  compensationPatterns: json("compensation_patterns").$type<Array<{
    sourceJoint: string;
    sourceMovement: string;
    compensatingJoint: string;
    compensatingMovement: string;
    clinicalNote: string;
  }>>(),
  
  // Positive clinical tests that inform movement restrictions
  positiveTests: json("positive_tests").$type<Array<{
    testName: string;
    finding: string;
    implication: string;
  }>>(),
  
  // AI extraction metadata
  extractionConfidence: integer("extraction_confidence"), // 0-100
  extractedAt: timestamp("extracted_at").defaultNow().notNull(),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPatientPresentationSchema = createInsertSchema(patientPresentations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  extractedAt: true,
});

export type InsertPatientPresentation = z.infer<typeof insertPatientPresentationSchema>;
export type PatientPresentation = typeof patientPresentations.$inferSelect;

export const patientPresentationRelations = relations(patientPresentations, ({ one }) => ({
  soapNote: one(soapNotes, {
    fields: [patientPresentations.soapNoteId],
    references: [soapNotes.id],
  }),
  temporarySoapNote: one(temporarySoapNotes, {
    fields: [patientPresentations.temporarySoapNoteId],
    references: [temporarySoapNotes.id],
  }),
  user: one(users, {
    fields: [patientPresentations.userId],
    references: [users.id],
  }),
}));

// Saved Skeleton Configurations - User-saved skeleton states for future use
export const savedSkeletonConfigurations = pgTable("saved_skeleton_configurations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Optional link to patient presentation (if created from extracted data)
  patientPresentationId: integer("patient_presentation_id")
    .references(() => patientPresentations.id, { onDelete: "set null" }),
  
  // User-provided name for this configuration
  name: text("name").notNull(),
  description: text("description"),
  
  // Complete skeleton state
  jointConstraints: json("joint_constraints").$type<Array<{
    joint: string;
    movement: string;
    maxROM: number;
    normalROM: number;
    reason: string;
    painLevel: number;
    isActive: boolean;
  }>>(),
  
  modelConfig: json("model_config").$type<{
    limbScales?: Record<string, number>;
    shoulderPathology?: string;
    spinalPathology?: string;
    lowerLimbPathology?: string;
    modelType?: string;
  }>(),
  
  biomechanicsData: json("biomechanics_data").$type<{
    jointForces?: Record<string, any>;
    muscleActivation?: Record<string, number>;
    injuryRisk?: Record<string, any>;
  }>(),
  
  // Affected regions for quick reference
  affectedRegions: json("affected_regions").$type<Array<{
    region: string;
    severity: 'mild' | 'moderate' | 'severe';
    description: string;
  }>>(),
  
  // Clinical summary if extracted from SOAP
  clinicalSummary: text("clinical_summary"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSavedSkeletonConfigurationSchema = createInsertSchema(savedSkeletonConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSavedSkeletonConfiguration = z.infer<typeof insertSavedSkeletonConfigurationSchema>;
export type SavedSkeletonConfiguration = typeof savedSkeletonConfigurations.$inferSelect;

export const savedSkeletonConfigurationRelations = relations(savedSkeletonConfigurations, ({ one }) => ({
  user: one(users, {
    fields: [savedSkeletonConfigurations.userId],
    references: [users.id],
  }),
  patientPresentation: one(patientPresentations, {
    fields: [savedSkeletonConfigurations.patientPresentationId],
    references: [patientPresentations.id],
  }),
}));

export interface NaturalTimelineFollowUpQuestion {
  id: string;
  question: string;
  options?: string[];
  clinical_relevance: string;
}

export type NaturalTimelineHealingClass = "resolves" | "partially_resolves" | "persists" | "worsens";

export interface NaturalTimelineFinding {
  finding_id: string;
  label: string;
  tissue_type?: "tendon" | "nerve" | "joint" | "fascia" | "muscle" | "ligament" | "disc" | "bone" | "generic";
  tissue_id?: string;
  healing_class: NaturalTimelineHealingClass;
  expected_weeks_to_resolution: number | null;
  residual_deficit_percent: number;
  phase_durations_weeks?: {
    inflammatory?: number;
    proliferative?: number;
    remodeling?: number;
    maturation?: number;
  };
  rationale: string;
}

export interface NaturalTimelineRequestContext {
  clinical_summary?: string;
  main_complaint?: string;
  pain_markers?: Array<{
    anatomical_label: string;
    symptom_type?: string;
    pain_mechanism?: string;
    description?: string;
    severity?: number;
  }>;
  compromised_tissues?: Array<{
    tissue_type: string;
    tissue_id: string;
    severity: number;
    rationale?: string;
  }>;
  region_highlights?: Array<{ region: string; type?: string; severity?: number; label?: string }>;
  postural_deviations?: Record<string, number>;
  sling_weak_links?: Array<{ sling: string; weakLink: string; severity?: number }>;
  sling_activation_overrides?: Array<{
    sling: string;
    activation_percent: number;
    band: string;
    deficit_severity: number;
  }>;
  joint_deviations?: Array<{ joint: string; parameter: string; degrees: number }>;
  has_nerve_root?: boolean;
  patient_factors?: Record<string, string | number | boolean | null | undefined>;
}

export interface NaturalTimelineQA {
  question: string;
  answer: string;
}

export interface NaturalTimelineRequest {
  context: NaturalTimelineRequestContext;
  qa_history?: NaturalTimelineQA[];
  /** Optional patient-context payload (Task #226). Mirrors the field
   *  on CaseSpecificTreatmentPlanRequest so downstream consumers have
   *  consistent typing across the AI panels. */
  patient_context?: PatientContextPayload;
}

export interface NaturalTimelineResult {
  per_finding: NaturalTimelineFinding[];
  overall_window_weeks: { expected: number; best: number; worst: number };
  residual_deficit_summary: {
    overall_percent: number;
    description: string;
  };
  chronicity_risk_percent: number;
  recurrence_risk_percent: number;
  flare_risk_percent: number;
  rationale: string;
  confidence_percent: number;
  follow_up_questions: NaturalTimelineFollowUpQuestion[];
  incorporated_factors: string[];
}

/** Case-specific per-phase treatment item (technique or exercise) emitted by
 *  the Case-Specific Treatment Plan engine. Each item references the actual
 *  finding ids / tissue ids / sling ids it targets so the dashboard can show
 *  WHY this prescription exists for THIS patient (rather than a generic
 *  textbook list). */
export interface CaseSpecificTreatmentItem {
  /** Concrete clinical name, e.g. "Supraspinatus isometric @ 30° abd",
   *  "Grade III post-glide R glenohumeral", "Sciatic nerve slider supine". */
  name: string;
  /** What this item is intended to change (tissue/finding/sling/posture). */
  target: string;
  /** Sets × reps × hold/intensity, frequency, or hands-on dosage. */
  dosage: string;
  /** When/how to progress or regress within this phase. */
  progression?: string;
  /** 1-2 sentence per-finding healing rationale tying the item to tissue
   *  biology + the patient's specific drivers. */
  rationale: string;
  /** finding_ids from the AI natural-timeline this item is targeting. */
  finding_ids?: string[];
  /** tissue_ids from compromised_tissues this item is targeting. */
  tissue_ids?: string[];
  /** sling names from sling_weak_links this item is targeting. */
  sling_ids?: string[];
}

export interface CaseSpecificPhasePlan {
  /** Stable archetype stage id (e.g. "calm_prepare", "build_capacity",
   *  "restore_power", "return_to_sport"). Matches RecoveryStage.id. */
  phase_id: string;
  /** Human label (e.g. "Calm & Prepare"). */
  phase_name: string;
  /** Case-specific one-line goal — references the actual tissues and
   *  drivers, not a generic textbook goal. */
  goal: string;
  /** 1-2 sentence narrative tying this phase's plan to the patient's
   *  natural-history verdict + clinical picture. */
  rationale: string;
  /** Concrete manual therapy / hands-on / modality items. */
  techniques: CaseSpecificTreatmentItem[];
  /** Concrete exercise prescriptions with dosage. */
  exercises: CaseSpecificTreatmentItem[];
  /** Objective entry/exit criteria for this phase, written in the
   *  patient's own clinical units (e.g. "Pain ≤3/10 on isometric ER",
   *  "Single-leg balance >20s with eyes open"). */
  criteria?: string[];
  /** Per-finding healing notes for this phase, e.g. "Supraspinatus:
   *  protect inflammatory phase, isometrics only". */
  finding_notes?: Array<{ finding_id: string; note: string }>;
}

export interface CaseSpecificTreatmentPlan {
  phases: CaseSpecificPhasePlan[];
  /** Overall 2-3 sentence narrative for the case as a whole. */
  case_summary: string;
  /** AI confidence in this case-specific plan. */
  confidence_percent: number;
}

export interface CaseSpecificTreatmentPlanRequest {
  context: NaturalTimelineRequestContext;
  natural_timeline: NaturalTimelineResult;
  /** Archetype stage labels in order so the AI emits one phase plan per
   *  card with matching ids. */
  phases: Array<{ id: string; name: string; subtitle?: string }>;
  archetype_id?: string;
  condition_label?: string;
  qa_history?: NaturalTimelineQA[];
  patient_context?: PatientContextPayload;
}

/** AI-generated patient-context prompt category. Drives icon / colour
 *  choice in the Patient Context card so the clinician can see WHY the
 *  AI is asking each question (e.g. healing time vs red-flag screen). */
export type PatientContextPromptCategory =
  | 'healing_time'
  | 'red_flag'
  | 'exercise_dosing'
  | 'contraindication'
  | 'compensation'
  | 'lifestyle'
  | 'other';

/** A single condition-specific prompt the AI thinks would change the
 *  case if answered. Generated by /api/patient-context/prompts. */
export interface PatientContextPrompt {
  id: string;
  prompt: string;
  rationale: string;
  category?: PatientContextPromptCategory;
  options?: string[];
}

/** A clinician-supplied answer to one AI-generated patient-context
 *  prompt. The full prompt + rationale are echoed back so downstream
 *  endpoints (which never see the prompts list directly) can quote
 *  them when injecting context into the model. */
export interface PatientContextAnswer {
  prompt_id: string;
  prompt: string;
  rationale?: string;
  category?: PatientContextPromptCategory;
  answer: string;
}

/** Merged patient-context payload. Sent into every downstream AI call
 *  (prediction re-run, natural timeline, case-specific plan, recovery
 *  sim) so outputs are personalised — not just keyed to a diagnosis. */
export interface PatientContextPayload {
  /** Free-form clinician-typed paragraph. */
  free_form: string;
  /** Per-prompt answered context. */
  answers: PatientContextAnswer[];
}

export interface PatientContextPromptsRequest {
  /** Original clinical description text the clinician submitted. */
  description: string;
  /** AI-extracted clinical summary from the prediction (if any). */
  clinical_summary?: string;
  /** Lightweight finding excerpts so the prompt generator knows what
   *  body region / tissue / mechanism is in play without re-running
   *  the full prediction. */
  pain_markers?: Array<{ anatomical_label: string; description?: string; symptom_type?: string }>;
  compromised_tissues?: Array<{ tissue_type: string; tissue_id: string; rationale?: string }>;
  region_highlights?: Array<{ region: string; type?: string; label?: string }>;
}

export interface PatientContextPromptsResult {
  prompts: PatientContextPrompt[];
  generated_at: string;
}

// =============================================================================
// Optimal Loading Engine — Tendinopathy (Task #231)
// =============================================================================

/** Tendinopathy sites supported by the Optimal Loading Engine v1. */
export type TendinopathySite =
  | 'achilles'
  | 'patellar'
  | 'gluteal'
  | 'proximal_hamstring'
  | 'rotator_cuff'
  | 'lateral_elbow'
  | 'medial_elbow';

export type LoadingEngineApplicability = 'tendinopathy' | 'not_applicable';

/** Loading-relevant clinical history fields gathered into Patient Context. */
export interface LoadingRelevantHistory {
  /** Free-text list of current medications. */
  medications?: string[];
  /** Flagged drug classes that affect tendon loading. Computed if not provided. */
  medicationFlags?: {
    statins?: boolean;
    fluoroquinolones?: boolean;
    corticosteroids?: boolean;
    aromataseInhibitors?: boolean;
  };
  /** Metabolic conditions affecting tendon recovery. */
  metabolicConditions?: {
    diabetes?: boolean;
    thyroid?: boolean;
    hypercholesterolaemia?: boolean;
    obesity?: boolean;
  };
  /** Hormonal / menopause status. */
  hormonalStatus?: {
    sex?: 'male' | 'female' | 'other';
    menopauseStatus?: 'premenopausal' | 'perimenopausal' | 'postmenopausal' | 'na';
    onHrt?: boolean;
  };
  /** Prior injury at the SAME site (true = recurrence risk). */
  priorInjurySameSite?: boolean;
  /** Recent training / loading history. */
  trainingHistory?: {
    weeklyLoadingHours?: number;
    recentLoadSpikePct?: number; // % increase week-on-week
    deconditioned?: boolean;
  };
}

export interface LoadingPatientFactors {
  age?: number;
  history: LoadingRelevantHistory;
  /** Current irritability (low / moderate / high). */
  irritability?: 'low' | 'moderate' | 'high';
  /** Current recovery phase (Cook staging or similar). */
  recoveryPhase?: 'reactive' | 'disrepair' | 'remodelling' | 'return_to_sport';
}

export type LoadingIntensityUnit = '%1RM' | '%MVC' | 'RIR' | 'pain_monitored' | 'isometric_hold' | 'bodyweight';

export type LoadingConfidenceBand =
  | 'rct_supported'      // direct RCT evidence for this dose at this site
  | 'protocol_supported' // established protocol (Alfredson, Silbernagel, HSR) extrapolated to this presentation
  | 'expert_consensus'   // consensus / clinical reasoning, limited primary evidence
  | 'extrapolation';     // extrapolated from related conditions

export type LoadingEvidenceTier = 'A' | 'B' | 'C' | 'Expert';

export interface LoadingTempo {
  eccentricSec: number;
  isometricSec: number;
  concentricSec: number;
}

export interface LoadingProgressionRule {
  trigger: string;
  nextStep: string;
  reviewAfterSessions: number;
}

export interface LoadingFactorContribution {
  factor: string;
  effect: string;
  rationale: string;
}

/**
 * One precise dose for one exercise for a specific week (or per day if the
 * exercise is prescribed daily).
 */
export interface OptimalLoadPrescription {
  id: string;
  exerciseId: string;
  exerciseName: string;
  weekIndex: number; // 0 = current week (committed)
  daysPerWeek: number;
  intensity: {
    value: number | string;
    unit: LoadingIntensityUnit;
    label: string;
  };
  sets: number;
  reps: string; // e.g. "6-8" or "30s hold"
  tempo: LoadingTempo;
  frequencyPerDay?: number;
  painCeilingNrs: number; // 0-10 NRS allowed during/after exercise
  progression: LoadingProgressionRule;
  confidence: LoadingConfidenceBand;
  evidenceTier: LoadingEvidenceTier;
  factorContributions: LoadingFactorContribution[];
  rationale: string;
  /** True when a clinician override has set this line; sticks across recomputes. */
  isOverride: boolean;
  overrideAuthorId?: string;
  overrideAt?: string;
  /** True for the rolling-commit window (weeks 0-1); false for the projection. */
  isCommitted: boolean;
}

export interface TendinopathySwapRequest {
  /** Index of the exercise in the proposed list that needs replacement. */
  proposedExerciseIndex: number;
  proposedExerciseId: string;
  proposedExerciseName: string;
  reason: string;
  preferredCategory: 'isometric' | 'isotonic' | 'eccentric' | 'energy_storage' | 'mobility';
  preferredBodyParts: string[];
}

export interface TendinopathyLoadingPlan {
  applicability: LoadingEngineApplicability;
  /** Human-readable single-line message when not applicable. */
  notApplicableMessage?: string;
  /** Recommended primary intervention name when not applicable. */
  notApplicableSuggestedFocus?: string;
  /** Site detected from condition text (when applicable). */
  site?: TendinopathySite;
  siteLabel?: string;
  recoveryPhase?: 'reactive' | 'disrepair' | 'remodelling' | 'return_to_sport';
  recoveryPhaseLabel?: string;
  irritability?: 'low' | 'moderate' | 'high';
  /** Committed prescriptions (weeks 0–1). */
  committed: OptimalLoadPrescription[];
  /** Tentative projection (weeks 2–11 typical). */
  projected: OptimalLoadPrescription[];
  /** Committed window length in weeks (1 or 2). */
  commitWindowWeeks: number;
  /** Total horizon in weeks. */
  horizonWeeks: number;
  /** Swap requests the prescription engine should honour. */
  swapRequests: TendinopathySwapRequest[];
  /** High-level rationale for the whole plan. */
  planRationale: string;
  /** Cumulative explainability string (for AI handoff). */
  explainabilitySummary: string;
  /** Triggers that will auto-recompute. */
  recomputeTriggers: string[];
  generatedAt: string;
  /** Hash of inputs — used to detect what changed since last compute. */
  inputsHash: string;
}

export interface LoadingPlanDiffEntry {
  exerciseId: string;
  exerciseName: string;
  weekIndex: number;
  field: 'intensity' | 'sets' | 'reps' | 'tempo' | 'frequency' | 'pain_ceiling' | 'progression';
  before: string;
  after: string;
  reason: string;
}

export interface LoadingPlanDiff {
  changes: LoadingPlanDiffEntry[];
  triggerReason: string;
  beforeHash: string;
  afterHash: string;
  computedAt: string;
}

export interface TendinopathyLoadingRequest {
  conditionName: string;
  /** Optional explicit site (overrides condition-text detection). */
  site?: TendinopathySite;
  patientFactors: LoadingPatientFactors;
  /** Exercises proposed by the AI Prescription engine. */
  proposedExercises: Array<{
    exerciseId: string;
    exerciseName: string;
    category?: string;
    bodyParts?: string[];
    /** Best-guess base dose from the prescription engine (informational only). */
    baseSets?: number;
    baseReps?: string;
  }>;
  /** Existing clinician overrides to preserve. */
  overrides?: Array<Pick<OptimalLoadPrescription, 'exerciseId' | 'weekIndex'> & Partial<OptimalLoadPrescription>>;
  /** Previous plan hash — for diff computation server-side. */
  previousPlanHash?: string;
  commitWindowWeeks?: 1 | 2;
  horizonWeeks?: number; // default 10
}

export interface TendinopathyLoadingResponse {
  plan: TendinopathyLoadingPlan;
  diff?: LoadingPlanDiff;
}

// ────────────────────────────────────────────────────────────────────
// Task #241 — Weekly check-ins for the recovery simulator
// ────────────────────────────────────────────────────────────────────
// One row per (caseId, week). Captures the clinician-logged actuals
// (pain, flare severity, sessions completed vs prescribed, sleep, free
// text) so the simulator can re-run from the most recent check-in week
// using real adherence/symptom values instead of the static plan.
export const recoveryWeeklyCheckIns = pgTable("recovery_weekly_check_ins", {
  id: serial("id").primaryKey(),
  // Owner of the check-in. Scoped per (userId, caseId, week) so one
  // clinician's case data can never be read or modified by another.
  userId: integer("user_id").notNull(),
  caseId: text("case_id").notNull(),
  week: integer("week").notNull(),
  pain: integer("pain").notNull(),
  flareSeverity: integer("flare_severity"),
  sessionsCompleted: integer("sessions_completed").notNull(),
  sessionsPrescribed: integer("sessions_prescribed").notNull(),
  sleepHours: numeric("sleep_hours"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userCaseWeekUnique: uniqueIndex("recovery_weekly_check_ins_user_case_week_unique").on(t.userId, t.caseId, t.week),
}));

// Coerce sleepHours — the only non-integer numeric on this row — into
// a `number | null`. Drizzle stores `numeric` columns as strings, but
// the API contract is "send a number or null"; an empty string used to
// slip through the previous loose `z.union([z.number(), z.string()])`
// schema and reach Postgres, which then threw an opaque 500 (see Task
// #257). The preprocess below normalises null/undefined/blank-string
// to `null` and parses any remaining string to a finite number, so
// from this point onwards the value is guaranteed to be a real number
// or `null` — never the literal `""`.
const sleepHoursSchema = z.preprocess(
  (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === '') return null;
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : val; // let z.number() reject NaN
    }
    return val;
  },
  z.number().finite().min(0).max(24).nullable(),
).optional();

// Defensive integer parser used for every integer column on the row.
// `z.number().int()` already rejects strings, but this preprocess
// surfaces an explicit error for the common failure mode (an empty
// string from a cleared `<Input type="number">`) so the route can
// turn it into a clear 400 instead of relying on Postgres' opaque
// "invalid input syntax for type integer: \"\"" message.
function intField(min: number, max: number) {
  return z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed === '') return Number.NaN; // forces .number() to reject
        const n = Number(trimmed);
        return Number.isFinite(n) ? n : Number.NaN;
      }
      return val;
    },
    z.number().int().min(min).max(max),
  );
}

// Insert schema omits userId — it is server-injected from the
// authenticated session, never trusted from the client payload.
export const insertRecoveryWeeklyCheckInSchema = createInsertSchema(recoveryWeeklyCheckIns).omit({
  id: true,
  createdAt: true,
  userId: true,
}).extend({
  caseId: z.string().min(1).max(200),
  week: intField(0, 520),
  pain: intField(0, 100),
  flareSeverity: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed === '') return null;
        const n = Number(trimmed);
        return Number.isFinite(n) ? n : Number.NaN;
      }
      return val;
    },
    z.number().int().min(0).max(100).nullable(),
  ).optional(),
  sessionsCompleted: intField(0, 100),
  sessionsPrescribed: intField(0, 100),
  sleepHours: sleepHoursSchema,
  notes: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed === '' ? null : val;
      }
      return val;
    },
    z.string().max(2000).nullable(),
  ).optional(),
});

export type InsertRecoveryWeeklyCheckIn = z.infer<typeof insertRecoveryWeeklyCheckInSchema>;
export type RecoveryWeeklyCheckIn = typeof recoveryWeeklyCheckIns.$inferSelect;

// =====================================================================
// Task #281 — Case-Aware Research Engine v1
//
// Persists one synthesized, citation-backed answer per case. Cache key
// is the deterministic content hash of the case (clinical text +
// patient context). The same caseId is upserted on each refresh so a
// case has at most one row in the cache at any time. Stale rows
// (different `contentHash`) are still returned by GET so the UI can
// flag them and offer a "Re-run" action.
// =====================================================================
export const caseResearchSyntheses = pgTable("case_research_syntheses", {
  id: serial("id").primaryKey(),
  caseId: text("case_id").notNull(),
  userId: integer("user_id").notNull(),
  contentHash: text("content_hash").notNull(),
  // Free-text condition / diagnosis label used as the broadest tier
  // and to render headings.
  condition: text("condition").notNull(),
  // The exact case summary fed to the engine — kept for debugging /
  // explainability so the clinician can see what the AI was reasoning
  // over.
  caseSummary: text("case_summary").notNull(),
  // AI-translated structured search phenotype derived from the raw
  // condition + case summary. Captures the canonical biomedical
  // wording, region, laterality, mechanism, aggravating factors and
  // pain type. Persisted so the UI can display it ("Interpreted your
  // case as…") and so the clinician can edit and re-run with their
  // own version. Optional for backwards compatibility with rows
  // written before Task #286 — the UI generates a sensible default.
  phenotype: jsonb("phenotype").$type<{
    canonicalCondition: { primary: string; synonyms: string[] };
    region: string | null;
    laterality: 'left' | 'right' | 'bilateral' | 'unspecified' | null;
    mechanism: { phrases: string[]; soft: boolean };
    aggravatingFactors: { phrases: string[]; soft: boolean };
    painType: string | null;
  }>(),
  // AI-inferred discriminating variables, ranked by importance.
  inferredVariables: jsonb("inferred_variables").$type<Array<{
    label: string;
    value: string;
    importance: number;     // 1 = most important, drops last
    dropFirstIfNeeded?: boolean;
    queryTerms: string[];   // terms to AND into the search
    rationale: string;
  }>>().notNull(),
  // Each tier of the query ladder that was actually executed (most
  // specific first). The "winning" tier is the last one in this array
  // since the engine stops as soon as it has enough evidence.
  queriesRan: jsonb("queries_ran").$type<Array<{
    tier: number;
    label: string;
    query: string;
    droppedVariables: string[];
    sources: Record<string, { count: number; ok: boolean; error?: string; query?: string }>;
    paperCount: number;
    seedUsed?: string;
    kind?: 'full' | 'drop-soft' | 'broaden-seed' | 'drop-hard' | 'condition-only';
  }>>().notNull(),
  // Audit of every "broaden the seed" swap the engine tried during
  // the ladder run. Mirrored from queriesRan for fast UI rendering.
  // Empty array if the engine never had to broaden.
  seedBroadenings: jsonb("seed_broadenings").$type<Array<{
    tier: number;
    from: string;
    to: string;
  }>>(),
  // De-duplicated, ranked papers actually used in synthesis.
  retrievedPapers: jsonb("retrieved_papers").$type<Array<{
    citationNumber: number;     // 1-indexed; matches inline [N] in answer
    source: 'pubmed' | 'openalex' | 'europepmc' | 'pedro' | 'semanticscholar' | 'crossref' | 'clinicaltrials';
    externalId: string;         // pmid / openalex id / europepmc id / pedro id / s2 id / doi / nct
    title: string;
    authors: string[];
    year: number | null;
    journal: string | null;
    abstract: string;
    doi: string | null;
    url: string;
    openAccess: boolean;
    matchedVariables: string[]; // labels of variables this paper covers
    // Union of every source that contributed this record (e.g. PubMed
    // + Semantic Scholar + CrossRef-filled). Always contains at least
    // the primary `source`. Optional for backwards compatibility with
    // rows persisted before Task #287.
    mergedFromSources?: Array<'pubmed' | 'openalex' | 'europepmc' | 'pedro' | 'semanticscholar' | 'crossref' | 'clinicaltrials'>;
    pedroScore?: number | null;
    citationCount?: number | null;
  }>>().notNull(),
  // ClinicalTrials.gov v2 records — surfaced in their own
  // "Active & recent trials" sub-section (not mixed into citations).
  // Optional for backwards compatibility with rows persisted before
  // Task #287; default to [] in the upsert layer.
  retrievedTrials: jsonb("retrieved_trials").$type<Array<{
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
  }>>(),
  synthesizedAnswer: text("synthesized_answer").notNull(),
  // Confidence buckets per spec: High / Moderate / Low / Extrapolated.
  confidence: text("confidence").notNull(),
  confidenceReason: text("confidence_reason"),
  // Task #301 — Active Movement Mode capacities. Per-joint, per-direction
  // active capacity rows derived from the case (literature priors +
  // GPT-4o synthesis). Optional: only populated once the clinician
  // toggles into Movement Mode at least once for this case. Manual
  // overrides also write back here so they persist across reloads.
  activeCapacities: jsonb("active_capacities").$type<{
    rows: Array<{
      joint: string;
      movement: string;
      passiveRomMin: number;
      passiveRomMax: number;
      activeRomMin: number;
      activeRomMax: number;
      painfulArc: { start: number; end: number; intensity: number } | null;
      activeStrengthPct: number;
      painInhibitionFactor: number;
      source: 'pathology-baseline' | 'ai' | 'manual';
      rationale?: string;
      // Task #301 — set when a clinician overrides this row from the
      // Active Capacities side panel. Used by the AI / Manual / Default
      // badge and to skip overwriting on re-generation.
      editedAt?: string;
    }>;
    generatedAt: string;
    rationaleSummary?: string;
  }>(),
  // Lightweight audit of which variables ended up dropped to satisfy
  // the tiered query ladder (mirrored from queriesRan for fast UI
  // rendering).
  droppedVariables: jsonb("dropped_variables").$type<string[]>().notNull(),
  // Task #305 — Research-derived structured treatment plan, generated
  // alongside synthesizedAnswer from the same retrieved papers. Read-only
  // companion to the prose answer; never written into the Treatment Plan
  // box / Plan Cart. Nullable for backwards compatibility with rows
  // persisted before Task #305.
  researchTreatmentPlan: jsonb("research_treatment_plan").$type<{
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
    confidence: 'High' | 'Moderate' | 'Low' | 'Extrapolated';
    confidenceReason: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  // One row per (user, case). Upserted on refresh.
  userCaseUnique: uniqueIndex("case_research_syntheses_user_case_unique").on(t.userId, t.caseId),
}));

export const insertCaseResearchSynthesisSchema = createInsertSchema(caseResearchSyntheses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCaseResearchSynthesis = z.infer<typeof insertCaseResearchSynthesisSchema>;
export type CaseResearchSynthesis = typeof caseResearchSyntheses.$inferSelect;

/** Task #301 — Active Movement Mode Zod schemas. Used by both the
 *  POST /api/active-capacity/:caseId regenerate endpoint and the
 *  PATCH override endpoint to validate payloads before they reach
 *  storage. Mirror the jsonb shape on `activeCapacities` above. */
export const activeCapacityRowSchema = z.object({
  joint: z.string().min(1),
  movement: z.string().min(1),
  passiveRomMin: z.number(),
  passiveRomMax: z.number(),
  activeRomMin: z.number(),
  activeRomMax: z.number(),
  painfulArc: z.object({ start: z.number(), end: z.number(), intensity: z.number().min(0).max(10) }).nullable(),
  activeStrengthPct: z.number().min(0).max(100),
  painInhibitionFactor: z.number().min(0).max(1),
  source: z.enum(['pathology-baseline', 'ai', 'manual']),
  rationale: z.string().optional(),
  editedAt: z.string().optional(),
});
export const activeCapacityProfileSchema = z.object({
  rows: z.array(activeCapacityRowSchema),
  generatedAt: z.string(),
  rationaleSummary: z.string().optional(),
});
export const activeCapacityOverridePatchSchema = activeCapacityRowSchema
  .partial()
  .extend({ joint: z.string().min(1), movement: z.string().min(1) });
export type ActiveCapacityRowSchema = z.infer<typeof activeCapacityRowSchema>;
export type ActiveCapacityProfileSchema = z.infer<typeof activeCapacityProfileSchema>;
export type ActiveCapacityOverridePatchSchema = z.infer<typeof activeCapacityOverridePatchSchema>;

/** Task #305 — Research-derived structured treatment plan. Generated
 *  alongside the synthesized prose answer using the same retrieved
 *  papers; persisted on the same `case_research_syntheses` row. */
export const researchPlanInterventionSchema = z.object({
  category: z.enum(['exercise', 'manual_therapy', 'electrophysical', 'education_lifestyle']),
  label: z.string().min(1).max(160),
  dose: z.string().min(1).max(240),
  citations: z.array(z.number().int().positive()).max(20).default([]),
  extrapolated: z.boolean().default(false),
  rationale: z.string().max(400).optional(),
});
export const researchPlanPhaseSchema = z.object({
  name: z.string().min(1).max(80),
  goal: z.string().min(1).max(240),
  duration: z.string().min(1).max(80),
  interventions: z.array(researchPlanInterventionSchema).max(20).default([]),
  progressionCriteria: z.array(z.object({
    criterion: z.string().min(1).max(240),
    citations: z.array(z.number().int().positive()).max(20).default([]),
  })).max(10).default([]),
});
export const researchTreatmentPlanSchema = z.object({
  generatedAt: z.string(),
  hasEvidence: z.boolean(),
  noEvidenceReason: z.string().max(400).optional(),
  phases: z.array(researchPlanPhaseSchema).max(6).default([]),
  outcomeMeasures: z.array(z.object({
    name: z.string().min(1).max(120),
    purpose: z.string().min(1).max(240),
    citations: z.array(z.number().int().positive()).max(20).default([]),
  })).max(10).default([]),
  redFlags: z.array(z.string().min(1).max(240)).max(15).default([]),
  followUpCadence: z.string().min(1).max(160).default('Review at next session'),
  confidence: z.enum(['High', 'Moderate', 'Low', 'Extrapolated']),
  confidenceReason: z.string().max(400),
});
export type ResearchTreatmentPlanSchema = z.infer<typeof researchTreatmentPlanSchema>;

/** Shape of the structured search phenotype the engine derives from
 *  the clinician's free-text condition + case summary. Edited inline
 *  by the clinician via "Edit interpretation" and submitted back to
 *  re-run the search without re-doing the AI translation. */
export const searchablePhenotypeSchema = z.object({
  canonicalCondition: z.object({
    primary: z.string().min(1).max(160),
    synonyms: z.array(z.string().min(1).max(160)).max(8).default([]),
  }),
  region: z.string().min(1).max(80).nullable().optional().default(null),
  /** When true, region is treated as a soft modifier (drop first when
   *  literature is thin). Defaults false because region is usually
   *  central to the search (e.g. "lumbar spine" for back pain). */
  regionSoft: z.boolean().optional().default(false),
  laterality: z.enum(['left', 'right', 'bilateral', 'unspecified']).nullable().optional().default('unspecified'),
  mechanism: z.object({
    phrases: z.array(z.string().min(1).max(120)).max(8).default([]),
    soft: z.boolean().default(false),
  }).default({ phrases: [], soft: false }),
  aggravatingFactors: z.object({
    phrases: z.array(z.string().min(1).max(120)).max(8).default([]),
    soft: z.boolean().default(true),
  }).default({ phrases: [], soft: true }),
  painType: z.string().min(1).max(80).nullable().optional().default(null),
  /** Soft/hard toggle for pain type. Defaults true because pain type
   *  ("mechanical", "neuropathic") rarely returns dense literature
   *  when AND'd as a hard modifier. */
  painTypeSoft: z.boolean().optional().default(true),
});
export type SearchablePhenotype = z.infer<typeof searchablePhenotypeSchema>;

/** Body shape accepted by POST /api/case-research/:caseId. The
 *  `caseSummary` is the canonical clinical text the engine reasons
 *  over (clinician description + AI-extracted summary + patient
 *  context answers). `condition` is the parsed diagnosis used as the
 *  broadest fallback tier. `contentHash` is computed client-side from
 *  the same source material so cache hits are deterministic.
 *  `phenotypeOverride` (optional): when supplied (e.g. from the
 *  clinician's "Edit interpretation" → "Re-run with my edits"), the
 *  engine SKIPS its own AI translation step and uses the supplied
 *  phenotype directly.
 *  `caseContext` (optional, Task #313): structured case picture
 *  assembled by the orchestrator (top working hypothesis, mechanism,
 *  region/laterality, chronicity, irritability, patient factors).
 *  When supplied, the engine prefers the top hypothesis label as the
 *  search seed and seeds variable inference with the structured
 *  fields so retrieval is more specific than parsing prose. */
export const caseResearchContextSchema = z.object({
  topHypothesis: z.object({
    label: z.string().min(1).max(200),
    confidence: z.number().min(0).max(1),
  }).optional(),
  mainComplaint: z.string().max(200).optional(),
  region: z.string().max(80).optional(),
  laterality: z.enum(['left', 'right', 'bilateral', 'unspecified']).optional(),
  chronicity: z.string().max(40).optional(),
  irritability: z.enum(['low', 'moderate', 'high']).optional(),
  mechanism: z.string().max(200).optional(),
  severity: z.number().min(0).max(10).optional(),
  painRegions: z.array(z.string().max(80)).max(12).optional(),
  patientFactors: z.array(z.string().max(80)).max(12).optional(),
  comorbidities: z.array(z.enum([
    'diabetes', 'smoking', 'pregnancy', 'osteoporosis',
    'cardiovascular', 'autoimmune', 'obesity', 'previousEpisodes',
  ])).max(8).optional(),
});
export type CaseResearchContext = z.infer<typeof caseResearchContextSchema>;

export const caseResearchRequestSchema = z.object({
  caseSummary: z.string().min(10).max(20000),
  condition: z.string().min(1).max(500),
  contentHash: z.string().min(1).max(128),
  refresh: z.boolean().optional(),
  phenotypeOverride: searchablePhenotypeSchema.optional(),
  caseContext: caseResearchContextSchema.optional(),
});
export type CaseResearchRequest = z.infer<typeof caseResearchRequestSchema>;

