# Data Model

Living document. Updated whenever a migration changes the schema.
Last updated: Sprint 8 (2026-04-23)

---

## Tables

### `profiles`

Synced from Supabase Auth. One row per registered user.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK — matches `auth.users.id` |
| `display_name` | `text` | Chosen by the user on sign-up |
| `created_at` | `timestamptz` | Default `now()` |

**RLS:** Users can read and update their own row only.

---

### `campaigns`

One row per campaign. All campaign-wide state lives here.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | `uuid` | `gen_random_uuid()` | PK |
| `name` | `text` | — | Campaign name |
| `invite_code` | `text` | — | Unique 8-char code for joining |
| `current_phase` | `text` | `'CAMPAIGN'` | `MISSION` or `CAMPAIGN` |
| `campaign_phase_state` | `text` | `null` | Current FSM state (see state machine) |
| `phase_number` | `integer` | `0` | Increments on each phase start |
| `morale` | `integer` | `8` | Legion morale (0–12) |
| `pressure` | `integer` | `0` | Resets to 0 on advance |
| `intel` | `integer` | `0` | Intel resource |
| `supply` | `integer` | `0` | Supply resource |
| `time_clock_1` | `integer` | `0` | Ticks on Time Clock 1 (max 10) |
| `time_clock_2` | `integer` | `0` | Ticks on Time Clock 2 (max 10) |
| `time_clock_3` | `integer` | `0` | Ticks on Time Clock 3 (max 10) |
| `food_uses` | `integer` | `0` | Food uses remaining |
| `horse_uses` | `integer` | `0` | Horse uses remaining |
| `black_shot_uses` | `integer` | `0` | Black shot uses remaining |
| `religious_supply_uses` | `integer` | `0` | Religious supply uses remaining |
| `supply_carts` | `integer` | `0` | Supply carts |
| `qm_actions_complete` | `boolean` | `false` | QM has finished CAMPAIGN_ACTIONS step — reset each phase |
| `spymaster_actions_complete` | `boolean` | `false` | Spymaster has finished CAMPAIGN_ACTIONS step — reset each phase |
| `current_location` | `text` | `'Barrak'` | Current location on campaign map |
| `deaths_since_last_tale` | `integer` | `0` | Ticks on the Lorekeeper's death counter |
| `tales_told` | `jsonb` | `[]` | Array of Tale IDs that have been told |
| `chosen_broken` | `text[]` | `[]` | Names of the two Broken active in this campaign |
| `created_at` | `timestamptz` | `now()` | |

**RLS:** Campaign members can read their own campaign. Only service role writes (all mutations via server actions).

---

### `campaign_memberships`

Join table between users and campaigns. Also carries role and rank.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `profiles.id` |
| `campaign_id` | `uuid` | FK → `campaigns.id` |
| `role` | `text` | `null` until GM assigns. One of: `GM`, `COMMANDER`, `MARSHAL`, `QUARTERMASTER`, `LOREKEEPER`, `SPYMASTER`, `SOLDIER` |
| `rank` | `text` | `null` until GM assigns. `PRIMARY` or `DEPUTY` |
| `assigned_at` | `timestamptz` | When the GM assigned this role |

**Unique constraint:** `(campaign_id, role, rank)` — one PRIMARY per role per campaign.

**RLS:** Members can read memberships for their own campaign.

---

### `sessions`

Tracks individual play sessions within a campaign.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `campaign_id` | `uuid` | FK → `campaigns.id` |
| `session_number` | `integer` | Sequential within the campaign |
| `title` | `text` | Optional session title |
| `date` | `date` | Nullable — not all sessions are pre-scheduled |
| `status` | `text` | `PLANNED`, `IN_PROGRESS`, or `COMPLETE` |
| `prep_notes` | `text` | GM prep notes |
| `post_notes` | `text` | Post-session notes |
| `linked_phases` | `integer[]` | Array of campaign phase numbers covered by this session |
| `phase_number` | `integer` | (DEPRECATED by linked_phases) |
| `created_at` | `timestamptz` | |

**RLS:** Campaign members can read their own campaign's sessions.

---

### `broken_advances`

Tracks the progression and unlocked abilities of the campaign's Broken.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `campaign_id` | `uuid` | FK → `campaigns.id` ON DELETE CASCADE |
| `broken_name` | `text` | `BLIGHTER`, `BREAKER`, or `RENDER` |
| `ability_name` | `text` | Name of the ability |
| `unlocked` | `boolean` | Whether the ability is currently active |
| `unlocked_at_phase` | `integer` | Phase number when it was unlocked |
| `notes` | `text` | Narrative or mechanical notes |
| `created_at` | `timestamptz` | |

