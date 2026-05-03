'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { createCampaign } from '@/server/actions/campaign';
import { LegionButton } from '@/components/legion';

const inputClass =
  'w-full min-h-[52px] px-3.5 py-3 bg-auth-paper-light border-2 border-legion-border font-crimson text-[18px] text-legion-text-primary outline-none transition-colors focus-visible:border-legion-text-primary placeholder:text-legion-text-faint';

const inputErrorClass =
  'w-full min-h-[52px] px-3.5 py-3 bg-auth-paper-light border-2 border-legion-danger font-crimson text-[18px] text-legion-text-primary outline-none transition-colors placeholder:text-legion-text-faint';

// 7 options → select is appropriate (CLAUDE.md: use radio for < 7 options)
const STARTING_LOCATIONS = [
  { value: 'plainsworth',   label: 'Plainsworth'    },
  { value: 'gallows_pass',  label: 'Gallows Pass'   },
  { value: 'the_maw',       label: 'The Maw'        },
  { value: 'barrak_gorge',  label: 'Barrak Gorge'   },
  { value: 'vethara',       label: 'Vethara'        },
  { value: 'the_bazar',     label: 'The Bazar'      },
  { value: 'the_black_city', label: 'The Black City' },
];

export function CreateCampaignForm() {
  const [state, action, pending] = useActionState(createCampaign, null);
  const hasError = !!state?.error;

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-5" noValidate>
        {/* Campaign name */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="name"
            className="font-crimson font-semibold text-[19px] text-legion-text-muted tracking-[0.03em]"
          >
            Campaign name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="off"
            placeholder="e.g. The Long March"
            aria-describedby={hasError ? 'create-error' : undefined}
            className={hasError ? inputErrorClass : inputClass}
          />
        </div>

        {/* Starting location */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="starting_location"
            className="font-crimson font-semibold text-[19px] text-legion-text-muted tracking-[0.03em]"
          >
            Starting location
          </label>
          <p className="font-crimson text-[15px] text-legion-text-faint leading-snug">
            Where does the Legion begin its march?
          </p>
          <select
            id="starting_location"
            name="starting_location"
            className="select-ink"
          >
            <option value="">Select a location…</option>
            {STARTING_LOCATIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {hasError && (
          <div
            id="create-error"
            role="alert"
            aria-live="assertive"
            className="pl-3 py-2.5 border-l-[3px] border-legion-danger font-crimson text-sm text-legion-danger leading-snug"
            style={{ background: 'rgba(139,36,24,0.07)' }}
          >
            <strong>Error:</strong> {state.error}
          </div>
        )}

        <LegionButton type="submit" disabled={pending} className="w-full">
          {pending ? 'Creating campaign…' : 'Create campaign →'}
        </LegionButton>
      </form>

      {/* Double rule + link to join */}
      <div className="border-t-[3px] border-double border-legion-text-primary" aria-hidden="true" />

      <p className="text-center font-crimson text-[17px] text-legion-text-faint">
        Have a code already?{' '}
        <Link
          href="/campaign/join"
          className="text-legion-amber underline underline-offset-[3px] font-semibold hover:text-legion-amber-muted transition-colors"
        >
          Join a campaign
        </Link>
      </p>
    </div>
  );
}
