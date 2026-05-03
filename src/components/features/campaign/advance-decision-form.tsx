'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { makeAdvanceDecision } from '@/server/actions/phase';
import type { AdvanceDecisionState } from '@/server/actions/phase';
import type { Campaign } from '@/lib/types';
import { getConnections } from '@/lib/locations';
import { LegionDice, LegionButton, LegionBadge } from '@/components/legion';
import { cn } from '@/lib/utils';

interface AdvanceDecisionFormProps {
  campaign: Campaign;
}

/**
 * Commander form for the Advance Decision step.
 *
 * Shows current pressure and horse uses, lets the Commander choose
 * Advance or Stay. If Advance and the current location has multiple
 * connections, the Commander must pick the path. After submission the
 * dice result is shown in-place; clicking Continue triggers router.refresh()
 * so the parent Server Component re-renders with the new phase state.
 *
 * BoB rulebook pp.119-120 (Advance, Pressure dice).
 */
export function AdvanceDecisionForm({ campaign }: AdvanceDecisionFormProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AdvanceDecisionState | null, FormData>(
    makeAdvanceDecision,
    null,
  );
  const [decision, setDecision] = useState<'ADVANCE' | 'STAY' | null>(null);

  const connections = getConnections(campaign.current_location);
  const showPathSelector = decision === 'ADVANCE' && connections.length > 1;

  const errors = state?.errors;
  const result = state?.result;

  useEffect(() => {
    if (result) {
      document.getElementById('advance-result')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [result]);

  function handleContinue() {
    router.refresh();
  }

  // ── Result panel ───────────────────────────────────────────────────────────

  if (result) {
    return (
      <div id="advance-result" className="flex flex-col gap-5" aria-live="polite">
        {result.decision === 'STAY' ? (
          <div className="border border-legion-border bg-legion-bg-elevated px-4 py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-legion-text-faint mb-2">
              Decision — Stay
            </p>
            <p className="font-crimson text-[17px] text-legion-text-muted leading-relaxed">
              The Legion remains at <strong className="text-legion-text-primary">{campaign.current_location}</strong>.
              Pressure carries into the next phase.
            </p>
          </div>
        ) : (
          <div className="border border-legion-border bg-legion-bg-elevated px-4 py-4 flex flex-col gap-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-legion-text-faint">
              Decision — Advance
            </p>

            {/* Dice roll */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-legion-text-faint mb-2">
                Pressure rolled ({result.pressure_after_horses} dice
                {result.horses_spent > 0 && `, after spending ${result.horses_spent} horse use${result.horses_spent !== 1 ? 's' : ''}`}):
              </p>
              <LegionDice
                results={result.dice}
                worstDieIndex={result.dice.indexOf(result.worst_die)}
                className="mb-3"
              />
            </div>

            {/* Outcome ledger */}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-dashed border-legion-border pt-3">
              <OutcomeRow label="Worst die" value={result.worst_die.toString()} />
              <OutcomeRow label="Time ticks added" value={`+${result.time_ticks_added}`} />
              <OutcomeRow label="New location" value={result.new_location_name ?? '—'} />
              <OutcomeRow label="Pressure after" value="0 (reset)" />
            </dl>

            {result.broken_advance && (
              <div role="alert" className="border-l-4 border-legion-danger bg-legion-danger/5 px-4 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-legion-danger font-bold mb-0.5">
                  Broken Advance
                </p>
                <p className="font-crimson text-[16px] text-legion-text-muted leading-snug">
                  A Time clock has filled. The Legion is under severe pressure. Consult the GM.
                </p>
              </div>
            )}
          </div>
        )}

        <LegionButton type="button" onClick={handleContinue} className="w-full">
          Continue →
        </LegionButton>
      </div>
    );
  }

  // ── Decision form ──────────────────────────────────────────────────────────

  return (
    <form action={action} noValidate aria-label="Advance decision form">
      <input type="hidden" name="campaign_id" value={campaign.id} />

      {/* Action card wrapper */}
      <div
        className="border-2 border-legion-text-primary bg-legion-bg-elevated"
        style={{ boxShadow: '4px 4px 0 rgba(31,26,20,0.12)' }}
      >
        {/* Card header */}
        <div className="border-b-2 border-legion-text-primary px-4 pt-4 pb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-legion-text-faint mb-1">
              Step 6
            </p>
            <h2 className="font-fell text-[28px] leading-none text-legion-text-primary">
              Advance Decision
            </h2>
          </div>
          <LegionBadge intent="danger">Decide now</LegionBadge>
        </div>

        <div className="px-4 py-4 flex flex-col gap-5">

          {errors?._form && (
            <div role="alert" className="border-l-4 border-legion-danger bg-legion-danger/5 px-3 py-2.5">
              <p className="font-mono text-[11px] text-legion-danger">{errors._form.join(', ')}</p>
            </div>
          )}

          {/* Context: current stats */}
          <div className="flex gap-6 flex-wrap border border-legion-border px-3 py-2.5">
            <ContextStat label="Current location" value={campaign.current_location} />
            <ContextStat label="Pressure" value={campaign.pressure.toString()} />
            <ContextStat label="Horse uses" value={campaign.horse_uses.toString()} />
          </div>

          {/* Decision radio cards */}
          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.2em] text-legion-text-faint mb-2.5">
              Decision
            </legend>
            <p className="font-crimson text-[16px] text-legion-text-muted mb-3 leading-snug" id="decision-desc">
              Advancing triggers a pressure dice roll — more pressure means more time ticks.
              Staying avoids the roll but keeps pressure unchanged.
            </p>
            <div className="flex flex-col gap-2" aria-describedby="decision-desc">
              {([
                {
                  value: 'ADVANCE' as const,
                  label: 'Advance',
                  description: 'Move to the next location. Roll dice equal to pressure; worst die adds time ticks.',
                },
                {
                  value: 'STAY' as const,
                  label: 'Stay',
                  description: 'Remain at current location. No dice roll. Pressure carries into the next phase.',
                },
              ]).map(({ value, label, description }) => (
                <label
                  key={value}
                  className={cn(
                    'flex items-start gap-3 cursor-pointer border-2 p-3 transition-colors',
                    'border-legion-border bg-legion-bg-base',
                    'has-[:checked]:border-legion-text-primary has-[:checked]:bg-legion-bg-elevated',
                  )}
                >
                  <input
                    type="radio"
                    name="decision"
                    value={value}
                    onChange={() => setDecision(value)}
                    className="mt-1 accent-[var(--bob-text-primary)] w-4 h-4 shrink-0"
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="font-fell text-[18px] text-legion-text-primary leading-tight">{label}</span>
                    <span className="font-crimson text-[15px] text-legion-text-muted leading-snug">{description}</span>
                  </span>
                </label>
              ))}
            </div>
            {errors?.decision && (
              <p role="alert" className="mt-2 font-mono text-[11px] text-legion-danger">
                Error: {errors.decision.join(', ')}
              </p>
            )}
          </fieldset>

          {/* Path selector */}
          {showPathSelector && (
            <fieldset>
              <legend className="font-mono text-[10px] uppercase tracking-[0.2em] text-legion-text-faint mb-2.5">
                Advance to
              </legend>
              <p className="font-crimson text-[16px] text-legion-text-muted mb-3 leading-snug" id="path-desc">
                Multiple paths lead from {campaign.current_location}. Choose one.
              </p>
              <div className="flex flex-col gap-2" aria-describedby="path-desc">
                {connections.map((loc) => (
                  <label
                    key={loc.id}
                    className={cn(
                      'flex items-start gap-3 cursor-pointer border-2 p-3 transition-colors',
                      'border-legion-border bg-legion-bg-base',
                      'has-[:checked]:border-legion-text-primary has-[:checked]:bg-legion-bg-elevated',
                    )}
                  >
                    <input
                      type="radio"
                      name="path_id"
                      value={loc.id}
                      className="mt-1 accent-[var(--bob-text-primary)] w-4 h-4 shrink-0"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="font-fell text-[18px] text-legion-text-primary leading-tight">{loc.name}</span>
                      <span className="font-crimson text-[15px] text-legion-text-muted leading-snug">{loc.description}</span>
                    </span>
                  </label>
                ))}
              </div>
              {errors?.path_id && (
                <p role="alert" className="mt-2 font-mono text-[11px] text-legion-danger">
                  Error: {errors.path_id.join(', ')}
                </p>
              )}
            </fieldset>
          )}

          {/* Horse spending */}
          {decision === 'ADVANCE' && campaign.horse_uses > 0 && (
            <div>
              <label
                htmlFor="horses_spent"
                className="block font-mono text-[10px] uppercase tracking-[0.2em] text-legion-text-faint mb-1"
              >
                Horse uses to spend (not required)
              </label>
              <p id="horses-desc" className="font-crimson text-[15px] text-legion-text-muted mb-2 leading-snug">
                Each Horse use reduces pressure by 1 before the dice roll.
                Available: {campaign.horse_uses}.
              </p>
              <input
                id="horses_spent"
                name="horses_spent"
                type="text"
                inputMode="numeric"
                defaultValue="0"
                aria-describedby={errors?.horses_spent ? 'horses-error horses-desc' : 'horses-desc'}
                aria-invalid={!!errors?.horses_spent}
                className="w-20 border-2 border-legion-border bg-legion-bg-base px-3 py-2 font-mono text-[16px] text-legion-text-primary focus:outline-none focus:border-legion-text-primary"
              />
              {errors?.horses_spent && (
                <p id="horses-error" role="alert" className="mt-1 font-mono text-[11px] text-legion-danger">
                  Error: {errors.horses_spent.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Card footer buttons */}
        <div className="border-t-2 border-legion-text-primary px-4 py-3 flex flex-col gap-2">
          <LegionButton type="submit" disabled={pending} className="w-full">
            {pending ? 'Processing…' : 'Confirm Decision'}
          </LegionButton>
        </div>
      </div>
    </form>
  );
}

function ContextStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-legion-text-faint">{label}</dt>
      <dd className="font-fell text-[18px] text-legion-text-primary leading-none">{value}</dd>
    </div>
  );
}

function OutcomeRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-legion-text-faint mb-0.5">{label}</dt>
      <dd className="font-fell text-[18px] text-legion-text-primary leading-none">{value}</dd>
    </div>
  );
}
