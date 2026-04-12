/**
 * WaitingForOthers — shown when it's not the current player's turn.
 *
 * Displays the full PhaseProgressIndicator so the player always knows
 * where the phase stands, plus a message naming who needs to act next.
 *
 * Design principle (§2): "Async-native." Players act at different times.
 * Clear status indicators prevent confusion about what's blocking progress.
 */

import { PhaseProgressIndicator } from './phase-progress-indicator';
import { getStepForState } from '@/lib/state-machine';
import type { CampaignPhaseState, LegionRole } from '@/lib/types';

const ROLE_LABELS: Record<string, string> = {
  GM:            'the GM',
  COMMANDER:     'the Commander',
  MARSHAL:       'the Marshal',
  QUARTERMASTER: 'the Quartermaster',
  LOREKEEPER:    'the Lorekeeper',
  SPYMASTER:     'the Spymaster',
};

interface WaitingForOthersProps {
  currentState: CampaignPhaseState;
  viewerRole: LegionRole;
}

export function WaitingForOthers({ currentState, viewerRole }: WaitingForOthersProps) {
  const step = getStepForState(currentState);
  const activeRoles = step?.roles ?? [];

  // Build a readable "waiting for X" message
  const roleNames = activeRoles
    .filter((r) => r !== viewerRole)
    .map((r) => ROLE_LABELS[r] ?? r);

  const waitingFor = roleNames.length > 0
    ? roleNames.join(' and ')
    : 'others';

  return (
    <div className="flex flex-col gap-6">
      {/* Status message */}
      <div
        className="rounded-lg border border-border bg-legion-bg-surface px-4 py-3"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-legion-text-muted leading-relaxed">
          Waiting for{' '}
          <span className="font-semibold text-legion-text-primary">{waitingFor}</span>
          {step ? ` — ${step.label}` : ''}.
        </p>
      </div>

      {/* Full pipeline so the player always knows where things stand */}
      <PhaseProgressIndicator currentState={currentState} />
    </div>
  );
}
