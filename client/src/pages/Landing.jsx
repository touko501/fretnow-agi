import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/* ─── Animated Counter ─── */
function Counter({ end, suffix = '', duration = 1200 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!started) return;
    const startTime = performance.now();
    function tick(now) {
      const p = Math.min((now - startTime) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * end));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [started, end, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ─── Reveal on scroll ─── */
function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(24px)',
      transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
    }}>{children}</div>
  );
}

/* ─── Countdown ─── */
function Countdown() {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    const launch = new Date('2026-04-01T08:00:00+02:00').getTime();
    const update = () => setDiff(Math.max(0, launch - Date.now()));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);
  const d = Math.floor(diff / 864e5);
  const h = Math.floor(diff % 864e5 / 36e5);
  const m = Math.floor(diff % 36e5 / 6e4);
  const s = Math.floor(diff % 6e4 / 1e3);
  const pad = v => String(v).padStart(2, '0');
  return (
    <div className="flex gap-3 justify-center">
      {[{ v: pad(d), l: 'Jours' }, { v: pad(h), l: 'Heures' }, { v: pad(m), l: 'Min' }, { v: pad(s), l: 'Sec' }].map((item, i) => (
        <div key={i} className="text-center" style={{ minWidth: 64 }}>
          <div className="text-2xl sm:text-3xl font-extrabold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#fff' }}>{item.v}</div>
          <div className="text-[10px] uppercase tracking-[3px] font-semibold mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.l}</div>
        </div>
      ))}
    </div>
  );
}

