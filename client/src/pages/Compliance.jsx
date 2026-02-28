import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

const ALERT_COLORS = {
  MAX_DRIVE_TIME: 'bg-red-100 text-red-700',
  MAX_WORK_TIME: 'bg-orange-100 text-orange-700',
  MIN_REST: 'bg-yellow-100 text-yellow-700',
  MISSING_LOG: 'bg-gray-100 text-gray-700',
  MAX_CONTINUOUS_DRIVE: 'bg-red-100 text-red-700',
  MIN_BREAK: 'bg-orange-100 text-orange-700',
};

const CERT_COLORS = {
  OR: 'bg-yellow-400 text-yellow-900',
  ARGENT: 'bg-gray-300 text-gray-800',
  BRONZE: 'bg-orange-200 text-orange-800',
  NON_CERTIFIE: 'bg-red-100 text-red-700',
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

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Conformité Mobilic</h1>
        <p className="text-gray-500 text-sm mt-1">Temps de conduite, repos et certification</p>
      </div>

      {/* Certification badge */}
      {score && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-1">Score de conformité</div>
              <div className="text-4xl font-bold text-gray-900">{score.score || 0}<span className="text-lg text-gray-400">/100</span></div>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-bold ${CERT_COLORS[score.level] || 'bg-gray-100'}`}>
              {score.level === 'OR' ? '🥇 OR' : score.level === 'ARGENT' ? '🥈 ARGENT' : score.level === 'BRONZE' ? '🥉 BRONZE' : '❌ Non certifié'}
            </div>
          </div>
          <div className="mt-4 bg-gray-200 rounded-full h-3 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${score.score >= 90 ? 'bg-yellow-500' : score.score >= 75 ? 'bg-gray-400' : score.score >= 60 ? 'bg-orange-400' : 'bg-red-400'}`}
              style={{ width: `${Math.min(score.score || 0, 100)}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>0</span><span>60 Bronze</span><span>75 Argent</span><span>90 Or</span><span>100</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['dashboard', 'alerts'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
            {t === 'dashboard' ? '📊 Dashboard' : `🚨 Alertes (${alerts.filter(a => !a.resolved).length})`}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && dashboard && (
        <div>
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-500 mb-1">Conducteurs actifs</div>
              <div className="text-2xl font-bold text-gray-900">{dashboard.activeDrivers || 0}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-500 mb-1">Conformes</div>
              <div className="text-2xl font-bold text-green-600">{dashboard.compliantDrivers || 0}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-500 mb-1">En alerte</div>
              <div className="text-2xl font-bold text-red-600">{dashboard.alertDrivers || 0}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-500 mb-1">Logs aujourd'hui</div>
              <div className="text-2xl font-bold text-gray-900">{dashboard.todayLogs || 0}</div>
            </div>
          </div>

          {/* Driver list */}
          {dashboard.drivers && dashboard.drivers.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b"><h2 className="font-semibold">Conducteurs</h2></div>
              <div className="divide-y">
                {dashboard.drivers.map((d, i) => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{d.name || `Conducteur #${d.id}`}</div>
                      <div className="text-xs text-gray-500">
                        Conduite: {formatMinutes(d.driveMinutes || 0)} / {formatMinutes(d.maxDriveMinutes || 600)}
                        {' · '}Travail: {formatMinutes(d.workMinutes || 0)} / {formatMinutes(d.maxWorkMinutes || 720)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.available ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Disponible</span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Indisponible</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!dashboard.drivers || dashboard.drivers.length === 0) && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="text-5xl mb-4">⏱️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Connectez Mobilic</h3>
              <p className="text-gray-500 text-sm">Rendez-vous dans l'onglet Mobilic pour connecter votre compte et suivre la conformité.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'alerts' && (
        <div>
          {alerts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune alerte</h3>
              <p className="text-gray-500 text-sm">Tous vos conducteurs sont en conformité.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(a => (
                <div key={a.id} className={`bg-white rounded-xl border border-gray-200 p-4 ${a.resolved ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${ALERT_COLORS[a.type] || 'bg-gray-100'}`}>{(a.type || '').replace(/_/g, ' ')}</span>
                      {a.resolved && <span className="text-xs text-green-600">✅ Résolu</span>}
                    </div>
                    <span className="text-xs text-gray-400">{a.createdAt ? new Date(a.createdAt).toLocaleDateString('fr-FR') : ''}</span>
                  </div>
                  <div className="text-sm text-gray-700">{a.message || a.description}</div>
                  {a.driverName && <div className="text-xs text-gray-500 mt-1">Conducteur : {a.driverName}</div>}
                  {!a.resolved && (
                    <button onClick={() => resolve(a.id)} className="mt-3 px-4 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100">
                      Marquer résolu
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
