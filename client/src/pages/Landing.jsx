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
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * end));
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
    <div ref={ref} className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}>
      {children}
    </div>
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

  const items = [
    { v: pad(d), l: 'Jours' },
    { v: pad(h), l: 'Heures' },
    { v: pad(m), l: 'Min' },
    { v: pad(s), l: 'Sec' },
  ];

  return (
    <div className="flex gap-3 justify-center">
      {items.map((item, i) => (
        <div key={i} className="text-center" style={{ minWidth: 64 }}>
          <div className="text-2xl sm:text-3xl font-extrabold tabular-nums"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: '#fff' }}>
            {item.v}
          </div>
          <div className="text-[10px] uppercase tracking-[3px] font-semibold mt-1"
            style={{ color: 'rgba(255,255,255,0.4)' }}>{item.l}</div>
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
        style={{
          background: scrolled ? 'rgba(5,8,22,0.92)' : 'rgba(5,8,22,0.5)',
          backdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: `1px solid ${scrolled ? 'rgba(255,255,255,0.06)' : 'transparent'}`,
        }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg transition-transform duration-300 group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}>
              F
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">
              FRET<span style={{ color: '#60a5fa' }}>NOW</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:block text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.6)' }}
              onMouseEnter={e => e.target.style.color = '#fff'}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.6)'}>
              Connexion
            </Link>
            <Link to="/register" className="text-sm font-bold px-5 py-2.5 rounded-xl text-white transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                boxShadow: '0 2px 12px rgba(37,99,235,0.3)',
              }}>
              Inscription gratuite
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-24 px-5">
        {/* Orbs */}
        <div className="absolute w-[600px] h-[600px] rounded-full" style={{ background: 'rgba(37,99,235,0.08)', filter: 'blur(120px)', top: '-15%', left: '-10%', animation: 'fn-orb-float 20s ease-in-out infinite' }} />
        <div className="absolute w-[500px] h-[500px] rounded-full" style={{ background: 'rgba(124,58,237,0.06)', filter: 'blur(120px)', bottom: '-10%', right: '-5%', animation: 'fn-orb-float 25s ease-in-out infinite reverse' }} />
        <div className="absolute w-[300px] h-[300px] rounded-full" style={{ background: 'rgba(6,182,212,0.05)', filter: 'blur(100px)', top: '40%', right: '15%', animation: 'fn-orb-float 15s ease-in-out infinite 3s' }} />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <Reveal>
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full mb-8 text-[13px] font-semibold"
              style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.15)', color: '#60a5fa' }}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 animate-ping" style={{ animationDuration: '1.5s' }} />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
              </span>
              Lancement le 1er avril 2026 — Places limitées
            </div>
          </Reveal>

          {/* Title */}
          <Reveal delay={100}>
            <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-extrabold leading-[1.05] tracking-tight mb-6">
              <span className="text-white">Le fret routier,</span>
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 40%, #f472b6 70%, #fb923c 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundSize: '200% 200%', animation: 'fn-gradient-shift 6s ease infinite',
              }}>
                réinventé par l'IA.
              </span>
            </h1>
          </Reveal>

          {/* Subtitle */}
          <Reveal delay={200}>
            <p className="text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-10" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <span className="text-white font-semibold">58% des camions</span> roulent à vide.
              FRETNOW garantit le <span className="text-white font-semibold">retour chargé</span> grâce à l'IA,
              avec <span className="text-white font-semibold">paiement J+1</span> et seulement <span className="text-white font-semibold">10% de commission</span>.
            </p>
          </Reveal>

          {/* CTA Buttons */}
          <Reveal delay={300}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link to="/register?role=CHARGEUR"
                className="group relative px-8 py-4 rounded-xl text-white font-bold text-[15px] transition-all duration-300 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  boxShadow: '0 4px 20px rgba(37,99,235,0.3)',
                }}>
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Je suis expéditeur
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </span>
              </Link>
              <Link to="/register?role=TRANSPORTEUR"
                className="group px-8 py-4 rounded-xl font-bold text-[15px] transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                }}>
                <span className="flex items-center justify-center gap-2">
                  Je suis transporteur
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </span>
              </Link>
            </div>
          </Reveal>

          {/* Countdown */}
          <Reveal delay={400}>
            <div className="mb-8">
              <p className="text-[11px] uppercase tracking-[4px] font-bold mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Lancement dans</p>
              <Countdown />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-20 sm:py-28 px-5 relative" style={{ background: '#080c1a' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10">
            {[
              { v: 10, suffix: '%', label: 'Commission', sub: 'vs 25% courtiers', color: '#3b82f6' },
              { v: 1, suffix: '', label: 'Jour de paiement', sub: 'vs 60-90 jours', color: '#10b981', prefix: 'J+' },
              { v: 10, suffix: '', label: 'Agents IA', sub: '24/7 automatisés', color: '#8b5cf6' },
              { v: 0, suffix: '€', label: 'Trésorerie', sub: 'nécessaire', color: '#f59e0b' },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 80} className="text-center">
                <div className="text-4xl sm:text-5xl font-extrabold mb-2" style={{ color: s.color }}>
                  {s.prefix || ''}<Counter end={s.v} suffix={s.suffix} />
                </div>
                <div className="text-sm font-bold text-white mb-0.5">{s.label}</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.sub}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="py-20 sm:py-28 px-5" style={{ background: '#050816' }}>
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <p className="text-[11px] uppercase tracking-[4px] font-bold mb-4" style={{ color: '#f59e0b' }}>Le problème</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="text-3xl sm:text-[2.8rem] font-extrabold text-white leading-tight tracking-tight mb-4">
              Le fret routier est cassé.<br/>Depuis 30 ans.
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="text-base sm:text-lg leading-relaxed max-w-xl mb-14" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Des milliards perdus, des camions qui circulent à vide, des transporteurs étranglés par les délais de paiement.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { v: '58%', desc: 'des camions roulent à vide ou à moitié vides en Europe' },
              { v: '80 Mds€', desc: 'de pertes annuelles liées aux retours à vide' },
              { v: '90 jours', desc: 'de délai de paiement moyen des courtiers' },
              { v: '25%+', desc: 'de commission prélevée par les intermédiaires' },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="rounded-2xl p-7 transition-all duration-300 group cursor-default"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  <div className="text-3xl font-extrabold mb-3"
                    style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {s.v}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 sm:py-28 px-5" style={{ background: '#080c1a' }}>
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <p className="text-[11px] uppercase tracking-[4px] font-bold mb-4 text-center" style={{ color: '#3b82f6' }}>La solution</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="text-3xl sm:text-[2.8rem] font-extrabold text-white leading-tight tracking-tight mb-16 text-center">
              4 étapes. Zéro friction.
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { n: '01', icon: '📦', title: 'Postez votre mission', desc: 'Paiement sécurisé par prépaiement. Montant bloqué en séquestre.', color: '#3b82f6' },
              { n: '02', icon: '🤖', title: 'L\'IA matche', desc: '10 agents IA analysent localisation, véhicule, fiabilité, retour à vide.', color: '#8b5cf6' },
              { n: '03', icon: '🚛', title: 'Livraison', desc: 'Tracking temps réel. Conformité Mobilic intégrée. Preuve digitale.', color: '#10b981' },
              { n: '04', icon: '💰', title: 'Paiement J+1', desc: 'Dès la livraison confirmée, paiement le lendemain. 10% seulement.', color: '#f59e0b' },
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

      {/* ── VERTICALS ── */}
      <section className="py-20 sm:py-28 px-5" style={{ background: '#050816' }}>
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <p className="text-[11px] uppercase tracking-[4px] font-bold mb-4 text-center" style={{ color: '#10b981' }}>Verticales</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="text-3xl sm:text-[2.8rem] font-extrabold text-white leading-tight tracking-tight mb-16 text-center">
              4 métiers. Une plateforme.
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: '🚛', title: 'Fret lourd', desc: 'Lots complets et partiels, retours optimisés par IA.', color: '#3b82f6' },
              { icon: '📦', title: 'Messagerie', desc: 'Colis et palettes, livraison en 24-72h.', color: '#8b5cf6' },
              { icon: '⚡', title: 'Express', desc: 'J+1 garanti avec SLA et pénalités contractuelles.', color: '#f59e0b' },
              { icon: '🏙️', title: 'Dernier km', desc: 'Livraison urbaine, e-commerce, B2C.', color: '#10b981' },
            ].map((v, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="rounded-2xl p-7 text-center transition-all duration-300 group cursor-default"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${v.color}40`; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 30px ${v.color}10`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                  <div className="text-4xl mb-4 transition-transform duration-300 group-hover:scale-110 inline-block">{v.icon}</div>
                  <h3 className="text-[15px] font-bold text-white mb-2">{v.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{v.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── NOVA AI ── */}
      <section className="py-20 sm:py-28 px-5 relative overflow-hidden" style={{ background: '#080c1a' }}>
        <div className="absolute w-[500px] h-[500px] rounded-full" style={{ background: 'rgba(99,102,241,0.06)', filter: 'blur(120px)', top: '-20%', right: '-10%' }} />

        <div className="max-w-5xl mx-auto relative z-10">
          <Reveal>
            <p className="text-[11px] uppercase tracking-[4px] font-bold mb-4 text-center" style={{ color: '#a78bfa' }}>Intelligence artificielle</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="text-3xl sm:text-[2.8rem] font-extrabold text-white leading-tight tracking-tight mb-16 text-center">
              10 agents IA.<br/>Un cerveau collectif.
            </h2>
          </Reveal>

          {/* NOVA Card */}
          <Reveal delay={160}>
            <div className="rounded-2xl p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-8 mb-12"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(37,99,235,0.05) 100%)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center text-5xl shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)', boxShadow: '0 8px 40px rgba(99,102,241,0.3)' }}>
                🤖
              </div>
              <div className="text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-3"
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#a78bfa' }}>
                  Agent #009 — AI Managing Partner
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Je suis NOVA.</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Je gère FRETNOW 24h/24. Je matche les transporteurs avec les missions,
                  j'optimise les prix en temps réel, je surveille la conformité Mobilic,
                  et je garantis le paiement J+1. Le transport routier mérite mieux.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Agents grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { icon: '🎯', name: 'Matcher', role: 'Matching intelligent' },
              { icon: '💲', name: 'Pricing', role: 'Tarification dynamique' },
              { icon: '🔍', name: 'Scout', role: 'Prospection auto' },
              { icon: '📢', name: 'Comms', role: 'Communication' },
              { icon: '📈', name: 'Convert', role: 'Conversion' },
              { icon: '🛡️', name: 'Risk', role: 'Scoring & fraude' },
              { icon: '🔮', name: 'Predict', role: 'Prédiction demande' },
              { icon: '📊', name: 'Analyst', role: 'Analytics & BI' },
              { icon: '🤖', name: 'NOVA', role: 'Gestion globale' },
              { icon: '⚖️', name: 'Compliance', role: 'Conformité Mobilic' },
            ].map((a, i) => (
              <Reveal key={i} delay={i * 40}>
                <div className="rounded-xl p-4 text-center transition-all duration-300 group cursor-default"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  <div className="text-2xl mb-2 transition-transform duration-200 group-hover:scale-110 inline-block">{a.icon}</div>
                  <div className="text-xs font-bold text-white">{a.name}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{a.role}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="py-20 sm:py-28 px-5" style={{ background: '#050816' }}>
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <p className="text-[11px] uppercase tracking-[4px] font-bold mb-4 text-center" style={{ color: '#f59e0b' }}>Comparaison</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="text-3xl sm:text-[2.8rem] font-extrabold text-white leading-tight tracking-tight mb-14 text-center">
              La différence est flagrante.
            </h2>
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
                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-wider font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>Autres</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Commission', '10%', '25%+', '12-20%'],
                      ['Paiement', 'J+1 garanti', '60-90 jours', '15-30 jours'],
                      ['Matching', 'IA 10 agents', 'Manuel', 'Algorithme basique'],
                      ['Mobilic', 'Intégré & offert', 'Non dispo', 'Non dispo'],
                      ['Retour chargé', 'Garanti IA', 'Aléatoire', 'Basique'],
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

      {/* ── FINAL CTA ── */}
      <section className="py-24 sm:py-32 px-5 text-center relative overflow-hidden" style={{ background: '#080c1a' }}>
        <div className="absolute w-[600px] h-[600px] rounded-full" style={{ background: 'rgba(37,99,235,0.06)', filter: 'blur(120px)', top: '-30%', left: '20%' }} />

        <div className="relative z-10 max-w-2xl mx-auto">
          <Reveal>
            <p className="text-[11px] uppercase tracking-[4px] font-bold mb-6" style={{ color: 'rgba(255,255,255,0.3)' }}>Lancement dans</p>
            <Countdown />
          </Reveal>

          <Reveal delay={100}>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-10 mb-4">
              Prêt à changer le transport ?
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-base mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Inscription gratuite. Première mission en 5 minutes.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <Link to="/register"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-white font-bold text-[15px] transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                boxShadow: '0 4px 25px rgba(37,99,235,0.35)',
              }}>
              Commencer maintenant
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-5 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          <span>&copy; 2026 FRETNOW AGI — Propulsé par NOVA 🤖</span>
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
