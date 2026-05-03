/**
 * WaitingForOthers — shown when it's not the current player's turn.
 *
 * Amber-left-border dispatch note + always-expanded PhaseProgressIndicator
 * so the player always knows exactly where the phase stands.
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

  const roleNames = activeRoles
    .filter((r) => r !== viewerRole)
    .map((r) => ROLE_LABELS[r] ?? r);

  const waitingFor = roleNames.length > 0 ? roleNames.join(' and ') : 'others';

  return (
    <div className="flex flex-col gap-5">
      {/* Amber dispatch note */}
      <div
        className="border-l-4 border-legion-amber bg-legion-amber/5 px-4 py-3"
        role="status"
        aria-live="polite"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-legion-amber mb-1">
          Dispatch
        </p>
        <p className="font-crimson text-[17px] text-legion-text-primary leading-relaxed">
          Waiting for{' '}
          <strong>{waitingFor}</strong>
          {step ? ` — ${step.label}` : ''}.
        </p>
      </div>

      {/* Full pipeline — always expanded here */}
      <PhaseProgressIndicator currentState={currentState} alwaysExpanded />
    </div>
  );
}
