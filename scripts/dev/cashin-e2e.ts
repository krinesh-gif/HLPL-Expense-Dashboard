import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const BASE = "http://localhost:3111";

async function main() {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await b.newPage({ viewport: { width: 430, height: 900 } });
  const errs: string[] = [];
  p.on("pageerror", (e) => errs.push(String(e)));

  await p.goto(BASE + "/login");
  await p.fill("#email", "wh@araviorganic.com"); await p.fill("#password", "Change@123");
  await p.click("button[type=submit]"); await p.waitForURL("**/entry");
  await p.goto(BASE + "/reconcile");
  await p.waitForSelector("h2:has-text('Cash received')");

  const inDb = await prisma.cashTxn.findMany({
    where: { toCostCenter: "WH", voidedAt: null, type: { in: ["ISSUE", "RECEIPT"] } },
    select: { amount: true, status: true },
  });
  const confirmed = inDb.filter((r) => r.status === "CONFIRMED");
  const total = confirmed.reduce((a, r) => a + Number(r.amount), 0);

  const section = p.locator("section").filter({ hasText: "Cash received" }).first();
  const header = (await section.locator("p").first().innerText()).trim();
  const listed = await section.locator("li").count();

  console.log("db: total cash-in rows", inDb.length, "| confirmed", confirmed.length, "| confirmed total", total);
  console.log("page header:", header);
  console.log("rows listed:", listed, "(db has", inDb.length + ")", "match:", listed === Math.min(inDb.length, 300));

  const text = await section.innerText();
  console.log("shows a confirmed badge:", /confirmed/.test(text));
  console.log("shows waiting rows too:", /waiting/.test(text));

  await p.screenshot({ path: "docs/team-cash.png", fullPage: true });
  console.log("page errors:", errs.length ? errs.slice(0, 2) : "none");
  await b.close();
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); }).finally(() => prisma.$disconnect());
