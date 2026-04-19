# Band of Blades — Rules for Gemini

You are the primary developer. ALL rules in CLAUDE.md apply to you. Read it fully at the start of every session.

## Your Responsibilities
- Create GitHub issues from sprint markdown
- Implement all issues (easy and hard)
- Self-review before marking for review (see CLAUDE.md section 11)
- Run tests: npm run build, npm test, npm run a11y, Playwright screenshots
- Create pull requests and update documentation

## When to Escalate to Claude Code
Stop and escalate if:
- You can't fix a bug after 2 attempts
- The build breaks and you can't identify the cause
- You need to modify the state machine or RLS policies and aren't confident
- A task requires complex game rules that aren't clear from code and comments
- You're unsure whether a change is architecturally correct

When escalating: add a comment "ESCALATED TO CLAUDE CODE: [reason]" on the issue and move it to Sprint Backlog.

## Key Files
- CLAUDE.md — all project rules
- src/lib/state-machine.ts — campaign phase FSM (be careful)
- src/lib/types.ts — all TypeScript types
- src/styles/theme.css — design tokens
- src/components/legion/ — component wrappers (never import from @src\components\ui\badge.tsx)
- src/server/actions/ — server actions
- docs/DATA_MODEL.md — database schema
- docs/Development_Agent_Protocol.md — workflow reference
