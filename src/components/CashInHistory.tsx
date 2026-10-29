import { rs } from "@/lib/money";

export type CashIn = {
  id: string; date: string; amount: number; source: string | null; note: string | null;
  type: string; status: string; initiatedBy: string | null; rejectedReason: string | null;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  CONFIRMED: { label: "confirmed", cls: "bg-good-soft text-good" },
  PENDING: { label: "waiting", cls: "bg-warn-soft text-warn" },
  REJECTED: { label: "sent back", cls: "bg-danger-soft text-danger" },
};

const day = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC",
  });

/**
 * Everything that has come into this team's cash, with the state of each. A row
 * still waiting is shown but marked, so the figure at the top of the page and the
 * list below it tell the same story.
 */
export default function CashInHistory({ rows }: { rows: CashIn[] }) {
  const confirmed = rows.filter((r) => r.status === "CONFIRMED");
  const total = confirmed.reduce((a, r) => a + r.amount, 0);

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2 p-5 pb-3">
        <h2 className="text-sm font-semibold">Cash received</h2>
        <p className="text-sm text-muted">
          {confirmed.length} confirmed · <span className="num font-semibold text-ink">{rs(total)}</span>
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted">
          Nothing yet. Cash Krinesh sends you, and anything you take in yourself, shows here.
        </p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {rows.map((r) => {
            const st = STATUS[r.status] ?? STATUS.PENDING;
            const fromFounder = r.type === "ISSUE";
            return (
              <li key={r.id} className="flex items-start gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">
                      {fromFounder ? "From Krinesh" : (r.source ?? "Other")}
                    </span>
                    <span className={`chip border-transparent px-1.5 py-0 text-[10px] ${st.cls}`}>
                      {st.label}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {day(r.date)}
                    {r.note ? ` · ${r.note}` : ""}
                  </p>
                  {r.status === "REJECTED" && r.rejectedReason && (
                    <p className="mt-1 text-xs text-danger">{r.rejectedReason}</p>
                  )}
                  {r.status === "PENDING" && (
                    <p className="mt-1 text-xs text-warn">
                      {r.initiatedBy === "FOUNDER"
                        ? "Confirm it above to add it to your cash in hand."
                        : "Waiting for Krinesh to confirm. Not counted yet."}
                    </p>
                  )}
                </div>
                <p className={`num shrink-0 font-semibold ${
                  r.status === "CONFIRMED" ? "text-good" : "text-muted"
                }`}>
                  +{rs(r.amount)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
