import { GatewayError, generateResponse } from "@lovable.dev/ai-gateway";
import { getRequestHeader } from "@tanstack/react-start/server";
import { GOALS, isOfficialTarget } from "@/features/sdg/sdgs";
import { SOURCES } from "@/features/sdg/sources";
import { CATEGORIES } from "@/features/ripple-engine/pilot";
import { AI_MODEL, BRIEF_JSON_SCHEMA, PROMPT_VERSION, rawBrief, sanitiseBrief, type ResearchInput, type SanitisedBrief } from "./brief";

/* Best-effort per-visitor limit (per server instance): protects the shared AI budget. */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_RUNS = 6;
const hits = new Map<string, number[]>();
export function clientKey() {
  const raw = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for") ?? "anon";
  return raw.split(",")[0]!.trim();
}

export function rateLimit(key: string, now = Date.now()) {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_RUNS) {
    hits.set(key, recent);
    return { ok: false as const, retryInMin: Math.ceil((WINDOW_MS - (now - recent[0]!)) / 60000) };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return { ok: true as const };
}

const ROLES = `You are the EARTH//OS research pipeline. You work in four roles and return ONE JSON object.
RESEARCH SPECIALIST — identify plausible root causes and, for each, how a school could verify it. Cite ONLY source ids from the SOURCE REGISTER provided; you cannot browse, so never invent studies, statistics or URLs.
SDG ANALYST — map the problem to OFFICIAL target codes from the TARGET LIST only (e.g. "6.4"). Mark "direct" only when the problem is literally what the target measures; otherwise "indirect". Explain each link in one or two sentences.
SOLUTION ARCHITECT — propose 2–4 practical interventions that respect the stated budget, time, resources and infrastructure. Describe considerations and risks. Do NOT give savings, costs or impact numbers: EARTH//OS calculates those deterministically from measured inputs.
IMPACT ANALYST — list the measurements the user must take before any estimate is trustworthy, and the main uncertainties.
Also list any contradictions or tensions you notice in the user's description (empty array if none).
Rules: no numbers that the user did not provide; no claims of verification; plain English; concise.`;

function context(input: ResearchInput) {
  const cat = CATEGORIES.find((c) => c.id === input.categoryId)!;
  const targets = GOALS.flatMap((g) => g.targets.map((t) => `${t.code}: ${t.description.slice(0, 160)}`)).join("\n");
  const sources = SOURCES.map((s) => `${s.id} — ${s.name} (${s.org}). Used for: ${s.usedFor}`).join("\n");
  return `PILOT CATEGORY: ${cat.name}
KNOWN PILOT CAUSES (EARTH//OS analysis): ${cat.causes.join("; ")}
PILOT INTERVENTIONS ALREADY MODELLED: ${cat.interventions.map((i) => i.name).join("; ")}

USER DESCRIPTION
Problem: ${input.problem}
Location: ${[input.place, input.countryName].filter(Boolean).join(", ") || "not given"}
Affected people: ${input.affected || "not given"}
Existing conditions: ${input.conditions || "not given"}
Available resources: ${input.resources || "not given"}
Budget: ${input.budget ?? "not given"} ${input.currency}
Time available: ${input.months} months
People who benefit: ${input.beneficiaries ?? "not given"}
Infrastructure available: ${input.infra.join(", ") || "none listed"}

SOURCE REGISTER (cite only these ids)
${sources}

TARGET LIST (official UN SDG targets — use only these codes)
${targets}`;
}

function outputText(res: unknown): string | null {
  const out = (res as { output?: unknown }).output;
  if (!Array.isArray(out)) return null;
  for (const item of out) {
    const content = (item as { type?: string; content?: unknown }).content;
    if ((item as { type?: string }).type === "message" && Array.isArray(content)) {
      for (const c of content) {
        const part = c as { type?: string; text?: string; refusal?: string };
        if (part.type === "output_text" && typeof part.text === "string") return part.text;
        if (part.type === "refusal") throw new Error("The model declined this request.");
      }
    }
  }
  return null;
}

export type ResearchOutcome =
  | { ok: true; brief: SanitisedBrief; droppedTargets: string[]; droppedSources: string[]; latencyMs: number; model: string; promptVersion: string }
  | { ok: false; error: string; latencyMs: number; model: string; promptVersion: string };

export async function runResearch(input: ResearchInput): Promise<ResearchOutcome> {
  const started = Date.now();
  const meta = { model: AI_MODEL, promptVersion: PROMPT_VERSION };
  try {
    const res = await generateResponse({
      model: AI_MODEL,
      instructions: ROLES,
      input: [{ role: "user", content: context(input) }],
      reasoning: { effort: "low" },
      max_output_tokens: 6000,
      text: { format: { type: "json_schema", name: "ripple_brief", schema: BRIEF_JSON_SCHEMA, strict: true } },
    });
    const text = outputText(res);
    if (!text) return { ok: false, error: "The AI returned no analysis. Try again in a moment.", latencyMs: Date.now() - started, ...meta };
    const parsed = rawBrief.safeParse(JSON.parse(text));
    if (!parsed.success) {
      console.error("ripple research: schema mismatch", parsed.error.issues.slice(0, 5));
      return { ok: false, error: "The AI answer did not match the required structure, so it was discarded.", latencyMs: Date.now() - started, ...meta };
    }
    const known = new Set(SOURCES.map((s) => s.id));
    const { brief, droppedTargets, droppedSources } = sanitiseBrief(parsed.data, isOfficialTarget, known);
    return { ok: true, brief, droppedTargets, droppedSources, latencyMs: Date.now() - started, ...meta };
  } catch (e) {
    const latencyMs = Date.now() - started;
    if (e instanceof GatewayError) {
      console.error("ripple research: gateway error", e.code, e.httpStatus, e.ids);
      const msg =
        e.code === "rate_limited"
          ? "The AI service is busy. Wait a minute and try again."
          : e.code === "payment_required"
            ? "The AI research budget for this site has run out. The pilot analysis still works without it."
            : "The AI service could not complete this request. The pilot analysis still works without it.";
      return { ok: false, error: msg, latencyMs, ...meta };
    }
    console.error("ripple research: failure", e instanceof Error ? e.message : e);
    return { ok: false, error: "The AI research step failed. The pilot analysis still works without it.", latencyMs, ...meta };
  }
}
