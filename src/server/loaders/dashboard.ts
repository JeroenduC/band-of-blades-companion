/**
 * Dashboard data loader — shared by all six role dashboard pages.
 *
 * Fetches the authenticated user, their campaign membership, and the
 * current campaign state in one place. All dashboard pages call this
 * and redirect to /sign-in if the user is not authenticated.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import {
  Campaign, CampaignMembership, LegionRole, BackAtCampScene, MoraleLevel,
  Alchemist, Mercy, Laborers, LongTermProject, SiegeWeapon, RecruitPool,
  Specialist, Squad, SquadMember, Mission, Spy, SpyNetwork, SpyLongTermAssignment,
  AnnalsEntry, CampaignPhaseLog, Session,
} from '@/lib/types';

export interface DashboardData {
  userId: string;
  campaign: Campaign;
  membership: CampaignMembership & { role: LegionRole };
}

/**
 * Load the dashboard data for a given role.
 *
 * Redirects to /sign-in if not authenticated.
 * Redirects to /dashboard if the user has no membership for this role.
 *
 * @param role - The role to load the dashboard for. Pass null for GM.
 */
export async function loadDashboard(role: LegionRole): Promise<DashboardData> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  // Find the membership for this role (PRIMARY or DEPUTY)
  const { data: membership } = await db
    .from('campaign_memberships')
    .select(`
      id,
      user_id,
      campaign_id,
      role,
      rank,
      assigned_at,
      campaigns (
        id, name, invite_code, current_phase, campaign_phase_state,
        phase_number, morale, pressure, intel, supply,
        time_clock_1, time_clock_2, time_clock_3,
        food_uses, horse_uses, black_shot_uses,
        religious_supply_uses, supply_carts,
        qm_actions_complete, spymaster_actions_complete,
        current_location, created_at
      )
    `)
    .eq('user_id', user.id)
    .eq('role', role)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.campaigns) redirect('/dashboard');

  return {
    userId: user.id,
    campaign: membership.campaigns as unknown as Campaign,
    membership: membership as unknown as CampaignMembership & { role: LegionRole },
  };
}

/**
 * Returns the morale level bucket for Back at Camp scene filtering.
 * BoB rulebook: High 8+, Medium 4–7, Low 0–3
 */
function moraleToLevel(morale: number): MoraleLevel {
  if (morale >= 8) return 'HIGH';
  if (morale >= 4) return 'MEDIUM';
  return 'LOW';
}

/**
 * Fetches Back at Camp scenes for a campaign, filtered by morale level.
 *
 * Returns scenes at the current morale level first. If none are available
 * (all used), falls back to the next level down. Used scenes are included
 * in the result so they can be shown as crossed off.
 */
export async function loadBackAtCampScenes(
  campaignId: string,
  morale: number,
): Promise<{ scenes: BackAtCampScene[]; activeLevel: MoraleLevel; fallback: boolean }> {
  const db = createServiceClient();
  const level = moraleToLevel(morale);

  const { data: allScenes } = await db
    .from('back_at_camp_scenes')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('id'); // stable order

  const scenes = (allScenes ?? []) as BackAtCampScene[];

  // Try current morale level — if all used, fall back to lower levels
  const levelOrder: MoraleLevel[] =
    level === 'HIGH' ? ['HIGH', 'MEDIUM', 'LOW']
    : level === 'MEDIUM' ? ['MEDIUM', 'LOW']
    : ['LOW'];

  for (const l of levelOrder) {
    const available = scenes.filter((s) => s.morale_level === l && s.times_used < s.max_uses);
    if (available.length > 0) {
      const levelScenes = scenes.filter((s) => s.morale_level === l);
      return { scenes: levelScenes, activeLevel: l, fallback: l !== level };
    }
  }

  // All scenes exhausted — return whatever level we have
  return { scenes: scenes.filter((s) => s.morale_level === level), activeLevel: level, fallback: false };
}

// ─── QM Materiel ─────────────────────────────────────────────────────────────

export interface QmMaterielData {
  alchemists: Alchemist[];
  mercies: Mercy[];
  laborers: Laborers | null;
  longTermProjects: LongTermProject[];
  siegeWeapons: SiegeWeapon[];
  recruitPool: RecruitPool[];
  /** Asset types already acquired this phase (to grey out duplicates) */
  acquiredAssetTypes: string[];
}

/**
 * Load all QM materiel for a campaign.
 * Called from the Quartermaster dashboard page alongside loadDashboard.
 */
