"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { isColorKey } from "@/lib/palette";
import { CheckIcon, ChevronIcon, CloseIcon, FilterIcon } from "./Icons";

type Cat = { id: string; name: string; group: string; icon: string; color: string };
const CC = [
  { v: "ALL", label: "All teams" },
  { v: "WH", label: "Warehouse" },
  { v: "HO", label: "Head Office" },
  { v: "FOUNDER", label: "Founder" },
];

export default function ExpenseFilters({
  months, month, costCenter, categories, selected,
}: {
  months: { key: string; label: string }[];
  month: string | null;
  costCenter: string | null;
  categories: Cat[];
  selected: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const push = (patch: Record<string, string | null>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") q.delete(k); else q.set(k, v);
    }
    router.push(`/expenses${q.size ? `?${q}` : ""}`, { scroll: false });
  };

  const toggleCat = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    push({ cat: next.join(",") });
  };

  return (
    <div className="space-y-2.5">
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        <Pill active={!month} onClick={() => push({ m: null })}>All months</Pill>
        {months.map((mo) => (
          <Pill key={mo.key} active={mo.key === month} onClick={() => push({ m: mo.key })}>
            {mo.label}
          </Pill>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {costCenter !== null && CC.map((c) => (
          <Pill key={c.v} active={costCenter === c.v} subtle
                onClick={() => push({ cc: c.v === "ALL" ? null : c.v })}>
            {c.label}
          </Pill>
        ))}
        <CategoryFilter categories={categories} selected={selected} onToggle={toggleCat}
                        onClear={() => push({ cat: null })} />
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {selected.map((id) => {
            const c = categories.find((x) => x.id === id);
            if (!c) return null;
            const cls = isColorKey(c.color) ? `cat-${c.color}` : "cat-slate";
            return (
              <button key={id} onClick={() => toggleCat(id)}
                className={`chip border-transparent hover:brightness-95 ${cls}`}
                style={{ background: "var(--chip-soft)", color: "var(--chip-ink)" }}>
                <span aria-hidden>{c.icon}</span>
                {c.name}
                <CloseIcon className="size-3 opacity-70" />
              </button>
            );
          })}
          <button onClick={() => push({ cat: null })}
                  className="text-xs text-muted underline underline-offset-2 hover:text-ink">
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

function Pill({
  active, subtle, onClick, children,
}: { active: boolean; subtle?: boolean; onClick: () => void; children: React.ReactNode }) {
  const on = subtle ? "border-brand/30 bg-brand-soft text-brand" : "border-brand bg-brand text-white";
  return (
    <button onClick={onClick} aria-pressed={active}
      className={`chip ${active ? on : "border-line bg-surface text-body hover:border-line-strong hover:bg-canvas"}`}>
      {children}
    </button>
  );
}

function CategoryFilter({
  categories, selected, onToggle, onClear,
}: { categories: Cat[]; selected: string[]; onToggle: (id: string) => void; onClear: () => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const groups = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = t ? categories.filter((c) => (c.name + c.group).toLowerCase().includes(t)) : categories;
    return [...new Map(list.map((c) => [c.group, list.filter((x) => x.group === c.group)]))];
  }, [categories, q]);

  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Filter categories"
        className={`chip ${selected.length
          ? "border-brand/30 bg-brand-soft text-brand"
          : "border-line bg-surface text-body hover:border-line-strong hover:bg-canvas"}`}>
        <FilterIcon className="size-3.5" />
        {selected.length ? `${selected.length} categories` : "Filter categories"}
        <ChevronIcon className={`size-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-2"
             style={{ boxShadow: "var(--shadow-pop)" }}>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search categories…"
                 className="input mb-2 py-2 text-sm" aria-label="Search categories" />
          <div className="max-h-72 overflow-y-auto pr-0.5">
            {groups.map(([group, items]) => (
              <div key={group} className="mb-2">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">{group}</p>
                {items.map((c) => {
                  const on = selected.includes(c.id);
                  const cls = isColorKey(c.color) ? `cat-${c.color}` : "cat-slate";
                  return (
                    <button key={c.id} onClick={() => onToggle(c.id)} role="checkbox" aria-checked={on}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-canvas">
                      <span className={`grid size-4 shrink-0 place-items-center rounded border transition ${cls} ${
                        on ? "border-transparent text-white" : "border-line-strong"}`}
                        style={on ? { background: "var(--chip-solid)" } : undefined}>
                        {on && <CheckIcon className="size-3" />}
                      </span>
                      <span aria-hidden>{c.icon}</span>
                      <span className="truncate">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            ))}
            {groups.length === 0 && <p className="px-2 py-3 text-sm text-muted">Nothing matches “{q}”.</p>}
          </div>
          {selected.length > 0 && (
            <button onClick={onClear}
                    className="mt-1 w-full rounded-lg py-2 text-xs text-muted hover:bg-canvas hover:text-ink">
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
