'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateMissions } from '@/server/actions/phase';
import { rollDice } from '@/server/actions/phase/core';
import type { GenerateMissionsState } from '@/server/actions/phase';
import type { MissionType } from '@/lib/types';
import { 
  MISSION_COUNT_TABLE, 
  MISSION_TYPE_TABLE, 
  ASSAULT_TABLE, 
  RECON_TABLE, 
  RELIGIOUS_TABLE, 
  SUPPLY_TABLE,
  FAVOR_TABLE,
  SPECIALIST_REQ_TABLE
} from '@/lib/mission-tables';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { cn } from '@/lib/utils';
import { DicesIcon, EditIcon, CheckIcon, ChevronRightIcon, ChevronLeftIcon } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MissionDraft {
  name: string;
  type: MissionType;
  objective: string;
  threat_level: number;
  reward_morale: number;
  reward_intel: number;
  reward_supply: number;
  reward_time: number;
  penalty_pressure: number;
  penalty_morale: number;
  notes?: string;
  special_requirement?: string;
  has_favor?: boolean;
}

function emptyMission(type: MissionType = 'ASSAULT'): MissionDraft {
  return {
    name: '',
    type,
    objective: '',
    threat_level: 2,
    reward_morale: 0,
    reward_intel: 0,
    reward_supply: 0,
    reward_time: 0,
    penalty_pressure: 1,
    penalty_morale: 0,
    notes: '',
  };
}

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

  const [step, setStep] = useState(0); // 0: Count, 1: Types, 2: Details, 3: Review
  const [missionCount, setMissionCount] = useState<number>(3);
  const [missionTypes, setMissionTypes] = useState<Array<MissionType | 'FOCUS' | 'CHOICE'>>([]);
  const [missions, setMissions] = useState<MissionDraft[]>([]);
  
  const [lastRolls, setLastRolls] = useState<{
    count?: number;
    types?: number[];
    [key: string]: any;
  }>({});

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state?.success, router]);

  // ── Step 0: Mission Count ──

  async function rollMissionCount() {
    const [result] = await rollDice(1);
    setLastRolls({ count: result });
    const tableResult = MISSION_COUNT_TABLE[result];
    setMissionCount(tableResult.count);
    // Note: special reqs and favor are handled in the details step if the roll triggered them
  }

  // ── Step 1: Mission Types ──

  async function rollMissionTypes() {
    const rolls = await rollDice(missionCount);
    const types = rolls.map(r => MISSION_TYPE_TABLE[r]);
    setMissionTypes(types);
    setLastRolls(prev => ({ ...prev, types: rolls as any }));
  }

  function handleTypeSelect(index: number, type: MissionType | 'FOCUS' | 'CHOICE') {
    const newTypes = [...missionTypes];
    newTypes[index] = type;
    setMissionTypes(newTypes);
  }

  // ── Step 2: Mission Details ──

  const startDetailsStep = () => {
    const initialMissions = missionTypes.map((t) => {
      let finalType: MissionType = 'ASSAULT';
      if (t === 'FOCUS') finalType = (commanderFocus as MissionType) || 'ASSAULT';
      else if (t === 'CHOICE') finalType = 'ASSAULT';
      else finalType = t as MissionType;
      
      return emptyMission(finalType);
    });
    setMissions(initialMissions);
    setStep(2);
  };

  async function rollMissionDetails(index: number) {
    const mission = missions[index];
    const typeTable = 
      mission.type === 'ASSAULT' ? ASSAULT_TABLE :
      mission.type === 'RECON' ? RECON_TABLE :
      mission.type === 'RELIGIOUS' ? RELIGIOUS_TABLE :
      SUPPLY_TABLE;

    const [typeRoll, rewardRoll, penaltyRoll] = await rollDice(3);
    
    const subType = (typeTable.type as any)[typeRoll];
    const reward = (typeTable.rewards as any)[rewardRoll];
    const penalty = (typeTable.penalties as any)[penaltyRoll];

    const updatedMissions = [...missions];
    updatedMissions[index] = {
      ...mission,
      name: `${mission.type} Mission: ${subType}`,
      objective: `Complete the ${subType} objective.`,
      reward_morale: reward.morale || 0,
      reward_intel: reward.intel || 0,
      reward_supply: reward.supply || 0,
      reward_time: reward.time || 0,
      penalty_pressure: penalty.pressure || 0,
      penalty_morale: penalty.morale || 0,
      threat_level: mission.type === 'ASSAULT' ? 3 : mission.type === 'RECON' ? 1 : 2,
    };
    
    setMissions(updatedMissions);
    setLastRolls(prev => ({ ...prev, [`mission_${index}`]: [typeRoll, rewardRoll, penaltyRoll] as any }));
  }

  // ── Helpers ──

  function updateMission(index: number, patch: Partial<MissionDraft>) {
    setMissions((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }

  const missionsJson = JSON.stringify(missions.map((m) => ({
    name: m.name,
    type: m.type,
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
    <div className="space-y-8">
      
      {/* ── Progress ── */}
      <div className="flex justify-between items-center px-4">
        {[0, 1, 2, 3].map((s) => (
          <div key={s} className="flex flex-col items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
              step === s ? "bg-legion-amber text-[var(--bob-amber-fg)] shadow-[0_0_15px_rgba(var(--bob-amber-rgb),0.4)] scale-110" :
              step > s ? "bg-green-500/20 text-green-400 border border-green-500/30" :
              "bg-white/5 text-legion-text-muted border border-white/10"
            )}>
              {step > s ? <CheckIcon className="w-4 h-4" /> : s + 1}
            </div>
            <span className={cn(
              "text-[9px] uppercase tracking-widest font-bold",
              step === s ? "text-legion-amber" : "text-legion-text-muted"
            )}>
              {s === 0 ? 'Count' : s === 1 ? 'Types' : s === 2 ? 'Details' : 'Review'}
            </span>
          </div>
        ))}
      </div>

      {/* ── Step 0: Mission Count ── */}
      {step === 0 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center space-y-2">
            <h3 className="font-heading text-lg text-legion-text-primary uppercase tracking-widest">How many missions?</h3>
            <p className="text-xs text-legion-text-muted italic max-w-sm mx-auto leading-relaxed">
              Roll 1d6 to determine the number of available missions for this phase.
            </p>
          </div>

          <div className="flex justify-center gap-4">
            <button 
              onClick={rollMissionCount}
              className="flex flex-col items-center gap-3 p-8 rounded-xl bg-legion-amber/5 border-2 border-legion-amber/20 hover:border-legion-amber/40 transition-all group"
            >
              <div className="p-4 rounded-full bg-legion-amber/20 group-hover:scale-110 transition-transform">
                <DicesIcon className="w-8 h-8 text-legion-amber" />
              </div>
              <span className="font-heading text-sm text-legion-amber uppercase tracking-widest">Roll 1d6</span>
            </button>
            <div className="flex flex-col justify-center gap-2">
              {[2, 3].map(c => (
                <button 
                  key={c}
                  onClick={() => setMissionCount(c)}
                  className={cn(
                    "px-6 py-3 rounded-lg border font-heading text-sm uppercase tracking-widest transition-all",
                    missionCount === c ? "bg-legion-amber text-[var(--bob-amber-fg)] border-legion-amber shadow-lg" : "bg-white/5 border-white/10 text-legion-text-muted hover:border-white/20"
                  )}
                >
                  {c} Missions
                </button>
              ))}
            </div>
          </div>

          {lastRolls.count && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 max-w-md mx-auto animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded bg-legion-amber flex items-center justify-center font-heading text-2xl text-[var(--bob-amber-fg)] shadow-inner">
                  {lastRolls.count}
                </div>
                <div className="flex-1">
                  <div className="text-[10px] text-legion-text-muted uppercase tracking-widest mb-1">Table Result</div>
                  <div className="font-heading text-sm text-legion-text-primary uppercase leading-tight">
                    {MISSION_COUNT_TABLE[lastRolls.count].count} Missions
                  </div>
                  {MISSION_COUNT_TABLE[lastRolls.count].note && (
                    <div className="text-[10px] text-legion-amber italic mt-0.5">
                      {MISSION_COUNT_TABLE[lastRolls.count].note}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-6">
            <button 
              onClick={() => {
                setMissionTypes(Array(missionCount).fill('ASSAULT'));
                setStep(1);
              }}
              className="flex items-center gap-2 px-6 py-2 rounded bg-legion-text-primary text-black font-heading text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Continue <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 1: Mission Types ── */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center space-y-2">
            <h3 className="font-heading text-lg text-legion-text-primary uppercase tracking-widest">Mission Types</h3>
            <p className="text-xs text-legion-text-muted italic max-w-sm mx-auto">
              Determine the focus for each of the {missionCount} missions.
            </p>
          </div>

          <div className="flex justify-center mb-4">
            <button 
              onClick={rollMissionTypes}
              className="flex items-center gap-2 px-4 py-2 rounded bg-legion-amber/10 border border-legion-amber/30 text-[10px] text-legion-amber uppercase font-bold tracking-widest hover:bg-legion-amber/20 transition-colors"
            >
              <DicesIcon className="w-4 h-4" /> Roll All Types
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(missionCount).fill(0).map((_, i) => (
              <LegionCard key={i} className="bg-white/5 border-white/10">
                <LegionCardHeader className="pb-2">
                  <LegionCardTitle className="text-[10px] font-mono text-legion-text-muted uppercase tracking-[0.2em]">Mission {i + 1}</LegionCardTitle>
                </LegionCardHeader>
                <LegionCardContent className="space-y-4">
                  <select 
                    value={missionTypes[i]}
                    onChange={(e) => handleTypeSelect(i, e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs text-legion-text-primary focus:outline-none focus:border-legion-amber/50"
                  >
                    <option value="ASSAULT">Assault</option>
                    <option value="RECON">Recon</option>
                    <option value="RELIGIOUS">Religious</option>
                    <option value="SUPPLY">Supply</option>
                    <option value="FOCUS">Commander's Focus ({commanderFocus})</option>
                    <option value="CHOICE">GM's Choice</option>
                  </select>
                  
                  {lastRolls.types?.[i] && (
                    <div className="text-[9px] text-legion-text-muted italic">
                      Rolled: {lastRolls.types[i]} → {MISSION_TYPE_TABLE[lastRolls.types[i]]}
                    </div>
                  )}
                </LegionCardContent>
              </LegionCard>
            ))}
          </div>

          <div className="flex justify-between pt-6">
            <button 
              onClick={() => setStep(0)}
              className="flex items-center gap-2 px-6 py-2 rounded bg-white/5 text-legion-text-muted font-heading text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" /> Back
            </button>
            <button 
              onClick={startDetailsStep}
              className="flex items-center gap-2 px-6 py-2 rounded bg-legion-text-primary text-black font-heading text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Generate Details <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Mission Details ── */}
      {step === 2 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center space-y-2">
            <h3 className="font-heading text-lg text-legion-text-primary uppercase tracking-widest">Mission Details</h3>
            <p className="text-xs text-legion-text-muted italic max-w-sm mx-auto">
              Roll on the type-specific tables for sub-types, rewards, and penalties.
            </p>
          </div>

          <div className="space-y-6">
            {missions.map((m, i) => (
              <LegionCard key={i} className="border-white/10 overflow-hidden">
                <div className="bg-white/5 px-4 py-2 flex justify-between items-center border-b border-white/5">
                  <span className="font-heading text-xs text-legion-amber uppercase tracking-widest">
                    {m.type} Mission {i + 1}
                  </span>
                  <button 
                    onClick={() => rollMissionDetails(i)}
                    className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-tighter text-legion-text-muted hover:text-legion-amber transition-colors"
                  >
                    <DicesIcon className="w-3 h-3" /> Roll Details
                  </button>
                </div>
                <LegionCardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-legion-text-muted uppercase tracking-widest">Mission Name</label>
                        <input 
                          type="text"
                          value={m.name}
                          onChange={(e) => updateMission(i, { name: e.target.value })}
                          className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-legion-text-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-legion-text-muted uppercase tracking-widest">Objective</label>
                        <textarea 
                          value={m.objective}
                          onChange={(e) => updateMission(i, { objective: e.target.value })}
                          className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs text-legion-text-primary h-20"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <span className="text-[9px] font-bold text-green-500/80 uppercase tracking-widest border-b border-green-500/20 pb-1 block">Rewards</span>
                          <NumberInput label="Morale" value={m.reward_morale} onChange={v => updateMission(i, { reward_morale: v })} />
                          <NumberInput label="Intel" value={m.reward_intel} onChange={v => updateMission(i, { reward_intel: v })} />
                          <NumberInput label="Supply" value={m.reward_supply} onChange={v => updateMission(i, { reward_supply: v })} />
                          <NumberInput label="Time" value={m.reward_time} onChange={v => updateMission(i, { reward_time: v })} />
                        </div>
                        <div className="space-y-3">
                          <span className="text-[9px] font-bold text-red-500/80 uppercase tracking-widest border-b border-red-500/20 pb-1 block">Penalties</span>
                          <NumberInput label="Pressure" value={m.penalty_pressure} onChange={v => updateMission(i, { penalty_pressure: v })} />
                          <NumberInput label="Morale" value={m.penalty_morale} onChange={v => updateMission(i, { penalty_morale: v })} />
                        </div>
                      </div>
                    </div>
                  </div>
                </LegionCardContent>
              </LegionCard>
            ))}
          </div>

          <div className="flex justify-between pt-6">
            <button 
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-6 py-2 rounded bg-white/5 text-legion-text-muted font-heading text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" /> Back
            </button>
            <button 
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-6 py-2 rounded bg-legion-amber text-black font-heading text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Final Review <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Submit ── */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center space-y-2">
            <h3 className="font-heading text-lg text-legion-text-primary uppercase tracking-widest">Final Review</h3>
            <p className="text-xs text-legion-text-muted italic max-w-sm mx-auto">
              Confirm mission details before presenting them to the Commander.
            </p>
          </div>

          <div className="space-y-4">
            {missions.map((m, i) => (
              <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/10 flex justify-between items-center group">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-mono text-legion-amber border border-legion-amber/30 px-1.5 py-0.5 rounded">
                      {m.type}
                    </span>
                    <h4 className="font-heading text-sm text-legion-text-primary uppercase tracking-wide">{m.name}</h4>
                  </div>
                  <p className="text-xs text-legion-text-muted italic">&ldquo;{m.objective}&rdquo;</p>
                </div>
                <button 
                  onClick={() => setStep(2)}
                  className="p-2 rounded hover:bg-white/10 text-legion-text-muted group-hover:text-legion-amber transition-all"
                >
                  <EditIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {state?.errors?._form && (
            <div role="alert" className="rounded-md bg-red-900/30 border border-red-700 px-4 py-3 text-sm text-red-400">
              {state.errors._form.join(', ')}
            </div>
          )}

          <div className="flex justify-between pt-6">
            <button 
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-2 rounded bg-white/5 text-legion-text-muted font-heading text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" /> Back to Edit
            </button>
            <form action={action}>
              <input type="hidden" name="campaign_id" value={campaignId} />
              <input type="hidden" name="missions_json" value={missionsJson} />
              <button
                type="submit"
                disabled={pending || !canSubmit}
                className="flex items-center gap-2 px-8 py-3 rounded bg-legion-amber text-black font-heading text-sm font-bold uppercase tracking-widest hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(var(--bob-amber-rgb),0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending ? 'Presenting…' : 'Present to Commander'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function NumberInput({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div className="flex justify-between items-center text-[10px]">
      <span className="text-legion-text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10">-</button>
        <span className="w-6 text-center font-mono text-legion-text-primary">{value}</span>
        <button onClick={() => onChange(value + 1)} className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10">+</button>
      </div>
    </div>
  );
}
