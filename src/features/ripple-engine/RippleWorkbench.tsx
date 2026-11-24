import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CATEGORIES, DEFAULT_SCENARIO, INFRA_LABELS, emptyValues, evidenceBasis, feasibility, getCategory, rippleMap, sampleValues, type Category, type Effect, type Infra, type Intervention, type Scenario, type Values } from "./pilot";
import { buildPassport, uid } from "./passport";
import { RippleGraph } from "./RippleGraph";
import { runRippleResearch } from "@/features/ai/research.functions";
import type { SanitisedBrief } from "@/features/ai/brief";
import { countriesQuery, fmt } from "@/features/sdg/worldbank";
import { getTarget, pad } from "@/features/sdg/sdgs";
import { getSource } from "@/features/sdg/sources";
import { apply, nowIso } from "@/features/store/commit";
import { logAiRun, savePassport } from "@/features/store/actions";
import type { AiBrief, TargetRef } from "@/features/store/types";
import { Prov } from "@/components/site/Prov";
import { GoalMark } from "@/components/site/GoalMark";
import { Btn, Check, Eyebrow, NumInput, Select, TextArea, TextInput, money } from "@/components/site/ui";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = { measured: "Measure locally", assumption: "Assumption", price: "Local price", plan: "Your plan", target: "Your target" };
const COMPLEXITY = ["", "Low", "Medium", "High"];

function Step({ n, title, lede, children, id }: { n: string; title: string; lede?: React.ReactNode; children: React.ReactNode; id: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 border-t border-hairline py-14 md:py-20">
      <div className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-3">
          <p className="font-display text-7xl leading-none text-bone/15 md:text-8xl">{n}</p>
        </div>
        <div className="md:col-span-9">
          <h2 id={`${id}-h`} className="font-display text-4xl leading-tight text-bone md:text-5xl">{title}</h2>
          {lede && <p className="mt-3 max-w-2xl leading-relaxed text-lichen">{lede}</p>}
          <div className="mt-10">{children}</div>
        </div>
      </div>
    </section>
  );
}

type AiState = { status: "idle" } | { status: "loading" } | { status: "error"; error: string } | { status: "ok"; brief: SanitisedBrief; runId: string; dropped: number };

