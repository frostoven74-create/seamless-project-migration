import raw from "./data/un-sdg.json";

/**
 * Official UN SDG content (goal titles, descriptions, 169 targets, indicators) comes verbatim
 * from the UN Statistics Division SDG API (unstats.un.org/SDGAPI/v1/sdg/Goal/List), fetched
 * 2026-11-22. Everything else in this file is EARTH//OS analysis and is labelled as such in the UI.
 */
export type Indicator = { code: string; description: string };
export type Target = { code: string; description: string; indicators: Indicator[] };
type RawGoal = { code: number; title: string; description: string; targets: Target[] };

export type Dataset = {
  code: string;
  label: string;
  unIndicator?: string;
  worldAggregate: boolean;
  /** Higher values are better for the goal (drives colour direction only, never a score). */
  higherIsBetter: boolean;
};

export type Goal = RawGoal & {
  short: string;
  color: string;
  challenges: string[];
  datasets: Dataset[];
};

const SHORT = [
  "No Poverty",
  "Zero Hunger",
  "Good Health and Well-being",
  "Quality Education",
  "Gender Equality",
  "Clean Water and Sanitation",
  "Affordable and Clean Energy",
  "Decent Work and Economic Growth",
  "Industry, Innovation and Infrastructure",
  "Reduced Inequalities",
  "Sustainable Cities and Communities",
  "Responsible Consumption and Production",
  "Climate Action",
  "Life Below Water",
  "Life on Land",
  "Peace, Justice and Strong Institutions",
  "Partnerships for the Goals",
] as const;

const CHALLENGES: Record<number, string[]> = {
  1: ["Extreme poverty", "Lack of social protection", "Vulnerability to climate shocks"],
  2: ["Undernourishment", "Food loss after harvest", "Smallholder productivity"],
  3: ["Air pollution exposure", "Unsafe water and sanitation", "Access to essential care"],
  4: ["Learning outcomes", "School facilities", "Education for sustainable development"],
  5: ["Unpaid care work", "Representation in decision-making", "Gender-based violence"],
  6: ["Water wastage and leakage", "Unsafe drinking water", "Untreated wastewater"],
  7: ["High electricity consumption", "Energy access gaps", "Fossil fuel dependence"],
  8: ["Youth unemployment", "Resource-intensive growth", "Informal work"],
  9: ["Ageing infrastructure", "Low research investment", "Digital divide"],
  10: ["Income inequality", "Exclusion of marginalised groups", "Remittance costs"],
  11: ["Poor waste collection", "Urban air quality", "Lack of green public space"],
  12: ["Excessive plastic consumption", "Food waste", "Poor waste segregation"],
  13: ["Rising emissions", "Low climate awareness", "Exposure to extreme weather"],
  14: ["Marine plastic pollution", "Overfishing", "Ocean acidification"],
  15: ["Local biodiversity loss", "Deforestation", "Land degradation"],
  16: ["Weak institutions", "Violence", "Limited participation"],
  17: ["Financing gaps", "Data and technology gaps", "Fragmented partnerships"],
};

