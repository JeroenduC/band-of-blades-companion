import { CampaignPhaseLogActionType } from './types';

export interface TaleBenefit {
  id: string;
  label: string;
  description: string;
  mechanical_effect: string;
  // This helps the server action know what to apply
  effect_type: 
    | 'SPECIALIST_XP' 
    | 'SPECIAL_MISSION' 
    | 'MORALE_GAIN' 
    | 'SPECIALIST_HEAL' 
    | 'REDUCE_CORRUPTION' 
    | 'LTP_TICKS' 
    | 'REMOVE_PRESSURE_NO_ADVANCE' 
    | 'NEXT_MISSION_MANEUVER' 
    | 'NEXT_MISSION_WRECK' 
    | 'CHOSEN_FAVOR' 
    | 'NEXT_MISSION_RESIST' 
    | 'NEXT_MISSION_RESOLVE' 
    | 'PROMOTE_ROOKIE' 
    | 'NEXT_MISSION_ENGAGEMENT' 
    | 'NEXT_MISSION_ARMOR';
  value: number;
}

export interface Tale {
  id: string;
  title: string;
  prompts: string[];
  benefits: TaleBenefit[];
}

export const TALES: Tale[] = [
  {
    id: 'tale-founding',
    title: "Tale of the Legion's Founding",
    prompts: [
      "Who was the first Commander? First Legionnaire? First Lorekeeper?",
      "How is that person remembered?",
      "What dangerous threat was the Legion formed to face?"
    ],
    benefits: [
      {
        id: 'founding-xp',
        label: "The Legionnaires learn a lesson",
        description: "Old stories hold kernels of tactical wisdom.",
        mechanical_effect: "All Specialists may place 1 xp in any category.",
        effect_type: 'SPECIALIST_XP',
        value: 1
      },
      {
        id: 'founding-mission',
        label: "The Legion seeks glory of yesteryear",
        description: "We are reminded of our original purpose.",
        mechanical_effect: "Next missions include a special mission.",
        effect_type: 'SPECIAL_MISSION',
        value: 1
      },
      {
        id: 'founding-morale',
        label: "The histories raise morale",
        description: "A sense of continuity brings comfort.",
        mechanical_effect: "Legion gains +2 morale.",
        effect_type: 'MORALE_GAIN',
        value: 2
      }
    ]
  },
  {
    id: 'tale-independence',
    title: "Tale of the Legion's Independence",
    prompts: [
      "Where is the original charter stored?",
      "What unusual restrictions are placed on Legionnaires?",
      "What cause has the Legion taken up previously?"
    ],
    benefits: [
      {
        id: 'indep-heal',
        label: "Legionnaires shrug off wounds",
        description: "The memory of the charter's oath hardens the spirit.",
        mechanical_effect: "All Specialists mark one free healing tick.",
        effect_type: 'SPECIALIST_HEAL',
        value: 1
      },
      {
        id: 'indep-corruption',
        label: "The Legion purifies hearts and minds",
        description: "Independence means freedom from the Broken's taint.",
        mechanical_effect: "All Legionnaires reduce corruption by 2.",
        effect_type: 'REDUCE_CORRUPTION',
        value: 2
      },
      {
        id: 'indep-ltp',
        label: "Soldiers work extra shifts",
        description: "Free of masters, the Legion works for itself.",
        mechanical_effect: "Add three ticks to a Long-Term Project.",
        effect_type: 'LTP_TICKS',
        value: 3
      }
    ]
  },
  {
    id: 'tale-hardening',
    title: "Tale of Hardening in Battle",
    prompts: [
      "What terrible power did this threat wield?",
      "How was the weakness found?",
      "At what cost did the Legion overcome?"
    ],
    benefits: [
      {
        id: 'hard-dig-in',
        label: "The Legion digs in",
        description: "Defensive positions are reinforced with historical knowledge.",
        mechanical_effect: "Remove 1 pressure, but Commander may not advance next phase.",
        effect_type: 'REMOVE_PRESSURE_NO_ADVANCE',
        value: 1
      },
      {
        id: 'hard-maneuver',
        label: "Soldiers prepare to fight swiftly",
        description: "The fast-strike tactics of old are drilled.",
        mechanical_effect: "Next mission, all Specialists +1d to maneuver rolls.",
        effect_type: 'NEXT_MISSION_MANEUVER',
        value: 1
      },
      {
        id: 'hard-wreck',
        label: "Soldiers prepare their strongest weapons",
        description: "Siege-lore of the past is applied to current arms.",
        mechanical_effect: "Next mission, all Specialists +1d to wreck rolls.",
        effect_type: 'NEXT_MISSION_WRECK',
        value: 1
      }
    ]
  },
  {
    id: 'tale-unyielding',
    title: "Tale of the Legion's Unyielding Will",
    prompts: [
      "Which previous Chosen did the Legion fight beside?",
      "Against which supernatural threat?",
      "How many survived and how did they rebuild?"
    ],
    benefits: [
      {
        id: 'will-favor',
        label: "Your Chosen is moved",
        description: "The Chosen hears the history and is inspired.",
        mechanical_effect: "Chosen gains 1 favor.",
        effect_type: 'CHOSEN_FAVOR',
        value: 1
      },
      {
        id: 'will-resist',
        label: "Never give up",
        description: "The Legion's stubbornness is legendary.",
        mechanical_effect: "Next mission, all Legionnaires +1d to all resistance rolls.",
        effect_type: 'NEXT_MISSION_RESIST',
        value: 1
      },
      {
        id: 'will-resolve',
        label: "Soldiers prepare to face the unholy",
        description: "Ancient chants and mantras bolster the mind.",
        mechanical_effect: "Next mission, all Legionnaires +2d to resolve resists.",
        effect_type: 'NEXT_MISSION_RESOLVE',
        value: 2
      }
    ]
  },
  {
    id: 'tale-meaning',
    title: "Tale of the Legion's Meaning",
    prompts: [
      "How do civilians treat the Legion differently?",
      "How are new recruits inducted?",
      "What oath must all Legionnaires speak?"
    ],
    benefits: [
      {
        id: 'mean-promote',
        label: "The Legion promotes an exemplar",
        description: "One who embodies the Legion's meaning is raised up.",
        mechanical_effect: "Promote a Rookie to Soldier.",
        effect_type: 'PROMOTE_ROOKIE',
        value: 1
      },
      {
        id: 'mean-engagement',
        label: "Legionnaires remember why they fight",
        description: "Purpose brings focus to initial deployment.",
        mechanical_effect: "One mission next session +2d engagement roll.",
        effect_type: 'NEXT_MISSION_ENGAGEMENT',
        value: 2
      },
      {
        id: 'mean-armor',
        label: "Soldiers protect each other",
        description: "The bond of the Legion is the strongest shield.",
        mechanical_effect: "Next primary mission, each Specialist gets 1 special armor.",
        effect_type: 'NEXT_MISSION_ARMOR',
        value: 1
      }
    ]
  }
];

export function getNextTale(talesToldIds: string[]): Tale {
  // If we haven't told all 5 yet, they must be in order
  for (const tale of TALES) {
    if (!talesToldIds.includes(tale.id)) {
      return tale;
    }
  }
  
  // If all told once, Lorekeeper can choose? 
  // Requirement says: "After all told once: free choice"
  // For now, let's just return the first one as default if we need to pick "the next one" 
  // but the UI should probably allow choice in that state.
  return TALES[0]; 
}
