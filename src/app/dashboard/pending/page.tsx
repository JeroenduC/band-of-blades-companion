import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { PageShell } from '@/components/features/auth/page-shell';
import { PendingMember } from '@/components/features/campaign/pending-member';
import { RealtimeDashboard } from '@/components/features/campaign/realtime-dashboard';

export const metadata = { title: 'Waiting for role — Band of Blades' };

export default async function PendingDashboardPage() {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: membership } = await db
    .from('campaign_memberships')
    .select('campaign_id, campaigns(name, campaign_phase_state)')
    .eq('user_id', user.id)
    .is('role', null)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership) redirect('/dashboard');

  const campaignId = membership.campaign_id;
  const campaignName = (membership.campaigns as any)?.name ?? 'Unknown Campaign';
  const phaseState = (membership.campaigns as any)?.campaign_phase_state || null;

  return (
    <>
      <RealtimeDashboard
        campaignId={campaignId}
        userRole={null}
        currentState={phaseState}
      />
      <PageShell
        overline="338th Legion · Awaiting Orders"
        heading="Waiting for the GM"
        stamp={{ label: 'Pending', color: 'amber' }}
      >
        <PendingMember campaignName={campaignName} />
      </PageShell>
    </>
  );
}
