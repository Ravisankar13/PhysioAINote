-- Task #309 Save full case history per skeleton (PhysioGPT)
-- Idempotent ALTER adding the case_snapshot column to
-- physiogpt_conversations. Stores the full workspace snapshot
-- (3D skeleton modelConfig, pain markers, patient context, plan
-- cart, treatment/timeline/right-panel state) as JSONB. Safe to
-- re-run: uses IF NOT EXISTS and preserves existing data.
ALTER TABLE physiogpt_conversations
  ADD COLUMN IF NOT EXISTS case_snapshot JSONB;
