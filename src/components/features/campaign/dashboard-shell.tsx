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
    <main className="flex min-h-screen flex-col p-6 gap-6 max-w-2xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-legion-text-muted">
            {ROLE_LABELS[role]}
          </p>
          <h1 className="font-heading text-xl font-semibold tracking-wide text-legion-text-primary">
            {campaignName}
          </h1>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-legion-text-muted underline underline-offset-4 hover:text-legion-text-primary transition-colors"
          >
            Sign out
          </button>
        </form>
      </header>

      {children}
    </main>
  );
}
