import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, Filter, X, Check, ChevronDown, Users } from 'lucide-react';
import { servicesApi, providersApi, ServiceType, ServiceItem, Provider } from '@/lib/neonApi';

const categoryImages: Record<string, string> = {
  default: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=600',
  photo: 'https://images.pexels.com/photos/1045541/pexels-photo-1045541.jpeg?auto=compress&cs=tinysrgb&w=600',
  video: 'https://images.pexels.com/photos/3680219/pexels-photo-3680219.jpeg?auto=compress&cs=tinysrgb&w=600',
  dj: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600',
  decoration: 'https://images.pexels.com/photos/1045541/pexels-photo-1045541.jpeg?auto=compress&cs=tinysrgb&w=600',
  animation: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600',
  sonorisation: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=600',
  eclairage: 'https://images.pexels.com/photos/787961/pexels-photo-787961.jpeg?auto=compress&cs=tinysrgb&w=600',
  scene: 'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=600',
  traiteur: 'https://images.pexels.com/photos/587741/pexels-photo-587741.jpeg?auto=compress&cs=tinysrgb&w=600',
  salle: 'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=600',
};

function getImage(svc: ServiceItem): string {
  if (svc.image) return svc.image;
  if (svc.type?.slug) {
    const key = Object.keys(categoryImages).find(k => svc.type!.slug.toLowerCase().includes(k));
    if (key) return categoryImages[key];
  }
  return categoryImages.default;
}

