'use client';

import { useEffect, useState } from 'react';
import { undoCampaignAction, commitPendingState } from '@/server/actions/phase/core';
import { LegionButton } from '@/components/legion';
import { RotateCcwIcon, AlertCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UndoButtonProps {
  campaignId: string;
  expiry: string;
  onComplete?: () => void;
}

/**
 * UndoButton — Floating overlay that appears during the 10s undo window.
 * Shows a countdown and provides a button to rollback the last action.
 */
export function UndoButton({ campaignId, expiry, onComplete }: UndoButtonProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isUndoing, setIsUndoing] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const remaining = Math.max(0, new Date(expiry).getTime() - Date.now());
      setTimeLeft(Math.ceil(remaining / 1000));
      return remaining;
    };

    calculateTime();
    
    const interval = setInterval(() => {
      const remaining = calculateTime();
      if (remaining <= 0) {
        clearInterval(interval);
        commitPendingState(campaignId).then(() => {
          onComplete?.();
        });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [expiry, onComplete, campaignId]);

  if (timeLeft <= 0) return null;

  const handleUndo = async () => {
    setIsUndoing(true);
    try {
      await undoCampaignAction(campaignId);
    } catch (err) {
      console.error('Undo failed:', err);
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4 bg-legion-bg-elevated border border-legion-amber/50 rounded-lg p-4 shadow-[0_0_30px_rgba(var(--bob-amber-rgb),0.2)]">
        <div className="flex items-center gap-2 pr-4 border-r border-white/10">
          <AlertCircleIcon className="w-5 h-5 text-legion-amber animate-pulse" />
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-legion-amber uppercase tracking-widest font-bold">Action Pending</span>
            <span className="text-xs text-legion-text-muted">Committing in {timeLeft}s...</span>
          </div>
        </div>
        
        <LegionButton 
          onClick={handleUndo} 
          disabled={isUndoing}
          variant="outline"
          size="sm"
          className="bg-legion-amber/10 border-legion-amber/30 text-legion-amber hover:bg-legion-amber/20"
        >
          <RotateCcwIcon className={cn("w-3.5 h-3.5 mr-2", isUndoing && "animate-spin")} />
          {isUndoing ? 'UNDOING...' : 'UNDO ACTION'}
        </LegionButton>
      </div>
    </div>
  );
}
