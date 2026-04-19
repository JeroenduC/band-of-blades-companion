'use client';

import { useActionState } from 'react';
import { resolveMission } from '@/server/actions/phase';
import type { ResolveMissionState } from '@/server/actions/phase';

interface MissionResolutionFormProps {
  campaignId: string;
  phaseNumber: number;
}

const outcomeOptions = [
  { value: 'SUCCESS', label: 'Success', description: 'The mission succeeded fully' },
  { value: 'PARTIAL', label: 'Partial success', description: 'Some objectives were met' },
  { value: 'FAILURE', label: 'Failure', description: 'The mission failed' },
] as const;

const secondaryOptions = [
  ...outcomeOptions,
  {
    value: 'NOT_ATTEMPTED',
    label: 'Not attempted',
    description: 'No secondary mission was run',
  },
] as const;

export function MissionResolutionForm({
  campaignId,
  phaseNumber,
}: MissionResolutionFormProps) {
  const [state, action, pending] = useActionState<ResolveMissionState | null, FormData>(
    resolveMission,
    null,
  );

  const errors = state?.errors;

  return (
    <form action={action} noValidate aria-label="Mission resolution form">
      <input type="hidden" name="campaign_id" value={campaignId} />

      <div className="flex flex-col gap-8">

        {/* Form-level error */}
        {errors?._form && (
          <div role="alert" className="rounded-md bg-red-900/30 border border-red-700 px-4 py-3">
            <p className="text-sm text-red-400">{errors._form.join(', ')}</p>
          </div>
        )}

        {/* Phase context */}
        <p className="text-sm text-legion-text-muted">
          Phase {phaseNumber} — record what happened in the mission so the campaign consequences can be applied.
        </p>

        {/* Primary mission outcome */}
        <fieldset>
          <legend className="font-heading text-sm font-semibold uppercase tracking-widest text-legion-text-primary mb-1">
            Primary mission outcome
          </legend>
          <p className="text-xs text-legion-text-muted mb-3" id="primary-desc">
            Affects morale, resources, and campaign pressure for the Legion as a whole.
          </p>
          <div className="flex flex-col gap-2" aria-describedby="primary-desc">
            {outcomeOptions.map(({ value, label, description }) => (
              <label
                key={value}
                className="flex items-start gap-3 cursor-pointer rounded-md border border-border p-3 hover:border-legion-amber/50 transition-colors has-[:checked]:border-legion-amber has-[:checked]:bg-legion-bg-elevated"
              >
                <input
                  type="radio"
                  name="primary_outcome"
                  value={value}
                  className="mt-0.5 accent-[var(--bob-amber)] w-4 h-4 shrink-0"
                  aria-describedby={`primary-${value}-desc`}
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-legion-text-primary">{label}</span>
                  <span
                    id={`primary-${value}-desc`}
                    className="text-xs text-legion-text-muted"
                  >
                    {description}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {errors?.primary_outcome && (
            <p role="alert" className="mt-2 text-xs text-red-400">
              Error: {errors.primary_outcome.join(', ')}
            </p>
          )}
        </fieldset>

        {/* Secondary mission outcome */}
        <fieldset>
          <legend className="font-heading text-sm font-semibold uppercase tracking-widest text-legion-text-primary mb-1">
            Secondary mission outcome
          </legend>
          <p className="text-xs text-legion-text-muted mb-3" id="secondary-desc">
            The secondary mission affects a specific part of the Legion based on which mission was run.
          </p>
          <div className="flex flex-col gap-2" aria-describedby="secondary-desc">
            {secondaryOptions.map(({ value, label, description }) => (
              <label
                key={value}
                className="flex items-start gap-3 cursor-pointer rounded-md border border-border p-3 hover:border-legion-amber/50 transition-colors has-[:checked]:border-legion-amber has-[:checked]:bg-legion-bg-elevated"
              >
                <input
                  type="radio"
                  name="secondary_outcome"
                  value={value}
                  className="mt-0.5 accent-[var(--bob-amber)] w-4 h-4 shrink-0"
                  aria-describedby={`secondary-${value}-desc`}
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-legion-text-primary">{label}</span>
                  <span
                    id={`secondary-${value}-desc`}
                    className="text-xs text-legion-text-muted"
                  >
                    {description}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {errors?.secondary_outcome && (
            <p role="alert" className="mt-2 text-xs text-red-400">
              Error: {errors.secondary_outcome.join(', ')}
            </p>
          )}
        </fieldset>

        {/* Legionnaires killed */}
        <div>
          <label
            htmlFor="legionnaires_killed"
            className="block font-heading text-sm font-semibold uppercase tracking-widest text-legion-text-primary mb-1"
          >
            Legionnaires killed
          </label>
          <p
            id="killed-desc"
            className="text-xs text-legion-text-muted mb-2"
          >
            Each death reduces morale by 1. Affects the Roster in later epics.
          </p>
          <input
            id="legionnaires_killed"
            name="legionnaires_killed"
            type="text"
            inputMode="numeric"
            defaultValue="0"
            aria-describedby={errors?.legionnaires_killed ? 'killed-error killed-desc' : 'killed-desc'}
            aria-invalid={!!errors?.legionnaires_killed}
            className="w-24 rounded-md border border-border bg-legion-bg-elevated px-3 py-2 text-sm text-legion-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--bob-border-focus)]"
          />
          {errors?.legionnaires_killed && (
            <p id="killed-error" role="alert" className="mt-1 text-xs text-red-400">
              Error: {errors.legionnaires_killed.join(', ')}
            </p>
          )}
        </div>

        {/* Resource changes */}
        <fieldset>
          <legend className="font-heading text-sm font-semibold uppercase tracking-widest text-legion-text-primary mb-1">
            Resource changes
          </legend>
          <p className="text-xs text-legion-text-muted mb-4" id="resources-desc">
            Enter gains as positive numbers and losses as negative. These are applied on top of morale lost to deaths.
          </p>
          <div className="flex flex-col gap-4" aria-describedby="resources-desc">

            <div>
              <label
                htmlFor="morale_gain"
                className="block text-sm text-legion-text-primary mb-1"
              >
                Morale change
              </label>
              <p id="morale-gain-desc" className="text-xs text-legion-text-muted mb-2">
                Affects the Legion&apos;s fighting spirit. Used to determine available Back at Camp scenes.
              </p>
              <input
                id="morale_gain"
                name="morale_gain"
                type="text"
                inputMode="numeric"
                defaultValue="0"
                aria-describedby={errors?.morale_gain ? 'morale-gain-error morale-gain-desc' : 'morale-gain-desc'}
                aria-invalid={!!errors?.morale_gain}
                className="w-24 rounded-md border border-border bg-legion-bg-elevated px-3 py-2 text-sm text-legion-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--bob-border-focus)]"
              />
              {errors?.morale_gain && (
                <p id="morale-gain-error" role="alert" className="mt-1 text-xs text-red-400">
                  Error: {errors.morale_gain.join(', ')}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="supply_gain"
                className="block text-sm text-legion-text-primary mb-1"
              >
                Supply change
              </label>
              <p id="supply-gain-desc" className="text-xs text-legion-text-muted mb-2">
                Affects the Quartermaster&apos;s available campaign actions.
              </p>
              <input
                id="supply_gain"
                name="supply_gain"
                type="text"
                inputMode="numeric"
                defaultValue="0"
                aria-describedby={errors?.supply_gain ? 'supply-gain-error supply-gain-desc' : 'supply-gain-desc'}
                aria-invalid={!!errors?.supply_gain}
                className="w-24 rounded-md border border-border bg-legion-bg-elevated px-3 py-2 text-sm text-legion-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--bob-border-focus)]"
              />
              {errors?.supply_gain && (
                <p id="supply-gain-error" role="alert" className="mt-1 text-xs text-red-400">
                  Error: {errors.supply_gain.join(', ')}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="intel_gain"
                className="block text-sm text-legion-text-primary mb-1"
              >
                Intel change
              </label>
              <p id="intel-gain-desc" className="text-xs text-legion-text-muted mb-2">
                Affects the Spymaster&apos;s available spy dispatches.
              </p>
              <input
                id="intel_gain"
                name="intel_gain"
                type="text"
                inputMode="numeric"
                defaultValue="0"
                aria-describedby={errors?.intel_gain ? 'intel-gain-error intel-gain-desc' : 'intel-gain-desc'}
                aria-invalid={!!errors?.intel_gain}
                className="w-24 rounded-md border border-border bg-legion-bg-elevated px-3 py-2 text-sm text-legion-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--bob-border-focus)]"
              />
              {errors?.intel_gain && (
                <p id="intel-gain-error" role="alert" className="mt-1 text-xs text-red-400">
                  Error: {errors.intel_gain.join(', ')}
                </p>
              )}
            </div>

          </div>
        </fieldset>

        {/* GM notes */}
        <div>
          <label
            htmlFor="notes"
            className="block font-heading text-sm font-semibold uppercase tracking-widest text-legion-text-primary mb-1"
          >
            Mission notes (not required)
          </label>
          <p id="notes-desc" className="text-xs text-legion-text-muted mb-2">
            A brief record of what happened. Visible to all players.
          </p>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            aria-describedby={errors?.notes ? 'notes-error notes-desc' : 'notes-desc'}
            aria-invalid={!!errors?.notes}
            className="w-full rounded-md border border-border bg-legion-bg-elevated px-3 py-2 text-sm text-legion-text-primary placeholder:text-legion-text-muted/60 focus:outline-none focus:ring-2 focus:ring-[var(--bob-border-focus)] resize-none"
            placeholder="What happened at the mission? What did the Legion sacrifice?"
          />
          {errors?.notes && (
            <p id="notes-error" role="alert" className="mt-1 text-xs text-red-400">
              Error: {errors.notes.join(', ')}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-md bg-legion-amber px-5 py-2.5 font-heading text-sm font-semibold tracking-wide text-[var(--bob-amber-fg)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {pending ? 'Resolving…' : 'Resolve Mission & Advance'}
        </button>

      </div>
    </form>
  );
}
