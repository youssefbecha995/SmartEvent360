import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient; pgPool?: Pool };

/**
 * Pool `pg` partagé. Exporté car certaines tables métier (`services`,
 * `service_types`, `service_parameters`, `providers`) n'ont pas de modèle
 * Prisma : elles sont lues en SQL brut, via ce même pool.
 */
export const pgPool =
  globalForPrisma.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
  });

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg(pgPool);
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pgPool;
}