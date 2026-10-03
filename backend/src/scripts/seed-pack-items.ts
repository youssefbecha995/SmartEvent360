import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as ConstructorParameters<typeof PrismaClient>[0]);

interface SeedItem {
  category: "lieu" | "service" | "equipement" | "personnel" | "instrument";
  name: string;
  description?: string;
  defaultValue: string;
  customizable: boolean;
  unitPrice: number;
  order: number;
}

/**
 * Tarifs indicatifs par pack, alignés sur le catalogue réel et sur les coûts de
 * référence de `src/lib/packGenerator.ts` (traiteur ≈ 26 DT/invité).
 * Le prix du pack reste la référence : ces lignes servent à la fois à
 * l'affichage du détail et à la tarification des options.
 */
const packItemsData: Record<string, SeedItem[]> = {
  "Pack Anniversary Glam": [
    { category: "lieu", name: "Salle", defaultValue: "Salle Prestige - formule cocktail", customizable: false, unitPrice: 900, order: 0 },
    { category: "service", name: "Traiteur & menu", defaultValue: "Menu 3 services - 80 invités", customizable: false, unitPrice: 2080, order: 1 },
    { category: "service", name: "Gâteau & Douceurs", defaultValue: "Gâteau 4 étages + mignardises", customizable: true, unitPrice: 350, order: 2 },
    { category: "equipement", name: "Sonorisation", defaultValue: "JBL PRX basique (2 enceintes)", customizable: true, unitPrice: 400, order: 3 },
    { category: "equipement", name: "Éclairage", defaultValue: "LED RGB d'ambiance", customizable: true, unitPrice: 350, order: 4 },
    { category: "personnel", name: "DJ", defaultValue: "DJ professionnel (4h)", customizable: true, unitPrice: 500, order: 5 },
  ],

  "Pack Fiancailles": [
    { category: "lieu", name: "Salle", defaultValue: "Salle Prestige - formule banquet", customizable: false, unitPrice: 1100, order: 0 },
    { category: "service", name: "Traiteur & menu", defaultValue: "Menu 4 services - 110 invités", customizable: false, unitPrice: 2860, order: 1 },
    { category: "service", name: "Décoration florale", defaultValue: "Arche florale + centres de table", customizable: true, unitPrice: 600, order: 2 },
    { category: "equipement", name: "Sonorisation", defaultValue: "JBL PRX professionnel (4 enceintes + 2 subs)", customizable: true, unitPrice: 700, order: 3 },
    { category: "equipement", name: "Éclairage", defaultValue: "Spots LED RGB + guirlandes", customizable: true, unitPrice: 450, order: 4 },
    { category: "personnel", name: "DJ", defaultValue: "DJ professionnel (5h)", customizable: true, unitPrice: 600, order: 5 },
    { category: "personnel", name: "Photographe", defaultValue: "Photographe professionnel (5h)", customizable: true, unitPrice: 700, order: 6 },
  ],

  "Pack Essentiel Mariage": [
    { category: "lieu", name: "Salle", defaultValue: "Salle Prestige 250 personnes", customizable: false, unitPrice: 1200, order: 0 },
    { category: "service", name: "Traiteur & menu", defaultValue: "Menu 4 services - 120 invités", customizable: false, unitPrice: 3120, order: 1 },
    { category: "service", name: "Décoration", defaultValue: "Napperons, centrepieces et arche légère", customizable: true, unitPrice: 550, order: 2 },
    { category: "equipement", name: "Sonorisation", defaultValue: "Système 4 enceintes + 2 subs", customizable: true, unitPrice: 700, order: 3 },
    { category: "equipement", name: "Éclairage", defaultValue: "LED RGB animé", customizable: true, unitPrice: 450, order: 4 },
    { category: "personnel", name: "DJ", defaultValue: "DJ professionnel (5h)", customizable: true, unitPrice: 600, order: 5 },
    { category: "personnel", name: "Photographe", defaultValue: "Photographe (6h) - 250 photos retouchées", customizable: true, unitPrice: 800, order: 6 },
  ],

  "Pack Corporate Pro": [
    { category: "lieu", name: "Salle", defaultValue: "Salle Prestige - configuration théâtre", customizable: false, unitPrice: 1400, order: 0 },
    { category: "service", name: "Restauration", defaultValue: "Pause-déjeuner traiteur - 80 invités", customizable: false, unitPrice: 2080, order: 1 },
    { category: "service", name: "Location'", defaultValue: "Mobilier de réception + nappage", customizable: true, unitPrice: 450, order: 2 },
    { category: "equipement", name: "Sonorisation", defaultValue: "Sonorisation conférence + micro sans fil", customizable: true, unitPrice: 600, order: 3 },
    { category: "equipement", name: "Vidéoprojection", defaultValue: "Vidéoprojecteur 6000 lumens + écran 16:9", customizable: true, unitPrice: 700, order: 4 },
    { category: "personnel", name: "Technicien", defaultValue: "1 technicien AV sur place (6h)", customizable: false, unitPrice: 450, order: 5 },
    { category: "personnel", name: "Modérateur", defaultValue: "Animateur professionnel (2h)", customizable: true, unitPrice: 500, order: 6 },
  ],

  "Pack Luxe Mariage": [
    { category: "lieu", name: "Salle", defaultValue: "Salle Prestige - rez-de-chaussée + terrasse", customizable: false, unitPrice: 2200, order: 0 },
    { category: "service", name: "Traiteur & menu", defaultValue: "Menu 5 services - 180 invités", customizable: true, unitPrice: 4680, order: 1 },
    { category: "service", name: "Décoration florale", defaultValue: "Arche 6m, suspensions, centres de table (x18)", customizable: true, unitPrice: 1400, order: 2 },
    { category: "equipement", name: "Sonorisation", defaultValue: "Système ligne array 8 enceintes + 4 subs", customizable: true, unitPrice: 1200, order: 3 },
    { category: "equipement", name: "Éclairage", defaultValue: "Moving Heads + LED RGB animé", customizable: true, unitPrice: 950, order: 4 },
    { category: "equipement", name: "Écran LED", defaultValue: "Écran LED 4m×2.5m + régie", customizable: true, unitPrice: 1600, order: 5 },
    { category: "personnel", name: "DJ", defaultValue: "DJ résident (6h)", customizable: true, unitPrice: 700, order: 6 },
    { category: "personnel", name: "Orchestre", defaultValue: "Quatuor + violon solo", customizable: true, unitPrice: 1300, order: 7 },
    { category: "personnel", name: "Photographe & vidéaste", defaultValue: "Photo + film 8h", customizable: true, unitPrice: 1400, order: 8 },
    { category: "personnel", name: "Coordinateur", defaultValue: "2 coordinateurs événement dédiés", customizable: false, unitPrice: 900, order: 9 },
    { category: "instrument", name: "Piano", defaultValue: "Piano à queue Yamaha C3", customizable: true, unitPrice: 900, order: 10 },
  ],
};

