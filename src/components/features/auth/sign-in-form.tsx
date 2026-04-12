'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signIn } from '@/server/actions/auth';
import { LegionButton, LegionInput } from '@/components/legion';

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, null);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, Legionnaire.
          </p>
        </div>

        <form action={action} className="space-y-4">
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
            />
          </div>

          {state?.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}

          <LegionButton type="submit" disabled={pending} className="w-full">
            {pending ? 'Signing in…' : 'Sign in'}
          </LegionButton>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          No account yet?{' '}
          <Link href="/sign-up" className="underline underline-offset-4">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
