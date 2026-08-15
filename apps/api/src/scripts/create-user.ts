import { prisma } from "@watchtower/database";
import { hashPassword } from "../modules/auth/password.js";

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: tsx src/scripts/create-user.ts <email> <password>");
  process.exit(1);
}

const normalizedEmail = email.toLowerCase().trim();
const passwordHash = await hashPassword(password);
const user = await prisma.user.upsert({
  where: { email: normalizedEmail },
  update: { passwordHash },
  create: { email: normalizedEmail, passwordHash },
});

const workspaceCount = await prisma.workspace.count();
if (workspaceCount === 0) {
  await prisma.user.update({ where: { id: user.id }, data: { isPlatformOwner: true } });
  await prisma.workspace.create({
    data: {
      name: "Default Project",
      createdByUserId: user.id,
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });
}

console.log(`User ready: ${user.email} (${user.id})`);
await prisma.$disconnect();
