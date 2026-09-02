/**
 * One-time migration of the three legacy workbooks into the dashboard.
 *
 * The important correction it makes:
 * cash the founder handed to Hardikbhai (warehouse float) or Maulikbhai (head-office
 * float) was booked as an *expense* in the founder's workbook, and the same money was
 * then booked again as expenses by the WH/HO teams when they spent it. Those rows are
 * imported as float ISSUE transfers instead, so group totals stop double-counting.
 */
import ExcelJS from "exceljs";
import { PrismaClient, type CostCenter, type PaymentMode } from "@prisma/client";
import { NON_EXPENSE_LABELS } from "../prisma/seed-data";

const prisma = new PrismaClient();
const DIR = process.env.LEGACY_DIR ?? "./data";

/** Cash custodians: money handed to them is a float transfer, not a spend. */
const CUSTODIAN: Record<string, CostCenter> = {
  hardik: "WH", hardikbhai: "WH",
  maulik: "HO", maulikbhai: "HO",
};

type Row = Record<string, unknown>;

const val = (c: ExcelJS.CellValue): unknown => {
  if (c && typeof c === "object") {
    if (c instanceof Date) return c;
    if ("result" in c) return (c as { result: unknown }).result;
    if ("text" in c) return (c as { text: string }).text;
    if ("richText" in c) return (c as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
  }
  return c;
};

function readSheet(ws: ExcelJS.Worksheet, headerRow: number, cols: string[]): Row[] {
  const out: Row[] = [];
  ws.eachRow((row, i) => {
    if (i <= headerRow) return;
    const o: Row = {};
    cols.forEach((name, idx) => { if (name) o[name] = val(row.getCell(idx + 1).value); });
    out.push(o);
  });
  return out;
}

const num = (v: unknown): number => {
  if (typeof v === "number") return v;
  const p = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(p) ? p : 0;
};

const asDate = (v: unknown): Date | null => {
  if (v instanceof Date) return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
  if (typeof v === "string") { const d = new Date(v); if (!isNaN(+d)) return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); }
  return null;
};

const str = (v: unknown): string => String(v ?? "").trim();

const mode = (v: unknown): PaymentMode => {
  const s = str(v).toLowerCase();
  if (s.startsWith("online") || s.includes("upi") || s.includes("gpay") || s.includes("paytm")) return "UPI";
  if (s.includes("bank") || s.includes("neft") || s.includes("imps") || s.includes("transfer")) return "BANK";
  if (s.includes("card")) return "CARD";
  return "CASH";
};

// ---- category resolution ---------------------------------------------------
let aliasMap = new Map<string, string>();
let fallbackId = "";
const unmapped = new Map<string, number>();

async function loadCategories() {
  const aliases = await prisma.categoryAlias.findMany({ select: { alias: true, categoryId: true } });
  aliasMap = new Map(aliases.map((a) => [a.alias, a.categoryId]));
  const cats = await prisma.category.findMany({ select: { id: true, code: true, name: true } });
  for (const c of cats) {
    aliasMap.set(c.name.toLowerCase(), c.id);
    aliasMap.set(c.code.toLowerCase(), c.id);
  }
  fallbackId = cats.find((c) => c.code === "UNCLASSIFIED")!.id;
}

function resolveCategory(label: string, description = ""): string {
  const key = label.trim().toLowerCase();
  const hit = aliasMap.get(key);
  if (hit) return hit;
  // second chance: look for a known alias inside the free text
  const hay = (label + " " + description).toLowerCase();
  for (const [alias, id] of aliasMap) {
    if (alias.length >= 5 && hay.includes(alias)) return id;
  }
  unmapped.set(label || "(blank)", (unmapped.get(label || "(blank)") ?? 0) + 1);
  return fallbackId;
}

const isNonExpense = (label: string) => NON_EXPENSE_LABELS.has(label.trim().toLowerCase());

function custodianOf(paidTo: string): CostCenter | null {
  const k = paidTo.trim().toLowerCase().split(/[\s-]/)[0];
  return CUSTODIAN[k] ?? null;
}


type FounderIssue = {
  date: Date; amount: number; cc: CostCenter; used: boolean;
  ref: string; paidTo: string; description: string; category: string;
};

/** Cash to a custodian that the team never acknowledged and that reads as a personal
 *  advance or a staff payment is a spend, not a float top-up. */
const PERSONAL = /personal|advance|shagun|salary|loan/i;

/**
 * A hand-over the team logged as one receipt may appear in the founder's book as
 * two or three separate rows on nearby dates (e.g. WH logged 31,200 on 01-Aug where
 * the founder booked 30,000 + 1,200). Consume any combination of up to three
 * unmatched founder issues that sums to the team's figure, so the transfer is
 * counted once rather than twice.
 */
