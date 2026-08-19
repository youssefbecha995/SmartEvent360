import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";
import { ensureIncomeForEvent } from "../lib/treasury";

const router = Router();

const eventInclude = {
  category: true,
  organizer: { select: { id: true, name: true } },
  client: { select: { id: true, name: true, company: true } },
} as const;

// GET /api/events
router.get("/", async (req: Request, res: Response) => {
  const { category, page = "1", limit = "10" } = req.query;

  const where = category ? { category: { slug: String(category) } } : {};
  const skip = (Number(page) - 1) * Number(limit);

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { date: "asc" },
      include: eventInclude,
    }),
    prisma.event.count({ where }),
  ]);

  res.json({ data: events, total, page: Number(page), limit: Number(limit) });
});

// POST /api/events  (ORGANIZER ou ADMIN requis)
router.post("/", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN" && req.user!.role !== "ORGANIZER") {
    res.status(403).json({ error: "Accès réservé au personnel (ADMIN ou ORGANIZER)" });
    return;
  }

  const { title, description, location, date, imageUrl, capacity, price, categoryId, clientId } = req.body;

  if (!title || !location || !date || !capacity) {
    res.status(400).json({ error: "title, location, date and capacity are required" });
    return;
  }

  if (clientId) {
    const client = await prisma.user.findUnique({ where: { id: String(clientId) } });
    if (!client) {
      res.status(400).json({ error: "client not found" });
      return;
    }
  }

  const event = await prisma.event.create({
    data: {
      title,
      description,
      location,
      date: new Date(date),
      imageUrl,
      capacity: Number(capacity),
      price: price ? Number(price) : 0,
      categoryId: categoryId ?? null,
      clientId: clientId ? String(clientId) : null,
      organizerId: req.user!.userId,
    },
    include: eventInclude,
  });

  if (event.clientId && event.price > 0) {
    await ensureIncomeForEvent(prisma, event);
  }

  res.status(201).json(event);
});

// GET /api/events/:id
router.get("/:id", async (req: Request, res: Response) => {
  const event = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: {
      ...eventInclude,
      _count: { select: { bookings: true } },
    },
  });

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(event);
});

// PUT /api/events/:id
router.put("/:id", authenticate, async (req: Request, res: Response) => {
  const { title, description, location, date, imageUrl, capacity, price, categoryId, isPublished, clientId } = req.body;

  const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Event not found" }); return; }

  // Seul l'organisateur ou un ADMIN peut modifier
  if (existing.organizerId !== req.user!.userId && req.user!.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  if (clientId !== undefined) {
    const client = await prisma.user.findUnique({ where: { id: String(clientId) } });
    if (!client) {
      res.status(400).json({ error: "client not found" });
      return;
    }
  }

  const event = await prisma.event.update({
    where: { id: req.params.id },
    data: {
      ...(title       && { title }),
      ...(description !== undefined && { description }),
      ...(location    && { location }),
      ...(date        && { date: new Date(date) }),
      ...(imageUrl    !== undefined && { imageUrl }),
      ...(capacity    && { capacity: Number(capacity) }),
      ...(price       !== undefined && { price: Number(price) }),
      ...(categoryId  !== undefined && { categoryId }),
      ...(clientId    !== undefined && { clientId: clientId ? String(clientId) : null }),
      ...(isPublished !== undefined && { isPublished }),
    },
    include: eventInclude,
  });

  if (event.clientId && event.price > 0) {
    await ensureIncomeForEvent(prisma, event);
  }

  res.json(event);
});

// DELETE /api/events/:id
router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Event not found" }); return; }

  if (existing.organizerId !== req.user!.userId && req.user!.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  await prisma.event.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
