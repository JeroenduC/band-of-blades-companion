# Architecture Overview

**Band of Blades — Legion Phase Companion**

A web app that digitizes the campaign phase of the tabletop RPG *Band of Blades*, replacing manual bookkeeping with an asynchronous, role-based workflow.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server components for mobile performance |
| Language | TypeScript | Type safety for data-heavy campaign mechanics |
| Database & Auth | Supabase (PostgreSQL + Auth) | RLS, real-time subscriptions, email/password auth |
| Styling | Tailwind CSS v4 | Design tokens mapped to Tailwind utilities |
| Components | Shadcn/ui + Radix UI | Wrapped in project-owned "Legion" components |
| Validation | Zod | Schema validation in server actions |
| Hosting | Vercel | Optimized for Next.js; EU hosting under evaluation |

---

## Project Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── layout.tsx              # Root layout (fonts, theme, metadata)
│   ├── page.tsx                # Entry: redirects to /dashboard or /sign-in
│   ├── sign-in/                # Auth pages
│   ├── sign-up/
│   ├── auth/callback/          # OAuth callback route
│   ├── campaign/
│   │   ├── new/                # Create campaign
│   │   ├── join/               # Join via invite code
│   │   └── [id]/members/       # GM role assignment
│   └── dashboard/
│       ├── page.tsx            # Role selector / routing
│       ├── gm/                 # GM dashboard
│       ├── commander/          # Commander dashboard
│       ├── marshal/            # Marshal dashboard
│       ├── quartermaster/      # QM dashboard
│       ├── lorekeeper/         # Lorekeeper dashboard
│       ├── spymaster/          # Spymaster dashboard
│       └── pending/            # Awaiting role assignment
├── components/
│   ├── legion/                 # Design system wrappers (public API)
│   ├── ui/                     # Shadcn/ui primitives (internal)
│   └── features/               # Feature-specific components
│       ├── auth/               # Sign-in/up forms, shells
│       └── campaign/           # Phase forms, dashboards, actions
├── lib/
│   ├── types.ts                # Shared TypeScript types
│   ├── state-machine.ts        # Campaign phase FSM
│   ├── campaign-utils.ts       # Resource calculation helpers
│   ├── utils.ts                # General utilities (cn, etc.)
│   └── supabase/               # Three Supabase client variants
│       ├── client.ts           # Browser client (client components)
│       ├── server.ts           # Server client (server components, middleware)
│       └── service.ts          # Service client (server actions, bypasses RLS)
├── server/
│   ├── actions/                # Server actions (mutations)
│   │   ├── auth.ts             # Sign-up, sign-in, sign-out
│   │   ├── campaign.ts         # Create, join, assign roles, remove player
│   │   └── campaign-phase.ts   # State transitions, phase mechanics
│   └── loaders/                # Data fetching (reads)
│       └── dashboard.ts        # Dashboard data loaders
├── styles/
│   └── theme.css               # Design tokens (CSS custom properties)
└── middleware.ts               # Auth guard, session refresh
```

---

## Data Flow

```
Browser ──► Middleware (session refresh, auth guard)
              │
              ▼
         Server Component (reads via loaders)
              │
              ▼
         Client Component (user interaction)
              │
              ▼
         Server Action (validates, mutates via service client)
              │
              ▼
         Supabase (PostgreSQL + RLS)
              │
              ▼
         Real-time subscription pushes update to all clients
