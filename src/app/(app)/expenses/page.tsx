import { prisma } from "@/lib/prisma";
import { requireUser, expenseScope } from "@/lib/auth";
import { LIVE } from "@/lib/queries";
import { rs, monthKey, monthBounds, fyMonths, fiscalYear } from "@/lib/money";
import { voidExpense } from "@/app/actions/expense";
import Link from "next/link";

const CC_LABEL = { WH: "Warehouse", HO: "Head Office", FOUNDER: "Founder" } as const;

export default async function ExpensesPage({
  searchParams,
}: { searchParams: Promise<{ m?: string; cc?: string }> }) {
  const s = await requireUser();
  const sp = await searchParams;
  const m = sp.m ?? monthKey(new Date());
  const { start, end } = monthBounds(m);
  const founder = s.role === "FOUNDER";
  const ccFilter = founder && sp.cc && sp.cc !== "ALL" ? { costCenter: sp.cc as "WH" } : {};

  const rows = await prisma.expense.findMany({
    where: { date: { gte: start, lte: end }, ...expenseScope(s), ...ccFilter, ...LIVE },
    include: { category: { select: { name: true, group: true } }, enteredBy: { select: { name: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 500,
  });

  const total = rows.reduce((a, r) => a + Number(r.amount), 0);
  const months = fyMonths(fiscalYear().startYear).reverse();

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold">{founder ? "All expenses" : "My expenses"}</h1>
        <p className="text-sm text-muted">
          {rows.length} entries · <span className="num font-semibold text-ink">{rs(total)}</span>
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {months.map((mo) => (
          <Link key={mo.key} href={`/expenses?m=${mo.key}${sp.cc ? `&cc=${sp.cc}` : ""}`}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              mo.key === m ? "border-brand bg-brand text-white" : "border-line bg-surface text-muted hover:bg-canvas"
            }`}>
            {mo.label}
          </Link>
        ))}
      </div>

      {founder && (
        <div className="mb-4 flex gap-2">
          {["ALL", "WH", "HO", "FOUNDER"].map((c) => (
            <Link key={c} href={`/expenses?m=${m}&cc=${c}`}
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                (sp.cc ?? "ALL") === c ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-muted"
              }`}>
              {c === "ALL" ? "All teams" : CC_LABEL[c as keyof typeof CC_LABEL]}
            </Link>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">No expenses recorded in this month.</p>
      ) : (
        <ul className="card divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{r.category.name}</span>
                  {founder && (
                    <span className="rounded bg-canvas px-1.5 py-0.5 text-[11px] text-muted">
                      {CC_LABEL[r.costCenter]}
                    </span>
                  )}
                  {r.paymentMode !== "CASH" && (
                    <span className="text-[11px] text-muted">{r.paymentMode}</span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-sm text-muted">
                  {[r.description, r.paidTo].filter(Boolean).join(" · ") || "—"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {r.date.toISOString().slice(0, 10)} · {r.enteredBy.name}
                  {r.billNo ? ` · Bill ${r.billNo}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="num font-semibold">{rs(r.amount)}</p>
                <form action={voidExpense} className="mt-1">
                  <input type="hidden" name="id" value={r.id} />
                  <button className="text-[11px] text-muted underline hover:text-danger">Void</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
