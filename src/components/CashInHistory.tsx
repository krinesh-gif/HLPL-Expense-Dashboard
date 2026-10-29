import { rs } from "@/lib/money";

export type CashIn = {
  id: string; date: string; amount: number; source: string | null; note: string | null;
  type: string; status: string; initiatedBy: string | null; rejectedReason: string | null;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  CONFIRMED: { label: "Confirmed", cls: "bg-good-soft text-good" },
  PENDING: { label: "Waiting", cls: "bg-warn-soft text-warn" },
  REJECTED: { label: "Sent back", cls: "bg-danger-soft text-danger" },
};

const day = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC",
  });

/** Why a row is not counted yet, in the words that tell the reader what to do. */
function waitingNote(r: CashIn): string | null {
  if (r.status === "REJECTED") return r.rejectedReason ?? "Sent back by the other side.";
  if (r.status !== "PENDING") return null;
  return r.initiatedBy === "FOUNDER"
    ? "Confirm it above to add it to your cash in hand."
    : "Waiting for Krinesh to confirm. Not counted yet.";
}

export default function CashInHistory({ rows }: { rows: CashIn[] }) {
  const confirmed = rows.filter((r) => r.status === "CONFIRMED");
  const total = confirmed.reduce((a, r) => a + r.amount, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Cash received</h2>
        <p className="text-sm text-muted">
          {confirmed.length} confirmed · <span className="num font-semibold text-ink">{rs(total)}</span>
          {rows.length > confirmed.length && (
            <span className="text-muted"> · {rows.length - confirmed.length} not counted</span>
          )}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">
          Nothing yet. Cash Krinesh sends you, and anything you take in yourself, shows here.
        </p>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm md:min-w-[680px]">
              <thead>
                <tr className="border-b border-line bg-raised text-left text-[11px] uppercase tracking-wider text-muted">
                  <th className="w-20 px-3 py-3 font-semibold md:w-24">Date</th>
                  <th className="px-3 py-3 font-semibold md:w-44">From</th>
                  <th className="hidden px-3 py-3 font-semibold md:table-cell">Description</th>
                  <th className="hidden w-28 px-3 py-3 font-semibold lg:table-cell">Status</th>
                  <th className="w-28 px-3 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = STATUS[r.status] ?? STATUS.PENDING;
                  const note = waitingNote(r);
                  const from = r.type === "ISSUE" ? "Krinesh" : (r.source ?? "Other");
                  return (
                    <tr key={r.id} className="border-b border-line align-top transition-colors hover:bg-raised">
                      <td className="num px-2 py-2.5 text-muted md:whitespace-nowrap md:px-3">{day(r.date)}</td>
                      <td className="px-2 py-2.5 md:px-3">
                        {from}
                        {/* the columns hidden on a phone, folded in so nothing is lost */}
                        <span className="mt-0.5 block md:hidden">
                          <span className={`chip border-transparent px-1.5 py-0 text-[10px] ${st.cls}`}>
                            {st.label}
                          </span>
                          {r.note && <span className="ml-1.5 text-xs text-muted">{r.note}</span>}
                          {note && <span className="mt-0.5 block text-xs text-warn">{note}</span>}
                        </span>
                      </td>
                      <td className="hidden px-3 py-2.5 text-muted md:table-cell">
                        {r.note || "—"}
                        <span className="mt-0.5 block lg:hidden">
                          <span className={`chip border-transparent px-1.5 py-0 text-[10px] ${st.cls}`}>
                            {st.label}
                          </span>
                        </span>
                        {note && <span className="mt-0.5 block text-xs text-warn">{note}</span>}
                      </td>
                      <td className="hidden px-3 py-2.5 lg:table-cell">
                        <span className={`chip border-transparent px-2 py-0.5 text-[11px] ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className={`num whitespace-nowrap px-2 py-2.5 text-right font-semibold md:px-3 ${
                        r.status === "CONFIRMED" ? "text-good" : "text-muted"
                      }`}>
                        +{rs(r.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
