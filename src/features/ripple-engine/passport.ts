import type { Passport, TargetRef, AiBrief } from "@/features/store/types";
import { type Category, type Intervention, type Scenario, type Values, INFRA_LABELS, evidenceBasis } from "./pilot";

export function uid(prefix: string) {
  const r = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${r}`;
}

export function buildPassport(input: {
  id: string;
  now: string;
  category: Category;
  intervention: Intervention;
  values: Values;
  scenario: Scenario;
  problem: string;
  title?: string;
  location: Passport["location"];
  causes: string[];
  targets: TargetRef[];
  baselineValue: number | null;
  ai?: AiBrief | null;
  sample?: boolean;
}): Passport {
  const { category: c, intervention: i, values, scenario: s } = input;
  const outputs = i.compute(values, s);
  const cost = i.cost(values, s);
  const basis = evidenceBasis(i);
  const assumptions = i.params
    .filter((p) => p.kind === "assumption" || p.kind === "price")
    .map((p) => {
      const v = values[p.key];
      const ref = p.reference ? ` (reference default from ${p.reference.sourceId}: ${p.reference.note})` : "";
      return `${p.label}: ${v ?? "not provided"} ${p.unit}${ref}`;
    });
  const missingInfra = i.requires.filter((r) => !s.infra.includes(r)).map((r) => INFRA_LABELS[r]);

  return {
    id: input.id,
    createdAt: input.now,
    updatedAt: input.now,
    ...(input.sample ? { sample: true } : {}),
    title: input.title ?? `${i.name} — ${input.location.place || input.location.countryName || "School"}`,
    problem: input.problem,
    location: input.location,
    categoryId: c.id,
    interventionId: i.id,
    rootCauses: input.causes,
    targets: input.targets,
    research: c.sources.map((sid) => ({ sourceId: sid, note: "Referenced by the EARTH//OS pilot knowledge base." })),
    baseline: {
      description: `Baseline for ${c.baselineMetric.name.toLowerCase()} before the intervention starts.`,
      metric: c.baselineMetric.name,
      unit: c.baselineMetric.unit,
      value: input.baselineValue,
      method: c.baselineMetric.method,
    },
    intervention: { name: i.name, summary: i.summary },
    values,
    scenario: s,
    expectedOutcomes: outputs.map((o) => ({ label: o.label, value: o.value, unit: o.unit, formula: o.formula, nature: o.nature })),
    unintended: i.effects.filter((e) => e.kind !== "positive").map((e) => `SDG ${e.goal}: ${e.note}`),
    resources: i.resources,
    materials: i.materials,
    budget: { estimate: cost.value, currency: s.currency, assumptions: [`Formula: ${cost.formula}`, ...assumptions] },
    stages: i.stages,
    stakeholders: ["Project lead (staff)", "Student team (no names published)", "Caretaker / facilities", "School leadership", "Independent reviewer"],
    risks: i.risks,
    indicators: i.indicators.map((ind, idx) => ({
      ...ind,
      baseline: idx === 0 ? input.baselineValue : null,
      target: null,
    })),
    evidencePlan: [
      "Dated meter readings or weigh logs, using the same method as the baseline",
      "Photographs of installed measures (no identifiable students)",
      "Receipts or invoices for materials",
      "Independent review of each milestone in the Impact Ledger",
    ],
    monitoring: `Measure ${c.baselineMetric.name.toLowerCase()} weekly during the project and monthly for six months after.`,
    maintenance: i.maintenance,
    adaptation: [
      "Replace every sample or reference value with a local measurement before relying on the numbers.",
      "Check local regulations, prices and supplier availability.",
      ...(missingInfra.length ? [`Missing prerequisites in this scenario: ${missingInfra.join(", ")}.`] : []),
      ...(s.materialsLocal ? [] : ["Materials are not available locally — allow extra procurement time."]),
    ],
    limitations: [
      i.dataLimitations,
      `${basis.measured} of ${basis.total} required inputs are local measurements; ${basis.assumed} are assumptions.`,
      "All outcomes are scenario estimates until measured results are verified in the Impact Ledger.",
      ...(input.ai ? ["Parts of the analysis were AI-generated and have not been independently verified."] : []),
    ],
    ai: input.ai ? { runId: input.ai.runId, summary: input.ai.summary } : undefined,
  };
}