**RLS:** Campaign members can read. Service role only for writes.

---

### `campaign_phase_log`

Append-only audit trail of all campaign phase actions. Never updated, never deleted.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `campaign_id` | `uuid` | FK → `campaigns.id` ON DELETE CASCADE |
| `phase_number` | `integer` | Which phase this action occurred in |
| `step` | `text` | FSM state at the time of the action |
| `role` | `text` | Role that performed the action, or `SYSTEM` |
| `action_type` | `text` | See action types below |
| `details` | `jsonb` | Structured payload (morale delta, dice result, etc.) |
| `created_at` | `timestamptz` | Default `now()` |

**Action types:** `PHASE_START`, `MISSION_RESOLVED`, `BACK_AT_CAMP_SCENE_SELECTED`, `TIME_PASSED`, `LIBERTY`, `QM_ACTIONS_COMPLETE`, `SPY_DISPATCHED`, `SPYMASTER_ACTIONS_COMPLETE`, `LABORERS_ALCHEMISTS_COMPLETE`, `ADVANCE`, `STAY`, `MISSION_FOCUS_SELECTED`, `MISSION_GENERATION_COMPLETE`, `MISSION_SELECTED`, `PHASE_COMPLETE`, `MEMBER_REMOVED`, `ACQUIRE_ASSETS`, `REST_AND_RECUPERATION`, `RECRUIT`, `LONG_TERM_PROJECT`, `ALCHEMIST_PROJECT`, `LABORER_TICK`, `INTEL_QUESTIONS_SUBMITTED`, `PERSONNEL_DEPLOYED`, `ENGAGEMENT_ROLL`, `PERSONNEL_UPDATED`, `TALE_TOLD`

**RLS:** Campaign members can `SELECT` their own campaign's log. Only service role can `INSERT` (no authenticated INSERT policy).

**Index:** `(campaign_id, created_at)` for chronological log queries.

---

### `back_at_camp_scenes`

Pool of Back at Camp scenes for a campaign. Seeded with 18 scenes on campaign creation (6 per morale tier). Scenes are crossed off as they are used.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | `uuid` | `gen_random_uuid()` | PK |
| `campaign_id` | `uuid` | — | FK → `campaigns.id` ON DELETE CASCADE |
| `scene_text` | `text` | — | Full scene description |
| `morale_level` | `text` | — | `HIGH` (8+), `MEDIUM` (4–7), or `LOW` (3-) |
| `used` | `boolean` | `false` | Historically used (DEPRECATED by times_used) |
| `used_in_phase` | `integer` | `null` | Nullable — set to `phase_number` when used |
| `max_uses` | `integer` | `1` | Max number of times this scene can occur |
| `times_used` | `integer` | `0` | Current number of times this scene has occurred |

**RLS:** Campaign members can `SELECT`. Only service role can `INSERT`/`UPDATE`.

**Index:** `(campaign_id, morale_level)` for filtered scene queries.

---

### `annals_entries`

The Lorekeeper's in-character records of campaign phases.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | `uuid` | `gen_random_uuid()` | PK |
| `campaign_id` | `uuid` | — | FK → `campaigns.id` ON DELETE CASCADE |
| `phase_number` | `integer` | — | Which phase this entry belongs to |
| `lorekeeper_notes` | `text` | `''` | Free-text narrative notes |
| `created_at` | `timestamptz` | `now()` | |
| `updated_at` | `timestamptz` | `now()` | |

**RLS:** Campaign members can read. Only Lorekeepers can write.

---

### `long_term_projects`

Custom campaign clocks. QM works on these via the Long-Term Project action; Laborers auto-tick them in Step 6.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `campaign_id` | `uuid` | FK → `campaigns.id` ON DELETE CASCADE |
| `name` | `text` | Project name |
| `description` | `text` | What completing this project does |
| `clock_size` | `integer` | 4–12 segments |
| `segments_filled` | `integer` | 0 to clock_size |
| `phase_last_worked` | `integer` | Prevents working the same project twice per phase |
| `completed_at` | `timestamptz` | Nullable — set when segments_filled reaches clock_size |
| `created_at` | `timestamptz` | |

**RLS:** Campaign members can read. Service role only for writes.

---

### `alchemists`

Non-Legion personnel. Roll for effect and corruption in Step 6.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `campaign_id` | `uuid` | FK → `campaigns.id` ON DELETE CASCADE |
| `name` | `text` | |
| `corruption` | `integer` | 0–8. At 8: status becomes CORRUPTED |
| `status` | `text` | `ACTIVE`, `CORRUPTED`, or `DEAD` |
| `created_at` | `timestamptz` | |

