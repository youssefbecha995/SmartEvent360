import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";

const router = Router();

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN: LIST ALL PROVIDERS (with optional filters)
// ══════════════════════════════════════════════════════════════════════════════

router.get("/", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }

  const where: any = {};
  if (req.query.serviceId) where.serviceId = req.query.serviceId as string;
  if (req.query.city) where.city = { contains: req.query.city as string, mode: "insensitive" };
  if (req.query.active !== undefined) where.active = req.query.active === "true";
  if (req.query.search) {
    where.OR = [
      { name: { contains: req.query.search as string, mode: "insensitive" } },
      { description: { contains: req.query.search as string, mode: "insensitive" } },
    ];
  }

  const providers = await prisma.provider.findMany({
    where,
    include: {
      service: { select: { id: true, name: true, icon: true } },
      composition: { orderBy: { role: "asc" } },
      _count: { select: { composition: true, packServices: true } },
    },
    orderBy: { displayOrder: "asc" },
  });
  res.json(providers);
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/providers/public — public list (available only)
// ══════════════════════════════════════════════════════════════════════════════

router.get("/public", async (req: Request, res: Response) => {
  const where: any = { active: true, isAvailable: true };
  if (req.query.serviceId) where.serviceId = req.query.serviceId as string;
  if (req.query.city) where.city = { contains: req.query.city as string, mode: "insensitive" };

  const providers = await prisma.provider.findMany({
    where,
    include: {
      service: { select: { id: true, name: true, icon: true } },
      composition: true,
    },
    orderBy: { displayOrder: "asc" },
  });
  res.json(providers);
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/providers/admin/stats — admin stats (BEFORE /:id to avoid conflict)
// ══════════════════════════════════════════════════════════════════════════════

router.get("/admin/stats", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }

  const [total, active, withComposition, inPacks] = await Promise.all([
    prisma.provider.count(),
    prisma.provider.count({ where: { active: true } }),
    prisma.provider.count({ where: { composition: { some: {} } } }),
    prisma.provider.count({ where: { packServices: { some: {} } } }),
  ]);

  res.json({ total, active, withComposition, inPacks });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/providers/:id — single provider detail
// ══════════════════════════════════════════════════════════════════════════════

router.get("/:id", async (req: Request, res: Response) => {
  const provider = await prisma.provider.findUnique({
    where: { id: req.params.id },
    include: {
      service: { select: { id: true, name: true, icon: true, basePrice: true, priceType: true } },
      composition: true,
      availability: {
        where: { date: { gte: new Date() } },
        orderBy: { date: "asc" },
        take: 90,
      },
      reviews: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      gallery: { orderBy: { displayOrder: "asc" } },
      _count: { select: { composition: true, packServices: true, reviews: true } },
    },
  });
  if (!provider) { res.status(404).json({ error: "Provider not found" }); return; }
  res.json(provider);
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/providers — ADMIN create
// ══════════════════════════════════════════════════════════════════════════════

router.post("/", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const {
    name, description, image, price, isAvailable, rating,
    city, address, phone, email, website,
    serviceId, active, displayOrder, metadata, composition,
  } = req.body;
  if (!name || !serviceId) {
    res.status(400).json({ error: "name and serviceId are required" }); return;
  }

  const provider = await prisma.provider.create({
    data: {
      name,
      description: description ?? null,
      image: image ?? null,
      price: price != null ? Number(price) : 0,
      isAvailable: isAvailable !== false,
      rating: rating != null ? Number(rating) : null,
      city: city ?? null,
      address: address ?? null,
      phone: phone ?? null,
      email: email ?? null,
      website: website ?? null,
      serviceId,
      active: active !== false,
      displayOrder: displayOrder ? Number(displayOrder) : 0,
      metadata: metadata ?? null,
    },
  });

  // Create composition if provided
  if (Array.isArray(composition) && composition.length > 0) {
    for (const c of composition) {
      if (!c.role) continue;
      await prisma.providerComposition.create({
        data: {
          providerId: provider.id,
          role: c.role,
          quantity: c.quantity ? Number(c.quantity) : 1,
          description: c.description ?? null,
        },
      });
    }
  }

  const result = await prisma.provider.findUnique({
    where: { id: provider.id },
    include: { composition: true, service: { select: { id: true, name: true, icon: true } } },
  });
  res.status(201).json(result);
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/providers/:id — ADMIN update
// ══════════════════════════════════════════════════════════════════════════════

router.patch("/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.provider.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Provider not found" }); return; }

  const allowed = [
    "name", "description", "image", "price", "isAvailable", "rating",
    "city", "address", "phone", "email", "website",
    "active", "displayOrder", "metadata",
  ];
  const data: Record<string, any> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) data[key] = req.body[key];
  }
  if (data.price !== undefined) data.price = Number(data.price);
  if (data.rating !== undefined) data.rating = data.rating != null ? Number(data.rating) : null;
  if (data.displayOrder !== undefined) data.displayOrder = Number(data.displayOrder);

  const provider = await prisma.provider.update({ where: { id: req.params.id }, data });
  res.json(provider);
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/providers/:id/status — ADMIN toggle active
// ══════════════════════════════════════════════════════════════════════════════

router.patch("/:id/status", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.provider.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Provider not found" }); return; }
  const provider = await prisma.provider.update({
    where: { id: req.params.id },
    data: { active: !existing.active },
  });
  res.json(provider);
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/providers/:id — ADMIN
// ══════════════════════════════════════════════════════════════════════════════

router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.provider.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { packServices: true } } },
  });
  if (!existing) { res.status(404).json({ error: "Provider not found" }); return; }

  if (existing._count.packServices > 0) {
    // Soft-delete if used in packs
    await prisma.provider.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ message: "Prestataire désactivé (utilisé dans des packs)", softDeleted: true });
  } else {
    await prisma.providerComposition.deleteMany({ where: { providerId: req.params.id } });
    await prisma.providerAvailability.deleteMany({ where: { providerId: req.params.id } });
    await prisma.provider.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSITION MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/providers/:id/composition
router.get("/:id/composition", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const composition = await prisma.providerComposition.findMany({
    where: { providerId: req.params.id },
    orderBy: { role: "asc" },
  });
  res.json(composition);
});

