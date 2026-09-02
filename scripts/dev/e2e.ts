import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const BASE = "http://localhost:3111";

async function main() {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // phone-sized
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push(String(e)));

  await page.goto(BASE + "/login");
  await page.fill("#email", "wh@araviorganic.com");
  await page.fill("#password", "Change@123");
  await page.click('button[type=submit]');
  await page.waitForURL("**/entry");
  console.log("login -> ", page.url());

  const before = await prisma.expense.count({ where: { costCenter: "WH" } });

  // the fast path: amount, one chip, save
  await page.fill("#amount", "347");
  const chip = page.locator('button[aria-pressed]').first();
  const chipName = await chip.textContent();
  await chip.click();
  console.log("picked category:", chipName);
  await page.click('button[type=submit]');
  await page.waitForSelector('[role=status]', { timeout: 10000 });
  console.log("confirmation:", (await page.locator("[role=status]").textContent())?.trim());

  const after = await prisma.expense.count({ where: { costCenter: "WH" } });
  const row = await prisma.expense.findFirst({
    where: { costCenter: "WH" }, orderBy: { createdAt: "desc" },
    include: { category: true, enteredBy: true },
  });
  console.log(`rows ${before} -> ${after}; saved:`,
    row && { amt: String(row.amount), cat: row.category.name, cc: row.costCenter, by: row.enteredBy.name, mode: row.paymentMode });

  // form should be cleared and ready for the next entry
  console.log("amount cleared after save:", (await page.inputValue("#amount")) === "");

  // bill enforcement: pick a head that demands a bill, and a big amount
  await page.click('text=All categories');
  await page.fill('input[aria-label="Search category"]', "Rent");
  await page.locator('button', { hasText: "Rent" }).first().click();
  await page.fill("#amount", "30000");
  const billVisible = await page.locator("#billNo").isVisible().catch(() => false);
  console.log("bill field forced for Rent @30000:", billVisible);

  await page.screenshot({ path: "docs/entry-mobile.png", fullPage: true });

  // founder dashboard render
  const p2 = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
  p2.on("pageerror", (e) => errs.push(String(e)));
  await p2.goto(BASE + "/login");
  await p2.fill("#email", "krinesh@araviorganic.com");
  await p2.fill("#password", "Change@123");
  await p2.click('button[type=submit]');
  await p2.waitForURL("**/dashboard");
  await p2.waitForTimeout(1200);
  await p2.screenshot({ path: "docs/dashboard.png", fullPage: true });
  const heads = await p2.locator("h2").allTextContents();
  console.log("dashboard sections:", heads.join(" | "));

  console.log("page errors:", errs.length ? errs : "none");
  await browser.close();
}
main().finally(() => prisma.$disconnect());
