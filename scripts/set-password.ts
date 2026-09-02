/**
 * Change a user's password.
 *   npm run set-password -- krinesh@araviorganic.com 'NewPassword123'
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: npm run set-password -- <email> <password>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Use at least 8 characters.");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    const all = await prisma.user.findMany({ select: { email: true } });
    console.error(`No user "${email}". Known users: ${all.map((u) => u.email).join(", ")}`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`Password updated for ${user.name} <${user.email}>.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
