'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signIn } from '@/server/actions/auth';
import { LegionButton, LegionInput } from '@/components/legion';
import { AuthShell } from './auth-shell';

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, null);

  return (
    <AuthShell>
      <div className="space-y-6">
        {/* Form heading */}
        <div className="space-y-1">
          <h2 className="font-heading text-xl font-semibold tracking-wide">
            Sign in
          </h2>
          <p className="text-sm text-muted-foreground">
            Welcome back, Legionnaire.
          </p>
        </div>

        <form action={action} className="space-y-4" noValidate>
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
              autoComplete="current-password"
              aria-describedby={state?.error ? 'auth-error' : undefined}
            />
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
            {pending ? 'Signing in…' : 'Sign in'}
          </LegionButton>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          No account yet?{' '}
          <Link
            href="/sign-up"
            className="text-legion-amber underline underline-offset-4"
          >
            Create one
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
