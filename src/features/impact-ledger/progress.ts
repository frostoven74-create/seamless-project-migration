import type { Project } from "@/features/store/types";
import { milestoneStatus } from "@/features/store/rules";

/** Progress summary built only from recorded data; nothing is inferred or rounded up. */
export function projectSummary(p: Project) {
  const ms = p.milestones.map((m) => ({ m, status: milestoneStatus(m, p.evidence) }));
  const verified = ms.filter((x) => x.status === "verified").length;
  const latest = p.measurements.length ? p.measurements[p.measurements.length - 1]! : null;
  const spent = p.spend.reduce((a, s) => a + s.amount, 0);
  const change = latest && p.baseline.value !== null ? latest.value - p.baseline.value : null;
  return {
    milestones: ms,
    verified,
    total: ms.length,
    latest,
    spent,
    change,
    pendingReview: p.evidence.filter((e) => e.status === "under_review").length,
    reported: p.evidence.filter((e) => e.status === "reported").length,
  };
}
