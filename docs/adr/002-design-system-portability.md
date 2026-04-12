# ADR-002: Design System Portability — Component Wrapper Pattern

**Status:** Accepted  
**Date:** 2026-04-12  
**Deciders:** Project owner

---

## Context

The app uses Shadcn/ui as its component library, which is built on Radix UI primitives and styled with Tailwind CSS. Shadcn components are copied directly into the project (not imported from a package), which means updates are manual and the library is deeply embedded in the codebase.

Without a deliberate strategy, feature and page code would import components directly from `src/components/ui/` — tightly coupling every screen to Shadcn's API surface. Swapping or significantly modifying the library later would require touching every file that imports from it.

Additionally, the design tokens need to be independent of which component library is in use. The app's visual identity (colour, typography, spacing, shadows) must survive any component library change without a full redesign.

---

## Decision

**1. All UI primitives are wrapped behind a project-owned component layer.**

Every Shadcn component is re-exported through a `LegionXxx` wrapper in `src/components/legion/`. Feature and page code imports exclusively from `@/components/legion` — never from `@/components/ui/` directly.

Example:
```tsx
// ✅ Correct — goes through the wrapper seam
import { LegionButton } from '@/components/legion';

// ❌ Wrong — tightly couples feature code to Shadcn's API
import { Button } from '@/components/ui/button';
```

Wrappers may be thin pass-throughs (like `LegionBadge`) or may apply project-specific defaults (like `LegionButton` enforcing 44px touch targets).

**2. All visual values are defined as design tokens in a single CSS file.**

`src/styles/theme.css` is the only place where colour, typography, spacing, radius, and shadow values are defined. Components reference tokens via CSS custom properties — they never use raw values like `bg-zinc-900` or `#1a1714`.

Tailwind's `@theme inline` block in `globals.css` maps tokens to utility classes, keeping component code readable while keeping the actual values in one place.

---

## Consequences

### Positive

- **Swappable library:** To replace Shadcn with another library, only the wrapper files in `src/components/legion/` need to change. All feature code continues to import from `@/components/legion` without modification.
- **Consistent defaults:** Project-wide requirements (touch targets, focus rings, token-based colours) are enforced once in the wrapper layer, not repeated across every usage.
- **Design token isolation:** Changing the visual theme — colours, fonts, radii — requires editing `src/styles/theme.css` only. No component or feature file needs to change.
- **Documented seam:** New contributors know exactly where the library boundary is. The rule is simple: if it's UI, it goes through `legion/`.

### Negative / Trade-offs

- **Indirection:** There is one extra layer of files to navigate. A developer looking for `Button` must know to look for `LegionButton` in `legion/`.
- **Wrapper maintenance:** When Shadcn adds new components or significantly changes an API, the corresponding wrapper must be updated before the feature can use it.
- **Thin wrappers feel ceremonial:** Many wrappers (e.g. `LegionBadge`) are one-line re-exports. The overhead feels low-value until a library swap actually happens — at which point it pays off significantly.

---

## What Would Change in a Library Swap

If Shadcn/ui were replaced with, say, Radix Themes or a custom component set:

1. **`src/components/ui/`** — replaced wholesale with the new library's files
2. **`src/components/legion/*.tsx`** — updated to import from the new library; API differences handled here (prop renaming, different variant names, etc.)
3. **`src/styles/theme.css`** — unchanged; token values remain the same
4. **`src/app/globals.css`** — potentially minor updates if the new library uses different CSS variable conventions
5. **All feature and page code** — unchanged; still imports from `@/components/legion`

---

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Wrapper layer (chosen)** | Portable, enforceable, single seam | One extra indirection layer |
| Direct Shadcn imports | Less ceremony, faster to write | Full library lock-in, painful to migrate |
| CSS Modules + headless primitives | Maximum control, no library dependency | Much more work to build and maintain |
