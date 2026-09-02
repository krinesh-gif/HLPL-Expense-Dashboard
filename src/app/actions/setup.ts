"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";
import { CATEGORIES } from "../../../prisma/seed-data";

/**
 * First-run setup. Only ever available while the database has no users, so it
 * closes itself permanently the moment the founder account exists.
 */
export async function isSetupNeeded() {
  return (await prisma.user.count()) === 0;
}

const Schema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(60),
  email: z.string().trim().toLowerCase().email("That is not a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});

export type SetupState = { error?: string };

export async function runSetup(_prev: SetupState, form: FormData): Promise<SetupState> {
  if (!(await isSetupNeeded())) return { error: "Setup has already been completed." };

  const parsed = Schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  // Seed the category master alongside the account, so the app is usable immediately.
  for (const c of CATEGORIES) {
    const { aliases, ...data } = c;
    const cat = await prisma.category.upsert({
      where: { code: c.code }, update: data, create: data,
    });
    for (const alias of aliases) {
      await prisma.categoryAlias.upsert({
        where: { alias: alias.toLowerCase() },
        update: { categoryId: cat.id },
        create: { alias: alias.toLowerCase(), categoryId: cat.id },
      });
    }
  }

  const user = await prisma.user.create({
    data: {
      name: d.name,
      email: d.email,
      role: "FOUNDER",
      costCenter: null,
      passwordHash: await hashPassword(d.password),
    },
  });

  await createSession({ uid: user.id, name: user.name, role: user.role, costCenter: null });
  redirect("/import");
}
