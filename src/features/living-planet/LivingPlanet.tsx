import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useState } from "react";
import type { PlanetOverlay, PlanetSelection } from "./planet-data";
import { PlanetFallback } from "./PlanetFallback";

const TreeScene = lazy(() => import("./TreeScene"));

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function useMotionPrefs() {
  const [reduced, setReduced] = useState(false);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    setWebgl(hasWebGL());
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return { reduced, webgl };
}

export function PlanetLoading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center" role="status">
      <div className="relative flex size-16 items-center justify-center">
        <span className="absolute inset-0 animate-[pulse-ring_2s_var(--ease-organic)_infinite] rounded-full border border-sprout/50" />
        <span className="size-1.5 rounded-full bg-sprout" />
      </div>
      <span className="sr-only">Growing the Living Planet…</span>
    </div>
  );
}

export function LivingPlanet({
  selection,
  onSelect,
  overlay,
  view,
  interactive = true,
}: {
  selection: PlanetSelection;
  onSelect: (s: PlanetSelection) => void;
  overlay: PlanetOverlay;
  view: "3d" | "2d";
  interactive?: boolean;
}) {
  const { reduced, webgl } = useMotionPrefs();
  return (
    <ClientOnly fallback={<PlanetLoading />}>
      {webgl === null ? (
        <PlanetLoading />
      ) : view === "2d" || !webgl ? (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <PlanetFallback selection={selection} onSelect={onSelect} overlay={overlay} />
        </div>
      ) : (
        <Suspense fallback={<PlanetLoading />}>
          <TreeScene selection={selection} onSelect={onSelect} overlay={overlay} interactive={interactive} reducedMotion={reduced} />
        </Suspense>
      )}
    </ClientOnly>
  );
}
