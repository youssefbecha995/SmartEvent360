import { useEffect, useState } from 'react';
import { Plus, Search, Check, X, RotateCcw, Clock, Inbox, Archive, User, Calendar, MapPin, Phone, Mail, Loader2, Trash2, Edit2 } from 'lucide-react';
import { crmApi } from '@/lib/crmApi';
import { usersApi } from '@/lib/neonApi';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';

const typeLabels: Record<string, string> = { 
  devis: 'Devis Conseil', 
  evenement: 'Événement', 
  technique: 'Technique', 
  autre: 'Autre' 
};

const statusColors: Record<string, { label: string; color: string }> = {
  planifie: { label: 'Planifié', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  confirme: { label: 'Confirmé', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  annule: { label: 'Annulé', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  termine: { label: 'Terminé', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

const lieuOptions = ['Visioconférence', 'Agence SmartEvent360', 'Téléphonique', 'Sur site'];

export default function AdminRendezVous() {
  const { success, error: toastError } = useToast();
  const [rdvs, setRdvs] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ 
    client_id: '', 
    titre: '', 
    date_heure: '', 
    duree_minutes: '30', 
    lieu: 'Visioconférence', 
    description: '' 
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [appts, reqs] = await Promise.all([
        crmApi.list('appointments'),
        crmApi.list('appointment_requests'),
      ]);
      appts.sort((a: any, b: any) => new Date(a.date_heure || 0).getTime() - new Date(b.date_heure || 0).getTime());
      setRdvs(appts);
      setRequests(reqs.filter((r: any) => r.statut === 'nouveau').sort((a: any, b: any) => 
        new Date(b.created_at || b.date_souhaitee || 0).getTime() - new Date(a.created_at || a.date_souhaitee || 0).getTime()
      ));
    } catch (e) {
      console.warn('[AdminRendezVous] échec du chargement API:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    usersApi.list().then(us => setClients(us)).catch(() => setClients([]));
  }, []);

  const clientName = (id: string | null) => {
    if (!id) return '–';
    const c = clients.find(cl => cl.id === id);
    return c ? c.name : '–';
  };

  const handleAcceptRequest = async (r: any) => {
    const dateHeure = `${r.date_souhaitee}T${r.heure_souhaitee}`;
    try {
      const appt = await crmApi.create('appointments', {
        titre: `${typeLabels[r.type_rdv] || 'Rendez-vous'} — ${r.prenom} ${r.nom}`,
        date_heure: dateHeure,
        duree_minutes: r.duree_minutes || 30,
        lieu: r.lieu || 'Visioconférence',
        description: [r.message, `Contact : ${r.email}${r.telephone ? ' · ' + r.telephone : ''}`].filter(Boolean).join('\n'),
        client_id: null,
        statut: 'planifie',
      });
      await crmApi.update('appointment_requests', r.id, { statut: 'traite', appointment_id: appt?.id || null });
      success('Demande acceptée', `Rendez-vous créé`);
      setRequests(prev => prev.filter(x => x.id !== r.id));
      load();
    } catch (e) {
      toastError('Erreur', 'Impossible d\'accepter la demande');
    }
  };

  const handleArchiveRequest = async (id: string) => {
    try {
      await crmApi.update('appointment_requests', id, { statut: 'archive' });
      setRequests(prev => prev.filter(x => x.id !== id));
      success('Demande archivée');
    } catch (e) {
      toastError('Erreur', 'Impossible d\'archiver la demande');
    }
  };

  const handleSave = async () => {
    if (!form.titre.trim() || !form.date_heure) {
      toastError('Erreur', 'Le titre et la date sont requis');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await crmApi.update('appointments', editingId, { 
          ...form, 
          client_id: form.client_id || null, 
          duree_minutes: parseInt(form.duree_minutes) 
        });
        success('Rendez-vous modifié');
      } else {
        await crmApi.create('appointments', { 
          ...form, 
          client_id: form.client_id || null, 
          duree_minutes: parseInt(form.duree_minutes), 
          statut: 'planifie' 
        });
        success('Rendez-vous créé');
      }
      setShowModal(false);
      setEditingId(null);
      setForm({ client_id: '', titre: '', date_heure: '', duree_minutes: '30', lieu: 'Visioconférence', description: '' });
      load();
    } catch (e) {
      toastError('Erreur', 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      client_id: r.client_id || '',
      titre: r.titre,
      date_heure: r.date_heure?.slice(0, 16) || '',
      duree_minutes: String(r.duree_minutes || 30),
      lieu: r.lieu || 'Visioconférence',
      description: r.description || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce rendez-vous ?')) return;
    try {
      await crmApi.delete('appointments', id);
      setRdvs(prev => prev.filter(r => r.id !== id));
      success('Rendez-vous supprimé');
    } catch (e) {
      toastError('Erreur', 'Impossible de supprimer');
    }
  };

  const handleStatus = async (id: string, statut: string) => {
    try {
      await crmApi.update('appointments', id, { statut });
      setRdvs(prev => prev.map(r => r.id === id ? { ...r, statut } : r));
      success(`Statut mis à jour : ${statusColors[statut]?.label || statut}`);
    } catch (e) {
      toastError('Erreur', 'Impossible de changer le statut');
    }
  };

  const filtered = rdvs.filter(r =>
    `${r.titre} ${clientName(r.client_id)} ${r.lieu}`.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const st = statusColors[status] || { label: status, color: 'bg-dark-700 text-dark-300 border-dark-600' };
    return <span className={`badge border text-xs ${st.color}`}>{st.label}</span>;
  };

  return (
    <div>
      <PageHeader 
        title="Gestion des Rendez-vous" 
        subtitle={`${rdvs.length} rendez-vous`}
        action={
          <button 
            onClick={() => { setEditingId(null); setForm({ client_id: '', titre: '', date_heure: '', duree_minutes: '30', lieu: 'Visioconférence', description: '' }); setShowModal(true); }} 
            className="btn-gold py-2 px-4 text-sm flex items-center gap-2"
          >
            <Plus size={15} />Nouveau
          </button>
        } 
      />

      {/* ─── Demandes visiteurs ─── */}
      {requests.length > 0 && (
        <div className="glass rounded-2xl p-5 mb-6 border border-gold-500/20">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <Inbox size={16} className="text-gold-400" /> Demandes visiteurs
            <span className="badge bg-gold-500/20 text-gold-400 border border-gold-500/30 text-xs">{requests.length}</span>
          </h3>
          <div className="space-y-2">
            {requests.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-dark-700 rounded-xl px-4 py-3 gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white text-sm font-medium">
                      {r.civilite} {r.prenom} {r.nom}
                    </p>
                    <span className="badge bg-gold-500/20 text-gold-400 border border-gold-500/30 text-[10px]">
                      {typeLabels[r.type_rdv] || r.type_rdv}
                    </span>
                  </div>
                  <p className="text-dark-400 text-xs truncate flex items-center gap-2 flex-wrap">
                    <Calendar size={10} />
                    {new Date(r.date_souhaitee).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    à {r.heure_souhaitee?.slice(0, 5)}
                    <MapPin size={10} /> {r.lieu || '—'}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-dark-500 mt-1">
                    {r.email && <span className="flex items-center gap-1"><Mail size={10} /> {r.email}</span>}
                    {r.telephone && <span className="flex items-center gap-1"><Phone size={10} /> {r.telephone}</span>}
                  </div>
                  {r.message && <p className="text-dark-500 text-xs mt-1 truncate">"{r.message}"</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button 
                    onClick={() => handleAcceptRequest(r)} 
                    className="btn-gold py-1.5 px-3 text-xs flex items-center gap-1"
                  >
                    <Check size={12} /> Accepter
                  </button>
                  <button 
                    onClick={() => handleArchiveRequest(r.id)} 
                    className="border border-dark-500 text-dark-300 hover:text-white py-1.5 px-3 rounded-lg text-xs transition-all flex items-center gap-1"
                  >
                    <Archive size={12} /> Archiver
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Recherche ─── */}
      <div className="relative max-w-xs mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="input-field pl-9 py-2.5 text-sm w-full" 
          placeholder="Rechercher un rendez-vous..." 
        />
      </div>

      {/* ─── Tableau ─── */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Titre', 'Client', 'Date / Heure', 'Lieu', 'Durée', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 text-dark-400 text-xs font-medium uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td colSpan={7}><div className="h-10 bg-dark-700 rounded animate-pulse m-4" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-dark-400">
                    <Calendar size={32} className="mx-auto mb-2 text-dark-600" />
                    Aucun rendez-vous trouvé
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-4">
                      <p className="text-white text-sm font-medium">{r.titre}</p>
                      {r.description && <p className="text-dark-500 text-xs truncate max-w-48">{r.description}</p>}
                    </td>
                    <td className="px-4 py-4 text-dark-300 text-sm">
                      {clientName(r.client_id)}
                    </td>
                    <td className="px-4 py-4 text-dark-300 text-sm">
                      {new Date(r.date_heure).toLocaleString('fr-FR', { 
                        day: '2-digit', month: '2-digit', year: '2-digit', 
                        hour: '2-digit', minute: '2-digit' 
                      })}
                    </td>
                    <td className="px-4 py-4 text-dark-300 text-sm flex items-center gap-1">
                      <MapPin size={12} className="text-dark-400" />
                      {r.lieu || '—'}
                    </td>
                    <td className="px-4 py-4 text-dark-300 text-sm">{r.duree_minutes} min</td>
                    <td className="px-4 py-4">{getStatusBadge(r.statut)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        {r.statut === 'planifie' && (
                          <button 
                            onClick={() => handleStatus(r.id, 'confirme')} 
                            className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-all" 
                            title="Confirmer"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        {(r.statut === 'planifie' || r.statut === 'confirme') && (
                          <button 
                            onClick={() => handleStatus(r.id, 'annule')} 
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all" 
                            title="Annuler"
                          >
                            <X size={14} />
                          </button>
                        )}
                        {r.statut === 'confirme' && (
                          <button 
                            onClick={() => handleStatus(r.id, 'termine')} 
                            className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 transition-all" 
                            title="Terminer"
                          >
                            <Clock size={14} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleEdit(r)} 
                          className="p-1.5 rounded-lg text-dark-400 hover:text-gold-400 hover:bg-gold-500/10 transition-all" 
                          title="Modifier"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(r.id)} 
                          className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all" 
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL : Nouveau/Modifier rendez-vous ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-md w-full z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 bg-dark-800 z-10 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">
                {editingId ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-dark-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Titre *</label>
                <input 
                  value={form.titre} 
                  onChange={e => setForm(p => ({ ...p, titre: e.target.value }))} 
                  className="input-field w-full" 
                  placeholder="Briefing technique" 
                />
              </div>

              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Client</label>
                <select 
                  value={form.client_id} 
                  onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))} 
                  className="input-field w-full"
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Date & Heure *</label>
                  <input 
                    type="datetime-local" 
                    value={form.date_heure} 
                    onChange={e => setForm(p => ({ ...p, date_heure: e.target.value }))} 
                    className="input-field w-full" 
                  />
                </div>
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Durée</label>
                  <select 
                    value={form.duree_minutes} 
                    onChange={e => setForm(p => ({ ...p, duree_minutes: e.target.value }))} 
                    className="input-field w-full"
                  >
                    {[15, 30, 45, 60, 90, 120].map(d => (
                      <option key={d} value={d}>{d} min</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Lieu</label>
                <select 
                  value={form.lieu} 
                  onChange={e => setForm(p => ({ ...p, lieu: e.target.value }))} 
                  className="input-field w-full"
                >
                  {lieuOptions.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Description</label>
                <textarea 
                  value={form.description} 
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} 
                  rows={3} 
                  className="input-field w-full resize-none" 
                  placeholder="Détails du rendez-vous..." 
                />
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-white/10 sticky bottom-0 bg-dark-800 rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="btn-ghost flex-1 py-2.5">
                Annuler
              </button>
              <button 
                onClick={handleSave} 
                disabled={!form.titre || !form.date_heure || saving} 
                className="btn-gold flex-1 py-2.5 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  editingId ? '💾 Enregistrer' : '✨ Planifier'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}