import { useState } from 'react';
import { Save, Shield, Bell, Mail, Database, Settings, Building, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/ui/PageHeader';

const navItems = [
  { key: 'general', icon: <Settings size={16} />, label: 'Général' },
  { key: 'entreprise', icon: <Building size={16} />, label: 'Entreprise' },
  { key: 'utilisateurs', icon: <Users size={16} />, label: 'Utilisateurs' },
  { key: 'emails', icon: <Mail size={16} />, label: 'Emails' },
  { key: 'securite', icon: <Shield size={16} />, label: 'Sécurité' },
  { key: 'sauvegarde', icon: <Database size={16} />, label: 'Sauvegarde' },
];

const emailTemplates = [
  { key: 'confirmation_devis', label: 'Confirmation de devis' },
  { key: 'signature_contrat', label: 'Signature de contrat' },
  { key: 'rappel_rdv', label: 'Rappel de rendez-vous' },
  { key: 'envoi_facture', label: 'Envoi de facture' },
  { key: 'relance_paiement', label: 'Relance paiement' },
];

const mockUsers = [
  { email: 'admin@smartevent360.com',            role: 'Super Administrateur', last: 'Aujourd\'hui 08:32' },
  { email: 'anis.benhassena@smartevent360.com',  role: 'Super Administrateur', last: '25/02/2025' },
  { email: 'commercial@smartevent360.com',        role: 'Administrateur',       last: '24/02/2025' },
  { email: 'tech@smartevent360.com',              role: 'Administrateur',       last: '23/02/2025' },
];

export default function AdminParametres() {
  const [section, setSection] = useState('general');
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    app_name: 'SmartEvent360', langue: 'fr', timezone: 'Europe/Paris', maintenance: false,
    company_name: 'SmartEvent360 SAS', siret: '123 456 789 00012', phone: '+33 1 23 45 67 89',
    email: 'contact@smartevent360.fr', address: '12 Avenue des Lumières, 75001 Paris',
    twofa: true, pw_policy: 'Fort', session_timeout: '8h',
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Configuration de la plateforme" />

      <div className="flex gap-5">
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0">
          <div className="glass rounded-2xl p-3 space-y-0.5">
            {navItems.map(item => (
              <button key={item.key} onClick={() => setSection(item.key)}
                className={`sidebar-link w-full ${section === item.key ? 'active' : ''}`}>
                {item.icon}{item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 glass rounded-2xl p-7">
          {section === 'general' && (
            <div>
              <h2 className="text-white font-semibold text-lg mb-6">Configuration générale</h2>
              <div className="space-y-5 max-w-lg">
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Nom de l'application</label>
                  <input value={settings.app_name} onChange={e => setSettings(p => ({ ...p, app_name: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Langue</label>
                  <select value={settings.langue} onChange={e => setSettings(p => ({ ...p, langue: e.target.value }))} className="input-field">
                    <option value="fr">🇫🇷 Français</option>
                    <option value="ar">🇹🇳 العربية</option>
                  </select>
                </div>
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Fuseau horaire</label>
                  <select value={settings.timezone} onChange={e => setSettings(p => ({ ...p, timezone: e.target.value }))} className="input-field">
                    <option>Europe/Paris</option>
                    <option>Europe/London</option>
                    <option>America/New_York</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-4 bg-dark-700 rounded-xl">
                  <div>
                    <p className="text-white text-sm font-medium">Mode maintenance</p>
                    <p className="text-dark-400 text-xs">Affiche une page de maintenance aux visiteurs</p>
                  </div>
                  <button onClick={() => setSettings(p => ({ ...p, maintenance: !p.maintenance }))}
                    className={`relative w-12 h-6 rounded-full transition-all ${settings.maintenance ? 'bg-gold-500' : 'bg-dark-600'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.maintenance ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {section === 'entreprise' && (
            <div>
              <h2 className="text-white font-semibold text-lg mb-6">Informations entreprise</h2>
              <div className="space-y-4 max-w-lg">
                {[
                  ['company_name', 'Raison sociale'],
                  ['siret', 'SIRET'],
                  ['phone', 'Téléphone'],
                  ['email', 'Email'],
                  ['address', 'Adresse'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="text-dark-300 text-sm mb-1.5 block">{label}</label>
                    <input value={(settings as any)[key]} onChange={e => setSettings(p => ({ ...p, [key]: e.target.value }))} className="input-field" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'utilisateurs' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold text-lg">Utilisateurs & Permissions</h2>
                <button className="btn-gold py-2 px-4 text-sm">+ Ajouter</button>
              </div>
              <div className="glass rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-white/10">
                    {['Email','Rôle','Dernière connexion','Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-dark-400 text-xs font-medium">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {mockUsers.map((u, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/3">
                        <td className="px-4 py-3.5 text-dark-200 text-sm">{u.email}</td>
                        <td className="px-4 py-3.5"><span className="badge bg-gold-500/20 text-gold-400 border border-gold-500/30 text-xs">{u.role}</span></td>
                        <td className="px-4 py-3.5 text-dark-400 text-sm">{u.last}</td>
                        <td className="px-4 py-3.5"><button className="text-dark-400 hover:text-white text-xs transition-colors">Modifier</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === 'emails' && (
            <div>
              <h2 className="text-white font-semibold text-lg mb-6">Templates d'emails</h2>
              <div className="space-y-3">
                {emailTemplates.map(t => (
                  <div key={t.key} className="flex items-center justify-between p-4 bg-dark-700 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Mail size={16} className="text-gold-500" />
                      <span className="text-dark-200 text-sm">{t.label}</span>
                    </div>
                    <button className="text-gold-400 hover:text-gold-300 text-sm transition-colors">Modifier →</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'securite' && (
            <div>
              <h2 className="text-white font-semibold text-lg mb-6">Sécurité</h2>
              <div className="space-y-5 max-w-lg">
                <div className="flex items-center justify-between p-4 bg-dark-700 rounded-xl">
                  <div>
                    <p className="text-white text-sm font-medium">Authentification 2FA</p>
                    <p className="text-dark-400 text-xs">Obligatoire pour les administrateurs</p>
                  </div>
                  <button onClick={() => setSettings(p => ({ ...p, twofa: !p.twofa }))}
                    className={`relative w-12 h-6 rounded-full transition-all ${settings.twofa ? 'bg-gold-500' : 'bg-dark-600'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.twofa ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Politique des mots de passe</label>
                  <select value={settings.pw_policy} onChange={e => setSettings(p => ({ ...p, pw_policy: e.target.value }))} className="input-field">
                    <option>Faible (6 car. min)</option>
                    <option>Moyen (8 car. min)</option>
                    <option>Fort (12 car. + majuscule + chiffre)</option>
                  </select>
                </div>
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Expiration session</label>
                  <select value={settings.session_timeout} onChange={e => setSettings(p => ({ ...p, session_timeout: e.target.value }))} className="input-field">
                    <option>1h</option><option>4h</option><option>8h</option><option>24h</option>
                  </select>
                </div>
                <div className="p-4 bg-dark-700 rounded-xl">
                  <p className="text-white text-sm font-medium mb-3">Logs d'activité</p>
                  <p className="text-dark-400 text-xs mb-3">Conservation : 6 mois</p>
                  <button className="btn-ghost py-2 px-4 text-xs">Voir les logs →</button>
                </div>
              </div>
            </div>
          )}

          {section === 'sauvegarde' && (
            <div>
              <h2 className="text-white font-semibold text-lg mb-6">Sauvegarde & Restauration</h2>
              <div className="space-y-5 max-w-lg">
                <div className="p-5 bg-dark-700 rounded-xl">
                  <p className="text-white text-sm font-medium mb-1">Dernière sauvegarde</p>
                  <p className="text-green-400 text-sm">✅ 26/02/2025 à 02:00</p>
                  <p className="text-dark-400 text-xs mt-1">Prochaine : 27/02/2025 à 02:00</p>
                </div>
                <div className="flex gap-3">
                  <button className="btn-gold py-2.5 px-5 text-sm flex items-center gap-2">
                    <Database size={15} /> Sauvegarder maintenant
                  </button>
                  <button className="btn-ghost py-2.5 px-5 text-sm">Restaurer</button>
                </div>
                <div className="p-4 bg-dark-700 rounded-xl">
                  <p className="text-white text-sm font-medium mb-2">Sauvegardes disponibles</p>
                  {['26/02/2025 02:00', '25/02/2025 02:00', '24/02/2025 02:00'].map(d => (
                    <div key={d} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <span className="text-dark-300 text-sm">{d}</span>
                      <button className="text-gold-400 text-xs hover:text-gold-300 transition-colors">Restaurer</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 pt-5 border-t border-white/10">
            <button onClick={handleSave} className="btn-gold py-2.5 px-6 flex items-center gap-2">
              <Save size={16} />
              {saved ? 'Sauvegardé ✓' : 'Sauvegarder les modifications'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
