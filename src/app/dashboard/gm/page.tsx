import { 
  loadGmDashboard, 
  loadBackAtCampScenes, 
  loadQmMateriel, 
  loadMarshalPersonnel, 
  loadSpyData,
  loadSessions,
  loadBrokenAdvances,
  loadLorekeeperData
} from '@/server/loaders/dashboard';
import { createServiceClient } from '@/lib/supabase/service';
import { DashboardShell } from '@/components/features/campaign/dashboard-shell';
import { PhaseProgressIndicator } from '@/components/features/campaign/phase-progress-indicator';
import { MissionResolutionForm } from '@/components/features/campaign/mission-resolution-form';
import { MissionGenerationForm } from '@/components/features/campaign/mission-generation-form';
import { GmOverview } from '@/components/features/campaign/gm-overview';
import { PhaseSummary } from '@/components/features/campaign/phase-summary';
import { BrokenTracking } from '@/components/features/campaign/broken-tracking';
import { GmAntagonistSelection } from '@/components/features/campaign/gm-antagonist-selection';
import { GmOverrideForm } from '@/components/features/campaign/gm-override-form';
import { LocationThumbnail } from '@/components/features/campaign/location-thumbnail';
import { LocationMap } from '@/components/features/campaign/location-map';
import { LegionOverride } from '@/components/features/campaign/legion-override';
import { PlaceholderStep } from '@/components/features/campaign/placeholder-step';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { CopyInviteButton } from '@/components/features/campaign/copy-invite-button';
import { startCampaignPhase } from '@/server/actions/phase';
import { createSession, selectBroken } from '@/server/actions/phase/gm';
import { getLocation } from '@/lib/locations';
import type { CampaignPhaseState, MissionType, BrokenName } from '@/lib/types';
import { PlusIcon, CalendarIcon, HistoryIcon, SkullIcon, AlertTriangleIcon } from 'lucide-react';

export const metadata = { title: 'GM Dashboard — Band of Blades' };

