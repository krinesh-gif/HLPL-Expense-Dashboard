import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const BASE = "http://localhost:3111";

async function main() {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs: string[] = [];
  p.on("pageerror", (e) => errs.push(String(e)));

  await p.goto(BASE + "/login");
  await p.fill("#email", "krinesh@araviorganic.com"); await p.fill("#password", "Change@123");
  await p.click("button[type=submit]"); await p.waitForURL("**/dashboard");
  await p.waitForTimeout(1200);
  await p.screenshot({ path: "docs/dashboard.png", fullPage: true });

  // ---- multi-select category filter --------------------------------------
  await p.goto(BASE + "/expenses"); await p.waitForSelector("table");
  const all = await p.locator("tbody tr").count();
  await p.click('button[aria-label="Filter categories"]');
  await p.fill('input[aria-label="Search categories"]', "Courier");
  await p.locator('[role=checkbox]').first().click();
  await p.waitForTimeout(1800);
  const courier = await prisma.category.findFirstOrThrow({ where: { code: "COURIER" } });
  const expected1 = await prisma.expense.count({ where: { categoryId: courier.id, voidedAt: null } });
  let shown = await p.locator("tbody tr").count();
  console.log(`filter 1 category: page ${shown} | db ${expected1} | match ${shown === expected1}`);

  // the panel stays open for multi-select, so just search again
  await p.fill('input[aria-label="Search categories"]', "Staff Food");
  await p.locator('[role=checkbox]').first().click();
  await p.waitForTimeout(1800);
  const welfare = await prisma.category.findFirstOrThrow({ where: { code: "STAFF_WELFARE" } });
  const expected2 = await prisma.expense.count({
    where: { categoryId: { in: [courier.id, welfare.id] }, voidedAt: null },
  });
  shown = await p.locator("tbody tr").count();
  console.log(`filter 2 categories: page ${shown} | db ${expected2} | match ${shown === expected2}`);
  console.log("url:", new URL(p.url()).search);
  await p.screenshot({ path: "docs/expenses-filter.png" });

  // clear
  await p.click("text=Clear");
  await p.waitForTimeout(1500);
  console.log(`cleared: ${await p.locator("tbody tr").count()} of ${all}`);

  // ---- filter combines with month + team ---------------------------------
  await p.goto(BASE + `/expenses?cat=${courier.id}&cc=WH`);
  await p.waitForSelector("table");
  const combo = await prisma.expense.count({ where: { categoryId: courier.id, costCenter: "WH", voidedAt: null } });
  console.log(`category + team: page ${await p.locator("tbody tr").count()} | db ${combo}`);

  // ---- pencil icon --------------------------------------------------------
  console.log("edit label buttons left:", await p.locator("tbody button:text-is('Edit')").count());
  console.log("pencil edit buttons:", await p.locator('tbody button[aria-label^="Edit"]').count());

  // ---- category master: icon + colour save --------------------------------
  await p.goto(BASE + "/categories");
  await p.locator("li", { hasText: "Miscellaneous" }).getByRole("button", { name: /^Edit/ }).click();
  await p.waitForSelector("#c-name");
  await p.locator('button[aria-label="pink"]').click();
  await p.locator('button:has-text("🎉")').first().click();
  await p.click('form button[type=submit]:has-text("Save")');
  await p.waitForTimeout(2000);
  const misc = await prisma.category.findFirstOrThrow({ where: { code: "MISC" } });
  console.log("category saved ->", { icon: misc.icon, color: misc.color, name: misc.name });
  await p.screenshot({ path: "docs/categories.png", fullPage: true });

  // ---- dark mode ----------------------------------------------------------
  await p.goto(BASE + "/dashboard");
  await p.click('button[aria-label^="Theme"]');
  await p.click('button[aria-label^="Theme"]');
  await p.waitForTimeout(900);
  console.log("data-theme:", await p.getAttribute("html", "data-theme"));
  await p.screenshot({ path: "docs/dashboard-dark.png", fullPage: true });

  await prisma.category.update({ where: { code: "MISC" }, data: { icon: "🔖", color: "slate" } });
  console.log("page errors:", errs.length ? errs : "none");
  await b.close();
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); }).finally(() => prisma.$disconnect());
