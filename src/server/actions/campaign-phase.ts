'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { assertValidTransition } from '@/lib/state-machine';
import type {
  CampaignPhaseState,
  CampaignPhaseLogActionType,
  LegionRole,
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
    horses_spent?: string[];
    _form?: string[];
  };
  /** Populated after a successful Advance roll so the UI can show the result */
  result?: {
    decision: 'ADVANCE' | 'STAY';
    horses_spent: number;
    pressure_before: number;
    pressure_after_horses: number;
    dice: number[];
    worst_die: number;
    time_ticks_added: number;
  };
}

const AdvanceDecisionSchema = z.object({
  campaign_id: z.string().uuid('Invalid campaign'),
  decision: z.enum(['ADVANCE', 'STAY'], {
    error: 'Select Advance or Stay',
  }),
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
    horses_spent: formData.get('horses_spent') || '0',
  };

  const parsed = AdvanceDecisionSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { campaign_id, decision, horses_spent } = parsed.data;

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
    .select('campaign_phase_state, phase_number, pressure, horse_uses, time_clock_1, time_clock_2, time_clock_3')
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

  let logDetails: Record<string, unknown>;
  let updates: Record<string, unknown> = { campaign_phase_state: 'AWAITING_MISSION_FOCUS' };

  if (decision === 'STAY') {
    logDetails = { decision: 'STAY' };
  } else {
    // Advance: reduce pressure by horses spent, then roll
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
      pressure: 0, // pressure resets after advance roll
      horse_uses: campaign.horse_uses - horses_spent,
      time_clock_1: clock1,
      time_clock_2: clock2,
      time_clock_3: clock3,
    };

    logDetails = {
      decision: 'ADVANCE',
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
  redirect('/dashboard/commander');
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
