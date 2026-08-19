import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";
import crypto from "crypto";

const router = Router();

// POST /api/tickets/book
router.post("/book", authenticate, async (req: Request, res: Response) => {
  const { eventId } = req.body;
  const userId = req.user!.userId;

  if (!eventId) {
    res.status(400).json({ error: "eventId is required" });
    return;
  }

  const event = await prisma.event.findUnique({
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

  const existing = await prisma.booking.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });
  if (existing) {
    res.status(409).json({ error: "Already booked for this event" });
    return;
  }

  const booking = await prisma.booking.create({
    data: {
      userId,
      eventId,
      status: "CONFIRMED",
      qrCode: crypto.randomUUID(),
    },
    include: { event: { select: { id: true, title: true, date: true, location: true } } },
  });

  res.status(201).json(booking);
});

// GET /api/tickets/my-tickets
router.get("/my-tickets", authenticate, async (req: Request, res: Response) => {
  const bookings = await prisma.booking.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: "desc" },
    include: {
      event: {
        select: { id: true, title: true, date: true, location: true, imageUrl: true, price: true },
      },
    },
  });

  res.json(bookings);
});

export default router;
