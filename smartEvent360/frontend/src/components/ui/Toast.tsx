import { useEffect, useState, createContext, useContext, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, type, title, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const success = useCallback((t: string, m?: string) => toast('success', t, m), [toast]);
  const error   = useCallback((t: string, m?: string) => toast('error',   t, m), [toast]);
  const warning = useCallback((t: string, m?: string) => toast('warning', t, m), [toast]);
  const info    = useCallback((t: string, m?: string) => toast('info',    t, m), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 pointer-events-none">
        {toasts.map(t => (
          <ToastCard
            key={t.id}
            item={t}
            onClose={() => setToasts(p => p.filter(x => x.id !== t.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Single Toast Card ────────────────────────────────────────────────────────

const CONFIG: Record<ToastType, { icon: ReactNode; bg: string; border: string; text: string }> = {
  success: { icon: <CheckCircle size={18} />, bg: 'bg-green-500/15',  border: 'border-green-500/30',  text: 'text-green-400' },
  error:   { icon: <XCircle    size={18} />, bg: 'bg-red-500/15',    border: 'border-red-500/30',    text: 'text-red-400'   },
  warning: { icon: <AlertTriangle size={18}/>, bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', text: 'text-yellow-400'},
  info:    { icon: <Info       size={18} />, bg: 'bg-blue-500/15',   border: 'border-blue-500/30',   text: 'text-blue-400'  },
};

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  const cfg = CONFIG[item.type];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md transition-all duration-300 ${cfg.bg} ${cfg.border} ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
    >
      <span className={`mt-0.5 flex-shrink-0 ${cfg.text}`}>{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${cfg.text}`}>{item.title}</p>
        {item.message && <p className="text-xs text-dark-300 mt-0.5 leading-relaxed">{item.message}</p>}
      </div>
      <button onClick={onClose} className="text-dark-400 hover:text-white mt-0.5 flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