/** World Bank WDI series verified against api.worldbank.org on 2026-11-22. */
const DATASETS: Record<number, Dataset[]> = {
  1: [{ code: "SI.POV.DDAY", label: "Poverty headcount ratio at $3.00 a day (2021 PPP), % of population", unIndicator: "1.1.1", worldAggregate: true, higherIsBetter: false }],
  2: [{ code: "SN.ITK.DEFC.ZS", label: "Prevalence of undernourishment, % of population", unIndicator: "2.1.1", worldAggregate: true, higherIsBetter: false }],
  3: [
    { code: "SH.DYN.MORT", label: "Under-5 mortality rate, per 1,000 live births", unIndicator: "3.2.1", worldAggregate: true, higherIsBetter: false },
    { code: "SP.DYN.LE00.IN", label: "Life expectancy at birth, years", worldAggregate: true, higherIsBetter: true },
  ],
  4: [{ code: "SE.PRM.CMPT.ZS", label: "Primary completion rate, % of relevant age group", unIndicator: "4.1.2", worldAggregate: true, higherIsBetter: true }],
  5: [{ code: "SG.GEN.PARL.ZS", label: "Seats held by women in national parliaments, %", unIndicator: "5.5.1", worldAggregate: true, higherIsBetter: true }],
  6: [
    { code: "SH.H2O.BASW.ZS", label: "People using at least basic drinking water services, %", worldAggregate: true, higherIsBetter: true },
    { code: "SH.STA.BASS.ZS", label: "People using at least basic sanitation services, %", worldAggregate: true, higherIsBetter: true },
  ],
  7: [
    { code: "EG.ELC.ACCS.ZS", label: "Access to electricity, % of population", unIndicator: "7.1.1", worldAggregate: true, higherIsBetter: true },
    { code: "EG.FEC.RNEW.ZS", label: "Renewable energy consumption, % of total final energy consumption", unIndicator: "7.2.1", worldAggregate: true, higherIsBetter: true },
  ],
  8: [{ code: "SL.UEM.TOTL.ZS", label: "Unemployment, % of labour force (modelled ILO estimate)", unIndicator: "8.5.2", worldAggregate: true, higherIsBetter: false }],
  9: [{ code: "GB.XPD.RSDV.GD.ZS", label: "Research and development expenditure, % of GDP", unIndicator: "9.5.1", worldAggregate: true, higherIsBetter: true }],
  10: [{ code: "SI.POV.GINI", label: "Gini index (country estimates only)", worldAggregate: false, higherIsBetter: false }],
  11: [
    { code: "EN.ATM.PM25.MC.M3", label: "PM2.5 mean annual exposure, µg/m³", unIndicator: "11.6.2", worldAggregate: true, higherIsBetter: false },
    { code: "EN.POP.SLUM.UR.ZS", label: "Population living in slums, % of urban population", unIndicator: "11.1.1", worldAggregate: true, higherIsBetter: false },
  ],
  12: [],
  13: [{ code: "EN.GHG.CO2.PC.CE.AR5", label: "CO₂ emissions excluding LULUCF per capita, t CO₂e", worldAggregate: true, higherIsBetter: false }],
  14: [{ code: "ER.MRN.PTMR.ZS", label: "Marine protected areas, % of territorial waters", worldAggregate: true, higherIsBetter: true }],
  15: [{ code: "AG.LND.FRST.ZS", label: "Forest area, % of land area", unIndicator: "15.1.1", worldAggregate: true, higherIsBetter: true }],
  16: [{ code: "VC.IHR.PSRC.P5", label: "Intentional homicides, per 100,000 people", unIndicator: "16.1.1", worldAggregate: true, higherIsBetter: false }],
  17: [{ code: "IT.NET.USER.ZS", label: "Individuals using the Internet, % of population", unIndicator: "17.8.1", worldAggregate: true, higherIsBetter: true }],
};

export const GOALS: Goal[] = (raw as RawGoal[]).map((g) => ({
  ...g,
  short: SHORT[g.code - 1] ?? `Goal ${g.code}`,
  color: `var(--sdg-${g.code})`,
  challenges: CHALLENGES[g.code] ?? [],
  datasets: DATASETS[g.code] ?? [],
}));

export function getGoal(code: number): Goal | undefined {
  return GOALS.find((g) => g.code === code);
}

const TARGET_INDEX = new Map<string, { goal: number; target: Target }>();
for (const g of GOALS) for (const t of g.targets) TARGET_INDEX.set(t.code, { goal: g.code, target: t });

export function getTarget(code: string) {
  return TARGET_INDEX.get(code);
}
export function isOfficialTarget(code: string) {
  return TARGET_INDEX.has(code);
}
export const TOTAL_TARGETS = TARGET_INDEX.size;
export const TOTAL_INDICATORS = GOALS.reduce(
  (n, g) => n + g.targets.reduce((m, t) => m + t.indicators.length, 0),
  0,
);

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * EARTH//OS curated relationship graph between goals. This is analysis, not UN data. It follows
 * the interaction framing of the International Council for Science (2017) "A Guide to SDG
 * Interactions", but the specific links and notes below are EARTH//OS editorial judgements.
 */
export type Relation = "synergy" | "trade-off" | "mixed";
export type Link = { a: number; b: number; kind: Relation; note: string };

