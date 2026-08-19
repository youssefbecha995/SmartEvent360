import { useEffect, useState } from 'react';
import { FileText, Download, Check, X as XIcon } from 'lucide-react';
import { clientApi, eventsApi } from '@/lib/neonApi';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import SignaturePad from '@/components/ui/SignaturePad';

export default function ClientDevis() {
  const { user, token } = useAuth();
  const [devis, setDevis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [eventsMap, setEventsMap] = useState<Record<string, { title: string; date: string; location: string }>>({});
  const [filter, setFilter] = useState('tous');
  const [signing, setSigning] = useState<any | null>(null);
  const [refusing, setRefusing] = useState<any | null>(null);
  const [refuseReason, setRefuseReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    eventsApi.list({ limit: 200 }).then(r => {
      const map: Record<string, { title: string; date: string; location: string }> = {};
      (r.data || []).forEach(e => { map[e.id] = { title: e.title, date: e.date, location: e.location }; });
      setEventsMap(map);
    }).catch(() => {});
    clientApi.devis().then(d => {
      setDevis(d || []);
      setLoading(false);
    }).catch(() => { setDevis([]); setLoading(false); });
  }, [token]);

  const openDevis = async (d: any) => {
    setSelected(d);
    setLines(d.lignes || []);
  };

  const signerName = user?.email || '';

  const handleSignAccept = async (dataUrl: string) => {
    if (!signing) return;
    setSaving(true);
    const updated = await clientApi.acceptDevis(signing.id, dataUrl).catch(() => null);
    if (updated) {
      setDevis(prev => prev.map(d => d.id === signing.id ? { ...d, ...updated } : d));
      if (selected?.id === signing.id) setSelected((p: any) => ({ ...p, ...updated }));
    }
    setSaving(false);
    setSigning(null);
  };

  const handleRefuse = async () => {
    if (!refusing) return;
    setSaving(true);
    const note = refuseReason ? `Refusé par le client : ${refuseReason}` : 'Refusé par le client.';
    const updated = await clientApi.refuseDevis(refusing.id, note).catch(() => null);
    if (updated) {
      setDevis(prev => prev.map(d => d.id === refusing.id ? { ...d, ...updated } : d));
      if (selected?.id === refusing.id) setSelected((p: any) => ({ ...p, ...updated }));
    }
    setSaving(false);
    setRefusing(null);
    setRefuseReason('');
  };

  const filtered = filter === 'tous' ? devis : devis.filter(d => d.statut === filter);

  return (
    <div>
      <PageHeader title="Mes Devis" subtitle={`${devis.length} devis au total`} />

      <div className="flex gap-2 mb-6 flex-wrap">
        {[['tous', 'Tous'], ['envoye', 'Envoyés'], ['accepte', 'Acceptés'], ['refuse', 'Refusés']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === v ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white'}`}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="glass rounded-2xl h-48 animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-dark-400">
          <FileText size={40} className="mx-auto mb-3 text-dark-600" />
          <p>Aucun devis trouvé</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-5 py-3.5 text-dark-400 text-xs font-medium uppercase tracking-wider">N° Devis</th>
                  <th className="text-left px-5 py-3.5 text-dark-400 text-xs font-medium uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3.5 text-dark-400 text-xs font-medium uppercase tracking-wider hidden md:table-cell">Événement</th>
                  <th className="text-right px-5 py-3.5 text-dark-400 text-xs font-medium uppercase tracking-wider">Montant</th>
                  <th className="text-center px-5 py-3.5 text-dark-400 text-xs font-medium uppercase tracking-wider">Statut</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer" onClick={() => openDevis(d)}>
                    <td className="px-5 py-4 text-gold-400 font-mono text-sm">{d.reference}</td>
                    <td className="px-5 py-4 text-dark-200 text-sm">{new Date(d.date_emission).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-4 text-dark-200 text-sm hidden md:table-cell">{eventsMap[d.event_id]?.title || '–'}</td>
                    <td className="px-5 py-4 text-right font-semibold text-white">{d.montant_ttc?.toLocaleString('fr-FR')} DT</td>
                    <td className="px-5 py-4 text-center"><StatusBadge status={d.statut} /></td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                        <button className="text-dark-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all"><Download size={15} /></button>
                        {d.statut === 'envoye' && (
                          <>
                            <button onClick={() => setSigning(d)} className="text-green-400 hover:bg-green-500/10 p-1.5 rounded-lg transition-all"><Check size={15} /></button>
                            <button onClick={() => setRefusing(d)} className="text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-all"><XIcon size={15} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10">
            <div className="p-7">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-dark-400 text-xs mb-1">Devis</p>
                  <h2 className="text-xl font-bold text-gold-500">{selected.reference}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={selected.statut} />
                  <button onClick={() => setSelected(null)} className="text-dark-400 hover:text-white"><XIcon size={18} /></button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div><span className="text-dark-400">Émis le :</span> <span className="text-dark-200">{new Date(selected.date_emission).toLocaleDateString('fr-FR')}</span></div>
                <div><span className="text-dark-400">Expire le :</span> <span className="text-dark-200">{new Date(selected.date_expiration).toLocaleDateString('fr-FR')}</span></div>
              </div>

              {selected.event_id && eventsMap[selected.event_id] && (
                <div className="bg-dark-700 rounded-xl p-3 mb-5 text-sm">
                  <p className="text-white font-medium">{eventsMap[selected.event_id].title}</p>
                  <p className="text-dark-300 text-xs mt-0.5">
                    {new Date(eventsMap[selected.event_id].date).toLocaleDateString('fr-FR')} · {eventsMap[selected.event_id].location || '–'}
                  </p>
                </div>
              )}

              {lines.length > 0 ? (
                <table className="w-full text-sm mb-5">
                  <thead><tr className="border-b border-white/10 text-dark-400 text-xs">
                    <th className="text-left py-2">Description</th>
                    <th className="text-right py-2">Qté</th>
                    <th className="text-right py-2">Prix U.</th>
                    <th className="text-right py-2">Total</th>
                  </tr></thead>
                  <tbody>
                    {lines.map((l, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-2.5 text-dark-200">{l.description}</td>
                        <td className="py-2.5 text-right text-dark-300">{l.quantite}</td>
                        <td className="py-2.5 text-right text-dark-300">{l.prix_unitaire} DT</td>
                        <td className="py-2.5 text-right text-white font-medium">{l.total} DT</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="bg-dark-700 rounded-xl p-4 mb-5 text-center text-dark-400 text-sm">Aucune ligne de devis</div>
              )}

              <div className="bg-dark-700 rounded-xl p-4 mb-6 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-dark-400">Montant HT</span><span className="text-white">{selected.montant_ht?.toLocaleString('fr-FR') || '–'} DT</span></div>
                <div className="flex justify-between"><span className="text-dark-400">TVA (20%)</span><span className="text-white">{selected.montant_tva?.toLocaleString('fr-FR') || '–'} DT</span></div>
                <div className="flex justify-between font-bold text-base border-t border-white/10 pt-2">
                  <span className="text-white">Total TTC</span>
                  <span className="text-gold-500">{selected.montant_ttc?.toLocaleString('fr-FR') || '–'} DT</span>
                </div>
              </div>

              {selected.statut === 'envoye' && (
                <div className="flex gap-3">
                  <button onClick={() => setSigning(selected)} className="flex-1 btn-gold py-2.5 flex items-center justify-center gap-2">
                    <Check size={16} /> Accepter le devis
                  </button>
                  <button onClick={() => setRefusing(selected)} className="flex-1 border border-red-500/30 text-red-400 hover:bg-red-500/10 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2">
                    <XIcon size={16} /> Refuser
                  </button>
                </div>
              )}

              {selected.statut === 'accepte' && selected.signature_data && (
                <div className="bg-dark-700 rounded-xl p-4 flex items-center gap-3">
                  <img src={selected.signature_data} alt="Signature" className="h-12 bg-white/5 rounded" />
                  <div className="text-xs text-dark-400">
                    <p className="text-green-400 font-medium">Signé électroniquement</p>
                    {selected.date_acceptation && <p>{new Date(selected.date_acceptation).toLocaleString('fr-FR')}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {signing && (
        <SignaturePad
          title={`Signature électronique — ${signing.reference}`}
          subtitle={`Devis N° ${signing.reference} · Montant ${signing.montant_ttc?.toLocaleString('fr-FR')} DT`}
          signerName={signerName}
          confirming={saving}
          onConfirm={handleSignAccept}
          onClose={() => setSigning(null)}
        />
      )}

      {refusing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setRefusing(null)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-md w-full z-10 p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Refuser le devis {refusing.reference}</h2>
              <button onClick={() => setRefusing(null)} className="text-dark-400 hover:text-white"><XIcon size={18} /></button>
            </div>
            <label className="text-dark-300 text-sm mb-1.5 block">Motif du refus (optionnel)</label>
            <textarea value={refuseReason} onChange={e => setRefuseReason(e.target.value)} rows={3} className="input-field resize-none" placeholder="Dites-nous pourquoi..." />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setRefusing(null)} className="btn-ghost flex-1 py-2.5">Annuler</button>
              <button onClick={handleRefuse} disabled={saving} className="flex-1 border border-red-500/30 text-red-400 hover:bg-red-500/10 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60">
                {saving ? 'Envoi...' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
