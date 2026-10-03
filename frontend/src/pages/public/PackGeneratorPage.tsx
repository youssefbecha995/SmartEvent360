import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, Wand2, Users, Clock, CalendarDays, MapPin, Wallet,
  Check, AlertTriangle, ChevronDown, Loader2, Send, Info, ArrowLeft, Music,
} from 'lucide-react';
import { aiApi, AiProposal, AiProposalItem, AiGenerateResponse, PACK_ITEM_CATEGORIES } from '@/lib/neonApi';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';

const EVENT_TYPES = [
  { value: '', label: 'Détection automatique' },
  { value: 'mariage', label: 'Mariage / Fiançailles' },
  { value: 'corporate', label: 'Corporate / Séminaire' },
  { value: 'fete', label: 'Fête / Anniversaire' },
  { value: 'naissance', label: 'Naissance / Baptême' },
  { value: 'concert', label: 'Concert / Showcase' },
];

const CAT_META: Record<string, { label: string; dot: string }> = {
  lieu:       { label: 'Lieu',       dot: 'bg-amber-500' },
  service:    { label: 'Services',   dot: 'bg-rose-500' },
  equipement: { label: 'Équipement', dot: 'bg-sky-500' },
  personnel:  { label: 'Personnel',  dot: 'bg-emerald-500' },
  instrument: { label: 'Instruments',dot: 'bg-violet-500' },
};

const EXAMPLES = [
  "Je veux un chanteur et de la décoration, une salle pour 100 personnes et le reste au choix, budget 4000 dinars",
  "Mariage à Hammamet pour 120 invités, salle Les Oliviers et Traiteur Le Palais, budget 90000 DT",
  "Séminaire entreprise pour 80 personnes à Tunis avec animateur et traduction, 40000 DT",
  "Anniversaire 40 ans, 60 invités, cocktail et DJ, 25000 DT",
];

