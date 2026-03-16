import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

const STATUS_FLOW = ['DRAFT', 'PUBLISHED', 'BIDDING', 'ASSIGNED', 'ACCEPTED', 'PICKUP', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'];

const STATUS_CONFIG = {
  DRAFT: { label: 'Brouillon', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  PUBLISHED: { label: 'Publié', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  BIDDING: { label: 'Enchères', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  ASSIGNED: { label: 'Assigné', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  ACCEPTED: { label: 'Accepté', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  PICKUP: { label: 'Enlèvement', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  IN_TRANSIT: { label: 'En transit', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  DELIVERED: { label: 'Livré', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  COMPLETED: { label: 'Terminé', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  CANCELLED: { label: 'Annulé', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

export default function MissionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mission, setMission] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await api.get(`/missions/${id}`);
      if (res?.ok) { const d = await res.json(); setMission(d.mission || d); }
      setLoading(false);
    }
    load();
  }, [id]);

  const publish = async () => {
    setActing(true);
    const res = await api.post(`/missions/${id}/publish`);
    if (res?.ok) { const d = await res.json(); setMission(d.mission || d); }
    setActing(false);
  };

  const updateStatus = async (status) => {
    setActing(true);
    const res = await api.post(`/missions/${id}/status`, { status });
    if (res?.ok) { const d = await res.json(); setMission(d.mission || d); }
    setActing(false);
  };

  const placeBid = async () => {
    if (!bidAmount) return;
    setActing(true);
    const res = await api.post('/bids', { missionId: id, amountCents: Math.round(parseFloat(bidAmount) * 100) });
    if (res?.ok) alert('Offre soumise !');
    setActing(false);
    setBidAmount('');
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto fn-stagger">
        <div className="fn-skeleton h-5 w-32 mb-6 rounded-lg" />
        <div className="fn-skeleton h-64 rounded-2xl mb-4" />
        <div className="fn-skeleton h-40 rounded-2xl" />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="fn-card text-center py-20 fn-animate-scale">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
          style={{ background: 'rgba(37,99,235,0.06)' }}>
          <span className="text-4xl">🔍</span>
        </div>
        <p className="text-[15px] font-bold mb-1" style={{ color: 'var(--fn-text)' }}>Mission introuvable</p>
        <p className="text-sm mb-5" style={{ color: 'var(--fn-text-muted)' }}>Cette mission n'existe pas ou a été supprimée</p>
        <button onClick={() => navigate('/missions')} className="fn-btn fn-btn-primary">← Retour aux missions</button>
      </div>
    );
  }

  const isOwner = mission.clientId === user?.id;
  const isTransporteur = user?.role === 'TRANSPORTEUR';
  const currentStep = STATUS_FLOW.indexOf(mission.status);
  const st = STATUS_CONFIG[mission.status] || STATUS_CONFIG.DRAFT;

  return (
    <div className="max-w-3xl mx-auto fn-animate-in">
      {/* Back button */}
      <button onClick={() => navigate('/missions')}
        className="flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors duration-200"
        style={{ color: 'var(--fn-text-secondary)' }}
        onMouseEnter={e => e.target.style.color = '#3b82f6'}
        onMouseLeave={e => e.target.style.color = 'var(--fn-text-secondary)'}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Retour aux missions
      </button>

      {/* Main card */}
      <div className="fn-card p-6 mb-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--fn-text)' }}>
                {mission.pickupCity}
              </h1>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--fn-text-muted)' }}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--fn-text)' }}>
                {mission.deliveryCity}
              </h1>
            </div>
            <p className="text-sm" style={{ color: 'var(--fn-text-muted)' }}>
              <span className="font-mono">{mission.reference}</span> · {(mission.missionType || 'FRET_LOURD').replace(/_/g, ' ')}
            </p>
          </div>
          <span className="fn-badge shrink-0" style={{ background: st.bg, color: st.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
            {st.label}
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-6">
          {STATUS_FLOW.slice(0, 9).map((s, i) => (
            <div key={s} className="flex-1 h-2 rounded-full transition-all duration-500"
              style={{ background: i <= currentStep ? 'var(--fn-gradient-primary)' : 'var(--fn-border)' }} />
          ))}
        </div>

        {/* Route details */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="p-4 rounded-xl" style={{ background: 'var(--fn-surface)', border: '1px solid var(--fn-border-subtle)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.08)' }}>
                <span className="text-sm">📍</span>
              </div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fn-text-muted)' }}>Enlèvement</h3>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--fn-text)' }}>{mission.pickupAddress || mission.pickupCity}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fn-text-muted)' }}>{mission.pickupPostalCode} {mission.pickupCity}</p>
            {mission.pickupDateRequested && (
              <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--fn-text-secondary)' }}>
                <span>📅</span> {new Date(mission.pickupDateRequested).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'var(--fn-surface)', border: '1px solid var(--fn-border-subtle)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.08)' }}>
                <span className="text-sm">🏁</span>
              </div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fn-text-muted)' }}>Livraison</h3>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--fn-text)' }}>{mission.deliveryAddress || mission.deliveryCity}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fn-text-muted)' }}>{mission.deliveryPostalCode} {mission.deliveryCity}</p>
            {mission.slaType && (
              <p className="text-xs mt-2 flex items-center gap-1" style={{ color: '#f97316' }}>
                <span>⏰</span> SLA: {mission.slaType}
              </p>
            )}
          </div>
        </div>

        {/* Specs grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            mission.distanceKm && { icon: '📏', label: 'Distance', value: `${mission.distanceKm} km` },
            mission.weightKg && { icon: '⚖️', label: 'Poids', value: `${mission.weightKg} kg` },
            mission.palletCount && { icon: '📦', label: 'Palettes', value: mission.palletCount },
            mission.vehicleTypeRequired && { icon: '🚛', label: 'Véhicule', value: mission.vehicleTypeRequired.replace(/_/g, ' ') },
            mission.budgetMaxCents && { icon: '💰', label: 'Budget max', value: `${(mission.budgetMaxCents / 100).toFixed(0)} €`, color: '#059669' },
            mission.parcelCount && { icon: '📬', label: 'Colis', value: mission.parcelCount },
          ].filter(Boolean).map((spec, i) => (
            <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--fn-surface)', border: '1px solid var(--fn-border-subtle)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs">{spec.icon}</span>
                <span className="text-[11px] font-medium" style={{ color: 'var(--fn-text-muted)' }}>{spec.label}</span>
              </div>
              <p className="text-sm font-bold" style={{ color: spec.color || 'var(--fn-text)' }}>{spec.value}</p>
            </div>
          ))}
        </div>

        {mission.goodsDescription && (
          <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--fn-surface)', border: '1px solid var(--fn-border-subtle)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fn-text-muted)' }}>Description</p>
            <p className="text-sm" style={{ color: 'var(--fn-text-secondary)' }}>{mission.goodsDescription}</p>
          </div>
        )}
      </div>

      {/* Actions card */}
      <div className="fn-card p-6">
        <h2 className="text-[15px] font-bold mb-4" style={{ color: 'var(--fn-text)' }}>Actions</h2>
        <div className="space-y-3">
          {isOwner && mission.status === 'DRAFT' && (
            <button onClick={publish} disabled={acting}
              className="fn-btn fn-btn-primary w-full justify-center py-3.5">
              {acting ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Publication...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                  Publier la mission
                </span>
              )}
            </button>
          )}
          {isOwner && mission.status === 'IN_TRANSIT' && (
            <button onClick={() => updateStatus('DELIVERED')} disabled={acting}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              Confirmer la livraison
            </button>
          )}
          {isTransporteur && ['PUBLISHED', 'BIDDING'].includes(mission.status) && (
            <div className="flex gap-3">
              <input type="number" step="0.01" placeholder="Montant (€)" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)}
                className="fn-input flex-1" />
              <button onClick={placeBid} disabled={acting || !bidAmount}
                className="fn-btn fn-btn-primary px-6">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Enchérir
              </button>
            </div>
          )}
          {!isOwner && !isTransporteur && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--fn-text-muted)' }}>Aucune action disponible</p>
          )}
        </div>
      </div>
    </div>
  );
}
