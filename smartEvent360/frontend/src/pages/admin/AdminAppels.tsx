import { useEffect, useRef, useState } from 'react';
import { Plus, Search, X, Mic, Square, Trash2 } from 'lucide-react';
import { crmApi } from '@/lib/crmApi';
import { usersApi, uploadApi } from '@/lib/neonApi';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

export default function AdminAppels() {
  const [calls, setCalls] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ client_id: '', date_heure: '', duree_minutes: '', objet: '', notes: '', statut: 'reussi' });

  const [recording, setRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const load = async () => {
    try {
      const data = await crmApi.list('calls');
      data.sort((a: any, b: any) => new Date(b.date_heure || 0).getTime() - new Date(a.date_heure || 0).getTime());
      setCalls(data);
    } catch (e) {
      console.warn('[AdminAppels] échec du chargement API:', e);
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    usersApi.list().then(us => setClients(us)).catch(() => setClients([]));
  }, []);

  const clientName = (id: string | null) => {
    const c = clients.find(cl => cl.id === id);
    return c ? c.name : null;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        setRecordingBlob(blob);
        setRecordingUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      alert('Impossible d\'accéder au micro. Vérifiez les autorisations du navigateur.');
    }
  };

  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop();
    setRecording(false);
  };

  const discardRecording = () => {
    setRecordingBlob(null);
    setRecordingUrl('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let payload: any = { ...form, client_id: form.client_id || null, duree_minutes: form.duree_minutes ? parseInt(form.duree_minutes) : 0 };
      if (recordingBlob) {
        setUploadingAudio(true);
        const up = await uploadApi.audio(recordingBlob);
        payload.recording_url = up.url;
      }
      await crmApi.create('calls', payload);
      setShowModal(false);
      setForm({ client_id: '', date_heure: '', duree_minutes: '', objet: '', notes: '', statut: 'reussi' });
      discardRecording();
      load();
    } catch (e) {
      console.error('[AdminAppels] échec de la sauvegarde:', e);
      alert('Erreur lors de la sauvegarde.');
    } finally {
      setUploadingAudio(false);
      setSaving(false);
    }
  };

  const filtered = calls.filter(c =>
    `${clientName(c.client_id) || ''} ${c.objet || ''} ${c.statut}`.toLowerCase().includes(search.toLowerCase())
  );

  const statusIcon = { reussi: '✅', planifie: '📅', manque: '❌', a_rappeler: '🔄' };

  return (
    <div>
      <PageHeader title="Gestion des Appels" subtitle={`${calls.length} appels`}
        action={<button onClick={() => setShowModal(true)} className="btn-gold py-2 px-4 text-sm flex items-center gap-2"><Plus size={15} />Nouvel appel</button>} />

      <div className="relative max-w-xs mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2.5 text-sm" placeholder="Rechercher..." />
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/10">
              {['Client','Date','Durée','Objet','Notes','Statut','Enregistrement'].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-dark-400 text-xs font-medium uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? Array(5).fill(0).map((_, i) => (
                <tr key={i} className="border-b border-white/5"><td colSpan={7}><div className="h-10 bg-dark-700 rounded animate-pulse m-4" /></td></tr>
              )) : filtered.map((c, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/3">
                  <td className="px-5 py-4 text-white font-medium text-sm">{clientName(c.client_id) || '–'}</td>
                  <td className="px-5 py-4 text-dark-300 text-sm">{new Date(c.date_heure).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-5 py-4 text-dark-300 text-sm">{c.duree_minutes} min</td>
                  <td className="px-5 py-4 text-dark-200 text-sm max-w-48 truncate">{c.objet || '–'}</td>
                  <td className="px-5 py-4 text-dark-400 text-sm max-w-48 truncate">{c.notes || '–'}</td>
                  <td className="px-5 py-4">
                    <span className="text-sm">{(statusIcon as any)[c.statut] || '–'} </span>
                    <StatusBadge status={c.statut} />
                  </td>
                  <td className="px-5 py-4">
                    {c.recording_url ? (
                      <audio controls preload="none" src={c.recording_url} className="h-8 w-40" />
                    ) : <span className="text-dark-500 text-xs">–</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && <tr><td colSpan={7} className="text-center py-12 text-dark-400">Aucun appel</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-md w-full z-10 p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Nouvel appel</h2>
              <button onClick={() => setShowModal(false)} className="text-dark-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Client</label>
                <select value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))} className="input-field">
                  <option value="">Sélectionner</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Date & Heure *</label>
                  <input type="datetime-local" value={form.date_heure} onChange={e => setForm(p => ({ ...p, date_heure: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="text-dark-300 text-sm mb-1.5 block">Durée (min)</label>
                  <input type="number" value={form.duree_minutes} onChange={e => setForm(p => ({ ...p, duree_minutes: e.target.value }))} className="input-field" placeholder="10" />
                </div>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Objet</label>
                <input value={form.objet} onChange={e => setForm(p => ({ ...p, objet: e.target.value }))} className="input-field" placeholder="Ex: Briefing technique" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Statut</label>
                <select value={form.statut} onChange={e => setForm(p => ({ ...p, statut: e.target.value }))} className="input-field">
                  <option value="reussi">Réussi</option>
                  <option value="manque">Manqué</option>
                  <option value="a_rappeler">À rappeler</option>
                  <option value="planifie">Planifié</option>
                </select>
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Enregistrement vocal</label>
                {!recordingBlob ? (
                  <button onClick={recording ? stopRecording : startRecording}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all border ${recording ? 'bg-red-500/15 border-red-500/40 text-red-400 animate-pulse' : 'glass text-dark-200 hover:text-white'}`}>
                    {recording ? <><Square size={14} /> Arrêter l'enregistrement...</> : <><Mic size={14} /> Enregistrer la conversation</>}
                  </button>
                ) : (
                  <div className="glass rounded-xl p-3 space-y-2">
                    <audio controls src={recordingUrl} className="w-full h-9" />
                    <div className="flex gap-2">
                      <button onClick={() => { discardRecording(); }} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={11} /> Supprimer</button>
                      <span className="text-xs text-dark-500 ml-auto self-center">{recordingBlob.size > 0 ? `${Math.round(recordingBlob.size / 1024)} Ko` : ''}</span>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} className="input-field resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-ghost flex-1 py-2.5">Annuler</button>
              <button onClick={handleSave} disabled={!form.date_heure || saving || uploadingAudio} className="btn-gold flex-1 py-2.5 disabled:opacity-60">
                {saving ? (uploadingAudio ? 'Téléversement audio...' : 'Création...') : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