const priceTypeLabels: Record<string, string> = {
  FIXE: '/ prestation',
  A_PARTIR_DE: '/ à partir de',
  PAR_HEURE: '/ heure',
  PAR_JOUR: '/ jour',
  PAR_PERSONNE: '/ personne',
  PAR_QUANTITE: '/ quantité',
  SUR_DEVIS: '',
};

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [maxPrice, setMaxPrice] = useState(5000);
  const [minRating, setMinRating] = useState(0);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    Promise.all([
      servicesApi.publicList(),
      servicesApi.publicCategories(),
    ]).then(([svcs, cats]) => {
      setServices(svcs || []);
      setCategories(cats || []);
    }).catch(() => {
      // Fallback: try old API format
      import('@/lib/neonApi').then(({ publicApi }) =>
        publicApi.services().then(data => setServices((data || []) as any[]))
      ).catch(() => setServices([]));
    }).finally(() => setLoading(false));
  }, []);

  const filtered = services.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCat || s.typeId === selectedCat;
    const matchPrice = s.basePrice <= maxPrice;
    const matchAvail = !availableOnly || s.active;
    return matchSearch && matchCat && matchPrice && matchAvail;
  });

  const featured = services.filter(s => s.featured);

  const resetFilters = () => {
    setSelectedCat(''); setMaxPrice(5000); setMinRating(0); setAvailableOnly(false); setSearch('');
  };

  const activeFilterCount = (selectedCat ? 1 : 0) + (maxPrice < 5000 ? 1 : 0) + (availableOnly ? 1 : 0);

  return (
    <div className="pt-24 min-h-screen">
      {/* Hero */}
      <div className="bg-dark-800/50 border-b border-white/10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gold-500 text-sm font-medium uppercase tracking-widest mb-3">Notre Catalogue</p>
          <h1 className="section-title mb-4">Nos Services</h1>
          <p className="text-dark-300 mb-8 max-w-2xl mx-auto">
            Tout ce qu'il vous faut pour créer un événement exceptionnel. De la musique à la décoration,
            de la photographie au traiteur, nous vous accompagnons à chaque étape.
          </p>
          <div className="relative max-w-md mx-auto">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="input-field pl-12 py-3.5" placeholder="Rechercher un service..." />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Category chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setSelectedCat('')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${!selectedCat ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white border border-white/5 hover:border-gold-500/20'}`}>
            Tous
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCat(selectedCat === cat.id ? '' : cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCat === cat.id ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white border border-white/5 hover:border-gold-500/20'}`}>
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Advanced filters */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all glass border ${showFilters ? 'border-gold-500/40 text-gold-400' : 'border-white/5 text-dark-300 hover:text-white'}`}>
            <Filter size={13} />
            Filtres {activeFilterCount > 0 && <span className="bg-gold-500 text-dark-900 w-4 h-4 rounded-full flex items-center justify-center font-bold">{activeFilterCount}</span>}
            <ChevronDown size={13} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          {activeFilterCount > 0 && (
            <button onClick={resetFilters} className="text-xs text-dark-400 hover:text-white transition-colors flex items-center gap-1">
              <X size={11} /> Réinitialiser
            </button>
          )}
        </div>

        {showFilters && (
          <div className="glass rounded-2xl p-5 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="text-dark-300 text-xs mb-2 block">
                Prix max : <span className="text-gold-400 font-medium">{maxPrice.toLocaleString('fr-FR')} DT</span>
              </label>
              <input type="range" min={100} max={5000} step={100} value={maxPrice}
                onChange={e => setMaxPrice(parseInt(e.target.value))}
                className="w-full accent-gold-500" />
              <div className="flex justify-between text-dark-600 text-xs mt-1"><span>100 DT</span><span>5 000 DT</span></div>
            </div>
            <div>
              <label className="text-dark-300 text-xs mb-2 block">Disponibilité</label>
              <button onClick={() => setAvailableOnly(!availableOnly)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-all mt-1 ${availableOnly ? 'border-green-500/40 bg-green-500/10 text-green-400' : 'border-dark-600 text-dark-400 hover:border-dark-400'}`}>
                <div className={`w-4 h-4 rounded flex items-center justify-center border-2 ${availableOnly ? 'border-green-400 bg-green-400' : 'border-dark-500'}`}>
                  {availableOnly && <Check size={10} strokeWidth={3} className="text-dark-900" />}
                </div>
                Disponibles uniquement
              </button>
            </div>
          </div>
        )}

        {/* Featured section */}
        {!selectedCat && !search && featured.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-display font-bold text-white mb-1">⭐ Services les plus demandés</h2>
            <p className="text-dark-400 text-sm mb-6">Nos prestations les plus populaires</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {featured.slice(0, 4).map(service => (
                <ServiceCard key={service.id} service={service} onClick={() => setSelectedService(service)} />
              ))}
            </div>
          </div>
        )}

        <p className="text-dark-400 text-sm mb-6">{filtered.length} service{filtered.length !== 1 ? 's' : ''}</p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array(8).fill(0).map((_, i) => <div key={i} className="glass rounded-2xl h-72 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl">
            <Search size={40} className="mx-auto mb-3 text-dark-600" />
            <p className="text-dark-400 mb-3">Aucun service ne correspond à vos critères</p>
            <button onClick={resetFilters} className="btn-outline-gold py-2 px-5 text-sm">Réinitialiser les filtres</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(service => (
              <ServiceCard key={service.id} service={service} onClick={() => setSelectedService(service)} />
            ))}
          </div>
        )}
      </div>

      {/* Service detail modal */}
      {selectedService && (
        <ServiceDetailModal service={selectedService} onClose={() => setSelectedService(null)} />
      )}
    </div>
  );
}

