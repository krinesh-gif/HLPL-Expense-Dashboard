import "server-only";
import { prisma } from "./prisma";
import type { CostCenter } from "@prisma/client";
import { fiscalYear, monthBounds, monthKey, n } from "./money";

export const LIVE = { voidedAt: null };

/**
 * Categories a cost centre may book to, most-used first.
 *
 * Ranked on the whole cost centre's history rather than the signed-in user's own,
 * because a newly added warehouse or head-office account has no history of its
 * own — the migrated rows belong to the import's placeholder users — and would
 * otherwise get an arbitrary order until it had built one up. Recent entries
 * count for more, so the order tracks what the team is actually booking now.
 */
export async function entryCategories(userId: string, cc: CostCenter) {
  // UNCLASSIFIED only exists to hold migrated rows; nobody should book to it afresh.
  const cats = await prisma.category.findMany({
    where: { active: true, costCenters: { has: cc }, code: { not: "UNCLASSIFIED" } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const since = new Date(Date.now() - 120 * 864e5);
  const [recent, ever] = await Promise.all([
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { costCenter: cc, date: { gte: since }, ...LIVE },
      _count: { _all: true },
    }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { costCenter: cc, ...LIVE },
      _count: { _all: true },
    }),
  ]);

  const recentBy = new Map(recent.map((f) => [f.categoryId, f._count._all]));
  const everBy = new Map(ever.map((f) => [f.categoryId, f._count._all]));

  return cats
    .map((c) => {
      const uses = everBy.get(c.id) ?? 0;
      return { ...c, uses, score: (recentBy.get(c.id) ?? 0) * 3 + uses };
    })
    .sort((a, b) => b.score - a.score || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

/** Spend against each category's monthly budget, for the given month and cost centre. */
export async function budgetUsage(cc: CostCenter | null, mKey = monthKey(new Date())) {
  const { start, end } = monthBounds(mKey);
  const rows = await prisma.expense.groupBy({
    by: ["categoryId"],
    where: { date: { gte: start, lte: end }, ...(cc ? { costCenter: cc } : {}), ...LIVE },
    _sum: { amount: true },
  });
  return new Map(rows.map((r) => [r.categoryId, n(r._sum.amount)]));
}

/**
 * Cash a team is holding: everything issued or received into its float,
 * less everything it has spent in cash.
 */
export async function floatBalance(cc: CostCenter) {
  const [inAgg, outAgg] = await Promise.all([
    prisma.cashTxn.aggregate({
      where: { toCostCenter: cc, voidedAt: null, type: { in: ["ISSUE", "RECEIPT"] } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { costCenter: cc, paymentMode: "CASH", ...LIVE },
      _sum: { amount: true },
    }),
  ]);
  const received = n(inAgg._sum.amount);
  const spent = n(outAgg._sum.amount);
  return { received, spent, balance: received - spent };
}

/**
 * Cash the founder holds, measured over the current fiscal year.
 *
 * It is deliberately not an all-time figure: the migrated FY24-25 expenses have no
 * matching inflow register in the source workbook, so an all-time position would
 * understate cash by the whole of that year's unrecorded receipts.
 */
export async function founderCashPosition() {
  const fy = fiscalYear();
  const range = { gte: fy.start, lte: fy.end };
  const [receipts, issues, drawings, spends] = await Promise.all([
    prisma.cashTxn.aggregate({ where: { type: "RECEIPT", toCostCenter: null, voidedAt: null, date: range }, _sum: { amount: true } }),
    prisma.cashTxn.aggregate({ where: { type: "ISSUE", voidedAt: null, date: range }, _sum: { amount: true } }),
    prisma.cashTxn.aggregate({ where: { type: "DRAWING", voidedAt: null, date: range }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { costCenter: "FOUNDER", paymentMode: "CASH", date: range, ...LIVE }, _sum: { amount: true } }),
  ]);
  const received = n(receipts._sum.amount);
  const issued = n(issues._sum.amount);
  const drawn = n(drawings._sum.amount);
  const spent = n(spends._sum.amount);
  return { received, issued, drawn, spent, inHand: received - issued - drawn - spent, fyLabel: fy.label };
}

/** Group expense totals by cost centre for a date range. */
export async function spendByCostCenter(start: Date, end: Date) {
  const rows = await prisma.expense.groupBy({
    by: ["costCenter"],
    where: { date: { gte: start, lte: end }, ...LIVE },
    _sum: { amount: true },
  });
  const out: Record<CostCenter, number> = { WH: 0, HO: 0, FOUNDER: 0 };
  for (const r of rows) out[r.costCenter] = n(r._sum.amount);
  return out;
}

export function currentFY() {
  return fiscalYear(new Date());
}
