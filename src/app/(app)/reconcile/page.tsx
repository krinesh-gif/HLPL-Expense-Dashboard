import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { floatBalance } from "@/lib/queries";
import { rs } from "@/lib/money";
import { redirect } from "next/navigation";
import CountForm from "@/components/CountForm";

export default async function ReconcilePage() {
  const s = await requireUser();
  if (!s.costCenter) redirect("/cash");

  const [float, recent] = await Promise.all([
    floatBalance(s.costCenter),
    prisma.cashCount.findMany({
      where: { costCenter: s.costCenter },
      orderBy: { date: "desc" }, take: 8,
      include: { countedBy: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Cash in hand</h1>
        <p className="mt-1 text-sm text-muted">
          Count the cash you are physically holding and record it. If it does not match the
          book, say why — that gap is what the founder needs to see.
        </p>
      </div>

      <div className="card p-5">
        <p className="text-xs text-muted">Book balance</p>
        <p className={`num mt-1 text-3xl font-semibold ${float.balance < 0 ? "text-danger" : ""}`}>
          {rs(float.balance)}
        </p>
        <p className="mt-2 text-xs text-muted">
          {rs(float.received)} received · {rs(float.spent)} spent in cash
        </p>
      </div>

      <CountForm bookBalance={float.balance} />

      {recent.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Past counts</h2>
          <ul className="divide-y divide-line text-sm">
            {recent.map((c) => (
              <li key={c.id} className="py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-muted">{c.date.toISOString().slice(0, 10)}</span>
                  <span className="num">
                    counted {rs(c.countedAmount)} · book {rs(c.systemAmount)}
                  </span>
                  <span className={`num font-medium ${Number(c.variance) !== 0 ? "text-danger" : "text-brand"}`}>
                    {Number(c.variance) === 0 ? "ok" : `${Number(c.variance) > 0 ? "+" : "−"}${rs(Math.abs(Number(c.variance)))}`}
                  </span>
                </div>
                {c.note && <p className="mt-1 text-xs text-muted">{c.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
