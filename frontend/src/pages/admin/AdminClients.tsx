import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Download, Eye, X } from 'lucide-react';
import { usersApi, NeonUser } from '@/lib/neonApi';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';

// Les "clients" dans Neon DB sont les utilisateurs (rôle USER)
// Les données CRM étendues (adresse, téléphone, société, CIN...) sont éditées sur la fiche client.

export default function AdminClients() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [users, setUsers]   = useState<NeonUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]  = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]  = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm]      = useState({ nom: '', prenom: '', profession: '', email: '', email2: '', phone: '', phone2: '', postalCode: '', address: '', password: '', role: 'USER' });

  const load = async () => {
    setLoading(true);
    try {
      const data = await usersApi.list();
      setUsers(data);
    } catch (e: any) {
      toastError('Erreur chargement', e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ nom: '', prenom: '', profession: '', email: '', email2: '', phone: '', phone2: '', postalCode: '', address: '', password: '', role: 'USER' }); setFormError(''); setShowModal(true); };

  const handleExport = async () => {
    try {
      const data = await usersApi.list();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `utilisateurs-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toastError('Erreur export', e.message);
    }
  };

  const handleSave = async () => {
    if (!form.nom.trim() || !form.prenom.trim() || !form.email.trim() || !form.password) {
      setFormError('Nom, prénom, email et mot de passe sont requis.');
      return;
    }
    setSaving(true);
    try {
      const u = await usersApi.create({
        nom: form.nom.trim(), prenom: form.prenom.trim(),
        name: `${form.prenom.trim()} ${form.nom.trim()}`,
        profession: form.profession.trim() || null,
        email: form.email.trim(), email2: form.email2.trim() || null,
        phone: form.phone.trim() || null, phone2: form.phone2.trim() || null,
        postalCode: form.postalCode.trim() || null, address: form.address.trim() || null,
        password: form.password, role: form.role,
      });
      success('Client créé ✓', u.name);
      setShowModal(false);
      load();
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  const filtered = users.filter(u =>
    `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(search.toLowerCase())
  );

  const roleColor: Record<string, string> = {
    ADMIN:     'bg-gold-500/20 text-gold-400 border-gold-500/30',
    ORGANIZER: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    USER:      'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title="Utilisateurs (Neon DB)"
        subtitle={`${users.length} comptes inscrits`}
        action={
          <div className="flex gap-2">
            <button onClick={openCreate} className="btn-gold py-2 px-4 text-sm flex items-center gap-2">
              <Plus size={15} /> Ajouter client
            </button>
            <button onClick={handleExport} className="glass py-2 px-4 text-sm flex items-center gap-2 text-dark-300 hover:text-white">
              <Download size={15} /> Export JSON
            </button>
          </div>
        }
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2.5 text-sm w-full" placeholder="Nom, email, rôle..." />
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['ID', 'Nom', 'Email', 'Téléphone', 'Rôle', 'Inscrit le', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 text-dark-400 text-xs font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <SkeletonTable rows={6} /> : filtered.map(u => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer" onClick={() => navigate(`/admin/clients/${u.id}`)}>
                  <td className="px-4 py-3.5 text-dark-400 font-mono text-xs">{u.id.slice(0,8)}…</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center text-dark-300 text-xs font-bold flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-white text-sm font-medium">{u.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-dark-300 text-sm">{u.email}</td>
                  <td className="px-4 py-3.5 text-dark-300 text-sm">{u.phone || '–'}</td>
                  <td className="px-4 py-3.5">
                    <span className={`badge border text-xs ${roleColor[u.role] ?? 'bg-dark-700 text-dark-300'}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3.5 text-dark-400 text-xs">{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/admin/clients/${u.id}`)} className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 transition-all"><Eye size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && <div className="text-center py-12 text-dark-400">Aucun utilisateur trouvé</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-lg w-full z-10 p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Ajouter un client</h2>
              <button onClick={() => setShowModal(false)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            {formError && <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-2.5">{formError}</div>}
            <div className="grid grid-cols-2 gap-4">
              {[['nom','Nom *'],['prenom','Prénom *']].map(([k,l]) => (
                <div key={k}>
                  <label className="text-dark-300 text-sm mb-1.5 block">{l}</label>
                  <input value={(form as any)[k]} onChange={e => { setForm(p => ({ ...p, [k]: e.target.value })); setFormError(''); }} className="input-field" placeholder={l.replace(' *','')} />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Profession</label>
                <input value={form.profession} onChange={e => { setForm(p => ({ ...p, profession: e.target.value })); setFormError(''); }} className="input-field" placeholder="Ex: Commerçant, Avocat..." />
              </div>
              {[['email','Email *'],['email2','2ème email']].map(([k,l]) => (
                <div key={k}>
                  <label className="text-dark-300 text-sm mb-1.5 block">{l}</label>
                  <input type="email" value={(form as any)[k]} onChange={e => { setForm(p => ({ ...p, [k]: e.target.value })); setFormError(''); }} className="input-field" placeholder={l.includes('*') ? 'client@exemple.com' : '2eme@exemple.com'} />
                </div>
              ))}
              {[['phone','Téléphone'],['phone2','2ème téléphone']].map(([k,l]) => (
                <div key={k}>
                  <label className="text-dark-300 text-sm mb-1.5 block">{l}</label>
                  <input value={(form as any)[k]} onChange={e => { setForm(p => ({ ...p, [k]: e.target.value })); setFormError(''); }} className="input-field" placeholder="+216 XX XXX XXX" />
                </div>
              ))}
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Code postal</label>
                <input value={form.postalCode} onChange={e => { setForm(p => ({ ...p, postalCode: e.target.value })); setFormError(''); }} className="input-field" placeholder="1001" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Rôle</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="input-field">
                  <option value="USER">Client</option>
                  <option value="ORGANIZER">Organisateur</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Adresse</label>
                <input value={form.address} onChange={e => { setForm(p => ({ ...p, address: e.target.value })); setFormError(''); }} className="input-field" placeholder="Rue, ville..." />
              </div>
              <div className="col-span-2">
                <label className="text-dark-300 text-sm mb-1.5 block">Mot de passe *</label>
                <input type="password" value={form.password} onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setFormError(''); }} className="input-field" placeholder="••••••••" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-ghost flex-1 py-2.5">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="btn-gold flex-1 py-2.5 disabled:opacity-60">{saving ? 'Création...' : 'Créer le client'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
