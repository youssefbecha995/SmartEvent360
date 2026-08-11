import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginClientPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const next = (() => {
    const n = new URLSearchParams(window.location.search).get('next');
    return n && n.startsWith('/') && !n.startsWith('//') ? n : null;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error: err, role } = await signIn(email, password);
    setLoading(false);
    if (err) {
      setError('Identifiants incorrects. Vérifiez votre email et mot de passe.');
    } else {
      window.location.href = next ?? ((role === 'super_admin') ? '/admin' : '/client');
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4 relative">
      <img src="https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=1920" alt="" className="absolute inset-0 w-full h-full object-cover opacity-15" />
      <div className="absolute inset-0 bg-dark-900/70" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gold-500 flex items-center justify-center">
              <span className="text-dark-900 font-bold">SE</span>
            </div>
            <span className="text-white font-display font-bold text-xl">Smart<span className="text-gold-500">Event</span>360</span>
          </Link>
        </div>

        <div className="glass rounded-2xl p-8 border border-white/10">
          <div className="text-center mb-7">
            <h1 className="text-2xl font-display font-bold text-white mb-1">Connexion Espace Client</h1>
            <p className="text-dark-400 text-sm">Accédez à votre espace personnel</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input-field" placeholder="votre@email.com" />
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
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-gold-500" />
                <span className="text-dark-300 text-sm">Se souvenir de moi</span>
              </label>
              <button type="button" className="text-gold-500 text-sm hover:text-gold-400">Mot de passe oublié ?</button>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>}
            <button type="submit" disabled={loading} className="btn-gold w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-60">
              <LogIn size={18} />
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center space-y-3">
            <p className="text-dark-400 text-sm">Pas encore de compte ? <Link to={`/inscription${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-gold-500 hover:text-gold-400">Créer un compte</Link></p>
            <Link to="/connexion-admin" className="block text-dark-500 hover:text-dark-300 text-xs transition-colors">Connexion Administrateur →</Link>
          </div>

          <div className="mt-5 p-4 bg-dark-700/50 rounded-xl border border-dark-600 text-xs text-dark-400">
            <p className="font-medium text-dark-300 mb-1">Compte démo client :</p>
            <p>Email : client@smartevent360.com</p>
            <p>Mot de passe : client123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
