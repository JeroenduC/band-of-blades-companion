export type LegionRole =
  | 'GM'
  | 'COMMANDER'
  | 'MARSHAL'
  | 'QUARTERMASTER'
  | 'LOREKEEPER'
  | 'SPYMASTER'
  | 'SOLDIER';

export type MemberRank = 'PRIMARY' | 'DEPUTY';

export type CampaignPhase = 'MISSION' | 'CAMPAIGN';

export type CampaignPhaseState =
  | 'AWAITING_MISSION_RESOLUTION'
  | 'AWAITING_PERSONNEL_UPDATE'
  | 'AWAITING_BACK_AT_CAMP'
  | 'AWAITING_TALES'
  | 'TIME_PASSING'
  | 'CAMPAIGN_ACTIONS'
  | 'AWAITING_LABORERS_ALCHEMISTS'
  | 'AWAITING_ADVANCE'
  | 'AWAITING_MISSION_FOCUS'
  | 'AWAITING_MISSION_GENERATION'
  | 'AWAITING_MISSION_SELECTION'
  | 'AWAITING_MISSION_DEPLOYMENT'
  | 'PHASE_COMPLETE';

export type SessionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETE';

export interface Profile {
  id: string;
  display_name: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  invite_code: string;
  current_phase: CampaignPhase;
  campaign_phase_state: CampaignPhaseState | null;
  phase_number: number;
  morale: number;
  pressure: number;
  intel: number;
  supply: number;
  time_clock_1: number;
  time_clock_2: number;
  time_clock_3: number;
  food_uses: number;
  horse_uses: number;
  black_shot_uses: number;
  religious_supply_uses: number;
  supply_carts: number;
  // Sprint 3: parallel action completion flags (reset each phase)
  qm_actions_complete: boolean;
  spymaster_actions_complete: boolean;
  // Sprint 3: current location on the campaign map
  current_location: string;
  // Sprint 9: Broken selection
  chosen_broken: string[];
  // Sprint 8: Lorekeeper tracking
  deaths_since_last_tale: number;
  tales_told: string[]; // List of Tale IDs
  
  // Sprint 8: Tale bonuses for next phase/mission
  next_mission_special?: boolean;
  next_mission_maneuver_bonus?: number;
  next_mission_wreck_bonus?: number;
  next_mission_resist_bonus?: number;
  next_mission_resolve_bonus?: number;
  next_mission_engagement_bonus?: number;
  next_mission_armor_bonus?: number;
  next_mission_no_advance?: boolean;
  
  created_at: string;
}

// ─── Sprint 8: Lorekeeper Tools ──────────────────────────────────────────────

export interface AnnalsEntry {
  id: string;
  campaign_id: string;
  phase_number: number;
  lorekeeper_notes: string;
  created_at: string;
  updated_at: string;
}

// ─── Sprint 9: GM and Broken Tracking ────────────────────────────────────────

export type BrokenName = 'BLIGHTER' | 'BREAKER' | 'RENDER';

export interface BrokenAdvance {
  id: string;
  campaign_id: string;
  broken_name: BrokenName;
  ability_name: string;
  unlocked: boolean;
  unlocked_at_phase: number | null;
  notes: string;
  created_at: string;
}

// ─── Sprint 5: Commander and Missions ────────────────────────────────────────

export type MissionType = 'ASSAULT' | 'RECON' | 'RELIGIOUS' | 'SUPPLY' | 'SPECIAL';
export type MissionStatus = 'GENERATED' | 'PRIMARY' | 'SECONDARY' | 'FAILED';

export interface Mission {
  id: string;
  campaign_id: string;
  phase_number: number;
  name: string;
  type: MissionType;
  objective: string;
  rewards: Record<string, unknown>;
  penalties: Record<string, unknown>;
  threat_level: number;
  status: MissionStatus;
  created_at: string;
}

// ─── Sprint 4: QM materiel and personnel ──────────────────────────────────────

export type AlchemistStatus = 'ACTIVE' | 'CORRUPTED' | 'DEAD';
export type SiegeWeaponStatus = 'AVAILABLE' | 'DEPLOYED' | 'DESTROYED';

export interface LongTermProject {
  id: string;
  campaign_id: string;
  name: string;
  description: string;
  clock_size: number;
  segments_filled: number;
  phase_last_worked: number | null;
  completed_at: string | null;
  created_at: string;
}

export interface Alchemist {
  id: string;
  campaign_id: string;
  name: string;
  corruption: number;
  status: AlchemistStatus;
  created_at: string;
}

export interface Mercy {
  id: string;
  campaign_id: string;
  name: string;
  wounded: boolean;
  created_at: string;
}

export interface Laborers {
  id: string;
  campaign_id: string;
  count: number;
  current_project_id: string | null;
}

export interface SiegeWeapon {
  id: string;
  campaign_id: string;
  name: string;
  status: SiegeWeaponStatus;
  created_at: string;
}

export interface RecruitPool {
  id: string;
  campaign_id: string;
  phase_number: number;
  rookies: number;
  soldiers: number;
  assigned: boolean;
  created_at: string;
}

// ─── Sprint 6: Marshal and Personnel ────────────────────────────────────────

