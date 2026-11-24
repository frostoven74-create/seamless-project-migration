import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "line" | "quiet" | "danger"; size?: "sm" | "md" };

export const btnClass = (variant: BtnProps["variant"] = "line", size: BtnProps["size"] = "md") =>
  cn(
    "inline-flex items-center justify-center gap-2 rounded-sm font-mono uppercase tracking-[0.14em] transition-[background,color,border-color,transform] duration-300 ease-[var(--ease-organic)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
    size === "sm" ? "px-3 py-2 text-[10px]" : "px-5 py-3 text-[11px]",
    variant === "primary" && "bg-sprout text-void hover:bg-bone",
    variant === "line" && "border border-hairline text-bone hover:border-sprout/60 hover:text-sprout",
    variant === "quiet" && "text-lichen hover:text-bone",
    variant === "danger" && "border border-destructive/40 text-destructive hover:bg-destructive/10",
  );

export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn({ variant, size, className, type = "button", ...rest }, ref) {
  return <button ref={ref} type={type} className={cn(btnClass(variant, size), className)} {...rest} />;
});

export const inputClass =
  "w-full rounded-sm border border-hairline bg-graphite/60 px-3 py-2.5 text-sm text-bone placeholder:text-lichen/50 transition-colors focus:border-biolume/60 focus:outline-none";

export function Field({ label, hint, children, className, htmlFor }: { label: React.ReactNode; hint?: React.ReactNode | undefined; children: React.ReactNode; className?: string | undefined; htmlFor?: string | undefined }) {
  return (
    <div className={cn("block", className)}>
      <label htmlFor={htmlFor} className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-lichen">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-lichen/80">{hint}</p>}
    </div>
  );
}

export function TextInput({ label, hint, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; hint?: React.ReactNode }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} className={className} htmlFor={id}>
      <input id={id} className={inputClass} {...rest} />
    </Field>
  );
}

export function TextArea({ label, hint, className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: React.ReactNode; hint?: React.ReactNode }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} className={className} htmlFor={id}>
      <textarea id={id} className={cn(inputClass, "min-h-24 resize-y leading-relaxed")} {...rest} />
    </Field>
  );
}

/** Number input where empty means "not provided" (null), never zero. */
export function NumInput({
  label,
  hint,
  value,
  onValue,
  unit,
  className,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { label: React.ReactNode; hint?: React.ReactNode; value: number | null | undefined; onValue: (v: number | null) => void; unit?: string }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} className={className} htmlFor={id}>
      <div className="flex items-stretch">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className={cn(inputClass, unit && "rounded-r-none")}
          value={value ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            onValue(raw === "" ? null : Number(raw));
          }}
          {...rest}
        />
        {unit && <span className="flex shrink-0 items-center rounded-r-sm border border-l-0 border-hairline px-2.5 font-mono text-[10px] text-lichen">{unit}</span>}
      </div>
    </Field>
  );
}

export function Select({ label, hint, className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: React.ReactNode; hint?: React.ReactNode }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} className={className} htmlFor={id}>
      <select id={id} className={cn(inputClass, "appearance-none bg-[length:10px] pr-8")} {...rest}>
        {children}
      </select>
    </Field>
  );
}

export function Check({ label, checked, onChange, className }: { label: React.ReactNode; checked: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 text-sm text-bone/90", className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--sprout)]" />
      <span>{label}</span>
    </label>
  );
}

export function Eyebrow({ n, children, className }: { n?: string; children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("eyebrow", className)}>
      {n && <span className="text-sprout">{n}</span>}
      {n && " — "}
      {children}
    </p>
  );
}

const STATUS_TONE: Record<string, string> = {
  proposed: "text-lichen border-lichen/30",
  planned: "text-bone border-bone/30",
  active: "text-biolume border-biolume/40",
  completed: "text-gold border-gold/50",
  reported: "text-prov-reported border-prov-reported/40",
  under_review: "text-biolume border-biolume/40",
  verified: "text-gold border-gold/50",
  rejected: "text-destructive border-destructive/40",
  needs_changes: "text-destructive border-destructive/40",
};
const STATUS_LABEL: Record<string, string> = {
  proposed: "Proposed",
  planned: "Planned",
  active: "Active",
  completed: "Completed",
  reported: "Reported",
  under_review: "Under review",
  verified: "Verified",
  rejected: "Not accepted",
  needs_changes: "Needs changes",
};
export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase leading-none tracking-[0.12em]", STATUS_TONE[status] ?? "text-lichen border-hairline", className)}>
      <span aria-hidden className={cn("size-1 rounded-full bg-current", status === "verified" && "shadow-[0_0_6px_currentColor]")} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="border border-dashed border-hairline px-6 py-12 text-center">
      <p className="font-display text-3xl text-bone">{title}</p>
      {children && <div className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-lichen">{children}</div>}
    </div>
  );
}

export function money(n: number | null | undefined, currency: string) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currency.length === 3 ? currency : "USD", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${Math.round(n).toLocaleString("en")} ${currency}`;
  }
}

export function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "earthos";
}

export function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
