import { loadDashboard } from '@/server/loaders/dashboard';
import { DashboardShell } from '@/components/features/campaign/dashboard-shell';
import { WaitingForOthers } from '@/components/features/campaign/waiting-for-others';
import { TimePassesSummary } from '@/components/features/campaign/time-passes-summary';
import { AdvanceDecisionForm } from '@/components/features/campaign/advance-decision-form';
import { PlaceholderStep } from '@/components/features/campaign/placeholder-step';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { isRoleActive } from '@/lib/state-machine';
import type { CampaignPhaseState } from '@/lib/types';

export const metadata = { title: 'Commander — Band of Blades' };

export default async function CommanderDashboardPage() {
  const { campaign } = await loadDashboard('COMMANDER');
  const phaseState = campaign.campaign_phase_state as CampaignPhaseState | null;
  const isMyTurn = phaseState !== null && isRoleActive('COMMANDER', phaseState);

  return (
    <DashboardShell role="COMMANDER" campaignName={campaign.name}>
      {phaseState === null ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-legion-text-muted">
            No campaign phase in progress. Waiting for the GM to start one.
          </p>
        </div>
      ) : isMyTurn ? (
        phaseState === 'TIME_PASSING' ? (
          <LegionCard>
            <LegionCardHeader>
              <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
                Step 3 — Time Passes
              </LegionCardTitle>
            </LegionCardHeader>
            <LegionCardContent>
              <TimePassesSummary campaign={campaign} />
            </LegionCardContent>
          </LegionCard>
        ) : phaseState === 'AWAITING_ADVANCE' ? (
          <LegionCard>
            <LegionCardHeader>
              <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
                Step 6 — Advance Decision
              </LegionCardTitle>
            </LegionCardHeader>
            <LegionCardContent>
              <AdvanceDecisionForm campaign={campaign} />
            </LegionCardContent>
          </LegionCard>
        ) : phaseState === 'AWAITING_MISSION_FOCUS' ? (
          <LegionCard>
            <LegionCardHeader>
              <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
                Step 7 — Mission Focus
              </LegionCardTitle>
            </LegionCardHeader>
            <LegionCardContent>
              <PlaceholderStep
                campaignId={campaign.id}
                title="Mission Focus"
                message="Full mission type selection (Assault, Recon, Religious, Supply) will be implemented in Epic 9. For now, click Continue to advance."
                buttonLabel="Continue to Mission Generation"
                nextState="AWAITING_MISSION_GENERATION"
                role="COMMANDER"
                actionType="MISSION_FOCUS_SELECTED"
                dashboardPath="/dashboard/commander"
              />
            </LegionCardContent>
          </LegionCard>
        ) : phaseState === 'AWAITING_MISSION_SELECTION' ? (
          <LegionCard>
            <LegionCardHeader>
              <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
                Step 9 — Mission Selection
              </LegionCardTitle>
            </LegionCardHeader>
            <LegionCardContent>
              <PlaceholderStep
                campaignId={campaign.id}
                title="Mission Selection"
                message="Full mission selection will be implemented in Epic 5/6. Click Continue to complete this phase."
                buttonLabel="Complete Phase"
                nextState="PHASE_COMPLETE"
                role="COMMANDER"
                actionType="MISSION_SELECTED"
                dashboardPath="/dashboard/commander"
              />
            </LegionCardContent>
          </LegionCard>
        ) : (
          <div className="rounded-lg border border-[var(--bob-amber)] bg-legion-bg-elevated p-6 text-center">
            <p className="font-heading text-lg text-legion-amber mb-1">It&apos;s your turn, Commander</p>
            <p className="text-sm text-legion-text-muted">
              Commander action for this step coming soon.
            </p>
          </div>
        )
      ) : (
        <WaitingForOthers currentState={phaseState} viewerRole="COMMANDER" />
      )}
    </DashboardShell>
  );
}
