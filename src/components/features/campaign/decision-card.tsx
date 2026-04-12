/**
 * DecisionCard — presents a binary or multi-option decision to the player.
 *
 * Used for yes/no or either/or moments (e.g. "Do you push on through the
 * night, or make camp?"). Each option is a button. The card shows context
 * about what is at stake without revealing exact outcomes.
 *
 * Design principle (§2): "Informed decisions, not blind clicks." The context
 * prop tells the player what kind of resource is at risk — not the result.
 */

'use client';

import { cn } from '@/lib/utils';
import { LegionButton } from '@/components/legion';

export interface DecisionOption {
  /** Short option label, e.g. "Push on" */
  label: string;
  /** Optional brief note shown under the label */
  description?: string;
  /** Visual intent of this option */
  variant?: 'default' | 'destructive' | 'outline';
  onClick: () => void;
}

export interface DecisionCardProps {
  /** The question or prompt presented to the player */
  prompt: string;
  /** Optional context explaining what is at stake (no spoilers on outcome) */
  context?: string;
  /** Two or more decision options */
  options: [DecisionOption, DecisionOption, ...DecisionOption[]];
  /** Whether a decision has already been made (card is read-only) */
  resolved?: boolean;
  className?: string;
}

export function DecisionCard({
  prompt,
  context,
  options,
  resolved = false,
  className,
}: DecisionCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-legion-bg-surface p-5',
        'shadow-[var(--bob-shadow-md)]',
        resolved && 'opacity-60',
        className,
      )}
      aria-disabled={resolved}
    >
      {/* Prompt */}
      <p className="font-heading text-base font-semibold leading-snug tracking-wide text-legion-text-primary">
        {prompt}
      </p>

      {/* Context — what is at stake */}
      {context && (
        <p className="mt-2 text-xs text-legion-text-muted leading-relaxed border-l-2 border-[var(--bob-border-strong)] pl-3">
          {context}
        </p>
      )}

      {/* Options */}
      <div className={cn(
        'mt-4 flex gap-3',
        // Stack vertically on narrow containers; horizontal on wider ones
        options.length > 2 ? 'flex-col' : 'flex-col sm:flex-row',
      )}>
        {options.map((option, i) => (
          <div key={i} className="flex-1">
            <LegionButton
              variant={option.variant ?? (i === 0 ? 'default' : 'outline')}
              disabled={resolved}
              onClick={option.onClick}
              className="w-full flex-col h-auto py-2.5 gap-0.5"
            >
              <span className="font-heading text-sm font-semibold tracking-wide">
                {option.label}
              </span>
              {option.description && (
                <span className={cn(
                  'text-xs font-normal',
                  // Subtle description inside button — use fg colour with reduced opacity
                  option.variant === 'destructive'
                    ? 'text-[var(--bob-danger-fg)]/70'
                    : i === 0
                      ? 'text-[var(--bob-amber-fg)]/70'
                      : 'text-legion-text-muted',
                )}>
                  {option.description}
                </span>
              )}
            </LegionButton>
          </div>
        ))}
      </div>
    </div>
  );
}
