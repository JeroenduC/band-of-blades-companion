'use client';

import { useState } from 'react';
import { Mission, type CampaignPhaseLog } from '@/lib/types';
import { UNIVERSAL_QUESTIONS, TYPE_SPECIFIC_QUESTIONS, calculateEngagementPool } from '@/lib/engagement-utils';
import { completeEngagementRolls } from '@/server/actions/phase/marshal';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle, LegionButton, LegionDice } from '@/components/legion';
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
  const [rollResult, setRollResult] = useState<any>(null);

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
    const result = await completeEngagementRolls(
      campaignId,
      primaryPool,
      secondaryPool,
      primaryMission.id,
      secondaryMission.id
    );
    
    if (result.results) {
      setRollResult(result.results);
      // Wait for animation before final refresh (optional, as revalidatePath might kick in)
    } else {
      setIsRolling(false);
    }
  };

  if (rollResult) {
    const primary = rollResult.find((r: any) => r.is_primary);
    const secondary = rollResult.find((r: any) => !r.is_primary);
    
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid gap-6 md:grid-cols-2">
          <LegionCard className="border-legion-amber/30">
            <LegionCardHeader>
              <LegionCardTitle className="text-sm font-bold uppercase tracking-widest text-legion-amber">
                Primary Engagement: {primaryMission.name}
              </LegionCardTitle>
            </LegionCardHeader>
            <LegionCardContent className="space-y-4">
              <p className="text-xs text-legion-text-muted italic">Result pending GM roll at table.</p>
              <div className="text-[10px] font-mono text-legion-amber uppercase">Dice Pool: {primary.dice_pool}d</div>
            </LegionCardContent>
          </LegionCard>

          <LegionCard className="border-legion-amber/30">
            <LegionCardHeader>
              <LegionCardTitle className="text-sm font-bold uppercase tracking-widest text-legion-amber">
                Secondary Engagement: {secondaryMission.name}
              </LegionCardTitle>
            </LegionCardHeader>
            <LegionCardContent className="space-y-6">
              <LegionDice 
                results={secondary.dice_results} 
                bestDieIndex={secondary.dice_pool === 0 ? undefined : secondary.dice_results.indexOf(secondary.highest)}
                worstDieIndex={secondary.dice_pool === 0 ? secondary.dice_results.indexOf(secondary.highest) : undefined}
              />
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-mono text-legion-text-muted uppercase">Outcome</span>
                  <span className="font-heading text-lg text-legion-text-primary">{secondary.outcome}</span>
                </div>
                <div className="space-y-1 border-t border-white/5 pt-2">
                  <span className="text-[9px] font-mono text-legion-text-muted uppercase tracking-tighter">Consequences</span>
                  <ul className="list-disc list-inside text-xs text-legion-text-primary space-y-1">
                    {secondary.consequences.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </LegionCardContent>
          </LegionCard>
        </div>
        
        <div className="flex justify-center">
          <LegionButton size="lg" onClick={() => window.location.reload()}>
            CONTINUE TO PHASE COMPLETE
          </LegionButton>
        </div>
      </div>
    );
  }

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
