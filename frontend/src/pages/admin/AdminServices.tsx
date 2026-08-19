import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, X, Star, Layers, Package, Settings, Trash2,
  ToggleLeft, ToggleRight, ArrowUpDown, Eye, EyeOff, Edit2,
  Box, MapPin, GripVertical, AlertCircle, Save, DollarSign,
  Clock, Users, Calendar
} from 'lucide-react';
import { servicesApi, ServiceItem, ServiceType, ServiceParameter, ServiceResource } from '@/lib/neonApi';
import PageHeader from '@/components/ui/PageHeader';
import { formatPrice } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';

const priceTypeLabels: Record<string, string> = {
  FIXE: 'Fixe',
  A_PARTIR_DE: 'À partir de',
  PAR_HEURE: '/heure',
  PAR_JOUR: '/jour',
  PAR_PERSONNE: '/personne',
  PAR_QUANTITE: '/quantité',
  SUR_DEVIS: 'Sur devis',
};

const priceTypeOptions = [
  { value: 'FIXE', label: 'Prix fixe' },
  { value: 'A_PARTIR_DE', label: 'À partir de' },
  { value: 'PAR_HEURE', label: 'Par heure' },
  { value: 'PAR_JOUR', label: 'Par jour' },
  { value: 'PAR_PERSONNE', label: 'Par personne' },
  { value: 'PAR_QUANTITE', label: 'Par quantité' },
  { value: 'SUR_DEVIS', label: 'Sur devis' },
];

