import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

const STATUS_CONFIG = {
  DRAFT: { bg: '#f1f5f9', color: '#475569', label: 'Brouillon', dot: '#94a3b8' },
  PUBLISHED: { bg: '#dbeafe', color: '#1d4ed8', label: 'Publié', dot: '#3b82f6' },
  BIDDING: { bg: '#fef3c7', color: '#b45309', label: 'Enchères', dot: '#f59e0b' },
  ASSIGNED: { bg: '#e9d5ff', color: '#7c3aed', label: 'Assigné', dot: '#8b5cf6' },
  ACCEPTED: { bg: '#e0e7ff', color: '#4338ca', label: 'Accepté', dot: '#6366f1' },
  PICKUP: { bg: '#cffafe', color: '#0e7490', label: 'Enlèvement', dot: '#06b6d4' },
  IN_TRANSIT: { bg: '#ffedd5', color: '#c2410c', label: 'En transit', dot: '#f97316' },
  DELIVERED: { bg: '#d1fae5', color: '#047857', label: 'Livré', dot: '#10b981' },
  COMPLETED: { bg: '#d1fae5', color: '#065f46', label: 'Terminé', dot: '#059669' },
  CANCELLED: { bg: '#fee2e2', color: '#b91c1c', label: 'Annulé', dot: '#ef4444' },
};

const TYPE_ICONS = { FRET_LOURD: '🚛', MESSAGERIE: '📦', EXPRESS: '⚡', DERNIER_KM: '🏠' };

const FILTERS = [
  { key: 'all', label: 'Toutes' },
  { key: 'PUBLISHED', label: 'Publiées' },
  { key: 'BIDDING', label: 'Enchères' },
  { key: 'IN_TRANSIT', label: 'En transit' },
  { key: 'DELIVERED', label: 'Livrées' },
  { key: 'COMPLETED', label: 'Terminées' },
];

function MissionCard({ mission }) {
  const st = STATUS_CONFIG[mission.status] || STATUS_CONFIG.DRAFT;

  return (
    <Link to={`/missions/${mission.id}`} className="fn-card fn-card-interactive block p-5 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-transform duration-200 group-hover:scale-110"
            style={{ background: 'rgba(37,99,235,0.06)' }}>
            {TYPE_ICONS[mission.missionType] || '🚛'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold transition-colors duration-200 group-hover:text-blue-600"
                style={{ color: 'var(--fn-text)' }}>
                {mission.pickupCity}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--fn-text-muted)' }}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <span className="text-[15px] font-bold transition-colors duration-200 group-hover:text-blue-600"
                style={{ color: 'var(--fn-text)' }}>
                {mission.deliveryCity}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-mono" style={{ color: 'var(--fn-text-muted)' }}>{mission.reference}</span>
              <span className="text-[11px]" style={{ color: 'var(--fn-text-muted)' }}>· {(mission.missionType || 'FRET_LOURD').replace(/_/g, ' ')}</span>
              {mission.distanceKm && <span className="text-[11px]" style={{ color: 'var(--fn-text-muted)' }}>· {mission.distanceKm} km</span>}
            </div>
          </div>
        </div>

        <span className="fn-badge shrink-0" style={{ background: st.bg, color: st.color }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />
          {st.label}
        </span>
      </div>

      <div className="flex items-center gap-5 text-xs font-medium" style={{ color: 'var(--fn-text-secondary)' }}>
        {mission.weightKg && (
          <span className="flex items-center gap-1">
            <span className="text-sm">⚖️</span> {mission.weightKg.toLocaleString('fr-FR')} kg
          </span>
        )}
        {mission.palletCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="text-sm">📦</span> {mission.palletCount} pal.
          </span>
        )}
        {mission.vehicleTypeRequired && (
          <span className="flex items-center gap-1">
            <span className="text-sm">🚛</span> {mission.vehicleTypeRequired.replace(/_/g, ' ')}
          </span>
        )}
        {mission._count?.bids > 0 && (
          <span className="flex items-center gap-1 text-blue-600">
            <span className="text-sm">📝</span> {mission._count.bids} offre(s)
          </span>
        )}
        {mission.slaType && (
          <span className="flex items-center gap-1 text-orange-600">
            <span className="text-sm">⏰</span> {mission.slaType}
          </span>
        )}

        <span className="ml-auto" />

        {mission.budgetMaxCents > 0 && (
          <span className="text-sm font-bold" style={{ color: '#059669' }}>
            {(mission.budgetMaxCents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €
          </span>
        )}
      </div>
    </Link>
  );
}

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
    <div className="fn-animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-tight" style={{ color: 'var(--fn-text)' }}>
            {isTransporteur ? 'Missions disponibles' : 'Mes missions'}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fn-text-secondary)' }}>
            {filtered.length} mission(s) {filter !== 'all' && `· filtre: ${FILTERS.find(f => f.key === filter)?.label}`}
          </p>
        </div>
        {!isTransporteur && (
          <Link to="/missions/new" className="fn-btn fn-btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Nouvelle mission
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-2 -mx-1 px-1">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200"
            style={{
              background: filter === f.key ? 'var(--fn-gradient-primary)' : 'var(--fn-surface)',
              color: filter === f.key ? 'white' : 'var(--fn-text-secondary)',
              border: filter === f.key ? 'none' : '1px solid var(--fn-border)',
              boxShadow: filter === f.key ? '0 2px 8px rgba(37,99,235,0.25)' : 'var(--fn-shadow-xs)',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3 fn-stagger">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="fn-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="fn-skeleton w-10 h-10 rounded-xl" />
                <div>
                  <div className="fn-skeleton h-4 w-48 mb-1.5" />
                  <div className="fn-skeleton h-3 w-32" />
                </div>
              </div>
              <div className="fn-skeleton h-3 w-64" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="fn-card text-center py-20 fn-animate-scale">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
            style={{ background: 'rgba(37,99,235,0.06)' }}>
            <span className="text-4xl">📦</span>
          </div>
          <p className="text-[15px] font-bold mb-1" style={{ color: 'var(--fn-text)' }}>Aucune mission trouvée</p>
          <p className="text-sm mb-5" style={{ color: 'var(--fn-text-muted)' }}>
            {filter !== 'all' ? 'Essayez un autre filtre' : isTransporteur ? 'Les missions disponibles apparaîtront ici' : 'Créez votre première mission'}
          </p>
          {!isTransporteur && (
            <Link to="/missions/new" className="fn-btn fn-btn-primary">
              Créer une mission
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3 fn-stagger">
          {filtered.map((m) => <MissionCard key={m.id} mission={m} />)}
        </div>
      )}
    </div>
  );
}
