import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Edit2, Trash2, X, Star, MapPin, Phone, Mail,
  Globe, Users, Package, Check, ChevronDown, ChevronUp, Eye, EyeOff,
  Filter, BarChart3, User, Music
} from 'lucide-react';
import { providersApi, servicesApi, Provider, ServiceItem, ProviderComposition } from '@/lib/neonApi';
import { formatPrice } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';

const emptyForm = {
  name: '', description: '', price: '', originalPrice: '',
  city: '', address: '', phone: '', email: '', website: '',
  serviceId: '', isAvailable: true, displayOrder: '0',
};

export default function AdminProviders() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [stats, setStats] = useState({ total: 0, active: 0, withComposition: 0, inPacks: 0 });

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [compositionForm, setCompositionForm] = useState<{ role: string; quantity: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Composition sub-modal
  const [compModal, setCompModal] = useState<Provider | null>(null);
  const [compList, setCompList] = useState<ProviderComposition[]>([]);
  const [newComp, setNewComp] = useState({ role: '', quantity: '1' });
  const [loadingComp, setLoadingComp] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (filterService) params.serviceId = filterService;
      if (filterActive) params.active = filterActive;
      const [provList, svcList, statsData] = await Promise.all([
        providersApi.list(params),
        servicesApi.list({ limit: 100 }),
        providersApi.stats(),
      ]);
      setProviders(provList);
      setServices(svcList.data);
      setStats(statsData);
    } catch (e: any) {
      toastError('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setCompositionForm([{ role: '', quantity: '1' }]);
    setEditing(null);
    setShowCreate(true);
  };

  const openEdit = (p: Provider) => {
    setForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      originalPrice: p.originalPrice != null ? String(p.originalPrice) : '',
      city: p.city || '',
      address: p.address || '',
      phone: p.phone || '',
      email: p.email || '',
      website: p.website || '',
      serviceId: p.serviceId,
      isAvailable: p.isAvailable,
      displayOrder: String(p.displayOrder),
    });
    setCompositionForm((p.composition || []).map(c => ({ role: c.role, quantity: String(c.quantity) })));
    setEditing(p);
    setShowCreate(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.serviceId) {
      toastError('Erreur', 'Nom et service requis'); return;
    }
    setSaving(true);
    try {
      const body: any = {
        name: form.name,
        description: form.description || null,
        price: form.price ? Number(form.price) : 0,
        originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
        city: form.city || null,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        serviceId: form.serviceId,
        isAvailable: form.isAvailable,
        displayOrder: form.displayOrder ? Number(form.displayOrder) : 0,
        composition: compositionForm.filter(c => c.role.trim()).map(c => ({
          role: c.role,
          quantity: Number(c.quantity) || 1,
        })),
      };

      if (editing) {
        await providersApi.update(editing.id, body);
        success('Prestataire mis à jour');
      } else {
        await providersApi.create(body);
        success('Prestataire créé');
      }
      setShowCreate(false);
      load();
    } catch (e: any) {
      toastError('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Provider) => {
    try {
      await providersApi.toggleStatus(p.id);
      success(p.active ? 'Désactivé' : 'Activé');
      load();
    } catch (e: any) { toastError('Erreur', e.message); }
  };

  const remove = async (p: Provider) => {
    if (!confirm(`Supprimer "${p.name}" ?`)) return;
    try {
      await providersApi.delete(p.id);
      success('Supprimé');
      load();
    } catch (e: any) { toastError('Erreur', e.message); }
  };

  // Composition management
  const openComposition = async (p: Provider) => {
    setCompModal(p);
    setLoadingComp(true);
    try {
      const list = await providersApi.getCompositions(p.id);
      setCompList(list);
    } catch { setCompList([]); }
    finally { setLoadingComp(false); }
  };

  const addComp = async () => {
    if (!compModal || !newComp.role.trim()) return;
    try {
      await providersApi.addComposition(compModal.id, { role: newComp.role, quantity: Number(newComp.quantity) || 1 });
      setNewComp({ role: '', quantity: '1' });
      const list = await providersApi.getCompositions(compModal.id);
      setCompList(list);
      load();
    } catch (e: any) { toastError('Erreur', e.message); }
  };

  const removeComp = async (memberId: string) => {
    try {
      await providersApi.deleteComposition(memberId);
      setCompList(prev => prev.filter(c => c.id !== memberId));
      load();
    } catch (e: any) { toastError('Erreur', e.message); }
  };

  const filtered = providers;

  return (
    <div>
      <PageHeader
        title="Prestataires"
        subtitle={stats.total ? `${stats.active} actifs / ${stats.total} total` : undefined}
        action={
          <button onClick={openCreate} className="btn-gold py-2 px-4 text-sm flex items-center gap-2">
            <Plus size={15} /> Nouveau prestataire
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'text-white' },
          { label: 'Actifs', value: stats.active, icon: Check, color: 'text-green-400' },
          { label: 'Avec équipe', value: stats.withComposition, icon: Music, color: 'text-blue-400' },
          { label: 'Dans des packs', value: stats.inPacks, icon: Package, color: 'text-gold-400' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-3 text-center">
            <s.icon size={18} className={`mx-auto mb-1 ${s.color}`} />
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-dark-500 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Rechercher..." className="input-field w-full py-2 pl-9 pr-3 text-sm" />
        </div>
        <select value={filterService} onChange={e => setFilterService(e.target.value)} className="input-field py-2 text-sm w-full sm:w-48">
          <option value="">Tous les services</option>
          {services.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
        </select>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value)} className="input-field py-2 text-sm w-full sm:w-36">
          <option value="">Tous</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="glass rounded-2xl h-48 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Users size={36} className="mx-auto mb-3 text-dark-600" />
          <p className="text-dark-400 text-sm mb-4">Aucun prestataire trouvé</p>
          <button onClick={openCreate} className="btn-gold py-2 px-6 text-sm">Créer un prestataire</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className={`glass rounded-2xl p-4 flex flex-col transition-all hover:-translate-y-1 ${!p.active ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-gold-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold text-sm truncate">{p.name}</h3>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.isAvailable ? 'bg-green-400' : 'bg-yellow-400'}`} />
                  </div>
                  <p className="text-dark-400 text-xs">{p.service?.name || '—'}</p>
                </div>
                {p.rating != null && (
                  <div className="flex items-center gap-1 bg-gold-500/10 rounded-lg px-2 py-1 flex-shrink-0">
                    <Star size={12} className="text-gold-400 fill-gold-400" />
                    <span className="text-gold-400 text-xs font-medium">{p.rating}</span>
                    <span className="text-dark-500 text-[10px]">({p.reviewCount})</span>
                  </div>
                )}
              </div>

              {p.description && <p className="text-dark-400 text-xs line-clamp-2 mb-3">{p.description}</p>}

              <div className="flex flex-wrap gap-2 text-xs text-dark-400 mb-3">
                {p.city && <span className="flex items-center gap-1"><MapPin size={11} />{p.city}</span>}
                {p.phone && <span className="flex items-center gap-1"><Phone size={11} />{p.phone}</span>}
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-gold-400 font-bold text-sm">{formatPrice(p.price)}</span>
                {p.originalPrice != null && p.originalPrice > p.price && (
                  <span className="text-dark-500 text-xs line-through">{formatPrice(p.originalPrice)}</span>
                )}
              </div>

              {p.composition && p.composition.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {p.composition.slice(0, 3).map(c => (
                    <span key={c.id} className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                      {c.role} ×{c.quantity}
                    </span>
                  ))}
                  {p.composition.length > 3 && (
                    <span className="text-[10px] text-dark-500">+{p.composition.length - 3}</span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1 mt-auto pt-2 border-t border-white/5">
                <button onClick={() => navigate(`/admin/prestataires/${p.id}`)} className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 transition-all" title="Voir le profil">
                  <Eye size={13} />
                </button>
                <button onClick={() => openComposition(p)} className="p-1.5 rounded-lg text-dark-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Équipe">
                  <Users size={13} />
                </button>
                <button onClick={() => navigate(`/admin/services/${p.serviceId}`)} className="p-1.5 rounded-lg text-dark-400 hover:text-gold-400 hover:bg-gold-500/10 transition-all" title="Service">
                  <Package size={13} />
                </button>
                <button onClick={() => toggleActive(p)} className="p-1.5 rounded-lg text-dark-400 hover:text-green-400 hover:bg-green-500/10 transition-all" title={p.active ? 'Désactiver' : 'Activer'}>
                  {p.active ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <div className="flex-1" />
                <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-dark-400 hover:text-gold-400 hover:bg-gold-500/10 transition-all" title="Modifier">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => remove(p)} className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Supprimer">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create/Edit Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-lg w-full z-10 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">{editing ? 'Modifier' : 'Nouveau'} prestataire</h2>
              <button onClick={() => setShowCreate(false)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-dark-300 text-xs mb-1 block">Nom *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-field w-full py-2.5 text-sm" placeholder="Photographe Mayar" />
              </div>
              <div>
                <label className="text-dark-300 text-xs mb-1 block">Service *</label>
                <select value={form.serviceId} onChange={e => setForm(p => ({ ...p, serviceId: e.target.value }))} className="input-field w-full py-2.5 text-sm">
                  <option value="">— Choisir —</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-dark-300 text-xs mb-1 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="input-field w-full py-2.5 text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Prix (DT)</label>
                  <input type="number" min="0" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="input-field w-full py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Prix original (DT)</label>
                  <input type="number" min="0" value={form.originalPrice} onChange={e => setForm(p => ({ ...p, originalPrice: e.target.value }))} className="input-field w-full py-2.5 text-sm" placeholder="—" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Ville</label>
                  <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="input-field w-full py-2.5 text-sm" placeholder="Sfax" />
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Adresse</label>
                  <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="input-field w-full py-2.5 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Téléphone</label>
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="input-field w-full py-2.5 text-sm" placeholder="+216..." />
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="input-field w-full py-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-dark-300 text-xs mb-1 block">Site web</label>
                <input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} className="input-field w-full py-2.5 text-sm" placeholder="https://..." />
              </div>

              {/* Composition */}
              <div className="border-t border-white/10 pt-4">
                <p className="text-gold-400 text-xs font-semibold uppercase tracking-wide mb-3">Équipe / Composition</p>
                {compositionForm.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input value={c.role} onChange={e => { const arr = [...compositionForm]; arr[i].role = e.target.value; setCompositionForm(arr); }}
                      className="input-field flex-1 py-2 text-sm" placeholder="Rôle (ex: Chanteur)" />
                    <input type="number" min="1" value={c.quantity} onChange={e => { const arr = [...compositionForm]; arr[i].quantity = e.target.value; setCompositionForm(arr); }}
                      className="input-field w-16 py-2 text-sm text-center" />
                    {compositionForm.length > 1 && (
                      <button onClick={() => setCompositionForm(prev => prev.filter((_, j) => j !== i))} className="text-dark-500 hover:text-red-400"><X size={14} /></button>
                    )}
                  </div>
                ))}
                <button onClick={() => setCompositionForm(prev => [...prev, { role: '', quantity: '1' }])}
                  className="text-dark-400 hover:text-white text-xs flex items-center gap-1 mt-1">
                  <Plus size={12} /> Ajouter un membre
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setForm(p => ({ ...p, isAvailable: !p.isAvailable }))}
                  className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ${form.isAvailable ? 'bg-gold-500' : 'bg-dark-600'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.isAvailable ? 'left-6' : 'left-1'}`} />
                </button>
                <span className="text-dark-200 text-sm">Disponible</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-white/10">
              <button onClick={() => setShowCreate(false)} className="py-2 px-5 text-sm text-dark-300 hover:text-white">Annuler</button>
              <button onClick={save} disabled={saving || !form.name.trim() || !form.serviceId} className="btn-gold py-2 px-6 text-sm disabled:opacity-50">
                {saving ? '...' : editing ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Composition Modal ── */}
      {compModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setCompModal(null)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-md w-full z-10">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold text-white">Équipe</h2>
                <p className="text-dark-400 text-xs">{compModal.name}</p>
              </div>
              <button onClick={() => setCompModal(null)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5">
              {loadingComp ? (
                <div className="space-y-2">{Array(3).fill(0).map((_, i) => <div key={i} className="h-10 bg-dark-700 rounded-xl animate-pulse" />)}</div>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {compList.length === 0 ? (
                      <p className="text-dark-500 text-xs text-center py-4">Aucun membre</p>
                    ) : compList.map(c => (
                      <div key={c.id} className="flex items-center gap-3 p-2.5 bg-dark-700 rounded-xl">
                        <User size={14} className="text-dark-400" />
                        <span className="text-white text-sm flex-1">{c.role}</span>
                        <span className="text-dark-400 text-xs">×{c.quantity}</span>
                        <button onClick={() => removeComp(c.id)} className="text-dark-500 hover:text-red-400"><Trash2 size={12} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input value={newComp.role} onChange={e => setNewComp(p => ({ ...p, role: e.target.value }))}
                      className="input-field flex-1 py-2 text-sm" placeholder="Rôle" onKeyDown={e => e.key === 'Enter' && addComp()} />
                    <input type="number" min="1" value={newComp.quantity} onChange={e => setNewComp(p => ({ ...p, quantity: e.target.value }))}
                      className="input-field w-16 py-2 text-sm text-center" />
                    <button onClick={addComp} disabled={!newComp.role.trim()} className="btn-gold py-2 px-3 text-sm disabled:opacity-50">
                      <Plus size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
