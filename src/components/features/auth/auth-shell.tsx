/**
 * AuthShell — atmospheric two-panel wrapper for sign-in and sign-up pages.
 *
 * Desktop: brand panel (left) + form panel (right), side-by-side.
 * Mobile: brand header stacked above form, full width.
 *
 * This is the first screen players see — it sets the mood: dark, military,
 * purposeful. Think cover of the Band of Blades rulebook.
 */

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-legion-bg-base md:grid md:grid-cols-2">

      {/* ── Brand panel (desktop only) ─────────────────────────────────── */}
      <div className="hidden md:flex flex-col justify-between p-12 border-r border-border bg-legion-bg-surface">
        <div>
          {/* Regiment tag */}
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-legion-text-muted mb-10">
            338th Legion · Campaign Phase
          </p>

          {/* App title */}
          <h1 className="font-heading text-[3.5rem] font-bold leading-none uppercase tracking-[0.06em] text-legion-amber">
            Band<br />of<br />Blades
          </h1>

          {/* Amber rule */}
          <div className="h-0.5 w-12 bg-legion-amber mt-6 mb-5" />

          {/* Subtitle */}
          <p className="font-heading text-base tracking-widest uppercase text-legion-text-muted">
            Legion Phase Companion
          </p>
        </div>

        {/* Atmospheric quote — bottom of brand panel */}
        {/* Purely decorative flavour text — aria-hidden so screen readers
            skip it; it conveys no functional information. */}
        <blockquote aria-hidden="true" className="border-l-2 border-legion-amber pl-4">
          <p className="text-sm text-legion-text-muted italic leading-relaxed">
            "The Long March does not end until the last soldier falls<br />
            or the Black City burns. Every choice is a debt.<br />
            Every debt comes due."
          </p>
        </blockquote>
      </div>

      {/* ── Form panel ─────────────────────────────────────────────────── */}
      <div className="flex flex-col min-h-screen md:min-h-0 p-6 sm:p-8 md:p-12">

        {/* Mobile brand header (hidden on desktop) */}
        <header className="md:hidden text-center pt-10 pb-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-legion-text-muted mb-4">
            338th Legion · Campaign Phase
          </p>
          <h1 className="font-heading text-4xl font-bold uppercase tracking-[0.06em] text-legion-amber leading-none">
            Band of Blades
          </h1>
          <div className="h-0.5 w-10 bg-legion-amber mx-auto mt-4 mb-3" />
          <p className="font-heading text-xs tracking-widest uppercase text-legion-text-muted">
            Legion Phase Companion
          </p>
        </header>

        {/* Form content — vertically centred in the remaining space */}
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>
      </div>

    </main>
  );
}
