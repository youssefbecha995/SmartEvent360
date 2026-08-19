import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";

const router = Router();

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE TYPES (dynamic, managed from Admin > Settings)
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/services/types — list all service types
router.get("/types", async (_req: Request, res: Response) => {
  const types = await prisma.serviceType.findMany({
    orderBy: { displayOrder: "asc" },
  });
  res.json(types);
});

// POST /api/services/types (ADMIN)
router.post("/types", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const { name, icon, color, displayOrder } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const type = await prisma.serviceType.create({
    data: { name, slug, icon: icon ?? null, color: color ?? null, displayOrder: displayOrder ?? 0 },
  });
  res.status(201).json(type);
});

// PATCH /api/services/types/:id (ADMIN)
router.patch("/types/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.serviceType.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Service type not found" }); return; }
  const { name, icon, color, active, displayOrder } = req.body;
  const type = await prisma.serviceType.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(name !== undefined && { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }),
      ...(icon !== undefined && { icon }),
      ...(color !== undefined && { color }),
      ...(active !== undefined && { active }),
      ...(displayOrder !== undefined && { displayOrder: Number(displayOrder) }),
    },
  });
  res.json(type);
});

// DELETE /api/services/types/:id (ADMIN)
router.delete("/types/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.serviceType.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Service type not found" }); return; }
  // Soft-delete: just deactivate
  await prisma.serviceType.update({ where: { id: req.params.id }, data: { active: false } });
  res.status(204).send();
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN SERVICES CRUD
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/services — admin list (all services, paginated)
router.get("/", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
  const skip = (page - 1) * limit;

  const where: any = {};
  if (req.query.search) {
    where.OR = [
      { name: { contains: req.query.search as string, mode: "insensitive" } },
      { description: { contains: req.query.search as string, mode: "insensitive" } },
    ];
  }
  if (req.query.typeId) where.typeId = req.query.typeId as string;
  if (req.query.active !== undefined) where.active = req.query.active === "true";
  if (req.query.featured !== undefined) where.featured = req.query.featured === "true";

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      include: {
        type: { select: { id: true, name: true, slug: true, icon: true, color: true } },
        _count: { select: { resources: true, parameters: true, packServices: true } },
      },
      orderBy: { displayOrder: "asc" },
      skip,
      take: limit,
    }),
    prisma.service.count({ where }),
  ]);

  res.json({ data: services, total, page, limit });
});

// GET /api/services/:id — admin detail
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const service = await prisma.service.findUnique({
    where: { id: req.params.id },
    include: {
      type: true,
      parameters: { orderBy: { displayOrder: "asc" } },
      resources: { orderBy: { displayOrder: "asc" } },
      packServices: {
        include: {
          pack: { select: { id: true, name: true, price: true, imageUrl: true, badge: true } },
        },
      },
      _count: { select: { resources: true, parameters: true, packServices: true } },
    },
  });
  if (!service) { res.status(404).json({ error: "Service not found" }); return; }
  res.json(service);
});

// POST /api/services — admin create
router.post("/", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const {
    name, code, description, shortDescription, icon, image,
    basePrice, priceMin, priceMax, priceType, typeId,
    active, featured, displayOrder, visibleOnStore, visibleForClients,
    minAdvanceDays, minDuration, availabilityMode, translations,
  } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const service = await prisma.service.create({
    data: {
      name,
      code: code ?? null,
      description: description ?? null,
      shortDescription: shortDescription ?? null,
      icon: icon ?? null,
      image: image ?? null,
      basePrice: basePrice ? Number(basePrice) : 0,
      priceMin: priceMin != null ? Number(priceMin) : null,
      priceMax: priceMax != null ? Number(priceMax) : null,
      priceType: priceType || "A_PARTIR_DE",
      typeId: typeId ?? null,
      active: active !== false,
      featured: featured === true,
      displayOrder: displayOrder ? Number(displayOrder) : 0,
      visibleOnStore: visibleOnStore !== false,
      visibleForClients: visibleForClients !== false,
      minAdvanceDays: minAdvanceDays ? Number(minAdvanceDays) : 0,
      minDuration: minDuration != null ? Number(minDuration) : null,
      availabilityMode: availabilityMode || "always",
      translations: translations ?? null,
      createdBy: req.user!.userId,
    },
  });
  res.status(201).json(service);
});

