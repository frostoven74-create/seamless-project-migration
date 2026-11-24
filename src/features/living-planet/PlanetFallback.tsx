import { GOALS, pad, relatedGoals } from "@/features/sdg/sdgs";
import { CATEGORIES } from "@/features/ripple-engine/pilot";
import type { PlanetOverlay, PlanetSelection } from "./planet-data";

/** Lightweight 2D tree: used without WebGL, on request, and as the accessible alternative. */
export function PlanetFallback({
  selection,
  onSelect,
  overlay,
}: {
  selection: PlanetSelection;
  onSelect: (s: PlanetSelection) => void;
  overlay: PlanetOverlay;
}) {
  const cx = 400;
  const cy = 400;
  const sel =
    selection?.kind === "goal" ? selection.goal : selection?.kind === "target" ? Number(selection.code.split(".")[0]) : null;
  const rel = new Set(sel ? relatedGoals(sel).map((r) => r.goal) : []);
  const tips = GOALS.map((g, i) => {
    const th = ((190 + (i * 160) / 16) * Math.PI) / 180;
    const R = 300 - Math.abs(i - 8) * 6;
    return { g, x: cx + Math.cos(th) * R, y: cy + Math.sin(th) * R * 0.95, th };
  });
  const roots = CATEGORIES.map((c, k) => {
    const th = ((35 + (k * 110) / 4) * Math.PI) / 180;
    return { c, x: cx + Math.cos(th) * 230, y: 560 + Math.sin(th) * 120 };
  });
  return (
    <svg viewBox="0 0 800 720" className="h-full w-full" role="group" aria-label="Living Planet — two-dimensional view">
      <defs>
        <radialGradient id="canopy" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="var(--emerald)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--emerald)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="720" fill="url(#canopy)" />
      <path d={`M ${cx} 560 C ${cx - 8} 500, ${cx + 6} 450, ${cx} ${cy}`} stroke="var(--moss)" strokeWidth="16" fill="none" strokeLinecap="round" />
      {sel &&
        relatedGoals(sel).map((r) => {
          const a = tips[sel - 1]!;
          const b = tips[r.goal - 1]!;
          return (
            <path
              key={r.goal}
              d={`M ${a.x} ${a.y} Q ${cx} ${Math.min(a.y, b.y) - 120} ${b.x} ${b.y}`}
              fill="none"
              stroke={r.kind === "synergy" ? "var(--biolume)" : r.kind === "trade-off" ? "var(--gold)" : "var(--lichen)"}
              strokeDasharray={r.kind === "synergy" ? undefined : "6 5"}
              strokeOpacity="0.7"
            />
          );
        })}
      {tips.map(({ g, x, y }) => {
        const active = g.code === sel;
        const dim = sel !== null && !active && !rel.has(g.code);
        const leaves = overlay.leaves.filter((l) => l.goal === g.code);
        return (
          <g
            key={g.code}
            role="button"
            tabIndex={0}
            aria-pressed={active}
            aria-label={`Goal ${g.code}: ${g.short}`}
            onClick={() => onSelect({ kind: "goal", goal: g.code })}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect({ kind: "goal", goal: g.code }))}
            className="cursor-pointer outline-none"
            opacity={dim ? 0.3 : 1}
          >
            <path
              d={`M ${cx} ${cy + 20} Q ${(cx + x) / 2} ${(cy + y) / 2 - 40} ${x} ${y}`}
              stroke={active ? "var(--sprout)" : "var(--moss)"}
              strokeWidth={active ? 3 : 2}
              fill="none"
            />
            {g.targets.map((t, k) => {
              const s = 0.35 + (0.6 * k) / Math.max(1, g.targets.length - 1);
              const px = (1 - s) * (1 - s) * cx + 2 * (1 - s) * s * ((cx + x) / 2) + s * s * x;
              const py = (1 - s) * (1 - s) * (cy + 20) + 2 * (1 - s) * s * ((cy + y) / 2 - 40) + s * s * y;
              const on = selection?.kind === "target" && selection.code === t.code;
              return <circle key={t.code} cx={px} cy={py} r={on ? 4 : 1.6} fill={on ? "var(--gold)" : active ? "var(--biolume)" : "var(--sprout)"} opacity={0.8} />;
            })}
            {leaves.map((l, k) => (
              <circle key={l.milestoneId} cx={x + 14 + k * 8} cy={y - 10} r={3.5} fill={l.status === "verified" ? "var(--gold)" : "none"} stroke={l.status === "verified" ? "var(--gold)" : "var(--lichen)"} />
            ))}
            <circle cx={x} cy={y} r={14} fill="var(--void)" stroke={g.color} strokeWidth={1.5} />
            <text x={x} y={y + 4} textAnchor="middle" className="fill-bone font-mono text-[10px]">
              {pad(g.code)}
            </text>
          </g>
        );
      })}
      {roots.map(({ c, x, y }) => {
        const active = selection?.kind === "root" && selection.category === c.id;
        return (
          <g
            key={c.id}
            role="button"
            tabIndex={0}
            aria-pressed={active}
            aria-label={`Problem root: ${c.name}`}
            onClick={() => onSelect({ kind: "root", category: c.id })}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect({ kind: "root", category: c.id }))}
            className="cursor-pointer outline-none"
          >
            <path d={`M ${cx} 560 Q ${(cx + x) / 2} ${y - 10} ${x} ${y}`} stroke={active ? "var(--biolume)" : "var(--moss)"} strokeWidth={active ? 3 : 2} fill="none" />
            <circle cx={x} cy={y} r={5} fill="var(--biolume)" />
            <text x={x} y={y + 20} textAnchor="middle" className="fill-lichen font-mono text-[9px] uppercase tracking-widest">
              {c.name.split(" ")[0]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
