import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { crmApi } from '@/lib/crmApi';
import { eventsApi, usersApi, type NeonUser } from '@/lib/neonApi';
import PageHeader from '@/components/ui/PageHeader';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const statusColors: Record<string, string> = {
  preparation: 'bg-yellow-500/80', en_cours: 'bg-blue-500/80', termine: 'bg-green-500/80', annule: 'bg-red-500/80'
};

export default function AdminCalendrier() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [users, setUsers] = useState<NeonUser[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [view, setView] = useState<'mois'|'semaine'>('mois');

  useEffect(() => {
    Promise.all([
      crmApi.list('events').catch(() => []),
      eventsApi.list({ limit: 200 }).catch(() => null),
      usersApi.list().catch(() => []),
    ]).then(([evs, neonRes, us]) => {
      const crm = (evs || []).map((e: any) => ({ ...e, _source: 'crm' }));
      const neon = (neonRes?.data || []).map(e => ({ ...e, _source: 'neon', nom: e.title, date_debut: e.date }));
      setEvents([...crm, ...neon]);
      setUsers(us || []);
    });
  }, []);

  const clientName = (clientId?: string | null) => {
    if (!clientId) return '–';
    const u = users.find(x => x.id === clientId);
    if (!u) return '–';
    return [u.prenom, u.nom, u.name].filter(Boolean).join(' ') || u.email;
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) weeks.push([...week, ...Array(7 - week.length).fill(null)]);

  const eventsOnDay = (day: number | null) => {
    if (!day) return [];
    return events.filter(e => {
      const d = new Date(e.date_debut);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
  };

  return (
    <div>
      <PageHeader title="Calendrier" subtitle="Vue globale des événements et rendez-vous" />

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="glass w-9 h-9 rounded-xl flex items-center justify-center text-dark-300 hover:text-white transition-all">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-white font-semibold text-lg min-w-40 text-center">{MONTHS[month]} {year}</h2>
          <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="glass w-9 h-9 rounded-xl flex items-center justify-center text-dark-300 hover:text-white transition-all">
            <ChevronRight size={18} />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="glass px-3 py-1.5 rounded-lg text-dark-300 hover:text-white text-sm transition-all">
            Aujourd'hui
          </button>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-2 text-xs">
            {[['preparation','Préparation','bg-yellow-500'],['en_cours','En cours','bg-blue-500'],['termine','Terminé','bg-green-500'],['annule','Annulé','bg-red-500'],['neon','Événements site','bg-purple-500']].map(([,l,c]) => (
              <span key={l} className="flex items-center gap-1.5 text-dark-300"><span className={`w-2.5 h-2.5 rounded-full ${c}`} />{l}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 border-b border-white/10">
          {DAYS.map(d => (
            <div key={d} className="px-3 py-3 text-center text-dark-400 text-xs font-medium uppercase tracking-wider">{d}</div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-white/5 last:border-0">
            {week.map((day, di) => {
              const dayEvents = eventsOnDay(day);
              return (
                <div key={di} className={`min-h-24 p-2 border-r border-white/5 last:border-0 ${isToday(day) ? 'bg-gold-500/5' : ''} ${day ? 'hover:bg-white/3 transition-colors' : 'bg-dark-800/30'}`}>
                  {day && (
                    <>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm mb-1.5 ${isToday(day) ? 'bg-gold-500 text-dark-900 font-bold' : 'text-dark-300'}`}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((ev: any) => (
                          <button key={ev.id} onClick={() => setSelected(ev)}
                            className={`w-full text-left px-2 py-0.5 rounded text-xs text-white truncate ${ev._source === 'neon' ? (ev.isPublished ? 'bg-purple-500/80' : 'bg-dark-500') : (statusColors[ev.statut] || 'bg-dark-600')} hover:opacity-80 transition-opacity`}>
                            {ev.nom}
                          </button>
                        ))}
                        {dayEvents.length > 3 && (
                          <p className="text-dark-400 text-xs pl-1">+{dayEvents.length - 3} autres</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-sm w-full z-10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">{selected.nom}</h3>
              <button onClick={() => setSelected(null)} className="text-dark-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-2 text-sm">
              {selected._source === 'neon' ? (
                <>
                  <div><span className="text-dark-400">Client : </span><span className="text-dark-200">{clientName(selected.clientId)}</span></div>
                  <div><span className="text-dark-400">Date : </span><span className="text-dark-200">{new Date(selected.date_debut).toLocaleString('fr-FR')}</span></div>
                  <div><span className="text-dark-400">Lieu : </span><span className="text-dark-200">{selected.location || '–'}</span></div>
                  <div><span className="text-dark-400">Capacité : </span><span className="text-dark-200">{selected.capacity ?? '–'} pers.</span></div>
                  <div><span className="text-dark-400">Prix : </span><span className="text-gold-400 font-bold">{selected.price > 0 ? `${selected.price.toLocaleString('fr-FR')} DT` : 'Gratuit'}</span></div>
                  <div><span className="text-dark-400">Publication : </span><span className={`badge border text-xs ${selected.isPublished ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-dark-700 text-dark-400 border-dark-600'}`}>{selected.isPublished ? 'Publié' : 'Non publié'}</span></div>
                  {selected.description && <div><span className="text-dark-400">Description : </span><span className="text-dark-200">{selected.description}</span></div>}
                </>
              ) : (
                <>
                  <div><span className="text-dark-400">Client : </span><span className="text-dark-200">{clientName(selected.client_id)}</span></div>
                  <div><span className="text-dark-400">Début : </span><span className="text-dark-200">{new Date(selected.date_debut).toLocaleString('fr-FR')}</span></div>
                  <div><span className="text-dark-400">Fin : </span><span className="text-dark-200">{new Date(selected.date_fin).toLocaleString('fr-FR')}</span></div>
                  <div><span className="text-dark-400">Lieu : </span><span className="text-dark-200">{selected.lieu || selected.ville || '–'}</span></div>
                  <div><span className="text-dark-400">Invités : </span><span className="text-dark-200">{selected.nb_invites || '–'}</span></div>
                  <div><span className="text-dark-400">Budget : </span><span className="text-gold-400 font-bold">{selected.budget_total?.toLocaleString('fr-FR') || '–'} DT</span></div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
