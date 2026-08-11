"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
// Réponses de fallback si pas d'OpenAI
const FALLBACK_RESPONSES = {
    default: "Bonjour ! Je suis l'assistant SmartEvent360. Je peux vous aider à trouver des événements, réserver des tickets ou répondre à vos questions.",
    événement: "Nous avons plusieurs événements disponibles ! Rendez-vous sur la page Événements pour les découvrir et réserver vos places.",
    ticket: "Pour réserver un ticket, rendez-vous sur la page Événements, choisissez un événement et cliquez sur 'Réserver'. C'est simple et rapide !",
    prix: "Certains de nos événements sont gratuits, d'autres sont payants. Consultez la page Événements pour voir les tarifs.",
    contact: "Pour nous contacter, écrivez-nous à contact@smartevent360.com ou appelez le +216 XX XXX XXX.",
    annuler: "Pour annuler une réservation, contactez-nous à contact@smartevent360.com en précisant votre numéro de ticket.",
};
function getFallbackReply(message) {
    const lower = message.toLowerCase();
    for (const [key, reply] of Object.entries(FALLBACK_RESPONSES)) {
        if (key !== "default" && lower.includes(key))
            return reply;
    }
    return FALLBACK_RESPONSES.default;
}
// POST /api/ai/chat
router.post("/chat", async (req, res) => {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
        res.status(400).json({ error: "message requis" });
        return;
    }
    // Si OpenAI configuré
    if (process.env.OPENAI_API_KEY) {
        try {
            // Contexte: liste des événements
            const events = await prisma_1.prisma.event.findMany({
                where: { isPublished: true },
                select: { title: true, date: true, location: true, price: true, capacity: true },
                take: 10,
                orderBy: { date: "asc" },
            });
            const systemPrompt = `Tu es un assistant virtuel pour SmartEvent360, une plateforme de gestion d'événements.
Voici les événements disponibles :
${events.map((e) => `- ${e.title} | ${new Date(e.date).toLocaleDateString("fr-FR")} | ${e.location} | ${e.price > 0 ? e.price + " DT" : "Gratuit"}`).join("\n")}

Réponds en français, de façon concise et utile. Si on te demande de réserver, dis à l'utilisateur de cliquer sur le bouton Réserver sur la page Événements.`;
            const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
                    max_tokens: 300,
                    temperature: 0.7,
                }),
            });
            if (openaiRes.ok) {
                const data = await openaiRes.json();
                res.json({ reply: data.choices[0]?.message?.content ?? getFallbackReply(message) });
                return;
            }
        }
        catch {
            // fallback
        }
    }
    // Fallback intelligent sans OpenAI
    res.json({ reply: getFallbackReply(message) });
});
exports.default = router;
