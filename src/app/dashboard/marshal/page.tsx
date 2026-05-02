import { loadDashboard, loadMarshalPersonnel, loadMissions, loadLorekeeperData } from '@/server/loaders/dashboard';
import { DashboardShell } from '@/components/features/campaign/dashboard-shell';
import { PhaseSummary } from '@/components/features/campaign/phase-summary';
import { WaitingForOthers } from '@/components/features/campaign/waiting-for-others';
import { MarshalOverview } from '@/components/features/campaign/marshal-overview';
import { SpecialistRoster } from '@/components/features/campaign/specialist-roster';
import { SquadManagement } from '@/components/features/campaign/squad-management';
import { MissionDeploymentForm } from '@/components/features/campaign/mission-deployment-form';
import { EngagementRollBuilder } from '@/components/features/campaign/engagement-roll-builder';
import { PersonnelUpdateForm } from '@/components/features/campaign/personnel-update-form';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { isRoleActive } from '@/lib/state-machine';
import type { CampaignPhaseState } from '@/lib/types';
import { createServiceClient } from '@/lib/supabase/service';

export const metadata = { title: 'Marshal — Band of Blades' };

export default async function MarshalDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { campaign } = await loadDashboard('MARSHAL');
  const personnel = await loadMarshalPersonnel(campaign.id);
  const missions = await loadMissions(campaign.id, campaign.phase_number);
  const phaseState = campaign.campaign_phase_state as CampaignPhaseState | null;
  const isMyTurn = phaseState !== null && isRoleActive('MARSHAL', phaseState);

  const { tab = 'squads' } = await searchParams;

  const db = createServiceClient();
  const { data: deploymentLog } = await db
    .from('campaign_phase_log')
    .select('*')
    .eq('campaign_id', campaign.id)
    .eq('phase_number', campaign.phase_number)
    .eq('action_type', 'PERSONNEL_DEPLOYED')
    .maybeSingle();

  const isDeployed = !!deploymentLog;

  if (phaseState === 'PHASE_COMPLETE') {
    const { logs } = await loadLorekeeperData(campaign.id);
    return (
      <DashboardShell 
      role="MARSHAL" 
      campaignName={campaign.name}
      campaignId={campaign.id}
      currentState={phaseState}
      pendingExpiry={campaign.pending_expiry}
    >
        <PhaseSummary campaign={campaign} role="MARSHAL" logs={logs} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell 
      role="MARSHAL" 
      campaignName={campaign.name}
      campaignId={campaign.id}
      currentState={phaseState}
      pendingExpiry={campaign.pending_expiry}
    >
      <div className="space-y-6">
        <MarshalOverview
          morale={campaign.morale}
          totalLegionnaires={personnel.totalLegionnaires}
          totalSpecialists={personnel.totalSpecialists}
          totalSquads={personnel.totalSquads}
        />

        {phaseState === null ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-legion-text-muted">
              No campaign phase in progress. Waiting for the GM to start one.
            </p>
          </div>
        ) : isMyTurn ? (
          phaseState === 'AWAITING_MISSION_DEPLOYMENT' ? (
            <div className="space-y-6">
              <LegionCard>
                <LegionCardHeader>
                  <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
                    Step 11 — {isDeployed ? 'Engagement Rolls' : 'Personnel Deployment'}
                  </LegionCardTitle>
                </LegionCardHeader>
                <LegionCardContent>
                  {isDeployed ? (
                    <EngagementRollBuilder 
                      campaignId={campaign.id} 
                      missions={missions} 
                    />
                  ) : (
                    <MissionDeploymentForm 
                      campaignId={campaign.id} 
                      missions={missions} 
                      specialists={personnel.specialists}
                      squads={personnel.squads}
                    />
                  )}
                </LegionCardContent>
              </LegionCard>
            </div>
          ) : phaseState === 'AWAITING_PERSONNEL_UPDATE' ? (
            <div className="space-y-6">
               <LegionCard>
                <LegionCardHeader>
                  <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
                    Step 2 — Personnel Update
                  </LegionCardTitle>
                </LegionCardHeader>
                <LegionCardContent>
                  <PersonnelUpdateForm
                    campaignId={campaign.id}
                    deployedSpecialists={personnel.specialists.filter(s => s.status === 'DEPLOYED')}
                    deployedSquads={personnel.squads.filter(s => s.members.some(m => m.status === 'ALIVE'))} // Should filter by actually deployed in log but for proto this works
                  />
                </LegionCardContent>
              </LegionCard>
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--bob-amber)] bg-legion-bg-elevated p-6 text-center">
              <p className="font-heading text-lg text-legion-amber mb-1">It&apos;s your turn, Marshal</p>
              <p className="text-sm text-legion-text-muted">
                Marshal action for this step ({phaseState}) coming soon.
              </p>
            </div>
          )
        ) : (
          <WaitingForOthers currentState={phaseState} viewerRole="MARSHAL" />
        )}

        {/* Personnel Tabs (Only show if not in a critical phase step or if user wants to see them) */}
        <div className="space-y-4">
          <div className="flex border-b border-legion-border overflow-x-auto no-scrollbar">
            <a
              href="?tab=squads"
              className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap ${
                tab === 'squads'
                  ? 'border-b-2 border-[var(--bob-amber)] text-legion-text'
                  : 'text-legion-text-muted hover:text-legion-text'
              }`}
            >
              Squad Roster
            </a>
            <a
              href="?tab=specialists"
              className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap ${
                tab === 'specialists'
                  ? 'border-b-2 border-[var(--bob-amber)] text-legion-text'
                  : 'text-legion-text-muted hover:text-legion-text'
              }`}
            >
              Specialist Roster
            </a>
          </div>

          <div className="pt-2">
            {tab === 'squads' ? (
              <SquadManagement
                squads={personnel.squads}
                isMarshal={true}
                totalRookiesSoldiers={personnel.totalLegionnaires - personnel.totalSpecialists}
              />
            ) : (
              <SpecialistRoster
                specialists={personnel.specialists}
                isMarshal={true}
              />
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
