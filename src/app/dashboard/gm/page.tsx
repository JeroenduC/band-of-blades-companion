import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/server/actions/auth';

export const metadata = { title: 'GM Dashboard — Band of Blades' };

export default async function GmDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: membership } = await supabase
    .from('campaign_memberships')
    .select('campaign_id, campaigns(name, invite_code)')
    .eq('user_id', user.id)
    .eq('role', 'GM')
    .eq('rank', 'PRIMARY')
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const campaign = membership?.campaigns as unknown as { name: string; invite_code: string } | null;

  return (
    <main className="flex min-h-screen flex-col p-6 gap-6 max-w-2xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">GM</p>
          <h1 className="text-xl font-bold">{campaign?.name ?? 'No campaign'}</h1>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-sm text-muted-foreground underline underline-offset-4">
            Sign out
          </button>
        </form>
      </header>

      {campaign && (
        <section className="rounded-lg border p-4 space-y-1">
          <p className="text-sm font-medium">Invite code</p>
          <p className="font-mono text-lg tracking-widest">{campaign.invite_code}</p>
          <p className="text-xs text-muted-foreground">Share this with your players so they can join.</p>
        </section>
      )}

      <section className="rounded-lg border p-4 space-y-2">
        <h2 className="font-semibold">Campaign actions</h2>
        <ul className="space-y-2">
          {membership && (
            <li>
              <a
                href={`/campaign/${membership.campaign_id}/members`}
                className="text-sm underline underline-offset-4"
              >
                Manage roles →
              </a>
            </li>
          )}
        </ul>
      </section>

      <section className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        GM tools coming in Epic 9. For now, use the role management screen above to assign roles to your players.
      </section>
    </main>
  );
}
