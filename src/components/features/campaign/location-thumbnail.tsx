'use client';

import React from 'react';
import { getLocation } from '@/lib/locations';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { MapIcon } from 'lucide-react';

interface LocationThumbnailProps {
  locationId: string;
}

export function LocationThumbnail({ locationId }: LocationThumbnailProps) {
  const location = getLocation(locationId);
  
  if (!location) return null;

  return (
    <LegionCard className="overflow-hidden group hover:border-legion-amber/40 transition-colors cursor-pointer" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}>
      <LegionCardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <LegionCardTitle className="text-xs font-medium text-legion-text-muted uppercase tracking-widest">
          Current Location
        </LegionCardTitle>
        <MapIcon className="w-3 h-3 text-legion-amber" />
      </LegionCardHeader>
      <LegionCardContent>
        <div className="space-y-1">
          <div className="text-lg font-heading text-legion-text-primary group-hover:text-legion-amber transition-colors">
            {location.name}
          </div>
          <p className="text-[10px] text-legion-text-muted line-clamp-2 leading-relaxed italic">
            {location.description}
          </p>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] font-mono text-legion-amber uppercase tracking-widest">
            Assets: {location.assets_rating}d
          </span>
          <span className="w-1 h-1 rounded-full bg-white/10" />
          <span className="text-[10px] font-mono text-legion-text-muted uppercase tracking-widest">
            {location.available_mission_types.length} mission types
          </span>
        </div>
      </LegionCardContent>
    </LegionCard>
  );
}
