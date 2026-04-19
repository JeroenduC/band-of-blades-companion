# Sprint 7 Journal — Spymaster Tools

**Epic:** Epic 7 — Spymaster Tools
**Issues:** #92–#99
**Branch:** `feature/epic-07-spymaster`
**Agents:** Gemini CLI (primary)

---

## What Was Built

### 1. Spymaster Dashboard & Roster (#92)
- Built a dedicated Spymaster interface featuring a **Spy Roster** with `LegionCard` components.
- Each spy card displays name, rank (Trained/Master), status, specialty, and current assignment.
- Visual states for wounded (amber) and dead (greyscale) spies ensure clear legibility of the roster's health.

### 2. Simple Assignments (#93)
- Implemented the immediate, risk-free assignments:
  - **Recover:** Heals wounded spies.
  - **Interrogate:** Integrates with the Commander's intel question system, allowing the Spymaster to answer one question from any tier.
  - **Blackmail:** Provides a +1d bonus to the Quartermaster's next Acquire Assets roll.
  - **Help:** Provides a +1d bonus to the Quartermaster's next Long-Term Project roll.
- Assignment effects are recorded in the `CampaignPhaseLog`.

### 3. Long-Term Assignments (#94)
- Implemented 8-segment clock projects for powerful campaign effects:
  - **Augment Mission, Expand Network, Lay Trap, Recruit, Research.**
- Server-side dice mechanics based on spy rank and network upgrades:
  - **Critical:** 5 segments.
  - **6:** 3 segments.
  - **4/5:** 2 segments.
  - **1-3:** 1 segment and spy becomes wounded (or dies if already wounded).
- Visual progress tracking using `LegionClock`.

### 4. Spy Network Tree (#95)
- Created a visual tech tree component showing all network nodes and their connections.
- Unlocked nodes are highlighted in amber; dependencies are visualized via a vertical hierarchy.
- **Acquisition** unlocks the 3rd spy slot, and **Training** allows upgrading spies to Master rank.
- Integrated the upgrade selection UI, triggered by completed "Expand Network" assignments.

### 5. Parallel Step Integration (#96)
- Wired the Spymaster dispatch into the `CAMPAIGN_ACTIONS` state.
- Both the Spymaster and Quartermaster must complete their actions before the phase advances to Step 6.
- Updated the `PhaseProgressIndicator` to correctly group Step 5 as a parallel action.

### 6. Database Schema & Seeding (#97, #98)
- Added `spies`, `spy_networks`, and `spy_long_term_assignments` tables with RLS.
- Updated the data model and TypeScript types to support the new entities.
- Enhanced the seed script with realistic Spymaster data, including the six named spies from the rulebook.

---

## Best Practices & Lessons Learned

### Token Efficiency
- Parallelized database migrations and type updates to minimize turns.
- Used structured PowerShell scripts for batch issue creation to avoid context-heavy manual `gh` calls.

### Technical Integrity
- **Specialty Logic:** Hardcoded named spy specialties (e.g., Antoinette's auto-Master, Gale's wound immunity) directly into the server actions to ensure mechanical correctness without complex rule-engine overhead.
- **Parallel State Machine:** Re-used the existing `qm_actions_complete` and `spymaster_actions_complete` flags to ensure the state machine remains the single source of truth.

### Mistakes to Prevent
- **Schema Caching:** Remember to revalidate paths after server actions that update relational data across multiple tables (e.g., dispatching a spy and updating an LTA clock).
- **Type Safety:** Ensure `jsonb` fields like network upgrades are correctly cast to string arrays in loaders to prevent runtime errors.
