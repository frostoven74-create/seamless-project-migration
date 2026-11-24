/**
 * School Resource Intelligence — the EARTH//OS pilot knowledge base.
 * Root causes, intervention descriptions and SDG mappings are EARTH//OS analysis.
 * No savings figure is hard-coded: every number is calculated from inputs the user provides
 * (or clearly labelled hypothetical sample values / referenced defaults they can replace).
 */
import { relatedGoals } from "@/features/sdg/sdgs";

export type ParamKind = "measured" | "assumption" | "price" | "plan" | "target";
export type Param = {
  key: string;
  label: string;
  unit: string;
  kind: ParamKind;
  /** Quantity that grows with implementation scale. */
  scalable?: boolean;
  /** Hypothetical sample value for the demo school (labelled as such in the UI). */
  sample?: number;
  /** Referenced default the user may keep or replace. */
  reference?: { value: number; sourceId: string; note: string };
  optional?: boolean;
  help?: string;
};

export type Infra = "water-meter" | "electricity-submeter" | "roof-access" | "outdoor-space" | "potable-supply";
export const INFRA_LABELS: Record<Infra, string> = {
  "water-meter": "Water meter that can be read",
  "electricity-submeter": "Electricity meter or sub-meter",
  "roof-access": "Safe roof access and structural sign-off",
  "outdoor-space": "Outdoor space for bins or compost",
  "potable-supply": "Tested potable water supply",
};

export type Scenario = {
  budget: number | null;
  currency: string;
  months: number;
  beneficiaries: number | null;
  scalePct: number;
  materialsLocal: boolean;
  infra: Infra[];
};

export type Effect = { goal: number; kind: "positive" | "negative" | "trade-off" | "uncertain"; note: string };

export type Output = {
  label: string;
  value: number | null;
  unit: string;
  formula: string;
  missing: string[];
  /** "target" outputs restate a user goal; they are not predictions. */
  nature: "calculated" | "target";
};

export type Values = Record<string, number | null | undefined>;

export type Intervention = {
  id: string;
  name: string;
  summary: string;
  params: Param[];
  requires: Infra[];
  complexity: 1 | 2 | 3;
  weeks: [number, number];
  maintenance: string;
  resources: string[];
  materials: string[];
  risks: { risk: string; mitigation: string }[];
  effects: Effect[];
  implications: { environmental: string; social: string; economic: string };
  dataLimitations: string;
  indicators: { name: string; unit: string; method: string }[];
  stages: { name: string; weeks: number; description: string }[];
  compute: (v: Values, s: Scenario) => Output[];
  cost: (v: Values, s: Scenario) => { value: number | null; formula: string; missing: string[] };
};

export type Category = {
  id: "water" | "energy" | "food" | "plastic" | "waste";
  name: string;
  prompt: string;
  causes: string[];
  targets: { code: string; relation: "direct" | "indirect"; rationale: string }[];
  sources: string[];
  baselineMetric: { name: string; unit: string; method: string };
  interventions: Intervention[];
};

/* ---------- calculation helpers (pure, tested) ---------- */

export function effective(p: Param, v: Values, s: Scenario): number | null {
  const raw = v[p.key];
  const base = raw === undefined || raw === null || Number.isNaN(raw) ? null : raw;
  if (base === null) return null;
  return p.scalable ? (base * s.scalePct) / 100 : base;
}

function grab(params: Param[], v: Values, s: Scenario, keys: string[]) {
  const out: Record<string, number> = {};
  const missing: string[] = [];
  for (const k of keys) {
    const p = params.find((x) => x.key === k);
    if (!p) continue;
    const val = effective(p, v, s);
    if (val === null) missing.push(p.label);
    else out[k] = val;
  }
  return { n: out, missing };
}

/** Calendar days in the scenario window (continuous effects such as leaks). */
export function calendarDays(s: Scenario) {
  return Math.round(s.months * 30.44);
}
/** Share of a school year inside the scenario window. */
export function yearShare(s: Scenario) {
  return s.months / 12;
}

function out(
  params: Param[],
  v: Values,
  s: Scenario,
  keys: string[],
  label: string,
  unit: string,
  formula: string,
  fn: (n: Record<string, number>) => number,
  nature: Output["nature"] = "calculated",
): Output {
  const { n, missing } = grab(params, v, s, keys);
  return { label, unit, formula, missing, nature, value: missing.length ? null : fn(n) };
}

function money(
  params: Param[],
  v: Values,
  s: Scenario,
  keys: string[],
  formula: string,
  fn: (n: Record<string, number>) => number,
) {
  const { n, missing } = grab(params, v, s, keys);
  return { value: missing.length ? null : fn(n), formula, missing };
}

const P = {
  schoolDays: (sample = 200): Param => ({
    key: "schoolDays",
    label: "School days per year",
    unit: "days",
    kind: "plan",
    sample,
    help: "From your school calendar.",
  }),
  tariff: (unit: string): Param => ({
    key: "tariff",
    label: `Tariff per ${unit}`,
    unit: `currency/${unit}`,
    kind: "price",
    optional: true,
    help: "From your utility bill. Leave empty to skip the cost-saving line.",
  }),
};

/* ---------- WATER ---------- */

