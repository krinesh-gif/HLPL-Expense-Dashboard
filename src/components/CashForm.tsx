"use client";
import { useActionState, useState } from "react";
import { addCashTxn, type CashState } from "@/app/actions/cash";

const TYPES = [
  { v: "RECEIPT", label: "Cash in", hint: "Supplier refund, billing recovery, collection" },
  { v: "ISSUE", label: "Give to team", hint: "Top up the warehouse or head-office float" },
  { v: "DRAWING", label: "Drawing", hint: "Money taken out by a director" },
] as const;

const SOURCES = ["Supplier Refund", "Billing Recovery", "Customer Refund", "Cash Sales", "Bank Withdrawal", "Other"];

export default function CashForm() {
  const [state, action, pending] = useActionState<CashState, FormData>(addCashTxn, {});
  const [type, setType] = useState<(typeof TYPES)[number]["v"]>("RECEIPT");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="card h-fit p-5">
      <h2 className="mb-4 text-sm font-semibold">Record cash movement</h2>
      <input type="hidden" name="type" value={type} />

      <div className="grid grid-cols-3 gap-2">
        {TYPES.map((t) => (
          <button key={t.v} type="button" onClick={() => setType(t.v)} aria-pressed={type === t.v}
            className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
              type === t.v ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-muted hover:bg-canvas"
            }`}>
            {t.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted">{TYPES.find((t) => t.v === type)!.hint}</p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="label" htmlFor="cash-amount">Amount</label>
          <input id="cash-amount" name="amount" required inputMode="decimal"
                 className="input num text-lg font-semibold" placeholder="0" />
        </div>

        {type === "ISSUE" ? (
          <div>
            <span className="label">To team</span>
            <div className="grid grid-cols-2 gap-2">
              {(["WH", "HO"] as const).map((c) => (
                <label key={c} className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm has-checked:border-brand has-checked:bg-brand-soft has-checked:text-brand">
                  <input type="radio" name="toCostCenter" value={c} required className="sr-only" />
                  {c === "WH" ? "Warehouse" : "Head Office"}
                </label>
              ))}
            </div>
            <input type="hidden" name="source" value="Founder" />
          </div>
        ) : type === "RECEIPT" ? (
          <div>
            <label className="label" htmlFor="source">Source</label>
            <select id="source" name="source" className="input" required defaultValue="">
              <option value="" disabled>Select a source…</option>
              {SOURCES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="source-d">Director</label>
            <input id="source-d" name="source" required className="input" placeholder="Name" />
          </div>
        )}

        <div>
          <label className="label" htmlFor="cash-date">Date</label>
          <input id="cash-date" name="date" type="date" defaultValue={today} max={today} className="input" />
        </div>

        <div>
          <label className="label" htmlFor="cash-note">Note</label>
          <input id="cash-note" name="note" className="input" placeholder="Optional" />
        </div>
      </div>

      {state.error && <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{state.ok}</p>}

      <button type="submit" disabled={pending} className="btn-primary mt-5 w-full">
        {pending ? "Saving…" : "Record"}
      </button>
    </form>
  );
}
