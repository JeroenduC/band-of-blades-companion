-- Sprint 6: Marshal Tools (Squads and Specialists)

-- Create squads table
CREATE TABLE IF NOT EXISTS squads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    motto TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ROOKIE', 'SOLDIER', 'ELITE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create squad_members table
CREATE TABLE IF NOT EXISTS squad_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    heritage TEXT NOT NULL,
    rank TEXT NOT NULL CHECK (rank IN ('ROOKIE', 'SOLDIER')),
    status TEXT NOT NULL CHECK (status IN ('ALIVE', 'WOUNDED', 'DEAD')),
    harm INTEGER NOT NULL DEFAULT 0,
    stress INTEGER NOT NULL DEFAULT 0,
    xp INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create specialists table
CREATE TABLE IF NOT EXISTS specialists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    class TEXT NOT NULL CHECK (class IN ('HEAVY', 'MEDIC', 'OFFICER', 'SCOUT', 'SNIPER')),
    heritage TEXT NOT NULL,
    stress INTEGER NOT NULL DEFAULT 0 CHECK (stress >= 0 AND stress <= 9),
    harm_level_1_a TEXT,
    harm_level_1_b TEXT,
    harm_level_2_a TEXT,
    harm_level_2_b TEXT,
    harm_level_3 TEXT,
    healing_ticks INTEGER NOT NULL DEFAULT 0,
    xp INTEGER NOT NULL DEFAULT 0,
    abilities TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL CHECK (status IN ('AVAILABLE', 'DEPLOYED', 'DEAD', 'RETIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialists ENABLE ROW LEVEL SECURITY;

-- Policy: Campaign members can read squads
CREATE POLICY "Campaign members can read squads" ON squads
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM campaign_memberships
            WHERE campaign_memberships.campaign_id = squads.campaign_id
            AND campaign_memberships.user_id = auth.uid()
        )
    );

-- Policy: Campaign members can read squad members
CREATE POLICY "Campaign members can read squad members" ON squad_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM squads
            JOIN campaign_memberships ON squads.campaign_id = campaign_memberships.campaign_id
            WHERE squads.id = squad_members.squad_id
            AND campaign_memberships.user_id = auth.uid()
        )
    );

-- Policy: Campaign members can read specialists
CREATE POLICY "Campaign members can read specialists" ON specialists
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM campaign_memberships
            WHERE campaign_memberships.campaign_id = specialists.campaign_id
            AND campaign_memberships.user_id = auth.uid()
        )
    );

-- Write policies (Service Role only, as per project convention for mutations via server actions)
-- No authenticated INSERT/UPDATE/DELETE policies.

-- Indexes for performance
CREATE INDEX idx_squads_campaign_id ON squads(campaign_id);
CREATE INDEX idx_squad_members_squad_id ON squad_members(squad_id);
CREATE INDEX idx_specialists_campaign_id ON specialists(campaign_id);
