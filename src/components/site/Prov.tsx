import { cn } from "@/lib/utils";

export type ProvKind = "official" | "analysis" | "ai" | "calculated" | "reported" | "verified" | "sample" | "live";

export const PROV: Record<ProvKind, { label: string; meaning: string; cls: string }> = {
  official: { label: "Official UN", meaning: "Verbatim from the UN SDG framework.", cls: "text-prov-official border-prov-official/40" },
  live: { label: "Live data", meaning: "Fetched from a public API at view time.", cls: "text-prov-official border-prov-official/40" },
  analysis: { label: "EARTH//OS analysis", meaning: "Our editorial judgement, open to challenge.", cls: "text-prov-analysis border-prov-analysis/40" },
  ai: { label: "AI-generated", meaning: "Produced by a language model. Not verified.", cls: "text-prov-ai border-prov-ai/40" },
  calculated: { label: "Calculated estimate", meaning: "Deterministic formula on stated inputs.", cls: "text-prov-calculated border-prov-calculated/40" },
  reported: { label: "Reported", meaning: "Submitted by a participant. Not verified.", cls: "text-prov-reported border-prov-reported/40" },
  verified: { label: "Verified", meaning: "Evidence passed review.", cls: "text-prov-verified border-prov-verified/50" },
  sample: { label: "Hypothetical sample", meaning: "Invented to demonstrate the workflow.", cls: "text-prov-sample border-prov-sample/40" },
};

export function Prov({ kind, className, children }: { kind: ProvKind; className?: string; children?: React.ReactNode }) {
  const p = PROV[kind];
  return (
    <span
      title={p.meaning}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase leading-none tracking-[0.12em]",
        p.cls,
        className,
      )}
    >
      <span aria-hidden className="size-1 rounded-full bg-current" />
      {children ?? p.label}
    </span>
  );
}
