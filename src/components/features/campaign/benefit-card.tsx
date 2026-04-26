'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface BenefitCardProps {
  label: string;
  description: string;
  effect: string;
  isSelected: boolean;
  onClick: () => void;
  className?: string;
}

export function BenefitCard({
  label,
  description,
  effect,
  isSelected,
  onClick,
  className,
}: BenefitCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex flex-col h-full text-left rounded-lg border p-5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-legion-amber',
        isSelected
          ? 'border-legion-amber bg-legion-amber/10 ring-1 ring-legion-amber/20 shadow-lg shadow-legion-amber/5'
          : 'border-border bg-legion-bg-elevated/50 hover:border-legion-amber/40 hover:bg-white/5',
        className
      )}
    >
      <div className="flex-1 space-y-2">
        <h5 className={cn(
          "font-heading text-sm font-bold uppercase tracking-tight",
          isSelected ? "text-legion-amber" : "text-legion-text"
        )}>
          {label}
        </h5>
        <p className="text-xs text-legion-text-muted leading-relaxed italic">
          {description}
        </p>
      </div>
      
      <div className={cn(
        "mt-4 pt-3 border-t text-[10px] font-mono uppercase tracking-widest",
        isSelected ? "border-legion-amber/20 text-legion-amber" : "border-border/50 text-legion-text-muted opacity-60"
      )}>
        Effect: {effect}
      </div>
    </button>
  );
}