export function RippleWorkbench({ initialCategory }: { initialCategory?: string | undefined }) {
  const navigate = useNavigate();
  const research = useServerFn(runRippleResearch);
  const countries = useQuery(countriesQuery);

  const [catId, setCatId] = useState<Category["id"]>((getCategory(initialCategory ?? "")?.id ?? "water") as Category["id"]);
  const cat = getCategory(catId)!;
  const [problem, setProblem] = useState(cat.prompt);
  const [country, setCountry] = useState("");
  const [place, setPlace] = useState("");
  const [affected, setAffected] = useState("");
  const [conditions, setConditions] = useState("");
  const [resources, setResources] = useState("");
  const [scenario, setScenario] = useState<Scenario>(DEFAULT_SCENARIO);
  const [causes, setCauses] = useState<string[]>(cat.causes.slice(0, 3));
  const [extraCauses, setExtraCauses] = useState<string[]>([]);
  const [ai, setAi] = useState<AiState>({ status: "idle" });
  const [aiTargets, setAiTargets] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, Values>>(() => Object.fromEntries(cat.interventions.map((i) => [i.id, emptyValues(i)])));
  const [sampled, setSampled] = useState<Record<string, boolean>>({});
  const [compare, setCompare] = useState<string[]>(cat.interventions.map((i) => i.id));
  const [chosen, setChosen] = useState<string>(cat.interventions[0]!.id);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [open, setOpen] = useState<string | null>(cat.interventions[0]!.id);

  const switchCategory = (id: Category["id"]) => {
    const c = getCategory(id)!;
    setCatId(id);
    setProblem(c.prompt);
    setCauses(c.causes.slice(0, 3));
    setExtraCauses([]);
    setAi({ status: "idle" });
    setAiTargets([]);
    setValues(Object.fromEntries(c.interventions.map((i) => [i.id, emptyValues(i)])));
    setSampled({});
    setCompare(c.interventions.map((i) => i.id));
    setChosen(c.interventions[0]!.id);
    setOpen(c.interventions[0]!.id);
    setBaseline(null);
  };

  const countryName = countries.data?.find((c) => c.id === country)?.name ?? "";

  const targets: TargetRef[] = useMemo(() => {
    const base = cat.targets.map((t) => ({ ...t, origin: "pilot" as const }));
    if (ai.status !== "ok") return base;
    const extra = ai.brief.targets.filter((t) => aiTargets.includes(t.code) && !base.some((b) => b.code === t.code)).map((t) => ({ ...t, origin: "ai" as const }));
    return [...base, ...extra];
  }, [cat, ai, aiTargets]);

  const map = useMemo(() => rippleMap(targets), [targets]);
  const compared = cat.interventions.filter((i) => compare.includes(i.id));
  const effects = useMemo(() => {
    const out: Record<number, Effect[]> = {};
    for (const i of compared) for (const e of i.effects) (out[e.goal] ??= []).push({ ...e, note: `${i.name}: ${e.note}` });
    return out;
  }, [compared]);
  // Goals touched by options but outside the problem map become visible as second-order effects.
  const second = useMemo(() => {
    const m = new Map(map.second);
    for (const [g, list] of Object.entries(effects)) {
      const goal = Number(g);
      if (map.direct.includes(goal) || map.indirect.includes(goal) || m.has(goal)) continue;
      m.set(goal, { via: map.direct[0] ?? 12, kind: list.some((e) => e.kind !== "positive") ? "trade-off" : "synergy", note: list.map((e) => e.note).join(" ") });
    }
    return m;
  }, [map, effects]);

  const setScen = (p: Partial<Scenario>) => setScenario((s) => ({ ...s, ...p }));
  const toggleInfra = (k: Infra, on: boolean) => setScen({ infra: on ? [...scenario.infra, k] : scenario.infra.filter((x) => x !== k) });

  async function runAi() {
    setAi({ status: "loading" });
    try {
      const r = await research({
        data: {
          categoryId: catId,
          problem,
          countryName,
          place,
          affected,
          conditions,
          resources,
          budget: scenario.budget,
          currency: scenario.currency,
          months: scenario.months,
          beneficiaries: scenario.beneficiaries,
          infra: scenario.infra.map((k) => INFRA_LABELS[k]),
        },
      });
      const runId = uid("run");
      apply((s) =>
        logAiRun(s, {
          id: runId,
          at: nowIso(),
          promptVersion: r.promptVersion,
          model: r.model,
          latencyMs: r.latencyMs,
          ok: r.ok,
          droppedTargets: r.ok ? r.droppedTargets : [],
          droppedSources: r.ok ? r.droppedSources : [],
          ...(r.ok ? {} : { error: r.error }),
        }),
      );
      if (!r.ok) {
        setAi({ status: "error", error: r.error });
        return;
      }
      setAi({ status: "ok", brief: r.brief, runId, dropped: r.droppedTargets.length + r.droppedSources.length });
      setAiTargets([]);
    } catch (e) {
      const msg = e instanceof Error && /min|max|least|Describe/.test(e.message) ? "Check the problem description: it needs at least one full sentence." : "The research step could not be reached. The pilot analysis below still works.";
      setAi({ status: "error", error: msg });
    }
  }

  function generate() {
    const i = cat.interventions.find((x) => x.id === chosen)!;
    const now = nowIso();
    const aiBrief: AiBrief | null = ai.status === "ok" ? { ...ai.brief, runId: ai.runId } : null;
    const p = buildPassport({
      id: uid("pp"),
      now,
      category: cat,
      intervention: i,
      values: values[i.id] ?? {},
      scenario,
      problem,
      ...(title.trim() ? { title: title.trim() } : {}),
      location: { country, countryName, place: place.trim() },
      causes: [...causes, ...extraCauses],
      targets,
      baselineValue: baseline,
      ai: aiBrief,
    });
    if (aiBrief) for (const sid of aiBrief.sourceIds) if (!p.research.some((r) => r.sourceId === sid)) p.research.push({ sourceId: sid, note: "Suggested by the AI research step from the EARTH//OS register — relevance not independently checked." });
    if (sampled[i.id]) p.limitations.unshift("Some inputs are hypothetical sample values loaded for demonstration. Replace them with local measurements.");
    apply((s) => savePassport(s, p), "Solution Passport saved on this device.");
    void navigate({ to: "/passports/$id", params: { id: p.id } });
  }

  const steps = [
    ["define", "Define"],
    ["research", "Research"],
    ["ripple", "Ripple map"],
    ["solutions", "Solutions"],
    ["compare", "Compare"],
    ["scenario", "Scenario"],
    ["passport", "Passport"],
  ] as const;

  return (
    <div className="mx-auto max-w-[1400px] px-5 md:px-10">
      <nav aria-label="Ripple Engine steps" className="no-print sticky top-16 z-30 -mx-5 mb-2 overflow-x-auto border-b border-hairline bg-void/85 px-5 backdrop-blur-md md:-mx-10 md:px-10">
        <ol className="flex min-w-max gap-6 py-3">
          {steps.map(([id, label], i) => (
            <li key={id}>
              <a href={`#${id}`} className="font-mono text-[10px] uppercase tracking-[0.14em] text-lichen transition-colors hover:text-sprout">
                <span className="text-sprout">{pad(i + 1)}</span> {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* 01 DEFINE */}
      <Step n="01" id="define" title="Define the problem" lede="Choose a pilot category, describe what you see and record the conditions. Do not enter street addresses or the names of students.">
        <fieldset>
          <legend className="eyebrow mb-3">Pilot category · School Resource Intelligence</legend>
          <div className="grid gap-px overflow-hidden rounded-sm border border-hairline bg-hairline sm:grid-cols-5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={c.id === catId}
                onClick={() => switchCategory(c.id)}
                className={cn("bg-void p-4 text-left transition-colors hover:bg-forest", c.id === catId && "bg-moss")}
              >
                <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-sprout">{c.interventions.length} options</span>
                <span className="mt-2 block text-sm text-bone">{c.name}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <TextArea label="The problem" value={problem} onChange={(e) => setProblem(e.target.value)} className="md:col-span-2" maxLength={2000} />
          <Select label="Country" value={country} onChange={(e) => setCountry(e.target.value)} hint={countries.isError ? "Country list unavailable right now." : "From the World Bank country list."}>
            <option value="">Not specified</option>
            {countries.data?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <TextInput label="School or site name" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="e.g. Riverside Primary" maxLength={120} hint="A name only — no street address." />
          <TextInput label="Who is affected" value={affected} onChange={(e) => setAffected(e.target.value)} placeholder="e.g. 850 students and 60 staff" maxLength={400} />
          <TextInput label="Available resources" value={resources} onChange={(e) => setResources(e.target.value)} placeholder="e.g. caretaker 4 h/week, eco-club" maxLength={800} />
          <TextArea label="Existing conditions" value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="What you already know: meter readings, bills, observations…" className="md:col-span-2" maxLength={1500} />
        </div>
        <p className="mt-4 text-xs text-lichen">Budget, time, people in scope and infrastructure are set in step 06 and can be changed at any point.</p>
      </Step>

      {/* 02 RESEARCH */}
      <Step n="02" id="research" title="Investigate the causes" lede="Start from the pilot knowledge base, then optionally ask the AI research step for a structured brief. Nothing is treated as fact until you measure it.">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="eyebrow">Possible root causes</h3>
              <Prov kind="analysis" />
            </div>
            <div className="space-y-3">
              {cat.causes.map((c) => (
                <Check key={c} label={c} checked={causes.includes(c)} onChange={(on) => setCauses(on ? [...causes, c] : causes.filter((x) => x !== c))} />
              ))}
              {extraCauses.map((c) => (
                <Check key={c} label={<>{c} <Prov kind="ai" className="ml-1" /></>} checked onChange={() => setExtraCauses(extraCauses.filter((x) => x !== c))} />
              ))}
            </div>
            <h3 className="eyebrow mb-3 mt-10">Evidence base for this category</h3>
            <ul className="space-y-3">
              {cat.sources.map((sid) => {
                const s = getSource(sid);
                if (!s) return null;
                return (
                  <li key={sid} className="border-l border-hairline pl-4 text-sm">
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-bone hover:text-sprout">{s.name} ↗</a>
                    <span className="block text-xs text-lichen">{s.org}{s.published ? ` · ${s.published}` : ""} · accessed {s.accessed}</span>
                    <span className="mt-1 block text-xs text-lichen/80">Used for: {s.usedFor}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-sm border border-hairline bg-forest/40 p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="eyebrow">AI research brief</h3>
              <Prov kind="ai" />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-lichen">
              Four roles — research, SDG mapping, solution design and impact review — run on the server. The model may only cite sources in the EARTH//OS register and only official target codes;
              anything else is removed before you see it. It does not browse the web and gives no impact numbers.
            </p>
            <Btn variant="primary" className="mt-5" onClick={runAi} disabled={ai.status === "loading" || problem.trim().length < 10}>
              {ai.status === "loading" ? "Researching…" : ai.status === "ok" ? "Run research again" : "Run AI research"}
            </Btn>
            {ai.status === "loading" && (
              <div className="mt-6 space-y-2" aria-live="polite" aria-label="Research in progress">
                {["Orchestrator: structuring your description", "Research specialist: causes and sources", "SDG analyst: official targets", "Solution architect and impact analyst"].map((t, i) => (
                  <p key={t} className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-lichen" style={{ animation: `pulse 2s ${i * 0.4}s infinite` }}>
                    <span className="size-1.5 rounded-full bg-biolume" /> {t}
                  </p>
                ))}
              </div>
            )}
            {ai.status === "error" && <p role="alert" className="mt-5 text-sm text-destructive">{ai.error}</p>}
            {ai.status === "ok" && (
              <div className="mt-6 space-y-6" aria-live="polite">
                <p className="text-[15px] leading-relaxed text-bone/90">{ai.brief.summary}</p>
                <div>
                  <h4 className="eyebrow mb-2">Root causes to check</h4>
                  <ul className="space-y-3">
                    {ai.brief.rootCauses.map((rc) => {
                      const added = extraCauses.includes(rc.cause) || causes.includes(rc.cause);
                      return (
                        <li key={rc.cause} className="text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-bone">{rc.cause}</span>
                            <Btn size="sm" variant="quiet" disabled={added} onClick={() => setExtraCauses([...extraCauses, rc.cause])}>{added ? "Added" : "+ Add"}</Btn>
                          </div>
                          <span className="block text-xs text-lichen">{rc.rationale}</span>
                          <span className="block text-xs text-biolume/80">Verify: {rc.howToVerify}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div>
                  <h4 className="eyebrow mb-2">Suggested targets</h4>
                  <ul className="space-y-2">
                    {ai.brief.targets.map((t) => {
                      const inPilot = cat.targets.some((x) => x.code === t.code);
                      return (
                        <li key={t.code} className="text-sm">
                          {inPilot ? (
                            <span className="text-bone"><span className="font-mono text-sprout">{t.code}</span> · already in the pilot map</span>
                          ) : (
                            <Check
                              label={<><span className="font-mono text-sprout">{t.code}</span> <span className="text-xs text-lichen">({t.relation})</span> — {t.rationale}</>}
                              checked={aiTargets.includes(t.code)}
                              onChange={(on) => setAiTargets(on ? [...aiTargets, t.code] : aiTargets.filter((x) => x !== t.code))}
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                {ai.brief.interventions.length > 0 && (
                  <div>
                    <h4 className="eyebrow mb-2">Other ideas (not costed)</h4>
                    <ul className="space-y-2">
                      {ai.brief.interventions.map((iv) => (
                        <li key={iv.name} className="text-sm"><span className="text-bone">{iv.name}.</span> <span className="text-lichen">{iv.description} Risks: {iv.risks}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <h4 className="eyebrow mb-2">Measure before trusting estimates</h4>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-lichen">{ai.brief.measurementsNeeded.map((m) => <li key={m}>{m}</li>)}</ul>
                  </div>
                  <div>
                    <h4 className="eyebrow mb-2">Uncertainties</h4>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-lichen">{ai.brief.uncertainties.map((m) => <li key={m}>{m}</li>)}</ul>
                  </div>
                </div>
                {ai.brief.sourceIds.length > 0 && (
                  <div>
                    <h4 className="eyebrow mb-2">Sources referenced</h4>
                    <ul className="flex flex-wrap gap-2">
                      {ai.brief.sourceIds.map((sid) => {
                        const s = getSource(sid);
                        return s ? <li key={sid}><a href={s.url} target="_blank" rel="noreferrer" className="rounded-sm border border-hairline px-2 py-1 text-xs text-bone hover:text-sprout">{s.name} ↗</a></li> : null;
                      })}
                    </ul>
                  </div>
                )}
                <details className="border-t border-hairline pt-4">
                  <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-lichen">Orchestrator checks ({ai.brief.checks.length})</summary>
                  <ul className="mt-3 space-y-1 text-xs text-lichen">{ai.brief.checks.map((c) => <li key={c}>· {c}</li>)}</ul>
                </details>
              </div>
            )}
          </div>
        </div>
      </Step>

      {/* 03 RIPPLE MAP */}
      <Step n="03" id="ripple" title="Map the ripple effects" lede="Which goals the problem touches, how strongly, and where the options under comparison create trade-offs. Target texts are official; the links are EARTH//OS analysis.">
        <RippleGraph direct={map.direct} indirect={map.indirect} second={second} effects={effects} label={cat.name} />
        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center justify-between"><h3 className="eyebrow">Official targets in scope</h3><Prov kind="official" /></div>
            <ul className="divide-y divide-hairline border-y border-hairline">
              {targets.map((t) => {
                const off = getTarget(t.code);
                return (
                  <li key={t.code} className="py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm text-sprout">{t.code}</span>
                      <span className={`font-mono text-[10px] uppercase tracking-[0.12em] ${t.relation === "direct" ? "text-bone" : "text-lichen"}`}>{t.relation}</span>
                      {t.origin === "ai" && <Prov kind="ai" />}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-bone/85">{off?.target.description}</p>
                    <p className="mt-1 text-xs text-lichen">Why: {t.rationale}</p>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between"><h3 className="eyebrow">Effects of the options under comparison</h3><Prov kind="analysis" /></div>
            <ul className="space-y-4">
              {Object.entries(effects)
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([g, list]) => (
                  <li key={g} className="border-l border-hairline pl-4">
                    <GoalMark goal={Number(g)} withName />
                    <ul className="mt-1 space-y-1">
                      {list.map((e, i) => (
                        <li key={i} className="text-xs leading-relaxed text-lichen">
                          <span className={e.kind === "positive" ? "text-sprout" : e.kind === "uncertain" ? "text-bone/70" : "text-gold"}>{e.kind === "positive" ? "+ " : e.kind === "uncertain" ? "? " : "± "}</span>
                          {e.note}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
            </ul>
            <h3 className="eyebrow mb-2 mt-8">Dependencies</h3>
            <ul className="space-y-1 text-xs text-lichen">
              {compared.filter((i) => i.requires.length).map((i) => (
                <li key={i.id}><span className="text-bone">{i.name}</span> needs {i.requires.map((r) => INFRA_LABELS[r].toLowerCase()).join(", ")}.</li>
              ))}
              {compared.every((i) => !i.requires.length) && <li>No special infrastructure needed by the options under comparison.</li>}
            </ul>
          </div>
        </div>
      </Step>

      {/* 04 SOLUTIONS */}
      <Step n="04" id="solutions" title="Generate solutions" lede="Every figure below is calculated from the inputs you give. Empty inputs produce no number — EARTH//OS tells you what to measure instead of guessing.">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Btn size="sm" onClick={() => { setValues(Object.fromEntries(cat.interventions.map((i) => [i.id, sampleValues(i)]))); setSampled(Object.fromEntries(cat.interventions.map((i) => [i.id, true]))); }}>
            Load hypothetical sample values
          </Btn>
          <Btn size="sm" variant="quiet" onClick={() => { setValues(Object.fromEntries(cat.interventions.map((i) => [i.id, emptyValues(i)]))); setSampled({}); }}>
            Clear all inputs
          </Btn>
          <span className="text-xs text-lichen">Sample values describe an invented school and are labelled wherever they appear.</span>
        </div>
        <ul className="divide-y divide-hairline border-y border-hairline">
          {cat.interventions.map((i) => (
            <InterventionRow
              key={i.id}
              i={i}
              v={values[i.id] ?? {}}
              s={scenario}
              sample={!!sampled[i.id]}
              open={open === i.id}
              onToggle={() => setOpen(open === i.id ? null : i.id)}
              onValue={(k, val) => setValues((all) => ({ ...all, [i.id]: { ...all[i.id], [k]: val } }))}
              inCompare={compare.includes(i.id)}
              onCompare={(on) => setCompare(on ? [...compare, i.id] : compare.filter((x) => x !== i.id))}
            />
          ))}
        </ul>
      </Step>

      {/* 05 COMPARE */}
      <Step n="05" id="compare" title="Compare the options" lede="Transparent criteria, no blended score. Where a cell is empty, a measurement or price is missing.">
        {compared.length === 0 ? (
          <p className="text-sm text-lichen">Tick “Compare” on at least one option in step 04.</p>
        ) : (
          <CompareTable list={compared} values={values} s={scenario} />
        )}
      </Step>

      {/* 06 SCENARIO */}
      <Step n="06" id="scenario" title="Explore the scenario" lede="Change the budget, duration, scale and local conditions. Every option recalculates instantly. These are scenario estimates — never measured results.">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <NumInput label="Budget" value={scenario.budget} onValue={(v) => setScen({ budget: v })} unit={scenario.currency} min={0} />
          <TextInput label="Currency (ISO code)" value={scenario.currency} onChange={(e) => setScen({ currency: e.target.value.toUpperCase().slice(0, 3) })} maxLength={3} />
          <NumInput label="Project duration" value={scenario.months} onValue={(v) => setScen({ months: Math.min(60, Math.max(1, v ?? 1)) })} unit="months" min={1} max={60} />
          <NumInput label="People in scope" value={scenario.beneficiaries} onValue={(v) => setScen({ beneficiaries: v })} unit="people" min={0} hint="Who the project reaches — not a prediction of benefit." />
        </div>
        <div className="mt-8">
          <label htmlFor="scale" className="eyebrow">Implementation scale · {scenario.scalePct}%</label>
          <input id="scale" type="range" min={10} max={200} step={5} value={scenario.scalePct} onChange={(e) => setScen({ scalePct: Number(e.target.value) })} className="mt-3 w-full accent-[var(--sprout)]" />
          <p className="mt-1 text-xs text-lichen">Scales quantities marked as scalable (number of taps, fittings, stations…). Measured rates stay as entered.</p>
        </div>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <fieldset>
            <legend className="eyebrow mb-3">Infrastructure available</legend>
            <div className="space-y-3">
              {(Object.keys(INFRA_LABELS) as Infra[]).map((k) => (
                <Check key={k} label={INFRA_LABELS[k]} checked={scenario.infra.includes(k)} onChange={(on) => toggleInfra(k, on)} />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="eyebrow mb-3">Materials</legend>
            <Check label="Materials can be bought locally" checked={scenario.materialsLocal} onChange={(on) => setScen({ materialsLocal: on })} />
            <p className="mt-2 text-xs text-lichen">When off, every option's timeline gains procurement time and the passport records the constraint.</p>
          </fieldset>
        </div>
      </Step>

      {/* 07 PASSPORT */}
      <Step n="07" id="passport" title="Generate the Solution Passport" lede="A structured implementation blueprint that someone who has never used EARTH//OS can follow. It is saved on this device; you can edit, print, export or adapt it.">
        <div className="grid gap-6 md:grid-cols-2">
          <Select label="Intervention" value={chosen} onChange={(e) => setChosen(e.target.value)}>
            {cat.interventions.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </Select>
          <NumInput label={`Baseline · ${cat.baselineMetric.name}`} value={baseline} onValue={setBaseline} unit={cat.baselineMetric.unit} hint={`Method: ${cat.baselineMetric.method}. Leave empty if not yet measured.`} />
          <TextInput label="Passport title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${cat.interventions.find((i) => i.id === chosen)?.name} — ${place || countryName || "School"}`} className="md:col-span-2" maxLength={140} />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Btn variant="primary" onClick={generate}>Generate and save passport</Btn>
          <span className="text-xs text-lichen">
            Includes {targets.length} official targets, {causes.length + extraCauses.length} root causes{ai.status === "ok" ? " and the AI brief (labelled)" : ""}.
          </span>
        </div>
        {!(problem.trim().length >= 10) && <p className="mt-3 text-xs text-destructive">Describe the problem in step 01 first.</p>}
      </Step>
    </div>
  );
}

function InterventionRow({
  i,
  v,
  s,
  sample,
  open,
  onToggle,
  onValue,
  inCompare,
  onCompare,
}: {
  i: Intervention;
  v: Values;
  s: Scenario;
  sample: boolean;
  open: boolean;
  onToggle: () => void;
  onValue: (k: string, val: number | null) => void;
  inCompare: boolean;
  onCompare: (on: boolean) => void;
}) {
  const outs = i.compute(v, s);
  const cost = i.cost(v, s);
  const fz = feasibility(i, s, cost.value);
  const basis = evidenceBasis(i);
  const extraWeeks = s.materialsLocal ? 0 : 2;
  return (
    <li className="py-6">
      <div className="flex flex-wrap items-start gap-4">
        <button type="button" onClick={onToggle} aria-expanded={open} className="group min-w-0 flex-1 text-left">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-3xl leading-tight text-bone group-hover:text-sprout">{i.name}</span>
            {sample && <Prov kind="sample" />}
          </span>
          <span className="mt-1 block text-sm text-lichen">{i.summary}</span>
        </button>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="eyebrow">Est. cost</p>
            <p className="font-display text-2xl text-bone">{money(cost.value, s.currency)}</p>
          </div>
          <Check label="Compare" checked={inCompare} onChange={onCompare} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.12em]">
        <span className="rounded-sm border border-hairline px-2 py-1 text-lichen">Complexity {COMPLEXITY[i.complexity]}</span>
        <span className="rounded-sm border border-hairline px-2 py-1 text-lichen">{i.weeks[0] + extraWeeks}–{i.weeks[1] + extraWeeks} weeks</span>
        <span className={cn("rounded-sm border px-2 py-1", fz.budget === "exceeds" ? "border-gold/40 text-gold" : fz.budget === "fits" ? "border-sprout/40 text-sprout" : "border-hairline text-lichen")}>
          Budget {fz.budget === "unknown" ? "unknown" : fz.budget}
        </span>
        {fz.time === "too-short" && <span className="rounded-sm border border-gold/40 px-2 py-1 text-gold">Duration too short</span>}
        {fz.missingInfra.length > 0 && <span className="rounded-sm border border-gold/40 px-2 py-1 text-gold">Missing: {fz.missingInfra.map((m) => INFRA_LABELS[m]).join(", ")}</span>}
        <span className="rounded-sm border border-hairline px-2 py-1 text-lichen">{basis.measured}/{basis.total} inputs measured locally</span>
      </div>

      {open && (
        <div className="mt-8 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h4 className="eyebrow mb-4">Inputs</h4>
            {i.params.length === 0 ? (
              <p className="text-sm text-lichen">No numeric inputs — this option is estimated from records once you have them.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {i.params.map((p) => (
                  <NumInput
                    key={p.key}
                    label={<>{p.label} <span className="text-biolume/80">· {KIND_LABEL[p.kind]}</span>{p.scalable ? <span className="text-lichen/70"> · scales</span> : null}</>}
                    value={v[p.key] ?? null}
                    onValue={(val) => onValue(p.key, val)}
                    unit={p.unit === "currency" ? s.currency : p.unit.replace("currency", s.currency)}
                    hint={p.reference ? `Default: ${p.reference.note}` : p.help}
                    step="any"
                  />
                ))}
              </div>
            )}
          </div>
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between">
              <h4 className="eyebrow">Scenario outputs</h4>
              <Prov kind="calculated" />
            </div>
            <ul className="mt-4 grid gap-px overflow-hidden rounded-sm border border-hairline bg-hairline sm:grid-cols-2">
              {[...outs, { label: "Estimated cost", value: cost.value, unit: s.currency, formula: cost.formula, missing: cost.missing, nature: "calculated" as const }].map((o) => (
                <li key={o.label} className="bg-void p-5">
                  <p className="text-xs text-lichen">{o.label}{o.nature === "target" && <span className="ml-1 text-gold">· your target, not a prediction</span>}</p>
                  <p className="mt-1 font-display text-4xl text-bone">
                    {o.value === null ? "—" : o.unit === s.currency ? money(o.value, s.currency) : fmt(o.value, 1)}
                    {o.value !== null && o.unit !== s.currency && <span className="ml-1.5 font-mono text-xs text-lichen">{o.unit}</span>}
                  </p>
                  <p className="mt-2 font-mono text-[10px] leading-relaxed text-lichen/80">{o.formula}</p>
                  {o.missing.length > 0 && <p className="mt-2 text-xs text-gold">Needs: {o.missing.join(", ")}</p>}
                </li>
              ))}
            </ul>
            <dl className="mt-8 grid gap-6 text-sm sm:grid-cols-2">
              <div><dt className="eyebrow mb-1">Resources</dt><dd className="text-lichen">{i.resources.join(" · ")}</dd></div>
              <div><dt className="eyebrow mb-1">Materials</dt><dd className="text-lichen">{i.materials.join(" · ")}</dd></div>
              <div><dt className="eyebrow mb-1">Environmental</dt><dd className="text-lichen">{i.implications.environmental}</dd></div>
              <div><dt className="eyebrow mb-1">Social</dt><dd className="text-lichen">{i.implications.social}</dd></div>
              <div><dt className="eyebrow mb-1">Economic</dt><dd className="text-lichen">{i.implications.economic}</dd></div>
              <div><dt className="eyebrow mb-1">Maintenance</dt><dd className="text-lichen">{i.maintenance}</dd></div>
              <div className="sm:col-span-2">
                <dt className="eyebrow mb-1">Risks</dt>
                <dd>
                  <ul className="space-y-1 text-lichen">{i.risks.map((r) => <li key={r.risk}><span className="text-bone/90">{r.risk}.</span> {r.mitigation}</li>)}</ul>
                </dd>
              </div>
              <div className="sm:col-span-2"><dt className="eyebrow mb-1">Data limitations</dt><dd className="text-gold/90">{i.dataLimitations}</dd></div>
            </dl>
          </div>
        </div>
      )}
    </li>
  );
}

function CompareTable({ list, values, s }: { list: Intervention[]; values: Record<string, Values>; s: Scenario }) {
  const rows: { label: string; cell: (i: Intervention) => React.ReactNode }[] = [
    { label: "Estimated cost", cell: (i) => money(i.cost(values[i.id] ?? {}, s).value, s.currency) },
    {
      label: "Against budget",
      cell: (i) => {
        const f = feasibility(i, s, i.cost(values[i.id] ?? {}, s).value);
        return <span className={f.budget === "exceeds" ? "text-gold" : f.budget === "fits" ? "text-sprout" : "text-lichen"}>{f.budget === "unknown" ? "Unknown" : f.budget === "fits" ? "Fits" : "Exceeds"}</span>;
      },
    },
    {
      label: "Main calculated output",
      cell: (i) => {
        const o = i.compute(values[i.id] ?? {}, s)[0];
        if (!o) return "—";
        return o.value === null ? <span className="text-lichen">{o.missing.length ? `Needs ${o.missing.length} input(s)` : "Not estimated"}</span> : <>{fmt(o.value)} <span className="text-lichen">{o.unit}</span>{o.nature === "target" && <span className="text-gold"> (target)</span>}</>;
      },
    },
    { label: "Complexity", cell: (i) => COMPLEXITY[i.complexity] },
    { label: "Time", cell: (i) => `${i.weeks[0] + (s.materialsLocal ? 0 : 2)}–${i.weeks[1] + (s.materialsLocal ? 0 : 2)} weeks` },
    { label: "Prerequisites missing", cell: (i) => { const m = feasibility(i, s, null).missingInfra; return m.length ? <span className="text-gold">{m.map((x) => INFRA_LABELS[x]).join(", ")}</span> : <span className="text-sprout">None</span>; } },
    { label: "Inputs measured locally", cell: (i) => { const b = evidenceBasis(i); return `${b.measured} of ${b.total}`; } },
    { label: "Goals improved", cell: (i) => i.effects.filter((e) => e.kind === "positive").map((e) => pad(e.goal)).join(" · ") || "—" },
    { label: "Trade-offs / risks", cell: (i) => { const t = i.effects.filter((e) => e.kind !== "positive"); return t.length ? <span className="text-gold">{t.map((e) => `SDG ${pad(e.goal)}`).join(", ")}</span> : "None identified"; } },
    { label: "Maintenance", cell: (i) => <span className="text-xs text-lichen">{i.maintenance}</span> },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption className="sr-only">Comparison of interventions under the current scenario</caption>
        <thead>
          <tr className="border-b border-hairline">
            <th scope="col" className="w-48 py-3 pr-4 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-lichen">Criterion</th>
            {list.map((i) => (
              <th key={i.id} scope="col" className="py-3 pr-4 align-bottom font-display text-xl font-normal text-bone">{i.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-hairline">
              <th scope="row" className="py-3 pr-4 font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-lichen">{r.label}</th>
              {list.map((i) => (
                <td key={i.id} className="py-3 pr-4 align-top text-bone/90">{r.cell(i)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 flex items-center gap-2 text-xs text-lichen"><Prov kind="calculated" /> Scenario estimates from your inputs. Real results come only from measurements in the Impact Ledger.</p>
    </div>
  );
}

