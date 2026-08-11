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
    const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const prisma = new client_1.PrismaClient({ adapter: new adapter_pg_1.PrismaPg(pool) });
    const hash = await bcryptjs_1.default.hash("client123", 10);
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
