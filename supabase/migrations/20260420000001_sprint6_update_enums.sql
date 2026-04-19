-- Sprint 6: Update campaign_phase_state enum with new states

-- We need to add the new states to the campaign_phase_state enum.
-- PostgreSQL doesn't allow adding values to an enum within a transaction (usually),
-- but we can use ALTER TYPE.

-- Note: In Supabase, if you run this in the SQL Editor, it should work.
-- If using migrations, sometimes you need to commit after each ALTER TYPE if there are multiple.

ALTER TYPE campaign_phase_state ADD VALUE IF NOT EXISTS 'AWAITING_PERSONNEL_UPDATE' AFTER 'AWAITING_MISSION_RESOLUTION';
ALTER TYPE campaign_phase_state ADD VALUE IF NOT EXISTS 'AWAITING_MISSION_DEPLOYMENT' AFTER 'AWAITING_MISSION_SELECTION';
