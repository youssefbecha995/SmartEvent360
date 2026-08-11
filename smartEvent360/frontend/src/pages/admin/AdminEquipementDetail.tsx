import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Wrench, CalendarDays } from 'lucide-react';
import { crmApi } from '@/lib/crmApi';
import { eventsApi } from '@/lib/neonApi';
import { formatPrice, nightsToBreakEven } from '@/lib/format';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

const categories = ['Son', 'Lumiere', 'Video', 'Scene', 'Decoration', 'Autre'];
const etatOptions = ['neuf', 'bon', 'moyen', 'a_reparer'];
const dispoOptions = ['disponible', 'reserve', 'en_reparation', 'indisponible'];

export default function AdminEquipementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<any | null>(null);
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [personnelList, setPersonnelList] = useState<any[]>([]);
  const [newMaint, setNewMaint] = useState({ date_maintenance: '', type: 'preventive', description: '', cout: '', personnel_id: '' });
  const [showMaintForm, setShowMaintForm] = useState(false);

  const [reservations, setReservations] = useState<any[]>([]);
  const [eventNames, setEventNames] = useState<Record<string, string>>({});

  const load = async () => {
    if (!id) return;
    try {
      const [eq, mt, pl, rs] = await Promise.all([
        crmApi.get('equipment', id),
        crmApi.list('maintenance'),
        crmApi.list('personnel'),
        crmApi.list('event_equipment'),
      ]);
      setEquipment(eq);
      setForm(eq);
      setMaintenance(mt.filter((m: any) => m.equipment_id === id).sort((a: any, b: any) => new Date(b.date_maintenance || 0).getTime() - new Date(a.date_maintenance || 0).getTime()));
      setPersonnelList(pl);
      setReservations(rs.filter((r: any) => r.equipment_id === id));
    } catch (e) {
      console.warn('[AdminEquipementDetail] échec du chargement:', e);
    } finally {
      setLoading(false);
    }
    try {
      const ev = await eventsApi.list({ limit: 100 });
      setEventNames(Object.fromEntries(ev.data.map((e: any) => [e.id, e.title])));
    } catch { /* silencieux */ }
  };

  useEffect(() => { load(); }, [id]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await crmApi.update('equipment', id!, {
        nom: form.nom, categorie: form.categorie, reference: form.reference, description: form.description,
        prix_location: parseFloat(form.prix_location) || 0, prix_achat: parseFloat(form.prix_achat) || 0,
        etat: form.etat, disponibilite: form.disponibilite, localisation: form.localisation,
      });
      setEquipment(form);
      setMessage('Équipement mis à jour ✓');
    } catch (e) {
      console.error('[AdminEquipementDetail] échec de la sauvegarde:', e);
      setMessage('Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
    setTimeout(() => setMessage(''), 2500);
  };

  const addMaintenance = async () => {
    if (!newMaint.date_maintenance || !id) return;
    const payload = {
      equipment_id: id,
      date_maintenance: newMaint.date_maintenance,
      type: newMaint.type,
      description: newMaint.description || null,
      cout: newMaint.cout ? parseFloat(newMaint.cout) : 0,
      personnel_id: newMaint.personnel_id || null,
      statut: 'planifie',
    };
    try {
      const data = await crmApi.create('maintenance', payload);
      const tech = personnelList.find((p: any) => p.id === payload.personnel_id);
      setMaintenance(prev => [{ ...data, personnel: tech || null }, ...prev]);
    } catch (e) {
      console.error('[AdminEquipementDetail] échec maintenance:', e);
    }
    setNewMaint({ date_maintenance: '', type: 'preventive', description: '', cout: '', personnel_id: '' });
    setShowMaintForm(false);
  };

  const updateMaintStatus = async (mid: string, statut: string) => {
    try {
      await crmApi.update('maintenance', mid, { statut });
      setMaintenance(prev => prev.map(m => m.id === mid ? { ...m, statut } : m));
    } catch (e) {
      console.error('[AdminEquipementDetail] échec statut maintenance:', e);
    }
  };

  const removeMaintenance = async (mid: string) => {
    try {
      await crmApi.delete('maintenance', mid);
      setMaintenance(prev => prev.filter(m => m.id !== mid));
    } catch (e) {
      console.error('[AdminEquipementDetail] échec suppression maintenance:', e);
    }
  };

  if (loading || !form) return <div className="glass rounded-2xl h-64 animate-pulse" />;
  if (!equipment) return <div className="text-dark-400">Équipement introuvable.</div>;

  return (
    <div>
      <button onClick={() => navigate('/admin/equipements')} className="flex items-center gap-1.5 text-dark-400 hover:text-white text-sm mb-4">
        <ArrowLeft size={15} /> Retour aux équipements
      </button>

      <PageHeader
        title={equipment.nom}
        subtitle={`${equipment.reference || ''} · ${equipment.localisation || ''}`}
        action={<div className="flex gap-2"><StatusBadge status={equipment.etat} /><StatusBadge status={equipment.disponibilite} /></div>}
      />

      {message && <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-xl px-4 py-2.5">{message}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="kpi-card"><p className="text-dark-400 text-xs mb-1">Prix location</p><p className="text-2xl font-bold text-gold-400">{formatPrice(equipment.prix_location)}<span className="text-sm text-dark-400">/jour</span></p></div>
        <div className="kpi-card"><p className="text-dark-400 text-xs mb-1">Prix d'achat</p><p className="text-2xl font-bold text-white">{formatPrice(equipment.prix_achat, 0)}</p></div>
        <div className="kpi-card">{(() => { const n = nightsToBreakEven(equipment.prix_achat, equipment.prix_location); return n !== null ? (<><p className="text-dark-400 text-xs mb-1">Rentabilité (ROI)</p><p className="text-2xl font-bold text-green-400">{n} <span className="text-sm text-dark-400">nuits pour amortir</span></p></>) : (<><p className="text-dark-400 text-xs mb-1">Rentabilité (ROI)</p><p className="text-xl font-bold text-dark-400">Renseigner achat + location</p></>); })()}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6 space-y-4 h-fit">
          <h3 className="text-white font-semibold text-sm mb-1">Spécifications</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-dark-300 text-sm mb-1.5 block">Nom</label>
              <input value={form.nom} onChange={e => setForm((p: any) => ({ ...p, nom: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Catégorie</label>
              <select value={form.categorie} onChange={e => setForm((p: any) => ({ ...p, categorie: e.target.value }))} className="input-field">
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Référence</label>
              <input value={form.reference || ''} onChange={e => setForm((p: any) => ({ ...p, reference: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">État</label>
              <select value={form.etat} onChange={e => setForm((p: any) => ({ ...p, etat: e.target.value }))} className="input-field">
                {etatOptions.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Disponibilité</label>
              <select value={form.disponibilite} onChange={e => setForm((p: any) => ({ ...p, disponibilite: e.target.value }))} className="input-field">
                {dispoOptions.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Prix location (DT/j)</label>
              <input type="number" value={form.prix_location} onChange={e => setForm((p: any) => ({ ...p, prix_location: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Prix achat (DT)</label>
              <input type="number" value={form.prix_achat} onChange={e => setForm((p: any) => ({ ...p, prix_achat: e.target.value }))} className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="text-dark-300 text-sm mb-1.5 block">Localisation</label>
              <input value={form.localisation || ''} onChange={e => setForm((p: any) => ({ ...p, localisation: e.target.value }))} className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="text-dark-300 text-sm mb-1.5 block">Description</label>
              <textarea value={form.description || ''} onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))} rows={2} className="input-field resize-none" />
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-gold py-2.5 px-6 flex items-center gap-2 disabled:opacity-60">
            <Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2"><Wrench size={15} /> Historique de maintenance</h3>
              <button onClick={() => setShowMaintForm(v => !v)} className="text-gold-400 hover:text-gold-300 text-xs flex items-center gap-1"><Plus size={13} /> Planifier</button>
            </div>

            {showMaintForm && (
              <div className="bg-dark-700 rounded-xl p-4 mb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={newMaint.date_maintenance} onChange={e => setNewMaint(p => ({ ...p, date_maintenance: e.target.value }))} className="input-field text-sm" />
                  <select value={newMaint.type} onChange={e => setNewMaint(p => ({ ...p, type: e.target.value }))} className="input-field text-sm">
                    <option value="preventive">Préventive</option>
                    <option value="corrective">Corrective</option>
                  </select>
                  <select value={newMaint.personnel_id} onChange={e => setNewMaint(p => ({ ...p, personnel_id: e.target.value }))} className="input-field text-sm col-span-2">
                    <option value="">Technicien (optionnel)</option>
                    {personnelList.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
                  </select>
                  <input type="number" placeholder="Coût (DT)" value={newMaint.cout} onChange={e => setNewMaint(p => ({ ...p, cout: e.target.value }))} className="input-field text-sm col-span-2" />
                  <textarea placeholder="Description" value={newMaint.description} onChange={e => setNewMaint(p => ({ ...p, description: e.target.value }))} rows={2} className="input-field text-sm resize-none col-span-2" />
                </div>
                <button onClick={addMaintenance} disabled={!newMaint.date_maintenance} className="btn-gold w-full py-2 text-sm disabled:opacity-60">Enregistrer</button>
              </div>
            )}

            {maintenance.length === 0 ? (
              <p className="text-dark-400 text-sm text-center py-6">Aucune maintenance enregistrée.</p>
            ) : (
              <div className="space-y-2">
                {maintenance.map(m => (
                  <div key={m.id} className="bg-dark-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium">{new Date(m.date_maintenance).toLocaleDateString('fr-FR')} · <span className="capitalize">{m.type}</span></p>
                      <p className="text-dark-400 text-xs truncate">{m.description || '–'} {m.personnel ? `· ${m.personnel.prenom} ${m.personnel.nom}` : ''} {m.cout ? `· ${formatPrice(m.cout)}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select value={m.statut} onChange={e => updateMaintStatus(m.id, e.target.value)} className="bg-dark-600 border border-dark-500 rounded-lg px-2 py-1 text-xs text-dark-200 focus:outline-none focus:border-gold-500">
                        <option value="planifie">Planifié</option>
                        <option value="en_cours">En cours</option>
                        <option value="termine">Terminé</option>
                      </select>
                      <button onClick={() => removeMaintenance(m.id)} className="text-dark-500 hover:text-red-400 p-1"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-4"><CalendarDays size={15} /> Réservations</h3>
            {reservations.length === 0 ? (
              <p className="text-dark-400 text-sm text-center py-6">Aucune réservation pour cet équipement.</p>
            ) : (
              <div className="space-y-2">
                {reservations.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-dark-700 rounded-xl px-4 py-3 cursor-pointer hover:ring-1 hover:ring-gold-500/30"
                    onClick={() => r.event_id && navigate(`/admin/evenements/${r.event_id}`)}>
                    <div>
                      <p className="text-white text-sm font-medium">{eventNames[r.event_id] || 'Événement'}</p>
                      <p className="text-dark-400 text-xs">Qté {r.quantite}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
