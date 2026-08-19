import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginAdminPage() {
  const { signIn } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const ADMIN_ROLES = ['super_admin'];

  const next = (() => {
    const n = new URLSearchParams(window.location.search).get('next');
    return n && n.startsWith('/') && !n.startsWith('//') ? n : null;
  })();

  const validate = (): string | null => {
    if (!email.trim()) return 'L\'email est requis.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Format d\'email invalide.';
    if (!password) return 'Le mot de passe est requis.';
    if (password.length < 6) return 'Mot de passe trop court (min. 6 caractères).';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true); setError('');

    const { error: err, role } = await signIn(email, password);
    setLoading(false);

    if (err) {
      setError(err.includes('contacter le serveur') || err.includes('ne répond pas')
        ? err
        : 'Identifiants incorrects ou accès non autorisé.');
    } else {
      const destination = next ?? (((role && ADMIN_ROLES.includes(role)) || email.toLowerCase().includes('admin'))
        ? '/admin'
        : '/client');
      window.location.href = destination;
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900" />
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #D4AF37 0%, transparent 50%)' }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gold-500 flex items-center justify-center">
              <span className="text-dark-900 font-bold">SE</span>
            </div>
            <div className="text-left">
              <div className="text-white font-display font-bold text-xl leading-tight">Smart<span className="text-gold-500">Event</span>360</div>
              <div className="text-dark-400 text-xs">Back Office – ERP</div>
            </div>
          </Link>
        </div>

        <div className="glass rounded-2xl p-8 border border-white/10">
          <div className="text-center mb-7">
            <div className="w-12 h-12 rounded-xl bg-gold-500/20 border border-gold-500/40 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck size={22} className="text-gold-500" />
            </div>
            <h1 className="text-2xl font-display font-bold text-white mb-1">Accès Administrateur</h1>
            <p className="text-dark-400 text-sm">Espace sécurisé – Réservé au personnel</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input-field" placeholder="admin@smartevent360.com" />
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Mot de passe</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required className="input-field pr-11" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>}
            <button type="submit" disabled={loading} className="btn-gold w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-60">
              <ShieldCheck size={18} />
              {loading ? 'Vérification...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-white/10 text-center">
            <Link to="/connexion-client" className="text-dark-500 hover:text-dark-300 text-xs transition-colors">← Espace Client</Link>
          </div>

          <div className="mt-5 p-4 bg-dark-700/50 rounded-xl border border-dark-600 text-xs text-dark-400">
            <p className="font-medium text-dark-300 mb-2">Connexion rapide (démo) :</p>
            <button type="button"
              onClick={() => { setEmail('admin@smartevent360.com'); setPassword('admin123'); setError(''); }}
              className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg bg-dark-600 hover:bg-dark-500 transition-colors text-dark-200 hover:text-white">
              <span>👑 Super Admin</span>
              <span className="text-dark-500 text-xs">admin@smartevent360.com / admin123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
