import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { GOALS, getGoal, pad, relatedGoals, type Dataset } from "@/features/sdg/sdgs";
import { CATEGORIES } from "@/features/ripple-engine/pilot";
import { fmt, worldSeriesQuery } from "@/features/sdg/worldbank";
import { useStore } from "@/features/store/store";
import { Prov } from "@/components/site/Prov";
import { GoalMark } from "@/components/site/GoalMark";
import { Sparkline } from "@/components/site/Sparkline";
import { useReveal } from "@/components/site/useReveal";
import { verifiedMilestones } from "@/features/store/rules";

export const Route = createFileRoute("/sdgs/$goal")({
  loader: ({ params }) => {
    const g = getGoal(Number(params.goal));
    if (!g) throw notFound();
    return { code: g.code, short: g.short, title: g.title };
  },
  head: ({ loaderData }) => {
    const t = loaderData ? `SDG ${pad(loaderData.code)} ${loaderData.short} — EARTH//OS` : "Goal not found — EARTH//OS";
    const d = loaderData ? `${loaderData.title}. Official targets, indicators, live data and connected goals.` : "This goal does not exist.";
    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-5 pt-40 text-center">
      <h1 className="font-display text-5xl text-bone">There are seventeen goals.</h1>
      <Link to="/sdgs" className="mt-6 inline-block text-sprout">See all goals →</Link>
    </div>
  ),
  component: GoalPage,
});

function DatasetCard({ d }: { d: Dataset }) {
  const q = useQuery({ ...worldSeriesQuery(d.code), enabled: d.worldAggregate });
  const last = q.data?.points[q.data.points.length - 1];
  return (
    <div className="border border-hairline p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-bone">{d.label}</p>
        <Prov kind="live" className="shrink-0" />
      </div>
      {!d.worldAggregate ? (
        <p className="mt-4 text-xs text-lichen">No world aggregate is published for this series. Country values are in the Earth Atlas.</p>
      ) : q.isPending ? (
        <div className="mt-4 h-16 animate-pulse rounded-sm bg-graphite" aria-label="Loading data" />
      ) : q.isError ? (
        <p className="mt-4 text-xs text-destructive">The World Bank API did not respond. Try again later.</p>
      ) : (
        <>
          <p className="mt-3 font-display text-4xl text-bone">
            {fmt(last?.value)} <span className="font-mono text-xs text-lichen">World · {last?.year}</span>
          </p>
          <div className="mt-3">
            <Sparkline points={q.data.points} label={d.label} />
          </div>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-lichen">
            World Bank WDI · {d.code}
            {d.unIndicator ? ` · relates to UN indicator ${d.unIndicator}` : ""}
            {q.data.lastUpdated ? ` · updated ${q.data.lastUpdated}` : ""}
          </p>
        </>
      )}
    </div>
  );
}

