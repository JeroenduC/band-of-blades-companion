/**
 * PhaseProgressIndicator — shows all 10 campaign phase steps as a vertical
 * pipeline. Each step displays its number, label, responsible role(s), and
 * status (complete / active / upcoming).
 *
 * Parallel steps (CAMPAIGN_ACTIONS step 4 = QM + Spymaster) are visually
 * grouped with a shared bracket to communicate simultaneity.
 *
 * Design principle (§2): "Informed decisions, not blind clicks." Every role
 * can always see the full pipeline — not just their own step — so they know
 * what has happened and what is coming next.
 */

import { cn } from '@/lib/utils';
import { PHASE_STEPS, getStepStatus } from '@/lib/state-machine';
import type { CampaignPhaseState } from '@/lib/types';

export interface PhaseProgressIndicatorProps {
  currentState: CampaignPhaseState | null;
  /** Optional extra class on the root element */
  className?: string;
}

const ROLE_LABELS: Record<string, string> = {
  GM: 'GM',
  COMMANDER: 'Commander',
  MARSHAL: 'Marshal',
  QUARTERMASTER: 'Quartermaster',
  LOREKEEPER: 'Lorekeeper',
  SPYMASTER: 'Spymaster',
};

// Steps whose roles act in parallel (CAMPAIGN_ACTIONS)
const PARALLEL_STEP_NUMBER = 5;

export function PhaseProgressIndicator({
  currentState,
  className,
}: PhaseProgressIndicatorProps) {
  const totalSteps = PHASE_STEPS.length;

  return (
    <nav
      aria-label="Campaign phase progress"
      className={cn('w-full', className)}
    >
      {/* Screen-reader summary */}
      <p className="sr-only">
        {currentState
          ? `Current step: ${PHASE_STEPS.find((s) => s.state === currentState)?.label ?? currentState}`
          : 'No campaign phase in progress'}
      </p>

      <ol className="relative flex flex-col gap-0" role="list">
        {PHASE_STEPS.map((step, index) => {
          const status = getStepStatus(step, currentState);
          const isLast = index === totalSteps - 1;
          const isParallel = step.stepNumber === PARALLEL_STEP_NUMBER;

          return (
            <li
              key={step.state}
              className="relative flex items-stretch gap-3"
              aria-current={status === 'active' ? 'step' : undefined}
            >
              {/* Connector line column */}
              <div className="flex flex-col items-center" aria-hidden="true">
                {/* Step circle */}
                <div
                  className={cn(
                    'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-mono font-semibold transition-colors',
                    status === 'complete' && 'border-[var(--bob-amber)] bg-[var(--bob-amber)] text-[var(--bob-amber-fg)]',
                    status === 'active'   && 'border-[var(--bob-amber)] bg-legion-bg-elevated text-legion-amber shadow-[0_0_0_3px_var(--bob-amber-muted)]',
                    status === 'upcoming' && 'border-border bg-legion-bg-surface text-legion-text-faint',
                  )}
                >
                  {status === 'complete' ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    step.stepNumber
                  )}
                </div>

                {/* Vertical connector line */}
                {!isLast && (
                  <div
                    className={cn(
                      'w-px flex-1 transition-colors',
                      status === 'complete' ? 'bg-[var(--bob-amber)]' : 'bg-border',
                    )}
                    style={{ minHeight: '1.5rem' }}
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Step content */}
              <div
                className={cn(
                  'flex-1 pb-5',
                  isLast && 'pb-0',
                )}
              >
                <div
                  className={cn(
                    'rounded-md border px-3 py-2.5 transition-colors',
                    status === 'complete' && 'border-[var(--bob-amber)]/30 bg-legion-bg-surface',
                    status === 'active'   && 'border-[var(--bob-amber)] bg-legion-bg-elevated',
                    status === 'upcoming' && 'border-border bg-legion-bg-surface opacity-60',
                  )}
                >
                  {/* Label row */}
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        'font-heading text-sm font-semibold leading-snug tracking-wide',
                        status === 'complete' && 'text-legion-text-muted line-through decoration-[var(--bob-amber)]/50',
                        status === 'active'   && 'text-legion-amber',
                        status === 'upcoming' && 'text-legion-text-primary',
                      )}
                    >
                      {step.label}
                    </p>

                    {/* Active indicator badge */}
                    {status === 'active' && (
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-[var(--bob-amber)] text-[var(--bob-amber-fg)]"
                        aria-hidden="true"
                      >
                        Now
                      </span>
                    )}
                  </div>

                  {/* Description + roles */}
                  <p className="mt-0.5 text-xs text-legion-text-muted leading-relaxed">
                    {step.description}
                  </p>

                  {/* Role tags */}
                  {step.roles.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1" aria-label="Responsible roles">
                      {step.roles.map((role) => (
                        <span
                          key={role}
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border',
                            isParallel
                              ? 'border-[var(--bob-border-strong)] bg-legion-bg-overlay text-legion-text-muted'
                              : status === 'active'
                                ? 'border-[var(--bob-amber)]/40 bg-[var(--bob-amber)]/10 text-legion-amber'
                                : 'border-border bg-legion-bg-overlay text-legion-text-faint',
                          )}
                        >
                          {ROLE_LABELS[role] ?? role}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
