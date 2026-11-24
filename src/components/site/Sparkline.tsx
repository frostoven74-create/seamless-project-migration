import type { WbPoint } from "@/features/sdg/worldbank";

export function Sparkline({ points, height = 64, label }: { points: WbPoint[]; height?: number; label: string }) {
  if (points.length < 2) return <p className="text-xs text-lichen">Not enough data points for a trend.</p>;
  const w = 320;
  const xs = points.map((p) => p.year);
  const ys = points.map((p) => p.value);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const sx = (x: number) => ((x - x0) / (x1 - x0 || 1)) * (w - 8) + 4;
  const sy = (y: number) => height - 6 - ((y - y0) / (y1 - y0 || 1)) * (height - 12);
  const d = points.map((p, i) => `${i ? "L" : "M"}${sx(p.year).toFixed(1)},${sy(p.value).toFixed(1)}`).join(" ");
  const last = points[points.length - 1]!;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-auto w-full" role="img" aria-label={`${label}: ${points[0]!.year} to ${last.year}`}>
      <path d={`${d} L${sx(last.year)},${height} L${sx(points[0]!.year)},${height} Z`} fill="var(--sprout)" opacity="0.06" />
      <path d={d} fill="none" stroke="var(--sprout)" strokeWidth="1.25" />
      <circle cx={sx(last.year)} cy={sy(last.value)} r="3" fill="var(--sprout)" />
    </svg>
  );
}
