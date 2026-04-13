/**
 * DashboardShell — shared chrome for all role dashboards.
 *
 * Renders the page header (role label, campaign name, sign-out) and
 * wraps children in the standard max-width container. All six role
 * dashboards use this so the layout stays consistent.
 */

import { signOut } from '@/server/actions/auth';
import type { LegionRole } from '@/lib/types';

const ROLE_LABELS: Record<LegionRole, string> = {
  GM:             'GM',
  COMMANDER:      'Commander',
  MARSHAL:        'Marshal',
  QUARTERMASTER:  'Quartermaster',
  LOREKEEPER:     'Lorekeeper',
  SPYMASTER:      'Spymaster',
  SOLDIER:        'Soldier',
};

interface DashboardShellProps {
  role: LegionRole;
  campaignName: string;
  children: React.ReactNode;
}

export function DashboardShell({ role, campaignName, children }: DashboardShellProps) {
  return (
    <main className="min-h-screen bg-legion-bg-base flex flex-col p-6 gap-6 max-w-2xl mx-auto">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <header>
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-legion-text-muted mb-1">
              {ROLE_LABELS[role]}
            </p>
            <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.04em] text-legion-amber leading-none">
              {campaignName}
            </h1>
          </div>
          <form action={signOut} className="shrink-0">
            <button
              type="submit"
              className="text-sm text-legion-text-muted underline underline-offset-4 hover:text-legion-text-primary transition-colors min-h-[44px] flex items-center"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {children}
    </main>
  );
}
