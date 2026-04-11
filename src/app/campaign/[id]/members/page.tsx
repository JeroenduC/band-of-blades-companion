import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RoleAssignmentForm } from '@/components/features/campaign/role-assignment-form';
import type { CampaignMembershipWithProfile } from '@/lib/types';

export const metadata = { title: 'Manage roles — Band of Blades' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MembersPage({ params }: Props) {
  const { id: campaignId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  // Verify the caller is the GM of this campaign.
  const { data: gmMembership } = await supabase
    .from('campaign_memberships')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .eq('role', 'GM')
    .maybeSingle();

  if (!gmMembership) notFound();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name')
    .eq('id', campaignId)
    .single();

  const { data: memberships } = await supabase
    .from('campaign_memberships')
    .select('id, user_id, campaign_id, role, rank, assigned_at, profiles(display_name)')
    .eq('campaign_id', campaignId)
    .order('assigned_at', { ascending: true });

  return (
    <main className="flex min-h-screen flex-col p-6 gap-6 max-w-2xl mx-auto">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Manage roles</p>
        <h1 className="text-xl font-bold">{campaign?.name}</h1>
      </header>

      <section className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Assign each player a Legion role. Players with no role are listed as Soldier (observer).
        </p>

        <div className="space-y-3">
          {(memberships as CampaignMembershipWithProfile[] | null)?.map((m) => (
            <div key={m.id} className="rounded-lg border p-3">
              <RoleAssignmentForm membership={m} campaignId={campaignId} />
            </div>
          ))}
        </div>
      </section>

      <a href="/dashboard/gm" className="text-sm text-muted-foreground underline underline-offset-4">
        ← Back to dashboard
      </a>
    </main>
  );
}
