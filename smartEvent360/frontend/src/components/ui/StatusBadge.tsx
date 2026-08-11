const statusConfig: Record<string, { label: string; color: string }> = {
  // Devis
  brouillon: { label: 'Brouillon', color: 'bg-dark-600 text-dark-200' },
  envoye: { label: 'Envoyé', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  accepte: { label: 'Accepté', color: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  refuse: { label: 'Refusé', color: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  converti: { label: 'Converti', color: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
  // Events
  preparation: { label: 'Préparation', color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  en_cours: { label: 'En cours', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  termine: { label: 'Terminé', color: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  annule: { label: 'Annulé', color: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  // Payments
  en_attente: { label: 'En attente', color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  confirme: { label: 'Confirmé', color: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  echoue: { label: 'Échoué', color: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  // Appointments
  planifie: { label: 'Planifié', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  confirme_rdv: { label: 'Confirmé', color: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  reporte: { label: 'Reporté', color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  // Personnel
  disponible: { label: 'Disponible', color: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  mission: { label: 'En mission', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  conges: { label: 'En congés', color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  absent: { label: 'Absent', color: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  // Clients
  prospect: { label: 'Prospect', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  actif: { label: 'Actif', color: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  inactif: { label: 'Inactif', color: 'bg-dark-600 text-dark-300' },
  // Equipment
  bon: { label: 'Bon', color: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  neuf: { label: 'Neuf', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  moyen: { label: 'Moyen', color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  a_reparer: { label: 'À réparer', color: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  reserve: { label: 'Réservé', color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  en_reparation: { label: 'En réparation', color: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  indisponible: { label: 'Indisponible', color: 'bg-dark-600 text-dark-300' },
  // Contracts
  en_signature: { label: 'En signature', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  signe: { label: 'Signé', color: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  archive: { label: 'Archivé', color: 'bg-dark-600 text-dark-300' },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || { label: status, color: 'bg-dark-700 text-dark-300' };
  return <span className={`badge ${cfg.color} text-xs px-2 py-0.5`}>{cfg.label}</span>;
}
