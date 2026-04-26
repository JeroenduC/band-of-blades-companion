import { loadDashboard } from '@/server/loaders/dashboard';
import { DashboardShell } from '@/components/features/campaign/dashboard-shell';
import { CommanderWarTable } from '@/components/features/campaign/commander-war-table';
import { PhaseSummary } from '@/components/features/campaign/phase-summary';
import { MissionFocusForm } from '@/components/features/campaign/mission-focus-form';
import { WaitingForOthers } from '@/components/features/campaign/waiting-for-others';
import { TimePassesSummary } from '@/components/features/campaign/time-passes-summary';
import { AdvanceDecisionForm } from '@/components/features/campaign/advance-decision-form';
import { MissionSelectionStep } from '@/components/features/campaign/mission-selection-step';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { LocationMap } from '@/components/features/campaign/location-map';
import { createServiceClient } from '@/lib/supabase/service';
import { isRoleActive } from '@/lib/state-machine';
import { loadLorekeeperData } from '@/server/loaders/dashboard';
import type { CampaignPhaseState, Mission } from '@/lib/types';

export const metadata = { title: 'Commander — Band of Blades' };

export default async function CommanderDashboardPage() {
  const { campaign } = await loadDashboard('COMMANDER');
  const phaseState = campaign.campaign_phase_state as CampaignPhaseState | null;
  const isMyTurn = phaseState !== null && isRoleActive('COMMANDER', phaseState);

  // Fetch missions for the selection step
  let phaseMissions: Mission[] = [];
  if (phaseState === 'AWAITING_MISSION_SELECTION') {
    const db = createServiceClient();
    const { data } = await db
      .from('missions')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('phase_number', campaign.phase_number)
      .eq('status', 'GENERATED')
      .order('created_at', { ascending: true });
    phaseMissions = (data ?? []) as unknown as Mission[];
  }

  if (phaseState === 'PHASE_COMPLETE') {
    const { logs } = await loadLorekeeperData(campaign.id);
    return (
      <DashboardShell 
      role="COMMANDER" 
      campaignName={campaign.name}
      campaignId={campaign.id}
      currentState={phaseState}
      pendingExpiry={campaign.pending_expiry}
    >
        <PhaseSummary campaign={campaign} role="COMMANDER" logs={logs} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell 
      role="COMMANDER" 
      campaignName={campaign.name}
      campaignId={campaign.id}
      currentState={phaseState}
      pendingExpiry={campaign.pending_expiry}
    >
      <CommanderWarTable campaign={campaign} />

      <LegionCard>
        <LegionCardHeader>
          <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
            Campaign Map
          </LegionCardTitle>
        </LegionCardHeader>
        <LegionCardContent>
          <LocationMap currentLocationId={campaign.current_location} />
        </LegionCardContent>
      </LegionCard>

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
              <MissionFocusForm campaign={campaign} />
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
              <MissionSelectionStep campaignId={campaign.id} intel={campaign.intel} missions={phaseMissions} />
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
