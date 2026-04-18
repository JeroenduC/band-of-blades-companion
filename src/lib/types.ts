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
  | 'AWAITING_BACK_AT_CAMP'
  | 'TIME_PASSING'
  | 'CAMPAIGN_ACTIONS'
  | 'AWAITING_LABORERS_ALCHEMISTS'
  | 'AWAITING_ADVANCE'
  | 'AWAITING_MISSION_FOCUS'
  | 'AWAITING_MISSION_GENERATION'
  | 'AWAITING_MISSION_SELECTION'
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

export type CampaignPhaseLogActionType =
  | 'PHASE_START'
  | 'MISSION_RESOLVED'
  | 'BACK_AT_CAMP_SCENE_SELECTED'
  | 'TIME_PASSED'
  | 'LIBERTY'
  | 'QM_ACTIONS_COMPLETE'
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
  | 'LABORER_TICK';

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
  date: string | null;
  status: SessionStatus;
  prep_notes: string | null;
  post_notes: string | null;
  phase_number: number | null;
  created_at: string;
}
