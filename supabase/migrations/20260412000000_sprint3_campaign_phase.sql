-- Sprint 3: Campaign phase state machine database changes
-- Apply in Supabase SQL Editor or via supabase db push.
--
-- Changes:
--   1. New columns on campaigns (phase tracking + parallel action flags)
--   2. New table: campaign_phase_log (audit trail)
--   3. New table: back_at_camp_scenes (scene pool per campaign)

-- ─── 1. Campaign table additions ─────────────────────────────────────────────

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS qm_actions_complete       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS spymaster_actions_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_location           text    NOT NULL DEFAULT 'Barrak';

-- ─── 2. campaign_phase_log ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaign_phase_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  uuid        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  phase_number integer     NOT NULL,
  step         text        NOT NULL,
  role         text        NOT NULL,
  action_type  text        NOT NULL,
  details      jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Index for the most common query pattern: all log entries for a campaign in order
CREATE INDEX IF NOT EXISTS idx_campaign_phase_log_campaign_id
  ON campaign_phase_log (campaign_id, created_at);

-- RLS
ALTER TABLE campaign_phase_log ENABLE ROW LEVEL SECURITY;

-- Campaign members can read their own campaign's log
CREATE POLICY "Members can read their campaign log"
  ON campaign_phase_log FOR SELECT
  USING (
    campaign_id IN (
      SELECT campaign_id FROM campaign_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Only the service role can insert log entries (enforced by not granting INSERT to anon/authenticated)
-- No INSERT policy for authenticated — all writes go through server actions using the service client.

-- ─── 3. back_at_camp_scenes ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS back_at_camp_scenes (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  scene_text    text    NOT NULL,
  morale_level  text    NOT NULL CHECK (morale_level IN ('HIGH', 'MEDIUM', 'LOW')),
  used          boolean NOT NULL DEFAULT false,
  used_in_phase integer
);

CREATE INDEX IF NOT EXISTS idx_back_at_camp_scenes_campaign_id
  ON back_at_camp_scenes (campaign_id, morale_level);

-- RLS
ALTER TABLE back_at_camp_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their campaign scenes"
  ON back_at_camp_scenes FOR SELECT
  USING (
    campaign_id IN (
      SELECT campaign_id FROM campaign_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Service role only for INSERT/UPDATE (no policy = no access for authenticated role)

-- ─── 4. Seed function: insert scenes when a campaign is created ───────────────
--
-- Call this function from the application after creating a campaign:
--   SELECT seed_back_at_camp_scenes('<campaign_id>');
--
-- The 18 scenes below are paraphrased from the Band of Blades rulebook.
-- They are divided into 6 per morale tier (HIGH/MEDIUM/LOW).

CREATE OR REPLACE FUNCTION seed_back_at_camp_scenes(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO back_at_camp_scenes (campaign_id, scene_text, morale_level) VALUES
    -- HIGH morale scenes (morale 8+)
    (p_campaign_id, 'A Legionnaire produces a battered instrument and plays through the night. Others gather, sing old songs, and for a few hours forget the road ahead.', 'HIGH'),
    (p_campaign_id, 'The camp cooks manage something almost edible. Jokes are cracked, old victories recalled. The fire burns warm.', 'HIGH'),
    (p_campaign_id, 'Two veterans settle an old dispute through a friendly wrestling match. The whole camp turns out to watch and wager.', 'HIGH'),
    (p_campaign_id, 'A young soldier writes a letter home. Others help find the right words. It is passed around and read aloud.', 'HIGH'),
    (p_campaign_id, 'A quiet evening of dice and cards. No quarrels tonight — just the clatter of bones and the clink of small debts.', 'HIGH'),
    (p_campaign_id, 'Someone finds a cache of decent wine in an abandoned farmhouse. The officers look the other way.', 'HIGH'),

    -- MEDIUM morale scenes (morale 4–7)
    (p_campaign_id, 'Legionnaires clean their gear in silence. There is comfort in the ritual, even if no one says so.', 'MEDIUM'),
    (p_campaign_id, 'A small shrine is erected for the fallen. Tokens are left: a coin, a button, a folded scrap of paper.', 'MEDIUM'),
    (p_campaign_id, 'Two soldiers argue bitterly over nothing in particular. A sergeant intervenes. The matter is dropped, unresolved.', 'MEDIUM'),
    (p_campaign_id, 'Watch rotations are doubled. No one complains — no one wants to be the one who missed something.', 'MEDIUM'),
    (p_campaign_id, 'A Legionnaire tends a minor wound that has started to turn. They say nothing, but others notice.', 'MEDIUM'),
    (p_campaign_id, 'The camp is quiet. People sleep when they can. There is little to say.', 'MEDIUM'),

    -- LOW morale scenes (morale 3-)
    (p_campaign_id, 'A desertion is discovered at dawn. The name is not spoken aloud. The gap in the ranks says enough.', 'LOW'),
    (p_campaign_id, 'A heated argument nearly comes to blows. Officers struggle to keep order. The camp feels fragile.', 'LOW'),
    (p_campaign_id, 'Rations are cut again. Soldiers eat in silence, counting what is left. No one mentions home.', 'LOW'),
    (p_campaign_id, 'Someone weeps in the dark. Others pretend not to hear.', 'LOW'),
    (p_campaign_id, 'Rumours move through camp: the road ahead is blocked, the Legion is forgotten, command has abandoned them.', 'LOW'),
    (p_campaign_id, 'The fires are kept low. Faces are hard to read. The Legion endures, but only just.', 'LOW');
END;
$$;
