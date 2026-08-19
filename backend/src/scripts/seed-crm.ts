import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Seed des données CRM (services, événements de production, personnel, équipement)
async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  const useSsl = dbUrl.includes("sslmode") || dbUrl.includes("neon.tech") || dbUrl.includes("supabase");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: useSsl ? { rejectUnauthorized: false } : undefined });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as ConstructorParameters<typeof PrismaClient>[0]);

  const count = (kind: string) => prisma.crmRecord.count({ where: { kind } });
  const clear = (kind: string) => prisma.crmRecord.deleteMany({ where: { kind } });

  // ── Client de démo ─────────────────────────────────────────────
  const hash = await bcrypt.hash("client123", 10);
  const demoClient = await prisma.user.upsert({
    where: { email: "client@smartevent360.com" },
    update: { password: hash, role: "USER" },
    create: {
      email: "client@smartevent360.com",
      password: hash,
      name: "Client Demo",
      role: "USER",
      phone: "06 00 00 00 00",
      city: "Paris",
    },
  });
  console.log("✅ Client démo :", demoClient.email);

  // ── Services ───────────────────────────────────────────────────
  if ((await count("services")) === 0) {
    const services = [
      { nom: "Décoration de salle", categorie: "Décoration", description: "Scénographie complète : thème, fleurs, éclairage LED, nappage personnalisé.", prix_base: 650, note_moyenne: 4.8, nb_avis: 42, disponible: true, image_url: null },
      { nom: "Traiteur premium", categorie: "Restauration", description: "Buffets, plats chauds, cocktails dînatoires préparés par nos chefs.", prix_base: 45, note_moyenne: 4.9, nb_avis: 88, disponible: true, image_url: null },
      { nom: "Animation DJ & lumière", categorie: "Animation", description: "DJ professionnel, sonorisation haut de gamme et jeux de lumière.", prix_base: 480, note_moyenne: 4.6, nb_avis: 57, disponible: true, image_url: null },
      { nom: "Photographie événementielle", categorie: "Photographie", description: "Reportage photo complet, retouches et galerie en ligne sous 7 jours.", prix_base: 390, note_moyenne: 4.7, nb_avis: 34, disponible: true, image_url: null },
      { nom: "Livestream & captation", categorie: "Technique", description: "Captation multi-caméras et diffusion en direct pour vos invités à distance.", prix_base: 720, note_moyenne: 4.5, nb_avis: 12, disponible: true, image_url: null },
      { nom: "Boutonnières & bouquets", categorie: "Fleurs", description: "Créations florales sur mesure pour mariages et réceptions.", prix_base: 150, note_moyenne: 4.9, nb_avis: 76, disponible: true, image_url: null },
      { nom: "Maquillage professionnel", categorie: "Beauté", description: "Maquillage et coiffure à domicile pour la mariée et les invités.", prix_base: 120, note_moyenne: 4.8, nb_avis: 23, disponible: true, image_url: null },
      { nom: "Cabine photo vintage", categorie: "Animation", description: "Cabine photo à thème avec impressions illimitées et album souvenir.", prix_base: 290, note_moyenne: 4.4, nb_avis: 19, disponible: true, image_url: null },
    ];
    for (const s of services) await prisma.crmRecord.create({ data: { kind: "services", data: s } });
    console.log(`✅ ${services.length} services créés`);
  } else {
    console.log("⏭️  services déjà présents — skip");
  }

  // ── Personnel ──────────────────────────────────────────────────
  if ((await count("personnel")) === 0) {
    const personnel = [
      { nom: "Martin", prenom: "Sophie", fonction: "Technicienne Son", disponibilite: "disponible", specialites: ["Son", "Régie"], email: "s.martin@smartevent360.com", telephone: "06 11 22 33 44" },
      { nom: "Dupont", prenom: "Julien", fonction: "DJ", disponibilite: "disponible", specialites: ["DJ", "Musique"], email: "j.dupont@smartevent360.com", telephone: "06 55 66 77 88" },
      { nom: "Lefevre", prenom: "Camille", fonction: "Scénographe", disponibilite: "disponible", specialites: ["Décoration", "Fleurs"], email: "c.lefevre@smartevent360.com", telephone: "06 99 88 77 66" },
      { nom: "Roux", prenom: "Antoine", fonction: "Photographe", disponibilite: "mission", specialites: ["Photo", "Vidéo"], email: "a.roux@smartevent360.com", telephone: "06 33 44 55 66" },
    ];
    for (const p of personnel) await prisma.crmRecord.create({ data: { kind: "personnel", data: p } });
    console.log(`✅ ${personnel.length} membres de personnel créés`);
  } else {
    console.log("⏭️  personnel déjà présent — skip");
  }

  // ── Équipement ─────────────────────────────────────────────────
  if ((await count("equipment")) === 0) {
    const equipment = [
      { nom: "Sonorisation 2000W", reference: "SPE-001", categorie: "Son", etat: "bon", disponibilite: "disponible", prix_location: 350, prix_achat: 6500, localisation: "Entrepôt A", description: "Pack son complet 2x1200W avec tables de mixage." },
      { nom: "Scène modulable 4x3m", reference: "SCE-002", categorie: "Structure", etat: "bon", disponibilite: "disponible", prix_location: 450, prix_achat: 12000, localisation: "Entrepôt B", description: "Plateforme scène démontable 4x3 mètres." },
      { nom: "Éclairage LED RGB", reference: "LED-003", categorie: "Lumière", etat: "moyen", disponibilite: "disponible", prix_location: 120, prix_achat: 2400, localisation: "Entrepôt A", description: "Projecteurs LED RGB 18W (lot de 6)." },
      { nom: "Tente chapiteau 10x10m", reference: "TNT-004", categorie: "Structure", etat: "neuf", disponibilite: "reserve", prix_location: 520, prix_achat: 9800, localisation: "Entrepôt B", description: "Chapiteau 10x10m avec montage inclus." },
    ];
    for (const e of equipment) await prisma.crmRecord.create({ data: { kind: "equipment", data: e } });
    console.log(`✅ ${equipment.length} équipements créés`);
  } else {
    console.log("⏭️  equipment déjà présent — skip");
  }

  // ── Événements de production ───────────────────────────────────
  if ((await count("events")) === 0) {
    const personnel = await prisma.crmRecord.findMany({ where: { kind: "personnel" } });
    const equipment = await prisma.crmRecord.findMany({ where: { kind: "equipment" } });

    const events = [
      {
        nom: "Mariage Emma & Lucas",
        type: "mariage",
        statut: "preparation",
        date_debut: new Date(Date.now() + 14 * 86400000).toISOString(),
        date_fin: new Date(Date.now() + 15 * 86400000).toISOString(),
        lieu: "Château de Vaux-le-Pénil",
        ville: "Melun",
        nb_invites: 120,
        budget_total: 18500,
        client_id: demoClient.id,
        description: "Réception de mariage en plein air avec cocktail dînatoire.",
        instructions: "Point d'arrivée : cour d'honneur. Équipe technique attendue à 8h.",
        notes: "[" + JSON.stringify({ author: "Julien", text: "Repérage fait, scène OK." }) + "]",
      },
      {
        nom: "Séminaire d'entreprise",
        type: "seminaire",
        statut: "preparation",
        date_debut: new Date(Date.now() + 30 * 86400000).toISOString(),
        date_fin: new Date(Date.now() + 30 * 86400000).toISOString(),
        lieu: "Palais des Congrès",
        ville: "Paris",
        nb_invites: 80,
        budget_total: 9200,
        client_id: demoClient.id,
        description: "Séminaire annuel avec plénière et ateliers.",
        instructions: "Prévoir une régie son pour la plénière.",
        notes: "[]",
      },
      {
        nom: "Anniversaire 30 ans",
        type: "anniversaire",
        statut: "en_cours",
        date_debut: new Date(Date.now() - 2 * 86400000).toISOString(),
        date_fin: new Date(Date.now() + 1 * 86400000).toISOString(),
        lieu: "Villa Horizon",
        ville: "Boulogne-Billancourt",
        nb_invites: 40,
        budget_total: 4600,
        client_id: demoClient.id,
        description: "Soirée privée avec DJ et cabine photo.",
        instructions: "",
        notes: "[]",
      },
    ];

    const createdEvents: { id: string; data: any }[] = [];
    for (const e of events) {
      const row = await prisma.crmRecord.create({ data: { kind: "events", data: e } });
      createdEvents.push({ id: row.id, data: e });
    }
    console.log(`✅ ${createdEvents.length} événements créés`);

    // Liens personnel / équipement
    if (personnel.length && equipment.length) {
      const links = [
        { ev: 0, p: 1, role: "Régie son" },
        { ev: 0, p: 3, role: "Photographe" },
        { ev: 0, e: 0, q: 1 },
        { ev: 0, e: 2, q: 4 },
        { ev: 2, p: 1, role: "DJ" },
        { ev: 2, e: 2, q: 2 },
      ];
      for (const l of links) {
        const ev = createdEvents[l.ev];
        if (l.p !== undefined && personnel[l.p]) {
          await prisma.crmRecord.create({
            data: { kind: "event_personnel", data: { event_id: ev.id, personnel_id: personnel[l.p].id, role_event: l.role } },
          });
        }
        if (l.e !== undefined && equipment[l.e]) {
          await prisma.crmRecord.create({
            data: { kind: "event_equipment", data: { event_id: ev.id, equipment_id: equipment[l.e].id, quantite: l.q } },
          });
        }
      }
      console.log("✅ Liens personnel/équipement créés");
    }
  } else {
    console.log("⏭️  events déjà présents — skip");
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
