import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Settings, Package, Box, Trash2, Edit2, Save, X,
  GripVertical, Users, Star, Phone, MapPin, Globe, Mail, User,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { servicesApi, providersApi, ServiceItem, ServiceParameter, ServiceResource, Provider, ProviderComposition } from '@/lib/neonApi';
import { formatPrice } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';

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
  const { success, error: toastError } = useToast();
  const [service, setService] = useState<ServiceItem | null>(null);
  const [parameters, setParameters] = useState<ServiceParameter[]>([]);
  const [resources, setResources] = useState<ServiceResource[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'info' | 'parameters' | 'resources' | 'providers' | 'packs'>('info');

  // Parameter form
  const [showParamModal, setShowParamModal] = useState(false);
  const [editingParam, setEditingParam] = useState<ServiceParameter | null>(null);
  const [paramForm, setParamForm] = useState({ name: '', type: 'TEXT', options: '', required: false, displayOrder: '0', group: '', description: '' });

  // Resource form
  const [showResModal, setShowResModal] = useState(false);
  const [editingRes, setEditingRes] = useState<ServiceResource | null>(null);
  const [resForm, setResForm] = useState({ name: '', description: '', image: '', basePrice: '', capacity: '', location: '', city: '', availability: 'DISPONIBLE', displayOrder: '0' });

  // Provider form
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [provForm, setProvForm] = useState({
    name: '', description: '', image: '', price: '', isAvailable: true,
    city: '', address: '', phone: '', email: '', website: '', displayOrder: '0',
  });
  const [provComposition, setProvComposition] = useState<{ role: string; quantity: string; description: string }[]>([]);

  // Composition sub-modal
  const [showCompModal, setShowCompModal] = useState(false);
  const [compProviderId, setCompProviderId] = useState<string>('');
  const [editingComp, setEditingComp] = useState<ProviderComposition | null>(null);
  const [compForm, setCompForm] = useState({ role: '', quantity: '1', description: '' });

  const load = async () => {
    if (!id) return;
    try {
      const [svc, params, res, provs] = await Promise.all([
        servicesApi.get(id),
        servicesApi.getParameters(id),
        servicesApi.getResources(id),
        providersApi.list({ serviceId: id }),
      ]);
      setService(svc);
      setParameters(params);
      setResources(res);
      setProviders(provs);
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
      name: p.name, type: p.type,
      options: Array.isArray(p.options) ? p.options.join(', ') : '',
      required: p.required, displayOrder: String(p.displayOrder),
      group: p.group || '', description: p.description || '',
    });
    setShowParamModal(true);
  };

  const saveParam = async () => {
    if (!id || !paramForm.name.trim()) return;
    try {
      const payload: any = {
        name: paramForm.name, type: paramForm.type,
        required: paramForm.required, displayOrder: Number(paramForm.displayOrder) || 0,
        group: paramForm.group || null, description: paramForm.description || null,
        options: paramForm.options ? paramForm.options.split(',').map((s: string) => s.trim()).filter(Boolean) : null,
      };
      if (editingParam) {
        await servicesApi.updateParameter(editingParam.id, payload);
      } else {
        await servicesApi.createParameter(id, payload);
      }
      setShowParamModal(false);
      success(editingParam ? 'Paramètre modifié' : 'Paramètre créé');
      load();
    } catch (e: any) { toastError('Erreur', e.message); }
  };

  const deleteParam = async (paramId: string) => {
    if (!confirm('Supprimer ce paramètre ?')) return;
    try {
      await servicesApi.deleteParameter(paramId);
      success('Paramètre supprimé');
      load();
    } catch (e: any) { toastError('Erreur', e.message); }
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
      name: r.name, description: r.description || '', image: r.image || '',
      basePrice: r.basePrice != null ? String(r.basePrice) : '',
      capacity: r.capacity != null ? String(r.capacity) : '',
      location: r.location || '', city: r.city || '',
      availability: r.availability, displayOrder: String(r.displayOrder),
    });
    setShowResModal(true);
  };

  const saveRes = async () => {
    if (!id || !resForm.name.trim()) return;
    try {
      const payload: any = {
        name: resForm.name, description: resForm.description || null,
        image: resForm.image || null,
        basePrice: resForm.basePrice ? Number(resForm.basePrice) : null,
        capacity: resForm.capacity ? Number(resForm.capacity) : null,
        location: resForm.location || null, city: resForm.city || null,
        availability: resForm.availability, displayOrder: Number(resForm.displayOrder) || 0,
      };
      if (editingRes) {
        await servicesApi.updateResource(editingRes.id, payload);
      } else {
        await servicesApi.createResource(id, payload);
      }
      setShowResModal(false);
      success(editingRes ? 'Ressource modifiée' : 'Ressource créée');
      load();
    } catch (e: any) { toastError('Erreur', e.message); }
  };

  const deleteRes = async (resId: string) => {
    if (!confirm('Supprimer cette ressource ?')) return;
    try {
      await servicesApi.deleteResource(resId);
      success('Ressource supprimée');
      load();
    } catch (e: any) { toastError('Erreur', e.message); }
  };

  // ── Providers CRUD ──
  const openProviderCreate = () => {
    setEditingProvider(null);
    setProvForm({ name: '', description: '', image: '', price: '', isAvailable: true, city: '', address: '', phone: '', email: '', website: '', displayOrder: '0' });
    setProvComposition([]);
    setShowProviderModal(true);
  };

  const openProviderEdit = (p: Provider) => {
    setEditingProvider(p);
    setProvForm({
      name: p.name, description: p.description || '', image: p.image || '',
      price: String(p.price), isAvailable: p.isAvailable,
      city: p.city || '', address: p.address || '',
      phone: p.phone || '', email: p.email || '', website: p.website || '',
      displayOrder: String(p.displayOrder),
    });
    setProvComposition((p.composition || []).map(c => ({ role: c.role, quantity: String(c.quantity), description: c.description || '' })));
    setShowProviderModal(true);
  };

  const saveProvider = async () => {
    if (!id || !provForm.name.trim()) return;
    try {
      const body: any = {
        name: provForm.name, description: provForm.description || null,
        image: provForm.image || null, price: provForm.price ? Number(provForm.price) : 0,
        isAvailable: provForm.isAvailable, city: provForm.city || null,
        address: provForm.address || null, phone: provForm.phone || null,
        email: provForm.email || null, website: provForm.website || null,
        displayOrder: Number(provForm.displayOrder) || 0, serviceId: id,
        composition: provComposition.filter(c => c.role.trim()).map(c => ({
          role: c.role, quantity: Number(c.quantity) || 1, description: c.description || null,
        })),
      };
      if (editingProvider) {
        await providersApi.update(editingProvider.id, body);
        success('Prestataire modifié');
      } else {
        await providersApi.create(body);
        success('Prestataire créé');
      }
      setShowProviderModal(false);
      load();
    } catch (e: any) { toastError('Erreur', e.message); }
  };

  const deleteProvider = async (provId: string) => {
    if (!confirm('Supprimer ce prestataire ?')) return;
    try {
      await providersApi.delete(provId);
      success('Prestataire supprimé');
      load();
    } catch (e: any) { toastError('Erreur', e.message); }
  };

  const toggleProviderActive = async (prov: Provider) => {
    try {
      await providersApi.toggleStatus(prov.id);
      success(prov.active ? 'Prestataire désactivé' : 'Prestataire activé');
      load();
    } catch (e: any) { toastError('Erreur', e.message); }
  };

  // ── Composition CRUD ──
  const openCompCreate = (providerId: string) => {
    setCompProviderId(providerId);
    setEditingComp(null);
    setCompForm({ role: '', quantity: '1', description: '' });
    setShowCompModal(true);
  };

  const openCompEdit = (providerId: string, c: ProviderComposition) => {
    setCompProviderId(providerId);
    setEditingComp(c);
    setCompForm({ role: c.role, quantity: String(c.quantity), description: c.description || '' });
    setShowCompModal(true);
  };

  const saveComp = async () => {
    if (!compForm.role.trim()) return;
    try {
      if (editingComp) {
        await providersApi.updateComposition(editingComp.id, {
          role: compForm.role, quantity: Number(compForm.quantity) || 1,
          description: compForm.description || undefined,
        });
      } else {
        await providersApi.addComposition(compProviderId, {
          role: compForm.role, quantity: Number(compForm.quantity) || 1,
          description: compForm.description || undefined,
        });
      }
      setShowCompModal(false);
      success(editingComp ? 'Membre modifié' : 'Membre ajouté');
      load();
    } catch (e: any) { toastError('Erreur', e.message); }
  };

  const deleteComp = async (memberId: string) => {
    if (!confirm('Supprimer ce membre ?')) return;
    try {
      await providersApi.deleteComposition(memberId);
      success('Membre supprimé');
      load();
    } catch (e: any) { toastError('Erreur', e.message); }
  };

  if (loading) return <div className="glass rounded-2xl h-64 animate-pulse" />;

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
    { key: 'providers', label: `Prestataires (${providers.length})`, icon: Users },
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
      <div className="flex gap-1 mb-6 border-b border-white/10 pb-px overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all rounded-t-lg whitespace-nowrap ${
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
                  <span className="text-dark-400">Prestataires</span>
                  <span className="text-white font-medium">{providers.length}</span>
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
              <Plus size={15} /> Ajouter
            </button>
          </div>
          {parameters.length === 0 ? (
            <div className="text-center py-12 glass rounded-2xl">
              <Box size={32} className="mx-auto mb-2 text-dark-600" />
              <p className="text-dark-400 text-sm mb-3">Aucun paramètre</p>
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
              <Plus size={15} /> Ajouter
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
                    {r.image ? <img src={r.image} alt={r.name} className="w-full h-full object-cover" /> : <Package size={28} className="text-dark-600" />}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white text-sm font-medium truncate">{r.name}</h4>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.availability === 'DISPONIBLE' ? 'bg-green-400' : r.availability === 'RESERVEE' ? 'bg-yellow-400' : r.availability === 'MAINTENANCE' ? 'bg-orange-400' : 'bg-red-400'}`} />
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

      {/* Tab: Providers (Prestataires) */}
      {tab === 'providers' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-dark-400 text-sm">{providers.length} prestataire{providers.length !== 1 ? 's' : ''}</p>
            <button onClick={openProviderCreate} className="btn-gold py-2 px-4 text-sm flex items-center gap-2">
              <Plus size={15} /> Ajouter un prestataire
            </button>
          </div>
          {providers.length === 0 ? (
            <div className="text-center py-12 glass rounded-2xl">
              <Users size={32} className="mx-auto mb-2 text-dark-600" />
              <p className="text-dark-400 text-sm mb-3">Aucun prestataire pour ce service</p>
              <p className="text-dark-500 text-xs mb-4">Ajoutez des prestataires (fournisseurs) qui proposent ce service</p>
              <button onClick={openProviderCreate} className="btn-outline-gold py-2 px-5 text-sm">Ajouter le premier</button>
            </div>
          ) : (
            <div className="space-y-4">
              {providers.map(p => (
                <div key={p.id} className={`glass rounded-2xl overflow-hidden border ${!p.active ? 'border-red-500/20 opacity-60' : 'border-white/10'}`}>
                  <div className="flex items-start gap-4 p-5">
                    <div className="w-16 h-16 rounded-xl bg-dark-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <User size={24} className="text-dark-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-semibold">{p.name}</h4>
                        <span className={`w-2.5 h-2.5 rounded-full ${p.isAvailable ? 'bg-green-400' : 'bg-yellow-400'}`} title={p.isAvailable ? 'Disponible' : 'Sur demande'} />
                        {!p.active && <span className="badge bg-red-500/20 text-red-400 border border-red-500/30 text-[10px]">Inactif</span>}
                      </div>
                      {p.description && <p className="text-dark-400 text-xs mb-2 line-clamp-2">{p.description}</p>}
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="text-gold-400 font-semibold">{formatPrice(p.price)}</span>
                        {p.city && <span className="text-dark-400 flex items-center gap-1"><MapPin size={11} />{p.city}</span>}
                        {p.phone && <span className="text-dark-400 flex items-center gap-1"><Phone size={11} />{p.phone}</span>}
                        {p.rating != null && (
                          <span className="text-yellow-400 flex items-center gap-1"><Star size={11} fill="currentColor" />{p.rating.toFixed(1)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button onClick={() => openProviderEdit(p)} className="p-2 rounded-lg text-dark-400 hover:text-gold-400 hover:bg-gold-500/10 transition-all" title="Modifier"><Edit2 size={14} /></button>
                      <button onClick={() => toggleProviderActive(p)} className={`p-2 rounded-lg transition-all ${p.active ? 'text-green-400 hover:bg-green-500/10' : 'text-dark-400 hover:bg-white/5'}`} title={p.active ? 'Désactiver' : 'Activer'}>
                        {p.active ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                      </button>
                      <button onClick={() => deleteProvider(p.id)} className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Supprimer"><Trash2 size={14} /></button>
                    </div>
                  </div>

                  {/* Composition */}
                  <div className="border-t border-white/5 px-5 py-3 bg-dark-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-dark-400 text-xs font-medium">Composition ({(p.composition || []).length})</span>
                      <button onClick={() => openCompCreate(p.id)} className="text-gold-400 text-xs flex items-center gap-1 hover:text-gold-300">
                        <Plus size={12} /> Ajouter
                      </button>
                    </div>
                    {(p.composition || []).length === 0 ? (
                      <p className="text-dark-500 text-[11px]">Aucune composition définie</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {p.composition!.map(c => (
                          <div key={c.id} className="flex items-center gap-2 bg-dark-700 rounded-lg px-3 py-1.5 text-xs">
                            <span className="text-white">{c.role}</span>
                            <span className="text-gold-400 font-medium">×{c.quantity}</span>
                            <button onClick={() => openCompEdit(p.id, c)} className="text-dark-400 hover:text-gold-400 ml-1"><Edit2 size={10} /></button>
                            <button onClick={() => deleteComp(c.id)} className="text-dark-400 hover:text-red-400"><Trash2 size={10} /></button>
                          </div>
                        ))}
                      </div>
                    )}
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
              <div><label className="text-dark-300 text-xs mb-1 block">Nom *</label><input value={resForm.name} onChange={e => setResForm({ ...resForm, name: e.target.value })} className="input-field w-full py-2.5 text-sm" /></div>
              <div><label className="text-dark-300 text-xs mb-1 block">Description</label><input value={resForm.description} onChange={e => setResForm({ ...resForm, description: e.target.value })} className="input-field w-full py-2.5 text-sm" /></div>
              <div><label className="text-dark-300 text-xs mb-1 block">Image URL</label><input value={resForm.image} onChange={e => setResForm({ ...resForm, image: e.target.value })} className="input-field w-full py-2.5 text-sm" placeholder="https://..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-dark-300 text-xs mb-1 block">Prix de base (DT)</label><input type="number" value={resForm.basePrice} onChange={e => setResForm({ ...resForm, basePrice: e.target.value })} className="input-field w-full py-2.5 text-sm" /></div>
                <div><label className="text-dark-300 text-xs mb-1 block">Capacité</label><input type="number" value={resForm.capacity} onChange={e => setResForm({ ...resForm, capacity: e.target.value })} className="input-field w-full py-2.5 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-dark-300 text-xs mb-1 block">Localisation</label><input value={resForm.location} onChange={e => setResForm({ ...resForm, location: e.target.value })} className="input-field w-full py-2.5 text-sm" /></div>
                <div><label className="text-dark-300 text-xs mb-1 block">Ville</label><input value={resForm.city} onChange={e => setResForm({ ...resForm, city: e.target.value })} className="input-field w-full py-2.5 text-sm" /></div>
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

      {/* ── Provider Modal ── */}
      {showProviderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowProviderModal(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-lg w-full z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 bg-dark-800 z-10">
              <h2 className="text-lg font-semibold text-white">{editingProvider ? 'Modifier' : 'Ajouter'} un prestataire</h2>
              <button onClick={() => setShowProviderModal(false)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="text-dark-300 text-xs mb-1 block">Nom du prestataire *</label><input value={provForm.name} onChange={e => setProvForm({ ...provForm, name: e.target.value })} className="input-field w-full py-2.5 text-sm" placeholder="Ex: Photographe Mayar" /></div>
              <div><label className="text-dark-300 text-xs mb-1 block">Description</label><textarea value={provForm.description} onChange={e => setProvForm({ ...provForm, description: e.target.value })} rows={2} className="input-field w-full py-2.5 text-sm resize-none" /></div>
              <div><label className="text-dark-300 text-xs mb-1 block">Image URL</label><input value={provForm.image} onChange={e => setProvForm({ ...provForm, image: e.target.value })} className="input-field w-full py-2.5 text-sm" placeholder="https://..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-dark-300 text-xs mb-1 block">Tarif (DT) *</label><input type="number" min="0" value={provForm.price} onChange={e => setProvForm({ ...provForm, price: e.target.value })} className="input-field w-full py-2.5 text-sm" /></div>
                <div><label className="text-dark-300 text-xs mb-1 block">Ville</label><input value={provForm.city} onChange={e => setProvForm({ ...provForm, city: e.target.value })} className="input-field w-full py-2.5 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-dark-300 text-xs mb-1 block">Téléphone</label><input value={provForm.phone} onChange={e => setProvForm({ ...provForm, phone: e.target.value })} className="input-field w-full py-2.5 text-sm" /></div>
                <div><label className="text-dark-300 text-xs mb-1 block">Email</label><input type="email" value={provForm.email} onChange={e => setProvForm({ ...provForm, email: e.target.value })} className="input-field w-full py-2.5 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-dark-300 text-xs mb-1 block">Adresse</label><input value={provForm.address} onChange={e => setProvForm({ ...provForm, address: e.target.value })} className="input-field w-full py-2.5 text-sm" /></div>
                <div><label className="text-dark-300 text-xs mb-1 block">Site web</label><input value={provForm.website} onChange={e => setProvForm({ ...provForm, website: e.target.value })} className="input-field w-full py-2.5 text-sm" placeholder="https://..." /></div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-dark-300">
                  <input type="checkbox" checked={provForm.isAvailable} onChange={e => setProvForm({ ...provForm, isAvailable: e.target.checked })} className="accent-gold-500" />
                  Disponible
                </label>
                <div className="flex-1"><label className="text-dark-300 text-xs mb-1 block">Ordre</label><input type="number" value={provForm.displayOrder} onChange={e => setProvForm({ ...provForm, displayOrder: e.target.value })} className="input-field w-full py-2 text-sm" /></div>
              </div>

              {/* Inline composition editor */}
              <div className="border-t border-white/10 pt-4">
                <p className="text-gold-400 text-xs font-semibold uppercase tracking-wide mb-3">Composition de l'équipe</p>
                {provComposition.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {provComposition.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 bg-dark-700 rounded-lg px-3 py-2">
                        <input value={c.role} onChange={e => { const nc = [...provComposition]; nc[i].role = e.target.value; setProvComposition(nc); }} className="input-field flex-1 py-1.5 text-xs" placeholder="Rôle (ex: Chanteur)" />
                        <input type="number" min="1" value={c.quantity} onChange={e => { const nc = [...provComposition]; nc[i].quantity = e.target.value; setProvComposition(nc); }} className="input-field w-16 py-1.5 text-xs text-center" />
                        <button onClick={() => setProvComposition(provComposition.filter((_, j) => j !== i))} className="text-dark-400 hover:text-red-400"><Trash2 size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => setProvComposition([...provComposition, { role: '', quantity: '1', description: '' }])} className="text-gold-400 text-xs flex items-center gap-1 hover:text-gold-300">
                  <Plus size={12} /> Ajouter un membre
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-white/10 sticky bottom-0 bg-dark-800">
              <button onClick={() => setShowProviderModal(false)} className="py-2 px-5 text-sm text-dark-300 hover:text-white">Annuler</button>
              <button onClick={saveProvider} disabled={!provForm.name.trim()} className="btn-gold py-2 px-6 text-sm disabled:opacity-50">{editingProvider ? 'Mettre à jour' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Composition Modal ── */}
      {showCompModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCompModal(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-sm w-full z-10">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">{editingComp ? 'Modifier' : 'Ajouter'} un membre</h2>
              <button onClick={() => setShowCompModal(false)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="text-dark-300 text-xs mb-1 block">Rôle *</label><input value={compForm.role} onChange={e => setCompForm({ ...compForm, role: e.target.value })} className="input-field w-full py-2.5 text-sm" placeholder="Ex: Chanteur, Musicien, Cameraman..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-dark-300 text-xs mb-1 block">Quantité</label><input type="number" min="1" value={compForm.quantity} onChange={e => setCompForm({ ...compForm, quantity: e.target.value })} className="input-field w-full py-2.5 text-sm" /></div>
                <div><label className="text-dark-300 text-xs mb-1 block">Description</label><input value={compForm.description} onChange={e => setCompForm({ ...compForm, description: e.target.value })} className="input-field w-full py-2.5 text-sm" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-white/10">
              <button onClick={() => setShowCompModal(false)} className="py-2 px-5 text-sm text-dark-300 hover:text-white">Annuler</button>
              <button onClick={saveComp} disabled={!compForm.role.trim()} className="btn-gold py-2 px-6 text-sm disabled:opacity-50">{editingComp ? 'Mettre à jour' : 'Ajouter'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
