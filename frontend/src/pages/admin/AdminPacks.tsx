import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Edit2, Trash2, X, Star, Crown, Zap, Package, Eye, EyeOff,
  Search, Settings, GripVertical, Check, ChevronDown, ChevronUp,
  Users, Clock, DollarSign, Image as ImageIcon, Calendar, Music,
  Camera, Home, Utensils, Palette, Sparkles, Save, AlertCircle,
  Calculator, TrendingDown, User, Upload, Loader2, Play, Film,
  ChevronLeft, ChevronRight, MapPin, Phone, Mail, Globe, Award, Tag,
  Layers, Grid3x3, List, PlusCircle, MinusCircle, RefreshCw, FileText,
  Video, ImagePlus, Images, Trash2 as TrashIcon
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { packsApi, servicesApi, providersApi, uploadApi, NeonPack, ServiceItem, Provider } from '@/lib/neonApi';
import { formatPrice } from '@/lib/format';
import PageHeader from '@/components/ui/PageHeader';

// ─── FONCTION getFullUrl (intégrée) ──────────────────────────────────────────
const getFullUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const baseUrl = BASE.replace(/\/api$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

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
  images: [] as string[],
  videoUrl: '',
  eventType: '', 
  status: 'PUBLIE',
  isCustomizable: false,
  visibleOnStore: true,
  visibleForClients: true,
  discountPercent: '0',
  priceAutoCalculated: true,
};

// ─── COMPOSANT UPLOAD IMAGE ──────────────────────────────────────────────────
interface UploadImageProps {
  value: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  label?: string;
  className?: string;
}

