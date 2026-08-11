import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

  const email = "admin@smartevent360.com";
  const password = await bcrypt.hash("admin123", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password, role: "ADMIN", name: "Admin SmartEvent360" },
    create: { email, password, name: "Admin SmartEvent360", role: "ADMIN" },
  });

  console.log("✅ Admin créé/mis à jour :", user.email, "| role:", user.role);
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
