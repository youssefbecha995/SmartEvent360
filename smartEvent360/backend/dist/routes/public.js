"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
function toRecord(row) {
    return { id: row.id, ...row.data };
}
// GET /api/public/services — prestations visibles sur le site public
router.get("/services", async (_req, res) => {
    const rows = await prisma_1.prisma.crmRecord.findMany({
        where: { kind: "services" },
        orderBy: { createdAt: "asc" },
    });
    const services = rows
        .map(toRecord)
        .filter(s => s.disponible !== false);
    res.json(services);
});
// POST /api/public/:kind — demandes publiques (devis / contact / RDV)
// whitelist pour éviter toute création arbitraire
const PUBLIC_CREATE_KINDS = ["quote_requests", "contact_messages", "appointment_requests"];
router.post("/:kind", async (req, res) => {
    const kind = req.params.kind;
    if (!PUBLIC_CREATE_KINDS.includes(kind)) {
        res.status(400).json({ error: "Type de demande non reconnu." });
        return;
    }
    const body = (req.body ?? {});
    const data = {
        ...body,
        statut: body.statut ?? (kind === "appointment_requests" ? "nouveau" : "nouvelle"),
        created_at: new Date().toISOString(),
    };
    if (kind === "contact_messages")
        data.date_envoi = data.created_at;
    if (kind === "appointment_requests" && !data.date_heure)
        data.date_heure = null;
    const row = await prisma_1.prisma.crmRecord.create({ data: { kind, data } });
    res.status(201).json(toRecord(row));
});
exports.default = router;
