import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function Mobilic() {
  const [status, setStatus] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [sRes, dRes] = await Promise.all([api.get('/mobilic/status'), api.get('/mobilic/compliance/dashboard')]);
      if (sRes?.ok) setStatus(await sRes.json());
      if (dRes?.ok) setDashboard(await dRes.json());
      setLoading(false);
    }
    load();
  }, []);

  const connectMobilic = async () => {
    const res = await api.get('/mobilic/connect');
    if (res?.ok) { const d = await res.json(); window.location.href = d.authUrl; }
  };

  if (loading) {
    return (
      <div className="fn-stagger">
        <div className="fn-skeleton h-8 w-40 mb-2 rounded-lg" />
        <div className="fn-skeleton h-4 w-64 mb-8 rounded-lg" />
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="fn-skeleton h-28 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const cert = dashboard?.certification;
  const drivers = dashboard?.drivers;

  return (
    <div className="fn-animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-tight" style={{ color: 'var(--fn-text)' }}>Mobilic</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fn-text-secondary)' }}>Conformité temps de travail — Transport léger</p>
        </div>
        {!status?.connected && (
          <button onClick={connectMobilic}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-300"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
            Connecter Mobilic →
          </button>
        )}
      </div>

      {/* Status cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-8 fn-stagger">
        <div className="fn-card p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: status?.connected ? '#10b981' : '#f59e0b' }} />
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">{status?.connected ? '✅' : '⏳'}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fn-text-muted)' }}>Connexion</span>
          </div>
          <p className="text-lg font-bold" style={{ color: status?.connected ? '#10b981' : '#f59e0b' }}>
            {status?.connected ? 'Connecté' : 'Non connecté'}
          </p>
        </div>

        <div className="fn-card p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'var(--fn-gradient-primary)' }} />
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">📊</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fn-text-muted)' }}>Score</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--fn-text)' }}>
            {cert?.score ?? '—'}<span className="text-sm font-medium" style={{ color: 'var(--fn-text-muted)' }}>/100</span>
          </div>
        </div>

        <div className="fn-card p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: cert?.level === 'OR' ? '#eab308' : cert?.level === 'ARGENT' ? '#94a3b8' : '#f97316' }} />
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🏆</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fn-text-muted)' }}>Certification</span>
          </div>
          <p className="text-lg font-bold" style={{ color: cert?.level === 'OR' ? '#eab308' : cert?.level === 'ARGENT' ? '#94a3b8' : cert?.level === 'BRONZE' ? '#f97316' : 'var(--fn-text-muted)' }}>
            {cert?.level === 'OR' ? '🥇 Or' : cert?.level === 'ARGENT' ? '🥈 Argent' : cert?.level === 'BRONZE' ? '🥉 Bronze' : '— Non certifié'}
          </p>
        </div>

        <div className="fn-card p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: '#ef4444' }} />
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🚨</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fn-text-muted)' }}>Alertes</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: cert?.unresolvedAlerts > 0 ? '#ef4444' : 'var(--fn-text)' }}>
            {cert?.unresolvedAlerts ?? 0}
            <span className="text-xs font-medium ml-1" style={{ color: 'var(--fn-text-muted)' }}>non résolues</span>
          </div>
        </div>
      </div>

      {/* Drivers */}
      {drivers && (
        <div className="fn-card overflow-hidden mb-6">
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--fn-border-subtle)' }}>
            <h2 className="text-[15px] font-bold" style={{ color: 'var(--fn-text)' }}>
              Conducteurs ({drivers.available}/{drivers.total} disponibles)
            </h2>
          </div>
          <div>
            {drivers.drivers?.map((d) => (
              <div key={d.driverId} className="px-6 py-4 flex items-center justify-between transition-colors hover:bg-gray-50/50"
                style={{ borderBottom: '1px solid var(--fn-border-subtle)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: d.isAvailable ? '#10b981' : '#ef4444' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--fn-text)' }}>{d.name}</p>
                    <p className="text-xs" style={{ color: 'var(--fn-text-muted)' }}>
                      {d.currentActivity ? `En ${d.currentActivity}` : 'Inactif'} ·
                      Conduite: {d.driveMinutesToday}min ·
                      Reste: {d.remainingDriveMinutes}min
                    </p>
                  </div>
                </div>
                <span className="fn-badge" style={{
                  background: d.isAvailable ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  color: d.isAvailable ? '#10b981' : '#ef4444',
                }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.isAvailable ? '#10b981' : '#ef4444' }} />
                  {d.isAvailable ? 'Disponible' : 'Indisponible'}
                </span>
              </div>
            ))}
            {(!drivers.drivers || drivers.drivers.length === 0) && (
              <div className="text-center py-8" style={{ color: 'var(--fn-text-muted)' }}>
                <span className="text-sm">Aucun conducteur enregistré</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alerts */}
      {dashboard?.recentAlerts?.length > 0 && (
        <div className="fn-card overflow-hidden mb-6">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--fn-border-subtle)' }}>
            <h2 className="text-[15px] font-bold" style={{ color: 'var(--fn-text)' }}>Alertes récentes</h2>
          </div>
          <div>
            {dashboard.recentAlerts.map((a) => (
              <div key={a.id} className="px-6 py-4 flex items-center gap-3 transition-colors hover:bg-gray-50/50"
                style={{ borderBottom: '1px solid var(--fn-border-subtle)' }}>
                <span className="text-lg">{a.severity === 'CRITICAL' ? '🔴' : '🟡'}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--fn-text)' }}>{a.message}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fn-text-muted)' }}>
                    {new Date(a.createdAt).toLocaleDateString('fr-FR')} · {a.alertType}
                  </p>
                </div>
                {!a.resolved && (
                  <span className="fn-badge" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#ef4444' }} />
                    Non résolu
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legal limits */}
      <div className="fn-card p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'var(--fn-gradient-primary)' }} />
        <h3 className="text-[15px] font-bold mb-4" style={{ color: 'var(--fn-text)' }}>📋 Limites légales (Code des transports)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Conduite/jour', value: '10h max' },
            { label: 'Travail/jour', value: '12h max' },
            { label: 'Repos/jour', value: '11h min' },
            { label: 'Conduite continue', value: '4h30 max' },
            { label: 'Pause', value: '45min après 6h' },
            { label: 'Conduite/semaine', value: '56h max' },
          ].map((item, i) => (
            <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--fn-surface)', border: '1px solid var(--fn-border-subtle)' }}>
              <span className="text-[11px] font-semibold" style={{ color: '#3b82f6' }}>{item.label}</span>
              <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--fn-text)' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
