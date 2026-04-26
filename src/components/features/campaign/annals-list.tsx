'use client';

import React, { useState, useTransition } from 'react';
import { type LorekeeperData } from '@/server/loaders/dashboard';
import { type Mission, type CampaignPhaseLog } from '@/lib/types';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { saveAnnalsNotes } from '@/server/actions/phase/lorekeeper';
import { cn } from '@/lib/utils';

interface AnnalsListProps {
  campaignId: string;
  data: LorekeeperData;
  currentPhaseNumber: number;
}

export function AnnalsList({ campaignId, data, currentPhaseNumber }: AnnalsListProps) {
  const [isPending, startTransition] = useTransition();
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>(
    Object.fromEntries(data.annals.map(a => [a.phase_number, a.lorekeeper_notes]))
  );

  const handleSave = (phaseNumber: number) => {
    startTransition(async () => {
      try {
        await saveAnnalsNotes(campaignId, phaseNumber, editingNotes[phaseNumber] || '');
      } catch (err) {
        console.error(err);
        alert('Failed to save notes');
      }
    });
  };

  // Group data by phase
  const phases = Array.from({ length: currentPhaseNumber }, (_, i) => i + 1).reverse();

  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      {phases.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border rounded-lg bg-legion-bg-subtle/30">
          <p className="text-legion-text-muted font-heading italic">
            The Annals await their first entry. No missions have been completed.
          </p>
        </div>
      ) : (
        phases.map((phaseNum) => {
          const phaseMissions = data.missions.filter(m => m.phase_number === phaseNum);
          const phaseLogs = data.logs.filter(l => l.phase_number === phaseNum);
          const phaseAnnals = data.annals.find(a => a.phase_number === phaseNum);
          
          // Try to find the location from logs (PHASE_START or similar)
          const phaseStart = phaseLogs.find(l => l.action_type === 'PHASE_START');
          const location = phaseStart?.details?.location_name as string || 'Unknown Territory';

          return (
            <div key={phaseNum} className="relative pl-8 border-l-2 border-border/30 last:border-l-0 pb-12 last:pb-0">
              {/* Timeline Dot */}
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-legion-bg border-2 border-legion-amber" />
              
              <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="font-mono text-xs font-bold text-legion-amber uppercase tracking-tighter">
                    Phase {phaseNum}
                  </span>
                  <h3 className="text-xl font-heading font-bold text-legion-text uppercase tracking-tight">
                    {location}
                  </h3>
                </div>

                {/* Missions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {phaseMissions.map((mission) => (
                    <MissionSummary key={mission.id} mission={mission} />
                  ))}
                  {phaseMissions.length === 0 && (
                    <p className="text-xs text-legion-text-muted italic col-span-full">
                      No mission records found for this phase.
                    </p>
                  )}
                </div>

                {/* Lorekeeper Notes */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-legion-text-muted">
                      Lorekeeper&apos;s Commentary
                    </h4>
                    <button
                      onClick={() => handleSave(phaseNum)}
                      disabled={isPending || (editingNotes[phaseNum] === (phaseAnnals?.lorekeeper_notes || ''))}
                      className="text-[10px] font-bold uppercase tracking-widest text-legion-amber hover:underline disabled:opacity-30 disabled:no-underline transition-all"
                    >
                      {isPending ? 'Saving...' : 'Save Entry'}
                    </button>
                  </div>
                  
                  <div className="relative group">
                    <textarea
                      value={editingNotes[phaseNum] || ''}
                      onChange={(e) => setEditingNotes(prev => ({ ...prev, [phaseNum]: e.target.value }))}
                      placeholder="Record the character of this phase, the mood of the camp, and the weight of our choices..."
                      className="w-full bg-legion-bg-elevated/50 border border-border/50 rounded-lg p-5 text-sm text-legion-text italic leading-relaxed focus:outline-none focus:ring-1 focus:ring-legion-amber/30 transition-all resize-none min-h-[120px] shadow-inner"
                    />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-20 pointer-events-none transition-opacity">
                      <span className="text-2xl">🖋️</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function MissionSummary({ mission }: { mission: Mission }) {
  const isPrimary = mission.status === 'PRIMARY';
  const isFailed = mission.status === 'FAILED';

  return (
    <div className={cn(
      "p-3 rounded border bg-legion-bg-elevated/30 space-y-2",
      isFailed ? "border-red-900/30 grayscale" : "border-border/50"
    )}>
      <div className="flex justify-between items-start gap-2">
        <h5 className="text-xs font-bold text-legion-text uppercase truncate">{mission.name}</h5>
        <span className={cn(
          "text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0",
          isPrimary ? "bg-legion-amber/20 text-legion-amber" : "bg-border/30 text-legion-text-muted"
        )}>
          {mission.status}
        </span>
      </div>
      
      <div className="space-y-1">
        <p className="text-[10px] text-legion-text-muted line-clamp-2 italic leading-normal">
          &ldquo;{mission.objective}&rdquo;
        </p>
      </div>

      {/* Casualties (Simplified check - would ideally track per mission) */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {mission.type && (
          <span className="text-[9px] font-mono text-legion-text-muted opacity-60">
            Type: {mission.type}
          </span>
        )}
      </div>
    </div>
  );
}
