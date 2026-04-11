# Band of Blades — Legion Phase Companion

## Project Brief v1.3

*Living document. To be committed to the project repository.*
*Licensing: To be decided (see ADR-004)*

---

## 1. Vision & Goals

### 1.1 What We Are Building

A web application that digitises the campaign phase (also known as the Legion phase) of the tabletop RPG Band of Blades. The app replaces the manual, paper-based bookkeeping that currently happens at the end of each session with an asynchronous, role-based workflow that players complete between sessions on any device.

### 1.2 Why

The campaign phase involves sequential, interdependent actions across five player roles plus the GM. At the table, this process is slow, error-prone, and drains the energy built up during the mission. By moving it to an async digital workflow, we achieve three things:

1. Sessions end on a high note, with the dramatic conclusion of the mission.
2. Players engage with the campaign phase at their own pace, on their own time, on their own device.
3. The mechanical bookkeeping is handled by the system, freeing players to focus on *decisions* rather than arithmetic.

### 1.3 Design Philosophy

- **Feel, not function, comes first.** The app should evoke the mood of Band of Blades: dark, urgent, militaristic, but with warmth. Worn parchment, firelight, ink. Not a spreadsheet. Not a corporate dashboard.
- **Decisions, not data entry.** Every screen should present the player with a meaningful choice, not a form to fill in. The system handles the consequences.
- **Informed decisions, not blind clicks.** Players should understand the nature of the choice they are making — what kind of resource is at stake, what area of the Legion it affects, what the trade-off is — without revealing exact outcomes. The system provides enough context to make decisions feel deliberate and meaningful, while preserving the uncertainty and drama that make the game exciting.
- **Mobile first.** Players will use this on their phones between sessions. Every interaction must work on a 375px-wide screen.
- **Accessible by default.** WCAG 2.1 AA compliance. Semantic HTML, keyboard navigation, screen reader support, sufficient contrast ratios. The design system enforces this.
- **Async-native.** The app must gracefully handle the fact that players act at different times. Clear status indicators, notifications when it is your turn, summaries of what others have done.
- **Portable by design.** The app must not be locked into any specific design system or component library. Design tokens provide the visual abstraction layer. Components are wrapped so the underlying library can be swapped without rewriting the application.
- **Built to scale.** The architecture must support multiple independent campaigns on the same instance from day one, with complete data isolation between groups. It must also be designed so that a shared-universe model (multiple groups playing in the same Legion) can be added later without restructuring the data layer.
- **Open and community-first.** Everything produced by this project — code, documentation, design assets — is intended to be open and reusable by the community. The specific licensing terms will be decided before the project is made public (see ADR-004).

### 1.4 Success Criteria

- Players can complete the full campaign phase workflow between sessions without needing to consult the rulebook.
- Players understand the nature and impact of each decision they make, without the system spoiling exact outcomes.
- The GM can see a clear summary of all actions taken, ready to inform the next session.
- The app is usable on mobile, tablet, and desktop.
- The visual design receives positive reactions from the player group.
- No accessibility violations at WCAG 2.1 AA level.
- Multiple independent campaigns can run simultaneously with complete data isolation.
- The design system can be swapped or significantly altered by changing tokens and component wrappers, without modifying application logic.

---

## 2. Users & Roles

### 2.1 Accounts & Authentication

Each player creates their own individual account using email and password. Account ownership is separate from role assignment: a player first creates an account, then joins a campaign via an invite link or code shared by the GM. The GM then assigns the player to a Legion role within that campaign.

This separation means a player could participate in multiple campaigns with different roles, and the GM retains full control over who holds which role. Players do not self-assign roles.

*Future enhancement: Google OAuth login will be added as a convenience option in a later sprint (see Epic 11).*

### 2.2 Two Layers of Identity

Band of Blades has two distinct layers of player identity, and the app must model both independently:

- **Legion Role (strategic identity):** Commander, Marshal, Quartermaster, Lorekeeper, Spymaster, or Soldier (observer). This is the role a player holds for the entire campaign, governing what they do during the campaign phase. Assigned by the GM via CampaignMembership.
- **Mission Character (tactical identity):** Specialists (Heavy, Medic, Officer, Scout, Sniper), Soldiers, and Rookies. These are the characters players control during missions. Players pick up and put down mission characters freely — you might play Sniper Zora on one mission and Heavy Marchioness on the next.

These layers are independent. A player might hold both ("I am the Commander AND I played Specialist Jones last mission"), only a Legion role ("I am the Quartermaster but I did not play on this mission"), or only a mission character ("I have the Soldier/observer role but I played Rookie Tomas on the primary mission"). The app tracks both relationships separately.

### 2.3 Roles

The app has seven user roles. Six correspond to Legion roles in the game, plus a read-only Soldier role for observers.

