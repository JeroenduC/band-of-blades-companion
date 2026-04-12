/**
 * LegionIcon — project-owned icon component backed by Lucide React.
 *
 * Why this exists (ADR-002): feature code must never import icon components
 * directly from lucide-react. All icon usage goes through this wrapper so the
 * icon library can be swapped (or supplemented with custom SVGs) without
 * touching feature code.
 *
 * Usage:
 *   <LegionIcon name="commander" />
 *   <LegionIcon name="clock" size={20} className="text-legion-amber" />
 *   <LegionIcon name="pressure" aria-label="Pressure level" />
 *
 * When used as a standalone meaningful icon (not decorative), always pass
 * aria-label so screen readers announce it. Decorative icons that are
 * accompanied by visible text do not need aria-label — they will be
 * aria-hidden automatically.
 */

import type { LucideProps } from 'lucide-react';
import {
  // Roles
  Crown,        // Commander
  Swords,       // Marshal
  Package,      // Quartermaster
  BookOpen,     // Lorekeeper
  Eye,          // Spymaster
  Shield,       // Rookie / soldier
  // Resources
  Wheat,        // Food
  Footprints,   // Horses
  Box,          // Supply
  Flame,        // Black shot / munitions
  // Actions
  ArrowRight,   // Advance / march
  UserPlus,     // Recruit
  Unlock,       // Liberty
  // Status
  Circle,       // Clock (segment placeholder)
  Gauge,        // Pressure
  Heart,        // Morale
  AlertTriangle,// Warning / low resource
  CheckCircle2, // Completed / success
  XCircle,      // Failed / dead
  // Navigation & UI
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  Plus,
  Minus,
  Info,
  Loader2,      // Spinner
} from 'lucide-react';

export type IconName =
  // Roles
  | 'commander' | 'marshal' | 'quartermaster' | 'lorekeeper' | 'spymaster' | 'rookie'
  // Resources
  | 'food' | 'horses' | 'supply' | 'black-shot'
  // Actions
  | 'advance' | 'recruit' | 'liberty'
  // Status
  | 'clock' | 'pressure' | 'morale' | 'warning' | 'success' | 'failed'
  // Navigation & UI
  | 'chevron-right' | 'chevron-left' | 'chevron-down' | 'close' | 'add' | 'remove' | 'info' | 'loading';

const ICON_MAP: Record<IconName, React.ComponentType<LucideProps>> = {
  // Roles
  commander:    Crown,
  marshal:      Swords,
  quartermaster: Package,
  lorekeeper:   BookOpen,
  spymaster:    Eye,
  rookie:       Shield,
  // Resources
  food:         Wheat,
  horses:       Footprints,
  supply:       Box,
  'black-shot': Flame,
  // Actions
  advance:      ArrowRight,
  recruit:      UserPlus,
  liberty:      Unlock,
  // Status
  clock:        Circle,
  pressure:     Gauge,
  morale:       Heart,
  warning:      AlertTriangle,
  success:      CheckCircle2,
  failed:       XCircle,
  // Navigation & UI
  'chevron-right': ChevronRight,
  'chevron-left':  ChevronLeft,
  'chevron-down':  ChevronDown,
  close:        X,
  add:          Plus,
  remove:       Minus,
  info:         Info,
  loading:      Loader2,
};

interface LegionIconProps extends Omit<LucideProps, 'ref'> {
  name: IconName;
  /** Accessible label. Required when the icon is the sole conveyor of meaning.
   *  Omit (or leave undefined) when the icon is decorative alongside visible text. */
  'aria-label'?: string;
}

export function LegionIcon({ name, 'aria-label': ariaLabel, ...props }: LegionIconProps) {
  const Icon = ICON_MAP[name];
  return (
    <Icon
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      {...props}
    />
  );
}
