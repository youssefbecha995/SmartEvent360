/**
 * packGenerator.ts — Générateur de packs sur mesure.
 *
 * Deux étages complémentaires :
 *
 *  1. `parseBrief`  : transforme une demande libre du client (texte + champs)
 *                     en un brief structuré et typé. Utilise OpenAI si
 *                     OPENAI_API_KEY est défini, sinon un analyseur
 *                     heuristique FR/AR (sans réseau) — jamais bloquant.
 *
 *  2. `generateProposals` : construit N propositions de packs à partir du
 *                     catalogue tarifaire réel (table `services` de
 *                     SmartEvent360, chargé par `loadServiceCatalog`), en
 *                     répartissant le budget du client de façon
 *                     déterministe. Les prix sont ceux du catalogue ; seul le
 *                     niveau est mis à l'échelle pour se rapprocher du budget,
 *                     et si le budget est sous le minimum vendable, la
 *                     proposition remonte sur ce minimum et alerte le client
 *                     au lieu d'annoncer des postes sous leur prix de revient.
 *
 * Pourquoi déterministe plutôt que « demander le prix à un LLM » :
 * un modèle de langage est mauvais en arithmétique commerciale et
 * produirait des totaux qui ne correspondent pas à la somme des lignes.
 * Ici le LLM ne sert qu'à comprendre la demande ; les prix sont calculés.
 */

import { loadServiceCatalog, type CatalogItem } from "./catalogDb";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type ItemCategory = "lieu" | "equipement" | "personnel" | "instrument" | "service";

export type EventType = "mariage" | "corporate" | "naissance" | "fete" | "concert" | "general";

export type Tier = "essentiel" | "equilibre" | "premium";

export interface ClientBrief {
  type_evenement: EventType;
  budget: number; // DT
  nb_invites: number;
  duree_heures: number;
  ville: string | null;
  date_evenement: string | null;
  /** Besoins exprimés en langage libre, ex: "le chanteur Hamza", "salon La Plage" */
  demandes_speciales: string[];
  /** Texte brut d'origine (conservé pour traçabilité) */
  message: string;
}

export interface GeneratedItem {
  category: ItemCategory;
  name: string;
  description: string;
  defaultValue: string;
  unitPrice: number; // DT
  customizable: boolean;
  order: number;
  /** true si la ligne vient d'une demande spéciale du client */
  sur_demande?: boolean;
}

export interface GeneratedProposal {
  key: string;
  name: string;
  tier: Tier;
  description: string;
  price: number;
  duration: number;
  maxGuests: number;
  badge: string | null;
  features: string[];
  items: GeneratedItem[];
  /** Écarts de faisabilité entre le budget demandé et le panier proposé. */
  avertissements: string[];
}

export interface GenerationResult {
  brief: ClientBrief;
  propositions: GeneratedProposal[];
  budget_cible: number;
  /** 'openai' si le brief a été compris par le LLM, 'regles' sinon */
  moteur: "openai" | "regles";
  /** Écarts d'interprétation à faire relire par un admin */
  avertissements: string[];
}

// ─────────────────────────────────────────────
// Catalogue de prestations
// ─────────────────────────────────────────────

// Référence du catalogue : 100 invités.
const GUEST_REF = 100;
const GUEST_MIN = 20;
const GUEST_MAX = 600;

/**
 * Familles qui composent le socle incompressible d'un événement : sans salle,
 * sans restauration et sans équipement, la proposition n'est pas vendable.
 * Cléées par `service_types.slug`, donc directement issues de la base.
 */
const CORE_FAMILIES = ["salle", "traiteur"] as const;

/** Catégories qui doivent apparaître dans chaque formule, même en cas d'arbitrage. */
const REQUIRED_CATEGORIES: ItemCategory[] = ["lieu", "service", "equipement"];

/** Facteur d'échelle guests borné : évite les prix aberrants. */
function guestFactor(n: number): number {
  return clamp(Math.sqrt(Math.max(n, GUEST_MIN) / GUEST_REF), 0.5, 3);
}

/** Coût brut d'un poste du catalogue pour un nombre d'invités donné. */
function rawCost(it: CatalogItem, guests: number): number {
  if (it.perGuest !== undefined) return it.perGuest * guests;
  if (it.guestSensitive) return (it.base ?? 0) * guestFactor(guests);
  return it.base ?? 0;
}

/** Poste le moins cher d'une famille de prestation. */
function cheapestInFamily(catalog: CatalogItem[], slug: string, guests: number): CatalogItem | undefined {
  return catalog
    .filter(it => it.typeSlug === slug && it.tiers.length > 0)
    .sort((a, b) => rawCost(a, guests) - rawCost(b, guests))[0];
}

/** Poste le moins cher d'une catégorie d'affichage. */
function cheapestInCategory(catalog: CatalogItem[], category: ItemCategory, guests: number): CatalogItem | undefined {
  return catalog
    .filter(it => it.category === category)
    .sort((a, b) => rawCost(a, guests) - rawCost(b, guests))[0];
}

/**
 * Socle incompressible, au tarif réel du catalogue le moins cher.
 * C'est le plancher au-dessous duquel aucune formule n'est honnête : avec un
 * traiteur à 350 DT/invité, un mariage de 120 personnes ne peut pas être vendu
 * 6 000 DT, et il vaut mieux le dire que le faire croire.
 *
 * Le socle est résolu dans le périmètre du palier : les entrées de gamme ne
 * sont pas proposées en formule premium, et chercher « la salle la moins chère
 * » toutes catégories confondues produirait un socle que le palier ne contient
 * pas — donc un pack premium sans salle, incohérent et invendable.
 */
function mandatoryCore(catalog: CatalogItem[], brief: ClientBrief, tier?: Tier): CatalogItem[] {
  const guests = brief.nb_invites;
  const pool = tier ? catalog.filter(it => it.tiers.includes(tier)) : catalog;
  // Le palier doit rester vendable : si une famille n'a aucune entrée dans ce
  // palier, on retombe sur l'ensemble du catalogue plutôt que de la supprimer.
  const search = pool.length > 0 ? pool : catalog;

  const core: CatalogItem[] = [];
  for (const slug of CORE_FAMILIES) {
    const item = cheapestInFamily(search, slug, guests);
    if (item) core.push(item);
  }
  const equipement =
    cheapestInCategory(search, "equipement", guests) ??
    cheapestInCategory(catalog, "equipement", guests);
  if (equipement) core.push(equipement);
  return core;
}

/** Coût du socle incompressible pour un brief donné. */
function coreCost(
  catalog: CatalogItem[],
  brief: ClientBrief,
  excludeCategories: Set<ItemCategory> = new Set(),
  tier?: Tier,
): number {
  return mandatoryCore(catalog, brief, tier).reduce(
    (sum, it) => (excludeCategories.has(it.category) ? sum : sum + rawCost(it, brief.nb_invites)),
    0,
  );
}

