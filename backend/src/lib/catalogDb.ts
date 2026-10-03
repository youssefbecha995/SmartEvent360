/**
 * catalogDb.ts — Source de vérité tarifaire du générateur de packs.
 *
 * Le catalogue n'est plus codé en dur : il est lu dans la base, où vivent
 * les vraies prestations commercialisées.
 *
 *   service_types        → famille de prestation (salle, traiteur, musique…)
 *   services             → catalogue + PRIX DE VENTE (basePrice, priceType)
 *   service_parameters   →Signaux qu'une prestation est personnalisable
 *   providers            → le personnel rattaché, avec son prix et sa ville
 *
 * Le mapping est 100 % dérivé des données, aucune constante métier n'est
 * recopiée ici : changer un tarif en base change immédiatement les packs.
 *
 * `priceType` pilote la formule de coût :
 *   FIXE           → forfait, indépendant du nombre d'invités (une salle)
 *   PAR_PERSONNE   → tarif par invité (le traiteur)
 *   A_PARTIR_DE    → prix plancher, qui croît avec l'effectif (la décoration)
 */

import { pgPool } from "./prisma";
import type { EventType, ItemCategory, Tier } from "./packGenerator";

/** Forme d'un élément de catalogue, alignée sur le moteur de génération. */
export interface CatalogItem {
  key: string;
  category: ItemCategory;
  label: string;
  description: string;
  /** Prix de référence en DT pour ~100 invités (poste fixe) */
  base?: number;
  /** Prix en DT par invité (poste variable) */
  perGuest?: number;
  /** Le poste varie-t-il avec le nombre d'invités ? */
  guestSensitive?: boolean;
  /** Types d'événements concernés — "general" couvre tous */
  tags: EventType[];
  /** Paliers qui l'incluent : essentiel < equilibre < premium */
  tiers: Tier[];
  customizable?: boolean;
  /** Poids relatif dans le budget (déduit du montant, sert au départage) */
  poids: number;

  // ── Métadonnées du catalogue réel, conservées pour l'affichage ──────────────
  /** `service_types.slug` : traiteur, salle, musique, materiel… */
  typeSlug: string;
  serviceId: string;
  /** Unité de vente d'origine, pour restituer « 350 DT / personne ». */
  priceType: "FIXE" | "PAR_PERSONNE" | "A_PARTIR_DE";
  /** Prestataire rattaché (nom, ville, téléphone) s'il existe. */
  provider?: { name: string; city: string | null; phone: string | null };
  /** Nombre d'options configurables détectées. */
  optionsCount: number;
}

/** Famille de prestation → catégorie d'affichage d'un pack. */
const TYPE_TO_CATEGORY: Record<string, ItemCategory> = {
  salle: "lieu",
  traiteur: "service",
  decorateur: "service",
  photographe: "service",
  fleuriste: "service",
  planner: "service",
  musique: "personnel",
  visagiste: "personnel",
  animateur: "personnel",
  coiffure: "personnel",
  makeup: "personnel",
  materiel: "equipement",
  sonorisation: "equipement",
  eclairage: "equipement",
  instrumentation: "instrument",
  sono: "instrument",
};

/**
 * Familles dont le prix « par personne » ne se multiplie PAS par le nombre
 * d'invités. Une coiffure ou un maquillage se facture par personne coiffée
 * (la mariée), pas par invité : facturer 250 DT × 120 invités produirait un
 * poste à 30 000 DT, sans rapport avec la prestation.
 *
 * La donnée en base ne porte pas cette distinction ; on la pose donc ici, par
 * famille, et le prix devient un forfait.
 */
const UNIT_NOT_PER_GUEST = new Set(["visagiste", "coiffure", "makeup"]);

/**
 * Affinités par famille : ce qu'une famille apporte, et à quels événements.
 * Déduit du nom de la famille et de son contenu, pas d'une liste de prix.
 */
const TYPE_TAGS: Record<string, EventType[]> = {
  salle: ["general"],
  traiteur: ["general"],
  decorateur: ["general"],
  photographe: ["mariage", "naissance", "fete", "corporate"],
  fleuriste: ["mariage", "naissance", "fete"],
  planner: ["mariage", "corporate"],
  musique: ["general"],
  visagiste: ["mariage", "fete"],
  materiel: ["general"],
  sonorisation: ["general"],
  eclairage: ["general"],
  instrumentation: ["general"],
};

