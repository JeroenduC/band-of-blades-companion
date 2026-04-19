'use client';

import { useActionState, useEffect, useState } from 'react';
import { Campaign, MissionType } from '@/lib/types';
import { getLocation } from '@/lib/locations';
import { ActionCard } from '@/components/features/campaign/action-card';
import { LegionButton } from '@/components/legion/legion-button';
import { selectMissionFocus, type MissionFocusState } from '@/server/actions/campaign-phase';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [selectedFocus, setSelectedFocus] = useState<MissionType | null>(null);
  
  const [state, formAction, isPending] = useActionState<MissionFocusState | null, FormData>(
    selectMissionFocus,
    null
  );

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  const location = getLocation(campaign.current_location);
  const availableTypes = (location?.available_mission_types ?? []) as string[];

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="campaign_id" value={campaign.id} />
      <input type="hidden" name="focus" value={selectedFocus ?? ''} />

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

      {state?.errors?._form && (
        <p className="text-sm text-legion-danger font-mono bg-legion-danger-subtle px-3 py-2 rounded border border-legion-danger/20">
          {state.errors._form[0]}
        </p>
      )}

      <div className="flex justify-end pt-4 border-t border-border">
        <LegionButton
          type="submit"
          variant="default"
          disabled={!selectedFocus || isPending}
        >
          {isPending ? 'Confirming Focus...' : 'Select Mission Focus'}
        </LegionButton>
      </div>
    </form>
  );
}
