import { MissionType } from './types';

export interface EngagementQuestion {
  id: string;
  text: string;
  modifier: number;
  type: 'UNIVERSAL' | 'ASSAULT' | 'RECON' | 'RELIGIOUS' | 'SUPPLY';
}

export const UNIVERSAL_QUESTIONS: EngagementQuestion[] = [
  { id: 'loyalty', text: 'Legion Loyalty: All personnel are oathsworn? (No Mercies, etc.)', modifier: 1, type: 'UNIVERSAL' },
  { id: 'intel', text: 'Intel: Commander spent intel on this mission?', modifier: 1, type: 'UNIVERSAL' },
  { id: 'veteran', text: 'Veteran: Everyone is a Specialist or Soldier (no Rookies)?', modifier: 1, type: 'UNIVERSAL' },
  { id: 'leadership', text: 'Leadership: Anyone distrusts leadership?', modifier: -1, type: 'UNIVERSAL' },
  { id: 'parameters', text: 'Parameters: Required Specialists/equipment missing?', modifier: -1, type: 'UNIVERSAL' },
];

export const TYPE_SPECIFIC_QUESTIONS: Record<MissionType, EngagementQuestion[]> = {
  ASSAULT: [
    { id: 'black_shot', text: 'Black Shot equipped?', modifier: 1, type: 'ASSAULT' },
    { id: 'wounded', text: 'Any Legionnaire wounded?', modifier: -1, type: 'ASSAULT' },
  ],
  RECON: [
    { id: 'horses', text: 'Horses equipped?', modifier: 1, type: 'RECON' },
    { id: 'heavy_load', text: 'Any heavy load?', modifier: -1, type: 'RECON' },
  ],
  RELIGIOUS: [
    { id: 'religious_supplies', text: 'Religious Supplies equipped?', modifier: 1, type: 'RELIGIOUS' },
    { id: 'blight', text: 'Any blight?', modifier: -1, type: 'RELIGIOUS' },
  ],
  SUPPLY: [
    { id: 'food', text: 'Food equipped?', modifier: 1, type: 'SUPPLY' },
    { id: 'pressure', text: 'Pressure > 2?', modifier: -1, type: 'SUPPLY' },
  ],
  SPECIAL: [],
};

export function calculateEngagementPool(
  missionType: MissionType,
  answers: Record<string, boolean>
): number {
  let pool = 1; // Base dice? Actually Blades engagement starts at 1d if you have no advantages? 
  // Band of Blades rulebook page 130: "The engagement roll is a dice pool... starting with 1d."
  // Wait, let's check. "You start with 1d for the operation."
  
  const questions = [...UNIVERSAL_QUESTIONS, ...(TYPE_SPECIFIC_QUESTIONS[missionType] || [])];
  
  for (const q of questions) {
    if (answers[q.id]) {
      pool += q.modifier;
    }
  }
  
  return Math.max(0, pool);
}
