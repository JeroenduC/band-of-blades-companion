/**
 * LegionBadge — Direction B flat inline badge.
 *
 * No rounded corners. Subtle tinted background + matching border.
 * intent controls the color palette. variant is accepted for backwards
 * compatibility with existing usages and maps to an intent automatically.
 *
 * ADR-002: Feature code must import from @/components/legion — never from
 * @/components/ui/ or @base-ui/react directly.
 */

import { cn } from '@/lib/utils';
import type * as React from 'react';

type Intent = 'neutral' | 'danger' | 'amber';

// Backwards-compat variant names accepted by existing feature code.
type LegacyVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'link';

interface LegionBadgeProps {
  children: React.ReactNode;
  intent?: Intent;
  /** @deprecated Use intent instead. Kept for backwards compatibility. */
  variant?: LegacyVariant;
  className?: string;
}

function intentFromVariant(variant: LegacyVariant | undefined): Intent {
  switch (variant) {
    case 'destructive': return 'danger';
    case 'default':     return 'amber';
    default:            return 'neutral';
  }
}

const INTENT_CLASSES: Record<Intent, string> = {
  neutral: 'bg-legion-text-faint/10 border-legion-text-faint text-legion-text-faint',
  danger:  'bg-legion-danger/10 border-legion-danger text-legion-danger',
  amber:   'bg-legion-amber/10 border-legion-amber text-legion-amber',
};

export function LegionBadge({ children, intent, variant, className }: LegionBadgeProps) {
  const resolvedIntent = intent ?? intentFromVariant(variant);

  return (
    <span
      className={cn(
        'inline-block border px-2.5 py-1',
        'font-mono text-[11px] font-bold uppercase tracking-[0.16em] whitespace-nowrap',
        INTENT_CLASSES[resolvedIntent],
        className,
      )}
    >
      {children}
    </span>
  );
}
