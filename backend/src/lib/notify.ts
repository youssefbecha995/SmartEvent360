import { prisma } from "./prisma";
import type { NotificationType } from "@prisma/client";

export interface NotifyInput {
  type?: NotificationType;
  title: string;
  message: string;
  lien?: string | null;
}

/** Crée une notification pour un utilisateur précis */
export function notifyUser(userId: string, input: NotifyInput) {
  return prisma.notification.create({
    data: {
      userId,
      type: input.type ?? "INFO",
      title: input.title,
      message: input.message,
      lien: input.lien ?? null,
    },
  });
}

/** Crée une notification pour tous les administrateurs */
export async function notifyAdmins(input: NotifyInput) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await prisma.notification.createMany({
    data: admins.map(a => ({
      userId: a.id,
      type: input.type ?? "INFO",
      title: input.title,
      message: input.message,
      lien: input.lien ?? null,
    })),
  });
}

/** "2026-08-11T10:30" → "11/08/2026 à 10:30" (ou "" si invalide) */
export function displayDate(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mn = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()} à ${hh}:${mn}`;
}

/** Nom affichable d'un utilisateur : prénom + nom, sinon name */
export async function userDisplayName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, nom: true, prenom: true },
  });
  if (!user) return "Un client";
  return [user.prenom, user.nom, user.name].filter(Boolean).join(" ") || "Un client";
}