```

All mutations flow through server actions. Clients never write to the database directly. The service-role Supabase client is used for all writes, ensuring mutations are validated and logged server-side.

---

## Authentication & Authorization

**Auth flow:**
1. Player creates account (email + password via Supabase Auth)
2. GM creates a campaign and receives an invite code
3. Players join via invite code (become pending members)
4. GM assigns a Legion role and rank (PRIMARY or DEPUTY)

**Middleware** (`src/middleware.ts`) refreshes the session on every request and redirects unauthenticated users to `/sign-in`. Public paths: `/sign-in`, `/sign-up`, `/auth/*`, `/test/*`.

**Roles:** GM, Commander, Marshal, Quartermaster, Lorekeeper, Spymaster, Soldier. Each role has specific permissions within the campaign phase workflow.

---

## State Machine

The campaign phase is a 10-step linear pipeline managed by a finite state machine in `src/lib/state-machine.ts`. All transitions are validated server-side.

```
AWAITING_MISSION_RESOLUTION        (GM)
  ↓
AWAITING_BACK_AT_CAMP              (Lorekeeper / GM)
  ↓
TIME_PASSING                       (Commander confirms)
  ↓
CAMPAIGN_ACTIONS                   (QM + Spymaster in parallel)
  ↓
AWAITING_LABORERS_ALCHEMISTS       (QM)
  ↓
AWAITING_ADVANCE                   (Commander)
  ↓
AWAITING_MISSION_FOCUS             (Commander)
  ↓
AWAITING_MISSION_GENERATION        (GM)
  ↓
AWAITING_MISSION_SELECTION         (Commander + Marshal)
  ↓
PHASE_COMPLETE
```

Step 4 (CAMPAIGN_ACTIONS) is the only parallel step — the QM and Spymaster act independently. Two boolean flags (`qm_actions_complete`, `spymaster_actions_complete`) gate the transition; both must be true to proceed.

Every transition is logged to the append-only `campaign_phase_log` table.

---

## Database Schema

Core tables:

| Table | Purpose |
|---|---|
| `profiles` | User accounts (synced from Supabase Auth) |
| `campaigns` | Campaign state: resources, phase state, clocks, flags |
| `campaign_memberships` | User-to-campaign role + rank assignments |
| `sessions` | Individual play sessions |
| `campaign_phase_log` | Append-only audit trail of all phase actions |
| `back_at_camp_scenes` | Pool of 18 scenes per campaign (6 per morale tier) |

Key campaign resources: `morale` (0–12+), `pressure` (0+), `intel`, `supply`, three 10-segment time clocks, and materiel counters (food, horses, black shot, religious supplies, supply carts).

Data isolation is enforced via `campaign_id` on every entity and Supabase Row-Level Security.

---

## Design System

The project uses a portability-first design system (see [ADR-002](adr/002-design-system-portability.md)):

1. **Design tokens** are defined as CSS custom properties in `src/styles/theme.css` (OKLCH color space)
2. **Shadcn/ui primitives** live in `src/components/ui/` — internal, never imported by feature code
3. **Legion wrappers** in `src/components/legion/` are the public API (`LegionButton`, `LegionCard`, `LegionInput`, etc.)
4. **Feature components** import only from `@/components/legion`

This means the underlying component library can be swapped without touching feature code.

**Visual identity:** Dark, militaristic aesthetic. Warm parchment text on deep charcoal backgrounds. Amber accent color. Cinzel headings, Geist Sans body text. CSS-only grain texture overlay.

**Accessibility:** WCAG 2.1 AA. All text pairings meet 4.5:1 contrast. 44px minimum touch targets. Keyboard navigation. Screen reader support. Respects `prefers-reduced-motion`.

---

## Key Architectural Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Server-side state machine | All transitions validated and logged server-side. Clients never set state directly. |
| 2 | Parallel actions via boolean flags | Simple, auditable approach for the QM + Spymaster parallel step. |
| 3 | Real-time via Supabase subscriptions | Dashboards subscribe to campaign row changes. All clients re-render on state change. |
| 4 | Server-side dice only | `crypto.getRandomValues()` prevents tampering. Results logged before returning. |
| 5 | Design system portability | Component wrappers + tokens allow swapping the underlying library. |
| 6 | Service role for all writes | Server actions use the service client to bypass RLS, ensuring all mutations are validated. |
| 7 | Campaign-scoped data isolation | Every entity carries `campaign_id`. RLS enforces isolation from day one. |

Full ADRs are in [`docs/adr/`](adr/).

---

## Testing & Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint (flat config, Next.js core-web-vitals + TypeScript) |
| `npm run test` | Vitest unit tests |
| `npm run a11y` | WCAG 2.1 AA audit (Playwright + axe-core) |
| `npm run screenshot` | Visual regression screenshots |
| `npm run seed:test` | Seed test users |

---

## Related Documentation

- [Project Brief](PROJECT_BRIEF.md) — Vision, goals, users, workflow
- [Data Model](DATA_MODEL.md) — Database schema, migrations, RLS policies
- [Design Tokens](DESIGN_TOKENS.md) — Color palette, typography, spacing, accessibility
- [State Machine Spec](specs/EPIC-03-state-machine.md) — Detailed FSM transitions and mechanics
- [ADRs](adr/) — Architecture Decision Records
