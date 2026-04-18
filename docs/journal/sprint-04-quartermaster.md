# Sprint 4 Journal — Quartermaster Actions

**Branch:** `feature/epic-04-quartermaster`  
**Epic:** #4 — Quartermaster Phase Actions  
**Issues:** #54 Acquire Assets · #55 R&R · #56 Recruit · #57 Long-Term Project · #58 Materiel Dashboard · #59 Alchemists/Laborers · #60 DB Tables · #61 Location Data · #64 Seed Script · #65 Dev Login Helper

---

## What was built

- **6 new database tables** (`long_term_projects`, `alchemists`, `mercies`, `laborers`, `siege_weapons`, `recruit_pool`) with RLS SELECT policies and a Supabase migration.
- **Location data** (`src/lib/locations.ts`): 14 BoB campaign map locations with typed asset dice pools for each asset type.
- **QM Materiel Panel** (`qm-materiel-panel.tsx`): always-visible sidebar showing resources (use pips), alchemist corruption clocks, mercy status, project progress bars, recruit counts. Collapsible on mobile.
- **Campaign action cards** for all 4 QM Step 4 actions: Acquire Assets (location-aware dice pool, personnel/resource branching), Rest & Recuperation (auto-heals Mercies), Recruit (normal/boosted), Long-Term Project (work existing or create new, clock progress bar).
- **Step 6 form** (`alchemists-laborers-form.tsx`): per-alchemist cards with effect + corruption dice display; laborer project assignment; "Complete Step 6" advances phase.
- **6 server actions** in `campaign-phase.ts`, all server-side dice via `crypto.getRandomValues()`.
- **`loadQmMateriel` loader** — parallel Promise.all fetching all 6 materiel tables plus acquired asset types from phase log.

## Key decisions

**Flexible-but-typed Supabase helper**: `verifyQmAndFetchCampaign()` takes a string column selector for reuse across actions, but returns `Record<string,unknown>`. Each action casts with `as unknown as QmCampaignRow`. This avoids duplicating auth/membership logic across 8 actions while keeping TypeScript happy.

**"Already acquired" tracking via phase log**: Rather than adding a column to campaigns or a junction table, acquired asset types are derived by querying `campaign_phase_log` for `ACQUIRE_ASSETS` entries in the current phase. Zero extra DB schema for this constraint.

**R&R simplified for Epic 4**: Full per-Specialist healing requires the Marshal Roster (Epic 6). R&R currently auto-heals all Mercies with a logged note explaining the deferral. The action is still useful and the limitation is surfaced to the user in the UI.

**Laborer assignment idempotency**: `laborers.current_project_id` tracks assignment per phase. The loader checks this to show "already assigned" state on page load. Cleared in `completeLaborersAlchemists` so it resets each phase.

## Blockers and fixes

**TypeScript double-cast pattern**: When casting between types TypeScript considers "insufficiently overlapping" (e.g. `QmCampaignRow` → `Record<string,unknown>`), a direct `as` cast fails with "may be a mistake." The fix is `as unknown as T` — casting through `unknown` is always allowed. This was needed in `performAcquireAssets` when doing dynamic column lookup via `(campaign as unknown as Record<string,unknown>)[resourceCol]`.

**`verifyQmAndFetchCampaign` return type inference**: Without an explicit return type annotation on the helper, TypeScript inferred `campaign` as `GenericStringError`. Fix: add `Promise<{ membership: {id:string}|null; campaign: Record<string,unknown>|null }>` as explicit return type.

**Repository ruleset blocking feature branch pushes**: The repo had a branch protection rule applying to `~ALL` branches, requiring PRs even for feature branches. User adjusted the ruleset to allow direct pushes to feature branches.

## Late additions (#64 and #65)

- **Expanded seed script** (`scripts/seed-test-users.ts`): now creates 3 campaigns (Alpha/Beta/Gamma) with 8 numbered users each. Idempotent — runs clean before seeding. Invite codes printed per campaign.
- **`npm run seed:clean`** (`scripts/seed-clean.ts`): standalone full wipe of all data and auth users.
- **Dev login helper** (`dev-login-helper.tsx`): accordion on the sign-in page listing all test accounts grouped by campaign. One-click fill and submit. Rendered only when `NODE_ENV !== 'production'` — tree-shaken out of production builds (sign-in bundle size unchanged).

## Retrospective findings

Key additions to CLAUDE.md from this sprint:

**From #54–#59:**
- Supabase string-selector helpers lose type inference — always annotate return type explicitly and cast with `as unknown as InterfaceName` at the call site.

**From #64–#65:**
- Seed scripts must detect missing tables (schema cache errors) and warn rather than crash — a partially-migrated environment should not block the rest of the script.
- Testing comments for issues that depend on a DB migration must make applying that migration step 1, explicitly naming the file. A reviewer hitting a missing-table error is a testing comment failure.
