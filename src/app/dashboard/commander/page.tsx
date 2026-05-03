import { loadDashboard } from '@/server/loaders/dashboard';
import { DashboardShell } from '@/components/features/campaign/dashboard-shell';
import { CommanderWarTable } from '@/components/features/campaign/commander-war-table';
import { PhaseSummary } from '@/components/features/campaign/phase-summary';
import { MissionFocusForm } from '@/components/features/campaign/mission-focus-form';
import { WaitingForOthers } from '@/components/features/campaign/waiting-for-others';
import { TimePassesSummary } from '@/components/features/campaign/time-passes-summary';
import { AdvanceDecisionForm } from '@/components/features/campaign/advance-decision-form';
import { MissionSelectionStep } from '@/components/features/campaign/mission-selection-step';
import { LocationMap } from '@/components/features/campaign/location-map';
import { PhaseProgressIndicator } from '@/components/features/campaign/phase-progress-indicator';
import { createServiceClient } from '@/lib/supabase/service';
import { isRoleActive } from '@/lib/state-machine';
import { loadLorekeeperData } from '@/server/loaders/dashboard';
import type { CampaignPhaseState, Mission } from '@/lib/types';

export const metadata = { title: 'Commander — Band of Blades' };

export default async function CommanderDashboardPage() {
  const { campaign } = await loadDashboard('COMMANDER');
  const phaseState = campaign.campaign_phase_state as CampaignPhaseState | null;
  const isMyTurn = phaseState !== null && isRoleActive('COMMANDER', phaseState);

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
      {/* Phase progress strip */}
      <PhaseProgressIndicator currentState={phaseState} className="mb-6" />

      {/* Double-rule divider before action zone */}
      <div className="border-t-[3px] border-double border-legion-border mb-6" aria-hidden="true" />

      {/* Active action or waiting state */}
      {phaseState === null ? (
        <div className="border border-dashed border-legion-border p-8 text-center">
          <p className="font-crimson text-[17px] text-legion-text-muted">
            No campaign phase in progress. Waiting for the GM to start one.
          </p>
        </div>
      ) : isMyTurn ? (
        <>
          {phaseState === 'TIME_PASSING' && (
            <ActionZone stepLabel="Step 3 — Time Passes">
              <TimePassesSummary campaign={campaign} />
            </ActionZone>
          )}
          {phaseState === 'AWAITING_ADVANCE' && (
            <AdvanceDecisionForm campaign={campaign} />
          )}
          {phaseState === 'AWAITING_MISSION_FOCUS' && (
            <ActionZone stepLabel="Step 7 — Mission Focus">
              <MissionFocusForm campaign={campaign} />
            </ActionZone>
          )}
          {phaseState === 'AWAITING_MISSION_SELECTION' && (
            <ActionZone stepLabel="Step 9 — Mission Selection">
              <MissionSelectionStep
                campaignId={campaign.id}
                intel={campaign.intel}
                missions={phaseMissions}
              />
            </ActionZone>
          )}
          {phaseState !== 'TIME_PASSING' &&
            phaseState !== 'AWAITING_ADVANCE' &&
            phaseState !== 'AWAITING_MISSION_FOCUS' &&
            phaseState !== 'AWAITING_MISSION_SELECTION' && (
              <div className="border border-legion-amber/40 bg-legion-amber/5 px-4 py-5 text-center">
                <p className="font-fell text-[20px] text-legion-amber mb-1">
                  {"It's your turn, Commander"}
                </p>
                <p className="font-crimson text-[16px] text-legion-text-muted">
                  Commander action for this step coming soon.
                </p>
              </div>
            )}
        </>
      ) : (
        <WaitingForOthers currentState={phaseState} viewerRole="COMMANDER" />
      )}

      {/* Double-rule divider before war table */}
      <div className="border-t-[3px] border-double border-legion-border mt-8 mb-6" aria-hidden="true" />

      {/* Campaign map */}
      <div className="mb-6">
        <h2 className="font-fell text-[22px] uppercase tracking-[0.04em] text-legion-text-primary border-b-2 border-legion-text-primary pb-2 mb-4">
          Campaign Map
        </h2>
        <LocationMap currentLocationId={campaign.current_location} />
      </div>

      {/* War table — always at the bottom */}
      <CommanderWarTable campaign={campaign} />
    </DashboardShell>
  );
}

function ActionZone({
  stepLabel,
  children,
}: {
  stepLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-legion-text-faint mb-3">
        {stepLabel}
      </p>
      {children}
    </div>
  );
}
