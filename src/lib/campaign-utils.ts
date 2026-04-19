/**
 * Pure utility functions for campaign phase logic.
 * These have no server-side dependencies and can be imported anywhere.
 */

/**
 * Determines how many free campaign actions the QM gets based on morale.
 * BoB rulebook p.137: High (8+) = 2, Medium (4–7) = 1, Low (0–3) = 0
 */
export function freeActionsFromMorale(morale: number): number {
  if (morale >= 8) return 2;
  if (morale >= 4) return 1;
  return 0;
}

/**
 * Quality tiers for QM campaign action dice rolls.
 * BoB rulebook p.137-138: roll dice pool, take the best die.
 * Critical (all sixes, 2+ dice) = EXCEPTIONAL.
 */
export type ActionQuality = 'POOR' | 'STANDARD' | 'FINE' | 'EXCEPTIONAL';

export function qualityFromDice(dice: number[]): ActionQuality {
  if (dice.length >= 2 && dice.every((d) => d === 6)) return 'EXCEPTIONAL';
  const best = Math.max(...dice);
  if (best <= 3) return 'POOR';
  if (best <= 5) return 'STANDARD';
  return 'FINE';
}

/**
 * Upgrade a quality result by `boosts` tiers (one tier per supply spent).
 * Capped at EXCEPTIONAL.
 */
export function applyBoosts(quality: ActionQuality, boosts: number): ActionQuality {
  const TIERS: ActionQuality[] = ['POOR', 'STANDARD', 'FINE', 'EXCEPTIONAL'];
  const idx = TIERS.indexOf(quality);
  return TIERS[Math.min(TIERS.length - 1, idx + boosts)];
}

/**
 * Resource uses gained at each quality level (BoB: each box = 3 uses).
 * Poor = partial box, Standard = 1 box, Fine = 2 boxes, Exceptional = 3 boxes.
 */
export const QUALITY_RESOURCE_USES: Record<ActionQuality, number> = {
  POOR: 1,
  STANDARD: 3,
  FINE: 6,
  EXCEPTIONAL: 9,
};

/**
 * Segments filled on a Long-Term Project clock per quality result.
 * BoB rulebook p.138.
 */
export const QUALITY_LTP_SEGMENTS: Record<ActionQuality, number> = {
  POOR: 1,
  STANDARD: 2,
  FINE: 3,
  EXCEPTIONAL: 5,
};

/**
 * Corruption ticks added to an Alchemist clock per dice result (worst die).
 * BoB rulebook p.139.
 */
export function corruptionFromDice(dice: number[]): number {
  if (dice.length >= 2 && dice.every((d) => d === 6)) return 0; // critical
  const worst = Math.min(...dice);
  if (worst <= 3) return 3;
  if (worst <= 5) return 2;
  return 1;
}

/**
 * Time ticks from worst die in an Advance roll (BoB rulebook p.120):
 *   1–3 → 1 tick
 *   4–5 → 2 ticks
 *   6   → 3 ticks
 *   Two 6s (critical) → 5 ticks
 */
export function ticksFromDice(dice: number[]): number {
  const allSixes = dice.every((d) => d === 6);
  if (allSixes && dice.length >= 2) return 5; // critical
  const worst = Math.min(...dice);
  if (worst <= 3) return 1;
  if (worst <= 5) return 2;
  return 3; // 6
}

/**
 * Tick the earliest unfilled Time clock by n ticks, returning updated values.
 * Returns the new clock values and whether a Broken Advance occurred.
 *
 * Each clock has 10 segments.
 */
export function applyTimeClockTicks(
  clock1: number,
  clock2: number,
  clock3: number,
  ticks: number,
): { clock1: number; clock2: number; clock3: number; brokenAdvance: boolean } {
  let c1 = clock1;
  let c2 = clock2;
  let c3 = clock3;
  let remaining = ticks;
  let brokenAdvance = false;

  while (remaining > 0) {
    if (c1 < 10) {
      const added = Math.min(10 - c1, remaining);
      c1 += added;
      remaining -= added;
      if (c1 === 10) brokenAdvance = true;
    } else if (c2 < 10) {
      const added = Math.min(10 - c2, remaining);
      c2 += added;
      remaining -= added;
      if (c2 === 10) brokenAdvance = true;
    } else if (c3 < 10) {
      const added = Math.min(10 - c3, remaining);
      c3 += added;
      remaining -= added;
      if (c3 === 10) brokenAdvance = true;
    } else {
      break; // all clocks full
    }
  }

  return { clock1: c1, clock2: c2, clock3: c3, brokenAdvance };
}
