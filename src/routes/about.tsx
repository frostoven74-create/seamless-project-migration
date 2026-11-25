import { Link, createFileRoute } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/PageIntro";
import { Eyebrow, btnClass } from "@/components/site/ui";
import { Prov } from "@/components/site/Prov";
import { SOURCES } from "@/features/sdg/sources";
import { EVIDENCE_LIMITS, REVIEW_CHECKLIST, canComplete } from "@/features/store/rules";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Method, sources and verification | EARTH//OS" },
      {
        name: "description",
        content:
          "How EARTH//OS builds its pages: official UN text, live World Bank data, labelled editorial judgement, and an evidence review that decides when a milestone counts as verified.",
      },
      { property: "og:title", content: "How EARTH//OS works — method and sources" },
      {
        property: "og:description",
        content:
          "Official UN text, live World Bank indicators, labelled editorial judgement and a five-point evidence review. Here is what we use and what we cannot do.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

const LAYERS = [
  {
    kind: "official" as const,
    t: "Official text, verbatim",
    d: "Goal titles, target codes and indicator wording come from the UN Statistics Division SDG API, copied without rewriting.",
  },
  {
    kind: "live" as const,
    t: "Live public data",
    d: "World trend lines and country values are fetched from the World Bank's open indicator API when you open the page.",
  },
  {
    kind: "analysis" as const,
    t: "Our editorial judgement",
    d: "Which goals a problem touches, which interventions to suggest and how strongly goals pull on each other. This is ours, and it is open to challenge.",
  },
  {
    kind: "calculated" as const,
    t: "Calculated estimates",
    d: "Costs, savings and yields come from a stated formula on inputs you can see and change. Same inputs, same answer.",
  },
  {
    kind: "ai" as const,
    t: "AI research",
    d: "The Ripple Engine can draft background research with a language model. It is marked as AI-generated and is never treated as evidence.",
  },
  {
    kind: "sample" as const,
    t: "Hypothetical samples",
    d: "Some projects and passports are invented to show the workflow. They are flagged and can be hidden with one switch.",
  },
];

const LIMITS = [
  "The UN goal, target and indicator text is a bundled snapshot refreshed by hand, so it follows the framework revision current on the access date rather than the newest edit.",
  "World Bank series differ by country and indicator in which year is newest, and some are modelled estimates. The year is always shown next to a figure.",
  "Country markers sit on capital-city coordinates. They place a country on a map; they are not a project location.",
  "Evidence files are stored on your own device, up to 2 MB each, and projects live in this browser unless you export them. There is no shared server holding your projects yet.",
  "EARTH//OS is independent. It is not affiliated with, endorsed by or funded by the United Nations or any of the organisations listed below.",
];

function About() {
  return (
    <div>
      <PageIntro
        index="09"
        eyebrow="About"
        title={
          <>
            What we use, and what we <em className="text-sprout">won't</em> claim
          </>
        }
        lede="Every figure on EARTH//OS has a home. This page says where each one comes from, how a claim becomes verified, and the limits you should keep in mind before acting on any of it."
      >
        <div className="flex flex-wrap gap-3">
          <Link to="/ledger" className={btnClass("primary")}>
            See the evidence rules in use
          </Link>
          <Link to="/sdgs" className={btnClass("line")}>
            Browse the goals
          </Link>
        </div>
      </PageIntro>

      <section className="border-b border-hairline px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto grid max-w-[1400px] gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Eyebrow n="01">Method</Eyebrow>
            <h2 className="mt-4 font-display text-4xl leading-[1.02] text-bone md:text-5xl">Six layers, labelled</h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-lichen">
              Nothing on the site pretends to be something it is not. The same labels appear wherever the content does.
            </p>
          </div>
          <ul className="md:col-span-8">
            {LAYERS.map((l) => (
              <li key={l.kind} className="grid gap-3 border-b border-hairline py-5 sm:grid-cols-[190px_1fr] sm:gap-6">
                <span className="shrink-0">
                  <Prov kind={l.kind}>{l.t}</Prov>
                </span>
                <span className="text-lichen">{l.d}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-b border-hairline px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto grid max-w-[1400px] gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Eyebrow n="02">Verification</Eyebrow>
            <h2 className="mt-4 font-display text-4xl leading-[1.02] text-bone md:text-5xl">
              A result counts when it passes review
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-lichen">
              A reported number and a verified number are kept apart everywhere in the platform. A leaf on the Living
              Planet only turns gold after review.
            </p>
          </div>
          <div className="md:col-span-8">
            <p className="text-sm uppercase tracking-[0.14em] text-lichen">The reviewer's checklist</p>
            <ul className="mt-4">
              {REVIEW_CHECKLIST.map((c) => (
                <li key={c.key} className="flex items-baseline gap-4 border-b border-hairline py-3">
                  <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-sprout" />
                  <span className="text-bone/90">{c.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm leading-relaxed text-lichen">
              All five must hold, including independence — a team member cannot verify their own project. Evidence is
              accepted as {EVIDENCE_LIMITS.types.map((t) => t.split("/")[1]?.toUpperCase()).join(", ")} files of{" "}
              {Math.round(EVIDENCE_LIMITS.maxBytes / 1024 / 1024)} MB or less. A project can only be marked completed
              when{" "}
              <span className="text-bone">
                {canComplete({ milestones: [], evidence: [] } as never).reason.toLowerCase()}
              </span>
              .
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-hairline px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-[1400px]">
          <Eyebrow n="03">Source register</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-display text-4xl leading-[1.02] text-bone md:text-5xl">
            Every source, what we took from it, and what it cannot tell you
          </h2>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-lichen">
                  <th className="py-3 pr-6 font-normal">Source</th>
                  <th className="py-3 pr-6 font-normal">Used for</th>
                  <th className="py-3 font-normal">Limitations</th>
                </tr>
              </thead>
              <tbody>
                {SOURCES.map((s) => (
                  <tr key={s.id} className="border-b border-hairline align-top">
                    <td className="py-4 pr-6">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-bone underline decoration-hairline underline-offset-4 transition-colors hover:text-sprout"
                      >
                        {s.name}
                      </a>
                      <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-lichen">
                        {s.org} · {s.integration}
                      </span>
                    </td>
                    <td className="py-4 pr-6 text-lichen">{s.usedFor}</td>
                    <td className="py-4 text-lichen">{s.limitations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto grid max-w-[1400px] gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Eyebrow n="04">Limitations</Eyebrow>
            <h2 className="mt-4 font-display text-4xl leading-[1.02] text-bone md:text-5xl">Read before you act</h2>
          </div>
          <ul className="space-y-4 md:col-span-8">
            {LIMITS.map((l) => (
              <li key={l} className="flex items-baseline gap-4 text-lichen">
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-gold" />
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
