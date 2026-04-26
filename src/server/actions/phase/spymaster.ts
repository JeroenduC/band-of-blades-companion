'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { type CampaignPhaseState } from '@/lib/types';
import { logCampaignAction, rollDicePool } from './core';

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
    .select('role')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .in('role', ['SPYMASTER', 'GM'])
    .maybeSingle();

  if (!membership) throw new Error('Only the Spymaster or GM can complete spy dispatch');

  const isOverride = membership.role === 'GM';

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
    details: { 
      advanced_state: bothDone,
      gm_override: isOverride,
      acting_user_id: isOverride ? user.id : undefined,
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/spymaster');
  redirect('/dashboard/spymaster');
}

/**
 * Spymaster action: dispatch a spy on a simple or long-term assignment.
 */
export async function dispatchSpy(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const campaignId = formData.get('campaign_id') as string;
  const spyId = formData.get('spy_id') as string;
  const assignment = formData.get('assignment') as string;
  const intelQuestionId = formData.get('intel_question_id') as string | null;

  if (!campaignId || !spyId || !assignment) {
    throw new Error('Campaign ID, Spy ID, and Assignment are required');
  }

  // Verify membership
  const { data: membership } = await db
    .from('campaign_memberships')
    .select('role')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .in('role', ['SPYMASTER', 'GM'])
    .maybeSingle();

  if (!membership) throw new Error('Only the Spymaster or GM can dispatch spies');

  const isOverride = membership.role === 'GM';

  // Load spy
  const { data: spy, error: spyError } = await db
    .from('spies')
    .select('*')
    .eq('id', spyId)
    .eq('campaign_id', campaignId)
    .single();

  if (spyError || !spy) throw new Error('Spy not found');
  if (spy.status === 'DEAD') throw new Error('Dead spies cannot be dispatched');
  if (spy.status === 'ON_ASSIGNMENT') throw new Error('Spy is already on assignment');

  // Load campaign for logging
  const { data: campaign } = await db
    .from('campaigns')
    .select('phase_number')
    .eq('id', campaignId)
    .single();

  const updatePayload: any = {
    current_assignment: assignment,
    status: 'ON_ASSIGNMENT',
  };

  const details: any = {
    spy_name: spy.name,
    assignment_type: assignment,
    gm_override: isOverride,
    acting_user_id: isOverride ? user.id : undefined,
  };

  // Logic for simple assignments
  if (assignment === 'RECOVER') {
    if (spy.status !== 'WOUNDED') throw new Error('Only wounded spies can recover');
    updatePayload.status = 'AVAILABLE';
    updatePayload.current_assignment = 'NONE';
    details.effect = 'Wounded status removed';
  } else if (assignment === 'INTERROGATE') {
    if (!intelQuestionId) throw new Error('Intel question is required for Interrogate');
    details.intel_question_id = intelQuestionId;
    details.effect = 'Intel question recorded for mission selection';
  } else if (assignment === 'BLACKMAIL') {
    details.effect = '+1d to QM Acquire Assets roll this phase';
  } else if (assignment === 'HELP') {
    details.effect = '+1d to QM Long-Term Project roll this phase';
  }

  await db.from('spies').update(updatePayload).eq('id', spyId);

  await logCampaignAction({
    campaignId,
    phaseNumber: campaign?.phase_number ?? 0,
    step: 'CAMPAIGN_ACTIONS',
    role: 'SPYMASTER',
    actionType: 'SPY_DISPATCHED',
    details,
  });

  revalidatePath('/dashboard/spymaster');
}

/**
 * Create a new long-term assignment.
 */
export async function createLongTermAssignment(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const campaignId = formData.get('campaign_id') as string;
  const type = formData.get('type') as any;
  const name = formData.get('name') as string;

  if (!campaignId || !type || !name) throw new Error('All fields are required');

  // Verify membership (Spymaster or GM)
  const { data: membership } = await db
    .from('campaign_memberships')
    .select('role')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .in('role', ['SPYMASTER', 'GM'])
    .maybeSingle();

  if (!membership) throw new Error('Unauthorized');

  await db.from('spy_long_term_assignments').insert({
    campaign_id: campaignId,
    type,
    name,
    clock_segments: 8,
    clock_filled: 0,
  });

  revalidatePath('/dashboard/spymaster');
}

/**
 * Unlock a spy network upgrade.
 */
