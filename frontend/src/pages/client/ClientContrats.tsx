import { useEffect, useState } from 'react';
import { ScrollText, Download } from 'lucide-react';
import { clientApi } from '@/lib/neonApi';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

export default function ClientContrats() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      clientApi.contracts().catch(() => []),
      clientApi.devis().catch(() => []),
      clientApi.events().catch(() => []),
    ]).then(([cs, dv, ev]) => {
      const devisMap = Object.fromEntries((dv || []).map((d: any) => [d.id, d]));
      const eventsMap = Object.fromEntries((ev || []).map((e: any) => [e.id, e]));
      const enriched = (cs || []).map((c: any) => ({
        ...c,
        _event: eventsMap[c.event_id] || null,
        _devis: devisMap[c.devis_id] || null,
      }));
      setContracts(enriched);
      setLoading(false);
    }).catch(() => { setContracts([]); setLoading(false); });
  }, []);

  return (
    <div>
      <PageHeader title="Mes Contrats" subtitle={`${contracts.length} contrat${contracts.length !== 1 ? 's' : ''}`} />

      {loading ? (
        <div className="glass rounded-2xl h-48 animate-pulse" />
      ) : contracts.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <ScrollText size={40} className="mx-auto mb-3 text-dark-600" />
          <p className="text-dark-400">Aucun contrat disponible</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['N° Contrat', 'Date', 'Événement', 'Montant', 'Statut', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-dark-400 text-xs font-medium uppercase tracking-wider last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-5 py-4 text-gold-400 font-mono text-sm">{c.reference}</td>
                    <td className="px-5 py-4 text-dark-200 text-sm">{new Date(c.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-4 text-dark-200 text-sm">{c._event?.nom || '–'}</td>
                    <td className="px-5 py-4 text-white font-semibold">{c._devis?.montant_ttc?.toLocaleString('fr-FR') || '–'} DT</td>
                    <td className="px-5 py-4"><StatusBadge status={c.statut} /></td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-dark-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all flex items-center gap-1 text-xs ml-auto">
                        <Download size={14} /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
