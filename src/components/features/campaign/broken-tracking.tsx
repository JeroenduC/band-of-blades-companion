'use client';

import React, { useState } from 'react';
import { type BrokenAdvance, type Campaign, type BrokenName } from '@/lib/types';
import { BROKEN_TEMPLATES } from '@/lib/broken-data';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { toggleBrokenAbility, updateBrokenNotes } from '@/server/actions/phase/gm';
import { GmAntagonistSelection } from './gm-antagonist-selection';
import { cn } from '@/lib/utils';
import { LockIcon, UnlockIcon, SkullIcon, StickyNoteIcon, SettingsIcon } from 'lucide-react';

interface BrokenTrackingProps {
  campaign: Campaign;
  advances: BrokenAdvance[];
}

export function BrokenTracking({ campaign, advances }: BrokenTrackingProps) {
  const chosenBroken = campaign.chosen_broken || [];
  const [isEditingSelection, setIsEditingSelection] = useState(false);

  if (chosenBroken.length === 0 || isEditingSelection) {
    return (
      <div className="space-y-4">
        {chosenBroken.length > 0 && (
          <div className="flex justify-end">
            <button 
              onClick={() => setIsEditingSelection(false)}
              className="text-[10px] font-bold uppercase tracking-widest text-legion-text-muted hover:text-white"
            >
              Cancel Editing
            </button>
          </div>
        )}
        <LegionCard className="border-legion-amber/20 bg-black/20">
          <LegionCardHeader>
            <LegionCardTitle className="text-sm font-heading text-legion-text-primary uppercase tracking-widest">
              Choose Campaign Antagonists
            </LegionCardTitle>
          </LegionCardHeader>
          <LegionCardContent>
            <GmAntagonistSelection campaignId={campaign.id} currentChosen={chosenBroken} />
          </LegionCardContent>
        </LegionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button 
          onClick={() => setIsEditingSelection(true)}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-legion-text-muted hover:text-legion-amber transition-colors"
        >
          <SettingsIcon className="w-3 h-3" />
          Change Antagonists
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {chosenBroken.map((name) => {
        const template = BROKEN_TEMPLATES[name as BrokenName];
        if (!template) return null;
        
        const brokenAdvances = advances.filter(a => a.broken_name === name);

        return (
          <BrokenCard 
            key={name}
            campaign={campaign}
            template={template}
            advances={brokenAdvances}
          />
        );
      })}
      </div>
    </div>
  );
}

function BrokenCard({ campaign, template, advances }: { campaign: Campaign, template: any, advances: BrokenAdvance[] }) {
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');

  const handleToggle = async (abilityName: string, currentlyUnlocked: boolean) => {
    try {
      await toggleBrokenAbility(campaign.id, template.name, abilityName, !currentlyUnlocked, campaign.phase_number);
    } catch (err) {
      console.error(err);
      alert('Failed to update ability');
    }
  };

  const handleSaveNotes = async (abilityName: string) => {
    try {
      await updateBrokenNotes(campaign.id, template.name, abilityName, noteValue);
      setEditingNotes(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save notes');
    }
  };

  return (
    <div className="space-y-4">
      <LegionCard className="border-red-900/30 bg-red-950/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <SkullIcon className="w-24 h-24 text-red-500" />
        </div>
        
        <LegionCardHeader className="border-b border-red-900/20 pb-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest">Antagonist</span>
            <LegionCardTitle className="text-2xl font-heading text-legion-text-primary uppercase tracking-tight">
              {template.title}
            </LegionCardTitle>
          </div>
          <p className="text-xs text-legion-text-muted italic leading-relaxed pr-12">
            {template.description}
          </p>
        </LegionCardHeader>

        <LegionCardContent className="pt-6 space-y-8">
          
          {/* Abilities */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-legion-text-muted border-b border-white/5 pb-1">Unlocked Abilities</h4>
            <div className="space-y-3">
              {template.abilities.map((ability: any) => {
                const advance = advances.find(a => a.ability_name === ability.name);
                const isUnlocked = advance?.unlocked || false;
                
                return (
                  <div 
                    key={ability.name}
                    className={cn(
                      "p-3 rounded border transition-all",
                      isUnlocked 
                        ? "bg-red-500/10 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]" 
                        : "bg-white/5 border-white/5 opacity-60 hover:opacity-100"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="space-y-0.5">
                        <div className={cn(
                          "font-heading text-sm uppercase tracking-wide",
                          isUnlocked ? "text-red-400" : "text-legion-text-muted"
                        )}>
                          {ability.name}
                        </div>
                        <div className="text-[10px] text-legion-text-muted font-mono uppercase">
                          Condition: {ability.unlock_condition}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleToggle(ability.name, isUnlocked)}
                        className={cn(
                          "p-2 rounded-full transition-colors",
                          isUnlocked ? "bg-red-500/20 text-red-400" : "bg-white/10 text-legion-text-muted"
                        )}
                      >
                        {isUnlocked ? <UnlockIcon className="w-3.5 h-3.5" /> : <LockIcon className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-legion-text-muted italic leading-relaxed">
                      {ability.description}
                    </p>

                    {/* Notes Section */}
                    <div className="mt-3 pt-3 border-t border-white/5">
                      {editingNotes === ability.name ? (
                        <div className="space-y-2">
                          <textarea 
                            value={noteValue}
                            onChange={(e) => setNoteValue(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded p-2 text-[10px] text-legion-text-primary h-16 focus:outline-none focus:border-red-500/50"
                            placeholder="Add narrative or mechanical notes..."
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingNotes(null)} className="text-[9px] font-bold uppercase text-legion-text-muted hover:text-white transition-colors">Cancel</button>
                            <button onClick={() => handleSaveNotes(ability.name)} className="text-[9px] font-bold uppercase text-red-400 hover:text-red-300 transition-colors">Save Notes</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center group/note">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <StickyNoteIcon className="w-3 h-3 text-legion-text-muted shrink-0" />
                            <span className="text-[10px] text-legion-text-muted italic truncate">
                              {advance?.notes || 'No notes added...'}
                            </span>
                          </div>
                          <button 
                            onClick={() => {
                              setEditingNotes(ability.name);
                              setNoteValue(advance?.notes || '');
                            }}
                            className="text-[9px] font-bold uppercase text-red-400/0 group-hover/note:text-red-400/100 transition-all hover:text-red-300"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lieutenants & Infamous */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-legion-text-muted border-b border-white/5 pb-1">Lieutenants</h4>
              {template.lieutenants.map((l: any) => (
                <div key={l.name} className="space-y-0.5">
                  <div className="text-[11px] font-bold text-legion-text-primary uppercase tracking-tight">{l.name}</div>
                  <div className="text-[9px] text-legion-text-muted italic leading-tight">{l.description}</div>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-legion-text-muted border-b border-white/5 pb-1">Infamous</h4>
              {template.infamous.map((i: any) => (
                <div key={i.name} className="space-y-0.5">
                  <div className="text-[11px] font-bold text-legion-text-primary uppercase tracking-tight">{i.name}</div>
                  <div className="text-[9px] text-legion-text-muted italic leading-tight">{i.description}</div>
                </div>
              ))}
            </div>
          </div>

        </LegionCardContent>
      </LegionCard>
    </div>
  );
}
