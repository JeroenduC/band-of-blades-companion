# ADR-005: Colour Format — OKLCH

**Status:** Accepted
**Date:** 2026-04-12
**Deciders:** Project owner + Claude Code (Sprint 2)

## Context

During Sprint 2 (Visual Identity & Design System), Claude Code chose OKLCH as the colour format for all design tokens. This was not an explicit architectural decision — it was made implicitly during implementation. This ADR documents the choice retroactively and captures the rationale.

The project needs a colour format for its design tokens that supports:
- Accessible contrast calculation
- A dark theme with warm amber accents
- Manual tweakability by the project owner (who is not a frontend developer)
- Compatibility with Tailwind CSS and modern browsers

## Options Considered

### 1. Hex (#RRGGBB)
- **Pros:** Universally understood, easy to copy from any design tool, works everywhere
- **Cons:** Not perceptually uniform (hard to predict how a colour change affects perceived brightness), no built-in alpha support

### 2. HSL (hue, saturation, lightness)
- **Pros:** More intuitive than hex for manual adjustment ("make it lighter" = increase L), widely supported
- **Cons:** Not perceptually uniform (two colours with the same L value can look very different in brightness)

### 3. OKLCH (lightness, chroma, hue) — chosen
- **Pros:** Perceptually uniform (same lightness value = same perceived brightness), excellent for building accessible palettes, modern CSS standard, makes contrast compliance more predictable
- **Cons:** Numbers are less intuitive to read by hand (e.g. `oklch(0.87 0.028 78)` vs `#C4842D`), less widely known, some older design tools don't export in OKLCH

## Decision

Use OKLCH as the colour format for all design tokens. This was chosen for its perceptual uniformity, which makes it easier to build and maintain an accessible dark theme — colours with the same lightness value actually look equally bright, which simplifies WCAG contrast compliance.

The trade-off in readability is accepted because:
- Colours are defined once in the theme file and referenced everywhere via token names (e.g. `--bob-amber`), so most development never touches the raw values
- Claude Code handles colour adjustments, so the format being less human-readable is less of a barrier
- The perceptual benefits outweigh the readability cost for an accessibility-first project

## Consequences

- All colour tokens in `src/styles/theme.css` use OKLCH format
- If the project owner needs to manually adjust a colour, they can use a converter tool (e.g. oklch.com) or ask Claude Code to make the change
- If OKLCH causes compatibility issues with any future tool or library, this decision can be revisited — converting from OKLCH to hex/HSL is straightforward
- DESIGN_TOKENS.md should include hex equivalents as comments for quick human reference
