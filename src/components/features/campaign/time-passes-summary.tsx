import { LegionClock } from '@/components/legion';
import { confirmTimePasses } from '@/server/actions/phase';
import type { Campaign } from '@/lib/types';

interface TimePassesSummaryProps {
  campaign: Campaign;
}

/**
 * Commander view shown when the phase is in TIME_PASSING state.
 *
 * Displays the system-applied changes (time tick, pressure, food/morale) and
 * lets the Commander confirm to advance to Campaign Actions.
 */
export function TimePassesSummary({ campaign }: TimePassesSummaryProps) {
  const hadFood = campaign.food_uses >= 0; // food was reduced before we got here
  // We can't know the food state before the tick from campaign alone, so we
  // show morale/food as current state plus a contextual note from the log.
  // For the summary display we just surface the current values clearly.

  return (
    <div className="flex flex-col gap-6" role="status" aria-live="polite">

      <p className="text-sm text-legion-text-muted">
        The system has applied the standard end-of-march consequences. Review the changes below, then confirm to proceed to Campaign Actions.
      </p>

      {/* Time clocks */}
      <section aria-label="Time clocks">
        <h3 className="font-heading text-xs uppercase tracking-widest text-legion-text-muted mb-3">
          Time clocks
        </h3>
        <div className="flex gap-6 flex-wrap">
          <LegionClock
            total={10}
            filled={campaign.time_clock_1}
            label="Clock 1"
            size="md"
            animated
          />
          <LegionClock
            total={10}
            filled={campaign.time_clock_2}
            label="Clock 2"
            size="md"
            animated
          />
          <LegionClock
            total={10}
            filled={campaign.time_clock_3}
            label="Clock 3"
            size="md"
            animated
          />
        </div>
        {(campaign.time_clock_1 >= 10 || campaign.time_clock_2 >= 10 || campaign.time_clock_3 >= 10) && (
          <p className="mt-3 text-sm text-red-400 font-medium">
            A Time clock has filled — a Broken Advance is triggered. (Details tracked for later epics.)
          </p>
        )}
      </section>

      {/* Resource summary */}
      <section aria-label="Resource changes">
        <h3 className="font-heading text-xs uppercase tracking-widest text-legion-text-muted mb-3">
          Current resources
        </h3>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Pressure', value: campaign.pressure, description: 'Pressure increased by 1 this step' },
            { label: 'Morale', value: campaign.morale, description: 'Affects Back at Camp scenes available' },
            { label: 'Food', value: campaign.food_uses, description: 'Remaining food uses' },
            { label: 'Supply', value: campaign.supply, description: 'Available to Quartermaster' },
          ].map(({ label, value, description }) => (
            <div
              key={label}
              className="rounded-md border border-border bg-legion-bg-elevated p-3"
              title={description}
            >
              <dt className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-1">
                {label}
              </dt>
              <dd className="text-xl font-heading text-legion-text-primary">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        {campaign.food_uses === 0 && (
          <p className="mt-2 text-sm text-legion-amber">
            No Food was available — morale was reduced by 2.
          </p>
        )}
      </section>

      {/* Confirm */}
      <form action={confirmTimePasses}>
        <input type="hidden" name="campaign_id" value={campaign.id} />
        <button
          type="submit"
          className="rounded-md bg-legion-amber px-5 py-2.5 font-heading text-sm font-semibold tracking-wide text-[var(--bob-amber-fg)] hover:opacity-90 transition-opacity min-h-[44px]"
        >
          Confirm — Advance to Campaign Actions
        </button>
      </form>

    </div>
  );
}
