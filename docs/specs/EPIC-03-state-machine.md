# Epic 3: Campaign Phase State Machine

**Sprint:** 3
**Branch:** `feature/epic-03-state-machine`
**Goal:** The campaign phase state machine works end-to-end. Each role sees the correct view for the current phase. The Quartermaster can perform at least one campaign action (Liberty). The Commander can decide whether to advance.

---

## Scope

### In scope
- Finite state machine in `src/lib/state-machine.ts` with all 10 states and valid transitions
- `campaign_phase_state` column on the Campaign table
- `CampaignPhaseLog` table for full audit trail of all phase actions
- `BackAtCampScene` table with seed data (18 scenes, 6 per morale tier)
- Server action `transitionState(campaignId, newState)` with validation
- `PhaseProgressIndicator` component — all roles see the full pipeline
- Role-aware dashboards: show action UI on your turn, wait state otherwise
- Supabase real-time subscriptions for state changes
- GM "Start Campaign Phase" flow (entry point)
- Step 1 — Mission Resolution (GM): outcomes, casualties, morale update
- Step 2 — Back at Camp (Lorekeeper/GM): scene selection filtered by morale
- Step 3 — Time Passes (System + Commander): auto-apply time + pressure, food check
- Step 4 — QM Campaign Action Selection: action count based on morale, supply spend options
- Step 5 (Spy Dispatch) — placeholder pass-through (Spymaster)
- Step 6 (Laborers & Alchemists) — placeholder pass-through (QM)
- Step 7 — Commander Advance decision: stay/advance, pressure dice, time ticks, horses spend
- Step 8 (Mission Focus) — simplified selection of mission type (Commander)
- Step 9 (Mission Generation) — placeholder pass-through (GM)
- Step 10 (Mission Selection) — placeholder pass-through (Commander + Marshal)
- Liberty campaign action (QM): normal and boosted, morale/stress effects
- Unit tests for state machine transitions
- `docs/DATA_MODEL.md` updated with all new tables and columns

### Out of scope
- Other QM campaign actions (Acquire Assets, R&R, Recruit, Long-Term Project) — Epic 4
- Full Spymaster spy dispatch — Epic 7
- Full mission generation and selection — Epics 5, 6, 9
- Marshal and Lorekeeper full action screens — Epics 5, 8
- Notifications / push (Epic 10)
- Server-side dice for Back at Camp (no dice required in these steps)

---

## States & Transitions

```
null / PHASE_COMPLETE
  └─► AWAITING_MISSION_RESOLUTION   (GM starts phase)
        └─► AWAITING_BACK_AT_CAMP   (GM submits mission resolution)
              └─► TIME_PASSING       (Lorekeeper/GM submits scene)
                    └─► CAMPAIGN_ACTIONS   (System auto-applies time/pressure; Commander confirms)
                          └─► AWAITING_LABORERS_ALCHEMISTS   (QM + Spymaster both complete)
                                └─► AWAITING_ADVANCE          (QM/Lorekeeper complete)
                                      └─► AWAITING_MISSION_FOCUS   (Commander decides advance/stay)
                                            └─► AWAITING_MISSION_GENERATION   (Commander picks mission type)
                                                  └─► AWAITING_MISSION_SELECTION   (GM generates missions)
                                                        └─► PHASE_COMPLETE   (Commander + Marshal select mission)
```

**Special:** `CAMPAIGN_ACTIONS` is a parallel state — QM and Spymaster act simultaneously. The Campaign table tracks `qm_actions_complete` and `spymaster_actions_complete` separately. Transition to `AWAITING_LABORERS_ALCHEMISTS` only when both are `true`.

---

## Data Model Changes

### New columns on `campaigns`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `campaign_phase_state` | `text` | `null` | Current FSM state |
| `phase_number` | `integer` | `0` | Increments on each "Start Phase" |
| `qm_actions_complete` | `boolean` | `false` | Reset each phase |
| `spymaster_actions_complete` | `boolean` | `false` | Reset each phase |
| `current_morale` | `integer` | `8` | 0–12 |
| `current_pressure` | `integer` | `0` | Resets to 0 on advance |
| `current_location` | `text` | `'Barrak'` | Location name |

