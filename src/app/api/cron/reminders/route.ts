import { prisma } from "@/lib/prisma";
import { sendTo } from "@/app/actions/push";
import { floatBalance } from "@/lib/queries";
import { rs } from "@/lib/money";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily nudge, run by Vercel Cron. The message names what the team actually has in
 * hand and what they have recorded today, because a bare "don't forget" gets
 * ignored after a week — a figure that looks wrong does not.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return Response.json({ skipped: "VAPID keys not configured" });
  }

  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  const subs = await prisma.pushSubscription.findMany({
    include: { user: { select: { id: true, name: true, role: true, costCenter: true, active: true } } },
  });

  let sent = 0;
  let dropped = 0;

  for (const sub of subs) {
    if (!sub.user.active) { dropped++; continue; }

    const scope = sub.user.costCenter
      ? { costCenter: sub.user.costCenter }
      : { enteredById: sub.user.id };

    const todayAgg = await prisma.expense.aggregate({
      where: { ...scope, date: { gte: start }, voidedAt: null },
      _sum: { amount: true }, _count: { _all: true },
    });

    let body: string;
    if (sub.user.costCenter) {
      const { balance } = await floatBalance(sub.user.costCenter);
      body = todayAgg._count._all === 0
        ? `Nothing recorded today. You are holding ${rs(balance)} — anything spent?`
        : `${todayAgg._count._all} entries today totalling ${rs(todayAgg._sum.amount)}. ${rs(balance)} left in hand.`;
    } else {
      body = todayAgg._count._all === 0
        ? "Nothing recorded today. Anything to add before the day closes?"
        : `${todayAgg._count._all} entries today totalling ${rs(todayAgg._sum.amount)}.`;
    }

    if (await sendTo(sub, { title: "Today's expenses", body, url: "/entry", tag: "daily" })) sent++;
    else dropped++;
  }

  return Response.json({ sent, dropped, devices: subs.length });
}
