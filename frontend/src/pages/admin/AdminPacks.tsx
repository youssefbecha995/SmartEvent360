import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Edit2, Trash2, X, Star, Crown, Zap, Package, Eye, EyeOff,
  Search, Settings, GripVertical, Check, ChevronDown, ChevronUp,
  Users, Clock, DollarSign, Image as ImageIcon, Calendar, Music,
  Camera, Home, Utensils, Palette, Sparkles, Save, AlertCircle,
  Calculator, TrendingDown
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { packsApi, servicesApi, NeonPack, ServiceItem } from '@/lib/neonApi';
import { formatPrice } from '@/lib/format';
import PageHeader from '@/components/ui/PageHeader';

const statusLabels: Record<string, { label: string; color: string; dot: string }> = {
  BROUILLON: { label: 'Brouillon', color: 'bg-dark-600 text-dark-300', dot: 'bg-dark-400' },
  EN_ATTENTE: { label: 'En attente', color: 'bg-yellow-500/20 text-yellow-400', dot: 'bg-yellow-400' },
  PUBLIE: { label: 'Publié', color: 'bg-green-500/20 text-green-400', dot: 'bg-green-400' },
  ARCHIVE: { label: 'Archivé', color: 'bg-dark-600 text-dark-400', dot: 'bg-dark-400' },
};

const serviceStatusOptions = [
  { value: 'INCLUS', label: 'Inclus' },
  { value: 'OPTIONNEL', label: 'Optionnel' },
  { value: 'OBLIGATOIRE', label: 'Obligatoire' },
];

const emptyForm = { 
  name: '', 
  description: '', 
  price: '', 
  originalPrice: '',
  duration: '4', 
  minGuests: '0',
  maxGuests: '100', 
  badge: '', 
  isPopular: false, 
  imageUrl: '', 
  eventType: '', 
  status: 'PUBLIE',
  isCustomizable: false,
  visibleOnStore: true,
  visibleForClients: true,
  discountPercent: '0',
  priceAutoCalculated: true,
};

