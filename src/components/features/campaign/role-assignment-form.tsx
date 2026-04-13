'use client';

import { useActionState } from 'react';
import { assignRole } from '@/server/actions/campaign';
import type { LegionRole, MemberRank, CampaignMembershipWithProfile } from '@/lib/types';
import { LegionButton } from '@/components/legion';

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
        <span className="text-sm font-medium text-legion-text-primary min-w-[8rem]">
          {membership.profiles.display_name}
        </span>
        <span className="font-mono text-xs uppercase tracking-widest text-legion-amber">GM</span>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="membership_id" value={membership.id} />
      <input type="hidden" name="campaign_id" value={campaignId} />

      <span className="text-sm font-medium text-legion-text-primary min-w-[8rem]">
        {membership.profiles.display_name}
      </span>

      <select
        name="role"
        defaultValue={membership.role ?? ''}
        className="rounded-md border border-border bg-legion-bg-base px-2 py-1 text-sm text-legion-text-primary focus:outline-none focus:ring-2 focus:ring-legion-border-focus min-h-[36px]"
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
        className="rounded-md border border-border bg-legion-bg-base px-2 py-1 text-sm text-legion-text-primary focus:outline-none focus:ring-2 focus:ring-legion-border-focus min-h-[36px]"
      >
        {/* Shown when rank is null */}
        <option value="" disabled>— Pick rank —</option>
        {RANKS.map((r) => (
          <option key={r} value={r}>
            {r.charAt(0) + r.slice(1).toLowerCase()}
          </option>
        ))}
      </select>

      <LegionButton type="submit" disabled={pending} size="sm">
        {pending ? 'Saving…' : 'Assign'}
      </LegionButton>

      {state?.error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
