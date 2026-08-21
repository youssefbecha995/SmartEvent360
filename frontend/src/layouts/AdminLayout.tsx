import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, FileText, CalendarDays, UserCheck,
  Package, Calendar, DollarSign, Phone, Clock, Settings,
  LogOut, Menu, Search, ChevronDown, Plus, Ticket, Archive,
  Sun, Moon, Globe, Layers, UsersRound
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n, TranslationKey } from '@/lib/i18n';
import NotificationBell from '@/components/NotificationBell';

const navItems = [
  { to: '/admin',              icon: LayoutDashboard, label: 'Dashboard',       end: true },
  { to: '/admin/clients',      icon: Users,           label: 'Clients' },
  { to: '/admin/devis',        icon: FileText,        label: 'Devis' },
  { to: '/admin/evenements',   icon: CalendarDays,    label: 'Événements' },
  { to: '/admin/reservations', icon: Ticket,          label: 'Réservations' },
  { to: '/admin/packs',        icon: Archive,         label: 'Packs & Offres' },
  { to: '/admin/services',     icon: Layers,          label: 'Services' },
  { to: '/admin/prestataires', icon: UsersRound,      label: 'Prestataires' },
  { to: '/admin/personnel',    icon: UserCheck,       label: 'Personnel' },
  { to: '/admin/equipements',  icon: Package,         label: 'Équipements' },
  { to: '/admin/calendrier',   icon: Calendar,        label: 'Calendrier' },
  { to: '/admin/tresorerie',   icon: DollarSign,      label: 'Trésorerie' },
  { to: '/admin/appels',       icon: Phone,           label: 'Appels' },
  { to: '/admin/rendez-vous',  icon: Clock,           label: 'Rendez-vous' },
  { to: '/admin/parametres',   icon: Settings,        label: 'Paramètres' },
];

const quickActions = [
  { to: '/admin/clients', label: 'Nouveau client' },
  { to: '/admin/devis', label: 'Nouveau devis' },
  { to: '/admin/evenements', label: 'Nouvel événement' },
];

export default function AdminLayout() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [light, setLight] = useState(() => localStorage.getItem('se360-theme') === 'light');
  const { t, lang, setLang } = useI18n();

  useEffect(() => {
    localStorage.setItem('se360-theme', light ? 'light' : 'dark');
  }, [light]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItemsT = navItems.map(i => ({ ...i, label: t(i.label as TranslationKey) }));

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Admin';
  const roleLabel = profile?.role === 'super_admin' ? 'Administrateur' : 'Administrateur';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-white/10">
        <button onClick={() => navigate('/')} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gold-500 flex items-center justify-center">
            <span className="text-dark-900 font-bold text-sm">SE</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">SmartEvent360</p>
            <p className="text-dark-300 text-xs">{t('Administration')}</p>
          </div>
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
        {navItemsT.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to} to={to} end={end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => setOpen(false)}
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="mb-3">
          <p className="text-dark-400 text-xs uppercase tracking-wider mb-2 px-1">{t('Raccourcis')}</p>
          {quickActions.map(a => (
            <button key={a.to} onClick={() => { navigate(a.to); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-dark-300 hover:text-white hover:bg-white/5 transition-all text-xs">
              <Plus size={13} />
              <span>{t(a.label as any)}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-2 border-t border-white/10 mt-2">
          <div className="w-8 h-8 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center flex-shrink-0">
            <span className="text-gold-500 font-semibold text-xs">{displayName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{displayName}</p>
            <p className="text-dark-300 text-xs capitalize truncate">{roleLabel}</p>
          </div>
          <button onClick={handleSignOut} className="text-dark-400 hover:text-red-400 transition-colors">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={light ? 'admin-theme-light flex h-screen bg-slate-100 overflow-hidden' : 'flex h-screen bg-dark-900 overflow-hidden'}>
      <aside className={light ? 'hidden lg:flex w-60 flex-shrink-0 flex-col bg-white border-r border-slate-200' : 'hidden lg:flex w-60 flex-shrink-0 flex-col bg-dark-800 border-r border-white/10'}>
        <SidebarContent />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className={light ? 'absolute left-0 top-0 h-full w-60 bg-white border-r border-slate-200' : 'absolute left-0 top-0 h-full w-60 bg-dark-800 border-r border-white/10'}>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={light ? 'h-14 bg-white border-b border-gold-500/30 flex items-center px-4 gap-3 flex-shrink-0' : 'h-14 bg-dark-800 border-b border-gold-500/20 flex items-center px-4 gap-3 flex-shrink-0'}>
          <button onClick={() => setOpen(true)} className="lg:hidden text-dark-300 hover:text-gold-500">
            <Menu size={20} />
          </button>
          <div className="flex-1 relative max-w-xs hidden md:block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input className="w-full bg-white/[0.06] border border-white/10 rounded-2xl pl-9 pr-4 py-1.5 text-sm text-white placeholder-dark-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20" placeholder={t('Rechercher')} />
          </div>
          <div className="flex-1" />
          <div className="relative">
            <button onClick={() => setShowQuick(!showQuick)} className="flex items-center gap-1.5 bg-gold-500 text-dark-900 text-xs font-accent font-semibold px-3 py-1.5 rounded-2xl hover:bg-gold-600 transition-colors">
              <Plus size={14} />
              <span className="hidden sm:inline">{t('Nouveau')}</span>
              <ChevronDown size={13} />
            </button>
            {showQuick && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-dark-800 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 z-50 py-1">
                {quickActions.map(a => (
                  <button key={a.to} onClick={() => { navigate(a.to); setShowQuick(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-dark-300 hover:text-white hover:bg-white/5 transition-colors">
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setLight(!light)} className={light ? 'text-slate-500 hover:text-gold-600' : 'text-dark-300 hover:text-gold-500'} title="Basculer le thème">
            {light ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <div className="relative">
            <button onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')} className={light ? 'flex items-center gap-1 text-xs text-slate-600 hover:text-gold-600 px-2' : 'flex items-center gap-1 text-xs text-dark-300 hover:text-gold-500 px-2'}>
              <Globe size={15} />
              <span className="font-semibold uppercase">{lang}</span>
            </button>
          </div>
          <NotificationBell light={light} />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
