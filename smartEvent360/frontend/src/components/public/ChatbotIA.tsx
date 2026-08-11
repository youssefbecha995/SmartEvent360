import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Minimize2, Maximize2, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Message {
  from: 'bot' | 'user';
  text: string;
  options?: { label: string; value: string; action?: string }[];
  timestamp: Date;
}

interface PrefillData {
  type_evenement?: string;
  nb_invites?: string;
  budget?: number;
  services?: string[];
}

// Context to share prefill data with the quote form
export const chatbotPrefill: { data: PrefillData } = { data: {} };

type Step = 'welcome' | 'type' | 'guests' | 'budget' | 'result' | 'open';

const packSuggestion = (guests: number, budget: number) => {
  if (guests <= 50 || budget < 1000) return { name: 'Bronze', price: '950 DT', path: '/packs' };
  if (guests <= 100 || budget < 2000) return { name: 'Silver', price: '1 500 DT', path: '/packs' };
  if (guests <= 200 || budget < 4000) return { name: 'Gold', price: '3 200 DT', path: '/packs' };
  return { name: 'VIP', price: '5 500 DT', path: '/packs' };
};

const CONTEXT_MESSAGES: Record<string, string> = {
  '/': 'Bonjour ! Vous visitez notre page d\'accueil. Puis-je vous aider à choisir un pack ou à préparer votre demande de devis ?',
  '/services': 'Besoin d\'aide pour choisir un service ? Je peux vous guider selon votre type d\'événement.',
  '/packs': 'Quel pack correspond le mieux à votre événement ? Je peux vous aider à choisir !',
  '/a-propos': 'En savoir plus sur notre histoire ? N\'hésitez pas à me poser vos questions.',
  '/contact': 'Vous avez une question ? Je suis là pour vous aider avant que vous remplissiez le formulaire.',
  '/devis': 'Je peux vous guider pour remplir ce formulaire ! Commençons par quelques questions rapides.',
};

