"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@prisma/client");
async function main() {
    const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const prisma = new client_1.PrismaClient({ adapter: new adapter_pg_1.PrismaPg(pool) });
    // Récupère l'admin
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!admin)
        throw new Error("Admin introuvable — exécute seed-admin.ts d'abord");
    // Upsert catégories
    const [music, corp, culture] = await Promise.all([
        prisma.category.upsert({ where: { slug: "musique" }, update: {}, create: { name: "Musique", slug: "musique", color: "#6366f1" } }),
        prisma.category.upsert({ where: { slug: "corporate" }, update: {}, create: { name: "Corporate", slug: "corporate", color: "#0ea5e9" } }),
        prisma.category.upsert({ where: { slug: "culture" }, update: {}, create: { name: "Culture", slug: "culture", color: "#f59e0b" } }),
    ]);
    const events = [
        {
            title: "Festival Jazz de Tunis 2026",
            description: "Trois jours de jazz avec des artistes tunisiens et internationaux au coeur de la médina.",
            location: "Amphithéâtre de Carthage, Tunis",
            date: new Date("2026-09-15T20:00:00"),
            imageUrl: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800",
            capacity: 500,
            price: 45,
            isPublished: true,
            organizerId: admin.id,
            categoryId: music.id,
        },
        {
            title: "Conférence Tech & Innovation 2026",
            description: "Rencontrez les leaders de la tech tunisienne et découvrez les dernières innovations numériques.",
            location: "Lac des Palmiers Convention Center, Tunis",
            date: new Date("2026-10-05T09:00:00"),
            imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
            capacity: 300,
            price: 120,
            isPublished: true,
            organizerId: admin.id,
            categoryId: corp.id,
        },
        {
            title: "Journées du Cinéma Africain",
            description: "Projection de films et rencontres avec des réalisateurs africains émergents.",
            location: "Cinéma Le Paris, Tunis",
            date: new Date("2026-11-20T18:30:00"),
            imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800",
            capacity: 150,
            price: 0,
            isPublished: true,
            organizerId: admin.id,
            categoryId: culture.id,
        },
    ];
    for (const ev of events) {
        const created = await prisma.event.upsert({
            where: { id: "seed-placeholder" }, // force create
            update: {},
            create: ev,
        }).catch(() => prisma.event.create({ data: ev }));
        console.log("✅", created.title);
    }
    await prisma.$disconnect();
    await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
