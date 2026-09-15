import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const BASE = "http://localhost:3111";

async function main() {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const ctx = await b.newContext({ permissions: ["notifications"] });
  const p = await ctx.newPage();
  const errs: string[] = [];
  p.on("pageerror", (e) => errs.push(String(e)));

  await p.goto(BASE + "/login");
  await p.fill("#email", "wh@araviorganic.com"); await p.fill("#password", "Change@123");
  await p.click("button[type=submit]"); await p.waitForURL("**/entry");

  await p.goto(BASE + "/settings");
  await p.waitForTimeout(1500);
  console.log("settings sections:", (await p.locator("h2").allTextContents()).join(" | "));

  const btn = p.locator('button:has-text("Turn on reminders")');
  if (await btn.count()) {
    await btn.click();
    await p.waitForTimeout(4000);
    console.log("after enable:", (await p.locator("[role=status]").last().innerText().catch(() => "")).trim());
  } else {
    console.log("state shown:", (await p.locator("section").last().innerText()).split("\n").slice(0, 4).join(" | "));
  }

  const subs = await prisma.pushSubscription.count();
  console.log("subscriptions stored:", subs);

  if (subs > 0) {
    const res = await (await p.request.get(BASE + "/api/cron/reminders", {
      headers: { authorization: "Bearer dev-cron-secret" },
    })).json();
    console.log("cron run:", JSON.stringify(res));
  }

  await p.screenshot({ path: "docs/settings.png", fullPage: true });
  console.log("page errors:", errs.length ? errs : "none");
  await b.close();
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); }).finally(() => prisma.$disconnect());
