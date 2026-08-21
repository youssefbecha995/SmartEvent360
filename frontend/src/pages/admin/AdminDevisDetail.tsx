import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Save, FileDown, Send, FileCheck2,
  CalendarDays, Package, Wrench, Users, Edit2, X, Eye,
  Printer, Copy, CheckCircle, XCircle, Clock, AlertCircle,
  User, Mail, Phone, MapPin, Building, DollarSign, TrendingUp,
  Loader2, CreditCard, Receipt, FileText, Settings
} from 'lucide-react';
import { crmApi } from '@/lib/crmApi';
import { usersApi, eventsApi, packsApi, type NeonPack } from '@/lib/neonApi';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatPrice } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';

// ─── INTERFACES ──────────────────────────────────────────────────────────────
interface Line {
  id?: string;
  _key: string;
  description: string;
  quantite: number;
  prix_unitaire: number;
  remise: number;
  source?: string;
  source_id?: string;
  source_label?: string;
}

interface ClientInfo {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  company?: string;
}

// ─── STATUTS ──────────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  brouillon: { label: 'Brouillon', color: 'bg-dark-600 text-dark-300 border-dark-600', icon: FileText },
  envoye: { label: 'Envoyé', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Send },
  accepte: { label: 'Accepté', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  refuse: { label: 'Refusé', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
  converti: { label: 'Converti', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: FileCheck2 },
};

const emptyLine = (): Line => ({
  _key: Math.random().toString(36).slice(2),
  description: '',
  quantite: 1,
  prix_unitaire: 0,
  remise: 0,
});

const lineTotal = (l: Line) => Math.round(l.quantite * l.prix_unitaire * (1 - (l.remise || 0) / 100) * 100) / 100;

const catalogLine = (source: string, source_id: string, source_label: string, description: string, prix: number): Line => ({
  _key: Math.random().toString(36).slice(2),
  description,
  quantite: 1,
  prix_unitaire: prix,
  remise: 0,
  source,
  source_id,
  source_label,
});

const personnelUnitLabel = (p: any) => p?.mode_paiement === 'jour' ? '/jour' : p?.mode_paiement === '2jours' ? '/2 jours' : '/mois';

const buildEventLines = (rec: any, pk: NeonPack[], eqs: any[], pes: any[]): Line[] => {
  const ls: Line[] = [];
  (rec?.packs || []).forEach((id: string) => {
    const p = pk.find(x => x.id === id);
    if (p) ls.push(catalogLine('pack', p.id, 'Pack', p.name, p.price));
  });
  (rec?.equipments || []).forEach((e: any) => {
    const id = typeof e === 'string' ? e : e?.id;
    const qty = typeof e === 'string' ? 1 : Number(e?.quantite) || 1;
    const eq = eqs.find(x => x.id === id);
    if (eq) {
      const line = catalogLine('equipement', eq.id, 'Équipement', eq.nom || 'Équipement', Number(eq.prix_location) || 0);
      line.quantite = qty;
      ls.push(line);
    }
  });
  (rec?.personnel || []).forEach((id: string) => {
    const p = pes.find(x => x.id === id);
    if (p) ls.push(catalogLine('personnel', p.id, 'Personnel', `${p.prenom || ''} ${p.nom || ''}`.trim() || 'Personnel', Number(p.salaire) || 0));
  });
  return ls;
};

export default function AdminDevisDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  // ─── État principal ──────────────────────────────────────────────────────
  const [devis, setDevis] = useState<any | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [remiseGlobale, setRemiseGlobale] = useState(0);
  const [conditions, setConditions] = useState('');
  const [notes, setNotes] = useState('');
  const [dateExpiration, setDateExpiration] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // ─── Données liées ──────────────────────────────────────────────────────
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [eventDetails, setEventDetails] = useState<any | null>(null);
  const [packs, setPacks] = useState<NeonPack[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [quoteHistory, setQuoteHistory] = useState<any[]>([]);

  // ─── Chargement ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [dv, pk, eq, pe, hist] = await Promise.all([
          crmApi.get('devis', id),
          packsApi.list().catch(() => [] as NeonPack[]),
          crmApi.list('equipment').catch(() => []),
          crmApi.list('personnel').catch(() => []),
          crmApi.list('quote_history').catch(() => []),
        ]);

        setPacks(pk);
        setEquipments(eq);
        setPersonnel(pe);
        setDevis(dv);
        setRemiseGlobale(dv?.remise_globale || 0);
        setConditions(dv?.conditions || '');
        setNotes(dv?.notes || '');
        setDateExpiration(dv?.date_expiration || '');

        // Historique
        setQuoteHistory((hist || []).filter((h: any) => h.quote_id === id));

        // Lignes
        const initialLines: Line[] = (dv?.lignes || []).map((l: any) => ({
          ...l,
          _key: l._key || l.id || Math.random().toString(36).slice(2),
        }));
        setLines(initialLines);

        // Client
        if (dv?.client_id) {
          try {
            const u = await usersApi.get(dv.client_id);
            setClientInfo({
              id: u.id,
              name: `${u.prenom || ''} ${u.nom || ''}`.trim() || u.name,
              email: u.email,
              phone: u.phone || undefined,
              city: u.city || undefined,
              company: u.company || undefined,
            });
          } catch {}
        }

        // Événement
        if (dv?.event_id) {
          const ev = await eventsApi.get(dv.event_id).catch(() => null);
          if (ev) {
            setEventDetails(ev);
            if (initialLines.length === 0) {
              const recs = await crmApi.list('event_prestations').catch(() => []);
              const rec = recs.find((r: any) => r.event_id === dv.event_id);
              let built = rec ? buildEventLines(rec, pk, eq, pe) : [];
              if (built.length === 0 && ev && Number(ev.price) > 0) {
                built = [catalogLine('evenement', ev.id, 'Événement', `Tarif événement · ${ev.title}`, Number(ev.price))];
              }
              if (built.length) setLines(built);
            }
          }
        }
      } catch (e) {
        console.error('[AdminDevisDetail] load error:', e);
        toastError('Erreur', 'Impossible de charger le devis');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  // ─── Calculs ──────────────────────────────────────────────────────────────
  const sousTotal = useMemo(() => lines.reduce((a, l) => a + lineTotal(l), 0), [lines]);
  const remiseAmount = useMemo(() => Math.round(sousTotal * (remiseGlobale || 0) / 100 * 100) / 100, [sousTotal, remiseGlobale]);
  const montantHt = useMemo(() => Math.round((sousTotal - remiseAmount) * 100) / 100, [sousTotal, remiseAmount]);
  const montantTva = useMemo(() => Math.round(montantHt * 0.20 * 100) / 100, [montantHt]);
  const montantTtc = useMemo(() => Math.round((montantHt + montantTva) * 100) / 100, [montantHt, montantTva]);

  // ─── CRUD Lignes ──────────────────────────────────────────────────────────
  const updateLine = (key: string, patch: Partial<Line>) => {
    setLines(prev => prev.map(l => l._key === key ? { ...l, ...patch } : l));
  };

  const addLine = () => setLines(prev => [...prev, emptyLine()]);

  const addCatalogLine = (line: Line) => setLines(prev => [...prev, line]);

  const removeLine = (key: string) => {
    setLines(prev => prev.filter(l => l._key !== key));
  };

  const duplicateLine = (key: string) => {
    const line = lines.find(l => l._key === key);
    if (line) {
      const newLine = { ...line, _key: Math.random().toString(36).slice(2) };
      setLines(prev => [...prev, newLine]);
    }
  };

  // ─── Import événement ────────────────────────────────────────────────────
  const handleImportEvent = async () => {
    if (!devis?.event_id) return;
    try {
      const recs = await crmApi.list('event_prestations').catch(() => []);
      const rec = recs.find((r: any) => r.event_id === devis.event_id);
      let built = rec ? buildEventLines(rec, packs, equipments, personnel) : [];
      if (built.length === 0 && eventDetails && Number(eventDetails.price) > 0) {
        built = [catalogLine('evenement', eventDetails.id, 'Événement', `Tarif événement · ${eventDetails.title}`, Number(eventDetails.price))];
      }
      if (built.length) {
        setLines(built);
        setMessage('Prestations importées depuis l\'événement ✓');
        setTimeout(() => setMessage(''), 2500);
        success('Importé avec succès');
      } else {
        toastError('Erreur', 'Aucune prestation à importer');
      }
    } catch (e) {
      toastError('Erreur', 'Impossible d\'importer');
    }
  };

  // ─── Sauvegarde ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!devis) return;
    setSaving(true);
    setMessage('');

    const lignes = lines.map((l: any) => ({
      description: l.description,
      quantite: l.quantite,
      prix_unitaire: l.prix_unitaire,
      remise: l.remise,
      total: lineTotal(l),
      ...(l.source ? { source: l.source, source_id: l.source_id, source_label: l.source_label } : {}),
    }));

    try {
      const updated = await crmApi.update('devis', devis.id, {
        remise_globale: remiseGlobale,
        montant_ht: montantHt,
        montant_tva: montantTva,
        montant_ttc: montantTtc,
        conditions,
        notes,
        date_expiration: dateExpiration || null,
        lignes,
      });

      setDevis((p: any) => ({
        ...p,
        ...updated,
        remise_globale: remiseGlobale,
        montant_ht: montantHt,
        montant_tva: montantTva,
        montant_ttc: montantTtc,
        conditions,
        notes,
        date_expiration: dateExpiration,
        lignes,
      }));
      setMessage('Devis enregistré ✓');
      success('Devis enregistré');
    } catch (e: any) {
      toastError('Erreur', e.message);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 2500);
    }
  };

  // ─── Actions ──────────────────────────────────────────────────────────────
  const handleSend = async () => {
    await handleSave();
    try {
      await crmApi.update('devis', devis.id, { statut: 'envoye' });
      setDevis((p: any) => ({ ...p, statut: 'envoye' }));
      setMessage('Devis envoyé au client ✓');
      success('Devis envoyé');
    } catch (e: any) {
      toastError('Erreur', e.message);
    }
    setTimeout(() => setMessage(''), 2500);
  };

  const handleConvert = async () => {
    if (!devis || devis.statut !== 'accepte') return;
    try {
      const existing = await crmApi.list('contracts').catch(() => []);
      const reference = `CT-${new Date().getFullYear()}-${String((existing?.length || 0) + 1).padStart(3, '0')}`;
      await crmApi.create('contracts', {
        reference,
        devis_id: devis.id,
        client_id: devis.client_id,
        event_id: devis.event_id,
        statut: 'en_signature',
        created_at: new Date().toISOString(),
      });
      await crmApi.update('devis', devis.id, { statut: 'converti' });
      setDevis((p: any) => ({ ...p, statut: 'converti' }));
      setMessage(`Contrat ${reference} créé ✓`);
      success('Contrat créé', reference);
    } catch (e: any) {
      toastError('Erreur', e.message);
    }
    setTimeout(() => setMessage(''), 3000);
  };

  // ─── PDF ──────────────────────────────────────────────────────────────────
  const handlePdf = async () => {
    await handleSave();
    const w = window.open('', '_blank');
    if (!w) return;

    const linesHtml = lines.map(l => `
      <tr>
        <td>${l.description}</td>
        <td class="right">${l.quantite}</td>
        <td class="right">${l.prix_unitaire.toLocaleString('fr-FR')} DT</td>
        <td class="right">${l.remise || 0}%</td>
        <td class="right">${lineTotal(l).toLocaleString('fr-FR')} DT</td>
      </tr>
    `).join('');

    w.document.write(`
      <html>
        <head>
          <title>${devis.reference}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
            h1 { color: #B8860B; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .company { font-size: 24px; font-weight: bold; color: #B8860B; }
            .info { color: #666; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; font-size: 14px; }
            th { color: #666; text-transform: uppercase; font-size: 11px; }
            .right { text-align: right; }
            .totals { margin-top: 20px; width: 300px; margin-left: auto; }
            .totals div { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
            .totals .ttc { font-weight: bold; font-size: 18px; border-top: 2px solid #B8860B; padding-top: 8px; margin-top: 6px; }
            .footer { margin-top: 40px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
            .conditions { margin-top: 30px; background: #f9f9f9; padding: 15px; border-radius: 5px; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">SMARTEVENT360</div>
              <div class="info">Devis N° <strong>${devis.reference}</strong></div>
            </div>
            <div class="info" style="text-align:right;">
              Émis le : ${new Date(devis.date_emission).toLocaleDateString('fr-FR')}<br/>
              Expire le : ${devis.date_expiration ? new Date(devis.date_expiration).toLocaleDateString('fr-FR') : '–'}
            </div>
          </div>

          <div class="info" style="margin-bottom:20px;">
            <strong>Client :</strong> ${clientInfo?.name || '–'}<br/>
            ${clientInfo?.email ? `Email : ${clientInfo.email}` : ''}
            ${clientInfo?.phone ? ` · Tél : ${clientInfo.phone}` : ''}
            ${clientInfo?.city ? ` · ${clientInfo.city}` : ''}
          </div>

          ${eventDetails ? `
            <div style="background:#f5f5f5;padding:10px 15px;border-radius:5px;margin-bottom:20px;font-size:13px;">
              <strong>Événement :</strong> ${eventDetails.title}
              ${eventDetails.date ? ` · ${new Date(eventDetails.date).toLocaleDateString('fr-FR')}` : ''}
              ${eventDetails.location ? ` · ${eventDetails.location}` : ''}
            </div>
          ` : ''}

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="right">Qté</th>
                <th class="right">Prix U.</th>
                <th class="right">Remise</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${linesHtml}
            </tbody>
          </table>

          <div class="totals">
            <div><span>Sous-total HT</span><span>${sousTotal.toLocaleString('fr-FR')} DT</span></div>
            <div><span>Remise (${remiseGlobale}%)</span><span>-${remiseAmount.toLocaleString('fr-FR')} DT</span></div>
            <div><span>TVA (20%)</span><span>${montantTva.toLocaleString('fr-FR')} DT</span></div>
            <div class="ttc"><span>TOTAL TTC</span><span>${montantTtc.toLocaleString('fr-FR')} DT</span></div>
          </div>

          ${conditions ? `
            <div class="conditions">
              <strong>Conditions :</strong><br/>
              ${conditions.replace(/\n/g, '<br/>')}
            </div>
          ` : ''}

          <div class="footer">
            Merci de votre confiance. <br/>
            SmartEvent360 - ${new Date().getFullYear()}
          </div>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();

    try {
      await crmApi.update('devis', devis.id, { pdf_path: `devis-${devis.reference}.pdf` });
    } catch {}
  };

  // ─── RENDU ──────────────────────────────────────────────────────────────────
  if (loading) return <div className="glass rounded-2xl h-64 animate-pulse" />;
  if (!devis) return <div className="text-dark-400">Devis introuvable.</div>;

  const status = statusConfig[devis.statut] || statusConfig.brouillon;

  return (
    <div>
      <button
        onClick={() => navigate('/admin/devis')}
        className="flex items-center gap-1.5 text-dark-400 hover:text-white text-sm mb-4"
      >
        <ArrowLeft size={15} /> Retour aux devis
      </button>

      <PageHeader
        title={`Devis ${devis.reference}`}
        subtitle={`${clientInfo?.name || '–'}${eventDetails ? ' · ' + eventDetails.title : ''}`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={devis.statut} />
            <span className="text-gold-400 font-bold text-sm">
              {formatPrice(montantTtc)}
            </span>
          </div>
        }
      />

      {message && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-xl px-4 py-2.5 flex items-center gap-2">
          <CheckCircle size={16} /> {message}
        </div>
      )}

      {/* ─── INFOS ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass rounded-2xl p-4">
          <p className="text-dark-400 text-xs mb-1">Date d'émission</p>
          <p className="text-white text-sm font-medium">
            {new Date(devis.date_emission).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-dark-400 text-xs mb-1">Date d'expiration</p>
          <input
            type="date"
            value={dateExpiration ? dateExpiration.slice(0, 10) : ''}
            onChange={e => setDateExpiration(e.target.value)}
            className="bg-transparent text-white text-sm focus:outline-none w-full font-medium"
          />
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-dark-400 text-xs mb-1">Client</p>
          <p className="text-white text-sm font-medium">{clientInfo?.name || '–'}</p>
          {clientInfo?.email && (
            <p className="text-dark-400 text-xs flex items-center gap-1">
              <Mail size={10} /> {clientInfo.email}
            </p>
          )}
        </div>
      </div>

      {/* ─── CATALOGUE ──────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Package size={16} className="text-gold-500" />
            Catalogue — ajout rapide
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-dark-500 text-xs">Cliquez pour ajouter au devis</span>
            {devis.event_id && (
              <button
                onClick={handleImportEvent}
                className="btn-ghost text-xs py-1 px-3 flex items-center gap-1"
              >
                <FileDown size={12} /> Importer depuis l'événement
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Packs */}
          <div className="bg-dark-700/60 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package size={14} className="text-gold-500" />
              <h4 className="text-dark-200 text-xs font-semibold uppercase tracking-wider">Packs</h4>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {packs.length === 0 && <p className="text-dark-600 text-xs">Aucun pack actif</p>}
              {packs.map(p => (
                <button
                  key={p.id}
                  onClick={() => addCatalogLine(catalogLine('pack', p.id, 'Pack', p.name, p.price))}
                  className="w-full text-left bg-dark-800 border border-dark-600 hover:border-gold-500/40 rounded-lg px-3 py-2 transition-all"
                >
                  <p className="text-white text-sm font-medium truncate">{p.name}</p>
                  <p className="text-gold-400 text-xs">{formatPrice(p.price)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Équipements */}
          <div className="bg-dark-700/60 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wrench size={14} className="text-gold-500" />
              <h4 className="text-dark-200 text-xs font-semibold uppercase tracking-wider">Équipements</h4>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {equipments.length === 0 && <p className="text-dark-600 text-xs">Aucun équipement</p>}
              {equipments.map(eq => (
                <button
                  key={eq.id}
                  onClick={() => addCatalogLine(catalogLine('equipement', eq.id, 'Équipement', eq.nom || 'Équipement', Number(eq.prix_location) || 0))}
                  className="w-full text-left bg-dark-800 border border-dark-600 hover:border-gold-500/40 rounded-lg px-3 py-2 transition-all"
                >
                  <p className="text-white text-sm font-medium truncate">{eq.nom}</p>
                  <p className="text-gold-400 text-xs">{formatPrice(eq.prix_location)}/jour</p>
                </button>
              ))}
            </div>
          </div>

          {/* Personnel */}
          <div className="bg-dark-700/60 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users size={14} className="text-gold-500" />
              <h4 className="text-dark-200 text-xs font-semibold uppercase tracking-wider">Personnel</h4>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {personnel.length === 0 && <p className="text-dark-600 text-xs">Aucun personnel</p>}
              {personnel.map(p => (
                <button
                  key={p.id}
                  onClick={() => addCatalogLine(catalogLine('personnel', p.id, 'Personnel', `${p.prenom || ''} ${p.nom || ''}`.trim() || 'Personnel', Number(p.salaire) || 0))}
                  className="w-full text-left bg-dark-800 border border-dark-600 hover:border-gold-500/40 rounded-lg px-3 py-2 transition-all"
                >
                  <p className="text-white text-sm font-medium truncate">
                    {[p.prenom, p.nom].filter(Boolean).join(' ') || 'Personnel'}
                  </p>
                  <p className="text-gold-400 text-xs">{formatPrice(p.salaire)} {personnelUnitLabel(p)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Services */}
          <div className="bg-dark-700/60 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={14} className="text-gold-500" />
              <h4 className="text-dark-200 text-xs font-semibold uppercase tracking-wider">Services</h4>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              <button
                onClick={() => addCatalogLine(catalogLine('prestation', 'custom', 'Service', 'Prestation personnalisée', 0))}
                className="w-full text-left bg-dark-800 border border-dark-600 hover:border-gold-500/40 rounded-lg px-3 py-2 transition-all"
              >
                <p className="text-white text-sm font-medium">➕ Prestation personnalisée</p>
                <p className="text-dark-400 text-xs">Ajouter un service sur mesure</p>
              </button>
              {eventDetails && Number(eventDetails.price) > 0 && (
                <button
                  onClick={() => addCatalogLine(catalogLine('evenement', eventDetails.id, 'Événement', `Tarif événement · ${eventDetails.title}`, Number(eventDetails.price)))}
                  className="w-full text-left bg-dark-800 border border-dark-600 hover:border-gold-500/40 rounded-lg px-3 py-2 transition-all"
                >
                  <p className="text-white text-sm font-medium truncate">📅 {eventDetails.title}</p>
                  <p className="text-gold-400 text-xs">{formatPrice(eventDetails.price)}</p>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── TABLEAU DES LIGNES ────────────────────────────────────────────── */}
      <div className="glass rounded-2xl overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Description', 'Qté', 'Prix U. (DT)', 'Remise (%)', 'Total', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-dark-400 text-xs font-medium uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map(l => (
                <tr key={l._key} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-2.5">
                    <input
                      value={l.description}
                      onChange={e => updateLine(l._key, { description: e.target.value })}
                      className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gold-500"
                      placeholder="Description..."
                    />
                    {l.source_label && (
                      <span className="block mt-1 text-[10px] text-purple-300/70">{l.source_label}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      min={1}
                      value={l.quantite}
                      onChange={e => updateLine(l._key, { quantite: parseInt(e.target.value) || 0 })}
                      className="w-20 bg-dark-700 border border-dark-500 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gold-500"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={l.prix_unitaire}
                      onChange={e => updateLine(l._key, { prix_unitaire: parseFloat(e.target.value) || 0 })}
                      className="w-28 bg-dark-700 border border-dark-500 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gold-500"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={l.remise}
                      onChange={e => updateLine(l._key, { remise: parseFloat(e.target.value) || 0 })}
                      className="w-20 bg-dark-700 border border-dark-500 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gold-500"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-white font-semibold text-sm whitespace-nowrap">
                    {formatPrice(lineTotal(l))}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => duplicateLine(l._key)}
                        className="p-1.5 rounded-lg text-dark-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                        title="Dupliquer"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => removeLine(l._key)}
                        className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={addLine}
          className="w-full flex items-center justify-center gap-2 py-3 text-gold-500 hover:bg-white/5 text-sm font-medium transition-all"
        >
          <Plus size={15} /> Ajouter une ligne
        </button>
      </div>

      {/* ─── TOTAUX ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="glass rounded-2xl p-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-dark-400">Sous-total HT</span>
            <span className="text-white font-medium">{formatPrice(sousTotal)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-dark-400">Remise globale (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={remiseGlobale}
              onChange={e => setRemiseGlobale(parseFloat(e.target.value) || 0)}
              className="w-20 bg-dark-700 border border-dark-500 rounded-lg px-2 py-1 text-right text-white focus:outline-none focus:border-gold-500"
            />
          </div>
          <div className="flex justify-between text-red-400">
            <span>Remise</span>
            <span>-{formatPrice(remiseAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-2 mt-1">
            <span className="text-dark-400">TVA (20%)</span>
            <span className="text-white">{formatPrice(montantTva)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-gold-500/20 pt-2 mt-1">
            <span className="text-white">TOTAL TTC</span>
            <span className="text-gold-500 text-xl">{formatPrice(montantTtc)}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <label className="text-dark-300 text-sm mb-1.5 block">Conditions</label>
            <textarea
              value={conditions}
              onChange={e => setConditions(e.target.value)}
              rows={3}
              className="input-field w-full resize-none text-sm"
              placeholder="Conditions du devis..."
            />
          </div>
          <div className="glass rounded-2xl p-5">
            <label className="text-dark-300 text-sm mb-1.5 block">Notes internes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="input-field w-full resize-none text-sm"
              placeholder="Notes pour l'équipe..."
            />
          </div>
        </div>
      </div>

      {/* ─── ACTIONS ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-gold py-2.5 px-5 flex items-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button
          onClick={handlePdf}
          className="btn-ghost py-2.5 px-5 flex items-center gap-2"
        >
          <FileDown size={16} /> PDF
        </button>
        {devis.statut === 'brouillon' && (
          <button
            onClick={handleSend}
            className="btn-ghost py-2.5 px-5 flex items-center gap-2 text-blue-400 hover:text-blue-300"
          >
            <Send size={16} /> Envoyer au client
          </button>
        )}
        {devis.statut === 'accepte' && (
          <button
            onClick={handleConvert}
            className="border border-purple-500/40 text-purple-300 hover:bg-purple-500/10 py-2.5 px-5 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
          >
            <FileCheck2 size={16} /> Convertir en contrat
          </button>
        )}
      </div>
    </div>
  );
}