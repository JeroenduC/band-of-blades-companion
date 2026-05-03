import { Campaign } from '@/lib/types';
import { LegionClock } from '@/components/legion/legion-clock';
import { getLocation } from '@/lib/locations';
import { cn } from '@/lib/utils';

interface CommanderWarTableProps {
  campaign: Campaign;
}

export function CommanderWarTable({ campaign }: CommanderWarTableProps) {
  const location = getLocation(campaign.current_location);

  const clockIFull = campaign.time_clock_1 >= 10;
  const clockIIFull = campaign.time_clock_2 >= 10;
  const clockIIIFull = campaign.time_clock_3 >= 10;
  const anyClockFull = clockIFull || clockIIFull || clockIIIFull;

  return (
    <section aria-label="State of the Legion" className="mb-0">
      {/* Section heading */}
      <h2 className="font-fell text-[22px] uppercase tracking-[0.04em] text-legion-text-primary border-b-2 border-legion-text-primary pb-2 mb-5">
        State of the Legion
      </h2>

      {/* Two-column layout: resources left, clocks right */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Resources ledger */}
        <div className="flex flex-col divide-y divide-dashed divide-legion-border">
          <LedgerRow
            label="Location"
            value={location?.name ?? campaign.current_location}
          />
          <LedgerRow
            label="Morale"
            value={campaign.morale.toString()}
            danger={campaign.morale <= 3}
          />
          <LedgerRow
            label="Pressure"
            value={campaign.pressure.toString()}
            danger={campaign.pressure >= 5}
          />
          <LedgerRow
            label="Intel"
            value={campaign.intel.toString()}
          />
          <LedgerRow
            label="Supply"
            value={campaign.supply.toString()}
            danger={campaign.supply <= 1}
          />
          <LedgerRow
            label="Food"
            value={campaign.food_uses.toString()}
            danger={campaign.food_uses <= 2}
          />
          <LedgerRow
            label="Horse uses"
            value={campaign.horse_uses.toString()}
          />
        </div>

        {/* Time clocks */}
        <div className="flex flex-col gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-legion-text-faint">
            Time Clocks
          </p>
          <div className="flex justify-around items-end gap-3">
            <ClockColumn
              label="Time I"
              filled={campaign.time_clock_1}
              full={clockIFull}
            />
            <ClockColumn
              label="Time II"
              filled={campaign.time_clock_2}
              full={clockIIFull}
            />
            <ClockColumn
              label="Time III"
              filled={campaign.time_clock_3}
              full={clockIIIFull}
            />
          </div>
        </div>
      </div>

      {/* Broken Advance alert */}
      {anyClockFull && (
        <div
          role="alert"
          className="mt-5 border-l-4 border-legion-danger bg-legion-danger/5 px-4 py-3"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-legion-danger font-bold">
            Broken Advance
          </p>
          <p className="font-crimson text-[16px] text-legion-text-muted mt-0.5 leading-snug">
            A Time clock has filled. The Legion marches in broken condition. Consult the GM.
          </p>
        </div>
      )}
    </section>
  );
}

function LedgerRow({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-legion-text-faint">
        {label}
      </span>
      <span
        className={cn(
          'font-fell text-[22px] leading-none tabular-nums',
          danger ? 'text-legion-danger' : 'text-legion-text-primary',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ClockColumn({
  label,
  filled,
  full,
}: {
  label: string;
  filled: number;
  full: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <LegionClock
        total={10}
        filled={filled}
        size="md"
        color={full ? 'danger' : 'ink'}
        label={label}
      />
    </div>
  );
}
