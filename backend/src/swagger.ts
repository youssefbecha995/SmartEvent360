import type { JsonObject } from "swagger-ui-express";

// Spécification OpenAPI 3.0 de l'API SmartEvent360
// Servie à http://localhost:3001/api/docs
export const swaggerSpec: JsonObject = {
  openapi: "3.0.0",
  info: {
    title: "SmartEvent360 API",
    version: "1.0.0",
    description:
      "API REST de la plateforme SmartEvent360 — gestion d'événements, packs, devis, réservations, CRM.\n\n" +
      "**Authentification** : cliquez sur « Authorize » puis collez votre jeton `Bearer <token>` obtenu via `/auth/login`.\n" +
      "**Frontend** : `http://localhost:5173` (seule origine autorisée par le CORS).",
  },
  servers: [{ url: "/api", description: "Backend SmartEvent360 (Express + Prisma)" }],
  tags: [
    { name: "Auth", description: "Inscription / connexion / profil" },
    { name: "Événements", description: "Événements publics et gestion" },
    { name: "Packs", description: "Packs événementiels" },
    { name: "Réservations (bookings)", description: "Réservations d'événements (admin)" },
    { name: "Tickets", description: "Réservation de places par les utilisateurs" },
    { name: "Utilisateurs", description: "Gestion des utilisateurs (admin)" },
    { name: "Client", description: "Espace client : devis, paiements, RDV, packs" },
    { name: "CRM", description: "Enregistrements CRM génériques (admin)" },
    { name: "Public", description: "Site vitrine : services, demandes" },
    { name: "Notifications", description: "Notifications de l'utilisateur connecté" },
    { name: "IA", description: "Assistant conversationnel" },
    { name: "Uploads", description: "Enregistrements audio (admin)" },
    { name: "Système", description: "Health check" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Collez votre jeton JWT obtenu via POST /auth/login",
      },
    },
    schemas: {
      Error: { type: "object", properties: { error: { type: "string" } } },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string" },
          name: { type: "string" },
          nom: { type: "string", nullable: true },
          prenom: { type: "string", nullable: true },
          role: { type: "string", enum: ["ADMIN", "ORGANIZER", "USER"] },
          phone: { type: "string", nullable: true },
          company: { type: "string", nullable: true },
          address: { type: "string", nullable: true },
          city: { type: "string", nullable: true },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/User" },
          token: { type: "string", description: "JWT à utiliser dans le header Authorization" },
        },
      },
      Event: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          location: { type: "string" },
          date: { type: "string", format: "date-time" },
          imageUrl: { type: "string", nullable: true },
          capacity: { type: "integer" },
          price: { type: "number" },
          isPublished: { type: "boolean" },
        },
      },
      Pack: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          price: { type: "number" },
          duration: { type: "integer", description: "Durée en heures" },
          maxGuests: { type: "integer", description: "Nombre d'invités max" },
          badge: { type: "string", nullable: true },
          imageUrl: { type: "string", nullable: true },
          features: { type: "array", items: { type: "string" }, nullable: true },
          isPopular: { type: "boolean" },
          isActive: { type: "boolean" },
        },
      },
      Booking: {
        type: "object",
        properties: {
          id: { type: "string" },
          status: { type: "string", enum: ["PENDING", "CONFIRMED", "CANCELLED"] },
          qrCode: { type: "string", nullable: true },
          userId: { type: "string" },
          eventId: { type: "string" },
        },
      },
      Availability: {
        type: "object",
        properties: {
          available: { type: "boolean" },
          message: { type: "string" },
        },
      },
      Notification: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["INFO", "WARNING", "SUCCESS", "ERROR"] },
          title: { type: "string" },
          message: { type: "string" },
          isRead: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/health": {
      get: {
        tags: ["Système"],
        summary: "Vérifie que l'API et la base de données répondent",
        security: [],
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" }, db: { type: "string" } } } } },
          },
          "500": { description: "Base de données inaccessible", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ── AUTH ────────────────────────────────────────────────────────────────
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Inscription publique (rôle USER)",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["email", "password", "name"], properties: { email: { type: "string", format: "email" }, password: { type: "string", minLength: 6 }, name: { type: "string" } } } } },
        },
        responses: {
          "201": { description: "Compte créé", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
          "400": { description: "Champs manquants", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "409": { description: "Email déjà utilisé", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Connexion — renvoie un jeton JWT",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string", format: "email" }, password: { type: "string" } } } } },
        },
        responses: {
          "200": { description: "Connexion réussie", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
          "401": { description: "Identifiants invalides", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Profil de l'utilisateur connecté",
        responses: { "200": { description: "Profil", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } } },
      },
      patch: {
        tags: ["Auth"],
        summary: "Mise à jour de ses propres coordonnées",
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, nom: { type: "string" }, prenom: { type: "string" }, phone: { type: "string" }, address: { type: "string" }, city: { type: "string" }, postalCode: { type: "string" }, profession: { type: "string" }, company: { type: "string" }, cin: { type: "string" }, matfisc: { type: "string" }, notes: { type: "string" }, clientType: { type: "string" } } } } },
        },
        responses: { "200": { description: "Profil mis à jour", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } } },
      },
    },
    "/auth/change-password": {
      post: {
        tags: ["Auth"],
        summary: "Changer son mot de passe",
        requestBody: {
          content: { "application/json": { schema: { type: "object", required: ["currentPassword", "newPassword"], properties: { currentPassword: { type: "string" }, newPassword: { type: "string", minLength: 6 } } } } },
        },
        responses: { "200": { description: "Mot de passe changé", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } } },
      },
    },

    // ── ÉVÉNEMENTS ──────────────────────────────────────────────────────────
    "/events": {
      get: {
        tags: ["Événements"],
        summary: "Liste paginée des événements",
        security: [],
        parameters: [
          { name: "category", in: "query", schema: { type: "string" }, description: "Slug de la catégorie (ex: concert, mariage)" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        ],
        responses: {
          "200": { description: "Liste paginée", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Event" } }, total: { type: "integer" }, page: { type: "integer" }, limit: { type: "integer" } } } } } },
        },
      },
      post: {
        tags: ["Événements"],
        summary: "Créer un événement (ADMIN ou ORGANIZER)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["title", "location", "date", "capacity"], properties: { title: { type: "string" }, description: { type: "string" }, location: { type: "string" }, date: { type: "string", format: "date-time" }, imageUrl: { type: "string" }, capacity: { type: "integer" }, price: { type: "number", default: 0 }, categoryId: { type: "string" }, clientId: { type: "string" } } } } },
        },
        responses: {
          "201": { description: "Événement créé", content: { "application/json": { schema: { $ref: "#/components/schemas/Event" } } } },
          "400": { description: "Champs requis manquants", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Accès réservé au personnel", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/events/{id}": {
      get: {
        tags: ["Événements"],
        summary: "Détail d'un événement (avec nombre de réservations)",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Événement", content: { "application/json": { schema: { $ref: "#/components/schemas/Event" } } } },
          "404": { description: "Introuvable", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      put: {
        tags: ["Événements"],
        summary: "Modifier un événement (organisateur ou ADMIN)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, location: { type: "string" }, date: { type: "string", format: "date-time" }, imageUrl: { type: "string" }, capacity: { type: "integer" }, price: { type: "number" }, categoryId: { type: "string" }, clientId: { type: "string" }, isPublished: { type: "boolean" } } } } },
        },
        responses: { "200": { description: "Événement modifié", content: { "application/json": { schema: { $ref: "#/components/schemas/Event" } } } } },
      },
      delete: {
        tags: ["Événements"],
        summary: "Supprimer un événement (organisateur ou ADMIN)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Supprimé" }, "404": { description: "Introuvable", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },

    // ── PACKS ───────────────────────────────────────────────────────────────
    "/packs": {
      get: {
        tags: ["Packs"],
        summary: "Liste des packs actifs (public)",
        security: [],
        responses: { "200": { description: "Packs", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Pack" } } } } } },
      },
      post: {
        tags: ["Packs"],
        summary: "Créer un pack (ADMIN)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["name", "price"], properties: { name: { type: "string" }, description: { type: "string" }, price: { type: "number" }, duration: { type: "integer", default: 4 }, maxGuests: { type: "integer", default: 100 }, badge: { type: "string" }, imageUrl: { type: "string" }, features: { type: "array", items: { type: "string" }, description: "Prestations incluses" }, isPopular: { type: "boolean", default: false } } } } },
        },
        responses: {
          "201": { description: "Pack créé", content: { "application/json": { schema: { $ref: "#/components/schemas/Pack" } } } },
          "403": { description: "Réservé aux admins", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/packs/{id}": {
      get: {
        tags: ["Packs"],
        summary: "Détail d'un pack",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Pack", content: { "application/json": { schema: { $ref: "#/components/schemas/Pack" } } } },
          "404": { description: "Introuvable", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      put: {
        tags: ["Packs"],
        summary: "Modifier un pack (ADMIN)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, price: { type: "number" }, duration: { type: "integer" }, maxGuests: { type: "integer" }, badge: { type: "string" }, imageUrl: { type: "string" }, features: { type: "array", items: { type: "string" } }, isPopular: { type: "boolean" }, isActive: { type: "boolean" } } } } },
        },
        responses: { "200": { description: "Pack modifié", content: { "application/json": { schema: { $ref: "#/components/schemas/Pack" } } } } },
      },
      delete: {
        tags: ["Packs"],
        summary: "Supprimer un pack (ADMIN)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Supprimé" } },
      },
    },

    // ── BOOKINGS ────────────────────────────────────────────────────────────
    "/bookings": {
      get: {
        tags: ["Réservations (bookings)"],
        summary: "Toutes les réservations (ADMIN)",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["PENDING", "CONFIRMED", "CANCELLED"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: { "200": { description: "Liste paginée", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Booking" } }, total: { type: "integer" } } } } } } },
      },
      post: {
        tags: ["Réservations (bookings)"],
        summary: "Créer une réservation (ADMIN)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["userId", "eventId"], properties: { userId: { type: "string" }, eventId: { type: "string" }, status: { type: "string", enum: ["PENDING", "CONFIRMED", "CANCELLED"], default: "PENDING" } } } } },
        },
        responses: { "201": { description: "Réservation créée", content: { "application/json": { schema: { $ref: "#/components/schemas/Booking" } } } } },
      },
    },
    "/bookings/stats": {
      get: {
        tags: ["Réservations (bookings)"],
        summary: "Statistiques des réservations (ADMIN)",
        responses: {
          "200": {
            description: "Stats",
            content: { "application/json": { schema: { type: "object", properties: { totals: { type: "object", properties: { total: { type: "integer" }, confirmed: { type: "integer" }, pending: { type: "integer" }, cancelled: { type: "integer" } } }, topEvents: { type: "array", items: { type: "object" } } } } } },
          },
        },
      },
    },
    "/bookings/{id}": {
      get: {
        tags: ["Réservations (bookings)"],
        summary: "Détail d'une réservation (ADMIN)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Réservation", content: { "application/json": { schema: { $ref: "#/components/schemas/Booking" } } } } },
      },
      patch: {
        tags: ["Réservations (bookings)"],
        summary: "Changer le statut (ADMIN)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["PENDING", "CONFIRMED", "CANCELLED"] } } } } } },
        responses: { "200": { description: "Réservation mise à jour", content: { "application/json": { schema: { $ref: "#/components/schemas/Booking" } } } } },
      },
      delete: {
        tags: ["Réservations (bookings)"],
        summary: "Supprimer une réservation (ADMIN)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Supprimé" } },
      },
    },

    // ── TICKETS ─────────────────────────────────────────────────────────────
    "/tickets/book": {
      post: {
        tags: ["Tickets"],
        summary: "Réserver une place pour un événement (utilisateur connecté)",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["eventId"], properties: { eventId: { type: "string" } } } } } },
        responses: {
          "201": { description: "Billet réservé (avec QR code)", content: { "application/json": { schema: { $ref: "#/components/schemas/Booking" } } } },
          "409": { description: "Événement complet ou déjà réservé", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/tickets/my-tickets": {
      get: {
        tags: ["Tickets"],
        summary: "Mes billets (utilisateur connecté)",
        responses: { "200": { description: "Mes réservations", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Booking" } } } } } },
      },
    },

    // ── USERS ───────────────────────────────────────────────────────────────
    "/users": {
      get: {
        tags: ["Utilisateurs"],
        summary: "Liste des utilisateurs (ADMIN)",
        responses: { "200": { description: "Utilisateurs", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/User" } } } } } },
      },
      post: {
        tags: ["Utilisateurs"],
        summary: "Créer un utilisateur (ADMIN)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string", format: "email" }, password: { type: "string" }, name: { type: "string" }, nom: { type: "string" }, prenom: { type: "string" }, role: { type: "string", enum: ["ADMIN", "ORGANIZER", "USER"], default: "USER" }, phone: { type: "string" }, company: { type: "string" }, address: { type: "string" }, city: { type: "string" } } } } },
        },
        responses: { "201": { description: "Utilisateur créé", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } } },
      },
    },
    "/users/{id}": {
      get: {
        tags: ["Utilisateurs"],
        summary: "Détail d'un utilisateur (ADMIN)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Utilisateur", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } } },
      },
      patch: {
        tags: ["Utilisateurs"],
        summary: "Modifier un utilisateur (ADMIN)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, nom: { type: "string" }, prenom: { type: "string" }, phone: { type: "string" }, company: { type: "string" }, role: { type: "string", enum: ["ADMIN", "ORGANIZER", "USER"] } } } } },
        },
        responses: { "200": { description: "Utilisateur mis à jour", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } } },
      },
    },

    // ── CLIENT ──────────────────────────────────────────────────────────────
    "/client/devis": {
      get: {
        tags: ["Client"],
        summary: "Mes devis (client connecté)",
        responses: { "200": { description: "Devis du client", content: { "application/json": { schema: { type: "array", items: { type: "object" } } } } } },
      },
    },
    "/client/devis/{id}": {
      get: {
        tags: ["Client"],
        summary: "Détail d'un de mes devis",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Devis", content: { "application/json": { schema: { type: "object" } } } } },
      },
    },
    "/client/devis/{id}/accept": {
      post: {
        tags: ["Client"],
        summary: "Accepter et signer un devis (déclenche l'encaissement)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { signature_data: { type: "string" } } } } } },
        responses: { "200": { description: "Devis accepté + encaissement généré", content: { "application/json": { schema: { type: "object" } } } } },
      },
    },
    "/client/devis/{id}/refuse": {
      post: {
        tags: ["Client"],
        summary: "Refuser un devis",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { reason: { type: "string" } } } } } },
        responses: { "200": { description: "Devis refusé", content: { "application/json": { schema: { type: "object" } } } } },
      },
    },
    "/client/payments": {
      get: {
        tags: ["Client"],
        summary: "Mes encaissements (client connecté)",
        responses: { "200": { description: "Paiements", content: { "application/json": { schema: { type: "array", items: { type: "object" } } } } } },
      },
    },
    "/client/payments/{id}/pay": {
      post: {
        tags: ["Client"],
        summary: "Régler un encaissement en attente",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { methode: { type: "string", enum: ["en_ligne", "cheque", "virement", "especes"] } } } } } },
        responses: { "200": { description: "Encaissement payé", content: { "application/json": { schema: { type: "object" } } } } },
      },
    },
    "/client/events": {
      get: {
        tags: ["Client"],
        summary: "Mes événements CRM (préparations)",
        responses: { "200": { description: "Événements du client", content: { "application/json": { schema: { type: "array", items: { type: "object" } } } } } },
      },
    },
    "/client/events/{id}": {
      get: {
        tags: ["Client"],
        summary: "Détail d'un de mes événements CRM",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Événement", content: { "application/json": { schema: { type: "object" } } } } },
      },
    },
    "/client/appointments": {
      get: {
        tags: ["Client"],
        summary: "Mes rendez-vous",
        responses: { "200": { description: "Rendez-vous", content: { "application/json": { schema: { type: "array", items: { type: "object" } } } } } },
      },
      post: {
        tags: ["Client"],
        summary: "Créer une demande de rendez-vous",
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { type_rdv: { type: "string", default: "rencontre" }, titre: { type: "string" }, date_heure: { type: "string" }, lieu: { type: "string" }, duree_minutes: { type: "integer" }, description: { type: "string" }, email: { type: "string" }, telephone: { type: "string" } } } } },
        },
        responses: { "201": { description: "Rendez-vous créé", content: { "application/json": { schema: { type: "object" } } } } },
      },
    },
    "/client/appointments/{id}": {
      patch: {
        tags: ["Client"],
        summary: "Annuler ou reporter mon rendez-vous (pas la confirmation)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { statut: { type: "string", enum: ["planifie", "annule", "reporte"] }, date_heure: { type: "string" }, notes: { type: "string" } } } } } },
        responses: { "200": { description: "Rendez-vous mis à jour", content: { "application/json": { schema: { type: "object" } } } } },
      },
    },
    "/client/contracts": {
      get: {
        tags: ["Client"],
        summary: "Mes contrats",
        responses: { "200": { description: "Contrats", content: { "application/json": { schema: { type: "array", items: { type: "object" } } } } } },
      },
    },
    "/client/packs": {
      get: {
        tags: ["Client"],
        summary: "Mes packs réservés",
        responses: { "200": { description: "Réservations de packs", content: { "application/json": { schema: { type: "array", items: { type: "object" } } } } } },
      },
      post: {
        tags: ["Client"],
        summary: "Réserver un pack pour une date",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["packId", "date"], properties: { packId: { type: "string" }, date: { type: "string", format: "date", description: "Ex: 2026-09-15" }, quantite: { type: "integer", default: 1 }, notes: { type: "string" } } } } },
        },
        responses: {
          "201": { description: "Pack réservé", content: { "application/json": { schema: { type: "object" } } } },
          "409": { description: "Pack déjà réservé à cette date", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/client/packs/check-availability": {
      post: {
        tags: ["Client"],
        summary: "Vérifier la disponibilité d'un pack à une date",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["packId", "date"], properties: { packId: { type: "string" }, date: { type: "string", format: "date" } } } } },
        },
        responses: { "200": { description: "Résultat de disponibilité", content: { "application/json": { schema: { $ref: "#/components/schemas/Availability" } } } } },
      },
    },
    "/client/packs/{id}": {
      patch: {
        tags: ["Client"],
        summary: "Annuler ma réservation de pack",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { statut: { type: "string", enum: ["annule"] }, notes: { type: "string" } } } } } },
        responses: { "200": { description: "Réservation annulée", content: { "application/json": { schema: { type: "object" } } } } },
      },
    },
    "/client/quotes": {
      post: {
        tags: ["Client"],
        summary: "Demander un devis depuis le site (client connecté)",
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { pack_id: { type: "string" }, email: { type: "string" }, telephone: { type: "string" }, type_evenement: { type: "string" }, date_evenement: { type: "string" }, ville: { type: "string" }, salle: { type: "string" }, nb_invites: { type: "integer" }, budget_estime: { type: "number" }, services_demandes: { type: "array", items: { type: "string" } }, message: { type: "string" } } } } },
        },
        responses: { "201": { description: "Devis créé (brouillon)", content: { "application/json": { schema: { type: "object" } } } } },
      },
    },

    // ── CRM ─────────────────────────────────────────────────────────────────
    "/crm/{kind}": {
      get: {
        tags: ["CRM"],
        summary: "Liste des enregistrements d'une catégorie (ADMIN)",
        parameters: [{ name: "kind", in: "path", required: true, schema: { type: "string" }, description: "Ex: devis, services, incomes, appointments, events, contracts, client_packs" }],
        responses: { "200": { description: "Enregistrements", content: { "application/json": { schema: { type: "array", items: { type: "object" } } } } } },
      },
      post: {
        tags: ["CRM"],
        summary: "Créer un enregistrement CRM (ADMIN)",
        parameters: [{ name: "kind", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "201": { description: "Enregistrement créé", content: { "application/json": { schema: { type: "object" } } } } },
      },
    },
    "/crm/{kind}/{id}": {
      get: {
        tags: ["CRM"],
        summary: "Détail d'un enregistrement CRM (ADMIN)",
        parameters: [
          { name: "kind", in: "path", required: true, schema: { type: "string" } },
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Enregistrement", content: { "application/json": { schema: { type: "object" } } } } },
      },
      put: {
        tags: ["CRM"],
        summary: "Mettre à jour (fusion) — l'acceptation d'un devis génère l'encaissement",
        parameters: [
          { name: "kind", in: "path", required: true, schema: { type: "string" } },
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: { content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Enregistrement mis à jour", content: { "application/json": { schema: { type: "object" } } } } },
      },
      delete: {
        tags: ["CRM"],
        summary: "Supprimer un enregistrement CRM (ADMIN)",
        parameters: [
          { name: "kind", in: "path", required: true, schema: { type: "string" } },
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "204": { description: "Supprimé" } },
      },
    },

    // ── PUBLIC ──────────────────────────────────────────────────────────────
    "/public/services": {
      get: {
        tags: ["Public"],
        summary: "Prestations visibles sur le site public",
        security: [],
        responses: { "200": { description: "Services", content: { "application/json": { schema: { type: "array", items: { type: "object" } } } } } },
      },
    },
    "/public/{kind}": {
      post: {
        tags: ["Public"],
        summary: "Demandes publiques (devis / contact / RDV)",
        security: [],
        parameters: [{ name: "kind", in: "path", required: true, schema: { type: "string", enum: ["quote_requests", "contact_messages", "appointment_requests"] } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "201": { description: "Demande enregistrée", content: { "application/json": { schema: { type: "object" } } } } },
      },
    },

    // ── NOTIFICATIONS ───────────────────────────────────────────────────────
    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "Mes notifications + compteur non lues",
        parameters: [{ name: "limit", in: "query", schema: { type: "integer", default: 20 } }],
        responses: {
          "200": {
            description: "Notifications",
            content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Notification" } }, unread: { type: "integer" } } } } },
          },
        },
      },
    },
    "/notifications/read-all": {
      post: {
        tags: ["Notifications"],
        summary: "Marquer toutes mes notifications comme lues",
        responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } } },
      },
    },
    "/notifications/{id}": {
      patch: {
        tags: ["Notifications"],
        summary: "Marquer une notification comme lue",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { isRead: { type: "boolean" } } } } } },
        responses: { "200": { description: "Notification mise à jour", content: { "application/json": { schema: { $ref: "#/components/schemas/Notification" } } } } },
      },
    },

    // ── IA ──────────────────────────────────────────────────────────────────
    "/ai/chat": {
      post: {
        tags: ["IA"],
        summary: "Assistant conversationnel (réponses en français)",
        security: [],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["message"], properties: { message: { type: "string" } } } } } },
        responses: { "200": { description: "Réponse", content: { "application/json": { schema: { type: "object", properties: { reply: { type: "string" } } } } } } },
      },
    },

    // ── UPLOADS ─────────────────────────────────────────────────────────────
    "/uploads": {
      post: {
        tags: ["Uploads"],
        summary: "Uploader un enregistrement audio d'appel (ADMIN, corps brut)",
        description: "Le corps de la requête est le fichier brut (audio/webm, audio/ogg, audio/wav, audio/mpeg).",
        responses: {
          "201": {
            description: "Fichier sauvegardé",
            content: { "application/json": { schema: { type: "object", properties: { url: { type: "string" }, size: { type: "integer" }, type: { type: "string" } } } } },
          },
        },
      },
    },
  },
};
