import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { cn } from '@/lib/utils';

interface MarshalOverviewProps {
  morale: number;
  totalLegionnaires: number;
  totalSpecialists: number;
  totalSquads: number;
}

export function MarshalOverview({
  morale,
  totalLegionnaires,
  totalSpecialists,
  totalSquads,
}: MarshalOverviewProps) {
  const moraleLevel = morale >= 8 ? 'HIGH' : morale >= 4 ? 'MEDIUM' : 'LOW';
  const moraleColor =
    moraleLevel === 'HIGH' ? 'text-green-500' :
    moraleLevel === 'MEDIUM' ? 'text-[var(--bob-amber)]' :
    'text-red-500';

  const freeActions =
    moraleLevel === 'HIGH' ? 2 :
    moraleLevel === 'MEDIUM' ? 1 :
    0;

  const isGameOverThreshold = totalLegionnaires < 15 || totalSpecialists < 2;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Morale Card */}
      <LegionCard className="relative overflow-hidden">
        <div className={cn(
          "absolute top-0 left-0 w-1 h-full",
          moraleLevel === 'HIGH' ? "bg-green-500" :
          moraleLevel === 'MEDIUM' ? "bg-[var(--bob-amber)]" :
          "bg-red-500"
        )} />
        <LegionCardHeader className="pb-2">
          <LegionCardTitle className="text-xs font-medium text-legion-text-muted uppercase tracking-widest">
            Current Morale
          </LegionCardTitle>
        </LegionCardHeader>
        <LegionCardContent>
          <div className={cn("text-4xl font-heading mb-1", moraleColor)}>
            {morale}
          </div>
          <div className="text-xs font-medium uppercase tracking-tighter">
            {moraleLevel} — {freeActions} free campaign actions
          </div>
        </LegionCardContent>
      </LegionCard>

      {/* Legionnaires Card */}
      <LegionCard>
        <LegionCardHeader className="pb-2">
          <LegionCardTitle className="text-xs font-medium text-legion-text-muted uppercase tracking-widest">
            Total Legionnaires
          </LegionCardTitle>
        </LegionCardHeader>
        <LegionCardContent>
          <div className={cn(
            "text-4xl font-heading mb-1",
            totalLegionnaires < 15 ? "text-red-500" : "text-legion-text"
          )}>
            {totalLegionnaires}
          </div>
          {totalLegionnaires < 15 && (
            <div className="text-[10px] text-red-500 uppercase font-bold animate-pulse">
              CRITICAL — GAME OVER AT &lt; 15
            </div>
          )}
          <div className="text-xs text-legion-text-muted uppercase">
            Rookies + Soldiers + Specs
          </div>
        </LegionCardContent>
      </LegionCard>

      {/* Specialists Card */}
      <LegionCard>
        <LegionCardHeader className="pb-2">
          <LegionCardTitle className="text-xs font-medium text-legion-text-muted uppercase tracking-widest">
            Specialists
          </LegionCardTitle>
        </LegionCardHeader>
        <LegionCardContent>
          <div className={cn(
            "text-4xl font-heading mb-1",
            totalSpecialists < 2 ? "text-red-500" : "text-legion-text"
          )}>
            {totalSpecialists}
          </div>
          {totalSpecialists < 2 && (
            <div className="text-[10px] text-red-500 uppercase font-bold animate-pulse">
              CRITICAL — GAME OVER AT &lt; 2
            </div>
          )}
          <div className="text-xs text-legion-text-muted uppercase">
            Living elite personnel
          </div>
        </LegionCardContent>
      </LegionCard>

      {/* Squads Card */}
      <LegionCard>
        <LegionCardHeader className="pb-2">
          <LegionCardTitle className="text-xs font-medium text-legion-text-muted uppercase tracking-widest">
            Squad Count
          </LegionCardTitle>
        </LegionCardHeader>
        <LegionCardContent>
          <div className="text-4xl font-heading mb-1">
            {totalSquads} <span className="text-xl text-legion-text-muted">/ 6</span>
          </div>
          <div className="text-xs text-legion-text-muted uppercase">
            Active combat units
          </div>
        </LegionCardContent>
      </LegionCard>
    </div>
  );
}