/**
 * Budget plancher réel pour ce brief, au tarif du catalogue : la somme du socle
 * incompressible (salle + restauration + équipement). Sert de garde-fou quand le
 * budget demandé est trop bas, et de référence pour les scripts de contrôle.
 */
export function minimumViableFor(catalog: CatalogItem[], brief: ClientBrief, tier?: Tier): number {
  return mandatoryCore(catalog, brief, tier).reduce((sum, it) => sum + rawCost(it, brief.nb_invites), 0);
}

// ─────────────────────────────────────────────
// Étage 1 — compréhension de la demande
// ─────────────────────────────────────────────

const EVENT_KEYWORDS: Array<{ type: EventType; re: RegExp }> = [
  { type: "mariage", re: /m(ariage|ariages)|wedding|\bnoce\b|fiançailles|fiancailles|engagement/i },
  { type: "corporate", re: /corporate|entreprise|s[ée]minaire|conf[ée]rence|lancement|congrès|congres|teambuilding|team building|r[ée]union|formation/i },
  { type: "naissance", re: /naissance|bapt[\u00e8]me|\bbaby\b|gender reveal/i },
  { type: "fete", re: /anniversaire|\bf[êe]te\b|soir[ée]e priv[ée]e|graduation|soutenance|fin d['’]ann[ée]e/i },
  { type: "concert", re: /concert|festival|showcase|tournee|tournée|\blive\b/i },
];

const CITY_HINTS = [
  "Tunis", "Sousse", "Sfax", "Hammamet", "Monastir", "Bizerte", "Carthage", "Nabeul",
  "Kairouan", "Tozeur", "Djerba", "Mahdia", "Gabes", "Gabès", "Ariana", "La Marsa",
  "Sidi Bou Said", "Sidi Bou Said", "Mornag", "Bordj Bou Arreridj", "Kasserine",
];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** "3 000", "3.000", "3000", "3,000" → 3000 */
function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/\s| | /g, "");
  const commaAsThousand = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned);
  const normal = commaAsThousand ? cleaned.replace(/,/g, "") : cleaned.replace(",", ".");
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

function detectEventType(text: string): EventType | null {
  for (const { type, re } of EVENT_KEYWORDS) if (re.test(text)) return type;
  return null;
}

function detectBudget(text: string): number | null {
  const re = /(\d[\d\s  .,  ]{1,12})\s*(?:dt\b|dinars?|tnd\b|euros?|€|\$)/i;
  const m = text.match(re);
  if (m) {
    const n = parseNumber(m[1]);
    if (n && n >= 100 && n <= 2_000_000) return Math.round(n);
  }
  return null;
}

function detectGuests(text: string): number | null {
  const re = /(\d[\d\s  .,  ]{0,8})\s*(?:personnes?|invit[ée]s?|pers\b|assists?|guests?|pax)/i;
  const m = text.match(re);
  if (m) {
    const n = parseNumber(m[1]);
    if (n && n >= 5 && n <= 5000) return Math.round(n);
  }
  return null;
}

function detectDuration(text: string): number | null {
  const re = /(\d[\d\s]{0,4})\s*(?:heures?|hrs?\b|\bh\b)/i;
  const m = text.match(re);
  if (m) {
    const n = parseNumber(m[1]);
    if (n && n >= 1 && n <= 48) return Math.round(n);
  }
  return null;
}

function detectCity(text: string): string | null {
  for (const city of CITY_HINTS) {
    if (new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)) return city;
  }
  return null;
}

function detectDate(text: string): string | null {
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  const fr = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
  if (fr) {
    let [, d, m, y] = fr;
    if (y.length === 2) y = `20${y}`;
    const year = Number(y);
    if (year >= 2024 && year <= 2100) {
      return `${year}-${String(Number(m)).padStart(2, "0")}-${String(Number(d)).padStart(2, "0")}`;
    }
  }
  return null;
}

type RequestKind = ItemCategory | "artiste";

/**
 * Le nom propre d'une demande s'arrête dès qu'un mot de liaison apparaît.
 * Sans cette borne, « salon La Plage a Hammamet » donnerait
 * « Plage a Hammamet » comme nom de lieu.
 */
const NAME_MAX_WORDS = 3;
const NAME_MAX_CHARS = 28;

/**
 * Déclencheurs de demandes spéciales, avec la catégorie associée.
 *
 * Seul le **déclencheur** est reconnu par regex. Le nom propre qui le suit est
 * ensuite lu en code, car une regex insensible à la casse (`i`) annule la
 * distinction entre majuscule et minuscule : `\p{Lu}` matche alors « et »,
 * « le », « de », et le nom déborde sur la clause suivante
 * (« le chanteur Hamza et le salon La Plage » → « Hamza et le salon »).
 */
const REQUEST_TRIGGERS: Array<{ kind: RequestKind; re: RegExp }> = [
  { kind: "lieu", re: /\b(?:salon|salle|lieu|venue|palais|r[ée]sidence|jardin|terrasse|plage|h[ôo]tel|dar)\b/iu },
  { kind: "artiste", re: /\b(?:chanteur|chanteuse|groupe\s+musical|artiste)\b/iu },
  { kind: "artiste", re: /\b(?:dj|animateur|animatrice|violoniste|pianiste|guitariste|saxophoniste)\b/iu },
  { kind: "personnel", re: /\b(?:photographe|photovid[ée]aste|vid[ée]aste)\b/iu },
  { kind: "instrument", re: /\b(?:piano|violon|guitare|qanoun|oud|saxophone)\b/iu },
  { kind: "service", re: /\b(?:traiteur|cuisine|g[âa]teau|cocktail)\b/iu },
  { kind: "equipement", re: /\b(?:sonorisation|[ée]clairage|[ée]cran\s+led|vid[ée]oprojection)\b/iu },
];

/** Connecteurs à sauter entre le déclencheur et le nom propre. */
const NAME_PREFIX = /^(?:de\s+|du\s+|des\s+|le\s+|la\s+|les\s+|l'|d')/iu;

/**
 * Lit un nom propre dans le texte, juste après un déclencheur.
 * Prend jusqu'à `NAME_MAX_WORDS` mots **commençant chacun par une
 * majuscule**, ce qui arrête naturellement la lecture sur « et », « le »,
 * « avec », « à »…
 */
