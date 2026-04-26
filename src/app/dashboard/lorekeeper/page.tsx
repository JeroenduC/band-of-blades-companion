import { loadDashboard, loadBackAtCampScenes, loadLorekeeperData, loadQmMateriel } from '@/server/loaders/dashboard';
import { DashboardShell } from '@/components/features/campaign/dashboard-shell';
import { WaitingForOthers } from '@/components/features/campaign/waiting-for-others';
import { BackAtCampForm } from '@/components/features/campaign/back-at-camp-form';
import { TalesOfLegionForm } from '@/components/features/campaign/tales-of-legion-form';
import { DeathTracker } from '@/components/features/campaign/death-tracker';
import { AnnalsList } from '@/components/features/campaign/annals-list';
import { 
  LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle,
  LegionTabs, LegionTabsList, LegionTabsTrigger, LegionTabsContent
} from '@/components/legion';
import { isRoleActive } from '@/lib/state-machine';
import type { CampaignPhaseState } from '@/lib/types';

export const metadata = { title: 'Lorekeeper — Band of Blades' };

export default async function LorekeeperDashboardPage() {
  const { campaign } = await loadDashboard('LOREKEEPER');
  const lorekeeperData = await loadLorekeeperData(campaign.id);
  
  const phaseState = campaign.campaign_phase_state as CampaignPhaseState | null;
  const isMyTurn = phaseState !== null && isRoleActive('LOREKEEPER', phaseState);

  // Only fetch extra data when it's actually needed
  const scenesData =
    phaseState === 'AWAITING_BACK_AT_CAMP' && isMyTurn
      ? await loadBackAtCampScenes(campaign.id, campaign.morale)
      : null;

  const qmData = 
    phaseState === 'AWAITING_TALES' && isMyTurn
      ? await loadQmMateriel(campaign.id, campaign.phase_number)
      : null;

  return (
    <DashboardShell role="LOREKEEPER" campaignName={campaign.name}>
      <div className="space-y-8">
        {/* Sacred Duty Header */}
        <section className="border-b border-border pb-4">
          <h2 className="text-2xl font-heading font-bold text-legion-text uppercase tracking-tight">
            The Lorekeeper
          </h2>
          <p className="text-sm text-legion-text-muted italic">
            "We are the memory of the Legion. Every name, every deed, every sacrifice — recorded for eternity."
          </p>
        </section>

        <LegionTabs defaultValue="duty" className="space-y-6">
          <LegionTabsList className="bg-legion-bg-elevated border-border">
            <LegionTabsTrigger value="duty" className="font-heading text-xs uppercase tracking-widest">
              Sacred Duty
            </LegionTabsTrigger>
            <LegionTabsTrigger value="annals" className="font-heading text-xs uppercase tracking-widest">
              The Annals
            </LegionTabsTrigger>
          </LegionTabsList>

          <LegionTabsContent value="duty" className="space-y-10 outline-none">
            {/* Current Task */}
            <section className="space-y-4">
              <h3 className="text-sm font-heading font-semibold text-legion-text-muted uppercase tracking-widest">
                Current Phase Task
              </h3>
              
              {phaseState === null ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center bg-legion-bg-subtle/50">
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
                ) : phaseState === 'AWAITING_TALES' ? (
                  <TalesOfLegionForm
                    campaignId={campaign.id}
                    talesToldIds={campaign.tales_told || []}
                    activeProjects={qmData?.longTermProjects.filter(p => !p.completed_at) || []}
                  />
                ) : (
                  <div className="rounded-lg border border-legion-amber/50 bg-legion-amber/5 p-6 text-center shadow-lg shadow-legion-amber/5">
                    <p className="font-heading text-lg text-legion-amber mb-1 uppercase tracking-tight">It&apos;s your turn, Lorekeeper</p>
                    <p className="text-sm text-legion-text-muted italic">
                      Lorekeeper action for this step coming soon.
                    </p>
                  </div>
                )
              ) : (
                <WaitingForOthers currentState={phaseState} viewerRole="LOREKEEPER" />
              )}
            </section>

            {/* Death Tracker & Memorial */}
            <section className="space-y-4 pt-4">
              <h3 className="text-sm font-heading font-semibold text-legion-text-muted uppercase tracking-widest">
                The Fallen
              </h3>
              <DeathTracker 
                deathsSinceLastTale={campaign.deaths_since_last_tale}
                totalFallen={lorekeeperData.totalFallen}
                fallen={lorekeeperData.fallen}
              />
            </section>
          </LegionTabsContent>

          <LegionTabsContent value="annals" className="outline-none">
            <section className="space-y-6">
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-heading font-bold text-legion-text uppercase tracking-tight">
                  The Annals of the Legion
                </h3>
                <p className="text-xs text-legion-text-muted italic">
                  Chronicle the retreat. Let none forget the cost of our journey to Skydagger Keep.
                </p>
              </div>
              
              <AnnalsList 
                campaignId={campaign.id}
                data={lorekeeperData}
                currentPhaseNumber={campaign.phase_number}
              />
            </section>
          </LegionTabsContent>
        </LegionTabs>
      </div>
    </DashboardShell>
  );
}
