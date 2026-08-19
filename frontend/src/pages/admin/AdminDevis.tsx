import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import { crmApi } from '@/lib/crmApi';
import { usersApi, eventsApi } from '@/lib/neonApi';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

interface Devis {
  id: string; reference: string; statut: string; montant_ttc: number;
  date_emission: string; client_id?: string; event_id?: string;
}

const columns = [
  { key: 'brouillon', label: 'À traiter', color: 'border-dark-600' },
  { key: 'envoye',    label: 'Envoyé',    color: 'border-blue-500/40' },
  { key: 'accepte',  label: 'Accepté',   color: 'border-green-500/40' },
  { key: 'refuse',   label: 'Refusé',    color: 'border-red-500/40' },
];

export default function AdminDevis() {
  const navigate = useNavigate();
  const { success } = useToast();
  const [devis, setDevis] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [form, setForm] = useState({ client_id: '', event_id: '', statut: 'brouillon', conditions: 'Acompte 50% à la signature, solde 30 jours avant l\'événement.' });
  const [saving, setSaving] = useState(false);

  const loadClients = async () => {
    try {
      const [users, evs] = await Promise.all([
        usersApi.list(),
        eventsApi.list({ limit: 200 }).then(r => r.data).catch(() => []),
      ]);
      const cs = users
        .filter(u => u.role === 'USER')
        .map(u => {
          const parts = u.name.trim().split(/\s+/);
          return { id: u.id, prenom: parts[0] || u.name, nom: parts.slice(1).join(' ') };
        });
      if (cs.length > 0) {
        setClients(cs);
        console.info('[AdminDevis] clients chargés depuis API Express:', cs.length);
      } else {
        console.warn('[AdminDevis] aucun client rôle USER');
      }
      setEvents(evs);
    } catch (e) { console.warn('[AdminDevis] API users indisponible:', e); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await crmApi.list('devis');
      setDevis(data as unknown as Devis[]);
      await loadClients();
    } catch {
      setDevis([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const clientName = (id?: string) => clients.find(c => c.id === id)?.prenom
    ? `${clients.find(c => c.id === id)?.prenom} ${clients.find(c => c.id === id)?.nom}`.trim()
    : '–';

  const handleCreate = async () => {
    setSaving(true);
    try {
      const ref = `DEV-${new Date().getFullYear()}-${String(devis.length + 1).padStart(3, '0')}`;
      const data = await crmApi.create('devis', { reference: ref, client_id: form.client_id, event_id: form.event_id || null, statut: 'brouillon', conditions: form.conditions, date_emission: new Date().toISOString() });
      success('Devis créé', ref);
      setShowCreate(false);
      if (data) navigate(`/admin/devis/${data.id}`);
      else load();
    } catch {
      const ref = `DEV-DEMO-${Date.now()}`;
      const nd = { id: 'mock-'+Date.now(), reference: ref, statut: form.statut, montant_ttc: 0, date_emission: new Date().toISOString() } as unknown as Devis;
      setDevis(prev => [nd, ...prev]);
      success('Devis créé (démo)', ref);
      setShowCreate(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce devis ?')) return;
    await crmApi.delete('devis', id).catch(() => null);
    setDevis(prev => prev.filter(d => d.id !== id));
    success('Devis supprimé');
  };

  const handleChangeStatus = async (id: string, statut: string) => {
    await crmApi.update('devis', id, { statut }).catch(() => null);
    setDevis(prev => prev.map(d => d.id === id ? { ...d, statut } : d));
  };

  const filtered = devis.filter(d =>
    d.reference.toLowerCase().includes(search.toLowerCase()) ||
    (clientName(d.client_id) ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const selectedEvent = events.find(ev => ev.id === form.event_id);

  return (
    <div className="p-4 lg:p-6">
      <PageHeader title="Gestion des Devis" subtitle={`${devis.length} devis`}
        action={<button onClick={() => setShowCreate(true)} className="btn-gold py-2 px-4 text-sm flex items-center gap-2"><Plus size={15} />Nouveau devis</button>} />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2.5 text-sm" placeholder="Rechercher..." />
        </div>
        <div className="flex gap-1.5">
          {(['kanban','table'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${view === v ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white'}`}>{v}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="glass rounded-2xl overflow-hidden"><table className="w-full"><tbody><SkeletonTable rows={5} /></tbody></table></div>
      ) : view === 'kanban' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map(col => {
            const colDevis = filtered.filter(d => d.statut === col.key);
            return (
              <div key={col.key} className={`glass rounded-2xl p-4 border ${col.color} min-h-[300px]`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-sm">{col.label}</h3>
                  <span className="w-6 h-6 rounded-full bg-dark-700 text-dark-300 text-xs flex items-center justify-center font-bold">{colDevis.length}</span>
                </div>
                <div className="space-y-3">
                  {colDevis.map(d => (
                    <div key={d.id} className="bg-dark-700 rounded-xl p-4 group cursor-pointer hover:ring-1 hover:ring-gold-500/30" onClick={() => navigate(`/admin/devis/${d.id}`)}>
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-gold-400 font-mono text-xs">{d.reference}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleDelete(d.id)} className="text-dark-500 hover:text-red-400 p-0.5"><Trash2 size={12} /></button>
                        </div>
                      </div>
                      <p className="text-white text-sm font-medium mb-1">{clientName(d.client_id)}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-dark-300 text-xs">{new Date(d.date_emission).toLocaleDateString('fr-FR')}</span>
                        <span className="text-gold-500 font-bold text-sm">{d.montant_ttc?.toLocaleString('fr-FR') || '0'} DT</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <select value={d.statut} onChange={e => handleChangeStatus(d.id, e.target.value)}
                          className="flex-1 bg-dark-800 border border-dark-500 rounded-lg px-2 py-1 text-xs text-dark-200 focus:outline-none focus:border-gold-500">
                          <option value="brouillon">Brouillon</option>
                          <option value="envoye">Envoyé</option>
                          <option value="accepte">Accepter (encaissement auto)</option>
                          <option value="refuse">Refuser</option>
                        </select>
                        <StatusBadge status={d.statut} />
                      </div>
                    </div>
                  ))}
                  {colDevis.length === 0 && <p className="text-dark-600 text-xs text-center py-6">Aucun devis</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-white/10">
                {['Référence','Client','Date','Montant TTC','Statut',''].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-dark-400 text-xs font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} className="border-b border-white/5 hover:bg-white/3 cursor-pointer" onClick={() => navigate(`/admin/devis/${d.id}`)}>
                    <td className="px-5 py-4 text-gold-400 font-mono text-sm">{d.reference}</td>
                    <td className="px-5 py-4 text-dark-200 text-sm">{clientName(d.client_id)}</td>
                    <td className="px-5 py-4 text-dark-300 text-sm">{new Date(d.date_emission).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-4 font-semibold text-white">{d.montant_ttc?.toLocaleString('fr-FR') || '0'} DT</td>
                    <td className="px-5 py-4"><StatusBadge status={d.statut} /></td>
                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button onClick={() => navigate(`/admin/devis/${d.id}`)} className="p-1.5 rounded-lg text-dark-400 hover:text-gold-400 hover:bg-gold-500/10 transition-all"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-md w-full z-10 p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Nouveau devis</h2>
              <button onClick={() => setShowCreate(false)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Client *</label>
                <select value={form.client_id} onChange={e => setForm(p => ({...p, client_id: e.target.value}))} className="input-field">
                  <option value="">Sélectionner un client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Événement</label>
                <select value={form.event_id} onChange={e => {
                  const ev = events.find(x => x.id === e.target.value);
                  setForm(p => ({ ...p, event_id: e.target.value, ...(ev?.clientId && !p.client_id ? { client_id: ev.clientId } : {}) }));
                }} className="input-field">
                  <option value="">— Aucun événement —</option>
                  {events
                    .filter(ev => !form.client_id || !ev.clientId || ev.clientId === form.client_id)
                    .map(ev => <option key={ev.id} value={ev.id}>{ev.title}{ev.clientId ? '' : ' (sans client)'}</option>)}
                </select>
                <p className="text-dark-500 text-xs mt-1">Si l'événement a déjà un prix en trésorerie, l'acceptation du devis mettra à jour cet encaissement.</p>
                {selectedEvent && (
                  <div className="bg-dark-700 rounded-xl p-3 mt-3 text-xs text-dark-300 space-y-1">
                    <p className="text-white font-medium">{selectedEvent.title}</p>
                    <p>{selectedEvent.date ? new Date(selectedEvent.date).toLocaleDateString('fr-FR') : '–'} · {selectedEvent.location || '–'}</p>
                    <p className="flex justify-between">
                      <span>Capacité : {selectedEvent.capacity ?? '–'} pers.</span>
                      <span className="text-gold-400 font-semibold">Prix : {Number(selectedEvent.price || 0).toLocaleString('fr-FR')} DT</span>
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Conditions</label>
                <textarea value={form.conditions} onChange={e => setForm(p => ({...p, conditions: e.target.value}))} rows={3} className="input-field resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1 py-2.5">Annuler</button>
              <button onClick={handleCreate} disabled={!form.client_id || saving} className="btn-gold flex-1 py-2.5 disabled:opacity-60">
                {saving ? 'Création...' : 'Créer le devis'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
