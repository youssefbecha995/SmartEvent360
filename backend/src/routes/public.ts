import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

function toRecord(row: { id: string; data: unknown }) {
  return { id: row.id, ...(row.data as object) };
}

// GET /api/public/services — prestations visibles sur le site public
router.get("/services", async (_req: Request, res: Response) => {
  // Try new Service model first
  try {
    const newServices = await prisma.service.findMany({
      where: { active: true, visibleOnStore: true },
      include: {
        type: { select: { id: true, name: true, slug: true, icon: true, color: true } },
        _count: { select: { resources: true } },
      },
      orderBy: { displayOrder: "asc" },
    });
    if (newServices.length > 0) {
      res.json(newServices);
      return;
    }
  } catch {
    // Fall through to legacy CRM records
  }

  // Fallback: legacy CRM records
  const rows = await prisma.crmRecord.findMany({
    where: { kind: "services" },
    orderBy: { createdAt: "asc" },
  });
  const services = rows
    .map(toRecord)
    .filter(s => (s as any).disponible !== false);
  res.json(services);
});

// POST /api/public/:kind — demandes publiques (devis / contact / RDV)
// whitelist pour éviter toute création arbitraire
const PUBLIC_CREATE_KINDS = ["quote_requests", "contact_messages", "appointment_requests"];

router.post("/:kind", async (req: Request, res: Response) => {
  const kind = req.params.kind;
  if (!PUBLIC_CREATE_KINDS.includes(kind)) {
    res.status(400).json({ error: "Type de demande non reconnu." });
    return;
  }
  const body = (req.body ?? {}) as Record<string, any>;
  const data: Record<string, any> = {
    ...body,
    statut: body.statut ?? (kind === "appointment_requests" ? "nouveau" : "nouvelle"),
    created_at: new Date().toISOString(),
  };
  if (kind === "contact_messages") data.date_envoi = data.created_at;
  if (kind === "appointment_requests" && !data.date_heure) data.date_heure = null;

  const row = await prisma.crmRecord.create({ data: { kind, data } });
  res.status(201).json(toRecord(row));
});

export default router;