/** Termes du nom du service qui orientent vers un événement particulier. */
const NAME_TAG_HINTS: Array<{ re: RegExp; tag: EventType }> = [
  { re: /mariage|noce|fiançailles|fiancailles|engagement/i, tag: "mariage" },
  { re: /corporate|s[ée]minaire|con[ée]rence|entreprise|seminaire|reunion/i, tag: "corporate" },
  { re: /naissance|bapt[êe]me|baby/i, tag: "naissance" },
  { re: /anniversaire|f[êe]te|graduation|soutenance/i, tag: "fete" },
  { re: /concert|festival|live|tourn[ée]e|showcase/i, tag: "concert" },
];

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Convertit une ligne SQL `services` (+ jointures) en élément de catalogue.
 * La répartition en paliers est déduite du prix relatif dans sa catégorie :
 * l'entrée de gamme part dans « essentiel », la plus chère dans « premium ».
 */
function toCatalogItem(
  row: CatalogRow,
  prixParFamille: Map<string, number[]>,
): CatalogItem | null {
  const typeSlug = (row.typeSlug || "service").toLowerCase();
  const category = TYPE_TO_CATEGORY[typeSlug] ?? "service";

  const prix = Number(row.basePrice ?? 0);
  if (!Number.isFinite(prix) || prix <= 0) return null;

  const priceType = (row.priceType ?? "FIXE") as CatalogItem["priceType"];

  // Une prestation à l'unité « par personne » qui ne suit pas l'effectif est
  // traitée comme un forfait : le montant de base reste celui de la base.
  const parInvite = priceType === "PAR_PERSONNE" && !UNIT_NOT_PER_GUEST.has(typeSlug);

  const item: CatalogItem = {
    key: row.code || slugify(row.name),
    category,
    label: row.name,
    description: row.shortDescription || row.description || row.name,
    tags: TYPE_TAGS[typeSlug] ?? ["general"],
    // `poids` : un poste cher pèse plus dans le budget. Ancrée sur le coût réel
    // pour 100 invités, qui est exactement ce que manipule le moteur.
    poids: 0,
    typeSlug,
    serviceId: row.id,
    priceType,
    optionsCount: Number(row.optionsCount ?? 0),
    tiers: ["essentiel", "equilibre", "premium"],
    // Une prestation qui propose des options est, par nature, personnalisable.
    customizable: Number(row.optionsCount ?? 0) > 0,
  };

  if (parInvite) item.perGuest = prix;
  else if (priceType === "A_PARTIR_DE") { item.base = prix; item.guestSensitive = true; }
  else item.base = prix;

  item.poids = item.perGuest !== undefined ? item.perGuest * 100 : prix;

  // Paliers : classement dans la FAMILLE, du moins cher au plus cher.
  // Comparer un traiteur à un photographe n'aurait pas de sens ; en revanche
  // « la salle à 2 500 DT » est bien l'entrée de gamme des salles et « la salle
  // à 4 000 DT » son offre haute. C'est cette exclusivité qui différencie les
  // trois formules.
  const familiaux = (prixParFamille.get(typeSlug) ?? []).slice().sort((a, b) => a - b);
  if (familiaux.length >= 2) {
    const rang = familiaux.indexOf(prix);
    if (rang === 0) item.tiers = ["essentiel", "equilibre"];
    else if (rang === familiaux.length - 1) item.tiers = ["equilibre", "premium"];
  }

  // Affinités liées au nom du service (un « traiteur mariage » ≠ un
  // « traiteur d'entreprise »).
  for (const { re, tag } of NAME_TAG_HINTS) {
    if (re.test(row.name) && !item.tags.includes(tag)) item.tags.push(tag);
  }

  if (row.providerName) {
    item.provider = {
      name: row.providerName,
      city: row.providerCity,
      phone: row.providerPhone,
    };
  }

  return item;
}

interface CatalogRow {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  shortDescription: string | null;
  basePrice: number | null;
  priceType: string | null;
  active: boolean;
  visibleForClients: boolean;
  optionsCount: number;
  typeSlug: string | null;
  providerName: string | null;
  providerCity: string | null;
  providerPhone: string | null;
}

