"use client";
import { useActionState, useState } from "react";
import { declareCashCount, type CashState } from "@/app/actions/cash";

const inr = (v: number) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(v));

export default function CountForm({ bookBalance }: { bookBalance: number }) {
  const [state, action, pending] = useActionState<CashState, FormData>(declareCashCount, {});
  const [counted, setCounted] = useState("");
  const c = parseFloat(counted);
  const variance = Number.isFinite(c) ? c - bookBalance : null;

  return (
    <form action={action} className="card p-5">
      <label className="label" htmlFor="countedAmount">Cash you are holding right now</label>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-canvas px-4 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
        <span className="text-xl text-muted">₹</span>
        <input id="countedAmount" name="countedAmount" required inputMode="decimal"
               value={counted} onChange={(e) => setCounted(e.target.value.replace(/[^0-9.]/g, ""))}
               placeholder="0" className="num w-full bg-transparent py-3.5 text-2xl font-semibold outline-none placeholder:text-line" />
      </div>

      {variance !== null && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${
          variance === 0 ? "bg-brand-soft text-brand" : "bg-warn-soft text-warn"
        }`}>
          {variance === 0
            ? "Matches the book exactly."
            : `${inr(Math.abs(variance))} ${variance > 0 ? "more" : "less"} than the book. Explain the gap below.`}
        </p>
      )}

      <div className="mt-4">
        <label className="label" htmlFor="note">Note {variance !== null && variance !== 0 && <span className="text-warn">— required</span>}</label>
        <input id="note" name="note" className="input" placeholder="e.g. bill not yet entered, change pending with staff" />
      </div>

      {state.error && <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{state.ok}</p>}

      <button type="submit" disabled={pending || !counted} className="btn-primary mt-5 w-full">
        {pending ? "Saving…" : "Record count"}
      </button>
    </form>
  );
}
