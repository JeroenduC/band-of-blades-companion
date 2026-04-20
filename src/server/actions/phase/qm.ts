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
import { type CampaignPhaseState } from '@/lib/types';
import {
  logCampaignAction,
  rollDicePool,
  verifyQmAndFetchCampaign,
  type QmCampaignRow,
} from './core';

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

// ─── QM: Recruit ────────────────────────────────────────────────────────────

export interface RecruitState {
  errors?: { campaign_id?: string[]; _form?: string[] };
  result?: { rookies: number; soldiers: number; boosted: boolean; supply_spent: number };
}

/**
 * QM action: Recruit — gain 5 new soldiers for the Marshal to place in squads.
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

// ─── QM: Acquire Assets ──────────────────────────────────────────────────────

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

  // Check if this asset type was already acquired this phase
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

  const { getLocation, getAssetsDicePool } = await import('@/lib/locations');
  const location = getLocation(campaign.current_location);
  const locationAssetType = assetType as Parameters<typeof getAssetsDicePool>[1];
  const diceCount = location ? getAssetsDicePool(location, locationAssetType) : 1;

  const dice = await await rollDicePool(diceCount);
  const baseQuality = qualityFromDice(dice);
  const finalQuality = applyBoosts(baseQuality, boosts);

  // Apply effects
  let usesGained: number | undefined;
  let personnelAdded: string | undefined;
  const resourceCol = RESOURCE_COLUMN[assetType];
  const updates: Record<string, unknown> = {};

  if (resourceCol) {
    usesGained = QUALITY_RESOURCE_USES[finalQuality];
    const currentUses = (campaign as unknown as Record<string, unknown>)[resourceCol] as number ?? 0;
    updates[resourceCol] = currentUses + usesGained;
  } else {
    if (finalQuality === 'POOR' || finalQuality === 'STANDARD') {
      return {
        errors: { _form: [`${assetType.replace('_', ' ')} requires Fine quality or better (rolled ${finalQuality})`] },
        result: {
          asset_type: assetType, dice, base_quality: baseQuality,
          final_quality: finalQuality, boosts, supply_spent: supplySpent,
        },
      };
    }
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

// ─── QM: Rest and Recuperation ───────────────────────────────────────────────

export interface RnRState {
  errors?: { campaign_id?: string[]; _form?: string[] };
  result?: { mercies_healed: number; boosted: boolean; supply_spent: number };
}

/**
 * QM action: Rest and Recuperation — Legionnaires heal; Mercies auto-heal if unused.
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

// ─── QM: Long-Term Project ───────────────────────────────────────────────────

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
  project_id: z.string().uuid().optional(),
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(300).optional(),
  clock_size: z.coerce.number().int().min(4).max(12).optional(),
  boosts: z.coerce.number().int().min(0).max(3).default(0),
});

/**
 * QM action: Long-Term Project — work a clock toward a custom campaign benefit.
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

  const dice = await rollDicePool(2);
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

// ─── QM: Alchemist Projects & Laborers ───────────────────────────────────────

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

  const diceEffect = await rollDicePool(diceCount);
  const diceCorruption = await rollDicePool(diceCount);
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
