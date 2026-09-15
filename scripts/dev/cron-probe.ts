import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Push delivery itself needs a real device, but the cron's own behaviour can be
 * checked: it must compose the right message, survive an unreachable endpoint,
 * and count a failure rather than throwing.
 */
async function main() {
  const wh = await prisma.user.findUniqueOrThrow({ where: { email: "wh@araviorganic.com" } });
  await prisma.pushSubscription.deleteMany({ where: { endpoint: { startsWith: "https://example.invalid" } } });

  const sub = await prisma.pushSubscription.create({
    data: {
      endpoint: "https://example.invalid/push/fake-endpoint-1",
      p256dh: "BJ3ZQ1hVZ2VubGVzc19rZXlfZm9yX3Rlc3Rpbmdfb25seV9ub3RfcmVhbF8xMjM0",
      auth: "c2hvcnRhdXRoa2V5MTIz",
      userId: wh.id,
    },
  });
  console.log("seeded a fake device for the warehouse user");

  const res = await fetch("http://localhost:3111/api/cron/reminders", {
    headers: { authorization: "Bearer dev-cron-secret" },
  });
  console.log("cron status:", res.status, "body:", await res.text());

  const after = await prisma.pushSubscription.findUnique({ where: { id: sub.id } });
  console.log("subscription still present:", !!after, "| failures recorded:", after?.failures ?? "gone");

  await prisma.pushSubscription.deleteMany({ where: { endpoint: { startsWith: "https://example.invalid" } } });
  console.log("cleaned up");
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); }).finally(() => prisma.$disconnect());
