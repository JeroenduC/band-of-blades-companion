'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signUp } from '@/server/actions/auth';
import { LegionButton, LegionInput } from '@/components/legion';
import { AuthShell } from './auth-shell';

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, null);

  return (
    <AuthShell>
      <div className="space-y-6">
        {/* Form heading */}
        <div className="space-y-1">
          <h2 className="font-heading text-xl font-semibold tracking-wide">
            Join the Legion
          </h2>
          <p className="text-sm text-muted-foreground">
            Create your account to begin the campaign.
          </p>
        </div>

        <form action={action} className="space-y-4" noValidate>
          <div className="space-y-1">
            <label htmlFor="display_name" className="text-sm font-medium">
              Display name
            </label>
            <LegionInput
              id="display_name"
              name="display_name"
              type="text"
              required
              autoComplete="name"
              aria-describedby={state?.error ? 'auth-error' : undefined}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <LegionInput
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              aria-describedby={state?.error ? 'auth-error' : undefined}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <LegionInput
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              aria-describedby={
                state?.error ? 'auth-error' : 'password-hint'
              }
            />
            <p id="password-hint" className="text-xs text-muted-foreground">
              Minimum 8 characters.
            </p>
          </div>

          {state?.error && (
            <p
              id="auth-error"
              role="alert"
              aria-live="assertive"
              className="text-sm text-destructive"
            >
              {state.error}
            </p>
          )}

          <LegionButton type="submit" disabled={pending} className="w-full">
            {pending ? 'Creating account…' : 'Create account'}
          </LegionButton>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/sign-in"
            className="text-legion-amber underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
