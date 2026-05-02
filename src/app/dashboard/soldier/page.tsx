import { 
  loadDashboard, 
  loadMarshalPersonnel, 
  loadSpyData, 
  loadLorekeeperData 
} from '@/server/loaders/dashboard';
import { DashboardShell } from '@/components/features/campaign/dashboard-shell';
import { GmOverview } from '@/components/features/campaign/gm-overview';
import { PhaseSummary } from '@/components/features/campaign/phase-summary';
import { LocationThumbnail } from '@/components/features/campaign/location-thumbnail';
import { LocationMap } from '@/components/features/campaign/location-map';
import { PhaseProgressIndicator } from '@/components/features/campaign/phase-progress-indicator';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import type { CampaignPhaseState } from '@/lib/types';
import { AlertCircleIcon } from 'lucide-react';

export const metadata = { title: 'Soldier Dashboard — Band of Blades' };

export default async function SoldierDashboardPage() {
  const { campaign } = await loadDashboard('SOLDIER');
  const phaseState = campaign.campaign_phase_state as CampaignPhaseState | null;

  // Load read-only data for the overview
  const [personnelData, spyData, lorekeeperData] = await Promise.all([
    loadMarshalPersonnel(campaign.id),
    loadSpyData(campaign.id),
    loadLorekeeperData(campaign.id)
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

  if (phaseState === 'PHASE_COMPLETE') {
    return (
      <DashboardShell 
      role="SOLDIER" 
      campaignName={campaign.name}
      campaignId={campaign.id}
      currentState={phaseState}
      pendingExpiry={campaign.pending_expiry}
    >
        <PhaseSummary campaign={campaign} role="SOLDIER" logs={lorekeeperData.logs} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell 
      role="SOLDIER" 
      campaignName={campaign.name}
      campaignId={campaign.id}
      currentState={phaseState}
      pendingExpiry={campaign.pending_expiry}
    >
      <div className="space-y-8 animate-in fade-in duration-500">
        
        {/* ─── Role Banner ─── */}
        <div className="bg-legion-bg-surface border-l-4 border-legion-text-muted p-4 rounded-r-md">
          <div className="flex items-center gap-3">
            <AlertCircleIcon className="w-5 h-5 text-legion-text-muted" />
            <div>
              <h2 className="text-sm font-bold text-legion-text-primary uppercase tracking-wide">Observer Status</h2>
              <p className="text-xs text-legion-text-muted italic leading-relaxed">
                "Follow the march. Watch the horizon. The command roles lead, but we are the Legion."
              </p>
            </div>
          </div>
        </div>

        {/* ─── Global Stats ─── */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-2">
            <h3 className="font-heading text-lg text-legion-text-primary uppercase tracking-widest">Legion Status</h3>
            <div className="w-full sm:w-64">
              <LocationThumbnail locationId={campaign.current_location} />
            </div>
          </div>
          <GmOverview 
            campaign={campaign}
            personnelCounts={personnelCounts}
            spyCounts={spyCounts}
          />
        </section>

        {/* ─── Phase Progress ─── */}
        <section className="space-y-4">
          <h3 className="font-heading text-lg text-legion-text-primary uppercase tracking-widest border-b border-white/10 pb-2">Current Phase</h3>
          <PhaseProgressIndicator currentState={phaseState} />
          
          <LegionCard className="border-white/5 bg-white/5 opacity-80">
            <LegionCardContent className="py-6 text-center">
              <p className="text-sm text-legion-text-muted italic">
                Awaiting command decisions. Your officers are handling the current step.
              </p>
            </LegionCardContent>
          </LegionCard>
        </section>

        {/* ─── Strategic Map ─── */}
        <section className="space-y-4">
          <h3 className="font-heading text-lg text-legion-text-primary uppercase tracking-widest border-b border-white/10 pb-2">Strategic Map</h3>
          <LocationMap currentLocationId={campaign.current_location} />
        </section>

      </div>
    </DashboardShell>
  );
}
