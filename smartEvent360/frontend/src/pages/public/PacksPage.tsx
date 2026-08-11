import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Crown, CalendarDays, Users, Clock, ChevronRight, LogIn, UserPlus, Sparkles } from 'lucide-react';
import { packsApi, clientApi, NeonPack } from '@/lib/neonApi';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';

interface Pack {
  id: string; nom: string; description: string; prix: number;
  duree_heures: number; nb_invites_max: number; badge: string | null; populaire: boolean;
  imageUrl: string | null; features: string[] | null;
}

type Step = 'detail' | 'dispo' | 'indispo' | 'confirm' | 'success';

const todayPlus1 = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

// Nombre de prestations affichées dans la carte avant le « + N autres prestations »
const MAX_FEATURES_IN_CARD = 5;

export default function PacksPage() {
  const { token } = useAuth();
  const { t, lang } = useI18n();
  const { success, error } = useToast();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalPack, setModalPack] = useState<Pack | null>(null);
  const [step, setStep] = useState<Step>('detail');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState<{ available: boolean; message?: string } | null>(null);

  useEffect(() => {
    packsApi.list()
      .then((data: NeonPack[]) => {
        const mapped: Pack[] = (data || []).map((p: NeonPack) => ({
          id: p.id, nom: p.name, description: p.description || '',
          prix: p.price, duree_heures: p.duration, nb_invites_max: p.maxGuests,
          badge: p.badge, populaire: p.isPopular,
          imageUrl: p.imageUrl, features: p.features || [],
        }));
        mapped.sort((a, b) => a.prix - b.prix);
        setPacks(mapped);
      })
      .catch(() => setPacks([]))
      .finally(() => setLoading(false));
  }, []);

  const openModal = (p: Pack) => {
    setModalPack(p);
    setStep('detail');
    setDate('');
    setNotes('');
    setAvailability(null);
  };

  const closeModal = () => { if (!submitting) setModalPack(null); };

  const checkAvailability = async () => {
    if (!date) return;
    if (date < todayPlus1()) { error('Erreur', t('La date doit être future')); return; }
    setChecking(true);
    try {
      const res = await clientApi.packCheckAvailability(modalPack!.id, date);
      setAvailability(res);
      setStep(res.available ? 'dispo' : 'indispo');
    } catch (e: any) {
      setAvailability({ available: false, message: e.message });
      setStep('indispo');
    } finally {
      setChecking(false);
    }
  };

  const confirm = async () => {
    setSubmitting(true);
    try {
      await clientApi.addPack({ packId: modalPack!.id, date, notes: notes || undefined });
      setStep('success');
      success(t('Réservation confirmée !'), t('Votre pack a été ajouté à vos packs.'));
    } catch (e: any) {
      error('Erreur', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const featuresVisible = (features: string[] | null) =>
    (features || []).slice(0, MAX_FEATURES_IN_CARD);

  const featuresHiddenCount = (features: string[] | null) =>
    Math.max(0, (features || []).length - MAX_FEATURES_IN_CARD);

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-FR');

  return (
    <div className="pt-24 min-h-screen">
      <div className="bg-dark-800/50 border-b border-white/10 py-16 px-4 text-center">
        <p className="text-gold-500 text-sm font-medium uppercase tracking-widest mb-3">{t('Solutions Clés en Main')}</p>
        <h1 className="section-title mb-4">{t('Nos Packs Événementiels')}</h1>
        <p className="text-dark-300 max-w-xl mx-auto">{t('Des formules adaptées à tous vos événements et tous vos budgets')}</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {Array(4).fill(0).map((_, i) => <div key={i} className="glass rounded-2xl h-[480px] animate-pulse" />)}
          </div>
        ) : packs.length === 0 ? (
          <p className="text-center text-dark-400">{t('Aucun pack disponible pour le moment.')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-16 items-stretch">
            {packs.map(pack => {
              const visible = featuresVisible(pack.features);
              const hidden = featuresHiddenCount(pack.features);
              return (
                <div
                  key={pack.id}
                  className={`relative flex flex-col glass rounded-2xl overflow-hidden border ${pack.populaire ? 'border-gold-500 ring-1 ring-gold-500 scale-[1.02]' : 'border-dark-600'} hover:-translate-y-1 transition-all`}
                >
                  {/* Image */}
                  <div className="relative h-44 flex-shrink-0 overflow-hidden bg-gradient-to-br from-dark-800 via-dark-700 to-dark-800">
                    {pack.imageUrl ? (
                      <img src={pack.imageUrl} alt={pack.nom} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Crown size={40} className="text-gold-500/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-900/60 to-transparent" />
                  </div>

                  {/* Badge */}
                  {(pack.badge || pack.populaire) && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-gold-500 text-dark-900 text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap shadow-lg z-10">
                      {pack.badge || '⭐ Populaire'}
                    </div>
                  )}

                  {/* Body */}
                  <div className="flex flex-col flex-1 p-6 pt-5">
                    <h3 className={`text-xl font-display font-bold mb-1 ${pack.populaire ? 'text-gold-500' : 'text-white'}`}>{pack.nom}</h3>
                    {pack.description && (
                      <p className="text-dark-400 text-xs leading-relaxed mb-4 line-clamp-3">{pack.description}</p>
                    )}

                    {/* Prix */}
                    <div className="mb-4">
                      <p className="text-3xl font-bold text-white">
                        {pack.prix.toLocaleString('fr-FR')} <span className="text-dark-400 text-lg font-medium">DT</span>
                      </p>
                      <p className="text-dark-500 text-[11px] uppercase tracking-wide">{t('Prix du pack')}</p>
                    </div>

                    {/* Durée / Invités */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                      <div className="bg-dark-700/60 rounded-xl p-2.5 flex items-center gap-2">
                        <Clock size={14} className="text-gold-500 flex-shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-dark-500 text-[10px]">{t('Durée')}</span>
                          <span className="text-white font-medium">{pack.duree_heures} {t('heures')}</span>
                        </span>
                      </div>
                      <div className="bg-dark-700/60 rounded-xl p-2.5 flex items-center gap-2">
                        <Users size={14} className="text-gold-500 flex-shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-dark-500 text-[10px]">{t('Invités')}</span>
                          <span className="text-white font-medium">{t("Jusqu'à")} {pack.nb_invites_max} {t('invités')}</span>
                        </span>
                      </div>
                    </div>

                    {/* Contenu du pack */}
                    {visible.length > 0 && (
                      <div className="mb-5">
                        <p className="text-dark-300 text-xs font-semibold uppercase tracking-wide mb-2">{t('Le pack comprend')} :</p>
                        <ul className="space-y-1.5">
                          {visible.map((f, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-dark-200">
                              <span className="w-4 h-4 rounded-full bg-green-500/20 text-green-400 border border-green-500/40 flex items-center justify-center flex-shrink-0">
                                <Check size={9} strokeWidth={3} />
                              </span>
                              {f}
                            </li>
                          ))}
                        </ul>
                        {hidden > 0 && (
                          <p className="text-xs text-gold-500/90 mt-2 font-medium">+ {hidden} {t('prestations supplémentaires')}</p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2 mt-auto pt-4">
                      <button onClick={() => openModal(pack)} className={pack.populaire ? 'btn-gold text-center text-sm py-2.5' : 'btn-outline-gold text-center text-sm py-2.5'}>
                        {t('Réserver ce pack')}
                      </button>
                      <Link to={`/devis?packId=${pack.id}`} className="text-center text-dark-400 hover:text-white text-xs py-1 transition-colors">
                        {t('Devis personnalisé')}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Custom CTA */}
        <div className="glass rounded-2xl p-10 text-center border border-gold-500/20">
          <h3 className="text-2xl font-display font-bold text-white mb-3">{t('Vous souhaitez un pack sur mesure ?')}</h3>
          <p className="text-dark-300 mb-7 max-w-md mx-auto">{t('Nos experts vous accompagnent pour créer offre adaptée')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact" className="btn-ghost py-3 px-8">{t('Contactez un conseiller')}</Link>
            <Link to="/devis" className="btn-gold py-3 px-8">{t('Demander un devis gratuit')}</Link>
          </div>
        </div>
      </div>

      {/* ── Booking modal ── */}
      {modalPack && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative glass rounded-2xl w-full max-w-md flex flex-col max-h-[92vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <button onClick={closeModal} className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-dark-900/60 text-dark-300 hover:text-white flex items-center justify-center" aria-label="Fermer">
              <X size={16} />
            </button>

            <div className="overflow-y-auto">
              {step === 'detail' && (
                <div>
                  {/* En-tête du pack */}
                  <div className="relative h-40 flex-shrink-0 bg-gradient-to-br from-dark-800 via-dark-700 to-dark-800">
                    {modalPack.imageUrl ? (
                      <img src={modalPack.imageUrl} alt={modalPack.nom} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles size={36} className="text-gold-500/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/40 to-transparent" />
                    {(modalPack.badge || modalPack.populaire) && (
                      <div className="absolute top-4 left-4 bg-gold-500 text-dark-900 text-[11px] font-bold px-3 py-1 rounded-full">
                        {modalPack.badge || '⭐ Populaire'}
                      </div>
                    )}
                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="text-xl font-display font-bold text-white">{modalPack.nom}</h3>
                      <p className="text-gold-400 text-sm font-semibold">{modalPack.prix.toLocaleString('fr-FR')} DT</p>
                    </div>
                  </div>

                  <div className="p-5">
                    {modalPack.description && <p className="text-dark-300 text-sm mb-4 leading-relaxed">{modalPack.description}</p>}

                    {/* Prestations incluses */}
                    {(modalPack.features || []).length > 0 && (
                      <div className="bg-dark-700/40 rounded-xl p-4 mb-4">
                        <p className="text-white text-sm font-semibold mb-2.5 flex items-center gap-2">
                          <Check size={14} className="text-green-400" /> {t('Inclus dans ce pack')} :
                        </p>
                        <ul className="space-y-1.5">
                          {(modalPack.features || []).map((f, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-dark-200">
                              <span className="w-4 h-4 rounded-full bg-green-500/20 text-green-400 border border-green-500/40 flex items-center justify-center flex-shrink-0">
                                <Check size={9} strokeWidth={3} />
                              </span>
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Résumé stats */}
                    <div className="grid grid-cols-3 gap-2 text-xs mb-5">
                      <div className="bg-dark-700/60 rounded-xl p-2.5 text-center">
                        <Clock size={14} className="mx-auto text-gold-500 mb-1" />
                        <span className="block text-dark-500 text-[10px]">{t('Durée')}</span>
                        <span className="text-white font-medium">{modalPack.duree_heures} {t('heures')}</span>
                      </div>
                      <div className="bg-dark-700/60 rounded-xl p-2.5 text-center">
                        <Users size={14} className="mx-auto text-gold-500 mb-1" />
                        <span className="block text-dark-500 text-[10px]">{t('Invités')}</span>
                        <span className="text-white font-medium">{t("Jusqu'à")} {modalPack.nb_invites_max}</span>
                      </div>
                      <div className="bg-dark-700/60 rounded-xl p-2.5 text-center">
                        <CalendarDays size={14} className="mx-auto text-gold-500 mb-1" />
                        <span className="block text-dark-500 text-[10px]">{t('Prix')}</span>
                        <span className="text-gold-400 font-bold">{modalPack.prix.toLocaleString('fr-FR')} DT</span>
                      </div>
                    </div>

                    {/* Réservation */}
                    {!token ? (
                      <div className="bg-dark-700/50 border border-gold-500/20 rounded-xl p-5 text-center">
                        <LogIn size={22} className="mx-auto mb-2 text-gold-500" />
                        <p className="text-white text-sm font-semibold mb-1">{t('Connectez-vous pour continuer')}</p>
                        <p className="text-dark-400 text-xs mb-4">{t('La vérification de disponibilité nécessite un compte.')}</p>
                        <div className="flex flex-col gap-2">
                          <Link to="/connexion-client?next=/packs" className="btn-gold text-sm py-2.5 inline-flex items-center justify-center gap-2">
                            <LogIn size={15} /> {t('Se connecter')}
                          </Link>
                          <Link to="/inscription?next=/packs" className="btn-outline-gold text-sm py-2.5 inline-flex items-center justify-center gap-2">
                            <UserPlus size={15} /> {t('Créer un compte')}
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-dark-300 text-sm font-medium mb-2">{t('Sélectionnez votre date')}</p>
                        <input
                          type="date"
                          value={date}
                          min={todayPlus1()}
                          onChange={e => setDate(e.target.value)}
                          className="input w-full mb-3"
                        />
                        <label className="block text-xs text-dark-300 mb-1.5">{t('Notes (optionnel)')}</label>
                        <textarea
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          rows={2}
                          className="input w-full mb-4"
                        />
                        <button onClick={checkAvailability} disabled={!date || checking} className="btn-gold w-full py-2.5 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50">
                          {checking ? t('Loading') : (<>{t('Vérifier la disponibilité')} <ChevronRight size={15} /></>)}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {step === 'dispo' && (
                <div className="p-6">
                  <h3 className="text-lg font-display font-bold text-white mb-3 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 border border-green-500/40 flex items-center justify-center"><Check size={16} /></span>
                    {t('Ce pack est disponible pour cette date.')}
                  </h3>
                  <p className="text-dark-300 text-sm mb-6 flex items-center gap-2">
                    <CalendarDays size={15} className="text-gold-500" />
                    <span className="text-white font-medium">{formatDate(date)}</span>
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setStep('detail')} className="btn-ghost flex-1 text-sm py-2.5">{t('Retour')}</button>
                    <button onClick={() => setStep('confirm')} className="btn-gold flex-1 text-sm py-2.5 inline-flex items-center justify-center gap-2">
                      {t('Continuer')} <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {step === 'indispo' && (
                <div className="p-6">
                  <h3 className="text-lg font-display font-bold text-white mb-3 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center"><X size={16} /></span>
                    {t("Ce pack n'est pas disponible pour cette date.")}
                  </h3>
                  {availability?.message && <p className="text-dark-300 text-sm mb-6">{availability.message}</p>}
                  <div className="flex gap-3">
                    <button onClick={() => setStep('detail')} className="btn-gold flex-1 text-sm py-2.5">{t('Choisir une autre date')}</button>
                  </div>
                </div>
              )}

              {step === 'confirm' && (
                <div className="p-6">
                  <h3 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
                    <ChevronRight size={18} className="text-gold-500" /> {t('Récapitulatif')}
                  </h3>
                  <div className="bg-dark-700/50 rounded-xl p-4 mb-5 space-y-2.5 text-sm">
                    <div className="flex justify-between"><span className="text-dark-400">{t('Pack')}</span><span className="text-white font-medium">{modalPack.nom}</span></div>
                    <div className="flex justify-between"><span className="text-dark-400">{t('Date')}</span><span className="text-white font-medium">{formatDate(date)}</span></div>
                    <div className="flex justify-between"><span className="text-dark-400">{t('Durée')}</span><span className="text-white font-medium">{modalPack.duree_heures} {t('heures')}</span></div>
                    <div className="flex justify-between"><span className="text-dark-400">{t('Invités')}</span><span className="text-white font-medium">{t("Jusqu'à")} {modalPack.nb_invites_max}</span></div>
                    {notes && <div className="flex justify-between"><span className="text-dark-400">{t('Notes')}</span><span className="text-white font-medium text-right max-w-[60%]">{notes}</span></div>}
                    <div className="flex justify-between border-t border-white/10 pt-2.5 mt-2">
                      <span className="text-dark-300 font-medium">{t('Prix')}</span>
                      <span className="text-gold-400 font-bold">{modalPack.prix.toLocaleString('fr-FR')} DT</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep('detail')} className="btn-ghost flex-1 text-sm py-2.5">{t('Retour')}</button>
                    <button onClick={confirm} disabled={submitting} className="btn-gold flex-1 text-sm py-2.5 disabled:opacity-50">
                      {submitting ? t('Envoi') : t('Confirmer la réservation')}
                    </button>
                  </div>
                </div>
              )}

              {step === 'success' && (
                <div className="text-center py-8 px-6">
                  <div className="w-14 h-14 rounded-full bg-green-500/20 text-green-400 border border-green-500/40 flex items-center justify-center mx-auto mb-4">
                    <Check size={26} />
                  </div>
                  <h3 className="text-lg font-display font-bold text-white mb-2">{t('Réservation confirmée !')}</h3>
                  <p className="text-dark-300 text-sm mb-6">{t('Votre pack a été ajouté à vos packs.')}</p>
                  <div className="flex flex-col gap-2">
                    <Link to="/client/packs" className="btn-gold text-sm py-2.5">{t('Voir mes packs')}</Link>
                    <button onClick={closeModal} className="btn-ghost text-sm py-2.5">{t('Fermer')}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
