/**
 * packComposer.ts — Composition d'un pack à partir du MATÉRIEL RÉEL.
 *
 * Le générateur historique (`packGenerator.ts`) raisonne sur un catalogue
 * tarifaire : il additionne des forfaits et des prix par personne. Sur une
 * demande comme « chanteur, décoration, salle pour 100 personnes, 4 000 DT »,
 * le tarif par personne du traiteur (350 DT × 100) faisait exploser le budget
 * et la proposition devenait inexploitable.
 *
 * Ici, on part de l'inverse :
 *
 *   1. on charge ce qui EXISTE vraiment en base
 *        · `crm_records` kind = 'equipment'  → le matériel (prix de location)
 *        · `crm_records` kind = 'personnel'  → les équipes
 *        · `services` + `providers`          → salles, traiteur, decoration,
 *                                              musique, photo, mobilier
 *   2. on lit la demande en langage courant et on repère les choix explicites
 *   3. on remplit le reste avec le strict nécessaire, du plus important au
 *      plus secondaire
 *   4. le BUDGET EST UNE BORNE : la formule « Dans le budget » ne la dépasse
 *      jamais. Ce qui ne rentre pas est-named explicitly, chiffré, et reporté
 *      dans les avertissements — jamais silencieusement rogné.
 */

import { pgPool } from "./prisma";
import type {
  ClientBrief,
  GeneratedItem,
  GeneratedProposal,
  GenerationResult,
  ItemCategory,
  Tier,
} from "./packGenerator";

// ─────────────────────────────────────────────
// Ressources
// ─────────────────────────────────────────────

export interface Resource {
  key: string;
  nom: string;
  /** Où la ressource est gérée dans l'application */
  source: "equipement" | "personnel" | "service";
  category: ItemCategory;
  /** Famille métier, sert au regroupement et à la détection de synonyms */
  famille: string;
  description: string;
  /** Prix de vente du pack : location pour le matériel, tarif base sinon */
  prix: number;
  /** true si `prix` est un prix par invité (à multiplier par nb_invites) */
  parInvite: boolean;
  /** Capacité d'une salle, si connue */
  seats: number | null;
  fournisseur: string | null;
  disponible: boolean;
}

