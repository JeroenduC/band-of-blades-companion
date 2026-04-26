'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { assertValidTransition } from '@/lib/state-machine';
import { type CampaignPhaseState, type SpecialistStatus } from '@/lib/types';
import { logCampaignAction, rollDice } from './core';

// ─── Mission Deployment (Step 11 / AWAITING_MISSION_DEPLOYMENT) ──────────────

export interface DeploymentState {
  errors?: {
    campaign_id?: string[];
    primary_specialists?: string[];
    primary_squad_id?: string[];
    secondary_specialists?: string[];
    secondary_squad_id?: string[];
    _form?: string[];
  };
  success?: boolean;
}

const DeploymentSchema = z.object({
  campaign_id: z.string().uuid('Invalid campaign'),
  primary_specialists: z.array(z.string().uuid()).max(3, 'Max 3 specialists per mission'),
  primary_squad_id: z.string().uuid().optional(),
  primary_leader_id: z.string().uuid().optional(),
  secondary_specialists: z.array(z.string().uuid()).max(3, 'Max 3 specialists per mission'),
  secondary_squad_id: z.string().uuid().optional(),
  secondary_leader_id: z.string().uuid().optional(),
});

/**
 * Marshal action: assign specialists and squads to selected missions.
 */
export async function deployPersonnel(
  _prevState: DeploymentState | null,
  formData: FormData,
): Promise<DeploymentState> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const campaignId = formData.get('campaign_id') as string;
  const primarySpecs = JSON.parse(formData.get('primary_specialists') as string || '[]');
  const secondarySpecs = JSON.parse(formData.get('secondary_specialists') as string || '[]');

  const raw = {
    campaign_id: campaignId,
    primary_specialists: primarySpecs,
    primary_squad_id: formData.get('primary_squad_id') || undefined,
    primary_leader_id: formData.get('primary_leader_id') || undefined,
    secondary_specialists: secondarySpecs,
    secondary_squad_id: formData.get('secondary_squad_id') || undefined,
    secondary_leader_id: formData.get('secondary_leader_id') || undefined,
  };

  const parsed = DeploymentSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { data: deployment } = parsed;

  const { data: membership } = await db
    .from('campaign_memberships')
    .select('role')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .in('role', ['MARSHAL', 'GM'])
    .maybeSingle();

  if (!membership) {
    return { errors: { _form: ['Only the Marshal or GM can deploy personnel'] } };
  }

  const isOverride = membership.role === 'GM';

  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('campaign_phase_state, phase_number')
    .eq('id', campaignId)
    .single();

  if (fetchError || !campaign) {
    return { errors: { _form: ['Campaign not found'] } };
  }

  if (campaign.campaign_phase_state !== 'AWAITING_MISSION_DEPLOYMENT') {
    return { errors: { _form: ['Cannot deploy personnel in the current phase state'] } };
  }

  // Update specialist status to DEPLOYED
  const allDeployedSpecs = [...deployment.primary_specialists, ...deployment.secondary_specialists];
  if (allDeployedSpecs.length > 0) {
    const { error: specError } = await db
      .from('specialists')
      .update({ status: 'DEPLOYED' as SpecialistStatus })
      .in('id', allDeployedSpecs);

    if (specError) {
      return { errors: { _form: [specError.message] } };
    }
  }

  await logCampaignAction({
    campaignId,
    phaseNumber: campaign.phase_number,
    step: 'AWAITING_MISSION_DEPLOYMENT',
    role: 'MARSHAL',
    actionType: 'PERSONNEL_DEPLOYED',
    details: {
      primary: {
        specialist_ids: deployment.primary_specialists,
        squad_id: deployment.primary_squad_id,
        leader_id: deployment.primary_leader_id,
      },
      secondary: {
        specialist_ids: deployment.secondary_specialists,
        squad_id: deployment.secondary_squad_id,
        leader_id: deployment.secondary_leader_id,
      },
      gm_override: isOverride,
      acting_user_id: isOverride ? user.id : undefined,
    },
  });

  revalidatePath('/dashboard/marshal');
  return { success: true };
}

// ─── Engagement Rolls ────────────────────────────────────────────────────────

