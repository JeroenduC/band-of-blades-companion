# Sprint 8 Journal — Lorekeeper Tools

**Epic:** Epic 8: Lorekeeper Tools
**Status:** Complete
**Date:** 2026-04-23

## 🎯 Achievements

The Lorekeeper role is now fully implemented with its sacred duties and mechanical tools.

### 1. Death Tracker & Memorial
- Implemented a persistent tracker on the Lorekeeper dashboard.
- Displayes a "List of the Fallen" with name, rank, and squad.
- Automatically counts deaths since the last Tale is told.
- Visual pulse/alert when 4+ deaths occur, signaling that a Tale is mandatory.

### 2. Back at Camp (Enhanced)
- Replaced the basic Sprint 3 picker with a rules-accurate version.
- Scenes now support `max_uses` (some scenes can happen 2-3 times).
- Selection is filtered by current morale level.
- Integrated food consumption and morale penalties if food is depleted.
- Transitions now correctly check for the "Tales of the Legion" condition.

### 3. Tales of the Legion
- Five canonical Tales implemented as data-driven constants.
- Sequential ordering for the first 5 Tales, then free choice.
- Lorekeeper records narrative answers to thematic prompts.
- Benefit selection with automatic mechanical effects (Morale, XP, Healing, next mission bonuses).
- Custom RPC helpers created for batch updates to specialists and alchemists.

### 4. The Annals
- Chronological mission log grouped by campaign phase.
- Displays location, missions, outcomes, and casualties.
- Lorekeepers can record and save in-character commentary for every phase.
- Persistent storage in the new `annals_entries` table.

## 🛠️ Technical Lessons

### Database Management
- **RPC for Batch Updates:** Using Postgres functions (RPCs) is much more efficient than multiple round-trips for updating all specialists or alchemists during a Tale benefit application.
- **JSONB for History:** `tales_told` as a JSONB array allows flexible tracking of which stories have been recounted without needing a heavy join table.

### State Machine
- Successfully inserted a conditional state (`AWAITING_TALES`) into the linear phase flow. 
- Learning: Linear state machines are easier to reason about, but branching logic inside the server action (`completeBackAtCamp`) is necessary when a step is only required under certain conditions.

### UI/UX
- **Tabs for Role Duty:** Splitting the Lorekeeper's dashboard into "Sacred Duty" (active tasks + memorial) and "The Annals" (historical record) provides a clear separation between active play and roleplay record-keeping.
- **Thematic Consistency:** Maintained the solemn, respectful tone for the memorial while keeping the UI functional and responsive.

## 🚀 Next Steps
- Epic 9: GM Dashboard enhancements.
- Ensuring the "next mission" bonus flags are actually utilized by the Engagement Roll builder and mission generation logic in future sprints.
