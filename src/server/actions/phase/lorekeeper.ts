'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { assertValidTransition } from '@/lib/state-machine';
import { type CampaignPhaseState } from '@/lib/types';
import { logCampaignAction } from './core';

export interface BackAtCampState {
  errors?: {
    campaign_id?: string[];
    scene_id?: string[];
    notes?: string[];
    _form?: string[];
  };
}

/**
 * Lorekeeper action: select a Back at Camp scene and apply Time Passes.
 */
export async function completeBackAtCamp(
  _prevState: BackAtCampState | null,
  formData: FormData,
): Promise<BackAtCampState> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const campaignId = formData.get('campaign_id') as string;
  const sceneId = formData.get('scene_id') as string;
  const notes = (formData.get('notes') as string) || null;

  if (!campaignId) return { errors: { _form: ['Campaign ID is required'] } };
  if (!sceneId) return { errors: { scene_id: ['Select a scene before continuing'] } };

  // Verify role (Lorekeeper or GM)
  const { data: membership } = await db
    .from('campaign_memberships')
    .select('role')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .in('role', ['LOREKEEPER', 'GM'])
    .maybeSingle();

  if (!membership) return { errors: { _form: ['Only the Lorekeeper or GM can set the Back at Camp scene'] } };

  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('campaign_phase_state, phase_number, morale, pressure, food_uses, time_clock_1, time_clock_2, time_clock_3')
    .eq('id', campaignId)
    .single();

  if (fetchError || !campaign) return { errors: { _form: ['Campaign not found'] } };

  try {
    assertValidTransition(
      campaign.campaign_phase_state as CampaignPhaseState | null,
      'TIME_PASSING',
    );
  } catch {
    return { errors: { _form: ['Cannot advance from Back at Camp in the current phase state'] } };
  }

  // Mark the selected scene as used
  const { error: sceneError } = await db
    .from('back_at_camp_scenes')
    .update({ used: true, used_in_phase: campaign.phase_number })
    .eq('id', sceneId)
    .eq('campaign_id', campaignId);

  if (sceneError) return { errors: { _form: [sceneError.message] } };

  // Advance the earliest unfilled Time clock (10 segments each)
  let newClock1 = campaign.time_clock_1;
  let newClock2 = campaign.time_clock_2;
  let newClock3 = campaign.time_clock_3;
  let clockTickedLabel = '';
  let brokenAdvance = false;

  if (newClock1 < 10) {
    newClock1 += 1;
    clockTickedLabel = `Clock 1: ${newClock1}/10`;
    if (newClock1 === 10) brokenAdvance = true;
  } else if (newClock2 < 10) {
    newClock2 += 1;
    clockTickedLabel = `Clock 2: ${newClock2}/10`;
    if (newClock2 === 10) brokenAdvance = true;
  } else if (newClock3 < 10) {
    newClock3 += 1;
    clockTickedLabel = `Clock 3: ${newClock3}/10`;
    if (newClock3 === 10) brokenAdvance = true;
  }

  // Pressure always increases by 1
  const newPressure = campaign.pressure + 1;

  // Food: spend 1 use, or lose 2 morale if depleted
  let newFoodUses = campaign.food_uses;
  let newMorale = campaign.morale;
  let foodNote: string;

  if (newFoodUses > 0) {
    newFoodUses -= 1;
    foodNote = '1 Food use consumed';
  } else {
    newMorale = Math.max(0, newMorale - 2);
    foodNote = 'No Food available — morale -2';
  }

  const { error: updateError } = await db
    .from('campaigns')
    .update({
      campaign_phase_state: 'TIME_PASSING',
      time_clock_1: newClock1,
      time_clock_2: newClock2,
      time_clock_3: newClock3,
      pressure: newPressure,
      food_uses: newFoodUses,
      morale: newMorale,
    })
    .eq('id', campaignId);

  if (updateError) return { errors: { _form: [updateError.message] } };

  await logCampaignAction({
    campaignId,
    phaseNumber: campaign.phase_number,
    step: 'AWAITING_BACK_AT_CAMP',
    role: (membership.role as 'LOREKEEPER' | 'GM'),
    actionType: 'BACK_AT_CAMP_SCENE_SELECTED',
    details: {
      scene_id: sceneId,
      notes,
      clock_ticked: clockTickedLabel,
      broken_advance: brokenAdvance,
      pressure_after: newPressure,
      food_note: foodNote,
      morale_after: newMorale,
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/lorekeeper');
  revalidatePath('/dashboard/commander');
  redirect('/dashboard/lorekeeper');
}
