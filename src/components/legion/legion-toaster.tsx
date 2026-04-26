'use client';

/**
 * LegionToaster — project-owned wrapper around the Shadcn Sonner Toaster.
 *
 * Why this exists (ADR-002): App and feature code must never import directly
 * from @/components/ui/. All UI primitives go through this layer so the
 * underlying library can be swapped without touching feature code.
 *
 * Project defaults applied here:
 * - Theme forced to "dark" — this app has no light mode.
 * - next-themes integration removed for the same reason.
 * Place <LegionToaster /> once in the root layout.
 */

import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

export { toast };

export function LegionToaster() {
  // Dark is the only theme; no next-themes provider needed.
  return <Toaster theme="dark" />;
}
