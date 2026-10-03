import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";
import { notifyAdmins, notifyUser, userDisplayName } from "../lib/notify";
import { parseBrief } from "../lib/packGenerator";
import { composePacks } from "../lib/packComposer";

const router = Router();

// Réponses de fallback si pas d'OpenAI
const FALLBACK_RESPONSES: Record<string, string> = {
  default: "Bonjour ! Je suis l'assistant SmartEvent360. Je peux vous aider à trouver des événements, réserver des tickets ou répondre à vos questions.",
  événement: "Nous avons plusieurs événements disponibles ! Rendez-vous sur la page Événements pour les découvrir et réserver vos places.",
  ticket: "Pour réserver un ticket, rendez-vous sur la page Événements, choisissez un événement et cliquez sur 'Réserver'. C'est simple et rapide !",
  prix: "Certains de nos événements sont gratuits, d'autres sont payants. Consultez la page Événements pour voir les tarifs.",
  contact: "Pour nous contacter, écrivez-nous à contact@smartevent360.com ou appelez le +216 XX XXX XXX.",
  annuler: "Pour annuler une réservation, contactez-nous à contact@smartevent360.com en précisant votre numéro de ticket.",
};

function getFallbackReply(message: string): string {
  const lower = message.toLowerCase();
  for (const [key, reply] of Object.entries(FALLBACK_RESPONSES)) {
    if (key !== "default" && lower.includes(key)) return reply;
  }
  return FALLBACK_RESPONSES.default;
}

// POST /api/ai/chat
router.post("/chat", async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message requis" });
    return;
  }

  // Si OpenAI configuré
  if (process.env.OPENAI_API_KEY) {
    try {
      // Contexte: liste des événements
      const events = await prisma.event.findMany({
        where: { isPublished: true },
        select: { title: true, date: true, location: true, price: true, capacity: true },
        take: 10,
        orderBy: { date: "asc" },
      });

      const systemPrompt = `Tu es un assistant virtuel pour SmartEvent360, une plateforme de gestion d'événements.
Voici les événements disponibles :
${events.map((e) => `- ${e.title} | ${new Date(e.date).toLocaleDateString("fr-FR")} | ${e.location} | ${e.price > 0 ? e.price + " DT" : "Gratuit"}`).join("\n")}

Réponds en français, de façon concise et utile. Si on te demande de réserver, dis à l'utilisateur de cliquer sur le bouton Réserver sur la page Événements.`;

      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      if (openaiRes.ok) {
        const data = await openaiRes.json() as { choices: { message: { content: string } }[] };
        res.json({ reply: data.choices[0]?.message?.content ?? getFallbackReply(message) });
        return;
      }
    } catch {
      // fallback
    }
  }

  // Fallback intelligent sans OpenAI
  res.json({ reply: getFallbackReply(message) });
});

