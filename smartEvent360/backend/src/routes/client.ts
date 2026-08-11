import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";
import { ensureIncomeForDevis, today } from "../lib/treasury";
import { notifyAdmins, notifyUser, displayDate, userDisplayName } from "../lib/notify";

const router = Router();
router.use(authenticate);

function toRecord(row: { id: string; data: unknown }) {
  return { id: row.id, ...(row.data as object) };
}

function isOwner(row: { data: unknown }, userId: string): boolean {
  return (row.data as any)?.client_id === userId;
}

// GET /api/client/devis — devis du client connecté
router.get("/devis", async (req: Request, res: Response) => {
  const rows = await prisma.crmRecord.findMany({ where: { kind: "devis" }, orderBy: { createdAt: "asc" } });
  res.json(rows.filter(r => isOwner(r, req.user!.userId)).map(toRecord));
});

// GET /api/client/devis/:id
router.get("/devis/:id", async (req: Request, res: Response) => {
  const row = await prisma.crmRecord.findUnique({ where: { id: req.params.id } });
  if (!row || row.kind !== "devis" || !isOwner(row, req.user!.userId)) {
    res.status(404).json({ error: "Devis not found" });
    return;
  }
  res.json(toRecord(row));
});

// POST /api/client/devis/:id/accept — le client signe et accepte le devis
router.post("/devis/:id/accept", async (req: Request, res: Response) => {
  const row = await prisma.crmRecord.findUnique({ where: { id: req.params.id } });
  if (!row || row.kind !== "devis" || !isOwner(row, req.user!.userId)) {
    res.status(404).json({ error: "Devis not found" });
    return;
  }
  const merged = {
    ...(row.data as object),
    statut: "accepte",
    date_acceptation: new Date().toISOString(),
    signature_data: req.body?.signature_data || null,
  };
  await prisma.crmRecord.update({ where: { id: req.params.id }, data: { data: merged } });
  const income = await ensureIncomeForDevis(prisma, req.params.id);
  // Notifier les admins : devis accepté
  const clientName = await userDisplayName(req.user!.userId);
  notifyAdmins({
    type: "SUCCESS",
    title: "Devis accepté",
    message: `${clientName} a accepté le devis ${(row.data as any)?.numero || ""}`.trim(),
    lien: "/admin/devis",
  }).catch((e) => console.error("[notify]", e));
  res.json({ id: row.id, ...merged, income: income ? toRecord(income) : null });
});

// POST /api/client/devis/:id/refuse
router.post("/devis/:id/refuse", async (req: Request, res: Response) => {
  const row = await prisma.crmRecord.findUnique({ where: { id: req.params.id } });
  if (!row || row.kind !== "devis" || !isOwner(row, req.user!.userId)) {
    res.status(404).json({ error: "Devis not found" });
    return;
  }
  const reason = req.body?.reason || "";
  const merged = {
    ...(row.data as object),
    statut: "refuse",
    notes: reason ? `Refusé par le client : ${reason}` : "Refusé par le client.",
  };
  await prisma.crmRecord.update({ where: { id: req.params.id }, data: { data: merged } });
  // Notifier les admins : devis refusé
  const clientName = await userDisplayName(req.user!.userId);
  notifyAdmins({
    type: "WARNING",
    title: "Devis refusé",
    message: `${clientName} a refusé le devis ${(row.data as any)?.numero || ""}${reason ? ` — Raison : ${reason}` : ""}`.trim(),
    lien: "/admin/devis",
  }).catch((e) => console.error("[notify]", e));
  res.json(toRecord({ id: row.id, data: merged }));
});

// GET /api/client/payments — encaissements du client connecté
router.get("/payments", async (req: Request, res: Response) => {
  const rows = await prisma.crmRecord.findMany({ where: { kind: "incomes" }, orderBy: { createdAt: "asc" } });
  res.json(rows.filter(r => isOwner(r, req.user!.userId)).map(toRecord));
});

