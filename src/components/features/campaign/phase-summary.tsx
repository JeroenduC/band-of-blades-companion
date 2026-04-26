'use client';

import React from 'react';
import { type CampaignPhaseLog, type LegionRole, type Campaign } from '@/lib/types';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { cn } from '@/lib/utils';
import { HistoryIcon, TrendingUpIcon, TrendingDownIcon, Share2Icon, PlayIcon, SkullIcon, TargetIcon, PackageIcon, ZapIcon } from 'lucide-react';
import { startCampaignPhase } from '@/server/actions/phase';

interface PhaseSummaryProps {
  campaign: Campaign;
  role: LegionRole;
  logs: CampaignPhaseLog[];
}

export function PhaseSummary({ campaign, role, logs }: PhaseSummaryProps) {
  const currentPhase = campaign.phase_number;
  const phaseLogs = logs.filter(l => l.phase_number === currentPhase);

  const handleShare = () => {
    const summary = generatePlaintextSummary(role, campaign, phaseLogs);
    navigator.clipboard.writeText(summary);
    alert('Summary copied to clipboard!');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* ─── Hero Header ─── */}
      <div className="text-center space-y-3 py-6">
        <div className="inline-block px-3 py-1 rounded-full bg-legion-amber/10 border border-legion-amber/30 text-[10px] text-legion-amber font-bold uppercase tracking-[0.2em] mb-2">
          Phase {currentPhase} Complete
        </div>
        <h2 className="font-heading text-4xl text-legion-text-primary uppercase tracking-tight">
          The Long Retreat
        </h2>
        <p className="text-sm text-legion-text-muted italic max-w-md mx-auto leading-relaxed">
          &ldquo;Another phase behind us, another mile of blood-soaked earth. The Legion endures, but the cost grows with every step.&rdquo;
        </p>
      </div>

      {/* ─── Role-Specific Summary Card ─── */}
      <LegionCard className="border-legion-amber/40 shadow-xl shadow-legion-amber/5">
        <LegionCardHeader className="border-b border-white/5 pb-4 bg-white/5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-legion-amber/20">
                <HistoryIcon className="w-5 h-5 text-legion-amber" />
              </div>
              <div>
                <LegionCardTitle className="text-lg font-heading text-legion-text-primary uppercase tracking-widest">
                  {role} Report
                </LegionCardTitle>
                <p className="text-[10px] text-legion-text-muted uppercase tracking-[0.1em] font-mono">
                  Operational Summary — Phase {currentPhase}
                </p>
              </div>
            </div>
            <button 
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 text-[10px] text-legion-text-muted hover:text-legion-amber hover:border-legion-amber/50 transition-all"
            >
              <Share2Icon className="w-3 h-3" />
              Share
            </button>
          </div>
        </LegionCardHeader>
        <LegionCardContent className="pt-8 space-y-10">
          
          {/* Global Impact (Deltas) */}
          <section className="space-y-4">
            <h4 className="text-[11px] font-mono uppercase tracking-[0.2em] text-legion-amber border-b border-legion-amber/10 pb-1">Strategic Impact</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <DeltaMetric label="Morale" value={campaign.morale} delta={calculateDelta(phaseLogs, 'MISSION_RESOLVED', 'morale_change')} />
              <DeltaMetric label="Pressure" value={campaign.pressure} delta={calculateDelta(phaseLogs, 'TIME_PASSED', 'pressure_gain')} />
              <DeltaMetric label="Supply" value={campaign.supply} delta={calculateDelta(phaseLogs, 'MISSION_RESOLVED', 'supply_gain')} />
              <DeltaMetric label="Intel" value={campaign.intel} delta={calculateDelta(phaseLogs, 'MISSION_RESOLVED', 'intel_gain')} />
            </div>
          </section>

          {/* Role Specific Narrative */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <RoleNarrative role={role} logs={phaseLogs} />
            
            {/* Highlights */}
            <section className="space-y-4">
              <h4 className="text-[11px] font-mono uppercase tracking-[0.2em] text-legion-text-muted border-b border-white/5 pb-1">Phase Highlights</h4>
              <div className="space-y-3">
                {getHighlights(role, phaseLogs).map((h, i) => (
                  <div key={i} className="flex gap-3 text-xs leading-relaxed group">
                    <span className="text-legion-amber mt-1 shrink-0"><ZapIcon className="w-3 h-3" /></span>
                    <p className="text-legion-text-muted group-hover:text-legion-text-primary transition-colors">{h}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

        </LegionCardContent>
      </LegionCard>

      {/* ─── GM Controls ─── */}
      {role === 'GM' && (
        <div className="flex justify-center pt-4">
          <form action={startCampaignPhase}>
            <input type="hidden" name="campaign_id" value={campaign.id} />
            <button
              type="submit"
              className="flex items-center gap-3 bg-legion-amber text-black px-10 py-4 rounded font-heading text-sm font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-all shadow-[0_0_30px_rgba(var(--bob-amber-rgb),0.3)] hover:scale-105 active:scale-95"
            >
              <PlayIcon className="w-4 h-4 fill-current" />
              Start Phase {currentPhase + 1}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}

function DeltaMetric({ label, value, delta }: { label: string, value: number, delta: number }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] text-legion-text-muted uppercase tracking-tighter">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-heading text-legion-text-primary">{value}</span>
        {delta !== 0 && (
          <span className={cn(
            "text-[10px] font-bold flex items-center gap-0.5",
            delta > 0 ? "text-green-500" : "text-red-500"
          )}>
            {delta > 0 ? <TrendingUpIcon className="w-2.5 h-2.5" /> : <TrendingDownIcon className="w-2.5 h-2.5" />}
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>
    </div>
  );
}

function RoleNarrative({ role, logs }: { role: LegionRole, logs: CampaignPhaseLog[] }) {
  const content = getRoleNarrative(role, logs);
  return (
    <section className="space-y-4">
      <h4 className="text-[11px] font-mono uppercase tracking-[0.2em] text-legion-text-muted border-b border-white/5 pb-1">Operational Recap</h4>
      <p className="text-sm text-legion-text-muted italic leading-relaxed border-l-2 border-legion-amber/20 pl-4 py-1">
        {content}
      </p>
    </section>
  );
}

// ─── Content Generation Logic ────────────────────────────────────────────────

function calculateDelta(logs: CampaignPhaseLog[], actionType: string, field: string): number {
  return logs
    .filter(l => l.action_type === actionType)
    .reduce((acc, l) => acc + (Number((l.details as any)[field]) || 0), 0);
}

function getRoleNarrative(role: LegionRole, logs: CampaignPhaseLog[]): string {
  switch (role) {
    case 'GM': return "You oversaw the transition of the Legion through another grueling phase. From mission resolution to the strategic map, your guidance shaped the narrative of the retreat.";
    case 'COMMANDER': return "The weight of the Legion's movement rested on your shoulders. Your decisions on when to advance and what missions to focus on defined the strategic pace.";
    case 'MARSHAL': return "You managed the blood and bone of the Legion. Between recording casualties and deploying squads, your hand ensured the right people were in the right hells.";
    case 'QUARTERMASTER': return "Logistics is the silent engine of the retreat. You kept the supplies flowing, worked on long-term fortifications, and managed the specialists' needs.";
    case 'SPYMASTER': return "You moved in the shadows of the Legion's march. By interrogating the enemy and expanding the network, you provided the intel necessary for survival.";
    case 'LOREKEEPER': return "You are the memory of the Legion. By telling the Tales of the Fallen and recording the Annals, you ensured that the retreat's history is preserved.";
    default: return "The Legion endures. You served your role and prepared for the next mission.";
  }
}

function getHighlights(role: LegionRole, logs: CampaignPhaseLog[]): string[] {
  const h: string[] = [];
  
  // Add common highlights
  const missionLog = logs.find(l => l.action_type === 'MISSION_RESOLVED');
  if (missionLog) {
    const d = missionLog.details as any;
    h.push(`Primary mission resolved as ${d.primary_outcome}.`);
    if (d.legionnaires_killed > 0) h.push(`${d.legionnaires_killed} Legionnaires were lost during the mission phase.`);
  }

  const taleLog = logs.find(l => l.action_type === 'TALE_TOLD');
  if (taleLog) h.push(`A Tale was told, honoring the fallen and boosting spirits.`);

  const advanceLog = logs.find(l => l.action_type === 'ADVANCE');
  if (advanceLog) h.push(`The Legion successfully advanced to the next location.`);

  const projectLog = logs.find(l => l.action_type === 'ALCHEMIST_PROJECT');
  if (projectLog) h.push(`The Alchemists completed a dangerous project.`);

  if (h.length === 0) h.push("The phase passed without major strategic deviations.");

  return h;
}

function generatePlaintextSummary(role: LegionRole, campaign: Campaign, logs: CampaignPhaseLog[]): string {
  const highlights = getHighlights(role, logs);
  return `BAND OF BLADES — PHASE ${campaign.phase_number} SUMMARY (${role})
  
Strategic Status:
- Morale: ${campaign.morale}
- Pressure: ${campaign.pressure}
- Supply: ${campaign.supply}
- Intel: ${campaign.intel}

Highlights:
${highlights.map(h => `* ${h}`).join('\n')}

The Legion endures.`;
}
