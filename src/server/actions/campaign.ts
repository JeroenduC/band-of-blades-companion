'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { LegionRole, MemberRank } from '@/lib/types';
import { seedBackAtCampScenes } from './campaign-phase';

function generateInviteCode(): string {
  // Exclude visually ambiguous characters (0/O, 1/I/L) to reduce join errors.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
}

export async function createCampaign(
  _prevState: { error: string } | null,
  formData: FormData
) {
  // Use the user-scoped client only for auth verification.
  // All writes go through the service client because the JWT isn't reliably
  // propagated to RLS in Next.js server actions with @supabase/ssr.
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'Campaign name is required' };

  // Retry up to 5 times to get a unique invite code.
  let inviteCode = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await db
      .from('campaigns')
      .select('id')
      .eq('invite_code', inviteCode)
      .maybeSingle();
    if (!existing) break;
    inviteCode = generateInviteCode();
  }

  const { data: campaign, error } = await db
    .from('campaigns')
    .insert({ name, invite_code: inviteCode })
    .select()
    .single();

  if (error || !campaign) return { error: error?.message ?? 'Failed to create campaign' };

  const { error: memberError } = await db
    .from('campaign_memberships')
    .insert({
      user_id: user.id,
      campaign_id: campaign.id,
      role: 'GM' as LegionRole,
      rank: 'PRIMARY' as MemberRank,
    });

  if (memberError) return { error: memberError.message };

  // Seed the Back at Camp scene pool for this campaign
  await seedBackAtCampScenes(campaign.id);

  revalidatePath('/dashboard');
  redirect('/dashboard/gm');
}

export async function joinCampaign(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const inviteCode = (formData.get('invite_code') as string)?.trim().toUpperCase();
  if (!inviteCode) return { error: 'Invite code is required' };

  const { data: campaign, error: campaignError } = await db
    .from('campaigns')
    .select('id')
    .eq('invite_code', inviteCode)
    .maybeSingle();

  if (campaignError || !campaign) return { error: 'Invalid invite code' };

  const { data: existing } = await db
    .from('campaign_memberships')
    .select('id')
    .eq('campaign_id', campaign.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) return { error: "You've already joined this campaign." };

  // Players join as pending members — no role assigned.
  // The GM assigns roles from the role management screen.
  // NOTE: the campaign_memberships.role and .rank columns must allow NULL
  // in the database schema for this to work. If they are NOT NULL, run:
  //   ALTER TABLE campaign_memberships ALTER COLUMN role DROP NOT NULL;
  //   ALTER TABLE campaign_memberships ALTER COLUMN rank DROP NOT NULL;
  const { error: memberError } = await db
    .from('campaign_memberships')
    .insert({
      user_id: user.id,
      campaign_id: campaign.id,
    });

  if (memberError) {
    // 23505 = unique_violation: the player somehow already has a row
    // (race condition between the check above and this insert).
    if (memberError.code === '23505') {
      return { error: "You've already joined this campaign." };
    }
    // Never expose raw database errors to users.
    console.error('[joinCampaign] unexpected error:', memberError);
    return { error: 'Something went wrong joining the campaign. Please try again.' };
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function assignRole(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const membershipId = formData.get('membership_id') as string;
  const roleRaw = formData.get('role') as string;
  const rankRaw = formData.get('rank') as string;
  const campaignId = formData.get('campaign_id') as string;

  const VALID_ROLES: LegionRole[] = ['GM', 'COMMANDER', 'MARSHAL', 'QUARTERMASTER', 'LOREKEEPER', 'SPYMASTER', 'SOLDIER'];
  const VALID_RANKS: MemberRank[] = ['PRIMARY', 'DEPUTY'];

  if (!VALID_ROLES.includes(roleRaw as LegionRole)) {
    return { error: 'Please select a valid role before saving.' };
  }
  if (!VALID_RANKS.includes(rankRaw as MemberRank)) {
    return { error: 'Please select a valid rank before saving.' };
  }

  const role = roleRaw as LegionRole;
  const rank = rankRaw as MemberRank;

  // Verify the caller is the GM of this campaign before allowing any update.
  const { data: gmMembership } = await db
    .from('campaign_memberships')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .eq('role', 'GM')
    .maybeSingle();

  if (!gmMembership) return { error: 'Only the GM can assign roles' };

  const { error } = await db
    .from('campaign_memberships')
    .update({ role, rank })
    .eq('id', membershipId)
    .eq('campaign_id', campaignId);

  if (error) {
    // Unique constraint violation — a PRIMARY for this role already exists.
    if (error.code === '23505') {
      return {
        error: `There is already a PRIMARY ${role}. Assign as DEPUTY, or reassign the existing holder first.`,
      };
    }
    return { error: error.message };
  }

  revalidatePath(`/campaign/${campaignId}/members`);
  return null;
}

export async function removePlayer(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const membershipId = formData.get('membership_id') as string;
  const campaignId = formData.get('campaign_id') as string;

  if (!membershipId || !campaignId) return { error: 'Invalid request' };

  // Verify the caller is the GM
  const { data: gmMembership } = await db
    .from('campaign_memberships')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .eq('role', 'GM')
    .maybeSingle();

  if (!gmMembership) return { error: 'Only the GM can remove players' };

  // Fetch the target membership to get display name and verify it's not the GM themselves
  const { data: target } = await db
    .from('campaign_memberships')
    .select('id, user_id, role, profiles(display_name)')
    .eq('id', membershipId)
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (!target) return { error: 'Player not found in this campaign' };

  if (target.user_id === user.id) return { error: 'You cannot remove yourself from the campaign' };

  // Delete the membership — cascades on the DB side
  const { error: deleteError } = await db
    .from('campaign_memberships')
    .delete()
    .eq('id', membershipId);

  if (deleteError) return { error: deleteError.message };

  // Log the removal (best-effort — don't block on this)
  const { data: campaign } = await db
    .from('campaigns')
    .select('phase_number')
    .eq('id', campaignId)
    .single();

  if (campaign) {
    const displayName =
      (target.profiles as unknown as { display_name: string } | null)?.display_name ?? 'Unknown player';

    await db.from('campaign_phase_log').insert({
      campaign_id: campaignId,
      phase_number: campaign.phase_number,
      step: 'AWAITING_MISSION_RESOLUTION',
      role: 'GM',
      action_type: 'MEMBER_REMOVED',
      details: { removed_display_name: displayName, removed_role: target.role },
    });
  }

  revalidatePath(`/campaign/${campaignId}/members`);
  return null;
}
