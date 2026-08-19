import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";

const router = Router();
router.use(authenticate);

// GET /api/notifications — notifications de l'utilisateur connecté + compteur non lues
router.get("/", async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit ?? 20), 50);
  const [rows, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where: { userId: req.user!.userId, isRead: false } }),
  ]);
  res.json({ data: rows, unread });
});

// PATCH /api/notifications/:id — marquer une notification comme lue
router.patch("/:id", async (req: Request, res: Response) => {
  const existing = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user!.userId) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  const updated = await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: req.body?.isRead === false ? false : true },
  });
  res.json(updated);
});

// POST /api/notifications/read-all — tout marquer comme lu
router.post("/read-all", async (_req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: _req.user!.userId, isRead: false },
    data: { isRead: true },
  });
  res.json({ success: true });
});

export default router;