export default function PackGeneratorPage() {
  const { t } = useI18n();
  const { error } = useToast();

  const [message, setMessage] = useState('');
  const [typeEvenement, setTypeEvenement] = useState('');
  const [budget, setBudget] = useState('');
  const [nbInvites, setNbInvites] = useState('');
  const [duree, setDuree] = useState('');
  const [ville, setVille] = useState('');
  const [date, setDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiGenerateResponse | null>(null);
  const [openTier, setOpenTier] = useState<string | null>(null);

  const reset = () => {
    setMessage(''); setTypeEvenement(''); setBudget(''); setNbInvites('');
    setDuree(''); setVille(''); setDate(''); setResult(null); setOpenTier(null);
  };

  const submit = async () => {
    if (!message.trim() && !budget) {
      error('Erreur', t('Décrivez votre besoin ou indiquez un budget.'));
      return;
    }
    setLoading(true);
    try {
      const res = await aiApi.generatePacks({
        message: message.trim() || undefined,
        type_evenement: typeEvenement || undefined,
        budget: budget ? Number(budget) : undefined,
        nb_invites: nbInvites ? Number(nbInvites) : undefined,
        duree_heures: duree ? Number(duree) : undefined,
        ville: ville.trim() || undefined,
        date_evenement: date || undefined,
      });
      setResult(res);
      // On ouvre par défaut la première formule qui tient dans le budget :
      // c'est celle que le client peut réellement valider aujourd'hui.
      const cible = res.budget_cible || (budget ? Number(budget) : 0);
      const dansBudget = res.propositions.find(p => (cible > 0 ? p.price <= cible : true));
      setOpenTier((dansBudget ?? res.propositions[0])?.key ?? null);
    } catch (e: any) {
      error('Génération impossible', e.message);
    } finally {
      setLoading(false);
    }
  };

  const groupedByCategory = (p: AiProposal) =>
    PACK_ITEM_CATEGORIES
      .map(cat => ({ cat, items: p.items.filter(i => i.category === cat) }))
      .filter(g => g.items.length > 0);

  return (
    <div className="pt-24 min-h-screen">
      {/* En-tête */}
      <div className="bg-dark-800/50 border-b border-white/10 py-14 px-4 text-center">
        <div className="inline-flex items-center gap-2 bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
          <Wand2 size={13} /> {t('Assistant intelligent')}
        </div>
        <h1 className="section-title mb-4">{t('Pack sur mesure')}</h1>
        <p className="text-dark-300 max-w-2xl mx-auto">
          {t('Décrivez votre événement en quelques mots. Nous composons trois formules à partir de nos tarifs réels et de vos demandes précises.')}
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* ── Formulaire ── */}
        {!result && (
          <>
            <div className="glass rounded-2xl p-6 lg:p-8 border border-white/10">
              <label className="block text-xs font-semibold uppercase tracking-wide text-dark-300 mb-2">
                {t('Votre demande')}
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                placeholder={t('Ex. : mariage pour 120 personnes, salle Les Oliviers et traiteur, budget 55000 DT')}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 resize-y"
              />
              <p className="text-xs text-dark-500 mt-2">
                {t('Le plus naturel : écrivez comme vous le diriez au téléphone. Le budget et le nombre d\'invités sont aussi déduits du texte.')}
              </p>

              {/* Champs complémentaires */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-dark-400 mb-2">
                    <Sparkles size={12} /> {t('Type d\'événement')}
                  </label>
                  <div className="relative">
                    <select
                      value={typeEvenement}
                      onChange={e => setTypeEvenement(e.target.value)}
                      className="w-full appearance-none bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500"
                    >
                      {EVENT_TYPES.map(o => <option key={o.value} value={o.value} className="bg-dark-800">{o.label}</option>)}
                    </select>
                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs text-dark-400 mb-2">
                    <Wallet size={12} /> {t('Budget (DT)')}
                  </label>
                  <input
                    type="number" min={300} value={budget} onChange={e => setBudget(e.target.value)}
                    placeholder="5000"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs text-dark-400 mb-2">
                    <Users size={12} /> {t('Nombre d\'invités')}
                  </label>
                  <input
                    type="number" min={1} value={nbInvites} onChange={e => setNbInvites(e.target.value)}
                    placeholder="120"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs text-dark-400 mb-2">
                    <Clock size={12} /> {t('Durée (heures)')}
                  </label>
                  <input
                    type="number" min={1} max={24} value={duree} onChange={e => setDuree(e.target.value)}
                    placeholder="5"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs text-dark-400 mb-2">
                    <MapPin size={12} /> {t('Ville')}
                  </label>
                  <input
                    type="text" value={ville} onChange={e => setVille(e.target.value)}
                    placeholder="Sousse"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs text-dark-400 mb-2">
                    <CalendarDays size={12} /> {t('Date souhaitée')}
                  </label>
                  <input
                    type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500 [color-scheme:dark]"
                  />
                </div>
              </div>

              <button
                onClick={submit}
                disabled={loading}
                className="btn-gold w-full mt-7 py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><Loader2 size={17} className="animate-spin" /> {t('Génération en cours…')}</>
                ) : (
                  <><Send size={16} /> {t('Générer mes propositions')}</>
                )}
              </button>

              {/* Exemples */}
              <div className="mt-6 pt-5 border-t border-white/10">
                <p className="text-xs text-dark-400 mb-2.5">{t('Exemples de demandes :')}</p>
                <div className="space-y-1.5">
                  {EXAMPLES.map(ex => (
                    <button
                      key={ex}
                      onClick={() => setMessage(ex)}
                      className="w-full text-left text-xs text-dark-300 hover:text-gold-400 hover:bg-white/[0.03] rounded-lg px-3 py-2 transition-colors border border-transparent hover:border-white/10"
                    >
                      « {ex} »
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Résultat ── */}
        {result && (
          <>
            {/* Résumé de la demande comprise */}
            <div className="glass rounded-2xl p-6 border border-gold-500/25 mb-6">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gold-500 font-semibold mb-1">{t('Demande analysée')}</p>
                  <h2 className="text-xl font-display font-bold text-white">
                    {result.brief.type_evenement} · {result.brief.nb_invites} {t('invités')} · {result.brief.duree_heures} h
                  </h2>
                  {result.brief.ville && <p className="text-dark-400 text-sm mt-1">{result.brief.ville}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-widest text-dark-400">{t('Budget cible')}</p>
                  <p className="text-2xl font-bold text-gold-500">
                    {result.budget_cible.toLocaleString('fr-FR')} <span className="text-dark-400 text-base">DT</span>
                  </p>
                  <p className="text-[11px] text-dark-500 mt-0.5">
                    {result.moteur === 'openai' ? t('Compris par IA') : t('Analyse automatique')}
                  </p>
                </div>
              </div>

              {result.brief.demandes_speciales.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-4 border-t border-white/10">
                  {result.brief.demandes_speciales.map((d, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-gold-500/10 border border-gold-500/25 text-gold-300 text-[11px] rounded-full px-2.5 py-1">
                      <Music size={10} /> {d}
                    </span>
                  ))}
                </div>
              )}

              {result.avertissements.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-1.5">
                  {result.avertissements.map((w, i) => (
                    <p key={i} className="flex items-start gap-2 text-xs text-amber-300/90">
                      <Info size={13} className="flex-shrink-0 mt-0.5" /> {w}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Les trois formules */}
            <div className="space-y-4 mb-8">
              {result.propositions.map(p => (
                <ProposalCard
                  key={p.key}
                  proposal={p}
                  budgetCible={result.budget_cible}
                  open={openTier === p.key}
                  onToggle={() => setOpenTier(openTier === p.key ? null : p.key)}
                  grouped={groupedByCategory(p)}
                />
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={reset} className="btn-ghost py-3 px-8 flex items-center justify-center gap-2">
                <ArrowLeft size={15} /> {t('Modifier ma demande')}
              </button>
              <Link to="/contact" className="btn-gold py-3 px-8 flex items-center justify-center gap-2">
                <Check size={15} /> {t('Valider avec un conseiller')}
              </Link>
            </div>
            <p className="text-center text-xs text-dark-500 mt-4">
              {t('Référence de votre demande :')} <span className="text-dark-300 font-mono">{result.reference}</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function ProposalCard({
  proposal: p, budgetCible, open, onToggle, grouped,
}: {
  proposal: AiProposal;
  budgetCible: number;
  open: boolean;
  onToggle: () => void;
  grouped: { cat: string; items: AiProposalItem[] }[];
}) {
  const { t } = useI18n();
  const drift = budgetCible > 0 ? ((p.price - budgetCible) / budgetCible) * 100 : 0;

  return (
    <div className={`glass rounded-2xl border overflow-hidden transition-colors ${
      p.badge ? 'border-gold-500/50' : 'border-white/10'
    }`}>
      <button onClick={onToggle} className="w-full p-5 lg:p-6 text-left flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-white/[0.02] transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-lg font-display font-bold text-white">{p.name}</h3>
            {p.badge && (
              <span className="bg-gold-500 text-dark-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full">{p.badge}</span>
            )}
          </div>
          <p className="text-xs text-dark-400 flex items-center gap-3 flex-wrap">
            <span>{p.items.length} {t('prestations')}</span>
            <span>·</span>
            <span>{p.duration} h</span>
            <span>·</span>
            <span>{t("Jusqu'à")} {p.maxGuests} {t('invités')}</span>
          </p>
        </div>

        <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-0.5">
          <p className="text-2xl font-bold text-white">
            {p.price.toLocaleString('fr-FR')} <span className="text-dark-400 text-base">DT</span>
          </p>
          <p className={`text-[11px] font-medium ${drift > 0 ? 'text-emerald-400' : drift < 0 ? 'text-dark-400' : 'text-gold-500'}`}>
            {drift === 0 ? t('exactement votre budget') : `${drift > 0 ? '+' : ''}${drift.toFixed(0)} % ${t('par rapport au budget')}`}
          </p>
        </div>

        <ChevronDown size={18} className={`text-dark-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-white/10 p-5 lg:p-6">
          <p className="text-sm text-dark-300 leading-relaxed mb-5">{p.description}</p>

          {/* Détail par catégorie */}
          <div className="space-y-5">
            {grouped.map(g => (
              <div key={g.cat}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={`w-2 h-2 rounded-full ${CAT_META[g.cat]?.dot ?? 'bg-dark-500'}`} />
                  <p className="text-xs font-semibold uppercase tracking-wide text-dark-300">
                    {CAT_META[g.cat]?.label ?? g.cat}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {g.items.map((it, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 bg-white/[0.03] rounded-xl px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="text-xs text-white flex items-center gap-1.5 flex-wrap">
                          {it.name}
                          {it.sur_demande && (
                            <span className="bg-gold-500/15 text-gold-400 text-[9px] px-1.5 py-0.5 rounded border border-gold-500/25">
                              {t('votre demande')}
                            </span>
                          )}
                        </p>
                        {it.defaultValue && (
                          <p className="text-[11px] text-dark-500 mt-0.5">{it.defaultValue}</p>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-white flex-shrink-0">
                        {it.unitPrice.toLocaleString('fr-FR')} <span className="text-dark-500 font-normal">DT</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
            <p className="text-xs text-dark-400">{t('Total')}</p>
            <p className="text-lg font-bold text-gold-500">
              {p.price.toLocaleString('fr-FR')} <span className="text-dark-400 text-sm">DT</span>
            </p>
          </div>

          {p.avertissements.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {p.avertissements.map((w, i) => (
                <p key={i} className="flex items-start gap-2 text-xs text-amber-300/90">
                  <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" /> {w}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
