"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { entryCostCenter, expenseScope, requireUser } from "@/lib/auth";
import { n } from "@/lib/money";

const Schema = z.object({
  clientId: z.string().trim().max(64).optional(),
  date: z.string().min(10),
  categoryId: z.string().min(1, "Pick a category."),
  amount: z.coerce.number().positive("Enter an amount above zero.").max(10_000_000),
  paymentMode: z.enum(["CASH", "ONLINE"]),
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

  // An entry queued offline may be retried; clientId makes the write idempotent so
  // a half-completed request cannot record the same spend twice.
  if (d.clientId) {
    const already = await prisma.expense.findUnique({ where: { clientId: d.clientId } });
    if (already) {
      return { ok: `Already recorded ₹${d.amount.toLocaleString("en-IN")} — ${cat.name}.` };
    }
  }

  try {
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
        clientId: d.clientId || null,
        enteredById: s.uid,
      },
    });
  } catch (e) {
    // Two devices syncing the same queued entry at once both pass the check above;
    // the unique index settles it and the loser is already recorded.
    if (typeof e === "object" && e && "code" in e && e.code === "P2002") {
      return { ok: `Already recorded ₹${d.amount.toLocaleString("en-IN")} — ${cat.name}.` };
    }
    throw e;
  }

  revalidatePath("/entry");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { ok: `Recorded ₹${d.amount.toLocaleString("en-IN")} — ${cat.name}.` };
}

/**
 * Edit an existing entry. A team member may only touch their own cost centre's rows;
 * the founder may edit anything. The category is re-checked against the row's cost
 * centre so an edit cannot move a spend onto a head that team is not allowed to use.
 */
export async function updateExpense(_prev: EntryState, form: FormData): Promise<EntryState> {
  const s = await requireUser();
  const id = String(form.get("id") ?? "");

  const existing = await prisma.expense.findFirst({ where: { id, ...expenseScope(s) } });
  if (!existing) return { error: "That entry is not yours to edit." };

  const parsed = Schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const cat = await prisma.category.findUnique({ where: { id: d.categoryId } });
  if (!cat) return { error: "That category is not available." };
  if (!cat.costCenters.includes(existing.costCenter)) {
    return { error: `“${cat.name}” is not open to ${existing.costCenter}. Pick another head.` };
  }
  if (cat.requiresBill && n(cat.billThreshold) <= d.amount && !d.billNo) {
    return { error: `“${cat.name}” needs a bill number for ₹${d.amount.toLocaleString("en-IN")}.` };
  }

  await prisma.expense.update({
    where: { id },
    data: {
      date: new Date(d.date + "T00:00:00Z"),
      categoryId: d.categoryId,
      amount: d.amount,
      paymentMode: d.paymentMode,
      paidTo: d.paidTo || null,
      description: d.description || null,
      billNo: d.billNo || null,
    },
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { ok: "Saved." };
}

/**
 * Removing an entry marks it void rather than deleting the row, so the audit trail
 * survives. Voided rows are excluded from every total and from the list.
 */
export async function deleteExpense(_prev: EntryState, form: FormData): Promise<EntryState> {
  const s = await requireUser();
  const id = String(form.get("id") ?? "");

  const existing = await prisma.expense.findFirst({ where: { id, ...expenseScope(s) } });
  if (!existing) return { error: "That entry is not yours to remove." };

  await prisma.expense.update({
    where: { id },
    data: { voidedAt: new Date(), voidReason: String(form.get("reason") ?? "").trim() || "Removed by user" },
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { ok: "Entry removed." };
}

/**
 * Re-tag a single entry straight from the expenses table. Kept separate from the
 * full edit so clearing a backlog of mis-tagged rows is one click each.
 */
export async function setExpenseCategory(id: string, categoryId: string): Promise<EntryState> {
  const s = await requireUser();

  const existing = await prisma.expense.findFirst({ where: { id, ...expenseScope(s) } });
  if (!existing) return { error: "That entry is not yours to change." };

  const cat = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!cat || !cat.active) return { error: "That category is not available." };
  if (!cat.costCenters.includes(existing.costCenter)) {
    return { error: `“${cat.name}” is not open to ${existing.costCenter}.` };
  }

  await prisma.expense.update({ where: { id }, data: { categoryId } });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { ok: cat.name };
}
