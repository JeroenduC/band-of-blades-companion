'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signUp, signInWithGoogle } from '@/server/actions/auth';
import { AuthShell } from './auth-shell';
import { GoogleIcon } from './google-icon';

const inputClass =
  'w-full min-h-[52px] px-3.5 py-3 bg-auth-paper-light border-2 border-auth-parch-edge font-crimson text-[18px] text-auth-ink outline-none transition-colors focus-visible:border-auth-ink';

const inputErrorClass =
  'w-full min-h-[52px] px-3.5 py-3 bg-auth-paper-light border-2 border-auth-red font-crimson text-[18px] text-auth-ink outline-none transition-colors';

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, null);
  const hasError = !!state?.error;

  return (
    <AuthShell>
      {/* Masthead */}
      <div className="flex justify-between items-start border-b-[3px] border-double border-auth-ink pb-3.5 mb-5 gap-3">
        <div>
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-auth-ink-faint mb-1.5">
            Orders · Enlistment
          </p>
          <h2 className="font-fell text-[38px] font-bold leading-none text-auth-ink">
            Join the Legion
          </h2>
          <p className="font-crimson text-[18px] text-auth-ink-soft mt-1">
            Create your account to begin the campaign.
          </p>
        </div>
        <div
          aria-hidden="true"
          className="shrink-0 mt-1 inline-block px-2.5 py-0.5 border-2 border-auth-amber text-auth-ink font-mono text-[10px] font-bold uppercase tracking-[0.2em] rotate-[-3deg] opacity-80 whitespace-nowrap"
        >
          Enlist
        </div>
      </div>

      {/* Google SSO */}
      <form action={signInWithGoogle} className="w-full">
        <button
          type="submit"
          className="flex items-center justify-center gap-2 w-full min-h-[52px] px-5 py-3 bg-transparent text-auth-ink border-2 border-auth-ink font-fell text-[18px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-auth-ink/5 focus-visible:outline-2 focus-visible:outline-auth-ink focus-visible:outline-offset-2"
        >
          <GoogleIcon />
          Sign up with Google
        </button>
      </form>

      {/* Dashed divider */}
      <div className="flex items-center gap-3 my-[18px]" aria-hidden="true">
        <div className="flex-1 border-t border-dashed border-auth-parch-edge" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-auth-ink-faint">or</span>
        <div className="flex-1 border-t border-dashed border-auth-parch-edge" />
      </div>

      {/* Sign-up form */}
      <form action={action} className="space-y-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="display_name" className="font-crimson font-semibold text-[19px] text-auth-ink-soft tracking-[0.03em]">
            Display name
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            required
            autoComplete="name"
            aria-describedby={hasError ? 'auth-error' : undefined}
            className={hasError ? inputErrorClass : inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="font-crimson font-semibold text-[19px] text-auth-ink-soft tracking-[0.03em]">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            aria-describedby={hasError ? 'auth-error' : undefined}
            className={hasError ? inputErrorClass : inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="font-crimson font-semibold text-[19px] text-auth-ink-soft tracking-[0.03em]">
            Password
          </label>
          <p id="password-hint" className="font-crimson text-[16px] text-auth-ink-faint leading-snug">
            Minimum 8 characters.
          </p>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            aria-describedby={hasError ? 'auth-error' : 'password-hint'}
            className={hasError ? inputErrorClass : inputClass}
          />
        </div>

        {hasError && (
          <div
            id="auth-error"
            role="alert"
            aria-live="assertive"
            className="pl-3 py-2.5 border-l-[3px] border-auth-red font-crimson text-sm text-auth-red leading-snug"
            style={{ background: 'rgba(139,36,24,0.07)' }}
          >
            <strong>Error:</strong> {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center w-full min-h-[52px] px-5 py-3 bg-auth-ink text-auth-paper border-2 border-auth-ink font-fell text-[18px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-auth-ink-soft disabled:opacity-55 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-auth-parch-edge"
        >
          {pending ? 'Creating account…' : 'Create account →'}
        </button>
      </form>

      {/* Double rule */}
      <div className="border-t-[3px] border-double border-auth-ink my-5" aria-hidden="true" />

      <p className="text-center font-crimson text-sm text-auth-ink-faint">
        Already have an account?{' '}
        <Link
          href="/sign-in"
          className="text-auth-ink-soft underline underline-offset-[3px] font-semibold"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
