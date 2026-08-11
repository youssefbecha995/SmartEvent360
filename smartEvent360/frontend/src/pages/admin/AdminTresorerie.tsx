import { useEffect, useMemo, useState } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Download, Plus, Search, X, Edit2, Trash2,
  Wallet, CalendarClock, Landmark, CreditCard, Banknote, Filter
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { crmApi } from '@/lib/crmApi';
import { usersApi, eventsApi } from '@/lib/neonApi';
import PageHeader from '@/components/ui/PageHeader';
import { formatPrice } from '@/lib/format';

// ─── Référentiels ────────────────────────────────────────────────────────────
const PAIEMENT_TYPES = {
  acompte: 'Acompte', solde: 'Solde', caution: 'Caution', avance: 'Avance',
  remboursement: 'Remboursement', autre: 'Autre',
};
const MODES_PAIEMENT = {
  especes: 'Espèces', virement: 'Virement bancaire', carte: 'Carte bancaire',
  cheque: 'Chèque', en_ligne: 'Paiement en ligne',
};
const STATUTS = {
  paye: { label: 'Payé', cls: 'bg-green-500/15 text-green-400 border-green-500/30' },
  partiel: { label: 'Partiel', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  attente: { label: 'En attente', cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  retarde: { label: 'En retard', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
  annule: { label: 'Annulé', cls: 'bg-white/5 text-dark-400 border-white/10' },
};
const EXPENSE_CATEGORIES: Record<string, { label: string; color: string }> = {
  achat_materiel: { label: 'Achat matériel', color: '#D4AF37' },
  salaire: { label: 'Salaires', color: '#60A5FA' },
  fournisseur: { label: 'Fournisseurs', color: '#A78BFA' },
  location: { label: 'Location', color: '#34D399' },
  transport: { label: 'Transport', color: '#FBBF24' },
  decoration: { label: 'Décoration', color: '#F472B6' },
  son: { label: 'Sonorisation', color: '#38BDF8' },
  lumiere: { label: 'Éclairage', color: '#FB923C' },
  video: { label: 'Vidéo', color: '#818CF8' },
  communication: { label: 'Communication', color: '#22D3EE' },
  assurance: { label: 'Assurance', color: '#4ADE80' },
  taxe: { label: 'Taxes & impôts', color: '#F87171' },
  autre: { label: 'Autres', color: '#6B7280' },
};

const today = () => new Date().toISOString().slice(0, 10);

const incomeEmpty = () => ({
  client_id: '', event_id: '', type_paiement: 'acompte', mode_paiement: 'virement',
  montant: '', statut: 'paye', date_paiement: today(), echeance: '',
  reference_facture: '', numero_reçu: '', description: '', notes: '',
});
const expenseEmpty = () => ({
  categorie: 'fournisseur', montant: '', mode_paiement: 'especes', statut: 'paye',
  date_paiement: today(), echeance: '', fournisseur: '', event_id: '', employee_id: '',
  reference_facture: '', description: '', notes: '',
});

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) return (
    <div className="bg-dark-800 border border-white/10 rounded-xl px-4 py-2.5 text-xs">
      <p className="text-dark-300 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name} : {formatPrice(p.value)}</p>
      ))}
    </div>
  );
  return null;
};

