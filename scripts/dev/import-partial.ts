import { chromium, type Page } from "playwright";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const BASE = "http://localhost:3111";
const WB = "/tmp/claude-0/-home-user-HLPL-Expense-Dashboard/a4cd24e2-a488-5126-ad3f-8c8290a34536/scratchpad/wb";

async function importSome(p: Page, which: Partial<Record<"founder" | "wh" | "ho", string>>) {
  await p.goto(BASE + "/import");
  for (const [field, tag] of Object.entries(which)) {
    await p.setInputFiles(`#f-${field}`, `${WB}/${tag}-${field}.xlsx`);
  }
  await p.click('button[type=submit]');
  await p.waitForSelector("h2:has-text('Added'), form [role=alert]", { timeout: 120000 });
  const ok = await p.locator("h2:has-text('Added')").count();
  if (!ok) return "ERROR: " + (await p.locator("form [role=alert]").innerText()).trim();
  return (await p.locator("section.card").last().innerText()).split("\n")[0];
}

const transfers = async () => {
  const rows = await prisma.cashTxn.findMany({
    where: { type: "ISSUE", toCostCenter: "WH", voidedAt: null },
    select: { amount: true, status: true },
  });
  return {
    count: rows.length,
    total: rows.reduce((a, r) => a + Number(r.amount), 0),
    pending: rows.filter((r) => r.status === "PENDING").length,
  };
};

async function reset() {
  await prisma.expense.deleteMany({ where: { legacyRef: { not: null } } });
  await prisma.cashTxn.deleteMany({ where: { legacyRef: { not: null } } });
}

async function main() {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await b.newPage({ viewport: { width: 900, height: 950 } });
  const errs: string[] = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(BASE + "/login");
  await p.fill("#email", "krinesh@araviorganic.com"); await p.fill("#password", "Change@123");
  await p.click("button[type=submit]"); await p.waitForURL("**/dashboard");

  console.log("=== baseline: all three at once ===");
  await reset();
  console.log(await importSome(p, { founder: "big", wh: "big", ho: "big" }));
  const together = await transfers();
  console.log("WH transfers:", together);

  console.log("\n=== same data, uploaded one at a time: founder first ===");
  await reset();
  console.log("founder only:", await importSome(p, { founder: "big" }));
  const afterFounder = await transfers();
  console.log("WH transfers after founder alone:", afterFounder);
  console.log("wh only:    ", await importSome(p, { wh: "big" }));
  const sequential = await transfers();
  console.log("WH transfers after both:", sequential);
  console.log("MATCHES the all-at-once result:",
    sequential.count === together.count && sequential.total === together.total);

  console.log("\n=== same data, team book first ===");
  await reset();
  console.log("wh only:     ", await importSome(p, { wh: "big" }));
  const afterWh = await transfers();
  console.log("WH transfers after team alone:", afterWh);
  console.log("founder only:", await importSome(p, { founder: "big" }));
  const reversed = await transfers();
  console.log("WH transfers after both:", reversed);
  console.log("MATCHES the all-at-once result:",
    reversed.count === together.count && reversed.total === together.total);

  console.log("\n=== uploading nothing ===");
  await p.goto(BASE + "/import");
  await p.waitForTimeout(400);
  console.log("button:", (await p.locator('button[type=submit]').innerText()).trim(),
              "| disabled:", await p.locator('button[type=submit]').isDisabled());

  console.log("\npage errors:", errs.length ? errs.slice(0, 2) : "none");
  await b.close();
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); }).finally(() => prisma.$disconnect());
