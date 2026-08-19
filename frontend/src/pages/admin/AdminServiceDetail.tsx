import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Settings, Package, Box, Trash2, Edit2, Save, X,
  ToggleLeft, ToggleRight, GripVertical, Star
} from 'lucide-react';
import { servicesApi, ServiceItem, ServiceParameter, ServiceResource } from '@/lib/neonApi';
import { formatPrice } from '@/lib/format';

const paramTypes = [
  { value: 'TEXT', label: 'Texte' },
  { value: 'TEXTAREA', label: 'Texte long' },
  { value: 'NUMBER', label: 'Nombre' },
  { value: 'BOOLEAN', label: 'Oui / Non' },
  { value: 'SELECT', label: 'Sélection' },
  { value: 'MULTI_SELECT', label: 'Multi-sélection' },
  { value: 'RESOURCE_SELECT', label: 'Sélection ressource' },
  { value: 'DATE', label: 'Date' },
  { value: 'TIME', label: 'Heure' },
  { value: 'DURATION', label: 'Durée' },
  { value: 'PRICE', label: 'Prix' },
  { value: 'QUANTITY', label: 'Quantité' },
];

const resourceDispoOptions = ['DISPONIBLE', 'INDISPONIBLE', 'MAINTENANCE', 'RESERVEE'];

