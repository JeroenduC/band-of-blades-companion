-- Sprint 4: Quartermaster materiel and personnel tables
-- Apply in Supabase SQL Editor or via supabase db push.
--
-- New tables:
--   1. long_term_projects   — Campaign clocks with segment tracking
--   2. alchemists           — Non-Legion personnel with corruption clocks
--   3. mercies              — Non-Legion healers (wounded/healthy)
--   4. laborers             — Worker units with project assignment
--   5. siege_weapons        — Deployed/available siege equipment
--   6. recruit_pool         — Per-phase recruit records for Marshal assignment
--
-- All tables:
--   - Have RLS enabled, scoped by campaign_id
--   - Use ON DELETE CASCADE for campaign FK

-- ─── 1. long_term_projects ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS long_term_projects (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  description     text        NOT NULL DEFAULT '',
  clock_size      integer     NOT NULL CHECK (clock_size BETWEEN 4 AND 12),
  segments_filled integer     NOT NULL DEFAULT 0 CHECK (segments_filled >= 0),
  -- phase_last_worked prevents working the same project twice in one phase
  phase_last_worked integer,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT segments_not_exceed_clock CHECK (segments_filled <= clock_size)
);

CREATE INDEX IF NOT EXISTS idx_long_term_projects_campaign_id
  ON long_term_projects (campaign_id);

ALTER TABLE long_term_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their campaign projects"
  ON long_term_projects FOR SELECT
  USING (
    campaign_id IN (
      SELECT campaign_id FROM campaign_memberships
      WHERE user_id = auth.uid()
    )
  );

-- ─── 2. alchemists ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alchemists (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  -- 0–8; at 8 the alchemist is corrupted
  corruption  integer     NOT NULL DEFAULT 0 CHECK (corruption BETWEEN 0 AND 8),
  status      text        NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CORRUPTED', 'DEAD')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alchemists_campaign_id
  ON alchemists (campaign_id);

ALTER TABLE alchemists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their campaign alchemists"
  ON alchemists FOR SELECT
  USING (
    campaign_id IN (
      SELECT campaign_id FROM campaign_memberships
      WHERE user_id = auth.uid()
    )
  );

-- ─── 3. mercies ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mercies (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  -- A Mercy can bear one wound at a time; heals automatically if unused in R&R
  wounded     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mercies_campaign_id
  ON mercies (campaign_id);

ALTER TABLE mercies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their campaign mercies"
  ON mercies FOR SELECT
  USING (
    campaign_id IN (
      SELECT campaign_id FROM campaign_memberships
      WHERE user_id = auth.uid()
    )
  );

-- ─── 4. laborers ──────────────────────────────────────────────────────────────
--
-- Laborers are tracked as a count, not individual rows.
-- current_project_id: set when the QM assigns laborers to a project in Step 6.
-- Reset to NULL after each phase.

CREATE TABLE IF NOT EXISTS laborers (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         uuid    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  count               integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  current_project_id  uuid    REFERENCES long_term_projects(id) ON DELETE SET NULL,
  UNIQUE (campaign_id)
);

ALTER TABLE laborers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their campaign laborers"
  ON laborers FOR SELECT
  USING (
    campaign_id IN (
      SELECT campaign_id FROM campaign_memberships
      WHERE user_id = auth.uid()
    )
  );

-- ─── 5. siege_weapons ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS siege_weapons (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  status      text        NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'DEPLOYED', 'DESTROYED')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_siege_weapons_campaign_id
  ON siege_weapons (campaign_id);

ALTER TABLE siege_weapons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their campaign siege weapons"
  ON siege_weapons FOR SELECT
  USING (
    campaign_id IN (
      SELECT campaign_id FROM campaign_memberships
      WHERE user_id = auth.uid()
    )
  );

-- ─── 6. recruit_pool ──────────────────────────────────────────────────────────
--
-- Created by the QM Recruit action. Read by the Marshal to assign to squads.
-- One row per Recruit action taken. assigned = true once Marshal has placed them.

CREATE TABLE IF NOT EXISTS recruit_pool (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  uuid        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  phase_number integer     NOT NULL,
  rookies      integer     NOT NULL DEFAULT 0 CHECK (rookies >= 0),
  soldiers     integer     NOT NULL DEFAULT 0 CHECK (soldiers >= 0),
  assigned     boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recruit_pool_campaign_id
  ON recruit_pool (campaign_id, phase_number);

ALTER TABLE recruit_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their campaign recruit pool"
  ON recruit_pool FOR SELECT
  USING (
    campaign_id IN (
      SELECT campaign_id FROM campaign_memberships
      WHERE user_id = auth.uid()
    )
  );
