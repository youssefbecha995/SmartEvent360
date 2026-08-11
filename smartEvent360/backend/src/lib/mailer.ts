import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/**
 * mailer.ts — Envoi d'emails transactionnels (confirmation de rendez-vous, etc.)
 * Config via variables d'environnement :
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM
 * Si SMTP_USER/SMTP_PASS ne sont pas renseignés, l'envoi est simplement
 * désactivé (pas d'erreur bloquante).
 */

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  if (!user || !pass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    });
  }
  return transporter;
}

const mailFrom = () =>
  process.env.MAIL_FROM || (process.env.SMTP_USER ? `SmartEvent360 <${process.env.SMTP_USER}>` : "SmartEvent360 <noreply@smartevent360.com>");

const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" }) : "–";

export async function sendAppointmentConfirmation(opts: {
  to: string;
  clientName?: string;
  appointment: { titre?: string | null; date_heure?: string | null; lieu?: string | null; duree_minutes?: number | null };
}): Promise<{ sent: boolean; reason?: string }> {
  const tr = getTransporter();
  if (!tr) return { sent: false, reason: "SMTP non configuré (SMTP_USER/SMTP_PASS manquants)" };

  const { to, clientName, appointment } = opts;
  const salutation = clientName ? `Bonjour ${clientName},` : "Bonjour,";
  const titre = appointment.titre || "Rendez-vous";
  const date = fmtDateTime(appointment.date_heure);
  const lieu = appointment.lieu || "–";
  const duree = appointment.duree_minutes ? `${appointment.duree_minutes} min` : "–";

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">
      <div style="text-align:center;padding:16px 0;border-bottom:2px solid #B8860B">
        <h1 style="margin:0;color:#B8860B;font-size:22px;letter-spacing:2px">SMARTEVENT360</h1>
        <p style="margin:4px 0 0;color:#666;font-size:13px">Confirmation de rendez-vous</p>
      </div>
      <div style="padding:20px 0">
        <p style="font-size:15px">${salutation}</p>
        <p style="font-size:15px">Votre rendez-vous a été <strong style="color:#1a7f37">confirmé</strong>. Voici le récapitulatif :</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
          <tr><td style="padding:8px 0;color:#666;width:40%">Sujet</td><td style="padding:8px 0;font-weight:600">${titre}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Date &amp; heure</td><td style="padding:8px 0;font-weight:600">${date}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Lieu</td><td style="padding:8px 0;font-weight:600">${lieu}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Durée</td><td style="padding:8px 0;font-weight:600">${duree}</td></tr>
        </table>
        <p style="font-size:14px;color:#333">Nous sommes à votre disposition pour toute question. À très bientôt !</p>
        <p style="font-size:13px;color:#999">L'équipe SmartEvent360</p>
      </div>
      <div style="text-align:center;padding-top:12px;border-top:1px solid #eee;color:#aaa;font-size:11px">
        Cet email vous a été envoyé automatiquement depuis votre espace SmartEvent360.
      </div>
    </div>
  `;

  try {
    await tr.sendMail({ from: mailFrom(), to, subject: `Confirmation de votre rendez-vous — ${titre}`, html });
    return { sent: true };
  } catch (e: any) {
    console.error("[mailer] envoi échoué:", e?.message);
    return { sent: false, reason: e?.message || "Erreur SMTP" };
  }
}
