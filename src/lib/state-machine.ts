/**
 * Campaign phase finite state machine.
 *
 * The campaign phase always progresses through a defined sequence of steps.
 * This module is the single source of truth for which states exist and which
 * transitions are legal. All state changes must go through `transitionState()`
 * in src/server/actions/campaign-phase.ts — never update campaign_phase_state
 * directly from client code.
 *
 * State sequence (linear except CAMPAIGN_ACTIONS which is parallel):
 *
 *   null / PHASE_COMPLETE
 *     → AWAITING_MISSION_RESOLUTION   (GM starts phase)
 *     → AWAITING_BACK_AT_CAMP         (GM resolves missions)
 *     → TIME_PASSING                  (Lorekeeper/GM sets scene)
 *     → CAMPAIGN_ACTIONS              (Commander confirms time; QM + Spymaster act in parallel)
 *     → AWAITING_LABORERS_ALCHEMISTS  (both QM and Spymaster mark complete)
 *     → AWAITING_ADVANCE              (QM/Lorekeeper complete laborers step)
 *     → AWAITING_MISSION_FOCUS        (Commander decides advance/stay)
 *     → AWAITING_MISSION_GENERATION   (Commander picks mission type)
 *     → AWAITING_MISSION_SELECTION    (GM generates missions)
 *     → PHASE_COMPLETE                (Commander + Marshal select mission)
 */

import type { CampaignPhaseState, LegionRole } from './types';

// ─── State metadata ───────────────────────────────────────────────────────────

export interface PhaseStep {
  /** The FSM state this step corresponds to */
  state: CampaignPhaseState;
  /** Display label shown in the progress indicator */
  label: string;
  /** Short description of what happens at this step */
  description: string;
  /** Which role(s) act at this step. Multiple roles = parallel. */
  roles: LegionRole[];
  /** Step number (1-based) for display */
  stepNumber: number;
}

export const PHASE_STEPS: PhaseStep[] = [
  {
    state: 'AWAITING_MISSION_RESOLUTION',
    label: 'Mission Resolution',
    description: 'GM records mission outcomes and rewards.',
    roles: ['GM'],
    stepNumber: 1,
  },
  {
    state: 'AWAITING_PERSONNEL_UPDATE',
    label: 'Personnel Update',
    description: 'The Marshal records casualties and XP from the missions.',
    roles: ['MARSHAL'],
    stepNumber: 2,
  },
  {
    state: 'AWAITING_BACK_AT_CAMP',
    label: 'Back at Camp',
    description: 'A scene is set reflecting the Legion\'s current morale.',
    roles: ['LOREKEEPER', 'GM'],
    stepNumber: 3,
  },
  {
    state: 'AWAITING_TALES',
    label: 'Tales of the Legion',
    description: 'The Lorekeeper recounts the history of the Legion.',
    roles: ['LOREKEEPER', 'GM'],
    stepNumber: 4,
  },
  {
    state: 'TIME_PASSING',
    label: 'Time Passes',
    description: 'Time and pressure advance. The Legion consumes food.',
    roles: ['COMMANDER'],
    stepNumber: 5,
  },
  {
    state: 'CAMPAIGN_ACTIONS',
    label: 'Campaign Actions',
    description: 'The Quartermaster and Spymaster act simultaneously.',
    roles: ['QUARTERMASTER', 'SPYMASTER'],
    stepNumber: 6,
  },
  {
    state: 'AWAITING_LABORERS_ALCHEMISTS',
    label: 'Laborers & Alchemists',
    description: 'The Quartermaster assigns laborers and alchemists.',
    roles: ['QUARTERMASTER'],
    stepNumber: 7,
  },
  {
    state: 'AWAITING_ADVANCE',
    label: 'Advance Decision',
    description: 'The Commander decides whether the Legion advances.',
    roles: ['COMMANDER'],
    stepNumber: 8,
  },
  {
    state: 'AWAITING_MISSION_FOCUS',
    label: 'Mission Focus',
    description: 'The Commander selects the type of mission to undertake.',
    roles: ['COMMANDER'],
    stepNumber: 9,
  },
  {
    state: 'AWAITING_MISSION_GENERATION',
    label: 'Mission Generation',
    description: 'The GM generates missions based on the chosen focus.',
    roles: ['GM'],
    stepNumber: 10,
  },
  {
    state: 'AWAITING_MISSION_SELECTION',
    label: 'Mission Selection',
    description: 'The Commander chooses which missions to run.',
    roles: ['COMMANDER'],
    stepNumber: 11,
  },
  {
    state: 'AWAITING_MISSION_DEPLOYMENT',
    label: 'Personnel Deployment',
    description: 'The Marshal assigns personnel to the selected missions.',
    roles: ['MARSHAL'],
    stepNumber: 12,
  },
  {
    state: 'PHASE_COMPLETE',
    label: 'Phase Complete',
    description: 'The campaign phase is complete. Ready for the next mission.',
    roles: [],
    stepNumber: 13,
  },
];