/** Résumé des données perso du client, injecté comme contexte dans le prompt IA. */
async function buildClientContext(userId: string, message: string) {
  const [devis, packs, incomes, rdvs] = await Promise.all([
    prisma.crmRecord.findMany({ where: { kind: "devis" }, orderBy: { createdAt: "desc" } }),
    prisma.crmRecord.findMany({ where: { kind: "client_packs" }, orderBy: { createdAt: "desc" } }),
    prisma.crmRecord.findMany({ where: { kind: "incomes" }, orderBy: { createdAt: "desc" } }),
    prisma.crmRecord.findMany({ where: { kind: "appointments" }, orderBy: { createdAt: "desc" } }),
  ]);
  const mine = (rows: typeof devis) => rows.filter(r => (r.data as any)?.client_id === userId).map(r => r.data as any);
  const d = mine(devis), p = mine(packs), inc = mine(incomes), a = mine(rdvs);

  const fmt = (v: unknown) => {
    const n = Number(v);
    return isFinite(n) ? n.toFixed(0) : "0";
  };
  const dateFr = (v?: string | null) => {
    if (!v) return "non précisée";
    const d0 = new Date(v);
    return isNaN(d0.getTime()) ? "non précisée" : d0.toLocaleDateString("fr-FR");
  };

  const totalDu = d.reduce((s, x) => s + (Number(x.montant_ttc) || 0), 0);
  const totalPaye = inc.reduce((s, x) => s + (Number(x.montant) || 0), 0);
  const nextRdv = a
    .filter(x => x.statut !== "annule" && x.date_heure && new Date(x.date_heure) >= new Date())
    .sort((x, y) => String(x.date_heure).localeCompare(String(y.date_heure)))[0];

  const lines: string[] = [];
  if (d.length) {
    lines.push("Devis du client :");
    d.slice(0, 5).forEach(x => lines.push(
      `- ${x.reference || x.numero || "sans référence"} | ${fmt(x.montant_ttc)} DT | statut : ${x.statut} | émis le ${dateFr(x.date_emission)}${x.signature_data ? " | signé par le client" : ""}`
    ));
    lines.push(`Total des devis : ${fmt(totalDu)} DT.`);
  } else lines.push("Le client n'a aucun devis pour le moment.");
  if (p.length) {
    lines.push("Packs réservés :");
    p.slice(0, 5).forEach(x => lines.push(`- ${x.nom_pack} | ${x.date_debut} | x${x.quantite || 1} | statut : ${x.statut}`));
  } else lines.push("Aucun pack réservé.");
  if (inc.length) {
    lines.push(`Paiements/encaissements : ${inc.length} ligne(s), total ${fmt(totalPaye)} DT.`);
  }
  lines.push(nextRdv
    ? `Prochain rendez-vous : ${nextRdv.titre || nextRdv.type_rdv || "RDV"} le ${dateFr(nextRdv.date_heure)}${nextRdv.lieu ? ` (${nextRdv.lieu})` : ""} — statut : ${nextRdv.statut}.`
    : "Aucun rendez-vous à venir.");

  // Fallback sans OpenAI : réponses basées sur les données réelles
  const lower = message.toLowerCase();
  const last = d[0];
  const fallback = ((): string => {
    if (/devis/.test(lower)) {
      if (!last) return "Vous n'avez pas encore de devis. Rendez-vous sur la page « Mes Devis » pour en demander un, ou contactez-nous pour un devis sur mesure.";
      return `Votre dernier devis **${last.reference || last.numero}** est au statut « ${last.statut} » pour un montant de ${fmt(last.montant_ttc)} DT. Vous pouvez le télécharger en PDF ou l'accepter depuis « Mes Devis ».`;
    }
    if (/paiement|facture|régler|regler|réglé|regle|payé|paye|versé|verse|acompte/.test(lower)) {
      if (!inc.length) return "Aucun paiement enregistré pour le moment. Dès qu'un devis est accepté, l'encaissement apparaît automatiquement dans « Mes Paiements ».";
      return `Vous avez ${inc.length} encaissement(s) pour un total de **${fmt(totalPaye)} DT**. Le détail est disponible dans « Mes Paiements ».`;
    }
    if (/pack|réserv|reserv/.test(lower)) {
      if (!p.length) return "Vous n'avez pas encore réservé de pack. Choisissez-en un dans « Mes Packs » : notre équipe peut aussi le composer sur mesure.";
      const r = p[0];
      return `Votre pack **${r.nom_pack}** est réservé pour le ${dateFr(r.date_debut)} (statut : ${r.statut}). Vous pouvez le suivre depuis « Mes Packs ».`;
    }
    if (/rendez-vous|rdv|rencontre/.test(lower)) {
      return nextRdv
        ? `Votre prochain rendez-vous est prévu le **${dateFr(nextRdv.date_heure)}**${nextRdv.lieu ? ` à ${nextRdv.lieu}` : ""} (statut : ${nextRdv.statut}). Gérez-le depuis « Mes Rendez-vous ».`
        : "Vous n'avez pas de rendez-vous à venir. Vous pouvez en demander un depuis « Mes Rendez-vous ».";
    }
    if (/contrat/.test(lower)) return "Vos contrats sont disponibles dans « Mes Contrats ». Besoin d'un avenant ? Contactez-nous via le support.";
    if (/profil|coordonn|téléphone|telephone/.test(lower)) return "Vous pouvez mettre à jour vos coordonnées (téléphone, adresse, ville) depuis « Mon Profil ».";
    if (/support|aide|problème|probleme/.test(lower)) return "Je peux vous renseigner sur vos devis, paiements, packs, contrats et rendez-vous. Pour un cas particulier, utilisez la page « Support ».";
    return `Bonjour ! Voici un résumé de votre compte : **${d.length} devis** (${fmt(totalDu)} DT), **${p.length} pack(s) réservé(s)**, **${inc.length} encaissement(s)** (${fmt(totalPaye)} DT). Que souhaitez-vous savoir ?`;
  })();

  return { prompt: lines.join("\n"), fallback };
}

