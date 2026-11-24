import { canComplete, canVerify, milestoneStatus } from "./rules";
import type { Evidence, EvidenceKind, Passport, Project, ProjectStatus, Review, StoreState } from "./types";

/**
 * Pure state transitions. Every write in the UI goes through one of these, so the honesty rules
 * (independent review, completion only after verification) are enforced in one tested place.
 */
export type Result = { ok: true; state: StoreState } | { ok: false; error: string };

const ok = (state: StoreState): Result => ({ ok: true, state });
const fail = (error: string): Result => ({ ok: false, error });

function mapProject(s: StoreState, id: string, fn: (p: Project) => Project): StoreState {
  return { ...s, projects: s.projects.map((p) => (p.id === id ? fn(p) : p)) };
}
function log(p: Project, at: string, text: string): Project {
  return { ...p, history: [...p.history, { at, text }] };
}
const norm = (x: string) => x.trim().toLowerCase();

/* ---------- passports ---------- */

export function savePassport(s: StoreState, p: Passport): StoreState {
  const exists = s.passports.some((x) => x.id === p.id);
  return { ...s, passports: exists ? s.passports.map((x) => (x.id === p.id ? p : x)) : [p, ...s.passports] };
}

export function updatePassport(s: StoreState, id: string, patch: Partial<Passport>, now: string): StoreState {
  return { ...s, passports: s.passports.map((p) => (p.id === id ? { ...p, ...patch, id: p.id, updatedAt: now } : p)) };
}

export function deletePassport(s: StoreState, id: string): StoreState {
  return {
    ...s,
    passports: s.passports.filter((p) => p.id !== id),
    projects: s.projects.map((p) => (p.passportId === id ? { ...p, passportId: undefined } : p)),
  };
}

export function duplicatePassport(s: StoreState, id: string, newId: string, now: string): Result {
  const src = s.passports.find((p) => p.id === id);
  if (!src) return fail("Passport not found.");
  const copy: Passport = { ...structuredClone(src), id: newId, createdAt: now, updatedAt: now, title: `${src.title} (copy)`, derivedFrom: src.id };
  delete copy.sample;
  return ok({ ...s, passports: [copy, ...s.passports] });
}

/**
 * Adapting a passport for a new place keeps the plan but clears every local measurement:
 * numbers measured somewhere else must never be reused as if they described the new site.
 */
export function adaptPassport(
  s: StoreState,
  id: string,
  input: { newId: string; now: string; location: Passport["location"]; measuredKeys: string[] },
): Result {
  const src = s.passports.find((p) => p.id === id);
  if (!src) return fail("Passport not found.");
  if (!input.location.place.trim() && !input.location.countryName.trim()) return fail("Give the new location a name or country.");
  const values = { ...src.values };
  for (const k of input.measuredKeys) values[k] = null;
  const copy: Passport = {
    ...structuredClone(src),
    id: input.newId,
    createdAt: input.now,
    updatedAt: input.now,
    derivedFrom: src.id,
    location: input.location,
    title: `${src.intervention.name} — ${input.location.place || input.location.countryName}`,
    values,
    baseline: { ...src.baseline, value: null },
    indicators: src.indicators.map((i) => ({ ...i, baseline: null, target: null })),
    expectedOutcomes: src.expectedOutcomes.map((o) => ({ ...o, value: null })),
    adaptation: [
      `Adapted from “${src.title}”. Local measurements were cleared — take new readings at ${input.location.place || input.location.countryName}.`,
      ...src.adaptation,
    ],
  };
  delete copy.sample;
  delete copy.ai;
  return ok({ ...s, passports: [copy, ...s.passports] });
}

/* ---------- projects ---------- */

