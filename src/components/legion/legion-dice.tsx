'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface LegionDiceProps {
  /** The final dice results to display */
  results: number[];
  /** Optional: index of the die to highlight as 'worst' (red) */
  worstDieIndex?: number;
  /** Optional: index of the die to highlight as 'best' (green) */
  bestDieIndex?: number;
  /** Optional: CSS class for the container */
  className?: string;
  /** Optional: Animation duration in milliseconds (default 1200) */
  duration?: number;
  /** Optional: Callback when animation completes */
  onComplete?: () => void;
  /** Optional: Whether to automatically start rolling when component mounts (default true) */
  autoStart?: boolean;
}

/**
 * LegionDice — Reusable component for dramatic dice roll animations.
 * 
 * Shows a brief "tumbling" animation with random numbers before revealing 
 * the final results. Supports highlighting best/worst dice and special 
 * flair for critical results.
 * 
 * Respects 'prefers-reduced-motion' by skipping the animation.
 */
export function LegionDice({
  results,
  worstDieIndex,
  bestDieIndex,
  className,
  duration = 1200,
  onComplete,
  autoStart = true
}: LegionDiceProps) {
  const [isRolling, setIsRolling] = useState(autoStart);
  const [displayValues, setDisplayValues] = useState<number[]>(results.map(() => 1));
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    if (mediaQuery.matches || !autoStart) {
      setIsRolling(false);
      setDisplayValues(results);
      if (mediaQuery.matches) onComplete?.();
      return;
    }

    setIsRolling(true);
    
    const interval = setInterval(() => {
      setDisplayValues(prev => prev.map(() => Math.floor(Math.random() * 6) + 1));
    }, 80);

    const timer = setTimeout(() => {
      clearInterval(interval);
      setIsRolling(false);
      setDisplayValues(results);
      onComplete?.();
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [results, duration, onComplete, autoStart]);

  // Flair for critical (all 6s)
  const isCritical = results.length > 0 && results.every(d => d === 6);

  return (
    <div className={cn("flex flex-wrap gap-3", className)} aria-live="polite">
      {displayValues.map((val, idx) => {
        const isWorst = worstDieIndex === idx;
        const isBest = bestDieIndex === idx;
        const finalVal = results[idx];
        
        return (
          <div
            key={idx}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded border-2 font-heading text-lg transition-all duration-200",
              // Base state
              "bg-[var(--bob-bg-surface)] border-[var(--bob-border)] text-[var(--bob-text-primary)]",
              // Rolling state
              isRolling && "border-[var(--bob-amber)]/40 animate-pulse scale-105 shadow-[0_0_10px_rgba(var(--bob-amber-rgb),0.2)]",
              // Final revealed state flair
              !isRolling && [
                isCritical && "bg-[var(--bob-amber)]/20 border-[var(--bob-amber)] text-[var(--bob-amber)] shadow-[0_0_15px_rgba(var(--bob-amber-rgb),0.4)] scale-110",
                finalVal <= 3 && !isCritical && "bg-[var(--bob-danger-subtle)] border-[var(--bob-danger)]/50 text-[var(--bob-danger)]",
                finalVal >= 6 && !isCritical && "bg-[var(--bob-success)]/10 border-[var(--bob-success)]/50 text-[var(--bob-success)]",
                isWorst && "border-[var(--bob-danger)] bg-[var(--bob-danger-subtle)] text-[var(--bob-danger)] ring-2 ring-[var(--bob-danger)]/30",
                isBest && "border-[var(--bob-success)] bg-[var(--bob-success)]/10 text-[var(--bob-success)] ring-2 ring-[var(--bob-success)]/30"
              ]
            )}
            aria-label={isRolling ? "Rolling..." : `Die ${idx + 1}: ${val}${isWorst ? ' (worst)' : ''}${isBest ? ' (best)' : ''}`}
          >
            {val}
          </div>
        );
      })}
    </div>
  );
}
