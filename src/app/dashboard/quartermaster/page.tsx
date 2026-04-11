import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { signOut } from '@/server/actions/auth';

export const metadata = { title: 'Quartermaster — Band of Blades' };

export default async function QuartermasterDashboardPage() {
  const supabase = await createClient();
  const db = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: membership } = await db
    .from('campaign_memberships')
    .select('campaigns(name)')
    .eq('user_id', user.id)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const campaign = membership?.campaigns as unknown as { name: string } | null;

  return (
    <main className="flex min-h-screen flex-col p-6 gap-6 max-w-2xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Quartermaster</p>
          <h1 className="text-xl font-bold">{campaign?.name ?? 'No campaign'}</h1>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-sm text-muted-foreground underline underline-offset-4">
            Sign out
          </button>
        </form>
      </header>

      <section className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Quartermaster tools coming in Epic 4. You'll manage supply, perform campaign actions, and track materiel here.
      </section>
    </main>
  );
}
