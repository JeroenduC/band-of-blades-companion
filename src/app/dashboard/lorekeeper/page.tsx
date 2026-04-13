import { loadDashboard, loadBackAtCampScenes } from '@/server/loaders/dashboard';
import { DashboardShell } from '@/components/features/campaign/dashboard-shell';
import { WaitingForOthers } from '@/components/features/campaign/waiting-for-others';
import { BackAtCampForm } from '@/components/features/campaign/back-at-camp-form';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { isRoleActive } from '@/lib/state-machine';
import type { CampaignPhaseState } from '@/lib/types';

export const metadata = { title: 'Lorekeeper — Band of Blades' };

export default async function LorekeeperDashboardPage() {
  const { campaign } = await loadDashboard('LOREKEEPER');
  const phaseState = campaign.campaign_phase_state as CampaignPhaseState | null;
  const isMyTurn = phaseState !== null && isRoleActive('LOREKEEPER', phaseState);

  // Only fetch scenes when it's actually needed
  const scenesData =
    phaseState === 'AWAITING_BACK_AT_CAMP' && isMyTurn
      ? await loadBackAtCampScenes(campaign.id, campaign.morale)
      : null;

  return (
    <DashboardShell role="LOREKEEPER" campaignName={campaign.name}>
      {phaseState === null ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-legion-text-muted">
            No campaign phase in progress. Waiting for the GM to start one.
          </p>
        </div>
      ) : isMyTurn ? (
        phaseState === 'AWAITING_BACK_AT_CAMP' && scenesData ? (
          <LegionCard>
            <LegionCardHeader>
              <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
                Step 2 — Back at Camp
              </LegionCardTitle>
            </LegionCardHeader>
            <LegionCardContent>
              <BackAtCampForm
                campaignId={campaign.id}
                morale={campaign.morale}
                scenes={scenesData.scenes}
                activeLevel={scenesData.activeLevel}
                fallback={scenesData.fallback}
              />
            </LegionCardContent>
          </LegionCard>
        ) : (
          <div className="rounded-lg border border-[var(--bob-amber)] bg-legion-bg-elevated p-6 text-center">
            <p className="font-heading text-lg text-legion-amber mb-1">It&apos;s your turn, Lorekeeper</p>
            <p className="text-sm text-legion-text-muted">
              Lorekeeper action for this step coming soon.
            </p>
          </div>
        )
      ) : (
        <WaitingForOthers currentState={phaseState} viewerRole="LOREKEEPER" />
      )}
    </DashboardShell>
  );
}
