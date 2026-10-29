"use client";
import { useState, useTransition } from "react";
import { confirmTransfer, rejectTransfer } from "@/app/actions/cash";

export type Transfer = {
  id: string; date: string; amount: number; note: string | null;
  source: string | null; costCenter: string | null; initiatedBy: string | null;
};

const inr = (v: number) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(v));
const day = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" });

const CC: Record<string, string> = { WH: "Warehouse", HO: "Head Office" };

export default function TransferList({
  rows, asFounder,
}: { rows: Transfer[]; asFounder: boolean }) {
  if (rows.length === 0) return null;

  return (
    <section className="card border-warn/25 bg-warn-soft p-5">
      <h2 className="text-sm font-semibold text-warn">
        {asFounder
          ? `${rows.length} hand-${rows.length === 1 ? "over" : "overs"} your team says they received`
          : `${rows.length} hand-${rows.length === 1 ? "over" : "overs"} waiting for you to confirm`}
      </h2>
      <p className="mt-1 text-xs text-muted">
        {asFounder
          ? "Confirming adds it to your cash out and to their float. Reject it if you did not send it."
          : "Confirming adds it to your cash in hand. Say it is wrong if you did not get it."}
      </p>
      <ul className="mt-4 space-y-3">
        {rows.map((t) => <Row key={t.id} t={t} asFounder={asFounder} />)}
      </ul>
    </section>
  );
}

function Row({ t, asFounder }: { t: Transfer; asFounder: boolean }) {
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const act = (fn: (f: FormData) => Promise<{ ok?: string; error?: string }>, extra?: Record<string, string>) => {
    const f = new FormData();
    f.set("id", t.id);
    for (const [k, v] of Object.entries(extra ?? {})) f.set(k, v);
    start(async () => {
      const r = await fn(f);
      if (r.error) setMsg(r.error);
    });
  };

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="num text-lg font-semibold">{inr(t.amount)}</p>
          <p className="mt-0.5 text-xs text-muted">
            {day(t.date)}
            {asFounder && t.costCenter ? ` · ${CC[t.costCenter] ?? t.costCenter}` : ""}
            {t.note ? ` · ${t.note}` : ""}
          </p>
        </div>
        {!rejecting && (
          <div className="flex gap-2">
            <button onClick={() => act(confirmTransfer)} disabled={pending} className="btn-primary px-3 py-2 text-xs">
              {pending ? "Saving…" : asFounder ? "Yes, I sent it" : "Yes, I got it"}
            </button>
            <button onClick={() => setRejecting(true)} disabled={pending} className="btn-ghost px-3 py-2 text-xs">
              No
            </button>
          </div>
        )}
      </div>

      {rejecting && (
        <form
          action={(f) => { f.set("id", t.id); act(rejectTransfer, { reason: String(f.get("reason") ?? "") }); }}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <input name="reason" required autoFocus className="input max-w-xs flex-1 py-2 text-sm"
                 placeholder={asFounder ? "e.g. I sent 20,000 not 30,000" : "e.g. I only received 20,000"} />
          <button type="submit" disabled={pending}
                  className="btn rounded-lg bg-danger px-3 py-2 text-xs text-white hover:opacity-90">
            {pending ? "Saving…" : "Send back"}
          </button>
          <button type="button" onClick={() => setRejecting(false)} className="btn-ghost px-3 py-2 text-xs">
            Cancel
          </button>
        </form>
      )}

      {msg && <p role="alert" className="mt-2 text-sm text-danger">{msg}</p>}
    </li>
  );
}
