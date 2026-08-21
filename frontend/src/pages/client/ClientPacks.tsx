import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Package, Plus, CalendarDays, Users, Clock, BadgeDollarSign, MapPin, X, Check, Crown, Settings, User } from 'lucide-react';
import { clientApi } from '@/lib/neonApi';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

interface ClientPack {
  id: string;
  pack_id?: string;
  nom_pack?: string;
  description_pack?: string | null;
  prix_pack?: number;
  duree_heures?: number;
  nb_invites_max?: number;
  badge?: string | null;
  date_debut?: string;
  quantite?: number;
  statut?: string;
  notes?: string | null;
  created_at?: string;
  pack?: {
    name: string;
    description: string | null;
    price: number;
    duration: number;
    maxGuests: number;
    badge: string | null;
    imageUrl: string | null;
    features: string[] | null;
  } | null;
}

const MAX_FEATURES_IN_CARD = 4;

export default function ClientPacks() {
  const { token } = useAuth();
  const { t, lang } = useI18n();
  const { error: toastError, success: toastSuccess } = useToast();
  const [packs, setPacks] = useState<ClientPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await clientApi.packs();
      setPacks((data || []) as ClientPack[]);
    } catch (e: any) {
      toastError('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  }, [token, toastError]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'هل تريد إلغاء هذا الحجز؟' : 'Annuler cette réservation ?')) return;
    setCancelling(id);
    try {
      await clientApi.cancelPack(id);
      toastSuccess(t('Réservation annulée'));
      load();
    } catch (e: any) {
      toastError('Erreur', e.message);
    } finally {
      setCancelling(null);
    }
  };

  const fmtDate = (d?: string) =>
    d ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-FR') : '–';
  const fmtPrice = (n?: number) => n === undefined || n === null ? '–' : `${n.toLocaleString('fr-FR')} DT`;

  return (
    <div>
      <PageHeader
        title={t('Mes Packs')}
        subtitle={packs.length ? `${packs.length} ${lang === 'ar' ? 'باقة' : 'pack(s)'}` : undefined}
        action={
          <Link to="/packs" className="btn-gold py-2 px-4 text-sm flex items-center gap-2">
            <Plus size={15} /> {t('Ajouter un pack')}
          </Link>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="glass rounded-2xl h-80 animate-pulse" />
          ))}
        </div>
      ) : packs.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-dark-700 flex items-center justify-center mx-auto mb-5">
            <Package size={30} className="text-dark-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{t("Vous n'avez encore aucun pack.")}</h3>
          <p className="text-dark-400 text-sm mb-7">{lang === 'ar' ? 'اختر باقة من موقعنا لتظهر هنا.' : "Choisissez un pack sur notre site et il apparaîtra ici."}</p>
          <Link to="/packs" className="btn-gold py-2.5 px-6 inline-flex items-center gap-2">
            <Package size={16} /> {t('Découvrir nos packs')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {packs.map(p => {
            const name = p.nom_pack || p.pack?.name || 'Pack';
            const description = p.description_pack ?? p.pack?.description ?? '';
            const price = p.prix_pack ?? p.pack?.price;
            const duration = p.duree_heures ?? p.pack?.duration;
            const maxGuests = p.nb_invites_max ?? p.pack?.maxGuests;
            const imageUrl = p.pack?.imageUrl ?? null;
            const features = p.pack?.features ?? [];
            const cancelled = p.statut === 'annule';
            return (
              <div key={p.id} className={`relative flex flex-col glass rounded-2xl overflow-hidden border ${cancelled ? 'border-white/5 opacity-70' : 'border-white/10'} transition-all hover:-translate-y-1`}>
                {/* Image */}
                <div className="relative h-36 flex-shrink-0 overflow-hidden bg-gradient-to-br from-dark-800 via-dark-700 to-dark-800">
                  {imageUrl ? (
                    <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Crown size={32} className="text-gold-500/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-900/60 to-transparent" />
                  <div className="absolute top-3 right-3">
                    <StatusBadge status={p.statut || 'reserve'} />
                  </div>
                  {p.badge && (
                    <div className="absolute top-3 left-3 bg-gold-500 text-dark-900 text-[11px] font-bold px-3 py-1 rounded-full">
                      {p.badge}
                    </div>
                  )}
                  <div className="absolute bottom-3 left-4 right-4">
                    <h3 className="text-lg font-display font-bold text-white leading-tight">{name}</h3>
                  </div>
                </div>

                {/* Corps */}
                <div className="flex flex-col flex-1 p-5">
                  {description && <p className="text-dark-400 text-xs mb-4 leading-relaxed line-clamp-2">{description}</p>}

                  <div className="grid grid-cols-2 gap-2 text-xs text-dark-300 mb-4">
                    <div className="bg-dark-700/60 rounded-lg p-2.5 flex items-center gap-2">
                      <CalendarDays size={14} className="text-gold-500 flex-shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-dark-500">{t('Date')}</span>
                        <span className="text-white font-medium">{fmtDate(p.date_debut)}</span>
                      </span>
                    </div>
                    <div className="bg-dark-700/60 rounded-lg p-2.5 flex items-center gap-2">
                      <BadgeDollarSign size={14} className="text-gold-500 flex-shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-dark-500">{t('Prix')}</span>
                        <span className="text-white font-medium">{fmtPrice(price)}</span>
                      </span>
                    </div>
                    <div className="bg-dark-700/60 rounded-lg p-2.5 flex items-center gap-2">
                      <Clock size={14} className="text-gold-500 flex-shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-dark-500">{t('Durée')}</span>
                        <span className="text-white font-medium">{duration ?? '–'} {t('heures')}</span>
                      </span>
                    </div>
                    <div className="bg-dark-700/60 rounded-lg p-2.5 flex items-center gap-2">
                      <Users size={14} className="text-gold-500 flex-shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-dark-500">{t('Invités')}</span>
                        <span className="text-white font-medium">{maxGuests ?? '–'}+</span>
                      </span>
                    </div>
                  </div>

                  {(p.quantite && p.quantite > 1) && (
                    <p className="text-xs text-dark-300 mb-2">
                      <span className="text-dark-500">{t('Quantité')} : </span>
                      <span className="text-white font-medium">{p.quantite}</span>
                    </p>
                  )}
                  {p.notes && (
                    <p className="text-xs text-dark-400 mb-3 flex items-start gap-1.5">
                      <MapPin size={12} className="mt-0.5 flex-shrink-0 text-dark-500" /> {p.notes}
                    </p>
                  )}

                  {features.length > 0 && (
                    <div className="mb-4">
                      <p className="text-dark-500 text-[11px] font-semibold uppercase tracking-wide mb-1.5">{t('Le pack comprend')} :</p>
                      <ul className="space-y-1">
                        {features.slice(0, MAX_FEATURES_IN_CARD).map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-dark-200">
                            <span className="w-3.5 h-3.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/40 flex items-center justify-center flex-shrink-0">
                              <Check size={8} strokeWidth={3} />
                            </span>
                            {f}
                          </li>
                        ))}
                        {features.length > MAX_FEATURES_IN_CARD && (
                          <li className="text-xs text-gold-500/90 font-medium">+ {features.length - MAX_FEATURES_IN_CARD} {t('prestations supplémentaires')}</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {(p.pack as any)?.packServices && (p.pack as any).packServices.length > 0 && (
                    <div className="mb-4">
                      <p className="text-dark-500 text-[11px] font-semibold uppercase tracking-wide mb-1.5">{t('Services détaillés')} :</p>
                      <div className="space-y-1.5">
                        {(p.pack as any).packServices.map((ps: any) => (
                          <div key={ps.id} className="flex items-center gap-2 text-xs text-dark-200">
                            <Settings size={10} className="text-dark-500 flex-shrink-0" />
                            <span className="text-white">{ps.service?.name}</span>
                            {ps.resource && <span className="text-dark-500">— {ps.resource.name}</span>}
                            {ps.provider && <span className="text-blue-400 text-[10px] flex items-center gap-1"><User size={9} />{ps.provider.name}</span>}
                            {ps.quantity > 1 && <span className="text-dark-500">×{ps.quantity}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!cancelled && (
                    <button
                      onClick={() => handleCancel(p.id)}
                      disabled={cancelling === p.id}
                      className="w-full mt-auto text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <X size={13} /> {t('Annuler la réservation')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