export type SpecialistClass = 'HEAVY' | 'MEDIC' | 'OFFICER' | 'SCOUT' | 'SNIPER';
export type SpecialistStatus = 'AVAILABLE' | 'DEPLOYED' | 'DEAD' | 'RETIRED';
export type SquadRank = 'ROOKIE' | 'SOLDIER';
export type SquadMemberStatus = 'ALIVE' | 'WOUNDED' | 'DEAD';

export interface Specialist {
  id: string;
  campaign_id: string;
  name: string;
  class: SpecialistClass;
  heritage: string;
  stress: number; // 0-9
  harm_level_1_a: string | null;
  harm_level_1_b: string | null;
  harm_level_2_a: string | null;
  harm_level_2_b: string | null;
  harm_level_3: string | null;
  healing_ticks: number;
  xp: number;
  abilities: string[]; // IDs or names of special abilities
  status: SpecialistStatus;
  created_at: string;
}

export interface Squad {
  id: string;
  campaign_id: string;
  name: string;
  motto: string;
  type: 'ROOKIE' | 'SOLDIER' | 'ELITE';
  created_at: string;
}

export interface SquadMember {
  id: string;
  squad_id: string;
  name: string;
  heritage: string;
  rank: SquadRank;
  status: SquadMemberStatus;
  harm: number;
  stress: number;
  xp: number;
  created_at: string;
}

// ─── Sprint 7: Spymaster Tools ───────────────────────────────────────────────

export type SpyStatus = 'AVAILABLE' | 'ON_ASSIGNMENT' | 'WOUNDED' | 'DEAD';
export type SpyRank = 'TRAINED' | 'MASTER';
export type SpyAssignmentType =
  | 'NONE'
  | 'RECOVER'
  | 'INTERROGATE'
  | 'BLACKMAIL'
  | 'HELP'
  | 'AUGMENT'
  | 'EXPAND'
  | 'LAY_TRAP'
  | 'RECRUIT'
  | 'RESEARCH';

export interface Spy {
  id: string;
  campaign_id: string;
  name: string;
  rank: SpyRank;
  status: SpyStatus;
  specialty: string | null;
  current_assignment: SpyAssignmentType;
  assignment_clock: number; // 0-8 (DEPRECATED, using SpyLongTermAssignment)
  last_phase_worked: number;
  long_term_assignment_id: string | null;
  created_at: string;
}

export interface SpyLongTermAssignment {
  id: string;
  campaign_id: string;
  type: 'AUGMENT' | 'EXPAND' | 'LAY_TRAP' | 'RECRUIT' | 'RESEARCH';
  name: string;
  description: string | null;
  clock_segments: number;
  clock_filled: number;
  is_completed: boolean;
  created_at: string;
}

export interface SpyNetwork {
  id: string;
  campaign_id: string;
  upgrades: string[]; // List of unlocked upgrade names
  created_at: string;
}

export type CampaignPhaseLogActionType =
  | 'PHASE_START'
  | 'MISSION_RESOLVED'
  | 'BACK_AT_CAMP_SCENE_SELECTED'
  | 'TIME_PASSED'
  | 'LIBERTY'
  | 'QM_ACTIONS_COMPLETE'
  | 'SPY_DISPATCHED'
  | 'SPYMASTER_ACTIONS_COMPLETE'
  | 'LABORERS_ALCHEMISTS_COMPLETE'
  | 'ADVANCE'
  | 'STAY'
  | 'MISSION_FOCUS_SELECTED'
  | 'MISSION_GENERATION_COMPLETE'
  | 'MISSION_SELECTED'
  | 'PHASE_COMPLETE'
  | 'MEMBER_REMOVED'
  | 'ACQUIRE_ASSETS'
  | 'REST_AND_RECUPERATION'
  | 'RECRUIT'
  | 'LONG_TERM_PROJECT'
  | 'ALCHEMIST_PROJECT'
  | 'LABORER_TICK'
  | 'INTEL_QUESTIONS_SUBMITTED'
  | 'PERSONNEL_DEPLOYED'
  | 'ENGAGEMENT_ROLL'
  | 'PERSONNEL_UPDATED'
  | 'TALE_TOLD'
  | 'GM_OVERRIDE';

export interface CampaignPhaseLog {
  id: string;
  campaign_id: string;
  phase_number: number;
  step: CampaignPhaseState;
  role: LegionRole | 'SYSTEM';
  action_type: CampaignPhaseLogActionType;
  details: Record<string, unknown>;
  created_at: string;
}

export type MoraleLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface BackAtCampScene {
  id: string;
  campaign_id: string;
  scene_text: string;
  morale_level: MoraleLevel;
  used: boolean;
  used_in_phase: number | null;
  max_uses: number;
  times_used: number;
}

export interface CampaignMembership {
  id: string;
  user_id: string;
  campaign_id: string;
  // Null until the GM assigns a role. Players join as pending members.
  role: LegionRole | null;
  rank: MemberRank | null;
  assigned_at: string;
}

export interface CampaignMembershipWithProfile extends CampaignMembership {
  profiles: Pick<Profile, 'display_name'>;
}

export interface Session {
  id: string;
  campaign_id: string;
  session_number: number;
  title: string | null;
  date: string | null;
  status: SessionStatus;
  prep_notes: string | null;
  post_notes: string | null;
  linked_phases: number[];
  phase_number: number | null; // DEPRECATED by linked_phases
  created_at: string;
}
