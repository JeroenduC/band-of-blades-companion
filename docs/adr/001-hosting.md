# ADR-001: Hosting Provider

**Status:** Accepted  
**Date:** 2026-04-11  
**Deciders:** Project owner

---

## Context

The app needs a hosting provider for the Next.js frontend and API layer. Supabase handles the database and auth independently. Two options were considered: Vercel and Scaleway.

**Vercel** is optimised for Next.js (same company), deploys automatically from GitHub, and has a generous free tier. It requires no infrastructure configuration to get started.

**Scaleway** is a European cloud provider (France) offering EU data residency. It requires more setup but gives full control over the hosting environment and keeps all data within the EU.

## Decision

Start with **Vercel**. It removes all infrastructure friction during the early sprints when the priority is building and validating features, not managing servers. The free tier covers the project's needs for multiple 6-player campaigns.

The Scaleway evaluation is deferred. If EU data residency becomes a requirement, or if Vercel's free tier limits are hit, this decision will be revisited and a new ADR written.

## Consequences

- Vercel account is linked to the GitHub repo. Pushes to `main` trigger automatic deploys.
- Environment variables (Supabase URL, anon key, service role key) are stored in Vercel's environment variable system, not in the repository.
- `.env.local` is used for local development and is gitignored.
- If the project migrates to Scaleway later, the Next.js app requires no changes — only the hosting configuration changes. The database (Supabase) is independent of this decision.

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| Vercel | Zero config, GitHub integration, free tier, Next.js-optimised | US-based, vendor lock-in risk |
| Scaleway | EU data residency, full control, open infrastructure | More setup, no free tier, more ops work |
