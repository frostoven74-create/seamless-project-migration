import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Prov } from "@/components/site/Prov";
import { GoalMark } from "@/components/site/GoalMark";
import { Btn, Empty, NumInput, Select, StatusPill, TextArea, TextInput, btnClass, fmtDate, money } from "@/components/site/ui";
import { useStore, useStoreReady } from "@/features/store/store";
import { apply, commit, nowIso } from "@/features/store/commit";
import { addLesson, addMeasurement, addMilestone, addParticipant, addSpend, deleteProject, requestReview, setStatus, submitEvidence, updateProject } from "@/features/store/actions";
import { STATUS_COPY, canComplete, validateEvidenceFile } from "@/features/store/rules";
import { uid } from "@/features/ripple-engine/passport";
import { projectSummary } from "@/features/impact-ledger/progress";
import { ReviewForm } from "@/features/impact-ledger/ReviewForm";
import { MeasureChart } from "@/features/impact-ledger/MeasureChart";
import type { Evidence, EvidenceKind, Project, ProjectStatus } from "@/features/store/types";

export const Route = createFileRoute("/projects/$id")({
  head: () => ({
    meta: [
      { title: "Project — EARTH//OS" },
      { name: "description", content: "Project baseline, milestones, measurements, evidence and independent review." },
      { property: "og:title", content: "Project — EARTH//OS" },
      { property: "og:description", content: "Track a sustainability project with reported measurements and reviewed evidence." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectPage,
});

const KINDS: { id: EvidenceKind; label: string }[] = [
  { id: "measurement_record", label: "Measurement record" }, { id: "photograph", label: "Photograph" }, { id: "receipt", label: "Receipt" },
  { id: "report", label: "Report" }, { id: "inspection", label: "Inspection document" }, { id: "observation", label: "Dated observation" },
];

function Block({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="border-t border-hairline py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="eyebrow">{title}</h2>{aside}</div>
      {children}
    </section>
  );
}

function ProjectPage() {
  const { id } = Route.useParams();
  const ready = useStoreReady();
  const p = useStore((s) => s.projects.find((x) => x.id === id));
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  if (!ready) return <div className="mx-auto mt-40 h-60 max-w-[1200px] animate-pulse bg-graphite" aria-label="Loading project" />;
  if (!p) return <div className="mx-auto max-w-[900px] px-5 pb-20 pt-40"><Empty title="Project not found.">Projects are stored on the device that created them. <Link to="/projects" className="text-sprout underline">See all projects</Link>.</Empty></div>;
  const s = projectSummary(p);
  const done = canComplete(p);

  return (
    <article className="mx-auto max-w-[1200px] px-5 pb-20 pt-32 md:px-10 md:pt-40">
      <Link to="/projects" className="eyebrow hover:text-bone">← All projects</Link>
      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-2"><StatusPill status={p.status} />{p.sample && <Prov kind="sample" />}</div>
        <h1 className="mt-4 font-display text-5xl leading-[0.95] text-bone md:text-7xl">{p.title}</h1>
        <p className="mt-3 max-w-3xl text-lichen">{p.summary}</p>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-lichen">{[p.location.place, p.location.countryName].filter(Boolean).join(" · ") || "No location"} · registered {fmtDate(p.createdAt)}</p>
        <div className="mt-4 flex flex-wrap gap-3">{p.goals.map((g) => <GoalMark key={g} goal={g} withName />)}</div>
      </header>

      <div className="mt-8 flex flex-wrap items-end gap-3 border-y border-hairline py-4">
        <Select label="Status" value={p.status} onChange={(e) => commit((st) => setStatus(st, p.id, e.target.value as ProjectStatus, nowIso()), "Status updated.")} className="w-44">
          {(["proposed", "planned", "active", "completed"] as const).map((x) => <option key={x} value={x} disabled={x === "completed" && !done.ok}>{STATUS_COPY[x]!.label}{x === "completed" && !done.ok ? " (locked)" : ""}</option>)}
        </Select>
        <p className="max-w-sm pb-2 text-xs text-lichen">{STATUS_COPY[p.status]?.meaning} {!done.ok && p.status !== "completed" && `Completion: ${done.reason}`}</p>
        <div className="ml-auto flex flex-wrap gap-2 pb-0.5">
          {p.passportId && <Link to="/passports/$id" params={{ id: p.passportId }} className={btnClass("line", "sm")}>Passport</Link>}
          <Btn size="sm" onClick={() => setEditing((x) => !x)}>{editing ? "Close" : "Edit details"}</Btn>
          <Btn size="sm" variant="danger" onClick={() => { if (confirm("Delete this project from this device?")) { apply((st) => deleteProject(st, p.id), "Project deleted."); void navigate({ to: "/projects" }); } }}>Delete</Btn>
        </div>
      </div>
      {editing && <EditDetails p={p} />}

      <dl className="grid grid-cols-2 border-b border-hairline md:grid-cols-4">
        {[
          ["Baseline", p.baseline.value === null ? "Not measured" : `${p.baseline.value.toLocaleString("en")} ${p.baseline.unit}`, p.baseline.method],
          ["Latest reading", s.latest ? `${s.latest.value.toLocaleString("en")} ${s.latest.unit}` : "None yet", s.latest ? `Reported ${fmtDate(s.latest.date)}` : "Reported, not verified"],
          ["Target", p.target.value === null ? "Not set" : `${p.target.value.toLocaleString("en")} ${p.baseline.unit}`, p.target.date ? `by ${fmtDate(p.target.date)}` : ""],
          ["Verified milestones", `${s.verified} / ${s.total}`, s.pendingReview ? `${s.pendingReview} awaiting review` : "Only reviewed evidence counts"],
        ].map(([k, v, n]) => (
          <div key={k} className="border-r border-hairline p-4 last:border-r-0"><dt className="eyebrow">{k}</dt><dd className="mt-2 font-display text-2xl text-bone">{v}</dd><dd className="mt-1 text-xs text-lichen">{n}</dd></div>
        ))}
      </dl>

      <div className="grid gap-x-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Block title={`Measurements · ${p.baseline.metric}`} aside={<Prov kind="reported" />}>
            <MeasureChart p={p} />
            <MeasurementForm p={p} />
            {p.measurements.length > 0 && (
              <ul className="mt-4 divide-y divide-hairline text-sm">{[...p.measurements].reverse().map((m) => (
                <li key={m.id} className="flex flex-wrap justify-between gap-2 py-2"><span>{fmtDate(m.date)} · <span className="text-bone">{m.value.toLocaleString("en")} {m.unit}</span></span><span className="text-lichen">{m.method} · {m.reportedBy}</span></li>
              ))}</ul>
            )}
          </Block>
          <Block title="Milestones & evidence">
            {p.milestones.length === 0 && <p className="text-sm text-lichen">No milestones yet. Add one below.</p>}
            <ol className="space-y-6">{s.milestones.map(({ m, status }) => (
              <li key={m.id} className="border-l border-hairline pl-4">
                <div className="flex flex-wrap items-center gap-2"><StatusPill status={status} /><span className="font-mono text-[10px] text-lichen">due {fmtDate(m.due)}</span></div>
                <p className="mt-2 text-bone">{m.title}</p><p className="text-sm text-lichen">{m.description}</p>
                <ul className="mt-3 space-y-3">{p.evidence.filter((e) => e.milestoneId === m.id).map((e) => <EvidenceItem key={e.id} p={p} e={e} />)}</ul>
              </li>
            ))}</ol>
            <MilestoneForm p={p} />
            {p.milestones.length > 0 && <EvidenceForm p={p} />}
          </Block>
        </div>
        <aside className="lg:col-span-5">
          <Block title="Budget">
            <p className="font-display text-3xl text-bone">{money(s.spent, p.currency)} <span className="text-base text-lichen">spent of {money(p.budgetPlanned, p.currency)}</span></p>
            <ul className="mt-3 divide-y divide-hairline text-sm">{p.spend.map((x) => <li key={x.id} className="flex justify-between gap-3 py-2"><span className="text-lichen">{fmtDate(x.date)} · {x.note}</span><span>{money(x.amount, p.currency)}</span></li>)}</ul>
            <SpendForm p={p} />
          </Block>
          <Block title="Team">
            <p className="mb-3 text-xs text-lichen">Use roles, never names of students.</p>
            <ul className="space-y-1 text-sm">{p.participants.map((x) => <li key={x.id}><span className="text-bone">{x.alias}</span> <span className="text-lichen">— {x.role}</span></li>)}</ul>
            <ParticipantForm p={p} />
          </Block>
          <Block title="Lessons learned">
            <ul className="list-disc space-y-1 pl-5 text-sm marker:text-sprout">{p.lessons.map((l, i) => <li key={i}>{l}</li>)}</ul>
            <LessonForm p={p} />
          </Block>
          <Block title="History">
            <ol className="space-y-2 text-sm">{[...p.history].reverse().map((h, i) => <li key={i}><span className="font-mono text-[10px] text-lichen">{fmtDate(h.at)}</span> <span className="text-bone/90">{h.text}</span></li>)}</ol>
          </Block>
        </aside>
      </div>
    </article>
  );
}

function EvidenceItem({ p, e }: { p: Project; e: Evidence }) {
  const [reviewing, setReviewing] = useState(false);
  const reviews = p.reviews.filter((r) => r.evidenceId === e.id);
  return (
    <li className="bg-graphite/40 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2"><StatusPill status={e.status} /><span className="text-bone">{e.title}</span><span className="font-mono text-[10px] text-lichen">{KINDS.find((k) => k.id === e.kind)?.label} · {fmtDate(e.date)} · by {e.submittedBy}</span></div>
      <p className="mt-1 text-lichen">{e.description}</p>
      {e.file && <p className="mt-1 font-mono text-[11px] text-lichen">File: {e.file.dataUrl ? <a href={e.file.dataUrl} download={e.file.name} className="underline hover:text-bone">{e.file.name}</a> : e.file.name} ({Math.round(e.file.size / 1024)} KB)</p>}
      {reviews.map((r) => <p key={r.id} className="mt-2 text-xs text-lichen">{r.decision === "verified" ? "Verified" : "Sent back"} by {r.reviewer} on {fmtDate(r.at)}{r.note ? ` — ${r.note}` : ""}</p>)}
      <div className="mt-2 flex gap-2">
        {(e.status === "reported" || e.status === "rejected") && <Btn size="sm" onClick={() => commit((s) => requestReview(s, p.id, e.id, nowIso()), "Review requested.")}>Request review</Btn>}
        {e.status === "under_review" && <Btn size="sm" onClick={() => setReviewing((x) => !x)}>{reviewing ? "Cancel" : "Review"}</Btn>}
      </div>
      {reviewing && <ReviewForm projectId={p.id} ev={e} onDone={() => setReviewing(false)} />}
    </li>
  );
}

const today = () => new Date().toISOString().slice(0, 10);
const formCls = "mt-5 grid gap-3 border border-dashed border-hairline p-4 sm:grid-cols-2";

function MeasurementForm({ p }: { p: Project }) {
  const [v, setV] = useState<number | null>(null);
  const [date, setDate] = useState(today());
  const [method, setMethod] = useState(p.baseline.method);
  const [by, setBy] = useState("");
  const [ms, setMs] = useState("");
  function go(e: React.FormEvent) {
    e.preventDefault();
    if (v === null) { toast.error("Enter a number."); return; }
    if (commit((s) => addMeasurement(s, p.id, { id: uid("me"), date, value: v, unit: p.baseline.unit, method, milestoneId: ms || undefined, reportedBy: by.trim() || "Project team" }, nowIso()), "Reading reported.")) setV(null);
  }
  return (
    <form onSubmit={go} className={formCls}>
      <NumInput label="New reading" unit={p.baseline.unit} value={v} onValue={setV} />
      <TextInput label="Date" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
      <TextInput label="Method" value={method} onChange={(e) => setMethod(e.target.value)} />
      <TextInput label="Reported by (role)" value={by} onChange={(e) => setBy(e.target.value)} placeholder="Audit team" />
      <Select label="Milestone (optional)" value={ms} onChange={(e) => setMs(e.target.value)}><option value="">None</option>{p.milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</Select>
      <div className="flex items-end"><Btn type="submit" variant="primary" size="sm">Report reading</Btn></div>
    </form>
  );
}

function MilestoneForm({ p }: { p: Project }) {
  const [t, setT] = useState(""); const [d, setD] = useState(""); const [due, setDue] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (commit((s) => addMilestone(s, p.id, { id: uid("m"), title: t.trim(), description: d.trim(), due }, nowIso()), "Milestone added.")) { setT(""); setD(""); } }} className={formCls}>
      <TextInput label="New milestone" value={t} onChange={(e) => setT(e.target.value)} />
      <TextInput label="Due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      <TextInput label="What counts as done" value={d} onChange={(e) => setD(e.target.value)} className="sm:col-span-2" />
      <div><Btn type="submit" size="sm">Add milestone</Btn></div>
    </form>
  );
}

function EvidenceForm({ p }: { p: Project }) {
  const [d, setD] = useState({ milestoneId: p.milestones[0]?.id ?? "", kind: "measurement_record" as EvidenceKind, title: "", date: today(), description: "", by: "" });
  const [file, setFile] = useState<Evidence["file"]>();
  function pick(f: File | undefined) {
    if (!f) return setFile(undefined);
    const err = validateEvidenceFile(f);
    if (err) { toast.error(err); return; }
    const r = new FileReader();
    r.onload = () => setFile({ name: f.name, type: f.type, size: f.size, dataUrl: String(r.result) });
    r.readAsDataURL(f);
  }
  function go(e: React.FormEvent) {
    e.preventDefault();
    if (commit((s) => submitEvidence(s, p.id, { id: uid("ev"), milestoneId: d.milestoneId, kind: d.kind, title: d.title, date: d.date, description: d.description, file, submittedBy: d.by.trim() || "Project team" }, nowIso()), "Evidence reported. Request a review when ready.")) {
      setD({ ...d, title: "", description: "" }); setFile(undefined);
    }
  }
  return (
    <form onSubmit={go} className={formCls}>
      <p className="eyebrow sm:col-span-2">Submit evidence</p>
      <Select label="Milestone" value={d.milestoneId} onChange={(e) => setD({ ...d, milestoneId: e.target.value })}>{p.milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</Select>
      <Select label="Type" value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as EvidenceKind })}>{KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</Select>
      <TextInput label="Title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
      <TextInput label="Date produced" type="date" max={today()} value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} />
      <TextArea label="Description" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} className="sm:col-span-2" />
      <TextInput label="Submitted by (role)" value={d.by} onChange={(e) => setD({ ...d, by: e.target.value })} />
      <TextInput label="File (JPG, PNG, WebP, PDF, CSV, TXT · max 2 MB)" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.csv,.txt" onChange={(e) => pick(e.target.files?.[0])} hint="Avoid photos that show students' faces." />
      <div><Btn type="submit" variant="primary" size="sm">Report evidence</Btn></div>
    </form>
  );
}

