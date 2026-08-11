import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, User, CalendarDays } from 'lucide-react';
import { usersApi, eventsApi, NeonUser } from '@/lib/neonApi';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

const tabs = [
  { key: 'profil', label: 'Profil', icon: User },
  { key: 'historique', label: 'Historique', icon: CalendarDays },
] as const;

const typeOptions = [
  { value: '', label: 'Non renseigné' },
  { value: 'particulier', label: 'Particulier' },
  { value: 'professionnel', label: 'Professionnel' },
  { value: 'association', label: 'Association' },
];

export default function AdminClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<typeof tabs[number]['key']>('profil');
  const [client, setClient] = useState<NeonUser | null>(null);
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      usersApi.get(id),
      eventsApi.list({ limit: 200 }).then(r => r.data).catch(() => []),
    ]).then(([u, ev]) => {
      setClient(u);
      setForm(u);
      setEvents((ev || []).filter((e: any) => e.organizerId === id));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!form || !id) return;
    setSaving(true);
    try {
      const upd = await usersApi.update(id, {
        nom: form.nom || null, prenom: form.prenom || null,
        name: [form.prenom, form.nom].filter(Boolean).join(' ').trim() || form.name,
        email: form.email, role: form.role,
        profession: form.profession || null,
        phone: form.phone || null, phone2: form.phone2 || null,
        email2: form.email2 || null,
        address: form.address || null, city: form.city || null, postalCode: form.postalCode || null,
        company: form.company || null, cin: form.cin || null, matfisc: form.matfisc || null,
        notes: form.notes || null, clientType: form.clientType || null,
      });
      setClient(upd);
      setForm(upd);
      setMessage('Client mis à jour ✓');
    } catch (e: any) {
      setMessage('Erreur lors de la mise à jour.');
      console.error(e);
    } finally {
      setSaving(false);
    }
    setTimeout(() => setMessage(''), 2500);
  };

  if (loading || !form) return <div className="glass rounded-2xl h-64 animate-pulse" />;
  if (!client) return <div className="text-dark-400">Client introuvable.</div>;

  return (
    <div>
      <button onClick={() => navigate('/admin/clients')} className="flex items-center gap-1.5 text-dark-400 hover:text-white text-sm mb-4">
        <ArrowLeft size={15} /> Retour aux clients
      </button>

      <div className="glass rounded-2xl p-6 mb-6 flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center text-dark-200 font-bold text-lg">
            {(client.name || 'C').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{[client.prenom, client.nom].filter(Boolean).join(' ') || client.name}</h1>
            <p className="text-dark-400 text-sm">{client.email} {client.phone ? `· ${client.phone}` : ''}</p>
          </div>
        </div>
        <StatusBadge status={client.clientType || client.role} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="kpi-card"><p className="text-dark-400 text-xs mb-1">Événements</p><p className="text-xl font-bold text-white">{events.length}</p></div>
        <div className="kpi-card"><p className="text-dark-400 text-xs mb-1">Type</p><p className="text-xl font-bold text-white capitalize">{client.clientType || '–'}</p></div>
        <div className="kpi-card"><p className="text-dark-400 text-xs mb-1">Rôle</p><p className="text-xl font-bold text-white">{client.role}</p></div>
        <div className="kpi-card"><p className="text-dark-400 text-xs mb-1">Inscrit le</p><p className="text-xl font-bold text-white">{new Date(client.createdAt).toLocaleDateString('fr-FR')}</p></div>
      </div>

      {message && <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-xl px-4 py-2.5">{message}</div>}

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'profil' && (
        <div className="glass rounded-2xl p-6 space-y-4 max-w-3xl">
          <div className="grid grid-cols-2 gap-4">
            {[['nom', 'Nom'], ['prenom', 'Prénom']].map(([key, label]) => (
              <div key={key}>
                <label className="text-dark-300 text-sm mb-1.5 block">{label}</label>
                <input value={form[key] || ''} onChange={e => setForm((p: any) => ({ ...p, [key]: e.target.value }))} className="input-field" />
              </div>
            ))}
            <div className="col-span-2">
              <label className="text-dark-300 text-sm mb-1.5 block">Profession</label>
              <input value={form.profession || ''} onChange={e => setForm((p: any) => ({ ...p, profession: e.target.value }))} className="input-field" />
            </div>
            {[['email', 'Email'], ['email2', '2e email'], ['phone', 'Téléphone'], ['phone2', 'Téléphone 2']].map(([key, label]) => (
              <div key={key}>
                <label className="text-dark-300 text-sm mb-1.5 block">{label}</label>
                <input value={form[key] || ''} onChange={e => setForm((p: any) => ({ ...p, [key]: e.target.value }))} className="input-field" />
              </div>
            ))}
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Type de client</label>
              <select value={form.clientType || ''} onChange={e => setForm((p: any) => ({ ...p, clientType: e.target.value }))} className="input-field">
                {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Rôle</label>
              <select value={form.role} onChange={e => setForm((p: any) => ({ ...p, role: e.target.value }))} className="input-field">
                <option value="USER">Client</option>
                <option value="ORGANIZER">Organisateur</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Société</label>
              <input value={form.company || ''} onChange={e => setForm((p: any) => ({ ...p, company: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">CIN</label>
              <input value={form.cin || ''} onChange={e => setForm((p: any) => ({ ...p, cin: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Matricule fiscal</label>
              <input value={form.matfisc || ''} onChange={e => setForm((p: any) => ({ ...p, matfisc: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Code postal</label>
              <input value={form.postalCode || ''} onChange={e => setForm((p: any) => ({ ...p, postalCode: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Ville</label>
              <input value={form.city || ''} onChange={e => setForm((p: any) => ({ ...p, city: e.target.value }))} className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="text-dark-300 text-sm mb-1.5 block">Adresse</label>
              <input value={form.address || ''} onChange={e => setForm((p: any) => ({ ...p, address: e.target.value }))} className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="text-dark-300 text-sm mb-1.5 block">Notes internes</label>
              <textarea value={form.notes || ''} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} rows={3} className="input-field resize-none" />
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-gold py-2.5 px-6 flex items-center gap-2 disabled:opacity-60">
            <Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      )}

      {tab === 'historique' && (
        <div className="glass rounded-2xl overflow-hidden max-w-4xl">
          {events.length === 0 ? <p className="text-dark-400 text-sm text-center py-10">Aucun événement pour ce client.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-dark-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Événement</th><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Lieu</th><th className="text-right px-4 py-3">Prix</th>
              </tr></thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id} className="border-b border-white/5 hover:bg-white/3 cursor-pointer" onClick={() => navigate(`/admin/evenements/${ev.id}`)}>
                    <td className="px-4 py-3 text-white">{ev.title}</td>
                    <td className="px-4 py-3 text-dark-300">{new Date(ev.date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3 text-dark-300">{ev.location}</td>
                    <td className="px-4 py-3 text-right text-white font-medium">{ev.price > 0 ? `${ev.price} DT` : 'Gratuit'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
