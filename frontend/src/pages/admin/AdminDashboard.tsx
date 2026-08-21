import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Users, CalendarDays, FileText, DollarSign, Package,
  AlertTriangle, Ticket, UsersRound, Clock, CheckCircle, XCircle,
  Eye, ArrowRight, CreditCard, Phone, Calendar, MapPin, User,
  Wallet, Briefcase, Star, Zap, Sparkles, Activity, Bell,
  PieChart as PieChartIcon, BarChart3, ShoppingBag, Award, Gift,
  MessageSquare, LifeBuoy, Settings, LogOut, Menu, ChevronRight
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  CartesianGrid, Legend
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { SkeletonCard } from '@/components/ui/Skeleton';
import {
  eventsApi, bookingsApi, packsApi, usersApi, providersApi,
  servicesApi, notificationsApi
} from '@/lib/neonApi';
import { crmApi } from '@/lib/crmApi';
import { formatPrice } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';

// ─── COULEURS ──────────────────────────────────────────────────────────────────
const COLORS = ['#D4AF37', '#60A5FA', '#A78BFA', '#34D399', '#FBBF24', '#F472B6', '#38BDF8', '#FB923C'];

// ─── COMPOSANT CUSTOM TOOLTIP ─────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-dark-800 border border-white/10 rounded-xl px-4 py-3 text-sm shadow-xl backdrop-blur-sm">
        <p className="text-dark-300 mb-1.5 font-medium">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="text-dark-400">{p.name}</span>
            <span className="text-white font-bold">{p.value?.toLocaleString('fr-FR')} DT</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ─── COMPOSANT KPI CARD ──────────────────────────────────────────────────────
interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
  link?: string;
  trend?: { value: number; direction: 'up' | 'down' };
  subtitle?: string;
}

function KPICard({ icon, label, value, color, bg, link, trend, subtitle }: KPICardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => link && navigate(link)}
      className={`glass rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:border-gold-500/30 ${link ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center ${color}`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${trend.direction === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-white">{value.toLocaleString('fr-FR')}</div>
        <div className="text-dark-400 text-xs">{label}</div>
        {subtitle && <div className="text-dark-500 text-[10px] mt-0.5">{subtitle}</div>}
      </div>
    </div>
  );
}

