'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { performRecruit, type RecruitState } from '@/server/actions/campaign-phase';
import type { Campaign } from '@/lib/types';

interface RecruitActionCardProps {
  campaign: Campaign;
}

/**
 * QM Step 4: Recruit campaign action.
 * Normal: +5 Rookies. Boosted (1 supply): +3 Rookies + 2 Soldiers.
 * BoB rulebook p.138
 */
export function RecruitActionCard({ campaign }: RecruitActionCardProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState<RecruitState | null, FormData>(performRecruit, null);

  // Refresh server state after success so the materiel panel updates
  useEffect(() => {
    if (state?.result) router.refresh();
  }, [state?.result, router]);

  const canBoost = campaign.supply >= 1;

  if (state?.result) {
    const { rookies, soldiers, boosted } = state.result;
    return (
      <div className="rounded-md border border-border bg-legion-bg-elevated p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-sm font-medium text-legion-text-primary">Recruit</span>
          <span className="text-xs font-mono text-legion-text-muted">Roster</span>
        </div>
        <p className="text-sm text-legion-amber font-medium mb-1">
          {rookies} Rookie{rookies !== 1 ? 's' : ''}
          {soldiers > 0 && ` + ${soldiers} Soldier${soldiers !== 1 ? 's' : ''}`} recruited
          {boosted && ' (boosted)'}
        </p>
        <p className="text-xs text-legion-text-muted">
          Awaiting Marshal assignment to squads.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-legion-bg-elevated p-4">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-medium text-legion-text-primary">Recruit</span>
        <span className="text-xs font-mono text-legion-text-muted">Roster</span>
      </div>
      <p className="text-xs text-legion-text-muted mb-1">
        Gain 5 Rookies for the Marshal to place in squads.
      </p>
      <p className="text-xs text-legion-text-muted mb-3">
        Normal: +5 Rookies.{' '}
        Boosted (1 Supply): +3 Rookies + 2 Soldiers.
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
            {pending ? 'Recruiting…' : '+5 Rookies'}
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
              {pending ? 'Recruiting…' : 'Boosted (+3 Rookies + 2 Soldiers, −1 Supply)'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
