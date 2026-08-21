import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, MapPin, Users, ChevronRight, Heart, Filter, X } from 'lucide-react';
import { providersApi, servicesApi, Provider, ServiceItem } from '@/lib/neonApi';
import { formatPrice } from '@/lib/format';
import PageHeader from '@/components/ui/PageHeader';

export default function ClientPrestataires() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterCity, setFilterCity] = useState('');

  useEffect(() => {
    Promise.all([
      providersApi.publicList(),
      servicesApi.publicList(),
    ]).then(([provs, svcs]) => {
      setProviders(provs || []);
      setServices(svcs || []);
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

  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title="Prestataires"
        subtitle={`${providers.length} prestataires disponibles pour votre événement`}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un prestataire..."
            className="input-field pl-9 py-2.5 text-sm w-full"
          />
        </div>
        <select value={filterService} onChange={e => setFilterService(e.target.value)} className="input-field py-2.5 text-sm">
          <option value="">Tous les services</option>
          {services.filter(s => s.active).map(s => (
            <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
          ))}
        </select>
        <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="input-field py-2.5 text-sm">
          <option value="">Toutes les villes</option>
          {cities.map(c => <option key={c} value={c!}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array(6).fill(0).map((_, i) => <div key={i} className="glass rounded-2xl h-64 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl">
          <Users size={40} className="mx-auto mb-3 text-dark-600" />
          <p className="text-dark-400">Aucun prestataire trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(p => (
            <div key={p.id} className="glass rounded-2xl overflow-hidden group hover:border-gold-500/30 transition-all">
              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-gold-500 text-lg font-bold">{p.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold group-hover:text-gold-400 transition-colors truncate">{p.name}</h3>
                    {p.city && <p className="text-dark-400 text-xs flex items-center gap-1 mt-0.5"><MapPin size={11} /> {p.city}</p>}
                  </div>
                </div>

                {p.rating > 0 && (
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={12} className={i < Math.round(p.rating) ? 'text-gold-400 fill-gold-400' : 'text-dark-600'} />
                    ))}
                    <span className="text-white text-xs ml-1">{p.rating.toFixed(1)}</span>
                    <span className="text-dark-500 text-xs">({p.reviewCount})</span>
                  </div>
                )}

                {p.description && (
                  <p className="text-dark-300 text-xs line-clamp-2 mb-3">{p.description}</p>
                )}

                {p.composition && p.composition.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.composition.slice(0, 2).map((c, i) => (
                      <span key={i} className="badge bg-dark-700 text-dark-300 text-[10px] border border-white/5">
                        {c.role} ×{c.quantity}
                      </span>
                    ))}
                    {p.composition.length > 2 && (
                      <span className="badge bg-dark-700 text-dark-400 text-[10px]">+{p.composition.length - 2}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="text-gold-400 font-bold">{formatPrice(p.price)} DT</span>
                  <Link to={`/prestataires/${p.id}`} className="text-gold-400 text-xs hover:text-gold-300 flex items-center gap-1">
                    Voir profil <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
