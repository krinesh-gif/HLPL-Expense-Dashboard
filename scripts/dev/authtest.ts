import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
const BASE = "http://localhost:3111";

async function cookieFor(email: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { email } });
  const t = await new SignJWT({ uid: u.id, name: u.name, role: u.role, costCenter: u.costCenter })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);
  return `hlpl_session=${t}`;
}
const get = (p: string, c: string) =>
  fetch(BASE + p, { headers: { cookie: c }, redirect: "manual" });

async function main() {
  const F = await cookieFor("krinesh@araviorganic.com");
  const W = await cookieFor("wh@araviorganic.com");
  const H = await cookieFor("ho@araviorganic.com");

  const check = async (who: string, c: string, path: string) => {
    const r = await get(path, c);
    const body = r.status === 200 ? await r.text() : "";
    return { who, path, status: r.status, loc: r.headers.get("location") ?? "", body };
  };

  console.log("=== route access ===");
  for (const [who, c] of [["founder", F], ["wh", W], ["ho", H]] as const) {
    for (const p of ["/dashboard", "/cash", "/categories", "/entry", "/expenses", "/reconcile", "/api/export", "/users", "/import", "/setup"]) {
      const r = await check(who, c, p);
      console.log(`${who.padEnd(8)} ${p.padEnd(12)} ${r.status} ${r.loc}`);
    }
  }

  console.log("\n=== data leakage: does WH see HO/founder rows? ===");
  // Pick distinctive strings that exist only in one cost centre.
  const hoRow = await prisma.expense.findFirst({ where: { costCenter: "HO", description: { not: null } }, orderBy: { amount: "desc" } });
  const fRow  = await prisma.expense.findFirst({ where: { costCenter: "FOUNDER", description: { not: null } }, orderBy: { amount: "desc" } });
  const whRow = await prisma.expense.findFirst({ where: { costCenter: "WH", description: { not: null } }, orderBy: { amount: "desc" } });
  console.log("HO marker:", hoRow?.description, "| FOUNDER marker:", fRow?.description, "| WH marker:", whRow?.description);

  const monthOf = (d?: Date) => d ? `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}` : "";
  for (const [who, c, own, foreign] of [
    ["wh", W, whRow, [hoRow, fRow]],
    ["ho", H, hoRow, [whRow, fRow]],
  ] as const) {
    const r = await get(`/expenses?m=${monthOf(own?.date)}`, c);
    const body = await r.text();
    const seesOwn = own?.description ? body.includes(own.description.slice(0, 20)) : false;
    console.log(`${who}: sees own row = ${seesOwn}`);
    for (const f of foreign) {
      if (!f?.description) continue;
      const r2 = await get(`/expenses?m=${monthOf(f.date)}`, c);
      const b2 = await r2.text();
      console.log(`  ${who} sees ${f.costCenter} row "${f.description.slice(0,26)}" = ${b2.includes(f.description.slice(0, 20))}`);
    }
    // try forcing the cost-centre filter that only the founder gets
    const r3 = await get(`/expenses?m=${monthOf(fRow?.date)}&cc=FOUNDER`, c);
    const b3 = await r3.text();
    console.log(`  ${who} forcing ?cc=FOUNDER sees founder row = ${fRow?.description ? b3.includes(fRow.description.slice(0,20)) : "n/a"}`);
  }
}
main().finally(() => prisma.$disconnect());
