import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown, Star, ArrowRight, Check,
  Volume2, Lightbulb, Music, Video,
  ChevronLeft, ChevronRight, Plus, Minus, Play
} from 'lucide-react';

function useCountUp(target: number, duration = 2000, trigger = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, trigger]);
  return count;
}

function CounterCard({ value, label, icon }: { value: number; label: string; icon: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const count = useCountUp(value, 2000, visible);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="glass rounded-2xl p-6 flex flex-col items-center text-center group hover:border-gold-500/30 transition-all">
      <div className="w-12 h-12 rounded-xl bg-gold-500/20 flex items-center justify-center mb-3 text-gold-500 group-hover:bg-gold-500/30 transition-colors">
        {icon}
      </div>
      <div className="text-4xl font-display font-bold text-gold-500 mb-1">+{count}</div>
      <div className="text-dark-300 text-sm">{label}</div>
    </div>
  );
}

const testimonials = [
  { name: 'Jean Dupont', company: 'Mariage – 300 invités', rating: 5, avatar: 'JD', text: '"Un service exceptionnel ! L\'équipe a su transformer notre mariage en un moment magique. Merci pour votre professionnalisme et votre créativité !"' },
  { name: 'Sophie Martin', company: 'Séminaire TechCorp – 150 pers.', rating: 5, avatar: 'SM', text: '"La meilleure agence événementielle ! Le séminaire de notre entreprise a été un succès total grâce à leur équipe. Je recommande vivement !"' },
  { name: 'Pierre Robert', company: 'Soirée privée – 200 invités', rating: 4, avatar: 'PR', text: '"Excellent travail, son et lumière impeccables. L\'ambiance était parfaite, nos invités ont adoré la soirée !"' },
];

const faqs = [
  { q: 'Comment se déroule une réservation ?', a: 'En 3 étapes simples : demande de devis en ligne → signature du contrat → versement de l\'acompte (50%). Notre équipe vous accompagne à chaque étape pour garantir la réussite de votre événement.' },
  { q: 'Quels sont les délais de préparation ?', a: 'Le délai minimum est de 14 jours pour un événement classique. Pour les mariages et festivals, nous recommandons 30 jours minimum pour une organisation optimale.' },
  { q: 'Proposez-vous des services personnalisés ?', a: 'Absolument ! Nous créons des offres sur mesure pour chaque événement. Nos experts vous conseillent pour créer l\'expérience parfaite selon votre budget et vos envies.' },
  { q: 'Quels sont les moyens de paiement acceptés ?', a: 'Nous acceptons le paiement par carte bancaire (en ligne via Stripe), virement bancaire, chèque et espèces. Un acompte de 50% est requis à la signature du contrat.' },
  { q: 'Intervenez-vous hors de Paris ?', a: 'Oui, nous intervenons dans toute la France et dans certains pays européens. Des frais de déplacement peuvent s\'appliquer selon la distance.' },
];

