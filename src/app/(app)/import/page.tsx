import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/auth";
import { rs } from "@/lib/money";
import ImportForm from "@/components/ImportForm";

export default async function ImportPage() {
  await requireFounder();
  const [migrated, cash, agg] = await Promise.all([
    prisma.expense.count({ where: { legacyRef: { not: null } } }),
    prisma.cashTxn.count({ where: { legacyRef: { not: null } } }),
    prisma.expense.aggregate({ where: { legacyRef: null, voidedAt: null }, _count: { _all: true }, _sum: { amount: true } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Import the old workbooks</h1>
        <p className="mt-1 text-sm text-muted">
          Loads your FY24-25 and FY26-27 sheets into the dashboard. Safe to run again —
          it replaces everything it imported last time and reloads from the files you
          upload now.
        </p>
      </div>

      <div className="card p-5">
        <p className="text-sm">
          Currently holding <span className="num font-semibold">{migrated}</span> imported
          expenses and <span className="num font-semibold">{cash}</span> imported cash
          movements.
        </p>
        <p className="mt-2 rounded-lg bg-brand-soft px-3 py-2 text-xs text-brand">
          <span className="num font-semibold">{agg._count._all}</span> entries worth{" "}
          <span className="num font-semibold">{rs(agg._sum.amount)}</span> were typed into
          the app itself. Those are never touched by an import.
        </p>
      </div>

      <ImportForm />
    </div>
  );
}
