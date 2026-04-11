# Epic 1: Project Foundation

**Sprint:** 1  
**Branch:** `feature/epic-01-foundation`  
**Goal:** A deployed Next.js app with email/password auth, GM campaign creation, player invite flow, role assignment (including deputy), and placeholder role dashboards.

---

## Scope

### In scope
- Next.js scaffold with TypeScript, Tailwind CSS, ESLint, App Router
- Shadcn/ui installed with default theme (visual identity deferred to Epic 2)
- Supabase email/password auth (sign up, sign in, sign out)
- Database schema: `profiles`, `campaigns`, `campaign_memberships`, `sessions`
- Row-Level Security policies on all tables
- GM campaign creation with generated invite code
- Player join flow via invite code
- GM role assignment screen (assign role + rank to campaign members)
- Placeholder dashboard per role (layout only, no game logic)
- Deployed to Vercel, accessible at a live URL
- ADR-001 (Hosting) committed

### Out of scope
- Visual design, design tokens, component wrappers (Epic 2)
- Any game logic or state machine (Epic 3+)
- Notifications, real-time updates
- Google OAuth (Epic 11)
- Soldier (observer) role (Epic 11)

---

## Acceptance Criteria

- [ ] `npm run dev` starts the app locally with no errors
- [ ] TypeScript strict mode passes (`tsc --noEmit`) with no errors
- [ ] A new user can sign up with email and password
- [ ] A signed-in GM can create a campaign and see its invite code
- [ ] A signed-in player can join a campaign using an invite code
- [ ] The GM can assign a role and rank (PRIMARY/DEPUTY) to any campaign member
- [ ] Each of the six roles (GM, Commander, Marshal, Quartermaster, Lorekeeper, Spymaster) has a distinct placeholder dashboard route
- [ ] After sign-in, the user is redirected to the correct dashboard for their role in the active campaign
- [ ] RLS is active on all tables — a user cannot query data from a campaign they are not a member of
- [ ] The app is deployed to Vercel and loads at the live URL
- [ ] No TypeScript `any` types, no `@ts-ignore`

---

## Routes

| Route | Access | Purpose |
|-------|--------|---------|
| `/` | Public | Redirect: signed-out → `/sign-in`, signed-in → `/dashboard` |
| `/sign-up` | Public | Create account |
| `/sign-in` | Public | Sign in |
| `/auth/callback` | Internal | Supabase auth redirect handler |
| `/dashboard` | Auth required | Redirect to role-specific dashboard |
| `/dashboard/gm` | GM only | GM placeholder |
| `/dashboard/commander` | Commander only | Commander placeholder |
| `/dashboard/marshal` | Marshal only | Marshal placeholder |
| `/dashboard/quartermaster` | QM only | QM placeholder |
| `/dashboard/lorekeeper` | Lorekeeper only | Lorekeeper placeholder |
| `/dashboard/spymaster` | Spymaster only | Spymaster placeholder |
| `/campaign/new` | Auth required | GM creates a campaign |
| `/campaign/join` | Auth required | Player joins via invite code |
| `/campaign/[id]/members` | GM only | Assign roles to members |

---

## File Structure

```
src/
  app/
    layout.tsx                        # Root layout
    page.tsx                          # Redirect based on auth state
    sign-up/
      page.tsx
    sign-in/
      page.tsx
    auth/
      callback/
        route.ts                      # Supabase auth callback handler
    dashboard/
      page.tsx                        # Redirects to role dashboard
      gm/page.tsx
      commander/page.tsx
      marshal/page.tsx
      quartermaster/page.tsx
      lorekeeper/page.tsx
      spymaster/page.tsx
    campaign/
      new/page.tsx
      join/page.tsx
      [id]/
        members/page.tsx
  components/
    features/
      auth/
        sign-up-form.tsx
        sign-in-form.tsx
      campaign/
        create-campaign-form.tsx
        join-campaign-form.tsx
        member-list.tsx
        role-assignment-form.tsx
    legion/                           # Empty — component wrappers added in Epic 2
  lib/
    types.ts                          # All TypeScript types and enums
    supabase/
      client.ts                       # Browser Supabase client
      server.ts                       # Server Supabase client (uses cookies)
  server/
    actions/
      auth.ts                         # sign-up, sign-in, sign-out actions
      campaign.ts                     # create, join, assign-role actions
```

---

## Database Schema

Run the following SQL in the Supabase SQL editor.

