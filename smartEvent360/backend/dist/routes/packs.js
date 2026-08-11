"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const authenticate_1 = require("../middleware/authenticate");
const router = (0, express_1.Router)();
// Normalise les prestations incluses : ne garde que des chaînes non vides
function parseFeatures(value) {
    if (!Array.isArray(value))
        return [];
    return value.filter((v) => typeof v === "string" && v.trim().length > 0);
}
// ── GET /api/packs ────────────────────────────────────────────────────────────
router.get("/", async (_req, res) => {
    const packs = await prisma_1.prisma.pack.findMany({
        where: { isActive: true },
        orderBy: { price: "asc" },
    });
    res.json(packs);
});
// ── GET /api/packs/:id ────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
    const pack = await prisma_1.prisma.pack.findUnique({ where: { id: req.params.id } });
    if (!pack) {
        res.status(404).json({ error: "Pack not found" });
        return;
    }
    res.json(pack);
});
// ── POST /api/packs  (ADMIN) ──────────────────────────────────────────────────
router.post("/", authenticate_1.authenticate, async (req, res) => {
    if (req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const { name, description, imageUrl, features, price, duration, maxGuests, badge, isPopular } = req.body;
    if (!name || price === undefined) {
        res.status(400).json({ error: "name and price are required" });
        return;
    }
    const pack = await prisma_1.prisma.pack.create({
        data: {
            name,
            description: description ?? null,
            imageUrl: imageUrl ?? null,
            features: parseFeatures(features),
            price: Number(price),
            duration: duration ? Number(duration) : 4,
            maxGuests: maxGuests ? Number(maxGuests) : 100,
            badge: badge ?? null,
            isPopular: isPopular ?? false,
        },
    });
    res.status(201).json(pack);
});
// ── PUT /api/packs/:id  (ADMIN) ───────────────────────────────────────────────
router.put("/:id", authenticate_1.authenticate, async (req, res) => {
    if (req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const existing = await prisma_1.prisma.pack.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        res.status(404).json({ error: "Pack not found" });
        return;
    }
    const { name, description, imageUrl, features, price, duration, maxGuests, badge, isPopular, isActive } = req.body;
    const pack = await prisma_1.prisma.pack.update({
        where: { id: req.params.id },
        data: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(imageUrl !== undefined && { imageUrl }),
            ...(features !== undefined && { features: parseFeatures(features) }),
            ...(price !== undefined && { price: Number(price) }),
            ...(duration !== undefined && { duration: Number(duration) }),
            ...(maxGuests !== undefined && { maxGuests: Number(maxGuests) }),
            ...(badge !== undefined && { badge }),
            ...(isPopular !== undefined && { isPopular }),
            ...(isActive !== undefined && { isActive }),
        },
    });
    res.json(pack);
});
// ── DELETE /api/packs/:id  (ADMIN) ────────────────────────────────────────────
router.delete("/:id", authenticate_1.authenticate, async (req, res) => {
    if (req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const existing = await prisma_1.prisma.pack.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        res.status(404).json({ error: "Pack not found" });
        return;
    }
    await prisma_1.prisma.pack.delete({ where: { id: req.params.id } });
    res.status(204).send();
});
exports.default = router;
