'use client';

import { useActionState } from 'react';
import { completeBackAtCamp } from '@/server/actions/phase';
import type { BackAtCampState } from '@/server/actions/phase';
import type { BackAtCampScene, MoraleLevel } from '@/lib/types';

interface BackAtCampFormProps {
  campaignId: string;
  morale: number;
  scenes: BackAtCampScene[];
  activeLevel: MoraleLevel;
  fallback: boolean;
}

const LEVEL_LABEL: Record<MoraleLevel, string> = {
  HIGH: 'High morale',
  MEDIUM: 'Medium morale',
  LOW: 'Low morale',
};

export function BackAtCampForm({
  campaignId,
  morale,
  scenes,
  activeLevel,
  fallback,
}: BackAtCampFormProps) {
  const [state, action, pending] = useActionState<BackAtCampState | null, FormData>(
    completeBackAtCamp,
    null,
  );

  const errors = state?.errors;
  const availableScenes = scenes.filter((s) => !s.used);
  const usedScenes = scenes.filter((s) => s.used);

  return (
    <form action={action} noValidate aria-label="Back at Camp scene selection">
      <input type="hidden" name="campaign_id" value={campaignId} />

      <div className="flex flex-col gap-6">

        {errors?._form && (
          <div role="alert" className="rounded-md bg-red-900/30 border border-red-700 px-4 py-3">
            <p className="text-sm text-red-400">{errors._form.join(', ')}</p>
          </div>
        )}

        {/* Context */}
        <div className="flex items-center gap-3 text-sm text-legion-text-muted">
          <span>Current morale: <span className="text-legion-text-primary font-medium">{morale}</span></span>
          <span aria-hidden>·</span>
          <span>Showing: <span className="text-legion-text-primary font-medium">{LEVEL_LABEL[activeLevel]}</span> scenes</span>
        </div>

        {fallback && (
          <div className="rounded-md border border-legion-amber/30 bg-legion-amber/5 px-4 py-3">
            <p className="text-sm text-legion-amber">
              All {LEVEL_LABEL[activeLevel.toLowerCase() === 'medium' ? 'HIGH' : activeLevel]} scenes have been used. Showing {LEVEL_LABEL[activeLevel]} scenes instead.
            </p>
          </div>
        )}

        {/* Scene selection */}
        <fieldset>
          <legend className="font-heading text-sm font-semibold uppercase tracking-widest text-legion-text-primary mb-1">
            Choose a scene
          </legend>
          <p id="scene-desc" className="text-xs text-legion-text-muted mb-3">
            Select the scene that best fits how the Legion is feeling after this mission. Read it aloud to set the mood.
          </p>

          {availableScenes.length === 0 ? (
            <p className="text-sm text-legion-text-muted italic">
              All scenes at this morale level have been used.
            </p>
          ) : (
            <div className="flex flex-col gap-2" aria-describedby="scene-desc">
              {availableScenes.map((scene) => (
                <label
                  key={scene.id}
                  className="flex items-start gap-3 cursor-pointer rounded-md border border-border p-4 hover:border-legion-amber/50 transition-colors has-[:checked]:border-legion-amber has-[:checked]:bg-legion-bg-elevated"
                >
                  <input
                    type="radio"
                    name="scene_id"
                    value={scene.id}
                    className="mt-0.5 accent-[var(--bob-amber)] w-4 h-4 shrink-0"
                  />
                  <span className="text-sm text-legion-text-primary leading-relaxed">
                    {scene.scene_text}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* Used scenes shown as crossed off */}
          {usedScenes.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-2">
                Already used
              </p>
              <div className="flex flex-col gap-2">
                {usedScenes.map((scene) => (
                  <div
                    key={scene.id}
                    className="rounded-md border border-border/40 p-4 opacity-50"
                    aria-label={`Used in phase ${scene.used_in_phase}: ${scene.scene_text}`}
                  >
                    <span className="text-sm text-legion-text-muted line-through leading-relaxed">
                      {scene.scene_text}
                    </span>
                    {scene.used_in_phase && (
                      <span className="ml-2 text-xs font-mono text-legion-text-muted">
                        (phase {scene.used_in_phase})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {errors?.scene_id && (
            <p role="alert" className="mt-2 text-xs text-red-400">
              Error: {errors.scene_id.join(', ')}
            </p>
          )}
        </fieldset>

        {/* Notes */}
        <div>
          <label
            htmlFor="back-at-camp-notes"
            className="block font-heading text-sm font-semibold uppercase tracking-widest text-legion-text-primary mb-1"
          >
            Scene notes (not required)
          </label>
          <p id="notes-desc" className="text-xs text-legion-text-muted mb-2">
            How did the scene play out? Any memorable moments to record.
          </p>
          <textarea
            id="back-at-camp-notes"
            name="notes"
            rows={3}
            aria-describedby={errors?.notes ? 'notes-error notes-desc' : 'notes-desc'}
            aria-invalid={!!errors?.notes}
            className="w-full rounded-md border border-border bg-legion-bg-elevated px-3 py-2 text-sm text-legion-text-primary placeholder:text-legion-text-muted/60 focus:outline-none focus:ring-2 focus:ring-[var(--bob-border-focus)] resize-none"
            placeholder="What happened during the scene?"
          />
          {errors?.notes && (
            <p id="notes-error" role="alert" className="mt-1 text-xs text-red-400">
              Error: {errors.notes.join(', ')}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending || availableScenes.length === 0}
          className="self-start rounded-md bg-legion-amber px-5 py-2.5 font-heading text-sm font-semibold tracking-wide text-[var(--bob-amber-fg)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {pending ? 'Confirming…' : 'Confirm Scene & Advance'}
        </button>

      </div>
    </form>
  );
}
