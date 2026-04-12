/**
 * LegionDialog — project-owned wrappers around the Shadcn Dialog primitives.
 *
 * Why this exists (ADR-002): App and feature code must never import directly
 * from @/components/ui/. All UI primitives go through this layer so the
 * underlying library can be swapped without touching feature code.
 *
 * Re-exports the full Dialog composition API unchanged.
 * Use LegionDialog for any modal that requires a decision or confirmation —
 * the Band of Blades design language treats modals as high-stakes moments.
 */

export {
  Dialog as LegionDialog,
  DialogTrigger as LegionDialogTrigger,
  DialogContent as LegionDialogContent,
  DialogHeader as LegionDialogHeader,
  DialogTitle as LegionDialogTitle,
  DialogDescription as LegionDialogDescription,
  DialogFooter as LegionDialogFooter,
  DialogClose as LegionDialogClose,
} from '@/components/ui/dialog';
