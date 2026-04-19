-- Sprint 7: Spymaster Long-Term Assignments

-- Add last_phase_worked to spies to prevent double assignment
ALTER TABLE spies ADD COLUMN IF NOT EXISTS last_phase_worked integer DEFAULT -1;

-- Long-Term Assignments Table
CREATE TABLE IF NOT EXISTS spy_long_term_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    type text NOT NULL, -- AUGMENT, EXPAND, LAY_TRAP, RECRUIT, RESEARCH
    name text NOT NULL,
    description text,
    clock_segments integer NOT NULL DEFAULT 8,
    clock_filled integer NOT NULL DEFAULT 0,
    is_completed boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE spy_long_term_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Campaign members can read spy assignments" ON spy_long_term_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM campaign_memberships
            WHERE campaign_memberships.campaign_id = spy_long_term_assignments.campaign_id
            AND campaign_memberships.user_id = auth.uid()
        )
    );

-- Service role full access
CREATE POLICY "Service role full access on spy assignments" ON spy_long_term_assignments
    FOR ALL USING (true) WITH CHECK (true);

-- Indexing
CREATE INDEX idx_spy_long_term_assignments_campaign_id ON spy_long_term_assignments(campaign_id);
