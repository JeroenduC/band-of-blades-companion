import { Campaign } from '@/lib/types';
import { LegionClock } from '@/components/legion/legion-clock';
import { LegionCard, LegionCardContent } from '@/components/legion/legion-card';
import { getLocation } from '@/lib/locations';
import { cn } from '@/lib/utils';

interface CommanderWarTableProps {
  campaign: Campaign;
}

export function CommanderWarTable({ campaign }: CommanderWarTableProps) {
  const location = getLocation(campaign.current_location);
  
  return (
    <section aria-label="Commander War Table">
      <LegionCard className="border-[var(--bob-amber)] bg-legion-bg-elevated/50 overflow-hidden relative">
        {/* Subtle background glow for the active commander table */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--bob-amber)]/5 blur-[60px] rounded-full -mr-16 -mt-16 pointer-events-none" />
        
        <LegionCardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
            {/* Time Clocks Group */}
            <div className="md:col-span-3 flex justify-around items-center bg-black/20 rounded-lg p-4 border border-white/5">
              <LegionClock total={10} filled={campaign.time_clock_1} label="Time I" size="md" />
              <LegionClock total={10} filled={campaign.time_clock_2} label="Time II" size="md" />
              <LegionClock total={10} filled={campaign.time_clock_3} label="Time III" size="md" />
            </div>

            {/* Strategic Stats Group */}
            <div className="md:col-span-2 grid grid-cols-2 gap-6 pl-2">
              <StatBlock label="Location" value={location?.name ?? 'Unknown'} />
              <StatBlock label="Morale" value={campaign.morale.toString()} />
              <StatBlock 
                label="Pressure" 
                value={campaign.pressure.toString()} 
                valueClassName={cn(
                  campaign.pressure >= 3 ? "text-red-500 font-bold" : "text-legion-amber"
                )}
              />
              <StatBlock label="Intel" value={campaign.intel.toString()} />
            </div>
          </div>
        </LegionCardContent>
      </LegionCard>
    </section>
  );
}

function StatBlock({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-legion-text-muted leading-none">
        {label}
      </span>
      <span className={cn("text-xl font-heading uppercase tracking-normal text-legion-text-primary", valueClassName)}>
        {value}
      </span>
    </div>
  );
}