function SpendForm({ p }: { p: Project }) {
  const [a, setA] = useState<number | null>(null); const [n, setN] = useState(""); const [date, setDate] = useState(today());
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (commit((s) => addSpend(s, p.id, { id: uid("sp"), date, amount: a ?? NaN, note: n.trim() || "Expense" }, nowIso()), "Spend recorded.")) { setA(null); setN(""); } }} className={formCls}>
      <NumInput label="Amount" unit={p.currency} value={a} onValue={setA} />
      <TextInput label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <TextInput label="What for" value={n} onChange={(e) => setN(e.target.value)} className="sm:col-span-2" />
      <div><Btn type="submit" size="sm">Record spend</Btn></div>
    </form>
  );
}

function ParticipantForm({ p }: { p: Project }) {
  const [role, setRole] = useState(""); const [alias, setAlias] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (commit((s) => addParticipant(s, p.id, { id: uid("pa"), role, alias }, nowIso()), "Added to team.")) { setRole(""); setAlias(""); } }} className={formCls}>
      <TextInput label="Label" placeholder="Year 9 eco-club" value={alias} onChange={(e) => setAlias(e.target.value)} />
      <TextInput label="Role" placeholder="Audit team" value={role} onChange={(e) => setRole(e.target.value)} />
      <div><Btn type="submit" size="sm">Add</Btn></div>
    </form>
  );
}