export const LINKS: Link[] = [
  { a: 1, b: 2, kind: "synergy", note: "Household income is the main route to food access." },
  { a: 1, b: 3, kind: "synergy", note: "Poverty limits access to care; illness pushes households into poverty." },
  { a: 1, b: 4, kind: "synergy", note: "Schooling raises lifetime earnings; poverty keeps children out of school." },
  { a: 1, b: 5, kind: "synergy", note: "Women's economic rights reduce household poverty." },
  { a: 1, b: 8, kind: "synergy", note: "Decent work is the most durable exit from poverty." },
  { a: 1, b: 10, kind: "synergy", note: "Reducing inequality accelerates poverty reduction." },
  { a: 1, b: 13, kind: "synergy", note: "Climate shocks erode assets of the poorest first (target 1.5)." },
  { a: 2, b: 3, kind: "synergy", note: "Nutrition underpins child health and development." },
  { a: 2, b: 6, kind: "trade-off", note: "Irrigation expands food output but competes for freshwater." },
  { a: 2, b: 12, kind: "synergy", note: "Halving food waste (target 12.3) reduces pressure on food systems." },
  { a: 2, b: 13, kind: "mixed", note: "Agriculture emits greenhouse gases and is exposed to climate risk." },
  { a: 2, b: 15, kind: "trade-off", note: "Cropland expansion can drive deforestation and habitat loss." },
  { a: 3, b: 6, kind: "synergy", note: "Safe water, sanitation and hygiene prevent disease." },
  { a: 3, b: 4, kind: "synergy", note: "Healthy children attend and learn; educated parents raise healthier children." },
  { a: 3, b: 7, kind: "synergy", note: "Clean cooking and electricity reduce household air pollution." },
  { a: 3, b: 11, kind: "synergy", note: "Urban air quality and waste management shape public health." },
  { a: 4, b: 5, kind: "synergy", note: "Girls' education is central to gender equality." },
  { a: 4, b: 6, kind: "synergy", note: "WASH facilities in schools support attendance, especially for girls." },
  { a: 4, b: 8, kind: "synergy", note: "Skills drive productive employment." },
  { a: 4, b: 13, kind: "synergy", note: "Climate education builds adaptive capacity (target 13.3)." },
  { a: 5, b: 8, kind: "synergy", note: "Equal participation in work raises economic output." },
  { a: 5, b: 10, kind: "synergy", note: "Gender equality is a dimension of reduced inequality." },
  { a: 5, b: 16, kind: "synergy", note: "Inclusive institutions require women's participation." },
  { a: 6, b: 9, kind: "synergy", note: "Water systems are infrastructure; leaks are an infrastructure problem." },
  { a: 6, b: 11, kind: "synergy", note: "Cities depend on reliable water and sanitation services." },
  { a: 6, b: 14, kind: "synergy", note: "Treating wastewater reduces coastal and marine pollution." },
  { a: 6, b: 15, kind: "synergy", note: "Freshwater ecosystems depend on water-use efficiency (target 6.6)." },
  { a: 7, b: 8, kind: "synergy", note: "Reliable energy enables enterprise and jobs." },
  { a: 7, b: 9, kind: "synergy", note: "Energy efficiency and renewables are infrastructure upgrades." },
  { a: 7, b: 13, kind: "synergy", note: "Energy is the largest source of greenhouse gas emissions." },
  { a: 7, b: 15, kind: "mixed", note: "Some renewable projects require land or alter river ecosystems." },
  { a: 8, b: 9, kind: "synergy", note: "Infrastructure and innovation drive productivity." },
  { a: 8, b: 10, kind: "synergy", note: "Inclusive growth reduces inequality." },
  { a: 8, b: 13, kind: "trade-off", note: "Growth raises emissions unless resource use is decoupled (target 8.4)." },
  { a: 8, b: 12, kind: "mixed", note: "Consumption-led growth can increase material use." },
  { a: 9, b: 11, kind: "synergy", note: "Resilient infrastructure makes cities liveable." },
  { a: 9, b: 15, kind: "trade-off", note: "Roads and industry fragment habitats." },
  { a: 9, b: 17, kind: "synergy", note: "Technology transfer and capacity building (targets 17.6–17.8)." },
  { a: 10, b: 16, kind: "synergy", note: "Inclusive institutions reduce discrimination." },
  { a: 11, b: 12, kind: "synergy", note: "Municipal waste systems depend on responsible consumption." },
  { a: 11, b: 13, kind: "synergy", note: "Cities are central to mitigation and adaptation." },
  { a: 12, b: 13, kind: "synergy", note: "Production and consumption patterns drive emissions." },
  { a: 12, b: 14, kind: "synergy", note: "Reducing plastic waste reduces marine litter (target 14.1)." },
  { a: 12, b: 15, kind: "synergy", note: "Lower material demand reduces land conversion." },
  { a: 13, b: 14, kind: "synergy", note: "CO₂ drives ocean acidification (target 14.3)." },
  { a: 13, b: 15, kind: "synergy", note: "Forests and soils are carbon sinks." },
  { a: 14, b: 15, kind: "synergy", note: "Land-based pollution flows into the ocean." },
  { a: 16, b: 17, kind: "synergy", note: "Effective institutions enable partnerships and finance." },
  { a: 17, b: 10, kind: "synergy", note: "Development finance and trade rules affect inequality between countries." },
  { a: 17, b: 13, kind: "synergy", note: "Climate finance enables action in developing countries." },
];

export function relatedGoals(code: number) {
  return LINKS.filter((l) => l.a === code || l.b === code).map((l) => ({
    goal: l.a === code ? l.b : l.a,
    kind: l.kind,
    note: l.note,
  }));
}
