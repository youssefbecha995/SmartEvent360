import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";
import { ensureIncomeForReservation, removeIncomeForReservation } from "../lib/treasury";
import { notifyUser } from "../lib/notify";

const router = Router();

// Normalise les prestations incluses : ne garde que des chaînes non vides
function parseFeatures(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

// ── GET /api/packs ────────────────────────────────────────────────────────────
router.get("/", async (_req: Request, res: Response) => {
  const packs = await prisma.pack.findMany({
    where: { isActive: true, status: "PUBLIE" },
    include: {
      packServices: {
        include: {
          service: { select: { id: true, name: true, icon: true, image: true } },
          resource: { select: { id: true, name: true } },
          provider: { select: { id: true, name: true, price: true, isAvailable: true, city: true } },
        },
        orderBy: { displayOrder: "asc" },
      },
    },
    orderBy: { price: "asc" },
  });
  res.json(packs);
});

// ── GET /api/packs/admin — admin list (all statuses) ──────────────────────────
router.get("/admin", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const packs = await prisma.pack.findMany({
    include: {
      packServices: {
        include: {
          service: { select: { id: true, name: true, icon: true } },
          resource: { select: { id: true, name: true } },
          provider: { select: { id: true, name: true, price: true } },
        },
      },
      _count: { select: { packServices: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(packs);
});

// ── GET /api/packs/reservations — réservations de packs par les clients (ADMIN) ──
router.get("/reservations", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await prisma.crmRecord.findMany({
    where: { kind: "client_packs" },
    orderBy: { createdAt: "desc" },
  });
  const userIds = [...new Set(rows.map(r => (r.data as any)?.client_id).filter(Boolean))] as string[];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, prenom: true, nom: true, name: true, email: true, phone: true },
      })
    : [];
  const umap = new Map(users.map(u => [u.id, u]));
  const incomeRows = await prisma.crmRecord.findMany({
    where: { kind: "incomes", OR: rows.map(r => ({ data: { path: ["reservation_id"], equals: r.id } })) },
    select: { id: true, data: true },
  });
  const incomeMap = new Map(
    incomeRows.map(i => [(i.data as any)?.reservation_id as string, { id: i.id, montant: (i.data as any)?.montant }])
  );
  res.json(rows.map(r => ({
    id: r.id,
    createdAt: r.createdAt,
    ...(r.data as object),
    client: umap.get((r.data as any)?.client_id) ?? null,
    income: incomeMap.get(r.id) ?? null,
  })));
});

// ── PATCH /api/packs/reservations/:id — changer le statut d'une réservation (ADMIN) ──
// confirme → crée l'encaissement en trésorerie · annule → le retire
const RESERVATION_STATUTS = ["reserve", "confirme", "paye", "annule"];

router.patch("/reservations/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const row = await prisma.crmRecord.findUnique({ where: { id: req.params.id } });
  if (!row || row.kind !== "client_packs") { res.status(404).json({ error: "Réservation introuvable" }); return; }
  const statut = req.body?.statut;
  if (!RESERVATION_STATUTS.includes(statut)) { res.status(400).json({ error: "Statut invalide." }); return; }

  const before = (row.data as any)?.statut;
  const merged = {
    ...(row.data as object),
    statut,
    date_confirmation: statut === "confirme" ? new Date().toISOString() : (row.data as any)?.date_confirmation ?? null,
    date_annulation: statut === "annule" ? new Date().toISOString() : (row.data as any)?.date_annulation ?? null,
  };
  await prisma.crmRecord.update({ where: { id: row.id }, data: { data: merged } });

  let income = null;
  // La trésorerie suit le statut : confirmé/payé → encaissement présent, sinon retiré
  if ((statut === "confirme" || statut === "paye") && before !== statut) {
    const created = await ensureIncomeForReservation(prisma, { id: row.id, data: merged });
    income = created ? { id: created.id, ...(created.data as object) } : null;
  } else if (statut === "reserve" && (before === "confirme" || before === "paye")) {
    await removeIncomeForReservation(prisma, row.id);
  } else if (statut === "annule") {
    await removeIncomeForReservation(prisma, row.id);
  }

  // Notifier le client du changement de statut de sa réservation
  const clientId = (merged as any).client_id;
  if (clientId) {
    const packName = (merged as any).nom_pack || "votre pack";
    if (statut === "confirme") {
      notifyUser(clientId, {
        type: "SUCCESS",
        title: "Réservation confirmée",
        message: `Votre réservation du pack « ${packName} » pour le ${(merged as any).date_debut || ""} est confirmée.`,
        lien: "/client/packs",
      }).catch((e) => console.error("[notify]", e));
    } else if (statut === "annule") {
      notifyUser(clientId, {
        type: "ERROR",
        title: "Réservation annulée",
        message: `Votre réservation du pack « ${packName} » (${(merged as any).date_debut || ""}) a été annulée par notre équipe.`,
        lien: "/client/packs",
      }).catch((e) => console.error("[notify]", e));
    }
  }

  res.json({ id: row.id, ...merged, income });
});