| Role | Count | Primary Responsibilities in Campaign Phase |
|------|-------|--------------------------------------------|
| GM (Admin) | 1 | Resolve mission outcomes, set Back at Camp scene (if no Lorekeeper), generate missions, track Broken advances, view and override all data, assign roles to players, manage sessions |
| Commander | 1 | Track time and pressure, decide whether to advance, pick mission focus, spend intel, pick primary/secondary missions |
| Marshal | 1 | Track morale, manage squads and Specialists, assign personnel to missions, track harm/stress/xp across all Legionnaires |
| Quartermaster | 1 | Track and spend supply, perform campaign actions (Liberty, Acquire Assets, R&R, Recruit, Long-Term Projects), manage materiel and non-Legion personnel |
| Lorekeeper | 1 | Track the dead, tell Tales of the Legion, set Back at Camp scenes, keep the Annals |
| Spymaster | 1 | Dispatch spies on simple and long-term assignments, grow spy network |
| Soldier (observer) | 0+ | Read-only access to general campaign information: GM updates, Lorekeeper tales, Commander speeches, morale status, Legion location. Cannot modify any data. Lower priority — added in Epic 11. |

All roles can view the shared Legion state (resources, location, morale, squads). Only specific roles can modify specific data. The GM can view and override anything. Soldiers can view only public/general information.

### 2.4 Deputies

Each Legion role supports a deputy (backup) assignment. If the primary holder of a role is unavailable (e.g. sick, on holiday), the deputy can step in and perform that role's actions for the current campaign phase.

- **Both primary and deputy can act at any time** — the system does not block the deputy. However, only the primary receives turn notifications by default.
- **The GM can toggle who is "active"** for a given phase if needed.
- **Deputy assignment is stored in CampaignMembership** as a rank field (PRIMARY or DEPUTY). See section 4.

---

## 3. Campaign Phase Workflow

The campaign phase is a sequential pipeline. Each step has dependencies on previous steps. The app models this as a state machine, advancing through phases and notifying the appropriate role when it is their turn to act.

### 3.1 Workflow Overview

```
Step 1: Mission Resolution          — GM
    ▼
Step 2: Back at Camp                — Lorekeeper / GM
    ▼
Step 3: Time Passes                 — System + Commander
    ▼
┌ parallel ─────────────────────────
Step 4: Campaign Actions            — Quartermaster
Step 5: Spy Dispatch                — Spymaster
└ both must complete before step 6
    ▼
Step 6: Laborers & Alchemists       — Quartermaster
    ▼
Step 7: Advance Decision            — Commander
    ▼
Step 8: Mission Focus               — Commander
    ▼
Step 9: Mission Generation          — GM
    ▼
Step 10: Mission Selection          — Commander + Marshal
```

### 3.2 Workflow Step Details

| Step | Who Acts | Depends On | What Happens |
|------|----------|------------|--------------|
| 1. Mission Resolution | GM | Mission phase complete | GM enters mission outcomes: rewards, penalties, casualties. System applies morale changes for deaths (-1 per Legionnaire). |
| 2. Back at Camp | Lorekeeper (or GM) | Step 1 complete | Lorekeeper sees current morale level and available scenes. Picks a scene. Optionally records notes. If 4+ dead since last tale, tells a Tale and picks a benefit. |
| 3. Time Passes | System + Commander | Step 2 complete | System auto-increments time (+1 tick) and pressure (+1). Commander confirms. QM must spend 1 Food or Marshal loses 2 morale. System checks if Time clock filled (Broken advance). |
| 4. Campaign Actions | Quartermaster | Step 3 complete, morale known | QM sees how many free actions they get (high morale: 2, medium: 1, low: 0). They select and resolve actions. Can spend supply for extra actions or boosts. System handles dice rolls. |
| 5. Spy Dispatch | Spymaster | Step 3 complete (parallel with step 4) | Spymaster assigns each spy to a simple or long-term assignment. System resolves rolls for long-term assignments and tracks clock progress. |
| 6. Laborers & Alchemists | Quartermaster | Steps 4 and 5 complete | Laborers auto-tick Long-Term Projects. QM can run Alchemist projects (roll for effect and corruption). System tracks corruption clocks. |
| 7. Advance Decision | Commander | Step 6 complete | Commander decides whether to advance. If yes, consults QM about Horses. System rolls pressure dice, adds time ticks, resets pressure to 0. Commander picks path if at a fork. |
| 8. Mission Focus | Commander | Step 7 complete | Commander picks mission type to focus on (assault, recon, religious, supply). Spymaster may spend intel question. |
| 9. Mission Generation | GM | Step 8 complete | GM generates missions (app can assist with tables). Presents 2–3 missions to Commander. |
| 10. Mission Selection | Commander + Marshal | Step 9 complete | Commander picks primary and secondary missions. Marshal assigns Specialists and squads. Phase complete. |