// POST /api/ai/chat/client — assistant IA avec le contexte du compte client connecté
router.post("/chat/client", authenticate, async (req: Request, res: Response) => {
  const { message } = req.body ?? {};
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message requis" });
    return;
  }

  const { prompt, fallback } = await buildClientContext(req.user!.userId, message);

  if (process.env.OPENAI_API_KEY) {
    try {
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `Tu es l'assistant virtuel de SmartEvent360, dans l'espace client du site. Réponds en français, de façon concise et factuelle, en te basant UNIQUEMENT sur les données du client ci-dessous. Ne donne jamais de prix inventé : si l'information n'est pas dans le contexte, renvoie vers la page concernée ou le support.\n\nDonnées du client :\n${prompt}`,
            },
            { role: "user", content: message },
          ],
          max_tokens: 300,
          temperature: 0.6,
        }),
      });
      if (openaiRes.ok) {
        const data = await openaiRes.json() as { choices: { message: { content: string } }[] };
        if (data.choices?.[0]?.message?.content) {
          res.json({ reply: data.choices[0].message.content });
          return;
        }
      }
    } catch {
      // fallback ci-dessous
    }
  }

  res.json({ reply: fallback });
});

// ─────────────────────────────────────────────
// Chat contextualisé sur les données de gestion (admin)
// ─────────────────────────────────────────────

