import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, MapPin, Users, Filter, X, ChevronRight, Phone, Globe } from 'lucide-react';
import { providersApi, servicesApi, Provider, ServiceItem, ServiceType } from '@/lib/neonApi';
import { formatPrice } from '@/lib/format';

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    Promise.all([
      providersApi.publicList(),
      servicesApi.publicList(),
      servicesApi.publicCategories(),
    ]).then(([provs, svcs, cats]) => {
      setProviders(provs || []);
      setServices(svcs || []);
      setCategories(cats || []);
    }).catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, []);

  const cities = [...new Set(providers.map(p => p.city).filter(Boolean))] as string[];

  const filtered = providers.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase());
    const matchService = !filterService || p.serviceId === filterService;
    const matchCity = !filterCity || p.city === filterCity;
    return matchSearch && matchService && matchCity;
  });

  const activeFilterCount = (filterService ? 1 : 0) + (filterCity ? 1 : 0);

  const resetFilters = () => {
    setFilterService('');
    setFilterCity('');
    setSearch('');
  };

  return (
    <div className="pt-24 min-h-screen">
      {/* Hero */}
      <div className="bg-dark-800/50 border-b border-white/10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gold-500 text-sm font-medium uppercase tracking-widest mb-3">Nos Experts</p>
          <h1 className="text-4xl lg:text-5xl font-display font-bold text-white mb-4">
            Nos <span className="text-gold-500">Prestataires</span>
          </h1>
          <p className="text-dark-300 text-lg max-w-2xl mx-auto">
            Découvrez notre réseau de prestataires qualifiés, sélectionnés pour leur excellence et leur professionnalisme.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search + Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un prestataire..."
              className="input-field w-full pl-10 pr-4 py-3"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 py-3 px-5 rounded-xl border text-sm transition-all ${
              showFilters || activeFilterCount > 0
                ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                : 'border-white/10 text-dark-300 hover:border-white/20'
            }`}
          >
            <Filter size={15} />
            Filtres {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
        </div>

        {/* Filter panels */}
        {showFilters && (
          <div className="glass rounded-2xl p-5 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium text-sm">Filtres avancés</h3>
              {activeFilterCount > 0 && (
                <button onClick={resetFilters} className="text-dark-400 hover:text-white text-xs flex items-center gap-1">
                  <X size={12} /> Réinitialiser
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-dark-400 text-xs mb-1.5 block">Service</label>
                <select
                  value={filterService}
                  onChange={e => setFilterService(e.target.value)}
                  className="input-field w-full py-2.5 text-sm"
                >
                  <option value="">Tous les services</option>
                  {services.filter(s => s.active).map(s => (
                    <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-dark-400 text-xs mb-1.5 block">Ville</label>
                <select
                  value={filterCity}
                  onChange={e => setFilterCity(e.target.value)}
                  className="input-field w-full py-2.5 text-sm"
                >
                  <option value="">Toutes les villes</option>
                  {cities.map(c => (
                    <option key={c} value={c!}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <p className="text-dark-400 text-sm mb-6">
          {filtered.length} prestataire{filtered.length !== 1 ? 's' : ''}
        </p>

        {/* Providers grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="glass rounded-2xl h-72 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 glass rounded-2xl">
            <Users size={40} className="mx-auto mb-3 text-dark-600" />
            <p className="text-dark-400 mb-3">Aucun prestataire trouvé</p>
            <button onClick={resetFilters} className="btn-outline-gold py-2 px-5 text-sm">
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(p => (
              <Link
                key={p.id}
                to={`/prestataires/${p.id}`}
                className="glass rounded-2xl overflow-hidden group hover:border-gold-500/30 transition-all duration-300 hover:-translate-y-1"
              >
                {/* Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-gold-500 text-xl font-bold">{p.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-lg group-hover:text-gold-400 transition-colors truncate">
                        {p.name}
                      </h3>
                      {p.city && (
                        <p className="text-dark-400 text-sm flex items-center gap-1 mt-0.5">
                          <MapPin size={12} /> {p.city}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Rating */}
                  {p.rating > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < Math.round(p.rating) ? 'text-gold-400 fill-gold-400' : 'text-dark-600'}
                          />
                        ))}
                      </div>
                      <span className="text-white text-sm font-medium">{p.rating.toFixed(1)}</span>
                      <span className="text-dark-500 text-xs">({p.reviewCount} avis)</span>
                    </div>
                  )}

                  {/* Description */}
                  {p.description && (
                    <p className="text-dark-300 text-sm leading-relaxed line-clamp-2 mb-4">
                      {p.description}
                    </p>
                  )}

                  {/* Composition preview */}
                  {p.composition && p.composition.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {p.composition.slice(0, 3).map((c, i) => (
                        <span key={i} className="glass rounded-lg px-2 py-1 text-[10px] text-dark-300 border border-white/5">
                          {c.role} ×{c.quantity}
                        </span>
                      ))}
                      {p.composition.length > 3 && (
                        <span className="glass rounded-lg px-2 py-1 text-[10px] text-dark-400">
                          +{p.composition.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-gold-400 text-xl font-bold">{formatPrice(p.price)} DT</p>
                    <p className="text-dark-500 text-xs">prix de base</p>
                  </div>
                  <span className="flex items-center gap-1 text-gold-400 text-sm font-medium group-hover:gap-2 transition-all">
                    Voir le profil <ChevronRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
