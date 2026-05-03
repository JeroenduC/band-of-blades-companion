/**
 * LegionInput — Direction B parchment text input.
 *
 * Square corners, bg-surface parchment, ink focus border.
 * Default font is Crimson Pro (body text). Override with className="font-mono"
 * for code-style inputs (invite codes, identifiers).
 *
 * ADR-002: Feature code must import from @/components/legion — never from
 * @/components/ui/ or @base-ui/react directly.
 */

import { Input } from '@base-ui/react/input';
import { cn } from '@/lib/utils';
import type * as React from 'react';

type LegionInputProps = React.ComponentProps<'input'>;

export function LegionInput({ className, ...props }: LegionInputProps) {
  return (
    <Input
      className={cn(
        'w-full min-h-[52px] px-3.5 py-3',
        'bg-legion-bg-surface border-2 border-legion-border',
        'font-crimson text-[18px] text-legion-text-primary',
        'outline-none transition-colors',
        'focus-visible:border-legion-text-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'placeholder:text-legion-text-faint',
        className,
      )}
      {...props}
    />
  );
}
