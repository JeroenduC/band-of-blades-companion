'use client';

import React, { useState } from 'react';
import { type Campaign, type BrokenName } from '@/lib/types';
import { BROKEN_TEMPLATES } from '@/lib/broken-data';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { selectBroken } from '@/server/actions/phase/gm';
import { cn } from '@/lib/utils';
import { SkullIcon, SaveIcon } from 'lucide-react';

interface GmAntagonistSelectionProps {
  campaignId: string;
  currentChosen: string[];
}

export function GmAntagonistSelection({ campaignId, currentChosen }: GmAntagonistSelectionProps) {
  const [selected, setSelected] = useState<string[]>(currentChosen);
  const [isPending, setIsPending] = useState(false);

  const toggleSelected = (name: string) => {
    if (selected.includes(name)) {
      setSelected(selected.filter(n => n !== name));
    } else {
      if (selected.length < 2) {
        setSelected([...selected, name]);
      }
    }
  };

  const handleSave = async () => {
    if (selected.length !== 2) return;
    setIsPending(true);
    try {
      await selectBroken(campaignId, selected);
    } catch (err) {
      console.error(err);
      alert('Failed to save selection');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-legion-text-muted">Antagonist Selection</h4>
        {selected.length === 2 && (
          <button 
            onClick={handleSave}
            disabled={isPending || JSON.stringify(selected.sort()) === JSON.stringify(currentChosen.sort())}
            className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-legion-amber hover:underline disabled:opacity-30"
          >
            <SaveIcon className="w-3 h-3" />
            {isPending ? 'Saving...' : 'Save Selection'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(BROKEN_TEMPLATES) as BrokenName[]).map((name) => {
          const template = BROKEN_TEMPLATES[name];
          const isSelected = selected.includes(name);
          
          return (
            <button
              key={name}
              onClick={() => toggleSelected(name)}
              className={cn(
                "p-3 rounded border transition-all text-left space-y-1",
                isSelected 
                  ? "bg-red-500/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]" 
                  : "bg-white/5 border-white/5 hover:border-white/10"
              )}
            >
              <div className="flex justify-between items-center">
                <span className={cn(
                  "font-heading text-xs uppercase tracking-widest",
                  isSelected ? "text-red-400" : "text-legion-text-muted"
                )}>
                  {template.name}
                </span>
                {isSelected && <SkullIcon className="w-3 h-3 text-red-500" />}
              </div>
              <p className="text-[9px] text-legion-text-muted line-clamp-1 italic">
                {template.title}
              </p>
            </button>
          );
        })}
      </div>
      
      {selected.length !== 2 && (
        <p className="text-[9px] text-red-400 italic">Select exactly two antagonists for the campaign.</p>
      )}
    </div>
  );
}
