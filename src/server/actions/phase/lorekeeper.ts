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

  const isOverride = membership.role === 'GM';

  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('campaign_phase_state, phase_number, morale, pressure, food_uses, time_clock_1, time_clock_2, time_clock_3, deaths_since_last_tale')
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

  // Update scene usage
  const { data: scene } = await db
    .from('back_at_camp_scenes')
    .select('times_used, max_uses')
    .eq('id', sceneId)
    .single();

  if (!scene) return { errors: { _form: ['Scene not found'] } };

  const newTimesUsed = scene.times_used + 1;
  const isNowFullyUsed = newTimesUsed >= scene.max_uses;

  const { error: sceneError } = await db
    .from('back_at_camp_scenes')
    .update({ 
      times_used: newTimesUsed,
      used: isNowFullyUsed,
      used_in_phase: campaign.phase_number 
    })
    .eq('id', sceneId);

  if (sceneError) return { errors: { _form: [sceneError.message] } };

  // Update Time Clocks (1 tick per Back at Camp)
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

  // Check if a Tale is required (4+ deaths)
  const needsTale = (campaign.deaths_since_last_tale as number) >= 4;
  const nextState = needsTale ? 'AWAITING_TALES' : 'TIME_PASSING';

  const { error: updateError } = await db
    .from('campaigns')
    .update({
      campaign_phase_state: nextState,
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
      needs_tale: needsTale,
      gm_override: isOverride,
      acting_user_id: isOverride ? user.id : undefined,
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/lorekeeper');
  revalidatePath('/dashboard/commander');
  redirect('/dashboard/lorekeeper');
}

export interface TaleState {
  errors?: {
    campaign_id?: string[];
    tale_id?: string[];
    benefit_id?: string[];
    prompts?: string[];
    _form?: string[];
  };
}

/**
 * Lorekeeper action: tell a Tale of the Legion and select a benefit.
 */
export async function submitTale(
  _prevState: TaleState | null,
  formData: FormData,
): Promise<TaleState> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const campaignId = formData.get('campaign_id') as string;
  const taleId = formData.get('tale_id') as string;
  const benefitId = formData.get('benefit_id') as string;
  const answers = formData.get('answers') as string;

  if (!campaignId) return { errors: { _form: ['Campaign ID is required'] } };
  if (!taleId) return { errors: { tale_id: ['Tale ID is required'] } };
  if (!benefitId) return { errors: { benefit_id: ['Select a benefit before continuing'] } };

  // Verify role (Lorekeeper or GM)
  const { data: membership } = await db
    .from('campaign_memberships')
    .select('role')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .in('role', ['LOREKEEPER', 'GM'])
    .maybeSingle();

  if (!membership) return { errors: { _form: ['Only the Lorekeeper or GM can tell a Tale'] } };

  const isOverride = membership.role === 'GM';

  // Fetch campaign and verify state
  const { data: campaign } = await db
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (!campaign) return { errors: { _form: ['Campaign not found'] } };

  try {
    assertValidTransition(campaign.campaign_phase_state as CampaignPhaseState, 'TIME_PASSING');
  } catch {
    return { errors: { _form: ['Cannot tell a Tale in the current phase state'] } };
  }

  // Find the benefit data
  const { TALES } = await import('@/lib/tales');
  const tale = TALES.find(t => t.id === taleId);
  const benefit = tale?.benefits.find(b => b.id === benefitId);

  if (!tale || !benefit) return { errors: { _form: ['Invalid Tale or Benefit selection'] } };

  // ─── Apply Mechanical Effects ─────────────────────────────────────────────
  
  const updates: Record<string, any> = {
    campaign_phase_state: 'TIME_PASSING',
    deaths_since_last_tale: 0,
    tales_told: [...(campaign.tales_told || []), taleId],
  };

  switch (benefit.effect_type) {
    case 'MORALE_GAIN':
      updates.morale = Math.min(12, (campaign.morale || 0) + benefit.value);
      break;
    
    case 'SPECIALIST_XP':
      await db.rpc('add_xp_to_all_specialists', { p_campaign_id: campaignId, p_xp: benefit.value });
      break;
      
    case 'SPECIALIST_HEAL':
      // This is complex to do automatically perfectly, but we can add ticks
      await db.rpc('add_healing_ticks_to_all_specialists', { p_campaign_id: campaignId, p_ticks: benefit.value });
      break;

    case 'REDUCE_CORRUPTION':
      await db.rpc('reduce_corruption_all_alchemists', { p_campaign_id: campaignId, p_amount: benefit.value });
      break;

    case 'LTP_TICKS':
      // Requires a target project, but the Tale just says "a project". 
      // For now, we'll need a target_id in formData if we want to be precise, 
      // or apply to all active. Rule says: "Add three ticks to a Long-Term Project"
      const targetLtpId = formData.get('target_ltp_id') as string;
      if (targetLtpId) {
        await db.rpc('advance_ltp', { p_ltp_id: targetLtpId, p_ticks: benefit.value });
      }
      break;

    case 'REMOVE_PRESSURE_NO_ADVANCE':
      updates.pressure = Math.max(0, (campaign.pressure || 0) - benefit.value);
      updates.next_mission_no_advance = true;
      break;

    case 'SPECIAL_MISSION':
      updates.next_mission_special = true;
      break;

    case 'NEXT_MISSION_MANEUVER':
      updates.next_mission_maneuver_bonus = benefit.value;
      break;

    case 'NEXT_MISSION_WRECK':
      updates.next_mission_wreck_bonus = benefit.value;
      break;

    case 'CHOSEN_FAVOR':
      // If we had a Chosen Favor column. For now placeholder.
      break;

    case 'NEXT_MISSION_RESIST':
      updates.next_mission_resist_bonus = benefit.value;
      break;

    case 'NEXT_MISSION_RESOLVE':
      updates.next_mission_resolve_bonus = benefit.value;
      break;

    case 'PROMOTE_ROOKIE':
      // Requires a target Rookie.
      break;

    case 'NEXT_MISSION_ENGAGEMENT':
      updates.next_mission_engagement_bonus = benefit.value;
      break;

    case 'NEXT_MISSION_ARMOR':
      updates.next_mission_armor_bonus = benefit.value;
      break;
  }

  // Update campaign
  const { error: updateError } = await db
    .from('campaigns')
    .update(updates)
    .eq('id', campaignId);

  if (updateError) return { errors: { _form: [updateError.message] } };

  // Log action
  await logCampaignAction({
    campaignId,
    phaseNumber: campaign.phase_number,
    step: 'AWAITING_TALES',
    role: 'LOREKEEPER',
    actionType: 'TALE_TOLD',
    details: {
      tale_id: taleId,
      benefit_id: benefitId,
      answers,
      effect: benefit.mechanical_effect,
      gm_override: isOverride,
      acting_user_id: isOverride ? user.id : undefined,
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/lorekeeper');
  redirect('/dashboard/lorekeeper');
}

/**
 * Save or update Lorekeeper notes for a specific phase entry in the Annals.
 */
export async function saveAnnalsNotes(
  campaignId: string,
  phaseNumber: number,
  notes: string,
) {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  // Verify role (Lorekeeper or GM)
  const { data: membership } = await db
    .from('campaign_memberships')
    .select('role')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .in('role', ['LOREKEEPER', 'GM'])
    .maybeSingle();

  if (!membership) throw new Error('Unauthorized: Only the Lorekeeper or GM can update Annals');

  const { error } = await db
    .from('annals_entries')
    .upsert({
      campaign_id: campaignId,
      phase_number: phaseNumber,
      lorekeeper_notes: notes,
    }, {
      onConflict: 'campaign_id, phase_number'
    });

  if (error) throw new Error(`Failed to save notes: ${error.message}`);

  revalidatePath('/dashboard/lorekeeper');
}
