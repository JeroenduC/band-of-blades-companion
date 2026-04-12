'use client';

import { useActionState } from 'react';
import { assignRole } from '@/server/actions/campaign';
import type { LegionRole, MemberRank, CampaignMembershipWithProfile } from '@/lib/types';

// GM is excluded from the assignable list — GM status is set at campaign
// creation and is not reassignable through this UI.
const ASSIGNABLE_ROLES: LegionRole[] = [
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

  // GMs are shown as read-only — their role is set at campaign creation.
  if (membership.role === 'GM') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium min-w-[8rem]">
          {membership.profiles.display_name}
        </span>
        <span className="text-sm text-muted-foreground">GM</span>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="membership_id" value={membership.id} />
      <input type="hidden" name="campaign_id" value={campaignId} />

      <span className="text-sm font-medium min-w-[8rem]">
        {membership.profiles.display_name}
      </span>

      <select
        name="role"
        defaultValue={membership.role ?? ''}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
      >
        {/* Shown when role is null — prevents browser from defaulting to first option */}
        <option value="" disabled>— Pending —</option>
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r} value={r}>
            {r.charAt(0) + r.slice(1).toLowerCase()}
          </option>
        ))}
      </select>

      <select
        name="rank"
        defaultValue={membership.rank ?? ''}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
      >
        {/* Shown when rank is null */}
        <option value="" disabled>— Pick rank —</option>
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
        {pending ? 'Saving…' : 'Assign'}
      </button>

      {state?.error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
