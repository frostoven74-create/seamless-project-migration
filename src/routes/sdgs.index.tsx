import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { GOALS, TOTAL_INDICATORS, TOTAL_TARGETS, pad } from "@/features/sdg/sdgs";
import { PageIntro } from "@/components/site/PageIntro";
import { Prov } from "@/components/site/Prov";
import { useReveal } from "@/components/site/useReveal";

export const Route = createFileRoute("/sdgs/")({
  head: () => ({
    meta: [
      { title: "Explore the 17 SDGs — EARTH//OS" },
      { name: "description", content: "All 17 UN Sustainable Development Goals with their 169 official targets and indicators, searchable." },
      { property: "og:title", content: "Explore the 17 SDGs — EARTH//OS" },
      { property: "og:description", content: "Search every official SDG target and indicator, then follow how the goals connect." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SdgIndex,
});

function SdgIndex() {
  const [q, setQ] = useState("");
  const ref = useReveal<HTMLUListElement>({ stagger: 0.03 });
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return GOALS.flatMap((g) =>
      g.targets
        .filter((t) => t.description.toLowerCase().includes(s) || t.code === s || t.indicators.some((i) => i.description.toLowerCase().includes(s)))
        .map((t) => ({ g, t })),
    ).slice(0, 40);
  }, [q]);

  return (
    <>
      <PageIntro
        index="03"
        eyebrow="Explore SDGs"
        title={
          <>
            Seventeen goals. <em className="text-sprout">One</em> agenda.
          </>
        }
        lede={`The 2030 Agenda's ${GOALS.length} goals, ${TOTAL_TARGETS} targets and ${TOTAL_INDICATORS} indicator entries — shown verbatim from the UN Statistics Division, with EARTH//OS analysis clearly separated.`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Prov kind="official" />
          <span className="text-xs text-lichen">Source: UN SDG API, accessed 22 Nov 2026</span>
        </div>
      </PageIntro>

      <section className="mx-auto max-w-[1400px] px-5 py-10 md:px-10">
        <label htmlFor="target-search" className="eyebrow">
          Search all targets and indicators
        </label>
        <input
          id="target-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. water-use efficiency, 12.3, renewable…"
          className="mt-3 w-full border-b border-hairline bg-transparent py-3 font-display text-3xl text-bone placeholder:text-lichen/40 focus:border-sprout focus:outline-none md:text-4xl"
        />
        {q.trim().length >= 2 && (
          <div className="mt-6" aria-live="polite">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lichen">{hits.length} matching targets{hits.length === 40 ? " (first 40)" : ""}</p>
            <ul className="mt-3 divide-y divide-hairline border-y border-hairline">
              {hits.map(({ g, t }) => (
                <li key={t.code}>
                  <Link to="/sdgs/$goal" params={{ goal: String(g.code) }} hash={`t-${t.code}`} className="flex gap-4 py-3 hover:bg-forest">
                    <span className="w-14 shrink-0 font-mono text-xs text-sprout">{t.code}</span>
                    <span className="text-sm text-bone/90">{t.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-[1400px] px-5 md:px-10">
        <ul ref={ref} className="grid border-l border-t border-hairline sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {GOALS.map((g) => (
            <li key={g.code} data-reveal className="border-b border-r border-hairline">
              <Link to="/sdgs/$goal" params={{ goal: String(g.code) }} className="group relative flex h-full min-h-64 flex-col p-6 transition-colors hover:bg-forest">
                <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-700 ease-[var(--ease-organic)] group-hover:scale-x-100" style={{ background: g.color }} />
                <span className="font-display text-7xl leading-none text-bone/20 transition-colors group-hover:text-bone">{pad(g.code)}</span>
                <span className="mt-auto pt-8 font-display text-2xl leading-tight text-bone">{g.short}</span>
                <span className="mt-2 text-xs leading-relaxed text-lichen">{g.title}</span>
                <span className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-lichen">
                  {g.targets.length} targets · {g.targets.reduce((n, t) => n + t.indicators.length, 0)} indicators
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