// POST /api/providers/:id/composition — add member
router.post("/:id/composition", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.provider.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Provider not found" }); return; }

  const { role, quantity, description } = req.body;
  if (!role) { res.status(400).json({ error: "role is required" }); return; }

  const member = await prisma.providerComposition.create({
    data: {
      providerId: req.params.id,
      role,
      quantity: quantity ? Number(quantity) : 1,
      description: description ?? null,
    },
  });
  res.status(201).json(member);
});

// PATCH /api/providers/composition/:memberId — update member
router.patch("/composition/:memberId", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.providerComposition.findUnique({ where: { id: req.params.memberId } });
  if (!existing) { res.status(404).json({ error: "Composition member not found" }); return; }

  const { role, quantity, description } = req.body;
  const member = await prisma.providerComposition.update({
    where: { id: req.params.memberId },
    data: {
      ...(role !== undefined && { role }),
      ...(quantity !== undefined && { quantity: Number(quantity) }),
      ...(description !== undefined && { description }),
    },
  });
  res.json(member);
});

// DELETE /api/providers/composition/:memberId — remove member
router.delete("/composition/:memberId", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.providerComposition.findUnique({ where: { id: req.params.memberId } });
  if (!existing) { res.status(404).json({ error: "Composition member not found" }); return; }
  await prisma.providerComposition.delete({ where: { id: req.params.memberId } });
  res.status(204).send();
});

// ══════════════════════════════════════════════════════════════════════════════
// AVAILABILITY MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/providers/:id/availability?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/:id/availability", async (req: Request, res: Response) => {
  const provider = await prisma.provider.findUnique({ where: { id: req.params.id } });
  if (!provider) { res.status(404).json({ error: "Provider not found" }); return; }

  const startDate = req.query.start ? new Date(req.query.start as string) : new Date();
  const endDate = req.query.end ? new Date(req.query.end as string) : (() => {
    const d = new Date(); d.setMonth(d.getMonth() + 3); return d;
  })();

  const slots = await prisma.providerAvailability.findMany({
    where: {
      providerId: req.params.id,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: "asc" },
  });
  res.json(slots);
});

// POST /api/providers/:id/availability — set availability for a date
router.post("/:id/availability", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const provider = await prisma.provider.findUnique({ where: { id: req.params.id } });
  if (!provider) { res.status(404).json({ error: "Provider not found" }); return; }

  const { date, status, notes } = req.body;
  if (!date || !status) {
    res.status(400).json({ error: "date and status are required" }); return;
  }

  const slot = await prisma.providerAvailability.upsert({
    where: {
      providerId_date: { providerId: req.params.id, date: new Date(date) },
    },
    update: { status, notes: notes ?? null },
    create: {
      providerId: req.params.id,
      date: new Date(date),
      status,
      notes: notes ?? null,
    },
  });
  res.json(slot);
});