// POST /api/client/payments/:id/pay — le client règle l'encaissement en attente
router.post("/payments/:id/pay", async (req: Request, res: Response) => {
  const row = await prisma.crmRecord.findUnique({ where: { id: req.params.id } });
  if (!row || row.kind !== "incomes" || !isOwner(row, req.user!.userId)) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  const merged = {
    ...(row.data as object),
    statut: "paye",
    date_paiement: today(),
    mode_paiement: req.body?.methode || "en_ligne",
    numero_reçu: req.body?.methode === "en_ligne" ? `REC-${Date.now().toString().slice(-8)}` : (row.data as any)?.numero_reçu,
  };
  await prisma.crmRecord.update({ where: { id: req.params.id }, data: { data: merged } });
  res.json(toRecord({ id: row.id, data: merged }));
});

function listForOwner(kind: string, userId: string) {
  return prisma.crmRecord
    .findMany({ where: { kind }, orderBy: { createdAt: "asc" } })
    .then(rows => rows.filter(r => isOwner(r, userId)).map(toRecord));
}

function findOwned(kind: string, id: string, userId: string) {
  return prisma.crmRecord.findUnique({ where: { id } }).then(row => {
    if (!row || row.kind !== kind || !isOwner(row, userId)) return null;
    return row;
  });
}

function byDate(a: any, b: any) {
  const da = a?.date_debut || a?.date_heure || "";
  const db = b?.date_debut || b?.date_heure || "";
  return da.localeCompare(db);
}

// GET /api/client/events — événements CRM (préparations) du client connecté
router.get("/events", async (req: Request, res: Response) => {
  const events = await listForOwner("events", req.user!.userId);
  events.sort(byDate);
  res.json(events);
});

// GET /api/client/events/:id
router.get("/events/:id", async (req: Request, res: Response) => {
  const row = await findOwned("events", req.params.id, req.user!.userId);
  if (!row) { res.status(404).json({ error: "Event not found" }); return; }
  res.json(toRecord(row));
});

// GET /api/client/appointments — rendez-vous du client connecté
router.get("/appointments", async (req: Request, res: Response) => {
  const rows = await listForOwner("appointments", req.user!.userId);
  rows.sort(byDate);
  res.json(rows);
});

// POST /api/client/appointments — le client crée une demande de rendez-vous
router.post("/appointments", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, any>;
  const row = await prisma.crmRecord.create({
    data: {
      kind: "appointments",
      data: {
        client_id: req.user!.userId,
        type_rdv: body.type_rdv || "rencontre",
        titre: body.titre ?? null,
        date_heure: body.date_heure ?? null,
        lieu: body.lieu ?? null,
        duree_minutes: body.duree_minutes ?? null,
        description: body.description ?? null,
        statut: body.statut ?? "planifie",
        notes: body.notes ?? null,
        email: body.email ?? null,
        telephone: body.telephone ?? null,
      },
    },
  });
  // Notifier les admins : nouveau rendez-vous demandé
  const clientName = await userDisplayName(req.user!.userId);
  const when = displayDate(body.date_heure);
  notifyAdmins({
    type: "INFO",
    title: "Nouveau rendez-vous",
    message: `${clientName} a demandé un rendez-vous${when ? ` le ${when}` : ""}.`,
    lien: "/admin/rendez-vous",
  }).catch((e) => console.error("[notify]", e));
  res.status(201).json(toRecord(row));
});

// PATCH /api/client/appointments/:id — annuler / reporter (confirmation réservée à l'admin)
router.patch("/appointments/:id", async (req: Request, res: Response) => {
  const row = await findOwned("appointments", req.params.id, req.user!.userId);
  if (!row) { res.status(404).json({ error: "Appointment not found" }); return; }
  const { statut, date_heure, notes } = req.body ?? {};
  if (statut !== undefined && (statut === "confirme" || statut === "confirme_rdv")) {
    res.status(403).json({ error: "La confirmation est réservée à l'administrateur." });
    return;
  }
  const merged = {
    ...(row.data as object),
    ...(statut !== undefined ? { statut } : {}),
    ...(date_heure !== undefined ? { date_heure } : {}),
    ...(notes !== undefined ? { notes } : {}),
  };
  await prisma.crmRecord.update({ where: { id: req.params.id }, data: { data: merged } });
  // Notifier les admins : rendez-vous annulé / reporté par le client
  if (statut === "annule" || statut === "reporte") {
    const clientName = await userDisplayName(req.user!.userId);
    notifyAdmins({
      type: statut === "annule" ? "ERROR" : "WARNING",
      title: statut === "annule" ? "Rendez-vous annulé" : "Rendez-vous reporté",
      message: `${clientName} a ${statut === "annule" ? "annulé" : "reporté"} son rendez-vous du ${displayDate((row.data as any)?.date_heure) || "(date inconnue)"}.`,
      lien: "/admin/rendez-vous",
    }).catch((e) => console.error("[notify]", e));
  }
  res.json(toRecord({ id: row.id, data: merged }));
});

