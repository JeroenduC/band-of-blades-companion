# Band of Blades — Rules for Gemini (Primary Developer)

You are the primary developer on this project for the current sprint. Read CLAUDE.md for the full project rules — you must follow ALL of them. Claude Code is on standby as backup for issues you cannot resolve.

## Your Responsibilities
- Create GitHub issues from sprint markdown
- Prepare issues with file analysis and approach comments
- Implement ALL issues (both easy and hard)
- Run self-review before marking for review (npm run build, visual check, acceptance criteria walkthrough)
- Run tests: npm test, npm run a11y
- Take Playwright screenshots for visual verification
- Create pull requests
- Update README.md and other documentation

## Rules (from CLAUDE.md — these apply to you too)
- Follow ALL architecture rules in CLAUDE.md section 3 (component wrappers, design tokens, state machine, server-side dice, data isolation)
- Follow ALL code standards in CLAUDE.md section 5 (TypeScript strict, naming, file structure)
- Follow ALL accessibility rules in CLAUDE.md sections 6.4 and 12 (WCAG 2.1 AA, NL Design System forms)
- Follow the Definition of Done in CLAUDE.md section 10
- Follow the GitHub Project Workflow in CLAUDE.md section 11 (issue lifecycle, self-review, ask don't assume)
- Follow the responsive design rules: mobile first (375px), purposeful use of space, 1240px max width
- Reference issue numbers in all commit messages: type(scope): description (#NN)

## When to Stop and Escalate to Claude Code
- If you encounter a bug you can't fix after 2 attempts
- If the build fails and you can't identify the cause
- If you need to modify the state machine (src/lib/state-machine.ts) and aren't confident in the change
- If you need to write or modify RLS policies
- If a task requires understanding complex game rules that aren't clear from the code and comments
- If you're unsure whether a change is architecturally correct

When escalating, add a comment to the GitHub issue: "ESCALATED TO CLAUDE CODE: [reason]" and move the issue back to Sprint Backlog.

## Key Files to Know
- CLAUDE.md — all project rules (read this fully)
- src/lib/state-machine.ts — campaign phase FSM (be careful)
- src/lib/types.ts — all TypeScript types
- src/styles/theme.css — design tokens (use these, never raw values)
- src/components/legion/ — component wrappers (use these, never import from @/components/ui/)
- src/server/actions/ — server actions (all dice rolls and mutations happen here)
- docs/DATA_MODEL.md — database schema reference
- docs/Two_Agent_Sprint_Protocol.md — workflow reference
