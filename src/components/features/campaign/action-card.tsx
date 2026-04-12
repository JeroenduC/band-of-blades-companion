/**
 * ActionCard — a card the player taps/clicks to select a campaign action.
 *
 * Used when presenting a set of mutually-exclusive choices (e.g. which
 * Quartermaster action to take this phase). Selected state is visually
 * distinct; the card is keyboard-navigable.
 *
 * Design principle (§2): "Decisions, not data entry." Present the action as
 * a meaningful choice with enough context to decide — not a form field.
 * Design principle (§2): "Informed decisions, not blind clicks." Show what
 * type of resource is at stake, but not exact outcomes.
 */

'use client';

import { cn } from '@/lib/utils';
import type { IconName } from '@/components/legion';
import { LegionIcon } from '@/components/legion';

export interface ActionCardProps {
  /** Short action title, e.g. "Resupply" */
  title: string;
  /** One-sentence description of what this action does */
  description: string;
  /** Optional icon name from the LegionIcon set */
  icon?: IconName;
  /** Resource cost indicator, e.g. "2 Supply" or "1 Horse" */
  cost?: string;
  /** Whether this card is currently selected */
  selected?: boolean;
  /** Whether this action is unavailable (e.g. insufficient resources) */
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ActionCard({
  title,
  description,
  icon,
  cost,
  selected = false,
  disabled = false,
  onClick,
  className,
}: ActionCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        // Base — card shell
        'group relative w-full rounded-lg border bg-legion-bg-surface text-left',
        'p-4 transition-colors duration-150',
        // Focus indicator — amber ring (WCAG 2.4.7)
        'outline-none focus-visible:ring-2 focus-visible:ring-[var(--bob-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bob-bg-base)]',
        // Default border
        'border-border',
        // Selected state — amber border + slightly elevated bg
        selected && 'border-[var(--bob-amber)] bg-legion-bg-elevated',
        // Hover (non-disabled, non-selected)
        !disabled && !selected && 'hover:border-[var(--bob-border-strong)] hover:bg-legion-bg-elevated',
        // Disabled state
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {/* Selected indicator — amber left bar */}
      {selected && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-0.5 rounded-l-lg bg-[var(--bob-amber)]"
        />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        {icon && (
          <span className={cn(
            'mt-0.5 shrink-0',
            selected ? 'text-legion-amber' : 'text-legion-text-muted',
            'group-hover:text-legion-amber',
          )}>
            <LegionIcon name={icon} size={18} />
          </span>
        )}

        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className={cn(
            'font-heading text-sm font-semibold leading-snug tracking-wide',
            selected ? 'text-legion-amber' : 'text-legion-text-primary',
          )}>
            {title}
          </p>

          {/* Description */}
          <p className="mt-0.5 text-xs text-legion-text-muted leading-relaxed">
            {description}
          </p>
        </div>

        {/* Cost indicator */}
        {cost && (
          <span className={cn(
            'shrink-0 self-start rounded px-1.5 py-0.5 text-xs font-mono',
            'bg-legion-bg-overlay text-legion-text-muted border border-border',
          )}>
            {cost}
          </span>
        )}
      </div>
    </button>
  );
}