const leakRepair: Intervention = (() => {
  const params: Param[] = [
    { key: "fixtures", label: "Leaking fixtures found", unit: "fixtures", kind: "measured", sample: 12, help: "Count during a fixture-by-fixture walk-through." },
    {
      key: "leakLpd",
      label: "Average leak per fixture",
      unit: "L/day",
      kind: "assumption",
      reference: { value: 31, sourceId: "epa-watersense", note: "≈ one drip per second (EPA WaterSense: more than 3,000 US gal/year)." },
      sample: 31,
      help: "Better: hold a jug under the leak for 10 minutes and scale up.",
    },
    { key: "repairEach", label: "Repair cost per fixture", unit: "currency", kind: "price", sample: 15 },
    { ...P.tariff("kL"), sample: 1.8 },
  ];
  return {
    id: "leak-repair",
    name: "Find and fix leaks",
    summary: "A structured leak walk-through, followed by washer, valve and cistern repairs.",
    params,
    requires: [],
    complexity: 1,
    weeks: [1, 3],
    maintenance: "Monthly leak check by a student team; night-time meter reading to detect hidden leaks.",
    resources: ["Caretaker or plumber time", "Student audit team", "Leak log sheet"],
    materials: ["Washers and cartridges", "Cistern valves", "Jug and timer for measurement"],
    risks: [
      { risk: "Hidden underground leaks are missed", mitigation: "Compare night-time meter readings with zero-use expectation." },
      { risk: "Repairs fail within weeks", mitigation: "Log each repair and re-check after 30 days." },
    ],
    effects: [
      { goal: 6, kind: "positive", note: "Directly improves water-use efficiency (6.4)." },
      { goal: 12, kind: "positive", note: "Reduces wasted natural resources (12.2)." },
      { goal: 4, kind: "positive", note: "Students learn measurement through the audit (4.7)." },
      { goal: 9, kind: "positive", note: "Extends life of existing water infrastructure." },
    ],
    implications: {
      environmental: "Less treated water drawn from local supply; lower pumping energy.",
      social: "Visible, quick win that builds trust for larger projects.",
      economic: "Low upfront cost; savings depend on your tariff.",
    },
    dataLimitations: "Leak rates vary widely. Without a jug-and-timer measurement the saving is only an order of magnitude.",
    indicators: [
      { name: "Weekly water consumption", unit: "L/week", method: "Meter reading at the same time each week" },
      { name: "Leaking fixtures", unit: "count", method: "Monthly walk-through log" },
    ],
    stages: [
      { name: "Baseline", weeks: 2, description: "Read the meter daily for two weeks, including one night-time reading." },
      { name: "Audit", weeks: 1, description: "Walk every fixture, log and measure leaks." },
      { name: "Repair", weeks: 1, description: "Fix logged leaks, starting with the largest." },
      { name: "Verify", weeks: 4, description: "Repeat meter readings and re-check repaired fixtures." },
    ],
    compute: (v, s) => [
      out(params, v, s, ["fixtures", "leakLpd"], "Water no longer lost", "L", "fixtures × leak per fixture × calendar days", (n) => n["fixtures"]! * n["leakLpd"]! * calendarDays(s)),
      out(params, v, s, ["fixtures", "leakLpd", "tariff"], "Avoided water cost", s.currency, "water saved ÷ 1,000 × tariff", (n) => ((n["fixtures"]! * n["leakLpd"]! * calendarDays(s)) / 1000) * n["tariff"]!),
    ],
    cost: (v, s) => money(params, v, s, ["fixtures", "repairEach"], "fixtures × repair cost", (n) => n["fixtures"]! * n["repairEach"]!),
  };
})();

const aerators: Intervention = (() => {
  const params: Param[] = [
    { key: "taps", label: "Taps to fit", unit: "taps", kind: "plan", scalable: true, sample: 40 },
    { key: "flowNow", label: "Current flow rate", unit: "L/min", kind: "measured", sample: 9, help: "Time how long a tap takes to fill a 1 L jug." },
    { key: "flowRated", label: "Aerator rated flow", unit: "L/min", kind: "assumption", sample: 5, help: "From the product specification. Keep handwashing comfortable." },
    { key: "minutes", label: "Running minutes per tap per day", unit: "min", kind: "measured", sample: 12 },
    P.schoolDays(),
    { key: "unitPrice", label: "Price per aerator (fitted)", unit: "currency", kind: "price", sample: 6 },
  ];
  return {
    id: "aerators",
    name: "Low-flow tap aerators",
    summary: "Fit flow-restricting aerators to washroom and classroom taps.",
    params,
    requires: [],
    complexity: 1,
    weeks: [1, 2],
    maintenance: "Clean or descale aerators every term; replace damaged units.",
    resources: ["Caretaker time"],
    materials: ["Aerators matched to tap threads", "Descaling solution"],
    risks: [
      { risk: "Flow too low for effective handwashing", mitigation: "Test with users; keep rated flow at a comfortable level." },
      { risk: "Aerators removed or vandalised", mitigation: "Use anti-tamper models in high-traffic washrooms." },
    ],
    effects: [
      { goal: 6, kind: "positive", note: "Reduces water use per handwash (6.4)." },
      { goal: 3, kind: "trade-off", note: "Hygiene must not suffer; too little flow discourages handwashing." },
      { goal: 12, kind: "positive", note: "Resource efficiency (12.2)." },
    ],
    implications: {
      environmental: "Lower water and, for hot taps, energy use.",
      social: "Usually unnoticed if flow is chosen well.",
      economic: "Very low cost per tap.",
    },
    dataLimitations: "Running minutes per tap are rarely known; a one-day observation is a better input than a guess.",
    indicators: [
      { name: "Weekly water consumption", unit: "L/week", method: "Meter reading" },
      { name: "Tap flow rate", unit: "L/min", method: "Jug-and-timer test on a sample of taps" },
    ],
    stages: [
      { name: "Baseline", weeks: 2, description: "Meter readings and flow tests on sampled taps." },
      { name: "Install", weeks: 1, description: "Fit aerators and re-test flow." },
      { name: "Verify", weeks: 4, description: "Compare meter readings; survey users on comfort." },
    ],
    compute: (v, s) => [
      out(params, v, s, ["taps", "flowNow", "flowRated", "minutes", "schoolDays"], "Water reduction", "L", "taps × (current − rated flow) × minutes × school days × (months ÷ 12)", (n) => n["taps"]! * Math.max(0, n["flowNow"]! - n["flowRated"]!) * n["minutes"]! * n["schoolDays"]! * yearShare(s)),
    ],
    cost: (v, s) => money(params, v, s, ["taps", "unitPrice"], "taps × price per aerator", (n) => n["taps"]! * n["unitPrice"]!),
  };
})();

const waterAudit: Intervention = (() => {
  const params: Param[] = [
    { key: "meters", label: "Sub-meters to install", unit: "meters", kind: "plan", scalable: true, sample: 3 },
    { key: "meterPrice", label: "Price per sub-meter (fitted)", unit: "currency", kind: "price", sample: 120 },
  ];
  return {
    id: "water-audit",
    name: "Sub-metering and student water audit",
    summary: "Install sub-meters on main zones and run a recurring student-led audit.",
    params,
    requires: [],
    complexity: 2,
    weeks: [3, 6],
    maintenance: "Weekly readings logged by students; annual meter check.",
    resources: ["Plumber for installation", "Teacher lead", "Student audit team"],
    materials: ["Sub-meters", "Reading log or spreadsheet"],
    risks: [{ risk: "Readings lapse after the first term", mitigation: "Build readings into a class timetable." }],
    effects: [
      { goal: 6, kind: "positive", note: "Creates the data needed to manage water (6.4)." },
      { goal: 4, kind: "positive", note: "Education for sustainable development (4.7)." },
      { goal: 17, kind: "uncertain", note: "Data could be shared with the local utility." },
    ],
    implications: {
      environmental: "No direct saving — it makes every other intervention measurable.",
      social: "Gives students ownership of the problem.",
      economic: "Moderate upfront cost.",
    },
    dataLimitations: "This intervention produces a baseline; EARTH//OS does not estimate a saving for it.",
    indicators: [{ name: "Zone consumption", unit: "L/week per zone", method: "Sub-meter readings" }],
    stages: [
      { name: "Install", weeks: 2, description: "Fit sub-meters on washrooms, kitchen and grounds." },
      { name: "Train", weeks: 1, description: "Train the audit team on reading and logging." },
      { name: "Run", weeks: 8, description: "Weekly readings and monthly review." },
    ],
    compute: () => [
      { label: "Water saving", value: null, unit: "L", formula: "Not estimated — this intervention creates the measurement baseline.", missing: [], nature: "calculated" },
    ],
    cost: (v, s) => money(params, v, s, ["meters", "meterPrice"], "meters × price per meter", (n) => n["meters"]! * n["meterPrice"]!),
  };
})();

