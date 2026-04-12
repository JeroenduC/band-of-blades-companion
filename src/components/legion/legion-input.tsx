/**
 * LegionInput — project-owned wrapper around the Shadcn Input primitive.
 *
 * Why this exists (ADR-002): App and feature code must never import directly
 * from @/components/ui/. All UI primitives go through this layer so the
 * underlying library can be swapped without touching feature code.
 *
 * Project defaults applied here:
 * - Full-width by default (most inputs in this app span their container)
 * - Inherits border/ring colours from design tokens (amber focus ring)
 */

import { Input } from '@/components/ui/input';
import type * as React from 'react';

type LegionInputProps = React.ComponentProps<'input'>;

export function LegionInput(props: LegionInputProps) {
  return <Input {...props} />;
}
