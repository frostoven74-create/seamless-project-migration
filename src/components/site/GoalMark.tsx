import { getGoal, pad } from "@/features/sdg/sdgs";
import { cn } from "@/lib/utils";

export function GoalMark({ goal, withName, className }: { goal: number; withName?: boolean; className?: string }) {
  const g = getGoal(goal);
  return (
    <span className={cn("inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] text-bone", className)}>
      <span aria-hidden className="inline-block size-2 rounded-[1px]" style={{ background: g?.color }} />
      <span>SDG {pad(goal)}</span>
      {withName && g && <span className="font-sans text-xs tracking-normal text-lichen">{g.short}</span>}
    </span>
  );
}
