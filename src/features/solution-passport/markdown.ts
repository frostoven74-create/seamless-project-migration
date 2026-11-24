import type { Passport } from "@/features/store/types";
import { getTarget } from "@/features/sdg/sdgs";
import { getSource } from "@/features/sdg/sources";

const list = (xs: string[]) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : "- Not provided");
const num = (n: number | null | undefined, unit = "") => (n === null || n === undefined ? "not measured yet" : `${n.toLocaleString("en")}${unit ? ` ${unit}` : ""}`);

/** Plain-text export so the plan is readable by someone who has never used EARTH//OS. */
export function passportMarkdown(p: Passport) {
  const loc = [p.location.place, p.location.countryName].filter(Boolean).join(", ");
  return `# ${p.title}

Solution Passport · EARTH//OS · last updated ${p.updatedAt.slice(0, 10)}${p.sample ? "\n\n> HYPOTHETICAL SAMPLE — every number is invented to demonstrate the workflow." : ""}

Labels: figures marked "calculated" come from stated formulas and inputs; they are estimates, not measured results.

## 1. Problem
${p.problem}

## 2. Location
${loc || "Not provided"}

## 3. Root causes (to be confirmed locally)
${list(p.rootCauses)}

## 4. SDG targets (official UN identifiers)
${p.targets.map((t) => `- ${t.code} (${t.relation}) — ${getTarget(t.code)?.target.description ?? ""}\n  Why: ${t.rationale}`).join("\n")}

## 5. Supporting research
${p.research.map((r) => { const s = getSource(r.sourceId); return `- ${s ? `${s.name} — ${s.org} — ${s.url}` : r.sourceId}${r.note ? `\n  ${r.note}` : ""}`; }).join("\n") || "- None"}

## 6. Baseline
${p.baseline.description}
- Metric: ${p.baseline.metric}
- Value: ${num(p.baseline.value, p.baseline.unit)}
- Method: ${p.baseline.method}

## 7. Proposed intervention
**${p.intervention.name}** — ${p.intervention.summary}

## 8. Expected outcomes
${p.expectedOutcomes.map((o) => `- ${o.label}: ${num(o.value, o.unit)} (${o.nature}; ${o.formula})`).join("\n") || "- None"}

## 9. Possible unintended consequences
${list(p.unintended)}

## 10. Resources
${list(p.resources)}

## 11. Materials
${list(p.materials)}

## 12. Budget
Estimate: ${num(p.budget.estimate, p.budget.currency)}
Assumptions:
${list(p.budget.assumptions)}

## 13. Stages and timeline
${p.stages.map((s, i) => `${i + 1}. ${s.name} (${s.weeks} wk) — ${s.description}`).join("\n")}

## 14. Stakeholders
${list(p.stakeholders)}

## 15. Risks
${p.risks.map((r) => `- ${r.risk} → ${r.mitigation}`).join("\n") || "- None"}

## 16. Measurement indicators
${p.indicators.map((i) => `- ${i.name} (${i.unit}) · baseline ${num(i.baseline)} · target ${num(i.target)} · method: ${i.method}`).join("\n") || "- None"}

## 17. Evidence collection plan
${list(p.evidencePlan)}

## 18. Monitoring schedule
${p.monitoring}

## 19. Maintenance
${p.maintenance}

## 20. Adapting this plan elsewhere
${list(p.adaptation)}

## 21. Limitations and uncertainties
${list(p.limitations)}
`;
}
