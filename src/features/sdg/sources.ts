/**
 * EARTH//OS source register. Every source here is real and was checked on the access date.
 * "usedFor" says exactly how the platform uses it; nothing else is attributed to these sources.
 */
export type Source = {
  id: string;
  name: string;
  org: string;
  url: string;
  dataset: string;
  published?: string;
  accessed: string;
  usedFor: string;
  limitations: string;
  integration: "live-api" | "bundled" | "reference" | "considered";
};

const ACCESSED = "2026-11-22";

export const SOURCES: Source[] = [
  {
    id: "un-sdg-api",
    name: "UN SDG API — Goal list with targets and indicators",
    org: "UN Statistics Division (UNSD)",
    url: "https://unstats.un.org/SDGAPI/v1/sdg/Goal/List?includechildren=true",
    dataset: "17 goals, 169 targets, global indicator list",
    accessed: ACCESSED,
    usedFor: "Every goal title, description, target and indicator text shown in EARTH//OS, verbatim.",
    limitations: "Bundled snapshot; refreshed manually. Indicator texts follow the framework revision current on the access date.",
    integration: "bundled",
  },
  {
    id: "un-sdgs",
    name: "The 17 Goals",
    org: "UN Department of Economic and Social Affairs",
    url: "https://sdgs.un.org/goals",
    dataset: "Official goal pages",
    accessed: ACCESSED,
    usedFor: "Reference for goal names and context.",
    limitations: "Narrative pages, not a dataset.",
    integration: "reference",
  },
  {
    id: "un-sdg-db",
    name: "Global SDG Indicators Database",
    org: "UN Statistics Division (UNSD)",
    url: "https://unstats.un.org/sdgs/dataportal",
    dataset: "Country and regional indicator series",
    accessed: ACCESSED,
    usedFor: "Linked from goal pages for indicators that have no World Bank equivalent.",
    limitations: "Not queried live by EARTH//OS yet; users are sent to the official portal.",
    integration: "reference",
  },
  {
    id: "wb-wdi",
    name: "World Development Indicators API",
    org: "World Bank",
    url: "https://data.worldbank.org/",
    dataset: "Indicator series listed on each goal page (e.g. SH.H2O.BASW.ZS, EG.ELC.ACCS.ZS)",
    accessed: ACCESSED,
    usedFor: "Live world trend lines on goal pages and country values in the Earth Atlas.",
    limitations: "Latest year differs by country and indicator; some series are modelled estimates; capital-city coordinates are used only to place country markers.",
    integration: "live-api",
  },
  {
    id: "icsu-2017",
    name: "A Guide to SDG Interactions: from Science to Implementation",
    org: "International Council for Science (now International Science Council)",
    url: "https://council.science/publications/a-guide-to-sdg-interactions-from-science-to-implementation/",
    dataset: "Framework for classifying interactions between goals",
    published: "2017",
    accessed: ACCESSED,
    usedFor: "The idea of synergies and trade-offs behind the relationship graph.",
    limitations: "The specific links and notes in EARTH//OS are our editorial judgement, not scores from this guide.",
    integration: "reference",
  },
  {
    id: "epa-watersense",
    name: "Fix a Leak Week",
    org: "U.S. Environmental Protection Agency — WaterSense",
    url: "https://www.epa.gov/watersense/fix-leak-week",
    dataset: "Household leak guidance",
    accessed: ACCESSED,
    usedFor: "Reference figure for a tap dripping about once per second (more than 3,000 US gallons a year, ≈31 L/day), offered as a replaceable default.",
    limitations: "US household context. Always replace with your own jug-and-timer measurement.",
    integration: "reference",
  },
  {
    id: "jmp-schools",
    name: "WASH in Schools",
    org: "WHO/UNICEF Joint Monitoring Programme (JMP)",
    url: "https://washdata.org/monitoring/schools",
    dataset: "School drinking water, sanitation and hygiene coverage",
    accessed: ACCESSED,
    usedFor: "Context for school water interventions and why hygiene must not be compromised.",
    limitations: "Not queried live; national coverage, not school-level data.",
    integration: "reference",
  },
  {
    id: "unep-fwi-2024",
    name: "Food Waste Index Report 2024",
    org: "UN Environment Programme (UNEP)",
    url: "https://www.unep.org/resources/publication/food-waste-index-report-2024",
    dataset: "Food waste estimates for SDG indicator 12.3.1(b)",
    published: "2024",
    accessed: ACCESSED,
    usedFor: "Measurement approach for food waste (weigh, don't guess) referenced by the food waste pilot.",
    limitations: "National estimates; not a substitute for a school plate-waste audit.",
    integration: "reference",
  },
  {
    id: "fao-flw",
    name: "Technical Platform on the Measurement and Reduction of Food Loss and Waste",
    org: "Food and Agriculture Organization of the UN (FAO)",
    url: "https://www.fao.org/platform-food-loss-waste/en/",
    dataset: "Food loss and waste guidance",
    accessed: ACCESSED,
    usedFor: "Background for food waste root causes and interventions.",
    limitations: "Reference only.",
    integration: "reference",
  },
  {
    id: "unep-gwmo-2024",
    name: "Global Waste Management Outlook 2024",
    org: "UN Environment Programme (UNEP)",
    url: "https://www.unep.org/resources/global-waste-management-outlook-2024",
    dataset: "Municipal solid waste outlook",
    published: "2024",
    accessed: ACCESSED,
    usedFor: "Context for waste segregation and recycling interventions.",
    limitations: "Global and regional scale; reference only.",
    integration: "reference",
  },
  {
    id: "unep-tap-2023",
    name: "Turning off the Tap: How the world can end plastic pollution and create a circular economy",
    org: "UN Environment Programme (UNEP)",
    url: "https://www.unep.org/resources/turning-off-tap-end-plastic-pollution-create-circular-economy",
    dataset: "Plastic pollution policy report",
    published: "2023",
    accessed: ACCESSED,
    usedFor: "The reuse-first hierarchy behind the plastic interventions.",
    limitations: "System-level analysis; does not give school-level figures.",
    integration: "reference",
  },
  {
    id: "unesco-esd",
    name: "Education for Sustainable Development",
    org: "UNESCO",
    url: "https://www.unesco.org/en/sustainable-development/education",
    dataset: "ESD for 2030 framework",
    accessed: ACCESSED,
    usedFor: "Framing of student-led audits as learning (target 4.7).",
    limitations: "Reference only.",
    integration: "reference",
  },
  {
    id: "who-aqg-2021",
    name: "WHO global air quality guidelines",
    org: "World Health Organization",
    url: "https://www.who.int/publications/i/item/9789240034228",
    dataset: "Air quality guideline values",
    published: "2021",
    accessed: ACCESSED,
    usedFor: "Context for the PM2.5 indicator on SDG 11.",
    limitations: "Reference only.",
    integration: "reference",
  },
  {
    id: "global-solar-atlas",
    name: "Global Solar Atlas",
    org: "World Bank Group / Solargis",
    url: "https://globalsolaratlas.info/",
    dataset: "Specific photovoltaic power output by location",
    accessed: ACCESSED,
    usedFor: "Where users should look up the solar yield input for the rooftop solar calculation.",
    limitations: "Modelled long-term averages; not integrated, users enter the value.",
    integration: "reference",
  },
  {
    id: "nasa-earthdata",
    name: "NASA Earthdata",
    org: "NASA",
    url: "https://www.earthdata.nasa.gov/",
    dataset: "Earth observation archives",
    accessed: ACCESSED,
    usedFor: "Evaluated for the Earth Atlas; not integrated yet because the layers need a tile service and account.",
    limitations: "Not integrated.",
    integration: "considered",
  },
  {
    id: "carto-osm",
    name: "CARTO Dark Matter basemap with OpenStreetMap data",
    org: "CARTO / OpenStreetMap contributors",
    url: "https://carto.com/basemaps",
    dataset: "Vector basemap tiles",
    accessed: ACCESSED,
    usedFor: "The background map in the Earth Atlas.",
    limitations: "Cartographic boundaries are not an endorsement of any territorial claim.",
    integration: "live-api",
  },
];

export function getSource(id: string) {
  return SOURCES.find((s) => s.id === id);
}
