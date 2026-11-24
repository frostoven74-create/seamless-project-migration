import { milestoneStatus } from "@/features/store/rules";
import type { MilestoneStatus, StoreState } from "@/features/store/types";

export type PlanetSelection =
  | { kind: "goal"; goal: number }
  | { kind: "target"; code: string }
  | { kind: "root"; category: string }
  | null;

export type Leaf = {
  goal: number;
  projectId: string;
  projectTitle: string;
  milestoneId: string;
  title: string;
  status: MilestoneStatus;
  sample: boolean;
};

export type PlanetOverlay = {
  /** Proposed interventions (from Solution Passports) per goal. */
  buds: Record<number, { id: string; title: string; sample: boolean }[]>;
  /** Active projects per goal. */
  shoots: Record<number, { id: string; title: string; sample: boolean }[]>;
  /** Project milestones per goal — only "verified" leaves glow. */
  leaves: Leaf[];
};

export function buildOverlay(s: StoreState, includeSamples: boolean): PlanetOverlay {
  const buds: PlanetOverlay["buds"] = {};
  const shoots: PlanetOverlay["shoots"] = {};
  const leaves: Leaf[] = [];
  for (const p of s.passports) {
    if (p.sample && !includeSamples) continue;
    const goals = new Set(p.targets.filter((t) => t.relation === "direct").map((t) => Number(t.code.split(".")[0])));
    for (const g of goals) (buds[g] ??= []).push({ id: p.id, title: p.title, sample: !!p.sample });
  }
  for (const pr of s.projects) {
    if (pr.sample && !includeSamples) continue;
    if (pr.status === "active" || pr.status === "completed")
      for (const g of pr.goals) (shoots[g] ??= []).push({ id: pr.id, title: pr.title, sample: !!pr.sample });
    const primary = pr.goals[0];
    if (primary === undefined) continue;
    for (const m of pr.milestones)
      leaves.push({
        goal: primary,
        projectId: pr.id,
        projectTitle: pr.title,
        milestoneId: m.id,
        title: m.title,
        status: milestoneStatus(m, pr.evidence),
        sample: !!pr.sample,
      });
  }
  return { buds, shoots, leaves };
}