### 3.3 Parallelism

Steps 4 and 5 (Quartermaster campaign actions and Spymaster dispatch) can run in parallel. The Spymaster does not need to wait for the QM, and vice versa. Steps 1–3 are strictly sequential. Step 6 depends on both 4 and 5 being complete. Steps 7–10 are strictly sequential.

### 3.4 State Machine

The campaign phase is modelled as a finite state machine with the following states:

- **AWAITING_MISSION_RESOLUTION** — GM has not yet entered mission outcomes
- **AWAITING_BACK_AT_CAMP** — Lorekeeper/GM must set a scene
- **TIME_PASSING** — System applies time/pressure, Food is consumed
- **CAMPAIGN_ACTIONS** — QM and Spymaster act (parallel)
- **AWAITING_LABORERS_ALCHEMISTS** — QM resolves Laborer and Alchemist actions
- **AWAITING_ADVANCE** — Commander decides on advance
- **AWAITING_MISSION_FOCUS** — Commander picks focus type
- **AWAITING_MISSION_GENERATION** — GM creates missions
- **AWAITING_MISSION_SELECTION** — Commander + Marshal assign
- **PHASE_COMPLETE** — Ready for next mission phase

---

## 4. Data Model

The data model captures the full state of a Band of Blades campaign. All entities are stored in a PostgreSQL database (via Supabase). The model is designed to be the single source of truth.

**Note:** The tables below show the high-level shape of the data model. Detailed specifications will be documented in separate epic spec files (see section 9.3). The model is designed to support multiple independent campaigns from day one, and to accommodate a future shared-universe model without restructuring (see section 4.3).

### 4.1 Core Entities

#### Campaign

The top-level container. One campaign = one playthrough of Band of Blades.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | Text | e.g. "Our First Campaign" |
| invite_code | Text | Unique code for players to join this campaign |
| current_location | Enum | One of the 14 locations on the map |
| current_phase | Enum | MISSION or CAMPAIGN |
| campaign_phase_state | Enum | The state machine state (see 3.4) |
| phase_number | Integer | Which campaign phase we are on (1, 2, 3...) |
| time_clock_1 | Integer (0–10) | Segments filled on first Time clock |
| time_clock_2 | Integer (0–10) | Segments filled on second Time clock |
| time_clock_3 | Integer (0–10) | Segments filled on third Time clock |
| pressure | Integer | Current pressure level |
| morale | Integer | Current Legion morale (0–12+) |
| intel | Integer | Commander's intel pool |
| supply | Integer | Quartermaster's supply count |
| food_uses | Integer | Remaining Food uses |
| horse_uses | Integer | Remaining Horse uses |
| black_shot_uses | Integer | Remaining Black Shot uses |
| religious_supply_uses | Integer | Remaining Religious Supply uses |
| supply_carts | Integer | Number of Supply Carts |
| chosen | Enum | Which Chosen travels with the Legion |
| created_at | Timestamp | |

#### User

A player or GM account. Account ownership is separate from role assignment.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key (from Supabase Auth) |
| email | Text | Login email |
| display_name | Text | Player name |

#### CampaignMembership

Links a user to a campaign with an assigned role. Managed by the GM. Supports deputy assignments.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK to User |
| campaign_id | UUID | FK to Campaign |
| role | Enum | GM, COMMANDER, MARSHAL, QUARTERMASTER, LOREKEEPER, SPYMASTER, SOLDIER |
| rank | Enum | PRIMARY or DEPUTY. Determines notification priority. Both can act. |
| assigned_at | Timestamp | When the GM assigned this role |

#### CharacterAssignment

Links a user to mission characters (Specialists, Soldiers, Rookies) they have played. Independent from Legion role assignment. One player can be linked to multiple characters over the course of a campaign.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK to User |
| campaign_id | UUID | FK to Campaign |
| character_type | Enum | SPECIALIST, SOLDIER, ROOKIE |
| character_id | UUID | FK to Specialist or Squad member |
| session_id | UUID | FK to Session — which session they played this character |

#### Session

A container for a single play session. Provides structure for GM prep, post-session notes, and links to the campaign phases and missions played. The Session entity provides a structural foundation that could support in-session tooling in the future, but this is not a current goal.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| campaign_id | UUID | FK to Campaign |
| session_number | Integer | Sequential session number |
| date | Date | When the session took place (or is planned) |
| status | Enum | PLANNED, IN_PROGRESS, COMPLETE |
| prep_notes | Text | GM's preparation notes (mission briefings, NPC notes, Broken plans) |
| post_notes | Text | GM's post-session notes (what happened, memorable moments, narrative hooks) |
| phase_number | Integer | Which campaign phase this session belongs to |

