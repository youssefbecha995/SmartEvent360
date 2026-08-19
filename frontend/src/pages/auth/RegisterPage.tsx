import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const next = (() => {
    const n = new URLSearchParams(window.location.search).get('next');
    return n && n.startsWith('/') && !n.startsWith('//') ? n : null;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validation stricte
    if (!form.fullName.trim() || form.fullName.trim().length < 2) { setError('Le nom complet doit contenir au moins 2 caractères.'); return; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Format d\'email invalide.'); return; }
    if (form.password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (!/[A-Z]/.test(form.password)) { setError('Le mot de passe doit contenir au moins une majuscule.'); return; }
    if (!/[0-9]/.test(form.password)) { setError('Le mot de passe doit contenir au moins un chiffre.'); return; }
    if (form.password !== form.confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true); setError('');
    const { error: err } = await signUp(form.email, form.password, form.fullName, 'client');
    setLoading(false);
    if (err) setError(err);
    else window.location.href = next ?? '/client';
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
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
            <h1 className="text-2xl font-display font-bold text-white mb-1">Créer un compte</h1>
            <p className="text-dark-400 text-sm">Rejoignez SmartEvent360</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Nom complet *</label>
              <input value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} required className="input-field" placeholder="Jean Dupont" />
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required className="input-field" placeholder="votre@email.com" />
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Mot de passe *</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required className="input-field pr-11" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 space-y-1">
                  {[
                    { ok: form.password.length >= 8,    label: 'Au moins 8 caractères' },
                    { ok: /[A-Z]/.test(form.password),  label: 'Une majuscule' },
                    { ok: /[0-9]/.test(form.password),  label: 'Un chiffre' },
                  ].map((rule, i) => (
                    <p key={i} className={`text-xs flex items-center gap-1 ${rule.ok ? 'text-green-400' : 'text-dark-500'}`}>
                      <span>{rule.ok ? '✓' : '○'}</span> {rule.label}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Confirmer *</label>
              <input type="password" value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} required className="input-field" placeholder="••••••••" />
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>}
            <button type="submit" disabled={loading} className="btn-gold w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-60">
              <UserPlus size={18} />
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>
          <p className="text-center text-dark-400 text-sm mt-5">Déjà un compte ? <Link to={`/connexion-client${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-gold-500 hover:text-gold-400">Se connecter</Link></p>
        </div>
      </div>
    </div>
  );
}
