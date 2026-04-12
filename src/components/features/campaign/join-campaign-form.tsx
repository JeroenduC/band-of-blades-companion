'use client';

import { useActionState } from 'react';
import { joinCampaign } from '@/server/actions/campaign';
import { LegionButton, LegionInput } from '@/components/legion';

export function JoinCampaignForm() {
  const [state, action, pending] = useActionState(joinCampaign, null);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="invite_code" className="text-sm font-medium">
          Invite code
        </label>
        <LegionInput
          id="invite_code"
          name="invite_code"
          type="text"
          required
          placeholder="e.g. XKBM7R4N"
          autoCapitalize="characters"
          className="font-mono tracking-widest uppercase"
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <LegionButton type="submit" disabled={pending} className="w-full">
        {pending ? 'Joining…' : 'Join campaign'}
      </LegionButton>
    </form>
  );
}
