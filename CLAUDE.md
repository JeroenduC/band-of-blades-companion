# Band of Blades — Legion Phase Companion: Rules for Claude

This file contains the permanent project instructions for Claude Code.
Read this at the start of every session as the basis for all decisions.

---

## 0. Meta: Autonomous Context Management

**Proactive Updates:** Claude is responsible for keeping **all human-readable documentation** current during development. This includes `CLAUDE.md`, `README.md`, `docs/PROJECT_BRIEF.md`, `docs/DESIGN_TOKENS.md`, and `docs/DATA_MODEL.md`. When a technical decision changes (e.g. a version downgrade, a schema change, a new standard), every document that references the old information must be updated in the same commit. Never let docs drift from reality.

**Token Optimisation:** If extended back-and-forth occurs on a complex topic, Claude summarises the final conclusion, adds it as a hard rule to the appropriate section, and reports: *"I've updated CLAUDE.md with this rule. You can now `/compact` to save tokens."*

**Epic Transitions:** At the start of a new Epic, Claude checks both `CLAUDE.md` and `README.md` for outdated or irrelevant rules that can be removed to keep the context cache lean.

**Key Reference Documents:**
- `docs/PROJECT_BRIEF.md` — Strategic overview (read when starting a new Epic, not every session)
- `docs/specs/EPIC-NN-name.md` — Detailed spec for the current Epic (read when working on that Epic)
- `docs/DATA_MODEL.md` — Living database schema (read when working on data-related tasks)
- `docs/DESIGN_TOKENS.md` — Visual system reference (read when working on UI)
- `docs/adr/` — Architecture Decision Records (read the relevant one when the topic arises)

---

## 1. Project Identity

**What this is:** A web app that digitises the campaign phase of the tabletop RPG Band of Blades. Players complete the campaign phase asynchronously between sessions, each acting through their assigned Legion role.

**Tech Stack:**
- Framework: Next.js 15 (App Router) with TypeScript
- Database + Auth: Supabase (PostgreSQL + Row-Level Security)
- Design System: Shadcn/ui + Radix UI (wrapped in project-owned components)
- Styling: Tailwind CSS with custom design tokens
- Hosting: Vercel (initial — see ADR-001 for evaluation)
- Version Control: GitHub

---

## 2. Design Philosophy (Hard Rules)

These rules come from the Project Brief section 1.3 and are non-negotiable.

1. **Feel over function.** The UI must evoke Band of Blades: dark, urgent, militaristic, warm. Never build something that looks like a corporate dashboard or a spreadsheet.

2. **Decisions, not data entry.** Every screen presents a meaningful choice. The system handles consequences. Never show a form where a decision card would work.

3. **Informed decisions, not blind clicks.** Always show the player what *kind* of resource is at stake and what *area* of the Legion is affected. Never show exact outcomes — preserve uncertainty and drama.

