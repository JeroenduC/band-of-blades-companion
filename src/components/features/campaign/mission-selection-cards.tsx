'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { selectMissions } from '@/server/actions/phase';
import type { SelectMissionsState } from '@/server/actions/phase';
import type { Mission } from '@/lib/types';

interface MissionSelectionCardsProps {
  campaignId: string;
  intel: number;
  missions: Mission[];
}

const TYPE_COLOURS: Record<string, string> = {
  ASSAULT:  'border-red-700/60 bg-red-900/10',
  RECON:    'border-blue-700/60 bg-blue-900/10',
  SUPPLY:   'border-yellow-700/60 bg-yellow-900/10',
  RELIGIOUS:'border-purple-700/60 bg-purple-900/10',
  SPECIAL:  'border-teal-700/60 bg-teal-900/10',
};

const TYPE_BADGE: Record<string, string> = {
  ASSAULT:  'border-red-700/50 text-red-300',
  RECON:    'border-blue-700/50 text-blue-300',
  SUPPLY:   'border-yellow-700/50 text-yellow-300',
  RELIGIOUS:'border-purple-700/50 text-purple-300',
  SPECIAL:  'border-teal-700/50 text-teal-300',
};

type Designation = 'primary' | 'secondary' | null;

/**
 * Commander mission selection: designate primary, secondary, and auto-fail.
 *
 * BoB rulebook pp.124-125.
 */
