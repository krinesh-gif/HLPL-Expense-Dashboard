"use client";
import { useActionState, useState } from "react";
import { recordCashReceived, type CashState } from "@/app/actions/cash";

const SOURCES = ["Scrap / pasti sale", "Supplier refund", "Customer collection", "Other"];

export default function CashReceivedForm() {
  const [state, action, pending] = useActionState<CashState, FormData>(recordCashReceived, {});
  const [from, setFrom] = useState<"FOUNDER" | "OTHER">("FOUNDER");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="card p-5">
      <h2 className="text-sm font-semibold">Record cash received</h2>
      <input type="hidden" name="from" value={from} />

      <div className="mt-4 grid grid-cols-2 gap-2">
        {([["FOUNDER", "From Krinesh"], ["OTHER", "Scrap or other"]] as const).map(([v, label]) => (
          <button key={v} type="button" onClick={() => setFrom(v)} aria-pressed={from === v}
            className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
              from === v ? "border-brand bg-brand-soft text-brand"
                         : "border-line bg-surface text-muted hover:bg-canvas"}`}>
            {label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted">
        {from === "FOUNDER"
          ? "Counts once Krinesh confirms he sent it."
          : "Cash you brought in yourself. Added straight away."}
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="label" htmlFor="r-amount">Amount</label>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-canvas px-4 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
            <span className="text-xl text-muted">₹</span>
            <input id="r-amount" name="amount" required inputMode="decimal" placeholder="0"
                   className="num w-full bg-transparent py-3 text-2xl font-semibold outline-none placeholder:text-line" />
          </div>
        </div>

        {from === "OTHER" && (
          <div>
            <label className="label" htmlFor="r-source">Where from</label>
            <select id="r-source" name="source" required defaultValue="" className="input">
              <option value="" disabled>Choose…</option>
              {SOURCES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="r-date">Date</label>
            <input id="r-date" name="date" type="date" defaultValue={today} max={today} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="r-note">Description</label>
            <input id="r-note" name="note" className="input" placeholder="What it was for" />
          </div>
        </div>
      </div>

      {state.error && <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{state.ok}</p>}

      <button type="submit" disabled={pending} className="btn-primary mt-5 w-full py-3">
        {pending ? "Saving…" : "Record cash received"}
      </button>
    </form>
  );
}
