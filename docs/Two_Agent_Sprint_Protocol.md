# Two-Agent Sprint Protocol

**Version:** 1.0
**Date:** April 2026
**Purpose:** Define the workflow for using two AI coding agents (Claude Code as Senior Developer, Gemini CLI as Junior Developer) to maximise efficiency and minimise token usage.

---

## Agents Overview

| | **Claude Code (Senior Dev)** | **Gemini CLI (Junior Dev)** |
|---|---|---|
| **Config file** | CLAUDE.md | GEMINI.md |
| **Cost** | High (Claude Pro tokens) | Low (Gemini free tier: 1,000 req/day) |
| **Strengths** | Architecture, complex multi-file changes, game logic, debugging, security, retrospectives | Issue creation, file preparation, easy issues, testing, screenshots, PRs, documentation |
| **When to use** | When the task requires judgement, deep codebase understanding, or touches critical systems | When the task follows a clear pattern, has explicit instructions, or is routine |

---

## Sprint Lifecycle

### Phase 1: Planning (You + Planning Claude)

**Who:** You + Claude (claude.ai desktop app)
**Output:** Sprint markdown file with all issues

1. You and Planning Claude discuss what to build
2. Planning Claude writes the sprint issues markdown with titles, descriptions, labels, and acceptance criteria
3. You download the markdown file

---

### Phase 2: Issue Creation & Preparation (Gemini CLI)

**Who:** Gemini CLI
**Branch:** Still on main (issues only, no code yet)

**Prompt for Gemini:**
```
Read the Sprint N issues from [file/paste]. For each issue:
1. Create a GitHub issue with the title, description, labels, and milestone specified
2. Add a preparation comment to each issue listing:
   - Which files probably need to be created or modified
   - Which existing logic or components are relevant
   - A brief approach suggestion
3. Categorise each issue as EASY or HARD:
   - EASY: single-file changes, documentation, simple UI tweaks, tests, data seeding
   - HARD: multi-file features, state machine changes, database schema, server actions, dice mechanics, security
4. Add the label "complexity:easy" or "complexity:hard" to each issue
5. Move all issues to Sprint Backlog on the project board
```

**Output:** All issues created, prepared, and categorised on GitHub

---

### Phase 3: Feature Branch Creation (Gemini CLI)

**Who:** Gemini CLI
**Prompt:**
```
Create the feature branch for this sprint: feature/epic-NN-name
Switch to it and push it to origin.
```

---

### Phase 4: Easy Issues (Gemini CLI)

**Who:** Gemini CLI
**Branch:** feature/epic-NN-name

**Prompt:**
```
Work through all issues labelled "complexity:easy" in the Sprint N milestone, one at a time.
For each issue:
1. Move it to In Progress on the project board
2. Implement the changes following all rules in CLAUDE.md and GEMINI.md
3. Run npm run build — fix any errors before continuing
4. Commit with message referencing the issue: type(scope): description (#NN)
5. Move the issue to Review on the project board, assign to JeroenduC, add a testing comment
6. Move to the next easy issue

Do NOT touch any files listed in GEMINI.md under "What NOT To Do".
If you encounter something unexpected or complex, stop and flag it as HARD.
Push all commits when done.
```

**Output:** All easy issues committed and in Review

---

### Phase 5: Hard Issues (Claude Code)

**Who:** Claude Code
**Branch:** feature/epic-NN-name (pull first!)

**Prompt:**
```
Pull the latest from the feature branch — Gemini has completed the easy issues.
Now work through all issues labelled "complexity:hard" in the Sprint N milestone.
Follow the standard workflow: In Progress → implement → self-review → Review.
```

**Critical:** Claude Code must `git pull` before starting, to get Gemini's commits.

**Output:** All hard issues committed and in Review

---

### Phase 6: Testing (Gemini CLI)

**Who:** Gemini CLI
**Branch:** feature/epic-NN-name (pull first!)

**Prompt:**
```
Pull the latest from the feature branch. Run a full quality check on all Sprint N work:

1. npm run build — must pass with zero errors
2. npm test — run all unit tests, report results
3. npm run a11y — run accessibility audit on all pages, report violations
4. Take Playwright screenshots of all pages that were changed this sprint
5. Review each Sprint N issue's acceptance criteria and check whether each criterion is met

For each issue, add a comment on GitHub:
- ✅ PASSES: [list of criteria that pass]
- ❌ FAILS: [list of criteria that fail, with details of what's wrong]

Do NOT fix anything yourself. Just report what passes and what fails.
```

