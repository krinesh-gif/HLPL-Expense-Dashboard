"use client";
import { useActionState, useState } from "react";
import { importWorkbooks, type ImportState } from "@/app/actions/admin";

const FIELDS = [
  { name: "founder", label: "Founder workbook", hint: "HLPL_Cash_Expense_Advanced_FY2627" },
  { name: "wh", label: "Warehouse workbook", hint: "WH-Expense Sheet FY2627" },
  { name: "ho", label: "Head office workbook", hint: "HO-Expense Sheet FY2627" },
] as const;

/** Vercel rejects a request body over 4.5 MB before it reaches us, so refuse earlier. */
const MAX_TOTAL = 4 * 1024 * 1024;
const mb = (b: number) => (b / 1024 / 1024).toFixed(1) + " MB";

export default function ImportForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importWorkbooks, {});
  const [picked, setPicked] = useState<Record<string, { name: string; size: number }>>({});

  const chosen = FIELDS.filter((f) => picked[f.name]);
  const missing = FIELDS.filter((f) => !picked[f.name]);
  const total = Object.values(picked).reduce((a, p) => a + p.size, 0);
  const tooBig = total > MAX_TOTAL;
  const ready = missing.length === 0 && !tooBig;

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
              onChange={(e) => {
                const file = e.target.files?.[0];
                setPicked((p) => {
                  const next = { ...p };
                  if (file) next[f.name] = { name: file.name, size: file.size };
                  else delete next[f.name];
                  return next;
                });
              }}
              className="w-full cursor-pointer rounded-lg border border-line bg-surface p-2 text-sm
                         file:mr-3 file:rounded-md file:border-0 file:bg-canvas file:px-3 file:py-1.5
                         file:text-sm file:font-medium hover:bg-canvas"
            />
          </div>
        ))}

        <p className="rounded-lg bg-canvas px-3 py-2 text-xs text-muted">
          Rows already imported are left exactly as they are, including any category you
          re-tagged by hand. Only entries not seen before are added.
        </p>

        {tooBig && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            Those files come to {mb(total)}, and the limit is {mb(MAX_TOTAL)}. Delete the
            dashboard and chart sheets from a copy of the workbook — the import only reads
            the ledger, inflow, drawings, historical and cash book sheets — then try again.
          </p>
        )}

        {!tooBig && missing.length > 0 && chosen.length > 0 && (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
            Still need the {missing.map((f) => f.label.replace(" workbook", "")).join(" and ")} workbook
            {missing.length > 1 ? "s" : ""}. All three are imported together.
          </p>
        )}

        {state.error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>
        )}

        <button type="submit" disabled={pending || !ready} className="btn-primary w-full py-3">
          {pending
            ? "Importing… this takes a few seconds"
            : missing.length > 0
              ? `Choose all three files (${chosen.length} of 3)`
              : tooBig
                ? "Files are too large"
                : "Import"}
        </button>
      </form>

      {state.result && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-brand">
            Added {state.result.expenses} expenses and {state.result.cashTxns} cash movements.
          </h2>
          {state.result.skipped > 0 && (
            <p className="mt-1 text-xs text-muted">
              {state.result.skipped} rows were already here and were left untouched.
            </p>
          )}
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
