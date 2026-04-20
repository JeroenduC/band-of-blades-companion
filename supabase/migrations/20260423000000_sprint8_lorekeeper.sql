-- Sprint 8: Lorekeeper Tools
--
-- Changes:
--   1. New columns on campaigns for Tale tracking
--   2. New columns on back_at_camp_scenes for multi-use support
--   3. New table: annals_entries (Lorekeeper's in-character notes)

-- ─── 1. Campaign table additions ─────────────────────────────────────────────

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS deaths_since_last_tale integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tales_told             jsonb   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS next_mission_special   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS next_mission_maneuver_bonus integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_mission_wreck_bonus    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_mission_resist_bonus   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_mission_resolve_bonus  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_mission_engagement_bonus integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_mission_armor_bonus    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_mission_no_advance     boolean NOT NULL DEFAULT false;

-- ─── Helper RPCs for Tale benefits ──────────────────────────────────────────

-- Add XP to all living specialists
CREATE OR REPLACE FUNCTION add_xp_to_all_specialists(p_campaign_id uuid, p_xp integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE specialists
  SET xp = xp + p_xp
  WHERE campaign_id = p_campaign_id AND status != 'DEAD' AND status != 'RETIRED';
END;
$$;

-- Add healing ticks to all specialists with harm
CREATE OR REPLACE FUNCTION add_healing_ticks_to_all_specialists(p_campaign_id uuid, p_ticks integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple version: just increment the counter. 
  -- Full version should handle row clearing, but this is a good start.
  UPDATE specialists
  SET healing_ticks = healing_ticks + p_ticks
  WHERE campaign_id = p_campaign_id AND status != 'DEAD' AND status != 'RETIRED';
END;
$$;

-- Reduce corruption for all active alchemists
CREATE OR REPLACE FUNCTION reduce_corruption_all_alchemists(p_campaign_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE alchemists
  SET corruption = GREATEST(0, corruption - p_amount)
  WHERE campaign_id = p_campaign_id AND status = 'ACTIVE';
END;
$$;

-- Advance a specific long term project
CREATE OR REPLACE FUNCTION advance_ltp(p_ltp_id uuid, p_ticks integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE long_term_projects
  SET 
    segments_filled = LEAST(clock_size, segments_filled + p_ticks),
    completed_at = CASE 
      WHEN segments_filled + p_ticks >= clock_size THEN now() 
      ELSE completed_at 
    END
  WHERE id = p_ltp_id;
END;
$$;

-- ─── 2. back_at_camp_scenes updates ──────────────────────────────────────────

ALTER TABLE back_at_camp_scenes
  ADD COLUMN IF NOT EXISTS max_uses   integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS times_used integer NOT NULL DEFAULT 0;

-- Update the seed function to support max_uses
CREATE OR REPLACE FUNCTION seed_back_at_camp_scenes(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Clear any existing scenes for this campaign to avoid duplicates if re-seeded
  DELETE FROM back_at_camp_scenes WHERE campaign_id = p_campaign_id;

  INSERT INTO back_at_camp_scenes (campaign_id, scene_text, morale_level, max_uses) VALUES
    -- HIGH morale scenes (morale 8+)
    (p_campaign_id, 'Soldiers hold a remembrance for the fallen', 'HIGH', 1),
    (p_campaign_id, 'A young soldier is detonating munitions, egged on by others', 'HIGH', 1),
    (p_campaign_id, 'Storms darken the skies. Rumors and wild speculation spread', 'HIGH', 1),
    (p_campaign_id, 'Supply crates go missing, but no one admits to knowing why', 'HIGH', 1),
    (p_campaign_id, 'A squad talks about home, and asks their captain about theirs', 'HIGH', 1),
    (p_campaign_id, 'Your Chosen has fallen silent and refuses to speak to anyone', 'HIGH', 1),

    -- MEDIUM morale scenes (morale 4–7)
    (p_campaign_id, 'A fight breaks out over one Legionnaire stealing from another', 'MEDIUM', 1),
    (p_campaign_id, 'After an undead attack the Legion must break camp and relocate', 'MEDIUM', 1),
    (p_campaign_id, 'A soldier is caught selling supplies to locals for special treats or favors', 'MEDIUM', 1),
    (p_campaign_id, 'News arrives of devastation from a different front', 'MEDIUM', 1),
    (p_campaign_id, 'A squad refuses to go into the field until their captain is replaced', 'MEDIUM', 1),
    (p_campaign_id, 'A band of refugees stumbles upon your camp and begs for help', 'MEDIUM', 2),

    -- LOW morale scenes (morale 3-)
    (p_campaign_id, 'A festering blight wound covered up by a soldier is revealed', 'LOW', 1),
    (p_campaign_id, 'A bunch of Legion medical supplies are missing. The wounded cry', 'LOW', 1),
    (p_campaign_id, 'Hidden experimentation on an undead is uncovered within the camp', 'LOW', 1),
    (p_campaign_id, 'Screams can be heard in the distance at all hours, preventing any rest', 'LOW', 2),
    (p_campaign_id, 'A hungry squad that resorted to foraging becomes badly ill', 'LOW', 2),
    (p_campaign_id, 'A deserter is caught before they can leave. Judgment must be passed', 'LOW', 3);
END;
$$;

-- ─── 3. annals_entries ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS annals_entries (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      uuid        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  phase_number     integer     NOT NULL,
  lorekeeper_notes text        NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  -- One entry per phase per campaign
  UNIQUE(campaign_id, phase_number)
);

-- Index for timeline queries
CREATE INDEX IF NOT EXISTS idx_annals_entries_campaign_id
  ON annals_entries (campaign_id, phase_number);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_annals_entries_updated_at
    BEFORE UPDATE ON annals_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE annals_entries ENABLE ROW LEVEL SECURITY;

-- Campaign members can read annals
CREATE POLICY "Members can read their campaign annals"
  ON annals_entries FOR SELECT
  USING (
    campaign_id IN (
      SELECT campaign_id FROM campaign_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Only Lorekeeper (and service role) can insert/update
-- Authenticated users with LOREKEEPER role can manage notes
CREATE POLICY "Lorekeepers can manage annals"
  ON annals_entries FOR ALL
  USING (
    campaign_id IN (
      SELECT campaign_id FROM campaign_memberships
      WHERE user_id = auth.uid() AND role = 'LOREKEEPER'
    )
  )
  WITH CHECK (
    campaign_id IN (
      SELECT campaign_id FROM campaign_memberships
      WHERE user_id = auth.uid() AND role = 'LOREKEEPER'
    )
  );
