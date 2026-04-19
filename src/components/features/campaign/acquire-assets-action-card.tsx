'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  performAcquireAssets,
  type AcquireAssetsState,
  type AcquireAssetType,
} from '@/server/actions/phase';
import { LOCATIONS, type AssetType } from '@/lib/locations';
import type { Campaign } from '@/lib/types';
import type { ActionQuality } from '@/lib/campaign-utils';

interface AcquireAssetsActionCardProps {
  campaign: Campaign;
  acquiredAssetTypes: string[];
}

const ASSET_LABELS: Record<AcquireAssetType, string> = {
  FOOD: 'Food',
  HORSES: 'Horses',
  BLACK_SHOT: 'Black Shot',
  RELIGIOUS_SUPPLIES: 'Religious Supplies',
  LABORER: 'Laborer',
  SIEGE_WEAPON: 'Siege Weapon',
  ALCHEMIST: 'Alchemist',
  MERCY: 'Mercy',
};

const ASSET_NOTES: Record<AcquireAssetType, string> = {
  FOOD: 'Feeding the Legion. Poor = +1 use, Standard = +3, Fine = +6, Exceptional = +9.',
  HORSES: 'Cavalry and logistics. Poor = +1 use, Standard = +3, Fine = +6, Exceptional = +9.',
  BLACK_SHOT: 'Ammunition for ranged weapons. Poor = +1 use, Standard = +3, Fine = +6, Exceptional = +9.',
  RELIGIOUS_SUPPLIES: 'Morale rituals and Lorekeeper rites. Poor = +1, Standard = +3, Fine = +6, Exceptional = +9.',
  LABORER: 'Worker units. Auto-tick Long-Term Projects each phase. Requires Fine quality.',
  SIEGE_WEAPON: 'Heavy equipment for assault missions. Requires Fine quality.',
  ALCHEMIST: 'Specialist. Runs alchemy projects in Step 6. Requires Exceptional quality.',
  MERCY: 'Healer. Assists R&R. Can bear one wound at a time. Requires Exceptional quality.',
};

const QUALITY_LABELS: Record<ActionQuality, string> = {
  POOR: 'Poor',
  STANDARD: 'Standard',
  FINE: 'Fine',
  EXCEPTIONAL: 'Exceptional',
};

const QUALITY_COLOURS: Record<ActionQuality, string> = {
  POOR: 'text-red-400',
  STANDARD: 'text-legion-text-primary',
  FINE: 'text-green-400',
  EXCEPTIONAL: 'text-legion-amber',
};

/**
 * QM Step 4: Acquire Assets campaign action.
 * Rolls dice based on location's assets rating for quality outcome.
 * BoB rulebook p.137
 */
