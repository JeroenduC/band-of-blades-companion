'use client';

import { useState } from 'react';
import { LOCATIONS, getConnections } from '@/lib/locations';
import type { Location } from '@/lib/locations';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';

// ── Static node layout ────────────────────────────────────────────────────────
// Positions define the SVG node graph matching the BoB campaign map (pp.120-121).
// The map flows left-to-right: Western Front → Skydagger Keep.
const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  western_front:   { x: 50,  y: 200 },
  plainsworth:     { x: 150, y: 200 },
  sunstrider_camp: { x: 260, y: 110 },
  long_road:       { x: 260, y: 290 },
  duresh_forest:   { x: 370, y: 70  },
  westlake:        { x: 370, y: 155 },
  barrak_mines:    { x: 370, y: 295 },
  talgon_forest:   { x: 490, y: 95  },
  eastlake:        { x: 490, y: 200 },
  gallows_pass:    { x: 490, y: 315 },
  fort_calisco:    { x: 615, y: 200 },
  high_road:       { x: 730, y: 115 },
  the_maw:         { x: 730, y: 305 },
  skydagger_keep:  { x: 840, y: 200 },
};

const VIEW_BOX = '0 0 900 380';
const NODE_R = 22; // radius for circular nodes

interface LocationMapProps {
  currentLocationId: string;
}

function nodeColor(
  locId: string,
  currentId: string,
  reachableIds: Set<string>,
  selected: string | null,
): { fill: string; stroke: string; textFill: string } {
  if (locId === currentId) {
    return { fill: '#92400e', stroke: '#d97706', textFill: '#fef3c7' };
  }
  if (locId === selected) {
    return { fill: '#1e3a5f', stroke: '#60a5fa', textFill: '#eff6ff' };
  }
  if (reachableIds.has(locId)) {
    return { fill: '#1c3a2a', stroke: '#4ade80', textFill: '#d1fae5' };
  }
  return { fill: '#1c1917', stroke: '#44403c', textFill: '#a8a29e' };
}

