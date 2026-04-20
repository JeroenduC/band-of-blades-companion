'use client';

import { Spy } from '@/lib/types';
import {
  LegionCard,
  LegionCardContent,
  LegionCardHeader,
  LegionCardTitle,
  LegionBadge,
} from '@/components/legion';
import { cn } from '@/lib/utils';

interface SpyRosterProps {
  spies: Spy[];
  maxSpies: number;
}

export function SpyRoster({ spies, maxSpies }: SpyRosterProps) {
  const activeSpiesCount = spies.filter(s => s.status !== 'DEAD').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg text-legion-amber">Spy Roster</h3>
        <span className="text-sm font-medium text-legion-text-muted">
          Spies: {activeSpiesCount} / {maxSpies}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {spies.map((spy) => (
          <SpyCard key={spy.id} spy={spy} />
        ))}
        {activeSpiesCount < maxSpies && (
          <div className="flex h-full min-h-[120px] items-center justify-center rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-xs text-legion-text-muted italic">
              Empty spy slot. Recruit more spies via long-term assignments.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SpyCard({ spy }: { spy: Spy }) {
  const isDead = spy.status === 'DEAD';
  const isWounded = spy.status === 'WOUNDED';
  const isOnAssignment = spy.status === 'ON_ASSIGNMENT';

  return (
    <LegionCard className={cn(
      "relative transition-opacity",
      isDead && "opacity-50 grayscale"
    )}>
      <LegionCardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <LegionCardTitle className="text-base truncate">{spy.name}</LegionCardTitle>
          <LegionBadge 
            variant={isDead ? "secondary" : isWounded ? "destructive" : isOnAssignment ? "outline" : "default"}
            className={cn(
              isWounded && "bg-amber-900/50 text-amber-200 border-amber-700",
              !isDead && !isWounded && !isOnAssignment && "bg-green-900/50 text-green-200 border-green-700"
            )}
          >
            {spy.status}
          </LegionBadge>
        </div>
        <p className="text-xs text-legion-text-muted">
          {spy.rank} ({spy.rank === 'MASTER' ? '2d' : '1d'})
        </p>
      </LegionCardHeader>
      <LegionCardContent className="space-y-3">
        {spy.specialty && (
          <p className="text-xs italic text-legion-text-muted leading-relaxed">
            "{spy.specialty}"
          </p>
        )}
        
        <div className="pt-2 border-t border-border/40">
          <p className="text-[10px] uppercase tracking-wider text-legion-text-muted font-semibold mb-1">
            Current Assignment
          </p>
          <p className="text-sm font-medium">
            {spy.current_assignment === 'NONE' ? 'Available' : spy.current_assignment.replace(/_/g, ' ')}
            {spy.assignment_clock > 0 && ` (${spy.assignment_clock}/8)`}
          </p>
        </div>
      </LegionCardContent>
    </LegionCard>
  );
}
