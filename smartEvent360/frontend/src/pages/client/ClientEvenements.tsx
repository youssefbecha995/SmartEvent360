import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Users, DollarSign, Plus, X, CreditCard } from 'lucide-react';
import { eventsApi, clientApi } from '@/lib/neonApi';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';

const typeIcon: Record<string, string> = {
  mariage:'💒', seminaire:'🏢', soiree:'🎉', concert:'🎵', festival:'🎪', anniversaire:'🎂', autre:'📅'
};

export default function ClientEvenements() {
  const { user, token } = useAuth();
  const { success, error: toastError } = useToast();
  const [events, setEvents]   = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ title: '', location: '', date: '', capacity: '', price: '' });

  const load = async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const [evRes, payRes] = await Promise.all([
        eventsApi.list({ limit: 200 }).catch(() => ({ data: [] })),
        clientApi.payments().catch(() => []),
      ]);
      setEvents(evRes.data.filter((e: any) => e.clientId === user?.id));
      setPayments(payRes || []);
    } catch (e: any) { toastError('Erreur', e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const paymentFor = (eventId: string) => payments.find(p => p.event_id === eventId);

  const handleCreate = async () => {
    if (!form.title?.trim())    { setFormError('Le titre est requis.'); return; }
    if (!form.location?.trim()) { setFormError('Le lieu est requis.'); return; }
    if (!form.date)             { setFormError('La date est requise.'); return; }
    if (!form.capacity || Number(form.capacity) < 1) { setFormError('Capacité invalide.'); return; }
    setSaving(true); setFormError('');
    try {
      const price = Number(form.price) || 0;
      await eventsApi.create({
        title: form.title, description: null, location: form.location, date: form.date,
        capacity: Number(form.capacity), price, clientId: user?.id || null, isPublished: false,
      });
      setShowCreate(false);
      setForm({ title: '', location: '', date: '', capacity: '', price: '' });
      load();
      success('Événement créé ✓',
        price > 0 ? `${price.toLocaleString('fr-FR')} DT ajoutés à Mes Paiements.` : 'Aucun montant à régler.');
    } catch (e: any) { toastError('Erreur', e.message); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="Mes Événements" subtitle={`${events.length} événement${events.length !== 1 ? 's' : ''}`}
        action={<button onClick={() => setShowCreate(true)} className="btn-gold py-2 px-4 text-sm flex items-center gap-2"><Plus size={15} />Nouvel événement</button>} />

      <Link to="/client/paiements" className="inline-flex items-center gap-2 text-gold-500 text-sm mb-5 hover:text-gold-400 transition-colors">
        <CreditCard size={14} /> Voir mes paiements
      </Link>

      {loading ? (
        <div className="space-y-4">
          {Array(3).fill(0).map((_,i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <CalendarDays size={40} className="mx-auto mb-3 text-dark-600" />
          <p className="text-dark-400">Aucun événement</p>
          <p className="text-dark-500 text-sm mt-1">Créez votre premier événement pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((ev) => {
            const pay = paymentFor(ev.id);
            return (
              <div key={ev.id} className="glass rounded-2xl p-6 hover:border-gold-500/30 transition-all cursor-pointer" onClick={() => setSelected(ev)}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-dark-700 flex items-center justify-center text-2xl flex-shrink-0">
                    {typeIcon[ev.type] || '📅'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-white font-bold text-lg">{ev.title}</h3>
                      {pay && (
                        <span className={`badge border text-xs ${pay.statut === 'paye' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                          {pay.statut === 'paye' ? '✓ Payé' : '⏳ En attente de paiement'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-dark-400">
                      <span className="flex items-center gap-1.5"><CalendarDays size={13} />{new Date(ev.date).toLocaleDateString('fr-FR')}</span>
                      {ev.location && <span className="flex items-center gap-1.5"><MapPin size={13} />{ev.location}</span>}
                      <span className="flex items-center gap-1.5"><Users size={13} />{ev.capacity} places</span>
                      <span className="flex items-center gap-1.5"><DollarSign size={13} />{ev.price > 0 ? `${ev.price.toLocaleString('fr-FR')} DT` : 'Gratuit'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto z-10 p-7">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{typeIcon[selected.type] || '📅'}</span>
                <div>
                  <h2 className="text-xl font-bold text-white">{selected.title}</h2>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-5">
              {[
                { label: 'Date',     value: new Date(selected.date).toLocaleDateString('fr-FR') },
                { label: 'Lieu',     value: selected.location || '–' },
                { label: 'Places',   value: selected.capacity || '–' },
                { label: 'Prix',     value: selected.price > 0 ? `${selected.price.toLocaleString('fr-FR')} DT` : 'Gratuit' },
              ].map((item, i) => (
                <div key={i} className="bg-dark-700 rounded-xl p-3">
                  <p className="text-dark-400 text-xs mb-0.5">{item.label}</p>
                  <p className="text-white text-sm font-medium capitalize">{item.value}</p>
                </div>
              ))}
            </div>
            {selected.description && (
              <div className="bg-dark-700 rounded-xl p-4">
                <p className="text-dark-400 text-xs mb-1">Notes</p>
                <p className="text-dark-200 text-sm">{selected.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-lg w-full z-10 p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Nouvel événement</h2>
              <button onClick={() => setShowCreate(false)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            {formError && <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-2.5">{formError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Titre *</label>
                <input value={form.title} onChange={e => { setForm(p => ({ ...p, title: e.target.value })); setFormError(''); }} className="input-field" placeholder="Ex : Mariage de Farah" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Lieu *</label>
                <input value={form.location} onChange={e => { setForm(p => ({ ...p, location: e.target.value })); setFormError(''); }} className="input-field" placeholder="Ville, salle..." />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Date & heure *</label>
                <input type="datetime-local" value={form.date} onChange={e => { setForm(p => ({ ...p, date: e.target.value })); setFormError(''); }} className="input-field" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Capacité *</label>
                <input type="number" min="1" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Prix (DT)</label>
                <input type="number" min="0" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="input-field" placeholder="0 = gratuit" />
              </div>
            </div>
            <p className="text-dark-500 text-xs mt-3 bg-dark-700 rounded-xl p-3">
              💡 Si un prix est renseigné, le montant sera ajouté à <b>Mes Paiements</b> pour règlement.
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1 py-2.5">Annuler</button>
              <button onClick={handleCreate} disabled={saving} className="btn-gold flex-1 py-2.5 disabled:opacity-60">
                {saving ? 'Création...' : 'Créer l\'événement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
