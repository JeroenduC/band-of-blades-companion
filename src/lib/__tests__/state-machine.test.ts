import { describe, it, expect } from 'vitest';
import {
  isValidTransition,
  assertValidTransition,
  isRoleActive,
  getStepStatus,
  getStepForState,
  PHASE_STEPS,
  VALID_TRANSITIONS,
} from '../state-machine';
import type { CampaignPhaseState } from '../types';

// ─── isValidTransition ────────────────────────────────────────────────────────

describe('isValidTransition', () => {
  it('allows starting a phase from null', () => {
    expect(isValidTransition(null, 'AWAITING_MISSION_RESOLUTION')).toBe(true);
  });

  it('allows starting a phase from PHASE_COMPLETE', () => {
    expect(isValidTransition('PHASE_COMPLETE', 'AWAITING_MISSION_RESOLUTION')).toBe(true);
  });

  it('allows each sequential transition', () => {
    const sequence: Array<[CampaignPhaseState | null, CampaignPhaseState]> = [
      [null,                            'AWAITING_MISSION_RESOLUTION'],
      ['AWAITING_MISSION_RESOLUTION',   'AWAITING_BACK_AT_CAMP'],
      ['AWAITING_BACK_AT_CAMP',         'TIME_PASSING'],
      ['TIME_PASSING',                  'CAMPAIGN_ACTIONS'],
      ['CAMPAIGN_ACTIONS',              'AWAITING_LABORERS_ALCHEMISTS'],
      ['AWAITING_LABORERS_ALCHEMISTS',  'AWAITING_ADVANCE'],
      ['AWAITING_ADVANCE',              'AWAITING_MISSION_FOCUS'],
      ['AWAITING_MISSION_FOCUS',        'AWAITING_MISSION_GENERATION'],
      ['AWAITING_MISSION_GENERATION',   'AWAITING_MISSION_SELECTION'],
      ['AWAITING_MISSION_SELECTION',    'PHASE_COMPLETE'],
    ];
    for (const [from, to] of sequence) {
      expect(isValidTransition(from, to), `${from} → ${to}`).toBe(true);
    }
  });

  it('rejects skipping steps', () => {
    expect(isValidTransition(null, 'CAMPAIGN_ACTIONS')).toBe(false);
    expect(isValidTransition('AWAITING_MISSION_RESOLUTION', 'TIME_PASSING')).toBe(false);
    expect(isValidTransition('TIME_PASSING', 'AWAITING_ADVANCE')).toBe(false);
  });

  it('rejects going backwards', () => {
    expect(isValidTransition('AWAITING_BACK_AT_CAMP', 'AWAITING_MISSION_RESOLUTION')).toBe(false);
    expect(isValidTransition('CAMPAIGN_ACTIONS', 'TIME_PASSING')).toBe(false);
    expect(isValidTransition('PHASE_COMPLETE', 'AWAITING_ADVANCE')).toBe(false);
  });

  it('rejects transitioning to the same state', () => {
    expect(isValidTransition('CAMPAIGN_ACTIONS', 'CAMPAIGN_ACTIONS')).toBe(false);
    expect(isValidTransition('PHASE_COMPLETE', 'PHASE_COMPLETE')).toBe(false);
  });
});

// ─── assertValidTransition ────────────────────────────────────────────────────

describe('assertValidTransition', () => {
  it('does not throw for a valid transition', () => {
    expect(() => assertValidTransition(null, 'AWAITING_MISSION_RESOLUTION')).not.toThrow();
    expect(() => assertValidTransition('AWAITING_MISSION_RESOLUTION', 'AWAITING_BACK_AT_CAMP')).not.toThrow();
  });

  it('throws a descriptive error for an invalid transition', () => {
    expect(() => assertValidTransition(null, 'CAMPAIGN_ACTIONS')).toThrowError(
      /Invalid state transition: null → CAMPAIGN_ACTIONS/,
    );
  });

  it('includes allowed transitions in the error message', () => {
    expect(() => assertValidTransition('TIME_PASSING', 'AWAITING_ADVANCE')).toThrowError(
      /CAMPAIGN_ACTIONS/,
    );
  });
});

