import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
const BASE = "http://localhost:3111";
async function ck(email: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { email } });
  const t = await new SignJWT({ uid: u.id, name: u.name, role: u.role, costCenter: u.costCenter })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);
  return `hlpl_session=${t}`;
}
async function main() {
  const F = await ck("krinesh@araviorganic.com");
  const r = await fetch(`${BASE}/api/export?m=2026-08`, { headers: { cookie: F } });
  const csv = await r.text();
  const lines = csv.trim().split("\n");
  console.log("=== Tally export (Aug'26) ===");
  console.log("rows:", lines.length - 1);
  console.log(lines.slice(0, 4).join("\n"));
  const html = await (await fetch(`${BASE}/entry`, { headers: { cookie: await ck("wh@araviorganic.com") } })).text();
  console.log("\nUnclassified offered at entry:", html.includes("Unclassified (re-tag)"));
}
main().finally(() => prisma.$disconnect());
