'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { assertValidTransition } from '@/lib/state-machine';
import {
  qualityFromDice,
  applyBoosts,
  QUALITY_RESOURCE_USES,
  QUALITY_LTP_SEGMENTS,
  corruptionFromDice,
  type ActionQuality,
} from '@/lib/campaign-utils';
import type {
  CampaignPhaseState,
  CampaignPhaseLogActionType,
  LegionRole,
  MissionType,
} from '@/lib/types';

// ─── Logging ──────────────────────────────────────────────────────────────────

/**
 * Inserts a CampaignPhaseLog entry.
 *
 * Always uses the service client — the log is append-only and must be written
 * even when the authenticated user's RLS policy wouldn't normally allow it.
 * Throws on database error so callers can surface it cleanly.
 */
export async function logCampaignAction({
  campaignId,
  phaseNumber,
  step,
  role,
  actionType,
  details = {},
}: {
  campaignId: string;
  phaseNumber: number;
  step: CampaignPhaseState;
  role: LegionRole | 'SYSTEM';
  actionType: CampaignPhaseLogActionType;
  details?: Record<string, unknown>;
}): Promise<void> {
  const db = createServiceClient();
  const { error } = await db.from('campaign_phase_log').insert({
    campaign_id: campaignId,
    phase_number: phaseNumber,
    step,
    role,
    action_type: actionType,
    details,
  });
  if (error) throw new Error(`Failed to log campaign action: ${error.message}`);
}

// ─── State transition ─────────────────────────────────────────────────────────

/**
 * Validates and applies a campaign phase state transition.
 *
 * 1. Verifies the caller is a member of the campaign.
 * 2. Fetches the current state from the database (source of truth).
 * 3. Asserts the transition is legal via the FSM.
 * 4. Writes the new state and creates a log entry atomically.
 *
 * Returns the new campaign state on success.
 * Throws on invalid transitions or database errors.
 */
export async function transitionState(
  campaignId: string,
  newState: CampaignPhaseState,
  role: LegionRole | 'SYSTEM',
  actionType: CampaignPhaseLogActionType,
  logDetails: Record<string, unknown> = {},
): Promise<CampaignPhaseState> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  // Verify membership
  const { data: membership } = await db
    .from('campaign_memberships')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) throw new Error('Not a member of this campaign');

  // Fetch current state
  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('campaign_phase_state, phase_number')
    .eq('id', campaignId)
    .single();

  if (fetchError || !campaign) throw new Error('Campaign not found');

  const currentState = campaign.campaign_phase_state as CampaignPhaseState | null;

  // Validate transition — throws if illegal
  assertValidTransition(currentState, newState);

  // Apply new state
  const { error: updateError } = await db
    .from('campaigns')
    .update({ campaign_phase_state: newState })
    .eq('id', campaignId);

  if (updateError) throw new Error(`Failed to update campaign state: ${updateError.message}`);

  // Log the transition
  await logCampaignAction({
    campaignId,
    phaseNumber: campaign.phase_number,
    step: newState,
    role,
    actionType,
    details: { from: currentState, to: newState, ...logDetails },
  });

  revalidatePath(`/dashboard`);
  return newState;
}

// ─── Start phase ──────────────────────────────────────────────────────────────

/**
 * GM action: start a new campaign phase.
 *
 * Increments phase_number, resets parallel completion flags, and transitions
 * state to AWAITING_MISSION_RESOLUTION. Throws if a phase is already active.
 */
