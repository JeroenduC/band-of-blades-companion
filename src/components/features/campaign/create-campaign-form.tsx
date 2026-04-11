'use client';

import { useActionState } from 'react';
import { createCampaign } from '@/server/actions/campaign';

export function CreateCampaignForm() {
  const [state, action, pending] = useActionState(createCampaign, null);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          Campaign name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. The March of the Shattered Lions"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        {pending ? 'Creating campaign…' : 'Create campaign'}
      </button>
    </form>
  );
}
