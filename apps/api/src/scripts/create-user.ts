import { prisma } from "@watchtower/database";
import { hashPassword } from "../modules/auth/password.js";

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: tsx src/scripts/create-user.ts <email> <password>");
  process.exit(1);
}

const passwordHash = await hashPassword(password);
const user = await prisma.user.upsert({
  where: { email },
  update: { passwordHash },
  create: { email, passwordHash },
});

console.log(`User ready: ${user.email} (${user.id})`);
await prisma.$disconnect();
