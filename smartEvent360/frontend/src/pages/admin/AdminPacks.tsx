import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Star, Crown, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { packsApi, NeonPack } from '@/lib/neonApi';
import PageHeader from '@/components/ui/PageHeader';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const emptyForm = { name: '', description: '', price: '', duration: '4', maxGuests: '100', badge: '', isPopular: false, imageUrl: '', features: '' };

function validate(f: typeof emptyForm): string | null {
  if (!f.name.trim()) return 'Le nom est requis.';
  if (!f.price || isNaN(Number(f.price)) || Number(f.price) < 0) return 'Prix invalide.';
  if (isNaN(Number(f.duration)) || Number(f.duration) < 1) return 'Durée invalide.';
  if (isNaN(Number(f.maxGuests)) || Number(f.maxGuests) < 1) return 'Nombre d\'invités invalide.';
  return null;
}

const packIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('vip') || n.includes('premium')) return <Crown size={20} />;
  if (n.includes('gold') || n.includes('or'))     return <Star size={20} />;
  return <Zap size={20} />;
};

export default function AdminPacks() {
  const { success, error: toastError } = useToast();
  const [packs, setPacks]       = useState<NeonPack[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState<NeonPack | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await packsApi.list();
      setPacks(data);
    } catch { setPacks([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormError(''); setShowModal(true); };
  const openEdit = (p: NeonPack) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || '', price: String(p.price), duration: String(p.duration), maxGuests: String(p.maxGuests), badge: p.badge || '', isPopular: p.isPopular, imageUrl: p.imageUrl || '', features: (p.features || []).join('\n') });
    setFormError(''); setShowModal(true);
  };

  const handleSave = async () => {
    const err = validate(form);
    if (err) { setFormError(err); return; }
    setSaving(true);
    try {
      const features = form.features.split('\n').map(s => s.trim()).filter(Boolean);
      const body = { name: form.name, description: form.description || null, price: Number(form.price), duration: Number(form.duration), maxGuests: Number(form.maxGuests), badge: form.badge || null, isPopular: form.isPopular, imageUrl: form.imageUrl.trim() || null, features };
      if (editing) {
        await packsApi.update(editing.id, body);
        success('Pack modifié ✓', form.name);
      } else {
        await packsApi.create(body);
        success('Pack créé ✓', form.name);
      }
      setShowModal(false); load();
    } catch (e: any) { toastError('Erreur', e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer le pack "${name}" ?`)) return;
    try {
      await packsApi.delete(id);
      setPacks(prev => prev.filter(p => p.id !== id));
      success('Pack supprimé');
    } catch { toastError('Erreur', 'Impossible de supprimer ce pack.'); }
  };

  const toggleActive = async (p: NeonPack) => {
    try {
      await packsApi.update(p.id, { isActive: !p.isActive });
      setPacks(prev => prev.map(x => x.id === p.id ? { ...x, isActive: !x.isActive } : x));
      success(p.isActive ? 'Pack désactivé' : 'Pack activé');
    } catch { toastError('Erreur', 'Mise à jour échouée.'); }
  };

  return (
    <div className="p-4 lg:p-6">
      <PageHeader title="Gestion des Packs" subtitle={`${packs.length} offres`}
        action={<button onClick={openCreate} className="btn-gold py-2 px-4 text-sm flex items-center gap-2"><Plus size={15} />Nouveau pack</button>} />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_,i) => <SkeletonCard key={i} />)}
        </div>
      ) : packs.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Zap size={40} className="mx-auto mb-3 text-dark-600" />
          <p className="text-dark-400 mb-4">Aucun pack créé pour l'instant.</p>
          <button onClick={openCreate} className="btn-gold py-2 px-6 text-sm">Créer le premier pack</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {packs.map(p => (
            <div key={p.id} className={`relative glass rounded-2xl p-6 border transition-all hover:-translate-y-1 ${p.isPopular ? 'border-gold-500 ring-1 ring-gold-500' : 'border-dark-600'} ${!p.isActive ? 'opacity-50' : ''}`}>
              {p.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold-500 text-dark-900 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap z-10">{p.badge}</div>
              )}
              {p.imageUrl ? (
                <div className="relative h-28 -mx-6 -mt-6 mb-4 overflow-hidden">
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-800 via-dark-800/20 to-transparent" />
                </div>
              ) : (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${p.isPopular ? 'bg-gold-500 text-dark-900' : 'bg-dark-700 text-gold-500'}`}>
                  {packIcon(p.name)}
                </div>
              )}
              <h3 className={`text-xl font-bold mb-1 ${p.isPopular ? 'text-gold-500' : 'text-white'}`}>{p.name}</h3>
              {p.description && <p className="text-dark-400 text-xs mb-3 leading-relaxed line-clamp-2">{p.description}</p>}
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-3xl font-bold text-white">{p.price.toLocaleString('fr-FR')}</span>
                <span className="text-dark-400 text-sm">DT</span>
              </div>
              {p.features && p.features.length > 0 && (
                <p className="text-dark-500 text-[11px] mb-3">✓ {p.features.length} {p.features.length > 1 ? 'prestations incluses' : 'prestation incluse'}</p>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs text-dark-300 mb-5">
                <div className="bg-dark-700 rounded-lg p-2 text-center"><div className="text-white font-medium">{p.duration}h</div><div>Durée</div></div>
                <div className="bg-dark-700 rounded-lg p-2 text-center"><div className="text-white font-medium">{p.maxGuests}+</div><div>Invités</div></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(p)} className="flex-1 glass py-1.5 text-xs text-dark-300 hover:text-white rounded-lg flex items-center justify-center gap-1"><Edit2 size={12} />Modifier</button>
                <button onClick={() => toggleActive(p)} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${p.isActive ? 'bg-green-500/20 text-green-400' : 'bg-dark-700 text-dark-400'}`}>{p.isActive ? 'Actif' : 'Inactif'}</button>
                <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-lg w-full z-10 p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editing ? 'Modifier le pack' : 'Nouveau pack'}</h2>
              <button onClick={() => setShowModal(false)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            {formError && <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-2.5">{formError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Nom du pack *</label>
                <input value={form.name} onChange={e => { setForm(p=>({...p,name:e.target.value})); setFormError(''); }} className="input-field" placeholder="Ex: Pack Gold" />
              </div>
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} rows={2} className="input-field resize-none" placeholder="Services inclus..." />
              </div>
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Image (URL)</label>
                <input value={form.imageUrl} onChange={e => setForm(p=>({...p,imageUrl:e.target.value}))} className="input-field" placeholder="https://exemple.com/photo.jpg" />
              </div>
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Prestations incluses <span className="text-dark-500">(une par ligne)</span></label>
                <textarea value={form.features} onChange={e => setForm(p=>({...p,features:e.target.value}))} rows={4} className="input-field resize-none" placeholder={'Décoration complète\nOrchestre & sonorisation\nBuffet gastronomique'} />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Prix (DT) *</label>
                <input type="number" min="0" value={form.price} onChange={e => { setForm(p=>({...p,price:e.target.value})); setFormError(''); }} className="input-field" placeholder="3200" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Durée (heures)</label>
                <input type="number" min="1" value={form.duration} onChange={e => setForm(p=>({...p,duration:e.target.value}))} className="input-field" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Max invités</label>
                <input type="number" min="1" value={form.maxGuests} onChange={e => setForm(p=>({...p,maxGuests:e.target.value}))} className="input-field" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Badge (optionnel)</label>
                <input value={form.badge} onChange={e => setForm(p=>({...p,badge:e.target.value}))} className="input-field" placeholder="⭐ Le plus populaire" />
              </div>
              <div className="col-span-2 flex items-center gap-3 p-3 bg-dark-700 rounded-xl">
                <button type="button" onClick={() => setForm(p=>({...p,isPopular:!p.isPopular}))}
                  className={`relative w-11 h-6 rounded-full transition-all ${form.isPopular ? 'bg-gold-500' : 'bg-dark-600'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.isPopular ? 'left-6' : 'left-1'}`} />
                </button>
                <span className="text-dark-200 text-sm">Mettre en avant (pack populaire)</span>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-ghost flex-1 py-2.5">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="btn-gold flex-1 py-2.5 disabled:opacity-60">{saving ? 'Sauvegarde...' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