async function buildAdminContext(message: string) {
  const [devisRows, packRows, incomeRows, expenseRows, rdvRows, clients, events, personnel, equipment, packs] =
    await Promise.all([
      prisma.crmRecord.findMany({ where: { kind: "devis" } }),
      prisma.crmRecord.findMany({ where: { kind: "client_packs" } }),
      prisma.crmRecord.findMany({ where: { kind: "incomes" } }),
      prisma.crmRecord.findMany({ where: { kind: "expenses" } }),
      prisma.crmRecord.findMany({ where: { kind: "appointments" } }),
      prisma.user.count({ where: { role: { not: "ADMIN" } } }),
      prisma.event.count(),
      prisma.crmRecord.count({ where: { kind: "personnel" } }),
      prisma.crmRecord.count({ where: { kind: "equipment" } }),
      prisma.pack.count(),
    ]);

  const d = devisRows.map(r => r.data as any);
  const p = packRows.map(r => r.data as any);
  const inc = incomeRows.map(r => r.data as any);
  const exp = expenseRows.map(r => r.data as any);
  const a = rdvRows.map(r => r.data as any);

  const sum = (rows: any[], key = "montant") => rows.reduce((s, x) => s + (Number(x[key]) || 0), 0);
  const count = (rows: any[], statut: string) => rows.filter(x => x.statut === statut).length;
  const monthKey = (v?: string | null) => String(v || "").slice(0, 7);
  const nowMonth = new Date().toISOString().slice(0, 7);
  const caMois = sum(inc.filter(x => monthKey(x.date_paiement) === nowMonth));
  const caTotal = sum(inc);
  const chargesTotal = sum(exp);
  const solde = caTotal - chargesTotal;
  const enc = sum(encAttente(inc));

  const upcoming = a
    .filter(x => x.date_heure && new Date(x.date_heure) >= new Date() && x.statut !== "annule")
    .sort((x, y) => String(x.date_heure).localeCompare(String(y.date_heure)))
    .slice(0, 5);

  const lines = [
    `Clients (non admins) : ${clients}`,
    `Événements : ${events} | Packs : ${packs} | Personnel : ${personnel} | Équipements : ${equipment}`,
    `Devis : ${d.length} au total — ${count(d, "envoye")} envoyés, ${count(d, "accepte")} acceptés, ${count(d, "refuse")} refusés, ${count(d, "brouillon")} brouillon`,
    `Réservations de packs : ${p.length} — ${count(p, "reserve")} en attente, ${count(p, "confirme") + count(p, "paye")} confirmées, ${count(p, "annule")} annulées`,
    `Trésorerie : CA total ${caTotal.toFixed(0)} DT, charges ${chargesTotal.toFixed(0)} DT, solde ${solde.toFixed(0)} DT`,
    `Ce mois-ci : entrées ${caMois.toFixed(0)} DT`,
    `Encaissements en attente de règlement : ${enc.toFixed(0)} DT`,
    `Rendez-vous à venir : ${upcoming.length}`,
  ];
  if (upcoming.length) {
    lines.push("Prochains rendez-vous :");
    upcoming.forEach(x => lines.push(`- ${x.titre || x.type_rdv || "RDV"} | ${new Date(x.date_heure).toLocaleString("fr-FR")} | statut : ${x.statut}`));
  }
  const waiting = a.filter(x => !x.statut || x.statut === "planifie").length;
  if (waiting) lines.push(`Rendez-vous en attente de confirmation : ${waiting}`);

  const lower = message.toLowerCase();
  const fallback = ((): string => {
    if (/chiffre|ca\b|revenu|recette|combien.*gagn/.test(lower)) {
      return `Le chiffre d'affaires total s'élève à **${caTotal.toFixed(0)} DT** (charges : ${chargesTotal.toFixed(0)} DT, solde : **${solde.toFixed(0)} DT**). Ce mois-ci, les entrées sont de ${caMois.toFixed(0)} DT. Détail dans « Trésorerie ».`;
    }
    if (/réserv|reserv/.test(lower)) {
      return `Il y a **${p.length} réservation(s) de packs** : ${count(p, "reserve")} en attente, ${count(p, "confirme") + count(p, "paye")} confirmée(s), ${count(p, "annule")} annulée(s). Détail dans « Réservations ».`;
    }
    if (/devis/.test(lower)) {
      return `**${d.length} devis** au total : ${count(d, "envoye")} envoyés, ${count(d, "accepte")} acceptés, ${count(d, "refuse")} refusés. Montant total des devis : ${sum(d, "montant_ttc").toFixed(0)} DT. Détail dans « Devis ».`;
    }
    if (/client/.test(lower)) return `Vous avez **${clients} client(s)** enregistrés. La liste complète est dans « Clients ».`;
    if (/rendez-vous|rdv/.test(lower)) {
      return upcoming.length
        ? `**${upcoming.length} rendez-vous** à venir. Le prochain : ${upcoming[0].titre || upcoming[0].type_rdv || "RDV"} le ${new Date(upcoming[0].date_heure).toLocaleString("fr-FR")}. Détail dans « Rendez-vous ».`
        : "Aucun rendez-vous à venir pour le moment.";
    }
    if (/equipement|matériel|materiel/.test(lower)) return `Vous gérez **${equipment} équipement(s)** et **${personnel} personne(s)**. Détail dans « Équipements » et « Personnel ».`;
    if (/événement|evenement/.test(lower)) return `**${events} événement(s)** sont enregistrés. Détail dans « Événements ».`;
    if (/pack/.test(lower)) return `**${packs} pack(s)** au catalogue. Détail dans « Packs & Offres ».`;
    return `Bonjour ! Voici la situation : ${clients} client(s), ${d.length} devis (${count(d, "accepte")} acceptés), ${p.length} réservation(s) de packs, CA de **${caTotal.toFixed(0)} DT** et solde de **${solde.toFixed(0)} DT**. Que souhaitez-vous analyser ?`;
  })();

  return { prompt: lines.join("\n"), fallback };
}

function encAttente(inc: any[]) {
  return inc.filter(x => ["attente", "partiel", "retarde"].includes(x.statut));
}

// POST /api/ai/chat/admin — assistant IA avec les données de gestion (ADMIN)
router.post("/chat/admin", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const { message } = req.body ?? {};
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message requis" });
    return;
  }

  const { prompt, fallback } = await buildAdminContext(message);

  if (process.env.OPENAI_API_KEY) {
    try {
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `Tu es l'assistant d'aide à la gestion de SmartEvent360 (agence événementielle tunisienne, montants en DT), utilisé par les administrateurs.
Règles :
- Base-toi UNIQUEMENT sur les indicateurs ci-dessous : n'invente aucun chiffre.
- Réponds en français, de façon concise (3 phrases max), en utilisant des **chiffres mis en valeur**.
- Termine par la page où l'information se trouve.

Indicateurs :
${prompt}`,
            },
            { role: "user", content: message },
          ],
          max_tokens: 400,
          temperature: 0.5,
        }),
      });
      if (openaiRes.ok) {
        const data = await openaiRes.json() as { choices: { message: { content: string } }[] };
        const reply = data.choices?.[0]?.message?.content;
        if (reply) { res.json({ reply }); return; }
      }
    } catch {
      // fallback
    }
  }

  res.json({ reply: fallback });
});

