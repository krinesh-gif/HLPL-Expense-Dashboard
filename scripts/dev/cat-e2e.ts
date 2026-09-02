import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const BASE = "http://localhost:3111";

async function restore() {
  await prisma.category.updateMany({ where: { code: "COURIER" }, data: { name: "Courier / Porter" } });
  await prisma.category.deleteMany({ where: { code: { startsWith: "TEST_" } } });
}

async function main() {
  await restore();
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs: string[] = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  const login = async () => {
    await p.goto(BASE + "/login");
    await p.fill("#email", "krinesh@araviorganic.com"); await p.fill("#password", "Change@123");
    await p.click("button[type=submit]"); await p.waitForURL("**/dashboard");
  };
  await login();

  // ---- 1. rename (the bug) ----------------------------------------------
  await p.goto(BASE + "/categories");
  await p.locator("li", { hasText: "Courier / Porter" }).getByRole("button", { name: "Edit" }).click();
  await p.fill("#c-name", "Courier & Porter");
  await p.click('form button[type=submit]:has-text("Save")');
  await p.waitForTimeout(2000);
  const renamed = await prisma.category.findFirst({ where: { code: "COURIER" } });
  console.log("rename ->", renamed?.name);

  // ---- 2. delete an unused category -------------------------------------
  const spare = await prisma.category.create({
    data: { code: "TEST_TMP", name: "Temp Test Head", group: "Other", tallyLedger: "Suspense",
            costCenters: ["WH"], sortOrder: 200 },
  });
  await p.goto(BASE + "/categories");
  await p.locator("li", { hasText: "Temp Test Head" }).getByRole("button", { name: "Remove" }).click();
  await p.click('button:has-text("Remove"):not(:has-text("entries"))');
  await p.waitForTimeout(2000);
  console.log("unused deleted:", (await prisma.category.count({ where: { id: spare.id } })) === 0);

  // ---- 3. delete a category that is in use, moving its entries ----------
  const used = await prisma.category.create({
    data: { code: "TEST_USED", name: "Temp Used Head", group: "Other", tallyLedger: "Suspense",
            costCenters: ["WH", "HO", "FOUNDER"], sortOrder: 201 },
  });
  const victims = await prisma.expense.findMany({ where: { costCenter: "WH" }, take: 3, select: { id: true, categoryId: true } });
  await prisma.expense.updateMany({ where: { id: { in: victims.map((v) => v.id) } }, data: { categoryId: used.id } });

  await p.goto(BASE + "/categories");
  await p.locator("li", { hasText: "Temp Used Head" }).getByRole("button", { name: "Remove" }).click();
  await p.waitForSelector("#moveTo");
  // try to remove without choosing a destination -> the browser must block it
  const misc = await prisma.category.findFirstOrThrow({ where: { code: "MISC" } });
  await p.selectOption("#moveTo", misc.id);
  await p.click('button:has-text("Move 3 entries and remove")');
  await p.waitForTimeout(2500);
  console.log("in-use deleted:", (await prisma.category.count({ where: { id: used.id } })) === 0);
  console.log("entries moved to MISC:", await prisma.expense.count({ where: { id: { in: victims.map((v) => v.id) }, categoryId: misc.id } }), "of 3");

  // ---- 4. Unclassified must not be removable ----------------------------
  await p.goto(BASE + "/categories");
  await p.locator("li", { hasText: "Unclassified (re-tag)" }).getByRole("button", { name: "Remove" }).click();
  await p.waitForSelector("#moveTo");
  const un = await prisma.category.findFirstOrThrow({ where: { code: "UNCLASSIFIED" } });
  await p.selectOption("#moveTo", misc.id);
  await p.click('button:has-text("and remove")');
  await p.waitForTimeout(2000);
  console.log("Unclassified refused:", (await p.locator("form [role=alert]").innerText()).trim());
  console.log("Unclassified still exists:", (await prisma.category.count({ where: { id: un.id } })) === 1);

  // ---- 5. click-to-retag on the expenses page ---------------------------
  await p.goto(BASE + "/expenses");
  await p.waitForSelector("table");
  const before = await prisma.expense.count({ where: { category: { code: "UNCLASSIFIED" } } });
  const row = await prisma.expense.findFirstOrThrow({
    where: { category: { code: "UNCLASSIFIED" }, costCenter: "WH" },
    orderBy: [{ date: "desc" }],
  });
  const staffWelfare = await prisma.category.findFirstOrThrow({ where: { code: "STAFF_WELFARE" } });
  // find the select belonging to that row by its option set
  const rowSel = p.locator("tbody tr").filter({ hasText: row.description ?? "" }).locator("select").first();
  await rowSel.selectOption(staffWelfare.id);
  await p.waitForTimeout(2500);
  const after = await prisma.expense.findUnique({ where: { id: row.id }, include: { category: true } });
  console.log("retagged by click ->", after?.category.name);
  console.log("unclassified count:", before, "->", await prisma.expense.count({ where: { category: { code: "UNCLASSIFIED" } } }));

  await prisma.expense.update({ where: { id: row.id }, data: { categoryId: un.id } });
  for (const v of victims) await prisma.expense.update({ where: { id: v.id }, data: { categoryId: v.categoryId } });
  await restore();
  console.log("restored");
  console.log("page errors:", errs.length ? errs : "none");
  await b.close();
}
main().catch(async (e) => { console.error("FAILED:", e.message); await restore(); process.exit(1); }).finally(() => prisma.$disconnect());
