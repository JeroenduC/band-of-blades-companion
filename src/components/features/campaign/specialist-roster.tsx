'use client';

import { useState } from 'react';
import { Specialist, SpecialistClass, SpecialistStatus } from '@/lib/types';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle, LegionBadge } from '@/components/legion';
import { cn } from '@/lib/utils';

interface SpecialistRosterProps {
  specialists: Specialist[];
  isMarshal: boolean;
}

export function SpecialistRoster({ specialists, isMarshal }: SpecialistRosterProps) {
  const livingSpecialists = specialists.filter(s => s.status !== 'DEAD' && s.status !== 'RETIRED');
  const showWarning = livingSpecialists.length < 2;

  return (
    <div className="space-y-6">
      {showWarning && (
        <div className="bg-red-900/20 border border-red-500 p-4 rounded-lg animate-pulse">
          <p className="text-red-500 font-bold text-center uppercase tracking-widest">
            Critical Warning: Fewer than 2 Specialists alive. Game Over imminent.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {specialists.map((specialist) => (
          <SpecialistCard
            key={specialist.id}
            specialist={specialist}
            isMarshal={isMarshal}
          />
        ))}
      </div>
    </div>
  );
}

function SpecialistCard({ specialist, isMarshal }: { specialist: Specialist; isMarshal: boolean }) {
  const isDead = specialist.status === 'DEAD' || specialist.status === 'RETIRED';

  return (
    <LegionCard className={cn(
      "relative",
      isDead && "opacity-60 grayscale"
    )}>
      <LegionCardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <LegionCardTitle className="text-xl font-heading">
              {specialist.name}
            </LegionCardTitle>
            <div className="text-xs text-legion-text-muted uppercase tracking-widest font-medium">
              {specialist.class} — {specialist.heritage}
            </div>
          </div>
          <LegionBadge variant={
            specialist.status === 'AVAILABLE' ? 'default' :
            specialist.status === 'DEPLOYED' ? 'outline' :
            'secondary'
          }>
            {specialist.status}
          </LegionBadge>
        </div>
      </LegionCardHeader>

      <LegionCardContent className="space-y-4">
        {/* Stress Track */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] uppercase tracking-tighter font-bold text-legion-text-muted">
            <span>Stress</span>
            <span>{specialist.stress} / 9</span>
          </div>
          <div className="flex gap-1 h-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-sm border",
                  i < specialist.stress
                    ? "bg-[var(--bob-amber)] border-[var(--bob-amber)]"
                    : "bg-legion-bg-elevated border-legion-border"
                )}
              />
            ))}
          </div>
        </div>

        {/* Harm */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-tighter font-bold text-legion-text-muted">Harm</div>

          {/* Level 3 */}
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-2 text-[10px] font-bold text-center">Lvl 3</div>
            <div className={cn(
              "col-span-8 h-8 border border-legion-border rounded flex items-center px-2 text-xs",
              specialist.harm_level_3 ? "bg-red-900/20 text-red-200 border-red-500/50" : "bg-legion-bg-elevated"
            )}>
              {specialist.harm_level_3 || <span className="text-legion-text-muted italic">No severe harm</span>}
            </div>
            <div className="col-span-2 flex gap-1 justify-center">
               {/* Ticks for Lvl 3 */}
               <HealingTicks count={specialist.healing_ticks} row={2} />
            </div>
          </div>

          {/* Level 2 */}
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-2 text-[10px] font-bold text-center">Lvl 2</div>
            <div className="col-span-4 h-8 border border-legion-border rounded flex items-center px-2 text-xs truncate bg-legion-bg-elevated">
              {specialist.harm_level_2_a || <span className="text-legion-text-muted italic">—</span>}
            </div>
            <div className="col-span-4 h-8 border border-legion-border rounded flex items-center px-2 text-xs truncate bg-legion-bg-elevated">
              {specialist.harm_level_2_b || <span className="text-legion-text-muted italic">—</span>}
            </div>
            <div className="col-span-2 flex gap-1 justify-center">
               <HealingTicks count={specialist.healing_ticks} row={1} />
            </div>
          </div>

          {/* Level 1 */}
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-2 text-[10px] font-bold text-center">Lvl 1</div>
            <div className="col-span-4 h-8 border border-legion-border rounded flex items-center px-2 text-xs truncate bg-legion-bg-elevated">
              {specialist.harm_level_1_a || <span className="text-legion-text-muted italic">—</span>}
            </div>
            <div className="col-span-4 h-8 border border-legion-border rounded flex items-center px-2 text-xs truncate bg-legion-bg-elevated">
              {specialist.harm_level_1_b || <span className="text-legion-text-muted italic">—</span>}
            </div>
            <div className="col-span-2 flex gap-1 justify-center">
               <HealingTicks count={specialist.healing_ticks} row={0} />
            </div>
          </div>
        </div>

        {/* XP and Abilities */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-tighter font-bold text-legion-text-muted">Experience</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-heading">{specialist.xp} XP</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-tighter font-bold text-legion-text-muted">Abilities</div>
            <div className="text-xs">
              {specialist.abilities.length > 0
                ? specialist.abilities.join(', ')
                : <span className="text-legion-text-muted italic">None yet</span>}
            </div>
          </div>
        </div>

        {isMarshal && !isDead && (
          <div className="pt-2 flex gap-2">
            <button className="flex-1 bg-legion-bg-elevated border border-legion-border hover:border-[var(--bob-amber)] py-1 text-[10px] uppercase tracking-widest font-bold transition-colors">
              Update Stats
            </button>
            <button className="flex-1 bg-legion-bg-elevated border border-legion-border hover:border-red-500 py-1 text-[10px] uppercase tracking-widest font-bold transition-colors text-red-500/70 hover:text-red-500">
              Casualty
            </button>
          </div>
        )}
      </LegionCardContent>
    </LegionCard>
  );
}

function HealingTicks({ count, row }: { count: number, row: number }) {
  // Simplification: the rulebook has one healing track, but we'll show it next to each row
  // Actually, healing ticks (4) fill a clock that clears all harm of a certain type or level?
  // "When the clock is full, clear all level 1 harm, or reduce all level 2 to level 1, or level 3 to level 2."
  // So it's one clock of 4 ticks.
  return (
    <div className="flex flex-wrap w-6 gap-0.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-2.5 h-2.5 border rounded-full",
            i < count ? "bg-green-500 border-green-500" : "bg-transparent border-legion-border"
          )}
        />
      ))}
    </div>
  );
}