export function projectFromPassport(p: Passport, id: string, now: string): Project {
  const goals = [...new Set(p.targets.filter((t) => t.relation === "direct").map((t) => Number(t.code.split(".")[0])))];
  for (const t of p.targets) {
    const g = Number(t.code.split(".")[0]);
    if (!goals.includes(g)) goals.push(g);
  }
  let week = 0;
  const start = new Date(now);
  const milestones = p.stages.map((st, i) => {
    week += st.weeks;
    const due = new Date(start.getTime() + week * 7 * 864e5).toISOString().slice(0, 10);
    return { id: `m${i + 1}`, title: st.name, description: st.description, due };
  });
  return {
    id,
    createdAt: now,
    passportId: p.id,
    title: p.title,
    summary: p.intervention.summary,
    categoryId: p.categoryId,
    goals: goals.slice(0, 6),
    location: p.location,
    status: "planned",
    currency: p.budget.currency,
    budgetPlanned: p.budget.estimate,
    spend: [],
    participants: [],
    baseline: { metric: p.baseline.metric, unit: p.baseline.unit, value: p.baseline.value, date: "", method: p.baseline.method },
    target: { value: p.indicators[0]?.target ?? null, date: "" },
    milestones,
    measurements: [],
    evidence: [],
    reviews: [],
    lessons: [],
    history: [{ at: now, text: `Project registered from Solution Passport “${p.title}”.` }],
  };
}

export function addProject(s: StoreState, p: Project): StoreState {
  return { ...s, projects: [p, ...s.projects] };
}

export function deleteProject(s: StoreState, id: string): StoreState {
  return { ...s, projects: s.projects.filter((p) => p.id !== id) };
}

export function updateProject(s: StoreState, id: string, patch: Partial<Pick<Project, "title" | "summary" | "baseline" | "target" | "budgetPlanned" | "goals">>, now: string): StoreState {
  return mapProject(s, id, (p) => log({ ...p, ...patch }, now, "Project details edited."));
}

export function setStatus(s: StoreState, id: string, status: ProjectStatus, now: string): Result {
  const p = s.projects.find((x) => x.id === id);
  if (!p) return fail("Project not found.");
  if (status === "completed") {
    const c = canComplete(p);
    if (!c.ok) return fail(`Cannot mark as completed: ${c.reason}`);
  }
  return ok(mapProject(s, id, (x) => log({ ...x, status }, now, `Status changed to ${status}.`)));
}

export function addMilestone(s: StoreState, id: string, m: { id: string; title: string; description: string; due: string }, now: string): Result {
  if (!m.title.trim()) return fail("Give the milestone a title.");
  return ok(mapProject(s, id, (p) => log({ ...p, milestones: [...p.milestones, m] }, now, `Milestone “${m.title}” added.`)));
}

export function addMeasurement(
  s: StoreState,
  id: string,
  m: { id: string; date: string; value: number; unit: string; method: string; milestoneId?: string | undefined; reportedBy: string },
  now: string,
): Result {
  if (!Number.isFinite(m.value)) return fail("Enter a number.");
  if (!m.date) return fail("Enter the date of the reading.");
  if (!m.method.trim()) return fail("Say how the value was measured.");
  if (m.date > now.slice(0, 10)) return fail("A reading cannot be dated in the future.");
  return ok(mapProject(s, id, (p) => log({ ...p, measurements: [...p.measurements, m].sort((a, b) => a.date.localeCompare(b.date)) }, now, `Measurement reported: ${m.value} ${m.unit} (${m.date}).`)));
}

export function addSpend(s: StoreState, id: string, e: { id: string; date: string; amount: number; note: string }, now: string): Result {
  if (!Number.isFinite(e.amount) || e.amount <= 0) return fail("Enter an amount above zero.");
  return ok(mapProject(s, id, (p) => log({ ...p, spend: [...p.spend, e] }, now, `Spend recorded: ${e.amount} ${p.currency}.`)));
}

export function addParticipant(s: StoreState, id: string, pa: { id: string; role: string; alias: string }, now: string): Result {
  if (!pa.role.trim() || !pa.alias.trim()) return fail("Enter a role and a non-identifying label.");
  return ok(mapProject(s, id, (p) => log({ ...p, participants: [...p.participants, pa] }, now, `Participant added: ${pa.role}.`)));
}

export function addLesson(s: StoreState, id: string, text: string, now: string): Result {
  if (!text.trim()) return fail("Write the lesson first.");
  return ok(mapProject(s, id, (p) => log({ ...p, lessons: [...p.lessons, text.trim()] }, now, "Lesson recorded.")));
}

