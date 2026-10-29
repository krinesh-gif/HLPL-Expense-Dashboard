import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { floatBalance } from "@/lib/queries";
import { rs } from "@/lib/money";
import { redirect } from "next/navigation";
import CountForm from "@/components/CountForm";
import CashReceivedForm from "@/components/CashReceivedForm";
import TransferList from "@/components/TransferList";
import CashInHistory from "@/components/CashInHistory";

export default async function CashPage() {
  const s = await requireUser();
  if (!s.costCenter) redirect("/cash");

  const [float, waiting, recent, counts] = await Promise.all([
    floatBalance(s.costCenter),
    // hand-overs the founder recorded that this team has not agreed to yet
    prisma.cashTxn.findMany({
      where: {
        toCostCenter: s.costCenter, type: "ISSUE", status: "PENDING",
        initiatedBy: "FOUNDER", voidedAt: null,
      },
      orderBy: { date: "desc" },
    }),
    // every rupee that has come in, whatever state it is in
    prisma.cashTxn.findMany({
      where: { toCostCenter: s.costCenter, voidedAt: null, type: { in: ["ISSUE", "RECEIPT"] } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 300,
    }),
    prisma.cashCount.findMany({
      where: { costCenter: s.costCenter },
      orderBy: { date: "desc" }, take: 6,
      include: { countedBy: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cash in hand</h1>
        <p className="mt-0.5 text-sm text-muted">
          Record cash you take in, confirm what Krinesh sends, and count what you are holding.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5">
      <div className="card p-5">
        <p className="text-xs uppercase tracking-wider text-muted">Your cash in hand</p>
        <p className={`num mt-1 text-3xl font-semibold ${float.balance < 0 ? "text-danger" : ""}`}>
          {rs(float.balance)}
        </p>
        <p className="mt-2 text-xs text-muted">
          {rs(float.received)} received · {rs(float.spent)} spent in cash
        </p>
        {float.pendingCount > 0 && (
          <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
            {rs(float.pendingAmount)} is still waiting to be confirmed, so it is not counted above.
          </p>
        )}
      </div>

      <TransferList
        asFounder={false}
        rows={waiting.map((t) => ({
          id: t.id, date: t.date.toISOString().slice(0, 10), amount: Number(t.amount),
          note: t.note, source: t.source, costCenter: t.toCostCenter, initiatedBy: t.initiatedBy,
        }))}
      />

      <CashReceivedForm />
      <CountForm bookBalance={float.balance} />
        </div>

        <div className="space-y-6">
      <CashInHistory
        rows={recent.map((t) => ({
          id: t.id,
          date: t.date.toISOString().slice(0, 10),
          amount: Number(t.amount),
          source: t.source,
          note: t.note,
          type: t.type,
          status: t.status,
          initiatedBy: t.initiatedBy,
          rejectedReason: t.rejectedReason,
        }))}
      />

      {counts.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Past counts</h2>
          <ul className="divide-y divide-line text-sm">
            {counts.map((c) => (
              <li key={c.id} className="py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-muted">{c.date.toISOString().slice(0, 10)}</span>
                  <span className="num">counted {rs(c.countedAmount)} · book {rs(c.systemAmount)}</span>
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
      </div>
    </div>
  );
}
