import { useEffect, useState } from 'react';
import { CreditCard, Download } from 'lucide-react';
import { clientApi } from '@/lib/neonApi';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

export default function ClientPaiements() {
  const { user, token } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    clientApi.payments().then(data => {
      setPayments(data || []);
      setLoading(false);
    }).catch(() => { setPayments([]); setLoading(false); });
  }, [token]);

  const total = payments.reduce((a, b) => a + (Number(b.montant) || 0), 0);
  const paid = payments.filter(p => p.statut === 'paye').reduce((a, b) => a + (Number(b.montant) || 0), 0);
  const remaining = total - paid;
  const progress = total > 0 ? (paid / total) * 100 : 0;

  const typeLabel: Record<string, string> = { acompte: 'Acompte', solde: 'Solde', caution: 'Caution', avance: 'Avance', remboursement: 'Remboursement', autre: 'Autre' };
  const methodeLabel: Record<string, string> = { cb: 'Carte bancaire', carte: 'Carte bancaire', virement: 'Virement', cheque: 'Chèque', especes: 'Espèces', en_ligne: 'Paiement en ligne' };
  const statutMap: Record<string, string> = { paye: 'confirme', attente: 'en_attente', partiel: 'en_attente', retarde: 'en_attente', annule: 'annule' };

  const [paying, setPaying] = useState(false);
  const nextDue = payments.find(p => !['paye', 'annule'].includes(p.statut));

  const handlePay = async () => {
    if (!nextDue) return;
    setPaying(true);
    const updated = await clientApi.pay(nextDue.id, 'en_ligne').catch(() => null);
    if (updated) {
      setPayments(prev => prev.map(p => p.id === nextDue.id ? { ...p, ...updated } : p));
    }
    setPaying(false);
  };

  return (
    <div>
      <PageHeader title="Mes Paiements" subtitle="Suivi de vos transactions en temps réel" />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Budget total', value: total, color: 'text-white' },
          { label: 'Déjà payé', value: paid, color: 'text-green-400' },
          { label: 'Reste à payer', value: remaining, color: remaining > 0 ? 'text-red-400' : 'text-green-400' },
        ].map((item, i) => (
          <div key={i} className="kpi-card">
            <div className="text-dark-400 text-xs mb-1">{item.label}</div>
            <div className={`text-2xl font-bold ${item.color}`}>{item.value.toLocaleString('fr-FR')} DT</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="glass rounded-2xl p-5 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-dark-400">Progression des paiements</span>
            <span className="text-gold-400 font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-dark-700 rounded-full h-3">
            <div className="bg-gradient-to-r from-gold-600 to-gold-400 h-3 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-dark-500 mt-1.5">
            <span>Payé : {paid.toLocaleString('fr-FR')} DT</span>
            <span>Total : {total.toLocaleString('fr-FR')} DT</span>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="glass rounded-2xl h-48 animate-pulse" />
      ) : payments.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <CreditCard size={40} className="mx-auto mb-3 text-dark-600" />
          <p className="text-dark-400">Aucun paiement enregistré</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Date', 'Description', 'Type', 'Méthode', 'Montant', 'Statut', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-dark-400 text-xs font-medium uppercase tracking-wider last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-5 py-4 text-dark-300 text-sm">{p.date_paiement ? new Date(p.date_paiement).toLocaleDateString('fr-FR') : '–'}</td>
                    <td className="px-5 py-4 text-dark-200 text-sm">{p.description || typeLabel[p.type_paiement] || p.type_paiement || '–'}</td>
                    <td className="px-5 py-4"><span className="badge bg-dark-700 text-dark-300 text-xs">{typeLabel[p.type_paiement] || p.type_paiement || '–'}</span></td>
                    <td className="px-5 py-4 text-dark-300 text-sm hidden md:table-cell">{methodeLabel[p.mode_paiement] || p.mode_paiement || '–'}</td>
                    <td className="px-5 py-4 font-semibold text-white">{(Number(p.montant) || 0).toLocaleString('fr-FR')} DT</td>
                    <td className="px-5 py-4"><StatusBadge status={statutMap[p.statut] || p.statut} /></td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-dark-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all"><Download size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {remaining > 0 && nextDue && (
        <div className="mt-5 glass rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-white font-semibold">Solde restant à payer</p>
            <p className="text-dark-400 text-sm">Réglez votre solde en toute sécurité</p>
          </div>
          <button onClick={handlePay} disabled={paying} className="btn-gold py-2.5 px-6 flex items-center gap-2 disabled:opacity-60">
            <CreditCard size={16} />
            {paying ? 'Traitement...' : `Payer ${remaining.toLocaleString('fr-FR')} DT`}
          </button>
        </div>
      )}
    </div>
  );
}
