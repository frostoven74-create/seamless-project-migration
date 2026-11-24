import { Link, createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { PageIntro } from "@/components/site/PageIntro";
import { Prov } from "@/components/site/Prov";
import { GoalMark } from "@/components/site/GoalMark";
import { Empty, btnClass, fmtDate, money } from "@/components/site/ui";
import { useStore, useStoreReady } from "@/features/store/store";
import { commit, nowIso } from "@/features/store/commit";
import { savePassport } from "@/features/store/actions";
import { uid } from "@/features/ripple-engine/passport";
import type { Passport } from "@/features/store/types";
import { toast } from "sonner";

export const Route = createFileRoute("/passports/")({
  head: () => ({
    meta: [
      { title: "Solution Passports — EARTH//OS" },
      { name: "description", content: "Structured, reusable implementation blueprints for sustainability projects: causes, SDG targets, budget, stages, risks, indicators and evidence plan." },
      { property: "og:title", content: "Solution Passports — EARTH//OS" },
      { property: "og:description", content: "Implementation blueprints you can edit, print, export, duplicate and adapt for another place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PassportsPage,
});

function goalsOf(p: Passport) {
  return [...new Set(p.targets.map((t) => Number(t.code.split(".")[0])))];
}

function PassportsPage() {
  const passports = useStore((s) => s.passports);
  const ready = useStoreReady();
  const file = useRef<HTMLInputElement>(null);

  async function onImport(f: File) {
    if (f.size > 1024 * 1024) { toast.error("That file is too large to be a passport."); return; }
    try {
      const data = JSON.parse(await f.text()) as Partial<Passport>;
      if (!data.title || !data.interventionId || !Array.isArray(data.targets) || !Array.isArray(data.stages)) throw new Error("bad");
      const now = nowIso();
      commit((s) => ({ ok: true, state: savePassport(s, { ...(data as Passport), id: uid("pp"), createdAt: now, updatedAt: now, sample: undefined as never }) }), "Passport imported.");
    } catch {
      toast.error("That file is not an EARTH//OS passport export.");
    }
  }

  return (
    <>
      <PageIntro
        index="05"
        eyebrow="Solution Passports"
        title={<>Plans you can <em className="text-sprout">carry.</em></>}
        lede="A Solution Passport turns one chosen intervention into a document a school or community can follow: causes, official targets, costs and assumptions, stages, risks, indicators and how evidence will be collected."
      >
        <div className="flex flex-wrap gap-3">
          <Link to="/ripple" className={btnClass("primary")}>Create from the Ripple Engine</Link>
          <button type="button" className={btnClass("line")} onClick={() => file.current?.click()}>Import passport file</button>
          <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImport(f); e.target.value = ""; }} />
        </div>
      </PageIntro>
      <section className="mx-auto max-w-[1400px] px-5 py-12 md:px-10">
        {!ready ? (
          <div className="h-40 animate-pulse rounded-sm bg-graphite" aria-label="Loading passports" />
        ) : passports.length === 0 ? (
          <Empty title="No passports yet.">Run a challenge through the Ripple Engine and generate your first passport. It is stored on this device.</Empty>
        ) : (
          <ul className="grid border-l border-t border-hairline md:grid-cols-2 xl:grid-cols-3">
            {passports.map((p) => (
              <li key={p.id} className="border-b border-r border-hairline">
                <Link to="/passports/$id" params={{ id: p.id }} className="group flex h-full flex-col p-6 transition-colors hover:bg-forest">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-lichen">{p.intervention.name}</span>
                    {p.sample && <Prov kind="sample" />}
                    {p.ai && <Prov kind="ai">AI-assisted</Prov>}
                    {p.derivedFrom && <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-biolume">Adapted</span>}
                  </div>
                  <h2 className="mt-4 font-display text-3xl leading-tight text-bone group-hover:text-sprout">{p.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-lichen">{p.problem}</p>
                  <div className="mt-6 flex flex-wrap gap-3">{goalsOf(p).slice(0, 5).map((g) => <GoalMark key={g} goal={g} />)}</div>
                  <div className="mt-auto flex items-end justify-between pt-8 font-mono text-[10px] uppercase tracking-[0.12em] text-lichen">
                    <span>{[p.location.place, p.location.countryName].filter(Boolean).join(", ") || "No location"}</span>
                    <span>{money(p.budget.estimate, p.budget.currency)} · {fmtDate(p.updatedAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
