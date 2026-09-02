"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { updateExpense, deleteExpense, setExpenseCategory, type EntryState } from "@/app/actions/expense";
import { isColorKey } from "@/lib/palette";
import { PencilIcon, CloseIcon, TrashIcon } from "./Icons";

export type Row = {
  id: string; date: string; categoryId: string; categoryName: string;
  categoryIcon: string; categoryColor: string;
  description: string; amount: number; paidTo: string;
  paymentMode: string; billNo: string; costCenter: string;
};

export type Cat = {
  id: string; name: string; group: string; costCenters: string[];
  requiresBill: boolean; billThreshold: number; icon: string; color: string;
};

const CC_LABEL: Record<string, string> = { WH: "Warehouse", HO: "Head Office", FOUNDER: "Founder" };
const MODES = ["CASH", "UPI", "BANK", "CARD"] as const;
const MODE_LABEL: Record<string, string> = { CASH: "Cash", UPI: "UPI", BANK: "Bank", CARD: "Card" };

const inr = (v: number) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(v));
const day = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC",
  });

export default function ExpenseTable({
  rows, categories, showTeam,
}: { rows: Row[]; categories: Cat[]; showTeam: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);

  if (rows.length === 0) {
    return <p className="card p-8 text-center text-sm text-muted">No expenses recorded.</p>;
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm md:min-w-[760px]">
          <thead>
            <tr className="border-b border-line bg-raised text-left text-[11px] uppercase tracking-wider text-muted">
              <Th className="w-20 md:w-24">Date</Th>
              <Th className="md:w-48">Category</Th>
              <Th className="hidden md:table-cell">Description</Th>
              <Th className="hidden w-36 lg:table-cell">Paid to</Th>
              <Th className="hidden w-20 xl:table-cell">Mode</Th>
              {showTeam && <Th className="hidden w-28 xl:table-cell">Team</Th>}
              <Th className="w-24 text-right md:w-28">Amount</Th>
              <Th className="w-12 md:w-16" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <ExpenseRow
                key={r.id} row={r} categories={categories} showTeam={showTeam}
                open={editing === r.id}
                onOpen={() => setEditing(editing === r.id ? null : r.id)}
                onClose={() => setEditing(null)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return <th className={`px-3 py-3 font-semibold ${className}`}>{children}</th>;
}

function CategoryPicker({ row, categories }: { row: Row; categories: Cat[] }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState(row.categoryId);
  const [error, setError] = useState<string | null>(null);

  // keep in step when the server sends fresh rows after a change elsewhere
  useEffect(() => setValue(row.categoryId), [row.categoryId]);

  const allowed = categories.filter((c) => c.costCenters.includes(row.costCenter));
  const groups = [...new Map(allowed.map((c) => [c.group, allowed.filter((x) => x.group === c.group)]))];
  const current = allowed.find((c) => c.id === value);
  const cls = isColorKey(current?.color ?? row.categoryColor)
    ? `cat-${current?.color ?? row.categoryColor}` : "cat-slate";
  const unset = (current?.name ?? row.categoryName).startsWith("Unclassified");

  return (
    <>
      {/* the chip is the visible control; the select sits on top of it, invisible,
          so the native picker opens on tap and works the same on a phone */}
      <span className={`relative inline-flex max-w-full ${pending ? "opacity-50" : ""}`}>
        <span className={`chip border-transparent ${cls}`}
              style={{ background: "var(--chip-soft)", color: "var(--chip-ink)" }}>
          <span aria-hidden className="text-[13px] leading-none">{current?.icon ?? row.categoryIcon}</span>
          <span className="truncate">{current?.name ?? row.categoryName}</span>
          {unset && <span aria-hidden className="text-[10px] opacity-70">▾</span>}
        </span>
        <select
          aria-label={`Category for ${row.description || row.categoryName}`}
          value={value}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value;
            const previous = value;
            setValue(next);
            setError(null);
            start(async () => {
              const r = await setExpenseCategory(row.id, next);
              if (r.error) { setValue(previous); setError(r.error); }
            });
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {groups.map(([group, items]) => (
            <optgroup key={group} label={group}>
              {items.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </optgroup>
          ))}
        </select>
      </span>
      {error && <span className="block text-xs text-danger">{error}</span>}
    </>
  );
}

function ExpenseRow({
  row, categories, showTeam, open, onOpen, onClose,
}: {
  row: Row; categories: Cat[]; showTeam: boolean;
  open: boolean; onOpen: () => void; onClose: () => void;
}) {
  const span = 6 + (showTeam ? 1 : 0) + 1;
  return (
    <>
      <tr className={`border-b border-line align-top transition-colors ${open ? "bg-brand-soft/50" : "hover:bg-raised"}`}>
        <td className="num px-2 py-2.5 text-muted md:whitespace-nowrap md:px-3">{day(row.date)}</td>
        <td className="px-2 py-2.5 md:px-3">
          <CategoryPicker row={row} categories={categories} />
          {/* the columns hidden on small screens, folded in so nothing is lost */}
          <span className="mt-0.5 block text-xs text-muted md:hidden">
            {[row.description, row.paidTo, showTeam ? CC_LABEL[row.costCenter] : null]
              .filter(Boolean).join(" · ") || MODE_LABEL[row.paymentMode]}
          </span>
        </td>
        <td className="hidden px-3 py-2.5 text-muted md:table-cell">{row.description || "—"}</td>
        <td className="hidden px-3 py-2.5 text-muted lg:table-cell">{row.paidTo || "—"}</td>
        <td className="hidden px-3 py-2.5 text-muted xl:table-cell">{MODE_LABEL[row.paymentMode]}</td>
        {showTeam && (
          <td className="hidden px-3 py-2.5 xl:table-cell">
            <span className="rounded bg-canvas px-1.5 py-0.5 text-[11px] text-muted">{CC_LABEL[row.costCenter]}</span>
          </td>
        )}
        <td className="num whitespace-nowrap px-2 py-2.5 text-right font-semibold md:px-3">{inr(row.amount)}</td>
        <td className="px-2 py-2.5 text-right md:px-3">
          <button onClick={onOpen} aria-expanded={open}
                  aria-label={open ? "Close editor" : `Edit ${row.categoryName} entry`}
                  title={open ? "Close" : "Edit entry"}
                  className="icon-btn">
            {open ? <CloseIcon className="size-4" /> : <PencilIcon className="size-4" />}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-line bg-brand-soft/20">
          <td colSpan={span} className="px-2 py-4 md:px-3">
            <EditForm row={row} categories={categories} onClose={onClose} />
          </td>
        </tr>
      )}
    </>
  );
}

function EditForm({ row, categories, onClose }: { row: Row; categories: Cat[]; onClose: () => void }) {
  const [state, action, pending] = useActionState<EntryState, FormData>(updateExpense, {});
  const [del, delAction, deleting] = useActionState<EntryState, FormData>(deleteExpense, {});
  const [confirming, setConfirming] = useState(false);
  const [categoryId, setCategoryId] = useState(row.categoryId);
  const [amount, setAmount] = useState(String(row.amount));

  useEffect(() => { if (state.ok) onClose(); }, [state.ok, onClose]);

  // a team can only book to heads opened to it
  const allowed = categories.filter((c) => c.costCenters.includes(row.costCenter));
  const groups = [...new Map(allowed.map((c) => [c.group, allowed.filter((x) => x.group === c.group)]))];
  const cat = allowed.find((c) => c.id === categoryId);
  const amt = parseFloat(amount) || 0;
  const billNeeded = !!cat?.requiresBill && amt >= cat.billThreshold;

  return (
    <div className="space-y-3">
      <form action={action} className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <input type="hidden" name="id" value={row.id} />

        <Field label="Date" htmlFor={`d-${row.id}`}>
          <input id={`d-${row.id}`} name="date" type="date" required defaultValue={row.date} className="input" />
        </Field>

        <Field label="Category" htmlFor={`c-${row.id}`}>
          <select id={`c-${row.id}`} name="categoryId" required value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)} className="input">
            {groups.map(([group, items]) => (
              <optgroup key={group} label={group}>
                {items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>

        <Field label="Amount" htmlFor={`a-${row.id}`}>
          <input id={`a-${row.id}`} name="amount" required inputMode="decimal" value={amount}
                 onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                 className="input num font-semibold" />
        </Field>

        <Field label="Paid to" htmlFor={`p-${row.id}`}>
          <input id={`p-${row.id}`} name="paidTo" defaultValue={row.paidTo} className="input" placeholder="Vendor" />
        </Field>

        <Field label="Mode of payment" htmlFor={`m-${row.id}`}>
          <select id={`m-${row.id}`} name="paymentMode" defaultValue={row.paymentMode} className="input">
            {MODES.map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
          </select>
        </Field>

        <Field label={`Bill number${billNeeded ? " — required" : ""}`} htmlFor={`b-${row.id}`}>
          <input id={`b-${row.id}`} name="billNo" defaultValue={row.billNo} required={billNeeded}
                 className="input" placeholder={billNeeded ? "Invoice / bill no." : "Optional"} />
        </Field>

        <Field label="Description" htmlFor={`n-${row.id}`} className="md:col-span-2 lg:col-span-3">
          <input id={`n-${row.id}`} name="description" defaultValue={row.description}
                 className="input" placeholder="What was it for?" />
        </Field>

        <div className="flex flex-wrap items-center gap-2 md:col-span-2 lg:col-span-3">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Saving…" : "Save changes"}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <span className="flex-1" />
          {!confirming && (
            <button type="button" onClick={() => setConfirming(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-danger">
              <TrashIcon className="size-3.5" /> Remove entry
            </button>
          )}
        </div>

        {state.error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger md:col-span-2 lg:col-span-3">
            {state.error}
          </p>
        )}
      </form>

      {confirming && (
        <form action={delAction} className="flex flex-wrap items-center gap-2 rounded-lg bg-danger-soft p-3">
          <input type="hidden" name="id" value={row.id} />
          <span className="text-sm text-danger">
            Remove {inr(row.amount)} — {row.categoryName}? It leaves every total but stays in the record.
          </span>
          <span className="flex-1" />
          <input name="reason" className="input max-w-56 py-1.5 text-sm" placeholder="Reason (optional)" />
          <button type="submit" disabled={deleting}
                  className="btn rounded-lg bg-danger px-3 py-1.5 text-xs text-white hover:opacity-90">
            {deleting ? "Removing…" : "Remove"}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="btn-ghost px-3 py-1.5 text-xs">
            Keep
          </button>
          {del.error && <p role="alert" className="w-full text-sm text-danger">{del.error}</p>}
        </form>
      )}
    </div>
  );
}

function Field({
  label, htmlFor, className = "", children,
}: { label: string; htmlFor: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}
