'use client';

import { SpyNetwork, SpyLongTermAssignment } from '@/lib/types';
import {
  LegionCard,
  LegionCardContent,
  LegionCardHeader,
  LegionCardTitle,
  LegionBadge,
  LegionButton,
} from '@/components/legion';
import { unlockUpgrade } from '@/server/actions/phase/spymaster';
import { cn } from '@/lib/utils';

interface NetworkNode {
  name: string;
  description: string;
  bonus: string;
  prerequisites: string[];
  maxTaken?: number;
}

const NETWORK_NODES: NetworkNode[] = [
  {
    name: 'Spy Network',
    description: 'Initial network setup.',
    bonus: 'Supports 2 spies.',
    prerequisites: [],
  },
  {
    name: 'Acquisition',
    description: 'Establish safehouses and covers.',
    bonus: 'Support 3rd spy.',
    prerequisites: ['Spy Network'],
  },
  {
    name: 'Training',
    description: 'Rigorous field training programs.',
    bonus: 'Upgrade a Trained spy to Master.',
    prerequisites: ['Acquisition'],
    maxTaken: 2,
  },
  {
    name: 'Analysts',
    description: 'Dedicated team for information processing.',
    bonus: '+1d Research assignments.',
    prerequisites: ['Spy Network'],
  },
  {
    name: 'Investments',
    description: 'Financial and resource backing.',
    bonus: '+1d Expand Network assignments.',
    prerequisites: ['Analysts'],
  },
  {
    name: 'Field Assessment',
    description: 'Advanced interrogation techniques.',
    bonus: '+1 question on Interrogate.',
    prerequisites: ['Investments'],
  },
  {
    name: 'Entrapment',
    description: 'Tools for setting elaborate traps.',
    bonus: '+1d Lay Trap assignments.',
    prerequisites: ['Spy Network'],
  },
  {
    name: 'Sources',
    description: 'Reliable informants within key groups.',
    bonus: '+1d Augment Mission assignments.',
    prerequisites: ['Spy Network'],
  },
  {
    name: 'Merchants',
    description: 'Contacts in the trade guilds.',
    bonus: 'Augmented supply missions +1 supply.',
    prerequisites: ['Sources'],
  },
  {
    name: 'Rangers',
    description: 'Wilderness scouts and pathfinders.',
    bonus: 'Augmented recon missions +1 intel.',
    prerequisites: ['Sources'],
  },
  {
    name: 'Mercenaries',
    description: 'Soldiers of fortune for hire.',
    bonus: 'Augmented assault missions +1 morale.',
    prerequisites: ['Sources'],
  },
  {
    name: 'Holy Orders',
    description: 'Clergy and zealots aligned with the Legion.',
    bonus: 'Augmented religious missions +1 asset.',
    prerequisites: ['Sources'],
  },
];

interface SpyNetworkTreeProps {
  campaignId: string;
  network: SpyNetwork | null;
  longTermAssignments: SpyLongTermAssignment[];
}

export function SpyNetworkTree({ campaignId, network, longTermAssignments }: SpyNetworkTreeProps) {
  const currentUpgrades = network?.upgrades || [];
  
  // Check if there's a completed "EXPAND" assignment that hasn't been "claimed" yet
  // For simplicity in this UI, we'll allow selecting an upgrade if an Expand project IS completed.
  // In a real app, we might want a 'claimed' status on the LTA.
  const completedExpandCount = longTermAssignments.filter(a => a.type === 'EXPAND' && a.is_completed).length;
  const totalUpgradesUnlocked = currentUpgrades.length;
  const canUnlockUpgrade = completedExpandCount > (totalUpgradesUnlocked - 1); // -1 because base 'Spy Network' is free

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg text-legion-amber">Spy Network Tree</h3>
        {canUnlockUpgrade && (
          <LegionBadge variant="default" className="animate-pulse bg-legion-amber text-legion-amber-fg">
            Upgrade Available!
          </LegionBadge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Branch 
          title="Core & Capacity" 
          nodes={NETWORK_NODES.filter(n => ['Spy Network', 'Acquisition', 'Training'].includes(n.name))}
          currentUpgrades={currentUpgrades}
          canUnlock={canUnlockUpgrade}
          campaignId={campaignId}
        />
        <Branch 
          title="Intelligence" 
          nodes={NETWORK_NODES.filter(n => ['Analysts', 'Investments', 'Field Assessment'].includes(n.name))}
          currentUpgrades={currentUpgrades}
          canUnlock={canUnlockUpgrade}
          campaignId={campaignId}
        />
        <Branch 
          title="Operations" 
          nodes={NETWORK_NODES.filter(n => ['Entrapment', 'Sources'].includes(n.name))}
          currentUpgrades={currentUpgrades}
          canUnlock={canUnlockUpgrade}
          campaignId={campaignId}
        />
        <Branch 
          title="Augmentation" 
          nodes={NETWORK_NODES.filter(n => ['Merchants', 'Rangers', 'Mercenaries', 'Holy Orders'].includes(n.name))}
          currentUpgrades={currentUpgrades}
          canUnlock={canUnlockUpgrade}
          campaignId={campaignId}
        />
      </div>
    </div>
  );
}

function Branch({ title, nodes, currentUpgrades, canUnlock, campaignId }: { 
  title: string, 
  nodes: NetworkNode[], 
  currentUpgrades: string[],
  canUnlock: boolean,
  campaignId: string
}) {
  return (
    <LegionCard className="bg-legion-bg-surface/50">
      <LegionCardHeader className="pb-3">
        <LegionCardTitle className="text-xs uppercase tracking-widest text-legion-text-muted">
          {title}
        </LegionCardTitle>
      </LegionCardHeader>
      <LegionCardContent className="space-y-4">
        {nodes.map((node) => {
          const timesTaken = currentUpgrades.filter(u => u === node.name).length;
          const isUnlocked = timesTaken > 0;
          const isMaxed = node.maxTaken ? timesTaken >= node.maxTaken : isUnlocked;
          
          const prerequisitesMet = node.prerequisites.length === 0 || 
            node.prerequisites.every(p => currentUpgrades.includes(p));
          
          const isSelectable = canUnlock && prerequisitesMet && !isMaxed;

          return (
            <div 
              key={node.name}
              className={cn(
                "relative pl-4 border-l-2 py-1 transition-colors",
                isUnlocked ? "border-legion-amber" : "border-border",
                !prerequisitesMet && "opacity-40"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className={cn(
                    "text-sm font-heading tracking-wide",
                    isUnlocked ? "text-legion-amber" : "text-legion-text-primary"
                  )}>
                    {node.name}
                    {node.maxTaken && node.maxTaken > 1 && ` (${timesTaken}/${node.maxTaken})`}
                  </h4>
                  <p className="text-[11px] text-legion-text-muted mt-0.5">{node.description}</p>
                  <p className="text-[10px] text-legion-amber/80 font-mono mt-1 uppercase tracking-tight">
                    Bonus: {node.bonus}
                  </p>
                </div>

                {isSelectable && (
                  <form action={unlockUpgrade}>
                    <input type="hidden" name="campaign_id" value={campaignId} />
                    <input type="hidden" name="upgrade_name" value={node.name} />
                    <LegionButton size="sm" variant="default" className="h-7 text-[10px] px-2">
                      Unlock
                    </LegionButton>
                  </form>
                )}

                {isMaxed && !isSelectable && (
                  <LegionBadge variant="outline" className="text-[9px] border-legion-amber/30 text-legion-amber/60">
                    Active
                  </LegionBadge>
                )}
              </div>
            </div>
          );
        })}
      </LegionCardContent>
    </LegionCard>
  );
}
