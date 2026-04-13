/**
 * PageShell — atmospheric centered layout for in-app form pages.
 *
 * Used for pages that sit between auth and the main dashboard:
 * campaign creation, join campaign, pending member wait screen.
 *
 * Matches the visual mood of AuthShell (dark, military, warm amber)
 * without the brand panel — the player is already in the app.
 */

interface PageShellProps {
  /** Monospaced overline above the heading (e.g. "338th Legion · Setup") */
  overline?: string;
  /** Main Cinzel heading */
  heading: string;
  /** Supporting copy below the amber rule */
  description?: string;
  children: React.ReactNode;
}

export function PageShell({ overline, heading, description, children }: PageShellProps) {
  return (
    // Outer page frame — 1240px max-width with subtle border framing on wide screens.
    <div className="min-h-screen bg-legion-bg-base max-w-[1240px] mx-auto border-x border-border/20 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-10">
      <div className="w-full max-w-sm space-y-6">

        {/* Page identity */}
        <div>
          {overline && (
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-legion-text-muted mb-3">
              {overline}
            </p>
          )}
          <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.05em] text-legion-amber leading-none">
            {heading}
          </h1>
          <div className="h-0.5 w-10 bg-legion-amber mt-4 mb-4" />
          {description && (
            <p className="text-sm text-legion-text-muted leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Page content (form, status, etc.) */}
        <div>
          {children}
        </div>

      </div>
    </div>
  );
}
