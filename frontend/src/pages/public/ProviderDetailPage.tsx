import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Star, MapPin, Phone, Globe, Users, Calendar, Clock,
  CheckCircle, XCircle, ChevronRight, Send, Heart, Camera
} from 'lucide-react';
import { providersApi, Provider, ProviderComposition, ProviderAvailability, ProviderReview, ProviderGallery } from '@/lib/neonApi';
import { formatPrice } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';

export default function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [composition, setComposition] = useState<ProviderComposition[]>([]);
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [gallery, setGallery] = useState<ProviderGallery[]>([]);
  const [availability, setAvailability] = useState<ProviderAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'gallery' | 'availability'>('overview');

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      providersApi.get(id),
      providersApi.getCompositions(id).catch(() => []),
      providersApi.getReviews(id).catch(() => []),
      providersApi.getGallery(id).catch(() => []),
      providersApi.getAvailability(id).catch(() => []),
    ]).then(([prov, comp, rev, gal, avail]) => {
      setProvider(prov);
      setComposition(comp || []);
      setReviews(rev || []);
      setGallery(gal || []);
      setAvailability(avail || []);
    }).catch(() => setProvider(null))
      .finally(() => setLoading(false));
  }, [id]);

  const submitReview = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      const rev = await providersApi.addReview(id, { rating: reviewRating, comment: reviewComment || undefined });
      setReviews(prev => [rev, ...prev]);
      setShowReviewForm(false);
      setReviewComment('');
      setReviewRating(5);
      success('Avis publié', 'Merci pour votre retour !');
    } catch (e: any) {
      toastError('Erreur', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : provider?.rating || 0;

  if (loading) {
    return (
      <div className="pt-24 min-h-screen max-w-5xl mx-auto px-4 py-8">
        <div className="glass rounded-2xl h-96 animate-pulse" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="pt-24 min-h-screen max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-dark-400 text-lg mb-4">Prestataire introuvable.</p>
        <Link to="/prestataires" className="btn-gold py-2 px-6 text-sm">Retour aux prestataires</Link>
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: 'Aperçu' },
    { key: 'reviews', label: `Avis (${reviews.length})` },
    { key: 'gallery', label: `Galerie (${gallery.length})` },
    { key: 'availability', label: 'Disponibilité' },
  ];

  const next7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const getAvailStatus = (date: string) => {
    const a = availability.find(x => x.date === date);
    return a?.status || 'DISPONIBLE';
  };

  return (
    <div className="pt-24 min-h-screen bg-dark-900">
      {/* Back */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <Link to="/prestataires" className="inline-flex items-center gap-2 text-dark-400 hover:text-white text-sm transition-colors">
          <ArrowLeft size={16} /> Retour aux prestataires
        </Link>
      </div>

      {/* Header card */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="glass rounded-2xl overflow-hidden">
          {/* Banner */}
          <div className="h-32 bg-gradient-to-r from-gold-500/20 via-dark-700 to-dark-800" />

          <div className="px-6 pb-6 -mt-10">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl bg-dark-700 border-4 border-dark-800 flex items-center justify-center flex-shrink-0">
                <span className="text-gold-500 text-3xl font-bold">{provider.name.charAt(0)}</span>
              </div>

              <div className="flex-1 min-w-0 pt-2">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h1 className="text-2xl font-display font-bold text-white">{provider.name}</h1>
                  <span className={`badge text-xs ${provider.isAvailable ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {provider.isAvailable ? 'Disponible' : 'Indisponible'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-dark-300 mt-2">
                  {provider.city && (
                    <span className="flex items-center gap-1"><MapPin size={14} /> {provider.city}</span>
                  )}
                  {avgRating > 0 && (
                    <span className="flex items-center gap-1">
                      <Star size={14} className="text-gold-400 fill-gold-400" />
                      {avgRating.toFixed(1)} ({reviews.length || provider.reviewCount} avis)
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right pt-2">
                <p className="text-3xl font-display font-bold text-gold-500">{formatPrice(provider.price)} DT</p>
                <p className="text-dark-500 text-xs">prix de base</p>
              </div>
            </div>

            {/* Quick info */}
            <div className="flex flex-wrap gap-4 mt-5">
              {provider.phone && (
                <a href={`tel:${provider.phone}`} className="flex items-center gap-2 text-dark-300 hover:text-gold-400 text-sm transition-colors">
                  <Phone size={14} /> {provider.phone}
                </a>
              )}
              {provider.email && (
                <a href={`mailto:${provider.email}`} className="flex items-center gap-2 text-dark-300 hover:text-gold-400 text-sm transition-colors">
                  <Globe size={14} /> {provider.email}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex gap-1 border-b border-white/10 mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.key
                  ? 'border-gold-500 text-gold-400'
                  : 'border-transparent text-dark-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
            {/* Main */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-3">À propos</h3>
                <p className="text-dark-200 leading-relaxed">
                  {provider.description || 'Aucune description disponible.'}
                </p>
              </div>

              {/* Composition */}
              {composition.length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Users size={16} className="text-gold-500" /> Équipe ({composition.length})
                  </h3>
                  <div className="space-y-2">
                    {composition.map(c => (
                      <div key={c.id} className="flex items-center gap-3 glass rounded-xl px-4 py-3">
                        <div className="w-8 h-8 rounded-lg bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                          <Users size={14} className="text-gold-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{c.role}</p>
                          {c.description && <p className="text-dark-500 text-xs">{c.description}</p>}
                        </div>
                        <span className="badge bg-dark-700 text-dark-300 text-xs">×{c.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* CTA */}
              <div className="glass rounded-2xl p-6">
                <p className="text-3xl font-bold text-gold-500 mb-1">{formatPrice(provider.price)} DT</p>
                <p className="text-dark-400 text-sm mb-4">Prix de base</p>
                <Link to="/devis" className="btn-gold w-full py-3 text-center block flex items-center justify-center gap-2">
                  <Send size={15} /> Demander un devis
                </Link>
              </div>

              {/* Quick review summary */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-3">Avis clients</h3>
                {reviews.length > 0 ? (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl font-bold text-white">{avgRating.toFixed(1)}</span>
                      <div>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={14} className={i < Math.round(avgRating) ? 'text-gold-400 fill-gold-400' : 'text-dark-600'} />
                          ))}
                        </div>
                        <p className="text-dark-500 text-xs">{reviews.length} avis</p>
                      </div>
                    </div>
                    {reviews.slice(0, 2).map(r => (
                      <div key={r.id} className="glass rounded-xl p-3 mb-2">
                        <div className="flex items-center gap-1 mb-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={10} className={i < r.rating ? 'text-gold-400 fill-gold-400' : 'text-dark-600'} />
                          ))}
                        </div>
                        {r.comment && <p className="text-dark-300 text-xs line-clamp-2">{r.comment}</p>}
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-dark-500 text-sm">Aucun avis pour le moment.</p>
                )}
                <button
                  onClick={() => setActiveTab('reviews')}
                  className="text-gold-400 text-xs mt-2 flex items-center gap-1 hover:text-gold-300"
                >
                  Voir tous les avis <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Reviews */}
        {activeTab === 'reviews' && (
          <div className="max-w-3xl pb-8">
            {/* Add review */}
            {user && (
              <div className="glass rounded-2xl p-6 mb-6">
                <h3 className="text-white font-semibold mb-3">Donner votre avis</h3>
                {!showReviewForm ? (
                  <button onClick={() => setShowReviewForm(true)} className="btn-outline-gold py-2 px-5 text-sm">
                    Écrire un avis
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-dark-300 text-sm mb-2 block">Note</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(r => (
                          <button
                            key={r}
                            onClick={() => setReviewRating(r)}
                            className="p-1 transition-colors"
                          >
                            <Star size={24} className={r <= reviewRating ? 'text-gold-400 fill-gold-400' : 'text-dark-600 hover:text-dark-400'} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-dark-300 text-sm mb-1.5 block">Commentaire (optionnel)</label>
                      <textarea
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        rows={3}
                        className="input-field w-full resize-none text-sm"
                        placeholder="Partagez votre expérience..."
                      />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={submitReview} disabled={submitting} className="btn-gold py-2 px-5 text-sm disabled:opacity-50">
                        {submitting ? '...' : 'Publier'}
                      </button>
                      <button onClick={() => { setShowReviewForm(false); setReviewComment(''); }} className="btn-ghost py-2 px-5 text-sm">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reviews list */}
            {reviews.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <Star size={40} className="mx-auto mb-3 text-dark-600" />
                <p className="text-dark-400">Aucun avis pour ce prestataire.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map(r => (
                  <div key={r.id} className="glass rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-gold-500/20 flex items-center justify-center">
                        <span className="text-gold-500 text-sm font-bold">
                          {(r as any).user?.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{(r as any).user?.name || 'Utilisateur'}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} size={11} className={i < r.rating ? 'text-gold-400 fill-gold-400' : 'text-dark-600'} />
                            ))}
                          </div>
                          <span className="text-dark-500 text-xs">
                            {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    {r.comment && (
                      <p className="text-dark-200 text-sm leading-relaxed mt-2">{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Gallery */}
        {activeTab === 'gallery' && (
          <div className="pb-8">
            {gallery.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <Camera size={40} className="mx-auto mb-3 text-dark-600" />
                <p className="text-dark-400">Aucune photo dans la galerie.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {gallery.map(g => (
                  <div key={g.id} className="glass rounded-xl overflow-hidden group">
                    <div className="aspect-square">
                      <img
                        src={g.imageUrl}
                        alt={g.caption || ''}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    {g.caption && (
                      <div className="p-3">
                        <p className="text-dark-300 text-xs truncate">{g.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Availability */}
        {activeTab === 'availability' && (
          <div className="max-w-2xl pb-8">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-gold-500" /> Prochains 7 jours
              </h3>
              <div className="space-y-2">
                {next7Days.map(date => {
                  const status = getAvailStatus(date);
                  const isAvail = status === 'DISPONIBLE';
                  return (
                    <div key={date} className="flex items-center justify-between glass rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        {isAvail ? (
                          <CheckCircle size={18} className="text-green-400" />
                        ) : (
                          <XCircle size={18} className="text-red-400" />
                        )}
                        <div>
                          <p className="text-white text-sm font-medium">
                            {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </p>
                          <p className="text-dark-500 text-xs">
                            {status === 'DISPONIBLE' ? 'Disponible' :
                             status === 'RESERVEE' ? 'Réservée' :
                             status === 'INDISPONIBLE' ? 'Indisponible' : status}
                          </p>
                        </div>
                      </div>
                      <span className={`badge text-xs ${
                        isAvail ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {isAvail ? 'Oui' : 'Non'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