**Output:** Test report comments on all issues

---

### Phase 7: Fixes (Claude Code)

**Who:** Claude Code
**Branch:** feature/epic-NN-name

**Prompt:**
```
Gemini has tested all Sprint N issues. Review the test comments on GitHub.
Fix all issues that have ❌ FAILS criteria. Run the build and tests after each fix.
Update the issue comments when fixes are applied.
```

**Output:** All issues passing

---

### Phase 8: Final Review (You)

**Who:** You (the human)

1. Check the Vercel preview deployment (or run locally)
2. Test key flows on mobile and desktop
3. Verify visual quality matches the Band of Blades aesthetic
4. Close any issues you're happy with
5. Flag any issues that need more work

---

### Phase 9: Sprint Closure (Both Agents)

**Gemini prepares, Claude Code completes.**

**Prompt for Gemini:**
```
Prepare the sprint closure:
1. List all commits made during this sprint with files changed
2. List all issues and their final status
3. Count: files changed, lines added/removed, commits made
4. Create the PR from feature/epic-NN-name to main
5. Update README.md — mark this sprint as completed
```

**Prompt for Claude Code:**
```
Gemini has prepared the sprint closure data. Now:
1. Write the sprint retrospective (review token efficiency, long-term solutions, accessibility, mistakes)
2. Update CLAUDE.md with any new rules from the retrospective (only if genuinely useful)
3. Create the sprint journal at docs/journal/sprint-NN-name.md
4. Verify the Definition of Done checklist is fully satisfied
5. Confirm the sprint is ready to close
```

---

## Conflict Prevention Rules

These rules are non-negotiable. Violating them causes Git conflicts and wasted time.

1. **Sequential, not parallel.** Gemini finishes ALL easy issues before Claude Code starts on hard issues. Never run both agents on the same branch simultaneously.
2. **Always pull before starting.** Both agents must `git pull` before beginning any work to get the latest state.
3. **File ownership.** If an easy issue and a hard issue both touch the same file, the easy issue becomes HARD and is left for Claude Code.
4. **One branch per sprint.** Both agents work on the same feature branch. No sub-branches.
5. **Gemini doesn't fix, Claude Code fixes.** During testing (Phase 6), Gemini reports but does not fix. Claude Code makes the fixes to maintain architectural consistency.

---

## When to Override the Protocol

- **Tiny sprint (< 5 issues):** Skip Gemini, do everything with Claude Code. The overhead of switching agents isn't worth it.
- **All issues are HARD:** Skip Gemini's coding phase (Phase 4), but still use Gemini for issue creation, testing, and PR.
- **Emergency bug fix:** Go straight to Claude Code on main. Don't wait for the protocol.
- **Token emergency:** If Claude Code tokens are depleted mid-sprint, Gemini can attempt HARD issues with explicit instructions, but flag the work for Claude Code review next session.

---

## Token Budget Guidelines

| Agent | Task Type | Estimated Token Cost |
|---|---|---|
| Gemini | Create 10 GitHub issues | ~Free (well within daily limit) |
| Gemini | Prepare issues with file analysis | ~Free |
| Gemini | 5 easy issues (single-file each) | ~Free |
| Gemini | Full test suite + a11y + screenshots | ~Free |
| Gemini | Create PR + update README | ~Free |
| Claude Code | 5 hard issues | Moderate (bulk of sprint token usage) |
| Claude Code | Fix test failures | Low-moderate |
| Claude Code | Retrospective + journal | Low |

**Target:** Reduce Claude Code usage by 40-60% compared to single-agent sprints by offloading routine work to Gemini.

---

## Checklist: Before Starting a Sprint

- [ ] Sprint issues markdown ready (from Planning Claude)
- [ ] Gemini CLI is installed and authenticated (`gemini` in terminal)
- [ ] Claude Code is ready (`claude` in terminal)
- [ ] Both agents can access GitHub (`gh issue list` works)
- [ ] Previous sprint is fully closed (merged to main, branch deleted)
- [ ] `.env.local` exists with correct Supabase credentials
- [ ] `npm run build` passes on main before branching
