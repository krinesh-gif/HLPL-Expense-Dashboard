# Setting up and running the dashboard

You never need a terminal. Everything is either a click in a website, or a message to
Claude.

---

## How changes reach the live dashboard

```
  you describe a change to Claude
        │
        ▼
  Claude edits the code and pushes to GitHub
        │
        ▼
  Vercel notices the push and rebuilds automatically   (~2 minutes)
        │
        ▼
  the live dashboard is updated - your team just refreshes
```

Database changes are applied by the deploy itself (`prisma migrate deploy` runs before
every build), so a change that needs a new field ships in one step with no separate
action from you.

**What Claude cannot do.** Your organisation's network policy blocks Claude sessions
from reaching Neon and Vercel directly. So Claude can change the *app*, but cannot
reach into the *database* to load data or reset a password. That is why those jobs are
built into the dashboard as screens you use yourself — see **People** and **Import**
below.

---

## One-time setup

### 1. The database, inside your existing Neon project

You already have the `neon-green-flask` project from the Sales P&L and Supply dashboards.
Reuse the project, but **create a separate database inside it** — do not point this app
at the database those dashboards use.

1. Open **https://console.neon.tech**, choose **neon-green-flask**.
2. Go to **Databases → New Database**. Name it `hlpl_expense`. Create it.
3. Go to **Connect**, and pick `hlpl_expense` in the database dropdown.
4. Copy the string **with pooling on** — the host contains `-pooler`. Add
   `&pgbouncer=true&connection_limit=1` to the end. This is `DATABASE_URL`.
5. Toggle pooling **off**, copy again — same string, no `-pooler`. This is `DIRECT_URL`.

> **Why a separate database.** Prisma tracks which migrations it has applied in a table
> called `_prisma_migrations`. If your Sales P&L dashboard also uses Prisma and shares a
> database with this one, the two apps would read each other's migration history and
> could try to undo each other's tables. A separate database inside the same project
> keeps them fully isolated while still using the one Neon project and its free tier.

> **Why two strings.** The pooled one lets many short-lived Vercel functions share a few
> real connections. Migrations need locks the pooler cannot pass through, so they use the
> direct one.

### 2. Deploy on Vercel

1. **https://vercel.com** → sign in with GitHub → **Add New → Project** → import
   `HLPL-Expense-Dashboard`.
2. Add three **Environment Variables**, ticking Production, Preview and Development:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the pooled string |
   | `DIRECT_URL` | the direct string |
   | `AUTH_SECRET` | any long random string — Vercel's **Generate** button is fine |

   `AUTH_SECRET` signs the login cookie. Changing it later signs everyone out.
3. **Settings → Git → Production Branch**: set it to the branch holding the code, or
   merge that branch into `main` on GitHub first and leave this alone. Whichever branch
   you choose here is what "live" means from then on.
4. **Deploy.**

The build applies the migrations on its own, so the database has its tables when the
site comes up.

### 3. Create your login

The first deploy has an empty database and no users, so there is nobody to sign in as.
Ask Claude:

> *Add a one-time setup route that creates the category master and my founder login.*

Claude will add a protected route, you open it once in the browser, and it seeds the 25
categories and your account. Then tell Claude to remove it, which takes one more deploy.

### 4. Load your old sheets

Sign in and go to **Import**. Upload the three workbooks and press Import. It loads 692
expenses and 92 cash movements and shows you exactly what it did, including anything it
could not classify.

Safe to repeat: it replaces everything it imported last time, and never touches entries
your team has typed into the app.

### 5. Set up your team

Go to **People**:

- **Add person** — name, email, role, password. Role decides what they see: a warehouse
  user is locked to warehouse expenses and cannot open your screens at all.
- **Change password** — including your own. Change all of them before sharing the link.
- **Remove access** — keeps their past entries, stops them signing in.

Tell Hardikbhai and Maulikbhai to open the site on their phone and use **Add to Home
screen** in the Chrome menu. It then behaves like an app.

---

## Asking Claude for changes

Describe the outcome, not the code. Useful examples:

> *Add a "Vehicle & Fuel" expense category, open to the warehouse only, with a ₹8,000
> monthly budget, posting to the "Vehicle Running Expenses" ledger in Tally.*

> *On the dashboard, show what we spent per order shipped, using a monthly order count
> I can type in.*

> *Warehouse staff keep picking the wrong category for pasti sales. Make that a cash
> receipt instead of an expense.*

> *Send me an email on the 1st of every month with last month's spend by team.*

Two minutes after Claude finishes, the live site has the change. If something looks
wrong, say so — Vercel keeps every previous version, and **Deployments → ⋯ → Promote to
Production** on an older one rolls back immediately.

---

## Running costs

Neon and Vercel are both free at your volume — roughly 800 rows a year. Neon's free tier
sleeps after five minutes idle, so the first request each morning takes two or three
seconds. Their paid tier (~$19/month) removes that if it becomes annoying.

---

## When something goes wrong

**The deploy failed.** Open the failed deployment on Vercel and read the last lines of
the log, then paste them to Claude.

**"Can't reach database server"** — `DATABASE_URL` is missing `?sslmode=require`, or the
direct string was pasted where the pooled one belongs.

**"prepared statement s0 already exists"** — the pooled string is missing
`&pgbouncer=true&connection_limit=1`.

**Everyone was signed out** — `AUTH_SECRET` changed. Set it back, or have everyone sign
in again.

**A migration failed during deploy** — the site keeps serving the previous version.
Tell Claude what the log said.

---

## If you ever do want a terminal

The same jobs exist as commands, for whoever maintains this later:

```bash
npm install
npx prisma migrate deploy
npm run seed
npm run import                                        # reads ./data/{founder,wh,ho}.xlsx
npm run add-user -- "Name" email@x.com WH 'password'
npm run set-password -- email@x.com 'password'
```

They need `DATABASE_URL`, `DIRECT_URL` and `AUTH_SECRET` in a `.env` file.
