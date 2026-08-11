import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import { crmApi } from '@/lib/crmApi';
import { formatPrice } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

const fonctions = ['Technicien Son', 'Technicien Lumière', 'DJ', 'Photographe', 'Vidéaste', 'Scénographe', 'Assistante de Production', 'Technicien Vidéo', 'Coordinateur'];
const dispoOptions = ['disponible','mission','conges','absent'];
const types = ['interne','externe'];
const paiementModes = ['salaire','jour','2jours'];

export default function AdminPersonnel() {
  const { t } = useI18n();
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'cartes'|'table'>('cartes');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', email2: '', telephone: '', adresse: '', code_postal: '',
    type: 'interne', fonction: 'Technicien Son', disponibilite: 'disponible', mode_paiement: 'salaire', salaire: '', notes: '',
  });

  const load = async () => {
    try {
      const data = await crmApi.list('personnel');
      data.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
      setPersonnel(data);
    } catch (e) {
      console.warn('[AdminPersonnel] échec du chargement API:', e);
      setPersonnel([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ nom: '', prenom: '', email: '', email2: '', telephone: '', adresse: '', code_postal: '', type: 'interne', fonction: 'Technicien Son', disponibilite: 'disponible', mode_paiement: 'salaire', salaire: '', notes: '' });
    setShowModal(true);
  };
  const openEdit = (p: any) => {
    setEditing(p);
    setForm({ ...p, salaire: String(p.salaire || '') });
    setShowModal(true);
  };

  const paiementLabel = (p: any) => {
    if (!p.salaire) return '–';
    switch (p.mode_paiement) {
      case 'jour': return `${formatPrice(p.salaire)}/jour`;
      case '2jours': return `${formatPrice(p.salaire)}/2 jours`;
      default: return `${formatPrice(p.salaire)}/mois`;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, salaire: form.salaire ? parseFloat(form.salaire) : null };
    try {
      if (editing) await crmApi.update('personnel', editing.id, payload);
      else await crmApi.create('personnel', payload);
      setShowModal(false);
      load();
    } catch (e) {
      console.error('[AdminPersonnel] échec de la sauvegarde:', e);
      alert(t('Erreur') + ' : sauvegarde impossible (backend ?).');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('Supprimer cet employé ?'))) return;
    try {
      await crmApi.delete('personnel', id);
      setPersonnel(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error('[AdminPersonnel] échec de la suppression:', e);
      alert(t('Erreur') + ' : suppression impossible.');
    }
  };

  const handleDispo = async (id: string, dispo: string) => {
    try {
      await crmApi.update('personnel', id, { disponibilite: dispo });
      setPersonnel(prev => prev.map(p => p.id === id ? { ...p, disponibilite: dispo } : p));
    } catch (e) {
      console.error('[AdminPersonnel] échec mise à jour dispo:', e);
    }
  };

  const filtered = personnel.filter(p => `${p.nom} ${p.prenom} ${p.fonction}`.toLowerCase().includes(search.toLowerCase()));

  const dispoColor = { disponible: 'bg-green-400', mission: 'bg-blue-400', conges: 'bg-yellow-400', absent: 'bg-red-400' };

  return (
    <div>
      <PageHeader title={t('Gestion du Personnel')} subtitle={`${personnel.length} ${t('employés')}`}
        action={<button onClick={openCreate} className="btn-gold py-2 px-4 text-sm flex items-center gap-2"><Plus size={15} />{t('Ajouter')}</button>} />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2.5 text-sm w-60" placeholder="Rechercher..." />
        </div>
        <div className="flex gap-1.5">
          {(['cartes','table'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${view === v ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white'}`}>{v}</button>
          ))}
        </div>
      </div>

      {view === 'cartes' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? Array(8).fill(0).map((_, i) => <div key={i} className="glass rounded-2xl h-44 animate-pulse" />) :
            filtered.map(p => (
              <div key={p.id} className="glass rounded-2xl p-5 group hover:border-gold-500/30 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center text-sm font-bold text-gold-400">
                        {p.prenom.charAt(0)}{p.nom.charAt(0)}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-dark-800 ${(dispoColor as any)[p.disponibilite] || 'bg-gray-400'}`} />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{p.prenom} {p.nom}</p>
                      <p className="text-dark-400 text-xs">{p.fonction}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(p)} className="p-1 text-dark-400 hover:text-white"><Edit2 size={13} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1 text-dark-400 hover:text-red-400"><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <span className={`badge text-[10px] px-2 py-0.5 ${p.type === 'externe' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}`}>
                    {p.type === 'externe' ? t('Externe') : t('Interne')}
                  </span>
                  {p.mode_paiement && p.mode_paiement !== 'salaire' && (
                    <span className="badge bg-gold-500/10 text-gold-400 border border-gold-500/30 text-[10px] px-2 py-0.5">
                      {p.mode_paiement === 'jour' ? 'Jour' : '2 jours'}
                    </span>
                  )}
                </div>
                {p.telephone && <p className="text-dark-400 text-xs mb-0.5">{p.telephone}</p>}
                {p.adresse && <p className="text-dark-500 text-xs mb-0.5">{p.adresse}{p.code_postal ? ` · ${p.code_postal}` : ''}</p>}
                {paiementLabel(p) !== '–' && <p className="text-gold-400 text-xs font-semibold mb-2">{paiementLabel(p)}</p>}
                {p.specialites?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.specialites.slice(0, 3).map((s: string) => <span key={s} className="badge bg-dark-700 text-dark-300 text-xs">{s}</span>)}
                  </div>
                )}
                <select value={p.disponibilite} onChange={e => handleDispo(p.id, e.target.value)}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-1.5 text-xs text-dark-300 focus:outline-none focus:border-gold-500">
                  {dispoOptions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            ))
          }
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-white/10">
                {['Type', 'Nom', 'Fonction', 'Email', 'Téléphone', 'Disponibilité', 'Rémunération', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 text-dark-400 text-xs font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/3">
                    <td className="px-4 py-3.5">
                      <span className={`badge text-[10px] px-2 py-0.5 ${p.type === 'externe' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}`}>
                        {p.type === 'externe' ? t('Externe') : t('Interne')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-white font-medium">{p.prenom} {p.nom}</td>
                    <td className="px-4 py-3.5 text-dark-300 text-sm">{p.fonction}</td>
                    <td className="px-4 py-3.5 text-dark-300 text-sm">{p.email}</td>
                    <td className="px-4 py-3.5 text-dark-300 text-sm">{p.telephone || '–'}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={p.disponibilite} /></td>
                    <td className="px-4 py-3.5 text-dark-300 text-sm">{paiementLabel(p)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 transition-all"><Edit2 size={13} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13} /></button>
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
              <h2 className="text-xl font-bold text-white">{editing ? t('Modifier l\'employé') : t('Nouvel employé')}</h2>
              <button onClick={() => setShowModal(false)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[['nom','Nom *'],['prenom','Prénom *']].map(([k,l]) => (
                <div key={k}>
                  <label className="text-dark-300 text-sm mb-1.5 block">{l}</label>
                  <input value={(form as any)[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} className="input-field" placeholder={l.replace(' *','')} />
                </div>
              ))}
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">{t('Type')}</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="input-field">
                  {types.map(ty => <option key={ty} value={ty}>{ty === 'interne' ? t('Interne') : t('Externe')}</option>)}
                </select>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Fonction</label>
                <select value={form.fonction} onChange={e => setForm(p => ({ ...p, fonction: e.target.value }))} className="input-field">
                  {fonctions.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              {[['email','Email *'],['email2', t('2e email')]].map(([k,l]) => (
                <div key={k}>
                  <label className="text-dark-300 text-sm mb-1.5 block">{l}</label>
                  <input type="email" value={(form as any)[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} className="input-field" placeholder={l.replace(' *','')} />
                </div>
              ))}
              {[['telephone','Téléphone'],['code_postal', t('Code postal')]].map(([k,l]) => (
                <div key={k}>
                  <label className="text-dark-300 text-sm mb-1.5 block">{l}</label>
                  <input value={(form as any)[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} className="input-field" placeholder={l} />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">{t('Adresse')}</label>
                <input value={form.adresse} onChange={e => setForm(p => ({ ...p, adresse: e.target.value }))} className="input-field" placeholder={t('Adresse')} />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Disponibilité</label>
                <select value={form.disponibilite} onChange={e => setForm(p => ({ ...p, disponibilite: e.target.value }))} className="input-field">
                  {dispoOptions.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Mode de paiement</label>
                <select value={form.mode_paiement} onChange={e => setForm(p => ({ ...p, mode_paiement: e.target.value }))} className="input-field">
                  <option value="salaire">Salaire (mensuel)</option>
                  <option value="jour">Paiement par jour</option>
                  <option value="2jours">Paiement par 2 jours</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Montant (DT)</label>
                <input type="number" value={form.salaire} onChange={e => setForm(p => ({ ...p, salaire: e.target.value }))} className="input-field" placeholder="1500" />
              </div>
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">{t('Notes')}</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="input-field resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-ghost flex-1 py-2.5">{t('Annuler')}</button>
              <button onClick={handleSave} disabled={!form.nom || saving} className="btn-gold flex-1 py-2.5 disabled:opacity-60">
                {saving ? t('Sauvegarde...') : t('Enregistrer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