export async function loadQmMateriel(campaignId: string, phaseNumber: number): Promise<QmMaterielData> {
  const db = createServiceClient();

  const [
    { data: alchemists },
    { data: mercies },
    { data: laborers },
    { data: longTermProjects },
    { data: siegeWeapons },
    { data: recruitPool },
    { data: acquiredLog },
  ] = await Promise.all([
    db.from('alchemists').select('*').eq('campaign_id', campaignId).order('created_at'),
    db.from('mercies').select('*').eq('campaign_id', campaignId).order('created_at'),
    db.from('laborers').select('*').eq('campaign_id', campaignId).maybeSingle(),
    db.from('long_term_projects').select('*').eq('campaign_id', campaignId).order('created_at'),
    db.from('siege_weapons').select('*').eq('campaign_id', campaignId).order('created_at'),
    db.from('recruit_pool').select('*').eq('campaign_id', campaignId).eq('phase_number', phaseNumber).order('created_at'),
    db.from('campaign_phase_log').select('details').eq('campaign_id', campaignId).eq('phase_number', phaseNumber).eq('action_type', 'ACQUIRE_ASSETS'),
  ]);

  const acquiredAssetTypes = (acquiredLog ?? []).map(
    (row) => (row.details as Record<string, unknown>).asset_type as string,
  );

  return {
    alchemists: (alchemists ?? []) as Alchemist[],
    mercies: (mercies ?? []) as Mercy[],
    laborers: laborers as Laborers | null,
    longTermProjects: (longTermProjects ?? []) as LongTermProject[],
    siegeWeapons: (siegeWeapons ?? []) as SiegeWeapon[],
    recruitPool: (recruitPool ?? []) as RecruitPool[],
    acquiredAssetTypes,
  };
}

// ─── Spymaster Data ──────────────────────────────────────────────────────────

export interface SpymasterData {
  spies: Spy[];
  network: SpyNetwork | null;
  longTermAssignments: SpyLongTermAssignment[];
  maxSpies: number;
}

/**
 * Load all spy data for the Spymaster.
 */
export async function loadSpyData(campaignId: string): Promise<SpymasterData> {
  const db = createServiceClient();

  const [
    { data: spies },
    { data: network },
    { data: ltas },
  ] = await Promise.all([
    db.from('spies').select('*').eq('campaign_id', campaignId).order('created_at'),
    db.from('spy_networks').select('*').eq('campaign_id', campaignId).maybeSingle(),
    db.from('spy_long_term_assignments').select('*').eq('campaign_id', campaignId).order('created_at'),
  ]);

  const spyList = (spies ?? []) as Spy[];
  const net = network as SpyNetwork | null;
  const longTermAssignments = (ltas ?? []) as SpyLongTermAssignment[];

  const hasAcquisition = net?.upgrades.includes('Acquisition') ?? false;
  const maxSpies = hasAcquisition ? 3 : 2;

  return {
    spies: spyList,
    network: net,
    longTermAssignments,
    maxSpies,
  };
}

// ─── Lorekeeper Data ─────────────────────────────────────────────────────────

export interface FallenLegionnaire {
  id: string;
  name: string;
  rank: 'ROOKIE' | 'SOLDIER' | 'SPECIALIST';
  squad_name: string | null;
  cause_of_death: string | null;
  phase_number: number | null;
  died_at: string;
}

export interface LorekeeperData {
  fallen: FallenLegionnaire[];
  annals: AnnalsEntry[];
  missions: Mission[];
  logs: CampaignPhaseLog[];
  totalFallen: number;
}

/**
 * Load all data for the Lorekeeper.
 */
export async function loadLorekeeperData(campaignId: string): Promise<LorekeeperData> {
  const db = createServiceClient();

  // Fetch dead specialists and squad members
  const [
    { data: deadSpecialists },
    { data: deadSquadMembers },
    { data: squads },
    { data: annals },
    { data: missions },
    { data: logs },
  ] = await Promise.all([
    db.from('specialists').select('*').eq('campaign_id', campaignId).eq('status', 'DEAD'),
    db.from('squad_members').select('*, squads(name, campaign_id)').eq('status', 'DEAD'),
    db.from('squads').select('id, name').eq('campaign_id', campaignId),
    db.from('annals_entries').select('*').eq('campaign_id', campaignId).order('phase_number', { ascending: false }),
    db.from('missions').select('*').eq('campaign_id', campaignId).order('phase_number', { ascending: false }),
    db.from('campaign_phase_log').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false }),
  ]);

  const fallen: FallenLegionnaire[] = [];

  // Map specialists
  (deadSpecialists ?? []).forEach((s: any) => {
    fallen.push({
      id: s.id,
      name: s.name,
      rank: 'SPECIALIST',
      squad_name: 'Specialist',
      cause_of_death: null,
      phase_number: null,
      died_at: s.created_at,
    });
  });

  // Map squad members
  (deadSquadMembers ?? []).forEach((m: any) => {
    // Only include if the squad belongs to this campaign
    const squad = squads?.find(s => s.id === m.squad_id);
    if (squad) {
      fallen.push({
        id: m.id,
        name: m.name,
        rank: m.rank,
        squad_name: squad.name,
        cause_of_death: null,
        phase_number: null,
        died_at: m.created_at,
      });
    }
  });

  // Sort by death date (newest first)
  fallen.sort((a, b) => new Date(b.died_at).getTime() - new Date(a.died_at).getTime());

  return {
    fallen,
    annals: (annals ?? []) as AnnalsEntry[],
    missions: (missions ?? []) as Mission[],
    logs: (logs ?? []) as CampaignPhaseLog[],
    totalFallen: fallen.length,
  };
}

