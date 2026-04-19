'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { assertValidTransition } from '@/lib/state-machine';
import { ticksFromDice, applyTimeClockTicks } from '@/lib/campaign-utils';
import { type CampaignPhaseState } from '@/lib/types';
import { logCampaignAction, rollDice } from './core';

/**
 * Commander action: confirm the Time Passes summary and advance to Campaign Actions.
 */
export async function confirmTimePasses(formData: FormData): Promise<void> {
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
    .eq('role', 'COMMANDER')
    .maybeSingle();

  if (!membership) throw new Error('Only the Commander can confirm Time Passes');

  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('campaign_phase_state, phase_number')
    .eq('id', campaignId)
    .single();

  if (fetchError || !campaign) throw new Error('Campaign not found');

  assertValidTransition(
    campaign.campaign_phase_state as CampaignPhaseState | null,
    'CAMPAIGN_ACTIONS',
  );

  const { error: updateError } = await db
    .from('campaigns')
    .update({ campaign_phase_state: 'CAMPAIGN_ACTIONS' })
    .eq('id', campaignId);

  if (updateError) throw new Error(updateError.message);

  await logCampaignAction({
    campaignId,
    phaseNumber: campaign.phase_number,
    step: 'TIME_PASSING',
    role: 'COMMANDER',
    actionType: 'TIME_PASSED',
    details: { confirmed: true },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/commander');
  redirect('/dashboard/commander');
}

// ─── Advance Decision (Step 6) ───────────────────────────────────────────────

export interface AdvanceDecisionState {
  errors?: {
    campaign_id?: string[];
    decision?: string[];
    path_id?: string[];
    horses_spent?: string[];
    _form?: string[];
  };
  result?: {
    decision: 'ADVANCE' | 'STAY';
    new_location_id?: string;
    new_location_name?: string;
    horses_spent: number;
    pressure_before: number;
    pressure_after_horses: number;
    dice: number[];
    worst_die: number;
    time_ticks_added: number;
    broken_advance: boolean;
  };
}

const AdvanceDecisionSchema = z.object({
  campaign_id: z.string().uuid('Invalid campaign'),
  decision: z.enum(['ADVANCE', 'STAY'], {
    error: 'Select Advance or Stay',
  }),
  path_id: z.string().optional(),
  horses_spent: z.coerce
    .number()
    .int()
    .min(0, 'Cannot be negative')
    .default(0),
});

/**
 * Commander action: decide whether the Legion advances to the next location.
 */
export async function makeAdvanceDecision(
  _prevState: AdvanceDecisionState | null,
  formData: FormData,
): Promise<AdvanceDecisionState> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const raw = {
    campaign_id: formData.get('campaign_id'),
    decision: formData.get('decision'),
    path_id: formData.get('path_id') || undefined,
    horses_spent: formData.get('horses_spent') || '0',
  };

  const parsed = AdvanceDecisionSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { campaign_id, decision, path_id, horses_spent } = parsed.data;

  const { data: membership } = await db
    .from('campaign_memberships')
    .select('id')
    .eq('campaign_id', campaign_id)
    .eq('user_id', user.id)
    .eq('role', 'COMMANDER')
    .maybeSingle();

  if (!membership) {
    return { errors: { _form: ['Only the Commander can make the Advance decision'] } };
  }

  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('campaign_phase_state, phase_number, pressure, horse_uses, time_clock_1, time_clock_2, time_clock_3, current_location')
    .eq('id', campaign_id)
    .single();

  if (fetchError || !campaign) {
    return { errors: { _form: ['Campaign not found'] } };
  }

  try {
    assertValidTransition(
      campaign.campaign_phase_state as CampaignPhaseState | null,
      'AWAITING_MISSION_FOCUS',
    );
  } catch {
    return { errors: { _form: ['Cannot make advance decision in the current phase state'] } };
  }

  if (horses_spent > campaign.horse_uses) {
    return { errors: { horses_spent: [`Only ${campaign.horse_uses} Horse uses available`] } };
  }

  const { getConnections } = await import('@/lib/locations');
  const connections = getConnections(campaign.current_location);

  let resolvedPathId: string | undefined;
  if (decision === 'ADVANCE') {
    if (connections.length === 0) {
      return { errors: { _form: ['No paths available from current location'] } };
    }
    if (connections.length === 1) {
      resolvedPathId = connections[0].id;
    } else {
      if (!path_id) {
        return { errors: { path_id: ['Select a path to advance to'] } };
      }
      if (!connections.find((c) => c.id === path_id)) {
        return { errors: { path_id: ['Invalid path selection'] } };
      }
      resolvedPathId = path_id;
    }
  }

  const newLocation = resolvedPathId ? connections.find((c) => c.id === resolvedPathId) : undefined;

  let logDetails: Record<string, unknown>;
  let updates: Record<string, unknown> = { campaign_phase_state: 'AWAITING_MISSION_FOCUS' };
  let resultState: AdvanceDecisionState['result'];

  if (decision === 'STAY') {
    logDetails = { decision: 'STAY' };
    resultState = {
      decision: 'STAY',
      horses_spent: 0,
      pressure_before: campaign.pressure,
      pressure_after_horses: campaign.pressure,
      dice: [],
      worst_die: 0,
      time_ticks_added: 0,
      broken_advance: false,
    };
  } else {
    const pressureAfterHorses = Math.max(0, campaign.pressure - horses_spent);
    const diceCount = pressureAfterHorses === 0 ? 2 : pressureAfterHorses;
    const dice = await rollDice(diceCount);
    const timeTicks = ticksFromDice(dice);

    const { clock1, clock2, clock3, brokenAdvance } = applyTimeClockTicks(
      campaign.time_clock_1,
      campaign.time_clock_2,
      campaign.time_clock_3,
      timeTicks,
    );

    updates = {
      ...updates,
      pressure: 0,
      horse_uses: campaign.horse_uses - horses_spent,
      time_clock_1: clock1,
      time_clock_2: clock2,
      time_clock_3: clock3,
      current_location: resolvedPathId,
    };

    logDetails = {
      decision: 'ADVANCE',
      from_location: campaign.current_location,
      to_location: resolvedPathId,
      horses_spent,
      pressure_before: campaign.pressure,
      pressure_after_horses: pressureAfterHorses,
      dice,
      worst_die: Math.min(...dice),
      time_ticks_added: timeTicks,
      broken_advance: brokenAdvance,
    };

    resultState = {
      decision: 'ADVANCE',
      new_location_id: resolvedPathId,
      new_location_name: newLocation?.name,
      horses_spent,
      pressure_before: campaign.pressure,
      pressure_after_horses: pressureAfterHorses,
      dice,
      worst_die: Math.min(...dice),
      time_ticks_added: timeTicks,
      broken_advance: brokenAdvance,
    };
  }

  const { error: updateError } = await db
    .from('campaigns')
    .update(updates)
    .eq('id', campaign_id);

  if (updateError) {
    return { errors: { _form: [updateError.message] } };
  }

  await logCampaignAction({
    campaignId: campaign_id,
    phaseNumber: campaign.phase_number,
    step: 'AWAITING_ADVANCE',
    role: 'COMMANDER',
    actionType: decision === 'ADVANCE' ? 'ADVANCE' : 'STAY',
    details: logDetails,
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/commander');
  return { result: resultState };
}

// ─── Mission Focus (Step 8) ───────────────────────────────────────────────────

export interface MissionFocusState {
  errors?: {
    campaign_id?: string[];
    focus?: string[];
    _form?: string[];
  };
  success?: boolean;
}

const MissionFocusSchema = z.object({
  campaign_id: z.string().uuid('Invalid campaign'),
  focus: z.string().min(1, 'Select at least one focus'),
});

/**
 * Commander action: select the mission focus for the next operation.
 */
export async function selectMissionFocus(
  _prevState: MissionFocusState | null,
  formData: FormData
): Promise<MissionFocusState> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const validatedFields = MissionFocusSchema.safeParse({
    campaign_id: formData.get('campaign_id'),
    focus: formData.get('focus'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { campaign_id: campaignId, focus } = validatedFields.data;

  try {
    const { data: membership } = await db
      .from('campaign_memberships')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .in('role', ['COMMANDER', 'GM'])
      .maybeSingle();

    if (!membership) {
      return { errors: { _form: ['Only the Commander or GM can select mission focus'] } };
    }

    const { data: campaign, error: fetchError } = await db
      .from('campaigns')
      .select('campaign_phase_state, phase_number')
      .eq('id', campaignId)
      .single();

    if (fetchError || !campaign) {
      return { errors: { _form: ['Campaign not found'] } };
    }

    const currentState = campaign.campaign_phase_state as CampaignPhaseState | null;

    assertValidTransition(
      currentState,
      'AWAITING_MISSION_GENERATION',
    );

    const { error: updateError } = await db
      .from('campaigns')
      .update({ campaign_phase_state: 'AWAITING_MISSION_GENERATION' })
      .eq('id', campaignId);

    if (updateError) {
      return { errors: { _form: [updateError.message] } };
    }

    await logCampaignAction({
      campaignId,
      phaseNumber: campaign.phase_number,
      step: 'AWAITING_MISSION_FOCUS',
      role: 'COMMANDER',
      actionType: 'MISSION_FOCUS_SELECTED',
      details: { focus },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/commander');
  } catch (error) {
    return {
      errors: { _form: [error instanceof Error ? error.message : 'An unexpected error occurred'] },
    };
  }

  redirect('/dashboard/commander');
}

// ─── Intel Questions (Step 9 sub-step) ───────────────────────────────────────

export interface IntelQuestionsState {
  errors?: {
    campaign_id?: string[];
    _form?: string[];
  };
  success?: boolean;
}

const IntelQuestionsSchema = z.object({
  campaign_id: z.string().uuid('Invalid campaign'),
  questions: z.string().min(1, 'Select at least one question'),
});

/**
 * Commander action: record selected intel questions in the phase log.
 */
export async function submitIntelQuestions(
  _prevState: IntelQuestionsState | null,
  formData: FormData,
): Promise<IntelQuestionsState> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const raw = {
    campaign_id: formData.get('campaign_id'),
    questions: formData.get('questions'),
  };

  const parsed = IntelQuestionsSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { campaign_id, questions: questionsJson } = parsed.data;

  let selectedQuestions: unknown;
  try {
    selectedQuestions = JSON.parse(questionsJson);
  } catch {
    return { errors: { _form: ['Invalid questions data'] } };
  }

  const { data: membership } = await db
    .from('campaign_memberships')
    .select('id')
    .eq('campaign_id', campaign_id)
    .eq('user_id', user.id)
    .eq('role', 'COMMANDER')
    .maybeSingle();

  if (!membership) {
    return { errors: { _form: ['Only the Commander can submit intel questions'] } };
  }

  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('campaign_phase_state, phase_number')
    .eq('id', campaign_id)
    .single();

  if (fetchError || !campaign) {
    return { errors: { _form: ['Campaign not found'] } };
  }

  if (campaign.campaign_phase_state !== 'AWAITING_MISSION_SELECTION') {
    return { errors: { _form: ['Intel questions can only be submitted during mission selection'] } };
  }

  await logCampaignAction({
    campaignId: campaign_id,
    phaseNumber: campaign.phase_number,
    step: 'AWAITING_MISSION_SELECTION',
    role: 'COMMANDER',
    actionType: 'INTEL_QUESTIONS_SUBMITTED',
    details: { questions: selectedQuestions },
  });

  revalidatePath('/dashboard/commander');
  return { success: true };
}

// ─── Mission Selection (Step 9 / AWAITING_MISSION_SELECTION) ─────────────────

export interface SelectMissionsState {
  errors?: {
    campaign_id?: string[];
    primary_mission_id?: string[];
    secondary_mission_id?: string[];
    intel_spent?: string[];
    _form?: string[];
  };
  success?: boolean;
}

const SelectMissionsSchema = z.object({
  campaign_id: z.string().uuid('Invalid campaign'),
  primary_mission_id: z.string().uuid('Select a primary mission'),
  secondary_mission_id: z.string().uuid('Select a secondary mission'),
  intel_for_primary: z.coerce.number().int().min(0).default(0),
  intel_for_secondary: z.coerce.number().int().min(0).default(0),
});

/**
 * Commander action: designate primary and secondary missions.
 */
export async function selectMissions(
  _prevState: SelectMissionsState | null,
  formData: FormData,
): Promise<SelectMissionsState> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const raw = {
    campaign_id: formData.get('campaign_id'),
    primary_mission_id: formData.get('primary_mission_id'),
    secondary_mission_id: formData.get('secondary_mission_id'),
    intel_for_primary: formData.get('intel_for_primary') || '0',
    intel_for_secondary: formData.get('intel_for_secondary') || '0',
  };

  const parsed = SelectMissionsSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { campaign_id, primary_mission_id, secondary_mission_id, intel_for_primary, intel_for_secondary } = parsed.data;

  if (primary_mission_id === secondary_mission_id) {
    return { errors: { secondary_mission_id: ['Primary and secondary missions must be different'] } };
  }

  const { data: membership } = await db
    .from('campaign_memberships')
    .select('id')
    .eq('campaign_id', campaign_id)
    .eq('user_id', user.id)
    .eq('role', 'COMMANDER')
    .maybeSingle();

  if (!membership) {
    return { errors: { _form: ['Only the Commander can select missions'] } };
  }

  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('campaign_phase_state, phase_number, intel')
    .eq('id', campaign_id)
    .single();

  if (fetchError || !campaign) {
    return { errors: { _form: ['Campaign not found'] } };
  }

  try {
    assertValidTransition(
      campaign.campaign_phase_state as CampaignPhaseState | null,
      'AWAITING_MISSION_DEPLOYMENT',
    );
  } catch {
    return { errors: { _form: ['Cannot select missions in the current phase state'] } };
  }

  const totalIntelSpent = intel_for_primary + intel_for_secondary;
  if (totalIntelSpent > campaign.intel) {
    return { errors: { intel_spent: [`Only ${campaign.intel} Intel available`] } };
  }

  // Load all GENERATED missions for this phase
  const { data: missions, error: missionsError } = await db
    .from('missions')
    .select('id')
    .eq('campaign_id', campaign_id)
    .eq('phase_number', campaign.phase_number)
    .eq('status', 'GENERATED');

  if (missionsError || !missions) {
    return { errors: { _form: ['Could not load missions'] } };
  }

  const missionIds = missions.map((m) => m.id);

  if (!missionIds.includes(primary_mission_id)) {
    return { errors: { primary_mission_id: ['Invalid primary mission'] } };
  }
  if (!missionIds.includes(secondary_mission_id)) {
    return { errors: { secondary_mission_id: ['Invalid secondary mission'] } };
  }

  // Update mission statuses
  await db.from('missions').update({ status: 'PRIMARY' }).eq('id', primary_mission_id);
  await db.from('missions').update({ status: 'SECONDARY' }).eq('id', secondary_mission_id);

  // Third mission(s): auto-fail
  const failedIds = missionIds.filter(
    (id) => id !== primary_mission_id && id !== secondary_mission_id,
  );
  if (failedIds.length > 0) {
    await db.from('missions').update({ status: 'FAILED' }).in('id', failedIds);
  }

  // Deduct intel
  const { error: intelError } = await db
    .from('campaigns')
    .update({
      intel: campaign.intel - totalIntelSpent,
      campaign_phase_state: 'AWAITING_MISSION_DEPLOYMENT',
    })
    .eq('id', campaign_id);

  if (intelError) {
    return { errors: { _form: [intelError.message] } };
  }

  await logCampaignAction({
    campaignId: campaign_id,
    phaseNumber: campaign.phase_number,
    step: 'AWAITING_MISSION_SELECTION',
    role: 'COMMANDER',
    actionType: 'MISSION_SELECTED',
    details: {
      primary_mission_id,
      secondary_mission_id,
      failed_mission_ids: failedIds,
      intel_for_primary,
      intel_for_secondary,
      intel_spent_total: totalIntelSpent,
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/commander');
  return { success: true };
}
