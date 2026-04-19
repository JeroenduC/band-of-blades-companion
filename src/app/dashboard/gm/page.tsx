import { loadGmDashboard } from '@/server/loaders/dashboard';
import { createServiceClient } from '@/lib/supabase/service';
import { DashboardShell } from '@/components/features/campaign/dashboard-shell';
import { PhaseProgressIndicator } from '@/components/features/campaign/phase-progress-indicator';
import { MissionResolutionForm } from '@/components/features/campaign/mission-resolution-form';
import { MissionGenerationForm } from '@/components/features/campaign/mission-generation-form';
import { PlaceholderStep } from '@/components/features/campaign/placeholder-step';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { CopyInviteButton } from '@/components/features/campaign/copy-invite-button';
import { startCampaignPhase } from '@/server/actions/campaign-phase';
import { getLocation } from '@/lib/locations';
import type { CampaignPhaseState, MissionType } from '@/lib/types';

export const metadata = { title: 'GM Dashboard — Band of Blades' };

export default async function GmDashboardPage() {
  const { campaign, membership } = await loadGmDashboard();
  const phaseState = campaign.campaign_phase_state as CampaignPhaseState | null;
  const phaseActive = phaseState !== null && phaseState !== 'PHASE_COMPLETE';

  // For mission generation: fetch the Commander's focus choice and intel questions from the phase log
  let commanderFocus: string | null = null;
  let intelQuestions: string[] = [];
  if (phaseState === 'AWAITING_MISSION_GENERATION') {
    const db = createServiceClient();

    // Fetch focus
    const { data: focusLog } = await db
      .from('campaign_phase_log')
      .select('details')
      .eq('campaign_id', campaign.id)
      .eq('phase_number', campaign.phase_number)
      .eq('action_type', 'MISSION_FOCUS_SELECTED')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (focusLog?.details && typeof focusLog.details === 'object' && 'focus' in focusLog.details) {
      commanderFocus = String(focusLog.details.focus);
    }

    // Fetch intel questions
    const { data: intelLog } = await db
      .from('campaign_phase_log')
      .select('details')
      .eq('campaign_id', campaign.id)
      .eq('phase_number', campaign.phase_number)
      .eq('action_type', 'INTEL_QUESTIONS_SUBMITTED')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (intelLog?.details && typeof intelLog.details === 'object' && Array.isArray(intelLog.details.questions)) {
      const questionIds = intelLog.details.questions as string[];
      const { INTEL_TIERS } = await import('@/lib/intel-questions');
      const allQuestions = INTEL_TIERS.flatMap((t) => t.questions);
      intelQuestions = questionIds
        .map((id) => allQuestions.find((q) => q.id === id)?.text)
        .filter((text): text is string => !!text);
    }
  }

  const currentLoc = getLocation(campaign.current_location);
  const availableMissionTypes = (currentLoc?.available_mission_types ?? []) as MissionType[];

  return (
    <DashboardShell role="GM" campaignName={campaign.name}>

      {/* Invite code */}
      <LegionCard>
        <LegionCardHeader>
          <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
            Invite code
          </LegionCardTitle>
        </LegionCardHeader>
        <LegionCardContent className="flex items-center gap-2">
          <span className="font-mono text-2xl tracking-[0.3em] text-legion-amber">
            {campaign.invite_code}
          </span>
          <CopyInviteButton code={campaign.invite_code} />
        </LegionCardContent>
      </LegionCard>

      {/* Manage roles */}
      <a
        href={`/campaign/${membership.campaign_id}/members`}
        className="self-start rounded-md bg-legion-amber px-5 py-2.5 text-sm font-semibold text-[var(--bob-amber-fg)] hover:opacity-90 transition-opacity min-h-[44px] inline-flex items-center"
      >
        Manage roles
      </a>

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
                <MissionGenerationForm
                  campaignId={campaign.id}
                  currentLocation={campaign.current_location}
                  availableMissionTypes={availableMissionTypes}
                  commanderFocus={commanderFocus}
                  intelQuestions={intelQuestions}
                />
              </LegionCardContent>
            </LegionCard>
          )}

        </div>
      )}

    </DashboardShell>
  );
}
