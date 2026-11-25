import { Link, createFileRoute } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/PageIntro";
import { Eyebrow, btnClass } from "@/components/site/ui";
import { Prov } from "@/components/site/Prov";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover — Why the 17 SDGs are one system | EARTH//OS" },
      {
        name: "description",
        content:
          "The 17 Sustainable Development Goals are not 17 separate projects. See how acting on one goal moves others — synergies and trade-offs — and how EARTH//OS turns that into action.",
      },
      { property: "og:title", content: "Why the 17 SDGs are one system — EARTH//OS" },
      {
        property: "og:description",
        content:
          "Acting on one goal moves others. EARTH//OS maps the synergies and trade-offs between the 17 goals and turns them into measurable projects.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Discover,
});

const GRAMMAR = [
  { k: "Roots", d: "The real-world problems underneath — water, waste, energy, food, learning." },
  { k: "Branches", d: "The 17 goals. Each one grows out of the trunk, not out of the page." },
  { k: "Twigs", d: "The 169 official targets, held on the branch that owns them." },
  { k: "Glowing buds", d: "Interventions proposed by a Solution Passport." },
  { k: "Shoots", d: "Projects that are active or completed." },
  { k: "Leaves", d: "Project milestones. A leaf turns gold only when its evidence has passed review." },
];

const PATH = [
  { to: "/planet", n: "01", t: "See the system", d: "Open the Living Planet and follow a problem from its roots to the goals it touches." },
  { to: "/ripple", n: "02", t: "Analyse a challenge", d: "Name the problem, trace causes and ripple effects, and compare costed options." },
  { to: "/passports", n: "03", t: "Write the plan", d: "Turn the chosen option into a Solution Passport: budget, stages, risks, indicators." },
  { to: "/projects", n: "04", t: "Run the project", d: "Set a baseline, add milestones and record what actually happened." },
  { to: "/ledger", n: "05", t: "Prove it", d: "Evidence goes through independent review before a milestone counts as verified." },
  { to: "/atlas", n: "06", t: "Compare with the world", d: "Put your project next to live World Bank indicators for the same country." },
] as const;

function Discover() {
  return (
    <div>
      <PageIntro
        index="00"
        eyebrow="Discover"
        title={
          <>
            One goal is never <em className="text-sprout">one goal.</em>
          </>
        }
        lede="Clean water changes attendance. Attendance changes income. Income changes what a household can spend on fuel. The 17 goals describe the same world from different angles, so acting on one moves the others — sometimes helping, sometimes pulling the other way."
      >
        <div className="flex flex-wrap gap-3">
          <Link to="/planet" className={btnClass("primary")}>
            Open the Living Planet
          </Link>
          <Link to="/ripple" className={btnClass("line")}>
            Analyse a challenge
          </Link>
        </div>
      </PageIntro>

      <section className="border-b border-hairline px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto grid max-w-[1400px] gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Eyebrow n="01">The premise</Eyebrow>
            <h2 className="mt-4 font-display text-4xl leading-[1.02] text-bone md:text-5xl">
              Interactions, not a checklist
            </h2>
          </div>
          <div className="space-y-5 text-lichen md:col-span-8">
            <p className="text-lg leading-relaxed">
              EARTH//OS follows the idea set out in the International Science Council's <em>Guide to SDG Interactions</em>{" "}
              (2017): goals relate to each other as <span className="text-bone">synergies</span>, where progress on one
              helps another, and as <span className="text-bone">trade-offs</span>, where pushing one goal can slow
              another. A plan that ignores those links quietly moves the problem somewhere else.
            </p>
            <p className="leading-relaxed">
              The links drawn on the tree are our editorial reading of that framework, not official scores. Each one is
              labelled so you can see where the number came from and argue with it.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Prov kind="official">Official UN text</Prov>
              <Prov kind="analysis">Our reading</Prov>
              <Prov kind="calculated">Calculated estimate</Prov>
              <Prov kind="sample">Hypothetical sample</Prov>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-hairline px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto grid max-w-[1400px] gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Eyebrow n="02">How to read the tree</Eyebrow>
            <h2 className="mt-4 font-display text-4xl leading-[1.02] text-bone md:text-5xl">Six parts, one story</h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-lichen">
              Every part of the Living Planet stands for something real in the platform. Nothing is decoration.
            </p>
          </div>
          <ul className="md:col-span-8">
            {GRAMMAR.map((g) => (
              <li key={g.k} className="grid gap-2 border-b border-hairline py-4 sm:grid-cols-[160px_1fr] sm:gap-6">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-sprout">{g.k}</span>
                <span className="text-lichen">{g.d}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-[1400px]">
          <Eyebrow n="03">The path</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-display text-4xl leading-[1.02] text-bone md:text-5xl">
            From a problem you can name to a result you can prove
          </h2>
          <ol className="mt-10 grid gap-x-10 gap-y-6 md:grid-cols-3">
            {PATH.map((p) => (
              <li key={p.to}>
                <Link to={p.to} className="group block border-t border-hairline pt-4">
                  <span className="font-mono text-[11px] tracking-[0.16em] text-sprout">{p.n}</span>
                  <span className="mt-2 block font-display text-2xl text-bone transition-colors group-hover:text-sprout">
                    {p.t}
                  </span>
                  <span className="mt-2 block text-sm leading-relaxed text-lichen">{p.d}</span>
                </Link>
              </li>
            ))}
          </ol>
          <p className="mt-12 max-w-2xl text-sm leading-relaxed text-lichen">
            EARTH//OS is an independent project. It is not affiliated with, endorsed by or funded by the United Nations.
            Official UN content is labelled; everything else says where it came from.
          </p>
        </div>
      </section>
    </div>
  );
}