const rainwater: Intervention = (() => {
  const params: Param[] = [
    { key: "roofArea", label: "Connected roof area", unit: "m²", kind: "measured", scalable: true, sample: 400 },
    { key: "rainfall", label: "Annual rainfall", unit: "mm/year", kind: "measured", sample: 800, help: "From your national meteorological service." },
    { key: "runoff", label: "Runoff coefficient", unit: "0–1", kind: "assumption", sample: 0.8, help: "Share of rain that reaches the tank; depends on roof material." },
    { key: "systemCost", label: "Tank, gutters and installation", unit: "currency", kind: "price", scalable: true, sample: 2500 },
  ];
  return {
    id: "rainwater",
    name: "Rainwater harvesting for non-potable use",
    summary: "Collect roof runoff for toilet flushing and grounds irrigation.",
    params,
    requires: ["roof-access", "outdoor-space"],
    complexity: 3,
    weeks: [6, 12],
    maintenance: "Clean gutters and first-flush diverters each term; keep tanks sealed.",
    resources: ["Contractor", "Structural or site assessment", "Caretaker"],
    materials: ["Tank", "Gutters and downpipes", "First-flush diverter", "Mesh screens"],
    risks: [
      { risk: "Mosquito breeding in open water", mitigation: "Sealed tanks and mesh screens." },
      { risk: "Cross-connection with drinking water", mitigation: "Separate, labelled pipework; non-potable only." },
    ],
    effects: [
      { goal: 6, kind: "positive", note: "Reduces mains demand (6.4)." },
      { goal: 3, kind: "trade-off", note: "Poorly maintained tanks can create health risks." },
      { goal: 11, kind: "positive", note: "Reduces stormwater runoff." },
      { goal: 13, kind: "positive", note: "Builds resilience to supply interruptions (13.1)." },
    ],
    implications: {
      environmental: "Reduces mains abstraction and runoff.",
      social: "Visible infrastructure useful for teaching.",
      economic: "Highest upfront cost of the water options.",
    },
    dataLimitations: "Potential yield is an upper bound: actual use depends on tank size and demand timing.",
    indicators: [{ name: "Harvested water used", unit: "L/month", method: "Meter on tank outlet" }],
    stages: [
      { name: "Assess", weeks: 2, description: "Roof, gutters and site assessment." },
      { name: "Design and procure", weeks: 4, description: "Size the tank and obtain quotes." },
      { name: "Install", weeks: 2, description: "Install with separate non-potable plumbing." },
      { name: "Monitor", weeks: 8, description: "Track tank outlet meter." },
    ],
    compute: (v, s) => [
      out(params, v, s, ["roofArea", "rainfall", "runoff"], "Potential harvest (upper bound)", "L", "roof area × rainfall × runoff × (months ÷ 12)", (n) => n["roofArea"]! * n["rainfall"]! * n["runoff"]! * yearShare(s)),
    ],
    cost: (v, s) => money(params, v, s, ["systemCost"], "tank, gutters and installation", (n) => n["systemCost"]!),
  };
})();

/* ---------- ENERGY ---------- */

const led: Intervention = (() => {
  const params: Param[] = [
    { key: "fittings", label: "Fittings to replace", unit: "fittings", kind: "plan", scalable: true, sample: 120 },
    { key: "wOld", label: "Existing lamp power", unit: "W", kind: "measured", sample: 58, help: "Read from the lamp label." },
    { key: "wNew", label: "LED replacement power", unit: "W", kind: "assumption", sample: 24, help: "From the product specification." },
    { key: "hours", label: "Lighting hours per day", unit: "h", kind: "measured", sample: 7 },
    P.schoolDays(),
    { key: "unitPrice", label: "Price per fitting (installed)", unit: "currency", kind: "price", sample: 22 },
    { ...P.tariff("kWh"), sample: 0.15 },
    { key: "gridFactor", label: "Grid emission factor", unit: "kg CO₂/kWh", kind: "assumption", optional: true, help: "From your national grid operator. Left empty, no emissions figure is shown." },
  ];
  const kwh = (n: Record<string, number>, s: Scenario) => (n["fittings"]! * (n["wOld"]! - n["wNew"]!) * n["hours"]! * n["schoolDays"]! * yearShare(s)) / 1000;
  return {
    id: "led",
    name: "LED lighting retrofit",
    summary: "Replace fluorescent or halogen lamps with LED equivalents.",
    params,
    requires: [],
    complexity: 2,
    weeks: [2, 6],
    maintenance: "Minimal; LEDs last longer than fluorescent tubes.",
    resources: ["Electrician", "Lighting survey"],
    materials: ["LED lamps or fittings", "Disposal route for old tubes"],
    risks: [
      { risk: "Old fluorescent tubes contain mercury", mitigation: "Use a certified hazardous-waste route." },
      { risk: "Poor light quality in classrooms", mitigation: "Specify adequate lux levels and colour rendering." },
    ],
    effects: [
      { goal: 7, kind: "positive", note: "Energy efficiency (7.3)." },
      { goal: 13, kind: "positive", note: "Lower emissions where the grid is fossil-based." },
      { goal: 12, kind: "trade-off", note: "Disposal of old tubes must be managed (12.4)." },
      { goal: 4, kind: "positive", note: "Better lighting can support learning environments (4.a)." },
    ],
    implications: {
      environmental: "Lower electricity use; hazardous waste from old tubes.",
      social: "Improved classroom lighting.",
      economic: "Moderate upfront cost with ongoing savings.",
    },
    dataLimitations: "Hours of use are often over-estimated; a week of observation improves the result.",
    indicators: [{ name: "Monthly electricity use", unit: "kWh/month", method: "Utility bill or sub-meter" }],
    stages: [
      { name: "Survey", weeks: 1, description: "Count fittings and record lamp power." },
      { name: "Procure", weeks: 2, description: "Obtain quotes; check lux requirements." },
      { name: "Install", weeks: 2, description: "Replace lamps; dispose of old tubes safely." },
      { name: "Verify", weeks: 8, description: "Compare monthly consumption." },
    ],
    compute: (v, s) => [
      out(params, v, s, ["fittings", "wOld", "wNew", "hours", "schoolDays"], "Electricity reduction", "kWh", "fittings × (old W − new W) × hours × school days × (months ÷ 12) ÷ 1,000", (n) => kwh(n, s)),
      out(params, v, s, ["fittings", "wOld", "wNew", "hours", "schoolDays", "tariff"], "Avoided electricity cost", s.currency, "kWh saved × tariff", (n) => kwh(n, s) * n["tariff"]!),
      out(params, v, s, ["fittings", "wOld", "wNew", "hours", "schoolDays", "gridFactor"], "Avoided emissions", "kg CO₂", "kWh saved × grid emission factor", (n) => kwh(n, s) * n["gridFactor"]!),
    ],
    cost: (v, s) => money(params, v, s, ["fittings", "unitPrice"], "fittings × installed price", (n) => n["fittings"]! * n["unitPrice"]!),
  };
})();

