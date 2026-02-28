import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-700', PUBLISHED: 'bg-blue-100 text-blue-700',
  BIDDING: 'bg-yellow-100 text-yellow-700', ASSIGNED: 'bg-purple-100 text-purple-700',
  ACCEPTED: 'bg-indigo-100 text-indigo-700', PICKUP: 'bg-cyan-100 text-cyan-700',
  IN_TRANSIT: 'bg-orange-100 text-orange-700', DELIVERED: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-green-100 text-green-800', CANCELLED: 'bg-red-100 text-red-700',
};

const TYPE_ICONS = { FRET_LOURD: '🚛', MESSAGERIE: '📦', EXPRESS: '⚡', DERNIER_KM: '🏠' };

export default function Missions() {
  const { user } = useAuth();
  const [missions, setMissions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await api.get('/missions?limit=50');
      if (res?.ok) { const d = await res.json(); setMissions(d.missions || d || []); }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = filter === 'all' ? missions : missions.filter(m => m.status === filter);
  const isTransporteur = user?.role === 'TRANSPORTEUR';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{isTransporteur ? 'Missions disponibles' : 'Mes missions'}</h1>
          <p className="text-gray-500 text-sm">{filtered.length} mission(s)</p>
        </div>
        {!isTransporteur && (
          <Link to="/missions/new" className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition">
            + Nouvelle mission
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['all', 'PUBLISHED', 'BIDDING', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${filter === s ? 'bg-brand-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            {s === 'all' ? 'Toutes' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-gray-500">Aucune mission trouvée</p>
          {!isTransporteur && <Link to="/missions/new" className="text-brand-600 mt-2 inline-block hover:underline">Créer une mission →</Link>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <Link key={m.id} to={`/missions/${m.id}`}
              className="block bg-white rounded-xl border p-5 hover:shadow-md transition group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{TYPE_ICONS[m.missionType] || '🚛'}</span>
                  <div>
                    <div className="font-semibold group-hover:text-brand-600 transition">
                      {m.pickupCity} → {m.deliveryCity}
                    </div>
                    <div className="text-xs text-gray-500">
                      {m.reference} · {m.missionType || 'FRET_LOURD'}
                      {m.distanceKm && ` · ${m.distanceKm} km`}
                    </div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[m.status] || 'bg-gray-100'}`}>
                  {m.status}
                </span>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-500">
                {m.weightKg && <span>⚖️ {m.weightKg} kg</span>}
                {m.palletCount && <span>📦 {m.palletCount} palettes</span>}
                {m.vehicleTypeRequired && <span>🚛 {m.vehicleTypeRequired}</span>}
                {m.budgetMaxCents && <span className="font-medium text-green-600">💰 {(m.budgetMaxCents / 100).toFixed(0)} €</span>}
                {m._count?.bids > 0 && <span>📝 {m._count.bids} offre(s)</span>}
                {m.slaType && <span className="text-orange-600">⏰ {m.slaType}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