const paramTypes = [
  { value: 'TEXT', label: 'Texte court' },
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

const availabilityOptions = [
  { value: 'DISPONIBLE', label: '🟢 Disponible' },
  { value: 'INDISPONIBLE', label: '🔴 Indisponible' },
  { value: 'MAINTENANCE', label: '🟠 En maintenance' },
  { value: 'RESERVEE', label: '🟡 Réservée' },
];

const defaultForm = {
  name: '', description: '', shortDescription: '', code: '',
  icon: '', image: '', basePrice: '', priceMin: '', priceMax: '',
  priceType: 'A_PARTIR_DE', typeId: '', featured: false,
  active: true, displayOrder: '0', visibleOnStore: true,
  visibleForClients: true, minAdvanceDays: '0', minDuration: '',
  availabilityMode: 'always',
};

const defaultParam = {
  name: '', type: 'TEXT', options: '', required: false,
  displayOrder: '0', group: '', description: ''
};

const defaultResource = {
  name: '', description: '', image: '', basePrice: '', capacity: '',
  location: '', city: '', country: '', availability: 'DISPONIBLE',
  displayOrder: '0'
};

export default function AdminServices() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  
  // État principal
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [types, setTypes] = useState<ServiceType[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal Service
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Modal Type
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeIcon, setNewTypeIcon] = useState('');
  const [savingType, setSavingType] = useState(false);

  // Modal Paramètres
  const [showParamModal, setShowParamModal] = useState(false);
  const [currentServiceId, setCurrentServiceId] = useState<string | null>(null);
  const [currentServiceName, setCurrentServiceName] = useState('');
  const [editingParam, setEditingParam] = useState<ServiceParameter | null>(null);
  const [paramForm, setParamForm] = useState(defaultParam);
  const [savingParam, setSavingParam] = useState(false);
  const [serviceParams, setServiceParams] = useState<ServiceParameter[]>([]);

  // Modal Ressources
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [editingResource, setEditingResource] = useState<ServiceResource | null>(null);
  const [resourceForm, setResourceForm] = useState(defaultResource);
  const [savingResource, setSavingResource] = useState(false);
  const [serviceResources, setServiceResources] = useState<ServiceResource[]>([]);

  const load = async () => {
    try {
      const [svcRes, typesData, statsData] = await Promise.all([
        servicesApi.list({ page, limit: 50, search: search || undefined, typeId: filterType || undefined, active: filterActive || undefined }),
        servicesApi.types(),
        servicesApi.stats(),
      ]);
      setServices(svcRes.data);
      setTotal(svcRes.total);
      setTypes(typesData);
      setStats(statsData);
    } catch (e) {
      console.warn('[AdminServices] load error:', e);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, search, filterType, filterActive]);

  // ── CRUD Service ──
  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (svc: ServiceItem) => {
    setEditing(svc);
    setForm({
      name: svc.name,
      description: svc.description || '',
      shortDescription: svc.shortDescription || '',
      code: svc.code || '',
      icon: svc.icon || '',
      image: svc.image || '',
      basePrice: String(svc.basePrice || ''),
      priceMin: svc.priceMin != null ? String(svc.priceMin) : '',
      priceMax: svc.priceMax != null ? String(svc.priceMax) : '',
      priceType: svc.priceType || 'A_PARTIR_DE',
      typeId: svc.typeId || '',
      featured: svc.featured,
      active: svc.active,
      displayOrder: String(svc.displayOrder || 0),
      visibleOnStore: svc.visibleOnStore,
      visibleForClients: svc.visibleForClients,
      minAdvanceDays: String(svc.minAdvanceDays || 0),
      minDuration: svc.minDuration != null ? String(svc.minDuration) : '',
      availabilityMode: svc.availabilityMode || 'always',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { 
      setFormError('Le nom est obligatoire'); 
      return; 
    }
    setSaving(true);
    setFormError('');
    try {
      const payload: any = {
        name: form.name,
        description: form.description || null,
        shortDescription: form.shortDescription || null,
        code: form.code || null,
        icon: form.icon || null,
        image: form.image || null,
        basePrice: form.basePrice ? Number(form.basePrice) : 0,
        priceMin: form.priceMin ? Number(form.priceMin) : null,
        priceMax: form.priceMax ? Number(form.priceMax) : null,
        priceType: form.priceType,
        typeId: form.typeId || null,
        featured: form.featured,
        active: form.active,
        displayOrder: Number(form.displayOrder) || 0,
        visibleOnStore: form.visibleOnStore,
        visibleForClients: form.visibleForClients,
        minAdvanceDays: Number(form.minAdvanceDays) || 0,
        minDuration: form.minDuration ? Number(form.minDuration) : null,
        availabilityMode: form.availabilityMode,
      };
      if (editing) {
        await servicesApi.update(editing.id, payload);
        success('Service modifié', form.name);
      } else {
        await servicesApi.create(payload);
        success('Service créé', form.name);
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      setFormError(e.message || 'Sauvegarde échouée');
      toastError('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer le service "${name}" ?`)) return;
    try {
      await servicesApi.delete(id);
      success('Service supprimé', name);
      load();
    } catch (e: any) {
      toastError('Erreur', e.message || 'Suppression échouée');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try { 
      await servicesApi.toggleStatus(id); 
      success('Statut modifié');
      load(); 
    } catch {}
  };

  const handleToggleFeatured = async (id: string) => {
    try { 
      await servicesApi.toggleFeatured(id); 
      success('Vedette modifiée');
      load(); 
    } catch {}
  };

  // ── Gestion des Types ──
  const handleAddType = async () => {
    if (!newTypeName.trim()) return;
    setSavingType(true);
    try {
      await servicesApi.createType({ name: newTypeName, icon: newTypeIcon || undefined });
      setNewTypeName('');
      setNewTypeIcon('');
      const typesData = await servicesApi.types();
      setTypes(typesData);
      setShowTypeModal(false);
      success('Type créé', newTypeName);
    } catch (e: any) {
      toastError('Erreur', e.message);
    } finally {
      setSavingType(false);
    }
  };

  // ── Gestion des Paramètres ──
  const openParamModal = async (serviceId: string, serviceName: string) => {
    setCurrentServiceId(serviceId);
    setCurrentServiceName(serviceName);
    setEditingParam(null);
    setParamForm(defaultParam);
    try {
      const params = await servicesApi.getParameters(serviceId);
      setServiceParams(params);
    } catch {}
    setShowParamModal(true);
  };

  const openEditParam = (param: ServiceParameter) => {
    setEditingParam(param);
    setParamForm({
      name: param.name,
      type: param.type,
      options: Array.isArray(param.options) ? param.options.join(', ') : '',
      required: param.required,
      displayOrder: String(param.displayOrder || 0),
      group: param.group || '',
      description: param.description || '',
    });
  };

  const saveParam = async () => {
    if (!currentServiceId || !paramForm.name.trim()) {
      toastError('Erreur', 'Le nom est obligatoire');
      return;
    }
    setSavingParam(true);
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
        success('Paramètre modifié');
      } else {
        await servicesApi.createParameter(currentServiceId, payload);
        success('Paramètre créé');
      }
      const params = await servicesApi.getParameters(currentServiceId);
      setServiceParams(params);
      load();
    } catch (e: any) {
      toastError('Erreur', e.message);
    } finally {
      setSavingParam(false);
    }
  };

  const deleteParam = async (paramId: string) => {
    if (!confirm('Supprimer ce paramètre ?')) return;
    try {
      await servicesApi.deleteParameter(paramId);
      success('Paramètre supprimé');
      const params = await servicesApi.getParameters(currentServiceId!);
      setServiceParams(params);
      load();
    } catch (e: any) {
      toastError('Erreur', e.message);
    }
  };

  // ── Gestion des Ressources ──
  const openResourceModal = async (serviceId: string, serviceName: string) => {
    setCurrentServiceId(serviceId);
    setCurrentServiceName(serviceName);
    setEditingResource(null);
    setResourceForm(defaultResource);
    try {
      const resources = await servicesApi.getResources(serviceId);
      setServiceResources(resources);
    } catch {}
    setShowResourceModal(true);
  };

  const openEditResource = (resource: ServiceResource) => {
    setEditingResource(resource);
    setResourceForm({
      name: resource.name,
      description: resource.description || '',
      image: resource.image || '',
      basePrice: resource.basePrice != null ? String(resource.basePrice) : '',
      capacity: resource.capacity != null ? String(resource.capacity) : '',
      location: resource.location || '',
      city: resource.city || '',
      country: resource.country || '',
      availability: resource.availability || 'DISPONIBLE',
      displayOrder: String(resource.displayOrder || 0),
    });
  };

  const saveResource = async () => {
    if (!currentServiceId || !resourceForm.name.trim()) {
      toastError('Erreur', 'Le nom est obligatoire');
      return;
    }
    setSavingResource(true);
    try {
      const payload: any = {
        name: resourceForm.name,
        description: resourceForm.description || null,
        image: resourceForm.image || null,
        basePrice: resourceForm.basePrice ? Number(resourceForm.basePrice) : null,
        capacity: resourceForm.capacity ? Number(resourceForm.capacity) : null,
        location: resourceForm.location || null,
        city: resourceForm.city || null,
        country: resourceForm.country || null,
        availability: resourceForm.availability,
        displayOrder: Number(resourceForm.displayOrder) || 0,
      };
      if (editingResource) {
        await servicesApi.updateResource(editingResource.id, payload);
        success('Ressource modifiée');
      } else {
        await servicesApi.createResource(currentServiceId, payload);
        success('Ressource créée');
      }
      const resources = await servicesApi.getResources(currentServiceId);
      setServiceResources(resources);
      load();
    } catch (e: any) {
      toastError('Erreur', e.message);
    } finally {
      setSavingResource(false);
    }
  };

  const deleteResource = async (resourceId: string) => {
    if (!confirm('Supprimer cette ressource ?')) return;
    try {
      await servicesApi.deleteResource(resourceId);
      success('Ressource supprimée');
      const resources = await servicesApi.getResources(currentServiceId!);
      setServiceResources(resources);
      load();
    } catch (e: any) {
      toastError('Erreur', e.message);
    }
  };

  const filtered = services;

  return (
    <div>
      <PageHeader
        title="Services"
        subtitle="Gérez les services proposés par votre entreprise. Ils seront disponibles pour la création de packs."
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowTypeModal(true)}
              className="py-2 px-4 text-sm flex items-center gap-2 glass border border-white/10 rounded-xl text-dark-300 hover:text-white hover:border-gold-500/30 transition-all">
              <Settings size={15} /> Types
            </button>
            <button onClick={openCreate} className="btn-gold py-2 px-4 text-sm flex items-center gap-2">
              <Plus size={15} /> Ajouter un service
            </button>
          </div>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-white', icon: Package },
            { label: 'Actifs', value: stats.active, color: 'text-green-400', icon: ToggleRight },
            { label: 'Vedettes', value: stats.featured, color: 'text-gold-400', icon: Star },
            { label: 'Avec ressources', value: stats.withResources, color: 'text-blue-400', icon: MapPin },
            { label: 'Dans des packs', value: stats.withPacks, color: 'text-purple-400', icon: Layers },
          ].map(s => (
            <div key={s.label} className="glass rounded-xl p-3 text-center">
              <s.icon size={16} className={`mx-auto mb-1 ${s.color}`} />
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-dark-400 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="input-field pl-9 py-2.5 text-sm w-60" 
            placeholder="Rechercher un service..." 
          />
        </div>
        <select 
          value={filterType} 
          onChange={e => { setFilterType(e.target.value); setPage(1); }}
          className="input-field py-2.5 text-sm"
        >
          <option value="">Tous les types</option>
          {types.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
        </select>
        <select 
          value={filterActive} 
          onChange={e => { setFilterActive(e.target.value); setPage(1); }}
          className="input-field py-2.5 text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value="true">Actif</option>
          <option value="false">Inactif</option>
        </select>
      </div>

      <p className="text-dark-400 text-sm mb-5">{total} service{total !== 1 ? 's' : ''}</p>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array(6).fill(0).map((_, i) => <div key={i} className="glass rounded-2xl h-56 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl">
          <Package size={40} className="mx-auto mb-3 text-dark-600" />
          <p className="text-dark-400 mb-3">Aucun service trouvé</p>
          <button onClick={openCreate} className="btn-outline-gold py-2 px-5 text-sm">
            Créer un service
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(svc => (
            <div key={svc.id} 
              className="glass rounded-2xl overflow-hidden group hover:border-gold-500/30 transition-all duration-300"
            >
              {/* Image */}
              <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <img
                  src={svc.image || 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=600'}
                  alt={svc.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  {svc.type && (
                    <span className="badge bg-dark-900/80 text-gold-400 border border-gold-500/30 text-xs backdrop-blur-sm">
                      {svc.type.icon} {svc.type.name}
                    </span>
                  )}
                  {svc.featured && (
                    <span className="badge bg-gold-500/20 text-gold-400 border border-gold-500/30 text-xs backdrop-blur-sm">
                      <Star size={10} className="inline mr-1" /> Vedette
                    </span>
                  )}
                </div>
                <div className={`absolute top-3 right-3 w-3 h-3 rounded-full shadow-lg ${svc.active ? 'bg-green-400 shadow-green-400/50' : 'bg-red-400 shadow-red-400/50'}`} />
              </div>

              {/* Contenu */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  {svc.icon && <span className="text-lg">{svc.icon}</span>}
                  <h3 className="text-white font-semibold group-hover:text-gold-400 transition-colors truncate">
                    {svc.name}
                  </h3>
                </div>
                {svc.shortDescription && (
                  <p className="text-dark-400 text-xs mb-3 line-clamp-2">{svc.shortDescription}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div className="glass rounded-lg py-1.5">
                    <p className="text-white text-sm font-medium">{svc._count?.resources ?? 0}</p>
                    <p className="text-dark-500 text-[10px]">Ressources</p>
                  </div>
                  <div className="glass rounded-lg py-1.5">
                    <p className="text-white text-sm font-medium">{svc._count?.packServices ?? 0}</p>
                    <p className="text-dark-500 text-[10px]">Packs</p>
                  </div>
                  <div className="glass rounded-lg py-1.5">
                    <p className="text-gold-400 text-sm font-medium">{formatPrice(svc.basePrice)}</p>
                    <p className="text-dark-500 text-[10px]">{priceTypeLabels[svc.priceType] || svc.priceType}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggleStatus(svc.id)} 
                      title={svc.active ? 'Désactiver' : 'Activer'}
                      className={`transition-colors ${svc.active ? 'text-green-400 hover:text-red-400' : 'text-red-400 hover:text-green-400'}`}>
                      {svc.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    <button onClick={() => handleToggleFeatured(svc.id)} 
                      title={svc.featured ? 'Retirer vedette' : 'Mettre en vedette'}
                      className={`transition-colors ${svc.featured ? 'text-gold-400' : 'text-dark-500 hover:text-gold-400'}`}>
                      <Star size={16} className={svc.featured ? 'fill-gold-400' : ''} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Bouton Paramètres */}
                    <button 
                      onClick={() => openParamModal(svc.id, svc.name)}
                      className="p-2 rounded-lg text-dark-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all" 
                      title="Paramètres"
                    >
                      <Box size={14} />
                    </button>
                    {/* Bouton Ressources */}
                    <button 
                      onClick={() => openResourceModal(svc.id, svc.name)}
                      className="p-2 rounded-lg text-dark-400 hover:text-green-400 hover:bg-green-500/10 transition-all" 
                      title="Ressources"
                    >
                      <MapPin size={14} />
                    </button>
                    {/* Bouton Modifier */}
                    <button onClick={() => openEdit(svc)}
                      className="p-2 rounded-lg text-dark-400 hover:text-gold-400 hover:bg-gold-500/10 transition-all" 
                      title="Modifier">
                      <Edit2 size={14} />
                    </button>
                    {/* Bouton Détails */}
                    <button onClick={() => navigate(`/admin/services/${svc.id}`)}
                      className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 transition-all" 
                      title="Voir détails">
                      <Settings size={14} />
                    </button>
                    {/* Bouton Supprimer */}
                    <button onClick={() => handleDelete(svc.id, svc.name)}
                      className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all" 
                      title="Supprimer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 50 && (
        <div className="flex justify-center gap-2 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="btn-outline-gold py-1.5 px-4 text-sm disabled:opacity-30">
            Précédent
          </button>
          <span className="text-dark-400 text-sm py-1.5">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={total <= page * 50}
            className="btn-outline-gold py-1.5 px-4 text-sm disabled:opacity-30">
            Suivant
          </button>
        </div>
      )}

      {/* ── MODAL : Service ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 bg-dark-800 z-10">
              <h2 className="text-lg font-semibold text-white">
                {editing ? 'Modifier le service' : 'Ajouter un service'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-dark-400 hover:text-white">
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
                <label className="text-dark-300 text-xs mb-1 block">Nom *</label>
                <input 
                  value={form.name} 
                  onChange={e => { setForm({ ...form, name: e.target.value }); setFormError(''); }} 
                  className="input-field w-full py-2.5 text-sm" 
                  placeholder="Ex: Photographie événementielle" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Type de service</label>
                  <select 
                    value={form.typeId} 
                    onChange={e => setForm({ ...form, typeId: e.target.value })} 
                    className="input-field w-full py-2.5 text-sm"
                  >
                    <option value="">Sélectionner...</option>
                    {types.filter(t => t.active).map(t => (
                      <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Code (slug)</label>
                  <input 
                    value={form.code} 
                    onChange={e => setForm({ ...form, code: e.target.value })} 
                    className="input-field w-full py-2.5 text-sm" 
                    placeholder="photographie" 
                  />
                </div>
              </div>

              <div>
                <label className="text-dark-300 text-xs mb-1 block">Description courte</label>
                <input 
                  value={form.shortDescription} 
                  onChange={e => setForm({ ...form, shortDescription: e.target.value })} 
                  className="input-field w-full py-2.5 text-sm" 
                  placeholder="Immortalisez vos moments importants" 
                />
              </div>

              <div>
                <label className="text-dark-300 text-xs mb-1 block">Description complète</label>
                <textarea 
                  value={form.description} 
                  onChange={e => setForm({ ...form, description: e.target.value })} 
                  className="input-field w-full py-2.5 text-sm" 
                  rows={3} 
                  placeholder="Service professionnel de photographie pour mariages..." 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Icône (emoji)</label>
                  <input 
                    value={form.icon} 
                    onChange={e => setForm({ ...form, icon: e.target.value })} 
                    className="input-field w-full py-2.5 text-sm" 
                    placeholder="📸" 
                  />
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Image URL</label>
                  <input 
                    value={form.image} 
                    onChange={e => setForm({ ...form, image: e.target.value })} 
                    className="input-field w-full py-2.5 text-sm" 
                    placeholder="https://..." 
                  />
                </div>
              </div>

              {/* Tarification */}
              <div className="border-t border-white/10 pt-4">
                <p className="text-dark-300 text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
                  <DollarSign size={14} /> Tarification
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-dark-300 text-xs mb-1 block">Prix de base (DT)</label>
                    <input 
                      type="number" 
                      value={form.basePrice} 
                      onChange={e => setForm({ ...form, basePrice: e.target.value })} 
                      className="input-field w-full py-2.5 text-sm" 
                      placeholder="500" 
                    />
                  </div>
                  <div>
                    <label className="text-dark-300 text-xs mb-1 block">Type de prix</label>
                    <select 
                      value={form.priceType} 
                      onChange={e => setForm({ ...form, priceType: e.target.value })} 
                      className="input-field w-full py-2.5 text-sm"
                    >
                      {priceTypeOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="text-dark-300 text-xs mb-1 block">Prix minimum (DT)</label>
                    <input 
                      type="number" 
                      value={form.priceMin} 
                      onChange={e => setForm({ ...form, priceMin: e.target.value })} 
                      className="input-field w-full py-2.5 text-sm" 
                      placeholder="400" 
                    />
                  </div>
                  <div>
                    <label className="text-dark-300 text-xs mb-1 block">Prix maximum (DT)</label>
                    <input 
                      type="number" 
                      value={form.priceMax} 
                      onChange={e => setForm({ ...form, priceMax: e.target.value })} 
                      className="input-field w-full py-2.5 text-sm" 
                      placeholder="1000" 
                    />
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="border-t border-white/10 pt-4">
                <p className="text-dark-300 text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Settings size={14} /> Options
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={form.active} 
                      onChange={e => setForm({ ...form, active: e.target.checked })} 
                      className="accent-gold-500 w-4 h-4"
                    />
                    Service actif
                  </label>
                  <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={form.featured} 
                      onChange={e => setForm({ ...form, featured: e.target.checked })} 
                      className="accent-gold-500 w-4 h-4"
                    />
                    Service vedette
                  </label>
                  <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={form.visibleOnStore} 
                      onChange={e => setForm({ ...form, visibleOnStore: e.target.checked })} 
                      className="accent-gold-500 w-4 h-4"
                    />
                    Visible sur la vitrine
                  </label>
                  <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={form.visibleForClients} 
                      onChange={e => setForm({ ...form, visibleForClients: e.target.checked })} 
                      className="accent-gold-500 w-4 h-4"
                    />
                    Visible pour les clients
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="text-dark-300 text-xs mb-1 block">Ordre d'affichage</label>
                    <input 
                      type="number" 
                      value={form.displayOrder} 
                      onChange={e => setForm({ ...form, displayOrder: e.target.value })} 
                      className="input-field w-full py-2.5 text-sm" 
                    />
                  </div>
                  <div>
                    <label className="text-dark-300 text-xs mb-1 block">Réservation min (jours)</label>
                    <input 
                      type="number" 
                      value={form.minAdvanceDays} 
                      onChange={e => setForm({ ...form, minAdvanceDays: e.target.value })} 
                      className="input-field w-full py-2.5 text-sm" 
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-dark-300 text-xs mb-1 block">Mode de disponibilité</label>
                  <select 
                    value={form.availabilityMode} 
                    onChange={e => setForm({ ...form, availabilityMode: e.target.value })} 
                    className="input-field w-full py-2.5 text-sm"
                  >
                    <option value="always">Toujours disponible</option>
                    <option value="on_demand">Sur demande</option>
                    <option value="limited">Limitée</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-white/10 sticky bottom-0 bg-dark-800">
              <button 
                onClick={() => setShowModal(false)} 
                className="py-2 px-5 text-sm text-dark-300 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleSave} 
                disabled={saving} 
                className="btn-gold py-2 px-6 text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? '⏳ Enregistrement...' : editing ? '💾 Mettre à jour' : '✨ Créer le service'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL : Types ── */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowTypeModal(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-md w-full z-10">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Layers size={18} className="text-gold-400" /> Types de services
              </h2>
              <button onClick={() => setShowTypeModal(false)} className="text-dark-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <div className="flex gap-2 mb-4">
                <input 
                  value={newTypeIcon} 
                  onChange={e => setNewTypeIcon(e.target.value)} 
                  className="input-field w-16 py-2.5 text-sm text-center" 
                  placeholder="🎵" 
                />
                <input 
                  value={newTypeName} 
                  onChange={e => setNewTypeName(e.target.value)} 
                  className="input-field flex-1 py-2.5 text-sm" 
                  placeholder="Nouveau type..." 
                />
                <button 
                  onClick={handleAddType} 
                  disabled={savingType || !newTypeName.trim()} 
                  className="btn-gold py-2 px-4 text-sm disabled:opacity-50 flex items-center gap-1"
                >
                  <Plus size={15} /> Ajouter
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {types.map(t => (
                  <div key={t.id} className="flex items-center gap-3 glass rounded-xl px-4 py-3">
                    <span className="text-lg">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{t.name}</p>
                      <p className="text-dark-500 text-xs">
                        {t._count?.services ?? 0} service{t._count?.services !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${t.active ? 'bg-green-400' : 'bg-red-400'}`} />
                  </div>
                ))}
                {types.length === 0 && (
                  <p className="text-dark-500 text-sm text-center py-4">
                    Aucun type configuré. Ajoutez-en un ci-dessus.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL : Paramètres ── */}
      {showParamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowParamModal(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-md w-full z-10 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Box size={18} className="text-gold-400" /> Paramètres
              </h2>
              <button onClick={() => setShowParamModal(false)} className="text-dark-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* Service info */}
              <div className="text-sm text-dark-300 mb-4">
                Service : <span className="text-white font-medium">{currentServiceName}</span>
                <span className="text-dark-500 text-xs ml-2">({serviceParams.length} paramètres)</span>
              </div>

              {/* Formulaire d'ajout */}
              <div className="space-y-3 mb-4 p-4 glass rounded-xl">
                <p className="text-dark-400 text-xs font-medium uppercase tracking-wider">
                  {editingParam ? 'Modifier le paramètre' : 'Ajouter un paramètre'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-dark-400 text-xs mb-1 block">Nom *</label>
                    <input 
                      value={paramForm.name} 
                      onChange={e => setParamForm({ ...paramForm, name: e.target.value })} 
                      className="input-field w-full py-2 text-sm" 
                      placeholder="Ex: Nombre de photographes" 
                    />
                  </div>
                  <div>
                    <label className="text-dark-400 text-xs mb-1 block">Type</label>
                    <select 
                      value={paramForm.type} 
                      onChange={e => setParamForm({ ...paramForm, type: e.target.value })} 
                      className="input-field w-full py-2 text-sm"
                    >
                      {paramTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-dark-400 text-xs mb-1 block">Groupe</label>
                    <input 
                      value={paramForm.group} 
                      onChange={e => setParamForm({ ...paramForm, group: e.target.value })} 
                      className="input-field w-full py-2 text-sm" 
                      placeholder="Ex: Options" 
                    />
                  </div>
                </div>
                {(paramForm.type === 'SELECT' || paramForm.type === 'MULTI_SELECT') && (
                  <div>
                    <label className="text-dark-400 text-xs mb-1 block">Options (séparées par virgule)</label>
                    <input 
                      value={paramForm.options} 
                      onChange={e => setParamForm({ ...paramForm, options: e.target.value })} 
                      className="input-field w-full py-2 text-sm" 
                      placeholder="Option 1, Option 2, Option 3" 
                    />
                  </div>
                )}
                <div>
                  <label className="text-dark-400 text-xs mb-1 block">Description</label>
                  <input 
                    value={paramForm.description} 
                    onChange={e => setParamForm({ ...paramForm, description: e.target.value })} 
                    className="input-field w-full py-2 text-sm" 
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={paramForm.required} 
                      onChange={e => setParamForm({ ...paramForm, required: e.target.checked })} 
                      className="accent-gold-500 w-4 h-4"
                    />
                    Requis
                  </label>
                  <div className="flex-1">
                    <label className="text-dark-400 text-xs mb-1 block">Ordre</label>
                    <input 
                      type="number" 
                      value={paramForm.displayOrder} 
                      onChange={e => setParamForm({ ...paramForm, displayOrder: e.target.value })} 
                      className="input-field w-full py-2 text-sm" 
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  {editingParam && (
                    <button 
                      onClick={() => { setEditingParam(null); setParamForm(defaultParam); }} 
                      className="py-1.5 px-3 text-xs text-dark-300 hover:text-white"
                    >
                      Annuler modification
                    </button>
                  )}
                  <button 
                    onClick={saveParam} 
                    disabled={savingParam || !paramForm.name.trim()} 
                    className="btn-gold py-1.5 px-4 text-xs disabled:opacity-50"
                  >
                    {savingParam ? '...' : editingParam ? 'Mettre à jour' : 'Ajouter'}
                  </button>
                </div>
              </div>

              {/* Liste des paramètres */}
              <div className="space-y-2">
                {serviceParams.length === 0 ? (
                  <p className="text-dark-500 text-sm text-center py-4">
                    Aucun paramètre configuré
                  </p>
                ) : (
                  serviceParams.map(p => (
                    <div key={p.id} className="flex items-center gap-3 glass rounded-xl px-4 py-3">
                      <GripVertical size={14} className="text-dark-600" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white text-sm font-medium">{p.name}</span>
                          <span className="badge bg-dark-700 text-dark-300 text-[10px] border border-white/5">
                            {paramTypes.find(t => t.value === p.type)?.label || p.type}
                          </span>
                          {p.required && (
                            <span className="badge bg-red-500/20 text-red-400 border border-red-500/30 text-[10px]">
                              Requis
                            </span>
                          )}
                          {p.group && (
                            <span className="badge bg-dark-700 text-dark-400 text-[10px] border border-white/5">
                              {p.group}
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <p className="text-dark-500 text-xs mt-1">{p.description}</p>
                        )}
                        {Array.isArray(p.options) && p.options.length > 0 && (
                          <p className="text-dark-500 text-xs mt-1">
                            Options: {p.options.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => openEditParam(p)} 
                          className="p-1.5 rounded-lg text-dark-400 hover:text-gold-400 hover:bg-gold-500/10 transition-all"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={() => deleteParam(p.id)} 
                          className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL : Ressources ── */}
      {showResourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowResourceModal(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-md w-full z-10 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <MapPin size={18} className="text-gold-400" /> Ressources
              </h2>
              <button onClick={() => setShowResourceModal(false)} className="text-dark-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* Service info */}
              <div className="text-sm text-dark-300 mb-4">
                Service : <span className="text-white font-medium">{currentServiceName}</span>
                <span className="text-dark-500 text-xs ml-2">({serviceResources.length} ressources)</span>
              </div>

              {/* Formulaire d'ajout */}
              <div className="space-y-3 mb-4 p-4 glass rounded-xl">
                <p className="text-dark-400 text-xs font-medium uppercase tracking-wider">
                  {editingResource ? 'Modifier la ressource' : 'Ajouter une ressource'}
                </p>
                <div>
                  <label className="text-dark-400 text-xs mb-1 block">Nom *</label>
                  <input 
                    value={resourceForm.name} 
                    onChange={e => setResourceForm({ ...resourceForm, name: e.target.value })} 
                    className="input-field w-full py-2 text-sm" 
                    placeholder="Ex: Studio Fadhel" 
                  />
                </div>
                <div>
                  <label className="text-dark-400 text-xs mb-1 block">Description</label>
                  <input 
                    value={resourceForm.description} 
                    onChange={e => setResourceForm({ ...resourceForm, description: e.target.value })} 
                    className="input-field w-full py-2 text-sm" 
                  />
                </div>
                <div>
                  <label className="text-dark-400 text-xs mb-1 block">Image URL</label>
                  <input 
                    value={resourceForm.image} 
                    onChange={e => setResourceForm({ ...resourceForm, image: e.target.value })} 
                    className="input-field w-full py-2 text-sm" 
                    placeholder="https://..." 
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-dark-400 text-xs mb-1 block">Prix de base (DT)</label>
                    <input 
                      type="number" 
                      value={resourceForm.basePrice} 
                      onChange={e => setResourceForm({ ...resourceForm, basePrice: e.target.value })} 
                      className="input-field w-full py-2 text-sm" 
                      placeholder="300" 
                    />
                  </div>
                  <div>
                    <label className="text-dark-400 text-xs mb-1 block">Capacité</label>
                    <input 
                      type="number" 
                      value={resourceForm.capacity} 
                      onChange={e => setResourceForm({ ...resourceForm, capacity: e.target.value })} 
                      className="input-field w-full py-2 text-sm" 
                      placeholder="50" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-dark-400 text-xs mb-1 block">Localisation</label>
                    <input 
                      value={resourceForm.location} 
                      onChange={e => setResourceForm({ ...resourceForm, location: e.target.value })} 
                      className="input-field w-full py-2 text-sm" 
                      placeholder="Centre-ville" 
                    />
                  </div>
                  <div>
                    <label className="text-dark-400 text-xs mb-1 block">Ville</label>
                    <input 
                      value={resourceForm.city} 
                      onChange={e => setResourceForm({ ...resourceForm, city: e.target.value })} 
                      className="input-field w-full py-2 text-sm" 
                      placeholder="Sfax" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-dark-400 text-xs mb-1 block">Pays</label>
                    <input 
                      value={resourceForm.country} 
                      onChange={e => setResourceForm({ ...resourceForm, country: e.target.value })} 
                      className="input-field w-full py-2 text-sm" 
                      placeholder="Tunisie" 
                    />
                  </div>
                  <div>
                    <label className="text-dark-400 text-xs mb-1 block">Disponibilité</label>
                    <select 
                      value={resourceForm.availability} 
                      onChange={e => setResourceForm({ ...resourceForm, availability: e.target.value })} 
                      className="input-field w-full py-2 text-sm"
                    >
                      {availabilityOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  {editingResource && (
                    <button 
                      onClick={() => { setEditingResource(null); setResourceForm(defaultResource); }} 
                      className="py-1.5 px-3 text-xs text-dark-300 hover:text-white"
                    >
                      Annuler modification
                    </button>
                  )}
                  <button 
                    onClick={saveResource} 
                    disabled={savingResource || !resourceForm.name.trim()} 
                    className="btn-gold py-1.5 px-4 text-xs disabled:opacity-50"
                  >
                    {savingResource ? '...' : editingResource ? 'Mettre à jour' : 'Ajouter'}
                  </button>
                </div>
              </div>

              {/* Liste des ressources */}
              <div className="space-y-2">
                {serviceResources.length === 0 ? (
                  <p className="text-dark-500 text-sm text-center py-4">
                    Aucune ressource configurée
                  </p>
                ) : (
                  serviceResources.map(r => (
                    <div key={r.id} className="flex items-center gap-3 glass rounded-xl px-4 py-3">
                      {r.image ? (
                        <img src={r.image} alt={r.name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                          <MapPin size={16} className="text-dark-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium">{r.name}</span>
                          <span className={`w-2 h-2 rounded-full ${
                            r.availability === 'DISPONIBLE' ? 'bg-green-400' :
                            r.availability === 'RESERVEE' ? 'bg-yellow-400' :
                            r.availability === 'MAINTENANCE' ? 'bg-orange-400' : 'bg-red-400'
                          }`} />
                        </div>
                        {r.city && <p className="text-dark-500 text-xs">{r.city}{r.country ? `, ${r.country}` : ''}</p>}
                        <div className="flex items-center gap-3 mt-0.5 text-xs">
                          {r.basePrice != null && (
                            <span className="text-gold-400">{formatPrice(r.basePrice)}</span>
                          )}
                          {r.capacity != null && (
                            <span className="text-dark-400">{r.capacity} pers.</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => openEditResource(r)} 
                          className="p-1.5 rounded-lg text-dark-400 hover:text-gold-400 hover:bg-gold-500/10 transition-all"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={() => deleteResource(r.id)} 
                          className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}