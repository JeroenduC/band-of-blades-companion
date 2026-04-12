# Band of Blades — Legion Phase Companion: Rules for Claude

This file contains the permanent project instructions for Claude Code.
Read this at the start of every session as the basis for all decisions.

---

## 0. Meta: Autonomous Context Management

**Proactive Updates:** Claude is responsible for keeping this file current. When a new architectural decision is made, a structural bug is resolved, or a new project standard is established: update `CLAUDE.md` directly without asking permission.

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
- Framework: Next.js 14+ (App Router) with TypeScript
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

4. **Mobile first.** Every interaction must work on a 375px screen. Build mobile layout first, then adapt up.

5. **Accessible by default.** WCAG 2.1 AA compliance is mandatory, not optional:
   - All text: 4.5:1 contrast ratio (3:1 for large text)
   - All interactive elements: keyboard navigable with visible focus indicators
   - All dynamic updates: ARIA live regions
   - All touch targets: minimum 44x44px
   - All forms: visible labels, associated errors
   - Respect `prefers-reduced-motion`

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

### Server-Side Dice
- **All** dice rolls happen on the server using `crypto.getRandomValues()`.
- **Never** roll dice on the client. Results are logged in `CampaignPhaseLog`.
- The client receives the result and displays it — it never generates it.

### Data Isolation
- **Every** database query must be scoped by `campaign_id`.
- Row-Level Security (RLS) policies enforce this at the database level.
- A user in Campaign A must never see data from Campaign B, even through the API.

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
- Accessibility: run `axe-core` checks on new pages/components.

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

- Respond in **English** unless the user explicitly asks for another language.
- Code variables, function names, and comments in English.
- Be concise — no unnecessary summaries at the end of a response.
- When unsure about a game mechanic, reference the Band of Blades rulebook (the PDF is available in the project context) rather than guessing.
- When facing an architectural choice, check if there's a relevant ADR before making a decision. If not, flag it as a potential new ADR.

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
   - Do NOT close the issue — the owner closes it after review
4. **Bugs:** Follow the same lifecycle, even for quick fixes. Create an issue, move it through In Progress → Review.

### Sprint Closure
Before declaring a sprint complete, verify:
- [ ] All sprint issues are in "Done" or "Review" status
- [ ] No sprint issues are still in "In Progress" or "Sprint Backlog"
- [ ] If any issues are in "Review", notify the owner and wait for them to be moved to "Done" before closing the sprint

### Self-Review Before Moving to Review
Before moving any issue to "Review" status, Claude Code must do a self-review:
1. **Re-read the acceptance criteria** of the issue.
2. **Verify each criterion is met** — not just that the code looks correct, but that the feature actually works as intended. For UI issues, this means checking the compiled output (CSS, HTML), not just the source files.
3. **Test the golden path** end-to-end: can a real user complete the intended action?
4. **Check for regressions** in related features.
5. **Only then** move to Review and add the testing comment.

If a criterion cannot be verified (e.g. requires a browser), say so explicitly and describe what the reviewer should check.

### Ask, Don't Assume
When debugging or verifying visual/UI issues:
1. If you cannot programmatically verify something (e.g. "does the background look dark?"), ask the user to check and report back. Don't spend tokens guessing.
2. If you've spent more than 2 attempts fixing the same issue without success, stop and ask the user what they actually see. Request a screenshot if needed.
3. If you're making assumptions about what the user's browser is showing, state the assumption explicitly and ask them to confirm before proceeding.
4. Never assume which branch or deployment the user is looking at. If the fix is on a feature branch but the user might be viewing the production URL (which deploys from main), ask: "Are you looking at localhost, the Vercel production URL, or a preview deployment?" Confirm before debugging further.
5. A quick question costs far fewer tokens than three wrong guesses.

### Commit References
- Always reference the issue number in commit messages: `feat(auth): implement sign-up flow (#3)`
- Use `closes #N` in PR descriptions to auto-close issues on merge, but only after review is complete
