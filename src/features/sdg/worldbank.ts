import { queryOptions } from "@tanstack/react-query";

/** World Bank WDI API (public, CORS-enabled, no key). https://datahelpdesk.worldbank.org */
const BASE = "https://api.worldbank.org/v2";

export type WbPoint = { year: number; value: number };
export type WbSeries = { code: string; name: string; points: WbPoint[]; lastUpdated: string | null };

type WbRow = { indicator: { id: string; value: string }; country: { id: string; value: string }; countryiso3code: string; date: string; value: number | null };
type WbMeta = { lastupdated?: string | null };

async function getJson(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`World Bank API responded ${r.status}`);
  return (await r.json()) as [WbMeta, WbRow[] | null];
}

export function worldSeriesQuery(code: string) {
  return queryOptions({
    queryKey: ["wb", "world", code],
    staleTime: 1000 * 60 * 60 * 6,
    retry: 1,
    queryFn: async (): Promise<WbSeries> => {
      const [meta, rows] = await getJson(`${BASE}/country/WLD/indicator/${code}?format=json&date=1990:2026&per_page=100`);
      const points = (rows ?? [])
        .filter((r) => r.value !== null)
        .map((r) => ({ year: Number(r.date), value: r.value as number }))
        .sort((a, b) => a.year - b.year);
      return { code, name: rows?.[0]?.indicator.value ?? code, points, lastUpdated: meta?.lastupdated ?? null };
    },
  });
}

export type Country = { id: string; name: string; region: string; regionId: string; income: string; lat: number; lon: number; capital: string };

export const countriesQuery = queryOptions({
  queryKey: ["wb", "countries"],
  staleTime: Infinity,
  queryFn: async (): Promise<Country[]> => {
    const r = await fetch(`${BASE}/country?format=json&per_page=400`);
    if (!r.ok) throw new Error("World Bank API unavailable");
    const [, rows] = (await r.json()) as [unknown, { id: string; name: string; region: { id: string; value: string }; incomeLevel: { value: string }; capitalCity: string; latitude: string; longitude: string }[]];
    return rows
      .filter((c) => c.region.id !== "NA" && c.latitude && c.longitude)
      .map((c) => ({
        id: c.id,
        name: c.name,
        region: c.region.value.trim(),
        regionId: c.region.id,
        income: c.incomeLevel.value,
        capital: c.capitalCity,
        lat: Number(c.latitude),
        lon: Number(c.longitude),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export type CountryValue = { iso3: string; value: number; year: number };

export function latestByCountryQuery(code: string) {
  return queryOptions({
    queryKey: ["wb", "latest", code],
    staleTime: 1000 * 60 * 60 * 6,
    retry: 1,
    queryFn: async () => {
      const [meta, rows] = await getJson(`${BASE}/country/all/indicator/${code}?format=json&mrnev=1&per_page=400`);
      const values: CountryValue[] = (rows ?? [])
        .filter((r) => r.value !== null && r.countryiso3code)
        .map((r) => ({ iso3: r.countryiso3code, value: r.value as number, year: Number(r.date) }));
      return { values, lastUpdated: meta?.lastupdated ?? null };
    },
  });
}

export function fmt(n: number | null | undefined, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(digits)}M`;
  if (abs >= 1e4) return Math.round(n).toLocaleString("en-US");
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}
