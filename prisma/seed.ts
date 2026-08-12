import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@asbrasil.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "trocar123";

  const existing = await db.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin já existe: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.adminUser.create({
    data: { email, passwordHash, name: "Administrador", role: "ADMIN" },
  });

  console.log(`Admin criado: ${email} / senha: ${password}`);
  console.log("Troque essa senha antes de usar em produção.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
