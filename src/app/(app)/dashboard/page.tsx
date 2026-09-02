import Link from "next/link";
import { requireFounder } from "@/lib/auth";
import { floatBalance, founderCashPosition, spendByCostCenter } from "@/lib/queries";
import { alerts, categoryBreakdown, monthlyTrend, topEntries } from "@/lib/analysis";
import { fiscalYear, fyMonths, monthBounds, monthKey, rs } from "@/lib/money";
import Stat from "@/components/Stat";
import TrendChart from "@/components/TrendChart";

export default async function DashboardPage({
  searchParams,
}: { searchParams: Promise<{ m?: string }> }) {
  await requireFounder();
  const sp = await searchParams;
  const fy = fiscalYear();
  const months = fyMonths(fy.startYear);
  const m = sp.m && months.some((x) => x.key === sp.m) ? sp.m : months.at(-1)!.key;
  const { start, end } = monthBounds(m);

  const [trend, cats, top, alertList, pos, wh, ho, ccSpend, fySpend] = await Promise.all([
    monthlyTrend(fy.startYear),
    categoryBreakdown(m),
    topEntries(m),
    alerts(m),
    founderCashPosition(),
    floatBalance("WH"),
    floatBalance("HO"),
    spendByCostCenter(start, end),
    spendByCostCenter(fy.start, fy.end),
  ]);

  const monthTotal = ccSpend.WH + ccSpend.HO + ccSpend.FOUNDER;
  const fyTotal = fySpend.WH + fySpend.HO + fySpend.FOUNDER;
  const prevIdx = months.findIndex((x) => x.key === m) - 1;
  const prevTotal = prevIdx >= 0 ? trend[prevIdx]?.total ?? 0 : 0;
  const mom = prevTotal > 0 ? ((monthTotal - prevTotal) / prevTotal) * 100 : null;
  const movers = [...cats].filter((c) => c.last > 0 || c.spent > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 6);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Expense overview</h1>
          <p className="text-sm text-muted">{fy.label} · Hivefy Lifestyle Pvt Ltd</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <a href={`/api/export?m=${m}`}
             className="btn-ghost mr-2 px-3 py-1.5 text-xs"
             title="Month-end CSV with Tally ledger names and cost centres">
            Export for Tally
          </a>
          {months.map((mo) => (
            <Link key={mo.key} href={`/dashboard?m=${mo.key}`}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                mo.key === m ? "border-brand bg-brand text-white" : "border-line bg-surface text-muted hover:bg-canvas"
              }`}>
              {mo.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`Spend in ${months.find((x) => x.key === m)?.label}`} value={rs(monthTotal)}
              hint={mom === null ? undefined : `${mom >= 0 ? "▲" : "▼"} ${Math.abs(mom).toFixed(0)}% vs last month`}
              tone={mom !== null && mom > 15 ? "warn" : "default"} />
        <Stat label={`${fy.label} spend to date`} value={rs(fyTotal)}
              hint={`WH ${rs(fySpend.WH)} · HO ${rs(fySpend.HO)} · Founder ${rs(fySpend.FOUNDER)}`} />
        <Stat label="Cash with you" value={rs(pos.inHand)} tone={pos.inHand < 0 ? "danger" : "brand"}
              hint={`${rs(pos.received)} received in ${pos.fyLabel}`} />
        <Stat label="Float with teams" value={rs(wh.balance + ho.balance)}
              hint={`WH ${rs(wh.balance)} · HO ${rs(ho.balance)}`} />
      </div>

      {alertList.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold">Needs your attention</h2>
          <ul className="space-y-2">
            {alertList.map((a, i) => (
              <li key={i} className={`card flex items-start gap-3 p-4 ${
                a.kind === "danger" ? "border-danger/30 bg-danger-soft" : "border-warn/30 bg-warn-soft"
              }`}>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${a.kind === "danger" ? "text-danger" : "text-warn"}`}>{a.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{a.detail}</p>
                </div>
                {a.amount ? <span className="num text-sm font-semibold">{rs(a.amount)}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold">Monthly spend by team</h2>
        <TrendChart data={trend} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-1 text-sm font-semibold">Where the money went</h2>
          <p className="mb-4 text-xs text-muted">This month, against budget and against last month.</p>
          <ul className="space-y-3">
            {cats.filter((c) => c.spent > 0).slice(0, 12).map((c) => {
              const pct = c.budget && c.budget > 0 ? Math.min(100, (c.spent / c.budget) * 100) : 0;
              return (
                <li key={c.id}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">{c.name}</span>
                    <span className="num shrink-0 font-medium">
                      {rs(c.spent)}
                      {c.last > 0 && c.delta !== 0 ? (
                        <span className={`ml-2 text-xs font-normal ${c.delta > 0 ? "text-warn" : "text-brand"}`}>
                          {c.delta > 0 ? "▲" : "▼"} {rs(Math.abs(c.delta))}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {!!c.budget && c.budget > 0 ? (
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                      <div style={{ width: `${pct}%` }} className={c.over ? "h-full bg-danger" : "h-full bg-brand"} />
                    </div>
                  ) : null}
                  {c.over ? (
                    <p className="mt-1 text-[11px] text-danger">
                      {rs(c.overBy)} over the {rs(c.budget!)} budget
                    </p>
                  ) : null}
                </li>
              );
            })}
            {cats.filter((c) => c.spent > 0).length === 0 && (
              <li className="text-sm text-muted">Nothing recorded this month.</li>
            )}
          </ul>
        </section>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-1 text-sm font-semibold">Biggest movers</h2>
            <p className="mb-4 text-xs text-muted">Largest change against last month — this is usually where waste starts.</p>
            <ul className="divide-y divide-line text-sm">
              {movers.map((c) => (
                <li key={c.id} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="truncate">{c.name}</span>
                  <span className={`num shrink-0 font-medium ${c.delta > 0 ? "text-danger" : "text-brand"}`}>
                    {c.delta > 0 ? "+" : "−"}{rs(Math.abs(c.delta))}
                  </span>
                </li>
              ))}
              {movers.length === 0 && <li className="py-2 text-muted">No comparison available yet.</li>}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 text-sm font-semibold">Largest entries this month</h2>
            <ul className="divide-y divide-line text-sm">
              {top.map((e) => (
                <li key={e.id} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate">{e.description || e.category.name}</span>
                    <span className="block text-xs text-muted">
                      {e.category.name} · {e.costCenter} · {e.date.toISOString().slice(0, 10)}
                    </span>
                  </span>
                  <span className="num shrink-0 font-semibold">{rs(e.amount)}</span>
                </li>
              ))}
              {top.length === 0 && <li className="py-2 text-muted">Nothing recorded this month.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
