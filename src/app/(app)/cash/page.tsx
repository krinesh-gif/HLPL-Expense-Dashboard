import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/auth";
import { floatBalance, founderCashPosition } from "@/lib/queries";
import { rs } from "@/lib/money";
import { voidCashTxn } from "@/app/actions/cash";
import CashForm from "@/components/CashForm";
import Stat from "@/components/Stat";

export default async function CashPage() {
  await requireFounder();
  const [pos, wh, ho, txns, counts] = await Promise.all([
    founderCashPosition(),
    floatBalance("WH"),
    floatBalance("HO"),
    prisma.cashTxn.findMany({
      where: { voidedAt: null },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 40,
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.cashCount.findMany({ orderBy: { date: "desc" }, take: 6, include: { countedBy: { select: { name: true } } } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Cash & float</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`Cash received (${pos.fyLabel})`} value={rs(pos.received)} />
        <Stat label="With you" value={rs(pos.inHand)} tone={pos.inHand < 0 ? "danger" : "default"}
              hint={`${pos.fyLabel}: received less issued, drawn and spent`} />
        <Stat label="Warehouse float" value={rs(wh.balance)} tone={wh.balance < 0 ? "danger" : "default"}
              hint={`${rs(wh.received)} in · ${rs(wh.spent)} spent`} />
        <Stat label="Head office float" value={rs(ho.balance)} tone={ho.balance < 0 ? "danger" : "default"}
              hint={`${rs(ho.received)} in · ${rs(ho.spent)} spent`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <CashForm />

        <div className="space-y-6">
          {counts.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 text-sm font-semibold">Latest cash counts</h2>
              <ul className="divide-y divide-line text-sm">
                {counts.map((c) => (
                  <li key={c.id} className="flex items-baseline justify-between gap-3 py-2">
                    <span className="text-muted">
                      {c.date.toISOString().slice(0, 10)} · {c.costCenter} · {c.countedBy.name}
                    </span>
                    <span className={`num font-medium ${Number(c.variance) !== 0 ? "text-danger" : "text-brand"}`}>
                      {Number(c.variance) === 0 ? "matched" : `${Number(c.variance) > 0 ? "+" : "−"}${rs(Math.abs(Number(c.variance)))}`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card">
            <h2 className="border-b border-line p-5 pb-3 text-sm font-semibold">Recent cash movements</h2>
            <ul className="divide-y divide-line">
              {txns.map((t) => (
                <li key={t.id} className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline gap-2">
                      <span className="font-medium">
                        {t.type === "RECEIPT" ? "Received" : t.type === "ISSUE" ? `Issued → ${t.toCostCenter}` : "Drawing"}
                      </span>
                      <span className="text-xs text-muted">{t.source}</span>
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted">{t.note || "—"}</p>
                    <p className="mt-1 text-xs text-muted">{t.date.toISOString().slice(0, 10)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`num font-semibold ${t.type === "RECEIPT" ? "text-brand" : "text-ink"}`}>
                      {t.type === "RECEIPT" ? "+" : "−"}{rs(t.amount)}
                    </p>
                    <form action={voidCashTxn} className="mt-1">
                      <input type="hidden" name="id" value={t.id} />
                      <button className="text-[11px] text-muted underline hover:text-danger">Void</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
