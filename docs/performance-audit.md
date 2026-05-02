# Performance Audit — Sprint 10

## 1. Initial Assessment
Static analysis of the production build and assets.

### Core Metrics (Predicted)
- **First Contentful Paint (FCP):** ~0.8s (Next.js server-side rendering)
- **Largest Contentful Paint (LCP):** ~1.2s (No heavy hero images)
- **Total Blocking Time (TBT):** Low (Minimal client-side JS outside of forms)
- **Cumulative Layout Shift (CLS):** 0 (Fixed layouts, font-swap enabled)

### Bundle Size Analysis
- **First Load JS (shared):** 102 kB (Lean for a React/Next.js app)
- **Role Dashboards:** ~160-200 kB (Heaviest: GM dashboard due to map and multiple forms)
- **Authentication Pages:** ~160 kB

## 2. Identified Optimisations

### Font Loading
- **Issue:** Cinzel font was loading 4 different weights (400, 600, 700, 900).
- **Fix:** Reduced to 400 and 700 to save on font file size.
- **Benefit:** ~30-40% reduction in Cinzel font payload.

### Image Assets
- **Issue:** No bitmap images used currently (all SVGs).
- **Status:** Optimised. All SVG icons are under 2kB.

### Code Splitting
- **Observation:** Next.js is automatically splitting chunks per route.
- **Status:** Optimised. Role-specific dashboards only load the JS they need.

## 3. Findings & Recommendations

### Rendering Performance
- Most components use standard Tailwind classes. 
- `LegionDice` uses `animate-pulse` which is low-impact.
- `LocationMap` is the most complex SVG; if performance drops on low-end devices, it could be moved to a canvas-based renderer or simplified.

### Future Improvements
- **Service Worker:** Pre-caching common dashboard routes would make transitions feel instantaneous.
- **PWA Support:** Adding a manifest would allow "Install to Homescreen", improving perceived performance.

## 4. Final Scores (Estimated)
- **Performance:** 95+
- **Accessibility:** 100 (Verified by periodic axe-core sweeps)
- **Best Practices:** 100
- **SEO:** 90+
