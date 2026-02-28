import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const VEHICLE_TYPES = [
  'FOURGON_3T5', 'FOURGON_12M3', 'FOURGON_20M3', 'PORTEUR_7T5', 'PORTEUR_12T', 'PORTEUR_19T',
  'SEMI_TAUTLINER', 'SEMI_FRIGO', 'SEMI_BACHE', 'SEMI_BENNE', 'SEMI_CITERNE', 'SEMI_PLATEAU'
];

export default function CreateMission() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    missionType: 'FRET_LOURD', pickupCity: '', pickupPostalCode: '', pickupAddress: '',
    deliveryCity: '', deliveryPostalCode: '', deliveryAddress: '',
    goodsDescription: '', weightKg: '', volumeM3: '', palletCount: '',
    vehicleTypeRequired: '', budgetMaxCents: '', pickupDateRequested: '',
    parcelCount: '', recipientName: '', recipientPhone: '', signatureRequired: false,
    slaType: '', returnTrip: false,
  });

  const u = (k, v) => setForm({ ...form, [k]: v });
  const isMessagerie = ['MESSAGERIE', 'EXPRESS', 'DERNIER_KM'].includes(form.missionType);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form };
      if (payload.budgetMaxCents) payload.budgetMaxCents = Math.round(parseFloat(payload.budgetMaxCents) * 100);
      if (payload.weightKg) payload.weightKg = parseFloat(payload.weightKg);
      if (payload.volumeM3) payload.volumeM3 = parseFloat(payload.volumeM3);
      if (payload.palletCount) payload.palletCount = parseInt(payload.palletCount);
      if (payload.parcelCount) payload.parcelCount = parseInt(payload.parcelCount);

      const endpoint = isMessagerie ? '/messagerie/missions' : '/missions';
      const res = await api.post(endpoint, payload);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      navigate(`/missions/${data.mission?.id || data.id}`);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nouvelle mission</h1>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Step 1: Type */}
        {step === 1 && (
          <div className="bg-white rounded-xl border p-6 mb-4">
            <h2 className="font-semibold mb-4">Type de mission</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'FRET_LOURD', icon: '🚛', label: 'Fret Lourd', desc: '> 3.5T, lots complets' },
                { value: 'MESSAGERIE', icon: '📦', label: 'Messagerie', desc: 'Colis / palettes, 24-72h' },
                { value: 'EXPRESS', icon: '⚡', label: 'Express', desc: 'J+1 garanti, SLA' },
                { value: 'DERNIER_KM', icon: '🏠', label: 'Dernier KM', desc: 'Livraison urbaine' },
              ].map((t) => (
                <button key={t.value} type="button" onClick={() => u('missionType', t.value)}
                  className={`p-4 rounded-xl border-2 text-left transition ${form.missionType === t.value ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="text-2xl mb-1">{t.icon}</div>
                  <div className="font-medium text-sm">{t.label}</div>
                  <div className="text-xs text-gray-500">{t.desc}</div>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setStep(2)} className="mt-4 w-full bg-brand-600 text-white py-3 rounded-lg font-medium">Suivant →</button>
          </div>
        )}

        {/* Step 2: Addresses */}
        {step === 2 && (
          <div className="bg-white rounded-xl border p-6 mb-4">
            <h2 className="font-semibold mb-4">Adresses</h2>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-green-800 mb-3">📍 Enlèvement</p>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Ville *" required value={form.pickupCity} onChange={(e) => u('pickupCity', e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                  <input placeholder="Code postal" value={form.pickupPostalCode} onChange={(e) => u('pickupPostalCode', e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                </div>
                <input placeholder="Adresse complète" value={form.pickupAddress} onChange={(e) => u('pickupAddress', e.target.value)} className="w-full mt-2 px-3 py-2 border rounded-lg text-sm" />
                <input type="datetime-local" value={form.pickupDateRequested} onChange={(e) => u('pickupDateRequested', e.target.value)} className="w-full mt-2 px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-3">📍 Livraison</p>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Ville *" required value={form.deliveryCity} onChange={(e) => u('deliveryCity', e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                  <input placeholder="Code postal" value={form.deliveryPostalCode} onChange={(e) => u('deliveryPostalCode', e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                </div>
                <input placeholder="Adresse complète" value={form.deliveryAddress} onChange={(e) => u('deliveryAddress', e.target.value)} className="w-full mt-2 px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 border rounded-lg font-medium text-gray-600">← Retour</button>
              <button type="button" onClick={() => setStep(3)} className="flex-1 bg-brand-600 text-white py-3 rounded-lg font-medium">Suivant →</button>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="bg-white rounded-xl border p-6 mb-4">
            <h2 className="font-semibold mb-4">Détails marchandise</h2>
            <div className="space-y-3">
              <textarea placeholder="Description des marchandises" value={form.goodsDescription} onChange={(e) => u('goodsDescription', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} />
              <div className="grid grid-cols-3 gap-3">
                <input type="number" placeholder="Poids (kg)" value={form.weightKg} onChange={(e) => u('weightKg', e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                <input type="number" placeholder="Volume (m³)" value={form.volumeM3} onChange={(e) => u('volumeM3', e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                <input type="number" placeholder="Palettes" value={form.palletCount} onChange={(e) => u('palletCount', e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
              </div>
              <select value={form.vehicleTypeRequired} onChange={(e) => u('vehicleTypeRequired', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Type de véhicule (optionnel)</option>
                {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
              </select>
              <input type="number" step="0.01" placeholder="Budget maximum (€)" value={form.budgetMaxCents} onChange={(e) => u('budgetMaxCents', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />

              {isMessagerie && (
                <div className="pt-3 border-t space-y-3">
                  <p className="text-sm font-medium">Options messagerie / express</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" placeholder="Nb colis" value={form.parcelCount} onChange={(e) => u('parcelCount', e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                    <input placeholder="Nom destinataire" value={form.recipientName} onChange={(e) => u('recipientName', e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <input placeholder="Tél destinataire" value={form.recipientPhone} onChange={(e) => u('recipientPhone', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  {form.missionType === 'EXPRESS' && (
                    <select value={form.slaType} onChange={(e) => u('slaType', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                      <option value="">SLA (optionnel)</option>
                      <option value="BEFORE_12H">Avant 12h</option>
                      <option value="BEFORE_18H">Avant 18h</option>
                      <option value="SAME_DAY">Même jour</option>
                      <option value="J_PLUS_1">J+1</option>
                    </select>
                  )}
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.signatureRequired} onChange={(e) => u('signatureRequired', e.target.checked)} />
                    <span className="text-sm">Signature requise à la livraison</span>
                  </label>
                </div>
              )}

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.returnTrip} onChange={(e) => u('returnTrip', e.target.checked)} />
                <span className="text-sm">Chercher un retour chargé 🔄</span>
              </label>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 border rounded-lg font-medium text-gray-600">← Retour</button>
              <button type="submit" disabled={loading} className="flex-1 bg-brand-600 text-white py-3 rounded-lg font-medium disabled:opacity-50">
                {loading ? 'Création...' : 'Créer la mission ✓'}
              </button>
            </div>
          </div>
        )}

        {/* Steps indicator */}
        <div className="flex justify-center gap-2 mt-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`w-3 h-3 rounded-full transition ${step === s ? 'bg-brand-600' : 'bg-gray-200'}`} />
          ))}
        </div>
      </form>
    </div>
  );
}