export default function AdminPacks() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  
  // État principal
  const [packs, setPacks] = useState<NeonPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [search, setSearch] = useState('');

  // Modal Création/Modification
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<NeonPack | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Modal Ajout de service
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [allServices, setAllServices] = useState<ServiceItem[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [packServicesConfig, setPackServicesConfig] = useState<Record<string, any>>({});

  // Modal Configuration service
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configService, setConfigService] = useState<any>(null);
  const [configForm, setConfigForm] = useState({
    quantity: '1',
    duration: '',
    status: 'INCLUS',
    priceOverride: '',
    config: '{}',
  });

  // Chargement initial
  const load = async () => {
    setLoading(true);
    try {
      const data = await packsApi.adminList();
      setPacks(data);
    } catch { setPacks([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ── Calcul du prix total des services ──
  const calculateTotalServicesPrice = () => {
    let total = 0;
    for (const item of selectedServices) {
      const config = packServicesConfig[item.id || item.serviceId] || {};
      // Utiliser le prix override s'il existe, sinon le prix de base du service
      const price = config.priceOverride ? Number(config.priceOverride) : (item.basePrice || 0);
      const quantity = Number(config.quantity) || 1;
      total += price * quantity;
    }
    return total;
  };

  const totalServicesPrice = calculateTotalServicesPrice();

  // Calcul du prix du pack avec remise
  const calculatePackPrice = () => {
    const discount = Number(form.discountPercent) || 0;
    if (discount > 0) {
      return totalServicesPrice - (totalServicesPrice * discount / 100);
    }
    return totalServicesPrice;
  };

  const packPrice = calculatePackPrice();

  // Mise à jour automatique du prix
  useEffect(() => {
    if (form.priceAutoCalculated) {
      const newPrice = calculatePackPrice();
      setForm(prev => ({
        ...prev,
        price: String(Math.round(newPrice))
      }));
    }
  }, [selectedServices, packServicesConfig, form.discountPercent, form.priceAutoCalculated]);

  // ── Pack CRUD ──
  const openCreate = () => { 
    setEditing(null); 
    setForm({ ...emptyForm, priceAutoCalculated: true }); 
    setSelectedServices([]);
    setPackServicesConfig({});
    setFormError(''); 
    setShowModal(true); 
  };

  const openEdit = (e: React.MouseEvent, p: NeonPack) => {
    e.stopPropagation();
    setEditing(p);
    setForm({
      name: p.name, 
      description: p.description || '', 
      price: String(p.price),
      originalPrice: p.originalPrice ? String(p.originalPrice) : '',
      duration: String(p.duration), 
      minGuests: String(p.minGuests || 0),
      maxGuests: String(p.maxGuests),
      badge: p.badge || '', 
      isPopular: p.isPopular, 
      imageUrl: p.imageUrl || '',
      eventType: p.eventType || '', 
      status: p.status || 'PUBLIE',
      isCustomizable: p.isCustomizable || false,
      visibleOnStore: p.visibleOnStore !== undefined ? p.visibleOnStore : true,
      visibleForClients: p.visibleForClients !== undefined ? p.visibleForClients : true,
      discountPercent: '0',
      priceAutoCalculated: true,
    });
    // Récupérer les services du pack
    setSelectedServices(p.packServices || []);
    setFormError(''); 
    setShowModal(true); 
  };

  const handleSavePack = async () => {
    if (!form.name.trim()) { setFormError('Le nom est requis.'); return; }
    
    // Calculer le prix final
    let finalPrice = Number(form.price);
    if (form.priceAutoCalculated) {
      finalPrice = Math.round(calculatePackPrice());
    } else {
      if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) { 
        setFormError('Prix invalide.'); 
        return; 
      }
      finalPrice = Number(form.price);
    }
    
    setSaving(true);
    try {
      const body = {
        name: form.name, 
        description: form.description || null,
        price: finalPrice,
        originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
        duration: Number(form.duration),
        minGuests: Number(form.minGuests) || 0,
        maxGuests: Number(form.maxGuests), 
        badge: form.badge || null,
        isPopular: form.isPopular, 
        imageUrl: form.imageUrl.trim() || null,
        eventType: form.eventType || null, 
        status: form.status,
        isCustomizable: form.isCustomizable,
        visibleOnStore: form.visibleOnStore,
        visibleForClients: form.visibleForClients,
      };
      
      if (editing) {
        await packsApi.update(editing.id, body);
        await updatePackServices(editing.id);
        success('Pack modifié', form.name);
      } else {
        const created = await packsApi.create(body);
        await updatePackServices(created.id);
        success('Pack créé', form.name);
        setShowModal(false);
        load();
        navigate(`/admin/packs/${created.id}`);
        return;
      }
      setShowModal(false); 
      load();
    } catch (e: any) { 
      toastError('Erreur', e.message); 
    }
    finally { setSaving(false); }
  };

  const updatePackServices = async (packId: string) => {
    // Supprimer les services existants
    for (const ps of selectedServices) {
      if (ps.id) {
        try {
          await packsApi.removeService(packId, ps.serviceId);
        } catch {}
      }
    }
    // Ajouter les nouveaux services
    for (const item of selectedServices) {
      const config = packServicesConfig[item.id] || {};
      try {
        await packsApi.addService(packId, {
          serviceId: item.serviceId || item.id,
          quantity: Number(config.quantity) || 1,
          duration: config.duration ? Number(config.duration) : null,
          status: config.status || 'INCLUS',
          priceOverride: config.priceOverride ? Number(config.priceOverride) : null,
          config: config.config ? JSON.parse(config.config) : null,
        });
      } catch {}
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Supprimer le pack "${name}" ?`)) return;
    try {
      await packsApi.delete(id);
      setPacks(prev => prev.filter(p => p.id !== id));
      success('Pack supprimé');
    } catch { toastError('Erreur', 'Impossible de supprimer ce pack.'); }
  };

  const toggleActive = async (e: React.MouseEvent, p: NeonPack) => {
    e.stopPropagation();
    try {
      await packsApi.update(p.id, { isActive: !p.isActive });
      setPacks(prev => prev.map(x => x.id === p.id ? { ...x, isActive: !x.isActive } : x));
      success(p.isActive ? 'Pack désactivé' : 'Pack activé');
    } catch { toastError('Erreur', 'Mise à jour échouée.'); }
  };

  // ── Gestion des services ──
  const openServiceModal = async () => {
    setShowServiceModal(true);
    setLoadingServices(true);
    setServiceSearch('');
    try {
      const res = await servicesApi.list({ limit: 100 });
      const existingIds = selectedServices.map(s => s.serviceId || s.id);
      setAllServices(res.data.filter(s => s.active && !existingIds.includes(s.id)));
    } catch { setAllServices([]); }
    finally { setLoadingServices(false); }
  };

  const addServiceToPack = (service: ServiceItem) => {
    const item = { ...service, id: service.id, serviceId: service.id };
    setSelectedServices([...selectedServices, item]);
    setPackServicesConfig({
      ...packServicesConfig,
      [service.id]: {
        quantity: '1',
        duration: '',
        status: 'INCLUS',
        priceOverride: '',
        config: '{}',
      }
    });
    setAllServices(prev => prev.filter(s => s.id !== service.id));
    setShowServiceModal(false);
    success('Service ajouté', service.name);
  };

  const removeServiceFromPack = (serviceId: string, name: string) => {
    if (!confirm(`Retirer "${name}" du pack ?`)) return;
    setSelectedServices(prev => prev.filter(s => (s.id || s.serviceId) !== serviceId));
    const removed = selectedServices.find(s => (s.id || s.serviceId) === serviceId);
    if (removed) {
      setAllServices(prev => [...prev, removed as ServiceItem]);
    }
    success('Service retiré', name);
  };

  // ── Configuration d'un service ──
  const openConfig = (service: any) => {
    setConfigService(service);
    const config = packServicesConfig[service.id || service.serviceId] || {};
    setConfigForm({
      quantity: config.quantity || '1',
      duration: config.duration || '',
      status: config.status || 'INCLUS',
      priceOverride: config.priceOverride || '',
      config: config.config || '{}',
    });
    setShowConfigModal(true);
  };

  const saveConfig = () => {
    if (!configService) return;
    const id = configService.id || configService.serviceId;
    let configObj = {};
    try {
      configObj = JSON.parse(configForm.config);
    } catch {
      toastError('Erreur', 'Configuration JSON invalide');
      return;
    }
    setPackServicesConfig({
      ...packServicesConfig,
      [id]: {
        quantity: configForm.quantity,
        duration: configForm.duration,
        status: configForm.status,
        priceOverride: configForm.priceOverride,
        config: configForm.config,
      }
    });
    setShowConfigModal(false);
    success('Configuration sauvegardée');
  };

  // Filtres
  const eventTypes = [...new Set(packs.map(p => p.eventType).filter(Boolean))] as string[];

  const filtered = packs.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterEvent && p.eventType !== filterEvent) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── Rendu ──
  return (
    <div className="p-4 lg:p-6">
      <PageHeader 
        title="Gestion des Packs" 
        subtitle={`${packs.length} offres`}
        action={
          <button onClick={openCreate} className="btn-gold py-2 px-4 text-sm flex items-center gap-2">
            <Plus size={15} />Nouveau pack
          </button>
        } 
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Rechercher un pack..." 
            className="input-field py-2 pl-9 pr-3 text-sm w-48" 
          />
        </div>
        <select 
          value={filterStatus} 
          onChange={e => setFilterStatus(e.target.value)} 
          className="input-field py-2 px-3 text-sm w-40"
        >
          <option value="">Tous statuts</option>
          <option value="BROUILLON">Brouillon</option>
          <option value="EN_ATTENTE">En attente</option>
          <option value="PUBLIE">Publié</option>
          <option value="ARCHIVE">Archivé</option>
        </select>
        {eventTypes.length > 0 && (
          <select 
            value={filterEvent} 
            onChange={e => setFilterEvent(e.target.value)} 
            className="input-field py-2 px-3 text-sm w-40"
          >
            <option value="">Tous types</option>
            {eventTypes.map(et => <option key={et} value={et!}>{et}</option>)}
          </select>
        )}
      </div>

      {/* ── Liste des packs ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_,i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Package size={40} className="mx-auto mb-3 text-dark-600" />
          <p className="text-dark-400 mb-4">
            {packs.length === 0 ? "Aucun pack créé." : "Aucun pack ne correspond aux filtres."}
          </p>
          {packs.length === 0 && (
            <button onClick={openCreate} className="btn-gold py-2 px-6 text-sm">
              Créer le premier pack
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => {
            const st = statusLabels[p.status] || statusLabels.BROUILLON;
            return (
              <div key={p.id}
                onClick={() => navigate(`/admin/packs/${p.id}`)}
                className={`relative glass rounded-2xl p-6 border transition-all hover:-translate-y-1 cursor-pointer ${
                  p.isPopular ? 'border-gold-500 ring-1 ring-gold-500' : 'border-dark-600 hover:border-dark-500'
                } ${!p.isActive ? 'opacity-50' : ''}`}
              >
                {/* Status dot */}
                <div className="absolute top-3 right-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`} title={st.label} />
                </div>
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold-500 text-dark-900 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap z-10">
                    {p.badge}
                  </div>
                )}
                {p.imageUrl ? (
                  <div className="relative h-28 -mx-6 -mt-6 mb-4 overflow-hidden">
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-800 via-dark-800/20 to-transparent" />
                  </div>
                ) : (
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                    p.isPopular ? 'bg-gold-500 text-dark-900' : 'bg-dark-700 text-gold-500'
                  }`}>
                    {p.isPopular ? <Crown size={20} /> : <Zap size={20} />}
                  </div>
                )}
                <h3 className={`text-xl font-bold mb-1 ${p.isPopular ? 'text-gold-500' : 'text-white'}`}>
                  {p.name}
                </h3>
                {p.eventType && <p className="text-gold-500/70 text-xs mb-1">{p.eventType}</p>}
                {p.description && (
                  <p className="text-dark-400 text-xs mb-3 leading-relaxed line-clamp-2">{p.description}</p>
                )}
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-3xl font-bold text-white">{p.price.toLocaleString('fr-FR')}</span>
                  <span className="text-dark-400 text-sm">DT</span>
                  {p.originalPrice && p.originalPrice > p.price && (
                    <span className="text-dark-500 text-xs line-through ml-2">
                      {p.originalPrice.toLocaleString('fr-FR')} DT
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`badge text-[10px] ${st.color}`}>{st.label}</span>
                  {p._count && (
                    <span className="text-dark-500 text-[11px]">
                      {p._count.packServices} service{(p._count.packServices || 0) !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-dark-300 mb-4">
                  <div className="bg-dark-700 rounded-lg p-2 text-center">
                    <div className="text-white font-medium">{p.duration}h</div>
                    <div>Durée</div>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-2 text-center">
                    <div className="text-white font-medium">{p.maxGuests}+</div>
                    <div>Invités</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={(e) => openEdit(e, p)} 
                    className="flex-1 glass py-1.5 text-xs text-dark-300 hover:text-white rounded-lg flex items-center justify-center gap-1"
                  >
                    <Edit2 size={12} />Modifier
                  </button>
                  <button onClick={(e) => toggleActive(e, p)} 
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      p.isActive ? 'bg-green-500/20 text-green-400' : 'bg-dark-700 text-dark-400'
                    }`}
                  >
                    {p.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                  <button onClick={(e) => handleDelete(e, p.id, p.name)} 
                    className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL : Création/Modification du pack ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-2xl w-full z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 bg-dark-800 z-10">
              <h2 className="text-xl font-bold text-white">
                {editing ? 'Modifier le pack' : 'Nouveau pack'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-dark-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                  <AlertCircle size={16} /> {formError}
                </div>
              )}

              {/* Informations générales */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gold-400 flex items-center gap-2">
                  <Package size={16} /> Informations générales
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-dark-300 text-sm mb-1.5 block">Nom du pack *</label>
                    <input 
                      value={form.name} 
                      onChange={e => { setForm(p=>({...p,name:e.target.value})); setFormError(''); }} 
                      className="input-field w-full" 
                      placeholder="Ex: Pack Mariage Gold" 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-dark-300 text-sm mb-1.5 block">Description</label>
                    <textarea 
                      value={form.description} 
                      onChange={e => setForm(p=>({...p,description:e.target.value}))} 
                      rows={3} 
                      className="input-field w-full resize-none" 
                      placeholder="Décrivez votre pack en détail..." 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-dark-300 text-sm mb-1.5 block">Image (URL)</label>
                    <input 
                      value={form.imageUrl} 
                      onChange={e => setForm(p=>({...p,imageUrl:e.target.value}))} 
                      className="input-field w-full" 
                      placeholder="https://exemple.com/image.jpg" 
                    />
                  </div>
                </div>
              </div>

              {/* ── TARIFICATION AVEC CALCUL AUTOMATIQUE ── */}
              <div className="space-y-4 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gold-400 flex items-center gap-2">
                    <Calculator size={16} /> Tarification
                  </h3>
                  <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={form.priceAutoCalculated} 
                      onChange={e => setForm(p=>({...p,priceAutoCalculated:e.target.checked}))} 
                      className="accent-gold-500 w-4 h-4"
                    />
                    Calcul automatique
                  </label>
                </div>

                {/* Affichage du total des services */}
                {selectedServices.length > 0 && (
                  <div className="glass rounded-xl p-4 bg-dark-700/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-300">Total des services</span>
                      <span className="text-white font-medium">{formatPrice(totalServicesPrice)}</span>
                    </div>
                    {Number(form.discountPercent) > 0 && (
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-dark-300">Remise ({form.discountPercent}%)</span>
                        <span className="text-green-400 font-medium">-{formatPrice(totalServicesPrice * Number(form.discountPercent) / 100)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-white/10">
                      <span className="text-gold-400 font-medium">Prix calculé</span>
                      <span className="text-gold-400 font-bold text-lg">{formatPrice(packPrice)}</span>
                    </div>
                    {totalServicesPrice > 0 && packPrice < totalServicesPrice && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-green-400">
                        <TrendingDown size={14} />
                        Économie : {formatPrice(totalServicesPrice - packPrice)} ({Math.round((1 - packPrice/totalServicesPrice) * 100)}%)
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-dark-300 text-sm mb-1.5 block">Prix (DT) {form.priceAutoCalculated ? '(Auto)' : '*'}</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={form.price} 
                      onChange={e => { 
                        setForm(p=>({...p,price:e.target.value, priceAutoCalculated: false})); 
                        setFormError(''); 
                      }} 
                      className={`input-field w-full ${form.priceAutoCalculated ? 'bg-dark-700/50 text-gold-400' : ''}`} 
                      placeholder={form.priceAutoCalculated ? 'Calculé automatiquement' : '1300'}
                      disabled={form.priceAutoCalculated}
                      readOnly={form.priceAutoCalculated}
                    />
                    {form.priceAutoCalculated && (
                      <p className="text-dark-500 text-[10px] mt-1">⚠️ Prix calculé automatiquement à partir des services</p>
                    )}
                  </div>
                  <div>
                    <label className="text-dark-300 text-sm mb-1.5 block">Remise (%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={form.discountPercent} 
                      onChange={e => setForm(p=>({...p,discountPercent:e.target.value}))} 
                      className="input-field w-full" 
                      placeholder="0" 
                    />
                  </div>
                  <div>
                    <label className="text-dark-300 text-sm mb-1.5 block">Prix original (DT)</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={form.originalPrice} 
                      onChange={e => setForm(p=>({...p,originalPrice:e.target.value}))} 
                      className="input-field w-full" 
                      placeholder="1600 (prix barré)" 
                    />
                  </div>
                  <div>
                    <label className="text-dark-300 text-sm mb-1.5 block">Badge</label>
                    <input 
                      value={form.badge} 
                      onChange={e => setForm(p=>({...p,badge:e.target.value}))} 
                      className="input-field w-full" 
                      placeholder="⭐ Le plus populaire" 
                    />
                  </div>
                  <div>
                    <label className="text-dark-300 text-sm mb-1.5 block">Durée (heures)</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={form.duration} 
                      onChange={e => setForm(p=>({...p,duration:e.target.value}))} 
                      className="input-field w-full" 
                    />
                  </div>
                  <div>
                    <label className="text-dark-300 text-sm mb-1.5 block">Max invités</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={form.maxGuests} 
                      onChange={e => setForm(p=>({...p,maxGuests:e.target.value}))} 
                      className="input-field w-full" 
                    />
                  </div>
                  <div>
                    <label className="text-dark-300 text-sm mb-1.5 block">Min invités</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={form.minGuests} 
                      onChange={e => setForm(p=>({...p,minGuests:e.target.value}))} 
                      className="input-field w-full" 
                      placeholder="50" 
                    />
                  </div>
                </div>
              </div>

              {/* Catégorie & Statut */}
              <div className="space-y-4 border-t border-white/10 pt-4">
                <h3 className="text-sm font-medium text-gold-400 flex items-center gap-2">
                  <Settings size={16} /> Catégorie & Statut
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-dark-300 text-sm mb-1.5 block">Type d'événement</label>
                    <input 
                      value={form.eventType} 
                      onChange={e => setForm(p=>({...p,eventType:e.target.value}))} 
                      className="input-field w-full" 
                      placeholder="Mariage, Anniversaire..." 
                    />
                  </div>
                  <div>
                    <label className="text-dark-300 text-sm mb-1.5 block">Statut</label>
                    <select 
                      value={form.status} 
                      onChange={e => setForm(p=>({...p,status:e.target.value}))} 
                      className="input-field w-full"
                    >
                      <option value="BROUILLON">Brouillon</option>
                      <option value="EN_ATTENTE">En attente</option>
                      <option value="PUBLIE">Publié</option>
                      <option value="ARCHIVE">Archivé</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={form.isPopular} 
                      onChange={e => setForm(p=>({...p,isPopular:e.target.checked}))} 
                      className="accent-gold-500 w-4 h-4"
                    />
                    Pack populaire (mis en avant)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={form.isCustomizable} 
                      onChange={e => setForm(p=>({...p,isCustomizable:e.target.checked}))} 
                      className="accent-gold-500 w-4 h-4"
                    />
                    Personnalisable par le client
                  </label>
                  <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={form.visibleOnStore} 
                      onChange={e => setForm(p=>({...p,visibleOnStore:e.target.checked}))} 
                      className="accent-gold-500 w-4 h-4"
                    />
                    Visible sur la vitrine
                  </label>
                  <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={form.visibleForClients} 
                      onChange={e => setForm(p=>({...p,visibleForClients:e.target.checked}))} 
                      className="accent-gold-500 w-4 h-4"
                    />
                    Visible pour les clients
                  </label>
                </div>
              </div>

              {/* ── SERVICES DU PACK ── */}
              <div className="space-y-4 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gold-400 flex items-center gap-2">
                    <Music size={16} /> Services du pack ({selectedServices.length})
                  </h3>
                  <button 
                    type="button"
                    onClick={openServiceModal} 
                    className="btn-gold py-1.5 px-3 text-xs flex items-center gap-1"
                  >
                    <Plus size={12} /> Ajouter un service
                  </button>
                </div>

                {selectedServices.length === 0 ? (
                  <div className="glass rounded-xl p-6 text-center border border-dashed border-dark-600">
                    <Package size={24} className="mx-auto mb-2 text-dark-500" />
                    <p className="text-dark-400 text-sm">Aucun service dans ce pack</p>
                    <p className="text-dark-500 text-xs mt-1">Cliquez sur "Ajouter un service" pour commencer</p>
                    <p className="text-dark-500 text-xs mt-2">💡 Le prix sera calculé automatiquement</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {selectedServices.map((s) => {
                        const config = packServicesConfig[s.id || s.serviceId] || {};
                        const price = config.priceOverride ? Number(config.priceOverride) : (s.basePrice || 0);
                        const quantity = Number(config.quantity) || 1;
                        return (
                          <div key={s.id || s.serviceId} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
                            <GripVertical size={14} className="text-dark-600 flex-shrink-0" />
                            <div className="w-8 h-8 rounded-lg bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                              {s.icon ? <span className="text-sm">{s.icon}</span> : <Package size={14} className="text-gold-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-white text-sm font-medium">{s.name}</span>
                                <span className={`badge text-[10px] ${
                                  config.status === 'INCLUS' ? 'bg-green-500/20 text-green-400' :
                                  config.status === 'OPTIONNEL' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {serviceStatusOptions.find(o => o.value === config.status)?.label || 'Inclus'}
                                </span>
                                <span className="badge bg-dark-700 text-dark-400 text-[10px] border border-white/5">
                                  ×{config.quantity || 1}
                                </span>
                                {config.duration && (
                                  <span className="badge bg-dark-700 text-dark-400 text-[10px] border border-white/5">
                                    {config.duration}h
                                  </span>
                                )}
                                <span className="text-gold-400 text-xs font-medium ml-2">
                                  {formatPrice(price * quantity)}
                                </span>
                              </div>
                              {s.shortDescription && (
                                <p className="text-dark-500 text-xs truncate">{s.shortDescription}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => openConfig(s)} 
                                className="p-1.5 rounded-lg text-dark-400 hover:text-gold-400 hover:bg-gold-500/10 transition-all"
                                title="Configurer"
                              >
                                <Settings size={13} />
                              </button>
                              <button 
                                onClick={() => removeServiceFromPack(s.id || s.serviceId, s.name)} 
                                className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Retirer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Récapitulatif des prix */}
                    {selectedServices.length > 0 && (
                      <div className="glass rounded-xl p-4 bg-dark-700/50 border border-gold-500/20">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-dark-300">💰 Total des services</span>
                          <span className="text-white font-bold">{formatPrice(totalServicesPrice)}</span>
                        </div>
                        {Number(form.discountPercent) > 0 && (
                          <div className="flex items-center justify-between text-sm mt-1">
                            <span className="text-dark-300">📉 Remise ({form.discountPercent}%)</span>
                            <span className="text-green-400 font-medium">-{formatPrice(totalServicesPrice * Number(form.discountPercent) / 100)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-lg font-bold mt-2 pt-2 border-t border-gold-500/20">
                          <span className="text-gold-400">🎯 Prix final du pack</span>
                          <span className="text-gold-400">
                            {formatPrice(packPrice)}
                            {Number(form.originalPrice) > 0 && packPrice < Number(form.originalPrice) && (
                              <span className="text-dark-500 text-sm line-through ml-2">
                                {formatPrice(Number(form.originalPrice))}
                              </span>
                            )}
                          </span>
                        </div>
                        {totalServicesPrice > 0 && packPrice < totalServicesPrice && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-green-400 justify-center">
                            <TrendingDown size={14} />
                            Économie : {formatPrice(totalServicesPrice - packPrice)} ({Math.round((1 - packPrice/totalServicesPrice) * 100)}%)
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-5 border-t border-white/10 sticky bottom-0 bg-dark-800">
              <button onClick={() => setShowModal(false)} className="btn-ghost py-2.5 px-5 text-sm">
                Annuler
              </button>
              <button 
                onClick={handleSavePack} 
                disabled={saving} 
                className="btn-gold py-2.5 px-6 text-sm disabled:opacity-60 flex items-center gap-2"
              >
                {saving ? (
                  <>⏳ Sauvegarde...</>
                ) : editing ? (
                  <>💾 Enregistrer</>
                ) : (
                  <>✨ Créer le pack</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL : Ajout de service ── */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowServiceModal(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-md w-full z-10 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Ajouter un service</h2>
              <button onClick={() => setShowServiceModal(false)} className="text-dark-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input 
                  value={serviceSearch} 
                  onChange={e => setServiceSearch(e.target.value)} 
                  placeholder="Rechercher un service..." 
                  className="input-field w-full py-2 pl-9 pr-3 text-sm" 
                />
              </div>
              {loadingServices ? (
                <div className="space-y-3">
                  {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="h-12 bg-dark-700 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : allServices.length === 0 ? (
                <div className="text-center py-8">
                  <Package size={32} className="mx-auto mb-2 text-dark-600" />
                  <p className="text-dark-400 text-sm">Aucun service disponible</p>
                  <p className="text-dark-500 text-xs mt-1">Tous les services sont déjà dans ce pack</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allServices
                    .filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()))
                    .map(s => (
                      <button 
                        key={s.id} 
                        onClick={() => addServiceToPack(s)}
                        className="w-full flex items-center gap-3 p-3 glass rounded-xl hover:bg-gold-500/10 hover:border-gold-500/30 border border-transparent transition-all text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                          {s.icon ? <span className="text-sm">{s.icon}</span> : <Package size={14} className="text-gold-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-white text-sm font-medium block truncate">{s.name}</span>
                          {s.shortDescription && (
                            <span className="text-dark-500 text-xs block truncate">{s.shortDescription}</span>
                          )}
                        </div>
                        <span className="text-gold-400 text-xs font-medium">{formatPrice(s.basePrice)}</span>
                        <Plus size={14} className="text-gold-400 flex-shrink-0" />
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL : Configuration du service ── */}
      {showConfigModal && configService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowConfigModal(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-md w-full z-10">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold text-white">Configurer : {configService.name}</h2>
                <p className="text-dark-400 text-xs mt-0.5">Paramètres du service dans ce pack</p>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="text-dark-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Quantité</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={configForm.quantity} 
                    onChange={e => setConfigForm(p => ({ ...p, quantity: e.target.value }))} 
                    className="input-field w-full py-2 text-sm" 
                  />
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Durée (h)</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={configForm.duration} 
                    onChange={e => setConfigForm(p => ({ ...p, duration: e.target.value }))} 
                    className="input-field w-full py-2 text-sm" 
                    placeholder="—" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Statut</label>
                  <select 
                    value={configForm.status} 
                    onChange={e => setConfigForm(p => ({ ...p, status: e.target.value }))} 
                    className="input-field w-full py-2 text-sm"
                  >
                    {serviceStatusOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Prix override (DT)</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={configForm.priceOverride} 
                    onChange={e => setConfigForm(p => ({ ...p, priceOverride: e.target.value }))} 
                    className="input-field w-full py-2 text-sm" 
                    placeholder="Prix spécifique" 
                  />
                  <p className="text-dark-500 text-[10px] mt-1">💡 Laissez vide pour utiliser le prix de base</p>
                </div>
              </div>
              <div>
                <label className="text-dark-300 text-xs mb-1 block">Configuration (JSON)</label>
                <textarea 
                  value={configForm.config} 
                  onChange={e => setConfigForm(p => ({ ...p, config: e.target.value }))} 
                  rows={4} 
                  className="input-field w-full py-2 text-sm font-mono resize-none" 
                  placeholder={'{\n  "param1": "valeur",\n  "param2": true\n}'} 
                />
                <p className="text-dark-500 text-[10px] mt-1">
                  ⚙️ Utilisez JSON pour configurer les paramètres avancés du service
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-white/10">
              <button onClick={() => setShowConfigModal(false)} className="py-2 px-5 text-sm text-dark-300 hover:text-white">
                Annuler
              </button>
              <button onClick={saveConfig} className="btn-gold py-2 px-6 text-sm flex items-center gap-2">
                <Save size={14} /> Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}