const galleryItems = [
  { label: 'Mariage Royal', img: 'https://images.pexels.com/photos/1045541/pexels-photo-1045541.jpeg?auto=compress&cs=tinysrgb&w=600', tall: true },
  { label: 'Séminaire Corporate', img: 'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=600', tall: false },
  { label: 'Soirée Privée', img: 'https://images.pexels.com/photos/787961/pexels-photo-787961.jpeg?auto=compress&cs=tinysrgb&w=600', tall: false },
  { label: 'Concert Live', img: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=600', tall: true },
  { label: 'Festival', img: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600', tall: false },
  { label: 'Anniversaire', img: 'https://images.pexels.com/photos/3680219/pexels-photo-3680219.jpeg?auto=compress&cs=tinysrgb&w=600', tall: false },
];

const services = [
  { icon: <Volume2 size={26} />, title: 'Sonorisation Pro', desc: 'Qualité audio premium, matériel JBL/L-Acoustics, techniciens certifiés pour une expérience sonore irréprochable.', link: '/services' },
  { icon: <Lightbulb size={26} />, title: 'Éclairage Ambiance', desc: 'LED RGB, systèmes DMX, scénarios personnalisés et effets spéciaux pour créer l\'atmosphère parfaite.', link: '/services' },
  { icon: <Video size={26} />, title: 'Scène & Structures', desc: 'Installations modulaires sécurisées, montage rapide et sur mesure pour tous types d\'événements.', link: '/services' },
  { icon: <Music size={26} />, title: 'DJ & Animation', desc: 'DJs professionnels, playlist personnalisée, matériel haut de gamme. L\'ambiance garantie jusqu\'au bout de la nuit.', link: '/services' },
];

export default function HomePage() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setActiveTestimonial(p => (p + 1) % testimonials.length), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="overflow-x-hidden">

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex items-center">
        {/* Background */}
        <img
          src="https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Événement premium SmartEvent360"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-900/95 via-dark-900/80 to-dark-900/50" />
        <div className="absolute inset-0 bg-gradient-to-b from-dark-900/30 via-transparent to-dark-900" />

        {/* Content – left-aligned as per wireframe */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 w-full pt-24 pb-16">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-gold-500/10 border border-gold-500/30 rounded-full px-4 py-1.5 mb-8 animate-fade-up">
              <Star size={12} className="text-gold-500 fill-gold-500" />
              <span className="text-gold-400 text-xs font-medium tracking-wide">L'excellence événementielle depuis 2008</span>
            </div>

            {/* Title */}
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.1] animate-fade-up delay-100">
              Créez l'événement qui<br />
              <span className="gradient-gold">marque les esprits</span>
            </h1>

            {/* Subtitle */}
            <p className="text-dark-200 text-lg md:text-xl mb-4 leading-relaxed animate-fade-up delay-200">
              Sonorisation · Éclairage · Scène · Animation
            </p>
            <p className="text-dark-400 text-base mb-10 leading-relaxed animate-fade-up delay-200 max-w-lg">
              Pour des moments inoubliables — du mariage intime au festival de 10 000 personnes.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-up delay-300">
              <Link to="/devis"
                className="btn-gold text-base py-4 px-8 shadow-xl shadow-gold-500/20 animate-pulse-gold flex items-center justify-center gap-2">
                ✨ Je crée mon événement
              </Link>
              <Link to="/services"
                className="btn-ghost text-base py-4 px-8 flex items-center justify-center gap-2">
                <Play size={16} /> Voir nos réalisations
              </Link>
            </div>

            {/* Quick stats strip */}
            <div className="flex flex-wrap gap-x-8 gap-y-2 mt-12 animate-fade-up delay-400">
              {[['500+', 'Événements'], ['98%', 'Satisfaits'], ['15 ans', 'Expérience']].map(([v, l]) => (
                <div key={l} className="flex items-center gap-2">
                  <span className="text-gold-500 font-bold text-lg font-display">{v}</span>
                  <span className="text-dark-400 text-sm">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <a href="#stats" className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-dark-400 hover:text-white transition-colors">
          <ChevronDown size={28} />
        </a>
      </section>

      {/* ═══ STATS ═══ */}
      <section id="stats" className="py-20 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
          <CounterCard value={500} label="Événements organisés" icon={<Star size={22} />} />
          <CounterCard value={98} label="Clients satisfaits (%)" icon={<Star size={22} />} />
          <CounterCard value={15} label="Années d'expérience" icon={<Star size={22} />} />
          <CounterCard value={50} label="Équipements disponibles" icon={<Star size={22} />} />
        </div>
      </section>

      {/* ═══ SERVICES ═══ */}
      <section className="py-20 px-4 bg-dark-800/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-gold-500 text-sm font-medium uppercase tracking-widest mb-3">Nos Expertises</p>
            <h2 className="section-title mb-4">Nos Services Premium</h2>
            <p className="text-dark-300 max-w-xl mx-auto">Des prestations sur mesure pour tous vos événements</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {services.map((s, i) => (
              <Link key={i} to={s.link}
                className="glass rounded-2xl p-6 group hover:border-gold-500/40 hover:bg-gold-500/5 transition-all duration-300 hover:-translate-y-1.5">
                <div className="w-14 h-14 rounded-xl bg-gold-500/20 flex items-center justify-center mb-5 text-gold-500 group-hover:bg-gold-500/30 transition-colors">
                  {s.icon}
                </div>
                <h3 className="text-white font-semibold mb-2.5 text-lg">{s.title}</h3>
                <p className="text-dark-300 text-sm leading-relaxed mb-5">{s.desc}</p>
                <span className="text-gold-500 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  Découvrir <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/services" className="btn-outline-gold py-3 px-8 inline-flex items-center gap-2">
              Voir tous nos services <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      

      {/* ═══ GALLERY ═══ */}
      <section className="py-20 px-4 bg-dark-800/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-gold-500 text-sm font-medium uppercase tracking-widest mb-3">Nos Réalisations</p>
            <h2 className="section-title mb-4">La galerie de nos événements</h2>
            <p className="text-dark-300">Découvrez nos événements les plus marquants</p>
          </div>

          {/* Masonry-style grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {galleryItems.map((item, i) => (
              <div key={i}
                className={`relative group overflow-hidden rounded-xl cursor-pointer ${item.tall ? 'row-span-2' : ''}`}
                style={{ aspectRatio: item.tall ? undefined : '4/3', height: item.tall ? '100%' : undefined }}>
                <img src={item.img} alt={item.label}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 min-h-40" />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <span className="text-white text-sm font-medium">{item.label}</span>
                </div>
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight size={14} className="text-gold-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-gold-500 text-sm font-medium uppercase tracking-widest mb-3">Témoignages</p>
            <h2 className="section-title mb-4">Ce que disent nos clients</h2>
          </div>

          <div className="relative glass rounded-2xl p-8 md:p-12 border border-white/10">
            {/* Stars */}
            <div className="flex justify-center gap-1 mb-6">
              {Array(testimonials[activeTestimonial].rating).fill(0).map((_, i) => (
                <Star key={i} size={20} className="text-gold-500 fill-gold-500" />
              ))}
            </div>

            {/* Quote */}
            <p className="text-dark-200 text-lg md:text-xl leading-relaxed italic text-center mb-8">
              {testimonials[activeTestimonial].text}
            </p>

            {/* Author */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-gold-500/20 border-2 border-gold-500/40 flex items-center justify-center">
                <span className="text-gold-500 font-bold text-lg">{testimonials[activeTestimonial].avatar}</span>
              </div>
              <p className="text-white font-semibold">{testimonials[activeTestimonial].name}</p>
              <p className="text-dark-400 text-sm">{testimonials[activeTestimonial].company}</p>
            </div>

            {/* Nav */}
            <div className="flex justify-center items-center gap-3 mt-8">
              <button onClick={() => setActiveTestimonial(p => (p - 1 + testimonials.length) % testimonials.length)}
                className="w-9 h-9 rounded-full glass flex items-center justify-center text-dark-300 hover:text-white hover:border-gold-500/30 transition-all">
                <ChevronLeft size={16} />
              </button>
              {testimonials.map((_, i) => (
                <button key={i} onClick={() => setActiveTestimonial(i)}
                  className={`rounded-full transition-all duration-300 ${i === activeTestimonial ? 'bg-gold-500 w-6 h-2' : 'bg-dark-600 w-2 h-2 hover:bg-dark-400'}`} />
              ))}
              <button onClick={() => setActiveTestimonial(p => (p + 1) % testimonials.length)}
                className="w-9 h-9 rounded-full glass flex items-center justify-center text-dark-300 hover:text-white hover:border-gold-500/30 transition-all">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="py-20 px-4 bg-dark-800/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-gold-500 text-sm font-medium uppercase tracking-widest mb-3">Questions fréquentes</p>
            <h2 className="section-title mb-4">FAQ</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className={`glass rounded-xl overflow-hidden border transition-all duration-200 ${openFaq === i ? 'border-gold-500/30' : 'border-white/5'}`}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left group">
                  <span className={`font-medium transition-colors ${openFaq === i ? 'text-gold-400' : 'text-white group-hover:text-gold-400'}`}>
                    {faq.q}
                  </span>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ml-4 transition-all ${openFaq === i ? 'bg-gold-500/20 text-gold-500' : 'bg-dark-700 text-dark-400'}`}>
                    {openFaq === i ? <Minus size={14} /> : <Plus size={14} />}
                  </div>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-dark-300 text-sm leading-relaxed border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section className="py-28 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-dark-900 via-dark-800 to-dark-900" />
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #D4AF37 0%, transparent 70%)' }} />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/30 to-transparent" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-gold-500 text-sm font-medium uppercase tracking-widest mb-4">Passez à l'action</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-5">
            ✨ Prêt à faire de votre événement<br />
            <span className="gradient-gold">un moment d'exception ?</span>
          </h2>
          <p className="text-dark-200 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            L'équipe SmartEvent360 est à votre écoute pour réaliser tous vos projets événementiels.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact" className="btn-ghost py-4 px-8 text-base flex items-center justify-center gap-2">
              📞 Contactez-nous
            </Link>
            <Link to="/devis" className="btn-gold py-4 px-8 text-base shadow-xl shadow-gold-500/20 flex items-center justify-center gap-2">
              📝 Demander un devis gratuit
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
