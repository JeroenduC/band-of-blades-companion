import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { RoleAssignmentForm } from '@/components/features/campaign/role-assignment-form';
import { RemovePlayerButton } from '@/components/features/campaign/remove-player-button';
import type { CampaignMembershipWithProfile } from '@/lib/types';

export const metadata = { title: 'Manage roles — Band of Blades' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MembersPage({ params }: Props) {
  const { id: campaignId } = await params;
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  // Verify the caller is the GM of this campaign.
  const { data: gmMembership } = await db
    .from('campaign_memberships')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .eq('role', 'GM')
    .maybeSingle();

  if (!gmMembership) notFound();

  const { data: campaign } = await db
    .from('campaigns')
    .select('name')
    .eq('id', campaignId)
    .single();

  const { data: memberships } = await db
    .from('campaign_memberships')
    .select('id, user_id, campaign_id, role, rank, assigned_at, profiles(display_name)')
    .eq('campaign_id', campaignId)
    .order('assigned_at', { ascending: true });

  const campaignName = campaign?.name ?? 'this campaign';

  return (
    <main className="flex min-h-screen flex-col p-6 gap-6 max-w-2xl mx-auto">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Manage roles</p>
        <h1 className="text-xl font-bold">{campaignName}</h1>
      </header>

      <section className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Assign each player a Legion role. Players with no role are listed as Soldier (observer).
        </p>

        <div className="space-y-3">
          {(memberships as CampaignMembershipWithProfile[] | null)?.map((m) => {
            const isGm = m.user_id === user.id;
            const displayName = m.profiles?.display_name ?? 'Unknown player';

            return (
              <div key={m.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <RoleAssignmentForm membership={m} campaignId={campaignId} />
                  </div>
                  {!isGm && (
                    <RemovePlayerButton
                      membershipId={m.id}
                      campaignId={campaignId}
                      playerName={displayName}
                      campaignName={campaignName}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <a href="/dashboard/gm" className="text-sm text-muted-foreground underline underline-offset-4">
        ← Back to dashboard
      </a>
    </main>
  );
}
