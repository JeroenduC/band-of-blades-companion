'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { LegionRole, MemberRank } from '@/lib/types';

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

  if (existing) return { error: 'You are already a member of this campaign' };

  // New members join as SOLDIER until the GM assigns them a role.
  const { error: memberError } = await db
    .from('campaign_memberships')
    .insert({
      user_id: user.id,
      campaign_id: campaign.id,
      role: 'SOLDIER' as LegionRole,
      rank: 'PRIMARY' as MemberRank,
    });

  if (memberError) return { error: memberError.message };

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
  const role = formData.get('role') as LegionRole;
  const rank = (formData.get('rank') as MemberRank) ?? 'PRIMARY';
  const campaignId = formData.get('campaign_id') as string;

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
    .eq('id', membershipId);

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