export interface EngagementRollResult {
  mission_id: string;
  is_primary: boolean;
  dice_pool: number;
  dice_results: number[];
  highest: number;
  outcome: string;
  consequences: string[];
}

export interface EngagementState {
  errors?: {
    campaign_id?: string[];
    _form?: string[];
  };
  results?: EngagementRollResult[];
}

/**
 * Marshal action: complete engagement rolls and finish the campaign phase.
 */
export async function completeEngagementRolls(
  campaignId: string,
  primaryPool: number,
  secondaryPool: number,
  primaryMissionId: string,
  secondaryMissionId: string,
): Promise<EngagementState> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  // Verify role (Marshal or GM)
  const { data: membership } = await db
    .from('campaign_memberships')
    .select('role')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .in('role', ['MARSHAL', 'GM'])
    .maybeSingle();

  if (!membership) return { errors: { _form: ['Only the Marshal or GM can complete engagement rolls'] } };

  const isOverride = membership.role === 'GM';

  const { data: campaign } = await db
    .from('campaigns')
    .select('campaign_phase_state, phase_number')
    .eq('id', campaignId)
    .single();

  if (!campaign) return { errors: { _form: ['Campaign not found'] } };

  // Roll for secondary mission
  const secondaryDice = await rollDice(secondaryPool === 0 ? 2 : secondaryPool);
  const highest = secondaryPool === 0 ? Math.min(...secondaryDice) : Math.max(...secondaryDice);

  let outcome = '';
  let consequences: string[] = [];

  if (highest === 6) {
    const isCritical = secondaryDice.filter(d => d === 6).length >= 2;
    if (isCritical) {
      outcome = 'CRITICAL';
      consequences = ['Succeed with no consequences', 'Promote one squad member'];
    } else {
      outcome = '6';
      consequences = ['Succeed', 'All Specialists take level 1 harm', 'May lose 2 squad members to promote a Rookie'];
    }
  } else if (highest >= 4) {
    outcome = '4/5';
    consequences = ['Choose: Fail safely OR Succeed with 2 dead squad members and level 2 harm'];
  } else {
    outcome = '1-3';
    consequences = ['Fail', 'Lose 3 squad members', 'All Specialists take level 3 harm'];
  }

  const results: EngagementRollResult[] = [
    {
      mission_id: primaryMissionId,
      is_primary: true,
      dice_pool: primaryPool,
      dice_results: [],
      highest: 0,
      outcome: 'PENDING (GM ROLL)',
      consequences: [],
    },
    {
      mission_id: secondaryMissionId,
      is_primary: false,
      dice_pool: secondaryPool,
      dice_results: secondaryDice,
      highest,
      outcome,
      consequences,
    }
  ];

  await logCampaignAction({
    campaignId,
    phaseNumber: campaign.phase_number,
    step: 'AWAITING_MISSION_DEPLOYMENT',
    role: 'MARSHAL',
    actionType: 'ENGAGEMENT_ROLL',
    details: { 
      results,
      gm_override: isOverride,
      acting_user_id: isOverride ? user.id : undefined,
    },
  });

  // Final transition to PHASE_COMPLETE
  const { error: updateError } = await db
    .from('campaigns')
    .update({ campaign_phase_state: 'PHASE_COMPLETE' })
    .eq('id', campaignId);

  if (updateError) return { errors: { _form: [updateError.message] } };

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/marshal');

  return { results };
}

// ─── Post-Mission Personnel Updates (Step 2 / AWAITING_PERSONNEL_UPDATE) ───

export interface PersonnelUpdateState {
  errors?: {
    campaign_id?: string[];
    _form?: string[];
  };
  success?: boolean;
}

/**
 * Marshal action: record mission consequences and advance to Back at Camp.
 */