// PATCH /api/services/:id — admin update
router.patch("/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Service not found" }); return; }

  const allowed = [
    "name", "code", "description", "shortDescription", "icon", "image",
    "basePrice", "priceMin", "priceMax", "priceType", "typeId",
    "active", "featured", "displayOrder", "visibleOnStore", "visibleForClients",
    "minAdvanceDays", "minDuration", "availabilityMode", "translations",
  ];
  const data: Record<string, any> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) data[key] = req.body[key];
  }
  // Numeric coercion
  if (data.basePrice !== undefined) data.basePrice = Number(data.basePrice);
  if (data.priceMin !== undefined) data.priceMin = data.priceMin != null ? Number(data.priceMin) : null;
  if (data.priceMax !== undefined) data.priceMax = data.priceMax != null ? Number(data.priceMax) : null;
  if (data.displayOrder !== undefined) data.displayOrder = Number(data.displayOrder);
  if (data.minAdvanceDays !== undefined) data.minAdvanceDays = Number(data.minAdvanceDays);
  if (data.minDuration !== undefined) data.minDuration = data.minDuration != null ? Number(data.minDuration) : null;
  data.updatedBy = req.user!.userId;

  const service = await prisma.service.update({ where: { id: req.params.id }, data });
  res.json(service);
});

// PATCH /api/services/:id/status — toggle active
router.patch("/:id/status", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Service not found" }); return; }
  const service = await prisma.service.update({
    where: { id: req.params.id },
    data: { active: !existing.active, updatedBy: req.user!.userId },
  });
  res.json(service);
});

// PATCH /api/services/:id/featured — toggle featured
router.patch("/:id/featured", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Service not found" }); return; }
  const service = await prisma.service.update({
    where: { id: req.params.id },
    data: { featured: !existing.featured, updatedBy: req.user!.userId },
  });
  res.json(service);
});

// DELETE /api/services/:id — soft delete (never hard delete if used in packs/quotes)
router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.service.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { packServices: true } } },
  });
  if (!existing) { res.status(404).json({ error: "Service not found" }); return; }
  // If used in packs, only soft-delete
  if (existing._count.packServices > 0) {
    await prisma.service.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ message: "Service désactivé (utilisé dans des packs)", softDeleted: true });
  } else {
    // Hard delete: remove parameters & resources first, then service
    await prisma.serviceParameter.deleteMany({ where: { serviceId: req.params.id } });
    await prisma.serviceResource.deleteMany({ where: { serviceId: req.params.id } });
    await prisma.service.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE PARAMETERS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/services/:id/parameters
router.get("/:id/parameters", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const params = await prisma.serviceParameter.findMany({
    where: { serviceId: req.params.id },
    orderBy: { displayOrder: "asc" },
  });
  res.json(params);
});

// POST /api/services/:id/parameters
router.post("/:id/parameters", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const service = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!service) { res.status(404).json({ error: "Service not found" }); return; }

  const { name, type, options, defaultValue, required, displayOrder, group, description } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const param = await prisma.serviceParameter.create({
    data: {
      name,
      type: type || "TEXT",
      options: options ?? null,
      defaultValue: defaultValue ?? null,
      required: required === true,
      displayOrder: displayOrder ? Number(displayOrder) : 0,
      group: group ?? null,
      description: description ?? null,
      serviceId: req.params.id,
    },
  });
  res.status(201).json(param);
});

// PATCH /api/service-parameters/:id
router.patch("/service-parameters/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.serviceParameter.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Parameter not found" }); return; }
  const { name, type, options, defaultValue, required, displayOrder, group, description } = req.body;
  const param = await prisma.serviceParameter.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(options !== undefined && { options }),
      ...(defaultValue !== undefined && { defaultValue }),
      ...(required !== undefined && { required }),
      ...(displayOrder !== undefined && { displayOrder: Number(displayOrder) }),
      ...(group !== undefined && { group }),
      ...(description !== undefined && { description }),
    },
  });
  res.json(param);
});

// DELETE /api/service-parameters/:id
router.delete("/service-parameters/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.serviceParameter.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Parameter not found" }); return; }
  await prisma.serviceParameter.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE RESOURCES
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/services/:id/resources
router.get("/:id/resources", async (req: Request, res: Response) => {
  const where: any = { serviceId: req.params.id };
  // Non-admin users only see active + available resources
  if (!req.query.admin) {
    where.active = true;
    where.availability = "DISPONIBLE";
  }
  const resources = await prisma.serviceResource.findMany({
    where,
    orderBy: { displayOrder: "asc" },
  });
  res.json(resources);
});

