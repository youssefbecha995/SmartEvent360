import { Router, Request, Response } from "express";
import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { authenticate } from "../middleware/authenticate";

const router = Router();

// Le corps des requêtes d'upload est un fichier brut (pas du JSON)
router.use(express.raw({ type: () => true, limit: "25mb" }));

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// POST /api/uploads  (ADMIN — fichiers audio (appels) ou images)
// Le corps brut contient le fichier (audio/webm, image/jpeg, ...).
router.post("/", authenticate, (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }

  const body = (req as unknown as { body: Buffer }).body;
  if (!Buffer.isBuffer(body) || body.length === 0) {
    res.status(400).json({ error: "Empty upload" });
    return;
  }

  const contentType = req.headers["content-type"]?.split(";")[0]?.trim() || "application/octet-stream";
  const extMap: Record<string, string> = {
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
  };
  const ext = extMap[contentType] || ".bin";
  const isImage = contentType.startsWith("image/");
  const prefix = isImage ? "img" : "call";

  // Sous-dossier optionnel (?folder=packs) — nettoyé contre la traversée de chemin
  const rawFolder = String(req.query.folder || "").replace(/[^a-zA-Z0-9_-]/g, "");
  const subDir = rawFolder ? path.join(UPLOAD_DIR, rawFolder) : UPLOAD_DIR;
  if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });

  const filename = `${prefix}-${crypto.randomUUID()}${ext}`;

  fs.writeFile(path.join(subDir, filename), body, (err) => {
    if (err) {
      console.error("[uploads] write error:", err);
      res.status(500).json({ error: "Failed to save upload" });
      return;
    }
    const urlPath = rawFolder ? `/uploads/${rawFolder}/${filename}` : `/uploads/${filename}`;
    res.status(201).json({ url: urlPath, size: body.length, type: contentType });
  });
});

export default router;