function UploadImageField({ value, onChange, folder = 'packs', label = 'Image principale', className = '' }: UploadImageProps) {
  const { success, error: toastError } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toastError('Erreur', 'L\'image ne doit pas dépasser 5 MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toastError('Erreur', 'Le fichier doit être une image');
      return;
    }
    setUploading(true);
    try {
      const result = await uploadApi.image(file, folder);
      onChange(result.url);
      success('Image uploadée', file.name);
    } catch (e: any) {
      toastError('Erreur', e.message || 'Upload échoué');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  return (
    <div className={className}>
      <label className="text-dark-300 text-sm mb-1.5 block">{label}</label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
        className="hidden"
      />
      {value ? (
        <div className="relative group rounded-xl overflow-hidden border border-white/10">
          <img src={getFullUrl(value) || ''} alt="Image" className="w-full h-48 object-cover" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 glass text-white text-sm rounded-lg hover:bg-white/10">
              Changer
            </button>
            <button onClick={() => onChange(null)} className="px-3 py-1.5 bg-red-500/20 text-red-400 text-sm rounded-lg hover:bg-red-500/30">
              Supprimer
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragOver ? 'border-gold-500 bg-gold-500/10' : 'border-white/10 hover:border-gold-500/30 hover:bg-white/5'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={32} className="text-gold-400 animate-spin" />
              <p className="text-dark-400 text-sm">Upload en cours...</p>
            </div>
          ) : (
            <>
              <Upload size={32} className="mx-auto mb-2 text-dark-400" />
              <p className="text-dark-300 text-sm">Glissez-déposez une image</p>
              <p className="text-dark-500 text-xs mt-1">PNG, JPG, WEBP · Max 5 MB</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── COMPOSANT GALERIE ──────────────────────────────────────────────────────
interface GalleryProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder?: string;
}

function GalleryUpload({ images, onChange, folder = 'packs' }: GalleryProps) {
  const { success, error: toastError } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toastError('Erreur', 'L\'image ne doit pas dépasser 5 MB');
      return;
    }
    setUploading(true);
    try {
      const result = await uploadApi.image(file, folder);
      onChange([...images, result.url]);
      success('Image ajoutée');
    } catch (e: any) {
      toastError('Erreur', e.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const moveImage = (from: number, to: number) => {
    const newImages = [...images];
    const [removed] = newImages.splice(from, 1);
    newImages.splice(to, 0, removed);
    onChange(newImages);
  };

  return (
    <div>
      <label className="text-dark-300 text-sm mb-1.5 block flex items-center gap-2">
        <Images size={16} className="text-gold-400" />
        Galerie photos ({images.length})
      </label>
      <div className="grid grid-cols-4 gap-2">
        {images.map((img, index) => (
          <div key={index} className="relative group rounded-lg overflow-hidden border border-white/10 aspect-square">
            <img src={getFullUrl(img) || ''} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              {index > 0 && (
                <button onClick={() => moveImage(index, index - 1)} className="p-1 rounded bg-dark-800/80 text-white hover:bg-gold-500">
                  <ChevronLeft size={12} />
                </button>
              )}
              <button onClick={() => removeImage(index)} className="p-1 rounded bg-red-500/80 text-white hover:bg-red-600">
                <TrashIcon size={12} />
              </button>
              {index < images.length - 1 && (
                <button onClick={() => moveImage(index, index + 1)} className="p-1 rounded bg-dark-800/80 text-white hover:bg-gold-500">
                  <ChevronRight size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
        {images.length < 8 && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/10 rounded-lg aspect-square flex items-center justify-center cursor-pointer hover:border-gold-500/30 hover:bg-white/5 transition-all"
          >
            {uploading ? (
              <Loader2 size={24} className="text-gold-400 animate-spin" />
            ) : (
              <div className="text-center">
                <PlusCircle size={24} className="mx-auto text-dark-400" />
                <span className="text-dark-500 text-xs">Ajouter</span>
              </div>
            )}
          </div>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => {
        const files = e.target.files;
        if (files) Array.from(files).forEach(f => handleFile(f));
        e.target.value = '';
      }} className="hidden" />
      <p className="text-dark-500 text-[10px] mt-1">Glissez pour réorganiser · Max 8 photos</p>
    </div>
  );
}

// ─── COMPOSANT VIDÉO ──────────────────────────────────────────────────────────
interface VideoInputProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

function VideoInput({ value, onChange, label = 'Vidéo de présentation' }: VideoInputProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [videoId, setVideoId] = useState('');

  const extractVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const getEmbedUrl = (url: string) => {
    const id = extractVideoId(url);
    if (!id) return null;
    if (url.includes('vimeo')) return `https://player.vimeo.com/video/${id}`;
    return `https://www.youtube.com/embed/${id}`;
  };

  useEffect(() => {
    const id = extractVideoId(value);
    setVideoId(id || '');
  }, [value]);

  return (
    <div>
      <label className="text-dark-300 text-sm mb-1.5 block flex items-center gap-2">
        <Video size={16} className="text-gold-400" />
        {label}
      </label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://youtube.com/watch?v=xxxx ou https://vimeo.com/xxxx"
          className="input-field flex-1 py-2.5 text-sm"
        />
        {value && (
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="glass px-3 py-2 rounded-xl text-dark-300 hover:text-white transition-all"
          >
            {showPreview ? <X size={16} /> : <Play size={16} />}
          </button>
        )}
      </div>
      {showPreview && getEmbedUrl(value) && (
        <div className="mt-3 rounded-xl overflow-hidden border border-white/10 aspect-video">
          <iframe
            src={getEmbedUrl(value)!}
            className="w-full h-full"
            allowFullScreen
            title="Vidéo de présentation"
          />
        </div>
      )}
      {videoId && !showPreview && (
        <p className="text-dark-500 text-xs mt-1">✅ Vidéo chargée · ID: {videoId}</p>
      )}
    </div>
  );
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────
export default function AdminPacks() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  
  // ─── État principal ──────────────────────────────────────────────
  const [packs, setPacks] = useState<NeonPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // ─── Modal Création/Modification ──────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<NeonPack | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'media' | 'services' | 'pricing'>('general');

  // ─── Services du pack ───────────────────────────────────────────
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [packServicesConfig, setPackServicesConfig] = useState<Record<string, any>>({});

  // ─── Modal Ajout de service ──────────────────────────────────
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [allServices, setAllServices] = useState<ServiceItem[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');

  // ─── Sélection du prestataire ─────────────────────────────────
  const [providerStep, setProviderStep] = useState(false);
  const [serviceForProvider, setServiceForProvider] = useState<ServiceItem | null>(null);
  const [serviceProviders, setServiceProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  // ─── Modal Configuration ──────────────────────────────────────
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configService, setConfigService] = useState<any>(null);
  const [configForm, setConfigForm] = useState({
    quantity: '1',
    duration: '',
    status: 'INCLUS',
    priceOverride: '',
    config: '{}',
  });

  // ─── Chargement ────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const data = await packsApi.adminList();
      setPacks(data);
    } catch { setPacks([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ─── Calcul du prix ────────────────────────────────────────────
  const calculateTotalServicesPrice = () => {
    let total = 0;
    for (const item of selectedServices) {
      const config = packServicesConfig[item.id || item.serviceId] || {};
      const price = config.priceOverride ? Number(config.priceOverride) :
                    (item.provider?.price || item.basePrice || 0);
      const quantity = Number(config.quantity) || 1;
      total += price * quantity;
    }
    return total;
  };

  const totalServicesPrice = calculateTotalServicesPrice();
  const discount = Number(form.discountPercent) || 0;
  const packPrice = discount > 0 ? totalServicesPrice - (totalServicesPrice * discount / 100) : totalServicesPrice;

  // Mise à jour automatique du prix
  useEffect(() => {
    if (form.priceAutoCalculated) {
      setForm(prev => ({
        ...prev,
        price: String(Math.round(packPrice))
      }));
    }
  }, [selectedServices, packServicesConfig, form.discountPercent]);

  // ─── CRUD Pack ──────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, priceAutoCalculated: true });
    setSelectedServices([]);
    setPackServicesConfig({});
    setFormError('');
    setActiveTab('general');
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
      images: p.images || [],
      videoUrl: p.videoUrl || '',
      eventType: p.eventType || '',
      status: p.status || 'PUBLIE',
      isCustomizable: p.isCustomizable || false,
      visibleOnStore: p.visibleOnStore !== undefined ? p.visibleOnStore : true,
      visibleForClients: p.visibleForClients !== undefined ? p.visibleForClients : true,
      discountPercent: '0',
      priceAutoCalculated: true,
    });
    setSelectedServices(p.packServices || []);
    setFormError('');
    setActiveTab('general');
    setShowModal(true);
  };

  const handleSavePack = async () => {
    if (!form.name.trim()) { setFormError('Le nom est requis.'); return; }

    let finalPrice = Number(form.price);
    if (form.priceAutoCalculated) {
      finalPrice = Math.round(packPrice);
    } else if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) {
      setFormError('Prix invalide.');
      return;
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
        images: form.images.length > 0 ? form.images : null,
        videoUrl: form.videoUrl.trim() || null,
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
    } finally {
      setSaving(false);
    }
  };

  const updatePackServices = async (packId: string) => {
    for (const ps of selectedServices) {
      if (ps.id) {
        try { await packsApi.removeService(packId, ps.serviceId); } catch {}
      }
    }
    for (const item of selectedServices) {
      const config = packServicesConfig[item.id] || {};
      try {
        await packsApi.addService(packId, {
          serviceId: item.serviceId || item.id,
          providerId: item.providerId || null,
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

  // ─── Gestion des services ──────────────────────────────────────
  const openServiceModal = async () => {
    setShowServiceModal(true);
    setProviderStep(false);
    setServiceForProvider(null);
    setLoadingServices(true);
    try {
      const res = await servicesApi.list({ limit: 200 });
      const existingIds = selectedServices.map(s => s.serviceId || s.id);
      setAllServices(res.data.filter(s => s.active && !existingIds.includes(s.id)));
    } catch { setAllServices([]); }
    finally { setLoadingServices(false); }
  };

  const handleSelectServiceForProvider = async (service: ServiceItem) => {
    setServiceForProvider(service);
    setProviderStep(true);
    setLoadingProviders(true);
    try {
      const providers = await providersApi.list({ serviceId: service.id, active: 'true' });
      setServiceProviders(providers);
    } catch { setServiceProviders([]); }
    finally { setLoadingProviders(false); }
  };

  const addServiceWithProvider = (service: ServiceItem, provider: Provider | null) => {
    const item = {
      ...service,
      id: service.id,
      serviceId: service.id,
      providerId: provider?.id || null,
      provider: provider || null
    };
    setSelectedServices([...selectedServices, item]);
    setPackServicesConfig({
      ...packServicesConfig,
      [service.id]: {
        quantity: '1',
        duration: '',
        status: 'INCLUS',
        priceOverride: provider ? String(provider.price) : '',
        config: '{}',
      }
    });
    setAllServices(prev => prev.filter(s => s.id !== service.id));
    setShowServiceModal(false);
    setProviderStep(false);
    setServiceForProvider(null);
    setServiceProviders([]);
    success('Service ajouté', service.name + (provider ? ` → ${provider.name}` : ''));
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

  // ─── Configuration d'un service ──────────────────────────────
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
    try { JSON.parse(configForm.config); } catch {
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

  // ─── Filtres ────────────────────────────────────────────────────
  const eventTypes = [...new Set(packs.map(p => p.eventType).filter(Boolean))] as string[];

  const filtered = packs.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterEvent && p.eventType !== filterEvent) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ─── RENDU ──────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6">
      <PageHeader 
        title="Gestion des Packs" 
        subtitle={`${packs.length} offres`}
        action={
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-dark-700 rounded-xl p-1">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-gold-500 text-dark-900' : 'text-dark-400 hover:text-white'}`}>
                <Grid3x3 size={16} />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-gold-500 text-dark-900' : 'text-dark-400 hover:text-white'}`}>
                <List size={16} />
              </button>
            </div>
            <button onClick={openCreate} className="btn-gold py-2 px-4 text-sm flex items-center gap-2">
              <Plus size={15} />Nouveau pack
            </button>
          </div>
        } 
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Rechercher un pack..." 
            className="input-field w-full py-2 pl-9 pr-3 text-sm" 
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

      {/* ─── Liste des packs ─── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
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
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => {
            const st = statusLabels[p.status] || statusLabels.BROUILLON;
            return (
              <div
                key={p.id}
                onClick={() => navigate(`/admin/packs/${p.id}`)}
                className={`relative glass rounded-2xl overflow-hidden border transition-all hover:-translate-y-1 cursor-pointer ${
                  p.isPopular ? 'border-gold-500 ring-1 ring-gold-500' : 'border-dark-600 hover:border-dark-500'
                } ${!p.isActive ? 'opacity-50' : ''}`}
              >
                {/* Image */}
                <div className="relative h-40 -mx-0">
                  {p.imageUrl ? (
                    <img src={getFullUrl(p.imageUrl) || ''} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gold-500/20 to-dark-700 flex items-center justify-center">
                      <Package size={40} className="text-gold-500/30" />
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    {p.isPopular && (
                      <span className="badge bg-gold-500/90 text-dark-900 border border-gold-500 text-[10px] flex items-center gap-1">
                        <Star size={10} fill="currentColor" /> Populaire
                      </span>
                    )}
                    {p.badge && (
                      <span className="badge bg-gold-500/20 text-gold-400 border border-gold-500/30 text-[10px]">
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`} title={st.label} />
                  </div>
                  {!p.isActive && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-red-500/80 text-white text-xs font-bold px-3 py-1 rounded-full">INACTIF</span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className={`text-lg font-bold truncate ${p.isPopular ? 'text-gold-500' : 'text-white'}`}>
                    {p.name}
                  </h3>
                  {p.eventType && (
                    <p className="text-gold-500/70 text-xs flex items-center gap-1 mt-0.5">
                      <Tag size={10} /> {p.eventType}
                    </p>
                  )}
                  
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-bold text-white">{p.price.toLocaleString('fr-FR')}</span>
                    <span className="text-dark-400 text-sm">DT</span>
                    {p.originalPrice && p.originalPrice > p.price && (
                      <span className="text-dark-500 text-xs line-through ml-2">
                        {p.originalPrice.toLocaleString('fr-FR')} DT
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <span className={`badge text-[10px] ${st.color}`}>{st.label}</span>
                    <span className="text-dark-500 text-[10px] flex items-center gap-1">
                      <Package size={10} /> {p._count?.packServices || 0} services
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-dark-300 mt-3">
                    <div className="bg-dark-700 rounded-lg p-2 text-center">
                      <div className="text-white font-medium">{p.duration}h</div>
                      <div>Durée</div>
                    </div>
                    <div className="bg-dark-700 rounded-lg p-2 text-center">
                      <div className="text-white font-medium">{p.maxGuests}+</div>
                      <div>Invités</div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
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
                  <th className="text-left px-4 py-3 text-dark-400 text-xs font-medium uppercase">Pack</th>
                  <th className="text-left px-4 py-3 text-dark-400 text-xs font-medium uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-dark-400 text-xs font-medium uppercase">Prix</th>
                  <th className="text-left px-4 py-3 text-dark-400 text-xs font-medium uppercase">Services</th>
                  <th className="text-left px-4 py-3 text-dark-400 text-xs font-medium uppercase">Statut</th>
                  <th className="text-right px-4 py-3 text-dark-400 text-xs font-medium uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const st = statusLabels[p.status] || statusLabels.BROUILLON;
                  return (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer" onClick={() => navigate(`/admin/packs/${p.id}`)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {p.imageUrl ? (
                              <img src={getFullUrl(p.imageUrl) || ''} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package size={16} className="text-dark-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{p.name}</p>
                            {p.eventType && <p className="text-dark-400 text-xs">{p.eventType}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.isPopular && <span className="badge bg-gold-500/20 text-gold-400 text-[10px]">⭐ Populaire</span>}
                        {p.badge && <span className="badge bg-dark-700 text-dark-300 text-[10px] ml-1">{p.badge}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white font-medium">{p.price.toLocaleString('fr-FR')} DT</span>
                        {p.originalPrice && p.originalPrice > p.price && (
                          <span className="text-dark-500 text-xs line-through block">{p.originalPrice.toLocaleString('fr-FR')} DT</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-dark-300 text-sm">{p._count?.packServices || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`badge text-[10px] ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={(e) => openEdit(e, p)} className="p-1.5 rounded-lg text-dark-400 hover:text-gold-400 hover:bg-gold-500/10 transition-all">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={(e) => toggleActive(e, p)} className="p-1.5 rounded-lg text-dark-400 hover:text-green-400 hover:bg-green-500/10 transition-all">
                            {p.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                          </button>
                          <button onClick={(e) => handleDelete(e, p.id, p.name)} className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL : Création/Modification du pack ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-3xl w-full z-10 max-h-[95vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 bg-dark-800 z-10 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">
                {editing ? 'Modifier le pack' : 'Nouveau pack'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-dark-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-5 pt-3 border-b border-white/10">
              {[
                { key: 'general', label: '📝 Général', icon: FileText },
                { key: 'media', label: '🖼️ Médias', icon: ImageIcon },
                { key: 'services', label: `📦 Services (${selectedServices.length})`, icon: Package },
                { key: 'pricing', label: '💰 Tarification', icon: Calculator },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all rounded-t-lg ${
                    activeTab === tab.key ? 'bg-dark-700 text-gold-400 border-b-2 border-gold-500' : 'text-dark-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Contenu */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                  <AlertCircle size={16} /> {formError}
                </div>
              )}

              {/* Tab: Général */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-dark-300 text-sm mb-1.5 block">Nom du pack *</label>
                    <input
                      value={form.name}
                      onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setFormError(''); }}
                      className="input-field w-full"
                      placeholder="Ex: Pack Mariage Gold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-dark-300 text-sm mb-1.5 block">Type d'événement</label>
                      <input
                        value={form.eventType}
                        onChange={e => setForm(p => ({ ...p, eventType: e.target.value }))}
                        className="input-field w-full"
                        placeholder="Mariage, Anniversaire..."
                      />
                    </div>
                    <div>
                      <label className="text-dark-300 text-sm mb-1.5 block">Badge</label>
                      <input
                        value={form.badge}
                        onChange={e => setForm(p => ({ ...p, badge: e.target.value }))}
                        className="input-field w-full"
                        placeholder="⭐ Le plus populaire"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-dark-300 text-sm mb-1.5 block">Description</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      rows={4}
                      className="input-field w-full resize-none"
                      placeholder="Décrivez votre pack en détail..."
                    />
                  </div>
                  <div className="flex flex-wrap gap-4 pt-2">
                    <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isPopular}
                        onChange={e => setForm(p => ({ ...p, isPopular: e.target.checked }))}
                        className="accent-gold-500 w-4 h-4"
                      />
                      Pack populaire (mis en avant)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isCustomizable}
                        onChange={e => setForm(p => ({ ...p, isCustomizable: e.target.checked }))}
                        className="accent-gold-500 w-4 h-4"
                      />
                      Personnalisable par le client
                    </label>
                  </div>
                  <div>
                    <label className="text-dark-300 text-sm mb-1.5 block">Statut</label>
                    <select
                      value={form.status}
                      onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                      className="input-field w-full"
                    >
                      <option value="BROUILLON">Brouillon</option>
                      <option value="EN_ATTENTE">En attente</option>
                      <option value="PUBLIE">Publié</option>
                      <option value="ARCHIVE">Archivé</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Tab: Médias */}
              {activeTab === 'media' && (
                <div className="space-y-5">
                  <UploadImageField
                    value={form.imageUrl}
                    onChange={(url) => setForm(p => ({ ...p, imageUrl: url || '' }))}
                    folder="packs"
                    label="Image principale"
                  />
                  <VideoInput
                    value={form.videoUrl}
                    onChange={(url) => setForm(p => ({ ...p, videoUrl: url }))}
                    label="Vidéo de présentation"
                  />
                  <GalleryUpload
                    images={form.images}
                    onChange={(images) => setForm(p => ({ ...p, images }))}
                    folder="packs"
                  />
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.visibleOnStore}
                        onChange={e => setForm(p => ({ ...p, visibleOnStore: e.target.checked }))}
                        className="accent-gold-500 w-4 h-4"
                      />
                      Visible sur la vitrine
                    </label>
                    <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.visibleForClients}
                        onChange={e => setForm(p => ({ ...p, visibleForClients: e.target.checked }))}
                        className="accent-gold-500 w-4 h-4"
                      />
                      Visible pour les clients
                    </label>
                  </div>
                </div>
              )}

              {/* Tab: Services */}
              {activeTab === 'services' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-dark-400 text-sm">{selectedServices.length} services dans ce pack</p>
                    <button
                      type="button"
                      onClick={openServiceModal}
                      className="btn-gold py-1.5 px-3 text-xs flex items-center gap-1"
                    >
                      <Plus size={12} /> Ajouter un service
                    </button>
                  </div>

                  {selectedServices.length === 0 ? (
                    <div className="glass rounded-xl p-8 text-center border border-dashed border-dark-600">
                      <Package size={32} className="mx-auto mb-3 text-dark-500" />
                      <p className="text-dark-400 text-sm">Aucun service dans ce pack</p>
                      <p className="text-dark-500 text-xs mt-1">Cliquez sur "Ajouter un service" pour commencer</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedServices.map((s) => {
                        const config = packServicesConfig[s.id || s.serviceId] || {};
                        const price = config.priceOverride ? Number(config.priceOverride) : (s.provider?.price || s.basePrice || 0);
                        const quantity = Number(config.quantity) || 1;
                        return (
                          <div key={s.id || s.serviceId} className="glass rounded-xl px-4 py-3 border border-white/5 hover:border-gold-500/20 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                                {s.icon ? <span className="text-lg">{s.icon}</span> : <Package size={16} className="text-gold-500" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-white font-medium text-sm">{s.name}</span>
                                  {s.provider && (
                                    <span className="badge bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] flex items-center gap-1">
                                      <User size={10} /> {s.provider.name}
                                      <span className="text-gold-400 ml-1">{formatPrice(s.provider.price)}</span>
                                    </span>
                                  )}
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
                                  <p className="text-dark-500 text-xs truncate mt-0.5">{s.shortDescription}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openConfig(s)}
                                  className="p-1.5 rounded-lg text-dark-400 hover:text-gold-400 hover:bg-gold-500/10 transition-all"
                                  title="Configurer"
                                >
                                  <Settings size={14} />
                                </button>
                                <button
                                  onClick={() => removeServiceFromPack(s.id || s.serviceId, s.name)}
                                  className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                  title="Retirer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Tarification */}
              {activeTab === 'pricing' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.priceAutoCalculated}
                        onChange={e => setForm(p => ({ ...p, priceAutoCalculated: e.target.checked }))}
                        className="accent-gold-500 w-4 h-4"
                      />
                      Calcul automatique du prix
                    </label>
                    <span className="text-dark-500 text-xs">Le prix est calculé à partir des services</span>
                  </div>

                  {selectedServices.length > 0 && (
                    <div className="glass rounded-xl p-4 bg-dark-700/50 border border-gold-500/20">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-dark-300">💰 Total des services</span>
                          <span className="text-white font-medium">{formatPrice(totalServicesPrice)}</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex items-center justify-between text-sm text-green-400">
                            <span>📉 Remise ({discount}%)</span>
                            <span>-{formatPrice(totalServicesPrice * discount / 100)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-lg font-bold pt-2 border-t border-gold-500/20">
                          <span className="text-gold-400">🎯 Prix final</span>
                          <span className="text-gold-400">{formatPrice(packPrice)}</span>
                        </div>
                        {totalServicesPrice > 0 && packPrice < totalServicesPrice && (
                          <div className="flex items-center gap-2 text-xs text-green-400 justify-center pt-1">
                            <TrendingDown size={14} />
                            Économie : {formatPrice(totalServicesPrice - packPrice)} ({Math.round((1 - packPrice/totalServicesPrice) * 100)}%)
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-dark-300 text-sm mb-1.5 block">
                        Prix (DT) {form.priceAutoCalculated ? '(Auto)' : '*'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.price}
                        onChange={e => {
                          setForm(p => ({ ...p, price: e.target.value, priceAutoCalculated: false }));
                          setFormError('');
                        }}
                        className={`input-field w-full ${form.priceAutoCalculated ? 'bg-dark-700/50 text-gold-400' : ''}`}
                        disabled={form.priceAutoCalculated}
                        readOnly={form.priceAutoCalculated}
                      />
                    </div>
                    <div>
                      <label className="text-dark-300 text-sm mb-1.5 block">Remise (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={form.discountPercent}
                        onChange={e => setForm(p => ({ ...p, discountPercent: e.target.value }))}
                        className="input-field w-full"
                      />
                    </div>
                    <div>
                      <label className="text-dark-300 text-sm mb-1.5 block">Prix original (DT)</label>
                      <input
                        type="number"
                        min="0"
                        value={form.originalPrice}
                        onChange={e => setForm(p => ({ ...p, originalPrice: e.target.value }))}
                        className="input-field w-full"
                        placeholder="Prix barré"
                      />
                    </div>
                    <div>
                      <label className="text-dark-300 text-sm mb-1.5 block">Durée (heures)</label>
                      <input
                        type="number"
                        min="1"
                        value={form.duration}
                        onChange={e => setForm(p => ({ ...p, duration: e.target.value }))}
                        className="input-field w-full"
                      />
                    </div>
                    <div>
                      <label className="text-dark-300 text-sm mb-1.5 block">Min invités</label>
                      <input
                        type="number"
                        min="0"
                        value={form.minGuests}
                        onChange={e => setForm(p => ({ ...p, minGuests: e.target.value }))}
                        className="input-field w-full"
                      />
                    </div>
                    <div>
                      <label className="text-dark-300 text-sm mb-1.5 block">Max invités</label>
                      <input
                        type="number"
                        min="1"
                        value={form.maxGuests}
                        onChange={e => setForm(p => ({ ...p, maxGuests: e.target.value }))}
                        className="input-field w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-5 border-t border-white/10 sticky bottom-0 bg-dark-800 rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="btn-ghost py-2.5 px-5 text-sm">
                Annuler
              </button>
              <button
                onClick={handleSavePack}
                disabled={saving}
                className="btn-gold py-2.5 px-6 text-sm disabled:opacity-60 flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
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

      {/* ─── MODAL : Ajout de service ─── */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setShowServiceModal(false); setProviderStep(false); }} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-md w-full z-10 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">
                {providerStep ? `Choisir un prestataire` : 'Ajouter un service'}
              </h2>
              <button onClick={() => { setShowServiceModal(false); setProviderStep(false); }} className="text-dark-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {providerStep ? (
                loadingProviders ? (
                  <div className="space-y-3">
                    {Array(3).fill(0).map((_, i) => <div key={i} className="h-16 bg-dark-700 rounded-xl animate-pulse" />)}
                  </div>
                ) : serviceProviders.length === 0 ? (
                  <div className="text-center py-8">
                    <Users size={32} className="mx-auto mb-2 text-dark-600" />
                    <p className="text-dark-400 text-sm">Aucun prestataire disponible</p>
                    <p className="text-dark-500 text-xs mt-1">Ajoutez d'abord des prestataires pour ce service</p>
                    <button onClick={() => { setShowServiceModal(false); navigate('/admin/providers'); }} className="mt-3 btn-gold py-1.5 px-4 text-xs">
                      Gérer les prestataires
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-2">
                      Choisissez un prestataire pour <span className="text-white font-medium">{serviceForProvider?.name}</span>
                    </p>
                    {serviceProviders.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addServiceWithProvider(serviceForProvider!, p)}
                        className="w-full flex items-center gap-3 p-3 glass rounded-xl hover:bg-gold-500/10 hover:border-gold-500/30 border border-transparent transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {p.image ? <img src={getFullUrl(p.image) || ''} alt={p.name} className="w-full h-full object-cover" /> : <User size={16} className="text-dark-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-medium truncate">{p.name}</span>
                            <span className={`w-2 h-2 rounded-full ${p.isAvailable ? 'bg-green-400' : 'bg-yellow-400'}`} />
                          </div>
                          {p.city && <span className="text-dark-500 text-xs flex items-center gap-1"><MapPin size={10} /> {p.city}</span>}
                          {p.composition && p.composition.length > 0 && (
                            <span className="text-dark-500 text-[10px]">{p.composition.map(c => `${c.role} ×${c.quantity}`).join(', ')}</span>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-gold-400 text-sm font-bold">{formatPrice(p.price)}</span>
                        </div>
                        <Plus size={14} className="text-gold-400 flex-shrink-0" />
                      </button>
                    ))}
                    <button onClick={() => addServiceWithProvider(serviceForProvider!, null)} className="w-full text-center text-dark-400 hover:text-white text-xs py-2 transition-colors border border-dashed border-dark-600 rounded-xl">
                      Sans prestataire
                    </button>
                  </div>
                )
              ) : (
                <>
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
                      {Array(4).fill(0).map((_, i) => <div key={i} className="h-12 bg-dark-700 rounded-xl animate-pulse" />)}
                    </div>
                  ) : allServices.length === 0 ? (
                    <div className="text-center py-8">
                      <Package size={32} className="mx-auto mb-2 text-dark-600" />
                      <p className="text-dark-400 text-sm">Aucun service disponible</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allServices.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase())).map(s => (
                        <button key={s.id} onClick={() => handleSelectServiceForProvider(s)} className="w-full flex items-center gap-3 p-3 glass rounded-xl hover:bg-gold-500/10 hover:border-gold-500/30 border border-transparent transition-all text-left">
                          <div className="w-8 h-8 rounded-lg bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                            {s.icon ? <span className="text-sm">{s.icon}</span> : <Package size={14} className="text-gold-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-white text-sm font-medium truncate">{s.name}</span>
                            {s.shortDescription && <span className="text-dark-500 text-xs truncate">{s.shortDescription}</span>}
                          </div>
                          <span className="text-gold-400 text-xs">{formatPrice(s.basePrice)}</span>
                          <ChevronRight size={14} className="text-dark-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL : Configuration du service ─── */}
      {showConfigModal && configService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowConfigModal(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-md w-full z-10">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold text-white">Configurer : {configService.name}</h2>
                {configService.provider && <p className="text-dark-400 text-xs mt-0.5">Prestataire : {configService.provider.name} · {formatPrice(configService.provider.price)}</p>}
              </div>
              <button onClick={() => setShowConfigModal(false)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Quantité</label>
                  <input type="number" min="1" value={configForm.quantity} onChange={e => setConfigForm(p => ({ ...p, quantity: e.target.value }))} className="input-field w-full py-2 text-sm" />
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Durée (h)</label>
                  <input type="number" min="0" value={configForm.duration} onChange={e => setConfigForm(p => ({ ...p, duration: e.target.value }))} className="input-field w-full py-2 text-sm" placeholder="—" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Statut</label>
                  <select value={configForm.status} onChange={e => setConfigForm(p => ({ ...p, status: e.target.value }))} className="input-field w-full py-2 text-sm">
                    {serviceStatusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Prix override (DT)</label>
                  <input type="number" min="0" value={configForm.priceOverride} onChange={e => setConfigForm(p => ({ ...p, priceOverride: e.target.value }))} className="input-field w-full py-2 text-sm" placeholder="Prix spécifique" />
                  <p className="text-dark-500 text-[10px] mt-1">💡 Laissez vide pour utiliser le prix du prestataire</p>
                </div>
              </div>
              <div>
                <label className="text-dark-300 text-xs mb-1 block">Configuration (JSON)</label>
                <textarea value={configForm.config} onChange={e => setConfigForm(p => ({ ...p, config: e.target.value }))} rows={4} className="input-field w-full py-2 text-sm font-mono resize-none" placeholder={'{\n  "param1": "valeur",\n  "param2": true\n}'} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-white/10">
              <button onClick={() => setShowConfigModal(false)} className="py-2 px-5 text-sm text-dark-300 hover:text-white">Annuler</button>
              <button onClick={saveConfig} className="btn-gold py-2 px-6 text-sm flex items-center gap-2"><Save size={14} /> Sauvegarder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}