export default function ChatbotIA() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [step, setStep] = useState<Step>('welcome');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [hasShownBubble, setHasShownBubble] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [prefill, setPrefill] = useState<PrefillData>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pathname = window.location.pathname;
  const contextMsg = CONTEXT_MESSAGES[pathname] || CONTEXT_MESSAGES['/'];

  // Show bubble after 3s
  useEffect(() => {
    if (!hasShownBubble) {
      const t = setTimeout(() => { setBubbleVisible(true); setHasShownBubble(true); }, 3000);
      return () => clearTimeout(t);
    }
  }, [hasShownBubble]);

  useEffect(() => {
    if (bubbleVisible) {
      const t = setTimeout(() => setBubbleVisible(false), 6000);
      return () => clearTimeout(t);
    }
  }, [bubbleVisible]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (msg: Omit<Message, 'timestamp'>) => {
    setMessages(prev => [...prev, { ...msg, timestamp: new Date() }]);
  };

  const startChat = () => {
    setOpen(true);
    setBubbleVisible(false);
    if (messages.length === 0) {
      setTimeout(() => {
        addMessage({
          from: 'bot',
          text: contextMsg,
          options: [
            { label: '🎯 Préparer un devis', value: 'devis', action: 'start_devis' },
            { label: '📦 Voir les packs', value: 'packs', action: 'packs' },
            { label: '💬 Poser une question', value: 'question', action: 'open' },
          ],
        });
      }, 300);
    }
  };

  const handleOption = (opt: { label: string; value: string; action?: string }) => {
    addMessage({ from: 'user', text: opt.label });

    if (opt.action === 'start_devis') {
      setStep('type');
      setTimeout(() => addMessage({
        from: 'bot', text: 'Quel type d\'événement souhaitez-vous organiser ?',
        options: [
          { label: '💒 Mariage', value: 'mariage' },
          { label: '🏢 Séminaire', value: 'seminaire' },
          { label: '🎉 Soirée privée', value: 'soiree' },
          { label: '🎵 Concert / Festival', value: 'concert' },
          { label: '📅 Autre', value: 'autre' },
        ],
      }), 400);
    } else if (opt.action === 'packs') {
      setTimeout(() => addMessage({
        from: 'bot', text: 'Voici nos 4 packs disponibles. Cliquez pour voir les détails.',
        options: [
          { label: '🥉 Bronze – 950 DT', value: 'bronze' },
          { label: '🥈 Silver – 1 500 DT', value: 'silver' },
          { label: '🥇 Gold – 3 200 DT', value: 'gold' },
          { label: '👑 VIP – 5 500 DT', value: 'vip' },
        ],
      }), 400);
    } else if (opt.action === 'open' || step === 'open') {
      setStep('open');
      setTimeout(() => addMessage({ from: 'bot', text: 'Posez votre question ci-dessous, je ferai de mon mieux pour vous répondre !' }), 400);
    } else if (step === 'type') {
      setPrefill(p => ({ ...p, type_evenement: opt.value }));
      chatbotPrefill.data.type_evenement = opt.value;
      setStep('guests');
      setTimeout(() => addMessage({
        from: 'bot', text: 'Combien de personnes prévoyez-vous ?',
        options: [
          { label: 'Moins de 50', value: '40' },
          { label: '50 – 100', value: '80' },
          { label: '100 – 200', value: '150' },
          { label: '200+', value: '250' },
        ],
      }), 400);
    } else if (step === 'guests') {
      const guests = parseInt(opt.value);
      setPrefill(p => ({ ...p, nb_invites: opt.value }));
      chatbotPrefill.data.nb_invites = opt.value;
      setStep('budget');
      setTimeout(() => addMessage({
        from: 'bot', text: 'Quel est votre budget approximatif ?',
        options: [
          { label: 'Moins de 1 000 DT', value: '800' },
          { label: '1 000 – 3 000 DT', value: '2000' },
          { label: '3 000 – 5 000 DT', value: '4000' },
          { label: '5 000 DT+', value: '7000' },
        ],
      }), 400);
    } else if (step === 'budget') {
      const budget = parseInt(opt.value);
      const guests = parseInt(prefill.nb_invites || '100');
      const pack = packSuggestion(guests, budget);
      chatbotPrefill.data = { ...chatbotPrefill.data };
      setStep('result');
      setTimeout(() => addMessage({
        from: 'bot',
        text: `Parfait ! D'après vos critères, je vous recommande notre **${pack.name}** à partir de **${pack.price}**.\n\nVoulez-vous que je pré-remplisse le formulaire de devis ?`,
        options: [
          { label: '✅ Oui, remplir le formulaire', value: 'prefill', action: 'go_devis' },
          { label: '📦 Voir tous les packs', value: 'packs_page', action: 'packs' },
          { label: '💬 Autre question', value: 'other', action: 'open' },
        ],
      }), 600);
    } else if (opt.action === 'go_devis') {
      setTimeout(() => addMessage({
        from: 'bot',
        text: '✅ Parfait ! Vos informations ont été enregistrées. Cliquez sur le bouton ci-dessous pour accéder au formulaire pré-rempli.',
        options: [{ label: '📝 Accéder au formulaire de devis', value: 'devis_link', action: 'link_devis' }],
      }), 400);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    addMessage({ from: 'user', text });

    // Simple keyword-based responses
    setTimeout(() => {
      let reply = 'Je vais transmettre votre question à notre équipe. Vous pouvez aussi nous contacter directement au +33 1 23 45 67 89.';
      if (/prix|tarif|coût|coute/i.test(text)) reply = 'Nos tarifs varient selon les packs : Bronze 950DT, Silver 1 500DT, Gold 3 200DT, VIP 5 500DT. Voulez-vous une estimation personnalisée ?';
      if (/mariage/i.test(text)) reply = 'Pour un mariage, nous recommandons le Pack Gold ou VIP. Ils incluent son, lumière, DJ et possibilité d\'ajouter photographe et vidéaste.';
      if (/délai|urgent|rapidement/i.test(text)) reply = 'Nous pouvons intervenir avec un préavis de 14 jours minimum. Pour les événements urgents, contactez-nous directement au +33 1 23 45 67 89.';
      if (/disponib/i.test(text)) reply = 'Pour vérifier nos disponibilités sur une date précise, le mieux est de soumettre une demande de devis avec votre date souhaitée.';
      if (/paiement|acompte/i.test(text)) reply = 'Nous demandons un acompte de 50% à la signature du contrat, le solde 30 jours avant l\'événement. Paiement par CB, virement ou chèque.';
      addMessage({ from: 'bot', text: reply });
    }, 600);
  };

  const formatText = (text: string) =>
    text.split('**').map((part, i) =>
      i % 2 === 1 ? <strong key={i} className="text-gold-400">{part}</strong> : part
    );

  return (
    <>
      {/* Bubble hint */}
      {bubbleVisible && !open && (
        <div className="fixed bottom-24 right-6 z-40 animate-fade-up">
          <div className="bg-dark-800 border border-white/10 rounded-2xl rounded-br-sm shadow-2xl px-4 py-3 max-w-52">
            <p className="text-white text-sm leading-snug">{contextMsg.split('.')[0]}.</p>
            <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-dark-800 border-r border-b border-white/10 rotate-45" />
          </div>
        </div>
      )}

      {/* Floating button */}
      {!open && (
        <button onClick={startChat}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gold-500 text-white shadow-2xl shadow-gold-500/30 flex items-center justify-center hover:bg-gold-600 hover:scale-110 transition-all animate-pulse-gold">
          <MessageSquare size={24} />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className={`fixed bottom-6 right-6 z-40 bg-dark-800/95 backdrop-blur-md border border-gold-500/20 rounded-3xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden transition-all duration-300 ${
          minimized ? 'w-72 h-14' : 'w-80 sm:w-96 h-[520px]'
        }`}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-dark-800 border-b border-white/10 flex-shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center">
              <Bot size={16} className="text-gold-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-accent font-semibold leading-tight">Assistant SmartEvent360</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-dark-300 text-xs">En ligne</span>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setMinimized(!minimized)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-dark-400 hover:text-white hover:bg-white/5 transition-all">
                {minimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
              </button>
              <button onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-dark-400 hover:text-white hover:bg-white/5 transition-all">
                <X size={14} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none bg-dark-900/60">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                    {msg.from === 'bot' && (
                      <div className="w-7 h-7 rounded-full bg-gold-500/20 border border-gold-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot size={13} className="text-gold-500" />
                      </div>
                    )}
                    <div className={`max-w-[80%] ${msg.from === 'user' ? '' : ''}`}>
                      <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.from === 'user'
                          ? 'bg-gold-500 text-white rounded-br-sm font-medium shadow-lg shadow-gold-500/10'
                          : 'bg-white/[0.08] text-dark-100 rounded-bl-sm border border-white/10'
                      }`}>
                        {msg.from === 'bot' ? formatText(msg.text) : msg.text}
                      </div>
                      {msg.options && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {msg.options.map((opt, j) => (
                            opt.action === 'link_devis' ? (
                              <Link key={j} to="/devis"
                                className="text-xs bg-gold-500 text-dark-900 font-semibold px-3 py-1.5 rounded-full hover:bg-gold-400 transition-all">
                                {opt.label}
                              </Link>
                            ) : (
                              <button key={j}
                                onClick={() => handleOption(opt)}
                                className="text-xs bg-dark-600 border border-dark-500 text-dark-200 hover:text-white hover:border-gold-500/40 hover:bg-dark-500 px-3 py-1.5 rounded-full transition-all">
                                {opt.label}
                              </button>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-white/10 flex-shrink-0">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Votre message..."
                    className="flex-1 bg-dark-700 border border-dark-600 rounded-xl px-3.5 py-2 text-sm text-white placeholder-dark-400 focus:outline-none focus:border-gold-500 transition-colors"
                  />
                  <button onClick={handleSend} disabled={!input.trim()}
                    className="w-9 h-9 rounded-xl bg-gold-500 text-dark-900 flex items-center justify-center hover:bg-gold-400 transition-all disabled:opacity-40 flex-shrink-0">
                    <Send size={15} />
                  </button>
                </div>
                <p className="text-dark-400 text-xs text-center mt-2">SmartEvent360 Assistant · IA</p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
