import { loadDashboard } from '@/server/loaders/dashboard';
import { DashboardShell } from '@/components/features/campaign/dashboard-shell';
import { WaitingForOthers } from '@/components/features/campaign/waiting-for-others';
import { QmCampaignActions } from '@/components/features/campaign/qm-campaign-actions';
import { PlaceholderStep } from '@/components/features/campaign/placeholder-step';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { isRoleActive } from '@/lib/state-machine';
import type { CampaignPhaseState } from '@/lib/types';

export const metadata = { title: 'Quartermaster — Band of Blades' };

export default async function QuartermasterDashboardPage() {
  const { campaign } = await loadDashboard('QUARTERMASTER');
  const phaseState = campaign.campaign_phase_state as CampaignPhaseState | null;
  const isMyTurn = phaseState !== null && isRoleActive('QUARTERMASTER', phaseState);

  return (
    <DashboardShell role="QUARTERMASTER" campaignName={campaign.name}>
      {phaseState === null ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-legion-text-muted">
            No campaign phase in progress. Waiting for the GM to start one.
          </p>
        </div>
      ) : isMyTurn ? (
        phaseState === 'CAMPAIGN_ACTIONS' ? (
          <LegionCard>
            <LegionCardHeader>
              <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
                Step 4 — Campaign Actions
              </LegionCardTitle>
            </LegionCardHeader>
            <LegionCardContent>
              <QmCampaignActions campaign={campaign} />
            </LegionCardContent>
          </LegionCard>
        ) : phaseState === 'AWAITING_LABORERS_ALCHEMISTS' ? (
          <LegionCard>
            <LegionCardHeader>
              <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
                Step 5 — Laborers &amp; Alchemists
              </LegionCardTitle>
            </LegionCardHeader>
            <LegionCardContent>
              <PlaceholderStep
                campaignId={campaign.id}
                title="Laborers & Alchemists"
                message="Laborer and Alchemist assignment will be implemented in Epic 4. For now, click Continue to advance the phase."
                buttonLabel="Continue to Advance Decision"
                nextState="AWAITING_ADVANCE"
                role="QUARTERMASTER"
                actionType="LABORERS_ALCHEMISTS_COMPLETE"
                dashboardPath="/dashboard/quartermaster"
              />
            </LegionCardContent>
          </LegionCard>
        ) : (
          <div className="rounded-lg border border-[var(--bob-amber)] bg-legion-bg-elevated p-6 text-center">
            <p className="font-heading text-lg text-legion-amber mb-1">It&apos;s your turn, Quartermaster</p>
            <p className="text-sm text-legion-text-muted">
              Quartermaster action for this step coming soon.
            </p>
          </div>
        )
      ) : (
        <WaitingForOthers currentState={phaseState} viewerRole="QUARTERMASTER" />
      )}
    </DashboardShell>
  );
}
