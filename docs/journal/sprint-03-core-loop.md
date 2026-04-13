Sprint 3 — Core Campaign Loop
Date: April 13, 2026
Epic: Epic 3 — Campaign Phase State Machine
Branch: feature/epic-03-state-machine
Goal: Build the full campaign phase state machine, role-aware dashboards, and all player action steps for the core loop.

## What Was Built

- Campaign phase FSM in `src/lib/state-machine.ts` — 10 states, typed transitions, unit-tested (#35)
- `CampaignPhaseLog` table and server-side logging utility — every transition recorded (#36, #47)
- `PhaseProgressIndicator` component — visual pipeline showing all 10 steps with current/done/pending states (#37)
- Role-aware dashboard routing — each role (GM, Commander, Lorekeeper, Quartermaster, Spymaster, Marshal, Soldier, Pending) gets its own dashboard page (#38)
- GM dashboard: invite code with inline copy button, "Manage Roles" CTA, phase controls (#39)
- Step 1 — Mission Resolution: GM form with success/failure outcome and pressure/morale consequences (#40)
- Step 2 — Back at Camp: Lorekeeper scene selection from morale-filtered pool, used scenes crossed off (#41)
- Step 3 — Time Passes: Lorekeeper advances, Commander confirms; system applies -1 morale (#42)
- Steps 4–5 — QM Campaign Actions: action card selection (Liberty, Laborers, Alchemists) + Spymaster parallel (#43)
- Step 4b — Liberty action: full dice roll flow with `crypto.getRandomValues()` (#44)
- Step 6–7 — Commander Advance/Stay decision and mission focus selection (#45)
- Steps 5, 8, 9, 10 — Placeholder steps to complete the loop (#46)
- GM can remove players from campaign with base-ui confirmation dialog (#34)
- CI a11y workflow — GitHub Actions runs `npm run a11y` on every push (#33)
- Visual identity pass — all authenticated pages match the dark military aesthetic from the sign-in page (#49)
- Responsive layout applied consistently — 1240px outer frame, max-w-2xl content column, px-4/sm:6/lg:8 padding
- `scripts/seed-test-users.ts` — resets DB + creates 8 test accounts, "Test Campaign", all memberships
- `docs/SEED_TESTING.md` — test account reference with role overview

## Key Decisions

- **Two-layer responsive container pattern:** Every page uses `max-w-[1240px] mx-auto border-x border-border/20` as the outer frame, with an inner `max-w-2xl mx-auto` content column. This gives atmospheric side borders on wide screens while keeping content readable. Formalised in CLAUDE.md §5 Layout.
- **`revalidatePath` does not re-render mounted Client Components:** Discovered during role assignment work. `revalidatePath` triggers Server Component re-render which passes fresh props down — but only if the Client Component actually receives new props. The fix (`router.refresh()` in a `useEffect`) was identified but deferred to #51 to avoid blocking the sprint.
- **base-ui Dialog `render` prop:** The `LegionDialog` uses base-ui, not Radix. base-ui uses `render={<button />}` for the trigger, not `asChild`. This bit us once — now documented in CLAUDE.md §3.
- **Icon-only buttons need `aria-label`:** The `CopyInviteButton` demonstrates the pattern: icon-only button with `aria-label="Copy invite code to clipboard"`. No text label needed if the aria-label is descriptive.
- **seed:test script reads `.env.local` manually:** The Supabase service role key and admin API are not available in the standard Next.js env pipeline during `tsx` execution; the script uses `fs.readFileSync` + manual `.env.local` parsing to bootstrap.

## Blockers & Fixes

- **Copy button layout saga (5 iterations):** Started by attempting to use `LegionCardAction` (a grid-based component requiring a description row) to position a "Copy" button top-right. When layout broke, iterated without screenshots — violating the rule in CLAUDE.md §11. Eventually user redirected to a simpler approach: inline copy icon after the campaign code. Fix: apply the screenshot-first rule before any visual iteration.
- **TypeScript Supabase join type error:** `Conversion of type '{ display_name: any; }[]' to type '{ display_name: string; }'` — Supabase infers join types as arrays even when using `.single()`. Fix: `as unknown as { display_name: string }` double-cast. Not ideal but necessary given Supabase's type generation limitations.
- **`self-start` on flex-column children:** The "Manage Roles" button stretched full width as a flex child. Fixed by adding `self-start` to align it left without stretching.
- **Stale `.next` cache:** Intermittent `PageNotFoundError` during build on the `/test/progress` preview route. Fixed by deleting `.next/` and rebuilding.

## Retrospective — Best Practices Review

### Token Efficiency
- **Biggest waste: iterating on visual layout without screenshots.** The copy button took ~5 attempts because each iteration was blind. The screenshot-first rule (§11 item 3) exists and must be enforced. If a layout is wrong, take a screenshot _immediately_ before changing anything.
- **Second waste: debugging revalidatePath without understanding root cause.** Applied `useEffect` sync without first verifying whether the parent was even re-rendering. Root cause research upfront would have saved two round-trips.
- **What worked well:** Punting the role assignment bug to #51 with full context was the right call. Forcing a broken fix would have cost more tokens and left a regression.

### Long-Term over Short-Term
- The responsive container two-layer pattern is a long-term investment: one pattern to rule all pages, easy to apply, formalised in CLAUDE.md.
- The CI a11y workflow is pure long-term value — every push now gets checked.
- The seed script with full reset capability saves time every testing session going forward.
- The `revalidatePath` + Client Component fix was correctly deferred — a partial fix would have been worse than none.

### Accessibility & UX
- Icon-only interactive elements always need `aria-label`. Applied correctly to `CopyInviteButton`.
- The CI a11y pipeline now catches regressions automatically — no need to manually run `npm run a11y` before every PR.
- Touch targets (min 44x44px) were applied to buttons throughout the visual identity pass.

### Mistakes to Prevent
- **Don't iterate on visual layout without a screenshot.** This is already in §11 but was not followed during the copy button work. If you cannot programmatically verify the visual result, take a screenshot first.
- **`revalidatePath` ≠ re-render for mounted Client Components.** Use `router.refresh()` in a `useEffect` watching `state?.success`. Now documented in CLAUDE.md §3.
- **base-ui uses `render` prop, not `asChild`.** Now documented in CLAUDE.md §3.

## What's Next

Sprint 4 / Epic 4: Dice resolution UX, Pressure mechanics, Morale thresholds, and campaign action consequences.
