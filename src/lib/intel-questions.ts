/**
 * Intel question lists for the Commander's pre-mission briefing.
 *
 * Source: Band of Blades rulebook, pages 122-123.
 *
 * The Commander may ask one question from each unlocked tier based on the
 * Legion's current Intel resource. Tier 0 is always available; higher tiers
 * require the corresponding Intel level.
 *
 * Questions are recorded in the CampaignPhaseLog — the GM answers them
 * verbally during the actual play session, not through the app.
 */

export interface IntelQuestion {
  id: string;
  text: string;
}

export interface IntelTier {
  /** Minimum intel required to unlock this tier (0 = always available) */
  minIntel: number;
  label: string;
  questions: IntelQuestion[];
}

export const INTEL_TIERS: IntelTier[] = [
  {
    minIntel: 0,
    label: 'Free Intel',
    questions: [
      { id: 'q0_1', text: "What's the highest threat on this mission?" },
      { id: 'q0_2', text: "How much travel is involved?" },
      { id: 'q0_3', text: "What's useful to bring along?" },
      { id: 'q0_4', text: "Who is invested in the outcome?" },
      { id: 'q0_5', text: "What's a key challenge we'll face?" },
    ],
  },
  {
    minIntel: 1,
    label: '1 Intel',
    questions: [
      { id: 'q1_1', text: "What would be especially useful to bring?" },
      { id: 'q1_2', text: "What are two possible approaches?" },
      { id: 'q1_3', text: "Which squads distrust Legion leadership?" },
      { id: 'q1_4', text: "How does our Chosen feel about this mission?" },
      { id: 'q1_5', text: "Which of the Broken's troops will we face?" },
    ],
  },
  {
    minIntel: 2,
    label: '2 Intel',
    questions: [
      { id: 'q2_1', text: "Which Infamous or Lieutenant is involved?" },
      { id: 'q2_2', text: "What is the main weakness of the undead position?" },
      { id: 'q2_3', text: "Is this related to a previous mission?" },
      { id: 'q2_4', text: "Which way are the Broken currently moving?" },
      { id: 'q2_5', text: "What challenges await at a location ahead?" },
      { id: 'q2_6', text: "What is the weakness of a relevant Infamous?" },
    ],
  },
  {
    minIntel: 3,
    label: '3 Intel',
    questions: [
      { id: 'q3_1', text: "What is the weakness of the Lieutenant?" },
      { id: 'q3_2', text: "What does the Lieutenant crave?" },
      { id: 'q3_3', text: "What is a Broken researching or planning?" },
      { id: 'q3_4', text: "Are there special missions at a location ahead?" },
      { id: 'q3_5', text: "What news is there of the Cinder King?" },
    ],
  },
];

/** Returns the tiers unlocked for a given intel value. */
export function getUnlockedTiers(intel: number): IntelTier[] {
  return INTEL_TIERS.filter((t) => t.minIntel <= intel);
}
