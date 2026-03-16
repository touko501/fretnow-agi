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
    { id: '001', name: 'MatcherAgent', icon: '🎯', desc: 'Matching multi-critères intelligent', color: '#3b82f6' },
    { id: '002', name: 'PricingAgent', icon: '💰', desc: 'Tarification dynamique CNR', color: '#f59e0b' },
    { id: '003', name: 'ScoutAgent', icon: '🔍', desc: 'Prospection automatisée', color: '#8b5cf6' },
    { id: '004', name: 'CommsAgent', icon: '📧', desc: 'Notifications et relances', color: '#06b6d4' },
    { id: '005', name: 'ConvertAgent', icon: '📈', desc: 'Optimisation conversion', color: '#10b981' },
    { id: '006', name: 'RiskAgent', icon: '🛡️', desc: 'Scoring risque et fraude', color: '#ef4444' },
    { id: '007', name: 'PredictAgent', icon: '🔮', desc: 'Prédiction de demande', color: '#a855f7' },
    { id: '008', name: 'AnalystAgent', icon: '📊', desc: 'Analytics et KPIs', color: '#f97316' },
    { id: '009', name: 'NOVA', icon: '🤖', desc: 'Marketing et brand voice', color: '#ec4899' },
    { id: '010', name: 'ComplianceAgent', icon: '⏱️', desc: 'Conformité Mobilic', color: '#14b8a6' },
  ];

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
        <h1 className="text-[24px] font-extrabold tracking-tight" style={{ color: 'var(--fn-text)' }}>Agents IA</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fn-text-secondary)' }}>10 agents spécialisés travaillent en continu pour optimiser la plateforme</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 fn-stagger">
        {agentList.map((a) => (
          <div key={a.id} className="fn-card fn-card-interactive p-5 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: `linear-gradient(90deg, ${a.color}, ${a.color}88)` }} />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-transform duration-200 group-hover:scale-110"
                style={{ background: `${a.color}10` }}>
                {a.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono" style={{ color: 'var(--fn-text-muted)' }}>#{a.id}</span>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--fn-text)' }}>{a.name}</h3>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fn-text-muted)' }}>{a.desc}</p>
              </div>
              <span className="fn-badge shrink-0" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10b981' }} />
                Actif
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Cortex */}
      <div className="mt-8 fn-gradient-card p-6 relative overflow-hidden" style={{ background: 'var(--fn-gradient-primary)' }}>
        <div className="fn-orb" style={{ width: 150, height: 150, background: 'rgba(255,255,255,0.1)', top: -40, right: -20, filter: 'blur(50px)' }} />
        <div className="fn-orb" style={{ width: 100, height: 100, background: 'rgba(255,255,255,0.08)', bottom: -30, left: '30%', filter: 'blur(40px)', animationDelay: '2s' }} />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
            style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
            🧠
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Cortex — Cerveau Central</h2>
            <p className="text-sm text-white/60 mt-0.5">Orchestrateur qui coordonne les 10 agents en temps réel pour chaque décision.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
