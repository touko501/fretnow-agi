import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

function StatCard({ icon, label, value, sub, color = 'bg-white' }) {
  return (
    <div className={`${color} rounded-xl p-6 shadow-sm border`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-sm text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function RecentMission({ mission }) {
  const statusColors = {
    DRAFT: 'bg-gray-100 text-gray-700',
    PUBLISHED: 'bg-blue-100 text-blue-700',
    BIDDING: 'bg-yellow-100 text-yellow-700',
    ASSIGNED: 'bg-purple-100 text-purple-700',
    IN_TRANSIT: 'bg-orange-100 text-orange-700',
    DELIVERED: 'bg-green-100 text-green-700',
    COMPLETED: 'bg-green-100 text-green-800',
  };

  return (
    <Link to={`/missions/${mission.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 rounded-lg transition">
      <div className="flex-1">
        <div className="font-medium text-sm">{mission.pickupCity} → {mission.deliveryCity}</div>
        <div className="text-xs text-gray-500">{mission.reference} · {mission.missionType || 'FRET_LOURD'}</div>
      </div>
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[mission.status] || 'bg-gray-100'}`}>
        {mission.status}
      </span>
    </Link>
  );
}

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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400 text-lg">Chargement...</div></div>;

  const isTransporteur = user?.role === 'TRANSPORTEUR';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour {user?.firstName} 👋
        </h1>
        <p className="text-gray-500">
          {isTransporteur ? 'Voici vos missions et performances' : isAdmin ? 'Vue d\'ensemble de la plateforme' : 'Gérez vos expéditions'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="📦" label="Missions" value={Array.isArray(missions) ? missions.length : '—'} sub="Total" />
        <StatCard icon="💰" label="Solde" value={wallet?.balance != null ? `${(wallet.balance / 100).toFixed(2)} €` : '—'} />
        <StatCard icon={isTransporteur ? '🏆' : '📊'} label={isTransporteur ? 'Note' : 'En cours'}
          value={isTransporteur ? '—' : Array.isArray(missions) ? missions.filter(m => ['IN_TRANSIT', 'ASSIGNED', 'BIDDING'].includes(m.status)).length : '—'} />
        <StatCard icon="✅" label="Complétées" value={Array.isArray(missions) ? missions.filter(m => m.status === 'COMPLETED' || m.status === 'DELIVERED').length : '—'} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent missions */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="font-semibold">Missions récentes</h2>
            <Link to="/missions" className="text-brand-600 text-sm hover:underline">Voir tout →</Link>
          </div>
          <div className="p-2">
            {Array.isArray(missions) && missions.length > 0 ? (
              missions.slice(0, 8).map((m) => <RecentMission key={m.id} mission={m} />)
            ) : (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📦</div>
                <p>Aucune mission pour le moment</p>
                {!isTransporteur && <Link to="/missions/new" className="text-brand-600 text-sm hover:underline mt-2 inline-block">Créer ma première mission →</Link>}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="font-semibold mb-4">Actions rapides</h2>
            <div className="space-y-2">
              {!isTransporteur && (
                <Link to="/missions/new" className="flex items-center gap-3 px-4 py-3 bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100 transition">
                  <span>➕</span> <span className="text-sm font-medium">Nouvelle mission</span>
                </Link>
              )}
              <Link to="/missions" className="flex items-center gap-3 px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition">
                <span>🔍</span> <span className="text-sm font-medium">{isTransporteur ? 'Chercher des missions' : 'Voir mes missions'}</span>
              </Link>
              {isTransporteur && (
                <Link to="/mobilic" className="flex items-center gap-3 px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition">
                  <span>⏱️</span> <span className="text-sm font-medium">Mobilic — Temps de travail</span>
                </Link>
              )}
              <Link to="/wallet" className="flex items-center gap-3 px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition">
                <span>💰</span> <span className="text-sm font-medium">Mon portefeuille</span>
              </Link>
            </div>
          </div>

          {/* NOVA card */}
          <div className="bg-gradient-to-br from-brand-700 to-brand-600 rounded-xl p-6 text-white">
            <div className="text-2xl mb-2">🤖</div>
            <h3 className="font-semibold mb-2">NOVA veille sur vous</h3>
            <p className="text-sm text-blue-200">
              10 agents IA travaillent en continu pour optimiser vos missions, 
              trouver les meilleurs matchs et garantir la conformité.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
