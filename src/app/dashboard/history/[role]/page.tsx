import { loadDashboard, loadLorekeeperData } from '@/server/loaders/dashboard';
import { DashboardShell } from '@/components/features/campaign/dashboard-shell';
import { CampaignHistory } from '@/components/features/campaign/campaign-history';
import { type LegionRole } from '@/lib/types';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Campaign History — Band of Blades' };

interface HistoryPageProps {
  params: Promise<{ role: string }>;
}

export default async function HistoryPage({ params }: HistoryPageProps) {
  const { role: roleParam } = await params;
  const role = roleParam.toUpperCase() as LegionRole;
  
  // Use existing loader to verify authentication and membership
  const { campaign } = await loadDashboard(role);
  
  // Reuse Lorekeeper loader which has missions, logs, and annals
  const { logs, missions, annals } = await loadLorekeeperData(campaign.id);

  return (
    <DashboardShell 
      role={role} 
      campaignName={campaign.name}
      campaignId={campaign.id}
      currentState={campaign.campaign_phase_state}
      pendingExpiry={campaign.pending_expiry}
    >
      <CampaignHistory 
        campaign={campaign}
        role={role}
        logs={logs}
        missions={missions}
        annals={annals}
      />
    </DashboardShell>
  );
}