// POST /api/services/:id/resources (ADMIN)
router.post("/:id/resources", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const service = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!service) { res.status(404).json({ error: "Service not found" }); return; }

  const { name, description, image, basePrice, capacity, location, city, availability, active, displayOrder, metadata } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const resource = await prisma.serviceResource.create({
    data: {
      name,
      description: description ?? null,
      image: image ?? null,
      basePrice: basePrice != null ? Number(basePrice) : null,
      capacity: capacity != null ? Number(capacity) : null,
      location: location ?? null,
      city: city ?? null,
      availability: availability || "DISPONIBLE",
      active: active !== false,
      displayOrder: displayOrder ? Number(displayOrder) : 0,
      metadata: metadata ?? null,
      serviceId: req.params.id,
    },
  });
  res.status(201).json(resource);
});

// PATCH /api/service-resources/:id (ADMIN)
router.patch("/service-resources/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.serviceResource.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Resource not found" }); return; }

  const allowed = ["name", "description", "image", "basePrice", "capacity", "location", "city", "availability", "active", "displayOrder", "metadata"];
  const data: Record<string, any> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) data[key] = req.body[key];
  }
  if (data.basePrice !== undefined) data.basePrice = data.basePrice != null ? Number(data.basePrice) : null;
  if (data.capacity !== undefined) data.capacity = data.capacity != null ? Number(data.capacity) : null;
  if (data.displayOrder !== undefined) data.displayOrder = Number(data.displayOrder);

  const resource = await prisma.serviceResource.update({ where: { id: req.params.id }, data });
  res.json(resource);
});

// DELETE /api/service-resources/:id (ADMIN)
router.delete("/service-resources/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.serviceResource.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Resource not found" }); return; }
  await prisma.serviceResource.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API (no auth required)
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/services/public/categories — active service types
router.get("/public/categories", async (_req: Request, res: Response) => {
  const types = await prisma.serviceType.findMany({
    where: { active: true },
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { services: { where: { active: true, visibleOnStore: true } } } } },
  });
  res.json(types);
});

// GET /api/services/public — active services for visitor
router.get("/public", async (req: Request, res: Response) => {
  const where: any = { active: true, visibleOnStore: true };
  if (req.query.typeId) where.typeId = req.query.typeId as string;
  if (req.query.featured) where.featured = true;
  if (req.query.search) {
    where.OR = [
      { name: { contains: req.query.search as string, mode: "insensitive" } },
      { description: { contains: req.query.search as string, mode: "insensitive" } },
    ];
  }

  const services = await prisma.service.findMany({
    where,
    include: {
      type: { select: { id: true, name: true, slug: true, icon: true, color: true } },
      resources: { where: { active: true, availability: "DISPONIBLE" }, select: { id: true, name: true } },
      _count: { select: { resources: true } },
    },
    orderBy: { displayOrder: "asc" },
  });
  res.json(services);
});

// GET /api/services/public/:id — single service detail for visitor
router.get("/public/:id", async (req: Request, res: Response) => {
  const service = await prisma.service.findFirst({
    where: { id: req.params.id, active: true, visibleOnStore: true },
    include: {
      type: true,
      parameters: { orderBy: { displayOrder: "asc" }, select: { name: true, type: true, options: true, required: true, description: true } },
      resources: { where: { active: true, availability: "DISPONIBLE" }, orderBy: { displayOrder: "asc" }, select: { id: true, name: true, description: true, image: true, location: true, city: true } },
      packServices: { where: { pack: { isActive: true, status: "PUBLIE" } }, select: { pack: { select: { id: true, name: true, price: true, imageUrl: true, badge: true } } } },
    },
  });
  if (!service) { res.status(404).json({ error: "Service not found" }); return; }
  res.json(service);
});