// ── GET /api/packs/:id ────────────────────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response) => {
  const pack = await prisma.pack.findUnique({
    where: { id: req.params.id },
    include: {
      packServices: {
        include: {
          service: {
            include: {
              parameters: { orderBy: { displayOrder: "asc" } },
              resources: { where: { active: true }, select: { id: true, name: true, capacity: true, basePrice: true } },
            },
          },
          resource: true,
          provider: {
            include: {
              composition: true,
            },
          },
        },
        orderBy: { displayOrder: "asc" },
      },
    },
  });
  if (!pack) { res.status(404).json({ error: "Pack not found" }); return; }
  res.json(pack);
});

// ── POST /api/packs  (ADMIN) ──────────────────────────────────────────────────
router.post("/", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const {
    name, description, imageUrl, images, videoUrl, features, price, originalPrice,
    currency, pricePerPerson, depositPercent, cancellationFee,
    duration, maxGuests, minGuests, badge, category,
    isPopular, isCustomizable,
    status, eventType, promoCode, negotiable, isCombo,
    isSeasonalPromo, promoStartDate, promoEndDate,
    translations, visibleOnStore, visibleForClients,
    services, // Array of { serviceId, resourceId?, quantity?, duration?, status?, config?, displayOrder?, priceOverride? }
    personnel, equipment, // Array of { recordId?, nom, prenom?, fonction?, categorie?, prix, quantite? }
  } = req.body;
  if (!name || price === undefined) {
    res.status(400).json({ error: "name and price are required" }); return;
  }

  const pack = await prisma.pack.create({
    data: {
      name,
      description: description ?? null,
      imageUrl: imageUrl ?? null,
      images: images ?? null,
      videoUrl: videoUrl ?? null,
      features: parseFeatures(features),
      price: Number(price),
      originalPrice: originalPrice != null ? Number(originalPrice) : null,
      currency: currency || "TND",
      pricePerPerson: pricePerPerson != null ? Number(pricePerPerson) : null,
      depositPercent: depositPercent != null ? Number(depositPercent) : null,
      cancellationFee: cancellationFee != null ? Number(cancellationFee) : null,
      duration: duration ? Number(duration) : 4,
      maxGuests: maxGuests ? Number(maxGuests) : 100,
      minGuests: minGuests ? Number(minGuests) : 0,
      badge: badge ?? null,
      category: category ?? null,
      isPopular: isPopular ?? false,
      isCustomizable: isCustomizable === true,
      status: status || "PUBLIE",
      eventType: eventType ?? null,
      promoCode: promoCode ?? null,
      negotiable: negotiable === true,
      isCombo: isCombo === true,
      isSeasonalPromo: isSeasonalPromo === true,
      promoStartDate: promoStartDate ? new Date(promoStartDate) : null,
      promoEndDate: promoEndDate ? new Date(promoEndDate) : null,
      translations: translations ?? null,
      visibleOnStore: visibleOnStore !== false,
      visibleForClients: visibleForClients !== false,
      ...(Array.isArray(personnel) && { personnel }),
      ...(Array.isArray(equipment) && { equipment }),
    },
  });

  // Create PackService entries
  if (Array.isArray(services) && services.length > 0) {
    for (const svc of services) {
      if (!svc.serviceId) continue;
      await prisma.packService.create({
        data: {
          packId: pack.id,
          serviceId: svc.serviceId,
          resourceId: svc.resourceId ?? null,
          providerId: svc.providerId ?? null,
          quantity: svc.quantity ? Number(svc.quantity) : 1,
          duration: svc.duration != null ? Number(svc.duration) : null,
          status: svc.status || "INCLUS",
          config: svc.config ?? null,
          displayOrder: svc.displayOrder ? Number(svc.displayOrder) : 0,
          priceOverride: svc.priceOverride != null ? Number(svc.priceOverride) : null,
        },
      });
    }
  }

  // Return created pack with services
  const result = await prisma.pack.findUnique({
    where: { id: pack.id },
    include: {
      packServices: {
        include: {
          service: { select: { id: true, name: true, icon: true } },
          resource: { select: { id: true, name: true } },
          provider: { select: { id: true, name: true, price: true } },
        },
      },
    },
  });
  res.status(201).json(result);
});

