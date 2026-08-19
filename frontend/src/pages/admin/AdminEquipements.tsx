import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, X, Wrench, TrendingUp } from 'lucide-react';
import { crmApi } from '@/lib/crmApi';
import { formatPrice, nightsToBreakEven } from '@/lib/format';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

const categories = ['Son','Lumiere','Video','Scene','Decoration','Autre'];
const etatOptions = ['neuf','bon','moyen','a_reparer'];
const dispoOptions = ['disponible','reserve','en_reparation','indisponible'];

export default function AdminEquipements() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('Toutes');
  const [view, setView] = useState<'grille'|'table'>('grille');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nom: '', categorie: 'Son', reference: '', description: '', prix_location: '', prix_achat: '', etat: 'bon', disponibilite: 'disponible', localisation: 'Entrepôt A' });

  const load = async () => {
    try {
      const data = await crmApi.list('equipment');
      data.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
      setEquipment(data);
    } catch (e) {
      console.warn('[AdminEquipements] échec du chargement API:', e);
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, prix_location: parseFloat(form.prix_location) || 0, prix_achat: parseFloat(form.prix_achat) || 0 };
    try {
      if (editing) await crmApi.update('equipment', editing.id, payload);
      else await crmApi.create('equipment', payload);
      setShowModal(false);
      load();
    } catch (e) {
      console.error('[AdminEquipements] échec de la sauvegarde:', e);
      alert('Erreur lors de la sauvegarde. Vérifiez que le backend est démarré.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet équipement ?')) return;
    try {
      await crmApi.delete('equipment', id);
      setEquipment(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      console.error('[AdminEquipements] échec de la suppression:', e);
      alert('Erreur lors de la suppression.');
    }
  };

  const catImages: Record<string,string> = {
    Son: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=300',
    Lumiere: 'https://images.pexels.com/photos/787961/pexels-photo-787961.jpeg?auto=compress&cs=tinysrgb&w=300',
    Video: 'https://images.pexels.com/photos/3680219/pexels-photo-3680219.jpeg?auto=compress&cs=tinysrgb&w=300',
    Scene: 'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=300',
  };

  const roiNights = (eq: any) => nightsToBreakEven(eq.prix_achat, eq.prix_location);

  const filtered = equipment.filter(e => {
    const matchSearch = `${e.nom} ${e.reference || ''} ${e.categorie}`.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'Toutes' || e.categorie === filterCat;
    return matchSearch && matchCat;
  });

  const dispoColor = { disponible: 'bg-green-400', reserve: 'bg-yellow-400', en_reparation: 'bg-red-400', indisponible: 'bg-dark-500' };

  return (
    <div>
      <PageHeader title="Gestion des Équipements" subtitle={`${equipment.length} équipements`}
        action={<button onClick={() => { setEditing(null); setShowModal(true); setForm({ nom: '', categorie: 'Son', reference: '', description: '', prix_location: '', prix_achat: '', etat: 'bon', disponibilite: 'disponible', localisation: 'Entrepôt A' }); }} className="btn-gold py-2 px-4 text-sm flex items-center gap-2"><Plus size={15} />Ajouter</button>} />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2.5 text-sm w-60" placeholder="Rechercher..." />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['Toutes', ...categories].map(c => (
            <button key={c} onClick={() => setFilterCat(c)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterCat === c ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white'}`}>{c}</button>
          ))}
        </div>
        <div className="flex gap-1.5 ml-auto">
          {(['grille','table'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${view === v ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white'}`}>{v}</button>
          ))}
        </div>
      </div>

      {view === 'grille' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? Array(8).fill(0).map((_, i) => <div key={i} className="glass rounded-2xl h-56 animate-pulse" />) :
            filtered.map(eq => (
              <div key={eq.id} className="glass rounded-2xl overflow-hidden group hover:border-gold-500/30 transition-all cursor-pointer" onClick={() => navigate(`/admin/equipements/${eq.id}`)}>
                <div className="relative">
                  <img src={eq.photo_url || catImages[eq.categorie] || catImages.Son} alt={eq.nom} className="w-full h-36 object-cover" />
                  <div className="absolute top-2 left-2">
                    <span className="badge bg-dark-900/80 text-gold-400 border border-gold-500/30 text-xs">{eq.categorie}</span>
                  </div>
                  <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${(dispoColor as any)[eq.disponibilite] || 'bg-gray-400'}`} />
                </div>
                <div className="p-4">
                  <h3 className="text-white font-semibold text-sm mb-1">{eq.nom}</h3>
                  <p className="text-dark-400 text-xs mb-2">{eq.reference} · {eq.localisation}</p>
                  <div className="flex items-center justify-between">
                    <StatusBadge status={eq.etat} />
                    <span className="text-gold-400 font-bold text-sm">{formatPrice(eq.prix_location)}/j</span>
                  </div>
                  {(() => { const n = roiNights(eq); return n !== null ? (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-dark-400">
                      <TrendingUp size={12} className="text-gold-500" />
                      <span><b className="text-white">{n}</b> {n > 1 ? 'nuits' : 'nuit'} pour amortir {formatPrice(eq.prix_achat, 0)}</span>
                    </div>
                  ) : null; })()}
                  <div className="flex gap-1.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setEditing(eq); setForm({ ...eq, prix_location: String(eq.prix_location), prix_achat: String(eq.prix_achat) }); setShowModal(true); }}
                      className="flex-1 text-xs glass py-1.5 px-2 rounded-lg text-dark-300 hover:text-white flex items-center justify-center gap-1"><Edit2 size={11} />Modifier</button>
                    <button onClick={() => handleDelete(eq.id)} className="text-xs p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-white/10">
                {['Nom','Catégorie','Référence','État','Dispo','Localisation','Prix/j','ROI',''].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 text-dark-400 text-xs font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map(eq => (
                  <tr key={eq.id} className="border-b border-white/5 hover:bg-white/3 cursor-pointer" onClick={() => navigate(`/admin/equipements/${eq.id}`)}>
                    <td className="px-4 py-3.5 text-white font-medium text-sm">{eq.nom}</td>
                    <td className="px-4 py-3.5"><span className="badge bg-dark-700 text-dark-300 text-xs">{eq.categorie}</span></td>
                    <td className="px-4 py-3.5 text-dark-400 font-mono text-xs">{eq.reference || '–'}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={eq.etat} /></td>
                    <td className="px-4 py-3.5"><StatusBadge status={eq.disponibilite} /></td>
                    <td className="px-4 py-3.5 text-dark-300 text-sm">{eq.localisation}</td>
                    <td className="px-4 py-3.5 text-gold-400 font-bold">{formatPrice(eq.prix_location)}</td>
                    <td className="px-4 py-3.5">{(() => { const n = roiNights(eq); return n !== null ? (
                      <span className="text-dark-300 text-xs flex items-center gap-1"><TrendingUp size={12} className="text-gold-500" />{n} {n > 1 ? 'nuits' : 'nuit'}</span>
                    ) : <span className="text-dark-500 text-xs">–</span>; })()}</td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditing(eq); setForm({ ...eq, prix_location: String(eq.prix_location), prix_achat: String(eq.prix_achat) }); setShowModal(true); }}
                          className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 transition-all"><Edit2 size={13} /></button>
                        <button onClick={() => handleDelete(eq.id)} className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto z-10 p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editing ? 'Modifier l\'équipement' : 'Nouvel équipement'}</h2>
              <button onClick={() => setShowModal(false)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Nom *</label>
                <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} className="input-field" placeholder="Enceinte JBL EON 615" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Catégorie</label>
                <select value={form.categorie} onChange={e => setForm(p => ({ ...p, categorie: e.target.value }))} className="input-field">
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Référence</label>
                <input value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} className="input-field" placeholder="SPE-001" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">État</label>
                <select value={form.etat} onChange={e => setForm(p => ({ ...p, etat: e.target.value }))} className="input-field">
                  {etatOptions.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Disponibilité</label>
                <select value={form.disponibilite} onChange={e => setForm(p => ({ ...p, disponibilite: e.target.value }))} className="input-field">
                  {dispoOptions.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Prix location (DT/j)</label>
                <input type="number" value={form.prix_location} onChange={e => setForm(p => ({ ...p, prix_location: e.target.value }))} className="input-field" placeholder="50" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Prix achat (DT)</label>
                <input type="number" value={form.prix_achat} onChange={e => setForm(p => ({ ...p, prix_achat: e.target.value }))} className="input-field" placeholder="1200" />
              </div>
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Localisation</label>
                <input value={form.localisation} onChange={e => setForm(p => ({ ...p, localisation: e.target.value }))} className="input-field" placeholder="Entrepôt A" />
              </div>
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="input-field resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-ghost flex-1 py-2.5">Annuler</button>
              <button onClick={handleSave} disabled={!form.nom || saving} className="btn-gold flex-1 py-2.5 disabled:opacity-60">
                {saving ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
