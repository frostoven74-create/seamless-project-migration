import { useMemo, useState } from "react";
import { getGoal, pad, relatedGoals, LINKS } from "@/features/sdg/sdgs";
import type { Effect } from "./pilot";

type Node = { goal: number; ring: 1 | 2 | 3; x: number; y: number; via?: number; note?: string };

/**
 * Ripple map: problem at the centre, goals it touches directly (ring 1), indirectly (ring 2)
 * and second-order goals reached through the relationship graph (ring 3).
 * Intervention effects are overlaid: gold halo = trade-off or negative risk.
 */
export function RippleGraph({
  direct,
  indirect,
  second,
  effects,
  label,
}: {
  direct: number[];
  indirect: number[];
  second: Map<number, { via: number; kind: string; note: string }>;
  effects: Record<number, Effect[]>;
  label: string;
}) {
  const [focus, setFocus] = useState<number | null>(null);
  const S = 640;
  const C = S / 2;
  const nodes = useMemo(() => {
    const place = (list: number[], r: number, ring: Node["ring"], offset: number): Node[] =>
      list.map((g, i) => {
        const a = offset + (i / Math.max(1, list.length)) * Math.PI * 2 - Math.PI / 2;
        return { goal: g, ring, x: C + Math.cos(a) * r, y: C + Math.sin(a) * r };
      });
    const secondList = [...second.keys()];
    return [
      ...place(direct, 115, 1, 0),
      ...place(indirect, 195, 2, 0.35),
      ...place(secondList, 278, 3, 0.15).map((n) => ({ ...n, via: second.get(n.goal)!.via, note: second.get(n.goal)!.note })),
    ];
  }, [direct, indirect, second, C]);
  const byGoal = new Map(nodes.map((n) => [n.goal, n]));

  const edges: { a: { x: number; y: number }; b: Node; kind: string; dashed: boolean }[] = [];
  for (const n of nodes) {
    if (n.ring === 1) edges.push({ a: { x: C, y: C }, b: n, kind: "direct", dashed: false });
    if (n.ring === 2) {
      const parent = direct.find((d) => LINKS.some((l) => (l.a === d && l.b === n.goal) || (l.b === d && l.a === n.goal)));
      edges.push({ a: parent ? byGoal.get(parent)! : { x: C, y: C }, b: n, kind: "indirect", dashed: !parent });
    }
    if (n.ring === 3 && n.via !== undefined) {
      const p = byGoal.get(n.via);
      if (p) edges.push({ a: p, b: n, kind: second.get(n.goal)?.kind ?? "synergy", dashed: true });
    }
  }

  const f = focus !== null ? byGoal.get(focus) : undefined;
  const fg = focus !== null ? getGoal(focus) : undefined;
  const fe = focus !== null ? (effects[focus] ?? []) : [];
  const ringName = (r: number) => (r === 1 ? "Direct" : r === 2 ? "Indirect" : "Second-order");

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <svg viewBox={`0 0 ${S} ${S}`} className="h-auto w-full" role="group" aria-label={`Ripple map for ${label}`}>
          <defs>
            <radialGradient id="rg-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--sprout)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--sprout)" stopOpacity="0" />
            </radialGradient>
          </defs>
          {[115, 195, 278].map((r, i) => (
            <circle key={r} cx={C} cy={C} r={r} fill="none" stroke="var(--hairline)" strokeDasharray={i === 2 ? "2 6" : undefined} />
          ))}
          {edges.map((e, i) => {
            const hot = focus !== null && (e.b.goal === focus || ("goal" in e.a && (e.a as Node).goal === focus));
            return (
              <line
                key={i}
                x1={e.a.x}
                y1={e.a.y}
                x2={e.b.x}
                y2={e.b.y}
                stroke={e.kind === "trade-off" ? "var(--gold)" : e.kind === "direct" ? "var(--sprout)" : "var(--biolume)"}
                strokeOpacity={hot ? 0.9 : e.b.ring === 3 ? 0.18 : 0.35}
                strokeWidth={hot ? 1.6 : 1}
                strokeDasharray={e.dashed ? "3 5" : undefined}
              />
            );
          })}
          <circle cx={C} cy={C} r={70} fill="url(#rg-core)" />
          <circle cx={C} cy={C} r={30} fill="var(--forest)" stroke="var(--sprout)" />
          <text x={C} y={C + 4} textAnchor="middle" className="fill-bone font-mono text-[10px] uppercase tracking-[0.14em]">
            Problem
          </text>
          {nodes.map((n) => {
            const g = getGoal(n.goal);
            const ef = effects[n.goal] ?? [];
            const warn = ef.some((e) => e.kind === "negative" || e.kind === "trade-off");
            const pos = ef.some((e) => e.kind === "positive");
            const r = n.ring === 1 ? 24 : n.ring === 2 ? 19 : 14;
            const active = focus === n.goal;
            return (
              <g
                key={n.goal}
                role="button"
                tabIndex={0}
                aria-label={`SDG ${n.goal} ${g?.short ?? ""}, ${ringName(n.ring)}${warn ? ", has trade-offs" : ""}`}
                aria-pressed={active}
                className="cursor-pointer outline-none"
                onClick={() => setFocus(active ? null : n.goal)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setFocus(active ? null : n.goal);
                  }
                }}
              >
                {warn && <circle cx={n.x} cy={n.y} r={r + 7} fill="none" stroke="var(--gold)" strokeOpacity="0.7" strokeDasharray="2 3" />}
                {pos && !warn && <circle cx={n.x} cy={n.y} r={r + 6} fill="none" stroke="var(--sprout)" strokeOpacity="0.35" />}
                <circle cx={n.x} cy={n.y} r={r} fill="var(--void)" stroke={g?.color} strokeWidth={active ? 3 : 1.5} />
                <circle cx={n.x} cy={n.y} r={r - 6} fill={g?.color} opacity={n.ring === 3 ? 0.25 : 0.55} />
                <text x={n.x} y={n.y + 4} textAnchor="middle" className="pointer-events-none fill-bone font-mono text-[11px]">
                  {pad(n.goal)}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.12em] text-lichen">
          <span><span className="mr-1.5 inline-block h-px w-5 bg-sprout align-middle" />Direct</span>
          <span><span className="mr-1.5 inline-block h-px w-5 bg-biolume align-middle" />Indirect / relationship</span>
          <span><span className="mr-1.5 inline-block size-2.5 rounded-full border border-dashed border-gold align-middle" />Trade-off or risk from an option</span>
        </div>
      </div>
      <div className="lg:col-span-5" aria-live="polite">
        {f && fg ? (
          <div className="border-l border-hairline pl-6">
            <p className="eyebrow">{ringName(f.ring)} · SDG {pad(fg.code)}</p>
            <h4 className="mt-2 font-display text-3xl leading-tight text-bone">{fg.short}</h4>
            <p className="mt-2 text-sm leading-relaxed text-lichen">{fg.title}</p>
            {f.ring === 3 && f.note && (
              <p className="mt-4 text-sm leading-relaxed text-bone/90">
                Reached through SDG {pad(f.via!)}: {f.note}
              </p>
            )}
            {fe.length > 0 && (
              <ul className="mt-5 space-y-3">
                {fe.map((e, i) => (
                  <li key={i} className="text-sm">
                    <span className={`font-mono text-[10px] uppercase tracking-[0.12em] ${e.kind === "positive" ? "text-sprout" : e.kind === "uncertain" ? "text-lichen" : "text-gold"}`}>{e.kind}</span>
                    <span className="block text-bone/90">{e.note}</span>
                  </li>
                ))}
              </ul>
            )}
            <ul className="mt-5 space-y-1.5 border-t border-hairline pt-4">
              {relatedGoals(fg.code)
                .filter((r) => byGoal.has(r.goal))
                .map((r) => (
                  <li key={r.goal} className="text-xs text-lichen">
                    <span className="font-mono text-bone/80">↔ {pad(r.goal)}</span> {r.note}
                  </li>
                ))}
            </ul>
          </div>
        ) : (
          <div className="border-l border-hairline pl-6">
            <p className="eyebrow">Reading the map</p>
            <p className="mt-3 text-sm leading-relaxed text-lichen">
              The inner ring holds goals the problem directly concerns. The middle ring holds goals it touches indirectly. The outer ring shows second-order goals reached through
              documented relationships. Select any goal to see why it is connected and what the options under comparison would do to it.
            </p>
            <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-hairline pt-5">
              <div><dt className="eyebrow">Direct</dt><dd className="mt-1 font-display text-4xl text-bone">{direct.length}</dd></div>
              <div><dt className="eyebrow">Indirect</dt><dd className="mt-1 font-display text-4xl text-bone">{indirect.length}</dd></div>
              <div><dt className="eyebrow">2nd order</dt><dd className="mt-1 font-display text-4xl text-bone">{second.size}</dd></div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