export async function updatePersonnelPostMission(
  campaignId: string,
  specialistUpdates: Array<{ id: string; harm: any; stress: number; xp: number; status: SpecialistStatus }>,
  squadMemberUpdates: Array<{ id: string; status: any; rank?: any; harm: number; stress: number; xp: number }>,
): Promise<PersonnelUpdateState> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  // Verify role (Marshal or GM)
  const { data: membership } = await db
    .from('campaign_memberships')
    .select('role')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .in('role', ['MARSHAL', 'GM'])
    .maybeSingle();

  if (!membership) return { errors: { _form: ['Only the Marshal or GM can update personnel'] } };

  const isOverride = membership.role === 'GM';

  const { data: campaign } = await db
    .from('campaigns')
    .select('campaign_phase_state, phase_number, deaths_since_last_tale')
    .eq('id', campaignId)
    .single();

  if (!campaign) return { errors: { _form: ['Campaign not found'] } };

  if (campaign.campaign_phase_state !== 'AWAITING_PERSONNEL_UPDATE') {
    return { errors: { _form: ['Cannot update personnel in the current phase state'] } };
  }

  // Fetch current status to detect new deaths
  const [
    { data: currentSpecialists },
    { data: currentSquadMembers }
  ] = await Promise.all([
    db.from('specialists').select('id, status').in('id', specialistUpdates.map(u => u.id)),
    db.from('squad_members').select('id, status').in('id', squadMemberUpdates.map(u => u.id))
  ]);

  let newDeaths = 0;

  // Batch update specialists
  for (const update of specialistUpdates) {
    const current = currentSpecialists?.find(s => s.id === update.id);
    if (current && current.status !== 'DEAD' && update.status === 'DEAD') {
      newDeaths++;
    }

    const { error } = await db
      .from('specialists')
      .update({
        harm_level_1_a: update.harm.level_1_a,
        harm_level_1_b: update.harm.level_1_b,
        harm_level_2_a: update.harm.level_2_a,
        harm_level_2_b: update.harm.level_2_b,
        harm_level_3: update.harm.level_3,
        stress: update.stress,
        xp: update.xp,
        status: update.status
      })
      .eq('id', update.id);
    if (error) console.error(`Failed to update specialist ${update.id}:`, error);
  }

  // Batch update squad members
  for (const update of squadMemberUpdates) {
    const current = currentSquadMembers?.find(s => s.id === update.id);
    if (current && current.status !== 'DEAD' && update.status === 'DEAD') {
      newDeaths++;
    }

    const { error } = await db
      .from('squad_members')
      .update({
        status: update.status,
        rank: update.rank,
        harm: update.harm,
        stress: update.stress,
        xp: update.xp
      })
      .eq('id', update.id);
    if (error) console.error(`Failed to update squad member ${update.id}:`, error);
  }

  await logCampaignAction({
    campaignId,
    phaseNumber: campaign.phase_number,
    step: 'AWAITING_PERSONNEL_UPDATE',
    role: 'MARSHAL',
    actionType: 'PERSONNEL_UPDATED',
    details: { 
      specialist_count: specialistUpdates.length, 
      squad_member_count: squadMemberUpdates.length,
      new_deaths: newDeaths,
      gm_override: isOverride,
      acting_user_id: isOverride ? user.id : undefined,
    },
  });

  // Transition to AWAITING_BACK_AT_CAMP and update death counter
  const { error: updateError } = await db
    .from('campaigns')
    .update({ 
      campaign_phase_state: 'AWAITING_BACK_AT_CAMP',
      deaths_since_last_tale: campaign.deaths_since_last_tale + newDeaths
    })
    .eq('id', campaignId);

  if (updateError) return { errors: { _form: [updateError.message] } };

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/marshal');
  return { success: true };
}

/**
 * Marshal action: rename a squad member.
 */
export async function renameSquadMember(memberId: string, newName: string): Promise<void> {
  const db = createServiceClient();
  const { error } = await db
    .from('squad_members')
    .update({ name: newName })
    .eq('id', memberId);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/marshal');
}

/**
 * Marshal action: transfer a member to a different squad.
 */
export async function transferSquadMember(memberId: string, targetSquadId: string): Promise<void> {
  const db = createServiceClient();

  // Check squad limit (5)
  const { data: members } = await db
    .from('squad_members')
    .select('id')
    .eq('squad_id', targetSquadId)
    .neq('status', 'DEAD');

  if ((members?.length ?? 0) >= 5) {
    throw new Error('Target squad is full (max 5 living members)');
  }

  const { error } = await db
    .from('squad_members')
    .update({ squad_id: targetSquadId })
    .eq('id', memberId);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/marshal');
}
