"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireFounder } from "@/lib/auth";
import { runImport, type ImportResult } from "@/lib/import";

// ---- users -----------------------------------------------------------------

export type UserState = { ok?: string; error?: string };

const NewUser = z.object({
  name: z.string().trim().min(2, "Enter the person's name.").max(60),
  email: z.string().trim().toLowerCase().email("That is not a valid email address."),
  role: z.enum(["FOUNDER", "WH", "HO"]),
  password: z.string().min(8, "Use at least 8 characters."),
});

export async function addUser(_prev: UserState, form: FormData): Promise<UserState> {
  await requireFounder();
  const parsed = NewUser.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email: d.email } });
  if (exists) return { error: `${d.email} already has an account.` };

  await prisma.user.create({
    data: {
      name: d.name,
      email: d.email,
      role: d.role,
      costCenter: d.role === "FOUNDER" ? null : d.role,
      passwordHash: await hashPassword(d.password),
    },
  });
  revalidatePath("/users");
  return { ok: `${d.name} can now sign in as ${d.role === "WH" ? "warehouse" : d.role === "HO" ? "head office" : "founder"}.` };
}

export async function resetPassword(_prev: UserState, form: FormData): Promise<UserState> {
  const me = await requireFounder();
  const id = String(form.get("id") ?? "");
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters." };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "That user no longer exists." };
  if (user.email.endsWith("@invalid.local")) {
    return { error: "That is a placeholder holding imported entries, not a real account." };
  }

  await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } });
  revalidatePath("/users");
  return {
    ok: id === me.uid
      ? "Your password is changed. It applies the next time you sign in."
      : `Password changed for ${user.name}. Send it to them directly.`,
  };
}

export async function toggleActive(form: FormData) {
  const me = await requireFounder();
  const id = String(form.get("id") ?? "");
  if (id === me.uid) return; // never lock yourself out
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.email.endsWith("@invalid.local")) return;
  await prisma.user.update({ where: { id }, data: { active: !user.active } });
  revalidatePath("/users");
}

// ---- legacy import ---------------------------------------------------------

export type ImportState = { error?: string; result?: ImportResult };

const MAX_BYTES = 12 * 1024 * 1024;

export async function importWorkbooks(_prev: ImportState, form: FormData): Promise<ImportState> {
  const me = await requireFounder();

  const read = async (field: string, label: string) => {
    const f = form.get(field);
    if (!(f instanceof File) || f.size === 0) throw new Error(`Choose the ${label} workbook.`);
    if (f.size > MAX_BYTES) throw new Error(`The ${label} file is larger than 12 MB.`);
    if (!f.name.toLowerCase().endsWith(".xlsx")) throw new Error(`${f.name} is not an .xlsx file.`);
    return Buffer.from(await f.arrayBuffer());
  };

  try {
    const [founder, wh, ho] = await Promise.all([
      read("founder", "founder"),
      read("wh", "warehouse"),
      read("ho", "head office"),
    ]);
    const result = await runImport({ founder, wh, ho }, me.uid);
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/cash");
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "The import failed." };
  }
}
