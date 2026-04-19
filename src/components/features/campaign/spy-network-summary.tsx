'use client';

import { SpyNetwork } from '@/lib/types';
import {
  LegionCard,
  LegionCardContent,
  LegionCardHeader,
  LegionCardTitle,
  LegionBadge,
} from '@/components/legion';

interface SpyNetworkSummaryProps {
  network: SpyNetwork | null;
}

export function SpyNetworkSummary({ network }: SpyNetworkSummaryProps) {
  const activeUpgrades = network?.upgrades || [];

  return (
    <LegionCard>
      <LegionCardHeader>
        <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
          Spy Network Status
        </LegionCardTitle>
      </LegionCardHeader>
      <LegionCardContent>
        {activeUpgrades.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activeUpgrades.map((upgrade) => (
              <LegionBadge key={upgrade} variant="default" className="bg-amber-900/30 text-amber-200 border-amber-800">
                {upgrade}
              </LegionBadge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-legion-text-muted italic">
            No active network upgrades.
          </p>
        )}
      </LegionCardContent>
    </LegionCard>
  );
}