**RLS:** Campaign members can read. Service role only for writes.

---

### `mercies`

Non-Legion healers. Used in R&R (Step 4) to give Specialists extra healing ticks.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `campaign_id` | `uuid` | FK → `campaigns.id` ON DELETE CASCADE |
| `name` | `text` | |
| `wounded` | `boolean` | `true` if assigned during R&R. Heals automatically if unused. |
| `created_at` | `timestamptz` | |

**RLS:** Campaign members can read. Service role only for writes.

---

### `laborers`

One row per campaign (unique constraint). Count + current project assignment for Step 6.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `campaign_id` | `uuid` | FK → `campaigns.id` ON DELETE CASCADE. UNIQUE. |
| `count` | `integer` | Number of Laborer units |
| `current_project_id` | `uuid` | FK → `long_term_projects.id`. Nullable. Set during Step 6, reset after. |

**RLS:** Campaign members can read. Service role only for writes.

---

### `siege_weapons`

Siege weapons available to the Legion.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `campaign_id` | `uuid` | FK → `campaigns.id` ON DELETE CASCADE |
| `name` | `text` | |
| `status` | `text` | `AVAILABLE`, `DEPLOYED`, or `DESTROYED` |
| `created_at` | `timestamptz` | |

**RLS:** Campaign members can read. Service role only for writes.

---

### `recruit_pool`

Created by the QM Recruit action. One row per Recruit action taken per phase. The Marshal reads this to assign new soldiers to squads.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `campaign_id` | `uuid` | FK → `campaigns.id` ON DELETE CASCADE |
| `phase_number` | `integer` | Phase in which these recruits arrived |
| `rookies` | `integer` | Count of Rookies in this batch |
| `soldiers` | `integer` | Count of Soldiers (from boosted Recruit) |
| `assigned` | `boolean` | Set to `true` once Marshal has placed them |
| `created_at` | `timestamptz` | |

**RLS:** Campaign members can read. Service role only for writes.

---

### `squads`

The six canonical squads of the Legion.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `campaign_id` | `uuid` | FK → `campaigns.id` ON DELETE CASCADE |
| `name` | `text` | e.g., "Ember Wolves" |
| `motto` | `text` | e.g., "First Into the Fray" |
| `type` | `text` | `ROOKIE`, `SOLDIER`, or `ELITE` |
| `created_at` | `timestamptz` | |

**RLS:** Campaign members can read. Service role only for writes.

---

### `squad_members`

Individual Rookies and Soldiers assigned to squads.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `squad_id` | `uuid` | FK → `squads.id` ON DELETE CASCADE |
| `name` | `text` | |
| `heritage` | `text` | |
| `rank` | `text` | `ROOKIE` or `SOLDIER` |
| `status` | `text` | `ALIVE`, `WOUNDED`, or `DEAD` |
| `harm` | `integer` | Current harm level |
| `stress` | `integer` | Current stress |
| `xp` | `integer` | Current XP |
| `created_at` | `timestamptz` | |

**RLS:** Campaign members can read. Service role only for writes.

---

### `specialists`

The Legion's elite soldiers.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `campaign_id` | `uuid` | FK → `campaigns.id` ON DELETE CASCADE |
| `name` | `text` | |
| `class` | `text` | `HEAVY`, `MEDIC`, `OFFICER`, `SCOUT`, `SNIPER` |
| `heritage` | `text` | |
| `stress` | `integer` | 0–9 |
| `harm_level_1_a` | `text` | Level 1 harm description |
| `harm_level_1_b` | `text` | Level 1 harm description |
| `harm_level_2_a` | `text` | Level 2 harm description |
| `harm_level_2_b` | `text` | Level 2 harm description |
| `harm_level_3` | `text` | Level 3 harm description |
| `healing_ticks` | `integer` | 0–4 per harm row |
| `xp` | `integer` | Current XP |
| `abilities` | `text[]` | List of acquired special abilities |
| `status` | `text` | `AVAILABLE`, `DEPLOYED`, `DEAD`, `RETIRED` |
| `created_at` | `timestamptz` | |

**RLS:** Campaign members can read. Service role only for writes.

---

### `spies`

The Spymaster's field agents.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `campaign_id` | `uuid` | FK → `campaigns.id` ON DELETE CASCADE |
| `name` | `text` | |
| `rank` | `text` | `TRAINED` or `MASTER` |
| `status` | `text` | `AVAILABLE`, `ON_ASSIGNMENT`, `WOUNDED`, or `DEAD` |
| `specialty` | `text` | Roleplay description or mechanical bonus |
| `current_assignment` | `text` | `NONE`, `RECOVER`, `INTERROGATE`, `BLACKMAIL`, `HELP`, `AUGMENT`, `EXPAND`, `LAY_TRAP`, `RECRUIT`, `RESEARCH` |
| `assignment_clock` | `integer` | 0–8 segments for long-term assignments (DEPRECATED) |
| `long_term_assignment_id` | `uuid` | FK → `spy_long_term_assignments.id` |
| `last_phase_worked` | `integer` | |
| `created_at` | `timestamptz` | |