// ─── COMPOSANT MAIN ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { success, error: toastError } = useToast();

  // ─── États ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [backendOk, setBackendOk] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // ─── Statistiques ──────────────────────────────────────────────────────────
  const [stats, setStats] = useState({
    events: { total: 0, upcoming: 0, active: 0, completed: 0 },
    bookings: { total: 0, confirmed: 0, pending: 0, cancelled: 0 },
    users: { total: 0, active: 0, new: 0 },
    packs: { total: 0, active: 0, popular: 0 },
    providers: { total: 0, active: 0, available: 0 },
    services: { total: 0, active: 0, featured: 0 },
    finances: { revenue: 0, pending: 0, expenses: 0, profit: 0, margin: 0 },
    quotes: { total: 0, accepted: 0, pending: 0, refused: 0 },
  });

  // ─── Données des graphiques ──────────────────────────────────────────────
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<any[]>([]);
  const [topEvents, setTopEvents] = useState<any[]>([]);
  const [eventTypeDistribution, setEventTypeDistribution] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [topProviders, setTopProviders] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<{ type: string; message: string; link?: string }[]>([]);

  // ─── Chargement des données ──────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      // ── Appels parallèles ──
      const [
        evRes,
        bkStats,
        usRes,
        pkRes,
        pvRes,
        svcRes,
        incRes,
        expRes,
        dvRes,
        notifRes,
      ] = await Promise.allSettled([
        eventsApi.list({ limit: 200 }),
        bookingsApi.stats(),
        usersApi.list(),
        packsApi.list(),
        providersApi.list({}),
        servicesApi.list({ limit: 200 }),
        crmApi.list('incomes').catch(() => []),
        crmApi.list('expenses').catch(() => []),
        crmApi.list('quotes').catch(() => []),
        notificationsApi.list(10).catch(() => ({ data: [], unread: 0 })),
      ]);

      // ── Événements ──
      const events = evRes.status === 'fulfilled' ? evRes.value.data : [];
      const now = new Date();
      const upcoming = events.filter((e: any) => new Date(e.date) > now);
      const active = events.filter((e: any) => e.isPublished);
      const completed = events.filter((e: any) => new Date(e.date) < now);

      // ── Réservations ──
      const bk = bkStats.status === 'fulfilled' ? bkStats.value : null;

      // ── Utilisateurs ──
      const users = usRes.status === 'fulfilled' ? usRes.value : [];

      // ── Packs ──
      const packs = pkRes.status === 'fulfilled' ? pkRes.value : [];
      const popularPacks = packs.filter((p: any) => p.isPopular);

      // ── Prestataires ──
      const providers = pvRes.status === 'fulfilled' ? pvRes.value : [];
      const availableProviders = providers.filter((p: any) => p.isAvailable && p.active);

      // ── Services ──
      const services = svcRes.status === 'fulfilled' ? svcRes.value.data : [];

      // ── Finances ──
      const incomes = incRes.status === 'fulfilled' ? incRes.value : [];
      const expenses = expRes.status === 'fulfilled' ? expRes.value : [];
      const totalRevenue = incomes.reduce((sum: number, i: any) => sum + (Number(i.montant) || 0), 0);
      const pendingRevenue = incomes
        .filter((i: any) => ['attente', 'partiel'].includes(i.statut))
        .reduce((sum: number, i: any) => sum + (Number(i.montant) || 0), 0);
      const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (Number(e.montant) || 0), 0);
      const profit = totalRevenue - totalExpenses;
      const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      // ── Devis ──
      const quotes = dvRes.status === 'fulfilled' ? dvRes.value : [];

      // ── Notifications ──
      const notifs = notifRes.status === 'fulfilled' ? notifRes.value : { data: [], unread: 0 };

      // ─── Statistiques ──
      setStats({
        events: {
          total: events.length,
          upcoming: upcoming.length,
          active: active.length,
          completed: completed.length,
        },
        bookings: {
          total: bk?.totals.total ?? 0,
          confirmed: bk?.totals.confirmed ?? 0,
          pending: bk?.totals.pending ?? 0,
          cancelled: bk?.totals.cancelled ?? 0,
        },
        users: {
          total: users.length,
          active: users.filter((u: any) => u.active !== false).length,
          new: users.filter((u: any) => new Date(u.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
        },
        packs: {
          total: packs.length,
          active: packs.filter((p: any) => p.isActive).length,
          popular: popularPacks.length,
        },
        providers: {
          total: providers.length,
          active: providers.filter((p: any) => p.active).length,
          available: availableProviders.length,
        },
        services: {
          total: services.length,
          active: services.filter((s: any) => s.active).length,
          featured: services.filter((s: any) => s.featured).length,
        },
        finances: {
          revenue: totalRevenue,
          pending: pendingRevenue,
          expenses: totalExpenses,
          profit: profit,
          margin: margin,
        },
        quotes: {
          total: quotes.length,
          accepted: quotes.filter((q: any) => q.statut === 'accepte').length,
          pending: quotes.filter((q: any) => q.statut === 'brouillon' || q.statut === 'envoye').length,
          refused: quotes.filter((q: any) => q.statut === 'refuse').length,
        },
      });

      // ─── Revenus mensuels (RÉELS) ──
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      const currentYear = new Date().getFullYear();
      const monthlyData = months.map((month, index) => {
        const monthNum = index + 1;
        const monthIncomes = incomes.filter((i: any) => {
          const date = new Date(i.date_paiement || i.createdAt);
          return date.getFullYear() === currentYear && date.getMonth() + 1 === monthNum;
        });
        const monthExpenses = expenses.filter((e: any) => {
          const date = new Date(e.date_paiement || e.createdAt);
          return date.getFullYear() === currentYear && date.getMonth() + 1 === monthNum;
        });
        return {
          month,
          revenue: monthIncomes.reduce((sum: number, i: any) => sum + (Number(i.montant) || 0), 0),
          expenses: monthExpenses.reduce((sum: number, e: any) => sum + (Number(e.montant) || 0), 0),
          profit: monthIncomes.reduce((sum: number, i: any) => sum + (Number(i.montant) || 0), 0) -
                 monthExpenses.reduce((sum: number, e: any) => sum + (Number(e.montant) || 0), 0),
        };
      });
      setMonthlyRevenue(monthlyData);

      // ─── Activité hebdomadaire ──
      const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
      const weekData = weekDays.map((day, index) => {
        const dayEvents = events.filter((e: any) => {
          const date = new Date(e.date);
          return date.getDay() === index + 1;
        });
        return {
          day,
          events: dayEvents.length,
          bookings: dayEvents.reduce((sum: number, e: any) => sum + (e._count?.bookings || 0), 0),
        };
      });
      setWeeklyActivity(weekData);

      // ─── Top événements ──
      setTopEvents(bk?.topEvents?.slice(0, 5) || []);

      // ─── Répartition des types d'événements ──
      const categories = ['Mariage', 'Séminaire', 'Soirée', 'Concert', 'Autre'];
      const eventTypes = categories.map(cat => {
        const count = events.filter((e: any) => (e.category?.name || 'Autre') === cat).length;
        return { name: cat, value: count || 0 };
      });
      setEventTypeDistribution(eventTypes);

      // ─── Activité récente ──
      const recentEvents = events.slice(0, 5).map((e: any) => ({
        id: e.id,
        type: 'event',
        title: e.title,
        date: e.date,
        user: e.client?.name || 'Client',
        status: e.isPublished ? 'Publié' : 'Brouillon',
      }));
      const recentQuotes = quotes.slice(0, 3).map((q: any) => ({
        id: q.id,
        type: 'quote',
        title: q.reference,
        date: q.date_emission,
        user: q.client_id || 'Client',
        status: q.statut === 'accepte' ? 'Accepté' : q.statut === 'envoye' ? 'Envoyé' : 'Brouillon',
      }));
      const sortedActivity = [...recentEvents, ...recentQuotes]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);
      setRecentActivity(sortedActivity);

      // ─── Événements à venir ──
      const upcomingEventsData = events
        .filter((e: any) => new Date(e.date) > now)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);
      setUpcomingEvents(upcomingEventsData);

      // ─── Paiements en attente ──
      const pendingPaymentsData = incomes
        .filter((i: any) => ['attente', 'partiel'].includes(i.statut))
        .slice(0, 5);
      setPendingPayments(pendingPaymentsData);

      // ─── Top prestataires ──
      const topProvidersData = providers.slice(0, 5);
      setTopProviders(topProvidersData);

      // ─── Notifications ──
      setNotifications(notifs.data || []);

      // ─── Alertes ──
      const newAlerts: { type: string; message: string; link?: string }[] = [];

      const pendingBookings = bk?.totals.pending || 0;
      if (pendingBookings > 0) {
        newAlerts.push({
          type: 'warning',
          message: `${pendingBookings} réservation${pendingBookings > 1 ? 's' : ''} en attente de confirmation`,
          link: '/admin/reservations',
        });
      }

      if (upcomingEventsData.length > 0) {
        newAlerts.push({
          type: 'info',
          message: `${upcomingEventsData.length} événement${upcomingEventsData.length > 1 ? 's' : ''} à venir`,
          link: '/admin/evenements',
        });
      }

      if (pendingPaymentsData.length > 0) {
        const totalPending = pendingPaymentsData.reduce((sum, p) => sum + p.montant, 0);
        newAlerts.push({
          type: 'warning',
          message: `${pendingPaymentsData.length} paiement${pendingPaymentsData.length > 1 ? 's' : ''} en attente (${formatPrice(totalPending)})`,
          link: '/admin/tresorerie',
        });
      }

      const pendingQuotes = quotes.filter((q: any) => q.statut === 'brouillon' || q.statut === 'envoye');
      if (pendingQuotes.length > 0) {
        newAlerts.push({
          type: 'info',
          message: `${pendingQuotes.length} devis en attente de réponse`,
          link: '/admin/devis',
        });
      }

      const unavailableProviders = providers.filter((p: any) => !p.isAvailable && p.active);
      if (unavailableProviders.length > 0) {
        newAlerts.push({
          type: 'warning',
          message: `${unavailableProviders.length} prestataire${unavailableProviders.length > 1 ? 's' : ''} actuellement indisponible`,
          link: '/admin/prestataires',
        });
      }

      setAlerts(newAlerts);
      setBackendOk(true);

    } catch (error) {
      console.error('[Dashboard] Erreur de chargement:', error);
      setBackendOk(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const refreshData = () => {
    setRefreshKey(prev => prev + 1);
    success('Données rafraîchies');
  };

  const displayName = profile?.full_name || 'Administrateur';

  // ─── RENDU ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* ─── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-white">
              📊 Tableau de bord
            </h1>
            <button
              onClick={refreshData}
              className="p-1.5 rounded-lg glass text-dark-400 hover:text-white hover:bg-gold-500/10 transition-all"
              title="Rafraîchir"
            >
              <Zap size={16} />
            </button>
          </div>
          <p className="text-dark-400 text-sm mt-0.5 flex items-center gap-2 flex-wrap">
            Bienvenue, <span className="text-white font-medium">{displayName}</span>
            <span className="text-dark-500">·</span>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            <span className="text-dark-500">·</span>
            <span className="text-dark-500 text-xs">
              {notifications.filter((n: any) => !n.isRead).length} notification{notifications.filter((n: any) => !n.isRead).length > 1 ? 's' : ''} non lue{notifications.filter((n: any) => !n.isRead).length > 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!backendOk && (
            <span className="text-xs bg-red-500/15 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <AlertTriangle size={12} /> Backend injoignable
            </span>
          )}
          {/* Période */}
          <div className="flex glass rounded-lg p-0.5">
            {(['month', 'quarter', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-md text-xs transition-all ${
                  period === p ? 'bg-gold-500 text-dark-900' : 'text-dark-400 hover:text-white'
                }`}
              >
                {p === 'month' ? 'Mois' : p === 'quarter' ? 'Trimestre' : 'Année'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── ALERTES ──────────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-xl text-sm border ${
                alert.type === 'warning'
                  ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              }`}
            >
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span className="flex-1">{alert.message}</span>
              {alert.link && (
                <button
                  onClick={() => navigate(alert.link!)}
                  className="text-xs font-medium hover:underline flex items-center gap-1"
                >
                  Voir <ArrowRight size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── KPIs ────────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array(7).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <KPICard
            icon={<CalendarDays size={18} />}
            label="Événements"
            value={stats.events.total}
            color="text-green-400"
            bg="bg-green-500/20"
            link="/admin/evenements"
            subtitle={`${stats.events.upcoming} à venir`}
          />
          <KPICard
            icon={<Ticket size={18} />}
            label="Réservations"
            value={stats.bookings.total}
            color="text-blue-400"
            bg="bg-blue-500/20"
            link="/admin/reservations"
            subtitle={`${stats.bookings.confirmed} confirmées`}
          />
          <KPICard
            icon={<CheckCircle size={18} />}
            label="Confirmées"
            value={stats.bookings.confirmed}
            color="text-gold-400"
            bg="bg-gold-500/20"
            link="/admin/reservations"
          />
          <KPICard
            icon={<Users size={18} />}
            label="Clients"
            value={stats.users.total}
            color="text-purple-400"
            bg="bg-purple-500/20"
            link="/admin/clients"
            subtitle={`${stats.users.new} nouveaux ce mois`}
          />
          <KPICard
            icon={<Package size={18} />}
            label="Packs actifs"
            value={stats.packs.active}
            color="text-orange-400"
            bg="bg-orange-500/20"
            link="/admin/packs"
          />
          <KPICard
            icon={<UsersRound size={18} />}
            label="Prestataires"
            value={stats.providers.active}
            color="text-cyan-400"
            bg="bg-cyan-500/20"
            link="/admin/prestataires"
            subtitle={`${stats.providers.available} disponibles`}
          />
          <KPICard
            icon={<FileText size={18} />}
            label="Devis"
            value={stats.quotes.total}
            color="text-pink-400"
            bg="bg-pink-500/20"
            link="/admin/devis"
            subtitle={`${stats.quotes.accepted} acceptés`}
          />
        </div>
      )}

      {/* ─── GRAPHIQUES ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenus mensuels */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <TrendingUp size={17} className="text-gold-500" />
              Revenus mensuels
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gold-400 font-bold">{formatPrice(stats.finances.revenue)}</span>
              <span className="text-dark-500">|</span>
              <span className="text-green-400">Marge {stats.finances.margin.toFixed(1)}%</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyRevenue}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34D399" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#34D399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tick={{ fill: '#6B7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#D4AF37"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                name="Revenus"
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="#34D399"
                strokeWidth={2}
                fill="url(#profitGradient)"
                name="Bénéfices"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-gold-500" />
              <span className="text-dark-400">Revenus</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-green-400" />
              <span className="text-dark-400">Bénéfices</span>
            </div>
          </div>
        </div>

        {/* Activité hebdomadaire */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Activity size={17} className="text-blue-400" />
              Activité de la semaine
            </h3>
            <span className="text-dark-400 text-xs">{weeklyActivity.reduce((sum, d) => sum + d.events, 0)} événements</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyActivity}>
              <XAxis
                dataKey="day"
                tick={{ fill: '#6B7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="bg-dark-800 border border-white/10 rounded-xl px-4 py-2.5 text-xs">
                      <p className="text-dark-300 mb-1">{label}</p>
                      <p className="text-white">{payload[0].value} événements</p>
                      {payload[1] && <p className="text-gold-400">{payload[1].value} réservations</p>}
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="events" name="Événements" fill="#60A5FA" radius={[4, 4, 0, 0]} />
              <Bar dataKey="bookings" name="Réservations" fill="#D4AF37" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── SECTION MOYENNE ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top événements */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Star size={17} className="text-gold-500" />
              Top événements
            </h3>
            <button
              onClick={() => navigate('/admin/evenements')}
              className="text-dark-400 hover:text-gold-400 text-xs transition-colors"
            >
              Voir tout <ArrowRight size={12} className="inline" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => <div key={i} className="h-12 bg-dark-700 rounded-xl animate-pulse" />)}
            </div>
          ) : topEvents.length === 0 ? (
            <p className="text-dark-400 text-sm text-center py-6">Aucune réservation</p>
          ) : (
            <div className="space-y-3">
              {topEvents.map((ev, i) => {
                const max = topEvents[0]?.bookingCount || 1;
                const pct = (ev.bookingCount / max) * 100;
                return (
                  <div
                    key={ev.id}
                    onClick={() => navigate(`/admin/evenements/${ev.id}`)}
                    className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors"
                  >
                    <span className="text-dark-500 text-xs w-4 font-medium">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-dark-200 truncate max-w-[140px]">{ev.title}</span>
                        <span className="text-gold-400 font-bold">{ev.bookingCount}</span>
                      </div>
                      <div className="w-full bg-dark-700 rounded-full h-1.5">
                        <div
                          className="bg-gold-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Événements à venir */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Calendar size={17} className="text-green-400" />
              Événements à venir
            </h3>
            <button
              onClick={() => navigate('/admin/evenements')}
              className="text-dark-400 hover:text-gold-400 text-xs transition-colors"
            >
              Voir tout <ArrowRight size={12} className="inline" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => <div key={i} className="h-12 bg-dark-700 rounded-xl animate-pulse" />)}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <p className="text-dark-400 text-sm text-center py-6">Aucun événement à venir</p>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((ev) => {
                const days = Math.ceil((new Date(ev.date).getTime() - Date.now()) / 86400000);
                return (
                  <div
                    key={ev.id}
                    onClick={() => navigate(`/admin/evenements/${ev.id}`)}
                    className="flex items-center gap-3 p-2.5 glass rounded-xl cursor-pointer hover:border-gold-500/30 transition-all border border-transparent"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                      <Calendar size={14} className="text-gold-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{ev.title}</p>
                      <p className="text-dark-400 text-xs flex items-center gap-1">
                        <MapPin size={10} /> {ev.location}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs font-medium ${days <= 3 ? 'text-red-400' : days <= 7 ? 'text-yellow-400' : 'text-green-400'}`}>
                        J-{days}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Paiements en attente */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <CreditCard size={17} className="text-yellow-400" />
              Paiements en attente
            </h3>
            <button
              onClick={() => navigate('/admin/tresorerie')}
              className="text-dark-400 hover:text-gold-400 text-xs transition-colors"
            >
              Voir tout <ArrowRight size={12} className="inline" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => <div key={i} className="h-12 bg-dark-700 rounded-xl animate-pulse" />)}
            </div>
          ) : pendingPayments.length === 0 ? (
            <p className="text-dark-400 text-sm text-center py-6">✅ Aucun paiement en attente</p>
          ) : (
            <div className="space-y-2">
              {pendingPayments.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/admin/tresorerie`)}
                  className="flex items-center gap-3 p-2.5 glass rounded-xl cursor-pointer hover:border-yellow-500/30 transition-all border border-transparent"
                >
                  <div className="w-9 h-9 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                    <Clock size={14} className="text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {p.description || 'Paiement en attente'}
                    </p>
                    <p className="text-dark-400 text-xs flex items-center gap-1">
                      <User size={10} /> {p.client_id || 'Client'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-yellow-400 font-bold text-sm">{formatPrice(p.montant)}</span>
                    <p className="text-dark-500 text-[10px]">{p.statut || 'attente'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── SECTION INFÉRIEURE ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top prestataires */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Award size={17} className="text-cyan-400" />
              Meilleurs prestataires
            </h3>
            <button
              onClick={() => navigate('/admin/prestataires')}
              className="text-dark-400 hover:text-gold-400 text-xs transition-colors"
            >
              Voir tout <ArrowRight size={12} className="inline" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => <div key={i} className="h-12 bg-dark-700 rounded-xl animate-pulse" />)}
            </div>
          ) : topProviders.length === 0 ? (
            <p className="text-dark-400 text-sm text-center py-6">Aucun prestataire</p>
          ) : (
            <div className="space-y-2">
              {topProviders.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/admin/prestataires/${p.id}`)}
                  className="flex items-center gap-3 p-2.5 glass rounded-xl cursor-pointer hover:border-cyan-500/30 transition-all border border-transparent"
                >
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0 text-lg">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <User size={14} className="text-cyan-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.name}</p>
                    <p className="text-dark-400 text-xs flex items-center gap-1">
                      <Star size={10} className="text-gold-400 fill-gold-400" />
                      {p.rating?.toFixed(1) || 'Nouveau'} · {formatPrice(p.price)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs font-medium ${p.isAvailable ? 'text-green-400' : 'text-yellow-400'}`}>
                      {p.isAvailable ? '✅ Disponible' : '⏳ Sur demande'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Répartition des événements */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <PieChartIcon size={17} className="text-gold-500" />
            Répartition des événements
          </h3>
          {loading ? (
            <div className="h-40 animate-pulse bg-dark-700 rounded-xl" />
          ) : eventTypeDistribution.every(d => d.value === 0) ? (
            <p className="text-dark-400 text-sm text-center py-8">Aucune donnée</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={eventTypeDistribution.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {eventTypeDistribution.filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 flex-1">
                {eventTypeDistribution.filter(d => d.value > 0).map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-dark-300 flex-1">{d.name}</span>
                    <span className="text-white font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── ACTIVITÉ RÉCENTE ────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Activity size={17} className="text-gold-400" />
            Activité récente
          </h3>
          <span className="text-dark-500 text-xs">{recentActivity.length} actions</span>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => <div key={i} className="h-12 bg-dark-700 rounded-xl animate-pulse" />)}
          </div>
        ) : recentActivity.length === 0 ? (
          <p className="text-dark-400 text-sm text-center py-6">Aucune activité récente</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
            {recentActivity.map((item, index) => {
              const isEvent = item.type === 'event';
              const isQuote = item.type === 'quote';
              return (
                <div
                  key={item.id || index}
                  onClick={() => navigate(isEvent ? `/admin/evenements/${item.id}` : `/admin/devis/${item.id}`)}
                  className="flex items-center gap-3 p-2.5 glass rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isEvent ? 'bg-blue-500/20' :
                    isQuote ? 'bg-gold-500/20' :
                    'bg-purple-500/20'
                  }`}>
                    {isEvent ? <Calendar size={14} className="text-blue-400" /> :
                     isQuote ? <FileText size={14} className="text-gold-400" /> :
                     <User size={14} className="text-purple-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {isEvent ? `📅 ${item.title}` :
                       isQuote ? `📄 ${item.title}` :
                       item.title}
                    </p>
                    <p className="text-dark-400 text-xs flex items-center gap-1">
                      {item.user}
                      <span className="text-dark-500">·</span>
                      {new Date(item.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      item.status === 'Publié' || item.status === 'Accepté' ? 'bg-green-500/20 text-green-400' :
                      item.status === 'Brouillon' ? 'bg-dark-600 text-dark-400' :
                      item.status === 'Envoyé' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── FOOTER STATS ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Revenus', value: formatPrice(stats.finances.revenue), icon: <DollarSign size={14} />, color: 'text-green-400' },
          { label: 'Bénéfices', value: formatPrice(stats.finances.profit), icon: <Wallet size={14} />, color: 'text-gold-400' },
          { label: 'Marge', value: `${stats.finances.margin.toFixed(1)}%`, icon: <TrendingUp size={14} />, color: 'text-blue-400' },
          { label: 'En attente', value: formatPrice(stats.finances.pending), icon: <Clock size={14} />, color: 'text-yellow-400' },
          { label: 'Prestataires', value: String(stats.providers.total), icon: <UsersRound size={14} />, color: 'text-cyan-400' },
          { label: 'Services', value: String(stats.services.total), icon: <Briefcase size={14} />, color: 'text-purple-400' },
        ].map((item, i) => (
          <div key={i} className="glass rounded-xl p-3 text-center">
            <div className={`${item.color} flex items-center justify-center gap-1 text-xs mb-1`}>
              {item.icon} {item.label}
            </div>
            <div className="text-white font-bold text-lg">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}