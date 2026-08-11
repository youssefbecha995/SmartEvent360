import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, Filter, X, Check, ChevronDown } from 'lucide-react';
import { publicApi } from '@/lib/neonApi';

interface Service {
  id: string; nom: string; categorie: string; description: string;
  prix_base: number; note_moyenne: number; nb_avis: number; disponible: boolean; image_url: string | null;
}

const categories = ['Toutes', 'Sonorisation', 'Eclairage', 'DJ', 'Scene', 'Video', 'Photo', 'Animation', 'Decoration'];

const categoryImages: Record<string, string> = {
  Sonorisation: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=600',
  Eclairage: 'https://images.pexels.com/photos/787961/pexels-photo-787961.jpeg?auto=compress&cs=tinysrgb&w=600',
  Scene: 'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=600',
  DJ: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600',
  Photo: 'https://images.pexels.com/photos/1045541/pexels-photo-1045541.jpeg?auto=compress&cs=tinysrgb&w=600',
  Video: 'https://images.pexels.com/photos/3680219/pexels-photo-3680219.jpeg?auto=compress&cs=tinysrgb&w=600',
  Animation: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600',
  Decoration: 'https://images.pexels.com/photos/1045541/pexels-photo-1045541.jpeg?auto=compress&cs=tinysrgb&w=600',
};

