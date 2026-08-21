import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Edit2, Trash2, X, FileText, Eye, Download,
  Calendar, User, DollarSign, Filter, ChevronDown, ChevronUp,
  Clock, CheckCircle, XCircle, Send, FileCheck2, Printer,
  BarChart3, TrendingUp, Package, Users, Loader2, AlertCircle
} from 'lucide-react';
import { crmApi } from '@/lib/crmApi';
import { usersApi, eventsApi, packsApi } from '@/lib/neonApi';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatPrice } from '@/lib/format';

// ─── INTERFACES ──────────────────────────────────────────────────────────────
interface Devis {
  id: string;
  reference: string;
  statut: string;
  montant_ttc: number;
  montant_ht: number;
  date_emission: string;
  date_expiration: string;
  client_id?: string;
  event_id?: string;
  conditions?: string;
  notes?: string;
}

interface Client {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  phone?: string;
}

// ─── STATUTS ──────────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  brouillon: { label: 'Brouillon', color: 'bg-dark-600 text-dark-300 border-dark-600', icon: FileText },
  envoye: { label: 'Envoyé', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Send },
  accepte: { label: 'Accepté', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  refuse: { label: 'Refusé', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
  converti: { label: 'Converti', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: FileCheck2 },
};

const columns = [
  { key: 'brouillon', label: 'À traiter', color: 'border-dark-600', icon: FileText },
  { key: 'envoye', label: 'Envoyé', color: 'border-blue-500/40', icon: Send },
  { key: 'accepte', label: 'Accepté', color: 'border-green-500/40', icon: CheckCircle },
  { key: 'refuse', label: 'Refusé', color: 'border-red-500/40', icon: XCircle },
];

export default function AdminDevis() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  // ─── État principal ──────────────────────────────────────────────────────
  const [devis, setDevis] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState<string>('date_emission');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ─── Stats ────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState({
    total: 0,
    brouillon: 0,
    envoye: 0,
    accepte: 0,
    refuse: 0,
    converti: 0,
    totalMontant: 0,
    acceptedMontant: 0,
  });

  // ─── Modal ────────────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const [form, setForm] = useState({
    client_id: '',
    event_id: '',
    pack_id: '',
    statut: 'brouillon',
    conditions: 'Acompte 50% à la signature, solde 30 jours avant l\'événement.',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const selectedEvent = form.event_id ? events.find((ev: any) => ev.id === form.event_id) || null : null;

  // ─── Chargement ──────────────────────────────────────────────────────────
  const loadData = async () => {
    try {
      const [users, evs, pks] = await Promise.all([
        usersApi.list(),
        eventsApi.list({ limit: 200 }).then(r => r.data).catch(() => []),
        packsApi.list().catch(() => []),
      ]);

      const cs = users
        .filter(u => u.role === 'USER')
        .map(u => {
          const parts = u.name.trim().split(/\s+/);
          return {
            id: u.id,
            prenom: parts[0] || u.name,
            nom: parts.slice(1).join(' '),
            email: u.email,
            phone: u.phone || undefined,
          };
        });

      setClients(cs);
      setEvents(evs || []);
      setPacks(pks || []);
    } catch (e) {
      console.warn('[AdminDevis] loadData error:', e);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await crmApi.list('devis');
      setDevis(data as unknown as Devis[]);

      // Statistiques
      const accepted = (data || []).filter((d: any) => d.statut === 'accepte');
      setStats({
        total: (data || []).length,
        brouillon: (data || []).filter((d: any) => d.statut === 'brouillon').length,
        envoye: (data || []).filter((d: any) => d.statut === 'envoye').length,
        accepte: accepted.length,
        refuse: (data || []).filter((d: any) => d.statut === 'refuse').length,
        converti: (data || []).filter((d: any) => d.statut === 'converti').length,
        totalMontant: (data || []).reduce((sum: number, d: any) => sum + (Number(d.montant_ttc) || 0), 0),
        acceptedMontant: accepted.reduce((sum: number, d: any) => sum + (Number(d.montant_ttc) || 0), 0),
      });

      await loadData();
    } catch {
      setDevis([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const clientName = (id?: string) => {
    const client = clients.find(c => c.id === id);
    return client ? `${client.prenom} ${client.nom}`.trim() : '–';
  };

  const clientEmail = (id?: string) => {
    const client = clients.find(c => c.id === id);
    return client?.email || '–';
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.brouillon;
    return <span className={`badge border text-xs ${config.color}`}>{config.label}</span>;
  };

  // ─── CRUD ──────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.client_id) {
      setFormError('Veuillez sélectionner un client');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const ref = `DEV-${new Date().getFullYear()}-${String(devis.length + 1).padStart(3, '0')}`;
      const data = await crmApi.create('devis', {
        reference: ref,
        client_id: form.client_id,
        event_id: form.event_id || null,
        pack_id: form.pack_id || null,
        statut: 'brouillon',
        conditions: form.conditions,
        notes: form.notes || null,
        date_emission: new Date().toISOString(),
      });
      success('Devis créé', ref);
      setShowCreate(false);
      if (data) navigate(`/admin/devis/${data.id}`);
      else load();
    } catch (e: any) {
      setFormError(e.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce devis ?')) return;
    try {
      await crmApi.delete('devis', id);
      setDevis(prev => prev.filter(d => d.id !== id));
      success('Devis supprimé');
      load();
    } catch (e: any) {
      toastError('Erreur', 'Impossible de supprimer');
    }
  };

  const handleChangeStatus = async (id: string, statut: string) => {
    try {
      await crmApi.update('devis', id, { statut });
      setDevis(prev => prev.map(d => d.id === id ? { ...d, statut } : d));
      success(`Statut mis à jour : ${statusConfig[statut]?.label || statut}`);
      load();
    } catch (e: any) {
      toastError('Erreur', 'Impossible de changer le statut');
    }
  };

  // ─── Filtres et tri ──────────────────────────────────────────────────────
  const filtered = devis.filter(d => {
    const matchSearch = d.reference.toLowerCase().includes(search.toLowerCase()) ||
                        clientName(d.client_id).toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || d.statut === filterStatus;
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    let compare = 0;
    switch (sortBy) {
      case 'reference':
        compare = a.reference.localeCompare(b.reference);
        break;
      case 'client':
        compare = clientName(a.client_id).localeCompare(clientName(b.client_id));
        break;
      case 'montant_ttc':
        compare = (a.montant_ttc || 0) - (b.montant_ttc || 0);
        break;
      case 'date_emission':
        compare = new Date(a.date_emission).getTime() - new Date(b.date_emission).getTime();
        break;
      default:
        compare = 0;
    }
    return sortOrder === 'asc' ? compare : -compare;
  });

  // ─── Export ──────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const data = await crmApi.list('devis');
      const headers = ['Référence', 'Client', 'Email', 'Montant HT', 'Montant TTC', 'Statut', 'Date émission', 'Date expiration'];
      const rows = data.map((d: any) => [
        d.reference,
        clientName(d.client_id),
        clientEmail(d.client_id),
        Number(d.montant_ht || 0).toFixed(2),
        Number(d.montant_ttc || 0).toFixed(2),
        statusConfig[d.statut]?.label || d.statut,
        new Date(d.date_emission).toLocaleDateString('fr-FR'),
        d.date_expiration ? new Date(d.date_expiration).toLocaleDateString('fr-FR') : '',
      ]);

      const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devis-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      success('Export CSV effectué');
    } catch (e: any) {
      toastError('Erreur export', e.message);
    }
  };

  // ─── RENDU ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title="Gestion des Devis"
        subtitle={`${devis.length} devis · ${formatPrice(stats.totalMontant)} total`}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExport}
              className="glass py-2 px-4 text-sm flex items-center gap-2 text-dark-300 hover:text-white rounded-xl transition-all"
            >
              <Download size={15} /> Export CSV
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="btn-gold py-2 px-4 text-sm flex items-center gap-2"
            >
              <Plus size={15} /> Nouveau devis
            </button>
          </div>
        }
      />

      {/* ─── STATS ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: FileText, color: 'text-white', bg: 'bg-dark-700' },
          { label: 'À traiter', value: stats.brouillon, icon: FileText, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
          { label: 'Envoyés', value: stats.envoye, icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { label: 'Acceptés', value: stats.accepte, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
          { label: 'Refusés', value: stats.refuse, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
          { label: 'Converti', value: stats.converti, icon: FileCheck2, color: 'text-purple-400', bg: 'bg-purple-500/20' },
          { label: 'Montant total', value: formatPrice(stats.totalMontant), icon: DollarSign, color: 'text-gold-400', bg: 'bg-gold-500/20' },
        ].map((item, i) => (
          <div key={i} className="glass rounded-xl p-3 text-center">
            <div className={`${item.color} flex items-center justify-center gap-1 text-xs mb-1`}>
              <item.icon size={14} /> {item.label}
            </div>
            <div className="text-white font-bold text-lg">{item.value}</div>
          </div>
        ))}
      </div>

      {/* ─── FILTRES ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 py-2.5 text-sm w-full"
            placeholder="Rechercher un devis..."
          />
        </div>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="input-field py-2.5 text-sm w-36"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(statusConfig).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>

        <div className="flex gap-1.5">
          {(['kanban', 'table'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                view === v ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white'
              }`}
            >
              {v === 'kanban' ? '📋 Kanban' : '📊 Tableau'}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setSearch(''); setFilterStatus(''); }}
          className="glass px-3 py-2.5 rounded-xl text-dark-300 hover:text-white transition-all"
        >
          <X size={14} />
        </button>
      </div>

      {/* ─── LISTE ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="glass rounded-2xl overflow-hidden">
          <SkeletonTable rows={5} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <FileText size={40} className="mx-auto mb-3 text-dark-600" />
          <p className="text-dark-400 mb-4">Aucun devis trouvé</p>
          <button onClick={() => setShowCreate(true)} className="btn-gold py-2 px-6 text-sm">
            Créer un devis
          </button>
        </div>
      ) : view === 'kanban' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map(col => {
            const colDevis = filtered.filter(d => d.statut === col.key);
            return (
              <div key={col.key} className={`glass rounded-2xl p-4 border ${col.color} min-h-[300px]`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    <col.icon size={14} className="text-gold-400" />
                    {col.label}
                  </h3>
                  <span className="w-6 h-6 rounded-full bg-dark-700 text-dark-300 text-xs flex items-center justify-center font-bold">
                    {colDevis.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {colDevis.map(d => (
                    <div
                      key={d.id}
                      className="bg-dark-700 rounded-xl p-4 group cursor-pointer hover:ring-1 hover:ring-gold-500/30 transition-all"
                      onClick={() => navigate(`/admin/devis/${d.id}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-gold-400 font-mono text-xs">{d.reference}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => navigate(`/admin/devis/${d.id}`)}
                            className="text-dark-400 hover:text-gold-400 p-0.5"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(d.id)}
                            className="text-dark-500 hover:text-red-400 p-0.5"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-white text-sm font-medium mb-1">{clientName(d.client_id)}</p>
                      <p className="text-dark-400 text-xs truncate">{clientEmail(d.client_id)}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-dark-300 text-xs">
                          {new Date(d.date_emission).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="text-gold-500 font-bold text-sm">
                          {formatPrice(d.montant_ttc || 0)}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <select
                          value={d.statut}
                          onChange={e => handleChangeStatus(d.id, e.target.value)}
                          className="flex-1 bg-dark-800 border border-dark-500 rounded-lg px-2 py-1 text-xs text-dark-200 focus:outline-none focus:border-gold-500"
                        >
                          {Object.entries(statusConfig).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                          ))}
                        </select>
                        {getStatusBadge(d.statut)}
                      </div>
                    </div>
                  ))}
                  {colDevis.length === 0 && (
                    <p className="text-dark-600 text-xs text-center py-6">Aucun devis</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {[
                    { key: 'reference', label: 'Référence' },
                    { key: 'client', label: 'Client' },
                    { key: 'date_emission', label: 'Date' },
                    { key: 'montant_ttc', label: 'Montant TTC' },
                    { key: '', label: 'Statut' },
                    { key: '', label: 'Actions' },
                  ].map((h, i) => (
                    <th
                      key={h.key || i}
                      onClick={() => h.key && setSortBy(h.key)}
                      className={`text-left px-4 py-3.5 text-dark-400 text-xs font-medium uppercase tracking-wider ${h.key ? 'cursor-pointer hover:text-white transition-colors' : ''}`}
                    >
                      <span className="flex items-center gap-1">
                        {h.label}
                        {h.key && sortBy === h.key && (
                          sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(d => (
                  <tr
                    key={d.id}
                    className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/devis/${d.id}`)}
                  >
                    <td className="px-4 py-3.5 text-gold-400 font-mono text-sm">
                      {d.reference}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-white text-sm font-medium">{clientName(d.client_id)}</p>
                      <p className="text-dark-400 text-xs">{clientEmail(d.client_id)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-dark-300 text-sm">
                      {new Date(d.date_emission).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3.5 text-gold-400 font-bold">
                      {formatPrice(d.montant_ttc || 0)}
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={d.statut}
                        onChange={e => handleChangeStatus(d.id, e.target.value)}
                        className="bg-dark-700 border border-dark-600 rounded-lg px-2 py-1 text-xs text-dark-200 focus:outline-none focus:border-gold-500"
                        onClick={e => e.stopPropagation()}
                      >
                        {Object.entries(statusConfig).map(([key, config]) => (
                          <option key={key} value={key}>{config.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/admin/devis/${d.id}`)}
                          className="p-1.5 rounded-lg text-dark-400 hover:text-gold-400 hover:bg-gold-500/10 transition-all"
                          title="Voir le devis"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-dark-400 text-xs">{filtered.length} devis affichés</span>
            <span className="text-dark-500 text-xs">
              Total: {formatPrice(filtered.reduce((sum, d) => sum + (d.montant_ttc || 0), 0))}
            </span>
          </div>
        </div>
      )}

      {/* ─── MODAL : NOUVEAU DEVIS ──────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-md w-full z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 bg-dark-800 z-10 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">Nouveau devis</h2>
              <button onClick={() => setShowCreate(false)} className="text-dark-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                  <AlertCircle size={16} /> {formError}
                </div>
              )}

              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Client *</label>
                <select
                  value={form.client_id}
                  onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}
                  className="input-field w-full"
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.prenom} {c.nom} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Événement</label>
                <select
                  value={form.event_id}
                  onChange={e => {
                    const ev = events.find(x => x.id === e.target.value);
                    setForm(p => ({
                      ...p,
                      event_id: e.target.value,
                      ...(ev?.clientId && !p.client_id ? { client_id: ev.clientId } : {}),
                    }));
                  }}
                  className="input-field w-full"
                >
                  <option value="">— Aucun événement —</option>
                  {events
                    .filter(ev => !form.client_id || !ev.clientId || ev.clientId === form.client_id)
                    .map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} {ev.clientId ? `(${clientName(ev.clientId)})` : ''}
                      </option>
                    ))}
                </select>
                {selectedEvent && (
                  <div className="mt-2 p-3 glass rounded-xl text-xs text-dark-300 space-y-1">
                    <p className="text-white font-medium">{selectedEvent.title}</p>
                    <p>
                      {selectedEvent.date ? new Date(selectedEvent.date).toLocaleDateString('fr-FR') : '–'}
                      {selectedEvent.location ? ` · ${selectedEvent.location}` : ''}
                    </p>
                    <p className="flex justify-between">
                      <span>Capacité : {selectedEvent.capacity ?? '–'} pers.</span>
                      <span className="text-gold-400 font-semibold">
                        {formatPrice(selectedEvent.price || 0)}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Pack (optionnel)</label>
                <select
                  value={form.pack_id}
                  onChange={e => setForm(p => ({ ...p, pack_id: e.target.value }))}
                  className="input-field w-full"
                >
                  <option value="">— Aucun pack —</option>
                  {packs.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatPrice(p.price)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Conditions</label>
                <textarea
                  value={form.conditions}
                  onChange={e => setForm(p => ({ ...p, conditions: e.target.value }))}
                  rows={3}
                  className="input-field w-full resize-none"
                />
              </div>

              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Notes internes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="input-field w-full resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-white/10 sticky bottom-0 bg-dark-800 rounded-b-2xl">
              <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1 py-2.5">
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.client_id}
                className="btn-gold flex-1 py-2.5 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  'Créer le devis'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}