/**
 * LegionCard — project-owned wrappers around the Shadcn Card primitives.
 *
 * Why this exists (ADR-002): App and feature code must never import directly
 * from @/components/ui/. All UI primitives go through this layer so the
 * underlying library can be swapped without touching feature code.
 *
 * Re-exports the full Card composition API unchanged.
 * Project-specific card patterns (e.g. MissionCard, ResourceCard) should
 * be built on top of these, not alongside them.
 */

export {
  Card as LegionCard,
  CardHeader as LegionCardHeader,
  CardTitle as LegionCardTitle,
  CardDescription as LegionCardDescription,
  CardContent as LegionCardContent,
  CardFooter as LegionCardFooter,
  CardAction as LegionCardAction,
} from '@/components/ui/card';