const switchOff: Intervention = (() => {
  const params: Param[] = [
    { key: "idleKw", label: "Load left on outside lessons", unit: "kW", kind: "measured", sample: 4, help: "Read the meter after hours, or sum nameplate ratings." },
    { key: "hoursCut", label: "Hours of idle load removed per day", unit: "h", kind: "plan", sample: 3 },
    P.schoolDays(),
    { key: "kitCost", label: "Timers, signage and plugs", unit: "currency", kind: "price", sample: 150 },
    { ...P.tariff("kWh"), sample: 0.15 },
  ];
  return {
    id: "switch-off",
    name: "Switch-off routine and timers",
    summary: "Student energy monitors, end-of-day switch-off routine and timers on idle equipment.",
    params,
    requires: ["electricity-submeter"],
    complexity: 1,
    weeks: [1, 3],
    maintenance: "Rotating student monitors; termly refresh of the campaign.",
    resources: ["Teacher lead", "Student monitors"],
    materials: ["Plug-in timers", "Signage"],
    risks: [{ risk: "Behaviour change fades", mitigation: "Publish weekly meter readings to the school." }],
    effects: [
      { goal: 7, kind: "positive", note: "Energy efficiency (7.3)." },
      { goal: 4, kind: "positive", note: "Climate education (13.3, 4.7)." },
      { goal: 13, kind: "positive", note: "Lower emissions where the grid is fossil-based." },
    ],
    implications: {
      environmental: "Lower base load.",
      social: "Student leadership role.",
      economic: "Very low cost.",
    },
    dataLimitations: "Needs an after-hours meter reading to know the idle load.",
    indicators: [{ name: "After-hours load", unit: "kW", method: "Meter reading at 19:00" }],
    stages: [
      { name: "Baseline", weeks: 2, description: "After-hours meter readings." },
      { name: "Launch", weeks: 1, description: "Recruit monitors; fit timers." },
      { name: "Run", weeks: 8, description: "Weekly readings published to the school." },
    ],
    compute: (v, s) => [
      out(params, v, s, ["idleKw", "hoursCut", "schoolDays"], "Electricity reduction", "kWh", "idle kW × hours removed × school days × (months ÷ 12)", (n) => n["idleKw"]! * n["hoursCut"]! * n["schoolDays"]! * yearShare(s)),
      out(params, v, s, ["idleKw", "hoursCut", "schoolDays", "tariff"], "Avoided electricity cost", s.currency, "kWh saved × tariff", (n) => n["idleKw"]! * n["hoursCut"]! * n["schoolDays"]! * yearShare(s) * n["tariff"]!),
    ],
    cost: (v, s) => money(params, v, s, ["kitCost"], "timers, signage and plugs", (n) => n["kitCost"]!),
  };
})();

const solar: Intervention = (() => {
  const params: Param[] = [
    { key: "kwp", label: "System size", unit: "kWp", kind: "plan", scalable: true, sample: 20 },
    { key: "yield", label: "Specific yield", unit: "kWh/kWp/year", kind: "measured", sample: 1400, help: "Look up your site on the Global Solar Atlas." },
    { key: "costKwp", label: "Installed cost per kWp", unit: "currency", kind: "price", sample: 900 },
    { ...P.tariff("kWh"), sample: 0.15 },
  ];
  return {
    id: "solar",
    name: "Rooftop solar PV",
    summary: "Install a grid-tied photovoltaic system on a suitable roof.",
    params,
    requires: ["roof-access"],
    complexity: 3,
    weeks: [8, 20],
    maintenance: "Panel cleaning; inverter monitoring; inverter replacement during system life.",
    resources: ["Accredited installer", "Structural engineer", "Utility connection approval"],
    materials: ["Panels", "Inverter", "Mounting", "Monitoring"],
    risks: [
      { risk: "Roof cannot carry the load", mitigation: "Structural survey before procurement." },
      { risk: "Grid connection delays", mitigation: "Apply to the utility early." },
    ],
    effects: [
      { goal: 7, kind: "positive", note: "Renewable share (7.2)." },
      { goal: 13, kind: "positive", note: "Lower emissions where the grid is fossil-based." },
      { goal: 12, kind: "trade-off", note: "End-of-life panel recycling must be planned." },
      { goal: 9, kind: "positive", note: "Upgrades infrastructure (9.4)." },
    ],
    implications: {
      environmental: "Displaces grid electricity over decades.",
      social: "Visible teaching asset.",
      economic: "High upfront cost; financing or partnerships often needed (17).",
    },
    dataLimitations: "Specific yield is a modelled average; shading and orientation change real output.",
    indicators: [{ name: "Solar generation", unit: "kWh/month", method: "Inverter monitoring" }],
    stages: [
      { name: "Feasibility", weeks: 3, description: "Structural survey, yield lookup and utility rules." },
      { name: "Procure", weeks: 6, description: "Tender and contract." },
      { name: "Install", weeks: 3, description: "Install and commission." },
      { name: "Monitor", weeks: 12, description: "Monthly generation log." },
    ],
    compute: (v, s) => [
      out(params, v, s, ["kwp", "yield"], "Expected generation", "kWh", "kWp × specific yield × (months ÷ 12)", (n) => n["kwp"]! * n["yield"]! * yearShare(s)),
      out(params, v, s, ["kwp", "yield", "tariff"], "Avoided electricity cost", s.currency, "generation × tariff", (n) => n["kwp"]! * n["yield"]! * yearShare(s) * n["tariff"]!),
    ],
    cost: (v, s) => money(params, v, s, ["kwp", "costKwp"], "kWp × installed cost per kWp", (n) => n["kwp"]! * n["costKwp"]!),
  };
})();

/* ---------- FOOD ---------- */

