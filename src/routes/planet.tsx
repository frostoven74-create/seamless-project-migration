import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LivingPlanet } from "@/features/living-planet/LivingPlanet";
import { PlanetPanel } from "@/features/living-planet/PlanetPanel";
import { buildOverlay, type PlanetSelection } from "@/features/living-planet/planet-data";
import { useStore } from "@/features/store/store";
import { Prov } from "@/components/site/Prov";

export const Route = createFileRoute("/planet")({
  head: () => ({
    meta: [
      { title: "Living Planet — EARTH//OS" },
      { name: "description", content: "Explore the 17 SDGs as one living tree: roots are problems, branches are goals, leaves are verified milestones." },
      { property: "og:title", content: "Living Planet — EARTH//OS" },
      { property: "og:description", content: "An interactive 3D tree of the 17 Sustainable Development Goals, their 169 targets and real project milestones." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlanetPage,
});

const LEGEND = [
  { k: "Roots", d: "Real-world problems", c: "bg-biolume" },
  { k: "Branches", d: "The 17 goals", c: "bg-moss border border-sprout/40" },
  { k: "Buds on twigs", d: "169 official targets", c: "bg-sprout" },
  { k: "Glowing buds", d: "Proposed interventions", c: "bg-biolume shadow-[0_0_8px_var(--biolume)]" },
  { k: "Shoots", d: "Active projects", c: "bg-emerald" },
  { k: "Dim leaves", d: "Milestones not yet verified", c: "border border-lichen" },
  { k: "Gold leaves", d: "Verified milestones", c: "bg-gold shadow-[0_0_8px_var(--gold)]" },
];

function PlanetPage() {
  const [selection, setSelection] = useState<PlanetSelection>(null);
  const [view, setView] = useState<"3d" | "2d">("3d");
  const [samples, setSamples] = useState(true);
  const state = useStore((s) => s);
  const overlay = useMemo(() => buildOverlay(state, samples), [state, samples]);
  const hasSample = state.projects.some((p) => p.sample) || state.passports.some((p) => p.sample);

  return (
    <div className="relative">
      <h1 className="sr-only">Living Planet — interactive SDG tree</h1>
      <div className="grid min-h-[100svh] lg:grid-cols-[1fr_440px]">
        <div className="relative h-[72svh] lg:sticky lg:top-0 lg:h-[100svh]">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[image:var(--gradient-canopy)]" />
          <LivingPlanet selection={selection} onSelect={setSelection} overlay={overlay} view={view} />

          <div className="absolute left-5 top-20 z-10 flex flex-wrap items-center gap-2 md:left-10">
            <div role="group" aria-label="View mode" className="flex overflow-hidden rounded-sm border border-hairline bg-void/70 backdrop-blur">
              {(["3d", "2d"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-lichen aria-pressed:bg-sprout aria-pressed:text-void"
                >
                  {v === "3d" ? "3D tree" : "2D view"}
                </button>
              ))}
            </div>
            {hasSample && (
              <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-hairline bg-void/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-lichen backdrop-blur">
                <input type="checkbox" checked={samples} onChange={(e) => setSamples(e.target.checked)} className="accent-[var(--prov-sample)]" />
                Show hypothetical sample
              </label>
            )}
            {selection && (
              <button type="button" onClick={() => setSelection(null)} className="rounded-sm border border-hairline bg-void/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-bone backdrop-blur hover:border-sprout/60">
                Reset view
              </button>
            )}
          </div>

          <div className="pointer-events-none absolute bottom-5 left-5 z-10 hidden md:left-10 md:block">
            <ul className="space-y-1.5 rounded-sm border border-hairline bg-void/60 p-3 backdrop-blur">
              {LEGEND.map((l) => (
                <li key={l.k} className="flex items-center gap-2.5 text-[11px]">
                  <span aria-hidden className={`size-2 rounded-full ${l.c}`} />
                  <span className="text-bone">{l.k}</span>
                  <span className="text-lichen">{l.d}</span>
                </li>
              ))}
            </ul>
            {samples && hasSample && <Prov kind="sample" className="mt-2">Leaves include hypothetical sample data</Prov>}
          </div>
        </div>

        <aside aria-label="Selection details" className="relative z-10 border-l border-hairline bg-void/95 px-5 pb-16 pt-6 md:px-8 lg:max-h-[100svh] lg:overflow-y-auto lg:pt-24">
          <PlanetPanel selection={selection} onSelect={setSelection} overlay={overlay} />
        </aside>
      </div>
    </div>
  );
}
