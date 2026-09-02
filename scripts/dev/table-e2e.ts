import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const BASE = "http://localhost:3111";

async function main() {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs: string[] = [];
  p.on("pageerror", (e) => errs.push(String(e)));

  await p.goto(BASE + "/login");
  await p.fill("#email", "krinesh@araviorganic.com"); await p.fill("#password", "Change@123");
  await p.click("button[type=submit]"); await p.waitForURL("**/dashboard");

  await p.goto(BASE + "/expenses");
  await p.waitForSelector("table");
  console.log("headers:", (await p.locator("thead th").allTextContents()).filter(Boolean).join(" | "));
  const bodyRows = await p.locator("tbody tr").count();
  const live = await prisma.expense.count({ where: { voidedAt: null } });
  console.log(`rows rendered: ${bodyRows} | live expenses in db: ${live}  (all shown by default: ${bodyRows === live})`);

  const firstDate = await p.locator("tbody tr").first().locator("td").first().innerText();
  const newest = await prisma.expense.findFirst({ where: { voidedAt: null }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] });
  console.log("top row date:", firstDate, "| newest in db:", newest?.date.toISOString().slice(0, 10));

  console.log("void link present:", await p.locator("tbody a:has-text('Void'), tbody button:has-text('Void')").count());

  // --- edit the top row ---------------------------------------------------
  const target = newest!;
  await p.locator("tbody tr").first().getByRole("button", { name: "Edit" }).click();
  await p.waitForSelector(`#a-${target.id}`);
  await p.fill(`#a-${target.id}`, "4321");
  await p.fill(`#p-${target.id}`, "Test Vendor Pvt Ltd");
  await p.fill(`#n-${target.id}`, "edited from the table");
  await p.selectOption(`#m-${target.id}`, "UPI");
  await p.click('button[type=submit]:has-text("Save changes")');
  await p.waitForTimeout(2500);

  const after = await prisma.expense.findUnique({ where: { id: target.id } });
  console.log("after edit:", {
    amount: String(after?.amount), paidTo: after?.paidTo,
    desc: after?.description, mode: after?.paymentMode,
  });

  // --- remove an entry ----------------------------------------------------
  await p.goto(BASE + "/expenses");
  await p.locator("tbody tr").first().getByRole("button", { name: "Edit" }).click();
  await p.locator("button:has-text('Remove entry')").click();
  await p.locator("form button:has-text('Remove')").last().click();
  await p.waitForTimeout(2500);
  const removed = await prisma.expense.findUnique({ where: { id: target.id } });
  console.log("removed -> voidedAt set:", !!removed?.voidedAt, "| reason:", removed?.voidReason);
  const rowsNow = await p.locator("tbody tr").count();
  console.log("rows after removal:", rowsNow, "(was", bodyRows + ")");

  await p.screenshot({ path: "docs/expenses-table.png", fullPage: false });

  // restore
  await prisma.expense.update({
    where: { id: target.id },
    data: { voidedAt: null, voidReason: null, amount: target.amount, paidTo: target.paidTo,
            description: target.description, paymentMode: target.paymentMode },
  });
  console.log("restored test row");
  console.log("page errors:", errs.length ? errs : "none");
  await b.close();
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); }).finally(() => prisma.$disconnect());
