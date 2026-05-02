/**
 * DashboardShell — shared chrome for all role dashboards.
 *
 * Renders the page header (role label, campaign name, sign-out) and
 * wraps children in the standard max-width container. All six role
 * dashboards use this so the layout stays consistent.
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
  currentState?: CampaignPhaseState | null;
  pendingExpiry?: string | null;
  children: React.ReactNode;
}

export function DashboardShell({ 
  role, 
  campaignName, 
  campaignId, 
  currentState, 
  pendingExpiry,
  children 
}: DashboardShellProps) {
  return (
    // Outer page frame — 1240px max-width with subtle border framing on wide screens.
    <div className="min-h-screen bg-legion-bg-base max-w-[1240px] mx-auto border-x border-border/20 text-legion-text-primary">
      {campaignId && (
        <RealtimeDashboard 
          campaignId={campaignId} 
          userRole={role} 
          currentState={currentState ?? null} 
        />
      )}
      
      {campaignId && pendingExpiry && (
        <UndoButton 
          campaignId={campaignId} 
          expiry={pendingExpiry} 
        />
      )}

      <main className="flex flex-col gap-6 px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto">

        {/* ── Page header ─────────────────────────────────────────────── */}
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
            <div className="flex gap-4">
              <Link 
                href={`/dashboard/history/${role.toLowerCase()}`}
                className="text-sm text-legion-text-muted flex items-center gap-1.5 hover:text-legion-amber transition-colors px-2"
              >
                <HistoryIcon className="w-3.5 h-3.5" />
                History
              </Link>
              <form action={signOut} className="shrink-0">
                <button
                  type="submit"
                  className="text-sm text-legion-text-muted underline underline-offset-4 hover:text-legion-text-primary transition-colors min-h-[44px] flex items-center"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
