"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const authenticate_1 = require("../middleware/authenticate");
const notify_1 = require("../lib/notify");
const router = (0, express_1.Router)();
// ── GET /api/bookings  (ADMIN — toutes les réservations) ─────────────────────
router.get("/", authenticate_1.authenticate, async (req, res) => {
    if (req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const { status, page = "1", limit = "20" } = req.query;
    const where = status ? { status: String(status) } : {};
    const skip = (Number(page) - 1) * Number(limit);
    const [bookings, total] = await Promise.all([
        prisma_1.prisma.booking.findMany({
            where,
            skip,
            take: Number(limit),
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { id: true, name: true, email: true } },
                event: { select: { id: true, title: true, date: true, location: true, price: true } },
            },
        }),
        prisma_1.prisma.booking.count({ where }),
    ]);
    res.json({ data: bookings, total, page: Number(page), limit: Number(limit) });
});
// ── GET /api/bookings/stats  (ADMIN — stats équipements = événements les + réservés) ──
router.get("/stats", authenticate_1.authenticate, async (req, res) => {
    if (req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    // Événements les plus réservés
    const topEvents = await prisma_1.prisma.event.findMany({
        include: { _count: { select: { bookings: true } } },
        orderBy: { bookings: { _count: "desc" } },
        take: 5,
    });
    // Stats globales
    const [total, confirmed, pending, cancelled] = await Promise.all([
        prisma_1.prisma.booking.count(),
        prisma_1.prisma.booking.count({ where: { status: "CONFIRMED" } }),
        prisma_1.prisma.booking.count({ where: { status: "PENDING" } }),
        prisma_1.prisma.booking.count({ where: { status: "CANCELLED" } }),
    ]);
    res.json({
        totals: { total, confirmed, pending, cancelled },
        topEvents: topEvents.map(e => ({
            id: e.id, title: e.title, date: e.date,
            location: e.location, bookingCount: e._count.bookings,
        })),
    });
});
// ── POST /api/bookings  (ADMIN — ajouter une réservation) ─────────────────────
router.post("/", authenticate_1.authenticate, async (req, res) => {
    if (req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const { userId, eventId, status = "PENDING" } = req.body ?? {};
    if (!userId || !eventId) {
        res.status(400).json({ error: "userId et eventId sont requis." });
        return;
    }
    if (!["PENDING", "CONFIRMED", "CANCELLED"].includes(status)) {
        res.status(400).json({ error: "Invalid status" });
        return;
    }
    const [user, event] = await Promise.all([
        prisma_1.prisma.user.findUnique({ where: { id: String(userId) } }),
        prisma_1.prisma.event.findUnique({ where: { id: String(eventId) } }),
    ]);
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
    }
    try {
        const booking = await prisma_1.prisma.booking.create({
            data: { userId: String(userId), eventId: String(eventId), status },
            include: {
                user: { select: { id: true, name: true, email: true } },
                event: { select: { id: true, title: true, date: true, location: true, price: true } },
            },
        });
        // Notifier les admins : nouvelle réservation
        const userLabel = [user.prenom, user.nom, user.name].filter(Boolean).join(" ") || user.name || user.email;
        (0, notify_1.notifyAdmins)({
            type: "INFO",
            title: "Nouvelle réservation",
            message: `${userLabel} a réservé « ${event.title} » (${event.date ? new Date(event.date).toLocaleDateString("fr-FR") : "date à préciser"}).`,
            lien: "/admin/reservations",
        }).catch((e) => console.error("[notify]", e));
        res.status(201).json(booking);
    }
    catch (e) {
        if (e?.code === "P2002") {
            res.status(409).json({ error: "Ce client a déjà une réservation pour cet événement." });
            return;
        }
        throw e;
    }
});
// ── GET /api/bookings/:id  (ADMIN) ────────────────────────────────────────────
router.get("/:id", authenticate_1.authenticate, async (req, res) => {
    if (req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const booking = await prisma_1.prisma.booking.findUnique({
        where: { id: req.params.id },
        include: {
            user: { select: { id: true, name: true, email: true } },
            event: true,
        },
    });
    if (!booking) {
        res.status(404).json({ error: "Booking not found" });
        return;
    }
    res.json(booking);
});
// ── PATCH /api/bookings/:id  (ADMIN — modifier status) ───────────────────────
router.patch("/:id", authenticate_1.authenticate, async (req, res) => {
    if (req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const { status } = req.body;
    if (!["PENDING", "CONFIRMED", "CANCELLED"].includes(status)) {
        res.status(400).json({ error: "Invalid status" });
        return;
    }
    const booking = await prisma_1.prisma.booking.update({
        where: { id: req.params.id },
        data: { status },
        include: { user: { select: { id: true, name: true, email: true } }, event: true },
    });
    res.json(booking);
});
// ── DELETE /api/bookings/:id  (ADMIN) ─────────────────────────────────────────
router.delete("/:id", authenticate_1.authenticate, async (req, res) => {
    if (req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const existing = await prisma_1.prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        res.status(404).json({ error: "Booking not found" });
        return;
    }
    await prisma_1.prisma.booking.delete({ where: { id: req.params.id } });
    res.status(204).send();
});
exports.default = router;
