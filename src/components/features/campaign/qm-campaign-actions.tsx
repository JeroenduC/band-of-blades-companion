'use client';

import { useActionState } from 'react';
import { performLiberty, completeQmActions } from '@/server/actions/campaign-phase';
import { freeActionsFromMorale } from '@/lib/campaign-utils';
import type { LibertyState } from '@/server/actions/campaign-phase';
import type { Campaign, Mercy, LongTermProject } from '@/lib/types';
import { RecruitActionCard } from './recruit-action-card';
import { AcquireAssetsActionCard } from './acquire-assets-action-card';
import { RnRActionCard } from './rnr-action-card';
import { LongTermProjectActionCard } from './long-term-project-action-card';

interface QmCampaignActionsProps {
  campaign: Campaign;
  mercies: Mercy[];
  longTermProjects: LongTermProject[];
  acquiredAssetTypes: string[];
}

/**
 * Quartermaster Step 4 — Campaign Actions screen.
 *
 * Shows how many free actions are available based on morale (BoB p.137),
 * lists available actions as decision cards, and lets the QM mark complete
 * when done.
 */
export function QmCampaignActions({
  campaign,
  mercies,
  longTermProjects,
  acquiredAssetTypes,
}: QmCampaignActionsProps) {
  const freeActions = freeActionsFromMorale(campaign.morale);
  const moraleLabel = campaign.morale >= 8 ? 'High' : campaign.morale >= 4 ? 'Medium' : 'Low';

  return (
    <div className="flex flex-col gap-6">

      {/* Free action summary */}
      <div className="rounded-md border border-border bg-legion-bg-elevated p-4">
        <dl className="flex gap-6 flex-wrap text-sm">
          <div>
            <dt className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-0.5">Morale</dt>
            <dd className="text-legion-text-primary font-medium">{campaign.morale} ({moraleLabel})</dd>
          </div>
          <div>
            <dt className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-0.5">Free actions</dt>
            <dd className="text-legion-text-primary font-medium">{freeActions}</dd>
          </div>
          <div>
            <dt className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-0.5">Supply</dt>
            <dd className="text-legion-text-primary font-medium">{campaign.supply}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-legion-text-muted">
          You can spend 1 Supply to gain 1 extra action, or 1 Supply to boost any action.
        </p>
      </div>

      {/* Available actions */}
      <section aria-label="Available campaign actions">
        <h3 className="font-heading text-xs uppercase tracking-widest text-legion-text-muted mb-3">
          Available actions
        </h3>
        <div className="flex flex-col gap-3">
          <LibertyActionCard campaign={campaign} />
          <AcquireAssetsActionCard campaign={campaign} acquiredAssetTypes={acquiredAssetTypes} />
          <RnRActionCard campaign={campaign} mercies={mercies} />
          <RecruitActionCard campaign={campaign} />
          <LongTermProjectActionCard campaign={campaign} longTermProjects={longTermProjects} />
        </div>
      </section>

      {/* Mark complete */}
      <section aria-label="Complete campaign actions">
        <p className="text-xs text-legion-text-muted mb-3">
          When you have performed all your actions, mark them as complete. The Spymaster must also complete their step before the phase advances.
        </p>
        <form action={completeQmActions}>
          <input type="hidden" name="campaign_id" value={campaign.id} />
          <button
            type="submit"
            className="rounded-md bg-legion-amber px-5 py-2.5 font-heading text-sm font-semibold tracking-wide text-[var(--bob-amber-fg)] hover:opacity-90 transition-opacity min-h-[44px]"
          >
            Mark Actions Complete
          </button>
        </form>
      </section>

    </div>
  );
}

function LibertyActionCard({ campaign }: { campaign: Campaign }) {
  const [state, action, pending] = useActionState<LibertyState | null, FormData>(
    performLiberty,
    null,
  );

  return (
    <div className="rounded-md border border-border bg-legion-bg-elevated p-4">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-medium text-legion-text-primary">Liberty</span>
        <span className="text-xs font-mono text-legion-text-muted">Morale</span>
      </div>
      <p className="text-xs text-legion-text-muted mb-1">
        Legionnaires are given leave. Stress is reduced and morale improves.
      </p>
      <p className="text-xs text-legion-text-muted mb-3">
        Normal: morale +2. Boosted (1 Supply): morale +4.
      </p>

      {state?.errors?._form && (
        <p role="alert" className="text-xs text-red-400 mb-2">
          Error: {state.errors._form.join(', ')}
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
            {pending ? 'Applying…' : 'Normal (+2 morale)'}
          </button>
        </form>
        {campaign.supply >= 1 && (
          <form action={action}>
            <input type="hidden" name="campaign_id" value={campaign.id} />
            <input type="hidden" name="boosted" value="true" />
            <button
              type="submit"
              disabled={pending}
              className="rounded-md border border-legion-amber/50 px-3 py-1.5 text-xs font-medium text-legion-amber hover:bg-legion-amber/10 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {pending ? 'Applying…' : 'Boosted (+4 morale, −1 Supply)'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
