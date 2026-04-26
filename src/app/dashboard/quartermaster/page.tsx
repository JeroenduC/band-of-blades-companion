import { loadDashboard, loadQmMateriel, loadLorekeeperData } from '@/server/loaders/dashboard';
import { DashboardShell } from '@/components/features/campaign/dashboard-shell';
import { PhaseSummary } from '@/components/features/campaign/phase-summary';
import { WaitingForOthers } from '@/components/features/campaign/waiting-for-others';
import { QmCampaignActions } from '@/components/features/campaign/qm-campaign-actions';
import { QmMaterielPanel } from '@/components/features/campaign/qm-materiel-panel';
import { AlchemistsLaborersForm } from '@/components/features/campaign/alchemists-laborers-form';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { isRoleActive } from '@/lib/state-machine';
import type { CampaignPhaseState } from '@/lib/types';

export const metadata = { title: 'Quartermaster — Band of Blades' };

export default async function QuartermasterDashboardPage() {
  const { campaign } = await loadDashboard('QUARTERMASTER');
  const phaseState = campaign.campaign_phase_state as CampaignPhaseState | null;
  const isMyTurn = phaseState !== null && isRoleActive('QUARTERMASTER', phaseState);

  // Always load materiel so the panel is visible regardless of phase state
  const materiel = await loadQmMateriel(campaign.id, campaign.phase_number);

  if (phaseState === 'PHASE_COMPLETE') {
    const { logs } = await loadLorekeeperData(campaign.id);
    return (
      <DashboardShell role="QUARTERMASTER" campaignName={campaign.name}>
        <PhaseSummary campaign={campaign} role="QUARTERMASTER" logs={logs} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell role="QUARTERMASTER" campaignName={campaign.name}>

      {/* Materiel panel — always visible */}
      <QmMaterielPanel
        campaign={campaign}
        alchemists={materiel.alchemists}
        mercies={materiel.mercies}
        laborers={materiel.laborers}
        longTermProjects={materiel.longTermProjects}
        siegeWeapons={materiel.siegeWeapons}
        recruitPool={materiel.recruitPool}
      />

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
              <QmCampaignActions
                campaign={campaign}
                mercies={materiel.mercies}
                longTermProjects={materiel.longTermProjects}
                acquiredAssetTypes={materiel.acquiredAssetTypes}
              />
            </LegionCardContent>
          </LegionCard>
        ) : phaseState === 'AWAITING_LABORERS_ALCHEMISTS' ? (
          <LegionCard>
            <LegionCardHeader>
              <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
                Step 6 — Laborers &amp; Alchemists
              </LegionCardTitle>
            </LegionCardHeader>
            <LegionCardContent>
              <AlchemistsLaborersForm
                campaignId={campaign.id}
                alchemists={materiel.alchemists}
                laborers={materiel.laborers}
                longTermProjects={materiel.longTermProjects}
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
