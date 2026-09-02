"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveCategory, deleteCategory, type CatState } from "@/app/actions/category";
import { COLOR_KEYS, ICON_CHOICES, colorOf, isColorKey } from "@/lib/palette";
import { PencilIcon, TrashIcon, PlusIcon } from "./Icons";

export type CatRow = {
  id: string; code: string; name: string; group: string; tallyLedger: string;
  icon: string; color: string;
  costCenters: string[]; monthlyBudget: number; requiresBill: boolean; billThreshold: number;
  active: boolean; entries: number; spent: number;
};

const CCS = [
  { v: "WH", label: "Warehouse" },
  { v: "HO", label: "Head Office" },
  { v: "FOUNDER", label: "Founder" },
];
/** The edit and remove panels render above the list, so bring them into view. */
function usePanelFocus() {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);
  return ref;
}

const inr = (v: number) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(v));

export default function CategoryAdmin({ rows }: { rows: CatRow[] }) {
  const [editing, setEditing] = useState<CatRow | "new" | null>(null);
  const [removing, setRemoving] = useState<CatRow | null>(null);
  const groups = [...new Map(rows.map((r) => [r.group, rows.filter((x) => x.group === r.group)])).entries()];

  return (
    <div className="space-y-5">
      <button onClick={() => setEditing("new")} className="btn-primary">
        <PlusIcon className="size-4" /> Add category
      </button>

      {editing && (
        <Editor row={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
      )}
      {removing && (
        <RemoveForm row={removing} all={rows} onDone={() => setRemoving(null)} />
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
                  <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-xl text-lg ${isColorKey(c.color) ? `cat-${c.color}` : "cat-slate"}`}
                        style={{ background: "var(--chip-soft)" }}>{c.icon}</span>
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

                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(c); setRemoving(null); }}
                            aria-label={`Edit ${c.name}`} title="Edit" className="icon-btn">
                      <PencilIcon className="size-4" />
                    </button>
                    <button onClick={() => { setRemoving(c); setEditing(null); }}
                            aria-label={`Remove ${c.name}`} title="Remove"
                            className="icon-btn hover:text-danger">
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
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
  const [icon, setIcon] = useState(row?.icon ?? "🔖");
  const [color, setColor] = useState(row?.color ?? "slate");
  const ref = usePanelFocus();
  if (state.ok) queueMicrotask(onDone);

  return (
    <form ref={ref} action={action} className="card space-y-4 p-5">
      {row && <input type="hidden" name="id" value={row.id} />}
      <h2 className="text-sm font-semibold">{row ? `Edit ${row.name}` : "New category"}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <span className="label">Icon</span>
          <input type="hidden" name="icon" value={icon} />
          <div className="flex flex-wrap gap-1.5">
            {ICON_CHOICES.map((e) => (
              <button key={e} type="button" onClick={() => setIcon(e)} aria-pressed={icon === e}
                className={`grid size-9 place-items-center rounded-lg border text-lg transition ${
                  icon === e ? "border-brand bg-brand-soft" : "border-line bg-surface hover:bg-canvas"}`}>
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <span className="label">Colour</span>
          <input type="hidden" name="color" value={color} />
          <div className="flex flex-wrap gap-1.5">
            {COLOR_KEYS.map((k) => (
              <button key={k} type="button" onClick={() => setColor(k)} aria-pressed={color === k}
                aria-label={k} title={k}
                className={`size-8 rounded-lg border-2 transition ${
                  color === k ? "border-ink scale-105" : "border-transparent hover:scale-105"}`}
                style={{ background: colorOf(k).solid }} />
            ))}
          </div>
        </div>

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
                 readOnly={!requiresBill} className="input num read-only:bg-canvas read-only:text-muted" />
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

function RemoveForm({ row, all, onDone }: { row: CatRow; all: CatRow[]; onDone: () => void }) {
  const [state, action, pending] = useActionState<CatState, FormData>(deleteCategory, {});
  const ref = usePanelFocus();
  if (state.ok) queueMicrotask(onDone);

  const targets = all.filter((c) => c.id !== row.id && c.active);

  return (
    <form ref={ref} action={action} className="card space-y-4 border-danger/30 bg-danger-soft p-5">
      <input type="hidden" name="id" value={row.id} />
      <h2 className="text-sm font-semibold text-danger">Remove “{row.name}”</h2>

      {row.entries > 0 ? (
        <>
          <p className="text-sm">
            {row.entries} entries are booked to this head. Choose where they should go —
            they keep their amounts and dates, only the category changes.
          </p>
          <div className="max-w-sm">
            <label className="label" htmlFor="moveTo">Move those entries to</label>
            <select id="moveTo" name="moveToId" required defaultValue="" className="input">
              <option value="" disabled>Choose a category…</option>
              {targets.map((c) => (
                <option key={c.id} value={c.id}>{c.group} — {c.name}</option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <p className="text-sm">
          Nothing is booked to this head, so it can be removed outright.
        </p>
      )}

      {state.error && (
        <p role="alert" className="rounded-lg bg-surface px-3 py-2 text-sm text-danger">{state.error}</p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={pending}
                className="btn rounded-lg bg-danger px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">
          {pending ? "Removing…" : row.entries > 0 ? `Move ${row.entries} entries and remove` : "Remove"}
        </button>
        <button type="button" onClick={onDone} className="btn-ghost">Cancel</button>
      </div>
    </form>
  );
}