function readNameAfter(text: string, from: number): string | null {
  let i = from;

  // Espaces, puis éventuel connecteur : « le salon **La** Plage ».
  while (i < text.length && /[\s'’]/.test(text[i])) i++;
  const prefix = text.slice(i).match(NAME_PREFIX);
  if (prefix) i += prefix[0].length;
  while (i < text.length && /\s/.test(text[i])) i++;

  const words: string[] = [];
  while (words.length < NAME_MAX_WORDS && i < text.length) {
    const m = /^[^\s,;:!?()]+/u.exec(text.slice(i));
    if (!m) break;
    const word = m[0];
    // Un mot propre commence par une majuscule ; sinon on s'arrête.
    if (!/^[\p{Lu}]/u.test(word)) break;
    words.push(word);
    i += word.length;
    if (i >= text.length || !/\s/.test(text[i])) break;
    i++;
  }

  const name = words.join(" ").replace(/[.,;:!?]+$/, "").trim();
  if (name.length < 2 || name.length > NAME_MAX_CHARS) return null;
  // Nom générique : ce n'est pas un nom propre.
  if (/^(un|une|le|la|les|des|de|du|d)$/iu.test(name)) return null;
  return name;
}

/** Segments après une tournure de demande, en dernier recours. */
const DEMAND_LEADS = /(?:je (?:voudrais|veux|souhaite|demande)|j['\u2019]aimerais|on (?:veut|souhaite)|il me faut|imperiale?ment|obligatoirement|en plus de|en plus)\s+(?:avoir\s+)?([^.;!?\n]{3,80})/gi;

interface ExtractedRequest {
  kind: RequestKind;
  label: string;
  nom: string | null;
  raw: string;
}

/**
 * Extrait les demandes spéciales du texte libre.
 *
 * Sur « pack mariage avec le chanteur Hamza et le salon La Plage a Hammamet,
 * budget 3000 DT » on doit obtenir exactement deux demandes : le chanteur
 * Hamza et le lieu La Plage — pas trois, et jamais le nom « Plage a Hammamet ».
 *
 * Règles appliquées :
 *  1. un seul déclencheur retenu par position (le premier motif qui gagne) ;
 *  2. le nom propre est lu en code, mot par mot, avec majuscule obligatoire ;
 *  3. si une catégorie possède une demande nommée, ses demandes génériques
 *     sont écartées (« lieu : Plage » l'emporte sur « lieu sur mesure ») ;
 *  4. les reformulations du besoin (« un pack mariage ») ne sont pas des
 *     demandes de prestation et sont ignorées.
 */
function extractSpecialRequests(text: string): ExtractedRequest[] {
  const found: ExtractedRequest[] = [];
  const consumed: Array<[number, number]> = [];
  const overlaps = (start: number, end: number) =>
    consumed.some(([s, e]) => start < e && end > s);

  for (const { kind, re } of REQUEST_TRIGGERS) {
    const globalRe = new RegExp(re.source, `${re.flags}g`);
    let m: RegExpExecArray | null;
    while ((m = globalRe.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (overlaps(start, end)) continue;
      consumed.push([start, end]);

      const nom = readNameAfter(text, end);
      const raw = nom ? `${m[0]} ${nom}` : m[0].replace(/\s+/g, " ").trim();
      found.push({ kind, label: buildLabel(kind, nom), nom, raw });
    }
  }

  // Tournures de demande non capturées par les déclencheurs ci-dessus.
  DEMAND_LEADS.lastIndex = 0;
  let dm: RegExpExecArray | null;
  while ((dm = DEMAND_LEADS.exec(text)) !== null) {
    const start = dm.index;
    const stopAt = dm[1].search(/[,;]|\s+(?:et|avec|pour|budget)\s+/i);
    const cut = stopAt > 0 ? stopAt : dm[1].length;
    const end = start + dm[0].length - (dm[1].length - cut);

    const raw = dm[1].slice(0, cut).replace(/\s+/g, " ").trim();
    if (raw.length < 4 || overlaps(start, end)) continue;

    // « un pack mariage », « une formule premium »… ne sont pas des
    // demandes de prestation : ce sont des reformulations du besoin.
    if (/^(un|une|le|la)\s*(pack|forfait|formule|offre)s?\b/i.test(raw)) continue;

    const kind = guessKind(raw);
    if (!kind) continue;

    consumed.push([start, end]);
    found.push({ kind, label: raw, nom: null, raw });
  }

  // 3. Une demande nommée rend caduque la demande générique de la catégorie.
  const namedKinds = new Set(found.filter(f => f.nom).map(f => f.kind));
  const kept = found.filter(f => f.nom || !namedKinds.has(f.kind));

  // Dédoublonnage sur l'identité résolue : deux formulations différentes
  // désignent la même demande.
  const uniq: ExtractedRequest[] = [];
  const seen = new Set<string>();
  for (const r of kept) {
    const key = `${r.kind}|${(r.nom ?? r.label).toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(r);
  }

  return uniq.slice(0, 5);
}

/**
 * Devine la catégorie d'une demande formulée en langage courant.
 * Retourne `null` si aucun indice métier n'est présent : mieux vaut ignorer
 * une phrase vague que d'inventer une ligne de devis.
 */
function guessKind(raw: string): RequestKind | null {
  if (/chante|musiqu|violon|piano|groupe|dj|artiste|animateur/i.test(raw)) return "artiste";
  if (/salon|salle|lieu|jardin|terrasse|plage|h[ôo]tel|venue/i.test(raw)) return "lieu";
  if (/traiteur|cuisine|menu|g[âa]teau|cocktail|buffet/i.test(raw)) return "service";
  if (/piano|violon|guitare|sax|percussion/i.test(raw)) return "instrument";
  if (/sono|[ée]clairage|[ée]cran|vid[ée]o/i.test(raw)) return "equipement";
  if (/photo|cam[ée]ra|drone|v[ée]deo/i.test(raw)) return "personnel";
  return null;
}

function buildLabel(kind: RequestKind, nom: string | null): string {
  if (kind === "lieu") return nom ? `Lieu : ${nom}` : "Lieu sur mesure";
  if (kind === "artiste") return nom ? `Artiste : ${nom}` : "Artiste live";
  if (kind === "instrument") return nom ? `Instrument : ${nom}` : "Instrument live";
  if (kind === "equipement") return nom ? `Équipement : ${nom}` : "Équipement spécifique";
  return nom ? `Service : ${nom}` : "Service spécifique";
}

const DEFAULT_BUDGET = 3000;
const DEFAULT_GUESTS = 100;
const DEFAULT_DURATION = 5;

/** Analyse heuristique — toujours disponible, aucun réseau requis. */
function parseBriefHeuristically(input: BriefInput): { brief: ClientBrief; avertissements: string[] } {
  const avertissements: string[] = [];
  const text = `${input.message ?? ""} ${[input.demandes_speciales ?? [], input.ville].filter(Boolean).flat().join(" ")}`;

  const type = (input.type_evenement as EventType) || detectEventType(text) || "general";
  if (!input.type_evenement && !detectEventType(text)) {
    avertissements.push("Type d'événement non détecté — proposition basée sur un format généraliste.");
  }

  const budget = Number(input.budget) || detectBudget(text) || DEFAULT_BUDGET;
  if (!Number(input.budget) && !detectBudget(text)) {
    avertissements.push(`Budget non précisé — estimation sur ${budget} DT.`);
  }

  const invites = Number(input.nb_invites) || detectGuests(text) || DEFAULT_GUESTS;
  const duree = Number(input.duree_heures) || detectDuration(text) || DEFAULT_DURATION;
  const ville = input.ville ?? detectCity(text);
  const date = input.date_evenement ?? detectDate(text);

  const special = extractSpecialRequests(text).map(r => r.raw);
  const specialInput = (input.demandes_speciales ?? []).map(s => s.trim()).filter(Boolean);
  const demandes_speciales = [...new Set([...specialInput, ...special])];

  return {
    brief: {
      type_evenement: type,
      budget,
      nb_invites: invites,
      duree_heures: duree,
      ville,
      date_evenement: date,
      demandes_speciales,
      message: input.message ?? "",
    },
    avertissements,
  };
}

export interface BriefInput {
  message?: string;
  type_evenement?: string;
  budget?: number | string;
  nb_invites?: number | string;
  duree_heures?: number | string;
  ville?: string;
  date_evenement?: string;
  demandes_speciales?: string[];
}

const SYSTEM_PROMPT = `Tu es un analyseur de demandes pour une agence événementielle tunisienne.
Tu extrais des informations structurées d'un message client libre.

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, avec exactement ces clés :
{
  "type_evenement": "mariage" | "corporate" | "naissance" | "fete" | "concert" | "general",
  "budget": nombre | null,
  "nb_invites": nombre | null,
  "duree_heures": nombre | null,
  "ville": chaîne | null,
  "demandes_speciales": tableau de chaînes
}

Règles :
- "budget" en Dinar tunisien (nombre). 3000 si non mentionné → null.
- "demandes_speciales" : uniquement les besoins EXPLICITEMENT demandés et non standards,
  formulés en français courant. Exemple : "le chanteur Hamza" → "chanteur Hamza".
  N'invente rien. Vide si rien n'est demandé.
- Si le message est en arabe, traduis le contenu en français.
- Pour "ville", ne la renvoie que si une ville est explicitement nommée.`;

/**
 * Étage 1 : comprime la demande. Tente OpenAI, retombe sur l'heuristique.
 * Ne lève jamais : la fonctionnalité doit marcher sans clé API.
 */
export async function parseBrief(input: BriefInput): Promise<{ brief: ClientBrief; moteur: "openai" | "regles"; avertissements: string[] }> {
  const heuristique = parseBriefHeuristically(input);

  const message = (input.message ?? "").trim();
  if (!message || !process.env.OPENAI_API_KEY) {
    return { ...heuristique, moteur: "regles" };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
      }),
    });

    if (!res.ok) return { ...heuristique, moteur: "regles" };

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return { ...heuristique, moteur: "regles" };

    const parsed = JSON.parse(raw) as Partial<ClientBrief> & { demandes_speciales?: unknown };
    if (!parsed || typeof parsed !== "object") return { ...heuristique, moteur: "regles" };

    const avertissements = [...heuristique.avertissements];
    const brief = mergeLlmBrief(heuristique.brief, parsed, avertissements);
    return { brief, moteur: "openai", avertissements };
  } catch {
    return { ...heuristique, moteur: "regles" };
  }
}

const VALID_TYPES: EventType[] = ["mariage", "corporate", "naissance", "fete", "concert", "general"];

/**
 * Fusionne ce que le LLM a compris avec ce que les champs explicites et
 * l'heuristique ont trouvé. Les champs remplis par l'utilisateur restent
 * prioritaires : on ne veut jamais écraser un budget saisi dans un formulaire.
 */
function mergeLlmBrief(heuristic: ClientBrief, llm: any, avertissements: string[]): ClientBrief {
  const llmType = VALID_TYPES.includes(llm.type_evenement) ? llm.type_evenement : null;
  if (llmType && llmType !== heuristic.type_evenement && llmType !== "general") {
    avertissements.push(`Type d'événement retenu : ${llmType}.`);
  }

  const llmSpecial = Array.isArray(llm.demandes_speciales)
    ? llm.demandes_speciales.filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 1)
    : [];

  return {
    type_evenement: llmType && llmType !== "general" ? llmType : heuristic.type_evenement,
    budget: clamp(Number(llm.budget) || heuristic.budget, 300, 500_000),
    nb_invites: clamp(Number(llm.nb_invites) || heuristic.nb_invites, 10, 2000),
    duree_heures: clamp(Number(llm.duree_heures) || heuristic.duree_heures, 2, 24),
    ville: heuristic.ville ?? (typeof llm.ville === "string" ? llm.ville : null),
    date_evenement: heuristic.date_evenement,
    demandes_speciales: [...new Set([...heuristic.demandes_speciales, ...llmSpecial])].slice(0, 8),
    message: heuristic.message,
  };
}

// ─────────────────────────────────────────────
// Étage 2 — construction des propositions
// ─────────────────────────────────────────────

/** Part du budget réservée à une demande spéciale, par nature. */
const SPECIAL_SHARE: Record<RequestKind, number> = {
  lieu: 0.3,
  artiste: 0.1,
  instrument: 0.06,
  equipement: 0.12,
  service: 0.22,
  personnel: 0.1,
};
/**
 * Plafond global réservé aux demandes spéciales : le pack garde toujours un
 * socle. 45 % suffit à couvrir un lieu imposé ou un artiste demandé ; au-delà,
 * il ne reste plus de quoi financer la salle, le traiteur et la sonorisation.
 */
/**
 * Famille de prestation servant de référence tarifaire quand le client impose
 * une prestation nommée : son budget remplace celui du poste standard. Les clés
 * sont des `service_types.slug` de la base, donc une prestation absente du
 * catalogue se replie sur la part forfaitaire ci-dessus.
 */
const SPECIAL_ANCHOR: Partial<Record<RequestKind, string>> = {
  lieu: "salle",
  service: "traiteur",
  artiste: "musique",
  equipement: "materiel",
  instrument: "materiel",
  personnel: "photographe",
};

const SPECIAL_TOTAL_CAP = 0.45;

const TIER_META: Record<Tier, { label: string; badge: string | null; facteur: number; nom: string }> = {
  essentiel:  { label: "Essentiel",  badge: null,                          facteur: 0.9,  nom: "Formule Essentielle" },
  equilibre:   { label: "Signature",  badge: "⭐ Recommandé",              facteur: 1.0,  nom: "Formule Signature" },
  premium:    { label: "Premium",    badge: "👑 Premium",                  facteur: 1.12, nom: "Formule Grand Standing" },
};

const EVENT_LABEL: Record<EventType, string> = {
  mariage: "Mariage",
  corporate: "Événement Corporate",
  naissance: "Naissance",
  fete: "Fête",
  concert: "Concert",
  general: "Événement",
};

/** Arrondi « humain » : au pas de 5 DT. */
function roundPrice(n: number): number {
  return Math.round(n / 5) * 5;
}

/**
 * Répartit exactement `target` DT entre des postes aux poids relatifs,
 * en arrondissant au pas de 5 DT. Le reliquat d'arrondi est absorbé par le
 * poste le plus lourd, de sorte que la somme vaut toujours `target`.
 */
function allocate(target: number, weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || target <= 0 || weights.length === 0) return weights.map(() => 0);

  const raw = weights.map(w => (w / total) * target);
  const out = raw.map(v => roundPrice(v));

  let ecart = Math.round(target) - out.reduce((a, b) => a + b, 0);
  if (ecart === 0) return out;

  // Le reliquat d'arrondi est réparti au DT près sur les postes qui ont le plus
  // perdu à l'arrondi. On corrige d'un DT à la fois : l'écart baisse d'une
  // unité à chaque tour, donc la boucle termine, alors qu'un pas fixe de 5 DT
  // oscillerait indéfiniment si le reliquat n'en était pas un multiple.
  const ordre = raw
    .map((v, i) => ({ i, reste: v - out[i] }))
    .sort((a, b) => Math.abs(b.reste) - Math.abs(a.reste));

  const maxTours = Math.abs(ecart) + ordre.length;
  for (let tour = 0; tour < maxTours && ecart !== 0; tour++) {
    const { i } = ordre[tour % ordre.length];
    const step = ecart > 0 ? 1 : -1;
    if (out[i] + step < 0) continue;
    out[i] += step;
    ecart -= step;
  }
  return out;
}

interface Selection {
  item: CatalogItem;
  raw: number;
}

/**
 * Nombre de lignes maximal par palier. Au-delà, le devis devient illisible
 * et chaque poste tombe sous un seuil de crédibilité : un devis à 3000 DT
 * ne peut pas étaler 32 postes, il en compte une dizaine.
 */
const MAX_ITEMS: Record<Tier, number> = { essentiel: 8, equilibre: 13, premium: 18 };

/**
 * Bornes d'échelle. Le plancher est 1 : les prix affichés sont ceux du
 * catalogue, éventuellement majorés pour/trainer vers un budget confortable,
 * jamais minorés. Une salle annoncée à 2 250 DT alors que le catalogue la
 * tarifie 2 500 DT n'est pas un devis, c'est une erreur commerciale.
 */
const SCALE_MIN = 1;
const SCALE_MAX = 1.8;
/** Tolérance d'arrondi avant de considérer l'échelle comme collée au catalogue. */
const SCALE_EPS = 0.005;

/** Sélectionne les postes du catalogue pertinents pour un palier. */
function selectItems(brief: ClientBrief, tier: Tier, catalog: CatalogItem[]): Selection[] {
  const matches = catalog.filter(it => {
    if (!it.tiers.includes(tier)) return false;
    return it.tags.includes(brief.type_evenement) || it.tags.includes("general");
  });

  // Dédoublonnage : une seule prestation par famille et par catégorie. Deux
  // traiteurs ou deux photographes dans le même pack doublent le budget sans
  // rien ajouter, sauf si le client les a explicitement demandés.
  const seen = new Set<string>();
  const chosen: CatalogItem[] = [];
  for (const it of matches) {
    const key = `${it.category}:${it.typeSlug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    chosen.push(it);
  }

  // Un catalogue trop maigre ne donne pas un pack crédible : on complète.
  if (chosen.length < 6) {
    for (const it of matches) {
      if (chosen.includes(it)) continue;
      if (chosen.length >= 8) break;
      chosen.push(it);
    }
  }

  return chosen.map(item => ({ item, raw: rawCost(item, brief.nb_invites) }));
}

/**
 * Un poste peut appartenir à un seul palier (premium only) ou aux trois
 * (socle commun). C'est cette exclusivité qui différencie les formules :
 * sinon les trois paliers(sorted par `poids`) retiennent le même panier et
 * la « Signature » n'est plus qu'une « Essentielle » plus chère.
 */
function tierRank(it: CatalogItem, cur: Tier): number {
  const exclusivite = 4 - it.tiers.length; // 1 = commun aux 3 paliers
  return it.tiers.includes(cur) ? exclusivite * 10 : 0;
}

/**
 * Compose un panier dont le **coût naturel** (somme des prix de référence du
 * catalogue) tient dans la cible, au lieu de répartir mécaniquement le budget.
 *
 * C'est ce qui distingue un devis crédible d'un devis arithmétique : sans
 * cette étape, un budget de 3 000 DT se répartit sur tous les postes et
 * produit une « Traiteur & menu » à 250 DT pour 100 invités.
 */
function fitBasket(
  target: number,
  candidates: Selection[],
  maxItems: number,
  tier: Tier,
  core: CatalogItem[],
): { chosen: Selection[]; ecart: number } {
  const sorted = [...candidates].sort(
    (a, b) => tierRank(b.item, tier) - tierRank(a.item, tier) || b.item.poids - a.item.poids || b.raw - a.raw,
  );

  const chosen: Selection[] = [];
  const taken = new Set<string>();
  let sum = 0;

  const add = (c: Selection) => {
    if (taken.has(c.item.key)) return;
    taken.add(c.item.key);
    chosen.push(c);
    sum += c.raw;
  };

  // 1. Socle obligatoire, avant toute sélection par palier. Ces postes sont
  //    imposés même s'ils débordent la cible : les descendre sous leur tarif
  //    réel reviendrait à annoncer une prestation qu'on ne peut pas tenir.
  for (const item of core) {
    const c = candidates.find(x => x.item.key === item.key);
    if (c) add(c);
  }

  // 2. Remplissage par priorité de palier. On s'arrête quand le prochain poste
  //    ferait exploser le budget ; les postes trop chers sont donc écartés au
  //    profit des postes abordables, ce qui densifie le pack sans le surcharger.
  for (const c of sorted) {
    if (chosen.length >= maxItems) break;
    if (taken.has(c.item.key)) continue;
    if (sum + c.raw > target * 0.97) continue;
    add(c);
  }

  // 2b. Panier encore maigre alors que la cible le permet : on complète avec les
  //     postes abordables. Le seuil est en nombre de lignes, pas en budget : le
  //     socle seul peut déjà consommer 80 % de la cible tout en restant maigre.
  //     On ne s'arrête pas au premier poste trop cher, on continue pour caser
  //     les postes abordables qui suivent.
  if (chosen.length < maxItems) {
    const rest = sorted.filter(c => !taken.has(c.item.key)).sort((a, b) => a.raw - b.raw);
    for (const c of rest) {
      if (chosen.length >= maxItems) break;
      if (sum + c.raw > target * 1.15) continue;
      add(c);
    }
  }

  // 3. Filet de sécurité sur les catégories critiques.
  for (const required of REQUIRED_CATEGORIES) {
    if (chosen.some(c => c.item.category === required)) continue;
    const cheapest = sorted
      .filter(c => c.item.category === required)
      .sort((a, b) => a.raw - b.raw)[0];
    if (cheapest) add(cheapest);
  }

  // Panier minimal : au moins la salle et le traiteur.
  if (chosen.length < 3) {
    for (const c of sorted) {
      if (taken.has(c.item.key)) continue;
      add(c);
      if (chosen.length >= 3) break;
    }
  }

  const natural = sum;
  // Si le panier dépasse la cible, on retire les postes les moins prioritaires
  // plutôt que de compresser tout le panier : sous son tarif réel, une salle ou
  // un traiteur n'est pas crédible. Le socle, lui, n'est jamais sacrifié.
  const coreKeys = new Set(core.map(c => c.key));
  while (natural > target * SCALE_MIN && chosen.length > coreKeys.size) {
    const droppable = chosen
      .filter(c => !coreKeys.has(c.item.key))
      .sort((a, b) => tierRank(a.item, tier) - tierRank(b.item, tier) || a.item.poids - b.item.poids)[0];
    if (!droppable) break;
    taken.delete(droppable.item.key);
    chosen.splice(chosen.indexOf(droppable), 1);
    sum -= droppable.raw;
  }

  const ecart = sum > 0 ? target / sum : 1;
  return { chosen, ecart: clamp(ecart, SCALE_MIN, SCALE_MAX) };
}

/** Normalise pour comparer un nom demandé à un libellé catalogue. */
function normalizeNom(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Cherche dans le catalogue la prestation correspondant à un nom demandé
 * (« La Plage », « Hamza ») : d'abord par similarité de libellé, puis par
 * similarité de prestataire. Une demande sans correspondance ne doit jamais
 * produire une ligne facturée au prix inventé : elle est signalée, et la
 * catégorie est couverte par une prestation réellement cataloguée.
 */
function matchCatalog(
  nom: string,
  kind: RequestKind,
  catalog: CatalogItem[],
  guests: number,
): CatalogItem | undefined {
  const cible = normalizeNom(nom);
  if (!cible) return undefined;

  const famille = SPECIAL_ANCHOR[kind];
  const pool = famille
    ? catalog.filter(it => it.typeSlug === famille)
    : catalog;
  if (!pool.length) return undefined;

  const score = (it: CatalogItem, phrase: string): number => {
    const label = normalizeNom(it.label);
    const provider = normalizeNom(it.provider?.name ?? "");
    if (label === phrase || provider === phrase) return 3;
    // Le nom demandé est souvent plus court (« Plage » pour « La Plage ») :
    // on accepte le containment, puis les mots significatifs communs.
    if (label.includes(phrase) || phrase.includes(label)) return 2;
    if (provider && (provider.includes(phrase) || phrase.includes(provider))) return 2;
    const mots = phrase.split(" ").filter(w => w.length > 2);
    const communs = mots.filter(w => label.includes(w) || provider.includes(w)).length;
    return mots.length ? communs / mots.length : 0;
  };

  const mots = cible.split(" ").filter(Boolean);

  // L'extraction peut capturer une span trop large (« Oliviers Traiteur
  // Palais ») qui ne correspond à rien en entier. On essaie donc les fenêtres
  // de mots de la plus longue à la plus courte : si un fragment se résout, la
  // demande est servie au lieu d'être signalée à tort.
  for (let len = Math.min(mots.length, 4); len >= 1; len--) {
    let best: { it: CatalogItem; s: number } | undefined;
    for (let start = 0; start + len <= mots.length; start++) {
      const phrase = mots.slice(start, start + len).join(" ");
      if (!phrase) continue;
      // Un mot unique doit matcher franchement ; un groupe de mots peut se
      // contenter d'un recouvrement partiel.
      const seuil = len > 1 ? 0.5 : 0.99;
      const candidat = pool
        .map(it => ({ it, s: score(it, phrase) }))
        .filter(x => x.s >= seuil)
        .sort((a, b) => b.s - a.s || rawCost(a.it, guests) - rawCost(b.it, guests))[0];
      if (candidat && (!best || candidat.s > best.s)) best = candidat;
    }
    if (best) return best.it;
  }
  return undefined;
}

/**
 * Construit les demandes spéciales du brief en lignes de pack, en réservant
 * une part du budget pour chacune. Les demandes nommées sont d'abord résolues
 * contre le catalogue réel : une prestation demandée qui existe devient la
 * ligne (avec son tarif et son prestataire), une prestation inconnue est
 * signalée et laisse la catégorie au catalogue.
 */
function buildSpecialItems(
  brief: ClientBrief,
  budget: number,
  catalog: CatalogItem[],
): {
  lines: Array<{
    item: Omit<GeneratedItem, "order" | "unitPrice">;
    /** Tarif réel quand la demande est cataloguée, sinon null (part de budget). */
    cost: number | null;
    share: number;
  }>;
  alertes: string[];
} {
  const requests = extractSpecialRequests(
    [brief.message, ...brief.demandes_speciales].filter(Boolean).join(" "),
  );
  const uniq: ExtractedRequest[] = [];
  const seen = new Set<string>();
  for (const r of requests) {
    // La clé porte sur l'identité résolue (catégorie + nom), pas sur le texte
    // brut : deux formulations différentes désignent la même demande.
    const k = `${r.kind}|${(r.nom ?? r.label).toLowerCase().trim()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(r);
  }

  // « une salle », « un traiteur », « de la décoration » : ces mots ne sont pas
  // des demandes particulières, ils sont déjà couverts par une prestation réelle
  // du socle. Les traiter comme « sur mesure » ajouterait une ligne doublon
  // au-dessus de la salle et du traiteur effectivement retenus.
  const retenusRequests = uniq.filter(
    r =>
      r.nom ||
      !REQUIRED_CATEGORIES.includes((r.kind === "artiste" ? "personnel" : r.kind) as ItemCategory),
  );

  if (!retenusRequests.length) return { lines: [], alertes: [] };

  const alertes: string[] = [];

  // Résolution : soit une prestation réelle du catalogue, soit une demande
  // « sur mesure » non nommée (ligne ouverte à définir, sans montant imposté).
  type Resolved = { req: ExtractedRequest; item: CatalogItem | null; cost: number };
  const resolved: Resolved[] = retenusRequests.map(r => {
    if (!r.nom) {
      return { req: r, item: null, cost: budget * (SPECIAL_SHARE[r.kind] ?? 0.08) };
    }

    const found = matchCatalog(r.nom, r.kind, catalog, brief.nb_invites);
    if (found) {
      // Le nom demandé correspond à une prestation cataloguée : on la facture
      // à son tarif réel, pas à une moyenne inventée.
      return { req: r, item: found, cost: rawCost(found, brief.nb_invites) };
    }

    // Prestation inconnue du catalogue : aucune ligne facturée. La catégorie
    // reste couverte par une prestation réelle, et l'écart est signalé.
    const famille = SPECIAL_ANCHOR[r.kind];
    const substitut = famille ? cheapestInFamily(catalog, famille, brief.nb_invites) : undefined;
    alertes.push(
      `« ${r.nom} » ne figure pas au catalogue : ` +
        (substitut
          ? `proposition ${substitut.label} au tarif du catalogue, à valider avec le client.`
          : `aucune prestation équivalente disponible, poste à chiffrer sur devis.`),
    );
    return { req: r, item: null, cost: 0 };
  });

  const retenus = resolved.filter(x => x.cost > 0);
  if (!retenus.length) return { lines: [], alertes };

  // Deux formulations peuvent se résoudre sur la même prestation (« Les
  // Oliviers » et « salle Les Oliviers ») : on ne la facture qu'une fois.
  const vus = new Set<string>();
  const uniques = retenus.filter(r => {
    if (!r.item) return true;
    if (vus.has(r.item.key)) return false;
    vus.add(r.item.key);
    return true;
  });

  const anchorTotal = uniques.reduce((a, r) => a + r.cost, 0);
  const sharesRaw = new Map<Resolved, number>(
    uniques.map(r => [r, anchorTotal > 0 ? r.cost / anchorTotal : (SPECIAL_SHARE[r.req.kind] ?? 0.08)]),
  );

  // Plafonne la part totale pour qu'un pack garde toujours un socle.
  const totalRaw = Array.from(sharesRaw.values()).reduce((a, b) => a + b, 0);
  const scale = totalRaw > SPECIAL_TOTAL_CAP ? SPECIAL_TOTAL_CAP / totalRaw : 1;

// Une ligne résolue dans le catalogue est facturée à son tarif réel (cost) ;
  // une ligne « sur mesure » sans prestataire identifié suit la part de budget
  // share × specialBudget. Les deux niveaux sont donc traités séparément.
  const lines: Array<{
    item: Omit<GeneratedItem, "order" | "unitPrice">;
    cost: number | null;
    share: number;
  }> = [];

  for (const r of uniques) {
    const share = (sharesRaw.get(r) ?? 0) * scale;

    if (r.item) {
      const fournisseur = r.item.provider?.name ? ` Prestataire : ${r.item.provider.name}.` : "";
      lines.push({
        cost: r.cost,
        share,
        item: {
          category: r.item.category,
          name: r.item.label,
          description: `${r.item.description}${fournisseur} Demandé explicitement par le client.`,
          defaultValue: `${r.item.label} — ${brief.nb_invites} invités, ${brief.duree_heures} h`,
          customizable: r.item.customizable ?? true,
          sur_demande: true,
        },
      });
    } else {
      lines.push({
        cost: null,
        share,
        item: {
          category: (r.req.kind === "artiste" ? "personnel" : r.req.kind) as ItemCategory,
          name: r.req.label,
          description: `Prestation sur mesure demandée : ${r.req.raw}. À chiffrer sur devis.`,
          defaultValue: "À définir avec le client",
          customizable: true,
          sur_demande: true,
        },
      });
    }
  }

  return { lines, alertes };
}

/** Assemble une proposition complète pour un palier donné. */
function buildProposal(brief: ClientBrief, tier: Tier, catalog: CatalogItem[]): GeneratedProposal {
  const meta = TIER_META[tier];
  const alertes: string[] = [];

  // ── Budget plancher réel ────────────────────────────────────────────────────
  // On résout d'abord les demandes du client : les prestations qu'il impose
  // remplacent le socle dans leur catégorie. Le plancher doit en tenir compte,
  // sinon on annoncerait un minimum de 70 000 DT (salle + traiteur premium)
  // à un devis qui contient la salle et le traiteur que le client a choisis.
  // La résolution ne dépend pas du budget, un premier passage suffit à savoir
  // quelles catégories sont imposées et à quel tarif réel.
  const prelim = buildSpecialItems(brief, brief.budget, catalog);
  const specialCategories = new Set(
    prelim.lines.filter(l => l.cost !== null).map(l => l.item.category),
  );
  const imposedCost = prelim.lines.reduce((a, l) => a + (l.cost ?? 0), 0);

  // Le budget demandé peut être inférieur au minimum vendable au tarif du
  // catalogue (salle + restauration + équipement). On ne rabote pas les
  // prix pour tenir : on remonte au minimum réellement exécutable et on
  // prévient, car c'est une information commerciale décisive.
  const plancher = roundPrice(
    coreCost(catalog, brief, specialCategories, tier) + imposedCost,
  );
  let target = roundPrice(brief.budget * meta.facteur);
  let budgetAjuste = false;

  if (target < plancher) {
    target = plancher;
    budgetAjuste = true;
    alertes.push(
      `Budget incompatible avec ${brief.nb_invites} invités : le minimum vendable au tarif du catalogue ` +
      `est de ${plancher.toLocaleString("fr-FR")} DT pour la formule ${meta.label.toLowerCase()}. ` +
      `La proposition est établie sur ce minimum au lieu d'être calibrée sur ` +
      `${brief.budget.toLocaleString("fr-FR")} DT, à revoir avec un conseiller.`,
    );
  }

  // 1. Demandes spéciales (part réservée du budget), recalculées sur la cible
  //    définitive puisque les parts « à chiffrer » en dépendent.
  const special = buildSpecialItems(brief, target, catalog);
  alertes.push(...special.alertes);

  // Les demandes résolues au catalogue ont déjà un tarif réel : elles pèsent
  // en entier dans le budget. Seules les lignes « à chiffrer » consomment une
  // part forfaitaire, et cette part est bornée au reliquat après le socle.
  const core = mandatoryCore(catalog, brief, tier);
  const socleNatural = coreCost(catalog, brief, specialCategories, tier);
  const devisLines = special.lines.filter(l => l.cost === null);
  const specialWanted = devisLines.reduce((a, l) => a + l.share * target, 0);
  const specialRoom = Math.max(target - socleNatural, target * 0.15);
  const specialBudget = roundPrice(Math.min(specialWanted, specialRoom));

  if (devisLines.length && specialWanted > specialRoom + 1) {
    alertes.push(
      "Une partie des demandes sur devis a été réduite pour préserver le budget salle, restauration et équipement.",
    );
  }

  // 2. Socle : postes du catalogue, ajustés au budget réel restant.
  const socleBudget = Math.max(target - specialBudget, target * 0.35);

  const candidates = selectItems(brief, tier, catalog).filter(
    s => s.raw > 0 && !specialCategories.has(s.item.category),
  );

  const { chosen, ecart } = fitBasket(socleBudget, candidates, MAX_ITEMS[tier], tier, core);

  // `ecart` = niveau appliqué au panier, borné par SCALE_MIN = 1 : on ne
  // facture jamais sous le tarif catalogue. En deçà de 1, il n'y a donc pas
  // d'échelle : le devis est au tarif réel et l'écart au budget est signalé.
  if (ecart <= SCALE_MIN + SCALE_EPS) {
    alertes.push(
      `Budget inférieur au panier catalogue pour le palier ${meta.label.toLowerCase()} : ` +
      `les prix affichés sont les tarifs réels, sans remise.`,
    );
  } else if (ecart >= SCALE_MAX) {
    alertes.push(
      `Budget confortable pour le palier ${meta.label.toLowerCase()} : des postes supplémentaires peuvent être ajoutés.`,
    );
  }

  // Les prix restent proportionnels aux coûts de référence et les proportions
  // du catalogue sont préservées, mais le total n'est PAS ramené de force sur
  // la cible : c'est ce qui ferait descendre une salle sous son tarif.
  const socleWeights = chosen.map(c => c.raw * ecart);
  const soclePrices = allocate(
    socleWeights.reduce((a, b) => a + b, 0),
    socleWeights,
  );
  const specialPrices = special.lines.map(l =>
    l.cost !== null ? roundPrice(l.cost) : roundPrice(l.share * specialBudget),
  );

  // 3. Fusion et tri par catégorie. Chaque ligne porte le prestataire réel
  // issu de la base : le devis doit être vérifiable, pas générique.
  const items: GeneratedItem[] = [
    ...chosen.map((s, i) => ({
      category: s.item.category,
      name: s.item.label,
      description: [
        s.item.description,
        s.item.provider?.name ? `Prestataire : ${s.item.provider.name}.` : null,
        s.item.provider?.city ? `${s.item.provider.city}.` : null,
        s.item.provider?.phone ? `Contact : ${s.item.provider.phone}.` : null,
      ]
        .filter(Boolean)
        .join(" "),
      defaultValue: `${s.item.label} — ${brief.nb_invites} invités, ${brief.duree_heures} h`,
      unitPrice: soclePrices[i],
      customizable: s.item.customizable ?? false,
      order: 0,
    })),
    ...special.lines.map((l, i) => ({
      ...l.item,
      unitPrice: specialPrices[i] ?? 0,
      order: 0,
    })),
  ];

  // 4. Les demandes spéciales remontent en tête : c'est ce que le client a demandé.
  const catOrder: ItemCategory[] = ["lieu", "service", "equipement", "personnel", "instrument"];
  items.sort((a, b) => {
    const sa = a.sur_demande ? -1 : 0;
    const sb = b.sur_demande ? -1 : 0;
    if (sa !== sb) return sa - sb;
    const ia = catOrder.indexOf(a.category);
    const ib = catOrder.indexOf(b.category);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  items.forEach((it, i) => { it.order = i; });

  // 5. Aucun pilotage du total sur la cible : le prix du pack est la somme de
  // ses lignes, et chaque ligne est au tarif du catalogue. Rapprocher le total
  // du budget en rognant la ligne la plus lourde reviendrait à annoncer une
  // prestation sous son prix. L'écart au budget est un fait commercial, il
  // est signalé dans les avertissements, pas absorbé dans les prix.
  const price = items.reduce((a, it) => a + it.unitPrice, 0);

  const typeLabel = EVENT_LABEL[brief.type_evenement];
  const surDemande = special.lines.map(l => l.item.name);
  const description =
    `${typeLabel} pour ${brief.nb_invites} invités, ${brief.duree_heures} h` +
    (brief.ville ? ` à ${brief.ville}` : "") +
    `. Palier ${meta.label.toLowerCase()}, ` +
    (budgetAjuste
      ? `établi sur le minimum vendable : votre budget de ${brief.budget.toLocaleString("fr-FR")} DT ne permet pas de couvrir un événement de cette taille.`
      : `prix calé sur votre budget.`) +
    (surDemande.length ? ` Inclut vos demandes : ${surDemande.join(", ")}.` : "");

  const features = items
    .filter(i => !i.sur_demande)
    .slice(0, 6)
    .map(i => i.name);

  return {
    key: `${brief.type_evenement}-${tier}`,
    name: `${typeLabel} — ${meta.nom}`,
    tier,
    description,
    price,
    duration: brief.duree_heures,
    maxGuests: brief.nb_invites,
    badge: meta.badge,
    features,
    items,
    avertissements: alertes,
  };
}

/**
 * Étage 2 : produit trois propositions (essentiel / signature / premium),
 * chacune calée sur le budget du client ou, si le budget est sous le minimum
 * vendable au tarif du catalogue, sur ce minimum.
 */
export async function generateProposals(brief: ClientBrief): Promise<GenerationResult> {
  const { items: catalog, source } = await loadServiceCatalog();
  const tiers: Tier[] = ["essentiel", "equilibre", "premium"];
  const propositions = tiers.map(tier => buildProposal(brief, tier, catalog));

  const avertissements: string[] = [
    source === "base"
      ? `Tarification réelle du catalogue SmartEvent360 (${catalog.length} prestations).`
      : `⚠ Catalogue indisponible : tarification de secours appliquée (${catalog.length} prestations). Tarifs à confirmer avant envoi.`,
  ];
  if (!process.env.OPENAI_API_KEY) {
    avertissements.push("Analyse déterministe (aucune clé OpenAI configurée). Les prix sont calculés, pas estimés par un modèle.");
  }
  // Les écarts de faisabilité remontent au client plutôt que d'être masqués.
  for (const p of propositions) {
    for (const a of p.avertissements) avertissements.push(`[${p.tier}] ${a}`);
  }

  return {
    brief,
    propositions,
    budget_cible: brief.budget,
    moteur: process.env.OPENAI_API_KEY ? "openai" : "regles",
    avertissements,
  };
}

/** Entrée complète du générateur : comprend la demande puis propose. */
export async function generateFromInput(input: BriefInput): Promise<GenerationResult> {
  const { brief, moteur, avertissements } = await parseBrief(input);
  const result = await generateProposals(brief);
  return { ...result, moteur, avertissements: [...avertissements, ...result.avertissements] };
}
