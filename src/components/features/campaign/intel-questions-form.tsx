'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitIntelQuestions } from '@/server/actions/phase';
import type { IntelQuestionsState } from '@/server/actions/phase';
import { getUnlockedTiers } from '@/lib/intel-questions';

interface IntelQuestionsFormProps {
  campaignId: string;
  intel: number;
  /** Called when questions are successfully submitted so the parent can show missions */
  onSubmitted?: () => void;
}

/**
 * Commander sub-step: ask intel questions before designating missions.
 *
 * Shows one question group per unlocked intel tier. The Commander picks
 * one question from each group; selections are logged for the GM to
 * answer during the session. This does not advance the phase state.
 *
 * BoB rulebook pp.122-123.
 */
export function IntelQuestionsForm({ campaignId, intel, onSubmitted }: IntelQuestionsFormProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState<IntelQuestionsState | null, FormData>(
    submitIntelQuestions,
    null,
  );

  const unlockedTiers = getUnlockedTiers(intel);
  // One selected question ID per tier index (null = none selected yet)
  const [selections, setSelections] = useState<(string | null)[]>(
    () => unlockedTiers.map(() => null),
  );
  const [skipped, setSkipped] = useState(false);

  const allTiersAnswered = selections.every((s) => s !== null);

  useEffect(() => {
    if (state?.success) {
      onSubmitted?.();
      router.refresh();
    }
  }, [state?.success, onSubmitted, router]);

  if (skipped || state?.success) {
    return null;
  }

  function buildHiddenQuestionsJson(): string {
    const selected = unlockedTiers
      .map((tier, i) => {
        const qId = selections[i];
        if (!qId) return null;
        const question = tier.questions.find((q) => q.id === qId);
        return question ? { tier: tier.label, question: question.text } : null;
      })
      .filter(Boolean);
    return JSON.stringify(selected);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="font-heading text-sm font-semibold uppercase tracking-widest text-legion-text-primary">
          Intel Questions
        </h3>
        <p className="text-xs text-legion-text-muted">
          You have <span className="text-legion-amber font-medium">{intel} Intel</span>.
          Select one question from each unlocked tier — the GM will answer these at the start of the session.
          Selecting a question costs no Intel.
        </p>
      </div>

      {state?.errors?._form && (
        <div role="alert" className="rounded-md bg-red-900/30 border border-red-700 px-4 py-3">
          <p className="text-sm text-red-400">{state.errors._form.join(', ')}</p>
        </div>
      )}

      <div className="space-y-5">
        {unlockedTiers.map((tier, tierIndex) => (
          <fieldset key={tier.minIntel}>
            <legend className="flex items-center gap-2 mb-2">
              <span className="font-heading text-xs font-semibold uppercase tracking-widest text-legion-text-primary">
                {tier.label}
              </span>
              {selections[tierIndex] ? (
                <span className="text-[10px] font-mono text-green-400 border border-green-700/50 bg-green-900/20 rounded px-1.5 py-0.5">
                  selected
                </span>
              ) : (
                <span className="text-[10px] font-mono text-legion-text-muted border border-border rounded px-1.5 py-0.5">
                  pick one
                </span>
              )}
            </legend>
            <div className="flex flex-col gap-1.5">
              {tier.questions.map((q) => {
                const isSelected = selections[tierIndex] === q.id;
                return (
                  <label
                    key={q.id}
                    className={`flex items-start gap-3 cursor-pointer rounded-md border p-3 text-sm transition-colors
                      ${isSelected
                        ? 'border-legion-amber bg-legion-bg-elevated text-legion-text-primary'
                        : 'border-border hover:border-legion-amber/40 text-legion-text-muted hover:text-legion-text-primary'
                      }`}
                  >
                    <input
                      type="radio"
                      name={`tier_${tierIndex}`}
                      value={q.id}
                      checked={isSelected}
                      onChange={() => {
                        setSelections((prev) => {
                          const next = [...prev];
                          next[tierIndex] = q.id;
                          return next;
                        });
                      }}
                      className="mt-0.5 accent-[var(--bob-amber)] w-4 h-4 shrink-0"
                    />
                    <span>{q.text}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <form action={action} className="flex flex-wrap gap-3">
        <input type="hidden" name="campaign_id" value={campaignId} />
        <input type="hidden" name="questions" value={buildHiddenQuestionsJson()} />
        <button
          type="submit"
          disabled={pending || !allTiersAnswered}
          className="rounded-md bg-legion-amber px-5 py-2.5 font-heading text-sm font-semibold tracking-wide text-[var(--bob-amber-fg)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {pending ? 'Submitting…' : 'Submit Questions'}
        </button>
        <button
          type="button"
          onClick={() => setSkipped(true)}
          className="rounded-md border border-border px-5 py-2.5 font-heading text-sm font-semibold tracking-wide text-legion-text-muted hover:border-legion-amber/40 hover:text-legion-text-primary transition-colors min-h-[44px]"
        >
          Skip Intel Questions
        </button>
      </form>

      {!allTiersAnswered && (
        <p className="text-xs text-legion-text-muted">
          Select one question from each tier to submit, or click Skip to proceed directly to mission selection.
        </p>
      )}
    </div>
  );
}
