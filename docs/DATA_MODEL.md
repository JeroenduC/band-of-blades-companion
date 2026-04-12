# Data Model

Living document. Updated whenever a migration changes the schema.
Last updated: Sprint 3 (2026-04-12)

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
| `spymaster_actions_complete` | `boolean` | `false` | Spymaster has finished — reset each phase |
| `current_location` | `text` | `'Barrak'` | Current location on campaign map |
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
| `date` | `date` | Nullable — not all sessions are pre-scheduled |
| `status` | `text` | `PLANNED`, `IN_PROGRESS`, or `COMPLETE` |
| `prep_notes` | `text` | GM prep notes |
| `post_notes` | `text` | Post-session notes |
| `phase_number` | `integer` | Which campaign phase this session belongs to |
| `created_at` | `timestamptz` | |

**RLS:** Campaign members can read their own campaign's sessions.

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

**Action types:** `PHASE_START`, `MISSION_RESOLVED`, `BACK_AT_CAMP_SCENE_SELECTED`, `TIME_PASSED`, `LIBERTY`, `QM_ACTIONS_COMPLETE`, `SPYMASTER_ACTIONS_COMPLETE`, `LABORERS_ALCHEMISTS_COMPLETE`, `ADVANCE`, `STAY`, `MISSION_FOCUS_SELECTED`, `MISSION_GENERATION_COMPLETE`, `MISSION_SELECTED`, `PHASE_COMPLETE`

**RLS:** Campaign members can `SELECT` their own campaign's log. Only service role can `INSERT` (no authenticated INSERT policy).

**Index:** `(campaign_id, created_at)` for chronological log queries.

---

### `back_at_camp_scenes`

Pool of Back at Camp scenes for a campaign. Seeded with 18 scenes on campaign creation (6 per morale tier). Scenes are crossed off as they are used.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `campaign_id` | `uuid` | FK → `campaigns.id` ON DELETE CASCADE |
| `scene_text` | `text` | Full scene description |
| `morale_level` | `text` | `HIGH` (8+), `MEDIUM` (4–7), or `LOW` (3-) |
| `used` | `boolean` | Default `false` |
| `used_in_phase` | `integer` | Nullable — set to `phase_number` when used |

**RLS:** Campaign members can `SELECT`. Only service role can `INSERT`/`UPDATE`.

**Index:** `(campaign_id, morale_level)` for filtered scene queries.

---

## Migrations

| File | Date | Description |
|------|------|-------------|
| `supabase/migrations/20260412000000_sprint3_campaign_phase.sql` | 2026-04-12 | Add `qm_actions_complete`, `spymaster_actions_complete`, `current_location` to campaigns; create `campaign_phase_log`; create `back_at_camp_scenes`; add `seed_back_at_camp_scenes` SQL function |

> **Note:** Sprint 1 schema changes (profiles, campaigns, campaign_memberships, sessions, RLS policies) were applied directly in the Supabase dashboard and are not captured in migration files. Future changes must be tracked here.

---

## State Machine

The `campaign_phase_state` column is governed by the FSM in `src/lib/state-machine.ts`. Valid states and transitions are documented there. Never update this column directly — always call `transitionState()` in `src/server/actions/campaign-phase.ts`.