// GET /api/services/public/slug/:slug — by slug
router.get("/public/slug/:slug", async (req: Request, res: Response) => {
  const service = await prisma.service.findFirst({
    where: { active: true, visibleOnStore: true, code: req.params.slug },
    include: {
      type: true,
      parameters: { orderBy: { displayOrder: "asc" }, select: { name: true, type: true, options: true, required: true, description: true } },
      resources: { where: { active: true, availability: "DISPONIBLE" }, orderBy: { displayOrder: "asc" }, select: { id: true, name: true, description: true, image: true, location: true, city: true } },
      packServices: { where: { pack: { isActive: true, status: "PUBLIE" } }, select: { pack: { select: { id: true, name: true, price: true, imageUrl: true, badge: true } } } },
    },
  });
  if (!service) { res.status(404).json({ error: "Service not found" }); return; }
  res.json(service);
});

// ══════════════════════════════════════════════════════════════════════════════
// CLIENT API (authenticated, user role)
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/services/client/list — services visible to clients
router.get("/client/list", authenticate, async (req: Request, res: Response) => {
  const where: any = { active: true, visibleForClients: true };
  if (req.query.typeId) where.typeId = req.query.typeId as string;
  if (req.query.search) {
    where.OR = [
      { name: { contains: req.query.search as string, mode: "insensitive" } },
      { description: { contains: req.query.search as string, mode: "insensitive" } },
    ];
  }

  const services = await prisma.service.findMany({
    where,
    include: {
      type: { select: { id: true, name: true, slug: true, icon: true } },
      resources: { where: { active: true, availability: "DISPONIBLE" }, select: { id: true, name: true } },
      _count: { select: { resources: true } },
    },
    orderBy: { displayOrder: "asc" },
  });
  res.json(services);
});

// GET /api/services/client/:id — service detail for client
router.get("/client/:id", authenticate, async (req: Request, res: Response) => {
  const service = await prisma.service.findFirst({
    where: { id: req.params.id, active: true, visibleForClients: true },
    include: {
      type: true,
      parameters: { orderBy: { displayOrder: "asc" } },
      resources: { where: { active: true }, orderBy: { displayOrder: "asc" } },
      packServices: { where: { pack: { isActive: true, status: "PUBLIE" } }, select: { pack: { select: { id: true, name: true, price: true, imageUrl: true, badge: true } } } },
    },
  });
  if (!service) { res.status(404).json({ error: "Service not found" }); return; }

  // Check if favorited
  const fav = await prisma.favoriteService.findUnique({
    where: { userId_serviceId: { userId: req.user!.userId, serviceId: req.params.id } },
  });
  res.json({ ...service, isFavorited: !!fav });
});

// GET /api/services/client/:id/availability — check availability for a date
router.get("/client/:id/availability", authenticate, async (req: Request, res: Response) => {
  const service = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!service) { res.status(404).json({ error: "Service not found" }); return; }

  const date = req.query.date as string;
  if (!date) { res.status(400).json({ error: "date query parameter required" }); return; }

  // Check if any resource for this service is reserved on the given date
  // We use CrmRecord (client_packs kind) to check reservations
  const targetDate = new Date(date);
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const resources = await prisma.serviceResource.findMany({
    where: { serviceId: req.params.id, active: true },
  });

  // Check existing reservations (client_packs with dates overlapping)
  const reservations = await prisma.crmRecord.findMany({
    where: {
      kind: "client_packs",
      data: {
        path: ["service_id"],
        equals: req.params.id,
      },
    },
  });

  const reservedResourceIds = new Set<string>();
  for (const resItem of reservations) {
    const d = resItem.data as any;
    if (d.statut === "annule") continue;
    const resDate = new Date(d.date);
    if (resDate >= dayStart && resDate <= dayEnd && d.resource_id) {
      reservedResourceIds.add(d.resource_id);
    }
  }

  const availableResources = resources.filter(r => r.availability === "DISPONIBLE" && !reservedResourceIds.has(r.id));

  res.json({
    available: availableResources.length > 0,
    availableCount: availableResources.length,
    totalCount: resources.length,
    resources: availableResources.map(r => ({ id: r.id, name: r.name, capacity: r.capacity })),
  });
});

// POST /api/services/client/:id/quote-request — request a quote for a service
router.post("/client/:id/quote-request", authenticate, async (req: Request, res: Response) => {
  const service = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!service) { res.status(404).json({ error: "Service not found" }); return; }

  const { date, time, location, guests, duration, options, message, resourceId } = req.body;

  const quoteData = {
    service_id: req.params.id,
    service_name: service.name,
    client_id: req.user!.userId,
    date: date ?? null,
    time: time ?? null,
    location: location ?? null,
    guests: guests ? Number(guests) : null,
    duration: duration ? Number(duration) : null,
    resource_id: resourceId ?? null,
    options: options ?? {},
    message: message ?? null,
    estimated_price: service.basePrice,
    statut: "nouvelle",
    created_at: new Date().toISOString(),
  };

  const row = await prisma.crmRecord.create({ data: { kind: "quote_requests", data: quoteData } });
  res.status(201).json({ id: row.id, ...quoteData });
});

