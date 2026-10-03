import { useEffect, useState } from 'react';
import {
  Sparkles, Filter, ChevronDown, Loader2, Check, Package,
  Users, Wallet, MapPin, Clock, Save, Wand2, Eye,
} from 'lucide-react';
import {
  aiApi, AiPropositionRecord, PropositionStatut, AiProposal, PACK_ITEM_CATEGORIES,
} from '@/lib/neonApi';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import PageHeader from '@/components/ui/PageHeader';

const STATUTS: Array<{ value: PropositionStatut | ''; label: string; color: string }> = [
  { value: '',         label: 'Toutes',  color: 'bg-slate-500' },
  { value: 'nouvelle', label: 'Nouvelles', color: 'bg-sky-500' },
  { value: 'en_cours', label: 'En cours',  color: 'bg-amber-500' },
  { value: 'converti', label: 'Converties', color: 'bg-emerald-500' },
  { value: 'refuse',   label: 'Refusées',  color: 'bg-rose-500' },
  { value: 'archive',  label: 'Archivées', color: 'bg-slate-500' },
];

const CAT_META: Record<string, { label: string; dot: string }> = {
  lieu:       { label: 'Lieu',        dot: 'bg-amber-500' },
  service:    { label: 'Services',    dot: 'bg-rose-500' },
  equipement: { label: 'Équipement',  dot: 'bg-sky-500' },
  personnel:  { label: 'Personnel',   dot: 'bg-emerald-500' },
  instrument: { label: 'Instruments', dot: 'bg-violet-500' },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function AdminPropositions() {
  const { success, error } = useToast();

  const [records, setRecords] = useState<AiPropositionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PropositionStatut | ''>('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async (statut?: PropositionStatut | '') => {
    setLoading(true);
    try {
      setRecords(await aiApi.listPropositions(statut || undefined));
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter); }, [filter]);

  const changeStatut = async (rec: AiPropositionRecord, statut: PropositionStatut) => {
    try {
      const updated = await aiApi.updateProposition(rec.id, { statut });
      setRecords(prev => prev.map(r => (r.id === rec.id ? { ...r, ...updated } : r)));
      success('Statut mis à jour', `${rec.reference} → ${statut}`);
    } catch (e: any) {
      error('Erreur', e.message);
    }
  };

  const saveNotes = async (rec: AiPropositionRecord) => {
    const value = notes[rec.id] ?? rec.notes ?? '';
    if (value === (rec.notes ?? '')) return;
    try {
      const updated = await aiApi.updateProposition(rec.id, { notes: value });
      setRecords(prev => prev.map(r => (r.id === rec.id ? { ...r, ...updated } : r)));
      success('Notes enregistrées', rec.reference);
    } catch (e: any) {
      error('Erreur', e.message);
    }
  };

  const toggle = (id: string) => setExpanded(expanded === id ? null : id);

  const countBy = (s: PropositionStatut) => records.filter(r => r.statut === s).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Propositions IA"
        subtitle="Demandes de packs sur mesure générées automatiquement"
        action={<span className="inline-flex items-center gap-1.5 text-xs text-dark-400 bg-white/[0.04] border border-white/10 rounded-full px-3 py-1.5">
          <Sparkles size={12} className="text-gold-500" /> {records.length} au total
        </span>}
      />

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-dark-400" />
        {STATUTS.map(s => {
          const n = s.value ? countBy(s.value) : records.length;
          return (
            <button
              key={s.value || 'all'}
              onClick={() => setFilter(s.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                filter === s.value
                  ? 'bg-gold-500 text-dark-900 border-gold-500'
                  : 'bg-white/[0.04] text-dark-300 border-white/10 hover:border-white/25'
              }`}
            >
              {s.label} <span className="opacity-70">({n})</span>
            </button>
          );
        })}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : records.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Sparkles size={32} className="text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">Aucune proposition pour le moment.</p>
          <p className="text-dark-500 text-xs mt-1">
            Elles apparaissent dès qu'un visiteur utilise le générateur de packs sur mesure.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(rec => {
            const isOpen = expanded === rec.id;
            const statusMeta = STATUTS.find(s => s.value === rec.statut) ?? STATUTS[1];

            return (
              <div key={rec.id} className="glass rounded-2xl border border-white/10 overflow-hidden">
                {/* En-tête */}
                <div className="p-4 lg:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="font-mono text-xs text-gold-500 font-semibold">{rec.reference}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full text-white ${statusMeta.color}`}>
                          {rec.statut}
                        </span>
                        {rec.pack_id && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <Package size={9} /> {rec.pack_name || 'Pack créé'}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-white mb-2 line-clamp-2">
                        {rec.brief?.message || '(aucun message)'}
                      </p>

                      <div className="flex flex-wrap gap-3 text-[11px] text-dark-400">
                        <span className="inline-flex items-center gap-1">
                          <Users size={11} /> {rec.brief?.nb_invites} invités
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Wallet size={11} /> {rec.budget_cible?.toLocaleString('fr-FR')} DT
                        </span>
                        <span className="inline-flex items-center gap-1 capitalize">
                          {rec.brief?.type_evenement}
                        </span>
                        {rec.brief?.ville && (
                          <span className="inline-flex items-center gap-1"><MapPin size={11} /> {rec.brief.ville}</span>
                        )}
                        <span className="inline-flex items-center gap-1"><Clock size={11} /> {fmtDateTime(rec.created_at)}</span>
                        {rec.client_nom && <span className="text-gold-400">{rec.client_nom}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                      <select
                        value={rec.statut}
                        onChange={e => changeStatut(rec, e.target.value as PropositionStatut)}
                        className="bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-gold-500"
                      >
                        {STATUTS.filter(s => s.value).map(s => (
                          <option key={s.value} value={s.value} className="bg-dark-800">{s.label}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => toggle(rec.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-dark-200 hover:border-gold-500/40 transition-colors"
                      >
                        <Eye size={13} /> Détail
                        <ChevronDown size={13} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {rec.statut !== 'converti' && (
                        <button
                          onClick={() => setExpanded(rec.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-500 text-dark-900 text-xs font-semibold hover:bg-gold-600 transition-colors"
                        >
                          <Wand2 size={13} /> Convertir
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Détail */}
                {isOpen && (
                  <div className="border-t border-white/10 p-4 lg:p-5 bg-black/10">
                    <PropositionDetail rec={rec} onDone={(id) => load(filter)} />

                    <div className="mt-5 pt-4 border-t border-white/10">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-dark-400 mb-2">
                        Notes internes
                      </label>
                      <textarea
                        value={notes[rec.id] ?? rec.notes ?? ''}
                        onChange={e => setNotes(prev => ({ ...prev, [rec.id]: e.target.value }))}
                        rows={2}
                        placeholder="Suivi commercial, rappel client, contraintes…"
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-dark-500 focus:outline-none focus:border-gold-500 resize-y"
                      />
                      <button
                        onClick={() => saveNotes(rec)}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-xs text-dark-200 hover:border-gold-500/40 transition-colors"
                      >
                        <Save size={13} /> Enregistrer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Détail d'une proposition + conversion en vrai pack. */
function PropositionDetail({ rec, onDone }: { rec: AiPropositionRecord; onDone: (id: string) => void }) {
  const { success, error } = useToast();
  const propositions: AiProposal[] = Array.isArray(rec.propositions) ? rec.propositions : [];

  const [chosenKey, setChosenKey] = useState<string>(rec.proposition_retenue || propositions[0]?.key || '');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);

  const chosen = propositions.find(p => p.key === chosenKey) ?? propositions[0];

  useEffect(() => {
    if (chosen) {
      setName(chosen.name);
      setPrice(String(chosen.price));
    }
  }, [chosenKey]);

  const convert = async () => {
    if (!chosen) return;
    setSaving(true);
    try {
      const res = await aiApi.convertProposition(rec.id, {
        key: chosen.key,
        name: name.trim() || undefined,
        price: price ? Number(price) : undefined,
        imageUrl: imageUrl.trim() || undefined,
        isActive,
      });
      success('Pack créé ✓', `${res.pack.name} — publication ${isActive ? 'active' : 'désactivée'}`);
      setImageUrl('');
      onDone(rec.id);
    } catch (e: any) {
      error('Conversion impossible', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!chosen) return <p className="text-xs text-dark-500">Aucune formule dans cette proposition.</p>;

  return (
    <div className="space-y-5">
      {/* Choix de la formule */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-dark-400 mb-2.5">
          Formule à convertir
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {propositions.map(p => {
            const active = p.key === chosenKey;
            return (
              <button
                key={p.key}
                onClick={() => setChosenKey(p.key)}
                className={`text-left rounded-xl border p-3 transition-colors ${
                  active ? 'border-gold-500 bg-gold-500/[0.07]' : 'border-white/10 hover:border-white/25'
                }`}
              >
                <p className={`text-xs font-semibold ${active ? 'text-gold-400' : 'text-white'}`}>{p.tier}</p>
                <p className="text-sm font-bold text-white mt-0.5">
                  {p.price.toLocaleString('fr-FR')} <span className="text-dark-400 text-xs">DT</span>
                </p>
                <p className="text-[10px] text-dark-500 mt-0.5">{p.items.length} prestations</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Détail des lignes */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-dark-400 mb-2.5">
          Détail du devis
        </p>
        <div className="space-y-3">
          {PACK_ITEM_CATEGORIES.map(cat => {
            const items = chosen.items.filter(i => i.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${CAT_META[cat]?.dot ?? 'bg-dark-500'}`} />
                  <span className="text-[11px] text-dark-400">{CAT_META[cat]?.label ?? cat}</span>
                </div>
                <div className="space-y-1">
                  {items.map((it, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 bg-white/[0.03] rounded-lg px-3 py-1.5">
                      <span className="text-xs text-dark-200 truncate">
                        {it.name}
                        {it.sur_demande && <span className="text-gold-500 text-[10px] ml-1.5">· demandé</span>}
                      </span>
                      <span className="text-xs text-white flex-shrink-0">
                        {it.unitPrice.toLocaleString('fr-FR')} <span className="text-dark-500">DT</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Surcharges avant enregistrement */}
      <div className="pt-4 border-t border-white/10">
        <p className="text-xs font-semibold uppercase tracking-wide text-dark-400 mb-3">
          Avant d'enregistrer (facultatif)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-[11px] text-dark-400 mb-1.5">Nom du pack</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-dark-400 mb-1.5">Prix (DT)</label>
            <input
              type="number" value={price} onChange={e => setPrice(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-dark-400 mb-1.5">Image (URL)</label>
            <input
              value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://…"
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-dark-600 focus:outline-none focus:border-gold-500"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input
            type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
            className="w-3.5 h-3.5 accent-[#C9A227]"
          />
          <span className="text-xs text-dark-300">
            Publier immédiatement sur le site
            <span className="text-dark-500"> (par défaut désactivé, à relire avant mise en ligne)</span>
          </span>
        </label>

        <button
          onClick={convert}
          disabled={saving}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gold-500 text-dark-900 text-xs font-semibold hover:bg-gold-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Créer le pack dans le catalogue
        </button>
      </div>
    </div>
  );
}