export interface Catalog {
  items: CatalogItem[];
  /** true quand le catalogue provient bien de la base */
  source: "base" | "repli";
  /** Récupéré à */
  loadedAt: string;
}

const CACHE_TTL_MS = 60_000;

/**
 * Catalogue de repli : uniquement si la base est injoignable, on évite de
 * laisser le générateur muet. Prix volontairement conservateurs, et surtout
 * signalés comme non fiables.
 */
const FALLBACK: CatalogItem[] = [
  { key: "fallback_salle", category: "lieu", label: "Salle de réception", description: "Salle climatisée, ménage et technique inclus.", base: 2500, guestSensitive: true, tags: ["general"], tiers: ["essentiel", "equilibre", "premium"], customizable: true, poids: 2500, typeSlug: "salle", serviceId: "fallback", priceType: "A_PARTIR_DE", optionsCount: 0 },
  { key: "fallback_traiteur", category: "service", label: "Traiteur", description: "Menu complet, personnel de service inclus.", perGuest: 60, tags: ["general"], tiers: ["essentiel", "equilibre", "premium"], customizable: true, poids: 6000, typeSlug: "traiteur", serviceId: "fallback", priceType: "PAR_PERSONNE", optionsCount: 3 },
  { key: "fallback_musique", category: "personnel", label: "Animation musicale", description: "DJ ou groupe musical.", base: 900, tags: ["general"], tiers: ["essentiel", "equilibre", "premium"], customizable: true, poids: 900, typeSlug: "musique", serviceId: "fallback", priceType: "FIXE", optionsCount: 4 },
];

let cache: Catalog | null = null;
let cacheAt = 0;

/**
 * Charge le catalogue commercialisé depuis la base, avec cache court (les
 * tarifs changent rarement, mais un admin doit voir son effet sans
 * redémarrer le serveur).
 */
export async function loadServiceCatalog(force = false): Promise<Catalog> {
  const now = Date.now();
  if (!force && cache && now - cacheAt < CACHE_TTL_MS) return cache;

  try {
    const { rows } = await pgPool.query(`
      SELECT
        s.id, s.name, s.code, s.description, s."shortDescription",
        s."basePrice", s."priceType", s.active, s."visibleForClients",
        st.slug AS "typeSlug",
        COALESCE(sp."optionsCount", 0) AS "optionsCount",
        pv.name AS "providerName", pv.city AS "providerCity", pv.phone AS "providerPhone"
      FROM services s
      LEFT JOIN service_types st ON st.id = s."typeId"
      LEFT JOIN (
        SELECT "serviceId", count(*)::int AS "optionsCount"
        FROM service_parameters GROUP BY "serviceId"
      ) sp ON sp."serviceId" = s.id
      LEFT JOIN LATERAL (
        SELECT name, city, phone FROM providers p
        WHERE p."serviceId" = s.id AND p.active
        ORDER BY p.price DESC NULLS LAST, p.name
        LIMIT 1
      ) pv ON TRUE
      WHERE s.active AND s."basePrice" > 0
      ORDER BY st."displayOrder" NULLS LAST, s."displayOrder" NULLS LAST, s.name
    `);

    const catalogRows = rows as CatalogRow[];

    const prixParFamille = new Map<string, number[]>();
    for (const r of catalogRows) {
      const typeSlug = (r.typeSlug || "service").toLowerCase();
      const category = TYPE_TO_CATEGORY[typeSlug] ?? "service";
      const prix = Number(r.basePrice ?? 0);
      if (!prix) continue;
      const l = prixParFamille.get(typeSlug) ?? [];
      l.push(prix);
      prixParFamille.set(typeSlug, l);
    }

    const items = catalogRows
      .map(r => toCatalogItem(r, prixParFamille))
      .filter((x): x is CatalogItem => x !== null);

    if (!items.length) throw new Error("aucun service tarifé en base");

    cache = { items, source: "base", loadedAt: new Date().toISOString() };
    cacheAt = Date.now();
    return cache;
  } catch (e) {
    console.error("[catalogDb] lecture du catalogue impossible, repli en usage :", (e as Error).message);
    cache = { items: FALLBACK, source: "repli", loadedAt: new Date().toISOString() };
    cacheAt = Date.now();
    return cache;
  }
}

/** Vide le cache (tests, ou après une modification des tarifs). */
export function clearCatalogCache(): void {
  cache = null;
  cacheAt = 0;
}
