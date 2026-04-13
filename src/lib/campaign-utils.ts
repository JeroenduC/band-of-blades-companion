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
