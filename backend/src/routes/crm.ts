import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";
import { ensureIncomeForDevis } from "../lib/treasury";
import { sendAppointmentConfirmation } from "../lib/mailer";
import { notifyUser, displayDate } from "../lib/notify";

const router = Router();

// GET /api/crm/:kind  (ADMIN) — liste les enregistrements d'une catégorie
router.get("/:kind", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const { kind } = req.params;
  const rows = await prisma.crmRecord.findMany({
    where: { kind },
    orderBy: { createdAt: "asc" },
  });
  res.json(rows.map(r => ({ id: r.id, ...(r.data as object) })));
});

// POST /api/crm/:kind  (ADMIN) — création
router.post("/:kind", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const { kind } = req.params;
  const data = req.body ?? {};
  const row = await prisma.crmRecord.create({ data: { kind, data } });
  // Un rendez-vous planifié par l'admin notifie le client concerné
  if (kind === "appointments") {
    const appt = data as any;
    const apptClientId = appt?.client_id;
    if (apptClientId) {
      notifyUser(String(apptClientId), {
        type: "INFO",
        title: "Nouveau rendez-vous planifié",
        message: `${appt.titre || "Rendez-vous"} — ${displayDate(appt.date_heure)}${appt.lieu ? ` · ${appt.lieu}` : ""}.`,
        lien: "/client/rendez-vous",
      }).catch((e) => console.error("[notify]", e));

      // Email de convocation (si SMTP configuré)
      prisma.user.findUnique({ where: { id: String(apptClientId) } })
        .then(async (client) => {
          if (!client?.email) return;
          const result = await sendAppointmentConfirmation({
            to: client.email,
            clientName: [client.prenom, client.nom, client.name].filter(Boolean).join(" ") || undefined,
            appointment: appt,
            statusText: "planifié",
          });
          if (!result.sent) console.warn("[mailer]", result.reason);
        })
        .catch((e) => console.error("[mailer] client introuvable:", e));
    }
  }

  // Un devis créé directement au statut "envoye" notifie le client
  if (kind === "devis" && (data as any).statut === "envoye") {
    const clientId = (data as any).client_id;
    if (clientId) {
      notifyUser(String(clientId), {
        type: "INFO",
        title: "Devis envoyé",
        message: `Vous avez reçu un devis${(data as any)?.numero ? ` ${(data as any)?.numero}` : ""} de ${(data as any)?.montant_ttc ? `${(data as any)?.montant_ttc} DT` : ""}.`.trim(),
        lien: "/client/devis",
      }).catch((e) => console.error("[notify]", e));
    }
  }
  res.status(201).json({ id: row.id, ...data });
});

// GET /api/crm/:kind/:id  (ADMIN) — un enregistrement précis
router.get("/:kind/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.crmRecord.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Record not found" }); return; }
  res.json({ id: existing.id, ...(existing.data as object) });
});

// PUT /api/crm/:kind/:id  (ADMIN) — mise à jour (fusion des champs)
router.put("/:kind/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.crmRecord.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Record not found" }); return; }
  const merged = { ...(existing.data as object), ...(req.body ?? {}) };
  await prisma.crmRecord.update({ where: { id: req.params.id }, data: { data: merged } });
  // Un devis passé au statut "accepte" génère automatiquement son encaissement en trésorerie
  let income = null;
  if (req.params.kind === "devis" && (merged as any).statut === "accepte") {
    income = await ensureIncomeForDevis(prisma, req.params.id);
  }
  // Un devis passé au statut "envoye" notifie le client
  if (req.params.kind === "devis" && (merged as any).statut === "envoye" && (existing.data as any).statut !== "envoye") {
    const clientId = (merged as any).client_id;
    if (clientId) {
      notifyUser(String(clientId), {
        type: "INFO",
        title: "Devis envoyé",
        message: `Vous avez reçu un devis${(merged as any)?.numero ? ` ${(merged as any)?.numero}` : ""}${(merged as any)?.montant_ttc ? ` de ${(merged as any)?.montant_ttc} DT` : ""}.`.trim(),
        lien: "/client/devis",
      }).catch((e) => console.error("[notify]", e));
    }
  }
  // Un rendez-vous modifié notifie le client (annulation ou report)
  const clientId = (merged as any).client_id as string | undefined;
  if (req.params.kind === "appointments" && clientId) {
    const before = existing.data as any;
    const after = merged as any;
    const statut = after.statut as string | undefined;

    if (statut === "annule" && before.statut !== "annule") {
      notifyUser(clientId, {
        type: "ERROR",
        title: "Rendez-vous annulé",
        message: `Votre rendez-vous « ${after.titre || before.titre || ""} » du ${displayDate(before.date_heure)} a été annulé.`,
        lien: "/client/rendez-vous",
      }).catch((e) => console.error("[notify]", e));
    } else if (
      statut !== "annule" &&
      after.date_heure && before.date_heure &&
      String(after.date_heure) !== String(before.date_heure)
    ) {
      notifyUser(clientId, {
        type: "INFO",
        title: "Rendez-vous reporté",
        message: `Votre rendez-vous « ${after.titre || before.titre || ""} » est déplacé au ${displayDate(after.date_heure)}.`,
        lien: "/client/rendez-vous",
      }).catch((e) => console.error("[notify]", e));

      prisma.user.findUnique({ where: { id: clientId } })
        .then(async (client) => {
          if (!client?.email) return;
          const result = await sendAppointmentConfirmation({
            to: client.email,
            clientName: [client.prenom, client.nom, client.name].filter(Boolean).join(" ") || undefined,
            appointment: { titre: after.titre ?? before.titre, date_heure: after.date_heure, lieu: after.lieu ?? before.lieu, duree_minutes: after.duree_minutes ?? before.duree_minutes },
            statusText: "reporté",
          });
          if (!result.sent) console.warn("[mailer]", result.reason);
        })
        .catch((e) => console.error("[mailer] client introuvable:", e));
    }
  }

  // Un rendez-vous confirmé envoie automatiquement un email de confirmation au client
  if (req.params.kind === "appointments" && clientId) {
    const statut = (merged as any).statut as string;
    if (statut === "confirme") {
      notifyUser(clientId, {
        type: "SUCCESS",
        title: "Rendez-vous confirmé",
        message: `Votre rendez-vous du ${displayDate((merged as any)?.date_heure) || "(date à confirmer)"} est confirmé.`,
        lien: "/client/rendez-vous",
      }).catch((e) => console.error("[notify]", e));
      prisma.user.findUnique({ where: { id: clientId } })
        .then(async (client) => {
          if (!client?.email) return;
          const result = await sendAppointmentConfirmation({
            to: client.email,
            clientName: [client.prenom, client.nom, client.name].filter(Boolean).join(" ") || undefined,
            appointment: merged as any,
          });
          if (!result.sent) console.warn("[mailer]", result.reason);
        })
        .catch((e) => console.error("[mailer] client introuvable:", e));
    }
  }
  res.json({ id: existing.id, ...merged, income: income ? { id: income.id, ...(income.data as object) } : null });
});

// DELETE /api/crm/:kind/:id  (ADMIN)
router.delete("/:kind/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.crmRecord.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Record not found" }); return; }
  await prisma.crmRecord.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