### New table: `campaign_phase_log`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `campaign_id` | `uuid` | FK → campaigns, RLS scope |
| `phase_number` | `integer` | Which campaign phase |
| `step` | `text` | FSM state at time of action |
| `role` | `text` | Role that performed the action |
| `action_type` | `text` | e.g. `PHASE_START`, `MISSION_RESOLVED`, `LIBERTY` |
| `details` | `jsonb` | Structured payload (morale change, dice result, etc.) |
| `created_at` | `timestamptz` | Default `now()` |

**RLS:** Campaign members can `SELECT` their own campaign's logs. Only service role can `INSERT`.

### New table: `back_at_camp_scenes`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `campaign_id` | `uuid` | FK → campaigns |
| `scene_text` | `text` | Full scene description |
| `morale_level` | `text` | `HIGH` / `MEDIUM` / `LOW` |
| `used` | `boolean` | Default `false` |
| `used_in_phase` | `integer` | Nullable — which phase it was used in |

Seeded with 18 scenes (6 per tier) when a campaign is created.

---

## Key Design Decisions

### State machine lives server-side
The FSM is defined in `src/lib/state-machine.ts` but all transitions go through a server action. Clients never set state directly — they call `transitionState()` which validates and applies. This prevents race conditions and ensures the log is always written.

### Parallel CAMPAIGN_ACTIONS handled via boolean flags
Rather than a sub-state machine, two boolean columns on the Campaign table (`qm_actions_complete`, `spymaster_actions_complete`) track parallel completion. The server checks both before allowing transition. Simple, auditable, easy to extend.

### Real-time via Supabase subscriptions
Dashboards subscribe to the `campaigns` table row for their campaign. When `campaign_phase_state` changes, all connected clients re-render without polling.

### Server-side dice only
All dice rolls (Step 7 advance pressure roll) use `crypto.getRandomValues()` in a server action. The result is written to `campaign_phase_log.details` before being returned to the client.

---

## File Structure

```
src/
  lib/
    state-machine.ts         # FSM states, transitions, validation
  server/
    actions/
      campaign-phase.ts      # transitionState, logCampaignAction, startPhase
      mission-resolution.ts  # Step 1 server action
      back-at-camp.ts        # Step 2 server action
      time-passes.ts         # Step 3 server action
      advance.ts             # Step 7 server action + dice roll
      liberty.ts             # Liberty campaign action
  components/
    features/
      campaign/
        phase-progress-indicator.tsx
        mission-resolution-form.tsx
        back-at-camp-scene-picker.tsx
        time-passes-summary.tsx
        qm-action-selector.tsx
        liberty-action.tsx
        advance-decision.tsx
        placeholder-step.tsx   # Generic pass-through for Steps 5, 6, 9, 10
  app/
    dashboard/
      gm/page.tsx
      commander/page.tsx
      marshal/page.tsx
      quartermaster/page.tsx
      lorekeeper/page.tsx
      spymaster/page.tsx
```

---

## Issues

| # | Title | Priority |
|---|-------|----------|
| #35 | Implement campaign phase state machine | P1 |
| #36 | Create CampaignPhaseLog table and logging | P1 |
| #37 | Build phase progress indicator component | P1 |
| #38 | Build role-aware dashboard routing | P1 |
| #39 | Implement "GM starts campaign phase" flow | P1 |
| #40 | Implement Step 1 — Mission Resolution (GM) | P1 |
| #41 | Implement Step 2 — Back at Camp (Lorekeeper/GM) | P2 |
| #42 | Implement Step 3 — Time Passes (System + Commander) | P1 |
| #43 | Implement Step 4 — QM Campaign Action Selection | P1 |
| #44 | Implement Liberty campaign action | P1 |
| #45 | Implement Commander Advance decision (Step 7) | P1 |
| #46 | Implement simplified Steps 5, 6, 8, 9, 10 (placeholder pass-through) | P2 |
| #47 | Add database tables for campaign phase data | P1 |
| #48 | Sprint 3 Retrospective — Best Practices Review | P1 |
