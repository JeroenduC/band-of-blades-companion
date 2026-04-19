-- Mission table for Sprint 5
CREATE TYPE mission_type AS ENUM ('ASSAULT', 'RECON', 'RELIGIOUS', 'SUPPLY', 'SPECIAL');
CREATE TYPE mission_status AS ENUM ('GENERATED', 'PRIMARY', 'SECONDARY', 'FAILED');

CREATE TABLE missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  phase_number integer NOT NULL,
  name text NOT NULL,
  type mission_type NOT NULL,
  objective text NOT NULL,
  rewards jsonb NOT NULL DEFAULT '{}',
  penalties jsonb NOT NULL DEFAULT '{}',
  threat_level integer NOT NULL CHECK (threat_level >= 1 AND threat_level <= 4),
  status mission_status NOT NULL DEFAULT 'GENERATED',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign members can read missions" ON missions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_memberships
      WHERE campaign_memberships.campaign_id = missions.campaign_id
      AND campaign_memberships.user_id = auth.uid()
    )
  );

-- Only service role can write (mutations via server actions)
-- No authenticated INSERT/UPDATE/DELETE policy.
