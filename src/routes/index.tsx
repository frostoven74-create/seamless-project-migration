import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { LivingPlanet } from "@/features/living-planet/LivingPlanet";
import { buildOverlay } from "@/features/living-planet/planet-data";
import { useStore } from "@/features/store/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EARTH//OS — The Living Planet" },
      { name: "description", content: "From problems to possibilities: explore the 17 UN SDGs as one living system and turn challenges into measurable action." },
      { property: "og:title", content: "EARTH//OS — The Living Planet" },
      { property: "og:description", content: "Explore the 17 UN SDGs as one living system and turn challenges into measurable action." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const state = useStore((s) => s);
  const overlay = useMemo(() => buildOverlay(state, true), [state]);
  return (
    <section className="relative h-[100svh] overflow-hidden">
      <LivingPlanet selection={null} onSelect={() => undefined} overlay={overlay} view="3d" interactive={false} />
      <div className="pointer-events-none absolute inset-0 bg-[image:var(--gradient-horizon)]" />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1400px] px-5 pb-14 md:px-10">
        <p className="eyebrow">EARTH//OS — The Living Planet</p>
        <h1 className="mt-4 max-w-4xl font-display text-6xl leading-[0.92] text-bone md:text-8xl">
          From problems <em className="text-sprout">to possibilities.</em>
        </h1>
        <p className="mt-5 max-w-xl text-lichen">
          A living map of the 17 UN Sustainable Development Goals that connects real problems to practical, measurable solutions.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/planet" className="rounded-sm bg-sprout px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-void">Explore the Living Planet</Link>
          <Link to="/ripple" className="rounded-sm border border-hairline px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-bone">Analyse a challenge</Link>
          <Link to="/sdgs" className="rounded-sm border border-hairline px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-bone">Discover the SDGs</Link>
        </div>
      </div>
    </section>
  );
}
