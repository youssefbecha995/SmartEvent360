import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Star, Heart, Calendar, Users, MapPin, Clock, X, Check, Filter, ChevronDown
} from 'lucide-react';
import { servicesApi, ServiceType, ServiceItem, FavoriteService } from '@/lib/neonApi';
import { useToast } from '@/components/ui/Toast';
import { formatPrice } from '@/lib/format';

const categoryImages: Record<string, string> = {
  default: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=600',
  photo: 'https://images.pexels.com/photos/1045541/pexels-photo-1045541.jpeg?auto=compress&cs=tinysrgb&w=600',
  video: 'https://images.pexels.com/photos/3680219/pexels-photo-3680219.jpeg?auto=compress&cs=tinysrgb&w=600',
  dj: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600',
  decoration: 'https://images.pexels.com/photos/1045541/pexels-photo-1045541.jpeg?auto=compress&cs=tinysrgb&w=600',
  animation: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600',
};

function getImage(svc: ServiceItem): string {
  if (svc.image) return svc.image;
  if (svc.type?.slug) {
    const key = Object.keys(categoryImages).find(k => svc.type!.slug.toLowerCase().includes(k));
    if (key) return categoryImages[key];
  }
  return categoryImages.default;
}

export default function ClientServices() {
  const { toast } = useToast();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<ServiceType[]>([]);
  const [favorites, setFavorites] = useState<FavoriteService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);

  // Quote form state
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    date: '', time: '', location: '', guests: '', duration: '', message: '', resourceId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const [svcs, cats, favs] = await Promise.all([
        servicesApi.clientList(),
        servicesApi.publicCategories(),
        servicesApi.favorites().catch(() => []),
      ]);
      setServices(svcs || []);
      setCategories(cats || []);
      setFavorites(favs || []);
    } catch (e) {
      console.warn('[ClientServices] load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleFavorite = async (serviceId: string) => {
    try {
      const isFav = favorites.some(f => f.serviceId === serviceId);
      if (isFav) {
        await servicesApi.removeFavorite(serviceId);
        setFavorites(prev => prev.filter(f => f.serviceId !== serviceId));
        toast({ type: 'info', message: 'Retiré des favoris' });
      } else {
        await servicesApi.addFavorite(serviceId);
        await load();
        toast({ type: 'success', message: 'Ajouté aux favoris' });
      }
    } catch (e: any) {
      toast({ type: 'error', message: e.message || 'Erreur' });
    }
  };

  const openQuote = (svc: ServiceItem) => {
    setSelectedService(svc);
    setQuoteForm({ date: '', time: '', location: '', guests: '', duration: '', message: '', resourceId: '' });
    setShowQuoteModal(true);
  };

  const submitQuote = async () => {
    if (!selectedService || !quoteForm.date) {
      toast({ type: 'error', message: 'La date est requise' });
      return;
    }
    setSubmitting(true);
    try {
      await servicesApi.clientQuoteRequest(selectedService.id, quoteForm);
      toast({ type: 'success', message: 'Demande de devis envoyée !' });
      setShowQuoteModal(false);
    } catch (e: any) {
      toast({ type: 'error', message: e.message || 'Erreur lors de l\'envoi' });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = services.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCat || s.typeId === selectedCat;
    return matchSearch && matchCat;
  });

  const isFav = (serviceId: string) => favorites.some(f => f.serviceId === serviceId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-white">Services</h1>
        <p className="text-dark-400 text-sm mt-1">Découvrez nos prestations et demandez un devis personnalisé</p>
      </div>

      {/* Search & filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2.5 text-sm w-full" placeholder="Rechercher un service..." />
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setSelectedCat('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!selectedCat ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white border border-white/5'}`}>
          Tous
        </button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setSelectedCat(selectedCat === cat.id ? '' : cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCat === cat.id ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white border border-white/5'}`}>
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Heart size={18} className="text-red-400" /> Mes favoris
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {favorites.map(f => (
              <Link key={f.id} to={`/client/services/${f.serviceId}`}
                className="flex-shrink-0 glass rounded-xl px-4 py-3 flex items-center gap-3 hover:border-gold-500/30 transition-all min-w-[200px]">
                <img src={getImage(f.service)} alt={f.service.name} className="w-10 h-10 rounded-lg object-cover" />
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{f.service.name}</p>
                  <p className="text-gold-400 text-xs">{formatPrice(f.service.basePrice)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array(6).fill(0).map((_, i) => <div key={i} className="glass rounded-2xl h-64 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl">
          <Search size={36} className="mx-auto mb-3 text-dark-600" />
          <p className="text-dark-400 mb-3">Aucun service trouvé</p>
          <button onClick={() => { setSearch(''); setSelectedCat(''); }} className="btn-outline-gold py-2 px-5 text-sm">Réinitialiser</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(svc => (
            <div key={svc.id} className="glass rounded-2xl overflow-hidden group hover:border-gold-500/30 hover:-translate-y-1 transition-all duration-300">
              <div className="relative overflow-hidden" style={{ aspectRatio: '16/10' }}>
                <img src={getImage(svc)} alt={svc.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                {svc.type && (
                  <span className="absolute top-3 left-3 badge bg-dark-900/80 text-gold-400 border border-gold-500/30 text-xs backdrop-blur-sm">
                    {svc.type.icon} {svc.type.name}
                  </span>
                )}
                <button onClick={(e) => { e.stopPropagation(); toggleFavorite(svc.id); }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-dark-900/60 backdrop-blur-sm flex items-center justify-center hover:bg-dark-900/80 transition-all">
                  <Heart size={14} className={isFav(svc.id) ? 'text-red-400 fill-red-400' : 'text-white'} />
                </button>
              </div>
              <div className="p-5">
                <h3 className="text-white font-semibold mb-1 group-hover:text-gold-400 transition-colors">{svc.name}</h3>
                <p className="text-dark-300 text-xs line-clamp-2 mb-3">{svc.shortDescription || svc.description || ''}</p>
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div>
                    <p className="text-dark-500 text-xs">À partir de</p>
                    <p className="text-gold-500 font-bold">{svc.basePrice} DT</p>
                  </div>
                  <button onClick={() => openQuote(svc)} className="btn-gold py-2 px-4 text-xs">
                    Demander un devis
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quote request modal */}
      {showQuoteModal && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowQuoteModal(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold text-white">Demander un devis</h2>
                <p className="text-dark-400 text-xs">{selectedService.name}</p>
              </div>
              <button onClick={() => setShowQuoteModal(false)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-xs mb-1 block flex items-center gap-1"><Calendar size={12} /> Date *</label>
                  <input type="date" value={quoteForm.date} onChange={e => setQuoteForm({ ...quoteForm, date: e.target.value })}
                    className="input-field w-full py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block flex items-center gap-1"><Clock size={12} /> Heure</label>
                  <input type="time" value={quoteForm.time} onChange={e => setQuoteForm({ ...quoteForm, time: e.target.value })}
                    className="input-field w-full py-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-dark-300 text-xs mb-1 block flex items-center gap-1"><MapPin size={12} /> Lieu</label>
                <input value={quoteForm.location} onChange={e => setQuoteForm({ ...quoteForm, location: e.target.value })}
                  className="input-field w-full py-2.5 text-sm" placeholder="Salle, restaurant..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-xs mb-1 block flex items-center gap-1"><Users size={12} /> Nombre d'invités</label>
                  <input type="number" value={quoteForm.guests} onChange={e => setQuoteForm({ ...quoteForm, guests: e.target.value })}
                    className="input-field w-full py-2.5 text-sm" placeholder="150" />
                </div>
                <div>
                  <label className="text-dark-300 text-xs mb-1 block">Durée (heures)</label>
                  <input type="number" value={quoteForm.duration} onChange={e => setQuoteForm({ ...quoteForm, duration: e.target.value })}
                    className="input-field w-full py-2.5 text-sm" placeholder="8" />
                </div>
              </div>
              <div>
                <label className="text-dark-300 text-xs mb-1 block">Message / Précisions</label>
                <textarea value={quoteForm.message} onChange={e => setQuoteForm({ ...quoteForm, message: e.target.value })}
                  className="input-field w-full py-2.5 text-sm" rows={3} placeholder="Décrivez votre événement..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-white/10">
              <button onClick={() => setShowQuoteModal(false)} className="py-2 px-5 text-sm text-dark-300 hover:text-white">Annuler</button>
              <button onClick={submitQuote} disabled={submitting || !quoteForm.date} className="btn-gold py-2 px-6 text-sm disabled:opacity-50">
                {submitting ? 'Envoi...' : 'Envoyer la demande'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
