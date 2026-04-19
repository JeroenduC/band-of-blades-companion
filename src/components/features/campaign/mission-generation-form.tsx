'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateMissions } from '@/server/actions/phase';
import type { GenerateMissionsState } from '@/server/actions/phase';
import type { MissionType } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MissionDraft {
  name: string;
  type: MissionType | '';
  objective: string;
  threat_level: number;
  reward_morale: number;
  reward_intel: number;
  reward_supply: number;
  reward_time: number;
  penalty_pressure: number;
  penalty_morale: number;
}

function emptyMission(): MissionDraft {
  return {
    name: '',
    type: '',
    objective: '',
    threat_level: 2,
    reward_morale: 0,
    reward_intel: 0,
    reward_supply: 0,
    reward_time: 0,
    penalty_pressure: 1,
    penalty_morale: 0,
  };
}

// Suggested defaults per mission type (BoB rulebook pp.314+)
const TYPE_DEFAULTS: Partial<Record<MissionType, Partial<MissionDraft>>> = {
  ASSAULT:  { reward_morale: 2, reward_intel: 0, reward_supply: 0, reward_time: 0, penalty_pressure: 2, penalty_morale: 0, threat_level: 3 },
  RECON:    { reward_morale: 0, reward_intel: 2, reward_supply: 0, reward_time: 1, penalty_pressure: 1, penalty_morale: 0, threat_level: 1 },
  SUPPLY:   { reward_morale: 0, reward_intel: 0, reward_supply: 3, reward_time: 0, penalty_pressure: 1, penalty_morale: 0, threat_level: 2 },
  RELIGIOUS:{ reward_morale: 1, reward_intel: 1, reward_supply: 0, reward_time: 2, penalty_pressure: 1, penalty_morale: 0, threat_level: 2 },
  SPECIAL:  { reward_morale: 1, reward_intel: 1, reward_supply: 1, reward_time: 1, penalty_pressure: 2, penalty_morale: 0, threat_level: 3 },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface MissionGenerationFormProps {
  campaignId: string;
  currentLocation: string;
  availableMissionTypes: MissionType[];
  commanderFocus: string | null;
  intelQuestions?: string[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MissionGenerationForm({
  campaignId,
  currentLocation,
  availableMissionTypes,
  commanderFocus,
  intelQuestions = [],
}: MissionGenerationFormProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState<GenerateMissionsState | null, FormData>(
    generateMissions,
    null,
  );

  const [missions, setMissions] = useState<MissionDraft[]>([emptyMission(), emptyMission()]);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state?.success, router]);

  function updateMission(index: number, patch: Partial<MissionDraft>) {
    setMissions((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }

  function applyTypeDefaults(index: number, type: MissionType) {
    const defaults = TYPE_DEFAULTS[type] ?? {};
    updateMission(index, { type, ...defaults });
  }

  function addMission() {
    if (missions.length < 3) setMissions((prev) => [...prev, emptyMission()]);
  }

  function removeMission(index: number) {
    if (missions.length > 2) setMissions((prev) => prev.filter((_, i) => i !== index));
  }

  const missionsJson = JSON.stringify(missions.map((m) => ({
    name: m.name,
    type: m.type || 'ASSAULT',
    objective: m.objective,
    threat_level: m.threat_level,
    reward_morale: m.reward_morale,
    reward_intel: m.reward_intel,
    reward_supply: m.reward_supply,
    reward_time: m.reward_time,
    penalty_pressure: m.penalty_pressure,
    penalty_morale: m.penalty_morale,
  })));

  const canSubmit = missions.every((m) => m.name.trim() && m.type && m.objective.trim());

  return (
    <div className="space-y-6">
      {/* Context */}
      <div className="rounded-md border border-border bg-legion-bg-elevated p-4 space-y-2">
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-0.5">Location</dt>
            <dd className="font-medium text-legion-text-primary">{currentLocation}</dd>
          </div>
          {commanderFocus && (
            <div>
              <dt className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-0.5">Commander focus</dt>
              <dd className="font-medium text-legion-amber">{commanderFocus}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-0.5">Available types</dt>
            <dd className="font-medium text-legion-text-primary">{availableMissionTypes.join(', ')}</dd>
          </div>
        </dl>

        {/* Intel Questions */}
        {intelQuestions.length > 0 && (
          <div className="pt-2 border-t border-border mt-2">
            <dt className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-1">
              Intel Questions (Answer these in missions)
            </dt>
            <ul className="list-disc list-inside text-sm text-legion-amber/90 space-y-0.5">
              {intelQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-legion-text-muted">
          Generate 2–3 missions for the Commander to choose from. At least one should match the focus type.
        </p>
      </div>

      {state?.errors?._form && (
        <div role="alert" className="rounded-md bg-red-900/30 border border-red-700 px-4 py-3">
          <p className="text-sm text-red-400">{state.errors._form.join(', ')}</p>
        </div>
      )}
      {state?.errors?.missions && (
        <div role="alert" className="rounded-md bg-red-900/30 border border-red-700 px-4 py-3">
          <p className="text-sm text-red-400">{state.errors.missions.join(', ')}</p>
        </div>
      )}

      {/* Mission cards */}
      <div className="space-y-6">
        {missions.map((m, idx) => (
          <MissionCard
            key={idx}
            index={idx}
            mission={m}
            availableMissionTypes={availableMissionTypes}
            canRemove={missions.length > 2}
            onUpdate={(patch) => updateMission(idx, patch)}
            onTypeChange={(type) => applyTypeDefaults(idx, type)}
            onRemove={() => removeMission(idx)}
          />
        ))}
      </div>

      {missions.length < 3 && (
        <button
          type="button"
          onClick={addMission}
          className="text-sm text-legion-amber underline underline-offset-4 hover:opacity-80 transition-opacity"
        >
          + Add third mission
        </button>
      )}

      <form action={action}>
        <input type="hidden" name="campaign_id" value={campaignId} />
        <input type="hidden" name="missions_json" value={missionsJson} />
        <button
          type="submit"
          disabled={pending || !canSubmit}
          className="rounded-md bg-legion-amber px-5 py-2.5 font-heading text-sm font-semibold tracking-wide text-[var(--bob-amber-fg)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {pending ? 'Presenting…' : 'Present to Commander'}
        </button>
        {!canSubmit && (
          <p className="mt-2 text-xs text-legion-text-muted">
            Fill in name, type, and objective for all missions before presenting.
          </p>
        )}
      </form>
    </div>
  );
}

// ── Single mission card ────────────────────────────────────────────────────────

interface MissionCardProps {
  index: number;
  mission: MissionDraft;
  availableMissionTypes: MissionType[];
  canRemove: boolean;
  onUpdate: (patch: Partial<MissionDraft>) => void;
  onTypeChange: (type: MissionType) => void;
  onRemove: () => void;
}

const ALL_MISSION_TYPES: MissionType[] = ['ASSAULT', 'RECON', 'SUPPLY', 'RELIGIOUS', 'SPECIAL'];

function MissionCard({
  index,
  mission,
  availableMissionTypes,
  canRemove,
  onUpdate,
  onTypeChange,
  onRemove,
}: MissionCardProps) {
  const idPrefix = `mission_${index}`;

  return (
    <div className="rounded-md border border-border bg-legion-bg-elevated p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-heading text-sm font-semibold uppercase tracking-widest text-legion-text-primary">
          Mission {index + 1}
          {index === 0 && <span className="ml-2 text-[10px] font-mono text-legion-text-muted normal-case tracking-normal">(required)</span>}
          {index === 1 && <span className="ml-2 text-[10px] font-mono text-legion-text-muted normal-case tracking-normal">(required)</span>}
          {index === 2 && <span className="ml-2 text-[10px] font-mono text-legion-text-muted normal-case tracking-normal">(optional)</span>}
        </p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-legion-text-muted hover:text-red-400 transition-colors"
            aria-label={`Remove mission ${index + 1}`}
          >
            Remove
          </button>
        )}
      </div>

      {/* Name */}
      <div className="space-y-1">
        <label htmlFor={`${idPrefix}_name`} className="block text-sm font-medium text-legion-text-primary">
          Name
        </label>
        <p id={`${idPrefix}_name_desc`} className="text-xs text-legion-text-muted">
          A short, evocative title. Shown to the Commander when choosing.
        </p>
        <input
          id={`${idPrefix}_name`}
          type="text"
          value={mission.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          aria-describedby={`${idPrefix}_name_desc`}
          placeholder="e.g. The Relic of Sunstrider"
          maxLength={80}
          className="w-full rounded-md border border-border bg-legion-bg-surface px-3 py-2 text-sm text-legion-text-primary placeholder:text-legion-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--bob-border-focus)]"
        />
      </div>

      {/* Type */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-legion-text-primary">Mission type</p>
        <p id={`${idPrefix}_type_desc`} className="text-xs text-legion-text-muted">
          Types in <span className="text-legion-amber">amber</span> are available at {'{location}'} and match the focus. Others can still be used.
        </p>
        <div className="flex flex-wrap gap-2" aria-describedby={`${idPrefix}_type_desc`}>
          {ALL_MISSION_TYPES.map((t) => {
            const isAvailable = availableMissionTypes.includes(t);
            const isSelected = mission.type === t;
            return (
              <label
                key={t}
                className={`flex items-center gap-1.5 cursor-pointer rounded border px-3 py-1.5 text-xs font-mono uppercase tracking-wide transition-colors
                  ${isSelected
                    ? 'border-legion-amber bg-legion-amber/10 text-legion-amber'
                    : isAvailable
                      ? 'border-border text-legion-text-primary hover:border-legion-amber/40'
                      : 'border-border/50 text-legion-text-muted opacity-60 hover:opacity-80'
                  }`}
              >
                <input
                  type="radio"
                  name={`${idPrefix}_type`}
                  value={t}
                  checked={isSelected}
                  onChange={() => onTypeChange(t)}
                  className="sr-only"
                />
                {t}
                {!isAvailable && <span className="text-[9px] opacity-60">(off-map)</span>}
              </label>
            );
          })}
        </div>
      </div>

      {/* Objective */}
      <div className="space-y-1">
        <label htmlFor={`${idPrefix}_objective`} className="block text-sm font-medium text-legion-text-primary">
          Objective
        </label>
        <p id={`${idPrefix}_objective_desc`} className="text-xs text-legion-text-muted">
          What the soldiers must do. Shown to the Commander — keep it dramatic, not mechanical.
        </p>
        <textarea
          id={`${idPrefix}_objective`}
          value={mission.objective}
          onChange={(e) => onUpdate({ objective: e.target.value })}
          aria-describedby={`${idPrefix}_objective_desc`}
          placeholder="e.g. Recover the ancient relic before the Broken defile it."
          maxLength={300}
          rows={2}
          className="w-full rounded-md border border-border bg-legion-bg-surface px-3 py-2 text-sm text-legion-text-primary placeholder:text-legion-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--bob-border-focus)] resize-none"
        />
      </div>

      {/* Threat level */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-legion-text-primary" id={`${idPrefix}_threat_label`}>
          Threat level: <span className="text-legion-amber">{mission.threat_level}</span>
        </p>
        <p id={`${idPrefix}_threat_desc`} className="text-xs text-legion-text-muted">
          1 = minor skirmish, 4 = desperate fight. Affects squad composition and injury risk.
        </p>
        <div className="flex gap-2" role="group" aria-labelledby={`${idPrefix}_threat_label`} aria-describedby={`${idPrefix}_threat_desc`}>
          {[1, 2, 3, 4].map((level) => (
            <label
              key={level}
              className={`flex items-center justify-center w-10 h-10 rounded border cursor-pointer text-sm font-bold transition-colors
                ${mission.threat_level === level
                  ? 'border-legion-amber bg-legion-amber/10 text-legion-amber'
                  : 'border-border text-legion-text-muted hover:border-legion-amber/40'
                }`}
            >
              <input
                type="radio"
                name={`${idPrefix}_threat`}
                value={level}
                checked={mission.threat_level === level}
                onChange={() => onUpdate({ threat_level: level })}
                className="sr-only"
              />
              {level}
            </label>
          ))}
        </div>
      </div>

      {/* Rewards and penalties */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-widest text-legion-text-muted">Rewards (if successful)</p>
          <NumberField label="Morale" id={`${idPrefix}_r_morale`} value={mission.reward_morale} onChange={(v) => onUpdate({ reward_morale: v })} />
          <NumberField label="Intel" id={`${idPrefix}_r_intel`} value={mission.reward_intel} onChange={(v) => onUpdate({ reward_intel: v })} />
          <NumberField label="Supply" id={`${idPrefix}_r_supply`} value={mission.reward_supply} onChange={(v) => onUpdate({ reward_supply: v })} />
          <NumberField label="Time (saved)" id={`${idPrefix}_r_time`} value={mission.reward_time} onChange={(v) => onUpdate({ reward_time: v })} />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-widest text-legion-text-muted">Penalties (if failed)</p>
          <NumberField label="Pressure" id={`${idPrefix}_p_pressure`} value={mission.penalty_pressure} onChange={(v) => onUpdate({ penalty_pressure: v })} />
          <NumberField label="Morale" id={`${idPrefix}_p_morale`} value={mission.penalty_morale} onChange={(v) => onUpdate({ penalty_morale: v })} />
        </div>
      </div>
    </div>
  );
}

// ── Small numeric input helper ────────────────────────────────────────────────

function NumberField({
  label,
  id,
  value,
  onChange,
}: {
  label: string;
  id: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-xs text-legion-text-muted w-20 shrink-0">{label}</label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!isNaN(n) && n >= 0) onChange(n);
          else if (e.target.value === '') onChange(0);
        }}
        className="w-14 rounded-md border border-border bg-legion-bg-surface px-2 py-1 text-sm text-center text-legion-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--bob-border-focus)]"
      />
    </div>
  );
}
