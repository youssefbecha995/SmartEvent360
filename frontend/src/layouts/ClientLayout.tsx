import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Package, FileText, CreditCard, Calendar, User,
  ScrollText, LifeBuoy, LogOut, Menu, X, ChevronRight, Globe, Layers
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n, type Lang } from '@/lib/i18n';
import NotificationBell from '@/components/NotificationBell';

const navItems = [
  { to: '/client', icon: LayoutDashboard, label: 'Tableau de bord' as const, end: true },
  { to: '/client/packs', icon: Package, label: 'Mes Packs' as const },
  { to: '/client/services', icon: Layers, label: 'Services' as const },
  { to: '/client/devis', icon: FileText, label: 'Mes Devis' as const },
  { to: '/client/contrats', icon: ScrollText, label: 'Mes Contrats' as const },
  { to: '/client/paiements', icon: CreditCard, label: 'Mes Paiements' as const },
  { to: '/client/rendez-vous', icon: Calendar, label: 'Mes Rendez-vous' as const },
  { to: '/client/profil', icon: User, label: 'Mon Profil' as const },
  { to: '/client/support', icon: LifeBuoy, label: 'Support' as const },
];

const LANGS: { code: Lang; label: string }[] = [
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'AR' },
];

export default function ClientLayout() {
  const { user, profile, signOut } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Client';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-white/10">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gold-500 flex items-center justify-center">
            <span className="text-dark-900 font-bold text-sm">SE</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">SmartEvent360</p>
            <p className="text-dark-300 text-xs">{t('Espace Client')}</p>
          </div>
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to} to={to} end={end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => setOpen(false)}
          >
            <Icon size={18} />
            <span>{t(label)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center">
            <span className="text-gold-500 font-semibold text-sm">{displayName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{displayName}</p>
            <p className="text-dark-300 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-dark-300 hover:text-red-400 hover:bg-red-400/10 transition-all text-sm"
        >
          <LogOut size={16} />
          <span>{t('Déconnexion')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-dark-900 overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col bg-dark-800 border-r border-white/10">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-dark-800 border-r border-white/10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-dark-800 border-b border-gold-500/20 flex items-center px-4 lg:px-6 gap-4 flex-shrink-0">
          <button onClick={() => setOpen(true)} className="lg:hidden text-dark-300 hover:text-gold-500">
            <Menu size={22} />
          </button>
          <div className="flex-1 flex items-center gap-2 text-sm text-dark-300">
            <span className="text-white font-accent font-semibold">SmartEvent360</span>
            <ChevronRight size={14} className="text-dark-500" />
            <span className="text-dark-300">{t('Espace Client')}</span>
          </div>
          <div className="flex items-center gap-1 border border-white/10 rounded-xl p-0.5">
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${lang === l.code ? 'bg-gold-500 text-dark-900' : 'text-dark-300 hover:text-white'}`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <NotificationBell />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
