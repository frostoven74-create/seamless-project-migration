import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Prov } from "@/components/site/Prov";
import { GoalMark } from "@/components/site/GoalMark";
import { Btn, Empty, TextArea, TextInput, NumInput, btnClass, download, fmtDate, money, slug } from "@/components/site/ui";
import { useStore, useStoreReady } from "@/features/store/store";
import { apply, commit, nowIso } from "@/features/store/commit";
import { adaptPassport, addProject, deletePassport, duplicatePassport, projectFromPassport, updatePassport } from "@/features/store/actions";
import { uid } from "@/features/ripple-engine/passport";
import { getIntervention } from "@/features/ripple-engine/pilot";
import { getTarget } from "@/features/sdg/sdgs";
import { getSource } from "@/features/sdg/sources";
import { passportMarkdown } from "@/features/solution-passport/markdown";
import type { Passport } from "@/features/store/types";

export const Route = createFileRoute("/passports/$id")({
  head: () => ({
    meta: [
      { title: "Solution Passport — EARTH//OS" },
      { name: "description", content: "A structured implementation blueprint: causes, SDG targets, budget, stages, risks, indicators and evidence plan." },
      { property: "og:title", content: "Solution Passport — EARTH//OS" },
      { property: "og:description", content: "View, edit, print, export, duplicate or adapt this sustainability plan." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PassportPage,
});

const lines = (xs: string[]) => xs.join("\n");
const unlines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

function Sec({ n, title, children, prov }: { n: number; title: string; children: React.ReactNode; prov?: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-hairline py-8 md:grid-cols-12" aria-labelledby={`s-${n}`}>
      <div className="md:col-span-3">
        <h2 id={`s-${n}`} className="eyebrow"><span className="text-sprout">{String(n).padStart(2, "0")}</span> — {title}</h2>
        {prov && <div className="mt-2">{prov}</div>}
      </div>
      <div className="text-[15px] leading-relaxed text-bone/90 md:col-span-9">{children}</div>
    </section>
  );
}
function Ul({ xs }: { xs: string[] }) {
  if (!xs.length) return <p className="text-lichen">Not provided.</p>;
  return <ul className="list-disc space-y-1.5 pl-5 marker:text-sprout">{xs.map((x, i) => <li key={i}>{x}</li>)}</ul>;
}
const val = (n: number | null | undefined, unit = "") => (n === null || n === undefined ? <span className="text-lichen">not measured yet</span> : `${n.toLocaleString("en")} ${unit}`);

function PassportPage() {
  const { id } = Route.useParams();
  const ready = useStoreReady();
  const p = useStore((s) => s.passports.find((x) => x.id === id));
  const linked = useStore((s) => s.projects.find((x) => x.passportId === id));
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [adapting, setAdapting] = useState(false);

  if (!ready) return <div className="mx-auto mt-40 h-60 max-w-[1100px] animate-pulse bg-graphite" aria-label="Loading passport" />;
  if (!p)
    return (
      <div className="mx-auto max-w-[900px] px-5 pb-20 pt-40">
        <Empty title="Passport not found.">Passports are stored on the device that created them. <Link to="/passports" className="text-sprout underline">See your passports</Link>.</Empty>
      </div>
    );

  const goals = [...new Set(p.targets.map((t) => Number(t.code.split(".")[0])))];

  function share() {
    const text = passportMarkdown(p!);
    if (navigator.share) void navigator.share({ title: p!.title, text }).catch(() => {});
    else void navigator.clipboard.writeText(text).then(() => toast.success("Passport text copied — paste it into an email or document."));
  }
  function duplicate() {
    const newId = uid("pp");
    if (commit((s) => duplicatePassport(s, p!.id, newId, nowIso()), "Copy created.")) void navigate({ to: "/passports/$id", params: { id: newId } });
  }
  function register() {
    const pid = uid("pr");
    apply((s) => addProject(s, projectFromPassport(p!, pid, nowIso())), "Project registered in the Impact Ledger.");
    void navigate({ to: "/projects/$id", params: { id: pid } });
  }
  function remove() {
    if (!confirm("Delete this passport from this device?")) return;
    apply((s) => deletePassport(s, p!.id), "Passport deleted.");
    void navigate({ to: "/passports" });
  }

  return (
    <article className="print-doc mx-auto max-w-[1100px] px-5 pb-20 pt-32 md:px-10 md:pt-40">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Link to="/passports" className="eyebrow hover:text-bone">← All passports</Link>
      </div>
      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow">Solution Passport</span>
          {p.sample && <Prov kind="sample" />}
          {p.ai && <Prov kind="ai">Includes AI research</Prov>}
          {p.derivedFrom && <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-lichen">Derived copy</span>}
        </div>
        <h1 className="mt-4 font-display text-5xl leading-[0.95] text-bone md:text-7xl">{p.title}</h1>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-lichen">
          {[p.location.place, p.location.countryName].filter(Boolean).join(" · ") || "No location"} · updated {fmtDate(p.updatedAt)}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">{goals.map((g) => <GoalMark key={g} goal={g} withName />)}</div>
      </header>

      <div className="no-print mt-8 flex flex-wrap gap-2 border-y border-hairline py-4">
        <Btn size="sm" variant={editing ? "primary" : "line"} onClick={() => setEditing((e) => !e)}>{editing ? "Done editing" : "Edit"}</Btn>
        <Btn size="sm" onClick={() => window.print()}>Print</Btn>
        <Btn size="sm" onClick={() => download(`${slug(p.title)}.md`, passportMarkdown(p), "text/markdown")}>Export text</Btn>
        <Btn size="sm" onClick={() => download(`${slug(p.title)}.passport.json`, JSON.stringify(p, null, 2), "application/json")}>Export file</Btn>
        <Btn size="sm" onClick={share}>Share</Btn>
        <Btn size="sm" onClick={duplicate}>Duplicate</Btn>
        <Btn size="sm" onClick={() => setAdapting((a) => !a)}>Adapt for another place</Btn>
        {linked ? (
          <Link to="/projects/$id" params={{ id: linked.id }} className={btnClass("primary", "sm")}>Open project</Link>
        ) : (
          <Btn size="sm" variant="primary" onClick={register}>Start a project</Btn>
        )}
        <Btn size="sm" variant="danger" onClick={remove} className="ml-auto">Delete</Btn>
      </div>
      <p className="no-print mt-3 text-xs text-lichen">Saved on this device only. To share with others, use Share or Export — they can import the file on the Passports page.</p>

      {adapting && <AdaptForm p={p} onDone={(nid) => { setAdapting(false); void navigate({ to: "/passports/$id", params: { id: nid } }); }} />}
      {editing && <EditForm p={p} />}

      <div className="mt-10">
        <Sec n={1} title="Problem"><p>{p.problem}</p></Sec>
        <Sec n={2} title="Root causes" prov={<Prov kind="analysis">To confirm locally</Prov>}><Ul xs={p.rootCauses} /></Sec>
        <Sec n={3} title="SDG targets" prov={<Prov kind="official" />}>
          <ul className="space-y-4">
            {p.targets.map((t) => (
              <li key={t.code}>
                <p><Link to="/sdgs/$goal" params={{ goal: t.code.split(".")[0]! }} hash={`t-${t.code}`} className="font-mono text-sprout hover:underline">{t.code}</Link> <span className="font-mono text-[10px] uppercase text-lichen">{t.relation}{t.origin === "ai" ? " · AI-suggested" : ""}</span></p>
                <p className="text-sm text-bone/80">{getTarget(t.code)?.target.description}</p>
                <p className="mt-1 text-sm text-lichen">Why: {t.rationale}</p>
              </li>
            ))}
          </ul>
        </Sec>
        <Sec n={4} title="Research & citations">
          {p.ai && <p className="mb-4 border-l-2 border-prov-ai/50 pl-4 text-sm text-lichen"><Prov kind="ai" /> {p.ai.summary}</p>}
          <ul className="space-y-3">
            {p.research.map((r) => { const s = getSource(r.sourceId); return (
              <li key={r.sourceId} className="text-sm">
                {s ? <a href={s.url} target="_blank" rel="noreferrer" className="text-bone underline decoration-hairline hover:text-sprout">{s.name}</a> : r.sourceId}
                {s && <span className="text-lichen"> — {s.org}</span>}
                {r.note && <p className="text-lichen">{r.note}</p>}
              </li>
            ); })}
          </ul>
        </Sec>
        <Sec n={5} title="Baseline" prov={p.baseline.value !== null ? <Prov kind={p.sample ? "sample" : "reported"} /> : undefined}>
          <p>{p.baseline.description}</p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <div><dt className="eyebrow">Metric</dt><dd>{p.baseline.metric}</dd></div>
            <div><dt className="eyebrow">Value</dt><dd>{val(p.baseline.value, p.baseline.unit)}</dd></div>
            <div><dt className="eyebrow">Method</dt><dd>{p.baseline.method}</dd></div>
          </dl>
        </Sec>
        <Sec n={6} title="Intervention"><p className="font-display text-2xl text-bone">{p.intervention.name}</p><p className="mt-2">{p.intervention.summary}</p></Sec>
        <Sec n={7} title="Expected outcomes" prov={<Prov kind="calculated" />}>
          <ul className="space-y-3">{p.expectedOutcomes.map((o, i) => (
            <li key={i}><p>{o.label}: <span className="font-mono text-sprout">{val(o.value, o.unit)}</span> {o.nature === "target" && <span className="font-mono text-[10px] uppercase text-lichen">your target, not a prediction</span>}</p><p className="font-mono text-xs text-lichen">{o.formula}</p></li>
          ))}</ul>
          <p className="mt-3 text-xs text-lichen">Estimates from the stated inputs. Only measurements in the Impact Ledger show real results.</p>
        </Sec>
        <Sec n={8} title="Unintended consequences"><Ul xs={p.unintended} /></Sec>
        <Sec n={9} title="Resources"><Ul xs={p.resources} /></Sec>
        <Sec n={10} title="Materials"><Ul xs={p.materials} /></Sec>
        <Sec n={11} title="Budget" prov={<Prov kind="calculated" />}>
          <p className="font-display text-3xl text-bone">{money(p.budget.estimate, p.budget.currency)}</p>
          <p className="eyebrow mt-4">Cost assumptions</p><div className="mt-2 text-sm"><Ul xs={p.budget.assumptions} /></div>
        </Sec>
        <Sec n={12} title="Stages & timeline">
          <ol className="space-y-3">{p.stages.map((s, i) => (
            <li key={i} className="grid grid-cols-[3rem_1fr] gap-3"><span className="font-mono text-sm text-sprout">{s.weeks} wk</span><div><p className="text-bone">{s.name}</p><p className="text-sm text-lichen">{s.description}</p></div></li>
          ))}</ol>
          <p className="mt-3 font-mono text-xs text-lichen">Total {p.stages.reduce((a, s) => a + s.weeks, 0)} weeks</p>
        </Sec>
        <Sec n={13} title="Stakeholders"><Ul xs={p.stakeholders} /></Sec>
        <Sec n={14} title="Risks">
          <ul className="space-y-3">{p.risks.map((r, i) => <li key={i}><p className="text-bone">{r.risk}</p><p className="text-sm text-lichen">Mitigation: {r.mitigation}</p></li>)}</ul>
        </Sec>
        <Sec n={15} title="Measurement indicators">
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="eyebrow"><tr><th className="py-2 pr-4 font-normal">Indicator</th><th className="pr-4 font-normal">Baseline</th><th className="pr-4 font-normal">Target</th><th className="font-normal">Method</th></tr></thead>
            <tbody className="divide-y divide-hairline">{p.indicators.map((i, k) => (
              <tr key={k}><td className="py-2 pr-4">{i.name} <span className="text-lichen">({i.unit})</span></td><td className="pr-4">{val(i.baseline)}</td><td className="pr-4">{val(i.target)}</td><td className="text-lichen">{i.method}</td></tr>
            ))}</tbody>
          </table></div>
        </Sec>
        <Sec n={16} title="Evidence plan"><Ul xs={p.evidencePlan} /></Sec>
        <Sec n={17} title="Monitoring schedule"><p>{p.monitoring}</p></Sec>
        <Sec n={18} title="Maintenance"><p>{p.maintenance}</p></Sec>
        <Sec n={19} title="Adaptation"><Ul xs={p.adaptation} /></Sec>
        <Sec n={20} title="Limitations"><Ul xs={p.limitations} /></Sec>
      </div>
    </article>
  );
}

function EditForm({ p }: { p: Passport }) {
  const [d, setD] = useState(() => ({
    title: p.title, problem: p.problem, place: p.location.place, countryName: p.location.countryName,
    summary: p.intervention.summary, baseDesc: p.baseline.description, baseValue: p.baseline.value, baseMethod: p.baseline.method,
    rootCauses: lines(p.rootCauses), unintended: lines(p.unintended), resources: lines(p.resources), materials: lines(p.materials),
    stakeholders: lines(p.stakeholders), evidencePlan: lines(p.evidencePlan), monitoring: p.monitoring, maintenance: p.maintenance,
    adaptation: lines(p.adaptation), limitations: lines(p.limitations), estimate: p.budget.estimate,
  }));
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD({ ...d, [k]: e.target.value });
  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!d.title.trim()) { toast.error("The passport needs a title."); return; }
    apply((s) => updatePassport(s, p.id, {
      title: d.title.trim(), problem: d.problem, location: { ...p.location, place: d.place, countryName: d.countryName },
      intervention: { ...p.intervention, summary: d.summary },
      baseline: { ...p.baseline, description: d.baseDesc, value: d.baseValue, method: d.baseMethod },
      rootCauses: unlines(d.rootCauses), unintended: unlines(d.unintended), resources: unlines(d.resources), materials: unlines(d.materials),
      stakeholders: unlines(d.stakeholders), evidencePlan: unlines(d.evidencePlan), monitoring: d.monitoring, maintenance: d.maintenance,
      adaptation: unlines(d.adaptation), limitations: unlines(d.limitations), budget: { ...p.budget, estimate: d.estimate },
    }, nowIso()), "Passport saved.");
  }
  return (
    <form onSubmit={save} className="no-print mt-8 grid gap-4 border border-hairline bg-forest/40 p-5 md:grid-cols-2">
      <p className="eyebrow md:col-span-2">Edit passport · lists take one item per line</p>
      <TextInput label="Title" value={d.title} onChange={set("title")} className="md:col-span-2" />
      <TextInput label="Place" value={d.place} onChange={set("place")} />
      <TextInput label="Country" value={d.countryName} onChange={set("countryName")} />
      <TextArea label="Problem" value={d.problem} onChange={set("problem")} className="md:col-span-2" />
      <TextArea label="Intervention summary" value={d.summary} onChange={set("summary")} className="md:col-span-2" />
      <TextArea label="Baseline description" value={d.baseDesc} onChange={set("baseDesc")} />
      <div className="grid gap-4">
        <NumInput label="Baseline value" unit={p.baseline.unit} value={d.baseValue} onValue={(v) => setD({ ...d, baseValue: v })} hint="Leave empty until measured." />
        <TextInput label="Baseline method" value={d.baseMethod} onChange={set("baseMethod")} />
      </div>
      <NumInput label="Budget estimate" unit={p.budget.currency} value={d.estimate} onValue={(v) => setD({ ...d, estimate: v })} />
      <div />
      <TextArea label="Root causes" value={d.rootCauses} onChange={set("rootCauses")} />
      <TextArea label="Unintended consequences" value={d.unintended} onChange={set("unintended")} />
      <TextArea label="Resources" value={d.resources} onChange={set("resources")} />
      <TextArea label="Materials" value={d.materials} onChange={set("materials")} />
      <TextArea label="Stakeholders" value={d.stakeholders} onChange={set("stakeholders")} />
      <TextArea label="Evidence plan" value={d.evidencePlan} onChange={set("evidencePlan")} />
      <TextArea label="Monitoring schedule" value={d.monitoring} onChange={set("monitoring")} />
      <TextArea label="Maintenance" value={d.maintenance} onChange={set("maintenance")} />
      <TextArea label="Adaptation" value={d.adaptation} onChange={set("adaptation")} />
      <TextArea label="Limitations" value={d.limitations} onChange={set("limitations")} />
      <div className="md:col-span-2"><Btn type="submit" variant="primary">Save changes</Btn></div>
    </form>
  );
}

function AdaptForm({ p, onDone }: { p: Passport; onDone: (id: string) => void }) {
  const [place, setPlace] = useState("");
  const [country, setCountry] = useState("");
  const measured = getIntervention(p.interventionId)?.intervention.params.filter((x) => x.kind === "measured").map((x) => x.key) ?? [];
  function go(e: React.FormEvent) {
    e.preventDefault();
    const newId = uid("pp");
    if (commit((s) => adaptPassport(s, p.id, { newId, now: nowIso(), location: { country: "", countryName: country.trim(), place: place.trim() }, measuredKeys: measured }), "Adapted copy created — take new local measurements."))
      onDone(newId);
  }
  return (
    <form onSubmit={go} className="no-print mt-8 grid gap-4 border border-hairline bg-forest/40 p-5 md:grid-cols-3">
      <p className="text-sm text-lichen md:col-span-3">The plan, targets and stages are kept. All local measurements ({measured.length} inputs, baseline and targets) are cleared, because numbers from one site must not describe another.</p>
      <TextInput label="New place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="e.g. Riverside Primary" />
      <TextInput label="Country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Kenya" />
      <div className="flex items-end"><Btn type="submit" variant="primary">Create adapted copy</Btn></div>
    </form>
  );
}
