'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { makeAdvanceDecision } from '@/server/actions/phase';
import type { AdvanceDecisionState } from '@/server/actions/phase';
import type { Campaign } from '@/lib/types';
import { getConnections } from '@/lib/locations';
import { LegionDice } from '@/components/legion';

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
      // Scroll result into view on mobile
      document.getElementById('advance-result')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [result]);

  function handleContinue() {
    router.refresh();
  }

  // ── Result panel ─────────────────────────────────────────────────────────────

  if (result) {
    return (
      <div id="advance-result" className="flex flex-col gap-6" aria-live="polite">
        {result.decision === 'STAY' ? (
          <div className="rounded-md border border-border bg-legion-bg-elevated p-4 space-y-2">
            <p className="font-heading text-sm font-semibold uppercase tracking-widest text-legion-text-muted">
              Decision: Stay
            </p>
            <p className="text-sm text-legion-text-primary">
              The Legion remains at <strong>{campaign.current_location}</strong>.
              Pressure carries into the next phase.
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-legion-amber/40 bg-legion-bg-elevated p-4 space-y-4">
            <p className="font-heading text-sm font-semibold uppercase tracking-widest text-legion-amber">
              Advance — Dice Result
            </p>

            {/* Dice roll */}
            <div>
              <p className="text-xs text-legion-text-muted mb-2">
                Pressure rolled ({result.pressure_after_horses} dice
                {result.horses_spent > 0 && `, after spending ${result.horses_spent} Horse use${result.horses_spent !== 1 ? 's' : ''}`}):
              </p>
              <LegionDice 
                results={result.dice} 
                worstDieIndex={result.dice.indexOf(result.worst_die)} 
                className="mb-4"
              />
            </div>

            {/* Summary */}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-0.5">Worst die</dt>
                <dd className="font-medium text-legion-text-primary">{result.worst_die}</dd>
              </div>
              <div>
                <dt className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-0.5">Time ticks added</dt>
                <dd className="font-medium text-legion-text-primary">+{result.time_ticks_added}</dd>
              </div>
              <div>
                <dt className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-0.5">New location</dt>
                <dd className="font-medium text-legion-text-primary">{result.new_location_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-0.5">Pressure after</dt>
                <dd className="font-medium text-legion-text-primary">0 (reset)</dd>
              </div>
            </dl>

            {result.broken_advance && (
              <div role="alert" className="rounded-md border border-red-700 bg-red-900/20 px-4 py-3">
                <p className="text-sm font-semibold text-red-400">Broken Advance</p>
                <p className="text-xs text-red-300 mt-0.5">
                  A Time clock has filled. The Legion is under severe pressure. Consult the GM.
                </p>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleContinue}
          className="self-start rounded-md bg-legion-amber px-5 py-2.5 font-heading text-sm font-semibold tracking-wide text-[var(--bob-amber-fg)] hover:opacity-90 transition-opacity min-h-[44px]"
        >
          Continue
        </button>
      </div>
    );
  }

  // ── Decision form ─────────────────────────────────────────────────────────────

  return (
    <form action={action} noValidate aria-label="Advance decision form">
      <input type="hidden" name="campaign_id" value={campaign.id} />

      <div className="flex flex-col gap-6">

        {errors?._form && (
          <div role="alert" className="rounded-md bg-red-900/30 border border-red-700 px-4 py-3">
            <p className="text-sm text-red-400">{errors._form.join(', ')}</p>
          </div>
        )}

        {/* Context: current location and stats */}
        <div className="rounded-md border border-border bg-legion-bg-elevated p-4">
          <dl className="flex gap-6 flex-wrap text-sm">
            <div>
              <dt className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-0.5">Current location</dt>
              <dd className="text-legion-text-primary font-medium">{campaign.current_location}</dd>
            </div>
            <div>
              <dt className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-0.5">Pressure</dt>
              <dd className="text-legion-text-primary font-medium">{campaign.pressure}</dd>
            </div>
            <div>
              <dt className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-0.5">Horse uses</dt>
              <dd className="text-legion-text-primary font-medium">{campaign.horse_uses}</dd>
            </div>
          </dl>
        </div>

        {/* Decision */}
        <fieldset>
          <legend className="font-heading text-sm font-semibold uppercase tracking-widest text-legion-text-primary mb-1">
            Decision
          </legend>
          <p className="text-xs text-legion-text-muted mb-3" id="decision-desc">
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
                className="flex items-start gap-3 cursor-pointer rounded-md border border-border p-3 hover:border-legion-amber/50 transition-colors has-[:checked]:border-legion-amber has-[:checked]:bg-legion-bg-elevated"
              >
                <input
                  type="radio"
                  name="decision"
                  value={value}
                  onChange={() => setDecision(value)}
                  className="mt-0.5 accent-[var(--bob-amber)] w-4 h-4 shrink-0"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-legion-text-primary">{label}</span>
                  <span className="text-xs text-legion-text-muted">{description}</span>
                </span>
              </label>
            ))}
          </div>
          {errors?.decision && (
            <p role="alert" className="mt-2 text-xs text-red-400">
              Error: {errors.decision.join(', ')}
            </p>
          )}
        </fieldset>

        {/* Path selector — only when Advance is chosen and multiple paths exist */}
        {showPathSelector && (
          <fieldset>
            <legend className="font-heading text-sm font-semibold uppercase tracking-widest text-legion-text-primary mb-1">
              Advance to
            </legend>
            <p className="text-xs text-legion-text-muted mb-3" id="path-desc">
              Multiple paths lead from {campaign.current_location}. Choose one.
            </p>
            <div className="flex flex-col gap-2" aria-describedby="path-desc">
              {connections.map((loc) => (
                <label
                  key={loc.id}
                  className="flex items-start gap-3 cursor-pointer rounded-md border border-border p-3 hover:border-legion-amber/50 transition-colors has-[:checked]:border-legion-amber has-[:checked]:bg-legion-bg-elevated"
                >
                  <input
                    type="radio"
                    name="path_id"
                    value={loc.id}
                    className="mt-0.5 accent-[var(--bob-amber)] w-4 h-4 shrink-0"
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-legion-text-primary">{loc.name}</span>
                    <span className="text-xs text-legion-text-muted">{loc.description}</span>
                  </span>
                </label>
              ))}
            </div>
            {errors?.path_id && (
              <p role="alert" className="mt-2 text-xs text-red-400">
                Error: {errors.path_id.join(', ')}
              </p>
            )}
          </fieldset>
        )}

        {/* Horse spending — only relevant if Advance is chosen */}
        {decision === 'ADVANCE' && campaign.horse_uses > 0 && (
          <div>
            <label
              htmlFor="horses_spent"
              className="block font-heading text-sm font-semibold uppercase tracking-widest text-legion-text-primary mb-1"
            >
              Horse uses to spend (not required)
            </label>
            <p id="horses-desc" className="text-xs text-legion-text-muted mb-2">
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
              className="w-20 rounded-md border border-border bg-legion-bg-elevated px-3 py-2 text-sm text-legion-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--bob-border-focus)]"
            />
            {errors?.horses_spent && (
              <p id="horses-error" role="alert" className="mt-1 text-xs text-red-400">
                Error: {errors.horses_spent.join(', ')}
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-md bg-legion-amber px-5 py-2.5 font-heading text-sm font-semibold tracking-wide text-[var(--bob-amber-fg)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {pending ? 'Processing…' : 'Confirm Decision'}
        </button>

      </div>
    </form>
  );
}
