/**
 * Command-line entry point for the legacy workbook import. The founder can do the
 * same thing from the Import screen in the app; both run the identical code in
 * src/lib/import.ts.
 *
 *   npm run import                 # reads ./data/{founder,wh,ho}.xlsx
 *   LEGACY_DIR=/path npm run import
 */
import { readFile } from "node:fs/promises";
import { runImport } from "../src/lib/import";
import { prisma } from "../src/lib/prisma";

const DIR = process.env.LEGACY_DIR ?? "./data";

async function main() {
  const [founder, wh, ho] = await Promise.all(
    ["founder", "wh", "ho"].map(async (n) => {
      try {
        return await readFile(`${DIR}/${n}.xlsx`);
      } catch {
        throw new Error(`Missing ${DIR}/${n}.xlsx`);
      }
    }),
  );

  const r = await runImport({ founder, wh, ho });

  console.log(`\nimported ${r.expenses} expenses, ${r.cashTxns} cash transactions`);
  for (const [k, v] of Object.entries(r.stats)) {
    console.log(`  ${k}: ${Math.round(v).toLocaleString("en-IN")}`);
  }
  if (r.unmapped.length) {
    console.log("\nlabels that fell through to 'Unclassified' (re-tag from the dashboard):");
    for (const u of r.unmapped) console.log(`  ${u.count}x  ${u.label}`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
