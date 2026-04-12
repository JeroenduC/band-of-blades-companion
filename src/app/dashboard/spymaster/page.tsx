import { loadDashboard } from '@/server/loaders/dashboard';
import { DashboardShell } from '@/components/features/campaign/dashboard-shell';
import { WaitingForOthers } from '@/components/features/campaign/waiting-for-others';
import { isRoleActive } from '@/lib/state-machine';
import type { CampaignPhaseState } from '@/lib/types';

export const metadata = { title: 'Spymaster — Band of Blades' };

export default async function SpymasterDashboardPage() {
  const { campaign } = await loadDashboard('SPYMASTER');
  const phaseState = campaign.campaign_phase_state as CampaignPhaseState | null;
  const isMyTurn = phaseState !== null && isRoleActive('SPYMASTER', phaseState);

  return (
    <DashboardShell role="SPYMASTER" campaignName={campaign.name}>
      {phaseState === null ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-legion-text-muted">
            No campaign phase in progress. Waiting for the GM to start one.
          </p>
        </div>
      ) : isMyTurn ? (
        <div className="rounded-lg border border-[var(--bob-amber)] bg-legion-bg-elevated p-6 text-center">
          <p className="font-heading text-lg text-legion-amber mb-1">It&apos;s your turn, Spymaster</p>
          <p className="text-sm text-legion-text-muted">
            Spy dispatch UI coming in Epic 7.
          </p>
        </div>
      ) : (
        <WaitingForOthers currentState={phaseState} viewerRole="SPYMASTER" />
      )}
    </DashboardShell>
  );
}
