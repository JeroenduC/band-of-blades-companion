'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signUp } from '@/server/actions/auth';
import { LegionButton, LegionInput } from '@/components/legion';

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, null);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Join the Legion. Enter your details below.
          </p>
        </div>

        <form action={action} className="space-y-4">
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
            />
          </div>

          {state?.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}

          <LegionButton type="submit" disabled={pending} className="w-full">
            {pending ? 'Creating account…' : 'Create account'}
          </LegionButton>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/sign-in" className="underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
