import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

/* ─── Animated Number Counter ─── */
function AnimatedNumber({ value, suffix = '', prefix = '' }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const num = typeof value === 'number' ? value : parseFloat(value) || 0;

  useEffect(() => {
    if (!num) { setDisplay(0); return; }
    let start = 0;
    const duration = 800;
    const startTime = performance.now();
    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * num));
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [num]);

  return <span className="fn-number">{prefix}{display.toLocaleString('fr-FR')}{suffix}</span>;
}

/* ─── Skeleton Loader ─── */
function SkeletonCard() {
  return (
    <div className="fn-card p-6">
      <div className="fn-skeleton h-3 w-20 mb-4" />
      <div className="fn-skeleton h-7 w-32 mb-2" />
      <div className="fn-skeleton h-3 w-16" />
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({ icon, label, value, sub, gradient, delay = 0 }) {
  return (
    <div className="fn-card group relative overflow-hidden p-6"
      style={{ animationDelay: `${delay}ms` }}>
      {/* Gradient accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: gradient || 'var(--fn-gradient-primary)' }} />

      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fn-text-muted)' }}>{label}</span>
        <span className="text-xl transition-transform duration-300 group-hover:scale-110">{icon}</span>
      </div>
      <div className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fn-text)' }}>
        {value}
      </div>
      {sub && <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--fn-text-muted)' }}>{sub}</p>}
    </div>
  );
}

/* ─── Gradient Stat (hero card) ─── */
function GradientStat({ icon, label, value, gradient }) {
  return (
    <div className="fn-gradient-card p-6 relative" style={{ background: gradient }}>
      <div className="fn-orb" style={{ width: 80, height: 80, background: 'rgba(255,255,255,0.15)', top: -20, right: -20, filter: 'blur(30px)' }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/70">{label}</span>
          <span className="text-xl">{icon}</span>
        </div>
        <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
      </div>
    </div>
  );
}

/* ─── Mission Row ─── */
function MissionRow({ mission, index }) {
  const statusConfig = {
    DRAFT: { bg: '#f1f5f9', color: '#475569', label: 'Brouillon' },
    PUBLISHED: { bg: '#dbeafe', color: '#1d4ed8', label: 'Publié' },
    BIDDING: { bg: '#fef3c7', color: '#b45309', label: 'Enchères' },
    ASSIGNED: { bg: '#e9d5ff', color: '#7c3aed', label: 'Assigné' },
    IN_TRANSIT: { bg: '#ffedd5', color: '#c2410c', label: 'En transit' },
    DELIVERED: { bg: '#d1fae5', color: '#047857', label: 'Livré' },
    COMPLETED: { bg: '#d1fae5', color: '#065f46', label: 'Terminé' },
  };
  const st = statusConfig[mission.status] || statusConfig.DRAFT;

  return (
    <Link to={`/missions/${mission.id}`}
      className="flex items-center gap-4 px-5 py-3.5 transition-all duration-200 group"
      style={{ animationDelay: `${index * 50}ms`, borderBottom: '1px solid var(--fn-border-subtle)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--fn-surface-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {/* Route */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate transition-colors duration-200 group-hover:text-blue-600"
            style={{ color: 'var(--fn-text)' }}>
            {mission.pickupCity}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--fn-text-muted)', flexShrink: 0 }}>
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-semibold truncate transition-colors duration-200 group-hover:text-blue-600"
            style={{ color: 'var(--fn-text)' }}>
            {mission.deliveryCity}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] font-mono" style={{ color: 'var(--fn-text-muted)' }}>{mission.reference}</span>
          {mission.distanceKm && (
            <span className="text-[11px]" style={{ color: 'var(--fn-text-muted)' }}>· {mission.distanceKm} km</span>
          )}
        </div>
      </div>

      {/* Budget */}
      {mission.budgetMaxCents && (
        <span className="text-sm font-bold tabular-nums" style={{ color: '#059669' }}>
          {(mission.budgetMaxCents / 100).toFixed(0)} €
        </span>
      )}

      {/* Status badge */}
      <span className="fn-badge" style={{ background: st.bg, color: st.color }}>
        {st.label}
      </span>

      {/* Arrow */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        className="opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-1 group-hover:translate-x-0"
        style={{ color: 'var(--fn-text-muted)' }}>
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

/* ─── Quick Action Button ─── */
function QuickAction({ to, icon, label, description, gradient }) {
  return (
    <Link to={to}
      className="fn-card-interactive fn-card flex items-center gap-4 p-4 group">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 transition-transform duration-300 group-hover:scale-110"
        style={{ background: gradient || 'rgba(37,99,235,0.08)' }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--fn-text)' }}>{label}</p>
        {description && <p className="text-[11px]" style={{ color: 'var(--fn-text-muted)' }}>{description}</p>}
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        className="ml-auto opacity-0 group-hover:opacity-60 transition-all duration-200 -translate-x-1 group-hover:translate-x-0"
        style={{ color: 'var(--fn-text-muted)' }}>
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

/* ─── NOVA Activity Card ─── */
function NovaCard() {
  const activities = [
    { text: 'Matching optimal trouvé pour 3 missions', time: 'il y a 2 min', agent: 'Matcher' },
    { text: 'Pricing dynamique ajusté (axe Lyon–Paris)', time: 'il y a 8 min', agent: 'Pricing' },
    { text: 'Score conformité mis à jour', time: 'il y a 15 min', agent: 'Compliance' },
  ];

  return (
    <div className="fn-card overflow-hidden">
      <div className="p-5 relative" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
        <div className="fn-orb" style={{ width: 100, height: 100, background: '#6366f1', top: -40, right: -20, opacity: 0.2, filter: 'blur(40px)' }} />
        <div className="fn-orb" style={{ width: 60, height: 60, background: '#3b82f6', bottom: -20, left: 10, opacity: 0.15, filter: 'blur(30px)' }} />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(59,130,246,0.3) 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">NOVA Intelligence</h3>
            <p className="text-[11px] text-slate-400">10 agents actifs en continu</p>
          </div>
        </div>
      </div>
      <div className="p-3">
        {activities.map((a, i) => (
          <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-gray-50">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium" style={{ color: 'var(--fn-text)' }}>{a.text}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--fn-text-muted)' }}>
                <span className="font-semibold text-blue-500">{a.agent}</span> · {a.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ MAIN DASHBOARD ═══ */
export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [missions, setMissions] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [mRes, wRes] = await Promise.all([
          api.get('/missions?limit=10'),
          api.get('/wallet/balance'),
        ]);
        if (mRes?.ok) { const d = await mRes.json(); setMissions(d.missions || d); }
        if (wRes?.ok) { const d = await wRes.json(); setWallet(d); }
        if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
          const aRes = await api.get('/admin/dashboard');
          if (aRes?.ok) { const d = await aRes.json(); setStats(d); }
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="fn-stagger">
        <div className="fn-skeleton h-8 w-56 mb-2" />
        <div className="fn-skeleton h-4 w-72 mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 fn-skeleton h-64 rounded-2xl" />
          <div className="fn-skeleton h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const isTransporteur = user?.role === 'TRANSPORTEUR';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const missionArray = Array.isArray(missions) ? missions : [];
  const activeMissions = missionArray.filter(m => ['IN_TRANSIT', 'ASSIGNED', 'BIDDING', 'PICKUP'].includes(m.status));
  const completedMissions = missionArray.filter(m => m.status === 'COMPLETED' || m.status === 'DELIVERED');

  return (
    <div className="fn-stagger">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-extrabold tracking-tight" style={{ color: 'var(--fn-text)' }}>
          Tableau de bord
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fn-text-secondary)' }}>
          {isTransporteur ? 'Vos missions et performances en un coup d\'œil' : isAdmin ? 'Vue d\'ensemble de la plateforme FRETNOW' : 'Gérez et suivez vos expéditions'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <GradientStat
          icon="📦" label="Missions"
          value={<AnimatedNumber value={missionArray.length} />}
          gradient="var(--fn-gradient-primary)"
        />
        <StatCard
          icon="💰" label="Solde"
          value={wallet?.balance != null ? <AnimatedNumber value={Math.round(wallet.balance / 100)} suffix=" €" /> : '—'}
          gradient="var(--fn-gradient-fresh)"
          delay={60}
        />
        <StatCard
          icon={isTransporteur ? '🏆' : '⚡'} label={isTransporteur ? 'Note' : 'Actives'}
          value={isTransporteur ? '—' : <AnimatedNumber value={activeMissions.length} />}
          sub={isTransporteur ? 'Pas encore noté' : 'En cours'}
          gradient="var(--fn-gradient-warm)"
          delay={120}
        />
        <StatCard
          icon="✅" label="Complétées"
          value={<AnimatedNumber value={completedMissions.length} />}
          sub="Terminées"
          gradient="var(--fn-gradient-fresh)"
          delay={180}
        />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent missions */}
        <div className="lg:col-span-2 fn-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--fn-border-subtle)' }}>
            <div>
              <h2 className="text-[15px] font-bold" style={{ color: 'var(--fn-text)' }}>Missions récentes</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--fn-text-muted)' }}>{missionArray.length} mission(s) au total</p>
            </div>
            <Link to="/missions" className="fn-btn fn-btn-ghost text-xs py-1.5 px-3">
              Voir tout
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </Link>
          </div>

          {missionArray.length > 0 ? (
            <div className="fn-stagger">
              {missionArray.slice(0, 6).map((m, i) => <MissionRow key={m.id} mission={m} index={i} />)}
            </div>
          ) : (
            <div className="text-center py-16 px-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                style={{ background: 'rgba(37,99,235,0.06)' }}>
                <span className="text-3xl">📦</span>
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--fn-text)' }}>Aucune mission</p>
              <p className="text-xs mb-4" style={{ color: 'var(--fn-text-muted)' }}>
                {isTransporteur ? 'Les missions disponibles apparaîtront ici' : 'Créez votre première mission pour commencer'}
              </p>
              {!isTransporteur && (
                <Link to="/missions/new" className="fn-btn fn-btn-primary text-xs py-2 px-4">
                  Créer une mission
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3 px-1"
              style={{ color: 'var(--fn-text-muted)' }}>Actions rapides</h3>
            <div className="space-y-2">
              {!isTransporteur && (
                <QuickAction
                  to="/missions/new"
                  icon="✨"
                  label="Nouvelle mission"
                  description="Créer une expédition"
                  gradient="linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(124,58,237,0.1) 100%)"
                />
              )}
              <QuickAction
                to="/missions"
                icon={isTransporteur ? '🔍' : '📋'}
                label={isTransporteur ? 'Explorer les missions' : 'Mes missions'}
                description={isTransporteur ? 'Trouver des chargements' : 'Suivre mes expéditions'}
                gradient="rgba(16,185,129,0.08)"
              />
              {isTransporteur && (
                <QuickAction
                  to="/mobilic"
                  icon="⏱️"
                  label="Temps de travail"
                  description="Suivi Mobilic"
                  gradient="rgba(245,158,11,0.08)"
                />
              )}
              <QuickAction
                to="/wallet"
                icon="💳"
                label="Portefeuille"
                description="Solde et transactions"
                gradient="rgba(99,102,241,0.08)"
              />
            </div>
          </div>

          {/* NOVA AI */}
          <NovaCard />
        </div>
      </div>
    </div>
  );
}
