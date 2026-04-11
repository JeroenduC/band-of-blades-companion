'use client';

import { useActionState } from 'react';
import { joinCampaign } from '@/server/actions/campaign';

export function JoinCampaignForm() {
  const [state, action, pending] = useActionState(joinCampaign, null);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="invite_code" className="text-sm font-medium">
          Invite code
        </label>
        <input
          id="invite_code"
          name="invite_code"
          type="text"
          required
          placeholder="e.g. XKBM7R4N"
          autoCapitalize="characters"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono tracking-widest uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {pending ? 'Joining…' : 'Join campaign'}
      </button>
    </form>
  );
}