// GET /api/client/contracts — contrats du client connecté
router.get("/contracts", async (req: Request, res: Response) => {
  const rows = await listForOwner("contracts", req.user!.userId);
  res.json(rows);
});

// ── MES PACKS ──────────────────────────────────────────────────────────────

// GET /api/client/packs — packs choisis/réservés par le client connecté
router.get("/packs", async (req: Request, res: Response) => {
  const rows = await prisma.crmRecord.findMany({
    where: { kind: "client_packs" },
    orderBy: { createdAt: "desc" },
  });
  const mine = rows
    .filter(r => (r.data as any)?.client_id === req.user!.userId)
    .map(toRecord);
  const packIds = [...new Set(mine.map(r => (r as any).pack_id).filter(Boolean))];
  const packs = packIds.length
    ? await prisma.pack.findMany({ where: { id: { in: packIds } } })
    : [];
  const packMap = new Map(packs.map(p => [p.id, p]));
  res.json(mine.map(r => ({ ...r, pack: (r as any).pack_id ? packMap.get((r as any).pack_id) ?? null : null })));
});

// POST /api/client/packs/check-availability — vérifie la disponibilité d'un pack à une date
router.post("/packs/check-availability", async (req: Request, res: Response) => {
  const { packId, date } = req.body ?? {};
  if (!packId || !date) {
    res.status(400).json({ error: "packId et date sont requis." });
    return;
  }
  const pack = await prisma.pack.findUnique({ where: { id: String(packId) } });
  if (!pack || !pack.isActive) {
    res.json({ available: false, message: "Pack introuvable ou indisponible." });
    return;
  }
  const day = String(date).slice(0, 10);
  const active = ["reserve", "confirme", "paye"];
  const rows = await prisma.crmRecord.findMany({ where: { kind: "client_packs" } });
  const conflict = rows.some(r => {
    const d = (r.data ?? {}) as any;
    return d.pack_id === String(packId) && String(d.date_debut ?? "").slice(0, 10) === day && active.includes(d.statut);
  });
  if (conflict) {
    res.json({ available: false, message: "Ce pack n'est pas disponible pour cette date." });
    return;
  }
  res.json({ available: true, message: "Ce pack est disponible pour cette date." });
});

// POST /api/client/packs — le client réserve un pack pour une date
router.post("/packs", async (req: Request, res: Response) => {
  const { packId, date, quantite, notes } = req.body ?? {};
  if (!packId || !date) {
    res.status(400).json({ error: "packId et date sont requis." });
    return;
  }
  const pack = await prisma.pack.findUnique({ where: { id: String(packId) } });
  if (!pack || !pack.isActive) {
    res.status(404).json({ error: "Pack introuvable ou indisponible." });
    return;
  }
  const day = String(date).slice(0, 10);
  const active = ["reserve", "confirme", "paye"];
  const rows = await prisma.crmRecord.findMany({ where: { kind: "client_packs" } });
  const conflict = rows.some(r => {
    const d = (r.data ?? {}) as any;
    return d.pack_id === String(packId) && String(d.date_debut ?? "").slice(0, 10) === day && active.includes(d.statut);
  });
  if (conflict) {
    res.status(409).json({ error: "Ce pack n'est pas disponible pour cette date." });
    return;
  }
  const data: Record<string, any> = {
    client_id: req.user!.userId,
    pack_id: pack.id,
    nom_pack: pack.name,
    description_pack: pack.description,
    prix_pack: pack.price,
    duree_heures: pack.duration,
    nb_invites_max: pack.maxGuests,
    badge: pack.badge,
    is_populaire: pack.isPopular,
    date_debut: day,
    quantite: quantite ? Math.max(1, Number(quantite)) : 1,
    statut: "reserve",
    notes: notes ?? null,
    created_at: new Date().toISOString(),
  };
  const row = await prisma.crmRecord.create({ data: { kind: "client_packs", data } });
  // Notifier les admins : nouveau pack réservé par un client
  const clientName = await userDisplayName(req.user!.userId);
  notifyAdmins({
    type: "INFO",
    title: "Nouvelle réservation pack",
    message: `${clientName} a réservé le pack « ${pack.name} » pour le ${day}.`,
    lien: "/admin/reservations",
  }).catch((e) => console.error("[notify]", e));
  res.status(201).json({ id: row.id, ...data, pack });
});

