'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  performAlchemistProject,
  assignLaborers,
  completeLaborersAlchemists,
  type AlchemistProjectState,
  type AssignLaborerState,
} from '@/server/actions/phase';
import type { Alchemist, Laborers, LongTermProject } from '@/lib/types';
import type { ActionQuality } from '@/lib/campaign-utils';
import { LegionDice } from '@/components/legion';

interface AlchemistsLaborersFormProps {
  campaignId: string;
  alchemists: Alchemist[];
  laborers: Laborers | null;
  longTermProjects: LongTermProject[];
}

const QUALITY_LABELS: Record<ActionQuality, string> = {
  POOR: 'Poor',
  STANDARD: 'Standard',
  FINE: 'Fine',
  EXCEPTIONAL: 'Exceptional',
};

function AlchemistCard({
  alchemist,
  campaignId,
}: {
  alchemist: Alchemist;
  campaignId: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AlchemistProjectState | null, FormData>(
    performAlchemistProject, null,
  );

  useEffect(() => {
    if (state?.result) router.refresh();
  }, [state?.result, router]);

  const dangerous = alchemist.corruption >= 5;
  const corrupted = alchemist.status === 'CORRUPTED';

  return (
    <div className={`rounded-md border p-3 ${corrupted ? 'border-red-500/50 bg-red-900/10' : 'border-border bg-legion-bg-elevated'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="text-sm font-medium text-legion-text-primary">{alchemist.name}</span>
          {corrupted && (
            <span className="ml-2 text-xs font-medium text-red-400">CORRUPTED</span>
          )}
        </div>
        {/* Corruption clock pips */}
        <span
          className="flex gap-0.5 shrink-0"
          aria-label={`${alchemist.corruption} of 8 corruption`}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className={`inline-block w-2 h-2 rounded-full border ${
                i < alchemist.corruption
                  ? dangerous ? 'bg-red-500 border-red-500' : 'bg-legion-amber border-legion-amber'
                  : 'bg-transparent border-legion-text-muted/40'
              }`}
            />
          ))}
        </span>
      </div>

      {corrupted ? (
        <p className="text-xs text-red-400">
          This alchemist has reached maximum corruption and must be dealt with.
        </p>
      ) : state?.result ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] text-legion-text-muted uppercase tracking-widest">Effect: {QUALITY_LABELS[state.result.quality]}</p>
            <LegionDice 
              results={state.result.dice_effect} 
              bestDieIndex={state.result.dice_effect.indexOf(Math.max(...state.result.dice_effect))} 
            />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-legion-text-muted uppercase tracking-widest">Corruption: +{state.result.corruption_added} (Total {state.result.new_corruption}/8)</p>
            <LegionDice 
              results={state.result.dice_corruption} 
              worstDieIndex={state.result.dice_corruption.indexOf(Math.max(...state.result.dice_corruption))} 
            />
          </div>
          {state.result.corrupted && (
            <p className="text-xs text-red-400 font-medium">Alchemist corrupted! Must be dealt with.</p>
          )}
        </div>
      ) : (
        <>
          {state?.errors?._form && (
            <p role="alert" className="text-xs text-red-400 mb-1">{state.errors._form.join(', ')}</p>
          )}
          <form action={action}>
            <input type="hidden" name="campaign_id" value={campaignId} />
            <input type="hidden" name="alchemist_id" value={alchemist.id} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-md border border-legion-amber/50 px-3 py-1.5 text-xs font-medium text-legion-amber hover:bg-legion-amber/10 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {pending ? 'Rolling…' : 'Run project'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function LaborerAssignment({
  campaignId,
  laborers,
  longTermProjects,
}: {
  campaignId: string;
  laborers: Laborers;
  longTermProjects: LongTermProject[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AssignLaborerState | null, FormData>(
    assignLaborers, null,
  );

  useEffect(() => {
    if (state?.result) router.refresh();
  }, [state?.result, router]);

  const activeProjects = longTermProjects.filter((p) => !p.completed_at);

  if (state?.result) {
    return (
      <div className="rounded-md border border-border bg-legion-bg-elevated p-3">
        <p className="text-xs text-legion-text-muted mb-0.5">Laborers ({laborers.count} units)</p>
        <p className="text-sm text-legion-amber font-medium">
          Assigned to {state.result.project_name}: +{state.result.segments_added} segment{state.result.segments_added !== 1 ? 's' : ''}
          {state.result.completed && ' — Project complete!'}
        </p>
      </div>
    );
  }

  if (laborers.current_project_id) {
    const project = longTermProjects.find((p) => p.id === laborers.current_project_id);
    return (
      <div className="rounded-md border border-border bg-legion-bg-elevated p-3">
        <p className="text-xs text-legion-text-muted">
          Laborers ({laborers.count} units) already assigned to {project?.name ?? 'a project'} this phase.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-legion-bg-elevated p-3">
      <p className="text-xs text-legion-text-muted mb-2">
        Laborers ({laborers.count} unit{laborers.count !== 1 ? 's' : ''}) — each auto-ticks 1 segment on a project.
      </p>
      {state?.errors?._form && (
        <p role="alert" className="text-xs text-red-400 mb-1">{state.errors._form.join(', ')}</p>
      )}
      {activeProjects.length === 0 ? (
        <p className="text-xs text-legion-text-muted italic">No active projects to assign to.</p>
      ) : (
        <form action={action} className="flex gap-2 flex-wrap items-end">
          <input type="hidden" name="campaign_id" value={campaignId} />
          <div className="flex-1 min-w-[160px]">
            <label htmlFor="laborer-project" className="block text-xs text-legion-text-muted mb-1">
              Assign to project
            </label>
            <select
              id="laborer-project"
              name="project_id"
              required
              className="w-full rounded-md border border-border bg-legion-bg-base px-2 py-1.5 text-sm text-legion-text-primary focus:outline-none focus:ring-2 focus:ring-legion-border-focus min-h-[36px]"
            >
              <option value="">— Select —</option>
              {activeProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.segments_filled}/{p.clock_size})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-legion-amber/50 px-3 py-1.5 text-xs font-medium text-legion-amber hover:bg-legion-amber/10 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {pending ? 'Assigning…' : 'Assign'}
          </button>
        </form>
      )}
    </div>
  );
}

/**
 * QM Step 6: Laborers auto-tick projects; Alchemists roll for effect + corruption.
 * BoB rulebook p.139
 */
export function AlchemistsLaborersForm({
  campaignId,
  alchemists,
  laborers,
  longTermProjects,
}: AlchemistsLaborersFormProps) {
  const activeAlchemists = alchemists.filter((a) => a.status !== 'DEAD');
  const hasLaborers = laborers && laborers.count > 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-legion-text-muted">
        Assign Laborers to auto-tick projects, then run Alchemist projects.
        When done, mark Step 6 complete.
      </p>

      {/* Laborers */}
      {hasLaborers ? (
        <div>
          <h4 className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-2">
            Laborers
          </h4>
          <LaborerAssignment
            campaignId={campaignId}
            laborers={laborers}
            longTermProjects={longTermProjects}
          />
        </div>
      ) : (
        <p className="text-xs text-legion-text-muted">No Laborers in roster.</p>
      )}

      {/* Alchemists */}
      {activeAlchemists.length > 0 ? (
        <div>
          <h4 className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-2">
            Alchemist Projects
          </h4>
          <div className="flex flex-col gap-2">
            {activeAlchemists.map((a) => (
              <AlchemistCard key={a.id} alchemist={a} campaignId={campaignId} />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-legion-text-muted">No Alchemists in roster.</p>
      )}

      {/* Complete Step 6 */}
      <form action={completeLaborersAlchemists}>
        <input type="hidden" name="campaign_id" value={campaignId} />
        <button
          type="submit"
          className="rounded-md bg-legion-amber px-5 py-2.5 font-heading text-sm font-semibold tracking-wide text-[var(--bob-amber-fg)] hover:opacity-90 transition-opacity min-h-[44px]"
        >
          Complete Step 6 — Advance to Commander Decision
        </button>
      </form>
    </div>
  );
}
