import "server-only";
import { prisma } from "./prisma";
import { LIVE } from "./queries";
import { fyMonths, monthBounds, monthKey, n } from "./money";
import type { CostCenter } from "@prisma/client";

/** Month-by-month spend for the fiscal year, split by cost centre. */
export async function monthlyTrend(startYear: number) {
  const months = fyMonths(startYear);
  if (!months.length) return [];
  const rows = await prisma.expense.findMany({
    where: { date: { gte: months[0].start, lte: months.at(-1)!.end }, ...LIVE },
    select: { date: true, amount: true, costCenter: true },
  });

  const byMonth = new Map(months.map((m) => [m.key, { label: m.label, WH: 0, HO: 0, FOUNDER: 0, total: 0 }]));
  for (const r of rows) {
    const b = byMonth.get(monthKey(r.date));
    if (!b) continue;
    b[r.costCenter] += n(r.amount);
    b.total += n(r.amount);
  }
  return [...byMonth.values()];
}

/** Spend per category this month against last month and against budget. */
export async function categoryBreakdown(mKey: string) {
  const cur = monthBounds(mKey);
  const [y, m] = mKey.split("-").map(Number);
  const prevKey = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const prev = monthBounds(prevKey);

  const [cats, curRows, prevRows] = await Promise.all([
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.expense.groupBy({
      by: ["categoryId"], where: { date: { gte: cur.start, lte: cur.end }, ...LIVE }, _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["categoryId"], where: { date: { gte: prev.start, lte: prev.end }, ...LIVE }, _sum: { amount: true },
    }),
  ]);

  const curMap = new Map(curRows.map((r) => [r.categoryId, n(r._sum.amount)]));
  const prevMap = new Map(prevRows.map((r) => [r.categoryId, n(r._sum.amount)]));

  return cats
    .map((c) => {
      const spent = curMap.get(c.id) ?? 0;
      const last = prevMap.get(c.id) ?? 0;
      const budget = c.monthlyBudget ? n(c.monthlyBudget) : null;
      return {
        id: c.id, name: c.name, group: c.group, code: c.code,
        spent, last, delta: spent - last,
        budget, over: budget !== null && budget > 0 && spent > budget,
        overBy: budget !== null ? spent - budget : 0,
      };
    })
    .filter((c) => c.spent > 0 || c.last > 0)
    .sort((a, b) => b.spent - a.spent);
}

/** Biggest single entries in a month — where the money actually went. */
export async function topEntries(mKey: string, take = 8) {
  const { start, end } = monthBounds(mKey);
  return prisma.expense.findMany({
    where: { date: { gte: start, lte: end }, ...LIVE },
    include: { category: { select: { name: true } } },
    orderBy: { amount: "desc" },
    take,
  });
}

/** Things that need the founder's attention, most costly first. */
export async function alerts(mKey: string) {
  const { start, end } = monthBounds(mKey);
  const out: { kind: "warn" | "danger"; title: string; detail: string; amount?: number }[] = [];

  const unclassified = await prisma.expense.aggregate({
    where: { category: { code: "UNCLASSIFIED" }, ...LIVE },
    _sum: { amount: true }, _count: { _all: true },
  });
  if (unclassified._count._all > 0) {
    out.push({
      kind: "warn",
      title: `${unclassified._count._all} entries sit in “Unclassified”`,
      detail: "Mostly rows migrated from the old sheets. Re-tag them so the category totals mean something.",
      amount: n(unclassified._sum.amount),
    });
  }

  const inTransit = await prisma.cashTxn.findMany({
    where: { type: "ISSUE", voidedAt: null, note: { contains: "not yet acknowledged" } },
    select: { amount: true, toCostCenter: true, date: true },
  });
  for (const t of inTransit) {
    out.push({
      kind: "danger",
      title: `${t.toCostCenter} has not acknowledged a cash hand-over`,
      detail: `Issued ${t.date.toISOString().slice(0, 10)} and still not recorded in the team's book.`,
      amount: n(t.amount),
    });
  }

  const counts = await prisma.cashCount.findMany({
    where: { date: { gte: start, lte: end }, NOT: { variance: 0 } },
    orderBy: { date: "desc" }, take: 5,
  });
  for (const c of counts) {
    out.push({
      kind: "danger",
      title: `${c.costCenter} cash count did not match`,
      detail: `Counted ${n(c.countedAmount).toLocaleString("en-IN")} against a book balance of ${n(c.systemAmount).toLocaleString("en-IN")}.`,
      amount: Math.abs(n(c.variance)),
    });
  }

  const noBill = await prisma.expense.aggregate({
    where: { date: { gte: start, lte: end }, billNo: null, amount: { gte: 5000 }, ...LIVE },
    _sum: { amount: true }, _count: { _all: true },
  });
  if (noBill._count._all > 0) {
    out.push({
      kind: "warn",
      title: `${noBill._count._all} entries over ₹5,000 have no bill number`,
      detail: "These cannot be substantiated to Tally or to an assessing officer.",
      amount: n(noBill._sum.amount),
    });
  }

  return out.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
}
