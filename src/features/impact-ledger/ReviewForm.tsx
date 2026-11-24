import { useState } from "react";
import { Btn, Check, TextArea, TextInput } from "@/components/site/ui";
import { commit, nowIso } from "@/features/store/commit";
import { reviewEvidence } from "@/features/store/actions";
import { REVIEW_CHECKLIST } from "@/features/store/rules";
import { uid } from "@/features/ripple-engine/passport";
import type { Evidence } from "@/features/store/types";

/** Human review step. The rules in actions.ts decide; this form only collects the reviewer's checks. */
export function ReviewForm({ projectId, ev, onDone }: { projectId: string; ev: Evidence; onDone?: () => void }) {
  const [reviewer, setReviewer] = useState("");
  const [note, setNote] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  function decide(decision: "verified" | "rejected") {
    if (commit((s) => reviewEvidence(s, projectId, { id: uid("rv"), evidenceId: ev.id, reviewer, decision, checklist: checks, note }, nowIso()), decision === "verified" ? "Evidence verified." : "Sent back with your notes."))
      onDone?.();
  }
  return (
    <div className="mt-4 grid gap-4 border border-biolume/30 bg-graphite/40 p-4">
      <p className="text-xs text-lichen">Reviewers must be independent of the project team. EARTH//OS checks the name against the team list and the submitter; it cannot confirm identity on its own.</p>
      <TextInput label="Reviewer (role or organisation)" value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="e.g. Governor, finance committee" />
      <div className="space-y-2">
        {REVIEW_CHECKLIST.map((c) => (
          <Check key={c.key} label={c.key === "document" && !ev.file ? `${c.label} (no file attached — cannot verify)` : c.label} checked={!!checks[c.key]} onChange={(v) => setChecks({ ...checks, [c.key]: v })} />
        ))}
      </div>
      <TextArea label="Note" hint="Required when sending back." value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Btn variant="primary" size="sm" onClick={() => decide("verified")}>Verify</Btn>
        <Btn variant="danger" size="sm" onClick={() => decide("rejected")}>Send back</Btn>
      </div>
    </div>
  );
}