async function main() {
  const packs = await prisma.pack.findMany({ select: { id: true, name: true, price: true } });
  console.log(`${packs.length} packs trouvés en base.\n`);

  let skipped = 0;

  for (const pack of packs) {
    const items = packItemsData[pack.name];
    if (!items) {
      console.log(`⚠ Aucun item défini pour « ${pack.name} » — ignoré.`);
      skipped++;
      continue;
    }

    await prisma.packItem.deleteMany({ where: { packId: pack.id } });
    await prisma.packItem.createMany({
      data: items.map(it => ({
        packId: pack.id,
        category: it.category,
        name: it.name,
        description: it.description ?? null,
        defaultValue: it.defaultValue,
        customizable: it.customizable,
        unitPrice: it.unitPrice,
        order: it.order,
      })),
    });

    const total = items.reduce((sum, it) => sum + it.unitPrice, 0);
    const delta = ((total - pack.price) / pack.price) * 100;
    console.log(
      `✓ ${String(items.length).padStart(2)} items pour « ${pack.name} » ` +
      `— total ${total} DT vs prix pack ${pack.price} DT (${delta >= 0 ? "+" : ""}${delta.toFixed(1)} %)`,
    );
  }

  console.log(
    `\n${packs.length - skipped} pack(s) traité(s), ${skipped} ignoré(s).`,
    skipped > 0 ? "\n⚠ Le catalogue a changé : ajoute ces packs à packItemsData." : "",
  );

  await prisma.$disconnect();
}

main().catch(e => { console.error("Erreur seed pack_items:", e); process.exit(1); });
