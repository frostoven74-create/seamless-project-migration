import { Link } from "@tanstack/react-router";
import { GOALS, getGoal, getTarget, pad, relatedGoals } from "@/features/sdg/sdgs";
import { CATEGORIES, getCategory } from "@/features/ripple-engine/pilot";
import { Prov } from "@/components/site/Prov";
import { GoalMark } from "@/components/site/GoalMark";
import { STATUS_COPY } from "@/features/store/rules";
import type { PlanetOverlay, PlanetSelection } from "./planet-data";

function Section({ title, children, prov }: { title: string; children: React.ReactNode; prov?: React.ReactNode }) {
  return (
    <section className="border-t border-hairline py-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="eyebrow">{title}</h3>
        {prov}
      </div>
      {children}
    </section>
  );
}

export function PlanetPanel({
  selection,
  onSelect,
  overlay,
}: {
  selection: PlanetSelection;
  onSelect: (s: PlanetSelection) => void;
  overlay: PlanetOverlay;
}) {
  if (!selection) {
    return (
      <div>
        <p className="eyebrow">Choose a branch</p>
        <h2 className="mt-3 font-display text-3xl leading-tight text-bone">Seventeen branches, one living system.</h2>
        <p className="mt-3 text-sm leading-relaxed text-lichen">
          Drag to rotate, scroll or pinch to zoom, right-drag to pan. Select a branch for its official targets and
          relationships, or a root for the real-world problems that feed it.
        </p>
        <ul className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-hairline bg-hairline">
          {GOALS.map((g) => (
            <li key={g.code}>
              <button
                type="button"
                onClick={() => onSelect({ kind: "goal", goal: g.code })}
                className="flex w-full items-center gap-3 bg-void px-3 py-2.5 text-left transition-colors hover:bg-forest"
              >
                <span aria-hidden className="size-2 rounded-[1px]" style={{ background: g.color }} />
                <span className="w-6 font-mono text-[11px] text-lichen">{pad(g.code)}</span>
                <span className="text-sm text-bone">{g.short}</span>
                <span className="ml-auto font-mono text-[10px] text-lichen">{g.targets.length}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-lichen">Problem roots</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect({ kind: "root", category: c.id })}
              className="rounded-sm border border-hairline px-2.5 py-1.5 text-xs text-lichen transition-colors hover:border-biolume/50 hover:text-bone"
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (selection.kind === "root") {
    const c = getCategory(selection.category);
    if (!c) return null;
    return (
      <div>
        <p className="eyebrow text-biolume">Root · real-world problem</p>
        <h2 className="mt-3 font-display text-4xl leading-tight text-bone">{c.name}</h2>
        <p className="mt-3 text-sm text-lichen">“{c.prompt}”</p>
        <Section title="Common causes" prov={<Prov kind="analysis" />}>
          <ul className="space-y-1.5 text-sm text-bone/90">
            {c.causes.map((x) => (
              <li key={x}>— {x}</li>
            ))}
          </ul>
        </Section>
        <Section title="Feeds these branches" prov={<Prov kind="official">Official targets</Prov>}>
          <ul className="space-y-2">
            {c.targets.map((t) => (
              <li key={t.code}>
                <button type="button" onClick={() => onSelect({ kind: "target", code: t.code })} className="text-left text-sm text-lichen hover:text-bone">
                  <span className="font-mono text-xs text-sprout">{t.code}</span> · {t.relation} — {t.rationale}
                </button>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Possible interventions">
          <ul className="space-y-1 text-sm text-bone/90">
            {c.interventions.map((i) => (
              <li key={i.id}>{i.name}</li>
            ))}
          </ul>
        </Section>
        <Link
          to="/ripple"
          search={{ category: c.id }}
          className="mt-2 inline-flex items-center gap-2 rounded-sm bg-sprout px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-void transition-shadow hover:shadow-[var(--shadow-glow)]"
        >
          Analyse this challenge →
        </Link>
      </div>
    );
  }

  const goalCode = selection.kind === "goal" ? selection.goal : Number(selection.code.split(".")[0]);
  const g = getGoal(goalCode);
  if (!g) return null;
  const target = selection.kind === "target" ? getTarget(selection.code)?.target : undefined;
  const rel = relatedGoals(g.code);
  const problems = CATEGORIES.filter((c) => c.targets.some((t) => t.code.startsWith(`${g.code}.`)));
  const interventions = CATEGORIES.flatMap((c) => c.interventions.filter((i) => i.effects.some((e) => e.goal === g.code)).map((i) => ({ c, i, e: i.effects.find((e) => e.goal === g.code)! })));
  const leaves = overlay.leaves.filter((l) => l.goal === g.code);
  const buds = overlay.buds[g.code] ?? [];
  const shoots = overlay.shoots[g.code] ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <GoalMark goal={g.code} />
        <button type="button" onClick={() => onSelect(null)} className="font-mono text-[10px] uppercase tracking-[0.14em] text-lichen hover:text-bone">
          ← Whole tree
        </button>
      </div>
      <h2 className="mt-3 font-display text-4xl leading-[1.02] text-bone">{g.short}</h2>
      <p className="mt-2 text-sm italic text-lichen">{g.title}</p>

      {target && (
        <div className="mt-5 rounded-sm border border-gold/30 bg-gold/5 p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-gold">Target {target.code}</span>
            <Prov kind="official" />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-bone">{target.description}</p>
          {target.indicators.length > 0 && (
            <ul className="mt-3 space-y-1">
              {target.indicators.map((i) => (
                <li key={i.code} className="text-xs text-lichen">
                  <span className="font-mono text-bone/80">{i.code}</span> {i.description}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Section title={`Targets · ${g.targets.length}`} prov={<Prov kind="official" />}>
        <ul className="max-h-56 space-y-1 overflow-y-auto pr-2">
          {g.targets.map((t) => (
            <li key={t.code}>
              <button
                type="button"
                onClick={() => onSelect({ kind: "target", code: t.code })}
                aria-pressed={target?.code === t.code}
                className="w-full text-left text-xs leading-relaxed text-lichen hover:text-bone aria-pressed:text-gold"
              >
                <span className="font-mono text-bone/80">{t.code}</span> {t.description.length > 110 ? `${t.description.slice(0, 110)}…` : t.description}
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Related goals" prov={<Prov kind="analysis" />}>
        <ul className="space-y-2">
          {rel.map((r) => (
            <li key={r.goal}>
              <button type="button" onClick={() => onSelect({ kind: "goal", goal: r.goal })} className="group w-full text-left">
                <span className="flex items-center gap-2">
                  <GoalMark goal={r.goal} withName />
                  <span className={`ml-auto font-mono text-[10px] uppercase ${r.kind === "synergy" ? "text-biolume" : r.kind === "trade-off" ? "text-gold" : "text-lichen"}`}>{r.kind}</span>
                </span>
                <span className="mt-0.5 block text-xs text-lichen group-hover:text-bone">{r.note}</span>
              </button>
            </li>
          ))}
        </ul>
      </Section>

      {problems.length > 0 && (
        <Section title="Connected problems">
          <div className="flex flex-wrap gap-2">
            {problems.map((c) => (
              <button key={c.id} type="button" onClick={() => onSelect({ kind: "root", category: c.id })} className="rounded-sm border border-biolume/30 px-2.5 py-1 text-xs text-biolume hover:bg-biolume/10">
                {c.name}
              </button>
            ))}
          </div>
        </Section>
      )}

      {interventions.length > 0 && (
        <Section title="Interventions touching this goal" prov={<Prov kind="analysis" />}>
          <ul className="space-y-2">
            {interventions.slice(0, 8).map(({ c, i, e }) => (
              <li key={i.id} className="text-xs">
                <Link to="/ripple" search={{ category: c.id }} className="text-bone hover:text-sprout">
                  {i.name}
                </Link>
                <span className={`ml-2 font-mono text-[10px] uppercase ${e.kind === "positive" ? "text-sprout" : e.kind === "trade-off" ? "text-gold" : "text-lichen"}`}>{e.kind}</span>
                <span className="block text-lichen">{e.note}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="On this branch">
        <dl className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-sm border border-hairline p-3">
            <dt className="font-mono text-[10px] uppercase text-lichen">Buds</dt>
            <dd className="font-display text-2xl text-biolume">{buds.length}</dd>
          </div>
          <div className="rounded-sm border border-hairline p-3">
            <dt className="font-mono text-[10px] uppercase text-lichen">Shoots</dt>
            <dd className="font-display text-2xl text-emerald">{shoots.length}</dd>
          </div>
          <div className="rounded-sm border border-hairline p-3">
            <dt className="font-mono text-[10px] uppercase text-lichen">Verified leaves</dt>
            <dd className="font-display text-2xl text-gold">{leaves.filter((l) => l.status === "verified").length}</dd>
          </div>
        </dl>
        {buds.map((b) => (
          <Link key={b.id} to="/passports/$id" params={{ id: b.id }} className="mt-3 block text-xs text-lichen hover:text-bone">
            Bud · {b.title} {b.sample && <Prov kind="sample" className="ml-1" />}
          </Link>
        ))}
        {leaves.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {leaves.map((l) => (
              <li key={l.milestoneId} className="flex items-center gap-2 text-xs">
                <span aria-hidden className={`size-2 rounded-full ${l.status === "verified" ? "bg-gold" : "border border-lichen"}`} />
                <Link to="/projects/$id" params={{ id: l.projectId }} className="text-lichen hover:text-bone">
                  {l.title}
                </Link>
                <span className="ml-auto font-mono text-[10px] uppercase text-lichen">{STATUS_COPY[l.status]?.label}</span>
              </li>
            ))}
          </ul>
        )}
        {leaves.length === 0 && buds.length === 0 && (
          <p className="mt-3 text-xs text-lichen">Nothing growing here yet. Leaves appear only from real project milestones.</p>
        )}
      </Section>

      <div className="mt-2 flex flex-wrap gap-3">
        <Link to="/sdgs/$goal" params={{ goal: String(g.code) }} className="rounded-sm border border-hairline px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-bone hover:border-sprout/60">
          Open goal {pad(g.code)} →
        </Link>
      </div>
    </div>
  );
}
