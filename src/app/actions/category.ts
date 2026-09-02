"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/auth";

const Schema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(2).max(30).regex(/^[A-Z0-9_]+$/, "Code must be capitals, digits and underscores."),
  name: z.string().trim().min(2).max(60),
  group: z.string().trim().min(2).max(40),
  tallyLedger: z.string().trim().min(2).max(60),
  monthlyBudget: z.coerce.number().min(0).max(10_000_000),
  costCenters: z.array(z.enum(["WH", "HO", "FOUNDER"])).min(1, "Open the head to at least one team."),
  requiresBill: z.coerce.boolean(),
  billThreshold: z.coerce.number().min(0).max(10_000_000),
  active: z.coerce.boolean(),
});

export type CatState = { ok?: string; error?: string };

export async function saveCategory(_prev: CatState, form: FormData): Promise<CatState> {
  await requireFounder();
  const raw = {
    ...Object.fromEntries(form),
    costCenters: form.getAll("costCenters"),
    requiresBill: form.get("requiresBill") === "on",
    active: form.get("active") === "on",
  };
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, ...d } = parsed.data;

  try {
    if (id) await prisma.category.update({ where: { id }, data: d });
    else await prisma.category.create({ data: { ...d, sortOrder: 100 } });
  } catch {
    return { error: `A category with code “${d.code}” already exists.` };
  }

  revalidatePath("/categories");
  revalidatePath("/dashboard");
  revalidatePath("/entry");
  return { ok: `Saved “${d.name}”.` };
}

/** Set or clear a budget straight from the list, without opening the editor. */
export async function setBudget(form: FormData) {
  await requireFounder();
  const id = String(form.get("id") ?? "");
  const budget = Number(form.get("monthlyBudget"));
  if (!id || !Number.isFinite(budget) || budget < 0) return;
  await prisma.category.update({ where: { id }, data: { monthlyBudget: budget } });
  revalidatePath("/categories");
  revalidatePath("/dashboard");
}