#### Squad

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| campaign_id | UUID | FK to Campaign |
| name | Text | e.g. "Shattered Lions", "Grinning Ravens" |
| type | Enum | ROOKIE, SOLDIER, ELITE |
| members | JSONB | Array of { name, rank, status, harm, stress, xp } |

#### Specialist

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| campaign_id | UUID | FK to Campaign |
| name | Text | Character name |
| class | Enum | HEAVY, MEDIC, OFFICER, SCOUT, SNIPER |
| heritage | Enum | BARTAN, ORITE, ZEMYATI, PANYAR |
| stress | Integer | Current stress (0–9) |
| harm_1 | JSONB | Level 1 harm slots and healing ticks |
| harm_2 | JSONB | Level 2 harm slots and healing ticks |
| harm_3 | JSONB | Level 3 harm slot and healing ticks |
| xp | Integer | Current xp |
| abilities | JSONB | Array of special abilities |
| actions | JSONB | Action ratings object |
| status | Enum | AVAILABLE, DEPLOYED, DEAD, RETIRED |

#### Spy

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| campaign_id | UUID | FK to Campaign |
| name | Text | e.g. "Antoinette", "Bortis" |
| rank | Enum | TRAINED (1d), MASTER (2d) |
| status | Enum | AVAILABLE, ON_ASSIGNMENT, WOUNDED, DEAD |
| specialty | Text | Special ability description |
| current_assignment | Enum | NONE, RECOVER, INTERROGATE, BLACKMAIL, HELP, AUGUMENT, EXPAND, LAY_TRAP, RECRUIT, RESEARCH |
| assignment_clock | Integer | Progress on long-term assignment (0–8) |

#### CampaignPhaseLog

A record of every action taken during a campaign phase. Audit trail and summary source.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| campaign_id | UUID | FK to Campaign |
| phase_number | Integer | Which campaign phase |
| step | Enum | Which workflow step (see 3.2) |
| role | Enum | Who performed the action |
| action_type | Text | e.g. "LIBERTY", "ACQUIRE_ASSETS", "ADVANCE" |
| details | JSONB | Full details including dice rolls, choices made, resources spent/gained |
| created_at | Timestamp | When the action was taken |

#### Additional Entities (to be detailed in epic specs)

- **SpyNetwork** — Tracks spy network upgrades
- **Alchemist** — Name, corruption clock (0–8), status
- **Mercy** — Wounded status
- **Laborer** — Count, current project assignment
- **LongTermProject** — Name, clock size, segments filled
- **DeathRecord** — Lorekeeper's list of the dead
- **BackAtCampScene** — Tracks used scenes per morale level
- **Tale** — Tales told and benefits chosen
- **BrokenAdvance** — Broken abilities unlocked

### 4.2 Data Isolation

Every entity carries a campaign_id foreign key. Row-level security (RLS) policies in PostgreSQL ensure that queries are always scoped to the user's campaign. A player in Campaign A can never see, query, or modify data belonging to Campaign B, even through direct API access.

### 4.3 Future: Shared Universe Model

A future expansion (Epic 12) envisions multiple physical groups playing in the same Legion — different tables, same campaign, same strategic layer. This imposes several architectural constraints that must be respected from the start:

- **No hard-coded single-GM assumption:** The CampaignMembership model already allows multiple GM-role users per campaign.
- **Session-specific data is its own entity:** Which squad went on which mission is linked to a Session, not baked into the Campaign record.
- **GM notes are flexibly scoped:** The Session entity carries per-session notes. Future group-level or squad-level note scoping can be added without restructuring.
- **Shared vs. per-group data boundary:** Campaign-level data (resources, location, pressure, time, morale) is shared. Mission/session data is per-group. This boundary is documented in ADR-003.

---

## 5. Tech Stack

### 5.1 Decisions and Rationale

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 14+ (App Router) | React-based, handles both frontend and API routes in one project. Huge ecosystem, TypeScript-first. Server components reduce client-side JavaScript for fast mobile performance. |
| Language | TypeScript | Type safety catches bugs before they reach players. Essential for a data-heavy app where a wrong number can break a campaign. |
| Database + Auth | Supabase (hosted PostgreSQL) | Relational database with row-level security. Built-in auth with email/password. Generous free tier. Real-time subscriptions for live updates. |
| Hosting (initial) | Vercel | Starting choice. Deploys automatically from GitHub. Free tier is sufficient. Optimised for Next.js. See ADR-001 for hosting evaluation. |
| Hosting (to evaluate) | Scaleway | European cloud provider (France). EU data residency. To be evaluated via ADR-001 before a final hosting decision. |
| Design System | Shadcn/ui + Radix UI (wrapped) | Accessible components via Radix primitives. You own the code. Fully themeable via design tokens. All components are wrapped in project-owned abstractions so the underlying library can be swapped without rewriting the app (see ADR-002). |
| Styling | Tailwind CSS | Utility-first CSS. Design tokens map directly to Tailwind's configuration. Fast to develop, easy to maintain. |
| Dice Rolling | Server-side (crypto.getRandomValues) | All dice rolls happen on the server to prevent tampering. Results are logged. |
| Version Control | GitHub | Code repository + project management (Issues, Projects, Milestones). Agile workflow built in. |
| Coding Agent | Claude Code | Anthropic's CLI agent. Reads the full codebase, writes code, runs commands, commits to GitHub. |

