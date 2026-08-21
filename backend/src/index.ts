import "dotenv/config";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { prisma } from "./lib/prisma";
import { swaggerSpec } from "./swagger";
import authRouter from "./routes/auth";
import eventsRouter from "./routes/events";
import ticketsRouter from "./routes/tickets";
import aiRouter from "./routes/ai";
import packsRouter from "./routes/packs";
import bookingsRouter from "./routes/bookings";
import usersRouter from "./routes/users";
import crmRouter from "./routes/crm";
import clientRouter from "./routes/client";
import publicRouter from "./routes/public";
import uploadsRouter from "./routes/uploads";
import notificationsRouter from "./routes/notifications";
import servicesRouter from "./routes/services";
import providersRouter from "./routes/providers";

// Empêche le process de mourir sur une erreur asynchrone non gérée
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

const FRONTEND_ORIGIN = process.env.FRONTEND_URL || "http://localhost:5173";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: "25mb" }));

// Fichiers uploadés (enregistrements vocaux d'appels, etc.)
app.use("/uploads", express.static("uploads", { maxAge: "7d" }));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/events", eventsRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/packs", packsRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/users", usersRouter);
app.use("/api/crm", crmRouter);
app.use("/api/client", clientRouter);
app.use("/api/public", publicRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/services", servicesRouter);
app.use("/api/providers", providersRouter);

// Documentation interactive Swagger (OpenAPI)
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: "SmartEvent360 API Docs" }));
app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec));

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(500).json({ status: "error", db: "disconnected" });
  }
});

// Erreur 404 API
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Middleware global d'erreurs — renvoie un JSON au lieu de faire crasher le serveur
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[api-error]", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`🚀 SmartEvent360 API running on http://localhost:${PORT}`);
});

export default app;
