'use client';

import { useState } from 'react';
import { IntelQuestionsForm } from './intel-questions-form';
import { PlaceholderStep } from './placeholder-step';

interface MissionSelectionStepProps {
  campaignId: string;
  intel: number;
}

/**
 * Two-sub-step wrapper for AWAITING_MISSION_SELECTION.
 *
 * Sub-step 1: Intel questions (skippable).
 * Sub-step 2: Mission cards — #74 will replace the placeholder.
 */
export function MissionSelectionStep({ campaignId, intel }: MissionSelectionStepProps) {
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
    <PlaceholderStep
      campaignId={campaignId}
      title="Mission Selection"
      message="Full mission selection will be implemented in Epic 5/6. Click Continue to complete this phase."
      buttonLabel="Complete Phase"
      nextState="PHASE_COMPLETE"
      role="COMMANDER"
      actionType="MISSION_SELECTED"
      dashboardPath="/dashboard/commander"
    />
  );
}
