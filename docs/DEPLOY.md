# Deploying to Neon + Vercel

Around 30 minutes end to end. Both services are free at your volume — roughly 800
expense rows a year is nothing for either.

You need: a GitHub account (you have one), an email address, and this repo.

---

## 1. Create the database on Neon

1. Go to **https://neon.tech** and sign up with GitHub.
2. **Create project.** Name it `hlpl-expense`. For region choose
   **AWS ap-southeast-1 (Singapore)** — it is the closest to India and keeps the
   dashboard fast for your team in Surat.
3. Leave the database name as `neondb`, or rename it to `hlpl`. Either is fine.
4. On the project dashboard, click **Connect** (or **Connection string**).

You now need to copy **two** versions of the connection string.

**a) The pooled string** — this is what the app uses.
With *Connection pooling* switched **on**, copy the string. The host contains
`-pooler`, like:

```
postgresql://neondb_owner:npg_xxxx@ep-cool-brook-12345678-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

Append two parameters to the end so Prisma behaves correctly behind the pooler:

```
&pgbouncer=true&connection_limit=1
```

**b) The direct string** — this is what database migrations use.
Switch *Connection pooling* **off** and copy again. Same string, but the host has
**no** `-pooler`:

```
postgresql://neondb_owner:npg_xxxx@ep-cool-brook-12345678.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

> **Why two?** The pooler (PgBouncer) multiplexes many short serverless requests onto
> a few real connections — without it, Vercel would exhaust Neon's connection limit.
> But migrations need advisory locks that the pooler cannot pass through, so they take
> the direct route. The app uses `DATABASE_URL`, migrations use `DIRECT_URL`.

Keep both strings somewhere safe for the next steps. They contain the database password.

---

## 2. Create the schema and load your data

Run this **from your Mac**, not from Vercel. Vercel builds are read-only and short-lived;
migrations and the one-time data import belong on your machine.

```bash
git clone https://github.com/krinesh-gif/HLPL-Expense-Dashboard.git
cd HLPL-Expense-Dashboard
git checkout claude/expense-dashboard-roles-zi14wl
npm install
```

Create a `.env` file in the project root:

```bash
DATABASE_URL="<pooled string from step 1a>"
DIRECT_URL="<direct string from step 1b>"
AUTH_SECRET="<run: openssl rand -base64 32>"
SEED_PASSWORD="<pick a strong temporary password>"
```

Generate the secret with:

```bash
openssl rand -base64 32
```

Then build the schema and load the category master and users:

```bash
npx prisma migrate deploy
npm run seed
```

That creates 25 expense categories and three logins:
`krinesh@araviorganic.com`, `wh@araviorganic.com`, `ho@araviorganic.com` — all with the
password you set in `SEED_PASSWORD`.

### Load your historical data

Copy the three workbooks into `data/` with these exact names:

```
data/founder.xlsx   (HLPL_Cash_Expense_Advanced_FY2627)
data/wh.xlsx        (WH-Expense Sheet FY2627)
data/ho.xlsx        (HO-Expense Sheet FY2627)
```

Then:

```bash
npm run import
```

It loads 692 expenses and 92 cash transactions. It is safe to re-run — it clears
previously imported rows and reloads them, and never touches entries made in the app.

Confirm it worked:

```bash
npx prisma studio
```

That opens a browser table view of the database.

---

## 3. Deploy the app on Vercel

1. Go to **https://vercel.com** and sign up with the same GitHub account.
2. **Add New → Project**, then import `HLPL-Expense-Dashboard`.
3. Vercel detects Next.js on its own — leave the build settings alone.
4. Under **Environment Variables**, add three, for **all** environments
   (Production, Preview, Development):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the pooled string from step 1a |
   | `DIRECT_URL` | the direct string from step 1b |
   | `AUTH_SECRET` | the same secret you generated in step 2 |

   Use the *same* `AUTH_SECRET` as your local `.env`. Changing it later signs everyone out.

5. Set **Production Branch**. The code is on `claude/expense-dashboard-roles-zi14wl`,
   not `main`. Either merge that branch into `main` first, or go to
   **Settings → Git → Production Branch** and point it at
   `claude/expense-dashboard-roles-zi14wl`.
6. **Deploy.**

Two to three minutes later you get a URL like `hlpl-expense-dashboard.vercel.app`.
Open it, sign in as `krinesh@araviorganic.com`, and the dashboard should show your
FY26-27 data.

---

## 4. Lock it down before anyone else gets the link

**Change the three passwords.** Everyone currently shares the seeded password. There is
no password-change screen yet, so set them from your Mac:

```bash
npm run set-password -- krinesh@araviorganic.com 'your-password'
npm run set-password -- wh@araviorganic.com     'hardik-password'
npm run set-password -- ho@araviorganic.com     'maulik-password'
```

Wrap the password in single quotes — otherwise your shell will eat characters like `!`.

Give Hardikbhai and Maulikbhai only their own password. Neither can see the other's
expenses or yours — that is enforced on the server, not in the screen.

**Tell them to add it to their home screen.** On Android Chrome: open the URL, menu,
*Add to Home screen*. It then opens like an app, which matters for daily use.

---

## 5. A custom domain (optional)

If you own a domain, **Vercel → Settings → Domains** and add something like
`expense.araviorganic.com`. Vercel shows the CNAME record to add at your registrar,
and issues the HTTPS certificate automatically.

---

## Running costs

| | Free tier | Your usage |
|---|---|---|
| Neon | 0.5 GB storage, 190 compute-hours/month | ~800 rows/year — far inside it |
| Vercel | 100 GB bandwidth, unlimited deploys | 3 users — far inside it |

Neon's free tier suspends the database after five minutes idle. The first request after
that takes two or three seconds to wake it, then it is fast again. If that becomes
annoying, Neon's paid tier (about $19/month) keeps it always on.

---

## When something goes wrong

**Build fails with "Prisma Client could not locate the Query Engine"**
`postinstall: prisma generate` is in `package.json` and handles this. If it still
happens, clear Vercel's build cache: **Settings → General → Clear Build Cache**, redeploy.

**"Can't reach database server"**
`DATABASE_URL` is missing `?sslmode=require`, or you pasted the direct string where the
pooled one belongs. Neon requires SSL.

**"prepared statement s0 already exists"**
The pooled string is missing `&pgbouncer=true&connection_limit=1`.

**`prisma migrate deploy` hangs or times out**
You are running it against the pooled string. It needs `DIRECT_URL` — the host without
`-pooler`.

**Everyone is signed out after a deploy**
`AUTH_SECRET` changed between environments. Set the same value everywhere.

**Login says "Email or password is incorrect" for a user you just seeded**
Check you seeded against the Neon database, not your local one — `echo $DATABASE_URL`
inside the project directory.

---

## Adding a fourth user later

```bash
npm run add-user -- "Ravi Patel" ravi@araviorganic.com WH 'their-password'
```

The role is `FOUNDER`, `WH` or `HO`. It decides both which screens they can reach and
which expenses they can see — a `WH` user is locked to warehouse expenses and cannot be
shown anything else.

To stop someone having access, deactivate rather than delete, so their past entries keep
their author:

```bash
npx prisma studio
```

Open the `User` table and untick `active`. They are signed out on their next request.
