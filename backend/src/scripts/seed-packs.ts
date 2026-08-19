import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  const useSsl = dbUrl.includes("sslmode") || dbUrl.includes("neon.tech") || dbUrl.includes("supabase");
  const pool   = new Pool({ connectionString: process.env.DATABASE_URL, ssl: useSsl ? { rejectUnauthorized: false } : undefined });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as ConstructorParameters<typeof PrismaClient>[0]);

  const packs = [
    {
      name: 'Pack Bronze',
      description: 'Une formule simple et économique pour vos événements intimes (≤ 50 invités).',
      imageUrl: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800',
      features: ['Sonorisation basique', 'Micro et enceintes', 'Éclairage de base', 'Installation et réglage'],
      price: 950, duration: 4, maxGuests: 50, badge: null, isPopular: false,
    },
    {
      name: 'Pack Silver',
      description: 'Son et éclairage professionnels pour vos événements de taille moyenne.',
      imageUrl: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800',
      features: ['Sonorisation professionnelle', 'Éclairage ambiance', 'Micro pour discours', 'Technicien son sur place'],
      price: 1500, duration: 6, maxGuests: 100, badge: null, isPopular: false,
    },
    {
      name: 'Pack Gold',
      description: 'La formule la plus demandée : son premium, lumières d\'ambiance et DJ pendant 4 heures.',
      imageUrl: 'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=800',
      features: ['Sonorisation premium', 'Éclairage ambiance LED', 'DJ 4h inclus', 'Micro et animation', 'Coordination de l\'événement', 'Installation complète'],
      price: 3200, duration: 8, maxGuests: 200, badge: '⭐ Populaire', isPopular: true,
    },
    {
      name: 'Pack VIP',
      description: 'La prestation haut de gamme : son studio, DJ, scène, photo et coordination pour un événement d\'exception.',
      imageUrl: 'https://images.pexels.com/photos/1045541/pexels-photo-1045541.jpeg?auto=compress&cs=tinysrgb&w=800',
      features: ['Son studio haute fidélité', 'DJ 6h + scène', 'Éclairage professionnel', 'Photographe & vidéaste', 'Décoration', 'Coordination événement', 'Techniciens dédiés'],
      price: 5500, duration: 12, maxGuests: 300, badge: '👑 Premium', isPopular: false,
    },
  ];

  for (const p of packs) {
    const existing = await prisma.pack.findFirst({ where: { name: p.name } });
    if (existing) {
      await prisma.pack.update({ where: { id: existing.id }, data: p });
      console.log('✅ Updated:', p.name);
    } else {
      await prisma.pack.create({ data: p });
      console.log('✅ Created:', p.name);
    }
  }

  await prisma.$disconnect();
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
