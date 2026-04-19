'use client';

import { useState } from 'react';
import { Mission } from '@/lib/types';
import { UNIVERSAL_QUESTIONS, TYPE_SPECIFIC_QUESTIONS, calculateEngagementPool } from '@/lib/engagement-utils';
import { completeEngagementRolls } from '@/server/actions/phase/marshal';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle, LegionButton } from '@/components/legion';
import { cn } from '@/lib/utils';

interface EngagementRollBuilderProps {
  campaignId: string;
  missions: Mission[];
}

export function EngagementRollBuilder({ campaignId, missions }: EngagementRollBuilderProps) {
  const primaryMission = missions.find(m => m.status === 'PRIMARY');
  const secondaryMission = missions.find(m => m.status === 'SECONDARY');

  const [primaryAnswers, setPrimaryAnswers] = useState<Record<string, boolean>>({});
  const [secondaryAnswers, setSecondaryAnswers] = useState<Record<string, boolean>>({});
  const [isRolling, setIsRolling] = useState(false);

  if (!primaryMission || !secondaryMission) return null;

  const primaryPool = calculateEngagementPool(primaryMission.type, primaryAnswers);
  const secondaryPool = calculateEngagementPool(secondaryMission.type, secondaryAnswers);

  const toggleAnswer = (mission: 'PRIMARY' | 'SECONDARY', questionId: string) => {
    if (mission === 'PRIMARY') {
      setPrimaryAnswers(prev => ({ ...prev, [questionId]: !prev[questionId] }));
    } else {
      setSecondaryAnswers(prev => ({ ...prev, [questionId]: !prev[questionId] }));
    }
  };

  const handleComplete = async () => {
    setIsRolling(true);
    await completeEngagementRolls(
      campaignId,
      primaryPool,
      secondaryPool,
      primaryMission.id,
      secondaryMission.id
    );
    setIsRolling(false);
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <EngagementSection
          title="Primary Mission"
          mission={primaryMission}
          answers={primaryAnswers}
          pool={primaryPool}
          onToggleReal={(id) => toggleAnswer('PRIMARY', id)}
        />
        <EngagementSection
          title="Secondary Mission"
          mission={secondaryMission}
          answers={secondaryAnswers}
          pool={secondaryPool}
          onToggleReal={(id) => toggleAnswer('SECONDARY', id)}
        />
      </div>

      <div className="flex justify-center pt-4">
        <LegionButton size="lg" onClick={handleComplete} disabled={isRolling}>
          {isRolling ? 'ROLLING...' : 'FINISH ENGAGEMENT & COMPLETE PHASE'}
        </LegionButton>
      </div>
    </div>
  );
}

function EngagementSection({ 
  title, 
  mission, 
  answers, 
  pool, 
  onToggleReal 
}: { 
  title: string; 
  mission: Mission; 
  answers: Record<string, boolean>; 
  pool: number; 
  onToggleReal: (id: string) => void 
}) {
  const questions = [...UNIVERSAL_QUESTIONS, ...(TYPE_SPECIFIC_QUESTIONS[mission.type] || [])];

  return (
    <LegionCard>
      <LegionCardHeader className="pb-2 border-b border-legion-border/50">
        <div className="flex justify-between items-center">
          <LegionCardTitle className="text-sm font-bold uppercase tracking-widest text-legion-text-muted">
            {title}: {mission.name}
          </LegionCardTitle>
          <div className="bg-legion-bg-elevated px-3 py-1 border border-[var(--bob-amber)] rounded font-heading text-lg text-[var(--bob-amber)]">
            {pool}d
          </div>
        </div>
      </LegionCardHeader>
      <LegionCardContent className="pt-4 space-y-4">
        <div className="space-y-2">
          {questions.map(q => (
            <button
              key={q.id}
              onClick={() => onToggleReal(q.id)}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded border text-left transition-colors text-xs",
                answers[q.id]
                  ? "border-[var(--bob-amber)] bg-[var(--bob-amber)]/5 text-legion-text"
                  : "border-legion-border bg-legion-bg-elevated text-legion-text-muted opacity-80"
              )}
            >
              <span className="flex-1 pr-4">{q.text}</span>
              <span className={cn(
                "font-bold whitespace-nowrap",
                q.modifier > 0 ? "text-green-500" : "text-red-500"
              )}>
                {q.modifier > 0 ? `+${q.modifier}d` : `${q.modifier}d`}
              </span>
            </button>
          ))}
        </div>
        
        {pool === 0 && (
          <div className="p-3 bg-red-900/20 border border-red-500/50 rounded text-[10px] text-red-200 uppercase font-bold text-center">
            Zero dice pool: Roll 2d and take the lowest result.
          </div>
        )}
      </LegionCardContent>
    </LegionCard>
  );
}
