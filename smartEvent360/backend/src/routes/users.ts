import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";

const router = Router();

const safeSelect = {
  id: true, email: true, name: true, nom: true, prenom: true, role: true, createdAt: true,
  address: true, city: true, postalCode: true, profession: true, phone: true, phone2: true,
  email2: true, company: true, cin: true, matfisc: true, notes: true, clientType: true,
} as const;

// POST /api/users  (ADMIN — création d'un utilisateur)
router.post("/", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
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

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
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
router.get("/", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const users = await prisma.user.findMany({
    select: safeSelect,
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
});

// GET /api/users/:id  (ADMIN)
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: safeSelect,
  });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

// PATCH /api/users/:id  (ADMIN — mise à jour des coordonnées détaillées)
router.patch("/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "User not found" }); return; }

  const updatable = [
    "name", "nom", "prenom", "address", "city", "postalCode", "profession",
    "phone", "phone2", "email2", "company", "cin", "matfisc", "notes", "clientType", "role",
  ];
  const data: Record<string, unknown> = {};
  for (const k of updatable) {
    if (req.body[k] !== undefined) data[k] = req.body[k];
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: safeSelect,
  });
  res.json(user);
});

export default router;
