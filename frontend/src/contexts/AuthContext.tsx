import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  role: string;
  full_name: string | null;
}

// On émule un objet "User" compatible avec ce qu'utilisent les pages d'Islem
interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  hydrated: boolean;          // true une fois localStorage lu
  token: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null; role: string | null }>;
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isClient: boolean;
  session: { access_token: string } | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Clés localStorage ────────────────────────────────────────────────────────

const TOKEN_KEY   = 'se360-token';
const USER_KEY    = 'se360-user';
const PROFILE_KEY = 'se360-profile';

// ─── URL backend ──────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ─── Fetch avec timeout (évite un bouton « Connexion... » bloqué à l'infini) ──

async function fetchWithTimeout(url: string, init: RequestInit, ms = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [token, setToken]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Hydration depuis localStorage — UNE seule fois au montage
  useEffect(() => {
    const storedToken   = localStorage.getItem(TOKEN_KEY);
    const storedUser    = localStorage.getItem(USER_KEY);
    const storedProfile = localStorage.getItem(PROFILE_KEY);
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        if (storedProfile) setProfile(JSON.parse(storedProfile));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(PROFILE_KEY);
      }
    }
    setLoading(false);
    setHydrated(true);   // localStorage lu, état fiable
  }, []);

  const persist = (t: string, u: User, p: Profile) => {
    // Vider d'abord toute ancienne session résiduelle
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PROFILE_KEY);
    // Écrire la nouvelle session
    localStorage.setItem(TOKEN_KEY,   t);
    localStorage.setItem(USER_KEY,    JSON.stringify(u));
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    // Mettre à jour le state React ensuite
    setToken(t);
    setUser(u);
    setProfile(p);
  };

  const clear = () => {
    setToken(null);
    setUser(null);
    setProfile(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PROFILE_KEY);
  };

  // ── signIn ─────────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string): Promise<{ error: string | null; role: string | null }> => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { error: body.error || 'Identifiants incorrects.', role: null };
      }

      const data = await res.json();
      const u: User    = { id: data.user.id, email: data.user.email };
      const p: Profile = { id: data.user.id, role: mapRole(data.user.role), full_name: data.user.name };
      persist(data.token, u, p);

      // Clé de compatibilité utilisée par certains composants
      localStorage.setItem('token', data.token);

      return { error: null, role: p.role };
    } catch (e: any) {
      return { error: e?.name === 'AbortError' ? 'Le serveur ne répond pas. Vérifiez que le backend (port 3001) est démarré.' : 'Impossible de contacter le serveur.', role: null };
    }
  };

  // ── signUp ─────────────────────────────────────────────────────────────────
  const signUp = async (email: string, password: string, fullName: string, role = 'client'): Promise<{ error: string | null }> => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: fullName, role: role === 'client' ? 'USER' : 'ADMIN' }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { error: body.error || 'Erreur lors de l\'inscription.' };
      }

      const data = await res.json();
      const u: User    = { id: data.user.id, email: data.user.email };
      const p: Profile = { id: data.user.id, role: mapRole(data.user.role), full_name: data.user.name };
      persist(data.token, u, p);
      return { error: null };
    } catch {
      return { error: 'Impossible de contacter le serveur.' };
    }
  };

  // ── signOut ────────────────────────────────────────────────────────────────
  const signOut = async () => { clear(); };

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Mappe les rôles Express (ADMIN/USER/ORGANIZER) vers les rôles Supabase
   * utilisés par les composants d'Islem.
   */
  function mapRole(expressRole: string): string {
    if (expressRole === 'ADMIN' || expressRole === 'ORGANIZER') return 'super_admin';
    return 'client';
  }

  const adminRoles = ['super_admin'];
  const isAdmin  = profile ? adminRoles.includes(profile.role) : false;
  const isClient = profile?.role === 'client';

  return (
    <AuthContext.Provider value={{
      user, profile, loading, hydrated, token,
      signIn, signUp, signOut,
      isAdmin, isClient,
      session: token ? { access_token: token } : null,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
