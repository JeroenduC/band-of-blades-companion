import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { LegionRole } from '@/lib/types';

const ROLE_ROUTES: Record<LegionRole, string> = {
  GM: '/dashboard/gm',
  COMMANDER: '/dashboard/commander',
  MARSHAL: '/dashboard/marshal',
  QUARTERMASTER: '/dashboard/quartermaster',
  LOREKEEPER: '/dashboard/lorekeeper',
  SPYMASTER: '/dashboard/spymaster',
  SOLDIER: '/dashboard/commander', // Soldiers see a read-only view (Epic 11); default to commander for now
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  // Find the user's PRIMARY role in the most recently joined campaign.
  const { data: membership } = await supabase
    .from('campaign_memberships')
    .select('role, campaign_id')
    .eq('user_id', user.id)
    .eq('rank', 'PRIMARY')
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect('/campaign/join');
  }

  redirect(ROLE_ROUTES[membership.role as LegionRole]);
}
