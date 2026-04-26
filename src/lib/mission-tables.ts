import { type MissionType } from './types';

export interface MissionTableResult {
  text: string;
  rewards?: Record<string, number>;
  penalties?: Record<string, number>;
  threat_level?: number;
  special_requirement?: string;
  has_favor?: boolean;
}

export const MISSION_COUNT_TABLE: Record<number, { count: number; note?: string; specialist?: boolean; favor?: boolean }> = {
  1: { count: 3 },
  2: { count: 3 },
  3: { count: 3, note: 'One mission requires +1 Specialist', specialist: true },
  4: { count: 2 },
  5: { count: 3, note: 'One mission has Favor', favor: true },
  6: { count: 3, note: 'One Special Mission' },
};

export const MISSION_TYPE_TABLE: Record<number, MissionType | 'FOCUS' | 'CHOICE'> = {
  1: 'ASSAULT',
  2: 'RECON',
  3: 'RELIGIOUS',
  4: 'SUPPLY',
  5: 'FOCUS',
  6: 'CHOICE',
};

export const ASSAULT_TABLE = {
  type: {
    1: 'People',
    2: 'The Wild',
    3: 'Undead',
    4: 'Undead',
    5: 'Powerful Undead',
    6: 'Powerful Undead',
  },
  rewards: {
    1: { morale: 2 },
    2: { morale: 3 },
    3: { morale: 4 },
    4: { morale: 2, supply: 1 },
    5: { morale: 2, intel: 1 },
    6: { morale: 2, time: -1 }, // Time is stored as "saved", so -1 means 1 time saved? 
                                // Actually BoB says "-1 Time" usually means saving time.
                                // In our system reward_time is "time saved".
  },
  penalties: {
    1: { pressure: 1, time: 1 },
    2: { time: 1 },
    3: { supply: -1 },
    4: { pressure: 1 },
    5: { pressure: 1 },
    6: { pressure: 1 },
  }
};

export const RECON_TABLE = {
  type: {
    1: 'Area Recon',
    2: 'Route Recon',
    3: 'Troop Recon',
    4: 'Infiltration',
    5: 'Exfiltration',
    6: 'Pick above + Danger',
  },
  rewards: {
    1: { intel: 2 },
    2: { intel: 2 },
    3: { intel: 1, asset: 1 }, // "Asset +1 Intel"
    4: { intel: 1, asset: 1 }, // "Asset or Troops +1 Intel"
    5: { intel: 1, time: -1 },
    6: { intel: 3 },
  },
  penalties: {
    1: { time: 1 },
    2: { deaths: 2 },
    3: { deaths: 1 },
    4: { pressure: 1 },
    5: { pressure: 1 },
    6: {}, // None
  }
};

export const RELIGIOUS_TABLE = {
  type: {
    1: 'Escort',
    2: 'Cleansing',
    3: 'Defense',
    4: 'Unearth',
    5: 'Pick above + Favor',
    6: 'Pick above + Favor',
  },
  rewards: {
    1: { time: -1, xp: 2 },
    2: { morale: 2, points: 10 },
    3: { intel: 1, morale: 2 },
    4: { asset_quality: 'FINE' },
    5: { asset_quality: 'EXCEPTIONAL' },
    6: { specialist: 1 },
  },
  penalties: {
    1: { morale: -1, pressure: 1 },
    2: { pressure: 1 },
    3: { pressure: 1 },
    4: { morale: -1 },
    5: { morale: -1 },
    6: {}, // None
  }
};

export const SUPPLY_TABLE = {
  type: {
    1: 'Scrounge or Trade',
    2: 'Scrounge or Trade',
    3: 'Rescue Supplies',
    4: 'Rescue Supplies',
    5: 'Mercenary Work',
    6: 'Mercenary Work',
  },
  rewards: {
    1: { supply: 1, asset: 1 },
    2: { supply: 1, asset: 1 },
    3: { supply: 2 },
    4: { supply: 2, asset: 1 },
    5: { supply: 3 },
    6: { supply: 3 },
  },
  penalties: {
    1: { morale: -1, supply: -1 },
    2: { supply: -1 },
    3: { morale: -1 },
    4: { morale: -1 },
    5: {}, // None
    6: {}, // None
  }
};

export const FAVOR_TABLE: Record<number, string> = {
  1: 'Holy',
  2: 'Mystic',
  3: 'Glory',
  4: 'Knowledge',
  5: 'Mercy',
  6: 'Wild',
};

export const SPECIALIST_REQ_TABLE: Record<number, string> = {
  1: 'Heavy',
  2: 'Medic',
  3: 'Scout',
  4: 'Sniper',
  5: 'Officer',
  6: 'Alchemist or Mercy',
};
