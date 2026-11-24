import type { Scenario, Values } from "@/features/ripple-engine/pilot";

export type ProjectStatus = "proposed" | "planned" | "active" | "completed";
export type EvidenceStatus = "reported" | "under_review" | "verified" | "rejected";
export type MilestoneStatus = "planned" | "reported" | "under_review" | "verified" | "needs_changes";
export type EvidenceKind = "measurement_record" | "photograph" | "receipt" | "report" | "inspection" | "observation";

export type TargetRef = { code: string; relation: "direct" | "indirect"; rationale: string; origin: "pilot" | "ai" | "user" };

export type AiRun = {
  id: string;
  at: string;
  promptVersion: string;
  model: string;
  latencyMs: number;
  ok: boolean;
  droppedTargets: string[];
  droppedSources: string[];
  error?: string;
};

export type AiBrief = {
  summary: string;
  rootCauses: { cause: string; rationale: string; howToVerify: string }[];
  targets: { code: string; relation: "direct" | "indirect"; rationale: string }[];
  interventions: { name: string; description: string; considerations: string; risks: string }[];
  measurementsNeeded: string[];
  uncertainties: string[];
  sourceIds: string[];
  checks: string[];
  runId: string;
};

export type Passport = {
  id: string;
  createdAt: string;
  updatedAt: string;
  sample?: boolean;
  title: string;
  problem: string;
  location: { country: string; countryName: string; place: string };
  categoryId: string;
  interventionId: string;
  rootCauses: string[];
  targets: TargetRef[];
  research: { sourceId: string; note: string }[];
  baseline: { description: string; metric: string; unit: string; value: number | null; method: string };
  intervention: { name: string; summary: string };
  values: Values;
  scenario: Scenario;
  expectedOutcomes: { label: string; value: number | null; unit: string; formula: string; nature: "calculated" | "target" }[];
  unintended: string[];
  resources: string[];
  materials: string[];
  budget: { estimate: number | null; currency: string; assumptions: string[] };
  stages: { name: string; weeks: number; description: string }[];
  stakeholders: string[];
  risks: { risk: string; mitigation: string }[];
  indicators: { name: string; unit: string; method: string; baseline: number | null; target: number | null }[];
  evidencePlan: string[];
  monitoring: string;
  maintenance: string;
  adaptation: string[];
  limitations: string[];
  ai?: { runId: string; summary: string } | undefined;
  derivedFrom?: string | undefined;
};

export type Milestone = { id: string; title: string; description: string; due: string };

export type Measurement = {
  id: string;
  date: string;
  value: number;
  unit: string;
  method: string;
  milestoneId?: string | undefined;
  reportedBy: string;
};

export type Evidence = {
  id: string;
  milestoneId: string;
  kind: EvidenceKind;
  title: string;
  date: string;
  description: string;
  file?: { name: string; type: string; size: number; dataUrl?: string | undefined } | undefined;
  status: EvidenceStatus;
  submittedAt: string;
  submittedBy: string;
};

export type Review = {
  id: string;
  evidenceId: string;
  reviewer: string;
  independent: boolean;
  decision: "verified" | "rejected";
  checklist: Record<string, boolean>;
  note: string;
  at: string;
};

export type Project = {
  id: string;
  createdAt: string;
  sample?: boolean;
  passportId?: string | undefined;
  title: string;
  summary: string;
  categoryId: string;
  goals: number[];
  location: { country: string; countryName: string; place: string };
  status: ProjectStatus;
  currency: string;
  budgetPlanned: number | null;
  spend: { id: string; date: string; amount: number; note: string }[];
  participants: { id: string; role: string; alias: string }[];
  baseline: { metric: string; unit: string; value: number | null; date: string; method: string };
  target: { value: number | null; date: string };
  milestones: Milestone[];
  measurements: Measurement[];
  evidence: Evidence[];
  reviews: Review[];
  lessons: string[];
  history: { at: string; text: string }[];
};

export type StoreState = {
  version: 1;
  seeded: boolean;
  passports: Passport[];
  projects: Project[];
  aiRuns: AiRun[];
};