const ratingColors = [
  '', 'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400', 'text-green-400'
];

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Toutes');
  const [maxPrice, setMaxPrice] = useState(5000);
  const [minRating, setMinRating] = useState(0);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    publicApi.services().then(data => {
      setServices((data || []) as Service[]);
    }).catch(() => setServices([])).finally(() => setLoading(false));
  }, []);

  const filtered = services.filter(s => {
    const matchSearch = s.nom.toLowerCase().includes(search.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'Toutes' || s.categorie === category;
    const matchPrice = s.prix_base <= maxPrice;
    const matchRating = s.note_moyenne >= minRating;
    const matchAvail = !availableOnly || s.disponible;
    return matchSearch && matchCat && matchPrice && matchRating && matchAvail;
  });

  const resetFilters = () => {
    setCategory('Toutes'); setMaxPrice(5000); setMinRating(0); setAvailableOnly(false); setSearch('');
  };

  const activeFilterCount = (category !== 'Toutes' ? 1 : 0) + (maxPrice < 5000 ? 1 : 0) + (minRating > 0 ? 1 : 0) + (availableOnly ? 1 : 0);

  return (
    <div className="pt-24 min-h-screen">
      {/* Header */}
      <div className="bg-dark-800/50 border-b border-white/10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gold-500 text-sm font-medium uppercase tracking-widest mb-3">Notre Catalogue</p>
          <h1 className="section-title mb-4">Nos Services</h1>
          <p className="text-dark-300 mb-8">Découvrez toutes nos prestations pour faire de votre événement un succès</p>
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
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${category === cat ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white border border-white/5 hover:border-gold-500/20'}`}>
                {cat}
              </button>
            ))}
          </div>

          {/* Advanced filters toggle */}
          <button onClick={() => setShowFilters(!showFilters)}
            className={`ml-auto flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all glass border ${showFilters ? 'border-gold-500/40 text-gold-400' : 'border-white/5 text-dark-300 hover:text-white'}`}>
            <Filter size={13} />
            Filtres {activeFilterCount > 0 && <span className="bg-gold-500 text-dark-900 w-4 h-4 rounded-full flex items-center justify-center font-bold">{activeFilterCount}</span>}
            <ChevronDown size={13} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expanded filters */}
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
              <label className="text-dark-300 text-xs mb-2 block">Note minimum</label>
              <div className="flex gap-1.5 flex-wrap mt-1">
                {[0, 3, 4, 4.5].map(r => (
                  <button key={r} onClick={() => setMinRating(r)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all border ${minRating === r ? 'border-gold-500 bg-gold-500/10 text-gold-400' : 'border-dark-600 text-dark-400 hover:border-dark-400'}`}>
                    {r === 0 ? 'Toutes' : <><Star size={11} className="fill-gold-500 text-gold-500" /> {r}+</>}
                  </button>
                ))}
              </div>
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
              {activeFilterCount > 0 && (
                <button onClick={resetFilters} className="mt-2 text-xs text-dark-400 hover:text-white transition-colors flex items-center gap-1">
                  <X size={11} /> Réinitialiser
                </button>
              )}
            </div>
          </div>
        )}

        <p className="text-dark-400 text-sm mb-6">{filtered.length} service{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''}</p>

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
              <div key={service.id}
                className="glass rounded-2xl overflow-hidden group hover:border-gold-500/30 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedService(service)}>
                <div className="relative overflow-hidden" style={{ aspectRatio: '16/10' }}>
                  <img
                    src={service.image_url || categoryImages[service.categorie] || categoryImages.Sonorisation}
                    alt={service.nom}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute top-3 left-3">
                    <span className="badge bg-dark-900/80 text-gold-400 border border-gold-500/30 text-xs backdrop-blur-sm">{service.categorie}</span>
                  </div>
                  <div className={`absolute top-3 right-3 w-3 h-3 rounded-full shadow-lg ${service.disponible ? 'bg-green-400 shadow-green-400/50' : 'bg-red-400 shadow-red-400/50'}`} title={service.disponible ? 'Disponible' : 'Indisponible'} />
                </div>
                <div className="p-5">
                  <h3 className="text-white font-semibold mb-2 leading-tight group-hover:text-gold-400 transition-colors">{service.nom}</h3>
                  <div className="flex items-center gap-1.5 mb-3">
                    <div className="flex gap-0.5">
                      {Array(5).fill(0).map((_, i) => (
                        <Star key={i} size={12} className={i < Math.floor(service.note_moyenne) ? 'text-gold-500 fill-gold-500' : 'text-dark-600'} />
                      ))}
                    </div>
                    <span className="text-gold-400 text-xs font-medium">{service.note_moyenne}</span>
                    <span className="text-dark-500 text-xs">({service.nb_avis} avis)</span>
                  </div>
                  <p className="text-dark-300 text-xs leading-relaxed mb-4 line-clamp-2">{service.description}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div>
                      <p className="text-dark-500 text-xs">À partir de</p>
                      <p className="text-gold-500 font-bold text-lg">{service.prix_base} DT</p>
                    </div>
                    <Link to="/devis" onClick={e => e.stopPropagation()}
                      className="btn-gold py-2 px-4 text-xs">
                      Devis
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Service detail modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setSelectedService(null)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10">
            <button onClick={() => setSelectedService(null)}
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-dark-700 hover:bg-dark-600 flex items-center justify-center text-dark-300 hover:text-white transition-all">
              <X size={16} />
            </button>
            <img
              src={selectedService.image_url || categoryImages[selectedService.categorie] || categoryImages.Sonorisation}
              alt={selectedService.nom}
              className="w-full h-56 object-cover rounded-t-2xl" />
            <div className="p-7">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <span className="badge bg-gold-500/20 text-gold-400 border border-gold-500/30 mb-2">{selectedService.categorie}</span>
                  <h2 className="text-2xl font-display font-bold text-white">{selectedService.nom}</h2>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-2xl font-display font-bold text-gold-500">{selectedService.prix_base} DT</p>
                  <p className="text-dark-400 text-xs">à partir de / jour</p>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-5">
                <div className="flex gap-0.5">
                  {Array(5).fill(0).map((_, i) => (
                    <Star key={i} size={16} className={i < Math.floor(selectedService.note_moyenne) ? 'text-gold-500 fill-gold-500' : 'text-dark-600'} />
                  ))}
                </div>
                <span className="text-gold-400 font-medium">{selectedService.note_moyenne}</span>
                <span className="text-dark-400 text-sm">({selectedService.nb_avis} avis clients)</span>
              </div>

              <p className="text-dark-200 leading-relaxed mb-6">{selectedService.description}</p>

              <div className={`flex items-center gap-2 mb-7 text-sm font-medium ${selectedService.disponible ? 'text-green-400' : 'text-red-400'}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${selectedService.disponible ? 'bg-green-400' : 'bg-red-400'}`} />
                {selectedService.disponible ? 'Disponible à la réservation' : 'Temporairement indisponible'}
              </div>

              <Link to="/devis" className="btn-gold w-full text-center py-3.5 block">
                Demander un devis pour ce service
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
