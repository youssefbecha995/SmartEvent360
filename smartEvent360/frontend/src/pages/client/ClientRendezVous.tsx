import { useEffect, useState } from 'react';
import { Calendar, Plus, X, Check, Clock, FileText, Wrench, MessageCircle, ChevronLeft, ChevronRight, UserCheck, CalendarDays, MapPin } from 'lucide-react';
import { clientApi } from '@/lib/neonApi';
import { useAuth } from '@/contexts/AuthContext';
import { useClientRecord } from '@/hooks/useClientRecord';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

const types = [
  { key: 'devis', label: 'Devis Conseil', desc: 'Choix du pack', icon: FileText },
  { key: 'evenement', label: 'Événement', desc: 'Planification', icon: CalendarDays },
  { key: 'technique', label: 'Technique', desc: 'Configuration', icon: Wrench },
  { key: 'autre', label: 'Autre', desc: 'Divers', icon: MessageCircle },
] as const;

const typeLabel = (k: string) => types.find(t => t.key === k)?.label || 'Rendez-vous';

export default function ClientRendezVous() {
  const { user } = useAuth();
  const { client } = useClientRecord();
  const { success } = useToast();
  const [rdvs, setRdvs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    type_rdv: 'technique' as string,
    date_heure: '', lieu: 'Visioconférence', duree_minutes: 30, description: '', telephone: '',
  });
  const [saving, setSaving] = useState(false);

  const contactName = client?.prenom || user?.email?.split('@')[0] || '';
  const contactEmail = client?.email || user?.email || '';
  const contactPhone = form.telephone || client?.telephone || '';
  const needsPhone = !client?.telephone;

  const load = () => {
    clientApi.appointments()
      .then(data => { setRdvs(data || []); setLoading(false); })
      .catch(() => { setRdvs([]); setLoading(false); });
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = () => {
    setStep(0);
    setForm({ type_rdv: 'technique', date_heure: '', lieu: 'Visioconférence', duree_minutes: 30, description: '', telephone: client?.telephone || '' });
    setShowModal(true);
  };

  const closeModal = () => { if (!saving) setShowModal(false); };

  const canNext = () => {
    if (step === 0) return true;
    if (step === 1) return !!form.date_heure;
    if (step === 2) return true;
    if (step === 3) return !needsPhone || !!form.telephone.trim();
    return false;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await clientApi.createAppointment({
        type_rdv: form.type_rdv,
        titre: `${typeLabel(form.type_rdv)} — ${contactName}`,
        date_heure: form.date_heure,
        lieu: form.lieu,
        duree_minutes: form.duree_minutes,
        description: form.description || null,
        email: contactEmail,
        telephone: contactPhone || null,
        statut: 'planifie',
      });
      setSaving(false);
      setShowModal(false);
      success('Rendez-vous planifié', 'Notre équipe vous confirmera rapidement le créneau.');
      setForm({ type_rdv: 'technique', date_heure: '', lieu: 'Visioconférence', duree_minutes: 30, description: '', telephone: '' });
      load();
    } catch {
      setSaving(false);
    }
  };

  const handleCancel = async (id: string) => {
    await clientApi.updateAppointment(id, { statut: 'annule' }).catch(() => null);
    setRdvs(prev => prev.map(r => r.id === id ? { ...r, statut: 'annule' } : r));
  };

  const [reschedule, setReschedule] = useState<any | null>(null);
  const [newDate, setNewDate] = useState('');
  const [motif, setMotif] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  const openReschedule = (rdv: any) => {
    setReschedule(rdv);
    setNewDate(rdv.date_heure?.slice(0, 16) || '');
    setMotif('');
  };

  const handleReschedule = async () => {
    if (!reschedule || !newDate) return;
    setRescheduling(true);
    const note = motif ? `${reschedule.notes ? reschedule.notes + '\n' : ''}Reporté : ${motif}` : reschedule.notes;
    await clientApi.updateAppointment(reschedule.id, { statut: 'reporte', date_heure: newDate, notes: note }).catch(() => null);
    setRdvs(prev => prev.map(r => r.id === reschedule.id ? { ...r, statut: 'reporte', date_heure: newDate, notes: note } : r));
    setRescheduling(false);
    setReschedule(null);
  };

  const statusIcon: Record<string, React.ReactNode> = {
    planifie: <Clock size={16} className="text-blue-400" />,
    confirme: <Check size={16} className="text-green-400" />,
    reporte: <Clock size={16} className="text-yellow-400" />,
    annule: <X size={16} className="text-red-400" />,
    termine: <Check size={16} className="text-dark-400" />,
  };

  const steps = ['Service', 'Date & heure', 'Remarques', 'Récapitulatif'];

  return (
    <div>
      <PageHeader title="Mes Rendez-vous" subtitle={`${rdvs.length} rendez-vous`}
        action={<button onClick={openModal} className="btn-gold py-2 px-4 text-sm flex items-center gap-2"><Plus size={15} />Planifier</button>} />

      {loading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-20 animate-pulse" />)}</div>
      ) : rdvs.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Calendar size={40} className="mx-auto mb-3 text-dark-600" />
          <p className="text-dark-400">Aucun rendez-vous programmé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rdvs.map((rdv) => (
            <div key={rdv.id} className="glass rounded-xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gold-500/20 flex items-center justify-center flex-shrink-0 text-gold-500">
                {statusIcon[rdv.statut] || <Calendar size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-white font-semibold leading-tight">{rdv.titre}</h3>
                  <StatusBadge status={rdv.statut} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-400 mb-3">
                  <span>📅 {new Date(rdv.date_heure).toLocaleDateString('fr-FR')} à {new Date(rdv.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>📍 {rdv.lieu}</span>
                  <span>⏱ {rdv.duree_minutes} min</span>
                </div>
                {rdv.statut === 'planifie' && (
                  <p className="text-xs text-yellow-400/80 flex items-center gap-1 mb-2">
                    <Clock size={12} /> En attente de confirmation par notre équipe
                  </p>
                )}
                {(rdv.statut === 'planifie' || rdv.statut === 'reporte') && (
                  <div className="flex gap-2">
                    <button onClick={() => openReschedule(rdv)} className="text-xs border border-white/20 text-dark-200 hover:bg-white/10 py-1.5 px-3 rounded-lg transition-all flex items-center gap-1">
                      <Clock size={12} /> Reporter
                    </button>
                    <button onClick={() => handleCancel(rdv.id)} className="text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 py-1.5 px-3 rounded-lg transition-all flex items-center gap-1">
                      <X size={12} /> Annuler
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Nouveau rendez-vous (parcours en étapes) ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-md w-full z-10 p-7 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white">Nouveau rendez-vous</h2>
              <button onClick={closeModal} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-1 mb-6">
              {steps.map((s, i) => (
                <div key={s} className="flex-1">
                  <div className={`h-1 rounded-full ${i <= step ? 'bg-gold-500' : 'bg-dark-700'}`} />
                  <p className={`text-[10px] mt-1 ${i === step ? 'text-gold-400' : 'text-dark-500'}`}>{s}</p>
                </div>
              ))}
            </div>

            {/* Step 0 : Service */}
            {step === 0 && (
              <div className="space-y-2.5">
                <label className="text-dark-300 text-sm mb-1 block">Quel est le motif du rendez-vous ?</label>
                {types.map(t => (
                  <button key={t.key} onClick={() => setForm(p => ({ ...p, type_rdv: t.key }))}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${form.type_rdv === t.key ? 'border-gold-500 bg-gold-500/10' : 'border-dark-600 hover:border-dark-500'}`}>
                    <t.icon size={18} className={form.type_rdv === t.key ? 'text-gold-400' : 'text-dark-400'} />
                    <span>
                      <span className={`block text-sm font-medium ${form.type_rdv === t.key ? 'text-gold-400' : 'text-white'}`}>{t.label}</span>
                      <span className="text-dark-500 text-xs">{t.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Step 1 : Date & heure */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Date & Heure *</label>
                  <input type="datetime-local" value={form.date_heure} onChange={e => setForm(p => ({ ...p, date_heure: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Durée (min)</label>
                  <select value={form.duree_minutes} onChange={e => setForm(p => ({ ...p, duree_minutes: parseInt(e.target.value) }))} className="input-field">
                    {[15, 30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Lieu</label>
                  <select value={form.lieu} onChange={e => setForm(p => ({ ...p, lieu: e.target.value }))} className="input-field">
                    <option>Visioconférence</option>
                    <option>Agence SmartEvent360</option>
                    <option>Téléphonique</option>
                    <option>Sur site</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 2 : Remarques */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Remarques / sujet du rendez-vous</label>
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={4} className="input-field resize-none" placeholder="Parlez-nous de votre projet, de vos questions..." />
                </div>
              </div>
            )}

            {/* Step 3 : Récapitulatif */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-dark-700/50 border border-green-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-400 text-xs font-medium mb-2">
                    <UserCheck size={15} /> Coordonnées récupérées depuis votre profil
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-dark-400">Nom :</span><span className="text-white">{contactName}</span></div>
                    <div className="flex justify-between"><span className="text-dark-400">Email :</span><span className="text-white">{contactEmail}</span></div>
                    {contactPhone && <div className="flex justify-between"><span className="text-dark-400">Téléphone :</span><span className="text-white">{contactPhone}</span></div>}
                  </div>
                </div>

                {needsPhone && (
                  <div>
                    <label className="text-dark-300 text-sm mb-1.5 block">Téléphone (manquant dans votre profil) *</label>
                    <input value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} className="input-field" placeholder="06 12 34 56 78" />
                  </div>
                )}

                <div className="bg-dark-700 rounded-xl p-4 space-y-1.5 text-sm">
                  <p className="text-white font-medium mb-1">📋 Récapitulatif</p>
                  <p className="text-dark-300">Service : <span className="text-white">{typeLabel(form.type_rdv)}</span></p>
                  <p className="text-dark-300">Date : <span className="text-white">{form.date_heure ? new Date(form.date_heure).toLocaleDateString('fr-FR') + ' à ' + new Date(form.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '–'}</span></p>
                  <p className="text-dark-300">Durée : <span className="text-white">{form.duree_minutes} min</span></p>
                  <p className="text-dark-300">Lieu : <span className="text-white">{form.lieu}</span></p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(p => p - 1)} disabled={step === 0} className="flex items-center gap-1.5 btn-ghost disabled:opacity-40 py-2.5 px-4 text-sm">
                <ChevronLeft size={15} /> Précédent
              </button>
              {step < 3 ? (
                <button onClick={() => setStep(p => p + 1)} disabled={!canNext()} className="flex items-center gap-1.5 btn-gold disabled:opacity-40 py-2.5 px-5 text-sm">
                  Suivant <ChevronRight size={15} />
                </button>
              ) : (
                <button onClick={handleSave} disabled={saving || !canNext()} className="btn-gold py-2.5 px-5 text-sm disabled:opacity-60">
                  {saving ? 'Enregistrement...' : 'Confirmer la réservation'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {reschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setReschedule(null)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-md w-full z-10 p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Reporter le rendez-vous</h2>
              <button onClick={() => setReschedule(null)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="bg-dark-700 rounded-xl p-4 mb-4 text-sm">
              <p className="text-white font-medium">{reschedule.titre}</p>
              <p className="text-dark-400">Actuellement : {new Date(reschedule.date_heure).toLocaleDateString('fr-FR')} à {new Date(reschedule.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Nouvelle date & heure *</label>
                <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Motif du report</label>
                <textarea value={motif} onChange={e => setMotif(e.target.value)} rows={2} className="input-field resize-none" placeholder="Optionnel..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setReschedule(null)} className="btn-ghost flex-1 py-2.5">Annuler</button>
              <button onClick={handleReschedule} disabled={!newDate || rescheduling} className="btn-gold flex-1 py-2.5 disabled:opacity-60">
                {rescheduling ? 'Enregistrement...' : 'Confirmer le report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
