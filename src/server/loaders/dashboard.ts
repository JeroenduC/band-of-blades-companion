/**
 * Dashboard data loader — shared by all six role dashboard pages.
 *
 * Fetches the authenticated user, their campaign membership, and the
 * current campaign state in one place. All dashboard pages call this
 * and redirect to /sign-in if the user is not authenticated.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { Campaign, CampaignMembership, LegionRole } from '@/lib/types';

export interface DashboardData {
  userId: string;
  campaign: Campaign;
  membership: CampaignMembership & { role: LegionRole };
}

/**
 * Load the dashboard data for a given role.
 *
 * Redirects to /sign-in if not authenticated.
 * Redirects to /dashboard if the user has no membership for this role.
 *
 * @param role - The role to load the dashboard for. Pass null for GM.
 */
export async function loadDashboard(role: LegionRole): Promise<DashboardData> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  // Find the membership for this role (PRIMARY or DEPUTY)
  const { data: membership } = await db
    .from('campaign_memberships')
    .select(`
      id,
      user_id,
      campaign_id,
      role,
      rank,
      assigned_at,
      campaigns (
        id, name, invite_code, current_phase, campaign_phase_state,
        phase_number, morale, pressure, intel, supply,
        time_clock_1, time_clock_2, time_clock_3,
        food_uses, horse_uses, black_shot_uses,
        religious_supply_uses, supply_carts,
        qm_actions_complete, spymaster_actions_complete,
        current_location, created_at
      )
    `)
    .eq('user_id', user.id)
    .eq('role', role)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.campaigns) redirect('/dashboard');

  return {
    userId: user.id,
    campaign: membership.campaigns as unknown as Campaign,
    membership: membership as unknown as CampaignMembership & { role: LegionRole },
  };
}

/**
 * GM-specific loader — the GM is identified by role = 'GM' and rank = 'PRIMARY'.
 */
export async function loadGmDashboard(): Promise<DashboardData> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: membership } = await db
    .from('campaign_memberships')
    .select(`
      id,
      user_id,
      campaign_id,
      role,
      rank,
      assigned_at,
      campaigns (
        id, name, invite_code, current_phase, campaign_phase_state,
        phase_number, morale, pressure, intel, supply,
        time_clock_1, time_clock_2, time_clock_3,
        food_uses, horse_uses, black_shot_uses,
        religious_supply_uses, supply_carts,
        qm_actions_complete, spymaster_actions_complete,
        current_location, created_at
      )
    `)
    .eq('user_id', user.id)
    .eq('role', 'GM')
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.campaigns) redirect('/dashboard');

  return {
    userId: user.id,
    campaign: membership.campaigns as unknown as Campaign,
    membership: membership as unknown as CampaignMembership & { role: LegionRole },
  };
}
