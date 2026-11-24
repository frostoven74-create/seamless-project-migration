import { z } from "zod";

/**
 * Contract between the Ripple Engine and the AI research step. Client-safe: no prompts, no keys.
 * The server validates model output against this schema, then the orchestrator drops anything it
 * cannot trace (unknown target codes, sources outside the register) before the user sees it.
 */
export const PROMPT_VERSION = "ripple-research/2026-11-23.1";
export const AI_MODEL = "openai/gpt-6-astra";

export const researchInput = z.object({
  categoryId: z.enum(["water", "energy", "food", "plastic", "waste"]),
  problem: z.string().trim().min(10, "Describe the problem in at least a sentence.").max(2000),
  countryName: z.string().trim().max(80),
  place: z.string().trim().max(120),
  affected: z.string().trim().max(400),
  conditions: z.string().trim().max(1500),
  resources: z.string().trim().max(800),
  budget: z.number().nonnegative().max(1e9).nullable(),
  currency: z.string().trim().max(8),
  months: z.number().min(1).max(60),
  beneficiaries: z.number().nonnegative().max(1e7).nullable(),
  infra: z.array(z.string().max(40)).max(10),
});
export type ResearchInput = z.infer<typeof researchInput>;

const short = (n: number) => z.string().trim().min(1).max(n);

export const rawBrief = z.object({
  summary: short(900),
  rootCauses: z.array(z.object({ cause: short(200), rationale: short(500), howToVerify: short(400) })).min(1).max(8),
  targets: z.array(z.object({ code: short(8), relation: z.enum(["direct", "indirect"]), rationale: short(400) })).min(1).max(12),
  interventions: z.array(z.object({ name: short(120), description: short(600), considerations: short(500), risks: short(400) })).min(1).max(5),
  measurementsNeeded: z.array(short(300)).max(10),
  uncertainties: z.array(short(300)).max(10),
  sourceIds: z.array(short(60)).max(12),
  contradictions: z.array(short(300)).max(6),
});
export type RawBrief = z.infer<typeof rawBrief>;

/** JSON Schema sent to the model (strict structured output mirrors `rawBrief`). */
const str = { type: "string" } as const;
const arr = (items: object) => ({ type: "array", items });
const obj = (props: Record<string, object>) => ({ type: "object", additionalProperties: false, required: Object.keys(props), properties: props });
export const BRIEF_JSON_SCHEMA = obj({
  summary: str,
  rootCauses: arr(obj({ cause: str, rationale: str, howToVerify: str })),
  targets: arr(obj({ code: str, relation: { type: "string", enum: ["direct", "indirect"] }, rationale: str })),
  interventions: arr(obj({ name: str, description: str, considerations: str, risks: str })),
  measurementsNeeded: arr(str),
  uncertainties: arr(str),
  sourceIds: arr(str),
  contradictions: arr(str),
});

export type SanitisedBrief = Omit<RawBrief, "contradictions"> & { checks: string[] };

/**
 * Orchestrator checks (deterministic): keep only official target codes and register sources,
 * de-duplicate, and record every intervention the system made so the user can see it.
 */
export function sanitiseBrief(raw: RawBrief, isOfficial: (code: string) => boolean, knownSources: Set<string>) {
  const droppedTargets: string[] = [];
  const seen = new Set<string>();
  const targets = raw.targets.filter((t) => {
    const code = t.code.trim().toLowerCase().replace(/^target\s*/, "");
    if (!isOfficial(code)) {
      droppedTargets.push(t.code);
      return false;
    }
    if (seen.has(code)) return false;
    seen.add(code);
    t.code = code;
    return true;
  });
  const droppedSources = raw.sourceIds.filter((id) => !knownSources.has(id));
  const sourceIds = [...new Set(raw.sourceIds.filter((id) => knownSources.has(id)))];
  const checks: string[] = [
    `Schema validated against prompt ${PROMPT_VERSION}.`,
    droppedTargets.length ? `Removed ${droppedTargets.length} target code(s) that are not in the official UN list: ${droppedTargets.join(", ")}.` : "Every target code matched the official UN list.",
    droppedSources.length ? `Removed ${droppedSources.length} source reference(s) outside the EARTH//OS register.` : "Every cited source is in the EARTH//OS source register.",
    ...raw.contradictions.map((c) => `Model flagged: ${c}`),
  ];
  if (targets.length && !targets.some((t) => t.relation === "direct")) checks.push("No target was marked direct; treat the mapping as exploratory.");
  const brief: SanitisedBrief = { ...raw, targets, sourceIds, checks };
  delete (brief as Partial<RawBrief>).contradictions;
  return { brief, droppedTargets, droppedSources };
}
