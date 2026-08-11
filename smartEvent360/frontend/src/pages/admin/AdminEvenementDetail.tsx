import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Users, Package, Wallet, MessageSquare, ClipboardList } from 'lucide-react';
import { eventsApi, usersApi, NeonUser } from '@/lib/neonApi';
import { crmApi } from '@/lib/crmApi';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

const tabs = [
  { key: 'resume', label: 'Résumé', icon: ClipboardList },
  { key: 'equipe', label: 'Équipe', icon: Users },
  { key: 'materiel', label: 'Matériel', icon: Package },
  { key: 'budget', label: 'Budget', icon: Wallet },
  { key: 'commentaires', label: 'Commentaires', icon: MessageSquare },
] as const;

export default function AdminEvenementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<typeof tabs[number]['key']>('resume');
  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Résumé form
  const [form, setForm] = useState<any>(null);

  // Équipe
  const [team, setTeam] = useState<any[]>([]);
  const [personnelList, setPersonnelList] = useState<any[]>([]);
  const [newPersonnelId, setNewPersonnelId] = useState('');
  const [newRole, setNewRole] = useState('');

  // Matériel
  const [equipmentAssigned, setEquipmentAssigned] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [newEquipmentId, setNewEquipmentId] = useState('');
  const [newQty, setNewQty] = useState(1);

  // Budget
  const [payments, setPayments] = useState<any[]>([]);

  // Commentaires
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  // Clients (noms)
  const [users, setUsers] = useState<NeonUser[]>([]);

  const load = () => {
    if (!id) return;
    Promise.all([
      eventsApi.get(id),
      crmApi.list('event_personnel'),
      crmApi.list('personnel'),
      crmApi.list('event_equipment'),
      crmApi.list('equipment'),
      crmApi.list('incomes'),
      crmApi.list('event_comments'),
      usersApi.list(),
    ]).then(([ev, ep, pl, ee, el, inc, ec, us]) => {
      const personnelMap = Object.fromEntries((pl || []).map((p: any) => [p.id, p]));
      const equipmentMap = Object.fromEntries((el || []).map((e: any) => [e.id, e]));
      const teamRows = (ep || []).filter((r: any) => r.event_id === id).map((r: any) => ({
        ...r,
        personnel: personnelMap[r.personnel_id] || null,
      }));
      const equipRows = (ee || []).filter((r: any) => r.event_id === id).map((r: any) => ({
        ...r,
        equipment: equipmentMap[r.equipment_id] || null,
      }));
      const paymentsRows = (inc || []).filter((r: any) => r.event_id === id);
      setEvent(ev);
      setForm(ev ? {
        title: ev.title,
        description: ev.description || '',
        location: ev.location,
        date: ev.date?.slice(0, 16) || '',
        imageUrl: ev.imageUrl || '',
        capacity: ev.capacity,
        price: ev.price ?? 0,
        clientId: ev.clientId || '',
        isPublished: ev.isPublished,
      } : null);
      setTeam(teamRows);
      setPersonnelList(pl || []);
      setEquipmentAssigned(equipRows);
      setEquipmentList(el || []);
      setPayments(paymentsRows);
      setComments((ec || []).filter((c: any) => c.event_id === id));
      setUsers(us || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const flash = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 2500); };

  const clientName = event?.clientId
    ? (() => {
        const u = users.find(x => x.id === event.clientId);
        return u ? [u.prenom, u.nom, u.name].filter(Boolean).join(' ') || u.email : '';
      })()
    : '';

  const handleSaveResume = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await eventsApi.update(id as string, {
        title: form.title,
        description: form.description || null,
        location: form.location,
        date: form.date,
        imageUrl: form.imageUrl || null,
        capacity: Number(form.capacity),
        price: Number(form.price) || 0,
        clientId: form.clientId || null,
        isPublished: form.isPublished,
      });
      flash('Événement mis à jour ✓');
      setEvent((p: any) => ({ ...p, ...form }));
    } catch (e: any) {
      setMessage(e.message);
      setTimeout(() => setMessage(''), 2500);
    } finally {
      setSaving(false);
    }
  };

  const addTeamMember = async () => {
    if (!newPersonnelId || !id) return;
    const created = await crmApi.create('event_personnel', { event_id: id, personnel_id: newPersonnelId, role_event: newRole || null });
    const personnel = personnelList.find((p: any) => p.id === newPersonnelId) || null;
    setTeam(prev => [...prev, { ...created, personnel }]);
    setNewPersonnelId(''); setNewRole('');
  };

  const removeTeamMember = async (rowId: string) => {
    await crmApi.delete('event_personnel', rowId);
    setTeam(prev => prev.filter(t => t.id !== rowId));
  };

  const addEquipment = async () => {
    if (!newEquipmentId || !id) return;
    const created = await crmApi.create('event_equipment', { event_id: id, equipment_id: newEquipmentId, quantite: newQty });
    const equipment = equipmentList.find((e: any) => e.id === newEquipmentId) || null;
    setEquipmentAssigned(prev => [...prev, { ...created, equipment }]);
    setNewEquipmentId(''); setNewQty(1);
  };

  const removeEquipment = async (rowId: string) => {
    await crmApi.delete('event_equipment', rowId);
    setEquipmentAssigned(prev => prev.filter(e => e.id !== rowId));
  };

  const addComment = async () => {
    if (!newComment.trim() || !id) return;
    const entry = { text: newComment.trim(), date: new Date().toISOString(), author: 'Admin' };
    const created = await crmApi.create('event_comments', { event_id: id, ...entry });
    setComments(prev => [created, ...prev]);
    setNewComment('');
  };

  const payStatus = (s?: string) => {
    if (s === 'paye' || s === 'confirme') return 'confirme';
    if (s === 'attente' || s === 'en_attente') return 'en_attente';
    return s || '';
  };
  const totalPaid = payments.filter(p => ['paye', 'confirme'].includes(p.statut)).reduce((a, b) => a + b.montant, 0);
  const totalDue = payments.filter(p => ['attente', 'en_attente'].includes(p.statut)).reduce((a, b) => a + b.montant, 0);
  const budget = event?.price || 0;

  if (loading) return <div className="glass rounded-2xl h-64 animate-pulse" />;
  if (!event) return <div className="text-dark-400">Événement introuvable.</div>;

  return (
    <div>
      <button onClick={() => navigate('/admin/evenements')} className="flex items-center gap-1.5 text-dark-400 hover:text-white text-sm mb-4">
        <ArrowLeft size={15} /> Retour aux événements
      </button>

      <PageHeader
        title={`📅 ${event.title}`}
        subtitle={clientName || event.location}
        action={
          <span className={`badge border text-xs px-2 py-0.5 ${event.isPublished ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-dark-700 text-dark-400 border-dark-600'}`}>
            {event.isPublished ? 'Publié' : 'Non publié'}
          </span>
        }
      />

      {message && <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-xl px-4 py-2.5">{message}</div>}

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'resume' && form && (
        <div className="glass rounded-2xl p-6 space-y-4 max-w-3xl">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-dark-300 text-sm mb-1.5 block">Titre *</label>
              <input value={form.title} onChange={e => setForm((p: any) => ({ ...p, title: e.target.value }))} className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="text-dark-300 text-sm mb-1.5 block">Client</label>
              <select value={form.clientId} onChange={e => setForm((p: any) => ({ ...p, clientId: e.target.value }))} className="input-field">
                <option value="">— Aucun client —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{[u.prenom, u.nom, u.name].filter(Boolean).join(' ') || u.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Lieu *</label>
              <input value={form.location} onChange={e => setForm((p: any) => ({ ...p, location: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Date & heure *</label>
              <input type="datetime-local" value={form.date} onChange={e => setForm((p: any) => ({ ...p, date: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Capacité *</label>
              <input type="number" min={1} value={form.capacity} onChange={e => setForm((p: any) => ({ ...p, capacity: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Prix (DT)</label>
              <input type="number" min={0} value={form.price} onChange={e => setForm((p: any) => ({ ...p, price: e.target.value }))} className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="text-dark-300 text-sm mb-1.5 block">Image URL</label>
              <input value={form.imageUrl || ''} onChange={e => setForm((p: any) => ({ ...p, imageUrl: e.target.value }))} className="input-field" placeholder="https://..." />
            </div>
            <div className="col-span-2">
              <label className="text-dark-300 text-sm mb-1.5 block">Description</label>
              <textarea value={form.description || ''} onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))} rows={4} className="input-field resize-none" />
            </div>
            <div className="col-span-2 flex items-center gap-3 p-3 bg-dark-700 rounded-xl">
              <button type="button" onClick={() => setForm((p: any) => ({ ...p, isPublished: !p.isPublished }))}
                className={`relative w-11 h-6 rounded-full transition-all ${form.isPublished ? 'bg-gold-500' : 'bg-dark-600'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.isPublished ? 'left-6' : 'left-1'}`} />
              </button>
              <span className="text-dark-200 text-sm">Publié (visible côté client)</span>
            </div>
          </div>
          <button onClick={handleSaveResume} disabled={saving} className="btn-gold py-2.5 px-6 flex items-center gap-2 disabled:opacity-60">
            <Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      )}

      {tab === 'equipe' && (
        <div className="glass rounded-2xl p-6 max-w-3xl">
          <div className="flex flex-wrap gap-3 mb-5">
            <select value={newPersonnelId} onChange={e => setNewPersonnelId(e.target.value)} className="input-field flex-1 min-w-[200px]">
              <option value="">Sélectionner un membre du personnel</option>
              {personnelList.filter(p => !team.some(t => t.personnel_id === p.id)).map(p => (
                <option key={p.id} value={p.id}>{p.prenom} {p.nom} · {p.fonction} {p.disponibilite !== 'disponible' ? `(${p.disponibilite})` : ''}</option>
              ))}
            </select>
            <input value={newRole} onChange={e => setNewRole(e.target.value)} className="input-field w-40" placeholder="Rôle (optionnel)" />
            <button onClick={addTeamMember} disabled={!newPersonnelId} className="btn-gold px-4 flex items-center gap-2 disabled:opacity-60"><Plus size={15} /> Ajouter</button>
          </div>
          {team.length === 0 ? (
            <p className="text-dark-400 text-sm text-center py-6">Aucun membre assigné à cet événement.</p>
          ) : (
            <div className="space-y-2">
              {team.map(t => (
                <div key={t.id} className="flex items-center justify-between bg-dark-700 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">{t.personnel?.prenom} {t.personnel?.nom}</p>
                    <p className="text-dark-400 text-xs">{t.role_event || t.personnel?.fonction}</p>
                  </div>
                  <button onClick={() => removeTeamMember(t.id)} className="text-dark-500 hover:text-red-400 p-1.5"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'materiel' && (
        <div className="glass rounded-2xl p-6 max-w-3xl">
          <div className="flex flex-wrap gap-3 mb-5">
            <select value={newEquipmentId} onChange={e => setNewEquipmentId(e.target.value)} className="input-field flex-1 min-w-[200px]">
              <option value="">Sélectionner un équipement</option>
              {equipmentList.filter(e => !equipmentAssigned.some(a => a.equipment_id === e.id)).map(e => (
                <option key={e.id} value={e.id}>{e.nom} · {e.categorie} {e.disponibilite !== 'disponible' ? `(${e.disponibilite})` : ''}</option>
              ))}
            </select>
            <input type="number" min={1} value={newQty} onChange={e => setNewQty(parseInt(e.target.value) || 1)} className="input-field w-24" />
            <button onClick={addEquipment} disabled={!newEquipmentId} className="btn-gold px-4 flex items-center gap-2 disabled:opacity-60"><Plus size={15} /> Réserver</button>
          </div>
          {equipmentAssigned.length === 0 ? (
            <p className="text-dark-400 text-sm text-center py-6">Aucun équipement réservé pour cet événement.</p>
          ) : (
            <div className="space-y-2">
              {equipmentAssigned.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-dark-700 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">{a.equipment?.nom}</p>
                    <p className="text-dark-400 text-xs">{a.equipment?.categorie} · Qté {a.quantite}</p>
                  </div>
                  <button onClick={() => removeEquipment(a.id)} className="text-dark-500 hover:text-red-400 p-1.5"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'budget' && (
        <div className="glass rounded-2xl p-6 max-w-3xl">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="kpi-card"><p className="text-dark-400 text-xs mb-1">Budget total</p><p className="text-2xl font-bold text-white">{budget.toLocaleString('fr-FR')} DT</p></div>
            <div className="kpi-card"><p className="text-dark-400 text-xs mb-1">Payé</p><p className="text-2xl font-bold text-green-400">{totalPaid.toLocaleString('fr-FR')} DT</p></div>
            <div className="kpi-card"><p className="text-dark-400 text-xs mb-1">En attente</p><p className="text-2xl font-bold text-yellow-400">{totalDue.toLocaleString('fr-FR')} DT</p></div>
          </div>
          {payments.length === 0 ? (
            <p className="text-dark-400 text-sm text-center py-6">Aucune transaction enregistrée pour cet événement.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-dark-400 text-xs">
                <th className="text-left py-2">Description</th><th className="text-left py-2">Type</th><th className="text-right py-2">Montant</th><th className="text-right py-2">Statut</th>
              </tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b border-white/5">
                    <td className="py-2.5 text-dark-200">{p.description || '–'}</td>
                    <td className="py-2.5 text-dark-300 capitalize">{p.type_paiement || p.type}</td>
                    <td className="py-2.5 text-right text-white font-medium">{p.montant.toLocaleString('fr-FR')} DT</td>
                    <td className="py-2.5 text-right"><StatusBadge status={payStatus(p.statut)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'commentaires' && (
        <div className="glass rounded-2xl p-6 max-w-3xl">
          <div className="flex gap-3 mb-5">
            <input value={newComment} onChange={e => setNewComment(e.target.value)} className="input-field flex-1" placeholder="Ajouter un commentaire interne..."
              onKeyDown={e => { if (e.key === 'Enter') addComment(); }} />
            <button onClick={addComment} disabled={!newComment.trim()} className="btn-gold px-5 disabled:opacity-60">Publier</button>
          </div>
          {comments.length === 0 ? (
            <p className="text-dark-400 text-sm text-center py-6">Aucun commentaire pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c, i) => (
                <div key={c.id || i} className="bg-dark-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium">{c.author}</span>
                    <span className="text-dark-500 text-xs">{new Date(c.date).toLocaleString('fr-FR')}</span>
                  </div>
                  <p className="text-dark-200 text-sm">{c.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
