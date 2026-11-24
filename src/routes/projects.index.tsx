import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageIntro } from "@/components/site/PageIntro";
import { Prov } from "@/components/site/Prov";
import { GoalMark } from "@/components/site/GoalMark";
import { Btn, Empty, NumInput, Select, StatusPill, TextArea, TextInput, btnClass, money } from "@/components/site/ui";
import { useStore, useStoreReady } from "@/features/store/store";
import { apply, nowIso } from "@/features/store/commit";
import { addProject } from "@/features/store/actions";
import { uid } from "@/features/ripple-engine/passport";
import { CATEGORIES } from "@/features/ripple-engine/pilot";
import { GOALS, pad } from "@/features/sdg/sdgs";
import { projectSummary } from "@/features/impact-ledger/progress";
import type { Project, ProjectStatus } from "@/features/store/types";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — EARTH//OS" },
      { name: "description", content: "Register sustainability projects, set baselines and targets, and track milestones with reviewed evidence." },
      { property: "og:title", content: "Projects — EARTH//OS" },
      { property: "og:description", content: "Discover and manage sustainability projects linked to the UN SDGs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectsPage,
});

const STATUSES: ProjectStatus[] = ["proposed", "planned", "active", "completed"];

function ProjectsPage() {
  const ready = useStoreReady();
  const projects = useStore((s) => s.projects);
  const [status, setStatus] = useState("");
  const [goal, setGoal] = useState("");
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const list = useMemo(
    () => projects.filter((p) => (!status || p.status === status) && (!goal || p.goals.includes(Number(goal))) && (!cat || p.categoryId === cat) && (!q || `${p.title} ${p.summary} ${p.location.place} ${p.location.countryName}`.toLowerCase().includes(q.toLowerCase()))),
    [projects, status, goal, cat, q],
  );

  return (
    <>
      <PageIntro index="08" eyebrow="Projects" title={<>From plan to <em className="text-sprout">proof.</em></>} lede="Register a project, record its baseline, then report measurements and evidence. Progress only turns verified after an independent review.">
        <div className="flex flex-wrap gap-3">
          <Btn variant="primary" onClick={() => setCreating((c) => !c)}>{creating ? "Close form" : "Register a project"}</Btn>
          <Link to="/passports" className={btnClass("line")}>Start from a passport</Link>
        </div>
      </PageIntro>
      <section className="mx-auto max-w-[1400px] px-5 py-12 md:px-10">
        {creating && <NewProject />}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TextInput label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title or place" />
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s[0]!.toUpperCase() + s.slice(1)}</option>)}
          </Select>
          <Select label="SDG" value={goal} onChange={(e) => setGoal(e.target.value)}>
            <option value="">All goals</option>{GOALS.map((g) => <option key={g.code} value={g.code}>{pad(g.code)} — {g.short}</option>)}
          </Select>
          <Select label="Challenge" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All challenges</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="mt-8">
          {!ready ? <div className="h-40 animate-pulse bg-graphite" aria-label="Loading projects" /> : list.length === 0 ? (
            <Empty title={projects.length ? "No projects match." : "No projects yet."}>{projects.length ? "Try clearing a filter." : "Register one above, or start from a Solution Passport."}</Empty>
          ) : (
            <ul className="divide-y divide-hairline border-y border-hairline">
              {list.map((p) => <Row key={p.id} p={p} />)}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function Row({ p }: { p: Project }) {
  const s = projectSummary(p);
  return (
    <li>
      <Link to="/projects/$id" params={{ id: p.id }} className="grid gap-3 py-5 transition-colors hover:bg-forest md:grid-cols-12 md:items-center md:px-3">
        <div className="md:col-span-5">
          <div className="flex flex-wrap items-center gap-2"><StatusPill status={p.status} />{p.sample && <Prov kind="sample" />}</div>
          <p className="mt-2 font-display text-2xl text-bone">{p.title}</p>
          <p className="text-sm text-lichen">{[p.location.place, p.location.countryName].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-3 md:col-span-3">{p.goals.slice(0, 3).map((g) => <GoalMark key={g} goal={g} />)}</div>
        <div className="font-mono text-xs text-lichen md:col-span-2">{s.verified}/{s.total} milestones verified{s.pendingReview ? ` · ${s.pendingReview} in review` : ""}</div>
        <div className="font-mono text-xs text-lichen md:col-span-2 md:text-right">{money(s.spent, p.currency)} of {money(p.budgetPlanned, p.currency)}</div>
      </Link>
    </li>
  );
}

function NewProject() {
  const navigate = useNavigate();
  const [d, setD] = useState({ title: "", summary: "", categoryId: "water", goals: [6] as number[], countryName: "", place: "", metric: "", unit: "", baseline: null as number | null, method: "", target: null as number | null, targetDate: "", budget: null as number | null, currency: "USD" });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!d.title.trim()) { toast.error("Give the project a title."); return; }
    if (!d.metric.trim()) { toast.error("Name what you will measure (e.g. weekly water use)."); return; }
    if (d.goals.length === 0) { toast.error("Choose at least one SDG."); return; }
    const now = nowIso();
    const id = uid("pr");
    const p: Project = {
      id, createdAt: now, title: d.title.trim(), summary: d.summary.trim(), categoryId: d.categoryId, goals: d.goals,
      location: { country: "", countryName: d.countryName.trim(), place: d.place.trim() }, status: "proposed", currency: d.currency.trim().toUpperCase() || "USD",
      budgetPlanned: d.budget, spend: [], participants: [], baseline: { metric: d.metric.trim(), unit: d.unit.trim(), value: d.baseline, date: d.baseline !== null ? now.slice(0, 10) : "", method: d.method.trim() },
      target: { value: d.target, date: d.targetDate }, milestones: [], measurements: [], evidence: [], reviews: [], lessons: [], history: [{ at: now, text: "Project registered." }],
    };
    apply((s) => addProject(s, p), "Project registered.");
    void navigate({ to: "/projects/$id", params: { id } });
  }
  const toggle = (g: number) => setD({ ...d, goals: d.goals.includes(g) ? d.goals.filter((x) => x !== g) : [...d.goals, g] });
  return (
    <form onSubmit={submit} className="mb-10 grid gap-4 border border-hairline bg-forest/40 p-5 md:grid-cols-3">
      <p className="eyebrow md:col-span-3">New project · stored on this device</p>
      <TextInput label="Title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} className="md:col-span-2" />
      <Select label="Challenge" value={d.categoryId} onChange={(e) => setD({ ...d, categoryId: e.target.value })}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="other">Other</option></Select>
      <TextArea label="Summary" value={d.summary} onChange={(e) => setD({ ...d, summary: e.target.value })} className="md:col-span-3" />
      <TextInput label="Place" hint="A school or neighbourhood name — never a home address." value={d.place} onChange={(e) => setD({ ...d, place: e.target.value })} />
      <TextInput label="Country" value={d.countryName} onChange={(e) => setD({ ...d, countryName: e.target.value })} />
      <TextInput label="Currency" value={d.currency} onChange={(e) => setD({ ...d, currency: e.target.value })} maxLength={3} />
      <TextInput label="What you measure" placeholder="Weekly water use" value={d.metric} onChange={(e) => setD({ ...d, metric: e.target.value })} />
      <TextInput label="Unit" placeholder="L/week" value={d.unit} onChange={(e) => setD({ ...d, unit: e.target.value })} />
      <TextInput label="How it is measured" placeholder="Main meter, Mondays 08:00" value={d.method} onChange={(e) => setD({ ...d, method: e.target.value })} />
      <NumInput label="Baseline value" hint="Leave empty if not yet measured." value={d.baseline} onValue={(v) => setD({ ...d, baseline: v })} />
      <NumInput label="Target value" value={d.target} onValue={(v) => setD({ ...d, target: v })} />
      <TextInput label="Target date" type="date" value={d.targetDate} onChange={(e) => setD({ ...d, targetDate: e.target.value })} />
      <NumInput label="Planned budget" value={d.budget} onValue={(v) => setD({ ...d, budget: v })} />
      <fieldset className="md:col-span-3">
        <legend className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-lichen">SDGs</legend>
        <div className="flex flex-wrap gap-2">{GOALS.map((g) => (
          <button key={g.code} type="button" aria-pressed={d.goals.includes(g.code)} onClick={() => toggle(g.code)} className={btnClass(d.goals.includes(g.code) ? "primary" : "line", "sm")}>{pad(g.code)}</button>
        ))}</div>
      </fieldset>
      <div className="md:col-span-3"><Btn type="submit" variant="primary">Register project</Btn></div>
    </form>
  );
}
