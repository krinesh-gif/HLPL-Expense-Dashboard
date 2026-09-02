/**
 * Add a user.
 *   npm run add-user -- "Ravi Patel" ravi@araviorganic.com WH 'Password123'
 *
 * Role decides which screens they can reach; it also fixes which expenses they see.
 * WH and HO users are locked to their own cost centre. FOUNDER sees everything.
 */
import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const ROLES: Role[] = ["FOUNDER", "WH", "HO"];

async function main() {
  const [name, email, role, password] = process.argv.slice(2);
  if (!name || !email || !role || !password) {
    console.error('Usage: npm run add-user -- "<name>" <email> <FOUNDER|WH|HO> <password>');
    process.exit(1);
  }
  if (!ROLES.includes(role as Role)) {
    console.error(`Role must be one of: ${ROLES.join(", ")}`);
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Use at least 8 characters.");
    process.exit(1);
  }

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      role: role as Role,
      costCenter: role === "FOUNDER" ? null : (role as "WH" | "HO"),
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  console.log(`Created ${user.name} <${user.email}> as ${user.role}.`);
}

main()
  .catch((e) => {
    console.error(e.code === "P2002" ? "A user with that email already exists." : e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
