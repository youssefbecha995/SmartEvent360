import { useEffect, useState } from 'react';
import { TrendingUp, Users, CalendarDays, FileText, DollarSign, Package, AlertTriangle, Ticket } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { eventsApi, bookingsApi, packsApi, usersApi } from '@/lib/neonApi';

const MONTHLY = [
  { month: 'Jan', value: 32000 }, { month: 'Fév', value: 38000 }, { month: 'Mar', value: 45200 },
  { month: 'Avr', value: 41000 }, { month: 'Mai', value: 52000 }, { month: 'Jun', value: 48000 },
  { month: 'Jul', value: 55000 }, { month: 'Aoû', value: 42000 }, { month: 'Sep', value: 58000 },
  { month: 'Oct', value: 61000 }, { month: 'Nov', value: 67000 }, { month: 'Déc', value: 72000 },
];

const PIE = [
  { name: 'Mariages',   value: 40, color: '#D4AF37' },
  { name: 'Séminaires', value: 25, color: '#60A5FA' },
  { name: 'Soirées',    value: 20, color: '#A78BFA' },
  { name: 'Concerts',   value: 10, color: '#34D399' },
  { name: 'Autres',     value:  5, color: '#6B7280' },
];

const Tip = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div className="bg-dark-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm">
      <p className="text-dark-300 mb-1">{label}</p>
      <p className="text-gold-400 font-bold">{payload[0].value?.toLocaleString('fr-FR')} DT</p>
    </div>
  ) : null;

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ events: 0, bookings: 0, confirmed: 0, users: 0, packs: 0 });
  const [topEvents, setTopEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendOk, setBackendOk] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [evRes, bkStats, usRes, pkRes] = await Promise.allSettled([
          eventsApi.list({ limit: 100 }),
          bookingsApi.stats(),
          usersApi.list(),
          packsApi.list(),
        ]);
        const evCount = evRes.status === 'fulfilled' ? evRes.value.total : 0;
        const bk      = bkStats.status === 'fulfilled' ? bkStats.value : null;
        const usCount = usRes.status === 'fulfilled' ? usRes.value.length : 0;
        const pkCount = pkRes.status === 'fulfilled' ? pkRes.value.length : 0;
        setStats({
          events:    evCount,
          bookings:  bk?.totals.total     ?? 0,
          confirmed: bk?.totals.confirmed ?? 0,
          users:     usCount,
          packs:     pkCount,
        });
        setTopEvents(bk?.topEvents ?? []);
        setBackendOk(true);
      } catch {
        setBackendOk(false);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const displayName = profile?.full_name || 'Administrateur';

  const kpis = [
    { icon: <CalendarDays size={20} />, label: 'Événements',    value: stats.events,    color: 'text-green-400',  bg: 'bg-green-500/20'  },
    { icon: <Ticket       size={20} />, label: 'Réservations',  value: stats.bookings,  color: 'text-blue-400',   bg: 'bg-blue-500/20'   },
    { icon: <Ticket       size={20} />, label: 'Confirmées',    value: stats.confirmed, color: 'text-gold-500',   bg: 'bg-gold-500/20'   },
    { icon: <Users        size={20} />, label: 'Utilisateurs',  value: stats.users,     color: 'text-purple-400', bg: 'bg-purple-500/20' },
    { icon: <Package      size={20} />, label: 'Packs actifs',  value: stats.packs,     color: 'text-orange-400', bg: 'bg-orange-500/20' },
  ];

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Tableau de bord</h1>
          <p className="text-dark-400 text-sm mt-0.5">
            Bienvenue, {displayName} · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {!backendOk && (
          <span className="text-xs bg-red-500/15 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <AlertTriangle size={12} /> Backend injoignable
          </span>
        )}
      </div>

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {Array(5).fill(0).map((_,i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {kpis.map((k, i) => (
            <div key={i} className="kpi-card">
              <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center ${k.color} mb-2`}>{k.icon}</div>
              <div className="text-xl font-bold text-white">{k.value}</div>
              <div className="text-dark-400 text-xs">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={17} className="text-gold-500" />Évolution des revenus (estimés)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MONTHLY}>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#D4AF37" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill:'#6B7280', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#6B7280', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="value" stroke="#D4AF37" strokeWidth={2} fill="url(#rg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top events from Neon */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <DollarSign size={17} className="text-gold-500" />Événements les plus réservés
          </h3>
          {loading ? <div className="h-40 animate-pulse bg-dark-700 rounded-xl" /> : (
            topEvents.length === 0 ? (
              <p className="text-dark-400 text-sm text-center py-12">Aucune réservation pour le moment.</p>
            ) : (
              <div className="space-y-3">
                {topEvents.slice(0, 5).map((ev, i) => {
                  const max = topEvents[0]?.bookingCount || 1;
                  return (
                    <div key={ev.id} className="flex items-center gap-3">
                      <span className="text-dark-500 text-xs w-4">{i+1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-dark-200 truncate max-w-[160px]">{ev.title}</span>
                          <span className="text-gold-400 font-bold">{ev.bookingCount}</span>
                        </div>
                        <div className="w-full bg-dark-700 rounded-full h-1.5">
                          <div className="bg-gold-500 h-1.5 rounded-full" style={{ width:`${(ev.bookingCount/max)*100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      {/* Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Répartition des événements</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={PIE} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={2}>
                  {PIE.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5">
              {PIE.map((d,i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-dark-300">{d.name}</span>
                  <span className="text-white font-medium ml-auto">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle size={17} className="text-yellow-400" />Alertes
          </h3>
          <div className="space-y-2">
            {[
              { text: `${stats.bookings - stats.confirmed} réservations en attente`, type: stats.bookings - stats.confirmed > 0 ? 'yellow' : 'green' },
              { text: `${stats.events} événements actifs`,   type: 'green'  },
              { text: `${stats.packs} packs disponibles`,    type: 'green'  },
              { text: `${stats.users} utilisateurs inscrits`, type: 'blue'  },
            ].map((a,i) => (
              <div key={i} className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs
                ${a.type==='yellow' ? 'bg-yellow-500/10 text-yellow-400'
                : a.type==='green'  ? 'bg-green-500/10 text-green-400'
                :                    'bg-blue-500/10 text-blue-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                  ${a.type==='yellow' ? 'bg-yellow-400'
                  : a.type==='green'  ? 'bg-green-400'
                  :                    'bg-blue-400'}`} />
                {a.text}
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">État de la connexion</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-dark-700 rounded-xl">
              <span className="text-dark-300 text-sm">Backend Express</span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${backendOk ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {backendOk ? '✓ Connecté' : '✗ Hors ligne'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-dark-700 rounded-xl">
              <span className="text-dark-300 text-sm">Neon DB (Prisma)</span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${backendOk ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {backendOk ? '✓ Connecté' : '✗ Hors ligne'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-dark-700 rounded-xl">
              <span className="text-dark-300 text-sm">Port</span>
              <span className="text-xs text-gold-400 font-mono">:3001</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
