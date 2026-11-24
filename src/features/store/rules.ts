import type { Evidence, Milestone, MilestoneStatus, Project } from "./types";

/**
 * Verification rules. These are the heart of EARTH//OS's honesty guarantee:
 * only evidence that passed review can turn a milestone (and a leaf on the tree) "verified".
 */
export function milestoneStatus(m: Milestone, evidence: Evidence[]): MilestoneStatus {
  const ev = evidence.filter((e) => e.milestoneId === m.id);
  if (ev.length === 0) return "planned";
  if (ev.some((e) => e.status === "verified")) return "verified";
  if (ev.some((e) => e.status === "under_review")) return "under_review";
  if (ev.some((e) => e.status === "reported")) return "reported";
  return "needs_changes";
}

export function verifiedMilestones(p: Project) {
  return p.milestones.filter((m) => milestoneStatus(m, p.evidence) === "verified");
}

export function canComplete(p: Project): { ok: boolean; reason: string } {
  if (p.milestones.length === 0) return { ok: false, reason: "Add at least one milestone first." };
  const open = p.milestones.filter((m) => milestoneStatus(m, p.evidence) !== "verified");
  if (open.length > 0)
    return { ok: false, reason: `${open.length} milestone${open.length > 1 ? "s" : ""} not yet verified.` };
  return { ok: true, reason: "All milestones are supported by reviewed evidence." };
}

export const REVIEW_CHECKLIST = [
  { key: "dated", label: "Evidence is dated and the date fits the milestone" },
  { key: "method", label: "Measurement method is stated and repeatable" },
  { key: "baseline", label: "Comparable with the recorded baseline" },
  { key: "document", label: "A supporting document or photo is attached" },
  { key: "independent", label: "I am not a member of this project team" },
] as const;

/** A reviewer may only verify when every checklist item holds, including independence. */
export function canVerify(checklist: Record<string, boolean>, hasFile: boolean) {
  const all = REVIEW_CHECKLIST.every((c) => (c.key === "document" ? hasFile && checklist[c.key] : checklist[c.key]));
  return all;
}

export const EVIDENCE_LIMITS = {
  maxBytes: 2 * 1024 * 1024,
  types: ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/csv", "text/plain"],
};

export function validateEvidenceFile(file: { type: string; size: number }) {
  if (!EVIDENCE_LIMITS.types.includes(file.type)) return "Use JPG, PNG, WebP, PDF, CSV or TXT.";
  if (file.size > EVIDENCE_LIMITS.maxBytes) return "Files must be 2 MB or smaller on this device.";
  return null;
}

export const STATUS_COPY: Record<string, { label: string; meaning: string }> = {
  proposed: { label: "Proposed", meaning: "An idea or suggested intervention." },
  planned: { label: "Planned", meaning: "An intervention with an implementation plan." },
  active: { label: "Active", meaning: "Currently being implemented." },
  reported: { label: "Reported", meaning: "A result submitted by a project participant. Not verified." },
  under_review: { label: "Under review", meaning: "Evidence awaiting assessment." },
  verified: { label: "Verified", meaning: "Evidence passed the EARTH//OS review checklist." },
  completed: { label: "Completed", meaning: "Every milestone is supported by reviewed evidence." },
  needs_changes: { label: "Needs changes", meaning: "Evidence was reviewed and not accepted." },
};
