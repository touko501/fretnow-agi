import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function Agents() {
  const [agents, setAgents] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await api.get('/agents/status');
      if (res?.ok) setAgents(await res.json());
      setLoading(false);
    }
    load();
  }, []);

  const agentList = [
    { id: '001', name: 'MatcherAgent', icon: '🎯', desc: 'Matching multi-critères entre missions et transporteurs', color: '#3b82f6', status: 'active' },
    { id: '002', name: 'PricingAgent', icon: '💰', desc: 'Estimation tarifaire basée sur distance et indices CNR', color: '#f59e0b', status: 'active' },
    { id: '003', name: 'ComplianceAgent', icon: '⏱️', desc: 'Vérification des temps de conduite et repos (Mobilic)', color: '#14b8a6', status: 'active' },
    { id: '004', name: 'CommsAgent', icon: '📧', desc: 'Notifications et relances automatisées', color: '#06b6d4', status: 'beta' },
    { id: '005', name: 'RiskAgent', icon: '🛡️', desc: 'Scoring de fiabilité des entreprises', color: '#ef4444', status: 'beta' },
    { id: '006', name: 'ScoutAgent', icon: '🔍', desc: 'Prospection de transporteurs qualifiés', color: '#8b5cf6', status: 'roadmap' },
    { id: '007', name: 'PredictAgent', icon: '🔮', desc: 'Prédiction de la demande par axe', color: '#a855f7', status: 'roadmap' },
    { id: '008', name: 'AnalystAgent', icon: '📊', desc: 'Analytics et tableaux de bord avancés', color: '#f97316', status: 'roadmap' },
  ];

  const STATUS_LABELS = {
    active: { label: 'Actif', color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
    beta: { label: 'Bêta', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    roadmap: { label: 'Prévu', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
  };

  if (loading) {
    return (
      <div className="fn-stagger">
        <div className="fn-skeleton h-8 w-40 mb-2 rounded-lg" />
        <div className="fn-skeleton h-4 w-80 mb-8 rounded-lg" />
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="fn-skeleton h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="fn-animate-in">
      <div className="mb-8">
        <h1 className="text-[24px] font-extrabold tracking-tight" style={{ color: 'var(--fn-text)' }}>Automatisation</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fn-text-secondary)' }}>Services intelligents qui optimisent la plateforme en continu</p>
      </div>

      {/* Active */}
      <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: 'var(--fn-text-muted)' }}>
        Actifs ({agentList.filter(a => a.status === 'active').length})
      </h3>
      <div className="grid md:grid-cols-2 gap-4 mb-8 fn-stagger">
        {agentList.filter(a => a.status === 'active').map((a) => {
          const st = STATUS_LABELS[a.status];
          return (
            <div key={a.id} className="fn-card fn-card-interactive p-5 group relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(90deg, ${a.color}, ${a.color}88)` }} />
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-transform duration-200 group-hover:scale-110" style={{ background: `${a.color}10` }}>{a.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--fn-text)' }}>{a.name}</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fn-text-muted)' }}>{a.desc}</p>
                </div>
                <span className="fn-badge shrink-0" style={{ background: st.bg, color: st.color }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: st.color }} />
                  {st.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Beta */}
      <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: 'var(--fn-text-muted)' }}>
        En bêta ({agentList.filter(a => a.status === 'beta').length})
      </h3>
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {agentList.filter(a => a.status === 'beta').map((a) => {
          const st = STATUS_LABELS[a.status];
          return (
            <div key={a.id} className="fn-card p-5" style={{ opacity: 0.8 }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: `${a.color}10` }}>{a.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--fn-text)' }}>{a.name}</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fn-text-muted)' }}>{a.desc}</p>
                </div>
                <span className="fn-badge shrink-0" style={{ background: st.bg, color: st.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />{st.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Roadmap */}
      <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: 'var(--fn-text-muted)' }}>Roadmap ({agentList.filter(a => a.status === 'roadmap').length})</h3>
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {agentList.filter(a => a.status === 'roadmap').map((a) => {
          const st = STATUS_LABELS[a.status];
          return (
            <div key={a.id} className="fn-card p-4" style={{ opacity: 0.5 }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: `${a.color}08` }}>{a.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold" style={{ color: 'var(--fn-text)' }}>{a.name}</h3>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--fn-text-muted)' }}>{a.desc}</p>
                </div>
                <span className="fn-badge text-[10px] shrink-0" style={{ background: st.bg, color: st.color }}>{st.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div className="fn-card p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'var(--fn-gradient-primary)' }} />
        <h3 className="text-[15px] font-bold mb-2" style={{ color: 'var(--fn-text)' }}>Comment ça fonctionne</h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--fn-text-secondary)' }}>
          Les services actifs fonctionnent en arrière-plan pour chaque mission. Le MatcherAgent trouve les transporteurs adaptés,
          le PricingAgent estime un tarif juste basé sur la distance et les indices CNR, et le ComplianceAgent vérifie la conformité réglementaire.
          Les services en bêta et prévus seront activés progressivement.
        </p>
      </div>
    </div>
  );
}
