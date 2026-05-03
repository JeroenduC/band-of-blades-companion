'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { joinCampaign } from '@/server/actions/campaign';
import { LegionButton } from '@/components/legion';

// Shared outline-button link style — same visual as LegionButton variant="outline"
const outlineLinkClass =
  'flex items-center justify-center w-full min-h-[52px] px-5 py-3 font-fell text-[18px] font-bold uppercase tracking-[0.12em] border-2 border-legion-text-primary text-legion-text-primary hover:bg-legion-text-primary/5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c08428]';

const inputClass =
  'w-full min-h-[52px] px-3.5 py-3 bg-auth-paper-light border-2 border-legion-border font-mono text-[18px] tracking-[0.08em] uppercase text-legion-text-primary outline-none transition-colors focus-visible:border-legion-text-primary';

const inputErrorClass =
  'w-full min-h-[52px] px-3.5 py-3 bg-auth-paper-light border-2 border-legion-danger font-mono text-[18px] tracking-[0.08em] uppercase text-legion-text-primary outline-none transition-colors';

export function JoinCampaignForm() {
  const [state, action, pending] = useActionState(joinCampaign, null);
  const hasError = !!state?.error;

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="invite_code"
            className="font-crimson font-semibold text-[19px] text-legion-text-muted tracking-[0.03em]"
          >
            Invite code
          </label>
          <input
            id="invite_code"
            name="invite_code"
            type="text"
            required
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="e.g. XKBM7R4N"
            aria-describedby={hasError ? 'join-error' : undefined}
            className={hasError ? inputErrorClass : inputClass}
          />
        </div>

        {hasError && (
          <div
            id="join-error"
            role="alert"
            aria-live="assertive"
            className="pl-3 py-2.5 border-l-[3px] border-legion-danger font-crimson text-sm text-legion-danger leading-snug"
            style={{ background: 'rgba(139,36,24,0.07)' }}
          >
            <strong>Error:</strong> {state.error}
          </div>
        )}

        <LegionButton type="submit" disabled={pending} className="w-full">
          {pending ? 'Joining…' : 'Join campaign →'}
        </LegionButton>
      </form>

      {/* Dashed divider */}
      <div className="flex items-center gap-3" aria-hidden="true">
        <div className="flex-1 border-t border-dashed border-legion-border" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-legion-text-faint">or</span>
        <div className="flex-1 border-t border-dashed border-legion-border" />
      </div>

      {/* Are you the GM? card */}
      <div className="border border-legion-border bg-auth-paper-light px-5 py-5 flex flex-col gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-legion-text-faint">
          Are you the GM?
        </p>
        <p className="font-crimson text-[17px] text-legion-text-muted leading-relaxed">
          Start a new campaign and receive an invite code to share with your players.
        </p>
        <Link href="/campaign/new" className={outlineLinkClass}>
          Create a campaign
        </Link>
      </div>
    </div>
  );
}
