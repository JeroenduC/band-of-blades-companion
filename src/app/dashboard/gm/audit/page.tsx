import { loadGmDashboard, loadLorekeeperData } from '@/server/loaders/dashboard';
import { DashboardShell } from '@/components/features/campaign/dashboard-shell';
import { AuditTrail } from '@/components/features/campaign/audit-trail';
import { ChevronLeftIcon } from 'lucide-react';

export const metadata = { title: 'Campaign Audit Trail — Band of Blades' };

export default async function GmAuditPage() {
  const { campaign } = await loadGmDashboard();
  const { logs } = await loadLorekeeperData(campaign.id);

  return (
    <DashboardShell role="GM" campaignName={campaign.name}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <a
            href="/dashboard/gm"
            className="p-2 rounded-md border border-white/10 bg-white/5 text-legion-text-muted hover:text-legion-amber transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </a>
          <div>
            <h1 className="font-heading text-2xl text-legion-text-primary uppercase tracking-widest">
              Audit Trail
            </h1>
            <p className="text-xs text-legion-text-muted font-mono uppercase tracking-widest">
              Full Campaign Activity Log
            </p>
          </div>
        </div>

        <AuditTrail logs={logs} />
      </div>
    </DashboardShell>
  );
}
