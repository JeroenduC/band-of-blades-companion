import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { LegionRole } from '@/lib/types';

const ROLE_ROUTES: Record<LegionRole, string> = {
  GM: '/dashboard/gm',
  COMMANDER: '/dashboard/commander',
  MARSHAL: '/dashboard/marshal',
  QUARTERMASTER: '/dashboard/quartermaster',
  LOREKEEPER: '/dashboard/lorekeeper',
  SPYMASTER: '/dashboard/spymaster',
  SOLDIER: '/dashboard/soldier',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  // Find the user's most recent PRIMARY role membership.
  const { data: membership } = await db
    .from('campaign_memberships')
    .select('role, campaign_id')
    .eq('user_id', user.id)
    .eq('rank', 'PRIMARY')
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membership?.role && ROLE_ROUTES[membership.role as LegionRole]) {
    redirect(ROLE_ROUTES[membership.role as LegionRole]);
  }

  // No PRIMARY role found — check if they are a pending member (joined but no
  // role assigned yet).
  const { data: pending } = await db
    .from('campaign_memberships')
    .select('id')
    .eq('user_id', user.id)
    .is('role', null)
    .limit(1)
    .maybeSingle();

  if (pending) {
    redirect('/dashboard/pending');
  }

  // No membership at all — send them to join a campaign.
  redirect('/campaign/join');
}
