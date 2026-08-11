"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const authenticate_1 = require("../middleware/authenticate");
const treasury_1 = require("../lib/treasury");
const mailer_1 = require("../lib/mailer");
const notify_1 = require("../lib/notify");
const router = (0, express_1.Router)();
// GET /api/crm/:kind  (ADMIN) — liste les enregistrements d'une catégorie
router.get("/:kind", authenticate_1.authenticate, async (req, res) => {
    if (req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const { kind } = req.params;
    const rows = await prisma_1.prisma.crmRecord.findMany({
        where: { kind },
        orderBy: { createdAt: "asc" },
    });
    res.json(rows.map(r => ({ id: r.id, ...r.data })));
});
// POST /api/crm/:kind  (ADMIN) — création
router.post("/:kind", authenticate_1.authenticate, async (req, res) => {
    if (req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const { kind } = req.params;
    const data = req.body ?? {};
    const row = await prisma_1.prisma.crmRecord.create({ data: { kind, data } });
    // Un devis créé directement au statut "envoye" notifie le client
    if (kind === "devis" && data.statut === "envoye") {
        const clientId = data.client_id;
        if (clientId) {
            (0, notify_1.notifyUser)(String(clientId), {
                type: "INFO",
                title: "Devis envoyé",
                message: `Vous avez reçu un devis${data?.numero ? ` ${data?.numero}` : ""} de ${data?.montant_ttc ? `${data?.montant_ttc} DT` : ""}.`.trim(),
                lien: "/client/devis",
            }).catch((e) => console.error("[notify]", e));
        }
    }
    res.status(201).json({ id: row.id, ...data });
});
// GET /api/crm/:kind/:id  (ADMIN) — un enregistrement précis
router.get("/:kind/:id", authenticate_1.authenticate, async (req, res) => {
    if (req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const existing = await prisma_1.prisma.crmRecord.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        res.status(404).json({ error: "Record not found" });
        return;
    }
    res.json({ id: existing.id, ...existing.data });
});
// PUT /api/crm/:kind/:id  (ADMIN) — mise à jour (fusion des champs)
router.put("/:kind/:id", authenticate_1.authenticate, async (req, res) => {
    if (req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const existing = await prisma_1.prisma.crmRecord.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        res.status(404).json({ error: "Record not found" });
        return;
    }
    const merged = { ...existing.data, ...(req.body ?? {}) };
    await prisma_1.prisma.crmRecord.update({ where: { id: req.params.id }, data: { data: merged } });
    // Un devis passé au statut "accepte" génère automatiquement son encaissement en trésorerie
    let income = null;
    if (req.params.kind === "devis" && merged.statut === "accepte") {
        income = await (0, treasury_1.ensureIncomeForDevis)(prisma_1.prisma, req.params.id);
    }
    // Un devis passé au statut "envoye" notifie le client
    if (req.params.kind === "devis" && merged.statut === "envoye" && existing.data.statut !== "envoye") {
        const clientId = merged.client_id;
        if (clientId) {
            (0, notify_1.notifyUser)(String(clientId), {
                type: "INFO",
                title: "Devis envoyé",
                message: `Vous avez reçu un devis${merged?.numero ? ` ${merged?.numero}` : ""}${merged?.montant_ttc ? ` de ${merged?.montant_ttc} DT` : ""}.`.trim(),
                lien: "/client/devis",
            }).catch((e) => console.error("[notify]", e));
        }
    }
    // Un rendez-vous confirmé envoie automatiquement un email de confirmation au client
    const clientId = merged.client_id;
    if (req.params.kind === "appointments" && clientId) {
        const statut = merged.statut;
        if (statut === "confirme") {
            (0, notify_1.notifyUser)(clientId, {
                type: "SUCCESS",
                title: "Rendez-vous confirmé",
                message: `Votre rendez-vous du ${(0, notify_1.displayDate)(merged?.date_heure) || "(date à confirmer)"} est confirmé.`,
                lien: "/client/rendez-vous",
            }).catch((e) => console.error("[notify]", e));
            prisma_1.prisma.user.findUnique({ where: { id: clientId } })
                .then(async (client) => {
                if (!client?.email)
                    return;
                const result = await (0, mailer_1.sendAppointmentConfirmation)({
                    to: client.email,
                    clientName: [client.prenom, client.nom, client.name].filter(Boolean).join(" ") || undefined,
                    appointment: merged,
                });
                if (!result.sent)
                    console.warn("[mailer]", result.reason);
            })
                .catch((e) => console.error("[mailer] client introuvable:", e));
        }
        else if (statut === "annule") {
            (0, notify_1.notifyUser)(clientId, {
                type: "ERROR",
                title: "Rendez-vous annulé",
                message: `Votre rendez-vous du ${(0, notify_1.displayDate)(merged?.date_heure) || "(date inconnue)"} a été annulé par notre équipe.`,
                lien: "/client/rendez-vous",
            }).catch((e) => console.error("[notify]", e));
        }
    }
    res.json({ id: existing.id, ...merged, income: income ? { id: income.id, ...income.data } : null });
});
// DELETE /api/crm/:kind/:id  (ADMIN)
router.delete("/:kind/:id", authenticate_1.authenticate, async (req, res) => {
    if (req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const existing = await prisma_1.prisma.crmRecord.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        res.status(404).json({ error: "Record not found" });
        return;
    }
    await prisma_1.prisma.crmRecord.delete({ where: { id: req.params.id } });
    res.status(204).send();
});
exports.default = router;