export function AcquireAssetsActionCard({ campaign, acquiredAssetTypes }: AcquireAssetsActionCardProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AcquireAssetsState | null, FormData>(
    performAcquireAssets, null,
  );
  const [selectedType, setSelectedType] = useState<AcquireAssetType | ''>('');
  const [boosts, setBoosts] = useState(0);
  const [personnelName, setPersonnelName] = useState('');

  useEffect(() => {
    if (state?.result && !state.errors) router.refresh();
  }, [state?.result, state?.errors, router]);

  const location = LOCATIONS.find((l) => l.id === campaign.current_location);
  const needsName = selectedType === 'ALCHEMIST' || selectedType === 'MERCY';

  // Dice pool for selected asset type
  const dicePool = location && selectedType
    ? (location.assets_rating + (location.bonus_assets[selectedType as AssetType] ?? 0))
    : location?.assets_rating ?? 0;

  if (state?.result && !state.errors?._form) {
    const r = state.result;
    return (
      <div className="rounded-md border border-border bg-legion-bg-elevated p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-sm font-medium text-legion-text-primary">Acquire Assets</span>
          <span className="text-xs font-mono text-legion-text-muted">Supply</span>
        </div>
        <p className="text-sm font-medium mb-1">
          <span className="text-legion-text-muted">{ASSET_LABELS[r.asset_type]}: </span>
          <span className={QUALITY_COLOURS[r.final_quality]}>{QUALITY_LABELS[r.final_quality]}</span>
          {r.boosts > 0 && <span className="text-xs text-legion-text-muted ml-1">(+{r.boosts} boost)</span>}
        </p>
        <p className="text-xs text-legion-text-muted mb-1">
          Dice: [{r.dice.join(', ')}]
          {r.base_quality !== r.final_quality && (
            <span> → boosted from {QUALITY_LABELS[r.base_quality]}</span>
          )}
        </p>
        {r.uses_gained !== undefined && (
          <p className="text-xs text-legion-text-muted">+{r.uses_gained} uses added.</p>
        )}
        {r.personnel_added && (
          <p className="text-xs text-legion-text-muted">{r.personnel_added} added to roster.</p>
        )}
        <button
          type="button"
          onClick={() => { setSelectedType(''); setBoosts(0); setPersonnelName(''); router.refresh(); }}
          className="mt-3 text-xs text-legion-amber underline underline-offset-4"
        >
          Acquire another asset
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-legion-bg-elevated p-4">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-medium text-legion-text-primary">Acquire Assets</span>
        <span className="text-xs font-mono text-legion-text-muted">Supply</span>
      </div>
      <p className="text-xs text-legion-text-muted mb-1">
        Send a Specialist to acquire something the Legion needs.
        Quality depends on the current location&apos;s assets rating.
      </p>

      {/* Location info */}
      {location && (
        <div className="mb-3 text-xs text-legion-text-muted">
          <span className="text-legion-text-primary">{location.name}</span>
          {' — '}assets rating <span className="font-mono text-legion-amber">{location.assets_rating}</span>
          {dicePool !== location.assets_rating && selectedType && (
            <span> (+{dicePool - location.assets_rating} for {ASSET_LABELS[selectedType as AcquireAssetType]})</span>
          )}
        </div>
      )}

      {state?.errors?._form && (
        <p role="alert" className="text-xs text-red-400 mb-2">{state.errors._form.join(', ')}</p>
      )}
      {state?.errors?.asset_type && (
        <p role="alert" className="text-xs text-red-400 mb-2">{state.errors.asset_type.join(', ')}</p>
      )}

      <form action={action} className="space-y-3">
        <input type="hidden" name="campaign_id" value={campaign.id} />

        {/* Asset type selection */}
        <div>
          <label htmlFor="acquire-asset-type" className="block text-xs text-legion-text-muted mb-1">
            Asset type
          </label>
          <select
            id="acquire-asset-type"
            name="asset_type"
            value={selectedType}
            onChange={(e) => { setSelectedType(e.target.value as AcquireAssetType); setPersonnelName(''); }}
            className="w-full rounded-md border border-border bg-legion-bg-base px-2 py-1.5 text-sm text-legion-text-primary focus:outline-none focus:ring-2 focus:ring-legion-border-focus min-h-[36px]"
            required
          >
            <option value="" disabled>— Select asset —</option>
            {(Object.keys(ASSET_LABELS) as AcquireAssetType[]).map((type) => {
              const alreadyAcquired = acquiredAssetTypes.includes(type);
              return (
                <option key={type} value={type} disabled={alreadyAcquired}>
                  {ASSET_LABELS[type]}{alreadyAcquired ? ' (already acquired)' : ''}
                </option>
              );
            })}
          </select>
          {selectedType && (
            <p className="mt-1 text-xs text-legion-text-muted">{ASSET_NOTES[selectedType]}</p>
          )}
        </div>

        {/* Personnel name (Alchemist / Mercy) */}
        {needsName && (
          <div>
            <label htmlFor="acquire-name" className="block text-xs text-legion-text-muted mb-1">
              Name <span className="text-legion-text-muted">(requires Exceptional quality)</span>
            </label>
            <input
              id="acquire-name"
              name="name"
              type="text"
              value={personnelName}
              onChange={(e) => setPersonnelName(e.target.value)}
              placeholder={`Enter ${ASSET_LABELS[selectedType]} name`}
              maxLength={60}
              className="w-full rounded-md border border-border bg-legion-bg-base px-2 py-1.5 text-sm text-legion-text-primary focus:outline-none focus:ring-2 focus:ring-legion-border-focus min-h-[36px]"
            />
            {state?.errors?.name && (
              <p role="alert" className="text-xs text-red-400 mt-0.5">{state.errors.name.join(', ')}</p>
            )}
          </div>
        )}

        {/* Boost control */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-legion-text-muted">
              Boost (1 Supply per tier upgrade)
            </span>
            <span className="text-xs font-mono text-legion-amber">
              Supply: {campaign.supply}
            </span>
          </div>
          <input type="hidden" name="boosts" value={boosts} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBoosts((b) => Math.max(0, b - 1))}
              disabled={boosts === 0}
              className="rounded border border-border px-2 py-1 text-xs text-legion-text-primary disabled:opacity-40 min-h-[36px] min-w-[36px]"
              aria-label="Decrease boosts"
            >
              −
            </button>
            <span className="font-mono text-sm text-legion-text-primary w-6 text-center">{boosts}</span>
            <button
              type="button"
              onClick={() => setBoosts((b) => Math.min(campaign.supply, b + 1))}
              disabled={boosts >= campaign.supply || boosts >= 3}
              className="rounded border border-border px-2 py-1 text-xs text-legion-text-primary disabled:opacity-40 min-h-[36px] min-w-[36px]"
              aria-label="Increase boosts"
            >
              +
            </button>
            {boosts > 0 && (
              <span className="text-xs text-legion-text-muted">−{boosts} Supply</span>
            )}
          </div>
          {selectedType && (
            <p className="mt-1 text-xs text-legion-text-muted">
              Dice pool: <span className="font-mono text-legion-amber">{dicePool}</span>d6
              {boosts > 0 && ` — result upgraded ${boosts} tier${boosts > 1 ? 's' : ''}`}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending || !selectedType || (needsName && !personnelName)}
          className="rounded-md bg-legion-amber px-4 py-2 text-xs font-semibold text-[var(--bob-amber-fg)] hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[44px]"
        >
          {pending ? 'Acquiring…' : `Roll for ${selectedType ? ASSET_LABELS[selectedType] : 'asset'}`}
        </button>
      </form>
    </div>
  );
}
