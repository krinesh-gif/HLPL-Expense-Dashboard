"use client";
import { useActionState, useState } from "react";
import { importWorkbooks, type ImportState } from "@/app/actions/admin";

const FIELDS = [
  { name: "founder", label: "Founder workbook", hint: "HLPL_Cash_Expense_Advanced_FY2627" },
  { name: "wh", label: "Warehouse workbook", hint: "WH-Expense Sheet FY2627" },
  { name: "ho", label: "Head office workbook", hint: "HO-Expense Sheet FY2627" },
] as const;

export default function ImportForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importWorkbooks, {});
  const [picked, setPicked] = useState<Record<string, string>>({});
  const ready = FIELDS.every((f) => picked[f.name]);

  return (
    <>
      <form action={action} className="card space-y-4 p-5">
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label className="label" htmlFor={`f-${f.name}`}>
              {f.label} <span className="font-normal text-muted">— {f.hint}</span>
            </label>
            <input
              id={`f-${f.name}`} name={f.name} type="file" accept=".xlsx" required
              onChange={(e) => setPicked((p) => ({ ...p, [f.name]: e.target.files?.[0]?.name ?? "" }))}
              className="w-full cursor-pointer rounded-lg border border-line bg-surface p-2 text-sm
                         file:mr-3 file:rounded-md file:border-0 file:bg-canvas file:px-3 file:py-1.5
                         file:text-sm file:font-medium hover:bg-canvas"
            />
          </div>
        ))}

        <p className="rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
          This replaces every previously imported row. Entries your team typed into the
          app are left alone.
        </p>

        {state.error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>
        )}

        <button type="submit" disabled={pending || !ready} className="btn-primary w-full py-3">
          {pending ? "Importing… this takes a few seconds" : "Import"}
        </button>
      </form>

      {state.result && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-brand">
            Imported {state.result.expenses} expenses and {state.result.cashTxns} cash movements.
          </h2>
          <dl className="mt-3 divide-y divide-line text-sm">
            {Object.entries(state.result.stats).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-1.5">
                <dt className="text-muted">{k}</dt>
                <dd className="num font-medium">{Math.round(v).toLocaleString("en-IN")}</dd>
              </div>
            ))}
          </dl>
          {state.result.unmapped.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-warn">
                Labels that had no matching category and went to “Unclassified”:
              </p>
              <ul className="mt-1 text-xs text-muted">
                {state.result.unmapped.map((u) => (
                  <li key={u.label}>{u.count}× {u.label}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </>
  );
}