// ─── Transition table ─────────────────────────────────────────────────────────

/**
 * Maps each state to the state(s) it may legally transition into.
 * null represents the initial state (no phase started yet).
 */
export const VALID_TRANSITIONS: Record<CampaignPhaseState | 'null', CampaignPhaseState[]> = {
  null: ['AWAITING_MISSION_RESOLUTION'],
  PHASE_COMPLETE: ['AWAITING_MISSION_RESOLUTION'],
  AWAITING_MISSION_RESOLUTION: ['AWAITING_PERSONNEL_UPDATE'],
  AWAITING_PERSONNEL_UPDATE: ['AWAITING_BACK_AT_CAMP'],
  AWAITING_BACK_AT_CAMP: ['AWAITING_TALES', 'TIME_PASSING'],
  AWAITING_TALES: ['TIME_PASSING'],
  TIME_PASSING: ['CAMPAIGN_ACTIONS'],
  CAMPAIGN_ACTIONS: ['AWAITING_LABORERS_ALCHEMISTS'],
  AWAITING_LABORERS_ALCHEMISTS: ['AWAITING_ADVANCE'],
  AWAITING_ADVANCE: ['AWAITING_MISSION_FOCUS'],
  AWAITING_MISSION_FOCUS: ['AWAITING_MISSION_GENERATION'],
  AWAITING_MISSION_GENERATION: ['AWAITING_MISSION_SELECTION'],
  AWAITING_MISSION_SELECTION: ['AWAITING_MISSION_DEPLOYMENT'],
  AWAITING_MISSION_DEPLOYMENT: ['PHASE_COMPLETE'],
};

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Returns true if transitioning from `current` to `next` is a legal move.
 * `current` may be null (no phase started yet).
 */
export function isValidTransition(
  current: CampaignPhaseState | null,
  next: CampaignPhaseState,
): boolean {
  const key = current ?? 'null';
  const allowed = VALID_TRANSITIONS[key];
  return allowed?.includes(next) ?? false;
}

/**
 * Asserts that a transition is valid, throwing a descriptive error if not.
 * Use this at the start of every server action that changes phase state.
 */
export function assertValidTransition(
  current: CampaignPhaseState | null,
  next: CampaignPhaseState,
): void {
  if (!isValidTransition(current, next)) {
    throw new Error(
      `Invalid state transition: ${current ?? 'null'} → ${next}. ` +
      `Allowed transitions from ${current ?? 'null'}: ${
        (VALID_TRANSITIONS[current ?? 'null'] ?? []).join(', ') || 'none'
      }`,
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the PhaseStep metadata for a given state, or undefined if not found.
 */
export function getStepForState(state: CampaignPhaseState): PhaseStep | undefined {
  return PHASE_STEPS.find((s) => s.state === state);
}

/**
 * Returns whether a given role should be active (i.e. it's their turn to act)
 * for the given campaign phase state.
 *
 * Deputies of a role are also active when the primary is active — callers are
 * responsible for checking rank if they need to distinguish primary/deputy.
 */
export function isRoleActive(role: LegionRole, state: CampaignPhaseState): boolean {
  const step = getStepForState(state);
  if (!step) return false;
  // GM is always considered active — they can always see the full picture
  // and may fill in for missing roles (e.g. no Lorekeeper assigned).
  if (role === 'GM') return true;
  return step.roles.includes(role);
}

/**
 * Returns the display status of a step relative to the current campaign state.
 *   'complete'  — this step is in the past
 *   'active'    — this step is currently happening
 *   'upcoming'  — this step has not started yet
 */
export function getStepStatus(
  step: PhaseStep,
  currentState: CampaignPhaseState | null,
): 'complete' | 'active' | 'upcoming' {
  if (currentState === null) return 'upcoming';
  if (step.state === currentState) return 'active';

  const currentIndex = PHASE_STEPS.findIndex((s) => s.state === currentState);
  const stepIndex = PHASE_STEPS.findIndex((s) => s.state === step.state);

  if (currentIndex === -1) return 'upcoming';
  return stepIndex < currentIndex ? 'complete' : 'upcoming';
}
