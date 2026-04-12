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
  campaign_phase_state: CampaignPhaseState;
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
  created_at: string;
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
