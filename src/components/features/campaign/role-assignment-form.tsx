'use client';

import { useActionState, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [state, action, pending] = useActionState(assignRole, null);

  // Trigger a full data refresh when the action succeeds. This forces the
  // Server Component to re-fetch memberships and push fresh props down.
  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  // Controlled state so the selects reflect server-updated values after revalidation.
  // defaultValue only applies on mount — these sync whenever the parent re-renders
  // with fresh membership props after a successful assignRole action.
  const [role, setRole] = useState(membership.role ?? '');
  const [rank, setRank] = useState(membership.rank ?? '');

  useEffect(() => {
    setRole(membership.role ?? '');
    setRank(membership.rank ?? '');
  }, [membership.role, membership.rank]);

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
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="rounded-md border border-border bg-legion-bg-base px-2 py-1 text-sm text-legion-text-primary focus:outline-none focus:ring-2 focus:ring-legion-border-focus min-h-[36px]"
      >
        <option value="" disabled>— Pending —</option>
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r} value={r}>
            {r.charAt(0) + r.slice(1).toLowerCase()}
          </option>
        ))}
      </select>

      <select
        name="rank"
        value={rank}
        onChange={(e) => setRank(e.target.value)}
        className="rounded-md border border-border bg-legion-bg-base px-2 py-1 text-sm text-legion-text-primary focus:outline-none focus:ring-2 focus:ring-legion-border-focus min-h-[36px]"
      >
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