/** Casse le texte en jetons normalisés (sans accents), pour le rapprochement. */
function normalise(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Un mot-clé ne doit JAMAIS matcher au milieu d'un autre mot : « son » est
 * présent dans « personnes ». On travaille donc sur des mots entiers, et sur
 * des expressions si le mot-clé en contient plusieurs.
 */
function contientMotCle(texte: string, motCle: string): boolean {
  if (motCle.includes(" ")) return ` ${texte} `.includes(` ${motCle} `);
  return texte.split(" ").includes(motCle);
}

/** Synonyms parlants → famille métier. C'est ce qui permet de comprendre
 *  « le chanteur » ou « de la deco » sans que le client connaisse nos noms. */
const FAMILLES: Array<{ slug: string; mots: string[] }> = [
  { slug: "musique", mots: ["chanteur", "chanteuse", "chante", "musicien", "musicienne", "groupe", "orchestre", "dj", "set", "live", "music", "danse", "animation musicale"] },
  { slug: "decoration", mots: ["decoration", "deco", "decor", "fleur", "fleuriste", "ambiance", "arche", "bouquet", "decoration kammoun", "kammoun"] },
  { slug: "lumiere", mots: ["lumiere", "eclairage", "projecteur", "spot", "jeux de lumiere", "lyre", "ambiance lumineuse"] },
  { slug: "son", mots: ["son", "sono", "sonorisation", "micro", "microphone", "enceinte", "ampli", "amplificateur", "sonore", "disc jockey"] },
  { slug: "salle", mots: ["salle", "lieu", "local", "reception", "salle de fete", "salle des fêtes", "palais", "domaine"] },
  { slug: "traiteur", mots: ["traiteur", "repas", "menu", "restauration", "cocktail", "buffet", "diner", "dejeuner", "pause", "gouter", "aperitif", "hotspot"] },
  { slug: "mobilier", mots: ["table", "tables", "chaise", "chaises", "nappe", "nappes", "mobilier", "buffet", "piste de danse", "velours", "drap"] },
  { slug: "photo", mots: ["photo", "photographe", "photographie", "camera", "cameraperson", "album", "video", "videaste", "drone"] },
  { slug: "planning", mots: ["planner", "planning", "organisateur", "coordination", "wedding planner"] },
  { slug: "coiffure", mots: ["coiffure", "coiffeur", "coiffeuse", "maquillage", "makeup", "maquilleur"] },
];

/** Catégorie d'affichage par famille (alignée sur `ItemCategory`). */
const FAMILLE_CATEGORY: Record<string, ItemCategory> = {
  salle: "lieu",
  traiteur: "service",
  decoration: "service",
  photo: "service",
  planning: "service",
  coiffure: "service",
  musique: "personnel",
  lumiere: "equipement",
  son: "equipement",
  mobilier: "equipement",
};

const SERVICE_FAMILLE: Record<string, string> = {
  salle: "salle",
  traiteur: "traiteur",
  decorateur: "decoration",
  fleuriste: "decoration",
  photographe: "photo",
  planner: "planning",
  musique: "musique",
  visagiste: "coiffure",
  materiel: "mobilier",
};

/** Matériel : famille déduite de la catégorie saisie par l'admin. */
function familleEquipement(categorie: string, nom: string): string {
  const c = normalise(categorie);
  const n = normalise(nom);
  if (/lum|led|projecteur|spot|eclairage/.test(c) || /lumiere|light/.test(n)) return "lumiere";
  if (/son|audio|disc jockey|video/.test(c) || /sono|son |dj|rock|musique/.test(n)) return "son";
  if (/decor|fleur|ambiance/.test(c) || /decor|fleur/.test(n)) return "decoration";
  if (/table|chaise|mobilier|nappe/.test(c) || /table|chaise/.test(n)) return "mobilier";
  if (/video|ecran|projecteur|led/.test(c)) return "lumiere";
  return "mobilier";
}

interface EquipmentRow {
  data: Record<string, unknown> | null;
}
interface PersonnelRow {
  data: Record<string, unknown> | null;
}
interface ServiceRow {
  id: string;
  name: string;
  basePrice: number;
  priceType: string;
  typeSlug: string | null;
  shortDescription: string | null;
  providerName: string | null;
}

let cache: { at: number; resources: Resource[] } | null = null;
const CACHE_TTL = 60_000;

/**
 * Charge le parc réel : matériel, personnel, prestations.
 * Le cache est court pour qu'un tarif modifié en admin soit pris en compte
 * sans redémarrer le serveur.
 */
export async function loadResources(force = false): Promise<Resource[]> {
  const now = Date.now();
  if (!force && cache && now - cache.at < CACHE_TTL) return cache.resources;

  const [equipRows, persRows, serviceRows] = await Promise.all([
    pgPool.query<EquipmentRow>(`SELECT data FROM crm_records WHERE kind = 'equipment'`),
    pgPool.query<PersonnelRow>(`SELECT data FROM crm_records WHERE kind = 'personnel'`),
    pgPool.query<ServiceRow>(`
      SELECT s.id, s.name, s."basePrice", s."priceType", st.slug AS "typeSlug",
             s."shortDescription",
             (SELECT p.name FROM providers p WHERE p."serviceId" = s.id AND p.active
               ORDER BY p.price DESC NULLS LAST LIMIT 1) AS "providerName"
        FROM services s
        LEFT JOIN service_types st ON st.id = s."typeId"
       WHERE s.active AND s."basePrice" > 0
       ORDER BY s."basePrice"`),
  ]);

  const resources: Resource[] = [];

  for (const row of equipRows.rows) {
    const d = (row.data ?? {}) as Record<string, any>;
    const nom = String(d.nom ?? "").trim();
    if (!nom) continue;
    const famille = familleEquipement(String(d.categorie ?? ""), nom);
    const prix = Number(d.prix_location ?? d.prix ?? 0);
    resources.push({
      key: `equip_${normalise(nom).replace(/ /g, "_")}`,
      nom,
      source: "equipement",
      category: "equipement",
      famille,
      description: String(d.description ?? "").trim() || `${d.categorie ?? "Matériel"} — location`,
      prix: Number.isFinite(prix) ? prix : 0,
      parInvite: false,
      seats: null,
      fournisseur: null,
      // Un matériel indisponible n'a rien à faire dans une proposition.
      disponible: normalise(String(d.disponibilite ?? "disponible")) !== "indisponible",
    });
  }

  for (const row of persRows.rows) {
    const d = (row.data ?? {}) as Record<string, any>;
    const nom = String(d.name ?? d.nom ?? "").trim();
    if (!nom) continue;
    const famille = /music|chant|son|dj|orchestre|groupe/i.test(nom) ? "musique" : "personnel";
    resources.push({
      key: `pers_${normalise(nom).replace(/ /g, "_")}`,
      nom,
      source: "personnel",
      category: "personnel",
      famille,
      description: String(d.description ?? "").trim() || "Prestataire interne",
      prix: Number(d.prix ?? 0) || 0,
      parInvite: false,
      seats: null,
      fournisseur: null,
      disponible: normalise(String(d.status ?? "active")) === "active",
    });
  }

  for (const row of serviceRows.rows) {
    const typeSlug = (row.typeSlug ?? "").toLowerCase();
    const famille = SERVICE_FAMILLE[typeSlug] ?? typeSlug ?? "service";
    // Une capacité explicite dans le nom (« Salle 200 ») est exploitée.
    const cap = row.name.match(/(\d{2,4})\s*(pers|places|personnes)?/i);
    resources.push({
      key: `svc_${(row.name || row.id).toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      nom: row.name,
      source: "service",
      category: FAMILLE_CATEGORY[famille] ?? "service",
      famille,
      description: row.shortDescription ?? "",
      prix: Number(row.basePrice) || 0,
      parInvite: row.priceType === "PAR_PERSONNE",
      seats: cap ? Number(cap[1]) : null,
      fournisseur: row.providerName ?? null,
      disponible: true,
    });
  }

  cache = { at: Date.now(), resources };
  return resources;
}

export function clearResourceCache(): void {
  cache = null;
}

// ─────────────────────────────────────────────
// Lecture de la demande
// ─────────────────────────────────────────────

/** Un choix que le client a demandé explicitement, avec son coût. */
interface Wish {
  ressource: Resource;
  /** Ligne correspondante dans sa demande, pour l'expliquer */
  motif: string;
  /** Ligne exacte trouvée dans le catalogue */
  exact: boolean;
  /** Le nom de la ressource commence par le mot demandé */
  litteral: boolean;
}

/**
 * Repère les choix explicites dans le texte : « le chanteur X », « une salle
 * pour 100 personnes », « la decoration kammoun »…
 *
 * Trois passes, de la plus précise à la plus floue :
 *   a. le nom de la ressource apparaît tel quel  → l client's X existe
 *   b. le nom de la famille apparaît             → « un chanteur »
 *   c. le nom unknowed mais un mot-clé correspond → on signale l'absence
 */
function extractWishes(resources: Resource[], texts: string[], invites: number): { wishes: Wish[]; introuvables: string[] } {
  const pool = texts.map(normalise).filter(Boolean);
  const full = pool.join(" ");
  const wants: Wish[] = [];
  const introuvables: string[] = [];

  for (const r of resources) {
    if (!r.disponible || r.prix <= 0) continue;
    const nomN = normalise(r.nom);
    const exact = nomN.length >= 3 && pool.some(t => t.includes(nomN));
    if (exact) {
      wants.push({ ressource: r, motif: `« ${r.nom} » est au catalogue`, exact: true, litteral: true });
      continue;
    }
  }

  // Un choix par famille : celui qui est nommé l'emporte, sinon le moins cher.
  const parFamille = new Map<string, Wish>();
  for (const r of resources) {
    if (!r.disponible || r.prix <= 0) continue;
    if (wants.some(w => w.ressource.key === r.key)) continue; // déjà pris au tire exact
    const famille = FAMILLES.find(f => f.slug === r.famille);
    if (!famille) continue;
    const touche = famille.mots.find(m => contientMotCle(full, m));
    if (!touche) continue;
    const nomN = normalise(r.nom);
    const nomme = nomN.length >= 3 && pool.some(t => t.includes(nomN));
    // « decoration kammoun » commence par le mot demandé : c'est la réponse
    // la plus littérale, elle passe avant un fleuriste moins cher.
    const litteral = nomN.startsWith(touche);
    const courant = parFamille.get(r.famille);
    // Score : un nom cité l'emporte, puis le nom qui commence par le mot
    // demandé, et seulement ensuite le prix.
    const score = (nomme ? 1_000_000 : litteral ? 100_000 : 0) - coutLigne(r, invites);
    const courantScore = courant
      ? (courant.exact ? 1_000_000 : courant.motif.startsWith("«") && courant.motif.includes("est au catalogue")
          ? 1_000_000
          : courant.litteral
            ? 100_000
            : 0) - coutLigne(courant.ressource, invites)
      : -Infinity;
    if (score > courantScore) {
      parFamille.set(r.famille, {
        ressource: r,
        motif: nomme ? `« ${r.nom} » est au catalogue` : `« ${touche} »`,
        exact: nomme,
        litteral,
      });
    }
  }
  for (const w of parFamille.values()) wants.push(w);

  // Repérer un nom demandé mais absent du catalogue (« le chanteur X »).
  for (const t of pool) {
    // Mot de rôle + NOM PROPRE : « le chanteur X », « la decoration Kammoun »
    const m = t.match(
      /\b(?:le|la|un|une|du|des|artiste|chanteur|chanteuse|musicien|groupe|decorateur|traiteur|prestataire)\s+([a-z][\w'-]{3,})\b/,
    );
    if (!m) continue;
    const nom = m[1].trim();
    if (nom.length < 4) continue;
    // Ignore les mots génériques (« un chanteur », « une salle »).
    if (FAMILLES.some(f => f.mots.includes(nom))) continue;
    if (resources.some(r => normalise(r.nom).includes(nom))) continue;
    if (!introuvables.includes(nom)) introuvables.push(nom);
  }

  return { wishes: wants, introuvables };
}

/**
 * Certaines prestations sont facturées « par personne concernée », pas par
 * invité : une coiffure ou un maquillage concerne la mariée, pas les 120
 * convives. 250 DT × 120 donnerait 30 000 DT, sans rapport avec la prestation.
 */
const UNIT_NOT_PER_GUEST = new Set(["coiffure"]);

/** Coût réel d'une ligne pour l'effectif demandé. */
function coutLigne(r: Resource, invites: number): number {
  if (r.parInvite && UNIT_NOT_PER_GUEST.has(r.famille)) return r.prix;
  return r.parInvite ? r.prix * Math.max(1, invites) : r.prix;
}

/**
 * Transforme une ressource en ligne de pack.
 * `depassement` est le nombre de DT au-dessus du budget que cette ligne
 * provoque : on l'affiche sur la ligne pour que l'écart soit lisible.
 */
function toItem(r: Resource, invites: number, duree: number, order: number, depassement: number): GeneratedItem {
  const montant = coutLigne(r, invites);
  const parInvite = r.parInvite && !UNIT_NOT_PER_GUEST.has(r.famille);
  const unite = parInvite ? `${invites} invités × ${r.prix} DT` : `${duree} h`;
  return {
    category: r.category,
    // Le nom reste propre : il devient le nom de la ligne quand l'admin
    // transforme la proposition en vrai pack. L'écart de budget, lui, vit
    // dans la description et dans les avertissements.
    name: r.nom,
    description: [
      r.description,
      r.fournisseur ? `Prestataire : ${r.fournisseur}` : "",
      r.source === "equipement" ? "Matériel du parc, disponibilité à confirmer" : "",
      depassement > 0 ? `Dépasse le budget de ${Math.round(depassement)} DT` : "",
    ].filter(Boolean).join(" · "),
    defaultValue: unite,
    unitPrice: montant,
    customizable: true,
    order,
    sur_demande: r.source === "personnel",
  };
}

/** Poste indispensable ajouté d'office, du plus critique au moins critique. */
function essentielsPour(brief: ClientBrief): string[] {
  const base = ["mobilier", "lumiere"];
  if (brief.type_evenement === "concert" || brief.type_evenement === "fete" || brief.type_evenement === "mariage") {
    base.push("son");
  }
  if (brief.type_evenement === "mariage") base.push("photo");
  return base;
}

interface Options {
  /** La borne est un plafond infranchissable. */
  budgetCap: number | null;
  /** On accepte de dépasser pour honorer les choix explicites. */
  allowOverflow: boolean;
  /** On ajoute des postes agréables même au-delà du budget. */
  avecBonus: boolean;
}

function construire(
  brief: ClientBrief,
  resources: Resource[],
  wishes: Wish[],
  opts: Options,
): { items: GeneratedItem[]; total: number; ecarts: string[] } {
  const invites = Math.max(1, brief.nb_invites || 50);
  const duree = Math.max(1, brief.duree_heures || 5);
  const pris = new Set<string>();
  const items: GeneratedItem[] = [];
  const ecarts: string[] = [];
  let total = 0;

  const ajouter = (r: Resource, prioritaire: boolean): boolean => {
    const cout = coutLigne(r, invites);
    if (pris.has(r.key)) return true;
    const depassement = opts.budgetCap === null ? 0 : total + cout - opts.budgetCap;
    if (depassement > 0 && !(opts.allowOverflow && prioritaire)) {
      return false;
    }
    pris.add(r.key);
    items.push(toItem(r, invites, duree, items.length, depassement > 0 ? depassement : 0));
    total += cout;
    return true;
  };

  // 1. La salle : sans lieu, il n'y a pas d'événement.
  if (brief.type_evenement !== "concert") {
    const salles = resources
      .filter(r => r.famille === "salle" && r.disponible && r.prix > 0)
      .sort((a, b) => {
        // Une salle dont la capacité est connue et suffisante passe devant.
        if (a.seats && b.seats && a.seats >= invites && b.seats < invites) return -1;
        if (b.seats && a.seats && b.seats >= invites && a.seats < invites) return 1;
        return a.prix - b.prix;
      });
    for (const s of salles) {
      if (ajouter(s, true)) break;
    }
    if (items.length === 0 && salles[0]) {
      // Même la salle la moins chère dépasse : on l'assume et on le dit.
      ajouter(salles[0], true);
      ecarts.push(`La salle la moins chère du catalogue (${salles[0].nom}, ${salles[0].prix} DT) dépasse déjà le budget.`);
    }
  }

  // 2. Les choix explicites du client : non négociables.
  for (const w of wishes) {
    if (w.ressource.famille === "salle" && items.some(i => i.name.startsWith(w.ressource.nom))) continue;
    const cout = coutLigne(w.ressource, invites);
    if (opts.budgetCap !== null && total + cout > opts.budgetCap && !opts.allowOverflow) {
      const manque = total + cout - opts.budgetCap;
      ecarts.push(
        `« ${w.ressource.nom} » (${cout} DT) ne rentre pas dans le budget : il manque ${manque} DT. ` +
        `Ajouté dans la formule supérieure.`,
      );
      continue;
    }
    ajouter(w.ressource, true);
  }

  // 3. Le strict nécessaire pour que l'événement se tienne.
  for (const famille of essentielsPour(brief)) {
    if ([...pris].some(k => resources.find(r => r.key === k)?.famille === famille)) continue;
    const candidat = resources
      .filter(r => r.famille === famille && r.disponible && r.prix > 0 && !pris.has(r.key))
      .sort((a, b) => a.prix - b.prix)[0];
    if (candidat) ajouter(candidat, false);
  }

  // 4. Les agréments, tant que la caisse le permet.
  if (opts.avecBonus) {
    for (const famille of ["decoration", "photo", "planning", "coiffure"]) {
      if ([...pris].some(k => resources.find(r => r.key === k)?.famille === famille)) continue;
      const candidat = resources
        .filter(r => r.famille === famille && r.disponible && r.prix > 0 && !pris.has(r.key))
        .sort((a, b) => a.prix - b.prix)[0];
      if (!candidat) continue;
      if (opts.budgetCap !== null && total + coutLigne(candidat, invites) > opts.budgetCap) break;
      ajouter(candidat, false);
    }
  }

  return { items, total, ecarts };
}

function features(items: GeneratedItem[]): string[] {
  return items.map(i => i.name.split(" (+")[0]);
}

/**
 * Compose trois formules à partir d'une même demande :
 *   · Essentiel  — tient dans le budget, l'essentiel strict
 *   · Équilibré  — honore TOUS les choix du client, avec alerte si ça dépasse
 *   · Premium    — tout le catalogue utile, budget ignoré
 */
export async function composePacks(brief: ClientBrief, moteur: "openai" | "regles"): Promise<GenerationResult> {
  const resources = await loadResources();
  const texts = [brief.message ?? "", ...(brief.demandes_speciales ?? [])].filter(Boolean);
  const { wishes, introuvables } = extractWishes(resources, texts, Math.max(1, brief.nb_invites || 50));
  const invites = Math.max(1, brief.nb_invites || 50);
  const duree = Math.max(1, brief.duree_heures || 5);

  const avertissements: string[] = [];
  if (!resources.length) {
    return {
      brief,
      propositions: [],
      budget_cible: brief.budget,
      moteur,
      avertissements: [
        "Aucun matériel ou prestation n'est enregistré. Ajoutez des équipements ou des services avant de générer un pack.",
      ],
    };
  }

  const budget = brief.budget > 0 ? brief.budget : null;

  if (introuvables.length) {
    const substituts = wishes
      .filter(w => !w.exact)
      .map(w => `${w.ressource.nom} (${coutLigne(w.ressource, invites)} DT)`);
    avertissements.push(
      `Aucun équipement ne porte le nom ${introuvables.map(n => `« ${n} »`).join(", ")} dans le parc.` +
      (substituts.length
        ? ` Proposition retenue à la place : ${substituts.join(", ")}. Ajoutez-le au catalogue pour qu'il soit proposé.`
        : " Ajoute l'équipement concerné dans « Équipements » pour qu'il soit proposé."),
    );
  }
  if (!/[0-9]/.test(texts.join(" "))) {
    avertissements.push(`Effectif non précisé : ${invites} invités retenus par défaut.`);
  }
  if (wishes.length) {
    avertissements.push(
      `Choix repris du parc : ${wishes.map(w => `${w.ressource.nom} — ${w.motif}`).join(" · ")}.`,
    );
  }

  // Une prestation « par personne » qui ne rentre pas est une information
  // capitale : on la chiffre explicitement plutôt que de la taire.
  if (budget) {
    const exclus = resources.filter(
      r => r.disponible && r.parInvite && !UNIT_NOT_PER_GUEST.has(r.famille) &&
        !wishes.some(w => w.ressource.key === r.key) &&
        coutLigne(r, invites) > budget,
    );
    for (const r of exclus.slice(0, 3)) {
      avertissements.push(
        `${r.nom} n'est pas inclus : ${r.prix} DT × ${invites} invités = ${coutLigne(r, invites)} DT, ` +
        `soit ${coutLigne(r, invites) - budget} DT au-dessus du budget. ` +
        `Accessible à partir de ${Math.ceil(coutLigne(r, invites) / 100) * 100} DT.`,
      );
    }
  }

  const essentiel = construire(brief, resources, wishes, { budgetCap: budget, allowOverflow: false, avecBonus: false });
  const equilibre = construire(brief, resources, wishes, { budgetCap: budget, allowOverflow: true, avecBonus: false });
  const premium = construire(brief, resources, wishes, { budgetCap: null, allowOverflow: true, avecBonus: true });

  const tiers: Array<{ tier: Tier; nom: string; desc: string; built: ReturnType<typeof construire> }> = [
    {
      tier: "essentiel",
      nom: `Événement - Formule Essentielle`,
      desc: `Le nécessaire pour ${invites} invités, sans dépasser ${budget ? budget + " DT" : "le budget"}.`,
      built: essentiel,
    },
    {
      tier: "equilibre",
      nom: `Événement - Formule Signature`,
      desc: "Tous les choix demandés, complétés par l'indispensable.",
      built: equilibre,
    },
    {
      tier: "premium",
      nom: `Événement - Formule Grand Standing`,
      desc: "Tout le catalogue utile pour cet événement, sans contrainte de budget.",
      built: premium,
    },
  ];

  const propositions: GeneratedProposal[] = tiers
    .filter(t => t.built.items.length > 0)
    .map(t => ({
      key: t.tier,
      name: t.nom,
      tier: t.tier,
      description: t.desc,
      price: t.built.total,
      duration: duree,
      maxGuests: invites,
      badge: t.tier === "equilibre" ? "Recommandé" : null,
      features: features(t.built.items),
      items: t.built.items,
      avertissements: [...avertissements, ...t.built.ecarts],
    }));

  // Si la formule « dans le budget » n'existe pas, on le dit franchement.
  if (budget && propositions.length && propositions[0].price > budget) {
    avertissements.push(
      `Le minimum vendable au tarif du parc est de ${Math.min(...propositions.map(p => p.price))} DT, ` +
      `au-dessus du budget de ${budget} DT. Aucune formule ne peut tenir dans cette enveloppe.`,
    );
  }

  return {
    brief,
    propositions,
    budget_cible: budget ?? 0,
    moteur,
    avertissements: [...avertissements, ...essentiel.ecarts],
  };
}