const plateAudit: Intervention = (() => {
  const params: Param[] = [
    { key: "kgDay", label: "Plate waste per day (weighed)", unit: "kg/day", kind: "measured", sample: 35 },
    { key: "targetPct", label: "Reduction target", unit: "%", kind: "target", sample: 25, help: "Your goal — not a prediction." },
    P.schoolDays(190),
    { key: "scaleCost", label: "Scales and bins", unit: "currency", kind: "price", sample: 80 },
  ];
  return {
    id: "plate-audit",
    name: "Plate-waste audit and menu adjustment",
    summary: "Weigh plate waste daily, find the most-wasted dishes and adjust portions and menus with kitchen staff.",
    params,
    requires: [],
    complexity: 2,
    weeks: [2, 8],
    maintenance: "Weekly weigh-ins; termly menu review.",
    resources: ["Kitchen staff", "Student audit team", "Teacher lead"],
    materials: ["Scales", "Separate waste bins", "Log sheet"],
    risks: [{ risk: "Portion cuts leave children hungry", mitigation: "Offer second helpings; adjust by dish, not across the board." }],
    effects: [
      { goal: 12, kind: "positive", note: "Food waste reduction (12.3)." },
      { goal: 2, kind: "positive", note: "Better use of food (2.1)." },
      { goal: 3, kind: "trade-off", note: "Nutrition must be protected when portions change." },
      { goal: 13, kind: "positive", note: "Less food waste reduces associated emissions." },
    ],
    implications: {
      environmental: "Less food production and disposal impact.",
      social: "Engages pupils with food and nutrition.",
      economic: "Can lower food purchasing costs.",
    },
    dataLimitations: "The output is your target restated in kilograms. Real results come from continued weighing.",
    indicators: [{ name: "Plate waste", unit: "kg/day", method: "Daily weighing after lunch" }],
    stages: [
      { name: "Baseline", weeks: 2, description: "Weigh plate waste every day." },
      { name: "Analyse", weeks: 1, description: "Identify most-wasted dishes with kitchen staff." },
      { name: "Adjust", weeks: 4, description: "Change portions, menus and serving." },
      { name: "Verify", weeks: 4, description: "Continue weighing and compare." },
    ],
    compute: (v, s) => [
      out(params, v, s, ["kgDay", "targetPct", "schoolDays"], "Food waste avoided if target is met", "kg", "kg per day × target % × school days × (months ÷ 12)", (n) => n["kgDay"]! * (n["targetPct"]! / 100) * n["schoolDays"]! * yearShare(s), "target"),
    ],
    cost: (v, s) => money(params, v, s, ["scaleCost"], "scales and bins", (n) => n["scaleCost"]!),
  };
})();

const compost: Intervention = (() => {
  const params: Param[] = [
    { key: "kgCompost", label: "Compostable waste per day", unit: "kg/day", kind: "measured", scalable: true, sample: 20 },
    P.schoolDays(190),
    { key: "bins", label: "Compost bins", unit: "bins", kind: "plan", scalable: true, sample: 4 },
    { key: "binPrice", label: "Price per bin", unit: "currency", kind: "price", sample: 90 },
  ];
  return {
    id: "compost",
    name: "On-site composting",
    summary: "Compost kitchen and plate waste for the school garden.",
    params,
    requires: ["outdoor-space"],
    complexity: 2,
    weeks: [2, 4],
    maintenance: "Turn piles weekly; balance green and brown material.",
    resources: ["Garden club", "Caretaker"],
    materials: ["Compost bins", "Brown material (leaves, cardboard)", "Thermometer"],
    risks: [{ risk: "Odour and pests", mitigation: "Exclude meat and dairy; keep bins closed; turn regularly." }],
    effects: [
      { goal: 12, kind: "positive", note: "Reduces waste sent to disposal (12.5)." },
      { goal: 15, kind: "positive", note: "Improves soil in school grounds." },
      { goal: 3, kind: "trade-off", note: "Poor management attracts pests." },
      { goal: 4, kind: "positive", note: "Hands-on science learning (4.7)." },
    ],
    implications: {
      environmental: "Diverts organics from landfill.",
      social: "Garden-based learning.",
      economic: "Can reduce waste collection costs.",
    },
    dataLimitations: "Diverted weight is what goes into the bins; it is not a methane estimate.",
    indicators: [{ name: "Waste composted", unit: "kg/week", method: "Weigh caddies before emptying" }],
    stages: [
      { name: "Site", weeks: 1, description: "Choose location; agree hygiene rules." },
      { name: "Set up", weeks: 1, description: "Install bins; train the garden club." },
      { name: "Run", weeks: 8, description: "Weekly weighing and turning." },
    ],
    compute: (v, s) => [
      out(params, v, s, ["kgCompost", "schoolDays"], "Organic waste diverted", "kg", "compostable kg per day × school days × (months ÷ 12)", (n) => n["kgCompost"]! * n["schoolDays"]! * yearShare(s)),
    ],
    cost: (v, s) => money(params, v, s, ["bins", "binPrice"], "bins × price per bin", (n) => n["bins"]! * n["binPrice"]!),
  };
})();

const shareTable: Intervention = (() => {
  const params: Param[] = [
    { key: "kgSurplus", label: "Untouched surplus food per day", unit: "kg/day", kind: "measured", sample: 6 },
    P.schoolDays(190),
    { key: "setupCost", label: "Cool box and signage", unit: "currency", kind: "price", sample: 60 },
  ];
  return {
    id: "share-table",
    name: "Share table and surplus redistribution",
    summary: "Untouched, packaged food is shared or redistributed through a local food partner.",
    params,
    requires: [],
    complexity: 2,
    weeks: [2, 6],
    maintenance: "Daily temperature log; partner pick-up schedule.",
    resources: ["Kitchen staff", "Local food redistribution partner"],
    materials: ["Cool box", "Temperature log"],
    risks: [{ risk: "Food safety breaches", mitigation: "Check local food-safety rules; only sealed or whole items." }],
    effects: [
      { goal: 2, kind: "positive", note: "Surplus food reaches people (2.1)." },
      { goal: 12, kind: "positive", note: "Food waste reduction (12.3)." },
      { goal: 3, kind: "trade-off", note: "Food safety rules must be followed." },
      { goal: 17, kind: "positive", note: "Local partnership (17.17)." },
    ],
    implications: {
      environmental: "Food eaten rather than discarded.",
      social: "Supports food-insecure families when done discreetly.",
      economic: "Low cost.",
    },
    dataLimitations: "Regulations differ by country; EARTH//OS does not check local law.",
    indicators: [{ name: "Food redistributed", unit: "kg/week", method: "Weigh before pick-up" }],
    stages: [
      { name: "Rules", weeks: 2, description: "Confirm food-safety rules and find a partner." },
      { name: "Launch", weeks: 1, description: "Set up the table and log." },
      { name: "Run", weeks: 8, description: "Weekly weights and review." },
    ],
    compute: (v, s) => [
      out(params, v, s, ["kgSurplus", "schoolDays"], "Surplus food redistributed", "kg", "surplus kg per day × school days × (months ÷ 12)", (n) => n["kgSurplus"]! * n["schoolDays"]! * yearShare(s)),
    ],
    cost: (v, s) => money(params, v, s, ["setupCost"], "cool box and signage", (n) => n["setupCost"]!),
  };
})();

