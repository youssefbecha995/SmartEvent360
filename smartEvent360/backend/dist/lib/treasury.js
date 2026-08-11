"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.today = today;
exports.ensureIncomeForDevis = ensureIncomeForDevis;
exports.ensureIncomeForEvent = ensureIncomeForEvent;
function today() {
    return new Date().toISOString().slice(0, 10);
}
/**
 * Crée automatiquement l'encaissement (kind "incomes") lié à un devis
 * au moment de son acceptation. Idempotent : si l'encaissement existe déjà
 * pour ce devis, il est retourné sans doublon.
 */
async function ensureIncomeForDevis(prisma, devisId) {
    const devis = await prisma.crmRecord.findUnique({ where: { id: devisId } });
    if (!devis || devis.kind !== "devis")
        return null;
    const d = (devis.data ?? {});
    const existing = await prisma.crmRecord.findFirst({
        where: { kind: "incomes", data: { path: ["devis_id"], equals: devisId } },
    });
    if (existing)
        return existing;
    const incomeData = {
        client_id: d.client_id ?? null,
        event_id: d.event_id ?? null,
        type_paiement: "acompte",
        mode_paiement: "virement",
        montant: Number(d.montant_ttc) || 0,
        statut: "attente",
        date_paiement: today(),
        echeance: d.date_expiration || null,
        reference_facture: d.reference || "",
        devis_id: devisId,
        description: d.reference ? `Devis ${d.reference}` : "Devis accepté",
        notes: "Encaissement généré automatiquement à l'acceptation du devis.",
    };
    // Si l'événement du devis a déjà un encaissement (créé lors de l'événement),
    // on le réutilise au lieu d'en créer un doublon.
    if (d.event_id) {
        const byEvent = await prisma.crmRecord.findFirst({
            where: { kind: "incomes", data: { path: ["event_id"], equals: d.event_id } },
        });
        if (byEvent) {
            const merged = {
                ...(byEvent.data ?? {}),
                devis_id: devisId,
                client_id: d.client_id ?? byEvent.data?.client_id ?? null,
                event_id: d.event_id,
                reference_facture: incomeData.reference_facture,
                description: incomeData.description,
                montant: incomeData.montant || (byEvent.data?.montant ?? 0),
            };
            return prisma.crmRecord.update({ where: { id: byEvent.id }, data: { data: merged } });
        }
    }
    const income = await prisma.crmRecord.create({
        data: { kind: "incomes", data: incomeData },
    });
    return income;
}
/**
 * Crée (ou met à jour) l'encaissement lié à un événement dès sa création
 * avec un client et un prix. Idempotent par event_id : une seule ligne
 * de trésorerie par événement, même si le prix change ensuite.
 */
async function ensureIncomeForEvent(prisma, event) {
    const existing = await prisma.crmRecord.findFirst({
        where: { kind: "incomes", data: { path: ["event_id"], equals: event.id } },
    });
    const payload = {
        client_id: event.clientId ?? null,
        event_id: event.id,
        type_paiement: "acompte",
        mode_paiement: "virement",
        montant: Number(event.price) || 0,
        statut: "attente",
        date_paiement: today(),
        echeance: null,
        reference_facture: `EVT-${String(event.title).slice(0, 20).toUpperCase()}`,
        description: `Événement ${event.title}`,
        notes: "Encaissement généré automatiquement à la création de l'événement.",
    };
    if (existing) {
        const merged = {
            ...(existing.data ?? {}),
            client_id: payload.client_id,
            event_id: event.id,
            montant: payload.montant,
            reference_facture: payload.reference_facture,
            description: payload.description,
        };
        return prisma.crmRecord.update({ where: { id: existing.id }, data: { data: merged } });
    }
    return prisma.crmRecord.create({ data: { kind: "incomes", data: payload } });
}
