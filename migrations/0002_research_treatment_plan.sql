-- Task #305 Research-derived treatment plan
-- Idempotent ALTER adding the research_treatment_plan column to
-- case_research_syntheses. Stores the structured plan generated
-- alongside synthesizedAnswer (phases, interventions, progression
-- criteria, outcome measures, red flags, follow-up cadence,
-- plan-level confidence) as JSONB. Safe to re-run.
ALTER TABLE case_research_syntheses
  ADD COLUMN IF NOT EXISTS research_treatment_plan JSONB;
