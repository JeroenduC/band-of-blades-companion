'use client';

import { useState, useTransition } from 'react';
import { Campaign, MissionType } from '@/lib/types';
import { getLocation } from '@/lib/locations';
import { ActionCard } from '@/components/features/campaign/action-card';
import { LegionButton } from '@/components/legion/legion-button';
import { selectMissionFocus } from '@/server/actions/campaign-phase';

interface MissionFocusFormProps {
  campaign: Campaign;
}

interface FocusOption {
  type: MissionType;
  title: string;
  description: string;
  yields: string;
  icon: 'marshal' | 'spymaster' | 'quartermaster' | 'lorekeeper';
}

const FOCUS_OPTIONS: FocusOption[] = [
  {
    type: 'ASSAULT',
    title: 'Assault',
    description: 'Direct confrontation with the undead. Heavy combat and high stakes.',
    yields: 'Morale',
    icon: 'marshal',
  },
  {
    type: 'RECON',
    title: 'Recon',
    description: 'Scouting enemy movements and positions. Gathering intelligence.',
    yields: 'Intel',
    icon: 'spymaster',
  },
  {
    type: 'SUPPLY',
    title: 'Supply',
    description: 'Securing food, munitions, and materiel for the march.',
    yields: 'Supply',
    icon: 'quartermaster',
  },
  {
    type: 'RELIGIOUS',
    title: 'Religious',
    description: 'Protecting pilgrims, purging corruption, or following Chosen guidance.',
    yields: 'Time / Special',
    icon: 'lorekeeper',
  },
];

export function MissionFocusForm({ campaign }: MissionFocusFormProps) {
  const [selectedFocus, setSelectedFocus] = useState<MissionType | null>(null);
  const [isPending, startTransition] = useTransition();
  const location = getLocation(campaign.current_location);
  const availableTypes = (location?.available_mission_types ?? []) as string[];

  async function handleSubmit() {
    if (!selectedFocus) return;
    
    startTransition(async () => {
      const formData = new FormData();
      formData.append('campaign_id', campaign.id);
      formData.append('focus', selectedFocus);
      await selectMissionFocus(formData);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FOCUS_OPTIONS.map((option) => {
          const isAvailable = availableTypes.includes(option.type);
          return (
            <ActionCard
              key={option.type}
              title={option.title}
              description={`${option.description} Typically yields ${option.yields}.`}
              icon={option.icon}
              selected={selectedFocus === option.type}
              disabled={!isAvailable || isPending}
              onClick={() => setSelectedFocus(option.type)}
              cost={!isAvailable ? 'Not at this location' : undefined}
            />
          );
        })}
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <LegionButton
          variant="default"
          disabled={!selectedFocus || isPending}
          onClick={handleSubmit}
        >
          {isPending ? 'Confirming Focus...' : 'Select Mission Focus'}
        </LegionButton>
      </div>
    </div>
  );
}
