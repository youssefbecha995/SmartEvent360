"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const authenticate_1 = require("../middleware/authenticate");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
// POST /api/tickets/book
router.post("/book", authenticate_1.authenticate, async (req, res) => {
    const { eventId } = req.body;
    const userId = req.user.userId;
    if (!eventId) {
        res.status(400).json({ error: "eventId is required" });
        return;
    }
    const event = await prisma_1.prisma.event.findUnique({
        where: { id: eventId },
        include: { _count: { select: { bookings: true } } },
    });
    if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
    }
    if (event._count.bookings >= event.capacity) {
        res.status(409).json({ error: "Event is fully booked" });
        return;
    }
    const existing = await prisma_1.prisma.booking.findUnique({
        where: { userId_eventId: { userId, eventId } },
    });
    if (existing) {
        res.status(409).json({ error: "Already booked for this event" });
        return;
    }
    const booking = await prisma_1.prisma.booking.create({
        data: {
            userId,
            eventId,
            status: "CONFIRMED",
            qrCode: crypto_1.default.randomUUID(),
        },
        include: { event: { select: { id: true, title: true, date: true, location: true } } },
    });
    res.status(201).json(booking);
});
// GET /api/tickets/my-tickets
router.get("/my-tickets", authenticate_1.authenticate, async (req, res) => {
    const bookings = await prisma_1.prisma.booking.findMany({
        where: { userId: req.user.userId },
        orderBy: { createdAt: "desc" },
        include: {
            event: {
                select: { id: true, title: true, date: true, location: true, imageUrl: true, price: true },
            },
        },
    });
    res.json(bookings);
});
exports.default = router;
