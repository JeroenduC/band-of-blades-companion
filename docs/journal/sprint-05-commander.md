# Sprint 5 Journal — Commander Tools

**Epic:** Epic 5 — Commander Tools
**Issues:** #70–#79
**Branch:** `feature/epic-05-commander`
**Agents:** Gemini CLI (easy issues) + Claude Code (hard issues)

---

## What Was Built

### Easy issues (Gemini CLI)
- **#77 — Missions DB table**: `supabase/migrations/20260418000000_sprint5_mission_table.sql` — `missions` table with `mission_type` and `mission_status` enums, RLS, FK to campaigns.
- **#78 — Seed script update**: Extended `scripts/seed-test-users.ts` to seed 3 sample missions per campaign (RELIGIOUS, SUPPLY, ASSAULT) in GENERATED status.
- **#70 — Commander War Table**: `CommanderWarTable` component — always-visible stats header showing Time I/II/III clocks, Location, Morale, Pressure (red if ≥ 3), Intel.
- **#73 — Mission Focus**: `MissionFocusForm` + `selectMissionFocus` server action — Commander picks ASSAULT/RECON/SUPPLY/RELIGIOUS focus; available types filtered by current location.

### Hard issues (Claude Code)
- **#71 — Advance Decision rewrite**: Added `connections: string[]` to all 14 locations in `locations.ts` per BoB pp.120-121. Rewrote `makeAdvanceDecision` server action: path validation, server-side pressure dice (`rollDice`), `ticksFromDice`, `applyTimeClockTicks`, broken advance detection. Rewrote `AdvanceDecisionForm`: path selector for fork locations, dice result panel with worst die highlighted, `router.refresh()` Continue flow.
- **#72 — Location Map**: SVG node graph of all 14 Aldermark locations. Hardcoded positions per BoB map layout. Current location (amber), reachable nodes (green), others (muted). Click-to-reveal detail panel. SR-only `<ul>` list for accessibility.
- **#75 — Intel Tracking**: `INTEL_TIERS` typed constants from BoB pp.122-123. `submitIntelQuestions` server action (logs to phase log, no state change). `IntelQuestionsForm` with tier grouping, skip option. Shown as sub-step 1 of mission selection.
- **#76 — GM Mission Generation**: `MissionGenerationForm` with 2-3 variable mission cards (add/remove), type-based default rewards/penalties, `generateMissions` server action saves to missions table and transitions to AWAITING_MISSION_SELECTION. GM dashboard updated with phase log query for commander focus.
- **#74 — Mission Selection**: `MissionSelectionCards` — primary/secondary designation toggle buttons, auto-fail summary for 3rd mission, per-mission intel spending. `selectMissions` server action updates mission statuses, deducts intel, transitions to PHASE_COMPLETE.

---

## Key Decisions

### Intel questions as a sub-step, not a FSM state
The issue spec said "between Steps 9 and 10" for intel questions. Rather than adding a new `AWAITING_INTEL_QUESTIONS` state to the FSM, intel questions were implemented as a skippable sub-step within `AWAITING_MISSION_SELECTION`. This avoids touching the state machine for a feature that is purely informational (questions are logged, not acted on by the system). The `MissionSelectionStep` wrapper component manages the local sub-step flow.

### SVG node graph for the map
A fully interactive graph library (e.g., react-flow) would have added a large dependency. Instead, the map uses a hand-crafted SVG with hardcoded positions derived from the BoB paper map. This keeps the bundle small and gives exact visual control. Positions are defined as a single `NODE_POSITIONS` record — easy to adjust for any layout tweaks.

### `campaign-phase.ts` is now 2,503 lines
The file is approaching the point where it should be split. Not done this sprint to avoid scope creep, but flagged as tech debt. The natural split is by role: `commander-actions.ts`, `gm-actions.ts`, `qm-actions.ts`.

---

## Two-Agent Workflow Evaluation

