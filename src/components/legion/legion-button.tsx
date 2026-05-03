/**
 * LegionButton — Direction B square ink button.
 *
 * Wraps the base-ui Button primitive with the Direction B aesthetic:
 * no border-radius, IM Fell English uppercase, ink/parchment palette.
 *
 * Variants: default/primary (ink fill), outline (transparent + ink border),
 * ghost (no border), destructive (danger red).
 * Sizes: default (52px), sm (36px), lg (52px larger text), icon (44px square).
 *
 * ADR-002: Feature code must import from @/components/legion — never from
 * @/components/ui/ or @base-ui/react directly.
 */

import { Button } from '@base-ui/react/button';
import { cn } from '@/lib/utils';
import type * as React from 'react';

type Variant = 'default' | 'primary' | 'outline' | 'ghost' | 'destructive' | 'secondary';
type Size = 'default' | 'sm' | 'lg' | 'xs' | 'icon' | 'icon-sm' | 'icon-lg';

interface LegionButtonProps extends Button.Props {
  variant?: Variant;
  size?: Size;
  className?: string;
}

export function LegionButton({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: LegionButtonProps) {
  const isPrimary = variant === 'default' || variant === 'primary' || variant === 'secondary';

  return (
    <Button
      className={cn(
        // Base — Direction B ink aesthetic, square corners
        'inline-flex shrink-0 items-center justify-center gap-2',
        'font-fell font-bold uppercase tracking-[0.12em]',
        'border-2 transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c08428]',
        'disabled:opacity-55 disabled:cursor-not-allowed',
        // Sizes
        size === 'default' && 'min-h-[52px] px-5 py-3 text-[18px]',
        size === 'lg'      && 'min-h-[52px] px-6 py-3 text-[20px]',
        size === 'sm'      && 'min-h-[36px] px-3 py-1.5 text-[14px]',
        size === 'xs'      && 'min-h-[28px] px-2 py-1 text-[12px]',
        size === 'icon'    && 'size-11 text-[18px]',
        size === 'icon-sm' && 'size-9 text-[14px]',
        size === 'icon-lg' && 'size-11 text-[20px]',
        // Variants
        isPrimary
          && 'bg-legion-text-primary text-legion-bg-base border-legion-text-primary hover:bg-legion-text-muted',
        variant === 'outline'
          && 'bg-transparent text-legion-text-primary border-legion-text-primary hover:bg-legion-text-primary/5',
        variant === 'ghost'
          && 'bg-transparent text-legion-text-primary border-transparent hover:bg-legion-text-primary/5',
        variant === 'destructive'
          && 'bg-legion-danger text-[#f0e6cf] border-legion-danger hover:opacity-90',
        className,
      )}
      {...props}
    />
  );
}
