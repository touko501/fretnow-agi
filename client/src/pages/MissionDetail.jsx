import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

const STATUS_FLOW = ['DRAFT', 'PUBLISHED', 'BIDDING', 'ASSIGNED', 'ACCEPTED', 'PICKUP', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'];

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

  if (loading) return <div className="text-center py-20 text-gray-400">Chargement...</div>;
  if (!mission) return <div className="text-center py-20"><p className="text-gray-500">Mission introuvable</p><button onClick={() => navigate('/missions')} className="text-brand-600 mt-2">← Retour</button></div>;

  const isOwner = mission.clientId === user?.id;
  const isTransporteur = user?.role === 'TRANSPORTEUR';
  const currentStep = STATUS_FLOW.indexOf(mission.status);

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate('/missions')} className="text-brand-600 text-sm mb-4 hover:underline">← Retour aux missions</button>
      
      <div className="bg-white rounded-xl border p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">{mission.pickupCity} → {mission.deliveryCity}</h1>
            <p className="text-sm text-gray-500">{mission.reference} · {mission.missionType || 'FRET_LOURD'}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">{mission.status}</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto">
          {STATUS_FLOW.slice(0, 9).map((s, i) => (
            <div key={s} className={`flex-1 h-2 rounded-full ${i <= currentStep ? 'bg-brand-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* Details grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-sm text-gray-500 mb-2">ENLÈVEMENT</h3>
            <p className="font-medium">{mission.pickupAddress || mission.pickupCity}</p>
            <p className="text-sm text-gray-500">{mission.pickupPostalCode} {mission.pickupCity}</p>
            {mission.pickupDateRequested && <p className="text-sm text-gray-500 mt-1">📅 {new Date(mission.pickupDateRequested).toLocaleDateString('fr-FR')}</p>}
          </div>
          <div>
            <h3 className="font-semibold text-sm text-gray-500 mb-2">LIVRAISON</h3>
            <p className="font-medium">{mission.deliveryAddress || mission.deliveryCity}</p>
            <p className="text-sm text-gray-500">{mission.deliveryPostalCode} {mission.deliveryCity}</p>
            {mission.slaType && <p className="text-sm text-orange-600 mt-1">⏰ SLA: {mission.slaType}</p>}
          </div>
        </div>

        <hr className="my-4" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {mission.distanceKm && <div><span className="text-gray-500">Distance</span><p className="font-medium">{mission.distanceKm} km</p></div>}
          {mission.weightKg && <div><span className="text-gray-500">Poids</span><p className="font-medium">{mission.weightKg} kg</p></div>}
          {mission.palletCount && <div><span className="text-gray-500">Palettes</span><p className="font-medium">{mission.palletCount}</p></div>}
          {mission.vehicleTypeRequired && <div><span className="text-gray-500">Véhicule</span><p className="font-medium">{mission.vehicleTypeRequired.replace(/_/g, ' ')}</p></div>}
          {mission.budgetMaxCents && <div><span className="text-gray-500">Budget max</span><p className="font-medium text-green-600">{(mission.budgetMaxCents / 100).toFixed(0)} €</p></div>}
          {mission.parcelCount && <div><span className="text-gray-500">Colis</span><p className="font-medium">{mission.parcelCount}</p></div>}
        </div>

        {mission.goodsDescription && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">{mission.goodsDescription}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4">Actions</h2>
        <div className="space-y-3">
          {isOwner && mission.status === 'DRAFT' && (
            <button onClick={publish} disabled={acting} className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium disabled:opacity-50">
              {acting ? '...' : 'Publier la mission 🚀'}
            </button>
          )}
          {isOwner && mission.status === 'IN_TRANSIT' && (
            <button onClick={() => updateStatus('DELIVERED')} disabled={acting} className="w-full bg-green-600 text-white py-3 rounded-lg font-medium disabled:opacity-50">
              Confirmer la livraison ✅
            </button>
          )}
          {isTransporteur && ['PUBLISHED', 'BIDDING'].includes(mission.status) && (
            <div className="flex gap-3">
              <input type="number" step="0.01" placeholder="Montant (€)" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)}
                className="flex-1 px-4 py-3 border rounded-lg" />
              <button onClick={placeBid} disabled={acting || !bidAmount} className="bg-brand-600 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50">
                Enchérir 💰
              </button>
            </div>
          )}
          {!isOwner && !isTransporteur && <p className="text-gray-400 text-sm text-center">Aucune action disponible</p>}
        </div>
      </div>
    </div>
  );
}
