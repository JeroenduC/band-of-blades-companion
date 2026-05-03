/**
 * DashboardShell — shared chrome for all role dashboards.
 *
 * Direction B field-journal aesthetic: parchment background, ink typography,
 * square corners. The header shows role label + campaign name on the left,
 * history link + sign-out on the right, with a parch-edge border-bottom.
 */

import { signOut } from '@/server/actions/auth';
import type { LegionRole, CampaignPhaseState } from '@/lib/types';
import Link from 'next/link';
import { HistoryIcon } from 'lucide-react';
import { RealtimeDashboard } from './realtime-dashboard';
import { UndoButton } from './undo-button';

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
  campaignId?: string;
  overline?: string;
  currentState?: CampaignPhaseState | null;
  pendingExpiry?: string | null;
  children: React.ReactNode;
}

export function DashboardShell({
  role,
  campaignName,
  campaignId,
  overline,
  currentState,
  pendingExpiry,
  children,
}: DashboardShellProps) {
  const roleLabel = overline ?? `338th Legion · ${ROLE_LABELS[role]}`;

  return (
    <div
      className="min-h-screen bg-legion-bg-base max-w-[1240px] mx-auto border-x border-legion-border/20 text-legion-text-primary"
      style={{ colorScheme: 'light' }}
    >
      {campaignId && (
        <RealtimeDashboard
          campaignId={campaignId}
          userRole={role}
          currentState={currentState ?? null}
        />
      )}

      {campaignId && pendingExpiry && (
        <UndoButton campaignId={campaignId} expiry={pendingExpiry} />
      )}

      {/* ── Nav bar ──────────────────────────────────────────────────── */}
      <nav className="border-b border-legion-border px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-legion-text-faint">
          {roleLabel}
        </p>
        <div className="flex items-center gap-5">
          {campaignId && (
            <Link
              href={`/dashboard/history/${role.toLowerCase()}`}
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-legion-text-faint hover:text-legion-text-primary transition-colors flex items-center gap-1.5 min-h-[44px]"
            >
              <HistoryIcon className="w-3 h-3" aria-hidden="true" />
              History
            </Link>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-legion-text-faint underline underline-offset-4 hover:text-legion-text-primary transition-colors min-h-[44px]"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>

      {/* ── Masthead ─────────────────────────────────────────────────── */}
      <header className="px-4 sm:px-6 lg:px-8 pt-8 pb-6 border-b-[3px] border-double border-legion-border max-w-[680px]">
        <h1 className="font-fell text-[42px] leading-none text-legion-text-primary uppercase tracking-[0.03em]">
          {campaignName}
        </h1>
      </header>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <main className="flex flex-col gap-0 px-4 sm:px-6 lg:px-8 py-6 max-w-[680px]">
        {children}
      </main>
    </div>
  );
}
