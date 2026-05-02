'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signUp, signInWithGoogle } from '@/server/actions/auth';
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

        <form action={signInWithGoogle} className="w-full">
          <LegionButton variant="outline" className="w-full flex items-center justify-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
              />
            </svg>
            Sign up with Google
          </LegionButton>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-legion-bg-base px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
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
            className="text-legion-amber underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
