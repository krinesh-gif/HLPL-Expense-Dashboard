import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://postgres:pg@localhost:5432/hlpl_fresh" } } });
const BASE = "http://localhost:3222";

async function main() {
  console.log("users before:", await prisma.user.count(), "categories before:", await prisma.category.count());

  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await b.newPage({ viewport: { width: 1100, height: 1000 } });
  const errs: string[] = [];
  p.on("pageerror", (e) => errs.push(String(e)));

  // a brand-new deployment: going to the site at all should land on setup
  await p.goto(BASE + "/");
  console.log("fresh install landed on:", new URL(p.url()).pathname);
  await p.screenshot({ path: "docs/setup.png", fullPage: true });

  await p.fill("#s-name", "Krinesh Mangukiya");
  await p.fill("#s-email", "krinesh@araviorganic.com");
  await p.fill("#s-pass", "MyRealPass123");
  await p.click('button[type=submit]');
  await p.waitForURL("**/import", { timeout: 30000 });
  console.log("after setup landed on:", new URL(p.url()).pathname);
  console.log("users after:", await prisma.user.count(), "categories after:", await prisma.category.count());

  // straight into the import, from the browser, with no terminal anywhere
  await p.setInputFiles("#f-founder", "data/founder.xlsx");
  await p.setInputFiles("#f-wh", "data/wh.xlsx");
  await p.setInputFiles("#f-ho", "data/ho.xlsx");
  await p.click('button[type=submit]:has-text("Import")');
  await p.waitForSelector("text=Imported", { timeout: 90000 });
  console.log("import:", (await p.locator("h2:has-text('Imported')").textContent())?.trim());

  await p.goto(BASE + "/dashboard");
  await p.waitForTimeout(1500);
  const spend = await p.locator("text=FY26-27 spend to date").locator("..").innerText();
  console.log("dashboard shows:", spend.replace(/\n/g, " "));

  // setup must now be closed for good
  const again = await p.goto(BASE + "/setup");
  console.log("revisiting /setup ->", new URL(p.url()).pathname, again?.status());

  console.log("page errors:", errs.length ? errs : "none");
  await b.close();
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); }).finally(() => prisma.$disconnect());
