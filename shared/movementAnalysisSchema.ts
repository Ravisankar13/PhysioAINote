import { pgTable, serial, integer, timestamp, jsonb, varchar, text, real, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const assessmentTypeEnum = pgEnum('assessment_type', [
  'squat', 
  'single_leg_stance',
  'lunge',
  'gait',
  'shoulder_flexion',
  'step_down',
  'overhead_reach',
  'balance',
  'custom'
]);

export const impairmentTypeEnum = pgEnum('impairment_type', [
  'knee_valgus',
  'trendelenburg',
  'forward_head',
  'pelvic_drop',
  'scapular_winging',
  'hip_shift',
  'excessive_lordosis',
  'limited_rom',
  'asymmetry',
  'compensation'
]);

export const movementQualityEnum = pgEnum('movement_quality', [
  'excellent',
  'good',
  'fair',
  'poor'
]);

// Movement Assessment Sessions table
export const movementSessions = pgTable("movement_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  patientName: varchar("patient_name", { length: 255 }).notNull(),
  patientAge: integer("patient_age"),
  patientGender: varchar("patient_gender", { length: 20 }),
  chiefComplaint: text("chief_complaint"),
  assessmentType: assessmentTypeEnum("assessment_type").notNull(),
  sessionDate: timestamp("session_date").defaultNow(),
  duration: integer("duration"), // in seconds
  notes: text("notes"),
  overallQuality: movementQualityEnum("overall_quality"),
  videoUrl: text("video_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Joint Angle Measurements table
export const jointMeasurements = pgTable("joint_measurements", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => movementSessions.id),
  timestamp: real("timestamp").notNull(), // time in seconds from start
  jointName: varchar("joint_name", { length: 100 }).notNull(),
  angleType: varchar("angle_type", { length: 50 }).notNull(), // flexion, extension, abduction, etc.
  angle: real("angle").notNull(), // in degrees
  plane: varchar("plane", { length: 20 }).notNull(), // sagittal, frontal, transverse
  side: varchar("side", { length: 10 }), // left, right, or null for midline
  normalRangeMin: real("normal_range_min"),
  normalRangeMax: real("normal_range_max"),
  isWithinNormal: boolean("is_within_normal"),
  deviationPercentage: real("deviation_percentage")
});

// Movement Impairments Detected
export const movementImpairments = pgTable("movement_impairments", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => movementSessions.id),
  impairmentType: impairmentTypeEnum("impairment_type").notNull(),
  severity: varchar("severity", { length: 20 }).notNull(), // mild, moderate, severe
  affectedJoints: jsonb("affected_joints").$type<string[]>(),
  timestamp: real("timestamp"), // when detected
  description: text("description"),
  clinicalSignificance: text("clinical_significance"),
  recommendedInterventions: jsonb("recommended_interventions").$type<string[]>()
});

// Movement Patterns table
export const movementPatterns = pgTable("movement_patterns", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => movementSessions.id),
  patternName: varchar("pattern_name", { length: 100 }).notNull(),
  quality: movementQualityEnum("quality"),
  keyPoints: jsonb("key_points").$type<{
    landmarks: Array<{ x: number; y: number; z: number; confidence: number }>;
    timestamp: number;
  }>(),
  deviations: jsonb("deviations").$type<Array<{
    type: string;
    severity: string;
    description: string;
  }>>(),
  compensations: jsonb("compensations").$type<Array<{
    bodyPart: string;
    compensationType: string;
    description: string;
  }>>()
});

// Gait Analysis Data
export const gaitAnalysis = pgTable("gait_analysis", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => movementSessions.id),
  stepLength: jsonb("step_length").$type<{ left: number; right: number }>(),
  stepWidth: real("step_width"),
  cadence: real("cadence"), // steps per minute
  velocity: real("velocity"), // meters per second
  strideLength: jsonb("stride_length").$type<{ left: number; right: number }>(),
  stancePhase: jsonb("stance_phase").$type<{ left: number; right: number }>(), // percentage
  swingPhase: jsonb("swing_phase").$type<{ left: number; right: number }>(), // percentage
  doubleSupport: real("double_support"), // percentage
  asymmetryIndex: real("asymmetry_index"),
  trunkLean: real("trunk_lean"), // degrees
  pelvicTilt: real("pelvic_tilt"), // degrees
  pelvicRotation: real("pelvic_rotation"), // degrees
});