/* ---------- PLASTIC ---------- */

const refill: Intervention = (() => {
  const params: Param[] = [
    { key: "stations", label: "Refill stations", unit: "stations", kind: "plan", scalable: true, sample: 3 },
    { key: "refills", label: "Refills per station per day", unit: "refills", kind: "measured", sample: 60, help: "Estimate before; most stations have a counter after install." },
    { key: "replaceShare", label: "Refills that replace a bought bottle", unit: "%", kind: "assumption", sample: 50, help: "Survey students; not every refill replaces a purchase." },
    P.schoolDays(),
    { key: "stationPrice", label: "Price per station (installed)", unit: "currency", kind: "price", sample: 900 },
  ];
  return {
    id: "refill",
    name: "Drinking-water refill stations",
    summary: "Install bottle-refill stations and phase out bottled water sales.",
    params,
    requires: ["potable-supply"],
    complexity: 2,
    weeks: [3, 8],
    maintenance: "Filter changes and regular water-quality tests.",
    resources: ["Plumber", "Water-quality testing"],
    materials: ["Refill stations", "Filters", "Reusable bottles for those who need them"],
    risks: [
      { risk: "Water quality not trusted", mitigation: "Publish test results next to each station." },
      { risk: "Lost income from bottle sales", mitigation: "Plan the budget change with the canteen." },
    ],
    effects: [
      { goal: 12, kind: "positive", note: "Waste prevention (12.5)." },
      { goal: 14, kind: "positive", note: "Less plastic leakage to waterways (14.1)." },
      { goal: 6, kind: "uncertain", note: "Depends on reliable safe drinking water (6.1)." },
      { goal: 3, kind: "positive", note: "Free drinking water supports hydration." },
    ],
    implications: {
      environmental: "Fewer single-use bottles produced and discarded.",
      social: "Free water access for all students.",
      economic: "Upfront cost; canteen revenue may change.",
    },
    dataLimitations: "The replacement share is the key uncertainty; a short student survey reduces it.",
    indicators: [{ name: "Refills", unit: "per week", method: "Station counter" }, { name: "Bottles sold", unit: "per week", method: "Canteen sales record" }],
    stages: [
      { name: "Test water", weeks: 2, description: "Confirm potable supply at each location." },
      { name: "Install", weeks: 3, description: "Fit stations; publish test results." },
      { name: "Phase out", weeks: 6, description: "Reduce bottled water sales; track counters." },
    ],
    compute: (v, s) => [
      out(params, v, s, ["stations", "refills", "replaceShare", "schoolDays"], "Single-use bottles potentially avoided", "bottles", "stations × refills × replacement share × school days × (months ÷ 12)", (n) => n["stations"]! * n["refills"]! * (n["replaceShare"]! / 100) * n["schoolDays"]! * yearShare(s)),
    ],
    cost: (v, s) => money(params, v, s, ["stations", "stationPrice"], "stations × installed price", (n) => n["stations"]! * n["stationPrice"]!),
  };
})();

const reusables: Intervention = (() => {
  const params: Param[] = [
    { key: "items", label: "Single-use items used per day", unit: "items/day", kind: "measured", sample: 900 },
    { key: "share", label: "Share replaced by reusables", unit: "%", kind: "plan", scalable: true, sample: 70 },
    P.schoolDays(),
    { key: "sets", label: "Reusable sets to buy", unit: "sets", kind: "plan", scalable: true, sample: 400 },
    { key: "setPrice", label: "Price per set", unit: "currency", kind: "price", sample: 3 },
  ];
  return {
    id: "reusables",
    name: "Reusable canteen ware",
    summary: "Replace disposable cups, cutlery and containers with washable ones.",
    params,
    requires: [],
    complexity: 2,
    weeks: [3, 8],
    maintenance: "Dishwashing capacity; replacement of lost items.",
    resources: ["Canteen staff", "Dishwashing capacity"],
    materials: ["Reusable cups, cutlery and trays"],
    risks: [{ risk: "Washing adds water and energy use", mitigation: "Run full dishwasher loads; measure both before and after." }],
    effects: [
      { goal: 12, kind: "positive", note: "Waste prevention (12.5)." },
      { goal: 14, kind: "positive", note: "Less plastic litter (14.1)." },
      { goal: 6, kind: "trade-off", note: "Washing increases water use." },
      { goal: 7, kind: "trade-off", note: "Washing increases energy use." },
    ],
    implications: {
      environmental: "Fewer disposables; added washing load.",
      social: "Canteen routines change.",
      economic: "Upfront purchase; disposables budget falls.",
    },
    dataLimitations: "The net environmental benefit depends on washing efficiency, which should be measured.",
    indicators: [{ name: "Disposables purchased", unit: "items/month", method: "Procurement records" }],
    stages: [
      { name: "Count", weeks: 1, description: "Count disposables used per day." },
      { name: "Procure", weeks: 3, description: "Buy reusables; check dishwashing capacity." },
      { name: "Switch", weeks: 6, description: "Phase in; track purchases and washing." },
    ],
    compute: (v, s) => [
      out(params, v, s, ["items", "share", "schoolDays"], "Single-use items avoided", "items", "items per day × share replaced × school days × (months ÷ 12)", (n) => n["items"]! * (n["share"]! / 100) * n["schoolDays"]! * yearShare(s)),
    ],
    cost: (v, s) => money(params, v, s, ["sets", "setPrice"], "sets × price per set", (n) => n["sets"]! * n["setPrice"]!),
  };
})();