function consumeFounderIssues(
  pool: FounderIssue[],
  cc: CostCenter, date: Date, amount: number, windowDays = 10,
): boolean {
  const near = pool
    .map((x, i) => ({ x, i }))
    .filter(({ x }) => !x.used && x.cc === cc && Math.abs(+x.date - +date) <= windowDays * 864e5);

  const eq = (a: number, b: number) => Math.abs(a - b) < 1;

  for (const a of near) if (eq(a.x.amount, amount)) { pool[a.i].used = true; return true; }
  for (let i = 0; i < near.length; i++)
    for (let j = i + 1; j < near.length; j++) {
      if (eq(near[i].x.amount + near[j].x.amount, amount)) {
        pool[near[i].i].used = pool[near[j].i].used = true; return true;
      }
      for (let k = j + 1; k < near.length; k++)
        if (eq(near[i].x.amount + near[j].x.amount + near[k].x.amount, amount)) {
          pool[near[i].i].used = pool[near[j].i].used = pool[near[k].i].used = true; return true;
        }
    }
  return false;
}

// ---- main ------------------------------------------------------------------
async function main() {
  await loadCategories();

  const founder = await prisma.user.findUniqueOrThrow({ where: { email: "krinesh@araviorganic.com" } });
  const wh = await prisma.user.findUniqueOrThrow({ where: { email: "wh@araviorganic.com" } });
  const ho = await prisma.user.findUniqueOrThrow({ where: { email: "ho@araviorganic.com" } });
  const teamUser: Record<string, string> = { WH: wh.id, HO: ho.id };

  console.log("clearing previously imported legacy rows...");
  await prisma.expense.deleteMany({ where: { legacyRef: { not: null } } });
  await prisma.cashTxn.deleteMany({ where: { legacyRef: { not: null } } });

  const wbF = new ExcelJS.Workbook(); await wbF.xlsx.readFile(`${DIR}/founder.xlsx`);
  const wbW = new ExcelJS.Workbook(); await wbW.xlsx.readFile(`${DIR}/wh.xlsx`);
  const wbH = new ExcelJS.Workbook(); await wbH.xlsx.readFile(`${DIR}/ho.xlsx`);

  const expenses: any[] = [];
  const cashTxns: any[] = [];
  const stats: Record<string, number> = {};
  const bump = (k: string, by = 1) => { stats[k] = (stats[k] ?? 0) + by; };

  // 1. Founder cash ledger -> expenses, except custodian hand-overs -> ISSUE
  const ledger = readSheet(wbF.getWorksheet("💵 Cash Ledger")!, 5,
    ["", "date", "month", "category", "amount", "description", "paidTo", "mode", "paidBy", "", "billNo", "remark"]);
  const issuesFromFounder: FounderIssue[] = [];

  for (const [i, r] of ledger.entries()) {
    const date = asDate(r.date); const amount = num(r.amount);
    if (!date || amount <= 0) continue;
    const paidTo = str(r.paidTo);
    const cc = custodianOf(paidTo);
    const pm = mode(r.mode);
    const ref = `founder:ledger:${i + 6}`;

    if (cc && pm === "CASH") {
      // Held back until the team books are read: a hand-over only counts as a float
      // transfer if the receiving team actually acknowledged it (see below).
      issuesFromFounder.push({ date, amount, cc, used: false, ref,
        paidTo, description: str(r.description), category: str(r.category) });
      continue;
    }
    expenses.push({ date, costCenter: "FOUNDER", categoryId: resolveCategory(str(r.category), str(r.description)),
      amount, paymentMode: pm, paidTo: paidTo || null, description: str(r.description) || null,
      billNo: str(r.billNo) || null, enteredById: founder.id, legacyRef: ref });
    bump("founder expenses");
  }

  // 2. Founder cash inflow -> RECEIPT into the founder chest
  const inflow = readSheet(wbF.getWorksheet("💰 Cash Inflow")!, 5,
    ["", "date", "source", "amount", "purpose", "receivedBy"]);
  for (const [i, r] of inflow.entries()) {
    const date = asDate(r.date); const amount = num(r.amount);
    if (!date || amount <= 0) continue;
    cashTxns.push({ date, type: "RECEIPT", amount, source: str(r.source) || "Other", mode: "CASH",
      note: str(r.purpose) || null, createdById: founder.id, legacyRef: `founder:inflow:${i + 6}` });
    bump("founder receipts");
  }

  // 3. Director drawings -> DRAWING (money leaving the business, never an expense)
  const draw = readSheet(wbF.getWorksheet("👤 Director Drawings")!, 4,
    ["date", "director", "amount", "purpose"]);
  for (const [i, r] of draw.entries()) {
    const date = asDate(r.date); const amount = num(r.amount);
    if (!date || amount <= 0) continue;
    cashTxns.push({ date, type: "DRAWING", amount, source: str(r.director) || "Director", mode: "CASH",
      note: str(r.purpose) || null, createdById: founder.id, legacyRef: `founder:drawing:${i + 5}` });
    bump("director drawings");
  }

  // 4. Historical FY24-25 -> founder expenses
  const hist = readSheet(wbF.getWorksheet("🗂 Historical FY24-25")!, 4,
    ["", "date", "category", "description", "paidTo", "mode", "amount", "paidFrom", "type", "remark"]);
  for (const [i, r] of hist.entries()) {
    const date = asDate(r.date); const amount = num(r.amount);
    if (!date || amount <= 0) continue;
    expenses.push({ date, costCenter: "FOUNDER", categoryId: resolveCategory(str(r.category), str(r.description)),
      amount, paymentMode: mode(r.mode), paidTo: str(r.paidTo) || null,
      description: str(r.description) || null, enteredById: founder.id, legacyRef: `founder:hist:${i + 5}` });
    bump("historical expenses");
  }

  // 5. WH / HO cash books
  for (const [cc, wb] of [["WH", wbW], ["HO", wbH]] as const) {
    const ws = wb.getWorksheet("💰 Cash Book")!;
    const rows = readSheet(ws, 5, ["date", "month", "cashIn", "cashOut", "category", "description", "", "remark"]);
    for (const [i, r] of rows.entries()) {
      const date = asDate(r.date);
      if (!date) continue;
      const label = str(r.category);
      const desc = [str(r.description), str(r.remark)].filter(Boolean).join(" — ");
      const ref = `${cc.toLowerCase()}:cashbook:${i + 6}`;
      const cin = num(r.cashIn); const cout = num(r.cashOut);

      if (cin > 0) {
        // Cash arriving into a team float. If the founder's book already records the
        // same hand-over, skip it so the transfer is not counted twice.
        if (consumeFounderIssues(issuesFromFounder, cc, date, cin)) {
          bump(`${cc} cash-in matched to founder issue`);
          continue;
        }

        const fromFounder = isNonExpense(label) || /krinesh|rasesh|petty/i.test(label + " " + desc);
        cashTxns.push({
          date, type: fromFounder ? "ISSUE" : "RECEIPT", amount: cin, toCostCenter: cc, mode: "CASH",
          source: fromFounder ? (label || "Founder") : (label || "Local receipt"),
          note: desc || null, createdById: teamUser[cc], legacyRef: ref,
        });
        bump(fromFounder ? `${cc} unmatched founder issue` : `${cc} local receipts`);
        continue;
      }

      if (cout > 0) {
        if (isNonExpense(label)) { bump(`${cc} skipped non-expense out`); continue; }
        expenses.push({ date, costCenter: cc, categoryId: resolveCategory(label, desc), amount: cout,
          paymentMode: "CASH", description: desc || label || null, enteredById: teamUser[cc], legacyRef: ref });
        bump(`${cc} expenses`);
      }
    }
  }

  // Settle the held-back founder hand-overs now that the team books have been read.
  for (const c of issuesFromFounder) {
    if (c.used) {
      cashTxns.push({ date: c.date, type: "ISSUE", amount: c.amount, toCostCenter: c.cc, mode: "CASH",
        source: c.paidTo, note: c.description || null, createdById: founder.id, legacyRef: c.ref });
      bump(`float issued to ${c.cc}`, c.amount);
    } else if (PERSONAL.test(c.description) || PERSONAL.test(c.category)) {
      // never reached the float - book it where it belongs
      expenses.push({ date: c.date, costCenter: "FOUNDER",
        categoryId: resolveCategory(c.category, c.description), amount: c.amount, paymentMode: "CASH",
        paidTo: c.paidTo || null, description: c.description || null,
        enteredById: founder.id, legacyRef: c.ref });
      bump("founder expenses (advance, not float)");
    } else {
      // genuinely in transit: issued by the founder, not yet logged by the team
      cashTxns.push({ date: c.date, type: "ISSUE", amount: c.amount, toCostCenter: c.cc, mode: "CASH",
        source: c.paidTo, note: (c.description || "") + " [not yet acknowledged by team]",
        createdById: founder.id, legacyRef: c.ref });
      bump(`float issued to ${c.cc}`, c.amount);
      bump(`${c.cc} transfers awaiting team acknowledgement`);
    }
  }

  await prisma.expense.createMany({ data: expenses });
  await prisma.cashTxn.createMany({ data: cashTxns });

  console.log(`\nimported ${expenses.length} expenses, ${cashTxns.length} cash transactions`);
  for (const [k, v] of Object.entries(stats).sort()) console.log(`  ${k}: ${Math.round(v).toLocaleString("en-IN")}`);
  if (unmapped.size) {
    console.log("\nlabels that fell through to 'Unclassified' (re-tag from the dashboard):");
    for (const [k, v] of [...unmapped].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`  ${v}x  ${k}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
