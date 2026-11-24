import { createFileRoute } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/PageIntro";
import { Prov } from "@/components/site/Prov";
import { RippleWorkbench } from "@/features/ripple-engine/RippleWorkbench";

export const Route = createFileRoute("/ripple")({
  validateSearch: (s: Record<string, unknown>): { category?: string } => (typeof s["category"] === "string" ? { category: s["category"] } : {}),
  head: () => ({
    meta: [
      { title: "Ripple Engine — analyse a sustainability challenge · EARTH//OS" },
      { name: "description", content: "Define a problem, investigate causes, map its ripple effects across the SDGs, compare costed options and generate a Solution Passport." },
      { property: "og:title", content: "Ripple Engine — EARTH//OS" },
      { property: "og:description", content: "A traceable problem-to-solution workflow: causes, SDG ripple map, option comparison, scenarios and a Solution Passport." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RipplePage,
});

function RipplePage() {
  const { category } = Route.useSearch();
  return (
    <>
      <PageIntro
        index="04"
        eyebrow="Ripple Engine"
        title={<>Every problem <em className="text-sprout">ripples.</em></>}
        lede="A decision-support workflow, not a chatbot. Describe a challenge, see which goals it touches, compare practical options on transparent criteria and leave with a plan you can measure."
      >
        <div className="flex flex-wrap gap-2">
          <Prov kind="official" /> <Prov kind="analysis" /> <Prov kind="calculated" /> <Prov kind="ai" />
        </div>
      </PageIntro>
      <RippleWorkbench initialCategory={category} />
    </>
  );
}
