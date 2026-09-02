import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/auth";
import { budgetUsage } from "@/lib/queries";
import { rs, monthKey } from "@/lib/money";
import CategoryAdmin from "@/components/CategoryAdmin";

export default async function CategoriesPage() {
  await requireFounder();
  const [cats, usage] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
      include: { _count: { select: { expenses: true } } },
    }),
    budgetUsage(null, monthKey(new Date())),
  ]);

  const rows = cats.map((c) => ({
    id: c.id, code: c.code, name: c.name, group: c.group, tallyLedger: c.tallyLedger,
    costCenters: c.costCenters, monthlyBudget: c.monthlyBudget ? Number(c.monthlyBudget) : 0,
    requiresBill: c.requiresBill, billThreshold: c.billThreshold ? Number(c.billThreshold) : 0,
    active: c.active, entries: c._count.expenses, spent: usage.get(c.id) ?? 0,
  }));

  const budgeted = rows.filter((r) => r.active).reduce((a, r) => a + r.monthlyBudget, 0);
  const spent = rows.reduce((a, r) => a + r.spent, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Category master</h1>
          <p className="text-sm text-muted">
            Every expense maps to one head here. Budgets drive the warnings your team sees at entry.
          </p>
        </div>
        <p className="text-sm text-muted">
          Budgeted <span className="num font-semibold text-ink">{rs(budgeted)}</span> / month ·
          spent this month <span className="num font-semibold text-ink">{rs(spent)}</span>
        </p>
      </div>
      <CategoryAdmin rows={rows} />
    </div>
  );
}
