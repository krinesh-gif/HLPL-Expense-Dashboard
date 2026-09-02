"use client";
import { useActionState, useMemo, useState, useRef, useEffect } from "react";
import { addExpense, type EntryState } from "@/app/actions/expense";

export type CatOption = {
  id: string; name: string; group: string; uses: number;
  budget: number | null; spent: number;
  requiresBill: boolean; billThreshold: number | null;
};

const MODES = ["CASH", "UPI", "BANK", "CARD"] as const;
const inr = (v: number) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(v));
const today = () => new Date().toISOString().slice(0, 10);

export default function EntryForm({ categories }: { categories: CatOption[] }) {
  const [state, action, pending] = useActionState<EntryState, FormData>(addExpense, {});
  const [catId, setCatId] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<(typeof MODES)[number]>("CASH");
  const [showAll, setShowAll] = useState(false);
  const [more, setMore] = useState(false);
  const [q, setQ] = useState("");
  const amountRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // clear the form after a successful save so the next entry is immediate
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setCatId(""); setAmount(""); setMode("CASH"); setMore(false); setShowAll(false); setQ("");
      amountRef.current?.focus();
    }
  }, [state.ok]);

  const cat = categories.find((c) => c.id === catId);
  const amt = parseFloat(amount) || 0;
  const quick = useMemo(() => categories.slice(0, 8), [categories]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = t
      ? categories.filter((c) => c.name.toLowerCase().includes(t) || c.group.toLowerCase().includes(t))
      : categories;
    const groups = new Map<string, CatOption[]>();
    for (const c of list) groups.set(c.group, [...(groups.get(c.group) ?? []), c]);
    return [...groups];
  }, [categories, q]);

  const billNeeded = !!cat?.requiresBill && amt >= (cat.billThreshold ?? 0);
  const budgetLeft = cat?.budget ? cat.budget - cat.spent : null;
  const wouldExceed = budgetLeft !== null && amt > budgetLeft;

  return (
    <form ref={formRef} action={action} className="card p-5">
      <input type="hidden" name="categoryId" value={catId} />
      <input type="hidden" name="paymentMode" value={mode} />

      {/* Amount */}
      <label className="label" htmlFor="amount">Amount</label>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-canvas px-4 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
        <span className="text-2xl text-muted">₹</span>
        <input
          ref={amountRef} id="amount" name="amount" required autoFocus
          inputMode="decimal" pattern="[0-9]*[.]?[0-9]*" placeholder="0"
          value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          className="num w-full bg-transparent py-4 text-3xl font-semibold outline-none placeholder:text-line"
        />
      </div>

      {/* Category */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <span className="label mb-0">Category</span>
          <button type="button" onClick={() => setShowAll((v) => !v)}
                  className="text-xs font-medium text-brand hover:underline">
            {showAll ? "Show frequent" : "All categories"}
          </button>
        </div>

        {!showAll ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {quick.map((c) => (
              <Chip key={c.id} active={catId === c.id} onClick={() => setCatId(c.id)}>{c.name}</Chip>
            ))}
          </div>
        ) : (
          <div className="mt-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search category…"
                   className="input mb-3" aria-label="Search category" />
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {filtered.map(([group, items]) => (
                <div key={group}>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{group}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((c) => (
                      <Chip key={c.id} active={catId === c.id}
                            onClick={() => { setCatId(c.id); setShowAll(false); setQ(""); }}>
                        {c.name}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-sm text-muted">No category matches “{q}”.</p>}
            </div>
          </div>
        )}

        {cat?.budget ? (
          <BudgetMeter name={cat.name} budget={cat.budget} spent={cat.spent} adding={amt} />
        ) : null}
        {wouldExceed && (
          <p className="mt-2 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
            This entry takes {cat!.name} {inr(amt - budgetLeft!)} past its {inr(cat!.budget!)} monthly budget.
            You can still save it — it will show as an overrun on the founder’s dashboard.
          </p>
        )}
      </div>

      {/* Payment mode */}
      <div className="mt-5">
        <span className="label">Paid by</span>
        <div className="grid grid-cols-4 gap-2">
          {MODES.map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded-lg border px-2 py-2 text-sm font-medium transition ${
                mode === m ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-muted hover:bg-canvas"
              }`}>
              {m === "CASH" ? "Cash" : m === "BANK" ? "Bank" : m === "CARD" ? "Card" : "UPI"}
            </button>
          ))}
        </div>
      </div>

      {billNeeded && (
        <div className="mt-5">
          <label className="label" htmlFor="billNo">
            Bill number <span className="text-warn">— required for this head</span>
          </label>
          <input id="billNo" name="billNo" required className="input" placeholder="Invoice / bill no." />
        </div>
      )}

      {/* Optional detail */}
      <button type="button" onClick={() => setMore((v) => !v)}
              className="mt-5 text-xs font-medium text-brand hover:underline">
        {more ? "Hide details" : "Add date, vendor, note"}
      </button>

      <div className={more ? "mt-3 space-y-4" : "hidden"}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="date">Date</label>
            <input id="date" name="date" type="date" defaultValue={today()} max={today()} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="paidTo">Paid to</label>
            <input id="paidTo" name="paidTo" className="input" placeholder="Vendor" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="description">Note</label>
          <input id="description" name="description" className="input" placeholder="What was it for?" />
        </div>
        {!billNeeded && (
          <div>
            <label className="label" htmlFor="billNoOpt">Bill number</label>
            <input id="billNoOpt" name="billNo" className="input" placeholder="Optional" />
          </div>
        )}
      </div>

      {!more && <input type="hidden" name="date" value={today()} />}

      {state.error && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      {state.ok && (
        <p role="status" className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{state.ok}</p>
      )}

      <button type="submit" disabled={pending || !catId || amt <= 0} className="btn-primary mt-5 w-full py-3 text-base">
        {pending ? "Saving…" : amt > 0 ? `Save ${inr(amt)}` : "Save expense"}
      </button>
    </form>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`rounded-full border px-3.5 py-2 text-sm transition ${
        active ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink hover:border-brand/40 hover:bg-canvas"
      }`}>
      {children}
    </button>
  );
}

function BudgetMeter({ name, budget, spent, adding }: { name: string; budget: number; spent: number; adding: number }) {
  const after = spent + adding;
  const pct = Math.min(100, (spent / budget) * 100);
  const addPct = Math.min(100 - pct, (adding / budget) * 100);
  const over = after > budget;
  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted">{name} this month</span>
        <span className={`num font-medium ${over ? "text-warn" : "text-muted"}`}>
          {inr(after)} of {inr(budget)}
        </span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-line">
        <div style={{ width: `${pct}%` }} className={over ? "bg-warn" : "bg-brand"} />
        <div style={{ width: `${addPct}%` }} className={over ? "bg-warn/50" : "bg-brand/45"} />
      </div>
    </div>
  );
}
