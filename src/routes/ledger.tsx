import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageIntro } from "@/components/site/PageIntro";
import { Prov } from "@/components/site/Prov";
import { Btn, Empty, StatusPill, btnClass, download, fmtDate, money } from "@/components/site/ui";
import { useStore, useStoreReady, removeSamples, restoreSamples } from "@/features/store/store";
import { STATUS_COPY } from "@/features/store/rules";
import { projectSummary } from "@/features/impact-ledger/progress";
import { ReviewForm } from "@/features/impact-ledger/ReviewForm";
import type { Evidence, Project } from "@/features/store/types";

export const Route = createFileRoute("/ledger")({
  head: () => ({
    meta: [
      { title: "Impact Ledger — EARTH//OS" },
      { name: "description", content: "An accountable record of project progress: reported results, evidence awaiting review and independently verified milestones, kept separate." },
      { property: "og:title", content: "Impact Ledger — EARTH//OS" },
      { property: "og:description", content: "Claimed results and verified evidence, never confused." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LedgerPage,
});

function LedgerPage() {
  const ready = useStoreReady();
  const projects = useStore((s) => s.projects);
  const hasSamples = useStore((s) => s.projects.some((p) => p.sample) || s.passports.some((p) => p.sample));
  const state = useStore((s) => s);
  const [open, setOpen] = useState<string | null>(null);

  const queue = useMemo(() => projects.flatMap((p) => p.evidence.filter((e) => e.status === "under_review").map((e) => ({ p, e }))), [projects]);
  const feed = useMemo(() => projects.flatMap((p) => p.history.map((h) => ({ ...h, p }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 15), [projects]);
  const totals = useMemo(() => {
    const ev = projects.flatMap((p) => p.evidence);
    const ms = projects.map(projectSummary);
    return {
      projects: projects.length,
      active: projects.filter((p) => p.status === "active").length,
      reported: ev.filter((e) => e.status === "reported").length,
      review: ev.filter((e) => e.status === "under_review").length,
      verifiedEv: ev.filter((e) => e.status === "verified").length,
      verifiedMs: ms.reduce((a, s) => a + s.verified, 0),
      totalMs: ms.reduce((a, s) => a + s.total, 0),
    };
  }, [projects]);

  return (
    <>
      <PageIntro index="06" eyebrow="Impact Ledger" title={<>Claims are not <em className="text-sprout">proof.</em></>} lede="Every project result passes through the same states: reported by the team, under review, then verified by someone outside the team. Only verified milestones grow leaves on the Living Planet.">
        <div className="flex flex-wrap gap-3">
          <Link to="/projects" className={btnClass("primary")}>Manage projects</Link>
          <Btn onClick={() => download("earthos-ledger.json", JSON.stringify(state, null, 2), "application/json")}>Export ledger</Btn>
          {hasSamples ? <Btn variant="quiet" onClick={removeSamples}>Hide sample data</Btn> : <Btn variant="quiet" onClick={restoreSamples}>Show sample data</Btn>}
        </div>
      </PageIntro>

      <section className="mx-auto max-w-[1400px] px-5 py-12 md:px-10">
        {!ready ? <div className="h-40 animate-pulse bg-graphite" aria-label="Loading ledger" /> : (
          <>
            <dl className="grid grid-cols-2 border-l border-t border-hairline md:grid-cols-4 lg:grid-cols-7">
              {[["Projects", totals.projects], ["Active", totals.active], ["Reported", totals.reported], ["In review", totals.review], ["Verified evidence", totals.verifiedEv], ["Verified milestones", totals.verifiedMs], ["All milestones", totals.totalMs]].map(([k, v]) => (
                <div key={k} className="border-b border-r border-hairline p-4"><dt className="eyebrow">{k}</dt><dd className="mt-2 font-display text-4xl text-bone">{v}</dd></div>
              ))}
            </dl>

            <div className="mt-12 grid gap-12 lg:grid-cols-12">
              <section className="lg:col-span-7" aria-labelledby="q-h">
                <h2 id="q-h" className="eyebrow mb-4">Review queue · {queue.length}</h2>
                {queue.length === 0 ? <Empty title="Nothing to review.">When a team requests review on evidence, it appears here for an independent reviewer.</Empty> : (
                  <ul className="space-y-4">{queue.map(({ p, e }) => <QueueItem key={e.id} p={p} e={e} open={open === e.id} toggle={() => setOpen(open === e.id ? null : e.id)} />)}</ul>
                )}

                <h2 className="eyebrow mb-4 mt-12">All projects</h2>
                {projects.length === 0 ? <Empty title="The ledger is empty.">Register a project to start recording progress.</Empty> : (
                  <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="eyebrow"><tr><th className="py-2 font-normal">Project</th><th className="font-normal">Status</th><th className="font-normal">Verified</th><th className="font-normal">Latest reading</th><th className="font-normal">Spent</th></tr></thead>
                    <tbody className="divide-y divide-hairline">{projects.map((p) => { const s = projectSummary(p); return (
                      <tr key={p.id}>
                        <td className="py-3 pr-3"><Link to="/projects/$id" params={{ id: p.id }} className="text-bone hover:text-sprout">{p.title}</Link>{p.sample && <Prov kind="sample" className="ml-2" />}</td>
                        <td><StatusPill status={p.status} /></td>
                        <td className="font-mono text-xs">{s.verified}/{s.total}</td>
                        <td className="text-lichen">{s.latest ? `${s.latest.value.toLocaleString("en")} ${s.latest.unit}` : "—"}</td>
                        <td className="text-lichen">{money(s.spent, p.currency)}</td>
                      </tr>); })}</tbody>
                  </table></div>
                )}
              </section>

              <aside className="space-y-12 lg:col-span-5">
                <section>
                  <h2 className="eyebrow mb-4">What each state means</h2>
                  <dl className="divide-y divide-hairline border-y border-hairline">{Object.entries(STATUS_COPY).map(([k, v]) => (
                    <div key={k} className="flex gap-4 py-3"><dt className="w-32 shrink-0"><StatusPill status={k} /></dt><dd className="text-sm text-lichen">{v.meaning}</dd></div>
                  ))}</dl>
                </section>
                <section>
                  <h2 className="eyebrow mb-4">Recent activity</h2>
                  <ol className="space-y-3 text-sm">{feed.map((h, i) => (
                    <li key={i}><span className="font-mono text-[10px] text-lichen">{fmtDate(h.at)} · {h.p.title}</span><p className="text-bone/90">{h.text}</p></li>
                  ))}</ol>
                </section>
              </aside>
            </div>
          </>
        )}
      </section>
    </>
  );
}

function QueueItem({ p, e, open, toggle }: { p: Project; e: Evidence; open: boolean; toggle: () => void }) {
  const m = p.milestones.find((x) => x.id === e.milestoneId);
  return (
    <li className="border border-hairline p-4">
      <div className="flex flex-wrap items-center gap-2"><StatusPill status={e.status} />{p.sample && <Prov kind="sample" />}<Link to="/projects/$id" params={{ id: p.id }} className="font-mono text-[11px] text-lichen hover:text-bone">{p.title}</Link></div>
      <p className="mt-2 text-bone">{e.title}</p>
      <p className="text-sm text-lichen">Milestone: {m?.title ?? "—"} · produced {fmtDate(e.date)} · by {e.submittedBy}{e.file ? ` · ${e.file.name}` : " · no file"}</p>
      <p className="mt-1 text-sm text-lichen">{e.description}</p>
      <Btn size="sm" className="mt-3" onClick={toggle}>{open ? "Cancel" : "Review this evidence"}</Btn>
      {open && <ReviewForm projectId={p.id} ev={e} onDone={toggle} />}
    </li>
  );
}
