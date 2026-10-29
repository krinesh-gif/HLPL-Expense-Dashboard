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
      // A hand-over waits for the receiving team to agree it arrived. Everything
      // else is between the founder and their own chest, so it settles at once.
      status: d.type === "ISSUE" ? "PENDING" : "CONFIRMED",
      initiatedBy: d.type === "ISSUE" ? "FOUNDER" : null,
    },
  });

  revalidatePath("/cash");
  revalidatePath("/dashboard");
  if (d.type === "ISSUE") {
    return { ok: `₹${d.amount.toLocaleString("en-IN")} sent to ${d.toCostCenter}. It counts once they confirm it arrived.` };
  }
  const what = d.type === "DRAWING" ? "drawing recorded" : "received";
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

// ---- two-sided cash hand-overs ---------------------------------------------

const ReceivedSchema = z.object({
  date: z.string().min(10),
  amount: z.coerce.number().positive("Enter an amount above zero.").max(50_000_000),
  from: z.enum(["FOUNDER", "OTHER"]),
  source: z.string().trim().max(120).optional(),
  note: z.string().trim().max(300).optional(),
});

/**
 * A team records cash it has taken in.
 *
 * Money said to come from the founder is a claim on the founder's chest, so it waits
 * for the founder to agree. Money the team raised itself — scrap, a supplier refund
 * collected at the gate — involves nobody else and settles immediately.
 */
export async function recordCashReceived(_prev: CashState, form: FormData): Promise<CashState> {
  const s = await requireUser();
  if (!s.costCenter) return { error: "Only the warehouse and head-office teams record cash received." };

  const parsed = ReceivedSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  if (d.from === "OTHER" && !d.source) {
    return { error: "Say where the cash came from." };
  }

  const fromFounder = d.from === "FOUNDER";
  await prisma.cashTxn.create({
    data: {
      date: new Date(d.date + "T00:00:00Z"),
      type: fromFounder ? "ISSUE" : "RECEIPT",
      amount: d.amount,
      source: fromFounder ? "Founder" : (d.source ?? "Other"),
      toCostCenter: s.costCenter,
      note: d.note || null,
      createdById: s.uid,
      status: fromFounder ? "PENDING" : "CONFIRMED",
      initiatedBy: fromFounder ? s.role : null,
    },
  });

  revalidatePath("/reconcile");
  revalidatePath("/cash");
  revalidatePath("/dashboard");
  revalidatePath("/entry");
  return {
    ok: fromFounder
      ? `₹${d.amount.toLocaleString("en-IN")} recorded. It counts once Krinesh confirms he sent it.`
      : `₹${d.amount.toLocaleString("en-IN")} added to your cash in hand.`,
  };
}

/**
 * Agree to the other side's claim. Each side can only confirm what the other
 * recorded — confirming your own entry would make the second signature worthless.
 */
export async function confirmTransfer(form: FormData): Promise<CashState> {
  const s = await requireUser();
  const id = String(form.get("id") ?? "");

  const txn = await prisma.cashTxn.findFirst({
    where: { id, type: "ISSUE", status: "PENDING", voidedAt: null },
  });
  if (!txn) return { error: "That transfer is no longer waiting." };

  const mine = s.role === "FOUNDER" ? txn.toCostCenter === null || txn.initiatedBy !== "FOUNDER"
                                    : txn.toCostCenter === s.costCenter && txn.initiatedBy === "FOUNDER";
  if (!mine) return { error: "That one is waiting on the other side, not you." };

  await prisma.cashTxn.update({
    where: { id },
    data: { status: "CONFIRMED", confirmedById: s.uid, confirmedAt: new Date() },
  });

  revalidatePath("/reconcile");
  revalidatePath("/cash");
  revalidatePath("/dashboard");
  revalidatePath("/entry");
  return { ok: `Confirmed ₹${Number(txn.amount).toLocaleString("en-IN")}.` };
}

export async function rejectTransfer(form: FormData): Promise<CashState> {
  const s = await requireUser();
  const id = String(form.get("id") ?? "");
  const reason = String(form.get("reason") ?? "").trim();
  if (!reason) return { error: "Say why it is wrong, so the other side can fix it." };

  const txn = await prisma.cashTxn.findFirst({
    where: { id, type: "ISSUE", status: "PENDING", voidedAt: null },
  });
  if (!txn) return { error: "That transfer is no longer waiting." };

  const mine = s.role === "FOUNDER" ? txn.initiatedBy !== "FOUNDER"
                                    : txn.toCostCenter === s.costCenter && txn.initiatedBy === "FOUNDER";
  if (!mine) return { error: "That one is waiting on the other side, not you." };

  await prisma.cashTxn.update({
    where: { id },
    data: { status: "REJECTED", rejectedReason: reason, confirmedById: s.uid, confirmedAt: new Date() },
  });

  revalidatePath("/reconcile");
  revalidatePath("/cash");
  revalidatePath("/dashboard");
  return { ok: "Marked as wrong. The other side will see your note." };
}