// ── PUT /api/packs/:id  (ADMIN) ───────────────────────────────────────────────
router.put("/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.pack.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Pack not found" }); return; }

  const {
    name, description, imageUrl, images, videoUrl, features, price, originalPrice,
    currency, pricePerPerson, depositPercent, cancellationFee,
    duration, maxGuests, minGuests, badge, category,
    isPopular, isActive, isCustomizable,
    status, eventType, promoCode, negotiable, isCombo,
    isSeasonalPromo, promoStartDate, promoEndDate,
    translations, visibleOnStore, visibleForClients,
    services,
    personnel, equipment,
  } = req.body;

  const pack = await prisma.pack.update({
    where: { id: req.params.id },
    data: {
      ...(name        !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(imageUrl    !== undefined && { imageUrl }),
      ...(images      !== undefined && { images }),
      ...(videoUrl    !== undefined && { videoUrl }),
      ...(features    !== undefined && { features: parseFeatures(features) }),
      ...(price       !== undefined && { price: Number(price) }),
      ...(originalPrice !== undefined && { originalPrice: originalPrice != null ? Number(originalPrice) : null }),
      ...(currency    !== undefined && { currency }),
      ...(pricePerPerson !== undefined && { pricePerPerson: pricePerPerson != null ? Number(pricePerPerson) : null }),
      ...(depositPercent !== undefined && { depositPercent: depositPercent != null ? Number(depositPercent) : null }),
      ...(cancellationFee !== undefined && { cancellationFee: cancellationFee != null ? Number(cancellationFee) : null }),
      ...(duration    !== undefined && { duration: Number(duration) }),
      ...(maxGuests   !== undefined && { maxGuests: Number(maxGuests) }),
      ...(minGuests   !== undefined && { minGuests: Number(minGuests) }),
      ...(badge       !== undefined && { badge }),
      ...(category    !== undefined && { category }),
      ...(isPopular   !== undefined && { isPopular }),
      ...(isActive    !== undefined && { isActive }),
      ...(isCustomizable !== undefined && { isCustomizable }),
      ...(status      !== undefined && { status }),
      ...(eventType   !== undefined && { eventType }),
      ...(promoCode   !== undefined && { promoCode }),
      ...(negotiable  !== undefined && { negotiable }),
      ...(isCombo     !== undefined && { isCombo }),
      ...(isSeasonalPromo !== undefined && { isSeasonalPromo }),
      ...(promoStartDate !== undefined && { promoStartDate: promoStartDate ? new Date(promoStartDate) : null }),
      ...(promoEndDate !== undefined && { promoEndDate: promoEndDate ? new Date(promoEndDate) : null }),
      ...(translations !== undefined && { translations }),
      ...(visibleOnStore !== undefined && { visibleOnStore }),
      ...(visibleForClients !== undefined && { visibleForClients }),
      ...(Array.isArray(personnel) && { personnel }),
      ...(Array.isArray(equipment) && { equipment }),
    },
  });

  // Replace services if provided
  if (Array.isArray(services)) {
    await prisma.packService.deleteMany({ where: { packId: req.params.id } });
    for (const svc of services) {
      if (!svc.serviceId) continue;
      await prisma.packService.create({
        data: {
          packId: pack.id,
          serviceId: svc.serviceId,
          resourceId: svc.resourceId ?? null,
          providerId: svc.providerId ?? null,
          quantity: svc.quantity ? Number(svc.quantity) : 1,
          duration: svc.duration != null ? Number(svc.duration) : null,
          status: svc.status || "INCLUS",
          config: svc.config ?? null,
          displayOrder: svc.displayOrder ? Number(svc.displayOrder) : 0,
          priceOverride: svc.priceOverride != null ? Number(svc.priceOverride) : null,
        },
      });
    }
  }

  const result = await prisma.pack.findUnique({
    where: { id: pack.id },
    include: {
      packServices: {
        include: {
          service: { select: { id: true, name: true, icon: true } },
          resource: { select: { id: true, name: true } },
          provider: { select: { id: true, name: true, price: true } },
        },
      },
    },
  });
  res.json(result);
});