```sql
-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Enums
create type legion_role as enum (
  'GM', 'COMMANDER', 'MARSHAL', 'QUARTERMASTER', 'LOREKEEPER', 'SPYMASTER', 'SOLDIER'
);

create type member_rank as enum ('PRIMARY', 'DEPUTY');

create type campaign_phase as enum ('MISSION', 'CAMPAIGN');

create type campaign_phase_state as enum (
  'AWAITING_MISSION_RESOLUTION',
  'AWAITING_BACK_AT_CAMP',
  'TIME_PASSING',
  'CAMPAIGN_ACTIONS',
  'AWAITING_LABORERS_ALCHEMISTS',
  'AWAITING_ADVANCE',
  'AWAITING_MISSION_FOCUS',
  'AWAITING_MISSION_GENERATION',
  'AWAITING_MISSION_SELECTION',
  'PHASE_COMPLETE'
);

create type session_status as enum ('PLANNED', 'IN_PROGRESS', 'COMPLETE');

-- Profiles (extends Supabase auth.users)
create table profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- Campaigns
create table campaigns (
  id                    uuid primary key default uuid_generate_v4(),
  name                  text not null,
  invite_code           text not null unique,
  current_phase         campaign_phase not null default 'CAMPAIGN',
  campaign_phase_state  campaign_phase_state not null default 'AWAITING_MISSION_RESOLUTION',
  phase_number          integer not null default 1,
  morale                integer not null default 8,
  pressure              integer not null default 0,
  intel                 integer not null default 0,
  supply                integer not null default 6,
  time_clock_1          integer not null default 0 check (time_clock_1 between 0 and 10),
  time_clock_2          integer not null default 0 check (time_clock_2 between 0 and 10),
  time_clock_3          integer not null default 0 check (time_clock_3 between 0 and 10),
  food_uses             integer not null default 0,
  horse_uses            integer not null default 0,
  black_shot_uses       integer not null default 0,
  religious_supply_uses integer not null default 0,
  supply_carts          integer not null default 0,
  created_at            timestamptz not null default now()
);

-- Campaign memberships
create table campaign_memberships (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  role        legion_role not null,
  rank        member_rank not null default 'PRIMARY',
  assigned_at timestamptz not null default now()
);

-- Only one PRIMARY holder per role per campaign
create unique index campaign_memberships_one_primary_per_role
  on campaign_memberships(campaign_id, role)
  where rank = 'PRIMARY';

-- Sessions
create table sessions (
  id             uuid primary key default uuid_generate_v4(),
  campaign_id    uuid not null references campaigns(id) on delete cascade,
  session_number integer not null,
  date           date,
  status         session_status not null default 'PLANNED',
  prep_notes     text,
  post_notes     text,
  phase_number   integer,
  created_at     timestamptz not null default now()
);
```

---

## Row-Level Security Policies

```sql
-- Profiles
alter table profiles enable row level security;

create policy "profiles: anyone can read"
  on profiles for select using (true);

create policy "profiles: users insert own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "profiles: users update own profile"
  on profiles for update using (auth.uid() = id);

-- Campaigns
alter table campaigns enable row level security;

create policy "campaigns: members can read"
  on campaigns for select using (
    exists (
      select 1 from campaign_memberships
      where campaign_memberships.campaign_id = campaigns.id
        and campaign_memberships.user_id = auth.uid()
    )
  );

create policy "campaigns: authenticated users can create"
  on campaigns for insert with check (auth.uid() is not null);

create policy "campaigns: GM can update"
  on campaigns for update using (
    exists (
      select 1 from campaign_memberships
      where campaign_memberships.campaign_id = campaigns.id
        and campaign_memberships.user_id = auth.uid()
        and campaign_memberships.role = 'GM'
    )
  );

-- Campaign memberships
alter table campaign_memberships enable row level security;

create policy "memberships: campaign members can read"
  on campaign_memberships for select using (
    exists (
      select 1 from campaign_memberships cm
      where cm.campaign_id = campaign_memberships.campaign_id
        and cm.user_id = auth.uid()
    )
  );

create policy "memberships: authenticated users can join"
  on campaign_memberships for insert with check (auth.uid() is not null);

create policy "memberships: GM can assign roles"
  on campaign_memberships for update using (
    exists (
      select 1 from campaign_memberships cm
      where cm.campaign_id = campaign_memberships.campaign_id
        and cm.user_id = auth.uid()
        and cm.role = 'GM'
    )
  );

-- Sessions
alter table sessions enable row level security;

create policy "sessions: campaign members can read"
  on sessions for select using (
    exists (
      select 1 from campaign_memberships
      where campaign_memberships.campaign_id = sessions.campaign_id
        and campaign_memberships.user_id = auth.uid()
    )
  );

create policy "sessions: GM can insert"
  on sessions for insert with check (
    exists (
      select 1 from campaign_memberships
      where campaign_memberships.campaign_id = sessions.campaign_id
        and campaign_memberships.user_id = auth.uid()
        and campaign_memberships.role = 'GM'
    )
  );

create policy "sessions: GM can update"
  on sessions for update using (
    exists (
      select 1 from campaign_memberships
      where campaign_memberships.campaign_id = sessions.campaign_id
        and campaign_memberships.user_id = auth.uid()
        and campaign_memberships.role = 'GM'
    )
  );
```

