'use client';

import { useActionState } from 'react';
import { assignRole } from '@/server/actions/campaign';
import type { LegionRole, MemberRank, CampaignMembershipWithProfile } from '@/lib/types';

const ROLES: LegionRole[] = [
  'GM',
  'COMMANDER',
  'MARSHAL',
  'QUARTERMASTER',
  'LOREKEEPER',
  'SPYMASTER',
  'SOLDIER',
];

const RANKS: MemberRank[] = ['PRIMARY', 'DEPUTY'];

interface RoleAssignmentFormProps {
  membership: CampaignMembershipWithProfile;
  campaignId: string;
}

export function RoleAssignmentForm({ membership, campaignId }: RoleAssignmentFormProps) {
  const [state, action, pending] = useActionState(assignRole, null);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="membership_id" value={membership.id} />
      <input type="hidden" name="campaign_id" value={campaignId} />

      <span className="text-sm font-medium min-w-[8rem]">
        {membership.profiles.display_name}
      </span>

      <select
        name="role"
        defaultValue={membership.role}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r.charAt(0) + r.slice(1).toLowerCase()}
          </option>
        ))}
      </select>

      <select
        name="rank"
        defaultValue={membership.rank}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
      >
        {RANKS.map((r) => (
          <option key={r} value={r}>
            {r.charAt(0) + r.slice(1).toLowerCase()}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save'}
      </button>

      {state?.error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
