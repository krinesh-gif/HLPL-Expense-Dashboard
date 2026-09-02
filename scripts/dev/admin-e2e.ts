import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const BASE = "http://localhost:3111";

async function main() {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errs: string[] = [];
  const p = await b.newPage({ viewport: { width: 1100, height: 1000 } });
  p.on("pageerror", (e) => errs.push(String(e)));

  const login = async (email: string, pw: string) => {
    await p.goto(BASE + "/login");
    await p.fill("#email", email); await p.fill("#password", pw);
    await p.click("button[type=submit]");
    await p.waitForURL((u) => !u.pathname.includes("login"), { timeout: 15000 });
  };

  await login("krinesh@araviorganic.com", "Change@123");
  console.log("founder logged in");

  // --- add a person -------------------------------------------------------
  await p.goto(BASE + "/users");
  await p.click("text=Add person");
  await p.fill("#u-name", "Ravi Patel");
  await p.fill("#u-email", "ravi@araviorganic.com");
  await p.selectOption("#u-role", "WH");
  await p.fill("#u-pass", "RaviPass123");
  await p.click('form button[type=submit]');
  await p.waitForTimeout(1500);
  const ravi = await prisma.user.findUnique({ where: { email: "ravi@araviorganic.com" } });
  console.log("added:", ravi && { name: ravi.name, role: ravi.role, cc: ravi.costCenter, active: ravi.active });

  // the new person can actually sign in, and is scoped to WH
  await login("ravi@araviorganic.com", "RaviPass123");
  console.log("new user landed on:", new URL(p.url()).pathname);
  const blocked = await p.goto(BASE + "/users");
  console.log("new user reaching /users ->", new URL(p.url()).pathname);

  // --- change their password ---------------------------------------------
  await login("krinesh@araviorganic.com", "Change@123");
  await p.goto(BASE + "/users");
  await p.locator("li", { hasText: "ravi@araviorganic.com" }).getByText("Change password").click();
  await p.fill("#r-pass", "BrandNew456");
  await p.click('form button[type=submit]:has-text("Change password")');
  await p.waitForTimeout(1200);
  await login("ravi@araviorganic.com", "BrandNew456");
  console.log("signed in with new password:", !p.url().includes("login"));

  // --- remove access ------------------------------------------------------
  await login("krinesh@araviorganic.com", "Change@123");
  await p.goto(BASE + "/users");
  await p.locator("li", { hasText: "ravi@araviorganic.com" }).getByText("Remove access").click();
  await p.waitForTimeout(1200);
  await p.goto(BASE + "/login");
  await p.fill("#email", "ravi@araviorganic.com"); await p.fill("#password", "BrandNew456");
  await p.click("button[type=submit]"); await p.waitForTimeout(1500);
  console.log("deactivated user blocked at login:", await p.locator("form [role=alert]").innerText());

  // --- founder cannot remove their own access -----------------------------
  await login("krinesh@araviorganic.com", "Change@123");
  await p.goto(BASE + "/users");
  const selfRemove = await p.locator("li", { hasText: "krinesh@araviorganic.com" }).getByText("Remove access").count();
  console.log("self-remove button shown:", selfRemove > 0);

  // --- import via upload ---------------------------------------------------
  const before = await prisma.expense.count({ where: { legacyRef: { not: null } } });
  await prisma.expense.deleteMany({ where: { legacyRef: { not: null } } });
  await prisma.cashTxn.deleteMany({ where: { legacyRef: { not: null } } });
  console.log(`cleared imported rows (was ${before})`);

  await p.goto(BASE + "/import");
  await p.setInputFiles("#f-founder", "data/founder.xlsx");
  await p.setInputFiles("#f-wh", "data/wh.xlsx");
  await p.setInputFiles("#f-ho", "data/ho.xlsx");
  await p.click('button[type=submit]:has-text("Import")');
  await p.waitForSelector("text=Imported", { timeout: 60000 });
  console.log("result:", (await p.locator("h2:has-text('Imported')").textContent())?.trim());
  const after = await prisma.expense.count({ where: { legacyRef: { not: null } } });
  console.log(`expenses with legacyRef: ${after}`);

  // wrong file in the wrong slot should be refused clearly
  await p.goto(BASE + "/import");
  await p.setInputFiles("#f-founder", "data/wh.xlsx");
  await p.setInputFiles("#f-wh", "data/wh.xlsx");
  await p.setInputFiles("#f-ho", "data/ho.xlsx");
  await p.click('button[type=submit]:has-text("Import")');
  await p.waitForSelector("form [role=alert]", { timeout: 30000 });
  console.log("wrong file rejected:", (await p.locator("form [role=alert]").innerText()).trim());

  await p.screenshot({ path: "docs/import.png", fullPage: true });
  await p.goto(BASE + "/users"); await p.waitForTimeout(800);
  await p.screenshot({ path: "docs/users.png", fullPage: true });

  console.log("page errors:", errs.length ? errs : "none");
  await b.close();
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); }).finally(() => prisma.$disconnect());
