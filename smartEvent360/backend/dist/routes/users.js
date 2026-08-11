"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../lib/prisma");
const authenticate_1 = require("../middleware/authenticate");
const router = (0, express_1.Router)();
const safeSelect = {
    id: true, email: true, name: true, nom: true, prenom: true, role: true, createdAt: true,
    address: true, city: true, postalCode: true, profession: true, phone: true, phone2: true,
    email2: true, company: true, cin: true, matfisc: true, notes: true, clientType: true,
};
// POST /api/users  (ADMIN — création d'un utilisateur)
router.post("/", authenticate_1.authenticate, async (req, res) => {
    if (req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const { email, password, name, nom, prenom, role, ...details } = req.body;
    if (!email || !password) {
        res.status(400).json({ error: "email and password are required" });
        return;
    }
    const fullName = name?.trim() || [prenom, nom].filter(Boolean).join(" ").trim() || email.split("@")[0];
    if (!fullName) {
        res.status(400).json({ error: "name (or nom/prénom) required" });
        return;
    }
    const normalizedRole = ["ADMIN", "ORGANIZER", "USER"].includes(role) ? role : "USER";
    const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (existing) {
        res.status(409).json({ error: "Email already in use" });
        return;
    }
    const hashed = await bcryptjs_1.default.hash(password, 10);
    const user = await prisma_1.prisma.user.create({
        data: {
            email, password: hashed, name: fullName,
            nom: details.nom ?? nom ?? null,
            prenom: details.prenom ?? prenom ?? null,
            role: normalizedRole,
            address: details.address ?? null,
            city: details.city ?? null,
            postalCode: details.postalCode ?? null,
            profession: details.profession ?? null,
            phone: details.phone ?? null,
            phone2: details.phone2 ?? null,
            email2: details.email2 ?? null,
            company: details.company ?? null,
            cin: details.cin ?? null,
            matfisc: details.matfisc ?? null,
            notes: details.notes ?? null,
            clientType: details.clientType ?? null,
        },
        select: safeSelect,
    });
    res.status(201).json(user);
});
// GET /api/users  (ADMIN)
router.get("/", authenticate_1.authenticate, async (req, res) => {
    if (req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const users = await prisma_1.prisma.user.findMany({
        select: safeSelect,
        orderBy: { createdAt: "desc" },
    });
    res.json(users);
});
// GET /api/users/:id  (ADMIN)
router.get("/:id", authenticate_1.authenticate, async (req, res) => {
    if (req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.params.id },
        select: safeSelect,
    });
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    res.json(user);
});
// PATCH /api/users/:id  (ADMIN — mise à jour des coordonnées détaillées)
router.patch("/:id", authenticate_1.authenticate, async (req, res) => {
    if (req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const existing = await prisma_1.prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    const updatable = [
        "name", "nom", "prenom", "address", "city", "postalCode", "profession",
        "phone", "phone2", "email2", "company", "cin", "matfisc", "notes", "clientType", "role",
    ];
    const data = {};
    for (const k of updatable) {
        if (req.body[k] !== undefined)
            data[k] = req.body[k];
    }
    const user = await prisma_1.prisma.user.update({
        where: { id: req.params.id },
        data,
        select: safeSelect,
    });
    res.json(user);
});
exports.default = router;
