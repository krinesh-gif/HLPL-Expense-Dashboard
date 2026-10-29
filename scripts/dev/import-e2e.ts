import { chromium, type Page } from "playwright";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const BASE = "http://localhost:3111";
const WB = "/tmp/claude-0/-home-user-HLPL-Expense-Dashboard/a4cd24e2-a488-5126-ad3f-8c8290a34536/scratchpad/wb";

const counts = async () => ({
  exp: await prisma.expense.count({ where: { legacyRef: { not: null } } }),
  cash: await prisma.cashTxn.count({ where: { legacyRef: { not: null } } }),
});

async function importFiles(p: Page, tag: string) {
  await p.goto(BASE + "/import");
  await p.setInputFiles("#f-founder", `${WB}/${tag}-founder.xlsx`);
  await p.setInputFiles("#f-wh", `${WB}/${tag}-wh.xlsx`);
  await p.setInputFiles("#f-ho", `${WB}/${tag}-ho.xlsx`);
  await p.click('button[type=submit]');
  await p.waitForSelector("h2:has-text('Added'), form [role=alert]", { timeout: 120000 });
  const ok = await p.locator("h2:has-text('Added')").count();
  return ok
    ? (await p.locator("section.card").last().innerText()).split("\n").slice(0, 2).join(" ")
    : "ERROR: " + (await p.locator("form [role=alert]").innerText()).trim();
}

async function main() {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await b.newPage({ viewport: { width: 900, height: 950 } });
  const errs: string[] = [];
  p.on("pageerror", (e) => errs.push(String(e)));

  await p.goto(BASE + "/login");
  await p.fill("#email", "krinesh@araviorganic.com"); await p.fill("#password", "Change@123");
  await p.click("button[type=submit]"); await p.waitForURL("**/dashboard");

  console.log("=== 1. the button tells you what is missing ===");
  await p.goto(BASE + "/import");
  await p.setInputFiles("#f-founder", `${WB}/small-founder.xlsx`);
  await p.waitForTimeout(400);
  console.log("one file chosen, button says:", (await p.locator('button[type=submit]').innerText()).trim());
  console.log("disabled:", await p.locator('button[type=submit]').isDisabled());

  console.log("\n=== 2. a 1.9 MB workbook, which used to fail silently ===");
  await prisma.expense.deleteMany({ where: { legacyRef: { not: null } } });
  await prisma.cashTxn.deleteMany({ where: { legacyRef: { not: null } } });
  const before = await counts();
  console.log("first import:", await importFiles(p, "xl"));
  const first = await counts();
  console.log(`rows ${before.exp}/${before.cash} -> ${first.exp}/${first.cash}`);

  console.log("\n=== 3. the same files again must add nothing ===");
  console.log("second import:", await importFiles(p, "xl"));
  const second = await counts();
  console.log(`rows ${first.exp}/${first.cash} -> ${second.exp}/${second.cash} (no change: ${first.exp === second.exp && first.cash === second.cash})`);

  console.log("\n=== 4. a hand re-tag survives a re-import ===");
  const misc = await prisma.category.findFirstOrThrow({ where: { code: "MISC" } });
  const victim = await prisma.expense.findFirstOrThrow({ where: { legacyRef: { not: null } }, orderBy: { date: "desc" } });
  await prisma.expense.update({ where: { id: victim.id }, data: { categoryId: misc.id } });
  console.log("third import:", await importFiles(p, "xl"));
  const after = await prisma.expense.findUniqueOrThrow({ where: { id: victim.id } });
  console.log("re-tag kept:", after.categoryId === misc.id, "| row still single:",
    await prisma.expense.count({ where: { legacyRef: victim.legacyRef } }));

  console.log("\npage errors:", errs.length ? errs.slice(0, 2) : "none");
  await b.close();
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); }).finally(() => prisma.$disconnect());
