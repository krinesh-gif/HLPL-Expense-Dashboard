import { prisma } from "@/lib/prisma";
import { requireUser, expenseScope } from "@/lib/auth";
import { LIVE } from "@/lib/queries";
import { rs, monthBounds, fyMonths, fiscalYear } from "@/lib/money";
import ExpenseTable from "@/components/ExpenseTable";
import ExpenseFilters from "@/components/ExpenseFilters";

const CC_LABEL = { WH: "Warehouse", HO: "Head Office", FOUNDER: "Founder" } as const;

export default async function ExpensesPage({
  searchParams,
}: { searchParams: Promise<{ m?: string; cc?: string; cat?: string }> }) {
  const s = await requireUser();
  const sp = await searchParams;
  const founder = s.role === "FOUNDER";

  // Everything is shown unless a month is explicitly chosen.
  const m = sp.m && sp.m !== "ALL" ? sp.m : null;
  const dateFilter = m ? { date: { gte: monthBounds(m).start, lte: monthBounds(m).end } } : {};
  const ccFilter = founder && sp.cc && sp.cc !== "ALL" ? { costCenter: sp.cc as "WH" } : {};

  // ?cat=id,id,id - empty means every category
  const picked = (sp.cat ?? "").split(",").filter(Boolean);
  const catFilter = picked.length ? { categoryId: { in: picked } } : {};

  const [rows, cats] = await Promise.all([
    prisma.expense.findMany({
      where: { ...dateFilter, ...expenseScope(s), ...ccFilter, ...catFilter, ...LIVE },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.category.findMany({
      where: { active: true },
      select: { id: true, name: true, group: true, costCenters: true, requiresBill: true,
                billThreshold: true, icon: true, color: true },
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

      <ExpenseFilters
        months={months.map((mo) => ({ key: mo.key, label: mo.label }))}
        month={m}
        costCenter={founder ? (sp.cc ?? "ALL") : null}
        selected={picked}
        categories={cats.map((c) => ({ id: c.id, name: c.name, group: c.group, icon: c.icon, color: c.color }))}
      />

      <ExpenseTable
        showTeam={founder}
        categories={cats.map((c) => ({
          id: c.id, name: c.name, group: c.group, costCenters: c.costCenters, icon: c.icon, color: c.color,
          requiresBill: c.requiresBill, billThreshold: c.billThreshold ? Number(c.billThreshold) : 0,
        }))}
        rows={rows.map((r) => ({
          id: r.id,
          date: r.date.toISOString().slice(0, 10),
          categoryId: r.category.id,
          categoryName: r.category.name,
          categoryIcon: r.category.icon,
          categoryColor: r.category.color,
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
