# HLPL Expense Dashboard

Cash expense control for **Hivefy Lifestyle Pvt Ltd**. Replaces the three separate
FY26-27 workbooks (warehouse, head office, founder) with one system where each team
records only its own spend, and the founder sees everything consolidated.

## Why it exists

The three workbooks could not be added up. The importer surfaced three concrete problems:

1. **Cash hand-overs were counted twice.** ₹2,54,300 the founder handed to Hardikbhai
   (warehouse float) and Maulikbhai (head-office float) was booked as *expense* in the
   founder's ledger, and the same money was booked again by the teams as they spent it.
   Founder FY26-27 expense drops from a claimed ₹5,58,907 to a real ₹2,74,607.
2. **Three incompatible category lists.** The founder used "Office Operations"
   (33 of 63 rows), the teams used free text — head office had `Pani Puri-Maulik`,
   `cake`, `Chair` and `Krinesh Sir` as categories, with 15 of 58 rows in "Other".
3. **No reconciliation.** Nothing proved the cash the teams held matched the book.
   A ₹30,000 hand-over on 01-Sep-2026 sits unacknowledged by the warehouse to this day.

## Roles

| Role | Sees | Does |
|---|---|---|
| **Warehouse manager** | Warehouse expenses only | Records spend, declares cash in hand |
| **Accounts manager** | Head-office expenses only | Records spend, declares cash in hand |
| **Founder** | Everything | Records own spend, moves cash, sets budgets, analyses |

Teams cannot see each other's entries or the founder's, and cannot reach the founder's
screens. The scope is applied server-side on every query (`expenseScope` in
`src/lib/auth.ts`) — it is not a UI filter, so editing the URL does not defeat it.

## How the money is modelled

Cash flows in a closed loop, which is what makes month-end add up:

```
  Cash received (supplier refund, billing recovery, collection)
        │
        ▼
  Founder's chest ──── issues float ────► WH float ──► WH expenses
        │                              └► HO float ──► HO expenses
        ├──── founder's own expenses
        └──── director drawings (out of the business, never an expense)
```

Float balance = issued + locally received − spent. Each team periodically declares the
cash it is physically holding; the gap against the book is the control number.

## Recording an expense

Three taps and a number: type the amount, tap a category chip, tap save. Categories are
ordered by how often *that user* has picked them in the last 90 days, so the common ones
sit first. Date defaults to today, payment mode to cash, everything else is optional.

Two things happen automatically at entry:
- the live budget bar for that head appears, and warns before saving if the entry
  overruns the month's budget (it still saves — the founder sees it as an overrun);
- heads flagged `requiresBill` demand a bill number above their threshold.

## Category master

One taxonomy for all three teams, 25 heads in 9 groups. Each head carries:
its **Tally ledger name** (so month-end exports import straight into Tally),
which teams may book to it, a **monthly budget**, and bill requirements.
The founder edits all of this at `/categories`.

Old sheet labels are mapped through `CategoryAlias`, so migrated rows land on the right
head — `Pani Puri-Maulik`, `cake` and `Staff Food & Tea` all become **Staff Food & Tea**.

`Unclassified (re-tag)` holds migrated rows whose original label carried no meaning
(mostly "Office Operations" and "Other"). It cannot be picked for new entries, and the
dashboard nags until the backlog is cleared.

## Month-end

`Export for Tally` on the dashboard produces a CSV with one row per voucher, carrying
the ledger name, cost centre, narration, bill number and a capex flag.

## Running it

```bash
npm install
cp .env.example .env          # set DATABASE_URL and AUTH_SECRET
npx prisma migrate deploy
npm run seed                  # category master + three users
npm run dev
```

Seeded logins (password `Change@123` — change it immediately):
`krinesh@araviorganic.com` (founder), `wh@araviorganic.com`, `ho@araviorganic.com`.

### Importing the old workbooks

Put `founder.xlsx`, `wh.xlsx` and `ho.xlsx` in `data/`, then:

```bash
npm run import
```

It is idempotent — it clears previously imported rows (those carrying a `legacyRef`)
and re-imports, so it can be re-run after adjusting category mappings. Entries made in
the app are never touched.

The import loaded **692 expenses** and **92 cash transactions** covering FY24-25 and
FY26-27. It reconciles exactly to the source books: warehouse ₹2,14,581 spent,
head office ₹30,428 spent with ₹13,984 in hand — both matching the team sheets to the
rupee. The warehouse shows ₹50,205 against the sheet's ₹20,205, the ₹30,000 difference
being the unacknowledged 01-Sep hand-over.

## Deploying

Step-by-step Neon + Vercel instructions are in **[docs/DEPLOY.md](docs/DEPLOY.md)**,
including the two connection strings Neon needs and the common failure messages.

Any Node host works. The app needs `DATABASE_URL` (pooled), `DIRECT_URL` (unpooled, for
migrations) and `AUTH_SECRET`.

## Managing users

There is no user admin screen yet; both jobs are one command:

```bash
npm run set-password -- wh@araviorganic.com 'new-password'
npm run add-user -- "Ravi Patel" ravi@araviorganic.com WH 'their-password'
```

To revoke access, untick `active` on the user in `npx prisma studio` — they are signed
out on their next request and their past entries keep their author.

## Notes on the numbers

- **Cash position is fiscal-year scoped.** The migrated FY24-25 expenses have no matching
  inflow register in the source workbook, so an all-time position would be meaningless.
- **Entries are never deleted**, only voided with a reason; voided rows leave every total.
- The founder's own workbook header claimed ₹5,58,907 of FY26-27 expense while its rows
  summed to ₹5,28,907 — a ₹30,000 overstatement in the source, independent of the
  double-counting above.
