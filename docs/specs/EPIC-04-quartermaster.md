# Epic 4 — Quartermaster Campaign Actions

**Branch:** `feature/epic-04-quartermaster`
**Milestone:** Sprint 4
**Goal:** The Quartermaster has a complete toolkit. All five campaign actions are fully playable (Liberty was completed in Sprint 3). The QM can run a full campaign phase end-to-end, including materiel tracking, boost mechanics, and non-Legion personnel management.

---

## Overview

The Quartermaster is the resource engine of the Legion. Each campaign phase, the QM chooses up to three campaign actions from a menu of five. Each action consumes a QM action slot and optionally a supply to boost it.

The five actions:
1. **Liberty** — Roll dice; on success, convert pressure to supply or morale. *(Done — Sprint 3)*
2. **Acquire Assets** — Send a Specialist to gather materiel. Quality depends on location assets rating.
3. **Rest and Recuperation** — Heal Legionnaires; Mercies can take extra wounds to help.
4. **Recruit** — Gain up to 5 Rookies for the Marshal to place in squads.
5. **Long-Term Project** — Work a clock toward a custom benefit; Specialists roll to fill segments.

After campaign actions, two parallel tracks run:
- **Step 5 (Spymaster):** Spy dispatch — already in the state machine as a placeholder.
- **Step 6 (QM):** Alchemist projects + Laborer auto-ticks.

---

## Issues

| # | Title | Priority |
|---|-------|----------|
| #54 | Implement Acquire Assets campaign action | P1 |
| #55 | Implement Rest and Recuperation campaign action | P1 |
| #56 | Implement Recruit campaign action | P1 |
| #57 | Implement Long-Term Project campaign action | P1 |
| #58 | Build materiel tracking dashboard for QM | P1 |
| #59 | Implement Alchemist projects (Step 6) | P1 |
| #60 | Add database tables for QM materiel and personnel | P1 |
| #61 | Implement location data and assets ratings | P2 |
| #62 | Sprint 4 Retrospective — Best Practices Review | P1 |

---

## Recommended Build Order

1. **#60 — Database tables first.** All actions write to these tables; they must exist before any action logic.
2. **#61 — Location data.** Acquire Assets depends on location assets ratings; build the data layer before the UI.
3. **#54 — Acquire Assets.** Most complex action (dice roll + quality tiers + multiple asset types). Get this right first; it establishes the pattern for other actions.
4. **#56 — Recruit.** Simplest action (no dice). Good to build early to flush out the boost UI pattern.
5. **#55 — R&R.** Medium complexity. Mercy assignment UI is the tricky part.
6. **#57 — Long-Term Project.** Requires LongTermProject table (#60). Uses LegionClock component.
7. **#59 — Alchemist projects.** Depends on Alchemist table (#60) and LongTermProject (#57). Last action step.
8. **#58 — Materiel dashboard.** Build last — it aggregates all the data the previous issues create.
9. **#62 — Retrospective.** Sprint closure.

---

## Data Model Changes

See issue #60 for the full migration. New tables:

- **long_term_projects** — Clocks with segments_filled, specialist, phase tracking
- **alchemists** — Name, corruption 0-8, status (ACTIVE/CORRUPTED/DEAD)
- **mercies** — Name, wounded boolean
- **laborers** — Count + current project assignment
- **siege_weapons** — Name, status
- **recruit_pool** — Per-phase recruit records for Marshal assignment

Existing `campaigns` table already has: `supply`, `morale`, `pressure`, `food_stores`, `horses`, `black_shot`, `religious_supplies`.

---

## Dice Mechanics

All dice rolls follow the Band of Blades standard resolution:

| Result | Outcome |
|--------|---------|
| 1–3 | Poor / 1 segment |
| 4–5 | Standard / 2 segments |
| 6 | Fine / 3 segments |
| Critical (two 6s+) | Exceptional / 5 segments |

The **boost mechanic** shifts the result up one tier. Multiple supply can be spent for multiple upgrades. Spending supply is optional and must be confirmed before the roll (player sees the choice, server executes both the spend and the roll atomically).

---

## Boost Pattern

All actions share the same boost pattern:

1. QM selects action
2. Screen shows: action description, effect at each quality tier, current supply count
3. "Boost?" toggle — if yes, supply is decremented and result tier shifts +1
4. Confirm → server action runs: roll dice, apply boost, write result, log, update state
5. Client shows result

This pattern must be consistent across all five actions.

---

## Location Data

Location data is stored as a typed constant in `src/lib/locations.ts` (not in the database — it's rulebook data that never changes in normal play). Each location entry:

```ts
interface Location {
  id: string;
  name: string;
  assets_rating: number;                 // base dice pool for Acquire Assets
  bonus_assets: Partial<Record<AssetType, number>>; // additional dice for specific types
  available_mission_types: MissionType[];
  description: string;
  // rulebook reference: pages 120-121
}
```

---

## State Machine Integration

The campaign phase state machine (Sprint 3) already has placeholder states for Steps 4–6. This epic replaces those placeholders with real implementations:

- `AWAITING_QM_CAMPAIGN_ACTIONS` — Step 4: QM picks 1-3 actions
- `AWAITING_SPY_DISPATCH` — Step 5: Spymaster (parallel, placeholder stays)
- `AWAITING_ALCHEMIST_PROJECTS` — Step 6: QM runs Alchemists/Laborers
- `AWAITING_ADVANCE` — Step 7+: Commander takes over

The Step 4 QM action selection screen (Sprint 3) already exists at `src/components/features/campaign/qm-campaign-actions.tsx`. This epic adds the individual action forms behind that selection screen.

---

## UI Principles

- **Decisions, not data entry.** Each action screen presents the choice, not a form. Show the quality tiers, the dice pool, what happens at each level. The player makes the call; the server executes.
- **Informed decisions.** Always show what resource is at stake, what area of the Legion is affected, and current relevant state (current morale, supply count, Specialist harm levels).
- **Boost is a first-class choice.** Never hide the boost option or make it feel like an afterthought. Supply is scarce — the decision to boost should feel weighty.
- **Corruption is dangerous.** Alchemist corruption clocks should use danger colours (legion-danger token) when > 5 segments. At 8 they are visually alarming.
