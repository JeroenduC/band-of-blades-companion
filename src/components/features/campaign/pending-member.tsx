'use client';

import { useState, useEffect } from 'react';
import { signOut } from '@/server/actions/auth';
import { LegionButton } from '@/components/legion';

const STEPS = [
  {
    n: '01',
    text: 'Your GM assigns you a role — Commander, Marshal, Quartermaster, Lorekeeper, or Spymaster.',
  },
  {
    n: '02',
    text: "The GM opens the campaign phase. You'll receive a notification.",
  },
  {
    n: '03',
    text: "You act through your role's steps in order, asynchronously with the other players.",
  },
];

interface PendingMemberProps {
  campaignName: string;
}

export function PendingMember({ campaignName }: PendingMemberProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const id = setInterval(
      () => setDots((d) => (d.length >= 3 ? '' : d + '.')),
      600,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      {/* Status block */}
      <div className="border border-legion-border bg-auth-paper-light px-6 py-7 mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-3.5">
          {/* Clock glyph */}
          <div
            className="w-12 h-12 shrink-0 border-2 border-legion-border flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="font-mono text-[22px] text-legion-text-faint">⧖</span>
          </div>
          <div>
            <p className="font-fell text-[20px] text-legion-text-primary leading-tight">
              {campaignName}
              <span aria-hidden="true">{dots}</span>
            </p>
            <p className="font-mono text-[12px] text-legion-text-faint tracking-[0.1em] mt-1 uppercase">
              Joined · Awaiting role assignment
            </p>
          </div>
        </div>

        <div className="border-t border-dashed border-legion-border pt-4">
          <p className="font-crimson text-[17px] text-legion-text-muted leading-relaxed">
            You&apos;ve enlisted. Your GM will assign you a Legion role before the campaign phase
            begins. You&apos;ll be notified when it&apos;s time to act.
          </p>
        </div>
      </div>

      {/* What happens next */}
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-legion-text-faint border-b border-legion-border pb-2 mb-3.5">
          What happens next
        </p>
        <div className="flex flex-col">
          {STEPS.map(({ n, text }) => (
            <div
              key={n}
              className="grid gap-3 py-3 border-b border-dashed border-legion-border"
              style={{ gridTemplateColumns: '40px 1fr' }}
            >
              <span className="font-mono text-[13px] text-legion-text-faint tracking-[0.08em]">
                {n}.
              </span>
              <span className="font-crimson text-[17px] text-legion-text-muted leading-relaxed">
                {text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Leave / sign out */}
      <form action={signOut} className="mt-4">
        <LegionButton type="submit" variant="outline" className="w-full">
          ← Leave campaign
        </LegionButton>
      </form>
    </div>
  );
}
