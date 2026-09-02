import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/auth";
import { LIVE } from "@/lib/queries";
import { monthBounds, monthKey } from "@/lib/money";

const CC = { WH: "Warehouse", HO: "Head Office", FOUNDER: "Founder" } as const;

const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Month-end CSV laid out for Tally import: one row per voucher, already carrying
 * the target ledger name and cost centre.
 */
export async function GET(req: Request) {
  await requireFounder();
  const m = new URL(req.url).searchParams.get("m") ?? monthKey(new Date());
  const { start, end } = monthBounds(m);

  const rows = await prisma.expense.findMany({
    where: { date: { gte: start, lte: end }, ...LIVE },
    include: { category: true, enteredBy: { select: { name: true } } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const header = [
    "Date", "Voucher Type", "Ledger (Debit)", "Amount", "Cost Centre",
    "Paid To", "Narration", "Bill No", "Payment Mode", "Entered By", "Capex",
  ];

  const body = rows.map((r) =>
    [
      r.date.toISOString().slice(0, 10),
      r.paymentMode === "CASH" ? "Payment (Cash)" : "Payment (Bank)",
      r.category.tallyLedger,
      Number(r.amount).toFixed(2),
      CC[r.costCenter],
      r.paidTo ?? "",
      r.description ?? "",
      r.billNo ?? "",
      r.paymentMode,
      r.enteredBy.name,
      r.category.isCapex ? "Yes" : "No",
    ].map(esc).join(","),
  );

  const csv = [header.join(","), ...body].join("\n");

  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hlpl-expenses-${m}.csv"`,
    },
  });
}
