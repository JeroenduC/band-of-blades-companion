'use client';

import React from 'react';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { type FallenLegionnaire } from '@/server/loaders/dashboard';
import { cn } from '@/lib/utils';

interface DeathTrackerProps {
  deathsSinceLastTale: number;
  totalFallen: number;
  fallen: FallenLegionnaire[];
}

export function DeathTracker({ deathsSinceLastTale, totalFallen, fallen }: DeathTrackerProps) {
  const needsTale = deathsSinceLastTale >= 4;

  return (
    <div className="space-y-6">
      {/* Tracker Hero */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LegionCard className={cn(
          "relative overflow-hidden transition-all duration-500",
          needsTale ? "border-legion-amber ring-1 ring-legion-amber/30" : ""
        )}>
          <LegionCardHeader className="pb-2">
            <LegionCardTitle className="text-xs font-semibold uppercase tracking-wider text-legion-text-muted">
              Deaths Since Last Tale
            </LegionCardTitle>
          </LegionCardHeader>
          <LegionCardContent>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-4xl font-heading font-bold",
                needsTale ? "text-legion-amber animate-pulse" : "text-legion-text"
              )}>
                {deathsSinceLastTale}
              </span>
              <span className="text-legion-text-muted text-lg">/ 4</span>
            </div>
            
            {needsTale && (
              <div className="mt-4 py-2 px-3 bg-legion-amber/10 border border-legion-amber/20 rounded flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-legion-amber animate-ping" />
                <span className="text-sm font-heading font-semibold text-legion-amber uppercase tracking-tight">
                  A Tale must be told
                </span>
              </div>
            )}
          </LegionCardContent>
          
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <span className="text-8xl font-heading">💀</span>
          </div>
        </LegionCard>

        <LegionCard>
          <LegionCardHeader className="pb-2">
            <LegionCardTitle className="text-xs font-semibold uppercase tracking-wider text-legion-text-muted">
              Total Fallen
            </LegionCardTitle>
          </LegionCardHeader>
          <LegionCardContent>
            <div className="text-4xl font-heading font-bold text-legion-text">
              {totalFallen}
            </div>
            <p className="text-sm text-legion-text-muted mt-2 italic">
              "Their names are etched in history."
            </p>
          </LegionCardContent>
        </LegionCard>
      </div>

      {/* List of the Fallen */}
      <LegionCard>
        <LegionCardHeader>
          <LegionCardTitle className="text-lg font-heading text-legion-text uppercase tracking-tight">
            List of the Fallen
          </LegionCardTitle>
        </LegionCardHeader>
        <LegionCardContent>
          {fallen.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-legion-text-muted font-heading italic">
                No Legionnaires have fallen yet. May it stay that way.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 font-heading font-semibold text-legion-text-muted uppercase tracking-wider">Name</th>
                    <th className="py-3 font-heading font-semibold text-legion-text-muted uppercase tracking-wider">Rank</th>
                    <th className="py-3 font-heading font-semibold text-legion-text-muted uppercase tracking-wider">Squad</th>
                    <th className="py-3 font-heading font-semibold text-legion-text-muted uppercase tracking-wider">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fallen.map((l) => (
                    <tr key={l.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 font-heading font-bold text-legion-text">{l.name}</td>
                      <td className="py-4">
                        <span className="px-2 py-0.5 rounded-full bg-legion-bg-elevated border border-border text-[10px] font-bold text-legion-text-muted uppercase">
                          {l.rank}
                        </span>
                      </td>
                      <td className="py-4 text-legion-text-muted">{l.squad_name || '—'}</td>
                      <td className="py-4 text-legion-text-muted tabular-nums">
                        {new Date(l.died_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </LegionCardContent>
      </LegionCard>
    </div>
  );
}