export async function startCampaignPhase(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const campaignId = formData.get('campaign_id') as string;
  if (!campaignId) throw new Error('Campaign ID is required');

  // Verify caller is the GM
  const { data: membership } = await db
    .from('campaign_memberships')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .eq('role', 'GM')
    .maybeSingle();

  if (!membership) throw new Error('Only the GM can start a campaign phase');

  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('campaign_phase_state, phase_number')
    .eq('id', campaignId)
    .single();

  if (fetchError || !campaign) throw new Error('Campaign not found');

  const currentState = campaign.campaign_phase_state as CampaignPhaseState | null;

  // Guard: reject if a phase is already in progress
  if (currentState !== null && currentState !== 'PHASE_COMPLETE') {
    throw new Error('A campaign phase is already in progress');
  }

  const newPhaseNumber = (campaign.phase_number ?? 0) + 1;

  const { error: updateError } = await db
    .from('campaigns')
    .update({
      campaign_phase_state: 'AWAITING_MISSION_RESOLUTION' as CampaignPhaseState,
      phase_number: newPhaseNumber,
      qm_actions_complete: false,
      spymaster_actions_complete: false,
    })
    .eq('id', campaignId);

  if (updateError) throw new Error(updateError.message);

  await logCampaignAction({
    campaignId,
    phaseNumber: newPhaseNumber,
    step: 'AWAITING_MISSION_RESOLUTION',
    role: 'GM',
    actionType: 'PHASE_START',
    details: { phase_number: newPhaseNumber },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/gm');
  redirect('/dashboard/gm');
}

// ─── Seed Back at Camp scenes ─────────────────────────────────────────────────

/**
 * Inserts the 18 Back at Camp scenes for a newly created campaign.
 * Called from createCampaign in campaign.ts after campaign creation succeeds.
 */
export async function seedBackAtCampScenes(campaignId: string): Promise<void> {
  const db = createServiceClient();
  // Delegate to the SQL function defined in the migration — keeps scene data
  // in one place (the migration) rather than duplicated in application code.
  const { error } = await db.rpc('seed_back_at_camp_scenes', {
    p_campaign_id: campaignId,
  });
  if (error) throw new Error(`Failed to seed Back at Camp scenes: ${error.message}`);
}

// ─── Mission Resolution ───────────────────────────────────────────────────────

export type MissionOutcome = 'SUCCESS' | 'PARTIAL' | 'FAILURE';
export type SecondaryOutcome = 'SUCCESS' | 'PARTIAL' | 'FAILURE' | 'NOT_ATTEMPTED';

export interface ResolveMissionState {
  errors?: {
    campaign_id?: string[];
    primary_outcome?: string[];
    secondary_outcome?: string[];
    legionnaires_killed?: string[];
    supply_gain?: string[];
    intel_gain?: string[];
    morale_gain?: string[];
    notes?: string[];
    _form?: string[];
  };
}

const ResolveMissionSchema = z.object({
  campaign_id: z.string().uuid('Invalid campaign'),
  primary_outcome: z.enum(['SUCCESS', 'PARTIAL', 'FAILURE'], {
    error: 'Select a primary mission outcome',
  }),
  secondary_outcome: z.enum(['SUCCESS', 'PARTIAL', 'FAILURE', 'NOT_ATTEMPTED'], {
    error: 'Select a secondary mission outcome',
  }),
  // BoB rulebook: -1 morale per Legionnaire killed (p.73)
  legionnaires_killed: z.coerce
    .number()
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .max(20, 'Maximum 20'),
  supply_gain: z.coerce
    .number()
    .int('Must be a whole number')
    .min(-10)
    .max(10)
    .default(0),
  intel_gain: z.coerce
    .number()
    .int('Must be a whole number')
    .min(-10)
    .max(10)
    .default(0),
  morale_gain: z.coerce
    .number()
    .int('Must be a whole number')
    .min(-10)
    .max(10)
    .default(0),
  notes: z.string().max(1000, 'Notes must be under 1000 characters').optional(),
});

/**
 * GM action: resolve the mission outcomes for the current phase.
 *
 * Applies resource changes (morale, supply, intel), logs the resolution,
 * and transitions state to AWAITING_BACK_AT_CAMP.
 *
 * Morale floor is 0 — the Legion cannot be in negative morale.
 */
export async function resolveMission(
  _prevState: ResolveMissionState | null,
  formData: FormData,
): Promise<ResolveMissionState> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const raw = {
    campaign_id: formData.get('campaign_id'),
    primary_outcome: formData.get('primary_outcome'),
    secondary_outcome: formData.get('secondary_outcome'),
    legionnaires_killed: formData.get('legionnaires_killed'),
    supply_gain: formData.get('supply_gain') || '0',
    intel_gain: formData.get('intel_gain') || '0',
    morale_gain: formData.get('morale_gain') || '0',
    notes: formData.get('notes'),
  };

  const parsed = ResolveMissionSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const {
    campaign_id,
    primary_outcome,
    secondary_outcome,
    legionnaires_killed,
    supply_gain,
    intel_gain,
    morale_gain,
    notes,
  } = parsed.data;

  // Verify caller is the GM
  const { data: membership } = await db
    .from('campaign_memberships')
    .select('id')
    .eq('campaign_id', campaign_id)
    .eq('user_id', user.id)
    .eq('role', 'GM')
    .maybeSingle();

  if (!membership) {
    return { errors: { _form: ['Only the GM can resolve missions'] } };
  }

  // Fetch current state and resources
  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('campaign_phase_state, phase_number, morale, supply, intel')
    .eq('id', campaign_id)
    .single();

  if (fetchError || !campaign) {
    return { errors: { _form: ['Campaign not found'] } };
  }

  const currentState = campaign.campaign_phase_state as CampaignPhaseState | null;

  try {
    assertValidTransition(currentState, 'AWAITING_BACK_AT_CAMP');
  } catch {
    return { errors: { _form: ['Cannot resolve mission in the current phase state'] } };
  }

  // Apply resource changes; morale has a floor of 0
  const moraleChange = morale_gain - legionnaires_killed;
  const newMorale = Math.max(0, (campaign.morale ?? 0) + moraleChange);
  const newSupply = Math.max(0, (campaign.supply ?? 0) + supply_gain);
  const newIntel = Math.max(0, (campaign.intel ?? 0) + intel_gain);

  const { error: updateError } = await db
    .from('campaigns')
    .update({
      campaign_phase_state: 'AWAITING_BACK_AT_CAMP',
      morale: newMorale,
      supply: newSupply,
      intel: newIntel,
    })
    .eq('id', campaign_id);

  if (updateError) {
    return { errors: { _form: [updateError.message] } };
  }

  await logCampaignAction({
    campaignId: campaign_id,
    phaseNumber: campaign.phase_number,
    step: 'AWAITING_MISSION_RESOLUTION',
    role: 'GM',
    actionType: 'MISSION_RESOLVED',
    details: {
      primary_outcome,
      secondary_outcome,
      legionnaires_killed,
      morale_change: moraleChange,
      supply_gain,
      intel_gain,
      morale_after: newMorale,
      supply_after: newSupply,
      intel_after: newIntel,
      notes: notes ?? null,
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/gm');
  redirect('/dashboard/gm');
}

// ─── Time Passes ──────────────────────────────────────────────────────────────

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
 *
 * This is the bridge between AWAITING_BACK_AT_CAMP and TIME_PASSING.
 * On submit:
 *  - Marks the selected scene as used (tracked per campaign)
 *  - Advances the earliest unfilled Time clock by 1 tick (BoB rulebook p.44)
 *  - Increases pressure by 1
 *  - Spends 1 Food use, or deducts 2 morale if none remain
 *
 * The Commander then reviews the Time Passes changes and confirms.
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

  // Pressure always increases by 1 (BoB rulebook p.44)
  const newPressure = campaign.pressure + 1;

  // Food: spend 1 use, or lose 2 morale if depleted (BoB rulebook p.45)
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

/**
 * Commander action: confirm the Time Passes summary and advance to Campaign Actions.
 *
 * No calculations happen here — changes were applied when entering TIME_PASSING.
 * This is a pure acknowledgement that transitions the phase forward.
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
  /** Populated after a successful Advance roll so the UI can show the result */
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
  // ID of the destination location (required when advancing to a fork)
  path_id: z.string().optional(),
  // Horses spent to reduce pressure before the roll (BoB rulebook p.119)
  horses_spent: z.coerce
    .number()
    .int()
    .min(0, 'Cannot be negative')
    .default(0),
});

/**
 * Rolls a pool of d6s using server-side crypto.getRandomValues.
 * Returns the individual die results.
 *
 * BoB uses "fortune dice" — roll a pool, take the worst single die.
 * If pressure was reduced to 0, roll 2 dice and take worst.
 *
 * Time ticks from worst die (BoB rulebook p.120):
 *   1–3 → 1 tick
 *   4–5 → 2 ticks
 *   6   → 3 ticks
 *   Two 6s (critical) → 5 ticks
 */
function rollDice(count: number): number[] {
  const buf = new Uint8Array(count);
  crypto.getRandomValues(buf);
  return Array.from(buf).map((n) => (n % 6) + 1);
}

function ticksFromDice(dice: number[]): number {
  const allSixes = dice.every((d) => d === 6);
  if (allSixes && dice.length >= 2) return 5; // critical
  const worst = Math.min(...dice);
  if (worst <= 3) return 1;
  if (worst <= 5) return 2;
  return 3; // 6
}

/**
 * Tick the earliest unfilled Time clock by n ticks, returning updated values.
 * Returns the new clock values and whether a Broken Advance occurred.
 */
function applyTimeClockTicks(
  clock1: number,
  clock2: number,
  clock3: number,
  ticks: number,
): { clock1: number; clock2: number; clock3: number; brokenAdvance: boolean } {
  let c1 = clock1;
  let c2 = clock2;
  let c3 = clock3;
  let remaining = ticks;
  let brokenAdvance = false;

  while (remaining > 0) {
    if (c1 < 10) {
      c1 = Math.min(10, c1 + remaining);
      remaining -= (c1 - clock1);
      if (c1 === 10) brokenAdvance = true;
    } else if (c2 < 10) {
      const added = Math.min(10 - c2, remaining);
      c2 += added;
      remaining -= added;
      if (c2 === 10) brokenAdvance = true;
    } else if (c3 < 10) {
      const added = Math.min(10 - c3, remaining);
      c3 += added;
      remaining -= added;
      if (c3 === 10) brokenAdvance = true;
    } else {
      break; // all clocks full
    }
  }

  return { clock1: c1, clock2: c2, clock3: c3, brokenAdvance };
}

/**
 * Commander action: decide whether the Legion advances to the next location.
 *
 * Advance path:
 *   1. Commander optionally spends Horse uses to reduce pressure (1:1)
 *   2. System rolls dice equal to remaining pressure (min 2 if reduced to 0)
 *   3. Worst die determines time ticks added to the earliest unfilled clock
 *   4. Pressure resets to 0 after the roll
 *   5. State → AWAITING_MISSION_FOCUS
 *
 * Stay path: state → AWAITING_MISSION_FOCUS, no changes to clocks or pressure
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

  // Validate path selection when advancing
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
    // Advance: reduce pressure by horses spent, roll, update location
    const pressureAfterHorses = Math.max(0, campaign.pressure - horses_spent);
    const diceCount = pressureAfterHorses === 0 ? 2 : pressureAfterHorses;
    const dice = rollDice(diceCount);
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

// ─── QM Campaign Actions ──────────────────────────────────────────────────────

export interface LibertyState {
  errors?: {
    campaign_id?: string[];
    boosted?: string[];
    _form?: string[];
  };
}

/**
 * QM action: Liberty — give Legionnaires leave.
 *
 * Normal:  morale +2. (Stress reduction tracked when Roster is implemented.)
 * Boosted: morale +4, costs 1 supply. (All stress cleared when Roster is implemented.)
 *
 * BoB rulebook p.137
 */
export async function performLiberty(
  _prevState: LibertyState | null,
  formData: FormData,
): Promise<LibertyState> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const campaignId = formData.get('campaign_id') as string;
  if (!campaignId) return { errors: { _form: ['Campaign ID is required'] } };

  const boosted = formData.get('boosted') === 'true';

  const { data: membership } = await db
    .from('campaign_memberships')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .eq('role', 'QUARTERMASTER')
    .maybeSingle();

  if (!membership) return { errors: { _form: ['Only the Quartermaster can perform Liberty'] } };

  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('campaign_phase_state, phase_number, morale, supply')
    .eq('id', campaignId)
    .single();

  if (fetchError || !campaign) return { errors: { _form: ['Campaign not found'] } };

  if (campaign.campaign_phase_state !== 'CAMPAIGN_ACTIONS') {
    return { errors: { _form: ['Liberty can only be performed during Campaign Actions'] } };
  }

  if (boosted && campaign.supply < 1) {
    return { errors: { _form: ['Not enough supply to boost Liberty (need 1)'] } };
  }

  const moraleGain = boosted ? 4 : 2;
  const supplySpent = boosted ? 1 : 0;
  const newMorale = campaign.morale + moraleGain;
  const newSupply = campaign.supply - supplySpent;

  const { error: updateError } = await db
    .from('campaigns')
    .update({ morale: newMorale, supply: newSupply })
    .eq('id', campaignId);

  if (updateError) return { errors: { _form: [updateError.message] } };

  await logCampaignAction({
    campaignId,
    phaseNumber: campaign.phase_number,
    step: 'CAMPAIGN_ACTIONS',
    role: 'QUARTERMASTER',
    actionType: 'LIBERTY',
    details: {
      boosted,
      morale_gain: moraleGain,
      supply_spent: supplySpent,
      morale_after: newMorale,
      note: 'Stress reduction deferred until Roster is implemented',
    },
  });

  revalidatePath('/dashboard/quartermaster');
  return {};
}

/**
 * QM action: mark all Campaign Actions as complete.
 *
 * Sets qm_actions_complete = true. If spymaster_actions_complete is also true,
 * the state advances to AWAITING_LABORERS_ALCHEMISTS.
 */
export async function completeQmActions(formData: FormData): Promise<void> {
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
    .eq('role', 'QUARTERMASTER')
    .maybeSingle();

  if (!membership) throw new Error('Only the Quartermaster can complete QM actions');

  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('campaign_phase_state, phase_number, spymaster_actions_complete')
    .eq('id', campaignId)
    .single();

  if (fetchError || !campaign) throw new Error('Campaign not found');

  if (campaign.campaign_phase_state !== 'CAMPAIGN_ACTIONS') {
    throw new Error('Not in CAMPAIGN_ACTIONS state');
  }

  const bothDone = campaign.spymaster_actions_complete;
  const newState = bothDone
    ? ('AWAITING_LABORERS_ALCHEMISTS' as CampaignPhaseState)
    : ('CAMPAIGN_ACTIONS' as CampaignPhaseState);

  await db
    .from('campaigns')
    .update({ qm_actions_complete: true, campaign_phase_state: newState })
    .eq('id', campaignId);

  await logCampaignAction({
    campaignId,
    phaseNumber: campaign.phase_number,
    step: 'CAMPAIGN_ACTIONS',
    role: 'QUARTERMASTER',
    actionType: 'QM_ACTIONS_COMPLETE',
    details: { advanced_state: bothDone },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/quartermaster');
  if (bothDone) revalidatePath('/dashboard/spymaster');
  redirect('/dashboard/quartermaster');
}

// ─── Placeholder pass-throughs ────────────────────────────────────────────────

/**
 * Spymaster action: mark spy dispatch complete (placeholder until Epic 7).
 * Sets spymaster_actions_complete = true; advances state if QM is also done.
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

/**
 * Generic placeholder pass-through for steps with no full implementation yet.
 *
 * Reads the target state, role, and action type from hidden form fields so the
 * same server action can power all placeholder screens without duplication.
 */
export async function advancePlaceholderStep(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const campaignId = formData.get('campaign_id') as string;
  const nextState = formData.get('next_state') as CampaignPhaseState;
  const role = formData.get('role') as LegionRole;
  const actionType = formData.get('action_type') as CampaignPhaseLogActionType;
  const dashboardPath = formData.get('dashboard_path') as string;

  if (!campaignId || !nextState || !role || !actionType || !dashboardPath) {
    throw new Error('Missing required fields for placeholder advance');
  }

  const { data: roleMembership } = await db
    .from('campaign_memberships')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .eq('role', role)
    .maybeSingle();

  if (!roleMembership) {
    const { data: gmMembership } = await db
      .from('campaign_memberships')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .eq('role', 'GM')
      .maybeSingle();

    if (!gmMembership) throw new Error(`Only the ${role} or GM can advance this step`);
  }

  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('campaign_phase_state, phase_number')
    .eq('id', campaignId)
    .single();

  if (fetchError || !campaign) throw new Error('Campaign not found');

  assertValidTransition(
    campaign.campaign_phase_state as CampaignPhaseState | null,
    nextState,
  );

  const { error: updateError } = await db
    .from('campaigns')
    .update({ campaign_phase_state: nextState })
    .eq('id', campaignId);

  if (updateError) throw new Error(updateError.message);

  await logCampaignAction({
    campaignId,
    phaseNumber: campaign.phase_number,
    step: campaign.campaign_phase_state as CampaignPhaseState,
    role,
    actionType,
    details: { placeholder: true, next_state: nextState },
  });

  revalidatePath('/dashboard');
  revalidatePath(dashboardPath);
  redirect(dashboardPath);
}

// ─── Shared dice helper ───────────────────────────────────────────────────────

function rollDicePool(count: number): number[] {
  const buf = new Uint8Array(Math.max(1, count));
  crypto.getRandomValues(buf);
  return Array.from(buf).map((n) => (n % 6) + 1);
}

// Campaign shape returned by verifyQmAndFetchCampaign — only the fields we actually select.
// We cast to this after the generic helper returns Record<string, unknown>.
interface QmCampaignRow {
  campaign_phase_state: string | null;
  phase_number: number;
  supply: number;
  current_location: string;
  food_uses: number;
  horse_uses: number;
  black_shot_uses: number;
  religious_supply_uses: number;
}

/** Verify the caller is the QM and return campaign row, or return an error. */
async function verifyQmAndFetchCampaign(
  db: ReturnType<typeof createServiceClient>,
  userId: string,
  campaignId: string,
  select: string,
): Promise<{ membership: { id: string } | null; campaign: Record<string, unknown> | null }> {
  const { data: membership } = await db
    .from('campaign_memberships')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
    .eq('role', 'QUARTERMASTER')
    .maybeSingle();

  if (!membership) return { membership: null, campaign: null };

  const { data: campaign } = await db
    .from('campaigns')
    .select(select)
    .eq('id', campaignId)
    .single();

  return { membership, campaign: campaign as Record<string, unknown> | null };
}

// ─── QM: Recruit (#56) ────────────────────────────────────────────────────────

export interface RecruitState {
  errors?: { campaign_id?: string[]; _form?: string[] };
  result?: { rookies: number; soldiers: number; boosted: boolean; supply_spent: number };
}

/**
 * QM action: Recruit — gain 5 new soldiers for the Marshal to place in squads.
 * Boosted (1 supply): 2 of the 5 become Soldiers; the other 3 remain Rookies.
 * BoB rulebook p.138
 */
export async function performRecruit(
  _prevState: RecruitState | null,
  formData: FormData,
): Promise<RecruitState> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const campaignId = formData.get('campaign_id') as string;
  const boosted = formData.get('boosted') === 'true';
  if (!campaignId) return { errors: { _form: ['Campaign ID required'] } };

  const { membership, campaign: _campaign } = await verifyQmAndFetchCampaign(
    db, user.id, campaignId,
    'campaign_phase_state, phase_number, supply',
  );
  if (!membership) return { errors: { _form: ['Only the Quartermaster can recruit'] } };
  if (!_campaign) return { errors: { _form: ['Campaign not found'] } };
  const campaign = _campaign as unknown as QmCampaignRow;

  if (campaign.campaign_phase_state !== 'CAMPAIGN_ACTIONS') {
    return { errors: { _form: ['Recruit can only be performed during Campaign Actions'] } };
  }

  const supplySpent = boosted ? 1 : 0;
  if (campaign.supply < supplySpent) {
    return { errors: { _form: [`Not enough supply (need 1, have ${campaign.supply})`] } };
  }

  const rookies = boosted ? 3 : 5;
  const soldiers = boosted ? 2 : 0;

  const { error: poolError } = await db.from('recruit_pool').insert({
    campaign_id: campaignId,
    phase_number: campaign.phase_number,
    rookies,
    soldiers,
  });
  if (poolError) return { errors: { _form: [poolError.message] } };

  if (supplySpent > 0) {
    await db
      .from('campaigns')
      .update({ supply: campaign.supply - supplySpent })
      .eq('id', campaignId);
  }

  await logCampaignAction({
    campaignId,
    phaseNumber: campaign.phase_number,
    step: 'CAMPAIGN_ACTIONS',
    role: 'QUARTERMASTER',
    actionType: 'RECRUIT',
    details: { rookies, soldiers, boosted, supply_spent: supplySpent },
  });

  revalidatePath('/dashboard/quartermaster');
  return { result: { rookies, soldiers, boosted, supply_spent: supplySpent } };
}

// ─── QM: Acquire Assets (#54) ────────────────────────────────────────────────

export type AcquireAssetType =
  | 'FOOD' | 'HORSES' | 'BLACK_SHOT' | 'RELIGIOUS_SUPPLIES'
  | 'LABORER' | 'SIEGE_WEAPON' | 'ALCHEMIST' | 'MERCY';

export interface AcquireAssetsState {
  errors?: { campaign_id?: string[]; asset_type?: string[]; boosts?: string[]; name?: string[]; _form?: string[] };
  result?: {
    asset_type: AcquireAssetType;
    dice: number[];
    base_quality: ActionQuality;
    final_quality: ActionQuality;
    boosts: number;
    supply_spent: number;
    uses_gained?: number;
    personnel_added?: string;
  };
}

const RESOURCE_COLUMN: Partial<Record<AcquireAssetType, string>> = {
  FOOD: 'food_uses',
  HORSES: 'horse_uses',
  BLACK_SHOT: 'black_shot_uses',
  RELIGIOUS_SUPPLIES: 'religious_supply_uses',
};

/**
 * QM action: Acquire Assets — roll vs location assets rating for quality.
 * BoB rulebook p.137
 *
 * Quality tiers: POOR (1-3), STANDARD (4-5), FINE (6), EXCEPTIONAL (critical).
 * Personnel (Alchemist, Mercy) require FINE+. Laborer and Siege Weapon require FINE+.
 * Cannot acquire the same asset type twice in one phase.
 */
export async function performAcquireAssets(
  _prevState: AcquireAssetsState | null,
  formData: FormData,
): Promise<AcquireAssetsState> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const campaignId = formData.get('campaign_id') as string;
  const assetType = formData.get('asset_type') as AcquireAssetType;
  const boosts = Math.max(0, parseInt(formData.get('boosts') as string || '0', 10));
  const personnelName = (formData.get('name') as string || '').trim();

  if (!campaignId || !assetType) return { errors: { _form: ['Missing required fields'] } };

  const { membership, campaign: _campaignAA } = await verifyQmAndFetchCampaign(
    db, user.id, campaignId,
    `campaign_phase_state, phase_number, supply, current_location,
     food_uses, horse_uses, black_shot_uses, religious_supply_uses`,
  );
  if (!membership) return { errors: { _form: ['Only the Quartermaster can acquire assets'] } };
  if (!_campaignAA) return { errors: { _form: ['Campaign not found'] } };
  const campaign = _campaignAA as unknown as QmCampaignRow;

  if (campaign.campaign_phase_state !== 'CAMPAIGN_ACTIONS') {
    return { errors: { _form: ['Acquire Assets can only be performed during Campaign Actions'] } };
  }

  const supplySpent = boosts;
  if (campaign.supply < supplySpent) {
    return { errors: { _form: [`Not enough supply for ${boosts} boost(s) (have ${campaign.supply})`] } };
  }

  // Check if this asset type was already acquired this phase (BoB: different asset each time)
  const { data: prevAcquired } = await db
    .from('campaign_phase_log')
    .select('details')
    .eq('campaign_id', campaignId)
    .eq('phase_number', campaign.phase_number)
    .eq('action_type', 'ACQUIRE_ASSETS');

  const acquiredTypes = (prevAcquired ?? []).map(
    (row) => (row.details as Record<string, unknown>).asset_type as string,
  );
  if (acquiredTypes.includes(assetType)) {
    return { errors: { asset_type: ['This asset type was already acquired this phase'] } };
  }

  // Look up dice pool from location data
  const { getLocation, getAssetsDicePool } = await import('@/lib/locations');
  const location = getLocation(campaign.current_location);
  const locationAssetType = assetType as Parameters<typeof getAssetsDicePool>[1];
  const diceCount = location ? getAssetsDicePool(location, locationAssetType) : 1;

  const dice = rollDicePool(diceCount);
  const baseQuality = qualityFromDice(dice);
  const finalQuality = applyBoosts(baseQuality, boosts);

  // Apply effects
  let usesGained: number | undefined;
  let personnelAdded: string | undefined;
  const resourceCol = RESOURCE_COLUMN[assetType];
  const updates: Record<string, unknown> = {};

  if (resourceCol) {
    // Resource asset — add uses
    usesGained = QUALITY_RESOURCE_USES[finalQuality];
    const currentUses = (campaign as unknown as Record<string, unknown>)[resourceCol] as number ?? 0;
    updates[resourceCol] = currentUses + usesGained;
  } else {
    // Personnel asset — requires FINE or better
    if (finalQuality === 'POOR' || finalQuality === 'STANDARD') {
      return {
        errors: { _form: [`${assetType.replace('_', ' ')} requires Fine quality or better (rolled ${finalQuality})`] },
        result: {
          asset_type: assetType, dice, base_quality: baseQuality,
          final_quality: finalQuality, boosts, supply_spent: supplySpent,
        },
      };
    }
    // Alchemist and Mercy require EXCEPTIONAL
    if ((assetType === 'ALCHEMIST' || assetType === 'MERCY') && finalQuality !== 'EXCEPTIONAL') {
      return {
        errors: { _form: [`${assetType} requires Exceptional quality (rolled ${finalQuality})`] },
        result: {
          asset_type: assetType, dice, base_quality: baseQuality,
          final_quality: finalQuality, boosts, supply_spent: supplySpent,
        },
      };
    }

    const name = personnelName || `${assetType.charAt(0) + assetType.slice(1).toLowerCase()} ${Date.now()}`;

    if (assetType === 'ALCHEMIST') {
      if (!personnelName) return { errors: { name: ['Enter a name for the Alchemist'] } };
      await db.from('alchemists').insert({ campaign_id: campaignId, name: personnelName });
      personnelAdded = personnelName;
    } else if (assetType === 'MERCY') {
      if (!personnelName) return { errors: { name: ['Enter a name for the Mercy'] } };
      await db.from('mercies').insert({ campaign_id: campaignId, name: personnelName });
      personnelAdded = personnelName;
    } else if (assetType === 'LABORER') {
      // Increment laborer count (upsert since it's one row per campaign)
      const { data: existing } = await db
        .from('laborers')
        .select('count')
        .eq('campaign_id', campaignId)
        .maybeSingle();
      if (existing) {
        await db.from('laborers').update({ count: existing.count + 1 }).eq('campaign_id', campaignId);
      } else {
        await db.from('laborers').insert({ campaign_id: campaignId, count: 1 });
      }
      personnelAdded = 'Laborer unit added';
    } else if (assetType === 'SIEGE_WEAPON') {
      await db.from('siege_weapons').insert({ campaign_id: campaignId, name: name });
      personnelAdded = name;
    }
  }

  // Deduct supply for boosts
  updates['supply'] = campaign.supply - supplySpent;
  await db.from('campaigns').update(updates).eq('id', campaignId);

  await logCampaignAction({
    campaignId,
    phaseNumber: campaign.phase_number,
    step: 'CAMPAIGN_ACTIONS',
    role: 'QUARTERMASTER',
    actionType: 'ACQUIRE_ASSETS',
    details: {
      asset_type: assetType,
      dice,
      base_quality: baseQuality,
      final_quality: finalQuality,
      boosts,
      supply_spent: supplySpent,
      uses_gained: usesGained,
      personnel_added: personnelAdded,
    },
  });

  revalidatePath('/dashboard/quartermaster');
  return {
    result: {
      asset_type: assetType, dice, base_quality: baseQuality,
      final_quality: finalQuality, boosts, supply_spent: supplySpent,
      uses_gained: usesGained, personnel_added: personnelAdded,
    },
  };
}

// ─── QM: Rest and Recuperation (#55) ─────────────────────────────────────────

export interface RnRState {
  errors?: { campaign_id?: string[]; _form?: string[] };
  result?: { mercies_healed: number; boosted: boolean; supply_spent: number };
}

/**
 * QM action: Rest and Recuperation — Legionnaires heal; Mercies auto-heal if unused.
 * Full per-Specialist healing deferred until the Marshal Roster is implemented (Epic 6).
 * Current scope: heals all Mercies' wounds, logs the action.
 * BoB rulebook p.138
 */
export async function performRnR(
  _prevState: RnRState | null,
  formData: FormData,
): Promise<RnRState> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const campaignId = formData.get('campaign_id') as string;
  const boosted = formData.get('boosted') === 'true';
  if (!campaignId) return { errors: { _form: ['Campaign ID required'] } };

  const { membership, campaign: _campaignRnR } = await verifyQmAndFetchCampaign(
    db, user.id, campaignId,
    'campaign_phase_state, phase_number, supply',
  );
  if (!membership) return { errors: { _form: ['Only the Quartermaster can perform R&R'] } };
  if (!_campaignRnR) return { errors: { _form: ['Campaign not found'] } };
  const campaign = _campaignRnR as unknown as QmCampaignRow;

  if (campaign.campaign_phase_state !== 'CAMPAIGN_ACTIONS') {
    return { errors: { _form: ['R&R can only be performed during Campaign Actions'] } };
  }

  const supplySpent = boosted ? 1 : 0;
  if (campaign.supply < supplySpent) {
    return { errors: { _form: [`Not enough supply to boost R&R`] } };
  }

  // Heal all wounded Mercies not manually assigned (auto-heal rule)
  const { data: woundedMercies } = await db
    .from('mercies')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('wounded', true);

  const merciesHealed = woundedMercies?.length ?? 0;
  if (merciesHealed > 0) {
    await db
      .from('mercies')
      .update({ wounded: false })
      .eq('campaign_id', campaignId)
      .eq('wounded', true);
  }

  if (supplySpent > 0) {
    await db.from('campaigns').update({ supply: campaign.supply - supplySpent }).eq('id', campaignId);
  }

  await logCampaignAction({
    campaignId,
    phaseNumber: campaign.phase_number,
    step: 'CAMPAIGN_ACTIONS',
    role: 'QUARTERMASTER',
    actionType: 'REST_AND_RECUPERATION',
    details: {
      boosted,
      supply_spent: supplySpent,
      mercies_healed: merciesHealed,
      note: 'Per-Specialist healing deferred until Marshal Roster (Epic 6)',
    },
  });

  revalidatePath('/dashboard/quartermaster');
  return { result: { mercies_healed: merciesHealed, boosted, supply_spent: supplySpent } };
}