// ─── isRoleActive ─────────────────────────────────────────────────────────────

describe('isRoleActive', () => {
  it('GM is always active regardless of state', () => {
    const states: CampaignPhaseState[] = [
      'AWAITING_MISSION_RESOLUTION',
      'CAMPAIGN_ACTIONS',
      'PHASE_COMPLETE',
    ];
    for (const state of states) {
      expect(isRoleActive('GM', state), `GM at ${state}`).toBe(true);
    }
  });

  it('COMMANDER is active at TIME_PASSING', () => {
    expect(isRoleActive('COMMANDER', 'TIME_PASSING')).toBe(true);
  });

  it('COMMANDER is not active at AWAITING_MISSION_RESOLUTION', () => {
    expect(isRoleActive('COMMANDER', 'AWAITING_MISSION_RESOLUTION')).toBe(false);
  });

  it('QUARTERMASTER and SPYMASTER are both active at CAMPAIGN_ACTIONS', () => {
    expect(isRoleActive('QUARTERMASTER', 'CAMPAIGN_ACTIONS')).toBe(true);
    expect(isRoleActive('SPYMASTER', 'CAMPAIGN_ACTIONS')).toBe(true);
  });

  it('MARSHAL is not active at CAMPAIGN_ACTIONS', () => {
    expect(isRoleActive('MARSHAL', 'CAMPAIGN_ACTIONS')).toBe(false);
  });

  it('LOREKEEPER is active at AWAITING_BACK_AT_CAMP', () => {
    expect(isRoleActive('LOREKEEPER', 'AWAITING_BACK_AT_CAMP')).toBe(true);
  });
});

// ─── getStepStatus ────────────────────────────────────────────────────────────

describe('getStepStatus', () => {
  it('returns upcoming for all steps when state is null', () => {
    for (const step of PHASE_STEPS) {
      expect(getStepStatus(step, null)).toBe('upcoming');
    }
  });

  it('returns active for the current step', () => {
    const step = PHASE_STEPS.find((s) => s.state === 'CAMPAIGN_ACTIONS')!;
    expect(getStepStatus(step, 'CAMPAIGN_ACTIONS')).toBe('active');
  });

  it('returns complete for steps before the current one', () => {
    const step = PHASE_STEPS.find((s) => s.state === 'AWAITING_MISSION_RESOLUTION')!;
    expect(getStepStatus(step, 'CAMPAIGN_ACTIONS')).toBe('complete');
  });

  it('returns upcoming for steps after the current one', () => {
    const step = PHASE_STEPS.find((s) => s.state === 'PHASE_COMPLETE')!;
    expect(getStepStatus(step, 'CAMPAIGN_ACTIONS')).toBe('upcoming');
  });
});

// ─── getStepForState ──────────────────────────────────────────────────────────

describe('getStepForState', () => {
  it('returns the correct step for a known state', () => {
    const step = getStepForState('AWAITING_ADVANCE');
    expect(step).toBeDefined();
    expect(step!.stepNumber).toBe(6);
    expect(step!.roles).toContain('COMMANDER');
  });

  it('returns undefined for an unknown state', () => {
    // @ts-expect-error intentionally passing invalid value
    expect(getStepForState('UNKNOWN_STATE')).toBeUndefined();
  });
});

// ─── PHASE_STEPS completeness ─────────────────────────────────────────────────

describe('PHASE_STEPS', () => {
  it('covers all states in VALID_TRANSITIONS', () => {
    const transitionStates = Object.keys(VALID_TRANSITIONS).filter((k) => k !== 'null');
    for (const state of transitionStates) {
      expect(
        PHASE_STEPS.some((s) => s.state === state),
        `${state} missing from PHASE_STEPS`,
      ).toBe(true);
    }
  });

  it('has sequential step numbers starting at 1', () => {
    const numbers = PHASE_STEPS.map((s) => s.stepNumber);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
