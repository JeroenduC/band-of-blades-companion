import { loadDashboard, loadSpyData, loadLorekeeperData } from '@/server/loaders/dashboard';
import { DashboardShell } from '@/components/features/campaign/dashboard-shell';
import { PhaseSummary } from '@/components/features/campaign/phase-summary';
import { WaitingForOthers } from '@/components/features/campaign/waiting-for-others';
import { SpyRoster } from '@/components/features/campaign/spy-roster';
import { SpyNetworkTree } from '@/components/features/campaign/spy-network-tree';
import { SpyDispatch } from '@/components/features/campaign/spy-dispatch';
import { isRoleActive } from '@/lib/state-machine';
import { INTEL_TIERS } from '@/lib/intel-questions';
import type { CampaignPhaseState } from '@/lib/types';

export const metadata = { title: 'Spymaster — Band of Blades' };

export default async function SpymasterDashboardPage() {
  const { campaign } = await loadDashboard('SPYMASTER');
  const { spies, network, longTermAssignments, maxSpies } = await loadSpyData(campaign.id);
  
  const phaseState = campaign.campaign_phase_state as CampaignPhaseState | null;
  const isMyTurn = phaseState !== null && isRoleActive('SPYMASTER', phaseState);
  const actionsComplete = campaign.spymaster_actions_complete;

  if (phaseState === 'PHASE_COMPLETE') {
    const { logs } = await loadLorekeeperData(campaign.id);
    return (
      <DashboardShell role="SPYMASTER" campaignName={campaign.name}>
        <PhaseSummary campaign={campaign} role="SPYMASTER" logs={logs} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell role="SPYMASTER" campaignName={campaign.name}>
      <div className="space-y-8">
        {/* Network Tree */}
        <SpyNetworkTree 
          campaignId={campaign.id} 
          network={network} 
          longTermAssignments={longTermAssignments} 
        />

        {/* Spy Roster always visible */}
        <SpyRoster spies={spies} maxSpies={maxSpies} />

        {/* Phase-specific actions */}
        <div className="pt-4 border-t border-border">
          {phaseState === null ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-legion-text-muted">
                No campaign phase in progress. Waiting for the GM to start one.
              </p>
            </div>
          ) : isMyTurn ? (
            phaseState === 'CAMPAIGN_ACTIONS' ? (
              actionsComplete ? (
                <div className="rounded-lg border border-[var(--bob-amber)] bg-legion-bg-elevated p-8 text-center">
                  <p className="font-heading text-xl text-legion-amber mb-2">Spy Dispatch Complete</p>
                  <p className="text-sm text-legion-text-muted max-w-md mx-auto">
                    You have dispatched your spies. Waiting for the Quartermaster to complete campaign actions before proceeding to laborers and alchemists.
                  </p>
                </div>
              ) : (
                <SpyDispatch 
                  campaignId={campaign.id} 
                  spies={spies} 
                  intelTiers={INTEL_TIERS}
                  longTermAssignments={longTermAssignments}
                />
              )
            ) : (
              <div className="rounded-lg border border-[var(--bob-amber)] bg-legion-bg-elevated p-6 text-center">
                <p className="font-heading text-lg text-legion-amber mb-1">It&apos;s your turn, Spymaster</p>
                <p className="text-sm text-legion-text-muted">
                  Spymaster action for this step coming soon.
                </p>
              </div>
            )
          ) : (
            <WaitingForOthers currentState={phaseState} viewerRole="SPYMASTER" />
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
