import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, User, CalendarDays, FileText, CreditCard,
  Phone, Calendar, Mail, MapPin, Building, Briefcase, Clock,
  CheckCircle, XCircle, Eye, Edit2, Trash2, Plus, Loader2,
  Users, MessageSquare, Activity, Wallet, DollarSign, PieChart,
  TrendingUp, AlertCircle
} from 'lucide-react';
import { usersApi, eventsApi, NeonUser } from '@/lib/neonApi';
import { crmApi } from '@/lib/crmApi';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatPrice } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';

const tabs = [
  { key: 'profil', label: 'Profil', icon: User },
  { key: 'historique', label: 'Historique', icon: CalendarDays },
  { key: 'devis', label: 'Devis', icon: FileText },
  { key: 'paiements', label: 'Paiements', icon: CreditCard },
  { key: 'rendezvous', label: 'Rendez-vous', icon: Calendar },
  { key: 'appels', label: 'Appels', icon: Phone },
] as const;

const typeOptions = [
  { value: '', label: 'Non renseigné' },
  { value: 'particulier', label: 'Particulier' },
  { value: 'professionnel', label: 'Professionnel' },
  { value: 'association', label: 'Association' },
];

const statusColors: Record<string, { label: string; color: string }> = {
  brouillon: { label: 'Brouillon', color: 'bg-dark-600 text-dark-400 border-dark-600' },
  envoye: { label: 'Envoyé', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  accepte: { label: 'Accepté', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  refuse: { label: 'Refusé', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export default function AdminClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [tab, setTab] = useState<typeof tabs[number]['key']>('profil');
  const [client, setClient] = useState<NeonUser | null>(null);
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Données liées
  const [events, setEvents] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);

  // Stats client
  const [clientStats, setClientStats] = useState({
    totalSpent: 0,
    totalEvents: 0,
    totalQuotes: 0,
    acceptedQuotes: 0,
    totalCalls: 0,
    totalAppointments: 0,
  });

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [u, ev, qs, pm, ap, ca] = await Promise.all([
          usersApi.get(id),
          eventsApi.list({ limit: 200 }).then(r => r.data).catch(() => []),
          crmApi.list('quotes').catch(() => []),
          crmApi.list('incomes').catch(() => []),
          crmApi.list('appointments').catch(() => []),
          crmApi.list('calls').catch(() => []),
        ]);

        setClient(u);
        setForm(u);

        // Filtrer les données du client
        const clientEvents = (ev || []).filter((e: any) => e.clientId === id || e.organizerId === id);
        const clientQuotes = (qs || []).filter((q: any) => q.client_id === id);
        const clientPayments = (pm || []).filter((p: any) => p.client_id === id);
        const clientAppointments = (ap || []).filter((a: any) => a.client_id === id);
        const clientCalls = (ca || []).filter((c: any) => c.client_id === id);

        setEvents(clientEvents);
        setQuotes(clientQuotes);
        setPayments(clientPayments);
        setAppointments(clientAppointments);
        setCalls(clientCalls);

        // Statistiques
        const totalSpent = clientPayments
          .filter((p: any) => p.statut === 'paye' || p.statut === 'confirme')
          .reduce((sum: number, p: any) => sum + (Number(p.montant) || 0), 0);

        setClientStats({
          totalSpent,
          totalEvents: clientEvents.length,
          totalQuotes: clientQuotes.length,
          acceptedQuotes: clientQuotes.filter((q: any) => q.statut === 'accepte').length,
          totalCalls: clientCalls.length,
          totalAppointments: clientAppointments.length,
        });

      } catch (e: any) {
        toastError('Erreur', e.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleSave = async () => {
    if (!form || !id) return;
    setSaving(true);
    try {
      const upd = await usersApi.update(id, {
        nom: form.nom || null,
        prenom: form.prenom || null,
        name: [form.prenom, form.nom].filter(Boolean).join(' ').trim() || form.name,
        email: form.email,
        role: form.role,
        profession: form.profession || null,
        phone: form.phone || null,
        phone2: form.phone2 || null,
        email2: form.email2 || null,
        address: form.address || null,
        city: form.city || null,
        postalCode: form.postalCode || null,
        company: form.company || null,
        cin: form.cin || null,
        matfisc: form.matfisc || null,
        notes: form.notes || null,
        clientType: form.clientType || null,
      });
      setClient(upd);
      setForm(upd);
      setMessage('Client mis à jour ✓');
      success('Client mis à jour');
    } catch (e: any) {
      setMessage('Erreur lors de la mise à jour.');
      toastError('Erreur', e.message);
    } finally {
      setSaving(false);
    }
    setTimeout(() => setMessage(''), 2500);
  };

  const getStatusBadge = (status: string) => {
    const st = statusColors[status] || { label: status, color: 'bg-dark-600 text-dark-400' };
    return <span className={`badge border text-xs ${st.color}`}>{st.label}</span>;
  };

  if (loading || !form) return <div className="glass rounded-2xl h-64 animate-pulse" />;
  if (!client) return <div className="text-dark-400">Client introuvable.</div>;

  return (
    <div>
      <button
        onClick={() => navigate('/admin/clients')}
        className="flex items-center gap-1.5 text-dark-400 hover:text-white text-sm mb-4"
      >
        <ArrowLeft size={15} /> Retour aux clients
      </button>

      {/* ─── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-6 mb-6 flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center text-dark-200 font-bold text-2xl">
            {(client.name || 'C').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {[client.prenom, client.nom].filter(Boolean).join(' ') || client.name}
            </h1>
            <p className="text-dark-400 text-sm flex items-center gap-2 flex-wrap">
              <Mail size={14} /> {client.email}
              {client.phone && (
                <>
                  <span className="text-dark-500">·</span>
                  <Phone size={14} /> {client.phone}
                </>
              )}
              {client.city && (
                <>
                  <span className="text-dark-500">·</span>
                  <MapPin size={14} /> {client.city}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={client.clientType || client.role} />
          <span className={`badge border text-xs ${client.active !== false ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
            {client.active !== false ? '✅ Actif' : '❌ Inactif'}
          </span>
        </div>
      </div>

      {/* ─── STATS ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Événements', value: clientStats.totalEvents, icon: CalendarDays, color: 'text-green-400' },
          { label: 'Dépenses', value: formatPrice(clientStats.totalSpent), icon: DollarSign, color: 'text-gold-400' },
          { label: 'Devis', value: clientStats.totalQuotes, icon: FileText, color: 'text-blue-400' },
          { label: 'Acceptés', value: clientStats.acceptedQuotes, icon: CheckCircle, color: 'text-green-400' },
          { label: 'Rendez-vous', value: clientStats.totalAppointments, icon: Calendar, color: 'text-purple-400' },
          { label: 'Appels', value: clientStats.totalCalls, icon: Phone, color: 'text-cyan-400' },
        ].map((item, i) => (
          <div key={i} className="glass rounded-xl p-3 text-center">
            <div className={`${item.color} flex items-center justify-center gap-1 text-xs mb-1`}>
              <item.icon size={14} /> {item.label}
            </div>
            <div className="text-white font-bold text-lg">{item.value}</div>
          </div>
        ))}
      </div>

      {message && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-xl px-4 py-2.5">
          {message}
        </div>
      )}

      {/* ─── TABS ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white'
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ─── TAB: PROFIL ────────────────────────────────────────────────────── */}
      {tab === 'profil' && (
        <div className="glass rounded-2xl p-6 space-y-4 max-w-3xl">
          <div className="grid grid-cols-2 gap-4">
            {[['nom', 'Nom'], ['prenom', 'Prénom']].map(([key, label]) => (
              <div key={key}>
                <label className="text-dark-300 text-sm mb-1.5 block">{label}</label>
                <input
                  value={form[key] || ''}
                  onChange={e => setForm((p: any) => ({ ...p, [key]: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="text-dark-300 text-sm mb-1.5 block">Profession</label>
              <input
                value={form.profession || ''}
                onChange={e => setForm((p: any) => ({ ...p, profession: e.target.value }))}
                className="input-field w-full"
              />
            </div>
            {[['email', 'Email'], ['email2', '2e email'], ['phone', 'Téléphone'], ['phone2', 'Téléphone 2']].map(([key, label]) => (
              <div key={key}>
                <label className="text-dark-300 text-sm mb-1.5 block">{label}</label>
                <input
                  value={form[key] || ''}
                  onChange={e => setForm((p: any) => ({ ...p, [key]: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
            ))}
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Type de client</label>
              <select
                value={form.clientType || ''}
                onChange={e => setForm((p: any) => ({ ...p, clientType: e.target.value }))}
                className="input-field w-full"
              >
                {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Rôle</label>
              <select
                value={form.role}
                onChange={e => setForm((p: any) => ({ ...p, role: e.target.value }))}
                className="input-field w-full"
              >
                <option value="USER">Client</option>
                <option value="ORGANIZER">Organisateur</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Société</label>
              <input
                value={form.company || ''}
                onChange={e => setForm((p: any) => ({ ...p, company: e.target.value }))}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">CIN</label>
              <input
                value={form.cin || ''}
                onChange={e => setForm((p: any) => ({ ...p, cin: e.target.value }))}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Matricule fiscal</label>
              <input
                value={form.matfisc || ''}
                onChange={e => setForm((p: any) => ({ ...p, matfisc: e.target.value }))}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Code postal</label>
              <input
                value={form.postalCode || ''}
                onChange={e => setForm((p: any) => ({ ...p, postalCode: e.target.value }))}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Ville</label>
              <input
                value={form.city || ''}
                onChange={e => setForm((p: any) => ({ ...p, city: e.target.value }))}
                className="input-field w-full"
              />
            </div>
            <div className="col-span-2">
              <label className="text-dark-300 text-sm mb-1.5 block">Adresse</label>
              <input
                value={form.address || ''}
                onChange={e => setForm((p: any) => ({ ...p, address: e.target.value }))}
                className="input-field w-full"
              />
            </div>
            <div className="col-span-2">
              <label className="text-dark-300 text-sm mb-1.5 block">Notes internes</label>
              <textarea
                value={form.notes || ''}
                onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))}
                rows={3}
                className="input-field w-full resize-none"
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-gold py-2.5 px-6 flex items-center gap-2 disabled:opacity-60"
          >
            <Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      )}

      {/* ─── TAB: HISTORIQUE ────────────────────────────────────────────────── */}
      {tab === 'historique' && (
        <div className="glass rounded-2xl overflow-hidden max-w-4xl">
          {events.length === 0 ? (
            <p className="text-dark-400 text-sm text-center py-10">Aucun événement pour ce client.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-dark-400 text-xs uppercase">
                    <th className="text-left px-4 py-3">Événement</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Lieu</th>
                    <th className="text-right px-4 py-3">Prix</th>
                    <th className="text-right px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(ev => (
                    <tr
                      key={ev.id}
                      className="border-b border-white/5 hover:bg-white/3 cursor-pointer"
                      onClick={() => navigate(`/admin/evenements/${ev.id}`)}
                    >
                      <td className="px-4 py-3 text-white">{ev.title}</td>
                      <td className="px-4 py-3 text-dark-300">
                        {new Date(ev.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-dark-300">{ev.location}</td>
                      <td className="px-4 py-3 text-right text-gold-400 font-medium">
                        {ev.price > 0 ? formatPrice(ev.price) : 'Gratuit'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`badge border text-xs ${ev.isPublished ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-dark-600 text-dark-400 border-dark-600'}`}>
                          {ev.isPublished ? 'Publié' : 'Brouillon'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: DEVIS ────────────────────────────────────────────────────── */}
      {tab === 'devis' && (
        <div className="glass rounded-2xl overflow-hidden max-w-4xl">
          {quotes.length === 0 ? (
            <p className="text-dark-400 text-sm text-center py-10">Aucun devis pour ce client.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-dark-400 text-xs uppercase">
                    <th className="text-left px-4 py-3">Référence</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-right px-4 py-3">Montant</th>
                    <th className="text-right px-4 py-3">Statut</th>
                    <th className="text-right px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q: any) => (
                    <tr
                      key={q.id}
                      className="border-b border-white/5 hover:bg-white/3 cursor-pointer"
                      onClick={() => navigate(`/admin/devis/${q.id}`)}
                    >
                      <td className="px-4 py-3 text-gold-400 font-mono text-sm">{q.reference}</td>
                      <td className="px-4 py-3 text-dark-300">
                        {new Date(q.date_emission).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-right text-white font-medium">
                        {formatPrice(q.montant_ttc || 0)}
                      </td>
                      <td className="px-4 py-3 text-right">{getStatusBadge(q.statut)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/devis/${q.id}`); }}
                          className="p-1.5 rounded-lg text-dark-400 hover:text-gold-400 hover:bg-gold-500/10 transition-all"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: PAIEMENTS ────────────────────────────────────────────────── */}
      {tab === 'paiements' && (
        <div className="glass rounded-2xl overflow-hidden max-w-4xl">
          {payments.length === 0 ? (
            <p className="text-dark-400 text-sm text-center py-10">Aucun paiement pour ce client.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-dark-400 text-xs uppercase">
                    <th className="text-left px-4 py-3">Description</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-right px-4 py-3">Montant</th>
                    <th className="text-right px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p: any) => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="px-4 py-3 text-white">{p.description || '—'}</td>
                      <td className="px-4 py-3 text-dark-300">
                        {new Date(p.date_paiement).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-dark-300 capitalize">{p.type_paiement || p.type || '—'}</td>
                      <td className="px-4 py-3 text-right text-gold-400 font-medium">
                        {formatPrice(p.montant)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`badge border text-xs ${
                          p.statut === 'paye' || p.statut === 'confirme' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          p.statut === 'partiel' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          {p.statut === 'paye' || p.statut === 'confirme' ? '✅ Payé' :
                           p.statut === 'partiel' ? '⏳ Partiel' :
                           '⚠️ En attente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: RENDEZ-VOUS ────────────────────────────────────────────────── */}
      {tab === 'rendezvous' && (
        <div className="glass rounded-2xl overflow-hidden max-w-4xl">
          {appointments.length === 0 ? (
            <p className="text-dark-400 text-sm text-center py-10">Aucun rendez-vous pour ce client.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-dark-400 text-xs uppercase">
                    <th className="text-left px-4 py-3">Titre</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Lieu</th>
                    <th className="text-right px-4 py-3">Durée</th>
                    <th className="text-right px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a: any) => (
                    <tr key={a.id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="px-4 py-3 text-white">{a.titre}</td>
                      <td className="px-4 py-3 text-dark-300">
                        {new Date(a.date_heure).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-dark-300">{a.lieu || '—'}</td>
                      <td className="px-4 py-3 text-right text-dark-300">{a.duree_minutes} min</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`badge border text-xs ${
                          a.statut === 'confirme' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          a.statut === 'planifie' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          a.statut === 'termine' ? 'bg-dark-600 text-dark-400 border-dark-600' :
                          'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          {a.statut === 'confirme' ? '✅ Confirmé' :
                           a.statut === 'planifie' ? '📅 Planifié' :
                           a.statut === 'termine' ? '✓ Terminé' :
                           '❌ Annulé'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: APPELS ────────────────────────────────────────────────────── */}
      {tab === 'appels' && (
        <div className="glass rounded-2xl overflow-hidden max-w-4xl">
          {calls.length === 0 ? (
            <p className="text-dark-400 text-sm text-center py-10">Aucun appel pour ce client.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-dark-400 text-xs uppercase">
                    <th className="text-left px-4 py-3">Objet</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Durée</th>
                    <th className="text-right px-4 py-3">Statut</th>
                    <th className="text-right px-4 py-3">Enregistrement</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map((c: any) => (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="px-4 py-3 text-white">{c.objet || '—'}</td>
                      <td className="px-4 py-3 text-dark-300">
                        {new Date(c.date_heure).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-dark-300">{c.duree_minutes || '—'} min</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`badge border text-xs ${
                          c.statut === 'reussi' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          c.statut === 'a_rappeler' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          c.statut === 'planifie' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          {c.statut === 'reussi' ? '✅ Réussi' :
                           c.statut === 'a_rappeler' ? '🔄 À rappeler' :
                           c.statut === 'planifie' ? '📅 Planifié' :
                           '❌ Manqué'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.recording_url ? (
                          <audio controls preload="none" src={c.recording_url} className="h-8 w-32" />
                        ) : (
                          <span className="text-dark-500 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}