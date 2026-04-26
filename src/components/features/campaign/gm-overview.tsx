'use client';

import React from 'react';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { type Campaign, type LegionRole, type CampaignPhaseState } from '@/lib/types';
import { getStepForState } from '@/lib/state-machine';
import { BROKEN_TEMPLATES } from '@/lib/broken-data';

interface GmOverviewProps {
  campaign: Campaign;
  personnelCounts: {
    rookies: number;
    soldiers: number;
    specialists: number;
    squads: number;
  };
  spyCounts: {
    total: number;
    networkUpgrades: string[];
  };
}

export function GmOverview({ campaign, personnelCounts, spyCounts }: GmOverviewProps) {
  const currentStep = campaign.campaign_phase_state ? getStepForState(campaign.campaign_phase_state) : null;
  const whoActsNext = currentStep ? currentStep.roles.join(' & ') : 'None';

  const moraleLevel = campaign.morale >= 8 ? 'HIGH' : campaign.morale >= 4 ? 'MEDIUM' : 'LOW';
  const moraleColor = 
    moraleLevel === 'HIGH' ? 'text-green-500' : 
    moraleLevel === 'MEDIUM' ? 'text-legion-amber' : 
    'text-red-500';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
      
      {/* ─── Resources & Morale ─── */}
      <LegionCard>
        <LegionCardHeader>
          <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
            Resources & Morale
          </LegionCardTitle>
        </LegionCardHeader>
        <LegionCardContent className="space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-legion-text-muted">Morale ({moraleLevel})</span>
            <span className={`text-2xl font-heading ${moraleColor}`}>{campaign.morale}</span>
          </div>
          <div className="flex justify-between items-baseline border-t border-white/5 pt-2">
            <span className="text-sm text-legion-text-muted">Pressure</span>
            <span className="text-xl font-heading text-legion-text-primary">{campaign.pressure}</span>
          </div>
          <div className="flex justify-between items-baseline border-t border-white/5 pt-2">
            <span className="text-sm text-legion-text-muted">Intel</span>
            <span className="text-xl font-heading text-legion-text-primary">{campaign.intel}</span>
          </div>
          <div className="flex justify-between items-baseline border-t border-white/5 pt-2">
            <span className="text-sm text-legion-text-muted">Supply</span>
            <span className="text-xl font-heading text-legion-text-primary">{campaign.supply}</span>
          </div>
        </LegionCardContent>
      </LegionCard>

      {/* ─── Time Clocks ─── */}
      <LegionCard>
        <LegionCardHeader>
          <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
            Time Clocks
          </LegionCardTitle>
        </LegionCardHeader>
        <LegionCardContent className="space-y-4">
          {[1, 2, 3].map((num) => {
            const val = (campaign as any)[`time_clock_${num}`] || 0;
            return (
              <div key={num} className="space-y-1">
                <div className="flex justify-between text-xs text-legion-text-muted uppercase">
                  <span>Clock {num}</span>
                  <span>{val}/10</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-legion-amber transition-all duration-500" 
                    style={{ width: `${(val / 10) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </LegionCardContent>
      </LegionCard>

      {/* ─── Materiel ─── */}
      <LegionCard>
        <LegionCardHeader>
          <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
            Materiel Uses
          </LegionCardTitle>
        </LegionCardHeader>
        <LegionCardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <span className="text-[10px] text-legion-text-muted uppercase tracking-tighter">Food</span>
            <div className="text-lg font-heading text-legion-text-primary">{campaign.food_uses}</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-legion-text-muted uppercase tracking-tighter">Horses</span>
            <div className="text-lg font-heading text-legion-text-primary">{campaign.horse_uses}</div>
          </div>
          <div className="space-y-0.5 border-t border-white/5 pt-1">
            <span className="text-[10px] text-legion-text-muted uppercase tracking-tighter">Black Shot</span>
            <div className="text-lg font-heading text-legion-text-primary">{campaign.black_shot_uses}</div>
          </div>
          <div className="space-y-0.5 border-t border-white/5 pt-1">
            <span className="text-[10px] text-legion-text-muted uppercase tracking-tighter">Relig. Supply</span>
            <div className="text-lg font-heading text-legion-text-primary">{campaign.religious_supply_uses}</div>
          </div>
        </LegionCardContent>
      </LegionCard>

      {/* ─── Personnel ─── */}
      <LegionCard>
        <LegionCardHeader>
          <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
            Legion Personnel
          </LegionCardTitle>
        </LegionCardHeader>
        <LegionCardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-legion-text-muted">Rookies</span>
            <span className="font-mono text-legion-text-primary">{personnelCounts.rookies}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-legion-text-muted">Soldiers</span>
            <span className="font-mono text-legion-text-primary">{personnelCounts.soldiers}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-legion-text-muted">Specialists</span>
            <span className="font-mono text-legion-text-primary">{personnelCounts.specialists}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-white/5 pt-1">
            <span className="text-legion-text-muted">Squads</span>
            <span className="font-mono text-legion-text-primary">{personnelCounts.squads}</span>
          </div>
          <div className="flex justify-between text-sm text-red-400 pt-1">
            <span className="">Deaths since Tale</span>
            <span className="font-mono">{campaign.deaths_since_last_tale}</span>
          </div>
        </LegionCardContent>
      </LegionCard>

      {/* ─── Spies & Network ─── */}
      <LegionCard>
        <LegionCardHeader>
          <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
            Intelligence Network
          </LegionCardTitle>
        </LegionCardHeader>
        <LegionCardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-legion-text-muted">Active Spies</span>
            <span className="font-mono text-legion-text-primary">{spyCounts.total}</span>
          </div>
          <div className="space-y-1 pt-1">
            <span className="text-[10px] text-legion-text-muted uppercase tracking-widest">Upgrades Unlocked</span>
            <div className="flex flex-wrap gap-1.5">
              {spyCounts.networkUpgrades.length > 0 ? (
                spyCounts.networkUpgrades.map((u) => (
                  <span key={u} className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-legion-amber border border-legion-amber/20">
                    {u}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-legion-text-muted italic">None</span>
              )}
            </div>
          </div>
        </LegionCardContent>
      </LegionCard>

      {/* ─── Campaign State ─── */}
      <LegionCard className="border-legion-amber/20">
        <LegionCardHeader>
          <LegionCardTitle className="text-sm font-medium text-legion-amber uppercase tracking-widest">
            Current Phase Step
          </LegionCardTitle>
        </LegionCardHeader>
        <LegionCardContent className="space-y-3">
          <div className="text-lg font-heading text-legion-text-primary leading-tight">
            {currentStep?.label || 'PHASE_COMPLETE'}
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-legion-text-muted uppercase tracking-widest">Who Acts Next</span>
            <div className="text-sm text-legion-amber font-semibold">
              {whoActsNext}
            </div>
          </div>
          <div className="text-xs text-legion-text-muted leading-relaxed italic">
            "{currentStep?.description}"
          </div>
        </LegionCardContent>
      </LegionCard>

    </div>
  );
}
