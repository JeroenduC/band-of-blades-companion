'use client';

import React, { useActionState, useState } from 'react';
import { submitTale } from '@/server/actions/phase/lorekeeper';
import type { TaleState } from '@/server/actions/phase/lorekeeper';
import { TALES, getNextTale, type Tale } from '@/lib/tales';
import type { LongTermProject } from '@/lib/types';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { BenefitCard } from '@/components/features/campaign/benefit-card';
import { cn } from '@/lib/utils';

interface TalesOfLegionFormProps {
  campaignId: string;
  talesToldIds: string[];
  activeProjects: LongTermProject[];
}

export function TalesOfLegionForm({
  campaignId,
  talesToldIds,
  activeProjects,
}: TalesOfLegionFormProps) {
  const [state, action, pending] = useActionState<TaleState | null, FormData>(
    submitTale,
    null,
  );

  // If all 5 told once, allow free choice. Otherwise, force the next one.
  const allToldOnce = talesToldIds.length >= 5;
  const forcedTale = getNextTale(talesToldIds);
  
  const [selectedTaleId, setSelectedTaleId] = useState<string>(forcedTale.id);
  const [selectedBenefitId, setSelectedBenefitId] = useState<string | null>(null);

  const currentTale = TALES.find(t => t.id === selectedTaleId) || forcedTale;
  const errors = state?.errors;

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="campaign_id" value={campaignId} />
      <input type="hidden" name="tale_id" value={selectedTaleId} />
      <input type="hidden" name="benefit_id" value={selectedBenefitId || ''} />

      {errors?._form && (
        <div role="alert" className="rounded-md bg-red-900/30 border border-red-700 px-4 py-3">
          <p className="text-sm text-red-400">{errors._form.join(', ')}</p>
        </div>
      )}

      {/* Tale Selection (only if all told once) */}
      {allToldOnce && (
        <div className="space-y-4">
          <label className="block text-sm font-heading font-semibold uppercase tracking-widest text-legion-text-muted">
            Select a Tale to tell
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TALES.map((tale) => (
              <button
                key={tale.id}
                type="button"
                onClick={() => setSelectedTaleId(tale.id)}
                className={cn(
                  "p-4 text-left rounded-lg border transition-all",
                  selectedTaleId === tale.id
                    ? "border-legion-amber bg-legion-amber/10 ring-1 ring-legion-amber/30"
                    : "border-border bg-legion-bg-elevated/50 hover:border-border-focus"
                )}
              >
                <p className="font-heading text-sm font-bold text-legion-text uppercase tracking-tight">
                  {tale.title}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Narrative Prompts */}
      <LegionCard className="border-legion-amber/20">
        <LegionCardHeader className="bg-legion-amber/5 border-b border-legion-amber/10">
          <LegionCardTitle className="text-xl font-heading font-bold text-legion-amber uppercase tracking-tight">
            {currentTale.title}
          </LegionCardTitle>
        </LegionCardHeader>
        <LegionCardContent className="pt-6 space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-legion-text-muted opacity-70">
              Narrative Prompts
            </h4>
            <ul className="list-none space-y-3">
              {currentTale.prompts.map((prompt, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-legion-amber font-mono text-xs mt-1">Q.</span>
                  <p className="text-sm text-legion-text leading-relaxed italic">
                    {prompt}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <label htmlFor="answers" className="block text-xs font-heading font-semibold uppercase tracking-widest text-legion-text-muted">
              Record the answers
            </label>
            <textarea
              id="answers"
              name="answers"
              rows={4}
              required
              className="w-full rounded-md border border-border bg-black/20 px-4 py-3 text-sm text-legion-text-primary placeholder:text-legion-text-muted/30 focus:outline-none focus:ring-1 focus:ring-legion-amber/50 transition-all resize-none"
              placeholder="Who was the first Commander? How are they remembered?..."
            />
          </div>
        </LegionCardContent>
      </LegionCard>

      {/* Benefit Selection */}
      <div className="space-y-4">
        <h4 className="text-sm font-heading font-semibold uppercase tracking-widest text-legion-text-muted">
          Choose a Benefit for the Legion
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentTale.benefits.map((benefit) => (
            <BenefitCard
              key={benefit.id}
              label={benefit.label}
              description={benefit.description}
              effect={benefit.mechanical_effect}
              isSelected={selectedBenefitId === benefit.id}
              onClick={() => setSelectedBenefitId(benefit.id)}
            />
          ))}
        </div>
        {errors?.benefit_id && (
          <p className="text-xs text-red-400 font-bold uppercase tracking-tighter">
            {errors.benefit_id.join(', ')}
          </p>
        )}
      </div>

      {/* LTP Selection (Conditional) */}
      {selectedBenefitId && currentTale.benefits.find(b => b.id === selectedBenefitId)?.effect_type === 'LTP_TICKS' && (
        <div className="p-4 rounded-lg border border-legion-amber/30 bg-legion-amber/5 space-y-4 animate-in fade-in slide-in-from-top-2">
          <label htmlFor="target_ltp_id" className="block text-xs font-heading font-semibold uppercase tracking-widest text-legion-text-muted">
            Target Long-Term Project
          </label>
          <select
            id="target_ltp_id"
            name="target_ltp_id"
            className="w-full rounded-md border border-border bg-legion-bg-elevated px-3 py-2 text-sm text-legion-text-primary focus:outline-none focus:ring-1 focus:ring-legion-amber/50"
          >
            <option value="">— Select a project —</option>
            {activeProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.segments_filled}/{p.clock_size})</option>
            ))}
          </select>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={pending || !selectedBenefitId}
        className="w-full py-4 rounded-lg bg-legion-amber text-[var(--bob-amber-fg)] font-heading font-bold uppercase tracking-widest shadow-lg shadow-legion-amber/20 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100"
      >
        {pending ? 'Recording the Tale...' : 'Complete the Tale'}
      </button>
    </form>
  );
}
