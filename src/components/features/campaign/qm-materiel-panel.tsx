'use client';

import type { Campaign, Alchemist, Mercy, Laborers, LongTermProject, SiegeWeapon, RecruitPool } from '@/lib/types';
import { useState } from 'react';

interface QmMaterielPanelProps {
  campaign: Campaign;
  alchemists: Alchemist[];
  mercies: Mercy[];
  laborers: Laborers | null;
  longTermProjects: LongTermProject[];
  siegeWeapons: SiegeWeapon[];
  recruitPool: RecruitPool[];
}

/** Renders filled/empty use pips for a resource. */
function UsePips({ used, total }: { used: number; total: number }) {
  if (total === 0) return <span className="text-xs text-legion-text-muted">none</span>;
  return (
    <span className="flex gap-0.5 flex-wrap" aria-label={`${used} of ${total} uses remaining`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`inline-block w-2.5 h-2.5 rounded-full border ${
            i < used
              ? 'bg-legion-amber border-legion-amber'
              : 'bg-transparent border-legion-text-muted/40'
          }`}
        />
      ))}
    </span>
  );
}

/** Mini corruption clock for Alchemists — 8 segments. */
function CorruptionClock({ corruption, name }: { corruption: number; name: string }) {
  const dangerous = corruption >= 5;
  return (
    <div className="flex items-center gap-1.5" aria-label={`${name}: ${corruption} of 8 corruption`}>
      <span className="text-xs text-legion-text-muted min-w-[6rem] truncate">{name}</span>
      <span className="flex gap-0.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className={`inline-block w-2 h-2 rounded-full border ${
              i < corruption
                ? dangerous ? 'bg-red-500 border-red-500' : 'bg-legion-amber border-legion-amber'
                : 'bg-transparent border-legion-text-muted/40'
            }`}
          />
        ))}
      </span>
      {corruption >= 8 && (
        <span className="text-xs text-red-400 font-medium">CORRUPTED</span>
      )}
    </div>
  );
}

export function QmMaterielPanel({
  campaign,
  alchemists,
  mercies,
  laborers,
  longTermProjects,
  siegeWeapons,
  recruitPool,
}: QmMaterielPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const activeProjects = longTermProjects.filter((p) => !p.completed_at);
  const pendingRecruits = recruitPool.filter((r) => !r.assigned);
  const totalRookies = pendingRecruits.reduce((s, r) => s + r.rookies, 0);
  const totalSoldiers = pendingRecruits.reduce((s, r) => s + r.soldiers, 0);

  // On mobile, collapse by default; on desktop always show
  return (
    <section aria-label="Legion materiel" className="rounded-md border border-border bg-legion-bg-elevated">

      {/* Header — always visible, acts as toggle on mobile */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 text-left md:cursor-default"
        aria-expanded={expanded}
        aria-controls="materiel-panel-body"
      >
        <span className="font-mono text-xs uppercase tracking-widest text-legion-text-muted">
          Legion Materiel
        </span>
        <span className="md:hidden text-legion-text-muted text-xs">
          {expanded ? '▲ collapse' : '▼ expand'}
        </span>
      </button>

      {/* Body — hidden on mobile until expanded */}
      <div
        id="materiel-panel-body"
        className={`${expanded ? 'block' : 'hidden'} md:block px-4 pb-4`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Resources */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-2">Resources</h4>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-legion-text-muted">Supply</dt>
                <dd className="font-mono text-legion-amber font-semibold">{campaign.supply}</dd>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <dt className="text-legion-text-muted">
                    Food
                    {campaign.supply_carts > 0 && (
                      <span className="ml-1 text-xs text-legion-text-muted/60">+{campaign.supply_carts} carts</span>
                    )}
                  </dt>
                  <dd className="text-xs text-legion-text-primary">{campaign.food_uses} uses</dd>
                </div>
                <UsePips used={campaign.food_uses} total={Math.max(campaign.food_uses, 9)} />
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <dt className="text-legion-text-muted">Horses</dt>
                  <dd className="text-xs text-legion-text-primary">{campaign.horse_uses} uses</dd>
                </div>
                <UsePips used={campaign.horse_uses} total={Math.max(campaign.horse_uses, 9)} />
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <dt className="text-legion-text-muted">Black Shot</dt>
                  <dd className="text-xs text-legion-text-primary">{campaign.black_shot_uses} uses</dd>
                </div>
                <UsePips used={campaign.black_shot_uses} total={Math.max(campaign.black_shot_uses, 9)} />
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <dt className="text-legion-text-muted">Religious Supplies</dt>
                  <dd className="text-xs text-legion-text-primary">{campaign.religious_supply_uses} uses</dd>
                </div>
                <UsePips used={campaign.religious_supply_uses} total={Math.max(campaign.religious_supply_uses, 9)} />
              </div>
            </dl>
          </div>

          {/* Personnel */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-2">Personnel</h4>
            <div className="space-y-3">

              {/* Laborers */}
              <div className="text-sm">
                <span className="text-legion-text-muted">Laborers: </span>
                <span className="text-legion-text-primary font-medium">{laborers?.count ?? 0}</span>
              </div>

              {/* Mercies */}
              {mercies.length > 0 ? (
                <div className="text-sm space-y-1">
                  <span className="text-legion-text-muted block">Mercies</span>
                  {mercies.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 pl-2">
                      <span className={`w-2 h-2 rounded-full ${m.wounded ? 'bg-red-500' : 'bg-green-500'}`} aria-hidden="true" />
                      <span className="text-xs text-legion-text-primary">{m.name}</span>
                      <span className="text-xs text-legion-text-muted">{m.wounded ? 'wounded' : 'healthy'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-legion-text-muted">No Mercies</div>
              )}

              {/* Alchemists */}
              {alchemists.length > 0 ? (
                <div className="text-sm space-y-1.5">
                  <span className="text-legion-text-muted block">Alchemists</span>
                  {alchemists.map((a) => (
                    <div key={a.id} className="pl-2">
                      <CorruptionClock corruption={a.corruption} name={a.name} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-legion-text-muted">No Alchemists</div>
              )}

              {/* Siege weapons */}
              {siegeWeapons.length > 0 && (
                <div className="text-sm">
                  <span className="text-legion-text-muted block mb-1">Siege Weapons</span>
                  {siegeWeapons.map((w) => (
                    <div key={w.id} className="flex items-center gap-2 pl-2">
                      <span className="text-xs text-legion-text-primary">{w.name}</span>
                      <span className="text-xs text-legion-text-muted">{w.status.toLowerCase()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Projects & Recruits */}
          <div>
            {activeProjects.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-2">Projects</h4>
                <div className="space-y-2">
                  {activeProjects.map((p) => (
                    <div key={p.id} className="text-sm">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-legion-text-primary text-xs truncate">{p.name}</span>
                        <span className="text-xs font-mono text-legion-text-muted shrink-0">
                          {p.segments_filled}/{p.clock_size}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 rounded-full bg-legion-text-muted/20 overflow-hidden" aria-hidden="true">
                        <div
                          className="h-full bg-legion-amber rounded-full transition-all"
                          style={{ width: `${(p.segments_filled / p.clock_size) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(totalRookies > 0 || totalSoldiers > 0) && (
              <div>
                <h4 className="text-xs font-mono uppercase tracking-widest text-legion-text-muted mb-2">Awaiting Assignment</h4>
                <div className="text-sm space-y-1">
                  {totalRookies > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-legion-text-muted">Rookies</span>
                      <span className="text-legion-amber font-mono font-semibold">{totalRookies}</span>
                    </div>
                  )}
                  {totalSoldiers > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-legion-text-muted">Soldiers</span>
                      <span className="text-legion-amber font-mono font-semibold">{totalSoldiers}</span>
                    </div>
                  )}
                  <p className="text-xs text-legion-text-muted">Waiting for Marshal to assign to squads</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
