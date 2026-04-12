Sprint 2 — Visual Identity & Design System
Date: April 12, 2026
Epic: Epic 2 — Visual Identity & Design System
Branch: feature/epic-02-visual-identity
Goal: Full dark military design system with accessible components, typography, icons, and documented tokens.

## What Was Built

- Design token system in `src/styles/theme.css` — OKLCH colour palette (amber, danger, success, backgrounds, text, borders) plus spacing, radius, and shadow scales
- Tailwind v4 `@theme inline` bridge in `globals.css` — semantic `legion-*` utility classes backed by CSS custom properties
- Typography: Cinzel (headings) + Crimson Pro (body) + JetBrains Mono (mono) via `next/font/google`
- Shadcn/ui component wrappers: `LegionButton`, `LegionCard`, `LegionInput`, `LegionDialog`, `LegionBadge`, `LegionToaster`
- `LegionIcon` — Lucide React wrapper with 30 named icons and auto `aria-hidden` for decorative use
- `LegionClock` — SVG donut-segment clock for pressure/morale tracking (arbitrary segment counts, gap angles, three sizes)
- `ActionCard` — selectable campaign action card with amber left-bar selection indicator and keyboard semantics (`role="radio"`, `aria-checked`)
- `DecisionCard` — binary/multi-option decision card with context strip and stacked/inline layout
- Grain/texture utilities (`.grain-base`, `.grain-surface`) via CSS `feTurbulence` SVG filter pseudo-elements
- Styled login page (`AuthShell`) — two-panel atmospheric layout (brand panel left desktop, header top mobile)
- `axe-core` accessibility audit script (`scripts/a11y-audit.ts`) runnable via `npm run a11y`
- `docs/DESIGN_TOKENS.md` — full 7-section design system reference with emoji icon inventory
- `docs/adr/002-design-system-portability.md` — ADR-002 documenting the component wrapper pattern
- Playwright integration for automated screenshots (`npm run screenshot`)
- CLAUDE.md updates: Sprint Retrospective rule (§11), Accessible Forms guidelines (§12), Development Journal rule

## Key Decisions

- **Token abstraction (ADR-002):** All Shadcn components wrapped behind `Legion*` wrappers — Shadcn is a dependency detail, not a public API. This prevents feature code from coupling to Shadcn naming.
- **OKLCH colour space:** Perceptually uniform; makes hover/active states trivial (`lightness ±5%`). No raw Tailwind palette classes permitted anywhere.
- **Dark-only theme:** No light mode. The `.dark` selector mirrors `:root` so Shadcn dark: variants resolve, but there is no toggle.
- **Server-side dice rule formalised:** All dice rolls via `crypto.getRandomValues()` on the server only — no client-side randomness.
- **Grain texture via CSS only:** No image assets; SVG `feTurbulence` filter inlined as a data URI pseudo-element keeps the texture zero-cost and always available.

## Blockers & Fixes

- **Zombie process false positives:** Windows stale Next.js servers on occupied ports caused screenshots and a11y audits to silently target old HTML. Fixed by hardening the audit script to verify `lang="en"` in served HTML before running axe, and documenting `npx kill-port` as the required pre-step.
- **`aria-hidden` does not exempt visible text from contrast:** axe-core still checks visual contrast on `aria-hidden` elements. Fixed by using `text-legion-text-muted` (not `text-legion-text-faint`) for decorative text that's actually rendered.
- **Link distinguishability (WCAG 1.4.1):** Auth links were `hover:underline` only — fails the "not colour alone" requirement. Fixed by switching to permanent `underline underline-offset-4`.
- **`Horse` icon missing from Lucide:** Build error. Replaced with `Footprints` (cavalry movement metaphor) and added a code comment explaining the substitution.
- **Duplicate import after icon fix:** Editing the icon map left a duplicate `Footprints` import line. Fixed immediately; now a known gotcha when editing the icon registry.

## What's Next

Sprint 3: Epic 3 — Campaign Phase State Machine (states, transitions, GM controls, dice rolling)
