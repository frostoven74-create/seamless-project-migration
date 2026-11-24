import { DEFAULT_SCENARIO, getCategory, sampleValues } from "@/features/ripple-engine/pilot";
import { buildPassport } from "@/features/ripple-engine/passport";
import type { Project, StoreState } from "./types";

/**
 * HYPOTHETICAL SAMPLE DATA. "Greenfield Secondary" does not exist. Every number below is
 * invented to demonstrate the workflow and is flagged `sample: true` everywhere it appears.
 */
export function makeSampleState(): StoreState {
  const water = getCategory("water")!;
  const leak = water.interventions.find((i) => i.id === "leak-repair")!;
  const location = { country: "PRT", countryName: "Portugal", place: "Greenfield Secondary (hypothetical)" };
  const passport = buildPassport({
    id: "sample-passport-water",
    now: "2026-09-01T09:00:00.000Z",
    category: water,
    intervention: leak,
    values: sampleValues(leak),
    scenario: { ...DEFAULT_SCENARIO, currency: "EUR" },
    problem: water.prompt,
    location,
    causes: water.causes.slice(0, 3),
    targets: water.targets.map((t) => ({ ...t, origin: "pilot" as const })),
    baselineValue: 18400,
    sample: true,
  });

  const project: Project = {
    id: "sample-project-water",
    createdAt: "2026-09-02T09:00:00.000Z",
    sample: true,
    passportId: passport.id,
    title: "Greenfield water leak pilot",
    summary: "Hypothetical sample: find and fix leaks, then fit aerators in the main washrooms.",
    categoryId: "water",
    goals: [6, 12, 4],
    location,
    status: "active",
    currency: "EUR",
    budgetPlanned: 1200,
    spend: [
      { id: "s1", date: "2026-09-20", amount: 180, note: "Washers, cartridges and cistern valves" },
    ],
    participants: [
      { id: "pa1", role: "Project lead", alias: "Science teacher" },
      { id: "pa2", role: "Audit team", alias: "Year 9 eco-club" },
      { id: "pa3", role: "Facilities", alias: "Caretaker" },
    ],
    baseline: { metric: "Weekly water consumption", unit: "L/week", value: 18400, date: "2026-09-14", method: "Main meter read every Monday 08:00" },
    target: { value: 14500, date: "2027-01-31" },
    milestones: [
      { id: "m1", title: "Two-week baseline recorded", description: "Daily meter readings and one night-time reading.", due: "2026-09-14" },
      { id: "m2", title: "12 leaking fixtures repaired", description: "All fixtures in the leak log repaired and re-checked.", due: "2026-10-05" },
      { id: "m3", title: "Aerators fitted to 40 taps", description: "Fit and flow-test aerators in main washrooms.", due: "2026-11-30" },
    ],
    measurements: [
      { id: "me1", date: "2026-09-07", value: 18900, unit: "L/week", method: "Main meter", milestoneId: "m1", reportedBy: "Audit team" },
      { id: "me2", date: "2026-09-14", value: 18400, unit: "L/week", method: "Main meter", milestoneId: "m1", reportedBy: "Audit team" },
      { id: "me3", date: "2026-10-12", value: 16700, unit: "L/week", method: "Main meter", milestoneId: "m2", reportedBy: "Audit team" },
      { id: "me4", date: "2026-10-19", value: 16500, unit: "L/week", method: "Main meter", milestoneId: "m2", reportedBy: "Audit team" },
    ],
    evidence: [
      { id: "e1", milestoneId: "m1", kind: "measurement_record", title: "Meter log, 1–14 Sept", date: "2026-09-14", description: "Daily readings with times, signed by the caretaker.", file: { name: "meter-log-sept.csv", type: "text/csv", size: 1840 }, status: "verified", submittedAt: "2026-09-15T10:00:00.000Z", submittedBy: "Audit team" },
      { id: "e2", milestoneId: "m2", kind: "photograph", title: "Repaired cisterns, block B", date: "2026-10-05", description: "Before/after photos of six repaired cisterns.", file: { name: "block-b-repairs.jpg", type: "image/jpeg", size: 412000 }, status: "under_review", submittedAt: "2026-10-06T10:00:00.000Z", submittedBy: "Caretaker" },
    ],
    reviews: [
      { id: "r1", evidenceId: "e1", reviewer: "Governor, finance committee (sample)", independent: true, decision: "verified", checklist: { dated: true, method: true, baseline: true, document: true, independent: true }, note: "Readings consistent and method repeatable.", at: "2026-09-18T15:00:00.000Z" },
    ],
    lessons: ["Night-time readings revealed a cistern that ran continuously."],
    history: [
      { at: "2026-09-02T09:00:00.000Z", text: "Project registered from Solution Passport." },
      { at: "2026-09-18T15:00:00.000Z", text: "Milestone “Two-week baseline recorded” verified." },
    ],
  };

  return { version: 1, seeded: true, passports: [passport], projects: [project], aiRuns: [] };
}
