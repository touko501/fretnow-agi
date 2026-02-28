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

  if (loading) return <div className="text-center py-20 text-gray-400">Chargement...</div>;

  const cert = dashboard?.certification;
  const drivers = dashboard?.drivers;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">⏱️ Mobilic</h1>
          <p className="text-gray-500 text-sm">Conformité temps de travail — Transport léger</p>
        </div>
        {!status?.connected && (
          <button onClick={connectMobilic} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
            Connecter Mobilic →
          </button>
        )}
      </div>

      {/* Status */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className={`rounded-xl p-5 border ${status?.connected ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
          <p className="text-sm text-gray-600">Connexion</p>
          <p className="text-lg font-bold mt-1">{status?.connected ? '✅ Connecté' : '⏳ Non connecté'}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border">
          <p className="text-sm text-gray-600">Score conformité</p>
          <p className="text-2xl font-bold mt-1">{cert?.score ?? '—'}<span className="text-sm text-gray-400">/100</span></p>
        </div>
        <div className="bg-white rounded-xl p-5 border">
          <p className="text-sm text-gray-600">Certification</p>
          <p className={`text-lg font-bold mt-1 ${cert?.level === 'OR' ? 'text-yellow-600' : cert?.level === 'ARGENT' ? 'text-gray-500' : cert?.level === 'BRONZE' ? 'text-orange-600' : 'text-gray-400'}`}>
            {cert?.level === 'OR' ? '🥇 Or' : cert?.level === 'ARGENT' ? '🥈 Argent' : cert?.level === 'BRONZE' ? '🥉 Bronze' : '— Non certifié'}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border">
          <p className="text-sm text-gray-600">Alertes</p>
          <p className="text-lg font-bold mt-1">{cert?.unresolvedAlerts ?? 0} <span className="text-sm text-gray-400">non résolues</span></p>
        </div>
      </div>

      {/* Drivers */}
      {drivers && (
        <div className="bg-white rounded-xl border mb-6">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Conducteurs ({drivers.available}/{drivers.total} disponibles)</h2>
          </div>
          <div className="divide-y">
            {drivers.drivers?.map((d) => (
              <div key={d.driverId} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${d.isAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <p className="font-medium text-sm">{d.name}</p>
                    <p className="text-xs text-gray-500">
                      {d.currentActivity ? `En ${d.currentActivity}` : 'Inactif'} · 
                      Conduite: {d.driveMinutesToday}min · 
                      Reste: {d.remainingDriveMinutes}min
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${d.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {d.isAvailable ? 'Disponible' : 'Indisponible'}
                </span>
              </div>
            ))}
            {(!drivers.drivers || drivers.drivers.length === 0) && (
              <div className="text-center py-8 text-gray-400">Aucun conducteur enregistré</div>
            )}
          </div>
        </div>
      )}

      {/* Alerts */}
      {dashboard?.recentAlerts?.length > 0 && (
        <div className="bg-white rounded-xl border">
          <div className="px-6 py-4 border-b"><h2 className="font-semibold">Alertes récentes</h2></div>
          <div className="divide-y">
            {dashboard.recentAlerts.map((a) => (
              <div key={a.id} className="px-6 py-4 flex items-center gap-3">
                <span className={`text-lg ${a.severity === 'CRITICAL' ? '🔴' : '🟡'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.message}</p>
                  <p className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleDateString('fr-FR')} · {a.alertType}</p>
                </div>
                {!a.resolved && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Non résolu</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legal limits info */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-800 mb-3">📋 Limites légales (Code des transports)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div><span className="text-blue-600 font-medium">Conduite/jour:</span> 10h max</div>
          <div><span className="text-blue-600 font-medium">Travail/jour:</span> 12h max</div>
          <div><span className="text-blue-600 font-medium">Repos/jour:</span> 11h min</div>
          <div><span className="text-blue-600 font-medium">Conduite continue:</span> 4h30 max</div>
          <div><span className="text-blue-600 font-medium">Pause:</span> 45min après 6h</div>
          <div><span className="text-blue-600 font-medium">Conduite/semaine:</span> 56h max</div>
        </div>
      </div>
    </div>
  );
}