// ── PATCH /api/packs/:id/services  (ADMIN) — add/remove services from pack ────
router.patch("/:id/services", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.pack.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Pack not found" }); return; }

  const { action, serviceId, resourceId, providerId, quantity, duration, status, config, displayOrder, priceOverride } = req.body;

  if (action === "add" && serviceId) {
    const already = await prisma.packService.findUnique({
      where: { packId_serviceId: { packId: req.params.id, serviceId } },
    });
    if (already) {
      // Update existing
      const updated = await prisma.packService.update({
        where: { id: already.id },
        data: {
          ...(resourceId !== undefined && { resourceId: resourceId ?? null }),
          ...(providerId !== undefined && { providerId: providerId ?? null }),
          ...(quantity !== undefined && { quantity: Number(quantity) }),
          ...(duration !== undefined && { duration: duration != null ? Number(duration) : null }),
          ...(status !== undefined && { status }),
          ...(config !== undefined && { config }),
          ...(displayOrder !== undefined && { displayOrder: Number(displayOrder) }),
          ...(priceOverride !== undefined && { priceOverride: priceOverride != null ? Number(priceOverride) : null }),
        },
      });
      res.json(updated);
    } else {
      const created = await prisma.packService.create({
        data: {
          packId: req.params.id,
          serviceId,
          resourceId: resourceId ?? null,
          providerId: providerId ?? null,
          quantity: quantity ? Number(quantity) : 1,
          duration: duration != null ? Number(duration) : null,
          status: status || "INCLUS",
          config: config ?? null,
          displayOrder: displayOrder ? Number(displayOrder) : 0,
          priceOverride: priceOverride != null ? Number(priceOverride) : null,
        },
      });
      res.status(201).json(created);
    }
  } else if (action === "remove" && serviceId) {
    await prisma.packService.deleteMany({
      where: { packId: req.params.id, serviceId },
    });
    res.status(204).send();
  } else {
    res.status(400).json({ error: "action (add/remove) and serviceId required" });
  }
});

// ── DELETE /api/packs/:id  (ADMIN) ────────────────────────────────────────────
router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.pack.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Pack not found" }); return; }
  // Delete pack services first
  await prisma.packService.deleteMany({ where: { packId: req.params.id } });
  await prisma.pack.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ── POST /api/packs/:id/calculate-price  (ADMIN) — auto-calculate price from providers ──
router.post("/:id/calculate-price", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const pack = await prisma.pack.findUnique({
    where: { id: req.params.id },
    include: {
      packServices: {
        include: {
          provider: { select: { price: true } },
          service: { select: { basePrice: true } },
          resource: { select: { basePrice: true } },
        },
      },
    },
  });
  if (!pack) { res.status(404).json({ error: "Pack not found" }); return; }

  // Calculate total from provider prices (or fallback to resource/service basePrice)
  let totalServices = 0;
  for (const ps of pack.packServices) {
    const unitPrice = ps.priceOverride
      ?? ps.provider?.price
      ?? ps.resource?.basePrice
      ?? ps.service?.basePrice
      ?? 0;
    totalServices += unitPrice * (ps.quantity || 1);
  }

  // Apply optional discount (from request body or default 10%)
  const discountPercent = req.body.discountPercent != null ? Number(req.body.discountPercent) : 10;
  const discountAmount = Math.round(totalServices * discountPercent / 100);
  const finalPrice = totalServices - discountAmount;

  // Update pack
  await prisma.pack.update({
    where: { id: pack.id },
    data: {
      price: finalPrice,
      originalPrice: totalServices,
    },
  });

  res.json({
    totalServices,
    discountPercent,
    discountAmount,
    finalPrice,
    breakdown: pack.packServices.map(ps => ({
      service: ps.serviceId,
      provider: ps.provider?.price ?? null,
      priceOverride: ps.priceOverride,
      quantity: ps.quantity,
      lineTotal: (ps.priceOverride ?? ps.provider?.price ?? ps.resource?.basePrice ?? ps.service?.basePrice ?? 0) * (ps.quantity || 1),
    })),
  });
});

export default router;