// ─────────────────────────────────────────────
// Générateur de packs sur mesure
// ─────────────────────────────────────────────

const PROPOSITION_KIND = "ai_propositions";

/**
 * POST /api/ai/generate-packs
 *
 * Accessible sans authentification : un visiteur doit pouvoir tester
 * le générateur. La demande est enregistrée côté admin pour suivi
 * commercial ; le rattachement au compte n'a lieu que si un jeton valide
 * est présent (on ne veut pas rejeter les anonymes).
 */
router.post("/generate-packs", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const message = typeof body.message === "string" ? body.message.trim() : "";

  const budget = Number(body.budget);
  if (!message && !Number.isFinite(budget)) {
    res.status(400).json({ error: "Décrivez votre besoin (message) ou indiquez un budget." });
    return;
  }
  if (Number.isFinite(budget) && budget > 0 && budget < 300) {
    res.status(400).json({ error: "Budget minimum : 300 DT." });
    return;
  }

  let result;
  try {
    // 1. Lecture de la demande (mots clés, ou modèle si OPENAI_API_KEY est là).
    const input = {
      message,
      type_evenement: typeof body.type_evenement === "string" ? body.type_evenement : undefined,
      budget: Number.isFinite(budget) && budget > 0 ? budget : undefined,
      nb_invites: Number(body.nb_invites) || undefined,
      duree_heures: Number(body.duree_heures) || undefined,
      ville: typeof body.ville === "string" ? body.ville : undefined,
      date_evenement: typeof body.date_evenement === "string" ? body.date_evenement : undefined,
      demandes_speciales: Array.isArray(body.demandes_speciales)
        ? body.demandes_speciales.filter((s: unknown): s is string => typeof s === "string")
        : undefined,
    };
    const { brief, moteur, avertissements: briefAvertissements } = await parseBrief(input);

    // 2. Composition à partir du matériel réellement disponible, budget borné.
    result = await composePacks(brief, moteur);
    result.avertissements = [...briefAvertissements, ...result.avertissements];
  } catch (e) {
    console.error("[ai] generation failed", e);
    res.status(500).json({ error: "Génération impossible pour le moment." });
    return;
  }

  // Rattachement facultatif à un compte, si un jeton valide est fourni.
  let clientId: string | null = null;
  let clientName: string | null = null;
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    try {
      const { default: jwt } = await import("jsonwebtoken");
      const payload = jwt.verify(
        auth.slice(7),
        process.env.JWT_SECRET || "smartevent360_secret",
      ) as { userId: string };
      if (payload?.userId) {
        clientId = payload.userId;
        clientName = await userDisplayName(clientId);
      }
    } catch {
      // jeton invalide : on reste anonyme plutôt que de renvoyer une erreur
    }
  }

  const { brief, propositions, budget_cible, moteur, avertissements } = result;

  const count = await prisma.crmRecord.count({ where: { kind: PROPOSITION_KIND } });
  const reference = `PROP-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

  // `brief` est une interface sans index signature : on l'élargit pour Prisma.
const data = {
    reference,
    client_id: clientId,
    client_nom: clientName,
    brief: { ...brief } as Record<string, unknown>,
    budget_cible,
    moteur,
    avertissements,
    propositions,
    statut: "nouvelle",
    created_at: new Date().toISOString(),
    proposition_retenue: null,
    pack_id: null,
    notes: null,
  };

  const row = await prisma.crmRecord.create({ data: { kind: PROPOSITION_KIND, data: data as any } });

  notifyAdmins({
    type: "INFO",
    title: "Nouvelle proposition de pack générée",
    message:
      `${clientName ?? "Un visiteur"} : ${brief.type_evenement}, budget ${budget_cible} DT, ` +
      `${brief.nb_invites} invités${brief.ville ? ` à ${brief.ville}` : ""} — ${reference}.`,
    lien: "/admin/propositions",
  }).catch((e) => console.error("[notify]", e));

  res.status(201).json({ id: row.id, ...data });
});

// ── GET /api/ai/propositions (ADMIN) ──
router.get("/propositions", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }

  const { statut } = req.query as { statut?: string };

  const rows = await prisma.crmRecord.findMany({
    where: { kind: PROPOSITION_KIND },
    orderBy: { createdAt: "desc" },
  });

  // Le statut vit dans le JSON `data` : on filtre en mémoire.
  const list = rows
    .map(r => ({ id: r.id, ...(r.data as object) }))
    .filter(p => (statut ? (p as any).statut === statut : true));

  res.json(list);
});

// ── GET /api/ai/propositions/:id (ADMIN) ──
router.get("/propositions/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const row = await prisma.crmRecord.findUnique({ where: { id: req.params.id } });
  if (!row || row.kind !== PROPOSITION_KIND) {
    res.status(404).json({ error: "Proposition introuvable" });
    return;
  }
  res.json({ id: row.id, ...(row.data as object) });
});

// ── PUT /api/ai/propositions/:id (ADMIN — statut / notes) ──
router.put("/propositions/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const row = await prisma.crmRecord.findUnique({ where: { id: req.params.id } });
  if (!row || row.kind !== PROPOSITION_KIND) {
    res.status(404).json({ error: "Proposition introuvable" });
    return;
  }

  const { statut, notes, proposition_retenue } = req.body ?? {};
  const merged: Record<string, any> = { ...(row.data as object) };

  if (statut !== undefined) merged.statut = statut;
  if (notes !== undefined) merged.notes = notes;
  if (proposition_retenue !== undefined) merged.proposition_retenue = proposition_retenue;
  merged.updated_at = new Date().toISOString();

  await prisma.crmRecord.update({ where: { id: req.params.id }, data: { data: merged } });
  res.json({ id: row.id, ...merged });
});

// ── POST /api/ai/propositions/:id/convert (ADMIN — crée un vrai pack) ──
router.post("/propositions/:id/convert", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }

  const row = await prisma.crmRecord.findUnique({ where: { id: req.params.id } });
  if (!row || row.kind !== PROPOSITION_KIND) {
    res.status(404).json({ error: "Proposition introuvable" });
    return;
  }

  const data = row.data as Record<string, any>;
  const propositions: any[] = Array.isArray(data.propositions) ? data.propositions : [];

  // L'admin choisit laquelle des trois formules devient un pack.
  const requestedKey = typeof req.body?.key === "string" ? req.body.key : null;
  const chosen = propositions.find(p => p?.key === requestedKey) ?? propositions[0];

  if (!chosen) {
    res.status(400).json({ error: "Cette proposition ne contient aucune formule." });
    return;
  }

  // Surcharges manuelles avant enregistrement.
  const body = (req.body ?? {}) as Record<string, unknown>;
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : chosen.name;
  const price = Number.isFinite(Number(body.price)) && Number(body.price) > 0
    ? Number(body.price)
    : chosen.price;
  // Un pack généré doit être relu : publication désactivée par défaut.
  const isActive = body.isActive === undefined ? false : Boolean(body.isActive);
  const imageUrl = typeof body.imageUrl === "string" && body.imageUrl.trim()
    ? body.imageUrl.trim()
    : null;

  const items = Array.isArray(chosen.items) ? chosen.items : [];

  const pack = await prisma.pack.create({
    data: {
      name,
      description: chosen.description ?? null,
      imageUrl,
      features: Array.isArray(chosen.features) ? chosen.features : [],
      price,
      duration: chosen.duration ?? 4,
      maxGuests: chosen.maxGuests ?? 100,
      badge: chosen.badge ?? null,
      isPopular: false,
      isActive,
      items: {
        create: items.map((it: any, idx: number) => ({
          category: it.category,
          name: it.name,
          description: it.description ?? null,
          defaultValue: it.defaultValue,
          customizable: Boolean(it.customizable),
          order: it.order ?? idx,
          unitPrice: Number(it.unitPrice) || 0,
        })),
      },
    },
    include: { items: { orderBy: { order: "asc" } } },
  });

  const merged = {
    ...data,
    statut: "converti",
    proposition_retenue: chosen.key,
    pack_id: pack.id,
    pack_name: pack.name,
    updated_at: new Date().toISOString(),
  };
  await prisma.crmRecord.update({ where: { id: req.params.id }, data: { data: merged } });

  if (data.client_id) {
    notifyUser(data.client_id, {
      type: "SUCCESS",
      title: "Votre pack sur mesure est disponible",
      message: `La proposition « ${pack.name} » a été ajoutée à notre catalogue (${pack.price} DT).`,
      lien: "/packs",
    }).catch((e) => console.error("[notify]", e));
  }

  res.status(201).json({ pack, proposition: merged });
});

export default router;
