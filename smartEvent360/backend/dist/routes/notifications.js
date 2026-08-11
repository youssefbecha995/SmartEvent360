"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const authenticate_1 = require("../middleware/authenticate");
const router = (0, express_1.Router)();
router.use(authenticate_1.authenticate);
// GET /api/notifications — notifications de l'utilisateur connecté + compteur non lues
router.get("/", async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 20), 50);
    const [rows, unread] = await Promise.all([
        prisma_1.prisma.notification.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: "desc" },
            take: limit,
        }),
        prisma_1.prisma.notification.count({ where: { userId: req.user.userId, isRead: false } }),
    ]);
    res.json({ data: rows, unread });
});
// PATCH /api/notifications/:id — marquer une notification comme lue
router.patch("/:id", async (req, res) => {
    const existing = await prisma_1.prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user.userId) {
        res.status(404).json({ error: "Notification not found" });
        return;
    }
    const updated = await prisma_1.prisma.notification.update({
        where: { id: req.params.id },
        data: { isRead: req.body?.isRead === false ? false : true },
    });
    res.json(updated);
});
// POST /api/notifications/read-all — tout marquer comme lu
router.post("/read-all", async (_req, res) => {
    await prisma_1.prisma.notification.updateMany({
        where: { userId: _req.user.userId, isRead: false },
        data: { isRead: true },
    });
    res.json({ success: true });
});
exports.default = router;