export function MissionSelectionCards({ campaignId, intel, missions }: MissionSelectionCardsProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState<SelectMissionsState | null, FormData>(
    selectMissions,
    null,
  );

  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [secondaryId, setSecondaryId] = useState<string | null>(null);
  const [intelForPrimary, setIntelForPrimary] = useState(0);
  const [intelForSecondary, setIntelForSecondary] = useState(0);

  const failedMissions = missions.filter((m) => m.id !== primaryId && m.id !== secondaryId);
  const hasThird = missions.length === 3;
  const totalIntelSpent = intelForPrimary + intelForSecondary;
  const canSubmit = primaryId !== null && secondaryId !== null && totalIntelSpent <= intel;

  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state?.success, router]);

  function getDesignation(id: string): Designation {
    if (id === primaryId) return 'primary';
    if (id === secondaryId) return 'secondary';
    return null;
  }

  function handleDesignate(id: string, role: 'primary' | 'secondary') {
    if (role === 'primary') {
      if (secondaryId === id) setSecondaryId(null);
      setPrimaryId((prev) => (prev === id ? null : id));
    } else {
      if (primaryId === id) setPrimaryId(null);
      setSecondaryId((prev) => (prev === id ? null : id));
    }
  }

  if (missions.length === 0) {
    return (
      <p className="text-sm text-legion-text-muted">
        No missions available. The GM has not yet generated missions for this phase.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Context */}
      <div className="rounded-md border border-border bg-legion-bg-elevated p-4 space-y-2">
        <p className="text-sm text-legion-text-primary">
          <strong>Primary:</strong> The Legion will attempt this mission at the table.
        </p>
        <p className="text-sm text-legion-text-primary">
          <strong>Secondary:</strong> Resolved with an engagement roll — outcome affects the Legion but is not played out.
        </p>
        {hasThird && (
          <p className="text-sm text-red-400">
            <strong>Auto-failed:</strong> The third mission is automatically failed and its penalty applied.
          </p>
        )}
        {intel > 0 && (
          <p className="text-xs text-legion-text-muted">
            You have <span className="text-legion-amber font-medium">{intel} Intel</span>.
            Spending 1 Intel adds +1d to the engagement roll for that mission.
          </p>
        )}
      </div>

      {state?.errors?._form && (
        <div role="alert" className="rounded-md bg-red-900/30 border border-red-700 px-4 py-3">
          <p className="text-sm text-red-400">{state.errors._form.join(', ')}</p>
        </div>
      )}

      {/* Mission cards */}
      <div className="flex flex-col gap-4">
        {missions.map((mission) => {
          const designation = getDesignation(mission.id);
          const isAutoFailed = hasThird && designation === null && primaryId !== null && secondaryId !== null;
          const rewards = mission.rewards as Record<string, number>;
          const penalties = mission.penalties as Record<string, number>;

          return (
            <div
              key={mission.id}
              className={`rounded-md border p-4 space-y-3 transition-colors
                ${isAutoFailed ? 'border-red-900/60 bg-red-900/5 opacity-70'
                  : designation === 'primary' ? 'border-legion-amber bg-legion-amber/5'
                  : designation === 'secondary' ? 'border-blue-500/60 bg-blue-900/5'
                  : TYPE_COLOURS[mission.type] ?? 'border-border bg-legion-bg-elevated'
                }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading text-sm font-semibold text-legion-text-primary">
                      {mission.name}
                    </h3>
                    <span className={`text-[10px] font-mono uppercase tracking-wide border rounded px-1.5 py-0.5 ${TYPE_BADGE[mission.type] ?? 'border-border text-legion-text-muted'}`}>
                      {mission.type}
                    </span>
                    <span className="text-[10px] font-mono text-legion-text-muted border border-border rounded px-1.5 py-0.5">
                      Threat {mission.threat_level}
                    </span>
                  </div>
                  {isAutoFailed && (
                    <span className="text-xs font-mono text-red-400">AUTO-FAILED</span>
                  )}
                  {designation === 'primary' && (
                    <span className="text-xs font-mono text-legion-amber">PRIMARY</span>
                  )}
                  {designation === 'secondary' && (
                    <span className="text-xs font-mono text-blue-300">SECONDARY</span>
                  )}
                </div>

                {/* Designation buttons */}
                {!isAutoFailed && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDesignate(mission.id, 'primary')}
                      className={`rounded border px-3 py-1.5 text-xs font-mono uppercase transition-colors min-h-[36px]
                        ${designation === 'primary'
                          ? 'border-legion-amber bg-legion-amber/10 text-legion-amber'
                          : 'border-border text-legion-text-muted hover:border-legion-amber/40'
                        }`}
                      aria-pressed={designation === 'primary'}
                    >
                      Primary
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDesignate(mission.id, 'secondary')}
                      className={`rounded border px-3 py-1.5 text-xs font-mono uppercase transition-colors min-h-[36px]
                        ${designation === 'secondary'
                          ? 'border-blue-500 bg-blue-900/10 text-blue-300'
                          : 'border-border text-legion-text-muted hover:border-blue-500/40'
                        }`}
                      aria-pressed={designation === 'secondary'}
                    >
                      Secondary
                    </button>
                  </div>
                )}
              </div>

              {/* Objective */}
              <p className="text-sm text-legion-text-muted">{mission.objective}</p>

              {/* Rewards / Penalties */}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                {Object.entries(rewards)
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => (
                    <span key={k} className="text-green-400">+{v} {k}</span>
                  ))}
                {Object.entries(penalties)
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => (
                    <span key={k} className="text-red-400">−{v} {k} (if failed)</span>
                  ))}
              </div>

              {/* Intel spending for engagement roll (secondary only) */}
              {designation === 'secondary' && intel > 0 && (
                <div className="rounded-md border border-border bg-legion-bg-surface p-3 space-y-1">
                  <p className="text-xs font-mono uppercase tracking-widest text-legion-text-muted">
                    Spend Intel for engagement bonus
                  </p>
                  <div className="flex items-center gap-3">
                    {[0, 1, 2].filter((v) => v <= intel - intelForPrimary).map((v) => (
                      <label
                        key={v}
                        className={`cursor-pointer rounded border px-3 py-1 text-xs font-mono transition-colors min-h-[36px] flex items-center
                          ${intelForSecondary === v
                            ? 'border-legion-amber bg-legion-amber/10 text-legion-amber'
                            : 'border-border text-legion-text-muted hover:border-legion-amber/40'
                          }`}
                      >
                        <input
                          type="radio"
                          name="intel_secondary"
                          value={v}
                          checked={intelForSecondary === v}
                          onChange={() => setIntelForSecondary(v)}
                          className="sr-only"
                        />
                        {v === 0 ? 'None' : `+${v}d (−${v} Intel)`}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Intel spending for engagement roll (primary too, in BoB it's optional) */}
              {designation === 'primary' && intel > 0 && (
                <div className="rounded-md border border-border bg-legion-bg-surface p-3 space-y-1">
                  <p className="text-xs font-mono uppercase tracking-widest text-legion-text-muted">
                    Spend Intel (engagement setup bonus)
                  </p>
                  <div className="flex items-center gap-3">
                    {[0, 1, 2].filter((v) => v <= intel - intelForSecondary).map((v) => (
                      <label
                        key={v}
                        className={`cursor-pointer rounded border px-3 py-1 text-xs font-mono transition-colors min-h-[36px] flex items-center
                          ${intelForPrimary === v
                            ? 'border-legion-amber bg-legion-amber/10 text-legion-amber'
                            : 'border-border text-legion-text-muted hover:border-legion-amber/40'
                          }`}
                      >
                        <input
                          type="radio"
                          name="intel_primary"
                          value={v}
                          checked={intelForPrimary === v}
                          onChange={() => setIntelForPrimary(v)}
                          className="sr-only"
                        />
                        {v === 0 ? 'None' : `+${v}d (−${v} Intel)`}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Auto-fail summary */}
      {hasThird && primaryId && secondaryId && failedMissions.length > 0 && (
        <div role="status" className="rounded-md border border-red-900/40 bg-red-900/10 px-4 py-3">
          <p className="text-sm text-red-400">
            <strong>{failedMissions[0].name}</strong> will be automatically failed.
            Penalty: {Object.entries((failedMissions[0].penalties ?? {}) as Record<string, number>)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => `−${v} ${k}`)
              .join(', ') || 'none'}.
          </p>
        </div>
      )}

      {/* Submit */}
      <form action={action}>
        <input type="hidden" name="campaign_id" value={campaignId} />
        <input type="hidden" name="primary_mission_id" value={primaryId ?? ''} />
        <input type="hidden" name="secondary_mission_id" value={secondaryId ?? ''} />
        <input type="hidden" name="intel_for_primary" value={intelForPrimary} />
        <input type="hidden" name="intel_for_secondary" value={intelForSecondary} />
        <button
          type="submit"
          disabled={pending || !canSubmit}
          className="rounded-md bg-legion-amber px-5 py-2.5 font-heading text-sm font-semibold tracking-wide text-[var(--bob-amber-fg)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {pending ? 'Confirming…' : 'Confirm Selection'}
        </button>
        {!canSubmit && (
          <p className="mt-2 text-xs text-legion-text-muted">
            {!primaryId || !secondaryId
              ? 'Designate a Primary and Secondary mission to confirm.'
              : `Not enough Intel (need ${totalIntelSpent}, have ${intel}).`}
          </p>
        )}
      </form>
    </div>
  );
}
