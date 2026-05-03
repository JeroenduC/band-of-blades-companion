/**
 * PageShell — Direction B layout for campaign gateway pages.
 *
 * Used for: join campaign, create campaign, pending member.
 * Renders the nav bar (wordmark + sign out) and the masthead (overline + h1
 * + double-rule) above the page's form content.
 */

import { signOut } from '@/server/actions/auth';

interface PageShellProps {
  /** Special Elite overline above the heading (e.g. "338th Legion · Setup") */
  overline?: string;
  /** IM Fell English main heading */
  heading: string;
  /** Supporting copy below the heading */
  description?: string;
  /** Optional stamp badge (text, color, rotate) */
  stamp?: { label: string; color?: 'red' | 'amber' };
  children: React.ReactNode;
}

export function PageShell({ overline, heading, description, stamp, children }: PageShellProps) {
  const stampBorderColor = stamp?.color === 'amber' ? '#c08428' : '#8b2418';
  const stampTextColor   = stamp?.color === 'amber' ? '#c08428' : '#8b2418';
  const stampRotate      = stamp?.color === 'amber' ? '3deg' : '-4deg';

  return (
    <div
      className="min-h-screen bg-parchment-noise"
      style={{ colorScheme: 'light' }}
    >
      <div className="max-w-[560px] mx-auto px-5 sm:px-6">

        {/* ── Nav bar ──────────────────────────────────────────────────── */}
        <nav
          className="flex items-center justify-between py-[14px] border-b border-legion-border mb-12"
          aria-label="Site navigation"
        >
          <span className="font-fell text-[20px] text-legion-text-primary leading-none">
            Band of Blades
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="font-crimson text-[15px] text-legion-text-faint underline underline-offset-[3px] hover:text-legion-text-primary transition-colors min-h-[44px] flex items-center"
            >
              Sign out
            </button>
          </form>
        </nav>

        {/* ── Masthead ─────────────────────────────────────────────────── */}
        <div
          className="flex items-start justify-between gap-3 pb-4 mb-6"
          style={{ borderBottom: '3px double #1f1a14' }}
        >
          <div>
            {overline && (
              <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-legion-text-faint mb-1.5">
                {overline}
              </p>
            )}
            <h1 className="font-fell text-[38px] font-bold leading-none text-legion-text-primary mb-2">
              {heading}
            </h1>
            {description && (
              <p className="font-crimson text-[18px] text-legion-text-muted leading-snug">
                {description}
              </p>
            )}
          </div>

          {stamp && (
            <div
              aria-hidden="true"
              className="shrink-0 mt-1 px-2.5 py-0.5 border-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 whitespace-nowrap"
              style={{
                borderColor: stampBorderColor,
                color: stampTextColor,
                transform: `rotate(${stampRotate})`,
              }}
            >
              {stamp.label}
            </div>
          )}
        </div>

        {/* ── Page content ─────────────────────────────────────────────── */}
        <div className="pb-16">
          {children}
        </div>

      </div>
    </div>
  );
}