const procurement: Intervention = (() => {
  const params: Param[] = [];
  return {
    id: "procurement",
    name: "Plastic-free procurement policy",
    summary: "Adopt purchasing rules that prefer reusable, refillable and unpackaged supplies.",
    params,
    requires: [],
    complexity: 1,
    weeks: [2, 6],
    maintenance: "Annual policy review with suppliers.",
    resources: ["Business manager", "Governing body approval"],
    materials: ["Written policy"],
    risks: [{ risk: "Alternatives cost more", mitigation: "Phase changes at contract renewal." }],
    effects: [
      { goal: 12, kind: "positive", note: "Sustainable procurement (12.7)." },
      { goal: 17, kind: "positive", note: "Supplier partnerships." },
      { goal: 8, kind: "uncertain", note: "Supplier costs may change." },
    ],
    implications: {
      environmental: "Prevents plastic at the source.",
      social: "Signals institutional commitment.",
      economic: "Varies by supplier.",
    },
    dataLimitations: "No quantity is estimated until purchasing records are reviewed.",
    indicators: [{ name: "Plastic-packaged purchases", unit: "share of orders", method: "Procurement records" }],
    stages: [
      { name: "Review", weeks: 2, description: "Review last year's purchases." },
      { name: "Draft", weeks: 2, description: "Draft and approve policy." },
      { name: "Apply", weeks: 12, description: "Apply at each order and renewal." },
    ],
    compute: () => [{ label: "Plastic avoided", value: null, unit: "items", formula: "Not estimated — requires a review of purchasing records.", missing: [], nature: "calculated" }],
    cost: () => ({ value: 0, formula: "staff time only", missing: [] }),
  };
})();

/* ---------- WASTE SEGREGATION ---------- */

const bins: Intervention = (() => {
  const params: Param[] = [
    { key: "stations", label: "Colour-coded bin stations", unit: "stations", kind: "plan", scalable: true, sample: 15 },
    { key: "stationPrice", label: "Price per station", unit: "currency", kind: "price", sample: 70 },
    { key: "contamNow", label: "Contamination in recycling now", unit: "%", kind: "measured", sample: 40, help: "From a bin audit: share of wrong items by weight." },
    { key: "contamTarget", label: "Contamination target", unit: "%", kind: "target", sample: 15 },
  ];
  return {
    id: "bins",
    name: "Colour-coded bins and training",
    summary: "Matched bin stations in every corridor, clear signage and short training for every class.",
    params,
    requires: [],
    complexity: 1,
    weeks: [2, 4],
    maintenance: "Termly bin audits; refresh signage.",
    resources: ["Caretaker", "Student eco-team"],
    materials: ["Bin stations", "Signage"],
    risks: [{ risk: "Collected streams are mixed again downstream", mitigation: "Confirm the collector keeps streams separate." }],
    effects: [
      { goal: 12, kind: "positive", note: "Recycling and waste reduction (12.5)." },
      { goal: 11, kind: "positive", note: "Better municipal waste management (11.6)." },
      { goal: 4, kind: "positive", note: "Education for sustainable development (4.7)." },
    ],
    implications: {
      environmental: "Cleaner recycling streams.",
      social: "Daily habit-building.",
      economic: "Low cost.",
    },
    dataLimitations: "The contamination change is a target until the next bin audit measures it.",
    indicators: [{ name: "Recycling contamination", unit: "% by weight", method: "Termly bin audit" }],
    stages: [
      { name: "Audit", weeks: 1, description: "Bin audit to measure contamination." },
      { name: "Install", weeks: 1, description: "Place stations; train classes." },
      { name: "Re-audit", weeks: 6, description: "Repeat bin audit." },
    ],
    compute: (v, s) => [
      out(params, v, s, ["contamNow", "contamTarget"], "Contamination reduction if target is met", "percentage points", "current % − target %", (n) => Math.max(0, n["contamNow"]! - n["contamTarget"]!), "target"),
    ],
    cost: (v, s) => money(params, v, s, ["stations", "stationPrice"], "stations × price per station", (n) => n["stations"]! * n["stationPrice"]!),
  };
})();

const recyclingPartner: Intervention = (() => {
  const params: Param[] = [
    { key: "kgWeek", label: "Separated recyclables per week", unit: "kg/week", kind: "measured", scalable: true, sample: 120 },
    { key: "feeMonth", label: "Collection fee per month", unit: "currency", kind: "price", sample: 40 },
  ];
  return {
    id: "recycling-partner",
    name: "Recycling collection partnership",
    summary: "Contract a collector — ideally including local waste-picker cooperatives — for separated streams.",
    params,
    requires: ["outdoor-space"],
    complexity: 2,
    weeks: [3, 8],
    maintenance: "Monthly collection log; annual contract review.",
    resources: ["Business manager", "Collector or cooperative"],
    materials: ["Storage area", "Collection log"],
    risks: [{ risk: "Formal contracts displace informal waste pickers", mitigation: "Prefer cooperatives that include them." }],
    effects: [
      { goal: 12, kind: "positive", note: "Recycling (12.5)." },
      { goal: 11, kind: "positive", note: "Municipal waste management (11.6)." },
      { goal: 8, kind: "trade-off", note: "Can support or displace informal livelihoods." },
      { goal: 17, kind: "positive", note: "Local partnership (17.17)." },
    ],
    implications: {
      environmental: "Materials recovered instead of disposed.",
      social: "Effect on informal workers depends on who is contracted.",
      economic: "Ongoing fee, sometimes offset by material value.",
    },
    dataLimitations: "Diverted weight does not tell you what is actually recycled downstream.",
    indicators: [{ name: "Recyclables collected", unit: "kg/month", method: "Collector weigh tickets" }],
    stages: [
      { name: "Find partner", weeks: 3, description: "Compare collectors and cooperatives." },
      { name: "Start", weeks: 1, description: "Agree schedule and storage." },
      { name: "Track", weeks: 12, description: "Log weigh tickets monthly." },
    ],
    compute: (v, s) => [
      out(params, v, s, ["kgWeek"], "Recyclables diverted", "kg", "kg per week × weeks in scenario", (n) => n["kgWeek"]! * (calendarDays(s) / 7)),
    ],
    cost: (v, s) => money(params, v, s, ["feeMonth"], "fee per month × months", (n) => n["feeMonth"]! * s.months),
  };
})();

