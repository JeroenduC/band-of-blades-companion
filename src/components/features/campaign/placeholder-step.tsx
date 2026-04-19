import { advancePlaceholderStep } from '@/server/actions/phase';
import type { CampaignPhaseState, LegionRole, CampaignPhaseLogActionType } from '@/lib/types';

interface PlaceholderStepProps {
  campaignId: string;
  title: string;
  message: string;
  buttonLabel?: string;
  nextState: CampaignPhaseState;
  role: LegionRole;
  actionType: CampaignPhaseLogActionType;
  dashboardPath: string;
}

/**
 * Generic placeholder for steps that will be fully built in later epics.
 * Shows an explanatory message and a continue button that advances state.
 */
export function PlaceholderStep({
  campaignId,
  title,
  message,
  buttonLabel = 'Continue',
  nextState,
  role,
  actionType,
  dashboardPath,
}: PlaceholderStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-legion-text-muted">{message}</p>
      <form action={advancePlaceholderStep}>
        <input type="hidden" name="campaign_id" value={campaignId} />
        <input type="hidden" name="next_state" value={nextState} />
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="action_type" value={actionType} />
        <input type="hidden" name="dashboard_path" value={dashboardPath} />
        <button
          type="submit"
          className="rounded-md bg-legion-amber px-5 py-2.5 font-heading text-sm font-semibold tracking-wide text-[var(--bob-amber-fg)] hover:opacity-90 transition-opacity min-h-[44px]"
          aria-label={`${title}: ${buttonLabel}`}
        >
          {buttonLabel}
        </button>
      </form>
    </div>
  );
}