function MissionTypeBadge({ type }: { type: string }) {
  const colours: Record<string, string> = {
    ASSAULT:  'bg-red-900/40 text-red-300 border-red-700/50',
    RECON:    'bg-blue-900/40 text-blue-300 border-blue-700/50',
    SUPPLY:   'bg-yellow-900/40 text-yellow-300 border-yellow-700/50',
    RELIGIOUS:'bg-purple-900/40 text-purple-300 border-purple-700/50',
  };
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide ${colours[type] ?? 'bg-stone-800 text-stone-300 border-stone-600'}`}>
      {type}
    </span>
  );
}

export function LocationMap({ currentLocationId }: LocationMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const connections = getConnections(currentLocationId);
  const reachableIds = new Set(connections.map((c) => c.id));

  const selectedLocation: Location | undefined = selectedId
    ? LOCATIONS.find((l) => l.id === selectedId)
    : undefined;

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  function handleKeyDown(e: React.KeyboardEvent, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(id);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Scrollable SVG map */}
      <div
        className="overflow-x-auto rounded-md border border-border bg-[#0d0d0b]"
        role="region"
        aria-label="Campaign map — location node graph"
      >
        <svg
          viewBox={VIEW_BOX}
          className="w-full min-w-[600px] h-auto"
          style={{ minHeight: 200 }}
          aria-hidden="true"
        >
          {/* Edges */}
          {LOCATIONS.map((loc) =>
            loc.connections.map((targetId) => {
              const from = NODE_POSITIONS[loc.id];
              const to = NODE_POSITIONS[targetId];
              if (!from || !to) return null;
              const isCurrent = loc.id === currentLocationId;
              const isReachable = reachableIds.has(targetId) && isCurrent;
              return (
                <line
                  key={`${loc.id}-${targetId}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={isReachable ? '#d97706' : '#44403c'}
                  strokeWidth={isReachable ? 2 : 1.5}
                  strokeDasharray={isReachable ? undefined : '4 3'}
                  opacity={isReachable ? 1 : 0.5}
                />
              );
            })
          )}

          {/* Nodes */}
          {LOCATIONS.map((loc) => {
            const pos = NODE_POSITIONS[loc.id];
            if (!pos) return null;
            const { fill, stroke, textFill } = nodeColor(
              loc.id, currentLocationId, reachableIds, selectedId
            );
            const isSelected = selectedId === loc.id;
            const label = loc.name.length > 12
              ? loc.name.split(' ').slice(0, 2).join('\n')
              : loc.name;
            const lines = label.split('\n');

            return (
              <g
                key={loc.id}
                onClick={() => handleSelect(loc.id)}
                onKeyDown={(e) => handleKeyDown(e, loc.id)}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                aria-label={`${loc.name}${loc.id === currentLocationId ? ' (current location)' : ''}${reachableIds.has(loc.id) ? ' (reachable)' : ''}`}
                style={{ cursor: 'pointer', outline: 'none' }}
              >
                {/* Focus ring */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={NODE_R + 4}
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  opacity={0}
                  className="focus-ring"
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={NODE_R}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={loc.id === currentLocationId ? 2.5 : 1.5}
                />
                {lines.map((line, i) => (
                  <text
                    key={i}
                    x={pos.x}
                    y={pos.y + (i - (lines.length - 1) / 2) * 11}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={9}
                    fontFamily="monospace"
                    fill={textFill}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {line}
                  </text>
                ))}
                {/* "Current" dot */}
                {loc.id === currentLocationId && (
                  <circle
                    cx={pos.x}
                    cy={pos.y - NODE_R - 6}
                    r={4}
                    fill="#d97706"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-legion-text-muted px-1">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-[#d97706] bg-[#92400e]" />
          Current location
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-[#4ade80] bg-[#1c3a2a]" />
          Reachable
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-[#44403c] bg-[#1c1917]" />
          Not yet reachable
        </span>
      </div>

      {/* Detail panel */}
      {selectedLocation && (
        <LegionCard>
          <LegionCardHeader className="pb-2">
            <LegionCardTitle className="text-base">
              {selectedLocation.name}
              {selectedLocation.id === currentLocationId && (
                <span className="ml-2 text-xs font-mono text-legion-amber">(current)</span>
              )}
            </LegionCardTitle>
          </LegionCardHeader>
          <LegionCardContent className="space-y-3">
            <p className="text-sm text-legion-text-primary">{selectedLocation.description}</p>
            {selectedLocation.notes && (
              <p className="text-xs text-yellow-300 bg-yellow-900/20 border border-yellow-700/40 rounded px-3 py-2">
                {selectedLocation.notes}
              </p>
            )}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-0.5">Assets rating</dt>
                <dd className="font-medium text-legion-text-primary">{selectedLocation.assets_rating}</dd>
              </div>
              <div>
                <dt className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-0.5">Connections</dt>
                <dd className="font-medium text-legion-text-primary">
                  {selectedLocation.connections.length === 0
                    ? 'None (final)'
                    : selectedLocation.connections
                        .map((id) => LOCATIONS.find((l) => l.id === id)?.name ?? id)
                        .join(', ')}
                </dd>
              </div>
            </dl>
            {selectedLocation.available_mission_types.length > 0 && (
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-1.5">Mission types</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedLocation.available_mission_types.map((t) => (
                    <MissionTypeBadge key={t} type={t} />
                  ))}
                </div>
              </div>
            )}
            {Object.keys(selectedLocation.bonus_assets).length > 0 && (
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-1.5">Bonus assets</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(selectedLocation.bonus_assets).map(([asset, bonus]) => (
                    <span key={asset} className="rounded border border-border px-2 py-0.5 text-legion-text-primary">
                      {asset.replace(/_/g, ' ')} +{bonus}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </LegionCardContent>
        </LegionCard>
      )}

      {/* Accessible location list (screen readers) */}
      <ul className="sr-only">
        {LOCATIONS.map((loc) => (
          <li key={loc.id}>
            {loc.name}
            {loc.id === currentLocationId ? ' — current location' : ''}
            {reachableIds.has(loc.id) ? ' — reachable from current location' : ''}.
            {loc.description}
            {loc.connections.length > 0
              ? ` Connects to: ${loc.connections.map((id) => LOCATIONS.find((l) => l.id === id)?.name ?? id).join(', ')}.`
              : ' Final destination.'}
          </li>
        ))}
      </ul>
    </div>
  );
}
