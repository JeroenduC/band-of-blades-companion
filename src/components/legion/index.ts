/**
 * Legion component layer — the only permitted import path for UI primitives.
 *
 * Rule (ADR-002): Feature and page code must import from here, never from
 * @/components/ui/ directly. This keeps the Shadcn dependency behind a
 * seam that can be swapped without touching feature code.
 */

export { LegionButton } from './legion-button';
export {
  LegionCard,
  LegionCardHeader,
  LegionCardTitle,
  LegionCardDescription,
  LegionCardContent,
  LegionCardFooter,
  LegionCardAction,
} from './legion-card';
export { LegionInput } from './legion-input';
export {
  LegionDialog,
  LegionDialogTrigger,
  LegionDialogContent,
  LegionDialogHeader,
  LegionDialogTitle,
  LegionDialogDescription,
  LegionDialogFooter,
  LegionDialogClose,
} from './legion-dialog';
export { LegionBadge } from './legion-badge';
export { LegionToaster } from './legion-toaster';
