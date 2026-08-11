import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, X, Edit2, Package, Wrench, Users } from 'lucide-react';
import { eventsApi, usersApi, packsApi, type NeonEvent, type NeonPack } from '@/lib/neonApi';
import { crmApi } from '@/lib/crmApi';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';

const statusOptions = ['preparation', 'en_cours', 'termine', 'annule'];
const statusColor: Record<string, string> = {
  preparation: 'bg-yellow-500/20 text-yellow-400',
  en_cours:    'bg-blue-500/20 text-blue-400',
  termine:     'bg-green-500/20 text-green-400',
  annule:      'bg-red-500/20 text-red-400',
};

const personnelUnit = (p: any) => p?.mode_paiement === 'jour' ? '/jour' : p?.mode_paiement === '2jours' ? '/2 jours' : '/mois';

function validate(f: any): string | null {
  if (!f.title?.trim())    return 'Le titre est requis.';
  if (!f.location?.trim()) return 'Le lieu est requis.';
  if (!f.date)             return 'La date est requise.';
  if (!f.capacity || isNaN(Number(f.capacity)) || Number(f.capacity) < 1) return 'Capacité invalide.';
  return null;
}

export default function AdminEvenements() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [events, setEvents]     = useState<NeonEvent[]>([]);
  const [clients, setClients]   = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState<NeonEvent | null>(null);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ title:'', description:'', location:'', date:'', imageUrl:'', capacity:'', price:'', clientId:'', isPublished: false });
  const [packs, setPacks]         = useState<NeonPack[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [selPacks, setSelPacks]   = useState<Set<string>>(new Set());
  const [selEquips, setSelEquips] = useState<Record<string, number>>({});
  const [selPersonnel, setSelPersonnel] = useState<Set<string>>(new Set());

  const sumOf = (ids: Set<string>, items: any[], key: string) =>
    Array.from(ids).reduce((acc, id) => {
      const it = items.find(i => i.id === id);
      return acc + (it ? Number(it[key]) || 0 : 0);
    }, 0);

  const sumEquips = (map: Record<string, number>) =>
    Object.entries(map).reduce((acc, [id, qty]) => {
      const it = equipments.find(i => i.id === id);
      return acc + (it ? (Number(it.prix_location) || 0) * (qty || 1) : 0);
    }, 0);

  const prestationsTotal = useMemo(() =>
    Math.round((sumOf(selPacks, packs, 'price') + sumEquips(selEquips) + sumOf(selPersonnel, personnel, 'salaire')) * 100) / 100,
    [selPacks, selEquips, selPersonnel, packs, equipments, personnel]);

  const applySelections = (nextP: Set<string>, nextE: Record<string, number>, nextPe: Set<string>) => {
    const t = Math.round((sumOf(nextP, packs, 'price') + sumEquips(nextE) + sumOf(nextPe, personnel, 'salaire')) * 100) / 100;
    setForm(p => ({ ...p, price: String(t) }));
  };

  const togglePack = (id: string) => {
    const next = new Set(selPacks);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelPacks(next);
    applySelections(next, selEquips, selPersonnel);
  };
  const toggleEquip = (id: string) => {
    const next = { ...selEquips };
    if (next[id] !== undefined) delete next[id];
    else next[id] = 1;
    setSelEquips(next);
    applySelections(selPacks, next, selPersonnel);
  };
  const setEquipQty = (id: string, qty: number) => {
    const next = { ...selEquips };
    if (qty < 1) delete next[id];
    else next[id] = qty;
    setSelEquips(next);
    applySelections(selPacks, next, selPersonnel);
  };
  const togglePersonnel = (id: string) => {
    const next = new Set(selPersonnel);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelPersonnel(next);
    applySelections(selPacks, selEquips, next);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [res, users] = await Promise.all([
        eventsApi.list({ limit: 100 }),
        usersApi.list().catch(() => []),
      ]);
      setEvents(res.data);
      setClients(users
        .filter(u => u.role === 'USER')
        .map(u => ({ id: u.id, label: `${u.prenom || u.name} ${u.nom || ''}`.trim() || u.name })));
    } catch (e: any) { toastError('Erreur', e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    packsApi.list().then(setPacks).catch(() => {});
    crmApi.list('equipment').then(setEquipments).catch(() => {});
    crmApi.list('personnel').then(setPersonnel).catch(() => {});
  }, []);

  const clientName = (id?: string | null) => id ? (clients.find(c => c.id === id)?.label || '–') : '–';

  const openCreate = () => {
    setEditing(null);
    setForm({ title:'',description:'',location:'',date:'',imageUrl:'',capacity:'',price:'',clientId:'',isPublished:false });
    setSelPacks(new Set()); setSelEquips({}); setSelPersonnel(new Set());
    setFormError(''); setShowModal(true);
  };

  const openEdit = async (ev: NeonEvent) => {
    setEditing(ev);
    setForm({ title: ev.title, description: ev.description||'', location: ev.location, date: ev.date.slice(0,16), imageUrl: ev.imageUrl||'', capacity: String(ev.capacity), price: String(ev.price), clientId: ev.clientId || '', isPublished: ev.isPublished });
    setSelPacks(new Set()); setSelEquips({}); setSelPersonnel(new Set());
    try {
      const recs = await crmApi.list('event_prestations');
      const rec = recs.find(r => r.event_id === ev.id);
      if (rec) {
        setSelPacks(new Set(rec.packs || []));
        const eqMap: Record<string, number> = {};
        (rec.equipments || []).forEach((e: any) => {
          if (typeof e === 'string') eqMap[e] = 1;
          else if (e && e.id) eqMap[e.id] = Number(e.quantite) || 1;
        });
        setSelEquips(eqMap);
        setSelPersonnel(new Set(rec.personnel || []));
      }
    } catch { /* pas de prestations enregistrées */ }
    setFormError(''); setShowModal(true);
  };

  const handleSave = async () => {
    const err = validate(form);
    if (err) { setFormError(err); return; }
    setSaving(true);
    try {
      const body = { title: form.title, description: form.description||null, location: form.location, date: form.date, imageUrl: form.imageUrl||null, capacity: Number(form.capacity), price: Number(form.price)||0, clientId: form.clientId || null, isPublished: form.isPublished };
      let ev: NeonEvent | null = null;
      if (editing) {
        ev = await eventsApi.update(editing.id, body);
        success('Événement modifié ✓', form.title);
      } else {
        ev = await eventsApi.create(body);
        success('Événement créé ✓', form.title);
      }
      if (ev?.id) {
        const prestations = { event_id: ev.id, packs: Array.from(selPacks), equipments: Object.entries(selEquips).map(([id, quantite]) => ({ id, quantite })), personnel: Array.from(selPersonnel) };
        try {
          const recs = await crmApi.list('event_prestations');
          const rec = recs.find(r => r.event_id === ev.id);
          if (rec) await crmApi.update('event_prestations', rec.id, prestations);
          else await crmApi.create('event_prestations', prestations);
        } catch { /* stockage des prestations non bloquant */ }
      }
      setShowModal(false); load();
    } catch (e: any) { toastError('Erreur', e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Supprimer "${title}" ?`)) return;
    try { await eventsApi.delete(id); setEvents(p => p.filter(e => e.id !== id)); success('Événement supprimé'); }
    catch (e: any) { toastError('Erreur', e.message); }
  };

  const filtered = events.filter(e =>
    `${e.title} ${e.location} ${clientName(e.clientId)}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6">
      <PageHeader title="Événements (Neon DB)" subtitle={`${events.length} événements`}
        action={<button onClick={openCreate} className="btn-gold py-2 px-4 text-sm flex items-center gap-2"><Plus size={15} />Nouvel événement</button>} />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2.5 text-sm w-full" placeholder="Titre, lieu..." />
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Titre','Client','Lieu','Date','Capacité','Prix','Publié','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 text-dark-400 text-xs font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <SkeletonTable rows={6} /> : filtered.map(ev => (
                <tr key={ev.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3.5">
                    <button onClick={() => navigate(`/admin/evenements/${ev.id}`)} className="text-left group">
                      <p className="text-white text-sm font-medium group-hover:text-gold-400 transition-colors">{ev.title}</p>
                      {ev.description && <p className="text-dark-500 text-xs truncate max-w-48">{ev.description}</p>}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-dark-300 text-sm">{clientName(ev.clientId)}</td>
                  <td className="px-4 py-3.5 text-dark-300 text-sm">{ev.location}</td>
                  <td className="px-4 py-3.5 text-dark-300 text-sm">{new Date(ev.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3.5 text-dark-300 text-sm">{ev.capacity}</td>
                  <td className="px-4 py-3.5 text-gold-400 font-bold text-sm">{ev.price > 0 ? `${ev.price} DT` : 'Gratuit'}</td>
                  <td className="px-4 py-3.5">
                    <span className={`badge border text-xs ${ev.isPublished ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-dark-700 text-dark-400 border-dark-600'}`}>
                      {ev.isPublished ? 'Oui' : 'Non'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(ev)} className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 transition-all"><Edit2 size={13} /></button>
                      <button onClick={() => handleDelete(ev.id, ev.title)} className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && <div className="text-center py-12 text-dark-400">Aucun événement</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto z-10 p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editing ? 'Modifier l\'événement' : 'Nouvel événement'}</h2>
              <button onClick={() => setShowModal(false)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            {formError && <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-2.5">{formError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Titre *</label>
                <input value={form.title} onChange={e => { setForm(p=>({...p,title:e.target.value})); setFormError(''); }} className="input-field" />
              </div>
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Client</label>
                <select value={form.clientId} onChange={e => { setForm(p=>({...p,clientId:e.target.value})); setFormError(''); }} className="input-field">
                  <option value="">— Aucun client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <p className="text-dark-500 text-xs mt-1">Si un client et un prix sont renseignés, l'événement alimentera automatiquement la trésorerie.</p>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Lieu *</label>
                <input value={form.location} onChange={e => { setForm(p=>({...p,location:e.target.value})); setFormError(''); }} className="input-field" placeholder="Ville, salle..." />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Date & heure *</label>
                <input type="datetime-local" value={form.date} onChange={e => { setForm(p=>({...p,date:e.target.value})); setFormError(''); }} className="input-field" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Capacité *</label>
                <input type="number" min="1" value={form.capacity} onChange={e => { setForm(p=>({...p,capacity:e.target.value})); setFormError(''); }} className="input-field" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Prix (DT)</label>
                <input type="number" min="0" value={form.price} onChange={e => setForm(p=>({...p,price:e.target.value}))} className="input-field" placeholder="0 = gratuit" />
              </div>
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Prestations incluses</label>
                <div className="bg-dark-700 rounded-xl p-3 space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Package size={13} className="text-gold-500" />
                      <span className="text-dark-300 text-xs font-semibold uppercase tracking-wider">Packs</span>
                    </div>
                    {packs.length === 0 ? <p className="text-dark-600 text-xs">Aucun pack actif</p> : (
                      <div className="flex flex-wrap gap-1.5">
                        {packs.map(p => (
                          <button key={p.id} type="button" onClick={() => togglePack(p.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${selPacks.has(p.id) ? 'bg-gold-500 text-dark-900 border-gold-500' : 'bg-dark-800 text-dark-300 border-dark-600 hover:border-gold-500/40'}`}>
                            {p.name} · {Number(p.price || 0).toLocaleString('fr-FR')} DT
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Wrench size={13} className="text-gold-500" />
                      <span className="text-dark-300 text-xs font-semibold uppercase tracking-wider">Équipements</span>
                    </div>
                    {equipments.length === 0 ? <p className="text-dark-600 text-xs">Aucun équipement</p> : (
                      <div className="flex flex-wrap gap-1.5">
                        {equipments.map(eq => {
                          const qty = selEquips[eq.id];
                          const active = qty !== undefined;
                          return (
                            <div key={eq.id}
                              className={`flex items-center gap-1 rounded-lg text-xs border transition-all ${active ? 'bg-gold-500 text-dark-900 border-gold-500' : 'bg-dark-800 text-dark-300 border-dark-600 hover:border-gold-500/40'}`}>
                              <button type="button" onClick={() => toggleEquip(eq.id)} className="px-2.5 py-1">
                                {eq.nom} · {Number(eq.prix_location || 0).toLocaleString('fr-FR')} DT/j
                              </button>
                              {active && (
                                <div className="flex items-center gap-1 pr-1.5">
                                  <button type="button" onClick={() => setEquipQty(eq.id, qty - 1)}
                                    className="w-5 h-5 rounded bg-dark-900/40 text-dark-900 font-bold leading-none">−</button>
                                  <span className="text-dark-900 font-bold min-w-4 text-center">{qty}</span>
                                  <button type="button" onClick={() => setEquipQty(eq.id, qty + 1)}
                                    className="w-5 h-5 rounded bg-dark-900/40 text-dark-900 font-bold leading-none">+</button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Users size={13} className="text-gold-500" />
                      <span className="text-dark-300 text-xs font-semibold uppercase tracking-wider">Personnel</span>
                    </div>
                    {personnel.length === 0 ? <p className="text-dark-600 text-xs">Aucun personnel</p> : (
                      <div className="flex flex-wrap gap-1.5">
                        {personnel.map(p => (
                          <button key={p.id} type="button" onClick={() => togglePersonnel(p.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${selPersonnel.has(p.id) ? 'bg-gold-500 text-dark-900 border-gold-500' : 'bg-dark-800 text-dark-300 border-dark-600 hover:border-gold-500/40'}`}>
                            {[p.prenom, p.nom].filter(Boolean).join(' ') || 'Personnel'} · {Number(p.salaire || 0).toLocaleString('fr-FR')} DT{personnelUnit(p)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-dark-300 text-sm">Total prestations</span>
                    <span className="text-gold-500 font-bold">{prestationsTotal.toLocaleString('fr-FR')} DT</span>
                  </div>
                  <p className="text-dark-500 text-[11px] leading-snug">Le prix de l'événement est mis à jour automatiquement à chaque sélection — vous pouvez ensuite le modifier manuellement.</p>
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Image URL</label>
                <input value={form.imageUrl} onChange={e => setForm(p=>({...p,imageUrl:e.target.value}))} className="input-field" placeholder="https://..." />
              </div>
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} rows={3} className="input-field resize-none" />
              </div>
              <div className="col-span-2 flex items-center gap-3 p-3 bg-dark-700 rounded-xl">
                <button type="button" onClick={() => setForm(p=>({...p,isPublished:!p.isPublished}))}
                  className={`relative w-11 h-6 rounded-full transition-all ${form.isPublished ? 'bg-gold-500' : 'bg-dark-600'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.isPublished ? 'left-6' : 'left-1'}`} />
                </button>
                <span className="text-dark-200 text-sm">Publié (visible côté client)</span>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-ghost flex-1 py-2.5">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="btn-gold flex-1 py-2.5 disabled:opacity-60">{saving ? 'Sauvegarde...' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
