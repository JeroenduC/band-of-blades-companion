# Band of Blades — Legion Phase Companion

A web application that digitises the campaign phase of [Band of Blades](https://www.offguardgames.com/bandofblades), the tabletop RPG by John LeBoeuf-Little and Stras Acimovic (Evil Hat Productions). Built to take the bookkeeping off the table and make the Legion phase async, mobile-friendly, and — most importantly — fun.

> **The problem:** The campaign phase at the end of each session involves sequential bookkeeping across five player roles. It's slow, error-prone, and drains the energy built up during the mission.
>
> **The solution:** Players complete the campaign phase between sessions, on their phones, at their own pace. The app handles the arithmetic. Players focus on decisions.

---

## 🚀 Current Status

**Epic 2 — Visual Identity & Design System** ⏳

The app is deployed and functional. Next up: making it look and feel like Band of Blades — design tokens, dark theme, component wrappers, and visual identity.

---

## ✨ Features (Planned)

- **Role-based dashboards** — Commander, Marshal, Quartermaster, Lorekeeper, Spymaster each see their own view
- **Campaign phase workflow** — a guided, step-by-step pipeline with dependencies and parallel tracks
- **Server-side dice rolling** — tamper-proof, logged, with visual feedback
- **Visual clocks** — circular segment clocks matching the paper game aesthetic
- **Async-native** — notifications when it's your turn, summaries of what others did
- **Mobile first** — designed for phones, works on everything
- **Accessible** — WCAG 2.1 AA compliant
- **Themeable** — design token system lets you adjust the entire visual identity
- **Multi-campaign** — multiple groups can use the same instance with complete data isolation

---

## 🛠 Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router), TypeScript |
| Database + Auth | Supabase (PostgreSQL + Row-Level Security) |
| Design System | Shadcn/ui + Radix UI (wrapped in project-owned components) |
| Styling | Tailwind CSS with custom design tokens |
| Hosting | Vercel (initial) |
| Testing | Vitest + axe-core |
| Version Control | GitHub |

---

## 📋 Roadmap

### ✅ Sprint 0: Setup
- [x] Create GitHub repository
- [x] Install Node.js, Git, and Claude Code
- [x] Create Supabase project
- [x] Create Vercel account, link to repo
- [x] Commit Project Brief, CLAUDE.md, and README.md

### ✅ Epic 1: Project Foundation
Next.js 15 app deployed to Vercel. Email/password auth, campaign creation with invite codes, player join flow, GM role assignment, placeholder dashboards for all six roles.

### ⏳ Epic 2: Visual Identity & Design System
The app looks and feels like Band of Blades. Design tokens, themed components, component wrapper layer.

### ⏳ Epic 3: Campaign Phase State Machine
State machine tracks which step of the campaign phase we're in and shows the correct view per role.

### ⏳ Epic 4: Quartermaster Campaign Actions
Liberty, Acquire Assets, R&R, Recruit, Long-Term Projects — with dice rolls and contextual information.

### ⏳ Epic 5: Commander Tools
Time, pressure, intel, advancing, mission selection.

### ⏳ Epic 6: Marshal Tools
Morale, squads, Specialists, mission deployment.

### ⏳ Epic 7: Spymaster Tools
Spy dispatch, assignments, network upgrades.

### ⏳ Epic 8: Lorekeeper Tools
Death tracker, Tales, Back at Camp scenes, Annals.

### ⏳ Epic 9: GM Dashboard & Session Management
Full visibility, mission generation, session prep and notes.

### ⏳ Epic 10: End-of-Phase Summaries
Tailored summaries for every role.

### ⏳ Epic 11: Polish & Quality of Life
Animations, notifications, undo, Google OAuth, Soldier (observer) role.

### ⏳ Epic 12: Shared Universe / Multi-Group Campaigns
Multiple tables, same Legion, same strategic layer.

---

## 📁 Project Structure

```
docs/
  PROJECT_BRIEF.md          # Strategic overview and architecture
  DATA_MODEL.md             # Living database schema
  DESIGN_TOKENS.md          # Visual system reference
  adr/                      # Architecture Decision Records
    001-hosting.md
    002-design-system-portability.md
    003-multi-tenancy.md
    004-licensing.md
  specs/                    # Detailed Epic specifications
    EPIC-01-foundation.md
    EPIC-02-visual-identity.md
    ...
  journal/                  # Sprint retrospectives
    sprint-00-setup.md
    ...
    transcripts/            # Raw conversation archives
src/
  app/                      # Next.js pages and layouts
  components/
    legion/                 # Project-owned component wrappers
    features/               # Feature-specific components
  lib/                      # Shared utilities, state machine, types
  server/                   # Server actions, API logic, dice
  styles/                   # Theme, design tokens, global styles
```

---

## 🏃 Getting Started

> *These instructions will be filled in during Sprint 1 when the project is scaffolded.*

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/band-of-blades-companion.git
cd band-of-blades-companion

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your Supabase URL and keys

# Run the development server
npm run dev
```

---

## 🤝 Contributing

This project is currently in early development. The repository is private. Contribution guidelines and licensing will be established before the project is made public (see ADR-004).

---

## 📖 Acknowledgements

- **Band of Blades** by John LeBoeuf-Little and Stras Acimovic, published by [Evil Hat Productions](https://www.evilhat.com/). This app is a fan-made companion tool and is not affiliated with or endorsed by the creators or publisher.
- **Blades in the Dark** by John Harper, on which Band of Blades is based.
- Built with the help of [Claude](https://claude.ai) by Anthropic.

---

## 📜 License

To be decided. See [ADR-004](docs/adr/004-licensing.md) for the options under consideration. The repository is private until a licensing decision is made.
