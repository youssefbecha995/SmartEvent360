import { useState } from 'react';
import { Phone, Mail, MapPin, Clock, CheckCircle, Facebook, Instagram, Linkedin } from 'lucide-react';
import { publicApi } from '@/lib/neonApi';

export default function ContactPage() {
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', telephone: '', sujet: '', message: '', rgpd: false });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rgpd) { setError('Veuillez accepter la politique de confidentialité.'); return; }
    setLoading(true); setError('');
    try {
      await publicApi.submit('contact_messages', {
        nom: form.nom, prenom: form.prenom, email: form.email, telephone: form.telephone,
        sujet: form.sujet, message: form.message, rgpd: form.rgpd
      });
      setSuccess(true);
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-24 min-h-screen">
      <div className="bg-dark-800/50 border-b border-white/10 py-16 px-4 text-center">
        <p className="text-gold-500 text-sm font-medium uppercase tracking-widest mb-3">Parlons de votre projet</p>
        <h1 className="section-title mb-4">Contactez-nous</h1>
        <p className="text-dark-300">Une question ? Un projet ? Nous sommes là pour vous aider.</p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Form */}
          <div className="glass rounded-2xl p-8">
            {success ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                  <CheckCircle size={32} className="text-green-400" />
                </div>
                <h3 className="text-white text-xl font-bold mb-2">Message envoyé !</h3>
                <p className="text-dark-300">Nous vous répondrons dans les plus brefs délais.</p>
                <button onClick={() => { setSuccess(false); setForm({ nom: '', prenom: '', email: '', telephone: '', sujet: '', message: '', rgpd: false }); }}
                  className="btn-gold mt-6">Envoyer un autre message</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="text-xl font-semibold text-white mb-5">Formulaire de contact</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-dark-300 text-sm mb-1.5 block">Nom *</label>
                    <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} required className="input-field" placeholder="Votre nom" />
                  </div>
                  <div>
                    <label className="text-dark-300 text-sm mb-1.5 block">Prénom *</label>
                    <input value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} required className="input-field" placeholder="Votre prénom" />
                  </div>
                </div>
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required className="input-field" placeholder="votre@email.com" />
                </div>
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Téléphone</label>
                  <input value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} className="input-field" placeholder="06 12 34 56 78" />
                </div>
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Sujet *</label>
                  <select value={form.sujet} onChange={e => setForm(p => ({ ...p, sujet: e.target.value }))} required className="input-field">
                    <option value="">Choisir un sujet</option>
                    <option>Demande d'information</option>
                    <option>Demande de devis</option>
                    <option>Réclamation</option>
                    <option>Autre</option>
                  </select>
                </div>
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Message *</label>
                  <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} required rows={5} className="input-field resize-none" placeholder="Votre message..." />
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.rgpd} onChange={e => setForm(p => ({ ...p, rgpd: e.target.checked }))}
                    className="mt-1 w-4 h-4 accent-gold-500 flex-shrink-0" />
                  <span className="text-dark-400 text-sm">J'accepte la politique de confidentialité et le traitement de mes données *</span>
                </label>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button type="submit" disabled={loading} className="btn-gold w-full py-3.5 disabled:opacity-60">
                  {loading ? 'Envoi en cours...' : 'Envoyer le message'}
                </button>
              </form>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div className="glass rounded-2xl p-7">
              <h3 className="text-white font-semibold text-lg mb-5">Nos coordonnées</h3>
              <ul className="space-y-4">
                {[
                  { icon: <Phone size={18} />, label: '+33 1 23 45 67 89', desc: 'Appelez-nous directement' },
                  { icon: <Mail size={18} />, label: 'contact@smartevent360.fr', desc: 'Réponse sous 24h' },
                  { icon: <MapPin size={18} />, label: '12 Avenue des Lumières, 75001 Paris', desc: 'Venez nous rendre visite' },
                  { icon: <Clock size={18} />, label: 'Lun-Ven 9h–19h · Sam 10h–16h', desc: 'Nos horaires d\'ouverture' },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gold-500/20 flex items-center justify-center text-gold-500 flex-shrink-0">{item.icon}</div>
                    <div>
                      <p className="text-white text-sm font-medium">{item.label}</p>
                      <p className="text-dark-400 text-xs">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass rounded-2xl p-7">
              <h3 className="text-white font-semibold text-lg mb-4">Suivez-nous</h3>
              <div className="flex gap-3">
                {[Facebook, Instagram, Linkedin].map((Icon, i) => (
                  <button key={i} className="w-11 h-11 rounded-xl glass flex items-center justify-center text-dark-300 hover:text-gold-500 hover:border-gold-500/40 transition-all">
                    <Icon size={18} />
                  </button>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl overflow-hidden h-52 flex items-center justify-center">
              <div className="text-center text-dark-400">
                <MapPin size={32} className="mx-auto mb-2 text-gold-500" />
                <p className="text-sm">12 Avenue des Lumières, Paris</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