// POST /api/providers/:id/availability/bulk — bulk set availability
router.post("/:id/availability/bulk", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const provider = await prisma.provider.findUnique({ where: { id: req.params.id } });
  if (!provider) { res.status(404).json({ error: "Provider not found" }); return; }

  const { dates, status } = req.body;
  if (!Array.isArray(dates) || !status) {
    res.status(400).json({ error: "dates (array) and status are required" }); return;
  }

  const results = [];
  for (const d of dates) {
    const slot = await prisma.providerAvailability.upsert({
      where: {
        providerId_date: { providerId: req.params.id, date: new Date(d) },
      },
      update: { status },
      create: { providerId: req.params.id, date: new Date(d), status },
    });
    results.push(slot);
  }
  res.json(results);
});

// DELETE /api/providers/:id/availability/:date — remove availability slot
router.delete("/:id/availability/:date", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const date = new Date(req.params.date);
  await prisma.providerAvailability.deleteMany({
    where: { providerId: req.params.id, date },
  });
  res.status(204).send();
});

// ══════════════════════════════════════════════════════════════════════════════
// CHECK AVAILABILITY (public, for booking)
// ══════════════════════════════════════════════════════════════════════════════

router.get("/:id/check-availability", async (req: Request, res: Response) => {
  const provider = await prisma.provider.findUnique({ where: { id: req.params.id } });
  if (!provider) { res.status(404).json({ error: "Provider not found" }); return; }

  const dateStr = req.query.date as string;
  if (!dateStr) { res.status(400).json({ error: "date query parameter required" }); return; }

  const targetDate = new Date(dateStr);
  const slot = await prisma.providerAvailability.findUnique({
    where: {
      providerId_date: { providerId: req.params.id, date: targetDate },
    },
  });

  const available = !slot || slot.status === "DISPONIBLE";
  res.json({
    available,
    status: slot?.status || "DISPONIBLE",
    message: !available ? `Prestataire ${slot?.status?.toLowerCase() || 'indisponible'} pour cette date` : undefined,
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// REVIEWS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/providers/:id/reviews
router.get("/:id/reviews", async (req: Request, res: Response) => {
  const reviews = await prisma.providerReview.findMany({
    where: { providerId: req.params.id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(reviews);
});

// POST /api/providers/:id/reviews (auth required)
router.post("/:id/reviews", authenticate, async (req: Request, res: Response) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: "rating (1-5) is required" }); return;
  }

  const existing = await prisma.providerReview.findUnique({
    where: { userId_providerId: { userId: req.user!.userId, providerId: req.params.id } },
  });
  if (existing) {
    res.status(409).json({ error: "Vous avez déjà laissé un avis pour ce prestataire" }); return;
  }

  const review = await prisma.providerReview.create({
    data: {
      userId: req.user!.userId,
      providerId: req.params.id,
      rating: Number(rating),
      comment: comment ?? null,
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // Update provider average rating
  const agg = await prisma.providerReview.aggregate({
    where: { providerId: req.params.id },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await prisma.provider.update({
    where: { id: req.params.id },
    data: {
      rating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
      reviewCount: agg._count.rating,
    },
  });

  res.status(201).json(review);
});

// DELETE /api/providers/reviews/:reviewId
router.delete("/reviews/:reviewId", authenticate, async (req: Request, res: Response) => {
  const review = await prisma.providerReview.findUnique({ where: { id: req.params.reviewId } });
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }
  if (review.userId !== req.user!.userId && req.user!.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  await prisma.providerReview.delete({ where: { id: req.params.reviewId } });

  // Recalculate rating
  const agg = await prisma.providerReview.aggregate({
    where: { providerId: review.providerId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await prisma.provider.update({
    where: { id: review.providerId },
    data: {
      rating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
      reviewCount: agg._count.rating,
    },
  });

  res.status(204).send();
});

// ══════════════════════════════════════════════════════════════════════════════
// GALLERY
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/providers/:id/gallery
router.get("/:id/gallery", async (req: Request, res: Response) => {
  const gallery = await prisma.providerGallery.findMany({
    where: { providerId: req.params.id },
    orderBy: { displayOrder: "asc" },
  });
  res.json(gallery);
});

// POST /api/providers/:id/gallery (admin)
router.post("/:id/gallery", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const { imageUrl, caption, displayOrder } = req.body;
  if (!imageUrl) { res.status(400).json({ error: "imageUrl is required" }); return; }

  const photo = await prisma.providerGallery.create({
    data: {
      providerId: req.params.id,
      imageUrl,
      caption: caption ?? null,
      displayOrder: displayOrder ? Number(displayOrder) : 0,
    },
  });
  res.status(201).json(photo);
});

// DELETE /api/providers/gallery/:photoId (admin)
router.delete("/gallery/:photoId", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  await prisma.providerGallery.delete({ where: { id: req.params.photoId } }).catch(() => {});
  res.status(204).send();
});

export default router;