// PATCH /api/client/packs/:id — annuler la réservation du pack
router.patch("/packs/:id", async (req: Request, res: Response) => {
  const row = await findOwned("client_packs", req.params.id, req.user!.userId);
  if (!row) { res.status(404).json({ error: "Réservation introuvable" }); return; }
  const statut = req.body?.statut ?? (row.data as any)?.statut;
  const merged = {
    ...(row.data as object),
    statut,
    notes_annulation: req.body?.notes ?? (row.data as any)?.notes_annulation ?? null,
    date_annulation: statut === "annule" ? new Date().toISOString() : (row.data as any)?.date_annulation ?? null,
  };
  await prisma.crmRecord.update({ where: { id: req.params.id }, data: { data: merged } });
  if (statut === "annule") {
    const clientName = await userDisplayName(req.user!.userId);
    notifyAdmins({
      type: "ERROR",
      title: "Réservation pack annulée",
      message: `${clientName} a annulé sa réservation du pack « ${(row.data as any)?.nom_pack || ""} » (${(row.data as any)?.date_debut || ""}).`,
      lien: "/admin/reservations",
    }).catch((e) => console.error("[notify]", e));
  }
  res.json(toRecord({ id: row.id, data: merged }));
});

// POST /api/client/quotes — le client connecté demande un devis depuis le site vitrine
router.post("/quotes", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, any>;
  const count = await prisma.crmRecord.count({ where: { kind: "devis" } });
  const reference = `DEV-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

  let pack: { id: string; name: string; price: number } | null = null;
  if (body.pack_id) {
    const found = await prisma.pack.findUnique({ where: { id: String(body.pack_id) } });
    if (found) pack = found;
  }

  const data: Record<string, any> = {
    client_id: req.user!.userId,
    reference,
    statut: "brouillon",
    demande_client: true,
    date_emission: new Date().toISOString(),
    email: body.email ?? null,
    telephone: body.telephone ?? null,
    type_evenement: body.type_evenement ?? null,
    date_evenement: body.date_evenement ?? null,
    ville: body.ville ?? null,
    salle: body.salle ?? null,
    nb_invites: body.nb_invites ? Number(body.nb_invites) : null,
    budget_estime: body.budget_estime ? Number(body.budget_estime) : null,
    services_demandes: Array.isArray(body.services_demandes) ? body.services_demandes : [],
    message: body.message ?? null,
    pack_id: pack?.id ?? null,
    pack_name: pack?.name ?? null,
    lignes: [],
    remise_globale: 0,
    conditions: body.message ?? null,
    montant_ht: pack ? Number(pack.price) : 0,
    tva: pack ? Math.round(Number(pack.price) * 0.2 * 100) / 100 : 0,
    montant_ttc: pack ? Number(pack.price) + Math.round(Number(pack.price) * 0.2 * 100) / 100 : 0,
  };

  const row = await prisma.crmRecord.create({ data: { kind: "devis", data } });
  const clientName = await userDisplayName(req.user!.userId);
  notifyAdmins({
    type: "INFO",
    title: "Nouvelle demande de devis",
    message: `${clientName} a demandé un devis${pack ? ` (pack ${pack.name})` : ""}.`,
    lien: "/admin/devis",
  }).catch((e) => console.error("[notify]", e));
  res.status(201).json({ id: row.id, ...data });
});

export default router;