// POST /api/services/client/:id/estimate — get price estimate
router.post("/client/:id/estimate", authenticate, async (req: Request, res: Response) => {
  const service = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!service) { res.status(404).json({ error: "Service not found" }); return; }

  const { resourceId, guests, duration, options } = req.body;
  let total = service.basePrice;

  // If specific resource selected, use its price
  if (resourceId) {
    const resource = await prisma.serviceResource.findUnique({ where: { id: resourceId } });
    if (resource && resource.basePrice) total = resource.basePrice;
  }

  // Guest-based pricing
  if (service.priceType === "PAR_PERSONNE" && guests) {
    total = service.basePrice * Number(guests);
  }
  // Duration-based pricing
  if (service.priceType === "PAR_HEURE" && duration) {
    total = service.basePrice * Number(duration);
  }
  if (service.priceType === "PAR_JOUR" && duration) {
    total = service.basePrice * Math.ceil(Number(duration) / 8); // 8h = 1 jour
  }

  const breakdown = [{ label: service.name, amount: total }];

  res.json({
    total,
    currency: "DT",
    breakdown,
    disclaimer: "*Prix indicatif — le prix final sera confirmé dans le devis.",
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// FAVORITES
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/services/favorites — list user's favorites
router.get("/favorites", authenticate, async (req: Request, res: Response) => {
  const favorites = await prisma.favoriteService.findMany({
    where: { userId: req.user!.userId },
    include: {
      service: {
        include: {
          type: { select: { name: true, slug: true, icon: true } },
          resources: { where: { active: true }, select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(favorites);
});

// POST /api/services/favorites/:serviceId — add to favorites
router.post("/favorites/:serviceId", authenticate, async (req: Request, res: Response) => {
  const service = await prisma.service.findUnique({ where: { id: req.params.serviceId } });
  if (!service) { res.status(404).json({ error: "Service not found" }); return; }

  const existing = await prisma.favoriteService.findUnique({
    where: { userId_serviceId: { userId: req.user!.userId, serviceId: req.params.serviceId } },
  });
  if (existing) { res.json({ message: "Already in favorites", favorite: existing }); return; }

  const fav = await prisma.favoriteService.create({
    data: { userId: req.user!.userId, serviceId: req.params.serviceId },
  });
  res.status(201).json(fav);
});

// DELETE /api/services/favorites/:serviceId — remove from favorites
router.delete("/favorites/:serviceId", authenticate, async (req: Request, res: Response) => {
  const existing = await prisma.favoriteService.findUnique({
    where: { userId_serviceId: { userId: req.user!.userId, serviceId: req.params.serviceId } },
  });
  if (!existing) { res.status(404).json({ error: "Not in favorites" }); return; }
  await prisma.favoriteService.delete({
    where: { userId_serviceId: { userId: req.user!.userId, serviceId: req.params.serviceId } },
  });
  res.status(204).send();
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN STATS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/services/admin/stats — service statistics
router.get("/admin/stats", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }

  const [total, active, featured, withResources, withPacks] = await Promise.all([
    prisma.service.count(),
    prisma.service.count({ where: { active: true } }),
    prisma.service.count({ where: { featured: true } }),
    prisma.service.count({ where: { resources: { some: {} } } }),
    prisma.service.count({ where: { packServices: { some: {} } } }),
  ]);

  // Most popular services (by number of packs using them)
  const popularServices = await prisma.service.findMany({
    where: { active: true },
    include: { _count: { select: { packServices: true, resources: true, favoriteServices: true } } },
    orderBy: { packServices: { _count: "desc" } },
    take: 10,
  });

  res.json({
    total,
    active,
    featured,
    withResources,
    withPacks,
    popularServices: popularServices.map(s => ({
      id: s.id, name: s.name, icon: s.icon,
      packCount: s._count.packServices,
      resourceCount: s._count.resources,
      favoriteCount: s._count.favoriteServices,
    })),
  });
});

export default router;
