"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireFounder } from "@/lib/auth";
import { floatBalance } from "@/lib/queries";

const CashSchema = z.object({
  date: z.string().min(10),
  type: z.enum(["RECEIPT", "ISSUE", "DRAWING"]),
  amount: z.coerce.number().positive("Enter an amount above zero.").max(50_000_000),
  source: z.string().trim().max(120).optional(),
  toCostCenter: z.enum(["WH", "HO"]).optional().or(z.literal("")),
  note: z.string().trim().max(300).optional(),
});

export type CashState = { ok?: string; error?: string };

export async function addCashTxn(_prev: CashState, form: FormData): Promise<CashState> {
  const s = await requireFounder();
  const parsed = CashSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  if (d.type === "ISSUE" && !d.toCostCenter) return { error: "Choose which team the cash goes to." };
  if (d.type !== "ISSUE" && !d.source) return { error: "Enter where the cash came from or who drew it." };

  await prisma.cashTxn.create({
    data: {
      date: new Date(d.date + "T00:00:00Z"),
      type: d.type,
      amount: d.amount,
      source: d.source || null,
      toCostCenter: d.type === "ISSUE" ? (d.toCostCenter as "WH" | "HO") : null,
      note: d.note || null,
      createdById: s.uid,
    },
  });

  revalidatePath("/cash");
  revalidatePath("/dashboard");
  const what = d.type === "ISSUE" ? `issued to ${d.toCostCenter}` : d.type === "DRAWING" ? "drawing recorded" : "received";
  return { ok: `₹${d.amount.toLocaleString("en-IN")} ${what}.` };
}

export async function voidCashTxn(form: FormData) {
  await requireFounder();
  const id = String(form.get("id") ?? "");
  if (!id) return;
  await prisma.cashTxn.update({ where: { id }, data: { voidedAt: new Date() } });
  revalidatePath("/cash");
  revalidatePath("/dashboard");
}

/**
 * A team declares the cash it is physically holding. The gap against the system
 * balance is the number that matters — it is what an unreconciled float hides.
 */
export async function declareCashCount(_prev: CashState, form: FormData): Promise<CashState> {
  const s = await requireUser();
  if (!s.costCenter) return { error: "Only warehouse and head-office users declare a cash count." };

  const counted = Number(form.get("countedAmount"));
  if (!Number.isFinite(counted) || counted < 0) return { error: "Enter the cash you are holding." };
  const note = String(form.get("note") ?? "").trim();

  const { balance } = await floatBalance(s.costCenter);
  const variance = counted - balance;

  if (Math.abs(variance) > 0 && !note) {
    return { error: `Your count differs from the book by ₹${Math.abs(variance).toLocaleString("en-IN")}. Add a note explaining the gap.` };
  }

  await prisma.cashCount.create({
    data: {
      date: new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z"),
      costCenter: s.costCenter,
      countedAmount: counted,
      systemAmount: balance,
      variance,
      note: note || null,
      countedById: s.uid,
    },
  });

  revalidatePath("/reconcile");
  revalidatePath("/dashboard");
  return {
    ok: variance === 0
      ? "Counted cash matches the book exactly."
      : `Recorded. Variance of ₹${Math.abs(variance).toLocaleString("en-IN")} ${variance > 0 ? "more" : "less"} than the book.`,
  };
}