export async function unlockUpgrade(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const campaignId = formData.get('campaign_id') as string;
  const upgradeName = formData.get('upgrade_name') as string;

  if (!campaignId || !upgradeName) throw new Error('Missing fields');

  // Verify membership (Spymaster or GM)
  const { data: membership } = await db
    .from('campaign_memberships')
    .select('role')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .in('role', ['SPYMASTER', 'GM'])
    .maybeSingle();

  if (!membership) throw new Error('Unauthorized');

  const { data: network } = await db
    .from('spy_networks')
    .select('upgrades')
    .eq('campaign_id', campaignId)
    .single();

  if (!network) throw new Error('Network not found');

  const currentUpgrades = (network.upgrades || []) as string[];
  
  // Basic validation (Training can be taken twice, others only once)
  const trainingCount = currentUpgrades.filter(u => u === 'Training').length;
  if (upgradeName === 'Training') {
    if (trainingCount >= 2) throw new Error('Training already maxed out');
  } else {
    if (currentUpgrades.includes(upgradeName)) throw new Error('Upgrade already unlocked');
  }

  const newUpgrades = [...currentUpgrades, upgradeName];

  await db.from('spy_networks').update({
    upgrades: newUpgrades,
  }).eq('campaign_id', campaignId);

  revalidatePath('/dashboard/spymaster');
}
export async function workOnLongTermAssignment(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const campaignId = formData.get('campaign_id') as string;
  const spyId = formData.get('spy_id') as string;
  const ltaId = formData.get('lta_id') as string;

  if (!campaignId || !spyId || !ltaId) throw new Error('Missing required IDs');

  // Verify membership and fetch campaign/spy/lta/network
  const [
    { data: membership },
    { data: campaign },
    { data: spy },
    { data: lta },
    { data: network },
  ] = await Promise.all([
    db.from('campaign_memberships').select('role').eq('campaign_id', campaignId).eq('user_id', user.id).in('role', ['SPYMASTER', 'GM']).maybeSingle(),
    db.from('campaigns').select('phase_number').eq('id', campaignId).single(),
    db.from('spies').select('*').eq('id', spyId).single(),
    db.from('spy_long_term_assignments').select('*').eq('id', ltaId).single(),
    db.from('spy_networks').select('*').eq('campaign_id', campaignId).maybeSingle(),
  ]);

  if (!membership) throw new Error('Forbidden');

  const isOverride = membership.role === 'GM';

  if (!spy || spy.status === 'DEAD' || spy.status === 'ON_ASSIGNMENT') throw new Error('Spy unavailable');
  if (!lta || lta.is_completed) throw new Error('Assignment already complete');

  // Specialties & Network Bonuses
  let dicePool = spy.rank === 'MASTER' ? 2 : 1;
  const upgrades = network?.upgrades || [];

  if (lta.type === 'RESEARCH' && upgrades.includes('Analysts')) dicePool++;
  if (lta.type === 'EXPAND' && upgrades.includes('Investments')) dicePool++;
  if (lta.type === 'LAY_TRAP' && upgrades.includes('Entrapment')) dicePool++;
  if (lta.type === 'AUGMENT' && upgrades.includes('Sources')) dicePool++;

  // Spy specific bonuses
  if (spy.name === 'Liya' && lta.type === 'RESEARCH') dicePool++;
  if (spy.name === 'Onyetin' && lta.type === 'AUGMENT') dicePool++;

  // Roll dice
  const dice = await rollDicePool(dicePool);
  const highest = Math.max(...dice);
  const isCritical = dice.filter(d => d === 6).length >= 2;

  let segments = 0;
  let wounded = false;

  if (isCritical) {
    segments = 5;
  } else if (highest === 6) {
    segments = 3;
  } else if (highest >= 4) {
    segments = 2;
  } else {
    segments = 1;
    wounded = true;
  }

  // Bortis bonus
  if (spy.name === 'Bortis' && lta.type === 'EXPAND') {
    segments += 1;
  }

  // Gale specialty: never wounds
  if (spy.name === 'Crimson Vexing Gale') {
    wounded = false;
  }

  const newFilled = Math.min(lta.clock_segments, lta.clock_filled + segments);
  const completed = newFilled >= lta.clock_segments;

  // Update LTA
  await db.from('spy_long_term_assignments').update({
    clock_filled: newFilled,
    is_completed: completed,
  }).eq('id', ltaId);

  // Update Spy
  const newStatus = wounded 
    ? (spy.status === 'WOUNDED' ? 'DEAD' : 'WOUNDED')
    : 'ON_ASSIGNMENT';
  
  await db.from('spies').update({
    status: newStatus,
    current_assignment: lta.type as any,
    long_term_assignment_id: ltaId,
    last_phase_worked: campaign?.phase_number,
  }).eq('id', spyId);

  await logCampaignAction({
    campaignId,
    phaseNumber: campaign?.phase_number ?? 0,
    step: 'CAMPAIGN_ACTIONS',
    role: 'SPYMASTER',
    actionType: 'SPY_DISPATCHED',
    details: {
      spy_name: spy.name,
      assignment_type: lta.type,
      assignment_name: lta.name,
      dice,
      segments_added: segments,
      wounded,
      died: newStatus === 'DEAD',
      completed,
      gm_override: isOverride,
      acting_user_id: isOverride ? user.id : undefined,
    },
  });

  revalidatePath('/dashboard/spymaster');
}
