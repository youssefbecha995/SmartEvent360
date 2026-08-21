import { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Menu, X, User, FileText, Settings, Globe, Calendar,
  ChevronDown, LogIn, UserPlus, Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n, type Lang } from '@/lib/i18n';

const navLinks = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/services', label: 'Services' },
  { to: '/packs', label: 'Packs' },
  { to: '/prestataires', label: 'Prestataires' },
  { to: '/a-propos', label: 'À propos' },
  { to: '/contact', label: 'Contact' },
  { to: '/rendez-vous', label: 'Rendez-vous' },
];

const languages: { code: Lang; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

function Dropdown({ open, children }: { open: boolean; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="absolute right-0 top-full mt-2 bg-dark-800/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden min-w-44 py-1">
      {children}
    </div>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const { lang, setLang } = useI18n();
  const navigate = useNavigate();
  const langRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setUserOpen(false);
    navigate('/');
  };

  const DropdownItem = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-dark-200 hover:text-white hover:bg-white/5 transition-colors text-left">
      <span className="text-gold-500 flex-shrink-0">{icon}</span>
      {label}
    </button>
  );

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-dark-900/90 text-white backdrop-blur-xl border-b border-gold-500/20 py-2.5 shadow-lg shadow-black/30'
        : 'bg-white/[0.08] text-white backdrop-blur-md border-b border-white/10 py-5'
    }`}>
      <div className="max-w-7xl mx-auto px-4 lg:px-6 flex items-center gap-2">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group mr-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gold-500 flex items-center justify-center shadow-lg shadow-gold-500/30">
            <span className="text-dark-900 font-bold text-sm">SE</span>
          </div>
          <span className="text-white font-display font-bold text-lg tracking-wide group-hover:text-gold-400 transition-colors hidden sm:block">
            Smart<span className="text-gold-500">Event</span>360
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden lg:flex items-center gap-0.5 flex-1">
          {navLinks.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-150 relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:bg-gold-500 after:transition-all after:duration-200 ${
                  isActive
                    ? 'text-gold-500 after:w-2/3'
                    : 'text-dark-200 hover:text-gold-500 after:w-0 hover:after:w-1/3'
                }`}
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Desktop right actions */}
        <div className="hidden lg:flex items-center gap-1.5 ml-auto">

          {/* Language selector */}
          <div ref={langRef} className="relative">
            <button
              onClick={() => { setLangOpen(!langOpen); setUserOpen(false); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-dark-300 hover:text-white hover:bg-white/5 transition-all text-sm"
            >
              <Globe size={15} />
              <span>{languages.find(l => l.code === lang)?.flag} {lang.toUpperCase()}</span>
              <ChevronDown size={13} className={`transition-transform ${langOpen ? 'rotate-180' : ''}`} />
            </button>
            <Dropdown open={langOpen}>
              {languages.map(l => (
                <button key={l.code}
                  onClick={() => { setLang(l.code); setLangOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                    l.code === lang
                      ? 'text-gold-400 bg-gold-500/10'
                      : 'text-dark-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                  {l.code === lang && <span className="ml-auto text-gold-500 text-xs">✓</span>}
                </button>
              ))}
            </Dropdown>
          </div>

          {/* Quote button */}
          <Link to="/devis"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm font-medium text-white bg-gold-500 hover:bg-gold-600 transition-all border border-gold-500 shadow-sm shadow-gold-500/10">
            <FileText size={14} className="text-white" />
            <span>Devis</span>
          </Link>

          {/* RDV button */}
          <Link to="/rendez-vous"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-gold-600 border border-gold-500/30 hover:bg-gold-500/10 transition-all">
            <Calendar size={14} className="text-gold-500" />
            <span>RDV</span>
          </Link>

          {/* Connection dropdown */}
          <div ref={userRef} className="relative">
            {user ? (
              <button
                onClick={() => { setUserOpen(!userOpen); setLangOpen(false); }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gold-500/10 border border-gold-500/30 text-gold-600 hover:bg-gold-500/20 hover:text-gold-700 transition-all text-sm font-medium"
              >
                <div className="w-6 h-6 rounded-full bg-gold-500 flex items-center justify-center">
                  <span className="text-dark-900 text-xs font-bold">
                    {(user.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden xl:block max-w-24 truncate">{user.email?.split('@')[0]}</span>
                <ChevronDown size={13} className={`transition-transform ${userOpen ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <button
                onClick={() => { setUserOpen(!userOpen); setLangOpen(false); }}
                className="flex items-center gap-2 btn-gold text-sm py-2 px-4 animate-pulse-gold rounded-2xl"
              >
                <User size={14} />
                <span>Connexion</span>
                <ChevronDown size={13} className={`transition-transform ${userOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
            <Dropdown open={userOpen}>
              {user ? (
                <>
                  <div className="px-4 py-2.5 border-b border-white/10">
                    <p className="text-white text-xs font-medium truncate">{user.email}</p>
                  </div>
                  <DropdownItem icon={<User size={14} />} label={isAdmin ? 'Administration' : 'Mon Compte'} onClick={() => { navigate(isAdmin ? '/admin' : '/client'); setUserOpen(false); }} />
                  <div className="border-t border-white/10 mt-1 pt-1">
                    <DropdownItem icon={<X size={14} />} label="Déconnexion" onClick={handleSignOut} />
                  </div>
                </>
              ) : (
                <>
                  <div className="px-4 py-2 border-b border-white/10">
                    <p className="text-dark-400 text-xs uppercase tracking-wider">Se connecter</p>
                  </div>
                  <DropdownItem icon={<LogIn size={14} />} label="Espace Client" onClick={() => { navigate('/connexion-client'); setUserOpen(false); }} />
                  <DropdownItem icon={<Shield size={14} />} label="Espace Admin" onClick={() => { navigate('/connexion-admin'); setUserOpen(false); }} />
                  <div className="border-t border-white/10 mt-1 pt-1">
                    <DropdownItem icon={<UserPlus size={14} />} label="Créer un compte" onClick={() => { navigate('/inscription'); setUserOpen(false); }} />
                  </div>
                </>
              )}
            </Dropdown>
          </div>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden text-white p-2 rounded-lg hover:bg-white/10 ml-auto">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-dark-900/95 backdrop-blur-xl border-t border-gold-500/20 px-4 py-4 text-white">
          <div className="space-y-1 mb-3">
            {navLinks.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                  isActive ? 'text-gold-500 bg-gold-500/10' : 'text-dark-200 hover:text-gold-500 hover:bg-gold-500/10'
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Mobile lang selector */}
          <div className="border-t border-white/10 pt-3 mb-3">
            <p className="text-dark-400 text-xs uppercase tracking-wider px-4 mb-2">Langue</p>
            <div className="flex gap-2 px-1 flex-wrap">
              {languages.map(l => (
                <button key={l.code} onClick={() => { setLang(l.code); setMobileOpen(false); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    l.code === lang ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30' : 'glass text-dark-300 hover:text-white'
                  }`}>
                  {l.flag} {l.code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
            <Link to="/devis" className="btn-gold text-sm py-3 text-center flex items-center justify-center gap-2" onClick={() => setMobileOpen(false)}>
              <FileText size={15} /> Demander un devis
            </Link>
            <Link to="/rendez-vous" className="btn-ghost text-sm py-3 text-center flex items-center justify-center gap-2" onClick={() => setMobileOpen(false)}>
              <Calendar size={15} /> Prendre un RDV
            </Link>
            {user ? (
              <Link to={isAdmin ? '/admin' : '/client'} className="glass py-3 text-center text-sm text-dark-200 rounded-xl hover:text-white transition-colors" onClick={() => setMobileOpen(false)}>
                {isAdmin ? '⚙️ Administration' : '👤 Mon Compte'}
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/connexion-client" className="glass py-2.5 text-center text-xs text-dark-200 rounded-xl hover:text-white transition-colors flex items-center justify-center gap-1.5" onClick={() => setMobileOpen(false)}>
                  <LogIn size={13} /> Client
                </Link>
                <Link to="/connexion-admin" className="glass py-2.5 text-center text-xs text-dark-200 rounded-xl hover:text-white transition-colors flex items-center justify-center gap-1.5" onClick={() => setMobileOpen(false)}>
                  <Shield size={13} /> Admin
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
