import { useState } from 'react';
import { MessageSquare, Mail, HelpCircle, Send, Plus, Minus } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';

const faqs = [
  { q: 'Comment modifier mon événement ?', a: 'Rendez-vous dans la section "Mes Événements" et cliquez sur votre événement pour voir les détails. Contactez notre équipe pour toute modification importante.' },
  { q: 'Que faire en cas d\'annulation ?', a: 'Contactez-nous au plus vite. Les conditions d\'annulation sont définies dans votre contrat (50% remboursé si annulation > 30 jours).' },
  { q: 'Comment payer en ligne ?', a: 'Dans la section "Mes Paiements", cliquez sur "Payer le solde". Nous acceptons les cartes bancaires (Visa, Mastercard) et les virements.' },
  { q: 'Puis-je changer la date de mon événement ?', a: 'Oui, sous réserve de disponibilité. Contactez votre chargé de projet via le chat ou par téléphone au +33 1 23 45 67 89.' },
  { q: 'Comment fonctionne la signature électronique ?', a: 'Vous recevrez une notification pour signer votre devis en ligne. La signature est horodatée et juridiquement valable.' },
];

export default function ClientSupport() {
  const [tab, setTab] = useState<'chat' | 'email' | 'faq'>('chat');
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Bonjour ! Je suis l\'assistant SmartEvent360. Comment puis-je vous aider ?' },
  ]);
  const [input, setInput] = useState('');
  const [emailForm, setEmailForm] = useState({ sujet: '', message: '' });
  const [emailSent, setEmailSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { from: 'user', text: input }, { from: 'bot', text: 'Merci pour votre message. Un conseiller vous répondra sous peu. En attendant, consultez notre FAQ ou appelez-nous au +33 1 23 45 67 89.' }]);
    setInput('');
  };

  const sendEmail = () => {
    setEmailSent(true);
    setEmailForm({ sujet: '', message: '' });
  };

  return (
    <div>
      <PageHeader title="Support" subtitle="Nous sommes là pour vous aider !" />

      <div className="flex gap-2 mb-6 flex-wrap">
        {[['chat', <MessageSquare size={15} />, 'Chat en direct'] as const, ['email', <Mail size={15} />, 'Email'] as const, ['faq', <HelpCircle size={15} />, 'FAQ'] as const].map(([v, icon, label]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === v ? 'bg-gold-500 text-dark-900' : 'glass text-dark-300 hover:text-white'}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {tab === 'chat' && (
        <div className="glass rounded-2xl overflow-hidden max-w-2xl">
          <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="text-white text-sm font-medium">Support SmartEvent360</span>
            <span className="text-dark-400 text-xs ml-auto">En ligne</span>
          </div>
          <div className="h-72 overflow-y-auto p-5 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${m.from === 'user' ? 'bg-gold-500 text-dark-900 rounded-br-sm' : 'bg-dark-700 text-dark-200 rounded-bl-sm'}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-white/10 flex gap-3">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              className="input-field flex-1 py-2.5" placeholder="Votre message..." />
            <button onClick={sendMessage} className="btn-gold px-4 py-2.5">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {tab === 'email' && (
        <div className="glass rounded-2xl p-6 max-w-xl">
          {emailSent ? (
            <div className="text-center py-8">
              <Mail size={40} className="mx-auto mb-3 text-green-400" />
              <h3 className="text-white font-bold mb-2">Email envoyé !</h3>
              <p className="text-dark-400 text-sm">Nous vous répondrons sous 24h.</p>
              <button onClick={() => setEmailSent(false)} className="btn-gold mt-4 py-2 px-5 text-sm">Nouveau message</button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-white font-semibold mb-4">Envoyer un email au support</h3>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Sujet *</label>
                <input value={emailForm.sujet} onChange={e => setEmailForm(p => ({ ...p, sujet: e.target.value }))} className="input-field" placeholder="Objet de votre message" />
              </div>
              <div>
                <label className="text-dark-300 text-sm mb-1.5 block">Message *</label>
                <textarea value={emailForm.message} onChange={e => setEmailForm(p => ({ ...p, message: e.target.value }))} rows={5} className="input-field resize-none" placeholder="Décrivez votre problème..." />
              </div>
              <button onClick={sendEmail} disabled={!emailForm.sujet || !emailForm.message} className="btn-gold py-2.5 px-6 flex items-center gap-2 disabled:opacity-60">
                <Send size={16} /> Envoyer
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'faq' && (
        <div className="max-w-2xl space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="glass rounded-xl overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left">
                <span className="text-white font-medium text-sm">{faq.q}</span>
                <div className="w-6 h-6 rounded-full bg-dark-700 flex items-center justify-center flex-shrink-0 ml-3 text-gold-500">
                  {openFaq === i ? <Minus size={12} /> : <Plus size={12} />}
                </div>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-dark-300 text-sm leading-relaxed border-t border-white/5 pt-3">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
