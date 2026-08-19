import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  const useSsl = dbUrl.includes("sslmode") || dbUrl.includes("neon.tech") || dbUrl.includes("supabase");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: useSsl ? { rejectUnauthorized: false } : undefined });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as ConstructorParameters<typeof PrismaClient>[0]);

  const hash = await bcrypt.hash("client123", 10);
  const u = await prisma.user.upsert({
    where: { email: "client@smartevent360.com" },
    update: { password: hash },
    create: { email: "client@smartevent360.com", password: hash, name: "Client Demo", role: "USER" },
  });
  console.log("✅", u.email, u.role);

  await prisma.$disconnect();
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
