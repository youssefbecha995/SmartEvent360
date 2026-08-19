import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, TrendingUp, FileText, CheckCircle, Clock, ArrowRight, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { clientApi } from '@/lib/neonApi';
import { useClientRecord } from '@/hooks/useClientRecord';
import { useI18n } from '@/lib/i18n';
import { SkeletonCard } from '@/components/ui/Skeleton';

export default function ClientDashboard() {
  const { user, profile } = useAuth();
  const { t, lang } = useI18n();
  const { clientId, loading: clientLoading } = useClientRecord();
  const [packs, setPacks]        = useState<any[]>([]);
  const [devis, setDevis]        = useState<any[]>([]);
  const [payments, setPayments]  = useState<any[]>([]);
  const [loading, setLoading]    = useState(true);

  const displayName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Client';

  useEffect(() => {
    if (clientLoading) return;
    async function load() {
      setLoading(true);
      try {
        const [pk, dv, pm] = await Promise.all([
          clientApi.packs().catch(() => []),
          clientApi.devis().catch(() => []),
          clientApi.payments().catch(() => []),
        ]);
        setPacks((pk || []).filter((p: any) => p.statut === 'reserve'));
        setDevis((dv || []).filter((d: any) => d.statut === 'envoye'));
        setPayments(pm || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientLoading]);

  const totalPaid    = payments.filter(p => ['paye', 'confirme'].includes(p.statut)).reduce((a, b) => a + b.montant, 0);
  const pendingDevis = devis.length;
  const nextPack     = packs[0];
  const fmtDate      = (d?: string) => d ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-FR') : '–';

  const timelineSteps = [
    { label: 'Devis accepté',     done: true,  date: '15 Jan 2025' },
    { label: 'Contrat signé',     done: true,  date: '20 Jan 2025' },
    { label: '1er acompte versé', done: true,  date: '01 Fév 2025' },
    { label: 'Briefing technique',done: false, date: 'En cours' },
    { label: 'Événement',         done: false, date: nextPack ? fmtDate(nextPack.date_debut) : '–' },
  ];
  const progress = (timelineSteps.filter(s => s.done).length / timelineSteps.length) * 100;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-white">Bonjour, {displayName} 👋</h1>
        <p className="text-dark-400 text-sm mt-1">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* KPI */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array(4).fill(0).map((_,i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="kpi-card">
            <div className="flex items-center gap-2 text-dark-400 text-xs mb-1"><Package size={14} className="text-gold-500" />{t('Prochain pack')}</div>
            <div className="text-white font-semibold text-sm leading-tight">{nextPack ? (nextPack.nom_pack || nextPack.pack?.name || 'Pack') : (lang === 'ar' ? 'لا يوجد' : 'Aucun prévu')}</div>
            {nextPack && <div className="text-gold-400 text-xs mt-1">{fmtDate(nextPack.date_debut)}</div>}
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-2 text-dark-400 text-xs mb-1"><CreditCard size={14} className="text-red-400" />Paiement versé</div>
            <div className="text-2xl font-bold text-white">{totalPaid.toLocaleString('fr-FR')} DT</div>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-2 text-dark-400 text-xs mb-1"><TrendingUp size={14} className="text-green-400" />Progression</div>
            <div className="text-2xl font-bold text-white">{Math.round(progress)}%</div>
            <div className="w-full bg-dark-700 rounded-full h-1.5 mt-1">
              <div className="bg-gold-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-2 text-dark-400 text-xs mb-1"><FileText size={14} className="text-blue-400" />Devis en attente</div>
            <div className="text-2xl font-bold text-white">{pendingDevis}</div>
            {pendingDevis > 0 && <Link to="/client/devis" className="text-gold-400 text-xs">À consulter →</Link>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Next pack */}
        {nextPack && (
          <div className="glass rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Package size={18} className="text-gold-500" />{t('Mon prochain pack')}</h2>
            <div className="bg-dark-700 rounded-xl p-4 mb-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-white font-bold text-lg">{nextPack.nom_pack || nextPack.pack?.name || 'Pack'}</h3>
                <span className="badge bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Réservé</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: t('Date'),     value: fmtDate(nextPack.date_debut) },
                  { label: t('Durée'),    value: `${nextPack.duree_heures ?? nextPack.pack?.duration ?? '–'}h` },
                  { label: t('Invités'),  value: nextPack.nb_invites_max ?? nextPack.pack?.maxGuests ?? '–' },
                  { label: t('Prix'),     value: `${((nextPack.prix_pack ?? nextPack.pack?.price) || 0).toLocaleString('fr-FR')} DT` },
                ].map((item, i) => (
                  <div key={i}>
                    <p className="text-dark-400 text-xs">{item.label}</p>
                    <p className="text-dark-200">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <Link to="/client/packs" className="text-gold-500 text-sm flex items-center gap-1 hover:gap-2 transition-all">
              {t('Voir tous mes packs')} <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Timeline */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Clock size={18} className="text-gold-500" />Avancement de l'organisation</h2>
          <div className="space-y-3">
            {timelineSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${step.done ? 'bg-green-500/20 text-green-400 border border-green-500/40' : i === timelineSteps.filter(s => s.done).length ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40' : 'bg-dark-700 text-dark-500 border border-dark-600'}`}>
                  {step.done ? <CheckCircle size={16} /> : <span className="text-xs font-bold">{i + 1}</span>}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${step.done ? 'text-white' : 'text-dark-400'}`}>{step.label}</p>
                  <p className="text-dark-500 text-xs">{step.date}</p>
                </div>
                {i === timelineSteps.filter(s => s.done).length && (
                  <span className="badge bg-gold-500/20 text-gold-400 border border-gold-500/30 text-xs">En cours</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent payments */}
      {payments.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2"><CreditCard size={18} className="text-gold-500" />Derniers paiements</h2>
            <Link to="/client/paiements" className="text-gold-400 text-xs hover:text-gold-300">Voir tout →</Link>
          </div>
          <div className="space-y-2">
            {payments.slice(0, 3).map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-white text-sm">{p.description || p.type}</p>
                  <p className="text-dark-400 text-xs">{p.date_paiement ? new Date(p.date_paiement).toLocaleDateString('fr-FR') : '–'}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold text-sm ${['paye', 'confirme'].includes(p.statut) ? 'text-green-400' : 'text-yellow-400'}`}>+{p.montant.toLocaleString('fr-FR')} DT</p>
                  <p className="text-dark-500 text-xs">{['paye', 'confirme'].includes(p.statut) ? '✓ Payé' : '⏳ En attente'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
