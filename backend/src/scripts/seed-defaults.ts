import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Seed des personnels et équipements par défaut (idempotent : n'insère que ce qui manque)
async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  const useSsl = dbUrl.includes("sslmode") || dbUrl.includes("neon.tech") || dbUrl.includes("supabase");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: useSsl ? { rejectUnauthorized: false } : undefined });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as ConstructorParameters<typeof PrismaClient>[0]);

  // ── Personnel par défaut ──────────────────────────────────────
  const personnel = [
    { nom: "Ben Salah", prenom: "Karim", fonction: "Guitariste", type: "interne", disponibilite: "disponible", mode_paiement: "jour", salaire: 250, telephone: "+216 20 111 222", email: "k.bensalah@smartevent360.com" },
    { nom: "Trabelsi", prenom: "Amine", fonction: "Pianiste", type: "interne", disponibilite: "disponible", mode_paiement: "jour", salaire: 300, telephone: "+216 20 333 444", email: "a.trabelsi@smartevent360.com" },
    { nom: "Gharbi", prenom: "Nour", fonction: "Chanteuse", type: "interne", disponibilite: "disponible", mode_paiement: "jour", salaire: 350, telephone: "+216 20 555 666", email: "n.gharbi@smartevent360.com" },
    { nom: "Mansouri", prenom: "Sami", fonction: "Chanteur", type: "externe", disponibilite: "disponible", mode_paiement: "jour", salaire: 350, telephone: "+216 20 777 888", email: "s.mansouri@smartevent360.com" },
    { nom: "Jlassi", prenom: "Rania", fonction: "Photographe", type: "interne", disponibilite: "disponible", mode_paiement: "jour", salaire: 280, telephone: "+216 20 999 000", email: "r.jlassi@smartevent360.com" },
    { nom: "Khelifi", prenom: "Yassine", fonction: "Vidéaste", type: "interne", disponibilite: "disponible", mode_paiement: "jour", salaire: 300, telephone: "+216 21 121 314", email: "y.khelifi@smartevent360.com" },
    { nom: "Bouazizi", prenom: "Walid", fonction: "DJ", type: "interne", disponibilite: "disponible", mode_paiement: "jour", salaire: 260, telephone: "+216 21 151 617", email: "w.bouazizi@smartevent360.com" },
    { nom: "Sassi", prenom: "Hedi", fonction: "Batteur", type: "externe", disponibilite: "disponible", mode_paiement: "jour", salaire: 220, telephone: "+216 21 181 920", email: "h.sassi@smartevent360.com" },
    { nom: "Ferchichi", prenom: "Ines", fonction: "Violoniste", type: "externe", disponibilite: "disponible", mode_paiement: "jour", salaire: 280, telephone: "+216 21 212 223", email: "i.ferchichi@smartevent360.com" },
    { nom: "Chaabane", prenom: "Moez", fonction: "Technicien Son", type: "interne", disponibilite: "disponible", mode_paiement: "jour", salaire: 180, telephone: "+216 21 242 526", email: "m.chaabane@smartevent360.com" },
    { nom: "Nasri", prenom: "Oussama", fonction: "Technicien Lumière", type: "interne", disponibilite: "disponible", mode_paiement: "jour", salaire: 170, telephone: "+216 21 272 829", email: "o.nasri@smartevent360.com" },
    { nom: "Ayari", prenom: "Sirine", fonction: "Photographe", type: "externe", disponibilite: "disponible", mode_paiement: "jour", salaire: 280, telephone: "+216 21 303 132", email: "s.ayari@smartevent360.com" },
  ];

  let addedP = 0;
  for (const p of personnel) {
    const exists = await prisma.crmRecord.findFirst({
      where: { kind: "personnel", data: { path: ["nom"], equals: p.nom } },
    });
    if (!exists) {
      await prisma.crmRecord.create({ data: { kind: "personnel", data: p } });
      addedP++;
    }
  }
  console.log(`✅ Personnel : ${addedP} ajouté(s), ${personnel.length - addedP} déjà présent(s)`);

  // ── Équipements par défaut ────────────────────────────────────
  const equipment = [
    { nom: "Guitare électrique Fender Stratocaster", reference: "INS-GTR-001", categorie: "Son", etat: "bon", disponibilite: "disponible", prix_location: 80, prix_achat: 3200, localisation: "Entrepôt A", description: "Guitare électrique Fender Stratocaster avec étui rigide." },
    { nom: "Guitare acoustique Yamaha FG800", reference: "INS-GAC-002", categorie: "Son", etat: "bon", disponibilite: "disponible", prix_location: 50, prix_achat: 1200, localisation: "Entrepôt A", description: "Guitare folk Yamaha FG800, sonorité riche et équilibrée." },
    { nom: "Piano à queue Yamaha C2", reference: "INS-PNO-003", categorie: "Son", etat: "neuf", disponibilite: "disponible", prix_location: 400, prix_achat: 25000, localisation: "Entrepôt B", description: "Piano à queue 1,73 m — idéal mariages et concerts." },
    { nom: "Piano numérique Yamaha P-125", reference: "INS-PNB-004", categorie: "Son", etat: "bon", disponibilite: "disponible", prix_location: 90, prix_achat: 1800, localisation: "Entrepôt A", description: "Piano numérique 88 touches toucher lourd avec amplification." },
    { nom: "Micro sans fil Shure SM58", reference: "SON-MIC-005", categorie: "Son", etat: "bon", disponibilite: "disponible", prix_location: 45, prix_achat: 950, localisation: "Entrepôt A", description: "Micro chant sans fil professionnel + récepteur UHF." },
    { nom: "Baffles / Haut-parleurs 1000W", reference: "SON-BFL-006", categorie: "Son", etat: "bon", disponibilite: "disponible", prix_location: 150, prix_achat: 4200, localisation: "Entrepôt A", description: "Paire d'enceintes actives 1000W avec pieds." },
    { nom: "Câbles XLR (lot de 10)", reference: "SON-CBL-007", categorie: "Son", etat: "bon", disponibilite: "disponible", prix_location: 15, prix_achat: 350, localisation: "Entrepôt A", description: "Câbles XLR 10 m blindés, connecteurs Neutrik." },
    { nom: "Amplificateur guitare Marshall 100W", reference: "SON-AMP-008", categorie: "Son", etat: "bon", disponibilite: "disponible", prix_location: 110, prix_achat: 5200, localisation: "Entrepôt A", description: "Ampli à lampes Marshall DSL100 avec footswitch." },
    { nom: "Appareil photo reflex Canon EOS 90D", reference: "VID-APP-009", categorie: "Video", etat: "neuf", disponibilite: "disponible", prix_location: 120, prix_achat: 5600, localisation: "Entrepôt B", description: "Boîtier reflex 32 MP + objectif 18-135 mm, vidéo 4K." },
    { nom: "Caméra Sony FX30 cinéma", reference: "VID-CAM-010", categorie: "Video", etat: "neuf", disponibilite: "disponible", prix_location: 250, prix_achat: 12000, localisation: "Entrepôt B", description: "Caméra Super 35 pour captation multi-caméras." },
    { nom: "Jeux de lumière LED RGB (lot de 6)", reference: "LUM-LED-011", categorie: "Lumiere", etat: "bon", disponibilite: "disponible", prix_location: 120, prix_achat: 2400, localisation: "Entrepôt A", description: "Projecteurs LED RGB 18W pilotés DMX." },
    { nom: "Machine à fumée 1500W", reference: "EFF-FUM-012", categorie: "Autre", etat: "bon", disponibilite: "disponible", prix_location: 70, prix_achat: 1400, localisation: "Entrepôt A", description: "Machine à fumée télécommandée pour entrées spectaculaires." },
  ];

  let addedE = 0;
  for (const e of equipment) {
    const exists = await prisma.crmRecord.findFirst({
      where: { kind: "equipment", data: { path: ["nom"], equals: e.nom } },
    });
    if (!exists) {
      await prisma.crmRecord.create({ data: { kind: "equipment", data: e } });
      addedE++;
    }
  }
  console.log(`✅ Équipements : ${addedE} ajouté(s), ${equipment.length - addedE} déjà présent(s)`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