function LessonForm({ p }: { p: Project }) {
  const [t, setT] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (commit((s) => addLesson(s, p.id, t, nowIso()), "Lesson recorded.")) setT(""); }} className={formCls}>
      <TextArea label="New lesson" value={t} onChange={(e) => setT(e.target.value)} className="sm:col-span-2" />
      <div><Btn type="submit" size="sm">Record lesson</Btn></div>
    </form>
  );
}

function EditDetails({ p }: { p: Project }) {
  const [d, setD] = useState({ title: p.title, summary: p.summary, baseline: p.baseline, target: p.target, budgetPlanned: p.budgetPlanned });
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!d.title.trim()) { toast.error("A title is required."); return; } apply((s) => updateProject(s, p.id, d, nowIso()), "Project saved."); }} className="mt-6 grid gap-3 border border-hairline bg-forest/40 p-5 md:grid-cols-3">
      <TextInput label="Title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} className="md:col-span-3" />
      <TextArea label="Summary" value={d.summary} onChange={(e) => setD({ ...d, summary: e.target.value })} className="md:col-span-3" />
      <TextInput label="Metric" value={d.baseline.metric} onChange={(e) => setD({ ...d, baseline: { ...d.baseline, metric: e.target.value } })} />
      <TextInput label="Unit" value={d.baseline.unit} onChange={(e) => setD({ ...d, baseline: { ...d.baseline, unit: e.target.value } })} />
      <TextInput label="Method" value={d.baseline.method} onChange={(e) => setD({ ...d, baseline: { ...d.baseline, method: e.target.value } })} />
      <NumInput label="Baseline value" value={d.baseline.value} onValue={(v) => setD({ ...d, baseline: { ...d.baseline, value: v } })} />
      <NumInput label="Target value" value={d.target.value} onValue={(v) => setD({ ...d, target: { ...d.target, value: v } })} />
      <TextInput label="Target date" type="date" value={d.target.date} onChange={(e) => setD({ ...d, target: { ...d.target, date: e.target.value } })} />
      <NumInput label="Planned budget" unit={p.currency} value={d.budgetPlanned} onValue={(v) => setD({ ...d, budgetPlanned: v })} />
      <div className="flex items-end md:col-span-2"><Btn type="submit" variant="primary" size="sm">Save details</Btn></div>
    </form>
  );
}
