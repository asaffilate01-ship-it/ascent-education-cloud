import { cn } from '@/lib/utils';
import { launchPhaseLabel, type LaunchPhase } from '@/lib/launchPhases';

export default function LaunchPhaseBadge({ phase, className }: { phase: LaunchPhase | null; className?: string }) {
  if (!phase) return null;
  return <span className={cn(
    'inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
    phase === 1 ? 'border-success/30 bg-success/10 text-success' : 'border-border bg-muted text-muted-foreground',
    className,
  )}>{launchPhaseLabel[phase]}</span>;
}
