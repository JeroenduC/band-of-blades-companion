'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { assertValidTransition } from '@/lib/state-machine';
import {
  type CampaignPhaseState,
  type CampaignPhaseLogActionType,
  type LegionRole,
} from '@/lib/types';

/**
 * Inserts a CampaignPhaseLog entry and returns its ID.
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
}): Promise<string> {
  const db = createServiceClient();
  const { data, error } = await db.from('campaign_phase_log').insert({
    campaign_id: campaignId,
    phase_number: phaseNumber,
    step,
    role,
    action_type: actionType,
    details,
  }).select('id').single();

  if (error) throw new Error(`Failed to log campaign action: ${error.message}`);
  return data.id;
}

/**
 * Reverses the impact of a log entry (resource changes).
 * Note: This is a best-effort rollback for basic resources.
 */
export async function rollbackLogEntry(campaignId: string, logId: string): Promise<void> {
  const db = createServiceClient();
  
  const { data: log, error: logError } = await db
    .from('campaign_phase_log')
    .select('*')
    .eq('id', logId)
    .single();
    
  if (logError || !log) return;

  const details = log.details as any;
  const updates: Record<string, any> = {};

  // Reverse morale, supply, intel, pressure if present in details
  if (details.morale_change) updates.morale = -details.morale_change;
  if (details.supply_gain) updates.supply = -details.supply_gain;
  if (details.intel_gain) updates.intel = -details.intel_gain;
  if (details.pressure_gain) updates.pressure = -details.pressure_gain;

  if (Object.keys(updates).length > 0) {
    // We need to fetch current and add the negative delta
    const { data: campaign } = await db.from('campaigns').select('morale, supply, intel, pressure').eq('id', campaignId).single();
    if (campaign) {
      const finalUpdates: any = {};
      if (updates.morale) finalUpdates.morale = Math.max(0, (campaign.morale || 0) + updates.morale);
      if (updates.supply) finalUpdates.supply = Math.max(0, (campaign.supply || 0) + updates.supply);
      if (updates.intel) finalUpdates.intel = Math.max(0, (campaign.intel || 0) + updates.intel);
      if (updates.pressure) finalUpdates.pressure = Math.max(0, (campaign.pressure || 0) + updates.pressure);
      
      await db.from('campaigns').update(finalUpdates).eq('id', campaignId);
    }
  }

  // Mark the log entry as undone (we don't delete to maintain audit)
  await db.from('campaign_phase_log').update({ 
    action_type: 'UNDO' as any,
    details: { ...details, undone_at: new Date().toISOString() } 
  }).eq('id', logId);
}

/**
 * Generic undo action for the 10-second window.
 */
export async function undoCampaignAction(campaignId: string): Promise<void> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: campaign } = await db
    .from('campaigns')
    .select('pending_state, last_action_id, campaign_phase_state')
    .eq('id', campaignId)
    .single();

  if (!campaign || !campaign.last_action_id) throw new Error('No action to undo');

  // 1. Rollback resource changes
  await rollbackLogEntry(campaignId, campaign.last_action_id);

  // 2. Clear pending state and revert last action id
  await db.from('campaigns').update({
    pending_state: null,
    pending_expiry: null,
    last_action_id: null
  }).eq('id', campaignId);

  revalidatePath('/dashboard');
}

/**
 * Commits a pending state transition (clears the undo window).
 */
export async function commitPendingState(campaignId: string): Promise<void> {
  const db = createServiceClient();
  
  await db.from('campaigns').update({
    pending_state: null,
    pending_expiry: null,
    last_action_id: null
  }).eq('id', campaignId);

  revalidatePath('/dashboard');
}

/**
 * Validates and applies a campaign phase state transition with a 10s undo window.
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

  // Validate transition
  assertValidTransition(currentState, newState);

  // Log the transition first (we mark it UNDO if they click undo)
  const logId = await logCampaignAction({
    campaignId,
    phaseNumber: campaign.phase_number,
    step: newState,
    role,
    actionType,
    details: { from: currentState, to: newState, ...logDetails },
  });

  // Apply new state + set pending window
  const expiry = new Date(Date.now() + 10000).toISOString();
  const { error: updateError } = await db
    .from('campaigns')
    .update({ 
      campaign_phase_state: newState, // We actually transition now so others see it, but UI shows undo
      pending_state: newState,
      pending_expiry: expiry,
      last_action_id: logId
    })
    .eq('id', campaignId);

  if (updateError) throw new Error(`Failed to update campaign state: ${updateError.message}`);

  revalidatePath(`/dashboard`);
  return newState;
}

/**
 * GM action: start a new campaign phase.
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

  // Log it
  const logId = await logCampaignAction({
    campaignId,
    phaseNumber: newPhaseNumber,
    step: 'AWAITING_MISSION_RESOLUTION',
    role: 'GM',
    actionType: 'PHASE_START',
    details: { phase_number: newPhaseNumber },
  });

  const expiry = new Date(Date.now() + 10000).toISOString();

  const { error: updateError } = await db
    .from('campaigns')
    .update({
      campaign_phase_state: 'AWAITING_MISSION_RESOLUTION' as CampaignPhaseState,
      phase_number: newPhaseNumber,
      qm_actions_complete: false,
      spymaster_actions_complete: false,
      pending_state: 'AWAITING_MISSION_RESOLUTION',
      pending_expiry: expiry,
      last_action_id: logId
    })
    .eq('id', campaignId);

  if (updateError) throw new Error(updateError.message);

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/gm');
}

/**
 * Inserts the 18 Back at Camp scenes for a newly created campaign.
 */
export async function seedBackAtCampScenes(campaignId: string): Promise<void> {
  const db = createServiceClient();
  const { error } = await db.rpc('seed_back_at_camp_scenes', {
    p_campaign_id: campaignId,
  });
  if (error) throw new Error(`Failed to seed Back at Camp scenes: ${error.message}`);
}

/**
 * Generic placeholder pass-through for steps with no full implementation yet.
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

// ─── Shared helpers ─────────────────────────────────────────────────────────

export async function rollDicePool(count: number): Promise<number[]> {
  const buf = new Uint8Array(Math.max(1, count));
  crypto.getRandomValues(buf);
  return Array.from(buf).map((n) => (n % 6) + 1);
}

/**
 * Rolls a pool of d6s using server-side crypto.getRandomValues.
 * (Alternative name for rollDicePool used in some contexts)
 */
export async function rollDice(count: number): Promise<number[]> {
  return rollDicePool(count);
}

// Campaign shape returned by verifyQmAndFetchCampaign
export interface QmCampaignRow {
  id: string;
  campaign_phase_state: string | null;
  phase_number: number;
  supply: number;
  morale: number;
  current_location: string;
  food_uses: number;
  horse_uses: number;
  black_shot_uses: number;
  religious_supply_uses: number;
}

/** Verify the caller is the QM or GM and return campaign row, or return an error. */
export async function verifyQmAndFetchCampaign(
  db: ReturnType<typeof createServiceClient>,
  userId: string,
  campaignId: string,
  select: string,
): Promise<{ membership: { id: string; role: LegionRole } | null; campaign: Record<string, unknown> | null }> {
  const { data: membership } = await db
    .from('campaign_memberships')
    .select('id, role')
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
    .in('role', ['QUARTERMASTER', 'GM'])
    .maybeSingle();

  if (!membership) return { membership: null, campaign: null };

  const { data: campaign } = await db
    .from('campaigns')
    .select(select)
    .eq('id', campaignId)
    .single();

  return { 
    membership: membership as { id: string; role: LegionRole }, 
    campaign: campaign as Record<string, unknown> | null 
  };
}
