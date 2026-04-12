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
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Welcome to the Legion!</h1>
          {campaignName && (
            <p className="text-sm text-muted-foreground">
              Campaign: <span className="font-medium text-foreground">{campaignName}</span>
            </p>
          )}
        </div>

        <p className="text-muted-foreground">
          Your GM hasn&apos;t assigned your role yet. Once they do, you&apos;ll see your dashboard here.
        </p>

        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-muted-foreground underline underline-offset-4"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
