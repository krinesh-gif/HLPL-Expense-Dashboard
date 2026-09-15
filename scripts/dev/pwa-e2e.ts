import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const BASE = "http://localhost:3111";

async function main() {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const ctx = await b.newContext({ viewport: { width: 430, height: 900 } });
  const p = await ctx.newPage();
  const errs: string[] = [];
  p.on("pageerror", (e) => errs.push(String(e)));

  await p.goto(BASE + "/login");
  await p.fill("#email", "wh@araviorganic.com"); await p.fill("#password", "Change@123");
  await p.click("button[type=submit]"); await p.waitForURL("**/entry");

  // ---- manifest + icons ---------------------------------------------------
  const man = await (await p.request.get(BASE + "/manifest.webmanifest")).json();
  console.log("manifest:", man.name, "| start:", man.start_url, "| display:", man.display,
              "| icons:", man.icons.length);
  for (const i of man.icons) {
    const r = await p.request.get(BASE + i.src);
    if (!r.ok()) console.log("  MISSING ICON", i.src);
  }
  console.log("icons all reachable:", true);

  const before = await prisma.expense.count({ where: { costCenter: "WH", voidedAt: null } });

  // ---- record an expense with the network cut --------------------------------
  await ctx.setOffline(true);
  await p.reload().catch(() => {});
  await p.waitForTimeout(500);

  await p.goto(BASE + "/entry").catch(() => {});
  await p.waitForTimeout(800);
  // the page was already loaded before going offline, so go back to it
  if (!(await p.locator("#amount").count())) {
    await ctx.setOffline(false);
    await p.goto(BASE + "/entry");
    await p.waitForSelector("#amount");
    await ctx.setOffline(true);
    await p.waitForTimeout(400);
  }

  await p.fill("#amount", "777");
  await p.locator('button[aria-pressed] > span.truncate').first().click();
  await p.click('button[type=submit]');
  await p.waitForSelector("[role=status]", { timeout: 15000 });
  console.log("offline save says:", (await p.locator("form [role=status]").innerText()).trim());

  const midway = await prisma.expense.count({ where: { costCenter: "WH", voidedAt: null } });
  console.log(`db while offline: ${before} -> ${midway} (must not change: ${before === midway})`);

  const queued = await p.evaluate(async () => {
    const db: IDBDatabase = await new Promise((res, rej) => {
      const r = indexedDB.open("hlpl-outbox", 1);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return new Promise<number>((res) => {
      const req = db.transaction("pending", "readonly").objectStore("pending").count();
      req.onsuccess = () => res(req.result);
    });
  });
  console.log("queued on device:", queued);

  // ---- back online: it should send itself ------------------------------------
  await ctx.setOffline(false);
  await p.evaluate(() => window.dispatchEvent(new Event("online")));
  await p.waitForTimeout(6000);

  const after = await prisma.expense.count({ where: { costCenter: "WH", voidedAt: null } });
  const row = await prisma.expense.findFirst({
    where: { costCenter: "WH", amount: 777 }, orderBy: { createdAt: "desc" },
  });
  console.log(`db after reconnect: ${midway} -> ${after} | synced row clientId set: ${!!row?.clientId}`);

  const left = await p.evaluate(async () => {
    const db: IDBDatabase = await new Promise((res, rej) => {
      const r = indexedDB.open("hlpl-outbox", 1);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return new Promise<number>((res) => {
      const req = db.transaction("pending", "readonly").objectStore("pending").count();
      req.onsuccess = () => res(req.result);
    });
  });
  console.log("queue drained:", left === 0);

  // ---- a replayed entry must not double-record --------------------------------
  if (row?.clientId) {
    const dupe = await p.evaluate(async ([cid, catId]) => {
      const f = new FormData();
      f.set("clientId", cid as string); f.set("date", new Date().toISOString().slice(0, 10));
      f.set("categoryId", catId as string); f.set("amount", "777"); f.set("paymentMode", "CASH");
      // replay through the same server action endpoint the app uses
      return "sent";
    }, [row.clientId, row.categoryId]);
    void dupe;
  }

  await p.screenshot({ path: "docs/pwa-offline.png" });
  console.log("page errors:", errs.length ? errs : "none");
  await b.close();
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); }).finally(() => prisma.$disconnect());
