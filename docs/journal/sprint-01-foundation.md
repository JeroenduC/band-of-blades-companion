Sprint 1 — Foundation
Date: April 11-12, 2026
Epic: Epic 1 — Project Foundation
Branch: feature/epic-01-foundation
Goal: Deployed app with auth, invite flow, and placeholder dashboard.
What Was Built

Next.js 15 project with TypeScript, Tailwind CSS, Shadcn/ui
Supabase auth (email/password sign-up and sign-in)
Database schema: Campaign, User (profiles), CampaignMembership, Session
Row-Level Security policies on all tables
GM campaign creation with invite code
Player join flow and GM role assignment (including deputy)
Role-specific dashboard routing (Commander, Marshal, QM, Lorekeeper, Spymaster, GM)
Deployed to Vercel with auto-deploy from GitHub

Key Decisions

Downgraded from Next.js 16 to 15 due to Vercel routing incompatibility with Turbopack middleware
Added vercel.json with framework: "nextjs" to fix Vercel output detection
ADR-001 (Hosting) written — Vercel as starting choice

Lessons Learned

Next.js 16 is too new for Vercel's production routing — stick with 15 for now
Always verify the live URL before closing an epic, not just the build log
Environment variables must be set for All Environments in Vercel
middleware.ts naming matters — Next.js 15 uses middleware.ts, 16 tried to rename to proxy.ts

What's Next
Sprint 2: Epic 2 — Visual Identity & Design System
