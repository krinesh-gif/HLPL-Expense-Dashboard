import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { CostCenter, Role } from "@prisma/client";

const COOKIE = "hlpl_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 24) throw new Error("AUTH_SECRET is missing or too short");
  return new TextEncoder().encode(s);
}

export type Session = {
  uid: string;
  name: string;
  role: Role;
  costCenter: CostCenter | null;
};

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function createSession(s: Session) {
  const token = await new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      uid: String(payload.uid),
      name: String(payload.name),
      role: payload.role as Role,
      costCenter: (payload.costCenter ?? null) as CostCenter | null,
    };
  } catch {
    return null;
  }
}

/** Session guaranteed to exist, and still active in the database. */
export async function requireUser(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  const u = await prisma.user.findUnique({ where: { id: s.uid }, select: { active: true } });
  if (!u?.active) {
    await destroySession();
    redirect("/login");
  }
  return s;
}

export async function requireFounder(): Promise<Session> {
  const s = await requireUser();
  if (s.role !== "FOUNDER") redirect("/entry");
  return s;
}

/**
 * The single source of truth for who can see what.
 * A team user is hard-scoped to their own cost centre; the founder sees everything.
 * Every query that touches Expense must spread this into its `where`.
 */
export function expenseScope(s: Session) {
  if (s.role === "FOUNDER") return {};
  if (!s.costCenter) return { id: "__none__" };
  return { costCenter: s.costCenter };
}

/** The cost centre a user's new entries are booked to. Not user-selectable for teams. */
export function entryCostCenter(s: Session): CostCenter {
  return s.role === "FOUNDER" ? "FOUNDER" : (s.costCenter as CostCenter);
}