// ─── Marshal Personnel ───────────────────────────────────────────────────────

export interface MarshalPersonnelData {
  specialists: Specialist[];
  squads: (Squad & { members: SquadMember[] })[];
  unassignedRecruits: { rookies: number; soldiers: number };
  totalLegionnaires: number;
  totalSpecialists: number;
  totalSquads: number;
}

/**
 * Load all personnel data for the Marshal.
 */
export async function loadMarshalPersonnel(campaignId: string): Promise<MarshalPersonnelData> {
  const db = createServiceClient();

  const [
    { data: specialists },
    { data: squads },
    { data: unassignedRecruits },
  ] = await Promise.all([
    db.from('specialists').select('*').eq('campaign_id', campaignId).order('name'),
    db.from('squads').select('*, squad_members(*)').eq('campaign_id', campaignId).order('name'),
    db.from('recruit_pool').select('rookies, soldiers').eq('campaign_id', campaignId).eq('assigned', false),
  ]);

  const specs = (specialists ?? []) as Specialist[];
  const sqds = (squads ?? []) as (Squad & { squad_members: SquadMember[] })[];

  // Map squad_members to members to match our interface
  const formattedSquads = sqds.map(s => ({
    ...s,
    members: s.squad_members || []
  }));

  const livingSpecialists = specs.filter(s => s.status !== 'DEAD' && s.status !== 'RETIRED').length;
  const livingSquadMembers = formattedSquads.reduce((acc, s) =>
    acc + s.members.filter(m => m.status !== 'DEAD').length, 0
  );

  const unassignedRookies = (unassignedRecruits ?? []).reduce((acc, r) => acc + (r.rookies || 0), 0);
  const unassignedSoldiers = (unassignedRecruits ?? []).reduce((acc, r) => acc + (r.soldiers || 0), 0);

  return {
    specialists: specs,
    squads: formattedSquads,
    unassignedRecruits: { rookies: unassignedRookies, soldiers: unassignedSoldiers },
    totalLegionnaires: livingSquadMembers + unassignedRookies + unassignedSoldiers + livingSpecialists,
    totalSpecialists: livingSpecialists,
    totalSquads: formattedSquads.length,
  };
}

/**
 * Load all missions for a campaign phase.
 */
export async function loadMissions(campaignId: string, phaseNumber: number): Promise<Mission[]> {
  const db = createServiceClient();
  const { data: missions } = await db
    .from('missions')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('phase_number', phaseNumber);

  return (missions ?? []) as Mission[];
}

/**
 * Load all sessions for a campaign.
 */
export async function loadSessions(campaignId: string): Promise<Session[]> {
  const db = createServiceClient();
  const { data: sessions } = await db
    .from('sessions')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('session_number', { ascending: false });

  return (sessions ?? []) as Session[];
}

/**
 * GM-specific loader — the GM is identified by role = 'GM' and rank = 'PRIMARY'.
 */
export async function loadGmDashboard(): Promise<DashboardData> {
  const supabase = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: membership } = await db
    .from('campaign_memberships')
    .select(`
      id,
      user_id,
      campaign_id,
      role,
      rank,
      assigned_at,
      campaigns (
        id, name, invite_code, current_phase, campaign_phase_state,
        phase_number, morale, pressure, intel, supply,
        time_clock_1, time_clock_2, time_clock_3,
        food_uses, horse_uses, black_shot_uses,
        religious_supply_uses, supply_carts,
        qm_actions_complete, spymaster_actions_complete,
        current_location, created_at
      )
    `)
    .eq('user_id', user.id)
    .eq('role', 'GM')
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.campaigns) redirect('/dashboard');

  return {
    userId: user.id,
    campaign: membership.campaigns as unknown as Campaign,
    membership: membership as unknown as CampaignMembership & { role: LegionRole },
  };
}
