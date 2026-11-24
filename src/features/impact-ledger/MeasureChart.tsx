import type { Project } from "@/features/store/types";

/** Reported readings over time with the baseline and target as reference lines. */
export function MeasureChart({ p }: { p: Project }) {
  const pts = p.measurements.map((m) => ({ t: Date.parse(m.date), v: m.value }));
  if (pts.length < 2) return <p className="text-sm text-lichen">Two or more readings are needed to draw a trend.</p>;
  const w = 600, h = 180, pad = 10;
  const refs = [p.baseline.value, p.target.value].filter((x): x is number => x !== null);
  const ys = [...pts.map((x) => x.v), ...refs];
  const t0 = Math.min(...pts.map((x) => x.t)), t1 = Math.max(...pts.map((x) => x.t));
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const sx = (t: number) => pad + ((t - t0) / (t1 - t0 || 1)) * (w - pad * 2);
  const sy = (v: number) => h - pad - ((v - y0) / (y1 - y0 || 1)) * (h - pad * 2);
  const d = pts.map((x, i) => `${i ? "L" : "M"}${sx(x.t).toFixed(1)},${sy(x.v).toFixed(1)}`).join(" ");
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={`${pts.length} reported readings of ${p.baseline.metric}`}>
        {p.baseline.value !== null && <line x1={pad} x2={w - pad} y1={sy(p.baseline.value)} y2={sy(p.baseline.value)} stroke="var(--lichen)" strokeDasharray="4 4" strokeWidth="1" />}
        {p.target.value !== null && <line x1={pad} x2={w - pad} y1={sy(p.target.value)} y2={sy(p.target.value)} stroke="var(--gold)" strokeDasharray="2 4" strokeWidth="1" />}
        <path d={d} fill="none" stroke="var(--sprout)" strokeWidth="1.5" />
        {pts.map((x, i) => <circle key={i} cx={sx(x.t)} cy={sy(x.v)} r="3" fill="var(--sprout)" />)}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-[0.12em] text-lichen">
        <span className="text-sprout">— reported readings</span>
        {p.baseline.value !== null && <span>- - baseline {p.baseline.value}</span>}
        {p.target.value !== null && <span className="text-gold">·· target {p.target.value}</span>}
      </figcaption>
    </figure>
  );
}
