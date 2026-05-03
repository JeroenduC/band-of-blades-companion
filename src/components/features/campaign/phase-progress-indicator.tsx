/**
 * PhaseProgressIndicator — Direction B compact strip + collapsible step list.
 *
 * Collapsed: ink progress bar + "Step N/9 · Label" + expand toggle.
 * Expanded: full list of all steps with status, role, and NOW badge.
 *
 * alwaysExpanded bypasses the toggle (used in WaitingForOthers).
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PHASE_STEPS, getStepStatus } from '@/lib/state-machine';
import type { CampaignPhaseState } from '@/lib/types';

export interface PhaseProgressIndicatorProps {
  currentState: CampaignPhaseState | null;
  alwaysExpanded?: boolean;
  className?: string;
}

const ROLE_LABELS: Record<string, string> = {
  GM:            'GM',
  COMMANDER:     'Commander',
  MARSHAL:       'Marshal',
  QUARTERMASTER: 'QM',
  LOREKEEPER:    'Lorekeeper',
  SPYMASTER:     'Spymaster',
};

export function PhaseProgressIndicator({
  currentState,
  alwaysExpanded = false,
  className,
}: PhaseProgressIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const showList = alwaysExpanded || expanded;

  const totalSteps = PHASE_STEPS.length;
  const activeIndex = currentState
    ? PHASE_STEPS.findIndex((s) => s.state === currentState)
    : -1;
  const activeStep = activeIndex >= 0 ? PHASE_STEPS[activeIndex] : null;
  const completedCount = PHASE_STEPS.filter(
    (s) => getStepStatus(s, currentState) === 'complete',
  ).length;

  const progressPct = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  return (
    <nav
      aria-label="Campaign phase progress"
      className={cn('w-full', className)}
    >
      {/* ── Compact header strip ──────────────────────────────────── */}
      <div className="border border-legion-border bg-legion-bg-elevated">
        {/* Progress bar */}
        <div className="h-[3px] bg-legion-border" aria-hidden="true">
          <div
            className="h-full bg-legion-text-primary transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-4 px-3 py-2.5">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-legion-text-faint shrink-0">
              Step {activeStep ? activeStep.stepNumber : '—'}/{totalSteps}
            </span>
            {activeStep && (
              <span className="font-crimson text-[15px] text-legion-text-primary truncate">
                {activeStep.label}
              </span>
            )}
            {!activeStep && (
              <span className="font-crimson text-[15px] text-legion-text-faint italic">
                {currentState === null ? 'No phase in progress' : 'Complete'}
              </span>
            )}
          </div>

          {!alwaysExpanded && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-legion-text-faint hover:text-legion-text-primary transition-colors shrink-0 min-h-[44px] flex items-center gap-1"
              aria-expanded={expanded}
            >
              All steps
              <span aria-hidden="true">{expanded ? '▲' : '▼'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Expanded step list ────────────────────────────────────── */}
      {showList && (
        <ol
          className="border border-t-0 border-legion-border divide-y divide-dashed divide-legion-border"
          role="list"
          aria-label="All phase steps"
        >
          {/* Screen-reader summary */}
          <p className="sr-only">
            {currentState
              ? `Current step: ${activeStep?.label ?? currentState}`
              : 'No campaign phase in progress'}
          </p>

          {PHASE_STEPS.map((step) => {
            const status = getStepStatus(step, currentState);

            return (
              <li
                key={step.state}
                className={cn(
                  'grid items-center gap-x-3 px-3 py-2.5',
                  'grid-cols-[28px_1fr_auto]',
                )}
                aria-current={status === 'active' ? 'step' : undefined}
              >
                {/* Step number */}
                <span
                  className={cn(
                    'font-mono text-[11px] tracking-[0.06em]',
                    status === 'complete' && 'text-legion-text-faint line-through',
                    status === 'active'   && 'text-legion-text-primary font-bold',
                    status === 'upcoming' && 'text-legion-text-faint',
                  )}
                  aria-hidden="true"
                >
                  {step.stepNumber.toString().padStart(2, '0')}
                </span>

                {/* Step label */}
                <span
                  className={cn(
                    'font-crimson text-[16px] leading-snug',
                    status === 'complete' && 'text-legion-text-faint line-through',
                    status === 'active'   && 'text-legion-text-primary font-bold',
                    status === 'upcoming' && 'text-legion-text-muted',
                  )}
                >
                  {step.label}
                </span>

                {/* Role + NOW badge */}
                <div className="flex items-center gap-1.5 justify-end">
                  {status === 'active' && (
                    <span
                      className="bg-legion-amber/10 border border-legion-amber text-legion-amber font-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-0.5"
                      aria-label="Currently active"
                    >
                      NOW
                    </span>
                  )}
                  {step.roles.map((role) => (
                    <span
                      key={role}
                      className={cn(
                        'font-mono text-[9px] uppercase tracking-[0.12em] border px-1.5 py-0.5',
                        status === 'complete' && 'border-legion-border text-legion-text-faint',
                        status === 'active'   && 'border-legion-border text-legion-text-faint',
                        status === 'upcoming' && 'border-legion-border text-legion-text-faint',
                      )}
                    >
                      {ROLE_LABELS[role] ?? role}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
}