---

## TypeScript Types (`src/lib/types.ts`)

```typescript
export type LegionRole =
  | 'GM'
  | 'COMMANDER'
  | 'MARSHAL'
  | 'QUARTERMASTER'
  | 'LOREKEEPER'
  | 'SPYMASTER'
  | 'SOLDIER';

export type MemberRank = 'PRIMARY' | 'DEPUTY';

export type CampaignPhase = 'MISSION' | 'CAMPAIGN';

export type CampaignPhaseState =
  | 'AWAITING_MISSION_RESOLUTION'
  | 'AWAITING_BACK_AT_CAMP'
  | 'TIME_PASSING'
  | 'CAMPAIGN_ACTIONS'
  | 'AWAITING_LABORERS_ALCHEMISTS'
  | 'AWAITING_ADVANCE'
  | 'AWAITING_MISSION_FOCUS'
  | 'AWAITING_MISSION_GENERATION'
  | 'AWAITING_MISSION_SELECTION'
  | 'PHASE_COMPLETE';

export type SessionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETE';

export interface Profile {
  id: string;
  display_name: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  invite_code: string;
  current_phase: CampaignPhase;
  campaign_phase_state: CampaignPhaseState;
  phase_number: number;
  morale: number;
  pressure: number;
  intel: number;
  supply: number;
  time_clock_1: number;
  time_clock_2: number;
  time_clock_3: number;
  food_uses: number;
  horse_uses: number;
  black_shot_uses: number;
  religious_supply_uses: number;
  supply_carts: number;
  created_at: string;
}

export interface CampaignMembership {
  id: string;
  user_id: string;
  campaign_id: string;
  role: LegionRole;
  rank: MemberRank;
  assigned_at: string;
}

export interface Session {
  id: string;
  campaign_id: string;
  session_number: number;
  date: string | null;
  status: SessionStatus;
  prep_notes: string | null;
  post_notes: string | null;
  phase_number: number | null;
  created_at: string;
}
```

---

## Key Implementation Notes

### Invite code generation
Generate a short, readable code (e.g. 8 uppercase alphanumeric characters) server-side using `crypto.getRandomValues()`. Check for uniqueness before inserting. Store as plain text — these are not secret, just unique identifiers.

### Profile creation on sign-up
After Supabase creates the auth user, insert a matching row into `profiles` in the same server action. The `id` must match `auth.users.id`.

### Auth callback
Supabase SSR requires an `/auth/callback` route handler to exchange the code for a session. Without this, email confirmation and OAuth flows break.

### Dashboard redirect logic
`/dashboard/page.tsx` queries `campaign_memberships` for the signed-in user, finds their PRIMARY role in the most recent campaign, and redirects to the matching route. If they have no campaign membership, redirect to `/campaign/join`.

### Role assignment constraint
The unique partial index on `campaign_memberships` prevents two PRIMARY holders for the same role. The application should surface a clear error if a GM tries to assign a PRIMARY role that is already taken.

### Supabase clients
Two clients are needed:
- **Browser client** (`src/lib/supabase/client.ts`): used in Client Components. Created with `createBrowserClient`.
- **Server client** (`src/lib/supabase/server.ts`): used in Server Components and Server Actions. Created with `createServerClient`, reading/writing cookies via Next.js `cookies()`.

---

## Packages to Install

```bash
npm install @supabase/supabase-js @supabase/ssr
npx shadcn@latest init
```

---

## Definition of Done

- All acceptance criteria checked
- `tsc --noEmit` passes
- `npm run build` completes without errors
- App is live on Vercel
- Feature branch PR is open and ready to merge
