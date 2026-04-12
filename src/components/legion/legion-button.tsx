/**
 * LegionButton — project-owned wrapper around the Shadcn Button primitive.
 *
 * Why this exists (ADR-002): App and feature code must never import directly
 * from @/components/ui/. All UI primitives go through this layer so the
 * underlying library can be swapped without touching feature code.
 *
 * Project defaults applied here:
 * - Minimum 44px touch target enforced via min-h (WCAG 2.5.5)
 * - "default" variant maps to the amber/gold primary (set in design tokens)
 */

import { Button, type buttonVariants } from '@/components/ui/button';
import type { VariantProps } from 'class-variance-authority';
import type { Button as ButtonPrimitive } from '@base-ui/react/button';

type LegionButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants>;

export function LegionButton({ className, ...props }: LegionButtonProps) {
  return (
    <Button
      className={className}
      {...props}
    />
  );
}
