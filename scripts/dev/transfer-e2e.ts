import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const BASE = "http://localhost:3111";

const login = async (p: import("playwright").Page, email: string, to: string) => {
  await p.goto(BASE + "/login");
  await p.fill("#email", email); await p.fill("#password", "Change@123");
  await p.click("button[type=submit]"); await p.waitForURL(`**${to}`);
};

async function main() {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errs: string[] = [];
  const founder = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const wh = await b.newPage({ viewport: { width: 430, height: 900 } });
  founder.on("pageerror", (e) => errs.push("founder: " + e));
  wh.on("pageerror", (e) => errs.push("wh: " + e));

  await login(founder, "krinesh@araviorganic.com", "/dashboard");
  await login(wh, "wh@araviorganic.com", "/entry");

  const floatOf = async () => {
    const inAgg = await prisma.cashTxn.aggregate({
      where: { toCostCenter: "WH", voidedAt: null, status: "CONFIRMED", type: { in: ["ISSUE", "RECEIPT"] } },
      _sum: { amount: true },
    });
    const out = await prisma.expense.aggregate({
      where: { costCenter: "WH", paymentMode: "CASH", voidedAt: null }, _sum: { amount: true },
    });
    return Number(inAgg._sum.amount ?? 0) - Number(out._sum.amount ?? 0);
  };

  console.log("=== 1. founder sends, warehouse confirms ===");
  const start = await floatOf();
  await founder.goto(BASE + "/cash");
  await founder.click('button:has-text("Give to team")');
  await founder.fill("#cash-amount", "25000");
  await founder.locator(`label:has-text("Warehouse")`).click();
  await founder.click('form button[type=submit]:has-text("Record")');
  await founder.waitForTimeout(2000);
  console.log("founder says:", (await founder.locator("form [role=status]").innerText()).trim());

  const mid = await floatOf();
  console.log(`float while unconfirmed: ${start} -> ${mid} (unchanged: ${start === mid})`);

  await wh.goto(BASE + "/reconcile");
  await wh.waitForTimeout(800);
  console.log("warehouse sees waiting:", await wh.locator('button:has-text("Yes, I got it")').count());
  await wh.locator('button:has-text("Yes, I got it")').first().click();
  await wh.waitForTimeout(2500);
  const after = await floatOf();
  console.log(`float after confirming: ${mid} -> ${after} (+25000: ${after - mid === 25000})`);

  console.log("\n=== 2. warehouse records cash from founder, founder approves ===");
  await wh.goto(BASE + "/reconcile");
  await wh.fill("#r-amount", "4000");
  await wh.click('button[type=submit]:has-text("Record cash received")');
  await wh.waitForTimeout(2500);
  console.log("warehouse says:", (await wh.locator("form [role=status]").innerText()).trim());
  const claimed = await floatOf();
  console.log(`float on an unapproved claim: ${after} -> ${claimed} (unchanged: ${after === claimed})`);

  await founder.goto(BASE + "/cash");
  await founder.waitForTimeout(900);
  console.log("founder sees to approve:", await founder.locator('button:has-text("Yes, I sent it")').count());
  await founder.locator('button:has-text("Yes, I sent it")').first().click();
  await founder.waitForTimeout(2500);
  const approved = await floatOf();
  console.log(`float after approval: ${claimed} -> ${approved} (+4000: ${approved - claimed === 4000})`);

  console.log("\n=== 3. a claim the founder disputes ===");
  await wh.goto(BASE + "/reconcile");
  await wh.fill("#r-amount", "9999");
  await wh.click('button[type=submit]:has-text("Record cash received")');
  await wh.waitForTimeout(2500);
  await founder.goto(BASE + "/cash");
  await founder.waitForTimeout(900);
  await founder.locator('button:has-text("No")').first().click();
  await founder.fill('input[name="reason"]', "I sent 5,000 not 9,999");
  await founder.click('button:has-text("Send back")');
  await founder.waitForTimeout(2500);
  const afterReject = await floatOf();
  console.log(`float after rejection: ${approved} -> ${afterReject} (unchanged: ${approved === afterReject})`);

  console.log("\n=== 4. scrap sale needs nobody ===");
  await wh.goto(BASE + "/reconcile");
  await wh.click('button:has-text("Scrap or other")');
  await wh.fill("#r-amount", "650");
  await wh.selectOption("#r-source", "Scrap / pasti sale");
  await wh.click('button[type=submit]:has-text("Record cash received")');
  await wh.waitForTimeout(2500);
  const scrap = await floatOf();
  console.log(`float after scrap sale: ${afterReject} -> ${scrap} (+650 straight away: ${scrap - afterReject === 650})`);

  console.log("\n=== 5. nobody can confirm their own claim ===");
  const own = await prisma.cashTxn.findFirst({
    where: { type: "ISSUE", status: "PENDING", initiatedBy: "FOUNDER" }, orderBy: { createdAt: "desc" },
  });
  if (own) {
    await founder.goto(BASE + "/cash");
    await founder.waitForTimeout(700);
    const selfConfirm = await founder.locator('button:has-text("Yes, I sent it")').count();
    console.log("founder-initiated transfers offered to the founder to confirm:", selfConfirm, "(must be 0)");
  } else {
    console.log("no founder-initiated pending transfer left to check");
  }

  console.log("\npage errors:", errs.length ? errs : "none");
  await b.close();
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); }).finally(() => prisma.$disconnect());
