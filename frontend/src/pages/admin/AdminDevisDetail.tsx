import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, FileDown, Send, FileCheck2, CalendarDays, Package, Wrench, Users } from 'lucide-react';
import { crmApi } from '@/lib/crmApi';
import { usersApi, eventsApi, packsApi, type NeonPack } from '@/lib/neonApi';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

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

const emptyLine = (): Line => ({ _key: Math.random().toString(36).slice(2), description: '', quantite: 1, prix_unitaire: 0, remise: 0 });

const lineTotal = (l: Line) => Math.round(l.quantite * l.prix_unitaire * (1 - (l.remise || 0) / 100) * 100) / 100;

const catalogLine = (source: string, source_id: string, source_label: string, description: string, prix: number): Line =>
  ({ _key: Math.random().toString(36).slice(2), description, quantite: 1, prix_unitaire: prix, remise: 0, source, source_id, source_label });

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
  const [devis, setDevis] = useState<any | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [remiseGlobale, setRemiseGlobale] = useState(0);
  const [conditions, setConditions] = useState('');
  const [notes, setNotes] = useState('');
  const [dateExpiration, setDateExpiration] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [clientName, setClientName] = useState('–');
  const [eventName, setEventName] = useState('');
  const [eventDetails, setEventDetails] = useState<any | null>(null);
  const [packs, setPacks] = useState<NeonPack[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      crmApi.get('devis', id),
      packsApi.list().catch(() => [] as NeonPack[]),
      crmApi.list('equipment').catch(() => []),
      crmApi.list('personnel').catch(() => []),
    ]).then(async ([dv, pk, eq, pe]) => {
      setPacks(pk); setEquipments(eq); setPersonnel(pe);
      setDevis(dv);
      setRemiseGlobale(dv?.remise_globale || 0);
      setConditions(dv?.conditions || '');
      setNotes(dv?.notes || '');
      setDateExpiration(dv?.date_expiration || '');
      const initialLines: Line[] = (dv?.lignes || []).map((l: any) => ({ ...l, _key: l._key || l.id || Math.random().toString(36).slice(2) }));
      setLines(initialLines);
      if (dv?.client_id) usersApi.get(dv.client_id).then(u => setClientName(`${u.prenom || ''} ${u.nom || ''}`.trim() || u.name || '–')).catch(() => {});
      if (dv?.event_id) {
        const ev = await eventsApi.get(dv.event_id).catch(() => null);
        if (ev) { setEventDetails(ev); setEventName(ev.title); }
        if (initialLines.length === 0) {
          const recs = await crmApi.list('event_prestations').catch(() => []);
          const rec = recs.find(r => r.event_id === dv.event_id);
          let built = rec ? buildEventLines(rec, pk, eq, pe) : [];
          if (built.length === 0 && ev && Number(ev.price) > 0) {
            built = [catalogLine('evenement', ev.id, 'Événement', `Tarif événement · ${ev.title}`, Number(ev.price))];
          }
          if (built.length) setLines(built);
        }
      }
      setLoading(false);
    }).catch(() => { setLoading(false); });
  }, [id]);

  const sousTotal = useMemo(() => lines.reduce((a, l) => a + lineTotal(l), 0), [lines]);
  const remiseAmount = useMemo(() => Math.round(sousTotal * (remiseGlobale || 0) / 100 * 100) / 100, [sousTotal, remiseGlobale]);
  const montantHt = useMemo(() => Math.round((sousTotal - remiseAmount) * 100) / 100, [sousTotal, remiseAmount]);
  const montantTva = useMemo(() => Math.round(montantHt * 0.20 * 100) / 100, [montantHt]);
  const montantTtc = useMemo(() => Math.round((montantHt + montantTva) * 100) / 100, [montantHt, montantTva]);

  const updateLine = (key: string, patch: Partial<Line>) => {
    setLines(prev => prev.map(l => l._key === key ? { ...l, ...patch } : l));
  };

  const addLine = () => setLines(prev => [...prev, emptyLine()]);

  const addCatalogLine = (line: Line) => setLines(prev => [...prev, line]);

  const handleImportEvent = async () => {
    if (!devis?.event_id) return;
    const recs = await crmApi.list('event_prestations').catch(() => []);
    const rec = recs.find(r => r.event_id === devis.event_id);
    let built = rec ? buildEventLines(rec, packs, equipments, personnel) : [];
    if (built.length === 0 && eventDetails && Number(eventDetails.price) > 0) {
      built = [catalogLine('evenement', eventDetails.id, 'Événement', `Tarif événement · ${eventDetails.title}`, Number(eventDetails.price))];
    }
    if (built.length) {
      setLines(built);
      setMessage(`Prestations importées depuis l'événement ✓`);
      setTimeout(() => setMessage(''), 2500);
    }
  };

  const removeLine = (key: string) => {
    setLines(prev => prev.filter(l => l._key !== key));
  };

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

    setDevis((p: any) => ({ ...p, ...updated, remise_globale: remiseGlobale, montant_ht: montantHt, montant_tva: montantTva, montant_ttc: montantTtc, conditions, notes, date_expiration: dateExpiration, lignes }));
    setSaving(false);
    setMessage('Devis enregistré ✓');
    setTimeout(() => setMessage(''), 2500);
  };

  const handleSend = async () => {
    await handleSave();
    await crmApi.update('devis', devis.id, { statut: 'envoye' });
    setDevis((p: any) => ({ ...p, statut: 'envoye' }));
    setMessage('Devis envoyé au client ✓');
    setTimeout(() => setMessage(''), 2500);
  };

  const handleConvert = async () => {
    if (!devis || devis.statut !== 'accepte') return;
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
    setTimeout(() => setMessage(''), 3000);
  };

  const handlePdf = async () => {
    await handleSave();
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>${devis.reference}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
        h1 { color: #B8860B; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; font-size: 14px; }
        th { color: #666; text-transform: uppercase; font-size: 11px; }
        .right { text-align: right; }
        .totals { margin-top: 20px; width: 300px; margin-left: auto; }
        .totals div { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
        .totals .ttc { font-weight: bold; font-size: 18px; border-top: 2px solid #B8860B; padding-top: 8px; margin-top: 6px; }
      </style></head>
      <body>
        <h1>SMARTEVENT360</h1>
        <p>Devis N° <strong>${devis.reference}</strong></p>
        <p>Client : ${clientName}<br/>Émis le : ${new Date(devis.date_emission).toLocaleDateString('fr-FR')}<br/>Expire le : ${devis.date_expiration ? new Date(devis.date_expiration).toLocaleDateString('fr-FR') : '–'}</p>
        <table>
          <thead><tr><th>Description</th><th class="right">Qté</th><th class="right">Prix U.</th><th class="right">Remise</th><th class="right">Total</th></tr></thead>
          <tbody>
            ${lines.map(l => `<tr><td>${l.description}</td><td class="right">${l.quantite}</td><td class="right">${l.prix_unitaire.toLocaleString('fr-FR')} DT</td><td class="right">${l.remise || 0}%</td><td class="right">${lineTotal(l).toLocaleString('fr-FR')} DT</td></tr>`).join('')}
          </tbody>
        </table>
        <div class="totals">
          <div><span>Sous-total HT</span><span>${sousTotal.toLocaleString('fr-FR')} DT</span></div>
          <div><span>Remise (${remiseGlobale}%)</span><span>-${remiseAmount.toLocaleString('fr-FR')} DT</span></div>
          <div><span>TVA (20%)</span><span>${montantTva.toLocaleString('fr-FR')} DT</span></div>
          <div class="ttc"><span>TOTAL TTC</span><span>${montantTtc.toLocaleString('fr-FR')} DT</span></div>
        </div>
        ${conditions ? `<p style="margin-top:30px;"><strong>Conditions :</strong><br/>${conditions.replace(/\n/g, '<br/>')}</p>` : ''}
      </body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
    await crmApi.update('devis', devis.id, { pdf_path: `devis-${devis.reference}.pdf` });
  };

  if (loading) return <div className="glass rounded-2xl h-64 animate-pulse" />;
  if (!devis) return <div className="text-dark-400">Devis introuvable.</div>;

  return (
    <div>
      <button onClick={() => navigate('/admin/devis')} className="flex items-center gap-1.5 text-dark-400 hover:text-white text-sm mb-4">
        <ArrowLeft size={15} /> Retour aux devis
      </button>

      <PageHeader
        title={`Devis ${devis.reference}`}
        subtitle={`${clientName}${eventName ? ' · ' + eventName : ''}`}
        action={<StatusBadge status={devis.statut} />}
      />

      {message && <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-xl px-4 py-2.5">{message}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="glass rounded-2xl p-4">
          <p className="text-dark-400 text-xs mb-1">Date d'émission</p>
          <p className="text-white text-sm">{new Date(devis.date_emission).toLocaleDateString('fr-FR')}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <label className="text-dark-400 text-xs mb-1 block">Date d'expiration</label>
          <input type="date" value={dateExpiration ? dateExpiration.slice(0, 10) : ''} onChange={e => setDateExpiration(e.target.value)}
            className="bg-transparent text-white text-sm focus:outline-none w-full" />
        </div>
        {eventDetails && (
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <CalendarDays size={14} className="text-gold-500" />
              <p className="text-dark-400 text-xs uppercase tracking-wider">Événement</p>
            </div>
            <p className="text-white font-semibold text-sm leading-snug">{eventDetails.title}</p>
            <p className="text-dark-300 text-sm mt-1">
              {eventDetails.date ? new Date(eventDetails.date).toLocaleDateString('fr-FR') : '–'}
              {eventDetails.location ? ` · ${eventDetails.location}` : ''}
            </p>
            <p className="text-dark-300 text-sm">Capacité : {eventDetails.capacity ?? '–'} personnes</p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
              <span className="text-gold-500 font-bold">{Number(eventDetails.price || 0).toLocaleString('fr-FR')} DT</span>
              {Number(eventDetails.price || 0) > 0 && (
                <button onClick={() => addCatalogLine(catalogLine('evenement', eventDetails.id, 'Événement', `Tarif événement · ${eventDetails.title}`, Number(eventDetails.price)))}
                  className="btn-ghost text-xs py-1 px-2.5 flex items-center gap-1">
                  <Plus size={12} /> Ajouter au devis
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-white font-semibold text-sm">Catalogue — ajout rapide</h3>
          <div className="flex items-center gap-3">
            <span className="text-dark-500 text-xs">Cliquez sur une prestation pour l'ajouter au devis avec son prix</span>
            {devis.event_id && (
              <button onClick={handleImportEvent} className="btn-ghost text-xs py-1 px-3 flex items-center gap-1">
                <FileDown size={12} /> Importer depuis l'événement
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-dark-700/60 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package size={14} className="text-gold-500" />
              <h4 className="text-dark-200 text-xs font-semibold uppercase tracking-wider">Packs</h4>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {packs.length === 0 && <p className="text-dark-600 text-xs">Aucun pack actif</p>}
              {packs.map(p => (
                <button key={p.id} onClick={() => addCatalogLine(catalogLine('pack', p.id, 'Pack', p.name, p.price))}
                  className="w-full text-left bg-dark-800 border border-dark-600 hover:border-gold-500/40 rounded-lg px-3 py-2 transition-all">
                  <p className="text-white text-sm font-medium truncate">{p.name}</p>
                  <p className="text-gold-400 text-xs">
                    {Number(p.price || 0).toLocaleString('fr-FR')} DT
                    {p.duration ? ` · ${p.duration} j` : ''}
                    {p.badge ? ` · ${p.badge}` : ''}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-dark-700/60 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wrench size={14} className="text-gold-500" />
              <h4 className="text-dark-200 text-xs font-semibold uppercase tracking-wider">Équipements</h4>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {equipments.length === 0 && <p className="text-dark-600 text-xs">Aucun équipement</p>}
              {equipments.map(eq => (
                <button key={eq.id} onClick={() => addCatalogLine(catalogLine('equipement', eq.id, 'Équipement', eq.nom || 'Équipement', Number(eq.prix_location) || 0))}
                  className="w-full text-left bg-dark-800 border border-dark-600 hover:border-gold-500/40 rounded-lg px-3 py-2 transition-all">
                  <p className="text-white text-sm font-medium truncate">{eq.nom}</p>
                  <p className="text-gold-400 text-xs">
                    {Number(eq.prix_location || 0).toLocaleString('fr-FR')} DT/jour
                    {eq.categorie ? ` · ${eq.categorie}` : ''}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-dark-700/60 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users size={14} className="text-gold-500" />
              <h4 className="text-dark-200 text-xs font-semibold uppercase tracking-wider">Personnel</h4>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {personnel.length === 0 && <p className="text-dark-600 text-xs">Aucun personnel</p>}
              {personnel.map(p => (
                <button key={p.id} onClick={() => addCatalogLine(catalogLine('personnel', p.id, 'Personnel', `${p.prenom || ''} ${p.nom || ''}`.trim() || 'Personnel', Number(p.salaire) || 0))}
                  className="w-full text-left bg-dark-800 border border-dark-600 hover:border-gold-500/40 rounded-lg px-3 py-2 transition-all">
                  <p className="text-white text-sm font-medium truncate">{[p.prenom, p.nom].filter(Boolean).join(' ') || 'Personnel'}</p>
                  <p className="text-gold-400 text-xs">
                    {Number(p.salaire || 0).toLocaleString('fr-FR')} DT {personnelUnitLabel(p)}
                    {p.fonction ? ` · ${p.fonction}` : ''}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Description', 'Qté', 'Prix U. (DT)', 'Remise (%)', 'Total', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-dark-400 text-xs font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map(l => (
                <tr key={l._key} className="border-b border-white/5">
                  <td className="px-4 py-2.5">
                    <input value={l.description} onChange={e => updateLine(l._key, { description: e.target.value })}
                      className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gold-500" placeholder="Ex: Pack Gold" />
                    {l.source_label && (
                      <span className="block mt-1 text-[10px] uppercase tracking-wide text-purple-300/70">{l.source_label}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <input type="number" min={1} value={l.quantite} onChange={e => updateLine(l._key, { quantite: parseInt(e.target.value) || 0 })}
                      className="w-20 bg-dark-700 border border-dark-500 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gold-500" />
                  </td>
                  <td className="px-4 py-2.5">
                    <input type="number" min={0} step="0.01" value={l.prix_unitaire} onChange={e => updateLine(l._key, { prix_unitaire: parseFloat(e.target.value) || 0 })}
                      className="w-28 bg-dark-700 border border-dark-500 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gold-500" />
                  </td>
                  <td className="px-4 py-2.5">
                    <input type="number" min={0} max={100} value={l.remise} onChange={e => updateLine(l._key, { remise: parseFloat(e.target.value) || 0 })}
                      className="w-20 bg-dark-700 border border-dark-500 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gold-500" />
                  </td>
                  <td className="px-4 py-2.5 text-white font-semibold text-sm whitespace-nowrap">{lineTotal(l).toLocaleString('fr-FR')} DT</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => removeLine(l._key)} className="text-dark-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addLine} className="w-full flex items-center justify-center gap-2 py-3 text-gold-500 hover:bg-white/5 text-sm font-medium transition-all">
          <Plus size={15} /> Ajouter une ligne
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="glass rounded-2xl p-5 space-y-2 text-sm h-fit">
          <div className="flex justify-between"><span className="text-dark-400">Sous-total HT</span><span className="text-white">{sousTotal.toLocaleString('fr-FR')} DT</span></div>
          <div className="flex justify-between items-center">
            <span className="text-dark-400">Remise globale (%)</span>
            <input type="number" min={0} max={100} value={remiseGlobale} onChange={e => setRemiseGlobale(parseFloat(e.target.value) || 0)}
              className="w-20 bg-dark-700 border border-dark-500 rounded-lg px-2 py-1 text-right text-white focus:outline-none focus:border-gold-500" />
          </div>
          <div className="flex justify-between"><span className="text-dark-400">Remise</span><span className="text-white">-{remiseAmount.toLocaleString('fr-FR')} DT</span></div>
          <div className="flex justify-between"><span className="text-dark-400">TVA (20%)</span><span className="text-white">{montantTva.toLocaleString('fr-FR')} DT</span></div>
          <div className="flex justify-between font-bold text-base border-t border-white/10 pt-2 mt-1">
            <span className="text-white">TOTAL TTC</span><span className="text-gold-500">{montantTtc.toLocaleString('fr-FR')} DT</span>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-dark-300 text-sm mb-1.5 block">Conditions</label>
            <textarea value={conditions} onChange={e => setConditions(e.target.value)} rows={3} className="input-field resize-none text-sm" />
          </div>
          <div>
            <label className="text-dark-300 text-sm mb-1.5 block">Notes internes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="input-field resize-none text-sm" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-gold py-2.5 px-5 flex items-center gap-2 disabled:opacity-60">
          <Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button onClick={handlePdf} className="btn-ghost py-2.5 px-5 flex items-center gap-2">
          <FileDown size={16} /> Générer PDF
        </button>
        {devis.statut === 'brouillon' && (
          <button onClick={handleSend} className="btn-ghost py-2.5 px-5 flex items-center gap-2">
            <Send size={16} /> Envoyer au client
          </button>
        )}
        {devis.statut === 'accepte' && (
          <button onClick={handleConvert} className="border border-purple-500/40 text-purple-300 hover:bg-purple-500/10 py-2.5 px-5 rounded-xl text-sm font-medium transition-all flex items-center gap-2">
            <FileCheck2 size={16} /> Convertir en contrat
          </button>
        )}
      </div>
    </div>
  );
}
