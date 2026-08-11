import { useEffect, useState } from 'react';
import { User, Shield, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientRecord } from '@/hooks/useClientRecord';
import { authApi } from '@/lib/neonApi';
import PageHeader from '@/components/ui/PageHeader';

export default function ClientProfil() {
  const { user, profile, signOut } = useAuth();
  const { client, clientId, setClient } = useClientRecord();
  const [tab, setTab] = useState<'info' | 'security'>('info');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [contact, setContact] = useState({ telephone: '', telephone_secondaire: '', email_secondaire: '', adresse: '', code_postal: '', ville: '', societe: '', siret: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' });
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    if (client) {
      setContact({
        telephone: client.telephone || '', telephone_secondaire: client.telephone_secondaire || '',
        email_secondaire: client.email_secondaire || '', adresse: client.adresse || '',
        code_postal: client.code_postal || '', ville: client.ville || '',
        societe: client.societe || '', siret: client.siret || '',
      });
      setFullName(prev => prev || [client.prenom, client.nom].filter(Boolean).join(' ') || user?.email?.split('@')[0] || '');
    }
  }, [client]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await authApi.updateMe({
        ...(fullName ? { name: fullName } : {}),
        phone: contact.telephone || null,
        phone2: contact.telephone_secondaire || null,
        email2: contact.email_secondaire || null,
        address: contact.adresse || null,
        postalCode: contact.code_postal || null,
        city: contact.ville || null,
        company: contact.societe || null,
        matfisc: contact.siret || null,
      });
      setClient(prev => prev ? { ...prev, ...contact, nom: fullName } : prev);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setSaving(false);
      alert(e?.message || 'Erreur lors de la sauvegarde.');
    }
  };

  const handleChangePassword = async () => {
    if (password.new !== password.confirm) { setPwError('Les mots de passe ne correspondent pas.'); return; }
    if (password.new.length < 6) { setPwError('Minimum 6 caractères.'); return; }
    if (!password.current) { setPwError('Saisissez votre mot de passe actuel.'); return; }
    setPwError('');
    try {
      await authApi.changePassword(password.current, password.new);
      setPassword({ current: '', new: '', confirm: '' });
    } catch (e: any) {
      setPwError(e?.message || 'Erreur lors du changement de mot de passe.');
    }
  };

  return (
    <div>
      <PageHeader title="Mon Profil" />

      {/* Profile header */}
      <div className="glass rounded-2xl p-6 mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gold-500/20 border-2 border-gold-500/40 flex items-center justify-center flex-shrink-0">
          <span className="text-gold-500 font-bold text-2xl">{(fullName || user?.email || 'U').charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <h2 className="text-white text-xl font-bold">{fullName || user?.email?.split('@')[0]}</h2>
          <p className="text-dark-400 text-sm">{user?.email}</p>
          <span className="badge bg-gold-500/20 text-gold-400 border border-gold-500/30 mt-1">Client</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[['info', <User size={15} />, 'Informations'] as const, ['security', <Shield size={15} />, 'Sécurité'] as const].map(([v, icon, label]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === v ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white'}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="glass rounded-2xl p-6 space-y-5 max-w-lg">
          <h3 className="text-white font-semibold mb-4">Informations personnelles</h3>
          <div>
            <label className="text-dark-300 text-sm mb-1.5 block">Nom complet</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} className="input-field" placeholder="Votre nom complet" />
          </div>
          <div>
            <label className="text-dark-300 text-sm mb-1.5 block">Email</label>
            <input value={user?.email || ''} readOnly className="input-field opacity-60 cursor-not-allowed" />
          </div>
          {clientId && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Téléphone</label>
                  <input value={contact.telephone} onChange={e => setContact(p => ({ ...p, telephone: e.target.value }))} className="input-field" placeholder="06 12 34 56 78" />
                </div>
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Téléphone secondaire</label>
                  <input value={contact.telephone_secondaire} onChange={e => setContact(p => ({ ...p, telephone_secondaire: e.target.value }))} className="input-field" />
                </div>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Email secondaire</label>
                <input value={contact.email_secondaire} onChange={e => setContact(p => ({ ...p, email_secondaire: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Adresse</label>
                <input value={contact.adresse} onChange={e => setContact(p => ({ ...p, adresse: e.target.value }))} className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Code postal</label>
                  <input value={contact.code_postal} onChange={e => setContact(p => ({ ...p, code_postal: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Ville</label>
                  <input value={contact.ville} onChange={e => setContact(p => ({ ...p, ville: e.target.value }))} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Société</label>
                  <input value={contact.societe} onChange={e => setContact(p => ({ ...p, societe: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">SIRET</label>
                  <input value={contact.siret} onChange={e => setContact(p => ({ ...p, siret: e.target.value }))} className="input-field" />
                </div>
              </div>
            </>
          )}
          <button onClick={handleSaveProfile} disabled={saving} className="btn-gold py-2.5 px-6 flex items-center gap-2">
            <Save size={16} />
            {saved ? 'Enregistré ✓' : saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      )}

      {tab === 'security' && (
        <div className="glass rounded-2xl p-6 space-y-5 max-w-lg">
          <h3 className="text-white font-semibold mb-4">Changer le mot de passe</h3>
          <div>
            <label className="text-dark-300 text-sm mb-1.5 block">Mot de passe actuel</label>
            <input type="password" value={password.current} onChange={e => setPassword(p => ({ ...p, current: e.target.value }))} className="input-field" placeholder="••••••••" />
          </div>
          <div>
            <label className="text-dark-300 text-sm mb-1.5 block">Nouveau mot de passe</label>
            <input type="password" value={password.new} onChange={e => setPassword(p => ({ ...p, new: e.target.value }))} className="input-field" placeholder="••••••••" />
          </div>
          <div>
            <label className="text-dark-300 text-sm mb-1.5 block">Confirmer</label>
            <input type="password" value={password.confirm} onChange={e => setPassword(p => ({ ...p, confirm: e.target.value }))} className="input-field" placeholder="••••••••" />
          </div>
          {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
          <button onClick={handleChangePassword} className="btn-gold py-2.5 px-6">Changer le mot de passe</button>

          <div className="border-t border-white/10 pt-5">
            <h3 className="text-white font-semibold mb-3">Session</h3>
            <p className="text-dark-400 text-sm mb-3">Connecté avec : {user?.email}</p>
            <button onClick={() => signOut()} className="border border-red-500/30 text-red-400 hover:bg-red-500/10 py-2 px-5 rounded-xl text-sm font-medium transition-all">
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
