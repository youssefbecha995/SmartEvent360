"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_2 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const authenticate_1 = require("../middleware/authenticate");
const router = (0, express_1.Router)();
// Le corps des requêtes d'upload est un fichier brut (pas du JSON)
router.use(express_2.default.raw({ type: () => true, limit: "25mb" }));
const UPLOAD_DIR = path_1.default.resolve(process.cwd(), "uploads");
if (!fs_1.default.existsSync(UPLOAD_DIR))
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
// POST /api/uploads  (ADMIN — enregistrement vocal d'un appel)
// Le corps brut contient le fichier audio (audio/webm, audio/ogg, octet-stream).
router.post("/", authenticate_1.authenticate, (req, res) => {
    if (req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const body = req.body;
    if (!Buffer.isBuffer(body) || body.length === 0) {
        res.status(400).json({ error: "Empty upload" });
        return;
    }
    const extMap = {
        "audio/webm": ".webm",
        "audio/ogg": ".ogg",
        "audio/wav": ".wav",
        "audio/mpeg": ".mp3",
        "audio/mp4": ".m4a",
    };
    const contentType = req.headers["content-type"]?.split(";")[0]?.trim() || "application/octet-stream";
    const ext = extMap[contentType] || ".bin";
    const filename = `call-${crypto_1.default.randomUUID()}${ext}`;
    fs_1.default.writeFile(path_1.default.join(UPLOAD_DIR, filename), body, (err) => {
        if (err) {
            console.error("[uploads] write error:", err);
            res.status(500).json({ error: "Failed to save upload" });
            return;
        }
        res.status(201).json({ url: `/uploads/${filename}`, size: body.length, type: contentType });
    });
});
exports.default = router;
