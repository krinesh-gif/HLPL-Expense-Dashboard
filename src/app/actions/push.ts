"use server";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export type PushState = { ok?: string; error?: string };

function configured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function pushPublicKey(): Promise<string | null> {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export async function subscribe(sub: {
  endpoint: string; keys: { p256dh: string; auth: string };
}): Promise<PushState> {
  const s = await requireUser();
  if (!configured()) return { error: "Reminders are not set up on the server yet." };
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { error: "That browser did not return a usable subscription." };
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth, userId: s.uid, failures: 0 },
    create: { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userId: s.uid },
  });
  return { ok: "Reminders are on for this phone." };
}

export async function unsubscribe(endpoint: string): Promise<PushState> {
  await requireUser();
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return { ok: "Reminders are off for this phone." };
}

/** Sends one notification and drops the subscription if the browser has retired it. */
export async function sendTo(
  sub: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string; tag?: string },
) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:krinesh@araviorganic.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    await prisma.pushSubscription.update({ where: { id: sub.id }, data: { failures: 0 } });
    return true;
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    // 404/410 mean the browser has thrown the subscription away for good.
    if (status === 404 || status === 410) {
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    } else {
      await prisma.pushSubscription.update({
        where: { id: sub.id }, data: { failures: { increment: 1 } },
      }).catch(() => {});
    }
    return false;
  }
}

/** A test notification, so the founder can confirm a phone is really set up. */
export async function sendTestPush(): Promise<PushState> {
  const s = await requireUser();
  if (!configured()) return { error: "Reminders are not set up on the server yet." };

  const subs = await prisma.pushSubscription.findMany({ where: { userId: s.uid } });
  if (subs.length === 0) return { error: "This phone is not signed up for reminders." };

  let sent = 0;
  for (const sub of subs) {
    if (await sendTo(sub, {
      title: "Hivefy Expenses",
      body: "Reminders are working on this phone.",
      url: "/entry",
      tag: "test",
    })) sent++;
  }
  return sent > 0
    ? { ok: `Sent to ${sent} ${sent === 1 ? "device" : "devices"}.` }
    : { error: "Could not reach this device. Try turning reminders off and on again." };
}
