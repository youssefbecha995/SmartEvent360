import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, FileText, CalendarDays, Wrench, MessageCircle, Clock, MapPin, UserCheck } from 'lucide-react';
import { publicApi, clientApi } from '@/lib/neonApi';
import { useAuth } from '@/contexts/AuthContext';
import { useClientRecord } from '@/hooks/useClientRecord';

const types = [
  { key: 'devis', label: 'Devis Conseil', desc: 'Choix du pack', icon: FileText },
  { key: 'evenement', label: 'Événement', desc: 'Planification', icon: CalendarDays },
  { key: 'technique', label: 'Technique', desc: 'Configuration', icon: Wrench },
  { key: 'autre', label: 'Autre', desc: 'Divers', icon: MessageCircle },
] as const;

const lieux = ['Visioconférence (Zoom)', 'En agence — 12 Avenue des Lumières, 75001 Paris', 'Téléphone'];
const slotHours = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

function nextBusinessDays(count: number) {
  const days: Date[] = [];
  const d = new Date();
  d.setDate(d.getDate() + 1); // minimum 24h notice
  while (days.length < count) {
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export default function RdvPage() {
  const { user, token } = useAuth();
  const { client } = useClientRecord();
  const isConnected = !!token;

  const days = useMemo(() => nextBusinessDays(9), []);
  const [type, setType] = useState<typeof types[number]['key']>('technique');
  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [selectedHour, setSelectedHour] = useState('');
  const [lieu, setLieu] = useState(lieux[0]);
  const [form, setForm] = useState({ civilite: 'M.', nom: '', prenom: '', email: '', telephone: '', message: '' });
  const [accept, setAccept] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // Préremplissage automatique depuis le profil du client connecté (une seule fois)
  const prefilled = useRef(false);
  useEffect(() => {
    if (!isConnected || !client || prefilled.current) return;
    prefilled.current = true;
    const prenom = client.prenom || user?.email?.split('@')[0] || '';
    setForm(p => ({
      ...p,
      civilite: client.civilite || 'M.',
      prenom: prenom || p.prenom,
      nom: client.nom || p.nom,
      email: client.email || user?.email || p.email,
      telephone: client.telephone || p.telephone,
    }));
  }, [isConnected, client, user]);

  // Deterministic pseudo-availability so the slot grid doesn't feel arbitrary
  const isAvailable = (day: Date, hour: string) => {
    const seed = day.getDate() + parseInt(hour.split(':')[0]);
    return seed % 4 !== 0;
  };

  const contactName = `${form.civilite} ${form.prenom} ${form.nom}`.trim();
  const coordsOk = isConnected || (form.nom.trim().length >= 2 && form.prenom.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email));
  const canSubmit = coordsOk && !!selectedHour && accept;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    const dateStr = selectedDay.toISOString().slice(0, 10);
    const typeLabel = types.find(t => t.key === type)?.label || '';
    const duree = type === 'technique' ? 45 : 30;
    try {
      if (isConnected) {
        // RDV lié au compte client → visible dans « Mes Rendez-vous »
        await clientApi.createAppointment({
          type_rdv: type,
          titre: `${typeLabel} — ${contactName}`,
          date_heure: `${dateStr}T${selectedHour}:00`,
          duree_minutes: duree,
          lieu,
          description: form.message || null,
          email: form.email,
          telephone: form.telephone || null,
          statut: 'planifie',
        });
      } else {
        await publicApi.submit('appointment_requests', {
          type_rdv: type,
          civilite: form.civilite,
          nom: form.nom,
          prenom: form.prenom,
          email: form.email,
          telephone: form.telephone || null,
          date_souhaitee: dateStr,
          heure_souhaitee: selectedHour,
          duree_minutes: duree,
          lieu,
          message: form.message || null,
        });
      }
      setSent(true);
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const typeLabel = types.find(t => t.key === type)?.label || '';
  const dureeLabel = type === 'technique' ? 45 : 30;

  if (sent) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center px-4">
        <div className="glass rounded-2xl p-12 max-w-lg w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-5 mx-auto">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-3">Rendez-vous planifié avec succès !</h2>
          <div className="bg-dark-700 rounded-xl p-4 mb-4 text-left text-sm space-y-1">
            <p className="text-dark-300">Type : <span className="text-white">{typeLabel}</span></p>
            <p className="text-dark-300">Date : <span className="text-white">{selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {selectedHour}</span></p>
            <p className="text-dark-300">Durée : <span className="text-white">{dureeLabel} min</span></p>
            <p className="text-dark-300">Lieu : <span className="text-white">{lieu}</span></p>
          </div>
          <p className="text-dark-400 text-sm mb-1">📧 Un email de confirmation vous sera envoyé à <span className="text-gold-400">{form.email}</span>.</p>
          <p className="text-dark-400 text-sm">🔔 Vous recevrez un rappel 24h avant, puis 1h avant le rendez-vous.</p>
          <button onClick={() => { setSent(false); setSelectedHour(''); setForm({ civilite: 'M.', nom: '', prenom: '', email: '', telephone: '', message: '' }); prefilled.current = false; setAccept(false); }}
            className="btn-gold mt-6">Prendre un autre rendez-vous</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-gold-500 text-sm font-medium uppercase tracking-widest mb-2">Sans engagement</p>
          <h1 className="section-title mb-3">Prendre un rendez-vous</h1>
          <p className="text-dark-300">Planifiez un échange avec notre équipe pour discuter de votre projet</p>
        </div>

        <div className="glass rounded-2xl p-8 space-y-8">
          {/* Type */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">📌 Type de rendez-vous</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {types.map(t => (
                <button key={t.key} onClick={() => setType(t.key)}
                  className={`p-3 rounded-xl border text-center transition-all ${type === t.key ? 'border-gold-500 bg-gold-500/10' : 'border-dark-600 hover:border-dark-500'}`}>
                  <t.icon size={18} className={`mx-auto mb-1.5 ${type === t.key ? 'text-gold-400' : 'text-dark-400'}`} />
                  <p className={`text-xs font-medium ${type === t.key ? 'text-gold-400' : 'text-dark-200'}`}>{t.label}</p>
                  <p className="text-dark-500 text-[11px] mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Coordonnées — récupérées du profil si connecté */}
          <div>
            {isConnected ? (
              <div className="bg-dark-700/50 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-green-400 text-xs font-medium mb-2">
                  <UserCheck size={15} /> Coordonnées récupérées depuis votre profil
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <p className="text-dark-300">Nom : <span className="text-white">{contactName}</span></p>
                  <p className="text-dark-300">Email : <span className="text-white">{form.email}</span></p>
                  {form.telephone && <p className="text-dark-300">Téléphone : <span className="text-white">{form.telephone}</span></p>}
                </div>
                {!form.telephone && (
                  <div className="mt-3">
                    <label className="text-dark-300 text-sm mb-1.5 block">Téléphone (manquant dans votre profil)</label>
                    <input value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} className="input-field" placeholder="06 12 34 56 78" />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h3 className="text-white font-semibold text-sm mb-3">👤 Informations personnelles</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 flex gap-2">
                    {['M.', 'Mme', 'Mlle'].map(c => (
                      <button key={c} onClick={() => setForm(p => ({ ...p, civilite: c }))}
                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${form.civilite === c ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white'}`}>{c}</button>
                    ))}
                  </div>
                  <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} className="input-field" placeholder="Nom *" />
                  <input value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} className="input-field" placeholder="Prénom *" />
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="input-field" placeholder="Email *" />
                  <input value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} className="input-field" placeholder="Téléphone" />
                </div>
              </div>
            )}
          </div>

          {/* Slot picker */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">📅 Sélection du créneau</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {days.map(d => {
                const active = d.toDateString() === selectedDay.toDateString();
                return (
                  <button key={d.toISOString()} onClick={() => { setSelectedDay(d); setSelectedHour(''); }}
                    className={`flex-shrink-0 px-3.5 py-2.5 rounded-xl text-center transition-all ${active ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white'}`}>
                    <p className="text-[10px] uppercase tracking-wide opacity-80">{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</p>
                    <p className="text-sm font-bold">{d.getDate()}</p>
                    <p className="text-[10px] opacity-80">{d.toLocaleDateString('fr-FR', { month: 'short' })}</p>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {slotHours.map(h => {
                const available = isAvailable(selectedDay, h);
                const active = selectedHour === h;
                return (
                  <button key={h} disabled={!available} onClick={() => setSelectedHour(h)}
                    className={`py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1
                      ${active ? 'bg-gold-500 text-dark-900' : available ? 'glass text-dark-200 hover:text-white' : 'bg-dark-800 text-dark-600 cursor-not-allowed'}`}>
                    <Clock size={12} /> {h}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lieu */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><MapPin size={15} /> Lieu du rendez-vous</h3>
            <select value={lieu} onChange={e => setLieu(e.target.value)} className="input-field">
              {lieux.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>

          {/* Message */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">📝 Message complémentaire</h3>
            <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={3} className="input-field resize-none" placeholder="Précisez votre projet ou vos disponibilités..." />
          </div>

          {/* Recap */}
          {selectedHour && (
            <div className="bg-dark-700 rounded-xl p-4 text-sm space-y-1">
              <p className="text-white font-medium mb-1">📋 Récapitulatif</p>
              <p className="text-dark-300">Type : <span className="text-dark-100">{typeLabel}</span></p>
              <p className="text-dark-300">Date : <span className="text-dark-100">{selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} — {selectedHour}</span></p>
              <p className="text-dark-300">Durée : <span className="text-dark-100">{dureeLabel} min</span></p>
              <p className="text-dark-300">Lieu : <span className="text-dark-100">{lieu}</span></p>
              {isConnected && <p className="text-dark-300">Contact : <span className="text-dark-100">{contactName} — {form.email}</span></p>}
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <label className="flex items-center gap-2.5 text-sm text-dark-300 cursor-pointer">
            <input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} className="w-4 h-4 rounded accent-gold-500" />
            J'accepte les conditions générales d'utilisation
          </label>

          <button onClick={handleSubmit} disabled={!canSubmit || loading} className="btn-gold w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
            <CalendarDays size={16} /> {loading ? 'Envoi...' : 'Planifier le rendez-vous'}
          </button>
        </div>
      </div>
    </div>
  );
}
