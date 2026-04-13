'use client';

import { useActionState } from 'react';
import { makeAdvanceDecision } from '@/server/actions/campaign-phase';
import type { AdvanceDecisionState } from '@/server/actions/campaign-phase';
import type { Campaign } from '@/lib/types';

interface AdvanceDecisionFormProps {
  campaign: Campaign;
}

/**
 * Commander form for the Advance Decision step.
 *
 * Shows current pressure and horse uses, lets the Commander choose
 * Advance or Stay. If Advance, allows spending Horse uses before the roll.
 */
export function AdvanceDecisionForm({ campaign }: AdvanceDecisionFormProps) {
  const [state, action, pending] = useActionState<AdvanceDecisionState | null, FormData>(
    makeAdvanceDecision,
    null,
  );

  const errors = state?.errors;

  return (
    <form action={action} noValidate aria-label="Advance decision form">
      <input type="hidden" name="campaign_id" value={campaign.id} />

      <div className="flex flex-col gap-6">

        {errors?._form && (
          <div role="alert" className="rounded-md bg-red-900/30 border border-red-700 px-4 py-3">
            <p className="text-sm text-red-400">{errors._form.join(', ')}</p>
          </div>
        )}

        {/* Context: current location and state */}
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
            Advancing costs no resources but triggers a pressure dice roll — more pressure means more time ticks.
            Staying avoids the roll but keeps the pressure unchanged.
          </p>
          <div className="flex flex-col gap-2" aria-describedby="decision-desc">
            {([
              {
                value: 'ADVANCE',
                label: 'Advance',
                description: 'Move to the next location. Roll dice equal to pressure; result adds time ticks.',
              },
              {
                value: 'STAY',
                label: 'Stay',
                description: 'Remain at current location. No dice roll. Pressure carried into the next phase.',
              },
            ] as const).map(({ value, label, description }) => (
              <label
                key={value}
                className="flex items-start gap-3 cursor-pointer rounded-md border border-border p-3 hover:border-legion-amber/50 transition-colors has-[:checked]:border-legion-amber has-[:checked]:bg-legion-bg-elevated"
              >
                <input
                  type="radio"
                  name="decision"
                  value={value}
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

        {/* Horse spending — only relevant if Advance is chosen */}
        {campaign.horse_uses > 0 && (
          <div>
            <label
              htmlFor="horses_spent"
              className="block font-heading text-sm font-semibold uppercase tracking-widest text-legion-text-primary mb-1"
            >
              Horse uses to spend (not required)
            </label>
            <p id="horses-desc" className="text-xs text-legion-text-muted mb-2">
              Each Horse use reduces pressure by 1 before the dice roll.
              Only applies if you choose to Advance.
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
