import { loadGmDashboard } from '@/server/loaders/dashboard';
import { DashboardShell } from '@/components/features/campaign/dashboard-shell';
import { PhaseProgressIndicator } from '@/components/features/campaign/phase-progress-indicator';
import { MissionResolutionForm } from '@/components/features/campaign/mission-resolution-form';
import { PlaceholderStep } from '@/components/features/campaign/placeholder-step';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { CopyInviteButton } from '@/components/features/campaign/copy-invite-button';
import { startCampaignPhase } from '@/server/actions/campaign-phase';
import type { CampaignPhaseState } from '@/lib/types';

export const metadata = { title: 'GM Dashboard — Band of Blades' };

export default async function GmDashboardPage() {
  const { campaign, membership } = await loadGmDashboard();
  const phaseState = campaign.campaign_phase_state as CampaignPhaseState | null;
  const phaseActive = phaseState !== null && phaseState !== 'PHASE_COMPLETE';

  return (
    <DashboardShell role="GM" campaignName={campaign.name}>

      {/* Invite code + manage roles */}
      <LegionCard>
        <LegionCardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
              Invite code
            </p>
            <CopyInviteButton code={campaign.invite_code} />
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-2xl tracking-[0.3em] text-legion-amber">
              {campaign.invite_code}
            </span>
            <a
              href={`/campaign/${membership.campaign_id}/members`}
              className="text-sm text-legion-text-muted underline underline-offset-4 hover:text-legion-text-primary transition-colors"
            >
              Manage roles →
            </a>
          </div>
        </LegionCardContent>
      </LegionCard>

      {/* Phase state */}
      {!phaseActive ? (
        <LegionCard>
          <LegionCardContent className="py-8 text-center">
            <p className="font-heading text-lg text-legion-text-primary mb-1">
              No campaign phase in progress
            </p>
            <p className="text-sm text-legion-text-muted mb-6">
              Start a new phase after your group completes a mission.
            </p>
            <form action={startCampaignPhase}>
              <input type="hidden" name="campaign_id" value={campaign.id} />
              <button
                type="submit"
                className="rounded-md bg-legion-amber px-5 py-2.5 font-heading text-sm font-semibold tracking-wide text-[var(--bob-amber-fg)] hover:opacity-90 transition-opacity min-h-[44px]"
              >
                Start Campaign Phase
              </button>
            </form>
          </LegionCardContent>
        </LegionCard>
      ) : (
        <div className="flex flex-col gap-6">

          {/* Phase header with live resources */}
          <div className="flex items-center justify-between">
            <p className="font-heading text-sm uppercase tracking-widest text-legion-text-muted">
              Phase {campaign.phase_number} in progress
            </p>
            <div className="flex gap-4 text-xs font-mono text-legion-text-muted">
              <span>Morale <span className="text-legion-text-primary">{campaign.morale}</span></span>
              <span>Pressure <span className="text-legion-text-primary">{campaign.pressure}</span></span>
            </div>
          </div>

          {/* Phase progress */}
          <PhaseProgressIndicator currentState={phaseState} />

          {/* Step-specific GM action */}
          {phaseState === 'AWAITING_MISSION_RESOLUTION' && (
            <LegionCard>
              <LegionCardHeader>
                <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
                  Step 1 — Mission Resolution
                </LegionCardTitle>
              </LegionCardHeader>
              <LegionCardContent>
                <MissionResolutionForm
                  campaignId={campaign.id}
                  phaseNumber={campaign.phase_number}
                />
              </LegionCardContent>
            </LegionCard>
          )}

          {phaseState === 'AWAITING_MISSION_GENERATION' && (
            <LegionCard>
              <LegionCardHeader>
                <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
                  Step 8 — Mission Generation
                </LegionCardTitle>
              </LegionCardHeader>
              <LegionCardContent>
                <PlaceholderStep
                  campaignId={campaign.id}
                  title="Mission Generation"
                  message="Full mission generation will be implemented in Epic 9. For now, click Continue to advance to Mission Selection."
                  buttonLabel="Continue to Mission Selection"
                  nextState="AWAITING_MISSION_SELECTION"
                  role="GM"
                  actionType="MISSION_GENERATION_COMPLETE"
                  dashboardPath="/dashboard/gm"
                />
              </LegionCardContent>
            </LegionCard>
          )}

        </div>
      )}

    </DashboardShell>
  );
}
