import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, expenseScope } from "@/lib/auth";
import { LIVE } from "@/lib/queries";
import { rs, monthBounds, fyMonths, fiscalYear } from "@/lib/money";
import ExpenseTable from "@/components/ExpenseTable";

const CC_LABEL = { WH: "Warehouse", HO: "Head Office", FOUNDER: "Founder" } as const;

export default async function ExpensesPage({
  searchParams,
}: { searchParams: Promise<{ m?: string; cc?: string }> }) {
  const s = await requireUser();
  const sp = await searchParams;
  const founder = s.role === "FOUNDER";

  // Everything is shown unless a month is explicitly chosen.
  const m = sp.m && sp.m !== "ALL" ? sp.m : null;
  const dateFilter = m ? { date: { gte: monthBounds(m).start, lte: monthBounds(m).end } } : {};
  const ccFilter = founder && sp.cc && sp.cc !== "ALL" ? { costCenter: sp.cc as "WH" } : {};

  const [rows, cats] = await Promise.all([
    prisma.expense.findMany({
      where: { ...dateFilter, ...expenseScope(s), ...ccFilter, ...LIVE },
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.category.findMany({
      where: { active: true },
      select: { id: true, name: true, group: true, costCenters: true, requiresBill: true, billThreshold: true },
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
    }),
  ]);

  const total = rows.reduce((a, r) => a + Number(r.amount), 0);
  const months = fyMonths(fiscalYear().startYear).reverse();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold">{founder ? "All expenses" : "My expenses"}</h1>
        <p className="text-sm text-muted">
          {rows.length} entries · <span className="num font-semibold text-ink">{rs(total)}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip href={`/expenses${sp.cc ? `?cc=${sp.cc}` : ""}`} active={!m}>All months</Chip>
        {months.map((mo) => (
          <Chip key={mo.key} href={`/expenses?m=${mo.key}${sp.cc ? `&cc=${sp.cc}` : ""}`} active={mo.key === m}>
            {mo.label}
          </Chip>
        ))}
      </div>

      {founder && (
        <div className="flex flex-wrap gap-1.5">
          {(["ALL", "WH", "HO", "FOUNDER"] as const).map((c) => (
            <Chip key={c} href={`/expenses?cc=${c}${m ? `&m=${m}` : ""}`} active={(sp.cc ?? "ALL") === c} subtle>
              {c === "ALL" ? "All teams" : CC_LABEL[c]}
            </Chip>
          ))}
        </div>
      )}

      <ExpenseTable
        showTeam={founder}
        categories={cats.map((c) => ({
          id: c.id, name: c.name, group: c.group, costCenters: c.costCenters,
          requiresBill: c.requiresBill, billThreshold: c.billThreshold ? Number(c.billThreshold) : 0,
        }))}
        rows={rows.map((r) => ({
          id: r.id,
          date: r.date.toISOString().slice(0, 10),
          categoryId: r.category.id,
          categoryName: r.category.name,
          description: r.description ?? "",
          amount: Number(r.amount),
          paidTo: r.paidTo ?? "",
          paymentMode: r.paymentMode,
          billNo: r.billNo ?? "",
          costCenter: r.costCenter,
        }))}
      />
    </div>
  );
}

function Chip({
  href, active, subtle, children,
}: { href: string; active: boolean; subtle?: boolean; children: React.ReactNode }) {
  const on = subtle ? "border-brand bg-brand-soft text-brand" : "border-brand bg-brand text-white";
  return (
    <Link href={href}
      className={`rounded-full border px-3 py-1.5 text-xs transition ${
        active ? on : "border-line bg-surface text-muted hover:bg-canvas"
      }`}>
      {children}
    </Link>
  );
}
