"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const prisma_1 = require("./lib/prisma");
const swagger_1 = require("./swagger");
const auth_1 = __importDefault(require("./routes/auth"));
const events_1 = __importDefault(require("./routes/events"));
const tickets_1 = __importDefault(require("./routes/tickets"));
const ai_1 = __importDefault(require("./routes/ai"));
const packs_1 = __importDefault(require("./routes/packs"));
const bookings_1 = __importDefault(require("./routes/bookings"));
const users_1 = __importDefault(require("./routes/users"));
const crm_1 = __importDefault(require("./routes/crm"));
const client_1 = __importDefault(require("./routes/client"));
const public_1 = __importDefault(require("./routes/public"));
const uploads_1 = __importDefault(require("./routes/uploads"));
const notifications_1 = __importDefault(require("./routes/notifications"));
// Empêche le process de mourir sur une erreur asynchrone non gérée
process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
    console.error("[uncaughtException]", err);
});
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || "http://localhost:5173";
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express_1.default.json({ limit: "25mb" }));
// Fichiers uploadés (enregistrements vocaux d'appels, etc.)
app.use("/uploads", express_1.default.static("uploads", { maxAge: "7d" }));
// Routes
app.use("/api/auth", auth_1.default);
app.use("/api/events", events_1.default);
app.use("/api/tickets", tickets_1.default);
app.use("/api/ai", ai_1.default);
app.use("/api/packs", packs_1.default);
app.use("/api/bookings", bookings_1.default);
app.use("/api/users", users_1.default);
app.use("/api/crm", crm_1.default);
app.use("/api/client", client_1.default);
app.use("/api/public", public_1.default);
app.use("/api/uploads", uploads_1.default);
app.use("/api/notifications", notifications_1.default);
// Documentation interactive Swagger (OpenAPI)
app.use("/api/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec, { customSiteTitle: "SmartEvent360 API Docs" }));
// Health check
app.get("/api/health", async (_req, res) => {
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        res.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
    }
    catch {
        res.status(500).json({ status: "error", db: "disconnected" });
    }
});
// Erreur 404 API
app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Route not found" });
});
// Middleware global d'erreurs — renvoie un JSON au lieu de faire crasher le serveur
app.use((err, _req, res, _next) => {
    console.error("[api-error]", err);
    res.status(500).json({ error: err.message || "Internal server error" });
});
app.listen(PORT, () => {
    console.log(`🚀 SmartEvent360 API running on http://localhost:${PORT}`);
});
exports.default = app;
