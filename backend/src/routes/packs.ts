import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";

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
        },
      },
      _count: { select: { packServices: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(packs);
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

  const { action, serviceId, resourceId, quantity, duration, status, config, displayOrder, priceOverride } = req.body;

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

export default router;
