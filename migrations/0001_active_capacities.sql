-- Task #301 Active Movement Mode
-- Idempotent ALTER applying the active_capacities column to
-- case_research_syntheses. The column stores an
-- ActiveCapacityProfile (rows[], generatedAt, rationaleSummary,
-- editedAt) as JSONB. Safe to re-run: uses IF NOT EXISTS and
-- preserves existing data when the column is already present.
ALTER TABLE case_research_syntheses
  ADD COLUMN IF NOT EXISTS active_capacities JSONB;
