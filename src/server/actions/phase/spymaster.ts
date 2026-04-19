'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { type CampaignPhaseState } from '@/lib/types';
import { logCampaignAction } from './core';

/**
 * Spymaster action: mark spy dispatch complete (placeholder until Epic 7).
 */
export async function completeSpymasterActions(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const campaignId = formData.get('campaign_id') as string;
  if (!campaignId) throw new Error('Campaign ID is required');

  const { data: membership } = await db
    .from('campaign_memberships')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .eq('role', 'SPYMASTER')
    .maybeSingle();

  if (!membership) throw new Error('Only the Spymaster can complete spy dispatch');

  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('campaign_phase_state, phase_number, qm_actions_complete')
    .eq('id', campaignId)
    .single();

  if (fetchError || !campaign) throw new Error('Campaign not found');

  const bothDone = campaign.qm_actions_complete;
  const newState = bothDone
    ? ('AWAITING_LABORERS_ALCHEMISTS' as CampaignPhaseState)
    : ('CAMPAIGN_ACTIONS' as CampaignPhaseState);

  await db
    .from('campaigns')
    .update({ spymaster_actions_complete: true, campaign_phase_state: newState })
    .eq('id', campaignId);

  await logCampaignAction({
    campaignId,
    phaseNumber: campaign.phase_number,
    step: 'CAMPAIGN_ACTIONS',
    role: 'SPYMASTER',
    actionType: 'SPYMASTER_ACTIONS_COMPLETE',
    details: { advanced_state: bothDone },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/spymaster');
  redirect('/dashboard/spymaster');
}
