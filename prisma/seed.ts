import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CATEGORIES } from "./seed-data";

const prisma = new PrismaClient();

const USERS = [
  { name: "Krinesh Mangukiya", email: "krinesh@araviorganic.com", role: "FOUNDER" as const, costCenter: null },
  { name: "Warehouse Manager", email: "wh@araviorganic.com", role: "WH" as const, costCenter: "WH" as const },
  { name: "Accounts Manager", email: "ho@araviorganic.com", role: "HO" as const, costCenter: "HO" as const },
];

async function main() {
  for (const c of CATEGORIES) {
    const { aliases, ...data } = c;
    const cat = await prisma.category.upsert({
      where: { code: c.code },
      update: { ...data },
      create: { ...data },
    });
    for (const alias of aliases) {
      await prisma.categoryAlias.upsert({
        where: { alias: alias.toLowerCase() },
        update: { categoryId: cat.id },
        create: { alias: alias.toLowerCase(), categoryId: cat.id },
      });
    }
  }
  console.log(`categories: ${CATEGORIES.length}`);

  const pw = process.env.SEED_PASSWORD ?? "Change@123";
  const passwordHash = await bcrypt.hash(pw, 10);
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, costCenter: u.costCenter },
      create: { ...u, passwordHash },
    });
  }
  console.log(`users: ${USERS.length} (password: ${pw})`);
}

main().finally(() => prisma.$disconnect());
