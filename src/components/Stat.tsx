export default function Stat({
  label, value, hint, delta, tone = "default",
}: {
  label: string; value: string; hint?: string;
  delta?: { pct: number; good?: boolean } | null;
  tone?: "default" | "danger" | "warn" | "brand";
}) {
  const toneClass =
    tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn"
    : tone === "brand" ? "text-brand" : "text-ink";

  return (
    <div className="card p-4 transition hover:border-line-strong sm:p-5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className={`num mt-2 text-2xl font-semibold tracking-tight sm:text-[28px] ${toneClass}`}>
        {value}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {delta && (
          <span className={`chip border-transparent px-2 py-0.5 text-[11px] ${
            delta.good ? "bg-good-soft text-good" : "bg-warn-soft text-warn"}`}>
            {delta.pct >= 0 ? "↑" : "↓"} {Math.abs(delta.pct).toFixed(0)}%
          </span>
        )}
        {hint && <p className="text-[11px] leading-snug text-muted">{hint}</p>}
      </div>
    </div>
  );
}