function ServiceCard({ service, onClick }: { service: ServiceItem; onClick: () => void }) {
  return (
    <div className="glass rounded-2xl overflow-hidden group hover:border-gold-500/30 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer"
      onClick={onClick}>
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/10' }}>
        <img
          src={getImage(service)}
          alt={service.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        {service.type && (
          <div className="absolute top-3 left-3">
            <span className="badge bg-dark-900/80 text-gold-400 border border-gold-500/30 text-xs backdrop-blur-sm">
              {service.type.icon} {service.type.name}
            </span>
          </div>
        )}
        {service.featured && (
          <div className="absolute top-3 right-3">
            <span className="badge bg-gold-500/20 text-gold-400 border border-gold-500/30 text-xs backdrop-blur-sm">
              <Star size={10} className="inline fill-gold-400 mr-1" /> Populaire
            </span>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-white font-semibold mb-2 leading-tight group-hover:text-gold-400 transition-colors">{service.name}</h3>
        <p className="text-dark-300 text-xs leading-relaxed mb-4 line-clamp-2">
          {service.shortDescription || service.description || ''}
        </p>
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div>
            <p className="text-dark-500 text-xs">À partir de</p>
            <p className="text-gold-500 font-bold text-lg">{service.basePrice} DT</p>
          </div>
          <Link to="/devis" onClick={e => e.stopPropagation()}
            className="btn-gold py-2 px-4 text-xs">
            Devis
          </Link>
        </div>
      </div>
    </div>
  );
}

function ServiceDetailModal({ service, onClose }: { service: ServiceItem; onClose: () => void }) {
  const [serviceProviders, setServiceProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  useEffect(() => {
    setLoadingProviders(true);
    providersApi.list({ serviceId: service.id, active: 'true' })
      .then(provs => setServiceProviders(provs || []))
      .catch(() => setServiceProviders([]))
      .finally(() => setLoadingProviders(false));
  }, [service.id]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10">
        <button onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-dark-700 hover:bg-dark-600 flex items-center justify-center text-dark-300 hover:text-white transition-all">
          <X size={16} />
        </button>
        <img
          src={getImage(service)}
          alt={service.name}
          className="w-full h-56 object-cover rounded-t-2xl" />
        <div className="p-7">
          <div className="flex items-start justify-between mb-5">
            <div>
              {service.type && (
                <span className="badge bg-gold-500/20 text-gold-400 border border-gold-500/30 mb-2">
                  {service.type.icon} {service.type.name}
                </span>
              )}
              <h2 className="text-2xl font-display font-bold text-white">{service.name}</h2>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
              <p className="text-2xl font-display font-bold text-gold-500">{service.basePrice} DT</p>
              <p className="text-dark-400 text-xs">{priceTypeLabels[service.priceType] || ''}</p>
            </div>
          </div>

          {service.shortDescription && (
            <p className="text-gold-400/80 font-medium mb-3">{service.shortDescription}</p>
          )}
          <p className="text-dark-200 leading-relaxed mb-6">{service.description || 'Aucune description disponible.'}</p>

          {/* Resources */}
          {service.resources && service.resources.length > 0 && (
            <div className="mb-6">
              <h4 className="text-white font-medium mb-2">Ressources disponibles</h4>
              <div className="flex flex-wrap gap-2">
                {service.resources.map((r: any) => (
                  <span key={r.id} className="glass rounded-lg px-3 py-1.5 text-xs text-dark-300">
                    {r.name} {r.location ? `— ${r.location}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prestataires disponibles */}
          {!loadingProviders && serviceProviders.length > 0 && (
            <div className="mb-6">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <Users size={16} className="text-gold-500" /> Prestataires disponibles ({serviceProviders.length})
              </h4>
              <div className="space-y-2">
                {serviceProviders.map(p => (
                  <div key={p.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-gold-500 text-sm font-bold">{p.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{p.name}</p>
                      <div className="flex items-center gap-2 text-xs">
                        {p.city && <span className="text-dark-400">{p.city}</span>}
                        {p.rating > 0 && (
                          <span className="flex items-center gap-1 text-gold-400">
                            <Star size={10} className="fill-gold-400" /> {p.rating.toFixed(1)}
                          </span>
                        )}
                        {p.reviewCount > 0 && (
                          <span className="text-dark-500">({p.reviewCount} avis)</span>
                        )}
                      </div>
                    </div>
                    <span className="text-gold-400 text-sm font-bold">{p.price} DT</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Associated packs */}
          {service.packServices && service.packServices.length > 0 && (
            <div className="mb-6">
              <h4 className="text-white font-medium mb-2">Ce service est inclus dans :</h4>
              <div className="space-y-2">
                {service.packServices.map((ps: any) => (
                  <div key={ps.pack?.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-lg">💎</span>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{ps.pack?.name}</p>
                      <p className="text-dark-500 text-xs">{ps.pack?.price} DT</p>
                    </div>
                    <Link to="/packs" onClick={onClose} className="text-gold-400 text-xs hover:text-gold-300">Voir le pack</Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link to="/devis" className="btn-gold w-full text-center py-3.5 block">
            Demander un devis pour ce service
          </Link>
        </div>
      </div>
    </div>
  );
}
