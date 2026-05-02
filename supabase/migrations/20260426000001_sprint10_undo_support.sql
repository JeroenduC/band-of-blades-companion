-- Sprint 10: Undo/Rollback Support

-- Add pending action columns to campaigns
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS pending_state text,
ADD COLUMN IF NOT EXISTS pending_expiry timestamptz,
ADD COLUMN IF NOT EXISTS last_action_id uuid;

-- Add UNDONE to log action types is not needed as it's a value in a text column,
-- but we should document it in DATA_MODEL.md

-- Comment on columns for documentation
COMMENT ON COLUMN public.campaigns.pending_state IS 'The state the campaign will transition to after the undo window expires.';
COMMENT ON COLUMN public.campaigns.pending_expiry IS 'Timestamp when the pending state will be committed.';
COMMENT ON COLUMN public.campaigns.last_action_id IS 'The ID of the last CampaignPhaseLog entry, for easy rollback.';
