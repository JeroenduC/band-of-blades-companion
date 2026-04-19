'use client';

import { useState, useActionState } from 'react';
import { Mission, Specialist, Squad, SquadMember } from '@/lib/types';
import { deployPersonnel, DeploymentState } from '@/server/actions/phase/marshal';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle, LegionBadge, LegionButton } from '@/components/legion';
import { cn } from '@/lib/utils';

interface MissionDeploymentFormProps {
  campaignId: string;
  missions: Mission[];
  specialists: Specialist[];
  squads: (Squad & { members: SquadMember[] })[];
}

export function MissionDeploymentForm({
  campaignId,
  missions,
  specialists,
  squads,
}: MissionDeploymentFormProps) {
  const primaryMission = missions.find(m => m.status === 'PRIMARY');
  const secondaryMission = missions.find(m => m.status === 'SECONDARY');

  const [primarySpecs, setPrimarySpecs] = useState<string[]>([]);
  const [secondarySpecs, setSecondarySpecs] = useState<string[]>([]);
  const [primarySquad, setPrimarySquad] = useState<string>('');
  const [secondarySquad, setSecondarySquad] = useState<string>('');

  const [state, formAction, isPending] = useActionState(deployPersonnel, {});

  if (!primaryMission || !secondaryMission) {
    return <div>Missions not selected yet.</div>;
  }

  const availableSpecs = specialists.filter(s => s.status === 'AVAILABLE');
  const availableSquads = squads.filter(s => s.members.some(m => m.status === 'ALIVE'));

  const toggleSpec = (specId: string, mission: 'PRIMARY' | 'SECONDARY') => {
    if (mission === 'PRIMARY') {
      if (primarySpecs.includes(specId)) {
        setPrimarySpecs(primarySpecs.filter(id => id !== specId));
      } else if (primarySpecs.length < 3) {
        setPrimarySpecs([...primarySpecs, specId]);
      }
    } else {
      if (secondarySpecs.includes(specId)) {
        setSecondarySpecs(secondarySpecs.filter(id => id !== specId));
      } else if (secondarySpecs.length < 3) {
        setSecondarySpecs([...secondarySpecs, specId]);
      }
    }
  };

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="campaign_id" value={campaignId} />
      <input type="hidden" name="primary_specialists" value={JSON.stringify(primarySpecs)} />
      <input type="hidden" name="secondary_specialists" value={JSON.stringify(secondarySpecs)} />
      <input type="hidden" name="primary_squad_id" value={primarySquad} />
      <input type="hidden" name="secondary_squad_id" value={secondarySquad} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Primary Mission */}
        <LegionCard className="border-[var(--bob-amber)]">
          <LegionCardHeader>
            <div className="flex justify-between items-start">
              <div>
                <LegionBadge variant="outline" className="mb-2">PRIMARY MISSION</LegionBadge>
                <LegionCardTitle className="text-xl font-heading">{primaryMission.name}</LegionCardTitle>
              </div>
              <div className="text-xs font-bold text-[var(--bob-amber)] uppercase tracking-widest">
                {primaryMission.type}
              </div>
            </div>
          </LegionCardHeader>
          <LegionCardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-legion-text-muted">Assign Specialists (Max 3)</h4>
              <div className="grid grid-cols-1 gap-2">
                {availableSpecs.map(spec => (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => toggleSpec(spec.id, 'PRIMARY')}
                    disabled={secondarySpecs.includes(spec.id)}
                    className={cn(
                      "flex items-center justify-between p-2 rounded border text-left transition-colors",
                      primarySpecs.includes(spec.id) 
                        ? "border-[var(--bob-amber)] bg-[var(--bob-amber)]/10" 
                        : "border-legion-border bg-legion-bg-elevated opacity-50 grayscale",
                      secondarySpecs.includes(spec.id) && "hidden"
                    )}
                  >
                    <span className="text-sm font-medium">{spec.name} ({spec.class})</span>
                    {primarySpecs.includes(spec.id) && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--bob-amber)]"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-legion-text-muted">Assign Squad (Max 1)</h4>
              <select
                className="w-full bg-legion-bg-elevated border border-legion-border rounded p-2 text-sm"
                value={primarySquad}
                onChange={(e) => setPrimarySquad(e.target.value)}
              >
                <option value="">No Squad Assigned</option>
                {availableSquads.map(squad => (
                  <option key={squad.id} value={squad.id} disabled={squad.id === secondarySquad}>
                    {squad.name} ({squad.members.length} members)
                  </option>
                ))}
              </select>
            </div>
          </LegionCardContent>
        </LegionCard>

        {/* Secondary Mission */}
        <LegionCard>
          <LegionCardHeader>
            <div className="flex justify-between items-start">
              <div>
                <LegionBadge variant="secondary" className="mb-2">SECONDARY MISSION</LegionBadge>
                <LegionCardTitle className="text-xl font-heading">{secondaryMission.name}</LegionCardTitle>
              </div>
              <div className="text-xs font-bold text-legion-text-muted uppercase tracking-widest">
                {secondaryMission.type}
              </div>
            </div>
          </LegionCardHeader>
          <LegionCardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-legion-text-muted">Assign Specialists (Max 3)</h4>
              <div className="grid grid-cols-1 gap-2">
                {availableSpecs.map(spec => (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => toggleSpec(spec.id, 'SECONDARY')}
                    disabled={primarySpecs.includes(spec.id)}
                    className={cn(
                      "flex items-center justify-between p-2 rounded border text-left transition-colors",
                      secondarySpecs.includes(spec.id) 
                        ? "border-legion-text bg-legion-text/5" 
                        : "border-legion-border bg-legion-bg-elevated opacity-50 grayscale",
                      primarySpecs.includes(spec.id) && "hidden"
                    )}
                  >
                    <span className="text-sm font-medium">{spec.name} ({spec.class})</span>
                    {secondarySpecs.includes(spec.id) && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-legion-text-muted">Assign Squad (Max 1)</h4>
              <select
                className="w-full bg-legion-bg-elevated border border-legion-border rounded p-2 text-sm"
                value={secondarySquad}
                onChange={(e) => setSecondarySquad(e.target.value)}
              >
                <option value="">No Squad Assigned</option>
                {availableSquads.map(squad => (
                  <option key={squad.id} value={squad.id} disabled={squad.id === primarySquad}>
                    {squad.name} ({squad.members.length} members)
                  </option>
                ))}
              </select>
            </div>
          </LegionCardContent>
        </LegionCard>
      </div>

      {state.errors?._form && (
        <p className="text-red-500 text-sm text-center font-bold uppercase tracking-widest">{state.errors._form[0]}</p>
      )}

      <div className="flex justify-center">
        <LegionButton 
          type="submit" 
          size="lg" 
          disabled={isPending}
          className="px-12"
        >
          {isPending ? 'DEPLOYING...' : 'CONFIRM DEPLOYMENT'}
        </LegionButton>
      </div>
    </form>
  );
}
