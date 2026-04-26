'use client';

import { useActionState } from 'react';
import { completeBackAtCamp } from '@/server/actions/phase';
import type { BackAtCampState } from '@/server/actions/phase';
import type { BackAtCampScene, MoraleLevel } from '@/lib/types';
import { cn } from '@/lib/utils';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';

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
  const availableScenes = scenes.filter((s) => s.times_used < s.max_uses);
  const usedScenes = scenes.filter((s) => s.times_used > 0);

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
        <div className="flex items-center gap-3 text-sm text-legion-text-muted bg-legion-bg-elevated/50 p-3 rounded-md border border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-tighter opacity-70">Morale</span>
            <span className={cn(
              "px-2 py-0.5 rounded font-bold text-xs",
              activeLevel === 'HIGH' ? "bg-green-900/30 text-green-400 border border-green-700/50" :
              activeLevel === 'MEDIUM' ? "bg-legion-amber/20 text-legion-amber border border-legion-amber/40" :
              "bg-red-900/30 text-red-400 border border-red-700/50"
            )}>
              {morale} ({LEVEL_LABEL[activeLevel]})
            </span>
          </div>
          <span aria-hidden className="opacity-30">|</span>
          <p className="italic text-xs opacity-80">Scenes should take 5-10 minutes and incorporate mission themes.</p>
        </div>

        {fallback && (
          <div className="rounded-md border border-legion-amber/30 bg-legion-amber/5 px-4 py-3">
            <p className="text-sm text-legion-amber">
              All higher morale scenes have been used. Showing {LEVEL_LABEL[activeLevel]} scenes instead.
            </p>
          </div>
        )}

        {/* Scene selection */}
        <fieldset className="space-y-4">
          <legend className="sr-only">Choose a scene</legend>
          <div className="flex items-baseline justify-between mb-1">
            <h4 className="font-heading text-sm font-semibold uppercase tracking-widest text-legion-text-primary">
              The Records of the Camp
            </h4>
            <span className="text-[10px] font-mono text-legion-text-muted uppercase">Select one scene</span>
          </div>

          {availableScenes.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-border rounded-md">
              <p className="text-sm text-legion-text-muted italic">
                All scenes at this morale level have been exhausted.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {availableScenes.map((scene) => (
                <label
                  key={scene.id}
                  className="group relative flex items-start gap-4 cursor-pointer rounded-lg border border-border p-5 hover:border-legion-amber/50 hover:bg-white/5 transition-all has-[:checked]:border-legion-amber has-[:checked]:bg-legion-amber/5 has-[:checked]:ring-1 has-[:checked]:ring-legion-amber/20"
                >
                  <div className="mt-1">
                    <input
                      type="radio"
                      name="scene_id"
                      value={scene.id}
                      className="accent-[var(--bob-amber)] w-4 h-4 shrink-0"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-legion-text-primary leading-relaxed font-medium">
                      {scene.scene_text}
                    </p>
                    {scene.max_uses > 1 && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="flex gap-1">
                          {Array.from({ length: scene.max_uses }).map((_, i) => (
                            <div 
                              key={i} 
                              className={cn(
                                "w-3 h-1 rounded-full",
                                i < scene.times_used ? "bg-legion-amber" : "bg-border"
                              )} 
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-mono uppercase text-legion-text-muted">
                          Usage: {scene.times_used}/{scene.max_uses}
                        </span>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Already Recorded (Used scenes) */}
          {usedScenes.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border/50">
              <h5 className="text-[10px] font-mono uppercase tracking-[0.2em] text-legion-text-muted mb-4 opacity-70">
                Previously Recorded
              </h5>
              <div className="grid grid-cols-1 gap-2">
                {usedScenes.map((scene) => (
                  <div
                    key={scene.id}
                    className="group flex items-center justify-between rounded-md border border-border/30 bg-black/20 p-3 opacity-60 transition-opacity hover:opacity-100"
                  >
                    <span className={cn(
                      "text-xs text-legion-text-muted leading-relaxed",
                      scene.times_used >= scene.max_uses ? "line-through opacity-50" : ""
                    )}>
                      {scene.scene_text}
                    </span>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      {scene.used_in_phase && (
                        <span className="text-[9px] font-mono text-legion-text-muted bg-border/20 px-1.5 py-0.5 rounded">
                          PHASE {scene.used_in_phase}
                        </span>
                      )}
                      <span className="text-[9px] font-mono text-legion-text-muted">
                        {scene.times_used}/{scene.max_uses}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errors?.scene_id && (
            <p role="alert" className="mt-2 text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-900/30">
              <span className="font-bold uppercase text-[10px] mr-2">Selection Error:</span> 
              {errors.scene_id.join(', ')}
            </p>
          )}
        </fieldset>

        {/* Notes */}
        <div className="bg-legion-bg-elevated/30 p-5 rounded-lg border border-border/50">
          <label
            htmlFor="back-at-camp-notes"
            className="block font-heading text-xs font-semibold uppercase tracking-widest text-legion-text-primary mb-3"
          >
            Annals Entry (Optional)
          </label>
          <textarea
            id="back-at-camp-notes"
            name="notes"
            rows={4}
            aria-describedby={errors?.notes ? 'notes-error notes-desc' : 'notes-desc'}
            aria-invalid={!!errors?.notes}
            className="w-full rounded-md border border-border bg-black/20 px-4 py-3 text-sm text-legion-text-primary placeholder:text-legion-text-muted/40 focus:outline-none focus:ring-1 focus:ring-legion-amber/50 transition-all resize-none shadow-inner"
            placeholder="Record the details of this scene for the Annals..."
          />
          <p id="notes-desc" className="text-[10px] text-legion-text-muted mt-2 italic opacity-70 text-right">
            These notes will be preserved in the campaign's permanent record.
          </p>
          {errors?.notes && (
            <p id="notes-error" role="alert" className="mt-1 text-xs text-red-400">
              {errors.notes.join(', ')}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending || availableScenes.length === 0}
          className="relative group w-full overflow-hidden rounded-md bg-legion-amber p-[1px] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
        >
          <div className="bg-legion-amber px-8 py-3 transition-colors group-hover:bg-legion-amber/90">
            <span className="font-heading text-sm font-bold uppercase tracking-widest text-[var(--bob-amber-fg)]">
              {pending ? 'Recording Entry...' : 'Seal Entry & Advance'}
            </span>
          </div>
        </button>

      </div>
    </form>
  );
}
