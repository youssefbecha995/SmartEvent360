import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "smartevent360_secret";

const safeSelect = {
  id: true, email: true, name: true, nom: true, prenom: true, role: true, createdAt: true,
  address: true, city: true, postalCode: true, profession: true, phone: true, phone2: true,
  email2: true, company: true, cin: true, matfisc: true, notes: true, clientType: true,
} as const;

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: "email, password and name are required" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    // L'inscription publique ne permet que le rôle USER — jamais ADMIN/ORGANIZER.
    data: { email, password: hashed, name, role: "USER" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  res.status(201).json({ user, token });
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  const { password: _, ...userSafe } = user;
  res.json({ user: userSafe, token });
});

// GET /api/auth/me — profil de l'utilisateur connecté
router.get("/me", authenticate, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: safeSelect,
  });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

// PATCH /api/auth/me — l'utilisateur met à jour ses propres informations
router.patch("/me", authenticate, async (req: Request, res: Response) => {
  const {
    name, nom, prenom, address, city, postalCode, profession, phone, phone2,
    email2, company, cin, matfisc, notes, clientType,
  } = req.body ?? {};

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: {
      ...(name !== undefined ? { name: String(name).trim() || req.user!.userId } : {}),
      ...(nom !== undefined ? { nom: nom ?? null } : {}),
      ...(prenom !== undefined ? { prenom: prenom ?? null } : {}),
      ...(address !== undefined ? { address: address ?? null } : {}),
      ...(city !== undefined ? { city: city ?? null } : {}),
      ...(postalCode !== undefined ? { postalCode: postalCode ?? null } : {}),
      ...(profession !== undefined ? { profession: profession ?? null } : {}),
      ...(phone !== undefined ? { phone: phone ?? null } : {}),
      ...(phone2 !== undefined ? { phone2: phone2 ?? null } : {}),
      ...(email2 !== undefined ? { email2: email2 ?? null } : {}),
      ...(company !== undefined ? { company: company ?? null } : {}),
      ...(cin !== undefined ? { cin: cin ?? null } : {}),
      ...(matfisc !== undefined ? { matfisc: matfisc ?? null } : {}),
      ...(notes !== undefined ? { notes: notes ?? null } : {}),
      ...(clientType !== undefined ? { clientType: clientType ?? null } : {}),
    },
    select: safeSelect,
  });
  res.json(user);
});

// POST /api/auth/change-password — l'utilisateur change son propre mot de passe
router.post("/change-password", authenticate, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }
  if (String(newPassword).length < 6) {
    res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères." });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user || !(await bcrypt.compare(String(currentPassword), user.password))) {
    res.status(400).json({ error: "Le mot de passe actuel est incorrect." });
    return;
  }
  const hashed = await bcrypt.hash(String(newPassword), 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
  res.json({ success: true });
});

export default router;
