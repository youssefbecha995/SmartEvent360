import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  const useSsl = dbUrl.includes("sslmode") || dbUrl.includes("neon.tech") || dbUrl.includes("supabase");
  const pool   = new Pool({ connectionString: process.env.DATABASE_URL, ssl: useSsl ? { rejectUnauthorized: false } : undefined });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as ConstructorParameters<typeof PrismaClient>[0]);

  // Fetch services and providers for linking
  const services = await prisma.service.findMany({ select: { id: true, code: true } });
  const serviceByCode = new Map(services.map(s => [s.code, s.id]));

  const providers = await prisma.provider.findMany({ select: { id: true, serviceId: true, name: true } });
  const providersByService = new Map<string, typeof providers>();
  for (const p of providers) {
    const arr = providersByService.get(p.serviceId) || [];
    arr.push(p);
    providersByService.set(p.serviceId, arr);
  }

  const getProvider = (serviceCode: string, index = 0): string | null => {
    const svcId = serviceByCode.get(serviceCode);
    if (!svcId) return null;
    const provs = providersByService.get(svcId);
    if (!provs || provs.length === 0) return null;
    return provs[index % provs.length].id;
  };

  const packs = [
    {
      name: 'Pack Bronze',
      description: 'Une formule simple et économique pour vos événements intimes (≤ 50 invités).',
      imageUrl: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800',
      features: ['Sonorisation basique', 'Micro et enceintes', 'Éclairage de base', 'Installation et réglage'],
      price: 950, duration: 4, maxGuests: 50, badge: null, isPopular: false,
      packServices: [
        { serviceCode: 'sonorisation', providerIndex: 0, quantity: 1, status: 'INCLUS', priceOverride: 400 },
        { serviceCode: 'eclairage', providerIndex: 0, quantity: 1, status: 'INCLUS', priceOverride: 250 },
      ],
    },
    {
      name: 'Pack Silver',
      description: 'Son et éclairage professionnels pour vos événements de taille moyenne.',
      imageUrl: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800',
      features: ['Sonorisation professionnelle', 'Éclairage ambiance', 'Micro pour discours', 'Technicien son sur place'],
      price: 1500, duration: 6, maxGuests: 100, badge: null, isPopular: false,
      packServices: [
        { serviceCode: 'sonorisation', providerIndex: 0, quantity: 1, status: 'INCLUS', priceOverride: 400 },
        { serviceCode: 'eclairage', providerIndex: 0, quantity: 1, status: 'INCLUS', priceOverride: 300 },
        { serviceCode: 'dj', providerIndex: 1, quantity: 1, status: 'INCLUS', priceOverride: 700 },
      ],
    },
    {
      name: 'Pack Gold',
      description: 'La formule la plus demandée : son premium, lumières d\'ambiance et DJ pendant 4 heures.',
      imageUrl: 'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=800',
      features: ['Sonorisation premium', 'Éclairage ambiance LED', 'DJ 4h inclus', 'Micro et animation', 'Coordination de l\'événement', 'Installation complète'],
      price: 3200, duration: 8, maxGuests: 200, badge: '⭐ Populaire', isPopular: true,
      packServices: [
        { serviceCode: 'sonorisation', providerIndex: 0, quantity: 1, status: 'INCLUS', priceOverride: 400 },
        { serviceCode: 'eclairage', providerIndex: 0, quantity: 1, status: 'INCLUS', priceOverride: 500 },
        { serviceCode: 'dj', providerIndex: 0, quantity: 1, status: 'INCLUS', priceOverride: 800 },
        { serviceCode: 'photographie', providerIndex: 0, quantity: 1, status: 'INCLUS', priceOverride: 600 },
        { serviceCode: 'organisation', providerIndex: 0, quantity: 1, status: 'OPTIONNEL', priceOverride: 1500 },
      ],
    },
    {
      name: 'Pack VIP',
      description: 'La prestation haut de gamme : son studio, DJ, scène, photo et coordination pour un événement d\'exception.',
      imageUrl: 'https://images.pexels.com/photos/1045541/pexels-photo-1045541.jpeg?auto=compress&cs=tinysrgb&w=800',
      features: ['Son studio haute fidélité', 'DJ 6h + scène', 'Éclairage professionnel', 'Photographe & vidéaste', 'Décoration', 'Coordination événement', 'Techniciens dédiés'],
      price: 5500, duration: 12, maxGuests: 300, badge: '👑 Premium', isPopular: false,
      packServices: [
        { serviceCode: 'sonorisation', providerIndex: 0, quantity: 1, status: 'INCLUS', priceOverride: 400 },
        { serviceCode: 'eclairage', providerIndex: 0, quantity: 1, status: 'INCLUS', priceOverride: 500 },
        { serviceCode: 'dj', providerIndex: 0, quantity: 1, status: 'INCLUS', priceOverride: 800 },
        { serviceCode: 'photographie', providerIndex: 1, quantity: 1, status: 'INCLUS', priceOverride: 900 },
        { serviceCode: 'video', providerIndex: 0, quantity: 1, status: 'INCLUS', priceOverride: 800 },
        { serviceCode: 'decoration', providerIndex: 1, quantity: 1, status: 'INCLUS', priceOverride: 1200 },
        { serviceCode: 'organisation', providerIndex: 0, quantity: 1, status: 'INCLUS', priceOverride: 1500 },
        { serviceCode: 'beaute', providerIndex: 0, quantity: 1, status: 'OPTIONNEL', priceOverride: 350 },
        { serviceCode: 'fleurs', providerIndex: 0, quantity: 1, status: 'OPTIONNEL', priceOverride: 250 },
      ],
    },
  ];

  for (const p of packs) {
    const existing = await prisma.pack.findFirst({ where: { name: p.name } });
    const { packServices, ...packData } = p;

    let packId: string;
    if (existing) {
      await prisma.pack.update({ where: { id: existing.id }, data: packData });
      packId = existing.id;
      console.log('✅ Updated:', p.name);
    } else {
      const created = await prisma.pack.create({ data: packData });
      packId = created.id;
      console.log('✅ Created:', p.name);
    }

    // Clear existing pack services and recreate
    await prisma.packService.deleteMany({ where: { packId } });

    for (let i = 0; i < packServices.length; i++) {
      const ps = packServices[i];
      const serviceId = serviceByCode.get(ps.serviceCode);
      if (!serviceId) {
        console.log(`  ⚠️  Service "${ps.serviceCode}" introuvable — skip`);
        continue;
      }
      const providerId = getProvider(ps.serviceCode, ps.providerIndex ?? 0);
      await prisma.packService.create({
        data: {
          packId,
          serviceId,
          providerId: providerId ?? null,
          quantity: ps.quantity || 1,
          status: (ps.status || 'INCLUS') as any,
          priceOverride: ps.priceOverride ?? null,
          displayOrder: i,
        },
      });
      const provName = providerId ? providers.find(pr => pr.id === providerId)?.name : 'aucun';
      console.log(`  → ${ps.serviceCode} avec ${provName}`);
    }
  }

  console.log('\n✅ Packs mis à jour avec services et prestataires');
  await prisma.$disconnect();
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
