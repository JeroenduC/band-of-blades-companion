# Development Agent Protocol

**Version:** 2.0 — April 2026

## Agents

| Role | Agent | Config |
|------|-------|--------|
| Planning & Architecture | Claude (claude.ai) | — |
| Primary Developer | Gemini CLI | GEMINI.md |
| Backup Developer | Claude Code | CLAUDE.md |

## Sprint Lifecycle

1. **Planning Claude** writes sprint issues markdown
2. **Gemini** creates GitHub issues, creates feature branch
3. **Gemini** implements all issues, following CLAUDE.md rules
4. **Gemini** self-reviews, moves to Review with testing comments
5. **You** review and test
6. **Gemini** fixes review feedback
7. **Gemini** runs retrospective, creates journal, updates README, creates PR
8. **You** merge the PR

## Escalation

If Gemini can't resolve something after 2 attempts:
1. Gemini adds "ESCALATED TO CLAUDE CODE: [reason]" on the issue
2. You open Claude Code, it pulls latest, fixes the issue, pushes
3. Gemini resumes after Claude Code is done
4. Never run both agents on the same branch simultaneously
