import { useEffect, useState } from 'react';
import { Search, TrendingUp, Ticket, CheckCircle, XCircle, Clock, BarChart2, Plus, X, Loader2, Calendar, User, MapPin, DollarSign } from 'lucide-react';
import { bookingsApi, eventsApi, usersApi, type NeonEvent, type NeonUser } from '@/lib/neonApi';
import { useToast } from '@/components/ui/Toast';
import { SkeletonTable, Skeleton } from '@/components/ui/Skeleton';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatPrice } from '@/lib/format';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const getToken = () => localStorage.getItem('se360-token') || localStorage.getItem('token') || '';

interface Booking {
  id: string; status: string; qrCode: string | null; createdAt: string;
  user: { id: string; name: string; email: string };
  event: { id: string; title: string; date: string; location: string; price: number };
}

interface Stats {
  totals: { total: number; confirmed: number; pending: number; cancelled: number };
  topEvents: { id: string; title: string; date: string; location: string; bookingCount: number }[];
}

const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'CANCELLED'];
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'En attente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  CONFIRMED: { label: 'Confirmée', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  CANCELLED: { label: 'Annulée', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export default function AdminReservations() {
  const { success, error: toastError } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [tab, setTab] = useState<'list' | 'stats'>('list');
  const [clients, setClients] = useState<NeonUser[]>([]);
  const [events, setEvents] = useState<NeonEvent[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ userId: '', eventId: '', status: 'PENDING' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };

  const load = async () => {
    setLoading(true);
    try {
      const qs = filterStatus ? `?status=${filterStatus}&limit=50&page=${page}` : `?limit=50&page=${page}`;
      const [bRes, sRes] = await Promise.all([
        fetch(`${API}/bookings${qs}`, { headers }),
        fetch(`${API}/bookings/stats`, { headers }),
      ]);
      const bData = await bRes.json();
      const sData = sRes.ok ? await sRes.json() : null;
      setBookings(bData.data || []);
      setTotal(bData.total || 0);
      setStats(sData);
    } catch {
      setBookings([]); setStats(null);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterStatus, page]);

  useEffect(() => {
    Promise.all([
      usersApi.list().catch(() => []),
      eventsApi.list({ limit: 200 }).then(r => r.data).catch(() => []),
    ]).then(([us, evs]) => {
      setClients(us.filter(u => u.role === 'USER'));
      setEvents(evs || []);
    });
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const r = await fetch(`${API}/bookings/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ status }) });
      if (!r.ok) throw new Error((await r.json()).error);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
      if (stats) setStats(s => s ? {
        ...s,
        totals: {
          ...s.totals,
          confirmed: status === 'CONFIRMED' ? s.totals.confirmed + 1 : s.totals.confirmed,
          cancelled: status === 'CANCELLED' ? s.totals.cancelled + 1 : s.totals.cancelled,
        }
      } : null);
      success('Statut mis à jour', `Réservation → ${status}`);
    } catch (e: any) { toastError('Erreur', e.message); }
  };

  const handleCreate = async () => {
    if (!createForm.userId || !createForm.eventId) return;
    setCreating(true);
    try {
      await bookingsApi.create(createForm);
      success('Réservation créée');
      setShowCreate(false);
      setCreateForm({ userId: '', eventId: '', status: 'PENDING' });
      load();
    } catch (e: any) { toastError('Erreur', e.message || 'Création impossible.'); }
    finally { setCreating(false); }
  };

  const deleteBooking = async (id: string) => {
    if (!confirm('Supprimer cette réservation ?')) return;
    try {
      await fetch(`${API}/bookings/${id}`, { method: 'DELETE', headers });
      setBookings(prev => prev.filter(b => b.id !== id));
      success('Réservation supprimée');
    } catch { toastError('Erreur', 'Suppression échouée.'); }
  };

  const getStatusBadge = (status: string) => {
    const st = STATUS_LABELS[status] || STATUS_LABELS.PENDING;
    return <span className={`badge border text-xs ${st.color}`}>{st.label}</span>;
  };

  const filtered = bookings.filter(b =>
    `${b.user.name} ${b.user.email} ${b.event.title}`.toLowerCase().includes(search.toLowerCase())
  );

  const statusIcon = { 
    CONFIRMED: <CheckCircle size={14} className="text-green-400" />, 
    PENDING: <Clock size={14} className="text-yellow-400" />, 
    CANCELLED: <XCircle size={14} className="text-red-400" /> 
  };

  return (
    <div className="p-4 lg:p-6">
      <PageHeader 
        title="Gestion des Réservations" 
        subtitle={stats ? `${stats.totals.total} réservations au total` : ''}
        action={
          <button 
            onClick={() => { setShowCreate(true); setCreateForm({ userId: '', eventId: '', status: 'PENDING' }); }} 
            className="btn-gold py-2 px-4 text-sm flex items-center gap-2"
          >
            <Plus size={15} />Nouvelle réservation
          </button>
        } 
      />

      {/* ─── KPIs ─── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.totals.total, color: 'text-white', bg: 'bg-dark-700', icon: Ticket },
            { label: 'Confirmées', value: stats.totals.confirmed, color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle },
            { label: 'En attente', value: stats.totals.pending, color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: Clock },
            { label: 'Annulées', value: stats.totals.cancelled, color: 'text-red-400', bg: 'bg-red-500/20', icon: XCircle },
          ].map((k, i) => (
            <div key={i} className="glass rounded-xl p-3 text-center">
              <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center mx-auto mb-2`}>
                <k.icon size={18} className={k.color} />
              </div>
              <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
              <div className="text-dark-400 text-xs">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Tabs ─── */}
      <div className="flex gap-2 mb-5">
        {[
          ['list', '📋 Liste'],
          ['stats', '📊 Statistiques']
        ].map(([v, l]) => (
          <button 
            key={v} 
            onClick={() => setTab(v as any)} 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === v ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* ─── Stats tab — événements les plus réservés ─── */}
      {tab === 'stats' && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-gold-500" />
            Événements les plus réservés
          </h3>
          {!stats ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="space-y-3">
              {stats.topEvents.length === 0 ? (
                <p className="text-dark-400 text-center py-8">Aucune réservation pour le moment.</p>
              ) : (
                stats.topEvents.map((ev, i) => {
                  const maxCount = stats.topEvents[0]?.bookingCount || 1;
                  const pct = (ev.bookingCount / maxCount) * 100;
                  return (
                    <div key={ev.id} className="flex items-center gap-4">
                      <span className="text-dark-400 text-sm w-5 text-right font-medium">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-white font-medium">{ev.title}</span>
                          <span className="text-gold-400 font-bold">{ev.bookingCount} résa</span>
                        </div>
                        <div className="w-full bg-dark-700 rounded-full h-2">
                          <div className="bg-gold-500 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-dark-500 text-xs mt-0.5 flex items-center gap-2">
                          <MapPin size={10} /> {ev.location}
                          <Calendar size={10} /> {new Date(ev.date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── List tab ─── */}
      {tab === 'list' && (
        <>
          {/* ─── Filters ─── */}
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="input-field pl-9 py-2.5 text-sm w-full" 
                placeholder="Rechercher client, événement..." 
              />
            </div>
            <div className="flex gap-1.5">
              <button 
                onClick={() => { setFilterStatus(''); setPage(1); }} 
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  !filterStatus ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white'
                }`}
              >
                Tous
              </button>
              {STATUS_OPTIONS.map(s => (
                <button 
                  key={s} 
                  onClick={() => { setFilterStatus(s); setPage(1); }} 
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filterStatus === s ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white'
                  }`}
                >
                  {STATUS_LABELS[s]?.label || s}
                </button>
              ))}
            </div>
          </div>

          {/* ─── Tableau ─── */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Client', 'Événement', 'Date résa', 'Montant', 'QR Code', 'Statut', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3.5 text-dark-400 text-xs font-medium uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <SkeletonTable rows={6} />
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-dark-400">
                        <Ticket size={32} className="mx-auto mb-2 text-dark-600" />
                        Aucune réservation trouvée
                      </td>
                    </tr>
                  ) : (
                    filtered.map(b => (
                      <tr key={b.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-xs font-bold text-dark-300">
                              {b.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{b.user.name}</p>
                              <p className="text-dark-400 text-xs">{b.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-white text-sm">{b.event.title}</p>
                          <p className="text-dark-400 text-xs flex items-center gap-1">
                            <MapPin size={10} /> {b.event.location}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-dark-300 text-sm">
                          {new Date(b.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3.5 text-gold-400 font-bold text-sm">
                          {b.event.price > 0 ? formatPrice(b.event.price) : 'Gratuit'}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-dark-400">
                          {b.qrCode ? b.qrCode.slice(0, 8) + '…' : '–'}
                        </td>
                        <td className="px-4 py-3.5">
                          <select 
                            value={b.status} 
                            onChange={e => updateStatus(b.id, e.target.value)}
                            className="bg-dark-700 border border-dark-600 rounded-lg px-2 py-1 text-xs text-dark-200 focus:outline-none focus:border-gold-500"
                          >
                            {STATUS_OPTIONS.map(s => (
                              <option key={s} value={s}>{STATUS_LABELS[s]?.label || s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3.5">
                          <button 
                            onClick={() => deleteBooking(b.id)} 
                            className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Supprimer"
                          >
                            <XCircle size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* ─── Pagination ─── */}
            {total > 50 && (
              <div className="flex justify-between items-center px-4 py-3 border-t border-white/10">
                <span className="text-dark-400 text-xs">{total} réservations au total</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    disabled={page === 1}
                    className="btn-ghost py-1.5 px-3 text-xs disabled:opacity-30"
                  >
                    Précédent
                  </button>
                  <span className="text-dark-400 text-xs py-1.5">Page {page}</span>
                  <button 
                    onClick={() => setPage(p => p + 1)} 
                    disabled={total <= page * 50}
                    className="btn-ghost py-1.5 px-3 text-xs disabled:opacity-30"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── MODAL : Nouvelle réservation ─── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-md w-full z-10">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Nouvelle réservation</h2>
              <button onClick={() => setShowCreate(false)} className="text-dark-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Client */}
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Client *</label>
                <select 
                  value={createForm.userId} 
                  onChange={e => setCreateForm(p => ({ ...p, userId: e.target.value }))} 
                  className="input-field w-full"
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {[c.prenom, c.nom, c.name].filter(Boolean).join(' ') || c.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Événement */}
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Événement *</label>
                <select 
                  value={createForm.eventId} 
                  onChange={e => setCreateForm(p => ({ ...p, eventId: e.target.value }))} 
                  className="input-field w-full"
                >
                  <option value="">Sélectionner un événement</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} · {new Date(ev.date).toLocaleDateString('fr-FR')}
                      {ev.location ? ` · ${ev.location}` : ''}
                    </option>
                  ))}
                </select>
                {createForm.eventId && events.find(e => e.id === createForm.eventId) && (
                  <div className="mt-2 p-3 glass rounded-xl text-xs text-dark-300">
                    <div className="flex items-center justify-between">
                      <span className="text-gold-400 font-medium">
                        {formatPrice(events.find(e => e.id === createForm.eventId)?.price || 0)}
                      </span>
                      <span className="text-dark-400">
                        {events.find(e => e.id === createForm.eventId)?.capacity || 0} places
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Statut */}
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Statut</label>
                <select 
                  value={createForm.status} 
                  onChange={e => setCreateForm(p => ({ ...p, status: e.target.value }))} 
                  className="input-field w-full"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]?.label || s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-white/10">
              <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1 py-2.5">
                Annuler
              </button>
              <button 
                onClick={handleCreate} 
                disabled={!createForm.userId || !createForm.eventId || creating} 
                className="btn-gold flex-1 py-2.5 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {creating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  'Créer la réservation'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}