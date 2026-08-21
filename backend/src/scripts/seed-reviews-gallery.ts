import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  const useSsl = dbUrl.includes("sslmode") || dbUrl.includes("neon.tech") || dbUrl.includes("supabase");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: useSsl ? { rejectUnauthorized: false } : undefined });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as ConstructorParameters<typeof PrismaClient>[0]);

  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const clientUser = await prisma.user.findFirst({ where: { role: "USER" } });
  if (!adminUser || !clientUser) {
    console.log("❌ Need both ADMIN and CLIENT users to seed reviews");
    await prisma.$disconnect(); await pool.end(); return;
  }

  const userIds = [adminUser.id, clientUser.id];

  const existingReviewCount = await prisma.providerReview.count();
  if (existingReviewCount > 0) {
    console.log(`⏭️  ${existingReviewCount} reviews already present — skip`);
    await prisma.$disconnect(); await pool.end(); return;
  }

  const providers = await prisma.provider.findMany({ orderBy: { createdAt: "asc" } });
  if (providers.length === 0) {
    console.log("❌ No providers found — run seed-providers first");
    await prisma.$disconnect(); await pool.end(); return;
  }

  const reviewTexts = [
    { rating: 5, comment: "Service exceptionnel, je recommande vivement ! Le professionnalisme et la qualité sont au rendez-vous." },
    { rating: 5, comment: "Très satisfait du résultat. L'équipe était ponctuelle, professionnelle et à l'écoute." },
    { rating: 4, comment: "Bon service dans l'ensemble. Quelques petits détails à améliorer mais rien de grave." },
    { rating: 4, comment: "Rapport qualité-prix correct. Le travail a été fait dans les temps." },
    { rating: 5, comment: "Une équipe au top ! Tout était parfait du début à la fin. Merci encore." },
    { rating: 4, comment: "Très bon prestataire, réactif et à l'écoute. Le résultat final était très beau." },
    { rating: 5, comment: "Impressionnant ! La qualité de prestation est incomparable. On est au-delà de nos attentes." },
    { rating: 3, comment: "Correct mais sans plus. Le service était bien mais l'communication aurait pu être meilleure." },
    { rating: 5, comment: "Créatif, ponctuel et professionnel. Je recommande à 100% pour tout événement." },
    { rating: 4, comment: "Bon choix pour notre mariage. Le résultat était conforme à nos attentes." },
    { rating: 5, comment: "Magnifique travail ! Les invités étaient tous émerveillés. Un vrai talent." },
    { rating: 4, comment: "Service fiable et de qualité. Prix un peu élevé mais le résultat est au rendez-vous." },
    { rating: 5, comment: "Fantastique ! Le meilleur prestataire que nous ayons eu. Tout était parfait." },
    { rating: 5, comment: "Extraordinaire ! Une prestation qui a dépassé toutes nos attentes. Bravo !" },
    { rating: 3, comment: "Bon travail mais le délai a été un peu long. Résultat final correct." },
  ];

  const reviewsData: any[] = [];
  let textIdx = 0;
  for (const provider of providers.slice(0, 10)) {
    const numReviews = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numReviews; i++) {
      const userId = userIds[i % userIds.length];
      const rt = reviewTexts[textIdx % reviewTexts.length];
      reviewsData.push({
        providerId: provider.id,
        userId,
        rating: rt.rating,
        comment: rt.comment,
      });
      textIdx++;
    }
  }

  let created = 0;
  for (const r of reviewsData) {
    try {
      await prisma.providerReview.create({ data: r });
      created++;
    } catch (e: any) {
      if (e.code === "P2002") {
      } else {
        console.warn(`Review skipped for provider ${r.providerId}:`, e.message);
      }
    }
  }
  console.log(`✅ Created ${created} provider reviews`);

  const existingGalleryCount = await prisma.providerGallery.count();
  if (existingGalleryCount > 0) {
    console.log(`⏭️  ${existingGalleryCount} gallery items already present — skip`);
    await prisma.$disconnect(); await pool.end(); return;
  }

  const galleryImages = [
    { url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800", caption: "Mariage de rêve" },
    { url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800", caption: "Décoration florale" },
    { url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800", caption: "Salle de réception" },
    { url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800", caption: "Ambiance DJ" },
    { url: "https://images.unsplash.com/photo-1555244162-803834f70033?w=800", caption: "Buffet gastronomique" },
    { url: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800", caption: "Table de réception" },
    { url: "https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=800", caption: "Fleurs et arrangements" },
    { url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800", caption: "Soirée illuminée" },
    { url: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800", caption: "Fête mémorable" },
    { url: "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800", caption: "Cérémonie élégante" },
  ];

  let galleryCreated = 0;
  let imgIdx = 0;
  for (const provider of providers.slice(0, 8)) {
    const numPhotos = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numPhotos; i++) {
      const img = galleryImages[(imgIdx + i) % galleryImages.length];
      try {
        await prisma.providerGallery.create({
          data: {
            providerId: provider.id,
            imageUrl: img.url,
            caption: `${img.caption} — ${provider.name}`,
            displayOrder: i,
          },
        });
        galleryCreated++;
      } catch (e: any) {
        console.warn(`Gallery skipped:`, e.message);
      }
    }
    imgIdx += numPhotos;
  }
  console.log(`✅ Created ${galleryCreated} gallery items`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
