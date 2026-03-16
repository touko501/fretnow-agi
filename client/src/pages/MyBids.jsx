import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const STATUS_LABELS = {
  PENDING: { label: 'En attente', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  ACCEPTED: { label: 'Acceptée', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  REJECTED: { label: 'Refusée', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  WITHDRAWN: { label: 'Retirée', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  EXPIRED: { label: 'Expirée', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
};

export default function MyBids() {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [toast, setToast] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const params = filter !== 'ALL' ? `?status=${filter}` : '';
      const res = await api.get(`/bids/mine${params}`);
      if (res?.ok) {
        const data = await res.json();
        setBids(data.bids || []);
      }
    } catch (err) {
      console.error('Load bids error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const withdrawBid = async (bidId) => {
    try {
      const res = await api.del(`/bids/${bidId}`);
      if (res?.ok) {
        setToast({ type: 'success', message: 'Offre retirée avec succès' });
        load();
      } else {
        const err = await res?.json().catch(() => ({}));
        setToast({ type: 'error', message: err.error || 'Erreur lors du retrait' });
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Erreur lors du retrait' });
    }
    setTimeout(() => setToast(null), 3000);
  };

  const filters = [
    { value: 'ALL', label: 'Toutes' },
    { value: 'PENDING', label: 'En attente' },
    { value: 'ACCEPTED', label: 'Acceptées' },
    { value: 'REJECTED', label: 'Refusées' },
  ];

  const pendingCount = bids.filter(b => b.status === 'PENDING').length;
  const acceptedCount = bids.filter(b => b.status === 'ACCEPTED').length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 fn-animate-in px-4 py-3 rounded-xl text-sm font-medium shadow-lg"
          style={{
            background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color: toast.type === 'success' ? '#10b981' : '#ef4444',
            border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            backdropFilter: 'blur(12px)',
          }}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fn-text)' }}>Mes offres</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fn-text-muted)' }}>
            Suivez vos propositions sur les missions disponibles
          </p>
        </div>
        <Link to="/missions"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200"
          style={{ background: 'var(--fn-gradient-primary)', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}>
          <span>🚛</span> Voir les missions
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: bids.length, icon: '📋', color: '#3b82f6' },
          { label: 'En attente', value: pendingCount, icon: '⏳', color: '#f59e0b' },
          { label: 'Acceptées', value: acceptedCount, icon: '✅', color: '#10b981' },
          { label: 'Taux acceptation', value: bids.length > 0 ? `${Math.round((acceptedCount / bids.length) * 100)}%` : '—', icon: '📈', color: '#8b5cf6' },
        ].map((s, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: 'var(--fn-surface)', border: '1px solid var(--fn-border-subtle)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{s.icon}</span>
              <span className="text-xs font-medium" style={{ color: 'var(--fn-text-muted)' }}>{s.label}</span>
            </div>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
            style={{
              background: filter === f.value ? 'var(--fn-gradient-primary)' : 'var(--fn-surface)',
              color: filter === f.value ? 'white' : 'var(--fn-text-secondary)',
              border: filter === f.value ? 'none' : '1px solid var(--fn-border-subtle)',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Bids list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin h-6 w-6" style={{ color: '#3b82f6' }} viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : bids.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--fn-surface)', border: '1px solid var(--fn-border-subtle)' }}>
          <span className="text-4xl block mb-3">📭</span>
          <p className="text-sm font-semibold" style={{ color: 'var(--fn-text)' }}>
            {filter === 'ALL' ? 'Aucune offre pour le moment' : `Aucune offre ${filters.find(f => f.value === filter)?.label.toLowerCase()}`}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--fn-text-muted)' }}>
            Consultez les missions disponibles pour soumettre vos premières offres
          </p>
          <Link to="/missions" className="inline-block mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--fn-gradient-primary)' }}>
            Explorer les missions
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bids.map((bid) => {
            const status = STATUS_LABELS[bid.status] || STATUS_LABELS.PENDING;
            const mission = bid.mission;
            return (
              <div key={bid.id} className="rounded-xl p-5 transition-all duration-200 group"
                style={{ background: 'var(--fn-surface)', border: '1px solid var(--fn-border-subtle)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(37,99,235,0.2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--fn-border-subtle)'}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Mission info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {mission && (
                        <Link to={`/missions/${mission.id}`}
                          className="text-sm font-bold hover:underline transition-colors"
                          style={{ color: 'var(--fn-text)' }}>
                          {mission.reference || 'Mission'}
                        </Link>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                    </div>
                    {mission && (
                      <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--fn-text-muted)' }}>
                        <span className="font-medium" style={{ color: 'var(--fn-text-secondary)' }}>{mission.pickupCity}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        <span className="font-medium" style={{ color: 'var(--fn-text-secondary)' }}>{mission.deliveryCity}</span>
                        {mission.pickupDateRequested && (
                          <>
                            <span>·</span>
                            <span>{new Date(mission.pickupDateRequested).toLocaleDateString('fr-FR')}</span>
                          </>
                        )}
                        {mission.vehicleTypeRequired && (
                          <>
                            <span>·</span>
                            <span>{mission.vehicleTypeRequired}</span>
                          </>
                        )}
                      </div>
                    )}
                    {bid.message && (
                      <p className="text-xs mt-2 line-clamp-1" style={{ color: 'var(--fn-text-muted)' }}>
                        "{bid.message}"
                      </p>
                    )}
                  </div>

                  {/* Price + actions */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold" style={{ color: '#10b981' }}>
                        {(bid.priceCents / 100).toLocaleString('fr-FR')} €
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--fn-text-muted)' }}>HT</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {mission && (
                        <Link to={`/missions/${mission.id}`}
                          className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                          style={{ background: 'rgba(37,99,235,0.08)', color: '#3b82f6' }}>
                          Voir
                        </Link>
                      )}
                      {bid.status === 'PENDING' && (
                        <button onClick={() => withdrawBid(bid.id)}
                          className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                          style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                          Retirer
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Vehicle info */}
                {bid.vehicle && (
                  <div className="mt-3 pt-3 flex items-center gap-2 text-xs"
                    style={{ borderTop: '1px solid var(--fn-border-subtle)', color: 'var(--fn-text-muted)' }}>
                    <span>🚐</span>
                    <span>{bid.vehicle.brand} — {bid.vehicle.licensePlate} ({bid.vehicle.type})</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
