import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  const useSsl = dbUrl.includes("sslmode") || dbUrl.includes("neon.tech") || dbUrl.includes("supabase");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: useSsl ? { rejectUnauthorized: false } : undefined });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as ConstructorParameters<typeof PrismaClient>[0]);

  // ── Service Types ──────────────────────────────────────────────
  const typeDefinitions = [
    { name: "Animation musicale", slug: "animation-musicale", icon: "🎵", displayOrder: 1 },
    { name: "DJ", slug: "dj", icon: "🎧", displayOrder: 2 },
    { name: "Photographie", slug: "photographie", icon: "📸", displayOrder: 3 },
    { name: "Vidéo", slug: "video", icon: "🎥", displayOrder: 4 },
    { name: "Traiteur", slug: "traiteur", icon: "🍽️", displayOrder: 5 },
    { name: "Décoration", slug: "decoration", icon: "🌸", displayOrder: 6 },
    { name: "Salle", slug: "salle", icon: "🏛️", displayOrder: 7 },
    { name: "Éclairage", slug: "eclairage", icon: "💡", displayOrder: 8 },
    { name: "Sonorisation", slug: "sonorisation", icon: "🔊", displayOrder: 9 },
    { name: "Transport", slug: "transport", icon: "🚗", displayOrder: 10 },
    { name: "Service", slug: "service", icon: "👨‍🍳", displayOrder: 11 },
    { name: "Drone", slug: "drone", icon: "🚁", displayOrder: 12 },
    { name: "Scène", slug: "scene", icon: "🎪", displayOrder: 13 },
    { name: "Organisation", slug: "organisation", icon: "📋", displayOrder: 14 },
    { name: "Beauté", slug: "beaute", icon: "💄", displayOrder: 15 },
    { name: "Fleurs", slug: "fleurs", icon: "💐", displayOrder: 16 },
    { name: "Autre", slug: "autre", icon: "✨", displayOrder: 99 },
  ];

  const typeCount = await prisma.serviceType.count();
  if (typeCount === 0) {
    for (const t of typeDefinitions) {
      await prisma.serviceType.create({ data: t });
    }
    console.log(`✅ ${typeDefinitions.length} types de services créés`);
  } else {
    console.log(`⏭️  ${typeCount} types déjà présents — skip`);
  }

  // Fetch created types
  const types = await prisma.serviceType.findMany();
  const typeMap = new Map(types.map(t => [t.slug, t.id]));

  // ── Services ───────────────────────────────────────────────────
  const serviceCount = await prisma.service.count();
  if (serviceCount === 0) {
    const servicesData = [
      {
        name: "Photographie événementielle",
        code: "photographie",
        shortDescription: "Capturez les moments importants de votre événement.",
        description: "Service professionnel de photographie pour mariages, fiançailles, anniversaires et événements professionnels. Reportage complet, retouches et galerie en ligne.",
        icon: "📸",
        basePrice: 500, priceMin: 400, priceMax: 1500, priceType: "A_PARTIR_DE",
        typeSlug: "photographie", featured: true, displayOrder: 1,
        parameters: [
          { name: "Nombre de photographes", type: "NUMBER", required: true, displayOrder: 1 },
          { name: "Durée", type: "DURATION", required: true, displayOrder: 2 },
          { name: "Séance photo", type: "BOOLEAN", required: false, displayOrder: 3 },
          { name: "Album", type: "BOOLEAN", required: false, displayOrder: 4 },
          { name: "Nombre de pages", type: "NUMBER", required: false, displayOrder: 5, group: "Album" },
          { name: "Photos numériques", type: "BOOLEAN", required: false, displayOrder: 6 },
        ],
        resources: [
          { name: "Studio Fadhel", description: "Photographe spécialisé mariages", location: "Sfax", capacity: 3 },
          { name: "Studio Vision", description: "Photographie événementielle premium", location: "Tunis", capacity: 5 },
          { name: "Studio Ahmed", description: "Reportage photo et vidéo", location: "Sousse", capacity: 2 },
        ],
      },
      {
        name: "DJ & Animation",
        code: "dj",
        shortDescription: "DJ professionnel, sonorisation et jeux de lumière.",
        description: "DJ professionnel avec sonorisation haut de gamme et jeux de lumière. Ambiance garantie pour votre événement.",
        icon: "🎧",
        basePrice: 800, priceMin: 600, priceMax: 2000, priceType: "A_PARTIR_DE",
        typeSlug: "dj", featured: true, displayOrder: 2,
        parameters: [
          { name: "Durée", type: "DURATION", required: true, displayOrder: 1 },
          { name: "Sonorisation incluse", type: "BOOLEAN", required: false, displayOrder: 2 },
          { name: "Éclairage", type: "BOOLEAN", required: false, displayOrder: 3 },
          { name: "Écran LED", type: "BOOLEAN", required: false, displayOrder: 4 },
          { name: "Machine à fumée", type: "BOOLEAN", required: false, displayOrder: 5 },
        ],
        resources: [
          { name: "DJ Ahmed", description: "DJ professionnel 15 ans d'expérience", location: "Sfax", capacity: 1 },
          { name: "DJ Yassine", description: "Spécialiste mariages et soirées", location: "Tunis", capacity: 1 },
        ],
      },
      {
        name: "Traiteur premium",
        code: "traiteur",
        shortDescription: "Buffets, plats chauds et cocktails dînatoires.",
        description: "Service de traiteur haut de gamme pour vos événements. Buffets, plats chauds, cocktails dînatoires préparés par nos chefs.",
        icon: "🍽️",
        basePrice: 35, priceMin: 25, priceMax: 80, priceType: "PAR_PERSONNE",
        typeSlug: "traiteur", featured: true, displayOrder: 3,
        parameters: [
          { name: "Nombre de personnes", type: "NUMBER", required: true, displayOrder: 1 },
          { name: "Nombre d'entrées", type: "NUMBER", required: false, displayOrder: 2 },
          { name: "Nombre de plats", type: "NUMBER", required: false, displayOrder: 3 },
          { name: "Nombre de serveurs", type: "NUMBER", required: false, displayOrder: 4 },
          { name: "Cocktail", type: "BOOLEAN", required: false, displayOrder: 5 },
          { name: "Gâteau", type: "BOOLEAN", required: false, displayOrder: 6 },
          { name: "Boissons", type: "BOOLEAN", required: false, displayOrder: 7 },
        ],
        resources: [
          { name: "Sallemi Events", description: "Traiteur premium événementiel", location: "Sfax", capacity: 500 },
          { name: "Chef Amine", description: "Cuisine raffinée et gastronomique", location: "Tunis", capacity: 300 },
        ],
      },
      {
        name: "Décoration événementielle",
        code: "decoration",
        shortDescription: "Scénographie complète pour votre événement.",
        description: "Décoration et scénographie complètes : thème, fleurs, éclairage LED, nappage personnalisé. Créations sur mesure.",
        icon: "🌸",
        basePrice: 800, priceMin: 500, priceMax: 3000, priceType: "A_PARTIR_DE",
        typeSlug: "decoration", featured: true, displayOrder: 4,
        parameters: [
          { name: "Décoration salle", type: "BOOLEAN", required: false, displayOrder: 1 },
          { name: "Table des mariés", type: "BOOLEAN", required: false, displayOrder: 2 },
          { name: "Tables invités", type: "BOOLEAN", required: false, displayOrder: 3 },
          { name: "Piste de danse", type: "BOOLEAN", required: false, displayOrder: 4 },
          { name: "Mur photo", type: "BOOLEAN", required: false, displayOrder: 5 },
          { name: "Éclairage", type: "BOOLEAN", required: false, displayOrder: 6 },
        ],
        resources: [
          { name: "Studio Léa Déco", description: "Scénographie et décoration florale", location: "Sfax", capacity: 1 },
        ],
      },
      {
        name: "Vidéaste professionnel",
        code: "video",
        shortDescription: "Captation et montage vidéo professionnel.",
        description: "Service de captation vidéo multi-caméras, montage professionnel et livraison en haute définition.",
        icon: "🎥",
        basePrice: 700, priceMin: 500, priceMax: 2000, priceType: "A_PARTIR_DE",
        typeSlug: "video", displayOrder: 5,
        parameters: [
          { name: "Durée de captation", type: "DURATION", required: true, displayOrder: 1 },
          { name: "Nombre de caméras", type: "NUMBER", required: false, displayOrder: 2 },
          { name: "Drone aérien", type: "BOOLEAN", required: false, displayOrder: 3 },
          { name: "Montage highlights", type: "BOOLEAN", required: false, displayOrder: 4 },
          { name: "Film long métrage", type: "BOOLEAN", required: false, displayOrder: 5 },
        ],
        resources: [
          { name: "Studio Vision", description: "Captation vidéo HD et 4K", location: "Tunis", capacity: 4 },
        ],
      },
      {
        name: "Salle des fêtes",
        code: "salle",
        shortDescription: "Salles climatisées et équipées pour vos événements.",
        description: "Location de salles des fêtes entièrement équipées : tables, chaises, sonorisation, éclairage. Capacité de 50 à 500 personnes.",
        icon: "🏛️",
        basePrice: 2000, priceMin: 1500, priceMax: 5000, priceType: "A_PARTIR_DE",
        typeSlug: "salle", displayOrder: 6,
        parameters: [
          { name: "Capacité", type: "NUMBER", required: true, displayOrder: 1 },
          { name: "Climatisation", type: "BOOLEAN", required: false, displayOrder: 2 },
          { name: "Parking", type: "BOOLEAN", required: false, displayOrder: 3 },
          { name: "Durée maximale", type: "DURATION", required: false, displayOrder: 4 },
        ],
        resources: [
          { name: "Sfax Palace", description: "Salle de réception premium", location: "Sfax", capacity: 300 },
          { name: "Espace Royal", description: "Salle des fêtes moderne", location: "Sfax", capacity: 250 },
          { name: "Salle El Bahia", description: "Grande salle climatisée", location: "Tunis", capacity: 500 },
        ],
      },
    ];

    for (const svc of servicesData) {
      const typeId = typeMap.get(svc.typeSlug) || null;
      const { parameters, resources, typeSlug, ...svcData } = svc;
      const service = await prisma.service.create({
        data: {
          name: svcData.name,
          code: svcData.code,
          shortDescription: svcData.shortDescription,
          description: svcData.description,
          icon: svcData.icon,
          basePrice: svcData.basePrice,
          priceMin: svcData.priceMin,
          priceMax: svcData.priceMax,
          priceType: svcData.priceType as any,
          typeId,
          featured: svcData.featured,
          active: true,
          visibleOnStore: true,
          visibleForClients: true,
        },
      });

      for (const p of parameters) {
        await prisma.serviceParameter.create({
          data: {
            name: p.name,
            type: p.type as any,
            required: p.required,
            displayOrder: p.displayOrder,
            group: (p as any).group || null,
            description: (p as any).description || null,
            serviceId: service.id,
          },
        });
      }

      for (const r of resources) {
        await prisma.serviceResource.create({
          data: {
            name: r.name,
            description: r.description || null,
            location: r.location || null,
            city: (r as any).city || null,
            capacity: (r as any).capacity ?? null,
            serviceId: service.id,
            availability: "DISPONIBLE" as any,
            active: true,
          },
        });
      }
    }
    console.log(`✅ ${servicesData.length} services avec paramètres et ressources créés`);
  } else {
    console.log(`⏭️  ${serviceCount} services déjà présents — skip`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
