"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { entryCostCenter, expenseScope, requireUser } from "@/lib/auth";
import { n } from "@/lib/money";

const Schema = z.object({
  date: z.string().min(10),
  categoryId: z.string().min(1, "Pick a category."),
  amount: z.coerce.number().positive("Enter an amount above zero.").max(10_000_000),
  paymentMode: z.enum(["CASH", "UPI", "BANK", "CARD"]),
  paidTo: z.string().trim().max(120).optional(),
  description: z.string().trim().max(300).optional(),
  billNo: z.string().trim().max(60).optional(),
});

export type EntryState = { ok?: string; error?: string };

export async function addExpense(_prev: EntryState, form: FormData): Promise<EntryState> {
  const s = await requireUser();
  const parsed = Schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const costCenter = entryCostCenter(s);
  const cat = await prisma.category.findUnique({ where: { id: d.categoryId } });
  if (!cat || !cat.active) return { error: "That category is not available." };
  if (!cat.costCenters.includes(costCenter)) {
    return { error: `“${cat.name}” is not open to your team. Pick another head.` };
  }
  if (cat.requiresBill && n(cat.billThreshold) <= d.amount && !d.billNo) {
    return { error: `“${cat.name}” needs a bill number for ₹${d.amount.toLocaleString("en-IN")}.` };
  }

  await prisma.expense.create({
    data: {
      date: new Date(d.date + "T00:00:00Z"),
      costCenter,
      categoryId: d.categoryId,
      amount: d.amount,
      paymentMode: d.paymentMode,
      paidTo: d.paidTo || null,
      description: d.description || null,
      billNo: d.billNo || null,
      enteredById: s.uid,
    },
  });

  revalidatePath("/entry");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { ok: `Recorded ₹${d.amount.toLocaleString("en-IN")} — ${cat.name}.` };
}

/**
 * Entries are never deleted. Voiding keeps the audit trail intact and removes the
 * row from every total. A team member may only void their own cost centre's rows.
 */
export async function voidExpense(form: FormData) {
  const s = await requireUser();
  const id = String(form.get("id") ?? "");
  const reason = String(form.get("reason") ?? "").trim() || "Entered in error";

  const existing = await prisma.expense.findFirst({ where: { id, ...expenseScope(s) } });
  if (!existing) return;

  await prisma.expense.update({
    where: { id },
    data: { voidedAt: new Date(), voidReason: reason },
  });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

/** Founder-only: move a badly-tagged row (mostly migrated ones) to the right head. */
export async function retagExpense(form: FormData) {
  const s = await requireUser();
  if (s.role !== "FOUNDER") return;
  const id = String(form.get("id") ?? "");
  const categoryId = String(form.get("categoryId") ?? "");
  if (!id || !categoryId) return;
  await prisma.expense.update({ where: { id }, data: { categoryId } });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}
