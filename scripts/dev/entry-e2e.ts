import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const BASE = "http://localhost:3111";

async function main() {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errs: string[] = [];

  for (const [who, email, cc] of [
    ["warehouse", "wh@araviorganic.com", "WH"],
    ["head office", "ho@araviorganic.com", "HO"],
  ] as const) {
    const p = await b.newPage({ viewport: { width: 430, height: 900 } });
    p.on("pageerror", (e) => errs.push(String(e)));
    await p.goto(BASE + "/login");
    await p.fill("#email", email); await p.fill("#password", "Change@123");
    await p.click("button[type=submit]"); await p.waitForURL("**/entry");
    await p.waitForTimeout(700);

    // the category chips are the aria-pressed buttons that are not the four payment modes
    const shown = (await p.locator('button[aria-pressed] > span.truncate').allTextContents())
      .map((t) => t.trim()).filter(Boolean);
    console.log(`\n${who} chips (${shown.length}):`);
    console.log("  " + shown.slice(0, 14).join(" | "));

    const expected = await prisma.expense.groupBy({
      by: ["categoryId"],
      where: { costCenter: cc, voidedAt: null },
      _count: { _all: true },
      orderBy: { _count: { categoryId: "desc" } },
      take: 6,
    });
    const names: string[] = [];
    for (const e of expected) {
      const c = await prisma.category.findUnique({ where: { id: e.categoryId } });
      if (c && c.code !== "UNCLASSIFIED") names.push(`${c.name} (${e._count._all})`);
    }
    console.log("  db most-used:", names.join(" | "));

    if (who === "warehouse") await p.screenshot({ path: "docs/entry-mobile.png" });
    await p.close();
  }

  console.log("\npage errors:", errs.length ? errs : "none");
  await b.close();
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); }).finally(() => prisma.$disconnect());
