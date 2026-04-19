# Sprint 6 Journal — Marshal Tools

## What was built
- **Marshal Dashboard**: A centralized hub for the Marshal role, featuring a morale overview with color-coded thresholds (HIGH/MEDIUM/LOW) and Legionnaire/Specialist counts.
- **Squad Management**: A detailed view of all six canonical squads (Ember Wolves, etc.) allowing the Marshal to name members, track ranks (Rookie/Soldier), and transfer personnel between squads (enforcing the 5-member limit).
- **Specialist Roster**: A comprehensive personnel file for Specialists (Heavy, Medic, etc.) with tracks for stress (0-9) and harm (Levels 1-3), XP tracking, and ability lists.
- **Mission Deployment**: A new state `AWAITING_MISSION_DEPLOYMENT` where the Marshal assigns Specialists and squads to missions selected by the Commander.
- **Engagement Roll Builder**: An interactive tool for calculating dice pools based on universal and mission-type questions, with automatic rolling for secondary missions.
- **Personnel Updates**: A post-mission resolution step (`AWAITING_PERSONNEL_UPDATE`) for applying harm, stress, and XP based on mission results.
- **Database Schema**: Added `squads`, `squad_members`, and `specialists` tables with appropriate RLS policies.
- **Seed Data**: Updated seed script to populate campaigns with realistic squad and specialist data.

## Key decisions
- **State Machine Expansion**: Inserted `AWAITING_PERSONNEL_UPDATE` and `AWAITING_MISSION_DEPLOYMENT` states to strictly enforce the Band of Blades phase sequence and ensure each role has a dedicated turn.
- **Relational Personnel Model**: Chose separate `squad_members` and `specialists` tables instead of JSONB arrays to allow for more granular queries and future expansion (e.g., individual member history).
- **Service Role for Mutations**: Adhered to the project convention of using the Supabase service role in server actions for all database writes, while using RLS for authenticated reads.

## Blockers & fixes
- **Build Errors**: Fixed missing type imports in `loadMissions` that caused build failures.
- **FSM Transitions**: Initially, the Commander action bypassed deployment. Fixed by updating the transition logic in `commander.ts` and adding the necessary intermediate states to `state-machine.ts`.

## Retrospective — Best Practices Review
- **Token efficiency**: Used parallel tool calls for research and implemented batch updates for personnel to minimize server roundtrips.
- **Long-term over short-term**: Implemented a robust state machine expansion instead of using boolean flags, which provides better scalability for future roles.
- **Accessibility & UX**: Ensured high-contrast status indicators and large touch targets for mobile-first squad management.
- **Mistakes to prevent**: Always verify that new types are imported in all loaders and actions to prevent build-time failures.
