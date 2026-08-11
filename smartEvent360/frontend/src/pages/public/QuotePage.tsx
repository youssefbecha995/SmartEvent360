import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ChevronRight, ChevronLeft, UserCheck, FolderOpen } from 'lucide-react';
import { publicApi, clientApi } from '@/lib/neonApi';
import { useAuth } from '@/contexts/AuthContext';
import { useClientRecord } from '@/hooks/useClientRecord';

const services = ['Sonorisation', 'Éclairage', 'DJ / Musicien', 'Animation', 'Décoration', 'Photographe', 'Vidéaste', 'LED Wall', 'Scène'];
const eventTypes = ['Mariage', 'Séminaire', 'Soirée privée', 'Concert', 'Festival', 'Anniversaire', 'Autre'];

export default function QuotePage() {
  const { user, token } = useAuth();
  const { client } = useClientRecord();
  const isConnected = !!token;
  const [searchParams] = useSearchParams();
  const packId = searchParams.get('packId');

  const steps = isConnected ? ['Événement', 'Besoins', 'Récapitulatif'] : ['Informations', 'Événement', 'Besoins', 'Confirmation'];
  const infoStep   = isConnected ? -1 : 0;
  const eventStep  = isConnected ? 0 : 1;
  const besoinStep = isConnected ? 1 : 2;
  const recapStep  = isConnected ? 2 : 3;

  const [step, setStep] = useState(0);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    civilite: 'M.', nom: '', prenom: '', email: '', telephone: '', societe: '',
    type_evenement: '', date_evenement: '', ville: '', salle: '', nb_invites: '', budget: 3000,
    services_demandes: [] as string[], message: '',
  });

  // Préremplissage automatique depuis le profil du client connecté (une seule fois)
  const prefilled = useRef(false);
  useEffect(() => {
    if (!isConnected || !client || prefilled.current) return;
    prefilled.current = true;
    const email = client.email || user?.email || '';
    const prenom = client.prenom || user?.email?.split('@')[0] || '';
    const nom = client.nom || '';
    setForm(p => ({
      ...p,
      civilite: client.civilite || 'M.',
      prenom: prenom || (p.prenom || ''),
      nom: nom || (p.nom || ''),
      email: email || p.email,
      telephone: client.telephone || p.telephone,
      societe: client.societe || p.societe,
    }));
  }, [isConnected, client, user]);

  const set = (patch: Partial<typeof form>) => setForm(p => ({ ...p, ...patch }));

  const toggleService = (s: string) => {
    setForm(p => ({
      ...p,
      services_demandes: p.services_demandes.includes(s)
        ? p.services_demandes.filter(x => x !== s)
        : [...p.services_demandes, s]
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    const payload = {
      civilite: form.civilite, nom: form.nom, prenom: form.prenom,
      email: form.email, telephone: form.telephone, societe: form.societe || null,
      type_evenement: form.type_evenement,
      date_evenement: form.date_evenement || null,
      ville: form.ville, salle: form.salle || null,
      nb_invites: form.nb_invites ? parseInt(form.nb_invites) : null,
      budget_estime: form.budget,
      services_demandes: form.services_demandes,
      message: form.message || null,
    };
    try {
      if (isConnected) {
        // Devis lié au compte client → visible dans « Mes devis »
        await clientApi.createQuote({ ...payload, pack_id: packId || null });
      } else {
        await publicApi.submit('quote_requests', payload);
      }
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  const contactName = `${form.civilite} ${form.prenom} ${form.nom}`.trim();
  const needsPhone = isConnected && !form.telephone;

  const canNext = () => {
    if (step === infoStep)  return form.nom && form.prenom && /\S+@\S+\.\S+/.test(form.email);
    if (step === eventStep) return form.type_evenement;
    if (step === besoinStep) return form.services_demandes.length > 0;
    return true;
  };

  if (sent) return (
    <div className="pt-24 min-h-screen flex items-center justify-center px-4">
      <div className="glass rounded-2xl p-12 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-5 mx-auto">
          <CheckCircle size={32} className="text-green-400" />
        </div>
        <h2 className="text-2xl font-display font-bold text-white mb-3">Demande envoyée !</h2>
        <p className="text-dark-300 mb-2">Merci <span className="text-gold-400">{form.prenom}</span> pour votre demande.</p>
        <p className="text-dark-400 text-sm mb-6">Notre équipe vous contactera sous 24h pour établir votre devis personnalisé.</p>
        {isConnected && (
          <Link to="/client/devis" className="btn-gold w-full py-3 inline-flex items-center justify-center gap-2">
            <FolderOpen size={16} /> Voir mes devis
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="pt-24 min-h-screen py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-gold-500 text-sm font-medium uppercase tracking-widest mb-2">Gratuit & Sans engagement</p>
          <h1 className="section-title mb-3">Demande de devis</h1>
          <p className="text-dark-300">Complétez ce formulaire et recevez votre devis sous 24h</p>
          {!isConnected && (
            <p className="text-dark-400 text-sm mt-3">
              <Link to="/connexion-client?next=/devis" className="text-gold-400 hover:text-gold-300 underline underline-offset-2">Connectez-vous</Link> pour retrouver vos devis dans votre espace client.
            </p>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-10">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i < step ? 'bg-gold-500 text-dark-900' : i === step ? 'bg-gold-500 text-dark-900 ring-4 ring-gold-500/30' : 'bg-dark-700 text-dark-400'
                }`}>
                  {i < step ? <CheckCircle size={16} /> : i + 1}
                </div>
                <span className={`text-xs mt-1.5 hidden sm:block ${i === step ? 'text-gold-400' : 'text-dark-500'}`}>{s}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px mx-3 ${i < step ? 'bg-gold-500' : 'bg-dark-700'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-8">
          {/* Step : Informations (uniquement visiteur non connecté) */}
          {step === infoStep && (
            <div className="space-y-5">
              <h2 className="text-white font-semibold text-lg mb-5">Vos informations</h2>
              <div>
                <label className="text-dark-300 text-sm mb-2 block">Civilité</label>
                <div className="flex gap-3">
                  {['M.', 'Mme', 'Mlle'].map(c => (
                    <button key={c} type="button" onClick={() => set({ civilite: c })}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${form.civilite === c ? 'border-gold-500 bg-gold-500/10 text-gold-500' : 'border-dark-600 text-dark-300 hover:border-dark-400'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Nom *</label>
                  <input value={form.nom} onChange={e => set({ nom: e.target.value })} className="input-field" placeholder="Votre nom" />
                </div>
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Prénom *</label>
                  <input value={form.prenom} onChange={e => set({ prenom: e.target.value })} className="input-field" placeholder="Votre prénom" />
                </div>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Email *</label>
                <input type="email" value={form.email} onChange={e => set({ email: e.target.value })} className="input-field" placeholder="votre@email.com" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Téléphone *</label>
                <input value={form.telephone} onChange={e => set({ telephone: e.target.value })} className="input-field" placeholder="06 12 34 56 78" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Société (optionnel)</label>
                <input value={form.societe} onChange={e => set({ societe: e.target.value })} className="input-field" placeholder="Nom de votre société" />
              </div>
            </div>
          )}

          {/* Step : Événement */}
          {step === eventStep && (
            <div className="space-y-5">
              <h2 className="text-white font-semibold text-lg mb-5">Votre événement</h2>
              <div>
                <label className="text-dark-300 text-sm mb-2 block">Type d'événement *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {eventTypes.map(t => (
                    <button key={t} type="button" onClick={() => set({ type_evenement: t })}
                      className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${form.type_evenement === t ? 'border-gold-500 bg-gold-500/10 text-gold-500' : 'border-dark-600 text-dark-300 hover:border-dark-400'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Date</label>
                  <input type="date" value={form.date_evenement} onChange={e => set({ date_evenement: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Nombre d'invités</label>
                  <input type="number" value={form.nb_invites} onChange={e => set({ nb_invites: e.target.value })} className="input-field" placeholder="100" min={1} />
                </div>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Ville</label>
                <input value={form.ville} onChange={e => set({ ville: e.target.value })} className="input-field" placeholder="Paris" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Salle (optionnel)</label>
                <input value={form.salle} onChange={e => set({ salle: e.target.value })} className="input-field" placeholder="Nom de la salle" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-2 block">Budget estimé : <span className="text-gold-400 font-bold">{form.budget.toLocaleString('fr-FR')} DT</span></label>
                <input type="range" min={500} max={20000} step={500} value={form.budget} onChange={e => set({ budget: parseInt(e.target.value) })}
                  className="w-full accent-gold-500" />
                <div className="flex justify-between text-dark-500 text-xs mt-1"><span>500 DT</span><span>20 000 DT</span></div>
              </div>
            </div>
          )}

          {/* Step : Besoins */}
          {step === besoinStep && (
            <div className="space-y-5">
              <h2 className="text-white font-semibold text-lg mb-2">Besoins techniques</h2>
              <p className="text-dark-400 text-sm mb-5">Sélectionnez les services dont vous avez besoin (minimum 1)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {services.map(s => {
                  const selected = form.services_demandes.includes(s);
                  return (
                    <button key={s} type="button" onClick={() => toggleService(s)}
                      className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all flex items-center gap-2 ${selected ? 'border-gold-500 bg-gold-500/10 text-gold-500' : 'border-dark-600 text-dark-300 hover:border-dark-500'}`}>
                      <div className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center ${selected ? 'border-gold-500 bg-gold-500' : 'border-dark-500'}`}>
                        {selected && <CheckCircle size={10} className="text-dark-900" />}
                      </div>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step : Récapitulatif */}
          {step === recapStep && (
            <div className="space-y-5">
              <h2 className="text-white font-semibold text-lg mb-5">Informations complémentaires</h2>

              {isConnected && (
                <div className="bg-dark-700/50 border border-green-500/20 rounded-xl p-4 mb-1">
                  <div className="flex items-center gap-2 text-green-400 text-xs font-medium mb-2">
                    <UserCheck size={15} /> Coordonnées récupérées depuis votre profil
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-dark-400">Nom :</span><span className="text-white">{contactName}</span></div>
                    <div className="flex justify-between"><span className="text-dark-400">Email :</span><span className="text-white">{form.email}</span></div>
                    {form.telephone && <div className="flex justify-between"><span className="text-dark-400">Téléphone :</span><span className="text-white">{form.telephone}</span></div>}
                    {form.societe && <div className="flex justify-between"><span className="text-dark-400">Société :</span><span className="text-white">{form.societe}</span></div>}
                  </div>
                </div>
              )}

              {needsPhone && (
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Téléphone (manquant dans votre profil) *</label>
                  <input value={form.telephone} onChange={e => set({ telephone: e.target.value })} className="input-field" placeholder="06 12 34 56 78" />
                </div>
              )}

              <div className="glass rounded-xl p-5 border border-gold-500/20">
                <h3 className="text-gold-500 font-medium mb-3 text-sm">Récapitulatif</h3>
                <div className="space-y-1.5 text-sm">
                  {!isConnected && <div className="flex justify-between"><span className="text-dark-400">Contact :</span><span className="text-white">{contactName}</span></div>}
                  {packId && <div className="flex justify-between"><span className="text-dark-400">Pack :</span><span className="text-white">Pack sélectionné</span></div>}
                  <div className="flex justify-between"><span className="text-dark-400">Type :</span><span className="text-white">{form.type_evenement || '–'}</span></div>
                  <div className="flex justify-between"><span className="text-dark-400">Budget :</span><span className="text-white">{form.budget.toLocaleString('fr-FR')} DT</span></div>
                  <div className="flex justify-between"><span className="text-dark-400">Services :</span><span className="text-white">{form.services_demandes.length} sélectionné(s)</span></div>
                </div>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Message / Informations complémentaires</label>
                <textarea value={form.message} onChange={e => set({ message: e.target.value })} rows={4}
                  className="input-field resize-none" placeholder="Contraintes techniques, demandes spécifiques..." />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
            <button onClick={() => setStep(p => p - 1)} disabled={step === 0}
              className="flex items-center gap-2 btn-ghost disabled:opacity-40 py-2.5 px-5">
              <ChevronLeft size={16} /> Précédent
            </button>
            {step < recapStep ? (
              <button onClick={() => setStep(p => p + 1)} disabled={!canNext()}
                className="flex items-center gap-2 btn-gold disabled:opacity-40 py-2.5 px-6">
                Suivant <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading || needsPhone && !form.telephone}
                className="btn-gold py-2.5 px-6 disabled:opacity-60">
                {loading ? 'Envoi...' : 'Envoyer la demande'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
