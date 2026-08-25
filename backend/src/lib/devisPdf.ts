import PDFDocument from "pdfkit";

interface DevisLine {
  description?: string;
  quantite?: number;
  prix_unitaire?: number;
  total?: number;
}

const GOLD = "#c9a227";
const DARK = "#1f2430";
const GREY = "#6b7280";
const LIGHT = "#f4f5f7";

function money(n: unknown): string {
  const v = Number(n);
  if (!isFinite(v)) return "0";
  return v
    .toFixed(v % 1 === 0 ? 0 : 3)
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
    .replace(".", ",");
}

function frDate(iso?: string | null): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "–";
  return d.toLocaleDateString("fr-FR");
}

export function buildDevisPdf(
  devis: Record<string, any>,
  client: { prenom?: string | null; nom?: string | null; name?: string | null; email?: string | null; phone?: string | null; company?: string | null } | null,
  event: { title?: string; date?: Date | string; location?: string } | null
): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: `Devis ${devis.reference || devis.numero || ""}` } });
  const ref = String(devis.reference || devis.numero || "").trim();
  const lines: DevisLine[] = Array.isArray(devis.lignes) ? devis.lignes : [];

  // ── Bandeau + en-tête société ──
  doc.rect(0, 0, doc.page.width, 8).fill(GOLD);
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(22).text("SmartEvent360", 50, 42);
  doc.font("Helvetica").fontSize(9).fillColor(GREY)
    .text("Agence d'organisation d'événements", 50, 68)
    .text("contact@smartevent360.com  ·  +216 00 000 000", 50, 81);

  // ── Titre DEVIS ──
  const titleY = 42;
  doc.font("Helvetica-Bold").fontSize(26).fillColor(LIGHT).text("DEVIS", 380, titleY, { width: 165, align: "right" });
  doc.fontSize(11).fillColor(DARK).text(ref ? `N° ${ref}` : "", 380, titleY + 32, { width: 165, align: "right" });

  doc.moveTo(50, 105).lineTo(545, 105).lineWidth(1).strokeColor("#e5e7eb").stroke();

  // ── Blocs Client / Dates ──
  const boxTop = 125;
  const boxH = 92;
  doc.roundedRect(50, boxTop, 300, boxH, 6).fillAndStroke(LIGHT, "#e5e7eb");
  doc.roundedRect(362, boxTop, 183, boxH, 6).fillAndStroke(LIGHT, "#e5e7eb");

  doc.font("Helvetica-Bold").fontSize(9).fillColor(GOLD).text("CLIENT", 64, boxTop + 12);
  const clientName = client ? [client.prenom, client.nom].filter(Boolean).join(" ") || client.name || "–" : "–";
  doc.font("Helvetica-Bold").fontSize(12).fillColor(DARK).text(clientName, 64, boxTop + 28, { width: 272 });
  doc.font("Helvetica").fontSize(9.5).fillColor(GREY);
  let cy = boxTop + 48;
  if (client?.company) { cy += 13; }
  if (client?.email) doc.text(client.email, 64, cy, { width: 272 });
  if (client?.phone) doc.text(`Tél : ${client.phone}`, 64, cy + (client?.email ? 13 : 0), { width: 272 });
  if (client?.company) doc.text(client.company, 64, boxTop + 74, { width: 272 });

  doc.font("Helvetica-Bold").fontSize(9).fillColor(GOLD).text("INFORMATIONS", 376, boxTop + 12);
  doc.font("Helvetica").fontSize(9.5).fillColor(DARK);
  doc.text(`Émis le : ${frDate(devis.date_emission)}`, 376, boxTop + 30);
  doc.text(`Valable jusqu'au : ${frDate(devis.date_expiration)}`, 376, boxTop + 46);
  doc.text(`Statut : ${devis.statut === "envoye" ? "Envoyé" : devis.statut === "accepte" ? "Accepté" : devis.statut === "refuse" ? "Refusé" : "Brouillon"}`, 376, boxTop + 62);

  // ── Événement lié ──
  let y = boxTop + boxH + 18;
  if (event) {
    doc.roundedRect(50, y, 495, 40, 6).fillAndStroke("#fbf7ea", GOLD);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(DARK).text(`Événement : ${event.title || "–"}`, 62, y + 8);
    const evDate = event.date ? new Date(event.date) : null;
    doc.font("Helvetica").fontSize(9).fillColor(GREY).text(
      `${evDate && !isNaN(evDate.getTime()) ? evDate.toLocaleDateString("fr-FR") : ""}${event.location ? ` · ${event.location}` : ""}`,
      62, y + 23
    );
    y += 56;
  }

  // ── Tableau des lignes ──
  y += 4;
  const colDesc = 62, colQty = 360, colPu = 420, colTotal = 535;
  doc.rect(50, y, 495, 24).fill(DARK);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
  doc.text("DESCRIPTION", colDesc, y + 8);
  doc.text("QTÉ", colQty, y + 8, { width: 44, align: "right" });
  doc.text("PRIX U.", colPu - 70, y + 8, { width: 60, align: "right" });
  doc.text("TOTAL HT", colTotal - 75, y + 8, { width: 75, align: "right" });
  y += 24;

  if (lines.length === 0) {
    doc.font("Helvetica").fontSize(10).fillColor(GREY).text("Aucune ligne de prestation.", colDesc, y + 14);
    y += 40;
  }
  lines.forEach((l, i) => {
    const rowH = 26;
    if (y + rowH > 720) { doc.addPage(); y = 60; }
    if (i % 2 === 1) doc.rect(50, y, 495, rowH).fill(LIGHT);
    doc.font("Helvetica").fontSize(9.5).fillColor(DARK)
      .text(String(l.description ?? "–"), colDesc, y + 9, { width: 280, ellipsis: true });
    doc.text(String(l.quantite ?? 1), colQty, y + 9, { width: 44, align: "right" });
    doc.text(`${money(l.prix_unitaire)} DT`, colPu - 70, y + 9, { width: 60, align: "right" });
    doc.font("Helvetica-Bold").text(`${money(l.total)} DT`, colTotal - 75, y + 9, { width: 75, align: "right" });
    y += rowH;
    doc.moveTo(50, y).lineTo(545, y).lineWidth(0.5).strokeColor("#e5e7eb").stroke();
  });

  // ── Totaux ──
  if (y > 620) { doc.addPage(); y = 60; }
  y += 16;
  const totBoxX = 330, totBoxW = 215;
  const totH = devis.montant_ht != null ? 84 : 46;
  doc.roundedRect(totBoxX, y, totBoxW, totH, 6).fillAndStroke(LIGHT, "#e5e7eb");
  doc.font("Helvetica").fontSize(10).fillColor(DARK);
  let ty = y + 12;
  if (devis.montant_ht != null) {
    doc.text("Total HT", totBoxX + 14, ty); doc.text(`${money(devis.montant_ht)} DT`, totBoxX + 100, ty, { width: 100, align: "right" }); ty += 20;
    doc.text("TVA (20%)", totBoxX + 14, ty); doc.text(`${money(devis.montant_tva)} DT`, totBoxX + 100, ty, { width: 100, align: "right" }); ty += 22;
  }
  doc.roundedRect(totBoxX + 6, ty - 4, totBoxW - 12, 30, 4).fill(GOLD);
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#ffffff")
    .text("TOTAL TTC", totBoxX + 14, ty + 3);
  doc.fontSize(12).text(`${money(devis.montant_ttc)} DT`, totBoxX + 90, ty + 2, { width: 110, align: "right" });
  y += totH;

  // ── Signature du client (si accepté) ──
  if (devis.signature_data && typeof devis.signature_data === "string" && devis.signature_data.startsWith("data:image")) {
    try {
      const b64 = devis.signature_data.split(",")[1];
      const imgX = 60, imgY = Math.max(y + 20, 600);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(GREY).text("Signature du client :", imgX, imgY - 16);
      doc.image(Buffer.from(b64, "base64"), imgX, imgY, { height: 55 });
      if (devis.date_acceptation) {
        doc.font("Helvetica").fontSize(8).fillColor(GREY)
          .text(`Accepté le ${new Date(devis.date_acceptation).toLocaleString("fr-FR")}`, imgX, imgY + 60);
      }
    } catch { /* signature illisible : on ignore */ }
  }

  // ── Pied de page ──
  const footY = doc.page.height - 72;
  doc.moveTo(50, footY).lineTo(545, footY).lineWidth(0.5).strokeColor("#e5e7eb").stroke();
  doc.font("Helvetica").fontSize(8).fillColor(GREY)
    .text(
      "Devis gratuit et sans engagement — valable jusqu'à la date d'expiration indiquée. « Bon pour accord » : toute acceptance signée vaut validation de la prestation décrite ci-dessus.",
      50, footY + 8, { width: 495, align: "center" }
    );

  return doc;
}
