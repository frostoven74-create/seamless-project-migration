import { ClientOnly, Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Suspense, lazy, useMemo, useState } from "react";
import { PageIntro } from "@/components/site/PageIntro";
import { Prov } from "@/components/site/Prov";
import { Select, StatusPill } from "@/components/site/ui";
import { GOALS, pad } from "@/features/sdg/sdgs";
import { countriesQuery, fmt, latestByCountryQuery, type Country } from "@/features/sdg/worldbank";
import { CATEGORIES } from "@/features/ripple-engine/pilot";
import { useStore } from "@/features/store/store";
import type { AtlasPoint } from "@/features/earth-atlas/AtlasMap";

const AtlasMap = lazy(() => import("@/features/earth-atlas/AtlasMap"));

export const Route = createFileRoute("/atlas")({
  head: () => ({
    meta: [
      { title: "Earth Atlas — EARTH//OS" },
      { name: "description", content: "Explore live World Bank indicators for every country alongside registered sustainability projects, filtered by SDG, region and status." },
      { property: "og:title", content: "Earth Atlas — EARTH//OS" },
      { property: "og:description", content: "A world map of SDG data and local projects, with sources and dates on every value." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AtlasPage,
});

const WITH_DATA = GOALS.filter((g) => g.datasets.length > 0);

function findCountry(cs: Country[], loc: { country: string; countryName: string }) {
  const n = loc.countryName.trim().toLowerCase();
  return cs.find((c) => (loc.country && c.id === loc.country) || (n && c.name.toLowerCase() === n));
}

function AtlasPage() {
  const [goal, setGoal] = useState(WITH_DATA.find((g) => g.code === 6)?.code ?? WITH_DATA[0]!.code);
  const g = GOALS.find((x) => x.code === goal)!;
  const [dsCode, setDs] = useState(g.datasets[0]!.code);
  const ds = g.datasets.find((d) => d.code === dsCode) ?? g.datasets[0]!;
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState("");
  const [cat, setCat] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  const countries = useQuery(countriesQuery);
  const latest = useQuery(latestByCountryQuery(ds.code));
  const projects = useStore((s) => s.projects);

  const regions = useMemo(() => [...new Set((countries.data ?? []).map((c) => c.region))].sort(), [countries.data]);
  const points = useMemo<AtlasPoint[]>(() => {
    const cs = (countries.data ?? []).filter((c) => !region || c.region === region);
    const byIso = new Map((latest.data?.values ?? []).map((v) => [v.iso3, v]));
    const vals = cs.map((c) => byIso.get(c.id)?.value).filter((v): v is number => v !== undefined);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    return cs.map((c) => {
      const v = byIso.get(c.id);
      const raw = v ? (v.value - lo) / (hi - lo || 1) : null;
      return { id: c.id, name: c.name, lat: c.lat, lon: c.lon, value: v?.value ?? null, year: v?.year ?? null, norm: raw === null ? null : ds.higherIsBetter ? raw : 1 - raw };
    });
  }, [countries.data, latest.data, region, ds.higherIsBetter]);

  const placed = useMemo(() => {
    const cs = countries.data ?? [];
    return projects
      .filter((p) => (!status || p.status === status) && (!cat || p.categoryId === cat) && p.goals.includes(goal))
      .map((p) => ({ p, c: findCountry(cs, p.location) }))
      .filter((x) => !region || x.c?.region === region);
  }, [projects, countries.data, status, cat, goal, region]);

  const mapProjects = placed.filter((x) => x.c).map(({ p, c }) => ({ id: p.id, title: p.title, status: p.status, lat: c!.lat, lon: c!.lon }));
  const ranked = points.filter((p) => p.value !== null).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const sel = points.find((p) => p.id === picked);

  return (
    <>
      <PageIntro index="07" eyebrow="Earth Atlas" title={<>The world, <em className="text-sprout">measured.</em></>} lede="Live country data from the World Bank, with the projects registered on this device placed on their country. Choose a goal and indicator; every value shows its year and source." />
      <section className="mx-auto max-w-[1400px] px-5 py-10 md:px-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select label="SDG" value={goal} onChange={(e) => { const n = Number(e.target.value); setGoal(n); setDs(GOALS.find((x) => x.code === n)!.datasets[0]!.code); }}>
            {WITH_DATA.map((x) => <option key={x.code} value={x.code}>{pad(x.code)} — {x.short}</option>)}
          </Select>
          <Select label="Indicator" value={ds.code} onChange={(e) => setDs(e.target.value)}>{g.datasets.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}</Select>
          <Select label="Region" value={region} onChange={(e) => setRegion(e.target.value)}><option value="">World</option>{regions.map((r) => <option key={r} value={r}>{r}</option>)}</Select>
          <Select label="Project status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any</option>{["proposed", "planned", "active", "completed"].map((s) => <option key={s} value={s}>{s}</option>)}</Select>
          <Select label="Challenge" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Any</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-lichen">
          <Prov kind="live" />
          <span>World Bank WDI · {ds.code}{ds.unIndicator ? ` · UN indicator ${ds.unIndicator}` : ""}{latest.data?.lastUpdated ? ` · updated ${latest.data.lastUpdated}` : ""}</span>
          <span className="text-sprout">● larger/greener = better for the goal</span>
          <span className="text-gold">● project (country centre)</span>
        </div>

        <div className="relative mt-4 border border-hairline bg-void">
          {(countries.isError || latest.isError) && <p className="absolute inset-x-0 top-0 z-10 bg-destructive/20 p-3 text-sm text-bone">The World Bank service did not respond. Try again later — no values are shown rather than guesses.</p>}
          <ClientOnly fallback={<div className="h-[60vh] min-h-[360px] animate-pulse bg-graphite" />}>
            <Suspense fallback={<div className="h-[60vh] min-h-[360px] animate-pulse bg-graphite" />}>
              <AtlasMap points={points} projects={mapProjects} label={ds.label} onSelect={setPicked} />
            </Suspense>
          </ClientOnly>
          {sel && (
            <div className="absolute bottom-3 left-3 max-w-xs border border-hairline bg-graphite/95 p-4">
              <p className="text-bone">{sel.name}</p>
              <p className="mt-1 font-display text-3xl text-sprout">{fmt(sel.value)}</p>
              <p className="text-xs text-lichen">{ds.label}{sel.year ? ` · ${sel.year}` : " · no data"}</p>
              <button type="button" onClick={() => setPicked(null)} className="mt-2 font-mono text-[10px] uppercase text-lichen hover:text-bone">Close</button>
            </div>
          )}
        </div>

        <div className="mt-12 grid gap-12 lg:grid-cols-12">
          <section className="lg:col-span-7" aria-labelledby="tbl-h">
            <h2 id="tbl-h" className="eyebrow mb-4">{region || "All countries"} · {ranked.length} with data</h2>
            <div className="max-h-[480px] overflow-auto border-y border-hairline">
              <table className="w-full text-left text-sm">
                <thead className="eyebrow sticky top-0 bg-background"><tr><th className="py-2 font-normal">Country</th><th className="font-normal">Value</th><th className="font-normal">Year</th></tr></thead>
                <tbody className="divide-y divide-hairline">{ranked.map((p) => (
                  <tr key={p.id} className={p.id === picked ? "bg-forest" : ""}><td className="py-2"><button type="button" onClick={() => setPicked(p.id)} className="text-left hover:text-sprout">{p.name}</button></td><td className="font-mono">{fmt(p.value)}</td><td className="text-lichen">{p.year}</td></tr>
                ))}</tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-lichen">Coverage varies by country and year: each row shows the latest year available. Missing countries had no reported value.</p>
          </section>
          <section className="lg:col-span-5" aria-labelledby="prj-h">
            <h2 id="prj-h" className="eyebrow mb-4">Projects for SDG {pad(goal)} · {placed.length}</h2>
            {placed.length === 0 ? <p className="text-sm text-lichen">No matching projects. <Link to="/projects" className="text-sprout underline">Register one</Link>.</p> : (
              <ul className="divide-y divide-hairline border-y border-hairline">{placed.map(({ p, c }) => (
                <li key={p.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2"><StatusPill status={p.status} />{p.sample && <Prov kind="sample" />}</div>
                  <Link to="/projects/$id" params={{ id: p.id }} className="mt-1 block text-bone hover:text-sprout">{p.title}</Link>
                  <p className="text-xs text-lichen">{c ? c.name : `${p.location.countryName || "No country"} — not on map (country not recognised)`}</p>
                </li>
              ))}</ul>
            )}
            <p className="mt-3 text-xs text-lichen">Projects are shown at their country's centre to protect privacy. Exact sites are never mapped.</p>
          </section>
        </div>
      </section>
    </>
  );
}
