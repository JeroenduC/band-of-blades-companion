/**
 * LegionClock — circular segment clock matching the Band of Blades paper game.
 *
 * Clocks are used everywhere in BoB:
 *  - Time clocks (10 segments) — how many ticks until the march ends
 *  - Long-Term Project clocks (4–12 segments) — tracking ongoing work
 *  - Corruption clocks, assignment clocks, etc.
 *
 * The clock is drawn with SVG arc paths so it scales crisply at any size.
 * Filled segments use the amber accent; empty segments use the surface colour.
 *
 * Usage:
 *   <LegionClock total={10} filled={3} label="Time" />
 *   <LegionClock total={4} filled={4} size="lg" animated />
 */

'use client';

import { cn } from '@/lib/utils';

export interface LegionClockProps {
  /** Total number of segments in the clock */
  total: number;
  /** Number of filled (ticked) segments */
  filled: number;
  /** Display size */
  size?: 'sm' | 'md' | 'lg';
  /** Optional label rendered below the clock */
  label?: string;
  /** Animate segment fills (respects prefers-reduced-motion) */
  animated?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: 48,
  md: 72,
  lg: 96,
} as const;

/**
 * Computes the SVG path for a single clock segment (a "pie slice").
 *
 * Segments are drawn clockwise from the top (−90° offset).
 * Each segment has a small 1.5° gap on each side for visual separation.
 */
function segmentPath(
  index: number,
  total: number,
  cx: number,
  cy: number,
  r: number,
  innerR: number,
): string {
  const gapDeg = total > 1 ? 1.5 : 0;
  const sliceDeg = 360 / total;
  const startDeg = -90 + index * sliceDeg + gapDeg;
  const endDeg = -90 + (index + 1) * sliceDeg - gapDeg;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));

  const x3 = cx + innerR * Math.cos(toRad(endDeg));
  const y3 = cy + innerR * Math.sin(toRad(endDeg));
  const x4 = cx + innerR * Math.cos(toRad(startDeg));
  const y4 = cy + innerR * Math.sin(toRad(startDeg));

  // large-arc-flag: 1 if the segment spans more than 180°
  const largeArc = sliceDeg - gapDeg * 2 > 180 ? 1 : 0;

  return [
    `M ${x1} ${y1}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

export function LegionClock({
  total,
  filled,
  size = 'md',
  label,
  animated = false,
  className,
}: LegionClockProps) {
  const clampedFilled = Math.max(0, Math.min(filled, total));
  const px = SIZE_MAP[size];
  const cx = px / 2;
  const cy = px / 2;
  const r = px / 2 - 2;       // outer radius (2px inset for stroke clearance)
  const innerR = r * 0.38;     // inner radius — creates the donut hole

  const ariaLabel = label
    ? `${label}: ${clampedFilled} of ${total} segments filled`
    : `${clampedFilled} of ${total} segments filled`;

  return (
    <figure
      className={cn('inline-flex flex-col items-center gap-1', className)}
      aria-label={ariaLabel}
      role="img"
    >
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        aria-hidden="true"
        className={cn(
          // Animate only if requested AND prefers-reduced-motion is not set.
          // The CSS transition is applied to all paths; the filled class triggers it.
          animated && '[&_path]:transition-colors [&_path]:[transition-duration:300ms] motion-reduce:[&_path]:transition-none',
        )}
      >
        {Array.from({ length: total }, (_, i) => {
          const isFilled = i < clampedFilled;
          return (
            <path
              key={i}
              d={segmentPath(i, total, cx, cy, r, innerR)}
              className={cn(
                // Empty segment — subtle surface colour with a faint border
                'stroke-[var(--bob-border)] stroke-[0.5px]',
                isFilled
                  ? 'fill-[var(--bob-amber)]'
                  : 'fill-[var(--bob-bg-elevated)]',
              )}
            />
          );
        })}
      </svg>

      {label && (
        <figcaption className="text-legion-xs font-mono uppercase tracking-widest text-legion-text-muted">
          {label}
        </figcaption>
      )}
    </figure>
  );
}
