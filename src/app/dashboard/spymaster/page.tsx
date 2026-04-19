import { loadDashboard } from '@/server/loaders/dashboard';
import { DashboardShell } from '@/components/features/campaign/dashboard-shell';
import { WaitingForOthers } from '@/components/features/campaign/waiting-for-others';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { completeSpymasterActions } from '@/server/actions/phase';
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
        phaseState === 'CAMPAIGN_ACTIONS' ? (
          <LegionCard>
            <LegionCardHeader>
              <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
                Step 4 — Spy Dispatch
              </LegionCardTitle>
            </LegionCardHeader>
            <LegionCardContent className="flex flex-col gap-4">
              <p className="text-sm text-legion-text-muted">
                Spy dispatch will be fully implemented in Epic 7. When your group has resolved spy dispatch at the table, mark it complete here to allow the phase to advance.
              </p>
              <form action={completeSpymasterActions}>
                <input type="hidden" name="campaign_id" value={campaign.id} />
                <button
                  type="submit"
                  className="rounded-md bg-legion-amber px-5 py-2.5 font-heading text-sm font-semibold tracking-wide text-[var(--bob-amber-fg)] hover:opacity-90 transition-opacity min-h-[44px]"
                >
                  Mark Spy Dispatch Complete
                </button>
              </form>
            </LegionCardContent>
          </LegionCard>
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
    </DashboardShell>
  );
}
