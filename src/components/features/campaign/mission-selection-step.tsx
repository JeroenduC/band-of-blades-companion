'use client';

import { useState } from 'react';
import { IntelQuestionsForm } from './intel-questions-form';
import { MissionSelectionCards } from './mission-selection-cards';
import type { Mission } from '@/lib/types';

interface MissionSelectionStepProps {
  campaignId: string;
  intel: number;
  missions: Mission[];
}

/**
 * Two-sub-step wrapper for AWAITING_MISSION_SELECTION.
 *
 * Sub-step 1: Intel questions (skippable).
 * Sub-step 2: Mission designation (primary / secondary).
 */
export function MissionSelectionStep({ campaignId, intel, missions }: MissionSelectionStepProps) {
  const [intelDone, setIntelDone] = useState(false);

  if (!intelDone) {
    return (
      <IntelQuestionsForm
        campaignId={campaignId}
        intel={intel}
        onSubmitted={() => setIntelDone(true)}
      />
    );
  }

  return (
    <MissionSelectionCards
      campaignId={campaignId}
      intel={intel}
      missions={missions}
    />
  );
}
