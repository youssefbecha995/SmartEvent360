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

// POST /api/uploads  (ADMIN — enregistrement vocal d'un appel)
// Le corps brut contient le fichier audio (audio/webm, audio/ogg, octet-stream).
router.post("/", authenticate, (req: Request, res: Response) => {
  if (req.user!.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }

  const body = (req as unknown as { body: Buffer }).body;
  if (!Buffer.isBuffer(body) || body.length === 0) {
    res.status(400).json({ error: "Empty upload" });
    return;
  }

  const extMap: Record<string, string> = {
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
  };
  const contentType = req.headers["content-type"]?.split(";")[0]?.trim() || "application/octet-stream";
  const ext = extMap[contentType] || ".bin";
  const filename = `call-${crypto.randomUUID()}${ext}`;

  fs.writeFile(path.join(UPLOAD_DIR, filename), body, (err) => {
    if (err) {
      console.error("[uploads] write error:", err);
      res.status(500).json({ error: "Failed to save upload" });
      return;
    }
    res.status(201).json({ url: `/uploads/${filename}`, size: body.length, type: contentType });
  });
});

export default router;
