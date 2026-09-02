"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return "Enter your email and password.";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    return "Email or password is incorrect.";
  }
  await createSession({ uid: user.id, name: user.name, role: user.role, costCenter: user.costCenter });
  redirect(user.role === "FOUNDER" ? "/dashboard" : "/entry");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
