'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { assertValidTransition } from '@/lib/state-machine';
import { type CampaignPhaseState } from '@/lib/types';
import { logCampaignAction } from './core';

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
    assertValidTransition(currentState, 'AWAITING_PERSONNEL_UPDATE');
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
      campaign_phase_state: 'AWAITING_PERSONNEL_UPDATE',
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

// ─── GM Mission Generation ───────────────────────────────────────────────────

export interface GenerateMissionsState {
  errors?: {
    campaign_id?: string[];
    missions?: string[];
    _form?: string[];
  };
  success?: boolean;
}

const MissionInputSchema = z.object({
  name: z.string().min(1, 'Mission name required').max(80),
  type: z.enum(['ASSAULT', 'RECON', 'RELIGIOUS', 'SUPPLY', 'SPECIAL'], {
    error: 'Select a mission type',
  }),
  objective: z.string().min(1, 'Objective required').max(300),
  threat_level: z.coerce.number().int().min(1).max(4),
  reward_morale: z.coerce.number().int().min(0).default(0),
  reward_intel: z.coerce.number().int().min(0).default(0),
  reward_supply: z.coerce.number().int().min(0).default(0),
  reward_time: z.coerce.number().int().min(0).default(0),
  penalty_pressure: z.coerce.number().int().min(0).default(0),
  penalty_morale: z.coerce.number().int().min(0).default(0),
});

type MissionInput = z.infer<typeof MissionInputSchema>;

const GenerateMissionsSchema = z.object({
  campaign_id: z.string().uuid('Invalid campaign'),
  // JSON-encoded array of mission objects
  missions_json: z.string().min(1),
});

/**
 * GM action: save generated missions and present them to the Commander.
 */
export async function generateMissions(
  _prevState: GenerateMissionsState | null,
  formData: FormData,
): Promise<GenerateMissionsState> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/sign-in');

  const raw = {
    campaign_id: formData.get('campaign_id'),
    missions_json: formData.get('missions_json'),
  };

  const parsed = GenerateMissionsSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { campaign_id, missions_json } = parsed.data;

  const { data: membership } = await db
    .from('campaign_memberships')
    .select('id')
    .eq('campaign_id', campaign_id)
    .eq('user_id', user.id)
    .eq('role', 'GM')
    .maybeSingle();

  if (!membership) {
    return { errors: { _form: ['Only the GM can generate missions'] } };
  }

  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('campaign_phase_state, phase_number')
    .eq('id', campaign_id)
    .single();

  if (fetchError || !campaign) {
    return { errors: { _form: ['Campaign not found'] } };
  }

  try {
    assertValidTransition(
      campaign.campaign_phase_state as CampaignPhaseState | null,
      'AWAITING_MISSION_SELECTION',
    );
  } catch {
    return { errors: { _form: ['Cannot generate missions in the current phase state'] } };
  }

  let missionInputs: MissionInput[];
  try {
    const rawData = JSON.parse(missions_json);
    if (!Array.isArray(rawData) || rawData.length < 2 || rawData.length > 3) {
      return { errors: { missions: ['Provide 2 or 3 missions'] } };
    }
    missionInputs = rawData.map((m) => MissionInputSchema.parse(m));
  } catch {
    return { errors: { missions: ['Invalid mission data'] } };
  }

  const missionRows = missionInputs.map((m) => ({
    campaign_id,
    phase_number: campaign.phase_number,
    name: m.name,
    type: m.type,
    objective: m.objective,
    threat_level: m.threat_level,
    status: 'GENERATED' as const,
    rewards: {
      morale: m.reward_morale,
      intel: m.reward_intel,
      supply: m.reward_supply,
      time: m.reward_time,
    },
    penalties: {
      pressure: m.penalty_pressure,
      morale: m.penalty_morale,
    },
  }));

  const { error: insertError } = await db.from('missions').insert(missionRows);
  if (insertError) {
    return { errors: { _form: [insertError.message] } };
  }

  const { error: updateError } = await db
    .from('campaigns')
    .update({ campaign_phase_state: 'AWAITING_MISSION_SELECTION' })
    .eq('id', campaign_id);

  if (updateError) {
    return { errors: { _form: [updateError.message] } };
  }

  await logCampaignAction({
    campaignId: campaign_id,
    phaseNumber: campaign.phase_number,
    step: 'AWAITING_MISSION_GENERATION',
    role: 'GM',
    actionType: 'MISSION_GENERATION_COMPLETE',
    details: { mission_count: missionRows.length, mission_names: missionRows.map((m) => m.name) },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/gm');
  revalidatePath('/dashboard/commander');
  return { success: true };
}