/* ═══ MAIN LANDING ═══ */
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{ background: '#050816', color: '#c4c9e0', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ── NAV ── */}
      <nav className="fixed top-0 w-full z-50 transition-all duration-300"
        style={{ background: scrolled ? 'rgba(5,8,22,0.92)' : 'rgba(5,8,22,0.5)', backdropFilter: 'blur(20px) saturate(180%)', borderBottom: `1px solid ${scrolled ? 'rgba(255,255,255,0.06)' : 'transparent'}` }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg transition-transform duration-300 group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}>F</div>
            <span className="text-xl font-extrabold text-white tracking-tight">FRET<span style={{ color: '#60a5fa' }}>NOW</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:block text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.6)' }}
              onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.6)'}>
              Connexion
            </Link>
            <Link to="/register" className="text-sm font-bold px-5 py-2.5 rounded-xl text-white transition-all duration-300"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', boxShadow: '0 2px 12px rgba(37,99,235,0.3)' }}>
              Inscription gratuite
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-24 px-5">
        <div className="absolute w-[600px] h-[600px] rounded-full" style={{ background: 'rgba(37,99,235,0.08)', filter: 'blur(120px)', top: '-15%', left: '-10%', animation: 'fn-orb-float 20s ease-in-out infinite' }} />
        <div className="absolute w-[500px] h-[500px] rounded-full" style={{ background: 'rgba(124,58,237,0.06)', filter: 'blur(120px)', bottom: '-10%', right: '-5%', animation: 'fn-orb-float 25s ease-in-out infinite reverse' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full mb-8 text-[13px] font-semibold"
              style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.15)', color: '#60a5fa' }}>
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 animate-ping" style={{ animationDuration: '1.5s' }} /><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" /></span>
              Bêta ouverte — Lancement avril 2026
            </div>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-extrabold leading-[1.05] tracking-tight mb-6">
              <span className="text-white">Le fret routier,</span><br />
              <span style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 40%, #f472b6 70%, #fb923c 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200% 200%', animation: 'fn-gradient-shift 6s ease infinite' }}>
                simplifié.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-10" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Marketplace B2B qui connecte directement <span className="text-white font-semibold">expéditeurs</span> et{' '}
              <span className="text-white font-semibold">transporteurs</span>.
              Publiez une mission, recevez des offres, payez en ligne. C'est tout.
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link to="/register?role=CHARGEUR" className="group relative px-8 py-4 rounded-xl text-white font-bold text-[15px] transition-all duration-300 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', boxShadow: '0 4px 20px rgba(37,99,235,0.3)' }}>
                <span className="relative z-10 flex items-center justify-center gap-2">
                  J'ai du fret à expédier
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </span>
              </Link>
              <Link to="/register?role=TRANSPORTEUR" className="group px-8 py-4 rounded-xl font-bold text-[15px] transition-all duration-300"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                <span className="flex items-center justify-center gap-2">
                  Je cherche des chargements
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </span>
              </Link>
            </div>
          </Reveal>

          <Reveal delay={400}>
            <div className="mb-8">
              <p className="text-[11px] uppercase tracking-[4px] font-bold mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Lancement dans</p>
              <Countdown />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="py-20 sm:py-28 px-5" style={{ background: '#080c1a' }}>
        <div className="max-w-6xl mx-auto">
          <Reveal><p className="text-[11px] uppercase tracking-[4px] font-bold mb-4" style={{ color: '#f59e0b' }}>Le constat</p></Reveal>
          <Reveal delay={80}>
            <h2 className="text-3xl sm:text-[2.8rem] font-extrabold text-white leading-tight tracking-tight mb-4">
              Le fret routier perd des milliards.<br/>Chaque année.
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="text-base sm:text-lg leading-relaxed max-w-xl mb-14" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Des courtiers opaques, des commissions excessives, des délais de paiement absurdes. Les transporteurs subissent. Les expéditeurs surpayent.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { v: '25%+', desc: 'de commission prélevée par les courtiers traditionnels' },
              { v: '60-90j', desc: 'de délai de paiement moyen — des mois à attendre' },
              { v: '58%', desc: 'des camions roulent à vide ou à moitié vides en France' },
              { v: '0%', desc: 'de transparence sur les prix réels du marché' },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="rounded-2xl p-7 transition-all duration-300 group cursor-default"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  <div className="text-3xl font-extrabold mb-3" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.v}</div>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 sm:py-28 px-5" style={{ background: '#050816' }}>
        <div className="max-w-6xl mx-auto">
          <Reveal><p className="text-[11px] uppercase tracking-[4px] font-bold mb-4 text-center" style={{ color: '#3b82f6' }}>Comment ça marche</p></Reveal>
          <Reveal delay={80}>
            <h2 className="text-3xl sm:text-[2.8rem] font-extrabold text-white leading-tight tracking-tight mb-16 text-center">
              3 étapes. Zéro intermédiaire.
            </h2>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { n: '01', icon: '📦', title: 'Publiez votre mission', desc: 'Décrivez votre besoin : trajet, poids, véhicule, date. Publication en moins de 2 minutes.', color: '#3b82f6' },
              { n: '02', icon: '💰', title: 'Recevez des offres', desc: 'Les transporteurs enchérissent directement. Comparez les prix, les avis, et choisissez.', color: '#8b5cf6' },
              { n: '03', icon: '🚛', title: 'Livraison & paiement', desc: 'Suivez la mission. À la livraison confirmée, le paiement est déclenché automatiquement.', color: '#10b981' },
            ].map((step, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="rounded-2xl p-7 relative overflow-hidden transition-all duration-300 h-full"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${step.color}, transparent)` }} />
                  <div className="text-4xl font-extrabold absolute top-4 right-5 opacity-[0.06]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{step.n}</div>
                  <div className="text-3xl mb-4">{step.icon}</div>
                  <h3 className="text-[15px] font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── VALUE PROPS ── */}
      <section className="py-20 sm:py-28 px-5" style={{ background: '#080c1a' }}>
        <div className="max-w-5xl mx-auto">
          <Reveal><p className="text-[11px] uppercase tracking-[4px] font-bold mb-4 text-center" style={{ color: '#10b981' }}>Pourquoi FRETNOW</p></Reveal>
          <Reveal delay={80}>
            <h2 className="text-3xl sm:text-[2.8rem] font-extrabold text-white leading-tight tracking-tight mb-16 text-center">Ce que vous gagnez.</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { icon: '💰', title: 'Commission réduite à 10%', desc: 'Pas d\'abonnement, pas de frais cachés. Seulement 10% sur les transactions réalisées. Le transporteur garde plus, l\'expéditeur paie moins.', color: '#3b82f6' },
              { icon: '⚡', title: 'Paiement rapide', desc: 'Fini les 60-90 jours d\'attente. L\'expéditeur paie à la commande, le transporteur est payé dès la livraison confirmée.', color: '#10b981' },
              { icon: '🔍', title: 'Transparence totale', desc: 'Prix visibles, enchères ouvertes, avis vérifiés. Vous savez exactement ce que vous payez et à qui.', color: '#8b5cf6' },
              { icon: '📋', title: 'Gestion simplifiée', desc: 'Créez, suivez et gérez vos missions depuis un seul tableau de bord. Toutes vos factures et documents au même endroit.', color: '#f59e0b' },
              { icon: '🏢', title: 'Entreprises vérifiées', desc: 'Chaque transporteur est vérifié via SIRET automatique. Vous travaillez uniquement avec des professionnels identifiés.', color: '#ef4444' },
              { icon: '📦', title: 'Tous types de fret', desc: 'Lots complets, messagerie, express, dernier kilomètre. Une plateforme unique pour tous vos besoins de transport.', color: '#06b6d4' },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 60}>
                <div className="rounded-2xl p-7 flex gap-5 transition-all duration-300 group"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${item.color}30`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-transform group-hover:scale-110" style={{ background: `${item.color}10` }}>{item.icon}</div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white mb-1.5">{item.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR WHO ── */}
      <section className="py-20 sm:py-28 px-5" style={{ background: '#050816' }}>
        <div className="max-w-6xl mx-auto">
          <Reveal><p className="text-[11px] uppercase tracking-[4px] font-bold mb-4 text-center" style={{ color: '#a78bfa' }}>Pour qui</p></Reveal>
          <Reveal delay={80}>
            <h2 className="text-3xl sm:text-[2.8rem] font-extrabold text-white leading-tight tracking-tight mb-16 text-center">Deux côtés. Un intérêt commun.</h2>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { role: 'Expéditeur', icon: '📦', color: '#3b82f6', benefits: ['Publiez une mission en 2 minutes', 'Recevez des offres compétitives', 'Choisissez le transporteur qui vous convient', 'Payez en ligne de manière sécurisée', 'Factures et documents automatiques'], cta: { text: 'Inscription expéditeur', link: '/register?role=CHARGEUR' } },
              { role: 'Transporteur', icon: '🚛', color: '#10b981', benefits: ['Accédez à des missions vérifiées', 'Enchérissez au juste prix — pas de courtier', 'Paiement garanti dès la livraison confirmée', 'Gérez votre flotte depuis la plateforme', 'Tableau de bord avec vos performances'], cta: { text: 'Inscription transporteur', link: '/register?role=TRANSPORTEUR' } },
            ].map((p, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="rounded-2xl p-8 h-full flex flex-col transition-all duration-300" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl" style={{ background: `${p.color}10` }}>{p.icon}</div>
                    <h3 className="text-xl font-bold text-white">{p.role}</h3>
                  </div>
                  <ul className="space-y-3 flex-1 mb-6">
                    {p.benefits.map((b, j) => (
                      <li key={j} className="flex items-start gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="2.5" className="shrink-0 mt-0.5"><path d="M20 6L9 17l-5-5" /></svg>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link to={p.cta.link} className="block text-center py-3 rounded-xl text-sm font-bold text-white transition-all duration-300"
                    style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}cc)`, boxShadow: `0 4px 15px ${p.color}30` }}>
                    {p.cta.text} →
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="py-20 sm:py-28 px-5" style={{ background: '#080c1a' }}>
        <div className="max-w-4xl mx-auto">
          <Reveal><p className="text-[11px] uppercase tracking-[4px] font-bold mb-4 text-center" style={{ color: '#f59e0b' }}>Comparaison</p></Reveal>
          <Reveal delay={80}>
            <h2 className="text-3xl sm:text-[2.8rem] font-extrabold text-white leading-tight tracking-tight mb-14 text-center">FRETNOW vs le marché.</h2>
          </Reveal>
          <Reveal delay={160}>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 500 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-wider font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}></th>
                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-wider font-bold" style={{ color: '#3b82f6' }}>FRETNOW</th>
                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-wider font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>Courtier</th>
                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-wider font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>Bourse de fret</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Commission', '10%', '25%+', '15-20% + abo'],
                      ['Paiement transporteur', 'À la livraison', '60-90 jours', '30-60 jours'],
                      ['Mise en relation', 'Enchères directes', 'Via courtier', 'Annonces / tel'],
                      ['Vérif. entreprises', 'SIRET auto', 'Variable', 'Aucune'],
                      ['Paiement en ligne', 'Intégré', 'Virement manuel', 'Hors plateforme'],
                      ['Frais d\'inscription', 'Gratuit', 'Gratuit', '200-500€/mois'],
                    ].map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-5 py-3.5 font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{row[0]}</td>
                        <td className="px-5 py-3.5 font-bold" style={{ color: '#60a5fa' }}>{row[1]}</td>
                        <td className="px-5 py-3.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{row[2]}</td>
                        <td className="px-5 py-3.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{row[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 sm:py-32 px-5 text-center relative overflow-hidden" style={{ background: '#050816' }}>
        <div className="absolute w-[600px] h-[600px] rounded-full" style={{ background: 'rgba(37,99,235,0.06)', filter: 'blur(120px)', top: '-30%', left: '20%' }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <Reveal><p className="text-[11px] uppercase tracking-[4px] font-bold mb-6" style={{ color: 'rgba(255,255,255,0.3)' }}>Lancement dans</p><Countdown /></Reveal>
          <Reveal delay={100}><h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-10 mb-4">Prêt à essayer ?</h2></Reveal>
          <Reveal delay={200}><p className="text-base mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Inscription gratuite. Première mission en quelques minutes. Sans engagement.</p></Reveal>
          <Reveal delay={300}>
            <Link to="/register" className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-white font-bold text-[15px] transition-all duration-300"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', boxShadow: '0 4px 25px rgba(37,99,235,0.35)' }}>
              Créer mon compte gratuitement
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-5 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          <span>&copy; 2026 FRETNOW — Marketplace B2B du transport routier</span>
          <div className="flex gap-6">
            <a href="#" style={{ color: 'rgba(255,255,255,0.35)' }}>CGV</a>
            <a href="#" style={{ color: 'rgba(255,255,255,0.35)' }}>Mentions légales</a>
            <Link to="/login" style={{ color: 'rgba(255,255,255,0.35)' }}>Connexion</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