function GoalPage() {
  const { code } = Route.useLoaderData();
  const g = getGoal(code)!;
  const rel = relatedGoals(code);
  const ref = useReveal<HTMLDivElement>();
  const projects = useStore((s) => s.projects);
  const mine = useMemo(() => projects.filter((p) => p.goals.includes(code)), [projects, code]);
  const problems = CATEGORIES.filter((c) => c.targets.some((t) => t.code.startsWith(`${code}.`)));
  const interventions = CATEGORIES.flatMap((c) => c.interventions.filter((i) => i.effects.some((e) => e.goal === code)).map((i) => ({ c, i, e: i.effects.find((e) => e.goal === code)! })));
  const prev = GOALS[(code + 15) % 17]!;
  const next = GOALS[code % 17]!;

  return (
    <div ref={ref}>
      <header className="relative overflow-hidden border-b border-hairline px-5 pb-14 pt-32 md:px-10 md:pt-40">
        <div aria-hidden className="absolute -right-10 top-10 font-display text-[40vw] leading-none text-bone/[0.03] md:text-[28vw]">
          {pad(code)}
        </div>
        <div className="relative mx-auto max-w-[1400px]">
          <div data-reveal className="flex flex-wrap items-center gap-3">
            <Link to="/sdgs" className="eyebrow hover:text-bone">← All goals</Link>
            <GoalMark goal={code} />
            <Prov kind="official" />
          </div>
          <h1 data-reveal className="mt-6 max-w-5xl font-display text-6xl leading-[0.92] text-bone md:text-8xl">{g.short}</h1>
          <p data-reveal className="mt-5 max-w-3xl font-display text-2xl italic text-sprout md:text-3xl">{g.title}</p>
          <p data-reveal className="mt-6 max-w-3xl leading-relaxed text-lichen">{g.description}</p>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-12 px-5 py-14 md:px-10 lg:grid-cols-12">
        <section className="lg:col-span-7" aria-labelledby="targets-h">
          <div className="flex items-center justify-between">
            <h2 id="targets-h" className="eyebrow">Official targets · {g.targets.length}</h2>
            <Prov kind="official" />
          </div>
          <ol className="mt-4 divide-y divide-hairline border-y border-hairline">
            {g.targets.map((t) => (
              <li key={t.code} id={`t-${t.code}`} className="scroll-mt-24 py-5">
                <details className="group">
                  <summary className="flex cursor-pointer list-none gap-5">
                    <span className="w-12 shrink-0 font-mono text-sm text-sprout">{t.code}</span>
                    <span className="text-[15px] leading-relaxed text-bone/90">{t.description}</span>
                    <span aria-hidden className="ml-auto font-mono text-xs text-lichen transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <ul className="ml-17 mt-3 space-y-1.5 pl-[68px]">
                    {t.indicators.map((i) => (
                      <li key={i.code} className="text-xs leading-relaxed text-lichen">
                        <span className="font-mono text-bone/70">{i.code}</span> {i.description}
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ol>
        </section>

        <aside className="space-y-10 lg:col-span-5">
          <section aria-labelledby="data-h">
            <h2 id="data-h" className="eyebrow mb-4">Live global data</h2>
            <div className="space-y-4">
              {g.datasets.length === 0 ? (
                <p className="border border-hairline p-5 text-sm text-lichen">
                  No World Bank series maps cleanly to this goal. Use the{" "}
                  <a href="https://unstats.un.org/sdgs/dataportal" target="_blank" rel="noreferrer" className="text-sprout underline-offset-4 hover:underline">
                    UN Global SDG Indicators Database
                  </a>{" "}
                  for official series.
                </p>
              ) : (
                g.datasets.map((d) => <DatasetCard key={d.code} d={d} />)
              )}
            </div>
          </section>

          <section aria-labelledby="rel-h">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="rel-h" className="eyebrow">Connected goals</h2>
              <Prov kind="analysis" />
            </div>
            <ul className="divide-y divide-hairline border-y border-hairline">
              {rel.map((r) => (
                <li key={r.goal}>
                  <Link to="/sdgs/$goal" params={{ goal: String(r.goal) }} className="block py-3 hover:bg-forest">
                    <span className="flex items-center">
                      <GoalMark goal={r.goal} withName />
                      <span className={`ml-auto font-mono text-[10px] uppercase ${r.kind === "synergy" ? "text-biolume" : r.kind === "trade-off" ? "text-gold" : "text-lichen"}`}>{r.kind}</span>
                    </span>
                    <span className="mt-1 block text-xs text-lichen">{r.note}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="eyebrow">Related challenges</h2>
              <Prov kind="analysis" />
            </div>
            <div className="flex flex-wrap gap-2">
              {g.challenges.map((c) => (
                <span key={c} className="rounded-sm border border-hairline px-2.5 py-1 text-xs text-lichen">{c}</span>
              ))}
            </div>
            {problems.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {problems.map((c) => (
                  <Link key={c.id} to="/ripple" search={{ category: c.id }} className="rounded-sm bg-sprout/10 px-2.5 py-1 text-xs text-sprout hover:bg-sprout/20">
                    Analyse: {c.name} →
                  </Link>
                ))}
              </div>
            )}
          </section>

          {interventions.length > 0 && (
            <section>
              <h2 className="eyebrow mb-4">Interventions in the pilot</h2>
              <ul className="space-y-3">
                {interventions.map(({ i, e }) => (
                  <li key={i.id} className="text-sm">
                    <span className="text-bone">{i.name}</span>
                    <span className={`ml-2 font-mono text-[10px] uppercase ${e.kind === "positive" ? "text-sprout" : "text-gold"}`}>{e.kind}</span>
                    <span className="block text-xs text-lichen">{e.note}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="eyebrow mb-4">Projects on this device</h2>
            {mine.length === 0 ? (
              <p className="text-sm text-lichen">No projects linked to this goal yet.</p>
            ) : (
              <ul className="space-y-2">
                {mine.map((p) => (
                  <li key={p.id}>
                    <Link to="/projects/$id" params={{ id: p.id }} className="flex items-center gap-2 text-sm text-bone hover:text-sprout">
                      {p.title}
                      {p.sample && <Prov kind="sample" />}
                      <span className="ml-auto font-mono text-[10px] text-gold">{verifiedMilestones(p).length}/{p.milestones.length} verified</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <nav aria-label="Goal navigation" className="mx-auto grid max-w-[1400px] grid-cols-2 border-y border-hairline">
        <Link to="/sdgs/$goal" params={{ goal: String(prev.code) }} className="group border-r border-hairline p-6 md:p-10">
          <span className="eyebrow">← Previous</span>
          <span className="mt-2 block font-display text-2xl text-bone group-hover:italic md:text-4xl">{pad(prev.code)} {prev.short}</span>
        </Link>
        <Link to="/sdgs/$goal" params={{ goal: String(next.code) }} className="group p-6 text-right md:p-10">
          <span className="eyebrow">Next →</span>
          <span className="mt-2 block font-display text-2xl text-bone group-hover:italic md:text-4xl">{pad(next.code)} {next.short}</span>
        </Link>
      </nav>
    </div>
  );
}
