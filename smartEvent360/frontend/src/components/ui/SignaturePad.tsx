import { useEffect, useRef, useState } from 'react';
import { X, RotateCcw } from 'lucide-react';

interface SignaturePadProps {
  title: string;
  subtitle?: string;
  signerName: string;
  onConfirm: (dataUrl: string) => void;
  onClose: () => void;
  confirmLabel?: string;
  confirming?: boolean;
}

export default function SignaturePad({ title, subtitle, signerName, onConfirm, onClose, confirmLabel = 'Confirmer la signature', confirming }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const point = 'touches' in e ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stop = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const confirm = () => {
    const canvas = canvasRef.current!;
    onConfirm(canvas.toDataURL('image/png'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dark-800 border border-white/10 rounded-2xl max-w-lg w-full z-10 p-7">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white"><X size={18} /></button>
        </div>

        {subtitle && (
          <div className="bg-dark-700 rounded-xl p-4 mb-5 text-sm text-dark-300">
            {subtitle}
            <p className="mt-2">En signant ce document, je reconnais avoir pris connaissance et accepter les conditions générales de vente.</p>
          </div>
        )}

        <p className="text-dark-400 text-xs mb-2">Signez dans la zone ci-dessous</p>
        <div className="bg-dark-900 border-2 border-dashed border-dark-500 rounded-xl overflow-hidden mb-2">
          <canvas
            ref={canvasRef}
            width={440}
            height={160}
            className="w-full h-40 touch-none cursor-crosshair"
            onMouseDown={start}
            onMouseMove={move}
            onMouseUp={stop}
            onMouseLeave={stop}
            onTouchStart={start}
            onTouchMove={move}
            onTouchEnd={stop}
          />
        </div>
        <button onClick={clear} className="text-dark-400 hover:text-white text-xs flex items-center gap-1.5 mb-5">
          <RotateCcw size={12} /> Effacer
        </button>

        <div className="bg-dark-700 rounded-xl p-3 mb-6 text-xs text-dark-400 space-y-0.5">
          <p>Signataire : <span className="text-dark-200">{signerName}</span></p>
          <p>Date : <span className="text-dark-200">{new Date().toLocaleString('fr-FR')}</span></p>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5">Annuler</button>
          <button onClick={confirm} disabled={!hasDrawn || confirming} className="btn-gold flex-1 py-2.5 disabled:opacity-60">
            {confirming ? 'Enregistrement...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
