-- Sprint 7: Spymaster Tools

-- Spy Status Enum
DO $$ BEGIN
    CREATE TYPE spy_status AS ENUM ('AVAILABLE', 'ON_ASSIGNMENT', 'WOUNDED', 'DEAD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Spy Rank Enum
DO $$ BEGIN
    CREATE TYPE spy_rank AS ENUM ('TRAINED', 'MASTER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Spy Assignment Type Enum
DO $$ BEGIN
    CREATE TYPE spy_assignment_type AS ENUM (
        'NONE', 'RECOVER', 'INTERROGATE', 'BLACKMAIL', 'HELP', 
        'AUGMENT', 'EXPAND', 'LAY_TRAP', 'RECRUIT', 'RESEARCH'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Spies Table
CREATE TABLE IF NOT EXISTS spies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name text NOT NULL,
    rank spy_rank NOT NULL DEFAULT 'TRAINED',
    status spy_status NOT NULL DEFAULT 'AVAILABLE',
    specialty text,
    current_assignment spy_assignment_type NOT NULL DEFAULT 'NONE',
    assignment_clock integer NOT NULL DEFAULT 0 CHECK (assignment_clock >= 0 AND assignment_clock <= 8),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Spy Network Table
CREATE TABLE IF NOT EXISTS spy_networks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE UNIQUE,
    upgrades jsonb NOT NULL DEFAULT '[]',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE spies ENABLE ROW LEVEL SECURITY;
ALTER TABLE spy_networks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Campaign members can read spies" ON spies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM campaign_memberships
            WHERE campaign_memberships.campaign_id = spies.campaign_id
            AND campaign_memberships.user_id = auth.uid()
        )
    );

CREATE POLICY "Campaign members can read spy networks" ON spy_networks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM campaign_memberships
            WHERE campaign_memberships.campaign_id = spy_networks.campaign_id
            AND campaign_memberships.user_id = auth.uid()
        )
    );

-- Service role can do everything
CREATE POLICY "Service role full access on spies" ON spies
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on spy networks" ON spy_networks
    FOR ALL USING (true) WITH CHECK (true);

-- Indexing
CREATE INDEX idx_spies_campaign_id ON spies(campaign_id);
