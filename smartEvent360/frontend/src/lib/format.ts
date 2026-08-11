/**
 * format.ts — Formatage monnaie (dinar tunisien) et helpers métier.
 */

/** Formate un prix en dinars tunisiens (DT / dinar). */
export function formatPrice(value: number | string | null | undefined, decimals = 0): string {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return '0 DT';
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} DT`;
}

/**
 * Retour sur investissement : nombre de nuits de location nécessaires pour
 * amortir le prix d'achat. Retourne null si non calculable.
 */
export function nightsToBreakEven(purchasePrice: number | string | null | undefined, nightlyRental: number | string | null | undefined): number | null {
  const cost = Number(purchasePrice ?? 0);
  const rate = Number(nightlyRental ?? 0);
  if (!cost || !rate || rate <= 0 || cost <= 0) return null;
  return Math.ceil(cost / rate);
}
