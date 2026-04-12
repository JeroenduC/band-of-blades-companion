'use client';

import { useActionState } from 'react';
import { createCampaign } from '@/server/actions/campaign';
import { LegionButton, LegionInput } from '@/components/legion';

export function CreateCampaignForm() {
  const [state, action, pending] = useActionState(createCampaign, null);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          Campaign name
        </label>
        <LegionInput
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. The March of the Shattered Lions"
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <LegionButton type="submit" disabled={pending} className="w-full">
        {pending ? 'Creating campaign…' : 'Create campaign'}
      </LegionButton>
    </form>
  );
}
