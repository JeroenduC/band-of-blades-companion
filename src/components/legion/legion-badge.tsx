/**
 * LegionBadge — project-owned wrapper around the Shadcn Badge primitive.
 *
 * Why this exists (ADR-002): App and feature code must never import directly
 * from @/components/ui/. All UI primitives go through this layer so the
 * underlying library can be swapped without touching feature code.
 *
 * Use cases in Band of Blades:
 * - Role labels (COMMANDER, MARSHAL, etc.)
 * - Mission status (ACTIVE, COMPLETED, FAILED)
 * - Resource state indicators (LOW, CRITICAL)
 */

export { Badge as LegionBadge } from '@/components/ui/badge';
