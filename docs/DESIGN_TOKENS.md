# Band of Blades — Design Tokens Reference

> **Single source of truth:** `src/styles/theme.css`
> All token values live there. This document is the human-readable reference.
> When a token changes, update both files.

---

## Table of Contents

1. [Colour Tokens](#1-colour-tokens)
2. [Typography Tokens](#2-typography-tokens)
3. [Spacing & Shape Tokens](#3-spacing--shape-tokens)
4. [Elevation & Shadows](#4-elevation--shadows)
5. [Component Wrapper Inventory](#5-component-wrapper-inventory)
6. [Icon Inventory](#6-icon-inventory)
7. [Accessibility Reference](#7-accessibility-reference)

---

## 1. Colour Tokens

All colours are defined in **OKLCH** for perceptual uniformity. Hex values
below are approximate sRGB equivalents for quick visual reference.

### 1.1 Backgrounds

Deep charcoal hierarchy — evokes a command tent at night.

| Token | OKLCH | Approx. hex | Purpose |
|---|---|---|---|
| `--bob-bg-base` | `oklch(0.14 0.010 50)` | `#1a1714` | Page background — darkest layer |
| `--bob-bg-surface` | `oklch(0.19 0.012 52)` | `#231f1b` | Cards, panels, brand panel |
| `--bob-bg-elevated` | `oklch(0.23 0.012 52)` | `#2b2622` | Dropdowns, modals, tooltips |
| `--bob-bg-overlay` | `oklch(0.28 0.012 52)` | `#352f2a` | Hover states, selected rows |

**Usage:**
- Page-level backgrounds → `bg-background` (maps to `--bob-bg-base`)
- Cards and content surfaces → `bg-card` or `bg-legion-bg-surface`
- Elevated UI (dialogs, dropdowns) → `bg-legion-bg-elevated`

### 1.2 Text

Warm parchment palette — evokes field journals and orders of the day.

| Token | OKLCH | Approx. hex | Purpose | Min contrast on bg-base |
|---|---|---|---|---|
| `--bob-text-primary` | `oklch(0.87 0.028 78)` | `#e8d9b8` | Body text, headings, labels | ≈ 13:1 ✓ |
| `--bob-text-muted` | `oklch(0.64 0.018 62)` | `#a89070` | Secondary text, descriptions, metadata | ≈ 7:1 ✓ |
| `--bob-text-faint` | `oklch(0.46 0.012 58)` | `#6e5f50` | Disabled text, placeholders | ≈ 4.5:1 ✓ |

> **⚠ WCAG warning — `--bob-text-faint`:** This token only clears 4.5:1 against
> `--bob-bg-base`. Against lighter surfaces (`--bob-bg-surface`, `--bob-bg-elevated`)
> it falls **below** WCAG AA for small text. Only use it for:
> - Truly decorative visible text (with `aria-hidden="true"`)
> - Disabled/placeholder states (which have a WCAG contrast exemption)
>
> For captions, metadata, or any readable secondary text → use `--bob-text-muted`.

### 1.3 Accent — Amber / Gold

The Legion's colour. Signals interactivity, emphasis, and primary actions.

| Token | OKLCH | Approx. hex | Purpose |
|---|---|---|---|
| `--bob-amber` | `oklch(0.71 0.145 73)` | `#c99a3a` | Primary interactive accent, buttons, links |
| `--bob-amber-hover` | `oklch(0.77 0.145 73)` | `#d9af52` | Amber on hover |
| `--bob-amber-muted` | `oklch(0.56 0.082 70)` | `#8c7040` | Ghost/secondary button tint |
| `--bob-amber-fg` | `oklch(0.14 0.010 50)` | `#1a1714` | Text **on** amber backgrounds (dark) |

**Usage:**
- Primary buttons → `bg-primary` (maps to `--bob-amber`)
- Text links in body copy → `text-legion-amber`; always add `underline` for WCAG 1.4.1
- Focus rings → see `--bob-border-focus`

### 1.4 Semantic — Danger

Desaturated blood-red. Used for death, injury, and failed rolls.

| Token | OKLCH | Approx. hex | Purpose |
|---|---|---|---|
| `--bob-danger` | `oklch(0.48 0.130 22)` | `#8c2c1e` | Destructive actions, error states |
| `--bob-danger-hover` | `oklch(0.54 0.130 22)` | `#a33322` | Danger on hover |
| `--bob-danger-subtle` | `oklch(0.22 0.060 22)` | `#2e1410` | Danger surface tint (e.g. confirm dialogs) |
| `--bob-danger-fg` | `oklch(0.92 0.010 50)` | `#eee8e0` | Text on danger backgrounds |

### 1.5 Semantic — Success & Warning

| Token | OKLCH | Approx. hex | Purpose |
|---|---|---|---|
| `--bob-success` | `oklch(0.52 0.092 145)` | `#3a7a4a` | Completed missions, recovered resources |
| `--bob-success-fg` | `oklch(0.92 0.010 50)` | `#eee8e0` | Text on success backgrounds |
| `--bob-warning` | `oklch(0.65 0.140 75)` | `#b88a2a` | Low supplies, pressure escalation |
| `--bob-warning-fg` | `oklch(0.14 0.010 50)` | `#1a1714` | Text on warning backgrounds |

### 1.6 Borders

| Token | OKLCH | Purpose |
|---|---|---|
| `--bob-border` | `oklch(1 0 0 / 12%)` | Default subtle border (`rgba(255,255,255,0.12)`) |
| `--bob-border-strong` | `oklch(1 0 0 / 25%)` | Stronger border for inputs and active containers |
| `--bob-border-focus` | `oklch(0.71 0.145 73)` | Focus ring — matches amber accent |

**Input border note:** Form inputs use `--bob-border-strong` (25% white) for
clearly visible field outlines against dark backgrounds. This exceeds the 3:1
minimum contrast requirement for UI components (WCAG 1.4.11).

### 1.7 Tailwind Utility Classes

These are the Tailwind classes generated from the tokens above. Use these in
component and feature code — never use raw OKLCH/hex values directly.

| Class | Maps to |
|---|---|
| `bg-legion-bg-base` | `--bob-bg-base` |
| `bg-legion-bg-surface` | `--bob-bg-surface` |
| `bg-legion-bg-elevated` | `--bob-bg-elevated` |
| `bg-legion-bg-overlay` | `--bob-bg-overlay` |
| `text-legion-text-primary` | `--bob-text-primary` |
| `text-legion-text-muted` | `--bob-text-muted` |
| `text-legion-text-faint` | `--bob-text-faint` ⚠ (see warning above) |
| `text-legion-amber` | `--bob-amber` |
| `text-legion-danger` | `--bob-danger` |
| `text-legion-danger-subtle` | `--bob-danger-subtle` |
| `text-legion-success` | `--bob-success` |
| `text-legion-warning` | `--bob-warning` |
| `border-legion-border-focus` | `--bob-border-focus` |

---

## 2. Typography Tokens

### 2.1 Font Families

Loaded via `next/font/google` in `src/app/layout.tsx` and set as CSS variables
on `<html>`. Tokens in `theme.css` reference those variables.

| Token | Font | CSS variable | Purpose |
|---|---|---|---|
| `--bob-font-heading` | **Cinzel** | `--font-cinzel` | All headings (`h1`–`h4`), brand title, form section headers. Classical Roman letterforms — martial and authoritative. |
| `--bob-font-body` | **Geist Sans** | `--font-geist-sans` | Body text, labels, UI copy. Clean and readable at small sizes. |
| `--bob-font-mono` | **Geist Mono** | `--font-geist-mono` | Regiment tags, code, reference numbers. |

**Tailwind utilities:** `font-heading`, `font-sans`, `font-mono`

**Base rule:** `h1`–`h4` elements automatically receive `font-family: var(--bob-font-heading)` via the global base styles in `globals.css`. Use the `font-heading` utility class for non-heading elements that need Cinzel (e.g. regiment labels, form section headings styled as `<p>`).

### 2.2 Type Scale

| Token | Size | Tailwind class | Typical use |
|---|---|---|---|
| `--bob-text-xs` | 12px | `text-legion-xs` | Captions, regiment tags, badges |
| `--bob-text-sm` | 14px | `text-legion-sm` | Labels, secondary copy |
| `--bob-text-base` | 16px | `text-legion-base` | Body text |
| `--bob-text-lg` | 18px | `text-legion-lg` | Slightly emphasised body |
| `--bob-text-xl` | 20px | `text-legion-xl` | Section leads |
| `--bob-text-2xl` | 24px | `text-legion-2xl` | h4, card titles |
| `--bob-text-3xl` | 30px | `text-legion-3xl` | h3 |
| `--bob-text-4xl` | 36px | `text-legion-4xl` | h2 |
| `--bob-text-5xl` | 48px | `text-legion-5xl` | h1, hero titles |

### 2.3 Font Weights

Cinzel is loaded at weights 400, 600, 700, and 900. Use deliberately:
- `font-normal` (400) — body-weight Cinzel for subtitles and captions
- `font-semibold` (600) — section headings
- `font-bold` (700) — primary headings
- `font-black` (900) — hero titles and brand lockup only

---

## 3. Spacing & Shape Tokens

### 3.1 Border Radius

Military precision — slightly softened, never fully rounded.

| Token | Value | Purpose |
|---|---|---|
| `--bob-radius-sm` | `3px` | Tags, small badges |
| `--bob-radius-md` | `5px` | Buttons, inputs, small cards |
| `--bob-radius-lg` | `8px` | Cards, panels |
| `--bob-radius-xl` | `12px` | Dialogs, large modals |

**Tailwind utilities:** `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`
(mapped in `globals.css` via `--radius-*` → `--bob-radius-*`).

### 3.2 Touch Target

| Token | Value | Purpose |
|---|---|---|
| `--bob-touch-target` | `44px` | Minimum interactive area — WCAG 2.5.5 |

All interactive components (`LegionButton` default and lg sizes, `LegionInput`)
enforce this via `min-h-[var(--bob-touch-target)]`.

---

## 4. Elevation & Shadows

Dark, dramatic shadows that help surfaces read against the dark background.

| Token | Value | Purpose |
|---|---|---|
| `--bob-shadow-sm` | `0 1px 3px oklch(0 0 0 / 50%)` | Subtle lift — inline elements, chips |
| `--bob-shadow-md` | `0 4px 12px oklch(0 0 0 / 60%)` | Cards, panels — standard elevation |
| `--bob-shadow-lg` | `0 8px 24px oklch(0 0 0 / 70%)` | Dialogs, popovers — high elevation |

**Usage:** Apply via `shadow-[var(--bob-shadow-md)]` etc. (Tailwind arbitrary value syntax). Cards use `--bob-shadow-md` by default.

---

## 5. Component Wrapper Inventory

All project UI components live in `src/components/legion/` and are imported
from `@/components/legion`. **Never import from `@/components/ui/` directly**
in feature or page code (see ADR-002).

### LegionButton
- **Wraps:** `src/components/ui/button.tsx` (Base UI primitive)
- **Variants:** `default` (amber), `outline`, `secondary`, `ghost`, `destructive`, `link`
- **Sizes:** `default` (44px min-h), `sm` (36px), `lg` (44px min-h), `xs`, `icon`, `icon-sm`, `icon-xs`, `icon-lg`
- **Project defaults:** 44px minimum touch target enforced on `default` and `lg` sizes
- **When to use:** All interactive buttons throughout the app

### LegionInput
- **Wraps:** `src/components/ui/input.tsx` (Shadcn)
- **Props:** Standard `React.ComponentProps<'input'>`
- **Project defaults:** Full-width; amber focus ring via `--bob-border-focus`; strong border via `--bob-border-strong`
- **When to use:** All single-line text inputs in forms

### LegionCard / LegionCardHeader / LegionCardTitle / LegionCardDescription / LegionCardContent / LegionCardFooter / LegionCardAction
- **Wraps:** `src/components/ui/card.tsx` (Shadcn)
- **Sizes:** `default`, `sm` (tighter padding/gap)
- **Project defaults:** `--bob-shadow-md` elevation, `--bob-bg-surface` background, subtle ring
- **When to use:** All content cards — mission cards, resource cards, action decision cards

### LegionDialog / LegionDialogTrigger / LegionDialogContent / LegionDialogHeader / LegionDialogTitle / LegionDialogDescription / LegionDialogFooter / LegionDialogClose
- **Wraps:** `src/components/ui/dialog.tsx` (Radix UI / Shadcn)
- **When to use:** Any modal requiring a decision or confirmation. Treat modals as high-stakes moments — use them deliberately.

### LegionBadge
- **Wraps:** `src/components/ui/badge.tsx` (Shadcn)
- **When to use:**
  - Role labels: `COMMANDER`, `MARSHAL`, `QUARTERMASTER`, `LOREKEEPER`, `SPYMASTER`, `ROOKIE`
  - Mission status: `ACTIVE`, `COMPLETED`, `FAILED`
  - Resource state: `LOW`, `CRITICAL`

### LegionToaster
- **Wraps:** Sonner toast primitive
- **When to use:** Non-blocking feedback messages (action confirmed, error occurred). Positioned bottom-right.

---

## 6. Icon Inventory

**Library:** [Lucide React](https://lucide.dev/) v1.8 — simple, bold line icons.
**Wrapper:** `LegionIcon` in `src/components/legion/legion-icon.tsx`
**Import:** `import { LegionIcon } from '@/components/legion'`

Never import from `lucide-react` directly in feature code. Use `LegionIcon` with a semantic `name` prop.

```tsx
// Decorative (alongside visible text — aria-hidden applied automatically)
<LegionIcon name="commander" />

// Meaningful standalone icon — must have aria-label
<LegionIcon name="pressure" size={20} aria-label="Pressure level" />
```

### Role Icons

| Icon | Name | Lucide icon | Legion role |
|:---:|---|---|---|
| 👑 | `commander` | `Crown` | Commander |
| ⚔️ | `marshal` | `Swords` | Marshal |
| 📦 | `quartermaster` | `Package` | Quartermaster |
| 📖 | `lorekeeper` | `BookOpen` | Lorekeeper |
| 👁️ | `spymaster` | `Eye` | Spymaster |
| 🛡️ | `rookie` | `Shield` | Rookie / generic soldier |

### Resource Icons

| Icon | Name | Lucide icon | Resource |
|:---:|---|---|---|
| 🌾 | `food` | `Wheat` | Food supplies |
| 👣 | `horses` | `Footprints` | Horses (no horse icon in Lucide; footprints suggest cavalry movement) |
| 🗃️ | `supply` | `Box` | General supply |
| 🔥 | `black-shot` | `Flame` | Black shot / munitions |

### Action Icons

| Icon | Name | Lucide icon | Action |
|:---:|---|---|---|
| ➡️ | `advance` | `ArrowRight` | Advance / march |
| 🧑‍🤝‍🧑 | `recruit` | `UserPlus` | Recruit soldiers |
| 🔓 | `liberty` | `Unlock` | Liberty campaign action |

### Status Icons

| Icon | Name | Lucide icon | Meaning |
|:---:|---|---|---|
| ⭕ | `clock` | `Circle` | Clock segment placeholder |
| 🎚️ | `pressure` | `Gauge` | Pressure level |
| ❤️ | `morale` | `Heart` | Morale |
| ⚠️ | `warning` | `AlertTriangle` | Warning / low resource |
| ✅ | `success` | `CheckCircle2` | Completed / success |
| ❌ | `failed` | `XCircle` | Failed / dead |

### Navigation & UI Icons

| Icon | Name | Lucide icon | Use |
|:---:|---|---|---|
| › | `chevron-right` | `ChevronRight` | Forward navigation |
| ‹ | `chevron-left` | `ChevronLeft` | Back navigation |
| ˅ | `chevron-down` | `ChevronDown` | Expand / dropdown |
| ✕ | `close` | `X` | Close / dismiss |
| ➕ | `add` | `Plus` | Add item |
| ➖ | `remove` | `Minus` | Remove item |
| ℹ️ | `info` | `Info` | Contextual help |
| ⏳ | `loading` | `Loader2` | Loading spinner |

### Accessibility

- Decorative icons (alongside visible text): `aria-hidden` is applied automatically — no extra props needed.
- Standalone meaningful icons: pass `aria-label` describing what the icon conveys.
- All icons render at `1rem` (16px) by default; override with the `size` prop (number in px).
- Minimum interactive size: wrap in a `LegionButton size="icon"` (44px) if the icon is clickable.

---

## 7. Accessibility Reference

### 7.1 Approved Colour Pairings

These combinations have been verified to meet **WCAG 2.1 AA** (4.5:1 for
normal text, 3:1 for large text and UI components).

| Foreground token | Background token | Contrast | Use |
|---|---|---|---|
| `--bob-text-primary` | `--bob-bg-base` | ≈ 13:1 ✓ | Body text on page |
| `--bob-text-primary` | `--bob-bg-surface` | ≈ 10:1 ✓ | Text on cards |
| `--bob-text-primary` | `--bob-bg-elevated` | ≈ 8:1 ✓ | Text in dialogs |
| `--bob-text-muted` | `--bob-bg-base` | ≈ 7:1 ✓ | Secondary text on page |
| `--bob-text-muted` | `--bob-bg-surface` | ≈ 5:1 ✓ | Secondary text on cards |
| `--bob-amber` | `--bob-bg-base` | ≈ 5:1 ✓ | Amber text/links on page |
| `--bob-amber` | `--bob-bg-surface` | ≈ 4:1 ⚠ | Amber on cards — large text only (≥18px or ≥14px bold) |
| `--bob-amber-fg` | `--bob-amber` | ≈ 8:1 ✓ | Dark text on amber buttons |
| `--bob-danger-fg` | `--bob-danger` | ≈ 7:1 ✓ | Text on destructive buttons |

### 7.2 Pairings to Avoid

| Combination | Reason |
|---|---|
| `--bob-text-faint` on `--bob-bg-surface` | Below 4.5:1 for small text — fails WCAG AA |
| `--bob-text-faint` on `--bob-bg-elevated` | Below 4.5:1 for small text — fails WCAG AA |
| `--bob-amber-muted` on any dark bg | Insufficient contrast for body text |

### 7.3 Touch Targets

- Minimum size: **44 × 44px** (WCAG 2.5.5)
- Enforced by `--bob-touch-target: 44px` applied via `min-h-[var(--bob-touch-target)]`
- All `LegionButton` (`default` and `lg` sizes) and `LegionInput` meet this requirement
- Custom interactive elements (role cards, clock segments) must also meet this threshold

### 7.4 Focus Indicators

- All interactive elements use the amber focus ring: `--bob-border-focus` (`oklch(0.71 0.145 73)`)
- Focus ring is rendered as a 3px ring with 50% opacity offset
- Never suppress focus outlines (`outline: none`) without providing an equivalent custom indicator

### 7.5 Running the Audit

```bash
# Requires the dev server running on BASE_URL (default: localhost:3009)
PORT=3009 npm run dev

# In a separate terminal:
BASE_URL=http://localhost:3009 npm run a11y
```

The audit script (`scripts/a11y-audit.ts`) runs axe-core WCAG 2.1 AA rules
against all audited pages at desktop (1280px) and mobile (375px) viewports.
It also validates that the server is actually serving Next.js HTML — not a
zombie process — before running.