export function submitEvidence(
  s: StoreState,
  id: string,
  e: { id: string; milestoneId: string; kind: EvidenceKind; title: string; date: string; description: string; file?: Evidence["file"]; submittedBy: string },
  now: string,
): Result {
  const p = s.projects.find((x) => x.id === id);
  if (!p) return fail("Project not found.");
  if (!p.milestones.some((m) => m.id === e.milestoneId)) return fail("Choose a milestone.");
  if (!e.title.trim()) return fail("Give the evidence a title.");
  if (!e.date) return fail("Enter the date the evidence was produced.");
  const ev: Evidence = { ...e, status: "reported", submittedAt: now };
  return ok(mapProject(s, id, (x) => log({ ...x, evidence: [...x.evidence, ev] }, now, `Evidence reported: “${e.title}”.`)));
}

export function requestReview(s: StoreState, id: string, evidenceId: string, now: string): Result {
  const p = s.projects.find((x) => x.id === id);
  const ev = p?.evidence.find((e) => e.id === evidenceId);
  if (!p || !ev) return fail("Evidence not found.");
  if (ev.status !== "reported" && ev.status !== "rejected") return fail("This evidence is already under review or verified.");
  return ok(
    mapProject(s, id, (x) =>
      log({ ...x, evidence: x.evidence.map((e) => (e.id === evidenceId ? { ...e, status: "under_review" } : e)) }, now, `Review requested for “${ev.title}”.`),
    ),
  );
}

/**
 * Independent review. Verification requires: evidence under review, every checklist item ticked,
 * an attached file, and a reviewer who is not a listed participant or the submitter.
 */
export function reviewEvidence(
  s: StoreState,
  id: string,
  r: { id: string; evidenceId: string; reviewer: string; decision: "verified" | "rejected"; checklist: Record<string, boolean>; note: string },
  now: string,
): Result {
  const p = s.projects.find((x) => x.id === id);
  const ev = p?.evidence.find((e) => e.id === r.evidenceId);
  if (!p || !ev) return fail("Evidence not found.");
  if (ev.status !== "under_review") return fail("Only evidence that is under review can be decided.");
  if (!r.reviewer.trim()) return fail("Enter the reviewer's role or organisation.");
  const insider = p.participants.some((pa) => norm(pa.alias) === norm(r.reviewer) || norm(pa.role) === norm(r.reviewer)) || norm(ev.submittedBy) === norm(r.reviewer);
  if (r.decision === "verified") {
    if (insider) return fail("A project participant or the submitter cannot verify their own evidence.");
    if (!canVerify(r.checklist, !!ev.file)) return fail("Every checklist item must hold, and a document must be attached, before evidence can be verified.");
  }
  if (r.decision === "rejected" && !r.note.trim()) return fail("Explain what needs to change.");
  const review: Review = { ...r, independent: !insider && !!r.checklist["independent"], at: now };
  const m = p.milestones.find((x) => x.id === ev.milestoneId);
  return ok(
    mapProject(s, id, (x) => {
      const evidence = x.evidence.map((e) => (e.id === r.evidenceId ? { ...e, status: r.decision } : e));
      const next = { ...x, evidence, reviews: [...x.reviews, review] };
      const after = m ? milestoneStatus(m, evidence) : null;
      return log(
        next,
        now,
        r.decision === "verified"
          ? `Evidence “${ev.title}” verified by ${r.reviewer}.${after === "verified" && m ? ` Milestone “${m.title}” is now verified.` : ""}`
          : `Evidence “${ev.title}” not accepted by ${r.reviewer}: ${r.note}`,
      );
    }),
  );
}

/* ---------- AI run log ---------- */
export function logAiRun(s: StoreState, run: StoreState["aiRuns"][number]): StoreState {
  return { ...s, aiRuns: [run, ...s.aiRuns].slice(0, 50) };
}

/* ---------- import / export ---------- */
export function importState(raw: unknown): Result {
  if (!raw || typeof raw !== "object") return fail("That file is not an EARTH//OS export.");
  const r = raw as Partial<StoreState>;
  if (r.version !== 1 || !Array.isArray(r.passports) || !Array.isArray(r.projects)) return fail("That file is not an EARTH//OS export (version 1).");
  return ok({ version: 1, seeded: true, passports: r.passports, projects: r.projects, aiRuns: Array.isArray(r.aiRuns) ? r.aiRuns : [] });
}
