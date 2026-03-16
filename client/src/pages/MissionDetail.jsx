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
  const [bidMessage, setBidMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const showFeedback = (msg, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3000);
  };

  useEffect(() => {
    async function load() {
      const res = await api.get(`/missions/${id}`);
      if (res?.ok) { const d = await res.json(); setMission(d.mission || d); }
      setLoading(false);
    }
    load();
  }, [id]);

  const reload = async () => {
    const res = await api.get(`/missions/${id}`);
    if (res?.ok) { const d = await res.json(); setMission(d.mission || d); }
  };

  const publish = async () => {
    setActing(true);
    try {
      const res = await api.post(`/missions/${id}/publish`);
      if (res?.ok) { await reload(); showFeedback('Mission publiée'); }
      else { const d = await res.json(); showFeedback(d.error || 'Erreur', false); }
    } catch { showFeedback('Erreur réseau', false); }
    setActing(false);
  };

  const updateStatus = async (status) => {
    setActing(true);
    try {
      const res = await api.post(`/missions/${id}/status`, { status });
      if (res?.ok) { await reload(); showFeedback(`Statut mis à jour : ${STATUS_CONFIG[status]?.label || status}`); }
      else { const d = await res.json(); showFeedback(d.error || 'Erreur', false); }
    } catch { showFeedback('Erreur réseau', false); }
    setActing(false);
  };

  const acceptBid = async (bidId) => {
    if (!confirm('Accepter cette offre ? Les autres offres seront automatiquement refusées.')) return;
    setActing(true);
    try {
      const res = await api.post(`/missions/${id}/assign`, { bidId });
      if (res?.ok) { await reload(); showFeedback('Offre acceptée ! Mission assignée.'); }
      else { const d = await res.json(); showFeedback(d.error || 'Erreur', false); }
    } catch { showFeedback('Erreur réseau', false); }
    setActing(false);
  };

  const placeBid = async () => {
    if (!bidAmount) return;
    setActing(true);
    try {
      const res = await api.post('/bids', {
        missionId: id,
        priceCents: Math.round(parseFloat(bidAmount) * 100),
        message: bidMessage || undefined,
      });
      if (res?.ok) {
        showFeedback('Offre soumise !');
        setBidAmount('');
        setBidMessage('');
        await reload();
      } else {
        const d = await res.json();
        showFeedback(d.error || 'Erreur', false);
      }
    } catch { showFeedback('Erreur réseau', false); }
    setActing(false);
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
  const bids = mission.bids || [];
  const pendingBids = bids.filter(b => b.status === 'PENDING');

  return (
    <div className="max-w-3xl mx-auto fn-animate-in">
      {/* Feedback toast */}
      {feedback && (
        <div className="fixed top-4 right-4 z-50 fn-animate-in px-4 py-3 rounded-xl text-sm font-semibold shadow-lg"
          style={{
            background: feedback.ok ? '#059669' : '#dc2626',
            color: 'white',
          }}>
          {feedback.msg}
        </div>
      )}

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
        {mission.status !== 'CANCELLED' && (
          <div className="flex items-center gap-1 mb-6">
            {STATUS_FLOW.map((s, i) => (
              <div key={s} className="flex-1 h-2 rounded-full transition-all duration-500"
                style={{ background: i <= currentStep ? (STATUS_CONFIG[s]?.color || '#3b82f6') : 'var(--fn-border)' }} />
            ))}
          </div>
        )}

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
            mission.finalPriceCents && { icon: '✅', label: 'Prix final', value: `${(mission.finalPriceCents / 100).toFixed(0)} €`, color: '#059669' },
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

      {/* Bids section — visible to mission owner */}
      {isOwner && bids.length > 0 && (
        <div className="fn-card mb-4 overflow-hidden">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--fn-border-subtle)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold" style={{ color: 'var(--fn-text)' }}>
                  Offres reçues
                </h2>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--fn-text-muted)' }}>
                  {pendingBids.length} offre{pendingBids.length !== 1 ? 's' : ''} en attente
                </p>
              </div>
              {pendingBids.length > 0 && (
                <span className="fn-badge" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                  {pendingBids.length} en attente
                </span>
              )}
            </div>
          </div>
          <div>
            {bids.map((bid, i) => {
              const isPending = bid.status === 'PENDING';
              const isAccepted = bid.status === 'ACCEPTED';
              const isRejected = bid.status === 'REJECTED' || bid.status === 'WITHDRAWN';
              return (
                <div key={bid.id}
                  className="flex items-center gap-4 px-6 py-4 transition-colors"
                  style={{
                    borderBottom: i < bids.length - 1 ? '1px solid var(--fn-border-subtle)' : 'none',
                    opacity: isRejected ? 0.5 : 1,
                    background: isAccepted ? 'rgba(16,185,129,0.04)' : 'transparent',
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: isAccepted ? 'rgba(16,185,129,0.1)' : 'rgba(37,99,235,0.06)' }}>
                    {isAccepted ? '✅' : isRejected ? '❌' : '💼'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--fn-text)' }}>
                      {bid.transporteur?.companyName || bid.transporteur?.name || `Transporteur`}
                    </p>
                    {bid.message && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--fn-text-muted)' }}>
                        "{bid.message}"
                      </p>
                    )}
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--fn-text-muted)' }}>
                      {bid.createdAt ? new Date(bid.createdAt).toLocaleString('fr-FR') : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold" style={{ color: isAccepted ? '#059669' : '#2563eb' }}>
                      {bid.priceCents ? (bid.priceCents / 100).toLocaleString('fr-FR') : bid.amountCents ? (bid.amountCents / 100).toLocaleString('fr-FR') : '—'} €
                    </p>
                    {isAccepted && (
                      <span className="text-[11px] font-semibold" style={{ color: '#059669' }}>Acceptée</span>
                    )}
                    {isRejected && (
                      <span className="text-[11px] font-semibold" style={{ color: '#94a3b8' }}>
                        {bid.status === 'WITHDRAWN' ? 'Retirée' : 'Refusée'}
                      </span>
                    )}
                  </div>
                  {isPending && ['BIDDING', 'PUBLISHED'].includes(mission.status) && (
                    <button onClick={() => acceptBid(bid.id)} disabled={acting}
                      className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all duration-200 disabled:opacity-40 shrink-0"
                      style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
                      Accepter
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bid placement — for transporteurs */}
      {isTransporteur && ['PUBLISHED', 'BIDDING'].includes(mission.status) && (
        <div className="fn-card p-6 mb-4">
          <h2 className="text-[15px] font-bold mb-1" style={{ color: 'var(--fn-text)' }}>Faire une offre</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--fn-text-muted)' }}>
            {mission.budgetMaxCents
              ? `Budget max du client : ${(mission.budgetMaxCents / 100).toLocaleString('fr-FR')} €`
              : 'Le client n\'a pas indiqué de budget'
            }
          </p>
          <div className="space-y-3">
            <div className="flex gap-3">
              <input type="number" step="0.01" placeholder="Montant (€)" value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)} className="fn-input flex-1" />
            </div>
            <input type="text" placeholder="Message (optionnel)" value={bidMessage}
              onChange={(e) => setBidMessage(e.target.value)} className="fn-input" />
            <button onClick={placeBid} disabled={acting || !bidAmount}
              className="fn-btn fn-btn-primary w-full py-3 justify-center disabled:opacity-40">
              {acting ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Envoi...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  Soumettre mon offre
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Actions card — lifecycle buttons */}
      <div className="fn-card p-6">
        <h2 className="text-[15px] font-bold mb-4" style={{ color: 'var(--fn-text)' }}>Actions</h2>
        <div className="space-y-3">
          {/* Owner: publish draft */}
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

          {/* Owner: waiting for bids */}
          {isOwner && ['PUBLISHED', 'BIDDING'].includes(mission.status) && pendingBids.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm" style={{ color: 'var(--fn-text-muted)' }}>
                En attente d'offres de transporteurs...
              </p>
            </div>
          )}

          {/* Transporteur: accept assigned mission */}
          {isTransporteur && mission.status === 'ASSIGNED' && (
            <button onClick={() => updateStatus('ACCEPTED')} disabled={acting}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 15px rgba(99,102,241,0.3)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              Accepter la mission
            </button>
          )}

          {/* Transporteur: start pickup */}
          {isTransporteur && mission.status === 'ACCEPTED' && (
            <button onClick={() => updateStatus('PICKUP')} disabled={acting}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', boxShadow: '0 4px 15px rgba(6,182,212,0.3)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Commencer l'enlèvement
            </button>
          )}

          {/* Transporteur: start transit */}
          {isTransporteur && mission.status === 'PICKUP' && (
            <button onClick={() => updateStatus('IN_TRANSIT')} disabled={acting}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)', boxShadow: '0 4px 15px rgba(249,115,22,0.3)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              Marchandise chargée — En route
            </button>
          )}

          {/* Owner: confirm delivery */}
          {isOwner && mission.status === 'IN_TRANSIT' && (
            <button onClick={() => updateStatus('DELIVERED')} disabled={acting}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              Confirmer la livraison
            </button>
          )}

          {/* Owner: complete mission */}
          {isOwner && mission.status === 'DELIVERED' && (
            <button onClick={() => updateStatus('COMPLETED')} disabled={acting}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #047857, #059669)', boxShadow: '0 4px 15px rgba(5,150,105,0.3)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Valider et clôturer
            </button>
          )}

          {/* Completed state */}
          {mission.status === 'COMPLETED' && (
            <div className="text-center py-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)' }}>
              <p className="text-sm font-semibold" style={{ color: '#059669' }}>
                Mission terminée avec succès
              </p>
              {mission.completedAt && (
                <p className="text-xs mt-1" style={{ color: 'var(--fn-text-muted)' }}>
                  Clôturée le {new Date(mission.completedAt).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          )}

          {/* Cancelled state */}
          {mission.status === 'CANCELLED' && (
            <div className="text-center py-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)' }}>
              <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>Mission annulée</p>
              {mission.cancelReason && (
                <p className="text-xs mt-1" style={{ color: 'var(--fn-text-muted)' }}>{mission.cancelReason}</p>
              )}
            </div>
          )}

          {/* No actions available */}
          {!isOwner && !isTransporteur && !['COMPLETED', 'CANCELLED'].includes(mission.status) && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--fn-text-muted)' }}>Aucune action disponible</p>
          )}
        </div>
      </div>
    </div>
  );
}
