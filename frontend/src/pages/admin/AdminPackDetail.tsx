import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Edit2, Save, X, Package, Settings,
  Clock, Users, Check, GripVertical, ChevronDown, ChevronUp, User,
  Calculator,
} from 'lucide-react';
import { packsApi, servicesApi, providersApi, NeonPack, NeonPackService, ServiceItem, ServiceResource, Provider } from '@/lib/neonApi';
import { formatPrice } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';

const statusLabels: Record<string, { label: string; color: string }> = {
  BROUILLON: { label: 'Brouillon', color: 'bg-dark-600 text-dark-300' },
  EN_ATTENTE: { label: 'En attente', color: 'bg-yellow-500/20 text-yellow-400' },
  PUBLIE: { label: 'Publié', color: 'bg-green-500/20 text-green-400' },
  ARCHIVE: { label: 'Archivé', color: 'bg-dark-600 text-dark-400' },
};

const psStatusLabels: Record<string, string> = {
  INCLUS: 'Inclus',
  OPTIONNEL: 'Optionnel',
  OBLIGATOIRE: 'Obligatoire',
};

export default function AdminPackDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [pack, setPack] = useState<NeonPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit mode for pack info
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', price: '', originalPrice: '',
    currency: 'TND', pricePerPerson: '', depositPercent: '', cancellationFee: '',
    duration: '', maxGuests: '', minGuests: '', badge: '', category: '',
    eventType: '', status: 'PUBLIE', isPopular: false, isCustomizable: false,
    promoCode: '', negotiable: false, isCombo: false,
    isSeasonalPromo: false, promoStartDate: '', promoEndDate: '',
    visibleOnStore: true, visibleForClients: true, imageUrl: '', videoUrl: '',
  });

  // Add service modal
  const [showAddService, setShowAddService] = useState(false);
  const [availableServices, setAvailableServices] = useState<ServiceItem[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Configure service modal
  const [configService, setConfigService] = useState<NeonPackService | null>(null);
  const [configForm, setConfigForm] = useState({
    resourceId: '', providerId: '', quantity: '1', duration: '', priceOverride: '',
    status: 'INCLUS', displayOrder: '0', config: '',
  });
  const [serviceResources, setServiceResources] = useState<ServiceResource[]>([]);
  const [serviceParameters, setServiceParameters] = useState<any[]>([]);
  const [serviceProviders, setServiceProviders] = useState<Provider[]>([]);

  // Add service with provider flow
  const [addProviderStep, setAddProviderStep] = useState(false);
  const [selectedServiceForProvider, setSelectedServiceForProvider] = useState<ServiceItem | null>(null);
  const [availableProviders, setAvailableProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      const data = await packsApi.get(id);
      setPack(data);
    } catch (e: any) {
      toastError('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  // ── Pack info edit ──
  const startEdit = () => {
    if (!pack) return;
    setForm({
      name: pack.name,
      description: pack.description || '',
      price: String(pack.price),
      originalPrice: pack.originalPrice != null ? String(pack.originalPrice) : '',
      currency: pack.currency || 'TND',
      pricePerPerson: pack.pricePerPerson != null ? String(pack.pricePerPerson) : '',
      depositPercent: pack.depositPercent != null ? String(pack.depositPercent) : '',
      cancellationFee: pack.cancellationFee != null ? String(pack.cancellationFee) : '',
      duration: String(pack.duration),
      maxGuests: String(pack.maxGuests),
      minGuests: String(pack.minGuests || 0),
      badge: pack.badge || '',
      category: pack.category || '',
      eventType: pack.eventType || '',
      status: pack.status || 'PUBLIE',
      isPopular: pack.isPopular,
      isCustomizable: pack.isCustomizable,
      promoCode: pack.promoCode || '',
      negotiable: pack.negotiable,
      isCombo: pack.isCombo,
      isSeasonalPromo: pack.isSeasonalPromo,
      promoStartDate: pack.promoStartDate ? pack.promoStartDate.slice(0, 10) : '',
      promoEndDate: pack.promoEndDate ? pack.promoEndDate.slice(0, 10) : '',
      visibleOnStore: pack.visibleOnStore,
      visibleForClients: pack.visibleForClients,
      imageUrl: pack.imageUrl || '',
      videoUrl: pack.videoUrl || '',
    });
    setEditing(true);
  };

  const savePack = async () => {
    if (!pack) return;
    setSaving(true);
    try {
      await packsApi.update(pack.id, {
        name: form.name,
        description: form.description || null,
        price: Number(form.price),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
        currency: form.currency,
        pricePerPerson: form.pricePerPerson ? Number(form.pricePerPerson) : null,
        depositPercent: form.depositPercent ? Number(form.depositPercent) : null,
        cancellationFee: form.cancellationFee ? Number(form.cancellationFee) : null,
        duration: Number(form.duration),
        maxGuests: Number(form.maxGuests),
        minGuests: Number(form.minGuests) || 0,
        badge: form.badge || null,
        category: form.category || null,
        eventType: form.eventType || null,
        status: form.status,
        isPopular: form.isPopular,
        isCustomizable: form.isCustomizable,
        promoCode: form.promoCode || null,
        negotiable: form.negotiable,
        isCombo: form.isCombo,
        isSeasonalPromo: form.isSeasonalPromo,
        promoStartDate: form.promoStartDate || null,
        promoEndDate: form.promoEndDate || null,
        visibleOnStore: form.visibleOnStore,
        visibleForClients: form.visibleForClients,
        imageUrl: form.imageUrl || null,
        videoUrl: form.videoUrl || null,
      });
      setEditing(false);
      success('Pack mis à jour');
      load();
    } catch (e: any) {
      toastError('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Add service to pack ──
  const openAddService = async () => {
    setShowAddService(true);
    setAddProviderStep(false);
    setSelectedServiceForProvider(null);
    setLoadingServices(true);
    try {
      const res = await servicesApi.list({ limit: 100 });
      const existing = (pack?.packServices || []).map(ps => ps.serviceId);
      setAvailableServices(res.data.filter(s => s.active && !existing.includes(s.id)));
    } catch { setAvailableServices([]); }
    finally { setLoadingServices(false); }
  };

  const handleSelectServiceForProvider = async (service: ServiceItem) => {
    setSelectedServiceForProvider(service);
    setAddProviderStep(true);
    setLoadingProviders(true);
    try {
      const providers = await providersApi.list({ serviceId: service.id });
      setAvailableProviders(providers);
    } catch { setAvailableProviders([]); }
    finally { setLoadingProviders(false); }
  };

  const addServiceToPack = async (serviceId: string, providerId?: string | null) => {
    if (!pack) return;
    try {
      await packsApi.addService(pack.id, { serviceId, providerId: providerId ?? null });
      setShowAddService(false);
      setAddProviderStep(false);
      setSelectedServiceForProvider(null);
      success('Service ajouté au pack');
      load();
    } catch (e: any) {
      toastError('Erreur', e.message);
    }
  };

  const removeServiceFromPack = async (serviceId: string, serviceName: string) => {
    if (!pack || !confirm(`Retirer "${serviceName}" du pack ?`)) return;
    try {
      await packsApi.removeService(pack.id, serviceId);
      success('Service retiré du pack');
      load();
    } catch (e: any) {
      toastError('Erreur', e.message);
    }
  };

  // ── Configure service in pack ──
  const openConfig = async (ps: NeonPackService) => {
    setConfigService(ps);
    setServiceResources(ps.service.resources || []);
    setServiceParameters(ps.service.parameters || []);
    setConfigForm({
      resourceId: ps.resourceId || '',
      providerId: ps.providerId || '',
      quantity: String(ps.quantity || 1),
      duration: ps.duration != null ? String(ps.duration) : '',
      priceOverride: ps.priceOverride != null ? String(ps.priceOverride) : '',
      status: ps.status || 'INCLUS',
      displayOrder: String(ps.displayOrder || 0),
      config: ps.config ? JSON.stringify(ps.config, null, 2) : '',
    });
    setLoadingProviders(true);
    try {
      const providers = await providersApi.list({ serviceId: ps.serviceId });
      setServiceProviders(providers);
    } catch { setServiceProviders([]); }
    finally { setLoadingProviders(false); }
  };

  const saveConfig = async () => {
    if (!pack || !configService) return;
    setSaving(true);
    try {
      let config = null;
      if (configForm.config.trim()) {
        try { config = JSON.parse(configForm.config); } catch { toastError('Erreur', 'JSON invalide dans la configuration'); setSaving(false); return; }
      }
      await packsApi.addService(pack.id, {
        serviceId: configService.serviceId,
        resourceId: configForm.resourceId || null,
        providerId: configForm.providerId || null,
        quantity: Number(configForm.quantity) || 1,
        duration: configForm.duration ? Number(configForm.duration) : null,
        priceOverride: configForm.priceOverride ? Number(configForm.priceOverride) : null,
        status: configForm.status,
        displayOrder: Number(configForm.displayOrder) || 0,
        config,
      });
      setConfigService(null);
      success('Configuration sauvegardée');
      load();
    } catch (e: any) {
      toastError('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  const calcPrice = async () => {
    if (!pack) return;
    try {
      const res = await packsApi.calculatePrice(pack.id);
      success(`Prix calculé : ${formatPrice(res.finalPrice)} (base ${formatPrice(res.totalServices)}, -${res.discountPercent}%)`);
      load();
    } catch (e: any) { toastError('Erreur', e.message); }
  };

  if (loading) return <div className="glass rounded-2xl h-64 animate-pulse" />;

  if (!pack) {
    return (
      <div className="text-center py-16">
        <p className="text-dark-400 mb-4">Pack non trouvé</p>
        <button onClick={() => navigate('/admin/packs')} className="btn-outline-gold py-2 px-5 text-sm">Retour</button>
      </div>
    );
  }

  const st = statusLabels[pack.status] || statusLabels.BROUILLON;
  const totalServicesPrice = (pack.packServices || []).reduce((sum, ps) => {
    return sum + (ps.priceOverride ?? ps.service.resources?.[0]?.basePrice ?? 0);
  }, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/admin/packs')} className="text-dark-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-white">{pack.name}</h1>
            <span className={`badge text-xs ${st.color}`}>{st.label}</span>
            {pack.isPopular && <span className="badge bg-gold-500/20 text-gold-400 border border-gold-500/30 text-xs">Populaire</span>}
            {pack.badge && <span className="badge bg-gold-500/10 text-gold-300 border border-gold-500/20 text-xs">{pack.badge}</span>}
          </div>
          <p className="text-dark-400 text-sm mt-1">
            {formatPrice(pack.price)} — {pack.duration}h — {pack.maxGuests} invités
            {pack.eventType && ` — ${pack.eventType}`}
          </p>
        </div>
        <button onClick={startEdit} className="btn-outline-gold py-2 px-4 text-sm flex items-center gap-2">
          <Edit2 size={14} /> Modifier
        </button>
        <button onClick={calcPrice} className="btn-outline-gold py-2 px-4 text-sm flex items-center gap-2">
          <Calculator size={14} /> Calculer prix
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{formatPrice(pack.price)}</div>
          <div className="text-dark-500 text-xs mt-1">Prix du pack</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{pack.duration}h</div>
          <div className="text-dark-500 text-xs mt-1">Durée</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{pack.maxGuests}</div>
          <div className="text-dark-500 text-xs mt-1">Invités max</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gold-400">{pack.packServices?.length || 0}</div>
          <div className="text-dark-500 text-xs mt-1">Services inclus</div>
        </div>
      </div>

      {totalServicesPrice > pack.price && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-xl px-4 py-2.5 mb-6">
          Économisez {formatPrice(totalServicesPrice - pack.price)} avec ce pack (valeur totale des services : {formatPrice(totalServicesPrice)})
        </div>
      )}

      {/* Pack Services */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Package size={18} className="text-gold-500" /> Services du pack
        </h2>
        <button onClick={openAddService} className="btn-gold py-2 px-4 text-sm flex items-center gap-2">
          <Plus size={15} /> Ajouter un service
        </button>
      </div>

      {(!pack.packServices || pack.packServices.length === 0) ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Package size={36} className="mx-auto mb-3 text-dark-600" />
          <p className="text-dark-400 text-sm mb-4">Aucun service dans ce pack</p>
          <button onClick={openAddService} className="btn-outline-gold py-2 px-6 text-sm">Ajouter le premier service</button>
        </div>
      ) : (
        <div className="space-y-3">
          {pack.packServices
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((ps) => {
              const cfg = (ps.config && typeof ps.config === 'object') ? ps.config as Record<string, any> : {};
              const configEntries = Object.entries(cfg).filter(([, v]) => v !== null && v !== undefined && v !== '');
              return (
                <div key={ps.id} className="glass rounded-xl px-5 py-4">
                  <div className="flex items-center gap-4">
                    <GripVertical size={14} className="text-dark-600 flex-shrink-0" />
                    <div className="w-10 h-10 rounded-lg bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                      {ps.service.icon ? <span className="text-lg">{ps.service.icon}</span> : <Package size={16} className="text-gold-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium text-sm">{ps.service.name}</span>
                        <span className="badge bg-dark-700 text-dark-300 text-[10px] border border-white/5">{psStatusLabels[ps.status] || ps.status}</span>
                        <span className="badge bg-dark-700 text-dark-400 text-[10px] border border-white/5">×{ps.quantity}</span>
                        {ps.duration && <span className="badge bg-dark-700 text-dark-400 text-[10px] border border-white/5">{ps.duration}h</span>}
                      </div>
                      {ps.resource && (
                        <p className="text-dark-500 text-xs mt-0.5">Ressource : {ps.resource.name}</p>
                      )}
                      {ps.provider && (
                        <p className="text-blue-400 text-xs mt-0.5 flex items-center gap-1">
                          <User size={10} /> {ps.provider.name}{ps.provider.city ? ` · ${ps.provider.city}` : ''}
                        </p>
                      )}
                      {configEntries.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {configEntries.slice(0, 6).map(([k, v]) => (
                            <span key={k} className="text-[10px] bg-dark-700 text-dark-300 px-2 py-0.5 rounded-full border border-white/5">
                              {k}: {typeof v === 'boolean' ? (v ? '✓' : '✗') : String(v).slice(0, 30)}
                            </span>
                          ))}
                          {configEntries.length > 6 && (
                            <span className="text-[10px] text-dark-500">+{configEntries.length - 6}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {ps.priceOverride != null && (
                        <span className="text-gold-400 text-xs font-medium mr-2">{formatPrice(ps.priceOverride)}</span>
                      )}
                      <button onClick={() => openConfig(ps)} className="p-2 rounded-lg text-dark-400 hover:text-gold-400 hover:bg-gold-500/10 transition-all" title="Configurer">
                        <Settings size={14} />
                      </button>
                      <button onClick={() => navigate(`/admin/services/${ps.serviceId}`)} className="p-2 rounded-lg text-dark-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Voir le service">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => removeServiceFromPack(ps.serviceId, ps.service.name)} className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Retirer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* ── Edit Pack Modal ── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditing(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-lg w-full z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Modifier le pack</h2>
              <button onClick={() => setEditing(false)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-dark-300 text-xs mb-1 block">Nom *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-field w-full py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-dark-300 text-xs mb-1 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} className="input-field w-full py-2.5 text-sm resize-none" />
              </div>
              <div>
                <label className="text-dark-300 text-xs mb-1 block">Image (URL)</label>
                <input value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} className="input-field w-full py-2.5 text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="text-dark-300 text-xs mb-1 block">Vidéo (URL YouTube/Vimeo)</label>
                <input value={form.videoUrl} onChange={e => setForm(p => ({ ...p, videoUrl: e.target.value }))} className="input-field w-full py-2.5 text-sm" placeholder="https://youtube.com/..." />
              </div>

              {/* Tarification */}
              <div className="border-t border-white/10 pt-4">
                <p className="text-gold-400 text-xs font-semibold uppercase tracking-wide mb-3">Tarification</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-dark-300 text-xs mb-1 block">Prix *</label>
                    <input type="number" min="0" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="input-field w-full py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-dark-300 text-xs mb-1 block">Devise</label>
                    <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))} className="input-field w-full py-2.5 text-sm">
                      <option value="TND">TND</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-dark-300 text-xs mb-1 block">Prix original</label>
                    <input type="number" min="0" value={form.originalPrice} onChange={e => setForm(p => ({ ...p, originalPrice: e.target.value }))} className="input-field w-full py-2.5 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div>
                    <label className="text-dark-300 text-xs mb-1 block">Prix/pers.</label>
                    <input type="number" min="0" value={form.pricePerPerson} onChange={e => setForm(p => ({ ...p, pricePerPerson: e.target.value }))} className="input-field w-full py-2.5 text-sm" placeholder="—" />
                  </div>
                  <div>
                    <label className="text-dark-300 text-xs mb-1 block">Acompte (%)</label>
                    <input type="number" min="0" max="100" value={form.depositPercent} onChange={e => setForm(p => ({ ...p, depositPercent: e.target.value }))} className="input-field w-full py-2.5 text-sm" placeholder="—" />
                  </div>
                  <div>
                    <label className="text-dark-300 text-xs mb-1 block">Frais annulation</label>
                    <input type="number" min="0" value={form.cancellationFee} onChange={e => setForm(p => ({ ...p, cancellationFee: e.target.value }))} className="input-field w-full py-2.5 text-sm" placeholder="—" />
                  </div>
                </div>
              </div>

              {/* Capacité */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Durée (h)</label>
                  <input type="number" min="1" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} className="input-field w-full py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Min invités</label>
                  <input type="number" min="0" value={form.minGuests} onChange={e => setForm(p => ({ ...p, minGuests: e.target.value }))} className="input-field w-full py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Max invités</label>
                  <input type="number" min="1" value={form.maxGuests} onChange={e => setForm(p => ({ ...p, maxGuests: e.target.value }))} className="input-field w-full py-2.5 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Type d'événement</label>
                  <input value={form.eventType} onChange={e => setForm(p => ({ ...p, eventType: e.target.value }))} className="input-field w-full py-2.5 text-sm" placeholder="Mariage..." />
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Catégorie</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="input-field w-full py-2.5 text-sm">
                    <option value="">—</option>
                    <option value="ECONOMIQUE">Économique</option>
                    <option value="STANDARD">Standard</option>
                    <option value="PREMIUM">Premium</option>
                    <option value="LUXE">Luxe</option>
                  </select>
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Badge</label>
                  <input value={form.badge} onChange={e => setForm(p => ({ ...p, badge: e.target.value }))} className="input-field w-full py-2.5 text-sm" placeholder="⭐ Populaire" />
                </div>
              </div>

              <div>
                <label className="text-dark-300 text-xs mb-1 block">Statut</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="input-field w-full py-2.5 text-sm">
                  <option value="BROUILLON">Brouillon</option>
                  <option value="EN_ATTENTE">En attente</option>
                  <option value="PUBLIE">Publié</option>
                  <option value="ARCHIVE">Archivé</option>
                </select>
              </div>

              {/* Promo */}
              <div className="border-t border-white/10 pt-4">
                <p className="text-gold-400 text-xs font-semibold uppercase tracking-wide mb-3">Promotions</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-dark-300 text-xs mb-1 block">Code promo</label>
                    <input value={form.promoCode} onChange={e => setForm(p => ({ ...p, promoCode: e.target.value }))} className="input-field w-full py-2.5 text-sm" placeholder="WEDDING2026" />
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center gap-3 p-3 bg-dark-700 rounded-xl w-full">
                      <button type="button" onClick={() => setForm(p => ({ ...p, negotiable: !p.negotiable }))}
                        className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ${form.negotiable ? 'bg-gold-500' : 'bg-dark-600'}`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.negotiable ? 'left-6' : 'left-1'}`} />
                      </button>
                      <span className="text-dark-200 text-sm">Prix négociable</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div className="flex items-center gap-3 p-3 bg-dark-700 rounded-xl">
                    <button type="button" onClick={() => setForm(p => ({ ...p, isSeasonalPromo: !p.isSeasonalPromo }))}
                      className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ${form.isSeasonalPromo ? 'bg-gold-500' : 'bg-dark-600'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.isSeasonalPromo ? 'left-6' : 'left-1'}`} />
                    </button>
                    <span className="text-dark-200 text-sm">Offre saisonnière</span>
                  </div>
                  <div>
                    <label className="text-dark-300 text-xs mb-1 block">Début promo</label>
                    <input type="date" value={form.promoStartDate} onChange={e => setForm(p => ({ ...p, promoStartDate: e.target.value }))} className="input-field w-full py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-dark-300 text-xs mb-1 block">Fin promo</label>
                    <input type="date" value={form.promoEndDate} onChange={e => setForm(p => ({ ...p, promoEndDate: e.target.value }))} className="input-field w-full py-2.5 text-sm" />
                  </div>
                </div>
              </div>

              {/* Visibilité */}
              <div className="space-y-3">
                {[
                  { key: 'isPopular', label: 'Pack populaire (mis en avant)' },
                  { key: 'isCustomizable', label: 'Pack personnalisable par le client' },
                  { key: 'isCombo', label: 'Combinable avec d\'autres offres' },
                  { key: 'visibleOnStore', label: 'Visible sur la vitrine' },
                  { key: 'visibleForClients', label: 'Visible pour les clients connectés' },
                ].map(opt => (
                  <div key={opt.key} className="flex items-center gap-3 p-3 bg-dark-700 rounded-xl">
                    <button type="button" onClick={() => setForm(p => ({ ...p, [opt.key]: !(p as any)[opt.key] }))}
                      className={`relative w-11 h-6 rounded-full transition-all ${(form as any)[opt.key] ? 'bg-gold-500' : 'bg-dark-600'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${(form as any)[opt.key] ? 'left-6' : 'left-1'}`} />
                    </button>
                    <span className="text-dark-200 text-sm">{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-white/10">
              <button onClick={() => setEditing(false)} className="py-2 px-5 text-sm text-dark-300 hover:text-white">Annuler</button>
              <button onClick={savePack} disabled={saving || !form.name.trim()} className="btn-gold py-2 px-6 text-sm disabled:opacity-50">{saving ? '...' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Service Modal ── */}
      {showAddService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setShowAddService(false); setAddProviderStep(false); setSelectedServiceForProvider(null); }} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-md w-full z-10 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">{addProviderStep ? 'Choisir un prestataire' : 'Ajouter un service'}</h2>
              <button onClick={() => { setShowAddService(false); setAddProviderStep(false); setSelectedServiceForProvider(null); }} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {addProviderStep ? (
                /* Provider selection step */
                loadingProviders ? (
                  <div className="space-y-3">
                    {Array(3).fill(0).map((_, i) => <div key={i} className="h-16 bg-dark-700 rounded-xl animate-pulse" />)}
                  </div>
                ) : (
                  <div>
                    <p className="text-dark-400 text-xs mb-3">
                      Prestataires pour <span className="text-white font-medium">{selectedServiceForProvider?.name}</span>
                    </p>
                    <div className="space-y-2 mb-3">
                      {availableProviders.map(p => (
                        <button key={p.id} onClick={() => addServiceToPack(selectedServiceForProvider!.id, p.id)}
                          className="w-full flex items-center gap-3 p-3 glass rounded-xl hover:bg-gold-500/10 hover:border-gold-500/30 border border-transparent transition-all text-left">
                          <div className="w-8 h-8 rounded-lg bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                            <User size={14} className="text-gold-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-white text-sm font-medium truncate">{p.name}</span>
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.isAvailable ? 'bg-green-400' : 'bg-yellow-400'}`} />
                            </div>
                            {p.city && <span className="text-dark-500 text-xs">{p.city}</span>}
                          </div>
                          <span className="text-gold-400 text-xs font-medium">{formatPrice(p.price)}</span>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => addServiceToPack(selectedServiceForProvider!.id)}
                      className="w-full text-center text-dark-400 hover:text-white text-xs py-2 transition-colors border border-dashed border-dark-600 rounded-xl">
                      Sans prestataire
                    </button>
                  </div>
                )
              ) : (
                /* Service selection step */
                loadingServices ? (
                  <div className="space-y-3">
                    {Array(4).fill(0).map((_, i) => <div key={i} className="h-12 bg-dark-700 rounded-xl animate-pulse" />)}
                  </div>
                ) : availableServices.length === 0 ? (
                  <p className="text-dark-400 text-sm text-center py-8">Tous les services sont déjà dans ce pack.</p>
                ) : (
                  <div className="space-y-2">
                    {availableServices.map(s => (
                      <button key={s.id} onClick={() => handleSelectServiceForProvider(s)}
                        className="w-full flex items-center gap-3 p-3 glass rounded-xl hover:bg-gold-500/10 hover:border-gold-500/30 border border-transparent transition-all text-left">
                        <div className="w-8 h-8 rounded-lg bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                          {s.icon ? <span className="text-sm">{s.icon}</span> : <Package size={14} className="text-gold-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-white text-sm font-medium block truncate">{s.name}</span>
                          {s.type && <span className="text-dark-500 text-xs">{s.type.name}</span>}
                        </div>
                        <span className="text-gold-400 text-xs">{formatPrice(s.basePrice)}</span>
                        <Plus size={14} className="text-dark-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Configure Service Modal ── */}
      {configService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfigService(null)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-lg w-full z-10 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold text-white">Configurer : {configService.service.name}</h2>
                <p className="text-dark-400 text-xs mt-0.5">Configuration de ce service dans le pack</p>
              </div>
              <button onClick={() => setConfigService(null)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Resource selection */}
              {serviceResources.length > 0 && (
                <div>
                  <label className="text-dark-300 text-xs mb-1.5 block">Ressource</label>
                  <select value={configForm.resourceId} onChange={e => setConfigForm(p => ({ ...p, resourceId: e.target.value }))} className="input-field w-full py-2.5 text-sm">
                    <option value="">— Aucune —</option>
                    {serviceResources.map(r => (
                      <option key={r.id} value={r.id}>{r.name}{r.basePrice ? ` (${formatPrice(r.basePrice)})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Provider selection */}
              {serviceProviders.length > 0 && (
                <div>
                  <label className="text-dark-300 text-xs mb-1.5 block">Prestataire</label>
                  <select value={configForm.providerId} onChange={e => setConfigForm(p => ({ ...p, providerId: e.target.value }))} className="input-field w-full py-2.5 text-sm">
                    <option value="">— Aucun —</option>
                    {serviceProviders.filter(p => p.isAvailable).map(p => (
                      <option key={p.id} value={p.id}>{p.name}{p.city ? ` (${p.city})` : ''} — {formatPrice(p.price)}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Quantité</label>
                  <input type="number" min="1" value={configForm.quantity} onChange={e => setConfigForm(p => ({ ...p, quantity: e.target.value }))} className="input-field w-full py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Durée (h)</label>
                  <input type="number" min="0" value={configForm.duration} onChange={e => setConfigForm(p => ({ ...p, duration: e.target.value }))} className="input-field w-full py-2.5 text-sm" placeholder="—" />
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Ordre</label>
                  <input type="number" value={configForm.displayOrder} onChange={e => setConfigForm(p => ({ ...p, displayOrder: e.target.value }))} className="input-field w-full py-2.5 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Statut</label>
                  <select value={configForm.status} onChange={e => setConfigForm(p => ({ ...p, status: e.target.value }))} className="input-field w-full py-2.5 text-sm">
                    <option value="INCLUS">Inclus</option>
                    <option value="OPTIONNEL">Optionnel</option>
                    <option value="OBLIGATOIRE">Obligatoire</option>
                  </select>
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Prix override (DT)</label>
                  <input type="number" min="0" value={configForm.priceOverride} onChange={e => setConfigForm(p => ({ ...p, priceOverride: e.target.value }))} className="input-field w-full py-2.5 text-sm" placeholder="Prix du service" />
                </div>
              </div>

              {/* Dynamic parameters from the service */}
              {serviceParameters.length > 0 && (
                <div>
                  <label className="text-dark-300 text-xs mb-2 block font-medium">Paramètres du service</label>
                  <div className="bg-dark-700/50 rounded-xl p-4 space-y-3">
                    {serviceParameters.map((param: any) => (
                      <div key={param.id}>
                        <label className="text-dark-400 text-xs mb-1 block">
                          {param.name}
                          {param.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        {param.type === 'BOOLEAN' ? (
                          <span className="text-dark-300 text-xs">(oui/non — stocké dans config JSON)</span>
                        ) : param.type === 'SELECT' && Array.isArray(param.options) ? (
                          <span className="text-dark-500 text-xs">Options : {param.options.join(', ')}</span>
                        ) : param.type === 'RESOURCE_SELECT' ? (
                          <span className="text-dark-500 text-xs">(sélection ressource ci-dessus)</span>
                        ) : (
                          <span className="text-dark-500 text-xs">Type : {param.type}</span>
                        )}
                      </div>
                    ))}
                    <p className="text-dark-500 text-[11px] pt-1">Utilisez le champ JSON ci-dessous pour stocker les valeurs de ces paramètres.</p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-dark-300 text-xs mb-1 block">Configuration (JSON)</label>
                <textarea
                  value={configForm.config}
                  onChange={e => setConfigForm(p => ({ ...p, config: e.target.value }))}
                  rows={6}
                  className="input-field w-full py-2.5 text-sm font-mono resize-none"
                  placeholder={'{\n  "nombre_photographes": 2,\n  "album": true,\n  "pages_album": 50\n}'}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-white/10">
              <button onClick={() => setConfigService(null)} className="py-2 px-5 text-sm text-dark-300 hover:text-white">Annuler</button>
              <button onClick={saveConfig} disabled={saving} className="btn-gold py-2 px-6 text-sm disabled:opacity-50">{saving ? '...' : 'Sauvegarder'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