**RLS:** Campaign members can read. Service role only for writes.

---

### `spy_networks`

The tech tree of spy capabilities for a campaign.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `campaign_id` | `uuid` | FK → `campaigns.id` ON DELETE CASCADE. UNIQUE. |
| `upgrades` | `jsonb` | Array of unlocked upgrade names (e.g., `["Acquisition", "Analysts"]`) |
| `created_at` | `timestamptz` | |

**RLS:** Campaign members can read. Service role only for writes.

---

### `spy_long_term_assignments`

Long-term assignments for spies (8-segment clocks).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `campaign_id` | `uuid` | FK → `campaigns.id` ON DELETE CASCADE |
| `type` | `text` | `AUGMENT`, `EXPAND`, `LAY_TRAP`, `RECRUIT`, `RESEARCH` |
| `name` | `text` | |
| `description` | `text` | |
| `clock_segments` | `integer` | Usually 8 |
| `clock_filled` | `integer` | 0-8 |
| `is_completed` | `boolean` | |
| `created_at` | `timestamptz` | |

**RLS:** Campaign members can read. Service role only for writes.

---

### `missions`

Generated by the GM each campaign phase and selected by the Commander.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | `uuid` | `gen_random_uuid()` | PK |
| `campaign_id` | `uuid` | — | FK → `campaigns.id` ON DELETE CASCADE |
| `phase_number` | `integer` | — | Which phase this mission was generated in |
| `name` | `text` | — | Mission name |
| `type` | `text` | — | `ASSAULT`, `RECON`, `RELIGIOUS`, `SUPPLY`, or `SPECIAL` |
| `objective` | `text` | — | Brief summary of objectives |
| `rewards` | `jsonb` | `{}` | Key-value pairs of rewards (morale, intel, etc.) |
| `penalties` | `jsonb` | `{}` | Key-value pairs of penalties |
| `threat_level` | `integer` | — | 1 to 4 |
| `status` | `text` | `'GENERATED'` | `GENERATED`, `PRIMARY`, `SECONDARY`, or `FAILED` |
| `created_at` | `timestamptz` | `now()` | |

**RLS:** Campaign members can read. Service role only for writes.

---

## Migrations

| File | Date | Description |
|------|------|-------------|
| `supabase/migrations/20260412000000_sprint3_campaign_phase.sql` | 2026-04-12 | Add `qm_actions_complete`, `spymaster_actions_complete`, `current_location` to campaigns; create `campaign_phase_log`; create `back_at_camp_scenes`; add `seed_back_at_camp_scenes` SQL function |
| `supabase/migrations/20260414000000_sprint4_qm_materiel.sql` | 2026-04-14 | Create `long_term_projects`, `alchemists`, `mercies`, `laborers`, `siege_weapons`, `recruit_pool` with RLS |
| `supabase/migrations/20260418000000_sprint5_mission_table.sql` | 2026-04-18 | Create `missions` table with RLS |
| `supabase/migrations/20260420000000_sprint6_marshal_personnel.sql` | 2026-04-20 | Create `squads`, `squad_members`, and `specialists` tables with RLS |
| `supabase/migrations/20260421000000_sprint7_spymaster.sql` | 2026-04-21 | Create `spies` and `spy_networks` tables with RLS |
| `supabase/migrations/20260421000001_sprint7_spymaster_longterm.sql` | 2026-04-21 | Create `spy_long_term_assignments` table with RLS |
| `supabase/migrations/20260423000000_sprint8_lorekeeper.sql` | 2026-04-23 | Add Lorekeeper tracking fields, bonus flags, RPC helpers, and `annals_entries` table with RLS |
| `supabase/migrations/20260426000000_sprint9_gm_tables.sql` | 2026-04-26 | Create `broken_advances` table; update `campaigns` and `sessions` tables with RLS |

> **Note:** Sprint 1 schema changes (profiles, campaigns, campaign_memberships, sessions, RLS policies) were applied directly in the Supabase dashboard and are not captured in migration files. Future changes must be tracked here.

---

## State Machine

The `campaign_phase_state` column is governed by the FSM in `src/lib/state-machine.ts`. Valid states and transitions are documented there. Never update this column directly — always call `transitionState()` in `src/server/actions/campaign-phase.ts`.