export const CATEGORIES: Category[] = [
  {
    id: "water",
    name: "Water consumption and leakage",
    prompt: "Our school's water bill has risen and we see taps dripping and toilets running.",
    causes: [
      "Dripping taps and running toilet cisterns",
      "High-flow fixtures in washrooms",
      "Taps left running during breaks",
      "Hidden leaks in underground pipes",
      "No metering, so waste goes unnoticed",
      "Grounds irrigated in the heat of the day",
    ],
    targets: [
      { code: "6.4", relation: "direct", rationale: "The problem is water-use efficiency." },
      { code: "12.2", relation: "direct", rationale: "Wasted water is inefficient use of a natural resource." },
      { code: "6.b", relation: "indirect", rationale: "Students and staff participating in water management." },
      { code: "4.a", relation: "indirect", rationale: "School water facilities are part of education infrastructure." },
      { code: "4.7", relation: "indirect", rationale: "Audits teach sustainable development skills." },
    ],
    sources: ["epa-watersense", "jmp-schools", "unesco-esd"],
    baselineMetric: { name: "Weekly water consumption", unit: "L/week", method: "Meter reading at the same time each week" },
    interventions: [leakRepair, aerators, waterAudit, rainwater],
  },
  {
    id: "energy",
    name: "Electricity consumption",
    prompt: "Lights and computers stay on after lessons and our electricity bill keeps rising.",
    causes: [
      "Inefficient fluorescent or halogen lighting",
      "Equipment left on outside lessons",
      "No visibility of consumption",
      "Heating or cooling with doors and windows open",
      "Old, inefficient appliances",
    ],
    targets: [
      { code: "7.3", relation: "direct", rationale: "The problem is energy efficiency." },
      { code: "7.2", relation: "indirect", rationale: "Renewables are one possible response." },
      { code: "13.3", relation: "indirect", rationale: "Climate education through student monitoring." },
      { code: "12.2", relation: "indirect", rationale: "Efficient use of natural resources." },
      { code: "9.4", relation: "indirect", rationale: "Upgrading facilities to be resource-efficient." },
    ],
    sources: ["global-solar-atlas", "unesco-esd"],
    baselineMetric: { name: "Monthly electricity use", unit: "kWh/month", method: "Utility bill or sub-meter" },
    interventions: [led, switchOff, solar],
  },
  {
    id: "food",
    name: "Food waste",
    prompt: "Large amounts of lunch go into the bin every day.",
    causes: [
      "Portions larger than appetite",
      "Unpopular dishes",
      "Too little time to eat",
      "Over-ordering by the kitchen",
      "No separate collection for food waste",
    ],
    targets: [
      { code: "12.3", relation: "direct", rationale: "Food waste reduction at consumer level." },
      { code: "12.5", relation: "direct", rationale: "Waste prevention and recycling." },
      { code: "2.1", relation: "indirect", rationale: "Food that is eaten rather than wasted." },
      { code: "13.3", relation: "indirect", rationale: "Awareness of food-related emissions." },
      { code: "4.7", relation: "indirect", rationale: "Learning through measurement." },
    ],
    sources: ["unep-fwi-2024", "fao-flw", "unesco-esd"],
    baselineMetric: { name: "Plate waste", unit: "kg/day", method: "Daily weighing after lunch" },
    interventions: [plateAudit, compost, shareTable],
  },
  {
    id: "plastic",
    name: "Plastic consumption",
    prompt: "Students buy bottled water and the canteen uses disposable cups and cutlery.",
    causes: [
      "Bottled water sold on site",
      "Disposable canteen ware",
      "Plastic-packaged supplies",
      "No free drinking water points",
    ],
    targets: [
      { code: "12.5", relation: "direct", rationale: "Waste prevention and reduction." },
      { code: "14.1", relation: "indirect", rationale: "Plastic litter reaches waterways and oceans." },
      { code: "12.7", relation: "indirect", rationale: "Sustainable procurement by institutions." },
      { code: "6.1", relation: "indirect", rationale: "Refill depends on safe drinking water." },
      { code: "4.7", relation: "indirect", rationale: "Learning about consumption." },
    ],
    sources: ["unep-tap-2023", "unep-gwmo-2024"],
    baselineMetric: { name: "Single-use plastic items", unit: "items/day", method: "Canteen count and sales records" },
    interventions: [refill, reusables, procurement],
  },
  {
    id: "waste",
    name: "Waste segregation",
    prompt: "Recycling bins are full of mixed rubbish and nothing seems to be recycled.",
    causes: [
      "Mismatched or missing bins",
      "Unclear signage",
      "No collection for separated streams",
      "Low awareness",
    ],
    targets: [
      { code: "12.5", relation: "direct", rationale: "Recycling and reuse." },
      { code: "11.6", relation: "direct", rationale: "Municipal waste management." },
      { code: "12.4", relation: "indirect", rationale: "Hazardous items (batteries, tubes) handled separately." },
      { code: "4.7", relation: "indirect", rationale: "Daily habit-building." },
      { code: "8.8", relation: "indirect", rationale: "Working conditions of waste workers." },
    ],
    sources: ["unep-gwmo-2024", "unesco-esd"],
    baselineMetric: { name: "Recycling contamination", unit: "% by weight", method: "Termly bin audit" },
    interventions: [bins, recyclingPartner],
  },
];

export function getCategory(id: string) {
  return CATEGORIES.find((c) => c.id === id);
}
export function getIntervention(id: string) {
  for (const c of CATEGORIES) {
    const i = c.interventions.find((x) => x.id === id);
    if (i) return { category: c, intervention: i };
  }
  return undefined;
}

export function sampleValues(i: Intervention): Values {
  const v: Values = {};
  for (const p of i.params) v[p.key] = p.sample ?? p.reference?.value ?? null;
  return v;
}
export function emptyValues(i: Intervention): Values {
  const v: Values = {};
  for (const p of i.params) v[p.key] = p.reference?.value ?? null;
  return v;
}

/** Share of required inputs that are locally measured (transparent, not a score). */
export function evidenceBasis(i: Intervention) {
  const req = i.params.filter((p) => !p.optional);
  return {
    measured: req.filter((p) => p.kind === "measured").length,
    assumed: req.filter((p) => p.kind === "assumption").length,
    total: req.length,
  };
}

export function feasibility(i: Intervention, s: Scenario, cost: number | null) {
  const missingInfra = i.requires.filter((r) => !s.infra.includes(r));
  const budget =
    cost === null || s.budget === null
      ? "unknown"
      : cost <= s.budget
        ? "fits"
        : "exceeds";
  const minMonths = i.weeks[0] / 4.345;
  const time = s.months >= minMonths ? "fits" : "too-short";
  return { missingInfra, budget, time } as const;
}

/** Ripple map: direct goals from targets, second-order goals via the relationship graph. */
export function rippleMap(targets: { code: string; relation: "direct" | "indirect" }[]) {
  const goalOf = (c: string) => Number(c.split(".")[0]);
  const direct = new Set<number>();
  const indirect = new Set<number>();
  for (const t of targets) (t.relation === "direct" ? direct : indirect).add(goalOf(t.code));
  for (const d of direct) indirect.delete(d);
  const second = new Map<number, { via: number; kind: string; note: string }>();
  for (const g of [...direct, ...indirect]) {
    for (const r of relatedGoals(g)) {
      if (direct.has(r.goal) || indirect.has(r.goal) || second.has(r.goal)) continue;
      second.set(r.goal, { via: g, kind: r.kind, note: r.note });
    }
  }
  return { direct: [...direct], indirect: [...indirect], second };
}

export const DEFAULT_SCENARIO: Scenario = {
  budget: 3000,
  currency: "USD",
  months: 6,
  beneficiaries: 850,
  scalePct: 100,
  materialsLocal: true,
  infra: ["water-meter", "electricity-submeter", "outdoor-space", "potable-supply"],
};
