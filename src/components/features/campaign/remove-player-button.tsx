'use client';

import { useActionState, useState } from 'react';
import { removePlayer } from '@/server/actions/campaign';
import {
  LegionDialog,
  LegionDialogTrigger,
  LegionDialogContent,
  LegionDialogHeader,
  LegionDialogTitle,
  LegionDialogDescription,
  LegionDialogFooter,
  LegionDialogClose,
} from '@/components/legion';

interface RemovePlayerButtonProps {
  membershipId: string;
  campaignId: string;
  playerName: string;
  campaignName: string;
}

export function RemovePlayerButton({
  membershipId,
  campaignId,
  playerName,
  campaignName,
}: RemovePlayerButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(removePlayer, null);

  return (
    <LegionDialog open={open} onOpenChange={setOpen}>
      {/* base-ui uses render prop instead of asChild */}
      <LegionDialogTrigger
        render={
          <button
            type="button"
            className="text-xs text-red-400 underline underline-offset-4 hover:text-red-300 transition-colors min-h-[44px] px-2"
            aria-label={`Remove ${playerName} from campaign`}
          />
        }
      >
        Remove
      </LegionDialogTrigger>

      <LegionDialogContent>
        <LegionDialogHeader>
          <LegionDialogTitle>Remove player?</LegionDialogTitle>
          <LegionDialogDescription>
            Are you sure you want to remove <strong>{playerName}</strong> from{' '}
            <strong>{campaignName}</strong>? This will revoke their access to the campaign.
            Their account is not deleted — they can rejoin via invite code.
          </LegionDialogDescription>
        </LegionDialogHeader>

        {state?.error && (
          <p role="alert" className="text-sm text-red-400 px-1">
            Error: {state.error}
          </p>
        )}

        <LegionDialogFooter>
          <LegionDialogClose
            render={
              <button
                type="button"
                className="rounded-md border border-border px-4 py-2 text-sm text-legion-text-muted hover:text-legion-text-primary transition-colors min-h-[44px]"
              />
            }
          >
            Cancel
          </LegionDialogClose>

          <form action={action}>
            <input type="hidden" name="membership_id" value={membershipId} />
            <input type="hidden" name="campaign_id" value={campaignId} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {pending ? 'Removing…' : 'Remove player'}
            </button>
          </form>
        </LegionDialogFooter>
      </LegionDialogContent>
    </LegionDialog>
  );
}
