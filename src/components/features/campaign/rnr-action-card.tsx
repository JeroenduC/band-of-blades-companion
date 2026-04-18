'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { performRnR, type RnRState } from '@/server/actions/campaign-phase';
import type { Campaign, Mercy } from '@/lib/types';

interface RnRActionCardProps {
  campaign: Campaign;
  mercies: Mercy[];
}

/**
 * QM Step 4: Rest and Recuperation campaign action.
 * Auto-heals all wounded Mercies. Full per-Specialist healing in Epic 6.
 * BoB rulebook p.138
 */
export function RnRActionCard({ campaign, mercies }: RnRActionCardProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState<RnRState | null, FormData>(performRnR, null);

  useEffect(() => {
    if (state?.result) router.refresh();
  }, [state?.result, router]);

  const woundedMercies = mercies.filter((m) => m.wounded);
  const canBoost = campaign.supply >= 1;

  if (state?.result) {
    return (
      <div className="rounded-md border border-border bg-legion-bg-elevated p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-sm font-medium text-legion-text-primary">Rest &amp; Recuperation</span>
          <span className="text-xs font-mono text-legion-text-muted">Health</span>
        </div>
        <p className="text-sm text-legion-amber font-medium mb-1">
          R&amp;R complete{state.result.boosted ? ' (boosted)' : ''}.
        </p>
        {state.result.mercies_healed > 0 && (
          <p className="text-xs text-legion-text-muted">
            {state.result.mercies_healed} Merc{state.result.mercies_healed !== 1 ? 'ies' : 'y'} healed.
          </p>
        )}
        <p className="text-xs text-legion-text-muted mt-1">
          Per-Specialist healing tracked when the Marshal Roster is built (Epic 6).
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-legion-bg-elevated p-4">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-medium text-legion-text-primary">Rest &amp; Recuperation</span>
        <span className="text-xs font-mono text-legion-text-muted">Health</span>
      </div>
      <p className="text-xs text-legion-text-muted mb-1">
        Legionnaires tend wounds and rest. Every Legionnaire marks a healing tick.
      </p>
      <p className="text-xs text-legion-text-muted mb-1">
        Normal: all Legionnaires heal 1 tick.{' '}
        Boosted (1 Supply): all Legionnaires heal 2 ticks.
      </p>

      {/* Mercy status */}
      {mercies.length > 0 && (
        <div className="mt-2 mb-3 text-xs space-y-0.5">
          <p className="text-legion-text-muted font-medium">Mercies</p>
          {mercies.map((m) => (
            <div key={m.id} className="flex items-center gap-1.5 pl-2">
              <span
                className={`w-1.5 h-1.5 rounded-full ${m.wounded ? 'bg-red-400' : 'bg-green-400'}`}
                aria-hidden="true"
              />
              <span className="text-legion-text-primary">{m.name}</span>
              <span className="text-legion-text-muted">— {m.wounded ? 'wounded, will auto-heal' : 'healthy'}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-legion-text-muted mb-3 italic">
        Full per-Specialist healing available in Epic 6 (Marshal Roster).
      </p>

      {state?.errors?._form && (
        <p role="alert" className="text-xs text-red-400 mb-2">
          {state.errors._form.join(', ')}
        </p>
      )}

      <div className="flex gap-2 flex-wrap">
        <form action={action}>
          <input type="hidden" name="campaign_id" value={campaign.id} />
          <input type="hidden" name="boosted" value="false" />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-legion-amber/50 px-3 py-1.5 text-xs font-medium text-legion-amber hover:bg-legion-amber/10 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {pending ? 'Resting…' : woundedMercies.length > 0
              ? `Rest (+heal ${woundedMercies.length} Merc${woundedMercies.length !== 1 ? 'ies' : 'y'})`
              : 'Rest'}
          </button>
        </form>

        {canBoost && (
          <form action={action}>
            <input type="hidden" name="campaign_id" value={campaign.id} />
            <input type="hidden" name="boosted" value="true" />
            <button
              type="submit"
              disabled={pending}
              className="rounded-md border border-legion-amber/50 px-3 py-1.5 text-xs font-medium text-legion-amber hover:bg-legion-amber/10 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {pending ? 'Resting…' : 'Boosted (2 healing ticks, −1 Supply)'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
