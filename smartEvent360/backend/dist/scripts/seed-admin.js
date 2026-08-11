"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function main() {
    const pool = new pg_1.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
    const adapter = new adapter_pg_1.PrismaPg(pool);
    const prisma = new client_1.PrismaClient({ adapter });
    const email = "admin@smartevent360.com";
    const password = await bcryptjs_1.default.hash("admin123", 10);
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
