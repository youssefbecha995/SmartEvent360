import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Star, MapPin, Phone, Globe, Users, Calendar, CheckCircle, XCircle,
  Edit2, Save, X, Trash2, Plus, Camera, Clock, ChevronDown, ChevronUp
} from 'lucide-react';
import { providersApi, Provider, ProviderComposition, ProviderAvailability, ProviderReview, ProviderGallery } from '@/lib/neonApi';
import { formatPrice } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

export default function AdminProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [composition, setComposition] = useState<ProviderComposition[]>([]);
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [gallery, setGallery] = useState<ProviderGallery[]>([]);
  const [availability, setAvailability] = useState<ProviderAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'gallery' | 'availability'>('overview');

  // Edit provider
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', price: '', city: '', address: '',
    phone: '', email: '', website: '', isAvailable: true,
  });
  const [saving, setSaving] = useState(false);

  // Composition
  const [showCompForm, setShowCompForm] = useState(false);
  const [compForm, setCompForm] = useState({ role: '', quantity: '1', description: '' });

  // Gallery
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [addingPhoto, setAddingPhoto] = useState(false);

  // Availability
  const [newAvailDate, setNewAvailDate] = useState('');
  const [newAvailStatus, setNewAvailStatus] = useState('INDISPONIBLE');
  const [addingAvail, setAddingAvail] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [prov, comp, rev, gal, avail] = await Promise.all([
        providersApi.get(id),
        providersApi.getCompositions(id).catch(() => []),
        providersApi.getReviews(id).catch(() => []),
        providersApi.getGallery(id).catch(() => []),
        providersApi.getAvailability(id).catch(() => []),
      ]);
      setProvider(prov);
      setComposition(comp || []);
      setReviews(rev || []);
      setGallery(gal || []);
      setAvailability(avail || []);
      setForm({
        name: prov.name,
        description: prov.description || '',
        price: String(prov.price),
        city: prov.city || '',
        address: prov.address || '',
        phone: prov.phone || '',
        email: prov.email || '',
        website: prov.website || '',
        isAvailable: prov.isAvailable,
      });
    } catch { setProvider(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const saveProvider = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await providersApi.update(id, {
        name: form.name,
        description: form.description || null,
        price: Number(form.price) || 0,
        city: form.city || null,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        isAvailable: form.isAvailable,
      });
      setEditing(false);
      success('Prestataire mis à jour');
      load();
    } catch (e: any) { toastError('Erreur', e.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async () => {
    if (!id) return;
    try {
      await providersApi.toggleStatus(id);
      success(provider?.isAvailable ? 'Prestataire désactivé' : 'Prestataire activé');
      load();
    } catch (e: any) { toastError('Erreur', e.message); }
  };

  const deleteProvider = async () => {
    if (!id || !confirm('Supprimer ce prestataire ?')) return;
    try {
      await providersApi.delete(id);
      success('Prestataire supprimé');
      navigate('/admin/prestataires');
    } catch (e: any) { toastError('Erreur', e.message); }
  };

  // Composition CRUD
  const addComposition = async () => {
    if (!id || !compForm.role.trim()) return;
    try {
      await providersApi.addComposition(id, { role: compForm.role, quantity: Number(compForm.quantity) || 1, description: compForm.description || undefined });
      setCompForm({ role: '', quantity: '1', description: '' });
      setShowCompForm(false);
      const comp = await providersApi.getCompositions(id);
      setComposition(comp || []);
      success('Membre ajouté');
    } catch (e: any) { toastError('Erreur', e.message); }
  };

  const deleteComposition = async (memberId: string) => {
    if (!confirm('Supprimer ce membre ?')) return;
    try {
      await providersApi.deleteComposition(memberId);
      setComposition(prev => prev.filter(c => c.id !== memberId));
      success('Membre supprimé');
    } catch (e: any) { toastError('Erreur', e.message); }
  };

  // Gallery
  const addPhoto = async () => {
    if (!id || !newPhotoUrl.trim()) return;
    setAddingPhoto(true);
    try {
      await providersApi.addGalleryPhoto(id, { imageUrl: newPhotoUrl, caption: newPhotoCaption || undefined, displayOrder: gallery.length });
      setNewPhotoUrl('');
      setNewPhotoCaption('');
      const gal = await providersApi.getGallery(id);
      setGallery(gal || []);
      success('Photo ajoutée');
    } catch (e: any) { toastError('Erreur', e.message); }
    finally { setAddingPhoto(false); }
  };

  const deletePhoto = async (photoId: string) => {
    if (!confirm('Supprimer cette photo ?')) return;
    try {
      await providersApi.deleteGalleryPhoto(photoId);
      setGallery(prev => prev.filter(g => g.id !== photoId));
      success('Photo supprimée');
    } catch (e: any) { toastError('Erreur', e.message); }
  };

  // Availability
  const addAvailability = async () => {
    if (!id || !newAvailDate) return;
    setAddingAvail(true);
    try {
      await providersApi.setAvailability(id, { date: newAvailDate, status: newAvailStatus });
      const avail = await providersApi.getAvailability(id);
      setAvailability(avail || []);
      setNewAvailDate('');
      setNewAvailStatus('INDISPONIBLE');
      success('Disponibilité mise à jour');
    } catch (e: any) { toastError('Erreur', e.message); }
    finally { setAddingAvail(false); }
  };

  // Delete review
  const deleteReview = async (reviewId: string) => {
    if (!confirm('Supprimer cet avis ?')) return;
    try {
      await providersApi.deleteReview(reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      success('Avis supprimé');
    } catch (e: any) { toastError('Erreur', e.message); }
  };

  if (loading) return <div className="p-6"><div className="glass rounded-2xl h-96 animate-pulse" /></div>;
  if (!provider) return <div className="p-6 text-center py-16"><p className="text-dark-400">Prestataire introuvable.</p></div>;

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : provider.rating;

  const tabs = [
    { key: 'overview', label: 'Aperçu' },
    { key: 'reviews', label: `Avis (${reviews.length})` },
    { key: 'gallery', label: `Galerie (${gallery.length})` },
    { key: 'availability', label: `Disponibilité` },
  ];

  const next14Days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d.toISOString().slice(0, 10);
  });
  const getAvailStatus = (date: string) => availability.find(x => x.date === date)?.status || 'DISPONIBLE';

  return (
    <div className="p-4 lg:p-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/admin/prestataires')} className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-display font-bold text-white">{provider.name}</h1>
          <p className="text-dark-400 text-sm">{provider.city || 'Sans adresse'} · {formatPrice(provider.price)} DT</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(!editing)} className="btn-outline-gold py-2 px-4 text-sm flex items-center gap-2">
            <Edit2 size={14} /> Modifier
          </button>
          <button onClick={toggleActive} className={`py-2 px-4 text-sm rounded-xl border transition-all ${
            provider.isAvailable ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-red-500/30 text-red-400 bg-red-500/10'
          }`}>
            {provider.isAvailable ? 'Désactiver' : 'Activer'}
          </button>
          <button onClick={deleteProvider} className="py-2 px-4 text-sm rounded-xl border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Edit Form */}
      {editing && (
        <div className="glass rounded-2xl p-6 mb-6 border border-gold-500/30">
          <h3 className="text-white font-semibold mb-4">Modifier le prestataire</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-dark-300 text-xs mb-1 block">Nom *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-field w-full py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-dark-300 text-xs mb-1 block">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} className="input-field w-full py-2 text-sm resize-none" />
            </div>
            <div>
              <label className="text-dark-300 text-xs mb-1 block">Prix (DT)</label>
              <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="input-field w-full py-2 text-sm" />
            </div>
            <div>
              <label className="text-dark-300 text-xs mb-1 block">Ville</label>
              <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="input-field w-full py-2 text-sm" />
            </div>
            <div>
              <label className="text-dark-300 text-xs mb-1 block">Adresse</label>
              <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="input-field w-full py-2 text-sm" />
            </div>
            <div>
              <label className="text-dark-300 text-xs mb-1 block">Téléphone</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="input-field w-full py-2 text-sm" />
            </div>
            <div>
              <label className="text-dark-300 text-xs mb-1 block">Email</label>
              <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="input-field w-full py-2 text-sm" />
            </div>
            <div>
              <label className="text-dark-300 text-xs mb-1 block">Site web</label>
              <input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} className="input-field w-full py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={saveProvider} disabled={saving} className="btn-gold py-2 px-5 text-sm disabled:opacity-50">
              {saving ? '...' : '💾 Enregistrer'}
            </button>
            <button onClick={() => setEditing(false)} className="btn-ghost py-2 px-5 text-sm">Annuler</button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Prix', value: formatPrice(provider.price) + ' DT', color: 'text-gold-400' },
          { label: 'Note', value: avgRating.toFixed(1) + ' ★', color: 'text-gold-400' },
          { label: 'Avis', value: String(reviews.length), color: 'text-blue-400' },
          { label: 'Équipe', value: String(composition.length), color: 'text-cyan-400' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-dark-400 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === t.key ? 'border-gold-500 text-gold-400' : 'border-transparent text-dark-400 hover:text-white'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-3">Description</h3>
              <p className="text-dark-200 text-sm leading-relaxed">{provider.description || 'Aucune description.'}</p>
            </div>

            {/* Composition */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Users size={16} className="text-gold-500" /> Équipe ({composition.length})
                </h3>
                <button onClick={() => setShowCompForm(!showCompForm)} className="btn-gold py-1.5 px-3 text-xs flex items-center gap-1">
                  <Plus size={12} /> Ajouter
                </button>
              </div>
              {showCompForm && (
                <div className="glass rounded-xl p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <input value={compForm.role} onChange={e => setCompForm(p => ({ ...p, role: e.target.value }))} className="input-field py-2 text-sm col-span-2" placeholder="Rôle (ex: Photographe)" />
                    <input type="number" min="1" value={compForm.quantity} onChange={e => setCompForm(p => ({ ...p, quantity: e.target.value }))} className="input-field py-2 text-sm" placeholder="Qté" />
                  </div>
                  <input value={compForm.description} onChange={e => setCompForm(p => ({ ...p, description: e.target.value }))} className="input-field w-full py-2 text-sm" placeholder="Description (optionnel)" />
                  <div className="flex gap-2">
                    <button onClick={addComposition} disabled={!compForm.role.trim()} className="btn-gold py-1.5 px-4 text-xs disabled:opacity-50">Ajouter</button>
                    <button onClick={() => { setShowCompForm(false); setCompForm({ role: '', quantity: '1', description: '' }); }} className="btn-ghost py-1.5 px-4 text-xs">Annuler</button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {composition.map(c => (
                  <div key={c.id} className="flex items-center gap-3 glass rounded-xl px-4 py-3">
                    <Users size={14} className="text-gold-500" />
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{c.role}</p>
                      {c.description && <p className="text-dark-500 text-xs">{c.description}</p>}
                    </div>
                    <span className="badge bg-dark-700 text-dark-300 text-xs">×{c.quantity}</span>
                    <button onClick={() => deleteComposition(c.id)} className="p-1 rounded text-dark-400 hover:text-red-400"><Trash2 size={12} /></button>
                  </div>
                ))}
                {composition.length === 0 && <p className="text-dark-500 text-sm text-center py-4">Aucun membre</p>}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Info */}
            <div className="glass rounded-2xl p-6 space-y-3">
              <h3 className="text-white font-semibold mb-3">Contact</h3>
              {provider.phone && <p className="text-dark-300 text-sm flex items-center gap-2"><Phone size={14} /> {provider.phone}</p>}
              {provider.email && <p className="text-dark-300 text-sm flex items-center gap-2"><Globe size={14} /> {provider.email}</p>}
              {provider.city && <p className="text-dark-300 text-sm flex items-center gap-2"><MapPin size={14} /> {provider.city}{provider.address ? `, ${provider.address}` : ''}</p>}
              {provider.website && <a href={provider.website} target="_blank" rel="noreferrer" className="text-gold-400 text-sm flex items-center gap-2 hover:text-gold-300"><Globe size={14} /> Site web</a>}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Reviews */}
      {activeTab === 'reviews' && (
        <div className="max-w-3xl">
          {reviews.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center"><Star size={40} className="mx-auto mb-3 text-dark-600" /><p className="text-dark-400">Aucun avis.</p></div>
          ) : (
            <div className="space-y-3">
              {reviews.map(r => (
                <div key={r.id} className="glass rounded-xl px-5 py-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-gold-500 text-sm font-bold">{(r as any).user?.name?.charAt(0) || 'U'}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-medium">{(r as any).user?.name || 'Utilisateur'}</span>
                      <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={11} className={i < r.rating ? 'text-gold-400 fill-gold-400' : 'text-dark-600'} />)}</div>
                      <span className="text-dark-500 text-xs">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {r.comment && <p className="text-dark-200 text-sm">{r.comment}</p>}
                  </div>
                  <button onClick={() => deleteReview(r.id)} className="p-1.5 rounded text-dark-400 hover:text-red-400"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Gallery */}
      {activeTab === 'gallery' && (
        <div>
          <div className="glass rounded-2xl p-5 mb-6">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Camera size={16} className="text-gold-500" /> Ajouter une photo</h3>
            <div className="flex gap-3">
              <input value={newPhotoUrl} onChange={e => setNewPhotoUrl(e.target.value)} className="input-field flex-1 py-2 text-sm" placeholder="URL de l'image" />
              <input value={newPhotoCaption} onChange={e => setNewPhotoCaption(e.target.value)} className="input-field w-48 py-2 text-sm" placeholder="Légende" />
              <button onClick={addPhoto} disabled={addingPhoto || !newPhotoUrl.trim()} className="btn-gold py-2 px-4 text-sm disabled:opacity-50">
                {addingPhoto ? '...' : 'Ajouter'}
              </button>
            </div>
          </div>
          {gallery.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center"><Camera size={40} className="mx-auto mb-3 text-dark-600" /><p className="text-dark-400">Aucune photo.</p></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {gallery.map(g => (
                <div key={g.id} className="glass rounded-xl overflow-hidden group relative">
                  <div className="aspect-square"><img src={g.imageUrl} alt={g.caption || ''} className="w-full h-full object-cover" /></div>
                  <button onClick={() => deletePhoto(g.id)} className="absolute top-2 right-2 p-1.5 rounded-lg bg-dark-900/80 text-dark-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                  {g.caption && <div className="p-2"><p className="text-dark-300 text-xs truncate">{g.caption}</p></div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Availability */}
      {activeTab === 'availability' && (
        <div className="max-w-2xl">
          <div className="glass rounded-2xl p-5 mb-6">
            <h3 className="text-white font-semibold mb-3">Ajouter une disponibilité</h3>
            <div className="flex gap-3">
              <input type="date" value={newAvailDate} onChange={e => setNewAvailDate(e.target.value)} className="input-field py-2 text-sm" />
              <select value={newAvailStatus} onChange={e => setNewAvailStatus(e.target.value)} className="input-field py-2 text-sm">
                <option value="DISPONIBLE">Disponible</option>
                <option value="INDISPONIBLE">Indisponible</option>
                <option value="RESERVEE">Réservée</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
              <button onClick={addAvailability} disabled={addingAvail || !newAvailDate} className="btn-gold py-2 px-4 text-sm disabled:opacity-50">
                {addingAvail ? '...' : 'Ajouter'}
              </button>
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Calendar size={16} className="text-gold-500" /> 14 prochains jours</h3>
            <div className="space-y-2">
              {next14Days.map(date => {
                const status = getAvailStatus(date);
                const isAvail = status === 'DISPONIBLE';
                return (
                  <div key={date} className="flex items-center justify-between glass rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      {isAvail ? <CheckCircle size={16} className="text-green-400" /> : <XCircle size={16} className="text-red-400" />}
                      <p className="text-white text-sm">{new Date(date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                    </div>
                    <span className={`badge text-xs ${isAvail ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {isAvail ? 'Disponible' : status === 'RESERVEE' ? 'Réservée' : status === 'MAINTENANCE' ? 'Maintenance' : 'Indisponible'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