4. **Mobile first, responsive always, purposeful use of space.**
   - Build mobile layout first (375px). Everything must work smoothly on mobile — this is the primary device.
   - All layouts must be responsive. Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`) so the app works on any screen size.
   - On larger screens, use the extra space IF it improves clarity: better spacing between information blocks, side-by-side layouts where it helps comprehension, more breathing room around content. Don't stretch things just to fill space.
   - Maximum content width is 1240px. Beyond that, the content is centred with subtle light grey borders on either side to frame it.
   - Never build a desktop-only layout and "fix mobile later." Never build a narrow mobile layout and leave it narrow on desktop when extra space would help the user.

5. **Accessible by default.** WCAG 2.1 AA compliance is mandatory, not optional:
   - All text: 4.5:1 contrast ratio (3:1 for large text)
   - All interactive elements: keyboard navigable with visible focus indicators
   - All dynamic updates: ARIA live regions
   - All touch targets: minimum 44x44px
   - All forms: visible labels, associated errors
   - Respect `prefers-reduced-motion`
   - **`aria-hidden` does NOT exempt visible text from contrast requirements.** axe-core checks the rendered colour regardless of the accessibility tree. If text is decorative, use `text-legion-text-muted` or stronger — never rely on `aria-hidden` to silence a contrast violation.
   - **Links in body text must be distinguishable without colour** (WCAG 1.4.1). Always use permanent `underline underline-offset-4`, never `hover:underline` only.

6. **Async-native.** Players act at different times. Show clear status indicators, notify when it's someone's turn, summarise what others have done.

---

## 3. Architecture Rules

### Component Wrapper Pattern (ADR-002)
- **Never** import Shadcn/ui components directly in page or feature code.
- **Always** use project-owned wrappers: `LegionButton`, `LegionCard`, `LegionDialog`, etc.
- Wrappers live in `src/components/legion/`.
- If a new Shadcn component is needed, create a wrapper first, then use the wrapper.

### Design Tokens
- **Never** use raw Tailwind classes for colours (e.g. `bg-zinc-900`).
- **Always** use design token classes (e.g. `bg-[var(--bg-primary)]`) or semantic Tailwind extensions defined in `tailwind.config.ts`.
- All token values are defined in a single theme file. Changing the look means changing that file, nothing else.

### State Machine
- The campaign phase is a finite state machine. States and transitions are defined in `src/lib/state-machine.ts`.
- **Never** allow a state transition that isn't explicitly defined in the state machine.
- All state transitions are logged in the `CampaignPhaseLog`.

### Extensibility by Default
- New states, roles, actions, or game mechanics must be addable by modifying data/configuration, not by rewriting logic. If adding a new campaign action requires changing more than 3 files, the architecture needs refactoring.
- Use data-driven patterns: arrays of states, maps of transitions, registries of actions. Avoid long if/else or switch chains that need editing every time something is added.
- When building any feature, ask: "What if the game rules change?" Band of Blades has community houserules and the owner may want to customise the workflow. Build for that.

### Supabase String-Selector Helpers
- When a helper function uses a string column selector (e.g. `db.from('x').select('a, b, c')`), TypeScript cannot infer column types. The return type of `campaign` will be inferred as `GenericStringError` unless you add an explicit return type annotation.
- **Fix pattern:** Annotate the helper's return type explicitly (e.g. `Promise<{ campaign: Record<string, unknown> | null }>`), then cast at each call site with `const campaign = _raw as unknown as MyRowInterface`. The double-cast through `unknown` is required when TypeScript considers the source and target types "insufficiently overlapping" — `as SomeType` alone will fail with "may be a mistake."
- Never cast directly with `as Record<string, unknown>` when the source is a typed interface. Always go through `unknown` first.

### Server Actions and Client Component State
- **`revalidatePath` does not re-render already-mounted Client Components.** When a server action calls `revalidatePath`, Server Components above the Client Component will re-render and pass fresh props down — but only if the Client Component is a direct child of a Server Component that receives the new data as props. If the component receives no new props, the displayed state will be stale.
- **Fix pattern:** In a Client Component that uses `useActionState`, watch the returned state in a `useEffect`. When the action succeeds, call `router.refresh()` to force a full re-fetch:
  ```tsx
  const router = useRouter();
  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state]);
  ```
- **base-ui Dialog differs from Radix:** base-ui uses a `render` prop pattern (`render={<button />}`), not Radix's `asChild`. Never pass `asChild` to base-ui components — it will silently break.

### Server-Side Dice
- **All** dice rolls happen on the server using `crypto.getRandomValues()`.
- **Never** roll dice on the client. Results are logged in `CampaignPhaseLog`.
- The client receives the result and displays it — it never generates it.

### Data Isolation
- **Every** database query must be scoped by `campaign_id`.
- Row-Level Security (RLS) policies enforce this at the database level.
- A user in Campaign A must never see data from Campaign B, even through the API.

### Server Action File Size
- `src/server/actions/campaign-phase.ts` is the single file for all campaign phase actions. When it exceeds ~2,500 lines, split it by role: `commander-actions.ts`, `gm-actions.ts`, `qm-actions.ts`, re-exported from an `index.ts`. Do not split prematurely — wait until one role's actions clearly dominate.

### SVG Interactive Elements
- SVG `<g>` elements do not support CSS `outline`. For focusable SVG nodes, include a sibling `<circle class="focus-ring" opacity={0} />` and add a global CSS rule: `g:focus-visible circle.focus-ring { opacity: 1; }` to make keyboard focus visible. Never ship interactive SVG elements without a visible focus indicator.

---

## 4. Database Rules

- **Never** use raw strings for categorical data. Always use TypeScript enums or union types (e.g. `type Role = 'GM' | 'COMMANDER' | 'MARSHAL' | ...`).
- **Never** add a new database table without updating `docs/DATA_MODEL.md`.
- **Always** consider the shared-universe model (ADR-003) when designing schemas — no hard-coded single-GM assumptions, session-specific data in its own entity.
- All foreign keys to `campaign` must be named `campaign_id` consistently.

---

## 5. Code Standards

### TypeScript
- Strict mode is mandatory. No `any` types. No `@ts-ignore`.
- Use `interface` for object shapes, `type` for unions and intersections.
- Name files in kebab-case: `campaign-actions.ts`, `legion-button.tsx`.
- Name components in PascalCase: `CampaignDashboard`, `LegionButton`.

### File Structure
```
src/
  app/                    # Next.js App Router pages and layouts
  components/
    legion/               # Project-owned component wrappers
    features/             # Feature-specific components (grouped by epic)
  lib/                    # Shared utilities, state machine, types
  server/                 # Server actions, API logic, dice rolling
  styles/                 # Global styles, theme, design tokens
