import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { signOut } from '@/server/actions/auth';

export const metadata = { title: 'Waiting for role — Band of Blades' };

export default async function PendingDashboardPage() {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  // Fetch the pending membership and join to get the campaign name.
  const { data: membership } = await db
    .from('campaign_memberships')
    .select('campaign_id, campaigns(name)')
    .eq('user_id', user.id)
    .is('role', null)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // If role was assigned since they last loaded, route them to the right place.
  if (!membership) redirect('/dashboard');

  const campaignName = (membership.campaigns as unknown as { name: string } | null)?.name;

  return (
    <div className="min-h-screen bg-legion-bg-base max-w-[1240px] mx-auto border-x border-border/20 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-10">
      <div className="w-full max-w-sm text-center space-y-6">

        {/* Identity */}
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-legion-text-muted mb-3">
            338th Legion · Pending
          </p>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.05em] text-legion-amber leading-none">
            Welcome to<br />the Legion
          </h1>
          <div className="h-0.5 w-10 bg-legion-amber mx-auto mt-4" />
        </div>

        {/* Campaign badge */}
        {campaignName && (
          <div className="rounded-md border border-border bg-legion-bg-surface px-4 py-3 inline-block">
            <p className="font-mono text-xs uppercase tracking-widest text-legion-text-muted mb-0.5">
              Campaign
            </p>
            <p className="font-heading text-sm tracking-wide text-legion-text-primary">
              {campaignName}
            </p>
          </div>
        )}

        {/* Status message */}
        <p className="text-sm text-legion-text-muted leading-relaxed">
          Your GM hasn&apos;t assigned your role yet. Once they do,
          you&apos;ll see your dashboard here. You can safely close this tab
          and come back later.
        </p>

        {/* Sign out */}
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-legion-text-muted underline underline-offset-4 hover:text-legion-text-primary transition-colors min-h-[44px] px-2"
          >
            Sign out
          </button>
        </form>

      </div>
    </div>
  );
}
