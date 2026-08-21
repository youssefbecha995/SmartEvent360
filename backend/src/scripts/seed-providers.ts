import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  const useSsl = dbUrl.includes("sslmode") || dbUrl.includes("neon.tech") || dbUrl.includes("supabase");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: useSsl ? { rejectUnauthorized: false } : undefined });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as ConstructorParameters<typeof PrismaClient>[0]);

  const providerCount = await prisma.provider.count();
  if (providerCount > 0) {
    console.log(`⏭️  ${providerCount} providers déjà présents — skip`);
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  const services = await prisma.service.findMany();
  const serviceMap = new Map(services.map(s => [s.code, s.id]));

  const providersData = [
    // ── Photographie ──
    {
      serviceCode: "photographie",
      data: {
        name: "Studio Fadhel",
        description: "Photographe spécialisé mariages et événements depuis 12 ans. Reportage complet, retouches pro et galerie en ligne.",
        price: 600, rating: 4.8, reviewCount: 47, city: "Sfax", address: "Avenue Habib Bourguiba",
        phone: "+216 74 123 456", email: "fadhel@studio.tn", website: "https://studio-fadhel.tn",
        composition: [
          { role: "Photographe principal", quantity: 1 },
          { role: "Assistant photographe", quantity: 1 },
        ],
      },
    },
    {
      serviceCode: "photographie",
      data: {
        name: "Studio Vision",
        description: "Photographie événementielle premium. Spécialiste mariages de luxe et galas corporate.",
        price: 900, rating: 4.9, reviewCount: 83, city: "Tunis", address: "Centre Urbain Nord",
        phone: "+216 71 567 890", email: "contact@studio-vision.tn",
        composition: [
          { role: "Photographe principal", quantity: 1 },
          { role: "Second photographe", quantity: 1 },
          { role: "Retoucheur", quantity: 1 },
        ],
      },
    },
    {
      serviceCode: "photographie",
      data: {
        name: "Studio Ahmed",
        description: "Reportage photo et vidéo. Rapport qualité-prix imbattable.",
        price: 400, rating: 4.5, reviewCount: 29, city: "Sousse", address: "Avenue de la République",
        phone: "+216 73 234 567", email: "ahmed@studio.tn",
        composition: [
          { role: "Photographe", quantity: 1 },
        ],
      },
    },

    // ── DJ & Animation ──
    {
      serviceCode: "dj",
      data: {
        name: "DJ Ahmed",
        description: "DJ professionnel avec 15 ans d'expérience. Sonorisation, jeux de lumière et ambiance garantie.",
        price: 800, rating: 4.7, reviewCount: 62, city: "Sfax", address: "Route de l'Aéroport",
        phone: "+216 74 345 678", email: "dj.ahmed@events.tn",
        composition: [
          { role: "DJ", quantity: 1 },
          { role: "Technicien son", quantity: 1 },
          { role: "Éclairagiste", quantity: 1 },
        ],
      },
    },
    {
      serviceCode: "dj",
      data: {
        name: "DJ Yassine",
        description: "Spécialiste mariages et soirées. Playlist personnalisée et sonorisation HD.",
        price: 700, rating: 4.6, reviewCount: 38, city: "Tunis", address: "La Marsa",
        phone: "+216 71 456 789", email: "dj.yassine@events.tn",
        composition: [
          { role: "DJ", quantity: 1 },
          { role: "MC / Animateur", quantity: 1 },
        ],
      },
    },

    // ── Traiteur ──
    {
      serviceCode: "traiteur",
      data: {
        name: "Sallemi Events",
        description: "Traiteur premium événementiel. Buffets, plats chauds, cocktails dînatoires. Service complet de A à Z.",
        price: 45, rating: 4.8, reviewCount: 91, city: "Sfax", address: "Zone Industrielle",
        phone: "+216 74 678 901", email: "contact@sallemi-events.tn",
        composition: [
          { role: "Chef cuisinier", quantity: 1 },
          { role: "Sous-chef", quantity: 2 },
          { role: "Serveur", quantity: 8 },
          { role: "Barman", quantity: 2 },
        ],
      },
    },
    {
      serviceCode: "traiteur",
      data: {
        name: "Chef Amine",
        description: "Cuisine raffinée et gastronomique. Spécialiste buffets de mariage et dîners de gala.",
        price: 55, rating: 4.9, reviewCount: 54, city: "Tunis", address: "Sidi Bou Saïd",
        phone: "+216 71 789 012", email: "amine@gourmet.tn",
        composition: [
          { role: "Chef principal", quantity: 1 },
          { role: "Commis", quantity: 3 },
          { role: "Serveur", quantity: 6 },
        ],
      },
    },

    // ── Décoration ──
    {
      serviceCode: "decoration",
      data: {
        name: "Studio Léa Déco",
        description: "Scénographie et décoration florale. Créations sur mesure pour mariages et événements.",
        price: 900, rating: 4.7, reviewCount: 35, city: "Sfax", address: "Centre Ville",
        phone: "+216 74 890 123", email: "lea@deco-events.tn",
        composition: [
          { role: "Décoratrice", quantity: 1 },
          { role: "Assistant décoratrice", quantity: 2 },
          { role: "Fleuriste", quantity: 1 },
        ],
      },
    },
    {
      serviceCode: "decoration",
      data: {
        name: "Élégance Déco",
        description: "Décoration événementielle haut de gamme. Thèmes personnalisés, éclairage LED, mobilier design.",
        price: 1200, rating: 4.8, reviewCount: 42, city: "Tunis", address: "Les Berges du Lac",
        phone: "+216 71 901 234", email: "contact@elegance-deco.tn",
        composition: [
          { role: "Directeur artistique", quantity: 1 },
          { role: "Décorateur", quantity: 3 },
          { role: "Éclairagiste", quantity: 1 },
        ],
      },
    },

    // ── Vidéo ──
    {
      serviceCode: "video",
      data: {
        name: "Vision Pro Video",
        description: "Captation vidéo multi-caméras, montage professionnel HD/4K. Film et highlights livrés.",
        price: 800, rating: 4.6, reviewCount: 44, city: "Tunis", address: "Ariana",
        phone: "+216 71 012 345", email: "info@visionpro.tn",
        composition: [
          { role: "Vidéaste principal", quantity: 1 },
          { role: "Second caméraman", quantity: 1 },
          { role: "Monteur vidéo", quantity: 1 },
        ],
      },
    },
    {
      serviceCode: "video",
      data: {
        name: "CinéEvent Studio",
        description: "Cinématographe événementiel. Films artistiques, drone aérien et montage cinématique.",
        price: 1100, rating: 4.9, reviewCount: 31, city: "Sousse", address: "Boulevard 14 Janvier",
        phone: "+216 73 123 789", email: "studio@cineevent.tn",
        composition: [
          { role: "Cinématographe", quantity: 1 },
          { role: "Opérateur drone", quantity: 1 },
          { role: "Monteur", quantity: 1 },
        ],
      },
    },

    // ── Salle ──
    {
      serviceCode: "salle",
      data: {
        name: "Sfax Palace",
        description: "Salle de réception premium. 300 couverts, climatisation, parking, sonorisation intégrée.",
        price: 2500, rating: 4.7, reviewCount: 68, city: "Sfax", address: "Route de la Plage",
        phone: "+216 74 234 567", email: "reservation@sfax-palace.tn",
        composition: [
          { role: "Chef de salle", quantity: 1 },
          { role: "Serveur", quantity: 10 },
          { role: "Hôte d'accueil", quantity: 2 },
        ],
      },
    },
    {
      serviceCode: "salle",
      data: {
        name: "Salle El Bahia",
        description: "Grande salle climatisée. Capacité jusqu'à 500 personnes. Événements et mariages.",
        price: 3000, rating: 4.5, reviewCount: 52, city: "Tunis", address: "Ben Arous",
        phone: "+216 71 345 678", email: "contact@elbahia.tn",
        composition: [
          { role: "Responsable événementiel", quantity: 1 },
          { role: "Serveur", quantity: 12 },
        ],
      },
    },

    // ── Éclairage ──
    {
      serviceCode: "eclairage",
      data: {
        name: "Lumi Events",
        description: "Éclairage événementiel pro. Stations LED, washes, trusss et scénographie lumineuse.",
        price: 500, rating: 4.6, reviewCount: 28, city: "Sfax", address: "Zone Industrielle Sakiet Ezzit",
        phone: "+216 74 567 890", email: "contact@lumi-events.tn",
        composition: [
          { role: "Éclairagiste", quantity: 2 },
          { role: "Technicien", quantity: 1 },
        ],
      },
    },

    // ── Sonorisation ──
    {
      serviceCode: "sonorisation",
      data: {
        name: "SoundPro TN",
        description: "Location et installation sonorisation. Matériel JBL, QSC, Allen & Heath.",
        price: 400, rating: 4.5, reviewCount: 33, city: "Tunis", address: "Médina",
        phone: "+216 71 678 901", email: "info@soundpro.tn",
        composition: [
          { role: "Ingénieur son", quantity: 1 },
          { role: "Technicien", quantity: 2 },
        ],
      },
    },

    // ── Transport ──
    {
      serviceCode: "transport",
      data: {
        name: "VIP Transfer Tunisie",
        description: "Location de voitures de luxe avec chauffeur. Transfer aéroport et événements.",
        price: 300, rating: 4.4, reviewCount: 19, city: "Tunis", address: "Aéroport Tunis Carthage",
        phone: "+216 71 789 012", email: "booking@vip-transfer.tn",
        composition: [
          { role: "Chauffeur", quantity: 3 },
        ],
      },
    },

    // ── Organisation ──
    {
      serviceCode: "organisation",
      data: {
        name: "EventPlanner TN",
        description: "Organisation complète d'événements. Planning, coordination, logistique de A à Z.",
        price: 1500, rating: 4.8, reviewCount: 56, city: "Tunis", address: "Centre Urbain Nord",
        phone: "+216 71 890 123", email: "hello@eventplanner.tn",
        composition: [
          { role: "Chef de projet", quantity: 1 },
          { role: "Coordinateur", quantity: 2 },
          { role: "Logisticien", quantity: 1 },
        ],
      },
    },

    // ── Beauté ──
    {
      serviceCode: "beaute",
      data: {
        name: "Beauté Royale",
        description: "Maquillage professionnel, coiffure et soins pour mariées. Produits haut de gamme.",
        price: 350, rating: 4.9, reviewCount: 71, city: "Sfax", address: "Avenue du 18 Janvier",
        phone: "+216 74 901 234", email: "contact@beaute-royale.tn",
        composition: [
          { role: "Maquilleuse", quantity: 1 },
          { role: "Coiffeuse", quantity: 1 },
          { role: "Assistante beauté", quantity: 1 },
        ],
      },
    },

    // ── Fleurs ──
    {
      serviceCode: "fleurs",
      data: {
        name: "Fleurs & Jardins",
        description: "Fleuriste événementiel. Bouquets, centres de table, arches florales, tout type d'arrangement.",
        price: 250, rating: 4.7, reviewCount: 43, city: "Tunis", address: "La Marsa",
        phone: "+216 71 012 345", email: "fleurs@fleurs-jardins.tn",
        composition: [
          { role: "Fleuriste", quantity: 2 },
          { role: "Assistant", quantity: 1 },
        ],
      },
    },
  ];

  let created = 0;
  for (const p of providersData) {
    const serviceId = serviceMap.get(p.serviceCode);
    if (!serviceId) {
      console.log(`⚠️  Service "${p.serviceCode}" introuvable — skip provider "${p.data.name}"`);
      continue;
    }
    const { composition, ...providerData } = p.data;
    const provider = await prisma.provider.create({
      data: {
        ...providerData,
        serviceId,
        active: true,
        isAvailable: true,
      },
    });

    if (composition && composition.length > 0) {
      for (const c of composition) {
        await prisma.providerComposition.create({
          data: {
            providerId: provider.id,
            role: c.role,
            quantity: c.quantity,
          },
        });
      }
    }

    // Bulk-create availability for next 90 days
    const today = new Date();
    const availData: { providerId: string; date: Date; status: string }[] = [];
    for (let i = 1; i <= 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const reserved = Math.random() < 0.15;
      availData.push({ providerId: provider.id, date: d, status: reserved ? "RESERVEE" : "DISPONIBLE" });
    }
    await prisma.providerAvailability.createMany({ data: availData });

    created++;
    console.log(`  ✅ ${provider.name} (${p.serviceCode}) — ${composition?.length || 0} membres`);
  }

  console.log(`\n✅ ${created} prestataires créés avec composition et disponibilité`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