export default function AdminTresorerie() {
  const [tab, setTab] = useState<'dash' | 'incomes' | 'expenses' | 'echeances'>('dash');

  const [incomes, setIncomes] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [fStatut, setFStatut] = useState('');
  const [fMode, setFMode] = useState('');
  const [fCat, setFCat] = useState('');

  const [showIncome, setShowIncome] = useState(false);
  const [editIncome, setEditIncome] = useState<any | null>(null);
  const [incomeForm, setIncomeForm] = useState<Record<string, any>>(incomeEmpty());
  const [showExpense, setShowExpense] = useState(false);
  const [editExpense, setEditExpense] = useState<any | null>(null);
  const [expenseForm, setExpenseForm] = useState<Record<string, any>>(expenseEmpty());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const [inc, exp, us, ev, st] = await Promise.all([
        crmApi.list('incomes'), crmApi.list('expenses'),
        usersApi.list(), eventsApi.list({ limit: 200 }).then(r => r.data).catch(() => []),
        crmApi.list('personnel'),
      ]);
      setIncomes(inc); setExpenses(exp);
      setClients(us); setEvents(ev); setStaff(st);
    } catch (e) { console.warn('[Trésorerie] chargement:', e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || '–';
  const eventName = (id: string) => events.find(e => e.id === id)?.title || '–';
  const staffName = (id: string) => { const s = staff.find(x => x.id === id); return s ? `${s.prenom || ''} ${s.nom || ''}`.trim() : '–'; };

  // ── Calculs ──
  const totalIn = useMemo(() => incomes.reduce((a, b) => a + (Number(b.montant) || 0), 0), [incomes]);
  const totalOut = useMemo(() => expenses.reduce((a, b) => a + (Number(b.montant) || 0), 0), [expenses]);
  const solde = totalIn - totalOut;

  const monthKey = (d: string) => { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`; };
  const last6 = useMemo(() => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); }
    const labels: Record<string, string> = {};
    months.forEach(m => { const [y, mo] = m.split('-'); labels[m] = `${['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'][Number(mo) - 1]} ${y.slice(2)}`; });
    return months.map(m => ({
      month: labels[m],
      entrées: incomes.filter(x => monthKey(x.date_paiement || x.createdAt) === m).reduce((a, b) => a + (Number(b.montant) || 0), 0),
      sorties: expenses.filter(x => monthKey(x.date_paiement || x.createdAt) === m).reduce((a, b) => a + (Number(b.montant) || 0), 0),
    }));
  }, [incomes, expenses]);

  const pie = useMemo(() => {
    const byCat: Record<string, number> = {};
    expenses.forEach(e => { const c = e.categorie || 'autre'; byCat[c] = (byCat[c] || 0) + (Number(e.montant) || 0); });
    return Object.entries(byCat).map(([k, v]) => ({ name: EXPENSE_CATEGORIES[k]?.label || k, value: v, color: EXPENSE_CATEGORIES[k]?.color || '#6B7280' }));
  }, [expenses]);

  const attente = useMemo(() => {
    const inc = incomes.filter(x => ['attente', 'partiel', 'retarde'].includes(x.statut)).reduce((a, b) => a + (Number(b.montant) || 0), 0);
    const exp = expenses.filter(x => ['attente', 'partiel', 'retarde'].includes(x.statut)).reduce((a, b) => a + (Number(b.montant) || 0), 0);
    return { entrées: inc, sorties: exp };
  }, [incomes, expenses]);

  const echeances = useMemo(() => {
    const now = new Date().toISOString();
    const inc = incomes.filter(x => x.echeance && !['paye', 'annule'].includes(x.statut)).map(x => ({ ...x, sens: 'in', label: `${clientName(x.client_id)} — ${PAIEMENT_TYPES[x.type_paiement as keyof typeof PAIEMENT_TYPES] || x.type_paiement}` }));
    const exp = expenses.filter(x => x.echeance && !['paye', 'annule'].includes(x.statut)).map(x => ({ ...x, sens: 'out', label: x.fournisseur || EXPENSE_CATEGORIES[x.categorie]?.label || 'Dépense' }));
    return [...inc, ...exp].filter(x => x.echeance >= now.slice(0, 10)).sort((a, b) => a.echeance.localeCompare(b.echeance));
  }, [incomes, expenses, clients]);

  // ── CRUD ──
  const saveIncome = async () => {
    setSaving(true); setErr('');
    try {
      if (!incomeForm.montant) { setErr('Le montant est requis.'); return; }
      const payload = { ...incomeForm, montant: parseFloat(incomeForm.montant) || 0, client_id: incomeForm.client_id || null, event_id: incomeForm.event_id || null, echeance: incomeForm.echeance || null };
      if (editIncome) await crmApi.update('incomes', editIncome.id, payload);
      else await crmApi.create('incomes', payload);
      setShowIncome(false); setIncomeForm(incomeEmpty()); setEditIncome(null); load();
    } catch (e: any) { setErr(e.message || 'Erreur'); }
    finally { setSaving(false); }
  };
  const saveExpense = async () => {
    setSaving(true); setErr('');
    try {
      if (!expenseForm.montant) { setErr('Le montant est requis.'); return; }
      const payload = { ...expenseForm, montant: parseFloat(expenseForm.montant) || 0, event_id: expenseForm.event_id || null, employee_id: expenseForm.employee_id || null, echeance: expenseForm.echeance || null };
      if (editExpense) await crmApi.update('expenses', editExpense.id, payload);
      else await crmApi.create('expenses', payload);
      setShowExpense(false); setExpenseForm(expenseEmpty()); setEditExpense(null); load();
    } catch (e: any) { setErr(e.message || 'Erreur'); }
    finally { setSaving(false); }
  };
  const delIncome = async (id: string) => { if (!confirm('Supprimer cet encaissement ?')) return; await crmApi.delete('incomes', id).catch(console.warn); load(); };
  const delExpense = async (id: string) => { if (!confirm('Supprimer ce décaissement ?')) return; await crmApi.delete('expenses', id).catch(console.warn); load(); };

  // ── Export CSV ──
  const exportCSV = () => {
    const rows: string[][] = [
      ['Type', 'Date', 'Échéance', 'Sens', 'Catégorie/Type', 'Client/Fournisseur', 'Événement', 'Mode paiement', 'Statut', 'Montant (DT)', 'Référence facture', 'Description', 'Notes'],
    ];
    incomes.forEach(x => rows.push(['Encaissement', x.date_paiement || '', x.echeance || '', 'Entrée', PAIEMENT_TYPES[x.type_paiement as keyof typeof PAIEMENT_TYPES] || x.type_paiement, clientName(x.client_id), eventName(x.event_id), MODES_PAIEMENT[x.mode_paiement as keyof typeof MODES_PAIEMENT] || x.mode_paiement, x.statut, String(x.montant || 0), x.reference_facture || '', x.description || '', x.notes || '']));
    expenses.forEach(x => rows.push(['Décaissement', x.date_paiement || '', x.echeance || '', 'Sortie', EXPENSE_CATEGORIES[x.categorie]?.label || x.categorie, x.fournisseur || staffName(x.employee_id), eventName(x.event_id), MODES_PAIEMENT[x.mode_paiement as keyof typeof MODES_PAIEMENT] || x.mode_paiement, x.statut, String(x.montant || 0), x.reference_facture || '', x.description || '', x.notes || '']));
    const csv = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tresorerie-${today()}.csv`;
    a.click();
  };

  const filteredIn = incomes.filter(x =>
    (!search || `${clientName(x.client_id)} ${x.description || ''} ${x.reference_facture || ''}`.toLowerCase().includes(search.toLowerCase())) &&
    (!fStatut || x.statut === fStatut) && (!fMode || x.mode_paiement === fMode)
  );
  const filteredOut = expenses.filter(x =>
    (!search || `${x.fournisseur || ''} ${x.description || ''} ${EXPENSE_CATEGORIES[x.categorie]?.label || ''}`.toLowerCase().includes(search.toLowerCase())) &&
    (!fStatut || x.statut === fStatut) && (!fMode || x.mode_paiement === fMode) && (!fCat || x.categorie === fCat)
  );

  const StatBadge = ({ s }: { s: string }) => {
    const st = STATUTS[s as keyof typeof STATUTS] || { label: s, cls: 'bg-white/5 text-dark-400 border-white/10' };
    return <span className={`badge text-[11px] px-2 py-0.5 border ${st.cls}`}>{st.label}</span>;
  };
  const ModeTag = ({ m }: { m: string }) => (
    <span className="text-xs text-dark-400 flex items-center gap-1">
      {m === 'especes' ? <Banknote size={12} /> : m === 'cheque' ? <Landmark size={12} /> : <CreditCard size={12} />}
      {MODES_PAIEMENT[m as keyof typeof MODES_PAIEMENT] || m || '–'}
    </span>
  );

  const input = (k: string, v: any, set: any) => (
    <input value={v} onChange={e => { set((p: any) => ({ ...p, [k]: e.target.value })); setErr(''); }} className="input-field" />
  );

  return (
    <div>
      <PageHeader title="Trésorerie & Financement" subtitle="Suivi complet des encaissements, décaissements et échéances"
        action={
          <div className="flex gap-2">
            <button onClick={() => { setEditIncome(null); setIncomeForm(incomeEmpty()); setShowIncome(true); }} className="btn-gold py-2 px-4 text-sm flex items-center gap-2"><Plus size={15} />Encaissement</button>
            <button onClick={() => { setEditExpense(null); setExpenseForm(expenseEmpty()); setShowExpense(true); }} className="glass py-2 px-4 text-sm flex items-center gap-2 text-dark-300 hover:text-white"><Plus size={15} />Décaissement</button>
            <button onClick={exportCSV} className="glass py-2 px-4 text-sm flex items-center gap-2 text-dark-300 hover:text-white"><Download size={15} />Export CSV</button>
          </div>
        } />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Solde de trésorerie', value: solde, icon: <Wallet size={18} />, color: solde >= 0 ? 'text-gold-400' : 'text-red-400', bg: 'bg-gold-500/20' },
          { label: 'Total encaissé', value: totalIn, icon: <TrendingUp size={18} />, color: 'text-green-400', bg: 'bg-green-500/20' },
          { label: 'Total décaissé', value: totalOut, icon: <TrendingDown size={18} />, color: 'text-red-400', bg: 'bg-red-500/20' },
          { label: 'À encaisser (attente)', value: attente.entrées, icon: <CalendarClock size={18} />, color: 'text-blue-400', bg: 'bg-blue-500/20' },
        ].map((item, i) => (
          <div key={i} className="kpi-card">
            <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center ${item.color} mb-2`}>{item.icon}</div>
            <div className="text-2xl font-bold text-white">{formatPrice(item.value)}</div>
            <div className="text-dark-400 text-xs">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {([
          ['dash', 'Tableau de bord', <DollarSign size={14} key="i" />],
          ['incomes', `Encaissements (${incomes.length})`, <TrendingUp size={14} key="i" />],
          ['expenses', `Décaissements (${expenses.length})`, <TrendingDown size={14} key="i" />],
          ['echeances', `Échéances (${echeances.length})`, <CalendarClock size={14} key="i" />],
        ] as const).map(([k, label, icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === k ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white'}`}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── TABLEAU DE BORD ── */}
      {tab === 'dash' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
            <div className="lg:col-span-2 glass rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Flux de trésorerie (6 derniers mois)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={last6}>
                  <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="entrées" name="Entrées" fill="#34D399" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sorties" name="Sorties" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="glass rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Répartition des dépenses</h3>
              {pie.length === 0 ? <p className="text-dark-400 text-sm text-center py-10">Aucune dépense enregistrée</p> : (
                <div className="flex flex-col items-center gap-4">
                  <ResponsiveContainer width={150} height={150}>
                    <PieChart>
                      <Pie data={pie} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value" paddingAngle={2}>
                        {pie.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 w-full max-h-44 overflow-y-auto">
                    {pie.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-dark-300 flex-1 truncate">{d.name}</span>
                        <span className="text-white font-medium">{formatPrice(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="kpi-card"><p className="text-dark-400 text-xs mb-1">À encaisser</p><p className="text-xl font-bold text-blue-400">{formatPrice(attente.entrées)}</p><p className="text-dark-500 text-xs">paiements en attente</p></div>
            <div className="kpi-card"><p className="text-dark-400 text-xs mb-1">À payer</p><p className="text-xl font-bold text-orange-400">{formatPrice(attente.sorties)}</p><p className="text-dark-500 text-xs">dépenses en attente</p></div>
            <div className="kpi-card"><p className="text-dark-400 text-xs mb-1">Encaissements ({incomes.length})</p><p className="text-xl font-bold text-white">{incomes.length}</p><p className="text-dark-500 text-xs">opérations enregistrées</p></div>
            <div className="kpi-card"><p className="text-dark-400 text-xs mb-1">Décaissements ({expenses.length})</p><p className="text-xl font-bold text-white">{expenses.length}</p><p className="text-dark-500 text-xs">opérations enregistrées</p></div>
          </div>
        </>
      )}

      {/* ── ENCAISSEMENTS ── */}
      {tab === 'incomes' && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-40">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2 text-sm" placeholder="Rechercher..." />
            </div>
            <select value={fStatut} onChange={e => setFStatut(e.target.value)} className="input-field w-auto py-2 text-sm">
              <option value="">Tous statuts</option>
              {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={fMode} onChange={e => setFMode(e.target.value)} className="input-field w-auto py-2 text-sm">
              <option value="">Tous modes</option>
              {Object.entries(MODES_PAIEMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-white/10">
                {['Date', 'Client', 'Événement', 'Type', 'Mode', 'Réf. facture', 'Statut', 'Montant', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-dark-400 text-xs font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loading ? Array(5).fill(0).map((_, i) => <tr key={i} className="border-b border-white/5"><td colSpan={9} className="px-5 py-4"><div className="h-4 bg-dark-700 rounded animate-pulse" /></td></tr>) :
                  filteredIn.map(x => (
                    <tr key={x.id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="px-5 py-3.5 text-dark-300 text-sm whitespace-nowrap">{new Date(x.date_paiement).toLocaleDateString('fr-FR')}{x.echeance ? <div className="text-[10px] text-orange-400/80">échéance {new Date(x.echeance).toLocaleDateString('fr-FR')}</div> : null}</td>
                      <td className="px-5 py-3.5 text-white text-sm">{clientName(x.client_id)}</td>
                      <td className="px-5 py-3.5 text-dark-300 text-sm max-w-40 truncate">{eventName(x.event_id)}</td>
                      <td className="px-5 py-3.5"><span className="badge bg-dark-700 text-dark-200 text-xs">{PAIEMENT_TYPES[x.type_paiement as keyof typeof PAIEMENT_TYPES] || x.type_paiement}</span></td>
                      <td className="px-5 py-3.5"><ModeTag m={x.mode_paiement} /></td>
                      <td className="px-5 py-3.5 text-dark-400 text-xs font-mono">{x.reference_facture || '–'}</td>
                      <td className="px-5 py-3.5"><StatBadge s={x.statut} /></td>
                      <td className="px-5 py-3.5 text-green-400 font-bold text-sm whitespace-nowrap">+{formatPrice(x.montant)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1">
                          <button onClick={() => { setEditIncome(x); setIncomeForm({ ...incomeEmpty(), ...x }); setShowIncome(true); }} className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 transition-all"><Edit2 size={13} /></button>
                          <button onClick={() => delIncome(x.id)} className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {filteredIn.length === 0 && !loading && <tr><td colSpan={9} className="text-center py-12 text-dark-400">Aucun encaissement</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DÉCAISSEMENTS ── */}
      {tab === 'expenses' && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-40">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2 text-sm" placeholder="Rechercher..." />
            </div>
            <select value={fCat} onChange={e => setFCat(e.target.value)} className="input-field w-auto py-2 text-sm">
              <option value="">Toutes catégories</option>
              {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={fStatut} onChange={e => setFStatut(e.target.value)} className="input-field w-auto py-2 text-sm">
              <option value="">Tous statuts</option>
              {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={fMode} onChange={e => setFMode(e.target.value)} className="input-field w-auto py-2 text-sm">
              <option value="">Tous modes</option>
              {Object.entries(MODES_PAIEMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-white/10">
                {['Date', 'Catégorie', 'Fournisseur/Bénéficiaire', 'Événement', 'Mode', 'Réf. facture', 'Statut', 'Montant', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-dark-400 text-xs font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loading ? Array(5).fill(0).map((_, i) => <tr key={i} className="border-b border-white/5"><td colSpan={9} className="px-5 py-4"><div className="h-4 bg-dark-700 rounded animate-pulse" /></td></tr>) :
                  filteredOut.map(x => (
                    <tr key={x.id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="px-5 py-3.5 text-dark-300 text-sm whitespace-nowrap">{new Date(x.date_paiement).toLocaleDateString('fr-FR')}{x.echeance ? <div className="text-[10px] text-orange-400/80">échéance {new Date(x.echeance).toLocaleDateString('fr-FR')}</div> : null}</td>
                      <td className="px-5 py-3.5"><span className="badge bg-dark-700 text-dark-200 text-xs" style={{ borderColor: `${EXPENSE_CATEGORIES[x.categorie]?.color || '#6B7280'}55` }}>{EXPENSE_CATEGORIES[x.categorie]?.label || x.categorie}</span></td>
                      <td className="px-5 py-3.5 text-white text-sm">{x.fournisseur || staffName(x.employee_id) || '–'}</td>
                      <td className="px-5 py-3.5 text-dark-300 text-sm max-w-40 truncate">{eventName(x.event_id)}</td>
                      <td className="px-5 py-3.5"><ModeTag m={x.mode_paiement} /></td>
                      <td className="px-5 py-3.5 text-dark-400 text-xs font-mono">{x.reference_facture || '–'}</td>
                      <td className="px-5 py-3.5"><StatBadge s={x.statut} /></td>
                      <td className="px-5 py-3.5 text-red-400 font-bold text-sm whitespace-nowrap">-{formatPrice(x.montant)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1">
                          <button onClick={() => { setEditExpense(x); setExpenseForm({ ...expenseEmpty(), ...x }); setShowExpense(true); }} className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 transition-all"><Edit2 size={13} /></button>
                          <button onClick={() => delExpense(x.id)} className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {filteredOut.length === 0 && !loading && <tr><td colSpan={9} className="text-center py-12 text-dark-400">Aucun décaissement</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ÉCHÉANCES ── */}
      {tab === 'echeances' && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="text-white font-semibold text-sm">Paiements à venir ({echeances.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-white/10">
                {['Échéance', 'Sens', 'Description', 'Référence', 'Mode', 'Statut', 'Montant'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-dark-400 text-xs font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {echeances.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-dark-400">Aucune échéance à venir</td></tr> :
                  echeances.map(x => {
                    const days = Math.ceil((new Date(x.echeance).getTime() - Date.now()) / 86400000);
                    return (
                      <tr key={`${x.sens}-${x.id}`} className="border-b border-white/5 hover:bg-white/3">
                        <td className="px-5 py-3.5 text-white text-sm whitespace-nowrap">{new Date(x.echeance).toLocaleDateString('fr-FR')}
                          <span className={`ml-2 text-[10px] ${days < 0 ? 'text-red-400' : days <= 7 ? 'text-amber-400' : 'text-dark-400'}`}>{days < 0 ? `${-days}j de retard` : `J-${days}`}</span>
                        </td>
                        <td className="px-5 py-3.5"><span className={`badge text-[11px] px-2 py-0.5 ${x.sens === 'in' ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}`}>{x.sens === 'in' ? 'À encaisser' : 'À payer'}</span></td>
                        <td className="px-5 py-3.5 text-dark-200 text-sm">{x.label}</td>
                        <td className="px-5 py-3.5 text-dark-400 text-xs font-mono">{x.reference_facture || '–'}</td>
                        <td className="px-5 py-3.5"><ModeTag m={x.mode_paiement} /></td>
                        <td className="px-5 py-3.5"><StatBadge s={x.statut} /></td>
                        <td className={`px-5 py-3.5 font-bold text-sm ${x.sens === 'in' ? 'text-green-400' : 'text-red-400'}`}>{x.sens === 'in' ? '+' : '-'}{formatPrice(x.montant)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL ENCAISSEMENT ── */}
      {showIncome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowIncome(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10 p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editIncome ? 'Modifier l\'encaissement' : 'Nouvel encaissement'}</h2>
              <button onClick={() => setShowIncome(false)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            {err && <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-2.5">{err}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Montant (DT) *</label>
                <input type="number" value={incomeForm.montant} onChange={e => setIncomeForm(p => ({ ...p, montant: e.target.value }))} className="input-field" placeholder="0" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Type de paiement</label>
                <select value={incomeForm.type_paiement} onChange={e => setIncomeForm(p => ({ ...p, type_paiement: e.target.value }))} className="input-field">
                  {Object.entries(PAIEMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Mode de paiement</label>
                <select value={incomeForm.mode_paiement} onChange={e => setIncomeForm(p => ({ ...p, mode_paiement: e.target.value }))} className="input-field">
                  {Object.entries(MODES_PAIEMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Statut</label>
                <select value={incomeForm.statut} onChange={e => setIncomeForm(p => ({ ...p, statut: e.target.value }))} className="input-field">
                  {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Client</label>
                <select value={incomeForm.client_id} onChange={e => setIncomeForm(p => ({ ...p, client_id: e.target.value }))} className="input-field">
                  <option value="">Sélectionner</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Événement</label>
                <select value={incomeForm.event_id} onChange={e => setIncomeForm(p => ({ ...p, event_id: e.target.value }))} className="input-field">
                  <option value="">Sélectionner</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Date de paiement</label>
                <input type="date" value={incomeForm.date_paiement} onChange={e => setIncomeForm(p => ({ ...p, date_paiement: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Échéance</label>
                <input type="date" value={incomeForm.echeance} onChange={e => setIncomeForm(p => ({ ...p, echeance: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Référence facture</label>
                {input('reference_facture', incomeForm.reference_facture, setIncomeForm)}
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">N° reçu</label>
                {input('numero_reçu', incomeForm.numero_reçu, setIncomeForm)}
              </div>
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Description</label>
                {input('description', incomeForm.description, setIncomeForm)}
              </div>
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Notes</label>
                <textarea value={incomeForm.notes} onChange={e => setIncomeForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="input-field resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowIncome(false)} className="btn-ghost flex-1 py-2.5">Annuler</button>
              <button onClick={saveIncome} disabled={saving} className="btn-gold flex-1 py-2.5 disabled:opacity-60">{saving ? 'Sauvegarde...' : editIncome ? 'Enregistrer' : 'Enregistrer l\'encaissement'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DÉCAISSEMENT ── */}
      {showExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowExpense(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10 p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editExpense ? 'Modifier le décaissement' : 'Nouveau décaissement'}</h2>
              <button onClick={() => setShowExpense(false)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            {err && <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-2.5">{err}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Montant (DT) *</label>
                <input type="number" value={expenseForm.montant} onChange={e => setExpenseForm(p => ({ ...p, montant: e.target.value }))} className="input-field" placeholder="0" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Catégorie</label>
                <select value={expenseForm.categorie} onChange={e => setExpenseForm(p => ({ ...p, categorie: e.target.value }))} className="input-field">
                  {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Mode de paiement</label>
                <select value={expenseForm.mode_paiement} onChange={e => setExpenseForm(p => ({ ...p, mode_paiement: e.target.value }))} className="input-field">
                  {Object.entries(MODES_PAIEMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Statut</label>
                <select value={expenseForm.statut} onChange={e => setExpenseForm(p => ({ ...p, statut: e.target.value }))} className="input-field">
                  {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Fournisseur / Bénéficiaire</label>
                {input('fournisseur', expenseForm.fournisseur, setExpenseForm)}
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Employé (salaires)</label>
                <select value={expenseForm.employee_id} onChange={e => setExpenseForm(p => ({ ...p, employee_id: e.target.value }))} className="input-field">
                  <option value="">Sélectionner</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{`${s.prenom || ''} ${s.nom || ''}`.trim()}</option>)}
                </select>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Événement</label>
                <select value={expenseForm.event_id} onChange={e => setExpenseForm(p => ({ ...p, event_id: e.target.value }))} className="input-field">
                  <option value="">Sélectionner</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Référence facture</label>
                {input('reference_facture', expenseForm.reference_facture, setExpenseForm)}
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Date de paiement</label>
                <input type="date" value={expenseForm.date_paiement} onChange={e => setExpenseForm(p => ({ ...p, date_paiement: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Échéance</label>
                <input type="date" value={expenseForm.echeance} onChange={e => setExpenseForm(p => ({ ...p, echeance: e.target.value }))} className="input-field" />
              </div>
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Description</label>
                {input('description', expenseForm.description, setExpenseForm)}
              </div>
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Notes</label>
                <textarea value={expenseForm.notes} onChange={e => setExpenseForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="input-field resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowExpense(false)} className="btn-ghost flex-1 py-2.5">Annuler</button>
              <button onClick={saveExpense} disabled={saving} className="btn-gold flex-1 py-2.5 disabled:opacity-60">{saving ? 'Sauvegarde...' : editExpense ? 'Enregistrer' : 'Enregistrer le décaissement'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
