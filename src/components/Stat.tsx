export default function Stat({
  label, value, hint, tone = "default",
}: { label: string; value: string; hint?: string; tone?: "default" | "danger" | "warn" | "brand" }) {
  const toneClass =
    tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : tone === "brand" ? "text-brand" : "text-ink";
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`num mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