// Balance Metrics
export const balanceMetrics = pgTable("balance_metrics", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => movementSessions.id),
  testType: varchar("test_type", { length: 50 }).notNull(), // single_leg, tandem, etc.
  duration: real("duration"), // seconds
  swayArea: real("sway_area"), // cm²
  swayVelocity: real("sway_velocity"), // cm/s
  copPath: real("cop_path"), // center of pressure path length
  copDisplacement: jsonb("cop_displacement").$type<{ x: number; y: number }>(),
  stabilityScore: real("stability_score"), // 0-100
  fallRisk: varchar("fall_risk", { length: 20 }), // low, moderate, high
});

// Range of Motion Records
export const romRecords = pgTable("rom_records", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => movementSessions.id),
  joint: varchar("joint", { length: 50 }).notNull(),
  movement: varchar("movement", { length: 50 }).notNull(),
  side: varchar("side", { length: 10 }),
  activeRom: real("active_rom"),
  passiveRom: real("passive_rom"),
  normalRange: jsonb("normal_range").$type<{ min: number; max: number }>(),
  limitation: boolean("limitation"),
  painPresent: boolean("pain_present"),
  endFeel: varchar("end_feel", { length: 50 }),
});

// Assessment Reports
export const assessmentReports = pgTable("assessment_reports", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => movementSessions.id),
  summary: text("summary"),
  keyFindings: jsonb("key_findings").$type<string[]>(),
  impairmentsSummary: jsonb("impairments_summary").$type<Array<{
    impairment: string;
    severity: string;
    impact: string;
  }>>(),
  recommendations: jsonb("recommendations").$type<{
    exercises: string[];
    manualTherapy: string[];
    patientEducation: string[];
    followUp: string;
  }>(),
  functionalLimitations: jsonb("functional_limitations").$type<string[]>(),
  goals: jsonb("goals").$type<{
    shortTerm: string[];
    longTerm: string[];
  }>(),
  prognosis: text("prognosis"),
  generatedAt: timestamp("generated_at").defaultNow()
});

// Create schemas for validation
export const insertMovementSessionSchema = createInsertSchema(movementSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertJointMeasurementSchema = createInsertSchema(jointMeasurements).omit({
  id: true
});

export const insertMovementImpairmentSchema = createInsertSchema(movementImpairments).omit({
  id: true
});

export const insertMovementPatternSchema = createInsertSchema(movementPatterns).omit({
  id: true
});

export const insertGaitAnalysisSchema = createInsertSchema(gaitAnalysis).omit({
  id: true
});

export const insertBalanceMetricsSchema = createInsertSchema(balanceMetrics).omit({
  id: true
});

export const insertRomRecordSchema = createInsertSchema(romRecords).omit({
  id: true
});

export const insertAssessmentReportSchema = createInsertSchema(assessmentReports).omit({
  id: true,
  generatedAt: true
});

// Types
export type MovementSession = typeof movementSessions.$inferSelect;
export type InsertMovementSession = z.infer<typeof insertMovementSessionSchema>;

export type JointMeasurement = typeof jointMeasurements.$inferSelect;
export type InsertJointMeasurement = z.infer<typeof insertJointMeasurementSchema>;

export type MovementImpairment = typeof movementImpairments.$inferSelect;
export type InsertMovementImpairment = z.infer<typeof insertMovementImpairmentSchema>;

export type MovementPattern = typeof movementPatterns.$inferSelect;
export type InsertMovementPattern = z.infer<typeof insertMovementPatternSchema>;

export type GaitAnalysis = typeof gaitAnalysis.$inferSelect;
export type InsertGaitAnalysis = z.infer<typeof insertGaitAnalysisSchema>;

export type BalanceMetrics = typeof balanceMetrics.$inferSelect;
export type InsertBalanceMetrics = z.infer<typeof insertBalanceMetricsSchema>;

export type RomRecord = typeof romRecords.$inferSelect;
export type InsertRomRecord = z.infer<typeof insertRomRecordSchema>;

export type AssessmentReport = typeof assessmentReports.$inferSelect;
export type InsertAssessmentReport = z.infer<typeof insertAssessmentReportSchema>;