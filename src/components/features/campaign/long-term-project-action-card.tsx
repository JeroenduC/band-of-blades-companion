'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { performLongTermProject, type LongTermProjectState } from '@/server/actions/phase';
import type { Campaign, LongTermProject } from '@/lib/types';
import type { ActionQuality } from '@/lib/campaign-utils';
import { LegionDice } from '@/components/legion';

interface LongTermProjectActionCardProps {
  campaign: Campaign;
  longTermProjects: LongTermProject[];
}

const QUALITY_LABELS: Record<ActionQuality, string> = {
  POOR: 'Poor',
  STANDARD: 'Standard',
  FINE: 'Fine',
  EXCEPTIONAL: 'Exceptional',
};

const QUALITY_COLOURS: Record<ActionQuality, string> = {
  POOR: 'text-red-400',
  STANDARD: 'text-legion-text-primary',
  FINE: 'text-green-400',
  EXCEPTIONAL: 'text-legion-amber',
};

/**
 * QM Step 4: Long-Term Project campaign action.
 * Work an existing project clock or create a new one. Rolls 2d6 for segments.
 * BoB rulebook p.138
 */
export function LongTermProjectActionCard({ campaign, longTermProjects }: LongTermProjectActionCardProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState<LongTermProjectState | null, FormData>(
    performLongTermProject, null,
  );
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [boosts, setBoosts] = useState(0);

  useEffect(() => {
    if (state?.result && !state.errors) router.refresh();
  }, [state?.result, state?.errors, router]);

  const activeProjects = longTermProjects.filter((p) => !p.completed_at);
  const workedThisPhase = activeProjects.filter(
    (p) => p.phase_last_worked === campaign.phase_number,
  );

  if (state?.result && !state.errors?._form) {
    const r = state.result;
    return (
      <div className="rounded-md border border-border bg-legion-bg-elevated p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-sm font-medium text-legion-text-primary">Long-Term Project</span>
          <span className="text-xs font-mono text-legion-text-muted">Clock</span>
        </div>
        <p className="text-sm font-medium text-legion-text-primary mb-1">{r.project_name}</p>
        <p className="text-sm mb-1">
          <span className={QUALITY_COLOURS[r.final_quality]}>{QUALITY_LABELS[r.final_quality]}</span>
          <span className="text-xs text-legion-text-muted ml-1">
            +{r.segments_added} segment{r.segments_added !== 1 ? 's' : ''}
          </span>
        </p>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-2 rounded-full bg-legion-text-muted/20 overflow-hidden">
            <div
              className="h-full bg-legion-amber rounded-full"
              style={{ width: `${(r.new_total / r.clock_size) * 100}%` }}
              aria-hidden="true"
            />
          </div>
          <span className="font-mono text-xs text-legion-text-muted">{r.new_total}/{r.clock_size}</span>
        </div>

        <div className="mb-3">
          <LegionDice 
            results={r.dice} 
            bestDieIndex={r.dice.indexOf(Math.max(...r.dice))} 
            className="mb-2"
          />
          {r.base_quality !== r.final_quality && (
            <p className="text-[10px] text-legion-amber font-mono uppercase">
              Boosted from {QUALITY_LABELS[r.base_quality]}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => { setSelectedProjectId(''); setBoosts(0); router.refresh(); }}
          className="mt-3 text-xs text-legion-amber underline underline-offset-4"
        >
          Work another project
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-legion-bg-elevated p-4">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-medium text-legion-text-primary">Long-Term Project</span>
        <span className="text-xs font-mono text-legion-text-muted">Clock</span>
      </div>
      <p className="text-xs text-legion-text-muted mb-3">
        Work a clock toward a custom benefit. Roll 2d6 — take the best die for progress.
        Can work a different project each action.
      </p>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-3" role="group" aria-label="Project mode">
        <button
          type="button"
          onClick={() => setMode('select')}
          className={`text-xs px-3 py-1.5 rounded border min-h-[36px] transition-colors ${
            mode === 'select'
              ? 'border-legion-amber text-legion-amber bg-legion-amber/10'
              : 'border-border text-legion-text-muted hover:text-legion-text-primary'
          }`}
        >
          Work existing
        </button>
        <button
          type="button"
          onClick={() => setMode('create')}
          className={`text-xs px-3 py-1.5 rounded border min-h-[36px] transition-colors ${
            mode === 'create'
              ? 'border-legion-amber text-legion-amber bg-legion-amber/10'
              : 'border-border text-legion-text-muted hover:text-legion-text-primary'
          }`}
        >
          New project
        </button>
      </div>

      {(state?.errors?._form || state?.errors?.project_id) && (
        <p role="alert" className="text-xs text-red-400 mb-2">
          {[...(state.errors._form ?? []), ...(state.errors.project_id ?? [])].join(', ')}
        </p>
      )}

      <form action={action} className="space-y-3">
        <input type="hidden" name="campaign_id" value={campaign.id} />

        {mode === 'select' ? (
          <div>
            <label htmlFor="ltp-project-select" className="block text-xs text-legion-text-muted mb-1">
              Project
            </label>
            {activeProjects.length === 0 ? (
              <p className="text-xs text-legion-text-muted italic">
                No active projects. Create one to begin.
              </p>
            ) : (
              <select
                id="ltp-project-select"
                name="project_id"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full rounded-md border border-border bg-legion-bg-base px-2 py-1.5 text-sm text-legion-text-primary focus:outline-none focus:ring-2 focus:ring-legion-border-focus min-h-[36px]"
              >
                <option value="">— Select project —</option>
                {activeProjects.map((p) => {
                  const alreadyWorked = p.phase_last_worked === campaign.phase_number;
                  return (
                    <option key={p.id} value={p.id} disabled={alreadyWorked}>
                      {p.name} ({p.segments_filled}/{p.clock_size})
                      {alreadyWorked ? ' — worked this phase' : ''}
                    </option>
                  );
                })}
              </select>
            )}
            {workedThisPhase.length > 0 && activeProjects.length === workedThisPhase.length && (
              <p className="mt-1 text-xs text-legion-text-muted">
                All active projects were already worked this phase. Create a new one or wait until next phase.
              </p>
            )}
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="ltp-name" className="block text-xs text-legion-text-muted mb-1">
                Project name
              </label>
              <input
                id="ltp-name"
                name="name"
                type="text"
                maxLength={80}
                placeholder="e.g. Field Fortifications"
                className="w-full rounded-md border border-border bg-legion-bg-base px-2 py-1.5 text-sm text-legion-text-primary focus:outline-none focus:ring-2 focus:ring-legion-border-focus min-h-[36px]"
                required
              />
              {state?.errors?.name && (
                <p role="alert" className="text-xs text-red-400 mt-0.5">{state.errors.name.join(', ')}</p>
              )}
            </div>
            <div>
              <label htmlFor="ltp-description" className="block text-xs text-legion-text-muted mb-1">
                What completing this project achieves
              </label>
              <input
                id="ltp-description"
                name="description"
                type="text"
                maxLength={300}
                placeholder="e.g. −1 pressure on next advance"
                className="w-full rounded-md border border-border bg-legion-bg-base px-2 py-1.5 text-sm text-legion-text-primary focus:outline-none focus:ring-2 focus:ring-legion-border-focus min-h-[36px]"
              />
            </div>
            <div>
              <label htmlFor="ltp-clock-size" className="block text-xs text-legion-text-muted mb-1">
                Clock size (4–12 segments)
              </label>
              <select
                id="ltp-clock-size"
                name="clock_size"
                defaultValue="8"
                className="w-full rounded-md border border-border bg-legion-bg-base px-2 py-1.5 text-sm text-legion-text-primary focus:outline-none focus:ring-2 focus:ring-legion-border-focus min-h-[36px]"
              >
                {[4, 6, 8, 10, 12].map((n) => (
                  <option key={n} value={n}>{n} segments</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Boost control */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-legion-text-muted">Boost (1 Supply per tier)</span>
            <span className="text-xs font-mono text-legion-amber">Supply: {campaign.supply}</span>
          </div>
          <input type="hidden" name="boosts" value={boosts} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBoosts((b) => Math.max(0, b - 1))}
              disabled={boosts === 0}
              className="rounded border border-border px-2 py-1 text-xs text-legion-text-primary disabled:opacity-40 min-h-[36px] min-w-[36px]"
              aria-label="Decrease boosts"
            >−</button>
            <span className="font-mono text-sm text-legion-text-primary w-6 text-center">{boosts}</span>
            <button
              type="button"
              onClick={() => setBoosts((b) => Math.min(campaign.supply, b + 1))}
              disabled={boosts >= campaign.supply || boosts >= 3}
              className="rounded border border-border px-2 py-1 text-xs text-legion-text-primary disabled:opacity-40 min-h-[36px] min-w-[36px]"
              aria-label="Increase boosts"
            >+</button>
            {boosts > 0 && <span className="text-xs text-legion-text-muted">−{boosts} Supply</span>}
          </div>
        </div>

        <button
          type="submit"
          disabled={pending || (mode === 'select' && !selectedProjectId && activeProjects.length > 0)}
          className="rounded-md bg-legion-amber px-4 py-2 text-xs font-semibold text-[var(--bob-amber-fg)] hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[44px]"
        >
          {pending ? 'Working…' : mode === 'create' ? 'Create & Work' : 'Roll for Progress'}
        </button>
      </form>
    </div>
  );
}
