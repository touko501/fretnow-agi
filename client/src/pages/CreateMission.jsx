import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const VEHICLE_TYPES = [
  'FOURGON_3T5', 'FOURGON_12M3', 'FOURGON_20M3', 'PORTEUR_7T5', 'PORTEUR_12T', 'PORTEUR_19T',
  'SEMI_TAUTLINER', 'SEMI_FRIGO', 'SEMI_BACHE', 'SEMI_BENNE', 'SEMI_CITERNE', 'SEMI_PLATEAU'
];

const STEPS = [
  { num: 1, label: 'Type', icon: '🚛' },
  { num: 2, label: 'Adresses', icon: '📍' },
  { num: 3, label: 'Détails', icon: '📦' },
];

function StepProgress({ current }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-5 left-[10%] right-[10%] h-[2px]" style={{ background: 'var(--fn-border)' }}>
          <div className="h-full transition-all duration-500" style={{
            background: 'var(--fn-gradient-primary)',
            width: `${((current - 1) / (STEPS.length - 1)) * 100}%`,
          }} />
        </div>

        {STEPS.map((s) => (
          <div key={s.num} className="flex flex-col items-center relative z-10">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold transition-all duration-300 ${
              current >= s.num
                ? 'text-white shadow-lg'
                : 'text-gray-400 bg-white border-2'
            }`}
              style={{
                background: current >= s.num ? 'var(--fn-gradient-primary)' : undefined,
                borderColor: current >= s.num ? undefined : 'var(--fn-border)',
                boxShadow: current === s.num ? '0 0 0 4px rgba(37,99,235,0.15), 0 4px 12px rgba(37,99,235,0.2)' : undefined,
              }}>
              {current > s.num ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <span>{s.icon}</span>
              )}
            </div>
            <span className="text-[11px] font-semibold mt-2 transition-colors" style={{
              color: current >= s.num ? '#2563eb' : 'var(--fn-text-muted)',
            }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InputField({ label, required, ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
          style={{ color: 'var(--fn-text-muted)' }}>
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <input {...props} className="fn-input" />
    </div>
  );
}

export default function CreateMission() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
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
      setSuccess(true);
      setTimeout(() => navigate(`/missions/${data.mission?.id || data.id}`), 1200);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 fn-animate-scale">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
          style={{ background: 'rgba(16,185,129,0.1)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--fn-text)' }}>Mission créée !</h2>
        <p className="text-sm" style={{ color: 'var(--fn-text-muted)' }}>Redirection en cours...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto fn-animate-in">
      <div className="mb-6">
        <h1 className="text-[24px] font-extrabold tracking-tight" style={{ color: 'var(--fn-text)' }}>
          Nouvelle mission
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fn-text-secondary)' }}>
          Créez une expédition en quelques étapes
        </p>
      </div>

      {error && (
        <div className="fn-animate-in mb-5 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(239,68,68,0.06)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.1)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
          {error}
        </div>
      )}

      <StepProgress current={step} />

      <form onSubmit={handleSubmit}>
        {/* Step 1: Type */}
        {step === 1 && (
          <div className="fn-card p-6 fn-animate-in">
            <h2 className="text-[15px] font-bold mb-1" style={{ color: 'var(--fn-text)' }}>Type de mission</h2>
            <p className="text-xs mb-5" style={{ color: 'var(--fn-text-muted)' }}>Sélectionnez le type de transport</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'FRET_LOURD', icon: '🚛', label: 'Fret Lourd', desc: '> 3.5T, lots complets', color: '#2563eb' },
                { value: 'MESSAGERIE', icon: '📦', label: 'Messagerie', desc: 'Colis / palettes, 24-72h', color: '#7c3aed' },
                { value: 'EXPRESS', icon: '⚡', label: 'Express', desc: 'J+1 garanti, SLA', color: '#f59e0b' },
                { value: 'DERNIER_KM', icon: '🏠', label: 'Dernier KM', desc: 'Livraison urbaine', color: '#10b981' },
              ].map((t) => {
                const selected = form.missionType === t.value;
                return (
                  <button key={t.value} type="button" onClick={() => u('missionType', t.value)}
                    className="p-5 rounded-xl text-left transition-all duration-200 group relative overflow-hidden"
                    style={{
                      background: selected ? `${t.color}08` : 'var(--fn-surface)',
                      border: `2px solid ${selected ? t.color : 'var(--fn-border)'}`,
                      boxShadow: selected ? `0 0 0 3px ${t.color}15` : 'none',
                    }}>
                    {selected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: t.color }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    )}
                    <div className="text-2xl mb-2 transition-transform duration-200 group-hover:scale-110 inline-block">{t.icon}</div>
                    <div className="text-sm font-bold" style={{ color: selected ? t.color : 'var(--fn-text)' }}>{t.label}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--fn-text-muted)' }}>{t.desc}</div>
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => setStep(2)}
              className="fn-btn fn-btn-primary w-full mt-6 py-3">
              Suivant
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        )}

        {/* Step 2: Addresses */}
        {step === 2 && (
          <div className="fn-card p-6 fn-animate-in">
            <h2 className="text-[15px] font-bold mb-1" style={{ color: 'var(--fn-text)' }}>Adresses</h2>
            <p className="text-xs mb-5" style={{ color: 'var(--fn-text-muted)' }}>Points d'enlèvement et de livraison</p>

            {/* Pickup */}
            <div className="rounded-xl p-5 mb-4" style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.12)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#10b981' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><circle cx="12" cy="12" r="3"/></svg>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#059669' }}>Enlèvement</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <InputField label="Ville" required placeholder="Paris" value={form.pickupCity} onChange={(e) => u('pickupCity', e.target.value)} />
                <InputField label="Code postal" placeholder="75001" value={form.pickupPostalCode} onChange={(e) => u('pickupPostalCode', e.target.value)} />
              </div>
              <InputField label="Adresse" placeholder="123 rue de la Paix" value={form.pickupAddress} onChange={(e) => u('pickupAddress', e.target.value)} />
              <div className="mt-3">
                <InputField label="Date souhaitée" type="datetime-local" value={form.pickupDateRequested} onChange={(e) => u('pickupDateRequested', e.target.value)} />
              </div>
            </div>

            {/* Route connector */}
            <div className="flex justify-center my-1">
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-3" style={{ background: 'var(--fn-border)' }} />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
                <div className="w-0.5 h-3" style={{ background: 'var(--fn-border)' }} />
              </div>
            </div>

            {/* Delivery */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.1)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#ef4444' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#dc2626' }}>Livraison</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <InputField label="Ville" required placeholder="Lyon" value={form.deliveryCity} onChange={(e) => u('deliveryCity', e.target.value)} />
                <InputField label="Code postal" placeholder="69001" value={form.deliveryPostalCode} onChange={(e) => u('deliveryPostalCode', e.target.value)} />
              </div>
              <InputField label="Adresse" placeholder="456 avenue des Frères Lumière" value={form.deliveryAddress} onChange={(e) => u('deliveryAddress', e.target.value)} />
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setStep(1)} className="fn-btn fn-btn-ghost flex-1 py-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Retour
              </button>
              <button type="button" onClick={() => setStep(3)} className="fn-btn fn-btn-primary flex-1 py-3">
                Suivant
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="fn-card p-6 fn-animate-in">
            <h2 className="text-[15px] font-bold mb-1" style={{ color: 'var(--fn-text)' }}>Détails marchandise</h2>
            <p className="text-xs mb-5" style={{ color: 'var(--fn-text-muted)' }}>Informations sur le chargement</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--fn-text-muted)' }}>Description</label>
                <textarea placeholder="Description des marchandises" value={form.goodsDescription} onChange={(e) => u('goodsDescription', e.target.value)}
                  className="fn-input resize-none" rows={3} style={{ minHeight: 80 }} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <InputField label="Poids (kg)" type="number" placeholder="1500" value={form.weightKg} onChange={(e) => u('weightKg', e.target.value)} />
                <InputField label="Volume (m³)" type="number" placeholder="45" value={form.volumeM3} onChange={(e) => u('volumeM3', e.target.value)} />
                <InputField label="Palettes" type="number" placeholder="33" value={form.palletCount} onChange={(e) => u('palletCount', e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--fn-text-muted)' }}>Véhicule requis</label>
                <select value={form.vehicleTypeRequired} onChange={(e) => u('vehicleTypeRequired', e.target.value)} className="fn-input fn-select">
                  <option value="">Optionnel</option>
                  {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                </select>
              </div>

              <InputField label="Budget max (€)" type="number" step="0.01" placeholder="2 500" value={form.budgetMaxCents} onChange={(e) => u('budgetMaxCents', e.target.value)} />

              {isMessagerie && (
                <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.1)' }}>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7c3aed' }}>Options messagerie</p>
                  <div className="grid grid-cols-2 gap-3">
                    <InputField label="Nb colis" type="number" placeholder="5" value={form.parcelCount} onChange={(e) => u('parcelCount', e.target.value)} />
                    <InputField label="Destinataire" placeholder="Jean Dupont" value={form.recipientName} onChange={(e) => u('recipientName', e.target.value)} />
                  </div>
                  <InputField label="Tél destinataire" placeholder="+33 6 12 34 56 78" value={form.recipientPhone} onChange={(e) => u('recipientPhone', e.target.value)} />
                  {form.missionType === 'EXPRESS' && (
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--fn-text-muted)' }}>SLA</label>
                      <select value={form.slaType} onChange={(e) => u('slaType', e.target.value)} className="fn-input fn-select">
                        <option value="">Optionnel</option>
                        <option value="BEFORE_12H">Avant 12h</option>
                        <option value="BEFORE_18H">Avant 18h</option>
                        <option value="SAME_DAY">Même jour</option>
                        <option value="J_PLUS_1">J+1</option>
                      </select>
                    </div>
                  )}
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="checkbox" checked={form.signatureRequired} onChange={(e) => u('signatureRequired', e.target.checked)}
                      className="w-4 h-4 rounded accent-purple-600" />
                    <span className="text-sm font-medium" style={{ color: 'var(--fn-text-secondary)' }}>Signature requise</span>
                  </label>
                </div>
              )}

              <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl transition-colors hover:bg-gray-50">
                <input type="checkbox" checked={form.returnTrip} onChange={(e) => u('returnTrip', e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600" />
                <span className="text-sm font-medium" style={{ color: 'var(--fn-text-secondary)' }}>Chercher un retour chargé 🔄</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setStep(2)} className="fn-btn fn-btn-ghost flex-1 py-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Retour
              </button>
              <button type="submit" disabled={loading}
                className="fn-btn fn-btn-primary flex-1 py-3 disabled:opacity-40">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Création...
                  </span>
                ) : (
                  <>
                    Créer la mission
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
