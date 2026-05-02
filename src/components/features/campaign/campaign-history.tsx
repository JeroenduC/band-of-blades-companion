'use client';

import React, { useState } from 'react';
import { type Campaign, type CampaignPhaseLog, type Mission, type AnnalsEntry, type LegionRole } from '@/lib/types';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { PhaseSummary } from './phase-summary';
import { cn } from '@/lib/utils';
import { 
  HistoryIcon, 
  MapPinIcon, 
  SkullIcon, 
  SwordIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  TrendingUpIcon,
  TrendingDownIcon
} from 'lucide-react';

interface CampaignHistoryProps {
  campaign: Campaign;
  role: LegionRole;
  logs: CampaignPhaseLog[];
  missions: Mission[];
  annals: AnnalsEntry[];
}

export function CampaignHistory({ campaign, role, logs, missions, annals }: CampaignHistoryProps) {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);

  // Group data by phase
  const maxPhase = Math.max(campaign.phase_number, ...logs.map(l => l.phase_number));
  const phases = Array.from({ length: maxPhase }, (_, i) => maxPhase - i).filter(p => p > 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <div className="p-2 rounded bg-legion-amber/20">
          <HistoryIcon className="w-5 h-5 text-legion-amber" />
        </div>
        <div>
          <h2 className="font-heading text-2xl text-legion-text-primary uppercase tracking-widest">
            Campaign History
          </h2>
          <p className="text-[10px] text-legion-text-muted uppercase tracking-[0.1em] font-mono">
            The Annals of the Legion's Long Retreat
          </p>
        </div>
      </div>

      <div className="relative pl-8 space-y-6 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-white/5">
        {phases.map((phaseNum) => (
          <PhaseEntry 
            key={phaseNum}
            phaseNum={phaseNum}
            currentPhase={campaign.phase_number}
            isExpanded={expandedPhase === phaseNum}
            onToggle={() => setExpandedPhase(expandedPhase === phaseNum ? null : phaseNum)}
            campaign={campaign}
            role={role}
            logs={logs.filter(l => l.phase_number === phaseNum)}
            missions={missions.filter(m => m.phase_number === phaseNum)}
            annal={annals.find(a => a.phase_number === phaseNum)}
          />
        ))}
      </div>
    </div>
  );
}

function PhaseEntry({ 
  phaseNum, 
  currentPhase, 
  isExpanded, 
  onToggle,
  campaign,
  role,
  logs,
  missions,
  annal
}: { 
  phaseNum: number;
  currentPhase: number;
  isExpanded: boolean;
  onToggle: () => void;
  campaign: Campaign;
  role: LegionRole;
  logs: CampaignPhaseLog[];
  missions: Mission[];
  annal?: AnnalsEntry;
}) {
  const isCurrent = phaseNum === currentPhase;
  
  // Extract key info for the summary line
  const locationLog = logs.find(l => l.action_type === 'ADVANCE' || l.action_type === 'STAY');
  const location = (locationLog?.details as any)?.to || (locationLog?.details as any)?.location || 'Unknown';
  
  const deaths = logs
    .filter(l => l.action_type === 'MISSION_RESOLVED' || l.action_type === 'PERSONNEL_UPDATED')
    .reduce((acc, l) => acc + (Number((l.details as any).legionnaires_killed) || Number((l.details as any).new_deaths) || 0), 0);

  const moraleDelta = logs
    .filter(l => l.action_type === 'MISSION_RESOLVED')
    .reduce((acc, l) => acc + (Number((l.details as any).morale_change) || 0), 0);

  return (
    <div className="relative">
      {/* Timeline Dot */}
      <div className={cn(
        "absolute -left-[25px] top-1.5 w-4 h-4 rounded-full border-2 z-10 transition-all",
        isCurrent ? "bg-legion-amber border-legion-amber shadow-[0_0_10px_rgba(var(--bob-amber-rgb),0.5)] scale-110" : 
        "bg-legion-bg-base border-white/20"
      )} />

      <div 
        className={cn(
          "p-4 rounded-lg border transition-all cursor-pointer group",
          isExpanded ? "bg-white/10 border-white/20" : "bg-white/5 border-white/5 hover:border-white/10"
        )}
        onClick={onToggle}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className={cn(
              "font-heading text-lg",
              isCurrent ? "text-legion-amber" : "text-legion-text-primary"
            )}>
              Phase {phaseNum}
            </span>
            {isCurrent && (
              <span className="px-1.5 py-0.5 rounded bg-legion-amber/20 text-legion-amber text-[8px] font-bold uppercase border border-legion-amber/30 animate-pulse">
                In Progress
              </span>
            )}
            <div className="flex items-center gap-1.5 text-[10px] text-legion-text-muted font-mono uppercase tracking-tighter">
              <MapPinIcon className="w-3 h-3" />
              {location}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              {deaths > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-red-400 font-bold uppercase">
                  <SkullIcon className="w-3 h-3" />
                  {deaths}
                </div>
              )}
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase">
                <SwordIcon className="w-3 h-3 text-legion-text-muted" />
                {missions.length}
              </div>
              {moraleDelta !== 0 && (
                <div className={cn(
                  "flex items-center gap-0.5 text-[10px] font-bold uppercase",
                  moraleDelta > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {moraleDelta > 0 ? <TrendingUpIcon className="w-2.5 h-2.5" /> : <TrendingDownIcon className="w-2.5 h-2.5" />}
                  {moraleDelta > 0 ? `+${moraleDelta}` : moraleDelta}
                </div>
              )}
            </div>
            <div className="text-legion-text-muted group-hover:text-legion-amber transition-colors">
              {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-6 pt-6 border-t border-white/10 animate-in slide-in-from-top-2 duration-300">
            <PhaseSummary 
              campaign={campaign}
              role={role}
              logs={logs}
              isHistoryView={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
