import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { notificationsApi, type NeonNotification } from '@/lib/neonApi';

interface Props {
  light?: boolean;
  buttonClass?: string;
}

const TYPE_ICON: Record<NeonNotification['type'], typeof Info> = {
  INFO: Info,
  SUCCESS: CheckCircle2,
  WARNING: AlertTriangle,
  ERROR: XCircle,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

export default function NotificationBell({ light, buttonClass }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NeonNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await notificationsApi.list(20);
      setItems(res.data);
      setUnread(res.unread);
    } catch {
      // silencieux : pas de panique si l'API est indisponible
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleOpen = async () => {
    setOpen(o => !o);
    if (!open) refresh();
  };

  const handleItemClick = async (n: NeonNotification) => {
    if (!n.isRead) {
      setUnread(u => Math.max(0, u - 1));
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
      notificationsApi.markRead(n.id).catch(() => null);
    }
    setOpen(false);
    if (n.lien) navigate(n.lien);
  };

  const handleReadAll = async () => {
    setItems(prev => prev.map(x => ({ ...x, isRead: true })));
    setUnread(0);
    notificationsApi.readAll().catch(() => null);
  };

  const btn = buttonClass ?? (light
    ? 'relative text-slate-500 hover:text-gold-600'
    : 'relative text-dark-300 hover:text-gold-500');

  return (
    <div className="relative" ref={ref}>
      <button onClick={handleOpen} className={btn} title="Notifications">
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-gold-500 rounded-full text-dark-900 text-xs flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute right-0 top-full mt-2 w-80 sm:w-96 z-50 rounded-2xl shadow-2xl shadow-black/50 border overflow-hidden ${light ? 'bg-white border-gold-500/30' : 'bg-dark-800 border-white/10'}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className={`text-sm font-semibold ${light ? 'text-dark-900' : 'text-white'}`}>Notifications</span>
            {unread > 0 && (
              <button onClick={handleReadAll} className={`text-xs flex items-center gap-1 ${light ? 'text-gold-600 hover:text-gold-700' : 'text-gold-400 hover:text-gold-300'} transition-colors`}>
                <CheckCheck size={14} /> Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-dark-400">Chargement…</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-sm text-dark-400">Aucune notification</div>
            ) : (
              items.map(n => {
                const Icon = TYPE_ICON[n.type] ?? Info;
                const iconColor = n.type === 'SUCCESS' ? 'text-emerald-400' : n.type === 'ERROR' ? 'text-red-400' : n.type === 'WARNING' ? 'text-amber-400' : 'text-gold-500';
                return (
                  <button
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`w-full text-left flex gap-3 px-4 py-3 border-b border-white/5 transition-colors ${n.isRead ? 'opacity-60' : ''} ${light ? 'hover:bg-gold-500/5' : 'hover:bg-white/5'}`}
                  >
                    <Icon size={17} className={`flex-shrink-0 mt-0.5 ${iconColor}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${light ? 'text-dark-900' : 'text-white'}`}>{n.title}</p>
                      <p className={`text-xs mt-0.5 ${light ? 'text-dark-500' : 'text-dark-300'} line-clamp-2`}>{n.message}</p>
                      <p className={`text-[10px] mt-1 ${light ? 'text-dark-400' : 'text-dark-500'}`}>{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-gold-500 flex-shrink-0 mt-1.5" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