### What worked well
- **Clean handoff**: No merge conflicts. Gemini pushed 4 commits; Claude Code pulled without issues and built on top cleanly.
- **Categorisation was accurate**: All 4 EASY issues were genuinely single-file or pattern-following tasks. All 5 HARD issues required multi-file coordination or game logic.
- **Design system compliance**: Gemini's components used the correct design tokens, `LegionCard` wrappers, and followed the mobile-first layout rules. No rework needed.
- **No forbidden files touched**: Gemini did not touch the state machine, CLAUDE.md, or server-side dice logic.
- **Token savings**: Gemini handled ~40% of the implementation work (4 of 9 code issues) at zero Claude token cost.

### What was imperfect
- **`useTransition` vs `useActionState`**: Gemini used `useTransition` + a direct server action call in `MissionFocusForm`, whereas the project standard is `useActionState`. This works because `selectMissionFocus` always redirects on success, so error state is never needed. But it's inconsistent with the rest of the app. Rule added to GEMINI.md.
- **Context loss mid-sprint**: Claude Code's session ran out of context mid-#71. The session summary system recovered the state accurately (no work was lost), but the user had to manually prompt continuation. This is expected for a sprint this large.
- **`PlaceholderStep` import left in GmDashboard**: After Gemini created the GM page placeholder, Claude Code removed it. Import cleanup worked correctly.

### Potential protocol improvements
1. Add explicit guidance that Gemini should use `useActionState` for all new Client Components with server actions (not `useTransition`), unless the action always redirects.
2. When Gemini creates a server action that also needs a Client Component, it should flag whether the action can return errors — if yes, `useActionState` is required.

---

## Blockers & Fixes

- **Stale `PlaceholderStep` reference after Gemini's commit**: The `GmDashboardPage` imported `PlaceholderStep` from Gemini's implementation. Claude Code replaced this with `MissionGenerationForm` in #76 — no conflict since they were on the same branch sequentially.
- **`worst_die` highlighting** uses `result.dice.indexOf(d) === i` to mark exactly the first occurrence of the worst value. This is correct but subtle — only one die is highlighted even if multiple share the worst value, which is the right UX.
- **`applyTimeClockTicks` remaining calculation**: Uses `remaining -= (c1 - clock1)` where `clock1` is the original value. Works correctly as written but is fragile: if c1 starts > 0, the delta `c1 - clock1` correctly captures how much was added. Noted as something to unit-test.

---

## Retrospective Findings

### Token efficiency
- **Saved**: The two-agent split was highly effective this sprint. Gemini's 4 easy issues were mechanical enough that no architectural oversight was needed. The context summary system also worked well — the resume after context loss was seamless.
- **Wasted**: The `campaign-phase.ts` file at 2,500+ lines means every related task requires reading a large file. Splitting it by role in Sprint 6 prep would reduce per-task context overhead significantly.

### Long-term over short-term
- **Intel as sub-step instead of new state**: The choice not to add `AWAITING_INTEL_QUESTIONS` to the FSM saves complexity now. If this causes issues later (e.g., the GM needs to see which questions were asked before generating missions), it can be moved to a proper state. Not a shortcut — a deliberate scope choice.
- **Hardcoded SVG positions**: The map layout is brittle if locations ever change. However, locations are static game data from the rulebook; they will not change. The hardcoded positions are the correct long-term approach.

### Accessibility & UX
- **SVG keyboard focus visibility**: The location map `<g>` nodes are focusable via `tabIndex={0}` but the focus ring circle has `opacity={0}` and no CSS to make it visible on focus. SVG `<g>` elements don't support CSS `outline`. The fix is to add `g:focus-visible circle.focus-ring { opacity: 1; }` to global styles. Flagged for Sprint 6 cleanup.
- **Radio-as-styled-button pattern**: Used in three places this sprint (mission type selector in gen form, threat level selector, intel spending). The pattern (SR-only radio, styled label with `aria-pressed`-equivalent visual) is consistent and accessible.
- **`aria-pressed` on designation buttons**: Used correctly on the primary/secondary toggle buttons in `MissionSelectionCards`.

### Mistakes to prevent
- **`useTransition` in Gemini-authored client components**: See note above. Added rule to GEMINI.md.
- **Always check SVG focus visibility**: Any interactive SVG element added in the future must have a visible focus indicator. The global CSS rule `g:focus-visible circle.focus-ring { opacity: 1; }` should be added.
