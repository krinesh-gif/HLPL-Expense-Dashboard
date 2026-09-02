import { chromium } from "playwright";
const BASE = "http://localhost:3111";
async function main() {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errs: string[] = [];
  const targets = [
    { email: "krinesh@araviorganic.com", path: "/dashboard?m=2026-08", file: "docs/dashboard.png", vp: { width: 1280, height: 1500 } },
    { email: "krinesh@araviorganic.com", path: "/cash", file: "docs/cash.png", vp: { width: 1280, height: 1100 } },
    { email: "wh@araviorganic.com", path: "/entry", file: "docs/entry-mobile.png", vp: { width: 390, height: 844 } },
  ];
  for (const t of targets) {
    const p = await b.newPage({ viewport: t.vp });
    p.on("pageerror", (e) => errs.push(`${t.file}: ${e}`));
    await p.goto(BASE + "/login");
    await p.fill("#email", t.email); await p.fill("#password", "Change@123");
    await p.click("button[type=submit]");
    await p.waitForURL((u) => !u.pathname.includes("login"));
    await p.goto(BASE + t.path);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: t.file, fullPage: true });
    await p.close();
  }
  console.log("errors:", errs.length ? errs : "none");
  await b.close();
}
main();
