import { useRef, useState, useEffect } from 'react';
import { Target, Eye, Gem, Award, Users } from 'lucide-react';

const timeline = [
  { year: '2008', title: 'Création de SmartEvent360', desc: 'Fondation de l\'entreprise avec 2 associés passionnés d\'événementiel.', img: 'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { year: '2012', title: 'Expansion nationale', desc: 'Ouverture de la filiale à Lyon et développement de l\'équipe à 15 personnes.', img: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { year: '2015', title: 'Parc matériel HD', desc: 'Acquisition du parc matériel haute définition pour 200 000 DT.', img: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { year: '2018', title: 'Certification ISO 9001', desc: 'Obtention de la certification qualité internationale, garantie d\'excellence.', img: 'https://images.pexels.com/photos/787961/pexels-photo-787961.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { year: '2022', title: 'Plateforme digitale', desc: 'Lancement de SmartEvent360 Digital, gestion en ligne de vos événements.', img: 'https://images.pexels.com/photos/1045541/pexels-photo-1045541.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { year: '2025', title: '500 événements', desc: 'Franchissement du cap des 500 événements organisés, leader régional.', img: 'https://images.pexels.com/photos/3680219/pexels-photo-3680219.jpeg?auto=compress&cs=tinysrgb&w=400' },
];

const team = [
  { name: 'Alain Martin', role: 'Directeur Artistique', initials: 'AM', bio: 'Expert en sonorisation depuis 15 ans.' },
  { name: 'Luc Bernard', role: 'Chef Lumière', initials: 'LB', bio: 'Spécialiste des installations DMX complexes.' },
  { name: 'Paul Dubois', role: 'DJ Résident', initials: 'PD', bio: 'Plus de 300 soirées animées en 10 ans.' },
  { name: 'Thomas Petit', role: 'Photographe', initials: 'TP', bio: 'Certifié en photographie de mariage.' },
  { name: 'Emma Richard', role: 'Vidéaste', initials: 'ER', bio: 'Montage cinématographique pour vos événements.' },
  { name: 'Marie Lefevre', role: 'Coordinatrice', initials: 'ML', bio: 'Coordination logistique irréprochable.' },
];

const stats = [
  { value: 15, suffix: 'ans', label: 'd\'expérience' },
  { value: 500, suffix: '+', label: 'événements' },
  { value: 98, suffix: '%', label: 'clients satisfaits' },
  { value: 20, suffix: '+', label: 'pays desservis' },
];

function CounterStat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const timer = setInterval(() => {
      start += value / 60;
      if (start >= value) { setCount(value); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 20);
    return () => clearInterval(timer);
  }, [visible, value]);
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl font-display font-bold text-gold-500">{count}{suffix}</div>
      <div className="text-dark-300 text-sm mt-1">{label}</div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="pt-24 min-h-screen">
      {/* Hero */}
      <div className="relative py-24 px-4 overflow-hidden">
        <img src="https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=1920" alt="About" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-dark-900/60 to-dark-900" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-gold-500 text-sm font-medium uppercase tracking-widest mb-3">Notre Histoire</p>
          <h1 className="section-title mb-4">À propos de SmartEvent360</h1>
          <p className="text-dark-200 text-lg">L'excellence événementielle depuis 2008</p>
        </div>
      </div>

      {/* Timeline */}
      <section className="py-20 px-4 bg-dark-800/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="section-title text-center mb-14">Notre parcours</h2>
          <div className="relative">
            <div className="absolute left-1/2 -translate-x-px top-0 bottom-0 w-px bg-gradient-to-b from-gold-500/60 via-gold-500/20 to-transparent" />
            {timeline.map((item, i) => (
              <div key={i} className={`flex items-center gap-8 mb-12 ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                <div className={`flex-1 glass rounded-2xl p-5 hover:border-gold-500/30 transition-all ${i % 2 === 0 ? 'text-right' : 'text-left'}`}>
                  <span className="text-gold-500 font-bold text-lg">{item.year}</span>
                  <h3 className="text-white font-semibold mt-1 mb-2">{item.title}</h3>
                  <p className="text-dark-300 text-sm">{item.desc}</p>
                </div>
                <div className="relative z-10 w-10 h-10 rounded-full bg-gold-500 border-4 border-dark-900 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-dark-900" />
                </div>
                <div className="flex-1">
                  <img src={item.img} alt={item.title} className="rounded-xl w-full h-28 object-cover opacity-60" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission/Vision/Values */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="section-title text-center mb-12">Notre ADN</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <Target size={28} />, title: 'Mission', text: 'Rendre chaque événement unique et mémorable, peu importe le budget ou la taille.' },
              { icon: <Eye size={28} />, title: 'Vision', text: 'Devenir la référence européenne de l\'événementiel premium avec une approche 360°.' },
              { icon: <Gem size={28} />, title: 'Valeurs', text: 'Excellence, Innovation, Passion et Intégrité dans chacune de nos prestations.' },
            ].map((item, i) => (
              <div key={i} className="glass rounded-2xl p-7 text-center hover:border-gold-500/30 transition-all">
                <div className="w-14 h-14 rounded-xl bg-gold-500/20 flex items-center justify-center mb-4 text-gold-500 mx-auto">{item.icon}</div>
                <h3 className="text-white font-display font-bold text-xl mb-3">{item.title}</h3>
                <p className="text-dark-300 text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-4 bg-dark-800/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="section-title text-center mb-3">Notre Équipe</h2>
          <p className="text-dark-300 text-center mb-12">Des passionnés dédiés à faire de votre événement un succès</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
            {team.map((member, i) => (
              <div key={i} className="text-center group">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-500/30 to-gold-700/30 border-2 border-gold-500/40 flex items-center justify-center mx-auto mb-3 group-hover:border-gold-500 transition-all">
                  <span className="text-gold-500 font-bold text-lg">{member.initials}</span>
                </div>
                <p className="text-white font-semibold text-sm">{member.name}</p>
                <p className="text-dark-400 text-xs mb-2">{member.role}</p>
                <p className="text-dark-400 text-xs leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="section-title text-center mb-10">Certifications & Partenaires</h2>
          <div className="flex flex-wrap justify-center gap-6">
            {['ISO 9001', 'Qualiopi', 'JBL Pro Partner', 'L-Acoustics', 'Yamaha Pro Audio', 'Sennheiser'].map((cert, i) => (
              <div key={i} className="glass rounded-xl px-6 py-4 flex items-center gap-2 hover:border-gold-500/30 transition-all">
                <Award size={16} className="text-gold-500" />
                <span className="text-dark-200 text-sm font-medium">{cert}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 bg-dark-800/30">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
          {stats.map((s, i) => <CounterStat key={i} {...s} />)}
        </div>
      </section>
    </div>
  );
}
