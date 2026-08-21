import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

function makePool() {
  const url = process.env.DATABASE_URL || "";
  const ssl = url.includes("neon.tech") || url.includes("supabase") || url.includes("sslmode");
  return new Pool({ connectionString: url, ssl: ssl ? { rejectUnauthorized: false } : undefined });
}
function prismaFrom(pool: Pool) {
  return new PrismaClient({ adapter: new PrismaPg(pool) } as ConstructorParameters<typeof PrismaClient>[0]);
}
const DAY = 86_400_000;

async function main() {
  const pool = makePool();
  const prisma = prismaFrom(pool);

  // STEP 1: TRUNCATE
  console.log("\nDeletion des donnees...");
  const tables = [
    "provider_gallery","provider_reviews","provider_availability",
    "provider_compositions","pack_services","favorite_services",
    "service_parameters","service_resources","notifications",
    "bookings","packs","events","categories","services",
    "service_types","providers","users","crm_records",
  ];
  for (const t of tables) {
    const r = await pool.query(`DELETE FROM "${t}"`);
    if (r.rowCount && r.rowCount > 0) console.log(`  ${t}: ${r.rowCount} deleted`);
  }
  console.log("All data deleted\n");

  // STEP 2: SEED
  const adminHash = await bcrypt.hash("admin123", 10);
  const clientHash = await bcrypt.hash("client123", 10);

  const admin = await prisma.user.create({ data: {
    email: "admin@smartevent360.com", password: adminHash,
    name: "Ahmed Ben Salah", nom: "Ben Salah", prenom: "Ahmed", role: "ADMIN",
    phone: "+216 71 234 567", city: "Tunis", address: "Centre Urbain Nord",
    company: "SmartEvent360 SARL", profession: "Directeur",
    clientType: "entreprise", cin: "09876543", matfisc: "1234567/A",
  }});

  const clientsRaw = [
    { email: "client@smartevent360.com", name: "Ines Mansour", nom: "Mansour", prenom: "Ines", phone: "+216 98 765 432", city: "Sfax", address: "Avenue Habib Bourguiba", profession: "Architecte", clientType: "particulier", cin: "11223344" },
    { email: "karim.trabelsi@email.tn", name: "Karim Trabelsi", nom: "Trabelsi", prenom: "Karim", phone: "+216 55 111 222", city: "Sousse", profession: "Entrepreneur", clientType: "entreprise", company: "Trabelsi Group" },
    { email: "amira.benali@email.tn", name: "Amira Benali", nom: "Benali", prenom: "Amira", phone: "+216 22 333 444", city: "Tunis", profession: "Medecin", clientType: "particulier" },
    { email: "mourad.jaziri@email.tn", name: "Mourad Jaziri", nom: "Jaziri", prenom: "Mourad", phone: "+216 73 555 666", city: "Bizerte", profession: "Ingenieur", clientType: "particulier" },
    { email: "eventplus@events.tn", name: "EventPlus SARL", nom: "EventPlus", prenom: null, phone: "+216 71 777 888", city: "Tunis", profession: "Organisation evenementielle", clientType: "entreprise", company: "EventPlus SARL" },
  ];
  const allClients = [];
  for (const c of clientsRaw) {
    allClients.push(await prisma.user.create({ data: { ...c, password: clientHash, role: "USER" } }));
  }
  console.log(`${1 + clientsRaw.length} users created`);

  // CATEGORIES
  const cats = await Promise.all([
    prisma.category.create({ data: { name: "Mariage", slug: "mariage", color: "#C9A84C" } }),
    prisma.category.create({ data: { name: "Fiancailles", slug: "fiancailles", color: "#E1C56A" } }),
    prisma.category.create({ data: { name: "Anniversaire", slug: "anniversaire", color: "#6366F1" } }),
    prisma.category.create({ data: { name: "Corporate", slug: "corporate", color: "#0EA5E9" } }),
    prisma.category.create({ data: { name: "Festival", slug: "festival", color: "#F59E0B" } }),
    prisma.category.create({ data: { name: "Gala", slug: "gala", color: "#EC4899" } }),
    prisma.category.create({ data: { name: "Conference", slug: "conference", color: "#8B5CF6" } }),
  ]);
  console.log(`${cats.length} categories`);

  // EVENTS
  const now = Date.now();
  const evData = [
    { title: "Mariage Fatma & Youssef", description: "Reception mariage traditionnel tunisien, 180 invites.", location: "Salle El Bahia, Ben Arous", date: new Date(now + 12 * DAY), capacity: 200, price: 12000, isPublished: true, categoryId: cats[0].id, clientId: allClients[0].id },
    { title: "Mariage Salma & Ahmed", description: "Mariage luxe en plein air, blanc et dore.", location: "Laico Tunis Hotel", date: new Date(now + 28 * DAY), capacity: 250, price: 18500, isPublished: true, categoryId: cats[0].id, clientId: allClients[1].id },
    { title: "Fiancailles Nadia & Sami", description: "Soiree intime, 60 convives.", location: "Restaurant Le Golfe, Sidi Bou Said", date: new Date(now + 7 * DAY), capacity: 60, price: 4500, isPublished: true, categoryId: cats[1].id, clientId: allClients[2].id },
    { title: "Anniversaire Lina 25 ans", description: "Soiree surprise theme Hollywood Glamour.", location: "Villa Les Roses, La Marsa", date: new Date(now + 18 * DAY), capacity: 45, price: 3200, isPublished: true, categoryId: cats[2].id, clientId: allClients[3].id },
    { title: "Seminaire Trabelsi Group", description: "Seminaire strategique 2026-2027, 120 participants.", location: "Hilton Tunis, Lac", date: new Date(now + 35 * DAY), capacity: 120, price: 9500, isPublished: true, categoryId: cats[3].id, clientId: allClients[1].id },
    { title: "Gala Charite Fondation ESPOIR", description: "Gala collecte de fonds education.", location: "Palais des Congres, Tunis", date: new Date(now + 45 * DAY), capacity: 350, price: 25000, isPublished: true, categoryId: cats[5].id, clientId: allClients[4].id },
    { title: "Festival Musique Sousse", description: "3eme edition concerts plein air 3 jours.", location: "Boulevard 14 Janvier, Sousse", date: new Date(now + 60 * DAY), capacity: 2000, price: 0, isPublished: true, categoryId: cats[4].id },
    { title: "Lancement Produit TechVision", description: "Conference de presse nouveau smartphone.", location: "Centre des Sciences, Tunis", date: new Date(now + 22 * DAY), capacity: 180, price: 5000, isPublished: true, categoryId: cats[6].id, clientId: allClients[4].id },
    { title: "Mariage Leila & Mehdi", description: "Ceremonie + reception, theme boheme chic.", location: "Domaine Sidi Saad, Nabeul", date: new Date(now + 55 * DAY), capacity: 150, price: 14000, isPublished: false, categoryId: cats[0].id, clientId: allClients[2].id },
    { title: "10 ans EventPlus", description: "Celebration decennie collaborateurs.", location: "Espace Royal, Sfax", date: new Date(now - 5 * DAY), capacity: 100, price: 7500, isPublished: true, categoryId: cats[2].id, clientId: allClients[4].id },
  ];
  const events = [];
  for (const e of evData) {
    events.push(await prisma.event.create({ data: { ...e, organizerId: admin.id } }));
  }
  console.log(`${events.length} events`);

  // SERVICE TYPES
  const types = await Promise.all([
    prisma.serviceType.create({ data: { name: "Traiteur", slug: "traiteur", description: "Cuisine, buffet, service" } }),
    prisma.serviceType.create({ data: { name: "Salle de fete", slug: "salle", description: "Location salles" } }),
    prisma.serviceType.create({ data: { name: "Decorateur", slug: "decorateur", description: "Decoration evenementielle" } }),
    prisma.serviceType.create({ data: { name: "Photographe", slug: "photographe", description: "Photo + video" } }),
    prisma.serviceType.create({ data: { name: "Fleuriste", slug: "fleuriste", description: "Fleurs et arrangements" } }),
    prisma.serviceType.create({ data: { name: "DJ / Musicien", slug: "musique", description: "Sonorisation et animation" } }),
    prisma.serviceType.create({ data: { name: "Visagiste", slug: "visagiste", description: "Coiffure et maquillage" } }),
    prisma.serviceType.create({ data: { name: "Location materiel", slug: "materiel", description: "Tables, chaises, chapiteaux" } }),
    prisma.serviceType.create({ data: { name: "Wedding planner", slug: "planner", description: "Organisation complete" } }),
  ]);
  console.log(`${types.length} service types`);

  // SERVICES
  const svcData = [
    { name: "Traiteur El Andalous", slug: "traiteur-andalous", description: "Cuisine raffinee, 25 ans experience.", price: 350, priceUnit: "personne", capacity: 500, typeId: types[0].id, providerEmail: "traiteur.andalous@email.tn", providerName: "Sami El Andalous", providerPhone: "+216 71 333 111", providerCity: "Tunis", lat: 36.8065, lng: 10.1815, params: [{name:"Service",value:"Buffet / Assis / Cocktail"},{name:"Cuisine",value:"Tunisienne / Francaise / Libanaise"},{name:"Minimum",value:"50 personnes"},{name:"Bar",value:"Alcoolise / Sans alcool"},{name:"Desserts",value:"Patisseries orientales"}] },
    { name: "Traiteur Le Palais", slug: "traiteur-palais", description: "Gastronomie francaise, chef stanislas.", price: 550, priceUnit: "personne", capacity: 400, typeId: types[0].id, providerEmail: "traiteur.palais@email.tn", providerName: "Jean-Marc Dupont", providerPhone: "+216 71 444 222", providerCity: "La Marsa", lat: 36.8750, lng: 10.3250, params: [{name:"Service",value:"Plat unique / Menu degustation"},{name:"Chef",value:"Stanislas Baret"},{name:"Minimum",value:"30 personnes"}] },
    { name: "Salle Elysee Palace", slug: "salle-elysee", description: "Salle de prestige, 800 m2, 400 places.", price: 4000, priceUnit: "sejour", capacity: 400, typeId: types[1].id, providerEmail: "elysee.palace@email.tn", providerName: "Fathi Karray", providerPhone: "+216 71 555 333", providerCity: "Tunis", lat: 36.8130, lng: 10.1750, params: [{name:"Superficie",value:"800 m2"},{name:"Piste danse",value:"Oui"},{name:"Parking",value:"200 places"},{name:"Sonorisation",value:"Incluse"},{name:"Climatisation",value:"Oui"}] },
    { name: "Salle Les Oliviers", slug: "salle-oliviers", description: "Jardin mediterraneen, ext. et int.", price: 2500, priceUnit: "sejour", capacity: 250, typeId: types[1].id, providerEmail: "salle.oliviers@email.tn", providerName: "Nadia Zouari", providerPhone: "+216 73 666 444", providerCity: "Nabeul", lat: 36.4540, lng: 10.7330, params: [{name:"Jardin",value:"600 m2"},{name:"Ext/Int",value:"Oui"},{name:"Parking",value:"100 places"}] },
    { name: "Deco Lux Event", slug: "deco-lux", description: "Deco haut de gamme, themes sur mesure.", price: 800, priceUnit: "evenement", capacity: 500, typeId: types[2].id, providerEmail: "deco.lux@email.tn", providerName: "Rim Ladgham", providerPhone: "+216 98 777 555", providerCity: "Tunis", lat: 36.8020, lng: 10.1700, params: [{name:"Themes",value:"Boheme / Boho / Moderne / Royal"},{name:"Fleurs",value:"Inclus / Option"},{name:"Dev",value:"Installation la veille"}] },
    { name: "Photo Studio Lumiere", slug: "photo-lumiere", description: "Photo + video, drone, 4K.", price: 1200, priceUnit: "evenement", capacity: 500, typeId: types[3].id, providerEmail: "studio.lumiere@email.tn", providerName: "Mehdi Bouazizi", providerPhone: "+216 22 888 666", providerCity: "Sousse", lat: 35.8300, lng: 10.6400, params: [{name:"Equipe",value:"2 photographes + cameraman"},{name:"Drone",value:"Inclus"},{name:"Rendu",value:"Album + fondus 150"},{name:"Delai",value:"3 semaines"}] },
    { name: "Studio Elegance Photo", slug: "elegance-photo", description: "Reportage artistique, precooke.", price: 1800, priceUnit: "evenement", capacity: 500, typeId: types[3].id, providerEmail: "elegance.photo@email.tn", providerName: "Yasmine Chaabane", providerPhone: "+216 55 999 777", providerCity: "Sfax", lat: 34.7400, lng: 10.7600, params: [{name:"Style",value:"Reportage artistique"},{name:"Precooke",value:"Oui"},{name:"Livraison",value:"Cl USB + album"}] },
    { name: "Fleuriste Jardin de Fleurs", slug: "jardin-fleurs", description: "Fleurs fraiches, arrangements custom.", price: 300, priceUnit: "commande", capacity: 500, typeId: types[4].id, providerEmail: "jardin.fleurs@email.tn", providerName: "Ahlem Mezghani", providerPhone: "+216 71 111 888", providerCity: "Tunis", lat: 36.7950, lng: 10.1650, params: [{name:"Type",value:"Bouquet / Centre / Arc"},{name:"Fleurs",value:"Roses / Lys / Orchidees"},{name:"Livraison",value:"Le jour J / La veille"}] },
    { name: "DJ Beats & Rhythm", slug: "dj-beats", description: "DJ pro, ambiance electro, arab, occi.", price: 900, priceUnit: "evenement", capacity: 500, typeId: types[5].id, providerEmail: "dj.beats@email.tn", providerName: "Zied Sliti", providerPhone: "+216 99 000 111", providerCity: "Tunis", lat: 36.8100, lng: 10.1800, params: [{name:"Sonorisation",value:"JBL Pro / Pioneer"},{name:"Style",value:"Electro / Arabe / Mix"},{name:"Laser",value:"Oui"},{name:"Duree",value:"4h / 6h / 8h"}] },
    { name: "Orchestre Sidi Bou Said", slug: "orchestre-sbs", description: "Musique traditionnelle et moderne.", price: 1500, priceUnit: "evenement", capacity: 500, typeId: types[5].id, providerEmail: "orchestre.sbs@email.tn", providerName: "Hatem Jday", providerPhone: "+216 71 222 444", providerCity: "Sidi Bou Said", lat: 36.8700, lng: 10.3400, params: [{name:"Ensemble",value:"5 a 12 musiciens"},{name:"Repertoire",value:"Malouf / Moderne / Classique"},{name:"Sonorisation",value:"Incluse"}] },
    { name: "Coiffeur Elegance", slug: "coiffeur-elegance", description: "Coiffure mariage et soiree.", price: 250, priceUnit: "personne", capacity: 100, typeId: types[6].id, providerEmail: "coiffeur.elegance@email.tn", providerName: "Samira Ben Farhat", providerPhone: "+216 71 444 666", providerCity: "Tunis", lat: 36.8080, lng: 10.1730, params: [{name:"Service",value:"Coiffure / Maquillage / Les deux"},{name:"Deplacement",value:"Salon / Sur place"}] },
    { name: "Location Tables Prestige", slug: "loc-tables", description: "Tables, chaises, nappes, couverts.", price: 8, priceUnit: "personne", capacity: 1000, typeId: types[7].id, providerEmail: "tables.prestige@email.tn", providerName: "Lotfi Maatallah", providerPhone: "+216 73 333 999", providerCity: "Sfax", lat: 34.7350, lng: 10.7550, params: [{name:"Chaises",value:"Chiavari / Tiffany / Classiques"},{name:"Nappes",value:"Satin / Organza / Sans"},{name:"Livraison",value:"Incluse / Retrait"}] },
    { name: "Planning Pro Events", slug: "planning-pro", description: "Wedding planner certifie, 10 ans exp.", price: 2000, priceUnit: "evenement", capacity: 500, typeId: types[8].id, providerEmail: "planning.pro@email.tn", providerName: "Sarah Benzarti", providerPhone: "+216 98 555 333", providerCity: "Tunis", lat: 36.8050, lng: 10.1780, params: [{name:"Pack",value:"Essentiel / Premium / Luxe"},{name:"Suivi",value:"Jour J + Repetitions"},{name:"Budget",value:"Gestion complete"}] },
  ];

  const allServices = [];
  const allProviders = [];
  const providerEmails: Record<string, number> = {};

  for (const s of svcData) {
    const svc = await prisma.service.create({ data: {
      name: s.name, slug: s.slug, description: s.description,
      price: s.price, priceUnit: s.priceUnit, capacity: s.capacity,
      serviceTypeId: s.typeId, isApproved: true, isPublished: true,
    }});

    await prisma.serviceParameter.create({ data: {
      serviceId: svc.id, name: "Location", value: s.providerCity,
    }});

    for (const p of s.params) {
      await prisma.serviceParameter.create({ data: {
        serviceId: svc.id, name: p.name, value: p.value,
      }});
    }

    if (!providerEmails[s.providerEmail]) {
      const provUser = await prisma.user.create({ data: {
        email: s.providerEmail, password: clientHash, name: s.providerName,
        nom: s.providerName.split(" ").pop() || s.providerName,
        prenom: s.providerName.split(" ").slice(0, -1).join(" "),
        role: "USER", phone: s.providerPhone, city: s.providerCity,
        profession: "Prestataire", clientType: "particulier",
      }});
      providerEmails[s.providerEmail] = provUser.id;

      const prov = await prisma.provider.create({ data: {
        userId: provUser.id, bio: s.description,
        latitude: s.lat, longitude: s.lng,
      }});

      await prisma.providerComposition.create({ data: {
        providerId: prov.id, type: "evenement", label: "Mariage" },
      });
      await prisma.providerComposition.create({ data: {
        providerId: prov.id, type: "personne", label: "Invites 50-200" },
      });
      await prisma.providerComposition.create({ data: {
        providerId: prov.id, type: "date", label: "Toute l'annee" },
      });

      await prisma.providerAvailability.create({ data: {
        providerId: prov.id, dayOfWeek: 1, startTime: "08:00", endTime: "20:00" }});
      await prisma.providerAvailability.create({ data: {
        providerId: prov.id, dayOfWeek: 3, startTime: "08:00", endTime: "20:00" }});
      await prisma.providerAvailability.create({ data: {
        providerId: prov.id, dayOfWeek: 5, startTime: "08:00", endTime: "22:00" }});
      await prisma.providerAvailability.create({ data: {
        providerId: prov.id, dayOfWeek: 6, startTime: "08:00", endTime: "22:00" }});

      allProviders.push(prov);
    }

    allServices.push(svc);
  }
  console.log(`${allServices.length} services, ${allProviders.length} providers`);

  // PACKS
  const packData = [
    { name: "Pack Essentiel Mariage", description: "Pack complet pour mariage simple et elegant.", price: 4500, discountPercent: 0, serviceIds: [0, 3, 6, 8] },
    { name: "Pack Luxe Mariage", description: "Tout inclus pour un mariage de reve.", price: 12000, discountPercent: 15, serviceIds: [0, 2, 3, 4, 5, 7, 11] },
    { name: "Pack Fiancailles", description: "Soiree de fiancailles intime et raffinee.", price: 3200, discountPercent: 0, serviceIds: [0, 2, 3, 6] },
    { name: "Pack Anniversary Glam", description: "Anniversaire glamour, tout inclus.", price: 2800, discountPercent: 10, serviceIds: [0, 3, 5, 6] },
    { name: "Pack Corporate Pro", description: "Seminaire et conference professionnels.", price: 5500, discountPercent: 5, serviceIds: [0, 3, 5, 8, 10] },
  ];
  const allPacks = [];
  for (const p of packData) {
    const pack = await prisma.pack.create({ data: {
      name: p.name, description: p.description,
      price: p.price, discountPercent: p.discountPercent,
      isPublished: true,
    }});
    for (const idx of p.serviceIds) {
      if (allServices[idx]) {
        await prisma.packService.create({ data: {
          packId: pack.id, serviceId: allServices[idx].id,
        }});
      }
    }
    allPacks.push(pack);
  }
  console.log(`${allPacks.length} packs`);

  // CRM RECORDS
  const crmData = [
    { type: "service", name: "Sondage qualite prestataires", description: "Enquete satisfaction 2026 Q1", status: "completed", clientId: allClients[0].id },
    { type: "personnel", name: "Formation equipe", description: "Formation gestion evenementielle", status: "active", clientId: allClients[1].id },
    { type: "equipment", name: "Materiel technique son", description: "Enceintes JBL PRX815W", status: "available", clientId: allClients[0].id },
    { type: "event", name: "Prochaine soiree gala", description: "Gala charite fondation ESPOIR", status: "in_progress", clientId: allClients[4].id },
    { type: "service", name: "Maintenance salle", description: "Entretien trimestriel Elysee Palace", status: "scheduled", clientId: allClients[2].id },
  ];
  for (const c of crmData) {
    await prisma.crmRecord.create({ data: {
      type: c.type, name: c.name, description: c.description,
      status: c.status, clientId: c.clientId,
    }});
  }
  console.log(`${crmData.length} CRM records`);

  // REVIEWS
  const revData = [
    { rating: 5, comment: "Traiteur exceptionnel, les invites etaient ravis !", providerId: allProviders[0].id, clientEmail: "client@smartevent360.com" },
    { rating: 4, comment: "Belle salle, bon rapport qualite/prix.", providerId: allProviders[2].id, clientEmail: "karim.trabelsi@email.tn" },
    { rating: 5, comment: "Decoratrice tres creative, bravo Rim !", providerId: allProviders[4].id, clientEmail: "amira.benali@email.tn" },
    { rating: 4, comment: "Photos magnifiques, equipe pro.", providerId: allProviders[5].id, clientEmail: "client@smartevent360.com" },
    { rating: 5, comment: "DJ incroyable, piste de danse complete !", providerId: allProviders[8].id, clientEmail: "mourad.jaziri@email.tn" },
    { rating: 4, comment: "Planner tres organize, a tout gere.", providerId: allProviders[12].id, clientEmail: "karim.trabelsi@email.tn" },
  ];
  for (const r of revData) {
    const user = await prisma.user.findFirst({ where: { email: r.clientEmail } });
    if (user) {
      await prisma.providerReview.create({ data: {
        rating: r.rating, comment: r.comment,
        providerId: r.providerId, userId: user.id,
      }});
    }
  }
  console.log(`${revData.length} reviews`);

  // GALLERY
  const galleryData = [
    { providerId: allProviders[0].id, imageUrl: "/uploads/gallery/traiteur-1.jpg", caption: "Buffet mariage Ben Arous" },
    { providerId: allProviders[2].id, imageUrl: "/uploads/gallery/salle-1.jpg", caption: "Salle Elysee Palace, 400 couverts" },
    { providerId: allProviders[4].id, imageUrl: "/uploads/gallery/deco-1.jpg", caption: "Theme boheme chic" },
    { providerId: allProviders[5].id, imageUrl: "/uploads/gallery/photo-1.jpg", caption: "Couple coucher de soleil" },
    { providerId: allProviders[8].id, imageUrl: "/uploads/gallery/dj-1.jpg", caption: "Ambiance DJ Zied, 200 danseurs" },
    { providerId: allProviders[0].id, imageUrl: "/uploads/gallery/traiteur-2.jpg", caption: "Menu degustation 7 services" },
    { providerId: allProviders[4].id, imageUrl: "/uploads/gallery/deco-2.jpg", caption: "Arc floral blanc et or" },
  ];
  for (const g of galleryData) {
    await prisma.providerGallery.create({ data: {
      providerId: g.providerId, imageUrl: g.imageUrl,
      caption: g.caption, sortOrder: 0, isApproved: true,
    }});
  }
  console.log(`${galleryData.length} gallery items`);

  // SUMMARY
  const counts: [string, Promise<number>][] = [
    ["Utilisateurs", prisma.user.count()],
    ["Categories", prisma.category.count()],
    ["Events", prisma.event.count()],
    ["Services", prisma.service.count()],
    ["ServiceTypes", prisma.serviceType.count()],
    ["ServiceParameters", prisma.serviceParameter.count()],
    ["Providers", prisma.provider.count()],
    ["Packs", prisma.pack.count()],
    ["PackServices", prisma.packService.count()],
    ["CRM Records", prisma.crmRecord.count()],
    ["Reviews", prisma.providerReview.count()],
    ["Gallery", prisma.providerGallery.count()],
  ];
  console.log("\nRESUME FINAL:");
  console.log("=".repeat(35));
  for (const [label, c] of counts) {
    const n = await c;
    console.log(`  ${label}: ${n}`);
  }
  console.log("=".repeat(35));

  await prisma.$disconnect();
  pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
