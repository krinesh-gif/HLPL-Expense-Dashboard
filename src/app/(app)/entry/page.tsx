import { requireUser, entryCostCenter } from "@/lib/auth";
import { budgetUsage, entryCategories, floatBalance } from "@/lib/queries";
import { rs } from "@/lib/money";
import EntryForm from "@/components/EntryForm";

export default async function EntryPage() {
  const s = await requireUser();
  const cc = entryCostCenter(s);

  const [cats, usage, float] = await Promise.all([
    entryCategories(s.uid, cc),
    budgetUsage(cc),
    cc === "FOUNDER" ? null : floatBalance(cc),
  ]);

  const options = cats.map((c) => ({
    id: c.id,
    name: c.name,
    group: c.group,
    uses: c.uses,
    budget: c.monthlyBudget ? Number(c.monthlyBudget) : null,
    spent: usage.get(c.id) ?? 0,
    requiresBill: c.requiresBill,
    billThreshold: c.billThreshold ? Number(c.billThreshold) : null,
  }));

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold">Add expense</h1>
        {float && (
          <p className="text-sm text-muted">
            Cash in hand{" "}
            <span className={`num font-semibold ${float.balance < 0 ? "text-danger" : "text-ink"}`}>
              {rs(float.balance)}
            </span>
          </p>
        )}
      </div>
      <EntryForm categories={options} />
    </div>
  );
}
