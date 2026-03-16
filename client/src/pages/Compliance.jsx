import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

const ALERT_COLORS = {
  MAX_DRIVE_TIME: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  MAX_WORK_TIME: { color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
  MIN_REST: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  MISSING_LOG: { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
  MAX_CONTINUOUS_DRIVE: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  MIN_BREAK: { color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
};

const CERT_CONFIG = {
  OR: { label: '🥇 OR', color: '#eab308', bg: 'rgba(234,179,8,0.08)' },
  ARGENT: { label: '🥈 ARGENT', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
  BRONZE: { label: '🥉 BRONZE', color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
  NON_CERTIFIE: { label: '❌ Non certifié', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
};

function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`;
}

export default function Compliance() {
  const { user } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [score, setScore] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [d, s, a] = await Promise.all([
        api.getComplianceDashboard().catch(() => null),
        api.getComplianceScore().catch(() => null),
        api.getComplianceAlerts().catch(() => ({ alerts: [] })),
      ]);
      setDashboard(d);
      setScore(s);
      setAlerts(a.alerts || a || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const resolve = async (id) => {
    try {
      await api.resolveAlert(id, { resolution: 'Résolu manuellement' });
      load();
    } catch (e) { alert(e.message); }
  };

  if (loading) {
    return (
      <div className="fn-stagger">
        <div className="fn-skeleton h-8 w-48 mb-2 rounded-lg" />
        <div className="fn-skeleton h-4 w-64 mb-6 rounded-lg" />
        <div className="fn-skeleton h-40 rounded-2xl mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="fn-skeleton h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const certCfg = CERT_CONFIG[score?.level] || CERT_CONFIG.NON_CERTIFIE;

  return (
    <div className="fn-animate-in">
      <div className="mb-6">
        <h1 className="text-[24px] font-extrabold tracking-tight" style={{ color: 'var(--fn-text)' }}>Conformité Mobilic</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fn-text-secondary)' }}>Temps de conduite, repos et certification</p>
      </div>

      {/* Score card */}
      {score && (
        <div className="fn-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--fn-text-muted)' }}>Score de conformité</div>
              <div className="text-4xl font-extrabold tracking-tight" style={{ color: 'var(--fn-text)' }}>
                {score.score || 0}<span className="text-lg font-medium" style={{ color: 'var(--fn-text-muted)' }}>/100</span>
              </div>
            </div>
            <span className="fn-badge text-sm font-bold" style={{ background: certCfg.bg, color: certCfg.color }}>
              {certCfg.label}
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--fn-border)' }}>
            <div className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min(score.score || 0, 100)}%`,
                background: score.score >= 90 ? 'linear-gradient(90deg, #eab308, #facc15)' : score.score >= 75 ? 'linear-gradient(90deg, #94a3b8, #cbd5e1)' : score.score >= 60 ? 'linear-gradient(90deg, #f97316, #fb923c)' : 'linear-gradient(90deg, #ef4444, #f87171)'
              }} />
          </div>
          <div className="flex justify-between mt-2 text-[11px] font-medium" style={{ color: 'var(--fn-text-muted)' }}>
            <span>0</span><span>60 Bronze</span><span>75 Argent</span><span>90 Or</span><span>100</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6">
        {[{ key: 'dashboard', label: '📊 Dashboard' }, { key: 'alerts', label: `🚨 Alertes (${alerts.filter(a => !a.resolved).length})` }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200"
            style={{
              background: tab === t.key ? 'var(--fn-gradient-primary)' : 'var(--fn-surface)',
              color: tab === t.key ? 'white' : 'var(--fn-text-secondary)',
              border: tab === t.key ? 'none' : '1px solid var(--fn-border)',
              boxShadow: tab === t.key ? '0 2px 8px rgba(37,99,235,0.25)' : 'var(--fn-shadow-xs)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && dashboard && (
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 fn-stagger">
            {[
              { label: 'Conducteurs actifs', value: dashboard.activeDrivers || 0, icon: '👤', color: '#3b82f6' },
              { label: 'Conformes', value: dashboard.compliantDrivers || 0, icon: '✅', color: '#10b981' },
              { label: 'En alerte', value: dashboard.alertDrivers || 0, icon: '⚠️', color: '#ef4444' },
              { label: 'Logs aujourd\'hui', value: dashboard.todayLogs || 0, icon: '📋', color: '#8b5cf6' },
            ].map((s, i) => (
              <div key={i} className="fn-card p-5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: s.color }} />
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{s.icon}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fn-text-muted)' }}>{s.label}</span>
                </div>
                <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {dashboard.drivers && dashboard.drivers.length > 0 && (
            <div className="fn-card overflow-hidden">
              <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--fn-border-subtle)' }}>
                <h2 className="text-[15px] font-bold" style={{ color: 'var(--fn-text)' }}>Conducteurs</h2>
              </div>
              <div>
                {dashboard.drivers.map((d, i) => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between transition-colors hover:bg-gray-50/50"
                    style={{ borderBottom: '1px solid var(--fn-border-subtle)' }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--fn-text)' }}>{d.name || `Conducteur #${d.id}`}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--fn-text-muted)' }}>
                        Conduite: {formatMinutes(d.driveMinutes || 0)} / {formatMinutes(d.maxDriveMinutes || 600)}
                        {' · '}Travail: {formatMinutes(d.workMinutes || 0)} / {formatMinutes(d.maxWorkMinutes || 720)}
                      </p>
                    </div>
                    <span className="fn-badge" style={{
                      background: d.available ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                      color: d.available ? '#10b981' : '#ef4444',
                    }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.available ? '#10b981' : '#ef4444' }} />
                      {d.available ? 'Disponible' : 'Indisponible'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!dashboard.drivers || dashboard.drivers.length === 0) && (
            <div className="fn-card text-center py-16 fn-animate-scale">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                style={{ background: 'rgba(37,99,235,0.06)' }}>
                <span className="text-3xl">⏱️</span>
              </div>
              <p className="text-[15px] font-bold mb-1" style={{ color: 'var(--fn-text)' }}>Connectez Mobilic</p>
              <p className="text-sm" style={{ color: 'var(--fn-text-muted)' }}>Rendez-vous dans l'onglet Mobilic pour connecter votre compte.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'alerts' && (
        <div>
          {alerts.length === 0 ? (
            <div className="fn-card text-center py-16 fn-animate-scale">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                style={{ background: 'rgba(16,185,129,0.06)' }}>
                <span className="text-3xl">✅</span>
              </div>
              <p className="text-[15px] font-bold mb-1" style={{ color: 'var(--fn-text)' }}>Aucune alerte</p>
              <p className="text-sm" style={{ color: 'var(--fn-text-muted)' }}>Tous vos conducteurs sont en conformité.</p>
            </div>
          ) : (
            <div className="space-y-3 fn-stagger">
              {alerts.map(a => {
                const ac = ALERT_COLORS[a.type] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' };
                return (
                  <div key={a.id} className="fn-card p-4 transition-opacity" style={{ opacity: a.resolved ? 0.5 : 1 }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="fn-badge" style={{ background: ac.bg, color: ac.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: ac.color }} />
                          {(a.type || '').replace(/_/g, ' ')}
                        </span>
                        {a.resolved && (
                          <span className="fn-badge" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
                            ✅ Résolu
                          </span>
                        )}
                      </div>
                      <span className="text-[11px]" style={{ color: 'var(--fn-text-muted)' }}>
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString('fr-FR') : ''}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--fn-text-secondary)' }}>{a.message || a.description}</p>
                    {a.driverName && <p className="text-xs mt-1" style={{ color: 'var(--fn-text-muted)' }}>Conducteur : {a.driverName}</p>}
                    {!a.resolved && (
                      <button onClick={() => resolve(a.id)}
                        className="mt-3 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200"
                        style={{ color: '#3b82f6', background: 'rgba(37,99,235,0.06)' }}
                        onMouseEnter={e => e.target.style.background = 'rgba(37,99,235,0.12)'}
                        onMouseLeave={e => e.target.style.background = 'rgba(37,99,235,0.06)'}>
                        Marquer résolu
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
