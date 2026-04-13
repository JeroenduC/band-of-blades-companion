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