### 5.2 Architecture Overview

- **Presentation layer:** Next.js React components themed with design tokens. All UI components are project-owned wrappers around the underlying library (e.g. LegionButton wraps Shadcn's Button). App code never imports from the design system directly.
- **Application layer:** Next.js API routes + Server Actions. Business logic, state machine enforcement, dice rolls, validation.
- **Data layer:** Supabase/PostgreSQL. Single source of truth. Row-level security. Real-time subscriptions.

This is a headless-compatible architecture. The database and API are separated from the frontend, enabling alternative views in the future without touching the data layer.

### 5.3 Design System Portability

The app is designed to avoid lock-in to any specific component library. This is achieved through two layers of abstraction:

- **Design tokens:** All visual properties (colours, spacing, typography, shadows, radii) are defined as CSS custom properties. Components reference tokens, never raw values. If the visual identity changes, tokens are updated in one place.
- **Component wrappers:** Every component used by the app is a project-owned wrapper (e.g. LegionButton, LegionCard, LegionDialog). The wrapper imports from the underlying library (currently Shadcn/ui) and re-exports with the project's API. If the library is swapped, only the wrapper internals change — not the 50+ files that use the component.

This strategy is documented in ADR-002: Design System Portability Strategy.

---

## 6. Design Direction

This section captures the high-level direction for the visual identity. The full design system will be developed as part of Epic 2 and documented in DESIGN_TOKENS.md.

### 6.1 Mood & Aesthetic

The visual identity should evoke the world of Band of Blades: a retreating military force in a dark fantasy setting. Urgency vs. resolve, darkness vs. warmth, the weight of command vs. the hope of survival.

**Guiding Principles:**

- **Colour:** Deep charcoals for backgrounds. Warm amber/gold for accents. Parchment cream for text surfaces. Desaturated reds for danger.
- **Typography:** A sturdy serif for headings. A clean sans-serif for body. Monospaced numerals for counters.
- **Surfaces:** Subtle grain. Cards for actions. Circular segment clocks.
- **Iconography:** Military-inspired, simple, bold line icons.

*Detailed exploration happens during Epic 2.*

### 6.2 Design Token System

All visual decisions are encoded as CSS custom properties (design tokens). Change the tokens, change the entire app.

| Token Category | Examples | Purpose |
|----------------|----------|---------|
| Colour — Background | --bg-primary, --bg-surface, --bg-elevated | Page backgrounds, cards, modals |
| Colour — Text | --text-primary, --text-muted, --text-accent | Body, secondary, highlights |
| Colour — Interactive | --interactive-primary, --interactive-hover | Buttons, links, form controls |
| Colour — Semantic | --colour-danger, --colour-success, --colour-warning | Alerts, status, dice results |
| Typography | --font-heading, --font-body, --font-mono | Font families |
| Spacing | --space-xs through --space-2xl | Margins, paddings, gaps |
| Radius | --radius-sm, --radius-md, --radius-lg | Border radii |
| Shadows | --shadow-card, --shadow-modal | Elevation |

### 6.3 Component Abstraction Layer

All app code references project-owned wrapper components (e.g. LegionButton, LegionCard), never the underlying library directly. This allows the design system to be swapped by changing wrapper internals, without modifying application logic. The wrapper layer is established during Epic 2.

### 6.4 Accessibility Requirements (WCAG 2.1 AA)

- **Contrast:** 4.5:1 for body text, 3:1 for large text.
- **Keyboard navigation:** All interactive elements reachable, visible focus indicators.
- **Screen readers:** Semantic HTML, ARIA labels, live regions for dynamic updates.
- **Motion:** Respect prefers-reduced-motion.
- **Forms:** Visible labels, associated errors, indicated required fields.
- **Touch targets:** Minimum 44x44px.

---

## 7. Epics & User Stories

Work is organised into epics that will be broken into GitHub Issues. Detailed specs are written before the sprint that tackles each epic (see section 9.3).

### Epic 1: Project Foundation

**Goal:** Deployed app with auth, database, invite flow, and placeholder dashboard. Minimal default theme.

- Set up Next.js with TypeScript and Tailwind CSS
- Install Shadcn/ui (default theme, customised in Epic 2)
- Set up Supabase project with email/password auth
- Create database schema: Campaign, User, CampaignMembership, Session
- GM campaign creation with invite code generation
- Player join flow and GM role assignment (including deputy)
- Deploy to Vercel with GitHub integration
- Placeholder role-specific dashboard shell
- Set up docs/ folder structure including journal/

### Epic 2: Visual Identity & Design System

**Goal:** The app looks and feels like Band of Blades. Complete design token system, themed components, and the component wrapper layer.

- Define complete colour palette and commit as design tokens
- Select and integrate typefaces
- Create the component wrapper layer (LegionButton, LegionCard, etc.)
- Theme all components to match the Band of Blades aesthetic
- Build styled login page as visual showcase
- Build clock components (circular segment clocks)
- Build card patterns for actions and decisions
- Define texture/grain treatments
- Define iconography direction and integrate icon set
- Accessibility contrast audit on dark theme
- Document everything in DESIGN_TOKENS.md

### Epic 3: Campaign Phase State Machine

**Goal:** State machine tracks campaign phase, shows correct view per role, advances through phases.

- Implement state machine transitions
- Build phase progress indicator
- Implement Time Passes step
- Build notification system for role turns
- Implement phase completion transition

### Epic 4: Quartermaster Campaign Actions

**Goal:** QM can perform all campaign actions with contextual information, dice rolls, and visual feedback.

- Liberty, Acquire Assets, R&R, Recruit, Long-Term Project actions
- Boost mechanic (spend supply to upgrade)
- Materiel tracking (Food, Horses, Black Shot, Religious Supplies, Supply Carts)
- Each action explains what is at stake and what it affects

### Epic 5: Commander Tools

**Goal:** Commander manages time, pressure, intel, advancing, and mission selection.

- Time/pressure tracking with visual clocks
- Advance decision flow with Horse consultation
- Location map with paths and details
- Mission focus selection with context
- Mission selection and intel tracking

### Epic 6: Marshal Tools

**Goal:** Marshal manages personnel, morale, and mission deployment.

- Morale tracker with threshold display (high 8+, medium 4–7, low 3-)
- Squad and Specialist management
- Mission deployment assignment
- Personnel updates (deaths, promotions, wounds)

### Epic 7: Spymaster Tools

**Goal:** Spymaster manages spies and the spy network.

- Spy roster, simple assignments, long-term assignments
- Assignment dice rolls with clock progress
- Spy Network upgrade tree (visual)

### Epic 8: Lorekeeper Tools

**Goal:** Lorekeeper tracks the dead, tells Tales, sets Back at Camp scenes, keeps the Annals.

- Death tracker with count since last Tale
- Tales of the Legion with prompts and benefits
- Back at Camp scene selection filtered by morale
- Annals: mission log with in-character notes

### Epic 9: GM Dashboard & Session Management

**Goal:** GM has full visibility, mission generation tools, and session management.

- Overview dashboard: all resources, all role actions, full audit trail
- Mission generation assistant with location-based tables
- Broken tracking (abilities unlocked, Lieutenants active)
- Override capability for GM discretion
- Session management: create, prep, and annotate sessions
- Session list with status, dates, and linked campaign phases

### Epic 10: End-of-Phase Summaries

**Goal:** Tailored summaries for every role when the campaign phase is complete.

- GM summary: complete log, resource deltas, narrative hooks
- Player summaries: role-specific highlights
- Shareable summary for group chat

### Epic 11: Polish & Quality of Life

**Goal:** Refinements, expanded access, and delightful details.

- Dice roll animations
- Notifications when it is your turn
- Undo/rollback for misclicks
- Campaign history browser
- Print-friendly summary export
- Google OAuth login
- Soldier (observer) role: read-only dashboard

### Epic 12: Shared Universe / Multi-Group Campaigns

**Goal:** Multiple physical groups play in the same Legion. Different tables, same campaign, same strategic layer. This is ambitious and requires detailed design work.

*This epic depends on architectural decisions made in earlier epics. ADR-003 (written during Sprint 1) ensures the data model supports this without restructuring.*

- Define shared vs. per-group data boundary
- Session Groups: link multiple sessions/groups to one campaign
- Per-group GM notes and mission assignments
- Cross-group visibility for shared resources
- Multi-GM support within a single campaign

---

## 8. Sprint Plan

Sprints are goal-based, not time-boxed. Each sprint ends when its goal is met and all issues pass the Definition of Done. Sprint reviews happen with Claude (the planning instance) to assess progress and plan the next sprint.

### Sprint 0: Setup

**Goal:** Everything is in place to start building. No code yet.

1. Create GitHub account and repository
2. Install Node.js, Git, and Claude Code
3. Create Supabase project (free tier)
4. Create Vercel account, link to GitHub repo
5. Commit this Project Brief to the repo as docs/PROJECT_BRIEF.md
6. Create Epic issues on GitHub with labels
7. Create Sprint 1 milestone and assign first batch of stories

### Sprint 1: Foundation

**Goal:** The app exists with auth, invite flow, and placeholder dashboard. Deployed to a live URL.

*Covers: Epic 1*

1. Initialise Next.js with TypeScript, Tailwind, Shadcn/ui (default theme)
2. Set up Supabase auth
3. Create database schema (Campaign, User, CampaignMembership, Session)
4. Build GM campaign creation and player join flow
5. Build placeholder dashboard with role navigation
6. Deploy to Vercel
7. Set up docs/ folder structure
8. Write ADR-001 (Hosting) and ADR-003 (Multi-Tenancy/Shared Universe)

### Sprint 2: Visual Identity

**Goal:** The app looks and feels like Band of Blades. Design system, component wrappers, and themed UI.

*Covers: Epic 2*

1. Define and implement design tokens
2. Select and integrate typefaces
3. Create component wrapper layer
4. Theme all components
5. Build styled login page, clock and card components
6. Accessibility contrast audit
7. Write ADR-002 (Design System Portability) and DESIGN_TOKENS.md

### Sprint 3: The Core Loop

**Goal:** Campaign phase state machine works end-to-end. QM can perform at least one action.

*Covers: Epic 3 + start of Epic 4*

1. Implement state machine
2. Build phase progress indicator
3. Implement Time Passes step
4. Build QM campaign action selection
5. Implement Liberty action with dice roll and context
6. Implement Commander Advance decision
7. Create CampaignPhaseLog

Subsequent sprints will be planned during sprint reviews, drawing from Epics 4–12.

---

## 9. Ways of Working

### 9.1 Agile Workflow on GitHub

- **Issues:** Every piece of work is a GitHub Issue, tagged with Epic label, sprint milestone, and priority.
- **Project Board:** Columns: Backlog, Sprint Backlog, In Progress, Review, Done.
- **Sprints:** Goal-based cycles. Done when the goal is met.
- **Definition of Done:** Code works, is deployed, passes accessibility checks, no TypeScript errors.

### 9.2 Your Workflow With Claude

1. **Plan with me (this Claude):** Discuss, spec, create Issues.
2. **Build with Claude Code:** Terminal, feed specs, code is written and committed.
3. **Review with me:** Troubleshoot, adjust, plan next.
4. **Deploy:** Push to GitHub, Vercel auto-deploys.

### 9.3 Documentation Hierarchy

All project documentation lives in the repo. Each document type has a specific purpose:

| Document | Location | Purpose | When It Changes |
|----------|----------|---------|-----------------|
| Project Brief | docs/PROJECT_BRIEF.md | Strategic overview: vision, architecture, epics. | Evolves slowly, major direction changes. |
| Epic Specs | docs/specs/EPIC-NN-name.md | Detailed spec per epic: exhaustive tables, edge cases, acceptance criteria. | Written before the sprint, refined during. |
| Architecture Decision Records | docs/adr/NNN-decision-name.md | Major technical decisions with context and rationale. | Written when decided. Superseded by new ADR if reversed. |
| Data Model | docs/DATA_MODEL.md | Living database schema. | Updated every sprint that changes tables. |
| Design Tokens | docs/DESIGN_TOKENS.md | Complete visual system reference. | Created in Epic 2, updated when tokens change. |
| Sprint Journal | docs/journal/sprint-NN-name.md | Sprint retrospective: what we planned, decided, learned. | Written after each sprint review. |
| Conversation Transcripts | docs/journal/transcripts/ | Raw conversation exports from planning sessions with Claude. | Saved after significant conversations. |
| LICENSE / LICENSE-DOCS | / (root) | Licensing for code and non-code assets respectively. To be decided — see ADR-004. | Added when licensing decision is made. Repo is private until then. |

**Planned ADRs:**

- **ADR-001: Hosting Provider** — Vercel vs. Scaleway vs. others. Written during Sprint 1.
- **ADR-002: Design System Portability Strategy** — Component wrapper pattern and token abstraction. Written during Sprint 2.
- **ADR-003: Multi-Tenancy and Shared Universe Strategy** — Data isolation, shared-universe constraints. Written during Sprint 1 before schema is finalised.
- **ADR-004: Project Licensing Strategy** — Code and documentation licensing. Options include MIT, AGPL, PolyForm NonCommercial, CC BY-SA, CC BY-NC-SA. Written before the repository is made public.

### 9.4 Quality Gates

- **TypeScript strict mode:** No any types, no ignoring errors.
- **ESLint + Prettier:** Consistent code style.
- **Accessibility linting:** eslint-plugin-jsx-a11y.
- **Lighthouse audits:** Performance, accessibility, SEO checked each sprint.
- **Manual testing:** Test on your phone before each sprint review.

---

## 10. Security & Sustainability

### 10.1 Security

- **Authentication:** Supabase Auth with email/password. Google OAuth planned (Epic 11).
- **Authorisation:** Row-level security in PostgreSQL. Roles can only access/modify their data. Soldier role is read-only. Deputies have same access as primaries.
- **Role assignment:** Only the GM can assign or change roles.
- **Data isolation:** Complete isolation between campaigns. RLS enforces campaign_id scoping on every query.
- **Input validation:** Server-side with Zod schemas.
- **Dice integrity:** Server-side only. Logged in CampaignPhaseLog.
- **Environment variables:** Secrets in hosting environment, never in code.

### 10.2 Sustainability

- **Free tier viability:** Supabase and Vercel free tiers are sufficient for multiple 6-player campaigns.
- **Minimal dependencies:** Shadcn/ui components are copied in, not npm-installed. Component wrappers add further insulation.
- **Data portability:** PostgreSQL is the most portable database. Hosting can be migrated.
- **Performance budget:** Lighthouse 90+. Server components by default.

---

## 11. Licensing

The licensing model for this project has not yet been decided. The intent is for the project to be open, reusable, and community-friendly, but the specific terms — particularly around commercial use — require further consideration.

Until a decision is made, the repository remains private and all rights are reserved by the author. The licensing decision will be documented in ADR-004: Project Licensing Strategy, which will be written before the repository is made public. Options under consideration include:

- **MIT or AGPL-3.0** for code (permissive vs. copyleft, with different stances on commercial use)
- **PolyForm NonCommercial 1.0.0** for code (explicitly noncommercial, source-available rather than open source)
- **CC BY-SA 4.0 or CC BY-NC-SA 4.0** for documentation and non-code assets (with or without a noncommercial restriction)

The choice will be informed by the project's community, intended audience, and whether external contributions are desired. There is no cost to deferring this decision while the repo is private.

---

## 12. Glossary

| Term | Definition |
|------|------------|
| Campaign Phase | The strategic portion of each session where roles perform actions between missions. This is what the app digitises. |
| Mission Phase | The tactical portion where Legionnaires carry out missions. Not covered by this app (for now). |
| Legion Role | A player's strategic identity in the campaign phase: Commander, Marshal, Quartermaster, Lorekeeper, Spymaster, or Soldier (observer). Held for the entire campaign. |
| Mission Character | A player's tactical identity during missions: a Specialist, Soldier, or Rookie they control. Players pick up and put down mission characters freely. |
| Deputy | A backup holder of a Legion role. Can act when the primary is unavailable. Both primary and deputy can act; only the primary gets notifications by default. |
| Pressure | Numeric value representing undead proximity. Increases each campaign phase. Rolled as dice when advancing. |
| Time Clock | Three 10-segment clocks. When one fills, the Broken gain power. When all fill, the game is lost. |
| Morale | Numeric score tracking Legion spirit. Determines free campaign actions (high 8+: 2, medium 4–7: 1, low 3-: 0). |
| Intel | Commander's resource. Spend for engagement dice or special missions. |
| Supply | Quartermaster's resource. Spend for extra campaign actions or boosts. |
| Campaign Action | An action the QM takes: Liberty, Acquire Assets, R&R, Recruit, or Long-Term Project. |
| Long-Term Project | A multi-phase clock granting a custom benefit when completed. |
| Session | A single play session. Container for GM prep notes, post-session notes, and links to campaign phases and missions. |
| Soldier (app role) | An observer role (not from the rulebook). Read-only access to general campaign information. |
| CampaignMembership | Database entity linking a user to a campaign with a role and rank (primary/deputy). |
| CharacterAssignment | Database entity linking a user to mission characters they have played. |
| Design Token | A CSS variable (e.g. --bg-primary) controlling a visual property across the app. |
| Component Wrapper | A project-owned component (e.g. LegionButton) that wraps the underlying library. Enables design system swaps. |
| State Machine | Pattern where the app is always in one defined state with specific valid transitions. |
| Row-Level Security (RLS) | PostgreSQL feature enforcing per-row access control based on the logged-in user. |
| Multi-Tenancy | Architecture supporting multiple independent campaigns on the same app instance with complete data isolation. |
| Shared Universe | Future model where multiple groups play in the same Legion, sharing strategic data. |
| Shadcn/ui | Component library for React. Components are copied in and fully customisable. |
| Supabase | Open-source Firebase alternative: PostgreSQL database, auth, real-time. |
| Goal-Based Sprint | A sprint that ends when its goal is achieved, not when a fixed time expires. |
| Epic Spec | Detailed specification for an epic, written before the sprint that tackles it. |
| ADR | Architecture Decision Record. Captures a technical decision with context and rationale. |
| Sprint Journal | Post-sprint retrospective documenting what was planned, decided, and learned. |

---

*End of Project Brief — v1.3*
