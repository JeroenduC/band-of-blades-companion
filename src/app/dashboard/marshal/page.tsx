import { loadDashboard } from '@/server/loaders/dashboard';
import { DashboardShell } from '@/components/features/campaign/dashboard-shell';
import { WaitingForOthers } from '@/components/features/campaign/waiting-for-others';
import { isRoleActive } from '@/lib/state-machine';
import type { CampaignPhaseState } from '@/lib/types';

export const metadata = { title: 'Marshal — Band of Blades' };

export default async function MarshalDashboardPage() {
  const { campaign } = await loadDashboard('MARSHAL');
  const phaseState = campaign.campaign_phase_state as CampaignPhaseState | null;
  const isMyTurn = phaseState !== null && isRoleActive('MARSHAL', phaseState);

  return (
    <DashboardShell role="MARSHAL" campaignName={campaign.name}>
      {phaseState === null ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-legion-text-muted">
            No campaign phase in progress. Waiting for the GM to start one.
          </p>
        </div>
      ) : isMyTurn ? (
        <div className="rounded-lg border border-[var(--bob-amber)] bg-legion-bg-elevated p-6 text-center">
          <p className="font-heading text-lg text-legion-amber mb-1">It&apos;s your turn, Marshal</p>
          <p className="text-sm text-legion-text-muted">
            Action UI coming in the next sprint.
          </p>
        </div>
      ) : (
        <WaitingForOthers currentState={phaseState} viewerRole="MARSHAL" />
      )}
    </DashboardShell>
  );
}
