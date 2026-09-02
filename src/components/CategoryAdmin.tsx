"use client";
import { useActionState, useState } from "react";
import { saveCategory, type CatState } from "@/app/actions/category";

export type CatRow = {
  id: string; code: string; name: string; group: string; tallyLedger: string;
  costCenters: string[]; monthlyBudget: number; requiresBill: boolean; billThreshold: number;
  active: boolean; entries: number; spent: number;
};

const CCS = [
  { v: "WH", label: "Warehouse" },
  { v: "HO", label: "Head Office" },
  { v: "FOUNDER", label: "Founder" },
];
const inr = (v: number) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(v));

export default function CategoryAdmin({ rows }: { rows: CatRow[] }) {
  const [editing, setEditing] = useState<CatRow | "new" | null>(null);
  const groups = [...new Map(rows.map((r) => [r.group, rows.filter((x) => x.group === r.group)])).entries()];

  return (
    <div className="space-y-5">
      <button onClick={() => setEditing("new")} className="btn-primary">Add category</button>

      {editing && (
        <Editor row={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
      )}

      <div className="space-y-5">
        {groups.map(([group, items]) => (
          <section key={group} className="card overflow-hidden">
            <h2 className="border-b border-line bg-canvas px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
              {group}
            </h2>
            <ul className="divide-y divide-line">
              {items.map((c) => (
                <li key={c.id} className={`flex flex-wrap items-center gap-3 p-4 ${c.active ? "" : "opacity-50"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-2">
                      <span className="font-medium">{c.name}</span>
                      <span className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-muted">{c.code}</span>
                      {c.requiresBill && (
                        <span className="rounded bg-warn-soft px-1.5 py-0.5 text-[10px] text-warn">
                          bill needed{c.billThreshold > 1 ? ` above ${inr(c.billThreshold)}` : ""}
                        </span>
                      )}
                      {!c.active && <span className="text-[10px] text-muted">inactive</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Tally: {c.tallyLedger} · open to {c.costCenters.map((x) => CCS.find((y) => y.v === x)?.label).join(", ") || "nobody"} · {c.entries} entries
                    </p>
                  </div>

                  <div className="text-right text-sm">
                    <p className="num">
                      {inr(c.spent)}
                      <span className="text-muted"> / {c.monthlyBudget > 0 ? inr(c.monthlyBudget) : "no budget"}</span>
                    </p>
                    {c.monthlyBudget > 0 && (
                      <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-line">
                        <div style={{ width: `${Math.min(100, (c.spent / c.monthlyBudget) * 100)}%` }}
                             className={c.spent > c.monthlyBudget ? "h-full bg-danger" : "h-full bg-brand"} />
                      </div>
                    )}
                  </div>

                  <button onClick={() => setEditing(c)} className="btn-ghost px-3 py-1.5 text-xs">Edit</button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function Editor({ row, onDone }: { row: CatRow | null; onDone: () => void }) {
  const [state, action, pending] = useActionState<CatState, FormData>(saveCategory, {});
  const [requiresBill, setRequiresBill] = useState(row?.requiresBill ?? false);
  if (state.ok) queueMicrotask(onDone);

  return (
    <form action={action} className="card space-y-4 p-5">
      {row && <input type="hidden" name="id" value={row.id} />}
      <h2 className="text-sm font-semibold">{row ? `Edit ${row.name}` : "New category"}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="c-name">Name</label>
          <input id="c-name" name="name" required defaultValue={row?.name} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="c-code">Code</label>
          <input id="c-code" name="code" required defaultValue={row?.code} className="input font-mono uppercase"
                 placeholder="COURIER" />
        </div>
        <div>
          <label className="label" htmlFor="c-group">Group</label>
          <input id="c-group" name="group" required defaultValue={row?.group} className="input"
                 placeholder="Logistics & Fulfilment" />
        </div>
        <div>
          <label className="label" htmlFor="c-tally">Tally ledger</label>
          <input id="c-tally" name="tallyLedger" required defaultValue={row?.tallyLedger} className="input"
                 placeholder="Courier & Forwarding" />
        </div>
        <div>
          <label className="label" htmlFor="c-budget">Monthly budget (₹)</label>
          <input id="c-budget" name="monthlyBudget" type="number" min={0} defaultValue={row?.monthlyBudget ?? 0}
                 className="input num" />
        </div>
        <div>
          <label className="label" htmlFor="c-thresh">Bill required above (₹)</label>
          <input id="c-thresh" name="billThreshold" type="number" min={0} defaultValue={row?.billThreshold ?? 0}
                 disabled={!requiresBill} className="input num disabled:bg-canvas disabled:text-muted" />
        </div>
      </div>

      <div>
        <span className="label">Open to</span>
        <div className="flex flex-wrap gap-4">
          {CCS.map((c) => (
            <label key={c.v} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="costCenters" value={c.v}
                     defaultChecked={row ? row.costCenters.includes(c.v) : true}
                     className="size-4 accent-[var(--color-brand)]" />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="requiresBill" checked={requiresBill}
                 onChange={(e) => setRequiresBill(e.target.checked)}
                 className="size-4 accent-[var(--color-brand)]" />
          Require a bill number
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={row?.active ?? true}
                 className="size-4 accent-[var(--color-brand)]" />
          Active
        </label>
      </div>

      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary">{pending ? "Saving…" : "Save"}</button>
        <button type="button" onClick={onDone} className="btn-ghost">Cancel</button>
      </div>
    </form>
  );
}