```

### Layout
- All page layouts use a max-width container: `max-w-[1240px] mx-auto`
- Content areas use responsive padding: `px-4 sm:px-6 lg:px-8`
- Use Tailwind responsive grid/flex where wider screens benefit from multi-column layouts (e.g. `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
- The outer page wrapper beyond 1240px should have a subtle border: `border-x border-legion-border/20`

### Comments
- Write comments in English.
- Comment the *why*, not the *what*. The code should explain itself.
- Complex game logic (e.g. pressure roll mechanics, morale thresholds) must have a comment referencing the relevant page in the Band of Blades rulebook.

---

## 6. Testing

- Every new feature gets unit tests for its core logic.
- Use Vitest for unit tests.
- Test game mechanics thoroughly: dice outcomes, state transitions, resource calculations.
- No tests for trivial getters, simple components, or Supabase boilerplate.
- Accessibility: run `axe-core` checks on new pages/components (`npm run a11y`).
- **Before running `npm run a11y` or `npm run screenshot`, always kill any stale dev server first:** `npx kill-port 3000` (or whichever port you're using). On Windows, zombie Next.js processes silently serve stale HTML — audits and screenshots against them produce false results. The audit script validates `lang="en"` in the served HTML as a sanity check, but killing the port first is the safest approach.

---

## 7. Git Workflow

- Every epic or sprint works on a **feature branch** — never directly on `main`.
- Branch naming: `feature/epic-{nr}-{short-description}` (e.g. `feature/epic-02-visual-identity`).
- Workflow per sprint:
  1. Create feature branch from `main`
  2. Build and commit incrementally with clear commit messages
  3. Test locally (and on mobile)
  4. Push, create PR, review
  5. Merge to `main` — Vercel auto-deploys
  6. At the start of the next sprint: delete the merged branch

### Commit Messages
- Format: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`
- Examples: `feat(qm): implement Liberty campaign action`, `fix(auth): handle expired session redirect`

---

## 8. README Protocol

- Every PR **must** include a README update in the same commit.
- Mark completed sprints with ✅, active sprints with 🔄, planned sprints with ⏳.
- Always add the next logical goal so the roadmap looks ahead.
- Epic statuses and the roadmap are maintained **exclusively** in `README.md`.

---

## 9. Communication

### 9.1 General
- Respond in **English** unless the user explicitly asks for another language.
- Code variables, function names, and comments in English.
- Be concise — no unnecessary summaries at the end of a response.
- When unsure about a game mechanic, reference the Band of Blades rulebook (the PDF is available in the project context) rather than guessing.
- When facing an architectural choice, check if there's a relevant ADR before making a decision. If not, flag it as a potential new ADR.

### 9.2 Your Workflow With Claude
For the full two-agent workflow using Claude Code (senior) and Gemini CLI (junior), see [docs/Two_Agent_Sprint_Protocol.md](docs/Two_Agent_Sprint_Protocol.md).

---

## 10. Node / npm Path

- Node.js is at `/c/Program Files/nodejs` — this is already in `~/.bashrc`.
- GitHub CLI (`gh`) is at `/c/Program Files/GitHub CLI` — also in `~/.bashrc`.
- Both are set in `~/.claude/settings.json` env block so they persist across sessions.

---

## 11. GitHub Project Workflow

Claude Code must manage GitHub Issues and the Project Board actively during development.

### Issue Lifecycle
1. **Sprint start:** Move all issues for the current sprint to the "Sprint Backlog" column on the GitHub Project board.
2. **Starting work:** When beginning work on any issue (planned, bug, or otherwise), move it to "In Progress" on the Project board.
3. **Ready for review:** When work on an issue is complete:
   - Move the issue to "Review" on the Project board
   - Assign the issue to the project owner (JeroenduC)
   - Add a comment on the issue explaining how to test it: what to look at, what URLs to visit, what to click, what the expected result is
   - **NEVER close an issue. NEVER move an issue to "Done".** Only the owner (JeroenduC) does that, after review. This applies to every issue without exception — including DB migrations, data files, documentation, and retrospectives.
4. **Bugs:** Follow the same lifecycle, even for quick fixes. Create an issue, move it through In Progress → Review.

### Sprint Closure
Before declaring a sprint complete, verify:
- [ ] All sprint issues are in "Done" or "Review" status
- [ ] No sprint issues are still in "In Progress" or "Sprint Backlog"
- [ ] If any issues are in "Review", notify the owner and wait for them to be moved to "Done" before closing the sprint
- [ ] Development Journal updated with a sprint entry in `docs/journal/` (see below)
- [ ] Sprint Retrospective issue is in "Done" (see below)

### Development Journal
At the end of every sprint, add a journal entry before closing:
1. Create or update the file `docs/journal/sprint-NN.md` (e.g. `sprint-02.md`)
2. The entry must cover:
   - **What was built:** a brief list of the features/components delivered
   - **Key decisions:** any architectural or design choices made and why
   - **Blockers & fixes:** notable problems encountered and how they were resolved
3. Commit the journal entry with message `docs: sprint N journal`
4. Verify `README.md` links to the journal file (the README links to the `docs/journal/` directory)

A sprint **cannot be closed** without a committed journal entry.

### Sprint Retrospective
Before closing any sprint, create and complete a retrospective issue:
1. Create an issue titled "Sprint N Retrospective — Best Practices Review"
2. Review all work done during the sprint and identify best practices in four areas:
   - **Token efficiency:** What wasted tokens this sprint? What patterns should be avoided? What shortcuts can be reused?
   - **Long-term over short-term:** Were any shortcuts taken that created technical debt? Were there solutions that favoured long-term maintainability?
   - **Accessibility & UX:** What accessibility lessons were learned? What WCAG requirements were tricky? What UX patterns worked well?
   - **Mistakes to prevent:** What went wrong? What was the root cause? What rule or check would have prevented it?
3. For each best practice identified, check if it's already captured in CLAUDE.md. If not, add it to the relevant section.
4. Commit the updated CLAUDE.md with message "docs: sprint N retrospective — update best practices"
5. Add a summary of the retrospective findings to the sprint journal entry
6. Close the retrospective issue

**Important:** Not every sprint will produce new best practices, and that's fine. Don't force insights where there are none — an empty retrospective that says "nothing new to add" is perfectly valid. But when there genuinely is something to learn, capture it. The goal is continuous improvement, not bureaucracy.

This issue must be in "Done" before the sprint can be closed.

### Self-Review Before Moving to Review
Before moving any issue to "Review" status, Claude Code must do a self-review:
1. **Re-read the acceptance criteria** of the issue.
2. **Verify each criterion is met** — not just that the code looks correct, but that the feature actually works as intended. For UI issues, this means checking the compiled output (CSS, HTML), not just the source files.
3. **For visual/UI changes: take a screenshot with Playwright before asking the user anything.** Run `npm run dev` in the background, then `npm run screenshot -- /path`. Read the resulting image file to verify the visual result yourself. Only escalate to the user if something is genuinely ambiguous after seeing the screenshot.
4. **Test the golden path** end-to-end: can a real user complete the intended action?
5. **Check for regressions** in related features.
6. **Only then** move to Review and add the testing comment.
7. **Always run `npm run build`** before marking an issue for review. If the build fails, the issue is not ready for review. Fix all build errors first.
8. **If new Shadcn components or dependencies were installed**, verify they are in `package.json` dependencies AND that `package-lock.json` is staged in the commit. A missing lockfile is a silent Vercel build failure.

If a criterion cannot be verified even after a screenshot, say so explicitly and describe what the reviewer should check.

### Ask, Don't Assume
When debugging or verifying visual/UI issues:
1. If you cannot programmatically verify something (e.g. "does the background look dark?"), ask the user to check and report back. Don't spend tokens guessing.
2. If you've spent more than 2 attempts fixing the same issue without success, stop and ask the user what they actually see. Request a screenshot if needed.
3. If you're making assumptions about what the user's browser is showing, state the assumption explicitly and ask them to confirm before proceeding.
4. Never assume which branch or deployment the user is looking at. If the fix is on a feature branch but the user might be viewing the production URL (which deploys from main), ask: "Are you looking at localhost, the Vercel production URL, or a preview deployment?" Confirm before debugging further.
5. **When the user reports something doesn't work: always ask which environment they tested on before starting to debug.** Ask explicitly: local dev (`npm run dev`), local production build, Vercel preview URL (feature branch), or Vercel production URL (main)?
6. A quick question costs far fewer tokens than three wrong guesses.

### Testing Instructions in Issues
When adding a testing comment to a GitHub issue:
- Always include the **exact URL** the user should visit (e.g. the full Vercel preview URL from the deployment status, or `http://localhost:3000/path`).
- If the feature is only testable locally, say so and give the command to run.
- Never write "visit the Vercel preview" without including the actual URL.
- **If the issue requires a DB migration, make it step 1 of the testing comment.** Explicitly name the migration file and instruct the reviewer to run it in the Supabase SQL Editor before doing anything else. A reviewer hitting a missing-table error is a testing comment failure, not a code failure.

### Seed and Utility Scripts
- **Seed scripts must handle missing tables gracefully.** If a table doesn't exist (Supabase returns a schema cache error), log a warning and continue — don't crash. A partially-migrated environment should still allow the rest of the script to run.
- Check for `error.message.includes('schema cache') || error.message.includes('does not exist')` to detect missing tables.

### Commit References
- Always reference the issue number in commit messages: `feat(auth): implement sign-up flow (#3)`
- Use `closes #N` in PR descriptions to auto-close issues on merge, but only after review is complete

---

## 12. Accessible Forms (NL Design System Guidelines)

Reference: https://nldesignsystem.nl/richtlijnen/formulieren/
These rules apply whenever creating or modifying any form in the app.

### Labels & Descriptions
- Always place a visible label ABOVE the input field, never as placeholder-only
- Use `<label>` elements properly associated with their input via `htmlFor`/`id`
- Add descriptions (extra help text) between the label and the input field, not below the input
- Associate descriptions with the input using `aria-describedby`
- Keep descriptions short and to-the-point

### Required & Optional Fields
- Only ask for information that is genuinely needed
- If most fields are required, mark the optional ones with "(not required)" rather than marking required ones with an asterisk
- Never use only an asterisk (*) to indicate required fields — it requires prior knowledge of the convention
- If you do use an asterisk, explain its meaning above the form

### Error Handling
- Show validation requirements BEFORE the user submits, not after
- Display error messages directly next to the relevant field, between the label and the input
- Associate error messages with the input using `aria-describedby` (combine with description if both exist)
- Use more than just colour to indicate errors — add an icon or text prefix like "Error:"
- Provide helpful error messages that explain what needs to change, not just "invalid input"
- Never clear a field the user has already filled in when showing an error elsewhere

### Form Elements
- Never use `<select multiple>` — use checkboxes instead for multiple selections
- Be cautious with date pickers — test with keyboard and screen reader. A simple set of text inputs (day/month/year) is often more accessible
- Avoid `<input type="number">` for short numeric inputs (like day/month) — users accidentally scroll the value. Use `<input type="text" inputmode="numeric">` instead
- Use radio buttons instead of dropdowns when there are fewer than 7 options
- Make clickable areas large enough — minimum 44x44px touch target

### Visual Design
- Input field borders must have sufficient contrast against the background (3:1 minimum)
- Input text must have sufficient contrast (4.5:1 minimum)
- Placeholder text must have sufficient contrast (4.5:1 minimum) — if you can't achieve this, don't use placeholders
- Focus indicators must be clearly visible (use the design token `--bob-border-focus`)
- Never rely on colour alone to convey information (errors, required status, valid/invalid)

### Layout & Flow
- One question/topic per screen where possible (especially for complex multi-step flows like campaign actions)
- Logical tab order that matches visual order
- Don't let the page jump unexpectedly when showing/hiding elements
- Provide clear navigation: users must always know how to go forward and back
- At the end of a form/flow, confirm what was submitted and what happens next

### Testing
- Test every form with keyboard-only navigation (Tab, Shift+Tab, Enter, Space, Arrow keys)
- Test with a screen reader if possible (or at minimum verify ARIA attributes are correct)
- Verify the form works on mobile (375px viewport, touch targets, virtual keyboard doesn't obscure inputs)
