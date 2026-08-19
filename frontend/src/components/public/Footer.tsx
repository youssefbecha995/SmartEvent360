import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, Instagram, Facebook, Linkedin, Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-dark-900 border-t border-white/10 text-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-gold-500 flex items-center justify-center shadow-lg shadow-gold-500/10">
                <span className="text-white font-bold text-sm">SE</span>
              </div>
              <span className="text-white font-display font-bold text-lg">Smart<span className="text-gold-500">Event</span>360</span>
            </div>
            <p className="text-dark-300 text-sm leading-relaxed mb-4">
              L'excellence événementielle depuis 2008. Sonorisation, éclairage, scène et animation pour des moments inoubliables.
            </p>
            <div className="flex gap-3">
              {[Facebook, Instagram, Linkedin, Youtube].map((Icon, i) => (
                <button key={i} className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-dark-300 hover:text-gold-500 hover:border-gold-500/30 transition-all">
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Navigation</h3>
            <ul className="space-y-2">
              {[['/', 'Accueil'], ['/services', 'Services'], ['/packs', 'Nos Packs'], ['/a-propos', 'À propos'], ['/contact', 'Contact'], ['/devis', 'Demander un devis'], ['/rendez-vous', 'Prendre un rendez-vous']].map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="text-dark-300 hover:text-gold-400 text-sm transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Nos Services</h3>
            <ul className="space-y-2">
              {['Sonorisation Pro', 'Éclairage & Ambiance', 'Scène & Structures', 'DJ & Animation', 'Photographie', 'Vidéographie', 'LED Wall'].map(s => (
                <li key={s}>
                  <Link to="/services" className="text-dark-300 hover:text-gold-400 text-sm transition-colors">{s}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Phone size={16} className="text-gold-500 mt-0.5 flex-shrink-0" />
                <span className="text-dark-300 text-sm">+33 1 23 45 67 89</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail size={16} className="text-gold-500 mt-0.5 flex-shrink-0" />
                <span className="text-dark-300 text-sm">contact@smartevent360.fr</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={16} className="text-gold-500 mt-0.5 flex-shrink-0" />
                <span className="text-dark-300 text-sm">12 Avenue des Lumières, 75001 Paris</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock size={16} className="text-gold-500 mt-0.5 flex-shrink-0" />
                <div className="text-dark-300 text-sm">
                  <div>Lun-Ven : 9h – 19h</div>
                  <div>Sam : 10h – 16h</div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-dark-400 text-sm">© 2025 SmartEvent360. Tous droits réservés.</p>
          <div className="flex gap-6">
            {['Mentions légales', 'Politique de confidentialité', 'CGV'].map(l => (
              <button key={l} className="text-dark-500 hover:text-gold-500 text-xs transition-colors">{l}</button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