export default async function GmDashboardPage() {
  const { campaign, membership } = await loadGmDashboard();
  const phaseState = campaign.campaign_phase_state as CampaignPhaseState | null;
  const phaseActive = phaseState !== null && phaseState !== 'PHASE_COMPLETE';

  const db = createServiceClient();

  // Load dashboard data
  const [personnelData, spyData, sessions, brokenAdvances] = await Promise.all([
    loadMarshalPersonnel(campaign.id),
    loadSpyData(campaign.id),
    loadSessions(campaign.id),
    loadBrokenAdvances(campaign.id)
  ]);

  const personnelCounts = {
    rookies: personnelData.unassignedRecruits.rookies + personnelData.squads.reduce((acc, s) => acc + s.members.filter(m => m.rank === 'ROOKIE' && m.status !== 'DEAD').length, 0),
    soldiers: personnelData.unassignedRecruits.soldiers + personnelData.squads.reduce((acc, s) => acc + s.members.filter(m => m.rank === 'SOLDIER' && m.status !== 'DEAD').length, 0),
    specialists: personnelData.specialists.filter(s => s.status !== 'DEAD' && s.status !== 'RETIRED').length,
    squads: personnelData.squads.length
  };

  const spyCounts = {
    total: spyData.spies.filter(s => s.status !== 'DEAD').length,
    networkUpgrades: spyData.network?.upgrades || []
  };

  // For mission generation: fetch the Commander's focus choice and intel questions from the phase log
  let commanderFocus: string | null = null;
  let intelQuestions: string[] = [];
  if (phaseState === 'AWAITING_MISSION_GENERATION') {
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

  // ─── Data Loading for Overrides ───────────────────────────────────────────
  
  const backAtCampData = phaseActive && phaseState === 'AWAITING_BACK_AT_CAMP' 
    ? await loadBackAtCampScenes(campaign.id, campaign.morale)
    : undefined;

  const qmData = phaseActive && (
    phaseState === 'AWAITING_TALES' || 
    phaseState === 'CAMPAIGN_ACTIONS' || 
    phaseState === 'AWAITING_LABORERS_ALCHEMISTS'
  ) ? await loadQmMateriel(campaign.id, campaign.phase_number)
    : undefined;

  const marshalData = personnelData;
  const spymasterData = spyData;

  const campaignMissions = phaseActive && (
    phaseState === 'AWAITING_MISSION_SELECTION' || 
    phaseState === 'AWAITING_MISSION_DEPLOYMENT'
  ) ? (await db.from('missions').select('*').eq('campaign_id', campaign.id).eq('phase_number', campaign.phase_number)).data
    : undefined;

  const currentLoc = getLocation(campaign.current_location);
  const availableMissionTypes = (currentLoc?.available_mission_types ?? []) as MissionType[];

  if (phaseState === 'PHASE_COMPLETE') {
    const { logs } = await loadLorekeeperData(campaign.id);
    return (
      <DashboardShell 
      role="GM" 
      campaignName={campaign.name}
      campaignId={campaign.id}
      currentState={phaseState}
      pendingExpiry={campaign.pending_expiry}
    >
        <PhaseSummary campaign={campaign} role="GM" logs={logs} />
        
        {/* GM can still see global overview below summary */}
        <div className="mt-20 space-y-12">
           <section className="space-y-6">
            <h2 className="font-heading text-xl text-legion-text-primary uppercase tracking-[0.2em] border-b border-white/10 pb-2">
              Legion Status
            </h2>
            <GmOverview 
              campaign={campaign}
              personnelCounts={personnelCounts}
              spyCounts={spyCounts}
            />
          </section>
          
          <section className="space-y-4 pt-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <AlertTriangleIcon className="w-4 h-4 text-legion-amber" />
              <h2 className="font-heading text-lg text-legion-text-primary uppercase tracking-widest">
                GM Authority & Overrides
              </h2>
            </div>
            <LegionCard className="border-legion-amber/20 bg-black/20">
              <LegionCardContent className="pt-6">
                <GmOverrideForm campaign={campaign} />
              </LegionCardContent>
            </LegionCard>
          </section>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell 
      role="GM" 
      campaignName={campaign.name}
      campaignId={campaign.id}
      currentState={phaseState}
      pendingExpiry={campaign.pending_expiry}
    >

      <div className="flex flex-col gap-6 lg:gap-10">
        
        {/* Top Bar: Invite & Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-legion-text-muted uppercase tracking-widest">Invite:</span>
            <span className="font-mono text-xl tracking-widest text-legion-amber">
              {campaign.invite_code}
            </span>
            <CopyInviteButton code={campaign.invite_code} />
          </div>
          
          <div className="flex gap-3">
            <a
              href="/dashboard/gm/audit"
              className="rounded-md bg-white/5 border border-white/10 px-4 py-2 text-xs font-heading font-semibold uppercase tracking-widest text-legion-text-primary hover:bg-white/10 transition-colors"
            >
              Audit Trail
            </a>
            <a
              href={`/campaign/${membership.campaign_id}/members`}
              className="rounded-md bg-white/5 border border-white/10 px-4 py-2 text-xs font-heading font-semibold uppercase tracking-widest text-legion-text-primary hover:bg-white/10 transition-colors"
            >
              Manage Roles
            </a>
          </div>
        </div>

        {/* ─── Global Overview Section ─── */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between">
            <div className="space-y-1">
              <h2 className="font-heading text-xl text-legion-text-primary uppercase tracking-[0.2em]">
                Command Centre
              </h2>
              <p className="text-xs text-legion-text-muted font-mono uppercase tracking-widest">
                Legion Status & Resources
              </p>
            </div>
            <div className="w-full md:w-72">
              <LocationThumbnail locationId={campaign.current_location} />
            </div>
          </div>
          
          <GmOverview 
            campaign={campaign}
            personnelCounts={personnelCounts}
            spyCounts={spyCounts}
          />
        </section>

        {/* ─── Broken Tracking Section ─── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <SkullIcon className="w-4 h-4 text-red-500" />
            <h2 className="font-heading text-lg text-legion-text-primary uppercase tracking-widest">
              The Broken
            </h2>
          </div>
          <BrokenTracking 
            campaign={campaign}
            advances={brokenAdvances}
          />
        </section>

        {/* ─── Session Management Section ─── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-legion-amber" />
              <h2 className="font-heading text-lg text-legion-text-primary uppercase tracking-widest">
                Sessions
              </h2>
            </div>
            <form action={createSession}>
              <input type="hidden" name="campaign_id" value={campaign.id} />
              <button 
                type="submit"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-legion-amber/10 border border-legion-amber/30 text-[10px] text-legion-amber uppercase font-bold tracking-widest hover:bg-legion-amber/20 transition-colors"
              >
                <PlusIcon className="w-3 h-3" />
                New Session
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.length > 0 ? (
              sessions.map((s) => (
                <LegionCard key={s.id} className={s.status === 'IN_PROGRESS' ? 'border-legion-amber/50 bg-legion-amber/5' : ''}>
                  <LegionCardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono text-legion-text-muted uppercase tracking-widest">
                          Session {s.session_number}
                        </span>
                        <div className="font-heading text-sm text-legion-text-primary truncate">
                          {s.title || 'Untitled Session'}
                        </div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-tighter uppercase ${
                        s.status === 'COMPLETE' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        s.status === 'IN_PROGRESS' ? 'bg-legion-amber/20 text-legion-amber border border-legion-amber/30 animate-pulse' :
                        'bg-white/10 text-legion-text-muted border border-white/5'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-[10px] font-mono text-legion-text-muted">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {s.date || 'TBD'}
                      </div>
                      {s.linked_phases.length > 0 && (
                        <div className="flex items-center gap-1">
                          <HistoryIcon className="w-3 h-3" />
                          Phases: {s.linked_phases.join(', ')}
                        </div>
                      )}
                    </div>

                    {s.prep_notes && (
                      <div className="text-[10px] text-legion-text-muted line-clamp-2 bg-black/20 p-2 rounded italic">
                        {s.prep_notes}
                      </div>
                    )}
                  </LegionCardContent>
                </LegionCard>
              ))
            ) : (
              <div className="col-span-full py-8 text-center border-2 border-dashed border-white/5 rounded-lg">
                <p className="text-sm text-legion-text-muted italic">No sessions recorded yet.</p>
              </div>
            )}
          </div>
        </section>

        {/* ─── Active Phase Management ─── */}
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <HistoryIcon className="w-4 h-4 text-legion-amber" />
              <h2 className="font-heading text-lg text-legion-text-primary uppercase tracking-widest">
                Campaign Phase
              </h2>
            </div>
            {phaseActive && (
              <span className="px-2 py-1 bg-legion-amber/10 border border-legion-amber/20 rounded text-[10px] text-legion-amber uppercase font-bold tracking-widest">
                Phase {campaign.phase_number} In Progress
              </span>
            )}
          </div>

          {!phaseActive ? (
            <LegionCard>
              <LegionCardContent className="py-12 text-center">
                <p className="font-heading text-xl text-legion-text-primary mb-2">
                  Ready for Next Phase
                </p>
                <p className="text-sm text-legion-text-muted mb-8 max-w-md mx-auto leading-relaxed">
                  The current mission is complete. Start the next campaign phase to resolve outcomes, record casualties, and prepare for the next deployment.
                </p>
                <form action={startCampaignPhase}>
                  <input type="hidden" name="campaign_id" value={campaign.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-legion-amber px-8 py-3 font-heading text-sm font-semibold tracking-widest text-[var(--bob-amber-fg)] hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(var(--bob-amber-rgb),0.3)] uppercase"
                  >
                    Start Campaign Phase
                  </button>
                </form>
              </LegionCardContent>
            </LegionCard>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Phase progress */}
              <PhaseProgressIndicator currentState={phaseState} />

              {/* Step-specific GM action */}
              {phaseState === 'AWAITING_MISSION_RESOLUTION' && (
                <LegionCard className="border-legion-amber/30">
                  <LegionCardHeader>
                    <LegionCardTitle className="text-sm font-medium text-legion-amber uppercase tracking-widest">
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
                <LegionCard className="border-legion-amber/30">
                  <LegionCardHeader>
                    <LegionCardTitle className="text-sm font-medium text-legion-amber uppercase tracking-widest">
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
        </section>

        {/* ─── Campaign Map Section ─── */}
        <section className="space-y-4 pt-4">
          <h2 className="font-heading text-lg text-legion-text-primary uppercase tracking-widest border-b border-white/10 pb-2">
            Strategic Map
          </h2>
          <LocationMap currentLocationId={campaign.current_location} />
        </section>

        {/* ─── Override Authority Section ─── */}
        <section className="space-y-4 pt-4">
          <h2 className="font-heading text-lg text-legion-text-primary uppercase tracking-widest border-b border-white/10 pb-2">
            GM Command & Overrides
          </h2>
          <LegionOverride 
            campaign={campaign}
            phaseState={phaseState}
            backAtCampData={backAtCampData}
            qmData={qmData}
            marshalData={marshalData}
            spymasterData={spymasterData}
            missions={campaignMissions || undefined}
          />
        </section>

        {/* ─── GM Authority Section (Permanent) ─── */}
        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <AlertTriangleIcon className="w-4 h-4 text-legion-amber" />
            <h2 className="font-heading text-lg text-legion-text-primary uppercase tracking-widest">
              GM Authority & Overrides
            </h2>
          </div>
          <LegionCard className="border-legion-amber/20 bg-black/20">
            <LegionCardContent className="pt-6">
              <GmOverrideForm campaign={campaign} />
            </LegionCardContent>
          </LegionCard>
        </section>

      </div>

    </DashboardShell>
  );
}