// ─── QM: Long-Term Project (#57) ─────────────────────────────────────────────

export interface LongTermProjectState {
  errors?: {
    campaign_id?: string[];
    project_id?: string[];
    name?: string[];
    clock_size?: string[];
    boosts?: string[];
    _form?: string[];
  };
  result?: {
    project_id: string;
    project_name: string;
    dice: number[];
    base_quality: ActionQuality;
    final_quality: ActionQuality;
    segments_added: number;
    new_total: number;
    clock_size: number;
    completed: boolean;
    boosts: number;
    supply_spent: number;
  };
}

const LTP_SCHEMA = z.object({
  campaign_id: z.string().uuid('Invalid campaign'),
  // Either work an existing project (project_id) or create a new one
  project_id: z.string().uuid().optional(),
  // New project fields (required when project_id is absent)
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(300).optional(),
  clock_size: z.coerce.number().int().min(4).max(12).optional(),
  boosts: z.coerce.number().int().min(0).max(3).default(0),
});

/**
 * QM action: Long-Term Project — work a clock toward a custom campaign benefit.
 * Can create a new project or work an existing one.
 * Cannot work the same project twice in one phase (phase_last_worked guard).
 * BoB rulebook p.138
 */
export async function performLongTermProject(
  _prevState: LongTermProjectState | null,
  formData: FormData,
): Promise<LongTermProjectState> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const parsed = LTP_SCHEMA.safeParse({
    campaign_id: formData.get('campaign_id'),
    project_id: formData.get('project_id') || undefined,
    name: formData.get('name') || undefined,
    description: formData.get('description') || undefined,
    clock_size: formData.get('clock_size') || undefined,
    boosts: formData.get('boosts') || '0',
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { campaign_id, project_id, name, description, clock_size, boosts } = parsed.data;
  const supplySpent = boosts;

  const { membership, campaign: _campaignLTP } = await verifyQmAndFetchCampaign(
    db, user.id, campaign_id,
    'campaign_phase_state, phase_number, supply',
  );
  if (!membership) return { errors: { _form: ['Only the Quartermaster can work on projects'] } };
  if (!_campaignLTP) return { errors: { _form: ['Campaign not found'] } };
  const campaign = _campaignLTP as unknown as QmCampaignRow;

  if (campaign.campaign_phase_state !== 'CAMPAIGN_ACTIONS') {
    return { errors: { _form: ['Long-Term Projects can only be worked during Campaign Actions'] } };
  }
  if (campaign.supply < supplySpent) {
    return { errors: { _form: [`Not enough supply for ${boosts} boost(s)`] } };
  }

  let projectRow: { id: string; name: string; clock_size: number; segments_filled: number; phase_last_worked: number | null };

  if (project_id) {
    // Work existing project
    const { data: existing } = await db
      .from('long_term_projects')
      .select('id, name, clock_size, segments_filled, phase_last_worked')
      .eq('id', project_id)
      .eq('campaign_id', campaign_id)
      .maybeSingle();

    if (!existing) return { errors: { project_id: ['Project not found'] } };
    if (existing.phase_last_worked === campaign.phase_number) {
      return { errors: { project_id: ['Already worked this project this phase'] } };
    }
    if (existing.segments_filled >= existing.clock_size) {
      return { errors: { project_id: ['This project is already complete'] } };
    }
    projectRow = existing;
  } else {
    // Create new project
    if (!name || !clock_size) {
      return { errors: { _form: ['Provide a project name and clock size to create a new project'] } };
    }
    const { data: created, error: createError } = await db
      .from('long_term_projects')
      .insert({
        campaign_id,
        name,
        description: description ?? '',
        clock_size,
        segments_filled: 0,
      })
      .select('id, name, clock_size, segments_filled, phase_last_worked')
      .single();

    if (createError || !created) {
      return { errors: { _form: [createError?.message ?? 'Failed to create project'] } };
    }
    projectRow = created;
  }

  // Roll dice — QM uses 2 dice as the base action pool (BoB p.138)
  // The Specialist's rating would improve this; deferred until Roster (Epic 6).
  const dice = rollDicePool(2);
  const baseQuality = qualityFromDice(dice);
  const finalQuality = applyBoosts(baseQuality, boosts);
  const segmentsAdded = QUALITY_LTP_SEGMENTS[finalQuality];

  const newTotal = Math.min(projectRow.clock_size, projectRow.segments_filled + segmentsAdded);
  const completed = newTotal >= projectRow.clock_size;

  await db
    .from('long_term_projects')
    .update({
      segments_filled: newTotal,
      phase_last_worked: campaign.phase_number,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', projectRow.id);

  if (supplySpent > 0) {
    await db.from('campaigns').update({ supply: campaign.supply - supplySpent }).eq('id', campaign_id);
  }

  await logCampaignAction({
    campaignId: campaign_id,
    phaseNumber: campaign.phase_number,
    step: 'CAMPAIGN_ACTIONS',
    role: 'QUARTERMASTER',
    actionType: 'LONG_TERM_PROJECT',
    details: {
      project_id: projectRow.id,
      project_name: projectRow.name,
      dice,
      base_quality: baseQuality,
      final_quality: finalQuality,
      segments_added: segmentsAdded,
      new_total: newTotal,
      clock_size: projectRow.clock_size,
      completed,
      boosts,
      supply_spent: supplySpent,
    },
  });

  revalidatePath('/dashboard/quartermaster');
  return {
    result: {
      project_id: projectRow.id,
      project_name: projectRow.name,
      dice,
      base_quality: baseQuality,
      final_quality: finalQuality,
      segments_added: segmentsAdded,
      new_total: newTotal,
      clock_size: projectRow.clock_size,
      completed,
      boosts,
      supply_spent: supplySpent,
    },
  };
}

// ─── QM: Alchemist Projects & Laborers (#59) ─────────────────────────────────

export interface AlchemistProjectState {
  errors?: { campaign_id?: string[]; alchemist_id?: string[]; _form?: string[] };
  result?: {
    dice_effect: number[];
    dice_corruption: number[];
    quality: ActionQuality;
    corruption_added: number;
    alchemist_name: string;
    new_corruption: number;
    corrupted: boolean;
  };
}

/**
 * QM action (Step 6): Run an Alchemist project.
 * Rolls effect dice (best die → quality) then corruption dice (worst die → ticks).
 * BoB rulebook p.139
 */
export async function performAlchemistProject(
  _prevState: AlchemistProjectState | null,
  formData: FormData,
): Promise<AlchemistProjectState> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const campaignId = formData.get('campaign_id') as string;
  const alchemistId = formData.get('alchemist_id') as string;
  if (!campaignId || !alchemistId) return { errors: { _form: ['Missing required fields'] } };

  const { membership, campaign: _campaignAlch } = await verifyQmAndFetchCampaign(
    db, user.id, campaignId,
    'campaign_phase_state, phase_number',
  );
  if (!membership) return { errors: { _form: ['Only the Quartermaster can run Alchemist projects'] } };
  if (!_campaignAlch) return { errors: { _form: ['Campaign not found'] } };
  const campaign = _campaignAlch as unknown as QmCampaignRow;

  if (campaign.campaign_phase_state !== 'AWAITING_LABORERS_ALCHEMISTS') {
    return { errors: { _form: ['Alchemist projects can only run during Step 6'] } };
  }

  // Count active alchemists for dice pool
  const { data: activeAlchemists } = await db
    .from('alchemists')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('status', 'ACTIVE');

  const diceCount = activeAlchemists?.length ?? 1;

  const { data: alchemist } = await db
    .from('alchemists')
    .select('id, name, corruption')
    .eq('id', alchemistId)
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (!alchemist) return { errors: { alchemist_id: ['Alchemist not found'] } };

  const diceEffect = rollDicePool(diceCount);
  const diceCorruption = rollDicePool(diceCount);
  const quality = qualityFromDice(diceEffect);
  const corruptionAdded = corruptionFromDice(diceCorruption);

  const newCorruption = Math.min(8, alchemist.corruption + corruptionAdded);
  const corrupted = newCorruption >= 8;

  await db
    .from('alchemists')
    .update({
      corruption: newCorruption,
      status: corrupted ? 'CORRUPTED' : 'ACTIVE',
    })
    .eq('id', alchemistId);

  await logCampaignAction({
    campaignId,
    phaseNumber: campaign.phase_number,
    step: 'AWAITING_LABORERS_ALCHEMISTS',
    role: 'QUARTERMASTER',
    actionType: 'ALCHEMIST_PROJECT',
    details: {
      alchemist_id: alchemistId,
      alchemist_name: alchemist.name,
      dice_effect: diceEffect,
      dice_corruption: diceCorruption,
      quality,
      corruption_added: corruptionAdded,
      new_corruption: newCorruption,
      corrupted,
    },
  });

  revalidatePath('/dashboard/quartermaster');
  return {
    result: {
      dice_effect: diceEffect,
      dice_corruption: diceCorruption,
      quality,
      corruption_added: corruptionAdded,
      alchemist_name: alchemist.name,
      new_corruption: newCorruption,
      corrupted,
    },
  };
}

export interface AssignLaborerState {
  errors?: { campaign_id?: string[]; project_id?: string[]; _form?: string[] };
  result?: { project_name: string; segments_added: number; new_total: number; completed: boolean };
}

/**
 * QM action (Step 6): Assign laborers to auto-tick a Long-Term Project.
 * Each Laborer unit ticks one segment regardless of QM action use.
 * BoB rulebook p.139
 */
export async function assignLaborers(
  _prevState: AssignLaborerState | null,
  formData: FormData,
): Promise<AssignLaborerState> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const campaignId = formData.get('campaign_id') as string;
  const projectId = formData.get('project_id') as string;
  if (!campaignId || !projectId) return { errors: { _form: ['Missing required fields'] } };

  const { membership, campaign: _campaignLab } = await verifyQmAndFetchCampaign(
    db, user.id, campaignId,
    'campaign_phase_state, phase_number',
  );
  if (!membership) return { errors: { _form: ['Only the Quartermaster can assign laborers'] } };
  if (!_campaignLab) return { errors: { _form: ['Campaign not found'] } };
  const campaign = _campaignLab as unknown as QmCampaignRow;

  if (campaign.campaign_phase_state !== 'AWAITING_LABORERS_ALCHEMISTS') {
    return { errors: { _form: ['Laborer assignment only available during Step 6'] } };
  }

  const { data: laborers } = await db
    .from('laborers')
    .select('count')
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (!laborers || laborers.count === 0) {
    return { errors: { _form: ['No laborers available'] } };
  }

  const { data: project } = await db
    .from('long_term_projects')
    .select('id, name, clock_size, segments_filled')
    .eq('id', projectId)
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (!project) return { errors: { project_id: ['Project not found'] } };
  if (project.segments_filled >= project.clock_size) {
    return { errors: { project_id: ['Project already complete'] } };
  }

  // Each laborer ticks 1 segment
  const segmentsAdded = laborers.count;
  const newTotal = Math.min(project.clock_size, project.segments_filled + segmentsAdded);
  const completed = newTotal >= project.clock_size;

  await db
    .from('long_term_projects')
    .update({
      segments_filled: newTotal,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', projectId);

  await db
    .from('laborers')
    .update({ current_project_id: projectId })
    .eq('campaign_id', campaignId);

  await logCampaignAction({
    campaignId,
    phaseNumber: campaign.phase_number,
    step: 'AWAITING_LABORERS_ALCHEMISTS',
    role: 'QUARTERMASTER',
    actionType: 'LABORER_TICK',
    details: {
      project_id: projectId,
      project_name: project.name,
      laborer_count: laborers.count,
      segments_added: segmentsAdded,
      new_total: newTotal,
      completed,
    },
  });

  revalidatePath('/dashboard/quartermaster');
  return { result: { project_name: project.name, segments_added: segmentsAdded, new_total: newTotal, completed } };
}

/**
 * QM action: Complete Step 6 (Laborers & Alchemists) and advance to AWAITING_ADVANCE.
 */
export async function completeLaborersAlchemists(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const campaignId = formData.get('campaign_id') as string;
  if (!campaignId) throw new Error('Campaign ID required');

  const { membership, campaign: _campaignComp } = await verifyQmAndFetchCampaign(
    db, user.id, campaignId,
    'campaign_phase_state, phase_number',
  );
  if (!membership) throw new Error('Only the Quartermaster can complete Step 6');
  if (!_campaignComp) throw new Error('Campaign not found');
  const campaign = _campaignComp as unknown as QmCampaignRow;

  assertValidTransition(
    campaign.campaign_phase_state as CampaignPhaseState | null,
    'AWAITING_ADVANCE',
  );

  await db
    .from('campaigns')
    .update({ campaign_phase_state: 'AWAITING_ADVANCE' })
    .eq('id', campaignId);

  // Reset laborer assignment for next phase
  await db
    .from('laborers')
    .update({ current_project_id: null })
    .eq('campaign_id', campaignId);

  await logCampaignAction({
    campaignId,
    phaseNumber: campaign.phase_number,
    step: 'AWAITING_LABORERS_ALCHEMISTS',
    role: 'QUARTERMASTER',
    actionType: 'LABORERS_ALCHEMISTS_COMPLETE',
    details: {},
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/quartermaster');
  revalidatePath('/dashboard/commander');
  redirect('/dashboard/quartermaster');
}

// ─── Mission Focus (Step 8) ───────────────────────────────────────────────────

/**
 * Commander action: select the mission focus for the next operation.
 * 
 * Records the focus in the log and transitions to AWAITING_MISSION_GENERATION.
 * BoB rulebook p.121
 */
export async function selectMissionFocus(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const campaignId = formData.get('campaign_id') as string;
  const focus = formData.get('focus') as MissionType;

  if (!campaignId || !focus) throw new Error('Campaign ID and focus are required');

  // Verify role (Commander or GM)
  const { data: membership } = await db
    .from('campaign_memberships')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .in('role', ['COMMANDER', 'GM'])
    .maybeSingle();

  if (!membership) throw new Error('Only the Commander or GM can select mission focus');

  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('campaign_phase_state, phase_number')
    .eq('id', campaignId)
    .single();

  if (fetchError || !campaign) throw new Error('Campaign not found');

  const currentState = campaign.campaign_phase_state as CampaignPhaseState | null;

  assertValidTransition(
    currentState,
    'AWAITING_MISSION_GENERATION',
  );

  const { error: updateError } = await db
    .from('campaigns')
    .update({ campaign_phase_state: 'AWAITING_MISSION_GENERATION' })
    .eq('id', campaignId);

  if (updateError) throw new Error(updateError.message);

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
  // JSON array of selected question IDs, one per unlocked tier
  questions: z.string().min(1, 'Select at least one question'),
});

/**
 * Commander action: record selected intel questions in the phase log.
 *
 * Does NOT change campaign_phase_state — intel questions are asked as a
 * sub-step of AWAITING_MISSION_SELECTION. The GM answers these questions
 * verbally during the session.
 *
 * BoB rulebook pp.122-123 (Intel questions).
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