export default function AdminServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [service, setService] = useState<ServiceItem | null>(null);
  const [parameters, setParameters] = useState<ServiceParameter[]>([]);
  const [resources, setResources] = useState<ServiceResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'info' | 'parameters' | 'resources' | 'packs'>('info');

  // Parameter form
  const [showParamModal, setShowParamModal] = useState(false);
  const [editingParam, setEditingParam] = useState<ServiceParameter | null>(null);
  const [paramForm, setParamForm] = useState({ name: '', type: 'TEXT', options: '', required: false, displayOrder: '0', group: '', description: '' });

  // Resource form
  const [showResModal, setShowResModal] = useState(false);
  const [editingRes, setEditingRes] = useState<ServiceResource | null>(null);
  const [resForm, setResForm] = useState({ name: '', description: '', image: '', basePrice: '', capacity: '', location: '', city: '', availability: 'DISPONIBLE', displayOrder: '0' });

  const load = async () => {
    if (!id) return;
    try {
      const [svc, params, res] = await Promise.all([
        servicesApi.get(id),
        servicesApi.getParameters(id),
        servicesApi.getResources(id),
      ]);
      setService(svc);
      setParameters(params);
      setResources(res);
    } catch (e) {
      console.warn('[AdminServiceDetail] load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  // ── Parameters CRUD ──
  const openParamCreate = () => {
    setEditingParam(null);
    setParamForm({ name: '', type: 'TEXT', options: '', required: false, displayOrder: '0', group: '', description: '' });
    setShowParamModal(true);
  };

  const openParamEdit = (p: ServiceParameter) => {
    setEditingParam(p);
    setParamForm({
      name: p.name,
      type: p.type,
      options: Array.isArray(p.options) ? p.options.join(', ') : '',
      required: p.required,
      displayOrder: String(p.displayOrder),
      group: p.group || '',
      description: p.description || '',
    });
    setShowParamModal(true);
  };

  const saveParam = async () => {
    if (!id || !paramForm.name.trim()) return;
    try {
      const payload: any = {
        name: paramForm.name,
        type: paramForm.type,
        required: paramForm.required,
        displayOrder: Number(paramForm.displayOrder) || 0,
        group: paramForm.group || null,
        description: paramForm.description || null,
        options: paramForm.options ? paramForm.options.split(',').map((s: string) => s.trim()).filter(Boolean) : null,
      };
      if (editingParam) {
        await servicesApi.updateParameter(editingParam.id, payload);
      } else {
        await servicesApi.createParameter(id, payload);
      }
      setShowParamModal(false);
      load();
    } catch (e: any) {
      alert(e.message || 'Erreur');
    }
  };

  const deleteParam = async (paramId: string) => {
    if (!confirm('Supprimer ce paramètre ?')) return;
    try {
      await servicesApi.deleteParameter(paramId);
      load();
    } catch (e: any) { alert(e.message); }
  };

  // ── Resources CRUD ──
  const openResCreate = () => {
    setEditingRes(null);
    setResForm({ name: '', description: '', image: '', basePrice: '', capacity: '', location: '', city: '', availability: 'DISPONIBLE', displayOrder: '0' });
    setShowResModal(true);
  };

  const openResEdit = (r: ServiceResource) => {
    setEditingRes(r);
    setResForm({
      name: r.name,
      description: r.description || '',
      image: r.image || '',
      basePrice: r.basePrice != null ? String(r.basePrice) : '',
      capacity: r.capacity != null ? String(r.capacity) : '',
      location: r.location || '',
      city: r.city || '',
      availability: r.availability,
      displayOrder: String(r.displayOrder),
    });
    setShowResModal(true);
  };

  const saveRes = async () => {
    if (!id || !resForm.name.trim()) return;
    try {
      const payload: any = {
        name: resForm.name,
        description: resForm.description || null,
        image: resForm.image || null,
        basePrice: resForm.basePrice ? Number(resForm.basePrice) : null,
        capacity: resForm.capacity ? Number(resForm.capacity) : null,
        location: resForm.location || null,
        city: resForm.city || null,
        availability: resForm.availability,
        displayOrder: Number(resForm.displayOrder) || 0,
      };
      if (editingRes) {
        await servicesApi.updateResource(editingRes.id, payload);
      } else {
        await servicesApi.createResource(id, payload);
      }
      setShowResModal(false);
      load();
    } catch (e: any) {
      alert(e.message || 'Erreur');
    }
  };

  const deleteRes = async (resId: string) => {
    if (!confirm('Supprimer cette ressource ?')) return;
    try {
      await servicesApi.deleteResource(resId);
      load();
    } catch (e: any) { alert(e.message); }
  };

  if (loading) {
    return <div className="glass rounded-2xl h-64 animate-pulse" />;
  }

  if (!service) {
    return (
      <div className="text-center py-16">
        <p className="text-dark-400 mb-4">Service non trouvé</p>
        <button onClick={() => navigate('/admin/services')} className="btn-outline-gold py-2 px-5 text-sm">Retour</button>
      </div>
    );
  }

  const tabs = [
    { key: 'info', label: 'Informations', icon: Settings },
    { key: 'parameters', label: `Paramètres (${parameters.length})`, icon: Box },
    { key: 'resources', label: `Ressources (${resources.length})`, icon: Package },
    { key: 'packs', label: `Packs (${service._count?.packServices ?? 0})`, icon: Package },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/admin/services')} className="text-dark-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-white">{service.name}</h1>
            {service.type && (
              <span className="badge bg-gold-500/20 text-gold-400 border border-gold-500/30 text-xs">
                {service.type.icon} {service.type.name}
              </span>
            )}
            <span className={`badge text-xs ${service.active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
              {service.active ? 'Actif' : 'Inactif'}
            </span>
          </div>
          <p className="text-dark-400 text-sm mt-1">{formatPrice(service.basePrice)} — {service.priceType.replace(/_/g, ' ')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-white/10 pb-px">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all rounded-t-lg ${
              tab === t.key ? 'bg-dark-700 text-gold-400 border-b-2 border-gold-500' : 'text-dark-400 hover:text-white hover:bg-white/5'
            }`}>
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Description</h3>
            <p className="text-dark-300 text-sm leading-relaxed mb-4">{service.description || 'Aucune description'}</p>
            {service.shortDescription && (
              <div className="glass rounded-xl p-4">
                <p className="text-dark-500 text-xs mb-1">Description courte</p>
                <p className="text-dark-200 text-sm">{service.shortDescription}</p>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="glass rounded-2xl p-5">
              <h4 className="text-white font-medium mb-3">Statistiques</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Ressources</span>
                  <span className="text-white font-medium">{resources.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Paramètres</span>
                  <span className="text-white font-medium">{parameters.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Packs associés</span>
                  <span className="text-white font-medium">{service._count?.packServices ?? 0}</span>
                </div>
              </div>
            </div>
            <div className="glass rounded-2xl p-5">
              <h4 className="text-white font-medium mb-3">Configuration</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-dark-400">Code</span><span className="text-white">{service.code || '—'}</span></div>
                <div className="flex justify-between"><span className="text-dark-400">Prix min</span><span className="text-white">{service.priceMin != null ? formatPrice(service.priceMin) : '—'}</span></div>
                <div className="flex justify-between"><span className="text-dark-400">Prix max</span><span className="text-white">{service.priceMax != null ? formatPrice(service.priceMax) : '—'}</span></div>
                <div className="flex justify-between"><span className="text-dark-400">Avance min</span><span className="text-white">{service.minAdvanceDays} jours</span></div>
                <div className="flex justify-between"><span className="text-dark-400">Disponibilité</span><span className="text-white">{service.availabilityMode}</span></div>
                <div className="flex justify-between"><span className="text-dark-400">Vitrine</span><span className={service.visibleOnStore ? 'text-green-400' : 'text-red-400'}>{service.visibleOnStore ? 'Oui' : 'Non'}</span></div>
                <div className="flex justify-between"><span className="text-dark-400">Clients</span><span className={service.visibleForClients ? 'text-green-400' : 'text-red-400'}>{service.visibleForClients ? 'Oui' : 'Non'}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Parameters */}
      {tab === 'parameters' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-dark-400 text-sm">{parameters.length} paramètre{parameters.length !== 1 ? 's' : ''}</p>
            <button onClick={openParamCreate} className="btn-gold py-2 px-4 text-sm flex items-center gap-2">
              <Plus size={15} /> Ajouter un paramètre
            </button>
          </div>

          {parameters.length === 0 ? (
            <div className="text-center py-12 glass rounded-2xl">
              <Box size={32} className="mx-auto mb-2 text-dark-600" />
              <p className="text-dark-400 text-sm mb-3">Aucun paramètre configuré</p>
              <button onClick={openParamCreate} className="btn-outline-gold py-2 px-5 text-sm">Ajouter le premier</button>
            </div>
          ) : (
            <div className="space-y-3">
              {parameters.map(p => (
                <div key={p.id} className="glass rounded-xl px-5 py-4 flex items-center gap-4">
                  <GripVertical size={14} className="text-dark-600" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{p.name}</span>
                      <span className="badge bg-dark-700 text-dark-300 text-[10px] border border-white/5">{paramTypes.find(t => t.value === p.type)?.label || p.type}</span>
                      {p.required && <span className="badge bg-red-500/20 text-red-400 border border-red-500/30 text-[10px]">Requis</span>}
                    </div>
                    {p.description && <p className="text-dark-500 text-xs mt-1">{p.description}</p>}
                    {Array.isArray(p.options) && p.options.length > 0 && (
                      <p className="text-dark-500 text-xs mt-1">Options: {p.options.join(', ')}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openParamEdit(p)} className="p-2 rounded-lg text-dark-400 hover:text-gold-400 hover:bg-gold-500/10 transition-all"><Edit2 size={13} /></button>
                    <button onClick={() => deleteParam(p.id)} className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Resources */}
      {tab === 'resources' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-dark-400 text-sm">{resources.length} ressource{resources.length !== 1 ? 's' : ''}</p>
            <button onClick={openResCreate} className="btn-gold py-2 px-4 text-sm flex items-center gap-2">
              <Plus size={15} /> Ajouter une ressource
            </button>
          </div>

          {resources.length === 0 ? (
            <div className="text-center py-12 glass rounded-2xl">
              <Package size={32} className="mx-auto mb-2 text-dark-600" />
              <p className="text-dark-400 text-sm mb-3">Aucune ressource</p>
              <button onClick={openResCreate} className="btn-outline-gold py-2 px-5 text-sm">Ajouter la première</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map(r => (
                <div key={r.id} className="glass rounded-xl overflow-hidden">
                  <div className="h-32 bg-dark-700 flex items-center justify-center">
                    {r.image ? (
                      <img src={r.image} alt={r.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={28} className="text-dark-600" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white text-sm font-medium truncate">{r.name}</h4>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        r.availability === 'DISPONIBLE' ? 'bg-green-400' :
                        r.availability === 'RESERVEE' ? 'bg-yellow-400' :
                        r.availability === 'MAINTENANCE' ? 'bg-orange-400' : 'bg-red-400'
                      }`} />
                    </div>
                    {r.location && <p className="text-dark-500 text-xs">{r.location}{r.city ? `, ${r.city}` : ''}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      {r.basePrice != null && <span className="text-gold-400">{formatPrice(r.basePrice)}</span>}
                      {r.capacity != null && <span className="text-dark-400">{r.capacity} pers.</span>}
                    </div>
                    <div className="flex gap-1.5 mt-3">
                      <button onClick={() => openResEdit(r)} className="flex-1 py-1.5 text-xs glass rounded-lg text-dark-300 hover:text-gold-400 transition-colors flex items-center justify-center gap-1"><Edit2 size={11} /> Modifier</button>
                      <button onClick={() => deleteRes(r.id)} className="py-1.5 px-3 text-xs glass rounded-lg text-dark-300 hover:text-red-400 transition-colors"><Trash2 size={11} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Packs */}
      {tab === 'packs' && (
        <div>
          {(service.packServices?.length ?? 0) === 0 ? (
            <div className="text-center py-12 glass rounded-2xl">
              <Package size={32} className="mx-auto mb-2 text-dark-600" />
              <p className="text-dark-400 text-sm">Ce service n'est utilisé dans aucun pack.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {service.packServices?.map((ps: any) => (
                <div key={ps.id} className="glass rounded-xl px-5 py-4 flex items-center gap-4">
                  {ps.pack.imageUrl ? (
                    <img src={ps.pack.imageUrl} alt={ps.pack.name} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gold-500/20 flex items-center justify-center">
                      <Package size={18} className="text-gold-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm">{ps.pack.name}</p>
                    <p className="text-dark-500 text-xs">{formatPrice(ps.pack.price)} — {ps.status}</p>
                  </div>
                  <button onClick={() => navigate(`/admin/packs`)} className="text-dark-400 hover:text-gold-400 text-xs transition-colors">Voir le pack</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Parameter Modal ── */}
      {showParamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowParamModal(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-md w-full z-10">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">{editingParam ? 'Modifier' : 'Ajouter'} un paramètre</h2>
              <button onClick={() => setShowParamModal(false)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-dark-300 text-xs mb-1 block">Nom *</label>
                <input value={paramForm.name} onChange={e => setParamForm({ ...paramForm, name: e.target.value })} className="input-field w-full py-2.5 text-sm" placeholder="Ex: Nombre de photographes" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Type</label>
                  <select value={paramForm.type} onChange={e => setParamForm({ ...paramForm, type: e.target.value })} className="input-field w-full py-2.5 text-sm">
                    {paramTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Groupe</label>
                  <input value={paramForm.group} onChange={e => setParamForm({ ...paramForm, group: e.target.value })} className="input-field w-full py-2.5 text-sm" placeholder="Ex: Options" />
                </div>
              </div>
              {(paramForm.type === 'SELECT' || paramForm.type === 'MULTI_SELECT') && (
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Options (séparées par virgule)</label>
                  <input value={paramForm.options} onChange={e => setParamForm({ ...paramForm, options: e.target.value })} className="input-field w-full py-2.5 text-sm" placeholder="Option 1, Option 2, Option 3" />
                </div>
              )}
              <div>
                <label className="text-dark-300 text-xs mb-1 block">Description</label>
                <input value={paramForm.description} onChange={e => setParamForm({ ...paramForm, description: e.target.value })} className="input-field w-full py-2.5 text-sm" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-dark-300">
                  <input type="checkbox" checked={paramForm.required} onChange={e => setParamForm({ ...paramForm, required: e.target.checked })} className="accent-gold-500" />
                  Requis
                </label>
                <div className="flex-1">
                  <label className="text-dark-300 text-xs mb-1 block">Ordre</label>
                  <input type="number" value={paramForm.displayOrder} onChange={e => setParamForm({ ...paramForm, displayOrder: e.target.value })} className="input-field w-full py-2 text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-white/10">
              <button onClick={() => setShowParamModal(false)} className="py-2 px-5 text-sm text-dark-300 hover:text-white">Annuler</button>
              <button onClick={saveParam} className="btn-gold py-2 px-6 text-sm">{editingParam ? 'Mettre à jour' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resource Modal ── */}
      {showResModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowResModal(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-md w-full z-10">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">{editingRes ? 'Modifier' : 'Ajouter'} une ressource</h2>
              <button onClick={() => setShowResModal(false)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-dark-300 text-xs mb-1 block">Nom *</label>
                <input value={resForm.name} onChange={e => setResForm({ ...resForm, name: e.target.value })} className="input-field w-full py-2.5 text-sm" placeholder="Ex: Studio Fadhel" />
              </div>
              <div>
                <label className="text-dark-300 text-xs mb-1 block">Description</label>
                <input value={resForm.description} onChange={e => setResForm({ ...resForm, description: e.target.value })} className="input-field w-full py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-dark-300 text-xs mb-1 block">Image URL</label>
                <input value={resForm.image} onChange={e => setResForm({ ...resForm, image: e.target.value })} className="input-field w-full py-2.5 text-sm" placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Prix de base (DT)</label>
                  <input type="number" value={resForm.basePrice} onChange={e => setResForm({ ...resForm, basePrice: e.target.value })} className="input-field w-full py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Capacité</label>
                  <input type="number" value={resForm.capacity} onChange={e => setResForm({ ...resForm, capacity: e.target.value })} className="input-field w-full py-2.5 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Localisation</label>
                  <input value={resForm.location} onChange={e => setResForm({ ...resForm, location: e.target.value })} className="input-field w-full py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Ville</label>
                  <input value={resForm.city} onChange={e => setResForm({ ...resForm, city: e.target.value })} className="input-field w-full py-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-dark-300 text-xs mb-1 block">Disponibilité</label>
                <select value={resForm.availability} onChange={e => setResForm({ ...resForm, availability: e.target.value })} className="input-field w-full py-2.5 text-sm">
                  {resourceDispoOptions.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-white/10">
              <button onClick={() => setShowResModal(false)} className="py-2 px-5 text-sm text-dark-300 hover:text-white">Annuler</button>
              <button onClick={saveRes} className="btn-gold py-2 px-6 text-sm">{editingRes ? 'Mettre à jour' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
